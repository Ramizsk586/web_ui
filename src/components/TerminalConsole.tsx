import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ElizaBot } from './elizabot';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TerminalLine {
  type: 'input' | 'output' | 'error' | 'system' | 'eliza-user' | 'eliza-bot';
  text: string;
}

interface TerminalConsoleProps {
  /** Backend base URL — defaults to same origin */
  apiBase?: string;
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

// ─── Component ────────────────────────────────────────────────────────────────

function TerminalConsole({
  apiBase = '',           // e.g. 'http://localhost:3001' or '' for same-origin
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
        const res  = await fetch(`${apiBase}/api/terminal/session`);
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
          { type: 'system', text: 'Type "help" for examples, or "eliza" to launch the AI therapist CLI.' },
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const executeCommand = useCallback(async (cmdLine: string) => {
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

    addLines([{ type: 'input', text: `${promptLabel}$ ${trimmed}` }]);
    setHistory(h => [...h, trimmed]);
    setHistoryIndex(-1);

    const firstWord = trimmed.split(/\s+/)[0].toLowerCase();

    // ── Client-side built-ins ───────────────────────────────────────────────

    if (firstWord === 'eliza') { toggleEliza(); return; }

    if (['clear', 'cls', 'clear-host'].includes(firstWord)) { clear(); return; }

    if (firstWord === 'help') {
      addLines([
        { type: 'output', text: '⚡ Lumina Real Shell — commands go straight to your OS.' },
        { type: 'output', text: '' },
        { type: 'output', text: 'Examples:' },
        { type: 'output', text: '  [Linux/macOS]   ls -la · pwd · cat file.txt · uname -a · top -bn1' },
        { type: 'output', text: '  [Windows PS]    Get-ChildItem · $env:PATH · Get-Process · ipconfig' },
        { type: 'output', text: '  [Windows CMD]   dir · ver · systeminfo · type file.txt' },
        { type: 'output', text: '  [Universal]     git log --oneline · node -v · python3 --version' },
        { type: 'output', text: '  [Navigation]    cd .. · cd ~/Documents · pwd' },
        { type: 'output', text: '' },
        { type: 'output', text: 'Built-ins:' },
        { type: 'output', text: '  clear / cls     Clear screen' },
        { type: 'output', text: '  history         Show command history' },
        { type: 'output', text: '  eliza           Launch ELIZA therapist CLI' },
      ]);
      return;
    }

    if (firstWord === 'history') {
      const histList = history.map((cmd, i) => `  ${String(i + 1).padStart(3)}  ${cmd}`);
      addLines(histList.map(l => ({ type: 'output' as const, text: l })));
      return;
    }

    // ── Backend execution ───────────────────────────────────────────────────

    if (!sessionId) {
      addLines([{ type: 'error', text: 'Not connected to terminal server. Reload the page.' }]);
      return;
    }

    setBusy(true);
    try {
      const response = await fetch(`${apiBase}/api/terminal/execute`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ command: trimmed, currentPath, sessionId }),
      });

      if (!response.ok) {
        const errMsg = await response.text();
        addLines([{ type: 'error', text: `Server error: ${errMsg}` }]);
        return;
      }

      const data = await response.json();

      // Update session ID if the server issued a new one
      if (data.sessionId && data.sessionId !== sessionId) {
        setSessionId(data.sessionId);
      }

      if (data.clear) { clear(); return; }

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
      const fsCommands = ['touch','rm','mkdir','mv','cp','new-item','remove-item','md','rd','del','npm','npx','git'];
      if (triggerRefresh && fsCommands.some(kw => firstWord.startsWith(kw))) {
        triggerRefresh();
      }

    } catch (err: any) {
      addLines([{ type: 'error', text: `Network error: ${err.message ?? err}` }]);
    } finally {
      setBusy(false);
    }
  }, [
    currentPath, sessionId, clear, history, addLines,
    triggerRefresh, elizaInstance, toggleEliza, apiBase,
  ]);

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