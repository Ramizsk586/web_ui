import React, { useMemo } from 'react';
import { CustomCodeBlockVisualizer, renderTextWithMath, InteractiveTableVisualizer } from '../LuminaVisualizer';
import { CanvasBlock } from './CanvasBlock';

export function useMarkdownComponents() {
  return useMemo(() => ({
    code({ className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || '');
      const codeStr = String(children).replace(/\n$/, '');
      const isMultiLine = codeStr.includes('\n');
      
      const isTreeStructure = (() => {
        const lines = codeStr.split('\n');
        let branches = 0;
        for (let i = 0; i < Math.min(lines.length, 15); i++) {
          const line = lines[i];
          if (line.includes('├──') || line.includes('└──') || line.includes('│  ') || line.includes('└──') || line.includes('║') || line.includes('╠══') || line.includes('╚══')) {
            branches++;
          }
        }
        return branches >= 1;
      })();

      if (isTreeStructure) {
        return (
          <CustomCodeBlockVisualizer
            language="tree"
            code={codeStr}
            defaultRender={<CanvasBlock language="tree" code={codeStr} />}
          />
        );
      }

      if (match) {
        return (
          <CustomCodeBlockVisualizer
            language={match[1]}
            code={codeStr}
            defaultRender={<CanvasBlock language={match[1]} code={codeStr} />}
          />
        );
      }

      if (isMultiLine) {
        return (
          <CanvasBlock 
            language="text" 
            code={codeStr} 
          />
        );
      }

      return (
        <code className="bg-white/10 px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
          {children}
        </code>
      );
    },
    p({ children, ...props }: any) {
      return (
        <p className="leading-relaxed my-2" {...props}>
          {renderTextWithMath(children)}
        </p>
      );
    },
    table({ children }: any) {
      return <InteractiveTableVisualizer>{children}</InteractiveTableVisualizer>;
    },
    img({ src, alt, ...props }: any) {
      return (
        <div className="my-4 overflow-hidden rounded-2xl border border-zinc-200/50 dark:border-white/5 bg-zinc-50 dark:bg-zinc-900/20 max-w-full sm:max-w-md shadow-xs group relative">
          <img 
            src={src} 
            alt={alt || 'AI Attached Visual'} 
            className="w-full h-auto object-cover max-h-[320px] hover:scale-[1.01] transition-transform duration-300 cursor-pointer" 
            referrerPolicy="no-referrer"
            onClick={() => {
              window.open(src, '_blank');
            }}
            {...props}
          />
          {alt && (
            <div className="px-4 py-2 bg-zinc-50 dark:bg-zinc-900/80 border-t border-zinc-150/40 dark:border-white/5 text-[11px] font-medium text-zinc-550 dark:text-zinc-400 select-none">
              {alt}
            </div>
          )}
        </div>
      );
    },
    a({ href, children, ...props }: any) {
      const isImgUrl = href && /\.(png|jpe?g|gif|webp|svg|bmp)(\?.*)?$/i.test(href);
      if (isImgUrl) {
        return (
          <div className="my-4 overflow-hidden rounded-2xl border border-zinc-200/50 dark:border-white/5 bg-zinc-50 dark:bg-zinc-900/20 max-w-full sm:max-w-md shadow-xs group relative">
            <img 
              src={href} 
              alt={String(children) || 'Attached Visual'} 
              className="w-full h-auto object-cover max-h-[320px] hover:scale-[1.01] transition-transform duration-300 cursor-pointer" 
              referrerPolicy="no-referrer"
              onClick={() => {
                window.open(href, '_blank');
              }}
            />
            <div className="px-4 py-2 bg-zinc-50 dark:bg-zinc-900/80 border-t border-zinc-150/40 dark:border-white/5 text-[11px] font-semibold text-blue-550 dark:text-blue-400 select-none flex items-center justify-between">
              <span className="truncate max-w-[80%]">{String(children) || 'Image Preview'}</span>
              <a href={href} target="_blank" rel="noreferrer" className="underline hover:text-blue-600 dark:hover:text-blue-300 text-[10px] uppercase font-bold tracking-wider">Source</a>
            </div>
          </div>
        );
      }
      return (
        <a 
          href={href} 
          target="_blank" 
          rel="noreferrer" 
          className="text-blue-550 dark:text-blue-400 hover:underline font-semibold" 
          {...props}
        >
          {children}
        </a>
      );
    }
  }), []);
}
