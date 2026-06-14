import { ChildProcessWithoutNullStreams } from 'child_process';

export const state = {
  activePreviewRoot: process.cwd(),
  previewProcess: null as ChildProcessWithoutNullStreams | null,
  previewUrl: '',
  previewProxyOrigin: '',
  previewLogs: [] as string[],
  activeSubagents: {} as Record<string, any>
};
