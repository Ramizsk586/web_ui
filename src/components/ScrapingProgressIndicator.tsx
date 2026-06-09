import React from 'react';
import { AlertCircle, CheckCircle2, Clock3, Globe } from 'lucide-react';

interface ScrapingProgressIndicatorProps {
  status: 'pending' | 'active' | 'complete' | 'failed';
  url?: string;
}

export const ScrapingProgressIndicator: React.FC<ScrapingProgressIndicatorProps> = ({ status, url }) => {
  let cleanDomain = 'Target Host';
  if (url) {
    try {
      cleanDomain = new URL(url).hostname;
    } catch {}
  }

  const statusIcon = status === 'active'
    ? <Clock3 size={13} className="text-blue-400" />
    : status === 'complete'
      ? <CheckCircle2 size={13} className="text-emerald-400" />
      : status === 'failed'
        ? <AlertCircle size={13} className="text-rose-400" />
        : <Globe size={13} className="text-zinc-500" />;

  return (
    <div className="rounded-lg border border-[#2D241E]/50 bg-[#1C1816]/70 p-3 text-left text-xs font-mono text-zinc-300">
      <div className="flex items-center gap-2">
        <Globe size={13} className="text-[#D97756]" />
        <span className="truncate font-semibold text-zinc-400">{cleanDomain}</span>
        <span className="ml-auto">{statusIcon}</span>
      </div>
      <div className="mt-2 text-zinc-400">
        {status === 'complete' ? 'Page fetch completed' : status === 'failed' ? 'Page fetch failed' : status === 'active' ? 'Fetching page content' : 'Queued for fetch'}
      </div>
    </div>
  );
};
