import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  RefreshCw, 
  X, 
  Monitor, 
  Tablet, 
  Smartphone, 
  Grid, 
  MousePointerClick,
  ChevronRight,
  Loader2,
  Check,
  FileText
} from 'lucide-react';

interface LivePreviewPanelProps {
  isCoderRightPanelOpen: boolean;
  setIsCoderRightPanelOpen: (open: boolean) => void;
  rightViewportMode: 'desktop' | 'tablet' | 'mobile';
  setRightViewportMode: (mode: 'desktop' | 'tablet' | 'mobile') => void;
  projectFramework?: string;
  projectType?: string;
  iframeKey: number;
  setIframeKey: React.Dispatch<React.SetStateAction<number>>;
  devServerUrl: string;
  setDevServerUrl: (url: string) => void;
  rightIframeRef: React.RefObject<HTMLIFrameElement | null>;
  isRightPreviewStarting: boolean;
  rightPreviewLogs: string[];
  rightPreviewError?: string;
  rightIsGridEnabled: boolean;
  setRightIsGridEnabled: (enabled: boolean) => void;
  rightIsInspectMode: boolean;
  setRightIsInspectMode: (enabled: boolean) => void;
  startCoderPreview: () => Promise<void>;
  activeTab: 'overview' | 'review' | string;
  setActiveTab: (tab: 'overview' | 'review' | string) => void;
  openFileTabs: string[];
  setOpenFileTabs: React.Dispatch<React.SetStateAction<string[]>>;
  workspaceRootPath?: string;
}

interface DiffLine {
  oldLine?: number;
  newLine?: number;
  type: 'addition' | 'deletion' | 'normal' | 'hunk-header';
  content: string;
}

export function parseGitDiff(diffText: string): DiffLine[] {
  if (!diffText) return [];
  const lines = diffText.split('\n');
  const result: DiffLine[] = [];
  
  let oldLineNum = 0;
  let newLineNum = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (line.startsWith('diff --git') || line.startsWith('index ') || line.startsWith('--- ') || line.startsWith('+++ ')) {
      continue;
    }
    
    if (line.startsWith('@@')) {
      const match = line.match(/@@ -(\d+),?\d* \+(\d+),?\d* @@/);
      if (match) {
        oldLineNum = parseInt(match[1], 10);
        newLineNum = parseInt(match[2], 10);
        result.push({
          type: 'hunk-header',
          content: line
        });
      }
      continue;
    }
    
    if (line.startsWith('+')) {
      result.push({
        newLine: newLineNum++,
        type: 'addition',
        content: line
      });
    } else if (line.startsWith('-')) {
      result.push({
        oldLine: oldLineNum++,
        type: 'deletion',
        content: line
      });
    } else {
      if (line.startsWith('\\')) {
        continue;
      }
      result.push({
        oldLine: oldLineNum++,
        newLine: newLineNum++,
        type: 'normal',
        content: line
      });
    }
  }
  
  return result;
}

const renderFileIcon = (fileName: string) => {
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (ext === 'ts' || ext === 'tsx') {
    return <span className="bg-[#007acc]/15 text-[#007acc] font-bold text-[9px] px-1 py-0.5 rounded border border-[#007acc]/30 font-mono shrink-0 select-none">TS</span>;
  }
  if (ext === 'js' || ext === 'jsx') {
    return <span className="bg-[#f7df1e]/15 text-[#f7df1e] font-bold text-[9px] px-1 py-0.5 rounded border border-[#f7df1e]/30 font-mono shrink-0 select-none">JS</span>;
  }
  if (ext === 'json') {
    return <span className="bg-[#e34c26]/15 text-[#e34c26] font-bold text-[9px] px-1 py-0.5 rounded border border-[#e34c26]/30 font-mono shrink-0 select-none">JSON</span>;
  }
  if (ext === 'css') {
    return <span className="bg-[#563d7c]/15 text-[#563d7c] font-bold text-[9px] px-1 py-0.5 rounded border border-[#563d7c]/30 font-mono shrink-0 select-none">CSS</span>;
  }
  return <span className="bg-zinc-800 text-zinc-450 font-bold text-[9px] px-1 py-0.5 rounded border border-zinc-700 font-mono shrink-0 select-none">FILE</span>;
};

export const LivePreviewPanel: React.FC<LivePreviewPanelProps> = ({
  isCoderRightPanelOpen,
  setIsCoderRightPanelOpen,
  rightViewportMode,
  setRightViewportMode,
  projectFramework,
  projectType,
  iframeKey,
  setIframeKey,
  devServerUrl,
  setDevServerUrl,
  rightIframeRef,
  isRightPreviewStarting,
  rightPreviewLogs,
  rightPreviewError,
  rightIsGridEnabled,
  setRightIsGridEnabled,
  rightIsInspectMode,
  setRightIsInspectMode,
  startCoderPreview,
  activeTab,
  setActiveTab,
  openFileTabs,
  setOpenFileTabs,
  workspaceRootPath
}) => {
  const [gitChanges, setGitChanges] = useState<any[]>([]);
  const [fileDiffs, setFileDiffs] = useState<Record<string, string>>({});
  const [loadingChanges, setLoadingChanges] = useState(false);
  const [loadingDiff, setLoadingDiff] = useState<Record<string, boolean>>({});

  const fetchGitChanges = async () => {
    setLoadingChanges(true);
    try {
      const res = await fetch('/api/git/changes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceRoot: workspaceRootPath || '.' })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setGitChanges(data.changes);
        }
      }
    } catch (err) {
      console.error("Failed to fetch git changes:", err);
    } finally {
      setLoadingChanges(false);
    }
  };

  const fetchFileDiff = async (filePath: string) => {
    setLoadingDiff(prev => ({ ...prev, [filePath]: true }));
    try {
      const res = await fetch('/api/git/diff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath, workspaceRoot: workspaceRootPath || '.' })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setFileDiffs(prev => ({ ...prev, [filePath]: data.diff }));
        }
      }
    } catch (err) {
      console.error(`Failed to fetch diff for ${filePath}:`, err);
    } finally {
      setLoadingDiff(prev => ({ ...prev, [filePath]: false }));
    }
  };

  useEffect(() => {
    if (isCoderRightPanelOpen) {
      fetchGitChanges();
    }
  }, [isCoderRightPanelOpen, iframeKey, workspaceRootPath]);

  if (!isCoderRightPanelOpen) return null;

  return (
    <motion.div
      initial={{ width: 0, opacity: 0 }}
      animate={{ 
        width: activeTab === 'overview'
          ? (rightViewportMode === 'desktop' ? 480 : rightViewportMode === 'tablet' ? 820 : 440)
          : 540, 
        opacity: 1 
      }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className="h-full border-l border-[#1e1e22] bg-[#141416] flex flex-col overflow-hidden shrink-0 z-10 shadow-2xl transition-all duration-300"
    >
      {/* Tab Selector Header Bar */}
      <div className="shrink-0 bg-zinc-950 border-b border-zinc-900/80 flex items-center justify-between px-3 select-none">
        <div className="flex items-center gap-0.5 overflow-x-auto custom-scrollbar flex-1 pr-4">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-3.5 text-xs font-semibold flex items-center gap-1.5 transition-all border-b-2 cursor-pointer ${
              activeTab === 'overview'
                ? 'border-[#D97756] text-[#D97756]'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            Overview
          </button>
          
          <button
            onClick={() => {
              setActiveTab('review');
              fetchGitChanges();
            }}
            className={`px-3 py-3.5 text-xs font-semibold flex items-center gap-1.5 transition-all border-b-2 cursor-pointer ${
              activeTab === 'review'
                ? 'border-[#D97756] text-[#D97756]'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            Review
          </button>

          {openFileTabs.map(filePath => {
            const fileName = filePath.split('/').pop() || filePath;
            const isActive = activeTab === filePath;
            return (
              <div
                key={filePath}
                className={`flex items-center border-b-2 transition-all shrink-0 ${
                  isActive ? 'border-[#D97756]' : 'border-transparent'
                }`}
              >
                <button
                  onClick={() => {
                    setActiveTab(filePath);
                    if (!fileDiffs[filePath]) {
                      fetchFileDiff(filePath);
                    }
                  }}
                  className={`px-2.5 py-3.5 text-xs font-semibold cursor-pointer flex items-center gap-1.5 ${
                    isActive ? 'text-[#D97756]' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {renderFileIcon(fileName)}
                  <span className="max-w-[70px] truncate">{fileName}</span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenFileTabs(prev => prev.filter(p => p !== filePath));
                    if (activeTab === filePath) {
                      setActiveTab('review');
                    }
                  }}
                  className="p-1 hover:bg-zinc-800 rounded text-zinc-500 hover:text-white mr-1.5 transition-all cursor-pointer"
                >
                  <X size={10} />
                </button>
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-1.5 shrink-0 py-2">
          {activeTab === 'overview' && (
            <button 
              onClick={() => setIframeKey(k => k + 1)}
              className="p-1.5 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition-all cursor-pointer"
              title="Force reload preview frame"
            >
              <RefreshCw size={12} />
            </button>
          )}
          {activeTab === 'review' && (
            <button 
              onClick={fetchGitChanges}
              className={`p-1.5 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition-all cursor-pointer ${loadingChanges ? 'animate-spin' : ''}`}
              title="Refresh changes list"
            >
              <RefreshCw size={12} />
            </button>
          )}
          <button 
            onClick={() => setIsCoderRightPanelOpen(false)}
            className="p-1.5 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition-all cursor-pointer"
            title="Close panel"
          >
            <X size={12} />
          </button>
        </div>
      </div>

      {/* Main Tab Contents */}
      {activeTab === 'overview' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {projectType && ['vite', 'next', 'react', 'node'].includes(projectType) && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-950/80 border-b border-zinc-900/40 shrink-0">
              <span className="text-[10px] text-zinc-500 font-mono whitespace-nowrap">Dev URL:</span>
              <input
                type="text"
                value={devServerUrl}
                onChange={e => setDevServerUrl(e.target.value)}
                placeholder="http://localhost:5173"
                className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-[11px] font-mono text-zinc-300 placeholder-zinc-600 outline-none focus:border-teal-500/40 transition-colors"
              />
              {devServerUrl && (
                <button
                  onClick={() => setIframeKey(k => k + 1)}
                  className="text-[10px] px-2 py-1 rounded bg-teal-500/10 text-teal-400 border border-teal-500/20 hover:bg-teal-500/20 transition-all cursor-pointer font-mono"
                >
                  Go
                </button>
              )}
            </div>
          )}

          {/* Viewport controls bar */}
          <div className="flex items-center gap-1 px-3 py-1.5 bg-zinc-950 border-b border-zinc-900/80 shrink-0">
            <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-0.5">
              <button
                onClick={() => setRightViewportMode('desktop')}
                className={`p-1 rounded-md transition-all cursor-pointer ${
                  rightViewportMode === 'desktop'
                    ? 'bg-[#D97756]/20 border border-[#D97756]/30 text-[#D97756]'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                }`}
                title="Desktop View"
              >
                <Monitor size={10} />
              </button>
              <button
                onClick={() => setRightViewportMode('tablet')}
                className={`p-1 rounded-md transition-all cursor-pointer ${
                  rightViewportMode === 'tablet'
                    ? 'bg-[#D97756]/20 border border-[#D97756]/30 text-[#D97756]'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                }`}
                title="Tablet View (768px Width)"
              >
                <Tablet size={10} />
              </button>
              <button
                onClick={() => setRightViewportMode('mobile')}
                className={`p-1 rounded-md transition-all cursor-pointer ${
                  rightViewportMode === 'mobile'
                    ? 'bg-[#D97756]/20 border border-[#D97756]/30 text-[#D97756]'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                }`}
                title="Mobile View (390px Width)"
              >
                <Smartphone size={10} />
              </button>

              <div className="w-[1px] h-3 bg-zinc-800 mx-1" />

              <button
                onClick={() => setRightIsGridEnabled(!rightIsGridEnabled)}
                className={`p-1 rounded-md transition-all cursor-pointer ${
                  rightIsGridEnabled
                    ? 'bg-[#D97756]/20 border border-[#D97756]/30 text-[#D97756]'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                }`}
                title="Toggle Measurement Grid Overlay"
              >
                <Grid size={10} />
              </button>

              <button
                onClick={() => setRightIsInspectMode(!rightIsInspectMode)}
                className={`p-1 rounded-md transition-all cursor-pointer ${
                  rightIsInspectMode
                    ? 'bg-teal-500/10 border border-teal-500/30 text-teal-400 animate-pulse'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                }`}
                title="Inspect & Select Element from Live Preview"
              >
                <MousePointerClick size={10} className={rightIsInspectMode ? "text-teal-400" : ""} />
              </button>
            </div>
            {projectFramework && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-teal-500/15 text-teal-400 font-mono border border-teal-500/20 ml-auto">{projectFramework}</span>
            )}
          </div>

          {/* Frame Container */}
          <div className="flex-1 overflow-auto flex items-center justify-center p-4 bg-[#070606] relative">
            {rightIsGridEnabled && (
              <div 
                className="absolute inset-0 pointer-events-none z-10 opacity-35" 
                style={{
                  backgroundImage: 'radial-gradient(rgba(217, 119, 86, 0.2) 1px, transparent 1px)',
                  backgroundSize: '16px 16px'
                }}
              />
            )}

            <div 
              style={{
                width: rightViewportMode === 'mobile' ? '390px' : rightViewportMode === 'tablet' ? '768px' : '100%',
                height: rightViewportMode === 'desktop' ? '100%' : '640px',
                transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
              className={`relative bg-white shadow-2xl overflow-hidden ${
                rightViewportMode !== 'desktop' ? 'rounded-2xl border-4 border-[#1D1917]' : 'w-full h-full'
              }`}
            >
              {devServerUrl ? (
                <iframe
                  ref={rightIframeRef}
                  key={iframeKey}
                  src={devServerUrl}
                  className="w-full h-full border-none bg-white"
                  referrerPolicy="no-referrer"
                  title="Workspace App Preview"
                />
              ) : isRightPreviewStarting ? (
                <div className="w-full h-full bg-[#0A0808] flex flex-col items-center justify-center gap-3 text-zinc-500 p-6">
                  <RefreshCw size={18} className="animate-spin text-[#D97756]" />
                  <span className="text-sm font-medium text-zinc-400">Starting preview</span>
                  <div className="max-w-md w-full rounded-lg border border-zinc-800 bg-black/30 p-3 text-left">
                    {(rightPreviewLogs.length ? rightPreviewLogs.slice(-5) : ['Detecting project']).map((log, idx) => (
                      <div key={idx} className="truncate text-[10px] font-mono text-zinc-500">&gt; {log}</div>
                    ))}
                  </div>
                </div>
              ) : rightPreviewError ? (
                <div className="w-full h-full bg-[#0A0808] flex flex-col items-center justify-center gap-3 text-zinc-500 p-6">
                  <span className="text-sm font-medium text-red-400">Preview could not start</span>
                  <span className="max-w-md text-center text-xs text-zinc-600">{rightPreviewError}</span>
                  <button
                    onClick={startCoderPreview}
                    className="mt-2 rounded-lg border border-[#D97756]/30 bg-[#D97756]/10 px-3 py-1.5 text-xs font-semibold text-[#D97756] hover:bg-[#D97756]/20"
                  >
                    Retry
                  </button>
                </div>
              ) : (
                <div className="w-full h-full bg-[#0A0808] flex flex-col items-center justify-center gap-3 text-zinc-500">
                  <div className="w-12 h-12 rounded-xl border border-zinc-800 bg-zinc-900/50 flex items-center justify-center">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6 text-zinc-600">
                      <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                      <path d="M8 21h8"/>
                      <path d="M12 17v4"/>
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-zinc-600">No preview running</span>
                  <button
                    onClick={startCoderPreview}
                    className="text-xs text-[#D97756] hover:underline"
                  >
                    Start workspace preview
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'review' && (
        <div className="flex-1 flex flex-col overflow-y-auto bg-[#0C0B0A] p-4 text-left font-sans">
          <div className="flex items-center justify-between mb-4 border-b border-zinc-800/60 pb-3 select-none">
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Review Changes</h2>
              <p className="text-[10px] text-zinc-500 font-mono mt-0.5 uppercase">Workspace Modified Files List</p>
              {workspaceRootPath && (
                <p className="text-[9px] text-zinc-700 font-mono mt-1 truncate max-w-[360px]">{workspaceRootPath}</p>
              )}
            </div>
            {gitChanges.length > 0 && (
              <span className="text-[10px] bg-[#D97756]/15 text-[#D97756] border border-[#D97756]/20 px-2.5 py-0.5 rounded-full font-bold">
                {gitChanges.length} {gitChanges.length === 1 ? 'FILE' : 'FILES'} CHANGED
              </span>
            )}
          </div>

          {loadingChanges ? (
            <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 select-none py-12 gap-2">
              <Loader2 size={16} className="animate-spin text-[#D97756]" />
              <span className="text-xs font-mono">Scanning git modifications...</span>
            </div>
          ) : gitChanges.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 select-none py-12 gap-1.5 text-center">
              <Check size={18} className="text-emerald-500" />
              <span className="text-xs font-semibold text-zinc-400">No changes detected</span>
              <span className="text-[10px] text-zinc-600 font-mono">Workspace matches HEAD commit clean state</span>
            </div>
          ) : (
            <div className="space-y-2">
              {gitChanges.map((file, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    if (!openFileTabs.includes(file.filePath)) {
                      setOpenFileTabs(prev => [...prev, file.filePath]);
                    }
                    setActiveTab(file.filePath);
                    fetchFileDiff(file.filePath);
                  }}
                  className="group flex items-center justify-between p-3 rounded-xl border border-zinc-800/60 bg-[#141211] hover:border-zinc-700/80 hover:bg-[#1a1715] transition-all duration-200 cursor-pointer shadow-xs select-none"
                >
                  <div className="flex items-center gap-3 min-w-0 pr-4">
                    {renderFileIcon(file.fileName)}
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-semibold text-zinc-200 truncate group-hover:text-white">{file.fileName}</span>
                      <span className="text-[9px] text-zinc-500 font-mono truncate">{file.folder}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 shrink-0">
                    <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold">
                      {file.added > 0 && <span className="text-emerald-500">+{file.added}</span>}
                      {file.removed > 0 && <span className="text-rose-500">-{file.removed}</span>}
                    </div>
                    <ChevronRight size={14} className="text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab !== 'overview' && activeTab !== 'review' && (
        <div className="flex-1 flex flex-col overflow-hidden bg-[#0d0c0c] text-left">
          <div className="h-9 border-b border-zinc-900 bg-zinc-950/80 px-4 flex items-center justify-between shrink-0 select-none">
            <span className="text-[10px] text-zinc-550 font-mono uppercase tracking-wider truncate mr-4">{activeTab}</span>
            <button
              onClick={() => {
                fetchFileDiff(activeTab);
              }}
              className="text-[9px] bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white px-2 py-0.5 rounded font-mono font-bold transition-all cursor-pointer"
            >
              Refresh Diff
            </button>
          </div>

          <div className="flex-1 overflow-auto">
            {loadingDiff[activeTab] ? (
              <div className="w-full h-full flex flex-col items-center justify-center text-zinc-500 gap-2">
                <Loader2 size={16} className="animate-spin text-[#D97756]" />
                <span className="text-xs font-mono">Computing diff lines...</span>
              </div>
            ) : fileDiffs[activeTab] ? (
              <div className="font-mono text-[11.5px] leading-normal overflow-auto h-full w-full bg-[#070606] text-zinc-350 select-text p-2 custom-scrollbar">
                {parseGitDiff(fileDiffs[activeTab]).map((line, idx) => {
                  let bgColor = '';
                  let oldNumStr = '';
                  let newNumStr = '';
                  let textColor = '';
                  let borderStyle = '';
                  
                  if (line.type === 'addition') {
                    bgColor = 'bg-emerald-950/25 border-l-2 border-emerald-500';
                    newNumStr = String(line.newLine);
                    textColor = 'text-[#a7f3d0] dark:text-[#a7f3d0]';
                  } else if (line.type === 'deletion') {
                    bgColor = 'bg-rose-950/25 border-l-2 border-rose-500';
                    oldNumStr = String(line.oldLine);
                    textColor = 'text-[#fecdd3] dark:text-[#fecdd3]';
                  } else if (line.type === 'hunk-header') {
                    bgColor = 'bg-[#18110f]/70 border-b border-[#2C241E]/40 text-zinc-500 py-1.5 font-bold text-[10px]';
                  } else {
                    oldNumStr = String(line.oldLine);
                    newNumStr = String(line.newLine);
                  }
                  
                  return (
                    <div key={idx} className={`flex items-stretch w-full hover:bg-zinc-850/20 ${bgColor} ${borderStyle}`}>
                      {line.type !== 'hunk-header' ? (
                        <>
                          <div className="w-10 text-right pr-2 select-none opacity-30 border-r border-zinc-900 shrink-0 py-0.5">
                            {oldNumStr}
                          </div>
                          <div className="w-10 text-right pr-2 select-none opacity-30 border-r border-zinc-900 shrink-0 py-0.5">
                            {newNumStr}
                          </div>
                          <div className={`pl-3.5 whitespace-pre-wrap break-all py-0.5 flex-1 font-mono font-medium ${textColor}`}>
                            {line.content}
                          </div>
                        </>
                      ) : (
                        <div className="pl-3.5 py-1 font-mono font-bold text-[10px] text-[#D97756]/80 w-full select-none">
                          {line.content}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-zinc-500 select-none gap-1">
                <FileText size={18} className="text-zinc-650" />
                <span className="text-xs font-semibold text-zinc-400">No diff contents</span>
                <span className="text-[9px] text-zinc-600 font-mono">This file has no changes compared to HEAD</span>
              </div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
};
