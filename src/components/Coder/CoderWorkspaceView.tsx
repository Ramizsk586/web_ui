import React, { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { 
  Play, 
  Folder,
  Code,
  Terminal,
  ChevronDown
} from 'lucide-react';
import { CoderSidebar } from './CoderSidebar';
import { CoderInputBox } from './CoderInputBox';
import { MessageItem } from '../Chat/MessageItem';
import { LivePreviewPanel } from '../LivePreviewPanel';
import { invokeTauri, isTauriDesktop } from '../../utils/tauriDesktop';
import { safeConfirm } from '../../utils/tauriDesktop';

import { Message, Chat, CoderPermissionMode } from '../../types';

const STABLE_NOOP = () => {};

interface CoderWorkspaceViewProps {
  isCoderLeftPanelOpen: boolean;
  setIsCoderLeftPanelOpen: (open: boolean) => void;
  workspaceRefreshKey: number;
  triggerWorkspaceRefresh: () => void;
  showToast: (msg: string) => void;
  coderWorkspacePath: string;
  setCoderWorkspacePath: (path: string) => void;
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
  activeAssistantMode: 'builder' | 'planner' | 'debugger' | 'reviewer' | 'tester' | 'plain';
  setActiveAssistantMode: (mode: 'builder' | 'planner' | 'debugger' | 'reviewer' | 'tester' | 'plain') => void;
  showTodoPanel: boolean;
  setShowTodoPanel: (show: boolean) => void;
  coderTodos: Array<{ id: string; content: string; status: string }>;
  todoCollapsed: boolean;
  setTodoCollapsed: (collapsed: boolean) => void;
  createNewChat: (projectId?: string | null, isCoder?: boolean, isResearch?: boolean, agentId?: string) => void;
  onSelectChat?: (chatId: string) => void;
  // Chat input props
  input: string;
  setInput: (val: string) => void;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  handleKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  adjustTextareaHeight: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  isTyping: boolean;
  abortControllerRef: React.MutableRefObject<AbortController | null>;
  isVoiceListening?: boolean;
  startVoiceDictation?: (locale?: string) => void;
  stopVoiceDictation?: (autoSend?: boolean) => void;
  voiceInterimText?: string;
  voiceError?: string | null;
  attachedFiles: File[];
  setAttachedFiles: React.Dispatch<React.SetStateAction<File[]>>;
  handleFileAttach?: (files: File[]) => void;
  coderPermissionMode: CoderPermissionMode;
  setCoderPermissionMode: (mode: CoderPermissionMode) => void;
  onExitCoderMode?: () => void;
}

export default function CoderWorkspaceView({
  isCoderLeftPanelOpen,
  setIsCoderLeftPanelOpen,
  workspaceRefreshKey,
  triggerWorkspaceRefresh,
  showToast,
  coderWorkspacePath,
  setCoderWorkspacePath,
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
  activeAssistantMode,
  setActiveAssistantMode,
  showTodoPanel,
  setShowTodoPanel,
  coderTodos,
  todoCollapsed,
  setTodoCollapsed,
  createNewChat,
  onSelectChat,
  input,
  setInput,
  inputRef,
  handleKeyDown,
  adjustTextareaHeight,
  isTyping,
  abortControllerRef,
  isVoiceListening,
  startVoiceDictation,
  stopVoiceDictation,
  voiceInterimText,
  voiceError,
  attachedFiles,
  setAttachedFiles,
  handleFileAttach,
  coderPermissionMode,
  setCoderPermissionMode,
  onExitCoderMode
}: CoderWorkspaceViewProps) {
  const [rightPanelTab, setRightPanelTab] = useState<'overview' | 'review' | string>('review');
  const scrollRef = useRef<HTMLDivElement>(null);
  const [openFileTabs, setOpenFileTabs] = useState<string[]>([]);
  const normalizedWorkspacePath = String(coderWorkspacePath || '').replace(/\\/g, '/').trim();
  const activeFolderName = normalizedWorkspacePath
    ? normalizedWorkspacePath.split('/').filter(Boolean).slice(-1)[0] || normalizedWorkspacePath
    : '';
  const currentModelName = React.useMemo(() => {
    const matched = activeModelList.find((m: any) => m.id === activeModelId);
    if (matched) return matched.name;
    let name = activeModelId;
    if (name.includes('/')) {
      name = name.split('/').slice(-1)[0];
    }
    return name.replace(/[-_]/g, ' ').replace(/\bgguf\b/gi, '').trim() || activeModelId;
  }, [activeModelId, activeModelList]);
  const handleOpenFileNotice = React.useCallback((filePath: string) => {
    const fileName = String(filePath || '').replace(/\\/g, '/').split('/').filter(Boolean).slice(-1)[0] || filePath || 'file';
    showToast(`Built-in editor removed. Use your external editor for "${fileName}".`);
  }, [showToast]);

  return (
    <div className="flex-1 flex overflow-hidden bg-[#0A0908] text-[#EDE6DD] h-full relative font-sans">
      {/* LEFT SIDEBAR: Project Navigation */}
      <AnimatePresence>
        {isCoderLeftPanelOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="h-full border-r border-[#221B17] bg-[#110E0D] flex flex-col overflow-hidden shrink-0 z-10 shadow-xl relative"
          >
            <CoderSidebar 
              workspaceRefreshKey={workspaceRefreshKey}
              triggerWorkspaceRefresh={triggerWorkspaceRefresh}
              showToast={showToast}
              workspaceRootPath={coderWorkspacePath}
              onWorkspaceRootPathChange={setCoderWorkspacePath}
              chats={chats}
              setChats={setChats}
              currentChatId={currentChatId}
              handleClearChat={handleClearChat}
              onSelectChat={(chatId) => {
                if (onSelectChat) onSelectChat(chatId);
              }}
              onNewChat={() => {
                if (createNewChat) createNewChat(undefined, true, false);
              }}
              onClose={() => setIsCoderLeftPanelOpen(false)}
              onExitCoderMode={onExitCoderMode}
              onDeleteChat={(chatId) => {
                if (safeConfirm("Are you sure you want to delete this conversation?")) {
                  const remainingChats = chats.filter(c => c.id !== chatId);
                  const remainingFolderChats = remainingChats
                    .filter(chat =>
                      chat.isCoderMode &&
                      String(chat.workspacePath || '').replace(/\\/g, '/').trim() === normalizedWorkspacePath
                    )
                    .sort((a, b) => {
                      const timeA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
                      const timeB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
                      return timeB - timeA;
                    });

                  setChats(remainingChats);
                  if (currentChatId === chatId) {
                    if (remainingFolderChats.length > 0) {
                      if (onSelectChat) onSelectChat(remainingFolderChats[0].id);
                    } else if (createNewChat) {
                      createNewChat(undefined, true, false);
                    }
                  }
                  showToast("Conversation deleted.");
                }
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* CENTER PANEL: Chat Area */}
      <div id="coder-chat-area" className="flex-1 flex flex-col overflow-hidden h-full relative bg-[#0A0908] min-w-[400px]">
        {/* Top Bar */}
        <div className="h-14 border-b border-[#2C241E] px-4 flex items-center justify-between shrink-0 bg-[#151211] backdrop-blur-md relative z-[150]">
          <div className="flex items-center gap-3">
            {/* Sidebar toggle */}
            {!isCoderLeftPanelOpen && (
              <button
                onClick={() => setIsCoderLeftPanelOpen(true)}
                className="p-1.5 rounded-lg border border-[#2C241E] bg-[#0E0B0A]/50 text-[#AD9F91] hover:text-[#EDE6DD] hover:bg-[#1D1917] transition-all cursor-pointer flex items-center justify-center mr-1"
                title="Expand Sidebar"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="w-3.5 h-3.5">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <path d="M9 3v18" />
                </svg>
              </button>
            )}

            {activeFolderName && (
              <div className="flex items-center gap-1.5 text-xs text-[#7F7469] font-semibold select-none">
                <Folder size={12} className="text-[#D97756]" />
                <span className="text-[#EDE6DD]">{activeFolderName}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (modelSelectorMode === 'drawer') {
                  setIsModelDrawerOpen(true);
                } else {
                  showToast('Switch model selector to drawer mode in settings to use the sidebar panel here.');
                }
              }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border transition-all cursor-pointer bg-[#0E0C0B]/40 border-[#2C241E] text-[#E8DFD1] hover:text-[#F5EFE7] hover:bg-[#1D1917] hover:border-[#2C241E] max-w-[220px]"
              title="Change active model"
            >
              <span className="truncate text-sm font-medium">{currentModelName}</span>
              <ChevronDown size={12} className="text-[#8A8178] shrink-0" />
            </button>

            <button
              onClick={async () => {
                const targetPath = coderWorkspacePath || '.';

                if (!isTauriDesktop()) {
                  showToast('Native terminal launch is only available in the desktop app.');
                  return;
                }

                try {
                  await invokeTauri('open_native_terminal', { cwd: targetPath });
                } catch (error) {
                  console.error('Failed to open native terminal:', error);
                  showToast('Could not open terminal for the current project.');
                }
              }}
              className="p-2 rounded-lg border transition-all cursor-pointer flex items-center justify-center bg-[#0E0C0B]/40 border-[#2C241E] text-[#9B8C7D] hover:text-[#EDE6DD] hover:bg-[#1D1917] hover:border-[#2C241E]"
              title="Open terminal in current project"
            >
              <Terminal size={14} />
            </button>

            {/* Preview toggle */}
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
              title="Toggle Live Preview"
            >
              <Play size={14} className={isCoderRightPanelOpen && rightPanelTab === 'overview' ? 'animate-pulse text-[#D97756]' : ''} />
            </button>
          </div>
        </div>

        {/* Chat Messages Area */}
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
                      onOpenInEditor={handleOpenFileNotice}
                      showToast={showToast}
                      onUpdateTodoPlan={handleUpdateTodoPlan}
                      onStartBuilding={handleStartBuildingBtn}
                      wikiResults={wikiResults}
                      onSendMessage={handleSend}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* New Coder Input Box */}
          <div className="px-6 pb-6 pt-2 z-30 shrink-0 bg-transparent border-transparent">
            <div className={`mx-auto relative transition-all duration-300 ${
              messages.length === 0 
                ? 'max-w-xl md:max-w-2xl' 
                : 'max-w-4xl xl:max-w-[1100px]'
            }`}>
              <CoderInputBox
                activeAssistantMode={activeAssistantMode}
                setActiveAssistantMode={setActiveAssistantMode}
                coderWorkspacePath={coderWorkspacePath}
                isCoderMode={true}
                input={input}
                setInput={setInput}
                inputRef={inputRef}
                handleKeyDown={handleKeyDown}
                handleSend={() => handleSend()}
                adjustTextareaHeight={adjustTextareaHeight}
                isTyping={isTyping}
                abortControllerRef={abortControllerRef}
                showToast={showToast}
                isCenteredState={messages.length === 0}
                attachedFiles={attachedFiles}
                setAttachedFiles={setAttachedFiles}
                handleFileAttach={handleFileAttach}
                coderPermissionMode={coderPermissionMode}
                setCoderPermissionMode={setCoderPermissionMode}
                showTodoPanel={showTodoPanel}
                setShowTodoPanel={setShowTodoPanel}
                coderTodos={coderTodos}
                todoCollapsed={todoCollapsed}
                setTodoCollapsed={setTodoCollapsed}
              />
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: Live Preview */}
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
          workspaceRootPath={coderWorkspacePath}
          orchestrationState={orchestrationState}
          onOpenFile={handleOpenFileNotice}
          isCoderLeftPanelOpen={isCoderLeftPanelOpen}
          explorerWidth={280}
          openFileTabs={openFileTabs}
          setOpenFileTabs={setOpenFileTabs}
        />
      </AnimatePresence>
    </div>
  );
}
