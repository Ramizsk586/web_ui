import React, { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { 
  Sidebar as SidebarIcon, 
  Sparkles, 
  Trash2, 
  Terminal, 
  Play, 
  Palette, 
  RefreshCw, 
  Code, 
  Activity, 
  FileText, 
  FileJson,
  GitBranch,
  ChevronDown,
  Check,
  Search
} from 'lucide-react';
import { CoderLeftExplorer } from '../CoderLeftExplorer';
import { MessageItem } from '../Chat/MessageItem';
import { LivePreviewPanel } from '../LivePreviewPanel';
import { FloatingCodeEditor } from '../FloatingCodeEditor';
import { invokeTauri, isTauriDesktop, safeConfirm } from '../../utils/tauriDesktop';

import { Message, Chat } from '../../types';

const STABLE_NOOP = () => {};

interface CoderWorkspaceViewProps {
  isCoderLeftPanelOpen: boolean;
  setIsCoderLeftPanelOpen: (open: boolean) => void;
  workspaceRefreshKey: number;
  triggerWorkspaceRefresh: () => void;
  showToast: (msg: string) => void;
  coderWorkspacePath: string;
  setCoderWorkspacePath: (path: string) => void;
  setFloatingEditFile: (file: string | null) => void;
  floatingEditFile: string | null;
  setRightPreviewSubpath: (path: string) => void;
  orchestrationState: any;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  chats: Chat[];
  setChats: any;
  currentChatId: string | null;
  handleClearChat: () => void;
  isWhiteboardOpen: boolean;
  setIsWhiteboardOpen: (open: boolean) => void;
  isCoderRightPanelOpen: boolean;
  setIsCoderRightPanelOpen: (open: boolean) => void;
  messages: Message[];
  markdownComponents: any;
  userProfile: any;
  persona: any;
  handleSetActiveArtifact: (art: any) => void;
  handleSetCanvasView: (view: 'code' | 'preview') => void;
  handleUpdateTodoPlan: (id: string, plan: any) => void;
  handleStartBuildingBtn: (messageId: string) => void;
  scrapingResults: any;
  wikiResults: any;
  handleSend: (event?: any, options?: any) => void;
  renderChatBox: (isCentered: boolean) => React.ReactNode;
  rightViewportMode: 'desktop' | 'tablet' | 'mobile';
  setRightViewportMode: (mode: 'desktop' | 'tablet' | 'mobile') => void;
  projectFramework: string;
  projectType: string;
  iframeKey: number;
  setIframeKey: React.Dispatch<React.SetStateAction<number>>;
  devServerUrl: string;
  setDevServerUrl: (url: string) => void;
  rightIframeRef: React.RefObject<HTMLIFrameElement | null>;
  isRightPreviewStarting: boolean;
  rightPreviewLogs: any[];
  rightPreviewError: string;
  rightIsGridEnabled: boolean;
  setRightIsGridEnabled: (enabled: boolean) => void;
  rightIsInspectMode: boolean;
  setRightIsInspectMode: (inspect: boolean) => void;
  startCoderPreview: () => Promise<void>;
  activeModelId: string;
  activeModelList: any[];
  availableModels: any[];
  handleModelSelect: (id: string) => void;
  modelSelectorMode: 'popup' | 'drawer';
  setIsModelDrawerOpen: (open: boolean) => void;
}

export default function CoderWorkspaceView({
  isCoderLeftPanelOpen,
  setIsCoderLeftPanelOpen,
  workspaceRefreshKey,
  triggerWorkspaceRefresh,
  showToast,
  coderWorkspacePath,
  setCoderWorkspacePath,
  setFloatingEditFile,
  floatingEditFile,
  setRightPreviewSubpath,
  orchestrationState,
  isSidebarOpen,
  setIsSidebarOpen,
  chats,
  setChats,
  currentChatId,
  handleClearChat,
  isWhiteboardOpen,
  setIsWhiteboardOpen,
  isCoderRightPanelOpen,
  setIsCoderRightPanelOpen,
  messages,
  markdownComponents,
  userProfile,
  persona,
  handleSetActiveArtifact,
  handleSetCanvasView,
  handleUpdateTodoPlan,
  handleStartBuildingBtn,
  scrapingResults,
  wikiResults,
  handleSend,
  renderChatBox,
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
  activeModelId,
  activeModelList,
  availableModels,
  handleModelSelect,
  modelSelectorMode,
  setIsModelDrawerOpen,
}: CoderWorkspaceViewProps) {
  const [rightPanelTab, setRightPanelTab] = useState<'overview' | 'review' | string>('review');
  const [openFileTabs, setOpenFileTabs] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [explorerWidth, setExplorerWidth] = useState(280);
  const [isExplorerResizing, setIsExplorerResizing] = useState(false);

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  React.useEffect(() => {
    if (modelSelectorMode === 'drawer') {
      setIsDropdownOpen(false);
    }
  }, [modelSelectorMode]);

  React.useEffect(() => {
    (window as any).openFileInPreview = (filePath: string) => {
      setOpenFileTabs(prev => {
        if (prev.includes(filePath)) return prev;
        return [...prev, filePath];
      });
      setRightPanelTab(filePath);
    };
    return () => {
      delete (window as any).openFileInPreview;
    };
  }, []);

  const filteredModelList = React.useMemo(() => {
    if (!activeModelList) return [];
    return activeModelList.filter((model: any) => {
      const name = (model.name || '').toLowerCase();
      const id = (model.id || '').toLowerCase();
      const q = searchQuery.toLowerCase();
      return name.includes(q) || id.includes(q);
    });
  }, [activeModelList, searchQuery]);

  const handleOpenNativeTerminal = React.useCallback(async () => {
    if (!isTauriDesktop()) {
      showToast('Native terminal launch is available in the desktop app only.');
      return;
    }

    try {
      await invokeTauri('open_native_terminal', {
        cwd: coderWorkspacePath || undefined,
      });
      showToast('Opened Windows terminal in the project directory.');
    } catch (error) {
      console.error('Failed to open native terminal', error);
      showToast('Could not open the native terminal.');
    }
  }, [coderWorkspacePath, showToast]);

  const handleExplorerResizeStart = (e: React.PointerEvent) => {
    e.preventDefault();
    setIsExplorerResizing(true);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const handleMove = (e: PointerEvent) => {
      const newWidth = e.clientX;
      
      // Look up current width of the right preview panel
      let rightPanelWidth = 0;
      if (isCoderRightPanelOpen) {
        const rightPanelEl = document.getElementById('live-preview-panel');
        if (rightPanelEl) {
          rightPanelWidth = rightPanelEl.getBoundingClientRect().width;
        } else {
          rightPanelWidth = 450; // default state fallback
        }
      }
      
      const maxLeftWidth = window.innerWidth - rightPanelWidth - 550; // Keep at least 550px for center chat area
      const finalLeftWidth = Math.min(600, Math.max(200, maxLeftWidth));

      if (newWidth >= 200 && newWidth <= finalLeftWidth) {
        setExplorerWidth(newWidth);
      }
    };
    const handleUp = () => {
      setIsExplorerResizing(false);
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
  };

  return (
    <div className="flex-1 flex overflow-hidden bg-[#0A0908] text-[#EDE6DD] h-full relative font-sans">
      {/* LEFT PANEL: File Explorer (VS Code Styled collapsible sidebar) */}
      <AnimatePresence>
        {isCoderLeftPanelOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: explorerWidth, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: isExplorerResizing ? 0 : 0.22, ease: 'easeOut' }}
            className="h-full border-r border-[#221B17] bg-[#110E0D] flex flex-col overflow-hidden shrink-0 z-10 shadow-xl relative"
          >
            <CoderLeftExplorer 
              workspaceRefreshKey={workspaceRefreshKey}
              triggerWorkspaceRefresh={triggerWorkspaceRefresh}
              showToast={showToast}
              workspaceRootPath={coderWorkspacePath}
              onWorkspaceRootPathChange={setCoderWorkspacePath}
              onSelectFile={(filePath) => {
                setFloatingEditFile(filePath);
                const rel = filePath.replace(/\\/g, '/').split('coder/').pop() || '';
                if (rel) {
                  setRightPreviewSubpath(rel);
                }
              }}
              fileAttributions={orchestrationState.isActive ? orchestrationState.agents.flatMap((a: any) =>
                a.filesCreated.map((fp: string) => ({
                  relativePath: fp.replace(/\\/g, '/'),
                  agentId: a.id,
                  status: a.status === 'done' ? ('done' as const) : a.status === 'needs_review' ? ('needs_review' as const) : ('pending' as const)
                }))
              ) : undefined}
              onClose={() => setIsCoderLeftPanelOpen(false)}
            />
            <div
              onPointerDown={handleExplorerResizeStart}
              className="absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-blue-500/20 active:bg-blue-500/40 transition-colors z-20 group/resizer"
            >
              <div className={`absolute top-0 right-0 w-[2px] h-full transition-colors ${isExplorerResizing ? 'bg-blue-500' : 'bg-transparent group-hover/resizer:bg-blue-500/50'}`} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CENTER PANEL: Standard & customized Coder chat and text layout */}
      <div id="coder-chat-area" className="flex-1 flex flex-col overflow-hidden h-full relative bg-[#0A0908] min-w-[550px]">
        
        {/* Coder Top Navigation Bar */}
        <div className="h-12 border-b border-[#2C241E] px-4 flex items-center justify-between shrink-0 bg-[#151211] backdrop-blur-md relative z-[150]" style={{ backgroundColor: '#151211' }}>
          <div className="flex items-center gap-3">
            {/* Coder Panel Toggles */}
            <div className="flex items-center gap-2 border-r border-[#261E1A] pr-3 mr-1 select-none">
              <button
                onClick={() => {
                  if (isSidebarOpen) {
                    setIsSidebarOpen(false);
                    setIsCoderLeftPanelOpen(true);
                  } else {
                    setIsCoderLeftPanelOpen(!isCoderLeftPanelOpen);
                  }
                }}
                className={`p-2 rounded-lg border transition-all cursor-pointer flex items-center justify-center ${
                  isCoderLeftPanelOpen 
                    ? 'bg-[#D97756]/15 text-[#D97756] border-[#D97756]/40 shadow-inner scale-95' 
                    : 'bg-[#0E0C0B]/40 border-[#2C241E] text-[#9B8C7D] hover:text-[#EDE6DD] hover:bg-[#1D1917] hover:border-[#2C241E]'
                }`}
                title="Toggle Workspace Files Left Sidebar"
              >
                <SidebarIcon size={14} />
              </button>

              <button
                onClick={() => {
                  if (isCoderLeftPanelOpen) {
                    setIsCoderLeftPanelOpen(false);
                    setIsSidebarOpen(true);
                  } else {
                    setIsSidebarOpen(!isSidebarOpen);
                  }
                }}
                className={`p-2 rounded-lg border transition-all cursor-pointer flex items-center justify-center ${
                  isSidebarOpen 
                    ? 'bg-[#D97756]/15 text-[#D97756] border-[#D97756]/40 shadow-inner scale-95' 
                    : 'bg-[#0E0C0B]/40 border-[#2C241E] text-[#9B8C7D] hover:text-[#EDE6DD] hover:bg-[#1D1917] hover:border-[#2C241E]'
                }`}
                title={isSidebarOpen ? "Collapse AI Chat Assistant Panel" : "Expand AI Chat Assistant Panel"}
              >
                <Sparkles size={14} className={isSidebarOpen ? 'animate-pulse text-[#D97756]' : ''} />
              </button>
            </div>

            {/* Actions for current workspace */}
            <div className="flex items-center gap-1.5 select-none">
              <button 
                onClick={() => {
                  const targetId = currentChatId || (chats.length > 0 ? chats[0].id : null);
                  if (!targetId) {
                    showToast("No active conversation to clear.");
                    return;
                  }
                  if (safeConfirm("Are you sure you want to clear all messages on the screen?")) {
                    handleClearChat();
                  }
                }}
                className="p-2 rounded-lg border transition-all cursor-pointer flex items-center justify-center bg-[#0E0C0B]/40 border-[#2C241E] text-[#9B8C7D] hover:text-[#EDE6DD] hover:bg-[#1D1917] hover:border-[#2C241E] active:scale-95"
                title="Clear current chat messages"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>

          {/* Center section: Model button and workspace active status */}
          <div className="flex items-center gap-4">

            {/* Workspace-level Model Selector */}
            <div className="relative inline-block text-left" ref={dropdownRef}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (modelSelectorMode === 'drawer') {
                    setIsDropdownOpen(false);
                    setIsModelDrawerOpen(true);
                    return;
                  }
                  setIsDropdownOpen(!isDropdownOpen);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0E0C0B]/70 hover:bg-[#1D1917] border border-[#2C241E] rounded-full transition-all text-[11px] font-semibold text-[#EDE6DD] cursor-pointer select-none max-w-[210px] shadow-sm font-sans"
                title="Change active model"
              >
                <Sparkles size={11} className="text-amber-500 shrink-0" />
                <span className="truncate max-w-[120px]">
                  {(() => {
                    const matched = activeModelList.find((m) => m.id === activeModelId);
                    if (matched) return matched.name;
                    let name = activeModelId;
                    if (name.includes("/")) {
                      name = name.split("/").slice(-1)[0];
                    }
                    return (
                      name
                        .replace(/[-_]/g, " ")
                        .replace(/\bgguf\b/gi, "")
                        .trim() || activeModelId
                    );
                  })()}
                </span>
                <ChevronDown
                  size={11}
                  className={`text-[#9B8C7D] shrink-0 transition-transform duration-150 ${isDropdownOpen && modelSelectorMode !== 'drawer' ? "rotate-180" : ""}`}
                />
              </button>

              <AnimatePresence>
                {isDropdownOpen && modelSelectorMode !== 'drawer' && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    transition={{ type: "spring", stiffness: 420, damping: 28 }}
                    className="absolute left-1/2 -translate-x-1/2 mt-2 w-[280px] bg-[#151211] border border-[#2C241E] rounded-2xl shadow-2xl z-[180] flex flex-col overflow-hidden text-left"
                  >
                    {/* Header Label Info */}
                    <div className="px-3.5 pt-3 pb-1 select-none flex items-center justify-between shrink-0">
                      <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-[#9B8C7D]">
                        System Model Cores
                      </span>
                      <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-[#0E0C0B] font-bold text-[#D97756]">
                        {filteredModelList.length} Active
                      </span>
                    </div>

                    {availableModels.length > 5 && (
                      <div className="px-3 py-1.5 bg-[#151211] shrink-0">
                        <div className="relative group">
                          <Search
                            size={12}
                            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#9B8C7D] group-focus-within:text-[#D97756] transition-colors"
                          />
                          <input
                            type="text"
                            placeholder="Filter model name..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full h-8 pl-8 pr-3 bg-[#0E0C0B] border border-[#2C241E] rounded-xl text-[11px] outline-none placeholder-[#635F59] focus:border-[#D97756] focus:ring-1 focus:ring-[#D97756]/15 text-[#EDE6DD] font-medium transition-all"
                          />
                        </div>
                      </div>
                    )}

                    <div className="max-h-[230px] overflow-y-auto p-1.5 space-y-1 custom-scrollbar shrink-0 border-t border-[#2C241E]/40 mt-1">
                      {filteredModelList.length > 0 ? (
                        filteredModelList.map((model) => {
                          const isSelected = activeModelId === model.id;
                          const isLocal = model.id.toLowerCase().includes("gguf");

                          return (
                            <button
                              key={model.id}
                              onClick={() => {
                                handleModelSelect(model.id);
                                setIsDropdownOpen(false);
                              }}
                              className={`w-full min-h-[40px] flex items-center gap-3 px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-all shrink-0 border-l-[3px] cursor-pointer ${
                                isSelected
                                  ? "bg-[#1D1917] text-[#EDE6DD] border-[#D97756] shadow-sm"
                                  : "text-[#9B8C7D] hover:bg-[#0E0C0B]/60 hover:text-[#EDE6DD] border-transparent"
                              }`}
                            >
                              <div className="flex-1 text-left min-w-0">
                                <span className={`block truncate ${isSelected ? "font-bold text-[#EDE6DD]" : "font-semibold text-[#9B8C7D]"}`}>
                                  {model.name}
                                </span>
                                <span className="block text-[8px] font-mono text-[#635F59] truncate uppercase tracking-tight">
                                  {isLocal ? "LOCAL GGUF • HOSTED" : model.id.split("/").slice(-1)[0]}
                                </span>
                              </div>

                              {isSelected && (
                                <div className="w-4 h-4 rounded-full bg-[#D97756]/10 flex items-center justify-center ml-auto shrink-0">
                                  <Check size={11} className="text-[#D97756]" strokeWidth={3} />
                                </div>
                              )}
                            </button>
                          );
                        })
                      ) : (
                        <div className="py-8 text-center text-[11px] text-[#635F59] select-none">
                          No cores match criteria
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Right side live preview panel toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsWhiteboardOpen(!isWhiteboardOpen)}
              className={`p-2 rounded-lg border transition-all cursor-pointer flex items-center justify-center ${
                isWhiteboardOpen 
                  ? 'bg-[#D97756]/15 text-[#D97756] border-[#D97756]/40 shadow-inner scale-95' 
                  : 'bg-[#0E0C0B]/40 border-[#2C241E] text-[#9B8C7D] hover:text-[#EDE6DD] hover:bg-[#1D1917] hover:border-[#2C241E]'
              }`}
              title={isWhiteboardOpen ? "Collapse Whiteboard Panel" : "Expand Whiteboard Panel"}
            >
              <Palette size={14} className={isWhiteboardOpen ? 'text-[#D97756]' : ''} />
            </button>

            <button
              onClick={handleOpenNativeTerminal}
              className="p-2 rounded-lg border transition-all cursor-pointer flex items-center justify-center bg-[#0E0C0B]/40 border-[#2C241E] text-[#9B8C7D] hover:text-[#EDE6DD] hover:bg-[#1D1917] hover:border-[#2C241E]"
              title="Open Windows terminal in the project folder"
            >
              <Terminal size={14} />
            </button>

            <button
              onClick={() => {
                if (!isCoderRightPanelOpen) {
                  setIsCoderRightPanelOpen(true);
                  setRightPanelTab('review');
                } else if (rightPanelTab === 'review') {
                  setIsCoderRightPanelOpen(false);
                } else {
                  setRightPanelTab('review');
                }
              }}
              className={`p-2 rounded-lg border transition-all cursor-pointer flex items-center justify-center ${
                isCoderRightPanelOpen && rightPanelTab === 'review'
                  ? 'bg-[#D97756]/15 text-[#D97756] border-[#D97756]/40 shadow-inner scale-95' 
                  : 'bg-[#0E0C0B]/40 border-[#2C241E] text-[#9B8C7D] hover:text-[#EDE6DD] hover:bg-[#1D1917] hover:border-[#2C241E]'
              }`}
              title={isCoderRightPanelOpen && rightPanelTab === 'review' ? "Collapse Changes Review" : "Expand Changes Review"}
            >
              <GitBranch size={14} className={isCoderRightPanelOpen && rightPanelTab === 'review' ? 'text-[#D97756]' : ''} />
            </button>

            <button
              onClick={() => {
                if (!isCoderRightPanelOpen) {
                  setIsCoderRightPanelOpen(true);
                  setRightPanelTab('overview');
                } else if (rightPanelTab === 'overview') {
                  setIsCoderRightPanelOpen(false);
                } else {
                  setRightPanelTab('overview');
                }
              }}
              className={`p-2 rounded-lg border transition-all cursor-pointer flex items-center justify-center ${
                isCoderRightPanelOpen && rightPanelTab === 'overview'
                  ? 'bg-[#D97756]/15 text-[#D97756] border-[#D97756]/40 shadow-inner scale-95' 
                  : 'bg-[#0E0C0B]/40 border-[#2C241E] text-[#9B8C7D] hover:text-[#EDE6DD] hover:bg-[#1D1917] hover:border-[#2C241E]'
              }`}
              title={isCoderRightPanelOpen && rightPanelTab === 'overview' ? "Collapse App Live Preview" : "Expand App Live Preview"}
            >
              <Play size={14} className={isCoderRightPanelOpen && rightPanelTab === 'overview' ? 'animate-pulse text-[#D97756]' : ''} />
            </button>
          </div>
        </div>

        {/* Chat View, Centered Watermarked / Mockup Interface */}
        <div className="flex-1 flex flex-col overflow-hidden relative bg-[#131210]" style={{ backgroundColor: '#131210' }}>
          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar scroll-smooth"
            style={{ backgroundColor: '#131210' }}
          >
            <div className="mx-auto space-y-6 pb-6 max-w-4xl xl:max-w-[1100px]">
              {messages.length === 0 ? (
                <div className="min-h-[50vh] flex flex-col items-center justify-center text-center px-4 relative w-full animate-fade-in animate-duration-300">
                  <p className="text-[#9B8C7D] max-w-sm mb-6 text-sm">
                    Lumina Coder Workspace. Describe a component to build, or run instructions below.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {messages.map((message) => (
                    <MessageItem
                      key={message.id}
                      message={message}
                      markdownComponents={markdownComponents}
                      userProfile={userProfile}
                      persona={persona}
                      isCoderMode={true}
                      isSourcesPanelOpen={false}
                      setIsSourcesPanelOpen={STABLE_NOOP}
                      setSourcesPanelMessageId={STABLE_NOOP}
                      setActiveArtifact={handleSetActiveArtifact}
                      setIsCanvasOpen={STABLE_NOOP}
                      setCanvasView={handleSetCanvasView}
                      onOpenInEditor={setFloatingEditFile}
                      showToast={showToast}
                      onUpdateTodoPlan={handleUpdateTodoPlan}
                      onStartBuilding={handleStartBuildingBtn}
                      scrapingResults={scrapingResults}
                      wikiResults={wikiResults}
                      onSendMessage={handleSend}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="px-6 pb-6 pt-2 z-30 shrink-0 bg-transparent border-transparent">
            <div className={`mx-auto relative transition-all duration-300 ${
              messages.length === 0 
                ? 'max-w-xl md:max-w-2xl' 
                : 'max-w-4xl xl:max-w-[1100px]'
            }`}>
              {renderChatBox(messages.length === 0)}
            </div>
          </div>
        </div>

      </div>

      {/* RIGHT PANEL: Live App Preview Frame (collapsible sidebar) */}
      <AnimatePresence>
        <LivePreviewPanel
          isCoderRightPanelOpen={isCoderRightPanelOpen}
          setIsCoderRightPanelOpen={setIsCoderRightPanelOpen}
          rightViewportMode={rightViewportMode}
          setRightViewportMode={setRightViewportMode}
          projectFramework={projectFramework}
          projectType={projectType}
          iframeKey={iframeKey}
          setIframeKey={setIframeKey}
          devServerUrl={devServerUrl}
          setDevServerUrl={setDevServerUrl}
          rightIframeRef={rightIframeRef}
          isRightPreviewStarting={isRightPreviewStarting}
          rightPreviewLogs={rightPreviewLogs}
          rightPreviewError={rightPreviewError}
          rightIsGridEnabled={rightIsGridEnabled}
          setRightIsGridEnabled={setRightIsGridEnabled}
          rightIsInspectMode={rightIsInspectMode}
          setRightIsInspectMode={setRightIsInspectMode}
          startCoderPreview={startCoderPreview}
          activeTab={rightPanelTab}
          setActiveTab={setRightPanelTab}
          openFileTabs={openFileTabs}
          setOpenFileTabs={setOpenFileTabs}
          workspaceRootPath={coderWorkspacePath}
          orchestrationState={orchestrationState}
          onOpenFile={setFloatingEditFile}
          isCoderLeftPanelOpen={isCoderLeftPanelOpen}
          explorerWidth={explorerWidth}
        />
      </AnimatePresence>

      {floatingEditFile && (
        <FloatingCodeEditor 
          filePath={floatingEditFile}
          onClose={() => setFloatingEditFile(null)}
          showToast={showToast}
          triggerWorkspaceRefresh={triggerWorkspaceRefresh}
          workspaceRootPath={coderWorkspacePath}
        />
      )}
    </div>
  );
}
