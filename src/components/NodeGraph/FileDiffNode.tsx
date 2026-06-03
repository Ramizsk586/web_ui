import React, { useEffect, useState } from 'react';
import { ToolCallNode } from '../../types';

export const getFileNameOnly = (path: string) => {
  if (!path) return 'file.ts';
  const parts = path.split('/');
  return parts[parts.length - 1];
};

export const normalizeDisplayPath = (pathValue: string) => {
  return String(pathValue || '')
    .replace(/\\/g, '/')
    .replace(/^[A-Za-z]:\/Project\/?/i, '')
    .replace(/^\/+/, '');
};

export const computeLineDiff = (oldContent: string, newContent: string) => {
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

type VisualDiffLine = {
  type: 'context' | 'addition' | 'deletion' | 'separator';
  oldLine?: number;
  newLine?: number;
  content: string;
};

const buildVisualDiff = (oldContent: string, newContent: string, contextSize = 2): VisualDiffLine[] => {
  const oldLines = oldContent ? oldContent.split('\n') : [];
  const newLines = newContent ? newContent.split('\n') : [];
  const maxLen = Math.max(oldLines.length, newLines.length);
  const changed = new Set<number>();

  for (let i = 0; i < maxLen; i++) {
    if ((oldLines[i] ?? '') !== (newLines[i] ?? '')) {
      for (let j = Math.max(0, i - contextSize); j <= Math.min(maxLen - 1, i + contextSize); j++) {
        changed.add(j);
      }
    }
  }

  const lines: VisualDiffLine[] = [];
  let previousIndex = -1;

  Array.from(changed).sort((a, b) => a - b).forEach(index => {
    if (previousIndex !== -1 && index > previousIndex + 1) {
      lines.push({ type: 'separator', content: '' });
    }

    const oldLine = oldLines[index];
    const newLine = newLines[index];

    if (oldLine === newLine) {
      lines.push({
        type: 'context',
        oldLine: index + 1,
        newLine: index + 1,
        content: oldLine ?? ''
      });
    } else {
      if (oldLine !== undefined && oldLine !== '') {
        lines.push({
          type: 'deletion',
          oldLine: index + 1,
          content: oldLine
        });
      }
      if (newLine !== undefined && newLine !== '') {
        lines.push({
          type: 'addition',
          newLine: index + 1,
          content: newLine
        });
      }
    }

    previousIndex = index;
  });

  if (lines.length === 0 && newContent) {
    return newContent.split('\n').slice(0, 8).map((line, index) => ({
      type: 'context',
      oldLine: index + 1,
      newLine: index + 1,
      content: line
    }));
  }

  return lines;
};

interface InlineFileDiffPreviewProps {
  node: ToolCallNode;
}

export const InlineFileDiffPreview = ({ node }: InlineFileDiffPreviewProps) => {
  const lines = buildVisualDiff(node.oldContent || '', node.newContent || '');
  const displayPath = normalizeDisplayPath(node.filePath || 'file');
  const fileName = getFileNameOnly(displayPath);
  const added = node.addedCount ?? 0;
  const removed = node.removedCount ?? 0;

  if (!node.oldContent && !node.newContent) {
    return null;
  }

  return (
    <div className="rounded-lg overflow-hidden border border-zinc-800 bg-[#151515] shadow-inner select-text">
      <div className="flex items-center justify-between px-3 py-2 bg-[#202020] border-b border-zinc-800">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[12px] font-semibold text-zinc-300 truncate">{fileName}</span>
          {added > 0 && <span className="text-[12px] font-bold text-emerald-400">+{added}</span>}
          {removed > 0 && <span className="text-[12px] font-bold text-rose-400">-{removed}</span>}
        </div>
      </div>

      <div className="max-h-72 overflow-y-auto custom-scrollbar font-mono text-[12px] leading-relaxed bg-[#101010]">
        {lines.map((line, index) => {
          if (line.type === 'separator') {
            return <div key={index} className="h-2 border-y border-zinc-800 bg-[#1b1b1b]" />;
          }

          const isAdd = line.type === 'addition';
          const isDelete = line.type === 'deletion';
          const bg = isAdd
            ? 'bg-emerald-950/45 text-emerald-100 border-l-4 border-emerald-400'
            : isDelete
              ? 'bg-rose-950/45 text-rose-100 border-l-4 border-rose-400'
              : 'bg-transparent text-zinc-300 border-l-4 border-transparent';

          return (
            <div key={index} className={`grid grid-cols-[48px_48px_1fr] min-w-0 ${bg}`}>
              <div className="text-right pr-3 py-0.5 text-zinc-500 select-none border-r border-zinc-800/80">
                {line.oldLine ?? ''}
              </div>
              <div className="text-right pr-3 py-0.5 text-zinc-500 select-none border-r border-zinc-800/80">
                {line.newLine ?? ''}
              </div>
              <pre className="pl-3 pr-2 py-0.5 whitespace-pre-wrap break-words font-mono">
                <span className={isAdd ? 'text-emerald-400 mr-2' : isDelete ? 'text-rose-400 mr-2' : 'text-zinc-600 mr-2'}>
                  {isAdd ? '+' : isDelete ? '-' : ' '}
                </span>
                {line.content}
              </pre>
            </div>
          );
        })}
      </div>
    </div>
  );
};

interface RealtimeEditCounterProps {
  node: ToolCallNode;
}

export const RealtimeEditCounter = ({ node }: RealtimeEditCounterProps) => {
  const [added, setAdded] = useState(0);
  const [removed, setRemoved] = useState(0);
  const isEditing = node.status === 'active';
  const isComplete = node.status === 'complete';
  
  const targetAdded = node.addedCount ?? 0;
  const targetRemoved = node.removedCount ?? 0;

  useEffect(() => {
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

  const displayAdded = isEditing ? added : (node.addedCount ?? 0);
  const displayRemoved = isEditing ? removed : (node.removedCount ?? 0);

  return (
    <div className="flex items-center gap-2 mt-1 px-1 py-0.5 select-none font-sans flex-wrap ml-7">
      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700/50 font-mono text-[11px] text-zinc-650 dark:text-zinc-350">
        <span className="opacity-70">{getFileNameOnly(normalizeDisplayPath(node.filePath || 'file.ts'))}</span>
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
