import React, { useEffect, useState } from 'react';
import { ToolCallNode } from '../../types';

export const getFileNameOnly = (path: string) => {
  if (!path) return 'file.ts';
  const parts = path.split('/');
  return parts[parts.length - 1];
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

interface RealtimeEditCounterProps {
  node: ToolCallNode;
}

export const RealtimeEditCounter = ({ node }: RealtimeEditCounterProps) => {
  const [added, setAdded] = useState(0);
  const [removed, setRemoved] = useState(0);
  const isEditing = node.status === 'active';
  const isComplete = node.status === 'complete';
  
  const targetAdded = node.addedCount ?? 45;
  const targetRemoved = node.removedCount ?? 8;

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

  const displayAdded = isEditing ? Math.max(1, added) : (node.addedCount ?? 0);
  const displayRemoved = isEditing ? Math.max(1, removed) : (node.removedCount ?? 0);

  return (
    <div className="flex items-center gap-2 mt-1 px-1 py-0.5 select-none font-sans flex-wrap ml-7">
      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700/50 font-mono text-[11px] text-zinc-650 dark:text-zinc-350">
        <span className="opacity-70">{getFileNameOnly(node.filePath || 'file.ts')}</span>
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
