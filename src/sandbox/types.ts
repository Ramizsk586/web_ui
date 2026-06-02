export type HypervisorType = 'hyper-v' | 'qemu' | 'virtualbox' | 'none';
export type NetworkPolicyMode = 'NONE' | 'REGISTRIES' | 'ALL';

export type VmState = 'stopped' | 'running' | 'paused' | 'error';

export interface VmResources {
  cpuCount: number;
  memoryMb: number;
  diskMb: number;
}

export interface VmId {
  id: string;
  tag: string;
}

export interface VmSnapshot {
  id: string;
  name: string;
  vmId: string;
  createdAt: number;
  parentId: string | null;
}

export interface NetworkPolicy {
  allowNone: boolean;
  allowGitHub: boolean;
  allowNpm: boolean;
  allowPyPI: boolean;
  allowInternet: boolean;
  customDomains: string[];
}

export interface WorkspaceMountConfig {
  hostPath: string;
  guestPath: string;
  readOnly: boolean;
}

export type SandboxExecOptions = {
  command: string;
  cwd?: string;
  timeoutMs?: number;
  env?: Record<string, string>;
  network?: NetworkPolicy;
};

export type SandboxExecResult = {
  stdout: string;
  stderr: string;
  exitCode: number;
  vmId: string;
  durationMs: number;
};

export type SandboxFileOp = 'read' | 'write' | 'delete' | 'list' | 'exists';

export interface SandboxInstallRequest {
  packageType: 'npm' | 'pip' | 'apt' | 'apk';
  packageName: string;
  version?: string;
}

export interface HostDetection {
  windowsVersion: string;
  cpuVirtualization: boolean;
  hyperVSupported: boolean;
  hyperVEnabled: boolean;
  totalRamGb: number;
  freeDiskGb: number;
  wslInstalled: boolean;
}

export interface SandboxConfig {
  vmCount: number;
  vmCpuCount: number;
  vmMemoryMb: number;
  vmDiskMb: number;
  defaultNetwork: NetworkPolicy;
  workspaceMount: WorkspaceMountConfig | null;
  vmRootDir: string;
  imagePath: string;
  kernelPath: string;
  initrdPath: string;
  snapshotDir: string;
}

export interface VsockMessage {
  type: 'exec' | 'exec_result' | 'file_read' | 'file_read_result' | 'file_write' | 'file_write_result' | 'file_list' | 'file_list_result' | 'file_delete' | 'file_delete_result' | 'heartbeat' | 'heartbeat_ack' | 'install' | 'install_result' | 'terminal_open' | 'terminal_data' | 'terminal_resize' | 'terminal_close' | 'terminal_output' | 'preview_start' | 'preview_stop' | 'preview_port' | 'error';
  id: string;
  payload: any;
  timestamp: number;
}

export interface PreviewForwardConfig {
  vmId: string;
  hostPort: number;
  guestPort: number;
  process: 'vite' | 'next' | 'react' | 'static';
  projectPath: string;
}

export interface SandboxMetrics {
  vmId: string;
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  uptimeMs: number;
  processCount: number;
  networkBytesIn: number;
  networkBytesOut: number;
}

export type SandboxLogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface SandboxLogEntry {
  timestamp: number;
  level: SandboxLogLevel;
  source: string;
  vmId: string | null;
  message: string;
  data?: any;
}

export const DEFAULT_SANDBOX_CONFIG: SandboxConfig = {
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
  vmRootDir: '',
  imagePath: '',
  kernelPath: '',
  initrdPath: '',
  snapshotDir: '',
};

export const FORBIDDEN_HOST_PATHS = [
  /^C:\\Users/i,
  /^C:\\Windows/i,
  /^C:\\Program Files/i,
  /^C:\\Program Files \(x86\)/i,
  /^C:\\System32/i,
  /^\/Users\//,
  /^\/etc\//,
  /^\/var\//,
  /^\/System\//,
];

export const MAX_COMMAND_LENGTH = 32768;
export const MAX_OUTPUT_SIZE = 10 * 1024 * 1024;
export const DEFAULT_EXEC_TIMEOUT_MS = 120000;
export const HEARTBEAT_INTERVAL_MS = 5000;
export const VM_BOOT_TIMEOUT_MS = 60000;
export const VSOCK_PORT = 9999;
export const SANDBOX_SERVICE_NAME = 'LuminaSandbox';
export const VM_SWITCH_NAME = 'Lumina NAT Switch';
