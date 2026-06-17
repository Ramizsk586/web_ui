import React, { useRef, useState, useEffect } from 'react';
import { Plus, X, ShieldCheck, Shield, Hand, Check, ChevronDown, ArrowUp, Pause, Bot, Layers, Bug, Eye, ShieldAlert, MessageSquare, ClipboardList, MousePointerClick } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { CoderPermissionMode } from '../../types';
import { permissionModeLabel } from '../../utils/permissionUtils';

interface CoderInputBoxProps {
  activeAssistantMode: 'builder' | 'planner' | 'debugger' | 'reviewer' | 'tester' | 'plain';
  setActiveAssistantMode: (mode: 'builder' | 'planner' | 'debugger' | 'reviewer' | 'tester' | 'plain') => void;
  coderWorkspacePath: string;
  isCoderMode: boolean;
  input: string;
  setInput: (val: string) => void;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  handleKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  handleSend: () => void;
  adjustTextareaHeight: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  isTyping: boolean;
  abortControllerRef: React.MutableRefObject<AbortController | null>;
  showToast: (msg: string) => void;
  isCenteredState?: boolean;
  attachedFiles: File[];
  setAttachedFiles: React.Dispatch<React.SetStateAction<File[]>>;
  handleFileAttach?: (files: File[]) => void;
  localElementAttachments?: any[];
  setLocalElementAttachments?: React.Dispatch<React.SetStateAction<any[]>>;
  setSelectedModalAttachment?: (attachment: any) => void;
  coderPermissionMode: CoderPermissionMode;
  setCoderPermissionMode: (mode: CoderPermissionMode) => void;
  showTodoPanel?: boolean;
  setShowTodoPanel?: (show: boolean) => void;
  coderTodos?: Array<{ id: string; content?: string; text?: string; status: string }>;
  todoCollapsed?: boolean;
  setTodoCollapsed?: (collapsed: boolean) => void;
}

const getAssistantModeLabel = (mode: string) => {
  if (mode === 'builder') return 'Builder';
  if (mode === 'planner') return 'Planner';
  if (mode === 'debugger') return 'Debugger';
  if (mode === 'reviewer') return 'Reviewer';
  if (mode === 'tester') return 'Tester';
  return 'Plain';
};

const getAssistantModeIcon = (mode: string) => {
  switch (mode) {
    case 'builder': return <Bot size={12} className="text-orange-500" />;
    case 'planner': return <Layers size={12} className="text-violet-500" />;
    case 'debugger': return <Bug size={12} className="text-amber-500" />;
    case 'reviewer': return <Eye size={12} className="text-emerald-400" />;
    case 'tester': return <ShieldAlert size={12} className="text-rose-400" />;
    default: return <MessageSquare size={12} className="text-zinc-400" />;
  }
};

export function CoderInputBox({
  activeAssistantMode,
  setActiveAssistantMode,
  coderWorkspacePath,
  isCoderMode,
  input,
  setInput,
  inputRef,
  handleKeyDown,
  handleSend,
  adjustTextareaHeight,
  isTyping,
  abortControllerRef,
  showToast,
  isCenteredState = false,
  attachedFiles = [],
  setAttachedFiles,
  handleFileAttach,
  localElementAttachments = [],
  setLocalElementAttachments = () => {},
  setSelectedModalAttachment = () => {},
  coderPermissionMode,
  setCoderPermissionMode,
  showTodoPanel = false,
  setShowTodoPanel = () => {},
  coderTodos = [],
  todoCollapsed = false,
  setTodoCollapsed = () => {}
}: CoderInputBoxProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const permissionRef = useRef<HTMLDivElement | null>(null);
  const modeSelectorRef = useRef<HTMLDivElement | null>(null);
  const [isPermissionDropdownOpen, setIsPermissionDropdownOpen] = useState(false);
  const [isModeDropdownOpen, setIsModeDropdownOpen] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (permissionRef.current && !permissionRef.current.contains(event.target as Node)) {
        setIsPermissionDropdownOpen(false);
      }
      if (modeSelectorRef.current && !modeSelectorRef.current.contains(event.target as Node)) {
        setIsModeDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    adjustTextareaHeight(e);
  };

  const completedTodoCount = coderTodos.filter(todo => todo.status === 'completed' || todo.status === 'complete').length;
  const activeTodo = coderTodos.find(todo => todo.status === 'in_progress') || coderTodos[coderTodos.length - 1];
  const shouldShowImmediateProcessing = isTyping && coderTodos.length === 0;

  return (
    <div className="w-full max-w-3xl mx-auto relative pt-0">
      <AnimatePresence initial={false}>
        {shouldShowImmediateProcessing && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.98 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="relative z-20 w-[92%] mx-auto mb-3"
          >
            <div className="rounded-[26px] bg-[#23211F] border border-[#2E2A27] shadow-[0_22px_60px_rgba(0,0,0,0.3)] overflow-hidden">
              <div className="px-4 py-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#2A2724] border border-[#3A342F] flex items-center justify-center shrink-0">
                  <div className="flex items-end gap-0.5 h-4">
                    <motion.span
                      className="w-1.5 rounded-full bg-[#D97756]"
                      animate={{ height: [6, 14, 8] }}
                      transition={{ duration: 0.75, repeat: Infinity, ease: 'easeInOut' }}
                    />
                    <motion.span
                      className="w-1.5 rounded-full bg-[#E8A87C]"
                      animate={{ height: [10, 6, 14] }}
                      transition={{ duration: 0.75, repeat: Infinity, ease: 'easeInOut', delay: 0.1 }}
                    />
                    <motion.span
                      className="w-1.5 rounded-full bg-[#F3C8A2]"
                      animate={{ height: [7, 13, 9] }}
                      transition={{ duration: 0.75, repeat: Infinity, ease: 'easeInOut', delay: 0.2 }}
                    />
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-semibold text-[#EDE6DD]">Processing request...</div>
                  <div className="text-[11px] text-[#8A8178] truncate">
                    Activating coder workflow and preparing the first engineering steps.
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 pr-0.5">
                  <motion.span
                    className="w-1.5 h-1.5 rounded-full bg-[#D97756]"
                    animate={{ opacity: [0.3, 1, 0.3], scale: [0.85, 1.15, 0.85] }}
                    transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }}
                  />
                  <motion.span
                    className="w-1.5 h-1.5 rounded-full bg-[#D97756]"
                    animate={{ opacity: [0.3, 1, 0.3], scale: [0.85, 1.15, 0.85] }}
                    transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut', delay: 0.15 }}
                  />
                  <motion.span
                    className="w-1.5 h-1.5 rounded-full bg-[#D97756]"
                    animate={{ opacity: [0.3, 1, 0.3], scale: [0.85, 1.15, 0.85] }}
                    transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
        {showTodoPanel && coderTodos.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 28, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ duration: 0.26, ease: 'easeOut' }}
            className="relative z-20 w-[92%] mx-auto mb-3"
          >
            <div className="rounded-[26px] bg-[#23211F] border border-[#2E2A27] shadow-[0_22px_60px_rgba(0,0,0,0.3)] overflow-hidden">
              <button
                type="button"
                onClick={() => setTodoCollapsed(!todoCollapsed)}
                className="w-full px-4 py-3 flex items-center gap-3 text-left bg-transparent hover:bg-[#2A2724] transition-colors cursor-pointer"
              >
                <div className="w-8 h-8 rounded-xl bg-[#2A2724] border border-[#3A342F] flex items-center justify-center text-[#C9BCAB] shrink-0">
                  <ClipboardList size={15} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-semibold text-[#EDE6DD]">Todo Progress...</div>
                  <div className="text-[11px] text-[#8A8178] truncate">
                    {activeTodo?.content || activeTodo?.text || `${coderTodos.length} active tasks`}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] font-semibold text-[#B7AA9B]">
                    {completedTodoCount}/{coderTodos.length}
                  </span>
                  <ChevronDown
                    size={14}
                    className="text-[#8A8178] transition-transform duration-200"
                    style={{ transform: todoCollapsed ? 'rotate(0deg)' : 'rotate(180deg)' }}
                  />
                </div>
              </button>

              {!todoCollapsed && (
                <div className="px-3 pb-3 pt-2 max-h-[248px] overflow-y-auto custom-scrollbar border-t border-[#2E2A27]/55">
                  <div className="space-y-1.5">
                    {coderTodos.map((todo) => {
                      const isDone = todo.status === 'completed' || todo.status === 'complete';
                      const isActive = todo.status === 'in_progress';
                      return (
                        <div
                          key={todo.id}
                          className={`flex items-start gap-2.5 px-2.5 py-2 rounded-xl transition-colors ${
                            isActive ? 'bg-[#2A2724]' : 'bg-transparent'
                          }`}
                        >
                          <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 border ${
                            isDone
                              ? 'bg-emerald-500 border-emerald-400 text-white'
                              : isActive
                                ? 'border-emerald-500/60 text-emerald-400'
                                : 'border-[#4A433D] text-[#72695F]'
                          }`}>
                            {isDone ? <Check size={11} strokeWidth={3} /> : <span className="text-[10px] font-bold">{todo.id}</span>}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className={`text-[13px] leading-relaxed ${
                              isDone
                                ? 'text-[#8F8479] line-through'
                                : isActive
                                  ? 'text-[#F3ECE4]'
                                  : 'text-[#C1B6A8]'
                            }`}>
                              {todo.content || todo.text}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className={`relative z-10 rounded-[26px] bg-[#23211F] border border-[#2E2A27] shadow-[0_22px_60px_rgba(0,0,0,0.3)] ${isCenteredState ? 'min-h-[134px]' : ''}`}>
        <div className="px-5 pt-4 pb-3 relative flex flex-col justify-between min-h-[inherit]">
          {/* File Attachment Previews */}
          {(attachedFiles && attachedFiles.length > 0) || localElementAttachments.length > 0 ? (
            <div className="flex flex-wrap gap-2 pb-3 items-center">
              {attachedFiles.map((file, idx) => {
                const isImage = file.type.startsWith("image/");
                const ext = file.name.split(".").pop()?.toUpperCase() || "DOC";
                let previewUrl = "";
                if (isImage) {
                  try {
                    previewUrl = URL.createObjectURL(file);
                  } catch (e) {}
                }
                return (
                  <div
                    key={`${file.name}-${idx}`}
                    className="relative flex items-center gap-2 px-2.5 py-1 rounded-xl border border-[#3D3530] bg-[#1E1D1B] text-[#EDE6DD] max-w-[200px] h-10 shadow-sm"
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (setAttachedFiles) {
                          setAttachedFiles(prev => prev.filter((_, i) => i !== idx));
                        }
                      }}
                      className="absolute -top-1 -right-1 w-4.5 h-4.5 rounded-full bg-zinc-800 hover:bg-zinc-700 border border-[#3D3530] text-gray-400 hover:text-white flex items-center justify-center transition-all z-10 cursor-pointer"
                    >
                      <X size={10} />
                    </button>
                    <div className="w-6 h-6 bg-zinc-800 rounded flex items-center justify-center text-[8px] font-black uppercase text-gray-400 overflow-hidden shrink-0">
                      {isImage && previewUrl ? (
                        <img src={previewUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        ext
                      )}
                    </div>
                    <div className="flex-1 min-w-0 pr-1 flex flex-col justify-center text-left">
                      <div className="truncate font-semibold text-[11px] text-zinc-100 leading-none">
                        {file.name}
                      </div>
                    </div>
                  </div>
                );
              })}

              {localElementAttachments.map((att, idx) => (
                <motion.div
                  key={att.id || `${att.filePath || 'element'}-${idx}`}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  onClick={() => setSelectedModalAttachment(att)}
                  className="relative flex items-center justify-center w-10 h-10 rounded-xl border-2 border-teal-500/45 bg-teal-500/10 text-teal-200 shadow-sm hover:border-teal-400 hover:bg-teal-500/18 transition-all cursor-pointer shrink-0"
                  title={att.filePath || 'Attached inspected element'}
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setLocalElementAttachments(prev => prev.filter((_, i) => i !== idx));
                    }}
                    className="absolute -top-1 -right-1 w-4.5 h-4.5 rounded-full bg-zinc-800 hover:bg-zinc-700 border border-teal-500/50 text-teal-200 hover:text-white flex items-center justify-center transition-all z-10 cursor-pointer"
                  >
                    <X size={10} />
                  </button>
                  <div className="w-6 h-6 rounded-lg bg-teal-500/15 border border-teal-500/30 flex items-center justify-center shrink-0">
                    <MousePointerClick size={13} className="text-teal-300" />
                  </div>
                </motion.div>
              ))}
            </div>
          ) : null}

          <textarea
            ref={inputRef}
            value={input}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder={coderWorkspacePath ? "Ask anything, @ to mention, / for actions" : "Please open a folder in the project to ask queries"}
            rows={1}
            disabled={!coderWorkspacePath}
            className={`w-full bg-transparent text-[#EDE6DD] text-[15px] placeholder-[#6F6860] outline-none resize-none min-h-[46px] max-h-[141px] leading-relaxed ${!coderWorkspacePath ? 'cursor-not-allowed opacity-50' : ''}`}
            style={{ height: 'auto' }}
          />
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#2E2A27]/30">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={!coderWorkspacePath}
                className="p-1.5 rounded-full hover:bg-[#2C2825] text-[#8A8178] hover:text-[#EDE6DD] disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors cursor-pointer"
                title="Upload docs or images"
              >
                <Plus size={18} />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf,.txt,.md,.csv,.js,.ts,.py"
                multiple
                className="hidden"
                onChange={(e) => {
                  const filesArray = Array.from(e.target.files || []);
                  if (handleFileAttach) {
                    handleFileAttach(filesArray);
                  } else if (setAttachedFiles) {
                    setAttachedFiles(prev => [...prev, ...filesArray]);
                  }
                  e.target.value = "";
                }}
              />

              {/* Coder Permissions Dropdown */}
              <div className="relative" ref={permissionRef}>
                <button
                  type="button"
                  onClick={() => setIsPermissionDropdownOpen(!isPermissionDropdownOpen)}
                  disabled={!coderWorkspacePath}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-transparent hover:bg-[#2C2825] rounded-full text-[11px] font-medium text-[#8A8178] hover:text-[#EDE6DD] disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-all cursor-pointer select-none"
                  title={`Coder permissions: ${permissionModeLabel(coderPermissionMode)}`}
                >
                  {coderPermissionMode === "full-access" ? (
                    <ShieldCheck size={12} className="text-emerald-400" />
                  ) : coderPermissionMode === "auto-review" ? (
                    <Shield size={12} className="text-violet-400" />
                  ) : (
                    <Hand size={12} className="text-zinc-400" />
                  )}
                  <span>
                    {permissionModeLabel(coderPermissionMode)}
                  </span>
                  <ChevronDown
                    size={10}
                    className="text-[#8A8178] transition-transform duration-200"
                    style={{
                      transform: isPermissionDropdownOpen
                        ? "rotate(180deg)"
                        : "rotate(0deg)",
                    }}
                  />
                </button>

                {isPermissionDropdownOpen && (
                  <div
                    className="absolute bottom-full left-0 mb-2 w-56 bg-[#1E1D1B] border border-[#2E2A27] rounded-xl shadow-2xl z-[250] p-1 text-left flex flex-col gap-0.5"
                  >
                    {[
                      { id: "default", label: "Default", icon: <Hand size={14} className="text-zinc-400" />, desc: "Prompt for approval on risky commands" },
                      { id: "auto-review", label: "Auto-review", icon: <Shield size={14} className="text-violet-400" />, desc: "Auto-approve safe actions" },
                      { id: "full-access", label: "Full access", icon: <ShieldCheck size={14} className="text-emerald-400" />, desc: "Execute all commands automatically" }
                    ].map((option) => {
                      const isActive = coderPermissionMode === option.id;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => {
                            setCoderPermissionMode(option.id as CoderPermissionMode);
                            setIsPermissionDropdownOpen(false);
                            showToast(`Coder permissions: ${option.label}`);
                          }}
                          className={`w-full flex flex-col px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer text-left ${
                            isActive
                              ? "bg-[#2C2825] text-[#EDE6DD]"
                              : "text-[#8A8178] hover:bg-[#2C2825] hover:text-[#EDE6DD]"
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-2 font-medium text-[11px]">
                              {option.icon}
                              <span>{option.label}</span>
                            </div>
                            {isActive && <Check size={12} className="text-[#DDD2C4]" />}
                          </div>
                          <span className="text-[9px] text-[#8A8178] mt-0.5 font-normal leading-normal">
                            {option.desc}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right side controls: Mode Selector & Send/Pause button */}
            <div className="flex items-center gap-2">
              {/* Coder Assistant Mode Selector */}
              <div className="relative" ref={modeSelectorRef}>
                <button
                  type="button"
                  onClick={() => setIsModeDropdownOpen(!isModeDropdownOpen)}
                  disabled={!coderWorkspacePath}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-transparent hover:bg-[#2C2825] rounded-full text-[11px] font-medium text-[#8A8178] hover:text-[#EDE6DD] disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-all cursor-pointer select-none"
                  title={`Assistant Mode: ${getAssistantModeLabel(activeAssistantMode)}`}
                >
                  {getAssistantModeIcon(activeAssistantMode)}
                  <span>
                    {getAssistantModeLabel(activeAssistantMode)}
                  </span>
                  <ChevronDown
                    size={10}
                    className="text-[#8A8178] transition-transform duration-200"
                    style={{
                      transform: isModeDropdownOpen
                        ? "rotate(180deg)"
                        : "rotate(0deg)",
                    }}
                  />
                </button>

                {isModeDropdownOpen && (
                  <div
                    className="absolute bottom-full right-0 mb-2 w-52 bg-[#1E1D1B] border border-[#2E2A27] rounded-xl shadow-2xl z-[250] p-1 text-left flex flex-col gap-0.5"
                  >
                    {[
                      { id: "builder", label: "Builder", icon: <Bot size={13} className="text-orange-500" />, desc: "Build code features and modules" },
                      { id: "planner", label: "Planner", icon: <Layers size={13} className="text-violet-500" />, desc: "Draft high-level architecture plans" },
                      { id: "debugger", label: "Debugger", icon: <Bug size={13} className="text-amber-500" />, desc: "Find, explain and fix code errors" },
                      { id: "reviewer", label: "Reviewer", icon: <Eye size={13} className="text-emerald-400" />, desc: "Perform code quality/logic audit" },
                      { id: "tester", label: "Tester", icon: <ShieldAlert size={13} className="text-rose-400" />, desc: "Write tests and assert security" },
                      { id: "plain", label: "Plain", icon: <MessageSquare size={13} className="text-zinc-400" />, desc: "Standard chat without agent workflows" }
                    ].map((option) => {
                      const isActive = activeAssistantMode === option.id;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => {
                            setActiveAssistantMode(option.id as any);
                            setIsModeDropdownOpen(false);
                            showToast(`Assistant Mode: ${option.label}`);
                          }}
                          className={`w-full flex flex-col px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer text-left ${
                            isActive
                              ? "bg-[#2C2825] text-[#EDE6DD]"
                              : "text-[#8A8178] hover:bg-[#2C2825] hover:text-[#EDE6DD]"
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-2 font-medium text-[11px]">
                              {option.icon}
                              <span>{option.label}</span>
                            </div>
                            {isActive && <Check size={12} className="text-[#DDD2C4]" />}
                          </div>
                          <span className="text-[9px] text-[#8A8178] mt-0.5 font-normal leading-normal">
                            {option.desc}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Send/Pause button */}
              {isTyping ? (
                <button
                  type="button"
                  onClick={() => {
                    if (abortControllerRef.current) {
                      abortControllerRef.current.abort();
                    }
                  }}
                  className="p-1.5 rounded-full bg-transparent hover:bg-[#2C2825] text-[#8A8178] hover:text-[#EDE6DD] transition-all cursor-pointer flex items-center justify-center"
                  title="Stop generation"
                >
                  <Pause size={18} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!input.trim() || !coderWorkspacePath}
                  className="p-1.5 rounded-full bg-transparent hover:bg-[#2C2825] text-[#8A8178] hover:text-[#EDE6DD] disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-[#8A8178] disabled:cursor-not-allowed transition-all cursor-pointer flex items-center justify-center"
                  title={coderWorkspacePath ? "Send" : "Please open a folder to send"}
                >
                  <ArrowUp size={18} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
