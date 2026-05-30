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
  Camera 
} from 'lucide-react';
import { Chat } from '../../types';
import { AVAILABLE_AVATARS } from '../../constants';

interface SidebarProps {
  chats: Chat[];
  currentChatId: string | null;
  setCurrentChatId: (id: string | null) => void;
  createNewChat: (projId?: string | null) => void;
  setChats: React.Dispatch<React.SetStateAction<Chat[]>>;
  onOpenSettings: () => void;
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
  children,
}: SidebarProps) => {
  const [isRecentChatsOpen, setIsRecentChatsOpen] = useState(false);
  const [isAvatarSelectorOpen, setIsAvatarSelectorOpen] = useState(false);
  const [isProjectsOpen, setIsProjectsOpen] = useState(false);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});

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
        {children}
        {/* Projects Category */}
        <div className="space-y-1">
          <button
            onClick={() => setIsProjectsOpen(!isProjectsOpen)}
            className="w-full flex items-center justify-between text-xs font-semibold text-zinc-400 dark:text-zinc-500 hover:text-zinc-300 dark:hover:text-zinc-300 mb-1.5 px-2.5 py-1 transition-colors cursor-pointer text-left animate-focus-target"
            id="projects-category-header"
          >
            <span>Projects</span>
            <ChevronDown size={11} className={`transition-transform duration-200 text-zinc-400 dark:text-zinc-500 ${isProjectsOpen ? '' : '-rotate-90'}`} />
          </button>

          <AnimatePresence initial={false}>
            {isProjectsOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className="space-y-0.5 overflow-hidden"
              >
                {!isCreatingProject ? (
                  <button
                    onClick={() => setIsCreatingProject(true)}
                    className="w-full py-1 px-2.5 rounded-md flex items-center gap-2.5 text-xs font-medium bg-transparent text-zinc-450 hover:text-zinc-200 hover:bg-zinc-800/20 transition-all cursor-pointer select-none"
                  >
                    <FolderPlus size={15} className="shrink-0 text-zinc-500" />
                    <span>New Project</span>
                  </button>
                ) : (
                  <div className="px-2 py-0.5 mb-0.5">
                    <div className="flex items-center gap-2 bg-transparent border border-zinc-800 rounded-md p-1">
                      <Folder size={14} className="text-zinc-500 ml-1 shrink-0" />
                      <input
                        type="text"
                        value={newProjectName}
                        onChange={(e) => setNewProjectName(e.target.value)}
                        placeholder="Folder name..."
                        className="bg-transparent border-none text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-0 w-full font-medium"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleSaveProject();
                          } else if (e.key === 'Escape') {
                            setIsCreatingProject(false);
                            setNewProjectName('');
                          }
                        }}
                      />
                      <button
                        onClick={handleSaveProject}
                        className="p-0.5 text-emerald-400 hover:bg-zinc-800/40 rounded cursor-pointer shrink-0"
                      >
                        <Check size={11} />
                      </button>
                      <button
                        onClick={() => {
                          setIsCreatingProject(false);
                          setNewProjectName('');
                        }}
                        className="p-0.5 text-rose-450 hover:bg-zinc-800/40 rounded cursor-pointer shrink-0"
                      >
                        <X size={11} />
                      </button>
                    </div>
                  </div>
                )}

                {projectFolders.map(folder => {
                  const isSelected = activeProjectId === folder.id;
                  const isFolderExpanded = expandedFolders[folder.id] ?? true;
                  const folderChats = chats.filter(c => c.projectId === folder.id);

                  return (
                    <div key={folder.id} className="space-y-0.5">
                      <div className="group/folder relative">
                        <div
                          onClick={() => {
                            setExpandedFolders(prev => ({ ...prev, [folder.id]: !isFolderExpanded }));
                            if (setActiveProjectId) {
                              setActiveProjectId(folder.id);
                            }
                            setCurrentChatId(null);
                          }}
                          className={`w-full py-1 px-2.5 rounded-md flex items-center justify-between transition-all select-none cursor-pointer ${
                            isSelected 
                              ? 'bg-zinc-800/25 text-zinc-100 font-medium' 
                              : 'bg-transparent text-zinc-400 hover:bg-zinc-800/20 hover:text-zinc-200'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <Folder size={15} className={`shrink-0 ${isSelected ? 'text-zinc-350' : 'text-zinc-500'}`} />
                            <span className="truncate text-xs">{folder.name}</span>
                            {folderChats.length > 0 && (
                              <span className="text-[9px] px-1.2 py-0.2 rounded-full font-bold leading-none bg-zinc-800/40 text-zinc-500 border border-zinc-850/40">
                                {folderChats.length}
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover/folder:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedFolders(prev => ({ ...prev, [folder.id]: true }));
                                createNewChat(folder.id);
                              }}
                              className="p-0.5 hover:bg-zinc-800 rounded-md text-zinc-500 hover:text-zinc-300 transition-colors"
                              title="New Chat in this folder"
                            >
                              <Plus size={10} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (setProjectFolders) {
                                  setProjectFolders(prev => prev.filter(f => f.id !== folder.id));
                                }
                                if (activeProjectId === folder.id && setActiveProjectId) {
                                  setActiveProjectId(null);
                                }
                              }}
                              className="p-0.5 text-zinc-555 hover:text-red-400 hover:bg-zinc-800 rounded-md transition-colors"
                              title="Delete folder"
                            >
                              <Trash2 size={10} />
                            </button>
                          </div>

                          <ChevronDown size={10} className={`ml-1 text-zinc-500 shrink-0 transition-transform duration-200 ${isFolderExpanded ? '' : '-rotate-90 group-hover/folder:opacity-0'}`} />
                        </div>
                      </div>

                      <AnimatePresence initial={false}>
                        {isFolderExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.15, ease: "easeInOut" }}
                            className="pl-4 pr-1 py-0.5 space-y-0.5 overflow-hidden border-l border-zinc-800/40 ml-4"
                          >
                            {folderChats.map(chat => (
                              <div key={chat.id} className="group/chat relative">
                                <button
                                  onClick={() => {
                                    setCurrentChatId(chat.id);
                                    if (onSelect) onSelect();
                                  }}
                                  className={`w-full py-1 px-2 rounded-md flex items-center gap-2 text-xs transition-colors pr-8 ${
                                    currentChatId === chat.id
                                      ? 'text-zinc-200 bg-zinc-800/20 font-medium pl-1.5 border-l border-zinc-650' 
                                      : 'text-zinc-500 hover:bg-zinc-800/20 hover:text-zinc-350'
                                  }`}
                                >
                                  <MessageSquare size={13} className={(currentChatId === chat.id) ? 'text-zinc-400' : 'text-zinc-505'} />
                                  <span className="truncate text-left flex-1">{chat.title}</span>
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setChats(prev => prev.filter(c => c.id !== chat.id));
                                    if (currentChatId === chat.id) setCurrentChatId(null);
                                  }}
                                  className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 text-zinc-500 hover:text-red-400 hover:bg-zinc-800 rounded opacity-0 group-hover/chat:opacity-100 transition-all cursor-pointer"
                                  title="Delete chat"
                                >
                                  <Trash2 size={10} />
                                </button>
                              </div>
                            ))}
                            {folderChats.length === 0 && (
                              <button
                                onClick={() => createNewChat(folder.id)}
                                className="w-full py-1.5 px-2 rounded-md flex items-center gap-2 text-[10px] text-zinc-555 hover:bg-zinc-800/20 border border-dashed border-zinc-800/60 hover:text-zinc-404 text-left transition-all"
                              >
                                <Plus size={11} className="text-zinc-555" />
                                <span>Empty folder</span>
                              </button>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
                {projectFolders.length === 0 && !isCreatingProject && (
                  <div className="px-3 py-2 text-xs text-zinc-500 italic">No projects created</div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>



        <div className="space-y-1">
          <button
            onClick={() => setIsRecentChatsOpen(!isRecentChatsOpen)}
            className="w-full flex items-center justify-between text-[11px] font-semibold text-gray-400 dark:text-zinc-500 uppercase tracking-wider mb-2 px-3 py-1.5 hover:text-gray-800 dark:hover:text-zinc-200 transition-colors rounded-lg cursor-pointer text-left"
          >
            <span>Recent Chats</span>
            <ChevronDown size={12} className={`transition-transform duration-200 text-gray-400 dark:text-zinc-500 ${isRecentChatsOpen ? '' : '-rotate-90'}`} />
          </button>
          <AnimatePresence initial={false}>
            {isRecentChatsOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className="space-y-1 overflow-hidden"
              >

                {chats.filter(c => !c.projectId).map(chat => (
                  <div key={chat.id} className="group relative">
                    <button
                      onClick={() => {
                        setCurrentChatId(chat.id);
                        if (onSelect) onSelect();
                      }}
                      className={`w-full p-2.5 rounded-lg flex items-center gap-3 text-sm font-medium transition-colors pr-10 ${
                        currentChatId === chat.id
                          ? 'bg-gray-200/50 text-black dark:text-white font-semibold' 
                          : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:hover:text-zinc-300'
                      }`}
                    >
                      <MessageSquare size={16} className={(currentChatId === chat.id) ? 'text-black dark:text-white' : 'text-gray-400'} />
                      <span className="truncate">{chat.title}</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setChats(prev => prev.filter(c => c.id !== chat.id));
                        if (currentChatId === chat.id) setCurrentChatId(null);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                      title="Delete chat"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                {chats.filter(c => !c.projectId).length === 0 && (
                  <div className="px-3 py-4 text-xs text-gray-400 dark:text-zinc-500 italic">No recent chats</div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="mt-auto pt-4 border-t border-gray-200 dark:border-white/5 space-y-1">
        <button 
          onClick={onOpenSettings}
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
