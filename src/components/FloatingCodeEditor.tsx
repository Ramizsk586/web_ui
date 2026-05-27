import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  X, 
  Save, 
  RefreshCw, 
  FileCode,
  Check,
  Search,
  ChevronDown,
  ChevronRight,
  WrapText,
  Hash,
  ZoomIn,
  ZoomOut,
  FileText,
  Terminal,
  Activity,
  Code2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface FloatingCodeEditorProps {
  filePath: string;
  onClose: () => void;
  showToast: (msg: string) => void;
  triggerWorkspaceRefresh: () => void;
}

interface TabFile {
  path: string;
  name: string;
  content: string;
  editedCode: string;
  isModified: boolean;
  cursorLine: number;
  cursorCol: number;
}

const HIGHLIGHT_PATTERNS: Record<string, { pattern: RegExp; color: string }[]> = {
  js: [
    { pattern: /\/\/[^\n]*$/gm, color: '#6A9955' },
    { pattern: /\/\*[\s\S]*?\*\//g, color: '#6A9955' },
    { pattern: /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g, color: '#CE9178' },
    { pattern: /`(?:[^`\\]|\\.)*`/g, color: '#CE9178' },
    { pattern: /\b(const|let|var|function|return|if|else|for|while|class|import|export|from|async|await|new|this|try|catch|throw|typeof|instanceof|default)\b/g, color: '#569CD6' },
    { pattern: /\b(true|false|null|undefined)\b/g, color: '#569CD6' },
    { pattern: /\b\d+(?:\.\d+)?\b/g, color: '#B5CEA8' },
  ],
  ts: [
    { pattern: /\/\/[^\n]*$/gm, color: '#6A9955' },
    { pattern: /\/\*[\s\S]*?\*\//g, color: '#6A9955' },
    { pattern: /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g, color: '#CE9178' },
    { pattern: /`(?:[^`\\]|\\.)*`/g, color: '#CE9178' },
    { pattern: /\b(const|let|var|function|return|if|else|for|while|class|import|export|from|async|await|new|this|try|catch|interface|type|extends|implements|readonly|enum|as|any|void|string|number|boolean|unknown|never)\b/g, color: '#569CD6' },
    { pattern: /\b(true|false|null|undefined)\b/g, color: '#569CD6' },
    { pattern: /\b\d+(?:\.\d+)?\b/g, color: '#B5CEA8' },
  ],
  json: [
    { pattern: /"(?:[^"\\]|\\.)*"(?=\s*:)/g, color: '#9CDCFE' },
    { pattern: /"(?:[^"\\]|\\.)*"/g, color: '#CE9178' },
    { pattern: /\b(true|false|null)\b/g, color: '#569CD6' },
    { pattern: /\b\d+(?:\.\d+)?\b/g, color: '#B5CEA8' },
  ],
  css: [
    { pattern: /\/\*[\s\S]*?\*\//g, color: '#6A9955' },
    { pattern: /:[^;]+;/g, color: '#CE9178' },
    { pattern: /\.[a-zA-Z0-9_\-]+/g, color: '#DCDCAA' },
    { pattern: /#[a-zA-Z0-9_\-]+/g, color: '#DCDCAA' },
    { pattern: /@\w+\b/g, color: '#569CD6' },
  ],
  html: [
    { pattern: /<!--[\s\S]*?-->/g, color: '#6A9955' },
    { pattern: /<\/?[a-zA-Z0-9:]+\b/g, color: '#569CD6' },
    { pattern: /"[^"]*"/g, color: '#CE9178' },
    { pattern: /=[a-zA-Z0-9"]+/g, color: '#9CDCFE' },
  ],
  md: [
    { pattern: /^#{1,6}\s+.*/gm, color: '#569CD6' },
    { pattern: /\*\*(?:[^*]+)\*\*/g, color: '#CE9178' },
    { pattern: /`[^`]+`/g, color: '#DCDCAA' },
    { pattern: /^\s*[-*+]\s+/gm, color: '#6796E6' },
    { pattern: /^\s*\d+\.\s+/gm, color: '#6796E6' },
  ],
};

const getFileExt = (name: string): string => {
  const ext = name.slice(name.lastIndexOf('.')).toLowerCase();
  if (ext === '.js' || ext === '.jsx') return 'js';
  if (ext === '.ts' || ext === '.tsx') return 'ts';
  if (ext === '.json') return 'json';
  if (ext === '.css') return 'css';
  if (ext === '.html') return 'html';
  if (ext === '.md') return 'md';
  return '';
};

export const FloatingCodeEditor: React.FC<FloatingCodeEditorProps> = ({
  filePath,
  onClose,
  showToast,
  triggerWorkspaceRefresh
}) => {
  const [openFiles, setOpenFiles] = useState<TabFile[]>([]);
  const [activePath, setActivePath] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Settings
  const [fontSize, setFontSize] = useState(13);
  const [wordWrap, setWordWrap] = useState(true);
  const [showLineNumbers, setShowLineNumbers] = useState(true);

  // Find inside file tool
  const [showFind, setShowFind] = useState(false);
  const [findQuery, setFindQuery] = useState('');

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const activeFile = useMemo(() => {
    return openFiles.find(f => f.path === activePath) || null;
  }, [openFiles, activePath]);

  const fileExt = useMemo(() => {
    return activeFile ? getFileExt(activeFile.name) : '';
  }, [activeFile]);

  const lines = useMemo(() => {
    return activeFile ? activeFile.editedCode.split('\n') : [];
  }, [activeFile]);

  const getRelativePath = (absolute: string) => {
    const parts = absolute.split('coder/');
    return parts.length > 1 ? parts[1] : absolute;
  };

  // Load a file from API & append to open tabs if not exist
  const loadFile = useCallback(async (path: string) => {
    // Check if copy is already open
    const isAlreadyOpen = openFiles.find(f => f.path === path);
    if (isAlreadyOpen) {
      setActivePath(path);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/fs/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: path })
      });
      if (response.ok) {
        const data = await response.json();
        const contentVal = data.content || '';
        const newTab: TabFile = {
          path,
          name: path.split('/').pop() || path,
          content: contentVal,
          editedCode: contentVal,
          isModified: false,
          cursorLine: 1,
          cursorCol: 1
        };
        setOpenFiles(prev => [...prev, newTab]);
        setActivePath(path);
      } else {
        showToast(`Failed to load contents of: ${getRelativePath(path)}`);
      }
    } catch (err) {
      console.error(err);
      showToast("Network error while reading file");
    } finally {
      setIsLoading(false);
    }
  }, [openFiles, showToast]);

  // Hook into active filePath prop changes
  useEffect(() => {
    if (filePath) {
      loadFile(filePath);
    }
  }, [filePath]);

  // Active Save Function
  const handleSaveActive = useCallback(async () => {
    if (!activeFile || isSaving) return;
    setIsSaving(true);
    try {
      const response = await fetch('/api/fs/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: activeFile.path, content: activeFile.editedCode })
      });
      if (response.ok) {
        setOpenFiles(prev => prev.map(f => f.path === activeFile.path ? { 
          ...f, 
          content: f.editedCode, 
          isModified: false 
        } : f));
        showToast(`Saved modifications to ${getRelativePath(activeFile.path)}`);
        triggerWorkspaceRefresh();
      } else {
        showToast("Error saving document changes.");
      }
    } catch (err) {
      console.error(err);
      showToast("Network error during writing");
    } finally {
      setIsSaving(false);
    }
  }, [activeFile, isSaving, showToast, triggerWorkspaceRefresh]);

  // Keyboard save routing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (activeFile && activeFile.isModified) {
          handleSaveActive();
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setShowFind(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeFile, handleSaveActive]);

  const handleCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const code = e.target.value;
    if (!activeFile) return;
    setOpenFiles(prev => prev.map(f => f.path === activeFile.path ? {
      ...f,
      editedCode: code,
      isModified: code !== f.content
    } : f));
  };

  const handleCursorChange = () => {
    const ta = textareaRef.current;
    if (!ta || !activeFile) return;
    const value = ta.value;
    const selection = ta.selectionStart;
    const line = value.slice(0, selection).split('\n').length;
    const col = selection - value.lastIndexOf('\n', selection - 1);
    
    setOpenFiles(prev => prev.map(f => f.path === activeFile.path ? {
      ...f,
      cursorLine: line,
      cursorCol: col
    } : f));
  };

  const closeTab = (path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const targetFile = openFiles.find(f => f.path === path);
    if (targetFile?.isModified) {
      const confirmDiscard = confirm(`Disabling editing for ${targetFile.name} will lose unsaved modifications. Discard?`);
      if (!confirmDiscard) return;
    }
    
    setOpenFiles(prev => {
      const filtered = prev.filter(f => f.path !== path);
      if (activePath === path) {
        const nextActive = filtered.length > 0 ? filtered[filtered.length - 1].path : '';
        setActivePath(nextActive);
      }
      return filtered;
    });
  };

  // Highlight matches rendering
  const renderHighlighted = (line: string, ext: string) => {
    if (!ext || !HIGHLIGHT_PATTERNS[ext]) return line;
    const patterns = HIGHLIGHT_PATTERNS[ext];
    let result: React.ReactNode[] = [line];
    
    patterns.forEach(({ pattern, color }) => {
      const newResult: React.ReactNode[] = [];
      result.forEach((node, i) => {
        if (typeof node !== 'string') {
          newResult.push(node);
          return;
        }
        let lastIndex = 0;
        const matches = [...node.matchAll(new RegExp(pattern, 'g'))];
        matches.forEach((match) => {
          const idx = match.index ?? 0;
          if (idx > lastIndex) {
            newResult.push(node.slice(lastIndex, idx));
          }
          newResult.push(
            <span key={`${i}-${idx}`} style={{ color }} className="transition-all">
              {match[0]}
            </span>
          );
          lastIndex = idx + match[0].length;
        });
        if (lastIndex < node.length) {
          newResult.push(node.slice(lastIndex));
        }
      });
      result = newResult;
    });
    return result;
  };

  // Find index query match count
  const findMatchesCount = useMemo(() => {
    if (!activeFile || !findQuery) return 0;
    try {
      const matches = activeFile.editedCode.match(new RegExp(findQuery, 'gi'));
      return matches ? matches.length : 0;
    } catch {
      return 0;
    }
  }, [activeFile, findQuery]);

  // Handle closing entire overlay
  const handleCloseEditor = () => {
    const modified = openFiles.some(f => f.isModified);
    if (modified) {
      const confirmAll = confirm("You have unsaved changes on some open files. Discard and close?");
      if (!confirmAll) return;
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-[#000000]/70 backdrop-blur-md flex items-center justify-center z-[150] p-4 md:p-6 animate-fade-in select-none">
      <motion.div 
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 16 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-5xl h-[86vh] bg-[#0c0c0e]/95 border border-zinc-805 rounded-[28px] flex flex-col overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] relative font-sans"
      >
        {/* Glow Effects inside Editor */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-teal-500/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-purple-500/5 rounded-full blur-[100px] pointer-events-none" />

        {/* Top toolbar navigation & preferences bar */}
        <div className="h-14 border-b border-zinc-850/80 bg-zinc-950/40 px-5 flex items-center justify-between select-none shrink-0 relative z-10 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/10 shadow-[0_0_15px_rgba(20,184,166,0.1)]">
              <Code2 size={16} />
            </div>
            <div className="flex flex-col">
              <span className="text-[13px] font-bold text-white tracking-wide font-display">
                Lumina Code Workspace
              </span>
              <div className="flex items-center gap-1.5 mt-0.5 select-none">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
                <span className="text-[10px] font-mono text-zinc-500">
                  {openFiles.length === 1 ? '1 file open' : `${openFiles.length} files active`}
                </span>
              </div>
            </div>
          </div>

          {/* Quick utility controls */}
          <div className="flex items-center gap-1 bg-zinc-900/60 p-1 rounded-xl border border-zinc-800/80">
            <button 
              onClick={() => setShowFind(prev => !prev)}
              className={`p-2 hover:bg-zinc-800 rounded-lg transition-all cursor-pointer ${showFind ? 'text-teal-400 bg-zinc-850' : 'text-zinc-400 hover:text-white'}`}
              title="Search File (Ctrl+F)"
            >
              <Search size={13} />
            </button>
            <button 
              onClick={() => setWordWrap(!wordWrap)}
              className={`p-2 hover:bg-zinc-800 rounded-lg transition-all cursor-pointer ${wordWrap ? 'text-teal-400 bg-zinc-850' : 'text-zinc-400 hover:text-white'}`}
              title="Toggle Word Wrap"
            >
              <WrapText size={13} />
            </button>
            <button 
              onClick={() => setShowLineNumbers(!showLineNumbers)}
              className={`p-2 hover:bg-zinc-800 rounded-lg transition-all cursor-pointer ${showLineNumbers ? 'text-teal-400 bg-zinc-850' : 'text-zinc-400 hover:text-white'}`}
              title="Toggle Line Numbers"
            >
              <Hash size={13} />
            </button>

            <span className="w-px h-4 bg-zinc-800 mx-1"></span>

            <button 
              onClick={() => setFontSize(s => Math.max(9, s - 1))}
              className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-all cursor-pointer"
              title="Decrease Font Size"
            >
              <ZoomOut size={13} />
            </button>
            <span className="text-[11px] font-mono font-bold text-zinc-350 w-6 text-center select-none">
              {fontSize}
            </span>
            <button 
              onClick={() => setFontSize(s => Math.min(24, s + 1))}
              className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-all cursor-pointer"
              title="Increase Font Size"
            >
              <ZoomIn size={13} />
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            {activeFile?.isModified && (
              <button
                onClick={handleSaveActive}
                disabled={isSaving}
                className="!bg-white hover:!bg-zinc-200 !text-black font-semibold px-3.5 py-1.5 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-[0_4px_12px_rgba(255,255,255,0.1)] transition-all active:scale-[0.98]"
              >
                {isSaving ? <RefreshCw size={12} className="animate-spin text-black" /> : <Save size={12} className="text-black" />}
                <span>Save Code</span>
              </button>
            )}
            <button
              onClick={handleCloseEditor}
              className="p-2 hover:bg-zinc-800/80 rounded-xl text-zinc-400 hover:text-white transition-all cursor-pointer border border-zinc-900 bg-zinc-950/40"
              title="Close editor overlay"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Tab Selection Row */}
        {openFiles.length > 0 && (
          <div className="flex items-center gap-0.5 border-b border-zinc-850/60 bg-[#070709] px-4 overflow-x-auto select-none custom-scrollbar shrink-0 relative z-10 h-11">
            {openFiles.map(file => {
              const isActive = file.path === activePath;
              return (
                <div
                  key={file.path}
                  onClick={() => setActivePath(file.path)}
                  className={`flex items-center gap-2 px-4 py-2 text-xs cursor-pointer transition-all select-none relative group h-9 rounded-t-xl mt-2 border-t border-x ${
                    isActive 
                      ? 'bg-[#0c0c0e] border-zinc-850 text-white font-medium shadow-[0_-4px_15px_rgba(0,0,0,0.4)]' 
                      : 'border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-[#0c0c0e]/30'
                  }`}
                >
                  <FileText size={12} className={isActive ? 'text-teal-400' : 'text-zinc-650 group-hover:text-zinc-400 transition-colors'} />
                  <span className="truncate max-w-[150px] font-sans tracking-tight text-[12px]">
                    {file.isModified && <span className="text-yellow-500 font-bold mr-1">•</span>}
                    {file.name}
                  </span>
                  <button
                    onClick={(e) => closeTab(file.path, e)}
                    className="p-0.5 rounded text-zinc-700 hover:text-rose-400 hover:bg-zinc-800/50 transition-colors ml-1"
                    title="Close file active tab"
                  >
                    <X size={10} />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Dynamic Search Matches Query Overlay Panel */}
        <AnimatePresence>
          {showFind && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 42, opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex items-center justify-between px-5 bg-zinc-950/20 border-b border-zinc-850 overflow-hidden shrink-0 select-none relative z-10"
            >
              <div className="flex items-center gap-2.5 flex-1 max-w-md">
                <Search size={13} className="text-zinc-500" />
                <input
                  type="text"
                  autoFocus
                  placeholder="Type to highlight matches..."
                  value={findQuery}
                  onChange={e => setFindQuery(e.target.value)}
                  className="w-full bg-transparent border-none text-[12px] text-zinc-200 focus:outline-none focus:ring-0 placeholder:text-zinc-600 font-sans select-text"
                />
              </div>
              <div className="flex items-center gap-3">
                {findQuery && (
                  <span className="text-[10px] font-mono bg-zinc-800/50 border border-zinc-800 text-zinc-400 px-2 py-0.5 rounded select-none">
                    {findMatchesCount} {findMatchesCount === 1 ? 'match' : 'matches'}
                  </span>
                )}
                <button
                  onClick={() => {
                    setFindQuery('');
                    setShowFind(false);
                  }}
                  className="text-zinc-500 hover:text-white p-1 rounded hover:bg-zinc-800 transition-colors"
                >
                  <X size={12} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Master Editor Body Container */}
        <div className="flex-1 flex overflow-hidden relative bg-[#09090b]">
          {isLoading ? (
            <div className="absolute inset-0 bg-[#09090b]/90 backdrop-blur-xs flex flex-col items-center justify-center text-xs text-zinc-500 select-none z-10 gap-2 font-sans">
              <RefreshCw size={16} className="animate-spin text-teal-400" />
              <span className="mt-2 font-mono text-[11px] tracking-wide text-zinc-455">FETCHING CONTENTS FROM FILE SYSTEM VIA WORKSPACE STREAMING...</span>
            </div>
          ) : activeFile ? (
            <div className="flex-1 flex overflow-hidden relative w-full h-full">
              {/* Line Gutter counter bar */}
              {showLineNumbers && (
                <div
                  className="shrink-0 overflow-hidden py-4 text-right select-none pr-3"
                  style={{
                    width: 48,
                    background: '#070709',
                    borderRight: '1px solid #141417',
                    fontSize,
                    lineHeight: `${fontSize + 6}px`,
                    fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                  }}
                >
                  {lines.map((_, i) => (
                    <div
                      key={i}
                      className="font-mono text-[10px]"
                      style={{
                        color: i + 1 === activeFile.cursorLine ? '#2dd4bf' : '#3f3f46',
                        fontWeight: i + 1 === activeFile.cursorLine ? 600 : 450,
                      }}
                    >
                      {i + 1}
                    </div>
                  ))}
                </div>
              )}

              {/* Textarea Code grid block */}
              <div className="flex-1 relative overflow-auto custom-scrollbar h-full bg-[#08080a] select-text">
                <textarea
                  ref={textareaRef}
                  value={activeFile.editedCode}
                  onChange={handleCodeChange}
                  onKeyUp={handleCursorChange}
                  onClick={handleCursorChange}
                  spellCheck={false}
                  className="absolute inset-0 w-full h-full resize-none border-none outline-none focus:ring-0 text-transparent caret-[#2dd4bf] p-4 font-mono z-10 select-text selection:bg-teal-900/50 bg-transparent h-full overflow-hidden"
                  style={{
                    fontSize,
                    lineHeight: `${fontSize + 6}px`,
                    fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                    whiteSpace: wordWrap ? 'pre-wrap' : 'pre',
                    tabSize: 4,
                  }}
                />
                
                {/* Real-time elegant custom syntax highlight overlay */}
                <div
                  className="absolute inset-0 pointer-events-none p-4 font-mono whitespace-pre-wrap select-none"
                  style={{
                    fontSize,
                    lineHeight: `${fontSize + 6}px`,
                    fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                    whiteSpace: wordWrap ? 'pre-wrap' : 'pre',
                    tabSize: 4,
                    color: '#e4e4e7',
                  }}
                >
                  {fileExt && HIGHLIGHT_PATTERNS[fileExt]
                    ? lines.map((line, i) => (
                      <div key={i} className="min-h-[1.5em]">{renderHighlighted(line, fileExt)}</div>
                    ))
                    : activeFile.editedCode
                  }
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 select-none font-sans p-8 text-center bg-[#070709]/40">
              <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 mb-2 relative group-hover:border-zinc-700 transition-all shadow-inner">
                <FileText size={28} className="text-zinc-400" />
              </div>
              <h2 className="text-sm font-semibold text-white font-display">No File Active in Editor</h2>
              <p className="text-xs text-zinc-400 max-w-xs leading-relaxed font-sans">
                Select any file directly from Lumina's File Explorer on the left, or open multiple workspace files simultaneously.
              </p>
            </div>
          )}
        </div>

        {/* Footer info strip */}
        {activeFile && (
          <div className="h-8 border-t border-zinc-950 bg-[#070709] px-5 flex items-center justify-between text-[10px] text-zinc-500 select-none font-mono shrink-0">
            <span className="truncate text-zinc-500">Path: <span className="text-zinc-400">{activeFile.path}</span></span>
            <div className="flex items-center gap-4 text-zinc-555">
              <span>Type: <span className="text-teal-400 font-bold">{fileExt ? fileExt.toUpperCase() : 'TXT'}</span></span>
              <span>Encoding: UTF-8</span>
              <span>Ln {activeFile.cursorLine}, Col {activeFile.cursorCol}</span>
              <span>{activeFile.editedCode.length} characters</span>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};
