import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  ChevronLeft, 
  Plus, 
  ChevronDown, 
  FolderPlus, 
  Folder, 
  Check, 
  X, 
  Trash2, 
  MessageSquare, 
  Beaker, 
  Activity, 
  Compass, 
  Flower2, 
  Settings, 
  Camera,
  Code,
  Bot,
  Database,
  Sliders,
  MoreVertical,
  Star,
  Pencil
} from 'lucide-react';
import { Chat } from '../../types';
import { AVAILABLE_AVATARS } from '../../constants';

interface SidebarProps {
  chats: Chat[];
  currentChatId: string | null;
  setCurrentChatId: (id: string | null) => void;
  createNewChat: (projId?: string | null) => void;
  setChats: React.Dispatch<React.SetStateAction<Chat[]>>;
  onOpenSettings: (tab?: any) => void;
  userProfile: {
    name: string;
    avatar: string;
    dob: string;
    location: string;
    age?: number | string;
  };
  setUserProfile?: React.Dispatch<React.SetStateAction<any>>;
  projectFolders?: { id: string; name: string }[];
  setProjectFolders?: React.Dispatch<React.SetStateAction<{ id: string; name: string }[]>>;
  onSelect?: () => void;
  activeProjectId?: string | null;
  setActiveProjectId?: (id: string | null) => void;
  isSidebarOpen?: boolean;
  setIsSidebarOpen?: (open: boolean) => void;
  onOpenProjectsPage?: () => void;
  onOpenAgentsPage?: () => void;
  showAgentsPage?: boolean;
  showProjectsPage?: boolean;
  agents?: any[];
  activeAgentId?: string | null;
  setActiveAgent?: (agent: any | null) => void;
  onOpenProjectChats?: (project: { id: string; name: string }) => void;
  onOpenAgentChats?: (agent: any) => void;
  children?: React.ReactNode;
}

export const SidebarContent = ({ 
  chats, 
  currentChatId, 
  setCurrentChatId, 
  createNewChat, 
  setChats,
  onOpenSettings,
  userProfile,
  setUserProfile,
  projectFolders = [],
  setProjectFolders,
  onSelect,
  activeProjectId,
  setActiveProjectId,
  isSidebarOpen,
  setIsSidebarOpen,
  onOpenProjectsPage,
  onOpenAgentsPage,
  showAgentsPage = false,
  showProjectsPage = false,
  agents = [],
  activeAgentId,
  setActiveAgent,
  onOpenProjectChats,
  onOpenAgentChats,
  children,
}: SidebarProps) => {
  const [isRecentChatsOpen, setIsRecentChatsOpen] = useState(false);
  const [isAvatarSelectorOpen, setIsAvatarSelectorOpen] = useState(false);
  const [isProjectsOpen, setIsProjectsOpen] = useState(false);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});

  const [groupBy, setGroupBy] = useState<'none' | 'date' | 'project'>('date');
  const [filterMode, setFilterMode] = useState<'all' | 'chat' | 'coder'>('all');
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [filterDropdownPosition, setFilterDropdownPosition] = useState<{ x: number, y: number } | null>(null);
  const [activeMenuChatId, setActiveMenuChatId] = useState<string | null>(null);
  
  // State for inline renaming
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  
  // Sub-menu state for project selection
  const [activeProjectSubmenuChatId, setActiveProjectSubmenuChatId] = useState<string | null>(null);

  const toggleStarChat = (chatId: string) => {
    setChats(prev => prev.map(c => c.id === chatId ? { ...c, isStarred: !c.isStarred } : c));
  };

  const saveRenameChat = (chatId: string) => {
    if (editingTitle.trim()) {
      setChats(prev => prev.map(c => c.id === chatId ? { ...c, title: editingTitle.trim() } : c));
    }
    setEditingChatId(null);
  };

  const moveChatToProject = (chatId: string, projId: string | null) => {
    setChats(prev => prev.map(c => c.id === chatId ? { ...c, projectId: projId || undefined } : c));
  };

  const handleFilterClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (isFilterDropdownOpen) {
      setIsFilterDropdownOpen(false);
    } else {
      const rect = e.currentTarget.getBoundingClientRect();
      setFilterDropdownPosition({ x: rect.right, y: rect.bottom });
      setIsFilterDropdownOpen(true);
    }
  };

  const generalChats = chats.filter(c => !c.projectId && !c.agentId && !c.isCoderMode);
  const coderChats = chats.filter(c => !c.projectId && !c.agentId && c.isCoderMode);

  // Filter chats by mode
  const filteredChatsList = chats.filter(chat => {
    if (chat.projectId || chat.agentId) return false;
    if (filterMode === 'chat' && chat.isCoderMode) return false;
    if (filterMode === 'coder' && !chat.isCoderMode) return false;
    return true;
  });

  // Group chats by selected groupBy setting
  const groupedRecentChats: Record<string, Chat[]> = {};

  if (groupBy === 'none') {
    groupedRecentChats["Recent Chats"] = filteredChatsList;
  } else if (groupBy === 'date') {
    const now = new Date();
    const isToday = (d: Date) => d.toDateString() === now.toDateString();
    const isYesterday = (d: Date) => {
      const yesterday = new Date();
      yesterday.setDate(now.getDate() - 1);
      return d.toDateString() === yesterday.toDateString();
    };
    const isWithinLast7Days = (d: Date) => {
      const diffTime = Math.abs(now.getTime() - d.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= 7;
    };

    filteredChatsList.forEach(chat => {
      const date = chat.updatedAt instanceof Date ? chat.updatedAt : new Date(chat.updatedAt || Date.now());
      let key = "Older";
      if (isToday(date)) {
        key = "Today";
      } else if (isYesterday(date)) {
        key = "Yesterday";
      } else if (isWithinLast7Days(date)) {
        key = "Previous 7 Days";
      }
      
      if (!groupedRecentChats[key]) {
        groupedRecentChats[key] = [];
      }
      groupedRecentChats[key].push(chat);
    });
  } else if (groupBy === 'project') {
    filteredChatsList.forEach(chat => {
      let key = "General";
      if (chat.projectId) {
        const folder = projectFolders.find(p => p.id === chat.projectId);
        if (folder) key = folder.name;
      }
      if (!groupedRecentChats[key]) {
        groupedRecentChats[key] = [];
      }
      groupedRecentChats[key].push(chat);
    });
  }

  // Sort chats inside each group by updatedAt (newest first)
  Object.keys(groupedRecentChats).forEach(key => {
    groupedRecentChats[key].sort((a, b) => {
      const tA = a.updatedAt instanceof Date ? a.updatedAt.getTime() : new Date(a.updatedAt || 0).getTime();
      const tB = b.updatedAt instanceof Date ? b.updatedAt.getTime() : new Date(b.updatedAt || 0).getTime();
      return tB - tA;
    });
  });

  const visibleGroupKeys = Object.keys(groupedRecentChats).filter(
    key => groupedRecentChats[key] && groupedRecentChats[key].length > 0
  );

  const handleSaveProject = () => {
    if (newProjectName.trim()) {
      const newId = Date.now().toString();
      if (setProjectFolders) {
        setProjectFolders(prev => [
          ...prev,
          { id: newId, name: newProjectName.trim() }
        ]);
      }
      setExpandedFolders(prev => ({ ...prev, [newId]: true }));
      setNewProjectName('');
      setIsCreatingProject(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-black dark:bg-white flex items-center justify-center text-white dark:text-black">
            <Sparkles size={18} />
          </div>
          <span className="font-display font-semibold tracking-tight">Lumina</span>
        </div>
        {setIsSidebarOpen && (
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg text-gray-500 hover:text-black dark:hover:text-white transition-colors cursor-pointer hidden md:block"
            title="Collapse sidebar"
          >
            <ChevronLeft size={16} />
          </button>
        )}
      </div>

      <button 
        onClick={() => {
          if (setActiveProjectId) {
            setActiveProjectId(null);
          }
          createNewChat(null);
        }}
        className="flex items-center gap-3 p-3 mb-6 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/5 rounded-xl shadow-sm hover:shadow-md hover:border-gray-300 dark:hover:border-white/10 transition-all text-sm font-medium dark:text-white"
      >
        <Plus size={18} />
        New chat
      </button>

      <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar">

        {/* AI Agents Hub Category */}
        <div className="space-y-2">
          <button
            id="agents-hub-category-header"
            onClick={() => {
              if (onOpenAgentsPage) {
                onOpenAgentsPage();
              }
              if (onSelect) {
                onSelect();
              }
            }}
            className={`w-full flex items-center justify-between text-xs font-semibold px-2.5 py-2 transition-all cursor-pointer rounded-xl border text-left animate-focus-target ${
              showAgentsPage 
                ? 'text-violet-600 bg-violet-100/40 dark:bg-zinc-800/60 border-violet-200 dark:border-zinc-750 shadow-md' 
                : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-300 dark:hover:text-zinc-350 bg-transparent border-transparent shadow-none hover:bg-gray-100/10 dark:hover:bg-zinc-800/10'
            }`}
          >
            <div className="flex items-center gap-2">
              <Bot size={14} className="text-zinc-400 group-hover:text-violet-500 transition-colors shrink-0" />
              <span>AI Agents Hub</span>
            </div>
            {agents.length > 0 && (
              <span className="text-[10px] font-bold px-2 py-0.5 bg-gray-200 dark:bg-zinc-800/40 text-gray-500 dark:text-zinc-400 border border-gray-100 dark:border-zinc-700/30 rounded-full leading-none shrink-0">
                {agents.length}
              </span>
            )}
          </button>

          {/* Active Agent Sandbox Section */}
          {activeAgentId && agents.find(a => a.id === activeAgentId) && (
            <div className="p-3 bg-violet-50/40 dark:bg-zinc-800/10 border border-violet-100/35 dark:border-white/5 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-5 h-5 rounded bg-violet-500/10 flex items-center justify-center text-violet-500 shrink-0 text-xs">
                    {agents.find(a => a.id === activeAgentId)?.avatarEmoji || '🤖'}
                  </div>
                  <span className="text-xs font-bold text-gray-900 dark:text-zinc-150 truncate">
                    {agents.find(a => a.id === activeAgentId)?.name}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => {
                      const activeAgentObj = agents.find(a => a.id === activeAgentId);
                      if (activeAgentObj && onOpenAgentChats) {
                        onOpenAgentChats(activeAgentObj);
                      }
                    }}
                    className="text-[10px] text-violet-500 hover:text-violet-600 dark:hover:text-violet-400 font-bold transition-colors shrink-0 px-2 py-0.5 rounded-md hover:bg-gray-100 dark:hover:bg-zinc-805 cursor-pointer"
                    title="View assistant chat history"
                  >
                    Chats
                  </button>
                  <button
                    onClick={() => {
                      if (setActiveAgent) {
                        setActiveAgent(null);
                      }
                    }}
                    className="text-[10px] text-zinc-500 hover:text-red-405 font-medium transition-colors shrink-0 px-2 py-0.5 rounded-md hover:bg-gray-100 dark:hover:bg-zinc-800 cursor-pointer"
                    title="Deselect active agent"
                  >
                    Exit
                  </button>
                </div>
              </div>
              
              {/* Chats inside this active agent */}
              <div className="space-y-1 pt-1.5 border-t border-violet-100/10">
                {chats.filter(c => c.agentId === activeAgentId).map(chat => (
                  <div key={chat.id} className="group relative">
                    <button
                      onClick={() => {
                        setCurrentChatId(chat.id);
                        if (onSelect) onSelect();
                      }}
                      className={`w-full text-left px-2 py-1.5 rounded-lg text-[11px] transition-all flex items-center justify-between ${
                        currentChatId === chat.id
                          ? 'bg-violet-500/15 text-violet-650 dark:text-violet-300 font-bold border border-violet-500/10'
                          : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-gray-50 dark:hover:bg-zinc-802 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 truncate pr-5">
                        <MessageSquare size={10} className={currentChatId === chat.id ? 'text-violet-500' : 'text-zinc-400'} />
                        <span className="truncate">{chat.title}</span>
                      </div>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Are you sure you want to delete this chat session?`)) {
                          setChats(prev => prev.filter(c => c.id !== chat.id));
                          if (currentChatId === chat.id) {
                            setCurrentChatId(null);
                          }
                        }
                      }}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 text-zinc-400 dark:text-zinc-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all rounded cursor-pointer"
                      title="Delete chat"
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                ))}
                {chats.filter(c => c.agentId === activeAgentId).length === 0 && (
                  <p className="text-[10px] text-zinc-400 dark:text-zinc-500 italic text-center py-1 select-none">
                    No active sessions
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Projects Category */}
        <div className="space-y-2">
          <button
            id="projects-category-header"
            onClick={() => {
              if (onOpenProjectsPage) {
                onOpenProjectsPage();
              }
              if (onSelect) {
                onSelect();
              }
            }}
            className={`w-full flex items-center justify-between text-xs font-semibold px-2.5 py-2 transition-all cursor-pointer rounded-xl border text-left ${
              showProjectsPage 
                ? 'text-amber-600 bg-amber-100/50 dark:bg-zinc-800/60 border-amber-200 dark:border-zinc-750 shadow-md' 
                : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-300 dark:hover:text-zinc-350 bg-transparent border-transparent shadow-none hover:bg-gray-100/10 dark:hover:bg-zinc-800/10'
            }`}
          >
            <div className="flex items-center gap-2">
              <Folder size={14} className="text-zinc-400 group-hover:text-amber-500 transition-colors shrink-0" />
              <span>Projects Workspace</span>
            </div>
            {projectFolders.length > 0 && (
              <span className="text-[10px] font-bold px-2 py-0.5 bg-gray-200 dark:bg-zinc-800/40 text-gray-500 dark:text-zinc-400 border border-gray-100 dark:border-zinc-700/30 rounded-full leading-none shrink-0">
                {projectFolders.length}
              </span>
            )}
          </button>

          {/* Active Project Workspace Sandbox Section */}
          {activeProjectId && projectFolders.find(p => p.id === activeProjectId) && (
            <div className="p-3 bg-blue-50/40 dark:bg-zinc-800/10 border border-blue-100/35 dark:border-white/5 rounded-xl space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-5 h-5 rounded bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
                    <Folder size={11} />
                  </div>
                  <span className="text-xs font-bold text-gray-900 dark:text-zinc-150 truncate">
                    {projectFolders.find(p => p.id === activeProjectId)?.name}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => {
                      const activeProjObj = projectFolders.find(p => p.id === activeProjectId);
                      if (activeProjObj && onOpenProjectChats) {
                        onOpenProjectChats(activeProjObj);
                      }
                    }}
                    className="text-[10px] text-amber-653 hover:text-amber-700 dark:hover:text-amber-400 font-bold transition-colors shrink-0 px-2 py-0.5 rounded-md hover:bg-gray-100 dark:hover:bg-zinc-805 cursor-pointer"
                    title="View project chat history"
                  >
                    Chats
                  </button>
                  <button
                    onClick={() => {
                      if (setActiveProjectId) {
                        setActiveProjectId(null);
                      }
                      setCurrentChatId(null);
                    }}
                    className="text-[10px] text-zinc-500 hover:text-red-405 font-medium transition-colors shrink-0 px-2 py-0.5 rounded-md hover:bg-gray-100 dark:hover:bg-zinc-800 cursor-pointer"
                    title="Exit project and return to general chats"
                  >
                    Exit
                  </button>
                </div>
              </div>
              
              {/* Chats inside this active project */}
              <div className="space-y-1">
                {chats.filter(c => c.projectId === activeProjectId).map(chat => (
                  <div key={chat.id} className="group relative">
                    <button
                      onClick={() => {
                        setCurrentChatId(chat.id);
                        if (onSelect) onSelect();
                      }}
                      className={`w-full p-2 rounded-lg flex items-center gap-2 text-xs font-medium transition-colors pr-8 ${
                        currentChatId === chat.id
                          ? 'bg-blue-500/10 dark:bg-zinc-850/60 text-blue-600 dark:text-white font-semibold' 
                          : 'text-gray-500 hover:bg-gray-100/80 dark:hover:bg-zinc-850/30 hover:text-gray-700 dark:hover:text-zinc-350'
                      }`}
                    >
                      <MessageSquare size={13} className={currentChatId === chat.id ? 'text-blue-500' : 'text-gray-400'} />
                      <span className="truncate flex-1 text-left">{chat.title}</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setChats(prev => prev.filter(c => c.id !== chat.id));
                        if (currentChatId === chat.id) setCurrentChatId(null);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-md opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                      title="Delete chat"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                ))}

                {chats.filter(c => c.projectId === activeProjectId).length === 0 && (
                  <div className="text-[10px] text-zinc-500 italic px-2 py-1">
                    No sessions in this project
                  </div>
                )}
                
                <button
                  onClick={() => createNewChat(activeProjectId)}
                  className="w-full py-1.5 px-2 rounded-lg flex items-center gap-1.5 text-[10px] text-zinc-500 hover:bg-white dark:hover:bg-zinc-800/40 border border-dashed border-gray-200 dark:border-zinc-800 hover:text-gray-700 dark:hover:text-zinc-300 transition-colors cursor-pointer"
                >
                  <Plus size={11} />
                  <span>New Session in Project</span>
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {visibleGroupKeys.length === 0 ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between px-3 py-1.5 mt-2">
                <span className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                  Recent Chats
                </span>
                <div className="relative">
                  <button
                    onClick={handleFilterClick}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-md text-zinc-400 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
                    title="Filter options"
                  >
                    <Sliders size={14} />
                  </button>

                  {/* Filter Dropdown */}
                  {isFilterDropdownOpen && filterDropdownPosition && (
                    <>
                      <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setIsFilterDropdownOpen(false)} />
                      <div 
                        className="fixed w-48 bg-zinc-900 border border-zinc-800 rounded-2xl p-2 shadow-2xl z-50 flex flex-col gap-1 text-xs"
                        style={{
                          left: `${filterDropdownPosition.x - 192}px`,
                          top: `${filterDropdownPosition.y + 6}px`
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider px-3 py-1.5 select-none font-sans">
                          Group by
                        </div>
                        <button
                          onClick={() => {
                            setGroupBy('none');
                            setIsFilterDropdownOpen(false);
                          }}
                          className={`flex items-center justify-between w-full text-left px-3 py-1.5 rounded-lg font-semibold transition-colors hover:bg-zinc-800 cursor-pointer ${
                            groupBy === 'none' ? 'text-white bg-zinc-800/40' : 'text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          <span>None</span>
                          {groupBy === 'none' && <Check size={14} className="text-blue-500" />}
                        </button>
                        <button
                          onClick={() => {
                            setGroupBy('date');
                            setIsFilterDropdownOpen(false);
                          }}
                          className={`flex items-center justify-between w-full text-left px-3 py-1.5 rounded-lg font-semibold transition-colors hover:bg-zinc-800 cursor-pointer ${
                            groupBy === 'date' ? 'text-white bg-zinc-800/40' : 'text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          <span>Date</span>
                          {groupBy === 'date' && <Check size={14} className="text-blue-500" />}
                        </button>
                        <button
                          onClick={() => {
                            setGroupBy('project');
                            setIsFilterDropdownOpen(false);
                          }}
                          className={`flex items-center justify-between w-full text-left px-3 py-1.5 rounded-lg font-semibold transition-colors hover:bg-zinc-800 cursor-pointer ${
                            groupBy === 'project' ? 'text-white bg-zinc-800/40' : 'text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          <span>Project</span>
                          {groupBy === 'project' && <Check size={14} className="text-blue-500" />}
                        </button>

                        <div className="border-t border-zinc-800 my-1" />

                        <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider px-3 py-1.5 select-none">
                          Filter by
                        </div>
                        <button
                          onClick={() => {
                            setFilterMode('all');
                            setIsFilterDropdownOpen(false);
                          }}
                          className={`flex items-center justify-between w-full text-left px-3 py-1.5 rounded-lg font-semibold transition-colors hover:bg-zinc-800 cursor-pointer ${
                            filterMode === 'all' ? 'text-white bg-zinc-800/40' : 'text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          <span>All Modes</span>
                          {filterMode === 'all' && <Check size={14} className="text-blue-500" />}
                        </button>
                        <button
                          onClick={() => {
                            setFilterMode('chat');
                            setIsFilterDropdownOpen(false);
                          }}
                          className={`flex items-center justify-between w-full text-left px-3 py-1.5 rounded-lg font-semibold transition-colors hover:bg-zinc-800 cursor-pointer ${
                            filterMode === 'chat' ? 'text-white bg-zinc-800/40' : 'text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          <span>Chat Mode</span>
                          {filterMode === 'chat' && <Check size={14} className="text-blue-500" />}
                        </button>
                        <button
                          onClick={() => {
                            setFilterMode('coder');
                            setIsFilterDropdownOpen(false);
                          }}
                          className={`flex items-center justify-between w-full text-left px-3 py-1.5 rounded-lg font-semibold transition-colors hover:bg-zinc-800 cursor-pointer ${
                            filterMode === 'coder' ? 'text-white bg-zinc-800/40' : 'text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          <span>Coder Mode</span>
                          {filterMode === 'coder' && <Check size={14} className="text-blue-500" />}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
              <div className="px-3 py-4 text-xs text-gray-450 dark:text-zinc-500 italic">
                No recent chats
              </div>
            </div>
          ) : (
            visibleGroupKeys.map((key, index) => (
              <div key={key} className="space-y-2">
                {/* Group Header */}
                <div className="flex items-center justify-between px-3 py-1.5 mt-2">
                  <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-500 uppercase tracking-wider">
                    {key}
                  </span>
                  {index === 0 && (
                    <div className="relative">
                      <button
                        onClick={handleFilterClick}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-md text-zinc-400 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
                        title="Filter options"
                      >
                        <Sliders size={14} />
                      </button>

                      {/* Filter Dropdown */}
                      {isFilterDropdownOpen && filterDropdownPosition && (
                        <>
                          <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setIsFilterDropdownOpen(false)} />
                          <div 
                            className="fixed w-48 bg-zinc-900 border border-zinc-800 rounded-2xl p-2 shadow-2xl z-50 flex flex-col gap-1 text-xs"
                            style={{
                              left: `${filterDropdownPosition.x - 192}px`,
                              top: `${filterDropdownPosition.y + 6}px`
                            }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider px-3 py-1.5 select-none font-sans">
                              Group by
                            </div>
                            <button
                              onClick={() => {
                                setGroupBy('none');
                                setIsFilterDropdownOpen(false);
                              }}
                              className={`flex items-center justify-between w-full text-left px-3 py-1.5 rounded-lg font-semibold transition-colors hover:bg-zinc-800 cursor-pointer ${
                                groupBy === 'none' ? 'text-white bg-zinc-800/40' : 'text-zinc-400 hover:text-zinc-200'
                              }`}
                            >
                              <span>None</span>
                              {groupBy === 'none' && <Check size={14} className="text-blue-500" />}
                            </button>
                            <button
                              onClick={() => {
                                setGroupBy('date');
                                setIsFilterDropdownOpen(false);
                              }}
                              className={`flex items-center justify-between w-full text-left px-3 py-1.5 rounded-lg font-semibold transition-colors hover:bg-zinc-800 cursor-pointer ${
                                groupBy === 'date' ? 'text-white bg-zinc-800/40' : 'text-zinc-400 hover:text-zinc-200'
                              }`}
                            >
                              <span>Date</span>
                              {groupBy === 'date' && <Check size={14} className="text-blue-500" />}
                            </button>
                            <button
                              onClick={() => {
                                setGroupBy('project');
                                setIsFilterDropdownOpen(false);
                              }}
                              className={`flex items-center justify-between w-full text-left px-3 py-1.5 rounded-lg font-semibold transition-colors hover:bg-zinc-800 cursor-pointer ${
                                groupBy === 'project' ? 'text-white bg-zinc-800/40' : 'text-zinc-400 hover:text-zinc-200'
                              }`}
                            >
                              <span>Project</span>
                              {groupBy === 'project' && <Check size={14} className="text-blue-500" />}
                            </button>

                            <div className="border-t border-zinc-800 my-1" />

                            <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider px-3 py-1.5 select-none font-sans">
                              Filter by
                            </div>
                            <button
                              onClick={() => {
                                setFilterMode('all');
                                setIsFilterDropdownOpen(false);
                              }}
                              className={`flex items-center justify-between w-full text-left px-3 py-1.5 rounded-lg font-semibold transition-colors hover:bg-zinc-800 cursor-pointer ${
                                filterMode === 'all' ? 'text-white bg-zinc-800/40' : 'text-zinc-400 hover:text-zinc-200'
                              }`}
                            >
                              <span>All Modes</span>
                              {filterMode === 'all' && <Check size={14} className="text-blue-500" />}
                            </button>
                            <button
                              onClick={() => {
                                setFilterMode('chat');
                                setIsFilterDropdownOpen(false);
                              }}
                              className={`flex items-center justify-between w-full text-left px-3 py-1.5 rounded-lg font-semibold transition-colors hover:bg-zinc-800 cursor-pointer ${
                                filterMode === 'chat' ? 'text-white bg-zinc-800/40' : 'text-zinc-400 hover:text-zinc-200'
                              }`}
                            >
                              <span>Chat Mode</span>
                              {filterMode === 'chat' && <Check size={14} className="text-blue-500" />}
                            </button>
                            <button
                              onClick={() => {
                                setFilterMode('coder');
                                setIsFilterDropdownOpen(false);
                              }}
                              className={`flex items-center justify-between w-full text-left px-3 py-1.5 rounded-lg font-semibold transition-colors hover:bg-zinc-800 cursor-pointer ${
                                filterMode === 'coder' ? 'text-white bg-zinc-800/40' : 'text-zinc-400 hover:text-zinc-200'
                              }`}
                            >
                              <span>Coder Mode</span>
                              {filterMode === 'coder' && <Check size={14} className="text-blue-500" />}
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* List of chats in this group */}
                <div className="space-y-1">
                  {(groupedRecentChats[key] || []).map(chat => {
                    const isSelected = currentChatId === chat.id;
                    const isMenuOpen = activeMenuChatId === chat.id;
                    return (
                      <div key={chat.id} className="group relative">
                        {/* Chat Item container card - matching Photo 1 / Photo 3 */}
                        <div
                          onClick={() => {
                            setCurrentChatId(chat.id);
                            if (onSelect) onSelect();
                          }}
                          className={`w-full p-2.5 mb-1 rounded-xl flex items-center justify-between transition-all cursor-pointer relative ${
                            isSelected
                              ? 'bg-zinc-900 border border-zinc-800/45 text-white shadow-xl'
                              : 'bg-zinc-950/20 hover:bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 border border-transparent'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            {/* Icon depending on mode */}
                            {chat.isCoderMode ? (
                              <Code size={13} className={isSelected ? 'text-zinc-100 shrink-0' : 'text-zinc-500 shrink-0'} />
                            ) : (
                              <MessageSquare size={13} className={isSelected ? 'text-zinc-100 shrink-0' : 'text-zinc-500 shrink-0'} />
                            )}

                            {editingChatId === chat.id ? (
                              <input
                                type="text"
                                value={editingTitle}
                                onChange={(e) => setEditingTitle(e.target.value)}
                                onFocus={(e) => e.target.select()}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    saveRenameChat(chat.id);
                                  } else if (e.key === 'Escape') {
                                    setEditingChatId(null);
                                  }
                                }}
                                onBlur={() => saveRenameChat(chat.id)}
                                autoFocus
                                className="bg-zinc-800 text-white rounded px-2 py-0.5 w-full text-xs font-semibold outline-none border border-zinc-700"
                                onClick={(e) => e.stopPropagation()}
                              />
                            ) : (
                              <span className={`truncate text-xs font-semibold ${isSelected ? 'text-white' : 'text-zinc-300'}`}>
                                {chat.title}
                              </span>
                            )}

                            {chat.isStarred && (
                              <Star size={10} className="fill-amber-400 text-amber-400 shrink-0" />
                            )}
                          </div>

                          {/* Options trigger vertical loaded dots */}
                          <div className="flex items-center">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenuChatId(isMenuOpen ? null : chat.id);
                                setActiveProjectSubmenuChatId(null);
                              }}
                              className={`p-1 rounded-md transition-colors hover:bg-zinc-800 hover:text-white ${
                                isMenuOpen ? 'text-white bg-zinc-800' : 'text-zinc-500 opacity-0 group-hover:opacity-100'
                              }`}
                              title="Chat options"
                            >
                              <MoreVertical size={14} />
                            </button>
                          </div>
                        </div>

                        {/* Dropdown Menu (Photo 3) */}
                        {isMenuOpen && (
                          <>
                            <div
                              className="fixed inset-0 z-40 bg-transparent"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenuChatId(null);
                                setActiveProjectSubmenuChatId(null);
                              }}
                            />
                            <div className="absolute right-2 top-11 w-48 bg-zinc-900 border border-zinc-800/80 rounded-2xl p-1.5 shadow-2xl z-50 flex flex-col gap-1 text-xs">
                              {/* Star/Unstar Option */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleStarChat(chat.id);
                                  setActiveMenuChatId(null);
                                }}
                                className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors cursor-pointer text-left font-sans font-medium"
                              >
                                <Star size={13} className={chat.isStarred ? 'fill-amber-400 text-amber-400' : 'text-zinc-400'} />
                                <span>{chat.isStarred ? 'Unstar' : 'Star'}</span>
                              </button>

                              {/* Rename Option */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingChatId(chat.id);
                                  setEditingTitle(chat.title);
                                  setActiveMenuChatId(null);
                                }}
                                className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors cursor-pointer text-left font-sans font-medium"
                              >
                                <Pencil size={13} className="text-zinc-400" />
                                <span>Rename</span>
                              </button>

                              {/* Add to project Option */}
                              <div className="flex flex-col">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveProjectSubmenuChatId(activeProjectSubmenuChatId === chat.id ? null : chat.id);
                                  }}
                                  className="flex items-center justify-between w-full px-3 py-2 rounded-xl hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors cursor-pointer text-left font-sans font-medium"
                                >
                                  <div className="flex items-center gap-2.5">
                                    <Folder size={13} className="text-zinc-400" />
                                    <span>Add to project</span>
                                  </div>
                                  <ChevronDown size={11} className={`transition-transform text-zinc-500 ${activeProjectSubmenuChatId === chat.id ? 'rotate-180' : ''}`} />
                                </button>

                                {/* Inline Project Sub-list Expanded inside options list */}
                                {activeProjectSubmenuChatId === chat.id && (
                                  <div className="pl-6 pr-2 py-1 space-y-0.5 border-l border-zinc-800 ml-4 my-1 max-h-36 overflow-y-auto custom-scrollbar flex flex-col gap-0.5">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        moveChatToProject(chat.id, null);
                                        setActiveMenuChatId(null);
                                        setActiveProjectSubmenuChatId(null);
                                      }}
                                      className={`w-full text-left py-1.5 px-2 rounded-md hover:bg-zinc-800 text-[11px] transition-colors ${
                                        !chat.projectId ? 'text-blue-400 font-semibold' : 'text-zinc-500 hover:text-zinc-300'
                                      }`}
                                    >
                                      General (None)
                                    </button>
                                    {(projectFolders || []).map(folder => {
                                      const isActive = chat.projectId === folder.id;
                                      return (
                                        <button
                                          key={folder.id}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            moveChatToProject(chat.id, folder.id);
                                            setActiveMenuChatId(null);
                                            setActiveProjectSubmenuChatId(null);
                                          }}
                                          className={`w-full text-left py-1.5 px-2 rounded-md hover:bg-zinc-800 text-[11px] transition-colors truncate ${
                                            isActive ? 'text-blue-400 font-semibold' : 'text-zinc-500 hover:text-zinc-300'
                                          }`}
                                          title={folder.name}
                                        >
                                          {folder.name}
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>

                              <div className="border-t border-zinc-800/80 my-1" />

                              {/* Delete Option */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setChats(prev => prev.filter(c => c.id !== chat.id));
                                  if (currentChatId === chat.id) setCurrentChatId(null);
                                  setActiveMenuChatId(null);
                                }}
                                className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-red-950/20 text-rose-455 hover:text-red-400 transition-colors cursor-pointer text-left font-sans font-medium"
                              >
                                <Trash2 size={13} className="text-red-450" />
                                <span>Delete</span>
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="mt-auto pt-4 border-t border-gray-200 dark:border-white/5 space-y-1">
        <button 
          onClick={() => onOpenSettings()}
          className="flex items-center gap-3 w-full p-2.5 hover:bg-gray-200/50 dark:hover:bg-white/5 rounded-lg text-sm text-gray-650 dark:text-gray-300 transition-colors"
        >
          <Settings size={18} />
          Settings
        </button>
        <div className="p-2.5 flex items-center gap-3 relative border-t border-transparent">
          <div 
            onClick={() => setIsAvatarSelectorOpen(!isAvatarSelectorOpen)}
            className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs overflow-hidden cursor-pointer hover:ring-2 hover:ring-blue-500/50 transition-all duration-200 relative group"
            title="Change profile avatar"
          >
            {userProfile.avatar ? (
              <img src={userProfile.avatar} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" referrerPolicy="no-referrer" />
            ) : (
              userProfile.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
            )}
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera size={10} className="text-white" />
            </div>
          </div>
          <div className="flex-1 text-xs">
            <div className="font-semibold truncate dark:text-white">{userProfile.name}</div>
            <div className="text-gray-400 dark:text-zinc-500">{userProfile.location || 'Pro Plan'}</div>
          </div>

          <AnimatePresence>
            {isAvatarSelectorOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40 bg-transparent" 
                  onClick={() => setIsAvatarSelectorOpen(false)} 
                />
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute bottom-12 left-0 w-56 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-2.5 shadow-xl z-50 flex flex-col gap-2"
                >
                  <div className="text-[10px] font-semibold text-gray-450 dark:text-zinc-500 uppercase tracking-widest px-1">
                    Select avatar
                  </div>
                  <div className="grid grid-cols-5 gap-1.5 justify-items-center">
                    {AVAILABLE_AVATARS.map((avatarUrl, idx) => {
                      const isSelected = userProfile.avatar === avatarUrl;
                      return (
                        <button
                          key={idx}
                          onClick={() => {
                            if (setUserProfile) {
                              setUserProfile((prev: any) => ({ ...prev, avatar: avatarUrl }));
                            }
                            setIsAvatarSelectorOpen(false);
                          }}
                          className={`w-8 h-8 rounded-full overflow-hidden transition-all duration-200 border-2 hover:scale-110 active:scale-95 ${
                            isSelected 
                              ? "border-blue-500 scale-105 ring-2 ring-blue-500/10" 
                              : "border-transparent hover:border-gray-200 dark:hover:border-zinc-700"
                          }`}
                        >
                          <img 
                            src={avatarUrl} 
                            alt="" 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
};
