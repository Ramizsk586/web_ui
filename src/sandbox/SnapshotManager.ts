import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { VmId, VmSnapshot } from './types';
import { createLogger } from './SandboxHealth';

const log = createLogger('SnapshotManager');

export class SnapshotManager {
  private snapshotDir: string;
  private snapshots: Map<string, VmSnapshot> = new Map();

  constructor(snapshotDir: string) {
    this.snapshotDir = snapshotDir;
    fs.mkdirSync(snapshotDir, { recursive: true });
  }

  createSnapshot(vmId: VmId, name: string): VmSnapshot {
    log.info(`Creating snapshot '${name}' for VM '${vmId.id}'`);

    const snapshot: VmSnapshot = {
      id: `snap_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name,
      vmId: vmId.id,
      createdAt: Date.now(),
      parentId: null,
    };

    try {
      const result = execSync(
        `powershell -NoProfile -Command "Checkpoint-VM -Name '${vmId.id}' -SnapshotName '${name}' -Confirm:$false"`,
        { encoding: 'utf8', timeout: 60000 }
      );
      log.info(`Hyper-V checkpoint created: ${result.trim()}`);
    } catch (e: any) {
      log.warn(`Hyper-V checkpoint failed, using file-based snapshot: ${e.message}`);
      this.createFileSnapshot(vmId, snapshot);
    }

    this.snapshots.set(snapshot.id, snapshot);
    return snapshot;
  }

  restoreSnapshot(vmId: VmId, snapshotId: string): void {
    const snapshot = this.snapshots.get(snapshotId);
    if (!snapshot) {
      throw new Error(`Snapshot '${snapshotId}' not found`);
    }

    log.info(`Restoring snapshot '${snapshot.name}' for VM '${vmId.id}'`);

    try {
      execSync(
        `powershell -NoProfile -Command "Restore-VMSnapshot -VMName '${vmId.id}' -Name '${snapshot.name}' -Confirm:$false"`,
        { encoding: 'utf8', timeout: 60000 }
      );
    } catch (e: any) {
      log.warn(`Hyper-V restore failed, trying recovery: ${e.message}`);
      this.restoreFileSnapshot(vmId, snapshot);
    }
  }

  deleteSnapshot(vmId: VmId, snapshotId: string): void {
    const snapshot = this.snapshots.get(snapshotId);
    if (!snapshot) return;

    try {
      execSync(
        `powershell -NoProfile -Command "Remove-VMSnapshot -VMName '${vmId.id}' -Name '${snapshot.name}' -Confirm:$false"`,
        { encoding: 'utf8', timeout: 30000 }
      );
    } catch {}

    this.snapshots.delete(snapshotId);
    this.deleteFileSnapshot(vmId, snapshot);
  }

  getSnapshots(vmId: VmId): VmSnapshot[] {
    return Array.from(this.snapshots.values())
      .filter(s => s.vmId === vmId.id)
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  getLatestSnapshot(vmId: VmId): VmSnapshot | null {
    const vmSnapshots = this.getSnapshots(vmId);
    return vmSnapshots.length > 0 ? vmSnapshots[0] : null;
  }

  clearSnapshots(vmId: VmId): void {
    try {
      execSync(
        `powershell -NoProfile -Command "Get-VMSnapshot -VMName '${vmId.id}' | Remove-VMSnapshot -Confirm:$false"`,
        { encoding: 'utf8', timeout: 60000 }
      );
    } catch {}

    for (const [id, snap] of this.snapshots.entries()) {
      if (snap.vmId === vmId.id) {
        this.deleteFileSnapshot(vmId, snap);
        this.snapshots.delete(id);
      }
    }
  }

  private createFileSnapshot(vmId: VmId, snapshot: VmSnapshot): void {
    const snapFile = path.join(this.snapshotDir, `${vmId.id}_${snapshot.id}.json`);
    const state = {
      id: snapshot.id,
      name: snapshot.name,
      vmId: vmId.id,
      timestamp: snapshot.createdAt,
      writableLayer: path.join(this.snapshotDir, `${vmId.id}_${snapshot.id}_layer`),
    };

    fs.mkdirSync(state.writableLayer, { recursive: true });
    fs.writeFileSync(snapFile, JSON.stringify(state, null, 2));

    const vhdPath = this.findVmDisk(vmId);
    if (vhdPath) {
      const backupPath = path.join(state.writableLayer, 'disk-backup.vhdx');
      try {
        fs.copyFileSync(vhdPath, backupPath);
        log.info(`Disk backed up to ${backupPath}`);
      } catch {}
    }
  }

  private restoreFileSnapshot(vmId: VmId, snapshot: VmSnapshot): void {
    const snapFile = path.join(this.snapshotDir, `${vmId.id}_${snapshot.id}.json`);
    if (!fs.existsSync(snapFile)) {
      throw new Error(`Snapshot file not found: ${snapFile}`);
    }

    const state = JSON.parse(fs.readFileSync(snapFile, 'utf8'));
    const backupPath = path.join(state.writableLayer, 'disk-backup.vhdx');

    if (fs.existsSync(backupPath)) {
      const vhdPath = this.findVmDisk(vmId);
      if (vhdPath) {
        fs.copyFileSync(backupPath, vhdPath);
        log.info(`Disk restored from ${backupPath}`);
      }
    }
  }

  private deleteFileSnapshot(vmId: VmId, snapshot: VmSnapshot): void {
    const snapFile = path.join(this.snapshotDir, `${vmId.id}_${snapshot.id}.json`);
    const writableLayer = path.join(this.snapshotDir, `${vmId.id}_${snapshot.id}_layer`);

    try { if (fs.existsSync(snapFile)) fs.unlinkSync(snapFile); } catch {}
    try { if (fs.existsSync(writableLayer)) fs.rmSync(writableLayer, { recursive: true, force: true }); } catch {}
  }

  private findVmDisk(vmId: VmId): string | null {
    try {
      const result = execSync(
        `powershell -NoProfile -Command "(Get-VMHardDiskDrive -VMName '${vmId.id}').Path"`,
        { encoding: 'utf8', timeout: 5000 }
      );
      return result.trim() || null;
    } catch {
      return null;
    }
  }
}
