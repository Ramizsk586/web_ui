import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Terminal, X, RefreshCw, Trash2, ShieldAlert, Bot } from 'lucide-react';
import { ElizaBot } from './elizabot';

interface TerminalLine {
  type: 'input' | 'output' | 'error' | 'system' | 'eliza-user' | 'eliza-bot';
  text: string;
}

interface TerminalContext {
  currentPath: string;
  setCurrentPath: (path: string) => void;
  clear: () => void;
  history: string[];
  triggerRefresh?: () => void;
}

function resolveRelativePath(curr: string, target: string): string {
  if (target === '.' || target === './') return curr;
  if (target.startsWith('/')) {
    // Treat as relative to workspace root
    target = target.substring(1);
  }
  
  const currentParts = curr === '.' ? [] : curr.split('/').filter(Boolean);
  const targetParts = target.split('/').filter(Boolean);
  
  for (const part of targetParts) {
    if (part === '..') {
      currentParts.pop();
    } else if (part !== '.') {
      currentParts.push(part);
    }
  }
  
  return currentParts.length === 0 ? '.' : currentParts.join('/');
}

interface TerminalConsoleProps {
  onToast?: (message: string) => void;
  triggerRefresh?: () => void;
  onElizaActiveChange?: (active: boolean) => void;
  elizaToggleSignal?: number;
}

export default function TerminalConsole({ 
  onToast, 
  triggerRefresh, 
  onElizaActiveChange, 
  elizaToggleSignal 
}: TerminalConsoleProps) {
  const [lines, setLines] = useState<TerminalLine[]>([
    { type: 'system', text: '⚡ Lumina Cross-Platform Shell Connected.' },
    { type: 'system', text: 'Supports PowerShell, Command Prompt, macOS, and Linux commands natively.' },
    { type: 'system', text: 'Type "help" to view reference examples, or "eliza" to start the Eliza bot CLI.' },
    { type: 'output', text: '' },
  ]);
  const [input, setInput] = useState('');
  const [currentPath, setCurrentPath] = useState('.');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [savedInput, setSavedInput] = useState('');
  const [elizaInstance, setElizaInstance] = useState<ElizaBot | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const prevToggleSignal = useRef(elizaToggleSignal);

  const lastActiveRef = useRef<boolean>(false);

  useEffect(() => {
    const isInstanceActive = !!elizaInstance;
    if (onElizaActiveChange && isInstanceActive !== lastActiveRef.current) {
      lastActiveRef.current = isInstanceActive;
      onElizaActiveChange(isInstanceActive);
    }
  }, [elizaInstance, onElizaActiveChange]);

  const toggleEliza = useCallback(() => {
    if (elizaInstance) {
      // Inline stop logic
      const goodbyeStr = elizaInstance.getFinal();
      setLines((prev) => [
        ...prev,
        { type: 'eliza-bot', text: goodbyeStr },
        { type: 'system', text: '⚡ Session terminated. Returned to Lumina Shell.' }
      ]);
      setElizaInstance(null);
    } else {
      // Inline start logic
      const eliza = new ElizaBot();
      setElizaInstance(eliza);
      const initialGreeting = eliza.getInitial();
      
      setLines((prev) => [
        ...prev,
        { type: 'system', text: '⚡ Initializing ELIZA Offline Chatbot AI CLI Environment...' },
        { type: 'output', text: 'Welcome to' },
        { type: 'output', text: '  \x1b[35mEEEEEE  LL      IIII  ZZZZZZZ  AAAAA\x1b[0m' },
        { type: 'output', text: '  \x1b[35mEE      LL       II      ZZ   AA   AA\x1b[0m' },
        { type: 'output', text: '  \x1b[35mEEEEE   LL       II     ZZZ   AAAAAAA\x1b[0m' },
        { type: 'output', text: '  \x1b[35mEE      LL       II    ZZ     AA   AA\x1b[0m' },
        { type: 'output', text: '  \x1b[35mEEEEEE  LLLLLL  IIII  ZZZZZZZ AA   AA\x1b[0m' },
        { type: 'output', text: '' },
        { type: 'output', text: '\x1b[36mEliza is an offline mock Rogerian psychotherapist chatbot.\x1b[0m' },
        { type: 'output', text: 'The original program was described by Joseph Weizenbaum in 1966.' },
        { type: 'output', text: 'This implementation is based on Norbert Landsteiner 2005.' },
        { type: 'output', text: '\x1b[33mType "exit" or "quit" to return to standard shell.\x1b[0m' },
        { type: 'output', text: '' },
        { type: 'eliza-bot', text: initialGreeting }
      ]);
    }
  }, [elizaInstance]);

  useEffect(() => {
    if (elizaToggleSignal !== undefined && elizaToggleSignal !== prevToggleSignal.current) {
      prevToggleSignal.current = elizaToggleSignal;
      toggleEliza();
    }
  }, [elizaToggleSignal, toggleEliza]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines]);

  const clear = useCallback(() => {
    setLines([]);
  }, []);



  const executeCommand = useCallback(
    async (cmdLine: string) => {
      const trimmed = cmdLine.trim();

      if (elizaInstance) {
        if (!trimmed) {
          setLines((prev) => [...prev, { type: 'eliza-user', text: '' }]);
          setLines((prev) => [...prev, { type: 'eliza-bot', text: 'Please say something.' }]);
          return;
        }

        setLines((prev) => [...prev, { type: 'eliza-user', text: trimmed }]);
        const updatedHistory = [...history, trimmed];
        setHistory(updatedHistory);
        setHistoryIndex(-1);

        const reply = elizaInstance.transform(trimmed);
        
        if (elizaInstance.quit) {
          setLines((prev) => [
            ...prev,
            { type: 'eliza-bot', text: reply },
            { type: 'system', text: '⚡ Session ended. Saved terminal history.' }
          ]);
          setElizaInstance(null);
          return;
        }

        setLines((prev) => [...prev, { type: 'eliza-bot', text: reply }]);
        return;
      }

      const promptPath = currentPath === '.' ? '~' : `./${currentPath}`;
      
      if (!trimmed) {
        setLines((prev) => [...prev, { type: 'input', text: `${promptPath}$ ` }]);
        return;
      }

      setLines((prev) => [...prev, { type: 'input', text: `${promptPath}$ ${trimmed}` }]);
      const updatedHistory = [...history, trimmed];
      setHistory(updatedHistory);
      setHistoryIndex(-1);

      const firstWord = trimmed.split(/\s+/)[0].toLowerCase();
      
      if (firstWord === 'eliza') {
        toggleEliza();
        return;
      }

      if (firstWord === 'help') {
        const helpText = [
          '⚡ Real Multi-Shell Web Terminal Console Connected.',
          'Supports PowerShell, Command Prompt (CMD), macOS, and Linux commands natively.',
          '',
          'Common Commands Examples:',
          '  [Command Prompt] : dir, cls, ver, systeminfo, cd, type index.html',
          '  [PowerShell]     : Get-ChildItem, Get-Content, Clear-Host, $PSVersionTable',
          '  [Linux/macOS]    : ls -la, pwd, cat package.json, uname -a, sw_vers, touch, rm',
          '  [General Tools]  : git status, node -v, npm list',
          '  [ELIZA Psych]    : eliza - starts offline ELIZA therapist conversation CLI',
          '',
          'Standard Local Commands:',
          '  clear / cls      - Clear screen',
          '  history          - View command history',
        ];
        helpText.forEach(line => {
          setLines((prev) => [...prev, { type: 'output', text: line }]);
        });
        return;
      }

      if (firstWord === 'history') {
        const histList = updatedHistory.map((cmd, i) => `${i + 1}  ${cmd}`);
        histList.forEach(line => {
          setLines((prev) => [...prev, { type: 'output', text: line }]);
        });
        return;
      }

      if (['clear', 'cls', 'clear-host'].includes(firstWord)) {
        clear();
        return;
      }

      try {
        const response = await fetch('/api/terminal/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ command: trimmed, currentPath }),
        });

        if (!response.ok) {
          const errMsg = await response.text();
          setLines((prev) => [...prev, { type: 'error', text: `Command execution failed: ${errMsg}` }]);
          return;
        }

        const data = await response.json();
        
        if (data.clear) {
          clear();
          return;
        }

        if (data.newPath !== undefined) {
          setCurrentPath(data.newPath);
        }

        if (data.stdout) {
          const outLines = data.stdout.split('\n');
          if (outLines.length > 0 && outLines[outLines.length - 1] === '') {
            outLines.pop();
          }
          outLines.forEach((l: string) => {
            setLines((prev) => [...prev, { type: 'output', text: l }]);
          });
        }

        if (data.stderr) {
          const errLines = data.stderr.split('\n');
          if (errLines.length > 0 && errLines[errLines.length - 1] === '') {
            errLines.pop();
          }
          errLines.forEach((l: string) => {
            setLines((prev) => [...prev, { type: 'error', text: l }]);
          });
        }

        // Trigger workspace/sidebar explorer tree refreshes if directories/files changed
        if (['touch', 'rm', 'mkdir', 'mv', 'cp', 'new-item', 'remove-item', 'mkdir-p', 'md', 'rd', 'del'].some(kw => firstWord.includes(kw))) {
          if (triggerRefresh) {
            triggerRefresh();
          }
        }

      } catch (err: any) {
        setLines((prev) => [...prev, { type: 'error', text: `Network Error: ${err.message || err}` }]);
      }
    },
    [currentPath, clear, history, triggerRefresh, elizaInstance, toggleEliza]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        executeCommand(input);
        setInput('');
        setHistoryIndex(-1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (historyIndex === -1) {
          setSavedInput(input);
        }
        const newIndex = historyIndex + 1;
        if (newIndex < history.length) {
          setHistoryIndex(newIndex);
          setInput(history[history.length - 1 - newIndex]);
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (historyIndex <= 0) {
          setHistoryIndex(-1);
          setInput(savedInput);
        } else {
          const newIndex = historyIndex - 1;
          setHistoryIndex(newIndex);
          setInput(history[history.length - 1 - newIndex]);
        }
      }
    },
    [input, executeCommand, history, historyIndex, savedInput]
  );

  const handleTerminalClick = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  const parseAnsi = (text: string): React.ReactNode[] => {
    if (!text.includes('\x1b[')) return [text];
    const parts: React.ReactNode[] = [];
    const regex = /\x1b\[(\d+)m/g;
    let lastIndex = 0;
    let currentColor = '';
    let match;
    let key = 0;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(
          <span key={key++} style={{ color: currentColor }}>
            {text.slice(lastIndex, match.index)}
          </span>
        );
      }
      const code = parseInt(match[1], 10);
      switch (code) {
        case 30: currentColor = '#000000'; break;
        case 31: currentColor = '#F44336'; break;
        case 32: currentColor = '#10B981'; break; // emerald-500
        case 33: currentColor = '#F59E0B'; break; // amber-500
        case 34: currentColor = '#3B82F6'; break; // blue-500
        case 35: currentColor = '#D946EF'; break; // fuchsia-500
        case 36: currentColor = '#06B6D4'; break; // cyan-500
        case 37: currentColor = '#EDE6DD'; break;
        case 0: currentColor = ''; break;
        default: currentColor = '';
      }
      lastIndex = regex.lastIndex;
    }
    if (lastIndex < text.length) {
      parts.push(
        <span key={key++} style={{ color: currentColor }}>
          {text.slice(lastIndex)}
        </span>
      );
    }
    return parts;
  };

  const currentDisplayPath = currentPath === '.' ? '~' : `./${currentPath}`;

  return (
    <div
      id="terminal_canvas_wrapper"
      className="flex flex-col h-full font-mono text-[11px] select-text bg-[#030302] border-none"
      style={{
        fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
        color: '#EDE6DD'
      }}
      onClick={handleTerminalClick}
    >
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {lines.map((line, i) => (
          <div key={i} className="whitespace-pre-wrap break-all leading-relaxed py-0.5">
            {line.type === 'input' && (
              <span>
                <span className="text-[#10B981] font-bold">{line.text.split('$')[0]}</span>
                <span className="text-zinc-500 font-bold">$</span>
                <span className="text-[#EDE6DD] font-medium ml-1">
                  {line.text.slice(line.text.indexOf('$') + 1).trim()}
                </span>
              </span>
            )}
            {line.type === 'output' && <span className="text-[#BBB1A5]">{parseAnsi(line.text)}</span>}
            {line.type === 'error' && <span className="text-red-400 font-bold">{line.text}</span>}
            {line.type === 'system' && (
              <span className="text-cyan-400 font-medium bg-cyan-950/15 border border-cyan-800/10 rounded px-2 py-0.5 my-1 block max-w-max">
                {line.text}
              </span>
            )}
            {line.type === 'eliza-user' && (
              <span className="flex items-start gap-1">
                <span className="text-indigo-400 font-bold shrink-0 min-w-[#42px] tracking-wide">YOU:</span>
                <span className="text-indigo-200 font-medium">{line.text}</span>
              </span>
            )}
            {line.type === 'eliza-bot' && (
              <span className="flex items-start gap-1 bg-pink-500/5 border border-pink-500/10 rounded-lg px-3 py-2 my-2 max-w-2xl shadow-sm">
                <span className="text-pink-400 font-bold shrink-0 min-w-[#42px] tracking-wide">ELIZA:</span>
                <span className="text-pink-100 font-medium leading-relaxed">{parseAnsi(line.text)}</span>
              </span>
            )}
          </div>
        ))}

        <div className="flex items-center gap-1.5 mt-1">
          {elizaInstance ? (
            <span className="text-purple-400 font-bold shrink-0">YOU:</span>
          ) : (
            <span className="text-[#10B981] font-bold shrink-0">{currentDisplayPath}$</span>
          )}
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent outline-none border-none text-[#EDE6DD] font-medium min-w-0 p-0 focus:ring-0 focus:outline-none placeholder-zinc-700 leading-normal"
            autoFocus
            spellCheck={false}
            autoComplete="off"
            autoCapitalize="off"
            placeholder={elizaInstance ? "Talk to Eliza... (say 'exit' to quit)" : "Enter shell command... (try 'eliza')"}
          />
        </div>
      </div>
    </div>
  );
}

