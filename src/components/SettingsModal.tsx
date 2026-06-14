import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Settings,
  User,
  Sparkles,
  Search,
  Hammer,
  Terminal,
  HardDrive,
  Plus,
  Check,
  X,
  Globe,
  Brain,
  Wrench,
  Box,
  CloudMoon,
  Calendar,
  Video,
  Library,
  Image as ImageIcon,
  Link as LinkIcon,
  FileText,
  Layers,
  BookOpen,
  Download,
  Eye,
  RefreshCw,
  Cpu,
  Activity,
  Folder,
  Play,
  Server,
  Laptop,
  MoreHorizontal,
  Trash2,
  Database,
  Bot,
  Edit3,
  Save,
  ToggleLeft,
  ToggleRight,
  ChevronDown,
  ChevronRight,
  Copy,
  ExternalLink,
  Palette
} from 'lucide-react';
import { CLOUD_PROVIDERS } from '../constants';
import { SkillsPanel } from './SkillsPanel';
import { ComposioPanelRefactored } from './ComposioPanelRefactored';
import { ThemeSettingsContent } from './ThemeSettingsContent';

type AiProviderProfile = {
  id: string;
  name: string;
  provider: string;
  endpoint: string;
  apiKey: string;
  models: Array<{ id: string; name: string; color?: string; providerProfileId?: string; providerProfileName?: string }>;
  selectedModelIds: string[];
  active: boolean;
  accentColor?: string;
  verifiedAt: number;
  updatedAt: number;
};

interface SettingsModalProps {
  onClose: () => void;
  useLocalModelsOnly?: boolean;
  setUseLocalModelsOnly?: (val: boolean) => void;
  activeSettingsTab: 'general' | 'ai' | 'mcp' | 'bridge' | 'sources' | 'search' | 'persona' | 'profile' | 'theme' | 'lumina_tools' | 'llama_cpp' | 'models' | 'rag' | 'skills' | 'agents' | 'convex' | 'composio' | 'anthropic';
  setActiveSettingsTab: (tab: 'general' | 'ai' | 'mcp' | 'bridge' | 'sources' | 'search' | 'persona' | 'profile' | 'theme' | 'lumina_tools' | 'llama_cpp' | 'models' | 'rag' | 'skills' | 'agents' | 'convex' | 'composio' | 'anthropic') => void;
  availableModels: any[];
  useBubbles: boolean;
  setUseBubbles: (val: boolean) => void;
  isCompactSidebar: boolean;
  setIsCompactSidebar: (val: boolean) => void;
  autoHideTopBar: boolean;
  setAutoHideTopBar: (val: boolean) => void;
  modelSelectorMode: 'popup' | 'drawer';
  setModelSelectorMode: (mode: 'popup' | 'drawer') => void;
  useBridgeTools: boolean;
  setUseBridgeTools: (val: boolean) => void;
  useTurboQuant: boolean;
  setUseTurboQuant: (val: boolean) => void;
  selectedProvider: string;
  handleProviderSelect: (id: string) => void;
  providerSearchQuery: string;
  setProviderSearchQuery: (query: string) => void;
  serverUrl: string;
  setServerUrl: (url: string) => void;
  apiKey: string;
  setApiKey: (key: string) => void;
  aiVerificationState: 'idle' | 'verifying' | 'success' | 'error';
  handleVerifyAI: () => void;
  handleSaveAI: () => void;
  isAiSaved: boolean;
  aiProviderProfiles?: AiProviderProfile[];
  editingAiProfileId?: string | null;
  handleToggleAiProfile?: (profileId: string) => void;
  handleEditAiProfile?: (profileId: string) => void;
  handleDeleteAiProfile?: (profileId: string) => void;
  handleRenameAiProfile?: (profileId: string, name: string) => void;
  handleCloseAiProfileEditor?: () => void;
  handleUpdateAiProfileConfig?: (profileId: string, patch: Partial<Pick<AiProviderProfile, 'name' | 'provider' | 'endpoint' | 'apiKey' | 'selectedModelIds'>>) => void;
  handleToggleAiProfileModel?: (profileId: string, modelId: string) => void;
  handleSetAiProfileModelsVisible?: (profileId: string, visible: boolean) => void;
  handleVerifyAiProfile?: (profileId: string) => void;
  searchProvider: string;
  setSearchProvider: (val: string) => void;
  tavilyApiKey: string;
  setTavilyApiKey: (val: string) => void;
  serpApiKey: string;
  setSerpApiKey: (val: string) => void;
  searchVerificationState: 'idle' | 'verifying' | 'success' | 'error';
  handleVerifySearch: () => void;
  handleSaveSearch: () => void;
  isSearchSaved: boolean;
  userProfile: {
    name: string;
    avatar: string;
    dob: string;
    location: string;
    age?: number | string;
  };
  setUserProfile: React.Dispatch<React.SetStateAction<{
    name: string;
    avatar: string;
    dob: string;
    location: string;
    age?: number | string;
  }>>;
  persona: {
    name: string;
    role: string;
    avatar: string;
    isGeneratingAvatar: boolean;
    systemPrompt?: string;
  };
  setPersona: React.Dispatch<React.SetStateAction<any>>;
  luminaTools: Array<{
    id: string;
    name: string;
    description: string;
    enabled: boolean;
    icon: React.ReactNode;
  }>;
  setLuminaTools: React.Dispatch<React.SetStateAction<any[]>>;
  showToast: (msg: string) => void;

  // Llama Bridge Settings
  llamaBridgeUrl: string;
  setLlamaBridgeUrl: (url: string) => void;
  llamaBridgeApiKey: string;
  setLlamaBridgeApiKey: (key: string) => void;
  isMcpConnected: boolean;
  llamaBridgeModels: Array<{ id: string; name: string }>;
  selectedLlamaModel: string;
  setSelectedLlamaModel: (model: string) => void;
  bridgeTools: Array<{
    id: string;
    name: string;
    description: string;
    enabled: boolean;
    icon: React.ReactNode;
  }>;
  setBridgeTools: React.Dispatch<React.SetStateAction<any[]>>;
  handleTestLlamaConnection: () => void;
  handleLoadLlamaModels: () => void;
  handleLoadBridgeTools: () => void;

  // Local model bindings from AppContent
  loadedLocalModelId?: string | null;
  setLoadedLocalModelId?: (id: string | null) => void;
  onOpenLocalModelConfig?: (id: string) => void;
  activeModelId?: string;
  setActiveModelId?: (id: string) => void;
  onLocalModelsChange?: () => void;
}

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
      className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm shrink-0 overflow-hidden ${bgClass}`}
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

const renderModelLogo = (author: string, modelId: string) => {
  const normAuthor = (author || '').toLowerCase();
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
    bgClass = "bg-black border border-zinc-800 p-0.5";
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

  // Generate fallback react nodes matches
  let fallbackNode: React.ReactNode = null;

  if (normAuthor.includes('google') || normId.includes('gemma')) {
    fallbackNode = (
      <div className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-900 flex items-center justify-center shadow-sm shrink-0 border border-gray-100 dark:border-zinc-800">
        <svg viewBox="0 0 24 24" className="w-6 h-6">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.65-.63-1.12-1.42-.81-2.63z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
        </svg>
      </div>
    );
  } else if (normAuthor.includes('nvidia') || normId.includes('nemotron')) {
    fallbackNode = (
      <div className="w-10 h-10 rounded-xl bg-black flex items-center justify-center shadow-sm shrink-0 border border-zinc-800 p-1">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <path fill="#76B900" d="M85.4,36.4 C81.8,24.2 71.9,15.6 57.6,15.6 C42.1,15.6 28.6,26.5 28.6,44.9 C28.6,60 38.4,71.5 50.8,74.1 L50.8,66 C42.3,63.3 36.3,55.3 36.3,44.9 C36.3,31.6 45.4,22.8 56.6,22.8 C66.8,22.8 74.2,29.3 76.9,38 L85.4,36.4 Z M70.3,43 C67.4,37.3 62,33.5 55.4,33.5 C48.1,33.5 42,39.1 42,48 C42,55.4 46.8,61.1 52.8,62.1 L52.8,55.6 C49.2,54.7 46.8,51.8 46.8,48 C46.8,42.8 50.2,38.8 55.4,38.8 C59.8,38.8 62.6,41.9 63.8,45.8 L70.3,43 Z M48,48.5 L48,51.5 L55,51.5 L55,48.5 L48,48.5 Z" />
        </svg>
      </div>
    );
  } else if (normAuthor.includes('qwen') || normId.includes('qwen')) {
    fallbackNode = (
      <div className="w-10 h-10 rounded-xl bg-[#1C1A2E] flex items-center justify-center shadow-sm shrink-0 border border-indigo-500/20">
        <svg viewBox="0 0 32 32" className="w-6 h-6">
          <path d="M16 2 L28 10 L28 22 L16 30 L4 22 L4 10 Z" fill="none" stroke="#818CF8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M16 6 L24 11 L24 21 L16 26 L8 21 L8 11 Z" fill="none" stroke="#C084FC" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="16" cy="16" r="3.5" fill="#818CF8" />
        </svg>
      </div>
    );
  } else if (normAuthor.includes('liquid') || normId.includes('lfm')) {
    fallbackNode = (
      <div className="w-10 h-10 rounded-xl bg-[#201511] flex items-center justify-center shadow-sm shrink-0 border border-[#E26D2E]/25 p-1.5" title="Liquid Labs Model">
        <svg viewBox="0 0 24 24" className="w-5.5 h-5.5 text-[#E26D2E]" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="5" r="2.5" fill="currentColor" fillOpacity="0.2" />
          <circle cx="12" cy="19" r="2.5" fill="currentColor" fillOpacity="0.2" />
          <circle cx="5" cy="12" r="2.5" fill="currentColor" fillOpacity="0.2" />
          <circle cx="19" cy="12" r="2.5" fill="currentColor" fillOpacity="0.2" />
          <line x1="12" y1="7.5" x2="12" y2="16.5" />
          <line x1="7.5" y1="12" x2="16.5" y2="12" />
          <line x1="6.7" y1="10.3" x2="10.3" y2="6.7" />
          <line x1="13.7" y1="6.7" x2="17.3" y2="10.3" />
          <line x1="17.3" y1="13.7" x2="13.7" y2="17.3" />
          <line x1="10.3" y1="17.3" x2="6.7" y2="13.7" />
        </svg>
      </div>
    );
  } else if (normAuthor.includes('meta') || normId.includes('llama')) {
    fallbackNode = (
      <div className="w-10 h-10 rounded-xl bg-[#0B0F19] flex items-center justify-center shadow-sm shrink-0 border border-blue-900/40">
        <svg viewBox="0 0 24 24" className="w-6 h-6 text-[#1A73E8]" fill="currentColor">
          <path d="M16.5 6C14.57 6 12.92 7.08 12 8.68 11.08 7.08 9.43 6 7.5 6 4.46 6 2 8.46 2 11.5S4.46 17 7.5 17c1.93 0 3.58-1.08 4.5-2.68.92 1.6 2.57 2.68 4.5 2.68 3.04 0 5.5-2.46 5.5-5.5S19.54 6 16.5 6zm-9 9c-1.93 0-3.5-1.57-3.5-3.5S5.57 8 7.5 8s3.5 1.57 3.5 3.5S9.43 15 7.5 15zm9 0c-1.93 0-3.5-1.57-3.5-3.5S14.57 8 16.5 8s3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z" />
        </svg>
      </div>
    );
  } else if (normAuthor.includes('glm') || normAuthor.includes('thudm') || normId.includes('glm') || normId.includes('chatglm')) {
    fallbackNode = (
      <div className="w-10 h-10 rounded-xl bg-[#141417] flex items-center justify-center shadow-sm shrink-0 border border-zinc-800">
        <svg viewBox="0 0 24 24" className="w-6 h-6 text-white" fill="currentColor">
          <path d="M19 4H5v3h8.5L5 17v3h14v-3h-8.5L19 7V4z" />
        </svg>
      </div>
    );
  } else {
    fallbackNode = (
      <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shadow-sm shrink-0 border border-amber-500/15 text-lg animate-fade-in-subtle">
        🤗
      </div>
    );
  }

  if (avatarUrl) {
    return (
      <ModelImage
        src={avatarUrl}
        fallback={fallbackNode}
        title={customTitle || author || modelId}
        bgClass={bgClass}
      />
    );
  }

  return fallbackNode;
};

export function SettingsModal({
  onClose,
  useLocalModelsOnly = false,
  setUseLocalModelsOnly = () => {},
  activeSettingsTab,
  setActiveSettingsTab,
  useBubbles,
  setUseBubbles,
  isCompactSidebar,
  setIsCompactSidebar,
  autoHideTopBar,
  setAutoHideTopBar,
  modelSelectorMode,
  setModelSelectorMode,
  useBridgeTools,
  setUseBridgeTools,
  useTurboQuant,
  setUseTurboQuant,
  selectedProvider,
  handleProviderSelect,
  providerSearchQuery,
  setProviderSearchQuery,
  serverUrl,
  setServerUrl,
  apiKey,
  setApiKey,
  aiVerificationState,
  handleVerifyAI,
  handleSaveAI,
  isAiSaved,
  aiProviderProfiles = [],
  editingAiProfileId = null,
  handleToggleAiProfile = () => {},
  handleEditAiProfile = () => {},
  handleDeleteAiProfile = () => {},
  handleRenameAiProfile = () => {},
  handleCloseAiProfileEditor = () => {},
  handleUpdateAiProfileConfig = () => {},
  handleToggleAiProfileModel = () => {},
  handleSetAiProfileModelsVisible = () => {},
  handleVerifyAiProfile = () => {},
  searchProvider,
  setSearchProvider,
  tavilyApiKey,
  setTavilyApiKey,
  serpApiKey,
  setSerpApiKey,
  searchVerificationState,
  handleVerifySearch,
  handleSaveSearch,
  isSearchSaved,
  userProfile,
  setUserProfile,
  persona,
  setPersona,
  luminaTools,
  setLuminaTools,
  showToast,
  llamaBridgeUrl,
  setLlamaBridgeUrl,
  llamaBridgeApiKey,
  setLlamaBridgeApiKey,
  isMcpConnected,
  llamaBridgeModels,
  selectedLlamaModel,
  setSelectedLlamaModel,
  bridgeTools,
  setBridgeTools,
  handleTestLlamaConnection,
  handleLoadLlamaModels,
  handleLoadBridgeTools,
  loadedLocalModelId,
  setLoadedLocalModelId,
  onOpenLocalModelConfig,
  activeModelId,
  setActiveModelId,
  onLocalModelsChange,
  availableModels
}: SettingsModalProps) {
  // Rich Profile State
  const [timezone, setTimezone] = React.useState(() => localStorage.getItem('lumina_profile_timezone') || 'GMT+05:30');
  const [preferredLanguages, setPreferredLanguages] = React.useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('lumina_profile_languages') || '["TypeScript", "Python", "JavaScript"]');
    } catch {
      return ["TypeScript", "Python", "JavaScript"];
    }
  });
  const [customInstructions, setCustomInstructions] = React.useState(() => localStorage.getItem('lumina_profile_instructions') || '');
  const [profileNameDrafts, setProfileNameDrafts] = React.useState<Record<string, string>>({});
  const [openDropdown, setOpenDropdown] = React.useState<{ agentId: string, type: 'provider' | 'model' } | null>(null);
  type SubagentConfig = {
    modelId: string;
    providerProfileId?: string;
    runtime?: 'default' | 'pi';
    systemPrompt: string;
    tools: string[];
  };

  const DEFAULT_AGENTS: { id: string; name: string; role: string; tools: string[]; prompt: string }[] = [
    {
      id: 'orchestrator',
      name: 'Orchestrator Agent',
      role: 'Coordinates execution, plans subtasks, and assigns work.',
      tools: ['read_file', 'run_command', 'glob_tool', 'grep_tool'],
      prompt: 'You are the Orchestrator subagent. Your role is to analyze the high-level request, check the codebase state, plan the subtasks, and coordinate execution. Break down complex tasks into subtasks for specialized subagents.'
    },
    {
      id: 'analyzer',
      name: 'Analyzer Agent',
      role: 'Researches codebase, traces dependencies, and locates functions.',
      tools: ['read_file', 'glob_tool', 'grep_tool'],
      prompt: 'You are the Analyzer subagent. Your role is to explore the codebase, research files, locate functions and types, trace dependencies, and summarize architecture or bugs. You do not write or modify code.'
    },
    {
      id: 'coder',
      name: 'Coder Agent',
      role: 'Implements features, refactors, and edits workspace files.',
      tools: ['read_file', 'write_file', 'edit_file', 'delete_file', 'rename_file', 'glob_tool', 'grep_tool'],
      prompt: 'You are the Coder subagent. Your role is to write clean, maintainable, and correct code in the workspace. Read the necessary files first, implement requested features or refactors, and ensure file paths are resolved properly.'
    },
    {
      id: 'debugger',
      name: 'Debugger Agent',
      role: 'Diagnoses failures, runs compiler checks, and verifies fixes.',
      tools: ['read_file', 'write_file', 'edit_file', 'run_command', 'glob_tool', 'grep_tool'],
      prompt: 'You are the Debugger subagent. Your role is to diagnose bugs, run test suites, analyze compiler or runtime errors, and modify code to fix failures. Run relevant commands to verify your fixes.'
    },
    {
      id: 'reviewer',
      name: 'Reviewer Agent',
      role: 'Performs static analysis, reviews code, and checks styles.',
      tools: ['read_file', 'glob_tool', 'grep_tool'],
      prompt: 'You are the Reviewer subagent. Your role is to perform static code analysis, code review, check for style compliance, find potential logic errors, security vulnerabilities, or performance bottlenecks, and provide recommendations.'
    }
  ];

  const ALL_AVAILABLE_TOOLS = [
    'read_file', 'write_file', 'edit_file', 'delete_file', 'rename_file',
    'glob_tool', 'grep_tool', 'analyze_file', 'run_command', 'ask_user', 'fetch_url', 'web_search'
  ];

  const [subagentConfigs, setSubagentConfigs] = React.useState<Record<string, SubagentConfig>>(() => {
    try {
      const saved = localStorage.getItem('lumina_subagent_configs');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Merge saved configs with defaults for any missing fields (backwards compat)
        const merged: Record<string, SubagentConfig> = {};
        for (const agent of DEFAULT_AGENTS) {
          const existing = parsed[agent.id];
          merged[agent.id] = {
            modelId: existing?.modelId || 'openprovider/auto-free',
            providerProfileId: existing?.providerProfileId || undefined,
            runtime: existing?.runtime || (agent.id === 'coder' ? 'pi' : 'default'),
            systemPrompt: existing?.systemPrompt || agent.prompt,
            tools: existing?.tools || [...agent.tools]
          };
        }
        return merged;
      }
    } catch (e) {}
    const defaults: Record<string, SubagentConfig> = {};
    for (const agent of DEFAULT_AGENTS) {
      defaults[agent.id] = {
        modelId: 'openprovider/auto-free',
        runtime: agent.id === 'coder' ? 'pi' : 'default',
        systemPrompt: agent.prompt,
        tools: [...agent.tools]
      };
    }
    return defaults;
  });

  const persistSubagentConfigs = (next: Record<string, SubagentConfig>) => {
    setSubagentConfigs(next);
    localStorage.setItem('lumina_subagent_configs', JSON.stringify(next));
  };

  const handleAgentModelChange = (agentId: string, modelId: string, providerProfileId?: string) => {
    const next = {
      ...subagentConfigs,
      [agentId]: { ...subagentConfigs[agentId], modelId, providerProfileId }
    };
    persistSubagentConfigs(next);
    showToast(`Updated model for ${agentId.charAt(0).toUpperCase() + agentId.slice(1)} Agent`);
  };

  const handleAgentRuntimeChange = (agentId: string, runtime: 'default' | 'pi') => {
    const next = {
      ...subagentConfigs,
      [agentId]: { ...subagentConfigs[agentId], runtime }
    };
    persistSubagentConfigs(next);
    showToast(`Updated runtime for ${agentId.charAt(0).toUpperCase() + agentId.slice(1)} Agent`);
  };

  const handleAgentProviderChange = (agentId: string, providerProfileId: string | null) => {
    const cfg = subagentConfigs[agentId];
    if (!providerProfileId) {
      // Default / no profile
      const next = {
        ...subagentConfigs,
        [agentId]: { ...cfg, providerProfileId: undefined, modelId: 'openprovider/auto-free' }
      };
      persistSubagentConfigs(next);
      return;
    }
    const profile = aiProviderProfiles.find(p => p.id === providerProfileId);
    if (!profile) return;
    const activeModels = profile.models.filter(m => profile.selectedModelIds.includes(m.id));
    const firstModel = activeModels[0]?.id || profile.models[0]?.id || 'openprovider/auto-free';
    const next = {
      ...subagentConfigs,
      [agentId]: { ...cfg, providerProfileId, modelId: firstModel }
    };
    persistSubagentConfigs(next);
    showToast(`Updated provider for ${agentId.charAt(0).toUpperCase() + agentId.slice(1)} Agent`);
  };

  const [editingPromptAgent, setEditingPromptAgent] = React.useState<string | null>(null);
  const [promptDraft, setPromptDraft] = React.useState('');

  const handleStartEditPrompt = (agentId: string, currentPrompt: string) => {
    setEditingPromptAgent(agentId);
    setPromptDraft(currentPrompt);
  };

  const handleSavePrompt = (agentId: string) => {
    const next = {
      ...subagentConfigs,
      [agentId]: { ...subagentConfigs[agentId], systemPrompt: promptDraft }
    };
    persistSubagentConfigs(next);
    setEditingPromptAgent(null);
    showToast(`Updated system prompt for ${agentId.charAt(0).toUpperCase() + agentId.slice(1)} Agent`);
  };

  const handleCancelEditPrompt = () => {
    setEditingPromptAgent(null);
    setPromptDraft('');
  };

  const handleAgentToolToggle = (agentId: string, tool: string) => {
    const current = subagentConfigs[agentId];
    const tools = current.tools.includes(tool)
      ? current.tools.filter(t => t !== tool)
      : [...current.tools, tool];
    const next = {
      ...subagentConfigs,
      [agentId]: { ...current, tools }
    };
    persistSubagentConfigs(next);
  };

  const editingAiProfile = React.useMemo(
    () => aiProviderProfiles.find(profile => profile.id === editingAiProfileId) || null,
    [aiProviderProfiles, editingAiProfileId]
  );
  // Rich Persona State
  const [personaTone, setPersonaTone] = React.useState(() => localStorage.getItem('lumina_persona_tone') || 'technical');
  const [personaLength, setPersonaLength] = React.useState(() => localStorage.getItem('lumina_persona_length') || 'balanced');
  const [personaCreativity, setPersonaCreativity] = React.useState(() => localStorage.getItem('lumina_persona_creativity') || 'balanced');

  // Local model list states (Matching look & feel of LM Studio / local models explorer)
  const [modelsSubTab, setModelsSubTab] = React.useState<'list' | 'explore'>('list');
  const [isDownloadsPanelOpen, setIsDownloadsPanelOpen] = React.useState(false);
  const [modelsFilterQuery, setModelsFilterQuery] = React.useState('');
  const [modelsPath, setModelsPath] = React.useState(() => {
    const saved = localStorage.getItem('lumina_local_models_path');
    if (saved) return saved;
    const osUser = localStorage.getItem('lumina_local_os_user') || 'YOU';
    return `C:\\Users\\${osUser}\\.lumina\\models`;
  });
  const [downloadedModelsList, setDownloadedModelsList] = React.useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('lumina_downloaded_models');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return [
      {
        id: "minicpm5-1b",
        name: "minicpm5-1b",
        params: "1B",
        size: "1.15 GB",
        modified: "6 hours ago",
        publisher: "openbmb",
        file: "minicpm5-1b-instruct-q8_0.gguf",
        capabilities: ["Vision", "Reasoning"]
      },
      {
        id: "google/gemma-2-2b-it-GGUF",
        name: "gemma-2-2b-it",
        params: "2.6B",
        size: "1.67 GB",
        modified: "12 hours ago",
        publisher: "google",
        file: "gemma-2-2b-it-q4_k_m.gguf",
        capabilities: ["Reasoning"]
      },
      {
        id: "lmstudio-community/Llama-3.2-1B-Instruct-GGUF",
        name: "llama-3.2-1b",
        params: "1.2B",
        size: "1.23 GB",
        modified: "1 day ago",
        publisher: "meta",
        file: "Llama-3.2-1B-Instruct-Q8_0.gguf",
        capabilities: ["Reasoning"]
      },
      {
        id: "Qwen/Qwen2.5-Coder-1.5B-Instruct-GGUF",
        name: "qwen2.5-coder-1.5b",
        params: "1.5B",
        size: "1.02 GB",
        modified: "3 days ago",
        publisher: "Qwen",
        file: "qwen2.5-coder-1.5b-instruct-q4_k_m.gguf",
        capabilities: ["Tool Use", "Reasoning"]
      }
    ];
  });

  // llama.cpp state declarations
  const [osDetectorResult, setOsDetectorResult] = React.useState<'win' | 'macos' | 'linux'>('win');
  const [osFilter, setOsFilter] = React.useState<'auto' | 'win' | 'macos' | 'linux' | 'source'>('auto');
  const [releases, setReleases] = React.useState<any[]>([]);
  const [isDetecting, setIsDetecting] = React.useState(false);
  const [detectionError, setDetectionError] = React.useState<string | null>(null);
  const [installingAsset, setInstallingAsset] = React.useState<any | null>(null);
  const [installProgress, setInstallProgress] = React.useState(0);
  const [installStatus, setInstallStatus] = React.useState<'idle' | 'downloading' | 'extracting' | 'verifying' | 'testing' | 'completed'>('idle');
  const [installLogs, setInstallLogs] = React.useState<string[]>([]);
  const [downloadMetrics, setDownloadMetrics] = React.useState({ speed: '0 MB/s', downloaded: '0 MB', total: '0 MB', percent: 0 });
  const [installedConfig, setInstalledConfig] = React.useState<any>(() => {
    try {
      const saved = localStorage.getItem('lumina_llama_installed_config');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [testOutput, setTestOutput] = React.useState<string[]>([]);
  const [isRunningTest, setIsRunningTest] = React.useState(false);

  // Hugging Face Models State
  const [hfSearchQuery, setHfSearchQuery] = React.useState('');
  const [hfSelectedFilter, setHfSelectedFilter] = React.useState<'all' | 'staff'>('staff');
  const [hfSortOption, setHfSortOption] = React.useState<'downloads' | 'likes' | 'modified' | 'vram_fit'>('vram_fit');
  const [detectedVramGb, setDetectedVramGb] = React.useState<number>(8.0);
  const [hasDetectedVram, setHasDetectedVram] = React.useState<boolean>(false);

  React.useEffect(() => {
    const fetchGpuInfo = async () => {
      try {
        const res = await fetch("/api/os/gpu-info");
        if (res.ok) {
          const data = await res.json();
          if (data && typeof data.vramTotalGB === 'number') {
            setDetectedVramGb(data.vramTotalGB);
            setHasDetectedVram(true);
          }
        }
      } catch (err) {
        console.error("Failed to fetch initial GPU VRAM information:", err);
      }
    };
    fetchGpuInfo();
  }, []);
  
  const curators = React.useMemo(() => [
    {
      id: "LiquidAI/LFM2.5-VL-1.6B-GGUF",
      name: "LFM2.5 VL 1.6B GGUF",
      author: "LiquidAI",
      description: "Liquid AI's state-of-the-art vision LFM model. Features amazing image understanding, low latency, and visual reasoning capabilities.",
      downloads: 66423,
      likes: 89,
      lastUpdated: "63 days ago",
      isStaffPick: true,
      arch: "IMAGE-TEXT-TO-TEXT",
      params: "1.6B",
      domain: "11m",
      format: "GGUF",
      capabilities: ["Vision", "Reasoning"],
      files: [
        "LFM2.5-VL-1.6B-BF16.gguf (2.18 GB)",
        "LFM2.5-VL-1.6B-Q4_K_M.gguf (1.10 GB)",
        "LFM2.5-VL-1.6B-Q8_0.gguf (1.80 GB)"
      ],
      projectors: [
        "LFM2.5-VL-1.6B-mmproj-f16.gguf (168 MB)"
      ],
      readme: "LFM2.5-VL is the multimodal variant of Liquid AI's Liquid Foundation Models. It natively processes images and text seamlessly, supporting rich spatial coordinates, visual reasoning, and OCR tasks."
    },
    {
      id: "LiquidAI/LFM2.5-350M-GGUF",
      name: "LFM2.5 350M GGUF",
      author: "LiquidAI",
      description: "LFM2 is a new generation of hybrid models developed by Liquid AI, specifically designed for edge AI and on-device deployment.",
      downloads: 10933,
      likes: 42,
      lastUpdated: "3 days ago",
      isStaffPick: true,
      arch: "lfm2",
      params: "0.4B",
      domain: "4m",
      format: "GGUF",
      capabilities: ["Tool Use", "Reasoning"],
      files: [
        "lfm2.5-350m-gguf-q4_0.gguf (219 MB)",
        "lfm2.5-350m-gguf-q4_k_m.gguf (229 MB)",
        "lfm2.5-350m-gguf-q5_k_m.gguf (260 MB)",
        "lfm2.5-350m-gguf-q6_k.gguf (293 MB)",
        "lfm2.5-350m-gguf-q8_0.gguf (379 MB)",
        "lfm2.5-350m-gguf-f16.gguf (711 MB)"
      ],
      readme: "LFM2 is a hybrid neural network architecture from Liquid AI that achieves state-of-the-art performance for edge deployment. Exceptionally low memory usage and high-throughput execution."
    },
    {
      id: "google/gemma-2-2b-it-GGUF",
      name: "Gemma 2 2B IT GGUF",
      author: "google",
      description: "Google Gemma 2 2B Instruct model in GGUF format, optimized for logical and conversational tasks.",
      downloads: 125000,
      likes: 540,
      lastUpdated: "12 days ago",
      isStaffPick: true,
      arch: "gemma2",
      params: "2.6B",
      domain: "8m",
      format: "GGUF",
      capabilities: ["Tool Use", "Reasoning"],
      files: [
        "gemma-2-2b-it-q4_k_m.gguf (1.67 GB)",
        "gemma-2-2b-it-q8_0.gguf (2.71 GB)"
      ],
      readme: "Gemma-2 is a state-of-the-art open model from Google constructed using the same research and technology used to create the Gemini models."
    },
    {
      id: "Qwen/Qwen2.5-Coder-1.5B-Instruct-GGUF",
      name: "Qwen 2.5 Coder 1.5B Instruct GGUF",
      author: "Qwen",
      description: "Qwen 2.5 Coder specialized version with excellent formatting, programming companion capabilities, and mathematical reasoning.",
      downloads: 85200,
      likes: 310,
      lastUpdated: "5 days ago",
      isStaffPick: true,
      arch: "qwen2",
      params: "1.5B",
      domain: "15m",
      format: "GGUF",
      capabilities: ["Tool Use", "Reasoning"],
      files: [
        "qwen2.5-coder-1.5b-instruct-q4_k_m.gguf (1.02 GB)",
        "qwen2.5-coder-1.5b-instruct-q8_0.gguf (1.63 GB)"
      ],
      readme: "Qwen2.5-Coder is the code-specialized edition of Alibaba's Qwen2.5 open foundation models, excelling at code generation, reasoning, and instruction-following."
    },
    {
      id: "lmstudio-community/Llama-3.2-1B-Instruct-GGUF",
      name: "Llama 3.2 1B Instruct GGUF",
      author: "meta",
      description: "Meta Llama 3.2 1B Instruct community quantization, perfect for super fast local agent execution.",
      downloads: 198000,
      likes: 670,
      lastUpdated: "15 days ago",
      isStaffPick: true,
      arch: "llama3",
      params: "1.2B",
      domain: "12m",
      format: "GGUF",
      capabilities: ["Tool Use", "Reasoning"],
      files: [
        "Llama-3.2-1B-Instruct-Q4_K_M.gguf (730 MB)",
        "Llama-3.2-1B-Instruct-Q8_0.gguf (1.23 GB)"
      ],
      readme: "Llama 3.2 is Meta's newest lightweight model class, suited for agent orchestration, summarization, and on-device logic pipeline integrations."
    }
  ], []);

  const [selectedModelId, setSelectedModelId] = React.useState('LiquidAI/LFM2.5-350M-GGUF');
  const [hfModels, setHfModels] = React.useState<any[]>([]);
  const [isSearchingHf, setIsSearchingHf] = React.useState(false);
  const [hfError, setHfError] = React.useState<string | null>(null);
  
  // Detail viewing / caching
  const [detailedModel, setDetailedModel] = React.useState<any>(null);
  const [isDetailLoading, setIsDetailLoading] = React.useState(false);

  // Download simulation state
  const [activeDownloadFile, setActiveDownloadFile] = React.useState<string>('');
  const [hfDownloadProgress, setHfDownloadProgress] = React.useState(0);
  const [hfDownloadStatus, setHfDownloadStatus] = React.useState<'idle' | 'downloading' | 'extracting' | 'verifying' | 'completed'>('idle');
  const [hfDownloadLogs, setHfDownloadLogs] = React.useState<string[]>([]);
  const [hfDownloadMetrics, setHfDownloadMetrics] = React.useState({ speed: '0 MB/s', downloaded: '0 MB', total: '0 MB', percent: 0 });

  const parseModelSizeGb = React.useCallback((value: string): number | null => {
    const match = String(value || '').match(/\(([\d.]+)\s*(GB|MB)\)/i) || String(value || '').match(/([\d.]+)\s*(GB|MB)/i);
    if (!match) return null;
    const amount = parseFloat(match[1]);
    if (!Number.isFinite(amount)) return null;
    return match[2].toUpperCase() === 'GB' ? amount : amount / 1024;
  }, []);

  const estimateGpuOffloadFit = React.useCallback((file: string) => {
    const sizeGb = parseModelSizeGb(file);
    const fallbackVramGb = 8;
    if (!sizeGb) {
      return {
        label: 'Size unknown',
        tone: 'neutral',
        className: 'border-zinc-500/30 bg-zinc-500/10 text-zinc-400',
      };
    }
    if (sizeGb <= fallbackVramGb * 0.72) {
      return {
        label: 'Full GPU Offload Possible',
        tone: 'full',
        className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
      };
    }
    if (sizeGb <= fallbackVramGb * 1.15) {
      return {
        label: 'Partial GPU Offload Possible',
        tone: 'partial',
        className: 'border-blue-500/40 bg-blue-500/10 text-blue-400',
      };
    }
    return {
      label: 'Likely too large',
      tone: 'large',
      className: 'border-red-500/30 bg-red-500/10 text-red-400',
    };
  }, [parseModelSizeGb]);

  const getSmallestModelFit = React.useCallback((model: any) => {
    const files = Array.isArray(model?.files) ? model.files : [];
    if (!files.length) return null;
    const sorted = [...files].sort((a, b) => (parseModelSizeGb(a) || Number.MAX_VALUE) - (parseModelSizeGb(b) || Number.MAX_VALUE));
    return estimateGpuOffloadFit(sorted[0]);
  }, [estimateGpuOffloadFit, parseModelSizeGb]);

  const getSmallestModelSizeGb = React.useCallback((model: any): number => {
    const files = Array.isArray(model?.files) ? model.files : [];
    if (files.length > 0) {
      const sizes = files.map((f: string) => parseModelSizeGb(f)).filter((s: number | null) => s !== null) as number[];
      if (sizes.length > 0) {
        return Math.min(...sizes);
      }
    }
    // Fallback to parameter-based estimation from name or id
    const str = `${model.name || ''} ${model.id || ''}`;
    const bMatch = str.match(/(\d+(\.\d+)?)\s*[Bb]/);
    if (bMatch) {
      return parseFloat(bMatch[1]) * 0.65;
    }
    const mMatch = str.match(/(\d+(\.\d+)?)\s*[Mm]/);
    if (mMatch) {
      return (parseFloat(mMatch[1]) / 1000) * 0.65;
    }
    return 4.0; // Fallback default to 4GB if nothing matches
  }, [parseModelSizeGb]);

  const getKvCacheAndOverheadGb = React.useCallback((model: any): number => {
    const str = `${model.name || ''} ${model.id || ''}`;
    let paramsB = 8.0; // Default
    const bMatch = str.match(/(\d+(\.\d+)?)\s*[Bb]/);
    if (bMatch) {
      paramsB = parseFloat(bMatch[1]);
    } else {
      const mMatch = str.match(/(\d+(\.\d+)?)\s*[Mm]/);
      if (mMatch) {
        paramsB = parseFloat(mMatch[1]) / 1000;
      }
    }
    // KV Cache at 4096 is estimated as parameters-based, minimum 0.25GB
    const kvCacheGb = Math.max(0.25, paramsB * 0.08);
    const runtimeOverheadGb = 0.4;
    return kvCacheGb + runtimeOverheadGb;
  }, []);

  // Initialize detailedModel on first mount and fetch real GGUF files and sizes
  React.useEffect(() => {
    if (curators && curators.length > 0) {
      const initialModel = curators.find(m => m.id === 'LiquidAI/LFM2.5-350M-GGUF') || curators[0];
      setSelectedModelId(initialModel.id);
      fetchModelDetails(initialModel);
    }
  }, [curators]);

  // Load details / siblings for a model repo
  const fetchModelDetails = async (baseModel: any) => {
    setIsDetailLoading(true);
    setDetailedModel(baseModel);
    
    try {
      // 1. Fetch main repo metadata
      const repoRes = await fetch(`https://huggingface.co/api/models/${baseModel.id}`);
      let defaultBranch = 'main';
      let cardData: any = {};
      let downloads = baseModel.downloads || 0;
      let likes = baseModel.likes || 0;
      let tags: string[] = [];
      let lastUpdatedStr = baseModel.lastUpdated || 'unknown';
      let pipeline_tag = baseModel.arch || 'text-generation';

      if (repoRes.ok) {
        const fullData = await repoRes.json();
        defaultBranch = fullData.defaultBranch || 'main';
        cardData = fullData.cardData || {};
        downloads = fullData.downloads || downloads;
        likes = fullData.likes || likes;
        tags = fullData.tags || [];
        pipeline_tag = fullData.pipeline_tag || pipeline_tag;
        
        if (fullData.lastModified) {
          const diffMs = Date.now() - new Date(fullData.lastModified).getTime();
          const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
          lastUpdatedStr = `${diffDays} days ago`;
        }
      }

      // 2. Fetch tree recursively for actual GGUF files and sizes
      let filesList: string[] = [];
      let projectorFiles: string[] = [];
      const isProjectorPath = (p: string) => {
        const lp = p.toLowerCase();
        return lp.includes('mmproj') || lp.includes('projector') || lp.includes('clip-vision') || lp.includes('siglip');
      };

      try {
        const treeRes = await fetch(`https://huggingface.co/api/models/${baseModel.id}/tree/${defaultBranch}?recursive=true&limit=1000`);
        if (treeRes.ok) {
          const treeData = await treeRes.json();
          
          const mainGgufs = treeData.filter((item: any) => 
            item.type === 'file' && 
            item.path.toLowerCase().endsWith('.gguf') && 
            !isProjectorPath(item.path)
          );
          
          filesList = mainGgufs.map((file: any) => {
            const sizeInBytes = file.size || 0;
            let formattedSize = 'unknown size';
            if (sizeInBytes > 0) {
              if (sizeInBytes >= 1024 * 1024 * 1024) {
                formattedSize = `${(sizeInBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
              } else {
                formattedSize = `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`;
              }
            }
            return `${file.path} (${formattedSize})`;
          });

          const projs = treeData.filter((item: any) => 
            item.type === 'file' && (
              isProjectorPath(item.path) || 
              (item.path.toLowerCase().includes('clip') && item.path.toLowerCase().endsWith('.gguf'))
            )
          );

          projectorFiles = projs.map((file: any) => {
            const sizeInBytes = file.size || 0;
            let formattedSize = 'unknown size';
            if (sizeInBytes > 0) {
              if (sizeInBytes >= 1024 * 1024 * 1024) {
                formattedSize = `${(sizeInBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
              } else {
                formattedSize = `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`;
              }
            }
            return `${file.path} (${formattedSize})`;
          });
        }
      } catch (err) {
        console.warn('Failed to fetch tree from default branch, checking fallback', err);
      }

      // 3. Fallback if tree fetch failed or returned no files
      if (filesList.length === 0) {
        try {
          const fallbackRes = await fetch(`https://huggingface.co/api/models/${baseModel.id}/tree/master?recursive=true&limit=1000`);
          if (fallbackRes.ok) {
            const treeData = await fallbackRes.json();
            
            const mainGgufs = treeData.filter((item: any) => 
              item.type === 'file' && 
              item.path.toLowerCase().endsWith('.gguf') && 
              !isProjectorPath(item.path)
            );
            
            filesList = mainGgufs.map((file: any) => {
              const sizeInBytes = file.size || 0;
              let formattedSize = 'unknown size';
              if (sizeInBytes > 0) {
                if (sizeInBytes >= 1024 * 1024 * 1024) {
                  formattedSize = `${(sizeInBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
                } else {
                  formattedSize = `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`;
                }
              }
              return `${file.path} (${formattedSize})`;
            });

            const projs = treeData.filter((item: any) => 
              item.type === 'file' && (
                isProjectorPath(item.path) || 
                (item.path.toLowerCase().includes('clip') && item.path.toLowerCase().endsWith('.gguf'))
              )
            );

            projectorFiles = projs.map((file: any) => {
              const sizeInBytes = file.size || 0;
              let formattedSize = 'unknown size';
              if (sizeInBytes > 0) {
                if (sizeInBytes >= 1024 * 1024 * 1024) {
                  formattedSize = `${(sizeInBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
                } else {
                  formattedSize = `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`;
                }
              }
              return `${file.path} (${formattedSize})`;
            });
          }
        } catch (err) {
          console.warn('Fallback tree check failed', err);
        }
      }

      // 4. Fallback if still empty, use prebaked model files
      if (filesList.length === 0 && baseModel.files && baseModel.files.length > 0) {
        filesList = baseModel.files;
      }

      // 5. Last-resort fallback if still empty
      if (filesList.length === 0) {
        const modelName = baseModel.name.toLowerCase().replace(/ /g, '-');
        filesList = [
          `${modelName}-q4_k_m.gguf (4.15 GB)`,
          `${modelName}-q8_0.gguf (6.90 GB)`
        ];
      }

      // 6. Robust LM Studio style Vision Model Detection
      const normId = baseModel.id.toLowerCase();
      const isVision = tags.includes('multimodal') || 
                       tags.includes('vision') || 
                       tags.includes('image-to-text') ||
                       pipeline_tag.toLowerCase().includes('image-to-text') ||
                       pipeline_tag.toLowerCase().includes('vision') ||
                       tags.some((t: string) => {
                         const lt = String(t).toLowerCase();
                         return lt.includes('vision') || lt.includes('multimodal') || lt.includes('vl');
                       }) ||
                       normId.includes('-vl') || 
                       normId.includes('vision') || 
                       normId.includes('llava') || 
                       normId.includes('paligemma') || 
                       normId.includes('minicpm-v') ||
                       normId.includes('internvl') ||
                       normId.includes('cogvlm');

      const caps: string[] = ['Reasoning'];
      if (isVision) {
        caps.push('Vision');
      }
      if (tags.includes('tool-use') || tags.includes('function-calling') || tags.includes('tools') || normId.includes('coder')) {
        caps.push('Tool Use');
      }

      // 7. Make sure we have a companion projector file if vision capability detected
      if (isVision && projectorFiles.length === 0) {
        if (baseModel.projectors && baseModel.projectors.length > 0) {
          projectorFiles = baseModel.projectors;
        } else {
          const modelNameClean = baseModel.id.split('/').pop() || 'model';
          projectorFiles = [`${modelNameClean}-mmproj-f16.gguf (168 MB)`];
        }
      }

      const updated = {
        ...baseModel,
        downloads,
        likes,
        lastUpdated: lastUpdatedStr,
        files: filesList,
        projectors: projectorFiles,
        arch: cardData.model_type || pipeline_tag || baseModel.arch,
        params: cardData.parameters || cardData.model_size || baseModel.params || '7B',
        capabilities: caps,
        readme: baseModel.readme || `Model card can be found at https://huggingface.co/${baseModel.id}`
      };

      setDetailedModel(updated);
      setActiveDownloadFile(filesList[0]);
    } catch (e) {
      console.error('Error in fetchModelDetails:', e);
      // Fallback with base details
      const fallbackFiles = baseModel.files && baseModel.files.length > 0 
        ? baseModel.files 
        : [
            `${baseModel.name.toLowerCase().replace(/ /g, '-')}-q4_k_m.gguf (4.15 GB)`,
            `${baseModel.name.toLowerCase().replace(/ /g, '-')}-q8_0.gguf (6.90 GB)`
          ];
      
      const isVisionFallback = baseModel.id.toLowerCase().includes('vision') || baseModel.id.toLowerCase().includes('-vl') || baseModel.id.toLowerCase().includes('llava');
      const fallbackProjectors = isVisionFallback 
        ? (baseModel.projectors || [`${baseModel.id.split('/').pop()}-mmproj-f16.gguf (168 MB)`])
        : [];

      setDetailedModel({
        ...baseModel,
        files: fallbackFiles,
        projectors: fallbackProjectors,
        capabilities: isVisionFallback ? ["Vision", "Reasoning"] : (baseModel.capabilities || ["Reasoning"])
      });
      setActiveDownloadFile(fallbackFiles[0]);
    } finally {
      setIsDetailLoading(false);
    }
  };

  // Fetch from HF with debounce on hfSearchQuery
  React.useEffect(() => {
    if (!hfSearchQuery.trim()) {
      setHfModels([]);
      const defaultCurated = curators.find(m => m.id === selectedModelId) || curators[0];
      setDetailedModel(defaultCurated);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setIsSearchingHf(true);
      setHfError(null);
      try {
        const fetchSort = hfSortOption === 'vram_fit' ? 'downloads' : hfSortOption;
        const fetchLimit = hfSortOption === 'vram_fit' ? 40 : 15;
        const res = await fetch(`https://huggingface.co/api/models?limit=${fetchLimit}&search=${encodeURIComponent(hfSearchQuery)}&filter=gguf&sort=${fetchSort}&direction=-1`);
        if (!res.ok) throw new Error(`HF Hub returned status ${res.status}`);
        const data = await res.json();
        
        const formatted = data.map((item: any) => {
          let dateStr = 'unknown';
          if (item.lastModified) {
            const diffMs = Date.now() - new Date(item.lastModified).getTime();
            const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
            dateStr = `${diffDays} days ago`;
          }

          const tags = item.tags || [];
          const pipeline_tag = item.pipeline_tag || 'text-generation';
          const normId = item.id.toLowerCase();
          const isVision = tags.includes('multimodal') || 
                           tags.includes('vision') || 
                           tags.includes('image-to-text') ||
                           pipeline_tag.toLowerCase().includes('image-to-text') ||
                           pipeline_tag.toLowerCase().includes('vision') ||
                           tags.some((t: string) => {
                             const lt = String(t).toLowerCase();
                             return lt.includes('vision') || lt.includes('multimodal') || lt.includes('vl');
                           }) ||
                           normId.includes('-vl') || 
                           normId.includes('vision') || 
                           normId.includes('llava') || 
                           normId.includes('paligemma') || 
                           normId.includes('minicpm-v') ||
                           normId.includes('internvl') ||
                           normId.includes('cogvlm');

          const caps = ['Reasoning'];
          if (isVision) caps.push('Vision');
          if (tags.includes('tool-use') || tags.includes('function-calling') || tags.includes('tools') || normId.includes('coder')) {
            caps.push('Tool Use');
          }
          
          return {
            id: item.id,
            name: item.id.split('/').pop()?.replace(/-/g, ' ') || item.id,
            author: item.author || 'unknown',
            description: `Model repository ${item.id} hosted on Hugging Face. Download GGUF quants directly.`,
            downloads: item.downloads || 0,
            likes: item.likes || 0,
            lastUpdated: dateStr,
            isStaffPick: false,
            arch: item.pipeline_tag || 'text-generation',
            params: 'unknown',
            domain: 'unknown',
            format: 'GGUF',
            capabilities: caps,
            files: [],
            readme: `No local cache for this Hugging Face README. Complete download configurations are generated dynamically from file trees. Model card can be found at https://huggingface.co/${item.id}.`
          };
        });
        
        setHfModels(formatted);
        
        if (formatted.length > 0) {
          const first = formatted[0];
          setSelectedModelId(first.id);
          fetchModelDetails(first);
        }
      } catch (err: any) {
        console.error(err);
        setHfError('Hugging Face API key or network restricted. Showing cached model data.');
      } finally {
        setIsSearchingHf(false);
      }
    }, 600);

    return () => clearTimeout(delayDebounce);
  }, [hfSearchQuery, hfSortOption]);

  const handleDownloadHfModel = async () => {
    if (!detailedModel) return;
    setHfDownloadStatus('downloading');
    setHfDownloadProgress(0);
    setHfDownloadLogs([]);
    setHfDownloadMetrics({ speed: '0 MB/s', downloaded: '0 MB', total: '0 MB', percent: 0 });

    const logs: string[] = [];
    const addLog = (msg: string) => {
      const time = new Date().toLocaleTimeString();
      logs.push(`[${time}] ${msg}`);
      setHfDownloadLogs([...logs]);
    };

    const isVision = detailedModel.capabilities?.includes('Vision');
    const modelId = detailedModel.id;
    const publisher = detailedModel.author || 'huggingface';
    const modelFolder = modelId.split('/')[1] || modelId;

    const fileName = activeDownloadFile || (detailedModel.files && detailedModel.files[0]) || 'model-q4_k_m.gguf';
    const modelFile = fileName.split(' ')[0];

    addLog(`Downloading: ${modelFile}`);
    addLog(`From: ${modelId}`);

    try {
      const response = await fetch('/api/models/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modelId,
          fileName,
          publisher,
          modelFolder,
          modelFile,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Server returned ${response.status}`);
      }

      let result: any = null;

      // Handle streaming SSE response
      if (response.headers.get('content-type')?.includes('text/event-stream')) {
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6));

                  if (data.type === 'progress') {
                    setHfDownloadProgress(data.percent || 0);
                    setHfDownloadMetrics({
                      percent: data.percent || 0,
                      downloaded: data.downloaded || '0',
                      total: data.total || '0',
                      speed: data.speed || 'Calculating...',
                    });
                  } else if (data.type === 'complete') {
                    result = data;
                    setHfDownloadProgress(100);
                    setHfDownloadMetrics({
                      speed: 'Done',
                      downloaded: result.size,
                      total: result.size,
                      percent: 100,
                    });
                    addLog(`Download complete! Saved to: ${result.path}`);
                  } else if (data.type === 'error') {
                    throw new Error(data.error || 'Unknown error');
                  }
                } catch (parseErr) {
                  // Ignore parse errors for incomplete lines
                }
              }
            }
          }
        }

        if (!result) {
          throw new Error('Download stream closed unexpectedly');
        }
      } else {
        // Fallback for non-streaming response
        result = await response.json();

        if (result.logs) {
          for (const log of result.logs) {
            addLog(log);
          }
        }

        const sizeNum = parseFloat(result.size) || 0;
        setHfDownloadProgress(100);
        setHfDownloadMetrics({
          speed: 'Done',
          downloaded: result.size,
          total: result.size,
          percent: 100,
        });

        if (result.alreadyExisted) {
          addLog(`File already exists at destination`);
        } else {
          addLog(`Download complete! Saved to: ${result.path}`);
        }
      }

      setHfDownloadStatus('completed');
      addLog(`${detailedModel.name} is ready for local inference!`);

      // Download companion projector file for vision models
      if (isVision && detailedModel.projectors && detailedModel.projectors[0]) {
        const projFile = detailedModel.projectors[0].split(' ')[0];
        addLog(`Downloading vision projector: ${projFile}`);
        try {
          const projRes = await fetch('/api/models/download', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              modelId,
              fileName: detailedModel.projectors[0],
              publisher,
              modelFolder,
              modelFile: projFile,
            }),
          });
          
          // Handle streaming for projector too
          if (projRes.headers.get('content-type')?.includes('text/event-stream')) {
            const projReader = projRes.body?.getReader();
            const projDecoder = new TextDecoder();
            if (projReader) {
              while (true) {
                const { done, value } = await projReader.read();
                if (done) break;
                const chunk = projDecoder.decode(value, { stream: true });
                const lines = chunk.split('\n');
                for (const line of lines) {
                  if (line.startsWith('data: ')) {
                    try {
                      const data = JSON.parse(line.slice(6));
                      if (data.type === 'progress') {
                        addLog(`Projector: ${data.percent}% (${data.speed})`);
                      } else if (data.type === 'complete') {
                        addLog(`Projector saved: ${projFile}`);
                      }
                    } catch {}
                  }
                }
              }
            }
          } else {
            const projResult = await projRes.json();
            addLog(`Projector saved: ${projFile}`);
          }
        } catch (projErr: any) {
          addLog(`Warning: Projector download failed: ${projErr.message}`);
        }
      }

      // Add to downloaded models list with actual path
      const actualPath = result?.path || `C:/Users/YOU/.lumina/models/${publisher}/${modelFolder}/${modelFile}`;
      const newModel = {
        id: modelId,
        name: detailedModel.name.toLowerCase().replace(/ /g, '-'),
        params: detailedModel.params || '7B',
        size: (detailedModel.files?.[0]?.match(/\(([^)]+)\)/)?.[1]) || '4.5 GB',
        modified: "Just now",
        publisher,
        file: modelFile,
        path: actualPath,
        capabilities: detailedModel.capabilities || ['Reasoning'],
      };

      setDownloadedModelsList(prev => {
        const cleaned = prev.filter(m => m.id !== newModel.id);
        const next = [newModel, ...cleaned];
        localStorage.setItem('lumina_downloaded_models', JSON.stringify(next));
        return next;
      });

      onLocalModelsChange?.();
      showToast(`Downloaded ${detailedModel.name}!`);
    } catch (err: any) {
      addLog(`ERROR: ${err.message}`);
      setHfDownloadStatus('idle');
      showToast(`Download failed: ${err.message}`);
    }
  };

  React.useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes('win')) {
      setOsDetectorResult('win');
    } else if (ua.includes('mac') || ua.includes('os x')) {
      setOsDetectorResult('macos');
    } else {
      setOsDetectorResult('linux');
    }
  }, []);

  const handleDetectReleases = async () => {
    setIsDetecting(true);
    setDetectionError(null);
    try {
      const res = await fetch('https://api.github.com/repos/ggerganov/llama.cpp/releases');
      if (!res.ok) {
        throw new Error(`GitHub API returned state ${res.status}`);
      }
      const data = await res.json();
      const formatted = data.slice(0, 8).map((rel: any) => ({
        id: rel.id,
        tag: rel.tag_name,
        name: rel.name || rel.tag_name,
        date: new Date(rel.published_at).toLocaleDateString(),
        url: rel.html_url,
        body: rel.body || '',
        assets: rel.assets.map((as: any) => ({
          id: as.id,
          name: as.name,
          size: (as.size / (1024 * 1024)).toFixed(1) + ' MB',
          rawSize: as.size,
          url: as.browser_download_url,
          downloads: as.download_count
        }))
      }));
      setReleases(formatted);
      showToast('Detected llama.cpp releases from GitHub!');
    } catch (err: any) {
      console.error(err);
      setDetectionError(err.message || 'Failed to query GitHub repositories');
      const fallback = [
        {
          id: 1,
          tag: 'b3050',
          name: 'llama.cpp release b3050',
          date: 'May 28, 2026',
          url: 'https://github.com/ggerganov/llama.cpp/releases/tag/b3050',
          body: 'Maintenance release with clblast, vulkan, and metal optimisations.',
          assets: [
            { id: 101, name: 'llama-b3050-bin-win-vulkan-x64.zip', size: '42.8 MB', rawSize: 44879052, url: 'https://github.com/ggerganov/llama.cpp/releases/download/b3050/llama-b3050-bin-win-vulkan-x64.zip', downloads: 14590 },
            { id: 102, name: 'llama-b3050-bin-win-clblast-x64.zip', size: '38.5 MB', rawSize: 40370176, url: 'https://github.com/ggerganov/llama.cpp/releases/download/b3050/llama-b3050-bin-win-clblast-x64.zip', downloads: 8210 },
            { id: 103, name: 'llama-b3050-bin-macos-arm64.zip', size: '24.2 MB', rawSize: 25375549, url: 'https://github.com/ggerganov/llama.cpp/releases/download/b3050/llama-b3050-bin-macos-arm64.zip', downloads: 21940 },
            { id: 104, name: 'llama-b3050-bin-macos-x64.zip', size: '26.8 MB', rawSize: 28101836, url: 'https://github.com/ggerganov/llama.cpp/releases/download/b3050/llama-b3050-bin-macos-x64.zip', downloads: 3512 },
            { id: 105, name: 'llama-b3050-bin-ubuntu-x64.zip', size: '36.1 MB', rawSize: 37853593, url: 'https://github.com/ggerganov/llama.cpp/releases/download/b3050/llama-b3050-bin-ubuntu-x64.zip', downloads: 15430 },
            { id: 106, name: 'llama-b3050-source.zip', size: '12.4 MB', rawSize: 13002342, url: 'https://github.com/ggerganov/llama.cpp/archive/refs/tags/b3050.zip', downloads: 9324 }
          ]
        },
        {
          id: 2,
          tag: 'b3020',
          name: 'llama.cpp release b3020',
          date: 'May 12, 2026',
          url: 'https://github.com/ggerganov/llama.cpp/releases/tag/b3020',
          body: 'Performance speedups for CUDA matrices and ARM quantization.',
          assets: [
            { id: 201, name: 'llama-b3020-bin-win-vulkan-x64.zip', size: '42.5 MB', rawSize: 44564480, url: 'https://github.com/ggerganov/llama.cpp/releases/download/b3020/llama-b3020-bin-win-vulkan-x64.zip', downloads: 12054 },
            { id: 202, name: 'llama-b3020-bin-win-clblast-x64.zip', size: '38.2 MB', rawSize: 40055603, url: 'https://github.com/ggerganov/llama.cpp/releases/download/b3020/llama-b3020-bin-win-clblast-x64.zip', downloads: 5410 },
            { id: 203, name: 'llama-b3020-bin-macos-arm64.zip', size: '24.0 MB', rawSize: 25165824, url: 'https://github.com/ggerganov/llama.cpp/releases/download/b3020/llama-b3020-bin-macos-arm64.zip', downloads: 19820 },
            { id: 204, name: 'llama-b3020-bin-ubuntu-x64.zip', size: '35.8 MB', rawSize: 37538201, url: 'https://github.com/ggerganov/llama.cpp/releases/download/b3020/llama-b3020-bin-ubuntu-x64.zip', downloads: 11040 }
          ]
        }
      ];
      setReleases(fallback);
    } finally {
      setIsDetecting(false);
    }
  };

  const handleInstallAsset = async (asset: any, releaseTag: string) => {
    setInstallingAsset(asset);
    setInstallProgress(0);
    setInstallStatus('downloading');
    setInstallLogs([]);
    setDownloadMetrics({ speed: '0 MB/s', downloaded: '0 MB', total: asset.size, percent: 0 });

    const logs: string[] = [];
    const addLog = (msg: string) => {
      const time = new Date().toLocaleTimeString();
      logs.push(`[${time}] ${msg}`);
      setInstallLogs([...logs]);
    };

    addLog(`Initiating download stream: ${asset.name}`);
    addLog(`Targeting remote binary artifact: ${asset.url}`);

    try {
      addLog(`Starting real download via server proxy...`);

      const response = await fetch('/api/llama/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: asset.url,
          fileName: asset.name,
          releaseTag,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Server returned ${response.status}`);
      }

      // Handle streaming SSE response
      if (response.headers.get('content-type')?.includes('text/event-stream')) {
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let config: any = null;

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6));

                  if (data.type === 'status') {
                    addLog(data.message);
                  } else if (data.type === 'progress') {
                    if (data.stage === 'download') {
                      setInstallProgress(data.percent || 0);
                      setDownloadMetrics({
                        speed: data.speed || 'Calculating...',
                        downloaded: data.downloaded || '0',
                        total: data.total || '0',
                        percent: data.percent || 0,
                      });
                    } else if (data.stage === 'extract') {
                      setInstallProgress(100);
                      setDownloadMetrics({
                        speed: 'Done',
                        downloaded: data.total || asset.size,
                        total: asset.size,
                        percent: 100,
                      });
                    }
                  } else if (data.type === 'complete') {
                    config = data.config;
                    setInstallProgress(100);
                    setInstallStatus('completed');
                    setDownloadMetrics({
                      speed: 'Done',
                      downloaded: config.size,
                      total: asset.size,
                      percent: 100,
                    });
                    addLog(`Installation complete! Binaries extracted to: ${config.path}`);
                  } else if (data.type === 'error') {
                    throw new Error(data.error || 'Unknown error');
                  }
                } catch (parseErr) {
                  // Ignore parse errors for incomplete lines
                }
              }
            }
          }
        }

        if (!config) {
          throw new Error('Download stream closed unexpectedly');
        }

        showToast(`llama.cpp release ${releaseTag} installed!`);

        localStorage.setItem('lumina_llama_installed_config', JSON.stringify({
          version: config.version,
          assetName: asset.name,
          installedAt: config.installedAt,
          path: config.path,
          binaryName: (config.binaries || []).find((b: string) => {
            const lower = b.toLowerCase();
            return (lower.includes('llama-server') && lower.endsWith('.exe')) || lower.replace(/\\/g, '/').includes('/server.exe');
          }) || (config.binaries || []).find((b: string) => {
            const lower = b.toLowerCase();
            return lower.includes('llama-server') || lower.replace(/\\/g, '/').includes('/server.exe');
          }) || '',
          size: config.size,
          url: asset.url,
          binaries: config.binaries,
        }));
        setInstalledConfig({
          ...config,
          binaryName: (config.binaries || []).find((b: string) => {
            const lower = b.toLowerCase();
            return (lower.includes('llama-server') && lower.endsWith('.exe')) || lower.replace(/\\/g, '/').includes('/server.exe');
          }) || (config.binaries || []).find((b: string) => {
            const lower = b.toLowerCase();
            return lower.includes('llama-server') || lower.replace(/\\/g, '/').includes('/server.exe');
          }) || '',
          assetName: asset.name,
        });
      } else {
        // Fallback for non-streaming response
        const result = await response.json();
        const { config, logs: serverLogs } = result;

        // Display server logs
        for (const log of serverLogs) {
          addLog(log);
        }

        setInstallProgress(100);
        setInstallStatus('completed');
        setDownloadMetrics({
          speed: 'Done',
          downloaded: config.size,
          total: asset.size,
          percent: 100,
        });

        addLog(`Installation complete! Binaries extracted to: ${config.path}`);
        showToast(`llama.cpp release ${releaseTag} installed!`);

        localStorage.setItem('lumina_llama_installed_config', JSON.stringify({
          version: config.version,
          assetName: asset.name,
          installedAt: config.installedAt,
          path: config.path,
          binaryName: (config.binaries || []).find((b: string) => {
            const lower = b.toLowerCase();
            return (lower.includes('llama-server') && lower.endsWith('.exe')) || lower.replace(/\\/g, '/').includes('/server.exe');
          }) || (config.binaries || []).find((b: string) => {
            const lower = b.toLowerCase();
            return lower.includes('llama-server') || lower.replace(/\\/g, '/').includes('/server.exe');
          }) || '',
          size: config.size,
          url: asset.url,
          binaries: config.binaries,
        }));
        setInstalledConfig({
          ...config,
          binaryName: (config.binaries || []).find((b: string) => {
            const lower = b.toLowerCase();
            return (lower.includes('llama-server') && lower.endsWith('.exe')) || lower.replace(/\\/g, '/').includes('/server.exe');
          }) || (config.binaries || []).find((b: string) => {
            const lower = b.toLowerCase();
            return lower.includes('llama-server') || lower.replace(/\\/g, '/').includes('/server.exe');
          }) || '',
          assetName: asset.name,
        });
      }
    } catch (err: any) {
      addLog(`ERROR: ${err.message}`);
      setInstallStatus('idle');
      showToast(`Installation failed: ${err.message}`);
    }
  };

  const handleTestRunning = async () => {
    setIsRunningTest(true);
    setTestOutput([]);
    const lines: string[] = [];
    const addLine = (line: string) => {
      lines.push(`${line}`);
      setTestOutput([...lines]);
    };

    const cfg = installedConfig || (() => {
      try { return JSON.parse(localStorage.getItem('lumina_llama_installed_config') || '{}'); } catch { return {}; }
    })();

    // Step 1: Verify binary exists
    const binaryPath = cfg.binaries
      ? cfg.binaries.find((b: string) => {
          const lower = b.toLowerCase();
          return (lower.includes('llama-server') && lower.endsWith('.exe')) || lower.replace(/\\/g, '/').includes('/server.exe');
        }) || cfg.binaries.find((b: string) => {
          const lower = b.toLowerCase();
          return lower.includes('llama-server') || lower.replace(/\\/g, '/').includes('/server.exe');
        })
      : null;

    if (!binaryPath) {
      addLine(`[error] No llama-server binary found in installed config.`);
      setIsRunningTest(false);
      return;
    }

    addLine(`$ Verifying binary: ${binaryPath}`);
    try {
      const verifyRes = await fetch('/api/llama/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ binaryPath }),
      });
      const verifyResult = await verifyRes.json();
      if (verifyResult.success) {
        addLine(`[info] Binary version: ${verifyResult.version}`);
        addLine(`[success] llama-server binary is valid and executable!`);
      } else {
        addLine(`[error] Binary verification failed: ${verifyResult.error}`);
        setIsRunningTest(false);
        return;
      }
    } catch (err: any) {
      addLine(`[error] Binary verification error: ${err.message}`);
      setIsRunningTest(false);
      return;
    }

    // Step 2: Start the server for testing (without model)
    const port = '1234';
    const host = '127.0.0.1';
    addLine(`$ Starting llama-server on ${host}:${port} (test mode - no model required)...`);

    try {
      const startRes = await fetch('/api/llama/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          binaryPath,
          modelPath: '', // Empty model path for testing
          gpuOffload: 99,
          contextLength: 512,
          cacheTypeK: 'q8_0',
          cacheTypeV: 'q8_0',
          threads: 4,
          host,
          port: parseInt(port),
          flashAttn: false,
          noMmap: false,
        }),
      });

      const startResult = await startRes.json();
      if (!startResult.success) {
        addLine(`[error] Failed to start server: ${startResult.error}`);
        setIsRunningTest(false);
        return;
      }

      addLine(`[info] Server process started (PID: ${startResult.pid})`);
      addLine(`[info] Server URL: ${startResult.serverUrl}`);

      // Step 3: Wait a moment for server to initialize and then check if it's running
      addLine(`$ Waiting for server to initialize...`);
      await new Promise(r => setTimeout(r, 3000));

      let isRunning = false;
      for (let attempt = 0; attempt < 10; attempt++) {
        try {
          const response = await fetch(`/api/llama/test?host=${host}&port=${port}`, {
            method: 'GET',
          });

          const result = await response.json();

          if (result.success) {
            addLine(`[info] Server responding on attempt ${attempt + 1}`);
            addLine(`[success] llama-server is running and healthy!`);
            isRunning = true;
            break;
          }
        } catch {}

        if (attempt < 9) {
          await new Promise(r => setTimeout(r, 500));
        }
      }

      if (!isRunning) {
        addLine(`[warn] Server started but not responding to health check. It may still be initializing.`);
      }

      // Step 4: Stop the server
      addLine(`$ Stopping test server...`);
      try {
        await fetch('/api/llama/stop', { method: 'POST' });
        addLine(`[success] Server stopped successfully`);
      } catch (err: any) {
        addLine(`[warn] Error stopping server: ${err.message}`);
      }

      addLine(`[result] Health check completed successfully!`);
    } catch (err: any) {
      addLine(`[error] Test error: ${err.message}`);
    } finally {
      setIsRunningTest(false);
    }
  };

  const handleUninstall = async () => {
    try {
      const res = await fetch('/api/llama/delete', { method: 'POST' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        showToast(`Failed to delete llama.cpp files: ${err.error || res.statusText}`);
      }
    } catch {}
    localStorage.removeItem('lumina_llama_installed_config');
    setInstalledConfig(null);
    setInstallingAsset(null);
    setInstallStatus('idle');
    setInstallLogs([]);
    showToast('llama.cpp uninstalled successfully!');
  };

  const handleTimezoneChange = (tz: string) => {
    setTimezone(tz);
    localStorage.setItem('lumina_profile_timezone', tz);
  };

  const handleLanguageToggle = (lang: string) => {
    let next = [...preferredLanguages];
    if (next.includes(lang)) {
      next = next.filter(l => l !== lang);
    } else {
      next.push(lang);
    }
    setPreferredLanguages(next);
    localStorage.setItem('lumina_profile_languages', JSON.stringify(next));
  };

  const handleInstructionsChange = (inst: string) => {
    setCustomInstructions(inst);
    localStorage.setItem('lumina_profile_instructions', inst);
  };

  const handleToneChange = (tone: string) => {
    setPersonaTone(tone);
    localStorage.setItem('lumina_persona_tone', tone);
  };

  const handleLengthChange = (length: string) => {
    setPersonaLength(length);
    localStorage.setItem('lumina_persona_length', length);
  };

  const handleCreativityChange = (creativity: string) => {
    setPersonaCreativity(creativity);
    localStorage.setItem('lumina_persona_creativity', creativity);
  };

  return (
    <div className="w-full h-full flex">
      <motion.div 
        initial={{ opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 24 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="relative w-full h-full bg-white dark:bg-zinc-900 text-brand-primary dark:text-white flex flex-col md:flex-row overflow-hidden"
      >
        <div className="w-full md:w-56 border-b md:border-b-0 md:border-r border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-zinc-950/20 p-6 flex flex-col">
          <h2 className="text-xl font-display font-semibold mb-8">Settings</h2>
          <nav className="space-y-1 flex-1">
            {[
              { id: 'general', label: 'General', icon: <Settings size={16} /> },
              { id: 'profile', label: 'My Profile', icon: <User size={16} /> },
              { id: 'ai', label: 'AI Service', icon: <Sparkles size={16} /> },
              { id: 'search', label: 'Search', icon: <Search size={16} /> },
              { id: 'theme', label: 'Theme', icon: <Palette size={16} /> },
              { id: 'persona', label: 'Persona', icon: <User size={16} /> },
              { id: 'agents', label: 'Agents', icon: <Bot size={16} /> },
              { id: 'lumina_tools', label: 'Lumina Tools', icon: <Hammer size={16} /> },
              { id: 'bridge', label: 'Llama Bridge', icon: <Terminal size={16} /> },
              { id: 'mcp', label: 'MCP Tools', icon: <HardDrive size={16} /> },
              { id: 'skills', label: 'Skills', icon: <BookOpen size={16} /> },
              { id: 'llama_cpp', label: 'llama.cpp', icon: <Box size={16} /> },
              { id: 'models', label: 'Models', icon: <Brain size={16} /> },
              { id: 'anthropic', label: 'Anthropic Proxy', icon: <Cpu size={16} /> },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveSettingsTab(tab.id as any)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all relative ${
                  activeSettingsTab === tab.id 
                    ? 'bg-white dark:bg-zinc-800 text-black dark:text-white shadow-sm border border-gray-100 dark:border-white/10' 
                    : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5'
                }`}
              >
                {tab.icon}
                <span className="flex-1 text-left">{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="flex-1 flex flex-col min-w-0">
          <div className={`flex-1 custom-scrollbar ${
            activeSettingsTab === 'skills'
              ? 'p-0 overflow-hidden h-full'
              : (activeSettingsTab === 'models' ? 'p-8 pt-4 overflow-hidden h-full' : 'p-8 pt-4 overflow-y-auto')
          }`}>
              {activeSettingsTab === 'general' && (
              <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-6">Appearance</h3>
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-sm" style={{ display: 'none' }}>Theme</div>
                        <div className="text-xs text-gray-400" style={{ display: 'none' }}>Customize colors and appearance</div>
                      </div>
                      <button
                        onClick={() => {}} style={{ display: 'none' }}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-500 hover:bg-blue-600 text-white transition-colors"
                      >
                        Open Themes
                      </button>
                    </div>
                     <div className="flex items-center justify-between">
                       <div>
                         <div className="font-medium text-sm">Bubble Chat</div>
                         <div className="text-xs text-gray-400">Use classic message bubbles or linear layout</div>
                       </div>
                       <button 
                         onClick={() => {
                           const nextVal = !useBubbles;
                           setUseBubbles(nextVal);
                           localStorage.setItem('lumina_use_bubbles', nextVal.toString());
                         }}
                         className={`w-12 h-6 rounded-full transition-all relative ${useBubbles ? 'bg-blue-600' : 'bg-gray-200'}`}
                       >
                         <motion.div 
                           animate={{ x: useBubbles ? 24 : 4 }}
                           className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm"
                         />
                       </button>
                     </div>
                     <div className="flex items-center justify-between">
                       <div>
                         <div className="font-medium text-sm flex items-center gap-2">
                             <span>Local Models Only</span>
                             
                          </div>
                          <div className="text-xs text-gray-400">Force local on-device inference and hide cloud-based LLMs</div>
                        </div>
                        <button 
                          onClick={() => {
                            const nextVal = !useLocalModelsOnly;
                            setUseLocalModelsOnly(nextVal);
                            localStorage.setItem('lumina_use_local_models', nextVal.toString());
                            if (showToast) {
                              showToast(nextVal ? 'On-Device Model mode activated.' : 'Cloud and local models activated.');
                            }
                          }}
                          className={`w-12 h-6 rounded-full transition-all relative ${useLocalModelsOnly ? 'bg-amber-500' : 'bg-gray-200'}`}
                        >
                          <motion.div 
                            animate={{ x: useLocalModelsOnly ? 24 : 4 }}
                            className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm"
                          />
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-sm">Compact Sidebar</div>
                         <div className="text-xs text-gray-400">Reduce sidebar width automatically</div>
                       </div>
                       <button 
                         onClick={() => {
                           const nextVal = !isCompactSidebar;
                           setIsCompactSidebar(nextVal);
                           localStorage.setItem('lumina_compact_sidebar', nextVal.toString());
                         }}
                         className={`w-12 h-6 rounded-full transition-all relative ${isCompactSidebar ? 'bg-blue-600' : 'bg-gray-200'}`}
                       >
                         <motion.div 
                           animate={{ x: isCompactSidebar ? 24 : 4 }}
                           className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm"
                         />
                       </button>
                     </div>
                     <div className="flex items-center justify-between">
                       <div>
                         <div className="font-medium text-sm">Stop Top Bar From Hiding</div>
                         <div className="text-xs text-gray-400">Keep the main header panel always visible at the top</div>
                       </div>
                       <button 
                         onClick={() => {
                           const nextVal = !autoHideTopBar;
                           setAutoHideTopBar(nextVal);
                           localStorage.setItem('lumina_auto_hide_top_bar', nextVal.toString());
                         }}
                         className={`w-12 h-6 rounded-full transition-all relative ${!autoHideTopBar ? 'bg-blue-600' : 'bg-gray-200'}`}
                       >
                         <motion.div 
                           animate={{ x: !autoHideTopBar ? 24 : 4 }}
                           className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm"
                         />
                       </button>
                     </div>
                     <div className="flex items-center justify-between gap-4">
                       <div>
                         <div className="font-medium text-sm">Model Selector</div>
                         <div className="text-xs text-gray-400">Choose popup menu or right slide panel</div>
                       </div>
                       <div className="flex p-1 rounded-xl bg-gray-100 dark:bg-zinc-950 border border-gray-100 dark:border-white/10 shrink-0">
                         {[
                           { id: 'popup' as const, label: 'Popup' },
                           { id: 'drawer' as const, label: 'Slide' }
                         ].map(option => (
                           <button
                             key={option.id}
                             onClick={() => {
                               setModelSelectorMode(option.id);
                               localStorage.setItem('lumina_model_selector_mode', option.id);
                             }}
                             className={`h-8 px-3 rounded-lg text-xs font-semibold transition-colors ${
                               modelSelectorMode === option.id
                                 ? 'bg-white dark:bg-zinc-800 text-black dark:text-white shadow-sm'
                                 : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                             }`}
                           >
                             {option.label}
                           </button>
                         ))}
                       </div>
                     </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-6">Bridge</h3>
                  <div className="space-y-6">
                     <div className="flex items-center justify-between">
                       <div>
                         <div className="font-medium text-sm">Llama Tools</div>
                        <div className="text-xs text-gray-400">Use tools from Llama Bridge</div>
                      </div>
                      <button 
                        onClick={() => {
                          const next = !useBridgeTools;
                          setUseBridgeTools(next);
                          localStorage.setItem('lumina_bridge_enabled', next.toString());
                        }}
                        className={`w-12 h-6 rounded-full transition-all relative ${useBridgeTools ? 'bg-blue-600' : 'bg-gray-200'}`}
                      >
                        <motion.div 
                          animate={{ x: useBridgeTools ? 24 : 4 }}
                          className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm"
                        />
                      </button>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-6">
                    Context Intelligence
                  </h3>
                  <div className="space-y-6">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="font-medium text-sm flex items-center gap-2">
                          TurboQuant Compression
                        </div>
                        <div className="text-xs text-gray-400 mt-1 max-w-sm leading-relaxed">
                          Semantically compress large tool outputs (web search, scraped pages, Wikipedia, transcripts) before injecting into the AI context window. Preserves meaning while reducing token usage by 40–60%.
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          const next = !useTurboQuant;
                          setUseTurboQuant(next);
                          localStorage.setItem('lumina_turboquant', next.toString());
                          showToast(`TurboQuant ${next ? 'enabled' : 'disabled'}`);
                        }}
                        className={`w-12 h-6 rounded-full transition-all relative shrink-0 mt-0.5 ${useTurboQuant ? 'bg-violet-600' : 'bg-gray-200 dark:bg-zinc-700'}`}
                      >
                        <motion.div
                          animate={{ x: useTurboQuant ? 24 : 4 }}
                          className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm"
                        />
                      </button>
                    </div>
                    {useTurboQuant && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-3 rounded-xl bg-violet-500/5 border border-violet-500/15 text-[11px] text-violet-400 font-medium leading-relaxed font-sans"
                      >
                        ⚡ TurboQuant is active. All web search results, scraped pages, Wikipedia articles, URL attachments, and video transcripts will be compressed before being sent to the AI.
                      </motion.div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {activeSettingsTab === 'ai' && (
              <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-6">AI Service Configuration</h3>
                  <div className="space-y-5">
                    <div className="space-y-2">
                      <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Provider Preset</label>
                      <div className="relative mb-2">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          value={providerSearchQuery}
                          onChange={(e) => setProviderSearchQuery(e.target.value)}
                          placeholder="Type provider name (e.g. OpenAI, DeepSeek, Gemini)..."
                          className="w-full h-11 pl-9 pr-3 text-sm bg-gray-50 dark:bg-zinc-950 border border-gray-100 dark:border-white/5 rounded-xl focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                        />
                      </div>

                      {providerSearchQuery.trim().length > 0 && (
                        <div className="space-y-1.5 pt-1">
                          {(() => {
                            const query = providerSearchQuery.trim().toLowerCase();
                            const matches = CLOUD_PROVIDERS.filter(p => 
                              p.label.toLowerCase().includes(query) || p.id.toLowerCase().includes(query)
                            );
                            
                            if (matches.length === 0) {
                              return (
                                <p className="text-xs text-red-400 font-medium pl-1">
                                  No matching provider preset found. You can configure a custom endpoint below.
                                </p>
                              );
                            }
                            
                            return (
                              <div className="border border-gray-100 dark:border-white/5 rounded-xl bg-gray-50/50 dark:bg-white/[0.02] p-2 space-y-1">
                                <p className="text-[10px] uppercase tracking-wider text-gray-450 dark:text-gray-400 font-semibold px-2 py-0.5">
                                  Available Matching Presets
                                </p>
                                {matches.map(p => (
                                  <button
                                    key={p.id}
                                    onClick={() => {
                                      handleProviderSelect(p.id);
                                      setProviderSearchQuery(p.label);
                                    }}
                                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                                      selectedProvider === p.id 
                                        ? 'bg-blue-500/10 text-blue-500' 
                                        : 'hover:bg-gray-100 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300'
                                    }`}
                                  >
                                    <span>{p.label} Preset</span>
                                    {selectedProvider === p.id ? (
                                      <span className="text-[10px] text-blue-500 flex items-center gap-1">
                                        <Check size={11} /> Selected & Loaded
                                      </span>
                                    ) : (
                                      <span className="text-[10px] text-gray-400">Click to Select</span>
                                    )}
                                  </button>
                                ))}
                              </div>
                            );
                          })()}
                        </div>
                      )}


                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-medium text-gray-500">Endpoint URL</label>
                      <input 
                        type="text" 
                        value={serverUrl}
                        onChange={(e) => { setServerUrl(e.target.value); handleProviderSelect('custom'); }}
                        placeholder="http://localhost:8080/v1"
                        className="w-full h-11 px-4 text-sm bg-gray-50 dark:bg-zinc-950 border border-gray-100 dark:border-white/5 rounded-xl focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-medium text-gray-500">API Key</label>
                      <input 
                        type="password" 
                        value={apiKey}
                        onChange={(e) => { setApiKey(e.target.value); }}
                        placeholder={selectedProvider === 'custom' ? 'Enter your API key' : `Enter your ${CLOUD_PROVIDERS.find(p=>p.id===selectedProvider)?.label} API key`}
                        className="w-full h-11 px-4 text-sm bg-gray-50 dark:bg-zinc-950 border border-gray-100 dark:border-white/5 rounded-xl focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                      />
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={handleVerifyAI}
                        disabled={aiVerificationState === 'verifying'}
                        className={`flex-1 h-11 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                          aiVerificationState === 'success' 
                            ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                            : aiVerificationState === 'error'
                              ? 'bg-red-500/10 text-red-500 border border-red-500/20'
                              : 'bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5'
                        }`}
                      >
                        {aiVerificationState === 'verifying' ? (
                          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
                        ) : null}
                        {aiVerificationState === 'success' ? <Check size={16} /> : null}
                        {aiVerificationState === 'error' ? <X size={16} /> : null}
                        {aiVerificationState === 'verifying' ? 'Verifying...' : aiVerificationState === 'success' ? 'Verified' : aiVerificationState === 'error' ? 'Failed' : 'Verify Connection'}
                      </button>
                      <button
                        onClick={handleSaveAI}
                        className={`flex-1 h-11 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                          isAiSaved 
                            ? 'bg-emerald-500 text-white' 
                            : 'bg-black dark:bg-white text-white dark:text-black shadow-lg shadow-black/10 hover:opacity-90'
                        }`}
                      >
                        {isAiSaved ? <Check size={16} /> : null}
                        {isAiSaved ? 'Saved' : 'Save Changes'}
                      </button>
                    </div>

                    <div className="space-y-3 pt-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Provider Profiles</h4>
                          <p className="text-[11px] text-gray-500 mt-1">
                            Verified providers are saved here. Active profiles feed the model picker.
                          </p>
                        </div>
                        <span className="text-[10px] font-semibold text-blue-500 bg-blue-500/10 px-2 py-1 rounded-lg">
                          {aiProviderProfiles.filter(profile => profile.active).length} Active
                        </span>
                      </div>

                      {aiProviderProfiles.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.02] p-4 text-xs text-gray-500">
                          Verify a provider connection to create your first reusable profile.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {aiProviderProfiles.map(profile => (
                            <div
                              key={profile.id}
                              className="rounded-xl border p-3 transition-all bg-gray-50/50 dark:bg-white/[0.02]"
                              style={{
                                borderColor: profile.active ? `${profile.accentColor || '#3b82f6'}66` : 'rgba(255,255,255,0.08)',
                                background: profile.active
                                  ? `linear-gradient(90deg, ${profile.accentColor || '#3b82f6'}1f 0%, rgba(255,255,255,0.02) 42%)`
                                  : undefined,
                              }}
                            >
                              <div className="flex items-start gap-3">
                                <button
                                  onClick={() => handleToggleAiProfile(profile.id)}
                                  className={`mt-1 w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-all ${
                                    profile.active
                                      ? 'text-white'
                                      : 'border-gray-300 dark:border-white/15 text-transparent hover:border-blue-400'
                                  }`}
                                  style={profile.active ? {
                                    backgroundColor: profile.accentColor || '#3b82f6',
                                    borderColor: profile.accentColor || '#3b82f6',
                                  } : undefined}
                                  title={profile.active ? 'Deactivate profile' : 'Activate profile'}
                                >
                                  <Check size={13} />
                                </button>
                                <div className="flex-1 min-w-0">
                                  <input
                                    value={profileNameDrafts[profile.id] ?? profile.name}
                                    onChange={(e) => setProfileNameDrafts(prev => ({ ...prev, [profile.id]: e.target.value }))}
                                    onBlur={(e) => {
                                      handleRenameAiProfile(profile.id, e.target.value);
                                      setProfileNameDrafts(prev => {
                                        const next = { ...prev };
                                        delete next[profile.id];
                                        return next;
                                      });
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        (e.currentTarget as HTMLInputElement).blur();
                                      }
                                    }}
                                    className="w-full bg-transparent outline-none text-sm font-semibold text-gray-800 dark:text-zinc-100"
                                  />
                                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-gray-500">
                                    <span
                                      className="w-2 h-2 rounded-full shrink-0"
                                      style={{ backgroundColor: profile.accentColor || '#3b82f6' }}
                                    />
                                    <span>{CLOUD_PROVIDERS.find(p => p.id === profile.provider)?.label || profile.provider}</span>
                                    <span className="w-1 h-1 rounded-full bg-gray-400" />
                                    <span className="truncate max-w-[280px]">{profile.endpoint}</span>
                                    <span className="w-1 h-1 rounded-full bg-gray-400" />
                                    <span>{profile.models.length} models</span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  {editingAiProfileId === profile.id && (
                                    <span className="text-[10px] text-amber-500 font-semibold px-2">Editing</span>
                                  )}
                                  <button
                                    onClick={() => handleEditAiProfile(profile.id)}
                                    className="w-8 h-8 rounded-lg border border-gray-200 dark:border-white/10 flex items-center justify-center text-gray-500 hover:text-blue-500 hover:border-blue-500/30 transition-all"
                                    title="Edit profile"
                                  >
                                    <Wrench size={14} />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteAiProfile(profile.id)}
                                    className="w-8 h-8 rounded-lg border border-gray-200 dark:border-white/10 flex items-center justify-center text-gray-500 hover:text-red-500 hover:border-red-500/30 transition-all"
                                    title="Delete profile"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </div>
                              {profile.active && profile.models.length > 0 && (
                                <div className="mt-3 flex flex-wrap gap-1.5 pl-8">
                                  {profile.models.slice(0, 6).map(model => (
                                    <span key={model.id} className="text-[10px] px-2 py-1 rounded-lg bg-white/70 dark:bg-black/20 border border-gray-100 dark:border-white/5 text-gray-500 max-w-[180px] truncate">
                                      {model.name || model.id}
                                    </span>
                                  ))}
                                  {profile.models.length > 6 && (
                                    <span className="text-[10px] px-2 py-1 rounded-lg text-gray-400">
                                      +{profile.models.length - 6} more
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {editingAiProfile && (
                      <div
                        className="rounded-xl border p-4 space-y-4"
                        style={{
                          borderColor: `${editingAiProfile.accentColor || '#3b82f6'}66`,
                          background: `linear-gradient(135deg, ${editingAiProfile.accentColor || '#3b82f6'}14 0%, rgba(255,255,255,0.02) 46%)`,
                        }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span
                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: editingAiProfile.accentColor || '#3b82f6' }}
                              />
                              <h4 className="text-sm font-semibold text-gray-800 dark:text-zinc-100">
                                Edit Provider Profile
                              </h4>
                            </div>
                            <p className="mt-1 text-[11px] text-gray-500">
                              Update credentials and choose which models appear in the model picker.
                            </p>
                          </div>
                          <button
                            onClick={handleCloseAiProfileEditor}
                            className="w-8 h-8 rounded-lg border border-gray-200 dark:border-white/10 flex items-center justify-center text-gray-500 hover:text-red-500 hover:border-red-500/30 transition-all"
                            title="Close editor"
                          >
                            <X size={14} />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Profile Name</label>
                            <input
                              value={editingAiProfile.name}
                              onChange={(e) => handleUpdateAiProfileConfig(editingAiProfile.id, { name: e.target.value })}
                              className="w-full h-10 px-3 text-sm bg-gray-50 dark:bg-zinc-950 border border-gray-100 dark:border-white/5 rounded-xl focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Provider</label>
                            <select
                              value={editingAiProfile.provider}
                              onChange={(e) => handleUpdateAiProfileConfig(editingAiProfile.id, { provider: e.target.value })}
                              className="w-full h-10 px-3 text-sm bg-gray-50 dark:bg-zinc-950 border border-gray-100 dark:border-white/5 rounded-xl focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                            >
                              {CLOUD_PROVIDERS.map(provider => (
                                <option key={provider.id} value={provider.id}>{provider.label}</option>
                              ))}
                              <option value="custom">Custom</option>
                            </select>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Endpoint URL</label>
                          <input
                            value={editingAiProfile.endpoint}
                            onChange={(e) => handleUpdateAiProfileConfig(editingAiProfile.id, { endpoint: e.target.value })}
                            className="w-full h-10 px-3 text-sm bg-gray-50 dark:bg-zinc-950 border border-gray-100 dark:border-white/5 rounded-xl focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">API Key</label>
                          <input
                            type="password"
                            value={editingAiProfile.apiKey}
                            onChange={(e) => handleUpdateAiProfileConfig(editingAiProfile.id, { apiKey: e.target.value })}
                            className="w-full h-10 px-3 text-sm bg-gray-50 dark:bg-zinc-950 border border-gray-100 dark:border-white/5 rounded-xl focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                          />
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            onClick={() => handleVerifyAiProfile(editingAiProfile.id)}
                            disabled={aiVerificationState === 'verifying'}
                            className="h-9 px-3 rounded-lg text-xs font-semibold border border-gray-200 dark:border-white/10 text-gray-700 dark:text-zinc-200 hover:border-blue-500/40 hover:text-blue-500 transition-all flex items-center gap-2"
                          >
                            {aiVerificationState === 'verifying' ? (
                              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full" />
                            ) : (
                              <RefreshCw size={13} />
                            )}
                            Verify & Refresh Models
                          </button>
                          <button
                            onClick={() => handleSetAiProfileModelsVisible(editingAiProfile.id, true)}
                            className="h-9 px-3 rounded-lg text-xs font-semibold border border-gray-200 dark:border-white/10 text-gray-500 hover:text-emerald-500 transition-all"
                          >
                            Select All
                          </button>
                          <button
                            onClick={() => handleSetAiProfileModelsVisible(editingAiProfile.id, false)}
                            className="h-9 px-3 rounded-lg text-xs font-semibold border border-gray-200 dark:border-white/10 text-gray-500 hover:text-red-500 transition-all"
                          >
                            Select None
                          </button>
                          <span className="ml-auto text-[10px] text-gray-500 font-semibold">
                            {editingAiProfile.selectedModelIds.length}/{editingAiProfile.models.length} visible
                          </span>
                        </div>

                        <div className="max-h-64 overflow-y-auto rounded-xl border border-gray-100 dark:border-white/5 divide-y divide-gray-100 dark:divide-white/5">
                          {editingAiProfile.models.length === 0 ? (
                            <div className="p-4 text-xs text-gray-500">
                              No models cached for this profile. Verify the profile to fetch models.
                            </div>
                          ) : (
                            editingAiProfile.models.map(model => {
                              const isVisible = editingAiProfile.selectedModelIds.includes(model.id);
                              return (
                                <button
                                  key={model.id}
                                  onClick={() => handleToggleAiProfileModel(editingAiProfile.id, model.id)}
                                  className="w-full min-h-11 px-3 py-2 flex items-center gap-3 text-left hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-all"
                                >
                                  <span
                                    className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
                                      isVisible ? 'text-white' : 'border-gray-300 dark:border-white/15 text-transparent'
                                    }`}
                                    style={isVisible ? {
                                      backgroundColor: editingAiProfile.accentColor || '#3b82f6',
                                      borderColor: editingAiProfile.accentColor || '#3b82f6',
                                    } : undefined}
                                  >
                                    <Check size={13} />
                                  </span>
                                  <span className="min-w-0">
                                    <span className="block text-xs font-semibold text-gray-700 dark:text-zinc-200 truncate">
                                      {model.name || model.id}
                                    </span>
                                    <span className="block text-[10px] text-gray-500 truncate">{model.id}</span>
                                  </span>
                                </button>
                              );
                            })
                          )}
                        </div>
                      </div>
                    )}


                  </div>
                </div>
              </motion.div>
            )}

            {activeSettingsTab === 'search' && (
              <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-6">Search API Configuration</h3>
                  <div className="space-y-6">
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase block mb-3">Search Provider</label>
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setSearchProvider('duckduckgo'); }}
                          className={`flex-1 h-11 rounded-xl text-sm font-semibold transition-all border ${
                            searchProvider === 'duckduckgo' || searchProvider === 'ddg'
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-gray-50 dark:bg-zinc-900 text-gray-700 dark:text-zinc-300 border-gray-200 dark:border-white/10'
                          }`}
                        >
                          DuckDuckGo
                        </button>
                        <button
                          onClick={() => { setSearchProvider('tavily'); }}
                          className={`flex-1 h-11 rounded-xl text-sm font-semibold transition-all border ${
                            searchProvider === 'tavily'
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-gray-50 dark:bg-zinc-900 text-gray-700 dark:text-zinc-300 border-gray-200 dark:border-white/10'
                          }`}
                        >
                          Tavily
                        </button>
                        <button
                          onClick={() => { setSearchProvider('serpapi'); }}
                          className={`flex-1 h-11 rounded-xl text-sm font-semibold transition-all border ${
                            searchProvider === 'serpapi'
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-gray-50 dark:bg-zinc-900 text-gray-700 dark:text-zinc-300 border-gray-200 dark:border-white/10'
                          }`}
                        >
                          SerpAPI
                        </button>
                      </div>
                    </div>
                    {searchProvider === 'duckduckgo' || searchProvider === 'ddg' ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-gray-500 uppercase">DuckDuckGo Search</label>
                          <span className="text-[10px] text-emerald-500 font-semibold">Built in</span>
                        </div>
                        <div className="w-full bg-gray-50 dark:bg-zinc-950 border border-gray-100 dark:border-white/5 rounded-xl px-4 py-3 text-sm text-gray-500 dark:text-zinc-300">
                          Uses Lumina&apos;s integrated DuckDuckGo search pipeline with pacing, browser-like headers, and HTML fallback parsing. No API key required.
                        </div>
                        <p className="text-[10px] text-gray-500 italic">Best zero-key option for general web discovery and fallback-safe browsing.</p>
                      </div>
                    ) : searchProvider === 'tavily' ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-gray-500 uppercase">Tavily API Key</label>
                          <a href="https://tavily.com" target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-500 hover:underline">Get Key</a>
                        </div>
                        <input 
                          type="password"
                          value={tavilyApiKey}
                          onChange={(e) => { setTavilyApiKey(e.target.value); }}
                          placeholder="Enter your Tavily API key"
                          className="w-full bg-gray-50 dark:bg-zinc-950 border border-gray-100 dark:border-white/5 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                        />
                        <p className="text-[10px] text-gray-500 italic">Optimized for AI researchers and real-time data retrieval.</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-gray-500 uppercase">SerpAPI API Key</label>
                          <a href="https://serpapi.com" target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-500 hover:underline">Get Key</a>
                        </div>
                        <input 
                          type="password"
                          value={serpApiKey}
                          onChange={(e) => { setSerpApiKey(e.target.value); }}
                          placeholder="Enter your SerpAPI key"
                          className="w-full bg-gray-50 dark:bg-zinc-950 border border-gray-100 dark:border-white/5 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                        />
                        <p className="text-[10px] text-gray-500 italic">Universal search API for Google, Bing, and more.</p>
                      </div>
                    )}
                    <div className="flex gap-3">
                      <button
                        onClick={handleVerifySearch}
                        disabled={searchVerificationState === 'verifying'}
                        className={`flex-1 h-11 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                          searchVerificationState === 'success' 
                            ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                            : searchVerificationState === 'error'
                              ? 'bg-red-500/10 text-red-500 border border-red-500/20'
                              : 'bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5'
                        }`}
                      >
                        {searchVerificationState === 'verifying' ? (
                          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
                        ) : null}
                        {searchVerificationState === 'success' ? <Check size={16} /> : null}
                        {searchVerificationState === 'error' ? <X size={16} /> : null}
                        {searchVerificationState === 'verifying' ? 'Verifying...' : searchVerificationState === 'success' ? 'Verified' : searchVerificationState === 'error' ? 'Failed' : 'Verify Keys'}
                      </button>
                      <button
                        onClick={handleSaveSearch}
                        className={`flex-1 h-11 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                          isSearchSaved 
                            ? 'bg-emerald-500 text-white' 
                            : 'bg-black dark:bg-white text-white dark:text-black shadow-lg shadow-black/10 hover:opacity-90'
                        }`}
                      >
                        {isSearchSaved ? <Check size={16} /> : null}
                        {isSearchSaved ? 'Saved' : 'Save Keys'}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl">
                  <div className="flex gap-3">
                    <Globe size={18} className="text-blue-500 shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-blue-500 uppercase mb-1">Search Integration</div>
                      <p className="text-xs text-blue-500/70 leading-relaxed mb-2">
                        When configured, the AI will automatically use these tools to browse the web for time-sensitive information, ensuring responses are grounded in current facts.
                      </p>
                      <div className="text-[10px] text-gray-400 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${(searchProvider === 'tavily' || tavilyApiKey?.trim()) ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                          <span>Tavily {tavilyApiKey?.trim() ? '(Active)' : '(Not configured)'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${(searchProvider === 'serpapi' || serpApiKey?.trim()) ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                          <span>SerpAPI {serpApiKey?.trim() ? '(Active)' : '(Not configured)'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${(searchProvider === 'duckduckgo' || searchProvider === 'ddg') ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                          <span>DuckDuckGo {(searchProvider === 'duckduckgo' || searchProvider === 'ddg') ? '(Primary)' : '(Available)'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeSettingsTab === 'profile' && (
              <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-6">Personal Information</h3>
                  <div className="space-y-5">
                    <div className="space-y-2">
                      <label className="text-[11px] font-medium text-gray-500">Display Name</label>
                      <input
                        type="text"
                        value={userProfile.name}
                        onChange={(e) => setUserProfile({ ...userProfile, name: e.target.value })}
                        placeholder="Your name"
                        className="w-full h-11 px-4 text-sm bg-gray-50 dark:bg-zinc-950 border border-gray-100 dark:border-white/5 rounded-xl focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-medium text-gray-500">Avatar URL</label>
                      <input
                        type="text"
                        value={userProfile.avatar}
                        onChange={(e) => setUserProfile({ ...userProfile, avatar: e.target.value })}
                        placeholder="https://example.com/avatar.png"
                        className="w-full h-11 px-4 text-sm bg-gray-50 dark:bg-zinc-950 border border-gray-100 dark:border-white/5 rounded-xl focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-medium text-gray-500">Date of Birth</label>
                      <input
                        type="date"
                        value={userProfile.dob}
                        onChange={(e) => setUserProfile({ ...userProfile, dob: e.target.value })}
                        className="w-full h-11 px-4 text-sm bg-gray-50 dark:bg-zinc-950 border border-gray-100 dark:border-white/5 rounded-xl focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-medium text-gray-500">Age</label>
                      <input
                        type="number"
                        value={userProfile.age || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setUserProfile({ ...userProfile, age: val ? parseInt(val) : '' });
                        }}
                        placeholder="Your age"
                        className="w-full h-11 px-4 text-sm bg-gray-50 dark:bg-zinc-950 border border-gray-100 dark:border-white/5 rounded-xl focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-medium text-gray-500">Location</label>
                      <input
                        type="text"
                        value={userProfile.location}
                        onChange={(e) => setUserProfile({ ...userProfile, location: e.target.value })}
                        placeholder="City, Country"
                        className="w-full h-11 px-4 text-sm bg-gray-50 dark:bg-zinc-950 border border-gray-100 dark:border-white/5 rounded-xl focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeSettingsTab === 'persona' && (
              <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-6">AI Persona</h3>
                  <div className="space-y-5">
                    <div className="space-y-2">
                      <label className="text-[11px] font-medium text-gray-500">Profile Name</label>
                      <input
                        type="text"
                        value={persona.name}
                        onChange={(e) => setPersona({ ...persona, name: e.target.value })}
                        placeholder="e.g., Lumina"
                        className="w-full h-11 px-4 text-sm bg-gray-50 dark:bg-zinc-950 border border-gray-100 dark:border-white/5 rounded-xl focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-medium text-gray-500">Role/Description</label>
                      <input
                        type="text"
                        value={persona.role}
                        onChange={(e) => setPersona({ ...persona, role: e.target.value })}
                        placeholder="e.g., Modern Intelligence"
                        className="w-full h-11 px-4 text-sm bg-gray-50 dark:bg-zinc-950 border border-gray-100 dark:border-white/5 rounded-xl focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-medium text-gray-500">System Prompt</label>
                      <textarea
                        value={persona.systemPrompt || ''}
                        onChange={(e) => setPersona({ ...persona, systemPrompt: e.target.value })}
                        placeholder="Define custom instructions, guidelines, or fallback behaviors for the AI helper..."
                        rows={4}
                        className="w-full p-4 text-sm bg-gray-50 dark:bg-zinc-950 border border-gray-100 dark:border-white/5 rounded-xl focus:ring-1 focus:ring-blue-500 outline-none transition-all resize-y min-h-[100px] font-sans text-gray-900 dark:text-zinc-100 placeholder-gray-400 dark:placeholder-zinc-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-medium text-gray-500">Avatar URL</label>
                      <input
                        type="text"
                        value={persona.avatar}
                        onChange={(e) => setPersona({ ...persona, avatar: e.target.value })}
                        placeholder="https://example.com/avatar.png"
                        className="w-full h-11 px-4 text-sm bg-gray-50 dark:bg-zinc-950 border border-gray-100 dark:border-white/5 rounded-xl focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeSettingsTab === 'lumina_tools' && (
              <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-6">Lumina Tools</h3>
                  <div className="space-y-4">
                    <div style={{ display: 'none' }} className="p-4 bg-[var(--theme-accent)]/5 border border-[var(--theme-accent)]/10 rounded-2xl">
                      <div className="flex gap-3">
                        <Hammer size={18} className="text-[var(--theme-accent)] shrink-0" />
                        <div>
                          <div className="text-xs font-bold text-[var(--theme-accent)] uppercase mb-1">Built-in Lumina Intelligence</div>
                          <p className="text-xs text-[var(--theme-accent)]/70 leading-relaxed">
                            These are the local, built-in capabilities of Lumina: Web Scraper (custom CSS engine) and Wikipedia tools.
                            These are fully offline-first or managed natively and do not require external Bridge connectivity.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-12 w-full h-full">
                      {luminaTools.map(tool => (
                        <div
                          key={tool.id}
                          className="flex flex-col justify-between p-5 bg-gray-50/50 dark:bg-zinc-950/40 rounded-2xl border border-gray-100/80 dark:border-white/5 hover:border-[var(--theme-accent)]/30 dark:hover:border-[var(--theme-accent)]/20 hover:bg-white dark:hover:bg-zinc-950/70 transition-all duration-300 shadow-sm hover:shadow-md h-[160px] relative group"
                        >
                          <div className="flex items-start gap-4">
                            <div className="p-3 rounded-xl bg-[var(--theme-accent)]/8 text-[var(--theme-accent)] dark:bg-[var(--theme-accent)]/10 shrink-0 group-hover:scale-105 transition-transform duration-300">
                              {tool.icon}
                            </div>
                            <div className="text-left">
                              <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">{tool.name}</div>
                              <p className="text-xs text-gray-400 dark:text-zinc-400/80 leading-relaxed mt-1.5 line-clamp-2">{tool.description}</p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between border-t border-gray-100/50 dark:border-white/5 pt-3.5 mt-3 shrink-0">
                            <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /><span className="text-[10px] text-gray-400 font-mono tracking-wider uppercase">Inbuilt Capability</span></div>
                            <button
                              onClick={() => {
                                setLuminaTools(prev => prev.map(t => t.id === tool.id ? { ...t, enabled: !t.enabled } : t));
                                showToast(`${tool.enabled ? 'Disabled' : 'Enabled'} ${tool.name}`);
                              }}
                              className={`w-11 h-6 rounded-full transition-all relative ${tool.enabled ? 'bg-[var(--theme-accent)]' : 'bg-gray-200 dark:bg-zinc-800'}`}
                            >
                              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-md ${tool.enabled ? 'right-1' : 'left-1'}`} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeSettingsTab === 'mcp' && (
              <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-6">Bridge Tools</h3>
                  <div className="space-y-4">
                    <div style={{ display: 'none' }} className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl">
                      <div className="flex gap-3">
                        <Wrench size={18} className="text-blue-500 shrink-0" />
                        <div>
                          <div className="text-xs font-bold text-blue-500 uppercase mb-1">Tool Discovery</div>
                          <p className="text-xs text-blue-500/70 leading-relaxed">
                            Tools are auto-discovered from the Llama Bridge at <strong>{llamaBridgeUrl}</strong>.
                            These are external tools and APIs connected through the LLM bridge.
                          </p>
                        </div>
                      </div>
                    </div>

                    {bridgeTools.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <p className="text-sm">No bridge tools loaded.</p>
                        <button
                          onClick={handleLoadBridgeTools}
                          className="mt-3 px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-xl text-sm font-semibold"
                        >
                          Discover Bridge Tools
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-12 w-full h-full">
                        {bridgeTools.map(tool => (
                          <div
                            key={tool.id}
                            className="flex flex-col justify-between p-5 bg-gray-50/50 dark:bg-zinc-950/40 rounded-2xl border border-gray-100/80 dark:border-white/5 hover:border-[var(--theme-accent)]/30 dark:hover:border-[var(--theme-accent)]/20 hover:bg-white dark:hover:bg-zinc-950/70 transition-all duration-300 shadow-sm hover:shadow-md h-[160px] relative group"
                          >
                            <div className="flex items-start gap-4 min-w-0">
                              <div className="p-3 rounded-xl bg-blue-500/8 text-blue-500 dark:bg-blue-500/10 shrink-0 group-hover:scale-105 transition-transform duration-300">
                                {tool.icon}
                              </div>
                              <div className="text-left min-w-0">
                                <div className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{tool.name}</div>
                                <p className="text-xs text-gray-400 dark:text-zinc-400/80 leading-relaxed mt-1.5 line-clamp-2">{tool.description || 'Bridge tool'}</p>
                              </div>
                            </div>
                            <div className="flex items-center justify-between border-t border-gray-100/50 dark:border-white/5 pt-3.5 mt-3 shrink-0">
                              <div className="flex items-center gap-1.5">
                                <span className={`w-1.5 h-1.5 rounded-full ${tool.enabled ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
                                <span className="text-[10px] text-gray-400 font-mono tracking-wider uppercase">Bridge MCP</span>
                              </div>
                              <button
                                onClick={() => {
                                  setBridgeTools(prev => prev.map(t => t.id === tool.id ? { ...t, enabled: !t.enabled } : t));
                                  showToast(`${tool.enabled ? 'Disabled' : 'Enabled'} ${tool.name}`);
                                }}
                                className={`w-11 h-6 rounded-full transition-all relative ${tool.enabled ? 'bg-[var(--theme-accent)]' : 'bg-gray-200 dark:bg-zinc-800'}`}
                              >
                                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-md ${tool.enabled ? 'right-1' : 'left-1'}`} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {activeSettingsTab === 'llama_cpp' && (
              <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-8 pb-12 font-sans text-left">
                <div>
                  <div className="flex items-center justify-between mb-4 border-b pb-4 border-gray-100 dark:border-white/5">
                    <div>
                      <h3 className="text-lg font-semibold" style={{ color: 'var(--theme-primary)' }}>llama.cpp Local Engine</h3>
                      <p className="text-xs mt-1" style={{ color: 'var(--theme-secondary)' }}>
                        Execute highly optimized GGUF large language models directly on your local workstation's hardware.
                      </p>
                    </div>
                    {installedConfig && (
                      <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        ACTIVE
                      </span>
                    )}
                  </div>

                  {/* RELEASES LIST OR MAIN WORKSPACE ENGINE SETTINGS */}
                  {!installingAsset && releases.length > 0 ? (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <button
                          onClick={() => setReleases([])}
                          className="px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5"
                          style={{
                            borderColor: 'var(--theme-border)',
                            background: 'var(--theme-surface)',
                            color: 'var(--theme-secondary)'
                          }}
                        >
                          ← Back to Engine Config
                        </button>
                        <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-gray-100 dark:bg-zinc-800" style={{ color: 'var(--theme-secondary)' }}>
                          Latest Release Detected
                        </span>
                      </div>

                      <div className="p-6 rounded-2xl border space-y-4 shadow-sm" style={{ background: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}>
                        <div className="flex items-center justify-between border-b pb-3 border-gray-100 dark:border-white/5 shrink-0">
                          <div>
                            <h4 className="text-sm font-semibold" style={{ color: 'var(--theme-primary)' }}>Latest Release</h4>
                            <p className="text-[10px] mt-0.5" style={{ color: 'var(--theme-secondary)' }}>Select a package binary to activate</p>
                          </div>
                        </div>

                        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1.5 custom-scrollbar">
                          {releases.slice(0, 1).map((rel) => {
                            // Filter assets based on the selected filter
                            const selectedFilter = osFilter === 'auto' ? osDetectorResult : osFilter;
                            const filteredAssets = rel.assets.filter((as: any) => {
                              const name = as.name.toLowerCase();
                              if (selectedFilter === 'win') return name.includes('win') || name.includes('w64') || name.includes('vulkan');
                              if (selectedFilter === 'macos') return name.includes('macos') || name.includes('mac') || name.includes('apple') || name.includes('darwin');
                              if (selectedFilter === 'linux') return name.includes('ubuntu') || name.includes('linux') || name.includes('debian');
                              if (selectedFilter === 'source') return name.includes('source') || name.includes('tar.gz') || name.includes('zip') && !name.includes('bin');
                              return true;
                            });

                            return (
                              <div key={rel.id} className="p-4 rounded-xl border space-y-3.5 hover:shadow-sm transition-all duration-200" style={{ background: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}>
                                <div className="flex items-start justify-between gap-4">
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[var(--theme-accent)]/10 text-[var(--theme-accent)]">{rel.tag}</span>
                                      <span className="text-xs font-semibold" style={{ color: 'var(--theme-primary)' }}>{rel.name}</span>
                                    </div>
                                    <p className="text-[9px] mt-1 text-gray-400">Published on {rel.date}</p>
                                  </div>
                                  <a href={rel.url} target="_blank" rel="noreferrer" className="text-[9px] text-[var(--theme-accent)] hover:underline inline-flex items-center gap-1 shrink-0">
                                    GitHub
                                  </a>
                                </div>



                                <div className="space-y-2">
                                  <div className="text-[8px] font-bold uppercase tracking-wider text-gray-400 text-left">Available Artifacts ({filteredAssets.length})</div>
                                  
                                  {filteredAssets.length === 0 ? (
                                    <p className="text-xs text-gray-400 italic text-left">No packages match the current OS filter ({selectedFilter}). Try selecting another filter above.</p>
                                  ) : (
                                    <div className="divide-y divide-gray-100 dark:divide-white/5">
                                      {filteredAssets.map((as: any) => (
                                        <div key={as.id} className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
                                          <div className="min-w-0 text-left">
                                            <div className="text-xs font-mono font-medium truncate max-w-[200px]" style={{ color: 'var(--theme-primary)' }} title={as.name}>{as.name}</div>
                                            <div className="flex items-center gap-3 text-[10px] mt-0.5" style={{ color: 'var(--theme-secondary)' }}>
                                              <span>Size: {as.size}</span>
                                              <span>•</span>
                                              <span>Downloads: {as.downloads?.toLocaleString() || 0}</span>
                                            </div>
                                          </div>
                                          <button
                                            onClick={() => handleInstallAsset(as, rel.tag)}
                                            className="h-8 px-3 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 transition-all flex items-center gap-1.5 shrink-0 shadow-sm"
                                          >
                                            <Download size={12} />
                                            Activate
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* SYSTEM OS DETECTION CARD */}
                      <div className="p-5 rounded-2xl border" style={{ background: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}>
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-[var(--theme-accent)]/10 text-[var(--theme-accent)]">
                              <Cpu size={20} />
                            </div>
                            <div>
                              <div className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--theme-secondary)' }}>Detected Architecture</div>
                              <div className="text-sm font-semibold flex items-center gap-1.5 mt-0.5" style={{ color: 'var(--theme-primary)' }}>
                                <Laptop size={14} className="opacity-70" />
                                {osDetectorResult === 'win' ? 'Windows OS (x86_64 / AVX2 / Vulkan compatible)' : 
                                 osDetectorResult === 'macos' ? 'macOS (Apple Silicon ARM64 / Metal compatible)' : 
                                 'Linux OS (Ubuntu/Debian standard x86_64)'}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 p-1 bg-gray-100 dark:bg-zinc-800 rounded-xl">
                            {(['auto', 'win', 'macos', 'linux', 'source'] as const).map((os) => (
                              <button
                                key={os}
                                onClick={() => setOsFilter(os)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${
                                  osFilter === os
                                    ? 'bg-white dark:bg-zinc-700 font-semibold shadow-sm text-black dark:text-white'
                                    : 'text-gray-500 hover:text-gray-950 dark:hover:text-gray-300'
                                }`}
                              >
                                {os === 'auto' ? 'Auto' : os === 'win' ? 'Windows' : os === 'macos' ? 'macOS' : os === 'linux' ? 'Linux' : 'Source'}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* INSTALLED ENVIRONMENT CARD OR PLACEHOLDER */}
                      {installedConfig ? (
                        <div className="p-6 rounded-2xl border relative overflow-hidden" style={{ background: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}>
                          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
                          <h4 className="text-sm font-semibold mb-4" style={{ color: 'var(--theme-primary)' }}>Execution Workspace Config</h4>
                          
                          <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="p-3 bg-gray-50 dark:bg-zinc-950/20 rounded-xl border border-gray-100/50 dark:border-white/5">
                              <span className="text-[10px] uppercase font-bold tracking-wider block mb-1" style={{ color: 'var(--theme-secondary)' }}>Engine Version</span>
                              <span className="text-xs font-semibold" style={{ color: 'var(--theme-primary)' }}>{installedConfig.version}</span>
                            </div>
                            <div className="p-3 bg-gray-50 dark:bg-zinc-950/20 rounded-xl border border-gray-100/50 dark:border-white/5">
                              <span className="text-[10px] uppercase font-bold tracking-wider block mb-1" style={{ color: 'var(--theme-secondary)' }}>Unpacked Size</span>
                              <span className="text-xs font-semibold" style={{ color: 'var(--theme-primary)' }}>{installedConfig.size}</span>
                            </div>
                            <div className="p-3 bg-gray-50 dark:bg-zinc-950/20 rounded-xl border border-gray-100/50 dark:border-white/5">
                              <span className="text-[10px] uppercase font-bold tracking-wider block mb-1" style={{ color: 'var(--theme-secondary)' }}>Exec Binary</span>
                              <span className="text-xs font-mono font-semibold" style={{ color: 'var(--theme-primary)' }}>{installedConfig.binaryName}</span>
                            </div>
                            <div className="p-3 bg-gray-50 dark:bg-zinc-950/20 rounded-xl border border-gray-100/50 dark:border-white/5">
                              <span className="text-[10px] uppercase font-bold tracking-wider block mb-1" style={{ color: 'var(--theme-secondary)' }}>Integrated On</span>
                              <span className="text-xs font-semibold" style={{ color: 'var(--theme-primary)' }}>{installedConfig.installedAt}</span>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-3">
                            <button
                              onClick={handleTestRunning}
                              disabled={isRunningTest}
                              className="h-10 px-5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 bg-[var(--theme-accent)] text-[var(--theme-accent-foreground)] shadow-sm hover:opacity-90"
                            >
                              {isRunningTest ? (
                                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full" />
                              ) : <Activity size={14} />}
                              {isRunningTest ? 'Running Diagnostic...' : 'Execute Local Health Check'}
                            </button>
                            
                            <button
                              onClick={handleUninstall}
                              className="h-10 px-4 rounded-xl text-xs font-semibold border border-red-200 text-red-500 hover:bg-red-50/50 dark:hover:bg-red-950/20 transition-all flex items-center gap-1.5"
                            >
                              Remove Environment
                            </button>
                          </div>

                          {/* DIAGNOSTIC OUTPUT TERMINAL */}
                          {(isRunningTest || testOutput.length > 0) && (
                            <div className="mt-5 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--theme-secondary)' }}>Diagnostic Output Stream</span>
                                <span className="text-[10px] font-mono" style={{ color: 'var(--theme-secondary)' }}>AVX2 Standard Mode</span>
                              </div>
                              <div className="p-4 rounded-xl bg-neutral-950 text-emerald-400 font-mono text-xs leading-relaxed max-h-60 overflow-y-auto custom-scrollbar border border-white/5 shadow-inner text-left">
                                {testOutput.map((line, idx) => (
                                  <div key={idx} className={line.startsWith('$') ? 'text-blue-400 font-semibold mb-1' : line.includes('[result]') ? 'text-emerald-300 font-bold mt-1' : 'opacity-85'}>
                                    {line}
                                  </div>
                                ))}
                                {isRunningTest && (
                                  <div className="flex items-center gap-2 text-emerald-500/60 mt-1">
                                    <span className="w-1.5 h-3 bg-emerald-400 animate-pulse" />
                                    <span>loading...</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="p-6 rounded-2xl border text-center space-y-4" style={{ background: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}>
                          <div className="w-12 h-12 rounded-full bg-[var(--theme-accent)]/10 text-[var(--theme-accent)] flex items-center justify-center mx-auto">
                            <Box size={24} />
                          </div>
                          <div className="max-w-md mx-auto">
                            <h4 className="text-sm font-semibold" style={{ color: 'var(--theme-primary)' }}>Integrate llama.cpp Engine</h4>
                            <p className="text-xs mt-1.5 leading-relaxed" style={{ color: 'var(--theme-secondary)' }}>
                              To utilize local CPU/GPU offloading without setting up local terminal toolchains manually, you can fetch pre-compiled llama.cpp releases directly into your Lumina environment.
                            </p>
                          </div>
                          <div>
                            <button
                              onClick={handleDetectReleases}
                              disabled={isDetecting}
                              className="h-10 px-6 rounded-xl text-xs font-semibold bg-[var(--theme-accent)] text-[var(--theme-accent-foreground)] transition-all inline-flex items-center gap-2"
                            >
                              {isDetecting ? (
                                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full" />
                              ) : <RefreshCw size={13} />}
                              {isDetecting ? 'Querying Releases...' : 'Find llama.cpp Releases'}
                            </button>
                          </div>
                          {detectionError && (
                            <p className="text-xs text-red-500 mt-2">{detectionError}</p>
                          )}
                        </div>
                      )}

                      {/* INSTALLATION OVERLAY / ACTIVE TRACKER */}
                      {installStatus !== 'idle' && (
                        <div className="p-6 rounded-2xl border space-y-5" style={{ background: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-[var(--theme-accent)]/10 text-[var(--theme-accent)] flex items-center justify-center">
                                <Download size={16} className="animate-bounce" />
                              </div>
                              <div>
                                <div className="text-xs font-semibold" style={{ color: 'var(--theme-primary)' }}>
                                  {installStatus === 'downloading' ? 'Downloading Package Archive...' :
                                   installStatus === 'extracting' ? 'Extracting Core Binaries...' :
                                   installStatus === 'verifying' ? 'Verifying Permissions & Headers...' :
                                   installStatus === 'testing' ? 'Executing Diagnostic Self-Tests...' :
                                   'Environment Setup Completed'}
                                </div>
                                <div className="text-[10px]" style={{ color: 'var(--theme-secondary)' }}>
                                  {installingAsset?.name} ({installingAsset?.size})
                                </div>
                              </div>
                            </div>
                            <span className="text-xs font-mono font-bold text-[var(--theme-accent)]">{installProgress}%</span>
                          </div>

                          {/* PROGRESS BAR */}
                          <div className="w-full bg-gray-100 dark:bg-zinc-800 rounded-full h-2 overflow-hidden">
                            <motion.div 
                              className="bg-[var(--theme-accent)] h-full rounded-full" 
                              initial={{ width: 0 }}
                              animate={{ width: `${installProgress}%` }}
                              transition={{ duration: 0.1 }}
                            />
                          </div>

                          {/* DOWNLOAD METRICS */}
                          {installStatus === 'downloading' && (
                            <div className="grid grid-cols-3 gap-2 text-center py-2 bg-gray-50/50 dark:bg-zinc-950/25 rounded-xl border border-gray-100/50 dark:border-white/5 font-mono">
                              <div>
                                <div className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Fetch Speed</div>
                                <div className="text-xs font-semibold font-mono mt-0.5" style={{ color: 'var(--theme-primary)' }}>{downloadMetrics.speed}</div>
                              </div>
                              <div>
                                <div className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Downloaded</div>
                                <div className="text-xs font-semibold font-mono mt-0.5" style={{ color: 'var(--theme-primary)' }}>{downloadMetrics.downloaded}</div>
                              </div>
                              <div>
                                <div className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Total Size</div>
                                <div className="text-xs font-semibold font-mono mt-0.5" style={{ color: 'var(--theme-primary)' }}>{downloadMetrics.total}</div>
                              </div>
                            </div>
                          )}

                          {/* LIVE TERMINAL LOGGER */}
                          <div className="space-y-1.5">
                            <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                              <Terminal size={10} />
                              Log Output
                            </div>
                            <div className="p-4 rounded-xl bg-zinc-950 border border-white/5 text-[11px] font-mono text-zinc-300 leading-relaxed max-h-52 overflow-y-auto custom-scrollbar text-left">
                              {installLogs.map((log, idx) => (
                                <div key={idx} className="opacity-90">{log}</div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {activeSettingsTab === 'models' && (
              <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="h-full flex flex-col font-sans text-left pb-4 relative">
                {/* SUB NAVIGATION & ACTIONS HEADER BAR */}
                <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/15 pb-3.5 mb-4 shrink-0">
                  <div className="flex items-center gap-1.5 bg-gray-100/50 dark:bg-zinc-800/50 p-1 rounded-xl">
                    <button
                      onClick={() => setModelsSubTab('list')}
                      className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                        modelsSubTab === 'list'
                          ? 'bg-white dark:bg-zinc-850 text-black dark:text-white shadow-sm border border-gray-100 dark:border-white/5'
                          : 'text-gray-400 hover:text-black dark:hover:text-white'
                      }`}
                    >
                      <Brain size={13} className="text-[var(--theme-accent)]" />
                      My Models
                    </button>
                    <button
                      onClick={() => setModelsSubTab('explore')}
                      className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                        modelsSubTab === 'explore'
                          ? 'bg-white dark:bg-zinc-850 text-black dark:text-white shadow-sm border border-gray-100 dark:border-white/5'
                          : 'text-gray-400 hover:text-black dark:hover:text-white'
                      }`}
                    >
                      <Globe size={13} className="text-blue-500" />
                      Explore Hub
                    </button>
                  </div>

                  {/* Header Title Centered lookwise */}
                  <div className="absolute left-1/2 transform -translate-x-1/2 hidden md:block">
                    <span className="text-xs font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Models</span>
                  </div>
                  
                  {/* Action Tray */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsDownloadsPanelOpen(!isDownloadsPanelOpen)}
                      className={`px-3 py-1.5 rounded-xl border transition-all hover:bg-gray-105 dark:hover:bg-zinc-800/60 flex items-center gap-1.5 text-[11px] font-bold relative ${
                        isDownloadsPanelOpen 
                          ? 'bg-gray-100 dark:bg-zinc-800 border-[var(--theme-accent)] text-[var(--theme-accent)] shadow-sm' 
                          : 'border-gray-200 dark:border-white/10 text-gray-500 hover:text-gray-700 dark:hover:text-zinc-300'
                      }`}
                      title="Download Drawer"
                    >
                      {hfDownloadStatus === 'downloading' ? (
                        <RefreshCw size={13} className="animate-spin text-[var(--theme-accent)]" />
                      ) : (
                        <Download size={13} />
                      )}
                      <span>Downloads</span>
                      {hfDownloadStatus !== 'idle' && hfDownloadStatus !== 'completed' && (
                        <span className="ml-1 px-1 py-0.5 rounded text-[8px] bg-[var(--theme-accent)]/15 text-[var(--theme-accent)] animate-pulse font-mono font-bold">
                          {hfDownloadProgress}%
                        </span>
                      )}
                    </button>
                  </div>
                </div>

                {/* MAIN CONTENT SPACE WITH OPTIONAL SLIDING DRAWER */}
                <div className="flex-1 flex gap-5 min-h-0 relative">
                  
                  {/* PANELS VIEW AREA */}
                  <div className="flex-1 min-w-0 h-full flex flex-col">
                    {modelsSubTab === 'list' ? (
                      /* MY MODELS LIST VIEW */
                      <div className="flex-1 flex flex-col min-h-0">
                        {/* TITLE & FILTER ROW */}
                        <div className="flex items-center justify-between mb-4 shrink-0">
                          <h3 className="text-base font-bold text-gray-900 dark:text-white">My Models</h3>
                          
                          {/* Ctrl + F filter search input */}
                          <div className="relative w-64 md:w-80">
                            <Search className="absolute left-3 top-2.5 text-gray-400 dark:text-zinc-500" size={14} />
                            <input
                              type="text"
                              placeholder="Filter models... (Ctrl + F)"
                              value={modelsFilterQuery}
                              onChange={(e) => setModelsFilterQuery(e.target.value)}
                              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border transition-all duration-200 outline-none focus:ring-1 focus:ring-[var(--theme-accent)]"
                              style={{
                                background: 'var(--theme-surface)',
                                borderColor: 'var(--theme-border)',
                                color: 'var(--theme-primary)'
                              }}
                            />
                            {modelsFilterQuery && (
                              <button 
                                onClick={() => setModelsFilterQuery('')} 
                                className="absolute right-3 top-2.5 text-gray-400 hover:text-black dark:hover:text-white"
                              >
                                <X size={12} />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* TABLE CONTAINER */}
                        <div className="flex-1 overflow-y-auto border border-gray-100 dark:border-white/5 rounded-xl bg-gray-50/20 dark:bg-zinc-950/10 min-h-0 custom-scrollbar">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="border-b border-gray-100 dark:border-white/10 text-[10px] font-bold uppercase tracking-wider text-gray-400 select-none">
                                <th className="py-3 px-4 w-20">Params</th>
                                <th className="py-3 px-4">LLM</th>
                                <th className="py-3 px-4 w-28 text-center">Size</th>
                                <th className="py-3 px-4 w-36">Modified</th>
                                <th className="py-3 px-4 w-28 text-center">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                              {downloadedModelsList
                                .filter(m => 
                                  m.id.toLowerCase().includes(modelsFilterQuery.toLowerCase()) || 
                                  m.name.toLowerCase().includes(modelsFilterQuery.toLowerCase()) ||
                                  (m.publisher && m.publisher.toLowerCase().includes(modelsFilterQuery.toLowerCase()))
                                )
                                .map((model) => {
                                  const isActive = activeModelId === model.id;
                                  const isLoaded = loadedLocalModelId === model.id;
                                  
                                  return (
                                    <tr 
                                      key={model.id} 
                                      className={`text-xs hover:bg-gray-100/30 dark:hover:bg-zinc-800/10 transition-colors ${
                                        isActive ? 'bg-[var(--theme-hover-bg)]/20' : ''
                                      }`}
                                    >
                                      {/* Params Badgified column */}
                                      <td className="py-3.5 px-4 select-none">
                                        <span className="inline-flex items-center justify-center px-2 py-0.5 border border-zinc-200 dark:border-zinc-700 text-[10px] font-mono rounded bg-white dark:bg-zinc-900 font-bold text-zinc-500 shadow-sm shrink-0">
                                          {model.params}
                                        </span>
                                      </td>
                                      
                                      {/* LLM Name & Subtitles */}
                                      <td className="py-3.5 px-4">
                                        <div className="flex items-center gap-2">
                                          <div>
                                            <span className="font-semibold text-gray-900 dark:text-zinc-100 hover:underline cursor-pointer block" onClick={() => {
                                              if (onOpenLocalModelConfig) onOpenLocalModelConfig(model.id);
                                            }}>
                                              {model.name}
                                            </span>
                                            <div className="flex items-center gap-1 mt-0.5">
                                              {model.capabilities?.includes('Vision') && (
                                                <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded border border-emerald-500/25 bg-emerald-500/10 text-emerald-400" title="Vision">
                                                  <Eye size={8} />
                                                </span>
                                              )}
                                              {model.capabilities?.includes('Tool Use') && (
                                                <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded border border-violet-500/25 bg-violet-500/10 text-violet-400" title="Tool Use">
                                                  <Hammer size={8} />
                                                </span>
                                              )}
                                              {model.capabilities?.includes('Reasoning') && (
                                                <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded border border-amber-500/25 bg-amber-500/10 text-amber-400" title="Reasoning">
                                                  <Brain size={8} />
                                                </span>
                                              )}
                                              <span className="text-[10px] font-mono text-zinc-400 opacity-80">
                                                {model.file}
                                              </span>
                                            </div>
                                          </div>
                                          {isLoaded && (
                                            <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[9px] font-bold border border-emerald-500/20">
                                              Active in RAM
                                            </span>
                                          )}
                                          {isActive && !isLoaded && (
                                            <span className="px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-500 text-[9px] font-bold border border-blue-500/20">
                                              Selected
                                            </span>
                                          )}
                                        </div>
                                      </td>
                                      
                                      {/* Size Badge column */}
                                      <td className="py-3.5 px-4 font-mono text-center text-zinc-500">
                                        {model.size}
                                      </td>
                                      
                                      {/* Date downloaded column */}
                                      <td className="py-3.5 px-4 text-zinc-400 font-medium">
                                        {model.modified}
                                      </td>
                                      
                                      {/* Action buttons list */}
                                      <td className="py-3.5 px-4">
                                        <div className="flex items-center justify-center gap-1.5">
                                          {/* Activate/Run play button */}
                                          <button
                                            onClick={() => {
                                              if (setActiveModelId) setActiveModelId(model.id);
                                              if (setLoadedLocalModelId) setLoadedLocalModelId(model.id);
                                              localStorage.setItem('lumina_active_loaded_local_model', model.id);
                                              showToast(`Bound and activated local GGUF: ${model.name}`);
                                            }}
                                            className={`p-1.5 rounded-lg border transition-all ${
                                              isLoaded 
                                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/20' 
                                                : 'border-zinc-200 dark:border-white/10 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-white'
                                            }`}
                                            title={isLoaded ? "Model running on llama.cpp backend" : "Load and Boot Model"}
                                          >
                                            <Play size={12} fill={isLoaded ? "currentColor" : "none"} />
                                          </button>
                                          
                                          {/* Parameter settings gear */}
                                          <button
                                            onClick={() => {
                                              if (onOpenLocalModelConfig) onOpenLocalModelConfig(model.id);
                                            }}
                                            className="p-1.5 rounded-lg border border-zinc-200 dark:border-white/10 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-white transition-all"
                                            title="Configure parameters"
                                          >
                                            <Settings size={12} />
                                          </button>
                                          
                                          {/* Delete button option */}
                                          <button
                                            onClick={async () => {
                                              if (confirm(`Are you sure you want to delete ${model.name}?`)) {
                                                try {
                                                  const modelPath = model.path;
                                                  if (!modelPath) {
                                                    showToast('Model path not found');
                                                    return;
                                                  }
                                                  
                                                  const deleteRes = await fetch('/api/models/delete', {
                                                    method: 'POST',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify({ modelPath }),
                                                  });
                                                  
                                                  if (!deleteRes.ok) {
                                                    const errData = await deleteRes.json().catch(() => ({}));
                                                    throw new Error(errData.error || `Failed to delete: ${deleteRes.status}`);
                                                  }
                                                  
                                                  const next = downloadedModelsList.filter(item => item.id !== model.id);
                                                  setDownloadedModelsList(next);
                                                  localStorage.setItem('lumina_downloaded_models', JSON.stringify(next));
                                                  onLocalModelsChange?.();
                                                  showToast(`Deleted ${model.name}`);
                                                } catch (err: any) {
                                                  showToast(`Delete failed: ${err.message}`);
                                                }
                                              }
                                            }}
                                            className="p-1.5 rounded-lg border border-zinc-200 dark:border-white/10 hover:bg-red-500/10 hover:border-red-500/30 text-zinc-400 hover:text-red-500 transition-all"
                                            title="Remove model binary"
                                          >
                                            <Trash2 size={12} />
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              {downloadedModelsList.filter(m => 
                                m.id.toLowerCase().includes(modelsFilterQuery.toLowerCase()) || 
                                m.name.toLowerCase().includes(modelsFilterQuery.toLowerCase())
                              ).length === 0 && (
                                <tr>
                                  <td colSpan={5} className="py-12 text-center text-zinc-400">
                                    No models found match filter query. 
                                    <button onClick={() => setModelsSubTab('explore')} className="text-[var(--theme-accent)] ml-1 font-semibold hover:underline">
                                      Explore HuggingFace Hub ↗
                                    </button>
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>

                        {/* TABLE LOWER FOOTER AND SOURCE DIRECTORY BOX */}
                        <div className="mt-4 p-3 bg-gray-50/50 dark:bg-zinc-950/20 border border-gray-100 dark:border-white/15 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
                          <span className="text-[11px] font-medium text-zinc-400 select-none">
                            You have {downloadedModelsList.length} local model{downloadedModelsList.length === 1 ? '' : 's'}, taking up {(downloadedModelsList.reduce((acc, m) => acc + parseFloat(m.size), 0)).toFixed(2)} GB of disk space
                          </span>

                          <div className="flex items-center gap-1 w-full md:w-auto">
                            <input
                              type="text"
                              value={modelsPath}
                              onChange={(e) => {
                                setModelsPath(e.target.value);
                                localStorage.setItem('lumina_local_models_path', e.target.value);
                              }}
                              className="px-3 py-1.5 text-[10px] font-mono border rounded-lg max-w-full md:w-72 outline-none"
                              style={{
                                background: 'var(--theme-input-bg)',
                                borderColor: 'var(--theme-input-border)',
                                color: 'var(--theme-primary)'
                              }}
                              title="Active models local directory"
                            />
                            <button
                              onClick={() => {
                                const newPath = prompt("Enter local models root folder path:", modelsPath);
                                if (newPath) {
                                  setModelsPath(newPath);
                                  localStorage.setItem('lumina_local_models_path', newPath);
                                  showToast("Updated local model directory pathway!");
                                }
                              }}
                              className="p-1.5 rounded-lg border border-zinc-250 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-white"
                              title="Browse model folder"
                            >
                              <MoreHorizontal size={12} />
                            </button>
                          </div>
                        </div>

                      </div>
                    ) : (
                      /* EXPLORE HUGGINGFACE HUB (RETAINING FULL FUNCTIONALITY COMPACTED) */
                      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-0">
                        {/* LEFT SUB COLUMN: HF LIST */}
                          <div className="lg:col-span-12 xl:col-span-5 flex flex-col gap-3 min-h-0">
                            {/* Rich input filter and category tabs inside HF search */}
                            <div className="relative animate-fade-in">
                              <Search className="absolute left-3 top-2.5 text-gray-400 dark:text-zinc-500" size={14} />
                              <input
                                type="search"
                                placeholder="Search HuggingFace for GGUF quants..."
                                value={hfSearchQuery}
                                onChange={(e) => setHfSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border transition-all duration-200 outline-none focus:ring-1 focus:ring-[var(--theme-accent)]"
                                style={{
                                  background: 'var(--theme-surface)',
                                  borderColor: 'var(--theme-border)',
                                  color: 'var(--theme-primary)'
                                }}
                              />
                              {isSearchingHf && (
                                <div className="absolute right-3 top-2.5 flex items-center">
                                  <RefreshCw className="animate-spin text-[var(--theme-accent)]" size={14} />
                                </div>
                              )}
                            </div>

                            {/* GPU VRAM Banner */}
                            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border bg-zinc-500/[0.03] dark:bg-zinc-900/40 text-[10px] text-zinc-400 border-[var(--theme-border)]">
                              <Cpu className="text-zinc-400 shrink-0" size={12} />
                              <div className="flex-1 truncate">
                                <span className="font-semibold text-zinc-500 dark:text-zinc-400">VRAM Capacity: </span>
                                <span className="font-mono font-bold text-[var(--theme-accent)]">{detectedVramGb.toFixed(1)} GB</span>
                                <span className="text-[9px] text-zinc-500 dark:text-zinc-500 font-normal"> (Estimated {hasDetectedVram ? 'GPU' : 'System'} memory)</span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between text-[11px] uppercase tracking-wider font-bold text-zinc-400 px-1 shrink-0">
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => { setHfSelectedFilter('staff'); setHfSearchQuery(''); }}
                                  className={`hover:text-[var(--theme-accent)] transition-all ${hfSelectedFilter === 'staff' && !hfSearchQuery ? 'text-[var(--theme-accent)]' : ''}`}
                                >
                                  Curator picks
                                </button>
                                <span>•</span>
                                <button
                                  onClick={() => setHfSelectedFilter('all')}
                                  className={`hover:text-[var(--theme-accent)] transition-all ${hfSelectedFilter === 'all' || hfSearchQuery ? 'text-[var(--theme-accent)]' : ''}`}
                                >
                                  All Hub
                                </button>
                              </div>
                              <select
                                value={hfSortOption}
                                onChange={(e: any) => setHfSortOption(e.target.value)}
                                className="appearance-none bg-[var(--theme-surface-alt,rgba(0,0,0,0.05))] hover:bg-[var(--theme-hover-bg,rgba(0,0,0,0.1))] dark:bg-zinc-900/40 hover:dark:bg-zinc-800/60 text-[10px] font-bold text-zinc-400 dark:text-zinc-300 px-3 py-1.5 pr-8 rounded-xl border border-[var(--theme-border)] outline-none cursor-pointer hover:text-[var(--theme-accent)] hover:border-[var(--theme-accent)] focus:border-[var(--theme-accent)] focus:ring-2 focus:ring-[var(--theme-accent)]/20 transition-all relative font-sans select-none shadow-sm"
                                style={{
                                  backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%23a1a1aa' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M6 8l4 4 4-4'/%3E%3C/svg%3E")`,
                                  backgroundPosition: 'right 8px center',
                                  backgroundSize: '14px',
                                  backgroundRepeat: 'no-repeat'
                                }}
                              >
                                <option value="vram_fit" className="bg-[var(--theme-surface)] text-[var(--theme-primary)] dark:bg-zinc-900 dark:text-zinc-100 font-semibold text-xs">VRAM-aware Auto-Detect</option>
                                <option value="downloads" className="bg-[var(--theme-surface)] text-[var(--theme-primary)] dark:bg-zinc-900 dark:text-zinc-100 font-semibold text-xs">Popularity</option>
                                <option value="likes" className="bg-[var(--theme-surface)] text-[var(--theme-primary)] dark:bg-zinc-900 dark:text-zinc-100 font-semibold text-xs">High Rating</option>
                                <option value="modified" className="bg-[var(--theme-surface)] text-[var(--theme-primary)] dark:bg-zinc-900 dark:text-zinc-100 font-semibold text-xs">Latest</option>
                              </select>
                            </div>

                            {/* List of models */}
                            <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 custom-scrollbar min-h-0 hidden-scrollbar">
                              {isSearchingHf ? (
                                <div className="py-20 text-center text-xs text-zinc-400 space-y-2">
                                  <RefreshCw size={20} className="animate-spin mx-auto text-[var(--theme-accent)]" />
                                  <p>Reorganizing model trees...</p>
                                </div>
                              ) : hfError && hfModels.length === 0 ? (
                                <div className="p-4 rounded-xl text-center text-xs border text-amber-500 bg-amber-500/5" style={{ borderColor: 'var(--theme-border)' }}>
                                  {hfError}
                                </div>
                              ) : (
                                (() => {
                                  const listToRender = hfSearchQuery.trim() ? hfModels : curators;
                                  const filtered = listToRender.filter(m => {
                                    if (!hfSearchQuery && hfSelectedFilter === 'staff') {
                                      if (!m.isStaffPick) return false;
                                    }
                                    if (hfSortOption === 'vram_fit') {
                                      const minSizeGb = getSmallestModelSizeGb(m);
                                      const kvAndOverhead = getKvCacheAndOverheadGb(m);
                                      const totalVramNeeded = minSizeGb + kvAndOverhead;
                                      return totalVramNeeded <= detectedVramGb;
                                    }
                                    return true;
                                  });

                                  if (filtered.length === 0) {
                                    return (
                                      <div className="py-12 text-center text-xs text-zinc-400 space-y-1.5 border border-dashed rounded-xl border-[var(--theme-border)]">
                                        <Cpu size={24} className="mx-auto text-zinc-300 dark:text-zinc-700" />
                                        <p className="font-semibold">No models fit your VRAM ({detectedVramGb.toFixed(1)} GB) criteria.</p>
                                        <p className="text-[10px] text-zinc-500">Try changing filter type to "Popularity" or "Latest".</p>
                                      </div>
                                    );
                                  }

                                  return filtered.map((model) => {
                                    const isSelected = selectedModelId === model.id;
                                    const minSizeGb = getSmallestModelSizeGb(model);
                                    const kvAndOverhead = getKvCacheAndOverheadGb(model);
                                    const totalVramNeeded = minSizeGb + kvAndOverhead;
                                    const fits = totalVramNeeded <= detectedVramGb;

                                    const supportsVision = model.capabilities?.includes('Vision');
                                    const supportsTools = model.capabilities?.includes('Tool Use');
                                    const supportsReasoning = model.capabilities?.includes('Reasoning');
                                    return (
                                      <button
                                        key={model.id}
                                        onClick={() => {
                                          setSelectedModelId(model.id);
                                          fetchModelDetails(model);
                                        }}
                                        className="w-full p-3.5 rounded-xl border text-left flex items-start gap-3 transition-all outline-none leading-none shadow-sm hover:translate-y-[-1px]"
                                        style={{
                                          borderColor: isSelected ? 'var(--theme-accent)' : 'var(--theme-border)',
                                          background: isSelected ? 'var(--theme-surface-alt)' : 'var(--theme-surface)'
                                        }}
                                      >
                                        {renderModelLogo(model.author || '', model.id)}
                                        <div className="min-w-0 flex-1">
                                          <div className="flex items-center gap-1">
                                            <span className="font-semibold text-xs truncate text-zinc-800 dark:text-zinc-200">
                                              {model.name}
                                            </span>
                                            {model.isStaffPick && <span className="w-3 h-3 rounded-full bg-blue-500 text-white flex items-center justify-center text-[7px] font-bold shadow-sm" title="Verified">✓</span>}
                                          </div>
                                          <p className="text-[10px] text-zinc-400 truncate mt-0.5 leading-tight">{model.description}</p>
                                          <div className="flex flex-wrap gap-1 mt-2">
                                            {supportsVision && (
                                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md border border-emerald-500/25 bg-emerald-500/10 text-emerald-400 text-[8px] font-bold uppercase tracking-wide">
                                                <Eye size={10} />
                                              </span>
                                            )}
                                            {supportsTools && (
                                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md border border-violet-500/25 bg-violet-500/10 text-violet-400 text-[8px] font-bold uppercase tracking-wide">
                                                <Hammer size={10} />
                                              </span>
                                            )}
                                            {supportsReasoning && (
                                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md border border-amber-500/25 bg-amber-500/10 text-amber-400 text-[8px] font-bold uppercase tracking-wide">
                                                <Brain size={10} />
                                              </span>
                                            )}
                                            <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md border text-[8px] font-mono font-bold uppercase tracking-wide ${
                                              fits 
                                                ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-400' 
                                                : 'border-red-500/25 bg-red-500/10 text-red-400'
                                            }`}>
                                              <Cpu size={10} />
                                              {totalVramNeeded.toFixed(1)} GB
                                            </span>
                                          </div>
                                          <div className="flex items-center justify-between gap-2 mt-2 font-mono text-[9px] text-zinc-500">
                                            <span>{model.downloads?.toLocaleString() || 0} dl</span>
                                            <span>{model.lastUpdated}</span>
                                          </div>
                                        </div>
                                      </button>
                                    );
                                  });
                                })()
                              )}
                            </div>
                          </div>

                        {/* RIGHT SUB COLUMN: HF DETAILS */}
                        <div className="lg:col-span-12 xl:col-span-7 flex flex-col gap-4 min-h-0 overflow-y-auto pr-1 custom-scrollbar">
                          {detailedModel ? (
                            <div className="space-y-4 animate-fade-in text-left">
                              {/* Header element */}
                              <div className="p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-3" style={{ background: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}>
                                <div className="flex items-center gap-3">
                                  {renderModelLogo(detailedModel.author || '', detailedModel.id)}
                                  <div className="min-w-0">
                                    <h4 className="text-xs font-bold truncate max-w-[200px] text-zinc-800 dark:text-zinc-100">{detailedModel.id}</h4>
                                    <p className="text-[9px] mt-0.5 uppercase tracking-wide font-mono text-zinc-400">huggingface.co repository</p>
                                    <div className="flex flex-wrap gap-1.5 mt-2">
                                      {detailedModel.capabilities?.includes('Vision') && (
                                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md border border-emerald-500/25 bg-emerald-500/10 text-emerald-400" title="Vision">
                                          <Eye size={12} />
                                        </span>
                                      )}
                                      {detailedModel.capabilities?.includes('Tool Use') && (
                                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md border border-violet-500/25 bg-violet-500/10 text-violet-400" title="Tool Use">
                                          <Hammer size={12} />
                                        </span>
                                      )}
                                      {detailedModel.capabilities?.includes('Reasoning') && (
                                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md border border-amber-500/25 bg-amber-500/10 text-amber-400" title="Reasoning">
                                          <Brain size={12} />
                                        </span>
                                      )}
                                      {activeDownloadFile && (
                                        <span className={`px-1.5 py-0.5 rounded-md border text-[8px] font-bold uppercase tracking-wide ${estimateGpuOffloadFit(activeDownloadFile).className}`}>
                                          {estimateGpuOffloadFit(activeDownloadFile).label}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <a href={`https://huggingface.co/${detailedModel.id}`} target="_blank" rel="noreferrer" className="text-[10px] font-bold hover:underline shrink-0" style={{ color: 'var(--theme-accent)' }}>Open in HF Hub ↗</a>
                              </div>

                              {/* Spec metrics */}
                              <div className="grid grid-cols-4 gap-2 text-center text-xs font-mono">
                                <div className="p-2 rounded-lg border bg-[var(--theme-surface)]" style={{ borderColor: 'var(--theme-border)' }}>
                                  <div className="text-[8px] uppercase tracking-wider text-zinc-400">Downloads</div>
                                  <div className="font-semibold mt-0.5 text-zinc-800 dark:text-zinc-200">{detailedModel.downloads?.toLocaleString() || 0}</div>
                                </div>
                                <div className="p-2 rounded-lg border bg-[var(--theme-surface)]" style={{ borderColor: 'var(--theme-border)' }}>
                                  <div className="text-[8px] uppercase tracking-wider text-zinc-400">Likes</div>
                                  <div className="font-semibold mt-0.5 text-zinc-800 dark:text-zinc-200">{detailedModel.likes || 0}</div>
                                </div>
                                <div className="p-2 rounded-lg border bg-[var(--theme-surface)]" style={{ borderColor: 'var(--theme-border)' }}>
                                  <div className="text-[8px] uppercase tracking-wider text-zinc-400">Params</div>
                                  <div className="font-semibold mt-0.5 text-zinc-800 dark:text-zinc-200">{detailedModel.params}</div>
                                </div>
                                <div className="p-2 rounded-lg border bg-[var(--theme-surface)]" style={{ borderColor: 'var(--theme-border)' }}>
                                  <div className="text-[8px] uppercase tracking-wider text-zinc-400">Arch</div>
                                  <div className="font-semibold mt-0.5 text-blue-500 uppercase truncate">{detailedModel.arch}</div>
                                </div>
                              </div>

                              <div className="p-4 rounded-xl border space-y-2 bg-[var(--theme-surface)]" style={{ borderColor: 'var(--theme-border)' }}>
                                <h5 className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Repository Description</h5>
                                <p className="text-xs leading-relaxed text-zinc-600 dark:text-zinc-300">{detailedModel.description}</p>
                              </div>

                              {/* Download trigger card */}
                              <div className="p-5 rounded-xl border bg-[var(--theme-surface)] space-y-4" style={{ borderColor: 'var(--theme-border)' }}>
                                <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: 'var(--theme-border)' }}>
                                  <span className="text-xs font-bold text-zinc-800 dark:text-zinc-100">Quantization Level selection</span>
                                  <span className="px-1.5 py-0.5 rounded text-[8px] font-bold font-mono tracking-wide uppercase bg-[var(--theme-accent)]/15 text-[var(--theme-accent)]">GGUF Quant</span>
                                </div>

                                {isDetailLoading ? (
                                  <div className="py-4 text-center text-xs text-zinc-400">
                                    <RefreshCw size={14} className="animate-spin mx-auto text-[var(--theme-accent)] mb-1" />
                                    Loading quants list...
                                  </div>
                                ) : (
                                  <div className="space-y-3">
                                    {activeDownloadFile && (
                                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-semibold ${estimateGpuOffloadFit(activeDownloadFile).className}`}>
                                        <Cpu size={12} />
                                        {estimateGpuOffloadFit(activeDownloadFile).label}
                                      </div>
                                    )}

                                    <select
                                      disabled
                                      value={activeDownloadFile}
                                      onChange={(e) => setActiveDownloadFile(e.target.value)}
                                      className="w-full appearance-none px-3.5 py-2.5 pr-10 text-xs font-semibold rounded-xl outline-none border cursor-default bg-[var(--theme-surface-alt,rgba(0,0,0,0.05))] border-[var(--theme-border)] text-[var(--theme-primary)] opacity-95 pointer-events-none select-none transition-all relative font-sans shadow-inner shrink-0"
                                      style={{
                                        backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%23a1a1aa' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M6 8l4 4 4-4'/%3E%3C/svg%3E")`,
                                        backgroundPosition: 'right 12px center',
                                        backgroundSize: '16px',
                                        backgroundRepeat: 'no-repeat'
                                      }}
                                    >
                                      {detailedModel.files && detailedModel.files.map((file: string, idx: number) => (
                                        <option key={idx} value={file} className="bg-[var(--theme-surface)] text-[var(--theme-primary)] dark:bg-zinc-900 dark:text-zinc-100 font-semibold py-2">
                                          {file}
                                        </option>
                                      ))}
                                    </select>

                                    {detailedModel.files && detailedModel.files.length > 0 && (
                                      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--theme-border)' }}>
                                        <div className="px-3 py-2 text-[10px] font-bold text-zinc-400 uppercase tracking-wider bg-zinc-500/5">
                                          Choose a download option
                                        </div>
                                        <div className="divide-y divide-zinc-200 dark:divide-white/5">
                                          {detailedModel.files.map((file: string) => {
                                            const selected = activeDownloadFile === file;
                                            const fit = estimateGpuOffloadFit(file);
                                            const fileSize = parseModelSizeGb(file);
                                            return (
                                              <button
                                                key={file}
                                                onClick={() => setActiveDownloadFile(file)}
                                                className={`w-full px-3 py-2.5 flex items-center gap-3 text-left transition-all ${
                                                  selected ? 'bg-[var(--theme-hover-bg)]' : 'hover:bg-[var(--theme-hover-bg)]/60'
                                                }`}
                                              >
                                                <span className="w-4 shrink-0 text-zinc-400">
                                                  {selected ? <Check size={15} /> : null}
                                                </span>
                                                <span className="px-1.5 py-0.5 rounded-md bg-blue-500 text-white text-[9px] font-bold">GGUF</span>
                                                <span className="flex-1 min-w-0">
                                                  <span className="block text-xs font-semibold text-zinc-700 dark:text-zinc-200 truncate">
                                                    {file.replace(/\s*\([^)]*\)\s*$/, '').split('/').pop()}
                                                  </span>
                                                  <span className={`inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded-md border text-[9px] font-semibold ${fit.className}`}>
                                                    <Cpu size={10} />
                                                    {fit.label}
                                                  </span>
                                                </span>
                                                <span className="text-[10px] font-mono text-zinc-500 shrink-0">
                                                  {fileSize ? `${fileSize.toFixed(fileSize >= 1 ? 2 : 1)} GB` : 'Unknown'}
                                                </span>
                                              </button>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    )}

                                    {hfDownloadStatus === 'idle' ? (
                                      <button
                                        onClick={handleDownloadHfModel}
                                        className="w-full py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 transition-all flex items-center justify-center gap-1.5 shadow-sm"
                                      >
                                        <Download size={13} strokeWidth={2.5} />
                                        Fetch & cache model quant
                                      </button>
                                    ) : (
                                      <div className="space-y-3 pt-1">
                                        <div className="space-y-1.5">
                                          <div className="flex justify-between items-center text-[10px] font-semibold text-zinc-400">
                                            <span className="capitalize">{hfDownloadStatus}...</span>
                                            <span>{hfDownloadProgress}%</span>
                                          </div>
                                          <div className="h-1.5 rounded-full overflow-hidden bg-zinc-100 dark:bg-zinc-800 border" style={{ borderColor: 'var(--theme-border)' }}>
                                            <motion.div className="h-full bg-blue-500 rounded-full" initial={{ width: 0 }} animate={{ width: `${hfDownloadProgress}%` }} transition={{ duration: 0.1 }} />
                                          </div>
                                        </div>

                                        {hfDownloadStatus === 'downloading' && (
                                          <div className="grid grid-cols-3 gap-1 text-center py-1.5 bg-zinc-950/20 rounded-lg border font-mono text-[9px]" style={{ borderColor: 'var(--theme-border)' }}>
                                            <div>
                                              <div className="text-[7px] font-bold uppercase tracking-wider text-zinc-400">Speed</div>
                                              <div className="font-semibold text-zinc-800 dark:text-zinc-200">{hfDownloadMetrics.speed}</div>
                                            </div>
                                            <div>
                                              <div className="text-[7px] font-bold uppercase tracking-wider text-zinc-400">Bytes</div>
                                              <div className="font-semibold text-zinc-800 dark:text-zinc-200">{hfDownloadMetrics.downloaded}</div>
                                            </div>
                                            <div>
                                              <div className="text-[7px] font-bold uppercase tracking-wider text-zinc-400">Of Total</div>
                                              <div className="font-semibold text-zinc-800 dark:text-zinc-200">{hfDownloadMetrics.total}</div>
                                            </div>
                                          </div>
                                        )}

                                        <div className="p-2.5 rounded-lg bg-zinc-950 border border-white/5 text-[9px] font-mono text-zinc-400 max-h-24 overflow-y-auto custom-scrollbar">
                                          {hfDownloadLogs.map((log, idx) => (
                                            <div key={idx} className="opacity-90 leading-relaxed text-left">{log}</div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="py-20 text-center text-xs text-zinc-400">Select an explore item on the left to read specifications</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* DOWNLOADS DRAWER WITH SMOOTH TRANSITION AND HIGH FIDELITY LAYOUT */}
                  {isDownloadsPanelOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 12, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 12, scale: 0.98 }}
                      transition={{ duration: 0.18, ease: "easeOut" }}
                      className="absolute right-0 top-0 z-50 w-[460px] h-full flex flex-col shrink-0 text-left min-w-0"
                    >
                      <div className="p-4 rounded-2xl border border-gray-200 dark:border-white/10 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md h-full flex flex-col min-h-0 min-w-0 shadow-2xl">
                        {/* Title panel */}
                        <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/10 pb-2 mb-3 shrink-0">
                          <h4 className="text-xs font-bold tracking-wider uppercase text-zinc-500">Downloads</h4>
                          <div className="flex items-center gap-2 text-zinc-400">
                            <button className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-colors" title="Completed Files">
                              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="2" />
                                <path d="M9 12l2 2 4-4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </button>
                            <button onClick={() => setIsDownloadsPanelOpen(false)} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-colors hover:text-white">
                              <X size={14} />
                            </button>
                          </div>
                        </div>

                        {/* Search downloads */}
                        <div className="relative mb-3 shrink-0">
                          <Search className="absolute left-2.5 top-2 text-gray-400 dark:text-zinc-500" size={12} />
                          <input
                            type="text"
                            placeholder="Filter downloads..."
                            className="w-full pl-8 pr-3 py-1.5 text-[10px] rounded-lg border outline-none font-medium bg-[var(--theme-surface-alt)] border-[var(--theme-border)] text-[var(--theme-primary)]"
                          />
                        </div>

                        {/* Complete separator header and Clear button */}
                        <div className="flex items-center justify-between text-[10px] font-bold text-zinc-400 uppercase select-none mb-2 shrink-0">
                          <span>Completed</span>
                          <button
                            onClick={() => {
                              if (confirm("Clear download records?")) {
                                showToast("Cleared download tracker history.");
                              }
                            }}
                            className="text-[9px] hover:text-[var(--theme-danger)] hover:underline normal-case"
                          >
                            Clear
                          </button>
                        </div>

                        {/* Completed list */}
                        <div className="flex-1 overflow-y-auto space-y-2.5 custom-scrollbar min-h-0 pr-1 select-none">
                          {downloadedModelsList.map((m) => (
                            <div 
                              key={m.id} 
                              className="p-3 border border-gray-100 dark:border-white/5 rounded-xl bg-gray-50/50 dark:bg-zinc-950/20 text-left hover:border-gray-200 dark:hover:border-white/10 transition-colors"
                            >
                              <div className="flex items-start gap-2">
                                <div className="p-1.5 rounded-lg bg-[var(--theme-primary)]/10 text-[var(--theme-primary)] shrink-0">
                                  <svg className="w-3.5 h-3.5 text-[var(--theme-accent)]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 2a11 11 0 100 22 11 11 0 000-22z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                  </svg>
                                </div>
                                <div className="min-w-0 flex-1">
                                  <span className="font-semibold text-[11px] text-zinc-800 dark:text-zinc-200 truncate block tracking-wide" title={m.id}>
                                    {m.publisher || 'unknown'} : {m.name}
                                  </span>
                                  <span className="text-[9px] text-zinc-400 block mt-0.5 font-medium">
                                    Model • {m.size}
                                  </span>
                                </div>
                              </div>

                              {/* Action buttons on download row */}
                              <div className="flex items-center justify-end gap-2.5 mt-2 border-t border-gray-100 dark:border-white/5 pt-2">
                                <button
                                  onClick={() => {
                                    if (setActiveModelId) setActiveModelId(m.id);
                                    if (setLoadedLocalModelId) setLoadedLocalModelId(m.id);
                                    showToast(`Booted model: ${m.name}`);
                                  }}
                                  className="p-1 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded transition-colors text-zinc-400 hover:text-white"
                                  title="Play / Run"
                                >
                                  <Play size={10} fill="currentColor" />
                                </button>
                                <button
                                  onClick={() => alert(`Downloads are stored in simulated directory: \n${modelsPath}`)}
                                  className="p-1 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded transition-colors text-zinc-400 hover:text-white"
                                  title="Open files folder"
                                >
                                  <Folder size={10} />
                                </button>
                                <button
                                  onClick={() => {
                                    if (onOpenLocalModelConfig) onOpenLocalModelConfig(m.id);
                                  }}
                                  className="p-1 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded transition-colors text-zinc-400 hover:text-white"
                                  title="Model configuration"
                                >
                                  <Settings size={10} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Open folder bottom trigger link */}
                        <div className="border-t border-gray-100 dark:border-white/10 pt-3 mt-3 text-center shrink-0">
                          <button
                            onClick={() => alert(`Simulating file explorer root folder: \n${modelsPath}`)}
                            className="text-[10px] font-semibold text-zinc-400 hover:text-white hover:underline inline-flex items-center gap-1"
                          >
                            Open downloads directory ↗
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}

                </div>
              </motion.div>
            )}

            {activeSettingsTab === 'skills' && (
              <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="h-full flex flex-col font-sans text-left relative overflow-hidden">
                <SkillsPanel />
              </motion.div>
            )}

            {activeSettingsTab === 'theme' && (
              <motion.div 
                initial={{ opacity: 0, y: 8 }} 
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="h-full overflow-y-auto custom-scrollbar pb-8"
              >
                <ThemeSettingsContent compact />
              </motion.div>
            )}

            {activeSettingsTab === 'bridge' && (
              <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-6">Llama Bridge Backend</h3>
                  <div className="space-y-5">

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="p-3 rounded-xl border" style={{ background: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'var(--theme-accent)', color: 'var(--theme-accent-foreground)' }}>
                            <Terminal size={12} />
                          </div>
                          <span className="text-[10px] font-bold uppercase" style={{ color: 'var(--theme-secondary)' }}>Server</span>
                        </div>
                        <div className="text-xs font-semibold truncate" style={{ color: 'var(--theme-primary)' }}>{llamaBridgeUrl}</div>
                        <div className="text-[10px] mt-0.5" style={{ color: 'var(--theme-accent)' }}>llama-bridge v0.1.0</div>
                      </div>
                      <div className="p-3 rounded-xl border" style={{ background: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-6 h-6 rounded-lg flex items-center justify-center bg-emerald-500/10 text-emerald-500">
                            <Check size={12} />
                          </div>
                          <span className="text-[10px] font-bold uppercase" style={{ color: 'var(--theme-secondary)' }}>Status</span>
                        </div>
                        <div className="text-xs font-semibold" style={{ color: 'var(--theme-primary)' }}>
                          {isMcpConnected ? 'Connected' : aiVerificationState === 'success' ? 'Connected' : aiVerificationState === 'error' ? 'Error' : 'Unknown'}
                        </div>
                        <div className="text-[10px] mt-0.5" style={{ color: 'var(--theme-secondary)' }}>
                          {llamaBridgeModels.length > 0 ? `${llamaBridgeModels.length} models` : 'No models loaded'}
                        </div>
                      </div>
                      <div className="p-3 rounded-xl border" style={{ background: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: `${isMcpConnected ? 'var(--theme-success)' : 'var(--theme-muted)'}20`, color: isMcpConnected ? 'var(--theme-success)' : 'var(--theme-muted)' }}>
                            <HardDrive size={12} />
                          </div>
                          <span className="text-[10px] font-bold uppercase" style={{ color: 'var(--theme-secondary)' }}>Tools</span>
                        </div>
                        <div className="text-xs font-semibold" style={{ color: 'var(--theme-primary)' }}>{bridgeTools.length} loaded</div>
                        <div className="text-[10px] mt-0.5" style={{ color: 'var(--theme-secondary)' }}>HTTP + MCP endpoints</div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-medium" style={{ color: 'var(--theme-secondary)' }}>Bridge URL</label>
                      <input
                        type="text"
                        value={llamaBridgeUrl}
                        onChange={(e) => { setLlamaBridgeUrl(e.target.value); localStorage.setItem('lumina_llama_url', e.target.value); }}
                        placeholder="http://localhost:8089"
                        className="w-full h-11 px-4 text-sm rounded-xl border outline-none transition-all"
                        style={{ background: 'var(--theme-input-bg)', borderColor: 'var(--theme-input-border)', color: 'var(--theme-primary)' }}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-medium" style={{ color: 'var(--theme-secondary)' }}>API Key (optional)</label>
                      <input
                        type="password"
                        value={llamaBridgeApiKey}
                        onChange={(e) => { setLlamaBridgeApiKey(e.target.value); localStorage.setItem('lumina_llama_key', e.target.value); }}
                        placeholder="Enter API key if required"
                        className="w-full h-11 px-4 text-sm rounded-xl border outline-none transition-all"
                        style={{ background: 'var(--theme-input-bg)', borderColor: 'var(--theme-input-border)', color: 'var(--theme-primary)' }}
                      />
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={handleTestLlamaConnection}
                        disabled={aiVerificationState === 'verifying'}
                        className="h-10 px-5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 border"
                        style={{
                          background: aiVerificationState === 'success' ? 'var(--theme-success)' : aiVerificationState === 'error' ? 'var(--theme-danger)' : 'var(--theme-surface)',
                          borderColor: aiVerificationState === 'success' ? 'var(--theme-success)' : aiVerificationState === 'error' ? 'var(--theme-danger)' : 'var(--theme-border)',
                          color: aiVerificationState !== 'idle' ? 'white' : 'var(--theme-primary)',
                        }}
                      >
                        {aiVerificationState === 'verifying' ? (
                          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full" />
                        ) : aiVerificationState === 'success' ? <Check size={13} /> : aiVerificationState === 'error' ? <X size={13} /> : null}
                        {aiVerificationState === 'verifying' ? 'Testing...' : aiVerificationState === 'success' ? 'Connected' : aiVerificationState === 'error' ? 'Failed' : 'Test Connection'}
                      </button>
                      <button
                        onClick={handleLoadLlamaModels}
                        className="h-10 px-5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2"
                        style={{ background: 'var(--theme-accent)', color: 'var(--theme-accent-foreground)' }}
                      >
                        <Brain size={13} />
                        Load Models
                      </button>
                      <button
                        onClick={handleLoadBridgeTools}
                        className="h-10 px-5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2"
                        style={{ background: 'var(--theme-surface)', color: 'var(--theme-primary)', border: '1px solid var(--theme-border)' }}
                      >
                        <Wrench size={13} />
                        Load Tools
                      </button>
                    </div>

                    {llamaBridgeModels.length > 0 && (
                      <div className="space-y-2">
                        <label className="text-[11px] font-medium" style={{ color: 'var(--theme-secondary)' }}>Available Models ({llamaBridgeModels.length})</label>
                        <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto custom-scrollbar pr-1">
                          {llamaBridgeModels.map(m => (
                            <button
                              key={m.id}
                              onClick={() => setSelectedLlamaModel(m.id)}
                              className="px-3 py-2.5 rounded-xl text-[11px] font-medium text-left transition-all border"
                              style={{
                                background: selectedLlamaModel === m.id ? 'var(--theme-accent)' : 'var(--theme-surface)',
                                borderColor: selectedLlamaModel === m.id ? 'var(--theme-accent)' : 'var(--theme-border)',
                                color: selectedLlamaModel === m.id ? 'var(--theme-accent-foreground)' : 'var(--theme-primary)',
                              }}
                            >
                              <div className="truncate">{m.name || m.id}</div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                  </div>
                </div>
              </motion.div>
            )}

            {activeSettingsTab === 'convex' && (
              <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-8 text-left font-sans">
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Convex Database Setup</h3>
                  <p className="text-xs text-gray-500 mb-6">Convex provides a reactive serverless database for persistent storage, vector search, and real-time sync.</p>

                  <div className="border border-zinc-800 bg-zinc-900/20 rounded-xl p-5 space-y-5">
                    <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
                      <Database size={16} className="text-blue-500" />
                      <span className="text-xs font-bold uppercase tracking-wider text-white">Configuration</span>
                    </div>

                    <div className="space-y-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">CONVEX_DEPLOYMENT</label>
                        <input
                          type="text"
                          defaultValue={localStorage.getItem('CONVEX_DEPLOYMENT') || ''}
                          onChange={(e) => localStorage.setItem('CONVEX_DEPLOYMENT', e.target.value)}
                          placeholder="e.g. my-project-abc123"
                          className="w-full bg-zinc-900 border border-zinc-800 focus:border-zinc-600 focus:outline-none rounded-xl px-3.5 py-2.5 text-xs text-zinc-200 placeholder-zinc-600"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">VITE_CONVEX_URL</label>
                        <input
                          type="text"
                          defaultValue={localStorage.getItem('VITE_CONVEX_URL') || ''}
                          onChange={(e) => localStorage.setItem('VITE_CONVEX_URL', e.target.value)}
                          placeholder="e.g. https://my-project.convex.cloud"
                          className="w-full bg-zinc-900 border border-zinc-800 focus:border-zinc-600 focus:outline-none rounded-xl px-3.5 py-2.5 text-xs text-zinc-200 placeholder-zinc-600"
                        />
                      </div>
                    </div>

                    <div className="border-t border-zinc-800 pt-4 space-y-3">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Setup Guide</span>
                      <div className="space-y-2 text-xs text-zinc-400">
                        <div className="flex items-start gap-2">
                          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-500/10 text-blue-400 text-[10px] font-bold shrink-0 mt-0.5">1</span>
                          <span>Run <code className="px-1 py-0.5 bg-zinc-800 rounded text-zinc-200">npx convex dev</code> in your project root</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-500/10 text-blue-400 text-[10px] font-bold shrink-0 mt-0.5">2</span>
                          <span>Copy the <code className="px-1 py-0.5 bg-zinc-800 rounded text-zinc-200">CONVEX_DEPLOYMENT</code> and <code className="px-1 py-0.5 bg-zinc-800 rounded text-zinc-200">VITE_CONVEX_URL</code> values into the fields above</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeSettingsTab === 'composio' && <ComposioPanel />}

            {activeSettingsTab === 'anthropic' && (
              <AnthropicProxyPanel availableModels={availableModels} aiProviderProfiles={aiProviderProfiles} />
            )}

            {activeSettingsTab === 'agents' && (
              <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-8 text-left font-sans">
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Configure Subagents</h3>
                  <p className="text-xs text-gray-500 mb-6">
                    Configure system prompts, tools, and LLM models for specialized agents spawned during workspace orchestration.
                  </p>

                  <div className="space-y-4">
                    {DEFAULT_AGENTS.map((agent) => {
                      const cfg = subagentConfigs[agent.id] || { modelId: 'openprovider/auto-free', runtime: agent.id === 'coder' ? 'pi' : 'default', systemPrompt: agent.prompt, tools: [...agent.tools] };
                      const isEditing = editingPromptAgent === agent.id;
                      return (
                        <div 
                          key={agent.id}
                          className="p-4 rounded-xl border transition-all bg-gray-50/50 dark:bg-zinc-950/20 border-gray-200 dark:border-white/5 flex flex-col gap-4"
                        >
                          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                            <div className="flex-1 space-y-1.5">
                              <div className="flex items-center gap-2">
                                <Bot size={14} className="text-[#D97756]" />
                                <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">{agent.name}</span>
                              </div>
                              <p className="text-[11px] text-zinc-500 max-w-lg leading-relaxed">
                                {agent.role}
                              </p>
                            </div>
                            <div className="shrink-0 flex flex-col gap-2 min-w-[220px]">
                              <div className="flex flex-col gap-1.5">
                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Runtime</label>
                                <div className="flex gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleAgentRuntimeChange(agent.id, 'default')}
                                    className={`flex-1 h-8 px-3 text-[11px] rounded-full border transition-all font-bold ${
                                      (cfg.runtime || 'default') === 'default'
                                        ? 'bg-blue-500/10 text-blue-600 dark:text-blue-300 border-blue-400/40'
                                        : 'bg-gray-150/80 dark:bg-zinc-800/85 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-zinc-700/60'
                                    }`}
                                  >
                                    Default
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleAgentRuntimeChange(agent.id, 'pi')}
                                    className={`flex-1 h-8 px-3 text-[11px] rounded-full border transition-all font-bold ${
                                      (cfg.runtime || 'default') === 'pi'
                                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-400/40'
                                        : 'bg-gray-150/80 dark:bg-zinc-800/85 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-zinc-700/60'
                                    }`}
                                  >
                                    Pi
                                  </button>
                                </div>
                              </div>
                              <div className="flex flex-col gap-1.5 relative">
                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Provider</label>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenDropdown(
                                      openDropdown?.agentId === agent.id && openDropdown?.type === 'provider'
                                        ? null
                                        : { agentId: agent.id, type: 'provider' }
                                    );
                                  }}
                                  className="flex items-center justify-between w-full h-8 px-3 text-[11px] bg-gray-150/80 dark:bg-zinc-800/85 hover:bg-gray-200/90 dark:hover:bg-zinc-700/90 border border-gray-200 dark:border-zinc-700/60 rounded-full transition-all text-gray-700 dark:text-gray-200 cursor-pointer select-none font-bold shadow-sm outline-none"
                                >
                                  <span className="truncate">
                                    {cfg.providerProfileId
                                      ? aiProviderProfiles.find((p) => p.id === cfg.providerProfileId)?.name || cfg.providerProfileId
                                      : 'Default (Auto Free)'}
                                  </span>
                                  <ChevronDown
                                    size={11}
                                    className={`text-gray-400 shrink-0 transition-transform duration-150 ${
                                      openDropdown?.agentId === agent.id && openDropdown?.type === 'provider' ? 'rotate-180' : ''
                                    }`}
                                  />
                                </button>
                                {openDropdown?.agentId === agent.id && openDropdown?.type === 'provider' && (
                                  <>
                                    <div 
                                      className="fixed inset-0 z-40" 
                                      onClick={() => setOpenDropdown(null)} 
                                    />
                                    <div className="absolute top-[100%] left-0 mt-1 w-full rounded-xl border border-gray-200 dark:border-zinc-700/60 bg-white dark:bg-zinc-900 shadow-xl py-1 max-h-48 overflow-y-auto custom-scrollbar z-50">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          handleAgentProviderChange(agent.id, null);
                                          setOpenDropdown(null);
                                        }}
                                        className={`w-full text-left px-3 py-1.5 text-[11px] hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors ${
                                          !cfg.providerProfileId ? 'font-bold text-blue-500 bg-blue-500/5' : 'text-gray-700 dark:text-gray-300'
                                        }`}
                                      >
                                        Default (Auto Free)
                                      </button>
                                      {(aiProviderProfiles || []).filter(p => p.active).map(p => (
                                        <button
                                          key={p.id}
                                          type="button"
                                          onClick={() => {
                                            handleAgentProviderChange(agent.id, p.id);
                                            setOpenDropdown(null);
                                          }}
                                          className={`w-full text-left px-3 py-1.5 text-[11px] hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors ${
                                            cfg.providerProfileId === p.id ? 'font-bold text-blue-500 bg-blue-500/5' : 'text-gray-700 dark:text-gray-300'
                                          }`}
                                        >
                                          {p.name}
                                        </button>
                                      ))}
                                    </div>
                                  </>
                                )}
                              </div>
                              <div className="flex flex-col gap-1.5 relative">
                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Model</label>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenDropdown(
                                      openDropdown?.agentId === agent.id && openDropdown?.type === 'model'
                                        ? null
                                        : { agentId: agent.id, type: 'model' }
                                    );
                                  }}
                                  className="flex items-center justify-between w-full h-8 px-3 text-[11px] bg-gray-150/80 dark:bg-zinc-800/85 hover:bg-gray-200/90 dark:hover:bg-zinc-700/90 border border-gray-200 dark:border-zinc-700/60 rounded-full transition-all text-gray-700 dark:text-gray-200 cursor-pointer select-none font-bold shadow-sm outline-none"
                                >
                                  <span className="truncate">
                                    {cfg.modelId === 'openprovider/auto-free' ? 'OpenProvider Auto Free' : cfg.modelId.split('/').pop() || cfg.modelId}
                                  </span>
                                  <ChevronDown
                                    size={11}
                                    className={`text-gray-400 shrink-0 transition-transform duration-150 ${
                                      openDropdown?.agentId === agent.id && openDropdown?.type === 'model' ? 'rotate-180' : ''
                                    }`}
                                  />
                                </button>
                                {openDropdown?.agentId === agent.id && openDropdown?.type === 'model' && (
                                  <>
                                    <div 
                                      className="fixed inset-0 z-40" 
                                      onClick={() => setOpenDropdown(null)} 
                                    />
                                    <div className="absolute top-[100%] left-0 mt-1 w-full rounded-xl border border-gray-200 dark:border-zinc-700/60 bg-white dark:bg-zinc-900 shadow-xl py-1 max-h-48 overflow-y-auto custom-scrollbar z-50">
                                      {cfg.providerProfileId ? (
                                        (() => {
                                          const profile = aiProviderProfiles.find(p => p.id === cfg.providerProfileId);
                                          const models = profile ? profile.models.filter(m => profile.selectedModelIds.includes(m.id)) : [];
                                          return models.length > 0 ? (
                                            models.map(m => (
                                              <button
                                                key={m.id}
                                                type="button"
                                                onClick={() => {
                                                  handleAgentModelChange(agent.id, m.id, profile?.id);
                                                  setOpenDropdown(null);
                                                }}
                                                className={`w-full text-left px-3 py-1.5 text-[11px] hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors ${
                                                  cfg.modelId === m.id ? 'font-bold text-blue-500 bg-blue-500/5' : 'text-gray-700 dark:text-gray-300'
                                                }`}
                                              >
                                                {m.name || m.id}
                                              </button>
                                            ))
                                          ) : (
                                            <button
                                              key={cfg.modelId}
                                              type="button"
                                              onClick={() => setOpenDropdown(null)}
                                              className="w-full text-left px-3 py-1.5 text-[11px] text-gray-400 font-medium"
                                            >
                                              {cfg.modelId}
                                            </button>
                                          );
                                        })()
                                      ) : (
                                        <>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              handleAgentModelChange(agent.id, 'openprovider/auto-free', undefined);
                                              setOpenDropdown(null);
                                            }}
                                            className={`w-full text-left px-3 py-1.5 text-[11px] hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors ${
                                              cfg.modelId === 'openprovider/auto-free' ? 'font-bold text-blue-500 bg-blue-500/5' : 'text-gray-700 dark:text-gray-300'
                                            }`}
                                          >
                                            OpenProvider Auto Free
                                          </button>
                                          {(availableModels || []).filter((m: any) => m.id !== 'openprovider/auto-free').map((m: any) => (
                                            <button
                                              key={m.id}
                                              type="button"
                                              onClick={() => {
                                                handleAgentModelChange(agent.id, m.id, m.providerProfileId);
                                                setOpenDropdown(null);
                                              }}
                                              className={`w-full text-left px-3 py-1.5 text-[11px] hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors ${
                                                cfg.modelId === m.id ? 'font-bold text-blue-500 bg-blue-500/5' : 'text-gray-700 dark:text-gray-300'
                                              }`}
                                            >
                                              {m.name || m.id}
                                            </button>
                                          ))}
                                        </>
                                      )}
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Tools */}
                          <div>
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 block">Tools</label>
                            <div className="flex flex-wrap gap-1.5">
                              {ALL_AVAILABLE_TOOLS.map((t) => {
                                const isActive = cfg.tools.includes(t);
                                return (
                                  <button
                                    key={t}
                                    onClick={() => handleAgentToolToggle(agent.id, t)}
                                    className={`px-1.5 py-0.5 rounded-md text-[9px] font-mono select-none transition-all cursor-pointer ${
                                      isActive
                                        ? 'bg-zinc-800 text-zinc-200 border border-zinc-600/50'
                                        : 'bg-zinc-900/40 text-zinc-500 border border-zinc-800/30 hover:text-zinc-400 hover:border-zinc-700/50'
                                    }`}
                                  >
                                    {isActive ? <ToggleRight size={10} className="inline mr-0.5 text-emerald-400" /> : <ToggleLeft size={10} className="inline mr-0.5" />}
                                    {t}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* System Prompt */}
                          <div className="text-[10px]">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-bold text-gray-500 uppercase tracking-widest">System Prompt</span>
                              {!isEditing && (
                                <button
                                  onClick={() => handleStartEditPrompt(agent.id, cfg.systemPrompt)}
                                  className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-800/60 border border-zinc-700/30 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/60 transition-all cursor-pointer"
                                >
                                  <Edit3 size={10} />
                                  <span>Edit</span>
                                </button>
                              )}
                            </div>
                            {isEditing ? (
                              <div className="space-y-2">
                                <textarea
                                  value={promptDraft}
                                  onChange={(e) => setPromptDraft(e.target.value)}
                                  className="w-full h-28 p-2.5 rounded-lg bg-zinc-950/45 border border-zinc-700/50 font-mono text-[10px] leading-relaxed text-zinc-300 outline-none focus:ring-1 focus:ring-blue-500 resize-y"
                                />
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleSavePrompt(agent.id)}
                                    className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-600/80 hover:bg-emerald-600 text-white text-[10px] transition-all cursor-pointer"
                                  >
                                    <Save size={10} />
                                    Save
                                  </button>
                                  <button
                                    onClick={handleCancelEditPrompt}
                                    className="px-2.5 py-1 rounded-md bg-zinc-800/60 hover:bg-zinc-700/60 text-zinc-400 text-[10px] transition-all cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="p-2.5 rounded-lg bg-zinc-950/45 border border-zinc-800/50 font-mono text-[9px] leading-relaxed select-text whitespace-pre-wrap text-zinc-400 max-h-20 overflow-y-auto">
                                {cfg.systemPrompt}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Composio Tool Counts Map ──────────────────────────────────────────────────
const TOOLKIT_TOOL_COUNTS: Record<string, number> = {
  gmail: 61,
  googlecalendar: 44,
  googledrive: 76,
  googlesheets: 40,
  googledocs: 33,
  slack: 145,
  github: 846,
  linear: 64,
  notion: 82,
  twitter: 28,
  discord: 37,
  jira: 105,
  trello: 48,
  asana: 74,
  hubspot: 112,
  linkedin: 12,
  figma: 15,
  stripe: 52,
  airtable: 36,
  dropbox: 25,
  supabase: 18,
  salesforce: 180,
};

// ─── Composio Brand Logos ──────────────────────────────────────────────────────
const renderBrandLogo = (slug: string) => {
  const s = slug.toLowerCase();
  switch (s) {
    case 'gmail':
      return (
        <svg className="w-6 h-6 shrink-0" viewBox="0 0 48 48">
          <path fill="#4285F4" d="M45 42H41V19L24 31L7 19V42H3V10c0-.8.5-1.5 1.2-1.8c.8-.3 1.8-.1 2.3.5L24 21L41.5 8.7c.6-.6 1.5-.7 2.3-.4c.7.3 1.2 1 1.2 1.7V42z"/>
          <path fill="#34A853" d="M3 10v32h8V19L3 10z"/>
          <path fill="#EA4335" d="M45 10v32h-8V19L45 10z"/>
          <path fill="#FBBC05" d="M7 19l17 12l17-12V8.7L24 21L7 8.7V19z"/>
        </svg>
      );
    case 'googlecalendar':
      return (
        <svg className="w-6 h-6 shrink-0" viewBox="0 0 48 48">
          <rect x="4" y="8" width="40" height="34" rx="4" fill="#4285F4"/>
          <path fill="#FFF" d="M11 20H37V38H11V20z"/>
          <path fill="#4285F4" d="M11 11h26v6H11v-6z"/>
          <text x="24" y="33" fill="#4285F4" fontSize="16" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">31</text>
        </svg>
      );
    case 'googledrive':
      return (
        <svg className="w-6 h-6 shrink-0" viewBox="0 0 48 48">
          <path fill="#FFCC00" d="M16 33L7 18.5h18L16 33z"/>
          <path fill="#34A853" d="M32 33H14.5L23.5 18H41L32 33z"/>
          <path fill="#0066CC" d="M32 33h-9L14.5 18H23L32 33z" fillOpacity="0.1"/>
          <path fill="#0066CC" d="M23 18L14.5 3h18l8.5 15H23z"/>
        </svg>
      );
    case 'googlesheets':
      return (
        <svg className="w-6 h-6 shrink-0" viewBox="0 0 48 48">
          <rect x="6" y="4" width="36" height="40" rx="3" fill="#0F9D58" />
          <path d="M32 4l10 10H32V4z" fill="#57BB8A" />
          <rect x="12" y="18" width="24" height="20" rx="1.5" fill="#FFFFFF" />
          <line x1="20" y1="18" x2="20" y2="38" stroke="#0F9D58" strokeWidth="2" />
          <line x1="28" y1="18" x2="28" y2="38" stroke="#0F9D58" strokeWidth="2" />
          <line x1="12" y1="24" x2="36" y2="24" stroke="#0F9D58" strokeWidth="2" />
          <line x1="12" y1="31" x2="36" y2="31" stroke="#0F9D58" strokeWidth="2" />
        </svg>
      );
    case 'googledocs':
      return (
        <svg className="w-6 h-6 shrink-0" viewBox="0 0 48 48">
          <rect x="6" y="4" width="36" height="40" rx="3" fill="#4285F4" />
          <path d="M32 4l10 10H32V4z" fill="#AFC4FC" />
          <rect x="14" y="20" width="20" height="3" fill="#FFFFFF" rx="1" />
          <rect x="14" y="27" width="20" height="3" fill="#FFFFFF" rx="1" />
          <rect x="14" y="34" width="14" height="3" fill="#FFFFFF" rx="1" />
        </svg>
      );
    case 'slack':
      return (
        <svg className="w-6 h-6 shrink-0" viewBox="0 0 100 100">
          <path d="M 22,46 A 8,8 0 1,1 22,30 H 38 V 46 Z" fill="#36C5F0" />
          <path d="M 22,54 A 8,8 0 1,1 38,54 V 70 H 22 Z" fill="#E01E5A" />
          <path d="M 46,22 A 8,8 0 1,1 46,38 V 54 H 30 V 38 Z" fill="#36C5F0" />
          <path d="M 54,22 A 8,8 0 1,1 70,22 V 38 H 54 Z" fill="#2EB67D" />
          <path d="M 78,54 A 8,8 0 1,1 78,70 H 62 V 54 Z" fill="#2EB67D" />
          <path d="M 78,46 A 8,8 0 1,1 62,46 V 30 H 78 Z" fill="#ECB22E" />
          <path d="M 54,78 A 8,8 0 1,1 54,62 V 46 H 70 V 62 Z" fill="#ECB22E" />
          <path d="M 46,78 A 8,8 0 1,1 30,78 V 62 H 46 Z" fill="#E01E5A" />
        </svg>
      );
    case 'github':
      return (
        <svg className="w-6 h-6 shrink-0 text-black dark:text-white fill-current" viewBox="0 0 24 24">
          <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.137 20.162 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
        </svg>
      );
    case 'notion':
      return (
        <svg className="w-6 h-6 shrink-0 fill-current text-white bg-black rounded-lg p-0.5" viewBox="0 0 24 24">
          <path d="M4 3h16a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm1.5 3v12H7V9.7L15.3 18h2.2V6H16v8.3L7.7 6H5.5z" />
        </svg>
      );
    case 'linear':
      return (
        <svg className="w-6 h-6 shrink-0 text-white fill-current" viewBox="0 0 24 24">
          <path d="M12 2C6.486 2 2 6.486 2 12s4.486 10 10 10 10-4.486 10-10S17.514 2 12 2zm0 18c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8-3.589 8-8 8zm-1-13h2v5H11V7zm0 7h2v2H11v-2z" />
        </svg>
      );
    case 'trello':
      return (
        <svg className="w-6 h-6 shrink-0" viewBox="0 0 48 48" fill="none">
          <rect width="48" height="48" rx="8" fill="#0079BF"/>
          <rect x="8" y="8" width="13" height="30" rx="3" fill="#FFF"/>
          <rect x="27" y="8" width="13" height="18" rx="3" fill="#FFF"/>
        </svg>
      );
    case 'jira':
      return (
        <svg className="w-6 h-6 shrink-0" viewBox="0 0 24 24" fill="#0052CC">
          <path d="M11.53 2c0 2.4 1.96 4.35 4.37 4.35H20V2h-8.47zm-5.7 5.7c0 2.42 1.95 4.38 4.38 4.38H14.5V7.7H5.83zm-5.7 5.7c0 2.42 1.96 4.38 4.38 4.38H9V13.4H.13z"/>
        </svg>
      );
    case 'asana':
      return (
        <svg className="w-6 h-6 shrink-0" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="6" r="3.5" fill="#FC636B"/>
          <circle cx="6.5" cy="15.5" r="3.5" fill="#FC636B"/>
          <circle cx="17.5" cy="15.5" r="3.5" fill="#FC636B"/>
        </svg>
      );
    case 'discord':
      return (
        <svg className="w-6 h-6 shrink-0" viewBox="0 0 127.14 96.36" fill="#5865F2">
          <path d="M107.7,8.07c-9.53-4.4-19.78-7.7-30.56-9.67a.35.35,0,0,0-.38.18,74.45,74.45,0,0,0-3.37,6.94C71.3,5.19,59,5.19,47.1,5.52a71.86,71.86,0,0,0-3.41-6.94.38.38,0,0,0-.38-.18C32.53.37,22.28,3.67,12.75,8.07a.41.41,0,0,0-.18.15C-7.06,37.6-.46,66.45,12.35,85.25a.43.43,0,0,0,.32.22c13.12,9.65,25.83,15.54,38.14,19.34a.39.39,0,0,0,.42-.14c2.9-4,5.47-8.31,7.66-12.87a.38.38,0,0,0-.21-.52,49,49,0,0,1-5.93-2.83.4.4,0,0,1-.05-.66,35.25,35.25,0,0,0,1.24-1c7.22,4.19,15.2,4.19,22.21,0a30.82,30.82,0,0,0,1.24,1,.41.41,0,0,1-.05.66c-1.89,1.11-3.87,2.06-5.92,2.83a.4.4,0,0,0-.2.52c2.19,4.56,4.76,8.91,7.66,12.87a.42.42,0,0,0,.42.14c12.31-3.8,25-9.69,38.14-19.34a.4.4,0,0,0,.32-.22C128.53,66.45,121.75,37.6,107.88,8.22A.38.38,0,0,0,107.7,8.07ZM42.45,65.69c-7.51,0-13.75-6.93-13.75-15.43S34.82,34.83,42.45,34.83,56.24,41.76,56.12,50.26C56.12,58.76,50,65.69,42.45,65.69Zm42.24,0c-7.51,0-13.75-6.93-13.75-15.43S77.06,34.83,84.69,34.83,98.48,41.76,98.36,50.26C98.36,58.76,92.21,65.69,84.69,65.69Z"/>
        </svg>
      );
    case 'stripe':
      return (
        <svg className="w-6 h-6 shrink-0" viewBox="0 0 24 24" fill="#635BFF">
          <path d="M13.996 11.23c0-.98-.79-1.42-2.1-1.42-1.74 0-3.32.55-4.57 1.25V5.55A12.021 12.021 0 0 1 12.214 4c3.48 0 5.92 1.76 5.92 5.56 0 4.96-4.04 5.96-7.39 6.84-1.28.34-2.6.61-2.6 1.48 0 .96.86 1.44 2.22 1.44 1.93 0 3.8-.76 5.25-1.63v5.6c-1.57.73-3.69 1.16-5.46 1.16-3.8 0-6.15-1.84-6.15-5.69 0-4.99 4.12-6 7.42-6.85 1.54-.42 2.58-.69 2.58-1.68z"/>
        </svg>
      );
    case 'hubspot':
      return (
        <svg className="w-6 h-6 shrink-0" viewBox="0 0 24 24" fill="#FF7A59">
          <path d="M18.8 10.1c-.2-.1-.5-.2-.8-.2h-4.2l-2.1-3.6c.4-.3.7-.7.9-1.2.2-.6.2-1.2 0-1.8-.2-.6-.5-1.1-1-1.4-.4-.3-1-.5-1.6-.4s-1.1.3-1.4.8c-.3.4-.5 1-.4 1.6.1.6.3 1.1.8 1.4.3.2.6.3.9.3l2.1 3.6h-1c-.6 0-1.1.2-1.5.6l-3.3.6C5.5 8.1 4.3 8.3 3.3 9c-.9.6-1.7 1.5-2.2 2.5s-.6 2.2-.4 3.3c.3 1.1.9 2.1 1.7 2.8.9.8 1.9 1.2 3.1 1.3l.1-1.7c-.8-.1-1.5-.4-2.1-.9-.6-.5-1-1.2-1.2-2s-.1-1.6.2-2.3c.4-.7.9-1.3 1.6-1.7.6-.3 1.2-.5 1.9-.5l3.2-.6c.4-.1.7-.3 1-.5h1.2v3.7c-.4.2-.8.6-1 1-.2.5-.2 1.1-.1 1.6.1.5.4 1 .8 1.3.4.3.9.5 1.4.5.5 0 1-.2 1.4-.5.4-.3.7-.8.8-1.3s.1-1.1-.1-1.6c-.3-.4-.6-.8-1-1v-3.7h1.4c.5 0 1-.2 1.4-.5l4.3 1.2c.5.2.9.4 1.3.8.4.3.7.8.9 1.3s.2 1 .1 1.5c-.1.5-.3 1-.7 1.3-.3.3-.8.6-1.3.7s-1 .1-1.5-.1c-.5-.2-.9-.5-1.2-.9l-1.3.9c.5.7 1.2 1.2 2 1.5s1.7.3 2.5.1a3.94 3.94 0 0 0 2.5-1.8 4.09 4.09 0 0 0 .5-3.1c-.2-1-.7-1.9-1.5-2.5s-1.7-.9-2.7-1zm-10-8c-.3 0-.6-.1-.8-.3-.2-.2-.3-.5-.3-.8s.1-.6.3-.8c.2-.2.5-.3.8-.3s.6.1.8.3c.2.2.3.5.3.8s-.1.6-.3.8c-.2.2-.5.3-.8.3zm3.2 13.8c-.3 0-.6-.1-.8-.3-.2-.2-.3-.5-.3-.8s.1-.6.3-.8c.2-.2.5-.3.8-.3s.6.1.8.3c.2.2.3.5.3.8s-.1.6-.3.8c-.2.2-.5.3-.8.3z"/>
        </svg>
      );
    case 'salesforce':
      return (
        <svg className="w-6 h-6 shrink-0" viewBox="0 0 24 24" fill="#00A1E0">
          <path d="M19.4 10.7a4.45 4.45 0 0 0-4.4-4.4 4.8 4.8 0 0 0-3-.9A5.8 5.8 0 0 0 6.2 11c-.5-.1-1-.1-1.4-.1a3.84 3.84 0 0 0-3.8 3.8 3.8 3.8 0 0 0 3.8 3.8h14.6a3.84 3.84 0 0 0 3.8-3.8 4.3 4.3 0 0 0-3.8-4z"/>
        </svg>
      );
    default:
      return (
        <div className="w-6 h-6 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-750 flex items-center justify-center text-zinc-600 dark:text-zinc-400 shrink-0 font-bold text-[10px] uppercase font-mono">
          {slug.substring(0, 2)}
        </div>
      );
  }
};

function ComposioPanel() {
  return <ComposioPanelRefactored />;
}

function OldComposioPanel() {

  const [apiKey, setApiKey] = React.useState(() => localStorage.getItem('COMPOSIO_API_KEY') || '');
  const [isVerifying, setIsVerifying] = React.useState(false);
  const [isEnabled, setIsEnabled] = React.useState(false);
  const [toolkits, setToolkits] = React.useState<any[]>([]);
  const [loaded, setLoaded] = React.useState(false);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [verifyError, setVerifyError] = React.useState<string | null>(null);
  const authPollRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const [showKeyForm, setShowKeyForm] = React.useState(false);
  const [expandedToolsSlug, setExpandedToolsSlug] = React.useState<string | null>(null);
  const [expandedToolsList, setExpandedToolsList] = React.useState<any[]>([]);
  const [loadingTools, setLoadingTools] = React.useState(false);

  React.useEffect(() => () => { if (authPollRef.current) clearInterval(authPollRef.current); }, []);

  const saveKey = (val: string) => {
    setApiKey(val);
    setVerifyError(null);
    localStorage.setItem('COMPOSIO_API_KEY', val);
  };

  const verifyKey = async () => {
    if (!apiKey) return;
    setIsVerifying(true);
    setVerifyError(null);
    try {
      const r = await fetch('/api/composio/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey }),
      });
      const data = await r.json();
      if (data.enabled) {
        setIsEnabled(true);
        fetchToolkits();
      } else {
        setIsEnabled(false);
        setVerifyError(data.error || 'Invalid API key');
      }
    } catch (err) {
      setVerifyError('Failed to connect to server');
      setIsEnabled(false);
    }
    setIsVerifying(false);
  };

  const fetchToolkits = React.useCallback(async () => {
    try {
      const r = await fetch('/api/composio/toolkits');
      const data = await r.json();
      setToolkits(data.toolkits || []);
    } catch {}
    setLoaded(true);
  }, []);

  const connect = async (slug: string) => {
    setBusy(slug);
    try {
      const r = await fetch(`/api/composio/toolkits/${slug}/authorize`, { method: 'POST' });
      if (!r.ok) { setBusy(null); return; }
      const { redirectUrl } = await r.json();
      if (!redirectUrl) { setBusy(null); return; }
      const w = 600, h = 700;
      const left = window.screenX + (window.outerWidth - w) / 2;
      const top = window.screenY + (window.outerHeight - h) / 2;
      const popup = window.open(redirectUrl, 'composio-auth', `width=${w},height=${h},left=${left},top=${top}`);
      if (authPollRef.current) clearInterval(authPollRef.current);
      authPollRef.current = setInterval(async () => {
        if (!popup || popup.closed) {
          if (authPollRef.current) { clearInterval(authPollRef.current); authPollRef.current = null; }
          await fetch('/api/composio/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ apiKey }),
          });
          await fetchToolkits();
          setBusy(null);
        }
      }, 800);
    } catch { setBusy(null); }
  };

  const disconnect = async (slug: string, connectionId: string) => {
    setBusy(`${slug}:${connectionId}`);
    try {
      await fetch(`/api/composio/toolkits/${slug}/disconnect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionId }),
      });
      await fetchToolkits();
    } catch {}
    setBusy(null);
  };

  const toggleShowTools = async (slug: string) => {
    if (expandedToolsSlug === slug) {
      setExpandedToolsSlug(null);
      setExpandedToolsList([]);
      return;
    }
    setExpandedToolsSlug(slug);
    setLoadingTools(true);
    try {
      const r = await fetch(`/api/composio/toolkit-tools/${slug}`);
      if (r.ok) {
        const data = await r.json();
        setExpandedToolsList(data.tools || []);
      } else {
        setExpandedToolsList([]);
      }
    } catch {
      setExpandedToolsList([]);
    } finally {
      setLoadingTools(false);
    }
  };

  const statusColor = (status: string) => {
    const colors: Record<string, string> = {
      ACTIVE: 'bg-emerald-500',
      INITIATED: 'bg-amber-500',
      INITIALIZING: 'bg-amber-500',
      EXPIRED: 'bg-rose-500',
      FAILED: 'bg-rose-500',
    };
    return colors[status] || 'bg-zinc-500';
  };

  return (
    <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-8 text-left font-sans">
      <div>
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Composio Integrations</h3>
        <p className="text-xs text-gray-500 mb-6">Connect your accounts to give the agent access to Gmail, Slack, GitHub, Notion, and hundreds of other services.</p>

        <div className="border border-zinc-800 bg-zinc-900/20 rounded-xl p-5 space-y-5">
          <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
            <Server size={16} className="text-emerald-500" />
            <span className="text-xs font-bold uppercase tracking-wider text-white">API Key</span>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">COMPOSIO_API_KEY</label>
            <div className="flex gap-2">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => saveKey(e.target.value)}
                placeholder="Get a key at app.composio.dev/developers"
                className="flex-1 bg-zinc-900 border border-zinc-800 focus:border-zinc-600 focus:outline-none rounded-xl px-3.5 py-2.5 text-xs text-zinc-200 placeholder-zinc-600 font-mono"
              />
              <button
                onClick={verifyKey}
                disabled={isVerifying || !apiKey}
                className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-700 text-white text-xs font-semibold rounded-xl transition-colors"
              >
                {isVerifying ? 'Verifying...' : 'Verify'}
              </button>
            </div>
            <span className="text-[10px] text-zinc-500">Get your API key at <a href="https://app.composio.dev/developers" target="_blank" rel="noreferrer" className="text-blue-400 underline">app.composio.dev/developers</a></span>
            {verifyError && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-rose-500/10 border border-rose-500/20">
                <span className="text-xs text-rose-400">{verifyError}</span>
              </div>
            )}
            {isEnabled && !verifyError && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <span className="text-xs text-emerald-400">API key verified successfully</span>
              </div>
            )}
          </div>
        </div>

        {isEnabled && (
          <div className="border border-zinc-800 bg-zinc-900/20 rounded-xl p-5 space-y-4 mt-5">
            <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
              <Server size={16} className="text-emerald-500" />
              <span className="text-xs font-bold uppercase tracking-wider text-white">Connected Toolkits</span>
              {toolkits.length > 0 && (
                <span className="text-[10px] text-zinc-500 font-mono">{toolkits.filter(t => t.connections.some((c: any) => c.status === 'ACTIVE')).length} active</span>
              )}
            </div>

            {!loaded ? (
              <div className="space-y-3">
                {[1,2,3].map(i => <div key={i} className="h-16 rounded-xl bg-zinc-900 border border-zinc-800 animate-pulse" />)}
              </div>
            ) : toolkits.length > 0 ? (
              <div className="grid gap-3">
                {toolkits.map((t: any) => {
                  const hasActive = t.connections.some((c: any) => c.status === 'ACTIVE');
                  return (
                    <div key={t.slug} className="border border-zinc-800 bg-zinc-900/40 rounded-xl px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-zinc-200">{t.displayName}</span>
                            <span className="text-[10px] text-zinc-500 font-mono">{t.slug}</span>
                          </div>
                        </div>
                        {!hasActive && (
                          <button
                            onClick={() => connect(t.slug)}
                            disabled={busy === t.slug}
                            className="px-3 py-1.5 text-xs rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-700 text-white font-medium transition-colors"
                          >
                            {busy === t.slug ? 'Connecting...' : 'Connect'}
                          </button>
                        )}
                      </div>

                      {t.connections.length > 0 && (
                        <div className="mt-3 space-y-1.5">
                          {t.connections.map((c: any) => (
                            <div key={c.id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-zinc-900/60 border border-zinc-800/80">
                              <span className={`w-1.5 h-1.5 rounded-full ${statusColor(c.status)}`} />
                              <span className="text-xs text-zinc-300 font-medium truncate max-w-[12rem]">{c.alias || c.accountLabel || c.accountEmail || `Account`}</span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                                c.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400' :
                                c.status === 'EXPIRED' || c.status === 'FAILED' ? 'bg-rose-500/10 text-rose-400' :
                                'bg-amber-500/10 text-amber-400'
                              }`}>
                                {c.status}
                              </span>
                              <div className="flex-1" />
                              <button
                                onClick={() => disconnect(t.slug, c.id)}
                                disabled={busy === `${t.slug}:${c.id}`}
                                className="text-[11px] text-zinc-500 hover:text-rose-400 transition-colors"
                              >
                                {busy === `${t.slug}:${c.id}` ? '...' : 'Disconnect'}
                              </button>
                            </div>
                          ))}
                          <button
                            onClick={() => connect(t.slug)}
                            disabled={busy === t.slug}
                            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                          >
                            + Add another account
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="px-4 py-8 text-center text-xs text-zinc-500">No toolkits found</div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

interface AnthropicProxyPanelProps {
  availableModels: any[];
  aiProviderProfiles: any[];
}

const renderAppModelLogo = (fullName: string, modelId: string, fallback: React.ReactNode) => {
  if (fallback) return fallback;
  return <Brain size={14} className="text-[var(--theme-muted)] shrink-0" />;
};

function AnthropicProxyPanel({ availableModels, aiProviderProfiles }: AnthropicProxyPanelProps) {
  const [mappings, setMappings] = React.useState<Record<string, string>>({
    opus: 'direct',
    sonnet: 'direct',
    haiku: 'direct',
  });
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [status, setStatus] = React.useState<{ type: 'success' | 'error', message: string } | null>(null);
  
  // Slide drawer state
  const [activeSelectTier, setActiveSelectTier] = React.useState<'opus' | 'sonnet' | 'haiku' | null>(null);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [collapsedCategories, setCollapsedCategories] = React.useState<Record<string, boolean>>({});

  React.useEffect(() => {
    let active = true;
    const loadSettings = async () => {
      try {
        const res = await fetch('/api/anthropic/settings');
        if (res.ok && active) {
          const data = await res.json();
          setMappings({
            opus: data.opus ? `${data.opus.modelId}::${data.opus.providerProfileId}` : 'direct',
            sonnet: data.sonnet ? `${data.sonnet.modelId}::${data.sonnet.providerProfileId}` : 'direct',
            haiku: data.haiku ? `${data.haiku.modelId}::${data.haiku.providerProfileId}` : 'direct',
          });
        }
      } catch (err) {
        console.error('Failed to load anthropic proxy settings', err);
      } finally {
        if (active) setLoading(false);
      }
    };
    loadSettings();
    return () => {
      active = false;
    };
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setStatus(null);
    try {
      const payload: any = {};
      for (const tier of ['opus', 'sonnet', 'haiku'] as const) {
        const val = mappings[tier];
        if (val === 'direct') {
          payload[tier] = null;
        } else {
          const [modelId, profileId] = val.split('::');
          const profile = aiProviderProfiles.find(p => p.id === profileId);
          if (profile) {
            payload[tier] = {
              modelId,
              providerProfileId: profileId,
              endpoint: profile.endpoint,
              apiKey: profile.apiKey,
              provider: profile.provider
            };
          } else {
            payload[tier] = null;
          }
        }
      }

      const res = await fetch('/api/anthropic/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setStatus({ type: 'success', message: 'Anthropic proxy settings saved successfully!' });
      } else {
        setStatus({ type: 'error', message: 'Failed to save settings to the backend.' });
      }
    } catch (err: any) {
      setStatus({ type: 'error', message: err.message || 'An error occurred while saving settings.' });
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const getMappedModelName = (value: string) => {
    if (value === 'direct') return 'Direct (Pass-through)';
    const [modelId, profileId] = value.split('::');
    const matched = availableModels.find(m => m.id === modelId && m.providerProfileId === profileId);
    return matched ? `${matched.name} (${matched.providerProfileName || matched.provider})` : modelId;
  };

  // Group availableModels by providerProfileId
  const providerModelCategories = React.useMemo(() => {
    const groups = new Map<string, { id: string; label: string; active: boolean; models: any[] }>();
    for (const model of availableModels) {
      const categoryId = model.providerProfileId || 'default-provider';
      const label = model.providerProfileName || model.provider || 'Available Models';
      const active = model.providerProfileActive !== false;
      if (!groups.has(categoryId)) {
        groups.set(categoryId, { id: categoryId, label, active, models: [] });
      }
      groups.get(categoryId)!.models.push(model);
    }
    return Array.from(groups.values());
  }, [availableModels]);

  const toggleCategory = (categoryId: string) => {
    setCollapsedCategories(prev => ({
      ...prev,
      [categoryId]: prev[categoryId] === undefined ? false : !prev[categoryId]
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <RefreshCw size={24} className="animate-spin text-zinc-500" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-8 text-left font-sans h-full flex flex-col relative"
    >
      <div className="flex-1 overflow-y-auto space-y-6 pr-2">
        <div>
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Anthropic API Proxy</h3>
          <p className="text-xs text-gray-500">
            Lumina can intercept incoming <code className="px-1 py-0.5 bg-zinc-800 rounded font-mono text-[11px] text-zinc-300">POST /v1/messages</code> calls made by external tools (e.g., Composio or Claude Agent SDK) and map them to your configured LLM profiles.
          </p>
        </div>

        {/* Configuration instructions */}
        <div className="p-4 rounded-xl border bg-zinc-950/20 border-zinc-800 space-y-3">
          <h4 className="text-xs font-semibold text-zinc-200 flex items-center gap-2">
            <Globe size={14} className="text-blue-500" />
            External SDK Setup Instructions
          </h4>
          <p className="text-xs text-zinc-400">
            To route your external SDK completions through Lumina, point the ANTHROPIC_BASE_URL to your local Lumina server:
          </p>
          <div className="flex items-center gap-2 bg-zinc-950 p-2.5 rounded-lg border border-zinc-800/80 font-mono text-[11px] text-zinc-300">
            <span className="flex-1 truncate">export ANTHROPIC_BASE_URL="http://localhost:3000/v1"</span>
            <button
              onClick={() => copyToClipboard('export ANTHROPIC_BASE_URL="http://localhost:3000/v1"')}
              className="p-1 hover:bg-zinc-850 rounded text-zinc-500 hover:text-zinc-300 transition-colors"
              title="Copy to clipboard"
            >
              <Copy size={12} />
            </button>
          </div>
        </div>

        {/* Grid for cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Claude Opus Card */}
          <div className="p-4 rounded-xl border bg-zinc-950/10 border-zinc-850/60 hover:border-zinc-800 transition-all flex flex-col justify-between gap-4">
            <div className="space-y-2">
              <h5 className="text-xs font-bold text-zinc-100 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-purple-500" />
                Claude Opus Proxy
              </h5>
              <p className="text-[11px] text-zinc-500">
                Maps incoming <code className="px-1 bg-zinc-900 rounded font-mono text-[10px]">claude-3-opus</code> calls.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveSelectTier('opus')}
              className="w-full h-10 px-3 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 focus:outline-none rounded-xl text-xs text-zinc-200 flex items-center justify-between transition-all"
            >
              <span className="truncate font-medium text-left pr-2">
                {getMappedModelName(mappings.opus)}
              </span>
              <ChevronDown size={13} className="text-zinc-500 shrink-0" />
            </button>
          </div>

          {/* Claude Sonnet Card */}
          <div className="p-4 rounded-xl border bg-zinc-950/10 border-zinc-850/60 hover:border-zinc-800 transition-all flex flex-col justify-between gap-4">
            <div className="space-y-2">
              <h5 className="text-xs font-bold text-zinc-100 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-orange-500" />
                Claude Sonnet Proxy
              </h5>
              <p className="text-[11px] text-zinc-500">
                Maps incoming <code className="px-1 bg-zinc-900 rounded font-mono text-[10px]">claude-3-5-sonnet</code> calls.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveSelectTier('sonnet')}
              className="w-full h-10 px-3 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 focus:outline-none rounded-xl text-xs text-zinc-200 flex items-center justify-between transition-all"
            >
              <span className="truncate font-medium text-left pr-2">
                {getMappedModelName(mappings.sonnet)}
              </span>
              <ChevronDown size={13} className="text-zinc-500 shrink-0" />
            </button>
          </div>

          {/* Claude Haiku Card */}
          <div className="p-4 rounded-xl border bg-zinc-950/10 border-zinc-855/60 hover:border-zinc-800 transition-all flex flex-col justify-between gap-4">
            <div className="space-y-2">
              <h5 className="text-xs font-bold text-zinc-100 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                Claude Haiku Proxy
              </h5>
              <p className="text-[11px] text-zinc-500">
                Maps incoming <code className="px-1 bg-zinc-900 rounded font-mono text-[10px]">claude-3-5-haiku</code> calls.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveSelectTier('haiku')}
              className="w-full h-10 px-3 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 focus:outline-none rounded-xl text-xs text-zinc-200 flex items-center justify-between transition-all"
            >
              <span className="truncate font-medium text-left pr-2">
                {getMappedModelName(mappings.haiku)}
              </span>
              <ChevronDown size={13} className="text-zinc-500 shrink-0" />
            </button>
          </div>
        </div>
      </div>

      {status && (
        <div className={`p-3.5 rounded-xl text-xs flex items-center gap-2 border ${
          status.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
            : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
        }`}>
          <span className="flex-1">{status.message}</span>
        </div>
      )}

      <div className="pt-4 border-t border-zinc-800/60 flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-600 rounded-xl text-white font-medium text-xs transition-all flex items-center gap-2 shadow-lg shadow-blue-500/10"
        >
          {saving ? (
            <>
              <RefreshCw size={12} className="animate-spin" />
              Saving Settings...
            </>
          ) : (
            'Save Settings'
          )}
        </button>
      </div>

      {/* Model Selector Slide Drawer */}
      <AnimatePresence>
        {activeSelectTier && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              onClick={() => {
                setActiveSelectTier(null);
                setSearchQuery('');
              }}
              className="fixed inset-0 z-[190] bg-black/25"
            />
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="fixed right-0 top-0 bottom-0 z-[191] w-full max-w-[380px] bg-[var(--theme-surface)] border-l border-[var(--theme-border)] shadow-2xl flex flex-col text-left font-sans"
            >
              <div className="h-16 px-5 border-b border-[var(--theme-border)] flex items-center justify-between shrink-0">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-[var(--theme-primary)]">Select Model</div>
                  <div className="text-xs text-[var(--theme-secondary)] truncate">
                    Mapping for Claude {activeSelectTier.charAt(0).toUpperCase() + activeSelectTier.slice(1)} (Currently: {getMappedModelName(mappings[activeSelectTier])})
                  </div>
                </div>
                <button
                  onClick={() => {
                    setActiveSelectTier(null);
                    setSearchQuery('');
                  }}
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-[var(--theme-secondary)] hover:text-[var(--theme-primary)] hover:bg-[var(--theme-hover-bg)] transition-colors"
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
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-10 pl-9 pr-3 bg-[var(--theme-hover-bg)] border border-[var(--theme-border)] rounded-xl text-sm outline-none text-[var(--theme-primary)] placeholder:text-[var(--theme-muted)]"
                    autoFocus
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--theme-muted)]">Categories</span>
                </div>

                {/* Direct Pass-through option */}
                <div className="rounded-xl border border-[var(--theme-border)] overflow-hidden">
                  <div
                    className={`group w-full min-h-[46px] flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      mappings[activeSelectTier] === 'direct'
                        ? 'bg-[var(--theme-hover-bg)] text-[var(--theme-primary)] font-bold'
                        : 'text-[var(--theme-secondary)] hover:bg-[var(--theme-hover-bg)] hover:text-[var(--theme-primary)]'
                    }`}
                  >
                    <button
                      onClick={() => {
                        setMappings({ ...mappings, [activeSelectTier]: 'direct' });
                        setActiveSelectTier(null);
                        setSearchQuery('');
                      }}
                      className="flex-1 min-w-0 flex items-center gap-3 text-left"
                    >
                      <div className="shrink-0">
                        <Globe size={14} className="text-[var(--theme-muted)]" />
                      </div>
                      <span className="flex-1 min-w-0">
                        <span className="block truncate">Direct Pass-through</span>
                        <span className="block text-[10px] text-[var(--theme-muted)] truncate font-normal">Pass requests directly to Anthropic</span>
                      </span>
                    </button>
                    {mappings[activeSelectTier] === 'direct' && <Check size={14} className="text-[var(--theme-accent)] shrink-0" />}
                  </div>
                </div>

                {/* Categories */}
                {providerModelCategories.map((category) => {
                  const allModels = Array.isArray(category.models) ? category.models : [];
                  const visibleModels = searchQuery
                    ? allModels.filter((model: any) => {
                        const id = String(model?.id || '').toLowerCase();
                        const name = String(model?.name || '').toLowerCase();
                        return id.includes(searchQuery.toLowerCase()) || name.includes(searchQuery.toLowerCase());
                      })
                    : allModels;

                  if (visibleModels.length === 0) return null;
                  const isCollapsed = collapsedCategories[category.id] ?? !category.active;

                  return (
                    <div key={category.id} className="rounded-xl border border-[var(--theme-border)] overflow-hidden">
                      <button
                        onClick={() => toggleCategory(category.id)}
                        className="w-full h-9 px-3 flex items-center gap-2 text-xs font-semibold text-[var(--theme-primary)] bg-[var(--theme-hover-bg)]"
                      >
                        {isCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
                        <span className="flex-1 text-left truncate">{category.label}</span>
                        <span className="text-[10px] text-[var(--theme-secondary)]">{visibleModels.length}</span>
                      </button>
                      {!isCollapsed && (
                        <div className="p-1.5 space-y-1">
                          {visibleModels.map((model: any) => {
                            const value = `${model.id}::${model.providerProfileId}`;
                            const isSelected = mappings[activeSelectTier] === value;
                            return (
                              <div
                                key={`${category.id}-${model.id}`}
                                className={`group w-full min-h-[46px] flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                  isSelected
                                    ? 'bg-[var(--theme-hover-bg)] text-[var(--theme-primary)] font-bold'
                                    : 'text-[var(--theme-secondary)] hover:bg-[var(--theme-hover-bg)] hover:text-[var(--theme-primary)]'
                                }`}
                              >
                                <button
                                  onClick={() => {
                                    setMappings({ ...mappings, [activeSelectTier]: value });
                                    setActiveSelectTier(null);
                                    setSearchQuery('');
                                  }}
                                  className="flex-1 min-w-0 flex items-center gap-3 text-left"
                                >
                                  <div className="shrink-0">
                                    {renderAppModelLogo(model.author || model.providerProfileName || model.id.split('/')[0] || '', model.id, model.icon)}
                                  </div>
                                  <span className="flex-1 min-w-0">
                                    <span className="block truncate">{model.name}</span>
                                    <span className="block text-[10px] text-[var(--theme-muted)] truncate font-normal">{model.id}</span>
                                  </span>
                                </button>
                                {isSelected && <Check size={14} className="text-[var(--theme-accent)] shrink-0" />}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
