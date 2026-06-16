import React, { useState, useRef, useEffect } from 'react';
import { 
  Folder, 
  Plus, 
  History, 
  Clock, 
  Settings, 
  FolderPlus, 
  SlidersHorizontal,
  ChevronDown, 
  ChevronRight,
  ArrowLeft,
  ArrowRight,
  X,
  PlusCircle,
  Play,
  MoreVertical,
  Trash2
} from 'lucide-react';
import { Chat } from '../../types';
import { invokeTauri, isTauriDesktop } from '../../utils/tauriDesktop';

interface Project {
  id: string;
  name: string;
  path: string;
  description?: string;
}

interface CoderSidebarProps {
  workspaceRefreshKey: number;
  triggerWorkspaceRefresh: () => void;
  showToast: (msg: string) => void;
  workspaceRootPath: string;
  onWorkspaceRootPathChange: (path: string) => void;
  chats: Chat[];
  setChats: React.Dispatch<React.SetStateAction<Chat[]>>;
  currentChatId: string | null;
  onSelectChat: (chatId: string) => void;
  onNewChat: (projectId?: string | null) => void;
  onClose: () => void;
  projectFolders: Project[];
  setProjectFolders: React.Dispatch<React.SetStateAction<Project[]>>;
  activeProjectId: string | null;
  setActiveProjectId: (id: string | null) => void;
  onOpenSettings?: () => void;
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
  onSelectChat,
  onNewChat,
  onClose,
  projectFolders,
  setProjectFolders,
  activeProjectId,
  setActiveProjectId,
  onOpenSettings
}: CoderSidebarProps) {
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedFolderForModal, setSelectedFolderForModal] = useState<string>('');
  
  // Track expanded projects in sidebar
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    if (activeProjectId) {
      initial.add(activeProjectId);
    }
    return initial;
  });

  const addMenuRef = useRef<HTMLDivElement>(null);

  // Close menus on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (addMenuRef.current && !addMenuRef.current.contains(event.target as Node)) {
        setShowAddMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Ensure current active project is expanded
  useEffect(() => {
    if (activeProjectId) {
      setExpandedProjects(prev => {
        const next = new Set(prev);
        next.add(activeProjectId);
        return next;
      });
    }
  }, [activeProjectId]);

  const toggleProjectExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedProjects(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

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

  const handleCreateProjectFromModal = () => {
    if (!selectedFolderForModal) {
      showToast('Please select or enter a folder path first.');
      return;
    }

    const path = selectedFolderForModal.replace(/\\/g, '/');
    const folderName = path.split('/').pop() || 'Unnamed Project';

    // Check duplicate path or name
    if (projectFolders.some(p => p.path === path || p.name.toLowerCase() === folderName.toLowerCase())) {
      showToast('A project with this folder path or name already exists.');
      return;
    }

    const newProj: Project = {
      id: Date.now().toString(),
      name: folderName,
      path: path,
      description: 'Local workspace project'
    };

    setProjectFolders(prev => [...prev, newProj]);
    setActiveProjectId(newProj.id);
    onWorkspaceRootPathChange(path);
    triggerWorkspaceRefresh();
    onNewChat(newProj.id);
    setShowCreateModal(false);
    setSelectedFolderForModal('');
    showToast(`Added project workspace "${folderName}"`);
  };

  const handleQuickStart = () => {
    const defaultPath = workspaceRootPath || '.';
    const path = defaultPath.replace(/\\/g, '/');
    const folderName = path.split('/').pop() || 'web_ui';

    if (projectFolders.some(p => p.path === path)) {
      const existing = projectFolders.find(p => p.path === path);
      if (existing) {
        setActiveProjectId(existing.id);
        onWorkspaceRootPathChange(existing.path);
        onNewChat(existing.id);
        showToast(`Opened existing workspace "${existing.name}"`);
        return;
      }
    }

    const newProj: Project = {
      id: Date.now().toString(),
      name: folderName,
      path: path,
      description: 'Quick start workspace'
    };

    setProjectFolders(prev => [...prev, newProj]);
    setActiveProjectId(newProj.id);
    onWorkspaceRootPathChange(path);
    triggerWorkspaceRefresh();
    onNewChat(newProj.id);
    showToast(`Quick-started project workspace "${folderName}"`);
    setShowAddMenu(false);
  };

  const handleDeleteProject = (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const proj = projectFolders.find(p => p.id === projectId);
    if (!proj) return;

    if (confirm(`Are you sure you want to remove the project workspace "${proj.name}"? This will not delete the files on disk.`)) {
      setProjectFolders(prev => prev.filter(p => p.id !== projectId));
      
      // Unlink chats associated with this project
      setChats(prev => prev.map(c => {
        if (c.projectId === projectId) {
          return { ...c, projectId: undefined };
        }
        return c;
      }));

      if (activeProjectId === projectId) {
        setActiveProjectId(null);
      }
      showToast(`Removed workspace "${proj.name}"`);
    }
  };

  const handleProjectClick = (proj: Project) => {
    setActiveProjectId(proj.id);
    onWorkspaceRootPathChange(proj.path);
    triggerWorkspaceRefresh();

    // Check if there are existing chats for this project
    const projChats = chats.filter(c => c.projectId === proj.id && c.isCoderMode);
    if (projChats.length > 0) {
      // Sort by updatedAt and open youngest
      const sorted = [...projChats].sort((a, b) => {
        const timeA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const timeB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return timeB - timeA;
      });
      onSelectChat(sorted[0].id);
    } else {
      onNewChat(proj.id);
    }
  };

  // Chat Navigation History queue state
  const [chatHistoryQueue, setChatHistoryQueue] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  useEffect(() => {
    if (currentChatId) {
      setChatHistoryQueue(prev => {
        // If it's already the current index, don't change
        if (historyIndex >= 0 && prev[historyIndex] === currentChatId) {
          return prev;
        }
        
        // Truncate forward history if we were in the middle of back navigation
        const nextQueue = prev.slice(0, historyIndex + 1);
        
        // Prevent duplicate consecutive items
        if (nextQueue[nextQueue.length - 1] === currentChatId) {
          return nextQueue;
        }

        const newQueue = [...nextQueue, currentChatId];
        setHistoryIndex(newQueue.length - 1);
        return newQueue;
      });
    }
  }, [currentChatId]);

  const handleNavigateBack = () => {
    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1;
      setHistoryIndex(prevIndex);
      onSelectChat(chatHistoryQueue[prevIndex]);
    }
  };

  const handleNavigateForward = () => {
    if (historyIndex < chatHistoryQueue.length - 1) {
      const nextIndex = historyIndex + 1;
      setHistoryIndex(nextIndex);
      onSelectChat(chatHistoryQueue[nextIndex]);
    }
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
      <div className="flex items-center justify-between px-3.5 py-3 border-b border-[#2C241E] shrink-0 bg-[#161211]">
        <div className="flex items-center gap-4">
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
          
          <div className="flex items-center gap-1.5">
            <button 
              onClick={handleNavigateBack}
              disabled={historyIndex <= 0}
              className="p-1.5 rounded-lg text-[#AD9F91] hover:text-[#EDE6DD] hover:bg-[#1D1917] disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer flex items-center justify-center"
              title="Navigate Back"
            >
              <ArrowLeft size={13} strokeWidth={2.5} />
            </button>
            <button 
              onClick={handleNavigateForward}
              disabled={historyIndex >= chatHistoryQueue.length - 1}
              className="p-1.5 rounded-lg text-[#AD9F91] hover:text-[#EDE6DD] hover:bg-[#1D1917] disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer flex items-center justify-center"
              title="Navigate Forward"
            >
              <ArrowRight size={13} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </div>

      {/* 2. New Conversation Action Button */}
      <div className="px-3 py-3 shrink-0">
        <button
          onClick={() => onNewChat(activeProjectId)}
          className="w-full h-9 flex items-center justify-center gap-2 bg-[#211B18] border border-[#2C241E] hover:bg-[#2F2521] active:scale-[0.98] text-[#EDE6DD] text-xs font-semibold rounded-lg transition-all cursor-pointer shadow-sm"
        >
          <Plus size={14} className="text-[#D97756]" strokeWidth={2.5} />
          New Conversation
        </button>
      </div>

      {/* 3. Navigation Sidebar Menus (History, Scheduled Tasks) */}
      <div className="px-3 pb-2 space-y-0.5 shrink-0 border-b border-[#2C241E]/40">
        <button 
          onClick={() => {
            // Pick first chat that is CoderMode and doesn't belong to current project, or show all
            const coderChats = chats.filter(c => c.isCoderMode);
            if (coderChats.length > 0) {
              onSelectChat(coderChats[0].id);
            } else {
              onNewChat(activeProjectId);
            }
          }}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 hover:bg-[#1D1917] text-[#AD9F91] hover:text-[#EDE6DD] rounded-lg text-xs font-semibold transition-all cursor-pointer text-left"
        >
          <History size={14} strokeWidth={2.2} />
          <span>Conversation History</span>
        </button>
        
        <button 
          onClick={() => {
            // Trigger scheduled tasks view if available
            showToast('Scheduled Tasks dashboard is accessible in automation panel tabs.');
          }}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 hover:bg-[#1D1917] text-[#AD9F91] hover:text-[#EDE6DD] rounded-lg text-xs font-semibold transition-all cursor-pointer text-left"
        >
          <Clock size={14} strokeWidth={2.2} />
          <span>Scheduled Tasks</span>
        </button>
      </div>

      {/* 4. Projects Header & Action Trigger */}
      <div className="flex items-center justify-between px-5 pt-4 pb-2 shrink-0 select-none">
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#7F7469]">Projects</span>
        <div className="flex items-center gap-2 text-[#7F7469] relative" ref={addMenuRef}>
          <button 
            className="p-1 hover:text-[#EDE6DD] transition-all cursor-pointer"
            title="Filter/Sort Projects"
          >
            <SlidersHorizontal size={12} strokeWidth={2.2} />
          </button>
          
          <button 
            onClick={() => setShowAddMenu(!showAddMenu)}
            className="p-1 hover:text-[#EDE6DD] transition-all cursor-pointer"
            title="Add Project Folder"
          >
            <FolderPlus size={12} strokeWidth={2.2} />
          </button>

          {/* Popover Add Dropdown Menu */}
          {showAddMenu && (
            <div className="absolute right-0 top-6 w-36 rounded-lg border border-[#2C241E] bg-[#181412] shadow-2xl p-1 z-50 text-left">
              <button
                onClick={() => {
                  setShowCreateModal(true);
                  setShowAddMenu(false);
                }}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-[#241C18] text-xs font-semibold text-[#EDE6DD] transition-all cursor-pointer"
              >
                <FolderPlus size={13} className="text-[#D97756]" />
                New Project
              </button>
              <button
                onClick={handleQuickStart}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-[#241C18] text-xs font-semibold text-[#EDE6DD] transition-all cursor-pointer"
              >
                <Play size={13} className="text-emerald-500" />
                Quick Start
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 5. Projects & Folders List Area */}
      <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-1.5 custom-scrollbar">
        {projectFolders.length === 0 ? (
          <div className="px-4 py-8 text-center text-xs text-[#635F59] font-medium leading-relaxed select-none">
            No projects added.<br />Click the folder icon above to add a project folder.
          </div>
        ) : (
          projectFolders.map(proj => {
            const isExpanded = expandedProjects.has(proj.id);
            const isActiveProject = activeProjectId === proj.id;
            const projChats = chats.filter(c => c.projectId === proj.id && c.isCoderMode);

            return (
              <div key={proj.id} className="space-y-1">
                {/* Folder Header Item */}
                <div
                  onClick={() => handleProjectClick(proj)}
                  className={`group w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer select-none
                    ${isActiveProject 
                      ? 'bg-[#1D1917]/35 border-[#2C241E] text-[#EDE6DD]' 
                      : 'border-transparent text-[#AD9F91] hover:text-[#EDE6DD] hover:bg-[#14100E]/40'
                    }
                  `}
                >
                  <div className="flex items-center gap-2 truncate flex-1">
                    <button
                      onClick={(e) => toggleProjectExpand(proj.id, e)}
                      className="p-0.5 rounded text-[#7F7469] hover:text-white transition-all cursor-pointer flex items-center justify-center"
                    >
                      <div className={`transition-transform duration-150 ${isExpanded ? 'rotate-90' : 'rotate-0'}`}>
                        <ChevronRight size={12} strokeWidth={2.5} />
                      </div>
                    </button>
                    <Folder size={13} className={isActiveProject ? 'text-[#D97756]' : 'text-[#7F7469]'} />
                    <span className="truncate">{proj.name}</span>
                  </div>

                  <button
                    onClick={(e) => handleDeleteProject(proj.id, e)}
                    className="p-1 opacity-0 group-hover:opacity-100 hover:bg-[#2A221E] hover:text-red-400 rounded transition-all cursor-pointer text-[#7F7469]"
                    title="Remove project workspace"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>

                {/* Expanded Chat Sessions List */}
                {isExpanded && (
                  <div className="pl-4 pr-1 space-y-1 relative">
                    {/* Vertical line indicator */}
                    <div className="absolute left-4.5 top-0 bottom-1.5 border-l border-[#2C241E]/50" />
                    
                    {projChats.length === 0 ? (
                      <div className="pl-4 py-1.5 text-[10.5px] text-[#635F59] font-medium select-none">
                        No conversations
                      </div>
                    ) : (
                      projChats.map(chat => {
                        const isChatActive = currentChatId === chat.id;
                        return (
                          <div
                            key={chat.id}
                            onClick={() => onSelectChat(chat.id)}
                            className={`pl-4 pr-2 py-1.5 rounded-lg text-[11px] font-medium transition-all cursor-pointer flex items-center justify-between group
                              ${isChatActive
                                ? 'bg-[#211B18] text-[#EDE6DD] shadow-sm border border-[#2C241E]'
                                : 'text-[#9B8C7D] hover:text-[#EDE6DD] hover:bg-[#161211]/60'
                              }
                            `}
                          >
                            <span className="truncate flex-1 pr-2">
                              {chat.title || 'Untitled Session'}
                            </span>
                            <span className="text-[9px] font-mono text-[#635F59] shrink-0 font-bold uppercase">
                              {getFriendlyTimestamp(chat.updatedAt)}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 6. Settings Sidebar Footer Item */}
      <div className="p-3 shrink-0 border-t border-[#2C241E]/40 bg-[#141110]">
        <button 
          onClick={onOpenSettings}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-[#1D1917] text-[#AD9F91] hover:text-[#EDE6DD] text-xs font-semibold transition-all cursor-pointer text-left"
        >
          <Settings size={14} strokeWidth={2.2} />
          <span>Settings</span>
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

            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-2">Create Project</h3>
            <p className="text-[11px] text-[#AD9F91] mb-5 leading-normal">
              Select or enter the absolute folder directory path of your workspace. Lumina will index this folder to continue code editing and executions.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#7F7469] mb-1.5">Select Folder(s)</label>
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

              {/* Add folder large border dotted area */}
              <div 
                onClick={handleSelectProjectFolder}
                className="py-8 border-2 border-dashed border-[#2C241E] hover:border-[#D97756]/40 rounded-xl bg-[#0E0C0B]/30 hover:bg-[#0E0C0B]/60 transition-all flex flex-col items-center justify-center gap-2 cursor-pointer select-none group"
              >
                <FolderPlus size={24} className="text-[#7F7469] group-hover:text-[#D97756] transition-colors" />
                <span className="text-xs font-semibold text-[#EDE6DD]">{selectedFolderForModal ? 'Change Folder Path' : '+ Add Folder'}</span>
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
                onClick={handleCreateProjectFromModal}
                disabled={!selectedFolderForModal}
                className="h-9 px-5 bg-[#D97756] hover:bg-[#e48f73] disabled:opacity-40 disabled:pointer-events-none text-xs font-bold text-white rounded-lg transition-all cursor-pointer shadow-md"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
