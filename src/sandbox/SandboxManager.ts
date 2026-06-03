import path from 'path';
import fs from 'fs';
import { VmId, SandboxConfig, SandboxExecOptions, SandboxExecResult, SandboxInstallRequest, NetworkPolicy, NetworkPolicyMode, PreviewForwardConfig, WorkspaceMountConfig } from './types';
import { HypervisorManager } from './HypervisorManager';
import { VmPool } from './VmPool';
import { SnapshotManager } from './SnapshotManager';
import { NetworkPolicyEngine } from './NetworkPolicy';
import { WorkspaceMountManager } from './WorkspaceMount';
import { VsockBridge } from './VsockBridge';
import { AgentRuntime } from './AgentRuntime';
import { SandboxInstaller } from './SandboxInstaller';
import { SandboxHealthMonitor, createLogger, createHealthMonitor } from './SandboxHealth';
import { SandboxMetrics } from './types';
import { CommandPayload, ExecutionResponse } from './contracts/IIpcProtocol';
import { ISandbox } from './contracts/ISandbox';

const log = createLogger('SandboxManager');

export class SandboxManager implements ISandbox {
  public hypervisor: HypervisorManager;
  public vmPool: VmPool;
  public snapshotManager: SnapshotManager;
  public networkPolicy: NetworkPolicyEngine;
  public workspaceMount: WorkspaceMountManager;
  public vsock: VsockBridge;
  public agentRuntime: AgentRuntime;
  public installer: SandboxInstaller;
  public healthMonitor: SandboxHealthMonitor;

  private config: SandboxConfig;
  private initialized = false;
  private initializingPromise: Promise<void> | null = null;
  private activePreviews: Map<string, PreviewForwardConfig> = new Map();
  private previewPortCounter = 4000;

  constructor(luminaDataDir: string) {
    this.hypervisor = new HypervisorManager(path.join(luminaDataDir, 'vm'));
    this.installer = new SandboxInstaller(this.hypervisor, luminaDataDir);

    this.config = this.installer.getSandboxConfig();
    this.config.vmRootDir = path.join(luminaDataDir, 'vm');

    this.snapshotManager = new SnapshotManager(this.config.snapshotDir);
    this.networkPolicy = new NetworkPolicyEngine();
    this.workspaceMount = new WorkspaceMountManager();
    this.vsock = new VsockBridge(path.join(luminaDataDir, 'vm', 'ipc'));
    this.agentRuntime = new AgentRuntime(this.vsock, this.networkPolicy);
    this.vmPool = new VmPool(this.config, this.hypervisor, this.snapshotManager);
    this.healthMonitor = createHealthMonitor((vmId) => this.collectMetrics(vmId));
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      log.info('Sandbox already initialized');
      return;
    }

    if (this.initializingPromise) {
      return this.initializingPromise;
    }

    this.initializingPromise = (async () => {
      log.info('Initializing sandbox...');
      try {
        await this.ensureDirectories();
        await this.vsock.start();
        await this.registerVsockHandlers();
        await this.ensureInstallation();
        this.config = this.installer.getSandboxConfig();
        this.vmPool.setBaseImagePath(this.config.imagePath);
        await this.vmPool.initialize();
        await this.vmPool.prebootAll();
        this.healthMonitor.start();
        this.initialized = true;
        log.info('Sandbox initialized successfully');
      } catch (error) {
        this.initialized = false;
        try {
          await this.vsock.stop();
        } catch {}
        throw error;
      } finally {
        this.initializingPromise = null;
      }
    })();

    return this.initializingPromise;
  }

  async ensureInstallation(): Promise<void> {
    const { ok, issues } = await this.installer.verifyInstallation();
    if (!ok) {
      log.warn(`Installation incomplete (${issues.join(', ')}), running installer...`);
      await this.installer.install();
    }
  }

  async acquireVm(agentId: string, workspacePath?: string): Promise<VmId> {
    const vmId = await this.vmPool.acquire(agentId);

    this.networkPolicy.setPolicy(vmId.id, { ...this.config.defaultNetwork });

    if (workspacePath) {
      this.workspaceMount.mount(vmId.id, {
        hostPath: workspacePath,
        guestPath: '/workspace',
        readOnly: false,
      });
    }

    return vmId;
  }

  async releaseVm(vmId: VmId): Promise<void> {
    this.workspaceMount.unmount(vmId.id);
    this.networkPolicy.clearPolicy(vmId.id);
    this.removePreviewForward(vmId.id);
    this.vmPool.release(vmId);
  }

  async exec(vmId: VmId, options: SandboxExecOptions): Promise<SandboxExecResult> {
    return this.agentRuntime.exec(vmId, options);
  }

  async runIsolatedTask(request: {
    workspacePath: string;
    payload: CommandPayload;
    policy: NetworkPolicyMode;
    agentId?: string;
  }): Promise<ExecutionResponse> {
    if (!this.initialized) {
      await this.initialize();
    }

    const vmId = await this.acquireVm(request.agentId || `agent-${Date.now()}`, request.workspacePath);
    try {
      this.setNetworkPolicy(vmId.id, request.policy);
      const result = await this.exec(vmId, {
        command: this.commandPayloadToShell(request.payload),
        cwd: '/workspace',
        env: {},
        timeoutMs: request.payload.timeoutMs,
        network: this.networkPolicy.getPolicy(vmId.id),
      });

      return {
        exitCode: result.exitCode,
        stdout: result.stdout,
        stderr: result.stderr,
        durationMs: result.durationMs,
      };
    } finally {
      await this.releaseVm(vmId);
    }
  }

  async installPackage(vmId: VmId, request: SandboxInstallRequest): Promise<SandboxExecResult> {
    return this.agentRuntime.installPackage(vmId, request);
  }

  setNetworkPolicy(vmId: string, policy: NetworkPolicy | NetworkPolicyMode): void {
    this.networkPolicy.setPolicy(vmId, policy);
  }

  mountWorkspace(vmId: string, config: WorkspaceMountConfig): void {
    this.workspaceMount.mount(vmId, config);
  }

  async startPreview(vmId: VmId, projectPath: string): Promise<PreviewForwardConfig> {
    const hostPort = ++this.previewPortCounter;
    const detectResult = await this.detectProjectType(vmId, projectPath);

    const forward: PreviewForwardConfig = {
      vmId: vmId.id,
      hostPort,
      guestPort: detectResult.port,
      process: detectResult.type,
      projectPath,
    };

    this.hypervisor.exposePort(vmId, detectResult.port, hostPort);
    this.activePreviews.set(vmId.id, forward);

    log.info(`Preview started for VM '${vmId.id}': localhost:${hostPort} -> guest:${detectResult.port}`);

    return forward;
  }

  stopPreview(vmId: VmId): void {
    const forward = this.activePreviews.get(vmId.id);
    if (forward) {
      this.hypervisor.removePortExpose(vmId, forward.hostPort);
      this.activePreviews.delete(vmId.id);
    }
  }

  getPreviewUrl(vmId: VmId): string | null {
    const forward = this.activePreviews.get(vmId.id);
    return forward ? `http://localhost:${forward.hostPort}` : null;
  }

  getPoolStatus(): { total: number; available: number; acquired: number; error: number; activeVms: string[] } {
    return this.vmPool.getPoolStatus();
  }

  getConfig(): SandboxConfig {
    return { ...this.config };
  }

  async shutdown(): Promise<void> {
    log.info('Shutting down sandbox...');
    this.healthMonitor.stop();
    this.networkPolicy.clearAll();
    await this.vmPool.shutdown();
    await this.vmPool.destroyAll();
    await this.vsock.stop();
    this.initialized = false;
    log.info('Sandbox shut down');
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  private async ensureDirectories(): Promise<void> {
    const dirs = [
      this.config.vmRootDir,
      this.config.snapshotDir,
      path.dirname(this.config.imagePath),
    ];
    for (const dir of dirs) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  private registerVsockHandlers(): void {
    this.vsock.registerHandler('heartbeat', async (msg) => {
      return this.vsock.createVsockMessage('heartbeat_ack', { timestamp: Date.now() }, msg.id);
    });
  }

  private removePreviewForward(vmId: string): void {
    const forward = this.activePreviews.get(vmId);
    if (forward) {
      this.activePreviews.delete(vmId);
    }
  }

  private commandPayloadToShell(payload: CommandPayload): string {
    const parts = [payload.command, ...payload.args].map((part) => this.shQuote(part));
    return parts.join(' ');
  }

  private shQuote(value: string): string {
    return `'${String(value).replace(/'/g, `'\\''`)}'`;
  }

  private async detectProjectType(vmId: VmId, projectPath: string): Promise<{ type: 'vite' | 'next' | 'react' | 'static'; port: number }> {
    const result = await this.agentRuntime.exec(vmId, {
      command: `cd "${projectPath}" && cat package.json 2>/dev/null | grep -o '"dev".*"' || echo "no-package"`,
    });

    const stdout = result.stdout || '';

    if (stdout.includes('vite')) return { type: 'vite', port: 5173 };
    if (stdout.includes('next')) return { type: 'next', port: 3000 };
    if (stdout.includes('react')) return { type: 'react', port: 3000 };
    return { type: 'static', port: 8080 };
  }

  private async collectMetrics(vmId: string): Promise<SandboxMetrics | null> {
    try {
      const vmIdObj: VmId = { id: vmId, tag: 'sandbox' };
      const result = await this.agentRuntime.exec(vmIdObj, {
        command: 'echo "cpu=$(top -bn1 | grep Cpu | awk \'{print $2}\'); mem=$(free | grep Mem | awk \'{print $3/$2 * 100.0}\'); disk=$(df / | tail -1 | awk \'{print $5}\')"',
        timeoutMs: 5000,
      });

      return {
        vmId,
        cpuUsage: 0,
        memoryUsage: 0,
        diskUsage: 0,
        uptimeMs: 0,
        processCount: 0,
        networkBytesIn: 0,
        networkBytesOut: 0,
      };
    } catch {
      return null;
    }
  }
}
