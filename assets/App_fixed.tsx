/**
 * Lumina AI Chat UI
 * Modern intelligence, refined interface.
 * 
 * A polished, dark-native AI chat prototype built with React, Lucide-react, 
 * Motion, and Tailwind CSS v4.
 */

// Dependencies: react-syntax-highlighter @types/react-syntax-highlighter

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
  Palette,
  Terminal,
  Calendar,
  Image as ImageIcon,
  CloudMoon,
  Video,
  Copy
} from 'lucide-react';
import Markdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

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

function CanvasBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-[#0d0d0d] border border-white/8 rounded-2xl overflow-hidden shadow-xl my-4">
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#161616] border-b border-white/5">
        <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full">
          {language || 'code'}
        </span>
        <button
          onClick={handleCopy}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${
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
            customStyle={{ background: 'transparent', fontSize: '13px', lineHeight: '1.6', margin: 0 }}
            showLineNumbers
            lineNumberStyle={{ color: '#3f3f46', minWidth: '2.5em' }}
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
}

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
  const [activePlusSubMenu, setActivePlusSubMenu] = useState<'main' | 'mcp' | 'project' | 'skills'>('main');
  const DEFAULT_SERVER_URL = 'http://127.0.0.1:8089';
  const DEFAULT_MCP_URL = 'http://127.0.0.1:8089';
  const DEFAULT_API_KEY = 'llama';

  const [serverUrl, setServerUrl] = useState(localStorage.getItem('lumina_server_url') || DEFAULT_SERVER_URL);
  const [apiKey, setApiKey] = useState(localStorage.getItem('lumina_api_key') || DEFAULT_API_KEY);
  const [mcpUrl, setMcpUrl] = useState(localStorage.getItem('lumina_mcp_url') || DEFAULT_MCP_URL);
  const [mcpKey, setMcpKey] = useState(localStorage.getItem('lumina_mcp_key') || DEFAULT_API_KEY);
  const [tavilyApiKey, setTavilyApiKey] = useState(localStorage.getItem('lumina_tavily_key') || '');
  const [serpApiKey, setSerpApiKey] = useState(localStorage.getItem('lumina_serp_key') || '');
  
  const [aiVerificationState, setAiVerificationState] = useState<'idle' | 'verifying' | 'success' | 'error'>('idle');
  const [searchVerificationState, setSearchVerificationState] = useState<'idle' | 'verifying' | 'success' | 'error'>('idle');
  const [isAiSaved, setIsAiSaved] = useState(false);
  const [isSearchSaved, setIsSearchSaved] = useState(false);
  const [isMcpSaved, setIsMcpSaved] = useState(false);
  const [mcpTools, setMcpTools] = useState([
    { id: 'fetch', name: 'Fetch URL', enabled: true, description: 'Read content from any URL', icon: <Globe size={14} /> },
    { id: 'brave', name: 'Brave Search', enabled: true, description: 'Search the web for real-time info', icon: <Search size={14} /> },
    { id: 'fs', name: 'Filesystem', enabled: false, description: 'Read and write local files', icon: <Box size={14} /> },
    { id: 'github', name: 'GitHub', enabled: false, description: 'Access repos and issues', icon: <Box size={14} /> },
  ]);
  const [availableModels, setAvailableModels] = useState<{ id: string; name: string; icon: React.ReactNode; color: string }[]>([
    { id: 'lumina-ultra-plus', name: 'Lumina Ultra Plus', icon: <Sparkles size={14} />, color: 'text-blue-500' },
    { id: 'lumina-pro-max', name: 'Lumina Pro Max', icon: <Plus size={14} />, color: 'text-purple-500' },
    { id: 'lumina-mini-flash', name: 'Lumina Mini Flash', icon: <ArrowUp size={14} />, color: 'text-orange-500' },
  ]);

  const [isMcpConnected, setIsMcpConnected] = useState(false);
  const [isConnectingMcp, setIsConnectingMcp] = useState(false);

  const handleSaveAI = () => {
    localStorage.setItem('lumina_server_url', serverUrl);
    localStorage.setItem('lumina_api_key', apiKey);
    setIsAiSaved(true);
    setTimeout(() => setIsAiSaved(false), 2000);
  };

  const handleVerifyAI = async () => {
    setAiVerificationState('verifying');
    try {
      // Direct call to llama-bridge /models endpoint
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
            setSelectedModel(fetchedModels[0].id);
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
  };

  const handleSaveSearch = () => {
    localStorage.setItem('lumina_tavily_key', tavilyApiKey);
    localStorage.setItem('lumina_serp_key', serpApiKey);
    setIsSearchSaved(true);
    setTimeout(() => setIsSearchSaved(false), 2000);
  };

  const handleVerifySearch = () => {
    setSearchVerificationState('verifying');
    setTimeout(() => {
      if (tavilyApiKey || serpApiKey) {
        setSearchVerificationState('success');
      } else {
        setSearchVerificationState('error');
      }
      setTimeout(() => setSearchVerificationState('idle'), 3000);
    }, 1200);
  };

  const handleSaveMcp = () => {
    localStorage.setItem('lumina_mcp_url', mcpUrl);
    localStorage.setItem('lumina_mcp_key', mcpKey);
    setIsMcpSaved(true);
    setTimeout(() => setIsMcpSaved(false), 2000);
  };

  const handleConnectMcp = async () => {
    if (!mcpUrl) return;
    setIsConnectingMcp(true);
    try {
      // Direct call to llama-bridge /v1/tools endpoint
      const response = await fetch(`${mcpUrl}/v1/tools`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${mcpKey}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        const toolsList = data.tools || data.openai_tools || [];
        
        if (Array.isArray(toolsList)) {
          setMcpTools(toolsList.map((t: any) => {
            const name = t.name || (t.function?.name);
            const desc = t.description || (t.function?.description) || 'Bridge Tool';
            
            // Map icons based on tool names
            let icon = <Box size={14} />;
            if (name.includes('search') || name.includes('research')) icon = <Search size={14} />;
            if (name.includes('shell') || name.includes('terminal')) icon = <Terminal size={14} />;
            if (name.includes('weather')) icon = <CloudMoon size={14} />;
            if (name.includes('wikipedia') || name.includes('globe')) icon = <Globe size={14} />;
            if (name.includes('image')) icon = <ImageIcon size={14} />;
            if (name.includes('date') || name.includes('time')) icon = <Calendar size={14} />;
            if (name.includes('verify')) icon = <Check size={14} />;
            if (name.includes('render') || name.includes('video')) icon = <Video size={14} />;

            return {
              id: name,
              name: name,
              description: desc,
              enabled: true,
              icon: icon
            };
          }));
        }
        setIsMcpConnected(true);
      } else {
        // Try fallback MCP list_tools if /v1/tools failed - direct call
        const mcpResp = await fetch(`${mcpUrl}/list_tools`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${mcpKey}` 
          },
          body: JSON.stringify({})
        });
        
        if (mcpResp.ok) {
          const mcpData = await mcpResp.json();
          if (mcpData.tools) {
            setMcpTools(mcpData.tools.map((t: any) => ({
              id: t.name,
              name: t.name,
              description: t.description || 'MCP Tool',
              enabled: true,
              icon: <Box size={14} />
            })));
          }
          setIsMcpConnected(true);
        } else {
          setIsMcpConnected(false);
        }
      }
    } catch (error) {
      console.error('MCP connection failed:', error);
      setIsMcpConnected(false);
    } finally {
      setIsConnectingMcp(false);
    }
  };

  const [selectedModel, setSelectedModel] = useState('lumina-ultra-plus');
  const [input, setInput] = useState('');
const [isTyping, setIsTyping] = useState(false);
const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);
const [isSearchOpen, setIsSearchOpen] = useState(false);
const [isPlusMenuOpen, setIsPlusMenuOpen] = useState(false);
const [isWebSearchEnabled, setIsWebSearchEnabled] = useState(true);
const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
const [toasts, setToasts] = useState<{ id: string; message: string }[]>([]);
const fileInputRef = useRef<HTMLInputElement>(null);
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

const NodeGraph = ({ nodes }: { nodes: ToolCallNode[] }) => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [allCompleted, setAllCompleted] = useState(false);
    const [startTime] = useState(() => Date.now());

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

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const isRunning = nodes.some(n => n.status === 'active' || n.status === 'pending');

    if (isCollapsed) {
      const lastTool = nodes.filter(n => n.type === 'tool').pop();
      return (
        <motion.button 
          layoutId="node-graph"
          onClick={() => setIsCollapsed(false)}
          className="flex items-center gap-2 px-3 py-1.5 bg-[var(--color-background-secondary)] border border-[var(--color-border-tertiary)] rounded-full text-[11px] font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-background-primary)] transition-all cursor-pointer shadow-sm group"
        >
          <span className="text-[var(--color-background-success)] font-bold">✓</span>
          <span>{lastTool?.label || nodes.length + ' tools'} · {elapsed}s</span>
          <ChevronRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
        </motion.button>
      );
    }

    return (
      <motion.div 
        layoutId="node-graph"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`p-4 bg-[var(--color-background-secondary)] border border-[var(--color-border-tertiary)] rounded-xl overflow-hidden relative group max-w-fit shadow-2xl animate-fade-up ${
          isRunning ? 'tool-call-running' : ''
        }`}
      >
        <div className="flex items-center justify-between mb-4 gap-8">
          <div className="text-[10px] font-bold text-[var(--color-text-tertiary)] uppercase tracking-widest">Tool Call Chain</div>
          <button 
            onClick={() => setIsCollapsed(true)}
            className="text-[10px] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors uppercase tracking-widest"
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
                  <div className={`h-[0.5px] w-full transition-colors duration-500 ${node.status === 'complete' || node.status === 'active' ? 'bg-[var(--color-border-primary)]' : 'bg-[var(--color-border-secondary)]'}`} />
                  {node.status === 'active' && (
                    <motion.div 
                      className="absolute h-1.5 w-1.5 rounded-full bg-[var(--color-accent)] shadow-[0_0_8px_rgba(59,130,246,0.8)] animate-traveling-dot"
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
                className={`node-appear relative flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-300 ${
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
  }
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

  // Auto-connect to AI server and MCP on startup
  useEffect(() => {
    const autoConnect = async () => {
      // Auto-verify AI connection
      if (serverUrl && apiKey) {
        handleVerifyAI();
      }
      // Auto-connect MCP
      if (mcpUrl && mcpKey) {
        handleConnectMcp();
      }
    };
    autoConnect();
  }, []);

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
    let content = contentOverride || input.trim();
    if (!content && attachedFiles.length === 0) return;

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

    // Clear attached files after sending
    setAttachedFiles([]);

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

    // Add interim thinking animation message while waiting for API
    const thinkingId = (Date.now() + 1).toString();
    const thinkingMessage: Message = {
      id: thinkingId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      thinking: isWebSearchEnabled ? 'Searching the web...' : 'Thinking...',
      isSearching: isWebSearchEnabled,
    };
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

    // Real AI Response from configured server - direct call
    try {
      const chatContext = chats.find(c => c.id === chatId)?.messages || [];
      
      // Build API messages, filtering out entries with null/empty content 
      // (these are tool_call-only responses from the bridge)
      const apiMessages = [...chatContext, userMessage]
        .filter(m => m.content && m.content.trim().length > 0)
        .map(m => ({
          role: m.role,
          content: m.content
        }));

      const response = await fetch(`${serverUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: apiMessages,
          stream: false
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const choice = data.choices?.[0]?.message;
      const content = choice?.content;
      const toolCallsRaw = choice?.tool_calls;

      // Build tool call chain nodes from the response
      const toolCallNodes: ToolCallNode[] = [];
      if (Array.isArray(toolCallsRaw) && toolCallsRaw.length > 0) {
        toolCallsRaw.forEach((tc: any, idx: number) => {
          const fn = tc.function || {};
          const name = fn.name || 'unknown';
          
          toolCallNodes.push({
            id: tc.id || `tc-${idx}`,
            type: 'tool',
            label: name,
            status: 'complete',
            icon: name.includes('search') || name.includes('research') ? <Search size={12} /> :
                  name.includes('wikipedia') ? <Globe size={12} /> :
                  name.includes('file') || name.includes('fs') ? <Box size={12} /> :
                  name.includes('github') ? <Box size={12} /> :
                  name.includes('weather') ? <CloudMoon size={12} /> :
                  <Sparkles size={12} />
          });
        });
      } else {
        // No tool calls — just mark AI response as complete
        toolCallNodes.push(
          { id: '1', type: 'ai', label: 'AI Core', status: 'complete', icon: <Sparkles size={12} /> }
        );
      }

      // Replace the interim thinking message with the real response
      const assistantMessage: Message = {
        id: thinkingId,
        role: 'assistant',
        content: content || (toolCallsRaw?.length > 0 ? `Running ${toolCallsRaw.length} tool(s)...` : ''),
        timestamp: new Date(),
        toolCalls: toolCallNodes,
      };
      
      setChats(prev => prev.map(chat => {
        if (chat.id === chatId) {
          const filtered = chat.messages.filter(m => m.id !== thinkingId);
          return {
            ...chat,
            messages: [...filtered, assistantMessage],
            updatedAt: new Date(),
          };
        }
        return chat;
      }));
    } catch (error) {
      console.error('Lumina API Error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Error: Failed to connect to ${serverUrl}. Please check your API key and server configuration in Settings.`,
        timestamp: new Date(),
      };
      // Replace the thinking message with the error message
      setChats(prev => prev.map(chat => {
        if (chat.id === chatId) {
          const filtered = chat.messages.filter(m => m.id !== thinkingId);
          return { ...chat, messages: [...filtered, errorMessage] };
        }
        return chat;
      }));
    } finally {
      setIsTyping(false);
    }
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

  const showToast = (message: string) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  };

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

  const markdownComponents = {
    code({ className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || '');
      if (match) {
        return <CanvasBlock language={match[1]} code={String(children).replace(/\n$/, '')} />;
      }
      return (
        <code className="bg-white/10 px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
          {children}
        </code>
      );
    }
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
                      className="w-16 h-16 bg-gray-50 border border-gray-100 dark:border-white/5 rounded-3xl flex items-center justify-center text-black dark:text-white dark:bg-zinc-900 mb-6 shadow-sm animate-active-ring"
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
                          /* Always apply the slide‑in animation on new messages regardless of role */
                          className={`flex flex-col max-w-[85%] ${message.role === 'user' ? 'items-end' : 'items-start'} animate-msg-in`}
                        >
                          {/*
                            For assistant placeholder messages (those with a `thinking` flag), render a
                            simple animated indicator instead of an empty bubble. Without this,
                            the bubble would appear blank until the real content arrives. The three
                            pulsing dots reuse the `.dot-pulse-*` classes defined in the CSS.
                          */}
                          {message.role === 'assistant' && message.thinking ? (
                            <div className={`px-5 py-3 rounded-2xl text-[15px] leading-relaxed shadow-sm ${
                              'bg-gray-100 dark:bg-zinc-800 text-gray-800 dark:text-gray-200 rounded-tl-none'
                            } flex gap-2 items-center`}
                            >
                              {/* Optional shimmering label for context */}
                              <span className="text-[13px] font-medium text-zinc-500 shimmer-text mr-2">
                                {message.thinking}
                              </span>
                              {/* Pulsing dots indicator */}
                              <div className="flex gap-1.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-zinc-500 dot-pulse-1" />
                                <div className="w-1.5 h-1.5 rounded-full bg-zinc-500 dot-pulse-2" />
                                <div className="w-1.5 h-1.5 rounded-full bg-zinc-500 dot-pulse-3" />
                              </div>
                            </div>
                          ) : (
                            <div className={`px-5 py-3 rounded-2xl text-[15px] leading-relaxed shadow-sm ${
                              message.role === 'user' 
                                ? 'bg-black dark:bg-white text-white dark:text-black rounded-tr-none' 
                                : 'bg-gray-100 dark:bg-zinc-800 text-gray-800 dark:text-gray-200 rounded-tl-none'
                            }`}>
                              <div className="markdown-body">
                                <Markdown components={markdownComponents}>{message.content}</Markdown>
                              </div>
                            </div>
                          )}
                          {/* Timestamp and author label */}
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

                              {/* Status Steps - Thinking / Searching Animation */}
                              {message.thinking && (
                                <div className="space-y-4 mb-6">
                                  {/* Phase 1: Initial thought */}
                                  <motion.div 
                                    initial={{ opacity: 0, y: -6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="smooth-fade-in"
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className="w-5 h-5 rounded-full bg-zinc-800 dark:bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
                                        <motion.div 
                                          animate={{ rotate: 360 }} 
                                          transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                                          className="w-2 h-2 rounded-full bg-zinc-400"
                                        />
                                      </div>
                                      <div className="flex flex-col gap-0.5">
                                        <span className="text-[13px] font-medium text-zinc-400 shimmer-text">
                                          {message.thinking}
                                        </span>
                                        <span className="text-[11px] text-zinc-600">
                                          {isWebSearchEnabled ? 'Searching multiple sources' : 'Processing your request'}
                                        </span>
                                      </div>
                                    </div>
                                  </motion.div>
                                  
                                  {/* Phase 2: Processing steps that animate sequentially */}
                                  {isTyping && (
                                    <>
                                      <motion.div 
                                        initial={{ opacity: 0, y: -6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.15 }}
                                        className="smooth-fade-in ml-8"
                                      >
                                        <div className="flex items-center gap-2 text-zinc-500">
                                          <ChevronRight size={12} className="opacity-50 shrink-0" />
                                          <span className="text-[12px] fade-in-token">
                                            {isWebSearchEnabled ? 'Gathering relevant information' : 'Analyzing input'}
                                          </span>
                                        </div>
                                      </motion.div>
                                      <motion.div 
                                        initial={{ opacity: 0, y: -6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.3 }}
                                        className="smooth-fade-in ml-8"
                                      >
                                        <div className="flex items-center gap-2 text-zinc-500">
                                          <ChevronRight size={12} className="opacity-50 shrink-0" />
                                          <span className="text-[12px] fade-in-token">
                                            {isWebSearchEnabled ? 'Synthesizing search results' : 'Synthesizing response'}
                                          </span>
                                        </div>
                                      </motion.div>
                                    </>
                                  )}

                                  {/* Animated dots */}
                                  {isTyping && (
                                    <div className="flex gap-1.5 py-2 ml-8 smooth-fade-in">
                                      <div className="w-1.5 h-1.5 rounded-full bg-zinc-500 dot-pulse-1" />
                                      <div className="w-1.5 h-1.5 rounded-full bg-zinc-500 dot-pulse-2" />
                                      <div className="w-1.5 h-1.5 rounded-full bg-zinc-500 dot-pulse-3" />
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Search Progress (when searchQuery is set) */}
                              {message.searchQuery && !message.thinking && (
                                <div className="space-y-4">
                                  <div className="flex items-center gap-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                                    {message.isSearching ? (
                                      <div className="relative w-4 h-4 flex items-center justify-center">
                                        <div className="search-ping absolute inset-0 rounded-full border border-blue-500" />
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 relative z-10" />
                                      </div>
                                    ) : (
                                      <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                    )}
                                    {message.isSearching ? 'Search in progress...' : `Searched: ${message.searchQuery}`}
                                  </div>
                                  
                                  {message.sources && message.sources.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                      {message.sources.slice(0, 3).map((source, sIdx) => (
                                        <div 
                                          key={sIdx}
                                          className="search-result flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-xl text-xs transition-all shadow-sm"
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
                                <Markdown components={markdownComponents}>{message.content}</Markdown>
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
                                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-xl text-xs font-bold text-gray-500 dark:text-gray-400 transition-all uppercase tracking-tighter active:scale-95 translate-y-2 animate-fade-up [animation-delay:300ms] [animation-fill-mode:forwards]"
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
                {attachedFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-3 pb-1">
                    {attachedFiles.map((file, idx) => (
                      <div key={idx} className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-[11px] font-medium text-gray-300">
                        <FileUp size={12} className="text-blue-400 shrink-0" />
                        <span className="max-w-[120px] truncate">{file.name}</span>
                        <button
                          onClick={() => setAttachedFiles(prev => prev.filter((_, i) => i !== idx))}
                          className="text-gray-500 hover:text-red-400 transition-colors ml-0.5"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
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
                      className={`p-2 rounded-2xl transition-all ${isWebSearchEnabled ? 'text-blue-500 bg-blue-500/10 hover:bg-blue-500/20' : 'text-gray-400 hover:text-white hover:bg-white/5'} ${isWebSearchEnabled ? 'animate-active-ring' : ''}`}
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
                                { id: 'search', label: 'Web search', icon: <Globe size={16} />, isSelected: isWebSearchEnabled },
                                { id: 'mcp_tools', label: 'MCP tools', icon: <HardDrive size={16} />, hasArrow: true },
                              ].map((item, idx) => (
                                item.type === 'separator' ? (
                                  <div key={idx} className="my-1 border-t border-white/5" />
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
                                        case 'project':
                                          setActivePlusSubMenu('project');
                                          break;
                                        case 'skills':
                                          setActivePlusSubMenu('skills');
                                          break;
                                        case 'connectors':
                                          setIsSettingsOpen(true);
                                          setActiveSettingsTab('mcp');
                                          setIsPlusMenuOpen(false);
                                          break;
                                        case 'search':
                                          setIsWebSearchEnabled(prev => !prev);
                                          break;
                                        case 'mcp_tools':
                                          setActivePlusSubMenu('mcp');
                                          break;
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
                          ) : activePlusSubMenu === 'project' ? (
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2 px-3 py-2 border-b border-white/5 mb-1">
                                <button 
                                  onClick={() => setActivePlusSubMenu('main')}
                                  className="p-1 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors"
                                >
                                  <ChevronLeft size={16} />
                                </button>
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Projects</span>
                              </div>
                              {['Personal', 'Work', 'Research'].map(project => (
                                <button
                                  key={project}
                                  onClick={() => {
                                    showToast(`Added to ${project} project`);
                                    setIsPlusMenuOpen(false);
                                    setActivePlusSubMenu('main');
                                  }}
                                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-gray-400 hover:bg-white/5 hover:text-white transition-colors"
                                >
                                  <FolderPlus size={16} />
                                  {project}
                                </button>
                              ))}
                            </div>
                          ) : activePlusSubMenu === 'skills' ? (
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2 px-3 py-2 border-b border-white/5 mb-1">
                                <button 
                                  onClick={() => setActivePlusSubMenu('main')}
                                  className="p-1 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors"
                                >
                                  <ChevronLeft size={16} />
                                </button>
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Skills</span>
                              </div>
                              {[
                                { id: 'summarize', label: 'Summarize', prompt: 'Please summarize the following: ' },
                                { id: 'translate', label: 'Translate', prompt: 'Translate the following to English: ' },
                                { id: 'explain', label: 'Explain Code', prompt: 'Explain this code step by step: ' },
                                { id: 'brainstorm', label: 'Brainstorm', prompt: 'Brainstorm 5 creative ideas for: ' },
                              ].map(skill => (
                                <button
                                  key={skill.id}
                                  onClick={() => {
                                    setInput(skill.prompt);
                                    setIsPlusMenuOpen(false);
                                    setActivePlusSubMenu('main');
                                    setTimeout(() => inputRef.current?.focus(), 50);
                                  }}
                                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-gray-400 hover:bg-white/5 hover:text-white transition-colors"
                                >
                                  <Box size={16} />
                                  {skill.label}
                                </button>
                              ))}
                            </div>
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
                      <span>{availableModels.find(m => m.id === selectedModel)?.name || 'Select Model'}</span>
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
                          {availableModels.map((model) => (
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
                              <div className={model.color || ''}>
                                {model.icon}
                              </div>
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
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf,.txt,.md,.csv"
                multiple
                className="hidden"
                onChange={(e) => {
                  setAttachedFiles(prev => [...prev, ...Array.from(e.target.files || [])]);
                  e.target.value = '';
                }}
              />
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
                              onChange={(e) => { setServerUrl(e.target.value); setIsAiSaved(false); }}
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
                              placeholder="Enter your API key"
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
                              onChange={(e) => { setTavilyApiKey(e.target.value); setIsSearchSaved(false); }}
                              placeholder="Enter your Tavily API key"
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
                              onChange={(e) => { setSerpApiKey(e.target.value); setIsSearchSaved(false); }}
                              placeholder="Enter your SerpAPI key"
                              className="w-full bg-gray-50 dark:bg-zinc-950 border border-gray-100 dark:border-white/5 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                            />
                            <p className="text-[10px] text-gray-500 italic">Universal search API for Google, Bing, and more.</p>
                          </div>

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
                              onChange={(e) => { setMcpUrl(e.target.value); setIsMcpSaved(false); }}
                              placeholder="http://localhost:8080"
                              className="w-full h-11 px-4 text-sm bg-gray-50 dark:bg-zinc-950 border border-gray-100 dark:border-white/5 rounded-xl focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[11px] font-medium text-gray-500">Server API Key</label>
                            <input 
                              type="password" 
                              value={mcpKey}
                              onChange={(e) => { setMcpKey(e.target.value); setIsMcpSaved(false); }}
                              placeholder="Enter your API key"
                              className="w-full h-11 px-4 text-sm bg-gray-50 dark:bg-zinc-950 border border-gray-100 dark:border-white/5 rounded-xl focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                            />
                          </div>
                          <div className="flex gap-3">
                            <button
                              onClick={handleSaveMcp}
                              className={`flex-1 h-11 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                                isMcpSaved 
                                  ? 'bg-emerald-500 text-white' 
                                  : 'bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-zinc-300 border border-gray-200 dark:border-white/10 hover:bg-gray-200 dark:hover:bg-white/10'
                              }`}
                            >
                              {isMcpSaved ? <Check size={16} /> : null}
                              {isMcpSaved ? 'Saved' : 'Save Config'}
                            </button>
                            <button
                              onClick={handleConnectMcp}
                              className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all ${
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
                              ) : (isMcpConnected ? 'Disconnect' : 'Connect')}
                            </button>
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

      {/* Toast Notifications */}
      <div className="fixed bottom-32 left-1/2 -translate-x-1/2 flex flex-col gap-2 items-center z-50 pointer-events-none">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 16, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.92 }}
              className="px-4 py-2.5 bg-zinc-900 border border-white/10 rounded-2xl text-xs font-medium text-white shadow-2xl backdrop-blur-sm"
            >
              {toast.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
