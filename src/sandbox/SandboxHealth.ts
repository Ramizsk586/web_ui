import { SandboxLogEntry, SandboxLogLevel, SandboxMetrics, VsockMessage } from './types';

class Logger {
  private source: string;

  constructor(source: string) {
    this.source = source;
  }

  private log(level: SandboxLogLevel, message: string, data?: any): void {
    const entry: SandboxLogEntry = {
      timestamp: Date.now(),
      level,
      source: this.source,
      vmId: null,
      message,
      data,
    };
    outputLog(entry);
  }

  debug(message: string, data?: any): void { this.log('debug', message, data); }
  info(message: string, data?: any): void { this.log('info', message, data); }
  warn(message: string, data?: any): void { this.log('warn', message, data); }
  error(message: string, data?: any): void { this.log('error', message, data); }
}

const loggers: Map<string, Logger> = new Map();
const logHistory: SandboxLogEntry[] = [];
const MAX_LOG_HISTORY = 10000;
const logListeners: Array<(entry: SandboxLogEntry) => void> = [];

function outputLog(entry: SandboxLogEntry): void {
  const prefix = `[${entry.level.toUpperCase()}] [${entry.source}]`;
  const msg = `${prefix} ${entry.message}`;

  switch (entry.level) {
    case 'error': console.error(msg); break;
    case 'warn': console.warn(msg); break;
    default: console.log(msg); break;
  }

  logHistory.push(entry);
  if (logHistory.length > MAX_LOG_HISTORY) logHistory.shift();

  for (const listener of logListeners) {
    try { listener(entry); } catch {}
  }
}

export function createLogger(source: string): Logger {
  if (!loggers.has(source)) {
    loggers.set(source, new Logger(source));
  }
  return loggers.get(source)!;
}

export function onLog(listener: (entry: SandboxLogEntry) => void): void {
  logListeners.push(listener);
}

export function getLogHistory(level?: SandboxLogLevel, limit = 100): SandboxLogEntry[] {
  const entries = level ? logHistory.filter(e => e.level === level) : [...logHistory];
  return entries.slice(-limit);
}

export function clearLogHistory(): void {
  logHistory.length = 0;
}

export class SandboxHealthMonitor {
  private vmMetrics: Map<string, SandboxMetrics> = new Map();
  private checkInterval: NodeJS.Timeout | null = null;

  constructor(private getMetrics: (vmId: string) => Promise<SandboxMetrics | null>) {}

  start(intervalMs = 30000): void {
    if (this.checkInterval) return;
    this.checkInterval = setInterval(() => this.checkAll(), intervalMs);
  }

  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  async getVmMetrics(vmId: string): Promise<SandboxMetrics | null> {
    return this.vmMetrics.get(vmId) || null;
  }

  async getAllMetrics(): Promise<Map<string, SandboxMetrics>> {
    return new Map(this.vmMetrics);
  }

  private async checkAll(): Promise<void> {
    const vmIds = Array.from(this.vmMetrics.keys());
    for (const vmId of vmIds) {
      try {
        const metrics = await this.getMetrics(vmId);
        if (metrics) {
          this.vmMetrics.set(vmId, metrics);
          if (metrics.cpuUsage > 95) {
            createLogger('SandboxHealth').warn(`VM '${vmId}' CPU usage critical: ${metrics.cpuUsage}%`);
          }
          if (metrics.memoryUsage > 95) {
            createLogger('SandboxHealth').warn(`VM '${vmId}' memory usage critical: ${metrics.memoryUsage}%`);
          }
        }
      } catch {}
    }
  }
}

export function createHealthMonitor(
  getMetricsFn: (vmId: string) => Promise<SandboxMetrics | null>
): SandboxHealthMonitor {
  return new SandboxHealthMonitor(getMetricsFn);
}
