import { NetworkPolicyMode } from '../types';

export type { NetworkPolicyMode };

export type CommandPayload = {
  command: string;
  args: string[];
  cwd: string;
  env: Record<string, string>;
  timeoutMs: number;
};

export type ExecutionResponse = {
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
};

export interface ISandboxRpc {
  executeCommand(payload: CommandPayload): Promise<ExecutionResponse>;
  writeFile(path: string, content: Buffer | string): Promise<{ success: boolean; bytesWritten: number }>;
  readFile(path: string): Promise<{ content: Buffer; size: number }>;
  applyNetworkPolicy(policy: NetworkPolicyMode): Promise<{ enforced: boolean }>;
}
