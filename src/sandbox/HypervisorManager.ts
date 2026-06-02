import { execSync, spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { VmId, VmState, VmResources, HostDetection, VM_SWITCH_NAME } from './types';
import { createLogger } from './SandboxHealth';

const log = createLogger('HypervisorManager');

export class HypervisorManager {
  private vmRootDir: string;

  constructor(vmRootDir: string) {
    this.vmRootDir = vmRootDir;
    fs.mkdirSync(vmRootDir, { recursive: true });
  }

  async detect(): Promise<HostDetection> {
    const detection: HostDetection = {
      windowsVersion: 'unknown',
      cpuVirtualization: false,
      hyperVSupported: false,
      hyperVEnabled: false,
      totalRamGb: 0,
      freeDiskGb: 0,
      wslInstalled: false,
    };

    try {
      const osInfo = execSync('wmic os get Caption,Version /value', {
        encoding: 'utf8',
        timeout: 5000,
      });
      const caption = osInfo.match(/Caption=([^\r\n]+)/)?.[1]?.trim() || 'unknown';
      detection.windowsVersion = caption;
    } catch {}

    try {
      const cpuInfo = execSync('systeminfo | findstr /C:"Virtualization Enabled In Firmware"', {
        encoding: 'utf8',
        timeout: 5000,
      });
      detection.cpuVirtualization = cpuInfo.toLowerCase().includes('yes');
    } catch {}

    try {
      const hvInfo = execSync(
        'powershell -NoProfile -Command "(Get-WmiObject -Class Win32_ComputerSystem).HypervisorPresent"',
        { encoding: 'utf8', timeout: 5000 }
      );
      detection.hyperVSupported = hvInfo.trim() === 'True';
    } catch {}

    detection.hyperVEnabled = detection.hyperVSupported;

    try {
      const totalRamStr = execSync(
        'powershell -NoProfile -Command "(Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory / 1GB"',
        { encoding: 'utf8', timeout: 5000 }
      );
      detection.totalRamGb = Math.round(parseFloat(totalRamStr.trim()));
    } catch {}

    try {
      const freeDiskStr = execSync(
        'powershell -NoProfile -Command "(Get-PSDrive C).Free / 1GB"',
        { encoding: 'utf8', timeout: 5000 }
      );
      detection.freeDiskGb = Math.round(parseFloat(freeDiskStr.trim()));
    } catch {}

    try {
      const wslCheck = execSync('wsl --status', { encoding: 'utf8', timeout: 5000 });
      detection.wslInstalled = true;
    } catch {
      detection.wslInstalled = false;
    }

    return detection;
  }

  async ensureHyperVEnabled(): Promise<void> {
    const detection = await this.detect();
    if (!detection.hyperVSupported) {
      throw new Error('CPU does not support virtualization (SLAT/VMX required)');
    }
    if (!detection.hyperVEnabled) {
      log.warn('Hyper-V not enabled. Attempting to enable...');
      try {
        execSync(
          'powershell -NoProfile -Command "Enable-WindowsOptionalFeature -Online -FeatureName Microsoft-Hyper-V -All -NoRestart"',
          { encoding: 'utf8', timeout: 120000 }
        );
        throw new Error('Hyper-V was enabled but requires a system restart. Please restart Windows and run Lumina again.');
      } catch (e: any) {
        if (e.message?.includes('restart')) throw e;
        throw new Error(`Failed to enable Hyper-V: ${e.message}. Enable it manually: Turn Windows features on/off > Hyper-V`);
      }
    }
  }

  async createVmSwitch(): Promise<void> {
    try {
      const existing = execSync(
        `powershell -NoProfile -Command "Get-VMSwitch -Name '${VM_SWITCH_NAME}' -ErrorAction SilentlyContinue"`,
        { encoding: 'utf8', timeout: 10000 }
      );
      if (existing.trim()) {
        log.info(`VM switch '${VM_SWITCH_NAME}' already exists`);
        return;
      }
    } catch {}

    log.info(`Creating NAT switch '${VM_SWITCH_NAME}'...`);
    execSync(
      `powershell -NoProfile -Command "New-VMSwitch -SwitchName '${VM_SWITCH_NAME}' -SwitchType NAT -NetAdapterName 'vEthernet (${VM_SWITCH_NAME})'"`,
      { encoding: 'utf8', timeout: 30000 }
    );

    try {
      execSync(
        `powershell -NoProfile -Command "New-NetIPAddress -IPAddress 192.168.137.1 -PrefixLength 24 -InterfaceAlias 'vEthernet (${VM_SWITCH_NAME})'"`,
        { encoding: 'utf8', timeout: 10000 }
      );
    } catch {}

    try {
      execSync(
        `powershell -NoProfile -Command "New-NetNat -Name '${VM_SWITCH_NAME}' -InternalIPInterfaceAddressPrefix 192.168.137.0/24"`,
        { encoding: 'utf8', timeout: 10000 }
      );
    } catch {}
  }

  createVm(id: VmId, imagePath: string, resources: VmResources): void {
    const baseImagePath = this.normalizeBaseImagePath(imagePath);
    const vhdPath = path.join(this.vmRootDir, 'disks', `${id.id}.vhdx`);
    const memoryBytes = resources.memoryMb * 1024 * 1024;

    log.info(`Creating VM '${id.id}' with ${resources.cpuCount} vCPU, ${resources.memoryMb}MB RAM`);

    if (!fs.existsSync(baseImagePath)) {
      throw new Error(`Base image not found: ${baseImagePath}`);
    }

    fs.mkdirSync(path.dirname(vhdPath), { recursive: true });
    try { if (fs.existsSync(vhdPath)) fs.unlinkSync(vhdPath); } catch {}
    execSync(
      `powershell -NoProfile -Command "Set-ItemProperty -LiteralPath '${baseImagePath}' -Name IsReadOnly -Value $true; New-VHD -Path '${vhdPath}' -ParentPath '${baseImagePath}' -Differencing"`,
      { encoding: 'utf8', timeout: 30000 }
    );

    const createCmd = [
      `powershell -NoProfile -Command "`,
      `New-VM -Name '${id.id}' -MemoryStartupBytes ${memoryBytes} -BootDevice VHD -VHDPath '${vhdPath}' -Generation 2 -SwitchName '${VM_SWITCH_NAME}'`,
      `; Set-VM -Name '${id.id}' -ProcessorCount ${resources.cpuCount}`,
      `; Set-VM -Name '${id.id}' -AutomaticCheckpointsEnabled $false`,
      `; Set-VM -Name '${id.id}' -MemoryMinimumBytes ${memoryBytes} -MemoryMaximumBytes ${memoryBytes}`,
      `; Set-VM -Name '${id.id}' -CheckpointType Production`,
      `; Enable-VMIntegrationService -VMName '${id.id}' -Name 'Guest Service Interface'`,
      `; Set-VMFirmware -VMName '${id.id}' -EnableSecureBoot Off`,
      `; Set-VMComPort -VMName '${id.id}' -Path '\\\\.\\pipe\\lumina-${id.id}' -Number 1`,
      `"`,
    ].join(' ');

    execSync(createCmd, { encoding: 'utf8', timeout: 30000 });
    log.info(`VM '${id.id}' created`);
  }

  startVm(id: VmId): void {
    log.info(`Starting VM '${id.id}'...`);
    execSync(
      `powershell -NoProfile -Command "Start-VM -Name '${id.id}'"`,
      { encoding: 'utf8', timeout: 60000 }
    );
  }

  stopVm(id: VmId, force: boolean = false): void {
    log.info(`Stopping VM '${id.id}' (force=${force})...`);
    try {
      const cmd = force
        ? `Stop-VM -Name '${id.id}' -TurnOff -Force`
        : `Stop-VM -Name '${id.id}'`;
      execSync(`powershell -NoProfile -Command "${cmd}"`, {
        encoding: 'utf8',
        timeout: 30000,
      });
    } catch (e: any) {
      log.error(`Failed to stop VM '${id.id}': ${e.message}`);
    }
  }

  deleteVm(id: VmId): void {
    log.info(`Deleting VM '${id.id}'...`);
    this.stopVm(id, true);
    try {
      execSync(
        `powershell -NoProfile -Command "Remove-VM -Name '${id.id}' -Force"`,
        { encoding: 'utf8', timeout: 15000 }
      );
    } catch {}

    const vhdPath = path.join(this.vmRootDir, 'disks', `${id.id}.vhdx`);
    try {
      if (fs.existsSync(vhdPath)) fs.unlinkSync(vhdPath);
    } catch {}
  }

  recreateWritableLayer(id: VmId, imagePath: string): void {
    const baseImagePath = this.normalizeBaseImagePath(imagePath);
    const vhdPath = path.join(this.vmRootDir, 'disks', `${id.id}.vhdx`);
    this.stopVm(id, true);
    try {
      if (fs.existsSync(vhdPath)) fs.unlinkSync(vhdPath);
    } catch {}
    execSync(
      `powershell -NoProfile -Command "New-VHD -Path '${vhdPath}' -ParentPath '${baseImagePath}' -Differencing | Out-Null; Set-VMHardDiskDrive -VMName '${id.id}' -Path '${vhdPath}'"`,
      { encoding: 'utf8', timeout: 30000 }
    );
    this.startVm(id);
  }

  getState(id: VmId): VmState {
    try {
      const result = execSync(
        `powershell -NoProfile -Command "(Get-VM -Name '${id.id}').State"`,
        { encoding: 'utf8', timeout: 5000 }
      );
      const state = result.trim();
      if (state === 'Running') return 'running';
      if (state === 'Paused') return 'paused';
      return 'stopped';
    } catch {
      return 'error';
    }
  }

  waitForBoot(id: VmId, timeoutMs: number = 60000): Promise<void> {
    return new Promise((resolve, reject) => {
      const start = Date.now();
      const check = () => {
        const state = this.getState(id);
        if (state === 'running') {
          resolve();
          return;
        }
        if (Date.now() - start > timeoutMs) {
          reject(new Error(`VM '${id.id}' failed to start within ${timeoutMs}ms`));
          return;
        }
        setTimeout(check, 1000);
      };
      check();
    });
  }

  getVmIp(id: VmId): string | null {
    try {
      const result = execSync(
        `powershell -NoProfile -Command "(Get-VMNetworkAdapter -VMName '${id.id}').IPAddresses[0]"`,
        { encoding: 'utf8', timeout: 5000 }
      );
      return result.trim() || null;
    } catch {
      return null;
    }
  }

  async executePowerShellDirect(id: VmId, command: string): Promise<string> {
    try {
      const result = execSync(
        `powershell -NoProfile -Command "Invoke-Command -VMName '${id.id}' -ScriptBlock { ${command.replace(/"/g, '`"')} }"`,
        { encoding: 'utf8', timeout: 30000 }
      );
      return result.trim();
    } catch (e: any) {
      throw new Error(`PowerShell Direct execution failed: ${e.message}`);
    }
  }

  exposePort(id: VmId, guestPort: number, hostPort: number): void {
    try {
      execSync(
        `powershell -NoProfile -Command "Add-NetNatStaticMapping -NatName '${VM_SWITCH_NAME}' -Protocol TCP -ExternalIPAddress 0.0.0.0 -InternalIPAddress 192.168.137.${this.getVmSuffix(id)} -InternalPort ${guestPort} -ExternalPort ${hostPort}"`,
        { encoding: 'utf8', timeout: 10000 }
      );
    } catch {}
  }

  removePortExpose(id: VmId, hostPort: number): void {
    try {
      execSync(
        `powershell -NoProfile -Command "Remove-NetNatStaticMapping -NatName '${VM_SWITCH_NAME}' -ExternalPort ${hostPort} -Confirm:$false"`,
        { encoding: 'utf8', timeout: 10000 }
      );
    } catch {}
  }

  private getVmSuffix(id: VmId): number {
    const hash = id.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    return (hash % 254) + 1;
  }

  private normalizeBaseImagePath(imagePath: string): string {
    const ext = path.extname(imagePath).toLowerCase();
    if (ext === '.vhdx') return imagePath;
    const candidate = imagePath.replace(/\.img$/i, '.vhdx');
    return fs.existsSync(candidate) ? candidate : imagePath;
  }

  listAllVms(): VmId[] {
    try {
      const result = execSync(
        `powershell -NoProfile -Command "Get-VM | Where-Object { $_.Name -like 'lumina-vm-*' } | Select-Object -ExpandProperty Name"`,
        { encoding: 'utf8', timeout: 10000 }
      );
      return result.trim().split('\n').filter(Boolean).map((name: string) => ({
        id: name.trim(),
        tag: 'sandbox',
      }));
    } catch {
      return [];
    }
  }
}
