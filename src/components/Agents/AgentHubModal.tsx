import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, X, Bot, Edit, Trash2, ArrowRight } from 'lucide-react';
import { Agent } from '../../agents/types';
import { AgentAvatar } from './AgentAvatar';

interface AgentHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  agents: Agent[];
  activeAgentId: string | null;
  onSelectAgent: (agent: Agent) => void;
  onDeleteAgent: (id: string) => void;
  onEditAgent: (agent: Agent) => void;
  onCreateAgent: () => void;
}

export function AgentHubModal({
  isOpen,
  onClose,
  agents,
  activeAgentId,
  onSelectAgent,
  onDeleteAgent,
  onEditAgent,
  onCreateAgent,
}: AgentHubModalProps) {
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const filteredAgents = agents.filter(agent => {
    const query = searchQuery.toLowerCase();
    return (
      agent.name.toLowerCase().includes(query) ||
      (agent.description || '').toLowerCase().includes(query)
    );
  });

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center z-[300] p-4 select-none">
        {/* Backdrop clickable to close */}
        <div className="absolute inset-0" onClick={onClose} />

        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: 12 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-2xl bg-[var(--theme-surface)] border border-[var(--theme-border)]/80 rounded-2xl flex flex-col overflow-hidden shadow-[0_32px_80px_rgba(0,0,0,0.7)] relative text-left z-10"
        >
          {/* Header */}
          <div className="p-5 border-b border-[var(--theme-border)]/40 flex items-center justify-between shrink-0 relative bg-[var(--theme-bg)]/10">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 shadow-inner">
                <Bot size={16} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[var(--theme-primary)] font-sans">
                  Agent Hub
                </h3>
                <p className="text-[10px] text-[var(--theme-secondary)] leading-none mt-0.5 font-sans">
                  Select an assistant to open in your active workspace
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--theme-secondary)] hover:text-[var(--theme-primary)] hover:bg-[var(--theme-hover-bg)] border border-transparent hover:border-[var(--theme-border)]/50 transition-all cursor-pointer bg-transparent"
            >
              <X size={14} />
            </button>
          </div>

          {/* Search bar & Controls */}
          <div className="p-4 border-b border-[var(--theme-border)]/30 bg-[var(--theme-bg)]/20 flex flex-col sm:flex-row gap-3 items-center shrink-0">
            <div className="relative flex-1 w-full">
              <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--theme-secondary)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search assistant name, description..."
                className="w-full pl-9 pr-4 py-2 bg-[var(--theme-input-bg)] border border-[var(--theme-input-border)] focus:border-[var(--theme-accent)]/45 focus:outline-none rounded-xl text-xs text-[var(--theme-primary)] placeholder-[var(--theme-secondary)]/60 transition-all font-sans"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--theme-secondary)] hover:text-[var(--theme-primary)]"
                >
                  <X size={11} />
                </button>
              )}
            </div>

            <button
              onClick={() => {
                onClose();
                onCreateAgent();
              }}
              className="w-full sm:w-auto px-4.5 py-2 bg-zinc-100 hover:bg-white text-zinc-950 font-bold text-xs rounded-xl shadow-sm hover:shadow transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer border border-white/20 active:scale-[0.98]"
            >
              <span>Create Agent</span>
            </button>
          </div>

          {/* Grid list container */}
          <div className="p-4 max-h-[360px] overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-3 custom-scrollbar bg-[var(--theme-bg)]/5">
            {filteredAgents.length > 0 ? (
              filteredAgents.map(agent => {
                const isActive = activeAgentId === agent.id;
                return (
                  <div
                    key={agent.id}
                    onClick={() => {
                      onSelectAgent(agent);
                      onClose();
                    }}
                    className={`group relative flex flex-col justify-between p-4 rounded-xl border transition-all duration-200 text-left cursor-pointer ${
                      isActive
                        ? 'bg-[var(--theme-hover-bg)] border-[var(--theme-accent)]/50 shadow-md ring-1 ring-[var(--theme-accent)]/10'
                        : 'bg-[var(--theme-surface-alt)]/30 border-[var(--theme-border)]/40 hover:border-zinc-700 hover:bg-[var(--theme-hover-bg)] hover:shadow-xs'
                    }`}
                  >
                    {/* Top Row: Avatar & Metadata */}
                    <div className="flex gap-2.5 items-start">
                      <div className={`w-8.5 h-8.5 rounded-lg shrink-0 flex items-center justify-center p-1.5 shadow-xs ${agent.avatarColor}`}>
                        <AgentAvatar emoji={agent.avatarEmoji} className="w-5 h-5 text-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="text-xs font-bold text-[var(--theme-primary)] group-hover:text-[var(--theme-accent)] transition-colors truncate">
                            {agent.name}
                          </h4>
                          {agent.isBuiltin && (
                            <span className="text-[9px] px-1.5 py-0.2 bg-zinc-850 border border-zinc-800 text-zinc-400 rounded font-mono shrink-0">
                              System
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-[var(--theme-secondary)] truncate leading-relaxed mt-0.5">
                          {agent.model}
                        </p>
                      </div>
                    </div>

                    {/* Middle: Description & Skills */}
                    <p className="text-[10.5px] text-[var(--theme-secondary)] leading-relaxed mt-2.5 line-clamp-2 min-h-[32px]">
                      {agent.description || 'Custom assistant configured to handle specialized prompts.'}
                    </p>

                    {agent.skills && agent.skills.filter(s => s.enabled).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {agent.skills
                          .filter(s => s.enabled)
                          .slice(0, 3)
                          .map(s => (
                            <span
                              key={s.id}
                              className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--theme-surface)] border border-[var(--theme-border)]/35 text-[var(--theme-secondary)] font-sans"
                            >
                              {s.name}
                            </span>
                          ))}
                        {agent.skills.filter(s => s.enabled).length > 3 && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--theme-surface)] border border-[var(--theme-border)]/35 text-[var(--theme-secondary)] font-mono">
                            +{agent.skills.filter(s => s.enabled).length - 3}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Bottom row action controls */}
                    <div className="flex items-center justify-between border-t border-[var(--theme-border)]/20 mt-3 pt-3 gap-2">
                      <span className="text-[9px] text-[var(--theme-secondary)] shrink-0 font-mono">
                        {agent.chatHistory?.length || 0} chats
                      </span>

                      <div className="flex items-center gap-1 ml-auto" onClick={e => e.stopPropagation()}>
                        {!agent.isBuiltin && (
                          <>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onEditAgent(agent);
                              }}
                              className="p-1.5 rounded-lg text-[var(--theme-secondary)] hover:text-[var(--theme-primary)] hover:bg-[var(--theme-hover-bg)] border border-transparent hover:border-[var(--theme-border)]/50 transition-all cursor-pointer"
                              title="Edit Agent"
                            >
                              <Edit size={11} />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteAgent(agent.id);
                              }}
                              className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-950/20 border border-transparent hover:border-rose-950/40 transition-all cursor-pointer"
                              title="Delete Agent"
                            >
                              <Trash2 size={11} />
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            onSelectAgent(agent);
                            onClose();
                          }}
                          className="flex items-center gap-1 py-1 px-2.5 rounded-lg bg-[var(--theme-hover-bg)] hover:bg-zinc-800 text-zinc-300 hover:text-white font-bold border border-[var(--theme-border)]/65 hover:border-zinc-700 text-[10px] transition-all cursor-pointer"
                        >
                          <span>Chat</span>
                          <ArrowRight size={8} className="text-zinc-400" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="col-span-full text-center py-10">
                <p className="text-xs text-[var(--theme-secondary)]">
                  No assistants matched your search query
                </p>
              </div>
            )}
          </div>

          {/* Footer info strip */}
          <div className="px-5 py-3 border-t border-[var(--theme-border)]/30 bg-[var(--theme-bg)]/40 flex items-center justify-between text-[10px] text-[var(--theme-secondary)] font-mono shrink-0 select-none">
            <span>Click any assistant to launch interactive chat workspace</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 font-bold shrink-0">
              {agents.length} Total Assistants
            </span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
