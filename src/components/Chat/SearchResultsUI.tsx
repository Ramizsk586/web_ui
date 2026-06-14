import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown } from 'lucide-react';

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

export const SearchResultsUI = React.memo(({ query, sources, isSearching = false }: SearchResultsUIProps) => {
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    if (isSearching) {
      setIsOpen(true);
    }
  }, [isSearching]);

  return (
    <div className="px-1 w-full max-w-full overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-[12px] text-zinc-300 font-medium cursor-pointer mb-3 w-fit max-w-full"
      >
        <span>{isSearching ? 'Searching the web' : `Web search ${sources.length > 0 ? `(${sources.length})` : ''}`}</span>
        <ChevronDown
          size={12}
          className={`transition-transform duration-200 ${isOpen ? 'rotate-0' : '-rotate-90'}`}
        />
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeInOut' }}
            className="overflow-hidden w-full max-w-full"
          >
            <div className="border-l border-zinc-600/70 pl-4 ml-1 max-w-full">
              <div className="text-[13px] leading-7 text-zinc-400 whitespace-pre-wrap break-words">
                {isSearching
                  ? `Searching for: ${query}`
                  : `Searched for: ${query}`}
              </div>

              {sources.length > 0 && (
                <div className="mt-3 space-y-2">
                  {sources.map((source, i) => (
                    <motion.a
                      key={`${source.url}-${i}`}
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i * 0.04, 0.18), duration: 0.18 }}
                      className="flex items-center justify-between gap-3 py-1.5 text-left group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-4 h-4 rounded-sm border border-zinc-700 bg-zinc-900/70 flex items-center justify-center shrink-0 overflow-hidden">
                          {getFavicon(source.url) ? (
                            <img
                              src={getFavicon(source.url)!}
                              alt=""
                              className="w-3 h-3 object-contain"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
                          )}
                        </div>
                        <span className="text-[13px] text-zinc-200 break-words group-hover:text-white transition-colors">
                          {source.title || source.url}
                        </span>
                      </div>
                      <span className="text-[11px] text-zinc-500 font-mono shrink-0">
                        {getDomain(source.url)}
                      </span>
                    </motion.a>
                  ))}
                </div>
              )}
            </div>

            {isSearching && (
              <div className="mt-4 flex items-center gap-2 text-[12px] text-zinc-400">
                <span className="relative flex h-3 w-3 shrink-0">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-sky-400/40 animate-ping" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-sky-400" />
                </span>
                <span>Searching...</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
