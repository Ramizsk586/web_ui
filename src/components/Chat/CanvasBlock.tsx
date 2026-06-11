import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface CanvasBlockProps {
  language: string;
  code: string;
  isStreaming?: boolean;
}

export const CanvasBlock = React.memo(({ language, code, isStreaming }: CanvasBlockProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full max-w-full min-w-0 my-3 text-left">
      {/* Label: > ● canvas */}
      <div className="flex items-center gap-2 pl-1 mb-2 text-[12px] text-zinc-500 font-mono select-none">
        <span>{'>'}</span>
        <span className="relative flex items-center justify-center w-1.5 h-1.5">
          <span className="absolute inline-flex h-full w-full rounded-full bg-current opacity-40" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-current" />
        </span>
        <span>canvas</span>
      </div>
      <div
        className={`w-full max-w-full min-w-0 rounded-xl border border-zinc-200/15 dark:border-white/10 bg-[#0c0c0e] border-l-2 border-l-zinc-500 overflow-hidden shadow-2xl transition-all duration-300 ${
          isStreaming ? 'ring-1 ring-blue-500/30 shadow-blue-500/10' : ''
        }`}
      >
        <AnimatePresence initial={false}>
          <motion.div
            initial={{ opacity: 0.96 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0.96 }}
            transition={{ duration: 0.18, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="w-full max-w-full min-w-0 overflow-x-auto max-h-72 overflow-y-auto custom-scrollbar">
              <div className="relative">
                {isStreaming && (
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/[0.03] to-blue-500/0 animate-pulse pointer-events-none z-10" />
                )}
                <div className="px-4 py-3">
                  <div className="flex items-center justify-end mb-2 pr-1">
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
                    >
                      {copied ? <Check size={14} strokeWidth={1.8} /> : <Copy size={14} strokeWidth={1.8} />}
                      <span>{copied ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  {typeof SyntaxHighlighter === 'function' ? (
                    <SyntaxHighlighter
                      language={language}
                      style={oneDark as any}
                      customStyle={{
                        background: 'transparent',
                        backgroundColor: 'transparent',
                        fontSize: '13px',
                        lineHeight: '1.6',
                        margin: 0,
                        padding: 0,
                        border: 'none',
                        boxShadow: 'none',
                        textDecoration: 'none'
                      }}
                      codeTagProps={{
                        style: {
                          background: 'transparent',
                          backgroundColor: 'transparent',
                          border: 'none',
                          textDecoration: 'none',
                          boxShadow: 'none'
                        }
                      }}
                      showLineNumbers
                      lineNumberStyle={{
                        color: '#5d6169',
                        minWidth: '2.5em',
                        background: 'transparent',
                        backgroundColor: 'transparent',
                        paddingRight: '1em',
                        textAlign: 'right',
                        userSelect: 'none',
                        borderRight: 'none',
                        textDecoration: 'none'
                      }}
                    >
                      {code}
                    </SyntaxHighlighter>
                  ) : (
                    <pre className="text-gray-300 text-[13px] leading-relaxed font-mono whitespace-pre">
                      <code>{code}</code>
                    </pre>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
});
