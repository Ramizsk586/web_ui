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
  Sparkles 
} from 'lucide-react';
import { ToolCallNode } from '../../types';
import { ScrapeResult } from '../../services/scrapingService';
import { ScrapingResultArtifact } from '../ScrapingResultArtifact';
import { ScrapingProgressIndicator } from '../ScrapingProgressIndicator';
import { WikiArticleArtifact } from '../WikiArticleArtifact';
import { WikiToolCallIndicator } from '../WikiToolCallIndicator';
import { RealtimeEditCounter } from './FileDiffNode';
import { LuminaToolCallingAnimation, ToolCallingAnimation } from '../ui/Animations';

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

  return (
    <div className="my-5 w-full pl-2">
      <button
        type="button"
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="flex items-center gap-2 text-[14px] font-medium text-zinc-500 hover:text-zinc-800 dark:text-zinc-500 dark:hover:text-zinc-300 transition-all group px-1 rounded-lg cursor-pointer text-left"
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
        <div className="ml-[7px] border-l border-zinc-105 dark:border-white/10 space-y-5 relative py-1">
          {/* Collapsible search step inside timeline */}
          {hasSearch && (
            <div className="relative pl-8">
              <div className="absolute left-0 top-[10px] w-4 h-[1px] bg-zinc-100 dark:bg-white/5" />
              <button
                type="button"
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
                  className="text-zinc-400 group-hover/btn:text-zinc-650 dark:group-hover/btn:text-zinc-200 animate-none shrink-0"
                >
                  <ChevronDown size={12} />
                </motion.div>
                {isSearching && (
                  <span className="flex gap-0.5 ml-1">
                    <span className="w-1 h-1 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1 h-1 rounded-full bg-blue-505 animate-bounce" style={{ animationDelay: '150ms' }} />
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
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75 animate-pulse"></span>
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
                              className="flex items-start justify-between text-xs p-2.5 rounded-lg border border-zinc-205 dark:border-white/5 bg-white dark:bg-zinc-950/20 group/src shadow-xs hover:border-zinc-300 dark:hover:bg-white/5 transition-colors cursor-pointer"
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
                                  <span className="font-semibold text-zinc-700 dark:text-zinc-350 truncate text-left">
                                    {source.title || domain}
                                  </span>
                                  <span className="text-[10px] text-zinc-400 dark:text-zinc-505 font-mono truncate text-left">
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
                                  <Loader2 size={12} className="text-blue-505 animate-spin" />
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
                type="button"
                onClick={() => setIsThinkingExpanded(!isThinkingExpanded)}
                className="flex items-center gap-2 group/btn cursor-pointer text-left focus:outline-hidden"
              >
                <div className={`transition-colors shrink-0 ${isStreamingThinking ? 'text-blue-500' : 'text-zinc-400 dark:text-zinc-500'}`}>
                  <Brain size={14} className={isStreamingThinking ? "animate-pulse" : ""} />
                </div>
                <span className={`text-[13.5px] font-medium transition-colors ${
                  isStreamingThinking ? 'text-blue-500' : 'text-zinc-650 dark:text-zinc-400'
                }`}>
                  Thought process
                </span>
                <motion.div
                  animate={{ rotate: isThinkingExpanded ? 0 : -90 }}
                  transition={{ duration: 0.15 }}
                  className="text-zinc-400 group-hover/btn:text-zinc-600 dark:group-hover/btn:text-zinc-200 shrink-0"
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
                    <div className="p-3.5 rounded-xl border border-blue-500/10 bg-blue-500/5 dark:bg-blue-500/[0.02] text-[12.5px] leading-relaxed text-blue-450/80 dark:text-blue-400/80 font-mono whitespace-pre-wrap max-h-60 overflow-y-auto custom-scrollbar italic shadow-inner text-left">
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
            const isEditNode = node.toolName === 'write_file' || node.toolName === 'edit_file' || node.toolName === 'create_file';
            const isScriptNode = node.toolName === 'verify_changes' || node.toolName?.includes('script') || node.toolName?.includes('compile') || node.toolName?.includes('terminal') || node.toolName?.includes('shell');
            const isCollapsedLocally = collapsedToolNodes[node.id] !== false;
            
            return (
              <motion.div
                key={node.id}
                initial={(isStreaming || isStreamingThinking) ? false : { opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="relative flex flex-col pl-8 py-0.5 items-start animate-none"
              >
                <div className="absolute left-0 top-[12px] w-4 h-[1px] bg-zinc-150 dark:bg-white/10" />
                
                {(() => {
                  const headerContent = (
                    <div className="flex items-center gap-3">
                      <div className="transition-colors shrink-0">
                        {node.status === 'active' ? (
                          node.toolName === 'web_scrape' || node.toolName?.startsWith('wiki_')
                            ? <LuminaToolCallingAnimation />
                            : <ToolCallingAnimation />
                        ) : (
                          renderNodeIcon(node.icon)
                        )}
                      </div>
                      
                      <span className={`text-[13px] font-medium transition-colors text-left ${
                        node.status === 'active'
                          ? node.toolName === 'web_scrape' || node.toolName?.startsWith('wiki_')
                            ? 'text-orange-500 font-semibold'
                            : 'text-emerald-500 font-semibold'
                          : 'text-zinc-750 dark:text-zinc-350'
                      }`}>
                        {humanizeToolName(node.toolName, node.label)}
                      </span>

                      <motion.div
                        animate={{ rotate: isCollapsedLocally ? -90 : 0 }}
                        transition={{ duration: 0.15 }}
                        className="text-zinc-400 group-hover:text-zinc-650 dark:group-hover:text-zinc-200 shrink-0"
                      >
                        <ChevronDown size={12} />
                      </motion.div>
                      
                      {node.status === 'active' && (
                        <motion.div
                          animate={{ opacity: [0.4, 1, 0.4] }}
                          transition={{ repeat: Infinity, duration: 1.5 }}
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                            node.toolName === 'web_scrape' || node.toolName?.startsWith('wiki_')
                              ? 'bg-orange-500' : 'bg-emerald-500'
                          }`}
                        />
                      )}
                    </div>
                  );

                  return (
                    <button
                      type="button"
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
                })()}
                

                {isEditNode && (
                  <RealtimeEditCounter node={node} />
                )}

                {isScriptNode && (
                  <div className="flex items-center gap-1.5 mt-1 ml-7">
                    <span className="text-[10px] font-bold tracking-widest uppercase px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800/60 text-zinc-550 dark:text-zinc-400 rounded border border-zinc-200/50 dark:border-zinc-700/50 font-mono">
                      Script
                    </span>
                  </div>
                )}

                <AnimatePresence initial={false}>
                  {!isCollapsedLocally && (
                    <motion.div
                      initial={{ height: 0, opacity: 0, marginTop: 0 }}
                      animate={{ height: 'auto', opacity: 1, marginTop: 10 }}
                      exit={{ height: 0, opacity: 0, marginTop: 0 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                      className="overflow-hidden w-full ml-7"
                    >
                      {node.toolName === 'web_scrape' ? (
                        node.status === 'complete' ? (
                          (() => {
                            const scrapeResult = scrapingResults.get(node.id);
                            if (!scrapeResult) return <div className="text-xs text-zinc-500 font-mono italic text-left">Retrieving scraped content assets...</div>;
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
                        )
                      ) : node.toolName?.startsWith('wiki_') ? (
                        node.status === 'complete' ? (
                          (() => {
                            const wikiRes = wikiResults.get(node.id);
                            if (!wikiRes) return <div className="text-xs text-zinc-500 font-mono italic text-left">Retrieving Wikipedia knowledge assets...</div>;
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
                        )
                      ) : node.result ? (
                        <div className="p-3 rounded-xl border border-zinc-200 dark:border-white/5 bg-zinc-50 dark:bg-white/[0.02] text-[12.5px] leading-relaxed text-zinc-600 dark:text-zinc-400 font-mono whitespace-pre-wrap max-h-60 overflow-y-auto custom-scrollbar shadow-inner text-left">
                          {node.result}
                        </div>
                      ) : node.filePath ? (
                        <div className="text-xs text-zinc-500 font-mono italic text-left px-1">
                          {node.filePath}
                          {node.addedCount !== undefined && <span className="text-emerald-500 ml-2">+{node.addedCount}</span>}
                          {node.removedCount !== undefined && <span className="text-red-500 ml-1">-{node.removedCount}</span>}
                        </div>
                      ) : (
                        <div className="text-xs text-zinc-500 font-mono italic text-left px-1">
                          {node.status === 'complete' ? 'Completed' : node.status === 'failed' ? 'Failed' : 'Running...'}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
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
