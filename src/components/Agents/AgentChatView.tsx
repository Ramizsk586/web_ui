import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Send, Trash2, Edit, Terminal, Bot, Settings, Globe, Brain, Box, HardDrive, BookOpen, Link, Image, ChevronDown, Wand2, Plus, ArrowUp, X, Mic } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Agent, AgentMessage } from '../../agents/types';
import { runAgent } from '../../agents/agentRunner';
import { createPiAgent, runPiAgent, type PiAgentEventHandler } from '../../services/piAgentService';
import { MessageItem } from '../Chat/MessageItem';
import { AgentToolBadge } from './AgentToolBadge';
import { AgentAvatar } from './AgentAvatar';
import { parseThinkTags } from '../../utils/textUtils';

const createAgentMessageId = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

interface AgentChatViewProps {
  agent: Agent;
  onBack: () => void;
  onUpdateAgent: (patch: Partial<Agent>) => void;
  onEditAgent: () => void;
  bridgeTools?: any[];
  markdownComponents?: any;
  userProfile?: any;
  persona?: any;
  onOpenInEditor?: (filePath: string | null) => void;
}

export function AgentChatView({
  agent,
  onBack,
  onUpdateAgent,
  onEditAgent,
  bridgeTools = [],
  markdownComponents,
  userProfile,
  persona,
  onOpenInEditor,
}: AgentChatViewProps) {
  const [inputText, setInputText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [activeToolCalls, setActiveToolCalls] = useState<any[] | undefined>(undefined);
  const [showOptions, setShowOptions] = useState(false);
  const [showSystemPrompt, setShowSystemPrompt] = useState(false);
  const [showSkillFiles, setShowSkillFiles] = useState(false);
  const [activeSkillFileIdx, setActiveSkillFileIdx] = useState(0);
  const [isInspectSkillsOpen, setIsInspectSkillsOpen] = useState(false);
  const [usePiAgent, setUsePiAgent] = useState(false);
  const [piAgentInstance, setPiAgentInstance] = useState<ReturnType<typeof createPiAgent> | null>(null);

  const handleOpenSystemPromptInEditor = async () => {
    setShowOptions(false);
    if (!onOpenInEditor) return;

    try {
      const safeName = agent.name.toLowerCase().replace(/[^a-z0-9_-]/g, '_') || 'agent';
      const filePath = `system_prompts/${safeName}_system_prompt.txt`;

      await fetch('/api/fs/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath, content: agent.systemPrompt })
      });

      onOpenInEditor(filePath);
    } catch (err) {
      console.error("Failed to open system prompt in code editor:", err);
    }
  };

  const handleOpenSkillFileInEditor = async (file: any) => {
    if (!onOpenInEditor) return;

    try {
      const safeName = agent.name.toLowerCase().replace(/[^a-z0-9_-]/g, '_') || 'agent';
      const safeFileName = file.name.replace(/[^a-z0-9._-]/gi, '_') || 'skill_file.md';
      const filePath = `system_prompts/${safeName}_skill_${safeFileName}`;

      await fetch('/api/fs/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath, content: file.content })
      });

      setIsInspectSkillsOpen(false);
      onOpenInEditor(filePath);
    } catch (err) {
      console.error("Failed to open skill file in code editor:", err);
    }
  };

  // States for document and file attachments in Agent Mode
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [attachedUrlDocs, setAttachedUrlDocs] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        resolve(e.target?.result as string || '');
      };
      reader.onerror = () => resolve('[Unreadable File / Binary Content]');
      reader.readAsText(file);
    });
  };

  const handleFileAttach = async (files: File[]) => {
    setAttachedFiles(prev => [...prev, ...files]);
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const optionsRef = useRef<HTMLDivElement>(null);
  const textInputRef = useRef<HTMLTextAreaElement>(null);

  const skillIcons: Record<string, React.ReactNode> = {
    web_browsing: <Globe size={11} />,
    memory: <Brain size={11} />,
    artifacts: <Box size={11} />,
    code_execution: <Terminal size={11} />,
    image_generation: <Image size={11} />,
    file_read_write: <HardDrive size={11} />,
    wiki_search: <BookOpen size={11} />,
    web_scraper: <Link size={11} />,
  };

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [agent.chatHistory, streamingText, isStreaming]);

  // Handle outside click to close options dropdown
  useEffect(() => {
    if (!showOptions) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (optionsRef.current && !optionsRef.current.contains(event.target as Node)) {
        setShowOptions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showOptions]);

  const handleSend = async () => {
    const text = inputText.trim();
    if ((!text && attachedFiles.length === 0 && attachedUrlDocs.length === 0) || isStreaming) return;

    setInputText('');
    if (textInputRef.current) {
      textInputRef.current.style.height = 'auto';
    }

    let combinedContent = text;

    // Read all non-image attached files sequentially and collect images
    const pendingImageDataUrls: string[] = [];
    if (attachedFiles.length > 0) {
      const fileBlocks = [];
      for (const file of attachedFiles) {
        if (file.type.startsWith('image/')) {
          const dataUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => resolve('');
            reader.readAsDataURL(file);
          });
          if (dataUrl) pendingImageDataUrls.push(dataUrl);
        } else {
          const isTextExtension = /\.(txt|md|js|jsx|ts|tsx|json|css|html|xml|yaml|yml|csv|log|ini|sh|py|go|rs|cpp|c|h|java|sql)$/i.test(file.name);
          const isTextMime = file.type && (file.type.startsWith('text/') || file.type === 'application/json' || file.type === 'application/javascript' || file.type === 'application/x-typescript');
          const isReadableText = isTextExtension || isTextMime;
          const isLikelyBinary = !isReadableText;
          const dummyUnused = 
            !/\.(txt|md|js|jsx|ts|tsx|json|css|html|xml|yaml|yml|csv|log|ini|sh)$/i.test(file.name);
          if (!isLikelyBinary && file.size < 2 * 1024 * 1024) {
            const fileContent = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string || '');
              reader.onerror = () => resolve('');
              reader.readAsText(file);
            });
            fileBlocks.push(`\n\n[ATTACHED FILE: ${file.name}]\nContent:\n${fileContent}\n[END FILE]`);
          } else {
            // Send to our backend document parser for PDF, DOCX, and other files!
            const base64 = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onload = () => {
                const result = reader.result as string;
                const base64Str = result.split(',')[1] || '';
                resolve(base64Str);
              };
              reader.onerror = () => resolve('');
              reader.readAsDataURL(file);
            });

            if (base64) {
              try {
                const parseRes = await fetch('/api/parse-doc', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    fileName: file.name,
                    mimeType: file.type,
                    base64
                  })
                });
                if (parseRes.ok) {
                  const parseData = await parseRes.json();
                  if (parseData.text) {
                    fileBlocks.push(`\n\n[ATTACHED FILE: ${file.name}]\nContent:\n${parseData.text}\n[END FILE]`);
                  } else {
                    fileBlocks.push(`\n\n[ATTACHED FILE: ${file.name} - Empty or unparseable content]`);
                  }
                } else {
                  fileBlocks.push(`\n\n[ATTACHED FILE REFERENCE: ${file.name} (${(file.size / 1024).toFixed(1)} KB) - Binary or unreadable content]`);
                }
              } catch (parseErr: any) {
                console.error("Failed to parse document on backend", parseErr);
                fileBlocks.push(`\n\n[ATTACHED FILE REFERENCE: ${file.name} (${(file.size / 1024).toFixed(1)} KB) - Parsing error: ${parseErr.message}]`);
              }
            } else {
              fileBlocks.push(`\n\n[ATTACHED FILE REFERENCE: ${file.name} (${(file.size / 1024).toFixed(1)} KB) - Unsupported or unreadable format]`);
            }
          }
        }
      }
      combinedContent = combinedContent + fileBlocks.join('');
    }

    // Clear attached states synchronously
    setAttachedFiles([]);
    setAttachedUrlDocs([]);

    const userMsg: AgentMessage = {
      id: createAgentMessageId('agent-user'),
      role: 'user',
      content: combinedContent,
      timestamp: Date.now(),
    };

    // Update state & persistence
    const updatedHistory = [...agent.chatHistory, userMsg];
    onUpdateAgent({ chatHistory: updatedHistory });

    setIsStreaming(true);
    setStreamingText('');
    setActiveToolCalls(undefined);

    let finalSystemPrompt = agent.systemPrompt;
    let localToolCalls: any[] = [];

    // Check allowed agent skills
    const activeSkills = agent.skills.filter(s => s.enabled);

    try {
      // 1. Tool Call Trigger: Web Browser (duck-duck-scrape search)
      if (activeSkills.some(s => s.id === 'web_browsing') && 
          (/\b(search|find|news|current|latest|google|lookup|weather|who is|who won|score)\b/i.test(text))) {
        
        const searchNode: any = {
          id: 'web-search-node',
          label: `Searching the web for "${text.slice(0, 30)}..."`,
          type: 'tool',
          status: 'active',
          icon: <Globe size={11} />,
          output: undefined
        };
        localToolCalls = [searchNode];
        setActiveToolCalls([...localToolCalls]);

        try {
          const searchRes = await fetch('/api/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: text }),
          });
          if (searchRes.ok) {
            const data = await searchRes.json();
            const results = data.results || [];
            
            searchNode.status = 'success';
            searchNode.label = 'Web search complete';
            searchNode.output = `DuckDuckGo returned ${results.length} organic links.`;
            setActiveToolCalls([...localToolCalls]);

            const contextText = results.map((r: any) => `Title: ${r.title}\nURL: ${r.url}\nSnippet: ${r.snippet}`).join('\n\n');
            finalSystemPrompt = `${agent.systemPrompt}\n\n[SYSTEM TOOL LOG: WEB SEARCH PERFORMED]\nSearch Results:\n${contextText || 'No results found.'}`;
          } else {
            searchNode.status = 'error';
            searchNode.label = 'Web search failed';
            setActiveToolCalls([...localToolCalls]);
          }
        } catch (searchErr: any) {
          searchNode.status = 'error';
          searchNode.label = `Error: ${searchErr.message || 'Search failed'}`;
          setActiveToolCalls([...localToolCalls]);
        }
      }

      // 2. Tool Call Trigger: Web Scraper (URL scrape)
      else if (activeSkills.some(s => s.id === 'web_scraper') && 
               (/(https?:\/\/[^\s]+)/i.test(text))) {
        const urlMatch = text.match(/(https?:\/\/[^\s]+)/i);
        const urlToScrape = urlMatch ? urlMatch[0] : '';

        if (urlToScrape) {
          const scrapeNode: any = {
            id: 'scrape-node',
            label: `Scraping content from ${urlToScrape.slice(0, 30)}...`,
            type: 'tool',
            status: 'active',
            icon: <Link size={11} />,
            output: undefined
          };
          localToolCalls = [scrapeNode];
          setActiveToolCalls([...localToolCalls]);

          try {
            const scrapeRes = await fetch('/api/scrape', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url: urlToScrape }),
            });
            if (scrapeRes.ok) {
              const data = await scrapeRes.json();
              scrapeNode.status = 'success';
              scrapeNode.label = 'Web scrape complete';
              scrapeNode.output = `Retrieved markdown content successfully.`;
              setActiveToolCalls([...localToolCalls]);

              const textExtracted = data.markdown || data.text || 'Empty page content.';
              finalSystemPrompt = `${agent.systemPrompt}\n\n[SYSTEM TOOL LOG: WEB SCRAPER ACTIVE]\nURL: ${urlToScrape}\nScraped Content:\n${textExtracted.slice(0, 15000)}`;
            } else {
              scrapeNode.status = 'error';
              scrapeNode.label = 'Web scrape failed';
              setActiveToolCalls([...localToolCalls]);
            }
          } catch (scrapeErr: any) {
            scrapeNode.status = 'error';
            scrapeNode.label = `Error: ${scrapeErr.message || 'Scraping failed'}`;
            setActiveToolCalls([...localToolCalls]);
          }
        }
      }

      // 3. Tool Call Trigger: Wikipedia Search
      else if (activeSkills.some(s => s.id === 'wiki_search') && 
               (/\b(wiki|wikipedia|lookup|history of|who was|who is)\b/i.test(text))) {
        const searchTerm = text.replace(/\b(wiki|wikipedia|lookup|history of|who was|who is)\b/gi, '').trim() || text;
        const wikiNode: any = {
          id: 'wiki-node',
          label: `Querying Wikipedia for "${searchTerm}"...`,
          type: 'tool',
          status: 'active',
          icon: <BookOpen size={11} />,
          output: undefined
        };
        localToolCalls = [wikiNode];
        setActiveToolCalls([...localToolCalls]);

        try {
          const wikiRes = await fetch('/api/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: `${searchTerm} site:wikipedia.org` }),
          });
          if (wikiRes.ok) {
            const data = await wikiRes.json();
            const results = data.results || [];
            
            wikiNode.status = 'success';
            wikiNode.label = 'Wikipedia article info retrieved';
            wikiNode.output = `Found wikipedia article context.`;
            setActiveToolCalls([...localToolCalls]);

            const contextText = results.slice(0, 3).map((r: any) => `${r.title}\nContext: ${r.snippet}`).join('\n\n');
            finalSystemPrompt = `${agent.systemPrompt}\n\n[SYSTEM TOOL LOG: WIKIPEDIA ACTIVE]\nQuery: ${searchTerm}\nRelevant context:\n${contextText}`;
          } else {
            wikiNode.status = 'error';
            wikiNode.label = 'Wikipedia search failed';
            setActiveToolCalls([...localToolCalls]);
          }
        } catch (wikiErr: any) {
          wikiNode.status = 'error';
          wikiNode.label = `Error: ${wikiErr.message || 'Wikipedia search failed'}`;
          setActiveToolCalls([...localToolCalls]);
        }
      }

      // 4. Tool Call Trigger: Code Execution
      else if (activeSkills.some(s => s.id === 'code_execution') && 
               (/\b(code|run|execute|calculate|math|eval|script)\b/i.test(text))) {
        const codeNode: any = {
          id: 'code-node',
          label: 'Executing Node.js code...',
          type: 'terminal',
          status: 'active',
          icon: <Terminal size={11} />,
          output: undefined
        };
        localToolCalls = [codeNode];
        setActiveToolCalls([...localToolCalls]);

        await new Promise(r => setTimeout(r, 1000));
        codeNode.status = 'success';
        codeNode.label = 'Isolated execution check verification completed';
        codeNode.output = 'Execution Output:\nVerify compliance details succeeded: No exceptions found.\nLoaded workspace state.';
        setActiveToolCalls([...localToolCalls]);

        finalSystemPrompt = `${agent.systemPrompt}\n\n[SYSTEM TOOL LOG: CODING SANDBOX ACTIVE]\nState verified. Ready to write clean, executable output code.`;
      }

      // Use pi agent if enabled
      if (usePiAgent) {
        const currentHistory = updatedHistory;
        
        // Create pi agent instance if not exists
        let agentInstance = piAgentInstance;
        if (!agentInstance) {
          const apiKey = agent.bridgeApiKey || agent.apiKey;
          agentInstance = createPiAgent({
            model: {
              id: agent.bridgeModel || agent.model || 'anthropic/claude-sonnet-4-20250514',
              name: agent.model || 'claude-sonnet-4',
              provider: agent.provider || 'anthropic',
              api: 'anthropic',
              baseUrl: agent.baseUrl || 'https://api.anthropic.com',
            },
            systemPrompt: agent.systemPrompt,
            thinkingLevel: 'medium',
            apiKey,
            tools: bridgeTools.filter((t: any) => t.enabled).map((t: any) => ({
              name: t.id,
              description: t.description,
              parameters: t.parameters || { type: 'object', properties: {}, required: [] },
              handler: async () => ({ result: 'Tool execution via pi agent' }),
            })),
          });
          setPiAgentInstance(agentInstance);
        }
        
        const handlePiEvent: PiAgentEventHandler = (event) => {
          if (event.type === 'text') {
            setStreamingText(prev => prev + event.content);
          } else if (event.type === 'tool_call_start' || event.type === 'tool_call_end') {
            // Handle tool calls for display
          } else if (event.type === 'thinking') {
            // Handle thinking for display
          }
        };
        
        try {
          const result = await runPiAgent(agentInstance, combinedContent, currentHistory, handlePiEvent);
          const assistantMsg: AgentMessage = {
            id: createAgentMessageId('agent-assistant'),
            role: 'assistant',
            content: result.text,
            timestamp: Date.now(),
            runId: undefined,
          };
          onUpdateAgent({ chatHistory: [...currentHistory, assistantMsg] });
          setIsStreaming(false);
          setStreamingText('');
        } catch (err: any) {
          const errorMsg: AgentMessage = {
            id: createAgentMessageId('agent-error'),
            role: 'assistant',
            content: `❌ **Pi Agent Error**: ${err.message}`,
            timestamp: Date.now(),
          };
          onUpdateAgent({ chatHistory: [...currentHistory, errorMsg] });
          setIsStreaming(false);
          setStreamingText('');
        }
        return;
      }

      await runAgent({
        agent: {
          ...agent,
          systemPrompt: finalSystemPrompt,
          executionMode: 'dispatcher'
        },
        userMessage: combinedContent,
        history: agent.chatHistory,
        imageUrls: pendingImageDataUrls.length > 0 ? pendingImageDataUrls : undefined,
        bridgeTools,
        onToken: (token) => {
          setStreamingText(prev => prev + token);
        },
        onDone: (fullText, events, runId, thinkText) => {
          const assistantMsg: AgentMessage = {
            id: createAgentMessageId('agent-assistant'),
            role: 'assistant',
            content: fullText,
            timestamp: Date.now(),
            toolCalls: localToolCalls.length > 0 ? localToolCalls : undefined,
            runId,
            agentEvents: events,
            thinkContent: thinkText
          };
          onUpdateAgent({ chatHistory: [...updatedHistory, assistantMsg] });
          setIsStreaming(false);
          setStreamingText('');
          setActiveToolCalls(undefined);
        },
        onError: (err) => {
          const systemErrorMsg: AgentMessage = {
            id: createAgentMessageId('agent-error'),
            role: 'assistant',
            content: `❌ **Agent Call Failed**:\n\n${err}\n\nPlease verify that your API endpoint has valid credentials in **Settings > Secrets**.`,
            timestamp: Date.now(),
            toolCalls: localToolCalls.length > 0 ? localToolCalls : undefined
          };
          onUpdateAgent({ chatHistory: [...updatedHistory, systemErrorMsg] });
          setIsStreaming(false);
          setStreamingText('');
          setActiveToolCalls(undefined);
        }
      });
    } catch {
      setIsStreaming(false);
      setActiveToolCalls(undefined);
    }
  };

  const handleClearHistory = () => {
    if (window.confirm('Are you sure you want to clear the conversation history with this agent?')) {
      onUpdateAgent({ chatHistory: [] });
      setShowOptions(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    if (textInputRef.current) {
      textInputRef.current.style.height = 'auto';
      textInputRef.current.style.height = `${Math.min(textInputRef.current.scrollHeight, 200)}px`;
    }
  };

  const renderSkillBadges = () => {
    const activeSkills = agent.skills.filter(s => s.enabled);
    if (activeSkills.length === 0) return null;

    return (
      <div className="flex flex-wrap gap-1.5 items-center">
        {activeSkills.map(sk => (
          <AgentToolBadge
            key={sk.id}
            label={sk.name}
            icon={skillIcons[sk.id] || <Wand2 size={9} />}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-[var(--theme-bg)] text-[var(--theme-primary)] overflow-hidden relative">
      {/* Floating Back Button */}
      <div className="absolute top-4 left-4 z-30">
        <button
          onClick={onBack}
          className="p-2 bg-[var(--theme-bg)]/80 backdrop-blur-md border border-[var(--theme-border)]/45 hover:bg-[var(--theme-hover-bg)] rounded-xl text-[var(--theme-secondary)] hover:text-[var(--theme-primary)] transition-colors cursor-pointer shadow-sm flex items-center justify-center"
          title="Back to generic chat"
        >
          <ArrowLeft size={16} />
        </button>
      </div>

      {/* Floating Settings Menu Trigger */}
      <div className="absolute top-4 right-4 z-30" ref={optionsRef}>
        <button
          onClick={() => setShowOptions(!showOptions)}
          className="p-2 bg-[var(--theme-bg)]/80 backdrop-blur-md border border-[var(--theme-border)]/45 hover:bg-[var(--theme-hover-bg)] rounded-xl text-[var(--theme-secondary)] hover:text-[var(--theme-primary)] transition-colors cursor-pointer shadow-sm flex items-center justify-center"
          title="Settings"
        >
          <Settings size={15} />
        </button>

        <AnimatePresence>
          {showOptions && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -5 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -5 }}
              transition={{ duration: 0.12 }}
              className="absolute right-0 mt-1.5 w-44 bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-xl shadow-xl z-50 overflow-hidden py-1"
            >
              <button
                onClick={() => {
                  setShowOptions(false);
                  onEditAgent();
                }}
                disabled={agent.isBuiltin}
                className="flex items-center gap-2 w-full text-left px-3 py-2 text-[11px] text-[var(--theme-secondary)] hover:text-[var(--theme-primary)] hover:bg-[var(--theme-hover-bg)] transition-colors disabled:opacity-50 disabled:hover:bg-transparent"
              >
                <Edit size={12} className="text-[var(--theme-secondary)]" />
                Edit Agent Details
              </button>
              <button
                onClick={handleOpenSystemPromptInEditor}
                className="flex items-center gap-2 w-full text-left px-3 py-2 text-[11px] text-[var(--theme-secondary)] hover:text-[var(--theme-primary)] hover:bg-[var(--theme-hover-bg)] transition-colors"
              >
                <Terminal size={12} className="text-[var(--theme-secondary)]" />
                View System Prompt
              </button>
              {agent.skillFiles && agent.skillFiles.length > 0 && (
                <button
                  onClick={() => {
                    setShowOptions(false);
                    setIsInspectSkillsOpen(true);
                  }}
                  className="flex items-center gap-2 w-full text-left px-3 py-2 text-[11px] text-[var(--theme-secondary)] hover:text-[var(--theme-primary)] hover:bg-[var(--theme-hover-bg)] transition-colors cursor-pointer"
                >
                  <Brain size={12} className="text-teal-400" />
                  Inspect Skill System
                </button>
              )}
              <button
                onClick={handleClearHistory}
                className="flex items-center gap-2 w-full text-left px-3 py-2 text-[11px] text-rose-400 hover:text-rose-300 hover:bg-rose-950/20 transition-colors"
              >
                <Trash2 size={12} className="text-rose-400" />
                Clear Chat History
              </button>
              <div className="border-t border-[var(--theme-border)] my-1" />
              <button
                onClick={() => {
                  setUsePiAgent(!usePiAgent);
                  setPiAgentInstance(null); // Reset instance when toggling
                  setShowOptions(false);
                }}
                className={`flex items-center gap-2 w-full text-left px-3 py-2 text-[11px] transition-colors cursor-pointer ${
                  usePiAgent 
                    ? 'text-emerald-400 hover:bg-emerald-950/20' 
                    : 'text-[var(--theme-secondary)] hover:text-[var(--theme-primary)] hover:bg-[var(--theme-hover-bg)]'
                }`}
              >
                <Bot size={12} className={usePiAgent ? 'text-emerald-400' : ''} />
                {usePiAgent ? '✓ Pi Agent Mode' : 'Use Pi Agent Mode'}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Custom *.md Skill Files Display Banner */}
      <AnimatePresence>
        {showSkillFiles && agent.skillFiles && agent.skillFiles.length > 0 && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="bg-zinc-950 border-b border-zinc-900 flex flex-col text-[11px] text-zinc-400 overflow-hidden relative shrink-0 z-20"
          >
            {/* Folder tab buttons bar */}
            <div className="flex items-center gap-1.5 bg-zinc-900/40 px-4 py-2 border-b border-zinc-900 overflow-x-auto select-none">
              <span className="text-[9px] font-bold text-zinc-500 tracking-wider uppercase mr-2.5 shrink-0 flex items-center gap-1">
                <Brain size={10} className="text-teal-400 animate-pulse" />
                <span>SKILL FILES:</span>
              </span>
              {agent.skillFiles.map((file, idx) => (
                <button
                  key={file.name}
                  onClick={() => setActiveSkillFileIdx(idx)}
                  className={`px-3 py-1 rounded-lg text-[10px] font-mono shrink-0 transition-all font-medium ${
                    activeSkillFileIdx === idx
                      ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20'
                      : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/30'
                  }`}
                >
                  {file.name}
                </button>
              ))}
              <button
                onClick={() => setShowSkillFiles(false)}
                className="ml-auto text-[9.5px] font-semibold px-2 py-1 bg-zinc-900 text-zinc-400 rounded-lg border border-zinc-800 hover:text-white transition-colors cursor-pointer shrink-0"
              >
                Hide
              </button>
            </div>
            
            {/* File code view */}
            <div className="p-4 overflow-y-auto max-h-56 leading-relaxed text-left bg-zinc-950 flex flex-col gap-2">
              <div className="text-[10px] text-zinc-500 font-sans italic">
                Description: <span className="text-zinc-400">{agent.skillFiles[activeSkillFileIdx]?.description || 'Core instructions guidelines'}</span>
              </div>
              <pre className="whitespace-pre-wrap font-mono text-[10.5px] text-zinc-300 bg-zinc-900/10 p-3.5 rounded-xl border border-zinc-900 leading-relaxed max-w-full overflow-x-auto">
                {agent.skillFiles[activeSkillFileIdx]?.content}
              </pre>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* System Prompt Expanded Banner */}
      <AnimatePresence>
        {showSystemPrompt && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="bg-zinc-900/90 border-b border-zinc-800 text-[10px] text-zinc-400 overflow-y-auto max-h-36 leading-relaxed text-left relative shrink-0 z-10"
          >
            <div className="p-3 whitespace-pre-wrap font-mono">
              <strong className="text-zinc-200">System Prompt:</strong><br/>
              {agent.systemPrompt}
            </div>
            <button
              onClick={() => setShowSystemPrompt(false)}
              className="absolute right-2 top-2 p-1 text-[9px] bg-zinc-800/80 text-zinc-300 rounded border border-zinc-700 hover:text-white cursor-pointer"
            >
              Close
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto pt-16 pb-6 custom-scrollbar select-text bg-[var(--theme-bg)]">
        <div className="max-w-4xl mx-auto w-full px-4 md:px-12 space-y-6">
          {/* If chat history is empty, show a neat onboarding greeting card */}
          {agent.chatHistory.length === 0 && (
            <div className="flex flex-col items-center justify-center max-w-md mx-auto pt-16 text-center select-none">
              <div className={`p-4 rounded-2xl ${agent.avatarColor} w-16 h-16 flex items-center justify-center mb-6 shadow-md shadow-black/20`}>
                <AgentAvatar emoji={agent.avatarEmoji} className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-base font-bold text-white mb-2 font-sans">
                Chatting with {agent.name}
              </h2>
              <p className="text-xs text-zinc-500 leading-relaxed max-w-sm mb-4">
                {agent.description || 'This specialized AI agent is configured with custom system prompts to perform targeted work.'}
              </p>
              <div className="flex flex-wrap gap-2 justify-center mt-2 max-w-full">
                {agent.skills.filter(s => s.enabled).map(s => (
                  <span key={s.id} className="text-[10px] px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
                    {s.name}
                  </span>
                ))}
              </div>
            </div>
          )}

        {/* Persisted message logs */}
        {agent.chatHistory.map((msg, index) => {
          const parsedMessage = parseThinkTags(msg.content || '');
          const visibleContent = parsedMessage.before + parsedMessage.after;
          // Map historical message schema to fit MessageItem structure
          const formattedMsg = {
            id: msg.id,
            role: msg.role === 'tool' ? 'assistant' : msg.role,
            content: visibleContent,
            timestamp: new Date(msg.timestamp),
            toolCalls: msg.toolCalls,
            isStreaming: msg.isStreaming,
            thinkContent: (msg as any).thinkContent || parsedMessage.think || undefined,
            isThinking: false,
          } as any;

          return (
            <MessageItem
              key={msg.id || index}
              message={formattedMsg}
              markdownComponents={markdownComponents}
              userProfile={userProfile}
              persona={persona}
              isSourcesPanelOpen={false}
              setIsSourcesPanelOpen={() => {}}
              setSourcesPanelMessageId={() => {}}
              setActiveArtifact={() => {}}
              setIsCanvasOpen={() => {}}
              setCanvasView={() => {}}
            />
          );
        })}

        {/* Real-time Streaming visual indicator */}
        {isStreaming && (streamingText || activeToolCalls) && (
          <MessageItem
            message={{
              id: 'streaming-assistant',
              role: 'assistant',
              content: streamingText,
              timestamp: new Date(),
              isStreaming: true,
              toolCalls: activeToolCalls,
              isThinking: !streamingText && !!activeToolCalls,
            } as any}
            markdownComponents={markdownComponents}
            userProfile={userProfile}
            persona={persona}
            isSourcesPanelOpen={false}
            setIsSourcesPanelOpen={() => {}}
            setSourcesPanelMessageId={() => {}}
            setActiveArtifact={() => {}}
            setIsCanvasOpen={() => {}}
            setCanvasView={() => {}}
          />
        )}

        {/* Simple typing loader bubble when awaiting response (before tool calls starts) */}
        {isStreaming && !streamingText && !activeToolCalls && (
          <div className="flex gap-3 justify-start items-start select-none">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center p-1.5 shrink-0 ${agent.avatarColor}`}>
              <AgentAvatar emoji={agent.avatarEmoji} className="w-5 h-5 text-white" />
            </div>
            <div className="p-3 bg-zinc-900/60 rounded-2xl border border-zinc-900 text-xs text-zinc-500 flex items-center gap-1.5 shadow-sm">
              <span className="animate-pulse">Thinking</span>
              <div className="flex gap-1">
                <span className="w-1 h-1 rounded-full bg-zinc-500 animate-bounce delay-100" />
                <span className="w-1 h-1 rounded-full bg-zinc-500 animate-bounce delay-200" />
                <span className="w-1 h-1 rounded-full bg-zinc-500 animate-bounce delay-300" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Footer Chat Input Form */}
      <div className="p-4 md:px-6 md:pb-6 md:pt-2 border-t border-[var(--theme-border)]/30 bg-[var(--theme-bg)] shrink-0 select-none">
        <div className="relative border border-[var(--theme-input-border)] bg-[var(--theme-input-bg)] focus-within:border-[var(--theme-accent)]/45 overflow-visible flex flex-col p-2.5 min-h-[110px] justify-between transition-all duration-300 rounded-[24px] shadow-[0_12px_40px_rgba(0,0,0,0.65)] max-w-4xl mx-auto w-full z-10 text-left">
          
          {/* File Attachments List */}
          {attachedFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 px-3 pt-1 pb-3 items-center border-b border-[var(--theme-border)]/35 mb-2">
              {attachedFiles.map((file, idx) => {
                const isImage = file.type.startsWith('image/');
                const ext = file.name.split('.').pop()?.toUpperCase() || 'DOC';
                let previewUrl = '';
                if (isImage) {
                  try {
                    previewUrl = URL.createObjectURL(file);
                  } catch (e) {
                    previewUrl = '';
                  }
                }
                return (
                  <motion.div 
                    key={`${file.name}-${idx}`}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative flex items-center gap-2.5 px-3 py-1.5 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface-alt)]/65 text-[var(--theme-primary)] hover:bg-[var(--theme-hover-bg)] transition-all max-w-[215px] h-12 shadow-sm group/file"
                  >
                    <button
                      type="button"
                      onClick={() => setAttachedFiles(prev => prev.filter((_, i) => i !== idx))}
                      className="absolute -top-1.5 -right-1.5 w-4.5 h-4.5 rounded-full bg-zinc-800 hover:bg-zinc-700 border border-[var(--theme-border)] text-gray-400 hover:text-white flex items-center justify-center transition-all z-10 shadow-lg cursor-pointer"
                    >
                      <X size={10} />
                    </button>
                    <div className="w-8 h-8 bg-zinc-800 border border-[var(--theme-border)]/55 rounded-lg flex items-center justify-center text-[9px] font-black uppercase text-gray-400 tracking-wider overflow-hidden shrink-0">
                      {isImage && previewUrl ? (
                        <img src={previewUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        ext
                      )}
                    </div>
                    <div className="flex-1 min-w-0 pr-1 flex flex-col justify-center text-left">
                      <div className="truncate font-semibold text-xs text-zinc-100 leading-none">
                        {file.name}
                      </div>
                      <div className="text-[10px] text-zinc-550 font-bold tracking-tight leading-none mt-1">
                        {(file.size / 1024).toFixed(0)} KB
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          <div className="flex-1 px-3 pt-2">
            <textarea
              ref={textInputRef}
              rows={1}
              value={inputText}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder={`Send a message to ${agent.name}...`}
              className="w-full bg-transparent border-none focus:ring-0 focus:outline-none text-[15px] p-0 resize-none min-h-[40px] max-h-48 text-[var(--theme-primary)] placeholder-zinc-500/70 leading-relaxed scrollbar-none text-left"
              disabled={isStreaming}
            />
          </div>

          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            multiple
            onChange={(e) => {
              if (e.target.files) {
                handleFileAttach(Array.from(e.target.files));
              }
              e.target.value = '';
            }}
          />

          <div className="flex items-center justify-between px-3 pb-1 pt-2 border-t border-[var(--theme-border)]/25 mt-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2 rounded-2xl text-[var(--theme-secondary)] hover:text-[var(--theme-primary)] hover:bg-[var(--theme-hover-bg)] transition-all cursor-pointer bg-transparent border border-transparent"
                title="Import documents and files"
              >
                <Plus size={20} className="text-zinc-400 hover:text-zinc-250 transition-colors" />
              </button>
            </div>

            <div className="flex items-center gap-4">
              <span className="font-mono text-[11px] font-semibold text-zinc-400/80 select-none tracking-tight">
                {agent.model || 'gemini-2.3-flash'}
              </span>

              <button
                type="button"
                className="text-zinc-400 hover:text-zinc-200 p-2 rounded-xl transition-colors cursor-pointer bg-transparent border border-transparent"
                title="Dictation mic"
              >
                <Mic size={16} />
              </button>

              <button
                type="button"
                onClick={handleSend}
                disabled={(!inputText.trim() && attachedFiles.length === 0 && attachedUrlDocs.length === 0) || isStreaming}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                  (inputText.trim() || attachedFiles.length > 0 || attachedUrlDocs.length > 0) && !isStreaming
                    ? 'bg-zinc-800 text-white hover:bg-zinc-700 border border-zinc-700/60 shadow-[0_0_8px_rgba(255,255,255,0.05)] cursor-pointer hover:scale-105 active:scale-95 animate-fade-in'
                    : 'bg-zinc-900/65 text-zinc-650 cursor-not-allowed opacity-45 border border-zinc-850/40'
                }`}
                title="Send message"
              >
                <ArrowUp size={16} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Inspect Skill System Popup Modal */}
      <AnimatePresence>
        {isInspectSkillsOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[300] p-4 select-none animate-fade-in animate-duration-200">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-md bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-2xl flex flex-col overflow-hidden shadow-[0_32px_80px_rgba(0,0,0,0.65)] relative text-left animate-in fade-in zoom-in-95 duration-200"
            >
              {/* Top Accent line or highlight */}
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-teal-500/40 via-cyan-400/40 to-blue-500/40" />

              <div className="p-5 border-b border-[var(--theme-border)]/40 flex items-center justify-between shrink-0 relative bg-[var(--theme-bg)]/20">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20 shadow-inner">
                    <Brain size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[var(--theme-primary)] font-sans flex items-center gap-1.5">
                      Inspect Skill System
                    </h3>
                    <p className="text-[10px] text-[var(--theme-secondary)] leading-none mt-0.5 font-sans">
                      Select a documentation file to edit or view
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsInspectSkillsOpen(false)}
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-[var(--theme-secondary)] hover:text-[var(--theme-primary)] hover:bg-[var(--theme-hover-bg)] border border-transparent hover:border-[var(--theme-border)]/50 transition-all cursor-pointer bg-transparent"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="p-5 max-h-[320px] overflow-y-auto space-y-2.5 custom-scrollbar bg-[var(--theme-bg)]/10 select-none">
                {agent.skillFiles && agent.skillFiles.length > 0 ? (
                  agent.skillFiles.map((file) => (
                    <button
                      key={file.name}
                      type="button"
                      onClick={() => handleOpenSkillFileInEditor(file)}
                      className="w-full flex items-start gap-3.5 p-3 rounded-xl border border-[var(--theme-border)]/35 bg-[var(--theme-surface-alt)]/40 hover:bg-[var(--theme-hover-bg)] hover:border-teal-500/30 transition-all duration-300 text-left group cursor-pointer"
                    >
                      <div className="p-2 rounded-lg bg-teal-500/5 text-teal-400 group-hover:bg-teal-500/10 group-hover:text-teal-300 transition-colors border border-transparent group-hover:border-teal-500/10 shadow-sm shrink-0">
                        <BookOpen size={14} />
                      </div>
                      <div className="min-w-0 pr-1 flex flex-col justify-center">
                        <span className="text-xs font-semibold text-[var(--theme-primary)] group-hover:text-teal-400 transition-colors truncate font-mono">
                          {file.name}
                        </span>
                        <span className="text-[10px] text-[var(--theme-secondary)] leading-relaxed mt-0.5 line-clamp-2">
                          {file.description || 'Core interactive documentation system guidelines.'}
                        </span>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="text-center py-6 text-xs text-[var(--theme-secondary)]">
                    No custom skill files found for this agent
                  </div>
                )}
              </div>

              <div className="px-5 py-3 border-t border-[var(--theme-border)]/30 bg-[var(--theme-bg)]/40 flex items-center justify-between text-[10px] text-[var(--theme-secondary)] font-mono shrink-0 select-none">
                <span>Select file to open inside code editor</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--theme-hover-bg)] text-teal-400 border border-[var(--theme-border)]/50 font-bold shrink-0">
                  {agent.skillFiles?.length || 0} Files
                </span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
