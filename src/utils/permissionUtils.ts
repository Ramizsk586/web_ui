import { CoderPermissionMode } from '../types';

const SAFE_COMMANDS = new Set([
  'ls', 'dir', 'cd', 'mkdir', 'pwd', 'cat', 'type', 'echo',
  'grep', 'findstr', 'head', 'tail', 'wc', 'sort', 'diff',
  'which', 'where', 'whoami', 'date', 'alias', 'history',
  'man', 'help', 'clear', 'cls', 'touch', 'ping',
]);
const DANGEROUS_COMMANDS = new Set([
  'rm', 'rmdir', 'del', 'erase', 'unlink', 'remove-item', 'rd',
  'sudo', 'su', 'chmod', 'chown', 'mkfs', 'format', 'diskpart',
  'shutdown', 'reboot', 'reg', 'taskkill', 'kill',
  'cp', 'copy', 'mv', 'move', 'rename-item',
]);

const DANGEROUS_PATTERNS = [
  /\brm\s+-(?:[rRfF]+)\b/i,
  /\bremove-item\b[\s\S]*\s-(?:recurse|force)\b/i,
  /\bdel(?:ete)?\b[\s\S]*\/[sq]\b/i,
  /\bcp\s+-(?:[rRfF]+)\b/i,
  /\bmv\s+-[fF]\b/i,
  />\s*[^>]/,
  /\|\s*(?:sh|bash|powershell|pwsh|cmd)\b/i,
  /\b(?:curl|wget)\b[\s\S]*\|\s*(?:sh|bash|powershell|pwsh|cmd)\b/i
];

export function getCommandName(command: string) {
  const trimmed = command.trim();
  if (!trimmed) return '';
  return trimmed.split(/\s+/)[0].replace(/["']/g, '').toLowerCase();
}

export function isSafeCoderCommand(command: string) {
  const name = getCommandName(command);
  if (!SAFE_COMMANDS.has(name)) return false;
  return !DANGEROUS_PATTERNS.some(pattern => pattern.test(command));
}

export function explainCommandRestriction(command: string) {
  const name = getCommandName(command);
  if (DANGEROUS_COMMANDS.has(name)) {
    return `${name} can modify or remove files/system state.`;
  }
  if (DANGEROUS_PATTERNS.some(pattern => pattern.test(command))) {
    return 'Command contains redirection, shell piping, recursive/force flags, or another destructive pattern.';
  }
  return 'Terminal command is outside the default safe command allowlist.';
}

export function shouldRequestCommandPermission(
  command: string,
  mode: CoderPermissionMode,
  alwaysAllowedCommands: string[]
) {
  if (mode === 'full-access') return false;
  const normalized = command.trim();
  if (alwaysAllowedCommands.includes(normalized)) return false;
  if (mode === 'default' && isSafeCoderCommand(command)) return false;
  return true;
}

export function permissionModeLabel(mode: CoderPermissionMode) {
  if (mode === 'full-access') return 'Full access';
  if (mode === 'auto-review') return 'Auto-review';
  return 'Default';
}
