import path from 'path';
import fs from 'fs';
import { spawn, type ChildProcessWithoutNullStreams } from 'child_process';
import { VmId, VmResources, VmState } from '../types';
import { createLogger } from '../SandboxHealth';

const log = createLogger('QemuDriver');

type QemuVmProcess = {
  vmId: VmId;
  process: ChildProcessWithoutNullStreams;
};

export class QemuDriver {
  private readonly processes = new Map<string, QemuVmProcess>();

  constructor(private readonly qemuBinaryPath: string, private readonly workDir: string) {}

  isBundled(): boolean {
    return fs.existsSync(this.qemuBinaryPath);
  }

  startVm(id: VmId, imagePath: string, resources: VmResources): void {
    if (!this.isBundled()) {
      throw new Error(`Bundled QEMU binary not found: ${this.qemuBinaryPath}`);
    }

    const args = [
      '-machine', process.platform === 'win32' ? 'q35,accel=whpx' : 'q35,accel=kvm:tcg',
      '-cpu', 'max',
      '-smp', String(resources.cpuCount),
      '-m', String(resources.memoryMb),
      '-drive', `file=${imagePath},if=virtio,format=raw,readonly=on`,
      '-device', 'vhost-vsock-pci,guest-cid=3',
      '-net', 'none',
      '-display', 'none',
      '-serial', `pipe:${path.join(this.workDir, id.id)}`,
    ];

    const proc = spawn(this.qemuBinaryPath, args, {
      cwd: this.workDir,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });

    proc.stderr.on('data', (chunk) => log.warn(`[${id.id}] ${String(chunk).trim()}`));
    proc.on('exit', (code) => {
      this.processes.delete(id.id);
      log.info(`QEMU VM '${id.id}' exited with code ${code}`);
    });

    this.processes.set(id.id, { vmId: id, process: proc });
  }

  stopVm(id: VmId): void {
    const entry = this.processes.get(id.id);
    if (!entry) return;
    entry.process.kill('SIGKILL');
    this.processes.delete(id.id);
  }

  getState(id: VmId): VmState {
    const entry = this.processes.get(id.id);
    if (!entry) return 'stopped';
    return entry.process.killed ? 'stopped' : 'running';
  }
}
