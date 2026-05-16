/**
 * Lumina AI Chat UI
 * Modern intelligence, refined interface.
 * 
 * A polished, dark-native AI chat prototype built with React, Lucide-react, 
 * Motion, and Tailwind CSS v4.
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Send, 
  Plus, 
  Sparkles, 
  User, 
  ArrowUp,
  Sidebar as SidebarIcon,
  Search,
  MoreVertical,
  Settings,
  Trash2,
  ChevronDown,
  HardDrive,
  Brain,
  Globe,
  ExternalLink,
  X,
  Languages,
  Layout,
  MessageSquare,
  StopCircle,
  FileUp,
  Camera,
  FolderPlus,
  Box,
  Link as LinkIcon,
  Check,
  ChevronRight,
  ChevronLeft,
  Palette
} from 'lucide-react';
import Markdown from 'react-markdown';

interface ToolCallNode {
  id: string;
  type: 'ai' | 'tool' | 'sub-tool' | 'result' | 'error';
  label: string;
  status: 'pending' | 'active' | 'complete' | 'failed';
  icon?: React.ReactNode;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  thinking?: string;
  sources?: { title: string; url: string; icon?: string }[];
  searchQuery?: string;
  isSearching? : boolean;
  toolCalls?: ToolCallNode[];
}

interface Chat {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: Date;
}

interface SidebarProps {
  chats: Chat[];
  currentChatId: string | null;
  setCurrentChatId: (id: string | null) => void;
  createNewChat: () => void;
  setChats: React.Dispatch<React.SetStateAction<Chat[]>>;
  isCollapsed: boolean;
  onToggle: () => void;
  onOpenSettings: () => void;
}

const SidebarContent = ({ 
  chats, 
  currentChatId, 
  setCurrentChatId, 
  createNewChat, 
  setChats,
  onToggle,
  onOpenSettings
}: SidebarProps) => (
  <>
    <div className="flex items-center justify-between mb-8">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-black dark:bg-white flex items-center justify-center text-white dark:text-black">
          <Sparkles size={18} />
        </div>
        <span className="font-display font-semibold tracking-tight">Lumina</span>
      </div>
      <button 
        onClick={onToggle}
        className="p-1.5 hover:bg-gray-200 rounded-md transition-colors text-gray-500"
      >
        <SidebarIcon size={18} />
      </button>
    </div>

    <button 
      onClick={createNewChat}
      className="flex items-center gap-3 p-3 mb-6 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/5 rounded-xl shadow-sm hover:shadow-md hover:border-gray-300 dark:hover:border-white/10 transition-all text-sm font-medium dark:text-white"
    >
      <Plus size={18} />
      New chat
    </button>

    <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar">
      <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2 px-3">Recent</div>
      {chats.map(chat => (
        <div key={chat.id} className="group relative">
          <button
            onClick={() => setCurrentChatId(chat.id)}
            className={`w-full p-2.5 rounded-lg flex items-center gap-3 text-sm font-medium transition-colors pr-10 ${
              currentChatId === chat.id 
                ? 'bg-gray-200/50 text-black dark:text-white' 
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
            }`}
          >
            <MessageSquare size={16} className={currentChatId === chat.id ? 'text-black dark:text-white' : 'text-gray-400'} />
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
      {chats.length === 0 && (
        <div className="px-3 py-4 text-xs text-gray-400 italic">No recent chats</div>
      )}
    </div>

    <div className="mt-auto pt-4 border-t border-gray-200 space-y-1">
      <button 
        onClick={onOpenSettings}
        className="flex items-center gap-3 w-full p-2.5 hover:bg-gray-200/50 rounded-lg text-sm text-gray-600 transition-colors"
      >
        <Settings size={18} />
        Settings
      </button>
      <div className="p-2.5 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
          AR
        </div>
        <div className="flex-1 text-xs">
          <div className="font-semibold truncate">Abdur Ramiz</div>
          <div className="text-gray-400">Pro Plan</div>
        </div>
      </div>
    </div>
  </>
);

export default function App() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCompactSidebar, setIsCompactSidebar] = useState(false);
  const [useBubbles, setUseBubbles] = useState(true);
  const [isSourcesPanelOpen, setIsSourcesPanelOpen] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState<'general' | 'ai' | 'mcp' | 'sources' | 'search'>('general');
  const [activePlusSubMenu, setActivePlusSubMenu] = useState<'main' | 'mcp'>('main');
  const [tavilyApiKey, setTavilyApiKey] = useState('');
  const [serpApiKey, setSerpApiKey] = useState('');
  const [mcpTools, setMcpTools] = useState([
    { id: 'fetch', name: 'Fetch URL', enabled: true, description: 'Read content from any URL', icon: <Globe size={14} /> },
    { id: 'brave', name: 'Brave Search', enabled: true, description: 'Search the web for real-time info', icon: <Search size={14} /> },
    { id: 'fs', name: 'Filesystem', enabled: false, description: 'Read and write local files', icon: <Box size={14} /> },
    { id: 'github', name: 'GitHub', enabled: false, description: 'Access repos and issues', icon: <Box size={14} /> },
  ]);
  const [serverUrl, setServerUrl] = useState('https://api.lumina.ai/v1');
  const [apiKey, setApiKey] = useState('');
  const [mcpUrl, setMcpUrl] = useState('');
  const [mcpKey, setMcpKey] = useState('');
  const [isMcpConnected, setIsMcpConnected] = useState(false);
  const [isConnectingMcp, setIsConnectingMcp] = useState(false);
  const [selectedModel, setSelectedModel] = useState('lumina-ultra-plus');
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isPlusMenuOpen, setIsPlusMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showScrollButton, setShowScrollButton] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const headerMenuRef = useRef<HTMLDivElement>(null);
  const plusMenuRef = useRef<HTMLDivElement>(null);

  // Track scroll for scroll-to-bottom button
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

  // Close dropdowns when clicking outside
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
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const models = [
    { id: 'lumina-ultra-plus', name: 'Lumina Ultra Plus', icon: <Sparkles size={14} className="text-blue-500" /> },
    { id: 'lumina-pro-max', name: 'Lumina Pro Max', icon: <Plus size={14} className="text-purple-500" /> },
    { id: 'lumina-mini-flash', name: 'Lumina Mini Flash', icon: <ArrowUp size={14} className="text-orange-500" /> },
  ];

const NodeGraph = ({ nodes }: { nodes: ToolCallNode[] }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [allCompleted, setAllCompleted] = useState(false);

  useEffect(() => {
    const active = nodes.some(n => n.status === 'active');
    const pending = nodes.some(n => n.status === 'pending');
    if (!active && !pending && nodes.length > 0) {
      const timer = setTimeout(() => {
        setAllCompleted(true);
        setIsCollapsed(true);
      }, 800);
      return () => clearTimeout(timer);
    } else {
      setAllCompleted(false);
    }
  }, [nodes]);

  if (isCollapsed) {
    const lastTool = nodes.filter(n => n.type === 'tool').pop();
    return (
      <motion.button 
        layoutId="node-graph"
        onClick={() => setIsCollapsed(false)}
        className="flex items-center gap-2 px-3 py-1.5 bg-[#121212] border border-white/10 rounded-full text-[11px] font-medium text-zinc-400 hover:bg-[#1a1a1a] transition-all cursor-pointer shadow-sm group"
      >
        <span className="text-emerald-500 font-bold">✓</span>
        <span>{lastTool?.label || nodes.length + ' tools'} · 1.2s</span>
        <ChevronRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
      </motion.button>
    );
  }

  return (
    <motion.div 
      layoutId="node-graph"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="p-4 bg-[#121212] border border-white/5 rounded-xl overflow-hidden relative group max-w-fit shadow-2xl animate-fade-up"
    >
      <div className="flex items-center justify-between mb-4 gap-8">
        <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Tool Call Chain</div>
        <button 
          onClick={() => setIsCollapsed(true)}
          className="text-[10px] text-zinc-500 hover:text-white transition-colors uppercase tracking-widest"
        >
          Collapse
        </button>
      </div>

      <div className="relative flex items-center gap-0 py-2">
        {nodes.map((node, i) => (
          <React.Fragment key={node.id}>
            {/* Edge */}
            {i > 0 && (
              <div className="relative w-10 flex items-center overflow-visible">
                <div className={`h-[0.5px] w-full transition-colors duration-500 ${node.status === 'complete' || node.status === 'active' ? 'bg-zinc-400' : 'bg-zinc-800'}`} />
                {node.status === 'active' && (
                  <motion.div 
                    className="absolute h-1.5 w-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)] animate-traveling-dot"
                    style={{ offsetPath: `path('M 0 0.25 L 40 0.25')` }}
                  />
                )}
              </div>
            )}

            {/* Node */}
            <motion.div
              layout
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={`relative flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-300 ${
                node.status === 'active' 
                  ? 'bg-blue-600/10 border-blue-500/50 text-blue-500 animate-active-ring font-bold' 
                  : node.status === 'complete'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
                    : node.status === 'failed'
                      ? 'bg-red-500/10 border-red-500/30 text-red-500 animate-micro-shake'
                      : 'bg-white/5 border-white/5 text-zinc-600 opacity-40'
              }`}
            >
              {node.status === 'complete' ? <Check size={12} /> : (node.status === 'failed' ? <X size={12} /> : (node.icon || <Box size={12} />))}
              <span className="text-[11.5px] whitespace-nowrap overflow-hidden max-w-[120px] truncate">
                {node.label}
              </span>
            </motion.div>
          </React.Fragment>
        ))}
      </div>
    </motion.div>
  );
};
  const currentChat = chats.find(c => c.id === currentChatId);
  const messages = currentChat?.messages || [];

  // Apply theme to body
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const createNewChat = () => {
    const newChat: Chat = {
      id: Date.now().toString(),
      title: 'New chat',
      messages: [],
      updatedAt: new Date(),
    };
    setChats(prev => [newChat, ...prev]);
    setCurrentChatId(newChat.id);
    return newChat.id;
  };

  const handleSend = async (contentOverride?: string) => {
    const content = contentOverride || input.trim();
    if (!content) return;

    let chatId = currentChatId;
    if (!chatId) {
      chatId = createNewChat();
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: content,
      timestamp: new Date(),
    };

    // Update messages for current chat
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

    // Simulate AI Response with Thinking and Sources
    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Based on your request about "${content}", I've analyzed the current trends and processed available data. The Lumina engine is now enhanced with real-time source tracking and deep thinking integration.\n\nThis new interface allows you to see exactly how I arrive at conclusions and which sources I'm using to ground my answers.`,
        timestamp: new Date(),
        thinking: `I am analyzing the user's query: "${content}". I need to generate a response that showcases the multi-modal and real-time capabilities of the Lumina platform. I will demonstrate the thinking process, the search integration, and the source panel functionality.`,
        searchQuery: `latest developments in ${content.split(' ').slice(0, 3).join(' ')}`,
        sources: [
          { title: "Lumina Documentation", url: "https://docs.lumina.ai/interface" },
          { title: "Perplexity Research Lab", url: "https://research.perplexity.ai/chat-patterns" },
          { title: "Modern UI Frameworks 2026", url: "https://ui-trends.com/minimalism" }
        ],
        toolCalls: [
          { id: '1', type: 'ai', label: 'AI Core', status: 'complete', icon: <Sparkles size={12} /> },
          { id: '2', type: 'tool', label: 'Web Search', status: 'active', icon: <Globe size={12} /> },
          { id: '3', type: 'tool', label: 'MCP Connect', status: 'pending', icon: <HardDrive size={12} /> },
          { id: '4', type: 'result', label: 'Summary', status: 'pending', icon: <Check size={12} /> }
        ]
      };
      
      setChats(prev => prev.map(chat => {
        if (chat.id === chatId) {
          return {
            ...chat,
            messages: [...chat.messages, assistantMessage],
            updatedAt: new Date(),
          };
        }
        return chat;
      }));
      
      // Simulate tool progress
      setTimeout(() => {
        setChats(prev => prev.map(chat => {
          if (chat.id === chatId) {
            return {
              ...chat,
              messages: chat.messages.map(m => m.id === assistantMessage.id ? {
                ...m,
                toolCalls: m.toolCalls?.map(t => 
                  t.id === '2' ? { ...t, status: 'complete' } as ToolCallNode : 
                  t.id === '3' ? { ...t, status: 'active' } as ToolCallNode : t
                )
              } : m)
            };
          }
          return chat;
        }));
      }, 1500);

      setTimeout(() => {
        setChats(prev => prev.map(chat => {
          if (chat.id === chatId) {
            return {
              ...chat,
              messages: chat.messages.map(m => m.id === assistantMessage.id ? {
                ...m,
                toolCalls: m.toolCalls?.map(t => 
                  t.id === '3' ? { ...t, status: 'complete' } as ToolCallNode : 
                  t.id === '4' ? { ...t, status: 'active' } as ToolCallNode : t
                )
              } : m)
            };
          }
          return chat;
        }));
      }, 3000);

      setTimeout(() => {
        setChats(prev => prev.map(chat => {
          if (chat.id === chatId) {
            return {
              ...chat,
              messages: chat.messages.map(m => m.id === assistantMessage.id ? {
                ...m,
                toolCalls: m.toolCalls?.map(t => t.id === '4' ? { ...t, status: 'complete' } as ToolCallNode : t)
              } : m)
            };
          }
          return chat;
        }));
        setIsTyping(false);
      }, 4500);
    }, 1000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const adjustTextareaHeight = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    setInput(textarea.value);
  };

  return (
    <div className={`flex h-screen w-full bg-white text-brand-primary overflow-hidden relative ${isDarkMode ? 'dark' : ''}`}>
      {/* Mobile Sidebar Overlay */}
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
              className="fixed inset-y-0 left-0 w-72 bg-white border-r border-gray-100 z-[101] md:hidden flex flex-col p-4 shadow-2xl"
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
                isCollapsed={false}
                onToggle={() => setIsMobileMenuOpen(false)}
                onOpenSettings={() => {
                  setIsSettingsOpen(true);
                  setIsMobileMenuOpen(false);
                }}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <motion.aside 
        animate={{ width: isSidebarOpen ? 260 : 0, opacity: isSidebarOpen ? 1 : 0 }}
        transition={{ duration: isSidebarOpen ? 0.22 : 0.18, ease: isSidebarOpen ? "easeOut" : "linear" }}
        className={`hidden md:flex flex-col border-r border-gray-100 bg-gray-50/50 relative overflow-hidden`}
      >
        <div className="w-[260px] h-full flex flex-col p-4">
          <SidebarContent 
            chats={chats} 
            currentChatId={currentChatId} 
            setCurrentChatId={setCurrentChatId} 
            createNewChat={createNewChat} 
            setChats={setChats}
            isCollapsed={false}
            onToggle={() => setIsSidebarOpen(false)}
            onOpenSettings={() => setIsSettingsOpen(true)}
          />
        </div>
      </motion.aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col relative h-full min-w-0">
        {/* Header */}
        <header className="h-14 border-b border-gray-100 dark:border-transparent flex items-center justify-between px-4 md:px-6 bg-white/80 dark:bg-transparent backdrop-blur-md z-10 sticky top-0 shrink-0">
          <div className="flex items-center gap-2">
            {/* Mobile menu button */}
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors text-gray-500"
            >
              <SidebarIcon size={20} />
            </button>
            
            {/* Desktop menu button (visible when sidebar is closed) */}
            {!isSidebarOpen && (
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="hidden md:flex p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors text-gray-500"
              >
                <SidebarIcon size={20} />
              </button>
            )}
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-400 truncate ml-2">Lumina Intelligence</h2>
          </div>
          <div className="flex items-center gap-4">
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
                    className="absolute top-full right-0 mt-2 w-56 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden z-[60] p-1.5"
                  >
                    {[
                      { id: 'settings', label: 'Settings', icon: <Settings size={16} />, onClick: () => { setIsSettingsOpen(true); setIsHeaderMenuOpen(false); } },
                      { id: 'account', label: 'Account', icon: <User size={16} />, onClick: () => { setIsHeaderMenuOpen(false); } },
                      { id: 'mcp', label: 'MCP Status', icon: <HardDrive size={16} className={isMcpConnected ? 'text-blue-500' : ''} />, onClick: () => { setActiveSettingsTab('mcp'); setIsSettingsOpen(true); setIsHeaderMenuOpen(false); } },
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
                      onClick={() => setIsDarkMode(!isDarkMode)}
                      className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-black dark:hover:text-white transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <motion.div animate={{ rotate: isDarkMode ? 180 : 0 }}>
                          <Sparkles size={16} />
                        </motion.div>
                        Dark Mode
                      </div>
                      <div className={`w-8 h-4 rounded-full relative transition-colors ${isDarkMode ? 'bg-blue-600' : 'bg-gray-200'}`}>
                        <motion.div 
                          animate={{ x: isDarkMode ? 18 : 2 }}
                          className="absolute top-1 w-2 h-2 rounded-full bg-white" 
                        />
                      </div>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 flex overflow-hidden">
          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-4 md:px-0 py-8 custom-scrollbar scroll-smooth"
          >
            <div className={`mx-auto space-y-8 pb-24 transition-all duration-500 ${isSourcesPanelOpen ? 'max-w-xl md:mr-4' : 'max-w-3xl'}`}>
              <AnimatePresence initial={false}>
                {messages.length === 0 ? (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="h-[60vh] flex flex-col items-center justify-center text-center px-4"
                  >
                    <motion.div 
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ duration: 4, repeat: Infinity }}
                      className="w-16 h-16 bg-gray-50 border border-gray-100 dark:border-white/5 rounded-3xl flex items-center justify-center text-black dark:text-white dark:bg-zinc-900 mb-6 shadow-sm"
                    >
                      <Sparkles size={32} />
                    </motion.div>
                    <h1 className="text-4xl font-display font-medium text-gray-900 dark:text-white mb-3 tracking-tight">
                      Welcome to Lumina
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 max-w-sm mb-12">
                      Modern intelligence, refined interface.
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-lg">
                      {[
                        "Explain quantum physics in simple terms",
                        "Write a professional email for a job application",
                        "Give me 5 weekend trip ideas from London",
                        "How do I build a minimalist website?"
                      ].map((suggestion, i) => (
                        <motion.button
                          key={suggestion}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleSend(suggestion)}
                          className="p-4 text-left bg-white dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-2xl hover:border-gray-200 dark:hover:border-white/10 hover:shadow-sm transition-all group"
                        >
                          <div className="text-xs font-semibold text-gray-400 dark:text-gray-500 mb-1 uppercase tracking-wider">Example</div>
                          <div className="text-sm text-gray-600 dark:text-gray-300 group-hover:text-black dark:group-hover:text-white transition-colors">{suggestion}</div>
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                ) : (
                  messages.map((message) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex flex-col ${useBubbles ? (message.role === 'user' ? 'items-end' : 'items-start') : 'items-stretch w-full'}`}
                    >
                      {useBubbles ? (
                        /* Bubble Layout */
                        <motion.div 
                          className={`flex flex-col max-w-[85%] ${message.role === 'user' ? 'items-end' : 'items-start'} ${message.role === 'user' ? 'animate-msg-in' : ''}`}
                        >
                          <div className={`px-5 py-3 rounded-2xl text-[15px] leading-relaxed shadow-sm ${
                            message.role === 'user' 
                              ? 'bg-black dark:bg-white text-white dark:text-black rounded-tr-none' 
                              : 'bg-gray-100 dark:bg-zinc-800 text-gray-800 dark:text-gray-200 rounded-tl-none'
                          }`}>
                            <div className="markdown-body">
                              <Markdown>{message.content}</Markdown>
                            </div>
                          </div>
                          <div className="mt-1 text-[10px] text-gray-400 px-1 font-medium uppercase tracking-tight">
                            {message.role === 'assistant' ? 'Lumina' : 'You'} • {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </motion.div>
                      ) : (
                        /* Linear Layout */
                        <div className="space-y-6 w-full">
                          {message.role === 'user' ? (
                            <motion.div 
                              className="flex items-start gap-4 pb-4 border-b border-gray-100 dark:border-white/5 max-w-2xl"
                              initial={{ opacity: 0, y: 12 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.18, ease: "easeOut" }}
                            >
                              <div className="w-6 h-6 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 text-[10px] font-bold shrink-0 mt-1">
                                AR
                              </div>
                              <h3 className="text-xl font-medium text-gray-900 dark:text-white tracking-tight">{message.content}</h3>
                            </motion.div>
                          ) : (
                            <div className="space-y-6 max-w-2xl px-1">
                              {/* Node Graph Tool Visualization */}
                              {message.toolCalls && message.toolCalls.length > 0 && (
                                <div className="mb-4">
                                  <NodeGraph nodes={message.toolCalls} />
                                </div>
                              )}

                              {/* Status Steps */}
                              {message.thinking && (
                                <div className="space-y-3 mb-6">
                                  <motion.div 
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="flex items-center gap-2 text-zinc-500 group cursor-default"
                                  >
                                    <span className="text-[13px] font-medium">Researching interface patterns</span>
                                    <ChevronRight size={14} className="opacity-50" />
                                  </motion.div>
                                  <motion.div 
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.1 }}
                                    className="flex items-center gap-2 text-white font-medium"
                                  >
                                    <span className="text-[13px]">Synthesizing master prompt requirements...</span>
                                  </motion.div>
                                  {isTyping && (
                                    <div className="flex gap-1 py-1">
                                      <div className="w-1.5 h-1.5 rounded-full bg-zinc-600 animate-dot-pulse" />
                                      <div className="w-1.5 h-1.5 rounded-full bg-zinc-600 animate-dot-pulse [animation-delay:120ms]" />
                                      <div className="w-1.5 h-1.5 rounded-full bg-zinc-600 animate-dot-pulse [animation-delay:240ms]" />
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Search Progress */}
                              {(message.isSearching || message.searchQuery) && (
                                <div className="space-y-4">
                                  <div className="flex items-center gap-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                                    <div className={`w-1.5 h-1.5 rounded-full ${message.isSearching ? 'bg-blue-500 animate-pulse' : 'bg-green-500'}`} />
                                    {message.isSearching ? 'Search in progress...' : `Searched: ${message.searchQuery}`}
                                  </div>
                                  
                                  {message.sources && message.sources.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                      {message.sources.slice(0, 3).map((source, sIdx) => (
                                        <div 
                                          key={sIdx}
                                          className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-xl text-xs transition-all shadow-sm"
                                        >
                                          <Globe size={12} className="text-gray-400" />
                                          <span className="max-w-[100px] truncate font-medium">{source.title}</span>
                                        </div>
                                      ))}
                                      {message.sources.length > 3 && (
                                        <button 
                                          onClick={() => setIsSourcesPanelOpen(true)}
                                          className="px-3 py-1.5 bg-gray-100 dark:bg-white/10 rounded-xl text-[10px] font-bold text-gray-500 hover:bg-gray-200 transition-colors"
                                        >
                                          +{message.sources.length - 3} MORE
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Main Response Text */}
                              <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.4, delay: 0.2 }}
                                className="prose prose-sm dark:prose-invert max-w-none text-[16px] leading-[1.6]"
                              >
                                <Markdown>{message.content}</Markdown>
                              </motion.div>

                              {/* Footer Actions */}
                              {message.sources && message.sources.length > 0 && (
                                <motion.div 
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  transition={{ duration: 0.2, delay: 0.5 }}
                                  className="pt-4 flex items-center gap-4"
                                >
                                  <button 
                                    onClick={() => setIsSourcesPanelOpen(true)}
                                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-xl text-xs font-bold text-gray-500 dark:text-gray-400 transition-all uppercase tracking-tighter active:scale-95 translate-y-2 opacity-0 animate-fade-up [animation-delay:300ms] [animation-fill-mode:forwards]"
                                  >
                                    <Layout size={14} />
                                    {message.sources.length} Sources
                                  </button>
                                  <button className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl text-gray-400 transition-colors">
                                    <MessageSquare size={16} />
                                  </button>
                                </motion.div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
              
              {isTyping && (
                <div className="flex gap-1.5 py-4 px-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-zinc-600 animate-dot-pulse" />
                  <div className="w-1.5 h-1.5 rounded-full bg-zinc-600 animate-dot-pulse [animation-delay:120ms]" />
                  <div className="w-1.5 h-1.5 rounded-full bg-zinc-600 animate-dot-pulse [animation-delay:240ms]" />
                </div>
              )}
            </div>
          </div>

          {/* Scroll to Bottom Button */}
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

          {/* Sources Slide Panel */}
          <AnimatePresence>
            {isSourcesPanelOpen && (
              <motion.div
                initial={{ x: 400, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 400, opacity: 0 }}
                transition={{ duration: isSourcesPanelOpen ? 0.22 : 0.18 }}
                className="w-80 border-l border-gray-100 dark:border-white/5 bg-white dark:bg-zinc-950 flex flex-col shrink-0 shadow-2xl relative z-20"
              >
                <div className="p-6 flex items-center justify-between border-b border-gray-50 dark:border-white/5">
                  <h3 className="font-display font-semibold tracking-tight text-gray-900 dark:text-white">Sources</h3>
                  <button 
                    onClick={() => setIsSourcesPanelOpen(false)}
                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/5 rounded-md text-gray-400 transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                  {messages.find(m => m.sources)?.sources?.map((source, sIdx) => (
                    <motion.div
                      key={sIdx}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: sIdx * 0.05 }}
                      className="group p-4 bg-gray-50 dark:bg-white/5 border border-transparent hover:border-blue-500/30 rounded-2xl transition-all"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-900 border border-gray-100 dark:border-white/5 flex items-center justify-center shrink-0 shadow-sm">
                          <Globe size={18} className="text-gray-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-xs font-bold text-gray-900 dark:text-white truncate uppercase tracking-tighter">{source.title}</h4>
                            <Globe className="text-gray-400" size={10} />
                          </div>
                          <p className="text-[10px] text-gray-400 truncate mb-3">{source.url}</p>
                          <a 
                            href={source.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-[10px] font-bold text-blue-500 hover:text-blue-600 uppercase tracking-widest"
                          >
                            Open Link <ExternalLink size={10} />
                          </a>
                        </div>
                      </div>
                    </motion.div>
                  )) || (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                      <Layout size={32} className="mb-4" />
                      <p className="text-xs font-semibold uppercase tracking-widest">No Sources Available</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Input Area */}
        <div className="px-4 pb-6 bg-transparent sticky bottom-0 shrink-0">
          <div className="max-w-3xl mx-auto relative group">
            <div className="relative border border-white/5 bg-[#1a1a1a] dark:bg-[#121212]/95 backdrop-blur-3xl rounded-[28px] shadow-2xl focus-within:border-white/10 transition-all overflow-visible flex flex-col p-1.5 min-h-[110px] justify-between">
              <div className="flex-1 px-3 pt-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={adjustTextareaHeight}
                  onKeyDown={handleKeyDown}
                  placeholder="Write a message..."
                  rows={1}
                  className="w-full bg-transparent border-none focus:ring-0 text-[16px] p-0 resize-none min-h-[40px] text-white placeholder-gray-500 scroll-none"
                />
              </div>
              
              <div className="flex items-center justify-between px-3 pb-1.5 pt-3">
                <div className="flex items-center gap-1.5">
                  <div className="relative" ref={plusMenuRef}>
                    <motion.button 
                      whileTap={{ scale: 0.92 }}
                      transition={{ duration: 0.08 }}
                      onClick={() => {
                        setIsPlusMenuOpen(!isPlusMenuOpen);
                        setActivePlusSubMenu('main');
                      }}
                      className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-2xl transition-all"
                    >
                      <Plus size={20} className={`transition-transform duration-200 ${isPlusMenuOpen ? 'rotate-45' : ''}`} />
                    </motion.button>

                    <AnimatePresence>
                      {isPlusMenuOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          className="absolute bottom-full left-0 mb-3 w-64 bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-[70] p-1.5"
                        >
                          {activePlusSubMenu === 'main' ? (
                            <>
                              {[
                                { id: 'files', label: 'Add files or photos', icon: <FileUp size={16} /> },
                                { id: 'screenshot', label: 'Take a screenshot', icon: <Camera size={16} /> },
                                { id: 'project', label: 'Add to project', icon: <FolderPlus size={16} />, hasArrow: true },
                                { id: 'skills', label: 'Skills', icon: <Box size={16} />, hasArrow: true },
                                { id: 'connectors', label: 'Add connectors', icon: <LinkIcon size={16} /> },
                                { type: 'separator' },
                                { id: 'search', label: 'Web search', icon: <Globe size={16} />, isSelected: true },
                                { id: 'mcp_tools', label: 'MCP tools', icon: <HardDrive size={16} />, hasArrow: true },
                              ].map((item, idx) => (
                                item.type === 'separator' ? (
                                  <div key={idx} className="my-1 border-t border-white/5" />
                                ) : (
                                  <button
                                    key={item.id}
                                    onClick={() => {
                                      if (item.id === 'mcp_tools') {
                                        setActivePlusSubMenu('mcp');
                                      } else {
                                        setIsPlusMenuOpen(false);
                                      }
                                    }}
                                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-gray-400 hover:bg-white/5 hover:text-white transition-colors group/item"
                                  >
                                    <div className="flex items-center gap-3">
                                      <span className={`transition-colors ${(item as any).isSelected ? 'text-blue-500' : 'group-hover/item:text-white'}`}>{item.icon}</span>
                                      {item.label}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {(item as any).isSelected && <Check size={14} className="text-blue-500" />}
                                      {(item as any).hasArrow && <ChevronRight size={14} className="text-gray-600 group-hover/item:text-gray-400" />}
                                    </div>
                                  </button>
                                )
                              ))}
                            </>
                          ) : (
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2 px-3 py-2 border-b border-white/5 mb-1">
                                <button 
                                  onClick={() => setActivePlusSubMenu('main')}
                                  className="p-1 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors"
                                >
                                  <ChevronLeft size={16} />
                                </button>
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">MCP Tools</span>
                              </div>
                              <div className="max-h-64 overflow-y-auto custom-scrollbar">
                                {mcpTools.map(tool => (
                                  <button
                                    key={tool.id}
                                    onClick={() => {
                                      setMcpTools(prev => prev.map(t => t.id === tool.id ? { ...t, enabled: !t.enabled } : t));
                                    }}
                                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium text-gray-400 hover:bg-white/5 transition-colors group/tool"
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className={`p-1.5 rounded-lg transition-colors ${tool.enabled ? 'bg-blue-500/10 text-blue-500' : 'bg-white/5 text-gray-500'}`}>
                                        {tool.icon}
                                      </div>
                                      <div className="text-left">
                                        <div className={`transition-colors ${tool.enabled ? 'text-white' : 'text-gray-400'}`}>{tool.name}</div>
                                        <div className="text-[10px] text-gray-500 truncate w-32">{tool.description}</div>
                                      </div>
                                    </div>
                                    <div className={`w-8 h-4 rounded-full transition-colors relative ${tool.enabled ? 'bg-blue-600' : 'bg-gray-700'}`}>
                                      <motion.div 
                                        animate={{ x: tool.enabled ? 18 : 2 }}
                                        className="absolute top-1 w-2 h-2 rounded-full bg-white shadow-sm"
                                      />
                                    </div>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Model Selector Integrated */}
                  <div className="relative" ref={dropdownRef}>
                    <motion.button 
                      whileTap={{ scale: 0.95 }}
                      transition={{ duration: 0.08 }}
                      onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                      className="flex items-center gap-1.5 px-3 py-2 hover:bg-white/5 rounded-2xl text-sm font-medium text-gray-400 transition-all active:scale-95"
                    >
                      <span>Sonnet 3.5</span>
                      <ChevronDown size={14} className={`transition-transform duration-200 ${isModelDropdownOpen ? 'rotate-180' : ''}`} />
                    </motion.button>

                    <AnimatePresence>
                      {isModelDropdownOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          className="absolute bottom-full right-0 mb-3 w-52 bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-[70] p-1.5"
                        >
                          {models.map((model) => (
                            <button
                              key={model.id}
                              onClick={() => {
                                setSelectedModel(model.id);
                                setIsModelDropdownOpen(false);
                              }}
                              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-colors ${
                                selectedModel === model.id 
                                  ? 'bg-white/10 text-white' 
                                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
                              }`}
                            >
                              {model.icon}
                              {model.name}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  
                  {isTyping ? (
                    <motion.button
                      whileTap={{ scale: 0.92 }}
                      onClick={() => setIsTyping(false)}
                      className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center text-gray-400 hover:text-white border border-white/10 transition-all active:scale-95"
                    >
                      <StopCircle size={20} fill="currentColor" />
                    </motion.button>
                  ) : (
                    <motion.button
                      whileTap={{ scale: 0.92 }}
                      onClick={() => handleSend()}
                      disabled={!input.trim()}
                      className={`
                        w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-sm
                        ${input.trim()
                          ? 'bg-white/10 text-white hover:scale-105 active:scale-95'
                          : 'bg-white/5 text-gray-600'}
                      `}
                    >
                      <ArrowUp size={20} strokeWidth={3} />
                    </motion.button>
                  )}
                </div>
              </div>
            </div>
            <div className="absolute -bottom-6 left-0 right-0 text-center">
              <span className="text-[10px] text-gray-500 font-medium tracking-tight">Claude is AI and can make mistakes. Please double-check responses.</span>
            </div>
          </div>
        </div>
      </main>

      {/* Settings Modal */}
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
              {/* Settings Sidebar */}
              <div className="w-56 border-r border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-zinc-950/20 p-6 flex flex-col">
                <h2 className="text-xl font-display font-semibold mb-8">Settings</h2>
                
                <nav className="space-y-1 flex-1">
                  {[
                    { id: 'general', label: 'General', icon: <Settings size={16} /> },
                    { id: 'ai', label: 'AI Service', icon: <Sparkles size={16} /> },
                    { id: 'search', label: 'Search', icon: <Search size={16} /> },
                    { id: 'sources', label: 'Sources', icon: <Layout size={16} /> },
                    { id: 'mcp', label: 'MCP Server', icon: <HardDrive size={16} /> },
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

              {/* Settings Content */}
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
                              <div className="font-medium text-sm">Theme</div>
                              <div className="text-xs text-gray-400">Light or dark interface preference</div>
                            </div>
                            <button 
                              onClick={() => setIsDarkMode(!isDarkMode)}
                              className={`w-12 h-6 rounded-full transition-all relative ${isDarkMode ? 'bg-blue-600' : 'bg-gray-200'}`}
                            >
                              <motion.div 
                                animate={{ x: isDarkMode ? 24 : 4 }}
                                className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm"
                              />
                            </button>
                          </div>
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-sm">Bubble Chat</div>
                              <div className="text-xs text-gray-400">Use classic message bubbles or linear layout</div>
                            </div>
                            <button 
                              onClick={() => setUseBubbles(!useBubbles)}
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
                              onClick={() => setIsCompactSidebar(!isCompactSidebar)}
                              className={`w-12 h-6 rounded-full transition-all relative ${isCompactSidebar ? 'bg-blue-600' : 'bg-gray-200'}`}
                            >
                              <motion.div 
                                animate={{ x: isCompactSidebar ? 24 : 4 }}
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
                          <div className="space-y-1.5">
                            <label className="text-[11px] font-medium text-gray-500">Endpoint URL</label>
                            <input 
                              type="text" 
                              value={serverUrl}
                              onChange={(e) => setServerUrl(e.target.value)}
                              placeholder="https://api.lumina.ai/v1"
                              className="w-full h-11 px-4 text-sm bg-gray-50 dark:bg-zinc-950 border border-gray-100 dark:border-white/5 rounded-xl focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[11px] font-medium text-gray-500">API Key</label>
                            <input 
                              type="password" 
                              value={apiKey}
                              onChange={(e) => setApiKey(e.target.value)}
                              placeholder="sk-••••••••••••••••"
                              className="w-full h-11 px-4 text-sm bg-gray-50 dark:bg-zinc-950 border border-gray-100 dark:border-white/5 rounded-xl focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                            />
                          </div>
                          <div className="p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/20 rounded-2xl">
                            <div className="flex gap-3">
                              <Sparkles size={16} className="text-blue-500 mt-0.5" />
                              <p className="text-xs text-blue-800 dark:text-blue-300 leading-relaxed">
                                Use a custom endpoint to connect your own Lumina-compatible API or proxy server.
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
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <label className="text-xs font-bold text-gray-500 uppercase">Tavily API Key</label>
                              <a href="https://tavily.com" target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-500 hover:underline">Get Key</a>
                            </div>
                            <input 
                              type="password"
                              value={tavilyApiKey}
                              onChange={(e) => setTavilyApiKey(e.target.value)}
                              placeholder="tvly-..."
                              className="w-full bg-gray-50 dark:bg-zinc-950 border border-gray-100 dark:border-white/5 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                            />
                            <p className="text-[10px] text-gray-500 italic">Optimized for AI researchers and real-time data retrieval.</p>
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <label className="text-xs font-bold text-gray-500 uppercase">Serp API Key</label>
                              <a href="https://serpapi.com" target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-500 hover:underline">Get Key</a>
                            </div>
                            <input 
                              type="password"
                              value={serpApiKey}
                              onChange={(e) => setSerpApiKey(e.target.value)}
                              placeholder="..."
                              className="w-full bg-gray-50 dark:bg-zinc-950 border border-gray-100 dark:border-white/5 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                            />
                            <p className="text-[10px] text-gray-500 italic">Universal search API for Google, Bing, and more.</p>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl">
                        <div className="flex gap-3">
                          <Globe size={18} className="text-blue-500 shrink-0" />
                          <div>
                            <div className="text-xs font-bold text-blue-500 uppercase mb-1">Search Integration</div>
                            <p className="text-xs text-blue-500/70 leading-relaxed">
                              When configured, the AI will automatically use these tools to browse the web for time-sensitive information, ensuring responses are grounded in current facts.
                            </p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {activeSettingsTab === 'sources' && (
                    <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                      <div>
                        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-6">Conversation Sources</h3>
                        <div className="space-y-3">
                          {messages.filter(m => m.sources).length > 0 ? (
                            Array.from(new Set(messages.filter(m => m.sources).flatMap(m => m.sources || []).map(s => s.url))).map((url: string) => {
                              const source = messages.filter(m => m.sources).flatMap(m => m.sources || []).find(s => s.url === url);
                              return (
                                <div key={url} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-zinc-950 border border-gray-100 dark:border-white/5 rounded-xl">
                                  <Globe size={16} className="text-gray-400 shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <div className="text-xs font-semibold truncate">{source?.title || 'Unknown Source'}</div>
                                    <div className="text-[10px] text-gray-400 truncate">{url}</div>
                                  </div>
                                  <a 
                                    href={url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-400 hover:text-blue-500 rounded-md transition-colors"
                                  >
                                    <ExternalLink size={14} />
                                  </a>
                                </div>
                              );
                            })
                          ) : (
                            <div className="py-12 text-center">
                              <Layout size={32} className="mx-auto text-gray-200 mb-3" />
                              <p className="text-xs text-gray-400">No sources collected in this session</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {activeSettingsTab === 'mcp' && (
                    <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
                      <div>
                        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-6">MCP Server (Tools)</h3>
                        <div className="space-y-5">
                          <div className="space-y-1.5">
                            <label className="text-[11px] font-medium text-gray-500">Server URL</label>
                            <input 
                              type="text" 
                              value={mcpUrl}
                              onChange={(e) => setMcpUrl(e.target.value)}
                              placeholder="http://localhost:3001"
                              className="w-full h-11 px-4 text-sm bg-gray-50 dark:bg-zinc-950 border border-gray-100 dark:border-white/5 rounded-xl focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[11px] font-medium text-gray-500">Server API Key</label>
                            <input 
                              type="password" 
                              value={mcpKey}
                              onChange={(e) => setMcpKey(e.target.value)}
                              placeholder="mcp_••••••••••••••••"
                              className="w-full h-11 px-4 text-sm bg-gray-50 dark:bg-zinc-950 border border-gray-100 dark:border-white/5 rounded-xl focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                            />
                          </div>
                          <button
                            onClick={() => {
                              if (!mcpUrl) return;
                              setIsConnectingMcp(true);
                              setTimeout(() => {
                                setIsConnectingMcp(false);
                                setIsMcpConnected(!isMcpConnected);
                              }, 800);
                            }}
                            className={`w-full py-3 rounded-xl text-sm font-semibold transition-all ${
                              isMcpConnected 
                                ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/30' 
                                : 'bg-black dark:bg-white text-white dark:text-black shadow-lg shadow-black/10'
                            }`}
                          >
                            {isConnectingMcp ? (
                              <span className="flex items-center justify-center gap-2">
                                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
                                Connecting...
                              </span>
                            ) : (isMcpConnected ? 'Disconnect Server' : 'Connect MCP Server')}
                          </button>
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
    </div>
  );
}
