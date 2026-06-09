import React from 'react';
import { motion } from 'motion/react';
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  Clock3,
  FileText,
  FolderTree,
  Image as ImageIcon,
  Link2,
  Search,
  Shapes,
  Sparkles,
} from 'lucide-react';
import { ToolCallNode } from '../types';
import {
  ProcessingAnimation,
  StreamIndicator,
  ToolCallingAnimation,
  WebSearchAnimation,
} from './ui/Animations';

interface WikiToolCallIndicatorProps {
  node: ToolCallNode;
}

type WikiToolVisual = {
  title: string;
  description: string;
  icon: React.ReactNode;
  activeAnimation: React.ReactNode;
  accent: {
    border: string;
    surface: string;
    iconWrap: string;
    iconColor: string;
    glow: string;
    progressTrack: string;
    progressFill: string;
    statusText: string;
  };
};

const WIKI_TOOL_VISUALS: Record<string, WikiToolVisual> = {
  wiki_search: {
    title: 'Wikipedia Search',
    description: 'Scanning encyclopedia results',
    icon: <Search size={15} />,
    activeAnimation: <WebSearchAnimation />,
    accent: {
      border: 'border-cyan-900/70',
      surface: 'bg-[linear-gradient(180deg,rgba(6,14,20,0.98)_0%,rgba(10,18,24,0.96)_100%)]',
      iconWrap: 'border-cyan-500/20 bg-cyan-500/10',
      iconColor: 'text-cyan-300',
      glow: 'from-cyan-500/12 via-sky-500/6 to-transparent',
      progressTrack: 'bg-cyan-950/70',
      progressFill: 'from-cyan-400 via-sky-400 to-emerald-300',
      statusText: 'text-cyan-200/80',
    },
  },
  wiki_get_page: {
    title: 'Wikipedia Page',
    description: 'Loading full article content',
    icon: <BookOpen size={15} />,
    activeAnimation: <ToolCallingAnimation />,
    accent: {
      border: 'border-amber-900/70',
      surface: 'bg-[linear-gradient(180deg,rgba(20,14,8,0.98)_0%,rgba(24,17,10,0.96)_100%)]',
      iconWrap: 'border-amber-500/20 bg-amber-500/10',
      iconColor: 'text-amber-300',
      glow: 'from-amber-500/12 via-orange-500/6 to-transparent',
      progressTrack: 'bg-amber-950/70',
      progressFill: 'from-amber-300 via-orange-400 to-yellow-200',
      statusText: 'text-amber-100/80',
    },
  },
  wiki_get_summary: {
    title: 'Wikipedia Summary',
    description: 'Condensing the key article overview',
    icon: <FileText size={15} />,
    activeAnimation: <ProcessingAnimation label="Summarizing" size="sm" />,
    accent: {
      border: 'border-violet-900/70',
      surface: 'bg-[linear-gradient(180deg,rgba(15,11,22,0.98)_0%,rgba(18,14,28,0.96)_100%)]',
      iconWrap: 'border-violet-500/20 bg-violet-500/10',
      iconColor: 'text-violet-300',
      glow: 'from-violet-500/12 via-fuchsia-500/6 to-transparent',
      progressTrack: 'bg-violet-950/70',
      progressFill: 'from-violet-300 via-fuchsia-400 to-indigo-300',
      statusText: 'text-violet-100/80',
    },
  },
  wiki_get_sections: {
    title: 'Wikipedia Sections',
    description: 'Mapping article structure and headings',
    icon: <FolderTree size={15} />,
    activeAnimation: <ProcessingAnimation label="Structuring" size="sm" />,
    accent: {
      border: 'border-emerald-900/70',
      surface: 'bg-[linear-gradient(180deg,rgba(8,17,14,0.98)_0%,rgba(10,20,17,0.96)_100%)]',
      iconWrap: 'border-emerald-500/20 bg-emerald-500/10',
      iconColor: 'text-emerald-300',
      glow: 'from-emerald-500/12 via-teal-500/6 to-transparent',
      progressTrack: 'bg-emerald-950/70',
      progressFill: 'from-emerald-300 via-teal-400 to-cyan-300',
      statusText: 'text-emerald-100/80',
    },
  },
  wiki_get_categories: {
    title: 'Wikipedia Categories',
    description: 'Classifying article taxonomy',
    icon: <Shapes size={15} />,
    activeAnimation: <ProcessingAnimation label="Classifying" size="sm" />,
    accent: {
      border: 'border-fuchsia-900/70',
      surface: 'bg-[linear-gradient(180deg,rgba(21,9,20,0.98)_0%,rgba(26,11,25,0.96)_100%)]',
      iconWrap: 'border-fuchsia-500/20 bg-fuchsia-500/10',
      iconColor: 'text-fuchsia-300',
      glow: 'from-fuchsia-500/12 via-pink-500/6 to-transparent',
      progressTrack: 'bg-fuchsia-950/70',
      progressFill: 'from-fuchsia-300 via-pink-400 to-rose-300',
      statusText: 'text-fuchsia-100/80',
    },
  },
  wiki_get_links: {
    title: 'Wikipedia Links',
    description: 'Tracing related internal references',
    icon: <Link2 size={15} />,
    activeAnimation: <ProcessingAnimation label="Linking" size="sm" />,
    accent: {
      border: 'border-blue-900/70',
      surface: 'bg-[linear-gradient(180deg,rgba(8,13,22,0.98)_0%,rgba(10,16,28,0.96)_100%)]',
      iconWrap: 'border-blue-500/20 bg-blue-500/10',
      iconColor: 'text-blue-300',
      glow: 'from-blue-500/12 via-indigo-500/6 to-transparent',
      progressTrack: 'bg-blue-950/70',
      progressFill: 'from-blue-300 via-indigo-400 to-cyan-300',
      statusText: 'text-blue-100/80',
    },
  },
  wiki_get_images: {
    title: 'Wikipedia Images',
    description: 'Collecting article media assets',
    icon: <ImageIcon size={15} />,
    activeAnimation: <ProcessingAnimation label="Gathering media" size="sm" />,
    accent: {
      border: 'border-rose-900/70',
      surface: 'bg-[linear-gradient(180deg,rgba(22,10,14,0.98)_0%,rgba(26,12,16,0.96)_100%)]',
      iconWrap: 'border-rose-500/20 bg-rose-500/10',
      iconColor: 'text-rose-300',
      glow: 'from-rose-500/12 via-orange-500/6 to-transparent',
      progressTrack: 'bg-rose-950/70',
      progressFill: 'from-rose-300 via-orange-400 to-amber-300',
      statusText: 'text-rose-100/80',
    },
  },
  wiki_get_related: {
    title: 'Wikipedia Related',
    description: 'Exploring connected topics',
    icon: <Sparkles size={15} />,
    activeAnimation: <ToolCallingAnimation />,
    accent: {
      border: 'border-orange-900/70',
      surface: 'bg-[linear-gradient(180deg,rgba(23,13,7,0.98)_0%,rgba(28,17,9,0.96)_100%)]',
      iconWrap: 'border-orange-500/20 bg-orange-500/10',
      iconColor: 'text-orange-300',
      glow: 'from-orange-500/12 via-amber-500/6 to-transparent',
      progressTrack: 'bg-orange-950/70',
      progressFill: 'from-orange-300 via-amber-400 to-yellow-300',
      statusText: 'text-orange-100/80',
    },
  },
};

const DEFAULT_VISUAL: WikiToolVisual = {
  title: 'Wikipedia Tool',
  description: 'Processing encyclopedia data',
  icon: <BookOpen size={15} />,
  activeAnimation: <ToolCallingAnimation />,
  accent: {
    border: 'border-zinc-800/80',
    surface: 'bg-[linear-gradient(180deg,rgba(18,18,18,0.98)_0%,rgba(14,14,14,0.96)_100%)]',
    iconWrap: 'border-zinc-700 bg-zinc-900/70',
    iconColor: 'text-zinc-200',
    glow: 'from-zinc-500/10 via-transparent to-transparent',
    progressTrack: 'bg-zinc-900',
    progressFill: 'from-zinc-400 via-zinc-300 to-zinc-200',
    statusText: 'text-zinc-300/80',
  },
};

const getToolVisual = (toolName?: string) => {
  const normalized = String(toolName || '').toLowerCase();
  return WIKI_TOOL_VISUALS[normalized] || DEFAULT_VISUAL;
};

const getStatusIcon = (status: ToolCallNode['status']) => {
  if (status === 'complete') {
    return <CheckCircle2 size={14} className="text-emerald-400" />;
  }
  if (status === 'failed') {
    return <AlertCircle size={14} className="text-rose-400" />;
  }
  return <Clock3 size={14} className="text-blue-400" />;
};

const getStatusCopy = (status: ToolCallNode['status'], description: string) => {
  if (status === 'complete') return 'Wikipedia step completed';
  if (status === 'failed') return 'Wikipedia step failed';
  if (status === 'pending') return 'Queued for execution';
  return description;
};

const getProgressWidth = (status: ToolCallNode['status']) => {
  if (status === 'complete') return '100%';
  if (status === 'failed') return '100%';
  if (status === 'pending') return '18%';
  return '72%';
};

export const WikiToolCallIndicator: React.FC<WikiToolCallIndicatorProps> = ({ node }) => {
  const { toolName, status, label, resultSummary, subNodes } = node;
  const visual = getToolVisual(toolName);
  const statusIcon = getStatusIcon(status);
  const progressWidth = getProgressWidth(status);
  const activeSubSteps = Array.isArray(subNodes) ? subNodes.length : 0;

  return (
    <div className={`relative overflow-hidden rounded-2xl border ${visual.accent.border} ${visual.accent.surface} p-3.5 text-left shadow-[0_18px_45px_rgba(0,0,0,0.22)]`}>
      <div className={`pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.05),transparent_26%)]`} />
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${visual.accent.glow}`} />

      <div className="relative flex items-start gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border ${visual.accent.iconWrap}`}>
          {status === 'active' ? (
            visual.activeAnimation
          ) : (
            <span className={visual.accent.iconColor}>{visual.icon}</span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-[10px] font-bold uppercase tracking-[0.24em] text-zinc-300/80">
              {visual.title}
            </span>
            {status === 'active' && <StreamIndicator color="cyan" />}
            <span className="ml-auto shrink-0">{statusIcon}</span>
          </div>

          <div className="mt-1 text-sm font-semibold text-zinc-100">
            {getStatusCopy(status, visual.description)}
          </div>

          <div className={`mt-1 text-[11px] ${visual.accent.statusText}`}>
            {resultSummary || label}
          </div>

          {activeSubSteps > 0 && (
            <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-white/8 bg-black/20 px-2.5 py-1 text-[10px] font-mono text-zinc-300/80">
              <span>{activeSubSteps} wiki step{activeSubSteps === 1 ? '' : 's'}</span>
              {status === 'active' && <StreamIndicator color="emerald" />}
            </div>
          )}
        </div>
      </div>

      <div className="relative mt-3">
        <div className={`h-2 overflow-hidden rounded-full ${visual.accent.progressTrack}`}>
          {status === 'active' ? (
            <motion.div
              animate={{ x: ['-38%', '108%'] }}
              transition={{ repeat: Infinity, duration: 1.45, ease: 'easeInOut' }}
              className={`h-full w-2/3 rounded-full bg-gradient-to-r ${visual.accent.progressFill} opacity-95`}
            />
          ) : (
            <div
              className={`h-full rounded-full bg-gradient-to-r ${status === 'failed' ? 'from-rose-400 via-orange-400 to-amber-300' : visual.accent.progressFill}`}
              style={{ width: progressWidth }}
            />
          )}
        </div>
      </div>
    </div>
  );
};
