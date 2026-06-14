import React, { useState } from 'react';
import { 
  Bot, 
  Search, 
  X, 
  Plus, 
  Trash2, 
  Edit, 
  ArrowRight, 
  Sparkles, 
  BookOpen, 
  Wrench, 
  Terminal, 
  Cpu, 
  MessageSquare,
  MoreVertical
} from 'lucide-react';
import { Agent } from '../agents/types';
import { AgentAvatar } from './Agents/AgentAvatar';

interface AgentsPageProps {
  agents: Agent[];
  activeAgentId: string | null;
  onSelectAgent: (agent: Agent) => void;
  onDeleteAgent: (id: string) => void;
  onEditAgent: (agent: Agent) => void;
  onCreateAgent: () => void;
  onClose: () => void;
  showToast: (msg: string) => void;
  onOpenAgentChats?: (agent: Agent) => void;
}

export function AgentsPage({
  agents,
  activeAgentId,
  onSelectAgent,
  onDeleteAgent,
  onEditAgent,
  onCreateAgent,
  onClose,
  showToast,
  onOpenAgentChats
}: AgentsPageProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'custom' | 'builtin'>('all');
  const [activeMenuAgentId, setActiveMenuAgentId] = useState<string | null>(null);

  const handleSelectAgentAndClose = (agent: Agent) => {
    onSelectAgent(agent);
    onClose();
    showToast(`Loaded ${agent.name} Workspace`);
  };

  const handleDeleteWithConfirm = (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Are you sure you want to delete the custom assistant "${name}"? This action cannot be undone.`)) {
      onDeleteAgent(id);
      showToast(`Assistant "${name}" was successfully deleted.`);
    }
  };

  const handleEditAndClose = (agent: Agent, e: React.MouseEvent) => {
    e.stopPropagation();
    onEditAgent(agent);
  };

  const filteredAgents = agents.filter(agent => {
    const matchesSearch = 
      agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (agent.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    if (filterType === 'custom') {
      return matchesSearch && !agent.isBuiltin;
    }
    if (filterType === 'builtin') {
      return matchesSearch && agent.isBuiltin;
    }
    return matchesSearch;
  });

  return (
    <div className="flex-1 overflow-y-auto px-6 py-8 custom-scrollbar bg-[var(--theme-bg)] flex flex-col items-center">
      <div className="w-full max-w-4xl space-y-8 pb-16">
        
        {/* Top Header Segment */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold font-serif tracking-tight text-[var(--theme-primary)] select-none">
              AI Assistant Playground
            </h1>
            <p className="text-xs text-[var(--theme-muted)] mt-1 select-none">
              Configure, manage, and engage with custom trained AI assistants
            </p>
          </div>
          
          <button
            onClick={onCreateAgent}
            style={{ backgroundColor: '#fafaf7' }}
            className="px-4 py-1.5 text-xs font-semibold text-black hover:bg-gray-100 dark:text-black rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-1.5 focus:outline-none"
          >
            <Plus size={14} />
            <span>New Assistant</span>
          </button>
        </div>

        {/* Filters and Search toolbar row */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--theme-muted)]" />
            <input
              type="text"
              placeholder="Search by intelligence name or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-11 pl-11 pr-4 bg-[var(--theme-surface-alt)]/40 border border-[var(--theme-border)] rounded-xl text-sm outline-none text-[var(--theme-primary)] placeholder:text-[var(--theme-muted)] focus:ring-1 focus:ring-[var(--theme-accent,#3b82f6)] focus:border-[var(--theme-accent,#3b82f6)] transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-[var(--theme-muted)] hover:text-[var(--theme-primary)] rounded-full transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 p-1 bg-[var(--theme-surface-alt)]/40 border border-[var(--theme-border)] rounded-xl font-sans shrink-0">
            <button
              onClick={() => setFilterType('all')}
              style={{ backgroundColor: filterType === 'all' ? '#ffffff' : undefined }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${filterType === 'all' ? 'text-black shadow-xs' : 'text-[var(--theme-muted)] hover:text-[var(--theme-primary)]'}`}
            >
              All
            </button>
            <button
              onClick={() => setFilterType('builtin')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${filterType === 'builtin' ? 'bg-white dark:bg-zinc-850 text-black dark:text-white shadow-xs' : 'text-[var(--theme-muted)] hover:text-[var(--theme-primary)]'}`}
            >
              System
            </button>
            <button
              onClick={() => setFilterType('custom')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${filterType === 'custom' ? 'bg-white dark:bg-zinc-850 text-black dark:text-white shadow-xs' : 'text-[var(--theme-muted)] hover:text-[var(--theme-primary)]'}`}
            >
              Custom
            </button>
          </div>
        </div>

        {/* Dynamic Cards Grid */}
        {filteredAgents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredAgents.map(agent => {
              const isActive = activeAgentId === agent.id;
              const enabledSkills = agent.skills?.filter(s => s.enabled) || [];

              return (
                <div
                  key={agent.id}
                  onClick={() => handleSelectAgentAndClose(agent)}
                  className={`group relative bg-[var(--theme-surface)] border ${isActive ? 'border-[var(--theme-accent,#3b82f6)] ring-1 ring-[var(--theme-accent,#3b82f6)]/10' : 'border-[var(--theme-border)] hover:border-[var(--theme-accent,#3b82f6)]/70'} p-5 rounded-2xl shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between min-h-[190px] overflow-hidden select-none`}
                >
                  <div>
                    {/* Character/Bot Profile Header */}
                    <div className="flex items-start gap-3.5">
                      <div className={`w-11 h-11 rounded-xl shrink-0 flex items-center justify-center shadow-sm text-white ${agent.avatarColor}`}>
                        <AgentAvatar emoji={agent.avatarEmoji} className="w-6.5 h-6.5" />
                      </div>
                      
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="text-base font-bold text-[var(--theme-primary)] group-hover:text-[var(--theme-accent,#3b82f6)] transition-colors truncate">
                            {agent.name}
                          </h3>
                          {agent.isBuiltin ? (
                            <span className="text-[9px] font-mono px-1.5 py-0.5 bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-500 dark:text-zinc-400 rounded-md font-bold shrink-0">
                              System
                            </span>
                          ) : (
                            <span className="text-[9px] font-mono px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-150 dark:border-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-md font-bold shrink-0">
                              Assistant
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 text-xs text-[var(--theme-secondary)] mt-0.5">
                          <Cpu size={12} className="text-[var(--theme-muted)] shrink-0" />
                          <span className="truncate font-mono text-[11px] text-[var(--theme-muted)]">
                            {agent.model}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Description Section */}
                    <p className="text-xs text-[var(--theme-secondary)] mt-3.5 leading-relaxed line-clamp-2 min-h-[36px]">
                      {agent.description || 'Dedicated digital intelligence playground configuration.'}
                    </p>

                    {/* Integrated Skills list */}
                    {enabledSkills.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {enabledSkills.slice(0, 4).map(skill => (
                          <span
                            key={skill.id}
                            className="inline-flex items-center gap-1 text-[9px] font-medium font-sans px-2 py-0.5 rounded-full bg-[var(--theme-surface-alt)] border border-[var(--theme-border)] text-[var(--theme-secondary)]"
                          >
                            <Wrench size={8} className="text-blue-500 shrink-0" />
                            {skill.name}
                          </span>
                        ))}
                        {enabledSkills.length > 4 && (
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-[var(--theme-surface-alt)] border border-[var(--theme-border)] text-[var(--theme-muted)] font-bold">
                            +{enabledSkills.length - 4} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Footer actions panel */}
                  <div className="mt-4 border-t border-[var(--theme-border)]/50 pt-3 flex items-center justify-between">
                    <span className="text-[10px] font-mono text-[var(--theme-muted)] flex items-center gap-1">
                      <MessageSquare size={12} className="text-zinc-500 shrink-0" />
                      {agent.chatHistory?.length || 0} session{agent.chatHistory?.length === 1 ? '' : 's'}
                    </span>

                    <div className="flex items-center gap-1.5 relative" onClick={(e) => e.stopPropagation()}>
                      {/* More actions trigger */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuAgentId(activeMenuAgentId === agent.id ? null : agent.id);
                        }}
                        className={`p-1.5 text-zinc-400 hover:text-zinc-655 dark:hover:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-xl border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700 transition-all cursor-pointer shrink-0 ${
                          activeMenuAgentId === agent.id ? 'bg-gray-100 dark:bg-zinc-850 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white' : ''
                        }`}
                        title="Assistant actions"
                      >
                        <MoreVertical size={13} />
                      </button>

                      {/* Dropdown Popover */}
                      {activeMenuAgentId === agent.id && (
                        <>
                          <div 
                            className="fixed inset-0 z-[180]" 
                            onClick={(ev) => {
                              ev.stopPropagation();
                              setActiveMenuAgentId(null);
                            }}
                          />
                          <div 
                            className="absolute bottom-full right-0 mb-1.5 w-44 bg-[#232320] border border-[#3e3e3b] rounded-xl shadow-xl py-1.5 z-[190] text-left text-white"
                            onClick={(ev) => ev.stopPropagation()}
                          >
                            <button
                              onClick={(ev) => {
                                ev.stopPropagation();
                                if (onOpenAgentChats) {
                                  onOpenAgentChats(agent);
                                }
                                setActiveMenuAgentId(null);
                              }}
                              className="w-full px-3.5 py-2 text-xs font-semibold hover:bg-white/10 transition-colors flex items-center gap-2.5 text-zinc-200 hover:text-white cursor-pointer"
                            >
                              <MessageSquare size={13} className="text-zinc-400" />
                              <span>Chats</span>
                            </button>

                            {!agent.isBuiltin && (
                              <>
                                <button
                                  onClick={(ev) => {
                                    ev.stopPropagation();
                                    handleEditAndClose(agent, ev);
                                    setActiveMenuAgentId(null);
                                  }}
                                  className="w-full px-3.5 py-2 text-xs font-semibold hover:bg-white/10 transition-colors flex items-center gap-2.5 text-zinc-200 hover:text-white cursor-pointer"
                                >
                                  <Edit size={13} className="text-zinc-400" />
                                  <span>Edit details</span>
                                </button>

                                <div className="border-b border-[#3e3e3b]/80 my-1" />

                                <button
                                  onClick={(ev) => {
                                    ev.stopPropagation();
                                    handleDeleteWithConfirm(agent.id, agent.name, ev);
                                    setActiveMenuAgentId(null);
                                  }}
                                  className="w-full px-3.5 py-2 text-xs font-semibold hover:bg-red-500/10 transition-colors flex items-center gap-2.5 text-red-400 hover:text-red-300 cursor-pointer"
                                >
                                  <Trash2 size={13} />
                                  <span>Delete</span>
                                </button>
                              </>
                            )}
                          </div>
                        </>
                      )}

                      <button
                        onClick={() => handleSelectAgentAndClose(agent)}
                        className="px-3.5 py-1.5 text-[10px] font-extrabold bg-[var(--theme-surface-alt)] hover:bg-[var(--theme-hover-bg)] text-[var(--theme-primary)] rounded-xl border border-[var(--theme-border)]/80 hover:border-zinc-500/50 transition-all cursor-pointer flex items-center gap-1"
                      >
                        <span>Chat</span>
                        <ArrowRight size={9} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-[var(--theme-border)] rounded-2xl py-12 px-4 bg-[var(--theme-surface-alt)]/25">
            <Bot size={36} className="text-[var(--theme-muted)] mb-3 animate-pulse" />
            <h3 className="text-sm font-semibold text-[var(--theme-primary)]">
              {searchQuery ? 'No matching assistants' : 'No custom assistants loaded'}
            </h3>
            <p className="text-xs text-[var(--theme-muted)] mt-1 max-w-sm">
              {searchQuery ? 'Change your search terms or filter constraints.' : 'Create a custom digital intelligence with dedicated context parameters, custom avatars, and system models.'}
            </p>
            {!searchQuery && (
              <button
                onClick={onCreateAgent}
                className="mt-4 px-3.5 py-1.5 text-xs font-semibold bg-[var(--theme-accent,#3b82f6)] text-white hover:bg-[var(--theme-accent,#3b82f6)]/90 rounded-xl transition-all shadow-sm cursor-pointer"
              >
                Create your first assistant
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
