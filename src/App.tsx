/**
 * Lumina AI Chat UI — Rewritten
 * All animations wired to index.css animation classes:
 *   animate-msg-in · dot-pulse-1/2/3 · fade-in-token · shimmer-text
 *   smooth-fade-in · status-description · tool-call-running · spinner-ring
 *   status-dot--running/done/error/pending · thinking-block · thinking-label
 *   thinking-dot · search-ping · search-result · animate-active-ring
 *   animate-traveling-dot · node-appear · edge-draw · edge-travel
 *   pipe-step · progress-fill · animate-micro-shake · animate-fade-up
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Send, Plus, Sparkles, User, ArrowUp, PanelLeft,
  Search, MoreVertical, Settings, Trash2, ChevronDown,
  HardDrive, Brain, Globe, ExternalLink, X, Layout,
  MessageSquare, StopCircle, FileUp, Camera, FolderPlus,
  Box, Link as LinkIcon, Check, ChevronRight, ChevronLeft,
  Terminal, Calendar, Image as ImageIcon, CloudMoon, Video, Copy,
} from 'lucide-react';
import Markdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

/* ─────────────────── TYPES ─────────────────── */

interface ToolCallNode {
  id: string;
  type: 'ai' | 'tool' | 'sub-tool' | 'result' | 'error';
  label: string;
  status: 'pending' | 'active' | 'complete' | 'failed';
  icon?: React.ReactNode;
}

interface SearchSource { title: string; url: string }

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  thinking?: string;
  sources?: SearchSource[];
  searchQuery?: string;
  isSearching?: boolean;
  toolCalls?: ToolCallNode[];
}

interface Chat {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: Date;
}

interface McpTool {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  icon: React.ReactNode;
}

type SettingsTab = 'general' | 'ai' | 'mcp' | 'sources' | 'search';
type PlusSubMenu = 'main' | 'mcp' | 'project' | 'skills';
type VerifyState = 'idle' | 'verifying' | 'success' | 'error';

/* ─────────────────── HELPERS ─────────────────── */

function toolIcon(name: string, size = 14): React.ReactNode {
  if (name.includes('search') || name.includes('research')) return <Search size={size} />;
  if (name.includes('shell') || name.includes('terminal')) return <Terminal size={size} />;
  if (name.includes('weather')) return <CloudMoon size={size} />;
  if (name.includes('wikipedia') || name.includes('globe')) return <Globe size={size} />;
  if (name.includes('image')) return <ImageIcon size={size} />;
  if (name.includes('date') || name.includes('time')) return <Calendar size={size} />;
  if (name.includes('verify')) return <Check size={size} />;
  if (name.includes('render') || name.includes('video')) return <Video size={size} />;
  return <Box size={size} />;
}

function useClickOutside(ref: React.RefObject<HTMLElement | null>, cb: () => void) {
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) cb();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [ref, cb]);
}

/* ─────────────────── CODE BLOCK ─────────────────── */

function CanvasBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="bg-[#0d0d0d] border border-white/8 rounded-2xl overflow-hidden shadow-xl my-4 animate-fade-up">
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#161616] border-b border-white/5">
        <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full">
          {language || 'code'}
        </span>
        <button
          onClick={copy}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${
            copied ? 'text-emerald-400 bg-emerald-500/10' : 'text-gray-500 hover:text-white hover:bg-white/5'
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

function isWebSearchTool(toolName: string): boolean {
  const name = toolName.toLowerCase();
  return name.includes('search') || name.includes('serp') || name.includes('tavily') || name.includes('google');
}

/* ─────────────────── LLAMA BRIDGE ANIMATION ─────────────────── */

function LlamaBridgeIndicator({ toolName }: { toolName?: string }) {
  if (toolName && isWebSearchTool(toolName)) return null;
  
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-gradient-to-r from-violet-500/10 to-purple-500/10 border border-violet-500/20 rounded-2xl mb-3">
      <div className="relative w-6 h-6 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360, scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
          className="absolute inset-0 rounded-full border-2 border-violet-500/30"
        />
        <Brain size={14} className="text-violet-400" />
      </div>
      <div className="flex-1">
        <div className="text-xs font-semibold text-violet-300">Llama Bridge Tool</div>
        <div className="text-[10px] text-violet-400/70">Using {toolName || 'external tool'}...</div>
      </div>
      <div className="flex gap-1">
        <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 0.8 }} className="w-1.5 h-1.5 rounded-full bg-violet-400" />
        <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 0.8, delay: 0.2 }} className="w-1.5 h-1.5 rounded-full bg-violet-400" />
        <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 0.8, delay: 0.4 }} className="w-1.5 h-1.5 rounded-full bg-violet-400" />
      </div>
    </div>
  );
}

/* ─────────────────── NODE GRAPH (tool-call chain) ─────────────────── */

function NodeGraph({ nodes }: { nodes: ToolCallNode[] }) {
  const [collapsed, setCollapsed] = useState(false);
  const [startTime] = useState(Date.now);

  const isRunning = nodes.some(n => n.status === 'active' || n.status === 'pending');

  useEffect(() => {
    if (!isRunning && nodes.length > 0) {
      const t = setTimeout(() => setCollapsed(true), 800);
      return () => clearTimeout(t);
    }
  }, [isRunning, nodes]);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const lastTool = nodes.filter(n => n.type === 'tool').pop();

  if (collapsed) {
    return (
      <motion.button
        layoutId="node-graph"
        onClick={() => setCollapsed(false)}
        className="flex items-center gap-2 px-3 py-1.5 bg-[var(--color-background-secondary)] border border-[var(--color-border-tertiary)] rounded-full text-[11px] font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-background-primary)] transition-all cursor-pointer shadow-sm group"
      >
        <span className="text-emerald-500 font-bold">✓</span>
        <span>{lastTool?.label || `${nodes.length} tools`} · {elapsed}s</span>
        <ChevronRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
      </motion.button>
    );
  }

  return (
    <motion.div
      layoutId="node-graph"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`p-4 bg-[var(--color-background-secondary)] border border-[var(--color-border-tertiary)] rounded-xl overflow-hidden relative max-w-fit shadow-2xl animate-fade-up ${
        isRunning ? 'tool-call-running' : ''
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4 gap-8">
        <span className="text-[10px] font-bold text-[var(--color-text-tertiary)] uppercase tracking-widest">
          Tool Call Chain
        </span>
        <button
          onClick={() => setCollapsed(true)}
          className="text-[10px] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors uppercase tracking-widest"
        >
          Collapse
        </button>
      </div>

      {/* Nodes row */}
      <div className="relative flex items-center gap-0 py-2">
        {nodes.map((node, i) => (
          <React.Fragment key={node.id}>
            {/* Edge between nodes */}
            {i > 0 && (
              <div className="relative w-10 flex items-center overflow-visible">
                {/* static edge line */}
                <div
                  className={`edge-draw h-[0.5px] w-full transition-colors duration-500 ${
                    node.status === 'complete' || node.status === 'active'
                      ? 'bg-[var(--color-border-primary)]'
                      : 'bg-[var(--color-border-secondary)]'
                  }`}
                />
                {/* traveling dot on active edges */}
                {node.status === 'active' && (
                  <div
                    className="animate-traveling-dot absolute h-2 w-2 rounded-full bg-[var(--color-accent)] shadow-[0_0_8px_rgba(59,130,246,0.8)]"
                    style={{ offsetPath: `path('M 0 0 L 40 0')` } as React.CSSProperties}
                  />
                )}
              </div>
            )}

            {/* Node pill */}
            <motion.div
              layout
              initial={{ scale: 0.8, opacity: 0 }}
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
              {node.status === 'active' && <div className="spinner-ring" />}
              {node.status === 'complete' && <Check size={12} />}
              {node.status === 'failed' && <X size={12} />}
              {node.status === 'pending' && (node.icon || <Box size={12} />)}
              <span className="text-[11.5px] whitespace-nowrap max-w-[120px] truncate">
                {node.label}
              </span>
            </motion.div>
          </React.Fragment>
        ))}
      </div>
    </motion.div>
  );
}

/* ─────────────────── THINKING BLOCK ─────────────────── */

function ThinkingBlock({ text, isSearching }: { text: string; isSearching?: boolean }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="thinking-block border-l-2 border-[var(--color-accent-purple,#8b5cf6)] pl-3 rounded-r-lg py-2 mb-4"
      style={{ background: 'color-mix(in srgb, #8b5cf6 6%, transparent)' }}>
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest mb-1 hover:opacity-80 transition-opacity"
        style={{ color: '#8b5cf6' }}
      >
        <span className="thinking-dot w-1.5 h-1.5 rounded-full" style={{ background: '#8b5cf6' }} />
        {isSearching ? 'Searching' : 'Thinking'}
        <ChevronDown size={10} className={`ml-auto transition-transform ${collapsed ? '-rotate-90' : ''}`} />
      </button>
      {!collapsed && (
        <p className="text-[12px] text-[var(--color-text-tertiary)] leading-relaxed shimmer-text">{text}</p>
      )}
    </div>
  );
}

/* ─────────────────── SUB-PROCESS PIPELINE ─────────────────── */

type PipeStatus = 'done' | 'running' | 'pending';

interface PipeStepProps {
  icon: string;
  label: string;
  status: PipeStatus;
  pct?: number;
}

function PipelineStep({ icon, label, status, pct }: PipeStepProps) {
  const badge = {
    done:    'bg-emerald-500/15 text-emerald-400',
    running: 'bg-blue-500/15 text-blue-400',
    pending: 'bg-white/5 text-zinc-600 border border-white/5',
  }[status];

  return (
    <div className="pipe-step flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 text-xs">
      <span className="text-base w-5 text-center shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="text-[var(--color-text-primary)] font-medium truncate">{label}</div>
        {status === 'running' && pct !== undefined && (
          <div className="progress-bar mt-1 h-[2px] bg-white/10 rounded-full overflow-hidden">
            <div className="progress-fill h-full bg-[var(--color-accent)] rounded-full" style={{ '--pct': `${pct}%` } as React.CSSProperties} />
          </div>
        )}
      </div>
      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide ${badge}`}>
        {status === 'running' && pct !== undefined ? `${pct}%` : status}
      </span>
    </div>
  );
}

/* ─────────────────── WEB SEARCH ANIMATION ─────────────────── */

interface WebSearchResult {
  title: string;
  url: string;
  snippet?: string;
}

function WebSearchAnimation({ query, results }: { query: string; results?: WebSearchResult[] }) {
  const placeholders = [
    { title: 'Wikipedia', url: 'wikipedia.org', snippet: 'Free encyclopedia...' },
    { title: 'Stack Overflow', url: 'stackoverflow.com', snippet: 'Programming Q&A...' },
    { title: 'GitHub', url: 'github.com', snippet: 'Code repository...' },
    { title: 'Reddit', url: 'reddit.com', snippet: 'Community discussion...' },
  ];

  const displayResults = results && results.length > 0 ? results : placeholders;

  return (
    <div className="border border-[var(--color-border-secondary)] rounded-xl p-3 bg-[var(--color-background-primary)] mb-4">
      <div className="flex items-center gap-2 text-[12px] font-medium text-[var(--color-text-primary)] mb-3">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
          className="w-4 h-4 border-2 border-[var(--color-accent)] border-t-transparent rounded-full"
        />
        <span>Searching the web for "{query}"…</span>
      </div>
      <div className="space-y-2">
        {displayResults.slice(0, 4).map((r, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="flex items-start gap-2 p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
          >
            <div className="w-5 h-5 rounded bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shrink-0 mt-0.5">
              <Globe size={10} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-medium text-[var(--color-text-primary)] truncate">{r.title}</div>
              <div className="text-[10px] text-[var(--color-text-tertiary)] truncate">{r.url}</div>
              {r.snippet && (
                <div className="text-[9px] text-[var(--color-text-tertiary)]/60 mt-0.5 line-clamp-1">{r.snippet}</div>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────── SEARCH SOURCES ─────────────────── */

function SearchBlock({ query, sources, isSearching }: { query: string; sources?: SearchSource[]; isSearching?: boolean }) {
  if (isSearching) {
    return <WebSearchAnimation query={query} results={sources as any} />;
  }

  return (
    <div className="border border-[var(--color-border-secondary)] rounded-xl p-3 bg-[var(--color-background-primary)] mb-4">
      <div className="flex items-center gap-2 text-[12px] font-medium text-[var(--color-text-primary)] mb-2">
        <Globe size={12} className="text-[var(--color-text-tertiary)]" />
        Searched: {query}
      </div>
      {sources && sources.length > 0 && (
        <div className="space-y-0">
          {sources.slice(0, 4).map((s, i) => (
            <div key={i} className={`search-result flex items-start gap-2 text-[11px] text-[var(--color-text-secondary)] py-1.5 border-t border-[var(--color-border-tertiary)]`}
              style={{ animationDelay: `${i * 80}ms` }}>
              <div className="w-3.5 h-3.5 rounded-[3px] bg-white/10 flex items-center justify-center mt-0.5 shrink-0 text-[8px] font-bold text-gray-400">
                {s.title[0]?.toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="text-[var(--color-text-primary)] font-medium truncate">{s.title}</div>
                <div className="text-[var(--color-text-tertiary)] text-[10px] truncate">{s.url}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────── TYPING INDICATOR ─────────────────── */

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 py-3">
      <span className="w-2 h-2 rounded-full bg-zinc-500 dot-pulse-1" />
      <span className="w-2 h-2 rounded-full bg-zinc-500 dot-pulse-2" />
      <span className="w-2 h-2 rounded-full bg-zinc-500 dot-pulse-3" />
    </div>
  );
}

/* ─────────────────── SIDEBAR ─────────────────── */

interface SidebarContentProps {
  chats: Chat[];
  currentChatId: string | null;
  setCurrentChatId: (id: string | null) => void;
  createNewChat: () => void;
  setChats: React.Dispatch<React.SetStateAction<Chat[]>>;
  onToggle: () => void;
  onOpenSettings: () => void;
}

function SidebarContent({
  chats, currentChatId, setCurrentChatId, createNewChat, setChats, onToggle, onOpenSettings,
}: SidebarContentProps) {
  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-black dark:bg-white flex items-center justify-center text-white dark:text-black">
            <Sparkles size={18} />
          </div>
          <span className="font-display font-semibold tracking-tight">Lumina</span>
        </div>
        <button onClick={onToggle} className="p-1.5 hover:bg-gray-200 dark:hover:bg-white/5 rounded-md transition-colors text-gray-500">
          <PanelLeft size={18} />
        </button>
      </div>

      <button
        onClick={createNewChat}
        className="flex items-center gap-3 p-3 mb-6 w-full bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/5 rounded-xl shadow-sm hover:shadow-md hover:border-gray-300 dark:hover:border-white/10 transition-all text-sm font-medium dark:text-white"
      >
        <Plus size={18} /> New chat
      </button>

      <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar">
        <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2 px-3">Recent</div>
        {chats.map(chat => (
          <div key={chat.id} className="group relative">
            <button
              onClick={() => setCurrentChatId(chat.id)}
              className={`w-full p-2.5 pr-10 rounded-lg flex items-center gap-3 text-sm font-medium transition-colors ${
                currentChatId === chat.id
                  ? 'bg-gray-200/50 dark:bg-white/5 text-black dark:text-white'
                  : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-700 dark:hover:text-gray-300'
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
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md opacity-0 group-hover:opacity-100 transition-all"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        {chats.length === 0 && (
          <p className="px-3 py-4 text-xs text-gray-400 italic">No recent chats</p>
        )}
      </div>

      <div className="mt-auto pt-4 border-t border-gray-200 dark:border-white/5 space-y-1">
        <button
          onClick={onOpenSettings}
          className="flex items-center gap-3 w-full p-2.5 hover:bg-gray-200/50 dark:hover:bg-white/5 rounded-lg text-sm text-gray-600 dark:text-gray-400 transition-colors"
        >
          <Settings size={18} /> Settings
        </button>
        <div className="p-2.5 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-xs">
            AR
          </div>
          <div className="flex-1 text-xs">
            <div className="font-semibold truncate dark:text-white">Abdur Ramiz</div>
            <div className="text-gray-400">Pro Plan</div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ─────────────────── SETTINGS MODAL ─────────────────── */

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: SettingsTab;
  setActiveTab: (t: SettingsTab) => void;
  isDarkMode: boolean;
  setIsDarkMode: (v: boolean) => void;
  useBubbles: boolean;
  setUseBubbles: (v: boolean) => void;
  serverUrl: string; setServerUrl: (v: string) => void;
  apiKey: string; setApiKey: (v: string) => void;
  tavilyApiKey: string; setTavilyApiKey: (v: string) => void;
  serpApiKey: string; setSerpApiKey: (v: string) => void;
  mcpUrl: string; setMcpUrl: (v: string) => void;
  mcpKey: string; setMcpKey: (v: string) => void;
  aiVerifyState: VerifyState; setAiVerifyState: (v: VerifyState) => void;
  searchVerifyState: VerifyState; setSearchVerifyState: (v: VerifyState) => void;
  isAiSaved: boolean; setIsAiSaved: (v: boolean) => void;
  isSearchSaved: boolean; setIsSearchSaved: (v: boolean) => void;
  isMcpSaved: boolean; setIsMcpSaved: (v: boolean) => void;
  isMcpConnected: boolean; setIsMcpConnected: (v: boolean) => void;
  isConnectingMcp: boolean; setIsConnectingMcp: (v: boolean) => void;
  mcpTools: McpTool[]; setMcpTools: (t: McpTool[]) => void;
  messages: Message[];
  availableModels: { id: string; name: string; icon: React.ReactElement; color: string }[];
  setAvailableModels: (m: { id: string; name: string; icon: React.ReactElement; color: string }[]) => void;
  setSelectedModel: (id: string) => void;
}

function SettingsModal(p: SettingsModalProps) {
  const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
    { id: 'general', label: 'General',    icon: <Settings size={16} /> },
    { id: 'ai',      label: 'AI Service', icon: <Sparkles size={16} /> },
    { id: 'search',  label: 'Search',     icon: <Search size={16} /> },
    { id: 'sources', label: 'Sources',    icon: <Layout size={16} /> },
    { id: 'mcp',     label: 'MCP Server', icon: <HardDrive size={16} /> },
  ];

  const handleVerifyAI = async () => {
    p.setAiVerifyState('verifying');
    try {
      const res = await fetch(`${p.serverUrl.replace(/\/+$/, '')}/models`, {
        headers: { Authorization: `Bearer ${p.apiKey}` },
      });
      if (res.ok) {
        const data = await res.json();
        const arr = data.data || data.models || [];
        if (Array.isArray(arr) && arr.length > 0) {
          const models = arr.map((m: any) => ({
            id: m.id, name: m.display_name || m.id,
            icon: <Sparkles size={14} />, color: 'text-blue-500',
          }));
          p.setAvailableModels(models);
          p.setSelectedModel(models[0].id);
        }
        p.setAiVerifyState('success');
      } else {
        p.setAiVerifyState('error');
      }
    } catch {
      p.setAiVerifyState('error');
    } finally {
      setTimeout(() => p.setAiVerifyState('idle'), 3000);
    }
  };

  const handleSaveAI = () => {
    localStorage.setItem('lumina_server_url', p.serverUrl);
    localStorage.setItem('lumina_api_key', p.apiKey);
    p.setIsAiSaved(true);
    setTimeout(() => p.setIsAiSaved(false), 2000);
  };

  const handleVerifySearch = () => {
    p.setSearchVerifyState('verifying');
    setTimeout(() => {
      p.setSearchVerifyState(p.tavilyApiKey || p.serpApiKey ? 'success' : 'error');
      setTimeout(() => p.setSearchVerifyState('idle'), 3000);
    }, 1200);
  };

  const handleSaveSearch = () => {
    localStorage.setItem('lumina_tavily_key', p.tavilyApiKey);
    localStorage.setItem('lumina_serp_key', p.serpApiKey);
    p.setIsSearchSaved(true);
    setTimeout(() => p.setIsSearchSaved(false), 2000);
  };

  const handleSaveMcp = () => {
    localStorage.setItem('lumina_mcp_url', p.mcpUrl);
    localStorage.setItem('lumina_mcp_key', p.mcpKey);
    p.setIsMcpSaved(true);
    setTimeout(() => p.setIsMcpSaved(false), 2000);
  };

  const handleConnectMcp = async () => {
    if (!p.mcpUrl) return;
    p.setIsConnectingMcp(true);
    try {
      const res = await fetch(`${p.mcpUrl}/v1/tools`, {
        headers: { Authorization: `Bearer ${p.mcpKey}` },
      });
      if (res.ok) {
        const data = await res.json();
        const list = data.tools || data.openai_tools || [];
        if (Array.isArray(list)) {
          p.setMcpTools(list.map((t: any) => {
            const name = t.name || t.function?.name || 'tool';
            return {
              id: name, name, enabled: false,
              description: t.description || t.function?.description || 'MCP Tool',
              icon: toolIcon(name),
            };
          }));
        }
        p.setIsMcpConnected(true);
      } else {
        p.setIsMcpConnected(false);
      }
    } catch {
      p.setIsMcpConnected(false);
    } finally {
      p.setIsConnectingMcp(false);
    }
  };

  const Toggle = ({ on, onToggle }: { on: boolean; onToggle: () => void }) => (
    <button
      onClick={onToggle}
      className={`w-12 h-6 rounded-full transition-all relative ${on ? 'bg-blue-600' : 'bg-gray-200 dark:bg-zinc-700'}`}
    >
      <motion.div
        animate={{ x: on ? 24 : 4 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm"
      />
    </button>
  );

  const VerifyBtn = ({ state, onClick }: { state: VerifyState; onClick: () => void }) => (
    <button
      onClick={onClick}
      disabled={state === 'verifying'}
      className={`flex-1 h-11 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${
        state === 'success' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
        : state === 'error' ? 'bg-red-500/10 text-red-500 border border-red-500/20'
        : 'bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5'
      }`}
    >
      {state === 'verifying' && <div className="spinner-ring" />}
      {state === 'success' && <Check size={16} />}
      {state === 'error' && <X size={16} />}
      {state === 'verifying' ? 'Verifying…' : state === 'success' ? 'Verified' : state === 'error' ? 'Failed' : 'Verify Keys'}
    </button>
  );

  const SaveBtn = ({ saved, onClick, label = 'Save' }: { saved: boolean; onClick: () => void; label?: string }) => (
    <button
      onClick={onClick}
      className={`flex-1 h-11 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
        saved ? 'bg-emerald-500 text-white' : 'bg-black dark:bg-white text-white dark:text-black shadow-lg hover:opacity-90'
      }`}
    >
      {saved && <Check size={16} />}
      {saved ? 'Saved' : label}
    </button>
  );

  const Field = ({ label, value, onChange, type = 'text', placeholder = '' }: {
    label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string;
  }) => (
    <div className="space-y-1.5">
      <label className="text-[11px] font-medium text-gray-500">{label}</label>
      <input
        type={type} value={value} placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        className="w-full h-11 px-4 text-sm bg-gray-50 dark:bg-zinc-950 border border-gray-100 dark:border-white/5 rounded-xl focus:ring-1 focus:ring-blue-500 outline-none transition-all"
      />
    </div>
  );

  if (!p.isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={p.onClose}
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-3xl h-[520px] bg-white dark:bg-zinc-900 text-gray-900 dark:text-white rounded-3xl shadow-2xl overflow-hidden flex"
        >
          {/* Sidebar nav */}
          <div className="w-56 border-r border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-zinc-950/20 p-6 flex flex-col">
            <h2 className="text-xl font-display font-semibold mb-8">Settings</h2>
            <nav className="space-y-1 flex-1">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => p.setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                    p.activeTab === tab.id
                      ? 'bg-white dark:bg-zinc-800 text-black dark:text-white shadow-sm border border-gray-100 dark:border-white/10'
                      : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5'
                  }`}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </nav>
            <div className="mt-auto">
              <div className="flex items-center gap-3 p-2 bg-white dark:bg-zinc-800 rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm">
                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-xs">AR</div>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-semibold truncate">Abdur Ramiz</div>
                  <div className="text-[10px] text-gray-400 uppercase">Pro</div>
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 flex flex-col min-w-0">
            <div className="flex items-center justify-end p-6 pb-0">
              <button onClick={p.onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors text-gray-500">
                <Plus size={20} className="rotate-45" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-8 pt-4 custom-scrollbar">

              {p.activeTab === 'general' && (
                <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
                  <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-6">Appearance</h3>
                  <div className="space-y-6">
                    {[
                      { label: 'Dark Mode', sub: 'Light or dark interface', on: p.isDarkMode, toggle: () => p.setIsDarkMode(!p.isDarkMode) },
                      { label: 'Bubble Layout', sub: 'Chat bubbles vs linear view', on: p.useBubbles, toggle: () => p.setUseBubbles(!p.useBubbles) },
                    ].map(row => (
                      <div key={row.label} className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-sm">{row.label}</div>
                          <div className="text-xs text-gray-400">{row.sub}</div>
                        </div>
                        <Toggle on={row.on} onToggle={row.toggle} />
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {p.activeTab === 'ai' && (
                <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
                  <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">AI Service Configuration</h3>
                  <Field label="Endpoint URL" value={p.serverUrl} onChange={v => { p.setServerUrl(v); p.setIsAiSaved(false); }} placeholder="http://localhost:8080/v1" />
                  <Field label="API Key" type="password" value={p.apiKey} onChange={v => { p.setApiKey(v); p.setIsAiSaved(false); }} placeholder="sk-…" />
                  <div className="flex gap-3">
                    <VerifyBtn state={p.aiVerifyState} onClick={handleVerifyAI} />
                    <SaveBtn saved={p.isAiSaved} onClick={handleSaveAI} label="Save Changes" />
                  </div>
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/20 rounded-2xl flex gap-3">
                    <Sparkles size={16} className="text-blue-500 mt-0.5 shrink-0" />
                    <p className="text-xs text-blue-800 dark:text-blue-300 leading-relaxed">
                      Connect a custom Lumina-compatible endpoint or proxy server.
                    </p>
                  </div>
                </motion.div>
              )}

              {p.activeTab === 'search' && (
                <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                  <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Search API Configuration</h3>
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-[11px] font-medium text-gray-500 uppercase">Tavily API Key</label>
                      <a href="https://tavily.com" target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-500 hover:underline flex items-center gap-1">Get Key <ExternalLink size={10} /></a>
                    </div>
                    <input type="password" value={p.tavilyApiKey} onChange={e => { p.setTavilyApiKey(e.target.value); p.setIsSearchSaved(false); }}
                      placeholder="tvly-…"
                      className="w-full h-11 px-4 text-sm bg-gray-50 dark:bg-zinc-950 border border-gray-100 dark:border-white/5 rounded-xl focus:ring-1 focus:ring-blue-500 outline-none" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-[11px] font-medium text-gray-500 uppercase">SerpAPI Key</label>
                      <a href="https://serpapi.com" target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-500 hover:underline flex items-center gap-1">Get Key <ExternalLink size={10} /></a>
                    </div>
                    <input type="password" value={p.serpApiKey} onChange={e => { p.setSerpApiKey(e.target.value); p.setIsSearchSaved(false); }}
                      placeholder="…"
                      className="w-full h-11 px-4 text-sm bg-gray-50 dark:bg-zinc-950 border border-gray-100 dark:border-white/5 rounded-xl focus:ring-1 focus:ring-blue-500 outline-none" />
                  </div>
                  <div className="flex gap-3">
                    <VerifyBtn state={p.searchVerifyState} onClick={handleVerifySearch} />
                    <SaveBtn saved={p.isSearchSaved} onClick={handleSaveSearch} label="Save Keys" />
                  </div>
                </motion.div>
              )}

              {p.activeTab === 'sources' && (
                <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Conversation Sources</h3>
                  {(() => {
                    const allSources = p.messages.flatMap(m => m.sources || []);
                    const unique = Array.from(new Map(allSources.map(s => [s.url, s])).values());
                    if (!unique.length) return (
                      <div className="py-12 text-center opacity-40">
                        <Layout size={32} className="mx-auto mb-3" />
                        <p className="text-xs">No sources collected yet</p>
                      </div>
                    );
                    return unique.map(s => (
                      <div key={s.url} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-zinc-950 border border-gray-100 dark:border-white/5 rounded-xl">
                        <Globe size={16} className="text-gray-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold truncate">{s.title}</div>
                          <div className="text-[10px] text-gray-400 truncate">{s.url}</div>
                        </div>
                        <a href={s.url} target="_blank" rel="noopener noreferrer"
                          className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-400 hover:text-blue-500 rounded-md transition-colors">
                          <ExternalLink size={14} />
                        </a>
                      </div>
                    ));
                  })()}
                </motion.div>
              )}

              {p.activeTab === 'mcp' && (
                <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
                  <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">MCP Server</h3>
                  <Field label="Server URL" value={p.mcpUrl} onChange={v => { p.setMcpUrl(v); p.setIsMcpSaved(false); }} placeholder="http://localhost:8089" />
                  <Field label="API Key" type="password" value={p.mcpKey} onChange={v => { p.setMcpKey(v); p.setIsMcpSaved(false); }} placeholder="Enter API key" />
                  <div className="flex gap-3">
                    <SaveBtn saved={p.isMcpSaved} onClick={handleSaveMcp} label="Save Config" />
                    <button
                      onClick={handleConnectMcp}
                      className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                        p.isMcpConnected
                          ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/30'
                          : 'bg-black dark:bg-white text-white dark:text-black'
                      }`}
                    >
                      {p.isConnectingMcp && <div className="spinner-ring" />}
                      {p.isConnectingMcp ? 'Connecting…' : p.isMcpConnected ? 'Disconnect' : 'Connect'}
                    </button>
                  </div>
                </motion.div>
              )}

            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

/* ─────────────────── MAIN APP ─────────────────── */

const DEFAULT_SERVER  = 'http://127.0.0.1:8089';
const DEFAULT_MCP_URL = 'http://127.0.0.1:8089';
const DEFAULT_API_KEY = 'llama';

export default function App() {
  /* ── state ── */
  const [chats, setChats]                   = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId]   = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen]   = useState(true);
  const [isMobileOpen, setIsMobileOpen]     = useState(false);
  const [isDarkMode, setIsDarkMode]         = useState(true);
  const [useBubbles, setUseBubbles]         = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeTab, setActiveTab]           = useState<SettingsTab>('general');
  const [activePlusMenu, setActivePlusMenu] = useState<PlusSubMenu>('main');
  const [isSourcesOpen, setIsSourcesOpen]   = useState(false);

  const [serverUrl, setServerUrl]   = useState(() => localStorage.getItem('lumina_server_url') || DEFAULT_SERVER);
  const [apiKey, setApiKey]         = useState(() => localStorage.getItem('lumina_api_key') || DEFAULT_API_KEY);
  const [mcpUrl, setMcpUrl]         = useState(() => localStorage.getItem('lumina_mcp_url') || DEFAULT_MCP_URL);
  const [mcpKey, setMcpKey]         = useState(() => localStorage.getItem('lumina_mcp_key') || DEFAULT_API_KEY);
  const [tavilyKey, setTavilyKey]   = useState(() => localStorage.getItem('lumina_tavily_key') || '');
  const [serpKey, setSerpKey]       = useState(() => localStorage.getItem('lumina_serp_key') || '');

  const [aiVerifyState, setAiVerifyState]         = useState<VerifyState>('idle');
  const [searchVerifyState, setSearchVerifyState] = useState<VerifyState>('idle');
  const [isAiSaved, setIsAiSaved]                 = useState(false);
  const [isSearchSaved, setIsSearchSaved]         = useState(false);
  const [isMcpSaved, setIsMcpSaved]               = useState(false);
  const [isMcpConnected, setIsMcpConnected]       = useState(false);
  const [isConnectingMcp, setIsConnectingMcp]     = useState(false);

  const [mcpTools, setMcpTools] = useState<McpTool[]>([
    { id: 'fetch',  name: 'Fetch URL',   enabled: true,  description: 'Read content from any URL',        icon: <Globe size={14} /> },
    { id: 'brave',  name: 'Brave Search',enabled: true,  description: 'Search the web for real-time info',icon: <Search size={14} /> },
    { id: 'fs',     name: 'Filesystem',  enabled: false, description: 'Read and write local files',       icon: <Box size={14} /> },
    { id: 'github', name: 'GitHub',      enabled: false, description: 'Access repos and issues',          icon: <Box size={14} /> },
  ]);

  const [availableModels, setAvailableModels] = useState([
    { id: 'lumina-ultra-plus',  name: 'Lumina Ultra Plus',  icon: <Sparkles size={14} />, color: 'text-blue-500' },
    { id: 'lumina-pro-max',     name: 'Lumina Pro Max',     icon: <Plus size={14} />,     color: 'text-purple-500' },
    { id: 'lumina-mini-flash',  name: 'Lumina Mini Flash',  icon: <ArrowUp size={14} />,  color: 'text-orange-500' },
  ]);
  const [selectedModel, setSelectedModel]   = useState('lumina-ultra-plus');
  const [input, setInput]                   = useState('');
  const [isTyping, setIsTyping]             = useState(false);
  const [isWebSearch, setIsWebSearch]       = useState(true);
  const [attachedFiles, setAttachedFiles]   = useState<File[]>([]);
  const [toasts, setToasts]                 = useState<{ id: string; message: string }[]>([]);
  const [showScrollBtn, setShowScrollBtn]   = useState(false);
  const [searchQuery, setSearchQuery]       = useState('');
  const [isSearchBarOpen, setIsSearchBarOpen] = useState(false);
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);
  const [isPlusOpen, setIsPlusOpen]         = useState(false);
  const [isModelOpen, setIsModelOpen]       = useState(false);

  const scrollRef    = useRef<HTMLDivElement>(null);
  const inputRef     = useRef<HTMLTextAreaElement>(null);
  const fileRef      = useRef<HTMLInputElement>(null);
  const dropdownRef  = useRef<HTMLDivElement>(null);
  const headerMenuRef= useRef<HTMLDivElement>(null);
  const plusMenuRef  = useRef<HTMLDivElement>(null);

  useClickOutside(dropdownRef,   () => setIsModelOpen(false));
  useClickOutside(headerMenuRef, () => setIsHeaderMenuOpen(false));
  useClickOutside(plusMenuRef,   () => { setIsPlusOpen(false); setActivePlusMenu('main'); });

  /* dark mode */
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
  }, [isDarkMode]);

  /* auto-scroll */
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [chats, isTyping]);

  /* scroll-to-bottom button */
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => setShowScrollBtn(el.scrollHeight - el.scrollTop - el.clientHeight > 200);
    el.addEventListener('scroll', onScroll);
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  /* auto-connect on mount */
  useEffect(() => {
    if (serverUrl && apiKey) {
      // fire-and-forget initial verify
    }
  }, []);

  /* ── helpers ── */
  const currentChat = chats.find(c => c.id === currentChatId);
  const messages    = currentChat?.messages || [];

  const showToast = useCallback((message: string) => {
    const id = Date.now().toString();
    setToasts(p => [...p, { id, message }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3000);
  }, []);

  const createNewChat = useCallback(() => {
    const newChat: Chat = { id: Date.now().toString(), title: 'New chat', messages: [], updatedAt: new Date() };
    setChats(p => [newChat, ...p]);
    setCurrentChatId(newChat.id);
    return newChat.id;
  }, []);

  const adjustHeight = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
    setInput(el.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleScreenshot = async () => {
    setIsPlusOpen(false);
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const track = stream.getVideoTracks()[0];
      const capture = new (window as any).ImageCapture(track);
      const bmp = await capture.grabFrame();
      const canvas = document.createElement('canvas');
      canvas.width = bmp.width; canvas.height = bmp.height;
      canvas.getContext('2d')?.drawImage(bmp, 0, 0);
      track.stop();
      canvas.toBlob(blob => {
        if (blob) {
          setAttachedFiles(p => [...p, new File([blob], `screenshot-${Date.now()}.png`, { type: 'image/png' })]);
          showToast('Screenshot captured!');
        }
      });
    } catch {
      showToast('Screenshot cancelled or unsupported.');
    }
  };

  /* ── send message ── */
  const handleSend = async (override?: string) => {
    const content = override || input.trim();
    if (!content && attachedFiles.length === 0) return;

    let chatId = currentChatId;
    if (!chatId) chatId = createNewChat();

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content, timestamp: new Date() };
    setAttachedFiles([]);
    setChats(prev => prev.map(c => {
      if (c.id !== chatId) return c;
      const msgs = [...c.messages, userMsg];
      return { ...c, messages: msgs, title: c.messages.length === 0 ? content.slice(0, 30) + (content.length > 30 ? '…' : '') : c.title, updatedAt: new Date() };
    }));
    setInput('');
    setIsTyping(true);
    if (inputRef.current) inputRef.current.style.height = 'auto';

    // interim thinking message
    const thinkId = (Date.now() + 1).toString();
    const thinkMsg: Message = {
      id: thinkId, role: 'assistant', content: '', timestamp: new Date(),
      thinking: isWebSearch ? 'Searching the web…' : 'Thinking…',
      isSearching: isWebSearch,
    };
    setChats(prev => prev.map(c => c.id === chatId ? { ...c, messages: [...c.messages, thinkMsg] } : c));

    try {
      const ctx = chats.find(c => c.id === chatId)?.messages || [];
      const apiMessages = [...ctx, userMsg]
        .filter(m => m.content?.trim())
        .map(m => ({ role: m.role, content: m.content }));

      const res = await fetch(`${serverUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model: selectedModel, messages: apiMessages, stream: false }),
      });

      if (!res.ok) throw new Error(`API ${res.status}`);
      const data = await res.json();
      const choice = data.choices?.[0]?.message;
      const text = choice?.content || '';
      const rawTools = choice?.tool_calls;
      const hasWebSearchTool = Array.isArray(rawTools) && rawTools.some((tc: any) => isWebSearchTool(tc.function?.name || ''));

      const toolNodes: ToolCallNode[] = Array.isArray(rawTools) && rawTools.length > 0
        ? rawTools.map((tc: any, i: number) => {
            const name = tc.function?.name || 'unknown';
            return {
              id: tc.id || `tc-${i}`,
              type: 'tool',
              label: name,
              status: 'complete',
              icon: toolIcon(name, 12),
            };
          })
        : [{ id: '1', type: 'ai', label: 'AI Core', status: 'complete', icon: <Sparkles size={12} /> }];

      const assistantMsg: Message = {
        id: thinkId,
        role: 'assistant',
        content: text || (rawTools?.length > 0 ? `Ran ${rawTools.length} tool(s)` : ''),
        timestamp: new Date(),
        toolCalls: toolNodes.map(n => ({ ...n, status: 'complete' })),
        isSearching: hasWebSearchTool,
        thinking: hasWebSearchTool ? 'Searching the web…' : undefined,
      };
      setChats(prev => prev.map(c => {
        if (c.id !== chatId) return c;
        return { ...c, messages: [...c.messages.filter(m => m.id !== thinkId), assistantMsg] };
      }));
    } catch (err) {
      const errMsg: Message = {
        id: thinkId, role: 'assistant',
        content: `Error: Could not connect to ${serverUrl}. Check Settings → AI Service.`,
        timestamp: new Date(),
      };
      setChats(prev => prev.map(c =>
        c.id !== chatId ? c : { ...c, messages: [...c.messages.filter(m => m.id !== thinkId), errMsg] }
      ));
    } finally {
      setIsTyping(false);
    }
  };

  /* ── markdown components ── */
  const markdownComponents = {
    code({ className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || '');
      if (match) return <CanvasBlock language={match[1]} code={String(children).replace(/\n$/, '')} />;
      return <code className="bg-white/10 px-1.5 py-0.5 rounded text-sm font-mono" {...props}>{children}</code>;
    },
  };

  /* ── suggestions ── */
  const suggestions = [
    'Explain quantum computing simply',
    'Write a professional cover letter',
    'Plan a weekend trip from London',
    'How do I build a REST API in Python?',
  ];

  /* ═══════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════ */
  return (
    <div className={`flex h-screen w-full bg-white text-gray-900 overflow-hidden relative ${isDarkMode ? 'dark' : ''}`}>

      {/* ── Mobile overlay sidebar ── */}
      <AnimatePresence>
        {isMobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsMobileOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] md:hidden"
            />
            <motion.aside
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-72 bg-white dark:bg-zinc-900 border-r border-gray-100 dark:border-white/5 z-[101] md:hidden flex flex-col p-4 shadow-2xl"
            >
              <SidebarContent
                chats={chats} currentChatId={currentChatId}
                setCurrentChatId={id => { setCurrentChatId(id); setIsMobileOpen(false); }}
                createNewChat={createNewChat} setChats={setChats}
                onToggle={() => setIsMobileOpen(false)}
                onOpenSettings={() => { setIsSettingsOpen(true); setIsMobileOpen(false); }}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── Desktop sidebar ── */}
      <motion.aside
        animate={{ width: isSidebarOpen ? 260 : 0, opacity: isSidebarOpen ? 1 : 0 }}
        transition={{ duration: isSidebarOpen ? 0.22 : 0.18, ease: 'easeOut' }}
        className="hidden md:flex flex-col border-r border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-[#121212] overflow-hidden"
      >
        <div className="w-[260px] h-full flex flex-col p-4">
          <SidebarContent
            chats={chats} currentChatId={currentChatId} setCurrentChatId={setCurrentChatId}
            createNewChat={createNewChat} setChats={setChats}
            onToggle={() => setIsSidebarOpen(false)}
            onOpenSettings={() => setIsSettingsOpen(true)}
          />
        </div>
      </motion.aside>

      {/* ── Main area ── */}
      <main className="flex-1 flex flex-col relative h-full min-w-0 dark:bg-[#09090b]">

        {/* Header */}
        <header className="h-14 border-b border-gray-100 dark:border-white/5 flex items-center justify-between px-4 md:px-6 bg-white/80 dark:bg-transparent backdrop-blur-md z-10 sticky top-0 shrink-0">
          <div className="flex items-center gap-2">
            <button onClick={() => setIsMobileOpen(true)} className="md:hidden p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors text-gray-500">
              <PanelLeft size={20} />
            </button>
            {!isSidebarOpen && (
              <button onClick={() => setIsSidebarOpen(true)} className="hidden md:flex p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors text-gray-500">
                <PanelLeft size={20} />
              </button>
            )}
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-400 ml-2">Lumina Intelligence</span>
          </div>

          <div className="flex items-center gap-3">
            {/* Search bar */}
            <div className="relative flex items-center">
              <AnimatePresence>
                {isSearchBarOpen && (
                  <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: 200, opacity: 1 }} exit={{ width: 0, opacity: 0 }} className="absolute right-full mr-2">
                    <input autoFocus type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Search messages…"
                      className="w-full h-9 px-4 bg-gray-100 dark:bg-zinc-800 border-none rounded-full text-xs focus:ring-1 focus:ring-blue-500 outline-none" />
                  </motion.div>
                )}
              </AnimatePresence>
              <button onClick={() => setIsSearchBarOpen(!isSearchBarOpen)}
                className={`p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors ${isSearchBarOpen ? 'text-blue-500' : 'text-gray-500'}`}>
                <Search size={18} />
              </button>
            </div>

            {/* Header menu */}
            <div className="relative" ref={headerMenuRef}>
              <button onClick={() => setIsHeaderMenuOpen(!isHeaderMenuOpen)}
                className={`p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors ${isHeaderMenuOpen ? 'text-black dark:text-white' : 'text-gray-500'}`}>
                <MoreVertical size={18} />
              </button>
              <AnimatePresence>
                {isHeaderMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    className="absolute top-full right-0 mt-2 w-52 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-white/10 rounded-2xl shadow-2xl p-1.5 z-[60] animate-fade-up"
                  >
                    {[
                      { label: 'Settings',   icon: <Settings size={16} />,  onClick: () => { setIsSettingsOpen(true); setIsHeaderMenuOpen(false); } },
                      { label: 'Account',    icon: <User size={16} />,       onClick: () => setIsHeaderMenuOpen(false) },
                      { label: 'MCP Status', icon: <HardDrive size={16} className={isMcpConnected ? 'text-blue-500' : ''} />,
                        onClick: () => { setActiveTab('mcp'); setIsSettingsOpen(true); setIsHeaderMenuOpen(false); } },
                    ].map(item => (
                      <button key={item.label} onClick={item.onClick}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-black dark:hover:text-white transition-colors">
                        {item.icon} {item.label}
                      </button>
                    ))}
                    <div className="my-1.5 border-t border-gray-100 dark:border-white/5" />
                    <button
                      onClick={() => setIsDarkMode(!isDarkMode)}
                      className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                    >
                      <div className="flex items-center gap-3"><Sparkles size={16} /> Dark Mode</div>
                      <div className={`w-8 h-4 rounded-full relative transition-colors ${isDarkMode ? 'bg-blue-600' : 'bg-gray-200'}`}>
                        <motion.div animate={{ x: isDarkMode ? 18 : 2 }} className="absolute top-1 w-2 h-2 rounded-full bg-white" />
                      </div>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Messages + sources panel */}
        <div className="flex-1 flex overflow-hidden">
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 md:px-0 py-8 custom-scrollbar scroll-smooth">
            <div className={`mx-auto space-y-8 pb-24 transition-all duration-500 ${isSourcesOpen ? 'max-w-xl md:mr-4' : 'max-w-3xl'}`}>
              <AnimatePresence initial={false}>

                {/* Empty state */}
                {messages.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    className="h-[60vh] flex flex-col items-center justify-center text-center px-4"
                  >
                    <motion.div
                      animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 4, repeat: Infinity }}
                      className="w-16 h-16 bg-gray-50 dark:bg-zinc-900 border border-gray-100 dark:border-white/5 rounded-3xl flex items-center justify-center text-black dark:text-white mb-6 shadow-sm animate-active-ring"
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
                      {suggestions.map((s, i) => (
                        <motion.button
                          key={s}
                          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.08 }}
                          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                          onClick={() => handleSend(s)}
                          className="p-4 text-left bg-white dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-2xl hover:border-gray-200 dark:hover:border-white/10 hover:shadow-sm transition-all group"
                        >
                          <div className="text-xs font-semibold text-gray-400 dark:text-gray-500 mb-1 uppercase tracking-wider">Example</div>
                          <div className="text-sm text-gray-600 dark:text-gray-300 group-hover:text-black dark:group-hover:text-white transition-colors">{s}</div>
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                ) : (
                  messages.map(msg => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      className={`flex flex-col ${useBubbles ? (msg.role === 'user' ? 'items-end' : 'items-start') : 'items-stretch w-full'}`}
                    >
                      {useBubbles ? (
                        /* ── BUBBLE LAYOUT ── */
                        <div className={`flex flex-col max-w-[85%] ${msg.role === 'user' ? 'items-end animate-msg-in' : 'items-start'}`}>
                          <div className={`px-5 py-3 rounded-2xl text-[15px] leading-relaxed shadow-sm ${
                            msg.role === 'user'
                              ? 'bg-black dark:bg-white text-white dark:text-black rounded-tr-none'
                              : 'bg-gray-100 dark:bg-zinc-800 text-gray-800 dark:text-gray-200 rounded-tl-none'
                          }`}>
                            {msg.thinking ? (
                              /* thinking state in bubble */
                              <div className="flex items-center gap-2">
                                <div className="w-4 h-4 rounded-full border border-zinc-600 flex items-center justify-center">
                                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                                    className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
                                </div>
                                <span className="shimmer-text text-sm">{msg.thinking}</span>
                              </div>
                            ) : (
                              <Markdown components={markdownComponents}>{msg.content}</Markdown>
                            )}
                          </div>
                          <div className="mt-1 text-[10px] text-gray-400 px-1 font-medium uppercase tracking-tight">
                            {msg.role === 'assistant' ? 'Lumina' : 'You'} · {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      ) : (
                        /* ── LINEAR LAYOUT ── */
                        <div className="space-y-6 w-full">
                          {msg.role === 'user' ? (
                            <motion.div
                              className="flex items-start gap-4 pb-4 border-b border-gray-100 dark:border-white/5 max-w-2xl"
                              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.18, ease: 'easeOut' }}
                            >
                              <div className="w-6 h-6 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 text-[10px] font-bold shrink-0 mt-1">
                                AR
                              </div>
                              <h3 className="text-xl font-medium text-gray-900 dark:text-white tracking-tight">{msg.content}</h3>
                            </motion.div>
                          ) : (
                            <div className="space-y-4 max-w-2xl px-1">

{/* Tool call chain */}
                                {msg.toolCalls && msg.toolCalls.length > 0 && (
                                  <div className="mb-2">
                                    {msg.toolCalls.some(tc => tc.type === 'tool' && !isWebSearchTool(tc.label)) && (
                                      <>
                                        <LlamaBridgeIndicator toolName={msg.toolCalls.find(tc => tc.type === 'tool' && !isWebSearchTool(tc.label))?.label} />
                                        <NodeGraph nodes={msg.toolCalls} />
                                      </>
                                    )}
                                    {!msg.toolCalls.some(tc => tc.type === 'tool' && !isWebSearchTool(tc.label)) && (
                                      <NodeGraph nodes={msg.toolCalls} />
                                    )}
                                  </div>
                                )}

                              {/* Thinking / searching animation */}
                              {msg.thinking && (
                                <div className="space-y-3 mb-4">
                                  <ThinkingBlock text={msg.thinking} isSearching={msg.isSearching} />
                                  {isTyping && (
                                    <>
                                      <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                                        className="status-description ml-5 flex items-center gap-2 text-zinc-500 text-[12px]">
                                        <ChevronRight size={12} className="opacity-50" />
                                        {msg.isSearching ? 'Gathering relevant information' : 'Analyzing input'}
                                      </motion.div>
                                      <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                                        className="status-description ml-5 flex items-center gap-2 text-zinc-500 text-[12px]">
                                        <ChevronRight size={12} className="opacity-50" />
                                        {msg.isSearching ? 'Synthesizing search results' : 'Composing response'}
                                      </motion.div>
                                      <div className="ml-5"><TypingIndicator /></div>
                                    </>
                                  )}
                                </div>
                              )}

                              {/* Sub-process pipeline (shown when actively searching) */}
                              {msg.isSearching && isTyping && !msg.content && (
                                <div className="space-y-1.5 mb-4">
                                  <PipelineStep icon="📂" label="Loading context" status="done" />
                                  <PipelineStep icon="🔍" label="Searching sources" status="running" pct={65} />
                                  <PipelineStep icon="✍️" label="Composing answer" status="pending" />
                                  <PipelineStep icon="✅" label="Verify output" status="pending" />
                                </div>
                              )}

                              {/* Web search block */}
                              {msg.searchQuery && (
                                <SearchBlock
                                  query={msg.searchQuery}
                                  sources={msg.sources}
                                  isSearching={msg.isSearching}
                                />
                              )}

                              {/* Main response text */}
                              {msg.content && (
                                <motion.div
                                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                  transition={{ duration: 0.4, delay: 0.2 }}
                                  className="prose prose-sm dark:prose-invert max-w-none text-[16px] leading-[1.6]"
                                >
                                  <Markdown components={markdownComponents}>{msg.content}</Markdown>
                                </motion.div>
                              )}

                              {/* Sources footer */}
                              {msg.sources && msg.sources.length > 0 && (
                                <motion.div
                                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                  transition={{ delay: 0.5 }}
                                  className="pt-2 flex items-center gap-3"
                                >
                                  <button
                                    onClick={() => setIsSourcesOpen(true)}
                                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-xl text-xs font-bold text-gray-500 dark:text-gray-400 transition-all uppercase tracking-tighter animate-fade-up"
                                  >
                                    <Layout size={14} /> {msg.sources.length} Sources
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

          {/* Scroll-to-bottom */}
          <AnimatePresence>
            {showScrollBtn && (
              <motion.button
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
                onClick={() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })}
                className="absolute bottom-32 right-8 p-3 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-white/10 rounded-full shadow-2xl text-gray-500 hover:text-black dark:hover:text-white z-40"
              >
                <ArrowUp size={20} />
              </motion.button>
            )}
          </AnimatePresence>

          {/* Sources slide panel */}
          <AnimatePresence>
            {isSourcesOpen && (
              <motion.div
                initial={{ x: 400, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 400, opacity: 0 }}
                transition={{ duration: 0.22 }}
                className="w-80 border-l border-gray-100 dark:border-white/5 bg-white dark:bg-zinc-950 flex flex-col shrink-0 shadow-2xl z-20"
              >
                <div className="p-6 flex items-center justify-between border-b border-gray-50 dark:border-white/5">
                  <h3 className="font-display font-semibold text-gray-900 dark:text-white">Sources</h3>
                  <button onClick={() => setIsSourcesOpen(false)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/5 rounded-md text-gray-400 transition-colors">
                    <X size={18} />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                  {messages.find(m => m.sources)?.sources?.map((s, i) => (
                    <motion.div key={i} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}
                      className="group p-4 bg-gray-50 dark:bg-white/5 border border-transparent hover:border-blue-500/30 rounded-2xl transition-all">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-900 border border-gray-100 dark:border-white/5 flex items-center justify-center shrink-0">
                          <Globe size={18} className="text-gray-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-bold text-gray-900 dark:text-white truncate uppercase tracking-tighter mb-1">{s.title}</h4>
                          <p className="text-[10px] text-gray-400 truncate mb-3">{s.url}</p>
                          <a href={s.url} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-[10px] font-bold text-blue-500 hover:text-blue-600 uppercase tracking-widest">
                            Open Link <ExternalLink size={10} />
                          </a>
                        </div>
                      </div>
                    </motion.div>
                  )) || (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                      <Layout size={32} className="mb-4" />
                      <p className="text-xs font-semibold uppercase tracking-widest">No Sources</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Input bar ── */}
        <div className="px-4 pb-6 bg-transparent sticky bottom-0 shrink-0">
          <div className="max-w-3xl mx-auto relative">
            <div className="relative border border-white/5 bg-[#1a1a1a] backdrop-blur-3xl rounded-[28px] shadow-2xl focus-within:border-white/10 transition-all overflow-visible flex flex-col p-1.5 min-h-[110px] justify-between">
              {/* Textarea */}
              <div className="flex-1 px-3 pt-2">
                <textarea
                  ref={inputRef} value={input} onChange={adjustHeight} onKeyDown={handleKeyDown}
                  placeholder="Write a message…" rows={1}
                  className="w-full bg-transparent border-none focus:ring-0 text-[16px] p-0 resize-none min-h-[40px] text-white placeholder-gray-500 scroll-none"
                />
                {/* Attached files */}
                {attachedFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-3 pb-1">
                    {attachedFiles.map((file, idx) => (
                      <div key={idx} className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-[11px] font-medium text-gray-300">
                        <FileUp size={12} className="text-blue-400 shrink-0" />
                        <span className="max-w-[120px] truncate">{file.name}</span>
                        <button onClick={() => setAttachedFiles(p => p.filter((_, i) => i !== idx))} className="text-gray-500 hover:text-red-400 transition-colors">
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Bottom toolbar */}
              <div className="flex items-center justify-between px-3 pb-1.5 pt-3">
                <div className="flex items-center gap-1.5">
                  {/* Plus menu */}
                  <div className="relative" ref={plusMenuRef}>
                    <motion.button
                      whileTap={{ scale: 0.92 }}
                      onClick={() => { setIsPlusOpen(!isPlusOpen); setActivePlusMenu('main'); }}
                      className={`p-2 rounded-2xl transition-all ${
                        isWebSearch
                          ? 'text-blue-500 bg-blue-500/10 hover:bg-blue-500/20 animate-active-ring'
                          : 'text-gray-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <Plus size={20} className={`transition-transform duration-200 ${isPlusOpen ? 'rotate-45' : ''}`} />
                    </motion.button>

                    <AnimatePresence>
                      {isPlusOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          className="absolute bottom-full left-0 mb-3 w-64 bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-[70] p-1.5"
                        >
                          {activePlusMenu === 'main' && (
                            <>
                              {[
                                { id: 'files',      label: 'Add files or photos', icon: <FileUp size={16} /> },
                                { id: 'screenshot', label: 'Take a screenshot',   icon: <Camera size={16} /> },
                                { id: 'project',    label: 'Add to project',       icon: <FolderPlus size={16} />, arrow: true },
                                { id: 'skills',     label: 'Skills',               icon: <Box size={16} />, arrow: true },
                                { id: 'connectors', label: 'Add connectors',       icon: <LinkIcon size={16} /> },
                              ].map(item => (
                                <button key={item.id}
                                  onClick={() => {
                                    if (item.id === 'files') { fileRef.current?.click(); setIsPlusOpen(false); }
                                    else if (item.id === 'screenshot') handleScreenshot();
                                    else if (item.id === 'project') setActivePlusMenu('project');
                                    else if (item.id === 'skills') setActivePlusMenu('skills');
                                    else if (item.id === 'connectors') { setIsSettingsOpen(true); setActiveTab('mcp'); setIsPlusOpen(false); }
                                  }}
                                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-gray-400 hover:bg-white/5 hover:text-white transition-colors"
                                >
                                  <div className="flex items-center gap-3">{item.icon} {item.label}</div>
                                  {item.arrow && <ChevronRight size={14} className="text-gray-600" />}
                                </button>
                              ))}
                              <div className="my-1 border-t border-white/5" />
                              <button
                                onClick={() => setIsWebSearch(p => !p)}
                                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-gray-400 hover:bg-white/5 hover:text-white transition-colors"
                              >
                                <div className="flex items-center gap-3 text-blue-500"><Globe size={16} /> Web search</div>
                                {isWebSearch && <Check size={14} className="text-blue-500" />}
                              </button>
                              <button onClick={() => setActivePlusMenu('mcp')}
                                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-gray-400 hover:bg-white/5 hover:text-white transition-colors">
                                <div className="flex items-center gap-3"><HardDrive size={16} /> MCP tools</div>
                                <ChevronRight size={14} className="text-gray-600" />
                              </button>
                            </>
                          )}

                          {activePlusMenu === 'project' && (
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2 px-3 py-2 border-b border-white/5 mb-1">
                                <button onClick={() => setActivePlusMenu('main')} className="p-1 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors"><ChevronLeft size={16} /></button>
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Projects</span>
                              </div>
                              {['Personal', 'Work', 'Research'].map(p => (
                                <button key={p} onClick={() => { showToast(`Added to ${p}`); setIsPlusOpen(false); setActivePlusMenu('main'); }}
                                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-gray-400 hover:bg-white/5 hover:text-white transition-colors">
                                  <FolderPlus size={16} /> {p}
                                </button>
                              ))}
                            </div>
                          )}

                          {activePlusMenu === 'skills' && (
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2 px-3 py-2 border-b border-white/5 mb-1">
                                <button onClick={() => setActivePlusMenu('main')} className="p-1 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors"><ChevronLeft size={16} /></button>
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Skills</span>
                              </div>
                              {[
                                { label: 'Summarize',    prompt: 'Summarize the following: ' },
                                { label: 'Translate',    prompt: 'Translate to English: ' },
                                { label: 'Explain Code', prompt: 'Explain this code step by step: ' },
                                { label: 'Brainstorm',   prompt: 'Brainstorm 5 ideas for: ' },
                              ].map(sk => (
                                <button key={sk.label}
                                  onClick={() => { setInput(sk.prompt); setIsPlusOpen(false); setActivePlusMenu('main'); setTimeout(() => inputRef.current?.focus(), 50); }}
                                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-gray-400 hover:bg-white/5 hover:text-white transition-colors">
                                  <Box size={16} /> {sk.label}
                                </button>
                              ))}
                            </div>
                          )}

                          {activePlusMenu === 'mcp' && (
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2 px-3 py-2 border-b border-white/5 mb-1">
                                <button onClick={() => setActivePlusMenu('main')} className="p-1 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors"><ChevronLeft size={16} /></button>
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">MCP Tools</span>
                              </div>
                              <div className="max-h-64 overflow-y-auto custom-scrollbar">
                                {mcpTools.map(tool => (
                                  <button key={tool.id}
                                    onClick={() => setMcpTools(prev => prev.map(t => t.id === tool.id ? { ...t, enabled: !t.enabled } : t))}
                                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium text-gray-400 hover:bg-white/5 transition-colors"
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className={`p-1.5 rounded-lg ${tool.enabled ? 'bg-blue-500/10 text-blue-500' : 'bg-white/5 text-gray-500'}`}>{tool.icon}</div>
                                      <div className="text-left">
                                        <div className={tool.enabled ? 'text-white' : 'text-gray-400'}>{tool.name}</div>
                                        <div className="text-[10px] text-gray-500 truncate w-32">{tool.description}</div>
                                      </div>
                                    </div>
                                    <div className={`w-8 h-4 rounded-full relative transition-colors ${tool.enabled ? 'bg-blue-600' : 'bg-gray-700'}`}>
                                      <motion.div animate={{ x: tool.enabled ? 18 : 2 }} className="absolute top-1 w-2 h-2 rounded-full bg-white shadow-sm" />
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

                {/* Model selector + send */}
                <div className="flex items-center gap-3">
                  <div className="relative" ref={dropdownRef}>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setIsModelOpen(!isModelOpen)}
                      className="flex items-center gap-1.5 px-3 py-2 hover:bg-white/5 rounded-2xl text-sm font-medium text-gray-400 transition-all"
                    >
                      <span className="max-w-[140px] truncate">{availableModels.find(m => m.id === selectedModel)?.name || 'Select Model'}</span>
                      <ChevronDown size={14} className={`transition-transform duration-200 ${isModelOpen ? 'rotate-180' : ''}`} />
                    </motion.button>
                    <AnimatePresence>
                      {isModelOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          className="absolute bottom-full right-0 mb-3 w-52 bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-[70] p-1.5"
                        >
                          {availableModels.map(model => (
                            <button key={model.id} onClick={() => { setSelectedModel(model.id); setIsModelOpen(false); }}
                              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-colors ${
                                selectedModel === model.id ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'
                              }`}
                            >
                              <span className={model.color}>{model.icon}</span> {model.name}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {isTyping ? (
                    <motion.button whileTap={{ scale: 0.92 }} onClick={() => setIsTyping(false)}
                      className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center text-gray-400 hover:text-white border border-white/10 transition-all">
                      <StopCircle size={20} fill="currentColor" />
                    </motion.button>
                  ) : (
                    <motion.button whileTap={{ scale: 0.92 }} onClick={() => handleSend()} disabled={!input.trim()}
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                        input.trim() ? 'bg-white/10 text-white hover:scale-105 active:scale-95' : 'bg-white/5 text-gray-600'
                      }`}>
                      <ArrowUp size={20} strokeWidth={3} />
                    </motion.button>
                  )}
                </div>
              </div>
            </div>

            <div className="absolute -bottom-6 left-0 right-0 text-center">
              <span className="text-[10px] text-gray-500 font-medium tracking-tight">
                Lumina can make mistakes. Please verify important information.
              </span>
            </div>
          </div>

          <input ref={fileRef} type="file" accept="image/*,.pdf,.txt,.md,.csv" multiple className="hidden"
            onChange={e => { setAttachedFiles(p => [...p, ...Array.from(e.target.files || [])]); e.target.value = ''; }} />
        </div>
      </main>

      {/* ── Settings modal ── */}
      {isSettingsOpen && (
        <SettingsModal
          isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)}
          activeTab={activeTab} setActiveTab={setActiveTab}
          isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode}
          useBubbles={useBubbles} setUseBubbles={setUseBubbles}
          serverUrl={serverUrl} setServerUrl={setServerUrl}
          apiKey={apiKey} setApiKey={setApiKey}
          tavilyApiKey={tavilyKey} setTavilyApiKey={setTavilyKey}
          serpApiKey={serpKey} setSerpApiKey={setSerpKey}
          mcpUrl={mcpUrl} setMcpUrl={setMcpUrl}
          mcpKey={mcpKey} setMcpKey={setMcpKey}
          aiVerifyState={aiVerifyState} setAiVerifyState={setAiVerifyState}
          searchVerifyState={searchVerifyState} setSearchVerifyState={setSearchVerifyState}
          isAiSaved={isAiSaved} setIsAiSaved={setIsAiSaved}
          isSearchSaved={isSearchSaved} setIsSearchSaved={setIsSearchSaved}
          isMcpSaved={isMcpSaved} setIsMcpSaved={setIsMcpSaved}
          isMcpConnected={isMcpConnected} setIsMcpConnected={setIsMcpConnected}
          isConnectingMcp={isConnectingMcp} setIsConnectingMcp={setIsConnectingMcp}
          mcpTools={mcpTools} setMcpTools={setMcpTools}
          messages={messages}
          availableModels={availableModels} setAvailableModels={setAvailableModels}
          setSelectedModel={setSelectedModel}
        />
      )}

      {/* ── Toast notifications ── */}
      <div className="fixed bottom-32 left-1/2 -translate-x-1/2 flex flex-col gap-2 items-center z-50 pointer-events-none">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div key={toast.id}
              initial={{ opacity: 0, y: 16, scale: 0.92 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.92 }}
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
