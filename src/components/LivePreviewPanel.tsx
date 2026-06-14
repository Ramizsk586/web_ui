import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  FileText,
  RotateCw,
  Maximize2,
  Lock,
  Signal,
  Wifi,
  Battery,
  Bot,
  GitBranch,
  Terminal,
  Search,
  AlertCircle,
  Settings,
  Activity
} from 'lucide-react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

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
  activeTab: 'overview' | 'review' | 'workflow' | string;
  setActiveTab: (tab: 'overview' | 'review' | 'workflow' | string) => void;
  openFileTabs: string[];
  setOpenFileTabs: React.Dispatch<React.SetStateAction<string[]>>;
  workspaceRootPath?: string;
  orchestrationState?: any;
  onOpenFile?: (filePath: string) => void;
  isCoderLeftPanelOpen?: boolean;
  explorerWidth?: number;
}

interface DiffLine {
  oldLine?: number;
  newLine?: number;
  type: 'addition' | 'deletion' | 'normal' | 'hunk-header';
  content: string;
}

interface AndroidTimeState {
  hours: string;
  minutes: string;
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

function getCurrentTime(): AndroidTimeState {
  const now = new Date();
  return {
    hours: String(now.getHours()).padStart(2, '0'),
    minutes: String(now.getMinutes()).padStart(2, '0'),
  };
}

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
  workspaceRootPath,
  orchestrationState,
  onOpenFile,
  isCoderLeftPanelOpen,
  explorerWidth
}) => {
  const [gitChanges, setGitChanges] = useState<any[]>([]);
  const [fileDiffs, setFileDiffs] = useState<Record<string, string>>({});
  const [loadingChanges, setLoadingChanges] = useState(false);
  const [loadingDiff, setLoadingDiff] = useState<Record<string, boolean>>({});
  const [fileContents, setFileContents] = useState<Record<string, string>>({});
  const [loadingContents, setLoadingContents] = useState<Record<string, boolean>>({});
  const [fileViewMode, setFileViewMode] = useState<Record<string, 'diff' | 'rendered'>>({});
  const [isLandscape, setIsLandscape] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [androidTime, setAndroidTime] = useState<AndroidTimeState>(getCurrentTime);
  const [artifacts, setArtifacts] = useState<any[]>([]);
  const [loadingArtifacts, setLoadingArtifacts] = useState(false);

  const [panelWidth, setPanelWidth] = useState(() => activeTab === 'overview'
    ? (rightViewportMode === 'desktop' ? 480 : rightViewportMode === 'tablet' ? 820 : 440)
    : 540);
  const [isResizing, setIsResizing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateTime = () => setAndroidTime(getCurrentTime());
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleResizeStart = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    setIsResizing(true);
    document.body.style.cursor = 'col-resize';
  }, []);

  const handleResizeMove = useCallback((e: PointerEvent) => {
    if (!isResizing) return;
    const newWidth = window.innerWidth - e.clientX;
    const leftWidth = isCoderLeftPanelOpen ? (explorerWidth ?? 280) : 0;
    const maxRightWidth = window.innerWidth - leftWidth - 550; // Keep at least 550px for the chat center area
    const finalRightWidth = Math.min(maxRightWidth, window.innerWidth - 280);
    
    if (newWidth >= 280 && newWidth <= finalRightWidth) {
      setPanelWidth(newWidth);
    }
  }, [isResizing, isCoderLeftPanelOpen, explorerWidth]);

  const handleResizeEnd = useCallback(() => {
    setIsResizing(false);
    document.body.style.cursor = 'default';
  }, []);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('pointermove', handleResizeMove);
      window.addEventListener('pointerup', handleResizeEnd);
      window.addEventListener('pointercancel', handleResizeEnd);
    }
    return () => {
      window.removeEventListener('pointermove', handleResizeMove);
      window.removeEventListener('pointerup', handleResizeEnd);
      window.removeEventListener('pointercancel', handleResizeEnd);
    };
  }, [isResizing, handleResizeMove, handleResizeEnd]);

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

  const fetchArtifacts = async () => {
    setLoadingArtifacts(true);
    try {
      const res = await fetch('/api/fs/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderPath: '.', workspaceRoot: workspaceRootPath || '.' })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.files) {
          const mdFiles = data.files.filter((f: any) => !f.isDirectory && f.name.toLowerCase().endsWith('.md'));
          setArtifacts(mdFiles);
        }
      }
    } catch (err) {
      console.error("Failed to fetch artifacts:", err);
    } finally {
      setLoadingArtifacts(false);
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

  const fetchFileContent = async (filePath: string) => {
    setLoadingContents(prev => ({ ...prev, [filePath]: true }));
    try {
      const fullPath = workspaceRootPath ? `${workspaceRootPath.replace(/\\/g, '/')}/${filePath}` : `./${filePath}`;
      const res = await fetch('/api/fs/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: fullPath, workspaceRoot: workspaceRootPath || '.' })
      });
      if (res.ok) {
        const data = await res.json();
        setFileContents(prev => ({ ...prev, [filePath]: data.content || '' }));
      }
    } catch (err) {
      console.error(`Failed to read content for ${filePath}:`, err);
    } finally {
      setLoadingContents(prev => ({ ...prev, [filePath]: false }));
    }
  };

  useEffect(() => {
    if (isCoderRightPanelOpen) {
      if (activeTab === 'workflow') {
        fetchGitChanges();
        fetchArtifacts();
      } else if (activeTab === 'review') {
        fetchGitChanges();
      } else if (activeTab !== 'overview') {
        fetchFileDiff(activeTab);
        fetchFileContent(activeTab);
      }
    }
  }, [isCoderRightPanelOpen, activeTab, iframeKey, workspaceRootPath]);

  // Live-update polling for .md files (especially TODO.md)
  useEffect(() => {
    if (!isCoderRightPanelOpen || activeTab === 'overview' || activeTab === 'review' || activeTab === 'workflow') return;
    if (!activeTab.toLowerCase().endsWith('.md')) return;

    const pollInterval = setInterval(() => {
      fetchFileContent(activeTab);
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [isCoderRightPanelOpen, activeTab]);

  const isDesktop = rightViewportMode === 'desktop';
  const isMobile = rightViewportMode === 'mobile';
  const isTablet = rightViewportMode === 'tablet';

  const getViewportDimensions = () => {
    if (isDesktop) {
      return { width: '100%', height: '100%' };
    }
    if (isMobile) {
      return {
        width: isLandscape ? '780px' : '390px',
        height: isLandscape ? '390px' : '780px',
      };
    }
    return {
      width: isLandscape ? '1024px' : '768px',
      height: isLandscape ? '768px' : '1024px',
    };
  };

  const vp = getViewportDimensions();

  const renderPreviewFrame = () => (
    <div
      style={{
        width: vp.width,
        height: vp.height,
        transform: `scale(${zoom})`,
        transformOrigin: 'top center',
      }}
    >
      {renderDeviceFrame()}
    </div>
  );

  const renderDesktopFrame = () => (
    <div className="flex items-start justify-center h-full w-full p-4 sm:p-6 md:p-8 overflow-auto hide-scrollbar">
      <div
        className="relative w-full max-w-full h-full min-h-[400px] flex flex-col overflow-hidden rounded-xl border border-white/[0.08] bg-[#1c1c1e] shadow-[0_20px_60px_rgba(0,0,0,0.5)] shrink-0"
        style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}
      >
        <div className="h-9 bg-[#252528] border-b border-white/[0.06] flex items-center px-3 gap-3 shrink-0 select-none">
          <div className="flex items-center gap-1.5 flex-row">
            <div className="w-3 h-3 rounded-full bg-[#ff5f57] border border-[#ff5f57]/40 shadow-sm" />
            <div className="w-3 h-3 rounded-full bg-[#febc2e] border border-[#febc2e]/40 shadow-sm" />
            <div className="w-3 h-3 rounded-full bg-[#28c840] border border-[#28c840]/40 shadow-sm" />
          </div>

          <div className="flex-1 flex items-center justify-center min-w-0 font-sans">
            <div className="flex items-center gap-2 bg-[#1c1c1e]/80 border border-white/[0.04] rounded-md px-3 py-0.5 max-w-[60%]">
              <Lock size={8} className="text-emerald-400 shrink-0" />
              <span className="text-[10px] text-white/50 font-mono truncate">
                {devServerUrl || 'Preview'}
              </span>
            </div>
          </div>

          <div className="w-[52px]" />
        </div>

        <div className="flex-1 min-h-0 w-full relative bg-white overflow-hidden rounded-b-xl">
          {renderIframeContent()}
        </div>
      </div>
    </div>
  );

  const renderMobileFrame = () => {
    const timeStr = `${androidTime.hours}:${androidTime.minutes}`;
    return (
      <div className="flex w-full justify-center min-h-full items-start px-4 pt-6 pb-12">
        <div
          className="relative shrink-0 overflow-hidden transition-all duration-300"
          style={{ 
            width: vp.width, 
            height: vp.height,
            transform: `scale(${zoom})`,
            transformOrigin: 'top center'
          }}
        >
          <div
            className="relative flex h-full flex-col overflow-hidden rounded-[42px] border-[12px] border-[#222224] bg-[#0d0d0d] shadow-[0_30px_70px_rgba(0,0,0,0.9)]"
          >
            <div
              className={`absolute bg-[#1a1a1c] border border-white/5 shadow-md z-30 ${
                isLandscape
                  ? 'top-[-13px] left-[120px] w-[50px] h-[3px] rounded-t-sm'
                  : 'right-[-13px] top-[120px] w-[3px] h-[50px] rounded-r-sm'
              }`}
            />
            <div
              className={`absolute bg-[#1a1a1c] border border-white/5 shadow-md z-30 ${
                isLandscape
                  ? 'top-[-13px] left-[180px] w-[40px] h-[3px] rounded-t-sm'
                  : 'right-[-13px] top-[180px] w-[3px] h-[40px] rounded-r-sm'
              }`}
            />

            <div className="h-6 bg-black flex items-center justify-between px-4 select-none text-[10px] text-white/95 font-sans tracking-tight shrink-0 relative z-20 border-b border-white/[0.03]">
              <span className="font-semibold tracking-wide">{timeStr}</span>
              <div className="flex items-center gap-2">
                <Signal size={11} className="text-white/80" />
                <Wifi size={11} className="text-white/80" />
                <div className="flex items-center gap-0.5">
                  <span className="text-[9px] font-mono opacity-80 mr-0.5">85%</span>
                  <Battery size={11} className="text-white/80" />
                </div>
              </div>
            </div>

            <div className="flex-1 min-h-0 w-full relative bg-white overflow-hidden">
              {renderIframeContent()}
            </div>

            <div className="h-[28px] bg-black flex items-center justify-around px-16 select-none shrink-0 border-t border-white/[0.03] z-20">
              <button
                onClick={() => {
                  try {
                    if (rightIframeRef.current && rightIframeRef.current.contentWindow) {
                      rightIframeRef.current.contentWindow.history.back();
                    }
                  } catch { }
                }}
                className="w-10 h-10 rounded-full hover:bg-white/[0.08] active:scale-90 flex items-center justify-center cursor-pointer group"
              >
                <svg className="w-3 h-3 text-white/45 group-hover:text-white/90 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="17,19 7,12 17,5" fill="currentColor" />
                </svg>
              </button>

              <button
                onClick={() => {
                  if (rightIframeRef.current) {
                    setIframeKey(k => k + 1);
                  }
                }}
                className="w-10 h-10 rounded-full hover:bg-white/[0.08] active:scale-95 flex items-center justify-center cursor-pointer group"
              >
                <div className="w-3.5 h-3.5 rounded-full border-2 border-white/45 group-hover:border-white/90 transition-colors" />
              </button>

              <button className="w-10 h-10 rounded-full active:scale-90 flex items-center justify-center cursor-default group opacity-60">
                <div className="w-3 h-3 border-2 rounded-sm border-white/45" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderTabletFrame = () => {
    const timeStr = `${androidTime.hours}:${androidTime.minutes}`;
    return (
      <div className="flex w-full justify-center min-h-full items-start px-4 pt-6 pb-12">
        <div
          className="relative shrink-0 overflow-hidden transition-all duration-300"
          style={{ 
            width: vp.width, 
            height: vp.height,
            transform: `scale(${zoom})`,
            transformOrigin: 'top center'
          }}
        >
          <div
            className="relative flex h-full flex-col overflow-hidden rounded-[32px] border-[8px] border-[#222224] bg-[#0d0d0d] shadow-[0_30px_70px_rgba(0,0,0,0.9)]"
          >
            <div
              className={`absolute bg-[#1a1a1c] border border-white/5 shadow-md z-30 ${
                isLandscape
                  ? 'top-[-10px] left-[120px] w-[40px] h-[3px] rounded-t-sm'
                  : 'right-[-10px] top-[120px] w-[3px] h-[40px] rounded-r-sm'
              }`}
            />

            <div className="h-6 bg-black flex items-center justify-between px-5 select-none text-[10px] text-white/95 font-sans tracking-tight shrink-0 relative z-20 border-b border-white/[0.03]">
              <span className="font-semibold tracking-wide">{timeStr}</span>
              <div className="flex items-center gap-2.5">
                <Signal size={11} className="text-white/80" />
                <Wifi size={11} className="text-white/80" />
                <div className="flex items-center gap-0.5">
                  <span className="text-[9px] font-mono opacity-80 mr-0.5">92%</span>
                  <Battery size={11} className="text-white/80" />
                </div>
              </div>
            </div>

            <div className="flex-1 min-h-0 w-full relative bg-white overflow-hidden">
              {renderIframeContent()}
            </div>

            <div className="h-[24px] bg-black flex items-center justify-center select-none shrink-0 border-t border-white/[0.03] z-20">
              <div className="w-[120px] h-[4px] rounded-full bg-white/30" />
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderDeviceFrame = () => {
    if (isDesktop) return renderDesktopFrame();
    if (isMobile) return renderMobileFrame();
    if (isTablet) return renderTabletFrame();
    return null;
  };

  const renderIframeContent = () => {
    if (devServerUrl) {
      return (
        <iframe
          ref={rightIframeRef}
          key={iframeKey}
          src={devServerUrl}
          className="w-full h-full border-none bg-white"
          referrerPolicy="no-referrer"
          title="Workspace App Preview"
        />
      );
    }

    if (isRightPreviewStarting) {
      return (
        <div className="w-full h-full bg-[#0A0808] flex flex-col items-center justify-center gap-3 text-zinc-500 p-6">
          <RefreshCw size={18} className="animate-spin text-[#D97756]" />
          <span className="text-sm font-medium text-zinc-400">Starting preview</span>
          <div className="max-w-md w-full rounded-lg border border-zinc-800 bg-black/30 p-3 text-left">
            {(rightPreviewLogs.length ? rightPreviewLogs.slice(-5) : ['Detecting project']).map((log, idx) => (
              <div key={idx} className="truncate text-[10px] font-mono text-zinc-500">&gt; {log}</div>
            ))}
          </div>
        </div>
      );
    }

    if (rightPreviewError) {
      return (
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
      );
    }

    return (
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
    );
  };

  if (!isCoderRightPanelOpen) return null;

  return (
    <motion.div
      id="live-preview-panel"
      ref={panelRef}
      initial={{ width: 0, opacity: 0 }}
      animate={{ 
        width: panelWidth,
        opacity: 1 
      }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className="h-full border-l border-[#1e1e22] bg-[#141416] flex flex-col overflow-hidden shrink-0 z-10 shadow-2xl relative"
    >
      {/* ── Drag Resize Handle ── */}
      <div
        onPointerDown={handleResizeStart}
        className="absolute top-0 -left-1 w-2 h-full cursor-col-resize z-50 flex items-center justify-center group touch-none"
      >
        <div className="w-[3px] h-8 rounded-full bg-zinc-600/50 group-hover:bg-[#D97756] group-hover:h-12 transition-all duration-150" />
      </div>

      {/* ── Overlay during resize to block iframe pointer events ── */}
      {isResizing && (
        <div className="absolute inset-0 z-[60] bg-transparent cursor-col-resize select-none" />
      )}
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

          <button
            onClick={() => {
              setActiveTab('workflow');
              fetchGitChanges();
              fetchArtifacts();
            }}
            className={`px-3 py-3.5 text-xs font-semibold flex items-center gap-1.5 transition-all border-b-2 cursor-pointer ${
              activeTab === 'workflow'
                ? 'border-[#D97756] text-[#D97756]'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            Workflow
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
          {activeTab === 'workflow' && (
            <button 
              onClick={() => {
                fetchGitChanges();
                fetchArtifacts();
              }}
              className={`p-1.5 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition-all cursor-pointer ${loadingChanges || loadingArtifacts ? 'animate-spin' : ''}`}
              title="Refresh workflow data"
            >
              <RefreshCw size={12} />
            </button>
          )}

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
                  isDesktop
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
                  isTablet
                    ? 'bg-[#D97756]/20 border border-[#D97756]/30 text-[#D97756]'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                }`}
                title="Tablet View"
              >
                <Tablet size={10} />
              </button>
              <button
                onClick={() => setRightViewportMode('mobile')}
                className={`p-1 rounded-md transition-all cursor-pointer ${
                  isMobile
                    ? 'bg-[#D97756]/20 border border-[#D97756]/30 text-[#D97756]'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                }`}
                title="Mobile View"
              >
                <Smartphone size={10} />
              </button>

              {/* Orientation toggle - only for mobile/tablet */}
              {!isDesktop && (
                <>
                  <div className="w-[1px] h-3 bg-zinc-800 mx-1" />
                  <button
                    onClick={() => setIsLandscape(prev => !prev)}
                    className={`p-1 rounded-md transition-all cursor-pointer ${
                      isLandscape
                        ? 'bg-[#D97756]/20 border border-[#D97756]/30 text-[#D97756]'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                    }`}
                    title={isLandscape ? 'Switch to Portrait' : 'Switch to Landscape'}
                  >
                    <RotateCw size={10} className={isLandscape ? 'rotate-90' : ''} />
                  </button>
                </>
              )}

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

            {/* Zoom controls */}
            <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-0.5 ml-1">
              <button
                onClick={() => setZoom(z => Math.max(0.25, +(z - 0.1).toFixed(2)))}
                className="px-1.5 py-0.5 text-[9px] text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors cursor-pointer"
                title="Zoom out"
              >
                -
              </button>
              <span className="px-1 text-[9px] text-zinc-500 w-8 text-center font-mono select-none">{Math.round(zoom * 100)}%</span>
              <button
                onClick={() => setZoom(z => Math.min(2, +(z + 0.1).toFixed(2)))}
                className="px-1.5 py-0.5 text-[9px] text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors cursor-pointer"
                title="Zoom in"
              >
                +
              </button>
            </div>

            {projectFramework && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-teal-500/15 text-teal-400 font-mono border border-teal-500/20 ml-auto">{projectFramework}</span>
            )}
          </div>

          {/* Frame Container */}
          <div className="flex-1 overflow-auto flex items-center justify-center bg-[#070606] relative hide-scrollbar">
            {rightIsGridEnabled && (
              <div 
                className="absolute inset-0 pointer-events-none z-10 opacity-35" 
                style={{
                  backgroundImage: 'radial-gradient(rgba(217, 119, 86, 0.2) 1px, transparent 1px)',
                  backgroundSize: '16px 16px'
                }}
              />
            )}

            {isDesktop ? (
              renderDesktopFrame()
            ) : (
              <div className="h-full w-full overflow-auto flex items-start justify-center hide-scrollbar">
                {isMobile ? renderMobileFrame() : renderTabletFrame()}
              </div>
            )}
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

      {activeTab === 'workflow' && (
        <div className="flex-1 flex flex-col overflow-y-auto bg-[#0C0B0A] p-4 text-left font-sans space-y-6">
          <div className="flex items-center justify-between border-b border-zinc-800/60 pb-3 select-none">
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Workflow</h2>
              <p className="text-[10px] text-zinc-500 font-mono mt-0.5 uppercase">Workspace Orchestration Dock</p>
            </div>
          </div>

          {/* 1. Subagents Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-zinc-400 uppercase tracking-wider select-none">
              <Bot size={14} className="text-[#D97756]" />
              <span>Subagents</span>
              {orchestrationState?.agents?.length > 0 && (
                <span className="text-[9px] bg-zinc-800 text-zinc-400 px-1.5 py-0.2 rounded font-mono ml-auto">
                  {orchestrationState.agents.length}
                </span>
              )}
            </div>
            
            {!orchestrationState?.agents || orchestrationState.agents.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-zinc-850 bg-zinc-950/20 text-center select-none text-zinc-500 text-[11px]">
                No active subagents. They will appear here when spawned.
              </div>
            ) : (
              <div className="space-y-2">
                {orchestrationState.agents.map((agent: any, idx: number) => {
                  let statusColor = 'bg-zinc-600';
                  let statusBg = 'bg-zinc-950/30';
                  let pulseClass = '';

                  if (agent.status === 'running') {
                    statusColor = 'bg-emerald-500';
                    statusBg = 'bg-emerald-500/10 border-emerald-500/20';
                    pulseClass = 'animate-pulse';
                  } else if (agent.status === 'done') {
                    statusColor = 'bg-teal-500';
                    statusBg = 'bg-teal-500/10 border-teal-500/20';
                  } else if (agent.status === 'failed') {
                    statusColor = 'bg-rose-500';
                    statusBg = 'bg-rose-500/10 border-rose-500/20';
                  } else if (agent.status === 'waiting') {
                    statusColor = 'bg-amber-500';
                    statusBg = 'bg-amber-500/10 border-amber-500/20';
                  } else if (agent.status === 'needs_review') {
                    statusColor = 'bg-orange-500';
                    statusBg = 'bg-orange-500/10 border-orange-500/20';
                  }

                  return (
                    <div 
                      key={agent.id || idx}
                      className="flex flex-col p-3 rounded-xl border border-zinc-850 bg-[#141211] transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${statusColor} ${pulseClass}`} />
                          <span className="text-xs font-semibold text-zinc-200">{agent.name || 'Subagent'}</span>
                        </div>
                        <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-550 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-850">
                          {agent.status}
                        </span>
                      </div>

                      {agent.error && (
                        <div className="mt-2 text-[10px] text-rose-400 bg-rose-950/20 border border-rose-900/30 rounded p-1.5 flex items-start gap-1.5 font-mono">
                          <AlertCircle size={12} className="shrink-0 mt-0.5" />
                          <span className="break-all">{agent.error}</span>
                        </div>
                      )}

                      {agent.events && agent.events.length > 0 && (
                        <div className="mt-3 space-y-2 border-t border-zinc-800/40 pt-3">
                          <div className="text-[9px] text-zinc-500 uppercase tracking-wider font-mono select-none">Execution Steps:</div>
                          <div className="relative pl-4 space-y-3.5 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-zinc-800">
                            {agent.events.map((evt: any, evtIdx: number) => {
                              const isCompleted = evt.status === 'complete';
                              const isFailed = evt.status === 'failed';
                              const isActive = evt.status === 'active' || evt.status === 'running';
                              
                              let iconEl = <Activity size={10} />;
                              if (evt.name?.includes('file') || evt.name?.includes('code')) {
                                iconEl = <FileText size={10} />;
                              } else if (evt.name?.includes('command')) {
                                iconEl = <Terminal size={10} />;
                              } else if (evt.name?.includes('search')) {
                                iconEl = <Search size={10} />;
                              }
                              
                              let statusIconColor = 'text-zinc-500 bg-zinc-900 border-zinc-800';
                              if (isCompleted) {
                                statusIconColor = 'text-emerald-400 bg-emerald-950/30 border-emerald-800/50';
                              } else if (isFailed) {
                                statusIconColor = 'text-rose-400 bg-rose-950/30 border-rose-800/50';
                              } else if (isActive) {
                                statusIconColor = 'text-amber-400 bg-amber-950/30 border-amber-800/50 animate-pulse';
                              }

                              const getToolDesc = (name: string, input: any) => {
                                if (!input) return '';
                                switch (name) {
                                  case 'read_file':
                                  case 'write_file':
                                  case 'edit_file':
                                  case 'create_file':
                                  case 'delete_file':
                                    return input.filePath ? input.filePath.split('/').pop() : '';
                                  case 'rename_file':
                                    return `${input.filePath?.split('/').pop()} → ${input.newPath?.split('/').pop()}`;
                                  case 'run_command':
                                    return input.command || '';
                                  case 'search_code':
                                    return `"${input.query}"`;
                                  default:
                                    return JSON.stringify(input);
                                }
                              };

                              const toolDesc = getToolDesc(evt.name, evt.input);

                              return (
                                <div key={evt.id || evtIdx} className="relative flex items-start gap-2.5">
                                  {/* Connector bullet */}
                                  <div className={`absolute -left-[14px] top-1 w-2.5 h-2.5 rounded-full flex items-center justify-center border ${statusIconColor} z-10 text-[7px]`}>
                                    {isActive && <Loader2 size={6} className="animate-spin" />}
                                    {isCompleted && <Check size={6} />}
                                    {isFailed && <span className="font-bold text-[7px] leading-[8px]">×</span>}
                                  </div>
                                  
                                  <div className="flex-1 min-w-0 flex flex-col">
                                    <div className="flex items-center gap-1.5 justify-between">
                                      <span className="text-[10px] font-semibold text-zinc-300 font-mono flex items-center gap-1">
                                        {iconEl}
                                        {evt.name}
                                      </span>
                                      <span className={`text-[8px] font-mono capitalize ${isCompleted ? 'text-emerald-500/80' : isFailed ? 'text-rose-500/80' : isActive ? 'text-amber-500/80 animate-pulse' : 'text-zinc-500'}`}>
                                        {evt.status}
                                      </span>
                                    </div>
                                    {toolDesc && (
                                      <span className="text-[9px] text-zinc-400 font-mono mt-0.5 break-all line-clamp-2" title={toolDesc}>
                                        {toolDesc}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      
                      {agent.filesCreated && agent.filesCreated.length > 0 && (
                        <div className="mt-3 pl-4 border-l border-zinc-800 space-y-1">
                          <div className="text-[9px] text-zinc-500 uppercase tracking-wider font-mono">Files:</div>
                          {agent.filesCreated.map((f: string, fIdx: number) => (
                            <div 
                              key={fIdx}
                              onClick={() => {
                                if (onOpenFile) {
                                  onOpenFile(f);
                                }
                              }}
                              className="text-[10px] text-[#D97756] hover:underline cursor-pointer font-mono truncate"
                              title="Click to open file in editor"
                            >
                              {f.split('/').pop() || f}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 2. Files Changed Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-zinc-400 uppercase tracking-wider select-none">
              <GitBranch size={14} className="text-[#D97756]" />
              <span>Files Changed</span>
              {gitChanges.length > 0 && (
                <span className="text-[9px] bg-[#D97756]/15 text-[#D97756] border border-[#D97756]/20 px-1.5 py-0.2 rounded-full font-mono ml-auto">
                  {gitChanges.length}
                </span>
              )}
            </div>

            {loadingChanges ? (
              <div className="flex items-center justify-center text-zinc-500 select-none py-4 gap-2">
                <Loader2 size={12} className="animate-spin text-[#D97756]" />
                <span className="text-[11px] font-mono">Scanning modifications...</span>
              </div>
            ) : gitChanges.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-zinc-850 bg-zinc-950/20 text-center select-none text-zinc-500 text-[11px]">
                No files modified. Workspace matches clean HEAD.
              </div>
            ) : (
              <div className="space-y-1.5">
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
                    className="group flex items-center justify-between p-2.5 rounded-xl border border-zinc-800/50 bg-[#141211] hover:border-zinc-700/80 hover:bg-[#1a1715] transition-all cursor-pointer shadow-xs select-none"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-4">
                      {renderFileIcon(file.fileName)}
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-semibold text-zinc-200 truncate group-hover:text-white">{file.fileName}</span>
                        <span className="text-[8px] text-zinc-550 font-mono truncate">{file.folder}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center gap-1 text-[10px] font-mono font-bold">
                        {file.added > 0 && <span className="text-emerald-500">+{file.added}</span>}
                        {file.removed > 0 && <span className="text-rose-500">-{file.removed}</span>}
                      </div>
                      <ChevronRight size={12} className="text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 3. Artifacts Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-zinc-400 uppercase tracking-wider select-none">
              <FileText size={14} className="text-[#D97756]" />
              <span>Artifacts</span>
              {artifacts.length > 0 && (
                <span className="text-[9px] bg-zinc-800 text-zinc-400 px-1.5 py-0.2 rounded font-mono ml-auto">
                  {artifacts.length}
                </span>
              )}
            </div>

            {loadingArtifacts ? (
              <div className="flex items-center justify-center text-zinc-500 select-none py-4 gap-2">
                <Loader2 size={12} className="animate-spin text-[#D97756]" />
                <span className="text-[11px] font-mono">Scanning artifacts...</span>
              </div>
            ) : artifacts.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-zinc-850 bg-zinc-950/20 text-center select-none text-zinc-500 text-[11px]">
                No markdown artifacts found in the workspace root.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-1.5">
                {artifacts.map((file, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      if (onOpenFile) {
                        onOpenFile(file.path);
                      }
                    }}
                    className="group flex items-center justify-between p-2.5 rounded-xl border border-zinc-850 bg-[#141211] hover:border-[#D97756]/40 hover:bg-[#1a1715] transition-all cursor-pointer shadow-xs select-none"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-4">
                      <FileText size={14} className="text-[#D97756] shrink-0" />
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-semibold text-zinc-200 truncate group-hover:text-white">{file.name}</span>
                        <span className="text-[8px] text-zinc-550 font-mono truncate">{file.relativePath}</span>
                      </div>
                    </div>
                    <ChevronRight size={12} className="text-zinc-650 group-hover:text-zinc-400 transition-colors" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 4. Background Tasks Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-zinc-400 uppercase tracking-wider select-none">
              <Terminal size={14} className="text-[#D97756]" />
              <span>Background Tasks</span>
            </div>

            <div className="space-y-2">
              {/* Dev Server Task */}
              <div className="flex flex-col p-3 rounded-xl border border-zinc-850 bg-[#141211] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${devServerUrl ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-650'}`} />
                    <span className="text-xs font-semibold text-zinc-200">Web Preview Dev Server</span>
                  </div>
                  <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-550 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">
                    {devServerUrl ? 'running' : 'stopped'}
                  </span>
                </div>
                
                {devServerUrl && (
                  <div className="text-[10px] text-zinc-450 font-mono break-all bg-zinc-950/40 p-1.5 rounded border border-zinc-900">
                    <a href={devServerUrl} target="_blank" rel="noopener noreferrer" className="hover:underline text-[#D97756]">
                      {devServerUrl}
                    </a>
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      )}

      {activeTab !== 'overview' && activeTab !== 'review' && activeTab !== 'workflow' && (() => {
        const viewMode = fileViewMode[activeTab] || (activeTab.toLowerCase().endsWith('.md') ? 'rendered' : 'diff');
        return (
          <div className="flex-1 flex flex-col overflow-hidden bg-[#0d0c0c] text-left">
            {!activeTab.toLowerCase().endsWith('.md') && (
              <div className="h-9 border-b border-zinc-900 bg-zinc-950/80 px-4 flex items-center justify-between shrink-0 select-none">
                <span className="text-[10px] text-zinc-550 font-mono uppercase tracking-wider truncate mr-4">{activeTab}</span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      setFileViewMode(prev => ({
                        ...prev,
                        [activeTab]: viewMode === 'rendered' ? 'diff' : 'rendered'
                      }));
                    }}
                    className="text-[9px] h-5 px-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[#D97756] hover:text-[#e48f73] rounded font-mono font-bold transition-all cursor-pointer flex items-center justify-center"
                  >
                    {viewMode === 'rendered' ? 'Show Diff' : 'Show Document'}
                  </button>
                  <button
                    onClick={() => {
                      if (viewMode === 'rendered') {
                        fetchFileContent(activeTab);
                      } else {
                        fetchFileDiff(activeTab);
                      }
                    }}
                    className="text-[9px] h-5 px-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white rounded font-mono font-bold transition-all cursor-pointer flex items-center justify-center"
                  >
                    Refresh
                  </button>
                </div>
              </div>
            )}

            <div className="flex-1 overflow-hidden flex flex-col bg-[#070606]">
              {viewMode === 'rendered' ? (
                loadingContents[activeTab] ? (
                  <div className="w-full h-full flex flex-col items-center justify-center text-zinc-500 gap-2 p-12">
                    <Loader2 size={16} className="animate-spin text-[#D97756]" />
                    <span className="text-xs font-mono">Loading file contents...</span>
                  </div>
                ) : fileContents[activeTab] !== undefined ? (
                  <div className="p-6 text-left select-text markdown-body overflow-y-auto h-full text-zinc-300 font-sans space-y-4 max-w-3xl mx-auto custom-scrollbar [&_h1]:text-lg [&_h1]:font-bold [&_h1]:text-white [&_h1]:border-b [&_h1]:border-zinc-850 [&_h1]:pb-2 [&_h1]:mb-4 [&_h2]:text-base [&_h2]:font-bold [&_h2]:text-zinc-100 [&_h2]:mt-4 [&_h2]:mb-2 [&_p]:text-sm [&_p]:text-zinc-300 [&_ul]:space-y-2.5 [&_li]:list-none [&_li]:flex [&_li]:items-start [&_li]:gap-3 [&_li]:text-sm [&_li]:text-zinc-300 [&_input[type=checkbox]]:mt-1 [&_input[type=checkbox]]:w-4 [&_input[type=checkbox]]:h-4 [&_input[type=checkbox]]:rounded [&_input[type=checkbox]]:border-zinc-750 [&_input[type=checkbox]]:bg-zinc-900 [&_input[type=checkbox]]:text-[#D97756] [&_input[type=checkbox]]:focus:ring-0 [&_input[type=checkbox]]:pointer-events-none">
                    <Markdown 
                      remarkPlugins={[remarkGfm]}
                      components={{
                        input: ({ node, ...props }) => {
                          if (props.type === 'checkbox') {
                            return (
                              <input
                                {...props}
                                className={`w-4 h-4 rounded border-zinc-750 bg-zinc-900 text-[#D97756] focus:ring-0 pointer-events-none ${props.className || ''}`}
                                readOnly
                              />
                            );
                          }
                          return <input {...props} />;
                        }
                      }}
                    >{fileContents[activeTab]}</Markdown>
                  </div>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-zinc-500 py-12 select-none gap-1">
                    <FileText size={18} className="text-zinc-650" />
                    <span className="text-xs font-semibold text-zinc-400">Empty or unreadable file</span>
                    <span className="text-[9px] text-zinc-600 font-mono">The content of this file is empty or could not be loaded</span>
                  </div>
                )
              ) : (
                loadingDiff[activeTab] ? (
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
                )
              )}
            </div>
          </div>
        );
      })()}
    </motion.div>
  );
};
