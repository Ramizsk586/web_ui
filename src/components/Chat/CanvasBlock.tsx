import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface CanvasBlockProps {
  language: string;
  code: string;
  isStreaming?: boolean;
}

export const CanvasBlock = React.memo(({ language, code, isStreaming }: CanvasBlockProps) => {
  const [copied, setCopied] = useState(false);

  const normalizedLang = (language || 'text').toLowerCase();

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full max-w-full min-w-0 my-3 text-left">
      <div
        className={`w-full max-w-full min-w-0 rounded-xl border border-zinc-800 bg-[#121214] overflow-hidden shadow-xl transition-all duration-300 ${
          isStreaming ? 'ring-1 ring-blue-500/30 shadow-blue-500/10' : ''
        }`}
      >
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-[#1a1a1e] border-b border-zinc-800 text-[12px] font-mono select-none">
          <span className="text-zinc-400 font-medium tracking-wide">
            {normalizedLang}
          </span>
          <div className="flex items-center gap-3 text-zinc-400">
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer text-xs"
            >
              {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
              <span className={copied ? 'text-emerald-400' : ''}>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>

        {/* Code Content Container with Fixed Max Height and Scrollbars */}
        <div className="relative w-full max-w-full min-w-0 max-h-80 overflow-y-auto overflow-x-auto custom-scrollbar p-4 bg-[#0c0c0e]">
          {isStreaming && (
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/[0.03] to-blue-500/0 animate-pulse pointer-events-none z-10" />
          )}
          {typeof SyntaxHighlighter === 'function' ? (
            <SyntaxHighlighter
              language={normalizedLang}
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
  );
});
