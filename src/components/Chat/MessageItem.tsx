import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  History, 
  Copy, 
  ArrowUp,
  Layout, 
  ImageIcon, 
  Play, 
  Download, 
  Code, 
  ChevronDown, 
  Check, 
  Loader2, 
  Trash2,
  Plus,
  FileText,
  MousePointerClick,
  ThumbsUp,
  ThumbsDown,
  RotateCcw,
  Volume2,
  VolumeX
} from 'lucide-react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Message, Artifact } from '../../types';
import { ScrapeResult } from '../../services/scrapingService';
import { CustomCodeBlockVisualizer, renderTextWithMath } from '../LuminaVisualizer';
import { NodeGraph, InlineToolCallCard } from '../NodeGraph/NodeGraph';
import { SearchResultsUI } from './SearchResultsUI';
import { CanvasBlock } from './CanvasBlock';
import { ArtifactCard } from './ArtifactCard';


interface SpeechStateListener {
  (speakingId: string | null): void;
}

class SpeechController {
  private activeId: string | null = null;
  private listeners: Set<SpeechStateListener> = new Set();
  private utterance: SpeechSynthesisUtterance | null = null;

  getActiveId() {
    return this.activeId;
  }

  speak(id: string, text: string) {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    if (this.activeId === id) {
      this.cancel();
      return;
    }

    this.cancel();

    this.activeId = id;
    this.notify();

    try {
      const u = new SpeechSynthesisUtterance(text);
      this.utterance = u;
      
      u.onend = () => {
        if (this.activeId === id) {
          this.activeId = null;
          this.utterance = null;
          this.notify();
        }
      };

      u.onerror = (e) => {
        console.warn('Speech error', e);
        if (this.activeId === id) {
          this.activeId = null;
          this.utterance = null;
          this.notify();
        }
      };

      window.speechSynthesis.speak(u);
    } catch (err) {
      console.error('Failed to speak', err);
      this.activeId = null;
      this.utterance = null;
      this.notify();
    }
  }

  cancel() {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    this.activeId = null;
    this.utterance = null;
    this.notify();
  }

  subscribe(listener: SpeechStateListener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach(l => l(this.activeId));
  }
}

const globalSpeechController = new SpeechController();
const EMPTY_SCRAPE_RESULTS = new Map<string, ScrapeResult>();
const EMPTY_WIKI_RESULTS = new Map<string, { wikiType: string, data: any }>();

function cleanMessageTextForSpeech(content: string): string {
  if (!content) return "";
  let text = content;

  // 1. Strip thinking blocks completely
  text = text.replace(/<think>[\s\S]*?<\/think>/gi, '');

  // 2. Strip XML/HTML tags, especially <artifact>
  text = text.replace(/<artifact[^>]*>[\s\S]*?<\/artifact>/gi, '');
  text = text.replace(/<[^>]*>/g, '');

  // 3. Strip code blocks completely
  text = text.replace(/```[a-zA-Z0-9-]*[\s\S]*?```/gi, '');

  // 3.5 Strip tool call placeholders completely
  text = text.replace(/\[\[tool_call:[^\]]+\]\]/g, '');

  // 4. Strip inline LaTeX blocks
  text = text.replace(/\$\$[\s\S]*?\$\$/g, '');
  text = text.replace(/\$[^\$]+\$/g, '');

  // 5. Clean images and links
  text = text.replace(/!\[[^\]]*\]\([^\)]*\)/g, ''); // strip images
  text = text.replace(/\[([^\]]+)\]\([^\)]*\)/g, '$1'); // keep link title

  // 6. Inline code backticks strip (keep the text)
  text = text.replace(/`([^`]+)`/g, '$1');

  // 7. Strip formatting characters
  text = text.replace(/[\*_~]+/g, '');

  // 8. Clean up tables
  text = text.replace(/^\|.*\|$/gm, '');
  text = text.replace(/\|/g, ' ');

  // 9. Clean up checklist brackets
  text = text.replace(/\[[ xX\-_]*\]/g, '');

  // 10. Clean up bullet points or numbered listings at start of lines
  text = text.replace(/^\s*[-*+]\s+/gm, '');
  text = text.replace(/^\s*\d+\.\s+/gm, '');

  // Clean trailing punctuation or extra whitespaces
  text = text.replace(/\n\s*\n+/g, '\n');
  text = text.trim();

  return text;
}


interface MessageItemProps {
  message: Message; 
  markdownComponents: any; 
  userProfile: any; 
  persona: any; 
  isSourcesPanelOpen: boolean; 
  setIsSourcesPanelOpen: (v: boolean) => void;
  setSourcesPanelMessageId: (v: string | null) => void;
  setActiveArtifact: (v: any) => void;
  setIsCanvasOpen: (v: boolean) => void;
  setCanvasView: (v: 'code' | 'preview') => void;
  onOpenInEditor?: (filePath: string) => void;
  showToast?: (v: string) => void;
  onUpdateTodoPlan?: (messageId: string, updatedPlan: any) => void;
  onUpdateMessage?: (messageId: string, updatedFields: Partial<Message>) => void;
  onStartBuilding?: (messageId: string) => void;
  scrapingResults?: Map<string, ScrapeResult>;
  wikiResults?: Map<string, { wikiType: string, data: any }>;
  onSendMessage?: (msg: string) => void;
}

function MessageItemComponent({ 
  message, 
  markdownComponents, 
  userProfile, 
  persona, 
  isSourcesPanelOpen, 
  setIsSourcesPanelOpen, 
  setSourcesPanelMessageId,
  setActiveArtifact, 
  setIsCanvasOpen, 
  setCanvasView,
  onOpenInEditor,
  showToast,
  onUpdateTodoPlan,
  onUpdateMessage,
  onStartBuilding,
  scrapingResults = EMPTY_SCRAPE_RESULTS,
  wikiResults = EMPTY_WIKI_RESULTS,
  onSendMessage
}: MessageItemProps) {
  const [copied, setCopied] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [textAnswer, setTextAnswer] = useState("");
  const [isPlayingSpeech, setIsPlayingSpeech] = useState(false);
  const [feedback, setFeedback] = useState<'like' | 'dislike' | null>(null);

  useEffect(() => {
    setIsPlayingSpeech(globalSpeechController.getActiveId() === message.id);
    return globalSpeechController.subscribe((activeId) => {
      setIsPlayingSpeech(activeId === message.id);
    });
  }, [message.id]);

  useEffect(() => {
    return () => {
      if (globalSpeechController.getActiveId() === message.id) {
        globalSpeechController.cancel();
      }
    };
  }, [message.id]);

  const nonInlineToolCalls = useMemo(() => {
    if (!message.toolCalls) return [];
    return message.toolCalls.filter(node => !message.content?.includes(`[[tool_call:${node.id}]]`));
  }, [message.toolCalls, message.content]);

  const renderInlineContent = (content: string, isStreaming: boolean) => {
    if (!content) return null;
    const parts = content.split(/(\[\[tool_call:[a-zA-Z0-9_-]+\]\])/g);
    const isLastPartToolCall = parts.length > 0 && !!parts[parts.length - 1].match(/^\[\[tool_call:[a-zA-Z0-9_-]+\]\]$/);
    
    return (
      <>
        {parts.map((part, idx) => {
          const match = part.match(/^\[\[tool_call:([a-zA-Z0-9_-]+)\]\]$/);
          if (match) {
            const toolCallId = match[1];
            const node = message.toolCalls?.find(n => n.id === toolCallId);
            if (!node) {
              return (
                <div key={idx} className="my-2 p-3 border border-zinc-200/10 dark:border-zinc-800/50 bg-zinc-550/[0.03] dark:bg-zinc-950/20 rounded-xl flex items-center gap-2">
                  <Loader2 size={12} className="animate-spin text-emerald-500" />
                  <span className="text-xs text-zinc-550 font-mono">Initializing tool execution...</span>
                </div>
              );
            }
            
            return (
              <div key={idx} className="my-3 w-full">
                <InlineToolCallCard 
                  node={node}
                  scrapingResults={scrapingResults}
                  wikiResults={wikiResults}
                  onSendMessage={onSendMessage}
                />
              </div>
            );
          }
          
          if (!part.trim()) return null;
          
          const isLastPart = idx === parts.length - 1;
          
          return (
            <span key={idx} className="block text-left">
              <Markdown 
                remarkPlugins={[remarkGfm]} 
                components={messageComponents}
              >
                {part}
              </Markdown>
              {isStreaming && isLastPart && !isLastPartToolCall && (
                <motion.span
                  animate={{ opacity: [1, 0] }}
                  transition={{ repeat: Infinity, duration: 0.6 }}
                  className="inline-block w-1.5 h-4 bg-current ml-0.5 rounded-sm align-middle"
                />
              )}
            </span>
          );
        })}
        {isStreaming && isLastPartToolCall && (
          <motion.span
            animate={{ opacity: [1, 0] }}
            transition={{ repeat: Infinity, duration: 0.6 }}
            className="inline-block w-1.5 h-4 bg-current ml-0.5 rounded-sm align-middle mt-1"
          />
        )}
      </>
    );
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const messageComponents = useMemo(() => {
    return {
      ...markdownComponents,
      a({ href, children, ...props }: any) {
        const isImgUrl = href && /\.(png|jpe?g|gif|webp|svg|bmp)(\?.*)?$/i.test(href);
        if (isImgUrl) {
          return markdownComponents.a({ href, children, ...props });
        }
        
        const childText = String(children || '').trim();
        const hrefMatches = href ? href.match(/\d+/) : null;
        const isHrefCitation = href && /^[#\d\s\[\]\(\)]+$/.test(href) && hrefMatches;
        const isChildCitation = /^\d+$/.test(childText) || /^\[\d+\]$/.test(childText) || /^\(\d+\)$/.test(childText) || childText === '.' || childText === 'source' || childText === '' || childText === '[.]';

        if (isHrefCitation || isChildCitation) {
          let numStr = '';
          if (isHrefCitation && hrefMatches) {
            numStr = hrefMatches[0];
          } else {
            const childMatches = childText.match(/\d+/);
            if (childMatches) {
              numStr = childMatches[0];
            } else if (hrefMatches) {
              numStr = hrefMatches[0];
            }
          }
          
          const num = numStr ? parseInt(numStr, 10) : NaN;
          
          if (!isNaN(num) && num > 0) {
            let resolvedHref = href;
            let siteTitle = '';
            
            if (message.sources && message.sources.length > 0 && num <= message.sources.length) {
              const matchedSource = message.sources[num - 1];
              if (matchedSource && matchedSource.url) {
                resolvedHref = matchedSource.url;
                siteTitle = matchedSource.title || matchedSource.url;
              }
            } else if (href && message.sources && message.sources.length > 0) {
              const foundSource = message.sources.find((s: any) => s.url === href);
              if (foundSource) {
                siteTitle = foundSource.title || foundSource.url;
              }
            }
            
            const isPlaceholderText = isChildCitation;
            const displayChildren = isPlaceholderText ? `[${num}]` : children;

            const isValidWebUrl = resolvedHref && /^https?:\/\//i.test(resolvedHref);
            if (!isValidWebUrl && href && !href.startsWith('http')) {
              resolvedHref = '#';
            }

            return (
              <a
                href={resolvedHref}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 font-bold hover:underline mx-0.5 cursor-pointer inline"
                title={siteTitle || (resolvedHref !== '#' ? resolvedHref : undefined)}
                {...props}
              >
                {displayChildren}
              </a>
            );
          }
        }
        
        return markdownComponents.a({ href, children, ...props });
      },
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
          return React.createElement(CustomCodeBlockVisualizer, {
            language: "tree",
            code: codeStr,
            defaultRender: React.createElement(CanvasBlock, {
              language: "tree",
              code: codeStr,
              isStreaming: message.isStreaming
            })
          });
        }

        if (match) {
          return React.createElement(CustomCodeBlockVisualizer, {
            language: match[1],
            code: codeStr,
            defaultRender: React.createElement(CanvasBlock, {
              language: match[1],
              code: codeStr,
              isStreaming: message.isStreaming
            })
          });
        }

        if (isMultiLine) {
          return React.createElement(CanvasBlock, {
            language: "text",
            code: codeStr,
            isStreaming: message.isStreaming
          });
        }

        return (
          <code className="bg-white/10 px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
            {children}
          </code>
        );
      },
      p({ children, ...props }: any) {
        return (
          <p className="leading-relaxed my-2 text-left" {...props}>
            {renderTextWithMath(children, message.sources)}
          </p>
        );
      },
      li({ children, ...props }: any) {
        return (
          <li className="leading-relaxed my-1 text-left" {...props}>
            {renderTextWithMath(children, message.sources)}
          </li>
        );
      },
      h1({ children, ...props }: any) {
        return <h1 className="text-2xl font-bold my-4 text-left font-sans" {...props}>{renderTextWithMath(children, message.sources)}</h1>;
      },
      h2({ children, ...props }: any) {
        return <h2 className="text-xl font-bold my-3 text-left font-sans" {...props}>{renderTextWithMath(children, message.sources)}</h2>;
      },
      h3({ children, ...props }: any) {
        return <h3 className="text-lg font-bold my-2 text-left font-sans" {...props}>{renderTextWithMath(children, message.sources)}</h3>;
      },
      h4({ children, ...props }: any) {
        return <h4 className="text-base font-bold my-2 text-left font-sans" {...props}>{renderTextWithMath(children, message.sources)}</h4>;
      },
      blockquote({ children, ...props }: any) {
        return (
          <blockquote className="border-l-4 border-zinc-200 dark:border-white/10 pl-4 my-2 italic text-zinc-650 dark:text-zinc-450 text-left font-mono" {...props}>
            {renderTextWithMath(children, message.sources)}
          </blockquote>
        );
      }
    };
  }, [markdownComponents, message.sources, message.isStreaming]);

  return (
    <motion.div
      layout
      className={`flex flex-col w-full ${message.role === 'user' ? 'items-end mb-8' : 'items-start mb-12'}`}
    >
      {message.role === 'user' ? (
        <motion.div className="flex flex-col max-w-[85%] items-end">
          <div className="user-message-bubble px-5 py-3 rounded-2xl text-[15px] leading-relaxed shadow-sm bg-zinc-50 dark:bg-[var(--theme-surface-alt)] text-gray-800 dark:text-[var(--theme-primary)] rounded-tr-none border border-zinc-200/50 dark:border-[var(--theme-border)]">
            <div className="markdown-body text-left">
              <Markdown remarkPlugins={[remarkGfm]} components={messageComponents}>{message.content}</Markdown>
            </div>
            {message.images && message.images.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {message.images.map((img, idx) => (
                  <div 
                    key={idx}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface-alt)] text-[var(--theme-primary)] hover:bg-zinc-800/50 transition-all max-w-[215px] h-12 shadow-sm cursor-pointer"
                    onClick={() => {
                      if (typeof (window as any).openImageLightbox === 'function') {
                        (window as any).openImageLightbox(img.url, img.title);
                      }
                    }}
                  >
                    <div className="w-8 h-8 bg-zinc-800 border border-[var(--theme-border)] rounded-lg overflow-hidden shrink-0">
                      <img 
                        src={img.url} 
                        alt={img.title}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="flex-1 min-w-0 pr-1 flex flex-col justify-center text-left">
                      <div className="truncate font-semibold text-xs text-zinc-100 leading-none">
                        {img.title || 'Image'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {(message as any).elementAttachments && (message as any).elementAttachments.length > 0 && (
            <div className="flex flex-col gap-3 w-full mt-3">
              {(message as any).elementAttachments.map((att: any) => (
                <div
                  key={att.id}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onOpenInEditor?.(att.filePath);
                    showToast?.(`Opening ${att.fileName} in code editor...`);
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onOpenInEditor?.(att.filePath);
                    showToast?.(`Opening ${att.fileName} in code editor...`);
                  }}
                  className="group relative bg-[#1E1917] border border-[#2D241E] p-4 rounded-xl shadow-xl hover:border-teal-500/30 hover:shadow-[0_4px_30px_rgba(20,184,166,0.06)] transition-all flex flex-col gap-3.5 select-none w-full text-left"
                  title="Click or right-click to open in Editor"
                >
                  <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.2 bg-zinc-900 border border-teal-500/30 text-teal-400 text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full shadow-sm">
                    <Code size={11} />
                    <span>Click / Right-click to Edit</span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
                      <MousePointerClick size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider leading-none">Source File</div>
                      <div className="text-sm font-semibold text-zinc-150 leading-none mt-1.5 truncate">
                        {att.fileName}
                      </div>
                      {(att.lineNumber || att.lineRangeStart) && (
                        <div className="text-[10px] text-teal-400 font-mono mt-1">
                          {att.lineRangeStart && att.lineRangeEnd && att.lineRangeStart !== att.lineRangeEnd
                            ? `Lines ${att.lineRangeStart}-${att.lineRangeEnd}`
                            : `Line ${att.lineNumber || att.lineRangeStart}`}
                        </div>
                      )}
                    </div>
                  </div>

                  {att.elementWork && (
                    <div className="bg-[#171412] border border-[#231E1B] rounded-lg px-3 py-2 text-xs text-zinc-400">
                      <span className="font-semibold text-zinc-350 mr-1.5 uppercase text-[9px] tracking-wider text-teal-400 block mb-1">Functional Description</span>
                      {att.elementWork}
                    </div>
                  )}

                  {att.specificCode && (
                    <div 
                      onClick={(e) => e.stopPropagation()}
                      className="flex flex-col rounded-lg border border-[#2D241E] bg-[#14110F] overflow-hidden leading-relaxed font-mono"
                    >
                      <div className="bg-[#1C1816] px-3 py-1.5 border-b border-[#2D241E] flex items-center justify-between select-none">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Code Segment</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenInEditor?.(att.filePath);
                          }}
                          className="text-teal-400 hover:text-teal-300 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer bg-transparent border-none outline-none"
                        >
                          <Code size={11} />
                          Open Code
                        </button>
                      </div>
                      <pre className="max-h-56 overflow-y-auto p-3 text-xs text-zinc-350 custom-scrollbar whitespace-pre-wrap word-break tab-4 font-mono select-text leading-tight bg-[#0f0d0c]">
                        {att.specificCode}
                      </pre>
                    </div>
                  )}

                  {att.connections && att.connections.length > 0 && (
                    <div 
                      onClick={(e) => e.stopPropagation()}
                      className="flex flex-col gap-1.5"
                    >
                      <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">File Connections</span>
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {att.connections.map((c: any, index: number) => (
                          <button
                            key={index}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenInEditor?.(c.filePath || c.name || '');
                            }}
                            className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-900 border border-[#2D241E] hover:border-teal-500/40 text-xs text-zinc-400 hover:text-teal-400 rounded-lg transition-all cursor-pointer font-sans"
                            title={`Open ${c.fileName} in editor`}
                          >
                            <FileText size={11} className="text-zinc-650 shrink-0" />
                            <span className="font-semibold truncate">{c.fileName}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="mt-2 text-[10px] text-gray-400 px-1 font-medium uppercase tracking-tight flex items-center gap-2">
            {userProfile.avatar && (
              <img src={userProfile.avatar} alt="" className="w-3 h-3 rounded-full object-cover grayscale opacity-60" referrerPolicy="no-referrer" />
            )}
            {userProfile.name} • {message.timestamp?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </motion.div>
      ) : (
        <motion.div layout={message.isStreaming ? "position" : false} className="w-full space-y-4 max-w-4xl xl:max-w-[1100px]">
          {((nonInlineToolCalls && nonInlineToolCalls.length > 0) || (message.thinkContent !== undefined && message.thinkContent.length > 0) || message.searchQuery || message.isSearching) && (
            <NodeGraph 
              nodes={nonInlineToolCalls} 
              isStreaming={message.isStreaming} 
              thinkContent={message.thinkContent}
              isStreamingThinking={message.isThinking}
              isSearching={message.isSearching}
              searchQuery={message.searchQuery}
              sources={message.sources || []}
              scrapingResults={scrapingResults}
              wikiResults={wikiResults}
              onSendMessage={onSendMessage}
            />
          )}
          {message.searchQuery && (
            <SearchResultsUI 
              query={message.searchQuery} 
              sources={message.sources || []} 
            />
          )}
          <div className="markdown-body prose-lg max-w-none px-1" style={{ minHeight: message.isStreaming ? '1.5rem' : undefined, paddingLeft: '-1px' }}>
            {message.content ? (
              renderInlineContent(message.content, message.isStreaming ?? false)
            ) : message.isStreaming ? (
              <span className="text-zinc-400 animate-pulse text-left block">Generating...</span>
            ) : null}
          </div>


          {/* Custom Interactive Ask AI Clarifying Questions (rendered inline in Chat bubble) */}
          {message.askAiQuestions && message.askAiQuestions.length > 0 && message.isAskAiActive ? (() => {
            const questionsList = message.askAiQuestions;
            const activeIndex = message.currentQuestionIndex ?? 0;
            const currentAnswers = message.askAiAnswers ?? {};
            const activeQuestion = questionsList[activeIndex >= questionsList.length ? questionsList.length - 1 : activeIndex];

            if (!activeQuestion) return null;

            const handleSelectOption = (option: string) => {
              const nextAnswers = { ...currentAnswers, [activeQuestion.question]: option };
              const nextIndex = activeIndex + 1;
              
              if (nextIndex >= questionsList.length) {
                submitAnswers(nextAnswers);
              } else {
                onUpdateMessage?.(message.id, {
                  currentQuestionIndex: nextIndex,
                  askAiAnswers: nextAnswers
                });
              }
            };

            const handleToggleMultiChoice = (option: string) => {
              const prevArr = Array.isArray(currentAnswers[activeQuestion.question]) 
                ? currentAnswers[activeQuestion.question] 
                : [];
              const nextArr = prevArr.includes(option)
                ? prevArr.filter((x: string) => x !== option)
                : [...prevArr, option];
              
              const nextAnswers = { ...currentAnswers, [activeQuestion.question]: nextArr };
              onUpdateMessage?.(message.id, {
                askAiAnswers: nextAnswers
              });
            };

            const handleNextMultiChoice = () => {
              const nextIndex = activeIndex + 1;
              if (nextIndex >= questionsList.length) {
                submitAnswers(currentAnswers);
              } else {
                onUpdateMessage?.(message.id, {
                  currentQuestionIndex: nextIndex
                });
              }
            };

            const submitAnswers = (finalAnswers: Record<string, any>) => {
              const formattedAnswers = Object.entries(finalAnswers)
                .map(([q, a]) => `- **${q}**: ${Array.isArray(a) ? a.join(', ') : a}`)
                .join('\n');
              
              const finalMsg = `Here are my answers to your clarifying questions:\n${formattedAnswers}`;
              
              onUpdateMessage?.(message.id, {
                isAskAiActive: false,
                askAiAnswers: finalAnswers
              });

              if (onSendMessage) {
                onSendMessage(finalMsg);
              }
            };

            const handleSkipQuestion = () => {
              const nextAnswers = { ...currentAnswers, [activeQuestion.question]: "No preference" };
              const nextIndex = activeIndex + 1;
              if (nextIndex >= questionsList.length) {
                submitAnswers(nextAnswers);
              } else {
                onUpdateMessage?.(message.id, {
                  currentQuestionIndex: nextIndex,
                  askAiAnswers: nextAnswers
                });
              }
            };

            const handleSkipAll = () => {
              const nextAnswers = { ...currentAnswers };
              questionsList.forEach(q => {
                if (nextAnswers[q.question] === undefined) {
                  nextAnswers[q.question] = "No preference";
                }
              });
              submitAnswers(nextAnswers);
            };

            return (
              <div id={`inline-refinement-poll-${message.id}`} className="w-full bg-[#1b1918] border border-zinc-800 rounded-2xl p-5 shadow-2xl flex flex-col gap-4 mt-4 text-left font-sans select-none overflow-hidden relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full blur-3xl pointer-events-none" />
                
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-orange-550 text-sm">✦</span>
                    <h3 className="text-xs font-bold tracking-tight text-white uppercase font-mono">Workspace Refinement Assistance</h3>
                  </div>
                  <span className="text-[10px] bg-orange-500/10 text-orange-400 border border-orange-500/20 px-2 py-0.5 rounded-full font-bold select-none font-mono">
                    Question {activeIndex + 1} of {questionsList.length}
                  </span>
                </div>

                <div className="flex flex-col gap-1 text-left">
                  {activeQuestion.purpose && (
                    <span className="text-[10px] text-zinc-550 font-bold uppercase tracking-wider leading-none block mb-1">
                      Purpose: {activeQuestion.purpose}
                    </span>
                  )}
                  <h4 className="text-sm font-semibold text-zinc-200 leading-relaxed">
                    {activeQuestion.question}
                  </h4>
                </div>

                {/* Choices Rendering */}
                {activeQuestion.type === 'single_choice' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                    {activeQuestion.options?.map((opt, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleSelectOption(opt)}
                        className="flex items-center justify-between px-3.5 py-3 rounded-xl border border-zinc-800 bg-[#141211] hover:border-orange-500/40 hover:bg-orange-500/5 text-xs text-left text-zinc-350 font-semibold hover:text-white transition-all duration-200 cursor-pointer"
                      >
                        <span>{opt}</span>
                        <span className="text-zinc-600 group-hover:text-orange-400 text-[10px] font-mono">Choice {i+1}</span>
                      </button>
                    ))}
                  </div>
                )}

                {activeQuestion.type === 'confirm' && (
                  <div className="flex gap-2.5 mt-1">
                    <button
                      type="button"
                      onClick={() => handleSelectOption("Yes")}
                      className="flex-1 px-4 py-3 rounded-xl border border-zinc-800 bg-[#141211] hover:border-emerald-500 hover:bg-emerald-500/5 text-xs text-center text-zinc-350 font-bold hover:text-white transition-all cursor-pointer font-sans"
                    >
                      Yes, absolutely
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectOption("No")}
                      className="flex-1 px-4 py-3 rounded-xl border border-zinc-800 bg-[#141211] hover:border-rose-500 hover:bg-rose-500/5 text-xs text-center text-zinc-350 font-bold hover:text-white transition-all cursor-pointer font-sans"
                    >
                      No, prefer not
                    </button>
                  </div>
                )}

                {activeQuestion.type === 'multi_choice' && (
                  <div className="flex flex-col gap-1.5 mt-1">
                    {activeQuestion.options?.map((opt, i) => {
                      const isSelected = Array.isArray(currentAnswers[activeQuestion.question]) && currentAnswers[activeQuestion.question].includes(opt);
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handleToggleMultiChoice(opt)}
                          className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-all text-xs text-left font-medium cursor-pointer ${
                            isSelected
                              ? 'border-orange-500/50 bg-orange-500/5 text-white'
                              : 'border-zinc-805 bg-[#141211] text-zinc-350 hover:border-zinc-700'
                          }`}
                        >
                          <div className={`w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 ${
                            isSelected ? 'bg-orange-500 text-black' : 'border border-zinc-700 bg-transparent'
                          }`}>
                            {isSelected && <Check size={10} strokeWidth={3} />}
                          </div>
                          <span className="flex-1">{opt}</span>
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={handleNextMultiChoice}
                      className="mt-2 w-full px-4 py-2.5 rounded-xl bg-orange-550 hover:bg-orange-600 text-xs text-center font-bold text-black border border-orange-600 transition-all cursor-pointer font-sans"
                    >
                      Confirm Selection ({Array.isArray(currentAnswers[activeQuestion.question]) ? currentAnswers[activeQuestion.question].length : 0} selected)
                    </button>
                  </div>
                )}

                {(activeQuestion.type === 'text_input' || activeQuestion.type === 'scale') && (
                  <div className="flex flex-col gap-2.5 mt-1">
                    <textarea
                      value={textAnswer}
                      onChange={(e) => setTextAnswer(e.target.value)}
                      placeholder={activeQuestion.type === 'scale' ? "Enter a score or explain..." : "Construct your customized answer here..."}
                      className="w-full bg-[#141211] border border-zinc-850 hover:border-zinc-750 focus:border-orange-500/40 rounded-xl p-3 text-xs text-white outline-none placeholder-zinc-700 transition-all font-sans min-h-[75px] resize-none"
                    />
                    <button
                      type="button"
                      disabled={!textAnswer.trim()}
                      onClick={() => {
                        const answerVal = textAnswer.trim();
                        setTextAnswer("");
                        handleSelectOption(answerVal);
                      }}
                      className="px-4 py-2 bg-orange-550 hover:bg-orange-600 font-bold text-black border border-orange-600 text-xs rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer max-w-[150px] self-end font-sans"
                    >
                      Submit Answer
                    </button>
                  </div>
                )}

                <div className="flex items-center justify-between border-t border-zinc-850 pt-3.5 mt-2 gap-4 select-none">
                  <button
                    type="button"
                    onClick={handleSkipQuestion}
                    className="text-[10px] text-zinc-500 hover:text-zinc-350 cursor-pointer underline bg-transparent border-none font-medium font-mono"
                  >
                    Skip Question
                  </button>
                  <button
                    type="button"
                    onClick={handleSkipAll}
                    className="text-[10px] text-zinc-500 hover:text-zinc-350 cursor-pointer hover:underline bg-transparent border-none font-medium font-mono"
                  >
                    Skip remainder ({questionsList.length - activeIndex} left)
                  </button>
                </div>
              </div>
            );
          })() : null}

          {/* Render Completed Quiz state summarized nicely */}
          {message.askAiQuestions && message.askAiQuestions.length > 0 && !message.isAskAiActive && message.askAiAnswers && Object.keys(message.askAiAnswers).length > 0 && (
            <div className="w-full bg-[#151312] border border-emerald-500/10 rounded-2xl p-4 mt-4 flex items-start gap-3 text-left font-sans text-xs select-none">
              <div className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-450 shrink-0 mt-0.5">
                <Check size={11} strokeWidth={3} />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-zinc-250">Creative choices clarified:</h4>
                <div className="mt-1.5 space-y-1 text-[11px] text-zinc-450 font-mono">
                  {Object.entries(message.askAiAnswers).map(([q, ans], idx) => (
                    <div key={idx} className="flex gap-2">
                      <span className="text-zinc-605 shrink-0">•</span>
                      <span>
                        <span className="text-zinc-450">{q}:</span> <span className="text-emerald-400">{Array.isArray(ans) ? ans.join(', ') : String(ans)}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}


          {/* Automatically detect and render image links from the text content */}
          {(() => {
            if (!message.content) return null;
            const foundImageUrls: string[] = [];
            const matches = (message.content.match(/https?:\/\/[^\s\)]+/gi) || []) as string[];
            matches.forEach(url => {
              const cleanedUrl = url.replace(/[.,;*`"'>\?]+$/, '');
              const isLikelyImage = /\.(png|jpe?g|gif|webp|svg|bmp)/i.test(cleanedUrl) || 
                                    /(\/images?\/|\/img\/|photo|visual|attachment)/i.test(cleanedUrl);
              const isAlreadyInImages = message.images && message.images.some(img => img.url === cleanedUrl);
              if (isLikelyImage && !isAlreadyInImages && !foundImageUrls.includes(cleanedUrl)) {
                foundImageUrls.push(cleanedUrl);
              }
            });

            if (foundImageUrls.length === 0) return null;

            return (
              <div className="mt-4 flex flex-col gap-2 w-full text-left">
                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider flex items-center gap-1.5 select-none font-sans">
                  <ImageIcon size={11} className="text-blue-500" />
                  Visual Attachment
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl text-left">
                  {foundImageUrls.map((url, idx) => (
                    <motion.div 
                      key={idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="relative rounded-2xl overflow-hidden border border-zinc-200/50 dark:border-white/5 bg-zinc-50 dark:bg-zinc-900/20 group hover:shadow-lg transition-all"
                    >
                      <img 
                        src={url} 
                        alt="Attached Visual"
                        className="w-full h-auto object-cover max-h-[250px] transition-transform duration-500 group-hover:scale-105 cursor-zoom-in"
                        referrerPolicy="no-referrer"
                        onClick={() => {
                          if (typeof (window as any).openImageLightbox === 'function') {
                            (window as any).openImageLightbox(url, 'Attached Visual');
                          } else {
                            window.open(url, '_blank');
                          }
                        }}
                      />
                      <div className="bg-zinc-50 dark:bg-zinc-900/80 px-4 py-2 border-t border-zinc-150/40 dark:border-white/5 text-[10px] font-semibold text-zinc-550 dark:text-zinc-400 flex items-center justify-between font-sans">
                        <span className="truncate max-w-[70%]">{url}</span>
                        <button 
                          type="button"
                          onClick={() => {
                            if (typeof (window as any).openImageLightbox === 'function') {
                              (window as any).openImageLightbox(url, 'Attached Visual');
                            } else {
                              window.open(url, '_blank');
                            }
                          }}
                          className="text-blue-550 dark:text-blue-400 hover:underline uppercase text-[9px] font-bold tracking-wider cursor-pointer border-none bg-transparent"
                        >
                          View Photo
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Automatically detect and render video links from the text content */}
          {(() => {
            if (!message.content) return null;
            const foundVideoLinks: Array<{ url: string; title: string; type: 'youtube' | 'vimeo' | 'direct' | 'other' }> = [];
            const matches = (message.content.match(/https?:\/\/[^\s\)]+/gi) || []) as string[];
            matches.forEach(url => {
              const cleanedUrl = url.replace(/[.,;*`"'>\?]+$/, '');
              
              let type: 'youtube' | 'vimeo' | 'direct' | 'other' | null = null;
              let title = 'Web Video';
              
              if (/youtube\.com|youtu\.be|youtube-nocookie\.com/i.test(cleanedUrl)) {
                type = 'youtube';
                title = 'YouTube Video';
              } else if (/vimeo\.com/i.test(cleanedUrl)) {
                type = 'vimeo';
                title = 'Vimeo Video';
              } else if (/\.(mp4|webm|ogg)/i.test(cleanedUrl)) {
                type = 'direct';
                title = 'Direct HTML5 Video';
              } else if (cleanedUrl.includes('/embed/')) {
                type = 'other';
                title = 'Embedded Video';
              }
              
              if (type) {
                const exists = foundVideoLinks.some(v => v.url === cleanedUrl);
                if (!exists) {
                  foundVideoLinks.push({ url: cleanedUrl, title, type });
                }
              }
            });

            if (foundVideoLinks.length === 0) return null;

            return (
              <div className="mt-4 flex flex-col gap-2 w-full text-left">
                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider flex items-center gap-1.5 select-none md:ml-1 font-sans">
                  <Play size={11} className="text-orange-500 fill-orange-500" />
                  Playable Video Content
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl w-full text-left">
                  {foundVideoLinks.map((vid, idx) => (
                    <motion.div 
                      key={idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="relative rounded-2xl overflow-hidden border border-zinc-205/60 dark:border-white/5 bg-zinc-50 dark:bg-zinc-900/20 group hover:shadow-lg transition-all"
                    >
                      <div className="aspect-video bg-neutral-950 flex flex-col items-center justify-center relative overflow-hidden select-none">
                        <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded bg-black/60 font-mono text-[9px] uppercase tracking-wider text-orange-400 font-bold z-20">
                          {vid.type}
                        </div>
                        
                        <button 
                          type="button"
                          onClick={() => {
                            if (typeof (window as any).playVideoInLuminaPopup === 'function') {
                              (window as any).playVideoInLuminaPopup(vid.url, vid.title);
                            }
                          }}
                          className="w-10 h-10 rounded-full bg-orange-500 hover:bg-orange-600 text-white flex items-center justify-center shadow-lg transform transition-transform group-hover:scale-110 z-20 cursor-pointer active:scale-95 border-0"
                          title="Play in Lumina Player"
                        >
                          <Play size={16} fill="currentColor" className="ml-0.5" />
                        </button>
                      </div>
                      
                      <div className="bg-zinc-50 dark:bg-zinc-900/85 px-4 py-2.5 border-t border-zinc-150/40 dark:border-white/5 text-[10px] font-semibold text-zinc-550 dark:text-zinc-400 flex items-center justify-between gap-3 font-sans">
                        <span className="truncate max-w-[60%] text-left" title={vid.title}>{vid.title}</span>
                        <button 
                          type="button"
                          onClick={() => {
                            if (typeof (window as any).playVideoInLuminaPopup === 'function') {
                              (window as any).playVideoInLuminaPopup(vid.url, vid.title);
                            }
                          }}
                          className="text-orange-500 hover:text-orange-600 hover:underline uppercase text-[9px] font-bold tracking-wider cursor-pointer border-0 bg-transparent flex items-center gap-1 shrink-0"
                        >
                          Watch Video
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            );
          })()}

          {message.images && message.images.length > 0 && (
            <div className="mt-4 grid grid-cols-2 lg:grid-cols-3 gap-3 text-left">
              {message.images.map((img, idx) => (
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="relative aspect-square rounded-2xl overflow-hidden group border border-gray-100 dark:border-white/5 bg-gray-55 dark:bg-zinc-950 shadow-sm transition-all hover:shadow-md cursor-zoom-in"
                  onClick={() => {
                    if (typeof (window as any).openImageLightbox === 'function') {
                      (window as any).openImageLightbox(img.url, img.title);
                    }
                  }}
                >
                  <img 
                    src={img.url} 
                    alt={img.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3 font-sans">
                    <p className="text-[10px] text-white font-medium truncate mb-1 text-left">{img.title}</p>
                    <div className="flex items-center justify-between">
                      <a 
                        href={img.url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-[9px] text-blue-400 hover:underline truncate mr-2 text-left"
                      >
                        {img.source || 'Original Source'}
                      </a>
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const link = document.createElement('a');
                          link.href = img.url;
                          link.download = `image-${idx}`;
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        }}
                        className="p-1.5 bg-white/20 hover:bg-white/40 rounded-xl text-white transition-colors border-0 shrink-0 cursor-pointer"
                        title="Download Image"
                      >
                        <Download size={12} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
          {message.artifacts && message.artifacts.length > 0 && (
            <div className="w-full space-y-2 mt-4 text-left">
              {message.artifacts.flatMap(art => {
                if (art.type === 'html') {
                  const webPreviewCard = (
                    <ArtifactCard 
                      key={`${art.id}-preview`} 
                      artifact={art} 
                      onOpen={(a) => {
                        setActiveArtifact(a);
                        setIsCanvasOpen(true);
                        setCanvasView('preview');
                      }} 
                    />
                  );
                  
                  const codeArtifact: Artifact = {
                    ...art,
                    id: `${art.id}-code`,
                    title: art.title.replace(/web preview/i, 'HTML Document Source').replace(/preview/i, 'HTML Code'),
                    type: 'code',
                    language: 'html'
                  };
                  
                  if (codeArtifact.title === art.title) {
                    codeArtifact.title = `${art.title} (HTML Code)`;
                  }

                  const codeCard = (
                    <ArtifactCard
                      key={`${art.id}-code`}
                      artifact={codeArtifact}
                      onOpen={() => {
                        setActiveArtifact(art);
                        setIsCanvasOpen(true);
                        setCanvasView('code');
                      }}
                    />
                  );
                  
                  return [webPreviewCard, codeCard];
                }

                return (
                  <ArtifactCard 
                    key={art.id} 
                    artifact={art} 
                    onOpen={(a) => {
                      setActiveArtifact(a);
                      setIsCanvasOpen(true);
                      setCanvasView(['html', 'markdown', 'report'].includes(a.type) ? 'preview' : 'code');
                    }} 
                  />
                );
              })}
            </div>
          )}
          {!message.thinking && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-6 flex flex-col gap-4 border-t border-zinc-105 dark:border-white/5 pt-4 pl-1"
            >
              <div className="flex items-center gap-4 select-none">
                {message.sources && message.sources.length > 0 && (
                  <button 
                    type="button"
                    onClick={() => {
                      setSourcesPanelMessageId(message.id);
                      setIsSourcesPanelOpen(true);
                    }}
                    className="flex items-center gap-2 text-[11px] font-bold text-zinc-400 hover:text-zinc-650 dark:hover:text-zinc-200 transition-colors uppercase tracking-wider font-sans border-none bg-transparent"
                  >
                    <Layout size={14} />
                    {message.sources.length} Sources
                  </button>
                )}
                <div className="text-[10px] text-zinc-400 font-medium uppercase tracking-tight flex items-center gap-2 font-sans">
                  {persona.avatar && (
                    <img src={persona.avatar} alt="" className="w-3.5 h-3.5 rounded-full object-cover grayscale opacity-60" referrerPolicy="no-referrer" />
                  )}
                  {persona.name} • {message.timestamp?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  type="button"
                  onClick={handleCopy}
                  className={`p-1.5 transition-colors rounded-lg flex items-center gap-1.5 border-none bg-transparent cursor-pointer ${
                    copied ? 'text-green-500 bg-green-500/10' : 'text-zinc-400 hover:text-zinc-650 dark:hover:text-zinc-200'
                  }`}
                  title={copied ? "Copied!" : "Copy message"}
                >
                  {copied ? <Check size={14} /> : React.createElement(Copy, { size: 16 })}
                  {copied && <span className="text-[10px] font-bold uppercase tracking-widest font-sans">Copied</span>}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const speechText = cleanMessageTextForSpeech(message.content);
                    if (speechText) {
                      globalSpeechController.speak(message.id, speechText);
                      if (!isPlayingSpeech) {
                        showToast?.("Reading message output aloud...");
                      } else {
                        showToast?.("Speech stopped.");
                      }
                    } else {
                      showToast?.("No clear text to read aloud.");
                    }
                  }}
                  className={`p-1.5 transition-all rounded-lg flex items-center gap-1 border-none bg-transparent cursor-pointer ${
                    isPlayingSpeech 
                      ? 'text-purple-500 bg-purple-500/10 ring-1 ring-purple-500/20' 
                      : 'text-zinc-400 hover:text-purple-400 dark:hover:text-purple-350'
                  }`}
                  title={isPlayingSpeech ? "Stop speaking" : "Read aloud"}
                >
                  {isPlayingSpeech ? (
                    <>
                      <VolumeX size={16} className="animate-pulse" />
                      <div className="flex items-center gap-[1px] h-3 px-0.5">
                        <span className="w-[1.5px] h-2 bg-purple-500 animate-[bounce_0.8s_infinite] inline-block" style={{ animationDelay: '0s' }}></span>
                        <span className="w-[1.5px] h-3 bg-purple-500 animate-[bounce_0.8s_infinite] inline-block" style={{ animationDelay: '0.15s' }}></span>
                        <span className="w-[1.5px] h-1.5 bg-purple-500 animate-[bounce_0.8s_infinite] inline-block" style={{ animationDelay: '0.3s' }}></span>
                        <span className="w-[1.5px] h-2.5 bg-purple-500 animate-[bounce_0.8s_infinite] inline-block" style={{ animationDelay: '0.45s' }}></span>
                      </div>
                    </>
                  ) : (
                    React.createElement(Play, { size: 16 })
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const isLiked = feedback === 'like';
                    setFeedback(isLiked ? null : 'like');
                    showToast?.(isLiked ? "Feedback removed" : "Thanks for your feedback!");
                  }}
                  className={`p-1.5 transition-colors rounded-lg border-none bg-transparent cursor-pointer ${
                    feedback === 'like' ? 'text-emerald-500 bg-emerald-500/10' : 'text-zinc-400 hover:text-zinc-650 dark:hover:text-zinc-200'
                  }`}
                  title="Good response"
                >
                  {React.createElement(ThumbsUp, { size: 16 })}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const isDisliked = feedback === 'dislike';
                    setFeedback(isDisliked ? null : 'dislike');
                    showToast?.(isDisliked ? "Feedback removed" : "Feedback recorded. We'll improve!");
                  }}
                  className={`p-1.5 transition-colors rounded-lg border-none bg-transparent cursor-pointer ${
                    feedback === 'dislike' ? 'text-rose-500 bg-rose-500/10' : 'text-zinc-400 hover:text-zinc-650 dark:hover:text-zinc-200'
                  }`}
                  title="Bad response"
                >
                  {React.createElement(ThumbsDown, { size: 16 })}
                </button>
                {onSendMessage && (
                  <button
                    type="button"
                    onClick={() => {
                      if (onSendMessage && message.content) {
                        showToast?.("Requesting message regeneration...");
                        onSendMessage("Regenerate the previous response");
                      }
                    }}
                    className="p-1.5 transition-colors rounded-lg border-none bg-transparent text-zinc-400 hover:text-zinc-650 dark:hover:text-zinc-200 cursor-pointer"
                    title="Regenerate response"
                  >
                    {React.createElement(RotateCcw, { size: 16 })}
                  </button>
                )}
                <div className="relative">
                  <button 
                    type="button"
                    onClick={() => setShowHistory(!showHistory)}
                    className={`p-1.5 transition-colors rounded-lg border-none bg-transparent cursor-pointer ${
                      showHistory ? 'text-blue-500 bg-blue-500/10' : 'text-zinc-400 hover:text-zinc-650 dark:hover:text-zinc-200'
                    }`}
                    title="Message history"
                  >
                    {React.createElement(History, { size: 16 })}
                  </button>
                  <AnimatePresence>
                    {showHistory && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.9 }}
                        className="absolute bottom-full left-0 mb-2 w-48 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-xl shadow-xl z-50 p-3 overflow-hidden"
                      >
                        <div className="space-y-2 text-left select-none">
                          <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest border-b border-zinc-100 dark:border-white/5 pb-1 mb-2 font-sans">Metadata</h4>
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] text-zinc-500 font-medium italic font-sans">ID</span>
                            <span className="text-[10px] text-zinc-400 font-mono truncate max-w-[80px]">{message.id}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] text-zinc-550 font-medium italic font-sans font-sans">Sent</span>
                            <span className="text-[10px] text-zinc-400 font-mono italic font-sans">{message.timestamp?.toLocaleTimeString()}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] text-zinc-550 font-medium italic font-sans font-sans">Chars</span>
                            <span className="text-[10px] text-zinc-400 font-bold font-sans">{message.content.length}</span>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}

const areMessageItemPropsEqual = (prev: MessageItemProps, next: MessageItemProps) => {
  return (
    prev.message === next.message &&
    prev.markdownComponents === next.markdownComponents &&
    prev.userProfile === next.userProfile &&
    prev.persona === next.persona &&
    prev.isSourcesPanelOpen === next.isSourcesPanelOpen &&
    prev.scrapingResults === next.scrapingResults &&
    prev.wikiResults === next.wikiResults &&
    prev.onSendMessage === next.onSendMessage &&
    prev.onOpenInEditor === next.onOpenInEditor &&
    prev.showToast === next.showToast &&
    prev.onUpdateTodoPlan === next.onUpdateTodoPlan &&
    prev.onUpdateMessage === next.onUpdateMessage &&
    prev.onStartBuilding === next.onStartBuilding &&
    prev.setIsSourcesPanelOpen === next.setIsSourcesPanelOpen &&
    prev.setSourcesPanelMessageId === next.setSourcesPanelMessageId &&
    prev.setActiveArtifact === next.setActiveArtifact &&
    prev.setIsCanvasOpen === next.setIsCanvasOpen &&
    prev.setCanvasView === next.setCanvasView
  );
};

export const MessageItem = React.memo(MessageItemComponent, areMessageItemPropsEqual);


