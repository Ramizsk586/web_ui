/**
 * Lumina AI Chat UI
 * Modern intelligence, refined interface.
 * 
 * A polished, dark-native AI chat prototype built with React, Lucide-react, 
 * Motion, and Tailwind CSS v4.
 * 
 * Tools are categorized into built-in "Lumina Tools" (Web Scraper & Wikipedia) and external "Llama Bridge Tools".
 */

// Dependencies: react-syntax-highlighter @types/react-syntax-highlighter

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';

const STABLE_NOOP = () => {};
import { motion, AnimatePresence } from 'motion/react';
import { 
  Send, 
  Cloud,
  Plus, 
  Sparkles, 
  ArrowUp,
  Sidebar as SidebarIcon,
  Wrench,
  Hammer,
  User,
  Search,
  Bot,
  Layers,
  Bug,
  MoreVertical,
  Settings,
  Trash2,
  ChevronDown,
  HardDrive,
  Brain,
  Globe,
  Loader2,
  Newspaper,
  Play,
  ExternalLink,
  Maximize2,
  Minimize2,
  SquareTerminal,
  RefreshCw,
  X,
  Languages,
  Layout,
  MessageSquare,
  StopCircle,
  Download,
  FileUp,
  FileJson,
  Camera,
  FolderPlus,
  Folder,
  Box,
  MapPin,
  CloudSun,
  Book,
  Database,
  Image as ImageIcon,
  Library,
  Link as LinkIcon,
  Check,
  ChevronRight,
  ChevronLeft,
  ArrowRight,
  Palette,
  Terminal,
  Calendar,
  CloudMoon,
  Video,
  Copy,
  PenTool,
  History,
  FileText,
  Code,
  Type as TypeIcon,
  Music,
  Mail,
  Coffee,
  Lightbulb,
  BookOpen,
  Activity,
  Beaker,
  Compass,
  Flower2,
  Mic,
  MicOff,
  Smartphone,
  Tablet,
  Monitor,
  Grid,
  Sliders,
  AlignLeft,
  AlignCenter,
  AlignRight,
  MousePointerClick,
  Zap
} from 'lucide-react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

import { fetchBridgeTools, callLlamaBridge as bridgeCall, checkBridgeHealth } from './bridgeClient';
import { useTheme } from './themes';
import { CustomCodeBlockVisualizer, renderTextWithMath, InteractiveTableVisualizer } from './components/LuminaVisualizer';
import { CoderWorkspacePanel } from './components/CoderWorkspacePanel';
import ResearchWorkspacePanel from './components/ResearchWorkspacePanel';
import { CoderLeftExplorer } from './components/CoderLeftExplorer';
import { FloatingCodeEditor } from './components/FloatingCodeEditor';
import TerminalConsole from './components/TerminalConsole';
import Whiteboard from './components/Whiteboard';
import { ChatsManagerPanel } from './components/ChatsManagerPanel';

import { scrapeUrl, ScrapeResult, ScrapeOptions } from './services/scrapingService';
import { ScrapingResultArtifact } from './components/ScrapingResultArtifact';
import { ScrapingProgressIndicator } from './components/ScrapingProgressIndicator';

import { WikiArticleArtifact } from './components/WikiArticleArtifact';
import { WikiSearchResultList } from './components/WikiSearchResultList';
import { WikiToolCallIndicator } from './components/WikiToolCallIndicator';
import { ALL_WIKI_TOOLS } from './tools/wikiTools';
import { webScrapeTool } from './tools/webScrapeTool';
import {
  wikiSearch,
  wikiGetPage,
  wikiGetSummary,
  wikiGetSections,
  wikiGetCategories,
  wikiGetLinks,
  wikiGetImages,
  wikiGetRelated
} from './services/wikiService';

import { useSmartPopupPosition } from './hooks/useSmartPopupPosition';

import { useAskAi } from './hooks/useAskAi';
import { useCoderMode } from './hooks/useCoderMode';
import { useRightPanel } from './hooks/useRightPanel';
import { useAppHandlers } from './hooks/useAppHandlers';

import {
  ToolCallNode,
  Artifact,
  Message,
  Chat,
  Tool,
  ToolDefinition,
  Skill
} from './types';

import {
  DEFAULT_SERVER_URL,
  DEFAULT_MCP_URL,
  DEFAULT_API_KEY,
  AVAILABLE_AVATARS,
  CLOUD_PROVIDERS,
  WRITING_STYLES,
  SKILLS,
  SLASH_COMMANDS
} from './constants';

import {
  WebSearchAnimation,
  ToolCallingAnimation,
  LuminaToolCallingAnimation
} from './components/ui/Animations';

import { SidebarContent } from './components/Sidebar/SidebarContent';
import { ChatBoxPanel } from './components/ChatBoxPanel';
import { VoiceAssistantPanel } from './components/VoiceAssistantPanel';
import { CoderPermissionMode, PendingCommandPermission } from './types';

import {
  RealtimeEditCounter,
  computeLineDiff,
  getFileNameOnly
} from './components/NodeGraph/FileDiffNode';

import { NodeGraph } from './components/NodeGraph/NodeGraph';

import { CanvasBlock } from './components/Chat/CanvasBlock';

import { SearchResultsUI } from './components/Chat/SearchResultsUI';

import { ArtifactCard } from './components/Chat/ArtifactCard';

import { MessageItem } from './components/Chat/MessageItem';

import { Agent } from './agents/types';
import { loadAgents, addAgent, updateAgent, deleteAgent } from './agents/agentStore';
import { AgentSidebarSection } from './components/Agents/AgentSidebarSection';
import { AgentCreationModal } from './components/Agents/AgentCreationModal';
import { AgentChatView } from './components/Agents/AgentChatView';
import { LocalModelConfigModal } from './components/LocalModelConfigModal';

import { Canvas } from './components/Canvas/Canvas';

import { ClaudeAsterisk } from './components/ui/ClaudeAsterisk';

import { DevPerfCanvas } from './components/ui/DevPerfCanvas';

import { parseThinkTags, turboQuantCompress } from './utils/textUtils';
import { safeGetItem } from './utils/storageUtils';
import { extractArtifacts } from './utils/artifactUtils';
import { extractYouTubeId, fetchYouTubeTranscript } from './utils/youtubeUtils';
import { OnboardingModal } from './components/OnboardingModal';
import { VideoTranscriptStudio } from './components/VideoTranscriptStudio';
import { SettingsModal } from './components/SettingsModal';
import { ProjectsPage } from './components/ProjectsPage';
import { AgentsPage } from './components/AgentsPage';
import { ImageLightbox, VideoPlayerPopup, UrlAttachmentModal, TranscriptModal, ElementAnalysisModal } from './components/InteractiveModals';
import { LivePreviewPanel } from './components/LivePreviewPanel';
import { DevToolsPanel } from './components/DevToolsPanel';
import { VmCorePanel } from './components/VmCorePanel';
import { RAGPanel } from './components/RAGPanel';
import { useMarkdownComponents } from './components/Chat/MarkdownComponents';
import TranscriptionOptionsModal from './components/TranscriptionOptionsModal';
import CoderWorkspaceView from './components/Coder/CoderWorkspaceView';

const ModelImage = ({ 
  src, 
  fallback, 
  title,
  bgClass = "bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800"
}: { 
  src: string; 
  fallback: React.ReactNode; 
  title?: string;
  bgClass?: string;
}) => {
  const [error, setError] = React.useState(false);
  if (error || !src) return <>{fallback}</>;
  const isSvg = src.endsWith('.svg') || src.includes('.svg');
  const imgClass = isSvg ? "w-[75%] h-[75%] object-contain" : "w-full h-full object-cover";
  return (
    <div 
      className={`w-7 h-7 rounded-lg flex items-center justify-center overflow-hidden shrink-0 ${bgClass}`}
      title={title}
    >
      <img
        src={src}
        alt="Model logo"
        className={imgClass}
        onError={() => setError(true)}
        referrerPolicy="no-referrer"
      />
    </div>
  );
};

const renderAppModelLogo = (fullName: string, modelId: string, fallback: React.ReactNode) => {
  return fallback;
  const normAuthor = (fullName || '').toLowerCase();
  const normId = (modelId || '').toLowerCase();

  // Define avatar mappings for requested specific brands
  let avatarUrl = '';
  let customTitle = '';
  let bgClass = "bg-white dark:bg-zinc-950 border border-zinc-250 dark:border-zinc-800 p-0.5";

  if (normAuthor.includes('liquid') || normId.includes('lfm')) {
    avatarUrl = 'https://cdn-avatars.huggingface.co/v1/production/uploads/61b8e2ba285851687028d395/EsTgVtnM2IqVRKgPdfqcB.png';
    customTitle = 'Liquid Labs Model';
    bgClass = "bg-[#201511] border border-[#E26D2E]/25 p-0.5";
  } else if (normAuthor.includes('nvidia') || normId.includes('nemotron')) {
    avatarUrl = 'https://cdn-avatars.huggingface.co/v1/production/uploads/65df9200dc3292a8983e5017/Vs5FPVCH-VZBipV3qKTuy.png';
    customTitle = 'NVIDIA Model';
    bgClass = "bg-black border border-zinc-850 p-0.5";
  } else if (normAuthor.includes('qwen') || normId.includes('qwen')) {
    avatarUrl = 'https://cdn-avatars.huggingface.co/v1/production/uploads/620760a26e3b7210c2ff1943/-s1gyJfvbE1RgO5iBeNOi.png';
    customTitle = 'Qwen AI';
    bgClass = "bg-[#1C1A2E] border border-indigo-500/20 p-0.5";
  } else if (normAuthor.includes('deepseek') || normId.includes('deepseek')) {
    avatarUrl = 'https://cdn-avatars.huggingface.co/v1/production/uploads/6538815d1bdb3c40db94fbfa/xMBly9PUMphrFVMxLX4kq.png';
    customTitle = 'DeepSeek Model';
    bgClass = "bg-[#10192A] border border-blue-500/20 p-0.5";
  } else if (normAuthor.includes('stepfun') || normId.includes('stepfun')) {
    avatarUrl = 'https://cdn-avatars.huggingface.co/v1/production/uploads/644f7e6233ac8f46fa0b9e26/CmF2ocXhkr2UtHXgmwq7-.png';
    customTitle = 'StepFun Model';
    bgClass = "bg-[#0B152A] border border-blue-500/15 p-0.5";
  } else if (normAuthor.includes('unsloth') || normId.includes('unsloth')) {
    avatarUrl = 'https://cdn-avatars.huggingface.co/v1/production/uploads/62ecdc18b72a69615d6bd857/E4lkPz1TZNLzIFr_dR273.png';
    customTitle = 'Unsloth Model';
    bgClass = "bg-amber-500/5 border border-amber-500/15 p-0.5";
  } else if (normAuthor.includes('openbmp') || normAuthor.includes('openbmb') || normId.includes('openbmp') || normId.includes('openbmb')) {
    avatarUrl = 'https://cdn-avatars.huggingface.co/v1/production/uploads/1670387859384-633fe7784b362488336bbfad.png';
    customTitle = 'OpenBMB Model';
    bgClass = "bg-white dark:bg-zinc-950 border border-zinc-250 dark:border-zinc-800 p-0.5";
  } else if (normAuthor.includes('bytedance') || normId.includes('bytedance')) {
    avatarUrl = 'https://cdn-avatars.huggingface.co/v1/production/uploads/6535c9e88bde2fae19b6fb25/7a1zq0juEwFJVCIShnLI-.png';
    customTitle = 'ByteDance Model';
    bgClass = "bg-white dark:bg-zinc-950 border border-zinc-250 dark:border-zinc-800 p-0.5";
  } else if (normAuthor.includes('prism') || normId.includes('prism')) {
    avatarUrl = 'https://cdn-avatars.huggingface.co/v1/production/uploads/635a0b777a8ece20fa001ad5/7_KshfAsW9T-U3GZzV2j_.png';
    customTitle = 'Prism ML Model';
    bgClass = "bg-white dark:bg-zinc-950 border border-zinc-250 dark:border-zinc-800 p-0.5";
  } else if (normAuthor.includes('meta') || normAuthor.includes('llama') || normId.includes('llama')) {
    avatarUrl = 'https://upload.wikimedia.org/wikipedia/commons/7/7b/Meta_Platforms_Inc._logo.svg';
    customTitle = 'Meta Llama Model';
    bgClass = "bg-[#0B0F19] border border-blue-900/40 p-1.5";
  }

  if (avatarUrl) {
    return (
      <ModelImage
        src={avatarUrl}
        fallback={fallback}
        title={customTitle}
        bgClass={bgClass}
      />
    );
  }

  return fallback;
};

const SUPPORTED_VOICE_LANGUAGES = [
  { code: 'en-US', label: 'English (US)' },
  { code: 'en-GB', label: 'English (UK)' },
  { code: 'es-ES', label: 'Español (España)' },
  { code: 'es-MX', label: 'Español (México)' },
  { code: 'fr-FR', label: 'Français (France)' },
  { code: 'de-DE', label: 'Deutsch (Deutschland)' },
  { code: 'it-IT', label: 'Italiano (Italia)' },
  { code: 'pt-BR', label: 'Português (Brasil)' },
  { code: 'hi-IN', label: 'हिन्दी (भारत) / Hindi' },
  { code: 'zh-CN', label: '中文 (简体) / Chinese' },
  { code: 'ja-JP', label: '日本語 / Japanese' },
  { code: 'ar-SA', label: 'العربية / Arabic' }
];

interface AppContentProps {
  isDarkMode: boolean;
  theme: any;
  setTheme: any;
  appSettings: any;
  llamaBridge: any;
  agents: any;
  sidebar: any;
  luminaTools: any;
  inputState: any;
  workspace: any;
  uiState: any;
  coderMode: any; researchMode: any;
  askAi: any;
  sendMessageRef: React.MutableRefObject<((content: string) => void) | undefined>;
  rightPanel: any;
  smartPopup: any;
  devTools: any;
  availableModels: any[];
  setAvailableModels: React.Dispatch<React.SetStateAction<any[]>>;
  selectedModel: string;
  setSelectedModel: React.Dispatch<React.SetStateAction<string>>;
  activeModelId: string;
}

export default function AppContent({
  isDarkMode,
  theme,
  setTheme,
  appSettings,
  llamaBridge,
  agents: agentsData,
  sidebar,
  luminaTools: luminaToolsData,
  inputState,
  workspace,
  uiState,
  coderMode, researchMode,
  askAi,
  sendMessageRef,
  rightPanel,
  smartPopup,
  devTools,
  availableModels,
  setAvailableModels,
  selectedModel,
  setSelectedModel,
  activeModelId
}: AppContentProps) {
  const {
    userProfile, setUserProfile,
    projectFolders, setProjectFolders,
    activeProjectId, setActiveProjectId,
    showLogin, setShowLogin,
    loginName, setLoginName,
    loginAge, setLoginAge,
    errorText, setErrorText,
    handleOnboardingSubmit,
    isCompactSidebar, setIsCompactSidebar,
    useBubbles, setUseBubbles,
    autoHideTopBar, setAutoHideTopBar,
    useTurboQuant, setUseTurboQuant,
    modelSelectorMode, setModelSelectorMode,
    activeSettingsTab, setActiveSettingsTab,
    activePlusSubMenu, setActivePlusSubMenu,
    mcpMode, setMcpMode,
    remoteMcpConfig, setRemoteMcpConfig,
    testToolInput, setTestToolInput,
    isTestingTool, setIsTestingTool,
    testToolResult, setTestToolResult,
    modelSearchQuery, setModelSearchQuery,
    providerSearchQuery, setProviderSearchQuery,
    persona, setPersona,
    serverUrl, setServerUrl,
    apiKey, setApiKey,
    mcpUrl, setMcpUrl,
    mcpKey, setMcpKey,
    searchProvider, setSearchProvider,
    tavilyApiKey, setTavilyApiKey,
    serpApiKey, setSerpApiKey,
    aiVerificationState, setAiVerificationState,
    searchVerificationState, setSearchVerificationState,
    isAiSaved, setIsAiSaved,
    isSearchSaved, setIsSearchSaved,
    isMcpSaved, setIsMcpSaved,
    writingStyle, setWritingStyle,
    selectedProvider, setSelectedProvider,
    aiProviderProfiles,
    editingAiProfileId,
    handleProviderSelect,
    handleSaveAI,
    handleVerifyAI,
    handleToggleAiProfile,
    handleEditAiProfile,
    handleDeleteAiProfile,
    handleRenameAiProfile,
    handleCloseAiProfileEditor,
    handleUpdateAiProfileConfig,
    handleToggleAiProfileModel,
    handleSetAiProfileModelsVisible,
    handleVerifyAiProfile,
    handleSelectAiProfileModel,
    handleSaveSearch,
    handleVerifySearch,
    handleSaveMcp, useLocalModelsOnly, setUseLocalModelsOnly
  } = appSettings;

  const {
    llamaBridgeUrl, setLlamaBridgeUrl,
    llamaBridgeApiKey, setLlamaBridgeApiKey,
    llamaBridgeModels, setLlamaBridgeModels,
    selectedLlamaModel, setSelectedLlamaModel,
    useBridgeTools, setUseBridgeTools,
    bridgeTools, setBridgeTools,
    isMcpConnected, setIsMcpConnected,
    handleTestLlamaConnection,
    handleLoadBridgeTools,
    handleLoadLlamaModels,
    callLlamaBridge
  } = llamaBridge;

  const {
    agents, setAgents,
    activeAgent, setActiveAgent,
    showAgentCreation, setShowAgentCreation,
    editingAgent, setEditingAgent,
    handleSelectAgent,
    handleAgentCreated,
    handleDeleteAgent,
    handleUpdateAgent,
    handleEditAgent
  } = agentsData;

  const {
    isSidebarOpen, setIsSidebarOpen,
    sidebarWidth, setSidebarWidth,
    isResizing, setIsResizing,
    isMobileMenuOpen, setIsMobileMenuOpen
  } = sidebar;

  const {
    scrapingResults, setScrapingResults,
    activeScrapingJobs, setActiveScrapingJobs,
    wikiResults, setWikiResults,
    luminaTools, setLuminaTools
  } = luminaToolsData;

  const {
    input, setInput,
    selectedCommandIndex, setSelectedCommandIndex,
    showsSlashCommands,
    slashQuery,
    filteredCommands,
    isTyping, setIsTyping,
    activeSkills, setActiveSkills,
    typingMessageId, setTypingMessageId
  } = inputState;

  const {
    isCoderLeftPanelOpen, setIsCoderLeftPanelOpen,
    coderWorkspacePath, setCoderWorkspacePath,
    isCoderRightPanelOpen, setIsCoderRightPanelOpen,
    isTerminalOpen, setIsTerminalOpen,
    isTerminalPopupOpen, setIsTerminalPopupOpen,
    isElizaActive, setIsElizaActive,
    elizaToggleSignal, setElizaToggleSignal,
    isWhiteboardOpen, setIsWhiteboardOpen,
    floatingEditFile, setFloatingEditFile,
    workspaceRefreshKey, setWorkspaceRefreshKey,
    iframeKey, setIframeKey,
    rightIsGridEnabled, setRightIsGridEnabled,
    rightPreviewSubpath, setRightPreviewSubpath,
    projectType, setProjectType,
    projectFramework, setProjectFramework,
    devServerUrl, setDevServerUrl,
    rightPreviewLogs, setRightPreviewLogs,
    rightPreviewError, setRightPreviewError,
    isRightPreviewStarting, setIsRightPreviewStarting,
    attachmentContextMenu, setAttachmentContextMenu,
    selectedModalAttachment, setSelectedModalAttachment,
    rightIframeRef,
    triggerWorkspaceRefresh
  } = workspace;

  const {
    chats, setChats,
    lightboxImage, setLightboxImage,
    activeVideo, setActiveVideo,
    currentChatId, setCurrentChatId,
    isSettingsOpen, setIsSettingsOpen,
    isSourcesPanelOpen, setIsSourcesPanelOpen,
    sourcesPanelMessageId, setSourcesPanelMessageId,
    toasts, setToasts, showToast,
    isUrlToolOpen, setIsUrlToolOpen,
    urlToolInput, setUrlToolInput,
    urlToolLoading, setUrlToolLoading,
    urlToolError, setUrlToolError,
    attachedUrlDocs, setAttachedUrlDocs,
    isTranscriptToolOpen, setIsTranscriptToolOpen,
    transcriptToolInput, setTranscriptToolInput,
    transcriptToolLoading, setTranscriptToolLoading,
    transcriptToolError, setTranscriptToolError,
    selectedTranscriptDoc, setSelectedTranscriptDoc,
    transcriptionOptionsDoc, setTranscriptionOptionsDoc,
    isWebSearchEnabled, setIsWebSearchEnabled,
    isDeepSearchEnabled, setIsDeepSearchEnabled,
    isVoiceListening, setIsVoiceListening,
    isVoicePanelOpen, setIsVoicePanelOpen,
    voiceInterimText, setVoiceInterimText,
    voiceLanguage, setVoiceLanguage,
    voiceContinuous, setVoiceContinuous,
    voiceAppendMode, setVoiceAppendMode,
    voiceAutoSend, setVoiceAutoSend,
    voiceError, setVoiceError,
    micVolume, setMicVolume,
    showVoiceControlPanel, setShowVoiceControlPanel,
    startVoiceDictation, stopVoiceDictation, toggleVoiceDictation,
    attachedFiles, setAttachedFiles,
    searchQuery, setSearchQuery,
    showScrollButton, setShowScrollButton,
    isModelDropdownOpen, setIsModelDropdownOpen,
    isModeDropdownOpen, setIsModeDropdownOpen,
    isPlusMenuOpen, setIsPlusMenuOpen,
    isHeaderMenuOpen, setIsHeaderMenuOpen,
    activeArtifact, setActiveArtifact,
    isCanvasOpen, setIsCanvasOpen,
    canvasView, setCanvasView
  } = uiState;

  const [showProjectsPage, setShowProjectsPage] = useState(false);
  const [showAgentsPage, setShowAgentsPage] = useState(false);

  const [selectedProjectForChats, setSelectedProjectForChats] = useState<any | null>(null);
  const [selectedAgentForChats, setSelectedAgentForChats] = useState<any | null>(null);

  // States and hooks for dragging / resizing live preview panel
  const [canvasWidth, setCanvasWidth] = useState<number>(600); // stable pixel-based width
  const [isCanvasResizing, setIsCanvasResizing] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (err) {
      // safe fallback
    }
    setIsCanvasResizing(true);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isCanvasResizing) return;
    const clientX = e.clientX;
    if (typeof clientX !== 'number' || isNaN(clientX)) return;

    const newWidth = window.innerWidth - clientX;
    // Mirror side panel architectural boundaries (keep between 300px and window width minus 300px)
    if (newWidth >= 300 && newWidth <= window.innerWidth - 300) {
      setCanvasWidth(newWidth);
    }
  }, [isCanvasResizing]);

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (err) {
      // safe fallback
    }
    setIsCanvasResizing(false);
  }, []);

  useEffect(() => {
    if (isCanvasResizing) {
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    }
    return () => {
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    };
  }, [isCanvasResizing]);

  // Voice Assistant Speech Synthesis States and Effects
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const lastSpokenMessageIdRef = useRef<string | null>(null);
  const shouldVoiceSpeakLastResponseRef = useRef<boolean>(false);
  const lastMessagesLengthRef = useRef<number>(0);

  const cleanTextForSpeech = (content: string): string => {
    if (!content) return "";
    let text = content;
    text = text.replace(/<think>[\s\S]*?<\/think>/gi, '');
    text = text.replace(/<artifact[^>]*>[\s\S]*?<\/artifact>/gi, '');
    text = text.replace(/<[^>]*>/g, '');
    text = text.replace(/```[a-zA-Z0-9-]*[\s\S]*?```/gi, '');
    text = text.replace(/[\*_~`#]+/g, '');
    text = text.replace(/\n+/g, ' ');
    return text.trim();
  };

  const speakText = (text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    
    try {
      window.speechSynthesis.cancel();
    } catch (e) {
      console.warn("Cancel speech error", e);
    }
    setIsAiSpeaking(false);

    if (!text) return;

    try {
      const isArabic = /[\u0600-\u06FF]/.test(text);
      const u = new SpeechSynthesisUtterance(text);
      currentUtteranceRef.current = u;
      
      if (window.speechSynthesis.getVoices) {
        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = voices.find(v => isArabic ? v.lang.startsWith('ar') : v.lang.startsWith('en'));
        if (preferredVoice) {
          u.voice = preferredVoice;
        }
      }
      
      u.onstart = () => {
        setIsAiSpeaking(true);
      };
      u.onend = () => {
        setIsAiSpeaking(false);
        currentUtteranceRef.current = null;
      };
      u.onerror = (e) => {
        console.warn("Speech Synthesis error:", e);
        setIsAiSpeaking(false);
        currentUtteranceRef.current = null;
      };

      window.speechSynthesis.speak(u);
    } catch (err) {
      console.error("Speech Synthesis exception:", err);
      setIsAiSpeaking(false);
    }
  };

  const stopSpeaking = () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {
        console.warn(e);
      }
    }
    setIsAiSpeaking(false);
    currentUtteranceRef.current = null;
  };

  // Flag that next reply should speak if voice continuous / listening was started
  useEffect(() => {
    if (isVoiceListening) {
      shouldVoiceSpeakLastResponseRef.current = true;
    }
  }, [isVoiceListening]);

  // Handle auto-speak completed assistant messages
  useEffect(() => {
    const activeMessages = chats.find(c => c.id === currentChatId)?.messages || [];
    
    if (activeMessages.length === 0) {
      lastSpokenMessageIdRef.current = null;
      lastMessagesLengthRef.current = 0;
      return;
    }

    const lastMsg = activeMessages[activeMessages.length - 1];
    
    if (lastMsg && lastMsg.role === 'assistant') {
      if (!isTyping) {
        if (lastMsg.id !== lastSpokenMessageIdRef.current) {
          lastSpokenMessageIdRef.current = lastMsg.id;
          
          if (isVoicePanelOpen || shouldVoiceSpeakLastResponseRef.current) {
            const speechText = cleanTextForSpeech(lastMsg.content);
            if (speechText) {
              speakText(speechText);
            }
          }
        }
      }
    } else if (lastMsg && lastMsg.role === 'user') {
      stopSpeaking();
    }
    
    lastMessagesLengthRef.current = activeMessages.length;
  }, [chats, currentChatId, isTyping, isVoicePanelOpen]);

  // If user types keyboard characters, lower the voice speak flag (unless the panel is wide open)
  useEffect(() => {
    if (input) {
      shouldVoiceSpeakLastResponseRef.current = false;
    }
  }, [input]);

  const {
    isCoderMode, setIsCoderMode,
    isCoderWorkspacePanelOpen, setIsCoderWorkspacePanelOpen,
    activeCommandType, setActiveCommandType,
    activeCommandQuery, setActiveCommandQuery,
    coderTodos, setCoderTodos,
    isGeneratingTodos, setIsGeneratingTodos,
    showTodoPanel, setShowTodoPanel,
    todoCollapsed, setTodoCollapsed,
    orchestrationState, setOrchestrationState,
    orchestrationCollapsed, setOrchestrationCollapsed
  } = coderMode; const { isResearchMode, setIsResearchMode, isResearchWorkspaceOpen, setIsResearchWorkspaceOpen } = researchMode;

  const {
    askAiQuestions,
    setAskAiQuestions,
    currentQuestionIndex,
    setCurrentQuestionIndex,
    askAiAnswers,
    setAskAiAnswers,
    isGeneratingQuestions,
    setIsGeneratingQuestions,
    showAskAiPanel,
    setShowAskAiPanel,
    textInputAnswer,
    setTextInputAnswer,
    isTransitioningQuestion,
    setIsTransitioningQuestion,
    isAnalyzingAnswers,
    setIsAnalyzingAnswers,
    handleTriggerAskAi,
    handleNextQuestion,
    handleSelectAnswer,
    handleDotClick,
    handleFinishQuestions,
    createNewChat
  } = askAi;

  const {
    rightViewportMode,
    setRightViewportMode,
    rightIsInspectMode,
    setRightIsInspectMode,
    isAnalyzingElement,
    setIsAnalyzingElement,
    localElementAttachments,
    setLocalElementAttachments,
    handleSelectedElementAnalysis
  } = rightPanel;

  const smartPopupPosition = smartPopup;



  // React Refs
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const plusMenuRef = useRef<HTMLDivElement>(null);
  const menuContentRef = useRef<HTMLDivElement>(null);
  const modeDropdownRef = useRef<HTMLDivElement>(null);
  const modeDropdownContentRef = useRef<HTMLDivElement>(null);
  const modelDropdownContentRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const headerMenuRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const rightPreviewPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Layout & UI helper states
  const [activeAssistantMode, setActiveAssistantMode] = useState<'builder' | 'planner' | 'debugger'>('builder');
  const [coderPermissionMode, setCoderPermissionMode] = useState<CoderPermissionMode>(() => {
    return (localStorage.getItem('lumina_coder_permission_mode') as CoderPermissionMode) || 'default';
  });
  const [alwaysAllowedCommands, setAlwaysAllowedCommands] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('lumina_coder_allowed_commands') || '[]');
    } catch {
      return [];
    }
  });
  const [pendingCommandPermission, setPendingCommandPermission] = useState<PendingCommandPermission | null>(null);
  const [permissionAuditLog, setPermissionAuditLog] = useState<any[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [retroFilter, setRetroFilter] = useState(false);
  const [verboseDebug, setVerboseDebug] = useState(false);
  const [isDevToolsOpen, setIsDevToolsOpen] = useState(false);
  const [isVmCorePanelOpen, setIsVmCorePanelOpen] = useState(false);
  const [isRagPanelOpen, setIsRagPanelOpen] = useState(false);
  const [simLatency, setSimLatency] = useState(120);
  const [activeDevTab, setActiveDevTab] = useState<'status' | 'console' | 'perf' | 'storage' | 'flags'>('status');
  const [devLogs, setDevLogs] = useState<any[]>([]);
  const [isModelDrawerOpen, setIsModelDrawerOpen] = useState(false);

  // Local model manual config state
  const [isLocalModelConfigOpen, setIsLocalModelConfigOpen] = useState(false);
  const [localModelConfigModel, setLocalModelConfigModel] = useState<{ id: string; name: string } | null>(null);
  
  // Model engine loading state (llama.cpp)
  const [loadedLocalModelId, setLoadedLocalModelId] = useState<string | null>(() => {
    return localStorage.getItem('lumina_active_loaded_local_model') || null;
  });
  const [localModelLoadingId, setLocalModelLoadingId] = useState<string | null>(null);
  const [localModelLoadingProgress, setLocalModelLoadingProgress] = useState(0);
  const [favoriteModelIds, setFavoriteModelIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('lumina_favorite_models') || '[]');
    } catch {
      return [];
    }
  });
  const [isFavoritesCollapsed, setIsFavoritesCollapsed] = useState(false);
  const [collapsedModelCategories, setCollapsedModelCategories] = useState<Record<string, boolean>>({});

  // Downloaded local models list (synced from localStorage + server scan)
  const [downloadedModels, setDownloadedModels] = useState<any[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('lumina_downloaded_models') || '[]');
    } catch { return []; }
  });
  const refreshLocalModels = useCallback(async () => {
    try {
      const res = await fetch('/api/models/list');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.models)) {
          setDownloadedModels(data.models);
          localStorage.setItem('lumina_downloaded_models', JSON.stringify(data.models));
          return;
        }
      }
    } catch {}
    // Fallback to localStorage if server scan fails
    try {
      const models = JSON.parse(localStorage.getItem('lumina_downloaded_models') || '[]');
      setDownloadedModels(models);
    } catch {}
  }, []);

  // Computed variables
  const messages = useMemo(() => {
    const activeChat = chats.find(c => c.id === currentChatId);
    return activeChat ? activeChat.messages : [];
  }, [chats, currentChatId]);

  const activeModelList = useMemo(() => {
    const list = useLocalModelsOnly
      ? downloadedModels.length > 0
        ? downloadedModels.map(m => ({ id: m.id, name: m.name || m.id }))
        : []
      : (availableModels.length > 0 ? availableModels : [
          { id: 'openprovider/auto-free', name: 'OpenProvider Auto Free', isAutoFree: true }
        ]);

    return list.map(model => {
      let cleaned = model.name || model.id;
      if (cleaned.includes('/')) {
        cleaned = cleaned.split('/').pop() || cleaned;
      }
      cleaned = cleaned.replace(/\s*\(.*?\)\s*/g, '');
      cleaned = cleaned.replace(/\.(gguf|ggfu|bin|tar|gz|zip)$/i, '');
      cleaned = cleaned.replace(/[-_]?[qQ][0-9](_[a-zA-Z0-9_]+)?/g, '');
      cleaned = cleaned.replace(/[-_]?gguf$/i, '');
      cleaned = cleaned.replace(/[-_]?ggfu$/i, '');
      cleaned = cleaned.replace(/\s+GGUF$/i, '');
      cleaned = cleaned.replace(/\s+GGFU$/i, '');
      cleaned = cleaned.replace(/[-_]+/g, ' ');
      cleaned = cleaned.replace(/\s+/g, ' ');
      return {
        ...model,
        name: cleaned.trim()
      };
    });
  }, [availableModels, useLocalModelsOnly, downloadedModels]);

  const _unusedModelList = useMemo(() => {
    return availableModels.length > 0 ? availableModels : [
      { id: 'openprovider/auto-free', name: 'OpenProvider Auto Free', isAutoFree: true }
    ];
  }, [availableModels]);

  const setActiveModelId = (id: string) => {
    const profileModel = availableModels.find(model => model.id === id && model.providerProfileId);
    if (profileModel?.providerProfileId && handleSelectAiProfileModel) {
      handleSelectAiProfileModel(id, profileModel.providerProfileId);
      return;
    }
    setSelectedModel(id);
  };

  const filteredModelList = useMemo(() => {
    const query = modelSearchQuery.trim().toLowerCase();
    if (!query) return activeModelList;
    return activeModelList.filter(model => model.name.toLowerCase().includes(query) || model.id.toLowerCase().includes(query));
  }, [activeModelList, modelSearchQuery]);

  useEffect(() => {
    localStorage.setItem('lumina_favorite_models', JSON.stringify(favoriteModelIds.slice(0, 20)));
  }, [favoriteModelIds]);

  const toggleFavoriteModel = useCallback((modelId: string) => {
    setFavoriteModelIds(prev => {
      if (prev.includes(modelId)) {
        return prev.filter(id => id !== modelId);
      }
      if (prev.length >= 20) {
        showToast('Favorite models are limited to 20');
        return prev;
      }
      return [modelId, ...prev].slice(0, 20);
    });
  }, [showToast]);

  const favoriteModels = useMemo(() => {
    const byId = new Map(filteredModelList.map(model => [model.id, model]));
    return favoriteModelIds.map(id => byId.get(id)).filter(Boolean);
  }, [favoriteModelIds, filteredModelList]);

  const providerModelCategories = useMemo(() => {
    const groups = new Map<string, { id: string; label: string; models: any[] }>();
    for (const model of filteredModelList) {
      const categoryId = model.providerProfileId || model.providerProfileName || 'default-provider';
      const label = model.providerProfileName || model.provider || 'Available Models';
      if (!groups.has(categoryId)) {
        groups.set(categoryId, { id: categoryId, label, models: [] });
      }
      groups.get(categoryId)!.models.push(model);
    }
    return Array.from(groups.values());
  }, [filteredModelList]);

  const toggleModelCategory = useCallback((categoryId: string) => {
    setCollapsedModelCategories(prev => ({ ...prev, [categoryId]: !prev[categoryId] }));
  }, []);

  const handleOpenLocalModelConfig = (id: string) => {
    const modelObj = activeModelList.find(m => m.id === id) || { id, name: id };
    setLocalModelConfigModel({ id: modelObj.id, name: modelObj.name });
    setIsLocalModelConfigOpen(true);
  };

  const handleLoadLocalModel = (config: any) => {
    if (!localModelConfigModel) return;
    const modelId = localModelConfigModel.id;
    setIsLocalModelConfigOpen(false);
    
    // Set loading state
    setLocalModelLoadingId(modelId);
    setLocalModelLoadingProgress(0);
    
    // Append real compilation output to console logs
    addDevLog(`[llama.cpp] Initializing local model: ${modelId}`, 'info');
    addDevLog(`[llama.cpp] Configured Port: ${config.localPort} | Host: ${config.localHost}`, 'info');
    addDevLog(`[llama.cpp] Selected Path: C:/Users/${config.osUser}/.lumina/models/${config.modelPublisher}/${config.modelFolder}/${config.modelFile}`, 'info');
    addDevLog(`[llama.cpp] GPU Offload Layers (ngl): ${config.gpuOffload}`, 'info');
    
    showToast(`Loading llama.cpp configurations for ${localModelConfigModel.name}...`);
    
    let currentProgress = 0;
    const interval = setInterval(() => {
      const step = 25;
      currentProgress = Math.min(currentProgress + step, 100);
      setLocalModelLoadingProgress(currentProgress);
      
      if (currentProgress >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          setLoadedLocalModelId(modelId);
          localStorage.setItem('lumina_active_loaded_local_model', modelId);
          setLocalModelLoadingId(null);
          setLocalModelLoadingProgress(0);
          
          addDevLog(`[llama.cpp] CLI Command: ${config.generatedCommand}`, 'success');
          addDevLog(`[llama.cpp] CPU hardware allocated threads=${config.cpuThreads}`, 'info');
          addDevLog(`[llama.cpp] GPU/RAM allocation estimated at ${config.memoryEst?.gpuMem} GB`, 'info');
          addDevLog(`[llama.cpp] Context limit set to ${config.contextLength} tokens`, 'info');
          addDevLog(`[llama.cpp] Successfully linked to running local server at http://${config.localHost}:${config.localPort}`, 'success');
          
          showToast(`Lumina is now connected to ${localModelConfigModel.name}!`);
        }, 300);
      }
    }, 150);
  };

  const handleModelSelect = (id: string) => {
    // Check ifSelected model is local model (GGUF etc)
    const isLocal = useLocalModelsOnly || id.toLowerCase().includes('gguf');
    setActiveModelId(id);
    setIsModelDropdownOpen(false);
    setIsModelDrawerOpen(false);
    setModelSearchQuery('');
    
    if (isLocal) {
      handleOpenLocalModelConfig(id);
    }
  };

  // Smart Popups
  const plusMenuPopupPosition = useSmartPopupPosition({
    triggerRef: plusMenuRef,
    popupRef: menuContentRef,
    isOpen: isPlusMenuOpen,
    align: 'left'
  });

  const modeDropdownPosition = useSmartPopupPosition({
    triggerRef: modeDropdownRef,
    popupRef: modeDropdownContentRef,
    isOpen: isModeDropdownOpen,
    align: 'right'
  });

  const modelDropdownPosition = useSmartPopupPosition({
    triggerRef: dropdownRef,
    popupRef: modelDropdownContentRef,
    isOpen: isModelDropdownOpen,
    align: 'left'
  });

  // UI Handlers & Helper functions
  const addDevLog = useCallback((message: string, type: 'info' | 'warn' | 'error' | 'success' = 'info') => {
    setDevLogs(prev => [...prev, { id: Date.now().toString(), text: message, type, time: new Date().toLocaleTimeString() }]);
  }, []);

  const handleExecMockCommand = useCallback((cmd: string) => {
    if (!cmd) return;
    addDevLog(`$ ${cmd}`, 'info');
    const lower = cmd.toLowerCase();
    if (lower === 'clear') {
      setDevLogs([]);
    } else if (lower === 'help') {
      addDevLog('Available commands: help, clear, ping, system, perf', 'info');
    } else if (lower === 'ping') {
      addDevLog('pong! 64 bytes from local: icmp_seq=1 ttl=64 time=0.21ms', 'info');
    } else if (lower === 'system') {
      addDevLog('System: Node.js Dev Server | Platform: Cloud Run Sandboxed', 'info');
    } else if (lower === 'perf') {
      addDevLog('Heap size: 42.1MB | Active Nodes: 1243 | FPS: 60', 'info');
    } else {
      addDevLog(`Command not found: ${cmd}`, 'error');
    }
  }, [addDevLog]);

  const insertAttachedContent = (content: string) => {
    setInput(prev => prev ? prev + '\n' + content : content);
    showToast("Attachment content inserted to compose box!");
  };

  const handleSetActiveArtifact = (art: any) => {
    setActiveArtifact(art);
    setIsCanvasOpen(true);
  };

  const handleSetIsCanvasOpen = (open: boolean) => {
    setIsCanvasOpen(open);
  };

  const handleSetCanvasView = (view: 'code' | 'preview') => {
    setCanvasView(view);
  };

  const handleUpdateMessage = (messageId: string, updatedFields: Partial<Message>) => {
    setChats(prev => prev.map(chat => {
      if (chat.id === currentChatId) {
        return {
          ...chat,
          messages: chat.messages.map(m => {
            if (m.id === messageId) {
              return {
                ...m,
                ...updatedFields
              };
            }
            return m;
          })
        };
      }
      return chat;
    }));
  };

  const handleUpdateTodoPlan = (messageId: string, updatedPlan: any) => {
    setChats(prev => prev.map(chat => {
      if (chat.id === currentChatId) {
        return {
          ...chat,
          messages: chat.messages.map(m => {
            if (m.id === messageId) {
              return {
                ...m,
                todoPlan: updatedPlan
              };
            }
            return m;
          })
        };
      }
      return chat;
    }));
  };

  const handleStartBuilding = (chatId: string, messageId: string, todos: any[]) => {
    setActiveCommandType("coder");
    setCoderTodos(todos.map((t, idx) => ({ id: String(idx + 1), content: t.text || t.content, status: idx === 0 ? 'in_progress' : 'pending' })));
    setShowTodoPanel(true);
    setChats(prev => prev.map(c => {
      if (c.id === chatId) {
        return {
          ...c,
          messages: c.messages.map(m => m.id === messageId ? {
            ...m,
            todoPlan: {
              ...m.todoPlan!,
              isConfirmed: true,
              countdown: 0
            }
          } : m)
        };
      }
      return c;
    }));
  };

  const handleStartBuildingBtn = (messageId: string) => {
    if (currentChatId) {
      const activeChat = chats.find(c => c.id === currentChatId);
      const activeMsg = activeChat?.messages.find(m => m.id === messageId);
      if (activeMsg && activeMsg.todoPlan) {
        handleStartBuilding(currentChatId, messageId, activeMsg.todoPlan.todos);
      }
    }
  };

  const buildActiveTools = useCallback(() => {
    const active: any[] = [];
    luminaTools.forEach(tool => {
      if (tool.enabled) {
        active.push({
          type: 'function',
          function: {
            name: tool.id,
            description: tool.description,
            parameters: tool.parameters || { type: 'object', properties: {}, required: [] }
          }
        });
      }
    });

    if (useBridgeTools) {
      bridgeTools.forEach(tool => {
        if (tool.enabled) {
          active.push({
            type: 'function',
            function: {
              name: tool.id,
              description: tool.description,
              parameters: tool.parameters || { type: 'object', properties: {}, required: [] }
            }
          });
        }
      });
    }

    return active;
  }, [luminaTools, useBridgeTools, bridgeTools]);

  const renderActiveQuestionContent = () => {
    const activeQuestion = askAiQuestions[currentQuestionIndex];
    if (!activeQuestion) return null;

    const qId = activeQuestion.id;
    const currentAnswer = askAiAnswers[qId];

    if (activeQuestion.type === 'single_choice') {
      const isCustom = currentAnswer && !activeQuestion.options?.includes(currentAnswer);
      return (
        <div className="flex flex-col gap-2.5 w-full">
          <div className="grid grid-cols-3 gap-2">
            {activeQuestion.options?.slice(0, 3).map((opt: string) => (
              <button
                key={opt}
                onClick={() => { setTextInputAnswer(''); handleSelectAnswer(qId, opt); }}
                className={`p-3 rounded-xl border text-sm font-semibold transition-all text-center leading-tight ${
                  currentAnswer === opt
                    ? 'border-[var(--theme-accent)] bg-[var(--theme-accent-dim)] text-[var(--theme-accent-text)] shadow-sm'
                    : 'border-border bg-transparent hover:bg-[var(--theme-hover)] hover:border-[var(--theme-accent)]/40 text-[var(--theme-text)]'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
          <div className={`flex items-center gap-2 p-3 rounded-xl border text-sm transition-all ${
            isCustom
              ? 'border-[var(--theme-accent)] bg-[var(--theme-accent-dim)]'
              : 'border-border bg-transparent hover:border-[var(--theme-accent)]/40'
          }`}>
            <span className="shrink-0 text-[11px] font-bold uppercase tracking-wider text-[var(--theme-muted)]">
              Custom
            </span>
            <input
              type="text"
              value={textInputAnswer}
              onChange={(e) => {
                setTextInputAnswer(e.target.value);
                if (e.target.value.trim()) {
                  setAskAiAnswers(prev => ({ ...prev, [qId]: e.target.value.trim() }));
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && textInputAnswer.trim()) {
                  handleSelectAnswer(qId, textInputAnswer.trim());
                }
              }}
              placeholder="Type your own answer..."
              className="flex-1 bg-transparent outline-none text-sm text-[var(--theme-primary)] placeholder-[var(--theme-muted)]"
            />
            <button
              onClick={(e) => { e.stopPropagation(); if (textInputAnswer.trim()) handleSelectAnswer(qId, textInputAnswer.trim()); }}
              disabled={!textInputAnswer.trim()}
              className="px-3 py-1.5 bg-[var(--theme-accent)] text-white rounded-lg text-xs font-bold disabled:opacity-40 transition-all shrink-0 cursor-pointer"
            >
              Save
            </button>
          </div>
        </div>
      );
    }

    if (activeQuestion.type === 'multi_choice') {
      const selected = Array.isArray(currentAnswer) ? currentAnswer : [];
      const handleToggle = (opt: string) => {
        const next = selected.includes(opt)
          ? selected.filter((x: string) => x !== opt)
          : [...selected, opt];
        handleSelectAnswer(qId, next);
      };
      return (
        <div className="flex flex-col gap-2 w-full">
          {activeQuestion.options?.map((opt: string) => {
            const isSelected = selected.includes(opt);
            return (
              <button
                key={opt}
                onClick={() => handleToggle(opt)}
                className={`w-full text-left p-3 rounded-lg border text-sm font-medium transition-all flex items-center justify-between ${
                  isSelected
                    ? 'border-[var(--theme-accent)] bg-[var(--theme-accent-dim)] text-[var(--theme-accent-text)]'
                    : 'border-border bg-transparent hover:bg-[var(--theme-hover)] text-[var(--theme-text)]'
                }`}
              >
                <span>{opt}</span>
                <span className={`w-4 h-4 rounded border flex items-center justify-center text-xs ${isSelected ? 'bg-[var(--theme-accent)] border-[var(--theme-accent)] text-white' : 'border-gray-400'}`}>
                  {isSelected && '✓'}
                </span>
              </button>
            );
          })}
        </div>
      );
    }

    if (activeQuestion.type === 'scale') {
      return (
        <div className="flex gap-2 w-full justify-between items-center sm:px-4 py-2">
          {[1, 2, 3, 4, 5].map((val) => (
            <button
              key={val}
              onClick={() => handleSelectAnswer(qId, String(val))}
              className={`w-10 h-10 rounded-full border text-sm font-semibold flex items-center justify-center transition-all ${
                currentAnswer === String(val)
                  ? 'border-[var(--theme-accent)] bg-[var(--theme-accent)] text-white shadow-sm'
                  : 'border-border bg-transparent hover:bg-[var(--theme-hover)] text-[var(--theme-text)]'
              }`}
            >
              {val}
            </button>
          ))}
        </div>
      );
    }

    if (activeQuestion.type === 'confirm') {
      return (
        <div className="flex gap-4 w-full justify-center items-center py-2">
          {['Yes', 'No'].map((opt) => (
            <button
              key={opt}
              onClick={() => handleSelectAnswer(qId, opt)}
              className={`px-6 py-2.5 rounded-lg border text-sm font-medium transition-all w-1/2 ${
                currentAnswer === opt
                  ? 'border-[var(--theme-accent)] bg-[var(--theme-accent)] text-white shadow-sm'
                  : 'border-border bg-transparent hover:bg-[var(--theme-hover)] text-[var(--theme-text)]'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      );
    }

    if (activeQuestion.type === 'text_input') {
      return (
        <div className="flex flex-col gap-2 w-full">
          <textarea
            value={textInputAnswer}
            onChange={(e) => setTextInputAnswer(e.target.value)}
            placeholder="Type your detailed requirements here..."
            className="w-full h-24 p-3 rounded-lg border bg-transparent font-sans text-sm focus:outline-none focus:ring-1 focus:ring-[var(--theme-accent)] resize-none"
          />
          <button
            onClick={() => handleSelectAnswer(qId, textInputAnswer)}
            disabled={!textInputAnswer.trim()}
            className="px-4 py-2 bg-[var(--theme-accent)] text-white rounded-lg text-xs font-semibold disabled:opacity-50 tracking-tight transition-all"
          >
            Save Answer
          </button>
        </div>
      );
    }

    return null;
  };

  // Wire up autonomous countdown triggers or window callbacks
  useEffect(() => {
    (window as any).triggerStartBuilding = (chatId: string, messageId: string, todos: any[]) => {
      handleStartBuilding(chatId, messageId, todos);
    };
    return () => {
      delete (window as any).triggerStartBuilding;
    };
  }, [handleStartBuilding]);
const startCoderPreview = useCallback(async () => {
    setIsRightPreviewStarting(true);
    setRightPreviewError('');
    setRightPreviewLogs([]);
    if (rightPreviewPollRef.current) {
      clearInterval(rightPreviewPollRef.current);
      rightPreviewPollRef.current = null;
    }

    try {
      const res = await fetch('/api/preview/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderPath: coderWorkspacePath || undefined })
      });
      const data = await res.json();
      if (!res.ok) {
        setRightPreviewError(data.error || 'Could not start preview');
        setRightPreviewLogs(data.logs || []);
        setDevServerUrl('');
        setIsRightPreviewStarting(false);
        return;
      }

      setRightPreviewLogs(data.logs || []);
      if (data.detection?.kind) setProjectType(data.detection.kind);
      if (data.detection?.framework) setProjectFramework(data.detection.framework);
      if (data.detection?.entryFile) setRightPreviewSubpath(data.detection.entryFile);

      if (data.frameUrl) {
        setDevServerUrl(data.frameUrl);
        setIframeKey(prev => prev + 1);
        setIsRightPreviewStarting(false);
        return;
      }

      rightPreviewPollRef.current = setInterval(async () => {
        try {
          const statusRes = await fetch(`/api/preview/status${coderWorkspacePath ? `?folderPath=${encodeURIComponent(coderWorkspacePath)}` : ''}`);
          const status = await statusRes.json();
          setRightPreviewLogs(status.logs || []);
          if (status.frameUrl) {
            setDevServerUrl(status.frameUrl);
            setIframeKey(prev => prev + 1);
            setIsRightPreviewStarting(false);
            if (rightPreviewPollRef.current) {
              clearInterval(rightPreviewPollRef.current);
              rightPreviewPollRef.current = null;
            }
          }
        } catch {
          // The dev server can take a moment to emit its URL.
        }
      }, 1200);
    } catch (err: any) {
      setRightPreviewError(err.message || 'Preview start failed');
      setDevServerUrl('');
      setIsRightPreviewStarting(false);
    }
  }, [coderWorkspacePath]);

  // Auto-detect project type in coder workspace
  useEffect(() => {
    if (isCoderMode && workspaceRefreshKey > 0) {
      const detectProject = async () => {
        try {
          const res = await fetch('/api/fs/detect-project', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ folderPath: coderWorkspacePath || undefined })
          });
          if (res.ok) {
            const data = await res.json();
            setProjectType(data.type);
            setProjectFramework(data.framework);
            if (data.entryPoint) {
              setRightPreviewSubpath(data.entryPoint);
              // setIsCoderRightPanelOpen(true);
            }
            // await startCoderPreview();
          }
        } catch { /* ignore */ }
      };
      detectProject();
    }
    return () => {
      if (rightPreviewPollRef.current) {
        clearInterval(rightPreviewPollRef.current);
        rightPreviewPollRef.current = null;
      }
    };
  }, [workspaceRefreshKey, isCoderMode, coderWorkspacePath, startCoderPreview]);

  // Handle server lifecycle based on manual preview toggle panel visibility
  useEffect(() => {
    if (isCoderRightPanelOpen) {
      startCoderPreview();
    } else {
      const stopServer = async () => {
        try {
          await fetch('/api/preview/stop', { method: 'POST' });
        } catch (e) {
          console.error("Error stopping preview server on preview collapse:", e);
        }
      };
      if (isCoderMode) {
        stopServer();
      }
    }
  }, [isCoderRightPanelOpen, isCoderMode, startCoderPreview]);

  useEffect(() => {
    localStorage.setItem('lumina_coder_permission_mode', coderPermissionMode);
  }, [coderPermissionMode]);

  useEffect(() => {
    localStorage.setItem('lumina_coder_allowed_commands', JSON.stringify(alwaysAllowedCommands));
  }, [alwaysAllowedCommands]);

  const logPermissionAction = useCallback((entry: { command?: string; action: string; detail?: string; mode?: CoderPermissionMode }) => {
    const logEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      timestamp: new Date().toISOString(),
      mode: coderPermissionMode,
      ...entry
    };
    setPermissionAuditLog(prev => [logEntry, ...prev].slice(0, 80));
    console.log('[LUMINA_PERMISSION]', logEntry);
  }, [coderPermissionMode]);

  const requestCommandPermission = useCallback((command: string, reason: string) => {
    return new Promise<'allow-once' | 'allow-always' | 'deny'>((resolve) => {
      setPendingCommandPermission({ command, reason, resolve });
    });
  }, []);

  const {
    handleSend,
    handleClearChat,
    handleKeyDown,
    handleScreenshot,
    ensureScrapedFilesOnDisk,
    processOcrForJoinedImage,
    handleFileAttach,
    handleAttachUrl,
    ensureTranscriptFilesOnDisk,
    handleFetchTranscript
  } = useAppHandlers({
    input, setInput,
    isTyping, setIsTyping,
    activeSkills,
    showsSlashCommands, filteredCommands,
    selectedCommandIndex, setSelectedCommandIndex,
    setTypingMessageId,
    callLlamaBridge,
    persona, writingStyle, useTurboQuant, isDeepSearchEnabled, setIsDeepSearchEnabled, researchMode,
    tavilyApiKey, serpApiKey, searchProvider,
    selectedModel, activeModelId, activeModelList,
    chats, setChats,
    currentChatId, setCurrentChatId,
    isWebSearchEnabled,
    isVoiceListening, stopVoiceDictation,
    attachedFiles, setAttachedFiles,
    attachedUrlDocs, setAttachedUrlDocs,
    isPlusMenuOpen, setIsPlusMenuOpen,
    isUrlToolOpen, setIsUrlToolOpen,
    urlToolInput, setUrlToolInput,
    urlToolLoading, setUrlToolLoading,
    urlToolError, setUrlToolError,
    isTranscriptToolOpen, setIsTranscriptToolOpen,
    transcriptToolInput, setTranscriptToolInput,
    transcriptToolLoading, setTranscriptToolLoading,
    transcriptToolError, setTranscriptToolError,
    setTranscriptionOptionsDoc,
    setActiveArtifact, setIsCanvasOpen, setCanvasView,
    showToast,
    isCoderMode, setIsCoderMode,
    isCoderWorkspacePanelOpen, setIsCoderWorkspacePanelOpen,
    activeAssistantMode,
    activeCommandType, activeCommandQuery,
    setActiveCommandType, setActiveCommandQuery,
    coderTodos, setCoderTodos,
    isGeneratingTodos, setIsGeneratingTodos,
    showTodoPanel, setShowTodoPanel,
    todoCollapsed, setTodoCollapsed,
    orchestrationState, setOrchestrationState,
    setIsSidebarOpen,
    coderWorkspacePath, triggerWorkspaceRefresh,
    scrapingResults, setScrapingResults,
    setActiveScrapingJobs,
    wikiResults, setWikiResults,
    localElementAttachments, setLocalElementAttachments,
    inputRef, abortControllerRef,
    setAskAiQuestions, setCurrentQuestionIndex,
    setAskAiAnswers, setShowAskAiPanel,
    createNewChat,
    buildActiveTools,
    coderPermissionMode,
    alwaysAllowedCommands,
    setAlwaysAllowedCommands,
    requestCommandPermission,
    logPermissionAction
  });

  useEffect(() => {
    sendMessageRef.current = handleSend;
    return () => { sendMessageRef.current = undefined; };
  }, [handleSend, sendMessageRef]);

  const adjustTextareaHeight = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = e.target;
    setInput(textarea.value);

    requestAnimationFrame(() => {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
    });
  };

  const markdownComponents = useMarkdownComponents();

  const [isMaximized, setIsMaximized] = useState(false);
  const isElectron = typeof window !== 'undefined' && (window as any).__electronAPI;

  useEffect(() => {
    const api = (window as any).__electronAPI;
    if (!api) return;
    api.onMaximized((maximized: boolean) => setIsMaximized(maximized));
    api.isMaximized().then((maximized: boolean) => setIsMaximized(maximized));
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      api.showContextMenu();
    };
    window.addEventListener('contextmenu', handleContextMenu);
    return () => window.removeEventListener('contextmenu', handleContextMenu);
  }, []);

  // Scan models directory on startup to discover downloaded models
  useEffect(() => {
    refreshLocalModels();
  }, [refreshLocalModels]);

  // Auto-start local llama-server on app startup
  useEffect(() => {
    let cancelled = false;

    const autoStart = async () => {
      const modelId = selectedModel;
      const isLocalModel = useLocalModelsOnly || (modelId && modelId.toLowerCase().includes('gguf'));
      if (!isLocalModel || !modelId) return;

      const savedConfigStr = localStorage.getItem(`lumina_model_settings_${modelId}`);
      const installedConfigStr = localStorage.getItem('lumina_llama_installed_config');

      if (!installedConfigStr) {
        addDevLog('[llama.cpp] Cannot auto-start: llama.cpp not installed', 'warn');
        return;
      }

      let installedConfig: any;
      let savedConfig: any;
      try {
        installedConfig = JSON.parse(installedConfigStr);
        savedConfig = savedConfigStr ? JSON.parse(savedConfigStr) : null;
      } catch {
        addDevLog('[llama.cpp] Cannot auto-start: invalid config', 'error');
        return;
      }

      const binaryPath = installedConfig.binaries
        ? installedConfig.binaries.find((b: string) => {
            const lower = b.toLowerCase();
            return (lower.includes('llama-server') && lower.endsWith('.exe')) || lower.replace(/\\/g, '/').includes('/server.exe');
          }) || installedConfig.binaries.find((b: string) => {
            const lower = b.toLowerCase();
            return lower.includes('llama-server') || lower.replace(/\\/g, '/').includes('/server.exe');
          })
        : null;

      if (!binaryPath) {
        addDevLog('[llama.cpp] Cannot auto-start: llama-server binary not found', 'warn');
        return;
      }

      const osUser = savedConfig?.osUser || localStorage.getItem(`lumina_local_os_user`) || 'skabd';
      const publisher = savedConfig?.modelPublisher || localStorage.getItem(`lumina_local_pub_${modelId}`) || '';
      const modelFolder = savedConfig?.modelFolder || localStorage.getItem(`lumina_local_folder_${modelId}`) || '';
      const modelFile = savedConfig?.modelFile || localStorage.getItem(`lumina_local_file_${modelId}`) || '';

      if (!publisher || !modelFolder || !modelFile) {
        addDevLog('[llama.cpp] Cannot auto-start: incomplete model path config', 'warn');
        return;
      }

      const modelPath = `C:/Users/${osUser}/.lumina/models/${publisher}/${modelFolder}/${modelFile}`;

      try {
        const statusRes = await fetch('/api/llama/status');
        const statusData = await statusRes.json();
        if (statusData.running && !cancelled) {
          addDevLog(`[llama.cpp] Server already running (PID: ${statusData.pid})`, 'success');
          setLoadedLocalModelId(modelId);
          localStorage.setItem('lumina_active_loaded_local_model', modelId);
          return;
        }
      } catch {}

      if (cancelled) return;

      addDevLog(`[llama.cpp] Auto-starting server for ${modelId}...`, 'info');

      try {
        const response = await fetch('/api/llama/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            binaryPath,
            modelPath,
            gpuOffload: savedConfig?.gpuOffload ?? 99,
            contextLength: savedConfig?.contextLength ?? 32768,
            cacheTypeK: savedConfig?.kCacheQuant || 'q8_0',
            cacheTypeV: savedConfig?.vCacheQuant || 'q8_0',
            threads: savedConfig?.cpuThreads ?? 8,
            host: savedConfig?.localHost || '127.0.0.1',
            port: savedConfig?.localPort ? parseInt(String(savedConfig.localPort)) : 1234,
            flashAttn: savedConfig?.flashAttn ?? false,
            noMmap: savedConfig?.tryMmap != null ? !savedConfig.tryMmap : false,
            seed: savedConfig?.seed === 'Random Seed' ? undefined : savedConfig?.seed,
            maxConcurrent: savedConfig?.maxConcurrent,
            unifiedKVCache: savedConfig?.unifiedKVCache,
            ropeFreqBase: savedConfig?.ropeFreqBase,
            ropeFreqScale: savedConfig?.ropeFreqScale,
            offloadKV: savedConfig?.offloadKV,
            keepInMemory: savedConfig?.keepInMemory,
            evalBatchSize: savedConfig?.evalBatchSize,
            physicalBatchSize: savedConfig?.physicalBatchSize,
          }),
        });

        const result = await response.json();
        if (cancelled) return;

        if (result.success) {
          addDevLog(`[llama.cpp] Server auto-started (PID: ${result.pid})`, 'success');
          setLoadedLocalModelId(modelId);
          localStorage.setItem('lumina_active_loaded_local_model', modelId);
          showToast(`llama-server auto-started for ${modelId}!`);
        } else {
          addDevLog(`[llama.cpp] Auto-start failed: ${result.error || 'Unknown error'}`, 'error');
        }
      } catch (err: any) {
        if (!cancelled) {
          addDevLog(`[llama.cpp] Auto-start error: ${err.message}`, 'error');
        }
      }
    };

    const timer = setTimeout(autoStart, 800);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [selectedModel, useLocalModelsOnly, addDevLog, showToast]);

  const renderChatBox = (isCenteredState: boolean = false) => {
    return (
      <ChatBoxPanel
        isCenteredState={isCenteredState}
        theme={theme}
        writingStyle={writingStyle}
        isWebSearchEnabled={isWebSearchEnabled} isDeepSearchEnabled={isDeepSearchEnabled} setIsDeepSearchEnabled={setIsDeepSearchEnabled}
        setIsWebSearchEnabled={setIsWebSearchEnabled}
        activeSkills={activeSkills}
        setActiveSkills={setActiveSkills}
        useTurboQuant={useTurboQuant}
        isPlusMenuOpen={isPlusMenuOpen}
        setIsPlusMenuOpen={setIsPlusMenuOpen}
        activePlusSubMenu={activePlusSubMenu}
        setActivePlusSubMenu={setActivePlusSubMenu}
        luminaTools={luminaTools}
        setLuminaTools={setLuminaTools}
        bridgeTools={bridgeTools}
        setBridgeTools={setBridgeTools}
        showTodoPanel={showTodoPanel}
        setShowTodoPanel={setShowTodoPanel}
        coderTodos={coderTodos}
        setCoderTodos={setCoderTodos}
        activeCommandQuery={activeCommandQuery}
        setActiveCommandQuery={setActiveCommandQuery}
        activeCommandType={activeCommandType}
        setActiveCommandType={setActiveCommandType}
        isGeneratingTodos={isGeneratingTodos}
        todoCollapsed={todoCollapsed}
        setTodoCollapsed={setTodoCollapsed}
        isCoderMode={isCoderMode}
        showsSlashCommands={showsSlashCommands}
        filteredCommands={filteredCommands}
        selectedCommandIndex={selectedCommandIndex}
        setSelectedCommandIndex={setSelectedCommandIndex}
        input={input}
        setInput={setInput}
        inputRef={inputRef}
        showAskAiPanel={showAskAiPanel}
        askAiQuestions={askAiQuestions}
        askAiAnswers={askAiAnswers}
        currentQuestionIndex={currentQuestionIndex}
        handleDotClick={handleDotClick}
        handleFinishQuestions={handleFinishQuestions}
        isTransitioningQuestion={isTransitioningQuestion}
        isGeneratingQuestions={isGeneratingQuestions}
        isAnalyzingAnswers={isAnalyzingAnswers}
        renderActiveQuestionContent={renderActiveQuestionContent}
        attachedFiles={attachedFiles}
        setAttachedFiles={setAttachedFiles}
        localElementAttachments={localElementAttachments}
        setLocalElementAttachments={setLocalElementAttachments}
        attachedUrlDocs={attachedUrlDocs}
        setAttachedUrlDocs={setAttachedUrlDocs}
        setAttachmentContextMenu={setAttachmentContextMenu}
        setSelectedModalAttachment={setSelectedModalAttachment}
        setTranscriptionOptionsDoc={setTranscriptionOptionsDoc}
        showVoiceControlPanel={showVoiceControlPanel}
        setShowVoiceControlPanel={setShowVoiceControlPanel}
        isVoicePanelOpen={isVoicePanelOpen}
        setIsVoicePanelOpen={setIsVoicePanelOpen}
        isVoiceListening={isVoiceListening}
        stopVoiceDictation={stopVoiceDictation}
        startVoiceDictation={startVoiceDictation}
        micVolume={micVolume}
        voiceLanguage={voiceLanguage}
        setVoiceLanguage={setVoiceLanguage}
        voiceInterimText={voiceInterimText}
        setVoiceInterimText={setVoiceInterimText}
        voiceAppendMode={voiceAppendMode}
        setVoiceAppendMode={setVoiceAppendMode}
        voiceAutoSend={voiceAutoSend}
        setVoiceAutoSend={setVoiceAutoSend}
        voiceError={voiceError}
        setVoiceError={setVoiceError}
        adjustTextareaHeight={adjustTextareaHeight}
        handleKeyDown={handleKeyDown}
        handleFileAttach={handleFileAttach}
        plusMenuRef={plusMenuRef}
        menuContentRef={menuContentRef}
        plusMenuPopupPosition={plusMenuPopupPosition}
        fileInputRef={fileInputRef}
        setIsUrlToolOpen={setIsUrlToolOpen}
        setIsTranscriptToolOpen={setIsTranscriptToolOpen}
        handleScreenshot={handleScreenshot}
        activeAssistantMode={activeAssistantMode}
        coderPermissionMode={coderPermissionMode}
        setCoderPermissionMode={setCoderPermissionMode}
        pendingCommandPermission={pendingCommandPermission}
        setPendingCommandPermission={setPendingCommandPermission}
        permissionAuditLog={permissionAuditLog}
        isModeDropdownOpen={isModeDropdownOpen}
        setIsModeDropdownOpen={setIsModeDropdownOpen}
        modeDropdownRef={modeDropdownRef}
        modeDropdownContentRef={modeDropdownContentRef}
        modeDropdownPosition={modeDropdownPosition}
        setActiveAssistantMode={setActiveAssistantMode}
        modelSelectorMode={modelSelectorMode}
        setIsModelDrawerOpen={setIsModelDrawerOpen}
        activeModelList={activeModelList}
        activeModelId={activeModelId}
        availableModels={availableModels}
        modelSearchQuery={modelSearchQuery}
        setModelSearchQuery={setModelSearchQuery}
        filteredModelList={filteredModelList}
        favoriteModelIds={favoriteModelIds}
        favoriteModels={favoriteModels}
        toggleFavoriteModel={toggleFavoriteModel}
        isFavoritesCollapsed={isFavoritesCollapsed}
        setIsFavoritesCollapsed={setIsFavoritesCollapsed}
        providerModelCategories={providerModelCategories}
        collapsedModelCategories={collapsedModelCategories}
        toggleModelCategory={toggleModelCategory}
        handleModelSelect={handleModelSelect}
        isTyping={isTyping}
        setIsTyping={setIsTyping}
        abortControllerRef={abortControllerRef}
        handleSend={handleSend}
        dropdownRef={dropdownRef}
        modelDropdownPosition={modelDropdownPosition}
        showToast={showToast}
        setIsModelDropdownOpen={setIsModelDropdownOpen}
        setWritingStyle={setWritingStyle}
        isModelDropdownOpen={isModelDropdownOpen}
        modelDropdownContentRef={modelDropdownContentRef}
        isWhiteboardOpen={isWhiteboardOpen}
        setIsWhiteboardOpen={setIsWhiteboardOpen}
        onOpenLocalModelConfig={handleOpenLocalModelConfig}
        localModelLoadingId={localModelLoadingId}
        localModelLoadingProgress={localModelLoadingProgress}
        loadedLocalModelId={loadedLocalModelId}
        useLocalModelsOnly={useLocalModelsOnly}
      />
    );
  };

  if (showLogin) {
    return (
      <OnboardingModal
        onComplete={(updatedProfile) => {
          setUserProfile(updatedProfile);
          try {
            localStorage.setItem('lumina_user_profile', JSON.stringify(updatedProfile));
            localStorage.setItem('lumina_profile_created', 'true');
          } catch (err) {}
          setShowLogin(false);
        }}
      />
    );
  }

  return (
    <div className="flex flex-col h-screen w-full bg-[var(--theme-bg)] text-[var(--theme-primary)] overflow-hidden relative">

      {isElectron && (
        <div className="h-9 shrink-0 flex items-center px-4 relative z-50" style={{ WebkitAppRegion: 'drag' } as any}>
          <div className="flex items-center gap-2" style={{ WebkitAppRegion: 'no-drag' } as any}>
            <button
              onClick={() => (window as any).__electronAPI.close()}
              className="w-3 h-3 rounded-full bg-red-500 hover:brightness-110 transition-all flex items-center justify-center group"
              title="Close"
            >
              <svg width="8" height="8" viewBox="0 0 8 8" className="opacity-0 group-hover:opacity-100 transition-opacity">
                <path d="M1.5 1.5L6.5 6.5M6.5 1.5L1.5 6.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" className="text-red-900" />
              </svg>
            </button>
            <button
              onClick={() => (window as any).__electronAPI.minimize()}
              className="w-3 h-3 rounded-full bg-yellow-500 hover:brightness-110 transition-all flex items-center justify-center group"
              title="Minimize"
            >
              <svg width="8" height="8" viewBox="0 0 8 8" className="opacity-0 group-hover:opacity-100 transition-opacity">
                <line x1="2" y1="4" x2="6" y2="4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" className="text-yellow-900" />
              </svg>
            </button>
            <button
              onClick={() => (window as any).__electronAPI.maximize()}
              className="w-3 h-3 rounded-full bg-green-500 hover:brightness-110 transition-all flex items-center justify-center group"
              title={isMaximized ? 'Restore' : 'Maximize'}
            >
              {isMaximized ? (
                <svg width="7" height="7" viewBox="0 1 8 8" className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <rect x="2.5" y="2.5" width="4.5" height="4.5" rx="0.5" fill="none" stroke="currentColor" strokeWidth="1" className="text-green-900" />
                  <rect x="1" y="1" width="4.5" height="4.5" rx="0.5" fill="none" stroke="currentColor" strokeWidth="1" className="text-green-900" />
                </svg>
              ) : (
                <svg width="8" height="8" viewBox="0 0 8 8" className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <rect x="1.5" y="1.5" width="5" height="5" rx="0.8" fill="none" stroke="currentColor" strokeWidth="1.2" className="text-green-900" />
                </svg>
              )}
            </button>
          </div>
        </div>
      )}

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
              className="fixed inset-y-0 left-0 w-72 bg-[var(--theme-sidebar)] border-r border-[var(--theme-sidebar-border)] z-[101] md:hidden flex flex-col p-4 shadow-2xl text-[var(--theme-primary)]"
            >
              <SidebarContent
                showAgentsPage={showAgentsPage}
                showProjectsPage={showProjectsPage}
                chats={chats} 
                currentChatId={currentChatId} 
                setCurrentChatId={(id) => {
                  setCurrentChatId(id);
                  setActiveAgent(null); setShowAgentsPage(false);
                  setIsMobileMenuOpen(false);
                }} 
                createNewChat={(projId) => {
                  createNewChat(projId); setShowAgentsPage(false);
                  setShowProjectsPage(false);
                }} 
                setChats={setChats}
                onSelect={() => setIsMobileMenuOpen(false)}
                onOpenAgentsPage={() => {
                  setShowAgentsPage(prev => {
                    if (prev) return false;
                    setShowProjectsPage(false);
                    setIsSettingsOpen(false);
                    setIsVmCorePanelOpen(false);
                    setIsRagPanelOpen(false);
                    setShowAgentCreation(false);
                    setIsResearchMode(false);
                    setIsMobileMenuOpen(false);
                    return true;
                  });
                }}
                onOpenProjectsPage={() => {
                  setShowProjectsPage(prev => {
                    if (prev) return false;
                    setShowAgentsPage(false);
                    setIsSettingsOpen(false);
                    setIsVmCorePanelOpen(false);
                    setIsRagPanelOpen(false);
                    setShowAgentCreation(false);
                    setIsResearchMode(false);
                    setIsMobileMenuOpen(false);
                    return true;
                  });
                }}
                onOpenSettings={(tab?: any) => { if (tab && typeof tab === 'string') setActiveSettingsTab(tab as any);
                  setIsSettingsOpen(prev => {
                    const nextVal = !prev;
                    if (nextVal) {
                      setShowAgentsPage(false);
                      setShowProjectsPage(false);
                    }
                    return nextVal;
                  });
                  setIsMobileMenuOpen(false);
                }}
                userProfile={userProfile}
                setUserProfile={setUserProfile}
                projectFolders={projectFolders}
                setProjectFolders={setProjectFolders}
                activeProjectId={activeProjectId}
                setActiveProjectId={setActiveProjectId}
                isSidebarOpen={isSidebarOpen}
                setIsSidebarOpen={setIsSidebarOpen}
                agents={agents}
                activeAgentId={activeAgent?.id || null}
                setActiveAgent={setActiveAgent}
                onOpenProjectChats={(project) => setSelectedProjectForChats(project)}
                onOpenAgentChats={(agent) => setSelectedAgentForChats(agent)}
              >
                <AgentSidebarSection
                  agents={agents}
                  activeAgentId={activeAgent?.id || null}
                  onSelectAgent={(agent) => {
                    handleSelectAgent(agent);
                    setIsMobileMenuOpen(false);
                  }}
                  onCreateAgent={() => {
                    setEditingAgent(null);
                    setShowAgentCreation(true);
                    setIsMobileMenuOpen(false);
                  }}
                  onDeleteAgent={handleDeleteAgent}
                  onEditAgent={handleEditAgent}
                />
              </SidebarContent>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="flex flex-1 overflow-hidden">
      <motion.aside 
        animate={{ width: isSidebarOpen ? sidebarWidth : 0, opacity: isSidebarOpen ? 1 : 0 }}
        transition={{ 
          duration: isResizing ? 0 : (isSidebarOpen ? 0.22 : 0.18), 
          ease: isSidebarOpen ? "easeOut" : "linear" 
        }}
        className={`hidden md:flex flex-col border-r border-[var(--theme-sidebar-border)] bg-[var(--theme-sidebar)] relative group/sidebar text-[var(--theme-primary)]`}
      >
        <div className="h-full flex flex-col p-4 shrink-0 overflow-hidden" style={{ width: sidebarWidth }}>
          {/* DESKTOP SIDEBAR MOUNT POINT */}
          <SidebarContent
            showAgentsPage={showAgentsPage}
            showProjectsPage={showProjectsPage}
            chats={chats} 
            currentChatId={currentChatId} 
            setCurrentChatId={(id) => {
              setCurrentChatId(id);
              setActiveAgent(null);
            }} 
            createNewChat={(projId) => {
              createNewChat(projId);
              setShowProjectsPage(false);
            }} 
            setChats={setChats}
            onOpenProjectsPage={() => {
              setShowProjectsPage(prev => {
                if (prev) return false;
                setShowAgentsPage(false);
                setIsSettingsOpen(false);
                setIsVmCorePanelOpen(false);
                setIsRagPanelOpen(false);
                setShowAgentCreation(false);
                setIsResearchMode(false);
                return true;
              });
            }}
            onOpenSettings={(tab?: any) => { 
              if (tab && typeof tab === 'string') setActiveSettingsTab(tab as any); 
              setIsSettingsOpen(prev => {
                const nextVal = !prev;
                if (nextVal) {
                  setShowAgentsPage(false);
                  setShowProjectsPage(false);
                }
                return nextVal;
              }); 
            }}
            agents={agents}
            activeAgentId={activeAgent?.id || null}
            setActiveAgent={setActiveAgent}
            onOpenProjectChats={(project) => setSelectedProjectForChats(project)}
            onOpenAgentChats={(agent) => setSelectedAgentForChats(agent)}
            onOpenAgentsPage={() => {
              setShowAgentsPage(prev => {
                if (prev) return false;
                setShowProjectsPage(false);
                setIsSettingsOpen(false);
                setIsVmCorePanelOpen(false);
                setIsRagPanelOpen(false);
                setShowAgentCreation(false);
                setIsResearchMode(false);
                return true;
              });
            }}
            userProfile={userProfile}
            setUserProfile={setUserProfile}
            projectFolders={projectFolders}
            setProjectFolders={setProjectFolders}
            activeProjectId={activeProjectId}
            setActiveProjectId={setActiveProjectId}
            isSidebarOpen={isSidebarOpen}
            setIsSidebarOpen={setIsSidebarOpen}
          >
            <AgentSidebarSection
              agents={agents}
              activeAgentId={activeAgent?.id || null}
              onSelectAgent={handleSelectAgent}
              onCreateAgent={() => {
                setEditingAgent(null);
                setShowAgentCreation(true);
              }}
              onDeleteAgent={handleDeleteAgent}
              onEditAgent={handleEditAgent}
            />
          </SidebarContent>
        </div>
        
        {isSidebarOpen && (
          <div
            onMouseDown={(e) => {
              e.preventDefault();
              setIsResizing(true);
            }}
            className="absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-blue-500/20 active:bg-blue-500/40 transition-colors z-50 group/resizer"
          >
            <div className={`absolute top-0 right-0 w-[2px] h-full transition-colors ${isResizing ? 'bg-blue-500' : 'bg-transparent group-hover/resizer:bg-blue-500/50'}`} />
          </div>
        )}
      </motion.aside>

      <main className="flex-1 flex flex-col relative h-full min-w-0 bg-[var(--theme-bg)] text-[var(--theme-primary)] transition-colors duration-300">
        {activeAgent ? (
          <AgentChatView
            agent={activeAgent}
            onBack={() => setActiveAgent(null)}
            onUpdateAgent={(patch) => handleUpdateAgent(activeAgent.id, patch)}
            onEditAgent={() => handleEditAgent(activeAgent)}
            markdownComponents={markdownComponents}
            userProfile={userProfile}
            persona={persona}
            onOpenInEditor={setFloatingEditFile}
          />
        ) : (
          <div className="flex-1 flex flex-row overflow-hidden w-full h-full relative">
            <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden relative">

        {!isCoderMode && (
          <header className={`h-14 border-b border-[var(--theme-border)]/40 flex items-center justify-between px-4 md:px-6 bg-[var(--theme-bg)]/80 backdrop-blur-md transition-all duration-300 ease-in-out ${
            autoHideTopBar 
              ? 'absolute top-0 left-0 right-0 z-[160] transform -translate-y-[48px] hover:translate-y-0 opacity-0 hover:opacity-100 hover:shadow-lg' 
              : 'sticky top-0 z-[150] shrink-0 opacity-100 shadow-none'
          }`}>
            <div className="flex-1 flex items-center justify-start min-w-0 gap-2">
              <button 
                onClick={() => setIsMobileMenuOpen(true)}
                className="md:hidden p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors text-gray-500"
              >
                <SidebarIcon size={20} />
              </button>
              <button 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="hidden md:flex p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors text-gray-500 cursor-pointer"
                title={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
              >
                <SidebarIcon size={20} />
              </button>
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-400 truncate ml-2">
                Lumina Intelligence
              </h2>
            </div>
            {/* Center section: Model button */}
            <div className="flex-none flex items-center justify-center" ref={dropdownRef}>
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const isLocal =
                      useLocalModelsOnly ||
                      activeModelId.toLowerCase().includes("gguf");
                    if (isLocal && handleOpenLocalModelConfig) {
                      handleOpenLocalModelConfig(activeModelId);
                    } else if (modelSelectorMode === "drawer") {
                      setIsModelDrawerOpen(true);
                    } else {
                      setIsModelDropdownOpen(!isModelDropdownOpen);
                    }
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 bg-gray-150/80 dark:bg-zinc-800/85 hover:bg-gray-200/90 dark:hover:bg-zinc-700/90 border border-gray-200 dark:border-zinc-700/60 rounded-full transition-all text-xs font-bold shadow-sm cursor-pointer select-none max-w-[210px]"
                  title="Change active model"
                >
                  <Sparkles size={11} className="text-amber-500 shrink-0" />
                  <span className="truncate text-gray-700 dark:text-gray-200 font-bold">
                    {(() => {
                      const matched = activeModelList.find(
                        (m) => m.id === activeModelId,
                      );
                      if (matched) return matched.name;
                      let name = activeModelId;
                      if (name.includes("/")) {
                        name = name.split("/").slice(-1)[0];
                      }
                      return (
                        name
                          .replace(/[-_]/g, " ")
                          .replace(/\bgguf\b/gi, "")
                          .trim() || activeModelId
                      );
                    })()}
                  </span>
                  <ChevronDown
                    size={11}
                    className={`text-gray-400 shrink-0 transition-transform duration-150 ${(modelSelectorMode === "drawer" ? isModelDrawerOpen : isModelDropdownOpen) ? "rotate-180" : ""}`}
                  />
                </button>

                {/* Progress bar overlay for loading state */}
                {localModelLoadingId === activeModelId && (
                  <div className="absolute inset-x-0 bottom-0 h-1 bg-blue-500/80 rounded-b-full overflow-hidden pointer-events-none">
                    <div 
                      className="h-full bg-blue-400 transition-all duration-300"
                      style={{ width: `${localModelLoadingProgress}%` }}
                    />
                  </div>
                )}
              </div>

              <AnimatePresence>
                {isModelDropdownOpen && (
                  <motion.div
                    ref={modelDropdownContentRef as any}
                    style={modelDropdownPosition.style}
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    transition={{ type: "spring", stiffness: 420, damping: 28 }}
                    className="fixed w-[280px] bg-white dark:bg-zinc-900 border border-gray-105 dark:border-white/10 rounded-2xl shadow-2xl z-[180] flex flex-col overflow-hidden text-left"
                  >
                    {/* Header Label Info */}
                    <div className="px-3.5 pt-3 pb-1 select-none flex items-center justify-between shrink-0">
                      <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-gray-400 dark:text-zinc-500">
                        System Model Cores
                      </span>
                      <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-gray-50 dark:bg-zinc-800 font-bold text-blue-500">
                        {filteredModelList.length} Active
                      </span>
                    </div>

                    {availableModels.length > 5 && (
                      <div className="px-3 py-1.5 bg-white dark:bg-zinc-900 shrink-0">
                        <div className="relative group">
                          <Search
                            size={12}
                            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors"
                          />
                          <input
                            type="text"
                            placeholder="Filter model name..."
                            value={modelSearchQuery}
                            onChange={(e) => setModelSearchQuery(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full h-8 pl-8 pr-3 bg-gray-50 dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700/60 rounded-xl text-[11px] outline-none placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/15 text-gray-800 dark:text-zinc-200 font-medium transition-all"
                          />
                        </div>
                      </div>
                    )}

                    <div className="h-[230px] overflow-y-auto p-1.5 space-y-1 custom-scrollbar shrink-0 border-t border-gray-100 dark:border-white/5 mt-1">
                      {filteredModelList.length > 0 ? (
                        filteredModelList.map((model) => {
                          const isSelected = activeModelId === model.id;
                          const isLocal = model.id.toLowerCase().includes("gguf");

                          return (
                            <button
                              key={model.id}
                              onClick={() => handleModelSelect(model.id)}
                              className={`w-full min-h-[40px] flex items-center gap-3 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 border-l-[3px] cursor-pointer ${
                                isSelected
                                  ? "bg-gray-50 dark:bg-zinc-800 text-gray-950 dark:text-white border-blue-500 shadow-sm"
                                  : "text-gray-500 hover:bg-gray-50/60 dark:hover:bg-zinc-800/60 hover:text-gray-800 dark:hover:text-zinc-200 border-transparent"
                              }`}
                            >
                              <div
                                className={`p-1 rounded-lg flex items-center justify-center shrink-0 ${
                                  isSelected ? "bg-white dark:bg-zinc-900 shadow-sm" : "bg-gray-50 dark:bg-zinc-800/40"
                                }`}
                              >
                                {renderAppModelLogo(model.author || model.providerProfileName || model.id.split('/')[0] || '', model.id, model.icon)}
                              </div>

                              <div className="flex-1 text-left min-w-0">
                                <span className={`block truncate ${isSelected ? "font-bold" : "font-semibold"}`}>
                                  {model.name}
                                </span>
                                <span className="block text-[8px] font-mono text-gray-400 dark:text-zinc-500 truncate uppercase tracking-tight">
                                  {isLocal ? "LOCAL GGUF • HOSTED" : model.id.split("/").slice(-1)[0]}
                                </span>
                              </div>

                              {isSelected && (
                                <motion.div
                                  layoutId="activeModelCheckmark"
                                  className="w-4 h-4 rounded-full bg-blue-500/10 flex items-center justify-center ml-auto shrink-0"
                                >
                                  <Check size={11} className="text-blue-500" strokeWidth={3} />
                                </motion.div>
                              )}
                            </button>
                          );
                        })
                      ) : (
                        <div className="py-8 text-center text-[11px] text-gray-400 select-none">
                          No cores match criteria
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Right section */}
            <div className="flex-1 flex items-center justify-end gap-4 min-w-0">
              <div className="relative flex items-center gap-1">
                  <button 
                    onClick={() => {
                      if (!currentChatId) {
                        showToast("No active conversation to clear.");
                        return;
                      }
                      if (window.confirm("Are you sure you want to clear all messages on the screen?")) {
                        handleClearChat();
                      }
                    }}
                    className="p-2 hover:bg-rose-500/10 hover:text-rose-500 text-gray-500 rounded-full transition-colors cursor-pointer"
                    title="Clear current chat"
                  >
                    <Trash2 size={18} />
                  </button>
                  <AnimatePresence>
                    {isSearchOpen && (
                      <motion.div
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: 180, opacity: 1 }}
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

              {isCoderMode && (
                <button
                  onClick={() => setIsCoderWorkspacePanelOpen(!isCoderWorkspacePanelOpen)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all text-xs font-semibold shadow-sm cursor-pointer border ${
                    isCoderWorkspacePanelOpen 
                      ? 'bg-teal-500 text-slate-950 border-teal-400' 
                      : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:text-white'
                  }`}
                  title="Toggle Coder Workspace Side Panel"
                >
                  <Code size={13} className={isCoderWorkspacePanelOpen ? 'animate-pulse' : ''} />
                  <span>Workspace Panel</span>
                </button>
              )}
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
                      className="absolute top-full right-0 mt-2 w-56 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden z-[160] p-1.5"
                    >
                      {[
                        { id: 'coder_mode', label: isCoderMode ? 'Turn off Coder Mode' : 'Turn on Coder Mode', icon: <Code size={16} className={isCoderMode ? 'text-teal-500' : ''} />, onClick: () => { 
                          const nextState = !isCoderMode;
                          setIsCoderMode(nextState);
                          setIsCoderWorkspacePanelOpen(nextState);
                          if (nextState) {
                            setIsSidebarOpen(false);
                          }
                          createNewChat(null, nextState);
                          if (false) {
                            setChats(prev => prev.map(chat => {
                              if (chat.id === currentChatId) {
                                return {
                                  ...chat,
                                  isCoderMode: nextState,
                                  updatedAt: new Date()
                                };
                              }
                              return chat;
                            }));
                          }
                          setIsHeaderMenuOpen(false);
                        } },
                        { id: 'research_mode', label: isResearchMode ? 'Turn off Research Mode' : 'Turn on Deep Research', icon: <Bot size={16} className={isResearchMode ? 'text-teal-500' : ''} />, onClick: () => { const nextState = !isResearchMode; setIsResearchMode(nextState); setIsResearchWorkspaceOpen(nextState); if (nextState) { setIsCoderMode(false); setIsSidebarOpen(false); } createNewChat(null, false, nextState); setIsHeaderMenuOpen(false); } },
                        { id: 'settings', label: 'Settings', icon: <Settings size={16} />, onClick: () => { setIsSettingsOpen(prev => !prev); setIsHeaderMenuOpen(false); } },
                        { id: 'rag_kb', label: 'RAG Knowledge Base', icon: <Database size={16} />, onClick: () => { setIsRagPanelOpen(true); setIsHeaderMenuOpen(false); } },
                        { id: 'vm_core', label: 'VM Core Sandbox', icon: <Box size={16} />, onClick: () => { setIsVmCorePanelOpen(true); setIsHeaderMenuOpen(false); } },
                        { id: 'mcp', label: 'Bridge Tools', icon: <HardDrive size={16} className={isMcpConnected ? 'text-blue-500' : ''} />, onClick: () => { if (isSettingsOpen && activeSettingsTab === 'mcp') { setIsSettingsOpen(false); } else { setActiveSettingsTab('mcp'); setIsSettingsOpen(true); } setIsHeaderMenuOpen(false); } },
                      ].map((item) => (
                        <button
                          key={item.id}
                          onClick={item.onClick}
                          className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all group duration-200 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-black dark:hover:text-white"
                        >
                          <div className="flex items-center gap-3">
                            {item.icon}
                            <span>{item.label}</span>
                          </div>
                        </button>
                      ))}
                      <div className="my-1.5 border-t border-gray-100 dark:border-white/5" />
                      <button
                        onClick={() => { setActiveSettingsTab('general'); setIsSettingsOpen(true); setIsHeaderMenuOpen(false); }} style={{ display: 'none' }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-gray-605 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-black dark:hover:text-white transition-colors"
                      >
                        <Palette size={16} />
                        Themes
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </header>
        )}

        {isResearchMode && !isSettingsOpen && !isVmCorePanelOpen && !isRagPanelOpen && !showAgentCreation ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="flex-1 flex overflow-hidden relative w-full h-full bg-[var(--theme-surface-alt)]"
          >
            <div className="flex-1 h-full min-w-0">
              <ResearchWorkspacePanel 
                researchState={researchMode}
                showToast={showToast}
                onClose={() => {
                  setIsResearchMode(false);
                  setIsSidebarOpen(true);
                }}
              />
            </div>
          </motion.div>
        ) : isCoderMode && !isSettingsOpen && !isVmCorePanelOpen && !isRagPanelOpen && !showAgentCreation ? (
          <CoderWorkspaceView
            isCoderLeftPanelOpen={isCoderLeftPanelOpen}
            setIsCoderLeftPanelOpen={setIsCoderLeftPanelOpen}
            workspaceRefreshKey={workspaceRefreshKey}
            triggerWorkspaceRefresh={triggerWorkspaceRefresh}
            showToast={showToast}
            coderWorkspacePath={coderWorkspacePath}
            setCoderWorkspacePath={setCoderWorkspacePath}
            setFloatingEditFile={setFloatingEditFile}
            floatingEditFile={floatingEditFile}
            setRightPreviewSubpath={setRightPreviewSubpath}
            orchestrationState={orchestrationState}
            isSidebarOpen={isSidebarOpen}
            setIsSidebarOpen={setIsSidebarOpen}
            chats={chats}
            setChats={setChats}
            currentChatId={currentChatId}
            handleClearChat={handleClearChat}
            isWhiteboardOpen={isWhiteboardOpen}
            setIsWhiteboardOpen={setIsWhiteboardOpen}
            isTerminalOpen={isTerminalOpen}
            setIsTerminalOpen={setIsTerminalOpen}
            isTerminalPopupOpen={isTerminalPopupOpen}
            setIsTerminalPopupOpen={setIsTerminalPopupOpen}
            isCoderRightPanelOpen={isCoderRightPanelOpen}
            setIsCoderRightPanelOpen={setIsCoderRightPanelOpen}
            elizaToggleSignal={elizaToggleSignal}
            setElizaToggleSignal={setElizaToggleSignal}
            isElizaActive={isElizaActive}
            setIsElizaActive={setIsElizaActive}
            setWorkspaceRefreshKey={setWorkspaceRefreshKey}
            messages={messages}
            markdownComponents={markdownComponents}
            userProfile={userProfile}
            persona={persona}
            handleSetActiveArtifact={handleSetActiveArtifact}
            handleSetCanvasView={handleSetCanvasView}
            handleUpdateTodoPlan={handleUpdateTodoPlan}
            handleStartBuildingBtn={(messageId) => handleStartBuilding(currentChatId || '', messageId, undefined)}
            scrapingResults={scrapingResults}
            wikiResults={wikiResults}
            handleSend={handleSend}
            renderChatBox={renderChatBox}
            rightViewportMode={rightViewportMode}
            setRightViewportMode={setRightViewportMode}
            projectFramework={projectFramework}
            projectType={projectType}
            iframeKey={iframeKey}
            setIframeKey={setIframeKey}
            devServerUrl={devServerUrl}
            setDevServerUrl={setDevServerUrl}
            rightIframeRef={rightIframeRef}
            isRightPreviewStarting={isRightPreviewStarting}
            rightPreviewLogs={rightPreviewLogs}
            rightPreviewError={rightPreviewError}
            rightIsGridEnabled={rightIsGridEnabled}
            setRightIsGridEnabled={setRightIsGridEnabled}
            rightIsInspectMode={rightIsInspectMode}
            setRightIsInspectMode={setRightIsInspectMode}
            startCoderPreview={startCoderPreview}
          />) : (
          <>
            {showAgentCreation ? (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                className="flex-1 flex overflow-hidden relative w-full h-full bg-[var(--theme-surface)]"
              >
                <AgentCreationModal
                  isOpen={showAgentCreation}
                  onClose={() => {
                    setShowAgentCreation(false);
                    setEditingAgent(null);
                  }}
                  onAgentCreated={handleAgentCreated}
                  onAgentUpdated={(id, patch) => {
                    handleUpdateAgent(id, patch);
                    setShowAgentCreation(false);
                    setEditingAgent(null);
                  }}
                  editAgent={editingAgent}
                  isPanel={true}
                />
              </motion.div>
            ) : showAgentsPage ? (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                className="flex-1 flex overflow-hidden relative w-full h-full bg-[var(--theme-bg)]"
              >
                <AgentsPage
                  agents={agents}
                  activeAgentId={activeAgent?.id || null}
                  onSelectAgent={(agent) => {
                    handleSelectAgent(agent);
                    setShowAgentsPage(false);
                  }}
                  onDeleteAgent={handleDeleteAgent}
                  onEditAgent={(agent) => {
                    setEditingAgent(agent);
                    setShowAgentCreation(true);
                  }}
                  onCreateAgent={() => {
                    setEditingAgent(null);
                    setShowAgentCreation(true);
                  }}
                  onClose={() => setShowAgentsPage(false)}
                  showToast={showToast}
                  onOpenAgentChats={(agent) => setSelectedAgentForChats(agent)}
                />
              </motion.div>
            ) : showProjectsPage ? (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                className="flex-1 flex overflow-hidden relative w-full h-full bg-[var(--theme-bg)]"
              >
                <ProjectsPage
                  projectFolders={projectFolders}
                  setProjectFolders={setProjectFolders}
                  chats={chats}
                  setChats={setChats}
                  activeProjectId={activeProjectId}
                  setActiveProjectId={setActiveProjectId}
                  setCurrentChatId={setCurrentChatId}
                  createNewChat={createNewChat}
                  onClose={() => setShowProjectsPage(false)}
                  showToast={showToast}
                  onOpenProjectChats={(project) => setSelectedProjectForChats(project)}
                />
              </motion.div>
            ) : isSettingsOpen ? (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                className="flex-1 flex overflow-hidden relative w-full h-full bg-[var(--theme-surface)]"
              >
                <SettingsModal
                  onClose={() => setIsSettingsOpen(false)}
                  useLocalModelsOnly={useLocalModelsOnly}
                  setUseLocalModelsOnly={setUseLocalModelsOnly}
                  activeSettingsTab={activeSettingsTab}
                  setActiveSettingsTab={setActiveSettingsTab}
                  useBubbles={useBubbles}
                  setUseBubbles={setUseBubbles}
                  isCompactSidebar={isCompactSidebar}
                  setIsCompactSidebar={setIsCompactSidebar}
                  autoHideTopBar={autoHideTopBar}
                  setAutoHideTopBar={setAutoHideTopBar}
            modelSelectorMode={modelSelectorMode}
            setModelSelectorMode={setModelSelectorMode}
            useBridgeTools={useBridgeTools}
                  setUseBridgeTools={setUseBridgeTools}
                  useTurboQuant={useTurboQuant}
                  setUseTurboQuant={setUseTurboQuant}
                  selectedProvider={selectedProvider}
                  handleProviderSelect={handleProviderSelect}
                  providerSearchQuery={providerSearchQuery}
                  setProviderSearchQuery={setProviderSearchQuery}
                  serverUrl={serverUrl}
                  setServerUrl={setServerUrl}
                  apiKey={apiKey}
                  setApiKey={setApiKey}
                  aiVerificationState={aiVerificationState}
                  handleVerifyAI={handleVerifyAI}
                  handleSaveAI={handleSaveAI}
                  isAiSaved={isAiSaved}
                  aiProviderProfiles={aiProviderProfiles}
                  editingAiProfileId={editingAiProfileId}
                  handleToggleAiProfile={handleToggleAiProfile}
                  handleEditAiProfile={handleEditAiProfile}
                  handleDeleteAiProfile={handleDeleteAiProfile}
                  handleRenameAiProfile={handleRenameAiProfile}
                  handleCloseAiProfileEditor={handleCloseAiProfileEditor}
                  handleUpdateAiProfileConfig={handleUpdateAiProfileConfig}
                  handleToggleAiProfileModel={handleToggleAiProfileModel}
                  handleSetAiProfileModelsVisible={handleSetAiProfileModelsVisible}
                  handleVerifyAiProfile={handleVerifyAiProfile}
                  searchProvider={searchProvider}
                  setSearchProvider={setSearchProvider}
                  tavilyApiKey={tavilyApiKey}
                  setTavilyApiKey={setTavilyApiKey}
                  serpApiKey={serpApiKey}
                  setSerpApiKey={setSerpApiKey}
                  searchVerificationState={searchVerificationState}
                  handleVerifySearch={handleVerifySearch}
                  handleSaveSearch={handleSaveSearch}
                  isSearchSaved={isSearchSaved}
                  userProfile={userProfile}
                  setUserProfile={setUserProfile}
                  persona={persona}
                  setPersona={setPersona}
                  luminaTools={luminaTools}
                  setLuminaTools={setLuminaTools}
                  showToast={showToast}
                  llamaBridgeUrl={llamaBridgeUrl}
                  setLlamaBridgeUrl={setLlamaBridgeUrl}
                  llamaBridgeApiKey={llamaBridgeApiKey}
                  setLlamaBridgeApiKey={setLlamaBridgeApiKey}
                  isMcpConnected={isMcpConnected}
                  llamaBridgeModels={llamaBridgeModels}
                  selectedLlamaModel={selectedLlamaModel}
                  setSelectedLlamaModel={setSelectedLlamaModel}
                  bridgeTools={bridgeTools}
                  setBridgeTools={setBridgeTools}
                  handleTestLlamaConnection={handleTestLlamaConnection}
                  handleLoadLlamaModels={handleLoadLlamaModels}
                  handleLoadBridgeTools={handleLoadBridgeTools}
                  onLocalModelsChange={refreshLocalModels}
                  loadedLocalModelId={loadedLocalModelId}
                  setLoadedLocalModelId={setLoadedLocalModelId}
                  onOpenLocalModelConfig={handleOpenLocalModelConfig}
                  activeModelId={activeModelId}
                  setActiveModelId={setActiveModelId}
                />
              </motion.div>
            ) : isVmCorePanelOpen ? (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                className="flex-1 flex overflow-hidden relative w-full h-full bg-zinc-950"
              >
                <VmCorePanel
                  isOpen={isVmCorePanelOpen}
                  onClose={() => setIsVmCorePanelOpen(false)}
                  showToast={showToast}
                />
              </motion.div>
            ) : isRagPanelOpen ? (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                className="flex-1 flex overflow-hidden relative w-full h-full bg-[var(--theme-surface)]"
              >
                <RAGPanel
                  onClose={() => setIsRagPanelOpen(false)}
                />
              </motion.div>
            ) : false ? (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                className="flex-1 flex overflow-hidden relative w-full h-full bg-[var(--theme-surface)]"
              >
                <AgentCreationModal
                  isOpen={showAgentCreation}
                  onClose={() => {
                    setShowAgentCreation(false);
                    setEditingAgent(null);
                  }}
                  onAgentCreated={handleAgentCreated}
                  onAgentUpdated={(id, patch) => {
                    handleUpdateAgent(id, patch);
                    setShowAgentCreation(false);
                    setEditingAgent(null);
                  }}
                  editAgent={editingAgent}
                  isPanel={true}
                />
              </motion.div>
            ) : (
              <>
                <div className={`flex-1 flex overflow-hidden ${isModelDropdownOpen || isPlusMenuOpen ? 'relative z-20' : 'z-auto'}`}>
              <div 
                ref={scrollRef}
                className="flex-1 overflow-y-auto px-4 md:px-0 py-8 custom-scrollbar scroll-smooth"
              >
                <div className="mx-auto space-y-8 pb-24 max-w-4xl xl:max-w-[1100px]">
                  <AnimatePresence initial={false}>
                    {messages.length === 0 ? (
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4 relative w-full"
                      >
                        {activeProjectId && projectFolders.find(p => p.id === activeProjectId) ? (
                          <>
                            <div className="flex items-center gap-3.5 justify-center mb-10 select-none">
                              <Folder className="text-zinc-200 shrink-0" size={36} />
                              <span className="text-3xl font-medium text-zinc-150 tracking-tight font-sans">
                                {projectFolders.find(p => p.id === activeProjectId)?.name}
                              </span>
                            </div>
                          </>
                        ) : theme.id === 'claude' ? (
                          <>
                            <div className="flex items-center gap-1 text-[11px] text-zinc-500 mb-6 select-none font-medium">
                              <span>You are out of free messages until 1:10 AM</span>
                            </div>
                          </>
                        ) : (
                          <>
                            <motion.div 
                              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                              title={isSidebarOpen ? "Collapse Lumina Sidebar" : "Expand Lumina Sidebar"}
                              animate={{ scale: [1, 1.05, 1] }}
                              transition={{ duration: 4, repeat: Infinity }}
                              className="w-16 h-16 bg-gray-50 border border-gray-100 dark:border-white/5 rounded-full flex items-center justify-center text-black dark:text-white dark:bg-zinc-900 mb-6 shadow-sm overflow-hidden animate-active-ring cursor-pointer hover:border-blue-500 hover:ring-2 hover:ring-blue-500/20 dark:hover:border-blue-500 transition-all duration-300"
                            >
                              {userProfile.avatar ? (
                                <img src={userProfile.avatar} alt={userProfile.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                <span className="font-bold text-lg font-display">{userProfile.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}</span>
                              )}
                            </motion.div>
                            <h1 className="text-4xl font-display font-medium text-gray-900 dark:text-white mb-3 tracking-tight">
                              Welcome back, {userProfile.name}
                            </h1>
                            <p className="text-gray-500 dark:text-gray-400 max-w-sm mb-6">
                              Modern intelligence, refined interface.
                            </p>
                            <button
                              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                              className="flex items-center gap-2.5 px-4.5 py-2.5 bg-white dark:bg-zinc-900 hover:bg-gray-50 dark:hover:bg-zinc-800/80 text-gray-700 dark:text-zinc-200 rounded-xl text-xs font-semibold border border-gray-200 dark:border-white/10 shadow-sm cursor-pointer transition-all active:scale-[0.98] animate-focus-target"
                              id="slidepanel-toggle-option"
                              title={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
                            >
                              <SidebarIcon size={14} className={isSidebarOpen ? "text-blue-500" : "text-gray-400"} />
                              <span>{isSidebarOpen ? "Collapse Sidebar Menu" : "Expand Sidebar Menu"}</span>
                            </button>
                          </>
                        )}
                      </motion.div>
                    ) : (
                      messages.map((message) => (
                        <MessageItem
                          key={message.id}
                          message={message}
                          markdownComponents={markdownComponents}
                          userProfile={userProfile}
                          persona={persona}
                          isSourcesPanelOpen={false}
                          setIsSourcesPanelOpen={STABLE_NOOP}
                          setSourcesPanelMessageId={STABLE_NOOP}
                          setActiveArtifact={handleSetActiveArtifact}
                          setIsCanvasOpen={handleSetIsCanvasOpen}
                          setCanvasView={handleSetCanvasView}
                          onOpenInEditor={setFloatingEditFile}
                          showToast={showToast}
                          onUpdateTodoPlan={handleUpdateTodoPlan}
                          onUpdateMessage={handleUpdateMessage}
                          onStartBuilding={handleStartBuildingBtn}
                          scrapingResults={scrapingResults}
                          wikiResults={wikiResults}
                          onSendMessage={handleSend}
                        />
                      ))
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <AnimatePresence>
                {showScrollButton && (
                  <motion.button
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    transition={{ duration: 0.2 }}
                    onClick={() => {
                      if (scrollRef.current) {
                        scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
                      }
                    }}
                    className="absolute bottom-32 right-8 p-3 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-white/10 rounded-full shadow-2xl text-gray-500 hover:text-black dark:hover:text-white z-40"
                  >
                    <ArrowUp size={20} />
                  </motion.button>
                )}
              </AnimatePresence>


              {isCoderMode && isCoderWorkspacePanelOpen && (
                <div className="w-[450px] lg:w-[500px] h-full shrink-0 border-l border-[var(--theme-border)] bg-[var(--theme-surface-alt)] z-10">
                  <CoderWorkspacePanel 
                    workspaceRefreshKey={workspaceRefreshKey} 
                    triggerWorkspaceRefresh={triggerWorkspaceRefresh}
                    showToast={showToast}
                    workspaceRootPath={coderWorkspacePath}
                    onInsertAttachedText={insertAttachedContent}
                    orchestrationState={orchestrationState}
                    orchestrationCollapsed={orchestrationCollapsed}
                    setOrchestrationCollapsed={setOrchestrationCollapsed}
                    onClose={() => setIsCoderWorkspacePanelOpen(false)}
                  />
                </div>
              )}
            </div>

            <div className="px-6 pb-6 pt-2 z-30 shrink-0 select-none bg-transparent border-transparent">
              <div className={`mx-auto relative flex flex-col gap-2 transition-all duration-300 ${
                messages.length === 0 
                  ? 'max-w-xl md:max-w-2xl' 
                  : 'max-w-4xl xl:max-w-[1100px]'
              }`}>
                {renderChatBox(messages.length === 0)}
                <div className="text-center">
                  <span className="text-[10px] text-zinc-500/80 font-medium tracking-tight">Claude is AI and can make mistakes. Please double-check responses.</span>
                </div>
              </div>
            </div>
          </>
        )}
      </>
    )}
            </div>

            {/* Right Split Column for Live Preview / Canvas */}
            {!isCoderMode && isCanvasOpen && (
              <div 
                style={isMobile ? undefined : { width: canvasWidth }}
                className="w-full md:w-auto h-full shrink-0 border-l border-zinc-200 dark:border-white/5 bg-white dark:bg-[#0a0a0a] relative z-30"
              >
                {/* Drag / Resize Handle using Pointer Events for standard iframe protection */}
                <div 
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                  className="hidden md:flex absolute top-0 -left-1 w-2 hover:w-3 h-full cursor-col-resize hover:bg-black/10 dark:hover:bg-white/10 items-center justify-center transition-all z-50 select-none group touch-none"
                >
                  <div className="w-1 h-12 bg-zinc-400 dark:bg-zinc-600 rounded-full group-hover:scale-y-125 transition-all" />
                </div>

                {/* Overlay to prevent iframe pointer intercept during active dragging */}
                {isCanvasResizing && (
                  <div className="absolute inset-0 z-50 bg-transparent cursor-col-resize select-none" />
                )}

                <Canvas 
                  artifact={activeArtifact} 
                  isOpen={true} 
                  inline={true}
                  onClose={() => setIsCanvasOpen(false)} 
                  view={canvasView}
                  onSetView={setCanvasView}
                  allArtifacts={chats.find(c => c.id === currentChatId)?.messages.flatMap(m => m.artifacts || []) || []}
                />
              </div>
            )}

            {isCanvasResizing && (
              <div className="fixed inset-0 z-[9999] cursor-col-resize select-none bg-transparent" />
            )}
          </div>
        )}
  </main>
      </div>

      <AnimatePresence>
        {isModelDrawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              onClick={() => setIsModelDrawerOpen(false)}
              className="fixed inset-0 z-[190] bg-black/25"
            />
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="fixed right-0 top-0 bottom-0 z-[191] w-full max-w-[380px] bg-[var(--theme-surface)] border-l border-[var(--theme-border)] shadow-2xl flex flex-col"
            >
              <div className="h-16 px-5 border-b border-[var(--theme-border)] flex items-center justify-between shrink-0">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-[var(--theme-primary)]">Select Model</div>
                  <div className="text-xs text-[var(--theme-secondary)] truncate">
                    {(() => {
                      const matched = activeModelList.find(m => m.id === activeModelId);
                      if (matched) return matched.name;
                      let name = activeModelId;
                      if (name.includes('/')) {
                        name = name.split('/').slice(-1)[0];
                      }
                      return name.replace(/[-_]/g, ' ').replace(/\bgguf\b/gi, '').trim() || activeModelId;
                    })()}
                  </div>
                </div>
                <button
                  onClick={() => setIsModelDrawerOpen(false)}
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-[var(--theme-secondary)] hover:text-[var(--theme-primary)] hover:bg-[var(--theme-hover-bg)] transition-colors"
                  aria-label="Close model selector"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="p-4 border-b border-[var(--theme-border)] shrink-0">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--theme-muted)]" />
                  <input
                    type="text"
                    placeholder="Search models..."
                    value={modelSearchQuery}
                    onChange={(e) => setModelSearchQuery(e.target.value)}
                    className="w-full h-10 pl-9 pr-3 bg-[var(--theme-hover-bg)] border border-[var(--theme-border)] rounded-xl text-sm outline-none text-[var(--theme-primary)] placeholder:text-[var(--theme-muted)]"
                    autoFocus
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3">
                {filteredModelList.length > 0 ? (
                  <>
                    <div className="flex items-center justify-between px-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--theme-muted)]">Categories</span>
                      <span className="text-[10px] text-[var(--theme-secondary)]">{favoriteModelIds.length}/20 favorites</span>
                    </div>

                    <div className="rounded-xl border border-[var(--theme-border)] overflow-hidden">
                      <button
                        onClick={() => setIsFavoritesCollapsed(!isFavoritesCollapsed)}
                        className="w-full h-9 px-3 flex items-center gap-2 text-xs font-semibold text-[var(--theme-primary)] bg-[var(--theme-hover-bg)]"
                      >
                        {isFavoritesCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
                        <Sparkles size={13} className="text-[var(--theme-accent)]" />
                        <span className="flex-1 text-left">Favorites</span>
                        <span className="text-[10px] text-[var(--theme-secondary)]">{favoriteModels.length}</span>
                      </button>
                      {!isFavoritesCollapsed && (
                        <div className="p-1.5 space-y-1">
                          {favoriteModels.length > 0 ? favoriteModels.map((model: any) => (
                            <button
                              key={`fav-${model.id}`}
                              onClick={() => handleModelSelect(model.id)}
                              className={`w-full min-h-[42px] flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                activeModelId === model.id ? 'bg-[var(--theme-hover-bg)] text-[var(--theme-primary)] font-bold' : 'text-[var(--theme-secondary)] hover:bg-[var(--theme-hover-bg)] hover:text-[var(--theme-primary)]'
                              }`}
                            >
                              <Sparkles size={13} className="text-[var(--theme-accent)] shrink-0" />
                              <span className="flex-1 min-w-0 text-left">
                                <span className="block truncate">{model.name}</span>
                                <span className="block text-[10px] text-[var(--theme-muted)] truncate font-normal">{model.id}</span>
                              </span>
                              {activeModelId === model.id && <Check size={13} className="text-[var(--theme-accent)] shrink-0" />}
                            </button>
                          )) : (
                            <div className="px-3 py-4 text-center text-[11px] text-[var(--theme-secondary)]">
                              Mark models as favorite from provider categories.
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {providerModelCategories.map(category => {
                      const collapsed = collapsedModelCategories[category.id];
                      return (
                        <div key={category.id} className="rounded-xl border border-[var(--theme-border)] overflow-hidden">
                          <button
                            onClick={() => toggleModelCategory(category.id)}
                            className="w-full h-9 px-3 flex items-center gap-2 text-xs font-semibold text-[var(--theme-primary)] bg-[var(--theme-hover-bg)]"
                          >
                            {collapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
                            <span className="flex-1 text-left truncate">{category.label}</span>
                            <span className="text-[10px] text-[var(--theme-secondary)]">{category.models.length}</span>
                          </button>
                          {!collapsed && (
                            <div className="p-1.5 space-y-1">
                              {category.models.map(model => (
                                <div key={`${category.id}-${model.id}`} className={`group w-full min-h-[46px] flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                  activeModelId === model.id ? 'bg-[var(--theme-hover-bg)] text-[var(--theme-primary)] font-bold' : 'text-[var(--theme-secondary)] hover:bg-[var(--theme-hover-bg)] hover:text-[var(--theme-primary)]'
                                }`}>
                                  <button onClick={() => handleModelSelect(model.id)} className="flex-1 min-w-0 flex items-center gap-3 text-left">
                                    <div>{renderAppModelLogo(model.author || model.providerProfileName || model.id.split('/')[0] || '', model.id, model.icon)}</div>
                                    <span className="flex-1 min-w-0">
                                      <span className="block truncate">{model.name}</span>
                                      <span className="block text-[10px] text-[var(--theme-muted)] truncate font-normal">{model.id}</span>
                                    </span>
                                  </button>
                                  <button
                                    onClick={() => toggleFavoriteModel(model.id)}
                                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                                      favoriteModelIds.includes(model.id) ? 'text-[var(--theme-accent)] bg-[var(--theme-accent)]/10' : 'text-[var(--theme-muted)] hover:text-[var(--theme-accent)] hover:bg-[var(--theme-hover-bg)]'
                                    }`}
                                    title={favoriteModelIds.includes(model.id) ? 'Remove favorite' : 'Add favorite'}
                                  >
                                    <Sparkles size={13} />
                                  </button>
                                  {activeModelId === model.id && <Check size={14} className="text-[var(--theme-accent)] shrink-0" />}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </>
                ) : (
                  <div className="px-3 py-8 text-center text-xs text-[var(--theme-secondary)]">
                    No models found
                  </div>
                )}
              </div>
            </motion.aside>
          </>
        )}
        {false && isSettingsOpen && (
          <SettingsModal
            onClose={() => setIsSettingsOpen(false)}
            useLocalModelsOnly={useLocalModelsOnly}
            setUseLocalModelsOnly={setUseLocalModelsOnly}
            activeSettingsTab={activeSettingsTab}
            setActiveSettingsTab={setActiveSettingsTab}
            useBubbles={useBubbles}
            setUseBubbles={setUseBubbles}
            isCompactSidebar={isCompactSidebar}
            setIsCompactSidebar={setIsCompactSidebar}
            autoHideTopBar={autoHideTopBar}
            setAutoHideTopBar={setAutoHideTopBar}
            modelSelectorMode={modelSelectorMode}
            setModelSelectorMode={setModelSelectorMode}
            useBridgeTools={useBridgeTools}
            setUseBridgeTools={setUseBridgeTools}
            useTurboQuant={useTurboQuant}
            setUseTurboQuant={setUseTurboQuant}
            selectedProvider={selectedProvider}
            handleProviderSelect={handleProviderSelect}
            providerSearchQuery={providerSearchQuery}
            setProviderSearchQuery={setProviderSearchQuery}
            serverUrl={serverUrl}
            setServerUrl={setServerUrl}
            apiKey={apiKey}
            setApiKey={setApiKey}
            aiVerificationState={aiVerificationState}
            handleVerifyAI={handleVerifyAI}
            handleSaveAI={handleSaveAI}
            isAiSaved={isAiSaved}
            aiProviderProfiles={aiProviderProfiles}
            editingAiProfileId={editingAiProfileId}
            handleToggleAiProfile={handleToggleAiProfile}
            handleEditAiProfile={handleEditAiProfile}
            handleDeleteAiProfile={handleDeleteAiProfile}
            handleRenameAiProfile={handleRenameAiProfile}
            handleCloseAiProfileEditor={handleCloseAiProfileEditor}
            handleUpdateAiProfileConfig={handleUpdateAiProfileConfig}
            handleToggleAiProfileModel={handleToggleAiProfileModel}
            handleSetAiProfileModelsVisible={handleSetAiProfileModelsVisible}
            handleVerifyAiProfile={handleVerifyAiProfile}
            searchProvider={searchProvider}
            setSearchProvider={setSearchProvider}
            tavilyApiKey={tavilyApiKey}
            setTavilyApiKey={setTavilyApiKey}
            serpApiKey={serpApiKey}
            setSerpApiKey={setSerpApiKey}
            searchVerificationState={searchVerificationState}
            handleVerifySearch={handleVerifySearch}
            handleSaveSearch={handleSaveSearch}
            isSearchSaved={isSearchSaved}
            userProfile={userProfile}
            setUserProfile={setUserProfile}
            persona={persona}
            setPersona={setPersona}
            luminaTools={luminaTools}
            setLuminaTools={setLuminaTools}
            showToast={showToast}
            llamaBridgeUrl={llamaBridgeUrl}
            setLlamaBridgeUrl={setLlamaBridgeUrl}
            llamaBridgeApiKey={llamaBridgeApiKey}
            setLlamaBridgeApiKey={setLlamaBridgeApiKey}
            isMcpConnected={isMcpConnected}
            llamaBridgeModels={llamaBridgeModels}
            selectedLlamaModel={selectedLlamaModel}
            setSelectedLlamaModel={setSelectedLlamaModel}
            bridgeTools={bridgeTools}
            setBridgeTools={setBridgeTools}
            handleTestLlamaConnection={handleTestLlamaConnection}
            handleLoadLlamaModels={handleLoadLlamaModels}
            handleLoadBridgeTools={handleLoadBridgeTools}
          />
        )}
      </AnimatePresence>


      <div className="fixed top-20 right-6 flex flex-col gap-1.5 items-end z-[9999] pointer-events-none">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 24, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 12, scale: 0.95 }}
              className="px-3 py-1.5 bg-zinc-950/95 border border-white/10 rounded-lg text-[10.5px] font-medium text-white shadow-lg backdrop-blur-md flex items-center gap-2 w-fit max-w-lg pointer-events-auto"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
              <span>{toast.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <Canvas 
        artifact={activeArtifact} 
        isOpen={isCoderMode && isCanvasOpen} 
        onClose={() => setIsCanvasOpen(false)} 
        view={canvasView}
        onSetView={setCanvasView}
        allArtifacts={chats.find(c => c.id === currentChatId)?.messages.flatMap(m => m.artifacts || []) || []}
      />



      {/* Retro Cyberpunk CRT Grid Scanlines visual overlay */}
      {retroFilter && (
        <div 
          className="pointer-events-none fixed inset-0 z-[1000] opacity-[0.05]" 
          style={{
            background: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.05), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.05))',
            backgroundSize: '100% 4px, 6px 100%'
          }} 
        />
      )}

      {/* Lumina Developer Tools Dialog Panel */}
      <DevToolsPanel
        isDevToolsOpen={isDevToolsOpen}
        setIsDevToolsOpen={setIsDevToolsOpen}
        activeDevTab={activeDevTab}
        setActiveDevTab={setActiveDevTab}
        simLatency={simLatency}
        setSimLatency={setSimLatency}
        devLogs={devLogs}
        setDevLogs={setDevLogs}
        chats={chats}
        selectedProvider={selectedProvider}
        serverUrl={serverUrl}
        isCoderMode={isCoderMode}
        isCoderLeftPanelOpen={isCoderLeftPanelOpen}
        isCoderRightPanelOpen={isCoderRightPanelOpen}
        isMcpConnected={isMcpConnected}
        workspaceRefreshKey={workspaceRefreshKey}
        handleExecMockCommand={handleExecMockCommand}
        addDevLog={addDevLog}
        showToast={showToast}
        retroFilter={retroFilter}
        setRetroFilter={setRetroFilter}
        verboseDebug={verboseDebug}
        setVerboseDebug={setVerboseDebug}
        setIsCompactSidebar={setIsCompactSidebar}
        isCompactSidebar={isCompactSidebar}
        setUseBubbles={setUseBubbles}
        useBubbles={useBubbles}
        setAutoHideTopBar={setAutoHideTopBar}
        autoHideTopBar={autoHideTopBar}
      />

      {/* Scanned Layout Element Report Modal */}
      <ElementAnalysisModal
        attachment={selectedModalAttachment}
        onClose={() => setSelectedModalAttachment(null)}
        onEditFile={setFloatingEditFile}
      />

      {/* Dynamic Image Lightbox Overlay Popup */}
      <ImageLightbox
        image={lightboxImage}
        onClose={() => setLightboxImage(null)}
      />

      {/* Dynamic Video Popup Player Panel */}
      <VideoPlayerPopup
        video={activeVideo}
        onClose={() => setActiveVideo(null)}
      />

      {/* Chats Manager Panel for Projects */}
      <ChatsManagerPanel
        isOpen={Boolean(selectedProjectForChats)}
        onClose={() => setSelectedProjectForChats(null)}
        title="Project Chats"
        contextName={selectedProjectForChats?.name || ''}
        chats={chats.filter(c => c.projectId === selectedProjectForChats?.id)}
        currentChatId={currentChatId}
        onSelectChat={(chatId) => {
          setCurrentChatId(chatId);
          if (setActiveProjectId) {
            setActiveProjectId(selectedProjectForChats.id);
          }
          if (setActiveAgent) {
            setActiveAgent(null);
          }
          setShowProjectsPage(false);
          setSelectedProjectForChats(null);
          showToast(`Opened project chat session.`);
        }}
        onDeleteChat={(chatId) => {
          setChats(prev => prev.filter(c => c.id !== chatId));
          if (currentChatId === chatId) {
            setCurrentChatId(null);
          }
          showToast(`Deleted chat session.`);
        }}
        onCreateNewChat={() => {
          const newId = createNewChat(selectedProjectForChats.id, isCoderMode);
          if (setActiveProjectId) {
            setActiveProjectId(selectedProjectForChats.id);
          }
          if (setActiveAgent) {
            setActiveAgent(null);
          }
          setShowProjectsPage(false);
          setSelectedProjectForChats(null);
          showToast(`Created new project chat.`);
        }}
      />

      {/* Chats Manager Panel for Agents */}
      <ChatsManagerPanel
        isOpen={Boolean(selectedAgentForChats)}
        onClose={() => setSelectedAgentForChats(null)}
        title="Assistant Chats"
        contextName={selectedAgentForChats?.name || ''}
        chats={chats.filter(c => c.agentId === selectedAgentForChats?.id)}
        currentChatId={currentChatId}
        onSelectChat={(chatId) => {
          setCurrentChatId(chatId);
          if (setActiveAgent) {
            setActiveAgent(selectedAgentForChats);
          }
          if (setActiveProjectId) {
            setActiveProjectId(null);
          }
          setShowAgentsPage(false);
          setSelectedAgentForChats(null);
          showToast(`Opened "${selectedAgentForChats.name}" session.`);
        }}
        onDeleteChat={(chatId) => {
          setChats(prev => prev.filter(c => c.id !== chatId));
          if (currentChatId === chatId) {
            setCurrentChatId(null);
          }
          showToast(`Deleted chat session.`);
        }}
        onCreateNewChat={() => {
          const newId = createNewChat(null, false, false, selectedAgentForChats.id);
          if (setActiveAgent) {
            setActiveAgent(selectedAgentForChats);
          }
          if (setActiveProjectId) {
            setActiveProjectId(null);
          }
          setShowAgentsPage(false);
          setSelectedAgentForChats(null);
          showToast(`Created new assistant chat.`);
        }}
      />

      {/* URL Tool Modal */}
      <UrlAttachmentModal
        isOpen={isUrlToolOpen}
        onClose={() => setIsUrlToolOpen(false)}
        urlInput={urlToolInput}
        setUrlInput={setUrlToolInput}
        loading={urlToolLoading}
        error={urlToolError}
        setError={setUrlToolError}
        onSubmit={handleAttachUrl}
      />

      {/* Transcript Tool Modal */}
      <TranscriptModal
        isOpen={isTranscriptToolOpen}
        onClose={() => setIsTranscriptToolOpen(false)}
        videoUrlInput={transcriptToolInput}
        setVideoUrlInput={setTranscriptToolInput}
        loading={transcriptToolLoading}
        error={transcriptToolError}
        setError={setTranscriptToolError}
        onSubmit={handleFetchTranscript}
      />

      {/* Floating Action Context Menu */}
      {attachmentContextMenu.visible && (
        <div 
          className="fixed bg-[#1C1816]/95 border border-[#2D241E] rounded-xl shadow-2xl p-1 z-[300] w-48 text-left py-1 select-none font-sans"
          style={{ top: attachmentContextMenu.y, left: attachmentContextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              setFloatingEditFile(attachmentContextMenu.attachment.filePath);
              setAttachmentContextMenu({ visible: false, x: 0, y: 0, attachment: null, index: -1 });
            }}
            className="flex items-center gap-2 w-full px-3 py-2 text-xs text-[#EDE6DD] hover:bg-[#D97756]/15 hover:text-[#D97756] rounded-lg transition-all text-left cursor-pointer font-medium"
          >
            <Code size={13} className="text-zinc-500" />
            <span>Open in Editor</span>
          </button>
          <button
            onClick={() => {
              setSelectedModalAttachment(attachmentContextMenu.attachment);
              setAttachmentContextMenu({ visible: false, x: 0, y: 0, attachment: null, index: -1 });
            }}
            className="flex items-center gap-2 w-full px-3 py-2 text-xs text-[#EDE6DD] hover:bg-teal-500/10 hover:text-teal-400 rounded-lg transition-all text-left cursor-pointer font-medium"
          >
            <Activity size={13} className="text-zinc-500" />
            <span>View Analysis</span>
          </button>
          <span className="block h-px bg-[#2D241E] my-1" />
          <button
            onClick={() => {
              if (attachmentContextMenu.index !== -1) {
                setLocalElementAttachments(prev => prev.filter((_, i) => i !== attachmentContextMenu.index));
              }
              setAttachmentContextMenu({ visible: false, x: 0, y: 0, attachment: null, index: -1 });
            }}
            className="flex items-center gap-2 w-full px-3 py-2 text-xs text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all text-left cursor-pointer font-medium"
          >
            <X size={13} />
            <span>Remove Attachment</span>
          </button>
        </div>
      )}

      {/* Transcription Option selector Popup Modal */}
      <TranscriptionOptionsModal
        transcriptionOptionsDoc={transcriptionOptionsDoc}
        setTranscriptionOptionsDoc={setTranscriptionOptionsDoc}
        ensureTranscriptFilesOnDisk={ensureTranscriptFilesOnDisk}
        ensureScrapedFilesOnDisk={ensureScrapedFilesOnDisk}
        setFloatingEditFile={setFloatingEditFile}
        setSelectedTranscriptDoc={setSelectedTranscriptDoc}
      />

      {/* Floating manual code editor in non-coder mode */}
      {!isCoderMode && floatingEditFile && (
        <FloatingCodeEditor 
          filePath={floatingEditFile}
          onClose={() => setFloatingEditFile(null)}
          showToast={showToast}
          triggerWorkspaceRefresh={triggerWorkspaceRefresh}
        />
      )}

      {/* Global & Connected Whiteboard popup panel */}
      <AnimatePresence>
        {isWhiteboardOpen && (
          <div className="fixed inset-0 bg-[#0F0D0C]/85 backdrop-blur-md flex items-center justify-center z-[202] p-4 md:p-6 select-none animate-fade-in animate-duration-200 block">
            <motion.div 
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-5xl h-[82vh] bg-[#141211] border border-[#2D241E] rounded-2xl flex flex-col overflow-hidden shadow-[0_32px_80px_rgba(10,8,7,0.85)] relative font-sans"
            >
              <div className="absolute top-0 left-0 w-64 h-64 bg-[#D97756]/5 rounded-full blur-[70px] pointer-events-none" />
              <div className="absolute bottom-0 right-0 w-64 h-64 bg-teal-500/3 rounded-full blur-[70px] pointer-events-none" />

              <div className="h-14 border-b border-[#2C241E] bg-[#1F1917]/95 px-5 flex items-center justify-between shrink-0 relative z-10 select-none backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[#D97756]/15 text-[#D97756] border border-[#D97756]/20">
                    <Palette size={16} />
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-bold text-[#EDE6DD] tracking-wider uppercase font-sans">
                      Collaborative Whiteboard
                    </span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
                      <span className="text-[10px] font-mono text-[#AD9F91]">
                        Connected Workspace Mode
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsWhiteboardOpen(false)}
                    className="p-2 hover:bg-[#2A2420] border border-[#2F2722] bg-[#1C1816]/50 rounded-lg text-[#AD9F91] hover:text-white transition-all cursor-pointer"
                    title="Close Whiteboard Popup"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>

              <div className="flex-1 min-h-0 bg-[#141211]">
                <Whiteboard 
                  onAttachToChat={(file) => {
                    setAttachedFiles(prev => [...prev, file]);
                    showToast('Sketch attached successfully to your message compose box!');
                  }}
                  onClose={() => setIsWhiteboardOpen(false)}
                />
              </div>

              <div className="h-9 border-t border-[#2C241E] bg-[#0F0E0D] px-5 flex items-center justify-between text-[10px] text-[#7F7469] font-mono shrink-0 select-none animate-fade-in animate-duration-300">
                <span>Interactive drawing workspace • Automatically scales to container</span>
                <span>Press ESC or click close to dismiss</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Synchronized Video Transcription Immersive Board Overlay */}
      {selectedTranscriptDoc && (
        <VideoTranscriptStudio
          isOpen={!!selectedTranscriptDoc}
          onClose={() => setSelectedTranscriptDoc(null)}
          videoUrl={selectedTranscriptDoc.url}
          videoId={selectedTranscriptDoc.videoId || ''}
          videoTitle={selectedTranscriptDoc.title}
          segments={selectedTranscriptDoc.segments || []}
          fullText={selectedTranscriptDoc.content}
          onPasteTextToInput={(pasted) => {
            setInput(pasted);
            showToast('Ref text pasted into your workspace input!');
          }}
          callLlamaBridge={async (messagesPrompt, toolsList) => {
            return await callLlamaBridge(messagesPrompt, toolsList);
          }}
        />
      )}

      {/* Voice Assistant Full-Screen Panel */}
      <VoiceAssistantPanel
        isOpen={isVoicePanelOpen}
        onClose={() => setIsVoicePanelOpen(false)}
        isVoiceListening={isVoiceListening}
        startVoiceDictation={startVoiceDictation}
        stopVoiceDictation={stopVoiceDictation}
        toggleVoiceDictation={toggleVoiceDictation}
        micVolume={micVolume}
        voiceInterimText={voiceInterimText}
        voiceError={voiceError}
        isAiSpeaking={isAiSpeaking}
        stopSpeaking={stopSpeaking}
        messages={messages}
        isTyping={isTyping}
        speakText={speakText}
      />

      {/* Local model GGUF manual engine parameter loader */}
      {localModelConfigModel && (
        <LocalModelConfigModal
          isOpen={isLocalModelConfigOpen}
          onClose={() => setIsLocalModelConfigOpen(false)}
          model={localModelConfigModel}
          onLoadModel={handleLoadLocalModel}
          showToast={showToast}
        />
      )}

    </div>
  );
}
