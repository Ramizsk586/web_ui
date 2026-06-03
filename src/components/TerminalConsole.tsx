import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ElizaBot } from './elizabot';
import { registerTerminalExecutor, unregisterTerminalExecutor, setTerminalSessionId } from '../utils/terminalService';
import type { TerminalResult } from '../utils/terminalService';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TerminalLine {
  type: 'input' | 'output' | 'error' | 'system' | 'eliza-user' | 'eliza-bot';
  text: string;
}

interface TerminalConsoleProps {
  apiBase?: string;
  workspaceRoot?: string;
  isCoderMode?: boolean;
  onToast?: (message: string) => void;
  triggerRefresh?: () => void;
  onElizaActiveChange?: (active: boolean) => void;
  elizaToggleSignal?: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Strip ANSI codes for plain-text processing; keep for display. */
const ANSI_RE = /\x1b\[[0-9;]*m/g;

/** Map ANSI colour codes to CSS colour strings */
function parseAnsi(text: string): React.ReactNode[] {
  if (!text.includes('\x1b[')) return [text];
  const parts: React.ReactNode[] = [];
  const regex = /\x1b\[(\d+)m/g;
  let lastIndex = 0;
  let currentColor = '';
  let key = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(
        <span key={key++} style={{ color: currentColor || undefined }}>
          {text.slice(lastIndex, match.index)}
        </span>,
      );
    }
    const code = parseInt(match[1], 10);
    switch (code) {
      case 30: currentColor = '#000'; break;
      case 31: currentColor = '#F44336'; break;
      case 32: currentColor = '#10B981'; break;
      case 33: currentColor = '#F59E0B'; break;
      case 34: currentColor = '#3B82F6'; break;
      case 35: currentColor = '#D946EF'; break;
      case 36: currentColor = '#06B6D4'; break;
      case 37: currentColor = '#EDE6DD'; break;
      case 0:  currentColor = ''; break;
      default: currentColor = ''; break;
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    parts.push(
      <span key={key++} style={{ color: currentColor || undefined }}>
        {text.slice(lastIndex)}
      </span>,
    );
  }
  return parts;
}

// ─── Security guardrails ──────────────────────────────────────────────────────
//
// Three defence layers:
//   1. Pre-normalisation  – strip obfuscation tricks before pattern matching
//   2. DANGER_RULES       – named pattern rules, each with a label + reason
//   3. checkDangerousCommand() – orchestrates layers + rate-limit + length cap
//
// AUDIT_LOG keeps a session-scoped record of every blocked attempt.
// ─────────────────────────────────────────────────────────────────────────────

interface DangerRule {
  label:  string;
  reason: string;
  /** Receives the fully-normalised command string. */
  test:   (cmd: string) => boolean;
}

interface AuditEntry {
  ts:      number;       // Date.now()
  raw:     string;       // original input
  rules:   string[];     // matched rule labels
}

/** Session-scoped audit log of every blocked command. */
const AUDIT_LOG: AuditEntry[] = [];

// ── Rate-limit state ──────────────────────────────────────────────────────────
// More than MAX_BLOCKS blocks in WINDOW_MS → lock the input for LOCKOUT_MS.
const RATE_LIMIT = { MAX_BLOCKS: 5, WINDOW_MS: 30_000, LOCKOUT_MS: 60_000 };
let lockedUntil = 0;

// ── Layer 1 — Obfuscation normaliser ─────────────────────────────────────────

/**
 * Strip / expand common obfuscation tricks so rules don't need to
 * handle every variant:
 *
 *  • $'...' ANSI-C quoting  →  content decoded
 *  • base64 -d payloads     →  replaced with a sentinel the rules can catch
 *  • eval / exec wrappers   →  kept but collapsed to single spaces
 *  • \\ backslash splits    →  removed (e.g. r\m  →  rm)
 *  • repeated whitespace    →  collapsed
 *  • unicode look-alikes    →  mapped to ASCII equivalents
 */
function deobfuscate(raw: string): string {
  let s = raw;

  // Unicode homoglyph → ASCII (covers some common substitutions)
  const HOMOGLYPHS: Record<string, string> = {
    '／': '/', '＼': '\\', '－': '-', '＊': '*', '｜': '|',
    '＆': '&', '＞': '>',  '＜': '<',  'ｒｍ': 'rm',
  };
  for (const [g, a] of Object.entries(HOMOGLYPHS)) s = s.replaceAll(g, a);

  // Remove backslash line-continuation splits used to hide commands (r\m → rm)
  s = s.replace(/\\(?!\n)/g, '');

  // $'...' ANSI-C quoting – just drop the quotes wrapper; content stays
  s = s.replace(/\$'([^']*)'/g, '$1');

  // base64 decode attempts – replace payload with sentinel
  s = s.replace(/(base64\s+-d|base64\s+--decode)/gi, '__BASE64_DECODE__');

  // Collapse all whitespace
  s = s.replace(/\s+/g, ' ').trim();

  return s.toLowerCase();
}

// ── Layer 2 — Danger rules ────────────────────────────────────────────────────

const DANGER_RULES: DangerRule[] = [

  // ── Filesystem nukes ─────────────────────────────────────────────────────
  {
    label:  'Recursive root delete',
    reason: 'Deletes every file on the system – unrecoverable.',
    test:   c => /rm\s+(-\S*f\S*|-\S*r\S*){1,}\s+.*\/(["']?\s*["']?)?$/.test(c)
              || /rm\s+(-rf|-fr|-r\s+-f|-f\s+-r)\s+(\/|~\/?)\s*$/.test(c)
              || /rm\s+(-rf|-fr)\s+(\/|~\/?)/.test(c),
  },
  {
    label:  'Wildcard wipe',
    reason: 'Mass-deletes files matching an unbounded glob.',
    test:   c => /rm\s+(-\S*[rf]\S*\s+){0,}[\*\.]{1,2}\s*$/.test(c),
  },
  {
    label:  'Fork bomb',
    reason: 'Exhausts process table, crashing the OS.',
    test:   c => /:\(\)\{.*:\|:&.*\};:/.test(c.replace(/\s/g,''))
              || c.includes(':(){ :|:& };:'),
  },
  {
    label:  'Truncate system files',
    reason: 'Silently empties critical files without deleting them.',
    test:   c => />\s*(\/etc\/(passwd|shadow|fstab|hosts|sudoers)|\/boot\/)/.test(c),
  },
  {
    label:  'Find-and-delete all',
    reason: 'find -delete on / or ~ removes the entire filesystem.',
    test:   c => /find\s+(\/|~|\.\.)\s+.*-delete/.test(c),
  },

  // ── Disk / device destruction ─────────────────────────────────────────────
  {
    label:  'Overwrite raw device',
    reason: 'Destroys the entire disk or partition at block level.',
    test:   c => /\b(dd|mkfs|shred|wipefs|blkdiscard)\b/.test(c)
              && /\/dev\/(sd|hd|nvme|xvd|vd|disk|loop)/.test(c),
  },
  {
    label:  'Wipe disk with /dev/zero or /dev/urandom',
    reason: 'Irreversibly zeroes or randomises disk contents.',
    test:   c => /if=\/dev\/(zero|urandom|null).*of=\/dev\//.test(c),
  },

  // ── System file tampering ─────────────────────────────────────────────────
  {
    label:  'Overwrite /etc/passwd or /etc/shadow',
    reason: 'Corrupts the authentication database, locking everyone out.',
    test:   c => /(>|tee)\s*\/etc\/(passwd|shadow|sudoers|hosts|fstab|crontab|ssh\/)/.test(c),
  },
  {
    label:  'Overwrite boot / kernel files',
    reason: 'Bricks the system on next reboot.',
    test:   c => /(>|tee|mv|cp)\s*(\/boot\/|\/vmlinuz|\/initrd|\/grub\/)/.test(c),
  },
  {
    label:  'LD_PRELOAD / library injection',
    reason: 'Hijacks the dynamic linker to intercept all process calls.',
    test:   c => /ld_preload\s*=/.test(c) || /ld_library_path\s*=.*\/tmp/.test(c),
  },

  // ── Privilege escalation ──────────────────────────────────────────────────
  {
    label:  'Chmod 777 system directories',
    reason: 'Opens critical OS directories to world-write access.',
    test:   c => /chmod\s+(-r\s+)?[0-7]*7[0-7]{2}\s+(\/etc|\/usr|\/bin|\/sbin|\/lib|\/root|\/boot)/.test(c),
  },
  {
    label:  'Add rogue sudoers entry',
    reason: 'Grants unrestricted root access to any user.',
    test:   c => /echo.*all.*nopasswd.*>>\s*\/etc\/sudoers/.test(c.replace(/\s+/g,' ')),
  },
  {
    label:  'SUID bit on shell',
    reason: 'Creates a setuid shell that gives any user instant root.',
    test:   c => /chmod\s+.*[u+]*s.*(bash|sh|dash|zsh|fish)/.test(c)
              || /chmod\s+[0-7]*[46][0-9]{3}\s+.*(bash|sh)/.test(c),
  },
  {
    label:  'Passwd / useradd abuse',
    reason: 'Creates or modifies system users, potentially granting root.',
    test:   c => /\b(useradd|adduser|usermod)\b.*(-G\s*sudo|-g\s*0|-u\s*0)/.test(c),
  },
  {
    label:  'SSH authorized_keys injection',
    reason: 'Injects a rogue SSH public key for persistent remote access.',
    test:   c => /(>>|tee)\s*.*\.ssh\/authorized_keys/.test(c)
              || /curl.*>>\s*.*authorized_keys/.test(c),
  },

  // ── Reverse shells / RATs ─────────────────────────────────────────────────
  {
    label:  'Bash reverse shell',
    reason: 'Opens an outbound bash shell to an attacker-controlled host.',
    test:   c => /bash\s+-i\s+>&?\s*\/dev\/tcp\//.test(c),
  },
  {
    label:  'Netcat reverse / bind shell',
    reason: 'Uses netcat to expose an interactive shell over the network.',
    test:   c => /nc\b.*-e\s*(\/bin\/(ba)?sh|cmd|powershell)/.test(c)
              || /ncat\b.*--exec\s+(\/bin\/(ba)?sh)/.test(c),
  },
  {
    label:  'Python / Perl / Ruby reverse shell',
    reason: 'Spawns a scripted reverse shell over a raw socket.',
    test:   c => /(python|perl|ruby)\S*\s+.*socket.*exec.*sh/.test(c)
              || /python\S*\s+-c.*subprocess.*shell=true.*connect/.test(c),
  },
  {
    label:  'Fifo / named-pipe shell',
    reason: 'Creates a named pipe to pass commands to a shell process.',
    test:   c => /mkfifo.*nc.*sh/.test(c) || /mknod.*nc.*(ba)?sh/.test(c),
  },
  {
    label:  'Socat shell relay',
    reason: 'Uses socat to relay a full PTY shell to a remote host.',
    test:   c => /socat\b.*exec.*sh/.test(c) || /socat\b.*pty.*connect/.test(c),
  },
  {
    label:  'Telnet reverse shell',
    reason: 'Sends shell I/O over a cleartext telnet connection.',
    test:   c => /telnet\b.*\|\s*(ba)?sh/.test(c)
              || /\/dev\/tcp\/.*telnet/.test(c),
  },

  // ── Remote code execution ─────────────────────────────────────────────────
  {
    label:  'Curl/Wget pipe to shell',
    reason: 'Executes arbitrary remote code downloaded on the fly.',
    test:   c => /(curl|wget)\s+\S+.*\|\s*(ba)?sh/.test(c)
              || /(curl|wget)\s+.*-o\s*\/tmp\/.*&&?\s*(ba)?sh/.test(c),
  },
  {
    label:  'Base64-encoded payload',
    reason: 'Likely obfuscates a command to hide it from scanners.',
    test:   c => /__base64_decode__/.test(c)
              || /echo\s+[a-z0-9+/]{20,}={0,2}\s*\|\s*(base64|openssl)/.test(c),
  },
  {
    label:  'eval of dynamic content',
    reason: 'eval on external input executes arbitrary injected commands.',
    test:   c => /\beval\s+\$\(/.test(c)
              || /\beval\s+`/.test(c)
              || /\beval\s+"?\$\{/.test(c),
  },
  {
    label:  'Python exec / compile injection',
    reason: 'Executes a dynamically built string as Python code.',
    test:   c => /python\S*\s+-c.*exec\s*\(/.test(c)
              || /python\S*\s+-c.*compile\s*\(/.test(c),
  },

  // ── Data exfiltration ─────────────────────────────────────────────────────
  {
    label:  'Sensitive file exposure',
    reason: 'Reads private keys, credentials, or secrets to the terminal.',
    test:   c => /(cat|more|less|bat|head|tail|strings|xxd|od)\s+.*\/(\.ssh\/(id_|known|auth)|\.gnupg\/|\.env|secrets?|credentials?|\.netrc|\.pgpass)/.test(c),
  },
  {
    label:  'Exfiltrate /etc/shadow via network',
    reason: 'Sends the hashed-password file to an external server.',
    test:   c => /(cat|nc|curl|wget)\s+.*\/etc\/shadow/.test(c),
  },
  {
    label:  'Mass data send via curl/wget',
    reason: 'Pipes a large read (find, tar, dd) outbound via HTTP.',
    test:   c => /(tar|find|dd)\b.*\|\s*(curl|wget|nc)\b/.test(c),
  },

  // ── Persistence / cron poisoning ─────────────────────────────────────────
  {
    label:  'Crontab destruction or mass injection',
    reason: 'Removes or overwrites scheduled tasks, planting persistence.',
    test:   c => /crontab\s+-r/.test(c) || /(echo|printf).*>>\s*\/etc\/cron/.test(c),
  },
  {
    label:  'Systemd unit injection',
    reason: 'Installs a malicious systemd service that survives reboots.',
    test:   c => /(echo|tee|cp|mv)\s+.*\.(service|timer|socket)\s+.*(\/etc\/systemd|\/usr\/lib\/systemd)/.test(c),
  },
  {
    label:  'Bashrc / profile backdoor',
    reason: 'Appends commands to shell startup files for persistent execution.',
    test:   c => /(echo|printf)\s+.*>>\s*~?\/?\.?(bashrc|bash_profile|profile|zshrc|zprofile)/.test(c),
  },

  // ── Crypto-miners & malware ───────────────────────────────────────────────
  {
    label:  'Crypto-miner binary',
    reason: 'Downloads or executes a cryptocurrency miner.',
    test:   c => /(xmrig|minerd|cpuminer|ethminer|cgminer|bfgminer|t-rex|lolminer|nbminer)/.test(c),
  },

  // ── Kernel / memory tampering ─────────────────────────────────────────────
  {
    label:  'Kernel module injection',
    reason: 'Loads an arbitrary kernel module, enabling rootkits.',
    test:   c => /\b(insmod|modprobe)\b/.test(c) && /\.ko\b/.test(c),
  },
  {
    label:  'Direct /dev/mem or /dev/kmem write',
    reason: 'Writes directly to physical or kernel memory.',
    test:   c => /(>|dd.*of=)\s*\/dev\/(k?mem|port)/.test(c),
  },
  {
    label:  'sysctl kernel hardening disable',
    reason: 'Turns off kernel security features like ASLR or ptrace protection.',
    test:   c => /sysctl\s+(-w\s+)?kernel\.(randomize_va_space|yama\.ptrace_scope|perf_event_paranoid)\s*=\s*0/.test(c),
  },

  // ── Shutdown / resource exhaustion ───────────────────────────────────────
  {
    label:  'Forced shutdown / reboot',
    reason: 'Immediately halts the system without saving work.',
    test:   c => /^\s*(shutdown|reboot|halt|poweroff|init\s+[06])\b/.test(c)
              && !c.includes('--help') && !c.includes(' -h'),
  },
  {
    label:  'Disk quota fill',
    reason: 'Fills the disk to 100 %, causing system instability.',
    test:   c => /dd\s+if=\/dev\/zero\s+of=\S+.*bs=.*count=/.test(c)
              || /fallocate\s+-l\s+\d+(g|t)\b/.test(c),
  },
  {
    label:  'ulimit resource removal',
    reason: 'Removes OS limits on processes, memory, or open files.',
    test:   c => /ulimit\s+(-[snufdv]|\s+unlimited)/.test(c),
  },

  // ── Package-manager abuse ─────────────────────────────────────────────────
  {
    label:  'pip install from URL/VCS',
    reason: 'Installs an unvetted package directly from a remote source.',
    test:   c => /pip\S*\s+install\s+.*(git\+|https?:\/\/|svn\+|hg\+)/.test(c),
  },
  {
    label:  'npm / yarn install from git or tar',
    reason: 'Installs an unvetted package from an arbitrary git URL or tarball.',
    test:   c => /\b(npm|yarn|pnpm)\s+install\s+.*(git\+|https?:\/\/\S+\.tgz|file:.*)/.test(c),
  },

  // ── Environment variable hijacking ────────────────────────────────────────
  {
    label:  'PATH hijacking',
    reason: 'Prepends /tmp or . to PATH, enabling command-substitution attacks.',
    test:   c => /\bpath\s*=\s*(\/tmp|\.:|\.\/|~\/tmp)/.test(c),
  },
  {
    label:  'PYTHONPATH / NODE_PATH injection',
    reason: 'Redirects Python or Node module resolution to an untrusted path.',
    test:   c => /(pythonpath|node_path|rubylib)\s*=\s*(\/tmp|\.:|\.\/|~\/tmp)/.test(c),
  },

  // ── Shell injection via compound operators ────────────────────────────────
  {
    label:  'Command injection via semicolon / &&',
    reason: 'Chains an innocuous command with a destructive one to bypass filters.',
    test:   c => {
      // Look for a dangerous secondary command after ; && || |
      const parts = c.split(/[;&|]+/);
      if (parts.length < 2) return false;
      const secondary = parts.slice(1).join(' ');
      return /\b(rm\s+-rf|dd\s+if|mkfs|curl.*\|\s*(ba)?sh|wget.*\|\s*(ba)?sh)\b/.test(secondary);
    },
  },

  // ── Windows-specific destructive commands ────────────────────────────────
  {
    label:  'Windows format / diskpart',
    reason: 'Formats or repartitions a drive, wiping all data.',
    test:   c => /\b(format\s+[a-z]:|diskpart)\b/.test(c),
  },
  {
    label:  'Windows registry nuke',
    reason: 'Deletes or overwrites critical registry hives.',
    test:   c => /reg\s+(delete|add)\s+hk(lm|cu)\\system/.test(c),
  },
  {
    label:  'Windows shadow copy deletion',
    reason: 'Destroys VSS snapshots used for system restore.',
    test:   c => /vssadmin\s+delete\s+shadows/.test(c)
              || /wmic\s+shadowcopy\s+delete/.test(c)
              || /bcdedit\s+\/set\s+.*bootstatuspolicy/.test(c),
  },
  {
    label:  'PowerShell execution-policy bypass',
    reason: 'Overrides system script-execution restrictions.',
    test:   c => /powershell\s+.*-exec(utionpolicy)?\s+(bypass|unrestricted)/.test(c),
  },
];

// ── Layer 3 — Orchestrator ────────────────────────────────────────────────────

/** Hard limits applied before pattern matching. */
const CMD_MAX_LENGTH = 2048;   // characters
const CMD_MAX_PIPES  = 10;     // pipe / chain segments

interface GuardrailResult {
  blocked:    boolean;
  reasons:    DangerRule[];
  rateLocked: boolean;
  tooLong:    boolean;
  tooManyOps: boolean;
}

/**
 * Run all security checks against one command string.
 *
 * Mutates AUDIT_LOG and lockedUntil as side-effects when blocking.
 */
function checkDangerousCommand(rawCmd: string): GuardrailResult {
  const now = Date.now();

  // Rate-lock check
  if (now < lockedUntil) {
    return { blocked: true, reasons: [], rateLocked: true, tooLong: false, tooManyOps: false };
  }

  const tooLong    = rawCmd.length > CMD_MAX_LENGTH;
  const pipeCount  = (rawCmd.match(/[|;&]/g) ?? []).length;
  const tooManyOps = pipeCount > CMD_MAX_PIPES;

  const normalised = deobfuscate(rawCmd);
  const matched    = DANGER_RULES.filter(r => r.test(normalised));

  const blocked = tooLong || tooManyOps || matched.length > 0;

  if (blocked) {
    // Log the attempt
    AUDIT_LOG.push({ ts: now, raw: rawCmd, rules: matched.map(r => r.label) });

    // Rate-limit: if too many blocks in the window, engage lockout
    const windowStart = now - RATE_LIMIT.WINDOW_MS;
    const recentBlocks = AUDIT_LOG.filter(e => e.ts >= windowStart).length;
    if (recentBlocks >= RATE_LIMIT.MAX_BLOCKS) {
      lockedUntil = now + RATE_LIMIT.LOCKOUT_MS;
    }
  }

  return { blocked, reasons: matched, rateLocked: false, tooLong, tooManyOps };
}

/** Returns the full audit log (read-only copy). */
function getAuditLog(): Readonly<AuditEntry[]> { return [...AUDIT_LOG]; }

// ─── Component ────────────────────────────────────────────────────────────────

function TerminalConsole({
  apiBase = '',           // e.g. 'http://localhost:3001' or '' for same-origin
  workspaceRoot,
  isCoderMode = false,
  onToast,
  triggerRefresh,
  onElizaActiveChange,
  elizaToggleSignal,
}: TerminalConsoleProps) {

  // ── State ──────────────────────────────────────────────────────────────────

  const [lines, setLines] = useState<TerminalLine[]>([
    { type: 'system', text: '⚡ Connecting to Lumina Shell…' },
  ]);
  const [input, setInput]         = useState('');
  const [currentPath, setCurrentPath] = useState('.');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [platform, setPlatform]   = useState<string>('');
  const [username, setUsername]   = useState<string>('user');
  const [hostname, setHostname]   = useState<string>('localhost');
  const [shellName, setShellName] = useState<string>('sh');
  const [history, setHistory]     = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [savedInput, setSavedInput] = useState('');
  const [elizaInstance, setElizaInstance] = useState<ElizaBot | null>(null);
  const [busy, setBusy]           = useState(false);         // waiting for backend

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);
  const prevToggleSignal = useRef(elizaToggleSignal);
  const lastElizaActive  = useRef(false);

  // ── Auto-scroll ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines]);

  // ── Notify parent about Eliza state changes ────────────────────────────────

  useEffect(() => {
    const active = !!elizaInstance;
    if (onElizaActiveChange && active !== lastElizaActive.current) {
      lastElizaActive.current = active;
      onElizaActiveChange(active);
    }
  }, [elizaInstance, onElizaActiveChange]);

  // ── Helper: append lines ───────────────────────────────────────────────────

  const addLines = useCallback((newLines: TerminalLine[]) => {
    setLines(prev => [...prev, ...newLines]);
  }, []);

  const clear = useCallback(() => setLines([]), []);

  // ── Initialise session with backend ───────────────────────────────────────

  useEffect(() => {
    (async () => {
      try {
        const params = new URLSearchParams();
        if (workspaceRoot) params.set('workspaceRoot', workspaceRoot);
        if (isCoderMode) params.set('isCoderMode', 'true');
        const suffix = params.toString() ? `?${params.toString()}` : '';
        const res  = await fetch(`${apiBase}/api/terminal/session${suffix}`);
        const data = await res.json();
        setSessionId(data.sessionId);
        setCurrentPath(data.currentPath ?? '.');
        setPlatform(data.platform ?? '');
        setUsername(data.username ?? 'user');
        setHostname(data.hostname ?? 'localhost');
        setShellName(data.shell ?? 'sh');

        setLines([
          { type: 'system', text: `⚡ Lumina Shell — ${data.platform} / ${data.shell}` },
          { type: 'system', text: `   ${data.username}@${data.hostname}  cwd: ${data.cwd}` },
          { type: 'system', text: 'Unix commands (ls, grep, cat, etc.) work. Type "help" for examples, or "eliza" for AI therapist.' },
          { type: 'output', text: '' },
        ]);
      } catch {
        setLines([
          { type: 'error',  text: '⚠  Cannot reach terminal server.' },
          { type: 'error',  text: `   Expected: ${apiBase || window.location.origin}/api/terminal/session` },
          { type: 'system', text: 'Start the backend with: node server.js' },
          { type: 'output', text: '' },
        ]);
      }
    })();
  }, [apiBase, isCoderMode, workspaceRoot]);

  // ── Eliza toggle ───────────────────────────────────────────────────────────

  const toggleEliza = useCallback(() => {
    if (elizaInstance) {
      const goodbye = elizaInstance.getFinal();
      addLines([
        { type: 'eliza-bot', text: goodbye },
        { type: 'system',    text: '⚡ ELIZA session ended. Returned to shell.' },
      ]);
      setElizaInstance(null);
    } else {
      const eliza   = new ElizaBot();
      const initial = eliza.getInitial();
      setElizaInstance(eliza);
      addLines([
        { type: 'system', text: '⚡ Initialising ELIZA offline AI CLI…' },
        { type: 'output', text: '' },
        { type: 'output', text: '  \x1b[35mEEEEEE  LL      IIII  ZZZZZZZ  AAAAA\x1b[0m' },
        { type: 'output', text: '  \x1b[35mEE      LL       II      ZZ   AA   AA\x1b[0m' },
        { type: 'output', text: '  \x1b[35mEEEEE   LL       II     ZZZ   AAAAAAA\x1b[0m' },
        { type: 'output', text: '  \x1b[35mEE      LL       II    ZZ     AA   AA\x1b[0m' },
        { type: 'output', text: '  \x1b[35mEEEEEE  LLLLLL  IIII  ZZZZZZZ AA   AA\x1b[0m' },
        { type: 'output', text: '' },
        { type: 'output', text: '\x1b[36mEliza is an offline Rogerian psychotherapist chatbot.\x1b[0m' },
        { type: 'output', text: 'Original: Joseph Weizenbaum 1966 · This implementation: Norbert Landsteiner 2005.' },
        { type: 'output', text: '\x1b[33mType "exit" or "quit" to return to shell.\x1b[0m' },
        { type: 'output', text: '' },
        { type: 'eliza-bot', text: initial },
      ]);
    }
  }, [elizaInstance, addLines]);

  // External toggle signal
  useEffect(() => {
    if (elizaToggleSignal !== undefined && elizaToggleSignal !== prevToggleSignal.current) {
      prevToggleSignal.current = elizaToggleSignal;
      toggleEliza();
    }
  }, [elizaToggleSignal, toggleEliza]);

  // ── Command execution ──────────────────────────────────────────────────────

  const executeCommand = useCallback(async (cmdLine: string, _fromExternal?: boolean): Promise<TerminalResult | void> => {
    const trimmed = cmdLine.trim();

    // ── Eliza mode ──────────────────────────────────────────────────────────
    if (elizaInstance) {
      if (!trimmed) {
        addLines([
          { type: 'eliza-user', text: '' },
          { type: 'eliza-bot',  text: 'Please say something.' },
        ]);
        return;
      }
      addLines([{ type: 'eliza-user', text: trimmed }]);
      setHistory(h => [...h, trimmed]);
      setHistoryIndex(-1);

      const reply = elizaInstance.transform(trimmed);
      if (elizaInstance.quit) {
        addLines([
          { type: 'eliza-bot', text: reply },
          { type: 'system',    text: '⚡ Session ended.' },
        ]);
        setElizaInstance(null);
        return;
      }
      addLines([{ type: 'eliza-bot', text: reply }]);
      return;
    }

    // ── Shell mode ──────────────────────────────────────────────────────────
    const promptLabel = `${currentPath === '.' ? '~' : currentPath}`;

    if (!trimmed) {
      addLines([{ type: 'input', text: `${promptLabel}$ ` }]);
      return;
    }

    // Show AI-prefixed prompt when command comes from the AI
    if (_fromExternal) {
      addLines([{ type: 'system', text: `🤖 AI runs: ${trimmed}` }]);
    } else {
      addLines([{ type: 'input', text: `${promptLabel}$ ${trimmed}` }]);
    }
    setHistory(h => [...h, trimmed]);
    setHistoryIndex(-1);

    const firstWord = trimmed.split(/\s+/)[0].toLowerCase();

    // Prevent interactive CLI processes that would hang the background spawn process
    const LOWER_CMD = trimmed.toLowerCase();
    const BLOCKED_CLIS = ['opencode', 'claude', 'poolside', 'cline', 'aider', 'gptengineer', 'gpt-engineer', 'devin'];
    if (BLOCKED_CLIS.some(cli => LOWER_CMD.includes(cli))) {
      const msg = '✖  Command blocked: Interactive Terminal CLIs are disabled.';
      addLines([
        { type: 'error', text: msg },
        { type: 'system', text: '   Lumina restricts launching external AI interactive CLI environments (like Claude, OpenCode, PoolSide, Cline etc.) to prevent workspace connection freezes.' }
      ]);
      if (_fromExternal) return { stdout: '', stderr: msg + '\n', exitCode: 1, sessionId: sessionId || '', newPath: currentPath };
      return;
    }

    // ── Security guardrails ─────────────────────────────────────────────────

    const guard = checkDangerousCommand(trimmed);

    if (guard.rateLocked) {
      const remaining = Math.ceil((lockedUntil - Date.now()) / 1000);
      const msg = `🔒  INPUT LOCKED — too many blocked attempts. Try again in ${remaining}s.`;
      addLines([{ type: 'error', text: msg }]);
      if (_fromExternal) return { stdout: '', stderr: msg + '\n', exitCode: 1, sessionId: sessionId || '', newPath: currentPath };
      return;
    }

    if (guard.tooLong) {
      const msg = `🛑  BLOCKED — command exceeds ${CMD_MAX_LENGTH} character limit (got ${trimmed.length}).`;
      addLines([{ type: 'error', text: msg }, { type: 'system', text: '   Overly long commands are a common injection vector. Break it into smaller steps.' }]);
      if (_fromExternal) return { stdout: '', stderr: msg + '\n', exitCode: 1, sessionId: sessionId || '', newPath: currentPath };
      return;
    }

    if (guard.tooManyOps) {
      const msg = `🛑  BLOCKED — command has too many pipe/chain operators (max ${CMD_MAX_PIPES}).`;
      addLines([{ type: 'error', text: msg }, { type: 'system', text: '   Deeply chained pipelines can be used to smuggle dangerous sub-commands.' }]);
      if (_fromExternal) return { stdout: '', stderr: msg + '\n', exitCode: 1, sessionId: sessionId || '', newPath: currentPath };
      return;
    }

    if (guard.blocked && guard.reasons.length > 0) {
      const n      = guard.reasons.length;
      const header = `🛑  BLOCKED — ${n} dangerous pattern${n > 1 ? 's' : ''} detected:`;
      const detail = guard.reasons.map(d => `   • [${d.label}] ${d.reason}`);
      const footer = '   Command NOT executed. Remove the dangerous part and try again.';
      addLines([
        { type: 'error',  text: header },
        ...detail.map(t => ({ type: 'error' as const, text: t })),
        { type: 'system', text: footer },
      ]);
      if (_fromExternal) return { stdout: '', stderr: [header, ...detail].join('\n') + '\n', exitCode: 1, sessionId: sessionId || '', newPath: currentPath };
      return;
    }

    // ── Client-side built-ins ───────────────────────────────────────────────

    if (firstWord === 'eliza') { toggleEliza(); return; }

    if (['clear', 'cls', 'clear-host'].includes(firstWord)) { clear(); if (_fromExternal) return { stdout: '', stderr: '', exitCode: 0, sessionId: sessionId || '', newPath: currentPath }; return; }

    if (firstWord === 'help') {
      addLines([
        { type: 'output', text: '⚡ Lumina Real Shell — cross-platform commands.' },
        { type: 'output', text: '' },
        { type: 'output', text: 'Examples (Linux/macOS commands work on all platforms):' },
        { type: 'output', text: '  ls -la · cat file.txt · cp -r src dst · rm -rf dir' },
        { type: 'output', text: '  grep pattern file.txt · ps aux · which node · head -n 5' },
        { type: 'output', text: '  cd .. · pwd · mkdir newdir · touch newfile.txt' },
        { type: 'output', text: '  git log --oneline · node -v · python3 --version' },
        { type: 'output', text: '' },
        { type: 'output', text: 'Built-ins:' },
        { type: 'output', text: '  clear / cls     Clear screen' },
        { type: 'output', text: '  history         Show command history' },
        { type: 'output', text: '  audit           Show security-blocked command log' },
        { type: 'output', text: '  eliza           Launch ELIZA therapist CLI' },
      ]);
      if (_fromExternal) return { stdout: '', stderr: '', exitCode: 0, sessionId: sessionId || '', newPath: currentPath };
      return;
    }

    if (firstWord === 'history') {
      const histList = history.map((cmd, i) => `  ${String(i + 1).padStart(3)}  ${cmd}`);
      addLines(histList.map(l => ({ type: 'output' as const, text: l })));
      if (_fromExternal) return { stdout: histList.join('\n') + '\n', stderr: '', exitCode: 0, sessionId: sessionId || '', newPath: currentPath };
      return;
    }

    if (firstWord === 'audit') {
      const log = getAuditLog();
      if (log.length === 0) {
        addLines([{ type: 'system', text: '✔  No blocked commands this session.' }]);
      } else {
        addLines([
          { type: 'system', text: `🔎  Security audit log — ${log.length} blocked attempt${log.length > 1 ? 's' : ''}:` },
          ...log.map((e, i) => ({
            type: 'error' as const,
            text: `  ${String(i + 1).padStart(3)}  [${new Date(e.ts).toLocaleTimeString()}]  ${e.raw.slice(0, 80)}${e.raw.length > 80 ? '…' : ''}  →  ${e.rules.join(', ') || 'limit exceeded'}`,
          })),
        ]);
      }
      if (_fromExternal) return { stdout: '', stderr: '', exitCode: 0, sessionId: sessionId || '', newPath: currentPath };
      return;
    }

    // ── Backend execution ───────────────────────────────────────────────────

    if (!sessionId) {
      const msg = 'Not connected to terminal server. Reload the page.';
      addLines([{ type: 'error', text: msg }]);
      if (_fromExternal) return { stdout: '', stderr: msg + '\n', exitCode: 1, sessionId: '', newPath: currentPath };
      return;
    }

    setBusy(true);
    try {
      const response = await fetch(`${apiBase}/api/terminal/execute`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ command: trimmed, currentPath, sessionId, workspaceRoot, isCoderMode }),
      });

      if (!response.ok) {
        const errMsg = await response.text();
        addLines([{ type: 'error', text: `Server error: ${errMsg}` }]);
        if (_fromExternal) return { stdout: '', stderr: `Server error: ${errMsg}\n`, exitCode: 1, sessionId: sessionId || '', newPath: currentPath };
        return;
      }

      const data = await response.json();

      // Update session ID if the server issued a new one
      if (data.sessionId && data.sessionId !== sessionId) {
        setSessionId(data.sessionId);
      }

      if (data.clear) { clear(); if (_fromExternal) return { stdout: '', stderr: '', exitCode: 0, sessionId: data.sessionId || sessionId || '', newPath: data.newPath || currentPath }; return; }

      if (data.newPath !== undefined) {
        setCurrentPath(data.newPath);
      }

      if (data.stdout) {
        const outLines = data.stdout.split('\n');
        if (outLines.at(-1) === '') outLines.pop();
        addLines(outLines.map((l: string) => ({ type: 'output' as const, text: l })));
      }

      if (data.stderr) {
        const errLines = data.stderr.split('\n');
        if (errLines.at(-1) === '') errLines.pop();
        addLines(errLines.map((l: string) => ({ type: 'error' as const, text: l })));
      }

      // Trigger file-tree refresh after file-system-mutating commands
      const fsCommands = ['touch','rm','mkdir','mv','cp','new-item','remove-item','md','rd','del','npm','npx','git','copy-item','move-item','remove-item','new-item','get-childitem'];
      if (triggerRefresh && fsCommands.some(kw => firstWord.startsWith(kw))) {
        triggerRefresh();
      }

      if (_fromExternal) {
        return { stdout: data.stdout || '', stderr: data.stderr || '', exitCode: data.exitCode ?? 0, sessionId: data.sessionId || sessionId || '', newPath: data.newPath || currentPath };
      }

    } catch (err: any) {
      const msg = `Network error: ${err.message ?? err}`;
      addLines([{ type: 'error', text: msg }]);
      if (_fromExternal) return { stdout: '', stderr: msg + '\n', exitCode: 1, sessionId: sessionId || '', newPath: currentPath };
    } finally {
      setBusy(false);
    }
  }, [
    currentPath, sessionId, clear, history, addLines,
    triggerRefresh, elizaInstance, toggleEliza, apiBase,
  ]);

  // ── Register with terminal service for external (AI) command execution ────

  useEffect(() => {
    registerTerminalExecutor(async (command, _cwd, _extSessionId) => {
      const result = await executeCommand(command, true);
      return result as TerminalResult;
    });
    return () => unregisterTerminalExecutor();
  }, [executeCommand]);

  useEffect(() => {
    setTerminalSessionId(sessionId);
  }, [sessionId]);

  // ── Keyboard handling ──────────────────────────────────────────────────────

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (busy) return;
      executeCommand(input);
      setInput('');
      setHistoryIndex(-1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (historyIndex === -1) setSavedInput(input);
      const next = historyIndex + 1;
      if (next < history.length) {
        setHistoryIndex(next);
        setInput(history[history.length - 1 - next]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex <= 0) {
        setHistoryIndex(-1);
        setInput(savedInput);
      } else {
        const next = historyIndex - 1;
        setHistoryIndex(next);
        setInput(history[history.length - 1 - next]);
      }
    } else if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault();
      clear();
    }
  }, [input, executeCommand, history, historyIndex, savedInput, busy, clear]);

  const handleClick = useCallback(() => inputRef.current?.focus(), []);

  // ── Prompt display ─────────────────────────────────────────────────────────

  const displayPath = currentPath === '.' ? '~' : currentPath;
  const promptStr   = elizaInstance
    ? 'YOU'
    : `${username}@${hostname} ${displayPath}$`;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div
      className="flex flex-col h-full select-text bg-[#030302] border-none"
      style={{
        fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
        fontSize: '11px',
        color: '#EDE6DD',
      }}
      onClick={handleClick}
    >
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
        {lines.map((line, i) => (
          <div key={i} className="whitespace-pre-wrap break-all leading-relaxed py-0.5">

            {line.type === 'input' && (
              <span>
                <span style={{ color: '#10B981', fontWeight: 700 }}>
                  {line.text.split('$')[0]}
                </span>
                <span style={{ color: '#71717a', fontWeight: 700 }}>$</span>
                <span style={{ color: '#EDE6DD', fontWeight: 500, marginLeft: 4 }}>
                  {line.text.slice(line.text.indexOf('$') + 1).trim()}
                </span>
              </span>
            )}

            {line.type === 'output' && (
              <span style={{ color: '#BBB1A5' }}>{parseAnsi(line.text)}</span>
            )}

            {line.type === 'error' && (
              <span style={{ color: '#f87171', fontWeight: 700 }}>{line.text}</span>
            )}

            {line.type === 'system' && (
              <span
                style={{
                  display: 'block', maxWidth: 'max-content',
                  color: '#22d3ee',
                  background: 'rgba(8,145,178,0.08)',
                  border: '1px solid rgba(8,145,178,0.15)',
                  borderRadius: 4,
                  padding: '1px 8px',
                  margin: '2px 0',
                }}
              >
                {line.text}
              </span>
            )}

            {line.type === 'eliza-user' && (
              <span style={{ display: 'flex', alignItems: 'flex-start', gap: 4 }}>
                <span style={{ color: '#818cf8', fontWeight: 700, flexShrink: 0 }}>YOU:</span>
                <span style={{ color: '#c7d2fe', fontWeight: 500 }}>{line.text}</span>
              </span>
            )}

            {line.type === 'eliza-bot' && (
              <span
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 8,
                  background: 'rgba(236,72,153,0.05)',
                  border: '1px solid rgba(236,72,153,0.12)',
                  borderRadius: 8,
                  padding: '6px 12px',
                  margin: '6px 0',
                  maxWidth: 640,
                }}
              >
                <span style={{ color: '#f472b6', fontWeight: 700, flexShrink: 0 }}>ELIZA:</span>
                <span style={{ color: '#fce7f3', fontWeight: 500, lineHeight: 1.6 }}>
                  {parseAnsi(line.text)}
                </span>
              </span>
            )}
          </div>
        ))}

        {/* ── Active input row ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
          {elizaInstance ? (
            <span style={{ color: '#818cf8', fontWeight: 700, flexShrink: 0 }}>YOU:</span>
          ) : (
            <span style={{ color: busy ? '#F59E0B' : '#10B981', fontWeight: 700, flexShrink: 0, whiteSpace: 'nowrap' }}>
              {busy ? '⏳ …' : `${promptStr}`}
            </span>
          )}
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={busy}
            style={{
              flex: 1,
              background: 'transparent',
              outline: 'none',
              border: 'none',
              color: '#EDE6DD',
              fontFamily: 'inherit',
              fontSize: 'inherit',
              fontWeight: 500,
              padding: 0,
              minWidth: 0,
            }}
            autoFocus
            spellCheck={false}
            autoComplete="off"
            autoCapitalize="off"
            placeholder={
              elizaInstance
                ? "Talk to Eliza… (say 'exit' to quit)"
                : busy
                  ? 'Running…'
                  : "Enter command…"
            }
          />
        </div>
      </div>
    </div>
  );
}

export default React.memo(TerminalConsole);