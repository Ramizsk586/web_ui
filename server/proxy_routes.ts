import express from 'express';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';
import { resolveCoderPath, getFilesRecursively } from './utils.js';
import { state } from './state.js';

const PORT = 3000;

type PreviewDetection = {
  kind: 'node' | 'static-html' | 'unknown';
  framework: string;
  packageManager: 'npm' | 'pnpm' | 'yarn' | 'bun' | null;
  devCommand: string | null;
  previewUrl: string | null;
  entryFile: string | null;
  notes: string[];
};

const fileExists = (filePath: string) => fs.existsSync(filePath);

const readJsonFile = (filePath: string) => {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
};

const detectPackageManager = (workspaceRoot: string): PreviewDetection['packageManager'] => {
  if (fileExists(path.join(workspaceRoot, 'pnpm-lock.yaml'))) return 'pnpm';
  if (fileExists(path.join(workspaceRoot, 'yarn.lock'))) return 'yarn';
  if (fileExists(path.join(workspaceRoot, 'bun.lockb')) || fileExists(path.join(workspaceRoot, 'bun.lock'))) return 'bun';
  return 'npm';
};

const detectStaticEntry = (workspaceRoot: string) => {
  const candidates = ['index.html', 'public/index.html', 'dist/index.html', 'build/index.html'];
  for (const candidate of candidates) {
    if (fileExists(path.join(workspaceRoot, candidate))) return candidate;
  }
  const htmlFiles = getFilesRecursively(workspaceRoot)
    .filter(f => !f.isDirectory && /\.html?$/i.test(f.name))
    .map(f => f.relativePath)
    .sort();
  return htmlFiles[0] || null;
};

const encodePreviewPath = (relativePath: string) =>
  relativePath.replace(/\\/g, '/').split('/').map(encodeURIComponent).join('/');

const detectPreviewProject = (workspaceRoot: string): PreviewDetection => {
  const notes: string[] = [];
  if (!fileExists(workspaceRoot)) {
    return {
      kind: 'unknown',
      framework: 'No workspace',
      packageManager: null,
      devCommand: null,
      previewUrl: null,
      entryFile: null,
      notes: ['Workspace folder does not exist.']
    };
  }

  const pkgPath = path.join(workspaceRoot, 'package.json');
  const pkg = readJsonFile(pkgPath);
  if (pkg) {
    const packageManager = detectPackageManager(workspaceRoot);
    const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
    const scripts = pkg.scripts || {};
    const scriptName = scripts.dev ? 'dev' : scripts.start ? 'start' : scripts.serve ? 'serve' : scripts.preview ? 'preview' : null;
    let framework = pkg.name || 'Node app';
    if (deps.vite || scripts.dev?.includes('vite')) framework = 'Vite';
    else if (deps.next || scripts.dev?.includes('next')) framework = 'Next.js';
    else if (deps['react-scripts']) framework = 'Create React App';
    else if (deps.astro) framework = 'Astro';
    else if (deps.nuxt) framework = 'Nuxt';
    else if (deps['@sveltejs/kit'] || deps.svelte) framework = 'Svelte';
    else if (deps.express) framework = 'Express';
    if (!scriptName) notes.push('package.json exists but no dev/start/serve/preview script was found.');
    return {
      kind: 'node',
      framework,
      packageManager,
      devCommand: scriptName ? `${packageManager} run ${scriptName}` : null,
      previewUrl: null,
      entryFile: null,
      notes
    };
  }

  const entryFile = detectStaticEntry(workspaceRoot);
  if (entryFile) {
    notes.push('Static HTML project detected. No dev server is required.');
    return {
      kind: 'static-html',
      framework: 'Static HTML',
      packageManager: null,
      devCommand: null,
      previewUrl: `http://localhost:${PORT}/preview-static/${encodePreviewPath(entryFile)}`,
      entryFile,
      notes
    };
  }

  return {
    kind: 'unknown',
    framework: 'Unknown project',
    packageManager: null,
    devCommand: null,
    previewUrl: null,
    entryFile: null,
    notes: ['Could not detect package.json or an HTML entry file.']
  };
};

const stopPreviewProcess = () => {
  if (state.previewProcess) {
    if (process.platform === 'win32' && state.previewProcess.pid) {
      try {
        spawn('taskkill', ['/pid', state.previewProcess.pid.toString(), '/f', '/t']);
      } catch {
        state.previewProcess.kill();
      }
    } else {
      state.previewProcess.kill();
    }
    state.previewProcess = null;
  }
  state.previewUrl = '';
  state.previewProxyOrigin = '';
};

const pushPreviewLog = (chunk: Buffer | string) => {
  const text = chunk.toString();
  state.previewLogs.push(...text.split(/\r?\n/).filter(Boolean));
  state.previewLogs = state.previewLogs.slice(-200);
  const urlMatch = text.match(/https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?\/?/i);
  if (urlMatch) {
    state.previewUrl = urlMatch[0].replace('[::1]', 'localhost');
    state.previewProxyOrigin = new URL(state.previewUrl).origin;
  }
};

const rewritePreviewText = (text: string) => {
  return text
    .replace(/<meta[^>]*http-equiv=["']Content-Security-Policy["'][^>]*>/gi, '')
    .replace(/(["'`])\/(?!preview-proxy\/)(@vite|@react-refresh|src|node_modules|assets)\//g, '$1/preview-proxy/$2/')
    .replace(/(href|src)=["']\/(?!\/|preview-proxy\/)([^"']*)["']/g, '$1="/preview-proxy/$2"')
    .replace(/url\(\s*\/(?!\/|preview-proxy\/)([^)"']+)\s*\)/g, 'url(/preview-proxy/$1)');
};

const getSafeFrameUrl = (urlStr: string, isStaticHtml: boolean): string => {
  if (!urlStr) return '';
  if (isStaticHtml) {
    try {
      return new URL(urlStr).pathname;
    } catch {
      return urlStr;
    }
  }
  return state.previewProxyOrigin ? '/preview-proxy/' : urlStr;
};

export function setupProxyRoutes(app: express.Express) {
  app.get('/api/preview/status', (req, res) => {
    const workspaceRoot = resolveCoderPath(typeof req.query.folderPath === 'string' ? req.query.folderPath : undefined);
    state.activePreviewRoot = workspaceRoot;
    const detection = detectPreviewProject(workspaceRoot);
    res.json({
      running: Boolean(state.previewProcess),
      url: state.previewUrl,
      frameUrl: getSafeFrameUrl(state.previewUrl, detection.kind === 'static-html'),
      logs: state.previewLogs,
      workspacePath: workspaceRoot.replace(/\\/g, '/'),
      detection
    });
  });

  app.post('/api/preview/stop', (_req, res) => {
    stopPreviewProcess();
    state.previewLogs = [];
    res.json({ success: true });
  });

  app.post('/api/preview/start', async (req, res) => {
    try {
      const workspaceRoot = resolveCoderPath(req.body?.folderPath);
      const samePreviewRoot = state.activePreviewRoot === workspaceRoot;
      state.activePreviewRoot = workspaceRoot;
      const detection = detectPreviewProject(workspaceRoot);

      if (state.previewProcess && state.previewUrl && samePreviewRoot) {
        return res.json({
          running: true,
          url: state.previewUrl,
          frameUrl: getSafeFrameUrl(state.previewUrl, detection.kind === 'static-html'),
          logs: state.previewLogs,
          detection
        });
      }

      if (detection.kind === 'static-html' && detection.previewUrl) {
        stopPreviewProcess();
        state.previewUrl = detection.previewUrl;
        state.previewProxyOrigin = '';
        state.previewLogs = [`Launching ${detection.entryFile}`];
        return res.json({
          running: false,
          url: state.previewUrl,
          frameUrl: getSafeFrameUrl(state.previewUrl, true),
          logs: state.previewLogs,
          detection
        });
      }

      if (!detection.devCommand) {
        return res.status(400).json({
          error: detection.notes.join(' ') || 'Could not detect how to start this project.',
          detection
        });
      }

      stopPreviewProcess();
      state.previewLogs = [`Detected ${detection.framework}`, `Running ${detection.devCommand}`];
      const proc = spawn(detection.devCommand, {
        cwd: workspaceRoot,
        env: { ...process.env, BROWSER: 'none' },
        shell: true
      });
      state.previewProcess = proc;

      proc.stdout.on('data', pushPreviewLog);
      proc.stderr.on('data', pushPreviewLog);
      proc.on('exit', (code) => {
        pushPreviewLog(`Preview process exited with code ${code}`);
        state.previewProcess = null;
      });
      proc.on('error', (error) => {
        pushPreviewLog(`Preview process failed: ${error.message}`);
        state.previewProcess = null;
      });

      res.json({
        running: true,
        url: state.previewUrl,
        frameUrl: getSafeFrameUrl(state.previewUrl, false),
        logs: state.previewLogs,
        detection
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/preview-static/*', (req, res) => {
    const subpath = (req.params as Record<string, string>)['0'] || '';
    const resolved = path.resolve(state.activePreviewRoot, subpath);
    if (resolved !== state.activePreviewRoot && !resolved.startsWith(state.activePreviewRoot + path.sep)) {
      return res.status(403).send('Path escapes preview workspace');
    }
    if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
      return res.status(404).send('Preview file not found');
    }
    res.sendFile(resolved);
  });

  app.use('/preview-proxy', async (req, res) => {
    if (!state.previewProxyOrigin) {
      return res.status(503).send('Preview server is not running yet');
    }
    try {
      const upstreamUrl = new URL(req.originalUrl.replace(/^\/preview-proxy/, '') || '/', state.previewProxyOrigin);
      const upstream = await fetch(upstreamUrl, {
        method: req.method,
        headers: {
          accept: req.headers.accept || '*/*',
          'user-agent': req.headers['user-agent'] || 'LuminaPreview'
        } as any
      });
      const contentType = upstream.headers.get('content-type') || '';
      res.status(upstream.status);
      if (contentType) res.setHeader('content-type', contentType);
      if (contentType.includes('text/html') || contentType.includes('javascript') || contentType.includes('text/css')) {
        res.send(rewritePreviewText(await upstream.text()));
      } else {
        const buffer = Buffer.from(await upstream.arrayBuffer());
        res.send(buffer);
      }
    } catch (error: any) {
      res.status(502).send(`Preview proxy error: ${error.message}`);
    }
  });

  // Live Compiler/Transpiler Sandbox Interceptor for React / JSX / TSX and JS
  app.get('/coder-preview/*', (req, res, next) => {
    const subpath = (req.params as Record<string, string>)['0'] || '';
    if (!subpath) {
      return next();
    }
    const targetFilePath = path.resolve(state.activePreviewRoot, subpath);
    if (fs.existsSync(targetFilePath) && fs.statSync(targetFilePath).isFile()) {
      const ext = path.extname(targetFilePath).toLowerCase();
      if (ext === '.jsx' || ext === '.tsx' || ext === '.js') {
        try {
          const fileContent = fs.readFileSync(targetFilePath, 'utf8');
          const escapedContent = fileContent
            .replace(/\\/g, '\\\\')
            .replace(/`/g, '\\`')
            .replace(/\${/g, '\\${');

          const lines = [
            '<!DOCTYPE html>',
            '<html lang="en">',
            '<head>',
            '  <meta charset="UTF-8">',
            '  <meta name="viewport" content="width=device-width, initial-scale=1.0">',
            `  <title>Lumina Sandbox: ${path.basename(subpath)}</title>`,
            '  <script src="https://cdn.tailwindcss.com"></script>',
            '  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">',
            '  <script src="https://unpkg.com/react@18/umd/react.development.js" crossorigin></script>',
            '  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js" crossorigin></script>',
            '  <script src="https://unpkg.com/lucide@latest"></script>',
            '  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>',
            '  <style>',
            '    body {',
            "      font-family: 'Inter', sans-serif;",
            '      margin: 0;',
            '      padding: 0;',
            '      background-color: #0b0c10;',
            '      color: #f3f4f6;',
            '    }',
            '    ::-webkit-scrollbar {',
            '      width: 8px;',
            '    }',
            '    ::-webkit-scrollbar-track {',
            '      background: #0f1115;',
            '    }',
            '    ::-webkit-scrollbar-thumb {',
            '      background: #252833;',
            '      border-radius: 4px;',
            '    }',
            '    #root {',
            '      min-height: calc(100vh - 40px);',
            '    }',
            '  </style>',
            '  <script>',
            "    window.process = { env: { NODE_ENV: 'development' } };",
            '  </script>',
            '</head>',
            '<body class="bg-[#0b0c10] text-[#f3f4f6] min-h-screen flex flex-col">',
            '  <div class="flex items-center justify-between px-4 py-2 border-b border-zinc-850 bg-[#0f1115] select-none text-xs text-zinc-400 h-10">',
            '    <div class="flex items-center gap-2">',
            '      <span class="inline-block w-2 h-2 rounded-full bg-teal-500 animate-pulse"></span>',
            '      <span class="font-mono text-zinc-300 font-medium">Lumina Transpiler Engine</span>',
            '      <span class="text-zinc-700">|</span>',
            `      <span class="font-semibold text-teal-400 font-mono">${path.basename(subpath)}</span>`,
            '    </div>',
            '    <div class="flex items-center gap-3 font-mono text-[10px]">',
            `      <span class="text-zinc-500">TYPE: <strong class="text-[#D97756]">${ext.toUpperCase().slice(1)}</strong></span>`,
            '      <span>•</span>',
            '      <span class="text-zinc-500">SANDBOX: <strong class="text-emerald-500">React 18</strong></span>',
            '    </div>',
            '  </div>',
            '  <div id="root" class="flex-1 p-6"></div>',
            '  <div id="error-boundary-overlay" class="hidden fixed bottom-6 right-6 max-w-xl p-5 bg-rose-950/95 border border-rose-500 rounded-xl shadow-2xl backdrop-blur-md z-50 animate-fade-in">',
            '    <div class="flex items-start gap-4">',
            '      <div class="p-1 px-2 rounded bg-rose-800 text-white font-mono text-[10px] select-none uppercase font-bold tracking-wider">Compile / Runtime Error</div>',
            '      <div class="flex-1">',
            '        <h4 class="text-sm font-semibold text-rose-200">Execution Stacktrace</h4>',
            '        <pre class="mt-2.5 text-xs font-mono text-rose-300 whitespace-pre-wrap max-h-56 overflow-y-auto bg-stone-950/80 p-3 rounded border border-rose-900/50" id="error-message"></pre>',
            '      </div>',
            '    </div>',
            '  </div>',
            '  <script type="text/babel" data-presets="react,typescript">',
            '    function reportError(err) {',
            '      console.error("Sandbox component error:", err);',
            "      const overlay = document.getElementById('error-boundary-overlay');",
            "      const msg = document.getElementById('error-message');",
            '      if (overlay && msg) {',
            '        msg.textContent = err.stack || err.message || String(err);',
            "        overlay.classList.remove('hidden');",
            '      }',
            '    }',
            '    try {',
            `      let userCode = \`${escapedContent}\`;`,
            '      userCode = userCode.replace(/export\\s+default\\s+/g, \'const DefaultExportComponent = \');',
            '      userCode = userCode.replace(/export\\s+const\\s+/g, \'const \');',
            '      userCode = userCode.replace(/export\\s+function\\s+/g, \'function \');',
            '      userCode = userCode.replace(/import\\s+.*?\\s+from\\s+[\'"].*?[\'"]/g, match => \'// \' + match);',
            '      const { useState, useEffect, useMemo, useCallback, useRef } = React;',
            '      const evalWrapper = new Function(\'React\', \'useState\', \'useEffect\', \'useMemo\', \'useCallback\', \'useRef\', \'lucide\',',
            '        userCode + "\\nreturn typeof DefaultExportComponent !== \'undefined\' ? DefaultExportComponent : (typeof App !== \'undefined\' ? App : null);"',
            '      );',
            '      const TargetComponent = evalWrapper(React, useState, useEffect, useMemo, useCallback, useRef, window.lucide);',
            '      if (TargetComponent) {',
            "        const rootElement = document.getElementById('root');",
            '        const root = ReactDOM.createRoot(rootElement);',
            '        root.render(<TargetComponent />);',
            '        setTimeout(() => {',
            "          if (window.lucide && typeof window.lucide.createIcons === 'function') {",
            '            window.lucide.createIcons();',
            '          }',
            '        }, 300);',
            '      } else {',
            '        const runModule = new Function(\'React\', \'useState\', \'useEffect\', \'useMemo\', \'useCallback\', \'useRef\', \'lucide\', userCode);',
            '        runModule(React, useState, useEffect, useMemo, useCallback, useRef, window.lucide);',
            '      }',
            '    } catch (compileErr) {',
            '      reportError(compileErr);',
            '    }',
            '  </script>',
            '</body>',
            '</html>'
          ];

          res.setHeader('Content-Type', 'text/html;charset=utf-8');
          return res.send(lines.join('\n'));
        } catch (err: any) {
          return res.status(500).send(`Transpiler error: \${err.message}`);
        }
      }
    }
    next();
  });

  app.use('/coder-preview', (req, res, next) => {
    express.static(state.activePreviewRoot)(req, res, next);
  });
}
