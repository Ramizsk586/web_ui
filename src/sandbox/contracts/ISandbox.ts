import { CommandPayload, ExecutionResponse, NetworkPolicyMode } from './IIpcProtocol';
import { VmId } from '../types';

export type IsolatedTaskRequest = {
  workspacePath: string;
  payload: CommandPayload;
  policy: NetworkPolicyMode;
  agentId?: string;
};

export interface ISandbox {
  initialize(): Promise<void>;
  runIsolatedTask(request: IsolatedTaskRequest): Promise<ExecutionResponse>;
  acquireVm(agentId: string, workspacePath?: string): Promise<VmId>;
  releaseVm(vmId: VmId): Promise<void>;
}
