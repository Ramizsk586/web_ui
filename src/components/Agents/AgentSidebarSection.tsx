import React, { useState } from 'react';
import { Bot, ChevronDown, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Agent } from '../../agents/types';
import { AgentCard } from './AgentCard';

interface AgentSidebarSectionProps {
  agents: Agent[];
  activeAgentId: string | null;
  onSelectAgent: (agent: Agent) => void;
  onCreateAgent: () => void;
  onDeleteAgent: (id: string) => void;
  onEditAgent: (agent: Agent) => void;
}

export function AgentSidebarSection({
  agents,
  activeAgentId,
  onSelectAgent,
  onCreateAgent,
  onDeleteAgent,
  onEditAgent,
}: AgentSidebarSectionProps) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="border-b border-zinc-900/60 pb-3 mb-3">
      {/* Collapsible Header Row */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-3 py-1.5 text-[10px] font-bold text-zinc-500 uppercase tracking-widest hover:text-zinc-300 transition-colors select-none cursor-pointer"
      >
        <span className="flex items-center gap-1.5 font-sans">
          <Bot size={11} className="text-zinc-400" />
          Agents
        </span>
        <ChevronDown
          size={11}
          className={`transition-transform duration-250 ease-out-sine ${
            isOpen ? 'rotate-0' : '-rotate-90'
          }`}
        />
      </button>

      {/* Collapsible Agent List Body */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden px-1.5 mt-1"
          >
            {/* List with max-height scroll if content overflows */}
            <div className="overflow-y-auto max-h-56 pr-0.5 space-y-0.5 custom-scrollbar">
              {agents.map(agent => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  isActive={activeAgentId === agent.id}
                  onClick={() => onSelectAgent(agent)}
                  onDelete={onDeleteAgent}
                  onEdit={onEditAgent}
                />
              ))}
            </div>

            {/* "+ Create Agent" Trigger Button */}
            <button
              onClick={onCreateAgent}
              className="flex items-center gap-2.5 w-full mt-1.5 py-1.5 px-3 rounded-xl border border-dashed border-zinc-800 text-[11px] font-semibold text-zinc-500 hover:text-zinc-200 hover:border-zinc-700 hover:bg-zinc-900/40 transition-all duration-200 cursor-pointer text-left"
            >
              <div className="flex items-center justify-center w-5 h-5 rounded-lg bg-zinc-900 border border-zinc-800 shrink-0 text-zinc-500 hover:text-zinc-300">
                <Plus size={10} />
              </div>
              <span>Create Agent</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
