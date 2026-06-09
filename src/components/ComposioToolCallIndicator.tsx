import React from 'react';
import { AlertCircle, CheckCircle2, Clock3 } from 'lucide-react';
import { ToolCallNode } from '../types';

interface ComposioToolCallIndicatorProps {
  node: ToolCallNode;
}

export const ComposioToolCallIndicator: React.FC<ComposioToolCallIndicatorProps> = ({ node }) => {
  const { toolName, status, label, resultSummary } = node;
  const argsMatch = label.match(/\(([^)]+)\)/)?.[1] || '';

  const statusIcon = status === 'active'
    ? <Clock3 size={14} className="text-blue-400" />
    : status === 'complete'
      ? <CheckCircle2 size={14} className="text-emerald-400" />
      : <AlertCircle size={14} className="text-rose-400" />;

  return (
    <div className="rounded-xl border border-zinc-800 bg-[#0f0f10] p-3 text-left">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900">
          {statusIcon}
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="rounded-md border border-zinc-700 bg-zinc-900 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.18em] text-zinc-300">
              Composio
            </span>
            <span className="truncate text-[11px] font-mono text-zinc-500">
              {toolName?.replace('composio_', '').replace(/_/g, ' ')}
            </span>
          </div>
          <div className="mt-1 text-sm text-zinc-200">
            {status === 'complete' ? 'Integration call completed' : status === 'failed' ? 'Integration call failed' : 'Calling integration'}
          </div>
        </div>
      </div>

      {argsMatch && (
        <pre className="mt-3 whitespace-pre-wrap rounded-lg border border-zinc-800 bg-zinc-950 p-2 text-[11px] text-zinc-400">
          {argsMatch}
        </pre>
      )}

      {resultSummary && (
        <div className="mt-3 rounded-lg border border-zinc-800 bg-zinc-950 p-2 text-[11px] text-zinc-400">
          {resultSummary}
        </div>
      )}
    </div>
  );
};
