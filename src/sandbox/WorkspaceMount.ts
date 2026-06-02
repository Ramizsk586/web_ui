import path from 'path';
import fs from 'fs';
import { WorkspaceMountConfig, FORBIDDEN_HOST_PATHS } from './types';
import { createLogger } from './SandboxHealth';

const log = createLogger('WorkspaceMount');

export class WorkspaceMountManager {
  private mounts: Map<string, WorkspaceMountConfig> = new Map();

  mount(vmId: string, config: WorkspaceMountConfig): void {
    this.validatePath(config.hostPath);

    if (!fs.existsSync(config.hostPath)) {
      throw new Error(`Host path does not exist: ${config.hostPath}`);
    }

    this.mounts.set(vmId, config);
    log.info(`Mounted '${config.hostPath}' -> '${config.guestPath}' for VM '${vmId}' (readOnly=${config.readOnly})`);
  }

  unmount(vmId: string): void {
    const config = this.mounts.get(vmId);
    if (config) {
      this.mounts.delete(vmId);
      log.info(`Unmounted workspace for VM '${vmId}'`);
    }
  }

  getMount(vmId: string): WorkspaceMountConfig | null {
    return this.mounts.get(vmId) || null;
  }

  isPathAllowed(hostPath: string): boolean {
    try {
      const resolved = path.resolve(hostPath);

      for (const forbidden of FORBIDDEN_HOST_PATHS) {
        if (forbidden.test(resolved)) {
          return false;
        }
      }

      return true;
    } catch {
      return false;
    }
  }

  translateToGuest(hostPath: string, vmId: string): string {
    const mount = this.mounts.get(vmId);
    if (!mount) {
      throw new Error(`No workspace mount for VM '${vmId}'`);
    }

    const resolvedHost = path.resolve(hostPath);
    const resolvedMountHost = path.resolve(mount.hostPath);

    if (!resolvedHost.startsWith(resolvedMountHost + path.sep) && resolvedHost !== resolvedMountHost) {
      throw new Error(`Path '${hostPath}' is outside mounted workspace '${mount.hostPath}'`);
    }

    const relative = path.relative(resolvedMountHost, resolvedHost);
    const guestPath = relative ? path.join(mount.guestPath, relative) : mount.guestPath;

    return guestPath.replace(/\\/g, '/');
  }

  translateToHost(guestPath: string, vmId: string): string {
    const mount = this.mounts.get(vmId);
    if (!mount) {
      throw new Error(`No workspace mount for VM '${vmId}'`);
    }

    const normalizedGuest = guestPath.replace(/\\/g, '/');
    const normalizedMountGuest = mount.guestPath.replace(/\\/g, '/');

    if (!normalizedGuest.startsWith(normalizedMountGuest)) {
      throw new Error(`Path '${guestPath}' is outside mounted workspace '${mount.guestPath}'`);
    }

    const relative = normalizedGuest.slice(normalizedMountGuest.length).replace(/^\//, '');
    return relative ? path.join(mount.hostPath, relative) : mount.hostPath;
  }

  async syncToHost(vmId: string): Promise<void> {
    const mount = this.mounts.get(vmId);
    if (!mount || mount.readOnly) return;
    log.info(`Syncing workspace for VM '${vmId}' to host`);
  }

  async syncToGuest(vmId: string): Promise<void> {
    const mount = this.mounts.get(vmId);
    if (!mount) return;
    log.info(`Syncing workspace for VM '${vmId}' from host`);
  }

  private validatePath(hostPath: string): void {
    if (!this.isPathAllowed(hostPath)) {
      throw new Error(
        `Path '${hostPath}' is forbidden. AI agents must never access: Users, Windows, Program Files, System directories`
      );
    }
  }
}
