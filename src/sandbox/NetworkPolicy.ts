import { NetworkPolicy as NetworkPolicyConfig, NetworkPolicyMode } from './types';
import { createLogger } from './SandboxHealth';

const log = createLogger('NetworkPolicy');

export class NetworkPolicyEngine {
  private activePolicies: Map<string, NetworkPolicyConfig> = new Map();

  static readonly DEFAULT_POLICY: NetworkPolicyConfig = {
    allowNone: true,
    allowGitHub: false,
    allowNpm: false,
    allowPyPI: false,
    allowInternet: false,
    customDomains: [],
  };

  static fromMode(mode: NetworkPolicyMode): NetworkPolicyConfig {
    switch (mode) {
      case 'NONE':
        return { ...NetworkPolicyEngine.DEFAULT_POLICY };
      case 'REGISTRIES':
        return {
          allowNone: false,
          allowGitHub: true,
          allowNpm: true,
          allowPyPI: true,
          allowInternet: false,
          customDomains: [],
        };
      case 'ALL':
        return {
          allowNone: false,
          allowGitHub: true,
          allowNpm: true,
          allowPyPI: true,
          allowInternet: true,
          customDomains: [],
        };
    }
  }

  static toMode(policy: NetworkPolicyConfig): NetworkPolicyMode {
    if (policy.allowNone) return 'NONE';
    if (policy.allowInternet) return 'ALL';
    if (policy.allowGitHub && policy.allowNpm && policy.allowPyPI && policy.customDomains.length === 0) {
      return 'REGISTRIES';
    }
    return 'REGISTRIES';
  }

  static readonly ALLOWLIST: Record<string, string[]> = {
    github: [
      'github.com',
      'api.github.com',
      'raw.githubusercontent.com',
      'codeload.github.com',
      'objects.githubusercontent.com',
    ],
    npm: [
      'registry.npmjs.org',
      'registry.yarnpkg.com',
      'npmjs.com',
      'www.npmjs.com',
      'unpkg.com',
      'cdn.jsdelivr.net',
      'deno.land',
      'esm.sh',
      'skypack.dev',
    ],
    pypi: [
      'pypi.org',
      'files.pythonhosted.org',
      'pypi.python.org',
      'pypi.io',
      'warehouse.pythonhosted.org',
    ],
  };

  setPolicy(vmId: string, policy: NetworkPolicyConfig | NetworkPolicyMode): void {
    if (typeof policy === 'string') {
      policy = NetworkPolicyEngine.fromMode(policy);
    }
    if (policy.allowNone) {
      policy = NetworkPolicyEngine.DEFAULT_POLICY;
    }
    this.activePolicies.set(vmId, policy);
    this.applyPolicy(vmId, policy);
  }

  getPolicy(vmId: string): NetworkPolicyConfig {
    return this.activePolicies.get(vmId) || { ...NetworkPolicyEngine.DEFAULT_POLICY };
  }

  resetToDefault(vmId: string): void {
    this.setPolicy(vmId, { ...NetworkPolicyEngine.DEFAULT_POLICY });
  }

  isUrlAllowed(url: string, vmId: string): boolean {
    const policy = this.getPolicy(vmId);

    if (policy.allowNone) {
      return false;
    }

    try {
      const parsed = new URL(url);
      const hostname = parsed.hostname.toLowerCase();

      if (this.isLocalhost(url) || this.isPrivateNetwork(url)) return false;

      if (policy.allowInternet) return true;

      if (policy.allowGitHub && this.matchesAny(hostname, NetworkPolicyEngine.ALLOWLIST.github)) return true;
      if (policy.allowNpm && this.matchesAny(hostname, NetworkPolicyEngine.ALLOWLIST.npm)) return true;
      if (policy.allowPyPI && this.matchesAny(hostname, NetworkPolicyEngine.ALLOWLIST.pypi)) return true;

      if (policy.customDomains.some(d => hostname === d.toLowerCase() || hostname.endsWith('.' + d.toLowerCase()))) return true;

      return false;
    } catch {
      return false;
    }
  }

  getAccessibleHosts(vmId: string): string[] {
    const policy = this.getPolicy(vmId);
    const hosts: string[] = [];

    if (policy.allowNone) return [];

    if (policy.allowGitHub) hosts.push(...NetworkPolicyEngine.ALLOWLIST.github);
    if (policy.allowNpm) hosts.push(...NetworkPolicyEngine.ALLOWLIST.npm);
    if (policy.allowPyPI) hosts.push(...NetworkPolicyEngine.ALLOWLIST.pypi);
    if (policy.allowInternet) hosts.push('*');

    hosts.push(...policy.customDomains);
    return hosts;
  }

  clearPolicy(vmId: string): void {
    this.activePolicies.delete(vmId);
  }

  clearAll(): void {
    this.activePolicies.clear();
  }

  private applyPolicy(vmId: string, policy: NetworkPolicyConfig): void {
    log.info(`Applying network policy for VM '${vmId}':`, policy);
  }

  private isLocalhost(url: string): boolean {
    try {
      const hostname = new URL(url).hostname;
      return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname === '[::1]' || hostname === '0.0.0.0';
    } catch {
      return false;
    }
  }

  private isPrivateNetwork(url: string): boolean {
    try {
      const hostname = new URL(url).hostname;

      if (hostname.startsWith('192.168.') || hostname.startsWith('10.')) return true;
      if (hostname.startsWith('172.') && parseInt(hostname.split('.')[1]) >= 16 && parseInt(hostname.split('.')[1]) <= 31) return true;
      if (hostname === '169.254.169.254') return true;

      return false;
    } catch {
      return false;
    }
  }

  private matchesAny(hostname: string, allowlist: string[]): boolean {
    return allowlist.some(allowed => {
      if (allowed === hostname) return true;
      if (allowed.startsWith('*')) {
        const suffix = allowed.slice(1);
        return hostname.endsWith(suffix);
      }
      if (allowed.startsWith('.')) {
        return hostname === allowed.slice(1) || hostname.endsWith(allowed);
      }
      return false;
    });
  }
}
