import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Globe, ChevronDown } from 'lucide-react';

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

interface SearchResultsUIProps {
  query: string;
  sources: any[];
  isSearching?: boolean;
}

export const SearchResultsUI = React.memo(({ query, sources }: SearchResultsUIProps) => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="my-6 space-y-4">
      <div className="flex items-center justify-between text-[13px] font-medium text-zinc-500 dark:text-zinc-400 pl-1">
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-lg border shadow-xs bg-zinc-50 border-zinc-100 dark:bg-white/5 dark:border-white/10 text-blue-500">
            <Globe size={14} />
          </div>
          <div className="flex flex-col text-left">
            <span className="text-zinc-850 dark:text-zinc-200 font-semibold">{query}</span>
            <span className="text-[10px] text-zinc-400 dark:text-zinc-555 uppercase tracking-widest">{sources.length} sources found</span>
          </div>
        </div>

        {/* Collapsible Area Trigger named Web Source */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-zinc-200/50 dark:border-white/5 bg-zinc-50/50 dark:bg-zinc-900/30 hover:bg-zinc-100 dark:hover:bg-zinc-900/50 text-zinc-700 dark:text-zinc-300 cursor-pointer transition-all hover:border-zinc-300 dark:hover:border-white/10 shadow-3xs"
        >
          <span className="font-bold">Web Source</span>
          <motion.div
            animate={{ rotate: isOpen ? 0 : -90 }}
            transition={{ duration: 0.15 }}
            className="text-zinc-400"
          >
            <ChevronDown size={11} />
          </motion.div>
        </button>
      </div>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="bg-zinc-50/50 dark:bg-white/[0.02] border border-zinc-100 dark:border-white/5 rounded-2xl overflow-hidden shadow-sm mt-1">
              <div className="p-1 space-y-0.5 text-left">
                {sources.map((source, i) => (
                  <motion.a
                    key={i}
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center justify-between p-3 hover:bg-white dark:hover:bg-white/10 rounded-xl transition-all group cursor-pointer block"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-6 h-6 rounded-md bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-white/10 flex items-center justify-center p-1 shrink-0 bg-white/50 backdrop-blur-sm">
                        {getFavicon(source.url) ? (
                          <img src={getFavicon(source.url)!} alt="" className="w-full h-full object-contain filter dark:brightness-90 truncate" referrerPolicy="no-referrer" />
                        ) : (
                          <Globe size={12} className="text-zinc-400" />
                        )}
                      </div>
                      <span className="text-[13px] font-medium text-zinc-650 dark:text-zinc-350 group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate transition-colors underline-offset-2 group-hover:underline">
                        {source.title || source.url}
                      </span>
                    </div>
                    <span className="text-[11px] text-zinc-450 dark:text-zinc-500 font-mono tracking-tight shrink-0 pl-4 opacity-60 group-hover:opacity-100 transition-opacity">
                      {getDomain(source.url)}
                    </span>
                  </motion.a>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
