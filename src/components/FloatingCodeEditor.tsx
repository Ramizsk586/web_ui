import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  X, 
  Save, 
  RefreshCw, 
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
  Code2,
  FolderOpen,
  Eye,
  EyeOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { MonacoCodeEditor } from './ui/MonacoCodeEditor';

interface FloatingCodeEditorProps {
  filePath: string;
  onClose: () => void;
  showToast: (msg: string) => void;
  triggerWorkspaceRefresh: () => void;
  workspaceRootPath?: string;
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

const FloatingCodeEditorComponent: React.FC<FloatingCodeEditorProps> = ({
  filePath,
  onClose,
  showToast,
  triggerWorkspaceRefresh,
  workspaceRootPath
}) => {
  const [openFiles, setOpenFiles] = useState<TabFile[]>([]);
  const [activePath, setActivePath] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Default settings optimized for professional coder look
  const [fontSize, setFontSize] = useState(13);
  const [wordWrap, setWordWrap] = useState(true);
  const [showLineNumbers, setShowLineNumbers] = useState(true);

  // Search
  const [showFind, setShowFind] = useState(false);
  const [findQuery, setFindQuery] = useState('');

  const activeFile = useMemo(() => {
    return openFiles.find(f => f.path === activePath) || null;
  }, [openFiles, activePath]);

  const fileExt = useMemo(() => {
    return activeFile ? getFileExt(activeFile.name) : '';
  }, [activeFile]);

  const isPreviewable = useMemo(() => {
    if (!activeFile) return false;
    const nameLower = activeFile.name.toLowerCase();
    return (
      nameLower.endsWith('.html') ||
      nameLower.endsWith('.htm') ||
      nameLower.endsWith('.md') ||
      nameLower.endsWith('.markdown') ||
      nameLower.endsWith('.svg') ||
      nameLower.endsWith('.png') ||
      nameLower.endsWith('.jpg') ||
      nameLower.endsWith('.jpeg') ||
      nameLower.endsWith('.gif') ||
      nameLower.endsWith('.webp')
    );
  }, [activeFile]);

  const isBinaryImage = useMemo(() => {
    if (!activeFile) return false;
    const nameLower = activeFile.name.toLowerCase();
    return (
      nameLower.endsWith('.png') ||
      nameLower.endsWith('.jpg') ||
      nameLower.endsWith('.jpeg') ||
      nameLower.endsWith('.gif') ||
      nameLower.endsWith('.webp')
    );
  }, [activeFile]);

  const [isPreviewMode, setIsPreviewMode] = useState<boolean>(false);

  useEffect(() => {
    if (activeFile) {
      const nameLower = activeFile.name.toLowerCase();
      if (
        nameLower.endsWith('.png') ||
        nameLower.endsWith('.jpg') ||
        nameLower.endsWith('.jpeg') ||
        nameLower.endsWith('.gif') ||
        nameLower.endsWith('.webp')
      ) {
        setIsPreviewMode(true);
      } else {
        setIsPreviewMode(false);
      }
    }
  }, [activePath]);

  const getRelativePath = (absolute: string) => {
    const parts = absolute.split('coder/');
    return parts.length > 1 ? parts[1] : absolute;
  };

  // Open / Read file
  const loadFile = useCallback(async (path: string) => {
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
        body: JSON.stringify({ filePath: path, workspaceRoot: workspaceRootPath })
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
        showToast(`Failed to load file content.`);
      }
    } catch (err) {
      console.error(err);
      showToast("Network error reading file.");
    } finally {
      setIsLoading(false);
    }
  }, [openFiles, showToast, workspaceRootPath]);

  useEffect(() => {
    if (filePath) {
      loadFile(filePath);
    }
  }, [filePath]);

  // Save handler
  const handleSaveActive = useCallback(async () => {
    if (!activeFile || isSaving) return;
    setIsSaving(true);
    try {
      const response = await fetch('/api/fs/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: activeFile.path, content: activeFile.editedCode, workspaceRoot: workspaceRootPath })
      });
      if (response.ok) {
        setOpenFiles(prev => prev.map(f => f.path === activeFile.path ? { 
          ...f, 
          content: f.editedCode, 
          isModified: false 
        } : f));
        showToast(`Saved ${getRelativePath(activeFile.path)}`);
        triggerWorkspaceRefresh();
      } else {
        showToast("Error saving document.");
      }
    } catch (err) {
      console.error(err);
      showToast("Network error saving file.");
    } finally {
      setIsSaving(false);
    }
  }, [activeFile, isSaving, showToast, triggerWorkspaceRefresh]);

  // Keys bind
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

  const handleCodeChange = (code: string) => {
    if (!activeFile) return;
    setOpenFiles(prev => prev.map(f => f.path === activeFile.path ? {
      ...f,
      editedCode: code,
      isModified: code !== f.content
    } : f));
  };

  const closeTab = (path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const targetFile = openFiles.find(f => f.path === path);
    if (targetFile?.isModified) {
      if (!confirm(`Discard unsaved modifications in ${targetFile.name}?`)) return;
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

  const findMatchesCount = useMemo(() => {
    if (!activeFile || !findQuery) return 0;
    try {
      const matches = activeFile.editedCode.match(new RegExp(findQuery, 'gi'));
      return matches ? matches.length : 0;
    } catch {
      return 0;
    }
  }, [activeFile, findQuery]);

  const handleCloseEditor = () => {
    const modified = openFiles.some(f => f.isModified);
    if (modified) {
      if (!confirm("You have unsaved changes. Discard and close?")) return;
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-[#0F0D0C]/80 backdrop-blur-md flex items-center justify-center z-[150] p-4 md:p-6 animate-fade-in select-none">
      <motion.div 
        initial={{ opacity: 0, scale: 0.97, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 12 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-5xl h-[86vh] bg-[#1A1715] border border-[#2D241E] rounded-2xl flex flex-col overflow-hidden shadow-[0_24px_64px_rgba(18,16,15,0.7)] relative font-sans"
      >
        {/* Soft elegant warm ambient glow backing */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#D97756]/4 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#AD9F91]/4 rounded-full blur-[80px] pointer-events-none" />

        {/* Master Toolbar */}
        <div className="h-14 border-b border-[#2C241E] bg-[#221D1A]/90 px-5 flex items-center justify-between shrink-0 relative z-10 select-none backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#D97756]/10 text-[#D97756] border border-[#D97756]/15">
              <Code2 size={16} />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-xs font-bold text-[#EDE6DD] tracking-wider uppercase font-sans">
                Claude Workspace
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#D97756] animate-pulse" />
                <span className="text-[10px] font-mono text-[#AD9F91]">
                  {openFiles.length === 1 ? '1 active tab' : `${openFiles.length} files open`}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Settings Group */}
          <div className="flex items-center gap-1 bg-[#1E1917] p-1 rounded-xl border border-[#2F2722]">
            {isPreviewable && (
              <>
                <button 
                  onClick={() => setIsPreviewMode(prev => !prev)}
                  className={`p-2 rounded-lg transition-all border border-transparent cursor-pointer flex items-center gap-1 ${isPreviewMode ? 'text-white border-[#D97756]/30 bg-[#2C241E]' : 'text-[#AD9F91] hover:text-[#EDE6DD]'}`}
                  title="Toggle Live Visual Preview"
                >
                  <Eye size={13} className={isPreviewMode ? "text-[#D97756]" : ""} />
                  <span className="text-[10px] font-bold">Preview</span>
                </button>
                <span className="w-px h-4 bg-[#2C241E] mx-1"></span>
              </>
            )}
            <button 
              onClick={() => setShowFind(prev => !prev)}
              className={`p-2 rounded-lg transition-all border border-transparent cursor-pointer ${showFind ? 'text-white border-[#D97756]/30 bg-[#2C241E]' : 'text-[#AD9F91] hover:text-[#EDE6DD]'}`}
              title="Search File (Ctrl+F)"
            >
              <Search size={13} />
            </button>
            <button 
              onClick={() => setWordWrap(!wordWrap)}
              className={`p-2 rounded-lg transition-all border border-transparent cursor-pointer ${wordWrap ? 'text-white border-[#D97756]/30 bg-[#2C241E]' : 'text-[#AD9F91] hover:text-[#EDE6DD]'}`}
              title="Toggle Word Wrap"
            >
              <WrapText size={13} />
            </button>
            <button 
              onClick={() => setShowLineNumbers(!showLineNumbers)}
              className={`p-2 rounded-lg transition-all border border-transparent cursor-pointer ${showLineNumbers ? 'text-white border-[#D97756]/30 bg-[#2C241E]' : 'text-[#AD9F91] hover:text-[#EDE6DD]'}`}
              title="Toggle Line Numbers"
            >
              <Hash size={13} />
            </button>

            <span className="w-px h-4 bg-[#2C241E] mx-1"></span>

            <button 
              onClick={() => setFontSize(s => Math.max(9, s - 1))}
              className="p-1.5 text-[#AD9F91] hover:text-[#EDE6DD] rounded-lg transition-all cursor-pointer"
            >
              <ZoomOut size={13} />
            </button>
            <span className="text-[11px] font-mono font-bold text-[#EDE6DD] w-6 text-center select-none">
              {fontSize}px
            </span>
            <button 
              onClick={() => setFontSize(s => Math.min(24, s + 1))}
              className="p-1.5 text-[#AD9F91] hover:text-[#EDE6DD] rounded-lg transition-all cursor-pointer"
            >
              <ZoomIn size={13} />
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            {activeFile?.isModified && (
              <button
                onClick={handleSaveActive}
                disabled={isSaving}
                className="bg-[#D97756] hover:bg-[#E08A69] text-white font-semibold px-4 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm hover:shadow active:scale-[0.98]"
              >
                {isSaving ? <RefreshCw size={12} className="animate-spin text-white" /> : <Save size={12} />}
                <span>Save</span>
              </button>
            )}
            <button
              onClick={handleCloseEditor}
              className="p-2 hover:bg-[#2A2420] border border-[#2F2722] bg-[#1C1816]/50 rounded-lg text-[#AD9F91] hover:text-white transition-all cursor-pointer"
              title="Close Workspace"
            >
              <X size={14} />
            </button>
          </div>
        </div>



        {/* Find Search Input bar */}
        <AnimatePresence>
          {showFind && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 42, opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="flex items-center justify-between px-5 bg-[#141211] border-b border-[#2C241E] overflow-hidden shrink-0 select-none relative z-10"
            >
              <div className="flex items-center gap-2.5 flex-1 max-w-md">
                <Search size={13} className="text-[#AD9F91]" />
                <input
                  type="text"
                  autoFocus
                  placeholder="Type to find characters..."
                  value={findQuery}
                  onChange={e => setFindQuery(e.target.value)}
                  className="w-full bg-transparent border-none text-[12px] text-[#EDE6DD] focus:outline-none focus:ring-0 placeholder-[#564E46] font-sans select-text"
                />
              </div>
              <div className="flex items-center gap-3">
                {findQuery && (
                  <span className="text-[10px] font-mono bg-[#2C241E] text-[#EDE6DD]/80 px-2 py-0.5 rounded border border-[#3E332A] select-none">
                    {findMatchesCount} matches
                  </span>
                )}
                <button
                  onClick={() => {
                    setFindQuery('');
                    setShowFind(false);
                  }}
                  className="text-[#AD9F91] hover:text-white p-1 rounded hover:bg-[#2C241E] transition-colors"
                >
                  <X size={11} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Editor Board Area */}
        <div className="flex-1 flex overflow-hidden relative bg-[#1A1715]">
          {isLoading ? (
            <div className="absolute inset-0 bg-[#1A1715]/95 flex flex-col items-center justify-center text-xs text-[#AD9F91] select-none z-10 gap-2 font-sans">
              <RefreshCw size={16} className="animate-spin text-[#D97756]" />
              <span className="font-mono text-[10px] tracking-widest text-[#AD9F91] uppercase mt-1">Reading from virtual drive...</span>
            </div>
          ) : activeFile ? (
            <div className="flex-1 flex overflow-hidden relative w-full h-full">
              {isPreviewMode ? (
                <div className="flex-1 w-full h-full overflow-auto bg-[#131110] relative flex flex-col items-stretch">
                  {(() => {
                    const nameLower = activeFile.name.toLowerCase();
                    
                    // HTML
                    if (nameLower.endsWith('.html') || nameLower.endsWith('.htm')) {
                      let htmlDoc = activeFile.editedCode || '';
                      const hasBackground = /background(?:-color)?\s*:/i.test(htmlDoc) || 
                                            /style\s*=\s*['"][^'"]*background/i.test(htmlDoc) ||
                                            /class\s*=\s*['"][^'"]*\bbg-[a-z0-9-]+/i.test(htmlDoc);

                      if (!hasBackground) {
                        const defaultStyle = '\n<style>\n  html, body {\n    background-color: #ffffff !important;\n    color: #000000;\n  }\n</style>\n';
                        if (htmlDoc.includes('<head>')) {
                          htmlDoc = htmlDoc.replace('<head>', `<head>${defaultStyle}`);
                        } else if (htmlDoc.includes('<html>')) {
                          htmlDoc = htmlDoc.replace('<html>', `<html>${defaultStyle}`);
                        } else {
                          htmlDoc = defaultStyle + htmlDoc;
                        }
                      }
                      return (
                        <div className="flex-1 w-full h-full bg-white relative">
                          <iframe 
                            srcDoc={htmlDoc}
                            title="HTML Live Preview"
                            className="w-full h-full border-none bg-white"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      );
                    }

                    // JSX / TSX / JS
                    if (nameLower.endsWith('.jsx') || nameLower.endsWith('.tsx') || nameLower.endsWith('.js')) {
                      // Compile React JSX/TSX components in browser sandbox on-the-fly
                      const escapedCode = activeFile.editedCode
                        .replace(/\\/g, '\\\\')
                        .replace(/`/g, '\\`')
                        .replace(/\${/g, '\\${');

                      const docHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sandbox: ${activeFile.name}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <script src="https://unpkg.com/react@18/umd/react.development.js" crossorigin></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js" crossorigin></script>
  <script src="https://unpkg.com/lucide@latest"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <style>
    body {
      font-family: 'Inter', sans-serif;
      margin: 0;
      padding: 0;
      background-color: #0d0e12;
      color: #f3f4f6;
    }
  </style>
  <script>window.process = { env: { NODE_ENV: 'development' } };</script>
</head>
<body class="bg-[#0b0c10] text-[#f3f4f6] min-h-screen">
  <div class="flex items-center justify-between px-4 py-2 border-b border-zinc-800 bg-[#0f1115]/95 select-none text-xs text-zinc-400">
    <div class="flex items-center gap-2">
      <span class="inline-block w-2 h-2 rounded-full bg-teal-500 animate-pulse"></span>
      <span class="font-mono text-zinc-300 font-medium">Lumina Transpiler Sandbox (v1.2)</span>
      <span class="text-zinc-600">|</span>
      <span class="font-semibold text-teal-400 font-mono">${activeFile.name}</span>
    </div>
    <div class="flex items-center gap-3 font-mono text-[10px]">
      <span class="text-emerald-500">React + Babel</span>
    </div>
  </div>
  <div id="root" class="p-6"></div>
  <div id="error-boundary-overlay" class="hidden fixed bottom-4 right-4 max-w-lg p-4 bg-rose-950/90 border border-rose-500 rounded-lg shadow-2xl backdrop-blur-md z-50">
    <div class="flex items-start gap-3">
      <div class="p-1 rounded bg-rose-800 text-white font-bold text-xs select-none">ERROR</div>
      <div>
        <h4 class="text-sm font-semibold text-rose-200" id="error-title">Runtime Error</h4>
        <pre class="mt-2 text-xs font-mono text-rose-300原始 whitespace-pre-wrap max-h-48 overflow-y-auto" id="error-message"></pre>
      </div>
    </div>
  </div>
  <script type="text/babel" data-presets="react,typescript">
    function reportError(err) {
      console.error("Sandbox component error:", err);
      const overlay = document.getElementById('error-boundary-overlay');
      const msg = document.getElementById('error-message');
      if (overlay && msg) {
        msg.textContent = err.stack || err.message || String(err);
        overlay.classList.remove('hidden');
      }
    }
    try {
      let userCode = \`${escapedCode}\`;
      userCode = userCode.replace(/export\\s+default\\s+/g, 'const DefaultExportComponent = ');
      userCode = userCode.replace(/export\\s+const\\s+/g, 'const ');
      userCode = userCode.replace(/export\\s+function\\s+/g, 'function ');
      userCode = userCode.replace(/import\\s+.*?\\s+from\\s+['"].*?['"]/g, match => '// ' + match);

      const { useState, useEffect, useMemo, useCallback, useRef } = React;
      const evalWrapper = new Function('React', 'useState', 'useEffect', 'useMemo', 'useCallback', 'useRef', 'lucide', \`
        \${userCode}
        return typeof DefaultExportComponent !== 'undefined' ? DefaultExportComponent : (typeof App !== 'undefined' ? App : null);
      \`);

      const TargetComponent = evalWrapper(React, useState, useEffect, useMemo, useCallback, useRef, window.lucide);
      if (TargetComponent) {
        const root = ReactDOM.createRoot(document.getElementById('root'));
        root.render(<TargetComponent />);
        setTimeout(() => {
          if (window.lucide && typeof window.lucide.createIcons === 'function') {
            window.lucide.createIcons();
          }
        }, 300);
      } else {
        const runModule = new Function('React', 'useState', 'useEffect', 'useMemo', 'useCallback', 'useRef', 'lucide', userCode);
        runModule(React, useState, useEffect, useMemo, useCallback, useRef, window.lucide);
      }
    } catch (e) {
      reportError(e);
    }
  <\/script>
</body>
</html>`;

                      return (
                        <div className="flex-1 w-full h-full bg-white relative">
                          <iframe 
                            srcDoc={docHtml}
                            title="React/Babel Live Preview"
                            className="w-full h-full border-none bg-white"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      );
                    }
                    
                    // SVG
                    if (nameLower.endsWith('.svg')) {
                      return (
                        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#0C0A09] relative min-h-[350px]">
                          <div 
                            className="p-6 rounded-xl border border-[#231A16] max-w-full max-h-[60vh] flex items-center justify-center shadow-lg"
                            style={{
                              backgroundImage: 'linear-gradient(45deg, #181412 25%, transparent 25%), linear-gradient(-45deg, #181412 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #181412 75%), linear-gradient(-45deg, transparent 75%, #181412 75%)',
                              backgroundSize: '20px 20px',
                              backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0',
                              backgroundColor: '#100D0C'
                            }}
                            dangerouslySetInnerHTML={{ __html: activeFile.editedCode }}
                          />
                          <span className="text-[10px] font-mono text-[#AD9F91] mt-4 uppercase tracking-wider bg-[#1A1715]/90 px-3 py-1 rounded border border-[#2D241E] select-none">
                            SVG Scalable Vector Graphic Preview
                          </span>
                        </div>
                      );
                    }
                    
                    // Markdown
                    if (nameLower.endsWith('.md') || nameLower.endsWith('.markdown')) {
                      return (
                        <div className="flex-1 w-full overflow-y-auto custom-scrollbar bg-[#1A1715]/75 py-8 px-6 md:px-12 select-text text-left">
                          <div className="max-w-3xl mx-auto text-[#DDD2C4] font-sans pb-12">
                            <Markdown 
                              remarkPlugins={[remarkGfm]}
                              components={{
                                h1: ({node, ...props}) => <h1 className="text-2xl font-bold text-white border-b border-[#2C241E] pb-2 mt-6 mb-4 font-sans tracking-tight" {...props} />,
                                h2: ({node, ...props}) => <h2 className="text-xl font-bold text-white mt-5 mb-3 font-sans tracking-tight" {...props} />,
                                h3: ({node, ...props}) => <h3 className="text-lg font-bold text-white mt-4 mb-2 font-sans" {...props} />,
                                p: ({node, ...props}) => <p className="text-sm text-[#DDD2C4] leading-relaxed mb-4 font-sans" {...props} />,
                                ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-4 space-y-1 text-sm text-[#DDD2C4]" {...props} />,
                                ol: ({node, ...props}) => <ol className="list-decimal pl-5 mb-4 space-y-1 text-sm text-[#DDD2C4]" {...props} />,
                                li: ({node, ...props}) => <li className="pl-1 text-sm" {...props} />,
                                code: ({node, inline, className, children, ...props}: any) => {
                                  const match = /language-(\w+)/.exec(className || '');
                                  return !inline && match ? (
                                    <pre className="bg-[#131110] border border-[#2C241E] p-4 rounded-lg my-4 overflow-auto font-mono text-xs text-[#B5CEA8] max-w-full">
                                      <code {...props}>{children}</code>
                                    </pre>
                                  ) : (
                                    <code className="bg-[#2C241E] text-[#E09F67] px-1.5 py-0.5 rounded font-mono text-xs" {...props}>{children}</code>
                                  );
                                },
                                table: ({node, ...props}) => <table className="w-full text-left text-sm border-collapse border border-[#261E1A] my-4" {...props} />,
                                thead: ({node, ...props}) => <thead className="bg-[#1E1917]" {...props} />,
                                th: ({node, ...props}) => <th className="border border-[#261E1A] p-2 font-bold text-white" {...props} />,
                                td: ({node, ...props}) => <td className="border border-[#261E1A] p-2 text-sm text-[#AD9F91]" {...props} />,
                                blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-[#D97756] pl-4 italic my-4 text-[#AD9F91]" {...props} />,
                                a: ({node, ...props}) => <a className="text-[#D97756] hover:underline hover:text-[#E08A69]" target="_blank" rel="noopener noreferrer" {...props} />
                              }}
                            >
                              {activeFile.editedCode}
                            </Markdown>
                          </div>
                        </div>
                      );
                    }
                    
                    // Images
                    if (
                      nameLower.endsWith('.png') ||
                      nameLower.endsWith('.jpg') ||
                      nameLower.endsWith('.jpeg') ||
                      nameLower.endsWith('.gif') ||
                      nameLower.endsWith('.webp')
                    ) {
                      return (
                        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#0C0A09] relative min-h-[350px]">
                          <div 
                            className="p-6 rounded-xl border border-[#231A16] max-w-full max-h-[60vh] flex items-center justify-center shadow-lg"
                            style={{
                              backgroundImage: 'linear-gradient(45deg, #181412 25%, transparent 25%), linear-gradient(-45deg, #181412 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #181412 75%), linear-gradient(-45deg, transparent 75%, #181412 75%)',
                              backgroundSize: '20px 20px',
                              backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0',
                              backgroundColor: '#100D0C'
                            }}
                          >
                            <img 
                              src={`/api/fs/raw?filePath=${encodeURIComponent(activeFile.path)}&t=${Date.now()}`}
                              alt={activeFile.name} 
                              className="max-w-full max-h-[55vh] object-contain rounded select-none"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                          <span className="text-[10px] font-mono text-[#AD9F91] mt-4 uppercase tracking-wider bg-[#1A1715]/90 px-3 py-1 rounded border border-[#2D241E] select-none">
                            Image File Preview
                          </span>
                        </div>
                      );
                    }
                    
                    return null;
                  })()}
                </div>
              ) : (
                <div className="flex-1 overflow-hidden bg-[#1A1715]">
                  <MonacoCodeEditor
                    value={activeFile.editedCode}
                    language={fileExt || 'plaintext'}
                    path={activeFile.path}
                    fontSize={fontSize}
                    wordWrap={wordWrap}
                    lineNumbers={showLineNumbers ? 'on' : 'off'}
                    onChange={handleCodeChange}
                    onSave={handleSaveActive}
                    onMount={(editor) => {
                      editor.onDidChangeCursorPosition((event) => {
                        setOpenFiles(prev => prev.map(f => f.path === activeFile.path ? {
                          ...f,
                          cursorLine: event.position.lineNumber,
                          cursorCol: event.position.column
                        } : f));
                      });
                    }}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 select-none font-sans p-8 text-center bg-[#131110]/40">
              <div className="w-14 h-14 rounded-xl bg-[#2A2420]/60 border border-[#2D241E] flex items-center justify-center text-[#AD9F91]">
                <FolderOpen size={24} className="text-[#D97756]" />
              </div>
              <h2 className="text-xs font-bold text-[#EDE6DD] uppercase tracking-wider">No Active Editor Document</h2>
              <p className="text-[12px] text-[#AD9F91] max-w-xs leading-relaxed">
                Click any file list entry on the explorer sidebar on the left, or create a brand new file inside the current working folder.
              </p>
            </div>
          )}
        </div>

        {/* Footer info ribbon */}
        {activeFile && (
          <div className="h-8 border-t border-[#2C241E] bg-[#131110] px-5 flex items-center justify-between text-[10px] text-[#AD9F91]/80 select-none font-mono shrink-0">
            <span className="truncate">File: <span className="text-[#EDE6DD]">{activeFile.name}</span></span>
            <div className="flex items-center gap-4 shrink-0">
              <span>Lang: <span className="text-[#D97756] font-bold">{fileExt ? fileExt.toUpperCase() : 'PLAIN'}</span></span>
              <span>Ln {activeFile.cursorLine}, Col {activeFile.cursorCol}</span>
              <span>{activeFile.editedCode.length} chars</span>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export const FloatingCodeEditor = React.memo(FloatingCodeEditorComponent);
