import { Router, Request, Response } from 'express';
import path from 'path';
import { SandboxManager } from './SandboxManager';
import { NetworkPolicy, SandboxExecOptions, SandboxInstallRequest, WorkspaceMountConfig, VmId, FORBIDDEN_HOST_PATHS } from './types';
import { createLogger } from './SandboxHealth';

const log = createLogger('SandboxApi');

const toWorkspacePath = (input: string): string => {
  const normalized = String(input || '').replace(/\\/g, '/');
  const absolute = normalized.startsWith('/')
    ? normalized
    : `/workspace/${normalized}`;
  const clean = path.posix.normalize(absolute);
  if (clean !== '/workspace' && !clean.startsWith('/workspace/')) {
    throw new Error('Sandbox file path must stay inside /workspace');
  }
  return clean;
};

const shQuote = (value: string): string => `'${String(value).replace(/'/g, `'\\''`)}'`;

export function createSandboxRouter(sandbox: SandboxManager): Router {
  const router = Router();

  // ─── Sandbox Status ───────────────────────────────────────────────────────

  router.get('/sandbox/status', (_req: Request, res: Response) => {
    const poolStatus = sandbox.getPoolStatus();
    const config = sandbox.getConfig();
    res.json({
      initialized: sandbox.isInitialized(),
      pool: poolStatus,
      config: {
        vmCount: config.vmCount,
        vmCpuCount: config.vmCpuCount,
        vmMemoryMb: config.vmMemoryMb,
        vmDiskMb: config.vmDiskMb,
      },
    });
  });

  router.post('/sandbox/initialize', async (_req: Request, res: Response) => {
    try {
      await sandbox.initialize();
      res.json({ success: true, message: 'Sandbox initialized' });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  router.post('/sandbox/install', async (_req: Request, res: Response) => {
    try {
      await sandbox.ensureInstallation();
      res.json({ success: true, message: 'Sandbox installation verified' });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  router.post('/sandbox/shutdown', async (_req: Request, res: Response) => {
    try {
      await sandbox.shutdown();
      res.json({ success: true, message: 'Sandbox shut down' });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ─── VM Lifecycle ────────────────────────────────────────────────────────

  router.post('/sandbox/vm/acquire', async (req: Request, res: Response) => {
    try {
      const { agentId, workspacePath } = req.body;
      if (!agentId) {
        return res.status(400).json({ error: 'agentId is required' });
      }

      // Auto-initialize sandbox if needed
      if (!sandbox.isInitialized()) {
        try {
          log.info('Auto-initializing sandbox on acquire request...');
          await sandbox.initialize();
        } catch (initErr: any) {
          return res.status(503).json({ error: `Sandbox initialization failed: ${initErr.message}` });
        }
      }

      if (workspacePath) {
        const forbidden = FORBIDDEN_HOST_PATHS.some(p => p.test(workspacePath));
        if (forbidden) {
          return res.status(403).json({
            error: 'Workspace path is forbidden. AI agents must never access: Users, Windows, Program Files, System directories',
          });
        }
      }

      const vmId = await sandbox.acquireVm(agentId, workspacePath);
      res.json({ success: true, vmId: vmId.id, tag: vmId.tag });
    } catch (e: any) {
      res.status(503).json({ error: e.message });
    }
  });

  router.post('/sandbox/vm/release', async (req: Request, res: Response) => {
    try {
      const { vmId } = req.body;
      if (!vmId) return res.status(400).json({ error: 'vmId is required' });

      await sandbox.releaseVm({ id: vmId, tag: 'sandbox' });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ─── Command Execution ───────────────────────────────────────────────────

  router.post('/sandbox/exec', async (req: Request, res: Response) => {
    try {
      const { vmId, command, cwd, timeoutMs, env, network } = req.body;
      if (!vmId || !command) {
        return res.status(400).json({ error: 'vmId and command are required' });
      }

      const options: SandboxExecOptions = { command, cwd, timeoutMs, env, network };
      const result = await sandbox.exec({ id: vmId, tag: 'sandbox' }, options);
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  router.post('/sandbox/install-package', async (req: Request, res: Response) => {
    try {
      const { vmId, packageType, packageName, version } = req.body;
      if (!vmId || !packageType || !packageName) {
        return res.status(400).json({ error: 'vmId, packageType, and packageName are required' });
      }

      const request: SandboxInstallRequest = { packageType, packageName, version };
      const result = await sandbox.installPackage({ id: vmId, tag: 'sandbox' }, request);
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ─── Network Policy ──────────────────────────────────────────────────────

  router.post('/sandbox/network/policy', (req: Request, res: Response) => {
    try {
      const { vmId, policy } = req.body;
      if (!vmId || !policy) {
        return res.status(400).json({ error: 'vmId and policy are required' });
      }

      sandbox.setNetworkPolicy(vmId, policy as NetworkPolicy);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  router.get('/sandbox/network/policy/:vmId', (req: Request, res: Response) => {
    const policy = sandbox.networkPolicy.getPolicy(req.params.vmId);
    res.json(policy);
  });

  // ─── Workspace Mount ─────────────────────────────────────────────────────

  router.post('/sandbox/workspace/mount', (req: Request, res: Response) => {
    try {
      const { vmId, hostPath, guestPath, readOnly } = req.body;
      if (!vmId || !hostPath || !guestPath) {
        return res.status(400).json({ error: 'vmId, hostPath, and guestPath are required' });
      }

      const forbidden = FORBIDDEN_HOST_PATHS.some(p => p.test(hostPath));
      if (forbidden) {
        return res.status(403).json({
          error: 'Mount path is forbidden. AI agents must never access: Users, Windows, Program Files, System directories',
        });
      }

      sandbox.mountWorkspace(vmId, { hostPath, guestPath, readOnly: readOnly ?? false });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ─── Preview ─────────────────────────────────────────────────────────────

  router.post('/sandbox/preview/start', async (req: Request, res: Response) => {
    try {
      const { vmId, projectPath } = req.body;
      if (!vmId || !projectPath) {
        return res.status(400).json({ error: 'vmId and projectPath are required' });
      }

      const preview = await sandbox.startPreview({ id: vmId, tag: 'sandbox' }, projectPath);
      res.json({ success: true, url: `http://localhost:${preview.hostPort}`, ...preview });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  router.post('/sandbox/preview/stop', (req: Request, res: Response) => {
    try {
      const { vmId } = req.body;
      if (!vmId) return res.status(400).json({ error: 'vmId is required' });

      sandbox.stopPreview({ id: vmId, tag: 'sandbox' });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ─── File System API (routed through VM) ─────────────────────────────────

  router.post('/sandbox/fs/read', async (req: Request, res: Response) => {
    try {
      const { vmId, filePath } = req.body;
      if (!vmId || !filePath) return res.status(400).json({ error: 'vmId and filePath required' });

      const safePath = toWorkspacePath(filePath);
      const result = await sandbox.exec({ id: vmId, tag: 'sandbox' }, {
        command: `cat ${shQuote(safePath)}`,
        timeoutMs: 10000,
      });
      res.json({ success: result.exitCode === 0, content: result.stdout, error: result.stderr });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  router.post('/sandbox/fs/write', async (req: Request, res: Response) => {
    try {
      const { vmId, filePath, content } = req.body;
      if (!vmId || !filePath || content === undefined) {
        return res.status(400).json({ error: 'vmId, filePath, and content required' });
      }

      const safePath = toWorkspacePath(filePath);
      const encoded = Buffer.from(String(content), 'utf8').toString('base64');
      const result = await sandbox.exec({ id: vmId, tag: 'sandbox' }, {
        command: `mkdir -p "$(dirname ${shQuote(safePath)})" && printf %s ${shQuote(encoded)} | base64 -d > ${shQuote(safePath)}`,
        timeoutMs: 10000,
      });
      res.json({ success: result.exitCode === 0, error: result.stderr });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  router.post('/sandbox/fs/list', async (req: Request, res: Response) => {
    try {
      const { vmId, dirPath } = req.body;
      if (!vmId) return res.status(400).json({ error: 'vmId required' });

      const safePath = toWorkspacePath(dirPath || '/workspace');
      const result = await sandbox.exec({ id: vmId, tag: 'sandbox' }, {
        command: `ls -la ${shQuote(safePath)}`,
        timeoutMs: 10000,
      });
      const files = result.stdout.split('\n').filter(Boolean).map(line => {
        const parts = line.split(/\s+/);
        return {
          permissions: parts[0],
          links: parts[1],
          owner: parts[2],
          group: parts[3],
          size: parts[4],
          modified: parts.slice(5, 8).join(' '),
          name: parts.slice(8).join(' '),
        };
      });
      res.json({ success: true, files, raw: result.stdout });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  router.post('/sandbox/fs/delete', async (req: Request, res: Response) => {
    try {
      const { vmId, filePath, recursive } = req.body;
      if (!vmId || !filePath) return res.status(400).json({ error: 'vmId and filePath required' });

      const safePath = toWorkspacePath(filePath);
      if (safePath === '/workspace') {
        return res.status(403).json({ error: 'Deleting /workspace is not allowed' });
      }
      const cmd = recursive ? `rm -rf -- ${shQuote(safePath)}` : `rm -- ${shQuote(safePath)}`;
      const result = await sandbox.exec({ id: vmId, tag: 'sandbox' }, { command: cmd, timeoutMs: 10000 });
      res.json({ success: result.exitCode === 0, error: result.stderr });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ─── Health ──────────────────────────────────────────────────────────────

  router.get('/sandbox/health', async (_req: Request, res: Response) => {
    const poolStatus = sandbox.getPoolStatus();
    res.json({
      status: sandbox.isInitialized() ? 'ready' : 'uninitialized',
      pool: poolStatus,
      uptime: process.uptime(),
    });
  });

  router.post('/sandbox/diagnostics', async (_req: Request, res: Response) => {
    try {
      const detection = await sandbox.hypervisor.detect();
      const poolStatus = sandbox.getPoolStatus();
      res.json({
        host: detection,
        sandbox: {
          initialized: sandbox.isInitialized(),
          pool: poolStatus,
        },
        hypervisor: {
          vms: sandbox.hypervisor.listAllVms(),
        },
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  return router;
}
