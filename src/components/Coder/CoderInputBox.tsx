import React, { useRef, useState, useEffect } from 'react';
import { StopCircle, Plus, X, ShieldCheck, Shield, Hand, Check, ChevronDown } from 'lucide-react';
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
  coderPermissionMode: CoderPermissionMode;
  setCoderPermissionMode: (mode: CoderPermissionMode) => void;
}

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
  coderPermissionMode,
  setCoderPermissionMode
}: CoderInputBoxProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const permissionRef = useRef<HTMLDivElement | null>(null);
  const [isPermissionDropdownOpen, setIsPermissionDropdownOpen] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (permissionRef.current && !permissionRef.current.contains(event.target as Node)) {
        setIsPermissionDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    adjustTextareaHeight(e);
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className={`rounded-[26px] bg-[#23211F] border border-[#2E2A27] shadow-[0_22px_60px_rgba(0,0,0,0.3)] ${isCenteredState ? 'min-h-[134px]' : ''}`}>
        <div className="px-5 pt-4 pb-3 relative flex flex-col justify-between min-h-[inherit]">
          {/* File Attachment Previews */}
          {attachedFiles && attachedFiles.length > 0 && (
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
            </div>
          )}

          <textarea
            ref={inputRef}
            value={input}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything, @ to mention, / for actions"
            rows={1}
            className="w-full bg-transparent text-[#EDE6DD] text-[15px] placeholder-[#6F6860] outline-none resize-none min-h-[46px] max-h-[141px] leading-relaxed"
            style={{ height: 'auto' }}
          />

          <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#2E2A27]/30">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-1.5 rounded-full hover:bg-[#2C2825] text-[#8A8178] hover:text-[#EDE6DD] transition-colors cursor-pointer"
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
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-transparent hover:bg-[#2C2825] rounded-full text-[11px] font-medium text-[#8A8178] hover:text-[#EDE6DD] transition-all cursor-pointer select-none"
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

            {isTyping && (
              <button
                type="button"
                onClick={() => {
                  if (abortControllerRef.current) {
                    abortControllerRef.current.abort();
                  }
                }}
                className="w-8 h-8 rounded-full bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors cursor-pointer flex items-center justify-center"
                title="Stop generation"
              >
                <StopCircle size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
