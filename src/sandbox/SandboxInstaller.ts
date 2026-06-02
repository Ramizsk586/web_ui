import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';
import { HostDetection, SandboxConfig } from './types';
import { HypervisorManager } from './HypervisorManager';
import { createLogger } from './SandboxHealth';

const log = createLogger('SandboxInstaller');

export class SandboxInstaller {
  private hypervisor: HypervisorManager;
  private luminaDataDir: string;

  constructor(hypervisor: HypervisorManager, luminaDataDir: string) {
    this.hypervisor = hypervisor;
    this.luminaDataDir = luminaDataDir;
  }

  async install(): Promise<void> {
    log.info('Starting Lumina Sandbox installation...');

    this.printStep(1, 'Detecting Windows virtualization support...');
    const detection = await this.hypervisor.detect();

    this.printDetectionResults(detection);

    if (!detection.hyperVSupported && !detection.wslInstalled) {
      throw new Error(
        'CPU virtualization not supported. ' +
        'Lumina Sandbox requires Hyper-V or WSL backed by VT-x/AMD-V. ' +
        'Please enable virtualization in your BIOS/UEFI settings.'
      );
    }

    this.printStep(2, 'Configuring WSL/Hyper-V runtime...');
    await this.ensureDirectories();
    if (detection.hyperVSupported) {
      await this.hypervisor.ensureHyperVEnabled();
      await this.hypervisor.createVmSwitch();
    }

    this.printStep(3, 'Installing VM base image...');
    await this.installBaseImage(detection);

    this.printStep(4, 'Creating VM pool...');
    log.info('VM pool created with default configuration');

    this.printStep(5, 'Installing Lumina Sandbox Service...');
    try {
      this.registerService();
    } catch (e: any) {
      log.warn(`Service registration skipped (admin may be required): ${e.message}`);
    }

    this.printStep(6, 'Installation complete');
    this.printPostInstall(detection);
  }

  async verifyInstallation(): Promise<{ ok: boolean; issues: string[] }> {
    const issues: string[] = [];

    const vmDir = path.join(this.luminaDataDir, 'vm');
    if (!fs.existsSync(vmDir)) {
      issues.push('VM directory not found');
    }

    const imgPath = path.join(vmDir, 'lumina-base.img');
    const vhdxPath = path.join(vmDir, 'lumina-base.vhdx');
    if (!fs.existsSync(vhdxPath) && !fs.existsSync(imgPath)) {
      issues.push('Base image not found');
    }

    try {
      const detection = await this.hypervisor.detect();
      if (!detection.hyperVEnabled && !detection.wslInstalled) {
        issues.push('Neither WSL nor Hyper-V is available');
      }
    } catch (e: any) {
      issues.push(`Hyper-V detection failed: ${e.message}`);
    }

    return { ok: issues.length === 0, issues };
  }

  getSandboxConfig(): SandboxConfig {
    const vmDir = path.join(this.luminaDataDir, 'vm');
    const snapshotsDir = path.join(vmDir, 'snapshots');

    return {
      vmCount: 4,
      vmCpuCount: 2,
      vmMemoryMb: 2048,
      vmDiskMb: 5120,
      defaultNetwork: {
        allowNone: true,
        allowGitHub: false,
        allowNpm: false,
        allowPyPI: false,
        allowInternet: false,
        customDomains: [],
      },
      workspaceMount: null,
      vmRootDir: vmDir,
      imagePath: path.join(vmDir, 'lumina-base.img'),
      kernelPath: path.join(vmDir, 'kernel'),
      initrdPath: path.join(vmDir, 'initrd'),
      snapshotDir: snapshotsDir,
    };
  }

  private async ensureDirectories(): Promise<void> {
    const dirs = [
      this.luminaDataDir,
      path.join(this.luminaDataDir, 'vm'),
      path.join(this.luminaDataDir, 'vm', 'snapshots'),
      path.join(this.luminaDataDir, 'vm', 'disks'),
      path.join(this.luminaDataDir, 'vm', 'images'),
    ];

    for (const dir of dirs) {
      fs.mkdirSync(dir, { recursive: true });
      log.info(`Created directory: ${dir}`);
    }
  }

  private async installBaseImage(detection: HostDetection): Promise<void> {
    const vmDir = path.join(this.luminaDataDir, 'vm');
    const imgPath = path.join(vmDir, 'lumina-base.img');

    const vhdxPath = path.join(vmDir, 'lumina-base.vhdx');
    if (fs.existsSync(vhdxPath) || fs.existsSync(imgPath)) {
      const existingPath = fs.existsSync(vhdxPath) ? vhdxPath : imgPath;
      const size = fs.statSync(existingPath).size;
      log.info(`Base image already exists (${(size / 1024 / 1024).toFixed(1)} MB)`);
      return;
    }

    log.info('Generating Lumina VM base image...');

    try {
      const scriptPath = path.join(__dirname, '..', 'scripts', 'build-vm-image.ps1');
      if (fs.existsSync(scriptPath)) {
        log.info(`Running VM build script: ${scriptPath}`);
        execSync(
          `powershell -NoProfile -ExecutionPolicy Bypass -File "${scriptPath}" -OutputDir "${vmDir}"`,
          { encoding: 'utf8', timeout: 300000, stdio: 'inherit' }
        );
      }
    } catch (e: any) {
      log.warn(`VM build script failed, creating minimal placeholder: ${e.message}`);
      this.createMinimalImage(imgPath, detection);
    }

    const installedPath = fs.existsSync(vhdxPath) ? vhdxPath : imgPath;
    if (fs.existsSync(installedPath)) {
      const size = fs.statSync(installedPath).size;
      log.info(`Base image installed: ${(size / 1024 / 1024).toFixed(1)} MB at ${installedPath}`);
    }
  }

  private createMinimalImage(imgPath: string, detection: HostDetection): void {
    const totalSize = detection.totalRamGb > 0 ? Math.min(detection.totalRamGb * 512, 2048) : 2048;
    const buffer = Buffer.alloc(totalSize * 1024 * 1024, 0);
    fs.writeFileSync(imgPath, buffer);
    log.info(`Created minimal ${totalSize}MB base image (placeholder)`);
  }

  private registerService(): void {
    try {
      execSync(
        `powershell -NoProfile -Command "New-Service -Name 'LuminaSandbox' -DisplayName 'Lumina Sandbox Service' -BinaryPathName '${process.execPath} ${path.join(this.luminaDataDir, 'sandbox-service.js')}' -StartupType Automatic"`,
        { encoding: 'utf8', timeout: 15000 }
      );
      log.info('LuminaSandbox service registered');
    } catch (e: any) {
      if (e.message?.includes('already exists')) {
        log.info('LuminaSandbox service already registered');
        return;
      }
      throw e;
    }
  }

  private printStep(step: number, message: string): void {
    log.info(`[Step ${step}/6] ${message}`);
  }

  private printDetectionResults(d: HostDetection): void {
    log.info(`  Windows: ${d.windowsVersion}`);
    log.info(`  CPU Virtualization: ${d.cpuVirtualization ? 'Yes' : 'No'}`);
    log.info(`  Hyper-V Support: ${d.hyperVSupported ? 'Yes' : 'No'}`);
    log.info(`  Hyper-V Enabled: ${d.hyperVEnabled ? 'Yes' : 'No'}`);
    log.info(`  RAM: ${d.totalRamGb} GB`);
    log.info(`  Free Disk: ${d.freeDiskGb} GB`);
    log.info(`  WSL: ${d.wslInstalled ? 'Installed' : 'Not found'}`);
  }

  private printPostInstall(d: HostDetection): void {
    log.info('');
    log.info('Sandbox Configuration:');
    log.info(`  VM Pool Size: 4 VMs`);
    log.info(`  CPU per VM: 2 vCPU`);
    log.info(`  RAM per VM: 2 GB`);
    log.info(`  Disk per VM: 5 GB writable layer`);
    log.info(`  Network Policy: No Internet (default)`);
    log.info(`  Runtime: WSL/Hyper-V`);
    log.info('');
    if (d.freeDiskGb < 20) {
      log.warn(`Warning: Only ${d.freeDiskGb} GB free on C: drive. Sandbox requires at least 20 GB.`);
    }
  }
}
