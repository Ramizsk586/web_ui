import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Send, Trash2, Edit, Terminal, Bot, Settings, Globe, Brain, Box, HardDrive, BookOpen, Link, Image, ChevronDown, Wand2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Agent, AgentMessage } from '../../agents/types';
import { runAgent } from '../../agents/agentRunner';
import { MessageItem } from '../Chat/MessageItem';
import { AgentToolBadge } from './AgentToolBadge';
import { AgentAvatar } from './AgentAvatar';

interface AgentChatViewProps {
  agent: Agent;
  onBack: () => void;
  onUpdateAgent: (patch: Partial<Agent>) => void;
  onEditAgent: () => void;
  markdownComponents?: any;
  userProfile?: any;
  persona?: any;
}

export function AgentChatView({
  agent,
  onBack,
  onUpdateAgent,
  onEditAgent,
  markdownComponents,
  userProfile,
  persona,
}: AgentChatViewProps) {
  const [inputText, setInputText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [showOptions, setShowOptions] = useState(false);
  const [showSystemPrompt, setShowSystemPrompt] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const optionsRef = useRef<HTMLDivElement>(null);
  const textInputRef = useRef<HTMLTextAreaElement>(null);

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
    if (!text || isStreaming) return;

    setInputText('');
    if (textInputRef.current) {
      textInputRef.current.style.height = 'auto';
    }

    const userMsg: AgentMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };

    // Update state & persistence
    const updatedHistory = [...agent.chatHistory, userMsg];
    onUpdateAgent({ chatHistory: updatedHistory });

    setIsStreaming(true);
    setStreamingText('');

    try {
      await runAgent({
        agent,
        userMessage: text,
        history: agent.chatHistory,
        onToken: (token) => {
          setStreamingText(prev => prev + token);
        },
        onDone: (fullText) => {
          const assistantMsg: AgentMessage = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: fullText,
            timestamp: Date.now(),
          };
          onUpdateAgent({ chatHistory: [...updatedHistory, assistantMsg] });
          setIsStreaming(false);
          setStreamingText('');
        },
        onError: (err) => {
          const systemErrorMsg: AgentMessage = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: `❌ **Agent Call Failed**:\n\n${err}\n\nPlease verify that your API endpoint has valid credentials in **Settings > Secrets**.`,
            timestamp: Date.now(),
          };
          onUpdateAgent({ chatHistory: [...updatedHistory, systemErrorMsg] });
          setIsStreaming(false);
          setStreamingText('');
        }
      });
    } catch {
      setIsStreaming(false);
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

  // Adjust textarea height automatically
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    if (textInputRef.current) {
      textInputRef.current.style.height = 'auto';
      textInputRef.current.style.height = `${Math.min(textInputRef.current.scrollHeight, 200)}px`;
    }
  };

  // Render Skill badges from active agent skills
  const renderSkillBadges = () => {
    const activeSkills = agent.skills.filter(s => s.enabled);
    if (activeSkills.length === 0) return null;

    const skillIcons: Record<string, React.ReactNode> = {
      web_browsing: <Globe size={9} />,
      memory: <Brain size={9} />,
      artifacts: <Box size={9} />,
      code_execution: <Terminal size={9} />,
      image_generation: <Image size={9} />,
      file_read_write: <HardDrive size={9} />,
      wiki_search: <BookOpen size={9} />,
      web_scraper: <Link size={9} />,
    };

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
    <div className="flex flex-col h-full bg-zinc-950 text-zinc-100 overflow-hidden relative">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-900 bg-zinc-900/40 relative z-20 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onBack}
            className="p-1.5 hover:bg-zinc-800 rounded-xl text-zinc-400 hover:text-white transition-colors cursor-pointer"
            title="Back to generic chat"
          >
            <ArrowLeft size={16} />
          </button>
          
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`flex items-center justify-center w-8 h-8 rounded-xl shrink-0 p-1.5 shadow-sm ${agent.avatarColor}`}>
              <AgentAvatar emoji={agent.avatarEmoji} className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col text-left min-w-0">
              <span className="text-xs font-bold truncate text-white leading-tight flex items-center gap-1.5">
                {agent.name}
              </span>
              <span className="text-[10px] text-zinc-500 truncate leading-snug">
                {agent.description || 'Custom AI Agent'}
              </span>
            </div>
          </div>
        </div>

        {/* Skill Badges + Settings Menu */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="hidden sm:block">
            {renderSkillBadges()}
          </div>
          
          {/* Menu Trigger */}
          <div className="relative" ref={optionsRef}>
            <button
              onClick={() => setShowOptions(!showOptions)}
              className="p-1.5 hover:bg-zinc-800 rounded-xl text-zinc-400 hover:text-white transition-colors cursor-pointer"
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
                  className="absolute right-0 mt-1.5 w-44 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl z-50 overflow-hidden py-1"
                >
                  <button
                    onClick={() => {
                      setShowOptions(false);
                      onEditAgent();
                    }}
                    disabled={agent.isBuiltin}
                    className="flex items-center gap-2 w-full text-left px-3 py-2 text-[11px] text-zinc-350 hover:text-white hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:hover:bg-transparent"
                  >
                    <Edit size={12} className="text-zinc-400" />
                    Edit Agent Details
                  </button>
                  <button
                    onClick={() => {
                      setShowOptions(false);
                      setShowSystemPrompt(!showSystemPrompt);
                    }}
                    className="flex items-center gap-2 w-full text-left px-3 py-2 text-[11px] text-zinc-350 hover:text-white hover:bg-zinc-800 transition-colors"
                  >
                    <Terminal size={12} className="text-zinc-400" />
                    {showSystemPrompt ? 'Hide Prompt' : 'View System Prompt'}
                  </button>
                  <button
                    onClick={handleClearHistory}
                    className="flex items-center gap-2 w-full text-left px-3 py-2 text-[11px] text-rose-400 hover:text-rose-300 hover:bg-rose-950/20 transition-colors"
                  >
                    <Trash2 size={12} className="text-rose-400" />
                    Clear Chat History
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

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
      <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar select-text">
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
          // Map historical message schema to fit MessageItem structure
          const formattedMsg = {
            id: msg.id,
            role: msg.role === 'tool' ? 'assistant' : msg.role,
            content: msg.content,
            timestamp: new Date(msg.timestamp),
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
        {isStreaming && streamingText && (
          <MessageItem
            message={{
              id: 'streaming-assistant',
              role: 'assistant',
              content: streamingText,
              timestamp: new Date(),
              isStreaming: true,
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

        {/* Simple typing loader bubble when awaiting response */}
        {isStreaming && !streamingText && (
          <div className="flex gap-3 justify-start items-start select-none">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center p-1.5 shrink-0 ${agent.avatarColor}`}>
              <AgentAvatar emoji={agent.avatarEmoji} className="w-5 h-5 text-white" />
            </div>
            <div className="p-3 bg-zinc-900/60 rounded-2xl border border-zinc-900 text-xs text-zinc-500 flex items-center gap-1.5 shadow-sm">
              <span className="animate-pulse">Analyzing inputs</span>
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

      {/* Footer Chat Input Form */}
      <div className="p-4 border-t border-zinc-900 bg-zinc-950 shrink-0">
        <div className="relative flex items-end gap-2 max-w-3xl mx-auto">
          <div className="relative flex-1 bg-zinc-900/80 rounded-2xl border border-zinc-800 overflow-hidden shadow-inner focus-within:border-zinc-750 transition-colors">
            <textarea
              ref={textInputRef}
              rows={1}
              value={inputText}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder={`Send a message to ${agent.name}...`}
              className="w-full pl-4 pr-12 py-3.5 bg-transparent border-0 outline-none resize-none text-xs text-zinc-100 placeholder-zinc-550 leading-relaxed scrollbar-none max-h-48"
              disabled={isStreaming}
            />

            {/* Float send icon inside input frame */}
            <div className="absolute right-2.5 bottom-2.5">
              <button
                onClick={handleSend}
                disabled={!inputText.trim() || isStreaming}
                className={`p-2 rounded-xl transition-all duration-200 cursor-pointer ${
                  inputText.trim() && !isStreaming
                    ? 'bg-zinc-100 hover:bg-white text-black'
                    : 'bg-zinc-850 text-zinc-650 opacity-40 cursor-not-allowed'
                }`}
              >
                <Send size={12} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
