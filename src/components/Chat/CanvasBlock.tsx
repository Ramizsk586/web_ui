import React, { useState } from 'react';
import { Loader2, Check, Copy } from 'lucide-react';
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
  const normalizedLanguage = (language || 'code').toLowerCase();

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={`w-full max-w-full min-w-0 border rounded-2xl overflow-hidden shadow-sm my-3 transition-all duration-300 text-left ${
        isStreaming
          ? 'ring-1 ring-blue-500/15 shadow-md shadow-blue-500/5'
          : ''
      }`}
      style={{
        background: 'var(--theme-surface-alt)',
        borderColor: isStreaming ? 'rgba(59,130,246,0.28)' : 'var(--theme-border)',
      }}
    >
      <div
        className="flex items-center justify-between gap-4 px-4 py-2.5 border-b transition-all duration-300 relative overflow-hidden"
        style={{
          background: isStreaming ? 'color-mix(in srgb, var(--theme-header-bg) 78%, #3b82f6 22%)' : 'var(--theme-header-bg)',
          borderColor: isStreaming ? 'rgba(59,130,246,0.22)' : 'var(--theme-border)',
        }}
      >
        {isStreaming && (
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/[0.04] to-blue-500/0 animate-pulse pointer-events-none" />
        )}
        <div className="flex items-center gap-2.5 z-10 min-w-0">
          <span
            className="text-[12px] font-medium tracking-[0.01em] font-mono lowercase"
            style={{ color: 'var(--theme-primary)' }}
          >
            {isStreaming && (
              <Loader2 size={12} className="animate-spin text-blue-300 inline mr-2" />
            )}
            {normalizedLanguage || 'code'}
          </span>
          {isStreaming && (
            <span className="text-[10px] text-blue-300/80 font-medium animate-pulse uppercase tracking-wider font-sans">
              Generating code...
            </span>
          )}
        </div>
        <div className="flex items-center z-10 shrink-0">
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[12px] font-medium transition-all cursor-pointer"
            style={{ color: copied ? '#86efac' : 'var(--theme-secondary)' }}
          >
            {copied ? <Check size={17} strokeWidth={1.8} /> : <Copy size={17} strokeWidth={1.8} />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>
      <AnimatePresence initial={false}>
        <motion.div
          initial={{ opacity: 0.96 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0.96 }}
          transition={{ duration: 0.18, ease: 'easeInOut' }}
          className="overflow-hidden"
        >
          <div
          className="w-full max-w-full min-w-0 overflow-x-auto px-4 py-3 custom-scrollbar"
            style={{ background: 'var(--theme-surface-alt)' }}
          >
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
        </motion.div>
      </AnimatePresence>
    </div>
  );
});
