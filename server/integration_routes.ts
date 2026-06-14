import express from 'express';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';

export async function setupIntegrationRoutes(app: express.Express) {
  // ---- Composio Integration Routes ----
  const { 
    getComposio, 
    CURATED_TOOLKITS, 
    listConnectedToolkits, 
    authorizeToolkit, 
    disconnectToolkit, 
    renameConnection, 
    resetComposio, 
    setApiKey, 
    verifyApiKey, 
    listToolkitTools, 
    executeComposioTool 
  } = await import('./composio.js');

  app.get("/api/composio/status", (_req, res) => {
    res.json({ enabled: Boolean(getComposio()) });
  });

  app.post("/api/composio/refresh", async (req, res) => {
    const apiKey = req.body?.apiKey as string | undefined;
    resetComposio();
    if (apiKey) {
      setApiKey(apiKey);
    }
    res.json({ ok: true });
  });

  // ── Convex interactive setup ──────────────────────────────────────────────
  app.post("/api/convex/open-setup", async (_req, res) => {
    try {
      const projectRoot = process.cwd();
      const isWin = process.platform === 'win32';
      if (isWin) {
        const title = "Lumina Convex Setup";
        const bannerLines = [
          'echo.',
          'echo ========================================',
          'echo   Lumina Convex Setup',
          'echo ========================================',
          'echo.',
          'echo Run one of the following commands:',
          'echo.',
          'echo   npx convex dev --once    (recommended for existing project)',
          'echo   npm create convex@latest  (to scaffold a new Convex project)',
          'echo.',
          'echo After setup completes, return to the Lumina app.',
          'echo The .env.local values will be detected automatically.',
          'echo.',
          'echo ========================================'
        ];
        const innerCmd = `cd /d "${projectRoot}" && ${bannerLines.join(' && ')}`;
        const cmdStr = `/c "start "${title}" cmd.exe /k "${innerCmd}""`;
        spawn('cmd.exe', [cmdStr], {
          detached: true,
          stdio: 'ignore',
          windowsVerbatimArguments: true
        }).unref();
      } else {
        const shell = process.env.SHELL || '/bin/bash';
        const banner = `echo '' && echo '=======================================' && echo '  Lumina Convex Setup' && echo '=======================================' && echo '' && echo 'Run: npx convex dev --once' && echo '' && echo 'After setup, return to the Lumina app.' && echo '=======================================' && echo ''`;
        try {
          spawn('open', ['-a', 'Terminal', '--args', shell, '-c', `cd "${projectRoot}" && ${banner}; exec ${shell}`], {
            detached: true, stdio: 'ignore'
          }).unref();
        } catch {
          spawn('xterm', ['-e', `cd "${projectRoot}" && ${banner}; exec ${shell}`], {
            detached: true, stdio: 'ignore'
          }).unref();
        }
      }
      res.json({ ok: true, cwd: projectRoot });
    } catch (err) {
      res.status(500).json({ ok: false, error: String(err) });
    }
  });

  app.get("/api/convex/read-env", async (_req, res) => {
    try {
      const envPath = path.join(process.cwd(), '.env.local');
      const { readFileSync } = await import('fs');
      let deployment = '';
      let url = '';
      try {
        const content = readFileSync(envPath, 'utf8');
        for (const line of content.split('\n')) {
          const trimmed = line.trim();
          if (trimmed.startsWith('CONVEX_DEPLOYMENT=')) {
            const rawVal = trimmed.slice('CONVEX_DEPLOYMENT='.length).trim();
            deployment = rawVal.split('#')[0].trim();
          }
          if (trimmed.startsWith('VITE_CONVEX_URL=')) {
            const rawVal = trimmed.slice('VITE_CONVEX_URL='.length).trim();
            url = rawVal.split('#')[0].trim();
          }
          if (!url && trimmed.startsWith('CONVEX_URL=')) {
            const rawVal = trimmed.slice('CONVEX_URL='.length).trim();
            url = rawVal.split('#')[0].trim();
          }
        }
      } catch {}
      res.json({ deployment, url });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  app.post("/api/composio/verify", async (req, res) => {
    let apiKey = req.body?.apiKey as string | undefined;
    if (!apiKey) {
      res.status(400).json({ valid: false, error: "apiKey required" });
      return;
    }
    apiKey = apiKey.trim().replace(/^COMPOSIO_API_KEY=/i, '').trim();
    try {
      resetComposio();
      const result = await verifyApiKey(apiKey);
      if (result.valid) {
        setApiKey(apiKey);
        res.json({ enabled: true });
      } else {
        console.error("[ComposioVerify] API key verification failed:", result.error);
        res.json({ enabled: false, error: result.error });
      }
    } catch (err) {
      console.error("[ComposioVerify] Unexpected verification error:", err);
      res.json({ enabled: false, error: String(err) });
    }
  });

  app.get("/api/composio/toolkit-tools/:slug", async (req, res) => {
    const slug = req.params.slug;
    try {
      const tools = await listToolkitTools(slug);
      res.json({ tools });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  app.post("/api/composio/execute", async (req, res) => {
    const { toolSlug, args } = req.body || {};
    const connectedAccountId = req.body.connectedAccountId || args?.connectedAccountId || args?.connected_account_id;
    if (!toolSlug) {
      res.status(400).json({ error: "toolSlug required" });
      return;
    }
    try {
      const result = await executeComposioTool(toolSlug, args || {}, connectedAccountId);
      res.json({ result });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  app.get("/api/composio/toolkits", async (_req, res) => {
    try {
      const connected = await listConnectedToolkits();
      const connectionsBySlug = new Map<string, typeof connected>();
      for (const c of connected) {
        const arr = connectionsBySlug.get(c.slug) ?? [];
        arr.push(c);
        connectionsBySlug.set(c.slug, arr);
      }
      const toolkits = CURATED_TOOLKITS.map((t) => {
        const conns = connectionsBySlug.get(t.slug) ?? [];
        return {
          slug: t.slug,
          displayName: t.displayName,
          authMode: t.authMode,
          connections: conns.map((c) => ({
            id: c.connectionId,
            status: c.status,
            alias: c.alias ?? null,
            accountLabel: c.accountLabel ?? null,
            accountEmail: c.accountEmail ?? null,
            accountName: c.accountName ?? null,
            accountAvatarUrl: c.accountAvatarUrl ?? null,
            createdAt: c.createdAt ?? null,
          })),
        };
      });
      
      const curatedSlugs = new Set(CURATED_TOOLKITS.map((t) => t.slug));
      const extras = [...connectionsBySlug.entries()]
        .filter(([slug]) => !curatedSlugs.has(slug))
        .map(([slug, conns]) => {
          return {
            slug,
            displayName: slug.charAt(0).toUpperCase() + slug.slice(1).replace(/_/g, " "),
            authMode: "managed" as const,
            connections: conns.map((c) => ({
              id: c.connectionId,
              status: c.status,
              alias: c.alias ?? null,
              accountLabel: c.accountLabel ?? null,
              accountEmail: c.accountEmail ?? null,
              accountName: c.accountName ?? null,
              accountAvatarUrl: c.accountAvatarUrl ?? null,
              createdAt: c.createdAt ?? null,
            })),
          };
        });

      res.json({ enabled: Boolean(getComposio()), toolkits: [...toolkits, ...extras] });
    } catch (err) {
      console.error("[composio] list toolkits failed", err);
      res.status(500).json({ error: String(err) });
    }
  });

  app.post("/api/composio/toolkits/:slug/authorize", async (req, res) => {
    const slug = req.params.slug;
    const alias = typeof req.body?.alias === "string" ? req.body.alias : undefined;
    try {
      const result = await authorizeToolkit(slug, alias ? { alias } : undefined);
      res.json(result);
    } catch (err) {
      console.error(`[composio] authorize ${slug} failed`, err);
      res.status(500).json({ error: String(err) });
    }
  });

  app.post("/api/composio/toolkits/:slug/disconnect", async (req, res) => {
    const connectionId = req.body?.connectionId as string | undefined;
    if (!connectionId) {
      res.status(400).json({ error: "connectionId required in body" });
      return;
    }
    try {
      await disconnectToolkit(connectionId);
      res.json({ ok: true });
    } catch (err) {
      console.error(`[composio] disconnect failed`, err);
      res.status(500).json({ error: String(err) });
    }
  });

  app.post("/api/composio/connections/:id/rename", async (req, res) => {
    const id = req.params.id;
    const alias = typeof req.body?.alias === "string" ? req.body.alias.trim() : "";
    if (!alias) {
      res.status(400).json({ error: "alias required in body" });
      return;
    }
    try {
      await renameConnection(id, alias);
      res.json({ ok: true });
    } catch (err) {
      console.error(`[composio] rename ${id} failed`, err);
      res.status(500).json({ error: String(err) });
    }
  });
}
