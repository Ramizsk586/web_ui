import React, { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { 
  Sidebar as SidebarIcon, 
  Sparkles, 
  Trash2, 
  Terminal, 
  SquareTerminal, 
  Play, 
  Palette, 
  Bot, 
  RefreshCw, 
  X, 
  Maximize2, 
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
import TerminalConsole from '../TerminalConsole';
import { LivePreviewPanel } from '../LivePreviewPanel';
import { FloatingCodeEditor } from '../FloatingCodeEditor';

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
  isTerminalOpen: boolean;
  setIsTerminalOpen: (open: boolean) => void;
  isTerminalPopupOpen: boolean;
  setIsTerminalPopupOpen: (open: boolean) => void;
  isCoderRightPanelOpen: boolean;
  setIsCoderRightPanelOpen: (open: boolean) => void;
  elizaToggleSignal: number;
  setElizaToggleSignal: React.Dispatch<React.SetStateAction<number>>;
  isElizaActive: boolean;
  setIsElizaActive: (active: boolean) => void;
  setWorkspaceRefreshKey: React.Dispatch<React.SetStateAction<number>>;
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
  isTerminalOpen,
  setIsTerminalOpen,
  isTerminalPopupOpen,
  setIsTerminalPopupOpen,
  isCoderRightPanelOpen,
  setIsCoderRightPanelOpen,
  elizaToggleSignal,
  setElizaToggleSignal,
  isElizaActive,
  setIsElizaActive,
  setWorkspaceRefreshKey,
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

  const filteredModelList = React.useMemo(() => {
    if (!activeModelList) return [];
    return activeModelList.filter((model: any) => {
      const name = (model.name || '').toLowerCase();
      const id = (model.id || '').toLowerCase();
      const q = searchQuery.toLowerCase();
      return name.includes(q) || id.includes(q);
    });
  }, [activeModelList, searchQuery]);

  const handleExplorerResizeStart = (e: React.PointerEvent) => {
    e.preventDefault();
    setIsExplorerResizing(true);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const handleMove = (e: PointerEvent) => {
      const newWidth = e.clientX;
      if (newWidth >= 200 && newWidth <= 600) {
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
      <div className="flex-1 flex flex-col overflow-hidden h-full relative bg-[#0A0908]">
        
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
                  if (window.confirm("Are you sure you want to clear all messages on the screen?")) {
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
                  className={`text-[#9B8C7D] shrink-0 transition-transform duration-150 ${isDropdownOpen ? "rotate-180" : ""}`}
                />
              </button>

              <AnimatePresence>
                {isDropdownOpen && (
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
              onClick={() => setIsTerminalOpen(!isTerminalOpen)}
              className={`p-2 rounded-lg border transition-all cursor-pointer flex items-center justify-center ${
                isTerminalOpen 
                  ? 'bg-[#D97756]/15 text-[#D97756] border-[#D97756]/40 shadow-inner scale-95' 
                  : 'bg-[#0E0C0B]/40 border-[#2C241E] text-[#9B8C7D] hover:text-[#EDE6DD] hover:bg-[#1D1917] hover:border-[#2C241E]'
              }`}
              title={isTerminalOpen ? "Collapse Terminal Panel" : "Expand Terminal Panel"}
            >
              <Terminal size={14} className={isTerminalOpen ? 'text-[#D97756]' : ''} />
            </button>

            <button
              onClick={() => setIsTerminalPopupOpen(!isTerminalPopupOpen)}
              className={`p-2 rounded-lg border transition-all cursor-pointer flex items-center justify-center ${
                isTerminalPopupOpen 
                  ? 'bg-[#D97756]/15 text-[#D97756] border-[#D97756]/40 shadow-inner scale-95' 
                  : 'bg-[#0E0C0B]/40 border-[#2C241E] text-[#9B8C7D] hover:text-[#EDE6DD] hover:bg-[#1D1917] hover:border-[#2C241E]'
              }`}
              title={isTerminalPopupOpen ? "Close Terminal Popup" : "Open Terminal Popup Panel"}
            >
              <SquareTerminal size={14} className={isTerminalPopupOpen ? 'text-[#D97756]' : ''} />
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

        {/* Collapsible Integrated Terminal */}
        <AnimatePresence>
          {isTerminalOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 280, opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="h-[280px] border-t border-[#2C241E] bg-[#030302] flex flex-col overflow-hidden shrink-0 z-20"
            >
              {/* Header */}
              <div className="h-8 bg-[#0F0D0C] border-b border-[#2C241E] px-4 flex items-center justify-between shrink-0 select-none">
                <div className="flex items-center gap-2">
                  <Terminal size={12} className="text-[#D97756]" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#D97756]">Developer Shell Terminal</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setIsTerminalPopupOpen(true);
                      setIsTerminalOpen(false);
                    }}
                    className="p-1 hover:bg-[#201916] rounded text-[#AD9F91] hover:text-[#EDE6DD] transition-all cursor-pointer"
                    title="Pop Out Terminal to Popup Panel"
                  >
                    <Maximize2 size={11} />
                  </button>
                  <button
                    onClick={() => setElizaToggleSignal((s: number) => s + 1)}
                    className={`p-1 rounded transition-all cursor-pointer border ${
                      isElizaActive
                        ? 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20'
                        : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20 hover:bg-indigo-500/20 hover:text-white'
                    }`}
                    title={isElizaActive ? "Exit ELIZA Psychotherapist CLI" : "Launch ELIZA Psychotherapist CLI"}
                  >
                    <Bot size={11} className={isElizaActive ? "animate-bounce text-pink-400" : ""} />
                  </button>
                  <button
                    onClick={() => {
                      setWorkspaceRefreshKey((k: number) => k + 1);
                    }}
                    className="p-1 hover:bg-[#201916] rounded text-[#AD9F91] hover:text-[#EDE6DD] transition-all cursor-pointer"
                    title="Refresh Filesystem State"
                  >
                    <RefreshCw size={11} />
                  </button>
                  <button 
                    onClick={() => setIsTerminalOpen(false)}
                    className="p-1 hover:bg-[#201916] rounded text-[#7F7469] hover:text-[#EDE6DD] transition-all cursor-pointer"
                    title="Close Terminal Console"
                  >
                    <X size={11} />
                  </button>
                </div>
              </div>
              {/* Terminal Console Component */}
              <div className="flex-1 min-h-0">
                <TerminalConsole 
                  workspaceRoot={coderWorkspacePath}
                  isCoderMode={true}
                  onToast={showToast} 
                  triggerRefresh={() => setWorkspaceRefreshKey((k: number) => k + 1)}
                  onElizaActiveChange={(active) => setIsElizaActive(active)}
                  elizaToggleSignal={elizaToggleSignal}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
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
        />
      </AnimatePresence>

      {/* Floating manual code editor */}
      {floatingEditFile && (
        <FloatingCodeEditor 
          filePath={floatingEditFile}
          onClose={() => setFloatingEditFile(null)}
          showToast={showToast}
          triggerWorkspaceRefresh={triggerWorkspaceRefresh}
        />
      )}

      {/* Floating manual terminal popup panel */}
      <AnimatePresence>
        {isTerminalPopupOpen && (
          <div className="fixed inset-0 bg-[#0F0D0C]/85 backdrop-blur-md flex items-center justify-center z-[200] p-4 md:p-6 select-none animate-fade-in animate-duration-200">
            <motion.div 
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-4xl h-[78vh] bg-[#141211] border border-[#2D241E] rounded-2xl flex flex-col overflow-hidden shadow-[0_32px_80px_rgba(10,8,7,0.85)] relative font-sans"
            >
              {/* Soft ambient glow backing */}
              <div className="absolute top-0 left-0 w-64 h-64 bg-[#D97756]/5 rounded-full blur-[70px] pointer-events-none" />
              <div className="absolute bottom-0 right-0 w-64 h-64 bg-teal-500/3 rounded-full blur-[70px] pointer-events-none" />

              {/* Header */}
              <div className="h-14 border-b border-[#2C241E] bg-[#1F1917]/95 px-5 flex items-center justify-between shrink-0 relative z-10 select-none backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[#D97756]/15 text-[#D97756] border border-[#D97756]/20">
                    <SquareTerminal size={16} />
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-bold text-[#EDE6DD] tracking-wider uppercase font-sans">
                      Interactive Developer Shell
                    </span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
                      <span className="text-[10px] font-mono text-[#AD9F91]">
                        Terminal Popup Mode
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setElizaToggleSignal((s: number) => s + 1)}
                    className={`p-2 border rounded-lg transition-all cursor-pointer flex items-center justify-center ${
                      isElizaActive
                        ? 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20'
                        : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20 hover:bg-indigo-500/20 hover:text-white'
                    }`}
                    title={isElizaActive ? "Exit ELIZA Psychotherapist CLI" : "Launch ELIZA Psychotherapist CLI"}
                  >
                    <Bot size={12} className={isElizaActive ? "animate-bounce text-pink-400" : ""} />
                  </button>

                  <button
                    onClick={() => setWorkspaceRefreshKey((k: number) => k + 1)}
                    className="p-2 border border-[#2D241E] bg-[#1C1816]/40 text-[#AD9F91] hover:text-white rounded-lg transition-all cursor-pointer flex items-center gap-1.5 text-xs font-medium"
                    title="Refresh Filesystem State"
                  >
                    <RefreshCw size={12} />
                    <span className="text-[10px] font-semibold">Sync</span>
                  </button>

                  <button
                    onClick={() => setIsTerminalPopupOpen(false)}
                    className="p-2 hover:bg-[#2A2420] border border-[#2F2722] bg-[#1C1816]/50 rounded-lg text-[#AD9F91] hover:text-white transition-all cursor-pointer"
                    title="Close Terminal Popup"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>

              {/* Interactive Terminal TerminalConsole */}
              <div className="flex-1 min-h-0 bg-[#060505]">
                <TerminalConsole 
                  workspaceRoot={coderWorkspacePath}
                  isCoderMode={true}
                  onToast={showToast} 
                  triggerRefresh={() => setWorkspaceRefreshKey((k: number) => k + 1)}
                  onElizaActiveChange={(active) => setIsElizaActive(active)}
                  elizaToggleSignal={elizaToggleSignal}
                />
              </div>

              {/* Footer Info Bar */}
              <div className="h-9 border-t border-[#2C241E] bg-[#0F0E0D] px-5 flex items-center justify-between text-[10px] text-[#7F7469] font-mono shrink-0 select-none">
                <span>Server Terminal environment: Active on port 3000</span>
                <span>Press ESC or click outside to dismiss</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
