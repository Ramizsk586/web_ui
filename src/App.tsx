/**
 * Lumina AI Chat UI
 * Modern intelligence, refined interface.
 * 
 * A polished, dark-native AI chat prototype built with React, Lucide-react, 
 * Motion, and Tailwind CSS v4.
 * 
 * All tools are sourced from the Llama Bridge - no built-in UI-side tool definitions.
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
  X,
  Languages,
  Layout,
  MessageSquare,
  StopCircle,
  Download,
  FileUp,
  Camera,
  FolderPlus,
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
  FileCode,
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
  Flower2
} from 'lucide-react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

import { fetchBridgeTools, callLlamaBridge as bridgeCall, checkBridgeHealth } from './bridgeClient';
import { useTheme, ThemeSettingsPanel } from './themes';
import { CustomCodeBlockVisualizer, renderTextWithMath, InteractiveTableVisualizer } from './components/LuminaVisualizer';
import { PhysicsGraphCanvas } from './components/PhysicsGraphCanvas';
import { ChemistryLabCanvas } from './components/ChemistryLabCanvas';
import { MathLabCanvas } from './components/MathLabCanvas';
import { BiologyLabCanvas } from './components/BiologyLabCanvas';

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
}

interface Chat {
   id: string;
   title: string;
   messages: Message[];
   updatedAt: Date;
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
        properties: Record<string, { type: string; description: string }>;
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

interface SidebarProps {
  chats: Chat[];
  currentChatId: string | null;
  setCurrentChatId: (id: string | null) => void;
  createNewChat: () => void;
  setChats: React.Dispatch<React.SetStateAction<Chat[]>>;
  isCollapsed: boolean;
  onToggle: () => void;
  onOpenSettings: () => void;
  userProfile: {
    name: string;
    avatar: string;
    dob: string;
    location: string;
  };
  hideToggle?: boolean;
  activeLabTab: 'physics' | 'chemistry' | 'math' | 'biology' | null;
  setActiveLabTab: (tab: 'physics' | 'chemistry' | 'math' | 'biology' | null) => void;
}

const SidebarContent = ({ 
  chats, 
  currentChatId, 
  setCurrentChatId, 
  createNewChat, 
  setChats,
  onToggle,
  onOpenSettings,
  userProfile,
  hideToggle,
  activeLabTab,
  setActiveLabTab
}: SidebarProps) => {
  const [labsHovered, setLabsHovered] = useState(false);
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
        {!hideToggle && (
          <button 
            onClick={onToggle}
            className="p-1.5 hover:bg-gray-200 dark:hover:bg-zinc-800 rounded-md transition-colors text-gray-500"
          >
            <SidebarIcon size={18} />
          </button>
        )}
      </div>

      <button 
        onClick={() => {
          createNewChat();
          setActiveLabTab(null);
        }}
        className="flex items-center gap-3 p-3 mb-6 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/5 rounded-xl shadow-sm hover:shadow-md hover:border-gray-300 dark:hover:border-white/10 transition-all text-sm font-medium dark:text-white"
      >
        <Plus size={18} />
        New chat
      </button>

      <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar">
        <div 
          className="space-y-1 relative"
          onMouseEnter={() => setLabsHovered(true)}
          onMouseLeave={() => setLabsHovered(false)}
        >
          <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2 px-3">Laboratories</div>
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
                      if (!hideToggle && onToggle) onToggle();
                    }}
                    className={`w-full p-2 rounded-md flex items-center gap-2.5 text-xs font-medium transition-all ${
                      activeLabTab === lab.id
                        ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 font-semibold'
                        : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800 dark:hover:bg-white/5 dark:hover:text-zinc-200'
                    }`}
                  >
                    {lab.icon}
                    <span className="truncate">{lab.name}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      <div className="space-y-1">
        <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2 px-3">Recent Chats</div>
        {chats.map(chat => (
          <div key={chat.id} className="group relative">
            <button
              onClick={() => {
                setCurrentChatId(chat.id);
                setIsPhysicsTabActive(false);
                if (!hideToggle && onToggle) onToggle();
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
        {chats.length === 0 && (
          <div className="px-3 py-4 text-xs text-gray-400 italic">No recent chats</div>
        )}
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
      <div className="p-2.5 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs overflow-hidden">
          {userProfile.avatar ? (
            <img src={userProfile.avatar} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            userProfile.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
          )}
        </div>
        <div className="flex-1 text-xs">
          <div className="font-semibold truncate">{userProfile.name}</div>
          <div className="text-gray-400">{userProfile.location || 'Pro Plan'}</div>
        </div>
      </div>
    </div>
  </>
  );
};

const CanvasBlock = React.memo(({ language, code }: { language: string; code: string }) => {
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

const SearchResultsUI = React.memo(({ query, sources, onToggleSources }: { query: string; sources: any[]; isSearching?: boolean; onToggleSources?: () => void }) => {
  return (
    <div className="my-6 space-y-4">
      <div className="flex items-center gap-3 text-[13px] font-medium text-zinc-500 dark:text-zinc-400 pl-1">
        <button 
          onClick={onToggleSources}
          className="p-1.5 rounded-lg border shadow-sm transition-all hover:scale-105 active:scale-95 bg-zinc-50 border-zinc-100 dark:bg-white/5 dark:border-white/10 hover:bg-zinc-100 dark:hover:bg-white/10"
        >
          <Globe size={14} />
        </button>
        <div className="flex flex-col">
          <span className="text-zinc-800 dark:text-zinc-200">{query}</span>
          <span className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">{sources.length} sources found</span>
        </div>
      </div>

      <div className="bg-zinc-50/50 dark:bg-white/[0.02] border border-zinc-100 dark:border-white/5 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-1 space-y-0.5">
          {sources.map((source, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -5 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center justify-between p-3 hover:bg-white dark:hover:bg-white/5 rounded-xl transition-all group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-6 h-6 rounded-md bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-white/10 flex items-center justify-center p-1 shrink-0 bg-white/50 backdrop-blur-sm">
                  {getFavicon(source.url) ? (
                    <img src={getFavicon(source.url)!} alt="" className="w-full h-full object-contain filter dark:brightness-90 truncate" />
                  ) : (
                    <Globe size={12} className="text-zinc-400" />
                  )}
                </div>
                <span className="text-[13px] font-medium text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 truncate transition-colors">
                  {source.title}
                </span>
              </div>
              <span className="text-[11px] text-zinc-400 dark:text-zinc-500 font-mono tracking-tight shrink-0 pl-4 opacity-60 group-hover:opacity-100 transition-opacity">
                {getDomain(source.url)}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
});

const NodeGraph = React.memo(({ 
  nodes, 
  isStreaming,
  thinkContent,
  isStreamingThinking,
  isSearching,
  searchQuery,
  sources = []
}: { 
  nodes: ToolCallNode[]; 
  isStreaming?: boolean;
  thinkContent?: string;
  isStreamingThinking?: boolean;
  isSearching?: boolean;
  searchQuery?: string;
  sources?: any[];
}) => {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return !(isStreaming || isStreamingThinking || isSearching || nodes.some(n => n.status === 'active'));
  });

  const [isThinkingExpanded, setIsThinkingExpanded] = useState(true);
  const [isSearchExpanded, setIsSearchExpanded] = useState(true);

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
                            <motion.div 
                              key={source.url + '-' + idx}
                              initial={{ opacity: 0, y: 5 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.2, delay: idx * 0.04 }}
                              className="flex items-start justify-between text-xs p-2.5 rounded-lg border border-zinc-205 dark:border-white/5 bg-white dark:bg-zinc-950/20 font-sans group/src shadow-xs"
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
                            </motion.div>
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

                      {/* Scrape Agent logs */}
                      {isSearching && (
                        <div className="p-2.5 rounded-lg border border-zinc-200/50 dark:border-zinc-850 bg-zinc-900 dark:bg-zinc-950 text-[10.5px] font-mono text-zinc-300 dark:text-zinc-400 space-y-1 overflow-hidden shadow-inner max-h-[110px] overflow-y-auto">
                          <div className="text-zinc-500 font-bold">// REAL-TIME WEB SCRAPING SESSION</div>
                          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
                            <span className="text-emerald-500 font-semibold">[info]</span> Initializing Lumina Scraper Engine... Done!
                          </motion.div>
                          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
                            <span className="text-blue-450 font-semibold">[query]</span> Searching {searchQuery || 'requested terms'}...
                          </motion.div>
                          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}>
                            <span className="text-amber-500 font-semibold">[parser]</span> Spawning headless scrape cluster...
                          </motion.div>
                          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.8 }} className="animate-pulse text-zinc-400">
                            &gt; Scraping active. Results will be synthesized in real-time.
                          </motion.div>
                        </div>
                      )}
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

          {displayNodes.map((node, i) => (
            <motion.div
              key={node.id}
              initial={(isStreaming || isStreamingThinking) ? false : { opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="relative flex items-center gap-3 pl-8"
            >
              <div className="absolute left-0 top-[10px] w-4 h-[1px] bg-zinc-100 dark:bg-white/5" />
              <div className={`transition-colors shrink-0 ${node.status === 'active' ? 'text-blue-500' : 'text-zinc-400 dark:text-zinc-500'}`}>
                {node.icon || <FileText size={14} />}
              </div>
              <span className={`text-[13.5px] font-medium transition-colors ${
                node.status === 'active'
                  ? 'text-blue-500'
                  : 'text-zinc-600 dark:text-zinc-400'
              }`}>
                {node.label}
              </span>
              {node.status === 'active' && (
                <motion.div
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className="ml-2 w-1.5 h-1.5 rounded-full bg-blue-500"
                />
              )}
            </motion.div>
          ))}
          {allComplete && !isStreaming && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: displayNodes.length * 0.05 }}
              className="relative flex items-center gap-3 pl-8 pt-1"
            >
              <div className="absolute left-0 top-[14px] w-4 h-[1px] bg-zinc-100 dark:bg-white/5" />
              <div className="shrink-0 flex items-center justify-center w-4 h-4 rounded-full border border-zinc-500 text-zinc-500">
                <Check size={10} strokeWidth={3} />
              </div>
              <span className="text-[14px] font-bold text-zinc-800 dark:text-zinc-200">Done</span>
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
  setCanvasView 
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
}) => {
  const [copied, setCopied] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      layout
      className={`flex flex-col w-full ${message.role === 'user' ? 'items-end mb-8' : 'items-start mb-12'}`}
    >
      {message.role === 'user' ? (
        <motion.div className="flex flex-col max-w-[85%] items-end">
          <div className="user-message-bubble px-5 py-3 rounded-2xl text-[15px] leading-relaxed shadow-sm bg-black dark:bg-white text-white/90 dark:text-zinc-800 rounded-tr-none border border-black/5 dark:border-white/10">
            <div className="markdown-body text-left">
              <Markdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{message.content}</Markdown>
            </div>
          </div>
          <div className="mt-2 text-[10px] text-gray-400 px-1 font-medium uppercase tracking-tight flex items-center gap-2">
            {userProfile.avatar && (
              <img src={userProfile.avatar} alt="" className="w-3 h-3 rounded-full object-cover grayscale opacity-60" referrerPolicy="no-referrer" />
            )}
            {userProfile.name} • {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </motion.div>
      ) : (
        <motion.div layout={message.isStreaming ? "position" : false} className="w-full space-y-4 max-w-3xl">
          {((message.toolCalls && message.toolCalls.length > 0) || (message.thinkContent !== undefined && message.thinkContent.length > 0) || message.searchQuery || message.isSearching) && (
            <NodeGraph 
              nodes={message.toolCalls || []} 
              isStreaming={message.isStreaming} 
              thinkContent={message.thinkContent}
              isStreamingThinking={message.isThinking}
              isSearching={message.isSearching}
              searchQuery={message.searchQuery}
              sources={message.sources || []}
            />
          )}
          {message.searchQuery && message.sources && message.sources.length > 0 && (
            <SearchResultsUI 
              query={message.searchQuery} 
              sources={message.sources || []} 
              onToggleSources={() => {
                setSourcesPanelMessageId(message.id);
                setIsSourcesPanelOpen(!isSourcesPanelOpen);
              }}
            />
          )}
          <div className="markdown-body prose-lg max-w-none px-1" style={{ minHeight: message.isStreaming ? '1.5rem' : undefined }}>
            {message.content ? (
              message.isStreaming ? (
                <span className="streaming-content">
                  <Markdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{message.content}</Markdown>
                  <motion.span
                    animate={{ opacity: [1, 0] }}
                    transition={{ repeat: Infinity, duration: 0.6 }}
                    className="inline-block w-1.5 h-4 bg-current ml-0.5 rounded-sm align-middle"
                  />
                </span>
              ) : (
                <>
                  <Markdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{message.content}</Markdown>
                  {renderLabSuggestions(message.content)}
                </>
              )
            ) : message.isStreaming ? (
              <span className="text-zinc-400 animate-pulse">Generating...</span>
            ) : null}
          </div>

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
                        onClick={() => window.open(url, '_blank')}
                      />
                      <div className="bg-zinc-50 dark:bg-zinc-900/80 px-4 py-2 border-t border-zinc-150/40 dark:border-white/5 text-[10px] font-semibold text-zinc-550 dark:text-zinc-400 flex items-center justify-between">
                        <span className="truncate max-w-[70%]">{url}</span>
                        <a href={url} target="_blank" rel="noreferrer" className="text-blue-550 dark:text-blue-400 hover:underline uppercase text-[9px] font-bold tracking-wider">Open original</a>
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
                  className="relative aspect-square rounded-2xl overflow-hidden group border border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-zinc-950 shadow-sm transition-all hover:shadow-md"
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

const Canvas = ({ 
  artifact, 
  isOpen, 
  onClose, 
  view, 
  onSetView 
}: { 
  artifact: Artifact | null; 
  isOpen: boolean; 
  onClose: () => void;
  view: 'code' | 'preview';
  onSetView: (v: 'code' | 'preview') => void;
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
                  className="h-full overflow-y-auto bg-zinc-50 dark:bg-zinc-950 custom-scrollbar"
                >
                  {artifact.type === 'poem' ? (
                    <div className="flex flex-col items-center justify-center min-h-full py-12 px-4 md:px-6 bg-gradient-to-b from-amber-55/15 to-orange-55/10 dark:from-zinc-950/40 dark:to-zinc-950/20">
                      <motion.div 
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="w-full max-w-xl bg-amber-50/15 dark:bg-zinc-900/90 border border-amber-250/30 dark:border-zinc-800/60 rounded-3xl p-8 md:p-12 shadow-xl relative overflow-hidden font-serif"
                      >
                        {/* Decorative borders styling */}
                        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-amber-400 via-pink-400 to-rose-400" />
                        <div className="absolute inset-4 md:inset-5 border border-dashed border-amber-200/40 dark:border-zinc-800/60 pointer-events-none rounded-2xl" />
                        
                        <div className="text-center relative z-10 py-2">
                          <div className="flex justify-center mb-5 text-amber-500/80">
                            <span className="text-2xl">✦ ❁ ✦</span>
                          </div>
                          
                          <h1 className="text-2xl md:text-3xl font-extrabold tracking-wide text-zinc-900 dark:text-zinc-50 mb-2 font-serif leading-tight">
                            {artifact.title}
                          </h1>
                          <div className="text-[10px] md:text-xs italic text-zinc-400 dark:text-zinc-500 mb-8 font-sans uppercase tracking-widest font-semibold flex items-center justify-center gap-2">
                            <span>By Lumina AI</span>
                            <span>•</span>
                            <span>Verse</span>
                          </div>
                          
                          <div className="text-base md:text-lg text-zinc-700 dark:text-zinc-200 leading-loose whitespace-pre-wrap text-center tracking-wide italic font-serif px-2">
                            {artifact.content}
                          </div>
                          
                          <div className="mt-12 pt-6 border-t border-dashed border-amber-200/30 dark:border-zinc-800/40 flex justify-center text-amber-500/80">
                            <span className="text-xl">❦</span>
                          </div>
                        </div>
                      </motion.div>
                    </div>
                  ) : artifact.type === 'report' ? (
                    <div className="min-h-full py-12 px-4 md:px-6 bg-zinc-50 dark:bg-zinc-950/40">
                      <motion.div 
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="w-full max-w-3xl bg-white dark:bg-[#121212] border border-zinc-200/60 dark:border-white/5 rounded-2xl p-6 md:p-14 shadow-xl relative"
                      >
                        {/* Professional Letterhead */}
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-6 border-b-2 border-zinc-100 dark:border-zinc-800/80 mb-8 gap-4">
                          <div>
                            <div className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-1 font-mono">
                              Official Intelligence Report
                            </div>
                            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white leading-tight">
                              {artifact.title}
                            </h1>
                          </div>
                          <div className="text-left md:text-right text-[11px] font-medium text-zinc-400 dark:text-zinc-500 space-y-0.5 font-mono">
                            <div><span className="font-semibold text-zinc-600 dark:text-zinc-300">Date:</span> {new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                            <div><span className="font-semibold text-zinc-600 dark:text-zinc-300">Author:</span> Lumina Engine</div>
                            <div><span className="font-semibold text-zinc-600 dark:text-zinc-300">Doc ID:</span> LUM-{(Math.random() * 100000).toFixed(0)}</div>
                          </div>
                        </div>
                        
                        <div className="markdown-body prose dark:prose-invert max-w-none prose-zinc dark:prose-zinc text-zinc-800 dark:text-zinc-200 leading-relaxed text-sm md:text-base">
                          <Markdown remarkPlugins={[remarkGfm]}>{artifact.content}</Markdown>
                        </div>
                        
                        <div className="mt-16 pt-8 border-t border-zinc-150 dark:border-zinc-800/80 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                          <div className="text-[10.5px] text-zinc-400 dark:text-zinc-500 font-mono leading-relaxed">
                            This publication was synthesized dynamically by the Lumina Intelligence layer.
                          </div>
                          <div className="shrink-0 flex flex-col items-center">
                            <div className="w-40 border-b border-zinc-300 dark:border-zinc-700 mb-1.5 h-10 flex items-end justify-center select-none">
                              <span className="font-serif italic text-sm text-blue-500/60 dark:text-blue-400/60 font-semibold select-none">Lumina AI</span>
                            </div>
                            <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Authorized Signature</span>
                          </div>
                        </div>
                      </motion.div>
                    </div>
                  ) : artifact.type === 'markdown' ? (
                    <div className="h-full overflow-y-auto bg-white dark:bg-zinc-900 p-8 custom-scrollbar">
                      <div className="markdown-body prose dark:prose-invert max-w-none">
                        <Markdown remarkPlugins={[remarkGfm]}>{artifact.content}</Markdown>
                      </div>
                    </div>
                  ) : (
                    <div className="h-full bg-white dark:bg-zinc-900 overflow-hidden">
                      <iframe
                        title="Preview"
                        srcDoc={artifact.content}
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
  const [chats, setChats] = useState<Chat[]>([]);
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
  const [isCompactSidebar, setIsCompactSidebar] = useState(false);
  const [useBubbles, setUseBubbles] = useState(true);
  const [isSourcesPanelOpen, setIsSourcesPanelOpen] = useState(false);
  const [sourcesPanelMessageId, setSourcesPanelMessageId] = useState<string | null>(null);
  const [activeSettingsTab, setActiveSettingsTab] = useState<'general' | 'ai' | 'mcp' | 'bridge' | 'sources' | 'search' | 'persona' | 'profile' | 'theme'>('general');
  const [activePlusSubMenu, setActivePlusSubMenu] = useState<'main' | 'mcp' | 'tools' | 'project' | 'skills' | 'style'>('main');
  const [userProfile, setUserProfile] = useState({
    name: 'User',
    avatar: '',
    dob: '',
    location: ''
  });
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
  const [tavilyApiKey, setTavilyApiKey] = useState(() => safeGetItem('lumina_tavily_key', ''));
  const [serpApiKey, setSerpApiKey] = useState(() => safeGetItem('lumina_serp_key', ''));
  
  const [aiVerificationState, setAiVerificationState] = useState<'idle' | 'verifying' | 'success' | 'error'>('idle');
  const [searchVerificationState, setSearchVerificationState] = useState<'idle' | 'verifying' | 'success' | 'error'>('idle');
  const [isAiSaved, setIsAiSaved] = useState(false);
  const [isSearchSaved, setIsSearchSaved] = useState(false);
   const [isMcpSaved, setIsMcpSaved] = useState(false);
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
    setIsSearchSaved(true);
    setTimeout(() => setIsSearchSaved(false), 2000);
  };

  const handleVerifySearch = useCallback(() => {
    setSearchVerificationState('verifying');
    setTimeout(() => {
      if (tavilyApiKey || serpApiKey) {
        setSearchVerificationState('success');
      } else {
        setSearchVerificationState('error');
      }
      setTimeout(() => setSearchVerificationState('idle'), 3000);
    }, 1200);
  }, [tavilyApiKey, serpApiKey]);

  // Auto-verify pre-configured API keys on app boot / mount
  useEffect(() => {
    const savedApiKey = localStorage.getItem('lumina_api_key');
    if (savedApiKey && savedApiKey.trim().length > 0) {
      handleVerifyAI();
    }
    const savedTavily = localStorage.getItem('lumina_tavily_key');
    const savedSerp = localStorage.getItem('lumina_serp_key');
    if ((savedTavily && savedTavily.trim().length > 0) || (savedSerp && savedSerp.trim().length > 0)) {
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
  // All tools come from the bridge. No inbuilt tools are defined in the UI.
  const buildActiveTools = (): ToolDefinition[] => {
    return bridgeTools
      .filter(t => t.enabled)
      .map(t => ({
        type: 'function' as const,
        function: {
          name: t.id,
          description: t.description || 'Bridge Tool',
          parameters: t.parameters || { type: 'object', properties: {}, required: [] }
        }
      }));
  };
  
  // ─── Bridge Communication ──────────────────────────────────────────────────
  const callLlamaBridge = async (messages: any[], tools: ToolDefinition[]) => {
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
            enabled: true,
            icon,
            parameters: t.parameters,
          };
        });
        setBridgeTools(mappedTools);
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
  const [canvasView, setCanvasView] = useState<'code' | 'preview'>('code');
  const [typingMessageId, setTypingMessageId] = useState<string | null>(null);
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isPlusMenuOpen, setIsPlusMenuOpen] = useState(false);
  const [isWebSearchEnabled, setIsWebSearchEnabled] = useState(false);
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

  const menuContentRef = useRef<HTMLDivElement>(null);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({
    bottom: '100%',
    marginBottom: '12px',
  });

  const adjustMenuPosition = useCallback(() => {
    if (!plusMenuRef.current || !menuContentRef.current) return;
    const triggerRect = plusMenuRef.current.getBoundingClientRect();
    const menuEl = menuContentRef.current;
    
    const viewportHeight = window.innerHeight;
    const spaceAbove = triggerRect.top;
    const spaceBelow = viewportHeight - triggerRect.bottom;
    
    // We measure scrollHeight to find its target height
    const menuHeight = menuEl.scrollHeight || 380;
    
    let newStyle: React.CSSProperties = {
      left: '0px',
    };
    
    if (spaceAbove >= menuHeight + 16) {
      newStyle.bottom = '100%';
      newStyle.marginBottom = '12px';
      newStyle.maxHeight = 'calc(100vh - 40px)';
    } else if (spaceBelow >= menuHeight + 16) {
      newStyle.top = '100%';
      newStyle.marginTop = '12px';
      newStyle.maxHeight = 'calc(100vh - 40px)';
    } else {
      if (spaceAbove > spaceBelow) {
        newStyle.bottom = '100%';
        newStyle.marginBottom = '12px';
        newStyle.maxHeight = `${Math.max(180, spaceAbove - 24)}px`;
      } else {
        newStyle.top = '100%';
        newStyle.marginTop = '12px';
        newStyle.maxHeight = `${Math.max(180, spaceBelow - 24)}px`;
      }
    }
    
    setMenuStyle(newStyle);
  }, []);

  useEffect(() => {
    if (isPlusMenuOpen) {
      adjustMenuPosition();
      const timer = setTimeout(adjustMenuPosition, 50);
      const id = requestAnimationFrame(adjustMenuPosition);
      window.addEventListener('resize', adjustMenuPosition);
      return () => {
        clearTimeout(timer);
        cancelAnimationFrame(id);
        window.removeEventListener('resize', adjustMenuPosition);
      };
    }
  }, [isPlusMenuOpen, activePlusSubMenu, adjustMenuPosition]);

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
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSetIsSourcesPanelOpen = useCallback((v: boolean) => setIsSourcesPanelOpen(v), []);
  const handleSetActiveArtifact = useCallback((v: any) => setActiveArtifact(v), []);
  const handleSetIsCanvasOpen = useCallback((v: boolean) => setIsCanvasOpen(v), []);
  const handleSetCanvasView = useCallback((v: 'code' | 'preview') => setCanvasView(v), []);

  const currentChat = chats.find(c => c.id === currentChatId);
  const messages = currentChat?.messages || [];

  // Auto-discover bridge tools once on mount
  useEffect(() => {
    if (llamaBridgeUrl) {
      const timer = setTimeout(() => handleLoadBridgeTools(), 1000);
      return () => clearTimeout(timer);
    }
  }, []); // only run once on mount

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
    if (isTyping) return;
    let content = contentOverride || input.trim();
    if (!content && attachedFiles.length === 0) return;

    if (activeSkills.length > 0) {
      const skillPrompts = activeSkills.map(id => SKILLS.find(s => s.id === id)?.prompt).filter(Boolean);
      content = skillPrompts.join('') + content;
    }

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

    setAttachedFiles([]);

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
        if (hasTavilyKey) {
          providerName = 'Tavily';
        } else if (hasSerpKey) {
          providerName = 'SerpApi';
        }

        const searchResp = await fetch(`${serverUrl}/search`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            query: content, 
            tavilyKey: hasTavilyKey ? tavilyApiKey : '', 
            serpKey: hasSerpKey && !hasTavilyKey ? serpApiKey : '',
            provider: providerName
          })
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

      let systemPrompt = `You are ${persona.name}. Character description/Role: ${persona.role}. ${persona.role ? '' : 'Address the user as a helpful digital assistant.'} You have access to 4 interactive visual laboratories: Physics Lab (for graphing and forces), Chemistry Lab (for compounds and reactions), Math Lab (for trigonometric and fractal curves), and Biology Lab (for predator-prey dynamics and DNA pair sequencing). If the user asks to simulate, visualize, or model anything matching these labs, explain the concepts and guide them to use or open that lab canvas. Ensure that you suggest launching the respective interactive workspace.`;

      const apiMessages = [
        { role: 'system', content: systemPrompt },
        ...([...chatContext, userMessage]
          .filter(m => m.content && m.content.trim().length > 0)
          .map(m => ({
            role: m.role,
            content: m.content
          })))
      ];
      
      if (searchResults.length > 0) {
        const contextString = searchResults.slice(0, 8).map((r, i) => `[${i+1}] ${r.title}: ${r.snippet} (URL: ${r.url})`).join('\n\n');
        systemPrompt += `\n\nWeb Search Results:\n${contextString}\n\nPlease use the above search results to provide a grounded, up-to-date response. Cite your sources using [number] notation when appropriate. If the results include an instant answer, prioritize that information.`;
      }
      
      // Direct call to Llama Bridge
      let rawResponse: any = await callLlamaBridge(apiMessages, activeTools);

      const data = rawResponse;
      const choice = data.choices?.[0]?.message;
      const responseContent = choice?.content;
      const toolCallsRaw = choice?.tool_calls;
      const responseSources = data.sources || data.citations || [];
      const responseImages = data.images || [];

      const toolCallNodes: ToolCallNode[] = [];
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

      const finalContent = responseContent || (toolCallsRaw?.length > 0 ? `Running ${toolCallsRaw.length} tool(s)...` : '');
      const sourcesToAttach = responseSources.map((s: any) => ({
        title: s.title || s.url || 'Source',
        url: s.url || s.link || '#',
        icon: s.icon || ''
      }));
      const imagesToAttach = responseImages.map((img: any) => ({
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

      let lastRenderTime = Date.now();
      const RENDER_INTERVAL = 120;
      
      for (let i = 1; i <= finalContent.length; i++) {
        const partial = finalContent.slice(0, i);
        const delay = finalContent.length > 500 ? 5 : 15;
        await new Promise(resolve => setTimeout(resolve, delay));
        
        const now = Date.now();
        if (now - lastRenderTime > RENDER_INTERVAL || i === finalContent.length) {
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
                  streamPos: i,
                  toolCalls: activeToolNodes
                } : m),
              };
            }
            return chat;
          }));
        }
      }

      const finalArtifacts = extractArtifacts(finalContent);

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
                    sources: sourcesToAttach.length > 0 ? sourcesToAttach : undefined,
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
    } catch (error) {
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
    setInput(textarea.value);

    requestAnimationFrame(() => {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    });
  };

  function extractArtifacts(content: string): Artifact[] {
    const artifacts: Artifact[] = [];
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    let match;
    const seenCode = new Set<string>();
    
    while ((match = codeBlockRegex.exec(content)) !== null) {
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
      const lowerContent = content.toLowerCase();
      const stanzas = content.split('\n\n').filter(s => s.trim().length > 0);
      
      // Let's detect Poem: Typically verses separated into stanzas and some indicator
      const poemKeywords = ['poem', 'poetry', 'sonnet', 'verse', 'haiku', 'rhyme', 'ode', 'ballad', 'stanzas', 'strophes'];
      const hasPoemIndicator = poemKeywords.some(kw => lowerContent.includes(kw));
      const hasShortRhythmicLines = stanzas.length >= 2 && stanzas.slice(0, 3).every(s => {
        const lines = s.split('\n').map(l => l.trim()).filter(Boolean);
        return lines.length >= 2 && lines.length <= 10 && lines.every(l => l.length < 90);
      });

      if (hasShortRhythmicLines && hasPoemIndicator && content.length < 3500) {
        const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
        const titleCand = lines[0]?.replace(/^#+\s*/, '') || 'A Beautiful Poem';
        artifacts.push({
          id: 'art-' + Math.random().toString(36).substring(7),
          title: titleCand.length < 40 ? titleCand : 'A Beautiful Poem',
          language: 'poetry',
          content: content,
          type: 'poem'
        });
      }
      // Let's detect Professional Report/Memo/Letter: structured markdown with headers
      else if (content.includes('## ') && content.length > 500 && 
               (lowerContent.includes('report') || lowerContent.includes('summary') || 
                lowerContent.includes('executive') || lowerContent.includes('proposal') || 
                lowerContent.includes('document') || lowerContent.includes('analysis') || 
                lowerContent.includes('memo') || lowerContent.includes('letter'))) {
        const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
        const titleCand = lines[0]?.replace(/^#+\s*/, '') || 'Executive Report';
        artifacts.push({
          id: 'art-' + Math.random().toString(36).substring(7),
          title: titleCand.length < 40 ? titleCand : 'Executive Report',
          language: 'markdown',
          content: content,
          type: 'report'
        });
      }
    }
    
    return artifacts;
  };

  function showToast(message: string) {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
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
      if (match) {
        return (
          <CustomCodeBlockVisualizer
            language={match[1]}
            code={codeStr}
            defaultRender={<CanvasBlock language={match[1]} code={codeStr} />}
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

  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      const api = (window as any).__electronAPI;
      if (api) api.showContextMenu();
    };
    document.addEventListener('contextmenu', handleContextMenu);
    return () => document.removeEventListener('contextmenu', handleContextMenu);
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
                  <Hammer size={13} />
                  <span>Tools ({bridgeTools.filter(t => t.enabled).length})</span>
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
        <div className={`relative border border-[var(--theme-input-border)] bg-[var(--theme-input-bg)] rounded-[28px] focus-within:border-[var(--theme-accent)]/40 overflow-visible flex flex-col p-1.5 min-h-[110px] justify-between transition-all duration-300 shadow-2xl`}>
        <div className="flex-1 px-3 pt-2">
          {attachedFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1 pb-3">
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
            </div>
          )}
          <textarea
            ref={isCenteredState ? null : inputRef}
            value={input}
            onChange={adjustTextareaHeight}
            onKeyDown={handleKeyDown}
            placeholder={isClaude ? "How can I help you today?" : "Write a message..."}
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
                    : bridgeTools.some(t => t.enabled)
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
                    style={menuStyle}
                    className="absolute left-0 w-64 bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-2xl shadow-2xl overflow-hidden z-[70] p-1.5 flex flex-col overflow-y-auto custom-scrollbar"
                  >
                    {activePlusSubMenu === 'main' ? (
                      <>
                        {[
                          { id: 'files', label: 'Add files or photos', icon: <FileUp size={16} /> },
                          { id: 'screenshot', label: 'Take a screenshot', icon: <Camera size={16} /> },
                          { id: 'skills', label: 'Skills', icon: <Box size={16} />, hasArrow: true },
                          { id: 'style', label: 'Writing Style', icon: <Palette size={16} />, hasArrow: true },
                          { type: 'separator' },
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
                      </>
                    ) : activePlusSubMenu === 'tools' ? (
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--theme-border)] mb-1">
                          <button 
                            onClick={() => setActivePlusSubMenu('main')}
                            className="p-1 hover:bg-[var(--theme-hover-bg)] rounded-lg text-[var(--theme-secondary)] hover:text-[var(--theme-primary)] transition-colors"
                          >
                            <ChevronLeft size={16} />
                          </button>
                          <span className="text-[10px] font-bold text-[var(--theme-secondary)] uppercase tracking-widest">Bridge Tools</span>
                        </div>
                        <div className="px-3 py-2 border-b border-[var(--theme-border)] flex items-center justify-between">
                          <span className="text-[10px] font-medium text-[var(--theme-muted)]">Enable All Tools</span>
                          <button
                            onClick={() => {
                              const allEnabled = bridgeTools.every(t => t.enabled);
                              setBridgeTools(prev => prev.map(t => ({ ...t, enabled: !allEnabled })));
                              showToast(allEnabled ? 'Disabled all tools' : 'Enabled all tools');
                            }}
                            className={`w-8 h-4 rounded-full transition-colors relative ${bridgeTools.length > 0 && bridgeTools.every(t => t.enabled) ? 'bg-[var(--theme-accent)]' : 'bg-[var(--theme-hover-bg)]'}`}
                          >
                            <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${bridgeTools.length > 0 && bridgeTools.every(t => t.enabled) ? 'right-0.5' : 'left-0.5'}`} />
                          </button>
                        </div>
                        <div className="max-h-56 overflow-y-auto custom-scrollbar">
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
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--theme-border)] mb-1">
                          <button 
                            onClick={() => setActivePlusSubMenu('main')}
                            className="p-1 hover:bg-[var(--theme-hover-bg)] rounded-lg text-[var(--theme-secondary)] hover:text-[var(--theme-primary)] transition-colors"
                          >
                            <ChevronLeft size={16} />
                          </button>
                          <span className="text-[10px] font-bold text-[var(--theme-secondary)] uppercase tracking-widest">Skills</span>
                        </div>
                        <div className="max-h-64 overflow-y-auto custom-scrollbar">
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
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--theme-border)] mb-1">
                          <button 
                            onClick={() => setActivePlusSubMenu('main')}
                            className="p-1 hover:bg-[var(--theme-hover-bg)] rounded-lg text-[var(--theme-secondary)] hover:text-[var(--theme-primary)] transition-colors"
                          >
                            <ChevronLeft size={16} />
                          </button>
                          <span className="text-[10px] font-bold text-[var(--theme-secondary)] uppercase tracking-widest">Writing Style</span>
                        </div>
                        <div className="max-h-64 overflow-y-auto custom-scrollbar">
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
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute bottom-full right-0 mb-3 w-64 max-h-[380px] bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-2xl shadow-2xl z-[70] flex flex-col overflow-hidden text-left"
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
                    <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5 custom-scrollbar max-h-60">
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
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
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

            {isTyping ? (
              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={() => setIsTyping(false)}
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
                isCollapsed={false}
                onToggle={() => setIsMobileMenuOpen(false)}
                onOpenSettings={() => {
                  setIsSettingsOpen(true);
                  setIsMobileMenuOpen(false);
                }}
                userProfile={userProfile}
                activeLabTab={activeLabTab}
                setActiveLabTab={setActiveLabTab}
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
            isCollapsed={false}
            hideToggle={true}
            onToggle={() => setIsSidebarOpen(false)}
            onOpenSettings={() => setIsSettingsOpen(true)}
            userProfile={userProfile}
            activeLabTab={activeLabTab}
            setActiveLabTab={setActiveLabTab}
          />
        </div>
        
        {/* Absolute sliding collapse button that moves perfectly with the sidebar with no delay */}
        <button
          onClick={() => setIsSidebarOpen(false)}
          className="absolute top-[22px] right-4 z-50 p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded-md transition-all text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 cursor-pointer hidden md:flex items-center justify-center"
          style={{
            opacity: isSidebarOpen ? 1 : 0,
            pointerEvents: isSidebarOpen ? 'auto' : 'none'
          }}
          title="Collapse sidebar"
        >
          <SidebarIcon size={18} />
        </button>

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
        {!isPhysicsTabActive && (
          <header className="h-14 border-b border-[var(--theme-border)]/40 flex items-center justify-between px-4 md:px-6 bg-[var(--theme-bg)]/80 backdrop-blur-md z-10 sticky top-0 shrink-0">
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setIsMobileMenuOpen(true)}
                className="md:hidden p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors text-gray-500"
              >
                <SidebarIcon size={20} />
              </button>
              <AnimatePresence>
                {!isSidebarOpen && (
                  <motion.button 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                    onClick={() => setIsSidebarOpen(true)}
                    className="hidden md:flex p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors text-gray-500 cursor-pointer"
                    title="Expand sidebar"
                  >
                    <SidebarIcon size={20} />
                  </motion.button>
                )}
              </AnimatePresence>
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
                        onClick={() => { setActiveSettingsTab('theme'); setIsSettingsOpen(true); setIsHeaderMenuOpen(false); }}
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

        {isPhysicsTabActive ? (
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
                <div className={`mx-auto space-y-8 pb-24 ${isSourcesPanelOpen ? 'max-w-lg md:mr-6' : 'max-w-3xl'} transition-[max-width,margin] duration-500`}>
                  <AnimatePresence initial={false}>
                    {messages.length === 0 ? (
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="min-h-[72vh] flex flex-col items-center justify-center text-center px-4 relative w-full"
                      >
                        {theme.id === 'claude' ? (
                          <>
                            <div className="w-full max-w-2xl mb-4">
                              {renderChatBox(true)}
                            </div>

                            <div className="flex items-center gap-1 text-[11px] text-zinc-500 mb-6 select-none font-medium">
                              <span>You are out of free messages until 1:10 AM</span>
                            </div>
                          </>
                        ) : (
                          <>
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
                            <p className="text-gray-500 dark:text-gray-400 max-w-sm mb-6">
                              Modern intelligence, refined interface.
                            </p>
                            
                            <div className="w-full max-w-2xl mb-8">
                              {renderChatBox(true)}
                            </div>


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
                          isSourcesPanelOpen={isSourcesPanelOpen}
                          setIsSourcesPanelOpen={handleSetIsSourcesPanelOpen}
                          setSourcesPanelMessageId={setSourcesPanelMessageId}
                          setActiveArtifact={handleSetActiveArtifact}
                          setIsCanvasOpen={handleSetIsCanvasOpen}
                          setCanvasView={handleSetCanvasView}
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

              <AnimatePresence>
                {isSourcesPanelOpen && (
                  <motion.div
                    initial={{ x: 480, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: 480, opacity: 0 }}
                    transition={{ duration: isSourcesPanelOpen ? 0.25 : 0.2 }}
                    className="w-[460px] border-l border-gray-100 dark:border-white/5 bg-gradient-to-b from-white to-gray-50/50 dark:from-zinc-950 dark:to-zinc-900/50 flex flex-col shrink-0 shadow-2xl relative z-20"
                  >
                    <div className="px-6 py-5 flex items-center justify-between border-b border-gray-100 dark:border-white/5 bg-gradient-to-r from-blue-50/30 to-transparent dark:from-blue-950/10 dark:to-transparent">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-sm">
                          <Globe size={15} className="text-white" />
                        </div>
                        <div>
                          <h3 className="font-display font-semibold tracking-tight text-gray-900 dark:text-white text-sm">Sources</h3>
                          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                            {(sourcesPanelMessageId ? messages.find(m => m.id === sourcesPanelMessageId)?.sources : messages.find(m => m.sources)?.sources)?.length ?? 0} references
                          </p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setIsSourcesPanelOpen(false)}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-all"
                      >
                        <X size={16} />
                      </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-5 space-y-3 custom-scrollbar">
                      {(sourcesPanelMessageId ? messages.find(m => m.id === sourcesPanelMessageId)?.sources : messages.find(m => m.sources)?.sources)?.map((source, sIdx) => (
                        <motion.div
                          key={sIdx}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: sIdx * 0.04, duration: 0.3 }}
                          className="group relative overflow-hidden rounded-xl border border-gray-100/80 dark:border-white/5 bg-white dark:bg-zinc-950 hover:border-blue-200 dark:hover:border-blue-500/30 hover:shadow-md hover:shadow-blue-500/5 transition-all duration-200"
                        >
                          <div className="absolute inset-0 bg-gradient-to-br from-blue-50/0 via-transparent to-transparent dark:from-blue-950/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                          <a 
                            href={source.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="block p-4 relative"
                          >
                            <div className="flex items-start gap-3.5">
                              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-gray-50 to-gray-100 dark:from-zinc-900 dark:to-zinc-800 border border-gray-100 dark:border-white/5 flex items-center justify-center shrink-0 shadow-sm group-hover:border-blue-200 dark:group-hover:border-blue-500/30 group-hover:shadow-md group-hover:shadow-blue-500/10 transition-all duration-200">
                                <Globe size={16} className="text-gray-400 group-hover:text-blue-500 transition-colors duration-200" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <h4 className="text-xs font-semibold text-gray-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{source.title}</h4>
                                  <ExternalLink size={10} className="text-gray-300 dark:text-gray-600 group-hover:text-blue-400 transition-colors shrink-0" />
                                </div>
                                <p className="text-[10px] text-gray-400 truncate mb-2 font-mono">{source.url}</p>
                                {source.snippet && (
                                  <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed bg-gray-50/80 dark:bg-white/[0.03] p-2.5 rounded-lg border border-gray-100/50 dark:border-white/5">
                                    {source.snippet}
                                  </p>
                                )}
                                <div className="inline-flex items-center gap-1 text-[9px] font-bold text-blue-500 group-hover:text-blue-600 uppercase tracking-widest transition-colors mt-2.5">
                                  Visit Source
                                  <ArrowRight size={9} className="group-hover:translate-x-0.5 transition-transform" />
                                </div>
                              </div>
                            </div>
                          </a>
                        </motion.div>
                      )) || (
                        <div className="h-full flex flex-col items-center justify-center text-center">
                          <div className="w-14 h-14 rounded-2xl bg-gray-50 dark:bg-zinc-900 border border-gray-100 dark:border-white/5 flex items-center justify-center mb-4">
                            <Layout size={26} className="text-gray-300 dark:text-gray-600" />
                          </div>
                          <p className="text-sm font-semibold text-gray-400 dark:text-gray-500">No Sources Available</p>
                          <p className="text-[10px] text-gray-300 dark:text-gray-600 mt-1">Search results will appear here</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {messages.length > 0 && (
              <div className="px-4 pb-6 bg-transparent sticky bottom-0 z-30 shrink-0">
                <div className="max-w-3xl mx-auto relative group">
                  {renderChatBox(false)}
                  <div className="absolute -bottom-6 left-0 right-0 text-center">
                    <span className="text-[10px] text-gray-550 font-medium tracking-tight">Claude is AI and can make mistakes. Please double-check responses.</span>
                  </div>
                </div>
              </div>
            )}
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
                    { id: 'bridge', label: 'Llama Bridge', icon: <Terminal size={16} /> },
                    { id: 'mcp', label: 'MCP Tools', icon: <HardDrive size={16} /> },
                    { id: 'theme', label: 'Themes', icon: <Palette size={16} /> },
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
                              <div className="font-medium text-sm">Theme</div>
                              <div className="text-xs text-gray-400">Customize colors and appearance</div>
                            </div>
                            <button
                              onClick={() => setActiveSettingsTab('theme')}
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
                      <div>
                        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-6">Bridge</h3>
                        <div className="space-y-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-sm">Llama Bridge</div>
                              <div className="text-xs text-gray-400">Enable local Llama Bridge integration</div>
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
                            <p className="text-xs text-blue-500/70 leading-relaxed mb-2">
                              When configured, the AI will automatically use these tools to browse the web for time-sensitive information, ensuring responses are grounded in current facts.
                            </p>
                            <div className="text-[10px] text-gray-400 space-y-1">
                              <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${tavilyApiKey && tavilyApiKey.trim() ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                                <span>Tavily {(tavilyApiKey && tavilyApiKey.trim()) ? '(Primary)' : '(Not configured)'}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${(!tavilyApiKey || !tavilyApiKey.trim()) && serpApiKey && serpApiKey.trim() ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                                <span>SerpApi {((!tavilyApiKey || !tavilyApiKey.trim()) && serpApiKey && serpApiKey.trim()) ? '(Active)' : '(Not configured or shadowed)'}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${(!tavilyApiKey || !tavilyApiKey.trim()) && (!serpApiKey || !serpApiKey.trim()) ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                                <span>DuckDuckGo {(!tavilyApiKey?.trim() && !serpApiKey?.trim()) ? '(Active)' : '(Fallback)'}</span>
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
                                  All tools (web_search, wikipedia, image_search, etc.) come from the bridge - no duplicates in the UI.
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

                  {activeSettingsTab === 'theme' && (
                    <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}>
                      <ThemeSettingsPanel />
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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

      <Canvas 
        artifact={activeArtifact} 
        isOpen={isCanvasOpen} 
        onClose={() => setIsCanvasOpen(false)} 
        view={canvasView}
        onSetView={setCanvasView}
      />

      <PhysicsGraphCanvas 
        isOpen={isPhysicsCanvasOpen} 
        onClose={() => setIsPhysicsCanvasOpen(false)} 
      />
    </div>
  );
}