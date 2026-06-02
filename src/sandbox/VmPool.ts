import { VmId, VmState, VmResources, SandboxConfig } from './types';
import { HypervisorManager } from './HypervisorManager';
import { SnapshotManager } from './SnapshotManager';
import { createLogger } from './SandboxHealth';

const log = createLogger('VmPool');

interface PoolEntry {
  vmId: VmId;
  state: 'available' | 'acquired' | 'booting' | 'error';
  acquiredAt: number | null;
  acquiredBy: string | null;
}

export class VmPool {
  private pool: Map<string, PoolEntry> = new Map();
  private config: SandboxConfig;
  private hypervisor: HypervisorManager;
  private snapshotManager: SnapshotManager;
  private baseImagePath: string;

  constructor(
    config: SandboxConfig,
    hypervisor: HypervisorManager,
    snapshotManager: SnapshotManager,
  ) {
    this.config = config;
    this.hypervisor = hypervisor;
    this.snapshotManager = snapshotManager;
    this.baseImagePath = config.imagePath;
  }

  async initialize(): Promise<void> {
    const count = this.config.vmCount;

    for (let i = 0; i < count; i++) {
      const vmId: VmId = {
        id: `lumina-vm-${i + 1}`,
        tag: `pool-${i + 1}`,
      };

      const existingState = this.hypervisor.getState(vmId);
      if (existingState === 'running') {
        try { this.hypervisor.stopVm(vmId, true); } catch {}
      }

      if (existingState !== 'stopped' && existingState !== 'error') {
        try { this.hypervisor.deleteVm(vmId); } catch {}
      }

      const resources: VmResources = {
        cpuCount: this.config.vmCpuCount,
        memoryMb: this.config.vmMemoryMb,
        diskMb: this.config.vmDiskMb,
      };

      this.hypervisor.createVm(vmId, this.baseImagePath, resources);
      this.snapshotManager.clearSnapshots(vmId);
      this.snapshotManager.createSnapshot(vmId, `clean-state-${i + 1}`);

      this.pool.set(vmId.id, {
        vmId,
        state: 'available',
        acquiredAt: null,
        acquiredBy: null,
      });

      log.info(`VM '${vmId.id}' created with clean snapshot`);
    }
  }

  async prebootAll(): Promise<void> {
    const bootPromises: Promise<void>[] = [];

    for (const [, entry] of this.pool) {
      if (entry.state === 'available') {
        entry.state = 'booting';
        const promise = this.bootVm(entry.vmId)
          .then(() => {
            entry.state = 'available';
            log.info(`VM '${entry.vmId.id}' prebooted and ready`);
          })
          .catch((err) => {
            entry.state = 'error';
            log.error(`Failed to preboot VM '${entry.vmId.id}': ${err.message}`);
          });
        bootPromises.push(promise);
      }
    }

    await Promise.allSettled(bootPromises);
    const readyCount = this.getAvailableCount();
    log.info(`Pool initialized: ${readyCount}/${this.pool.size} VMs ready`);
  }

  acquire(agentId: string, timeoutMs: number = 30000): Promise<VmId> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();

      const tryAcquire = () => {
        const available = this.findAvailable();
        if (available) {
          available.state = 'acquired';
          available.acquiredAt = Date.now();
          available.acquiredBy = agentId;
          log.info(`VM '${available.vmId.id}' acquired by agent '${agentId}'`);
          resolve(available.vmId);
          return;
        }

        if (Date.now() - startTime > timeoutMs) {
          reject(new Error(`No VM available in pool after ${timeoutMs}ms`));
          return;
        }

        setTimeout(tryAcquire, 500);
      };

      tryAcquire();
    });
  }

  release(vmId: VmId): void {
    const entry = this.pool.get(vmId.id);
    if (!entry) {
      log.warn(`VM '${vmId.id}' not found in pool`);
      return;
    }

    const snapshot = this.snapshotManager.getLatestSnapshot(vmId);
    if (snapshot) {
      try {
        this.hypervisor.recreateWritableLayer(vmId, this.baseImagePath);
        log.info(`VM '${vmId.id}' discarded writable layer and returned to immutable base '${snapshot.name}'`);
      } catch (e: any) {
        log.warn(`Failed to recreate writable layer for '${vmId.id}', recreating VM: ${e.message}`);
        this.recreateVm(vmId);
        return;
      }
    }

    entry.state = 'available';
    entry.acquiredAt = null;
    entry.acquiredBy = null;
    log.info(`VM '${vmId.id}' released back to pool`);
  }

  getAvailableCount(): number {
    return Array.from(this.pool.values()).filter(e => e.state === 'available').length;
  }

  getAcquiredCount(): number {
    return Array.from(this.pool.values()).filter(e => e.state === 'acquired').length;
  }

  getPoolStatus(): { total: number; available: number; acquired: number; error: number; activeVms: string[] } {
    const entries = Array.from(this.pool.values());
    return {
      total: entries.length,
      available: entries.filter(e => e.state === 'available').length,
      acquired: entries.filter(e => e.state === 'acquired').length,
      error: entries.filter(e => e.state === 'error').length,
      activeVms: entries.map(e => e.vmId.id),
    };
  }

  getAcquiredVmId(agentId: string): VmId | null {
    for (const [, entry] of this.pool) {
      if (entry.acquiredBy === agentId) {
        return entry.vmId;
      }
    }
    return null;
  }

  isAcquired(vmId: VmId): boolean {
    const entry = this.pool.get(vmId.id);
    return entry?.state === 'acquired';
  }

  async shutdown(): Promise<void> {
    log.info('Shutting down VM pool...');
    const promises: Promise<void>[] = [];

    for (const [, entry] of this.pool) {
      const promise = new Promise<void>((resolve) => {
        try {
          this.hypervisor.stopVm(entry.vmId, true);
        } catch {}
        resolve();
      });
      promises.push(promise);
    }

    await Promise.allSettled(promises);
    log.info('All VMs stopped');
  }

  async destroyAll(): Promise<void> {
    log.info('Destroying all pool VMs...');
    for (const [, entry] of this.pool) {
      try {
        this.hypervisor.deleteVm(entry.vmId);
      } catch {}
    }
    this.pool.clear();
    log.info('All pool VMs destroyed');
  }

  private findAvailable(): PoolEntry | null {
    for (const [, entry] of this.pool) {
      if (entry.state === 'available') return entry;
    }
    return null;
  }

  private async bootVm(vmId: VmId): Promise<void> {
    const state = this.hypervisor.getState(vmId);
    if (state === 'running') return;

    this.hypervisor.startVm(vmId);
    await this.hypervisor.waitForBoot(vmId);
  }

  private recreateVm(vmId: VmId): void {
    try {
      this.hypervisor.deleteVm(vmId);
    } catch {}

    const resources: VmResources = {
      cpuCount: this.config.vmCpuCount,
      memoryMb: this.config.vmMemoryMb,
      diskMb: this.config.vmDiskMb,
    };

    this.hypervisor.createVm(vmId, this.baseImagePath, resources);
    this.snapshotManager.clearSnapshots(vmId);
    this.snapshotManager.createSnapshot(vmId, `clean-state-${Date.now()}`);

    const entry = this.pool.get(vmId.id);
    if (entry) {
      entry.state = 'available';
      entry.acquiredAt = null;
      entry.acquiredBy = null;
    }
  }
}
