/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Send, 
  Plus, 
  MessageSquare, 
  Sparkles, 
  User, 
  ArrowUp,
  Sidebar as SidebarIcon,
  Search,
  MoreVertical,
  Settings,
  Trash2,
  ChevronDown,
  HardDrive
} from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface Chat {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: Date;
}

interface SidebarProps {
  chats: Chat[];
  currentChatId: string | null;
  setCurrentChatId: (id: string | null) => void;
  createNewChat: () => void;
  setChats: React.Dispatch<React.SetStateAction<Chat[]>>;
  isCollapsed: boolean;
  onToggle: () => void;
  onOpenSettings: () => void;
}

const SidebarContent = ({ 
  chats, 
  currentChatId, 
  setCurrentChatId, 
  createNewChat, 
  setChats,
  onToggle,
  onOpenSettings
}: SidebarProps) => (
  <>
    <div className="flex items-center justify-between mb-8">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-black dark:bg-white flex items-center justify-center text-white dark:text-black">
          <Sparkles size={18} />
        </div>
        <span className="font-display font-semibold tracking-tight">Lumina</span>
      </div>
      <button 
        onClick={onToggle}
        className="p-1.5 hover:bg-gray-200 rounded-md transition-colors text-gray-500"
      >
        <SidebarIcon size={18} />
      </button>
    </div>

    <button 
      onClick={createNewChat}
      className="flex items-center gap-3 p-3 mb-6 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/5 rounded-xl shadow-sm hover:shadow-md hover:border-gray-300 dark:hover:border-white/10 transition-all text-sm font-medium dark:text-white"
    >
      <Plus size={18} />
      New chat
    </button>

    <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar">
      <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2 px-3">Recent</div>
      {chats.map(chat => (
        <div key={chat.id} className="group relative">
          <button
            onClick={() => setCurrentChatId(chat.id)}
            className={`w-full p-2.5 rounded-lg flex items-center gap-3 text-sm font-medium transition-colors pr-10 ${
              currentChatId === chat.id 
                ? 'bg-gray-200/50 text-black dark:text-white' 
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
            }`}
          >
            <MessageSquare size={16} className={currentChatId === chat.id ? 'text-black dark:text-white' : 'text-gray-400'} />
            <span className="truncate">{chat.title}</span>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setChats(prev => prev.filter(c => c.id !== chat.id));
              if (currentChatId === chat.id) setCurrentChatId(null);
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md opacity-0 group-hover:opacity-100 transition-all"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}
      {chats.length === 0 && (
        <div className="px-3 py-4 text-xs text-gray-400 italic">No recent chats</div>
      )}
    </div>

    <div className="mt-auto pt-4 border-t border-gray-200 space-y-1">
      <button 
        onClick={onOpenSettings}
        className="flex items-center gap-3 w-full p-2.5 hover:bg-gray-200/50 rounded-lg text-sm text-gray-600 transition-colors"
      >
        <Settings size={18} />
        Settings
      </button>
      <div className="p-2.5 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
          AR
        </div>
        <div className="flex-1 text-xs">
          <div className="font-semibold truncate">Abdur Ramiz</div>
          <div className="text-gray-400">Pro Plan</div>
        </div>
      </div>
    </div>
  </>
);

export default function App() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState<'general' | 'ai' | 'mcp'>('general');
  const [serverUrl, setServerUrl] = useState('https://api.lumina.ai/v1');
  const [apiKey, setApiKey] = useState('');
  const [mcpUrl, setMcpUrl] = useState('');
  const [mcpKey, setMcpKey] = useState('');
  const [isMcpConnected, setIsMcpConnected] = useState(false);
  const [isConnectingMcp, setIsConnectingMcp] = useState(false);
  const [selectedModel, setSelectedModel] = useState('lumina-ultra-plus');
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const headerMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsModelDropdownOpen(false);
      }
      if (headerMenuRef.current && !headerMenuRef.current.contains(event.target as Node)) {
        setIsHeaderMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const models = [
    { id: 'lumina-ultra-plus', name: 'Lumina Ultra Plus', icon: <Sparkles size={14} className="text-blue-500" /> },
    { id: 'lumina-pro-max', name: 'Lumina Pro Max', icon: <Plus size={14} className="text-purple-500" /> },
    { id: 'lumina-mini-flash', name: 'Lumina Mini Flash', icon: <ArrowUp size={14} className="text-orange-500" /> },
  ];

  const currentChat = chats.find(c => c.id === currentChatId);
  const messages = currentChat?.messages || [];

  // Apply theme to body
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const createNewChat = () => {
    const newChat: Chat = {
      id: Date.now().toString(),
      title: 'New chat',
      messages: [],
      updatedAt: new Date(),
    };
    setChats(prev => [newChat, ...prev]);
    setCurrentChatId(newChat.id);
    return newChat.id;
  };

  const handleSend = async (contentOverride?: string) => {
    const content = contentOverride || input.trim();
    if (!content) return;

    let chatId = currentChatId;
    if (!chatId) {
      chatId = createNewChat();
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: content,
      timestamp: new Date(),
    };

    // Update messages for current chat
    setChats(prev => prev.map(chat => {
      if (chat.id === chatId) {
        const newMessages = [...chat.messages, userMessage];
        return {
          ...chat,
          messages: newMessages,
          title: chat.messages.length === 0 ? content.slice(0, 30) + (content.length > 30 ? '...' : '') : chat.title,
          updatedAt: new Date(),
        };
      }
      return chat;
    }));

    setInput('');
    setIsTyping(true);

    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }

    // Simulate AI Response
    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `I've received your message: "${content}". This is a beautiful interface, don't you think? How can I assist you further?`,
        timestamp: new Date(),
      };
      
      setChats(prev => prev.map(chat => {
        if (chat.id === chatId) {
          return {
            ...chat,
            messages: [...chat.messages, assistantMessage],
            updatedAt: new Date(),
          };
        }
        return chat;
      }));
      setIsTyping(false);
    }, 1500);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const adjustTextareaHeight = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    setInput(textarea.value);
  };

  return (
    <div className={`flex h-screen w-full bg-white text-brand-primary overflow-hidden relative ${isDarkMode ? 'dark' : ''}`}>
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] md:hidden"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-72 bg-white border-r border-gray-100 z-[101] md:hidden flex flex-col p-4 shadow-2xl"
            >
              <SidebarContent 
                chats={chats} 
                currentChatId={currentChatId} 
                setCurrentChatId={(id) => {
                  setCurrentChatId(id);
                  setIsMobileMenuOpen(false);
                }} 
                createNewChat={createNewChat} 
                setChats={setChats}
                isCollapsed={false}
                onToggle={() => setIsMobileMenuOpen(false)}
                onOpenSettings={() => {
                  setIsSettingsOpen(true);
                  setIsMobileMenuOpen(false);
                }}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <motion.aside 
        animate={{ width: isSidebarOpen ? 260 : 0, opacity: isSidebarOpen ? 1 : 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className={`hidden md:flex flex-col border-r border-gray-100 bg-gray-50/50 relative overflow-hidden`}
      >
        <div className="w-[260px] h-full flex flex-col p-4">
          <SidebarContent 
            chats={chats} 
            currentChatId={currentChatId} 
            setCurrentChatId={setCurrentChatId} 
            createNewChat={createNewChat} 
            setChats={setChats}
            isCollapsed={false}
            onToggle={() => setIsSidebarOpen(false)}
            onOpenSettings={() => setIsSettingsOpen(true)}
          />
        </div>
      </motion.aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col relative h-full min-w-0">
        {/* Header */}
        <header className="h-14 border-b border-gray-100 dark:border-transparent flex items-center justify-between px-4 md:px-6 bg-white/80 dark:bg-transparent backdrop-blur-md z-10 sticky top-0 shrink-0">
          <div className="flex items-center gap-2">
            {/* Mobile menu button */}
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors text-gray-500"
            >
              <SidebarIcon size={20} />
            </button>
            
            {/* Desktop menu button (visible when sidebar is closed) */}
            {!isSidebarOpen && (
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="hidden md:flex p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors text-gray-500"
              >
                <SidebarIcon size={20} />
              </button>
            )}
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-400 truncate ml-2">Lumina Intelligence</h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative flex items-center">
              <AnimatePresence>
                {isSearchOpen && (
                  <motion.div
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 200, opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    className="absolute right-full mr-2"
                  >
                    <input 
                      autoFocus
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search messages..."
                      className="w-full h-9 px-4 bg-gray-100 dark:bg-zinc-800 border-none rounded-full text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                    />
                  </motion.div>
                )}
              </AnimatePresence>
              <button 
                onClick={() => setIsSearchOpen(!isSearchOpen)}
                className={`p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors ${isSearchOpen ? 'text-blue-500 bg-gray-100 dark:bg-white/5' : 'text-gray-500'}`}
              >
                <Search size={18} />
              </button>
            </div>

            <div className="relative" ref={headerMenuRef}>
              <button 
                onClick={() => setIsHeaderMenuOpen(!isHeaderMenuOpen)}
                className={`p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors ${isHeaderMenuOpen ? 'text-black dark:text-white bg-gray-100 dark:bg-white/5' : 'text-gray-500'}`}
              >
                <MoreVertical size={18} />
              </button>

              <AnimatePresence>
                {isHeaderMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute top-full right-0 mt-2 w-56 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden z-[60] p-1.5"
                  >
                    {[
                      { id: 'settings', label: 'Settings', icon: <Settings size={16} />, onClick: () => { setIsSettingsOpen(true); setIsHeaderMenuOpen(false); } },
                      { id: 'account', label: 'Account', icon: <User size={16} />, onClick: () => { setIsHeaderMenuOpen(false); } },
                      { id: 'mcp', label: 'MCP Status', icon: <HardDrive size={16} className={isMcpConnected ? 'text-blue-500' : ''} />, onClick: () => { setActiveSettingsTab('mcp'); setIsSettingsOpen(true); setIsHeaderMenuOpen(false); } },
                    ].map((item) => (
                      <button
                        key={item.id}
                        onClick={item.onClick}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-black dark:hover:text-white transition-colors"
                      >
                        {item.icon}
                        {item.label}
                      </button>
                    ))}
                    <div className="my-1.5 border-t border-gray-100 dark:border-white/5" />
                    <button
                      onClick={() => setIsDarkMode(!isDarkMode)}
                      className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-black dark:hover:text-white transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <motion.div animate={{ rotate: isDarkMode ? 180 : 0 }}>
                          <Sparkles size={16} />
                        </motion.div>
                        Dark Mode
                      </div>
                      <div className={`w-8 h-4 rounded-full relative transition-colors ${isDarkMode ? 'bg-blue-600' : 'bg-gray-200'}`}>
                        <motion.div 
                          animate={{ x: isDarkMode ? 18 : 2 }}
                          className="absolute top-1 w-2 h-2 rounded-full bg-white" 
                        />
                      </div>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Messages */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-4 md:px-0 py-8 custom-scrollbar"
        >
          <div className="max-w-2xl mx-auto space-y-8 pb-32">
            <AnimatePresence initial={false}>
              {messages.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="h-[60vh] flex flex-col items-center justify-center text-center px-4"
                >
                  <motion.div 
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 4, repeat: Infinity }}
                    className="w-16 h-16 bg-gray-50 border border-gray-100 rounded-3xl flex items-center justify-center text-black dark:text-white dark:bg-zinc-900 mb-6 shadow-sm"
                  >
                    <Sparkles size={32} />
                  </motion.div>
                  <h1 className="text-4xl font-display font-medium text-gray-900 dark:text-white mb-3 tracking-tight">
                    Welcome to Lumina
                  </h1>
                  <p className="text-gray-500 max-w-sm mb-12">
                    A beautiful, minimalist way to converse with artificial intelligence.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full">
                    {[
                      "Explain quantum physics in simple terms",
                      "Write a professional email for a job application",
                      "Give me 5 weekend trip ideas from London",
                      "How do I build a minimalist website?"
                    ].map((suggestion, i) => (
                      <motion.button
                        key={i}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleSend(suggestion)}
                        className="p-4 text-sm text-left border border-gray-100 bg-gray-50 hover:bg-gray-100 transition-colors rounded-2xl text-gray-600 dark:text-gray-400"
                      >
                        {suggestion}
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              ) : (
                messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10, scale: 0.99 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className={`flex items-start gap-4 ${message.role === 'user' ? 'justify-end' : ''}`}
                  >
                    {message.role === 'assistant' && (
                      <div className="w-8 h-8 rounded-lg bg-black dark:bg-white flex items-center justify-center text-white dark:text-black shrink-0 mt-0.5 shadow-sm">
                        <Sparkles size={14} />
                      </div>
                    )}
                    
                    <div className={`
                      max-w-[85%] px-5 py-3 rounded-2xl text-[15px] leading-relaxed
                      ${message.role === 'user' 
                        ? 'bg-black dark:bg-white text-white dark:text-black rounded-tr-none shadow-md' 
                        : 'bg-gray-100 dark:bg-zinc-800 text-gray-800 dark:text-gray-200 rounded-tl-none'}
                    `}>
                      {message.content}
                    </div>

                    {message.role === 'user' && (
                      <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center text-white shrink-0 mt-0.5 shadow-sm">
                        <User size={14} />
                      </div>
                    )}
                  </motion.div>
                ))
              )}
            </AnimatePresence>

            {isTyping && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-4 text-gray-400"
              >
                <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-zinc-900 border border-gray-100 flex items-center justify-center shrink-0">
                  <Sparkles size={14} />
                </div>
                <div className="flex gap-1">
                  <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0 }} className="w-1.5 h-1.5 bg-gray-300 rounded-full" />
                  <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.2 }} className="w-1.5 h-1.5 bg-gray-300 rounded-full" />
                  <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.4 }} className="w-1.5 h-1.5 bg-gray-300 rounded-full" />
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* Input Area */}
        <div className="px-4 pb-6 bg-transparent sticky bottom-0 shrink-0">
          <div className="max-w-3xl mx-auto relative group">
            <div className="relative border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-900/90 backdrop-blur-xl rounded-[24px] shadow-2xl focus-within:border-gray-300 dark:focus-within:border-white/20 transition-all overflow-hidden flex flex-col p-1">
              <textarea
                ref={inputRef}
                value={input}
                onChange={adjustTextareaHeight}
                onKeyDown={handleKeyDown}
                placeholder="Message Lumina..."
                rows={1}
                className="w-full bg-transparent border-none focus:ring-0 text-[15px] py-2.5 px-4 resize-none min-h-[40px] dark:text-white dark:placeholder-gray-500"
              />
              
              <div className="flex items-center justify-between px-2 pb-1">
                <div className="flex items-center gap-1">
                  <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-all">
                    <Plus size={18} />
                  </button>

                  {/* Model Selector Integrated */}
                  <div className="relative" ref={dropdownRef}>
                    <button 
                      onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl text-[11px] font-medium text-gray-500 dark:text-gray-400 transition-all active:scale-95"
                    >
                      {models.find(m => m.id === selectedModel)?.icon}
                      <span>{models.find(m => m.id === selectedModel)?.name.split(' ').pop()}</span>
                      <ChevronDown size={10} className={`transition-transform duration-200 ${isModelDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    <AnimatePresence>
                      {isModelDropdownOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          className="absolute bottom-full left-0 mb-3 w-52 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden z-20 p-1"
                        >
                          {models.map((model) => (
                            <button
                              key={model.id}
                              onClick={() => {
                                setSelectedModel(model.id);
                                setIsModelDropdownOpen(false);
                              }}
                              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[11px] font-medium transition-colors ${
                                selectedModel === model.id 
                                  ? 'bg-gray-100 dark:bg-white/10 text-black dark:text-white' 
                                  : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'
                              }`}
                            >
                              {model.icon}
                              {model.name}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  
                  {/* MCP Tool Status Icon */}
                  <div className="flex items-center gap-2 ml-1 group cursor-help relative">
                    <div className={`w-1 h-1 rounded-full transition-all duration-500 ${isMcpConnected ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]' : 'bg-gray-300 dark:bg-gray-700'}`} />
                    <HardDrive 
                      size={13} 
                      className={`transition-colors duration-300 ${isMcpConnected ? 'text-blue-500' : 'text-gray-400 dark:text-gray-600'}`} 
                    />
                  </div>
                </div>
                
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isTyping}
                  className={`
                    w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-300 shadow-sm
                    ${input.trim() && !isTyping
                      ? 'bg-black dark:bg-white text-white dark:text-black hover:scale-105 active:scale-95'
                      : 'bg-gray-50 dark:bg-zinc-800 text-gray-300 dark:text-gray-600'}
                  `}
                >
                  <ArrowUp size={16} strokeWidth={3} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Settings Modal */}
      <AnimatePresence>
        {isSettingsOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSettingsOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-3xl h-[520px] bg-white dark:bg-zinc-900 text-brand-primary dark:text-white rounded-3xl shadow-2xl overflow-hidden flex"
            >
              {/* Settings Sidebar */}
              <div className="w-56 border-r border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-zinc-950/20 p-6 flex flex-col">
                <h2 className="text-xl font-display font-semibold mb-8">Settings</h2>
                
                <nav className="space-y-1 flex-1">
                  {[
                    { id: 'general', label: 'General', icon: <Settings size={16} /> },
                    { id: 'ai', label: 'AI Service', icon: <Sparkles size={16} /> },
                    { id: 'mcp', label: 'MCP Server', icon: <HardDrive size={16} /> },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveSettingsTab(tab.id as any)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                        activeSettingsTab === tab.id 
                          ? 'bg-white dark:bg-zinc-800 text-black dark:text-white shadow-sm border border-gray-100 dark:border-white/10' 
                          : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5'
                      }`}
                    >
                      {tab.icon}
                      {tab.label}
                    </button>
                  ))}
                </nav>

                <div className="mt-auto">
                  <div className="flex items-center gap-3 p-2 bg-white dark:bg-zinc-800 rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm">
                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-xs">
                      AR
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-semibold truncate">Abdur Ramiz</div>
                      <div className="text-[10px] text-gray-400 truncate uppercase">Pro</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Settings Content */}
              <div className="flex-1 flex flex-col min-w-0">
                <div className="flex items-center justify-end p-6 pb-0">
                  <button 
                    onClick={() => setIsSettingsOpen(false)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors text-gray-500"
                  >
                    <Plus size={20} className="rotate-45" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 pt-4 custom-scrollbar">
                  {activeSettingsTab === 'general' && (
                    <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
                      <div>
                        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-6">Appearance</h3>
                        <div className="space-y-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-sm">Theme</div>
                              <div className="text-xs text-gray-400">Light or dark interface preference</div>
                            </div>
                            <button 
                              onClick={() => setIsDarkMode(!isDarkMode)}
                              className={`w-12 h-6 rounded-full transition-all relative ${isDarkMode ? 'bg-blue-600' : 'bg-gray-200'}`}
                            >
                              <motion.div 
                                animate={{ x: isDarkMode ? 24 : 4 }}
                                className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm"
                              />
                            </button>
                          </div>
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-sm">Compact Sidebar</div>
                              <div className="text-xs text-gray-400">Reduce sidebar width automatically</div>
                            </div>
                            <button className="w-12 h-6 rounded-full bg-black/10 dark:bg-white/10 relative">
                              <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-white shadow-sm" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {activeSettingsTab === 'ai' && (
                    <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
                      <div>
                        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-6">AI Service Configuration</h3>
                        <div className="space-y-5">
                          <div className="space-y-1.5">
                            <label className="text-[11px] font-medium text-gray-500">Endpoint URL</label>
                            <input 
                              type="text" 
                              value={serverUrl}
                              onChange={(e) => setServerUrl(e.target.value)}
                              placeholder="https://api.lumina.ai/v1"
                              className="w-full h-11 px-4 text-sm bg-gray-50 dark:bg-zinc-950 border border-gray-100 dark:border-white/5 rounded-xl focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[11px] font-medium text-gray-500">API Key</label>
                            <input 
                              type="password" 
                              value={apiKey}
                              onChange={(e) => setApiKey(e.target.value)}
                              placeholder="sk-••••••••••••••••"
                              className="w-full h-11 px-4 text-sm bg-gray-50 dark:bg-zinc-950 border border-gray-100 dark:border-white/5 rounded-xl focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                            />
                          </div>
                          <div className="p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/20 rounded-2xl">
                            <div className="flex gap-3">
                              <Sparkles size={16} className="text-blue-500 mt-0.5" />
                              <p className="text-xs text-blue-800 dark:text-blue-300 leading-relaxed">
                                Use a custom endpoint to connect your own Lumina-compatible API or proxy server.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {activeSettingsTab === 'mcp' && (
                    <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
                      <div>
                        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-6">MCP Server (Tools)</h3>
                        <div className="space-y-5">
                          <div className="space-y-1.5">
                            <label className="text-[11px] font-medium text-gray-500">Server URL</label>
                            <input 
                              type="text" 
                              value={mcpUrl}
                              onChange={(e) => setMcpUrl(e.target.value)}
                              placeholder="http://localhost:3001"
                              className="w-full h-11 px-4 text-sm bg-gray-50 dark:bg-zinc-950 border border-gray-100 dark:border-white/5 rounded-xl focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[11px] font-medium text-gray-500">Server API Key</label>
                            <input 
                              type="password" 
                              value={mcpKey}
                              onChange={(e) => setMcpKey(e.target.value)}
                              placeholder="mcp_••••••••••••••••"
                              className="w-full h-11 px-4 text-sm bg-gray-50 dark:bg-zinc-950 border border-gray-100 dark:border-white/5 rounded-xl focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                            />
                          </div>
                          <button
                            onClick={() => {
                              if (!mcpUrl) return;
                              setIsConnectingMcp(true);
                              setTimeout(() => {
                                setIsConnectingMcp(false);
                                setIsMcpConnected(!isMcpConnected);
                              }, 800);
                            }}
                            className={`w-full py-3 rounded-xl text-sm font-semibold transition-all ${
                              isMcpConnected 
                                ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/30' 
                                : 'bg-black dark:bg-white text-white dark:text-black shadow-lg shadow-black/10'
                            }`}
                          >
                            {isConnectingMcp ? (
                              <span className="flex items-center justify-center gap-2">
                                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
                                Connecting...
                              </span>
                            ) : (isMcpConnected ? 'Disconnect Server' : 'Connect MCP Server')}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
