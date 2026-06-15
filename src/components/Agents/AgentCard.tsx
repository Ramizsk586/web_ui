import React, { useState, useRef, useEffect } from 'react';
import { MoreHorizontal, Edit, Trash, Bot, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Agent } from '../../agents/types';
import { AgentAvatar } from './AgentAvatar';

interface AgentCardProps {
  agent: Agent;
  isActive: boolean;
  onClick: () => void;
  onDelete: (id: string) => void;
  onEdit: (agent: Agent) => void;
}

export function AgentCard({ agent, isActive, onClick, onDelete, onEdit }: AgentCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on click outside
  useEffect(() => {
    if (!showMenu) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  return (
    <div
      onClick={onClick}
      className={`relative group flex items-center justify-between py-1.5 px-2.5 my-0.5 rounded-lg cursor-pointer transition-all duration-200 select-none ${
        isActive
          ? 'bg-zinc-800 text-white font-medium border border-zinc-700/60'
          : 'text-zinc-300 hover:bg-zinc-900/60 hover:text-zinc-100 border border-transparent'
      }`}
    >
      {/* Left section: SVG avatar & Details */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <div
          className={`flex items-center justify-center w-6 h-6 rounded-lg shrink-0 p-1 shadow-sm ${
            agent.avatarColor || 'bg-violet-500'
          }`}
        >
          <AgentAvatar emoji={agent.avatarEmoji || '🤖'} className="w-4 h-4 text-white" />
        </div>
        <div className="flex flex-col min-w-0 text-left">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold leading-relaxed truncate text-zinc-100 group-hover:text-white">
              {agent.name}
            </span>
            {agent.isBuiltin && (
              <span className="text-[9px] px-1 py-0.2 bg-zinc-700/60 text-zinc-400 rounded border border-zinc-650 shrink-0">
                System
              </span>
            )}
          </div>
          <span className="text-[10px] text-zinc-500 truncate leading-snug">
            {agent.description || 'Custom AI Agent'}
          </span>
        </div>
      </div>

      {/* Right section: Action menu button */}
      {!agent.isBuiltin && (
        <div className="relative shrink-0 ml-1" ref={menuRef} onClick={e => e.stopPropagation()}>
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-750 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 cursor-pointer"
          >
            <MoreHorizontal size={13} />
          </button>

          <AnimatePresence>
            {showMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -5 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -5 }}
                transition={{ duration: 0.12 }}
                className="absolute right-0 mt-1.5 w-28 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl z-50 overflow-hidden py-1"
              >
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onEdit(agent);
                  }}
                  className="flex items-center gap-2 w-full text-left px-2.5 py-1.5 text-[11px] text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
                >
                  <Edit size={11} className="text-zinc-400" />
                  Edit Agent
                </button>
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onDelete(agent.id);
                  }}
                  className="flex items-center gap-2 w-full text-left px-2.5 py-1.5 text-[11px] text-rose-400 hover:text-rose-300 hover:bg-rose-950/20 transition-colors"
                >
                  <Trash size={11} className="text-rose-400" />
                  Delete
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
