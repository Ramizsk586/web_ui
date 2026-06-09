import React from 'react';
import { AlertCircle, BookOpen, CheckCircle2, Clock3, Search } from 'lucide-react';
import { ToolCallNode } from '../types';

interface WikiToolCallIndicatorProps {
  node: ToolCallNode;
}

export const WikiToolCallIndicator: React.FC<WikiToolCallIndicatorProps> = ({ node }) => {
  const { toolName, status, label, resultSummary } = node;

  const icon = toolName === 'wiki_search' ? <Search size={14} className="text-amber-400" /> : <BookOpen size={14} className="text-orange-400" />;
  const statusIcon = status === 'active'
    ? <Clock3 size={13} className="text-blue-400" />
    : status === 'complete'
      ? <CheckCircle2 size={13} className="text-emerald-400" />
      : <AlertCircle size={13} className="text-rose-400" />;

  return (
    <div className="rounded-xl border border-[#2D241E] bg-[#141110] p-3 text-left">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#2D241E] bg-[#1C1816]">
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-[11px] font-mono uppercase tracking-[0.16em] text-zinc-300">
              {toolName?.replace(/_/g, ' ')}
            </span>
            {statusIcon}
          </div>
          <div className="mt-1 text-sm text-zinc-400">
            {status === 'complete' ? 'Wikipedia request completed' : status === 'failed' ? 'Wikipedia request failed' : 'Reading Wikipedia'}
          </div>
        </div>
      </div>

      <div className="mt-3 rounded-lg border border-[#2D241E] bg-[#1C1816] p-2 text-[11px] text-zinc-400">
        {resultSummary || label}
      </div>
    </div>
  );
};
