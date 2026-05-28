import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Search, 
  BookOpen, 
  FileText, 
  Layers, 
  Library, 
  Link as LinkIcon, 
  Image as ImageIcon, 
  Compass, 
  Loader2,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { ToolCallNode } from '../types';

interface WikiToolCallIndicatorProps {
  node: ToolCallNode;
}

export const WikiToolCallIndicator: React.FC<WikiToolCallIndicatorProps> = ({ node }) => {
  const { toolName, status, label } = node;
  const [elapsed, setElapsed] = useState(0);
  const [pulseIndex, setPulseIndex] = useState(0);

  const isActive = status === 'active';
  const isComplete = status === 'complete';
  const isFailed = status === 'failed';

  // Extract params from label if possible
  const urlParam = label.match(/\(([^)]+)\)/)?.[1] || '';
  
  // Timer for active state
  useEffect(() => {
    let timerID: any;
    if (isActive) {
      const start = Date.now();
      timerID = setInterval(() => {
        setElapsed(Math.round((Date.now() - start) / 100) / 10);
      }, 100);
    }
    return () => clearInterval(timerID);
  }, [isActive]);

  // Subtle state rotation to simulate scraping stages
  useEffect(() => {
    let timerID: any;
    if (isActive) {
      timerID = setInterval(() => {
        setPulseIndex(p => (p + 1) % 4);
      }, 1200);
    }
    return () => clearInterval(timerID);
  }, [isActive]);

  const getWikiToolDetails = () => {
    const defaultDetails = {
      icon: <Search size={14} className="text-[#D97756]" />,
      activeLabel: 'Calling Wikipedia Endpoint...',
      completeLabel: 'Wikipedia request succeeded',
      stages: ['Connecting...', 'Querying API...', 'Parsing JSON...', 'Verifying data...']
    };

    if (!toolName) return defaultDetails;

    switch (toolName) {
      case 'wiki_search':
        return {
          icon: <Search size={14} className="text-amber-500" />,
          activeLabel: `Querying Wikipedia indexes for term...`,
          completeLabel: `Search completed`,
          stages: ['Connecting index server...', 'Translating query strings...', 'Scanning article headers...', 'Assembling scores...']
        };
      case 'wiki_get_page':
        return {
          icon: <BookOpen size={14} className="text-[#D97756]" />,
          activeLabel: `Extracting full text and elements...`,
          completeLabel: `Full page downloaded`,
          stages: ['Requesting Action API...', 'Downloading markup...', 'Isolating sections...', 'Collecting cross-references...']
        };
      case 'wiki_get_summary':
        return {
          icon: <FileText size={14} className="text-teal-400" />,
          activeLabel: `Gathering introduction excerpt...`,
          completeLabel: `Summary extracted`,
          stages: ['Reaching REST gateway...', 'Validating titles...', 'Caching thumbnail descriptors...', 'Rendering summary payload...']
        };
      case 'wiki_get_sections':
        return {
          icon: <Layers size={14} className="text-violet-400" />,
          activeLabel: `Scanning Table of Contents outline...`,
          completeLabel: `TOC outline resolved`,
          stages: ['Quizzing Action gateway...', 'Listing section fragments...', 'Mapping headers H1-H4...', 'Indexing anchors...']
        };
      case 'wiki_get_categories':
        return {
          icon: <Library size={14} className="text-emerald-400" />,
          activeLabel: `Scanning categories and indices...`,
          completeLabel: `Categories resolved`,
          stages: ['Fetching metadata trees...', 'Resolving parent headers...', 'Stripping maintenance tags...', 'Pruning links...']
        };
      case 'wiki_get_links':
        return {
          icon: <LinkIcon size={14} className="text-[#D97756]" />,
          activeLabel: `Tracing outbound internal links...`,
          completeLabel: `Wikilink index generated`,
          stages: ['Scanning text links...', 'De-duplicating tokens...', 'Validating anchors...', 'Constructing connections...']
        };
      case 'wiki_get_images':
        return {
          icon: <ImageIcon size={14} className="text-sky-400" />,
          activeLabel: `Resolving static media assets...`,
          completeLabel: `Static media items resolved`,
          stages: ['Fetching page images...', 'Filtering icons/SVGs...', 'Resolving high-res URLs...', 'Sizing dimensions...']
        };
      case 'wiki_get_related':
        return {
          icon: <Compass size={14} className="text-orange-400" />,
          activeLabel: `Traversing topic taxonomy graphs...`,
          completeLabel: `Discovered related content`,
          stages: ['Interpreting categories...', 'Discovering adjacent articles...', 'Randomizing results...', 'Sorting similarity ranks...']
        };
      default:
        return defaultDetails;
    }
  };

  const details = getWikiToolDetails();
  const currentStage = details.stages[pulseIndex];

  return (
    <div className="mt-2.5 w-full ml-7 max-w-2xl text-xs font-sans">
      <div className="border border-[#2D241E] bg-[#141110] rounded-xl p-3 shadow-lg flex flex-col gap-2 relative overflow-hidden">
        
        {/* Glow accent to highlight MCP tool performance */}
        {isActive && (
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#D97756]/5 rounded-full blur-xl pointer-events-none" />
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="shrink-0 p-1.5 rounded-lg bg-[#1C1816] border border-[#2D241E]">
              {isActive ? (
                <Loader2 size={13} className="text-[#D97756] animate-spin" />
              ) : isComplete ? (
                <CheckCircle2 size={13} className="text-teal-400" />
              ) : (
                <XCircle size={13} className="text-rose-500" />
              )}
            </span>
            <div className="flex flex-col">
              <span className="font-semibold text-zinc-100 uppercase tracking-widest font-mono text-[9.5px]">
                {toolName?.replace('_', ' ')} · {status.toUpperCase()}
              </span>
              <span className="text-[11px] text-zinc-400 mt-0.5">
                {isActive ? details.activeLabel : isComplete ? details.completeLabel : 'Tool execution failed'}
              </span>
            </div>
          </div>

          {/* Telemetry metadata block */}
          <div className="text-[10px] font-mono text-zinc-500 flex flex-col items-end">
            {isActive && (
              <span className="font-semibold text-zinc-400 animate-pulse">
                {elapsed.toFixed(1)}s elapsed
              </span>
            )}
            {!isActive && (
              <span className="text-zinc-600">
                Processed API CORS
              </span>
            )}
          </div>
        </div>

        {/* Dynamic active status loops */}
        {isActive && (
          <div className="mt-1 space-y-1.5 select-none pl-1">
            <div className="flex justify-between text-[10.5px]">
              <span className="text-[#D97756] font-mono font-medium flex items-center gap-1.5">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#D97756] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#D97756]"></span>
                </span>
                {currentStage}
              </span>
              <span className="text-zinc-600 font-mono">Stage {pulseIndex + 1}/4</span>
            </div>
            
            {/* Pulsing micro-meters */}
            <div className="w-full bg-[#1C1816] rounded-full h-1 overflow-hidden border border-[#2D241E]">
              <motion.div 
                className="bg-gradient-to-r from-[#D97756] to-amber-500 h-full"
                initial={{ width: '5%' }}
                animate={{ width: `${(pulseIndex + 1) * 25}%` }}
                transition={{ duration: 1.2, ease: 'easeInOut' }}
              />
            </div>
          </div>
        )}

        {/* Render short result telemetry snippet if available */}
        {isComplete && node.resultSummary && (
          <div className="mt-1 p-1.5 rounded bg-[#1C1816]/70 border border-[#2D241E]/40 font-mono text-[10.5px] text-zinc-400 leading-snug">
            {node.resultSummary}
          </div>
        )}
      </div>
    </div>
  );
};
