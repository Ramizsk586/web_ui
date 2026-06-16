import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Folder,
  ChevronDown,
  Sparkles,
  Mic,
  Monitor,
  GitBranch,
  Plus,
  Search,
  MicOff,
  Loader2,
  StopCircle
} from 'lucide-react';

interface CoderInputBoxProps {
  activeModelId: string;
  activeModelList: any[];
  availableModels: any[];
  handleModelSelect: (id: string) => void;
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
  isVoiceListening?: boolean;
  startVoiceDictation?: (locale?: string) => void;
  stopVoiceDictation?: (autoSend?: boolean) => void;
  isCenteredState?: boolean;
}

export function CoderInputBox({
  activeModelId,
  activeModelList,
  availableModels,
  handleModelSelect,
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
  isVoiceListening,
  startVoiceDictation,
  stopVoiceDictation,
  isCenteredState = false
}: CoderInputBoxProps) {
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [modelSearchQuery, setModelSearchQuery] = useState('');
  const [isEnvDropdownOpen, setIsEnvDropdownOpen] = useState(false);
  const [selectedEnv, setSelectedEnv] = useState<'local' | 'worktree'>('local');
  
  const modelDropdownRef = useRef<HTMLDivElement>(null);
  const envDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(event.target as Node)) {
        setIsModelDropdownOpen(false);
      }
      if (envDropdownRef.current && !envDropdownRef.current.contains(event.target as Node)) {
        setIsEnvDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredModels = React.useMemo(() => {
    if (!activeModelList) return [];
    return activeModelList.filter((model: any) => {
      const name = (model.name || '').toLowerCase();
      const id = (model.id || '').toLowerCase();
      const q = modelSearchQuery.toLowerCase();
      return name.includes(q) || id.includes(q);
    });
  }, [activeModelList, modelSearchQuery]);

  const currentModelName = React.useMemo(() => {
    const matched = activeModelList.find((m: any) => m.id === activeModelId);
    if (matched) return matched.name;
    let name = activeModelId;
    if (name.includes("/")) {
      name = name.split("/").slice(-1)[0];
    }
    return name.replace(/[-_]/g, " ").replace(/\bgguf\b/gi, "").trim() || activeModelId;
  }, [activeModelId, activeModelList]);

  const projectFolderName = React.useMemo(() => {
    if (!coderWorkspacePath) return 'No folder';
    return coderWorkspacePath.replace(/\\/g, '/').split('/').filter(Boolean).pop() || coderWorkspacePath;
  }, [coderWorkspacePath]);

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    adjustTextareaHeight(e);
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="bg-[#1C1917] border border-[#3D3530] rounded-2xl overflow-hidden shadow-lg shadow-black/20">
        
        {/* Top: Project Folder Indicator */}
        {isCoderMode && coderWorkspacePath && (
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[#3D3530]/50">
            <Folder size={14} className="text-[#D97756] shrink-0" />
            <span className="text-sm font-medium text-[#EDE6DD]">{projectFolderName}</span>
            <ChevronDown size={12} className="text-[#7F7469] shrink-0" />
          </div>
        )}

        {/* Middle: Text Input Area */}
        <div className="px-4 py-3">
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything, @ to mention, / for actions"
            rows={1}
            className="w-full bg-transparent text-[#EDE6DD] text-sm placeholder-[#7F7469] outline-none resize-none min-h-[40px] max-h-[200px] leading-relaxed"
            style={{ height: 'auto' }}
          />
        </div>

        {/* Bottom: Model Selector + Actions + Env Selector */}
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-[#3D3530]/50">
          {/* Left side: Model selector + attach */}
          <div className="flex items-center gap-2">
            {/* Attach button */}
            <button className="p-1.5 rounded-lg hover:bg-[#2C241E] text-[#7F7469] hover:text-[#EDE6DD] transition-colors cursor-pointer" title="Add attachment">
              <Plus size={16} />
            </button>

            {/* Model Selector */}
            <div className="relative" ref={modelDropdownRef}>
              <button
                onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-[#2C241E] transition-all text-xs font-medium text-[#EDE6DD] cursor-pointer select-none"
              >
                <Sparkles size={13} className="text-amber-500 shrink-0" />
                <span className="max-w-[140px] truncate">{currentModelName}</span>
                <ChevronDown size={11} className={`text-[#7F7469] transition-transform ${isModelDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {isModelDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 5 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 5 }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    className="absolute bottom-full left-0 mb-2 w-[280px] bg-[#1C1917] border border-[#3D3530] rounded-xl shadow-2xl z-[200] flex flex-col overflow-hidden"
                  >
                    {availableModels.length > 5 && (
                      <div className="px-3 py-2 border-b border-[#3D3530]/50">
                        <div className="relative">
                          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#7F7469]" />
                          <input
                            type="text"
                            placeholder="Filter models..."
                            value={modelSearchQuery}
                            onChange={(e) => setModelSearchQuery(e.target.value)}
                            className="w-full h-8 pl-8 pr-3 bg-[#0E0C0B] border border-[#3D3530] rounded-lg text-xs outline-none placeholder-[#635F59] focus:border-[#D97756] text-[#EDE6DD] font-medium transition-all"
                          />
                        </div>
                      </div>
                    )}

                    <div className="max-h-[200px] overflow-y-auto p-1.5 space-y-0.5 custom-scrollbar">
                      {filteredModels.map((model: any) => {
                        const isSelected = activeModelId === model.id;
                        return (
                          <button
                            key={model.id}
                            onClick={() => {
                              handleModelSelect(model.id);
                              setIsModelDropdownOpen(false);
                              setModelSearchQuery('');
                            }}
                            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all text-left cursor-pointer ${
                              isSelected
                                ? 'bg-[#D97756]/15 text-[#D97756] border-l-2 border-[#D97756]'
                                : 'text-[#EDE6DD] hover:bg-[#2C241E] border-l-2 border-transparent'
                            }`}
                          >
                            <Sparkles size={11} className={isSelected ? 'text-[#D97756]' : 'text-[#7F7469]'} />
                            <span className="truncate">{model.name || model.id}</span>
                          </button>
                        );
                      })}
                      {filteredModels.length === 0 && (
                        <div className="text-xs text-[#7F7469] text-center py-4">No models found</div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Center: Voice / Microphone */}
          <div className="flex items-center gap-2">
            {isTyping ? (
              <button
                onClick={() => {
                  if (abortControllerRef.current) {
                    abortControllerRef.current.abort();
                  }
                }}
                className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors cursor-pointer"
                title="Stop generation"
              >
                <StopCircle size={16} />
              </button>
            ) : (
              <button
                onClick={() => {
                  if (isVoiceListening && stopVoiceDictation) {
                    stopVoiceDictation(false);
                  } else if (startVoiceDictation) {
                    startVoiceDictation();
                  }
                }}
                className={`p-2 rounded-lg transition-colors cursor-pointer ${
                  isVoiceListening
                    ? 'bg-[#D97756]/20 text-[#D97756] animate-pulse'
                    : 'hover:bg-[#2C241E] text-[#7F7469] hover:text-[#EDE6DD]'
                }`}
                title={isVoiceListening ? "Stop listening" : "Voice input"}
              >
                {isVoiceListening ? <Loader2 size={16} className="animate-spin" /> : <Mic size={16} />}
              </button>
            )}
          </div>

          {/* Right side: Environment selector */}
          <div className="relative" ref={envDropdownRef}>
            <button
              onClick={() => setIsEnvDropdownOpen(!isEnvDropdownOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-[#2C241E] transition-all text-xs font-medium text-[#7F7469] hover:text-[#EDE6DD] cursor-pointer select-none"
            >
              <Monitor size={13} />
              <span>{selectedEnv === 'local' ? 'Local' : 'Worktree'}</span>
              <ChevronDown size={11} className={`transition-transform ${isEnvDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {isEnvDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 5 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 5 }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  className="absolute bottom-full right-0 mb-2 w-48 bg-[#1C1917] border border-[#3D3530] rounded-xl shadow-2xl z-[200] p-1.5"
                >
                  <button
                    onClick={() => {
                      setSelectedEnv('local');
                      setIsEnvDropdownOpen(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all text-left cursor-pointer ${
                      selectedEnv === 'local'
                        ? 'bg-[#D97756]/15 text-[#D97756]'
                        : 'text-[#EDE6DD] hover:bg-[#2C241E]'
                    }`}
                  >
                    <Monitor size={13} />
                    <span>Local</span>
                  </button>
                  <button
                    onClick={() => {
                      setSelectedEnv('worktree');
                      setIsEnvDropdownOpen(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all text-left cursor-pointer ${
                      selectedEnv === 'worktree'
                        ? 'bg-[#D97756]/15 text-[#D97756]'
                        : 'text-[#EDE6DD] hover:bg-[#2C241E]'
                    }`}
                  >
                    <GitBranch size={13} />
                    <span>New Worktree</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Send Button (only when there's input) */}
        {input.trim() && (
          <div className="px-4 pb-3">
            <button
              onClick={handleSend}
              className="w-full py-2.5 bg-[#D97756] hover:bg-[#e48f73] text-white text-sm font-semibold rounded-xl transition-all cursor-pointer shadow-md"
            >
              Send
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
