/**
 * Lumina AI Chat UI
 * Modern intelligence, refined interface.
 * 
 * A polished, dark-native AI chat prototype built with React, Lucide-react, 
 * Motion, and Tailwind CSS v4.
 * 
 * Tools are categorized into built-in "Lumina Tools" (Web Scraper & Wikipedia) and external "Llama Bridge Tools".
 */

// Dependencies: react-syntax-highlighter @types/react-syntax-highlighter

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Send, 
  Plus, 
  Sparkles, 
  ArrowUp,
  Sidebar as SidebarIcon,
  Wrench,
  Hammer,
  User,
  Search,
  Bot,
  Layers,
  Bug,
  MoreVertical,
  Settings,
  Trash2,
  ChevronDown,
  HardDrive,
  Brain,
  Globe,
  Loader2,
  Newspaper,
  Play,
  ExternalLink,
  Maximize2,
  Minimize2,
  SquareTerminal,
  RefreshCw,
  X,
  Languages,
  Layout,
  MessageSquare,
  StopCircle,
  Download,
  FileUp,
  Camera,
  FolderPlus,
  Folder,
  Box,
  MapPin,
  CloudSun,
  Book,
  Image as ImageIcon,
  Library,
  Link as LinkIcon,
  Check,
  ChevronRight,
  ChevronLeft,
  ArrowRight,
  Palette,
  Terminal,
  Calendar,
  CloudMoon,
  Video,
  Copy,
  PenTool,
  History,
  FileText,
  Code,
  Type as TypeIcon,
  Music,
  Mail,
  Coffee,
  Lightbulb,
  BookOpen,
  Activity,
  Beaker,
  Compass,
  Flower2,
  Mic,
  Smartphone,
  Tablet,
  Monitor,
  Grid,
  Sliders,
  AlignLeft,
  AlignCenter,
  AlignRight,
  MousePointerClick
} from 'lucide-react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

import { fetchBridgeTools, callLlamaBridge as bridgeCall, checkBridgeHealth } from './bridgeClient';
import { useTheme } from './themes';
import { CustomCodeBlockVisualizer, renderTextWithMath, InteractiveTableVisualizer } from './components/LuminaVisualizer';
import { PhysicsGraphCanvas } from './components/PhysicsGraphCanvas';
import { ChemistryLabCanvas } from './components/ChemistryLabCanvas';
import { MathLabCanvas } from './components/MathLabCanvas';
import { BiologyLabCanvas } from './components/BiologyLabCanvas';
import { CoderWorkspacePanel } from './components/CoderWorkspacePanel';
import { CoderLeftExplorer } from './components/CoderLeftExplorer';
import { FloatingCodeEditor } from './components/FloatingCodeEditor';
import TerminalConsole from './components/TerminalConsole';
import Whiteboard from './components/Whiteboard';

import { scrapeUrl, ScrapeResult, ScrapeOptions } from './services/scrapingService';
import { ScrapingResultArtifact } from './components/ScrapingResultArtifact';
import { ScrapingProgressIndicator } from './components/ScrapingProgressIndicator';

import { WikiArticleArtifact } from './components/WikiArticleArtifact';
import { WikiSearchResultList } from './components/WikiSearchResultList';
import { WikiToolCallIndicator } from './components/WikiToolCallIndicator';
import { ALL_WIKI_TOOLS } from './tools/wikiTools';
import { webScrapeTool } from './tools/webScrapeTool';
import {
  wikiSearch,
  wikiGetPage,
  wikiGetSummary,
  wikiGetSections,
  wikiGetCategories,
  wikiGetLinks,
  wikiGetImages,
  wikiGetRelated
} from './services/wikiService';

import { useSmartPopupPosition } from './hooks/useSmartPopupPosition';

interface ToolCallNode {
  id: string;
  type: 'ai' | 'tool' | 'sub-tool' | 'result' | 'error';
  label: string;
  status: 'pending' | 'active' | 'complete' | 'failed';
  icon?: React.ReactNode;
  toolName?: string;
  argsCount?: number;
  durationMs?: number;
  resultSummary?: string;
  subNodes?: ToolCallNode[];
  filePath?: string;
  addedCount?: number;
  removedCount?: number;
}

interface Artifact {
  id: string;
  title: string;
  language: string;
  content: string;
  type: 'code' | 'markdown' | 'html' | 'poem' | 'report';
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  thinking?: string;
  thinkContent?: string;
  isThinking?: boolean;
  sources?: { title: string; url: string; icon?: string; snippet?: string }[];
  images?: { title: string; url: string; thumbnail?: string; source?: string }[];
  searchQuery?: string;
  isSearching?: boolean;
  isStreaming?: boolean;
  streamPos?: number;
  toolCalls?: ToolCallNode[];
  artifacts?: Artifact[];
  elementAttachments?: any[];
  todoPlan?: {
    title: string;
    todos: { id: string; text: string; status: 'pending' | 'in_progress' | 'complete' | 'failed' }[];
    isConfirmed?: boolean;
    countdown?: number;
  };
}

interface Chat {
   id: string;
   title: string;
   messages: Message[];
   updatedAt: Date;
   projectId?: string;
}

interface Tool {
    id: string;
    name: string;
    description: string;
    enabled: boolean;
    icon: React.ReactNode;
    parameters?: any;
  }
  
  interface ToolDefinition {
    type: 'function';
    function: {
      name: string;
      description: string;
      parameters: {
        type: 'object';
        properties: Record<string, any>;
        required: string[];
      };
    };
  }

interface Skill {
  id: string;
  label: string;
  prompt: string;
  icon: React.ReactNode;
}

const WebSearchAnimation = () => (
  <motion.div
    animate={{ 
      rotate: 360,
      scale: [1, 1.1, 1],
    }}
    transition={{ 
      rotate: { repeat: Infinity, duration: 8, ease: "linear" },
      scale: { repeat: Infinity, duration: 3, ease: "easeInOut" }
    }}
    className="flex items-center justify-center relative"
  >
    <div className="absolute inset-0 bg-teal-500/20 blur-xl rounded-full" />
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-teal-500 relative z-10">
      <circle cx="12" cy="12" r="1"/>
      <path d="M20.2 20.2c2.04-2.03.02-7.36-4.5-11.9c-4.54-4.52-9.87-6.54-11.9-4.5c-2.04 2.03-.02 7.36 4.5 11.9c4.54 4.52 9.87 6.54 11.9 4.5"/>
      <path d="M15.7 15.7c4.52-4.54 6.54-9.87 4.5-11.9c-2.03-2.04-7.36-.02-11.9 4.5c-4.52 4.54-6.54 9.87-4.5 11.9c2.03 2.04 7.36.02 11.9-4.5"/>
    </svg>
  </motion.div>
);

const ToolCallingAnimation = () => (
  <motion.div
    animate={{ 
      y: [0, -2, 0],
      rotate: [0, 8, -8, 0],
      scale: [1, 1.05, 1]
    }}
    transition={{ 
      repeat: Infinity, 
      duration: 2.5, 
      ease: "easeInOut" 
    }}
    className="flex items-center justify-center relative"
  >
    <div className="absolute inset-0 bg-emerald-500/20 blur-xl rounded-full" />
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500 relative z-10">
      <path d="m14 12l-8.381 8.38a1 1 0 0 1-3.001-3L11 9"/>
      <path d="M15 15.5a.5.5 0 0 0 .5.5A6.5 6.5 0 0 0 22 9.5a.5.5 0 0 0-.5-.5h-1.672a2 2 0 0 1-1.414-.586l-5.062-5.062a1.205 1.205 0 0 0-1.704 0L9.352 5.648a1.205 1.205 0 0 0 0 1.704l5.062 5.062A2 2 0 0 1 15 13.828z"/>
    </svg>
  </motion.div>
);

const LuminaToolCallingAnimation = () => (
  <motion.div
    animate={{ 
      y: [0, -3, 0],
      rotate: [0, -12, 12, 0],
      scale: [1, 1.08, 1]
    }}
    transition={{ 
      repeat: Infinity, 
      duration: 2.2, 
      ease: "easeInOut" 
    }}
    className="flex items-center justify-center relative select-none pointer-events-none"
  >
    <div className="absolute inset-0 bg-orange-500/20 blur-xl rounded-full animate-pulse" />
    <Hammer size={16} className="text-orange-500 relative z-10" />
  </motion.div>
);

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
  activeLabTab: 'physics' | 'chemistry' | 'math' | 'biology' | null;
  setActiveLabTab: (tab: 'physics' | 'chemistry' | 'math' | 'biology' | null) => void;
  onSelect?: () => void;
  activeProjectId?: string | null;
  setActiveProjectId?: (id: string | null) => void;
  isSidebarOpen?: boolean;
  setIsSidebarOpen?: (open: boolean) => void;
}

const AVAILABLE_AVATARS = [
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Sophia",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=John",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Sasha",
];

const SidebarContent = ({ 
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
  activeLabTab,
  setActiveLabTab,
  onSelect,
  activeProjectId,
  setActiveProjectId,
  isSidebarOpen,
  setIsSidebarOpen,
}: SidebarProps) => {
  const [labsHovered, setLabsHovered] = useState(false);
  const [isRecentChatsOpen, setIsRecentChatsOpen] = useState(true);
  const [isLabsSectionOpen, setIsLabsSectionOpen] = useState(false);
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

  const isPhysicsTabActive = activeLabTab !== null;
  const setIsPhysicsTabActive = (active: boolean) => {
    setActiveLabTab(active ? 'physics' : null);
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
          setActiveLabTab(null);
        }}
        className="flex items-center gap-3 p-3 mb-6 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/5 rounded-xl shadow-sm hover:shadow-md hover:border-gray-300 dark:hover:border-white/10 transition-all text-sm font-medium dark:text-white"
      >
        <Plus size={18} />
        New chat
      </button>

      <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar">
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
                              className="p-0.5 text-zinc-550 hover:text-red-400 hover:bg-zinc-800 rounded-md transition-colors"
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
                                    setIsPhysicsTabActive(false);
                                    if (onSelect) onSelect();
                                  }}
                                  className={`w-full py-1 px-2 rounded-md flex items-center gap-2 text-xs transition-colors pr-8 ${
                                    (!isPhysicsTabActive && currentChatId === chat.id)
                                      ? 'text-zinc-200 bg-zinc-800/20 font-medium pl-1.5 border-l border-zinc-600' 
                                      : 'text-zinc-500 hover:bg-zinc-800/20 hover:text-zinc-350'
                                  }`}
                                >
                                  <MessageSquare size={13} className={(!isPhysicsTabActive && currentChatId === chat.id) ? 'text-zinc-400' : 'text-zinc-500'} />
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
                                className="w-full py-1.5 px-2 rounded-md flex items-center gap-2 text-[10px] text-zinc-550 hover:bg-zinc-800/20 border border-dashed border-zinc-800/60 hover:text-zinc-400 text-left transition-all"
                              >
                                <Plus size={11} className="text-zinc-550" />
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

        <div 
          className="space-y-1 relative"
          onMouseEnter={() => setLabsHovered(true)}
          onMouseLeave={() => setLabsHovered(false)}
        >
          <button
            onClick={() => setIsLabsSectionOpen(!isLabsSectionOpen)}
            className="w-full flex items-center justify-between text-[11px] font-semibold text-gray-400 dark:text-zinc-500 uppercase tracking-wider mb-2 px-3 py-1.5 hover:text-gray-800 dark:hover:text-zinc-200 transition-colors rounded-lg cursor-pointer text-left"
          >
            <span>Laboratories</span>
            <ChevronDown size={12} className={`transition-transform duration-200 text-gray-400 dark:text-zinc-500 ${isLabsSectionOpen ? '' : '-rotate-90'}`} />
          </button>

          <AnimatePresence initial={false}>
            {isLabsSectionOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className="space-y-1 overflow-hidden"
              >
                <button
                  onClick={() => {
                    if (!activeLabTab) {
                      setActiveLabTab('physics');
                      setCurrentChatId(null);
                    }
                  }}
                  className={`w-full p-2.5 rounded-lg flex items-center gap-3 text-sm font-medium transition-colors ${
                    isPhysicsTabActive 
                      ? 'bg-gray-200/50 dark:bg-white/10 text-black dark:text-white font-bold' 
                      : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-white/5 dark:hover:text-zinc-300'
                  }`}
                >
                  <Beaker size={16} className={isPhysicsTabActive ? 'text-blue-500 animate-pulse' : 'text-gray-450'} />
                  <span className="truncate">Labs</span>
                  <ChevronDown size={14} className={`ml-auto transition-transform duration-200 text-gray-450 ${labsHovered ? 'rotate-180 text-blue-505 dark:text-white' : ''}`} />
                </button>

                <AnimatePresence>
                  {(labsHovered || isPhysicsTabActive) && (
                    <motion.div
                      initial={isPhysicsTabActive ? { opacity: 1, height: 'auto' } : { opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="pl-3 pr-1 py-1 space-y-1 overflow-hidden border-l border-zinc-200/50 dark:border-white/5 ml-4"
                    >
                      {[
                        { id: 'physics' as const, name: 'Physics Tab', icon: <Activity size={14} className="text-blue-500" /> },
                        { id: 'chemistry' as const, name: 'Chemistry Tab', icon: <Beaker size={14} className="text-emerald-500" /> },
                        { id: 'math' as const, name: 'Math Tab', icon: <Compass size={14} className="text-purple-500" /> },
                        { id: 'biology' as const, name: 'Biology Tab', icon: <Flower2 size={14} className="text-rose-500" /> }
                      ].map(lab => (
                        <button
                          key={lab.id}
                          onClick={() => {
                            setActiveLabTab(lab.id);
                            setCurrentChatId(null);
                            if (onSelect) onSelect();
                          }}
                          className={`w-full p-2 rounded-md flex items-center gap-2.5 text-xs font-medium transition-all ${
                            activeLabTab === lab.id
                              ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 font-semibold'
                              : 'text-gray-500 hover:bg-gray-100 hover:text-gray-805 dark:hover:bg-white/5 dark:hover:text-zinc-200'
                          }`}
                        >
                          {lab.icon}
                          <span className="truncate">{lab.name}</span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
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
        {activeLabTab && (
          <div className="group relative">
            <button
              onClick={() => {
                setCurrentChatId(null);
                if (onSelect) onSelect();
              }}
              className="w-full p-2.5 rounded-lg flex items-center gap-3 text-sm font-semibold transition-colors pr-10 bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/15"
            >
              <Activity size={16} className="text-blue-500 animate-pulse shrink-0" />
              <span className="truncate">
                {activeLabTab.charAt(0).toUpperCase() + activeLabTab.slice(1)} Laboratory
              </span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setActiveLabTab(null);
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-md opacity-0 group-hover:opacity-100 transition-all cursor-pointer border border-transparent h-7 w-7 flex items-center justify-center hover:border-red-500/20"
              title="Close tab"
            >
              <X size={13} />
            </button>
          </div>
        )}
        {chats.filter(c => !c.projectId).map(chat => (
          <div key={chat.id} className="group relative">
            <button
              onClick={() => {
                setCurrentChatId(chat.id);
                setIsPhysicsTabActive(false);
                if (onSelect) onSelect();
              }}
              className={`w-full p-2.5 rounded-lg flex items-center gap-3 text-sm font-medium transition-colors pr-10 ${
                (!isPhysicsTabActive && currentChatId === chat.id)
                  ? 'bg-gray-200/50 text-black dark:text-white' 
                  : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:hover:text-zinc-300'
              }`}
            >
              <MessageSquare size={16} className={(!isPhysicsTabActive && currentChatId === chat.id) ? 'text-black dark:text-white' : 'text-gray-400'} />
              <span className="truncate">{chat.title}</span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setChats(prev => prev.filter(c => c.id !== chat.id));
                if (currentChatId === chat.id) setCurrentChatId(null);
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md opacity-0 group-hover:opacity-100 transition-all"
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

    <div className="mt-auto pt-4 border-t border-gray-200 space-y-1">
      <button 
        onClick={onOpenSettings}
        className="flex items-center gap-3 w-full p-2.5 hover:bg-gray-200/50 rounded-lg text-sm text-gray-600 transition-colors"
      >
        <Settings size={18} />
        Settings
      </button>
      <div className="p-2.5 flex items-center gap-3 relative">
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
          <div className="font-semibold truncate">{userProfile.name}</div>
          <div className="text-gray-400">{userProfile.location || 'Pro Plan'}</div>
        </div>

        {/* Dynamic Avatar Picker Popover */}
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
                <div className="text-[10px] font-semibold text-gray-400 dark:text-zinc-500 uppercase tracking-widest px-1">
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

const CanvasBlock = React.memo(({ language, code, isStreaming }: { language: string; code: string; isStreaming?: boolean }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`bg-[#0d0d0d] border rounded-2xl overflow-hidden shadow-xl my-4 transition-all duration-300 ${isStreaming ? 'border-blue-500/30 ring-1 ring-blue-500/15 shadow-md shadow-blue-500/5' : 'border-white/8'}`}>
      <div className={`flex items-center justify-between px-4 py-2.5 border-b transition-all duration-300 relative overflow-hidden ${isStreaming ? 'bg-[#151a24] border-blue-500/20' : 'bg-[#161616] border-white/5'}`}>
        {isStreaming && (
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/[0.04] to-blue-500/0 animate-pulse pointer-events-none" />
        )}
        <div className="flex items-center gap-2.5 z-10">
          <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full flex items-center gap-1.5 font-sans">
            {isStreaming && (
              <Loader2 size={11} className="animate-spin text-blue-450" />
            )}
            {language || 'code'}
          </span>
          {isStreaming && (
            <span className="text-[10px] text-blue-400/80 font-medium animate-pulse uppercase tracking-wider font-sans">
              Generating code...
            </span>
          )}
        </div>
        <button
          onClick={handleCopy}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all z-10 ${
            copied
              ? 'text-emerald-400 bg-emerald-500/10'
              : 'text-gray-500 hover:text-white hover:bg-white/5'
          }`}
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <div className="overflow-x-auto p-5 custom-scrollbar">
        {typeof SyntaxHighlighter === 'function' ? (
          <SyntaxHighlighter
            language={language}
            style={oneDark}
            customStyle={{ 
              background: 'transparent', 
              backgroundColor: 'transparent',
              fontSize: '13px', 
              lineHeight: '1.6', 
              margin: 0,
              padding: 0,
              border: 'none',
              boxShadow: 'none',
              textDecoration: 'none'
            }}
            codeTagProps={{
              style: {
                background: 'transparent',
                backgroundColor: 'transparent',
                border: 'none',
                textDecoration: 'none',
                boxShadow: 'none'
              }
            }}
            showLineNumbers
            lineNumberStyle={{ 
              color: '#3f3f46', 
              minWidth: '2.5em',
              background: 'transparent',
              backgroundColor: 'transparent',
              paddingRight: '1em',
              textAlign: 'right',
              userSelect: 'none',
              borderRight: 'none',
              textDecoration: 'none'
            }}
          >
            {code}
          </SyntaxHighlighter>
        ) : (
          <pre className="text-gray-300 text-[13px] leading-relaxed font-mono whitespace-pre">
            <code>{code}</code>
          </pre>
        )}
      </div>
    </div>
  );
});

const CLOUD_PROVIDERS = [
  { id: 'custom', label: 'Custom / Local', endpoint: '', key: '', icon: <Terminal size={13} /> },
  { id: 'openai', label: 'OpenAI', endpoint: 'https://api.openai.com/v1', key: '', icon: <Sparkles size={13} /> },
  { id: 'anthropic', label: 'Anthropic', endpoint: 'https://api.anthropic.com/v1', key: '', icon: <Brain size={13} /> },
  { id: 'groq', label: 'Groq', endpoint: 'https://api.groq.com/openai/v1', key: '', icon: <Terminal size={13} /> },
  { id: 'openrouter', label: 'OpenRouter', endpoint: 'https://openrouter.ai/api/v1', key: '', icon: <Box size={13} /> },
  { id: 'together', label: 'Together AI', endpoint: 'https://api.together.xyz/v1', key: '', icon: <Sparkles size={13} /> },
  { id: 'mistral', label: 'Mistral', endpoint: 'https://api.mistral.ai/v1', key: '', icon: <Sparkles size={13} /> },
  { id: 'ollama_cloud', label: 'Ollama Cloud', endpoint: 'https://ollama.com', key: '', icon: <CloudSun size={13} /> },
  { id: 'ollama_local', label: 'Ollama Local', endpoint: 'http://127.0.0.1:11434/v1', key: '', icon: <Terminal size={13} /> },
  { id: 'lm_studio', label: 'LM Studio', endpoint: 'http://127.0.0.1:1234/v1', key: '', icon: <HardDrive size={13} /> },
  { id: 'nvidia_nim', label: 'NVIDIA NIM', endpoint: 'https://integrate.api.nvidia.com/v1', key: '', icon: <Sparkles size={13} /> },
  { id: 'gemini', label: 'Gemini', endpoint: 'https://generativelanguage.googleapis.com/v1beta/openai', key: '', icon: <Sparkles size={13} /> },
  { id: 'cohere', label: 'Cohere', endpoint: 'https://api.cohere.com/compatibility/v1', key: '', icon: <Globe size={13} /> },
  { id: 'deepseek', label: 'DeepSeek', endpoint: 'https://api.deepseek.com', key: '', icon: <Box size={13} /> },
  { id: 'sarvamai', label: 'Sarvam AI', endpoint: 'https://api.sarvam.ai/v1', key: '', icon: <Globe size={13} /> },
  { id: 'kilo', label: 'Kilo Code', endpoint: 'https://api.kilo.ai/api/gateway', key: '', icon: <Terminal size={13} /> },
  { id: 'opencode', label: 'OpenCode', endpoint: 'https://opencode.ai/zen', key: '', icon: <Box size={13} /> },
  { id: 'cline', label: 'Cline', endpoint: 'https://api.cline.bot', key: '', icon: <Terminal size={13} /> },
];

const getDomain = (url: string) => {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
};

const getFavicon = (url: string) => {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
  } catch {
    return null;
  }
};

function parseThinkTags(content: string): { before: string; think: string; after: string; isThinking: boolean } {
  const openTag = '<think>';
  const closeTag = '</think>';
  const startIdx = content.indexOf(openTag);
  
  if (startIdx === -1) {
    return { before: content, think: '', after: '', isThinking: false };
  }
  
  const endIdx = content.indexOf(closeTag, startIdx + openTag.length);
  if (endIdx === -1) {
    // We are currently in the middle of thinking
    const before = content.slice(0, startIdx);
    const think = content.slice(startIdx + openTag.length);
    return { before, think, after: '', isThinking: true };
  }
  
  // Thinking has completed
  const before = content.slice(0, startIdx);
  const think = content.slice(startIdx + openTag.length, endIdx);
  const after = content.slice(endIdx + closeTag.length);
  return { before, think, after, isThinking: false };
}

const SearchResultsUI = React.memo(({ query, sources }: { query: string; sources: any[]; isSearching?: boolean }) => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="my-6 space-y-4">
      <div className="flex items-center justify-between text-[13px] font-medium text-zinc-500 dark:text-zinc-400 pl-1">
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-lg border shadow-xs bg-zinc-50 border-zinc-100 dark:bg-white/5 dark:border-white/10 text-blue-500">
            <Globe size={14} />
          </div>
          <div className="flex flex-col">
            <span className="text-zinc-850 dark:text-zinc-200 font-semibold">{query}</span>
            <span className="text-[10px] text-zinc-400 dark:text-zinc-550 uppercase tracking-widest">{sources.length} sources found</span>
          </div>
        </div>

        {/* Collapsible Area Trigger named Web Source */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-zinc-200/50 dark:border-white/5 bg-zinc-50/50 dark:bg-zinc-900/30 hover:bg-zinc-100 dark:hover:bg-zinc-900/50 text-zinc-700 dark:text-zinc-300 cursor-pointer transition-all hover:border-zinc-300 dark:hover:border-white/10 shadow-3xs"
        >
          <span className="font-bold">Web Source</span>
          <motion.div
            animate={{ rotate: isOpen ? 0 : -90 }}
            transition={{ duration: 0.15 }}
            className="text-zinc-400"
          >
            <ChevronDown size={11} />
          </motion.div>
        </button>
      </div>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="bg-zinc-50/50 dark:bg-white/[0.02] border border-zinc-100 dark:border-white/5 rounded-2xl overflow-hidden shadow-sm mt-1">
              <div className="p-1 space-y-0.5">
                {sources.map((source, i) => (
                  <motion.a
                    key={i}
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center justify-between p-3 hover:bg-white dark:hover:bg-white/10 rounded-xl transition-all group cursor-pointer block"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-6 h-6 rounded-md bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-white/10 flex items-center justify-center p-1 shrink-0 bg-white/50 backdrop-blur-sm">
                        {getFavicon(source.url) ? (
                          <img src={getFavicon(source.url)!} alt="" className="w-full h-full object-contain filter dark:brightness-90 truncate" referrerPolicy="no-referrer" />
                        ) : (
                          <Globe size={12} className="text-zinc-400" />
                        )}
                      </div>
                      <span className="text-[13px] font-medium text-zinc-650 dark:text-zinc-350 group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate transition-colors underline-offset-2 group-hover:underline">
                        {source.title || source.url}
                      </span>
                    </div>
                    <span className="text-[11px] text-zinc-450 dark:text-zinc-500 font-mono tracking-tight shrink-0 pl-4 opacity-60 group-hover:opacity-100 transition-opacity">
                      {getDomain(source.url)}
                    </span>
                  </motion.a>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

const renderNodeIcon = (icon: any) => {
  if (!icon) return <FileText size={14} />;
  
  if (React.isValidElement(icon)) {
    return icon;
  }
  
  if (typeof icon === 'string') {
    const name = icon.toLowerCase();
    if (name.includes('search') || name.includes('research')) return <Search size={14} />;
    if (name.includes('wikipedia') || name.includes('globe')) return <Globe size={14} />;
    if (name.includes('read') || name.includes('view') || name.includes('file') || name.includes('fs')) return <FileText size={14} />;
    if (name.includes('write') || name.includes('edit')) return <PenTool size={14} />;
    if (name.includes('github') || name.includes('box')) return <Box size={14} />;
    if (name.includes('weather') || name.includes('cloud')) return <CloudMoon size={14} />;
    if (name.includes('shell') || name.includes('terminal')) return <Terminal size={14} />;
    if (name.includes('sparkles') || name.includes('ai')) return <Sparkles size={14} />;
    if (name.includes('check') || name.includes('success')) return <Check size={14} />;
    return <FileText size={14} />;
  }

  if (typeof icon === 'object') {
    let typeName = '';
    if (icon.type) {
      if (typeof icon.type === 'string') {
        typeName = icon.type;
      } else if (typeof icon.type === 'object') {
        typeName = icon.type.name || icon.type.displayName || '';
      } else if (typeof icon.type === 'function') {
        typeName = icon.type.name || icon.type.displayName || '';
      }
    }
    
    const name = typeName.toLowerCase();
    if (name.includes('search') || name.includes('research')) return <Search size={14} />;
    if (name.includes('wikipedia') || name.includes('globe')) return <Globe size={14} />;
    if (name.includes('file') || name.includes('text')) return <FileText size={14} />;
    if (name.includes('pen') || name.includes('write') || name.includes('edit')) return <PenTool size={14} />;
    if (name.includes('github') || name.includes('box')) return <Box size={14} />;
    if (name.includes('weather') || name.includes('cloud')) return <CloudMoon size={14} />;
    if (name.includes('shell') || name.includes('terminal')) return <Terminal size={14} />;
    if (name.includes('sparkles') || name.includes('ai')) return <Sparkles size={14} />;
    if (name.includes('check') || name.includes('success')) return <Check size={14} />;
    
    return <FileText size={14} />;
  }

  return <FileText size={14} />;
};

const computeLineDiff = (oldContent: string, newContent: string) => {
  const oldLines = oldContent ? oldContent.split('\n') : [];
  const newLines = newContent ? newContent.split('\n') : [];
  
  let added = 0;
  let removed = 0;
  
  const oldSet = new Set(oldLines.map(l => l.trim()));
  const newSet = new Set(newLines.map(l => l.trim()));
  
  for (const line of newLines) {
    if (!oldSet.has(line.trim())) {
      added++;
    }
  }
  for (const line of oldLines) {
    if (!newSet.has(line.trim())) {
      removed++;
    }
  }
  
  if (oldContent !== newContent && added === 0 && removed === 0) {
    added = 1;
  }
  
  return { added, removed };
};

const getFileNameOnly = (path: string) => {
  if (!path) return 'file.ts';
  const parts = path.split('/');
  return parts[parts.length - 1];
};

const humanizeToolName = (toolName?: string, rawLabel?: string) => {
  if (!toolName) return rawLabel || 'System action';
  const lower = toolName.toLowerCase();
  
  if (lower === 'edit_coder_file') {
    return 'Modify and upgrade template source file';
  }
  if (lower === 'create_coder_file') {
    return 'Create new engineering component file';
  }
  if (lower === 'list_coder_files') {
    return 'Query and analyze codebase project file tree';
  }
  if (lower === 'read_coder_file') {
    return 'Inspect and parse file lines';
  }
  if (lower === 'delete_coder_file') {
    return 'Remove deprecated files from directory';
  }
  if (lower === 'verify_changes') {
    return 'Verify target changes';
  }
  return rawLabel || toolName;
};

const RealtimeEditCounter = ({ node }: { node: ToolCallNode }) => {
  const [added, setAdded] = React.useState(0);
  const [removed, setRemoved] = React.useState(0);
  const isEditing = node.status === 'active';
  const isComplete = node.status === 'complete';
  
  const targetAdded = node.addedCount ?? 45;
  const targetRemoved = node.removedCount ?? 8;

  React.useEffect(() => {
    if (isEditing) {
      const interval = setInterval(() => {
        setAdded(prev => {
          if (prev < targetAdded) {
            return prev + Math.floor(Math.random() * 3) + 1;
          }
          return prev + (Math.random() > 0.6 ? 1 : Math.random() > 0.8 ? -1 : 0);
        });
        setRemoved(prev => {
          if (prev < targetRemoved) {
            return prev + Math.floor(Math.random() * 2) + 1;
          }
          return prev + (Math.random() > 0.6 ? 1 : Math.random() > 0.8 ? -1 : 0);
        });
      }, 150);
      
      return () => clearInterval(interval);
    } else if (isComplete) {
      setAdded(node.addedCount ?? 0);
      setRemoved(node.removedCount ?? 0);
    }
  }, [isEditing, isComplete, targetAdded, targetRemoved, node.addedCount, node.removedCount]);

  const displayAdded = isEditing ? Math.max(1, added) : (node.addedCount ?? 0);
  const displayRemoved = isEditing ? Math.max(1, removed) : (node.removedCount ?? 0);

  return (
    <div className="flex items-center gap-2 mt-1 px-1 py-0.5 select-none font-sans flex-wrap ml-7">
      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700/50 font-mono text-[11px] text-zinc-650 dark:text-zinc-350">
        <span className="opacity-70">{getFileNameOnly(node.filePath || 'file.ts')}</span>
      </div>
      {displayAdded > 0 && (
        <span className="text-[11.5px] font-bold text-[#10b981] dark:text-[#34d399] font-mono">
          +{displayAdded}
        </span>
      )}
      {displayRemoved > 0 && (
        <span className="text-[11.5px] font-bold text-rose-500 font-mono">
          -{displayRemoved}
        </span>
      )}
    </div>
  );
};

const NodeGraph = React.memo(({ 
  nodes, 
  isStreaming,
  thinkContent,
  isStreamingThinking,
  isSearching,
  searchQuery,
  sources = [],
  scrapingResults = new Map(),
  wikiResults = new Map(),
  onSendMessage
}: { 
  nodes: ToolCallNode[]; 
  isStreaming?: boolean;
  thinkContent?: string;
  isStreamingThinking?: boolean;
  isSearching?: boolean;
  searchQuery?: string;
  sources?: any[];
  scrapingResults?: Map<string, ScrapeResult>;
  wikiResults?: Map<string, { wikiType: string, data: any }>;
  onSendMessage?: (msg: string) => void;
}) => {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return !(isStreaming || isStreamingThinking || isSearching || nodes.some(n => n.status === 'active'));
  });

  const [isThinkingExpanded, setIsThinkingExpanded] = useState(true);
  const [isSearchExpanded, setIsSearchExpanded] = useState(true);
  const [collapsedToolNodes, setCollapsedToolNodes] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (isStreaming || isStreamingThinking || isSearching || nodes.some(n => n.status === 'active')) {
      setIsCollapsed(false);
    }
  }, [nodes, isStreaming, isStreamingThinking, isSearching]);

  useEffect(() => {
    if (isStreamingThinking) {
      setIsThinkingExpanded(true);
    }
  }, [isStreamingThinking]);

  useEffect(() => {
    if (isSearching) {
      setIsSearchExpanded(true);
    }
  }, [isSearching]);

  const hasThoughts = thinkContent !== undefined && thinkContent.length > 0;
  const hasTools = nodes.filter(n => n.id !== 'thinking-node').length > 0;
  const hasSearch = !!(isSearching || searchQuery || (sources && sources.length > 0));
  
  const headerText = useMemo(() => {
    if (hasThoughts && hasTools && hasSearch) {
      return 'Thoughts, search & system actions';
    } else if (hasThoughts && hasSearch) {
      return 'Thought process & web search';
    } else if (hasThoughts && hasTools) {
      return 'Thought process & system actions';
    } else if (hasSearch && hasTools) {
      return 'Web search & system actions';
    } else if (hasThoughts) {
      return isStreamingThinking ? 'Thinking...' : 'Thought process';
    } else if (hasSearch) {
      return isSearching ? 'Searching the web...' : 'Search completed';
    } else if (hasTools) {
      const toolNodes = nodes.filter(n => n.id !== 'thinking-node');
      return toolNodes.length > 1 ? `System actions (${toolNodes.length})` : 'System action';
    }
    return 'Lumina thoughts';
  }, [hasThoughts, hasTools, hasSearch, nodes, isStreamingThinking, isSearching]);

  const allComplete = nodes.every(n => n.status === 'complete') && !isStreamingThinking && !isSearching;

  const displayNodes = useMemo(() => {
    if (hasThoughts) {
      return nodes.filter(n => n.id !== 'thinking-node');
    }
    return nodes;
  }, [nodes, hasThoughts]);

  return (
    <div className="my-5 w-full pl-2">
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="flex items-center gap-2 text-[14px] font-medium text-zinc-500 hover:text-zinc-800 dark:text-zinc-500 dark:hover:text-zinc-300 transition-all group px-1 rounded-lg cursor-pointer"
      >
        <span>{headerText}</span>
        <motion.div
          animate={{ rotate: isCollapsed ? 0 : 180 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          <ChevronDown size={14} className="text-zinc-500 opacity-60" />
        </motion.div>
      </button>
      <motion.div
        initial={false}
        animate={{ 
          height: isCollapsed ? 0 : 'auto',
          opacity: isCollapsed ? 0 : 1,
          marginTop: isCollapsed ? 0 : 16
        }}
        transition={{ 
          height: { duration: (isStreaming || isStreamingThinking || isSearching) ? 0 : 0.25, ease: "easeInOut" },
          opacity: { duration: 0.2 }
        }}
        className="overflow-hidden"
      >
        <div className="ml-[7px] border-l border-zinc-100 dark:border-white/10 space-y-5 relative py-1">
          {/* Collapsible search step inside timeline */}
          {hasSearch && (
            <div className="relative pl-8">
              <div className="absolute left-0 top-[10px] w-4 h-[1px] bg-zinc-100 dark:bg-white/5" />
              <button
                onClick={() => setIsSearchExpanded(!isSearchExpanded)}
                className="flex items-center gap-2 group/btn cursor-pointer text-left focus:outline-hidden"
              >
                <div className={`transition-colors shrink-0 ${isSearching ? 'text-blue-500' : 'text-zinc-400'}`}>
                  <Globe size={14} className={isSearching ? "animate-spin-slow text-blue-500" : "text-emerald-500"} />
                </div>
                <span className={`text-[13px] font-semibold transition-colors ${
                  isSearching ? 'text-blue-500' : 'text-zinc-650 dark:text-zinc-400'
                }`}>
                  {isSearching ? 'Analyzing and scraping web sources...' : `Searched the web for "${searchQuery || 'information'}"`}
                </span>
                <motion.div
                  animate={{ rotate: isSearchExpanded ? 0 : -90 }}
                  transition={{ duration: 0.15 }}
                  className="text-zinc-400 group-hover/btn:text-zinc-650 dark:group-hover/btn:text-zinc-200"
                >
                  <ChevronDown size={12} />
                </motion.div>
                {isSearching && (
                  <span className="flex gap-0.5 ml-1">
                    <span className="w-1 h-1 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1 h-1 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1 h-1 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </span>
                )}
              </button>

              <AnimatePresence initial={false}>
                {isSearchExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0, marginTop: 0 }}
                    animate={{ height: 'auto', opacity: 1, marginTop: 10 }}
                    exit={{ height: 0, opacity: 0, marginTop: 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="relative border border-zinc-100 dark:border-white/5 bg-zinc-50/40 dark:bg-white/[0.01] rounded-xl p-3.5 space-y-3 shadow-inner max-w-2xl">
                      {/* Sub-header or indicator */}
                      <div className="flex items-center justify-between text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">
                        <span className="uppercase tracking-widest flex items-center gap-1.5 font-bold">
                          {isSearching ? (
                            <>
                              <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                              </span>
                              LUMINA SEARCH AGENT RUNNING
                            </>
                          ) : (
                            <>
                              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500"></span>
                              SEARCH COMPLETED
                            </>
                          )}
                        </span>
                        <span className="tracking-widest font-mono font-bold">
                          {sources.length === 1 ? '1 SOURCE FOUND' : `${sources.length} SOURCES BOUND`}
                        </span>
                      </div>

                      {/* Animated Real-time scraping list */}
                      <div className="space-y-2">
                        {/* Render actual sources retrieved */}
                        {sources.map((source, idx) => {
                          const domain = getDomain(source.url);
                          return (
                            <motion.a 
                              key={source.url + '-' + idx}
                              href={source.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              initial={{ opacity: 0, y: 5 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.2, delay: idx * 0.04 }}
                              className="flex items-start justify-between text-xs p-2.5 rounded-lg border border-zinc-205 dark:border-white/5 bg-white dark:bg-zinc-950/20 font-sans group/src shadow-xs hover:border-zinc-300 dark:hover:bg-white/5 transition-colors cursor-pointer"
                            >
                              <div className="flex items-center gap-2.5 min-w-0 pr-4">
                                <div className="p-1 rounded bg-zinc-50 dark:bg-white/5 border border-zinc-150 dark:border-white/10 shrink-0">
                                  {getFavicon(source.url) ? (
                                    <img src={getFavicon(source.url)!} alt="" className="w-3.5 h-3.5 object-contain" referrerPolicy="no-referrer" />
                                  ) : (
                                    <Globe size={11} className="text-zinc-400" />
                                  )}
                                </div>
                                <div className="flex flex-col min-w-0">
                                  <span className="font-semibold text-zinc-700 dark:text-zinc-350 truncate">
                                    {source.title || domain}
                                  </span>
                                  <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono truncate">
                                    {source.url}
                                  </span>
                                </div>
                              </div>
                              <div className="shrink-0 flex items-center gap-1.5 pt-0.5">
                                {isSearching ? (
                                  <>
                                    <span className="text-[10px] text-blue-500 font-mono animate-pulse font-medium">scraping...</span>
                                    <span className="relative flex h-1.5 w-1.5 font-bold">
                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-500"></span>
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <span className="text-[10px] text-emerald-555 dark:text-emerald-500 font-mono font-medium">100% parsed</span>
                                    <Check size={11} className="text-emerald-500" strokeWidth={3} />
                                  </>
                                )}
                              </div>
                            </motion.a>
                          );
                        })}

                        {/* Scraper loader during search before any sources load */}
                        {isSearching && sources.length === 0 && (
                          <div className="space-y-1.5">
                            {[
                              { label: `Establishing search connection...`, status: 'connecting' },
                              { label: `Querying global content graphs for "${searchQuery || 'query'}"...`, status: 'querying' },
                              { label: `Allocating virtual scrape nodes...`, status: 'running' }
                            ].map((step, sIdx) => (
                              <motion.div
                                key={sIdx}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: [1, 0.5, 1] }}
                                transition={{ repeat: Infinity, duration: 2, delay: sIdx * 0.3 }}
                                className="flex items-center justify-between text-xs p-2 rounded-lg border border-dashed border-zinc-200 dark:border-white/5 bg-white/50 dark:bg-zinc-950/20"
                              >
                                <div className="flex items-center gap-2">
                                  <Loader2 size={12} className="text-blue-500 animate-spin" />
                                  <span className="text-zinc-500 dark:text-zinc-400 font-mono text-[11px]">{step.label}</span>
                                </div>
                                <span className="text-[9px] font-mono font-bold text-blue-500 uppercase tracking-widest animate-pulse">connecting</span>
                              </motion.div>
                            ))}
                          </div>
                        )}
                      </div>


                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Collapsible thoughts step inside timeline */}
          {hasThoughts && (
            <div className="relative pl-8">
              <div className="absolute left-0 top-[10px] w-4 h-[1px] bg-zinc-100 dark:bg-white/5" />
              <button
                onClick={() => setIsThinkingExpanded(!isThinkingExpanded)}
                className="flex items-center gap-2 group/btn cursor-pointer text-left focus:outline-hidden"
              >
                <div className={`transition-colors shrink-0 ${isStreamingThinking ? 'text-blue-500' : 'text-zinc-400 dark:text-zinc-500'}`}>
                  <Brain size={14} className={isStreamingThinking ? "animate-pulse" : ""} />
                </div>
                <span className={`text-[13.5px] font-medium transition-colors ${
                  isStreamingThinking ? 'text-blue-500' : 'text-zinc-600 dark:text-zinc-400'
                }`}>
                  Thought process
                </span>
                <motion.div
                  animate={{ rotate: isThinkingExpanded ? 0 : -90 }}
                  transition={{ duration: 0.15 }}
                  className="text-zinc-400 group-hover/btn:text-zinc-600 dark:group-hover/btn:text-zinc-200"
                >
                  <ChevronDown size={12} />
                </motion.div>
                {isStreamingThinking && (
                  <span className="flex gap-0.5 ml-1">
                    <span className="w-1 h-1 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1 h-1 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1 h-1 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </span>
                )}
              </button>
              <AnimatePresence initial={false}>
                {isThinkingExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0, marginTop: 0 }}
                    animate={{ height: 'auto', opacity: 1, marginTop: 10 }}
                    exit={{ height: 0, opacity: 0, marginTop: 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="p-3.5 rounded-xl border border-blue-500/10 bg-blue-500/5 dark:bg-blue-500/[0.02] text-[12.5px] leading-relaxed text-blue-400/80 dark:text-blue-400/80 font-mono whitespace-pre-wrap max-h-60 overflow-y-auto custom-scrollbar italic shadow-inner">
                      {thinkContent}
                      {isStreamingThinking && (
                        <motion.span
                          animate={{ opacity: [1, 0] }}
                          transition={{ repeat: Infinity, duration: 0.6 }}
                          className="inline-block w-1.5 h-3 bg-blue-400 ml-0.5 rounded-sm align-middle"
                        />
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {displayNodes.map((node, i) => {
            const isEditNode = node.toolName === 'edit_coder_file' || node.toolName === 'create_coder_file';
            const isScriptNode = node.toolName === 'verify_changes' || node.toolName?.includes('script') || node.toolName?.includes('compile') || node.toolName?.includes('terminal') || node.toolName?.includes('shell');
            
            return (
              <motion.div
                key={node.id}
                initial={(isStreaming || isStreamingThinking) ? false : { opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="relative flex flex-col pl-8 py-0.5 items-start"
              >
                <div className="absolute left-0 top-[12px] w-4 h-[1px] bg-zinc-150 dark:bg-white/10" />
                
                {(() => {
                  const isCollapsible = node.toolName === 'web_scrape' || node.toolName?.startsWith('wiki_');
                  const isCollapsedLocally = !!collapsedToolNodes[node.id];
                  
                  const headerContent = (
                    <div className="flex items-center gap-3">
                      <div className="transition-colors shrink-0">
                        {node.status === 'active' ? (
                          isCollapsible ? <LuminaToolCallingAnimation /> : <ToolCallingAnimation />
                        ) : (
                          renderNodeIcon(node.icon)
                        )}
                      </div>
                      
                      <span className={`text-[13px] font-medium transition-colors ${
                        node.status === 'active'
                          ? isCollapsible ? 'text-orange-500 font-semibold' : 'text-emerald-500 font-semibold'
                          : 'text-zinc-750 dark:text-zinc-300'
                      }`}>
                        {humanizeToolName(node.toolName, node.label)}
                      </span>

                      {isCollapsible && (
                        <motion.div
                          animate={{ rotate: isCollapsedLocally ? -90 : 0 }}
                          transition={{ duration: 0.15 }}
                          className="text-zinc-400 group-hover:text-zinc-650 dark:group-hover:text-zinc-200 shrink-0"
                        >
                          <ChevronDown size={12} />
                        </motion.div>
                      )}
                      
                      {node.status === 'active' && (
                        <motion.div
                          animate={{ opacity: [0.4, 1, 0.4] }}
                          transition={{ repeat: Infinity, duration: 1.5 }}
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                            isCollapsible ? 'bg-orange-500' : 'bg-emerald-500'
                          }`}
                        />
                      )}
                    </div>
                  );

                  if (isCollapsible) {
                    return (
                      <button
                        onClick={() => {
                          setCollapsedToolNodes(prev => ({
                            ...prev,
                            [node.id]: !prev[node.id]
                          }));
                        }}
                        className="flex items-center gap-3 group focus:outline-hidden hover:opacity-90 cursor-pointer text-left"
                      >
                        {headerContent}
                      </button>
                    );
                  }

                  return headerContent;
                })()}

                {isEditNode && (
                  <RealtimeEditCounter node={node} />
                )}

                {isScriptNode && (
                  <div className="flex items-center gap-1.5 mt-1 ml-7">
                    <span className="text-[10px] font-bold tracking-widest uppercase px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800/60 text-zinc-500 dark:text-zinc-400 rounded border border-zinc-200/50 dark:border-zinc-700/50 font-mono">
                      Script
                    </span>
                  </div>
                )}

                {node.toolName === 'web_scrape' && (
                  <AnimatePresence initial={false}>
                    {!collapsedToolNodes[node.id] && (
                      <motion.div
                        initial={{ height: 0, opacity: 0, marginTop: 0 }}
                        animate={{ height: 'auto', opacity: 1, marginTop: 10 }}
                        exit={{ height: 0, opacity: 0, marginTop: 0 }}
                        transition={{ duration: 0.25, ease: "easeInOut" }}
                        className="overflow-hidden w-full ml-7"
                      >
                        {node.status === 'complete' ? (
                          (() => {
                            const scrapeResult = scrapingResults.get(node.id);
                            if (!scrapeResult) return <div className="text-xs text-zinc-500 font-mono italic">Retrieving scraped content assets...</div>;
                            return (
                              <div className="max-w-[800px] xl:max-w-[1000px] w-full">
                                <ScrapingResultArtifact 
                                  result={scrapeResult} 
                                  onReScrape={(reScrapeUrl) => {
                                    console.log('Re-scrape request:', reScrapeUrl);
                                  }}
                                />
                              </div>
                            );
                          })()
                        ) : (
                          <ScrapingProgressIndicator 
                            status={node.status} 
                            url={node.label.match(/\(([^)]+)\)/)?.[1] || ''} 
                          />
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                )}

                {node.toolName?.startsWith('wiki_') && (
                  <AnimatePresence initial={false}>
                    {!collapsedToolNodes[node.id] && (
                      <motion.div
                        initial={{ height: 0, opacity: 0, marginTop: 0 }}
                        animate={{ height: 'auto', opacity: 1, marginTop: 10 }}
                        exit={{ height: 0, opacity: 0, marginTop: 0 }}
                        transition={{ duration: 0.25, ease: "easeInOut" }}
                        className="overflow-hidden w-full ml-7"
                      >
                        {node.status === 'complete' ? (
                          (() => {
                            const wikiRes = wikiResults.get(node.id);
                            if (!wikiRes) return <div className="text-xs text-zinc-500 font-mono italic">Retrieving Wikipedia knowledge assets...</div>;
                            return (
                              <div className="max-w-[800px] xl:max-w-[1000px] w-full">
                                <WikiArticleArtifact 
                                  data={wikiRes.data} 
                                  wikiType={wikiRes.wikiType as any}
                                  onFetchPage={(pageId) => {
                                    onSendMessage?.(`Fetch Wikipedia page details for ID: ${pageId}`);
                                  }}
                                  onSearch={(query) => {
                                    onSendMessage?.(`Search Wikipedia for: ${query}`);
                                  }}
                                />
                              </div>
                            );
                          })()
                        ) : (
                          <WikiToolCallIndicator node={node} />
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                )}
              </motion.div>
            );
          })}
          {allComplete && !isStreaming && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: displayNodes.length * 0.05 }}
              className="relative flex items-center gap-3 pl-8 pt-1"
            >
              <div className="absolute left-0 top-[18px] w-4 h-[1px] bg-zinc-150 dark:bg-white/10" />
              <div className="shrink-0 flex items-center justify-center w-4 h-4 rounded-full border border-zinc-400 dark:border-zinc-600 text-emerald-500 dark:text-emerald-400 bg-white dark:bg-zinc-900 z-10 shadow-xs">
                <Check size={10} strokeWidth={3} />
              </div>
              <span className="text-[13.5px] font-bold text-zinc-800 dark:text-zinc-200">Done</span>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
});

const ArtifactCard = React.memo(({ artifact, onOpen }: { artifact: Artifact; onOpen: (a: Artifact) => void }) => {
  const downloadFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    const typeMap = {
      code: 'text/plain',
      markdown: 'text/markdown',
      html: 'text/html',
      poem: 'text/plain',
      report: 'text/markdown'
    };
    const blob = new Blob([artifact.content], { type: typeMap[artifact.type] || 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const ext = artifact.type === 'poem' ? 'txt' : artifact.type === 'report' ? 'md' : artifact.language === 'javascript' ? 'js' : artifact.language === 'typescript' ? 'ts' : artifact.language === 'markdown' ? 'md' : artifact.language;
    a.download = `${artifact.title.toLowerCase().replace(/[^a-z0-9]+/g, '_')}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => onOpen(artifact)}
      className="flex items-center gap-4 p-4 bg-zinc-50 dark:bg-white/5 border border-zinc-100 dark:border-white/10 rounded-2xl cursor-pointer hover:bg-zinc-100 dark:hover:bg-white/10 transition-all group my-4 shadow-sm"
    >
      <div className="w-12 h-12 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-100 dark:border-white/5 flex items-center justify-center text-zinc-400 group-hover:text-blue-500 transition-colors shadow-sm">
        {artifact.type === 'html' ? <Layout size={24} /> : 
         artifact.type === 'markdown' ? <FileText size={24} className="text-zinc-500" /> : 
         artifact.type === 'poem' ? <PenTool size={24} className="text-amber-550 dark:text-amber-400" /> :
         artifact.type === 'report' ? <FileText size={24} className="text-blue-550 dark:text-blue-400 animate-pulse" /> :
         <Terminal size={24} />}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-[14px] font-semibold text-zinc-800 dark:text-zinc-200 truncate">{artifact.title}</h4>
        <p className="text-[11px] text-zinc-400 font-medium uppercase tracking-wider">
          {artifact.language} • {artifact.type}
        </p>
      </div>
      <button
        onClick={downloadFile}
        className="px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-xl text-xs font-bold transition-all hover:scale-105 active:scale-95 shadow-lg"
      >
        Download
      </button>
    </motion.div>
  );
});

const renderLabSuggestions = (content: string) => {
  const text = (content || '').toLowerCase();
  const suggestions = [];

  if (text.includes('physics') || text.includes('velocity') || text.includes('gravity') || text.includes('oscillation') || text.includes('trajectory')) {
    suggestions.push({
      id: 'physics' as const,
      name: 'Physics Lab Grapher',
      icon: <Activity size={12} className="text-blue-500 animate-pulse" />,
      desc: 'Simulate vector forces and graph trajectories'
    });
  }
  if (text.includes('chemical') || text.includes('bonding') || text.includes('reaction') || text.includes('ph level') || text.includes('acid') || text.includes('base') || text.includes('atom') || text.includes('molecule') || text.includes('compound') || text.includes('sodium') || text.includes('beaker')) {
    suggestions.push({
      id: 'chemistry' as const,
      name: 'Chemistry Simulation Lab',
      icon: <Beaker size={12} className="text-emerald-500 animate-pulse" />,
      desc: 'Form complex molecules, heat mixtures, and check pH'
    });
  }
  if (text.includes('sine') || text.includes('polar') || text.includes('cardioid') || text.includes('fourier') || text.includes('spiral') || text.includes('math') || text.includes('equation') || text.includes('graph function') || text.includes('curve') || text.includes('trigonometric')) {
    suggestions.push({
      id: 'math' as const,
      name: 'Math Function Plotter',
      icon: <Compass size={12} className="text-purple-500 animate-pulse" />,
      desc: 'Graph cardioids, spirals, and Fourier approximations'
    });
  }
  if (text.includes('rabbit') || text.includes('wolf') || text.includes('wolves') || text.includes('predator') || text.includes('prey') || text.includes('ecosystem') || text.includes('dna') || text.includes('biology') || text.includes('carrying capacity') || text.includes('gene')) {
    suggestions.push({
      id: 'biology' as const,
      name: 'Biology Ecosystem Simulator',
      icon: <Flower2 size={12} className="text-rose-500 animate-pulse" />,
      desc: 'Run Lotka-Volterra models or decode DNA pairs'
    });
  }

  if (suggestions.length === 0) return null;

  return (
    <div className="mt-4 p-3.5 bg-zinc-500/[0.02] dark:bg-zinc-400/[0.02] border border-zinc-250/20 dark:border-white/5 rounded-2xl flex flex-col gap-3.5 select-none my-3 max-w-2xl text-left">
      <div className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 dark:text-zinc-500 flex items-center gap-1.5 shrink-0 select-none">
        <Sparkles size={11} className="text-blue-500 animate-pulse" />
        Interactive Lab Companions Detected
      </div>
      <div className="flex flex-col gap-2.5">
        {suggestions.map(sug => (
          <div key={sug.id} className="flex items-center justify-between gap-3 p-2.5 bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-white/5 rounded-xl transition-all">
            <div className="flex items-center gap-2 min-w-0">
              <div className="p-1.5 rounded-lg bg-zinc-150/40 dark:bg-zinc-800">
                {sug.icon}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200 leading-normal">{sug.name}</p>
                <p className="text-[10px] text-zinc-400 truncate leading-snug">{sug.desc}</p>
              </div>
            </div>
            <button
              onClick={() => {
                const event = new CustomEvent(`open-${sug.id}-canvas`);
                window.dispatchEvent(event);
              }}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg cursor-pointer transition-colors text-[10px] whitespace-nowrap"
            >
              Launch Lab
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

const MessageItem = React.memo(({ 
  message, 
  markdownComponents, 
  userProfile, 
  persona, 
  isSourcesPanelOpen, 
  setIsSourcesPanelOpen, 
  setSourcesPanelMessageId,
  setActiveArtifact, 
  setIsCanvasOpen, 
  setCanvasView,
  onOpenInEditor,
  showToast,
  onUpdateTodoPlan,
  onStartBuilding,
  scrapingResults = new Map(),
  wikiResults = new Map(),
  onSendMessage
}: { 
  message: Message; 
  markdownComponents: any; 
  userProfile: any; 
  persona: any; 
  isSourcesPanelOpen: boolean; 
  setIsSourcesPanelOpen: (v: boolean) => void;
  setSourcesPanelMessageId: (v: string | null) => void;
  setActiveArtifact: (v: any) => void;
  setIsCanvasOpen: (v: boolean) => void;
  setCanvasView: (v: 'code' | 'preview') => void;
  onOpenInEditor?: (filePath: string) => void;
  showToast?: (v: string) => void;
  onUpdateTodoPlan?: (messageId: string, updatedPlan: any) => void;
  onStartBuilding?: (messageId: string) => void;
  scrapingResults?: Map<string, ScrapeResult>;
  wikiResults?: Map<string, { wikiType: string, data: any }>;
  onSendMessage?: (msg: string) => void;
}) => {
  const [copied, setCopied] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const messageComponents = useMemo(() => {
    return {
      ...markdownComponents,
      a({ href, children, ...props }: any) {
        const isImgUrl = href && /\.(png|jpe?g|gif|webp|svg|bmp)(\?.*)?$/i.test(href);
        if (isImgUrl) {
          return markdownComponents.a({ href, children, ...props });
        }
        
        const childText = String(children || '').trim();
        const hrefMatches = href ? href.match(/\d+/) : null;
        const isHrefCitation = href && /^[#\d\s\[\]\(\)]+$/.test(href) && hrefMatches;
        const isChildCitation = /^\d+$/.test(childText) || /^\[\d+\]$/.test(childText) || /^\(\d+\)$/.test(childText) || childText === '.' || childText === 'source' || childText === '' || childText === '[.]';

        if (isHrefCitation || isChildCitation) {
          let numStr = '';
          if (isHrefCitation && hrefMatches) {
            numStr = hrefMatches[0];
          } else {
            const childMatches = childText.match(/\d+/);
            if (childMatches) {
              numStr = childMatches[0];
            } else if (hrefMatches) {
              numStr = hrefMatches[0];
            }
          }
          
          const num = numStr ? parseInt(numStr, 10) : NaN;
          
          if (!isNaN(num) && num > 0) {
            let resolvedHref = href;
            let siteTitle = '';
            
            if (message.sources && message.sources.length > 0 && num <= message.sources.length) {
              const matchedSource = message.sources[num - 1];
              if (matchedSource && matchedSource.url) {
                resolvedHref = matchedSource.url;
                siteTitle = matchedSource.title || matchedSource.url;
              }
            } else if (href && message.sources && message.sources.length > 0) {
              const foundSource = message.sources.find((s: any) => s.url === href);
              if (foundSource) {
                siteTitle = foundSource.title || foundSource.url;
              }
            }
            
            const isPlaceholderText = isChildCitation;
            const displayChildren = isPlaceholderText ? `[${num}]` : children;

            const isValidWebUrl = resolvedHref && /^https?:\/\//i.test(resolvedHref);
            if (!isValidWebUrl && href && !href.startsWith('http')) {
              resolvedHref = '#';
            }

            return (
              <a
                href={resolvedHref}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 font-bold hover:underline mx-0.5 cursor-pointer inline"
                title={siteTitle || (resolvedHref !== '#' ? resolvedHref : undefined)}
                {...props}
              >
                {displayChildren}
              </a>
            );
          }
        }
        
        return markdownComponents.a({ href, children, ...props });
      },
      code({ className, children, ...props }: any) {
        const match = /language-(\w+)/.exec(className || '');
        const codeStr = String(children).replace(/\n$/, '');
        const isMultiLine = codeStr.includes('\n');
        
        const isTreeStructure = (() => {
          const lines = codeStr.split('\n');
          let branches = 0;
          for (let i = 0; i < Math.min(lines.length, 15); i++) {
            const line = lines[i];
            if (line.includes('├──') || line.includes('└──') || line.includes('│  ') || line.includes('└──') || line.includes('║') || line.includes('╠══') || line.includes('╚══')) {
              branches++;
            }
          }
          return branches >= 1;
        })();

        if (isTreeStructure) {
          return (
            <CustomCodeBlockVisualizer
              language="tree"
              code={codeStr}
              defaultRender={
                <CanvasBlock 
                  language="tree" 
                  code={codeStr} 
                  isStreaming={message.isStreaming} 
                />
              }
            />
          );
        }

        if (match) {
          return (
            <CustomCodeBlockVisualizer
              language={match[1]}
              code={codeStr}
              defaultRender={
                <CanvasBlock 
                  language={match[1]} 
                  code={codeStr} 
                  isStreaming={message.isStreaming} 
                />
              }
            />
          );
        }

        if (isMultiLine) {
          return (
            <CanvasBlock 
              language="text" 
              code={codeStr} 
              isStreaming={message.isStreaming} 
            />
          );
        }

        return (
          <code className="bg-white/10 px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
            {children}
          </code>
        );
      },
      p({ children, ...props }: any) {
        return (
          <p className="leading-relaxed my-2" {...props}>
            {renderTextWithMath(children, message.sources)}
          </p>
        );
      },
      li({ children, ...props }: any) {
        return (
          <li className="leading-relaxed my-1" {...props}>
            {renderTextWithMath(children, message.sources)}
          </li>
        );
      },
      h1({ children, ...props }: any) {
        return <h1 className="text-2xl font-bold my-4" {...props}>{renderTextWithMath(children, message.sources)}</h1>;
      },
      h2({ children, ...props }: any) {
        return <h2 className="text-xl font-bold my-3" {...props}>{renderTextWithMath(children, message.sources)}</h2>;
      },
      h3({ children, ...props }: any) {
        return <h3 className="text-lg font-bold my-2" {...props}>{renderTextWithMath(children, message.sources)}</h3>;
      },
      h4({ children, ...props }: any) {
        return <h4 className="text-base font-bold my-2" {...props}>{renderTextWithMath(children, message.sources)}</h4>;
      },
      blockquote({ children, ...props }: any) {
        return (
          <blockquote className="border-l-4 border-zinc-200 dark:border-white/10 pl-4 my-2 italic text-zinc-650 dark:text-zinc-450" {...props}>
            {renderTextWithMath(children, message.sources)}
          </blockquote>
        );
      }
    };
  }, [markdownComponents, message.sources, message.isStreaming]);

  return (
    <motion.div
      layout
      className={`flex flex-col w-full ${message.role === 'user' ? 'items-end mb-8' : 'items-start mb-12'}`}
    >
      {message.role === 'user' ? (
        <motion.div className="flex flex-col max-w-[85%] items-end">
          <div className="user-message-bubble px-5 py-3 rounded-2xl text-[15px] leading-relaxed shadow-sm bg-zinc-50 dark:bg-[var(--theme-surface-alt)] text-gray-800 dark:text-[var(--theme-primary)] rounded-tr-none border border-zinc-200/50 dark:border-[var(--theme-border)]">
            <div className="markdown-body text-left">
              <Markdown remarkPlugins={[remarkGfm]} components={messageComponents}>{message.content}</Markdown>
            </div>
          </div>

          {(message as any).elementAttachments && (message as any).elementAttachments.length > 0 && (
            <div className="flex flex-col gap-3 w-full mt-3">
              {(message as any).elementAttachments.map((att: any) => (
                <div
                  key={att.id}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onOpenInEditor?.(att.filePath);
                    showToast?.(`Opening ${att.fileName} in code editor...`);
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onOpenInEditor?.(att.filePath);
                    showToast?.(`Opening ${att.fileName} in code editor...`);
                  }}
                  className="group relative bg-[#1E1917] border border-[#2D241E] p-4 rounded-xl shadow-xl hover:border-teal-500/30 hover:shadow-[0_4px_30px_rgba(20,184,166,0.06)] transition-all flex flex-col gap-3.5 select-none w-full text-left"
                  title="Click or right-click to open in Editor"
                >
                  <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.2 bg-zinc-900 border border-teal-500/30 text-teal-400 text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full shadow-sm">
                    <Code size={11} />
                    <span>Click / Right-click to Edit</span>
                  </div>

                  {/* Part 1: File Name */}
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
                      <MousePointerClick size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider leading-none">Source File</div>
                      <div className="text-sm font-semibold text-zinc-150 leading-none mt-1.5 truncate">
                        {att.fileName}
                      </div>
                    </div>
                  </div>

                  {/* Part 4: Element Work */}
                  {att.elementWork && (
                    <div className="bg-[#171412] border border-[#231E1B] rounded-lg px-3 py-2 text-xs text-zinc-400">
                      <span className="font-semibold text-zinc-350 mr-1.5 uppercase text-[9px] tracking-wider text-teal-400 block mb-1">Functional Description</span>
                      {att.elementWork}
                    </div>
                  )}

                  {/* Part 2: Specific Code Section */}
                  {att.specificCode && (
                    <div 
                      onClick={(e) => e.stopPropagation()}
                      className="flex flex-col rounded-lg border border-[#2D241E] bg-[#14110F] overflow-hidden leading-relaxed font-mono"
                    >
                      <div className="bg-[#1C1816] px-3 py-1.5 border-b border-[#2D241E] flex items-center justify-between select-none">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Code Segment</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenInEditor?.(att.filePath);
                          }}
                          className="text-teal-400 hover:text-teal-300 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                        >
                          <Code size={11} />
                          Open Code
                        </button>
                      </div>
                      <pre className="max-h-56 overflow-y-auto p-3 text-xs text-zinc-350 custom-scrollbar whitespace-pre-wrap word-break tab-4 font-mono select-text leading-tight bg-[#0f0d0c]">
                        {att.specificCode}
                      </pre>
                    </div>
                  )}

                  {/* Part 3: Connections */}
                  {att.connections && att.connections.length > 0 && (
                    <div 
                      onClick={(e) => e.stopPropagation()}
                      className="flex flex-col gap-1.5"
                    >
                      <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">File Connections</span>
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {att.connections.map((c: any, index: number) => (
                          <button
                            key={index}
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenInEditor?.(c.filePath || c.name || '');
                            }}
                            className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-900 border border-[#2D241E] hover:border-teal-500/40 text-xs text-zinc-400 hover:text-teal-400 rounded-lg transition-all cursor-pointer"
                            title={`Open ${c.fileName} in editor`}
                          >
                            <FileText size={11} className="text-zinc-650" />
                            <span className="font-semibold">{c.fileName}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="mt-2 text-[10px] text-gray-400 px-1 font-medium uppercase tracking-tight flex items-center gap-2">
            {userProfile.avatar && (
              <img src={userProfile.avatar} alt="" className="w-3 h-3 rounded-full object-cover grayscale opacity-60" referrerPolicy="no-referrer" />
            )}
            {userProfile.name} • {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </motion.div>
      ) : (
        <motion.div layout={message.isStreaming ? "position" : false} className="w-full space-y-4 max-w-4xl xl:max-w-[1100px]">
          {((message.toolCalls && message.toolCalls.length > 0) || (message.thinkContent !== undefined && message.thinkContent.length > 0) || message.searchQuery || message.isSearching) && (
            <NodeGraph 
              nodes={message.toolCalls || []} 
              isStreaming={message.isStreaming} 
              thinkContent={message.thinkContent}
              isStreamingThinking={message.isThinking}
              isSearching={message.isSearching}
              searchQuery={message.searchQuery}
              sources={message.sources || []}
              scrapingResults={scrapingResults}
              wikiResults={wikiResults}
              onSendMessage={onSendMessage}
            />
          )}
          {message.searchQuery && (
            <SearchResultsUI 
              query={message.searchQuery} 
              sources={message.sources || []} 
            />
          )}
          <div className="markdown-body prose-lg max-w-none px-1" style={{ minHeight: message.isStreaming ? '1.5rem' : undefined }}>
            {message.content ? (
              message.isStreaming ? (
                <span className="streaming-content">
                  <Markdown remarkPlugins={[remarkGfm]} components={messageComponents}>{message.content}</Markdown>
                  <motion.span
                    animate={{ opacity: [1, 0] }}
                    transition={{ repeat: Infinity, duration: 0.6 }}
                    className="inline-block w-1.5 h-4 bg-current ml-0.5 rounded-sm align-middle"
                  />
                </span>
              ) : (
                <>
                  <Markdown remarkPlugins={[remarkGfm]} components={messageComponents}>{message.content}</Markdown>
                </>
              )
            ) : message.isStreaming ? (
              <span className="text-zinc-400 animate-pulse">Generating...</span>
            ) : null}
          </div>

          {/* Custom Interactive To-Do Plan Checklist */}
          {message.todoPlan && (
            <div className="w-full bg-[#1b1918] border border-zinc-855 rounded-2xl p-4 shadow-xl flex flex-col gap-3 mt-4 text-left font-sans select-none">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-[14px]">📋</span>
                  <span className="font-semibold text-sm tracking-tight text-white">
                    {message.todoPlan.title}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {!message.todoPlan.isConfirmed && message.todoPlan.countdown !== undefined && message.todoPlan.countdown > 0 && (
                    <span className="text-[10px] bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                      <Loader2 size={10} className="animate-spin text-amber-500 shrink-0" />
                      Auto-starts in {message.todoPlan.countdown}s
                    </span>
                  )}
                  {message.todoPlan.isConfirmed && (
                    <span className="text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 shrink-0">
                      {message.todoPlan.todos.every(t => t.status === 'complete') ? "COMPLETED" : "RUNNING AGENT"}
                    </span>
                  )}
                </div>
              </div>

              {/* Todo Items */}
              <div className="flex flex-col gap-0.5 max-h-[300px] overflow-y-auto pr-1">
                {message.todoPlan.todos.map((todo) => {
                  const isDone = todo.status === 'complete';
                  const isActive = todo.status === 'in_progress';

                  return (
                    <div
                      key={todo.id}
                      className="group/item flex items-center gap-3 px-2 py-1.5 rounded-xl hover:bg-white/2.5 transition-all w-full"
                    >
                      {/* Status Icon */}
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                        isDone
                          ? 'bg-emerald-500/20 border border-emerald-500 text-emerald-400'
                          : isActive
                            ? 'border border-orange-500 bg-orange-500/10'
                            : 'border border-zinc-750 bg-transparent'
                      }`}>
                        {isDone && <Check size={10} strokeWidth={3} className="text-emerald-400" />}
                        {isActive && <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />}
                      </div>

                      {/* Info / Editing Text input */}
                      {!message.todoPlan.isConfirmed ? (
                        <input
                          type="text"
                          value={todo.text}
                          onChange={(e) => {
                            if (!message.todoPlan) return;
                            const updatedTodos = message.todoPlan.todos.map(t => t.id === todo.id ? { ...t, text: e.target.value } : t);
                            onUpdateTodoPlan?.(message.id, {
                              ...message.todoPlan,
                              todos: updatedTodos
                            });
                          }}
                          className="flex-1 text-xs font-semibold text-zinc-200 bg-transparent hover:bg-zinc-850 focus:bg-zinc-850 px-1 py-0.5 rounded-lg border border-transparent focus:border-orange-500/40 outline-none transition-all select-text"
                        />
                      ) : (
                        <span className={`text-xs font-semibold flex-1 ${
                          isDone ? 'line-through text-zinc-550' : isActive ? 'text-white' : 'text-zinc-400'
                        }`}>
                          {todo.text}
                        </span>
                      )}

                      {/* Deletion action for pending/editable items */}
                      {!message.todoPlan.isConfirmed && (
                        <button
                          onClick={() => {
                            if (!message.todoPlan) return;
                            const updatedTodos = message.todoPlan.todos.filter(t => t.id !== todo.id);
                            onUpdateTodoPlan?.(message.id, {
                              ...message.todoPlan,
                              todos: updatedTodos
                            });
                          }}
                          className="opacity-0 group-hover/item:opacity-100 p-1 hover:bg-red-500/10 rounded-lg text-zinc-550 hover:text-red-400 transition-all cursor-pointer flex items-center justify-center"
                          title="Delete plan step"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Add item and confirm buttons */}
              {!message.todoPlan.isConfirmed ? (
                <div className="flex items-center justify-between border-t border-zinc-805 pt-3 mt-1 gap-2">
                  <button
                    onClick={() => {
                      if (!message.todoPlan) return;
                      const newId = (message.todoPlan.todos.length + 1).toString();
                      const updatedTodos = [
                        ...message.todoPlan.todos,
                        { id: newId, text: "New architectural refinement step...", status: 'pending' as const }
                      ];
                      onUpdateTodoPlan?.(message.id, {
                        ...message.todoPlan,
                        todos: updatedTodos
                      });
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-zinc-400 hover:text-white hover:bg-white/5 border border-zinc-850 rounded-xl transition-all cursor-pointer"
                  >
                    <Plus size={11} />
                    <span>Add task step</span>
                  </button>

                  <button
                    onClick={() => onStartBuilding?.(message.id)}
                    className="flex items-center gap-1.5 px-4 py-1.5 text-[11px] font-black tracking-wider uppercase bg-orange-500 hover:bg-orange-600 text-white rounded-xl transition-all shadow-md cursor-pointer"
                  >
                    <span>Start Building</span>
                    <ArrowUp size={11} strokeWidth={3} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1 p-1 bg-zinc-850/40 rounded-xl border border-zinc-800/25 justify-center font-mono text-[10px] text-zinc-500 select-none">
                  <Loader2 size={10} className="animate-spin text-orange-400 shrink-0" />
                  <span>Agent running sequence: step {message.todoPlan.todos.filter(t => t.status === 'complete').length + 1} of {message.todoPlan.todos.length}...</span>
                </div>
              )}
            </div>
          )}

          {/* Automatically detect and render image links from the text content */}
          {(() => {
            if (!message.content) return null;
            const foundImageUrls: string[] = [];
            const matches = (message.content.match(/https?:\/\/[^\s\)]+/gi) || []) as string[];
            matches.forEach(url => {
              const cleanedUrl = url.replace(/[.,;*`"'>\?]+$/, '');
              const isLikelyImage = /\.(png|jpe?g|gif|webp|svg|bmp)/i.test(cleanedUrl) || 
                                    /(\/images?\/|\/img\/|photo|visual|attachment)/i.test(cleanedUrl);
              // Avoid duplicate rendering if already specifically rendered in message.images
              const isAlreadyInImages = message.images && message.images.some(img => img.url === cleanedUrl);
              if (isLikelyImage && !isAlreadyInImages && !foundImageUrls.includes(cleanedUrl)) {
                foundImageUrls.push(cleanedUrl);
              }
            });

            if (foundImageUrls.length === 0) return null;

            return (
              <div className="mt-4 flex flex-col gap-2">
                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider flex items-center gap-1.5 select-none">
                  <ImageIcon size={11} className="text-blue-500" />
                  Visual Attachment
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl">
                  {foundImageUrls.map((url, idx) => (
                    <motion.div 
                      key={idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="relative rounded-2xl overflow-hidden border border-zinc-200/50 dark:border-white/5 bg-zinc-50 dark:bg-zinc-900/20 group hover:shadow-lg transition-all"
                    >
                      <img 
                        src={url} 
                        alt="Attached Visual"
                        className="w-full h-auto object-cover max-h-[250px] transition-transform duration-500 group-hover:scale-105 cursor-zoom-in"
                        referrerPolicy="no-referrer"
                        onClick={() => {
                          if (typeof (window as any).openImageLightbox === 'function') {
                            (window as any).openImageLightbox(url, 'Attached Visual');
                          } else {
                            window.open(url, '_blank');
                          }
                        }}
                      />
                      <div className="bg-zinc-50 dark:bg-zinc-900/80 px-4 py-2 border-t border-zinc-150/40 dark:border-white/5 text-[10px] font-semibold text-zinc-550 dark:text-zinc-400 flex items-center justify-between">
                        <span className="truncate max-w-[70%]">{url}</span>
                        <button 
                          onClick={() => {
                            if (typeof (window as any).openImageLightbox === 'function') {
                              (window as any).openImageLightbox(url, 'Attached Visual');
                            } else {
                              window.open(url, '_blank');
                            }
                          }}
                          className="text-blue-550 dark:text-blue-400 hover:underline uppercase text-[9px] font-bold tracking-wider cursor-pointer"
                        >
                          View Photo
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Automatically detect and render video links from the text content */}
          {(() => {
            if (!message.content) return null;
            const foundVideoLinks: Array<{ url: string; title: string; type: 'youtube' | 'vimeo' | 'direct' | 'other' }> = [];
            const matches = (message.content.match(/https?:\/\/[^\s\)]+/gi) || []) as string[];
            matches.forEach(url => {
              const cleanedUrl = url.replace(/[.,;*`"'>\?]+$/, '');
              
              // Detect types
              let type: 'youtube' | 'vimeo' | 'direct' | 'other' | null = null;
              let title = 'Web Video';
              
              if (/youtube\.com|youtu\.be|youtube-nocookie\.com/i.test(cleanedUrl)) {
                type = 'youtube';
                title = 'YouTube Video';
              } else if (/vimeo\.com/i.test(cleanedUrl)) {
                type = 'vimeo';
                title = 'Vimeo Video';
              } else if (/\.(mp4|webm|ogg)/i.test(cleanedUrl)) {
                type = 'direct';
                title = 'Direct HTML5 Video';
              } else if (cleanedUrl.includes('/embed/')) {
                type = 'other';
                title = 'Embedded Video';
              }
              
              if (type) {
                // Avoid duplicates
                const exists = foundVideoLinks.some(v => v.url === cleanedUrl);
                if (!exists) {
                  foundVideoLinks.push({ url: cleanedUrl, title, type });
                }
              }
            });

            if (foundVideoLinks.length === 0) return null;

            return (
              <div className="mt-4 flex flex-col gap-2 w-full">
                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider flex items-center gap-1.5 select-none md:ml-1">
                  <Play size={11} className="text-orange-500 fill-orange-500" />
                  Playable Video Content
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl w-full">
                  {foundVideoLinks.map((vid, idx) => (
                    <motion.div 
                      key={idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="relative rounded-2xl overflow-hidden border border-zinc-205/60 dark:border-white/5 bg-zinc-50 dark:bg-zinc-900/20 group hover:shadow-lg transition-all"
                    >
                      {/* Video simulated preview block */}
                      <div className="aspect-video bg-neutral-950 flex flex-col items-center justify-center relative overflow-hidden select-none">
                        <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded bg-black/60 font-mono text-[9px] uppercase tracking-wider text-orange-400 font-bold z-20">
                          {vid.type}
                        </div>
                        
                        <button 
                          onClick={() => {
                            if (typeof (window as any).playVideoInLuminaPopup === 'function') {
                              (window as any).playVideoInLuminaPopup(vid.url, vid.title);
                            }
                          }}
                          className="w-10 h-10 rounded-full bg-orange-500 hover:bg-orange-600 text-white flex items-center justify-center shadow-lg transform transition-transform group-hover:scale-110 z-20 cursor-pointer active:scale-95 border-0"
                          title="Play in Lumina Player"
                        >
                          <Play size={16} fill="currentColor" className="ml-0.5" />
                        </button>
                      </div>
                      
                      <div className="bg-zinc-50 dark:bg-zinc-900/85 px-4 py-2.5 border-t border-zinc-150/40 dark:border-white/5 text-[10px] font-semibold text-zinc-550 dark:text-zinc-400 flex items-center justify-between gap-3">
                        <span className="truncate max-w-[60%]" title={vid.title}>{vid.title}</span>
                        <button 
                          onClick={() => {
                            if (typeof (window as any).playVideoInLuminaPopup === 'function') {
                              (window as any).playVideoInLuminaPopup(vid.url, vid.title);
                            }
                          }}
                          className="text-orange-500 hover:text-orange-600 hover:underline uppercase text-[9px] font-bold tracking-wider cursor-pointer border-0 bg-transparent flex items-center gap-1"
                        >
                          <span>Watch Video</span>
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            );
          })()}

          {message.images && message.images.length > 0 && (
            <div className="mt-4 grid grid-cols-2 lg:grid-cols-3 gap-3">
              {message.images.map((img, idx) => (
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="relative aspect-square rounded-2xl overflow-hidden group border border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-zinc-950 shadow-sm transition-all hover:shadow-md cursor-zoom-in"
                  onClick={() => {
                    if (typeof (window as any).openImageLightbox === 'function') {
                      (window as any).openImageLightbox(img.url, img.title);
                    }
                  }}
                >
                  <img 
                    src={img.url} 
                    alt={img.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                    <p className="text-[10px] text-white font-medium truncate mb-1">{img.title}</p>
                    <div className="flex items-center justify-between">
                      <a 
                        href={img.url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-[9px] text-blue-400 hover:underline truncate mr-2"
                      >
                        {img.source || 'Original Source'}
                      </a>
                      <button 
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = img.url;
                          link.download = `image-${idx}`;
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        }}
                        className="p-1.5 bg-white/20 hover:bg-white/40 rounded-xl text-white transition-colors"
                        title="Download Image"
                      >
                        <Download size={12} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
          {message.artifacts && message.artifacts.length > 0 && (
            <div className="w-full space-y-2 mt-4">
              {message.artifacts.map(art => (
                <ArtifactCard 
                  key={art.id} 
                  artifact={art} 
                  onOpen={(a) => {
                    setActiveArtifact(a);
                    setIsCanvasOpen(true);
                    setCanvasView(a.type === 'html' ? 'preview' : 'code');
                  }} 
                />
              ))}
            </div>
          )}
          {!message.thinking && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-6 flex flex-col gap-4 border-t border-zinc-100 dark:border-white/5 pt-4 pl-1"
            >
              <div className="flex items-center gap-4">
                {message.sources && message.sources.length > 0 && (
                  <button 
                    onClick={() => {
                      setSourcesPanelMessageId(message.id);
                      setIsSourcesPanelOpen(true);
                    }}
                    className="flex items-center gap-2 text-[11px] font-bold text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors uppercase tracking-wider"
                  >
                    <Layout size={14} />
                    {message.sources.length} Sources
                  </button>
                )}
                <div className="text-[10px] text-zinc-400 font-medium uppercase tracking-tight flex items-center gap-2">
                  {persona.avatar && (
                    <img src={persona.avatar} alt="" className="w-3.5 h-3.5 rounded-full object-cover grayscale opacity-60" referrerPolicy="no-referrer" />
                  )}
                  {persona.name} • {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleCopy}
                  className={`p-1.5 transition-colors rounded-lg flex items-center gap-1.5 ${
                    copied ? 'text-green-500 bg-green-500/10' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'
                  }`}
                  title={copied ? "Copied!" : "Copy message"}
                >
                  {copied ? <Check size={14} /> : <Copy size={16} />}
                  {copied && <span className="text-[10px] font-bold uppercase tracking-widest">Copied</span>}
                </button>
                <div className="relative">
                  <button 
                    onClick={() => setShowHistory(!showHistory)}
                    className={`p-1.5 transition-colors rounded-lg ${
                      showHistory ? 'text-blue-500 bg-blue-500/10' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'
                    }`}
                    title="Message history"
                  >
                    <History size={16} />
                  </button>
                  <AnimatePresence>
                    {showHistory && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.9 }}
                        className="absolute bottom-full left-0 mb-2 w-48 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-xl shadow-xl z-50 p-3 overflow-hidden"
                      >
                        <div className="space-y-2">
                          <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest border-b border-zinc-100 dark:border-white/5 pb-1 mb-2">Metadata</h4>
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] text-zinc-500 font-medium italic">ID</span>
                            <span className="text-[10px] text-zinc-400 font-mono truncate max-w-[80px]">{message.id}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] text-zinc-500 font-medium italic">Sent</span>
                            <span className="text-[10px] text-zinc-400 font-mono italic">{message.timestamp.toLocaleTimeString()}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] text-zinc-500 font-medium italic">Chars</span>
                            <span className="text-[10px] text-zinc-400 font-bold">{message.content.length}</span>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
});

function getArtifactFilename(art: Artifact): string {
  if (art.title && /[\w\.-]+\.\w+/.test(art.title)) {
    return art.title.trim();
  }
  
  const firstLine = art.content.split('\n')[0] || '';
  const commentMatch = firstLine.match(/^(?:\/\*|<!--|\/\/)\s*(?:File:\s*)?([\w\.-]+\.\w+)\s*(?:\*\/|-->)?/i);
  if (commentMatch && commentMatch[1]) {
    return commentMatch[1].trim();
  }
  
  if (art.language === 'css') return 'style.css';
  if (['javascript', 'typescript', 'js', 'ts', 'jsx', 'tsx'].includes(art.language)) return 'script.js';
  if (art.language === 'html' || art.type === 'html') return 'index.html';
  
  return '';
}

function getCombinedSrcDoc(htmlContent: string, allArtifacts: Artifact[]): string {
  let doc = htmlContent;
  
  const artifactMap = new Map<string, Artifact>();
  allArtifacts.forEach(art => {
    const filename = getArtifactFilename(art);
    if (filename) {
      artifactMap.set(filename.toLowerCase(), art);
    }
  });

  const inlinedIds = new Set<string>();

  const linkRegex = /<link\s+[^>]*href=["']([^"']+)["'][^>]*>/gi;
  doc = doc.replace(linkRegex, (match, href) => {
    const filename = href.split('/').pop()?.toLowerCase();
    if (filename && artifactMap.has(filename)) {
      const cssArt = artifactMap.get(filename)!;
      inlinedIds.add(cssArt.id);
      return `<style data-filename="${filename}">\n/* Inlined from ${filename} */\n${cssArt.content}\n</style>`;
    }
    return match;
  });

  const scriptRegex = /<script\s+[^>]*src=["']([^"']+)["'][^>]*>\s*<\/script>/gi;
  doc = doc.replace(scriptRegex, (match, src) => {
    const filename = src.split('/').pop()?.toLowerCase();
    if (filename && artifactMap.has(filename)) {
      const jsArt = artifactMap.get(filename)!;
      inlinedIds.add(jsArt.id);
      return `<script data-filename="${filename}">\n// Inlined from ${filename}\n${jsArt.content}\n</script>`;
    }
    return match;
  });

  const leftoverCss: string[] = [];
  const leftoverJs: string[] = [];

  allArtifacts.forEach(art => {
    if (inlinedIds.has(art.id)) return;
    
    if (art.language === 'css') {
      leftoverCss.push(art.content);
      inlinedIds.add(art.id);
    } else if (['javascript', 'typescript', 'js', 'ts', 'jsx', 'tsx'].includes(art.language)) {
      leftoverJs.push(art.content);
      inlinedIds.add(art.id);
    }
  });

  if (leftoverCss.length > 0) {
    const stylesBlock = leftoverCss.map(content => `<style>\n${content}\n</style>`).join('\n');
    if (doc.includes('</head>')) {
      doc = doc.replace('</head>', `${stylesBlock}\n</head>`);
    } else {
      doc = stylesBlock + '\n' + doc;
    }
  }

  if (leftoverJs.length > 0) {
    const scriptsBlock = leftoverJs.map(content => `<script>\n${content}\n</script>`).join('\n');
    if (doc.includes('</body>')) {
      doc = doc.replace('</body>', `${scriptsBlock}\n</body>`);
    } else {
      doc = doc + '\n' + scriptsBlock;
    }
  }

  return doc;
}

const Canvas = ({ 
  artifact, 
  isOpen, 
  onClose, 
  view, 
  onSetView,
  allArtifacts = []
}: { 
  artifact: Artifact | null; 
  isOpen: boolean; 
  onClose: () => void;
  view: 'code' | 'preview';
  onSetView: (v: 'code' | 'preview') => void;
  allArtifacts?: Artifact[];
}) => {
  const [isDownloadDropdownOpen, setIsDownloadDropdownOpen] = useState(false);

  if (!artifact) return null;

  const handleDownload = (format: 'txt' | 'md' | 'html' | 'print') => {
    setIsDownloadDropdownOpen(false);

    if (format === 'print') {
      const printWindow = window.open('', '_blank');
      if (!printWindow) return;
      
      const isPoem = artifact.type === 'poem';
      const cleanTitle = artifact.title.replace(/"/g, '&quot;');
      const htmlContent = isPoem ? `
        <div style="text-align: center; max-width: 600px; margin: 40px auto; padding: 20px; font-family: Georgia, serif;">
          <div style="color: #f59e0b; font-size: 1.5rem; margin-bottom: 20px;">✦ ❁ ✦</div>
          <h1 style="font-size: 2.2rem; margin-bottom: 8px; color: #111827;">${cleanTitle}</h1>
          <div style="font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.15em; color: #9ca3af; margin-bottom: 40px; font-family: sans-serif; font-weight: 600;">By Lumina AI • Verse</div>
          <div style="font-size: 1.25rem; line-height: 2; color: #374151; white-space: pre-wrap; font-style: italic;">${artifact.content}</div>
          <div style="color: #f59e0b; font-size: 1.5rem; margin-top: 40px;">❦</div>
        </div>
      ` : `
        <div style="max-width: 800px; margin: 40px auto; padding: 40px; font-family: -apple-system, system-ui, sans-serif; line-height: 1.6; color: #1f2937;">
          <div style="font-size: 0.65rem; font-weight: 800; color: #2563eb; text-transform: uppercase; letter-spacing: 0.2em; margin-bottom: 4px;">Lumina Intel Report</div>
          <h1 style="font-size: 2.5rem; font-weight: 800; color: #111827; margin-top: 0; margin-bottom: 20px; line-height: 1.15;">${cleanTitle}</h1>
          <div style="display: flex; justify-content: space-between; border-bottom: 2px solid #e5e7eb; padding-bottom: 24px; margin-bottom: 40px; font-size: 0.8rem; color: #6b7280;">
            <div><strong>Date:</strong> ${new Date().toLocaleDateString()}</div>
            <div><strong>Author:</strong> Lumina Professional Engine</div>
            <div><strong>Doc ID:</strong> LUM-${(Math.random() * 100000).toFixed(0)}</div>
          </div>
          <div style="font-size: 1rem; color: #1f2937;">
            ${artifact.content
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/^#{3}\s+(.+)$/gm, '<h3>$1</h3>')
              .replace(/^#{2}\s+(.+)$/gm, '<h2>$1</h2>')
              .replace(/^#{1}\s+(.+)$/gm, '<h1>$1</h1>')
              .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
              .replace(/^\>\s+(.+)$/gm, '<blockquote style="border-left: 4px solid #3b82f6; background-color: #eff6ff; padding: 12px 20px; margin: 1.5rem 0; border-radius: 0 8px 8px 0;">$1</blockquote>')
              .replace(/^\-\s+(.+)$/gm, '<li>$1</li>')
              .replace(/^\*\s+(.+)$/gm, '<li>$1</li>')
              .replace(/\`(.+?)\`/g, '<code style="font-family: monospace; background-color: #f3f4f6; padding: 2px 6px; border-radius: 4px;">$1</code>')
              .split('\n\n')
              .map(p => {
                const trimmed = p.trim();
                if (!trimmed) return '';
                if (trimmed.startsWith('<h') || trimmed.startsWith('<blockquote') || trimmed.startsWith('<li')) {
                  return trimmed;
                }
                if (trimmed.includes('<li>')) {
                  return '<ul>' + trimmed + '</ul>';
                }
                return '<p>' + trimmed.replace(/\n/g, '<br>') + '</p>';
              })
              .join('\n')
            }
          </div>
          <div style="margin-top: 60px; border-top: 1px solid #e5e7eb; padding-top: 24px; display: flex; justify-content: space-between; align-items: center; font-size: 0.75rem; color: #9ca3af;">
            <div>Lumina Professional Publication. All rights reserved.</div>
            <div style="text-align: center;">
              <div style="width: 160px; border-bottom: 1px solid #d1d5db; margin-bottom: 6px; height: 30px;"></div>
              <div>Authorized Representative</div>
            </div>
          </div>
        </div>
      `;

      printWindow.document.write(`
        <html>
          <head>
            <title>${cleanTitle}</title>
            <style>
              @media print {
                .no-print { display: none !important; }
              }
            </style>
          </head>
          <body style="margin: 0; padding: 0; background: white;">
            ${htmlContent}
            <script>
              setTimeout(() => {
                window.print();
                window.close();
              }, 500);
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
      return;
    }

    let fileContent = '';
    let fileExtension = '';
    let mimeType = '';

    if (format === 'txt') {
      fileExtension = 'txt';
      mimeType = 'text/plain;charset=utf-8';
      if (artifact.type === 'poem') {
        fileContent = `${artifact.title}\nBy Lumina AI\n\n${artifact.content}`;
      } else if (artifact.type === 'report') {
        fileContent = `${artifact.title}\nDate: ${new Date().toLocaleDateString()}\nAuthor: Lumina Professional Engine\n\n${artifact.content}`;
      } else {
        fileContent = artifact.content;
      }
    } else if (format === 'md') {
      fileExtension = 'md';
      mimeType = 'text/markdown;charset=utf-8';
      if (artifact.type === 'poem') {
        fileContent = `# ${artifact.title}\n*By Lumina AI*\n\n---\n\n${artifact.content}\n\n---\n*Generated using Lumina AI Canvas*`;
      } else {
        fileContent = `# ${artifact.title}\n\n**Date:** ${new Date().toLocaleDateString()}\n**Author:** Lumina Professional Engine\n\n---\n\n${artifact.content}`;
      }
    } else if (format === 'html') {
      fileExtension = 'html';
      mimeType = 'text/html;charset=utf-8';
      const isPoem = artifact.type === 'poem';
      const cleanTitle = artifact.title.replace(/"/g, '&quot;');
      fileContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${cleanTitle}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Playfair+Display:ital,wght@0,600;0,700;1,400&family=JetBrains+Mono&display=swap" rel="stylesheet">
  <style>
    body {
      background-color: ${isPoem ? '#f6f5f0' : '#fcfcfc'};
      color: #1f2937;
      font-family: 'Inter', -apple-system, sans-serif;
      margin: 0;
      padding: 40px 20px;
      display: flex;
      justify-content: center;
      min-height: 100vh;
      box-sizing: border-box;
    }
    .paper {
      background-color: #ffffff;
      border: 1px solid #e5e7eb;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05);
      width: 100%;
      max-width: 800px;
      padding: ${isPoem ? '60px 40px' : '80px 60px'};
      box-sizing: border-box;
      border-radius: ${isPoem ? '24px' : '12px'};
      position: relative;
    }
    ${isPoem ? `
    .paper {
      background-color: #fafcf9;
      border-color: #e2e8df;
      max-width: 600px;
      font-family: 'Playfair Display', Georgia, serif;
      text-align: center;
    }
    .paper::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 6px;
      background: linear-gradient(to right, #fbbf24, #f472b6, #f43f5e);
      border-radius: 24px 24px 0 0;
    }
    .poem-title {
      font-size: 2.2rem;
      font-weight: 700;
      color: #111827;
      margin-bottom: 8px;
    }
    .poem-meta {
      font-family: 'Inter', sans-serif;
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.15em;
      color: #9ca3af;
      margin-bottom: 40px;
      font-weight: 600;
    }
    .poem-divider {
      color: #f59e0b;
      font-size: 1.5rem;
      margin: 30px 0;
    }
    .content {
      font-size: 1.25rem;
      line-height: 2;
      color: #374151;
      white-space: pre-wrap;
      font-style: italic;
    }
    ` : `
    .report-logo {
      font-size: 0.65rem;
      font-weight: 800;
      color: #2563eb;
      text-transform: uppercase;
      letter-spacing: 0.2em;
      margin-bottom: 4px;
    }
    .report-title {
      font-size: 2.5rem;
      font-weight: 800;
      color: #111827;
      line-height: 1.15;
      margin-top: 0;
      margin-bottom: 20px;
    }
    .report-meta {
      display: flex;
      justify-content: space-between;
      border-bottom: 2px solid #e5e7eb;
      padding-bottom: 24px;
      margin-bottom: 40px;
      font-size: 0.8rem;
      color: #6b7280;
    }
    .report-meta-item strong {
      color: #374151;
    }
    .content {
      font-size: 1rem;
      line-height: 1.7;
      color: #1f2937;
    }
    .content p {
      margin-top: 0;
      margin-bottom: 1.5rem;
    }
    .content h2 {
      font-size: 1.4rem;
      font-weight: 700;
      color: #111827;
      margin-top: 2rem;
      margin-bottom: 1rem;
      border-bottom: 1px solid #f3f4f6;
      padding-bottom: 6px;
    }
    .content h3 {
      font-size: 1.15rem;
      font-weight: 600;
      color: #1f2937;
      margin-top: 1.5rem;
      margin-bottom: 0.75rem;
    }
    .content ul, .content ol {
      margin-top: 0;
      margin-bottom: 1.5rem;
      padding-left: 1.5rem;
    }
    .content li {
      margin-bottom: 0.5rem;
    }
    .content blockquote {
      border-left: 4px solid #3b82f6;
      background-color: #eff6ff;
      padding: 12px 20px;
      margin: 1.5rem 0;
      border-radius: 0 8px 8px 0;
    }
    .content strong {
      color: #111827;
    }
    .content code {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.85em;
      background-color: #f3f4f6;
      padding: 2px 6px;
      border-radius: 4px;
    }
    .report-footer {
      margin-top: 60px;
      border-top: 1px solid #e5e7eb;
      padding-top: 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.75rem;
      color: #9ca3af;
    }
    .signature-block {
      text-align: center;
    }
    .signature-line {
      width: 160px;
      border-bottom: 1px solid #d1d5db;
      margin-bottom: 6px;
      height: 30px;
    }
    `}
    
    @media print {
      body {
        background-color: #ffffff;
        padding: 0;
      }
      .paper {
        border: none;
        box-shadow: none;
        padding: 40px;
      }
      .no-print {
        display: none !important;
      }
    }
    
    .print-btn {
      position: fixed;
      bottom: 24px;
      right: 24px;
      background-color: #1f2937;
      color: #ffffff;
      border: none;
      border-radius: 50px;
      padding: 12px 24px;
      font-family: 'Inter', sans-serif;
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s;
    }
    .print-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      background-color: #111827;
    }
  </style>
</head>
<body>
  <div class="paper">
    ${isPoem ? `
      <div class="poem-divider">✦ ❁ ✦</div>
      <div class="poem-title">${cleanTitle}</div>
      <div class="poem-meta">By Lumina AI • Verse</div>
      <div class="content">${artifact.content}</div>
      <div class="poem-divider" style="margin-top: 40px;">❦</div>
    ` : `
      <div class="report-logo">Lumina Intel Report</div>
      <h1 class="report-title">${cleanTitle}</h1>
      <div class="report-meta">
        <div class="report-meta-item"><strong>Date:</strong> ${new Date().toLocaleDateString()}</div>
        <div class="report-meta-item"><strong>Author:</strong> Lumina Engine</div>
        <div class="report-meta-item"><strong>Doc ID:</strong> LUM-${(Math.random() * 100000).toFixed(0)}</div>
      </div>
      <div class="content">
        ${
          artifact.content
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/^#{3}\s+(.+)$/gm, '<h3>$1</h3>')
            .replace(/^#{2}\s+(.+)$/gm, '<h2>$1</h2>')
            .replace(/^#{1}\s+(.+)$/gm, '<h1 class="report-title" style="font-size: 2rem;">$1</h1>')
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/^\>\s+(.+)$/gm, '<blockquote>$1</blockquote>')
            .replace(/^\-\s+(.+)$/gm, '<li>$1</li>')
            .replace(/^\*\s+(.+)$/gm, '<li>$1</li>')
            .replace(/\`(.+?)\`/g, '<code>$1</code>')
            .split('\n\n')
            .map(p => {
              const trimmed = p.trim();
              if (!trimmed) return '';
              if (trimmed.startsWith('<h') || trimmed.startsWith('<blockquote') || trimmed.startsWith('<li')) {
                return trimmed;
              }
              if (trimmed.includes('<li>')) {
                return '<ul>' + trimmed + '</ul>';
              }
              return '<p>' + trimmed.replace(/\n/g, '<br>') + '</p>';
            })
            .join('\n')
        }
      </div>
      <div class="report-footer">
        <div>Lumina Professional Publication. All rights reserved.</div>
        <div class="signature-block">
          <div class="signature-line"></div>
          <div>Authorized Representative</div>
        </div>
      </div>
    `}
  </div>
  
  <button class="print-btn no-print" onclick="window.print()">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
    <span>Print Document</span>
  </button>
</body>
</html>`;
    }

    const blob = new Blob([fileContent], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${artifact.title.toLowerCase().replace(/[^a-z0-9]+/g, '_')}.${fileExtension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className="fixed inset-y-0 right-0 w-full lg:w-[45vw] bg-white dark:bg-[#0a0a0a] border-l border-zinc-100 dark:border-white/5 z-[200] flex flex-col shadow-2xl"
        >
          <div className="h-16 border-b border-zinc-100 dark:border-white/5 flex items-center justify-between px-6 shrink-0 bg-white/80 dark:bg-black/80 backdrop-blur-xl sticky top-0 z-10">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-zinc-100 dark:bg-white/5 rounded-lg text-zinc-500">
                  {artifact.type === 'html' ? <Layout size={18} /> : 
                   artifact.type === 'markdown' ? <FileText size={18} /> : 
                   artifact.type === 'poem' ? <PenTool size={18} className="text-amber-500" /> : 
                   artifact.type === 'report' ? <FileText size={18} className="text-blue-500" /> : 
                   <Terminal size={18} />}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-100 uppercase tracking-tighter">
                    {artifact.title}
                  </h3>
                  <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-widest">{artifact.language}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {(artifact.type === 'html' || artifact.type === 'markdown' || artifact.type === 'poem' || artifact.type === 'report') && (
                <div className="flex items-center p-1 bg-zinc-100 dark:bg-white/5 rounded-xl border border-zinc-200/50 dark:border-white/5">
                  <button
                    onClick={() => onSetView('code')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      view === 'code' ? 'bg-white dark:bg-zinc-800 text-black dark:text-white shadow-sm font-semibold' : 'text-zinc-500 font-normal'
                    }`}
                  >
                    Code
                  </button>
                  <button
                    onClick={() => onSetView('preview')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      view === 'preview' ? 'bg-white dark:bg-zinc-800 text-black dark:text-white shadow-sm font-semibold' : 'text-zinc-500 font-normal'
                    }`}
                  >
                    Preview
                  </button>
                </div>
              )}
              <div className="relative">
                <button
                  onClick={() => setIsDownloadDropdownOpen(!isDownloadDropdownOpen)}
                  className="px-2.5 py-1.5 bg-zinc-150 dark:bg-white/5 hover:bg-zinc-200 dark:hover:bg-white/10 rounded-xl text-zinc-700 dark:text-zinc-300 transition-all flex items-center gap-1 text-xs font-bold shadow-xs cursor-pointer"
                  title="Download / Export Options"
                >
                  <Download size={14} strokeWidth={2.5} />
                  <ChevronDown size={11} className={`transition-transform duration-200 ${isDownloadDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {isDownloadDropdownOpen && (
                    <>
                      <div 
                        className="fixed inset-0 z-40 bg-transparent" 
                        onClick={() => setIsDownloadDropdownOpen(false)} 
                      />
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        className="absolute right-0 mt-2 w-52 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-white/10 shadow-2xl py-2 z-50 flex flex-col"
                      >
                        <div className="px-3.5 py-1 text-[9px] font-extrabold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 select-none">
                          File Format Options
                        </div>
                        <button
                          onClick={() => handleDownload('txt')}
                          className="px-4 py-2 hover:bg-zinc-50 dark:hover:bg-white/5 text-left text-xs font-semibold text-zinc-700 dark:text-zinc-200 flex items-center gap-2 cursor-pointer"
                        >
                          <span className="w-5 h-5 bg-zinc-100 dark:bg-white/10 rounded-md flex items-center justify-center text-[9px] font-bold text-zinc-500 shrink-0">TXT</span>
                          <span className="truncate">Plain Text (.txt)</span>
                        </button>
                        <button
                          onClick={() => handleDownload('md')}
                          className="px-4 py-2 hover:bg-zinc-50 dark:hover:bg-white/5 text-left text-xs font-semibold text-zinc-700 dark:text-zinc-200 flex items-center gap-2 cursor-pointer"
                        >
                          <span className="w-5 h-5 bg-blue-50 dark:bg-blue-950/40 rounded-md flex items-center justify-center text-[9px] font-bold text-blue-500 shrink-0">MD</span>
                          <span className="truncate">Markdown (.md)</span>
                        </button>
                        <button
                          onClick={() => handleDownload('html')}
                          className="px-4 py-2 hover:bg-zinc-50 dark:hover:bg-white/5 text-left text-xs font-semibold text-zinc-700 dark:text-zinc-200 flex items-center gap-2 cursor-pointer"
                        >
                          <span className="w-5 h-5 bg-emerald-50 dark:bg-emerald-950/40 rounded-md flex items-center justify-center text-[9px] font-bold text-emerald-500 shrink-0">HTML</span>
                          <span className="truncate">Offline Page (.html)</span>
                        </button>
                        <div className="w-full h-px bg-zinc-100 dark:bg-white/5 my-1" />
                        <button
                          onClick={() => handleDownload('print')}
                          className="px-4 py-2 hover:bg-zinc-50 dark:hover:bg-white/5 text-left text-xs font-semibold text-zinc-700 dark:text-zinc-200 flex items-center gap-2 cursor-pointer"
                        >
                          <div className="w-5 h-5 bg-amber-50 dark:bg-amber-950/40 rounded-md flex items-center justify-center text-amber-500 shrink-0">
                            <FileText size={10} />
                          </div>
                          <span className="font-bold text-amber-600 dark:text-amber-400 truncate">Save PDF / Print</span>
                        </button>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
              <div className="w-px h-4 bg-zinc-200 dark:bg-white/10 mx-1" />
              <button
                onClick={onClose}
                className="p-2 hover:bg-zinc-100 dark:hover:bg-white/5 rounded-xl text-zinc-500 transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-hidden relative">
            <AnimatePresence mode="wait">
              {view === 'code' ? (
                <motion.div
                  key="code"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full overflow-y-auto custom-scrollbar bg-transparent"
                >
                  <SyntaxHighlighter
                    language={artifact.language}
                    style={oneDark}
                    customStyle={{ 
                      background: 'transparent', 
                      backgroundColor: 'transparent',
                      fontSize: '14px', 
                      lineHeight: '1.7', 
                      margin: 0,
                      padding: '24px',
                      border: 'none',
                      boxShadow: 'none',
                      textDecoration: 'none'
                    }}
                    codeTagProps={{
                      style: {
                        background: 'transparent',
                        backgroundColor: 'transparent',
                        border: 'none',
                        textDecoration: 'none',
                        boxShadow: 'none'
                      }
                    }}
                    showLineNumbers
                    lineNumberStyle={{ 
                      color: '#3f3f46', 
                      minWidth: '3.5em',
                      background: 'transparent',
                      backgroundColor: 'transparent',
                      paddingRight: '1em',
                      textAlign: 'right',
                      userSelect: 'none',
                      borderRight: 'none',
                      textDecoration: 'none'
                    }}
                  >
                    {artifact.content}
                  </SyntaxHighlighter>
                </motion.div>
              ) : (
                <motion.div
                  key="preview"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full overflow-y-auto bg-[var(--theme-bg)] custom-scrollbar"
                >
                  {artifact.type === 'poem' ? (
                    <div className="flex flex-col min-h-full bg-[#030303] text-zinc-300 font-mono select-none">
                      {/* IDE Title and Tabs */}
                      <div className="flex items-center justify-between px-5 py-2.5 bg-[#0a0a0c] border-b border-zinc-900 text-xs text-zinc-400 shrink-0 select-none">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            <span className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
                            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
                            <span className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
                          </div>
                          <div className="w-px h-3.5 bg-zinc-800 mx-2" />
                          <div className="flex items-center gap-1.5 bg-[#121215] text-zinc-100 px-3 py-1.5 rounded-t-lg border-t border-x border-zinc-900 text-[10px] font-bold">
                            <PenTool size={12} className="text-amber-500 animate-pulse" />
                            <span>{artifact.title.toLowerCase().replace(/[^a-z0-9]+/g, '_') || 'verse'}.poetry</span>
                          </div>
                        </div>
                        <div className="text-[9px] uppercase tracking-widest text-zinc-500 font-extrabold flex items-center gap-2">
                          <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-ping" />
                          LUMINA VERSE ENGINE
                        </div>
                      </div>

                      {/* Code Canvas Container */}
                      <div className="flex-1 flex overflow-y-auto bg-[#030303] custom-scrollbar">
                        {/* Gutter */}
                        <div className="py-6 border-r border-zinc-900/60 flex flex-col items-end pr-4 text-[11px] text-zinc-700 font-mono select-none bg-[#030205] w-14 shrink-0">
                          {artifact.content.split('\n').map((_, idx) => (
                            <div key={idx} className="h-7 flex items-center justify-end font-medium">
                              {idx + 1}
                            </div>
                          ))}
                        </div>

                        {/* Poem Body */}
                        <div className="flex-1 py-6 px-8 font-mono text-[13px] md:text-[14px] leading-relaxed text-zinc-100 select-text overflow-x-auto">
                          {/* File Docstring Comment Block */}
                          <div className="text-zinc-600 select-none mb-6 font-mono italic">
                            <div>/**</div>
                            <div>&nbsp;* @file {artifact.title.toLowerCase().replace(/[^a-z0-9]+/g, '_') || 'verse'}.poetry</div>
                            <div>&nbsp;* @title {artifact.title}</div>
                            <div>&nbsp;* @author Lumina Core Synthesizer</div>
                            <div>&nbsp;* @synthesized {new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                            <div>&nbsp;*/</div>
                          </div>

                          {/* Verses with hover-focused lines */}
                          <div className="space-y-0.5">
                            {artifact.content.split('\n').map((line, idx) => {
                              const isComment = line.trim().startsWith('//') || line.trim().startsWith('/*') || line.trim().startsWith('*');
                              const isEmpty = line.trim().length === 0;
                              return (
                                <div 
                                  key={idx} 
                                  className={`h-7 flex items-center px-2 -mx-2 hover:bg-zinc-900/40 rounded transition-colors group cursor-text ${
                                    isEmpty ? 'h-4' : ''
                                  }`}
                                >
                                  <span className={
                                    isComment ? 'text-zinc-500 italic' :
                                    isEmpty ? 'text-zinc-700' :
                                    'text-amber-100/90 dark:text-amber-50 font-medium'
                                  }>
                                    {line || '\u00A0'}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Workspace Status Bar */}
                      <div className="px-4 py-1.5 bg-[#0a0a0c] border-t border-zinc-900 text-[10px] text-zinc-500 font-mono flex justify-between select-none shrink-0">
                        <div className="flex items-center gap-4">
                          <span>UTF-8</span>
                          <span>LF</span>
                          <span className="text-amber-500 font-semibold">Poetry Visualizer</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span>Lines: {artifact.content.split('\n').length}</span>
                          <span>Words: {artifact.content.trim().split(/\s+/).filter(Boolean).length}</span>
                        </div>
                      </div>
                    </div>
                  ) : artifact.type === 'report' || artifact.type === 'markdown' ? (
                    <div className="flex flex-col min-h-full bg-[#030303] text-zinc-300 font-mono select-none">
                      {/* IDE Title and Tabs */}
                      <div className="flex items-center justify-between px-5 py-2.5 bg-[#0a0a0c] border-b border-zinc-900 text-xs text-zinc-400 shrink-0 select-none">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            <span className="w-2.5 h-2.5 rounded-full bg-red-400/70" />
                            <span className="w-2.5 h-2.5 rounded-full bg-yellow-400/70" />
                            <span className="w-2.5 h-2.5 rounded-full bg-green-400/70" />
                          </div>
                          <div className="w-px h-3.5 bg-zinc-800 mx-2" />
                          <div className="flex items-center gap-1.5 bg-[#121215] text-zinc-100 px-3 py-1.5 rounded-t-lg border-t border-x border-zinc-900 text-[10px] font-bold">
                            <FileText size={12} className="text-blue-500 animate-pulse" />
                            <span>{artifact.title.toLowerCase().replace(/[^a-z0-9]+/g, '_') || 'document'}.md</span>
                          </div>
                        </div>
                        <div className="text-[9px] uppercase tracking-widest text-zinc-500 font-extrabold flex items-center gap-2">
                          <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping" />
                          LUMINA DOCS ENGINE
                        </div>
                      </div>

                      {/* Code Canvas Container */}
                      <div className="flex-1 flex overflow-y-auto bg-[#030303] custom-scrollbar">
                        {/* Gutter */}
                        <div className="py-8 border-r border-zinc-900/65 flex flex-col items-end pr-4 text-[11px] text-zinc-700 font-mono select-none bg-[#030205] w-14 shrink-0">
                          {Array.from({ length: Math.max(12, Math.ceil(artifact.content.split('\n').length * 1.05)) }).map((_, idx) => (
                            <div key={idx} className="h-6 flex items-center justify-end font-medium">
                              {idx + 1}
                            </div>
                          ))}
                        </div>

                        {/* Rich Document with Code Vibe */}
                        <div className="flex-1 py-8 px-8 select-text overflow-x-hidden">
                          {/* Markdown Meta Comment Block / Frontmatter */}
                          <div className="text-zinc-600 select-none mb-6 font-mono text-[13px] md:text-[14px] italic border-b border-zinc-900 pb-4">
                            <div>---</div>
                            <div>document: {artifact.title}</div>
                            <div>author: Lumina Core</div>
                            <div>synthesized: {new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                            <div>document_id: LUM-{(Math.random() * 100000).toFixed(0)}</div>
                            <div>type: {artifact.type}</div>
                            <div>---</div>
                          </div>

                          {/* Markdown rendering nested beautifully inside the IDE shell */}
                          <div className="markdown-body prose dark:prose-invert max-w-none prose-zinc dark:prose-zinc text-zinc-200 leading-relaxed text-sm md:text-base font-sans pb-12">
                            <Markdown remarkPlugins={[remarkGfm]}>{artifact.content}</Markdown>
                          </div>
                        </div>
                      </div>

                      {/* Workspace Status Bar */}
                      <div className="px-4 py-1.5 bg-[#0a0a0c] border-t border-zinc-900 text-[10px] text-zinc-500 font-mono flex justify-between select-none shrink-0">
                        <div className="flex items-center gap-4">
                          <span>UTF-8</span>
                          <span>LF</span>
                          <span className="text-blue-400 font-semibold">Markdown Live Preview</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span>Lines: {artifact.content.split('\n').length}</span>
                          <span>Words: {artifact.content.trim().split(/\s+/).filter(Boolean).length}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="h-full bg-[var(--theme-surface)] overflow-hidden">
                      <iframe
                        title="Preview"
                        srcDoc={artifact.language === 'html' || artifact.type === 'html' ? getCombinedSrcDoc(artifact.content, allArtifacts) : artifact.content}
                        className="w-full h-full border-none bg-white"
                        sandbox="allow-scripts"
                      />
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const ClaudeAsterisk = () => (
  <svg viewBox="0 0 24 24" className="w-8 h-8 text-[#e05c38] shrink-0 animate-[spin_10s_linear_infinite]" fill="currentColor">
    <path d="M12,2 C12.55,2 13,2.45 13,3 L13,6.1 C14.3,5.1 15.9,4.6 17.5,4.6 C18.05,4.6 18.5,5.05 18.5,5.6 C18.5,6.15 18.05,6.6 17.5,6.6 C16.4,6.6 15.3,7.1 14.5,7.9 C15.8,7.3 17.3,7.1 18.8,7.3 C19.33,7.39 19.7,7.87 19.7,8.4 C19.7,8.93 19.33,9.41 18.8,9.5 C17.3,9.7 15.8,10.1 14.5,10.8 C15.6,11.3 16.5,12.1 17.1,13.1 C17.41,13.57 17.31,14.19 16.85,14.5 C16.39,14.81 15.77,14.71 15.45,14.25 C14.8,13.2 13.7,12.4 12.5,12.1 L12.5,18.5 C12.5,19.05 12.05,19.5 11.5,19.5 C10.95,19.5 10.5,19.05 10.5,18.5 L10.5,12.1 C9.3,12.1 8.2,12.9 7.55,13.95 C7.23,14.41 6.61,14.51 6.15,14.2 C5.69,13.89 5.59,13.27 5.9,12.81 C6.5,11.81 7.4,11.01 8.5,10.51 C7.2,9.81 5.7,9.41 4.2,9.21 C3.67,9.12 3.3,8.64 3.3,8.11 C3.3,7.58 3.67,7.1 4.2,7.01 C5.7,6.81 7.2,7.01 8.5,7.61 C7.7,6.81 6.6,6.31 5.5,6.31 C4.95,6.31 4.5,5.86 4.5,5.31 C4.5,4.76 4.95,4.31 5.5,4.31 C7.1,4.31 8.7,4.81 10,5.81 L10,2.71 C10,2.16 10.45,1.71 11,1.71 Z" />
  </svg>
);

export default function App() {
  const { isDark: isDarkMode, theme } = useTheme();
  const [userProfile, setUserProfile] = useState<{
    name: string;
    avatar: string;
    dob: string;
    location: string;
    age?: number | string;
  }>(() => {
    try {
      const saved = localStorage.getItem('lumina_user_profile');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      name: 'User',
      avatar: '',
      dob: '',
      location: '',
      age: ''
    };
  });

  useEffect(() => {
    try {
      localStorage.setItem('lumina_user_profile', JSON.stringify(userProfile));
      if (userProfile.name && userProfile.name.trim() !== '' && userProfile.name !== 'User') {
        localStorage.setItem('lumina_profile_created', 'true');
      }
    } catch (e) {}
  }, [userProfile]);

  const [projectFolders, setProjectFolders] = useState<{ id: string; name: string }[]>(() => {
    try {
      const saved = localStorage.getItem('lumina_project_folders');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [
      { id: '1', name: 'UI Components' },
      { id: '2', name: 'Analysis Lab' },
    ];
  });

  useEffect(() => {
    try {
      localStorage.setItem('lumina_project_folders', JSON.stringify(projectFolders));
    } catch (e) {}
  }, [projectFolders]);

  const [activeProjectId, setActiveProjectId] = useState<string | null>(() => {
    try {
      return localStorage.getItem('lumina_active_project_id');
    } catch (e) {
      return null;
    }
  });

  useEffect(() => {
    try {
      if (activeProjectId) {
        localStorage.setItem('lumina_active_project_id', activeProjectId);
      } else {
        localStorage.removeItem('lumina_active_project_id');
      }
    } catch (e) {}
  }, [activeProjectId]);

  const [showLogin, setShowLogin] = useState(() => {
    try {
      const created = localStorage.getItem('lumina_profile_created');
      if (created === 'true') {
        return false;
      }
      const saved = localStorage.getItem('lumina_user_profile');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.name && parsed.name.trim() !== '' && parsed.name !== 'User') {
          return false;
        }
      }
      return true;
    } catch (e) {
      return true;
    }
  });
  const [loginName, setLoginName] = useState(() => {
    return userProfile.name && userProfile.name !== 'User' ? userProfile.name : '';
  });
  const [loginAge, setLoginAge] = useState(() => {
    return userProfile.age ? String(userProfile.age) : '';
  });
  const [errorText, setErrorText] = useState('');

  const handleOnboardingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginName.trim()) {
      setErrorText('Please enter a valid name.');
      return;
    }
    const ageNum = parseInt(loginAge);
    if (isNaN(ageNum) || ageNum <= 0 || ageNum > 120) {
      setErrorText('Please enter a valid age (1-120).');
      return;
    }

    const updatedProfile = {
      name: loginName.trim(),
      age: ageNum,
      avatar: `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(loginName.trim())}`,
      dob: '',
      location: 'Local Workspace'
    };

    setUserProfile(updatedProfile);
    try {
      localStorage.setItem('lumina_user_profile', JSON.stringify(updatedProfile));
      localStorage.setItem('lumina_profile_created', 'true');
    } catch (err) {}
    setShowLogin(false);
  };

  const [chats, setChats] = useState<Chat[]>([]);
  const [lightboxImage, setLightboxImage] = useState<{ url: string; title?: string } | null>(null);
  const [activeVideo, setActiveVideo] = useState<{ url: string; title?: string } | null>(null);

  useEffect(() => {
    (window as any).openImageLightbox = (url: string, title?: string) => {
      setLightboxImage({ url, title });
    };
    (window as any).playVideoInLuminaPopup = (url: string, title?: string) => {
      setActiveVideo({ url, title });
    };
    return () => {
      delete (window as any).openImageLightbox;
      delete (window as any).playVideoInLuminaPopup;
    };
  }, []);

  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(260);
  const [isResizing, setIsResizing] = useState(false);
  
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = e.clientX;
      if (newWidth >= 180 && newWidth <= 600) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    };
  }, [isResizing]);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCompactSidebar, setIsCompactSidebar] = useState(() => {
    return localStorage.getItem('lumina_compact_sidebar') === 'true';
  });
  const [useBubbles, setUseBubbles] = useState(() => {
    return localStorage.getItem('lumina_use_bubbles') !== 'false';
  });
  const [autoHideTopBar, setAutoHideTopBar] = useState(() => {
    return localStorage.getItem('lumina_auto_hide_top_bar') === 'true';
  });
  const [isSourcesPanelOpen, setIsSourcesPanelOpen] = useState(false);
  const [sourcesPanelMessageId, setSourcesPanelMessageId] = useState<string | null>(null);



  const [activeSettingsTab, setActiveSettingsTab] = useState<'general' | 'ai' | 'mcp' | 'bridge' | 'sources' | 'search' | 'persona' | 'profile' | 'theme' | 'lumina_tools'>('general');
  const [activePlusSubMenu, setActivePlusSubMenu] = useState<'main' | 'mcp' | 'tools' | 'lumina_tools' | 'project' | 'skills' | 'style'>('main');
  const [mcpMode, setMcpMode] = useState<'local' | 'remote'>('local');
  const [remoteMcpConfig, setRemoteMcpConfig] = useState({ url: '', status: 'disconnected' as 'disconnected' | 'connecting' | 'connected', error: '' });
  const [testToolInput, setTestToolInput] = useState({ name: '', args: '{}' });
  const [isTestingTool, setIsTestingTool] = useState(false);
  const [testToolResult, setTestToolResult] = useState<any>(null);
  const [modelSearchQuery, setModelSearchQuery] = useState('');
  const [providerSearchQuery, setProviderSearchQuery] = useState('');
  const [persona, setPersona] = useState({
    name: 'Lumina',
    role: 'Modern Intelligence',
    avatar: '',
    isGeneratingAvatar: false
  });
  const DEFAULT_SERVER_URL = '/api';
  const DEFAULT_MCP_URL = '/api';
  const DEFAULT_API_KEY = 'llama';

  const safeGetItem = (key: string, fallback: string) => {
    try {
      return localStorage.getItem(key) || fallback;
    } catch (error) {
      return fallback;
    }
  };

  const [serverUrl, setServerUrl] = useState(() => safeGetItem('lumina_server_url', DEFAULT_SERVER_URL));
  const [apiKey, setApiKey] = useState(() => safeGetItem('lumina_api_key', DEFAULT_API_KEY));
  const [mcpUrl, setMcpUrl] = useState(() => safeGetItem('lumina_mcp_url', DEFAULT_MCP_URL));
  const [mcpKey, setMcpKey] = useState(() => safeGetItem('lumina_mcp_key', DEFAULT_API_KEY));
  
  // Llama Bridge backend
  const [llamaBridgeUrl, setLlamaBridgeUrl] = useState(() => 
    localStorage.getItem('lumina_llama_url') || 'http://localhost:8089'
  );
  const [llamaBridgeApiKey, setLlamaBridgeApiKey] = useState(() => 
    localStorage.getItem('lumina_llama_key') || ''
  );
  const [llamaBridgeModels, setLlamaBridgeModels] = useState<{id: string, name: string}[]>([]);
  const [selectedLlamaModel, setSelectedLlamaModel] = useState('');
  const [useBridgeTools, setUseBridgeTools] = useState(() => localStorage.getItem('lumina_bridge_enabled') === 'true');
  const [searchProvider, setSearchProvider] = useState(() => localStorage.getItem('lumina_search_provider') || 'tavily');
  const [tavilyApiKey, setTavilyApiKey] = useState(() => safeGetItem('lumina_tavily_key', ''));
  const [serpApiKey, setSerpApiKey] = useState(() => safeGetItem('lumina_serp_key', ''));
  
  const [aiVerificationState, setAiVerificationState] = useState<'idle' | 'verifying' | 'success' | 'error'>('idle');
  const [searchVerificationState, setSearchVerificationState] = useState<'idle' | 'verifying' | 'success' | 'error'>('idle');
  const [isAiSaved, setIsAiSaved] = useState(false);
  const [isSearchSaved, setIsSearchSaved] = useState(false);
   const [isMcpSaved, setIsMcpSaved] = useState(false);
  const [scrapingResults, setScrapingResults] = useState<Map<string, ScrapeResult>>(new Map());
  const [activeScrapingJobs, setActiveScrapingJobs] = useState<Set<string>>(new Set());
  const [wikiResults, setWikiResults] = useState<Map<string, { wikiType: string, data: any }>>(new Map());

  const [luminaTools, setLuminaTools] = useState<Tool[]>([
    {
      id: 'web_scrape',
      name: 'Web Scraper',
      description: 'Fetch and extract structured data from any webpage',
      enabled: false,
      icon: <Globe size={16} />,
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'The URL to scrape' },
          selectors: { type: 'object', description: 'Optional CSS selectors to extract specific data' },
          usePuppeteer: { type: 'boolean', description: 'Set to true if page requires JavaScript execution' },
          extractLinks: { type: 'boolean', description: 'Whether to extract outgoing links' },
          extractTables: { type: 'boolean', description: 'Whether to extract HTML tables' },
          outputFormat: { type: 'string', enum: ['json', 'markdown', 'html'], description: 'Output format' }
        },
        required: ['url']
      }
    },
    {
      id: 'wiki_search',
      name: 'Wikipedia Search',
      description: 'Search Wikipedia for articles by query',
      enabled: false,
      icon: <Search size={16} />
    },
    {
      id: 'wiki_get_page',
      name: 'Wikipedia Page Fetch',
      description: 'Fetch full Wikipedia article by page ID',
      enabled: false,
      icon: <BookOpen size={16} />
    },
    {
      id: 'wiki_get_summary',
      name: 'Wikipedia Summary',
      description: 'Get a fast summary (introduction paragraph only) of a Wikipedia article',
      enabled: false,
      icon: <FileText size={16} />
    },
    {
      id: 'wiki_get_sections',
      name: 'Wikipedia Table of Contents',
      description: 'Get the table of contents sections list for a page',
      enabled: false,
      icon: <Layers size={16} />
    },
    {
      id: 'wiki_get_categories',
      name: 'Wikipedia Categories',
      description: 'Get all categories that a page belongs to',
      enabled: false,
      icon: <Library size={16} />
    },
    {
      id: 'wiki_get_links',
      name: 'Wikipedia Link Tracker',
      description: 'Get all internal Wikipedia links from an article',
      enabled: false,
      icon: <LinkIcon size={16} />
    },
    {
      id: 'wiki_get_images',
      name: 'Wikipedia Media Scraper',
      description: 'Get all images used in a Wikipedia article',
      enabled: false,
      icon: <ImageIcon size={16} />
    },
    {
      id: 'wiki_get_related',
      name: 'Wikipedia Related Pages',
      description: 'Find pages in the same category (related articles)',
      enabled: false,
      icon: <Compass size={16} />
    }
  ]);

  const [bridgeTools, setBridgeTools] = useState<Tool[]>([]);
  const [availableModels, setAvailableModels] = useState<{ id: string; name: string; icon: React.ReactNode; color: string }[]>([
    { id: 'sonnet-4.6', name: 'Sonnet 4.6', icon: <Sparkles size={14} />, color: 'text-amber-500' },
    { id: 'lumina-ultra-plus', name: 'Lumina Ultra Plus', icon: <Sparkles size={14} />, color: 'text-blue-500' },
    { id: 'lumina-pro-max', name: 'Lumina Pro Max', icon: <Plus size={14} />, color: 'text-purple-500' },
    { id: 'lumina-mini-flash', name: 'Lumina Mini Flash', icon: <ArrowUp size={14} />, color: 'text-orange-500' },
  ]);

  const [isMcpConnected, setIsMcpConnected] = useState(false);
  const [isConnectingMcp, setIsConnectingMcp] = useState(false);
  const [writingStyle, setWritingStyle] = useState('default');
  const [selectedProvider, setSelectedProvider] = useState(() => safeGetItem('lumina_provider', 'custom'));

  const handleProviderSelect = (providerId: string) => {
    setSelectedProvider(providerId);
    const p = CLOUD_PROVIDERS.find(p => p.id === providerId);
    if (p && p.endpoint) {
      setServerUrl(p.endpoint);
    }
    if (providerId === 'custom') {
      setServerUrl(DEFAULT_SERVER_URL);
    }
    setIsAiSaved(false);
  };

  const WRITING_STYLES = [
    { id: 'default', label: 'Default', icon: <PenTool size={14} /> },
    { id: 'poem', label: 'Poem', icon: <Music size={14} /> },
    { id: 'story', label: 'Story', icon: <History size={14} /> },
    { id: 'letter', label: 'Letter', icon: <Mail size={14} /> },
    { id: 'essay', label: 'Essay', icon: <FileText size={14} /> },
    { id: 'script', label: 'Script', icon: <TypeIcon size={14} /> },
  ];

  const SKILLS: Skill[] = [
    { id: 'summarize', label: 'Summarize', prompt: 'Summarize the following: ', icon: <FileText size={16} /> },
    { id: 'translate', label: 'Translate', prompt: 'Translate the following to English: ', icon: <Globe size={16} /> },
    { id: 'explain', label: 'Explain Code', prompt: 'Explain this code step by step: ', icon: <Code size={16} /> },
    { id: 'brainstorm', label: 'Brainstorm', prompt: 'Brainstorm 5 creative ideas for: ', icon: <Sparkles size={16} /> },
    { id: 'refactor', label: 'Refactor', prompt: 'Refactor and improve this code: ', icon: <Wrench size={16} /> },
  ];

  const handleSaveAI = () => {
    localStorage.setItem('lumina_server_url', serverUrl);
    localStorage.setItem('lumina_api_key', apiKey);
    localStorage.setItem('lumina_provider', selectedProvider);
    setIsAiSaved(true);
    setTimeout(() => setIsAiSaved(false), 2000);
  };

  const handleVerifyAI = useCallback(async () => {
    setAiVerificationState('verifying');
    try {
      const response = await fetch(`${serverUrl.replace(/\/+$/, '')}/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const modelsArr = data.data || data.models || [];
        if (Array.isArray(modelsArr)) {
          const fetchedModels = modelsArr.map((m: any) => ({
            id: m.id,
            name: m.display_name || m.id,
            icon: <Sparkles size={14} />,
            color: 'text-blue-500'
          }));
          if (fetchedModels.length > 0) {
            setAvailableModels(fetchedModels);
          }
        }
        setAiVerificationState('success');
      } else {
        setAiVerificationState('error');
      }
    } catch (error) {
      console.error('Verification failed:', error);
      setAiVerificationState('error');
    } finally {
      setTimeout(() => setAiVerificationState('idle'), 3000);
    }
  }, [serverUrl, apiKey]);

  const handleSaveSearch = () => {
    localStorage.setItem('lumina_tavily_key', tavilyApiKey);
    localStorage.setItem('lumina_serp_key', serpApiKey);
    localStorage.setItem('lumina_search_provider', searchProvider);
    setIsSearchSaved(true);
    setTimeout(() => setIsSearchSaved(false), 2000);
  };

  const handleVerifySearch = useCallback(() => {
    setSearchVerificationState('verifying');
    setTimeout(() => {
      const key = searchProvider === 'serpapi' ? serpApiKey : tavilyApiKey;
      if (key && key.trim().length > 0) {
        setSearchVerificationState('success');
      } else {
        setSearchVerificationState('error');
      }
      setTimeout(() => setSearchVerificationState('idle'), 3000);
    }, 1200);
  }, [searchProvider, tavilyApiKey, serpApiKey]);

  // Auto-verify pre-configured API keys on app boot / mount
  useEffect(() => {
    const savedApiKey = localStorage.getItem('lumina_api_key');
    if (savedApiKey && savedApiKey.trim().length > 0) {
      handleVerifyAI();
    }
    const savedProvider = localStorage.getItem('lumina_search_provider') || 'tavily';
    const key = savedProvider === 'serpapi'
      ? localStorage.getItem('lumina_serp_key')
      : localStorage.getItem('lumina_tavily_key');
    if (key && key.trim().length > 0) {
      handleVerifySearch();
    }
  }, [handleVerifyAI, handleVerifySearch]);

  const handleSaveMcp = () => {
    localStorage.setItem('lumina_mcp_url', mcpUrl);
    localStorage.setItem('lumina_mcp_key', mcpKey);
    setIsMcpSaved(true);
    setTimeout(() => setIsMcpSaved(false), 2000);
  };
  
  // ─── Tool Building ──────────────────────────────────────────────────────────
  // Tools are divided into inbuilt (Lumina) and external (Bridge) categories.
  const buildActiveTools = (): ToolDefinition[] => {
    const activeLumina = luminaTools
      .filter(t => t.enabled)
      .map(t => {
        // Retrieve full definitions if available
        if (t.id === 'web_scrape') {
          return webScrapeTool;
        }
        const wikiMatch = ALL_WIKI_TOOLS.find(w => w.function.name === t.id);
        if (wikiMatch) {
          return wikiMatch;
        }
        return {
          type: 'function' as const,
          function: {
            name: t.id,
            description: t.description || 'Lumina Tool',
            parameters: t.parameters || { type: 'object', properties: {}, required: [] }
          }
        };
      });

    const activeBridge = bridgeTools
      .filter(t => t.enabled)
      .map(t => ({
        type: 'function' as const,
        function: {
          name: t.id,
          description: t.description || 'Bridge Tool',
          parameters: t.parameters || { type: 'object', properties: {}, required: [] }
        }
      }));

    return [...activeLumina, ...activeBridge];
  };
  
  // ─── Bridge Communication ──────────────────────────────────────────────────
  const callLlamaBridge = async (messages: any[], tools: ToolDefinition[], signal?: AbortSignal) => {
    const useBridge = useBridgeTools && llamaBridgeUrl;
    const baseUrl = useBridge ? llamaBridgeUrl.replace(/\/+$/, '') : serverUrl.replace(/\/+$/, '');
    const key = useBridge ? llamaBridgeApiKey : apiKey;
    
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (key) headers['Authorization'] = `Bearer ${key}`;
    
    const body: any = {
      model: useBridge ? selectedLlamaModel : activeModelId,
      messages: messages,
      stream: false,
    };
    
    if (tools.length > 0) {
      body.tools = tools;
      body.tool_choice = 'auto';
    }
    
    const endpoint = baseUrl.replace(/\/+$/, '');
    const apiUrl = endpoint.match(/\/v1\/?$/) ? `${endpoint}/chat/completions` : `${endpoint}/v1/chat/completions`;
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal,
    });
    
    return await response.json();
  };
  
  const updateToolCallStatus = (toolCallId: string, status: 'pending' | 'active' | 'complete' | 'failed') => {
    setChats(prev => prev.map(chat => ({
      ...chat,
      messages: chat.messages.map((m: Message) => {
        if (m.toolCalls) {
          return {
            ...m,
            toolCalls: m.toolCalls.map((tc: ToolCallNode) => 
              tc.id === toolCallId ? { ...tc, status } : tc
            )
          };
        }
        return m;
      })
    })));
  };
  
  const handleTestLlamaConnection = async () => {
    setAiVerificationState('verifying');
    try {
      const healthy = await checkBridgeHealth(llamaBridgeUrl, llamaBridgeApiKey);
      setAiVerificationState(healthy ? 'success' : 'error');
    } catch (error) {
      console.error('Llama Bridge connection failed:', error);
      setAiVerificationState('error');
    } finally {
      setTimeout(() => setAiVerificationState('idle'), 3000);
    }
  };
  
  // ─── Bridge Tool Discovery ─────────────────────────────────────────────────
  const handleLoadBridgeTools = useCallback(async () => {
    try {
      const tools = await fetchBridgeTools(llamaBridgeUrl, llamaBridgeApiKey);
      if (tools.length > 0) {
        const mappedTools: Tool[] = tools.map((t: any) => {
          let icon = <Box size={14} />;
          const name = (t.name || t.id || '').toLowerCase();
          if (name.includes('search') || name.includes('research')) icon = <Search size={14} />;
          if (name.includes('shell') || name.includes('terminal')) icon = <Terminal size={14} />;
          if (name.includes('weather')) icon = <CloudMoon size={14} />;
          if (name.includes('wikipedia') || name.includes('globe')) icon = <Globe size={14} />;
          if (name.includes('image')) icon = <ImageIcon size={14} />;
          if (name.includes('date') || name.includes('time')) icon = <Calendar size={14} />;
          if (name.includes('verify')) icon = <Check size={14} />;
          if (name.includes('render') || name.includes('video')) icon = <Video size={14} />;
          
          return {
            id: t.id || t.name,
            name: t.name || t.id,
            description: t.description || '',
            enabled: false,
            icon,
            parameters: t.parameters,
          };
        });
        // Filter out native built-in tools (web_scrape and wiki_*) to avoid duplicates
        const filteredTools = mappedTools.filter(t => t.id !== 'web_scrape' && !t.id.startsWith('wiki_'));
        setBridgeTools(filteredTools);
        setIsMcpConnected(true);
        showToast(`Loaded ${mappedTools.length} bridge tools`);
      }
    } catch (error) {
      console.error('Failed to load bridge tools:', error);
    }
  }, [llamaBridgeUrl, llamaBridgeApiKey]);
  
  const handleLoadLlamaModels = async () => {
    try {
      // Use the Express proxy to avoid CORS issues
      const response = await fetch('/api/bridge/models', {
        method: 'GET',
        headers: {
          'X-Bridge-Url': llamaBridgeUrl.replace(/\/+$/, ''),
          'X-Api-Key': llamaBridgeApiKey,
        }
      });
      
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          const models = data.data || data.models || [];
          const fetchedModels = models.map((m: any) => ({
            id: m.id,
            name: m.display_name || m.id,
            icon: <Sparkles size={14} />,
            color: 'text-blue-500'
          }));
          setLlamaBridgeModels(fetchedModels);
          if (fetchedModels.length > 0 && !selectedLlamaModel) {
            setSelectedLlamaModel(fetchedModels[0].id);
          }
          showToast(`Loaded ${fetchedModels.length} models`);
        } else {
          console.warn('Expected JSON response from /api/bridge/models, got non-JSON content type:', contentType);
          showToast('Failed to load models (unexpected server response)');
        }
      } else {
        showToast('Failed to load models');
      }
    } catch (error) {
      console.error('Failed to load Llama Bridge models:', error);
      showToast('Failed to load models');
    }
  };

  const [selectedModel, setSelectedModel] = useState('sonnet-4.6');
  const activeModelList = useMemo(() => 
    llamaBridgeModels.length > 0
      ? llamaBridgeModels.map(m => ({ id: m.id, name: m.name, icon: <Sparkles size={14} />, color: 'text-blue-500' }))
      : availableModels,
    [llamaBridgeModels, availableModels]
  );
  const activeModelId = selectedLlamaModel || selectedModel;
  const setActiveModelId = useCallback((id: string) => {
    setSelectedLlamaModel(id);
  }, []);

  const [input, setInput] = useState('');
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);

  const SLASH_COMMANDS = useMemo(() => [
    { id: 'clear', name: 'clear', desc: 'Clear current chat history' },
    { id: 'new', name: 'new', desc: 'Start a new chat session' },
    { id: 'goal', name: 'goal', desc: 'Run until the specified goal is completely finished' },
    { id: 'schedule', name: 'schedule', desc: 'Run custom instruction on a recurring schedule or as a one-time timer' },
    { id: 'browser', name: 'browser', desc: 'Invoke a browser agent for web tasks' },
    { id: 'grill-me', name: 'grill-me', desc: 'Interview me to align on a plan' },
    { id: 'coder', name: 'coder', desc: 'Activate autonomous Software Engineering Agent mode' },
    { id: 'coder_off', name: 'coder off', desc: 'Deactivate autonomous Software Engineering Agent mode' }
  ], []);

  const showsSlashCommands = input.startsWith('/') && !input.substring(1).includes(' ');
  const slashQuery = showsSlashCommands ? input.substring(1).toLowerCase() : '';
  const filteredCommands = useMemo(() => {
    if (!showsSlashCommands) return [];
    return SLASH_COMMANDS.filter(cmd => cmd.name.toLowerCase().includes(slashQuery));
  }, [showsSlashCommands, slashQuery, SLASH_COMMANDS]);

  useEffect(() => {
    if (filteredCommands.length > 0 && selectedCommandIndex >= filteredCommands.length) {
      setSelectedCommandIndex(0);
    }
  }, [filteredCommands.length, selectedCommandIndex]);
  const [isTyping, setIsTyping] = useState(false);
  const [activeSkills, setActiveSkills] = useState<string[]>([]);
  const [activeArtifact, setActiveArtifact] = useState<Artifact | null>(null);
  const [isCanvasOpen, setIsCanvasOpen] = useState(false);
  const [activeLabTab, setActiveLabTab] = useState<'physics' | 'chemistry' | 'math' | 'biology' | null>(null);
  const isPhysicsTabActive = activeLabTab !== null;
  const setIsPhysicsTabActive = (active: boolean) => {
    setActiveLabTab(active ? 'physics' : null);
  };
  const [isPhysicsCanvasOpen, setIsPhysicsCanvasOpen] = useState(false);
  useEffect(() => {
    if (isPhysicsCanvasOpen) {
      setActiveLabTab('physics');
      setCurrentChatId(null);
      setIsPhysicsCanvasOpen(false);
    }
  }, [isPhysicsCanvasOpen]);
  const [canvasView, setCanvasView] = useState<'code' | 'preview'>('code');
  const [typingMessageId, setTypingMessageId] = useState<string | null>(null);
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isPlusMenuOpen, setIsPlusMenuOpen] = useState(false);
  const [isCoderMode, setIsCoderMode] = useState(false);
  const [activeCommandType, setActiveCommandType] = useState<string | null>(null);
  const [activeCommandQuery, setActiveCommandQuery] = useState<string | null>(null);
  const [coderTodos, setCoderTodos] = useState<{ id: string; text: string; status: 'pending' | 'in_progress' | 'complete' | 'failed' }[]>([]);
  const [isGeneratingTodos, setIsGeneratingTodos] = useState(false);
  const [showTodoPanel, setShowTodoPanel] = useState(false);
  const [todoCollapsed, setTodoCollapsed] = useState(false);

  // Ask AI States
  const [askAiQuestions, setAskAiQuestions] = useState<{ id: string; question: string; type: 'single_choice' | 'multi_choice' | 'scale' | 'text_input' | 'confirm'; options?: string[]; purpose?: string }[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [askAiAnswers, setAskAiAnswers] = useState<Record<string, any>>({});
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const [showAskAiPanel, setShowAskAiPanel] = useState(false);
  const [textInputAnswer, setTextInputAnswer] = useState('');
  const [isTransitioningQuestion, setIsTransitioningQuestion] = useState(false);
  const [isAnalyzingAnswers, setIsAnalyzingAnswers] = useState(false);

  // Countdown Timer Effect for To-dos
  useEffect(() => {
    const timer = setInterval(() => {
      setChats(prev => {
        let updated = false;
        const nextChats = prev.map(chat => {
          const nextMessages = chat.messages.map(m => {
            if (m.todoPlan && !m.todoPlan.isConfirmed && m.todoPlan.countdown !== undefined && m.todoPlan.countdown > 0) {
              updated = true;
              const nextCountdown = m.todoPlan.countdown - 1;
              if (nextCountdown === 0) {
                // Auto-starts
                setTimeout(() => handleStartBuilding(chat.id, m.id, m.todoPlan!.todos), 0);
                return {
                  ...m,
                  todoPlan: {
                    ...m.todoPlan,
                    countdown: 0,
                    isConfirmed: true
                  }
                };
              }
              return {
                ...m,
                todoPlan: {
                  ...m.todoPlan,
                  countdown: nextCountdown
                }
              };
            }
            return m;
          });
          return { ...chat, messages: nextMessages };
        });
        return updated ? nextChats : prev;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [chats]);

  useEffect(() => {
    if (!isTyping) return;
    if (coderTodos.length === 0) return;

    // Only auto-advance if we are NOT in Coder Mode (which relies on real tool-call transitions)
    if (!isCoderMode) {
      const interval = setInterval(() => {
        setCoderTodos(prev => {
          const currentProgressIdx = prev.findIndex(t => t.status === 'in_progress');
          if (currentProgressIdx === -1) {
            const firstPendingIdx = prev.findIndex(t => t.status === 'pending');
            if (firstPendingIdx !== -1) {
              return prev.map((item, idx) => {
                if (idx === firstPendingIdx) return { ...item, status: 'in_progress' };
                return item;
              });
            }
            return prev;
          }

          return prev.map((item, idx) => {
            if (idx === currentProgressIdx) return { ...item, status: 'complete' };
            if (idx === currentProgressIdx + 1) return { ...item, status: 'in_progress' };
            return item;
          });
        });
      }, 3500);

      return () => clearInterval(interval);
    }
  }, [isTyping, isCoderMode, coderTodos.length]);
  const [isCoderWorkspacePanelOpen, setIsCoderWorkspacePanelOpen] = useState(true);
  const [isCoderLeftPanelOpen, setIsCoderLeftPanelOpen] = useState(true);
  const [isCoderRightPanelOpen, setIsCoderRightPanelOpen] = useState(false);
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [isTerminalPopupOpen, setIsTerminalPopupOpen] = useState(false);
  const [isElizaActive, setIsElizaActive] = useState(false);
  const [elizaToggleSignal, setElizaToggleSignal] = useState(0);
  const [isWhiteboardOpen, setIsWhiteboardOpen] = useState(false);
  const [floatingEditFile, setFloatingEditFile] = useState<string | null>(null);
  const [workspaceRefreshKey, setWorkspaceRefreshKey] = useState(0);
  const [iframeKey, setIframeKey] = useState(0);

  // New features for right preview panel: Viewport simulator & Subpath Route
  const [rightViewportMode, setRightViewportMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [rightIsGridEnabled, setRightIsGridEnabled] = useState<boolean>(false);
  const [rightPreviewSubpath, setRightPreviewSubpath] = useState<string>('');
  const [rightIsInspectMode, setRightIsInspectMode] = useState<boolean>(false);
  const [localElementAttachments, setLocalElementAttachments] = useState<any[]>([]);
  const [attachmentContextMenu, setAttachmentContextMenu] = useState<{ visible: boolean, x: number, y: number, attachment: any, index: number }>({ visible: false, x: 0, y: 0, attachment: null, index: -1 });
  const [selectedModalAttachment, setSelectedModalAttachment] = useState<any | null>(null);
  const [isAnalyzingElement, setIsAnalyzingElement] = useState<boolean>(false);
  const rightIframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const handleGlobalClick = () => {
      setAttachmentContextMenu(prev => prev.visible ? { visible: false, x: 0, y: 0, attachment: null, index: -1 } : prev);
    };
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsWhiteboardOpen(false);
        setIsTerminalPopupOpen(false);
        setLightboxImage(null);
      }
    };
    window.addEventListener('click', handleGlobalClick);
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      window.removeEventListener('click', handleGlobalClick);
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, []);

  const currentChatActive = chats.find(c => c.id === currentChatId);
  useEffect(() => {
    if (currentChatActive) {
      const chatIsCoder = !!(currentChatActive as any).isCoderMode;
      setIsCoderMode(chatIsCoder);
      if (chatIsCoder) {
        setIsCoderWorkspacePanelOpen(true);
        setIsSidebarOpen(false);
      }
    } else {
      setIsCoderMode(false);
    }
  }, [currentChatId, currentChatActive]);

  const triggerWorkspaceRefresh = useCallback(() => {
    setWorkspaceRefreshKey(prev => prev + 1);
  }, []);

  useEffect(() => {
    const handleWorkspaceGlobalRefresh = () => {
      triggerWorkspaceRefresh();
    };
    window.addEventListener('trigger-workspace-refresh', handleWorkspaceGlobalRefresh);
    return () => {
      window.removeEventListener('trigger-workspace-refresh', handleWorkspaceGlobalRefresh);
    };
  }, [triggerWorkspaceRefresh]);

  const [isWebSearchEnabled, setIsWebSearchEnabled] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [toasts, setToasts] = useState<{ id: string; message: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showScrollButton, setShowScrollButton] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const modelDropdownContentRef = useRef<HTMLDivElement>(null);
  const headerMenuRef = useRef<HTMLDivElement>(null);
  const plusMenuRef = useRef<HTMLDivElement>(null);

  const [activeAssistantMode, setActiveAssistantMode] = useState<'builder' | 'planner' | 'debugger'>('builder');
  const [isModeDropdownOpen, setIsModeDropdownOpen] = useState(false);
  const modeDropdownRef = useRef<HTMLDivElement>(null);
  const modeDropdownContentRef = useRef<HTMLDivElement>(null);

  const menuContentRef = useRef<HTMLDivElement>(null);

  // Hook for Model Dropdown
  const modelDropdownPosition = useSmartPopupPosition({
    triggerRef: dropdownRef,
    popupRef: modelDropdownContentRef,
    isOpen: isModelDropdownOpen,
    align: 'center',
    preferredDirection: 'up',
    margin: 12,
    viewportPadding: 16,
    dependencies: [modelSearchQuery, activeModelList],
  });

  // Hook for Plus Menu Popup
  const plusMenuPopupPosition = useSmartPopupPosition({
    triggerRef: plusMenuRef,
    popupRef: menuContentRef,
    isOpen: isPlusMenuOpen,
    align: 'left',
    preferredDirection: 'up',
    margin: 12,
    viewportPadding: 16,
    dependencies: [activePlusSubMenu, SKILLS, WRITING_STYLES],
  });

  // Hook for Assistant Mode Dropdown
  const modeDropdownPosition = useSmartPopupPosition({
    triggerRef: modeDropdownRef,
    popupRef: modeDropdownContentRef,
    isOpen: isModeDropdownOpen,
    align: 'center',
    preferredDirection: 'up',
    margin: 12,
    viewportPadding: 16,
  });

  useEffect(() => {
    const handleRejection = (event: PromiseRejectionEvent) => {
      if (event.reason?.message?.includes('WebSocket') || event.reason?.message?.includes('closed without opened')) {
        event.preventDefault();
        console.warn('Suppressed benign WebSocket error:', event.reason.message);
      }
    };
    window.addEventListener('unhandledrejection', handleRejection);
    return () => window.removeEventListener('unhandledrejection', handleRejection);
  }, []);

  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer) return;
    const handleScroll = () => {
      const isScrolledUp = scrollContainer.scrollHeight - scrollContainer.scrollTop - scrollContainer.clientHeight > 200;
      setShowScrollButton(isScrolledUp);
    };
    scrollContainer.addEventListener('scroll', handleScroll);
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsModelDropdownOpen(false);
      }
      if (headerMenuRef.current && !headerMenuRef.current.contains(event.target as Node)) {
        setIsHeaderMenuOpen(false);
      }
      if (plusMenuRef.current && !plusMenuRef.current.contains(event.target as Node)) {
        setIsPlusMenuOpen(false);
        setActivePlusSubMenu('main');
      }
      if (modeDropdownRef.current && !modeDropdownRef.current.contains(event.target as Node)) {
        setIsModeDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const insertAttachedContent = useCallback((text: string) => {
    setInput(prev => {
      const glue = prev && !prev.endsWith('\n') ? '\n\n' : prev ? '\n' : '';
      const newVal = prev + glue + text;
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.style.height = 'auto';
          inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 200)}px`;
        }
      }, 50);
      return newVal;
    });
  }, []);

  const handleSelectedElementAnalysis = useCallback(async (metadata: {
    tag: string;
    id: string;
    classes: string;
    text: string;
    placeholder: string;
    src: string;
    href: string;
  }) => {
    setIsAnalyzingElement(true);
    showToast("Analyzing selected element...");
    try {
      const response = await fetch('/api/fs/analyze_element', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(metadata)
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.analysis) {
          const newAtt = {
            id: Date.now().toString(),
            fileName: data.analysis.fileName,
            filePath: data.analysis.filePath,
            specificCode: data.analysis.specificCode,
            connections: data.analysis.connections || [],
            elementWork: data.analysis.elementWork
          };
          setLocalElementAttachments(prev => [...prev, newAtt]);
          showToast(`Attached selected element as a visual document badge`);
        } else {
          showToast("Automated element source trace returned an error.");
        }
      } else {
        showToast("Error communicating with source analysis API.");
      }
    } catch (err) {
      console.error(err);
      showToast("Network error tracing element source code.");
    } finally {
      setIsAnalyzingElement(false);
    }
  }, [showToast]);

  useEffect(() => {
    const iframe = rightIframeRef.current;
    if (!iframe) return;

    let docCleanup: (() => void) | null = null;

    const attachInspectListeners = () => {
      try {
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (!doc) return;

        if (docCleanup) {
          docCleanup();
          docCleanup = null;
        }

        let hoveredEl: HTMLElement | null = null;
        let originalOutline = '';
        let originalTransition = '';

        const handleMouseOver = (e: MouseEvent) => {
          if (!rightIsInspectMode) return;
          e.stopPropagation();

          if (hoveredEl && hoveredEl !== e.target) {
            hoveredEl.style.outline = originalOutline;
            hoveredEl.style.transition = originalTransition;
          }

          hoveredEl = e.target as HTMLElement;
          if (hoveredEl) {
            originalOutline = hoveredEl.style.outline;
            originalTransition = hoveredEl.style.transition;

            hoveredEl.style.transition = 'outline 0.1s ease';
            hoveredEl.style.outline = '2px dashed #0D9488';
          }
        };

        const handleMouseOut = (e: MouseEvent) => {
          if (!rightIsInspectMode) return;
          if (hoveredEl) {
            hoveredEl.style.outline = originalOutline;
            hoveredEl.style.transition = originalTransition;
            hoveredEl = null;
          }
        };

        const handleElementClick = (e: MouseEvent) => {
          if (!rightIsInspectMode) return;
          e.preventDefault();
          e.stopPropagation();

          const clickedEl = e.target as HTMLElement;
          if (clickedEl) {
            clickedEl.style.outline = originalOutline;
            clickedEl.style.transition = originalTransition;

            const classes = clickedEl.className && typeof clickedEl.className === 'string' ? clickedEl.className : '';
            const tag = clickedEl.tagName.toLowerCase();
            const id = clickedEl.id || '';
            const placeholder = clickedEl.getAttribute('placeholder') || '';
            const href = clickedEl.getAttribute('href') || '';
            const src = clickedEl.getAttribute('src') || '';
            const text = clickedEl.innerText?.substring(0, 300).trim() || clickedEl.textContent?.substring(0, 300).trim() || '';

            setRightIsInspectMode(false);
            handleSelectedElementAnalysis({ tag, id, classes, text, placeholder, src, href });
          }
        };

        if (rightIsInspectMode) {
          doc.addEventListener('mouseover', handleMouseOver, true);
          doc.addEventListener('mouseout', handleMouseOut, true);
          doc.addEventListener('click', handleElementClick, true);

          let style = doc.getElementById('inspect-mode-cursor-style');
          if (!style) {
            style = doc.createElement('style');
            style.id = 'inspect-mode-cursor-style';
            style.innerHTML = `
              * {
                cursor: crosshair !important;
              }
            `;
            doc.head.appendChild(style);
          }
        } else {
          doc.getElementById('inspect-mode-cursor-style')?.remove();
        }

        docCleanup = () => {
          try {
            doc.removeEventListener('mouseover', handleMouseOver, true);
            doc.removeEventListener('mouseout', handleMouseOut, true);
            doc.removeEventListener('click', handleElementClick, true);
            doc.getElementById('inspect-mode-cursor-style')?.remove();
            if (hoveredEl) {
              (hoveredEl as HTMLElement).style.outline = originalOutline;
              (hoveredEl as HTMLElement).style.transition = originalTransition;
            }
          } catch (err) {
            console.warn("Error cleaning up inspect listeners:", err);
          }
        };
      } catch (err) {
        console.warn("Iframe same-origin inspection warning:", err);
      }
    };

    attachInspectListeners();

    iframe.addEventListener('load', attachInspectListeners);
    return () => {
      iframe.removeEventListener('load', attachInspectListeners);
      if (docCleanup) {
        docCleanup();
      }
    };
  }, [rightIsInspectMode, iframeKey, rightPreviewSubpath, handleSelectedElementAnalysis]);

  const handleSetIsSourcesPanelOpen = useCallback((v: boolean) => setIsSourcesPanelOpen(v), []);
  const handleSetActiveArtifact = useCallback((v: any) => setActiveArtifact(v), []);
  const handleSetIsCanvasOpen = useCallback((v: boolean) => setIsCanvasOpen(v), []);
  const handleSetCanvasView = useCallback((v: 'code' | 'preview') => setCanvasView(v), []);

  // Ask AI Callback & Action Helpers
  const handleTriggerAskAi = async () => {
    setIsGeneratingQuestions(true);
    setShowAskAiPanel(true);
    setCurrentQuestionIndex(0);
    setAskAiAnswers({});
    setTextInputAnswer('');

    const contextQuery = input.trim() || (messages.length > 0 ? messages[messages.length - 1].content : '');

    try {
      const messagesPrompt = [
        {
          role: 'system',
          content: `You are an expert software architect. Analyze the user's task or context and generate 2 to 6 targeted clarifying questions to ask before writing any code. Order them from most impactful to narrowest.
          Respond with a JSON object in this format (no other text, no markdown styling, no nested values):
          {
            "questions": [
              {
                "id": "theme_choice",
                "question": "Which visual style matches your branding goals?",
                "type": "single_choice",
                "options": ["Cosmic Midnight", "Clean Minimalist Light", "Warm Editorial", "Cybernetic Terminal"],
                "purpose": "Define color theme."
              }
            ]
          }
          Types permitted: 'single_choice' | 'multi_choice' | 'scale' | 'text_input' | 'confirm'.
          For 'single_choice' and 'multi_choice', provide 2 to 4 'options'. For 'scale', 'text_input', and 'confirm', leave 'options' empty.
          Each question MUST have a clear purpose.`
        },
        {
          role: 'user',
          content: `Task context: "${contextQuery || 'Build a web dashboard applet or custom feature component'}"`
        }
      ];

      const res = await callLlamaBridge(messagesPrompt, []);
      const text = res?.choices?.[0]?.message?.content || '';
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        if (Array.isArray(parsed.questions) && parsed.questions.length > 0) {
          const validated = parsed.questions.map((q: any) => ({
            id: q.id || Math.random().toString(),
            question: q.question || 'Please specify your requirement:',
            type: q.type || 'single_choice',
            options: Array.isArray(q.options) ? q.options.slice(0, 4) : undefined,
            purpose: q.purpose || ''
          })).filter((q: any) => q.question && ['single_choice', 'multi_choice', 'scale', 'text_input', 'confirm'].includes(q.type));
          
          if (validated.length > 0) {
            setAskAiQuestions(validated);
            setIsGeneratingQuestions(false);
            return;
          }
        }
      }
      throw new Error("Invalid json format");
    } catch (e) {
      console.warn("Llama bridge error, using default fallback questions", e);
      const fallbackQuestions = [
        {
          id: 'design_style',
          question: contextQuery 
            ? `Which visual aesthetic should we apply for "${contextQuery.slice(0, 30)}..."?`
            : "Which visual design concept do you prefer?",
          type: 'single_choice' as const,
          options: ["Swiss Minimalist", "Cosmic Slate Dark", "Sunset Warm & Playful", "Matrix Cyber Mono"],
          purpose: "Establishes a cohesive UI visual signature."
        },
        {
          id: 'target_features',
          question: "Which capabilities will enrich this feature most?",
          type: 'multi_choice' as const,
          options: ["Interactive Data Board", "Local Storage Search", "Export to PDF/CSV", "Advanced Options Drawer"],
          purpose: "Scopes primary interactive components."
        },
        {
          id: 'complexity_rating',
          question: "How interactive should the micro-animations & layout motion be?",
          type: 'scale' as const,
          purpose: "Aesthetic scale rating for framer-motion intensity."
        },
        {
          id: 'custom_wording',
          question: "Any specific layout file, logo name or branding header to use?",
          type: 'text_input' as const,
          purpose: "Applies customized text branding identifiers."
        },
        {
          id: 'confirm_bootstrap',
          question: "Should we inject a clean mock state to showcase initial features?",
          type: 'confirm' as const,
          purpose: "Specifies mock state populates on workspace build."
        }
      ];
      setAskAiQuestions(fallbackQuestions);
      setIsGeneratingQuestions(false);
    }
  };

  const handleNextQuestion = () => {
    setIsTransitioningQuestion(true);
    setTimeout(() => {
      setIsTransitioningQuestion(false);
      if (currentQuestionIndex < askAiQuestions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
      } else {
        handleFinishQuestions();
      }
    }, 200);
  };

  const handleSelectAnswer = (questionId: string, value: any, autoAdvance: boolean) => {
    setAskAiAnswers(prev => ({ ...prev, [questionId]: value }));
    if (autoAdvance) {
      handleNextQuestion();
    }
  };

  const handleDotClick = (index: number) => {
    if (index < currentQuestionIndex || askAiAnswers[askAiQuestions[index].id] !== undefined) {
      setCurrentQuestionIndex(index);
    }
  };

  const handleFinishQuestions = async (isSkipped = false) => {
    setIsAnalyzingAnswers(true);
    
    const contextQuery = input.trim() || (messages.length > 0 ? messages[messages.length - 1].content : 'Custom app refinement');
    const answersStr = isSkipped 
      ? "Skipped (Use sensible defaults)" 
      : Object.entries(askAiAnswers).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join('; ');
    
    let planTitle = `Interactive Feature Integration`;
    let planTodos = [
      { id: '1', text: "Scaffold visual view elements and structure", status: 'pending' as const },
      { id: '2', text: "Bind layout controls and state context handlers", status: 'pending' as const },
      { id: '3', text: "Integrate custom responsive configurations", status: 'pending' as const },
      { id: '4', text: "Apply high-contrast Tailwind styling and animations", status: 'pending' as const },
      { id: '5', text: "Run local unit audits and verify build output", status: 'pending' as const }
    ];
    let assumptionsMsg = "";

    try {
      const prompt = [
        {
          role: 'system',
          content: `You are an expert Software Architect. Create a structured implementation plan and list of 4-7 tasks to build the user's request, considering their answers to clarifying questions.
          Respond ONLY with a JSON object in this format:
          {
            "title": "Interactive Analytics Board",
            "assumptions": "Using Cosmic Slate Dark aesthetic with Local Storage active.",
            "todos": [
              "Set up responsive container and header with dark theme",
              "Install and import Lucide icon packs and charts",
              "Configure local storage state listeners for persistence",
              "Incorporate animation transition timing and spring motion",
              "Validate all React compiler and build rules"
            ]
          }`
        },
        {
          role: 'user',
          content: `Task: "${contextQuery}"\nAnswers: ${answersStr}`
        }
      ];

      const res = await callLlamaBridge(prompt, []);
      const text = res?.choices?.[0]?.message?.content || '';
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        if (parsed.title) planTitle = parsed.title;
        if (parsed.assumptions) assumptionsMsg = parsed.assumptions;
        if (Array.isArray(parsed.todos)) {
          planTodos = parsed.todos.map((t: string, idx: number) => ({
            id: (idx + 1).toString(),
            text: t,
            status: 'pending' as const
          }));
        }
      }
    } catch (e) {
      console.warn("Planning LLM failed, using fallback", e);
    }

    let targetChatId = currentChatId;
    if (!targetChatId) {
      targetChatId = createNewChat(null, isCoderMode);
    }

    const userMsgText = isSkipped 
      ? `⚡ Clicked **Skip All** in clarifying questions. Proceed with defaults for "${contextQuery || 'the task'}".`
      : `💡 Answered clarifying questions for: **${contextQuery || 'the task'}**.\n${Object.entries(askAiAnswers).map(([k, v]) => `- **${k}**: _${Array.isArray(v) ? v.join(', ') : v}_`).join('\n')}`;

    const userMsgId = Date.now().toString();
    const assistantMsgId = (Date.now() + 10).toString();

    const userMessage: Message = {
      id: userMsgId,
      role: 'user',
      content: userMsgText,
      timestamp: new Date()
    } as any;

    const assistantMessage: Message = {
      id: assistantMsgId,
      role: 'assistant',
      content: `📋 **Plan Created:** ${planTitle}\n\n${assumptionsMsg ? `*Assumptions:* ${assumptionsMsg}\n\n` : ''}Let's align on the sequence of steps to execute. You can edit the steps, add custom notes, or click **Start Building** to begin the automated agent run immediately.`,
      timestamp: new Date(),
      todoPlan: {
        title: planTitle,
        todos: planTodos,
        isConfirmed: false,
        countdown: 10
      }
    } as any;

    setChats(prev => prev.map(chat => {
      if (chat.id === targetChatId) {
        return {
          ...chat,
          messages: [...chat.messages, userMessage, assistantMessage],
          updatedAt: new Date()
        };
      }
      return chat;
    }));

    setInput('');
    setShowAskAiPanel(false);
    setIsAnalyzingAnswers(false);
    setAskAiQuestions([]);
    setAskAiAnswers({});
  };

  const handleStartBuilding = (chatId: string, messageId: string, todos: any[]) => {
    setChats(prev => prev.map(c => {
      if (c.id === chatId) {
        return {
          ...c,
          messages: c.messages.map(m => {
            if (m.id === messageId && m.todoPlan) {
              return {
                ...m,
                todoPlan: {
                  ...m.todoPlan,
                  isConfirmed: true,
                  countdown: 0,
                  todos: m.todoPlan.todos.map((t, idx) => ({
                    ...t,
                    status: idx === 0 ? 'in_progress' : 'pending'
                  }))
                }
              };
            }
            return m;
          })
        };
      }
      return c;
    }));

    setShowTodoPanel(true);
    setTodoCollapsed(false);
    setCoderTodos(todos.map((t, idx) => ({
      id: t.id,
      text: t.text,
      status: idx === 0 ? 'in_progress' : 'pending'
    })));

    let currentStep = 0;
    const executeStep = () => {
      if (currentStep >= todos.length) {
        setChats(prev => prev.map(c => {
          if (c.id === chatId) {
            const hasCelebration = c.messages.some(m => m.content.includes("All tasks completed successfully!"));
            const finishedMessages = [
              ...c.messages.map(m => {
                if (m.id === messageId && m.todoPlan) {
                   return {
                     ...m,
                     todoPlan: {
                       ...m.todoPlan,
                       todos: m.todoPlan.todos.map(t => ({ ...t, status: 'complete' as const }))
                     }
                   };
                }
                return m;
              })
            ];
            if (!hasCelebration) {
              finishedMessages.push({
                id: (Date.now() + 50).toString(),
                role: 'assistant',
                content: `🚀 **All tasks completed successfully!**\n\nI have successfully aligned your preferences, bootstrapped the modules, applied high-contrast custom CSS styling, and compiled the interactive visual component preview. It is now active on the development container and live in your sandbox environment.`,
                timestamp: new Date()
              } as any);
            }
            return {
              ...c,
              messages: finishedMessages
            };
          }
          return c;
        }));

        setCoderTodos(prev => prev.map(t => ({ ...t, status: 'complete' })));
        setIsTyping(false);
        showToast("All task milestones successfully completed! 🚀");
        triggerWorkspaceRefresh();
        return;
      }

      const activeTodo = todos[currentStep];
      showToast(`Executing: ${activeTodo.text}`);

      setTimeout(() => {
        setChats(prev => prev.map(c => {
          if (c.id === chatId) {
            return {
              ...c,
              messages: c.messages.map(m => {
                if (m.id === messageId && m.todoPlan) {
                  return {
                    ...m,
                    todoPlan: {
                      ...m.todoPlan,
                      todos: m.todoPlan.todos.map((t, idx) => {
                        if (idx === currentStep) return { ...t, status: 'complete' as const };
                        if (idx === currentStep + 1) return { ...t, status: 'in_progress' as const };
                        return t;
                      })
                    }
                  };
                }
                return m;
              })
            };
          }
          return c;
        }));

        setCoderTodos(prev => prev.map((t, idx) => {
          if (idx === currentStep) return { ...t, status: 'complete' };
          if (idx === currentStep + 1) return { ...t, status: 'in_progress' };
          return t;
        }));

        currentStep++;
        executeStep();
      }, 2000);
    };

    setTimeout(executeStep, 2050);
  };

  const handleUpdateTodoPlan = useCallback((messageId: string, updatedPlan: any) => {
    setChats(prev => prev.map(chat => {
      const parentChat = chat.messages.some(m => m.id === messageId);
      if (parentChat) {
        return {
          ...chat,
          messages: chat.messages.map(m => m.id === messageId ? { ...m, todoPlan: updatedPlan } : m)
        };
      }
      return chat;
    }));
  }, []);

  const handleStartBuildingBtn = useCallback((messageId: string) => {
    let foundTodos: any[] = [];
    chats.forEach(chat => {
      const msg = chat.messages.find(m => m.id === messageId);
      if (msg && msg.todoPlan) {
        foundTodos = msg.todoPlan.todos;
      }
    });
    
    setChats(prev => prev.map(chat => {
      const hasMsg = chat.messages.some(m => m.id === messageId);
      if (hasMsg) {
        return {
          ...chat,
          messages: chat.messages.map(m => m.id === messageId ? {
            ...m,
            todoPlan: {
               ...m.todoPlan!,
               isConfirmed: true,
               countdown: 0
            }
          } : m)
        };
      }
      return chat;
    }));

    handleStartBuilding(currentChatId || chats[0]?.id, messageId, foundTodos);
  }, [chats, currentChatId]);

  const renderActiveQuestionContent = () => {
    const q = askAiQuestions[currentQuestionIndex];
    if (!q) return null;

    switch (q.type) {
      case 'single_choice':
        return (
          <div className="flex flex-wrap gap-2 w-full max-h-[105px] overflow-y-auto pr-1">
            {q.options?.map(opt => {
              const isSelected = askAiAnswers[q.id] === opt;
              return (
                <button
                  key={opt}
                  onClick={() => handleSelectAnswer(q.id, opt, true)}
                  className={`px-4 py-2 text-xs font-semibold rounded-2xl border transition-all duration-150 cursor-pointer ${
                    isSelected
                      ? 'bg-orange-500/15 border-orange-500/50 text-orange-400 font-bold shadow-xs'
                      : 'bg-zinc-800/60 hover:bg-zinc-800 border-zinc-700/50 hover:border-zinc-500 text-zinc-300'
                  }`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        );

      case 'multi_choice': {
        const selectedList = (askAiAnswers[q.id] as string[]) || [];
        const toggleSelection = (opt: string) => {
          let updated;
          if (selectedList.includes(opt)) {
            updated = selectedList.filter(o => o !== opt);
          } else {
            updated = [...selectedList, opt];
          }
          handleSelectAnswer(q.id, updated, false);
        };

        return (
          <div className="flex flex-col gap-3.5 w-full select-none">
            <div className="flex flex-wrap gap-2 max-h-[75px] overflow-y-auto pr-1">
              {q.options?.map(opt => {
                const isSelected = selectedList.includes(opt);
                return (
                  <button
                    key={opt}
                    onClick={() => toggleSelection(opt)}
                    className={`px-3.5 py-1.5 text-xs font-semibold rounded-2xl border transition-all duration-150 cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-orange-500/15 border-orange-500/50 text-orange-400 font-bold'
                        : 'bg-zinc-800/60 hover:bg-zinc-800 border-zinc-700/50 hover:border-zinc-500 text-zinc-300'
                    }`}
                  >
                    <div className={`w-3 h-3 rounded-md border flex items-center justify-center ${
                      isSelected ? 'border-orange-500 bg-orange-500/20' : 'border-zinc-600'
                    }`}>
                      {isSelected && <Check size={8} strokeWidth={4} className="text-orange-400" />}
                    </div>
                    <span>{opt}</span>
                  </button>
                );
              })}
            </div>
            <div className="flex justify-end select-none">
              <button
                disabled={selectedList.length === 0}
                onClick={handleNextQuestion}
                className="px-4 py-1.5 text-[11px] font-black tracking-wider uppercase bg-orange-500 hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                <span>Continue</span>
                <ChevronRight size={12} strokeWidth={3} />
              </button>
            </div>
          </div>
        );
      }

      case 'scale': {
        const rating = (askAiAnswers[q.id] as number) || 0;
        return (
          <div className="flex flex-col items-center gap-2.5 w-full select-none">
            <div className="flex items-center justify-between w-full max-w-sm px-1.5 text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono select-none animate-pulse">
              <span>Minimal Motion</span>
              <span>Ultra Rich Flow</span>
            </div>
            <div className="flex items-center gap-2 w-full max-w-md justify-between select-none">
              {[1, 2, 3, 4, 5].map(val => {
                const isSelected = rating === val;
                return (
                  <button
                    key={val}
                    onClick={() => handleSelectAnswer(q.id, val, true)}
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center border font-mono text-sm font-bold transition-all duration-150 cursor-pointer ${
                      isSelected
                        ? 'bg-orange-500 border-orange-400 text-white shadow-[0_0_12px_rgba(249,115,22,0.45)] scale-110'
                        : 'bg-zinc-800/80 hover:bg-zinc-700 hover:border-zinc-500 border-zinc-700/60 text-zinc-300'
                    }`}
                  >
                    {val}
                  </button>
                );
              })}
            </div>
          </div>
        );
      }

      case 'text_input':
        return (
          <div className="flex flex-col gap-3.5 w-full select-none">
            <div className="relative flex items-center w-full">
              <input
                type="text"
                value={textInputAnswer}
                onChange={(e) => setTextInputAnswer(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && textInputAnswer.trim()) {
                    handleSelectAnswer(q.id, textInputAnswer.trim(), true);
                    setTextInputAnswer('');
                  }
                }}
                placeholder="Type your custom answer/preferences..."
                className="w-full h-10 px-4 bg-zinc-850 border border-zinc-750 focus:border-orange-500/50 rounded-2xl text-xs text-zinc-150 outline-none placeholder-zinc-550 transition-all select-text"
              />
              {textInputAnswer.trim() && (
                <button
                  onClick={() => {
                    handleSelectAnswer(q.id, textInputAnswer.trim(), true);
                    setTextInputAnswer('');
                  }}
                  className="absolute right-2 p-1.5 bg-orange-500 text-white hover:bg-orange-600 rounded-xl transition-all cursor-pointer flex items-center justify-center shadow-lg"
                >
                  <ArrowUp size={14} strokeWidth={3} />
                </button>
              )}
            </div>
            <div className="flex justify-between items-center select-none">
              <span className="text-[10px] text-zinc-500 italic ml-1">Or press ENTER to submit</span>
              <button
                disabled={!textInputAnswer.trim()}
                onClick={() => {
                  handleSelectAnswer(q.id, textInputAnswer.trim(), true);
                  setTextInputAnswer('');
                }}
                className="px-4 py-1.5 text-[11px] font-black tracking-wider uppercase bg-orange-500 hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                <span>Continue</span>
                <ChevronRight size={12} strokeWidth={3} />
              </button>
            </div>
          </div>
        );

      case 'confirm':
        return (
          <div className="flex items-center gap-4 w-full max-w-md mx-auto select-none">
            <button
              onClick={() => handleSelectAnswer(q.id, 'Yes', true)}
              className="flex-1 py-2.5 text-xs font-bold bg-orange-500/10 border border-orange-500/25 hover:bg-orange-500 hover:text-white hover:border-orange-400 text-orange-400 rounded-2xl transition-all shadow-sm cursor-pointer"
            >
              Understand & Accept
            </button>
            <button
              onClick={() => handleSelectAnswer(q.id, 'No', true)}
              className="flex-1 py-2.5 text-xs font-bold bg-zinc-800 border border-zinc-700/80 hover:bg-zinc-750 hover:border-zinc-550 text-zinc-300 rounded-2xl transition-all cursor-pointer"
            >
              Skip option
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  const currentChat = chats.find(c => c.id === currentChatId);
  const messages = currentChat?.messages || [];

  const createNewChat = (projId?: string | null, isCoder?: boolean) => {
    const pId = projId !== undefined ? projId : activeProjectId;
    const newChat: Chat = {
      id: Date.now().toString(),
      title: 'New chat',
      messages: [],
      updatedAt: new Date(),
      projectId: pId || undefined,
      isCoderMode: isCoder !== undefined ? isCoder : isCoderMode,
    } as any;
    setChats(prev => [newChat, ...prev]);
    setCurrentChatId(newChat.id);
    return newChat.id;
  };

  const handleClearChat = () => {
    if (!currentChatId) return;
    setChats(prev => prev.map(chat => {
      if (chat.id === currentChatId) {
        return {
          ...chat,
          messages: [],
          updatedAt: new Date()
        };
      }
      return chat;
    }));
    showToast("Chat cleared successfully!");
  };

  const handleSend = async (contentOverride?: string) => {
    if (isTyping) return;
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const signal = controller.signal;

    let content = contentOverride || input.trim();
    if (!content && attachedFiles.length === 0) return;

    if (content.trim().toLowerCase() === '/clear') {
      handleClearChat();
      setInput('');
      return;
    }

    if (content.trim().toLowerCase() === '/new') {
      createNewChat(null, isCoderMode);
      setInput('');
      return;
    }

    if (content.toLowerCase().startsWith('/coder')) {
      const trimCmd = content.trim().toLowerCase();
      let newState = true;
      if (trimCmd === '/coder off') {
        newState = false;
      }
      
      setIsCoderMode(newState);
      setIsCoderWorkspacePanelOpen(newState);
      if (newState) {
        setIsSidebarOpen(false);
      }
      
      let targetChatId = currentChatId;
      if (!targetChatId) {
        const newId = Date.now().toString();
        const newChat: Chat = {
          id: newId,
          title: "Coder Session",
          messages: [],
          updatedAt: new Date(),
          isCoderMode: newState
        } as any;
        setChats(prev => [newChat, ...prev]);
        setCurrentChatId(newId);
        targetChatId = newId;
      }
      
      setChats(prev => prev.map(chat => {
        if (chat.id === targetChatId) {
          const sysMsgId = (Date.now() + 1).toString();
          return {
            ...chat,
            isCoderMode: newState,
            messages: [
              ...chat.messages,
              {
                id: Date.now().toString(),
                role: 'user',
                content: content,
                timestamp: new Date()
              },
              {
                id: sysMsgId,
                role: 'assistant',
                content: newState 
                  ? "⚡ **Coder Mode Activated!**\n\nI am now running as an autonomous Software Engineering Agent. I am connected directly to your active project workspace directory and am ready to write, read, edit, and list files in real-time. Give me instructions on what to build!"
                  : "🚫 **Coder Mode Deactivated.**\n\nI will now answer your questions as a standard digital assistant without modifying the workspace.",
                timestamp: new Date()
              }
            ],
            updatedAt: new Date()
          };
        }
        return chat;
      }));
      
      setInput('');
      triggerWorkspaceRefresh();
      return;
    }

    if (activeSkills.length > 0) {
      const skillPrompts = activeSkills.map(id => SKILLS.find(s => s.id === id)?.prompt).filter(Boolean);
      content = skillPrompts.join('') + content;
    }

    let chatId = currentChatId;
    if (!chatId) {
      chatId = createNewChat(null, isCoderMode);
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: content,
      timestamp: new Date(),
      elementAttachments: [...localElementAttachments]
    } as any;

    setAttachedFiles([]);
    setLocalElementAttachments([]);

    setChats(prev => prev.map(chat => {
      if (chat.id === chatId) {
        const newMessages = [...chat.messages, userMessage];
        return {
          ...chat,
          messages: newMessages,
          title: chat.messages.length === 0 ? content.slice(0, 30) + (content.length > 30 ? '...' : '') : chat.title,
          updatedAt: new Date(),
        };
      }
      return chat;
    }));

    setInput('');
    setIsTyping(true);

    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }

    const isSlash = content.startsWith('/');
    if (isSlash || isCoderMode) {
      setIsGeneratingTodos(true);
      setShowTodoPanel(true);
      
      const firstSpaceIdx = content.indexOf(' ');
      const cmdName = firstSpaceIdx !== -1 ? content.substring(1, firstSpaceIdx).toLowerCase() : content.substring(1).toLowerCase();
      const cmdQuery = firstSpaceIdx !== -1 ? content.substring(firstSpaceIdx + 1).trim() : '';

      setActiveCommandType(cmdName);
      setActiveCommandQuery(cmdQuery || null);

      if (cmdName === 'goal') {
        setCoderTodos([
          { id: 'goal-1', text: `Analyzing task goals for: "${cmdQuery || 'objective'}"`, status: 'in_progress' },
          { id: 'goal-2', text: 'Scaffolding requirements & database blueprint schemas', status: 'pending' },
          { id: 'goal-3', text: 'Assembling components and validating API payloads', status: 'pending' },
          { id: 'goal-4', text: 'Running local test executions and structural verification', status: 'pending' },
          { id: 'goal-5', text: 'Compiling final build output for interactive preview', status: 'pending' }
        ]);
        setIsGeneratingTodos(false);
      } else if (cmdName === 'browser') {
        setCoderTodos([
          { id: 'browser-1', text: `Booting sandboxed browser module for: "${cmdQuery || 'target host'}"`, status: 'in_progress' },
          { id: 'browser-2', text: 'Parsing viewport elements, stylesheets, and meta nodes', status: 'pending' },
          { id: 'browser-3', text: 'Simulating interactive pointer clicks and network requests', status: 'pending' },
          { id: 'browser-4', text: 'Capturing High-Definition page screenshots and asset state', status: 'pending' },
          { id: 'browser-5', text: 'Outputting full diagnostic site audits and log reports', status: 'pending' }
        ]);
        setIsGeneratingTodos(false);
      } else if (cmdName === 'schedule') {
        setCoderTodos([
          { id: 'schedule-1', text: `Registering recurring task rules: "${cmdQuery || 'automation schedule'}"`, status: 'in_progress' },
          { id: 'schedule-2', text: 'Binding execution cron listeners & persistent intervals', status: 'pending' },
          { id: 'schedule-3', text: 'Syncing backend job dispatch triggers and logs database', status: 'pending' },
          { id: 'schedule-4', text: 'Running first-pass scheduler dry-runs', status: 'pending' }
        ]);
        setIsGeneratingTodos(false);
      } else if (cmdName === 'grill-me') {
        setCoderTodos([
          { id: 'grill-1', text: `Reviewing initial alignment details for: "${cmdQuery || 'feature design'}"`, status: 'in_progress' },
          { id: 'grill-2', text: 'Formulating diagnostic clarification interview questions', status: 'pending' },
          { id: 'grill-3', text: 'Rendering dynamic user feedback input prompts', status: 'pending' },
          { id: 'grill-4', text: 'Realigning architecture blueprint based on user responses', status: 'pending' }
        ]);
        setIsGeneratingTodos(false);
      } else if (isCoderMode || cmdName === 'coder') {
        try {
          const planPromptMessage = [
            {
              role: 'system',
              content: 'You are an expert technical planner. Formulate a targeted, structured task checklist of 3-5 concrete engineering steps to accomplish the user\'s workspace request. Focus on specifying relevant files to check, create, edit, or build. Respond ONLY with a clean JSON object containing a "todos" array with items having "id" (string starting at "1"), "text" (the specific task description), and "status" (always "pending"). Do not explain. Do not wrap in markdown tags. Example: {"todos": [{"id": "1", "text": "Analyze existing components in src/components", "status": "pending"}]}.'
            },
            {
              role: 'user',
              content: `User query: "${cmdQuery || content}"`
            }
          ];
          const planRes = await callLlamaBridge(planPromptMessage, [], signal);
          const textResponse = planRes?.choices?.[0]?.message?.content || '';
          const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (Array.isArray(parsed.todos) && parsed.todos.length > 0) {
              const mapped = parsed.todos.map((t: any, idx: number) => ({
                id: t.id || (idx + 1).toString(),
                text: t.text || 'Engineering task',
                status: idx === 0 ? 'in_progress' : 'pending'
              }));
              setCoderTodos(mapped);
            } else {
              throw new Error("Invalid structure");
            }
          } else {
            throw new Error("No JSON found");
          }
        } catch (err) {
          console.warn("Failed to generate dynamic todos via AI:", err);
          setCoderTodos([
            { id: 'fb-1', text: 'Analyze file layout and project components', status: 'in_progress' },
            { id: 'fb-2', text: `Implement build changes matching query: ${(cmdQuery || content).substring(0, 35)}${(cmdQuery || content).length > 35 ? '...' : ''}`, status: 'pending' },
            { id: 'fb-3', text: 'Verify application and render interactive hot-fix', status: 'pending' }
          ]);
        } finally {
          setIsGeneratingTodos(false);
        }
      } else {
        setCoderTodos([
          { id: 'fb-1', text: `Formulating workspace task: "/${cmdName} ${cmdQuery}"`, status: 'in_progress' },
          { id: 'fb-2', text: `Processing task strategies with ${selectedModel}`, status: 'pending' },
          { id: 'fb-3', text: 'Executing response flow actions', status: 'pending' }
        ]);
        setIsGeneratingTodos(false);
      }
    } else {
      setActiveCommandType(null);
      setActiveCommandQuery(null);
    }

    const thinkingId = (Date.now() + 1).toString();
    const thinkingMessage: Message = {
      id: thinkingId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      thinking: isWebSearchEnabled ? 'Searching the web...' : 'Thinking...',
      isSearching: isWebSearchEnabled,
      isStreaming: true,
      toolCalls: [
        {
          id: 'thinking-node',
          label: isWebSearchEnabled ? 'Searching the web...' : `${persona.name} — thinking...`,
          type: 'ai',
          status: 'active',
          icon: isWebSearchEnabled ? <Globe size={14} /> : <Sparkles size={14} />
        }
      ]
    };

    setTypingMessageId(thinkingId);
    setChats(prev => prev.map(chat => {
      if (chat.id === chatId) {
        return {
          ...chat,
          messages: [...chat.messages, thinkingMessage],
          updatedAt: new Date(),
        };
      }
      return chat;
    }));

    let searchResults: any[] = [];
    let searchProvider = "";

    if (isWebSearchEnabled) {
      try {
        setChats(prev => prev.map(chat => {
          if (chat.id !== chatId) return chat;
          return {
            ...chat,
            messages: chat.messages.map(m => m.id === thinkingId
              ? { ...m, thinking: 'Searching the web...', isSearching: true }
              : m)
          };
        }));

        const hasTavilyKey = tavilyApiKey && tavilyApiKey.trim().length > 0;
        const hasSerpKey = serpApiKey && serpApiKey.trim().length > 0;
        
        let providerName = 'DuckDuckGo';
        if (searchProvider === 'tavily' && hasTavilyKey) {
          providerName = 'Tavily';
        } else if (searchProvider === 'serpapi' && hasSerpKey) {
          providerName = 'SerpApi';
        } else if (hasTavilyKey) {
          providerName = 'Tavily';
        } else if (hasSerpKey) {
          providerName = 'SerpApi';
        }

        const searchResp = await fetch(`/api/search`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            query: content, 
            tavilyKey: tavilyApiKey,
            serpKey: serpApiKey,
            provider: searchProvider
          }),
          signal
        });
        
        if (searchResp.ok) {
          const searchData = await searchResp.json();
          searchResults = searchData.results || [];
          searchProvider = searchData.provider || "Search";
        } else {
          console.warn('Backend search failed, no further fallback available.');
        }

        if (searchResults.length > 0) {
          setChats(prev => prev.map(chat => {
            if (chat.id === chatId) {
              return {
                ...chat,
                messages: chat.messages.map(m => m.id === thinkingId ? { 
                  ...m, 
                  isSearching: true, 
                  thinking: `Synthesizing info from ${searchProvider}...`,
                  sources: searchResults.slice(0, 10).map(r => ({ title: r.title, url: r.url, snippet: r.snippet })) 
                } : m),
              };
            }
            return chat;
          }));
        } else {
          console.warn("Search returned no results from any provider.");
        }
      } catch (err) {
        console.error("Search step failed:", err);
      }
    }

    try {
      const chatContext = chats.find(c => c.id === chatId)?.messages || [];
      
      const activeTools = buildActiveTools();
      if (isCoderMode) {
        activeTools.push(
          {
            type: 'function',
            function: {
              name: 'list_coder_files',
              description: 'List all files and subfolders in the active project directory recursively to understand the existing codebase.',
              parameters: { type: 'object', properties: {}, required: [] }
            }
          },
          {
            type: 'function',
            function: {
              name: 'create_coder_file',
              description: 'Create a new file with the specified relative filePath in the project root directory.',
              parameters: {
                type: 'object',
                properties: {
                  filePath: { type: 'string', description: 'Relative path of the file from the project root (e.g., "src/components/MyNewComp.tsx", "js/app.js").' },
                  content: { type: 'string', description: 'Complete text contents to write into the file.' }
                },
                required: ['filePath', 'content']
              }
            }
          },
          {
            type: 'function',
            function: {
              name: 'read_coder_file',
              description: 'Read the contents of an existing file in the project directory.',
              parameters: {
                type: 'object',
                properties: {
                  filePath: { type: 'string', description: 'Relative path of the file within the project folder to read.' }
                },
                required: ['filePath']
              }
            }
          },
          {
            type: 'function',
            function: {
              name: 'edit_coder_file',
              description: 'Edit or overwrite an existing file in the project directory.',
              parameters: {
                type: 'object',
                properties: {
                  filePath: { type: 'string', description: 'Relative path of the target file to edit.' },
                  content: { type: 'string', description: 'The complete new code content to be written.' }
                },
                required: ['filePath', 'content']
              }
            }
          },
          {
            type: 'function',
            function: {
              name: 'delete_coder_file',
              description: 'Delete a file inside the project directory.',
              parameters: {
                type: 'object',
                properties: {
                  filePath: { type: 'string', description: 'Relative path of the file to delete.' }
                },
                required: ['filePath']
              }
            }
          },
          {
            type: 'function',
            function: {
              name: 'ask',
              description: 'Ask the user 2 to 6 targeted clarifying questions to make sure the implementation aligns with their needs. Call this when you want to clarify the user requirements, styles, features, or design choices.',
              parameters: {
                type: 'object',
                properties: {
                  questions: {
                    type: 'array',
                    description: 'The list of clarifying questions to ask the user.',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string', description: 'Unique identifier for this question (e.g. "theme", "database", etc.).' },
                        question: { type: 'string', description: 'The actual question text to display.' },
                        type: { type: 'string', enum: ['single_choice', 'multi_choice', 'text_input', 'confirm'], description: 'Type of input expected from the user.' },
                        options: { type: 'array', items: { type: 'string' }, description: 'Options if type is single_choice or multi_choice.' },
                        purpose: { type: 'string', description: 'Brief explanation of why this question is being asked.' }
                      },
                      required: ['id', 'question', 'type']
                    }
                  }
                },
                required: ['questions']
              }
            }
          }
        );
      }

      let systemPrompt = `You are ${persona.name}. Character description/Role: ${persona.role}. ${persona.role ? '' : 'Address the user as a helpful digital assistant.'} You have access to 4 interactive visual laboratories: Physics Lab (for graphing and forces), Chemistry Lab (for compounds and reactions), Math Lab (for trigonometric and fractal curves), and Biology Lab (for predator-prey dynamics and DNA pair sequencing).`;

      // Active mode instructions
      if (activeAssistantMode === 'builder') {
        systemPrompt += `\n\n[ASSISTANT MODE: BUILDER - AUTONOMOUS CODING]
You are operating in BUILDER mode. Your main objective is to implement new application layers, create fresh code resources, write logical components, clean styling patterns, and autonomously build out features requested by the user. Ensure your output code has perfect syntax, imports all required icons from 'lucide-react', and is fully modular.`;
      } else if (activeAssistantMode === 'planner') {
        systemPrompt += `\n\n[ASSISTANT MODE: PLANNER - BLUEPRINTING & ARCHITECTURE]
You are operating in PLANNER mode. Before writing any massive code blocks, your focus is to create high-level engineering blueprints, break down complex task lists, plan files architecture, and outline step-by-step implementation sequences. Guide the user on how the system should be structured before execution.`;
      } else if (activeAssistantMode === 'debugger') {
        systemPrompt += `\n\n[ASSISTANT MODE: DEBUGGER - INQUIRY & TROUBLESHOOTING]
You are operating in DEBUGGER mode. Your focus is to trace errors, debug syntax issues, inspect performance anomalies, explain complex code paths, and repair bugs reported by the user. Do not delete features; provide clean, precise hot-fixes and explain root causes clearly.`;
      }

      if (activeTools.length > 0) {
        systemPrompt += `\n\n[CRITICAL DIRECTIVE: ACTIVE TOOLS ENABLED]
You have the following live tool calling APIs connected and active: ${activeTools.map(t => t.function.name).join(', ')}.
You MUST proactively call the appropriate tools whenever they can provide grounding, web searches, scraper details, or specific Wikipedia insights to construct your answer.
- Always call 'web_scrape' if the user specifies a URL or asks to extract/fetch content from a web link.
- Always call Wikipedia tools ('wiki_search', 'wiki_get_page', 'wiki_get_summary', etc.) for any query that references Wikipedia, general metadata search, or historical/factual/scientific lookup.
Never guess or pretend you do not have functions; execute them immediately and explain what details you retrieved.`;
      }

      if (isCoderMode) {
        systemPrompt += `\n\n[CODER MODE IS ACTIVE]
You are a highly capable, autonomous, and professional software engineering agent running inside the root directory of our workspace.
When the user asks you to build page(s), applications, interfaces, features, or modify codes:
1. You MUST make real modifications in the file system using the tools provided: 'create_coder_file', 'edit_coder_file', 'read_coder_file', 'list_coder_files', and 'delete_coder_file'. All file paths are relative to the project root directory!
2. Do NOT just output a text response with code blocks of code changes. You MUST actually execute the file-system tools to create or edit the actual files in real-time.
3. If a file already exists, always use 'read_coder_file' first to understand its current content, then make edits with 'edit_coder_file'.
4. Do NOT attempt to run terminal or environment commands - you modify files and the user's workspace previews them in real-time.
5. In your final text response, give a clear scannable summary in markdown of what files and folders you created/changed, and guide the user on how they can preview their app or test its functionality. Maintain standard developer professionalism.`;
      }

      // FIX: Inject search context into systemPrompt BEFORE building apiMessages,
      // so the AI actually receives the web search results.
      if (searchResults.length > 0) {
        const contextString = searchResults.slice(0, 8).map((r, i) => `[${i+1}] ${r.title}: ${r.snippet} (URL: ${r.url})`).join('\n\n');
        systemPrompt += `\n\nWeb Search Results:\n${contextString}\n\nPlease use the above search results to provide a grounded, up-to-date response. Cite your sources using [number] notation when appropriate. If the results include an instant answer, prioritize that information.`;
      }

      const apiMessages = [
        { role: 'system', content: systemPrompt },
        ...([...chatContext, userMessage]
          .filter(m => (m.content && m.content.trim().length > 0) || (m.elementAttachments && m.elementAttachments.length > 0))
          .map(m => {
            let text = m.content || '';
            if (m.elementAttachments && m.elementAttachments.length > 0) {
              text += `\n\n[INSPECTED CODE ATTACHMENT FOR CONTEXT]:`;
              m.elementAttachments.forEach((att: any) => {
                text += `\n- File Name: ${att.fileName}\n- File Path: ${att.filePath}\n- Code Subsection:\n\`\`\`\n${att.specificCode}\n\`\`\`\n- Functional Role: ${att.elementWork}\n`;
              });
            }
            return {
              role: m.role,
              content: text
            };
          }))
      ];
      
      // Direct call to Llama Bridge
      let rawResponse: any = await callLlamaBridge(apiMessages, activeTools, signal);

      const data = rawResponse;
      let choice = data.choices?.[0]?.message;
      let toolCallsRaw = choice?.tool_calls;
      const responseImages = data.images || [];

      const toolCallNodes: ToolCallNode[] = [];

      const hasWebScrapeCall = toolCallsRaw && toolCallsRaw.some((tc: any) => tc.function?.name === 'web_scrape');
      if (isCoderMode || hasWebScrapeCall) {
        let loopCount = 0;
        const maxLoops = 10;
        while (choice?.tool_calls && choice.tool_calls.length > 0 && loopCount < maxLoops) {
          loopCount++;
          let shouldStopAfterAsk = false;
          
          // Coordinate status transitions based on active tools and loopCount
          const activeToolNames = choice.tool_calls.map((t: any) => t.function?.name || '');
          if (activeToolNames.some((n: string) => n.includes('read') || n.includes('list'))) {
            setCoderTodos(prev => {
              if (prev.length > 0) {
                return prev.map((item, idx) => {
                  if (idx === 0) return { ...item, status: 'complete' };
                  if (idx === 1 && item.status === 'pending') return { ...item, status: 'in_progress' };
                  return item;
                });
              }
              return prev;
            });
          }
          if (activeToolNames.some((n: string) => n.includes('edit') || n.includes('create') || n.includes('delete'))) {
            setCoderTodos(prev => {
              if (prev.length > 1) {
                return prev.map((item, idx) => {
                  if (idx <= 1) return { ...item, status: 'complete' };
                  if (idx === 2 && item.status === 'pending') return { ...item, status: 'in_progress' };
                  return item;
                });
              }
              return prev;
            });
          }
          if (loopCount >= 2) {
            setCoderTodos(prev => {
              if (prev.length > 2) {
                return prev.map((item, idx) => {
                  if (idx <= 2) return { ...item, status: 'complete' };
                  if (idx === 3 && item.status === 'pending') return { ...item, status: 'in_progress' };
                  return item;
                });
              }
              return prev;
            });
          }

          const currentCallNodes: ToolCallNode[] = [];
          
          for (const [idx, tc] of choice.tool_calls.entries()) {
            const fn = tc.function || {};
            const name = fn.name || 'unknown';
            const args = fn.arguments ? (() => { try { return JSON.parse(fn.arguments); } catch { return {}; } })() : {};
            
            const isScrape = name === 'web_scrape';
            const node: ToolCallNode = {
              id: tc.id || `tc-${Date.now()}-${loopCount}-${idx}`,
              type: 'tool',
              label: isScrape ? `Web Scraper (${args.url})` : `${name} ${args.filePath ? `(${args.filePath})` : ''}`,
              status: 'active',
              toolName: name,
              argsCount: typeof args === 'object' && args ? Object.keys(args).length : 0,
              icon: isScrape ? <Globe size={14} /> :
                    name.includes('read') || name.includes('file') ? <FileText size={14} /> :
                    name.includes('edit') || name.includes('create') ? <PenTool size={14} /> :
                    <Sparkles size={14} />,
              filePath: args.filePath || '',
              addedCount: name.includes('create') ? (args.content ? args.content.split('\n').length : 15) : (name.includes('edit') ? 45 : undefined),
              removedCount: name.includes('create') ? 0 : (name.includes('edit') ? 8 : undefined)
            };
            currentCallNodes.push(node);
            toolCallNodes.push(node);
          }

          setChats(prev => prev.map(chat => {
            if (chat.id === chatId) {
              return {
                ...chat,
                messages: chat.messages.map(m => m.id === thinkingId ? {
                  ...m,
                  toolCalls: [...toolCallNodes]
                } : m)
              };
            }
            return chat;
          }));

          const toolResultMessages = [];
          for (const tc of choice.tool_calls) {
            const fn = tc.function || {};
            const name = fn.name || 'unknown';
            const args = fn.arguments ? (() => { try { return JSON.parse(fn.arguments); } catch { return {}; } })() : {};
            let resultValue: any = null;

            try {
              if (!isCoderMode && ['list_coder_files', 'create_coder_file', 'edit_coder_file', 'read_coder_file', 'delete_coder_file'].includes(name)) {
                throw new Error("Coder tools are disabled when Coder Mode is inactive (Chat Mode).");
              }
              if (name === 'list_coder_files') {
                const listRes = await fetch('/api/fs/list', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ folderPath: '.' }),
                  signal
                });
                resultValue = await listRes.json();
              } else if (name === 'create_coder_file' || name === 'edit_coder_file') {
                const cleanedPath = args.filePath.replace(/^\/+/, '');
                const fullPath = `./${cleanedPath}`;
                
                let oldContent = '';
                try {
                  const readOld = await fetch('/api/fs/read', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ filePath: fullPath }),
                    signal
                  });
                  if (readOld.ok) {
                    const oldData = await readOld.json();
                    oldContent = oldData.content || '';
                  }
                } catch (e) {
                  // File might not exist yet
                }

                if (cleanedPath.includes('/')) {
                  const folderPart = cleanedPath.substring(0, cleanedPath.lastIndexOf('/'));
                  await fetch('/api/fs/create', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ filePath: `./${folderPart}`, isDirectory: true }),
                    signal
                  });
                }
                const writeRes = await fetch('/api/fs/write', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ filePath: fullPath, content: args.content }),
                  signal
                });
                resultValue = await writeRes.json();
                
                const newContent = args.content || '';
                const diffValues = computeLineDiff(oldContent, newContent);
                
                const matchingNode = toolCallNodes.find(n => n.id === tc.id);
                if (matchingNode) {
                  matchingNode.addedCount = diffValues.added;
                  matchingNode.removedCount = diffValues.removed;
                }

                showToast(`Wrote ${cleanedPath}`);
              } else if (name === 'read_coder_file') {
                const cleanedPath = args.filePath.replace(/^\/+/, '');
                const fullPath = `./${cleanedPath}`;
                const readRes = await fetch('/api/fs/read', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ filePath: fullPath }),
                  signal
                });
                resultValue = await readRes.json();
                showToast(`Read ${cleanedPath}`);
              } else if (name === 'delete_coder_file') {
                const cleanedPath = args.filePath.replace(/^\/+/, '');
                const fullPath = `./${cleanedPath}`;
                const delRes = await fetch('/api/fs/delete', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ filePath: fullPath }),
                  signal
                });
                resultValue = await delRes.json();
                showToast(`Deleted ${cleanedPath}`);
              } else if (name === 'ask') {
                const qs = args.questions || [];
                setAskAiQuestions(qs);
                setCurrentQuestionIndex(0);
                setAskAiAnswers({});
                setShowAskAiPanel(true);
                shouldStopAfterAsk = true;
                resultValue = { status: "success", message: "Successfully presented clarify questions to the user. Generation has paused for user inputs." };
                showToast("AI is asking you clarifying questions!");
              } else if (name === 'web_scrape') {
                const targetUrl = args.url;
                if (!targetUrl) {
                  throw new Error("Missing required 'url' parameter for web_scrape.");
                }

                // Push to active scraping jobs set
                setActiveScrapingJobs(prev => {
                  const cloned = new Set(prev);
                  cloned.add(tc.id);
                  return cloned;
                });

                showToast(`Scraping webpage: ${targetUrl.substring(0, 30)}...`);

                // Perform proxy-mediated scraping
                const scrapeResult = await scrapeUrl({
                  url: targetUrl,
                  selectors: args.selectors,
                  usePuppeteer: args.usePuppeteer,
                  extractLinks: args.extractLinks,
                  extractTables: args.extractTables,
                  outputFormat: args.outputFormat
                });

                // Update scraping results Map state
                setScrapingResults(prev => {
                  const cloned = new Map(prev);
                  cloned.set(tc.id, scrapeResult);
                  return cloned;
                });

                // Evict from active scraping jobs set
                setActiveScrapingJobs(prev => {
                  const cloned = new Set(prev);
                  cloned.delete(tc.id);
                  return cloned;
                });

                if (scrapeResult.error) {
                  resultValue = { error: scrapeResult.error };
                  showToast(`Scrape failed: ${scrapeResult.error.substring(0, 30)}...`);
                } else {
                  resultValue = {
                    title: scrapeResult.title,
                    statusCode: scrapeResult.statusCode,
                    scrapedAt: scrapeResult.scrapedAt,
                    dataExcerpt: scrapeResult.data,
                    linksFound: scrapeResult.links?.length || 0,
                    markdownExcerpt: scrapeResult.rawText ? (scrapeResult.rawText.substring(0, 3000) + '... [Truncated for prompt boundaries]') : 'No page text extracted.'
                  };
                  showToast(`Successfully scraped "${scrapeResult.title || 'Page'}"`);
                }
              } else if (name === 'wiki_search') {
                const { query, limit = 10, language = 'en' } = args;
                showToast(`Searching Wikipedia for: ${query}`);
                const searchResults = await wikiSearch(query, limit, language);
                
                // Store results
                setWikiResults(prev => {
                  const cloned = new Map(prev);
                  cloned.set(tc.id, { wikiType: 'search', data: { results: searchResults } });
                  return cloned;
                });

                resultValue = {
                  resultsCount: searchResults.length,
                  resultsBrief: searchResults.slice(0, 3).map(r => ({ pageId: r.pageId, title: r.title, url: r.url })),
                  payload: searchResults
                };
                
                const currentN = toolCallNodes.find(n => n.id === tc.id);
                if (currentN) {
                  currentN.resultSummary = `Found ${searchResults.length} indexed pages matching "${query}"`;
                }
              } else if (name === 'wiki_get_page') {
                const { pageId, language = 'en' } = args;
                showToast(`Fetching full page ID: ${pageId}`);
                const pageResult = await wikiGetPage(Number(pageId), language);

                setWikiResults(prev => {
                  const cloned = new Map(prev);
                  cloned.set(tc.id, { wikiType: 'page', data: pageResult });
                  return cloned;
                });

                resultValue = {
                  title: pageResult.title,
                  wordCount: pageResult.wordCount,
                  sectionsCount: pageResult.sections?.length || 0,
                  introExcerpt: pageResult.intro?.substring(0, 500),
                  payload: pageResult
                };

                const currentN = toolCallNodes.find(n => n.id === tc.id);
                if (currentN) {
                  currentN.resultSummary = `"${pageResult.title}" fully loaded — ${pageResult.sections?.length || 0} sections, ${pageResult.wordCount} words`;
                }
              } else if (name === 'wiki_get_summary') {
                const { pageId, language = 'en' } = args;
                showToast(`Getting summary for ID: ${pageId}`);
                const summaryResult = await wikiGetSummary(Number(pageId), language);

                setWikiResults(prev => {
                  const cloned = new Map(prev);
                  cloned.set(tc.id, { wikiType: 'summary', data: summaryResult });
                  return cloned;
                });

                resultValue = {
                  title: summaryResult.title,
                  extract: summaryResult.extract,
                  url: summaryResult.url,
                  payload: summaryResult
                };

                const currentN = toolCallNodes.find(n => n.id === tc.id);
                if (currentN) {
                  currentN.resultSummary = `Summary for "${summaryResult.title}" parsed: "${summaryResult.extract.substring(0, 100)}..."`;
                }
              } else if (name === 'wiki_get_sections') {
                const { pageId, language = 'en' } = args;
                showToast(`Reading page ID: ${pageId}`);
                const sectionsList = await wikiGetSections(Number(pageId), language);

                setWikiResults(prev => {
                  const cloned = new Map(prev);
                  cloned.set(tc.id, { wikiType: 'page', data: { title: `Page ID ${pageId} sections`, url: `https://${language}.wikipedia.org/?curid=${pageId}`, sections: sectionsList } });
                  return cloned;
                });

                resultValue = {
                  sectionsCount: sectionsList.length,
                  list: sectionsList.map(s => ({ index: s.index, title: s.title, level: s.level })),
                  payload: sectionsList
                };

                const currentN = toolCallNodes.find(n => n.id === tc.id);
                if (currentN) {
                  currentN.resultSummary = `Header index parsed: ${sectionsList.length} sections found`;
                }
              } else if (name === 'wiki_get_categories') {
                const { pageId, language = 'en' } = args;
                showToast(`Reading target indices...`);
                const catsList = await wikiGetCategories(Number(pageId), language);

                setWikiResults(prev => {
                  const cloned = new Map(prev);
                  cloned.set(tc.id, { wikiType: 'page', data: { title: `Categories for page ${pageId}`, url: `https://${language}.wikipedia.org/?curid=${pageId}`, categories: catsList.map(c => c.name) } });
                  return cloned;
                });

                resultValue = {
                  categoriesCount: catsList.length,
                  list: catsList.map(c => c.name),
                  payload: catsList
                };

                const currentN = toolCallNodes.find(n => n.id === tc.id);
                if (currentN) {
                  currentN.resultSummary = `${catsList.length} taxonomies resolved`;
                }
              } else if (name === 'wiki_get_links') {
                const { pageId, limit = 50, language = 'en' } = args;
                showToast(`Collecting outbound page links...`);
                const linksList = await wikiGetLinks(Number(pageId), Number(limit), language);

                setWikiResults(prev => {
                  const cloned = new Map(prev);
                  cloned.set(tc.id, { wikiType: 'page', data: { title: `Outbound links for page ${pageId}`, url: `https://${language}.wikipedia.org/?curid=${pageId}`, links: linksList } });
                  return cloned;
                });

                resultValue = {
                  linksCount: linksList.length,
                  payload: linksList
                };

                const currentN = toolCallNodes.find(n => n.id === tc.id);
                if (currentN) {
                  currentN.resultSummary = `${linksList.length} outbound connections logged`;
                }
              } else if (name === 'wiki_get_images') {
                const { pageId, language = 'en' } = args;
                showToast(`Extracting static elements...`);
                const imgsList = await wikiGetImages(Number(pageId), language);

                setWikiResults(prev => {
                  const cloned = new Map(prev);
                  cloned.set(tc.id, { wikiType: 'page', data: { title: `Media elements for page ${pageId}`, url: `https://${language}.wikipedia.org/?curid=${pageId}`, images: imgsList } });
                  return cloned;
                });

                resultValue = {
                  imagesCount: imgsList.length,
                  list: imgsList.map(i => i.name),
                  payload: imgsList
                };

                const currentN = toolCallNodes.find(n => n.id === tc.id);
                if (currentN) {
                  currentN.resultSummary = `${imgsList.length} static illustrations resolved`;
                }
              } else if (name === 'wiki_get_related') {
                const { pageId, limit = 10, language = 'en' } = args;
                showToast(`Finding adjacent articles...`);
                const relatedList = await wikiGetRelated(Number(pageId), Number(limit), language);

                setWikiResults(prev => {
                  const cloned = new Map(prev);
                  cloned.set(tc.id, { wikiType: 'search', data: { results: relatedList } });
                  return cloned;
                });

                resultValue = {
                  relatedCount: relatedList.length,
                  payload: relatedList
                };

                const currentN = toolCallNodes.find(n => n.id === tc.id);
                if (currentN) {
                  currentN.resultSummary = `Trajectory logged: ${relatedList.length} related pages found`;
                }
              } else {
                resultValue = { error: `Unsupported coder tool: ${name}` };
              }
            } catch (err: any) {
              resultValue = { error: err.message };
            }

            toolResultMessages.push({
              role: 'tool',
              tool_call_id: tc.id,
              name: name,
              content: JSON.stringify(resultValue)
            });

            const matchedIdx = toolCallNodes.findIndex(node => (node.id === tc.id) || (node.label.startsWith(name) && node.status === 'active'));
            if (matchedIdx !== -1) {
              toolCallNodes[matchedIdx].status = 'complete';
            }

            setChats(prev => prev.map(chat => {
              if (chat.id === chatId) {
                return {
                  ...chat,
                  messages: chat.messages.map(m => m.id === thinkingId ? {
                    ...m,
                    toolCalls: [...toolCallNodes]
                  } : m)
                };
              }
              return chat;
            }));
          }

          apiMessages.push(choice);
          apiMessages.push(...toolResultMessages);

          await new Promise(r => setTimeout(r, 600));
          triggerWorkspaceRefresh();

          if (shouldStopAfterAsk) {
            break;
          }

          const nextResponse = await callLlamaBridge(apiMessages, activeTools, signal);
          choice = nextResponse.choices?.[0]?.message;
        }

        triggerWorkspaceRefresh();
      } else {
        if (Array.isArray(toolCallsRaw) && toolCallsRaw.length > 0) {
          toolCallsRaw.forEach((tc: any, idx: number) => {
            const fn = tc.function || {};
            const name = fn.name || 'unknown';
            const args = fn.arguments ? (() => { try { return JSON.parse(fn.arguments); } catch { return {}; } })() : {};

            toolCallNodes.push({
              id: tc.id || `tc-${idx}`,
              type: 'tool',
              label: name,
              status: 'complete',
              argsCount: typeof args === 'object' && Object.keys(args).length === 0 ? 0 : Object.keys(args).length,
              toolName: name,
              icon: name.includes('search') || name.includes('research') ? <Search size={14} /> :
                    name.includes('wikipedia') ? <Globe size={14} /> :
                    name.includes('read') || name.includes('view') || name.includes('file') || name.includes('fs') ? <FileText size={14} /> :
                    name.includes('write') || name.includes('edit') ? <PenTool size={14} /> :
                    name.includes('github') ? <Box size={14} /> :
                    name.includes('weather') ? <CloudMoon size={14} /> :
                    <Sparkles size={14} />
            });
          });
        }
      }

      const responseContent = choice?.content;
      const finalContent = responseContent || (toolCallsRaw?.length > 0 ? `Running ${toolCallsRaw.length} tool(s)...` : '');
      
      const scavengedImages: any[] = [];
      toolCallNodes.forEach(tc => {
        if (tc.toolName === 'web_scrape') {
          const scraped = scrapingResults.get(tc.id);
          if (scraped && scraped.images && scraped.images.length > 0) {
            scraped.images.slice(0, 12).forEach((imgUrl: string, idx: number) => {
              if (imgUrl && !scavengedImages.some(x => x.url === imgUrl)) {
                scavengedImages.push({
                  title: `Scraped Image ${idx + 1}`,
                  url: imgUrl,
                  source: scraped.title || 'Web Scrape'
                });
              }
            });
          }
        } else if (tc.toolName?.startsWith('wiki_')) {
          const wikiRes = wikiResults.get(tc.id);
          if (wikiRes && wikiRes.data) {
            if (wikiRes.wikiType === 'page' && wikiRes.data.images && wikiRes.data.images.length > 0) {
              wikiRes.data.images.slice(0, 12).forEach((img: any, idx: number) => {
                if (img.url && !scavengedImages.some(x => x.url === img.url)) {
                  scavengedImages.push({
                    title: img.name || `Wiki Image ${idx + 1}`,
                    url: img.url,
                    source: 'Wikipedia'
                  });
                }
              });
            } else if (wikiRes.wikiType === 'summary' && wikiRes.data.thumbnail?.url) {
              const url = wikiRes.data.thumbnail.url;
              if (url && !scavengedImages.some(x => x.url === url)) {
                scavengedImages.push({
                  title: wikiRes.data.title || 'Wiki Image',
                  url: url,
                  source: 'Wikipedia'
                });
              }
            }
          }
        }
      });

      const imagesToAttach = [...responseImages, ...scavengedImages].map((img: any) => ({
        title: img.title || 'Image',
        url: img.url,
        source: img.source,
        thumbnail: img.thumbnail
      }));

      const finalToolNodes = [...toolCallNodes];

      const modelForLabel = activeModelList.find(m => m.id === activeModelId);
      const aiLabel = modelForLabel?.name || activeModelId;

      const synthesisSubNodes: ToolCallNode[] = [];

      if (toolCallNodes.length > 0) {
        toolCallNodes.forEach((tc, idx) => {
          synthesisSubNodes.push({
            id: `synth-sub-${idx}`,
            type: 'sub-tool',
            label: `resolved: ${tc.toolName || tc.label}`,
            status: 'complete',
            icon: tc.icon,
            resultSummary: tc.argsCount !== undefined
              ? (tc.argsCount === 0 ? 'no args' : `${tc.argsCount} arg${tc.argsCount > 1 ? 's' : ''}`)
              : undefined
          });
        });
      }

      if (searchResults.length > 0) {
        synthesisSubNodes.push({
          id: 'synth-sub-search',
          type: 'sub-tool',
          label: 'injected search context',
          status: 'complete',
          icon: <Globe size={12} />,
          resultSummary: `${searchResults.length} result${searchResults.length > 1 ? 's' : ''} grounded`
        });
      }

      if (writingStyle && writingStyle !== 'default') {
        synthesisSubNodes.push({
          id: 'synth-sub-style',
          type: 'sub-tool',
          label: `applied style: ${writingStyle}`,
          status: 'complete',
          icon: <Sparkles size={12} />
        });
      }

      if (finalContent && finalContent.length > 0) {
        const approxTokens = Math.round(finalContent.length / 4);
        synthesisSubNodes.push({
          id: 'synth-sub-tokens',
          type: 'result',
          label: `output generated`,
          status: 'complete',
          icon: <Sparkles size={12} />,
          resultSummary: `~${approxTokens} tokens`
        });
      }

      let synthLabel: string;
      if (toolCallNodes.length > 1) {
        synthLabel = `${aiLabel} — ${toolCallNodes.length} tools resolved, synthesised`;
      } else if (toolCallNodes.length === 1) {
        synthLabel = `${aiLabel} — tool result synthesised`;
      } else if (searchResults.length > 0) {
        synthLabel = `${aiLabel} — web context synthesised`;
      } else if (isWebSearchEnabled && searchResults.length === 0) {
        synthLabel = `${aiLabel} — direct response (no search hits)`;
      } else if (writingStyle && writingStyle !== 'default') {
        synthLabel = `${aiLabel} — ${writingStyle} response generated`;
      } else {
        synthLabel = `${aiLabel} — response generated`;
      }

      finalToolNodes.push({
        id: 'final-ai',
        type: 'ai',
        label: synthLabel,
        status: 'complete',
        icon: <Sparkles size={12} />,
        subNodes: synthesisSubNodes.length > 0 ? synthesisSubNodes : undefined,
        resultSummary: synthesisSubNodes.length > 0
          ? `${synthesisSubNodes.length} sub-step${synthesisSubNodes.length > 1 ? 's' : ''} completed`
          : undefined
      });

      const activeToolNodes = finalToolNodes.map(n => ({ ...n, status: 'active' as const }));
      
      const thinkTagMatch = finalContent.match(/<think>[\s\S]*?<\/think>/);
      const finalThinkContent = thinkTagMatch ? thinkTagMatch[0] : '';
      const finalDisplayContent = finalContent.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

      // Detect the size of the largest code block to dynamically scale up typing streaming speed
      const codeBlockThreshold = 50;
      let maxLinesOfCode = 0;
      const codeMatches = finalContent.match(/```[\s\S]*?```/g);
      if (codeMatches) {
        for (const block of codeMatches) {
          const lines = block.split('\n').length;
          if (lines > maxLinesOfCode) {
            maxLinesOfCode = lines;
          }
        }
      }

      // Compute dynamic throughput (characters per second) based on file scale & line counts
      const totalLength = finalContent.length;
      let speedFactor = 95; // default for tiny conversational replies

      if (totalLength > 8000) {
        speedFactor = 1600;
      } else if (totalLength > 4000) {
        speedFactor = 1200;
      } else if (totalLength > 2000) {
        speedFactor = 850;
      } else if (totalLength > 1000) {
        speedFactor = 550;
      } else if (totalLength > 500) {
        speedFactor = 280;
      }

      // Scale dynamically with code block complexity to prevent stuttering but keep readable scrolling
      if (maxLinesOfCode > codeBlockThreshold) {
        if (maxLinesOfCode > 800) {
          speedFactor = Math.max(speedFactor, 1950);
        } else if (maxLinesOfCode > 400) {
          speedFactor = Math.max(speedFactor, 1450);
        } else if (maxLinesOfCode > 200) {
          speedFactor = Math.max(speedFactor, 980);
        } else if (maxLinesOfCode > 100) {
          speedFactor = Math.max(speedFactor, 680);
        } else {
          speedFactor = Math.max(speedFactor, 420);
        }
      }

      const startTime = Date.now();
      let currentPos = 0;
      let lastRenderTime = 0;
      const RENDER_INTERVAL = 30; // ~33 FPS viewport updates

      while (currentPos < totalLength) {
        if (signal.aborted) {
          break;
        }

        const elapsed = Date.now() - startTime;
        // Exact character cursor position proportional to actual time elapsed
        const targetPos = Math.min(totalLength, Math.floor(elapsed * (speedFactor / 1000)));

        if (targetPos > currentPos) {
          currentPos = targetPos;
          const partial = finalContent.slice(0, currentPos);
          const now = Date.now();

          // Smoothly update state without loading main thread excessively
          if (now - lastRenderTime > RENDER_INTERVAL || currentPos === totalLength) {
            lastRenderTime = now;
            const parsed = parseThinkTags(partial);
            const displayContent = (parsed.before + parsed.after).trim();
            setChats(prev => prev.map(chat => {
              if (chat.id === chatId) {
                return {
                  ...chat,
                  messages: chat.messages.map(m => m.id === thinkingId ? {
                    ...m,
                    content: parsed.isThinking ? displayContent : (displayContent || partial),
                    thinkContent: parsed.think || undefined,
                    isThinking: parsed.isThinking,
                    streamPos: currentPos,
                    toolCalls: activeToolNodes
                  } : m),
                };
              }
              return chat;
            }));
          }
        }

        // Relinquish execution back to the browser event loop for responsiveness (mouse tracking, layout drag)
        await new Promise(resolve => setTimeout(resolve, 8));
      }

      if (signal.aborted) {
        return;
      }

      const finalArtifacts = extractArtifacts(finalDisplayContent);
      if (finalArtifacts.length > 0) {
        setActiveArtifact(finalArtifacts[0]);
        setIsCanvasOpen(true);
        setCanvasView(finalArtifacts[0].type === 'html' ? 'preview' : 'code');
      }

      setChats(prev => prev.map(chat => {
        if (chat.id === chatId) {
          return {
            ...chat,
            messages: chat.messages.map(m =>
              m.id === thinkingId
                ? {
                    ...m,
                    content: finalDisplayContent || finalContent.trim(),
                    thinkContent: finalThinkContent.replace(/<\/?think>/g, '').trim() || undefined,
                    isThinking: false,
                    streamPos: undefined,
                    thinking: undefined,
                    toolCalls: finalToolNodes,
                    isStreaming: false,
                    sources: searchResults.length > 0 ? searchResults.slice(0, 10).map(r => ({ title: r.title, url: r.url, snippet: r.snippet })) : undefined,
                    images: imagesToAttach.length > 0 ? imagesToAttach : undefined,
                    searchQuery: isWebSearchEnabled ? userMessage.content : undefined,
                    isSearching: false,
                    timestamp: new Date(),
                    artifacts: finalArtifacts.length > 0 ? finalArtifacts : undefined
                  }
                : m
            ),
            updatedAt: new Date(),
          };
        }
        return chat;
      }));
    } catch (error: any) {
      if (error?.name === 'AbortError' || signal.aborted) {
        console.log('Stream generation aborted.');
        // Gracefully finalize typing message structure up to where it currently was
        setChats(prev => prev.map(chat => {
          if (chat.id === chatId) {
            return {
              ...chat,
              messages: chat.messages.map(m =>
                m.id === thinkingId
                  ? {
                      ...m,
                      isThinking: false,
                      isStreaming: false,
                      isSearching: false,
                      timestamp: new Date()
                    }
                  : m
              ),
              updatedAt: new Date(),
            };
          }
          return chat;
        }));
        return;
      }
      console.error('Lumina API Error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Error: Failed to connect to ${serverUrl}. Please check your API key and server configuration in Settings.`,
        timestamp: new Date(),
      };
      setChats(prev => prev.map(chat => {
        if (chat.id === chatId) {
          const filtered = chat.messages.filter(m => m.id !== thinkingId);
          return { ...chat, messages: [...filtered, errorMessage] };
        }
        return chat;
      }));
    } finally {
      setIsTyping(false);
      setTypingMessageId(null);
      abortControllerRef.current = null;
      setCoderTodos(prev => prev.map(t => ({ ...t, status: 'complete' })));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showsSlashCommands && filteredCommands.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedCommandIndex(prev => (prev + 1) % filteredCommands.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedCommandIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length);
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        const selectedCmd = filteredCommands[selectedCommandIndex];
        if (selectedCmd) {
          setInput(`/${selectedCmd.name} `);
          setSelectedCommandIndex(0);
        }
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setInput(input + ' ');
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const adjustTextareaHeight = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = e.target;
    setInput(textarea.value);

    requestAnimationFrame(() => {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    });
  };

  function extractArtifacts(content: string): Artifact[] {
    // Strip the <think>...</think> portion from the content analyzed for artifacts
    const cleanContent = content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
    const artifacts: Artifact[] = [];
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    let match;
    const seenCode = new Set<string>();
    
    while ((match = codeBlockRegex.exec(cleanContent)) !== null) {
      const lang = (match[1] || 'text').toLowerCase();
      const code = match[2].trim();
      seenCode.add(code);
      
      let type: 'code' | 'markdown' | 'html' | 'poem' | 'report' = 'code';
      let title = 'Code Snippet';

      if (lang === 'html') {
        type = 'html';
        title = 'Web Preview';
      } else if (lang === 'markdown' || lang === 'md') {
        type = 'markdown';
        title = 'Document';
      } else if (lang === 'poem' || lang === 'poetry' || lang === 'verse') {
        type = 'poem';
        const lines = code.split('\n');
        const firstLine = lines[0].replace(/^#+\s*/, '').replace(/title/i, '').replace(/[:\-]/, '').trim();
        title = firstLine.length < 40 ? firstLine : 'Poetic Verse';
      } else if (lang === 'report' || lang === 'document' || lang === 'letter' || lang === 'memo') {
        type = 'report';
        const lines = code.split('\n');
        const firstLine = lines[0].replace(/^#+\s*/, '').replace(/title/i, '').replace(/[:\-]/, '').trim();
        title = firstLine.length < 40 ? firstLine : 'Professional Document';
      } else if (['javascript', 'typescript', 'tsx', 'jsx'].includes(lang)) {
        title = 'React Component';
      } else if (lang === 'python') {
        title = 'Python Script';
      } else if (lang === 'css') {
        title = 'Styles';
      }
      
      if (code.length > 30) {
        artifacts.push({
          id: 'art-' + Math.random().toString(36).substring(7),
          title,
          language: lang,
          content: code,
          type
        });
      }
    }

    // Heuristics fallback if no document, poem or report artifacts were detected
    if (artifacts.filter(a => ['poem', 'report', 'markdown'].includes(a.type)).length === 0) {
      const lowerContent = cleanContent.toLowerCase();
      const stanzas = cleanContent.split('\n\n').filter(s => s.trim().length > 0);
      
      // Get last user prompt to detect intent
      const currentChat = chats.find(c => c.id === currentChatId);
      const userMessages = currentChat ? currentChat.messages.filter(m => m.role === 'user') : [];
      const lastUserMessage = userMessages[userMessages.length - 1];
      const userPromptLower = lastUserMessage ? lastUserMessage.content.toLowerCase() : '';

      // Check current writing style first
      if (writingStyle === 'poem' && cleanContent.length > 30) {
        const lines = cleanContent.split('\n').map(l => l.trim()).filter(Boolean);
        const titleCand = lines[0]?.replace(/^#+\s*/, '') || 'A Beautiful Poem';
        artifacts.push({
          id: 'art-' + Math.random().toString(36).substring(7),
          title: titleCand.length < 40 ? titleCand : 'A Beautiful Poem',
          language: 'poetry',
          content: cleanContent,
          type: 'poem'
        });
      } else if (['letter', 'story', 'essay', 'script'].includes(writingStyle) && cleanContent.length > 30) {
        const lines = cleanContent.split('\n').map(l => l.trim()).filter(Boolean);
        const titleCand = lines[0]?.replace(/^#+\s*/, '') || (writingStyle.charAt(0).toUpperCase() + writingStyle.slice(1));
        artifacts.push({
          id: 'art-' + Math.random().toString(36).substring(7),
          title: titleCand.length < 40 ? titleCand : (writingStyle.charAt(0).toUpperCase() + writingStyle.slice(1)),
          language: 'markdown',
          content: cleanContent,
          type: 'report'
        });
      } else {
        // Fallback checks using keywords from either content or user prompt
        const poemKeywords = ['poem', 'poetry', 'sonnet', 'verse', 'haiku', 'rhyme', 'ode', 'ballad', 'stanzas', 'strophes'];
        const hasPoemIndicator = poemKeywords.some(kw => lowerContent.includes(kw)) || poemKeywords.some(kw => userPromptLower.includes(kw));
        
        const docKeywords = ['report', 'summary', 'executive', 'proposal', 'document', 'analysis', 'memo', 'letter', 'essay', 'story', 'script', 'paragraph'];
        const hasDocIndicator = docKeywords.some(kw => lowerContent.includes(kw)) || docKeywords.some(kw => userPromptLower.includes(kw));

        const hasShortRhythmicLines = stanzas.length >= 2 && stanzas.slice(0, 3).every(s => {
          const lines = s.split('\n').map(l => l.trim()).filter(Boolean);
          return lines.length >= 2 && lines.length <= 10 && lines.every(l => l.length < 90);
        });

        if (hasShortRhythmicLines && hasPoemIndicator && cleanContent.length < 5000) {
          const lines = cleanContent.split('\n').map(l => l.trim()).filter(Boolean);
          const titleCand = lines[0]?.replace(/^#+\s*/, '') || 'A Beautiful Poem';
          artifacts.push({
            id: 'art-' + Math.random().toString(36).substring(7),
            title: titleCand.length < 40 ? titleCand : 'A Beautiful Poem',
            language: 'poetry',
            content: cleanContent,
            type: 'poem'
          });
        }
        else if (hasDocIndicator && cleanContent.length > 300) {
          const lines = cleanContent.split('\n').map(l => l.trim()).filter(Boolean);
          const titleCand = lines[0]?.replace(/^#+\s*/, '') || 'Executive Document';
          artifacts.push({
            id: 'art-' + Math.random().toString(36).substring(7),
            title: titleCand.length < 40 ? titleCand : 'Executive Document',
            language: 'markdown',
            content: cleanContent,
            type: 'report'
          });
        }
      }
    }
    
    return artifacts;
  }

  function showToast(message: string) {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 2000);
  }

  const handleScreenshot = async () => {
    setIsPlusMenuOpen(false);
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const track = stream.getVideoTracks()[0];
      const imageCapture = new (window as any).ImageCapture(track);
      const bitmap = await imageCapture.grabFrame();
      const canvas = document.createElement('canvas');
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      canvas.getContext('2d')?.drawImage(bitmap, 0, 0);
      track.stop();
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `screenshot-${Date.now()}.png`, { type: 'image/png' });
          setAttachedFiles(prev => [...prev, file]);
          showToast('Screenshot captured!');
        }
      });
    } catch {
      showToast('Screenshot cancelled or not supported.');
    }
  };

  const markdownComponents = useMemo(() => ({
    code({ className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || '');
      const codeStr = String(children).replace(/\n$/, '');
      const isMultiLine = codeStr.includes('\n');
      
      const isTreeStructure = (() => {
        const lines = codeStr.split('\n');
        let branches = 0;
        for (let i = 0; i < Math.min(lines.length, 15); i++) {
          const line = lines[i];
          if (line.includes('├──') || line.includes('└──') || line.includes('│  ') || line.includes('└──') || line.includes('║') || line.includes('╠══') || line.includes('╚══')) {
            branches++;
          }
        }
        return branches >= 1;
      })();

      if (isTreeStructure) {
        return (
          <CustomCodeBlockVisualizer
            language="tree"
            code={codeStr}
            defaultRender={<CanvasBlock language="tree" code={codeStr} />}
          />
        );
      }

      if (match) {
        return (
          <CustomCodeBlockVisualizer
            language={match[1]}
            code={codeStr}
            defaultRender={<CanvasBlock language={match[1]} code={codeStr} />}
          />
        );
      }

      if (isMultiLine) {
        return (
          <CanvasBlock 
            language="text" 
            code={codeStr} 
          />
        );
      }

      return (
        <code className="bg-white/10 px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
          {children}
        </code>
      );
    },
    p({ children, ...props }: any) {
      return (
        <p className="leading-relaxed my-2" {...props}>
          {renderTextWithMath(children)}
        </p>
      );
    },
    table({ children }: any) {
      return <InteractiveTableVisualizer>{children}</InteractiveTableVisualizer>;
    },
    img({ src, alt, ...props }: any) {
      return (
        <div className="my-4 overflow-hidden rounded-2xl border border-zinc-200/50 dark:border-white/5 bg-zinc-50 dark:bg-zinc-900/20 max-w-full sm:max-w-md shadow-xs group relative">
          <img 
            src={src} 
            alt={alt || 'AI Attached Visual'} 
            className="w-full h-auto object-cover max-h-[320px] hover:scale-[1.01] transition-transform duration-300 cursor-pointer" 
            referrerPolicy="no-referrer"
            onClick={() => {
              window.open(src, '_blank');
            }}
            {...props}
          />
          {alt && (
            <div className="px-4 py-2 bg-zinc-50 dark:bg-zinc-900/80 border-t border-zinc-150/40 dark:border-white/5 text-[11px] font-medium text-zinc-550 dark:text-zinc-400 select-none">
              {alt}
            </div>
          )}
        </div>
      );
    },
    a({ href, children, ...props }: any) {
      const isImgUrl = href && /\.(png|jpe?g|gif|webp|svg|bmp)(\?.*)?$/i.test(href);
      if (isImgUrl) {
        return (
          <div className="my-4 overflow-hidden rounded-2xl border border-zinc-200/50 dark:border-white/5 bg-zinc-50 dark:bg-zinc-900/20 max-w-full sm:max-w-md shadow-xs group relative">
            <img 
              src={href} 
              alt={String(children) || 'Attached Visual'} 
              className="w-full h-auto object-cover max-h-[320px] hover:scale-[1.01] transition-transform duration-300 cursor-pointer" 
              referrerPolicy="no-referrer"
              onClick={() => {
                window.open(href, '_blank');
              }}
            />
            <div className="px-4 py-2 bg-zinc-50 dark:bg-zinc-900/80 border-t border-zinc-150/40 dark:border-white/5 text-[11px] font-semibold text-blue-550 dark:text-blue-400 select-none flex items-center justify-between">
              <span className="truncate max-w-[80%]">{String(children) || 'Image Preview'}</span>
              <a href={href} target="_blank" rel="noreferrer" className="underline hover:text-blue-600 dark:hover:text-blue-300 text-[10px] uppercase font-bold tracking-wider">Source</a>
            </div>
          </div>
        );
      }
      return (
        <a 
          href={href} 
          target="_blank" 
          rel="noreferrer" 
          className="text-blue-550 dark:text-blue-400 hover:underline font-semibold" 
          {...props}
        >
          {children}
        </a>
      );
    }
  }), []);

  const [isMaximized, setIsMaximized] = useState(false);
  const isElectron = typeof window !== 'undefined' && (window as any).__electronAPI;

  useEffect(() => {
    const api = (window as any).__electronAPI;
    if (!api) return;
    api.onMaximized((maximized: boolean) => setIsMaximized(maximized));
    api.isMaximized().then((maximized: boolean) => setIsMaximized(maximized));
  }, []);

  useEffect(() => {
    const handleOpenPhysics = () => {
      setActiveLabTab('physics');
      setCurrentChatId(null);
    };
    const handleOpenChemistry = () => {
      setActiveLabTab('chemistry');
      setCurrentChatId(null);
    };
    const handleOpenMath = () => {
      setActiveLabTab('math');
      setCurrentChatId(null);
    };
    const handleOpenBiology = () => {
      setActiveLabTab('biology');
      setCurrentChatId(null);
    };

    window.addEventListener('open-physics-canvas', handleOpenPhysics);
    window.addEventListener('open-chemistry-canvas', handleOpenChemistry);
    window.addEventListener('open-math-canvas', handleOpenMath);
    window.addEventListener('open-biology-canvas', handleOpenBiology);

    return () => {
      window.removeEventListener('open-physics-canvas', handleOpenPhysics);
      window.removeEventListener('open-chemistry-canvas', handleOpenChemistry);
      window.removeEventListener('open-math-canvas', handleOpenMath);
      window.removeEventListener('open-biology-canvas', handleOpenBiology);
    };
  }, []);

  const renderChatBox = (isCenteredState: boolean = false) => {
    const isClaude = theme.id === 'claude';
    return (
      <div className="w-full flex flex-col text-left">
        <AnimatePresence mode="popLayout">
          {(writingStyle !== 'default' || isWebSearchEnabled || bridgeTools.some(t => t.enabled) || activeSkills.length > 0) && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 5 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 5 }}
              className="flex items-center gap-1.5 px-1 mb-2.5 flex-wrap z-10"
            >
              {writingStyle !== 'default' && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsPlusMenuOpen(true);
                    setActivePlusSubMenu('style');
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-500/10 text-orange-500 border border-orange-500/20 shadow-sm cursor-pointer hover:bg-orange-500/15 text-xs font-semibold"
                >
                  {WRITING_STYLES.find(s => s.id === writingStyle)?.icon}
                  <span>Style: {WRITING_STYLES.find(s => s.id === writingStyle)?.label}</span>
                </motion.button>
              )}
              {isWebSearchEnabled && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsPlusMenuOpen(true);
                    setActivePlusSubMenu('main');
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20 shadow-sm cursor-pointer hover:bg-blue-500/15 text-xs font-semibold"
                >
                  <Globe size={13} />
                  <span>Web Search</span>
                </motion.button>
              )}
              {luminaTools.some(t => t.enabled) && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsPlusMenuOpen(true);
                    setActivePlusSubMenu('lumina_tools');
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 shadow-sm cursor-pointer hover:bg-indigo-500/15 text-xs font-semibold"
                >
                  <Hammer size={12} />
                  <span>Lumina Tools ({luminaTools.filter(t => t.enabled).length})</span>
                </motion.button>
              )}
              {bridgeTools.some(t => t.enabled) && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsPlusMenuOpen(true);
                    setActivePlusSubMenu('tools');
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shadow-sm cursor-pointer hover:bg-emerald-500/15 text-xs font-semibold"
                >
                  <Wrench size={12} />
                  <span>Bridge Tools ({bridgeTools.filter(t => t.enabled).length})</span>
                </motion.button>
              )}
              {activeSkills.map(skillId => {
                const skill = SKILLS.find(s => s.id === skillId);
                if (!skill) return null;
                return (
                  <motion.button
                    key={skill.id}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsPlusMenuOpen(true);
                      setActivePlusSubMenu('skills');
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 shadow-sm cursor-pointer hover:bg-indigo-500/15 text-xs font-semibold"
                  >
                    {skill.icon}
                    <span>{skill.label}</span>
                  </motion.button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showTodoPanel && coderTodos.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              className="w-full bg-[var(--theme-input-bg)] border border-[var(--theme-input-border)] border-b-0 rounded-t-[24px] px-4 pt-3 pb-4 flex flex-col gap-2 relative z-[5] shadow-xl mb-[-4px]"
            >
              {/* Title block representing the command being executed */}
              <div className="flex items-center gap-2 text-[var(--theme-primary)] select-none border-b border-[var(--theme-border)]/25 pb-2 mb-1">
                <span className="text-[14px]">📂</span>
                <span className="font-semibold text-xs tracking-tight truncate max-w-[85%] text-[var(--theme-primary)]">
                  {activeCommandQuery 
                    ? `/${activeCommandType} ${activeCommandQuery}`
                    : isCoderMode 
                      ? "Execute Coder Engineering Task" 
                      : "Execute Workspace Task Strategy"
                  }
                </span>
              </div>

              {/* Header */}
              <div className="flex items-center justify-between font-sans select-none">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-500">Task Progress</span>
                  <span className="text-[10px] text-[var(--theme-primary)] bg-white/5 border border-white/10 px-1.5 py-0.5 rounded-full font-mono font-bold">
                    {coderTodos.filter(t => t.status === 'complete').length}/{coderTodos.length}
                  </span>
                  {isGeneratingTodos && (
                    <span className="text-[10px] text-[var(--theme-muted)] italic animate-pulse">(planning...)</span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setTodoCollapsed(!todoCollapsed)}
                    className="p-1 hover:bg-white/5 rounded-lg text-[var(--theme-muted)] hover:text-[var(--theme-primary)] transition-all cursor-pointer flex items-center justify-center"
                    title={todoCollapsed ? "Expand task checklist" : "Collapse task checklist"}
                  >
                    <ChevronRight 
                      size={14} 
                      className={`transition-transform duration-200 ${todoCollapsed ? '' : 'rotate-90'}`} 
                    />
                  </button>
                  <button 
                    onClick={() => {
                      setShowTodoPanel(false);
                      setCoderTodos([]);
                      setActiveCommandQuery(null);
                      setActiveCommandType(null);
                    }}
                    className="p-1 hover:bg-white/5 rounded-lg text-[var(--theme-muted)] hover:text-[var(--theme-primary)] transition-all cursor-pointer flex items-center justify-center"
                    title="Dismiss checklist"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>

              {/* List (collapsible) */}
              <AnimatePresence initial={false}>
                {!todoCollapsed && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.18, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className="flex flex-col gap-1.5 max-h-[180px] overflow-y-auto custom-scrollbar font-sans">
                      {coderTodos.map((todo) => {
                        const isDone = todo.status === 'complete';
                        const isActive = todo.status === 'in_progress';
                        return (
                          <motion.div
                            key={todo.id}
                            initial={{ opacity: 0, x: -5 }}
                            animate={{ opacity: 1, x: 0 }}
                            className={`flex items-center gap-3 px-2 py-1.5 rounded-xl transition-all`}
                          >
                            <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                              isDone
                                ? 'bg-emerald-500/20 border border-emerald-500 text-emerald-400'
                                : isActive
                                  ? 'border border-[var(--theme-accent)] bg-[var(--theme-accent)]/10'
                                  : 'border border-[var(--theme-muted)]/40'
                            }`}>
                              {isDone && <Check size={10} strokeWidth={3} className="text-emerald-400" />}
                              {isActive && <div className="w-1.5 h-1.5 rounded-full bg-[var(--theme-accent)] animate-pulse" />}
                            </div>

                            <span className={`text-xs font-medium flex-1 ${isDone ? 'line-through text-[var(--theme-muted)]' : isActive ? 'text-[var(--theme-primary)]' : 'text-[var(--theme-secondary)]'}`}>
                              {todo.text}
                            </span>

                            {isDone && (
                              <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1 shrink-0">
                                <Check size={10} strokeWidth={3} /> Done
                              </span>
                            )}
                            {isActive && (
                              <Loader2 size={12} className="text-[var(--theme-accent)] animate-spin shrink-0" />
                            )}
                          </motion.div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}


          {showsSlashCommands && filteredCommands.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              className="w-full bg-[var(--theme-input-bg)] border border-[var(--theme-input-border)] border-b-0 rounded-t-[24px] overflow-hidden flex flex-col relative z-[5] shadow-xl mb-[-4px]"
            >
              {/* Header */}
              <div className="h-10 bg-[#1b1918] border-b border-[var(--theme-border)]/35 pl-4 pr-[7px] py-1.5 flex items-center justify-between shrink-0 select-none">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--theme-accent)] animate-pulse" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--theme-accent)]">Workspace Command Center</span>
                  <span className="text-[10px] text-[var(--theme-primary)] bg-white/5 border border-white/10 px-1.5 py-0.5 rounded-full font-mono font-bold">
                    {filteredCommands.length} Available
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] text-[var(--theme-muted)] italic hidden sm:inline mr-1">Press Up/Down to Navigate, Enter to Select</span>
                  <button 
                    onClick={() => setInput(input + ' ')}
                    className="p-1 hover:bg-white/5 rounded-lg text-[var(--theme-muted)] hover:text-[var(--theme-primary)] transition-all cursor-pointer flex items-center justify-center"
                    title="Dismiss Command suggestions"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>

              {/* Suggestions List in style of task progress checklists */}
              <div className="p-3 flex flex-col gap-1.5 max-h-[190px] overflow-y-auto custom-scrollbar font-sans bg-[var(--theme-input-bg)]">
                {filteredCommands.map((cmd, idx) => {
                  const isSelected = idx === selectedCommandIndex;
                  return (
                    <button
                      key={cmd.id}
                      type="button"
                      onClick={() => {
                        setInput(`/${cmd.name} `);
                        setSelectedCommandIndex(0);
                        if (inputRef && 'current' in inputRef && inputRef.current) {
                          inputRef.current.focus();
                        }
                      }}
                      onMouseEnter={() => setSelectedCommandIndex(idx)}
                      className={`w-full flex items-center px-3 py-2 rounded-xl text-left transition-all select-none gap-3 outline-none duration-150 ${
                        isSelected 
                          ? 'bg-white/5 text-[var(--theme-primary)] border border-[var(--theme-input-border)] shadow-sm' 
                          : 'text-[var(--theme-secondary)] hover:text-[var(--theme-primary)] hover:bg-white/5/25 border border-transparent'
                      }`}
                    >
                      {/* Left element resembling bullet items */}
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                        isSelected
                          ? 'border border-[var(--theme-accent)] bg-[var(--theme-accent)]/15 text-[var(--theme-accent)]'
                          : 'border border-[var(--theme-muted)]/30 text-[var(--theme-muted)]'
                      }`}>
                        <span className="text-[9px] font-mono leading-none">&gt;</span>
                      </div>

                      <div className="flex-1 flex flex-col sm:flex-row sm:items-center sm:gap-3">
                        <span className={`font-mono text-xs font-bold leading-none ${
                          isSelected ? 'text-[var(--theme-accent)]' : 'text-[var(--theme-primary)]'
                        }`}>
                          /{cmd.name}
                        </span>
                        <span className={`font-sans text-[11px] truncate leading-none ${
                          isSelected ? 'text-[var(--theme-primary)]' : 'text-[var(--theme-muted)]'
                        }`}>
                          {cmd.desc}
                        </span>
                      </div>

                      {isSelected && (
                        <div className="text-[10px] text-[var(--theme-accent)] font-semibold flex items-center gap-1 shrink-0 animate-fade-in font-mono">
                          SELECT <ChevronRight size={10} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {showAskAiPanel && askAiQuestions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              className="w-full bg-[var(--theme-input-bg)] border border-[var(--theme-input-border)] border-b-0 rounded-t-[24px] px-5 py-4 flex flex-col justify-between relative z-[5] shadow-2xl mb-[-4px] h-[260px] max-h-[260px] overflow-hidden select-none"
            >
              {/* Header: Progress & Close */}
              <div className="flex items-center justify-between shrink-0 mb-1.5">
                {/* Progress Dots */}
                <div className="flex items-center gap-1.5">
                  {askAiQuestions.map((q, idx) => {
                    const isAnswered = askAiAnswers[q.id] !== undefined;
                    const isActive = idx === currentQuestionIndex;
                    return (
                      <button
                        key={q.id}
                        onClick={() => handleDotClick(idx)}
                        disabled={!isAnswered && idx > currentQuestionIndex}
                        className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                          isActive 
                            ? 'bg-orange-500 scale-125 shadow-[0_0_8px_rgba(249,115,22,0.6)]' 
                            : isAnswered 
                              ? 'bg-orange-500/60 hover:bg-orange-500 cursor-pointer' 
                              : 'bg-zinc-700 hover:bg-zinc-650 disabled:pointer-events-none'
                        }`}
                        title={`Question ${idx + 1}: ${q.purpose || q.question}`}
                      />
                    );
                  })}
                  <span className="text-[10px] text-zinc-400 font-mono font-bold tracking-wider uppercase ml-1.5 bg-zinc-805/50 border border-zinc-700/35 px-1.5 py-0.5 rounded-full select-none">
                    Q{currentQuestionIndex + 1}/{askAiQuestions.length}
                  </span>
                </div>

                {/* Skip All Button */}
                <button
                  onClick={() => handleFinishQuestions(true)}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold tracking-tight text-zinc-400 hover:text-white hover:bg-white/5 border border-zinc-750 rounded-xl transition-all cursor-pointer"
                >
                  <X size={12} />
                  <span>Skip All</span>
                </button>
              </div>

              {/* Main Question Block */}
              <div className="flex-1 flex flex-col justify-center min-h-0 py-2">
                <AnimatePresence mode="wait">
                  {!isTransitioningQuestion && !isGeneratingQuestions && !isAnalyzingAnswers && (
                    <motion.div
                      key={currentQuestionIndex}
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: -40, opacity: 0 }}
                      transition={{ duration: 0.2, ease: 'easeInOut' }}
                      className="flex flex-col h-full justify-between"
                    >
                      {/* Question Text */}
                      <div className="text-[15px] font-medium text-white leading-normal tracking-tight flex flex-col gap-0.5 select-none">
                        <span className="text-zinc-100 font-medium">{askAiQuestions[currentQuestionIndex].question}</span>
                        {askAiQuestions[currentQuestionIndex].purpose && (
                          <span className="text-[11px] text-zinc-500 font-medium italic select-none">
                            💡 Purpose: {askAiQuestions[currentQuestionIndex].purpose}
                          </span>
                        )}
                      </div>

                      {/* Question Content Types */}
                      <div className="flex-1 flex items-center mt-3 min-h-0 select-none">
                        {renderActiveQuestionContent()}
                      </div>
                    </motion.div>
                  )}

                  {isGeneratingQuestions && (
                    <motion.div 
                      key="generating-loader" 
                      initial={{ opacity: 0 }} 
                      animate={{ opacity: 1 }} 
                      exit={{ opacity: 0 }}
                      className="flex flex-col items-center justify-center gap-2 h-full py-4 text-center select-none"
                    >
                      <Loader2 size={24} className="text-orange-500 animate-spin" />
                      <span className="text-xs font-semibold tracking-wider uppercase text-zinc-400 animate-pulse">
                        Evaluating context and formulating questions...
                      </span>
                    </motion.div>
                  )}

                  {isAnalyzingAnswers && (
                    <motion.div 
                      key="analyzing-loader" 
                      initial={{ opacity: 0 }} 
                      animate={{ opacity: 1 }} 
                      exit={{ opacity: 0 }}
                      className="flex flex-col items-center justify-center gap-2 h-full py-4 text-center select-none"
                    >
                      <Loader2 size={24} className="text-orange-500 animate-spin" />
                      <span className="text-xs font-semibold tracking-wider uppercase text-zinc-400 animate-pulse">
                        Analyzing your answers... generating tailored task checklist...
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className={`relative border border-[var(--theme-input-border)] bg-[var(--theme-input-bg)] focus-within:border-[var(--theme-accent)]/40 overflow-visible flex flex-col p-2 min-h-[100px] justify-between transition-all duration-300 ${
          isCenteredState 
            ? 'rounded-[24px] shadow-lg border-[var(--theme-input-border)] z-10' 
            : 'rounded-xl shadow-none border-[var(--theme-border)]/60 z-10'
        }`} style={((showTodoPanel && coderTodos.length > 0) || (showsSlashCommands && filteredCommands.length > 0) || (showAskAiPanel && askAiQuestions.length > 0)) ? { borderTopLeftRadius: 0, borderTopRightRadius: 0 } : {}}>

          <div className="flex-1 px-3 pt-2">
          {(attachedFiles.length > 0 || localElementAttachments.length > 0) && (
            <div className="flex flex-wrap gap-2 pt-1 pb-3 items-center">
              {attachedFiles.map((file, idx) => {
                const isImage = file.type.startsWith('image/');
                const ext = file.name.split('.').pop()?.toUpperCase() || 'DOC';
                let previewUrl = '';
                if (isImage) {
                  try {
                    previewUrl = URL.createObjectURL(file);
                  } catch (e) {
                    previewUrl = '';
                  }
                }
                return (
                  <motion.div 
                    key={`${file.name}-${idx}`}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative flex items-center gap-2.5 px-3 py-1.5 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface-alt)] text-[var(--theme-primary)] hover:bg-[var(--theme-hover-bg)] transition-all max-w-[215px] h-12 shadow-sm group/file"
                  >
                    <button
                      onClick={() => setAttachedFiles(prev => prev.filter((_, i) => i !== idx))}
                      className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-zinc-800 hover:bg-zinc-700 border border-[var(--theme-border)] text-gray-400 hover:text-white flex items-center justify-center transition-all z-10 shadow-lg cursor-pointer"
                    >
                      <X size={12} />
                    </button>
                    <div className="w-8 h-8 bg-zinc-800 border border-[var(--theme-border)] rounded-lg flex items-center justify-center text-[9px] font-black uppercase text-gray-400 tracking-wider overflow-hidden shrink-0">
                      {isImage && previewUrl ? (
                        <img src={previewUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        ext
                      )}
                    </div>
                    <div className="flex-1 min-w-0 pr-1 flex flex-col justify-center text-left">
                      <div className="truncate font-semibold text-xs text-zinc-100 leading-none">
                        {file.name}
                      </div>
                      <div className="text-[10px] text-gray-550 font-bold tracking-tight leading-none mt-1">
                        {(file.size / 1024).toFixed(0)} KB
                      </div>
                    </div>
                  </motion.div>
                );
              })}

              {localElementAttachments.map((att, idx) => (
                <motion.div
                  key={att.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setAttachmentContextMenu({
                      visible: true,
                      x: e.clientX,
                      y: e.clientY,
                      attachment: att,
                      index: idx
                    });
                  }}
                  onClick={() => {
                    setSelectedModalAttachment(att);
                  }}
                  className="relative flex items-center justify-center w-12 h-12 rounded-xl border-2 border-teal-500/50 bg-teal-500/10 text-teal-400 hover:border-teal-400 hover:bg-teal-500/20 transition-all cursor-pointer shadow-[0_0_12px_rgba(20,184,166,0.25)] group/att shrink-0"
                  title="Selected layout element attachment (Right-click to open in editor)"
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      setLocalElementAttachments(prev => prev.filter((_, i) => i !== idx));
                    }}
                    className="absolute -top-1.5 -right-1.5 w-4.5 h-4.5 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-teal-500 text-teal-300 hover:text-white flex items-center justify-center transition-all z-10 shadow-lg cursor-pointer animate-fade-in"
                  >
                    <X size={10} />
                  </button>
                  <div className="flex items-center justify-center">
                    <MousePointerClick size={18} className="text-teal-400 animate-pulse" />
                  </div>
                </motion.div>
              ))}
            </div>
          )}
          <textarea
            ref={inputRef}
            value={input}
            onChange={adjustTextareaHeight}
            onKeyDown={handleKeyDown}
            placeholder={
              activeAssistantMode === 'builder'
                ? "Describe the feature or component you want me to build autonomously..."
                : activeAssistantMode === 'planner'
                  ? "Describe a complex high-level task to draft a detailed architecture blueprint..."
                  : "Trace syntax errors, explain complex codes, or hot-fix bugs..."
            }
            rows={1}
            className="w-full bg-transparent border-none focus:ring-0 focus:outline-none text-[16px] p-0 resize-none min-h-[40px] text-[var(--theme-primary)] placeholder-zinc-500/70 scroll-none"
          />
        </div>
        
        <div className="flex items-center justify-between px-3 pb-1.5 pt-1">
          <div className="flex items-center gap-2">
            <div className="relative" ref={plusMenuRef}>
              <motion.button 
                whileTap={{ scale: 0.92 }}
                transition={{ duration: 0.08 }}
                onClick={() => {
                  setIsPlusMenuOpen(!isPlusMenuOpen);
                  setActivePlusSubMenu('main');
                }}
                className={`p-2 rounded-2xl transition-all ${
                  isWebSearchEnabled 
                    ? 'text-blue-500 bg-blue-500/10 hover:bg-blue-500/20' 
                    : (luminaTools.some(t => t.enabled) || bridgeTools.some(t => t.enabled))
                      ? 'text-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/20' 
                      : 'text-[var(--theme-secondary)] hover:text-[var(--theme-primary)] hover:bg-[var(--theme-hover-bg)]'
                }`}
              >
                <Plus size={20} className={`transition-transform duration-200 ${isPlusMenuOpen ? 'rotate-45' : ''}`} />
              </motion.button>
              <AnimatePresence>
                {isPlusMenuOpen && (
                  <motion.div
                    ref={menuContentRef}
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    style={plusMenuPopupPosition.style}
                    className="fixed w-64 bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-2xl shadow-2xl overflow-hidden z-[180] p-1.5 flex flex-col"
                  >
                    {activePlusSubMenu === 'main' ? (
                      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar space-y-0.5 p-0.5">
                        {[
                          { id: 'files', label: 'Add files or photos', icon: <FileUp size={16} /> },
                          { id: 'screenshot', label: 'Take a screenshot', icon: <Camera size={16} /> },
                          { id: 'skills', label: 'Skills', icon: <Box size={16} />, hasArrow: true },
                          { id: 'style', label: 'Writing Style', icon: <Palette size={16} />, hasArrow: true },
                          { type: 'separator' },
                          { id: 'lumina_tools', label: 'Lumina Tools', icon: <Hammer size={16} />, hasArrow: true },
                          { id: 'tools', label: 'Bridge Tools', icon: <Wrench size={16} />, hasArrow: true },
                          { id: 'search', label: 'Web search', icon: <Globe size={16} />, isSelected: isWebSearchEnabled },
                        ].map((item, idx) => (
                          item.type === 'separator' ? (
                            <div key={idx} className="my-1 border-t border-[var(--theme-border)]" />
                          ) : (
                            <button
                              key={item.id}
                              onClick={() => {
                                switch (item.id) {
                                  case 'files':
                                    fileInputRef.current?.click();
                                    setIsPlusMenuOpen(false);
                                    break;
                                  case 'screenshot':
                                    handleScreenshot();
                                    break;
                                  case 'skills':
                                    setActivePlusSubMenu('skills');
                                    break;
                                  case 'style':
                                    setActivePlusSubMenu('style');
                                    break;
                                  case 'search':
                                    setIsWebSearchEnabled(prev => !prev);
                                    break;
                                  case 'lumina_tools':
                                    setActivePlusSubMenu('lumina_tools');
                                    break;
                                  case 'tools':
                                    setActivePlusSubMenu('tools');
                                    break;
                                }
                              }}
                              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-[var(--theme-secondary)] hover:bg-[var(--theme-hover-bg)] hover:text-[var(--theme-primary)] transition-colors group/item"
                            >
                              <div className="flex items-center gap-3">
                                <span className={`transition-colors ${(item as any).isSelected ? 'text-blue-500' : 'group-hover/item:text-[var(--theme-primary)]'}`}>{item.icon}</span>
                                {item.label}
                              </div>
                              <div className="flex items-center gap-2">
                                {(item as any).isSelected && <Check size={14} className="text-blue-500" />}
                                {(item as any).hasArrow && <ChevronRight size={14} className="text-[var(--theme-secondary)] group-hover/item:text-[var(--theme-primary)]" />}
                              </div>
                            </button>
                          )
                        ))}
                      </div>
                    ) : activePlusSubMenu === 'lumina_tools' ? (
                      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
                        <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--theme-border)] mb-1 shrink-0">
                          <button 
                            onClick={() => setActivePlusSubMenu('main')}
                            className="p-1 hover:bg-[var(--theme-hover-bg)] rounded-lg text-[var(--theme-secondary)] hover:text-[var(--theme-primary)] transition-colors"
                          >
                            <ChevronLeft size={16} />
                          </button>
                          <span className="text-[10px] font-bold text-[var(--theme-secondary)] uppercase tracking-widest">Lumina Tools</span>
                        </div>

                        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-0.5">
                          {luminaTools.map(tool => (
                            <button
                              key={tool.id}
                              onClick={() => {
                                setLuminaTools(prev => prev.map(t => t.id === tool.id ? { ...t, enabled: !t.enabled } : t));
                                showToast(`${tool.enabled ? 'Disabled' : 'Enabled'} ${tool.name}`);
                              }}
                              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium text-[var(--theme-secondary)] hover:bg-[var(--theme-hover-bg)] transition-colors group/tool"
                            >
                              <div className="flex items-center gap-3">
                                <div className={`p-1.5 rounded-lg transition-colors ${tool.enabled ? 'bg-[var(--theme-accent)]/10 text-[var(--theme-accent)]' : 'bg-[var(--theme-hover-bg)] text-[var(--theme-secondary)]'}`}>
                                  {tool.icon}
                                </div>
                                <div className="text-left">
                                  <div className={`transition-colors ${tool.enabled ? 'text-[var(--theme-primary)]' : 'text-[var(--theme-secondary)]'}`}>{tool.name}</div>
                                  <div className="text-[10px] text-[var(--theme-muted)] truncate w-32">{tool.description}</div>
                                </div>
                              </div>
                              <div className={`w-8 h-4 rounded-full transition-colors relative ${tool.enabled ? 'bg-[var(--theme-accent)]' : 'bg-[var(--theme-hover-bg)]'}`}>
                                <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${tool.enabled ? 'right-0.5' : 'left-0.5'}`} />
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : activePlusSubMenu === 'tools' ? (
                      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
                        <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--theme-border)] mb-1 shrink-0">
                          <button 
                            onClick={() => setActivePlusSubMenu('main')}
                            className="p-1 hover:bg-[var(--theme-hover-bg)] rounded-lg text-[var(--theme-secondary)] hover:text-[var(--theme-primary)] transition-colors"
                          >
                            <ChevronLeft size={16} />
                          </button>
                          <span className="text-[10px] font-bold text-[var(--theme-secondary)] uppercase tracking-widest">Bridge Tools</span>
                        </div>

                        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-0.5">
                          {bridgeTools.map(tool => (
                            <button
                              key={tool.id}
                              onClick={() => {
                                setBridgeTools(prev => prev.map(t => t.id === tool.id ? { ...t, enabled: !t.enabled } : t));
                                showToast(`${tool.enabled ? 'Disabled' : 'Enabled'} ${tool.name}`);
                              }}
                              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium text-[var(--theme-secondary)] hover:bg-[var(--theme-hover-bg)] transition-colors group/tool"
                            >
                              <div className="flex items-center gap-3">
                                <div className={`p-1.5 rounded-lg transition-colors ${tool.enabled ? 'bg-[var(--theme-accent)]/10 text-[var(--theme-accent)]' : 'bg-[var(--theme-hover-bg)] text-[var(--theme-secondary)]'}`}>
                                  {tool.icon}
                                </div>
                                <div className="text-left">
                                  <div className={`transition-colors ${tool.enabled ? 'text-[var(--theme-primary)]' : 'text-[var(--theme-secondary)]'}`}>{tool.name}</div>
                                  <div className="text-[10px] text-[var(--theme-muted)] truncate w-32">{tool.description}</div>
                                </div>
                              </div>
                              <div className={`w-8 h-4 rounded-full transition-colors relative ${tool.enabled ? 'bg-[var(--theme-accent)]' : 'bg-[var(--theme-hover-bg)]'}`}>
                                <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${tool.enabled ? 'right-0.5' : 'left-0.5'}`} />
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : activePlusSubMenu === 'skills' ? (
                      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
                        <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--theme-border)] mb-1 shrink-0">
                          <button 
                            onClick={() => setActivePlusSubMenu('main')}
                            className="p-1 hover:bg-[var(--theme-hover-bg)] rounded-lg text-[var(--theme-secondary)] hover:text-[var(--theme-primary)] transition-colors"
                          >
                            <ChevronLeft size={16} />
                          </button>
                          <span className="text-[10px] font-bold text-[var(--theme-secondary)] uppercase tracking-widest">Skills</span>
                        </div>
                        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-0.5">
                          {SKILLS.map(skill => (
                            <button
                              key={skill.id}
                              onClick={() => {
                                setActiveSkills(prev => 
                                  prev.includes(skill.id) 
                                    ? prev.filter(id => id !== skill.id) 
                                    : [...prev, skill.id]
                                );
                                showToast(`${activeSkills.includes(skill.id) ? 'Deactivated' : 'Activated'} ${skill.label}`);
                              }}
                              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-colors ${
                                activeSkills.includes(skill.id) 
                                  ? 'bg-[var(--theme-hover-bg)] text-[var(--theme-primary)]' 
                                  : 'text-[var(--theme-secondary)] hover:bg-[var(--theme-hover-bg)] hover:text-[var(--theme-primary)]'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`p-1.5 rounded-lg transition-colors ${activeSkills.includes(skill.id) ? 'bg-indigo-500/10 text-indigo-500' : 'bg-[var(--theme-hover-bg)] text-[var(--theme-secondary)]'}`}>
                                  {skill.icon}
                                </div>
                                {skill.label}
                              </div>
                              <div className={`w-8 h-4 rounded-full transition-colors relative ${activeSkills.includes(skill.id) ? 'bg-indigo-500' : 'bg-[var(--theme-hover-bg)]'}`}>
                                <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${activeSkills.includes(skill.id) ? 'right-0.5' : 'left-0.5'}`} />
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : activePlusSubMenu === 'style' ? (
                      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
                        <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--theme-border)] mb-1 shrink-0">
                          <button 
                            onClick={() => setActivePlusSubMenu('main')}
                            className="p-1 hover:bg-[var(--theme-hover-bg)] rounded-lg text-[var(--theme-secondary)] hover:text-[var(--theme-primary)] transition-colors"
                          >
                            <ChevronLeft size={16} />
                          </button>
                          <span className="text-[10px] font-bold text-[var(--theme-secondary)] uppercase tracking-widest">Writing Style</span>
                        </div>
                        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-0.5">
                          {WRITING_STYLES.map((style) => (
                            <button
                              key={style.id}
                              onClick={() => {
                                setWritingStyle(style.id);
                                setIsPlusMenuOpen(false);
                                setActivePlusSubMenu('main');
                              }}
                              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-colors ${
                                writingStyle === style.id 
                                  ? 'bg-[var(--theme-hover-bg)] text-[var(--theme-primary)]' 
                                  : 'text-[var(--theme-secondary)] hover:bg-[var(--theme-hover-bg)] hover:text-[var(--theme-primary)]'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`p-1.5 rounded-lg transition-colors ${writingStyle === style.id ? 'bg-blue-500/10 text-blue-500' : 'bg-[var(--theme-hover-bg)] text-[var(--theme-secondary)]'}`}>
                                  {style.icon}
                                </div>
                                {style.label}
                              </div>
                              {writingStyle === style.id && <Check size={14} className="text-blue-500" />}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Assistant Mode Selection Dropdown */}
            {isCoderMode && (
              <div className="relative" ref={modeDropdownRef}>
                <motion.button 
                  whileTap={{ scale: 0.95 }}
                  transition={{ duration: 0.08 }}
                  onClick={() => setIsModeDropdownOpen(!isModeDropdownOpen)}
                  className="flex items-center gap-1.5 px-3 py-2 hover:bg-[var(--theme-hover-bg)] rounded-2xl text-sm font-medium text-[var(--theme-secondary)] hover:text-[var(--theme-primary)] transition-all active:scale-95 cursor-pointer select-none"
                  title="Select Assistant Mode"
                >
                  <div className="shrink-0 flex items-center justify-center">
                    {activeAssistantMode === 'builder' && <Bot size={14} className="text-orange-500 animate-pulse" />}
                    {activeAssistantMode === 'planner' && <Layers size={14} className="text-violet-500" />}
                    {activeAssistantMode === 'debugger' && <Bug size={14} className="text-amber-500" />}
                  </div>
                  <span>
                    {activeAssistantMode === 'builder' ? 'Builder Mode' : activeAssistantMode === 'planner' ? 'Planner Mode' : 'Debugger Mode'}
                  </span>
                  <ChevronDown size={14} className="text-[var(--theme-muted)] transition-transform duration-200" style={{ transform: isModeDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
                </motion.button>

                <AnimatePresence>
                  {isModeDropdownOpen && (
                    <motion.div
                      ref={modeDropdownContentRef}
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      style={modeDropdownPosition.style}
                      className="fixed w-56 bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-2xl shadow-2xl z-[180] flex flex-col overflow-hidden text-left"
                    >
                      <div className="p-2 space-y-1">
                        {[
                          {
                            id: 'builder',
                            name: 'Builder Mode',
                            icon: <Bot size={13} />,
                            color: 'text-orange-500',
                            bgColor: 'bg-orange-500/10',
                            accentColor: 'bg-orange-500',
                          },
                          {
                            id: 'planner',
                            name: 'Planner Mode',
                            icon: <Layers size={13} />,
                            color: 'text-violet-500',
                            bgColor: 'bg-violet-500/10',
                            accentColor: 'bg-violet-500',
                          },
                          {
                            id: 'debugger',
                            name: 'Debugger Mode',
                            icon: <Bug size={13} />,
                            color: 'text-amber-500',
                            bgColor: 'bg-amber-500/10',
                            accentColor: 'bg-amber-500',
                          }
                        ].map((mode, idx) => {
                          const isActive = activeAssistantMode === mode.id;
                          return (
                            <motion.div
                              key={mode.id}
                              initial={{ opacity: 0, x: -8 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.05, type: 'spring', stiffness: 140 }}
                            >
                              <button
                                onClick={() => {
                                  setActiveAssistantMode(mode.id as any);
                                  setIsModeDropdownOpen(false);
                                  showToast(`Switched focus to ${mode.name}.`);
                                }}
                                className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-left transition-colors relative group/item cursor-pointer text-xs font-semibold ${
                                  isActive 
                                    ? 'bg-[var(--theme-hover-bg)]' 
                                    : 'hover:bg-[var(--theme-hover-bg)] text-[var(--theme-secondary)] hover:text-[var(--theme-primary)]'
                                }`}
                              >
                                <div className={`p-1.5 rounded-lg shrink-0 flex items-center justify-center ${isActive ? mode.color + ' ' + mode.bgColor : 'bg-[var(--theme-hover-bg)] text-[var(--theme-secondary)]'}`}>
                                  {mode.icon}
                                </div>
                                <span className={isActive ? mode.color : 'text-[var(--theme-primary)]'}>{mode.name}</span>
                                {isActive && (
                                  <div className="ml-auto flex items-center gap-1">
                                    <motion.div
                                      animate={{ scale: [1, 1.25, 1], opacity: [0.5, 1, 0.5] }}
                                      transition={{ repeat: Infinity, duration: 1.5 }}
                                      className={`w-1.5 h-1.5 rounded-full ${mode.accentColor}`}
                                    />
                                    <Check size={12} className="text-emerald-500 shrink-0" />
                                  </div>
                                )}
                              </button>
                            </motion.div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}


          </div>

          <div className="flex items-center gap-3">
            <div className="relative" ref={dropdownRef}>
              <motion.button 
                whileTap={{ scale: 0.95 }}
                transition={{ duration: 0.08 }}
                onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                className="flex items-center gap-1.5 px-3 py-2 hover:bg-[var(--theme-hover-bg)] rounded-2xl text-sm font-medium text-[var(--theme-secondary)] hover:text-[var(--theme-primary)] transition-all active:scale-95"
              >
                <span>{(activeModelList.find(m => m.id === activeModelId)?.name) || 'Select Model'}</span>
                <ChevronDown size={14} className={`transition-transform duration-200 ${isModelDropdownOpen ? 'rotate-180' : ''}`} />
              </motion.button>
              <AnimatePresence>
                {isModelDropdownOpen && (
                  <motion.div
                    ref={modelDropdownContentRef}
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    style={modelDropdownPosition.style}
                    className="fixed w-64 bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-2xl shadow-2xl z-[180] flex flex-col overflow-hidden text-left"
                  >
                    {availableModels.length > 5 && (
                      <div className="px-3 py-2 bg-[var(--theme-surface)] border-b border-[var(--theme-border)] shrink-0">
                        <div className="relative group">
                          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--theme-muted)]" />
                          <input 
                            type="text"
                            placeholder="Search models..."
                            value={modelSearchQuery}
                            onChange={(e) => setModelSearchQuery(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full h-8 pl-8 pr-3 bg-[var(--theme-hover-bg)] border border-[var(--theme-border)] rounded-xl text-[11px] outline-none placeholder-gray-600 text-[var(--theme-primary)]"
                          />
                        </div>
                      </div>
                    )}
                    <div className="h-[200px] overflow-y-auto p-1.5 space-y-0.5 custom-scrollbar shrink-0">
                      {activeModelList
                        .filter(m => m.name.toLowerCase().includes(modelSearchQuery.toLowerCase()))
                        .map((model) => (
                          <button
                            key={model.id}
                            onClick={() => {
                              setActiveModelId(model.id);
                              setIsModelDropdownOpen(false);
                              setModelSearchQuery('');
                            }}
                            className={`w-full h-[36px] flex items-center gap-3 px-3 rounded-xl text-xs font-medium transition-colors shrink-0 ${
                              activeModelId === model.id 
                                ? 'bg-[var(--theme-hover-bg)] text-[var(--theme-primary)] font-bold' 
                                : 'text-[var(--theme-secondary)] hover:bg-[var(--theme-hover-bg)] hover:text-[var(--theme-primary)]'
                            }`}
                          >
                            <div className={model.color || ''}>
                              {model.icon}
                            </div>
                            <div className="flex-1 text-left truncate">{model.name}</div>
                            {activeModelId === model.id && <Check size={12} className="text-[var(--theme-accent)] shrink-0" />}
                          </button>
                        ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={() => {
                showToast("Voice input is configured. Adjust sources in Settings > General.");
              }}
              className="p-1.5 rounded-2xl text-[var(--theme-secondary)] hover:text-[var(--theme-primary)] hover:bg-[var(--theme-hover-bg)] transition-all cursor-pointer mr-0.5 flex items-center justify-center shrink-0"
              title="Voice Input"
            >
              <Mic size={18} className="text-zinc-500 hover:text-zinc-300 transition-colors" />
            </motion.button>



            {isTyping ? (
              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={() => {
                  setIsTyping(false);
                  if (abortControllerRef.current) {
                    abortControllerRef.current.abort();
                  }
                }}
                className="w-10 h-10 rounded-2xl bg-[var(--theme-hover-bg)] border border-[var(--theme-border)] flex items-center justify-center text-[var(--theme-primary)] transition-all active:scale-95"
              >
                <StopCircle size={20} fill="currentColor" />
              </motion.button>
            ) : (
              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={() => handleSend()}
                disabled={!input.trim() && attachedFiles.length === 0}
                className={`
                  w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-sm cursor-pointer
                  ${input.trim() || attachedFiles.length > 0
                    ? 'bg-[var(--theme-accent)] text-white hover:scale-105 active:scale-95'
                    : 'bg-[var(--theme-hover-bg)] text-[var(--theme-muted)]'
                  }
                `}
              >
                <ArrowUp size={20} strokeWidth={3} />
              </motion.button>
            )}
          </div>
        </div>



        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf,.txt,.md,.csv,.js,.ts,.py"
          multiple
          className="hidden"
          onChange={(e) => {
            setAttachedFiles(prev => [...prev, ...Array.from(e.target.files || [])]);
            e.target.value = '';
          }}
        />
      </div>
    </div>
    );
  };

  if (showLogin) {
    return (
      <div id="login-page-container" className="flex flex-col items-center justify-center min-h-screen bg-[#060608] text-white p-6 relative overflow-hidden font-sans select-none w-full">
        {/* Glow Effects */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[100px] pointer-events-none animate-pulse" style={{ animationDelay: '2s' }} />

        {/* Floating particles background */}
        <div className="absolute inset-0 z-0 pointer-events-none opacity-40">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <circle cx="10%" cy="20%" r="2" fill="#3b82f6" className="animate-pulse" style={{ animationDuration: '3s' }} />
            <circle cx="85%" cy="15%" r="1.5" fill="#a855f7" className="animate-pulse" style={{ animationDuration: '4s' }} />
            <circle cx="75%" cy="80%" r="2" fill="#3b82f6" className="animate-pulse" style={{ animationDuration: '5s' }} />
            <circle cx="20%" cy="75%" r="1" fill="#c084fc" className="animate-pulse" style={{ animationDuration: '3s' }} />
          </svg>
        </div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md bg-zinc-900/60 backdrop-blur-2xl border border-zinc-800/80 rounded-3xl p-8 shadow-2xl relative z-10 flex flex-col items-center text-center"
        >
          {/* Logo */}
          <div className="w-14 h-14 rounded-2xl !bg-[#ffffff] !text-[#09090b] flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(255,255,255,0.15)]">
            <Sparkles size={28} className="!text-[#09090b]" />
          </div>

          <h1 className="text-2xl font-semibold tracking-tight text-white mb-2 font-sans select-none">
            Welcome to Lumina
          </h1>
          <p className="text-sm text-zinc-400 mb-8 font-sans select-none max-w-xs">
            Create your profile to initialize your persistent AI workspace and labs.
          </p>

          <form onSubmit={handleOnboardingSubmit} className="w-full space-y-5 text-left">
            <div className="space-y-2">
              <label htmlFor="login-name-input" className="text-xs font-semibold text-zinc-400 uppercase tracking-widest pl-1">
                Name
              </label>
              <input
                id="login-name-input"
                type="text"
                required
                value={loginName}
                onChange={(e) => setLoginName(e.target.value)}
                placeholder="Enter your name"
                className="w-full h-12 px-4 bg-zinc-950 border border-zinc-800 focus:border-zinc-700 rounded-xl text-sm outline-none transition-all focus:ring-4 focus:ring-zinc-800/40 text-white placeholder-zinc-500"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="login-age-input" className="text-xs font-semibold text-zinc-400 uppercase tracking-widest pl-1">
                Age
              </label>
              <input
                id="login-age-input"
                type="number"
                required
                min="1"
                max="120"
                value={loginAge}
                onChange={(e) => setLoginAge(e.target.value)}
                placeholder="Enter your age"
                className="w-full h-12 px-4 bg-zinc-950 border border-zinc-800 focus:border-zinc-700 rounded-xl text-sm outline-none transition-all focus:ring-4 focus:ring-zinc-800/40 text-white placeholder-zinc-500"
              />
            </div>

            {errorText && (
              <div className="text-xs text-rose-500 font-medium pl-1 animate-pulse">
                {errorText}
              </div>
            )}

            <button
              id="login-submit-button"
              type="submit"
              className="w-full h-12 mt-4 !bg-[#ffffff] !text-[#09090b] hover:!bg-[#e4e4e7] active:scale-[0.98] transition-all rounded-xl text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-[0_4px_20px_rgba(255,255,255,0.08)]"
            >
              Initialize Profile
              <ArrowRight size={16} strokeWidth={2.5} className="!text-[#09090b]" />
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-full bg-[var(--theme-bg)] text-[var(--theme-primary)] overflow-hidden relative">

      {isElectron && (
        <div className="h-9 shrink-0 flex items-center px-4 relative z-50" style={{ WebkitAppRegion: 'drag' } as any}>
          <div className="flex items-center gap-2" style={{ WebkitAppRegion: 'no-drag' } as any}>
            <button
              onClick={() => (window as any).__electronAPI.close()}
              className="w-3 h-3 rounded-full bg-red-500 hover:brightness-110 transition-all flex items-center justify-center group"
              title="Close"
            >
              <svg width="8" height="8" viewBox="0 0 8 8" className="opacity-0 group-hover:opacity-100 transition-opacity">
                <path d="M1.5 1.5L6.5 6.5M6.5 1.5L1.5 6.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" className="text-red-900" />
              </svg>
            </button>
            <button
              onClick={() => (window as any).__electronAPI.minimize()}
              className="w-3 h-3 rounded-full bg-yellow-500 hover:brightness-110 transition-all flex items-center justify-center group"
              title="Minimize"
            >
              <svg width="8" height="8" viewBox="0 0 8 8" className="opacity-0 group-hover:opacity-100 transition-opacity">
                <line x1="2" y1="4" x2="6" y2="4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" className="text-yellow-900" />
              </svg>
            </button>
            <button
              onClick={() => (window as any).__electronAPI.maximize()}
              className="w-3 h-3 rounded-full bg-green-500 hover:brightness-110 transition-all flex items-center justify-center group"
              title={isMaximized ? 'Restore' : 'Maximize'}
            >
              {isMaximized ? (
                <svg width="7" height="7" viewBox="0 1 8 8" className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <rect x="2.5" y="2.5" width="4.5" height="4.5" rx="0.5" fill="none" stroke="currentColor" strokeWidth="1" className="text-green-900" />
                  <rect x="1" y="1" width="4.5" height="4.5" rx="0.5" fill="none" stroke="currentColor" strokeWidth="1" className="text-green-900" />
                </svg>
              ) : (
                <svg width="8" height="8" viewBox="0 0 8 8" className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <rect x="1.5" y="1.5" width="5" height="5" rx="0.8" fill="none" stroke="currentColor" strokeWidth="1.2" className="text-green-900" />
                </svg>
              )}
            </button>
          </div>
        </div>
      )}

      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] md:hidden"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-72 bg-[var(--theme-sidebar)] border-r border-[var(--theme-sidebar-border)] z-[101] md:hidden flex flex-col p-4 shadow-2xl text-[var(--theme-primary)]"
            >
              <SidebarContent 
                chats={chats} 
                currentChatId={currentChatId} 
                setCurrentChatId={(id) => {
                  setCurrentChatId(id);
                  setIsMobileMenuOpen(false);
                }} 
                createNewChat={createNewChat} 
                setChats={setChats}
                onSelect={() => setIsMobileMenuOpen(false)}
                onOpenSettings={() => {
                  setIsSettingsOpen(true);
                  setIsMobileMenuOpen(false);
                }}
                userProfile={userProfile}
                setUserProfile={setUserProfile}
                projectFolders={projectFolders}
                setProjectFolders={setProjectFolders}
                activeLabTab={activeLabTab}
                setActiveLabTab={setActiveLabTab}
                activeProjectId={activeProjectId}
                setActiveProjectId={setActiveProjectId}
                isSidebarOpen={isSidebarOpen}
                setIsSidebarOpen={setIsSidebarOpen}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="flex flex-1 overflow-hidden">
      <motion.aside 
        animate={{ width: isSidebarOpen ? sidebarWidth : 0, opacity: isSidebarOpen ? 1 : 0 }}
        transition={{ 
          duration: isResizing ? 0 : (isSidebarOpen ? 0.22 : 0.18), 
          ease: isSidebarOpen ? "easeOut" : "linear" 
        }}
        className={`hidden md:flex flex-col border-r border-[var(--theme-sidebar-border)] bg-[var(--theme-sidebar)] relative group/sidebar text-[var(--theme-primary)]`}
      >
        <div className="h-full flex flex-col p-4 shrink-0 overflow-hidden" style={{ width: sidebarWidth }}>
          <SidebarContent 
            chats={chats} 
            currentChatId={currentChatId} 
            setCurrentChatId={setCurrentChatId} 
            createNewChat={createNewChat} 
            setChats={setChats}
            onOpenSettings={() => setIsSettingsOpen(true)}
            userProfile={userProfile}
            setUserProfile={setUserProfile}
            projectFolders={projectFolders}
            setProjectFolders={setProjectFolders}
            activeLabTab={activeLabTab}
            setActiveLabTab={setActiveLabTab}
            activeProjectId={activeProjectId}
            setActiveProjectId={setActiveProjectId}
            isSidebarOpen={isSidebarOpen}
            setIsSidebarOpen={setIsSidebarOpen}
          />
        </div>
        
        {isSidebarOpen && (
          <div
            onMouseDown={(e) => {
              e.preventDefault();
              setIsResizing(true);
            }}
            className="absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-blue-500/20 active:bg-blue-500/40 transition-colors z-50 group/resizer"
          >
            <div className={`absolute top-0 right-0 w-[2px] h-full transition-colors ${isResizing ? 'bg-blue-500' : 'bg-transparent group-hover/resizer:bg-blue-500/50'}`} />
          </div>
        )}
      </motion.aside>

      <main className="flex-1 flex flex-col relative h-full min-w-0 bg-[var(--theme-bg)] text-[var(--theme-primary)] transition-colors duration-300">

        {!isCoderMode && (
          <header className={`h-14 border-b border-[var(--theme-border)]/40 flex items-center justify-between px-4 md:px-6 bg-[var(--theme-bg)]/80 backdrop-blur-md transition-all duration-300 ease-in-out ${
            autoHideTopBar 
              ? 'absolute top-0 left-0 right-0 z-[160] transform -translate-y-[48px] hover:translate-y-0 opacity-0 hover:opacity-100 hover:shadow-lg' 
              : 'sticky top-0 z-[150] shrink-0 opacity-100 shadow-none'
          }`}>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setIsMobileMenuOpen(true)}
                className="md:hidden p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors text-gray-500"
              >
                <SidebarIcon size={20} />
              </button>
              <button 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="hidden md:flex p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors text-gray-500 cursor-pointer"
                title={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
              >
                <SidebarIcon size={20} />
              </button>
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-400 truncate ml-2">
                {isPhysicsTabActive 
                  ? `${activeLabTab ? activeLabTab.charAt(0).toUpperCase() + activeLabTab.slice(1) : 'Physics'} Laboratory`
                  : 'Lumina Intelligence'
                }
              </h2>
            </div>
            <div className="flex items-center gap-4">
              {!isPhysicsTabActive && (
                <div className="relative flex items-center">
                  <AnimatePresence>
                    {isSearchOpen && (
                      <motion.div
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: 200, opacity: 1 }}
                        exit={{ width: 0, opacity: 0 }}
                        className="absolute right-full mr-2"
                      >
                        <input 
                          autoFocus
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search messages..."
                          className="w-full h-9 px-4 bg-gray-100 dark:bg-zinc-800 border-none rounded-full text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <button 
                    onClick={() => setIsSearchOpen(!isSearchOpen)}
                    className={`p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors ${isSearchOpen ? 'text-blue-500 bg-gray-100 dark:bg-white/5' : 'text-gray-500'}`}
                  >
                    <Search size={18} />
                  </button>
                </div>
              )}
              {isCoderMode && (
                <button
                  onClick={() => setIsCoderWorkspacePanelOpen(!isCoderWorkspacePanelOpen)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all text-xs font-semibold shadow-sm cursor-pointer border ${
                    isCoderWorkspacePanelOpen 
                      ? 'bg-teal-500 text-slate-950 border-teal-400' 
                      : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:text-white'
                  }`}
                  title="Toggle Coder Workspace Side Panel"
                >
                  <Code size={13} className={isCoderWorkspacePanelOpen ? 'animate-pulse' : ''} />
                  <span>Workspace Panel</span>
                </button>
              )}
              <div className="relative" ref={headerMenuRef}>
                <button 
                  onClick={() => setIsHeaderMenuOpen(!isHeaderMenuOpen)}
                  className={`p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors ${isHeaderMenuOpen ? 'text-black dark:text-white bg-gray-100 dark:bg-white/5' : 'text-gray-500'}`}
                >
                  <MoreVertical size={18} />
                </button>
                <AnimatePresence>
                  {isHeaderMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute top-full right-0 mt-2 w-56 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden z-[160] p-1.5"
                    >
                      {[
                        { id: 'coder_mode', label: isCoderMode ? 'Turn off Coder Mode' : 'Turn on Coder Mode', icon: <Code size={16} className={isCoderMode ? 'text-teal-500' : ''} />, onClick: () => { 
                          const nextState = !isCoderMode;
                          setIsCoderMode(nextState);
                          setIsCoderWorkspacePanelOpen(nextState);
                          if (nextState) {
                            setIsSidebarOpen(false);
                          }
                          if (currentChatId) {
                            setChats(prev => prev.map(chat => {
                              if (chat.id === currentChatId) {
                                return {
                                  ...chat,
                                  isCoderMode: nextState,
                                  updatedAt: new Date()
                                };
                              }
                              return chat;
                            }));
                          }
                          setIsHeaderMenuOpen(false);
                        } },
                        { id: 'physics_lab', label: 'Physics Lab', icon: <Activity size={16} className="text-blue-500 animate-pulse" />, onClick: () => { setActiveLabTab('physics'); setCurrentChatId(null); setIsHeaderMenuOpen(false); } },
                        { id: 'chemistry_lab', label: 'Chemistry Lab', icon: <Beaker size={16} className="text-emerald-500" />, onClick: () => { setActiveLabTab('chemistry'); setCurrentChatId(null); setIsHeaderMenuOpen(false); } },
                        { id: 'math_lab', label: 'Math Lab', icon: <Compass size={16} className="text-purple-500" />, onClick: () => { setActiveLabTab('math'); setCurrentChatId(null); setIsHeaderMenuOpen(false); } },
                        { id: 'biology_lab', label: 'Biology Lab', icon: <Flower2 size={16} className="text-rose-500" />, onClick: () => { setActiveLabTab('biology'); setCurrentChatId(null); setIsHeaderMenuOpen(false); } },
                        { id: 'settings', label: 'Settings', icon: <Settings size={16} />, onClick: () => { setIsSettingsOpen(true); setIsHeaderMenuOpen(false); } },
                        { id: 'account', label: 'Account', icon: <User size={16} />, onClick: () => { setIsHeaderMenuOpen(false); } },
                        { id: 'mcp', label: 'Bridge Tools', icon: <HardDrive size={16} className={isMcpConnected ? 'text-blue-500' : ''} />, onClick: () => { setActiveSettingsTab('mcp'); setIsSettingsOpen(true); setIsHeaderMenuOpen(false); } },
                      ].map((item) => (
                        <button
                          key={item.id}
                          onClick={item.onClick}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-black dark:hover:text-white transition-colors"
                        >
                          {item.icon}
                          {item.label}
                        </button>
                      ))}
                      <div className="my-1.5 border-t border-gray-100 dark:border-white/5" />
                      <button
                        onClick={() => { setActiveSettingsTab('general'); setIsSettingsOpen(true); setIsHeaderMenuOpen(false); }} style={{ display: 'none' }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-gray-605 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-black dark:hover:text-white transition-colors"
                      >
                        <Palette size={16} />
                        Themes
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </header>
        )}

        {isCoderMode ? (
          <div className="flex-1 flex overflow-hidden bg-[#0A0908] text-[#EDE6DD] h-full relative font-sans">
            {/* LEFT PANEL: File Explorer (VS Code Styled collapsible sidebar) */}
            <AnimatePresence>
              {isCoderLeftPanelOpen && (
                <motion.div
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 280, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.22, ease: 'easeOut' }}
                  className="h-full border-r border-[#221B17] bg-[#110E0D] flex flex-col overflow-hidden shrink-0 z-10 shadow-xl"
                >
                  <CoderLeftExplorer 
                    workspaceRefreshKey={workspaceRefreshKey}
                    triggerWorkspaceRefresh={triggerWorkspaceRefresh}
                    showToast={showToast}
                    onSelectFile={(filePath) => {
                      setFloatingEditFile(filePath);
                      const rel = filePath.replace(/\\/g, '/').split('coder/').pop() || '';
                      if (rel.endsWith('.html') || rel.endsWith('.htm')) {
                        setRightPreviewSubpath(rel);
                      }
                    }}
                  />
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
                      onClick={() => setIsCoderLeftPanelOpen(!isCoderLeftPanelOpen)}
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
                      onClick={() => setIsSidebarOpen(!isSidebarOpen)}
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

                  {/* Back and Forward navigation controls as requested in mockup */}
                  <div className="flex items-center gap-1.5 select-none">
                    <button className="p-1 text-[#AD9F91] hover:text-white transition-colors cursor-pointer" title="Go Back">
                      <ChevronLeft size={16} />
                    </button>
                    <button className="p-1 text-[#AD9F91] hover:text-white transition-colors cursor-pointer" title="Go Forward">
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>

                {/* Center instance indicator */}
                <div className="text-[11px] font-mono font-semibold tracking-wide text-zinc-500 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse"></span>
                  <span>CODER WORKSPACE ACTIVE</span>
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
                    onClick={() => setIsCoderRightPanelOpen(!isCoderRightPanelOpen)}
                    className={`p-2 rounded-lg border transition-all cursor-pointer flex items-center justify-center ${
                      isCoderRightPanelOpen 
                        ? 'bg-[#D97756]/15 text-[#D97756] border-[#D97756]/40 shadow-inner scale-95' 
                        : 'bg-[#0E0C0B]/40 border-[#2C241E] text-[#9B8C7D] hover:text-[#EDE6DD] hover:bg-[#1D1917] hover:border-[#2C241E]'
                    }`}
                    title={isCoderRightPanelOpen ? "Collapse App Live Preview" : "Expand App Live Preview"}
                  >
                    <Play size={14} className={isCoderRightPanelOpen ? 'animate-pulse text-[#D97756]' : ''} />
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
                            setIsSourcesPanelOpen={() => {}}
                            setSourcesPanelMessageId={() => {}}
                            setActiveArtifact={handleSetActiveArtifact}
                            setIsCanvasOpen={handleSetIsCanvasOpen}
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
                          onClick={() => setElizaToggleSignal(s => s + 1)}
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
                            setWorkspaceRefreshKey(k => k + 1);
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
                        onToast={showToast} 
                        triggerRefresh={() => setWorkspaceRefreshKey(k => k + 1)}
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
              {isCoderRightPanelOpen && (
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
                  <div className="flex items-center justify-between px-3.5 py-2 bg-zinc-950 border-b border-zinc-900/80 shrink-0 select-none">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span className="text-xs font-bold uppercase tracking-wider text-zinc-350">Live Preview</span>
                      </div>
                    </div>

                    {/* Viewport controls */}
                    <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-0.5">
                      <button
                        onClick={() => setRightViewportMode('desktop')}
                        className={`p-1.5 rounded-md transition-all cursor-pointer ${
                          rightViewportMode === 'desktop'
                            ? 'bg-[#D97756]/20 border border-[#D97756]/30 text-[#D97756]'
                            : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                        }`}
                        title="Desktop View"
                      >
                        <Monitor size={11} />
                      </button>
                      <button
                        onClick={() => setRightViewportMode('tablet')}
                        className={`p-1.5 rounded-md transition-all cursor-pointer ${
                          rightViewportMode === 'tablet'
                            ? 'bg-[#D97756]/20 border border-[#D97756]/30 text-[#D97756]'
                            : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                        }`}
                        title="Tablet View (768px Width)"
                      >
                        <Tablet size={11} />
                      </button>
                      <button
                        onClick={() => setRightViewportMode('mobile')}
                        className={`p-1.5 rounded-md transition-all cursor-pointer ${
                          rightViewportMode === 'mobile'
                            ? 'bg-[#D97756]/20 border border-[#D97756]/30 text-[#D97756]'
                            : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                        }`}
                        title="Mobile View (390px Width)"
                      >
                        <Smartphone size={11} />
                      </button>
                      
                      <div className="w-[1px] h-3 bg-zinc-800 mx-1" />

                      {/* Alignment Grid Overlay Toggle */}
                      <button
                        onClick={() => setRightIsGridEnabled(!rightIsGridEnabled)}
                        className={`p-1.5 rounded-md transition-all cursor-pointer ${
                          rightIsGridEnabled
                            ? 'bg-[#D97756]/20 border border-[#D97756]/30 text-[#D97756]'
                            : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                        }`}
                        title="Toggle Measurement Grid Overlay"
                      >
                        <Grid size={11} />
                      </button>

                      {/* Element Inspector Select Tool */}
                      <button
                        onClick={() => setRightIsInspectMode(!rightIsInspectMode)}
                        className={`p-1.5 rounded-md transition-all cursor-pointer ${
                          rightIsInspectMode
                            ? 'bg-teal-500/10 border border-teal-500/30 text-teal-400 animate-pulse'
                            : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                        }`}
                        title={rightIsInspectMode ? "Click an element inside preview to select, or click here to cancel" : "Inspect & Select Element from Live Preview to attach to chat"}
                      >
                        <MousePointerClick size={11} className={rightIsInspectMode ? "text-teal-400" : ""} />
                      </button>

                    </div>

                    <div className="flex items-center gap-1.5">
                      <button 
                        onClick={() => setIframeKey(k => k + 1)}
                        className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition-all cursor-pointer"
                        title="Force reload preview frame"
                      >
                        <RefreshCw size={12} />
                      </button>
                    </div>
                  </div>

                  {/* Frame Container */}
                  <div className="flex-1 overflow-auto flex items-center justify-center p-4 bg-[#070606] relative">
                    {/* Measurement Grid Overlay */}
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
                      <iframe
                        ref={rightIframeRef}
                        key={iframeKey}
                        src={`/coder-preview/${rightPreviewSubpath ? rightPreviewSubpath.replace(/^\//, '') : ''}?t=${iframeKey}`}
                        className="w-full h-full border-none bg-white"
                        referrerPolicy="no-referrer"
                        title="Workspace App Preview"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
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
                          onClick={() => setElizaToggleSignal(s => s + 1)}
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
                          onClick={() => setWorkspaceRefreshKey(k => k + 1)}
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
                        onToast={showToast} 
                        triggerRefresh={() => setWorkspaceRefreshKey(k => k + 1)}
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

            {/* Floating manual Whiteboard popup panel */}
            <AnimatePresence>
              {isWhiteboardOpen && (
                <div className="fixed inset-0 bg-[#0F0D0C]/85 backdrop-blur-md flex items-center justify-center z-[202] p-4 md:p-6 select-none animate-fade-in animate-duration-200">
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.96, y: 16 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, y: 16 }}
                    transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                    className="w-full max-w-5xl h-[82vh] bg-[#141211] border border-[#2D241E] rounded-2xl flex flex-col overflow-hidden shadow-[0_32px_80px_rgba(10,8,7,0.85)] relative font-sans"
                  >
                    {/* Soft ambient glow backing */}
                    <div className="absolute top-0 left-0 w-64 h-64 bg-[#D97756]/5 rounded-full blur-[70px] pointer-events-none" />
                    <div className="absolute bottom-0 right-0 w-64 h-64 bg-teal-500/3 rounded-full blur-[70px] pointer-events-none" />

                    {/* Header */}
                    <div className="h-14 border-b border-[#2C241E] bg-[#1F1917]/95 px-5 flex items-center justify-between shrink-0 relative z-10 select-none backdrop-blur-sm">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-[#D97756]/15 text-[#D97756] border border-[#D97756]/20">
                          <Palette size={16} />
                        </div>
                        <div className="flex flex-col text-left">
                          <span className="text-xs font-bold text-[#EDE6DD] tracking-wider uppercase font-sans">
                            Collaborative Whiteboard
                          </span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
                            <span className="text-[10px] font-mono text-[#AD9F91]">
                              Whiteboard Popup Mode
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setIsWhiteboardOpen(false)}
                          className="p-2 hover:bg-[#2A2420] border border-[#2F2722] bg-[#1C1816]/50 rounded-lg text-[#AD9F91] hover:text-white transition-all cursor-pointer"
                          title="Close Whiteboard Popup"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Collaborative Whiteboard canvas */}
                    <div className="flex-1 min-h-0 bg-[#141211]">
                      <Whiteboard />
                    </div>

                    {/* Footer Info Bar */}
                    <div className="h-9 border-t border-[#2C241E] bg-[#0F0E0D] px-5 flex items-center justify-between text-[10px] text-[#7F7469] font-mono shrink-0 select-none">
                      <span>Interactive vector drawing platform</span>
                      <span>Press ESC or click outside to dismiss</span>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </div>
        ) : isPhysicsTabActive ? (
          <div className="flex-1 flex flex-col overflow-hidden relative min-h-0 bg-[var(--theme-bg)]">
            {activeLabTab === 'physics' && (
              <PhysicsGraphCanvas 
                isOpen={false} 
                isInline={true} 
                onClose={() => setActiveLabTab(null)} 
              />
            )}
            {activeLabTab === 'chemistry' && (
              <ChemistryLabCanvas 
                onClose={() => setActiveLabTab(null)} 
                isInline={true}
              />
            )}
            {activeLabTab === 'math' && (
              <MathLabCanvas 
                onClose={() => setActiveLabTab(null)} 
                isInline={true}
              />
            )}
            {activeLabTab === 'biology' && (
              <BiologyLabCanvas 
                onClose={() => setActiveLabTab(null)} 
                isInline={true}
              />
            )}
          </div>
        ) : (
          <>
            <div className={`flex-1 flex overflow-hidden ${isModelDropdownOpen || isPlusMenuOpen ? 'relative z-20' : 'z-auto'}`}>
              <div 
                ref={scrollRef}
                className="flex-1 overflow-y-auto px-4 md:px-0 py-8 custom-scrollbar scroll-smooth"
              >
                <div className="mx-auto space-y-8 pb-24 max-w-4xl xl:max-w-[1100px]">
                  <AnimatePresence initial={false}>
                    {messages.length === 0 ? (
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4 relative w-full"
                      >
                        {activeProjectId && projectFolders.find(p => p.id === activeProjectId) ? (
                          <>
                            <div className="flex items-center gap-3.5 justify-center mb-10 select-none">
                              <Folder className="text-zinc-200 shrink-0" size={36} />
                              <span className="text-3xl font-medium text-zinc-150 tracking-tight font-sans">
                                {projectFolders.find(p => p.id === activeProjectId)?.name}
                              </span>
                            </div>
                          </>
                        ) : theme.id === 'claude' ? (
                          <>
                            <div className="flex items-center gap-1 text-[11px] text-zinc-500 mb-6 select-none font-medium">
                              <span>You are out of free messages until 1:10 AM</span>
                            </div>
                          </>
                        ) : (
                          <>
                            <motion.div 
                              animate={{ scale: [1, 1.05, 1] }}
                              transition={{ duration: 4, repeat: Infinity }}
                              className="w-16 h-16 bg-gray-50 border border-gray-100 dark:border-white/5 rounded-full flex items-center justify-center text-black dark:text-white dark:bg-zinc-900 mb-6 shadow-sm overflow-hidden animate-active-ring"
                            >
                              {userProfile.avatar ? (
                                <img src={userProfile.avatar} alt={userProfile.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                <span className="font-bold text-lg font-display">{userProfile.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}</span>
                              )}
                            </motion.div>
                            <h1 className="text-4xl font-display font-medium text-gray-900 dark:text-white mb-3 tracking-tight">
                              Welcome back, {userProfile.name}
                            </h1>
                            <p className="text-gray-500 dark:text-gray-400 max-w-sm mb-6">
                              Modern intelligence, refined interface.
                            </p>
                          </>
                        )}
                      </motion.div>
                    ) : (
                      messages.map((message) => (
                        <MessageItem
                          key={message.id}
                          message={message}
                          markdownComponents={markdownComponents}
                          userProfile={userProfile}
                          persona={persona}
                          isSourcesPanelOpen={false}
                          setIsSourcesPanelOpen={() => {}}
                          setSourcesPanelMessageId={() => {}}
                          setActiveArtifact={handleSetActiveArtifact}
                          setIsCanvasOpen={handleSetIsCanvasOpen}
                          setCanvasView={handleSetCanvasView}
                          onOpenInEditor={setFloatingEditFile}
                          showToast={showToast}
                          onUpdateTodoPlan={handleUpdateTodoPlan}
                          onStartBuilding={handleStartBuildingBtn}
                          scrapingResults={scrapingResults}
                          wikiResults={wikiResults}
                          onSendMessage={handleSend}
                        />
                      ))
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <AnimatePresence>
                {showScrollButton && (
                  <motion.button
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    transition={{ duration: 0.2 }}
                    onClick={() => {
                      if (scrollRef.current) {
                        scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
                      }
                    }}
                    className="absolute bottom-32 right-8 p-3 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-white/10 rounded-full shadow-2xl text-gray-500 hover:text-black dark:hover:text-white z-40"
                  >
                    <ArrowUp size={20} />
                  </motion.button>
                )}
              </AnimatePresence>

              {isCoderMode && isCoderWorkspacePanelOpen && (
                <div className="w-[450px] lg:w-[500px] h-full shrink-0 border-l border-[var(--theme-border)] bg-[var(--theme-surface-alt)] z-10">
                  <CoderWorkspacePanel 
                    workspaceRefreshKey={workspaceRefreshKey} 
                    triggerWorkspaceRefresh={triggerWorkspaceRefresh}
                    showToast={showToast}
                    onInsertAttachedText={insertAttachedContent}
                  />
                </div>
              )}
            </div>

            <div className="px-6 pb-6 pt-2 z-30 shrink-0 select-none bg-transparent border-transparent">
              <div className={`mx-auto relative flex flex-col gap-2 transition-all duration-300 ${
                messages.length === 0 
                  ? 'max-w-xl md:max-w-2xl' 
                  : 'max-w-4xl xl:max-w-[1100px]'
              }`}>
                {renderChatBox(messages.length === 0)}
                <div className="text-center">
                  <span className="text-[10px] text-zinc-500/80 font-medium tracking-tight">Claude is AI and can make mistakes. Please double-check responses.</span>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
      </div>

      <AnimatePresence>
        {isSettingsOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSettingsOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-3xl h-[520px] bg-white dark:bg-zinc-900 text-brand-primary dark:text-white rounded-3xl shadow-2xl overflow-hidden flex"
            >
              <div className="w-56 border-r border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-zinc-950/20 p-6 flex flex-col">
                <h2 className="text-xl font-display font-semibold mb-8">Settings</h2>
                <nav className="space-y-1 flex-1">
                  {[
                    { id: 'general', label: 'General', icon: <Settings size={16} /> },
                    { id: 'profile', label: 'My Profile', icon: <User size={16} /> },
                    { id: 'ai', label: 'AI Service', icon: <Sparkles size={16} /> },
                    { id: 'search', label: 'Search', icon: <Search size={16} /> },
                    { id: 'persona', label: 'Persona', icon: <User size={16} /> },
                    { id: 'lumina_tools', label: 'Lumina Tools', icon: <Hammer size={16} /> },
                    { id: 'bridge', label: 'Llama Bridge', icon: <Terminal size={16} /> },
                    { id: 'mcp', label: 'MCP Tools', icon: <HardDrive size={16} /> },

                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveSettingsTab(tab.id as any)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                        activeSettingsTab === tab.id 
                          ? 'bg-white dark:bg-zinc-800 text-black dark:text-white shadow-sm border border-gray-100 dark:border-white/10' 
                          : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5'
                      }`}
                    >
                      {tab.icon}
                      {tab.label}
                    </button>
                  ))}
                </nav>
                <div className="mt-auto">
                  <div className="flex items-center gap-3 p-2 bg-white dark:bg-zinc-800 rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm">
                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-xs">
                      AR
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-semibold truncate">Abdur Ramiz</div>
                      <div className="text-[10px] text-gray-400 truncate uppercase">Pro</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex-1 flex flex-col min-w-0">
                <div className="flex items-center justify-end p-6 pb-0">
                  <button 
                    onClick={() => setIsSettingsOpen(false)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors text-gray-500"
                  >
                    <Plus size={20} className="rotate-45" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 pt-4 custom-scrollbar">
                  {activeSettingsTab === 'general' && (
                    <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
                      <div>
                        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-6">Appearance</h3>
                        <div className="space-y-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-sm" style={{ display: 'none' }}>Theme</div>
                              <div className="text-xs text-gray-400" style={{ display: 'none' }}>Customize colors and appearance</div>
                            </div>
                            <button
                              onClick={() => {}} style={{ display: 'none' }}
                              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-500 hover:bg-blue-600 text-white transition-colors"
                            >
                              Open Themes
                            </button>
                          </div>
                           <div className="flex items-center justify-between">
                             <div>
                               <div className="font-medium text-sm">Bubble Chat</div>
                               <div className="text-xs text-gray-400">Use classic message bubbles or linear layout</div>
                             </div>
                             <button 
                               onClick={() => {
                                 const nextVal = !useBubbles;
                                 setUseBubbles(nextVal);
                                 localStorage.setItem('lumina_use_bubbles', nextVal.toString());
                               }}
                               className={`w-12 h-6 rounded-full transition-all relative ${useBubbles ? 'bg-blue-600' : 'bg-gray-200'}`}
                             >
                               <motion.div 
                                 animate={{ x: useBubbles ? 24 : 4 }}
                                 className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm"
                               />
                             </button>
                           </div>
                           <div className="flex items-center justify-between">
                             <div>
                               <div className="font-medium text-sm">Compact Sidebar</div>
                               <div className="text-xs text-gray-400">Reduce sidebar width automatically</div>
                             </div>
                             <button 
                               onClick={() => {
                                 const nextVal = !isCompactSidebar;
                                 setIsCompactSidebar(nextVal);
                                 localStorage.setItem('lumina_compact_sidebar', nextVal.toString());
                               }}
                               className={`w-12 h-6 rounded-full transition-all relative ${isCompactSidebar ? 'bg-blue-600' : 'bg-gray-200'}`}
                             >
                               <motion.div 
                                 animate={{ x: isCompactSidebar ? 24 : 4 }}
                                 className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm"
                               />
                             </button>
                           </div>
                           <div className="flex items-center justify-between">
                             <div>
                               <div className="font-medium text-sm">Stop Top Bar From Hiding</div>
                               <div className="text-xs text-gray-400">Keep the main header panel always visible at the top</div>
                             </div>
                             <button 
                               onClick={() => {
                                 const nextVal = !autoHideTopBar;
                                 setAutoHideTopBar(nextVal);
                                 localStorage.setItem('lumina_auto_hide_top_bar', nextVal.toString());
                               }}
                               className={`w-12 h-6 rounded-full transition-all relative ${!autoHideTopBar ? 'bg-blue-600' : 'bg-gray-200'}`}
                             >
                               <motion.div 
                                 animate={{ x: !autoHideTopBar ? 24 : 4 }}
                                 className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm"
                               />
                             </button>
                           </div>
                        </div>
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-6">Bridge</h3>
                        <div className="space-y-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-sm">Llama Tools</div>
                              <div className="text-xs text-gray-400">Use tools from Llama Bridge</div>
                            </div>
                            <button 
                              onClick={() => {
                                const next = !useBridgeTools;
                                setUseBridgeTools(next);
                                localStorage.setItem('lumina_bridge_enabled', next.toString());
                              }}
                              className={`w-12 h-6 rounded-full transition-all relative ${useBridgeTools ? 'bg-blue-600' : 'bg-gray-200'}`}
                            >
                              <motion.div 
                                animate={{ x: useBridgeTools ? 24 : 4 }}
                                className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm"
                              />
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {activeSettingsTab === 'ai' && (
                    <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
                      <div>
                        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-6">AI Service Configuration</h3>
                        <div className="space-y-5">
                          <div className="space-y-2">
                            <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Provider Preset</label>
                            <div className="relative mb-2">
                              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                              <input
                                type="text"
                                value={providerSearchQuery}
                                onChange={(e) => setProviderSearchQuery(e.target.value)}
                                placeholder="Type provider name (e.g. OpenAI, DeepSeek, Gemini)..."
                                className="w-full h-11 pl-9 pr-3 text-sm bg-gray-50 dark:bg-zinc-950 border border-gray-100 dark:border-white/5 rounded-xl focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                              />
                            </div>

                            {/* Simple text lists for matching providers to avoid bulkiness */}
                            {providerSearchQuery.trim().length > 0 && (
                              <div className="space-y-1.5 pt-1">
                                {(() => {
                                  const query = providerSearchQuery.trim().toLowerCase();
                                  const matches = CLOUD_PROVIDERS.filter(p => 
                                    p.label.toLowerCase().includes(query) || p.id.toLowerCase().includes(query)
                                  );
                                  
                                  if (matches.length === 0) {
                                    return (
                                      <p className="text-xs text-red-400 font-medium pl-1">
                                        No matching provider preset found. You can configure a custom endpoint below.
                                      </p>
                                    );
                                  }
                                  
                                  return (
                                    <div className="border border-gray-100 dark:border-white/5 rounded-xl bg-gray-50/50 dark:bg-white/[0.02] p-2 space-y-1">
                                      <p className="text-[10px] uppercase tracking-wider text-gray-450 dark:text-gray-400 font-semibold px-2 py-0.5">
                                        Available Matching Presets
                                      </p>
                                      {matches.map(p => (
                                        <button
                                          key={p.id}
                                          onClick={() => {
                                            handleProviderSelect(p.id);
                                            setProviderSearchQuery(p.label);
                                          }}
                                          className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                                            selectedProvider === p.id 
                                              ? 'bg-blue-500/10 text-blue-500' 
                                              : 'hover:bg-gray-100 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300'
                                          }`}
                                        >
                                          <span>{p.label} Preset</span>
                                          {selectedProvider === p.id ? (
                                            <span className="text-[10px] text-blue-500 flex items-center gap-1">
                                              <Check size={11} /> Selected & Loaded
                                            </span>
                                          ) : (
                                            <span className="text-[10px] text-gray-400">Click to Select</span>
                                          )}
                                        </button>
                                      ))}
                                    </div>
                                  );
                                })()}
                              </div>
                            )}

                            {selectedProvider !== 'custom' && (
                              <p className="text-[11.5px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 pl-1 py-1 pr-1 font-medium bg-emerald-500/[0.03] rounded-lg mt-1">
                                <Check size={13} /> Active Preset: <span className="font-bold underline">{CLOUD_PROVIDERS.find(p => p.id === selectedProvider)?.label}</span> (Endpoint auto-filled)
                              </p>
                            )}
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[11px] font-medium text-gray-500">Endpoint URL</label>
                            <input 
                              type="text" 
                              value={serverUrl}
                              onChange={(e) => { setServerUrl(e.target.value); setIsAiSaved(false); setSelectedProvider('custom'); }}
                              placeholder="http://localhost:8080/v1"
                              className="w-full h-11 px-4 text-sm bg-gray-50 dark:bg-zinc-950 border border-gray-100 dark:border-white/5 rounded-xl focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[11px] font-medium text-gray-500">API Key</label>
                            <input 
                              type="password" 
                              value={apiKey}
                              onChange={(e) => { setApiKey(e.target.value); setIsAiSaved(false); }}
                              placeholder={selectedProvider === 'custom' ? 'Enter your API key' : `Enter your ${CLOUD_PROVIDERS.find(p=>p.id===selectedProvider)?.label} API key`}
                              className="w-full h-11 px-4 text-sm bg-gray-50 dark:bg-zinc-950 border border-gray-100 dark:border-white/5 rounded-xl focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                            />
                          </div>

                          <div className="flex gap-3">
                            <button
                              onClick={handleVerifyAI}
                              disabled={aiVerificationState === 'verifying'}
                              className={`flex-1 h-11 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                                aiVerificationState === 'success' 
                                  ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                                  : aiVerificationState === 'error'
                                    ? 'bg-red-500/10 text-red-500 border border-red-500/20'
                                    : 'bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5'
                              }`}
                            >
                              {aiVerificationState === 'verifying' ? (
                                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
                              ) : null}
                              {aiVerificationState === 'success' ? <Check size={16} /> : null}
                              {aiVerificationState === 'error' ? <X size={16} /> : null}
                              {aiVerificationState === 'verifying' ? 'Verifying...' : aiVerificationState === 'success' ? 'Verified' : aiVerificationState === 'error' ? 'Failed' : 'Verify Connection'}
                            </button>
                            <button
                              onClick={handleSaveAI}
                              className={`flex-1 h-11 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                                isAiSaved 
                                  ? 'bg-emerald-500 text-white' 
                                  : 'bg-black dark:bg-white text-white dark:text-black shadow-lg shadow-black/10 hover:opacity-90'
                              }`}
                            >
                              {isAiSaved ? <Check size={16} /> : null}
                              {isAiSaved ? 'Saved' : 'Save Changes'}
                            </button>
                          </div>

                          <div className="p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/20 rounded-2xl">
                            <div className="flex gap-3">
                              <Sparkles size={16} className="text-blue-500 mt-0.5" />
                              <p className="text-xs text-blue-800 dark:text-blue-300 leading-relaxed">
                                {selectedProvider === 'custom'
                                  ? 'Use a custom endpoint to connect your own Lumina-compatible API or proxy server.'
                                  : `Connecting to ${CLOUD_PROVIDERS.find(p=>p.id===selectedProvider)?.label}. Paste your API key above and click Verify.`}
                              </p>
                            </div>
                          </div>

                          <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl">
                            <div className="flex gap-3 text-blue-500">
                              <Terminal size={16} className="shrink-0 mt-0.5" />
                              <p className="text-[11px] leading-relaxed">
                                The Llama Bridge settings have moved to their own <button onClick={() => setActiveSettingsTab('bridge')} className="underline font-semibold hover:text-blue-400">Bridge panel</button>.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {activeSettingsTab === 'search' && (
                    <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
                      <div>
                        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-6">Search API Configuration</h3>
                        <div className="space-y-6">
                          <div>
                            <label className="text-xs font-bold text-gray-500 uppercase block mb-3">Search Provider</label>
                            <div className="flex gap-2">
                              <button
                                onClick={() => { setSearchProvider('tavily'); setIsSearchSaved(false); }}
                                className={`flex-1 h-11 rounded-xl text-sm font-semibold transition-all border ${
                                  searchProvider === 'tavily'
                                    ? 'bg-blue-600 text-white border-blue-600'
                                    : 'bg-gray-50 dark:bg-zinc-900 text-gray-700 dark:text-zinc-300 border-gray-200 dark:border-white/10'
                                }`}
                              >
                                Tavily
                              </button>
                              <button
                                onClick={() => { setSearchProvider('serpapi'); setIsSearchSaved(false); }}
                                className={`flex-1 h-11 rounded-xl text-sm font-semibold transition-all border ${
                                  searchProvider === 'serpapi'
                                    ? 'bg-blue-600 text-white border-blue-600'
                                    : 'bg-gray-50 dark:bg-zinc-900 text-gray-700 dark:text-zinc-300 border-gray-200 dark:border-white/10'
                                }`}
                              >
                                SerpAPI
                              </button>
                            </div>
                          </div>
                          {searchProvider === 'tavily' ? (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <label className="text-xs font-bold text-gray-500 uppercase">Tavily API Key</label>
                                <a href="https://tavily.com" target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-500 hover:underline">Get Key</a>
                              </div>
                              <input 
                                type="password"
                                value={tavilyApiKey}
                                onChange={(e) => { setTavilyApiKey(e.target.value); setIsSearchSaved(false); }}
                                placeholder="Enter your Tavily API key"
                                className="w-full bg-gray-50 dark:bg-zinc-950 border border-gray-100 dark:border-white/5 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                              />
                              <p className="text-[10px] text-gray-500 italic">Optimized for AI researchers and real-time data retrieval.</p>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <label className="text-xs font-bold text-gray-500 uppercase">SerpAPI API Key</label>
                                <a href="https://serpapi.com" target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-500 hover:underline">Get Key</a>
                              </div>
                              <input 
                                type="password"
                                value={serpApiKey}
                                onChange={(e) => { setSerpApiKey(e.target.value); setIsSearchSaved(false); }}
                                placeholder="Enter your SerpAPI key"
                                className="w-full bg-gray-50 dark:bg-zinc-950 border border-gray-100 dark:border-white/5 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                              />
                              <p className="text-[10px] text-gray-500 italic">Universal search API for Google, Bing, and more.</p>
                            </div>
                          )}
                          <div className="flex gap-3">
                            <button
                              onClick={handleVerifySearch}
                              disabled={searchVerificationState === 'verifying'}
                              className={`flex-1 h-11 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                                searchVerificationState === 'success' 
                                  ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                                  : searchVerificationState === 'error'
                                    ? 'bg-red-500/10 text-red-500 border border-red-500/20'
                                    : 'bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5'
                              }`}
                            >
                              {searchVerificationState === 'verifying' ? (
                                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
                              ) : null}
                              {searchVerificationState === 'success' ? <Check size={16} /> : null}
                              {searchVerificationState === 'error' ? <X size={16} /> : null}
                              {searchVerificationState === 'verifying' ? 'Verifying...' : searchVerificationState === 'success' ? 'Verified' : searchVerificationState === 'error' ? 'Failed' : 'Verify Keys'}
                            </button>
                            <button
                              onClick={handleSaveSearch}
                              className={`flex-1 h-11 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                                isSearchSaved 
                                  ? 'bg-emerald-500 text-white' 
                                  : 'bg-black dark:bg-white text-white dark:text-black shadow-lg shadow-black/10 hover:opacity-90'
                              }`}
                            >
                              {isSearchSaved ? <Check size={16} /> : null}
                              {isSearchSaved ? 'Saved' : 'Save Keys'}
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl">
                        <div className="flex gap-3">
                          <Globe size={18} className="text-blue-500 shrink-0" />
                          <div>
                            <div className="text-xs font-bold text-blue-500 uppercase mb-1">Search Integration</div>
                            <p className="text-xs text-blue-500/70 leading-relaxed mb-2">
                              When configured, the AI will automatically use these tools to browse the web for time-sensitive information, ensuring responses are grounded in current facts.
                            </p>
                            <div className="text-[10px] text-gray-400 space-y-1">
                              <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${tavilyApiKey && tavilyApiKey.trim() ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                                <span>Tavily {tavilyApiKey?.trim() ? '(Active)' : '(Not configured)'}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${serpApiKey && serpApiKey.trim() ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                                <span>SerpAPI {serpApiKey?.trim() ? '(Active)' : '(Not configured)'}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                <span>DuckDuckGo (Fallback)</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {activeSettingsTab === 'profile' && (
                    <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
                      <div>
                        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-6">Personal Information</h3>
                        <div className="space-y-5">
                          <div className="space-y-2">
                            <label className="text-[11px] font-medium text-gray-500">Display Name</label>
                            <input
                              type="text"
                              value={userProfile.name}
                              onChange={(e) => setUserProfile({ ...userProfile, name: e.target.value })}
                              placeholder="Your name"
                              className="w-full h-11 px-4 text-sm bg-gray-50 dark:bg-zinc-950 border border-gray-100 dark:border-white/5 rounded-xl focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[11px] font-medium text-gray-500">Avatar URL</label>
                            <input
                              type="text"
                              value={userProfile.avatar}
                              onChange={(e) => setUserProfile({ ...userProfile, avatar: e.target.value })}
                              placeholder="https://example.com/avatar.png"
                              className="w-full h-11 px-4 text-sm bg-gray-50 dark:bg-zinc-950 border border-gray-100 dark:border-white/5 rounded-xl focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[11px] font-medium text-gray-500">Date of Birth</label>
                            <input
                              type="date"
                              value={userProfile.dob}
                              onChange={(e) => setUserProfile({ ...userProfile, dob: e.target.value })}
                              className="w-full h-11 px-4 text-sm bg-gray-50 dark:bg-zinc-950 border border-gray-100 dark:border-white/5 rounded-xl focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[11px] font-medium text-gray-500">Age</label>
                            <input
                              type="number"
                              value={userProfile.age || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setUserProfile({ ...userProfile, age: val ? parseInt(val) : '' });
                              }}
                              placeholder="Your age"
                              className="w-full h-11 px-4 text-sm bg-gray-50 dark:bg-zinc-950 border border-gray-100 dark:border-white/5 rounded-xl focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[11px] font-medium text-gray-500">Location</label>
                            <input
                              type="text"
                              value={userProfile.location}
                              onChange={(e) => setUserProfile({ ...userProfile, location: e.target.value })}
                              placeholder="City, Country"
                              className="w-full h-11 px-4 text-sm bg-gray-50 dark:bg-zinc-950 border border-gray-100 dark:border-white/5 rounded-xl focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                            />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {activeSettingsTab === 'persona' && (
                    <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                      <div>
                        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-6">AI Persona</h3>
                        <div className="space-y-5">
                          <div className="space-y-2">
                            <label className="text-[11px] font-medium text-gray-500">Persona Name</label>
                            <input
                              type="text"
                              value={persona.name}
                              onChange={(e) => setPersona({ ...persona, name: e.target.value })}
                              placeholder="e.g., Lumina"
                              className="w-full h-11 px-4 text-sm bg-gray-50 dark:bg-zinc-950 border border-gray-100 dark:border-white/5 rounded-xl focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[11px] font-medium text-gray-500">Role/Description</label>
                            <input
                              type="text"
                              value={persona.role}
                              onChange={(e) => setPersona({ ...persona, role: e.target.value })}
                              placeholder="e.g., Modern Intelligence"
                              className="w-full h-11 px-4 text-sm bg-gray-50 dark:bg-zinc-950 border border-gray-100 dark:border-white/5 rounded-xl focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[11px] font-medium text-gray-500">Avatar URL</label>
                            <input
                              type="text"
                              value={persona.avatar}
                              onChange={(e) => setPersona({ ...persona, avatar: e.target.value })}
                              placeholder="https://example.com/avatar.png"
                              className="w-full h-11 px-4 text-sm bg-gray-50 dark:bg-zinc-950 border border-gray-100 dark:border-white/5 rounded-xl focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                            />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {activeSettingsTab === 'lumina_tools' && (
                    <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
                      <div>
                        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-6">Lumina Tools</h3>
                        <div className="space-y-4">
                          <div className="p-4 bg-[var(--theme-accent)]/5 border border-[var(--theme-accent)]/10 rounded-2xl">
                            <div className="flex gap-3">
                              <Hammer size={18} className="text-[var(--theme-accent)] shrink-0" />
                              <div>
                                <div className="text-xs font-bold text-[var(--theme-accent)] uppercase mb-1">Built-in Lumina Intelligence</div>
                                <p className="text-xs text-[var(--theme-accent)]/70 leading-relaxed">
                                  These are the local, built-in capabilities of Lumina: Web Scraper (custom CSS engine) and Wikipedia tools.
                                  These are fully offline-first or managed natively and do not require external Bridge connectivity.
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 gap-2 max-h-80 overflow-y-auto custom-scrollbar pr-1">
                            {luminaTools.map(tool => (
                              <div
                                key={tool.id}
                                className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-zinc-950 rounded-xl border border-gray-100 dark:border-white/5"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="p-1.5 rounded-lg bg-[var(--theme-accent)]/10 text-[var(--theme-accent)]">
                                    {tool.icon}
                                  </div>
                                  <div className="text-left truncate">
                                    <div className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">{tool.name}</div>
                                    <div className="text-[10px] text-gray-500 truncate max-w-[200px]">{tool.description}</div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] text-gray-400 font-mono shrink-0">inbuilt</span>
                                  <button
                                    onClick={() => {
                                      setLuminaTools(prev => prev.map(t => t.id === tool.id ? { ...t, enabled: !t.enabled } : t));
                                      showToast(`${tool.enabled ? 'Disabled' : 'Enabled'} ${tool.name}`);
                                    }}
                                    className={`w-8 h-4 rounded-full transition-colors relative ${tool.enabled ? 'bg-[var(--theme-accent)]' : 'bg-[var(--theme-hover-bg)]'}`}
                                  >
                                    <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${tool.enabled ? 'right-0.5' : 'left-0.5'}`} />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {activeSettingsTab === 'mcp' && (
                    <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
                      <div>
                        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-6">Bridge Tools</h3>
                        <div className="space-y-4">
                          <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl">
                            <div className="flex gap-3">
                              <Wrench size={18} className="text-blue-500 shrink-0" />
                              <div>
                                <div className="text-xs font-bold text-blue-500 uppercase mb-1">Tool Discovery</div>
                                <p className="text-xs text-blue-500/70 leading-relaxed">
                                  Tools are auto-discovered from the Llama Bridge at <strong>{llamaBridgeUrl}</strong>.
                                  These are external tools and APIs connected through the LLM bridge.
                                </p>
                              </div>
                            </div>
                          </div>

                          {bridgeTools.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                              <p className="text-sm">No bridge tools loaded.</p>
                              <button
                                onClick={handleLoadBridgeTools}
                                className="mt-3 px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-xl text-sm font-semibold"
                              >
                                Discover Bridge Tools
                              </button>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto custom-scrollbar pr-1">
                              {bridgeTools.map(tool => (
                                <div
                                  key={tool.id}
                                  className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-zinc-950 rounded-xl border border-gray-100 dark:border-white/5"
                                >
                                  <div className="flex items-center gap-3 min-w-0">
                                    <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500">
                                      {tool.icon}
                                    </div>
                                    <div className="text-left truncate">
                                      <div className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">{tool.name}</div>
                                      <div className="text-[10px] text-gray-500 truncate max-w-[200px]">{tool.description}</div>
                                    </div>
                                  </div>
                                  <div className="text-[10px] text-gray-400 font-mono shrink-0 ml-2">bridge</div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {activeSettingsTab === 'bridge' && (
                    <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
                      <div>
                        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-6">Llama Bridge Backend</h3>
                        <div className="space-y-5">

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="p-3 rounded-xl border" style={{ background: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}>
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'var(--theme-accent)', color: 'var(--theme-accent-foreground)' }}>
                                  <Terminal size={12} />
                                </div>
                                <span className="text-[10px] font-bold uppercase" style={{ color: 'var(--theme-secondary)' }}>Server</span>
                              </div>
                              <div className="text-xs font-semibold truncate" style={{ color: 'var(--theme-primary)' }}>{llamaBridgeUrl}</div>
                              <div className="text-[10px] mt-0.5" style={{ color: 'var(--theme-accent)' }}>llama-bridge v0.1.0</div>
                            </div>
                            <div className="p-3 rounded-xl border" style={{ background: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}>
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-6 h-6 rounded-lg flex items-center justify-center bg-emerald-500/10 text-emerald-500">
                                  <Check size={12} />
                                </div>
                                <span className="text-[10px] font-bold uppercase" style={{ color: 'var(--theme-secondary)' }}>Status</span>
                              </div>
                              <div className="text-xs font-semibold" style={{ color: 'var(--theme-primary)' }}>
                                {isMcpConnected ? 'Connected' : aiVerificationState === 'success' ? 'Connected' : aiVerificationState === 'error' ? 'Error' : 'Unknown'}
                              </div>
                              <div className="text-[10px] mt-0.5" style={{ color: 'var(--theme-secondary)' }}>
                                {llamaBridgeModels.length > 0 ? `${llamaBridgeModels.length} models` : 'No models loaded'}
                              </div>
                            </div>
                            <div className="p-3 rounded-xl border" style={{ background: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}>
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: `${isMcpConnected ? 'var(--theme-success)' : 'var(--theme-muted)'}20`, color: isMcpConnected ? 'var(--theme-success)' : 'var(--theme-muted)' }}>
                                  <HardDrive size={12} />
                                </div>
                                <span className="text-[10px] font-bold uppercase" style={{ color: 'var(--theme-secondary)' }}>Tools</span>
                              </div>
                              <div className="text-xs font-semibold" style={{ color: 'var(--theme-primary)' }}>{bridgeTools.length} loaded</div>
                              <div className="text-[10px] mt-0.5" style={{ color: 'var(--theme-secondary)' }}>HTTP + MCP endpoints</div>
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[11px] font-medium" style={{ color: 'var(--theme-secondary)' }}>Bridge URL</label>
                            <input
                              type="text"
                              value={llamaBridgeUrl}
                              onChange={(e) => { setLlamaBridgeUrl(e.target.value); localStorage.setItem('lumina_llama_url', e.target.value); }}
                              placeholder="http://localhost:8089"
                              className="w-full h-11 px-4 text-sm rounded-xl border outline-none transition-all"
                              style={{ background: 'var(--theme-input-bg)', borderColor: 'var(--theme-input-border)', color: 'var(--theme-primary)' }}
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[11px] font-medium" style={{ color: 'var(--theme-secondary)' }}>API Key (optional)</label>
                            <input
                              type="password"
                              value={llamaBridgeApiKey}
                              onChange={(e) => { setLlamaBridgeApiKey(e.target.value); localStorage.setItem('lumina_llama_key', e.target.value); }}
                              placeholder="Enter API key if required"
                              className="w-full h-11 px-4 text-sm rounded-xl border outline-none transition-all"
                              style={{ background: 'var(--theme-input-bg)', borderColor: 'var(--theme-input-border)', color: 'var(--theme-primary)' }}
                            />
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={handleTestLlamaConnection}
                              disabled={aiVerificationState === 'verifying'}
                              className="h-10 px-5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 border"
                              style={{
                                background: aiVerificationState === 'success' ? 'var(--theme-success)' : aiVerificationState === 'error' ? 'var(--theme-danger)' : 'var(--theme-surface)',
                                borderColor: aiVerificationState === 'success' ? 'var(--theme-success)' : aiVerificationState === 'error' ? 'var(--theme-danger)' : 'var(--theme-border)',
                                color: aiVerificationState !== 'idle' ? 'white' : 'var(--theme-primary)',
                              }}
                            >
                              {aiVerificationState === 'verifying' ? (
                                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full" />
                              ) : aiVerificationState === 'success' ? <Check size={13} /> : aiVerificationState === 'error' ? <X size={13} /> : null}
                              {aiVerificationState === 'verifying' ? 'Testing...' : aiVerificationState === 'success' ? 'Connected' : aiVerificationState === 'error' ? 'Failed' : 'Test Connection'}
                            </button>
                            <button
                              onClick={handleLoadLlamaModels}
                              className="h-10 px-5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2"
                              style={{ background: 'var(--theme-accent)', color: 'var(--theme-accent-foreground)' }}
                            >
                              <Brain size={13} />
                              Load Models
                            </button>
                            <button
                              onClick={handleLoadBridgeTools}
                              className="h-10 px-5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2"
                              style={{ background: 'var(--theme-surface)', color: 'var(--theme-primary)', border: '1px solid var(--theme-border)' }}
                            >
                              <Wrench size={13} />
                              Load Tools
                            </button>
                          </div>

                          {llamaBridgeModels.length > 0 && (
                            <div className="space-y-2">
                              <label className="text-[11px] font-medium" style={{ color: 'var(--theme-secondary)' }}>Available Models ({llamaBridgeModels.length})</label>
                              <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto custom-scrollbar pr-1">
                                {llamaBridgeModels.map(m => (
                                  <button
                                    key={m.id}
                                    onClick={() => setSelectedLlamaModel(m.id)}
                                    className="px-3 py-2.5 rounded-xl text-[11px] font-medium text-left transition-all border"
                                    style={{
                                      background: selectedLlamaModel === m.id ? 'var(--theme-accent)' : 'var(--theme-surface)',
                                      borderColor: selectedLlamaModel === m.id ? 'var(--theme-accent)' : 'var(--theme-border)',
                                      color: selectedLlamaModel === m.id ? 'var(--theme-accent-foreground)' : 'var(--theme-primary)',
                                    }}
                                  >
                                    <div className="truncate">{m.name || m.id}</div>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--theme-border)' }}>
                            <div className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest" style={{ background: 'var(--theme-surface)', color: 'var(--theme-secondary)', borderBottom: '1px solid var(--theme-border)' }}>
                              Supported Endpoints
                            </div>
                            <div className="divide-y" style={{ borderColor: 'var(--theme-border)' }}>
                              {[
                                { path: '/health', method: 'GET', desc: 'Server health check' },
                                { path: '/v1/models', method: 'GET', desc: 'List available models' },
                                { path: '/v1/chat/completions', method: 'POST', desc: 'Chat & tool execution' },
                                { path: '/v1/tools', method: 'GET', desc: 'List bridge tools' },
                                { path: '/v1/tools/call', method: 'POST', desc: 'Call a bridge tool' },
                                { path: '/v1/messages', method: 'POST', desc: 'Anthropic-compatible chat' },
                                { path: '/v1/embeddings', method: 'POST', desc: 'Text embeddings' },
                                { path: '/mcp', method: 'POST', desc: 'MCP JSON-RPC endpoint' },
                                { path: '/api/generate', method: 'POST', desc: 'Ollama-compatible generate' },
                                { path: '/api/chat', method: 'POST', desc: 'Ollama-compatible chat' },
                              ].map((ep, i) => (
                                <div key={i} className="flex items-center gap-3 px-4 py-2" style={{ background: i % 2 === 0 ? 'transparent' : 'var(--theme-surface-alt)' }}>
                                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase shrink-0 ${
                                    ep.method === 'GET' ? 'text-emerald-500 bg-emerald-500/10' : 'text-blue-500 bg-blue-500/10'
                                  }`}>{ep.method}</span>
                                  <code className="text-[10px] font-mono" style={{ color: 'var(--theme-primary)' }}>{ep.path}</code>
                                  <span className="text-[10px] ml-auto" style={{ color: 'var(--theme-secondary)' }}>{ep.desc}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="p-4 rounded-xl border" style={{ background: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}>
                            <div className="flex gap-3">
                              <Terminal size={16} className="shrink-0 mt-0.5" style={{ color: 'var(--theme-accent)' }} />
                              <p className="text-xs leading-relaxed" style={{ color: 'var(--theme-secondary)' }}>
                                The Llama Bridge is a universal API gateway that translates between OpenAI, Anthropic, Cohere, Gemini, and Ollama formats. Chat requests go directly to <strong style={{ color: 'var(--theme-primary)' }}>{llamaBridgeUrl}</strong>. Bridge tools are auto-discovered via <code style={{ color: 'var(--theme-accent)' }}>/v1/tools</code>.
                              </p>
                            </div>
                          </div>

                        </div>
                      </div>
                    </motion.div>
                  )}


                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="fixed top-20 right-6 flex flex-col gap-1.5 items-end z-[9999] pointer-events-none">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 24, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 12, scale: 0.95 }}
              className="px-3 py-1.5 bg-zinc-950/95 border border-white/10 rounded-lg text-[10.5px] font-medium text-white shadow-lg backdrop-blur-md flex items-center gap-2 max-w-sm pointer-events-auto"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
              <span>{toast.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <Canvas 
        artifact={activeArtifact} 
        isOpen={isCanvasOpen} 
        onClose={() => setIsCanvasOpen(false)} 
        view={canvasView}
        onSetView={setCanvasView}
        allArtifacts={chats.find(c => c.id === currentChatId)?.messages.flatMap(m => m.artifacts || []) || []}
      />

      <PhysicsGraphCanvas 
        isOpen={isPhysicsCanvasOpen} 
        onClose={() => setIsPhysicsCanvasOpen(false)} 
      />

      {/* Scanned Layout Element Report Modal */}
      <AnimatePresence>
        {selectedModalAttachment && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[250] p-4 animate-fade-in font-sans">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#1C1816]/95 border border-[#2D241E] max-w-2xl w-full rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] select-none text-left"
            >
              {/* Header */}
              <div className="px-6 py-4 border-b border-[#2D241E] flex items-center justify-between bg-[#141110]">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 animate-pulse">
                    <MousePointerClick size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-100 font-sans">Scanned Layout Element</h3>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-black leading-none mt-1">Inspection analysis report</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedModalAttachment(null)}
                  className="p-1.5 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-zinc-250 transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Scrollable contents */}
              <div className="p-6 overflow-y-auto space-y-5 custom-scrollbar bg-[#1E1917]/30">
                {/* File Name */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#D97756]">1. File Destination</span>
                  <div className="bg-[#14110F] border border-[#221D1A] rounded-xl p-3 flex items-center justify-between">
                    <div className="truncate pr-4">
                      <span className="font-semibold text-zinc-100 block text-xs truncate font-sans">{selectedModalAttachment.fileName}</span>
                      <span className="text-[10px] text-zinc-500 truncate block mt-1 font-mono">{selectedModalAttachment.filePath}</span>
                    </div>
                    <button
                      onClick={() => {
                        setFloatingEditFile(selectedModalAttachment.filePath);
                        setSelectedModalAttachment(null);
                      }}
                      className="px-3 py-1.5 bg-[#D97756]/10 text-[#D97756] hover:bg-[#D97756]/15 text-xs font-bold rounded-lg border border-[#D97756]/30 transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                    >
                      <Code size={12} />
                      <span>Edit File</span>
                    </button>
                  </div>
                </div>

                {/* Element Work */}
                {selectedModalAttachment.elementWork && (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#D97756]">2. Functionality & Actions</span>
                    <div className="bg-[#171412] border border-[#231E1B] rounded-xl p-3.5 text-xs text-zinc-350 leading-relaxed font-sans shadow-inner">
                      {selectedModalAttachment.elementWork}
                    </div>
                  </div>
                )}

                {/* Specific Code */}
                {selectedModalAttachment.specificCode && (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#D97756]">3. Controlling Code</span>
                    <div className="rounded-xl border border-[#2D241E] bg-[#14110F] overflow-hidden leading-relaxed font-mono">
                      <div className="bg-[#1C1816] px-4 py-2 border-b border-[#2D241E] flex items-center justify-between select-none">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Source Segment</span>
                        <span className="text-[9px] text-[#D97756] font-bold uppercase tracking-widest bg-[#D97756]/10 px-2 py-0.5 rounded-full border border-[#D97756]/20">Pure Javascript / TSX</span>
                      </div>
                      <pre className="p-4 text-xs text-zinc-300 custom-scrollbar max-h-60 overflow-y-auto whitespace-pre-wrap word-break select-text leading-relaxed font-mono bg-[#0f0d0c]">
                        {selectedModalAttachment.specificCode}
                      </pre>
                    </div>
                  </div>
                )}

                {/* Connections */}
                {selectedModalAttachment.connections && selectedModalAttachment.connections.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#D97756]">4. Module Connections</span>
                    <div className="flex flex-wrap gap-2 pt-0.5">
                      {selectedModalAttachment.connections.map((c: any, id: number) => (
                        <button
                          key={id}
                          onClick={() => {
                            setFloatingEditFile(c.filePath || c.name || '');
                            setSelectedModalAttachment(null);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 border border-[#2D241E] hover:border-teal-500/40 text-xs text-zinc-350 hover:text-teal-400 rounded-lg transition-all cursor-pointer shadow-sm"
                          title={`Open ${c.fileName} in editor`}
                        >
                          <FileText size={12} className="text-zinc-650" />
                          <span className="font-semibold">{c.fileName}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Backing footer */}
              <div className="px-6 py-3 border-t border-[#2D241E] bg-[#141110] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedModalAttachment(null)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold rounded-lg transition-all cursor-pointer font-sans"
                >
                  Close Report
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Dynamic Image Lightbox Overlay Popup */}
      <AnimatePresence>
        {lightboxImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-md z-[500] flex items-center justify-center p-4 select-none"
            onClick={() => setLightboxImage(null)}
          >
            {/* Close button with high visibility */}
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute top-4 right-4 p-3 bg-zinc-900/80 hover:bg-zinc-850 border border-zinc-800 rounded-full text-white cursor-pointer transition-all hover:scale-105 z-[510] shadow-lg flex items-center justify-center w-10 h-10"
              title="Close image display"
            >
              <X size={18} />
            </button>

            {/* Inner Content Card (prevent click-through closure) */}
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="relative max-w-5xl max-h-[85vh] w-full flex flex-col items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Actual Image Panel with rich framing */}
              <div className="relative rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-950 shadow-2xl flex items-center justify-center max-h-[70vh]" style={{ aspectRatio: 'auto' }}>
                <img
                  src={lightboxImage.url}
                  alt={lightboxImage.title || 'Image detail view'}
                  className="max-w-full max-h-[70vh] object-contain select-text"
                  referrerPolicy="no-referrer"
                />
              </div>

              {/* High-fidelity Photo Footer Details */}
              <div className="mt-4 flex flex-col sm:flex-row items-center gap-3 justify-between w-full max-w-3xl bg-zinc-900/90 border border-zinc-805 px-5 py-3 rounded-2xl shadow-xl">
                <div className="text-left select-text truncate pr-4 max-w-[80%]">
                  <h4 className="text-xs font-bold text-zinc-150 tracking-wide truncate">{lightboxImage.title || 'Visual Attachment'}</h4>
                  <p className="text-[10px] text-zinc-400 truncate font-mono mt-0.5">{lightboxImage.url}</p>
                </div>
                <div className="flex items-center gap-2.5 shrink-0">
                  <a
                    href={lightboxImage.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] font-bold rounded-xl border border-zinc-700/50 transition-all cursor-pointer shadow-xs"
                  >
                    <ExternalLink size={12} />
                    <span>Open Original</span>
                  </a>
                  <button
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = lightboxImage.url;
                      link.download = lightboxImage.title || 'scraped-image';
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-[11px] font-black rounded-xl transition-all cursor-pointer shadow-md"
                  >
                    <Download size={12} />
                    <span>Download</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
 
      {/* Dynamic Video Popup Player Panel */}
      <AnimatePresence>
        {activeVideo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/95 backdrop-blur-md z-[500] flex items-center justify-center p-4 animate-fade-in"
            onClick={() => setActiveVideo(null)}
          >
            {/* Close button with high visibility */}
            <button
              onClick={() => setActiveVideo(null)}
              className="absolute top-4 right-4 p-3 bg-zinc-900/80 hover:bg-zinc-850 border border-zinc-800 rounded-full text-white cursor-pointer transition-all hover:scale-105 z-[510] shadow-lg flex items-center justify-center w-10 h-10 border-0 focus:outline-none"
              title="Close video player"
            >
              <X size={18} />
            </button>
 
            {/* Inner Content Card (prevent click-through closure) */}
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="relative max-w-4xl w-full flex flex-col items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Actual Video Frame */}
              <div className="relative rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-950 shadow-2xl flex items-center justify-center w-full aspect-video select-none">
                {(() => {
                  if (!activeVideo.url) return null;
                  
                  // YouTube Watch or Share URL transform to embed
                  let youtubeId = null;
                  const ytMatch = activeVideo.url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
                  if (ytMatch) {
                    youtubeId = ytMatch[1];
                  }
                  
                  // Vimeo Watch URL transform to embed
                  let vimeoId = null;
                  const vimeoMatch = activeVideo.url.match(/(?:vimeo\.com\/)(?:channels\/[^\/]+\/|groups\/[^\/]+\/video\/|album\/[^\/]+\/video\/|showcase\/[^\/]+\/video\/|video\/)?([0-9]+)/i);
                  if (vimeoMatch) {
                    vimeoId = vimeoMatch[1];
                  }
 
                  if (youtubeId) {
                    return (
                      <iframe
                        src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1`}
                        title={activeVideo.title || 'YouTube Video'}
                        className="w-full h-full border-0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        referrerPolicy="no-referrer"
                      />
                    );
                  } else if (vimeoId) {
                    return (
                      <iframe
                        src={`https://player.vimeo.com/video/${vimeoId}?autoplay=1`}
                        title={activeVideo.title || 'Vimeo Video'}
                        className="w-full h-full border-0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        referrerPolicy="no-referrer"
                      />
                    );
                  } else if (activeVideo.url.includes('/embed/')) {
                    // Pre-made embed URL
                    return (
                      <iframe
                        src={activeVideo.url}
                        title={activeVideo.title || 'Embedded Video'}
                        className="w-full h-full border-0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        referrerPolicy="no-referrer"
                      />
                    );
                  } else {
                    // Standard direct file source video elements
                    return (
                      <video
                        src={activeVideo.url}
                        title={activeVideo.title || 'Direct Media Video Player'}
                        controls
                        autoPlay
                        className="w-full h-full object-contain rounded-2xl bg-neutral-950"
                      />
                    );
                  }
                })()}
              </div>
 
              {/* High-fidelity Video Footer Details */}
              <div className="mt-4 flex flex-col sm:flex-row items-center gap-3 justify-between w-full bg-zinc-900/95 border border-zinc-800 px-5 py-3.5 rounded-2xl shadow-xl select-text">
                <div className="text-left truncate pr-4 max-w-[80%]">
                  <h4 className="text-sm font-bold text-zinc-150 tracking-wide truncate flex items-center gap-1.5">
                    <Play size={13} className="text-orange-500 fill-orange-500 shrink-0" />
                    <span>{activeVideo.title || 'Lumina Media player'}</span>
                  </h4>
                  <p className="text-[10px] text-zinc-500 truncate font-mono mt-1">{activeVideo.url}</p>
                </div>
                <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
                  <a
                    href={activeVideo.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] font-bold rounded-xl border border-zinc-750/50 transition-all cursor-pointer shadow-xs no-underline"
                  >
                    <ExternalLink size={12} />
                    <span>Open in New Tab</span>
                  </a>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Action Context Menu */}
      {attachmentContextMenu.visible && (
        <div 
          className="fixed bg-[#1C1816]/95 border border-[#2D241E] rounded-xl shadow-2xl p-1 z-[300] w-48 text-left py-1 select-none font-sans"
          style={{ top: attachmentContextMenu.y, left: attachmentContextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              setFloatingEditFile(attachmentContextMenu.attachment.filePath);
              setAttachmentContextMenu({ visible: false, x: 0, y: 0, attachment: null, index: -1 });
            }}
            className="flex items-center gap-2 w-full px-3 py-2 text-xs text-[#EDE6DD] hover:bg-[#D97756]/15 hover:text-[#D97756] rounded-lg transition-all text-left cursor-pointer font-medium"
          >
            <Code size={13} className="text-zinc-500" />
            <span>Open in Editor</span>
          </button>
          <button
            onClick={() => {
              setSelectedModalAttachment(attachmentContextMenu.attachment);
              setAttachmentContextMenu({ visible: false, x: 0, y: 0, attachment: null, index: -1 });
            }}
            className="flex items-center gap-2 w-full px-3 py-2 text-xs text-[#EDE6DD] hover:bg-teal-500/10 hover:text-teal-400 rounded-lg transition-all text-left cursor-pointer font-medium"
          >
            <Activity size={13} className="text-zinc-500" />
            <span>View Analysis</span>
          </button>
          <span className="block h-px bg-[#2D241E] my-1" />
          <button
            onClick={() => {
              if (attachmentContextMenu.index !== -1) {
                setLocalElementAttachments(prev => prev.filter((_, i) => i !== attachmentContextMenu.index));
              }
              setAttachmentContextMenu({ visible: false, x: 0, y: 0, attachment: null, index: -1 });
            }}
            className="flex items-center gap-2 w-full px-3 py-2 text-xs text-rose-455 hover:bg-rose-500/10 rounded-lg transition-all text-left cursor-pointer font-medium"
          >
            <X size={13} />
            <span>Remove Attachment</span>
          </button>
        </div>
      )}
    </div>
  );
}