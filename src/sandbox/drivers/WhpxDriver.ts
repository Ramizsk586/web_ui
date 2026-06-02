import { HypervisorManager } from '../HypervisorManager';
import { HostDetection, VmId, VmResources, VmState } from '../types';

export class WhpxDriver {
  constructor(private readonly hypervisor: HypervisorManager) {}

  detect(): Promise<HostDetection> {
    return this.hypervisor.detect();
  }

  ensureAvailable(): Promise<void> {
    return this.hypervisor.ensureHyperVEnabled();
  }

  createVm(id: VmId, imagePath: string, resources: VmResources): void {
    this.hypervisor.createVm(id, imagePath, resources);
  }

  startVm(id: VmId): void {
    this.hypervisor.startVm(id);
  }

  stopVm(id: VmId, force = false): void {
    this.hypervisor.stopVm(id, force);
  }

  deleteVm(id: VmId): void {
    this.hypervisor.deleteVm(id);
  }

  getState(id: VmId): VmState {
    return this.hypervisor.getState(id);
  }
}
