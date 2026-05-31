import React from 'react';
import { motion } from 'motion/react';
import { 
  RefreshCw, 
  X, 
  Monitor, 
  Tablet, 
  Smartphone, 
  Grid, 
  MousePointerClick 
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
  startCoderPreview
}) => {
  if (!isCoderRightPanelOpen) return null;

  return (
    <motion.div
      initial={{ width: 0, opacity: 0 }}
      animate={{ 
        width: rightViewportMode === 'desktop' ? 480 : rightViewportMode === 'tablet' ? 820 : 440, 
        opacity: 1 
      }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className="h-full border-l border-[#1e1e22] bg-[#141416] flex flex-col overflow-hidden shrink-0 z-10 shadow-2xl transition-all duration-300"
    >
      {/* Top Header & Viewport Selector Bar */}
      <div className="shrink-0">
        <div className="flex items-center justify-between px-3.5 py-2 bg-zinc-950 border-b border-zinc-900/80 select-none">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-350 mr-1">Preview</span>
            {projectFramework && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-500/15 text-teal-400 font-mono border border-teal-500/20">{projectFramework}</span>
            )}
            {projectType && !projectFramework && projectType !== 'unknown' && projectType !== 'empty' && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono border border-zinc-700/50">{projectType}</span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <button 
              onClick={() => setIframeKey(k => k + 1)}
              className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition-all cursor-pointer"
              title="Force reload preview frame"
            >
              <RefreshCw size={12} />
            </button>
            <button 
              onClick={() => setIsCoderRightPanelOpen(false)}
              className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition-all cursor-pointer"
              title="Close App Live Preview"
            >
              <X size={12} />
            </button>
          </div>
        </div>
        {projectType && ['vite', 'next', 'react', 'node'].includes(projectType) && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-950/80 border-b border-zinc-900/40">
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
      </div>

      {/* Viewport controls bar */}
      <div className="flex items-center gap-1 px-3 py-1.5 bg-zinc-950 border-b border-zinc-900/80 shrink-0">
        <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-0.5">
          <button
            onClick={() => setRightViewportMode('desktop')}
            className={`p-1 rounded-md transition-all cursor-pointer ${
              rightViewportMode === 'desktop'
                ? 'bg-[#D97756]/20 border border-[#D97756]/30 text-[#D97756]'
                : 'text-zinc-405 hover:text-white hover:bg-zinc-800'
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
      </div>

      {/* Frame Container */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-4 bg-[#070606] relative">
        {rightIsGridEnabled && (
          <div 
            className="absolute inset-0 pointer-events-none z-10 opacity-30" 
            style={{
              backgroundImage: 'radial-gradient(rgba(217, 119, 86, 0.25) 1px, transparent 1px)',
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
    </motion.div>
  );
};
