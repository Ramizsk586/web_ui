import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Search, Trash2, Plus, MessageSquare, Clock, Sliders } from 'lucide-react';
import { Chat } from '../types';

interface ChatsManagerPanelProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;            // The header title e.g., "Chats"
  contextName: string;      // Name of Project or Agent e.g., "Web Assistant", "k"
  chats: Chat[];
  currentChatId: string | null;
  onSelectChat: (chatId: string) => void;
  onDeleteChat: (chatId: string) => void;
  onCreateNewChat: () => void;
}

export function ChatsManagerPanel({
  isOpen,
  onClose,
  title,
  contextName,
  chats,
  currentChatId,
  onSelectChat,
  onDeleteChat,
  onCreateNewChat,
}: ChatsManagerPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedChatIds, setSelectedChatIds] = useState<Record<string, boolean>>({});

  if (!isOpen) return null;

  // Filter chats by search query
  const filteredChats = chats.filter(chat =>
    chat.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Formatter for relative timestamps matching user mockups
  const formatRelativeTime = (updatedAt: any): string => {
    if (!updatedAt) return 'some time ago';
    const date = updatedAt instanceof Date ? updatedAt : new Date(updatedAt);
    const diffMs = Date.now() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  const toggleSelectChat = (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedChatIds(prev => ({
      ...prev,
      [chatId]: !prev[chatId]
    }));
  };

  const handleDeleteSelected = () => {
    const idsToDelete = Object.keys(selectedChatIds).filter(id => selectedChatIds[id]);
    if (idsToDelete.length === 0) return;
    
    if (confirm(`Are you sure you want to delete the ${idsToDelete.length} selected chat(s)?`)) {
      idsToDelete.forEach(id => onDeleteChat(id));
      setSelectedChatIds({});
      setIsSelectMode(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-xs"
        />

        {/* Modal body matching mockups exactly */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="relative w-full max-w-4xl h-[75vh] bg-[#141412] text-zinc-100 rounded-3xl border border-zinc-800/80 shadow-2xl flex flex-col overflow-hidden font-sans"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header segment matching Photo 3 */}
          <div className="p-6 pb-2 shrink-0 flex items-center justify-between border-b border-zinc-800/20">
            <div className="flex flex-col">
              <h2 className="text-2xl font-semibold text-white tracking-tight flex items-center gap-2">
                {title}             
              </h2>
              <span className="text-[10px] uppercase tracking-widest text-[#93c5fd] font-bold mt-1 bg-blue-950/40 px-2 py-0.5 rounded-full border border-blue-900/35 self-start">
                {contextName}
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={() => {
                  if (isSelectMode) {
                    handleDeleteSelected();
                  } else {
                    setIsSelectMode(true);
                  }
                }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-xl border border-zinc-800 transition-all cursor-pointer ${
                  isSelectMode 
                    ? 'bg-red-950/40 text-red-400 hover:bg-red-900/20 border-red-900/30' 
                    : 'bg-zinc-900 text-zinc-300 hover:bg-zinc-850 hover:text-white'
                }`}
              >
                {isSelectMode ? 'Delete selected' : 'Select chats'}
              </button>

              {isSelectMode && (
                <button
                  onClick={() => {
                    setIsSelectMode(false);
                    setSelectedChatIds({});
                  }}
                  className="px-3 py-1.5 text-xs font-semibold bg-zinc-900 text-zinc-300 hover:bg-zinc-850 hover:text-white rounded-xl border border-zinc-800 transition-all cursor-pointer"
                >
                  Cancel
                </button>
              )}

              <button
                onClick={() => {
                  onCreateNewChat();
                  onClose();
                }}
                className="px-3.5 py-1.5 text-xs font-black bg-white hover:bg-zinc-100 text-black rounded-xl transition-all shadow-sm cursor-pointer"
              >
                New chat
              </button>

              <button
                onClick={onClose}
                className="ml-2 p-1.5 hover:bg-zinc-900 border border-transparent hover:border-zinc-800 rounded-xl text-zinc-400 hover:text-white transition-all cursor-pointer"
                title="Close overlay"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Search bar matching center elements in Photo 3 */}
          <div className="px-6 py-4 shrink-0">
            <div className="relative w-full">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder="Search chats..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-11 pl-11 pr-4 bg-zinc-900/40 border border-zinc-850 rounded-xl text-xs outline-none text-zinc-100 placeholder:text-zinc-500 focus:ring-1 focus:ring-zinc-655 focus:border-zinc-700 transition-all"
                autoFocus
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-zinc-500 hover:text-white rounded-full transition-colors"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Chat List Segment */}
          <div className="flex-1 overflow-y-auto px-6 pb-6 custom-scrollbar space-y-1">
            {filteredChats.length > 0 ? (
              <div className="divide-y divide-zinc-900/40">
                {filteredChats.map((chat) => {
                  const isSelected = selectedChatIds[chat.id];
                  const isActive = currentChatId === chat.id;

                  return (
                    <div
                      key={chat.id}
                      onClick={() => {
                        if (isSelectMode) {
                          setSelectedChatIds(prev => ({ ...prev, [chat.id]: !prev[chat.id] }));
                        } else {
                          onSelectChat(chat.id);
                          onClose();
                        }
                      }}
                      className={`group flex items-center justify-between p-4 rounded-xl transition-all cursor-pointer ${
                        isActive
                          ? 'bg-zinc-900/70 border border-zinc-800/40'
                          : 'hover:bg-zinc-900/30'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {isSelectMode ? (
                          <input
                            type="checkbox"
                            checked={!!isSelected}
                            onChange={() => {}} // handled by parent click
                            className="rounded border-zinc-700 text-blue-500 focus:ring-blue-500/20 focus:ring-opacity-50 select-none bg-zinc-800 h-4 w-4 shrink-0 pointer-events-none cursor-pointer"
                          />
                        ) : (
                          <MessageSquare
                            size={16}
                            className={`shrink-0 ${
                              isActive ? 'text-blue-400' : 'text-zinc-500'
                            }`}
                          />
                        )}

                        <div className="min-w-0 flex-1">
                          <span className={`text-[13px] font-medium block truncate ${isActive ? 'text-white' : 'text-zinc-300 group-hover:text-white'}`}>
                            {chat.title}
                          </span>
                        </div>
                        
                        <div className="shrink-0 flex items-center block select-none">
                          <span className="text-[11px] text-zinc-500 dark:text-zinc-550 mr-4 font-mono">
                            {formatRelativeTime(chat.updatedAt)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                        {!isSelectMode && (
                          <button
                            onClick={() => {
                              if (confirm(`Are you sure you want to delete the chat "${chat.title}"?`)) {
                                onDeleteChat(chat.id);
                              }
                            }}
                            className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                            title="Delete chat"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center text-zinc-500">
                <MessageSquare size={32} className="text-zinc-700 mb-2.5 animate-pulse" />
                <p className="text-xs font-semibold">No chats found</p>
                <p className="text-[10px] text-zinc-650 mt-1">
                  {searchQuery ? 'Try matching something else' : 'Start a new conversation session to organize your thoughts.'}
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
