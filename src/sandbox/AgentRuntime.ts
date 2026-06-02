import { VmId, SandboxExecOptions, SandboxExecResult, SandboxInstallRequest, DEFAULT_EXEC_TIMEOUT_MS, MAX_OUTPUT_SIZE } from './types';
import { VsockBridge } from './VsockBridge';
import { NetworkPolicyEngine } from './NetworkPolicy';
import { createLogger } from './SandboxHealth';

const log = createLogger('AgentRuntime');

export class AgentRuntime {
  private vsock: VsockBridge;
  private networkPolicy: NetworkPolicyEngine;

  constructor(vsock: VsockBridge, networkPolicy: NetworkPolicyEngine) {
    this.vsock = vsock;
    this.networkPolicy = networkPolicy;
  }

  async exec(vmId: VmId, options: SandboxExecOptions): Promise<SandboxExecResult> {
    const startTime = Date.now();

    this.validateCommand(options.command);

    log.info(`Executing in VM '${vmId.id}': ${options.command.slice(0, 200)}`);

    const envVars = options.env || {};
    const wrappedCommand = this.buildWrappedCommand(options.command, options.cwd || '/workspace', envVars);
    const timeout = options.timeoutMs || DEFAULT_EXEC_TIMEOUT_MS;

    try {
      const msg = this.vsock.createVsockMessage('exec', {
        command: wrappedCommand,
        timeout,
        network: options.network,
      });

      return new Promise((resolve, reject) => {
        let resolved = false;
        const timer = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            reject(new Error(`Execution timed out after ${timeout}ms in VM '${vmId.id}'`));
          }
        }, timeout + 5000);

        this.vsock.registerHandler('exec_result', async (response) => {
          if (response.id !== msg.id) return null;
          if (resolved) return null;
          resolved = true;
          clearTimeout(timer);

          const result: SandboxExecResult = {
            stdout: this.sanitizeOutput(response.payload.stdout || ''),
            stderr: this.sanitizeOutput(response.payload.stderr || ''),
            exitCode: response.payload.exitCode ?? 1,
            vmId: vmId.id,
            durationMs: Date.now() - startTime,
          };

          resolve(result);
          return null;
        });

        this.vsock.sendToVm(vmId, msg);
      });
    } catch (e: any) {
      return {
        stdout: '',
        stderr: `Sandbox execution error: ${e.message}`,
        exitCode: 1,
        vmId: vmId.id,
        durationMs: Date.now() - startTime,
      };
    }
  }

  async installPackage(vmId: VmId, request: SandboxInstallRequest): Promise<SandboxExecResult> {
    let command: string;

    switch (request.packageType) {
      case 'npm':
        command = `npm install ${request.packageName}${request.version ? `@${request.version}` : ''}`;
        break;
      case 'pip':
        command = `pip install ${request.packageName}${request.version ? `==${request.version}` : ''}`;
        break;
      case 'apt':
        command = `apt-get update -qq && apt-get install -y -qq ${request.packageName}`;
        break;
      case 'apk':
        command = `apk add --no-cache ${request.packageName}`;
        break;
      default:
        throw new Error(`Unsupported package type: ${request.packageType}`);
    }

    return this.exec(vmId, { command, timeoutMs: 300000 });
  }

  private buildWrappedCommand(command: string, cwd: string, env: Record<string, string>): string {
    const envExports = Object.entries(env)
      .map(([k, v]) => `export ${k}="${v.replace(/"/g, '\\"')}"`)
      .join('; ');

    return [
      `cd "${cwd}"`,
      envExports ? `&& ${envExports}` : '',
      `&& ${command}`,
    ].filter(Boolean).join(' ');
  }

  private validateCommand(command: string): void {
    if (!command || command.length === 0) {
      throw new Error('Empty command');
    }

    if (command.length > 32768) {
      throw new Error('Command exceeds maximum length of 32768 characters');
    }

    const dangerousPatterns = [
      /rm\s+-rf\s+\/\s*$/,
      /mkfs\./,
      /dd\s+if=\/dev\/zero/,
      />\s*\/dev\/(sda|sdb|nvme)/,
      /:\(\)\s*\{.*:\(\)\s*;\};/,
      /wget\s+-qO-\s+.*\s*\|\s*sh/,
      /curl\s+.*\s*\|\s*(?:ba)?sh/,
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(command)) {
        throw new Error(`Command rejected: potentially dangerous pattern detected`);
      }
    }
  }

  private sanitizeOutput(output: string): string {
    if (!output) return '';
    if (output.length > MAX_OUTPUT_SIZE) {
      return output.slice(0, MAX_OUTPUT_SIZE) + `\n... [output truncated at ${MAX_OUTPUT_SIZE} bytes]`;
    }
    return output;
  }
}
