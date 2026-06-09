import React from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Globe,
  Hammer,
  Wrench,
  Zap,
  Loader2,
  ChevronRight,
  ChevronLeft,
  X,
  Check,
  MousePointerClick,
  Link as LinkIcon,
  MicOff,
  Mic,
  Headphones,
  Trash2,
  Sparkles,
  Plus,
  ChevronDown,
  Bot,
  Layers,
  Bug,
  Search,
  StopCircle,
  ArrowUp,
  Camera,
  FileUp,
  Video,
  Palette,
  Box,
  Shield,
  Hand,
  ShieldCheck,
  Database,
  LayoutGrid,
  Settings,
  BookOpen,
  Puzzle,
  Eye,
  ShieldAlert,
  GraduationCap,
  Workflow
} from "lucide-react";
import { DocumentSelector } from "./DocumentSelectorModal";
import { WRITING_STYLES, SKILLS, SUPPORTED_VOICE_LANGUAGES } from "../constants";
import { CoderPermissionMode, PendingCommandPermission } from "../types";
import { permissionModeLabel } from "../utils/permissionUtils";
import { useSmartPopupPosition } from "../hooks/useSmartPopupPosition";

const renderAppModelLogo = (_fullName: string, _modelId: string, fallback: React.ReactNode) => {
  return fallback;
};

export interface ChatBoxPanelProps {
  isCenteredState?: boolean;
  theme: { id: string };
  writingStyle: string;
  isWebSearchEnabled: boolean;
  setIsWebSearchEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  isDeepSearchEnabled: boolean;
  setIsDeepSearchEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  activeSkills: string[];
  setActiveSkills: React.Dispatch<React.SetStateAction<string[]>>;
  useTurboQuant: boolean;
  isPlusMenuOpen: boolean;
  setIsPlusMenuOpen: (open: boolean) => void;
  activePlusSubMenu: string;
  setActivePlusSubMenu: (submenu: string) => void;
  luminaTools: any[];
  setLuminaTools: React.Dispatch<React.SetStateAction<any[]>>;
  bridgeTools: any[];
  setBridgeTools: React.Dispatch<React.SetStateAction<any[]>>;
  composioTools: any[];
  setComposioTools: React.Dispatch<React.SetStateAction<any[]>>;
  composioConnections: any[];
  composioEnabled: boolean;
  fetchComposioStatus: () => Promise<void>;
  toggleComposioTool: (toolId: string) => void;
  toggleAllToolsForToolkit: (slug: string, enabled: boolean) => void;
  showTodoPanel: boolean;
  setShowTodoPanel: (show: boolean) => void;
  coderTodos: any[];
  setCoderTodos: React.Dispatch<React.SetStateAction<any[]>>;
  activeCommandQuery: string | null;
  setActiveCommandQuery: (query: string | null) => void;
  activeCommandType: string | null;
  setActiveCommandType: (type: string | null) => void;
  isGeneratingTodos: boolean;
  todoCollapsed: boolean;
  setTodoCollapsed: (collapsed: boolean) => void;
  isCoderMode: boolean;
  showsSlashCommands: boolean;
  filteredCommands: any[];
  selectedCommandIndex: number;
  setSelectedCommandIndex: (index: number) => void;
  input: string;
  setInput: (val: string) => void;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  showAskAiPanel: boolean;
  askAiQuestions: any[];
  askAiAnswers: Record<string, any>;
  currentQuestionIndex: number;
  handleDotClick: (idx: number) => void;
  handleFinishQuestions: (skip: boolean) => void;
  isTransitioningQuestion: boolean;
  isGeneratingQuestions: boolean;
  isAnalyzingAnswers: boolean;
  renderActiveQuestionContent: () => React.ReactNode;
  attachedFiles: File[];
  setAttachedFiles: React.Dispatch<React.SetStateAction<File[]>>;
  localElementAttachments: any[];
  setLocalElementAttachments: React.Dispatch<React.SetStateAction<any[]>>;
  attachedUrlDocs: any[];
  setAttachedUrlDocs: React.Dispatch<React.SetStateAction<any[]>>;
  setAttachmentContextMenu: (ctx: any) => void;
  setSelectedModalAttachment: (att: any) => void;
  setTranscriptionOptionsDoc: (doc: any) => void;
  showVoiceControlPanel: boolean;
  setShowVoiceControlPanel: (show: boolean) => void;
  isVoiceListening: boolean;
  stopVoiceDictation: (autoSend?: boolean) => void;
  startVoiceDictation: (locale?: string) => void;
  micVolume: number;
  voiceLanguage: string;
  setVoiceLanguage: (lang: string) => void;
  voiceInterimText: string;
  setVoiceInterimText: (txt: string) => void;
  voiceAppendMode: boolean;
  setVoiceAppendMode: (append: boolean) => void;
  voiceAutoSend: boolean;
  setVoiceAutoSend: (auto: boolean) => void;
  voiceError: string | null;
  setVoiceError: (err: string | null) => void;
  adjustTextareaHeight: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  handleFileAttach: (files: File[]) => void;
  plusMenuRef: React.RefObject<HTMLDivElement | null>;
  menuContentRef: React.RefObject<HTMLDivElement | null>;
  plusMenuPopupPosition: { style: React.CSSProperties };
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  setIsUrlToolOpen: (open: boolean) => void;
  setIsTranscriptToolOpen: (open: boolean) => void;
  handleScreenshot: () => void;
  activeAssistantMode: string;
  coderPermissionMode: CoderPermissionMode;
  setCoderPermissionMode: (mode: CoderPermissionMode) => void;
  pendingCommandPermission: PendingCommandPermission | null;
  setPendingCommandPermission: (
    request: PendingCommandPermission | null,
  ) => void;
  permissionAuditLog: any[];
  isModeDropdownOpen: boolean;
  setIsModeDropdownOpen: (open: boolean) => void;
  modeDropdownRef: React.RefObject<HTMLDivElement | null>;
  modeDropdownContentRef: React.RefObject<HTMLDivElement | null>;
  modeDropdownPosition: { style: React.CSSProperties };
  setActiveAssistantMode: (mode: any) => void;
  modelSelectorMode: string;
  setIsModelDrawerOpen: (open: boolean) => void;
  activeModelList: any[];
  activeModelId: string;
  availableModels: any[];
  modelSearchQuery: string;
  setModelSearchQuery: (query: string) => void;
  filteredModelList: any[];
  favoriteModelIds?: string[];
  favoriteModels?: any[];
  toggleFavoriteModel?: (id: string) => void;
  isFavoritesCollapsed?: boolean;
  setIsFavoritesCollapsed?: (collapsed: boolean) => void;
  providerModelCategories?: Array<{ id: string; label: string; models: any[] }>;
  collapsedModelCategories?: Record<string, boolean>;
  toggleModelCategory?: (id: string) => void;
  handleModelSelect: (id: string) => void;
  isTyping: boolean;
  setIsTyping: (typing: boolean) => void;
  abortControllerRef: React.MutableRefObject<AbortController | null>;
  handleSend: () => void;
  dropdownRef: React.RefObject<HTMLDivElement | null>;
  modelDropdownPosition: { style: React.CSSProperties };
  showToast: (msg: string) => void;
  setIsModelDropdownOpen: (open: boolean) => void;
  setWritingStyle: (style: string) => void;
  isModelDropdownOpen: boolean;
  modelDropdownContentRef: React.RefObject<HTMLDivElement | null>;
  isWhiteboardOpen?: boolean;
  setIsWhiteboardOpen?: (open: boolean) => void;
  onOpenLocalModelConfig?: (id: string) => void;
  localModelLoadingId?: string | null;
  localModelLoadingProgress?: number;
  loadedLocalModelId?: string | null;
  useLocalModelsOnly?: boolean;
  isVoicePanelOpen?: boolean;
  setIsVoicePanelOpen?: (open: boolean) => void;
  researchState?: any;
}

export const ChatBoxPanel: React.FC<ChatBoxPanelProps> = ({
  isCenteredState = false,
  theme,
  isWhiteboardOpen,
  setIsWhiteboardOpen,
  researchState,
  writingStyle,
  isWebSearchEnabled,
  setIsWebSearchEnabled,
  isDeepSearchEnabled,
  setIsDeepSearchEnabled,
  activeSkills,
  setActiveSkills,
  useTurboQuant,
  isPlusMenuOpen,
  setIsPlusMenuOpen,
  activePlusSubMenu,
  setActivePlusSubMenu,
  luminaTools,
  setLuminaTools,
  bridgeTools,
  setBridgeTools,
  composioTools,
  setComposioTools,
  composioConnections,
  composioEnabled,
  fetchComposioStatus,
  toggleComposioTool,
  toggleAllToolsForToolkit,
  showTodoPanel,
  setShowTodoPanel,
  coderTodos,
  setCoderTodos,
  activeCommandQuery,
  setActiveCommandQuery,
  activeCommandType,
  setActiveCommandType,
  isGeneratingTodos,
  todoCollapsed,
  setTodoCollapsed,
  isCoderMode,
  showsSlashCommands,
  filteredCommands,
  selectedCommandIndex,
  setSelectedCommandIndex,
  input,
  setInput,
  inputRef,
  showAskAiPanel,
  askAiQuestions,
  askAiAnswers,
  currentQuestionIndex,
  handleDotClick,
  handleFinishQuestions,
  isTransitioningQuestion,
  isGeneratingQuestions,
  isAnalyzingAnswers,
  renderActiveQuestionContent,
  attachedFiles,
  setAttachedFiles,
  localElementAttachments,
  setLocalElementAttachments,
  attachedUrlDocs,
  setAttachedUrlDocs,
  setAttachmentContextMenu,
  setSelectedModalAttachment,
  setTranscriptionOptionsDoc,
  showVoiceControlPanel,
  setShowVoiceControlPanel,
  isVoiceListening,
  stopVoiceDictation,
  startVoiceDictation,
  micVolume,
  voiceLanguage,
  setVoiceLanguage,
  voiceInterimText,
  setVoiceInterimText,
  voiceAppendMode,
  setVoiceAppendMode,
  voiceAutoSend,
  setVoiceAutoSend,
  voiceError,
  setVoiceError,
  adjustTextareaHeight,
  handleKeyDown,
  handleFileAttach,
  plusMenuRef,
  menuContentRef,
  plusMenuPopupPosition,
  fileInputRef,
  setIsUrlToolOpen,
  setIsTranscriptToolOpen,
  handleScreenshot,
  activeAssistantMode,
  coderPermissionMode,
  setCoderPermissionMode,
  pendingCommandPermission,
  setPendingCommandPermission,
  permissionAuditLog,
  isModeDropdownOpen,
  setIsModeDropdownOpen,
  modeDropdownRef,
  modeDropdownContentRef,
  modeDropdownPosition,
  setActiveAssistantMode,
  modelSelectorMode,
  setIsModelDrawerOpen,
  activeModelList,
  activeModelId,
  availableModels,
  modelSearchQuery,
  setModelSearchQuery,
  filteredModelList,
  favoriteModelIds = [],
  favoriteModels = [],
  toggleFavoriteModel = () => {},
  isFavoritesCollapsed = false,
  setIsFavoritesCollapsed = () => {},
  providerModelCategories = [],
  collapsedModelCategories = {},
  toggleModelCategory = () => {},
  handleModelSelect,
  isTyping,
  setIsTyping,
  abortControllerRef,
  handleSend,
  dropdownRef,
  modelDropdownPosition,
  showToast,
  setIsModelDropdownOpen,
  setWritingStyle,
  isModelDropdownOpen,
  modelDropdownContentRef,
  onOpenLocalModelConfig,
  localModelLoadingId,
  localModelLoadingProgress,
  loadedLocalModelId,
  useLocalModelsOnly,
  isVoicePanelOpen,
  setIsVoicePanelOpen,
}) => {
  const LARGE_PROVIDER_THRESHOLD = 50;
  const LARGE_PROVIDER_VISIBLE_COUNT = 30;
  const normalizedModelSearchQuery = modelSearchQuery.trim().toLowerCase();
  const hasModelSearch = normalizedModelSearchQuery.length > 0;

  const [isRagSelectorOpen, setIsRagSelectorOpen] = React.useState(false);
  const [isDeepResearchPresetOpen, setIsDeepResearchPresetOpen] = React.useState(false);
  const deepResearchPresetRef = React.useRef<HTMLDivElement | null>(null);
  const [ollamaWebSearchEnabled, setOllamaWebSearchEnabled] = React.useState(() => {
    try {
      return localStorage.getItem('lumina_ollama_web_search_enabled') === 'true';
    } catch {
      return false;
    }
  });
  const [ragEnabled, setRagEnabled] = React.useState(() => {
    return localStorage.getItem('lumina_rag_enabled') !== 'false';
  });
  const [selectedDocIds, setSelectedDocIds] = React.useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('lumina_rag_doc_ids') || '[]');
    } catch {
      return [];
    }
  });

  const handleToggleRag = (enabled: boolean) => {
    setRagEnabled(enabled);
    localStorage.setItem('lumina_rag_enabled', String(enabled));
  };

  const handleSelectionChange = (ids: string[]) => {
    setSelectedDocIds(ids);
    localStorage.setItem('lumina_rag_doc_ids', JSON.stringify(ids));
  };

  const isOllamaProvider = React.useMemo(() => {
    try {
      const providerId = (localStorage.getItem('lumina_provider') || '').toLowerCase();
      return providerId === 'ollama_local' || providerId === 'ollama_cloud';
    } catch {
      return false;
    }
  }, [activeModelId]);

  React.useEffect(() => {
    try {
      localStorage.setItem('lumina_ollama_web_search_enabled', ollamaWebSearchEnabled ? 'true' : 'false');
    } catch {}
  }, [ollamaWebSearchEnabled]);

  const [isPermissionDropdownOpen, setIsPermissionDropdownOpen] =
    React.useState(false);
  const permissionDropdownRef = React.useRef<HTMLDivElement | null>(null);

  const [isGridMenuOpen, setIsGridMenuOpen] = React.useState(false);
  const [activeGridSubMenu, setActiveGridSubMenu] = React.useState<"main" | "skills" | "style" | "lumina_tools" | "tools" | "composio">("main");
  const gridMenuButtonRef = React.useRef<HTMLDivElement | null>(null);
  const gridMenuContentRef = React.useRef<HTMLDivElement | null>(null);

  const gridMenuPopupPosition = useSmartPopupPosition({
    triggerRef: gridMenuButtonRef,
    popupRef: gridMenuContentRef,
    isOpen: isGridMenuOpen,
    align: "left",
  });

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        permissionDropdownRef.current &&
        !permissionDropdownRef.current.contains(target)
      ) {
        setIsPermissionDropdownOpen(false);
      }
      if (
        isGridMenuOpen &&
        gridMenuButtonRef.current &&
        !gridMenuButtonRef.current.contains(target) &&
        gridMenuContentRef.current &&
        !gridMenuContentRef.current.contains(target)
      ) {
        setIsGridMenuOpen(false);
      }
      if (
        isPlusMenuOpen &&
        plusMenuRef.current &&
        !plusMenuRef.current.contains(target) &&
        menuContentRef.current &&
        !menuContentRef.current.contains(target)
      ) {
        setIsPlusMenuOpen(false);
      }
      if (
        isDeepResearchPresetOpen &&
        deepResearchPresetRef.current &&
        !deepResearchPresetRef.current.contains(target)
      ) {
        setIsDeepResearchPresetOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isGridMenuOpen, isPlusMenuOpen, plusMenuRef, menuContentRef, isDeepResearchPresetOpen, deepResearchPresetRef]);

  const permissionOptions: Array<{
    id: CoderPermissionMode;
    label: string;
    icon: React.ReactNode;
  }> = [
    { id: "default", label: "Default", icon: <Hand size={14} /> },
    { id: "auto-review", label: "Auto-review", icon: <Shield size={14} /> },
    {
      id: "full-access",
      label: "Full access",
      icon: <ShieldCheck size={14} />,
    },
  ];

  const resolvePendingPermission = (
    decision: "allow-once" | "allow-always" | "deny",
  ) => {
    pendingCommandPermission?.resolve(decision);
    setPendingCommandPermission(null);
    showToast(
      decision === "deny"
        ? "Command denied."
        : decision === "allow-always"
          ? "Command allowed permanently."
          : "Command allowed once.",
    );
  };

  const renderCategorizedModels = () => (
    <>
      <div className="px-2 pt-1 flex items-center justify-between">
        <span className="text-[8px] font-bold uppercase tracking-widest text-[var(--theme-muted)]">Categories</span>
        <span className="text-[8px] font-mono text-[var(--theme-secondary)]">{favoriteModelIds.length}/20 Favorites</span>
      </div>

      <div className="rounded-xl border border-[var(--theme-border)] overflow-hidden">
        <button onClick={() => setIsFavoritesCollapsed(!isFavoritesCollapsed)} className="w-full h-8 px-2.5 flex items-center gap-2 text-[10px] font-bold text-[var(--theme-primary)] bg-[var(--theme-hover-bg)]">
          {isFavoritesCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
          <Sparkles size={12} className="text-[var(--theme-accent)]" />
          <span className="flex-1 text-left">Favorites</span>
          <span className="text-[8px] text-[var(--theme-secondary)]">{favoriteModels.length}</span>
        </button>
        {!isFavoritesCollapsed && (
          <div className="p-1 space-y-1">
            {favoriteModels.length > 0 ? favoriteModels.map((model) => (
              <button key={`fav-${model.id}`} onClick={() => handleModelSelect(model.id)} className={`w-full min-h-[36px] flex items-center gap-2 px-2 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${activeModelId === model.id ? "bg-[var(--theme-hover-bg)] text-[var(--theme-primary)]" : "text-[var(--theme-secondary)] hover:bg-[var(--theme-hover-bg)]/60 hover:text-[var(--theme-primary)]"}`}>
                <Sparkles size={12} className="text-[var(--theme-accent)] shrink-0" />
                <span className="flex-1 text-left min-w-0">
                  <span className="block truncate">{model.name}</span>
                  <span className="block text-[8px] font-mono text-[var(--theme-secondary)]/60 truncate uppercase tracking-tight">{model.id.split("/").slice(-1)[0]}</span>
                </span>
                {activeModelId === model.id && <Check size={11} className="text-[var(--theme-accent)] shrink-0" strokeWidth={3} />}
              </button>
            )) : (
              <div className="py-4 text-center text-[10px] text-[var(--theme-muted)]">No favorite models yet</div>
            )}
          </div>
        )}
      </div>

      {providerModelCategories.map(category => {
        const collapsed = collapsedModelCategories[category.id];
        const categoryModels = Array.isArray(category.models) ? category.models : [];
        const matchingModels = hasModelSearch
          ? categoryModels.filter((model) => {
              const id = String(model?.id || '').toLowerCase();
              const name = String(model?.name || '').toLowerCase();
              const author = String(model?.author || model?.providerProfileName || '').toLowerCase();
              return (
                id.includes(normalizedModelSearchQuery) ||
                name.includes(normalizedModelSearchQuery) ||
                author.includes(normalizedModelSearchQuery)
              );
            })
          : categoryModels;
        const visibleModels = !hasModelSearch && categoryModels.length > LARGE_PROVIDER_THRESHOLD
          ? matchingModels.slice(0, LARGE_PROVIDER_VISIBLE_COUNT)
          : matchingModels;
        const hiddenCount = Math.max(0, categoryModels.length - visibleModels.length);

        return (
          <div key={category.id} className="rounded-xl border border-[var(--theme-border)] overflow-hidden">
            <button onClick={() => toggleModelCategory(category.id)} className="w-full h-8 px-2.5 flex items-center gap-2 text-[10px] font-bold text-[var(--theme-primary)] bg-[var(--theme-hover-bg)]">
              {collapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
              <span className="flex-1 text-left truncate">{category.label}</span>
              <span className="text-[8px] text-[var(--theme-secondary)]">{categoryModels.length}</span>
            </button>
            {!collapsed && (
              <div className="p-1 space-y-1">
                {visibleModels.map((model) => {
                  const isSelected = activeModelId === model.id;
                  const isLocal = model.id.toLowerCase().includes("gguf");
                  const isFavorite = favoriteModelIds.includes(model.id);
                  return (
                    <div key={`${category.id}-${model.id}`} className={`w-full min-h-[40px] flex items-center gap-2 px-2 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 border-l-[3px] ${isSelected ? "bg-[var(--theme-hover-bg)] text-[var(--theme-primary)] border-[var(--theme-accent)] shadow-sm" : "text-[var(--theme-secondary)] hover:bg-[var(--theme-hover-bg)]/60 hover:text-[var(--theme-primary)] border-transparent"}`}>
                      <button onClick={() => handleModelSelect(model.id)} className="flex-1 min-w-0 flex items-center gap-2 text-left">
                        <div className={`p-1 rounded-lg flex items-center justify-center shrink-0 ${isSelected ? "bg-[var(--theme-surface)] shadow-sm" : "bg-[var(--theme-surface-alt)]"}`}>
                          {renderAppModelLogo(model.author || model.providerProfileName || model.id.split('/')[0] || '', model.id, model.icon)}
                        </div>
                        <span className="flex-1 text-left min-w-0">
                          <span className={`block truncate ${isSelected ? "font-bold" : "font-semibold"}`}>{model.name}</span>
                          <span className="block text-[8px] font-mono text-[var(--theme-secondary)]/60 truncate uppercase tracking-tight">{isLocal ? "LOCAL GGUF - HOSTED" : model.id.split("/").slice(-1)[0]}</span>
                        </span>
                      </button>
                      <button onClick={() => toggleFavoriteModel(model.id)} className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-colors ${isFavorite ? "text-[var(--theme-accent)] bg-[var(--theme-accent)]/10" : "text-[var(--theme-muted)] hover:text-[var(--theme-accent)] hover:bg-[var(--theme-hover-bg)]"}`} title={isFavorite ? "Remove favorite" : "Add favorite"}>
                        <Sparkles size={12} />
                      </button>
                      {isSelected && <Check size={11} className="text-[var(--theme-accent)] shrink-0" strokeWidth={3} />}
                    </div>
                  );
                })}
                {hasModelSearch && visibleModels.length === 0 && (
                  <div className="py-3 px-2 text-center text-[10px] text-[var(--theme-muted)]">
                    No models in this provider match "{modelSearchQuery.trim()}".
                  </div>
                )}
                {!hasModelSearch && hiddenCount > 0 && (
                  <div className="px-2 py-2 text-[10px] text-center text-[var(--theme-muted)] border border-dashed border-[var(--theme-border)] rounded-lg bg-[var(--theme-surface-alt)]/60">
                    Showing {visibleModels.length} of {categoryModels.length} models. Search a model name to reveal the rest.
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </>
  );

  return (
    <div className="w-full flex flex-col text-left">
      <AnimatePresence mode="popLayout">
        {(writingStyle !== "default" ||
          isWebSearchEnabled ||
          isDeepSearchEnabled ||
          luminaTools.some((t) => t.enabled) ||
          bridgeTools.some((t) => t.enabled) ||
          activeSkills.length > 0 ||
          useTurboQuant) && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 5 }}
            className="flex items-center gap-1.5 px-1 mb-2.5 flex-wrap z-10"
          >
            {writingStyle !== "default" && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsPlusMenuOpen(true);
                  setActivePlusSubMenu("style");
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-500/10 text-orange-500 border border-orange-500/20 shadow-sm cursor-pointer hover:bg-orange-500/15 text-xs font-semibold"
              >
                {WRITING_STYLES.find((s) => s.id === writingStyle)?.icon}
                <span>
                  Style:{" "}
                  {WRITING_STYLES.find((s) => s.id === writingStyle)?.label}
                </span>
              </motion.button>
            )}
            {isWebSearchEnabled && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsPlusMenuOpen(true);
                  setActivePlusSubMenu("main");
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20 shadow-sm cursor-pointer hover:bg-blue-500/15 text-xs font-semibold"
              >
                <Globe size={13} />
                <span>Web Search</span>
              </motion.button>
            )}
            {isDeepSearchEnabled && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsPlusMenuOpen(true);
                  setActivePlusSubMenu("main");
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/30 shadow-xs cursor-pointer hover:bg-purple-500/25 text-xs font-semibold"
              >
                <Bot size={13} className="animate-pulse text-purple-400" />
                <span className="flex items-center gap-1">
                  Deep Search
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-ping" />
                </span>
              </motion.button>
            )}
            {(() => {
              const nonWikiTools = luminaTools.filter((t) => t.enabled && !t.id.startsWith('wiki_'));
              const isWikiEnabled = luminaTools.some((t) => t.enabled && t.id.startsWith('wiki_'));
              
              const elements = nonWikiTools.map((tool) => (
                <motion.button
                  key={tool.id}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsPlusMenuOpen(true);
                    setActivePlusSubMenu("lumina_tools");
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-500/10 text-indigo-450 border border-indigo-500/20 shadow-sm cursor-pointer hover:bg-indigo-500/15 text-xs font-semibold"
                >
                  {tool.icon || <Hammer size={12} />}
                  <span>{tool.name}</span>
                </motion.button>
              ));

              if (isWikiEnabled) {
                elements.push(
                  <motion.button
                    key="wiki_scrab_tag"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsPlusMenuOpen(true);
                      setActivePlusSubMenu("lumina_tools");
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-500/10 text-indigo-450 border border-indigo-500/20 shadow-sm cursor-pointer hover:bg-indigo-500/15 text-xs font-semibold"
                  >
                    <BookOpen size={12} className="text-indigo-450" />
                    <span>Wiki Scrab</span>
                  </motion.button>
                );
              }

              return elements;
            })()}
            {bridgeTools.filter((t) => t.enabled).map((tool) => (
              <motion.button
                key={tool.id}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsPlusMenuOpen(true);
                  setActivePlusSubMenu("tools");
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shadow-sm cursor-pointer hover:bg-emerald-500/15 text-xs font-semibold"
              >
                {tool.icon || <Wrench size={12} />}
                <span>{tool.name}</span>
              </motion.button>
            ))}
            {activeSkills.map((skillId) => {
              const skill = SKILLS.find((s) => s.id === skillId);
              if (!skill) return null;
              return (
                <motion.button
                  key={skill.id}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsPlusMenuOpen(true);
                    setActivePlusSubMenu("skills");
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 shadow-sm cursor-pointer hover:bg-indigo-500/15 text-xs font-semibold"
                >
                  {skill.icon}
                  <span>{skill.label}</span>
                </motion.button>
              );
            })}
            {useTurboQuant && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20 text-xs font-semibold shadow-sm shrink-0 select-none cursor-default font-sans"
                title="TurboQuant context compression is active — large tool outputs will be compressed before being sent to AI"
              >
                <Zap size={12} className="fill-violet-400" />
                <span>TurboQuant</span>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div
        className={`relative border border-[var(--theme-input-border)] bg-[var(--theme-input-bg)] focus-within:border-[var(--theme-accent)]/40 overflow-visible flex flex-col p-2 min-h-[100px] justify-between transition-all duration-300 shadow-[0_12px_45px_rgba(0,0,0,0.6)] cursor-text ${
          isCenteredState
            ? "rounded-[24px] border-[var(--theme-input-border)] z-10"
            : "rounded-[24px] border-[var(--theme-input-border)] z-10"
        }`}
        onClick={(e) => {
          // Forward clicks on the padding area to the textarea
          if ((e.target as HTMLElement) === e.currentTarget) {
            if (inputRef && "current" in inputRef) inputRef.current?.focus();
          }
        }}
      >


        {/* Nested Panel: Workspace Command Center */}
        <AnimatePresence>
          {showsSlashCommands && filteredCommands.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -10 }}
              animate={{ opacity: 1, height: "auto", y: 0 }}
              exit={{ opacity: 0, height: 0, y: -10 }}
              transition={{ type: "spring", stiffness: 320, damping: 26 }}
              className="overflow-hidden w-full border-b border-[var(--theme-border)]/45 pb-3.5 mb-3 flex flex-col gap-2.5 shrink-0"
            >
              <div className="flex flex-col gap-2.5 bg-[var(--theme-surface-alt)]/35 hover:bg-[var(--theme-surface-alt)]/55 backdrop-blur-md transition-all p-3.5 rounded-2xl border border-[var(--theme-border)]/45 mx-1 mt-1 shadow-md">
                {/* Header */}
                <div className="h-10 border-b border-[var(--theme-border)]/25 pl-2 pr-1 py-1.5 flex items-center justify-between shrink-0 select-none font-sans">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--theme-accent)] animate-pulse" />
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--theme-accent)]">
                      Workspace Command Center
                    </span>
                    <span className="text-[10px] text-[var(--theme-primary)] bg-[var(--theme-border)]/15 border border-[var(--theme-border)]/25 px-2 py-0.5 rounded-full font-mono font-bold">
                      {filteredCommands.length} Found
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] text-[var(--theme-muted)] italic hidden sm:inline mr-1">
                      Press Up/Down to Navigate, Enter to Select
                    </span>
                    <button
                      type="button"
                      onClick={() => setInput(input + " ")}
                      className="p-1 hover:bg-white/5 rounded-lg text-[var(--theme-muted)] hover:text-[var(--theme-primary)] transition-all cursor-pointer flex items-center justify-center w-6 h-6"
                      title="Dismiss Command suggestions"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>

                {/* Suggestions List */}
                <div className="p-1.5 flex flex-col gap-1 max-h-[195px] overflow-y-auto custom-scrollbar font-sans">
                  {filteredCommands.map((cmd, idx) => {
                    const isSelected = idx === selectedCommandIndex;
                    return (
                      <button
                        key={cmd.id}
                        type="button"
                        onClick={() => {
                          setInput(`/${cmd.name} `);
                          setSelectedCommandIndex(0);
                          if (
                            inputRef &&
                            "current" in inputRef &&
                            inputRef.current
                          ) {
                            inputRef.current.focus();
                          }
                        }}
                        onMouseEnter={() => setSelectedCommandIndex(idx)}
                        className={`w-full flex items-center px-3 py-2.5 rounded-xl text-left transition-all select-none gap-3 outline-none duration-200 border cursor-pointer relative overflow-hidden ${
                          isSelected
                            ? "bg-[var(--theme-accent)]/[0.07] text-[var(--theme-primary)] border-[var(--theme-accent)]/40 shadow-sm"
                            : "text-[var(--theme-secondary)] hover:text-[var(--theme-primary)] hover:bg-[var(--theme-border)]/10 border-transparent"
                        }`}
                      >
                        {/* Active Slide Accent highlight */}
                        {isSelected && (
                          <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[var(--theme-accent)]" />
                        )}

                        {/* Left icon badge or dynamic type */}
                        <div
                          className={`w-[22px] h-[22px] rounded-lg flex items-center justify-center shrink-0 transition-transform ${
                            isSelected
                              ? "bg-[var(--theme-accent)]/15 text-[var(--theme-accent)] scale-105"
                              : "bg-[var(--theme-border)]/20 text-[var(--theme-muted)]/70"
                          }`}
                        >
                          <span className="text-xs font-mono font-bold">/</span>
                        </div>

                        <div className="flex-1 flex flex-col sm:flex-row sm:items-center sm:gap-3">
                          <span
                            className={`font-mono text-xs font-bold leading-none ${
                              isSelected
                                ? "text-[var(--theme-accent)]"
                                : "text-[var(--theme-primary)]"
                            }`}
                          >
                            /{cmd.name}
                          </span>
                          <span
                            className={`font-sans text-[11px] truncate leading-none ${
                              isSelected
                                ? "text-[var(--theme-primary)]"
                                : "text-[var(--theme-muted)]"
                            }`}
                          >
                            {cmd.desc}
                          </span>
                        </div>

                        {isSelected && (
                          <div className="text-[9px] text-[var(--theme-accent)] bg-[var(--theme-accent)]/10 px-2 py-0.5 rounded-md font-bold flex items-center gap-1 shrink-0 animate-fade-in font-mono tracking-wider">
                            ENTER <ChevronRight size={8} strokeWidth={3} />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Nested Panel: Ask AI Clarification Quiz */}
        <AnimatePresence>
          {showAskAiPanel && askAiQuestions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -10 }}
              animate={{ opacity: 1, height: "auto", y: 0 }}
              exit={{ opacity: 0, height: 0, y: -10 }}
              transition={{ type: "spring", stiffness: 320, damping: 26 }}
              className="overflow-hidden w-full border-b border-[var(--theme-border)]/45 pb-3.5 mb-3 flex flex-col gap-2.5 shrink-0"
            >
              <div className="flex flex-col bg-[var(--theme-surface-alt)]/35 hover:bg-[var(--theme-surface-alt)]/55 backdrop-blur-md transition-all p-4.5 rounded-2xl border border-[var(--theme-border)]/45 text-left min-h-[250px] max-h-[380px] h-auto overflow-hidden select-none mx-1 mt-1 shadow-md">
                {/* Header: Progress & Close */}
                <div className="flex items-center justify-between shrink-0 mb-3 font-sans">
                  {/* Progress Dots */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 bg-[var(--theme-border)]/15 px-2 py-1 rounded-xl">
                      {askAiQuestions.map((q, idx) => {
                        const isAnswered = askAiAnswers[q.id] !== undefined;
                        const isActive = idx === currentQuestionIndex;
                        return (
                          <button
                            key={q.id}
                            type="button"
                            onClick={() => handleDotClick(idx)}
                            disabled={!isAnswered && idx > currentQuestionIndex}
                            className={`w-2.5 h-2.5 rounded-full transition-all duration-350 cursor-pointer ${
                              isActive
                                ? "bg-[var(--theme-accent)] scale-110 shadow-[0_0_10px_var(--theme-accent)]"
                                : isAnswered
                                  ? "bg-[var(--theme-accent)]/55 hover:bg-[var(--theme-accent)]"
                                  : "bg-[var(--theme-border)] hover:bg-[var(--theme-secondary)]/30 disabled:pointer-events-none"
                            }`}
                            title={`Question ${idx + 1}: ${q.purpose || q.question}`}
                          />
                        );
                      })}
                    </div>
                    <span className="text-[10px] text-[var(--theme-accent)] font-mono font-bold tracking-widest uppercase bg-[var(--theme-accent)]/10 border border-[var(--theme-accent)]/20 px-2 py-0.5 rounded-full select-none">
                      Q{currentQuestionIndex + 1}/{askAiQuestions.length}
                    </span>
                  </div>

                  {/* Skip All Button */}
                  <button
                    type="button"
                    onClick={() => handleFinishQuestions(true)}
                    className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold tracking-tight text-[var(--theme-secondary)] hover:text-[var(--theme-primary)] hover:bg-[var(--theme-border)]/20 border border-[var(--theme-border)]/25 rounded-xl transition-all cursor-pointer"
                  >
                    <X size={12} />
                    <span>Skip Quiz</span>
                  </button>
                </div>

                {/* Main Question Block */}
                <div className="flex-1 flex flex-col justify-center min-h-0 py-1.5">
                  <AnimatePresence mode="wait">
                    {!isTransitioningQuestion &&
                      !isGeneratingQuestions &&
                      !isAnalyzingAnswers && (
                        <motion.div
                          key={currentQuestionIndex}
                          initial={{ y: 15, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          exit={{ y: -20, opacity: 0 }}
                          transition={{ duration: 0.2, ease: "easeInOut" }}
                          className="flex flex-col h-full justify-between gap-3.5"
                        >
                          {/* Question Text */}
                          <div className="text-[14px] leading-normal tracking-tight flex flex-col gap-1 select-none font-sans">
                            <span className="text-[var(--theme-primary)] font-semibold text-sm sm:text-base">
                              {askAiQuestions[currentQuestionIndex].question}
                            </span>
                            {askAiQuestions[currentQuestionIndex].purpose && (
                              <span className="text-[11px] text-[var(--theme-muted)] font-medium select-none font-sans flex items-center gap-1">
                                <span className="text-[12px] shrink-0">💡</span>
                                <span className="italic">
                                  Purpose:{" "}
                                  {askAiQuestions[currentQuestionIndex].purpose}
                                </span>
                              </span>
                            )}
                          </div>

                          {/* Question Content Types */}
                          <div className="flex-1 flex items-center min-h-0 select-none">
                            {renderActiveQuestionContent()}
                          </div>
                        </motion.div>
                      )}

                    {isGeneratingQuestions && (
                      <motion.div
                        key="generating-loader"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex flex-col items-center justify-center gap-3.5 h-full py-8 text-center select-none font-sans"
                      >
                        <Loader2
                          size={28}
                          className="text-[var(--theme-accent)] animate-spin"
                        />
                        <div className="flex flex-col gap-1">
                          <span className="text-xs font-extrabold tracking-widest uppercase text-[var(--theme-accent)] animate-pulse">
                            Cognitive Appraisal
                          </span>
                          <span className="text-[11px] text-[var(--theme-muted)]">
                            Formulating clarification questions for your
                            workspace session...
                          </span>
                        </div>
                      </motion.div>
                    )}

                    {isAnalyzingAnswers && (
                      <motion.div
                        key="analyzing-loader"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex flex-col items-center justify-center gap-3.5 h-full py-8 text-center select-none font-sans"
                      >
                        <Loader2
                          size={28}
                          className="text-[var(--theme-accent)] animate-spin"
                        />
                        <div className="flex flex-col gap-1">
                          <span className="text-xs font-extrabold tracking-widest uppercase text-[var(--theme-accent)] animate-pulse">
                            Synthesizing Intent
                          </span>
                          <span className="text-[11px] text-[var(--theme-muted)]">
                            Weaving answers into a high-fidelity engineer task
                            blueprint...
                          </span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-1 px-3 pt-2">
          {(attachedFiles.length > 0 ||
            localElementAttachments.length > 0 ||
            attachedUrlDocs.length > 0) && (
            <div className="flex flex-wrap gap-2 pt-1 pb-3 items-center">
              {attachedFiles.map((file, idx) => {
                const isImage = file.type.startsWith("image/");
                const ext = file.name.split(".").pop()?.toUpperCase() || "DOC";
                let previewUrl = "";
                if (isImage) {
                  try {
                    previewUrl = URL.createObjectURL(file);
                  } catch (e) {
                    previewUrl = "";
                  }
                }
                return (
                  <motion.div
                    key={`${file.name}-${idx}`}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`relative flex items-center gap-2.5 px-3 py-1.5 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface-alt)] text-[var(--theme-primary)] hover:bg-[var(--theme-hover-bg)] transition-all max-w-[215px] h-12 shadow-sm group/file ${isImage ? "cursor-pointer" : ""}`}
                    onClick={() => {
                      if (isImage && previewUrl) {
                        if (
                          typeof (window as any).openImageLightbox ===
                          "function"
                        ) {
                          (window as any).openImageLightbox(
                            previewUrl,
                            file.name,
                          );
                        }
                      }
                    }}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setAttachedFiles((prev) =>
                          prev.filter((_, i) => i !== idx),
                        );
                      }}
                      className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-zinc-800 hover:bg-zinc-700 border border-[var(--theme-border)] text-gray-400 hover:text-white flex items-center justify-center transition-all z-10 shadow-lg cursor-pointer"
                    >
                      <X size={12} />
                    </button>
                    <div className="w-8 h-8 bg-zinc-800 border border-[var(--theme-border)] rounded-lg flex items-center justify-center text-[9px] font-black uppercase text-gray-400 tracking-wider overflow-hidden shrink-0">
                      {isImage && previewUrl ? (
                        <img
                          src={previewUrl}
                          alt=""
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        ext
                      )}
                    </div>
                    <div className="flex-1 min-w-0 pr-1 flex flex-col justify-center text-left">
                      <div className="truncate font-semibold text-xs text-zinc-100 leading-none">
                        {file.name}
                      </div>
                      <div className="text-[10px] text-gray-550 font-bold tracking-tight leading-none mt-1">
                        {(file.size / 1024).toFixed(0)} KB
                      </div>
                    </div>
                  </motion.div>
                );
              })}

              {localElementAttachments.map((att, idx) => (
                <motion.div
                  key={att.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const menuWidth = 192;
                    const menuHeight = 140;
                    const margin = 12;
                    const x = Math.min(
                      Math.max(e.clientX, margin),
                      Math.max(margin, window.innerWidth - menuWidth - margin)
                    );
                    const y = Math.min(
                      Math.max(e.clientY, margin),
                      Math.max(margin, window.innerHeight - menuHeight - margin)
                    );
                    setAttachmentContextMenu({
                      visible: true,
                      x,
                      y,
                      attachment: att,
                      index: idx,
                    });
                  }}
                  onClick={() => {
                    setSelectedModalAttachment(att);
                  }}
                  className="relative flex items-center justify-center w-12 h-12 rounded-xl border-2 border-teal-500/50 bg-teal-500/10 text-teal-400 hover:border-teal-400 hover:bg-teal-500/20 transition-all cursor-pointer shadow-[0_0_12px_rgba(20,184,166,0.25)] group/att shrink-0"
                  title="Selected layout element attachment (Right-click to open in editor)"
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      setLocalElementAttachments((prev) =>
                        prev.filter((_, i) => i !== idx),
                      );
                    }}
                    className="absolute -top-1.5 -right-1.5 w-4.5 h-4.5 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-teal-500 text-teal-300 hover:text-white flex items-center justify-center transition-all z-10 shadow-lg cursor-pointer animate-fade-in"
                  >
                    <X size={10} />
                  </button>
                  <div className="flex items-center justify-center">
                    <MousePointerClick
                      size={18}
                      className="text-teal-400 animate-pulse"
                    />
                  </div>
                </motion.div>
              ))}

              {attachedUrlDocs.map((doc) => (
                <motion.div
                  key={doc.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  onClick={() => {
                    setTranscriptionOptionsDoc(doc);
                  }}
                  className="relative flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 active:scale-95 border border-blue-500/30 text-blue-300 text-xs font-semibold shrink-0 max-w-[210px] font-sans transition-all cursor-pointer animate-fade-in"
                  title="Click to open or view in virtual code editor"
                >
                  {doc.favicon ? (
                    <img
                      src={doc.favicon}
                      alt=""
                      className="w-4 h-4 rounded-sm shrink-0"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : null}
                  <LinkIcon size={12} className="shrink-0 text-blue-400" />
                  <span className="truncate">
                    {doc.title.slice(0, 30) || doc.url}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setAttachedUrlDocs((prev) =>
                        prev.filter((d) => d.id !== doc.id),
                      );
                    }}
                    className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-zinc-900 border border-blue-500/50 text-blue-300 hover:text-white flex items-center justify-center transition-all z-10 cursor-pointer animate-fade-in"
                  >
                    <X size={9} />
                  </button>
                </motion.div>
              ))}
            </div>
          )}

          {/* Advanced Voice Dictation & Ambient Soundboard Control Pane */}
          <AnimatePresence>
            {showVoiceControlPanel && (
              <motion.div
                initial={{ opacity: 0, height: 0, y: -7 }}
                animate={{ opacity: 1, height: "auto", y: 0 }}
                exit={{ opacity: 0, height: 0, y: -7 }}
                className="overflow-hidden w-full border-b border-[var(--theme-border)]/55 pb-3 mb-3 flex flex-col gap-2.5 shrink-0"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 bg-[var(--theme-surface-alt)]/45 hover:bg-[var(--theme-bg)]/60 transition-all p-3 rounded-2xl border border-[var(--theme-border)]/55 shadow-inner">
                  {/* Left: Interactive Mic Controller */}
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      {isVoiceListening ? (
                        <>
                          <span
                            className="absolute -inset-1.5 rounded-full bg-red-500/25 animate-ping"
                            style={{ animationDuration: "1.4s" }}
                          ></span>
                          <span
                            className="absolute -inset-3.5 rounded-full bg-red-500/10 animate-ping"
                            style={{ animationDuration: "2.4s" }}
                          ></span>
                          <div
                            className="w-10 h-10 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center cursor-pointer relative z-10 transition-all active:scale-90 shadow-md shadow-red-500/20"
                            onClick={() => stopVoiceDictation()}
                            title="Deactivate Voice Input"
                          >
                            <MicOff size={16} className="animate-pulse" />
                          </div>
                        </>
                      ) : (
                        <div
                          className="w-10 h-10 rounded-full bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center cursor-pointer relative z-10 transition-all active:scale-90 shadow-md shadow-blue-500/20"
                          onClick={() => startVoiceDictation()}
                          title="Activate Voice Input"
                        >
                          <Mic size={16} />
                        </div>
                      )}
                    </div>

                    <div className="text-left select-none">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10.5px] font-extrabold tracking-widest uppercase ${isVoiceListening ? "text-red-500 animate-pulse" : "text-[var(--theme-secondary)]"}`}
                        >
                          {isVoiceListening
                            ? "Recording Offline Audio"
                            : "Local Whisper Dictation"}
                        </span>
                        {isVoiceListening && (
                          <span className="text-[9px] font-mono bg-red-500/15 text-red-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                            {voiceLanguage}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-[var(--theme-muted)] mt-0.5 max-w-[210px] sm:max-w-xs truncate font-medium">
                        {isVoiceListening
                          ? voiceInterimText ||
                            "Recording locally. Stop to transcribe with Whisper."
                          : voiceInterimText ||
                            "Offline STT with local Whisper after recording"}
                      </div>
                    </div>
                  </div>

                  {/* Center: Web Audio Level Waveform representation */}
                  <div className="flex items-center gap-1 h-5 min-w-[70px] justify-center">
                    {isVoiceListening
                      ? Array.from({ length: 12 }).map((_, i) => {
                          const volScale =
                            micVolume > 0 ? micVolume / 100 : 0.15;
                          const minH = 3;
                          const maxH = 20;
                          const individualOffset =
                            Math.sin(Date.now() / 140 + i * 40) * 0.45 + 0.55;
                          const height = Math.max(
                            minH,
                            Math.min(maxH, maxH * volScale * individualOffset),
                          );

                          return (
                            <motion.span
                              key={i}
                              className="w-[3px] rounded-full bg-gradient-to-t from-red-500 via-orange-500 to-yellow-400"
                              animate={{ height }}
                              transition={{
                                type: "spring",
                                stiffness: 350,
                                damping: 20,
                              }}
                            />
                          );
                        })
                      : Array.from({ length: 8 }).map((_, i) => (
                          <div
                            key={i}
                            className="w-[3px] h-1.5 rounded-full bg-[var(--theme-border)]/50"
                          />
                        ))}
                  </div>

                  {/* Right: Fine-grain Customization parameters */}
                  <div className="flex items-center gap-3.5 flex-wrap">
                    {/* Locale targets */}
                    <div className="flex flex-col text-left">
                      <label className="text-[9px] font-mono uppercase tracking-widest text-[var(--theme-secondary)]/70 font-bold mb-0.5 select-none">
                        Locale language
                      </label>
                      <select
                        value={voiceLanguage}
                        onChange={(e) => {
                          const code = e.target.value;
                          setVoiceLanguage(code);
                          showToast(
                            `Acoustic language swapped: ${SUPPORTED_VOICE_LANGUAGES.find((s) => s.code === code)?.label}`,
                          );
                          if (isVoiceListening) {
                            stopVoiceDictation(false);
                            setTimeout(() => startVoiceDictation(code), 250);
                          }
                        }}
                        className="h-7 bg-[var(--theme-surface)] text-[var(--theme-primary)] border border-[var(--theme-border)] text-[10px] rounded-lg px-2.5 outline-none cursor-pointer focus:border-[var(--theme-accent)] transition-all shrink-0 max-w-[125px] font-sans"
                      >
                        {SUPPORTED_VOICE_LANGUAGES.map((lang) => (
                          <option key={lang.code} value={lang.code}>
                            {lang.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Mode (overwrite vs append) */}
                    <div className="flex flex-col text-left">
                      <span className="text-[9px] font-mono uppercase tracking-widest text-[var(--theme-secondary)]/70 font-bold mb-0.5 select-none">
                        Write Target
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setVoiceAppendMode(!voiceAppendMode);
                          showToast(
                            voiceAppendMode
                              ? "Direct text Overwrite mode active"
                              : "Concatenate Append text mode active",
                          );
                        }}
                        className={`h-7 px-2.5 rounded-lg text-[10px] border font-bold transition-all flex items-center justify-center gap-1 cursor-pointer font-sans ${
                          voiceAppendMode
                            ? "bg-blue-500/10 text-blue-400 border-blue-500/25 hover:bg-blue-500/20"
                            : "bg-indigo-500/10 text-indigo-400 border-indigo-500/25 hover:bg-indigo-500/20"
                        }`}
                        title={
                          voiceAppendMode
                            ? "Speech is appended"
                            : "Speech replaces input text"
                        }
                      >
                        {voiceAppendMode ? "📝 Append" : "🔄 Replace"}
                      </button>
                    </div>

                    {/* Auto Submission */}
                    <div className="flex flex-col text-left">
                      <span className="text-[9px] font-mono uppercase tracking-widest text-[var(--theme-secondary)]/70 font-bold mb-0.5 select-none">
                        Auto submission
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setVoiceAutoSend(!voiceAutoSend);
                          showToast(
                            voiceAutoSend
                              ? "Semi-auto submission mode disabled"
                              : "Voice stop submission mode enabled!",
                          );
                        }}
                        className={`h-7 px-2.5 rounded-lg text-[10px] border font-bold transition-all flex items-center justify-center gap-1 cursor-pointer font-sans ${
                          voiceAutoSend
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25 shadow-inner"
                            : "bg-[var(--theme-hover-bg)] text-[var(--theme-secondary)] border-[var(--theme-border)]/70 hover:bg-[var(--theme-border)]/20"
                        }`}
                        title="Submit message instantly upon voice completion"
                      >
                        {voiceAutoSend ? "🚀 Auto-Send" : "⏸️ Manual"}
                      </button>
                    </div>

                    {/* Quick Sweep clear */}
                    <div className="flex flex-col text-left justify-end">
                      <span className="text-[9px] h-2 leading-0 select-none"></span>
                      <button
                        type="button"
                        onClick={() => {
                          setInput("");
                          setVoiceInterimText("");
                          showToast("Workspace draft cleared.");
                        }}
                        disabled={!input && !voiceInterimText}
                        className="h-7 w-7 rounded-lg text-[var(--theme-secondary)] hover:text-red-500 hover:bg-red-500/10 transition-colors flex items-center justify-center border border-[var(--theme-border)] cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Clear Workspace Text"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Offline recording status feedback */}
                {(isVoiceListening || voiceInterimText) && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.99, y: 3 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.99, y: 3 }}
                    className="p-3 bg-gradient-to-r from-red-500/5 via-amber-500/5 to-transparent border border-red-500/15 hover:border-red-500/35 transition-all rounded-2xl flex items-start gap-2.5 text-left relative overflow-hidden"
                  >
                    <Sparkles
                      size={13}
                      className="text-amber-500 animate-spin shrink-0 mt-0.5"
                    />
                    <div className="flex-1 text-xs leading-relaxed select-none font-sans">
                      <span className="text-[var(--theme-secondary)] font-semibold font-sans">
                        Local STT Status:{" "}
                      </span>
                      <span className="text-amber-400 italic font-bold font-sans">
                        {voiceInterimText || "Recording audio on-device..."}
                      </span>
                    </div>
                  </motion.div>
                )}

                {/* Error Alerts */}
                {voiceError && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-2.5 bg-red-500/10 border border-red-500/25 text-red-400 text-[11px] rounded-xl text-left font-sans flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                      <span>{voiceError}</span>
                    </div>
                    <button
                      onClick={() => setVoiceError(null)}
                      className="text-red-400 hover:text-white pb-0.5 cursor-pointer font-bold leading-none text-sm px-1.5 transition-colors"
                    >
                      ×
                    </button>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <textarea
            ref={inputRef}
            value={input}
            onChange={adjustTextareaHeight}
            onKeyDown={handleKeyDown}
            onPaste={(e) => {
              const items = e.clipboardData.items;
              const files: File[] = [];
              for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf("image") !== -1) {
                  const blob = items[i].getAsFile();
                  if (blob) {
                    files.push(
                      new File([blob], `pasted-image-${Date.now()}.png`, {
                        type: blob.type,
                      }),
                    );
                  }
                }
              }
              if (files.length > 0) {
                e.preventDefault();
                handleFileAttach(files);
              }
            }}
            placeholder={
              activeAssistantMode === "builder"
                ? "Describe the feature or component you want me to build autonomously..."
                : activeAssistantMode === "planner"
                  ? "Describe a complex high-level task to draft a detailed architecture blueprint..."
                  : activeAssistantMode === "debugger"
                    ? "Trace syntax errors, explain complex codes, or hot-fix bugs..."
                    : activeAssistantMode === "reviewer"
                      ? "Type 'start' to perform a complete code review, find dead code, and analyze code logic..."
                      : "Type 'start' to verify vulnerabilities, trace logical errors, check security, and score the project..."
            }
            rows={1}
            className="w-full bg-transparent border-none focus:ring-0 focus:outline-none text-[16px] p-0 resize-none min-h-[40px] text-[var(--theme-primary)] placeholder-zinc-500/70 scroll-none cursor-text pointer-events-auto"
          />
          
        </div>

        <AnimatePresence>
          {isCoderMode && pendingCommandPermission && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              className="mx-3 mb-2 rounded-2xl border border-amber-500/25 bg-amber-500/8 p-3 shadow-xl"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-xl border border-amber-500/25 bg-amber-500/10 p-2 text-amber-400">
                  <Shield size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-[var(--theme-primary)]">
                    Terminal permission required
                  </div>
                  <div className="mt-1 text-[11px] text-[var(--theme-secondary)]">
                    {pendingCommandPermission.reason}
                  </div>
                  <pre className="mt-2 max-h-28 overflow-y-auto custom-scrollbar rounded-xl border border-[var(--theme-border)] bg-black/30 p-2 text-[11px] text-zinc-300 whitespace-pre-wrap break-words font-mono">
                    $ {pendingCommandPermission.command}
                  </pre>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => resolvePendingPermission("allow-once")}
                      className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-bold text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                    >
                      Allow once
                    </button>
                    <button
                      type="button"
                      onClick={() => resolvePendingPermission("allow-always")}
                      className="rounded-xl border border-blue-500/25 bg-blue-500/10 px-3 py-1.5 text-[11px] font-bold text-blue-400 hover:bg-blue-500/20 transition-colors"
                    >
                      Allow always
                    </button>
                    <button
                      type="button"
                      onClick={() => resolvePendingPermission("deny")}
                      className="rounded-xl border border-rose-500/25 bg-rose-500/10 px-3 py-1.5 text-[11px] font-bold text-rose-400 hover:bg-rose-500/20 transition-colors"
                    >
                      Deny
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center justify-between px-3 pb-1.5 pt-1">
          <div className="flex items-center gap-2">
            <div className="relative" ref={plusMenuRef}>
              <motion.button
                whileTap={{ scale: 0.92 }}
                transition={{ duration: 0.08 }}
                onClick={() => {
                  setIsPlusMenuOpen(!isPlusMenuOpen);
                  setActivePlusSubMenu("main");
                }}
                className="p-2 rounded-2xl transition-all text-[var(--theme-secondary)] hover:text-[var(--theme-primary)] hover:bg-[var(--theme-hover-bg)]"
              >
                <Plus
                  size={20}
                  className={`transition-transform duration-200 ${isPlusMenuOpen ? "rotate-45" : ""}`}
                />
              </motion.button>
              <AnimatePresence>
                {isPlusMenuOpen && (
                  <motion.div
                    ref={menuContentRef}
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    style={plusMenuPopupPosition.style}
                    className="fixed w-64 bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-2xl shadow-2xl overflow-hidden z-[180] p-1.5 flex flex-col"
                  >
                    {activePlusSubMenu === "main" ? (
                      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar space-y-0.5 p-0.5">
                        {[
                          {
                            id: "files",
                            label: "Add files or photos",
                            icon: <FileUp size={16} />,
                          },
                          {
                            id: "attach_url",
                            label: "Attach URL",
                            icon: <LinkIcon size={16} />,
                          },
                          {
                            id: "transcript",
                            label: "Video Transcript",
                            icon: <Video size={16} />,
                          },
                          {
                            id: "screenshot",
                            label: "Take a screenshot",
                            icon: <Camera size={16} />,
                          },
                          {
                            id: "search",
                            label: "Web search",
                            icon: <Globe size={16} />,
                            isSelected: isWebSearchEnabled,
                          },
                          ...(isOllamaProvider ? [{
                            id: "ollama_web_search",
                            label: "Ollama Web Search",
                            icon: <Search size={16} className="text-emerald-400" />,
                            isSelected: ollamaWebSearchEnabled,
                          }] : []),
                          {
                            id: "deep_research",
                            label: "Deep Research",
                            icon: <GraduationCap size={16} className="text-purple-400" />,
                            isSelected: isDeepSearchEnabled,
                          },
                        ].map((item) => (
                          <button
                            key={item.id}
                            onClick={() => {
                              switch (item.id) {
                                case "files":
                                  fileInputRef.current?.click();
                                  setIsPlusMenuOpen(false);
                                  break;
                                case "attach_url":
                                  setIsPlusMenuOpen(false);
                                  setIsUrlToolOpen(true);
                                  break;
                                case "transcript":
                                  setIsPlusMenuOpen(false);
                                  setIsTranscriptToolOpen(true);
                                  break;
                                case "screenshot":
                                  handleScreenshot();
                                  break;
                                case "search":
                                  setIsPlusMenuOpen(false);
                                  (() => {
                                    const newVal = !isWebSearchEnabled;
                                    setIsWebSearchEnabled(newVal);
                                    if (newVal) setIsDeepSearchEnabled(false);
                                    if (!newVal && isOllamaProvider) setOllamaWebSearchEnabled(false);
                                  })();
                                  break;
                                case "ollama_web_search":
                                  setIsPlusMenuOpen(false);
                                  setOllamaWebSearchEnabled(prev => {
                                    const nextVal = !prev;
                                    if (nextVal) {
                                      setIsWebSearchEnabled(true);
                                      setIsDeepSearchEnabled(false);
                                    }
                                    showToast(nextVal ? 'Ollama web search enabled.' : 'Ollama web search disabled.');
                                    return nextVal;
                                  });
                                  break;
                                case "deep_research":
                                  setIsPlusMenuOpen(false);
                                  setIsDeepSearchEnabled((prev) => {
                                    const nextVal = !prev;
                                    if (nextVal) {
                                      setIsWebSearchEnabled(false);
                                      setOllamaWebSearchEnabled(false);
                                    }
                                    return nextVal;
                                  });
                                  break;
                              }
                            }}
                            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-[var(--theme-secondary)] hover:bg-[var(--theme-hover-bg)] hover:text-[var(--theme-primary)] transition-colors group/item"
                          >
                            <div className="flex items-center gap-3">
                              <span className={`transition-colors ${(item as any).isSelected ? (item.id === "deep_research" ? "text-purple-500" : item.id === "ollama_web_search" ? "text-emerald-500" : "text-blue-500") : "group-hover/item:text-[var(--theme-primary)]"}`}>
                                {item.icon}
                              </span>
                              {item.label}
                            </div>
                            {(item as any).isSelected && (
                              <Check size={14} className={item.id === "deep_research" ? "text-purple-500" : item.id === "ollama_web_search" ? "text-emerald-500" : "text-blue-500"} />
                            )}
                          </button>
                        ))}
                      </div>
                    ) : activePlusSubMenu === "lumina_tools" ? (
                      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
                        <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--theme-border)] mb-1 shrink-0">
                          <button
                            onClick={() => setActivePlusSubMenu("main")}
                            className="p-1 hover:bg-[var(--theme-hover-bg)] rounded-lg text-[var(--theme-secondary)] hover:text-[var(--theme-primary)] transition-colors"
                          >
                            <ChevronLeft size={16} />
                          </button>
                          <span className="text-[10px] font-bold text-[var(--theme-secondary)] uppercase tracking-widest">
                            Lumina Tools
                          </span>
                        </div>

                        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-0.5 animate-fade-in animate-duration-200">
                          <div className="space-y-2">
                            {/* 1. Web Scraper */}
                            {luminaTools.filter(t => !t.id.startsWith('wiki_')).map((tool) => (
                              <button
                                key={tool.id}
                                onClick={() => {
                                  setLuminaTools((prev) =>
                                    prev.map((t) =>
                                      t.id === tool.id
                                        ? { ...t, enabled: !t.enabled }
                                        : t,
                                    ),
                                  );
                                  showToast(
                                    `${tool.enabled ? "Disabled" : "Enabled"} ${tool.name}`,
                                  );
                                }}
                                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium text-[var(--theme-secondary)] hover:bg-[var(--theme-hover-bg)] transition-colors group/tool"
                              >
                                <div className="flex items-center gap-3">
                                  <div
                                    className={`p-1.5 rounded-lg transition-colors ${tool.enabled ? "bg-[var(--theme-accent)]/10 text-[var(--theme-accent)]" : "bg-[var(--theme-hover-bg)] text-[var(--theme-secondary)]"}`}
                                  >
                                    {tool.icon}
                                  </div>
                                  <div className="text-left col-span-2">
                                    <div
                                      className={`transition-colors truncate w-24 ${tool.enabled ? "text-[var(--theme-primary)]" : "text-[var(--theme-secondary)]"}`}
                                    >
                                      {tool.name}
                                    </div>
                                    <div className="text-[10px] text-[var(--theme-muted)] truncate w-32 font-medium">
                                      {tool.description}
                                    </div>
                                  </div>
                                </div>
                                <div
                                  className={`w-8 h-4 rounded-full transition-colors relative ${tool.enabled ? "bg-[var(--theme-accent)]" : "bg-[var(--theme-hover-bg)]"}`}
                                >
                                  <div
                                    className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${tool.enabled ? "right-0.5" : "left-0.5"}`}
                                  />
                                </div>
                              </button>
                            ))}

                            {/* 2. Grouped Wiki Scrab tool */}
                            {(() => {
                              const wikiSubTools = luminaTools.filter(t => t.id.startsWith('wiki_'));
                              const isWikiScrabEnabled = wikiSubTools.some(t => t.enabled);
                              
                              return (
                                <button
                                  onClick={() => {
                                    const nextState = !isWikiScrabEnabled;
                                    setLuminaTools((prev) =>
                                      prev.map((t) =>
                                        t.id.startsWith('wiki_') ? { ...t, enabled: nextState } : t
                                      )
                                    );
                                    showToast(
                                      `${nextState ? "Enabled" : "Disabled"} Wiki Scrab (all sub-tools synchronized)`
                                    );
                                  }}
                                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium text-[var(--theme-secondary)] hover:bg-[var(--theme-hover-bg)] transition-colors group/tool"
                                >
                                  <div className="flex items-center gap-3">
                                    <div
                                      className={`p-1.5 rounded-lg transition-colors ${isWikiScrabEnabled ? "bg-[var(--theme-accent)]/10 text-[var(--theme-accent)]" : "bg-[var(--theme-hover-bg)] text-[var(--theme-secondary)]"}`}
                                    >
                                      <BookOpen size={16} />
                                    </div>
                                    <div className="text-left col-span-2">
                                      <div
                                        className={`transition-colors font-bold ${isWikiScrabEnabled ? "text-[var(--theme-primary)]" : "text-[var(--theme-secondary)]"}`}
                                      >
                                        Wiki Scrab
                                      </div>
                                      <div className="text-[10px] text-[var(--theme-muted)] truncate w-32 font-medium">
                                        Wikipedia Search & Scraper Tools
                                      </div>
                                    </div>
                                  </div>
                                  <div
                                    className={`w-8 h-4 rounded-full transition-colors relative ${isWikiScrabEnabled ? "bg-[var(--theme-accent)]" : "bg-[var(--theme-hover-bg)]"}`}
                                  >
                                    <div
                                      className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${isWikiScrabEnabled ? "right-0.5" : "left-0.5"}`}
                                    />
                                  </div>
                                </button>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                    ) : activePlusSubMenu === "tools" ? (
                      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
                        <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--theme-border)] mb-1 shrink-0">
                          <button
                            onClick={() => setActivePlusSubMenu("main")}
                            className="p-1 hover:bg-[var(--theme-hover-bg)] rounded-lg text-[var(--theme-secondary)] hover:text-[var(--theme-primary)] transition-colors"
                          >
                            <ChevronLeft size={16} />
                          </button>
                          <span className="text-[10px] font-bold text-[var(--theme-secondary)] uppercase tracking-widest">
                            Bridge Tools
                          </span>
                        </div>

                        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-0.5 animate-fade-in animate-duration-200">
                          {bridgeTools.map((tool) => (
                            <button
                              key={tool.id}
                              onClick={() => {
                                setBridgeTools((prev) =>
                                  prev.map((t) =>
                                    t.id === tool.id
                                      ? { ...t, enabled: !t.enabled }
                                      : t,
                                  ),
                                );
                                showToast(
                                  `${tool.enabled ? "Disabled" : "Enabled"} ${tool.name}`,
                                );
                              }}
                              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium text-[var(--theme-secondary)] hover:bg-[var(--theme-hover-bg)] transition-colors group/tool"
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className={`p-1.5 rounded-lg transition-colors ${tool.enabled ? "bg-[var(--theme-accent)]/10 text-[var(--theme-accent)]" : "bg-[var(--theme-hover-bg)] text-[var(--theme-secondary)]"}`}
                                >
                                  {tool.icon}
                                </div>
                                <div className="text-left">
                                  <div
                                    className={`transition-colors ${tool.enabled ? "text-[var(--theme-primary)]" : "text-[var(--theme-secondary)]"}`}
                                  >
                                    {tool.name}
                                  </div>
                                  <div className="text-[10px] text-[var(--theme-muted)] truncate w-32 font-medium">
                                    {tool.description}
                                  </div>
                                </div>
                              </div>
                              <div
                                className={`w-8 h-4 rounded-full transition-colors relative ${tool.enabled ? "bg-[var(--theme-accent)]" : "bg-[var(--theme-hover-bg)]"}`}
                              >
                                <div
                                  className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${tool.enabled ? "right-0.5" : "left-0.5"}`}
                                />
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : activePlusSubMenu === "composio" ? (
                      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
                        <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--theme-border)] mb-1 shrink-0">
                          <button
                            onClick={() => setActivePlusSubMenu("main")}
                            className="p-1 hover:bg-[var(--theme-hover-bg)] rounded-lg text-[var(--theme-secondary)] hover:text-[var(--theme-primary)] transition-colors"
                          >
                            <ChevronLeft size={16} />
                          </button>
                          <span className="text-[10px] font-bold text-[var(--theme-secondary)] uppercase tracking-widest">
                            Composio
                          </span>
                          {!composioEnabled && (
                            <span className="text-[9px] text-zinc-500 ml-auto">Configure in Settings</span>
                          )}
                        </div>
                        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-0.5 animate-fade-in animate-duration-200">
                          {composioEnabled ? (
                            <div className="space-y-2">
                              {Array.from(new Set(composioTools.map((t: any) => t.toolkit))).map((slug) => {
                                const toolkitTools = composioTools.filter((t: any) => t.toolkit === slug);
                                const toolkitDisplay = toolkitTools[0]?.toolkitDisplayName || slug;
                                const anyEnabled = toolkitTools.some((t: any) => t.enabled);
                                const conn = composioConnections.find((c: any) => c.slug === slug);
                                return (
                                  <div key={slug} className="border border-[var(--theme-border)] rounded-xl overflow-hidden">
                                    <button
                                      onClick={() => toggleAllToolsForToolkit(slug, !anyEnabled)}
                                      className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-[var(--theme-secondary)] hover:bg-[var(--theme-hover-bg)] transition-colors"
                                    >
                                      <div className="flex items-center gap-3">
                                        <div
                                          className={`p-1.5 rounded-lg transition-colors ${anyEnabled ? "bg-[var(--theme-accent)]/10 text-[var(--theme-accent)]" : "bg-[var(--theme-hover-bg)] text-[var(--theme-secondary)]"}`}
                                        >
                                          <Puzzle size={14} />
                                        </div>
                                        <div className="text-left">
                                          <div className={`transition-colors ${anyEnabled ? "text-[var(--theme-primary)]" : "text-[var(--theme-secondary)]"}`}>
                                            {toolkitDisplay}
                                          </div>
                                          <div className="text-[10px] text-[var(--theme-muted)]">
                                            {conn?.connected ? "Connected" : "Not connected"} · {toolkitTools.length} tools
                                          </div>
                                        </div>
                                      </div>
                                      <div
                                        className={`w-8 h-4 rounded-full transition-colors relative ${anyEnabled ? "bg-[var(--theme-accent)]" : "bg-[var(--theme-hover-bg)]"}`}
                                      >
                                        <div
                                          className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${anyEnabled ? "right-0.5" : "left-0.5"}`}
                                        />
                                      </div>
                                    </button>
                                    {anyEnabled && (
                                      <div className="px-3 pb-2 space-y-1">
                                        {toolkitTools.map((tool: any) => (
                                          <button
                                            key={tool.id}
                                            onClick={() => toggleComposioTool(tool.id)}
                                            className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-[11px] text-[var(--theme-secondary)] hover:bg-[var(--theme-hover-bg)] transition-colors"
                                          >
                                            <div className="flex items-center gap-2 truncate">
                                              <div
                                                className={`w-1.5 h-1.5 rounded-full transition-colors ${tool.enabled ? "bg-[var(--theme-accent)]" : "bg-[var(--theme-muted)]"}`}
                                              />
                                              <span className="truncate">{tool.name}</span>
                                            </div>
                                            <div
                                              className={`w-6 h-3 rounded-full transition-colors relative flex-shrink-0 ${tool.enabled ? "bg-[var(--theme-accent)]" : "bg-[var(--theme-hover-bg)]"}`}
                                            >
                                              <div
                                                className={`absolute top-0.5 w-2 h-2 rounded-full bg-white transition-all ${tool.enabled ? "right-0.5" : "left-0.5"}`}
                                              />
                                            </div>
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                              <Puzzle size={32} className="text-[var(--theme-muted)] mb-3" />
                              <p className="text-xs text-[var(--theme-muted)]">
                                Connect your accounts in Settings → Composio to enable tools.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : activePlusSubMenu === "skills" ? (
                      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
                        <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--theme-border)] mb-1 shrink-0">
                          <button
                            onClick={() => setActivePlusSubMenu("main")}
                            className="p-1 hover:bg-[var(--theme-hover-bg)] rounded-lg text-[var(--theme-secondary)] hover:text-[var(--theme-primary)] transition-colors"
                          >
                            <ChevronLeft size={16} />
                          </button>
                          <span className="text-[10px] font-bold text-[var(--theme-secondary)] uppercase tracking-widest">
                            Skills
                          </span>
                        </div>
                        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-0.5 animate-fade-in animate-duration-200">
                          {SKILLS.map((skill) => (
                            <button
                              key={skill.id}
                              onClick={() => {
                                setActiveSkills((prev) =>
                                  prev.includes(skill.id)
                                    ? prev.filter((id) => id !== skill.id)
                                    : [...prev, skill.id],
                                );
                                showToast(
                                  `${activeSkills.includes(skill.id) ? "Deactivated" : "Activated"} ${skill.label}`,
                                );
                              }}
                              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-colors ${
                                activeSkills.includes(skill.id)
                                  ? "bg-[var(--theme-hover-bg)] text-[var(--theme-primary)]"
                                  : "text-[var(--theme-secondary)] hover:bg-[var(--theme-hover-bg)] hover:text-[var(--theme-primary)]"
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className={`p-1.5 rounded-lg transition-colors ${activeSkills.includes(skill.id) ? "bg-indigo-500/10 text-indigo-500" : "bg-[var(--theme-hover-bg)] text-[var(--theme-secondary)]"}`}
                                >
                                  {skill.icon}
                                </div>
                                {skill.label}
                              </div>
                              <div
                                className={`w-8 h-4 rounded-full transition-colors relative ${activeSkills.includes(skill.id) ? "bg-indigo-500" : "bg-[var(--theme-hover-bg)]"}`}
                              >
                                <div
                                  className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${activeSkills.includes(skill.id) ? "right-0.5" : "left-0.5"}`}
                                />
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : activePlusSubMenu === "style" ? (
                      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
                        <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--theme-border)] mb-1 shrink-0">
                          <button
                            onClick={() => setActivePlusSubMenu("main")}
                            className="p-1 hover:bg-[var(--theme-hover-bg)] rounded-lg text-[var(--theme-secondary)] hover:text-[var(--theme-primary)] transition-colors"
                          >
                            <ChevronLeft size={16} />
                          </button>
                          <span className="text-[10px] font-bold text-[var(--theme-secondary)] uppercase tracking-widest">
                            Writing Style
                          </span>
                        </div>
                        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-0.5 animate-fade-in animate-duration-200">
                          {WRITING_STYLES.map((style) => (
                            <button
                              key={style.id}
                              onClick={() => {
                                setWritingStyle(style.id);
                                setIsPlusMenuOpen(false);
                                setActivePlusSubMenu("main");
                              }}
                              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-colors ${
                                writingStyle === style.id
                                  ? "bg-[var(--theme-hover-bg)] text-[var(--theme-primary)] font-bold"
                                  : "text-[var(--theme-secondary)] hover:bg-[var(--theme-hover-bg)] hover:text-[var(--theme-primary)]"
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className={`p-1.5 rounded-lg transition-colors ${writingStyle === style.id ? "bg-blue-500/10 text-blue-500" : "bg-[var(--theme-hover-bg)] text-[var(--theme-secondary)]"}`}
                                >
                                  {style.icon}
                                </div>
                                {style.label}
                              </div>
                              {writingStyle === style.id && (
                                <Check size={14} className="text-blue-500" />
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Deep Research Premium Segment */}
            {isDeepSearchEnabled && (
              <div className="flex items-center gap-1 border border-[var(--theme-border)] bg-[var(--theme-surface)]/40 rounded-xl p-0.5">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={() => {
                    const nextVal = !isDeepSearchEnabled;
                    setIsDeepSearchEnabled(nextVal);
                    if (nextVal) {
                      setIsWebSearchEnabled(false);
                    }
                  }}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer select-none ${
                    isDeepSearchEnabled
                      ? "bg-purple-500/10 text-purple-400 border border-purple-500/10"
                      : "text-[var(--theme-secondary)] hover:text-[var(--theme-primary)] hover:bg-[var(--theme-hover-bg)] border border-transparent"
                  }`}
                  title="Toggle Deep Research Mode"
                >
                  <GraduationCap size={14} className={isDeepSearchEnabled ? "animate-pulse" : ""} />
                  <span>Deep Research</span>
                </motion.button>

                <div className="relative" ref={deepResearchPresetRef}>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    onClick={() => setIsDeepResearchPresetOpen(!isDeepResearchPresetOpen)}
                    className="flex items-center gap-0.5 px-1 py-1 hover:bg-[var(--theme-hover-bg)] rounded-lg text-xs font-semibold text-[var(--theme-secondary)] hover:text-[var(--theme-primary)] transition-all cursor-pointer select-none"
                  >
                    <span>{researchState?.depthPreset === "extreme" ? "Advanced" : "Normal"}</span>
                    <ChevronDown
                      size={11}
                      className="text-[var(--theme-muted)] transition-transform duration-200"
                      style={{ transform: isDeepResearchPresetOpen ? "rotate(180deg)" : "rotate(0deg)" }}
                    />
                  </motion.button>
                  <AnimatePresence>
                    {isDeepResearchPresetOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.96 }}
                        className="absolute bottom-full left-0 mb-2 w-64 bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-2xl shadow-2xl z-[190] p-1.5 text-left"
                      >
                        {[
                          {
                            id: "standard",
                            label: "Normal",
                            icon: <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0 mt-1.5 ml-1" />,
                            desc: "Fast, reliable responses for quick tasks."
                          },
                          {
                            id: "extreme",
                            label: "Advanced",
                            icon: <Workflow size={11} className="text-purple-400 shrink-0 mt-0.5" />,
                            desc: "Devoting extra time to a deeper analysis."
                          }
                        ].map((item) => {
                          const isActive = (researchState?.depthPreset || "standard") === item.id;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => {
                                researchState?.setDepthPreset(item.id as "standard" | "extreme");
                                setIsDeepResearchPresetOpen(false);
                              }}
                              className={`w-full flex items-start gap-2 px-2.5 py-2 rounded-xl text-left transition-colors cursor-pointer ${
                                isActive
                                  ? "bg-[var(--theme-hover-bg)] text-[var(--theme-primary)]"
                                  : "text-[var(--theme-secondary)] hover:bg-[var(--theme-hover-bg)] hover:text-[var(--theme-primary)]"
                              }`}
                            >
                              <span className="flex-shrink-0 mt-0.5">
                                {item.icon}
                              </span>
                              <div className="flex-1 flex flex-col min-w-0">
                                <span className="text-xs font-semibold">{item.label}</span>
                                <span className="text-[10px] text-[var(--theme-muted)] font-normal leading-tight">{item.desc}</span>
                              </div>
                              {isActive && (
                                <Check size={11} className="text-[var(--theme-accent)] self-center flex-shrink-0" />
                              )}
                            </button>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            )}

            {/* Vertical separator */}
            <div className="w-[1px] h-4 bg-[var(--theme-border)] mx-0.5 opacity-60 shrink-0" />

            {/* Custom Grid Button */}
            <div className="relative" ref={gridMenuButtonRef}>
              <motion.button
                whileTap={{ scale: 0.92 }}
                transition={{ duration: 0.08 }}
                onClick={() => {
                  setIsGridMenuOpen(!isGridMenuOpen);
                  setActiveGridSubMenu("main");
                }}
                className={`p-2 rounded-2xl transition-all ${
                  isGridMenuOpen
                    ? "text-blue-500 bg-blue-500/10 hover:bg-blue-500/20"
                    : isWebSearchEnabled || isDeepSearchEnabled || activeSkills.length > 0 || ragEnabled
                      ? "text-blue-500 bg-blue-500/5 hover:bg-blue-500/15"
                      : "text-[var(--theme-secondary)] hover:text-[var(--theme-primary)] hover:bg-[var(--theme-hover-bg)]"
                }`}
                title="Cores & Features"
              >
                <LayoutGrid
                  size={18}
                  className={`transition-transform duration-200 rotate-45 ${isGridMenuOpen ? "scale-110" : ""}`}
                />
              </motion.button>
              
              <AnimatePresence>
                {isGridMenuOpen && (
                  <motion.div
                    ref={gridMenuContentRef}
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    style={gridMenuPopupPosition.style}
                    className="fixed w-64 bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-2xl shadow-2xl overflow-hidden z-[180] p-1.5 flex flex-col"
                  >
                    {activeGridSubMenu === "main" ? (
                      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar space-y-0.5 p-0.5">
                        {[
                          {
                            id: "rag_docs",
                            label: `RAG Context (${selectedDocIds.length} active)`,
                            icon: <Database size={16} />,
                            isSelected: ragEnabled,
                          },
                          {
                            id: "skills",
                            label: "Skills",
                            icon: <Box size={16} />,
                            hasArrow: true,
                          },
                          {
                            id: "style",
                            label: "Writing Style",
                            icon: <Palette size={16} />,
                            hasArrow: true,
                          },
                          { type: "separator" },
                          {
                            id: "lumina_tools",
                            label: "Lumina Tools",
                            icon: <Hammer size={16} />,
                            hasArrow: true,
                          },
                          {
                            id: "tools",
                            label: "Bridge Tools",
                            icon: <Wrench size={16} />,
                            hasArrow: true,
                          },
                          {
                            id: "composio",
                            label: "Composio",
                            icon: <Puzzle size={16} />,
                            hasArrow: true,
                            isSelected: composioEnabled && composioTools.some((t: any) => t.enabled),
                          },
                        ].map((item, idx) =>
                          item.type === "separator" ? (
                            <div
                              key={idx}
                              className="my-1 border-t border-[var(--theme-border)]"
                            />
                          ) : (
                            <div
                              key={item.id}
                              onClick={() => {
                                switch (item.id) {
                                  case "rag_docs":
                                    handleToggleRag(!ragEnabled);
                                    break;
                                  case "skills":
                                    setActiveGridSubMenu("skills");
                                    break;
                                  case "style":
                                    setActiveGridSubMenu("style");
                                    break;
                                  case "lumina_tools":
                                    setActiveGridSubMenu("lumina_tools");
                                    break;
                                  case "tools":
                                    setActiveGridSubMenu("tools");
                                    break;
                                  case "composio":
                                    setActiveGridSubMenu("composio" as any);
                                    fetchComposioStatus();
                                    break;
                                }
                              }}
                              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-[var(--theme-secondary)] hover:bg-[var(--theme-hover-bg)] hover:text-[var(--theme-primary)] transition-colors group/item cursor-pointer select-none"
                            >
                              <div className="flex items-center gap-3">
                                <span
                                  className={`transition-colors ${(item as any).isSelected ? "text-blue-500" : "group-hover/item:text-[var(--theme-primary)]"}`}
                                >
                                  {item.icon}
                                </span>
                                {item.label}
                              </div>
                              <div className="flex items-center gap-2">
                                {item.id === "rag_docs" && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setIsGridMenuOpen(false);
                                      setIsRagSelectorOpen(true);
                                    }}
                                    className="p-1 rounded-lg hover:bg-[var(--theme-hover-bg)] text-[var(--theme-secondary)] hover:text-[var(--theme-primary)] transition-colors cursor-pointer flex items-center justify-center opacity-60 hover:opacity-100"
                                    title="Configure documents"
                                  >
                                    <Settings size={14} />
                                  </button>
                                )}
                                {(item as any).isSelected && (
                                  <Check size={14} className="text-blue-500" />
                                )}
                                {(item as any).hasArrow && (
                                  <ChevronRight
                                    size={14}
                                    className="text-[var(--theme-secondary)] group-hover/item:text-[var(--theme-primary)]"
                                  />
                                )}
                              </div>
                            </div>
                          ),
                        )}
                      </div>
                    ) : activeGridSubMenu === "lumina_tools" ? (
                      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
                        <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--theme-border)] mb-1 shrink-0">
                          <button
                            onClick={() => setActiveGridSubMenu("main")}
                            className="p-1 hover:bg-[var(--theme-hover-bg)] rounded-lg text-[var(--theme-secondary)] hover:text-[var(--theme-primary)] transition-colors"
                          >
                            <ChevronLeft size={16} />
                          </button>
                          <span className="text-[10px] font-bold text-[var(--theme-secondary)] uppercase tracking-widest font-mono">
                            Lumina Tools
                          </span>
                        </div>

                        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-0.5 animate-fade-in animate-duration-200">
                          <div className="space-y-2">
                            {/* 1. Web Scraper */}
                            {luminaTools.filter(t => !t.id.startsWith('wiki_')).map((tool) => (
                              <button
                                key={tool.id}
                                onClick={() => {
                                  setLuminaTools((prev) =>
                                    prev.map((t) =>
                                      t.id === tool.id
                                        ? { ...t, enabled: !t.enabled }
                                        : t,
                                    ),
                                  );
                                  showToast(
                                    `${tool.enabled ? "Disabled" : "Enabled"} ${tool.name}`,
                                  );
                                }}
                                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium text-[var(--theme-secondary)] hover:bg-[var(--theme-hover-bg)] transition-colors group/tool"
                              >
                                <div className="flex items-center gap-3">
                                  <div
                                    className={`p-1.5 rounded-lg transition-colors ${tool.enabled ? "bg-[var(--theme-accent)]/10 text-[var(--theme-accent)]" : "bg-[var(--theme-hover-bg)] text-[var(--theme-secondary)]"}`}
                                  >
                                    {tool.icon}
                                  </div>
                                  <div className="text-left col-span-2">
                                    <div
                                      className={`transition-colors truncate w-24 ${tool.enabled ? "text-[var(--theme-primary)]" : "text-[var(--theme-secondary)]"}`}
                                    >
                                      {tool.name}
                                    </div>
                                    <div className="text-[10px] text-[var(--theme-muted)] truncate w-32 font-medium">
                                      {tool.description}
                                    </div>
                                  </div>
                                </div>
                                <div
                                  className={`w-8 h-4 rounded-full transition-colors relative ${tool.enabled ? "bg-[var(--theme-accent)]" : "bg-[var(--theme-hover-bg)]"}`}
                                >
                                  <div
                                    className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${tool.enabled ? "right-0.5" : "left-0.5"}`}
                                  />
                                </div>
                              </button>
                            ))}

                            {/* 2. Grouped Wiki Scrab tool */}
                            {(() => {
                              const wikiSubTools = luminaTools.filter(t => t.id.startsWith('wiki_'));
                              const isWikiScrabEnabled = wikiSubTools.some(t => t.enabled);
                              
                              return (
                                <button
                                  onClick={() => {
                                    const nextState = !isWikiScrabEnabled;
                                    setLuminaTools((prev) =>
                                      prev.map((t) =>
                                        t.id.startsWith('wiki_') ? { ...t, enabled: nextState } : t
                                      )
                                    );
                                    showToast(
                                      `${nextState ? "Enabled" : "Disabled"} Wiki Scrab (all sub-tools synchronized)`
                                    );
                                  }}
                                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium text-[var(--theme-secondary)] hover:bg-[var(--theme-hover-bg)] transition-colors group/tool"
                                >
                                  <div className="flex items-center gap-3">
                                    <div
                                      className={`p-1.5 rounded-lg transition-colors ${isWikiScrabEnabled ? "bg-[var(--theme-accent)]/10 text-[var(--theme-accent)]" : "bg-[var(--theme-hover-bg)] text-[var(--theme-secondary)]"}`}
                                    >
                                      <BookOpen size={16} />
                                    </div>
                                    <div className="text-left col-span-2">
                                      <div
                                        className={`transition-colors font-bold ${isWikiScrabEnabled ? "text-[var(--theme-primary)]" : "text-[var(--theme-secondary)]"}`}
                                      >
                                        Wiki Scrab
                                      </div>
                                      <div className="text-[10px] text-[var(--theme-muted)] truncate w-32 font-medium">
                                        Wikipedia Search & Scraper Tools
                                      </div>
                                    </div>
                                  </div>
                                  <div
                                    className={`w-8 h-4 rounded-full transition-colors relative ${isWikiScrabEnabled ? "bg-[var(--theme-accent)]" : "bg-[var(--theme-hover-bg)]"}`}
                                  >
                                    <div
                                      className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${isWikiScrabEnabled ? "right-0.5" : "left-0.5"}`}
                                    />
                                  </div>
                                </button>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                    ) : activeGridSubMenu === "tools" ? (
                      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
                        <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--theme-border)] mb-1 shrink-0">
                          <button
                            onClick={() => setActiveGridSubMenu("main")}
                            className="p-1 hover:bg-[var(--theme-hover-bg)] rounded-lg text-[var(--theme-secondary)] hover:text-[var(--theme-primary)] transition-colors"
                          >
                            <ChevronLeft size={16} />
                          </button>
                          <span className="text-[10px] font-bold text-[var(--theme-secondary)] uppercase tracking-widest font-mono">
                            Bridge Tools
                          </span>
                        </div>

                        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-0.5 animate-fade-in animate-duration-200">
                          {bridgeTools.map((tool) => (
                            <button
                              key={tool.id}
                              onClick={() => {
                                setBridgeTools((prev) =>
                                  prev.map((t) =>
                                    t.id === tool.id
                                      ? { ...t, enabled: !t.enabled }
                                      : t,
                                  ),
                                );
                                showToast(
                                  `${tool.enabled ? "Disabled" : "Enabled"} ${tool.name}`,
                                );
                              }}
                              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium text-[var(--theme-secondary)] hover:bg-[var(--theme-hover-bg)] transition-colors group/tool"
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className={`p-1.5 rounded-lg transition-colors ${tool.enabled ? "bg-[var(--theme-accent)]/10 text-[var(--theme-accent)]" : "bg-[var(--theme-hover-bg)] text-[var(--theme-secondary)]"}`}
                                >
                                  {tool.icon}
                                </div>
                                <div className="text-left">
                                  <div
                                    className={`transition-colors ${tool.enabled ? "text-[var(--theme-primary)]" : "text-[var(--theme-secondary)]"}`}
                                  >
                                    {tool.name}
                                  </div>
                                  <div className="text-[10px] text-[var(--theme-muted)] truncate w-32 font-medium">
                                    {tool.description}
                                  </div>
                                </div>
                              </div>
                              <div
                                className={`w-8 h-4 rounded-full transition-colors relative ${tool.enabled ? "bg-[var(--theme-accent)]" : "bg-[var(--theme-hover-bg)]"}`}
                              >
                                <div
                                  className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${tool.enabled ? "right-0.5" : "left-0.5"}`}
                                />
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : activeGridSubMenu === "composio" ? (
                      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
                        <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--theme-border)] mb-1 shrink-0">
                          <button
                            onClick={() => setActiveGridSubMenu("main")}
                            className="p-1 hover:bg-[var(--theme-hover-bg)] rounded-lg text-[var(--theme-secondary)] hover:text-[var(--theme-primary)] transition-colors"
                          >
                            <ChevronLeft size={16} />
                          </button>
                          <span className="text-[10px] font-bold text-[var(--theme-secondary)] uppercase tracking-widest font-mono">
                            Composio
                          </span>
                        </div>
                        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-0.5 animate-fade-in animate-duration-200">
                          {composioEnabled ? (
                            <div className="space-y-2">
                              {Array.from(new Set(composioTools.map((t: any) => t.toolkit))).map((slug) => {
                                const toolkitTools = composioTools.filter((t: any) => t.toolkit === slug);
                                const toolkitDisplay = toolkitTools[0]?.toolkitDisplayName || slug;
                                const anyEnabled = toolkitTools.some((t: any) => t.enabled);
                                const conn = composioConnections.find((c: any) => c.slug === slug);
                                return (
                                  <div key={slug} className="border border-[var(--theme-border)] rounded-xl overflow-hidden">
                                    <button
                                      onClick={() => toggleAllToolsForToolkit(slug, !anyEnabled)}
                                      className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-[var(--theme-secondary)] hover:bg-[var(--theme-hover-bg)] transition-colors"
                                    >
                                      <div className="flex items-center gap-3">
                                        <div
                                          className={`p-1.5 rounded-lg transition-colors ${anyEnabled ? "bg-[var(--theme-accent)]/10 text-[var(--theme-accent)]" : "bg-[var(--theme-hover-bg)] text-[var(--theme-secondary)]"}`}
                                        >
                                          <Puzzle size={14} />
                                        </div>
                                        <div className="text-left">
                                          <div className={`transition-colors ${anyEnabled ? "text-[var(--theme-primary)]" : "text-[var(--theme-secondary)]"}`}>
                                            {toolkitDisplay}
                                          </div>
                                          <div className="text-[10px] text-[var(--theme-muted)]">
                                            {conn?.connected ? "Connected" : "Not connected"} · {toolkitTools.length} tools
                                          </div>
                                        </div>
                                      </div>
                                      <div
                                        className={`w-8 h-4 rounded-full transition-colors relative ${anyEnabled ? "bg-[var(--theme-accent)]" : "bg-[var(--theme-hover-bg)]"}`}
                                      >
                                        <div
                                          className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${anyEnabled ? "right-0.5" : "left-0.5"}`}
                                        />
                                      </div>
                                    </button>
                                    {anyEnabled && (
                                      <div className="px-3 pb-2 space-y-1">
                                        {toolkitTools.map((tool: any) => (
                                          <button
                                            key={tool.id}
                                            onClick={() => toggleComposioTool(tool.id)}
                                            className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-[11px] text-[var(--theme-secondary)] hover:bg-[var(--theme-hover-bg)] transition-colors"
                                          >
                                            <div className="flex items-center gap-2 truncate">
                                              <div
                                                className={`w-1.5 h-1.5 rounded-full transition-colors ${tool.enabled ? "bg-[var(--theme-accent)]" : "bg-[var(--theme-muted)]"}`}
                                              />
                                              <span className="truncate">{tool.name}</span>
                                            </div>
                                            <div
                                              className={`w-6 h-3 rounded-full transition-colors relative flex-shrink-0 ${tool.enabled ? "bg-[var(--theme-accent)]" : "bg-[var(--theme-hover-bg)]"}`}
                                            >
                                              <div
                                                className={`absolute top-0.5 w-2 h-2 rounded-full bg-white transition-all ${tool.enabled ? "right-0.5" : "left-0.5"}`}
                                              />
                                            </div>
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                              <Puzzle size={32} className="text-[var(--theme-muted)] mb-3" />
                              <p className="text-xs text-[var(--theme-muted)]">
                                Connect your accounts in Settings → Composio to enable tools.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : activeGridSubMenu === "skills" ? (
                      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
                        <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--theme-border)] mb-1 shrink-0">
                          <button
                            onClick={() => setActiveGridSubMenu("main")}
                            className="p-1 hover:bg-[var(--theme-hover-bg)] rounded-lg text-[var(--theme-secondary)] hover:text-[var(--theme-primary)] transition-colors"
                          >
                            <ChevronLeft size={16} />
                          </button>
                          <span className="text-[10px] font-bold text-[var(--theme-secondary)] uppercase tracking-widest font-mono">
                            Skills
                          </span>
                        </div>
                        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-0.5 animate-fade-in animate-duration-200">
                          {SKILLS.map((skill) => (
                            <button
                              key={skill.id}
                              onClick={() => {
                                setActiveSkills((prev) =>
                                  prev.includes(skill.id)
                                    ? prev.filter((id) => id !== skill.id)
                                    : [...prev, skill.id],
                                );
                                showToast(
                                  `${activeSkills.includes(skill.id) ? "Deactivated" : "Activated"} ${skill.label}`,
                                );
                              }}
                              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-colors ${
                                activeSkills.includes(skill.id)
                                  ? "bg-[var(--theme-hover-bg)] text-[var(--theme-primary)]"
                                  : "text-[var(--theme-secondary)] hover:bg-[var(--theme-hover-bg)] hover:text-[var(--theme-primary)]"
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className={`p-1.5 rounded-lg transition-colors ${activeSkills.includes(skill.id) ? "bg-indigo-500/10 text-indigo-500" : "bg-[var(--theme-hover-bg)] text-[var(--theme-secondary)]"}`}
                                >
                                  {skill.icon}
                                </div>
                                {skill.label}
                              </div>
                              <div
                                className={`w-8 h-4 rounded-full transition-colors relative ${activeSkills.includes(skill.id) ? "bg-indigo-500" : "bg-[var(--theme-hover-bg)]"}`}
                              >
                                <div
                                  className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${activeSkills.includes(skill.id) ? "right-0.5" : "left-0.5"}`}
                                />
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : activeGridSubMenu === "style" ? (
                      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
                        <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--theme-border)] mb-1 shrink-0">
                          <button
                            onClick={() => setActiveGridSubMenu("main")}
                            className="p-1 hover:bg-[var(--theme-hover-bg)] rounded-lg text-[var(--theme-secondary)] hover:text-[var(--theme-primary)] transition-colors"
                          >
                            <ChevronLeft size={16} />
                          </button>
                          <span className="text-[10px] font-bold text-[var(--theme-secondary)] uppercase tracking-widest font-mono">
                            Writing Style
                          </span>
                        </div>
                        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-0.5 animate-fade-in animate-duration-200">
                          {WRITING_STYLES.map((style) => (
                            <button
                              key={style.id}
                              onClick={() => {
                                setWritingStyle(style.id);
                                setIsGridMenuOpen(false);
                                setActiveGridSubMenu("main");
                              }}
                              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-colors ${
                                writingStyle === style.id
                                  ? "bg-[var(--theme-hover-bg)] text-[var(--theme-primary)] font-bold"
                                  : "text-[var(--theme-secondary)] hover:bg-[var(--theme-hover-bg)] hover:text-[var(--theme-primary)]"
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className={`p-1.5 rounded-lg transition-colors ${writingStyle === style.id ? "bg-blue-500/10 text-blue-500" : "bg-[var(--theme-hover-bg)] text-[var(--theme-secondary)]"}`}
                                >
                                  {style.icon}
                                </div>
                                {style.label}
                              </div>
                              {writingStyle === style.id && (
                                <Check size={14} className="text-blue-500" />
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Assistant Mode Selection Dropdown */}
            {isCoderMode && (
              <div className="relative" ref={permissionDropdownRef}>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  transition={{ duration: 0.08 }}
                  onClick={() =>
                    setIsPermissionDropdownOpen(!isPermissionDropdownOpen)
                  }
                  className="flex items-center gap-1.5 px-3 py-2 hover:bg-[var(--theme-hover-bg)] rounded-2xl text-sm font-medium text-[var(--theme-secondary)] hover:text-[var(--theme-primary)] transition-all active:scale-95 cursor-pointer select-none"
                  title={`Coder permissions: ${permissionModeLabel(coderPermissionMode)}`}
                >
                  {coderPermissionMode === "full-access" ? (
                    <ShieldCheck size={14} className="text-emerald-400" />
                  ) : coderPermissionMode === "auto-review" ? (
                    <Shield size={14} className="text-violet-400" />
                  ) : (
                    <Hand size={14} className="text-zinc-400" />
                  )}
                  <span className="hidden xl:inline">
                    {permissionModeLabel(coderPermissionMode)}
                  </span>
                  <ChevronDown
                    size={14}
                    className="text-[var(--theme-muted)] transition-transform duration-200 hidden xl:inline"
                    style={{
                      transform: isPermissionDropdownOpen
                        ? "rotate(180deg)"
                        : "rotate(0deg)",
                    }}
                  />
                </motion.button>

                <AnimatePresence>
                  {isPermissionDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.96 }}
                      className="absolute bottom-full left-0 mb-2 w-64 bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-2xl shadow-2xl z-[190] p-1.5 text-left"
                    >
                      {permissionOptions.map((option) => {
                        const isActive = coderPermissionMode === option.id;
                        return (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => {
                              setCoderPermissionMode(option.id);
                              setIsPermissionDropdownOpen(false);
                              showToast(`Coder permissions: ${option.label}`);
                            }}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors cursor-pointer ${
                              isActive
                                ? "bg-[var(--theme-hover-bg)] text-[var(--theme-primary)]"
                                : "text-[var(--theme-secondary)] hover:bg-[var(--theme-hover-bg)] hover:text-[var(--theme-primary)]"
                            }`}
                          >
                            <span className="text-[var(--theme-secondary)]">
                              {option.icon}
                            </span>
                            <span className="flex-1 text-left">
                              {option.label}
                            </span>
                            {isActive && (
                              <Check
                                size={14}
                                className="text-[var(--theme-accent)]"
                              />
                            )}
                          </button>
                        );
                      })}
                      <div className="mt-1.5 border-t border-[var(--theme-border)] pt-1.5 px-2 pb-1 text-[10px] text-[var(--theme-muted)] font-mono">
                        {permissionAuditLog.length} permission action
                        {permissionAuditLog.length === 1 ? "" : "s"} logged
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {isCoderMode && (
              <div className="relative" ref={modeDropdownRef}>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  transition={{ duration: 0.08 }}
                  onClick={() => setIsModeDropdownOpen(!isModeDropdownOpen)}
                  className="flex items-center gap-1.5 px-3 py-2 hover:bg-[var(--theme-hover-bg)] rounded-2xl text-sm font-medium text-[var(--theme-secondary)] hover:text-[var(--theme-primary)] transition-all active:scale-95 cursor-pointer select-none"
                  title={`Assistant Mode: ${
                    activeAssistantMode === "builder"
                      ? "Builder"
                      : activeAssistantMode === "planner"
                        ? "Planner"
                        : activeAssistantMode === "debugger"
                          ? "Debugger"
                          : activeAssistantMode === "reviewer"
                            ? "Reviewer"
                            : "Tester"
                  }`}
                >
                  <div className="shrink-0 flex items-center justify-center">
                    {activeAssistantMode === "builder" && (
                      <Bot
                        size={14}
                        className="text-orange-500 animate-pulse"
                      />
                    )}
                    {activeAssistantMode === "planner" && (
                      <Layers size={14} className="text-violet-500" />
                    )}
                    {activeAssistantMode === "debugger" && (
                      <Bug size={14} className="text-amber-500" />
                    )}
                    {activeAssistantMode === "reviewer" && (
                      <Eye size={14} className="text-emerald-400" />
                    )}
                    {activeAssistantMode === "tester" && (
                      <ShieldAlert size={14} className="text-rose-400" />
                    )}
                  </div>
                  <span className="hidden xl:inline">
                    {activeAssistantMode === "builder"
                      ? "Builder"
                      : activeAssistantMode === "planner"
                        ? "Planner"
                        : activeAssistantMode === "debugger"
                          ? "Debugger"
                          : activeAssistantMode === "reviewer"
                            ? "Reviewer"
                            : "Tester"}
                  </span>
                  <ChevronDown
                    size={14}
                    className="text-[var(--theme-muted)] transition-transform duration-200 hidden xl:inline"
                    style={{
                      transform: isModeDropdownOpen
                        ? "rotate(180deg)"
                        : "rotate(0deg)",
                    }}
                  />
                </motion.button>

                <AnimatePresence>
                  {isModeDropdownOpen && (
                    <motion.div
                      ref={modeDropdownContentRef}
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      style={modeDropdownPosition.style}
                      className="fixed w-56 bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-2xl shadow-2xl z-[180] flex flex-col overflow-hidden text-left"
                    >
                      <div className="p-2 space-y-1">
                        {[
                          {
                            id: "builder",
                            name: "Builder Mode",
                            icon: <Bot size={13} />,
                            color: "text-orange-500",
                            bgColor: "bg-orange-500/10",
                            accentColor: "bg-orange-500",
                          },
                          {
                            id: "planner",
                            name: "Planner Mode",
                            icon: <Layers size={13} />,
                            color: "text-violet-500",
                            bgColor: "bg-violet-500/10",
                            accentColor: "bg-violet-500",
                          },
                          {
                            id: "debugger",
                            name: "Debugger Mode",
                            icon: <Bug size={13} />,
                            color: "text-amber-500",
                            bgColor: "bg-amber-500/10",
                            accentColor: "bg-amber-500",
                          },
                          {
                            id: "reviewer",
                            name: "Reviewer Mode",
                            icon: <Eye size={13} />,
                            color: "text-emerald-400",
                            bgColor: "bg-[#10b981]/10",
                            accentColor: "bg-[#10b981]",
                          },
                          {
                            id: "tester",
                            name: "Tester Mode",
                            icon: <ShieldAlert size={13} />,
                            color: "text-rose-400",
                            bgColor: "bg-[#f43f5e]/10",
                            accentColor: "bg-[#f43f5e]",
                          },
                        ].map((mode, idx) => {
                          const isActive = activeAssistantMode === mode.id;
                          return (
                            <motion.div
                              key={mode.id}
                              initial={{ opacity: 0, x: -8 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{
                                delay: idx * 0.05,
                                type: "spring",
                                stiffness: 140,
                              }}
                            >
                              <button
                                onClick={() => {
                                  setActiveAssistantMode(mode.id as any);
                                  setIsModeDropdownOpen(false);
                                  showToast(
                                    `Switched focus to ${mode.name}.`,
                                  );
                                }}
                                className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-left transition-colors relative group/item cursor-pointer text-xs font-semibold ${
                                  isActive
                                    ? "bg-[var(--theme-hover-bg)]"
                                    : "hover:bg-[var(--theme-hover-bg)] text-[var(--theme-secondary)] hover:text-[var(--theme-primary)]"
                                }`}
                              >
                                <div
                                  className={`p-1.5 rounded-lg shrink-0 flex items-center justify-center ${isActive ? mode.color + " " + mode.bgColor : "bg-[var(--theme-hover-bg)] text-[var(--theme-secondary)]"}`}
                                >
                                  {mode.icon}
                                </div>
                                <span
                                  className={
                                    isActive
                                      ? mode.color
                                      : "text-[var(--theme-primary)]"
                                  }
                                >
                                  {mode.name}
                                </span>
                                {isActive && (
                                  <div className="ml-auto flex items-center gap-1">
                                    <motion.div
                                      animate={{
                                        scale: [1, 1.25, 1],
                                        opacity: [0.5, 1, 0.5],
                                      }}
                                      transition={{
                                        repeat: Infinity,
                                        duration: 1.5,
                                      }}
                                      className={`w-1.5 h-1.5 rounded-full ${mode.accentColor}`}
                                    />
                                    <Check
                                      size={12}
                                      className="text-emerald-500 shrink-0"
                                    />
                                  </div>
                                )}
                              </button>
                            </motion.div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Mic and send buttons */}
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={() => {
                const nextOpenState = !showVoiceControlPanel;
                setShowVoiceControlPanel(nextOpenState);
                if (isVoiceListening) {
                  stopVoiceDictation();
                } else if (nextOpenState) {
                  startVoiceDictation();
                }
              }}
              className={`p-2 rounded-2xl transition-all cursor-pointer mr-0.5 flex items-center justify-center shrink-0 border ${
                isVoiceListening
                  ? "bg-red-500/10 text-red-500 border-red-500/30 shadow-sm shadow-red-500/10 animate-pulse"
                  : showVoiceControlPanel
                    ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                    : "text-[var(--theme-secondary)] hover:text-[var(--theme-primary)] hover:bg-[var(--theme-hover-bg)] border-transparent"
              }`}
              title="Advanced Speech Transcription"
            >
              {isVoiceListening ? (
                <MicOff size={18} className="text-red-500 animate-pulse" />
              ) : (
                <Mic
                  size={18}
                  className={
                    showVoiceControlPanel
                      ? "text-blue-400"
                      : "text-zinc-500 hover:text-zinc-300 transition-colors"
                  }
                />
              )}
            </motion.button>

            {!isCoderMode && setIsVoicePanelOpen && (
              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={() => {
                  if (setIsVoicePanelOpen) {
                    setIsVoicePanelOpen(true);
                  }
                }}
                className={`p-2 rounded-2xl transition-all cursor-pointer mr-0.5 flex items-center justify-center shrink-0 border border-transparent ${
                  isVoicePanelOpen
                    ? "bg-teal-500/10 text-teal-400 border-teal-500/20"
                    : "text-[var(--theme-secondary)] hover:text-teal-400 hover:bg-[var(--theme-hover-bg)] hover:border-teal-500/10"
                }`}
                title="Open Voice Assistant"
                id="chat-voice-call-trigger-button"
              >
                <Headphones size={18} className={isVoicePanelOpen ? "text-teal-400 animate-pulse" : "text-zinc-550 hover:text-teal-400 transition-colors"} />
              </motion.button>
            )}

            {isTyping ? (
              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={() => {
                  if (abortControllerRef.current) {
                    abortControllerRef.current.abort();
                  }
                }}
                className="w-10 h-10 rounded-2xl bg-[var(--theme-hover-bg)] border border-[var(--theme-border)] flex items-center justify-center text-[var(--theme-primary)] transition-all active:scale-95 cursor-pointer"
              >
                <StopCircle size={20} fill="currentColor" />
              </motion.button>
            ) : (
              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={() => handleSend()}
                disabled={
                  !input.trim() &&
                  attachedFiles.length === 0 &&
                  attachedUrlDocs.length === 0
                }
                className={`
                  w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-sm cursor-pointer
                  ${
                    input.trim() ||
                    attachedFiles.length > 0 ||
                    attachedUrlDocs.length > 0
                      ? "bg-[var(--theme-accent)] text-white hover:scale-105 active:scale-95"
                      : "bg-[var(--theme-hover-bg)] text-[var(--theme-muted)]"
                  }
                `}
              >
                <ArrowUp size={20} strokeWidth={3} />
              </motion.button>
            )}
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf,.txt,.md,.csv,.js,.ts,.py"
          multiple
          className="hidden"
          onChange={(e) => {
            handleFileAttach(Array.from(e.target.files || []));
            e.target.value = "";
          }}
        />

        <DocumentSelector
          isOpen={isRagSelectorOpen}
          onClose={() => setIsRagSelectorOpen(false)}
          selectedDocIds={selectedDocIds}
          onSelectionChange={handleSelectionChange}
          ragEnabled={ragEnabled}
          onToggleRag={handleToggleRag}
        />
      </div>
    </div>
  );
};
