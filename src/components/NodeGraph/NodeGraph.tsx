import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronDown, 
  Globe, 
  Check, 
  X,
  Loader2, 
  FileText, 
  Search, 
  PenTool, 
  Box, 
  CloudMoon, 
  Terminal, 
  Sparkles,
  Wrench,
  GitBranch,
  Code,
  Puzzle
} from 'lucide-react';
import { ToolCallNode } from '../../types';
import { ScrapeResult } from '../../services/scrapingService';
import { WikiArticleArtifact } from '../WikiArticleArtifact';
import { WikiToolCallIndicator } from '../WikiToolCallIndicator';
import { ComposioToolCallIndicator } from '../ComposioToolCallIndicator';
import { InlineFileDiffPreview, RealtimeEditCounter, normalizeDisplayPath } from './FileDiffNode';

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
    if (name.includes('puzzle') || name.includes('composio')) return React.createElement(Puzzle, { size: 14 });
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
    if (name.includes('puzzle') || name.includes('composio')) return React.createElement(Puzzle, { size: 14 });
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
  if (lower === 'delete_file') return 'Delete file';
  if (lower === 'rename_file') return 'Rename file';
  if (lower === 'analyze_file') return 'Analyze file';
  if (lower === 'fetch_url') return 'Fetch URL';
  if (lower === 'web_search') return 'Web search';
  if (lower === 'ask_user') return 'Ask user';
  if (lower === 'manage_todos') return 'Manage todos';
  if (lower === 'run_skill') return 'Read skill documentation';
  if (lower === 'list_coder_files') return 'Query and analyze codebase project file tree';
  if (lower === 'verify_changes') return 'Verify target changes';
  if (lower.startsWith('composio_')) {
    const action = lower.replace('composio_', '').replace(/_/g, ' ');
    return `Composio: ${action.charAt(0).toUpperCase() + action.slice(1)}`;
  }
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

const getToolStatusText = (status: ToolCallNode['status']) => {
  if (status === 'active') return 'Working';
  if (status === 'failed') return 'Failed';
  return 'Done';
};

const getToolAccentClasses = (status: ToolCallNode['status']) => {
  if (status === 'active') {
    return {
      badge: 'border-blue-500/20 bg-blue-500/8 text-blue-300',
      dot: 'bg-blue-400',
      panel: 'border-zinc-800/70 bg-[#171717]',
      icon: 'text-blue-300'
    };
  }
  if (status === 'failed') {
    return {
      badge: 'border-rose-500/20 bg-rose-500/8 text-rose-300',
      dot: 'bg-rose-400',
      panel: 'border-zinc-800/70 bg-[#171515]',
      icon: 'text-rose-300'
    };
  }
  return {
    badge: 'border-emerald-500/20 bg-emerald-500/8 text-emerald-300',
    dot: 'bg-emerald-400',
    panel: 'border-zinc-800/70 bg-[#171917]',
    icon: 'text-emerald-300'
  };
};

const ToolActivityDots = ({ tone }: { tone: string }) => (
  <span className="inline-flex items-center gap-1">
    {[0, 1, 2].map((idx) => (
      <motion.span
        key={idx}
        animate={{ opacity: [0.25, 1, 0.25], y: [0, -1, 0] }}
        transition={{ repeat: Infinity, duration: 1.1, delay: idx * 0.14, ease: 'easeInOut' }}
        className={`h-1.5 w-1.5 rounded-full ${tone}`}
      />
    ))}
  </span>
);

const ActiveGlobeIcon = () => (
  <div className="relative flex h-4 w-4 items-center justify-center">
    <motion.span
      animate={{ scale: [0.9, 1.2, 0.9], opacity: [0.2, 0.45, 0.2] }}
      transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
      className="absolute inset-0 rounded-full bg-blue-500/20"
    />
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, duration: 4, ease: 'linear' }}
      className="relative z-10"
    >
      <Globe size={13} className="text-blue-400" />
    </motion.div>
  </div>
);

const getInlineSummary = (node: ToolCallNode, status: ToolCallNode['status']) => {
  const filePath = formatPath(normalizeDisplayPath(node.filePath || ''));
  const command = getCommandFromLabel(node.label);
  const fileName = filePath ? filePath.split('/').pop() || filePath : '';

  if (node.toolName === 'run_command' || node.toolName === 'verify_changes') {
    return status === 'active' ? 'Running command' : 'Ran command';
  }

  if (node.toolName === 'read_file') {
    return fileName ? `Read ${fileName}` : 'Read file';
  }

  if (node.toolName === 'write_file' || node.toolName === 'edit_file') {
    return fileName ? `Editing ${fileName}` : 'Editing file';
  }

  if (node.toolName === 'delete_file') {
    return fileName ? `Deleted ${fileName}` : 'Deleted file';
  }

  if (node.toolName === 'rename_file') {
    return fileName ? `Renamed ${fileName}` : 'Renamed file';
  }

  if (node.toolName === 'web_search') return status === 'active' ? 'Searching web' : 'Searched web';
  if (node.toolName === 'web_scrape' || node.toolName === 'fetch_url') return status === 'active' ? 'Fetching page' : 'Fetched page';
  if (node.toolName === 'wiki_research') {
    const subCount = node.subNodes?.length || 0;
    if (status === 'active') return subCount > 1 ? `Researching Wikipedia (${subCount} steps)` : 'Reading Wikipedia';
    return subCount > 1 ? `Researched Wikipedia (${subCount} steps)` : 'Read Wikipedia';
  }
  if (node.toolName?.startsWith('wiki_')) return status === 'active' ? 'Reading Wikipedia' : 'Read Wikipedia';
  if (node.toolName?.startsWith('composio_')) return status === 'active' ? 'Calling integration' : 'Called integration';
  if (node.toolName === 'run_skill') return status === 'active' ? 'Reading skill documentation' : 'Read skill documentation';

  if (command) {
    return status === 'active' ? 'Running command' : 'Ran command';
  }

  return humanizeToolName(node.toolName, node.label);
};

const getInlineMeta = (node: ToolCallNode) => {
  const filePath = formatPath(normalizeDisplayPath(node.filePath || ''));
  const command = getCommandFromLabel(node.label);
  const parts: string[] = [];

  if (filePath) parts.push(filePath);
  if (node.addedCount !== undefined || node.removedCount !== undefined) {
    const diffBits: string[] = [];
    if (node.addedCount !== undefined) diffBits.push(`+${node.addedCount}`);
    if (node.removedCount !== undefined) diffBits.push(`-${node.removedCount}`);
    parts.push(diffBits.join(' '));
  }
  if (!filePath && command) parts.push(command);
  if (!parts.length && node.resultSummary) parts.push(node.resultSummary);

  return parts.join('  ');
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
        
        <div className="shrink-0 text-[8px] font-bold tracking-widest font-sans uppercase text-zinc-500">
          {tone === 'success' ? 'Success' : tone === 'error' ? 'Error' : 'Output'}
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

  if (['write_file', 'edit_file', 'delete_file', 'rename_file'].includes(toolName)) {
    const filePathValue = typeof parsed === 'object' && parsed ? String((parsed as any).filePath || node.filePath || '') : String(node.filePath || '');
    const filePath = formatPath(normalizeDisplayPath(filePathValue));
    const replacementsCount = typeof parsed === 'object' && parsed ? Number((parsed as any).replacements || 0) : 0;
    const replacements = replacementsCount > 0 ? ` (${replacementsCount} replacement${replacementsCount === 1 ? '' : 's'})` : '';
    const action = toolName === 'edit_file' ? 'Edited file' :
      toolName === 'write_file' ? 'Wrote file' :
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
          {['write_file', 'edit_file'].includes(toolName) && (
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

const renderToolBody = (
  node: ToolCallNode,
  effectiveStatus: ToolCallNode['status'],
  scrapingResults: Map<string, ScrapeResult>,
  wikiResults: Map<string, { wikiType: string, data: any }>,
  onSendMessage?: (msg: string) => void
) => {
  if (node.toolName === 'web_scrape' || node.toolName === 'fetch_url') {
    return null;
  }

  if (node.toolName === 'wiki_research') {
    if (effectiveStatus === 'complete') {
      return (
        <div className="flex flex-wrap gap-2 mt-2">
          {(node.subNodes || []).map(sub => {
            const wikiRes = wikiResults.get(sub.id);
            if (!wikiRes) return null;
            return (
              <div key={sub.id} className="w-full">
                <WikiArticleArtifact
                  data={wikiRes.data}
                  wikiType={wikiRes.wikiType as any}
                  onFetchPage={(pageId) => onSendMessage?.(`Fetch Wikipedia page details for ID: ${pageId}`)}
                  onSearch={(query) => onSendMessage?.(`Search Wikipedia for: ${query}`)}
                />
              </div>
            );
          })}
        </div>
      );
    }
    return <WikiToolCallIndicator node={node} />;
  }

  if (node.toolName?.startsWith('wiki_')) {
    if (effectiveStatus === 'complete') {
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
    }

    return <WikiToolCallIndicator node={node} />;
  }

  if (node.toolName?.startsWith('composio_')) {
    return <ComposioToolCallIndicator node={node} />;
  }

  if (node.result) {
    return renderPlainToolResult(node);
  }

  if (node.filePath) {
    return (
      <div className="text-xs text-zinc-500 font-mono italic">
        {node.filePath}
        {node.addedCount !== undefined && <span className="text-emerald-500 ml-2">+{node.addedCount}</span>}
        {node.removedCount !== undefined && <span className="text-red-500 ml-1">-{node.removedCount}</span>}
      </div>
    );
  }

  return (
    <div className="text-xs text-zinc-500 font-mono italic">
      {effectiveStatus === 'complete'
        ? (node.resultSummary || node.label || 'Completed')
        : effectiveStatus === 'failed'
          ? (node.resultSummary || node.label || 'Failed')
          : (node.label || node.resultSummary || 'Running...')}
    </div>
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
  hideConnectors?: boolean;
}

const getActionSummaryText = (nodes: ToolCallNode[], hasSearch: boolean) => {
  const parts: string[] = [];
  if (hasSearch) parts.push("searched the web");
  
  const toolPartsMap: Record<string, number> = {};
  nodes.forEach(n => {
    const name = n.toolName || '';
    if (name.includes('read') || name.includes('view')) {
      toolPartsMap['viewed files'] = (toolPartsMap['viewed files'] || 0) + 1;
    } else if (name.includes('edit') || name.includes('write')) {
      toolPartsMap['modified files'] = (toolPartsMap['modified files'] || 0) + 1;
    } else if (name.includes('create')) {
      toolPartsMap['created files'] = (toolPartsMap['created files'] || 0) + 1;
    } else if (name.includes('verify') || name.includes('compile') || name.includes('lint')) {
      toolPartsMap['verified compilation'] = (toolPartsMap['verified compilation'] || 0) + 1;
    } else if (name.includes('command') || name.includes('shell') || name.includes('terminal')) {
      toolPartsMap['executed terminal commands'] = (toolPartsMap['executed terminal commands'] || 0) + 1;
    } else {
      const human = humanizeToolName(name).toLowerCase();
      toolPartsMap[human] = (toolPartsMap[human] || 0) + 1;
    }
  });

  Object.entries(toolPartsMap).forEach(([action, count]) => {
    if (count === 1) {
      if (action === 'viewed files') parts.push('read a file');
      else if (action === 'modified files') parts.push('edited a file');
      else if (action === 'created files') parts.push('created a file');
      else parts.push(`${action}`);
    } else {
      if (action === 'viewed files') parts.push(`read ${count} files`);
      else if (action === 'modified files') parts.push(`edited ${count} files`);
      else if (action === 'created files') parts.push(`created ${count} files`);
      else parts.push(`${action} (${count})`);
    }
  });

  if (parts.length === 0) return "Executing system action...";
  const joined = parts.join(', ');
  return joined.charAt(0).toUpperCase() + joined.slice(1);
};

interface PipelineItem {
  id: string;
  type: 'think' | 'search' | 'tool' | 'done';
  title: string;
  icon: React.ReactNode;
  status: 'pending' | 'active' | 'complete' | 'failed';
  node?: ToolCallNode;
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
  onSendMessage,
  hideConnectors = false
}: NodeGraphProps) => {
  void thinkContent;
  void isStreamingThinking;
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [collapsedToolNodes, setCollapsedToolNodes] = useState<Record<string, boolean>>({});

  const hasSearch = !!(isSearching || searchQuery || (sources && sources.length > 0));

  const displayNodes = useMemo(() => {
    return nodes.filter(n => n.id !== 'thinking-node');
  }, [nodes]);



  const pipelineItems = useMemo(() => {
    const items: PipelineItem[] = [];

    // 1. Web Search
    if (hasSearch) {
      items.push({
        id: 'search-item',
        type: 'search',
        title: isSearching ? 'Searching the web...' : `Searched the web for "${searchQuery || 'information'}"`,
        icon: isSearching ? <ActiveGlobeIcon /> : <Globe size={13} className="text-emerald-500" />,
        status: isSearching ? 'active' : 'complete'
      });
    }

    // 2. Tool Calls
    displayNodes.forEach(node => {
      items.push({
        id: node.id,
        type: 'tool',
        title: humanizeToolName(node.toolName, node.label),
        icon: node.status === 'active' ? <ToolActivityDots tone="bg-blue-400" /> : renderNodeIcon(node.icon),
        status: node.status as any,
        node: node
      });
    });

    return items;
  }, [hasSearch, displayNodes, isSearching, searchQuery, isStreaming]);

  const headerText = useMemo(() => {
    return getActionSummaryText(displayNodes, hasSearch);
  }, [displayNodes, hasSearch]);

  return (
    <div className="w-full my-3 pr-1 text-left select-none">
      <div className="border border-zinc-200/10 dark:border-zinc-800/40 bg-zinc-550/[0.02] dark:bg-[#141414]/90 rounded-xl overflow-hidden shadow-sm transition-all duration-300">
        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-full flex items-center justify-between px-3.5 py-2.5 text-[13px] font-semibold text-zinc-500 dark:text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-200 transition-colors cursor-pointer select-none border-none bg-transparent"
        >
          <div className="flex items-center gap-2.5 min-w-0 pr-4">
            {isSearching || nodes.some(n => n.status === 'active') ? (
              <div className="w-3 h-3 rounded-full bg-blue-500 shrink-0" />
            ) : (
              <Check size={13} className="text-emerald-500 shrink-0" strokeWidth={3.5} />
            )}
            <span className="truncate font-sans font-medium text-zinc-400 dark:text-zinc-350">{headerText}</span>
          </div>
          <motion.div
            animate={{ rotate: isCollapsed ? -90 : 0 }}
            transition={{ duration: 0.15 }}
            className="text-zinc-500 shrink-0"
          >
            <ChevronDown size={14} />
          </motion.div>
        </button>

        {!isCollapsed && (
              <div className="px-4 pb-4 pt-3 border-t border-zinc-200/10 dark:border-zinc-800/40 bg-zinc-950/20 dark:bg-black/30 flex flex-col gap-0.5">
                {pipelineItems.map((item, idx) => {
                  const isLast = idx === pipelineItems.length - 1;
                  const isSearch = item.type === 'search';
                  const isTool = item.type === 'tool';
                  
                  return (
                    <div key={item.id} className="relative flex gap-3 pl-1 select-none">
                      {/* Vertical line column */}
                      <div className="flex flex-col items-center shrink-0">
                        <div className={`w-7 h-7 rounded-full border flex items-center justify-center transition-all duration-350
                          ${item.status === 'active' ? 'border-blue-500/50 bg-[#1e1e1e] shadow-[0_0_10px_rgba(59,130,246,0.12)]' :
                            item.status === 'complete' ? 'border-emerald-500/25 bg-[#141d18]' :
                            item.status === 'failed' ? 'border-red-500/30 bg-[#241717]' :
                            'border-zinc-800 bg-[#121212]'
                          }
                        `}>
                          {item.status === 'active' && !isSearch ? (
                            <div className="w-2 h-2 rounded-full bg-blue-500" />
                          ) : item.type === 'done' ? (
                            <div className="w-4 h-4 rounded-full bg-emerald-500/10 flex items-center justify-center">
                              <Check size={10} className="text-emerald-500 font-bold" strokeWidth={3.5} />
                            </div>
                          ) : (
                            item.icon
                          )}
                        </div>
                        {!isLast && !hideConnectors && (
                          <div className={`w-px flex-1 my-1 
                            ${item.status === 'complete' ? 'bg-gradient-to-b from-emerald-500/20 to-zinc-800/40' : 'bg-zinc-800/60'}
                          `} style={{ minHeight: '18px' }} />
                        )}
                      </div>

                      {/* Content column */}
                      <div className="flex-1 pb-4 pt-0.5 text-left min-w-0">
                        <div 
                          onClick={() => {
                            if (isTool && item.node) {
                              const nodeId = item.node.id;
                              setCollapsedToolNodes(prev => ({
                                ...prev,
                                [nodeId]: !prev[nodeId]
                              }));
                            }
                          }}
                          className={`text-[13px] tracking-tight cursor-pointer font-sans select-none flex items-center gap-1.5 hover:text-zinc-100 transition-colors
                            ${item.type === 'done' ? 'font-bold text-zinc-300 text-sm' : 'font-medium text-zinc-400'}
                          `}
                        >
                          <span>{item.title}</span>
                          {item.type !== 'done' && !isSearch && (
                            <span className="text-zinc-650 hover:text-zinc-500 p-0.5 rounded cursor-pointer border-none bg-transparent">
                              <ChevronDown 
                                size={11} 
                                className={`transition-transform duration-200 
                                  ${(collapsedToolNodes[item.node?.id || ''] === false ? 'rotate-0' : '-rotate-90')}
                                `} 
                              />
                            </span>
                          )}
                        </div>

                        {/* Collapsible content layers */}
                        {isTool && item.node && collapsedToolNodes[item.node.id] === false && (
                            <div className="mt-1.5">
                              {item.node.filePath && (
                                <div className="mb-1.5 flex items-center gap-1.5 flex-wrap text-left">
                                  <span className="px-1.5 py-0.5 bg-zinc-900/90 border border-zinc-850 text-zinc-350 text-[10px] font-mono rounded-md font-medium">
                                    {item.node.filePath}
                                  </span>
                                  {item.node.addedCount !== undefined && <span className="text-emerald-500 text-[10px] font-semibold">+{item.node.addedCount}</span>}
                                  {item.node.removedCount !== undefined && <span className="text-rose-500 text-[10px] font-semibold">-{item.node.removedCount}</span>}
                                </div>
                              )}

                              <div className="w-full text-left">
                                {item.node.subNodes && item.node.subNodes.length > 0 ? (
                                  <div className="space-y-1">
                                    {item.node.subNodes.map((sub, si) => (
                                      <div key={sub.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-[#0c0c0e]/85 border border-zinc-900">
                                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0
                                          ${sub.status === 'active' ? 'border-blue-500/50 bg-[#1e1e1e]' :
                                            sub.status === 'complete' ? 'border-emerald-500/25 bg-[#141d18]' :
                                            sub.status === 'failed' ? 'border-red-500/30 bg-[#241717]' :
                                            'border-zinc-800 bg-[#121212]'
                                          }
                                        `}>
                                          {sub.status === 'active' ? (
                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                          ) : sub.status === 'complete' ? (
                                            <Check size={8} className="text-emerald-400" strokeWidth={3} />
                                          ) : sub.status === 'failed' ? (
                                            <X size={8} className="text-red-400" strokeWidth={3} />
                                          ) : (
                                            <div className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
                                          )}
                                        </div>
                                        <span className="flex-1 text-[11px] text-zinc-400 font-mono truncate">{sub.label}</span>
                                        {sub.resultSummary && (
                                          <span className="text-[9px] text-zinc-600 font-mono truncate max-w-[120px]" title={sub.resultSummary}>
                                            {sub.resultSummary.slice(0, 60)}
                                          </span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="text-[11px] p-2 bg-[#0c0c0e]/85 rounded-lg border border-zinc-900">
                                    {renderToolBody(item.node, item.node.status, scrapingResults, wikiResults, onSendMessage)}
                                  </div>
                                )}
                                
                                {(item.node.toolName === 'write_file' || item.node.toolName === 'edit_file') && !item.node.result && (
                                  <div className="mt-1.5 text-left">
                                    <RealtimeEditCounter node={item.node} />
                                  </div>
                                )}

                                {(item.node.toolName === 'verify_changes' || item.node.toolName === 'run_command' || item.node.toolName?.includes('script') || item.node.toolName?.includes('compile') || item.node.toolName?.includes('terminal') || item.node.toolName?.includes('shell')) && (
                                  <div className="flex items-center gap-2 mt-1.5">
                                    <span className="text-[9px] font-bold tracking-widest uppercase px-1.5 py-0.5 bg-zinc-950 border border-emerald-500/20 text-emerald-400 rounded-md font-mono flex items-center gap-1.5 shadow-xs select-none">
                                      <span className={`${item.node.status === 'active' ? 'bg-emerald-400 animate-ping' : 'bg-emerald-500'} w-1.2 h-1.2 rounded-full inline-block`} />
                                      SHELL EXECUTION
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
      </div>
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
  const effectiveStatus = node.status === 'failed'
    ? 'failed'
    : (node.result || node.status === 'complete')
      ? 'complete'
      : node.status;
  const isWikiNode = node.toolName === 'wiki_research' || node.toolName?.startsWith('wiki_');
  const [isCollapsed, setIsCollapsed] = useState(true);
  const accent = getToolAccentClasses(effectiveStatus);
  const inlineSummary = getInlineSummary(node, effectiveStatus);
  const inlineMeta = getInlineMeta(node);

  const isEditNode = node.toolName === 'write_file' || node.toolName === 'edit_file';
  const isScriptNode = node.toolName === 'verify_changes' || node.toolName === 'run_command' || node.toolName?.includes('script') || node.toolName?.includes('compile') || node.toolName?.includes('terminal') || node.toolName?.includes('shell');
  const hasSubPipeline = Array.isArray(node.subNodes) && node.subNodes.length > 0;

  if (isWikiNode) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full"
      >
        {renderToolBody(node, effectiveStatus, scrapingResults, wikiResults, onSendMessage)}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="border border-zinc-200/10 dark:border-zinc-800/60 bg-zinc-550/[0.02] dark:bg-[#111111]/95 rounded-2xl overflow-hidden shadow-xs hover:border-zinc-200/20 transition-all duration-200 w-full"
    >
      <button
        type="button"
        onClick={() => {
          setIsCollapsed(!isCollapsed);
        }}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-white/[0.015] cursor-pointer select-none"
      >
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${accent.badge}`}>
            {effectiveStatus === 'active' ? (
              <ToolActivityDots tone={accent.dot} />
            ) : effectiveStatus === 'failed' ? (
              <X size={13} className={accent.icon} strokeWidth={2.7} />
            ) : effectiveStatus === 'complete' ? (
              <Check size={13} className={accent.icon} strokeWidth={2.7} />
            ) : (
              renderNodeIcon(node.icon)
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 min-w-0">
              <span className="truncate text-[13px] font-medium text-zinc-200">
                {inlineSummary}
              </span>
              <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium ${accent.badge}`}>
                {getToolStatusText(effectiveStatus)}
              </span>
            </div>
            {inlineMeta && (
              <div className="mt-1 truncate text-[12px] text-zinc-500 font-mono">
                {inlineMeta}
              </div>
            )}
            {!inlineMeta && (
              <div className="mt-1 truncate text-[12px] text-zinc-500">
                {humanizeToolName(node.toolName, node.label)}
              </div>
            )}
            {effectiveStatus === 'failed' && node.result && (() => {
              try {
                const result = typeof node.result === 'string' ? JSON.parse(node.result) : node.result;
                if (result.error) {
                  return (
                    <div className="mt-2 text-[11px] text-rose-400 bg-rose-950/30 border border-rose-500/20 rounded-md px-2 py-1.5 font-mono">
                      <span className="font-semibold">Error: </span>
                      {result.error.slice(0, 200)}
                      {result.error.length > 200 && '...'}
                      {result.hint && (
                        <div className="mt-1.5 text-[10px] text-rose-300/70">
                          💡 {result.hint.slice(0, 150)}
                        </div>
                      )}
                    </div>
                  );
                }
              } catch {
                if (typeof node.result === 'string' && node.result.toLowerCase().includes('error')) {
                  return (
                    <div className="mt-2 text-[11px] text-rose-400 bg-rose-950/30 border border-rose-500/20 rounded-md px-2 py-1.5 font-mono">
                      {node.result.slice(0, 300)}
                    </div>
                  );
                }
              }
              return null;
            })()}
          </div>
          {effectiveStatus === 'complete' && node.toolName && ['web_scrape', 'fetch_url'].includes(node.toolName) && (() => {
            const scrapeResult = scrapingResults.get(node.id);
            if (scrapeResult && (scrapeResult.error || (scrapeResult.statusCode && scrapeResult.statusCode >= 400))) {
              return <X size={12} className="text-rose-500 shrink-0 mt-1" strokeWidth={3} />;
            }
            return null;
          })()}
        </div>
        <motion.div
          animate={{ rotate: isCollapsed ? -90 : 0 }}
          transition={{ duration: 0.15 }}
          className="text-zinc-600 shrink-0 mt-1"
        >
          <ChevronDown size={14} />
        </motion.div>
      </button>
      
      {!isCollapsed && (
            <div className={`px-4 pb-4 pt-3 border-t text-left w-full ${accent.panel}`}>
              {hasSubPipeline ? (
                <div className="rounded-xl border border-zinc-900 bg-[#0c0c0e]/85 px-3 py-3 shadow-inner">
                  <div className="mb-2 flex items-center gap-3">
                    <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-zinc-500">
                      Execution Steps
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    {node.subNodes!.map((sub, idx) => {
                      const subIcon = sub.status === 'active'
                        ? <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                        : sub.status === 'complete'
                          ? <Check size={8} className="text-emerald-400" strokeWidth={3} />
                          : sub.status === 'failed'
                            ? <X size={8} className="text-rose-400" strokeWidth={3} />
                            : renderNodeIcon(sub.icon);

                      return (
                        <div key={sub.id} className="relative flex gap-2.5 pl-0.5">
                          <div className="flex items-center shrink-0">
                            <div className={`w-5 h-5 rounded-full border flex items-center justify-center
                              ${sub.status === 'active' ? 'border-blue-500/45 bg-[#16181d]' :
                                sub.status === 'complete' ? 'border-emerald-500/25 bg-[#141d18]' :
                                sub.status === 'failed' ? 'border-rose-500/30 bg-[#241717]' :
                                'border-zinc-800 bg-[#121212]'
                              }`}
                            >
                              {subIcon}
                            </div>
                          </div>
                          <div className="flex-1 pb-3 min-w-0 text-left">
                            <div className="text-[11px] font-semibold text-zinc-300 font-mono truncate">
                              {humanizeToolName(sub.toolName, sub.label)}
                            </div>
                            {sub.filePath && (
                              <div className="mt-1 text-[10px] text-zinc-500 font-mono truncate">
                                {sub.filePath}
                              </div>
                            )}
                            {sub.resultSummary && (
                              <div className="mt-1 text-[10px] text-zinc-500 font-mono leading-relaxed line-clamp-2">
                                {sub.resultSummary}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                renderToolBody(node, effectiveStatus, scrapingResults, wikiResults, onSendMessage)
              )}

              {effectiveStatus === 'failed' && node.result && (() => {
                try {
                  const result = typeof node.result === 'string' ? JSON.parse(node.result) : node.result;
                  if (result.error) {
                    return (
                      <div className="mt-3 text-[11px] text-rose-400 bg-rose-950/40 border border-rose-500/30 rounded-lg px-3 py-2 font-mono">
                        <div className="flex items-center gap-1.5 mb-1">
                          <X size={12} className="text-rose-500" />
                          <span className="font-semibold text-rose-300">Failed</span>
                        </div>
                        <div className="text-rose-300/90 break-words">
                          {result.error}
                        </div>
                        {result.hint && (
                          <div className="mt-2 pt-2 border-t border-rose-500/20 text-[10px] text-rose-300/60">
                            💡 {result.hint}
                          </div>
                        )}
                      </div>
                    );
                  }
                } catch {
                  if (typeof node.result === 'string' && node.result.toLowerCase().includes('error')) {
                    return (
                      <div className="mt-3 text-[11px] text-rose-400 bg-rose-950/40 border border-rose-500/30 rounded-lg px-3 py-2 font-mono">
                        <div className="flex items-center gap-1.5 mb-1">
                          <X size={12} className="text-rose-500" />
                          <span className="font-semibold text-rose-300">Failed</span>
                        </div>
                        <div className="text-rose-300/90 break-words">
                          {node.result}
                        </div>
                      </div>
                    );
                  }
                }
                return null;
              })()}

              {isEditNode && !node.result && (
                <div className="mt-2.5">
                  <RealtimeEditCounter node={node} />
                </div>
              )}

              {isScriptNode && (
                <div className="flex items-center gap-2 mt-2.5">
                  <span className="text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 bg-zinc-950/80 dark:bg-zinc-900 border border-zinc-800 text-zinc-400 rounded-md font-mono flex items-center gap-1.5 shadow-xs">
                    <span className={`${effectiveStatus === 'active' ? 'bg-blue-400' : effectiveStatus === 'failed' ? 'bg-rose-400' : 'bg-emerald-400'} w-1.5 h-1.5 rounded-full inline-block`} />
                    SHELL EXECUTION
                  </span>
                </div>
              )}
            </div>
          )}
    </motion.div>
  );
});
