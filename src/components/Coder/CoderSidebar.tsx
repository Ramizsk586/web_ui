import React, { useState, useEffect, useMemo } from 'react';
import { 
  Folder, 
  FolderPlus, 
  Code,
  X,
  Trash2,
  Plus,
  PanelRightClose
} from 'lucide-react';
import { Chat } from '../../types';
import { invokeTauri, isTauriDesktop } from '../../utils/tauriDesktop';
import { safeConfirm } from '../../utils/tauriDesktop';

interface CoderSidebarProps {
  workspaceRefreshKey: number;
  triggerWorkspaceRefresh: () => void;
  showToast: (msg: string) => void;
  workspaceRootPath: string;
  onWorkspaceRootPathChange: (path: string) => void;
  chats: Chat[];
  setChats: React.Dispatch<React.SetStateAction<Chat[]>>;
  currentChatId: string | null;
  handleClearChat: () => void;
  onSelectChat: (chatId: string) => void;
  onNewChat: () => void;
  onClose: () => void;
  onExitCoderMode?: () => void;
  onDeleteChat?: (chatId: string) => void;
}

export function CoderSidebar({
  workspaceRefreshKey,
  triggerWorkspaceRefresh,
  showToast,
  workspaceRootPath,
  onWorkspaceRootPathChange,
  chats,
  setChats,
  currentChatId,
  handleClearChat,
  onSelectChat,
  onNewChat,
  onClose,
  onExitCoderMode,
  onDeleteChat
}: CoderSidebarProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedFolderForModal, setSelectedFolderForModal] = useState<string>('');
  const normalizedWorkspacePath = useMemo(
    () => String(workspaceRootPath || '').replace(/\\/g, '/').trim(),
    [workspaceRootPath]
  );
  const activeFolderName = useMemo(() => {
    if (!normalizedWorkspacePath) return '';
    return normalizedWorkspacePath.split('/').filter(Boolean).slice(-1)[0] || normalizedWorkspacePath;
  }, [normalizedWorkspacePath]);
  const folderChats = useMemo(() => {
    return chats.filter(chat =>
      chat.isCoderMode &&
      String(chat.workspacePath || '').replace(/\\/g, '/').trim() === normalizedWorkspacePath
    );
  }, [chats, normalizedWorkspacePath]);

  const handleSelectProjectFolder = async () => {
    try {
      let selectedPath = '';
      if (isTauriDesktop()) {
        selectedPath = await invokeTauri<string | null>('open_folder_dialog') || '';
      } else {
        selectedPath = prompt('Enter the absolute directory path of the project folder:') || '';
      }

      if (selectedPath) {
        setSelectedFolderForModal(selectedPath.trim());
      }
    } catch (err) {
      console.error('Error selecting folder:', err);
      showToast('Could not open folder selection dialog.');
    }
  };

  const handleOpenFolder = () => {
    if (!selectedFolderForModal) {
      showToast('Please select or enter a folder path first.');
      return;
    }

    const path = selectedFolderForModal.replace(/\\/g, '/');
    onWorkspaceRootPathChange(path);
    triggerWorkspaceRefresh();
    setShowCreateModal(false);
    setSelectedFolderForModal('');
    showToast(`Opened folder "${path.split('/').pop() || path}"`);
  };

  const handleRemoveOpenedFolder = () => {
    if (!normalizedWorkspacePath) return;
    if (!safeConfirm(`Remove the opened folder "${activeFolderName}" from Coder mode? This will not delete anything from your device.`)) {
      return;
    }

    if (currentChatId && folderChats.some(chat => chat.id === currentChatId)) {
      onSelectChat('');
    }

    onWorkspaceRootPathChange('');
    triggerWorkspaceRefresh();
    showToast(`Removed folder "${activeFolderName}" from Coder mode.`);
  };

  // Format dynamic relative timestamp (e.g. 5m, 1h, 2d, now)
  const getFriendlyTimestamp = (dateInput: any) => {
    if (!dateInput) return 'now';
    const date = new Date(dateInput);
    const diffMs = Date.now() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays}d`;
    if (diffHours > 0) return `${diffHours}h`;
    if (diffMins > 0) return `${diffMins}m`;
    return 'now';
  };

  return (
    <div className="flex flex-col h-full bg-[#110E0D] text-[#DDD2C4] font-sans select-none overflow-hidden relative border-r border-[#2C241E] w-full">
      {/* 1. Header Toolbar (Toggle Sidebar, Navigation Arrows) */}
      <div className="grid grid-cols-[40px_1fr_40px] items-center px-3.5 py-3 border-b border-[#2C241E] shrink-0 bg-[#161211]">
        <div className="flex items-center justify-start">
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg border border-[#2C241E] bg-[#0E0B0A]/50 text-[#AD9F91] hover:text-[#EDE6DD] hover:bg-[#1D1917] transition-all cursor-pointer flex items-center justify-center"
            title="Collapse Sidebar"
          >
            {/* Sidebar toggle icon */}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="w-3.5 h-3.5">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M9 3v18" />
            </svg>
          </button>
        </div>

        <div className="flex items-center justify-center gap-1.5 text-xs text-[#7F7469] font-semibold select-none">
          <Code size={12} className="text-[#D97756]" />
          <span className="text-[#EDE6DD]">Lumina Coder</span>
        </div>

        <div className="flex items-center justify-end">
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
            className="p-1.5 rounded-lg border border-[#2C241E] bg-[#0E0B0A]/50 text-[#AD9F91] hover:text-[#EDE6DD] hover:bg-[#1D1917] transition-all cursor-pointer flex items-center justify-center"
            title="Clear current chat messages"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* 2. Folder Header & Action Trigger */}
      <div className="flex items-center justify-between px-5 pt-4 pb-2 shrink-0 select-none">
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#7F7469]">Folder</span>
        <div className="flex items-center gap-2 text-[#7F7469] relative">
          <button 
            onClick={() => setShowCreateModal(true)}
            className="p-1 hover:text-[#EDE6DD] transition-all cursor-pointer"
            title="Open Folder"
          >
            <FolderPlus size={12} strokeWidth={2.2} />
          </button>
        </div>
      </div>

      {/* 5. Current Folder & Chats */}
      <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-1.5 custom-scrollbar">
        {!normalizedWorkspacePath ? (
          <div className="px-4 py-8 text-center text-xs text-[#635F59] font-medium leading-relaxed select-none">
            No folder opened.<br />Click the folder icon above to open a project folder.
          </div>
        ) : (
          <div className="space-y-1">
            <div className="group w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-xs font-semibold bg-[#1D1917]/35 border-[#2C241E] text-[#EDE6DD]">
              <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                <Folder size={13} className="text-[#D97756]" />
                <span className="truncate">{activeFolderName}</span>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => onNewChat()}
                  className="p-1 hover:bg-[#2A221E] hover:text-[#EDE6DD] rounded transition-all cursor-pointer text-[#7F7469]"
                  title="Start new chat in this folder"
                >
                  <Plus size={11} />
                </button>
                <button
                  onClick={handleRemoveOpenedFolder}
                  className="p-1 hover:bg-[#2A221E] hover:text-red-400 rounded transition-all cursor-pointer text-[#7F7469]"
                  title="Remove opened folder from coder mode"
                >
                  <Trash2 size={11} />
                </button>
              </div>
            </div>

            <div className="pl-4 pr-1 space-y-1 relative">
              <div className="absolute left-4.5 top-0 bottom-1.5 border-l border-[#2C241E]/50" />
              <div className="pl-4 py-1 text-[9px] text-[#635F59] font-mono truncate select-text">
                {normalizedWorkspacePath}
              </div>
              {folderChats.length === 0 ? (
                <div className="pl-4 py-1.5 text-[10.5px] text-[#635F59] font-medium select-none">
                  No conversations
                </div>
              ) : (
                [...folderChats]
                  .sort((a, b) => {
                    const timeA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
                    const timeB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
                    return timeB - timeA;
                  })
                  .map(chat => {
                    const isChatActive = currentChatId === chat.id;
                    return (
                      <div
                        key={chat.id}
                        onClick={() => onSelectChat(chat.id)}
                        className={`pl-4 pr-2 py-1.5 rounded-lg text-[11px] font-medium transition-all cursor-pointer flex items-center justify-between group/chat
                          ${isChatActive
                            ? 'bg-[#211B18] text-[#EDE6DD] shadow-sm border border-[#2C241E]'
                            : 'text-[#9B8C7D] hover:text-[#EDE6DD] hover:bg-[#161211]/60'
                          }
                        `}
                      >
                        <span className="truncate flex-1 pr-2">
                          {chat.title || 'Untitled Session'}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[9px] font-mono text-[#635F59] font-bold uppercase group-hover/chat:hidden">
                            {getFriendlyTimestamp(chat.updatedAt)}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onDeleteChat) onDeleteChat(chat.id);
                            }}
                            className="p-0.5 opacity-0 group-hover/chat:opacity-100 hover:bg-[#2A221E] hover:text-red-400 rounded transition-all cursor-pointer text-[#7F7469] hidden group-hover/chat:block"
                            title="Delete conversation"
                          >
                            <Trash2 size={10} />
                          </button>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        )}
      </div>

      {/* 6. Close Coder Footer Item */}
      <div className="p-3 shrink-0 border-t border-[#2C241E]/40 bg-[#141110]">
        <button 
          onClick={onExitCoderMode}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-[#1D1917] text-[#AD9F91] hover:text-[#EDE6DD] text-xs font-semibold transition-all cursor-pointer text-left"
        >
          <PanelRightClose size={14} strokeWidth={2.2} />
          <span>Close Coder</span>
        </button>
      </div>

      {/* Create Project Dialog Modal Pop-up */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/65 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-md bg-[#161211] border border-[#2C241E] rounded-2xl shadow-2xl p-5 relative text-left">
            <button
              onClick={() => {
                setShowCreateModal(false);
                setSelectedFolderForModal('');
              }}
              className="absolute right-4 top-4 p-1 hover:bg-[#241C18] rounded text-[#7F7469] hover:text-white transition-all cursor-pointer"
            >
              <X size={14} />
            </button>

            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-2">Open Folder</h3>
            <p className="text-[11px] text-[#AD9F91] mb-5 leading-normal">
              Select or enter the absolute folder directory path for coder mode. Chats below will stay as history for this opened folder.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#7F7469] mb-1.5">Folder Path</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={selectedFolderForModal}
                    onChange={(e) => setSelectedFolderForModal(e.target.value)}
                    placeholder="e.g. C:/Projects/my-app"
                    className="flex-1 h-9 px-3 bg-[#0E0C0B] border border-[#2C241E] rounded-lg text-xs text-[#EDE6DD] focus:outline-none focus:border-[#D97756] transition-colors placeholder-[#635F59]"
                  />
                  <button
                    onClick={handleSelectProjectFolder}
                    className="h-9 px-3 bg-[#241C18] border border-[#2C241E] hover:bg-[#2C221E] text-xs font-bold text-[#EDE6DD] rounded-lg transition-all cursor-pointer flex items-center justify-center shrink-0"
                  >
                    Browse...
                  </button>
                </div>
              </div>

              <div 
                onClick={handleSelectProjectFolder}
                className="py-8 border-2 border-dashed border-[#2C241E] hover:border-[#D97756]/40 rounded-xl bg-[#0E0C0B]/30 hover:bg-[#0E0C0B]/60 transition-all flex flex-col items-center justify-center gap-2 cursor-pointer select-none group"
              >
                <FolderPlus size={24} className="text-[#7F7469] group-hover:text-[#D97756] transition-colors" />
                <span className="text-xs font-semibold text-[#EDE6DD]">{selectedFolderForModal ? 'Change Folder Path' : '+ Open Folder'}</span>
                {selectedFolderForModal && (
                  <span className="text-[9.5px] font-mono text-[#D97756] max-w-[280px] truncate">{selectedFolderForModal}</span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setSelectedFolderForModal('');
                }}
                className="h-9 px-4 hover:bg-[#1D1917] text-xs font-bold text-[#7F7469] hover:text-white rounded-lg transition-all cursor-pointer"
              >
                Skip
              </button>
              <button
                onClick={handleOpenFolder}
                disabled={!selectedFolderForModal}
                className="h-9 px-5 bg-[#D97756] hover:bg-[#e48f73] disabled:opacity-40 disabled:pointer-events-none text-xs font-bold text-white rounded-lg transition-all cursor-pointer shadow-md"
              >
                Open
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
