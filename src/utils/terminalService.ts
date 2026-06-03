export interface TerminalResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  sessionId: string;
  newPath: string;
}

export interface TerminalExecuteOptions {
  cwd?: string;
  workspaceRoot?: string;
  isCoderMode?: boolean;
  signal?: AbortSignal;
}

type TerminalExecutor = (
  command: string,
  cwd?: string,
  sessionId?: string | null,
) => Promise<TerminalResult>;

let executor: TerminalExecutor | null = null;
let currentSessionId: string | null = null;

export function registerTerminalExecutor(fn: TerminalExecutor): void {
  executor = fn;
}

export function unregisterTerminalExecutor(): void {
  executor = null;
}

export function setTerminalSessionId(id: string | null): void {
  currentSessionId = id;
}

export function getTerminalSessionId(): string | null {
  return currentSessionId;
}

export function isTerminalRegistered(): boolean {
  return executor !== null;
}

export async function executeViaTerminal(
  command: string,
  cwd?: string,
  opts?: TerminalExecuteOptions,
): Promise<TerminalResult> {
  if (executor) {
    return executor(command, cwd, currentSessionId);
  }
  const res = await fetch('/api/terminal/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      command,
      currentPath: cwd || '.',
      sessionId: currentSessionId,
      workspaceRoot: opts?.workspaceRoot,
      isCoderMode: opts?.isCoderMode,
    }),
    signal: opts?.signal,
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Terminal execution error: ${errText}`);
  }
  return res.json();
}
