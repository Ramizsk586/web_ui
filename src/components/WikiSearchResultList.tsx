import React from 'react';
import { BookOpen, FileText, Globe, RefreshCcw, ArrowRight } from 'lucide-react';
import { WikiSearchResult } from '../services/wikiService';

interface WikiSearchResultListProps {
  results: WikiSearchResult[];
  onSelectPage: (pageId: number) => void;
  onGetSummary: (pageId: number) => void;
}

export const WikiSearchResultList: React.FC<WikiSearchResultListProps> = ({
  results,
  onSelectPage,
  onGetSummary,
}) => {
  if (!results || results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center bg-[#141110] border border-[#2D241E] rounded-2xl">
        <Globe size={28} className="text-zinc-650 mb-2 animate-pulse" />
        <p className="text-sm font-medium text-zinc-300">No results discovered</p>
        <p className="text-xs text-zinc-500 mt-1">Try adapting your search term or verifying language constraints.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3.5 w-full">
      <div className="flex items-center justify-between px-1 text-[11px] font-mono text-zinc-500 uppercase tracking-wider">
        <span>Search Index matches</span>
        <span>{results.length} records retrieved</span>
      </div>

      <div className="space-y-3">
        {results.map((result) => {
          // Format sizes
          const kbSize = (result.size / 1024).toFixed(1);
          
          return (
            <div 
              key={result.pageId}
              className="flex flex-col gap-3 bg-[#141110] border border-[#2D241E] hover:border-zinc-800/80 rounded-2xl p-4 transition-all hover:translate-y-[-1px] shadow-sm relative group"
            >
              {/* Highlight badge for hovered elements */}
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-transparent group-hover:bg-[#D97756] rounded-l-2xl transition-colors" />

              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <h4 className="font-semibold text-zinc-100 flex items-center gap-2 group-hover:text-[#D97756] transition-colors text-sm truncate">
                    {result.title}
                    <span className="text-[10px] font-mono text-zinc-600 font-normal shrink-0">
                      ID: {result.pageId}
                    </span>
                  </h4>
                  
                  {result.snippet_plain ? (
                    <p className="text-[12px] text-zinc-400 mt-1 leading-relaxed">
                      {result.snippet_plain}...
                    </p>
                  ) : (
                    <p className="text-[12px] text-zinc-500 italic mt-1">
                      No extract summary available. Click below to inspect.
                    </p>
                  )}
                  
                  {/* Metadata labels */}
                  <div className="flex items-center gap-3 mt-3 flex-wrap text-[10.5px] font-mono text-zinc-500">
                    <span className="bg-[#1C1816] px-2 py-0.5 rounded border border-[#2D241E]">
                      {result.wordcount.toLocaleString()} words
                    </span>
                    <span className="bg-[#1C1816] px-2 py-0.5 rounded border border-[#2D241E]">
                      {kbSize} KB
                    </span>
                    {result.timestamp && (
                      <span className="text-zinc-650 text-[10px]">
                        Last edited {new Date(result.timestamp).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Precise action blocks */}
              <div className="flex items-center gap-2 border-t border-[#2D241E]/40 pt-2.5 mt-1">
                <button 
                  onClick={() => onSelectPage(result.pageId)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-medium text-[11px] transition-all border border-emerald-500/20 active:scale-[0.98] cursor-pointer"
                >
                  <BookOpen size={12} />
                  Fetch Full Article
                </button>
                <button 
                  onClick={() => onGetSummary(result.pageId)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 font-medium text-[11px] transition-all border border-sky-500/20 active:scale-[0.98] cursor-pointer"
                >
                  <FileText size={12} />
                  Quick Summary
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
