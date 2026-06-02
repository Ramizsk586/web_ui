import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronDown, 
  Globe, 
  Check, 
  Loader2, 
  Brain, 
  FileText, 
  Search, 
  PenTool, 
  Box, 
  CloudMoon, 
  Terminal, 
  Sparkles,
  Wrench,
  GitBranch,
  Code
} from 'lucide-react';
import { ToolCallNode } from '../../types';
import { ScrapeResult } from '../../services/scrapingService';
import { ScrapingResultArtifact } from '../ScrapingResultArtifact';
import { ScrapingProgressIndicator } from '../ScrapingProgressIndicator';
import { WikiArticleArtifact } from '../WikiArticleArtifact';
import { WikiToolCallIndicator } from '../WikiToolCallIndicator';
import { InlineFileDiffPreview, RealtimeEditCounter } from './FileDiffNode';
import { LuminaToolCallingAnimation, ToolCallingAnimation, WebSearchAnimation } from '../ui/Animations';

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

const renderNodeIcon = (icon: any) => {
  if (!icon) return React.createElement(FileText, { size: 14 });
  
  if (React.isValidElement(icon)) {
    return icon;
  }
  
  if (typeof icon === 'string') {
    const name = icon.toLowerCase();
    if (name.includes('search') || name.includes('research')) return React.createElement(Search, { size: 14 });
    if (name.includes('wikipedia') || name.includes('globe')) return React.createElement(Globe, { size: 14 });
    if (name.includes('read') || name.includes('view') || name.includes('file') || name.includes('fs')) return React.createElement(FileText, { size: 14 });
    if (name.includes('write') || name.includes('edit')) return React.createElement(PenTool, { size: 14 });
    if (name.includes('github') || name.includes('box')) return React.createElement(Box, { size: 14 });
    if (name.includes('weather') || name.includes('cloud')) return React.createElement(CloudMoon, { size: 14 });
    if (name.includes('shell') || name.includes('terminal')) return React.createElement(Terminal, { size: 14 });
    if (name.includes('sparkles') || name.includes('ai')) return React.createElement(Sparkles, { size: 14 });
    if (name.includes('check') || name.includes('success')) return React.createElement(Check, { size: 14 });
    if (name.includes('manage_todos') || name.includes('wrench')) return React.createElement(Wrench, { size: 14 });
    if (name.includes('git-branch') || name.includes('git')) return React.createElement(GitBranch, { size: 14 });
    if (name.includes('code')) return React.createElement(Code, { size: 14 });
    return React.createElement(FileText, { size: 14 });
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
    if (name.includes('search') || name.includes('research')) return React.createElement(Search, { size: 14 });
    if (name.includes('wikipedia') || name.includes('globe')) return React.createElement(Globe, { size: 14 });
    if (name.includes('file') || name.includes('text')) return React.createElement(FileText, { size: 14 });
    if (name.includes('pen') || name.includes('write') || name.includes('edit')) return React.createElement(PenTool, { size: 14 });
    if (name.includes('github') || name.includes('box')) return React.createElement(Box, { size: 14 });
    if (name.includes('weather') || name.includes('cloud')) return React.createElement(CloudMoon, { size: 14 });
    if (name.includes('shell') || name.includes('terminal')) return React.createElement(Terminal, { size: 14 });
    if (name.includes('sparkles') || name.includes('ai')) return React.createElement(Sparkles, { size: 14 });
    if (name.includes('check') || name.includes('success')) return React.createElement(Check, { size: 14 });
    if (name.includes('manage_todos') || name.includes('wrench')) return React.createElement(Wrench, { size: 14 });
    if (name.includes('git-branch') || name.includes('git')) return React.createElement(GitBranch, { size: 14 });
    if (name.includes('code')) return React.createElement(Code, { size: 14 });
    
    return React.createElement(FileText, { size: 14 });
  }

  return React.createElement(FileText, { size: 14 });
};

const humanizeToolName = (toolName?: string, rawLabel?: string) => {
  if (!toolName) return rawLabel || 'System action';
  const lower = toolName.toLowerCase();
  
  if (lower === 'write_file') return 'Write file';
  if (lower === 'edit_file') return 'Edit file';
  if (lower === 'read_file') return 'Read file';
  if (lower === 'search_code') return 'Search code';
  if (lower === 'create_file') return 'Create file';
  if (lower === 'delete_file') return 'Delete file';
  if (lower === 'rename_file') return 'Rename file';
  if (lower === 'analyze_file') return 'Analyze file';
  if (lower === 'fetch_url') return 'Fetch URL';
  if (lower === 'web_search') return 'Web search';
  if (lower === 'ask_user') return 'Ask user';
  if (lower === 'manage_todos') return 'Manage todos';
  if (lower === 'run_skill') return 'Run skill';
  if (lower === 'list_coder_files') return 'Query and analyze codebase project file tree';
  if (lower === 'verify_changes') return 'Verify target changes';
  return rawLabel || toolName;
};

const parseNodeResult = (result?: string) => {
  if (!result) return null;
  try {
    return JSON.parse(result);
  } catch {
    return result;
  }
};

const formatPath = (value?: string) => String(value || '').replace(/\\/g, '/');

const getCommandFromLabel = (label?: string) => {
  const match = String(label || '').match(/\(([\s\S]*)\)$/);
  return match?.[1] || '';
};

const parseAnsiToReact = (text: string) => {
  if (!text) return null;
  const parts: React.ReactNode[] = [];
  const regex = /\x1b\[([0-9;]*)m/g;
  let lastIndex = 0;
  let currentColor = '';
  let isBold = false;
  let isUnderline = false;
  let key = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      const chunk = text.slice(lastIndex, match.index);
      parts.push(
        <span 
          key={key++} 
          className={`s* ${isBold ? 'font-bold text-zinc-100' : ''} ${isUnderline ? 'underline' : ''}`}
          style={{ color: currentColor || undefined }}
        >
          {chunk}
        </span>
      );
    }
    const codes = match[1].split(';').map(c => parseInt(c, 10));
    for (const code of codes) {
      if (code === 0) {
        currentColor = '';
        isBold = false;
        isUnderline = false;
      } else if (code === 1) {
        isBold = true;
      } else if (code === 4) {
        isUnderline = true;
      } else {
        switch (code) {
          case 30: currentColor = '#18181b'; break; // Black
          case 31: currentColor = '#ef4444'; break; // Red
          case 32: currentColor = '#10b981'; break; // Green
          case 33: currentColor = '#f59e0b'; break; // Yellow
          case 34: currentColor = '#3b82f6'; break; // Blue
          case 35: currentColor = '#8b5cf6'; break; // Magenta
          case 36: currentColor = '#06b6d4'; break; // Cyan
          case 37: currentColor = '#f4f4f5'; break; // White
          case 90: currentColor = '#71717a'; break; // Intense Gray
          case 91: currentColor = '#f87171'; break; // Intense Red
          case 92: currentColor = '#34d399'; break; // Intense Green
          case 93: currentColor = '#fbbf24'; break; // Intense Yellow
          case 94: currentColor = '#60a5fa'; break; // Intense Blue
          case 95: currentColor = '#a78bfa'; break; // Intense Magenta
          case 96: currentColor = '#22d3ee'; break; // Intense Cyan
          case 97: currentColor = '#ffffff'; break; // Intense White
        }
      }
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    parts.push(
      <span 
        key={key++} 
        className={`s* ${isBold ? 'font-bold text-zinc-100' : ''} ${isUnderline ? 'underline' : ''}`}
        style={{ color: currentColor || undefined }}
      >
        {text.slice(lastIndex)}
      </span>
    );
  }
  return parts;
};

const ToolLogBlock = ({ 
  title, 
  lines, 
  tone = 'default',
  isActive = false 
}: { 
  title: string; 
  lines: string[]; 
  tone?: 'default' | 'error' | 'success';
  isActive?: boolean;
}) => {
  return (
    <div className="rounded-xl border border-zinc-200/15 dark:border-white/10 bg-[#0c0c0e] text-[12px] leading-relaxed font-mono max-h-72 overflow-y-auto custom-scrollbar shadow-2xl select-text relative">
      {/* OS Windows Bar imitation */}
      <div className="px-3.5 py-2.5 border-b border-white/5 bg-[#141418] sticky top-0 flex items-center justify-between z-10 select-none">
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="w-2 h-2 rounded-full bg-[#ff5f56]" />
          <span className="w-2 h-2 rounded-full bg-[#ffbd2e]" />
          <span className="w-2 h-2 rounded-full bg-[#27c93f]" />
        </div>
        
        <span className="text-[10px] text-zinc-400 font-semibold truncate max-w-[60%] px-1 uppercase tracking-wider font-sans">
          {title}
        </span>
        
        <div className="flex items-center gap-1.5 shrink-0">
          {isActive ? (
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 text-[8px] font-bold tracking-widest font-sans">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
              RUNNING
            </span>
          ) : tone === 'success' ? (
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[8px] font-bold tracking-widest font-sans">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
              SUCCESS
            </span>
          ) : tone === 'error' ? (
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 text-[8px] font-bold tracking-widest font-sans">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
              ERROR
            </span>
          ) : (
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 text-[8px] font-bold tracking-widest font-sans">
              DONE
            </span>
          )}
        </div>
      </div>
      
      {/* Output Content */}
      <div className="p-3.5 space-y-1 font-mono text-zinc-350 select-text bg-[#0c0c0e]">
        {lines.map((line, idx) => {
          const isCommandLine = line.trim().startsWith('$ ');
          const formattedLine = isCommandLine ? (
            <div className="text-zinc-100 font-semibold mb-1 flex items-start gap-1 pb-1 border-b border-white/[0.03]">
              <span className="text-cyan-400 opacity-80 shrink-0 select-none">$</span>
              <span>{line.replace(/^\$\s*/, '')}</span>
            </div>
          ) : (
            <div className="whitespace-pre-wrap break-all min-h-[1.2em]">
              {parseAnsiToReact(line)}
            </div>
          );
          
          return (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, x: -3 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.15, delay: Math.min(idx * 0.015, 0.3) }}
            >
              {formattedLine}
            </motion.div>
          );
        })}
        {isActive && (
          <div className="flex items-center gap-1.5 text-zinc-500 italic text-[11px] mt-2 pt-1.5 border-t border-white/[0.02]">
            <motion.span
              animate={{ opacity: [1, 0, 1] }}
              transition={{ repeat: Infinity, duration: 1.0 }}
              className="inline-block w-1.5 h-3 bg-cyan-400 rounded-sm"
            />
            <span>Executing background tasks...</span>
          </div>
        )}
      </div>
    </div>
  );
};

const renderPlainToolResult = (node: ToolCallNode) => {
  const parsed = parseNodeResult(node.result);
  const toolName = node.toolName || '';
  const isActive = node.status === 'active';

  if (toolName === 'run_command') {
    const command = getCommandFromLabel(node.label);
    const stdout = typeof parsed === 'object' && parsed ? String((parsed as any).stdout || '').trimEnd() : '';
    const stderr = typeof parsed === 'object' && parsed ? String((parsed as any).stderr || '').trimEnd() : '';
    const exitCode = typeof parsed === 'object' && parsed ? (parsed as any).exitCode : undefined;
    const lines = [
      `$ ${command || 'run command'}`,
      stdout,
      stderr ? `${stdout ? '\n' : ''}${stderr}` : '',
      exitCode !== undefined ? `\nexit code: ${exitCode}` : ''
    ].filter(Boolean);
    return <ToolLogBlock title="Shell" lines={lines} tone={exitCode === 0 ? 'success' : exitCode ? 'error' : 'default'} isActive={isActive} />;
  }

  if (toolName === 'read_file') {
    const filePath = typeof parsed === 'object' && parsed ? formatPath((parsed as any).filePath || node.filePath) : node.filePath;
    const content = typeof parsed === 'object' && parsed ? String((parsed as any).content || '') : String(parsed || '');
    const range = typeof parsed === 'object' && parsed && (parsed as any).offset
      ? ` -Offset ${(parsed as any).offset}${(parsed as any).limit ? ` -TotalCount ${(parsed as any).limit}` : ''}`
      : '';
    return <ToolLogBlock title="Read file" lines={[`$ Get-Content -Path ${filePath}${range}`, '', content]} isActive={isActive} />;
  }

  if (toolName === 'search_code') {
    const query = typeof parsed === 'object' && parsed ? String((parsed as any).query || '') : '';
    const matches = typeof parsed === 'object' && parsed && Array.isArray((parsed as any).matches) ? (parsed as any).matches : [];
    const files = typeof parsed === 'object' && parsed && Array.isArray((parsed as any).files) ? (parsed as any).files : [];
    const lines = [
      `$ rg -n ${query ? JSON.stringify(query) : '"<list files>"'}`,
      '',
      ...(matches.length > 0
        ? matches.map((m: any) => `${formatPath(m.filePath)}:${m.line}:  ${m.text}`)
        : files.map((f: any) => formatPath(f.filePath || f.path))),
      matches.length === 0 && files.length === 0 ? 'No matches' : ''
    ].filter(Boolean);
    return <ToolLogBlock title="Shell" lines={lines} isActive={isActive} />;
  }

  if (['write_file', 'edit_file', 'create_file', 'delete_file', 'rename_file'].includes(toolName)) {
    const filePath = typeof parsed === 'object' && parsed ? formatPath((parsed as any).filePath || node.filePath) : node.filePath;
    const replacements = typeof parsed === 'object' && parsed && (parsed as any).replacements ? ` (s* ${(parsed as any).replacements} replacement${(parsed as any).replacements === 1 ? '' : 's'})` : '';
    const action = toolName === 'edit_file' ? 'Edited file' :
      toolName === 'write_file' ? 'Wrote file' :
      toolName === 'create_file' ? 'Created file' :
      toolName === 'delete_file' ? 'Deleted file' :
      'Renamed file';
    return (
      <div className="rounded-xl border border-zinc-200 dark:border-white/5 bg-[#242424] dark:bg-[#242424] text-[12px] font-mono shadow-inner select-text overflow-hidden">
        <div className="px-3 py-2 border-b border-white/5 text-zinc-300 bg-black/10">{action}{replacements}</div>
        <div className="p-3 space-y-2 bg-[#121214]">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2 py-1 rounded bg-zinc-900 border border-white/10 text-zinc-300">{filePath || node.filePath || 'workspace file'}</span>
            {node.addedCount !== undefined && <span className="text-emerald-400 font-semibold">+{node.addedCount}</span>}
            {node.removedCount !== undefined && <span className="text-rose-400 font-semibold">-${node.removedCount}</span>}
          </div>
          {['write_file', 'edit_file', 'create_file'].includes(toolName) && (
            <InlineFileDiffPreview node={node} />
          )}
        </div>
      </div>
    );
  }

  if (typeof parsed === 'string') {
    return <ToolLogBlock title={humanizeToolName(node.toolName, node.label)} lines={[parsed]} isActive={isActive} />;
  }

  return (
    <ToolLogBlock
      title={humanizeToolName(node.toolName, node.label)}
      lines={[JSON.stringify(parsed, null, 2)]}
      isActive={isActive}
    />
  );
};


interface NodeGraphProps {
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
}

export const NodeGraph = React.memo(({ 
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
}: NodeGraphProps) => {
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

  // Auto-expand any active/running nodes so the user can inspect progress in real time (and auto-collapse completed ones)
  useEffect(() => {
    nodes.forEach(node => {
      if (node.status === 'active') {
        setCollapsedToolNodes(prev => {
          if (prev[node.id] === false) return prev;
          return { ...prev, [node.id]: false };
        });
      } else if (node.status === 'complete' || node.status === 'failed') {
        setCollapsedToolNodes(prev => {
          if (prev[node.id] === true) return prev;
          return { ...prev, [node.id]: true };
        });
      }
    });
  }, [nodes]);

  return (
    <div className="w-full flex flex-col gap-2.5 my-4 pr-1 text-left select-none">
      {/* Search Step Accordion */}
      {hasSearch && (
        <div className="border border-zinc-200/10 dark:border-zinc-800/50 bg-zinc-550/[0.03] dark:bg-zinc-950/20 rounded-xl overflow-hidden shadow-xs hover:border-zinc-200/20 transition-all duration-200">
          <button
            type="button"
            onClick={() => setIsSearchExpanded(!isSearchExpanded)}
            className="w-full flex items-center justify-between px-3.5 py-2.5 text-[13px] font-semibold text-zinc-650 dark:text-zinc-300 hover:bg-zinc-150/5 dark:hover:bg-white/[0.02] cursor-pointer select-none text-left"
          >
            <div className="flex items-center gap-2.5 min-w-0 pr-4">
              <Globe size={14} className={isSearching ? "animate-spin-slow text-blue-500" : "text-emerald-500"} />
              <span className="truncate">
                {isSearching ? 'Analyzing and scraping web sources...' : `Searched the web for "${searchQuery || 'information'}"`}
              </span>
              {isSearching && (
                <span className="flex gap-0.5 ml-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
              )}
            </div>
            <motion.div
              animate={{ rotate: isSearchExpanded ? 0 : -90 }}
              transition={{ duration: 0.15 }}
              className="text-zinc-500 shrink-0"
            >
              <ChevronDown size={14} />
            </motion.div>
          </button>
          
          <AnimatePresence initial={false}>
            {isSearchExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div className="px-3.5 pb-3.5 pt-2.5 border-t border-zinc-200/10 dark:border-zinc-800/40 space-y-2.5 bg-black/5 dark:bg-black/10">
                  <div className="flex items-center justify-between text-[10px] text-zinc-400 dark:text-zinc-500 font-mono font-bold tracking-wider mb-1">
                    <span>{isSearching ? "LUMINA SEARCH AGENT RUNNING" : "SEARCH COMPLETED"}</span>
                    <span>{sources.length === 1 ? '1 SOURCE FOUND' : `${sources.length} SOURCES BOUND`}</span>
                  </div>
                  <div className="space-y-1.5">
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
                          className="flex items-center justify-between text-xs p-2.5 rounded-lg border border-zinc-200/10 dark:border-white/5 bg-white dark:bg-[#131110] hover:border-zinc-300 dark:hover:bg-white/5 transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-2 pr-4 min-w-0">
                            <div className="p-1 rounded bg-zinc-50 dark:bg-white/5 border border-zinc-150 dark:border-white/10 shrink-0">
                              {getFavicon(source.url) ? (
                                <img src={getFavicon(source.url)!} alt="" className="w-3.5 h-3.5 object-contain" />
                              ) : (
                                <Globe size={11} className="text-zinc-400" />
                              )}
                            </div>
                            <div className="flex flex-col min-w-0 text-left">
                              <span className="font-semibold text-zinc-700 dark:text-zinc-350 truncate">{source.title || domain}</span>
                              <span className="text-[9px] text-zinc-450 dark:text-zinc-500 font-mono truncate">{source.url}</span>
                            </div>
                          </div>
                          <div className="shrink-0 flex items-center gap-1.5">
                            <span className="text-[9px] text-zinc-450 dark:text-zinc-500 font-mono">100% parsed</span>
                            <Check size={11} className="text-emerald-500" strokeWidth={3} />
                          </div>
                        </motion.a>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Thoughts Accordion */}
      {hasThoughts && (
        <div className="border border-zinc-200/10 dark:border-zinc-800/50 bg-zinc-550/[0.03] dark:bg-zinc-950/20 rounded-xl overflow-hidden shadow-xs hover:border-zinc-200/20 transition-all duration-200">
          <button
            type="button"
            onClick={() => setIsThinkingExpanded(!isThinkingExpanded)}
            className="w-full flex items-center justify-between px-3.5 py-2.5 text-[13px] font-semibold text-zinc-650 dark:text-zinc-300 hover:bg-zinc-150/5 dark:hover:bg-white/[0.02] cursor-pointer select-none text-left"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Brain size={14} className={isStreamingThinking ? "text-blue-500 animate-pulse animate-duration-1000" : "text-zinc-400"} />
              <span className="truncate">
                {isStreamingThinking ? 'Thinking...' : 'Thought process'}
              </span>
              {isStreamingThinking && (
                <span className="flex gap-0.5 ml-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
              )}
            </div>
            <motion.div
              animate={{ rotate: isThinkingExpanded ? 0 : -90 }}
              transition={{ duration: 0.15 }}
              className="text-zinc-500 shrink-0"
            >
              <ChevronDown size={14} />
            </motion.div>
          </button>
          
          <AnimatePresence initial={false}>
            {isThinkingExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div className="px-3.5 pb-3.5 pt-2 border-t border-zinc-200/10 dark:border-zinc-800/40 bg-black/5 dark:bg-black/10 text-left">
                  <div className="text-[12px] leading-relaxed text-zinc-500 dark:text-zinc-450 font-mono whitespace-pre-wrap max-h-60 overflow-y-auto custom-scrollbar italic">
                    {thinkContent}
                    {isStreamingThinking && (
                      <motion.span
                        animate={{ opacity: [1, 0] }}
                        transition={{ repeat: Infinity, duration: 0.6 }}
                        className="inline-block w-1.5 h-3 bg-blue-400 ml-0.5 rounded-sm align-middle"
                      />
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Tool Call steps */}
      {displayNodes.map((node, i) => {
        const isEditNode = node.toolName === 'write_file' || node.toolName === 'edit_file' || node.toolName === 'create_file';
        const isScriptNode = node.toolName === 'verify_changes' || node.toolName === 'run_command' || node.toolName?.includes('script') || node.toolName?.includes('compile') || node.toolName?.includes('terminal') || node.toolName?.includes('shell');
        const isCollapsedLocally = collapsedToolNodes[node.id] !== false;
        
        return (
          <motion.div
            key={node.id}
            initial={(isStreaming || isStreamingThinking) ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="border border-zinc-200/10 dark:border-zinc-800/50 bg-zinc-550/[0.03] dark:bg-zinc-950/20 rounded-xl overflow-hidden shadow-xs hover:border-zinc-200/20 transition-all duration-200 w-full"
          >
            <button
              type="button"
              onClick={() => {
                setCollapsedToolNodes(prev => ({
                  ...prev,
                  [node.id]: !prev[node.id]
                }));
              }}
              className="w-full flex items-center justify-between px-3.5 py-2.5 text-[13px] font-semibold text-zinc-650 dark:text-zinc-300 hover:bg-zinc-150/5 dark:hover:bg-white/[0.02] cursor-pointer select-none text-left"
            >
              <div className="flex items-center gap-2.5 min-w-0 pr-4">
                <div className="shrink-0 flex items-center justify-center">
                  {node.status === 'active' ? (
                    node.toolName === 'web_search' || node.toolName === 'web_scrape' || node.toolName === 'fetch_url' ? (
                      <WebSearchAnimation />
                    ) : node.toolName?.startsWith('wiki_') ? (
                      <LuminaToolCallingAnimation />
                    ) : (
                      <ToolCallingAnimation />
                    )
                  ) : (
                    renderNodeIcon(node.icon)
                  )}
                </div>
                <span className={`truncate text-left ${
                  node.status === 'active'
                    ? 'text-emerald-500 font-bold'
                    : 'text-zinc-750 dark:text-zinc-350'
                }`}>
                  {humanizeToolName(node.toolName, node.label)}
                </span>
                
                {node.status === 'active' && (
                  <motion.div
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className="w-1.5 h-1.5 rounded-full bg-emerald-550 dark:bg-emerald-500 shrink-0"
                  />
                )}
                {node.status === 'complete' && (
                  <Check size={12} className="text-emerald-500 shrink-0" strokeWidth={3} />
                )}
              </div>
              <motion.div
                animate={{ rotate: isCollapsedLocally ? -90 : 0 }}
                transition={{ duration: 0.15 }}
                className="text-zinc-500 shrink-0"
              >
                <ChevronDown size={14} />
              </motion.div>
            </button>
            
            <AnimatePresence initial={false}>
              {!isCollapsedLocally && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <div className="px-3.5 pb-3.5 pt-2 border-t border-zinc-200/10 dark:border-zinc-800/40 bg-black/5 dark:bg-black/10 text-left w-full">
                    {node.toolName === 'web_scrape' ? (
                      node.status === 'complete' ? (
                        (() => {
                          const scrapeResult = scrapingResults.get(node.id);
                          if (!scrapeResult) return <div className="text-xs text-zinc-500 font-mono italic">Retrieving scraped content assets...</div>;
                          return (
                            <div className="w-full">
                              <ScrapingResultArtifact 
                                result={scrapeResult} 
                                onReScrape={() => {}}
                              />
                            </div>
                          );
                        })()
                      ) : (
                        <ScrapingProgressIndicator 
                          status={node.status} 
                          url={node.label.match(/\(([^)]+)\)/)?.[1] || ''} 
                        />
                      )
                    ) : node.toolName?.startsWith('wiki_') ? (
                      node.status === 'complete' ? (
                        (() => {
                          const wikiRes = wikiResults.get(node.id);
                          if (!wikiRes) return <div className="text-xs text-zinc-500 font-mono italic">Retrieving Wikipedia knowledge assets...</div>;
                          return (
                            <div className="w-full">
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
                      )
                    ) : node.result ? (
                      renderPlainToolResult(node)
                    ) : node.filePath ? (
                      <div className="text-xs text-zinc-500 font-mono italic">
                        {node.filePath}
                        {node.addedCount !== undefined && <span className="text-emerald-500 ml-2">+{node.addedCount}</span>}
                        {node.removedCount !== undefined && <span className="text-red-500 ml-1">-{node.removedCount}</span>}
                      </div>
                    ) : (
                      <div className="text-xs text-zinc-500 font-mono italic">
                        {node.status === 'complete' ? 'Completed' : node.status === 'failed' ? 'Failed' : 'Running...'}
                      </div>
                    )}
                    
                    {isEditNode && !node.result && (
                      <div className="mt-2.5">
                        <RealtimeEditCounter node={node} />
                      </div>
                    )}

                    {isScriptNode && (
                      <div className="flex items-center gap-2 mt-2.5">
                        <span className="text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 bg-zinc-950 dark:bg-zinc-900 border border-emerald-550/25 dark:border-emerald-500/25 text-emerald-550 dark:text-emerald-400 rounded-md font-mono flex items-center gap-1.5 shadow-xs">
                          <span className={`${node.status === 'active' ? 'bg-emerald-400 animate-ping' : 'bg-emerald-500'} w-1.5 h-1.5 rounded-full inline-block`} />
                          SHELL EXECUTION
                        </span>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
});

export interface InlineToolCallCardProps {
  node: ToolCallNode;
  scrapingResults?: Map<string, ScrapeResult>;
  wikiResults?: Map<string, { wikiType: string, data: any }>;
  onSendMessage?: (msg: string) => void;
}

export const InlineToolCallCard = React.memo(({
  node,
  scrapingResults = new Map(),
  wikiResults = new Map(),
  onSendMessage
}: InlineToolCallCardProps) => {
  const [isCollapsed, setIsCollapsed] = useState(() => node.status !== 'active');

  useEffect(() => {
    if (node.status === 'active') {
      setIsCollapsed(false);
    } else if (node.status === 'complete' || node.status === 'failed') {
      setIsCollapsed(true);
    }
  }, [node.status]);

  const isEditNode = node.toolName === 'write_file' || node.toolName === 'edit_file' || node.toolName === 'create_file';
  const isScriptNode = node.toolName === 'verify_changes' || node.toolName === 'run_command' || node.toolName?.includes('script') || node.toolName?.includes('compile') || node.toolName?.includes('terminal') || node.toolName?.includes('shell');

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="border border-zinc-200/10 dark:border-zinc-800/50 bg-zinc-550/[0.03] dark:bg-zinc-950/20 rounded-xl overflow-hidden shadow-xs hover:border-zinc-200/20 transition-all duration-200 w-full"
    >
      <button
        type="button"
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full flex items-center justify-between px-3.5 py-2.5 text-[13px] font-semibold text-zinc-650 dark:text-zinc-300 hover:bg-zinc-150/5 dark:hover:bg-white/[0.02] cursor-pointer select-none text-left"
      >
        <div className="flex items-center gap-2.5 min-w-0 pr-4">
          <div className="shrink-0 flex items-center justify-center">
            {node.status === 'active' ? (
              node.toolName === 'web_search' || node.toolName === 'web_scrape' || node.toolName === 'fetch_url' ? (
                <WebSearchAnimation />
              ) : node.toolName?.startsWith('wiki_') ? (
                <LuminaToolCallingAnimation />
              ) : (
                <ToolCallingAnimation />
              )
            ) : (
              renderNodeIcon(node.icon)
            )}
          </div>
          <span className={`truncate text-left ${
            node.status === 'active'
              ? 'text-emerald-500 font-bold'
              : 'text-zinc-750 dark:text-zinc-350'
          }`}>
            {humanizeToolName(node.toolName, node.label)}
          </span>
          
          {node.status === 'active' && (
            <motion.div
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="w-1.5 h-1.5 rounded-full bg-emerald-550 dark:bg-emerald-500 shrink-0"
            />
          )}
          {node.status === 'complete' && (
            <Check size={12} className="text-emerald-500 shrink-0" strokeWidth={3} />
          )}
        </div>
        <motion.div
          animate={{ rotate: isCollapsed ? -90 : 0 }}
          transition={{ duration: 0.15 }}
          className="text-zinc-500 shrink-0"
        >
          <ChevronDown size={14} />
        </motion.div>
      </button>
      
      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-3.5 pb-3.5 pt-2 border-t border-zinc-200/10 dark:border-zinc-800/40 bg-black/5 dark:bg-black/10 text-left w-full animate-fade-in">
              {node.toolName === 'web_scrape' ? (
                node.status === 'complete' ? (
                  (() => {
                    const scrapeResult = scrapingResults.get(node.id);
                    if (!scrapeResult) return <div className="text-xs text-zinc-500 font-mono italic">Retrieving scraped content assets...</div>;
                    return (
                      <div className="w-full">
                        <ScrapingResultArtifact 
                          result={scrapeResult} 
                          onReScrape={() => {}}
                        />
                      </div>
                    );
                  })()
                ) : (
                  <ScrapingProgressIndicator 
                    status={node.status} 
                    url={node.label.match(/\(([^)]+)\)/)?.[1] || ''} 
                  />
                )
              ) : node.toolName?.startsWith('wiki_') ? (
                node.status === 'complete' ? (
                  (() => {
                    const wikiRes = wikiResults.get(node.id);
                    if (!wikiRes) return <div className="text-xs text-zinc-500 font-mono italic">Retrieving Wikipedia knowledge assets...</div>;
                    return (
                      <div className="w-full">
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
                )
              ) : node.result ? (
                renderPlainToolResult(node)
              ) : node.filePath ? (
                <div className="text-xs text-zinc-500 font-mono italic">
                  {node.filePath}
                  {node.addedCount !== undefined && <span className="text-emerald-500 ml-2">+{node.addedCount}</span>}
                  {node.removedCount !== undefined && <span className="text-red-500 ml-1">-{node.removedCount}</span>}
                </div>
              ) : (
                <div className="text-xs text-zinc-500 font-mono italic">
                  {node.status === 'complete' ? 'Completed' : node.status === 'failed' ? 'Failed' : 'Running...'}
                </div>
              )}
              
              {isEditNode && !node.result && (
                <div className="mt-2.5">
                  <RealtimeEditCounter node={node} />
                </div>
              )}

              {isScriptNode && (
                <div className="flex items-center gap-2 mt-2.5">
                  <span className="text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 bg-zinc-950 dark:bg-zinc-900 border border-emerald-550/25 dark:border-emerald-500/25 text-emerald-550 dark:text-emerald-400 rounded-md font-mono flex items-center gap-1.5 shadow-xs">
                    <span className={`${node.status === 'active' ? 'bg-emerald-400 animate-ping' : 'bg-emerald-500'} w-1.5 h-1.5 rounded-full inline-block`} />
                    SHELL EXECUTION
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});
