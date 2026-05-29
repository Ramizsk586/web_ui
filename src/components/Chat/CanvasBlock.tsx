import React, { useState } from 'react';
import { Loader2, Check, Copy } from 'lucide-react';
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
    <div className={`bg-[#0d0d0d] border rounded-2xl overflow-hidden shadow-xl my-4 transition-all duration-300 text-left ${isStreaming ? 'border-blue-500/30 ring-1 ring-blue-500/15 shadow-md shadow-blue-500/5' : 'border-white/8'}`}>
      <div className={`flex items-center justify-between px-4 py-2.5 border-b transition-all duration-300 relative overflow-hidden ${isStreaming ? 'bg-[#151a24] border-blue-500/20' : 'bg-[#161616] border-white/5'}`}>
        {isStreaming && (
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/[0.04] to-blue-500/0 animate-pulse pointer-events-none" />
        )}
        <div className="flex items-center gap-2.5 z-10">
          <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full flex items-center gap-1.5 font-sans">
            {isStreaming && (
              <Loader2 size={11} className="animate-spin text-blue-450" />
            )}
            {language || 'code'}
          </span>
          {isStreaming && (
            <span className="text-[10px] text-blue-400/80 font-medium animate-pulse uppercase tracking-wider font-sans">
              Generating code...
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all z-10 cursor-pointer ${
            copied
              ? 'text-emerald-400 bg-emerald-500/10'
              : 'text-gray-500 hover:text-white hover:bg-white/5'
          }`}
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <div className="overflow-x-auto p-5 custom-scrollbar">
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
              color: '#3f3f46', 
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
  );
});
