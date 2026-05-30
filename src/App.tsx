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
import { motion, AnimatePresence } from 'motion/react';
import { 
  Send, 
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
import { CoderLeftExplorer } from './components/CoderLeftExplorer';
import { FloatingCodeEditor } from './components/FloatingCodeEditor';
import TerminalConsole from './components/TerminalConsole';
import Whiteboard from './components/Whiteboard';

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
import { useDevTools } from './hooks/useDevTools';
import { useAskAi } from './hooks/useAskAi';
import { useCoderMode } from './hooks/useCoderMode';
import { useRightPanel } from './hooks/useRightPanel';

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
import { ImageLightbox, VideoPlayerPopup, UrlAttachmentModal, TranscriptModal, ElementAnalysisModal } from './components/InteractiveModals';

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

export default function App() {
  const { isDark: isDarkMode, theme } = useTheme();
  const [userProfile, setUserProfile] = useState<{
    name: string;
    avatar: string;
    dob: string;
    location: string;
    age?: number | string;
  }>(() => {
    try {
      const saved = localStorage.getItem('lumina_user_profile');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      name: 'User',
      avatar: '',
      dob: '',
      location: '',
      age: ''
    };
  });

  useEffect(() => {
    try {
      localStorage.setItem('lumina_user_profile', JSON.stringify(userProfile));
      if (userProfile.name && userProfile.name.trim() !== '' && userProfile.name !== 'User') {
        localStorage.setItem('lumina_profile_created', 'true');
      }
    } catch (e) {}
  }, [userProfile]);

  const [projectFolders, setProjectFolders] = useState<{ id: string; name: string }[]>(() => {
    try {
      const saved = localStorage.getItem('lumina_project_folders');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [
      { id: '1', name: 'UI Components' },
      { id: '2', name: 'Analysis' },
    ];
  });

  useEffect(() => {
    try {
      localStorage.setItem('lumina_project_folders', JSON.stringify(projectFolders));
    } catch (e) {}
  }, [projectFolders]);

  const [activeProjectId, setActiveProjectId] = useState<string | null>(() => {
    try {
      return localStorage.getItem('lumina_active_project_id');
    } catch (e) {
      return null;
    }
  });

  useEffect(() => {
    try {
      if (activeProjectId) {
        localStorage.setItem('lumina_active_project_id', activeProjectId);
      } else {
        localStorage.removeItem('lumina_active_project_id');
      }
    } catch (e) {}
  }, [activeProjectId]);

  const [showLogin, setShowLogin] = useState(() => {
    try {
      const created = localStorage.getItem('lumina_profile_created');
      if (created === 'true') {
        return false;
      }
      const saved = localStorage.getItem('lumina_user_profile');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.name && parsed.name.trim() !== '' && parsed.name !== 'User') {
          return false;
        }
      }
      return true;
    } catch (e) {
      return true;
    }
  });
  const [loginName, setLoginName] = useState(() => {
    return userProfile.name && userProfile.name !== 'User' ? userProfile.name : '';
  });
  const [loginAge, setLoginAge] = useState(() => {
    return userProfile.age ? String(userProfile.age) : '';
  });
  const [errorText, setErrorText] = useState('');

  const handleOnboardingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginName.trim()) {
      setErrorText('Please enter a valid name.');
      return;
    }
    const ageNum = parseInt(loginAge);
    if (isNaN(ageNum) || ageNum <= 0 || ageNum > 120) {
      setErrorText('Please enter a valid age (1-120).');
      return;
    }

    const updatedProfile = {
      name: loginName.trim(),
      age: ageNum,
      avatar: `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(loginName.trim())}`,
      dob: '',
      location: 'Local Workspace'
    };

    setUserProfile(updatedProfile);
    try {
      localStorage.setItem('lumina_user_profile', JSON.stringify(updatedProfile));
      localStorage.setItem('lumina_profile_created', 'true');
    } catch (err) {}
    setShowLogin(false);
  };

  const [chats, setChats] = useState<Chat[]>([]);
  const [lightboxImage, setLightboxImage] = useState<{ url: string; title?: string } | null>(null);
  const [activeVideo, setActiveVideo] = useState<{ url: string; title?: string } | null>(null);

  useEffect(() => {
    (window as any).openImageLightbox = (url: string, title?: string) => {
      setLightboxImage({ url, title });
    };
    (window as any).playVideoInLuminaPopup = (url: string, title?: string) => {
      setActiveVideo({ url, title });
    };
    return () => {
      delete (window as any).openImageLightbox;
      delete (window as any).playVideoInLuminaPopup;
    };
  }, []);

  const [currentChatId, setCurrentChatId] = useState<string | null>(null);

  const [agents, setAgents] = useState<Agent[]>(() => loadAgents());
  const [activeAgent, setActiveAgent] = useState<Agent | null>(null);
  const [showAgentCreation, setShowAgentCreation] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);

  const handleSelectAgent = useCallback((agent: Agent) => {
    setActiveAgent(agent);
    setCurrentChatId(null); // Deselect generic chat since we are in Agent View!
  }, []);

  const handleAgentCreated = useCallback((agent: Agent) => {
    const updated = addAgent(agent);
    setAgents(updated);
    setActiveAgent(agent);
    setShowAgentCreation(false);
  }, []);

  const handleDeleteAgent = useCallback((id: string) => {
    const updated = deleteAgent(id);
    setAgents(updated);
    if (activeAgent?.id === id) setActiveAgent(null);
  }, [activeAgent]);

  const handleUpdateAgent = useCallback((id: string, patch: Partial<Agent>) => {
    const updated = updateAgent(id, patch);
    setAgents(updated);
    setActiveAgent(prev => prev?.id === id ? { ...prev, ...patch } : prev);
  }, []);

  const handleEditAgent = useCallback((agent: Agent) => {
    setEditingAgent(agent);
    setShowAgentCreation(true);
  }, []);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(260);
  const [isResizing, setIsResizing] = useState(false);
  
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = e.clientX;
      if (newWidth >= 180 && newWidth <= 600) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    };
  }, [isResizing]);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    if (isSettingsOpen) {
      setShowAgentCreation(false);
      setEditingAgent(null);
    }
  }, [isSettingsOpen]);

  useEffect(() => {
    if (showAgentCreation) {
      setIsSettingsOpen(false);
    }
  }, [showAgentCreation]);
  const [isCompactSidebar, setIsCompactSidebar] = useState(() => {
    return localStorage.getItem('lumina_compact_sidebar') === 'true';
  });
  const [useBubbles, setUseBubbles] = useState(() => {
    return localStorage.getItem('lumina_use_bubbles') !== 'false';
  });
  const [autoHideTopBar, setAutoHideTopBar] = useState(() => {
    return localStorage.getItem('lumina_auto_hide_top_bar') === 'true';
  });
  const [useTurboQuant, setUseTurboQuant] = useState(() => {
    return localStorage.getItem('lumina_turboquant') === 'true';
  });
  const [isSourcesPanelOpen, setIsSourcesPanelOpen] = useState(false);
  const [sourcesPanelMessageId, setSourcesPanelMessageId] = useState<string | null>(null);



  const [activeSettingsTab, setActiveSettingsTab] = useState<'general' | 'ai' | 'mcp' | 'bridge' | 'sources' | 'search' | 'persona' | 'profile' | 'theme' | 'lumina_tools'>('general');
  const [activePlusSubMenu, setActivePlusSubMenu] = useState<'main' | 'mcp' | 'tools' | 'lumina_tools' | 'project' | 'skills' | 'style'>('main');
  const [mcpMode, setMcpMode] = useState<'local' | 'remote'>('local');
  const [remoteMcpConfig, setRemoteMcpConfig] = useState({ url: '', status: 'disconnected' as 'disconnected' | 'connecting' | 'connected', error: '' });
  const [testToolInput, setTestToolInput] = useState({ name: '', args: '{}' });
  const [isTestingTool, setIsTestingTool] = useState(false);
  const [testToolResult, setTestToolResult] = useState<any>(null);
  const [modelSearchQuery, setModelSearchQuery] = useState('');
  const [providerSearchQuery, setProviderSearchQuery] = useState('');
  const [persona, setPersona] = useState({
    name: 'Lumina',
    role: 'Modern Intelligence',
    avatar: '',
    isGeneratingAvatar: false
  });
  const [serverUrl, setServerUrl] = useState(() => safeGetItem('lumina_server_url', 'https://openprovider.mimika.in/v1'));
  const [apiKey, setApiKey] = useState(() => safeGetItem('lumina_api_key', DEFAULT_API_KEY));
  const [mcpUrl, setMcpUrl] = useState(() => safeGetItem('lumina_mcp_url', DEFAULT_MCP_URL));
  const [mcpKey, setMcpKey] = useState(() => safeGetItem('lumina_mcp_key', DEFAULT_API_KEY));
  
  // Llama Bridge backend
  const [llamaBridgeUrl, setLlamaBridgeUrl] = useState(() => 
    localStorage.getItem('lumina_llama_url') || 'http://localhost:8089'
  );
  const [llamaBridgeApiKey, setLlamaBridgeApiKey] = useState(() => 
    localStorage.getItem('lumina_llama_key') || ''
  );
  const [llamaBridgeModels, setLlamaBridgeModels] = useState<{id: string, name: string}[]>([]);
  const [selectedLlamaModel, setSelectedLlamaModel] = useState('');
  const [useBridgeTools, setUseBridgeTools] = useState(() => localStorage.getItem('lumina_bridge_enabled') === 'true');
  const [searchProvider, setSearchProvider] = useState(() => localStorage.getItem('lumina_search_provider') || 'tavily');
  const [tavilyApiKey, setTavilyApiKey] = useState(() => safeGetItem('lumina_tavily_key', ''));
  const [serpApiKey, setSerpApiKey] = useState(() => safeGetItem('lumina_serp_key', ''));
  
  const [aiVerificationState, setAiVerificationState] = useState<'idle' | 'verifying' | 'success' | 'error'>('idle');
  const [searchVerificationState, setSearchVerificationState] = useState<'idle' | 'verifying' | 'success' | 'error'>('idle');
  const [isAiSaved, setIsAiSaved] = useState(false);
  const [isSearchSaved, setIsSearchSaved] = useState(false);
   const [isMcpSaved, setIsMcpSaved] = useState(false);
  const [scrapingResults, setScrapingResults] = useState<Map<string, ScrapeResult>>(new Map());
  const [activeScrapingJobs, setActiveScrapingJobs] = useState<Set<string>>(new Set());
  const [wikiResults, setWikiResults] = useState<Map<string, { wikiType: string, data: any }>>(new Map());

  const [luminaTools, setLuminaTools] = useState<Tool[]>([
    {
      id: 'web_scrape',
      name: 'Web Scraper',
      description: 'Fetch and extract structured data from any webpage',
      enabled: false,
      icon: <Globe size={16} />,
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'The URL to scrape' },
          selectors: { type: 'object', description: 'Optional CSS selectors to extract specific data' },
          usePuppeteer: { type: 'boolean', description: 'Set to true if page requires JavaScript execution' },
          extractLinks: { type: 'boolean', description: 'Whether to extract outgoing links' },
          extractTables: { type: 'boolean', description: 'Whether to extract HTML tables' },
          outputFormat: { type: 'string', enum: ['json', 'markdown', 'html'], description: 'Output format' }
        },
        required: ['url']
      }
    },
    {
      id: 'wiki_search',
      name: 'Wikipedia Search',
      description: 'Search Wikipedia for articles by query',
      enabled: false,
      icon: <Search size={16} />
    },
    {
      id: 'wiki_get_page',
      name: 'Wikipedia Page Fetch',
      description: 'Fetch full Wikipedia article by page ID',
      enabled: false,
      icon: <BookOpen size={16} />
    },
    {
      id: 'wiki_get_summary',
      name: 'Wikipedia Summary',
      description: 'Get a fast summary (introduction paragraph only) of a Wikipedia article',
      enabled: false,
      icon: <FileText size={16} />
    },
    {
      id: 'wiki_get_sections',
      name: 'Wikipedia Table of Contents',
      description: 'Get the table of contents sections list for a page',
      enabled: false,
      icon: <Layers size={16} />
    },
    {
      id: 'wiki_get_categories',
      name: 'Wikipedia Categories',
      description: 'Get all categories that a page belongs to',
      enabled: false,
      icon: <Library size={16} />
    },
    {
      id: 'wiki_get_links',
      name: 'Wikipedia Link Tracker',
      description: 'Get all internal Wikipedia links from an article',
      enabled: false,
      icon: <LinkIcon size={16} />
    },
    {
      id: 'wiki_get_images',
      name: 'Wikipedia Media Scraper',
      description: 'Get all images used in a Wikipedia article',
      enabled: false,
      icon: <ImageIcon size={16} />
    },
    {
      id: 'wiki_get_related',
      name: 'Wikipedia Related Pages',
      description: 'Find pages in the same category (related articles)',
      enabled: false,
      icon: <Compass size={16} />
    }
  ]);

  const [bridgeTools, setBridgeTools] = useState<Tool[]>([]);
  const [availableModels, setAvailableModels] = useState<{ id: string; name: string; icon: React.ReactNode; color: string }[]>(() => {
    const provider = safeGetItem('lumina_provider', 'openprovider');
    const defaultModels = [
      { id: 'sonnet-4.6', name: 'Sonnet 4.6', icon: <Sparkles size={14} />, color: 'text-amber-500' },
      { id: 'lumina-ultra-plus', name: 'Lumina Ultra Plus', icon: <Sparkles size={14} />, color: 'text-blue-500' },
      { id: 'lumina-pro-max', name: 'Lumina Pro Max', icon: <Plus size={14} />, color: 'text-purple-500' },
      { id: 'lumina-mini-flash', name: 'Lumina Mini Flash', icon: <ArrowUp size={14} />, color: 'text-orange-500' },
    ];
    if (provider === 'openprovider') {
      return [
        { id: 'openprovider/auto-free', name: 'OpenProvider Auto Free', icon: <Sparkles size={14} />, color: 'text-teal-400' },
        ...defaultModels
      ];
    }
    return defaultModels;
  });

  const [isMcpConnected, setIsMcpConnected] = useState(false);
  const [isConnectingMcp, setIsConnectingMcp] = useState(false);
  const [writingStyle, setWritingStyle] = useState('default');
  const [selectedProvider, setSelectedProvider] = useState(() => safeGetItem('lumina_provider', 'openprovider'));

  const handleProviderSelect = (providerId: string) => {
    setSelectedProvider(providerId);
    const p = CLOUD_PROVIDERS.find(p => p.id === providerId);
    if (p && p.endpoint) {
      setServerUrl(p.endpoint);
    }
    if (providerId === 'custom') {
      setServerUrl(DEFAULT_SERVER_URL);
    }
    if (providerId === 'openprovider') {
      setSelectedModel('openprovider/auto-free');
      setAvailableModels(prev => {
        if (!prev.some(m => m.id === 'openprovider/auto-free')) {
          return [
            { id: 'openprovider/auto-free', name: 'OpenProvider Auto Free', icon: <Sparkles size={14} />, color: 'text-teal-400' },
            ...prev
          ];
        }
        return prev;
      });
    }
    setIsAiSaved(false);
  };

  const handleSaveAI = () => {
    localStorage.setItem('lumina_server_url', serverUrl);
    localStorage.setItem('lumina_api_key', apiKey);
    localStorage.setItem('lumina_provider', selectedProvider);
    setIsAiSaved(true);
    setTimeout(() => setIsAiSaved(false), 2000);
  };

  const handleVerifyAI = useCallback(async () => {
    setAiVerificationState('verifying');
    try {
      const isExternal = serverUrl.startsWith('http://') || serverUrl.startsWith('https://');
      if (isExternal) {
        // Use our server-side proxy to verify the external provider endpoint
        const response = await fetch('/api/provider/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            endpoint: serverUrl,
            apiKey: apiKey,
            provider: selectedProvider
          })
        });

        if (response.ok) {
          const verifyData = await response.json();
          // Also load the available models from this provider via the server-side proxy
          try {
            const modelsResponse = await fetch('/api/provider/models', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                endpoint: serverUrl,
                apiKey: apiKey
              })
            });
            if (modelsResponse.ok) {
              const modelsData = await modelsResponse.json();
              if (modelsData.success && Array.isArray(modelsData.models)) {
                const fetchedModels = modelsData.models.map((m: any) => ({
                  id: m.id,
                  name: m.name || m.id,
                  icon: <Sparkles size={14} />,
                  color: 'text-blue-500'
                }));
                if (fetchedModels.length > 0) {
                  setAvailableModels(fetchedModels);
                }
              }
            }
          } catch (err) {
            console.warn('Failed to fetch models but verified connection', err);
          }
          setAiVerificationState('success');
        } else {
          setAiVerificationState('error');
        }
      } else {
        const isOpenCode = selectedProvider === 'opencode';
        const headers: Record<string, string> = {};
        if (isOpenCode) {
          headers['x-api-key'] = apiKey;
        } else {
          headers['Authorization'] = `Bearer ${apiKey}`;
        }

        const response = await fetch(`${serverUrl.replace(/\/+$/, '')}/models`, {
          method: 'GET',
          headers
        });
        
        if (response.ok) {
          const data = await response.json();
          const modelsArr = data.data || data.models || [];
          if (Array.isArray(modelsArr)) {
            const fetchedModels = modelsArr.map((m: any) => ({
              id: m.id,
              name: m.display_name || m.id,
              icon: <Sparkles size={14} />,
              color: 'text-blue-500'
            }));
            if (fetchedModels.length > 0) {
              setAvailableModels(fetchedModels);
            }
          }
          setAiVerificationState('success');
        } else {
          setAiVerificationState('error');
        }
      }
    } catch (error) {
      console.error('Verification failed:', error);
      setAiVerificationState('error');
    } finally {
      setTimeout(() => setAiVerificationState('idle'), 3000);
    }
  }, [serverUrl, apiKey, selectedProvider]);

  const handleSaveSearch = () => {
    localStorage.setItem('lumina_tavily_key', tavilyApiKey);
    localStorage.setItem('lumina_serp_key', serpApiKey);
    localStorage.setItem('lumina_search_provider', searchProvider);
    setIsSearchSaved(true);
    setTimeout(() => setIsSearchSaved(false), 2000);
  };

  const handleVerifySearch = useCallback(async () => {
    setSearchVerificationState('verifying');
    try {
      const key = searchProvider === 'serpapi' ? serpApiKey : tavilyApiKey;
      if (!key || !key.trim()) {
        setSearchVerificationState('error');
        setTimeout(() => setSearchVerificationState('idle'), 3000);
        return;
      }
      const response = await fetch('/api/provider/verify-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: searchProvider, apiKey: key })
      });
      if (response.ok) {
        setSearchVerificationState('success');
      } else {
        setSearchVerificationState('error');
      }
    } catch (error) {
      console.error('Search verification failed:', error);
      setSearchVerificationState('error');
    } finally {
      setTimeout(() => setSearchVerificationState('idle'), 3000);
    }
  }, [searchProvider, tavilyApiKey, serpApiKey]);

  // Auto-verify pre-configured API keys on app boot / mount
  useEffect(() => {
    const savedApiKey = localStorage.getItem('lumina_api_key');
    if (savedApiKey && savedApiKey.trim().length > 0) {
      handleVerifyAI();
    }
    const savedProvider = localStorage.getItem('lumina_search_provider') || 'tavily';
    const key = savedProvider === 'serpapi'
      ? localStorage.getItem('lumina_serp_key')
      : localStorage.getItem('lumina_tavily_key');
    if (key && key.trim().length > 0) {
      handleVerifySearch();
    }
  }, [handleVerifyAI, handleVerifySearch]);

  const handleSaveMcp = () => {
    localStorage.setItem('lumina_mcp_url', mcpUrl);
    localStorage.setItem('lumina_mcp_key', mcpKey);
    setIsMcpSaved(true);
    setTimeout(() => setIsMcpSaved(false), 2000);
  };
  
  // ─── Tool Building ──────────────────────────────────────────────────────────
  // Tools are divided into inbuilt (Lumina) and external (Bridge) categories.
  const buildActiveTools = (): ToolDefinition[] => {
    const activeLumina = luminaTools
      .filter(t => t.enabled)
      .map(t => {
        // Retrieve full definitions if available
        if (t.id === 'web_scrape') {
          return webScrapeTool;
        }
        const wikiMatch = ALL_WIKI_TOOLS.find(w => w.function.name === t.id);
        if (wikiMatch) {
          return wikiMatch;
        }
        return {
          type: 'function' as const,
          function: {
            name: t.id,
            description: t.description || 'Lumina Tool',
            parameters: t.parameters || { type: 'object', properties: {}, required: [] }
          }
        };
      });

    const activeBridge = bridgeTools
      .filter(t => t.enabled)
      .map(t => ({
        type: 'function' as const,
        function: {
          name: t.id,
          description: t.description || 'Bridge Tool',
          parameters: t.parameters || { type: 'object', properties: {}, required: [] }
        }
      }));

    return [...activeLumina, ...activeBridge];
  };
  
  // ─── Bridge Communication ──────────────────────────────────────────────────
  const callLlamaBridge = async (messages: any[], tools: ToolDefinition[], signal?: AbortSignal) => {
    const useBridge = useBridgeTools && llamaBridgeUrl;
    const baseUrl = useBridge ? llamaBridgeUrl.replace(/\/+$/, '') : serverUrl.replace(/\/+$/, '');
    const key = useBridge ? llamaBridgeApiKey : apiKey;
    
    const isExternal = baseUrl.startsWith('http://') || baseUrl.startsWith('https://');
    
    if (isExternal) {
      // Proxy external API calls through our Node server to bypass browser CORS constraints safely
      const response = await fetch('/api/bridge/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bridgeUrl: baseUrl.replace(/\/v1\/?$/, '').replace(/\/$/, ''),
          apiKey: key,
          model: useBridge ? selectedLlamaModel : activeModelId,
          messages,
          tools,
          stream: false
        }),
        signal
      });

      if (!response.ok) {
        const text = await response.text();
        let errorMsg = `Server returned status ${response.status}`;
        try {
          const parsed = JSON.parse(text);
          errorMsg = parsed.error?.message || parsed.error || parsed.message || parsed.detail || errorMsg;
          if (typeof errorMsg === 'object') {
            errorMsg = JSON.stringify(errorMsg);
          }
        } catch {
          if (text.trim().startsWith('<')) {
            errorMsg = `Server error (HTML response with status ${response.status})`;
          } else if (text) {
            errorMsg = text.substring(0, 200);
          }
        }
        throw new Error(errorMsg);
      }

      const text = await response.text();
      try {
        return JSON.parse(text);
      } catch (err) {
        throw new Error(`Failed to parse response: ${text.substring(0, 100)}`);
      }
    }

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (key) headers['Authorization'] = `Bearer ${key}`;
    
    const body: any = {
      model: useBridge ? selectedLlamaModel : activeModelId,
      messages: messages,
      stream: false,
    };
    
    if (tools.length > 0) {
      body.tools = tools;
      body.tool_choice = 'auto';
    }
    
    const endpoint = baseUrl.replace(/\/+$/, '');
    const apiUrl = endpoint.match(/\/v1\/?$/) ? `${endpoint}/chat/completions` : `${endpoint}/v1/chat/completions`;
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal,
    });
    
    if (!response.ok) {
      const text = await response.text();
      let errorMsg = `Server returned status ${response.status}`;
      try {
        const parsed = JSON.parse(text);
        errorMsg = parsed.error?.message || parsed.error || parsed.message || parsed.detail || errorMsg;
        if (typeof errorMsg === 'object') {
          errorMsg = JSON.stringify(errorMsg);
        }
      } catch {
        if (text.trim().startsWith('<')) {
          errorMsg = `Server error (HTML response with status ${response.status})`;
        } else if (text) {
          errorMsg = text.substring(0, 200);
        }
      }
      throw new Error(errorMsg);
    }
    
    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch (err) {
      throw new Error(`Failed to parse response: ${text.substring(0, 100)}`);
    }
  };
  
  const updateToolCallStatus = (toolCallId: string, status: 'pending' | 'active' | 'complete' | 'failed') => {
    setChats(prev => prev.map(chat => ({
      ...chat,
      messages: chat.messages.map((m: Message) => {
        if (m.toolCalls) {
          return {
            ...m,
            toolCalls: m.toolCalls.map((tc: ToolCallNode) => 
              tc.id === toolCallId ? { ...tc, status } : tc
            )
          };
        }
        return m;
      })
    })));
  };
  
  const handleTestLlamaConnection = async () => {
    setAiVerificationState('verifying');
    try {
      const healthy = await checkBridgeHealth(llamaBridgeUrl, llamaBridgeApiKey);
      setAiVerificationState(healthy ? 'success' : 'error');
    } catch (error) {
      console.error('Llama Bridge connection failed:', error);
      setAiVerificationState('error');
    } finally {
      setTimeout(() => setAiVerificationState('idle'), 3000);
    }
  };
  
  // ─── Bridge Tool Discovery ─────────────────────────────────────────────────
  const handleLoadBridgeTools = useCallback(async () => {
    try {
      const tools = await fetchBridgeTools(llamaBridgeUrl, llamaBridgeApiKey);
      if (tools.length > 0) {
        const mappedTools: Tool[] = tools.map((t: any) => {
          let icon = <Box size={14} />;
          const name = (t.name || t.id || '').toLowerCase();
          if (name.includes('search') || name.includes('research')) icon = <Search size={14} />;
          if (name.includes('shell') || name.includes('terminal')) icon = <Terminal size={14} />;
          if (name.includes('weather')) icon = <CloudMoon size={14} />;
          if (name.includes('wikipedia') || name.includes('globe')) icon = <Globe size={14} />;
          if (name.includes('image')) icon = <ImageIcon size={14} />;
          if (name.includes('date') || name.includes('time')) icon = <Calendar size={14} />;
          if (name.includes('verify')) icon = <Check size={14} />;
          if (name.includes('render') || name.includes('video')) icon = <Video size={14} />;
          
          return {
            id: t.id || t.name,
            name: t.name || t.id,
            description: t.description || '',
            enabled: false,
            icon,
            parameters: t.parameters,
          };
        });
        // Filter out native built-in tools (web_scrape and wiki_*) to avoid duplicates
        const filteredTools = mappedTools.filter(t => t.id !== 'web_scrape' && !t.id.startsWith('wiki_'));
        setBridgeTools(filteredTools);
        setIsMcpConnected(true);
        showToast(`Loaded ${mappedTools.length} bridge tools`);
      }
    } catch (error) {
      console.error('Failed to load bridge tools:', error);
    }
  }, [llamaBridgeUrl, llamaBridgeApiKey]);
  
  const handleLoadLlamaModels = async () => {
    try {
      // Use the Express proxy to avoid CORS issues
      const response = await fetch('/api/bridge/models', {
        method: 'GET',
        headers: {
          'X-Bridge-Url': llamaBridgeUrl.replace(/\/+$/, ''),
          'X-Api-Key': llamaBridgeApiKey,
        }
      });
      
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          const models = data.data || data.models || [];
          const fetchedModels = models.map((m: any) => ({
            id: m.id,
            name: m.display_name || m.id,
            icon: <Sparkles size={14} />,
            color: 'text-blue-500'
          }));
          setLlamaBridgeModels(fetchedModels);
          if (fetchedModels.length > 0 && !selectedLlamaModel) {
            setSelectedLlamaModel(fetchedModels[0].id);
          }
          showToast(`Loaded ${fetchedModels.length} models`);
        } else {
          console.warn('Expected JSON response from /api/bridge/models, got non-JSON content type:', contentType);
          showToast('Failed to load models (unexpected server response)');
        }
      } else {
        showToast('Failed to load models');
      }
    } catch (error) {
      console.error('Failed to load Llama Bridge models:', error);
      showToast('Failed to load models');
    }
  };

  const [selectedModel, setSelectedModel] = useState(() => {
    const provider = safeGetItem('lumina_provider', 'openprovider');
    return provider === 'openprovider' ? 'openprovider/auto-free' : 'sonnet-4.6';
  });
  const activeModelList = useMemo(() => 
    llamaBridgeModels.length > 0
      ? llamaBridgeModels.map(m => ({ id: m.id, name: m.name, icon: <Sparkles size={14} />, color: 'text-blue-500' }))
      : availableModels,
    [llamaBridgeModels, availableModels]
  );
  const activeModelId = selectedLlamaModel || selectedModel;
  const setActiveModelId = useCallback((id: string) => {
    setSelectedLlamaModel(id);
  }, []);

  const [input, setInput] = useState('');
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);

  const showsSlashCommands = input.startsWith('/') && !input.substring(1).includes(' ');
  const slashQuery = showsSlashCommands ? input.substring(1).toLowerCase() : '';
  const filteredCommands = useMemo(() => {
    if (!showsSlashCommands) return [];
    return SLASH_COMMANDS.filter(cmd => cmd.name.toLowerCase().includes(slashQuery));
  }, [showsSlashCommands, slashQuery, SLASH_COMMANDS]);

  useEffect(() => {
    if (filteredCommands.length > 0 && selectedCommandIndex >= filteredCommands.length) {
      setSelectedCommandIndex(0);
    }
  }, [filteredCommands.length, selectedCommandIndex]);
  const [isTyping, setIsTyping] = useState(false);
  const [activeSkills, setActiveSkills] = useState<string[]>([]);
  const [activeArtifact, setActiveArtifact] = useState<Artifact | null>(null);
  const [isCanvasOpen, setIsCanvasOpen] = useState(false);
  const [canvasView, setCanvasView] = useState<'code' | 'preview'>('code');
  const [typingMessageId, setTypingMessageId] = useState<string | null>(null);
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isPlusMenuOpen, setIsPlusMenuOpen] = useState(false);

  const [isCoderLeftPanelOpen, setIsCoderLeftPanelOpen] = useState(true);
  const [coderWorkspacePath, setCoderWorkspacePath] = useState('');
  const [isCoderRightPanelOpen, setIsCoderRightPanelOpen] = useState(false);
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [isTerminalPopupOpen, setIsTerminalPopupOpen] = useState(false);
  const [isElizaActive, setIsElizaActive] = useState(false);
  const [elizaToggleSignal, setElizaToggleSignal] = useState(0);
  const [isWhiteboardOpen, setIsWhiteboardOpen] = useState(false);
  const [floatingEditFile, setFloatingEditFile] = useState<string | null>(null);
  const [workspaceRefreshKey, setWorkspaceRefreshKey] = useState(0);
  const [iframeKey, setIframeKey] = useState(0);

  const [rightIsGridEnabled, setRightIsGridEnabled] = useState<boolean>(false);
  const [rightPreviewSubpath, setRightPreviewSubpath] = useState<string>('');
  const [projectType, setProjectType] = useState<string | null>(null);
  const [projectFramework, setProjectFramework] = useState<string | null>(null);
  const [devServerUrl, setDevServerUrl] = useState<string>('');
  const [rightPreviewLogs, setRightPreviewLogs] = useState<string[]>([]);
  const [rightPreviewError, setRightPreviewError] = useState<string>('');
  const [isRightPreviewStarting, setIsRightPreviewStarting] = useState(false);
  const rightPreviewPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [attachmentContextMenu, setAttachmentContextMenu] = useState<{ visible: boolean, x: number, y: number, attachment: any, index: number }>({ visible: false, x: 0, y: 0, attachment: null, index: -1 });
  const [selectedModalAttachment, setSelectedModalAttachment] = useState<any | null>(null);
  const rightIframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const handleGlobalClick = () => {
      setAttachmentContextMenu(prev => prev.visible ? { visible: false, x: 0, y: 0, attachment: null, index: -1 } : prev);
    };
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsWhiteboardOpen(false);
        setIsTerminalPopupOpen(false);
        setLightboxImage(null);
      }
    };
    window.addEventListener('click', handleGlobalClick);
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      window.removeEventListener('click', handleGlobalClick);
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, []);

  const triggerWorkspaceRefresh = useCallback(() => {
    setWorkspaceRefreshKey(prev => prev + 1);
  }, []);

  useEffect(() => {
    const handleWorkspaceGlobalRefresh = () => {
      triggerWorkspaceRefresh();
    };
    window.addEventListener('trigger-workspace-refresh', handleWorkspaceGlobalRefresh);
    return () => {
      window.removeEventListener('trigger-workspace-refresh', handleWorkspaceGlobalRefresh);
    };
  }, [triggerWorkspaceRefresh]);

  const [isWebSearchEnabled, setIsWebSearchEnabled] = useState(false);
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);

  // Advanced Voice Input State Engine
  const [isVoiceListening, setIsVoiceListening] = useState(false);
  const [voiceInterimText, setVoiceInterimText] = useState('');
  const [voiceLanguage, setVoiceLanguage] = useState('en-US');
  const [voiceContinuous, setVoiceContinuous] = useState(false);
  const [voiceAppendMode, setVoiceAppendMode] = useState(true);
  const [voiceAutoSend, setVoiceAutoSend] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [micVolume, setMicVolume] = useState<number>(0);
  const [showVoiceControlPanel, setShowVoiceControlPanel] = useState(false);

  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      // Cleanup all voice dictation resources on component dispose
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch {}
      }
      if (micStreamRef.current) {
        try { micStreamRef.current.getTracks().forEach((track: any) => track.stop()); } catch {}
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const startVoiceDictation = async () => {
    setVoiceError(null);
    setVoiceInterimText('');
    const RecognitionConstructor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!RecognitionConstructor) {
      setVoiceError("Your browser doesn't support the Web Speech API. Please use Google Chrome, Edge, or Safari.");
      showToast("Speech recognition not supported in this browser.");
      return;
    }

    try {
      const rec = new RecognitionConstructor();
      // Use continuous to let users pause organically and talk back without self-closing
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = voiceLanguage;

      rec.onstart = () => {
        setIsVoiceListening(true);
        showToast("🎙️ Voice listening active! Speak now...");
      };

      rec.onresult = (event: any) => {
        let finalTrans = '';
        let interimTrans = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTrans += event.results[i][0].transcript;
          } else {
            interimTrans += event.results[i][0].transcript;
          }
        }

        if (interimTrans) {
          setVoiceInterimText(interimTrans);
        }

        if (finalTrans) {
          const added = finalTrans.trim();
          if (added) {
            setInput(prev => {
              if (voiceAppendMode) {
                return prev ? (prev.endsWith(' ') ? prev + added : prev + ' ' + added) : added;
              } else {
                return added;
              }
            });
            setVoiceInterimText('');
          }
        }
      };

      rec.onerror = (e: any) => {
        console.error("Speech recognition error:", e);
        if (e.error !== 'no-speech') {
          setVoiceError(`Error: ${e.error}`);
        }
      };

      rec.onend = () => {
        setIsVoiceListening(false);
        setVoiceInterimText('');
      };

      recognitionRef.current = rec;
      rec.start();

      // Start Web Audio tracking for beautiful real visual soundwaves
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
          micStreamRef.current = stream;
          
          const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
          audioContextRef.current = audioCtx;
          
          const source = audioCtx.createMediaStreamSource(stream);
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 64;
          source.connect(analyser);
          analyserRef.current = analyser;

          const bufferLength = analyser.frequencyBinCount;
          const dataArray = new Uint8Array(bufferLength);

          const updateVolume = () => {
            if (!analyserRef.current) return;
            analyserRef.current.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < bufferLength; i++) {
              sum += dataArray[i];
            }
            const average = sum / bufferLength;
            // Scale and map to a readable volume range (0 - 100)
            setMicVolume(Math.min(100, Math.round((average / 128) * 100)));
            animationFrameRef.current = requestAnimationFrame(updateVolume);
          };

          updateVolume();
        } catch (mediaErr) {
          console.warn("Could not initialize mic volume tracking for animations: ", mediaErr);
        }
      }

    } catch (err: any) {
      console.error("Failed to start speech recognition:", err);
      setVoiceError(err?.message || String(err));
      setIsVoiceListening(false);
    }
  };

  const stopVoiceDictation = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null; // Prevent end callback firing duplicate triggers
        recognitionRef.current.stop();
      } catch (err) {
        console.error("Error stopping recognition:", err);
      }
      recognitionRef.current = null;
    }

    if (micStreamRef.current) {
      try {
        micStreamRef.current.getTracks().forEach((track: any) => track.stop());
      } catch {}
      micStreamRef.current = null;
    }

    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch {}
      audioContextRef.current = null;
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    setIsVoiceListening(false);
    setMicVolume(0);
    setVoiceInterimText('');
    
    // Activate Auto submission if enabled
    if (voiceAutoSend) {
      setTimeout(() => {
        handleSend();
      }, 400);
    }
  };

  const toggleVoiceDictation = () => {
    if (isVoiceListening) {
      stopVoiceDictation();
    } else {
      startVoiceDictation();
    }
  };


  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [isUrlToolOpen, setIsUrlToolOpen] = useState(false);
  const [urlToolInput, setUrlToolInput] = useState('');
  const [urlToolLoading, setUrlToolLoading] = useState(false);
  const [urlToolError, setUrlToolError] = useState<string | null>(null);
  const [attachedUrlDocs, setAttachedUrlDocs] = useState<
    Array<{ id: string; url: string; title: string; content: string; favicon?: string; segments?: any[]; videoId?: string; isOcr?: boolean }>
  >([]);
  const [isTranscriptToolOpen, setIsTranscriptToolOpen] = useState(false);
  const [transcriptToolInput, setTranscriptToolInput] = useState('');
  const [transcriptToolLoading, setTranscriptToolLoading] = useState(false);
  const [transcriptToolError, setTranscriptToolError] = useState<string | null>(null);
  const [selectedTranscriptDoc, setSelectedTranscriptDoc] = useState<any | null>(null);
  const [transcriptionOptionsDoc, setTranscriptionOptionsDoc] = useState<any | null>(null);
  const [toasts, setToasts] = useState<{ id: string; message: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showScrollButton, setShowScrollButton] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const modelDropdownContentRef = useRef<HTMLDivElement>(null);
  const headerMenuRef = useRef<HTMLDivElement>(null);
  const plusMenuRef = useRef<HTMLDivElement>(null);

  const [activeAssistantMode, setActiveAssistantMode] = useState<'builder' | 'planner' | 'debugger'>('builder');
  const [isModeDropdownOpen, setIsModeDropdownOpen] = useState(false);
  const modeDropdownRef = useRef<HTMLDivElement>(null);
  const modeDropdownContentRef = useRef<HTMLDivElement>(null);

  const menuContentRef = useRef<HTMLDivElement>(null);

  // Hook for Model Dropdown
  const modelDropdownPosition = useSmartPopupPosition({
    triggerRef: dropdownRef,
    popupRef: modelDropdownContentRef,
    isOpen: isModelDropdownOpen,
    align: 'center',
    preferredDirection: 'up',
    margin: 12,
    viewportPadding: 16,
    dependencies: [modelSearchQuery, activeModelList],
  });

  // Hook for Plus Menu Popup
  const plusMenuPopupPosition = useSmartPopupPosition({
    triggerRef: plusMenuRef,
    popupRef: menuContentRef,
    isOpen: isPlusMenuOpen,
    align: 'left',
    preferredDirection: 'up',
    margin: 12,
    viewportPadding: 16,
    dependencies: [activePlusSubMenu, SKILLS, WRITING_STYLES],
  });

  // Hook for Assistant Mode Dropdown
  const modeDropdownPosition = useSmartPopupPosition({
    triggerRef: modeDropdownRef,
    popupRef: modeDropdownContentRef,
    isOpen: isModeDropdownOpen,
    align: 'center',
    preferredDirection: 'up',
    margin: 12,
    viewportPadding: 16,
  });

  useEffect(() => {
    const handleRejection = (event: PromiseRejectionEvent) => {
      if (event.reason?.message?.includes('WebSocket') || event.reason?.message?.includes('closed without opened')) {
        event.preventDefault();
        console.warn('Suppressed benign WebSocket error:', event.reason.message);
      }
    };
    window.addEventListener('unhandledrejection', handleRejection);
    return () => window.removeEventListener('unhandledrejection', handleRejection);
  }, []);

  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer) return;
    const handleScroll = () => {
      const isScrolledUp = scrollContainer.scrollHeight - scrollContainer.scrollTop - scrollContainer.clientHeight > 200;
      setShowScrollButton(isScrolledUp);
    };
    scrollContainer.addEventListener('scroll', handleScroll);
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsModelDropdownOpen(false);
      }
      if (headerMenuRef.current && !headerMenuRef.current.contains(event.target as Node)) {
        setIsHeaderMenuOpen(false);
      }
      if (plusMenuRef.current && !plusMenuRef.current.contains(event.target as Node)) {
        setIsPlusMenuOpen(false);
        setActivePlusSubMenu('main');
      }
      if (modeDropdownRef.current && !modeDropdownRef.current.contains(event.target as Node)) {
        setIsModeDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const insertAttachedContent = useCallback((text: string) => {
    setInput(prev => {
      const glue = prev && !prev.endsWith('\n') ? '\n\n' : prev ? '\n' : '';
      const newVal = prev + glue + text;
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.style.height = 'auto';
          inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 200)}px`;
        }
      }, 50);
      return newVal;
    });
  }, []);



  const handleSetIsSourcesPanelOpen = useCallback((v: boolean) => setIsSourcesPanelOpen(v), []);
  const handleSetActiveArtifact = useCallback((v: any) => setActiveArtifact(v), []);
  const handleSetIsCanvasOpen = useCallback((v: boolean) => setIsCanvasOpen(v), []);
  const handleSetCanvasView = useCallback((v: 'code' | 'preview') => setCanvasView(v), []);

  const handleStartBuilding = (chatId: string, messageId: string, todos: any[]) => {
    setChats(prev => prev.map(c => {
      if (c.id === chatId) {
        return {
          ...c,
          messages: c.messages.map(m => {
            if (m.id === messageId && m.todoPlan) {
              return {
                ...m,
                todoPlan: {
                  ...m.todoPlan,
                  isConfirmed: true,
                  countdown: 0,
                  todos: m.todoPlan.todos.map((t, idx) => ({
                    ...t,
                    status: idx === 0 ? 'in_progress' : 'pending'
                  }))
                }
              };
            }
            return m;
          })
        };
      }
      return c;
    }));

    setShowTodoPanel(true);
    setTodoCollapsed(false);
    setCoderTodos(todos.map((t, idx) => ({
      id: t.id,
      text: t.text,
      status: idx === 0 ? 'in_progress' : 'pending'
    })));

    let currentStep = 0;
    const executeStep = () => {
      if (currentStep >= todos.length) {
        setChats(prev => prev.map(c => {
          if (c.id === chatId) {
            const hasCelebration = c.messages.some(m => m.content.includes("All tasks completed successfully!"));
            const finishedMessages = [
              ...c.messages.map(m => {
                if (m.id === messageId && m.todoPlan) {
                   return {
                     ...m,
                     todoPlan: {
                       ...m.todoPlan,
                       todos: m.todoPlan.todos.map(t => ({ ...t, status: 'complete' as const }))
                     }
                   };
                }
                return m;
              })
            ];
            if (!hasCelebration) {
              finishedMessages.push({
                id: (Date.now() + 50).toString(),
                role: 'assistant',
                content: `🚀 **All tasks completed successfully!**\n\nI have successfully aligned your preferences, bootstrapped the modules, applied high-contrast custom CSS styling, and compiled the interactive visual component preview. It is now active on the development container and live in your sandbox environment.`,
                timestamp: new Date()
              } as any);
            }
            return {
              ...c,
              messages: finishedMessages
            };
          }
          return c;
        }));

        setCoderTodos(prev => prev.map(t => ({ ...t, status: 'complete' })));
        setIsTyping(false);
        showToast("All task milestones successfully completed! 🚀");
        triggerWorkspaceRefresh();
        return;
      }

      const activeTodo = todos[currentStep];
      showToast(`Executing: ${activeTodo.text}`);

      setTimeout(() => {
        setChats(prev => prev.map(c => {
          if (c.id === chatId) {
            return {
              ...c,
              messages: c.messages.map(m => {
                if (m.id === messageId && m.todoPlan) {
                  return {
                    ...m,
                    todoPlan: {
                      ...m.todoPlan,
                      todos: m.todoPlan.todos.map((t, idx) => {
                        if (idx === currentStep) return { ...t, status: 'complete' as const };
                        if (idx === currentStep + 1) return { ...t, status: 'in_progress' as const };
                        return t;
                      })
                    }
                  };
                }
                return m;
              })
            };
          }
          return c;
        }));

        setCoderTodos(prev => prev.map((t, idx) => {
          if (idx === currentStep) return { ...t, status: 'complete' };
          if (idx === currentStep + 1) return { ...t, status: 'in_progress' };
          return t;
        }));

        currentStep++;
        executeStep();
      }, 2000);
    };

    setTimeout(executeStep, 2050);
  };

  const handleUpdateTodoPlan = useCallback((messageId: string, updatedPlan: any) => {
    setChats(prev => prev.map(chat => {
      const parentChat = chat.messages.some(m => m.id === messageId);
      if (parentChat) {
        return {
          ...chat,
          messages: chat.messages.map(m => m.id === messageId ? { ...m, todoPlan: updatedPlan } : m)
        };
      }
      return chat;
    }));
  }, []);

  const handleStartBuildingBtn = useCallback((messageId: string) => {
    let foundTodos: any[] = [];
    chats.forEach(chat => {
      const msg = chat.messages.find(m => m.id === messageId);
      if (msg && msg.todoPlan) {
        foundTodos = msg.todoPlan.todos;
      }
    });
    
    setChats(prev => prev.map(chat => {
      const hasMsg = chat.messages.some(m => m.id === messageId);
      if (hasMsg) {
        return {
          ...chat,
          messages: chat.messages.map(m => m.id === messageId ? {
            ...m,
            todoPlan: {
               ...m.todoPlan!,
               isConfirmed: true,
               countdown: 0
            }
          } : m)
        };
      }
      return chat;
    }));

    handleStartBuilding(currentChatId || chats[0]?.id, messageId, foundTodos);
  }, [chats, currentChatId]);

  const renderActiveQuestionContent = () => {
    const q = askAiQuestions[currentQuestionIndex];
    if (!q) return null;

    switch (q.type) {
      case 'single_choice':
        return (
          <div className="flex flex-wrap gap-2.5 w-full overflow-y-auto max-h-[125px] pr-1.5 custom-scrollbar">
            {q.options?.map((opt, i) => {
              const isSelected = askAiAnswers[q.id] === opt;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => handleSelectAnswer(q.id, opt, true)}
                  className={`group px-3.5 py-2 text-xs font-semibold rounded-xl border transition-all duration-200 cursor-pointer flex items-center gap-2 ${
                    isSelected
                      ? 'bg-[var(--theme-accent)]/15 border-[var(--theme-accent)] text-[var(--theme-accent)] shadow-[0_0_12px_rgba(59,130,246,0.15)] font-bold'
                      : 'bg-[var(--theme-surface-alt)]/65 hover:bg-[var(--theme-bg)]/80 border-[var(--theme-border)]/45 hover:border-[var(--theme-accent)]/50 text-[var(--theme-secondary)] hover:text-[var(--theme-primary)] hover:translate-y-[-1px]'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full transition-transform duration-200 ${
                    isSelected ? 'bg-[var(--theme-accent)] scale-125 shadow-[0_0_8px_var(--theme-accent)]' : 'bg-[var(--theme-muted)]/30 group-hover:bg-[var(--theme-muted)]/60'
                  }`} />
                  <span>{opt}</span>
                </button>
              );
            })}
          </div>
        );

      case 'multi_choice': {
        const selectedList = (askAiAnswers[q.id] as string[]) || [];
        const toggleSelection = (opt: string) => {
          let updated;
          if (selectedList.includes(opt)) {
            updated = selectedList.filter(o => o !== opt);
          } else {
            updated = [...selectedList, opt];
          }
          handleSelectAnswer(q.id, updated, false);
        };

        return (
          <div className="flex flex-col gap-3.5 w-full select-none">
            <div className="flex flex-wrap gap-2.5 max-h-[95px] overflow-y-auto pr-1.5 custom-scrollbar">
              {q.options?.map(opt => {
                const isSelected = selectedList.includes(opt);
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => toggleSelection(opt)}
                    className={`px-3.5 py-2 text-xs font-semibold rounded-xl border transition-all duration-200 cursor-pointer flex items-center gap-2.5 ${
                      isSelected
                        ? 'bg-[var(--theme-accent)]/15 border-[var(--theme-accent)] text-[var(--theme-accent)] font-bold shadow-[0_0_12px_rgba(59,130,246,0.15)]'
                        : 'bg-[var(--theme-surface-alt)]/65 hover:bg-[var(--theme-bg)]/80 border-[var(--theme-border)]/45 hover:border-[var(--theme-accent)]/50 text-[var(--theme-secondary)] hover:text-[var(--theme-primary)] hover:translate-y-[-1px]'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                      isSelected 
                        ? 'border-[var(--theme-accent)] bg-[var(--theme-accent)] text-white' 
                        : 'border-[var(--theme-muted)]/50 bg-transparent'
                    }`}>
                      {isSelected && <Check size={10} strokeWidth={4} className="text-[var(--theme-input-bg)] dark:text-white" />}
                    </div>
                    <span>{opt}</span>
                  </button>
                );
              })}
            </div>
            <div className="flex justify-end select-none">
              <button
                type="button"
                disabled={selectedList.length === 0}
                onClick={handleNextQuestion}
                className="px-4 py-2 text-[11px] font-black tracking-wider uppercase bg-[var(--theme-accent)] hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl transition-all shadow-[0_4px_12px_rgba(0,0,0,0.15)] flex items-center gap-1.5 cursor-pointer hover:translate-y-[-1px]"
              >
                <span>Continue</span>
                <ChevronRight size={12} strokeWidth={3} />
              </button>
            </div>
          </div>
        );
      }

      case 'scale': {
        const rating = (askAiAnswers[q.id] as number) || 0;
        return (
          <div className="flex flex-col items-center gap-3.5 w-full select-none">
            <div className="flex items-center justify-between w-full max-w-sm px-1.5 text-[10px] font-bold text-[var(--theme-muted)] uppercase tracking-widest font-mono select-none">
              <span className="flex items-center gap-1.5">⚡ Minimal Focus</span>
              <span className="flex items-center gap-1.5">🔥 Deep Precision</span>
            </div>
            <div className="flex items-center gap-3 w-full max-w-md justify-between select-none">
              {[1, 2, 3, 4, 5].map(val => {
                const isSelected = rating === val;
                return (
                  <button
                    key={val}
                    type="button"
                    onClick={() => handleSelectAnswer(q.id, val, true)}
                    className={`w-11 h-11 rounded-xl flex items-center justify-center border font-mono text-sm font-bold transition-all duration-200 cursor-pointer ${
                      isSelected
                        ? 'bg-[var(--theme-accent)] border-[var(--theme-accent)] text-white shadow-[0_0_15px_rgba(59,130,246,0.35)] scale-110'
                        : 'bg-[var(--theme-surface-alt)]/65 hover:bg-[var(--theme-bg)]/80 hover:border-[var(--theme-accent)]/50 border-[var(--theme-border)]/45 text-[var(--theme-secondary)] hover:text-[var(--theme-primary)] hover:scale-105'
                    }`}
                  >
                    {val}
                  </button>
                );
              })}
            </div>
          </div>
        );
      }

      case 'text_input':
        return (
          <div className="flex flex-col gap-3.5 w-full select-none">
            <div className="relative flex items-center w-full">
              <input
                type="text"
                value={textInputAnswer}
                onChange={(e) => setTextInputAnswer(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && textInputAnswer.trim()) {
                    handleSelectAnswer(q.id, textInputAnswer.trim(), true);
                    setTextInputAnswer('');
                  }
                }}
                placeholder="Type your custom answer/preferences..."
                className="w-full h-11 px-4 pr-11 bg-[var(--theme-surface-alt)]/65 border border-[var(--theme-border)]/55 focus:border-[var(--theme-accent)] focus:bg-[var(--theme-bg)] rounded-xl text-xs text-[var(--theme-primary)] outline-none placeholder-[var(--theme-muted)]/75 transition-all select-text"
              />
              {textInputAnswer.trim() && (
                <button
                  type="button"
                  onClick={() => {
                    handleSelectAnswer(q.id, textInputAnswer.trim(), true);
                    setTextInputAnswer('');
                  }}
                  className="absolute right-1.5 p-1.5 bg-[var(--theme-accent)] text-white hover:brightness-110 rounded-lg transition-all cursor-pointer flex items-center justify-center shadow-md animate-fade-in"
                >
                  <ArrowUp size={14} strokeWidth={3} />
                </button>
              )}
            </div>
            <div className="flex justify-between items-center select-none">
              <span className="text-[10px] text-[var(--theme-muted)] italic ml-1 flex items-center gap-1.5">
                <span>⌨️ Press ENTER to submit</span>
              </span>
              <button
                type="button"
                disabled={!textInputAnswer.trim()}
                onClick={() => {
                  handleSelectAnswer(q.id, textInputAnswer.trim(), true);
                  setTextInputAnswer('');
                }}
                className="px-4 py-2 text-[11px] font-black tracking-wider uppercase bg-[var(--theme-accent)] hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl transition-all shadow-[0_4px_12px_rgba(0,0,0,0.15)] flex items-center gap-1.5 cursor-pointer hover:translate-y-[-1px]"
              >
                <span>Continue</span>
                <ChevronRight size={12} strokeWidth={3} />
              </button>
            </div>
          </div>
        );

      case 'confirm':
        return (
          <div className="flex items-center gap-4 w-full max-w-md mx-auto select-none">
            <button
              type="button"
              onClick={() => handleSelectAnswer(q.id, 'Yes', true)}
              className="flex-1 py-3 text-xs font-bold bg-[var(--theme-accent)]/10 border border-[var(--theme-accent)]/30 hover:bg-[var(--theme-accent)] hover:text-white hover:border-[var(--theme-accent)] text-[var(--theme-accent)] rounded-xl transition-all shadow-sm cursor-pointer hover:scale-[1.02]"
            >
              Understand & Accept
            </button>
            <button
              type="button"
              onClick={() => handleSelectAnswer(q.id, 'No', true)}
              className="flex-1 py-3 text-xs font-bold bg-[var(--theme-surface-alt)] hover:bg-[var(--theme-bg)] border border-[var(--theme-border)]/55 hover:border-[var(--theme-muted)] text-[var(--theme-secondary)] hover:text-[var(--theme-primary)] rounded-xl transition-all cursor-pointer hover:scale-[1.02]"
            >
              Skip option
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  const currentChat = chats.find(c => c.id === currentChatId);
  const messages = currentChat?.messages || [];

  const createNewChat = (projId?: string | null, isCoder?: boolean) => {
    setActiveAgent(null);
    const pId = projId !== undefined ? projId : activeProjectId;
    const newChat: Chat = {
      id: Date.now().toString(),
      title: 'New chat',
      messages: [],
      updatedAt: new Date(),
      projectId: pId || undefined,
      isCoderMode: isCoder !== undefined ? isCoder : isCoderMode,
    } as any;
    setChats(prev => [newChat, ...prev]);
    setCurrentChatId(newChat.id);
    return newChat.id;
  };

  const {
    isDevToolsOpen,
    setIsDevToolsOpen,
    activeDevTab,
    setActiveDevTab,
    simLatency,
    setSimLatency,
    retroFilter,
    setRetroFilter,
    verboseDebug,
    setVerboseDebug,
    devLogs,
    setDevLogs,
    addDevLog,
    handleExecMockCommand
  } = useDevTools({ messages, chats, showToast });

  const {
    isCoderMode,
    setIsCoderMode,
    isCoderWorkspacePanelOpen,
    setIsCoderWorkspacePanelOpen,
    activeCommandType,
    setActiveCommandType,
    activeCommandQuery,
    setActiveCommandQuery,
    coderTodos,
    setCoderTodos,
    isGeneratingTodos,
    setIsGeneratingTodos,
    showTodoPanel,
    setShowTodoPanel,
    todoCollapsed,
    setTodoCollapsed,
    orchestrationState,
    setOrchestrationState,
    orchestrationCollapsed,
    setOrchestrationCollapsed
  } = useCoderMode({
    currentChatId,
    chats,
    setChats,
    isSidebarOpen,
    setIsSidebarOpen,
    handleStartBuilding,
    isTyping
  });

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
    handleFinishQuestions
  } = useAskAi({
    input,
    messages,
    callLlamaBridge,
    createNewChat,
    currentChatId,
    isCoderMode,
    handleStartBuilding,
    showToast,
    setChats,
    setInput
  });

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
  } = useRightPanel({
    rightIframeRef,
    iframeKey,
    rightPreviewSubpath,
    showToast,
    setFloatingEditFile
  });

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
              setIsCoderRightPanelOpen(true);
            }
            await startCoderPreview();
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

  const handleClearChat = () => {
    if (!currentChatId) return;
    setChats(prev => prev.map(chat => {
      if (chat.id === currentChatId) {
        return {
          ...chat,
          messages: [],
          updatedAt: new Date()
        };
      }
      return chat;
    }));
    showToast("Chat cleared successfully!");
  };

  const handleSend = async (contentOverride?: string) => {
    if (isVoiceListening) {
      stopVoiceDictation();
    }
    if (isTyping) return;
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const signal = controller.signal;

    let content = contentOverride || input.trim();
    if (!content && attachedFiles.length === 0 && attachedUrlDocs.length === 0) return;

    if (content.trim().toLowerCase() === '/clear') {
      handleClearChat();
      setInput('');
      return;
    }

    if (content.trim().toLowerCase() === '/new') {
      createNewChat(null, isCoderMode);
      setInput('');
      return;
    }

    if (content.toLowerCase().startsWith('/coder')) {
      const trimCmd = content.trim().toLowerCase();
      let newState = true;
      if (trimCmd === '/coder off') {
        newState = false;
      }
      
      setIsCoderMode(newState);
      setIsCoderWorkspacePanelOpen(newState);
      if (newState) {
        setIsSidebarOpen(false);
      }
      
      let targetChatId = currentChatId;
      if (!targetChatId) {
        const newId = Date.now().toString();
        const newChat: Chat = {
          id: newId,
          title: "Coder Session",
          messages: [],
          updatedAt: new Date(),
          isCoderMode: newState
        } as any;
        setChats(prev => [newChat, ...prev]);
        setCurrentChatId(newId);
        targetChatId = newId;
      }
      
      setChats(prev => prev.map(chat => {
        if (chat.id === targetChatId) {
          const sysMsgId = (Date.now() + 1).toString();
          return {
            ...chat,
            isCoderMode: newState,
            messages: [
              ...chat.messages,
              {
                id: Date.now().toString(),
                role: 'user',
                content: content,
                timestamp: new Date()
              },
              {
                id: sysMsgId,
                role: 'assistant',
                content: newState 
                  ? "⚡ **Coder Mode Activated!**\n\nI am now running as an autonomous Software Engineering Agent. I am connected directly to your active project workspace directory and am ready to write, read, edit, and list files in real-time. Give me instructions on what to build!"
                  : "🚫 **Coder Mode Deactivated.**\n\nI will now answer your questions as a standard digital assistant without modifying the workspace.",
                timestamp: new Date()
              }
            ],
            updatedAt: new Date()
          };
        }
        return chat;
      }));
      
      setInput('');
      triggerWorkspaceRefresh();
      return;
    }

    if (activeSkills.length > 0) {
      const skillPrompts = activeSkills.map(id => SKILLS.find(s => s.id === id)?.prompt).filter(Boolean);
      content = skillPrompts.join('') + content;
    }

    // Inject attached URL documents into content
    if (attachedUrlDocs.length > 0) {
      const docBlocks = attachedUrlDocs.map(doc => {
        const processedContent = useTurboQuant
          ? turboQuantCompress(doc.content, 5000, 'medium')
          : doc.content;
        return `\n\n[ATTACHED URL DOCUMENT${useTurboQuant ? ' — TurboQuant Compressed' : ''}]\nSource: ${doc.url}\nTitle: ${doc.title}\nContent:\n${processedContent}\n[END DOCUMENT]`;
      }).join('');
      content = content + docBlocks;
    }

    let chatId = currentChatId;
    if (!chatId) {
      chatId = createNewChat(null, isCoderMode);
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: content,
      timestamp: new Date(),
      elementAttachments: [...localElementAttachments]
    } as any;

    setAttachedFiles([]);
    setAttachedUrlDocs([]);
    setLocalElementAttachments([]);

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

    const isSlash = content.startsWith('/');
    if (isSlash || isCoderMode) {
      setIsGeneratingTodos(true);
      setShowTodoPanel(true);
      
      const firstSpaceIdx = content.indexOf(' ');
      const cmdName = firstSpaceIdx !== -1 ? content.substring(1, firstSpaceIdx).toLowerCase() : content.substring(1).toLowerCase();
      const cmdQuery = firstSpaceIdx !== -1 ? content.substring(firstSpaceIdx + 1).trim() : '';

      setActiveCommandType(cmdName);
      setActiveCommandQuery(cmdQuery || null);

      if (cmdName === 'goal') {
        setCoderTodos([
          { id: 'goal-1', text: `Analyzing task goals for: "${cmdQuery || 'objective'}"`, status: 'in_progress' },
          { id: 'goal-2', text: 'Scaffolding requirements & database blueprint schemas', status: 'pending' },
          { id: 'goal-3', text: 'Assembling components and validating API payloads', status: 'pending' },
          { id: 'goal-4', text: 'Running local test executions and structural verification', status: 'pending' },
          { id: 'goal-5', text: 'Compiling final build output for interactive preview', status: 'pending' }
        ]);
        setIsGeneratingTodos(false);
      } else if (cmdName === 'browser') {
        setCoderTodos([
          { id: 'browser-1', text: `Booting sandboxed browser module for: "${cmdQuery || 'target host'}"`, status: 'in_progress' },
          { id: 'browser-2', text: 'Parsing viewport elements, stylesheets, and meta nodes', status: 'pending' },
          { id: 'browser-3', text: 'Simulating interactive pointer clicks and network requests', status: 'pending' },
          { id: 'browser-4', text: 'Capturing High-Definition page screenshots and asset state', status: 'pending' },
          { id: 'browser-5', text: 'Outputting full diagnostic site audits and log reports', status: 'pending' }
        ]);
        setIsGeneratingTodos(false);
      } else if (cmdName === 'schedule') {
        setCoderTodos([
          { id: 'schedule-1', text: `Registering recurring task rules: "${cmdQuery || 'automation schedule'}"`, status: 'in_progress' },
          { id: 'schedule-2', text: 'Binding execution cron listeners & persistent intervals', status: 'pending' },
          { id: 'schedule-3', text: 'Syncing backend job dispatch triggers and logs database', status: 'pending' },
          { id: 'schedule-4', text: 'Running first-pass scheduler dry-runs', status: 'pending' }
        ]);
        setIsGeneratingTodos(false);
      } else if (cmdName === 'grill-me') {
        setCoderTodos([
          { id: 'grill-1', text: `Reviewing initial alignment details for: "${cmdQuery || 'feature design'}"`, status: 'in_progress' },
          { id: 'grill-2', text: 'Formulating diagnostic clarification interview questions', status: 'pending' },
          { id: 'grill-3', text: 'Rendering dynamic user feedback input prompts', status: 'pending' },
          { id: 'grill-4', text: 'Realigning architecture blueprint based on user responses', status: 'pending' }
        ]);
        setIsGeneratingTodos(false);
      } else if (isCoderMode || cmdName === 'coder') {
        try {
          const planPromptMessage = [
            {
              role: 'system',
              content: 'You are an expert technical planner. Formulate a targeted, structured task checklist of 3-5 concrete engineering steps to accomplish the user\'s workspace request. Focus on specifying relevant files to check, create, edit, or build. Respond ONLY with a clean JSON object containing a "todos" array with items having "id" (string starting at "1"), "text" (the specific task description), and "status" (always "pending"). Do not explain. Do not wrap in markdown tags. Example: {"todos": [{"id": "1", "text": "Analyze existing project files for structure", "status": "pending"}]}.'
            },
            {
              role: 'user',
              content: `User query: "${cmdQuery || content}"`
            }
          ];
          const planRes = await callLlamaBridge(planPromptMessage, [], signal);
          const textResponse = planRes?.choices?.[0]?.message?.content || '';
          const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (Array.isArray(parsed.todos) && parsed.todos.length > 0) {
              const mapped = parsed.todos.map((t: any, idx: number) => ({
                id: t.id || (idx + 1).toString(),
                text: t.text || 'Engineering task',
                status: idx === 0 ? 'in_progress' : 'pending'
              }));
              setCoderTodos(mapped);
            } else {
              throw new Error("Invalid structure");
            }
          } else {
            throw new Error("No JSON found");
          }
        } catch (err) {
          console.warn("Failed to generate dynamic todos via AI:", err);
          setCoderTodos([
            { id: 'fb-1', text: 'Analyze file layout and project components', status: 'in_progress' },
            { id: 'fb-2', text: `Implement build changes matching query: ${(cmdQuery || content).substring(0, 35)}${(cmdQuery || content).length > 35 ? '...' : ''}`, status: 'pending' },
            { id: 'fb-3', text: 'Verify application and render interactive hot-fix', status: 'pending' }
          ]);
        } finally {
          setIsGeneratingTodos(false);
        }
      } else {
        setCoderTodos([
          { id: 'fb-1', text: `Formulating workspace task: "/${cmdName} ${cmdQuery}"`, status: 'in_progress' },
          { id: 'fb-2', text: `Processing task strategies with ${selectedModel}`, status: 'pending' },
          { id: 'fb-3', text: 'Executing response flow actions', status: 'pending' }
        ]);
        setIsGeneratingTodos(false);
      }
    } else {
      setActiveCommandType(null);
      setActiveCommandQuery(null);
    }

    const thinkingId = (Date.now() + 1).toString();
    const thinkingMessage: Message = {
      id: thinkingId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      thinking: isWebSearchEnabled ? 'Searching the web...' : 'Thinking...',
      isSearching: isWebSearchEnabled,
      isStreaming: true,
      toolCalls: [
        {
          id: 'thinking-node',
          label: isWebSearchEnabled ? 'Searching the web...' : `${persona.name} — thinking...`,
          type: 'ai',
          status: 'active',
          icon: isWebSearchEnabled ? <Globe size={14} /> : <Sparkles size={14} />
        }
      ]
    };

    setTypingMessageId(thinkingId);
    setChats(prev => prev.map(chat => {
      if (chat.id === chatId) {
        return {
          ...chat,
          messages: [...chat.messages, thinkingMessage],
          updatedAt: new Date(),
        };
      }
      return chat;
    }));

    let searchResults: any[] = [];
    let searchProvider = "";

    if (isWebSearchEnabled) {
      try {
        setChats(prev => prev.map(chat => {
          if (chat.id !== chatId) return chat;
          return {
            ...chat,
            messages: chat.messages.map(m => m.id === thinkingId
              ? { ...m, thinking: 'Searching the web...', isSearching: true }
              : m)
          };
        }));

        const hasTavilyKey = tavilyApiKey && tavilyApiKey.trim().length > 0;
        const hasSerpKey = serpApiKey && serpApiKey.trim().length > 0;
        
        let providerName = 'DuckDuckGo';
        if (searchProvider === 'tavily' && hasTavilyKey) {
          providerName = 'Tavily';
        } else if (searchProvider === 'serpapi' && hasSerpKey) {
          providerName = 'SerpApi';
        } else if (hasTavilyKey) {
          providerName = 'Tavily';
        } else if (hasSerpKey) {
          providerName = 'SerpApi';
        }

        const searchResp = await fetch(`/api/search`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            query: content, 
            tavilyKey: tavilyApiKey,
            serpKey: serpApiKey,
            provider: searchProvider
          }),
          signal
        });
        
        if (searchResp.ok) {
          const searchData = await searchResp.json();
          searchResults = searchData.results || [];
          searchProvider = searchData.provider || "Search";
        } else {
          console.warn('Backend search failed, no further fallback available.');
        }

        if (searchResults.length > 0) {
          setChats(prev => prev.map(chat => {
            if (chat.id === chatId) {
              return {
                ...chat,
                messages: chat.messages.map(m => m.id === thinkingId ? { 
                  ...m, 
                  isSearching: true, 
                  thinking: `Synthesizing info from ${searchProvider}...`,
                  sources: searchResults.slice(0, 10).map(r => ({ title: r.title, url: r.url, snippet: r.snippet })) 
                } : m),
              };
            }
            return chat;
          }));
        } else {
          console.warn("Search returned no results from any provider.");
        }
      } catch (err) {
        console.error("Search step failed:", err);
      }
    }

    try {
      const chatContext = chats.find(c => c.id === chatId)?.messages || [];
      
      const activeTools = buildActiveTools();
      if (isCoderMode) {
        activeTools.push(
          {
            type: 'function',
            function: {
              name: 'Shell_Command',
              description: 'Executes shell commands in the project workspace. Adapts to the host OS — use PowerShell syntax on Windows, bash on Linux/macOS. Use for running build tools, linters, tests, package managers (npm/pip/cargo), git operations, or any CLI tool.',
              parameters: {
                type: 'object',
                properties: {
                  command: { type: 'string', description: 'Shell command to execute. Write Windows/PowerShell syntax when on Windows (e.g. "Get-ChildItem", "npm run build", "dir"). Write bash syntax on Linux/macOS (e.g. "ls -la", "npm run build").' },
                  cwd: { type: 'string', description: 'Optional subdirectory to run the command in, relative to the workspace root.' },
                  shell: { type: 'string', enum: ['auto', 'powershell', 'cmd', 'bash'], description: 'Force a specific shell. Auto detects from OS (default).' }
                },
                required: ['command']
              }
            }
          },
          {
            type: 'function',
            function: {
              name: 'Edit_and_Write',
              description: 'Modifies or writes new files in the project directory. Creates the file if it does not exist, overwrites if it does. Always read the file first before editing existing content.',
              parameters: {
                type: 'object',
                properties: {
                  filePath: { type: 'string', description: 'Relative path of the file from the project root (e.g. "src/components/Button.tsx").' },
                  content: { type: 'string', description: 'Complete text contents to write into the file.' }
                },
                required: ['filePath', 'content']
              }
            }
          },
          {
            type: 'function',
            function: {
              name: 'Read',
              description: 'Reads the contents of an existing file in the project directory. Optionally read a specific line range using offset (1-indexed line number) and limit (number of lines).',
              parameters: {
                type: 'object',
                properties: {
                  filePath: { type: 'string', description: 'Relative path of the file within the project folder to read.' },
                  offset: { type: 'number', description: 'Optional 1-indexed starting line number. When set, returns content starting from this line.' },
                  limit: { type: 'number', description: 'Optional maximum number of lines to return (default: all lines from offset).' }
                },
                required: ['filePath']
              }
            }
          },
          {
            type: 'function',
            function: {
              name: 'Grep_and_Glob',
              description: 'Searches through the codebase using regex patterns and matches file patterns. Use this to locate symbols, strings, components, styles, routes, or bugs before editing. Omit "query" to list all files by glob pattern.',
              parameters: {
                type: 'object',
                properties: {
                  query: { type: 'string', description: 'Optional regex or plain text pattern to search for in file contents. Omit to just list files matching the glob.' },
                  fileGlob: { type: 'string', description: 'Optional glob/extension filter such as ".tsx", "*.css", "src/**/*.ts".' },
                  maxResults: { type: 'number', description: 'Maximum results to return. Defaults to 30.' }
                },
                required: []
              }
            }
          },
          {
            type: 'function',
            function: {
              name: 'LSP_Experimental',
              description: 'Accesses Language Server Protocol features for a file: returns imports, exported symbols, function declarations, class names, diagnostics (long lines, tabs), and file metadata. Use to understand file structure before editing.',
              parameters: {
                type: 'object',
                properties: {
                  filePath: { type: 'string', description: 'Relative path of the file to analyze.' }
                },
                required: ['filePath']
              }
            }
          },
          {
            type: 'function',
            function: {
              name: 'Apply_patch',
              description: 'Applies code diffs and patches to existing files. Safer than full overwrite when making targeted changes. Searches for exact text segments and replaces them.',
              parameters: {
                type: 'object',
                properties: {
                  filePath: { type: 'string', description: 'Relative path of the target file to patch.' },
                  search: { type: 'string', description: 'Exact text segment to find and replace.' },
                  replace: { type: 'string', description: 'Replacement text for the matched segment.' },
                  all: { type: 'boolean', description: 'Replace all occurrences instead of only the first.' }
                },
                required: ['filePath', 'search', 'replace']
              }
            }
          },
          {
            type: 'function',
            function: {
              name: 'Skill',
              description: 'Accesses and executes reusable custom AI skills from the skill library. Use this to apply predefined skill templates like summarizing, translating, explaining code, brainstorming, or refactoring.',
              parameters: {
                type: 'object',
                properties: {
                  skillId: { type: 'string', description: 'The skill ID to run (e.g. "summarize", "translate", "explain", "brainstorm", "refactor").' },
                  input: { type: 'string', description: 'The text or code to process with the selected skill.' }
                },
                required: ['skillId', 'input']
              }
            }
          },
          {
            type: 'function',
            function: {
              name: 'Todowrite',
              description: 'Writes to and manages the task tracking todo list. Create, update, or complete todo items to track progress through multi-step tasks.',
              parameters: {
                type: 'object',
                properties: {
                  action: { type: 'string', enum: ['create', 'update', 'complete', 'list'], description: 'Action to perform on the todo list.' },
                  items: {
                    type: 'array',
                    description: 'List of todo items to create or update.',
                    items: {
                      type: 'object',
                      properties: {
                        content: { type: 'string', description: 'Description of the task.' },
                        status: { type: 'string', enum: ['pending', 'in_progress', 'completed'], description: 'Current status of the task.' },
                        priority: { type: 'string', enum: ['high', 'medium', 'low'], description: 'Priority level.' }
                      },
                      required: ['content', 'status']
                    }
                  }
                },
                required: ['action', 'items']
              }
            }
          },
          {
            type: 'function',
            function: {
              name: 'Webfetch',
              description: 'Fetches data from the internet by scraping a web page URL. Returns the page title, text content, links, and metadata.',
              parameters: {
                type: 'object',
                properties: {
                  url: { type: 'string', description: 'Full URL to fetch and scrape content from.' },
                  outputFormat: { type: 'string', enum: ['markdown', 'text', 'html'], description: 'Output format (default: markdown).' }
                },
                required: ['url']
              }
            }
          },
          {
            type: 'function',
            function: {
              name: 'Websearch',
              description: 'Searches the web for current information. Use this when you need up-to-date data, documentation lookups, or to answer questions about recent events.',
              parameters: {
                type: 'object',
                properties: {
                  query: { type: 'string', description: 'Search query string.' },
                  maxResults: { type: 'number', description: 'Maximum number of search results to return (default: 5).' }
                },
                required: ['query']
              }
            }
          },
          {
            type: 'function',
            function: {
              name: 'Question',
              description: 'Asks the user 2 to 6 targeted clarifying questions to make sure the implementation aligns with their needs. Call this when requirements are ambiguous or you need to confirm design choices.',
              parameters: {
                type: 'object',
                properties: {
                  questions: {
                    type: 'array',
                    description: 'The list of clarifying questions to ask the user.',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string', description: 'Unique identifier for this question (e.g. "theme", "database").' },
                        question: { type: 'string', description: 'The actual question text to display.' },
                        type: { type: 'string', enum: ['single_choice', 'multi_choice', 'text_input', 'confirm'], description: 'Type of input expected from the user.' },
                        options: { type: 'array', items: { type: 'string' }, description: 'Options if type is single_choice or multi_choice.' },
                        purpose: { type: 'string', description: 'Brief explanation of why this question is being asked.' }
                      },
                      required: ['id', 'question', 'type']
                    }
                  }
                },
                required: ['questions']
              }
            }
          },
          {
            type: 'function',
            function: {
              name: 'Create',
              description: 'Creates a new file or directory in the project workspace. Automatically creates parent directories if they do not exist.',
              parameters: {
                type: 'object',
                properties: {
                  filePath: { type: 'string', description: 'Relative path for the new file or directory (e.g. "src/components/Button.tsx", "public/images").' },
                  content: { type: 'string', description: 'File content (omit to create an empty file or use isDirectory for a folder).' },
                  isDirectory: { type: 'boolean', description: 'Set to true to create a directory instead of a file.' }
                },
                required: ['filePath']
              }
            }
          },
          {
            type: 'function',
            function: {
              name: 'Delete',
              description: 'Deletes a file or directory from the project workspace. Use with caution — this permanently removes the target.',
              parameters: {
                type: 'object',
                properties: {
                  filePath: { type: 'string', description: 'Relative path of the file or directory to delete.' }
                },
                required: ['filePath']
              }
            }
          },
          {
            type: 'function',
            function: {
              name: 'Rename',
              description: 'Renames or moves a file or directory to a new location within the project workspace.',
              parameters: {
                type: 'object',
                properties: {
                  filePath: { type: 'string', description: 'Current relative path of the file or directory.' },
                  newPath: { type: 'string', description: 'New relative path to move or rename to.' }
                },
                required: ['filePath', 'newPath']
              }
            }
          }
        );
      }

      let systemPrompt = `You are ${persona.name}. Character description/Role: ${persona.role}. ${persona.role ? '' : 'Address the user as a helpful digital assistant.'}`;

      // Active mode instructions
      if (activeAssistantMode === 'builder') {
        systemPrompt += `\n\n[ASSISTANT MODE: BUILDER - AUTONOMOUS CODING]
You are operating in BUILDER mode. Your main objective is to implement new application layers, create fresh code resources, write logical components, clean styling patterns, and autonomously build out features requested by the user. Ensure your output code has perfect syntax, imports all required icons from 'lucide-react', and is fully modular.`;
      } else if (activeAssistantMode === 'planner') {
        systemPrompt += `\n\n[ASSISTANT MODE: PLANNER - BLUEPRINTING & ARCHITECTURE]
You are operating in PLANNER mode. Before writing any massive code blocks, your focus is to create high-level engineering blueprints, break down complex task lists, plan files architecture, and outline step-by-step implementation sequences. Guide the user on how the system should be structured before execution.`;
      } else if (activeAssistantMode === 'debugger') {
        systemPrompt += `\n\n[ASSISTANT MODE: DEBUGGER - INQUIRY & TROUBLESHOOTING]
You are operating in DEBUGGER mode. Your focus is to trace errors, debug syntax issues, inspect performance anomalies, explain complex code paths, and repair bugs reported by the user. Do not delete features; provide clean, precise hot-fixes and explain root causes clearly.`;
      }

      if (activeTools.length > 0) {
        systemPrompt += `\n\n[CRITICAL DIRECTIVE: ACTIVE TOOLS ENABLED]
You have the following live tool calling APIs connected and active: ${activeTools.map(t => t.function.name).join(', ')}.
You MUST proactively call the appropriate tools whenever they can provide grounding, web searches, scraper details, or specific Wikipedia insights to construct your answer.
- Always call 'web_scrape' if the user specifies a URL or asks to extract/fetch content from a web link.
- Always call Wikipedia tools ('wiki_search', 'wiki_get_page', 'wiki_get_summary', etc.) for any query that references Wikipedia, general metadata search, or historical/factual/scientific lookup.
Never guess or pretend you do not have functions; execute them immediately and explain what details you retrieved.`;
      }

      if (isCoderMode) {
        const osName = (navigator as any)?.platform || 'unknown';
        systemPrompt += `\n\n[CODER MODE IS ACTIVE — Host OS: ${osName}]
You are a highly capable, autonomous, and professional software engineering agent running inside the root directory of our workspace on ${osName}.
When the user asks you to build page(s), applications, interfaces, features, or modify codes:
1. You MUST make real modifications in the file system using the tools provided: 'Edit_and_Write', 'Read', 'Grep_and_Glob', 'Shell_Command', 'Create', 'Delete', 'Rename', 'Apply_patch', and 'Webfetch'. All file paths are relative to the project root directory!
2. Do NOT just output a text response with code blocks of code changes. You MUST actually execute the tools to create or edit the actual files in real-time.
3. If a file already exists, always use 'Read' first to understand its current content, then make edits with 'Edit_and_Write' or 'Apply_patch'.
4. Use 'Grep_and_Glob' before editing when you need to find symbols, text, styles, routes, or error sources. Use 'Apply_patch' for precise snippet replacements.
5. Use 'Shell_Command' to run build commands, linters, tests, package managers, git operations, or any CLI tool. Use 'Create' to create new files/directories, 'Delete' to remove, 'Rename' to move or rename.
6. Use 'Websearch' or 'Webfetch' to look up documentation, find solutions, or fetch reference code from the internet.
7. Use 'Question' when requirements are ambiguous or you need user input on design decisions.
8. Use 'Todowrite' to track multi-step progress through complex tasks.
9. Use 'LSP_Experimental' to analyze file structure, symbols, and imports before making changes.
10. Work agentically in repeated cycles: briefly reason about what you observed, call one or more tools, inspect the results, then decide the next tool call. Do not stop after a single tool batch if requirements, verification, or preview state remain incomplete.
11. Do NOT use artifact/canvas output in Coder Mode. The right preview panel is the only app preview surface.
12. In your final text response, give a clear scannable summary in markdown of what files and folders you created/changed, and guide the user on how they can preview their app or test its functionality. Maintain standard developer professionalism.`;
      }

      // Orchestration Trigger Detection
      const ORCHESTRATION_TRIGGERS = [
        'full app', 'entire', 'complete project', 'everything', 'end-to-end',
        'full stack', 'whole thing', 'the whole', 'from scratch', 'build me a',
        'create a complete', 'scaffold', 'production ready', 'deploy'
      ];
      const shouldActivateOrchestration = (msg: string): boolean => {
        const lower = msg.toLowerCase();
        return ORCHESTRATION_TRIGGERS.some(trigger => lower.includes(trigger));
      };

      if (isCoderMode && shouldActivateOrchestration(content) && !orchestrationState.isActive) {
        setOrchestrationState({
          isActive: true,
          projectAnalysis: {
            complexityScore: 'HIGH',
            estimatedFiles: 20,
            domainsDetected: ['frontend', 'backend', 'database', 'auth', 'devops'],
            recommendedStrategy: 'SUBAGENT_TEAM',
          },
          agents: [],
          currentPhase: 1,
          totalPhases: 5,
          awaitingUserConfirmation: false,
          conflicts: [],
        });

        systemPrompt += `\n\n[SUBAGENT ORCHESTRATION MODE]
You are the Lumina AI Master Orchestrator operating in Coder Mode.
Your primary role is to analyze incoming software projects and INTELLIGENTLY DECOMPOSE
large, complex work into coordinated subagent tasks that run with maximum parallelism
and minimum inter-dependency conflicts.

When the user asks to build a full project, FIRST output a PROJECT ANALYSIS BLOCK:
┌─────────────────────────────────────────────────────┐
│ 🔍 PROJECT ANALYSIS                                 │
├─────────────────────────────────────────────────────┤
│ Project Name: <name or "Unnamed Project">           │
│ Complexity Score: <LOW | MEDIUM | HIGH | CRITICAL>  │
│ Estimated Files: <number>                           │
│ Domains Detected: <comma-separated list>            │
│ Parallelizable: <YES | NO>                          │
│ Recommended Strategy: <SOLO | SUBAGENT_TEAM>        │
└─────────────────────────────────────────────────────┘

Then output a SUBAGENT TASK DECOMPOSITION PLAN with phases.
Then ask the user for confirmation before beginning.

Available subagents: scaffold-agent, config-agent, backend-agent, frontend-agent,
database-agent, auth-agent, integration-agent, test-agent, docs-agent, deploy-agent.

Store subagent .prompt files at .lumina/subagents/ in the workspace.
Store contract files at .lumina/contracts/ in the workspace.`;
      }

      // Inject search context into systemPrompt BEFORE building apiMessages,
      if (searchResults.length > 0) {
        const rawContextString = searchResults.slice(0, 8)
          .map((r, i) => `[${i+1}] ${r.title}: ${r.snippet} (URL: ${r.url})`)
          .join('\n\n');
        
        const contextString = useTurboQuant
          ? turboQuantCompress(rawContextString, 5000, 'medium')
          : rawContextString;

        systemPrompt += `\n\nWeb Search Results${useTurboQuant ? ' (TurboQuant compressed)' : ''}:\n${contextString}\n\nPlease use the above search results to provide a grounded, up-to-date response. Cite your sources using [number] notation when appropriate. If the results include an instant answer, prioritize that information.`;
      }

      const apiMessages = [
        { role: 'system', content: systemPrompt },
        ...([...chatContext, userMessage]
          .filter(m => (m.content && m.content.trim().length > 0) || (m.elementAttachments && m.elementAttachments.length > 0))
          .map(m => {
            let text = m.content || '';
            if (m.elementAttachments && m.elementAttachments.length > 0) {
              text += `\n\n[INSPECTED CODE ATTACHMENT FOR CONTEXT]:`;
              m.elementAttachments.forEach((att: any) => {
                text += `\n- File Name: ${att.fileName}\n- File Path: ${att.filePath}\n- Code Subsection:\n\`\`\`\n${att.specificCode}\n\`\`\`\n- Functional Role: ${att.elementWork}\n`;
              });
            }
            return {
              role: m.role,
              content: text
            };
          }))
      ];
      
      // Direct call to Llama Bridge
      let rawResponse: any = await callLlamaBridge(apiMessages, activeTools, signal);

      const data = rawResponse;
      let choice = data.choices?.[0]?.message;
      let toolCallsRaw = choice?.tool_calls;
      const responseImages = data.images || [];

      const toolCallNodes: ToolCallNode[] = [];
      let agentTraceContent = '';

      const hasWebScrapeCall = toolCallsRaw && toolCallsRaw.some((tc: any) => tc.function?.name === 'web_scrape');
      if (isCoderMode || hasWebScrapeCall) {
        let loopCount = 0;
        const maxLoops = 20;
        while (choice?.tool_calls && choice.tool_calls.length > 0 && loopCount < maxLoops) {
          loopCount++;
          let shouldStopAfterAsk = false;

          const interimThought = typeof choice.content === 'string' ? choice.content.trim() : '';
          if (interimThought) {
            agentTraceContent += `${agentTraceContent ? '\n\n' : ''}${interimThought}`;
            setChats(prev => prev.map(chat => {
              if (chat.id !== chatId) return chat;
              return {
                ...chat,
                messages: chat.messages.map(m => m.id === thinkingId ? {
                  ...m,
                  content: `${m.content || ''}${m.content ? '\n\n' : ''}${interimThought}`,
                  thinking: `Planning next tool step ${loopCount}...`
                } : m)
              };
            }));
          }
          
          const activeToolNames = choice.tool_calls.map((t: any) => t.function?.name || '');
          if (activeToolNames.some((n: string) => n === 'Read' || n === 'Grep_and_Glob' || n === 'LSP_Experimental')) {
            setCoderTodos(prev => {
              if (prev.length > 0) {
                return prev.map((item, idx) => {
                  if (idx === 0) return { ...item, status: 'complete' };
                  if (idx === 1 && item.status === 'pending') return { ...item, status: 'in_progress' };
                  return item;
                });
              }
              return prev;
            });
          }
          if (activeToolNames.some((n: string) => n === 'Edit_and_Write' || n === 'Apply_patch' || n === 'Bash')) {
            setCoderTodos(prev => {
              if (prev.length > 1) {
                return prev.map((item, idx) => {
                  if (idx <= 1) return { ...item, status: 'complete' };
                  if (idx === 2 && item.status === 'pending') return { ...item, status: 'in_progress' };
                  return item;
                });
              }
              return prev;
            });
          }
          if (loopCount >= 2) {
            setCoderTodos(prev => {
              if (prev.length > 2) {
                return prev.map((item, idx) => {
                  if (idx <= 2) return { ...item, status: 'complete' };
                  if (idx === 3 && item.status === 'pending') return { ...item, status: 'in_progress' };
                  return item;
                });
              }
              return prev;
            });
          }

          const currentCallNodes: ToolCallNode[] = [];
          
          for (const [idx, tc] of choice.tool_calls.entries()) {
            const fn = tc.function || {};
            const name = fn.name || 'unknown';
            const args = fn.arguments ? (() => { try { return JSON.parse(fn.arguments); } catch { return {}; } })() : {};
            
              const isScrape = name === 'web_scrape' || name === 'Webfetch';
              const readRange = name === 'Read' && (args.offset || args.limit) ? ` [offset=${args.offset || 1}, limit=${args.limit || 'all'}]` : '';
              const node: ToolCallNode = {
                id: tc.id || `tc-${Date.now()}-${loopCount}-${idx}`,
                type: 'tool',
                label: isScrape ? `Web Scraper (${args.url})` : `${name} ${args.filePath ? `(${args.filePath})` : ''}${readRange}`,
                status: 'active',
                toolName: name,
                argsCount: typeof args === 'object' && args ? Object.keys(args).length : 0,
                icon: isScrape ? <Globe size={14} /> :
                      name === 'Shell_Command' ? <Terminal size={14} /> :
                      name === 'Websearch' ? <Search size={14} /> :
                      name === 'Grep_and_Glob' ? <Search size={14} /> :
                      name === 'Read' ? <FileText size={14} /> :
                      name === 'Edit_and_Write' ? <PenTool size={14} /> :
                      name === 'Apply_patch' ? <PenTool size={14} /> :
                      name === 'LSP_Experimental' ? <Code size={14} /> :
                      name === 'Skill' ? <Sparkles size={14} /> :
                      name === 'Todowrite' ? <Wrench size={14} /> :
                      name === 'Question' ? <Sparkles size={14} /> :
                      name === 'Create' ? <Sparkles size={14} /> :
                      name === 'Delete' ? <Terminal size={14} /> :
                      name === 'Rename' ? <PenTool size={14} /> :
                      name.includes('grep') || name.includes('search') || name.includes('subtask') ? <Search size={14} /> :
                      name.includes('read') || name.includes('file') ? <FileText size={14} /> :
                      name.includes('edit') || name.includes('create') ? <PenTool size={14} /> :
                      <Sparkles size={14} />,
                filePath: args.filePath || '',
                addedCount: name === 'Edit_and_Write' ? (args.content ? args.content.split('\n').length : 15) : (name === 'Apply_patch' ? 45 : undefined),
                removedCount: name === 'Edit_and_Write' ? 0 : (name === 'Apply_patch' ? 8 : undefined)
              };
            currentCallNodes.push(node);
            toolCallNodes.push(node);
          }

          setChats(prev => prev.map(chat => {
            if (chat.id === chatId) {
              return {
                ...chat,
                messages: chat.messages.map(m => m.id === thinkingId ? {
                  ...m,
                  toolCalls: [...toolCallNodes]
                } : m)
              };
            }
            return chat;
          }));

          const toolResultMessages = [];
          for (const tc of choice.tool_calls) {
            const fn = tc.function || {};
            const name = fn.name || 'unknown';
            const args = fn.arguments ? (() => { try { return JSON.parse(fn.arguments); } catch { return {}; } })() : {};
            let resultValue: any = null;

            try {
              if (!isCoderMode && ['Shell_Command', 'Edit_and_Write', 'Read', 'Grep_and_Glob', 'LSP_Experimental', 'Apply_patch', 'Skill', 'Todowrite', 'Webfetch', 'Websearch', 'Question', 'Create', 'Delete', 'Rename'].includes(name)) {
                throw new Error("Coder tools are disabled when Coder Mode is inactive (Chat Mode).");
              }
              const workspaceArg = coderWorkspacePath ? { workspaceRoot: coderWorkspacePath } : {};
              if (name === 'Shell_Command') {
                const execBody: any = { command: args.command, cwd: args.cwd || '', ...workspaceArg };
                if (args.shell) execBody.shell = args.shell;
                const execRes = await fetch('/api/fs/exec', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(execBody),
                  signal
                });
                resultValue = await execRes.json();
                showToast(`Executed: ${args.command?.substring(0, 40)}`);
              } else if (name === 'Create') {
                const cleanedPath = args.filePath.replace(/^\/+/, '');
                const fullPath = coderWorkspacePath ? `${coderWorkspacePath.replace(/\\/g, '/')}/${cleanedPath}` : `./${cleanedPath}`;
                if (cleanedPath.includes('/') && !args.isDirectory) {
                  const folderPart = cleanedPath.substring(0, cleanedPath.lastIndexOf('/'));
                  const folderFullPath = coderWorkspacePath ? `${coderWorkspacePath.replace(/\\/g, '/')}/${folderPart}` : `./${folderPart}`;
                  await fetch('/api/fs/create', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ filePath: folderFullPath, isDirectory: true, ...workspaceArg }), signal
                  });
                }
                const createRes = await fetch('/api/fs/create', {
                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ filePath: fullPath, isDirectory: !!args.isDirectory, content: args.content, ...workspaceArg }), signal
                });
                resultValue = await createRes.json();
                showToast(`Created ${cleanedPath}`);
              } else if (name === 'Delete') {
                const cleanedPath = args.filePath.replace(/^\/+/, '');
                const fullPath = coderWorkspacePath ? `${coderWorkspacePath.replace(/\\/g, '/')}/${cleanedPath}` : `./${cleanedPath}`;
                const delRes = await fetch('/api/fs/delete', {
                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ filePath: fullPath, ...workspaceArg }), signal
                });
                resultValue = await delRes.json();
                showToast(`Deleted ${cleanedPath}`);
              } else if (name === 'Rename') {
                const oldPath = args.filePath.replace(/^\/+/, '');
                const newPath = args.newPath.replace(/^\/+/, '');
                const fullOldPath = coderWorkspacePath ? `${coderWorkspacePath.replace(/\\/g, '/')}/${oldPath}` : `./${oldPath}`;
                const fullNewPath = coderWorkspacePath ? `${coderWorkspacePath.replace(/\\/g, '/')}/${newPath}` : `./${newPath}`;
                const moveRes = await fetch('/api/fs/move', {
                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ oldPath: fullOldPath, newPath: fullNewPath, ...workspaceArg }), signal
                });
                resultValue = await moveRes.json();
                showToast(`Renamed ${oldPath} → ${newPath}`);
              } else if (name === 'Edit_and_Write') {
                const cleanedPath = args.filePath.replace(/^\/+/, '');
                const fullPath = coderWorkspacePath ? `${coderWorkspacePath.replace(/\\/g, '/')}/${cleanedPath}` : `./${cleanedPath}`;
                
                let oldContent = '';
                try {
                  const readOld = await fetch('/api/fs/read', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ filePath: fullPath, ...workspaceArg }),
                    signal
                  });
                  if (readOld.ok) {
                    const oldData = await readOld.json();
                    oldContent = oldData.content || '';
                  }
                } catch (e) {}

                if (cleanedPath.includes('/')) {
                  const folderPart = cleanedPath.substring(0, cleanedPath.lastIndexOf('/'));
                  const folderFullPath = coderWorkspacePath ? `${coderWorkspacePath.replace(/\\/g, '/')}/${folderPart}` : `./${folderPart}`;
                  await fetch('/api/fs/create', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ filePath: folderFullPath, isDirectory: true, ...workspaceArg }),
                    signal
                  });
                }
                const writeRes = await fetch('/api/fs/write', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ filePath: fullPath, content: args.content, ...workspaceArg }),
                  signal
                });
                resultValue = await writeRes.json();
                
                const newContent = args.content || '';
                const diffValues = computeLineDiff(oldContent, newContent);
                
                const matchingNode = toolCallNodes.find(n => n.id === tc.id);
                if (matchingNode) {
                  matchingNode.addedCount = diffValues.added;
                  matchingNode.removedCount = diffValues.removed;
                }
                showToast(`Wrote ${cleanedPath}`);
              } else if (name === 'Read') {
                const cleanedPath = args.filePath.replace(/^\/+/, '');
                const fullPath = coderWorkspacePath ? `${coderWorkspacePath.replace(/\\/g, '/')}/${cleanedPath}` : `./${cleanedPath}`;
                const readBody: any = { filePath: fullPath, ...workspaceArg };
                if (args.offset) readBody.offset = Number(args.offset);
                if (args.limit) readBody.limit = Number(args.limit);
                const readRes = await fetch('/api/fs/read', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(readBody),
                  signal
                });
                resultValue = await readRes.json();
                const range = args.offset ? ` [offset=${args.offset}${args.limit ? `, limit=${args.limit}` : ''}]` : '';
                showToast(`Read ${cleanedPath}${range}`);
              } else if (name === 'Grep_and_Glob') {
                const maxResults = Math.max(1, Math.min(Number(args.maxResults || 30), 80));
                const listRes = await fetch('/api/fs/list', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ folderPath: coderWorkspacePath || '.', ...workspaceArg }),
                  signal
                });
                const listData = await listRes.json();
                let files = listData.files || [];

                const fileGlob = String(args.fileGlob || '').toLowerCase();
                if (fileGlob) {
                  files = files.filter((f: any) => {
                    if (f.isDirectory) return false;
                    const rel = String(f.relativePath || f.path || '').toLowerCase();
                    return rel.includes(fileGlob) || rel.endsWith(fileGlob);
                  });
                }

                const query = String(args.query || '').trim();
                if (!query) {
                  resultValue = { query: '', count: files.length, files: files.slice(0, maxResults).map((f: any) => ({ filePath: f.relativePath || f.path, isDirectory: f.isDirectory })) };
                } else {
                  files = files.filter((f: any) => {
                    if (f.isDirectory) return false;
                    const rel = String(f.relativePath || f.path || '').toLowerCase();
                    return /\.(html?|css|scss|js|jsx|ts|tsx|json|md|vue|svelte|py|rs|go|php|rb|java|kt|swift)$/i.test(rel);
                  });
                  let regex: RegExp;
                  try { regex = new RegExp(query, 'ig'); } catch { regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'ig'); }
                  const matches: any[] = [];
                  for (const file of files) {
                    if (matches.length >= maxResults) break;
                    const readRes = await fetch('/api/fs/read', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ filePath: file.relativePath || file.path, ...workspaceArg }),
                      signal
                    });
                    if (!readRes.ok) continue;
                    const readData = await readRes.json();
                    const lines = String(readData.content || '').split('\n');
                    lines.forEach((line, idx) => {
                      if (matches.length >= maxResults) return;
                      regex.lastIndex = 0;
                      if (regex.test(line)) {
                        matches.push({ filePath: file.relativePath || file.path, line: idx + 1, text: line.trim().slice(0, 240) });
                      }
                    });
                  }
                  resultValue = { query, count: matches.length, matches };
                  showToast(`Found ${matches.length} match${matches.length === 1 ? '' : 'es'}`);
                }
              } else if (name === 'LSP_Experimental') {
                const cleanedPath = String(args.filePath || '').replace(/^\/+/, '');
                if (!cleanedPath) throw new Error("LSP_Experimental requires filePath");
                const fullPath = coderWorkspacePath ? `${coderWorkspacePath.replace(/\\/g, '/')}/${cleanedPath}` : `./${cleanedPath}`;
                const lspRes = await fetch('/api/lsp/analyze', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ filePath: fullPath, ...workspaceArg }),
                  signal
                });
                resultValue = await lspRes.json();
                showToast(`LSP analyzed ${cleanedPath}`);
              } else if (name === 'Apply_patch') {
                const cleanedPath = String(args.filePath || '').replace(/^\/+/, '');
                const searchText = String(args.search || '');
                const replaceText = String(args.replace ?? '');
                if (!cleanedPath || !searchText) throw new Error("Apply_patch requires filePath and search");
                const fullPath = coderWorkspacePath ? `${coderWorkspacePath.replace(/\\/g, '/')}/${cleanedPath}` : `./${cleanedPath}`;
                const readRes = await fetch('/api/fs/read', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ filePath: fullPath, ...workspaceArg }),
                  signal
                });
                const readData = await readRes.json();
                if (!readRes.ok) throw new Error(readData.error || readData.detail || `Could not read ${cleanedPath}`);
                const oldContent = readData.content || '';
                const occurrences = oldContent.split(searchText).length - 1;
                if (occurrences === 0) throw new Error(`Exact search text was not found in ${cleanedPath}`);
                const newContentVal = args.all ? oldContent.split(searchText).join(replaceText) : oldContent.replace(searchText, replaceText);
                const writeRes = await fetch('/api/fs/write', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ filePath: fullPath, content: newContentVal, ...workspaceArg }),
                  signal
                });
                resultValue = await writeRes.json();
                const diffValues = computeLineDiff(oldContent, newContentVal);
                const matchingNode = toolCallNodes.find(n => n.id === tc.id);
                if (matchingNode) {
                  matchingNode.addedCount = diffValues.added;
                  matchingNode.removedCount = diffValues.removed;
                }
                resultValue = { ...resultValue, replacements: args.all ? occurrences : 1 };
                showToast(`Patched ${cleanedPath}`);
              } else if (name === 'Skill') {
                const skillId = String(args.skillId || '');
                const input = String(args.input || '');
                const skill = SKILLS.find((s: any) => s.id === skillId);
                if (skill) {
                  resultValue = { skillId, skillLabel: skill.label, prompt: skill.prompt, input, result: `${skill.prompt}${input}` };
                } else {
                  resultValue = { error: `Unknown skill: ${skillId}. Available: ${SKILLS.map((s: any) => s.id).join(', ')}` };
                }
                showToast(`Applied skill: ${skillId}`);
              } else if (name === 'Todowrite') {
                const action = String(args.action || '');
                const items = (args.items || []).map((item: any, i: number) => ({
                  ...item,
                  id: item.id || `todo-${Date.now()}-${i}`
                }));
                if (action === 'create' || action === 'update') {
                  setCoderTodos(items);
                  resultValue = { success: true, action, count: items.length, items };
                } else if (action === 'complete') {
                  setCoderTodos(prev => prev.map((item: any) => ({ ...item, status: 'completed' })));
                  resultValue = { success: true, action: 'complete' };
                } else {
                  resultValue = { success: true, action: 'list', items: coderTodos };
                }
                showToast(`Todos: ${action} ${items.length} items`);
              } else if (name === 'Webfetch') {
                const targetUrl = args.url;
                if (!targetUrl) throw new Error("Missing required 'url' parameter for Webfetch.");
                setActiveScrapingJobs(prev => { const c = new Set(prev); c.add(tc.id); return c; });
                showToast(`Fetching: ${targetUrl.substring(0, 30)}...`);
                const scrapeResult = await scrapeUrl({
                  url: targetUrl,
                  outputFormat: args.outputFormat || 'markdown'
                });
                setScrapingResults(prev => { const c = new Map(prev); c.set(tc.id, scrapeResult); return c; });
                setActiveScrapingJobs(prev => { const c = new Set(prev); c.delete(tc.id); return c; });
                if (scrapeResult.error) {
                  resultValue = { error: scrapeResult.error };
                } else {
                  const rawText = scrapeResult.rawText || '';
                  const processedText = useTurboQuant
                    ? turboQuantCompress(rawText, 4000, 'medium')
                    : rawText.substring(0, 3000) + (rawText.length > 3000 ? '...' : '');
                  resultValue = {
                    title: scrapeResult.title,
                    statusCode: scrapeResult.statusCode,
                    linksFound: scrapeResult.links?.length || 0,
                    content: processedText
                  };
                }
              } else if (name === 'Websearch') {
                const searchQuery = String(args.query || '');
                const maxRes = Math.min(Number(args.maxResults || 5), 10);
                if (!searchQuery) throw new Error("Websearch requires query");
                showToast(`Searching: ${searchQuery.substring(0, 40)}`);
                const key = searchProvider === 'serpapi' ? serpApiKey : tavilyApiKey;
                if (key && key.trim()) {
                  const searchRes = await fetch('/api/search', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ query: searchQuery, tavilyKey: tavilyApiKey, serpKey: serpApiKey, provider: searchProvider }),
                    signal
                  });
                  const searchData = await searchRes.json();
                  const sliced = (searchData.results || []).slice(0, maxRes);
                  resultValue = { query: searchQuery, provider: searchData.provider, count: sliced.length, results: sliced };
                } else {
                  resultValue = { error: 'No search API key configured. Configure Tavily or SerpAPI in Settings.' };
                }
              } else if (name === 'Question') {
                const qs = args.questions || [];
                setAskAiQuestions(qs);
                setCurrentQuestionIndex(0);
                setAskAiAnswers({});
                setShowAskAiPanel(true);
                shouldStopAfterAsk = true;
                resultValue = { status: "success", message: "Successfully presented clarify questions to the user. Generation has paused for user inputs." };
                showToast("AI is asking you clarifying questions!");
              } else if (name === 'web_scrape') {
                const targetUrl = args.url;
                if (!targetUrl) {
                  throw new Error("Missing required 'url' parameter for web_scrape.");
                }

                // Push to active scraping jobs set
                setActiveScrapingJobs(prev => {
                  const cloned = new Set(prev);
                  cloned.add(tc.id);
                  return cloned;
                });

                showToast(`Scraping webpage: ${targetUrl.substring(0, 30)}...`);

                // Perform proxy-mediated scraping
                const scrapeResult = await scrapeUrl({
                  url: targetUrl,
                  selectors: args.selectors,
                  usePuppeteer: args.usePuppeteer,
                  extractLinks: args.extractLinks,
                  extractTables: args.extractTables,
                  outputFormat: args.outputFormat
                });

                // Update scraping results Map state
                setScrapingResults(prev => {
                  const cloned = new Map(prev);
                  cloned.set(tc.id, scrapeResult);
                  return cloned;
                });

                // Evict from active scraping jobs set
                setActiveScrapingJobs(prev => {
                  const cloned = new Set(prev);
                  cloned.delete(tc.id);
                  return cloned;
                });

                if (scrapeResult.error) {
                  resultValue = { error: scrapeResult.error };
                  showToast(`Scrape failed: ${scrapeResult.error.substring(0, 30)}...`);
                } else {
                  const rawMarkdown = scrapeResult.rawText || '';
                  const processedMarkdown = useTurboQuant
                    ? turboQuantCompress(rawMarkdown, 4000, 'medium')
                    : (rawMarkdown.substring(0, 3000) + (rawMarkdown.length > 3000 ? '... [Truncated for prompt boundaries]' : ''));

                  resultValue = {
                    title: scrapeResult.title,
                    statusCode: scrapeResult.statusCode,
                    scrapedAt: scrapeResult.scrapedAt,
                    dataExcerpt: scrapeResult.data,
                    linksFound: scrapeResult.links?.length || 0,
                    markdownExcerpt: processedMarkdown || 'No page text extracted.',
                    turboQuantApplied: useTurboQuant,
                  };
                  showToast(`Successfully scraped "${scrapeResult.title || 'Page'}"`);
                }
              } else if (name === 'wiki_search') {
                const { query, limit = 10, language = 'en' } = args;
                showToast(`Searching Wikipedia for: ${query}`);
                const searchResults = await wikiSearch(query, limit, language);
                
                // Store results
                setWikiResults(prev => {
                  const cloned = new Map(prev);
                  cloned.set(tc.id, { wikiType: 'search', data: { results: searchResults } });
                  return cloned;
                });

                resultValue = {
                  resultsCount: searchResults.length,
                  resultsBrief: searchResults.slice(0, 3).map(r => ({ pageId: r.pageId, title: r.title, url: r.url })),
                  payload: searchResults
                };
                
                const currentN = toolCallNodes.find(n => n.id === tc.id);
                if (currentN) {
                  currentN.resultSummary = `Found ${searchResults.length} indexed pages matching "${query}"`;
                }
              } else if (name === 'wiki_get_page') {
                const { pageId, language = 'en' } = args;
                showToast(`Fetching full page ID: ${pageId}`);
                const pageResult = await wikiGetPage(Number(pageId), language);

                setWikiResults(prev => {
                  const cloned = new Map(prev);
                  cloned.set(tc.id, { wikiType: 'page', data: pageResult });
                  return cloned;
                });

                const rawIntro = pageResult.intro || '';
                const rawSections = pageResult.sections
                  ? pageResult.sections.map((s: any) => `## ${s.title}\n${s.content || ''}`).join('\n\n')
                  : '';
                const fullWikiText = rawIntro + '\n\n' + rawSections;

                const compressedWikiText = useTurboQuant
                  ? turboQuantCompress(fullWikiText, 5000, 'medium')
                  : fullWikiText.substring(0, 5000);

                resultValue = {
                  title: pageResult.title,
                  wordCount: pageResult.wordCount,
                  sectionsCount: pageResult.sections?.length || 0,
                  introExcerpt: useTurboQuant
                    ? turboQuantCompress(rawIntro, 600, 'light')
                    : rawIntro.substring(0, 500),
                  compressedContent: compressedWikiText,
                  turboQuantApplied: useTurboQuant,
                  payload: pageResult
                };

                const currentN = toolCallNodes.find(n => n.id === tc.id);
                if (currentN) {
                  currentN.resultSummary = `"${pageResult.title}" fully loaded — ${pageResult.sections?.length || 0} sections, ${pageResult.wordCount} words`;
                }
              } else if (name === 'wiki_get_summary') {
                const { pageId, language = 'en' } = args;
                showToast(`Getting summary for ID: ${pageId}`);
                const summaryResult = await wikiGetSummary(Number(pageId), language);

                setWikiResults(prev => {
                  const cloned = new Map(prev);
                  cloned.set(tc.id, { wikiType: 'summary', data: summaryResult });
                  return cloned;
                });

                const rawExtract = summaryResult.extract || '';
                resultValue = {
                  title: summaryResult.title,
                  extract: useTurboQuant
                    ? turboQuantCompress(rawExtract, 1500, 'light')
                    : rawExtract,
                  url: summaryResult.url,
                  turboQuantApplied: useTurboQuant,
                  payload: summaryResult
                };

                const currentN = toolCallNodes.find(n => n.id === tc.id);
                if (currentN) {
                  currentN.resultSummary = `Summary for "${summaryResult.title}" parsed: "${summaryResult.extract.substring(0, 100)}..."`;
                }
              } else if (name === 'wiki_get_sections') {
                const { pageId, language = 'en' } = args;
                showToast(`Reading page ID: ${pageId}`);
                const sectionsList = await wikiGetSections(Number(pageId), language);

                setWikiResults(prev => {
                  const cloned = new Map(prev);
                  cloned.set(tc.id, { wikiType: 'page', data: { title: `Page ID ${pageId} sections`, url: `https://${language}.wikipedia.org/?curid=${pageId}`, sections: sectionsList } });
                  return cloned;
                });

                resultValue = {
                  sectionsCount: sectionsList.length,
                  list: sectionsList.map(s => ({ index: s.index, title: s.title, level: s.level })),
                  payload: sectionsList
                };

                const currentN = toolCallNodes.find(n => n.id === tc.id);
                if (currentN) {
                  currentN.resultSummary = `Header index parsed: ${sectionsList.length} sections found`;
                }
              } else if (name === 'wiki_get_categories') {
                const { pageId, language = 'en' } = args;
                showToast(`Reading target indices...`);
                const catsList = await wikiGetCategories(Number(pageId), language);

                setWikiResults(prev => {
                  const cloned = new Map(prev);
                  cloned.set(tc.id, { wikiType: 'page', data: { title: `Categories for page ${pageId}`, url: `https://${language}.wikipedia.org/?curid=${pageId}`, categories: catsList.map(c => c.name) } });
                  return cloned;
                });

                resultValue = {
                  categoriesCount: catsList.length,
                  list: catsList.map(c => c.name),
                  payload: catsList
                };

                const currentN = toolCallNodes.find(n => n.id === tc.id);
                if (currentN) {
                  currentN.resultSummary = `${catsList.length} taxonomies resolved`;
                }
              } else if (name === 'wiki_get_links') {
                const { pageId, limit = 50, language = 'en' } = args;
                showToast(`Collecting outbound page links...`);
                const linksList = await wikiGetLinks(Number(pageId), Number(limit), language);

                setWikiResults(prev => {
                  const cloned = new Map(prev);
                  cloned.set(tc.id, { wikiType: 'page', data: { title: `Outbound links for page ${pageId}`, url: `https://${language}.wikipedia.org/?curid=${pageId}`, links: linksList } });
                  return cloned;
                });

                resultValue = {
                  linksCount: linksList.length,
                  payload: linksList
                };

                const currentN = toolCallNodes.find(n => n.id === tc.id);
                if (currentN) {
                  currentN.resultSummary = `${linksList.length} outbound connections logged`;
                }
              } else if (name === 'wiki_get_images') {
                const { pageId, language = 'en' } = args;
                showToast(`Extracting static elements...`);
                const imgsList = await wikiGetImages(Number(pageId), language);

                setWikiResults(prev => {
                  const cloned = new Map(prev);
                  cloned.set(tc.id, { wikiType: 'page', data: { title: `Media elements for page ${pageId}`, url: `https://${language}.wikipedia.org/?curid=${pageId}`, images: imgsList } });
                  return cloned;
                });

                resultValue = {
                  imagesCount: imgsList.length,
                  list: imgsList.map(i => i.name),
                  payload: imgsList
                };

                const currentN = toolCallNodes.find(n => n.id === tc.id);
                if (currentN) {
                  currentN.resultSummary = `${imgsList.length} static illustrations resolved`;
                }
              } else if (name === 'wiki_get_related') {
                const { pageId, limit = 10, language = 'en' } = args;
                showToast(`Finding adjacent articles...`);
                const relatedList = await wikiGetRelated(Number(pageId), Number(limit), language);

                setWikiResults(prev => {
                  const cloned = new Map(prev);
                  cloned.set(tc.id, { wikiType: 'search', data: { results: relatedList } });
                  return cloned;
                });

                resultValue = {
                  relatedCount: relatedList.length,
                  payload: relatedList
                };

                const currentN = toolCallNodes.find(n => n.id === tc.id);
                if (currentN) {
                  currentN.resultSummary = `Trajectory logged: ${relatedList.length} related pages found`;
                }
              } else {
                resultValue = { error: `Unsupported coder tool: ${name}` };
              }
            } catch (err: any) {
              resultValue = { error: err.message };
            }

            const matchedIdx = toolCallNodes.findIndex(node => (node.id === tc.id) || (node.label.startsWith(name) && node.status === 'active'));
            if (matchedIdx !== -1) {
              toolCallNodes[matchedIdx].status = 'complete';
              const resultStr = JSON.stringify(resultValue, null, 2);
              toolCallNodes[matchedIdx].result = resultStr;
              if (!toolCallNodes[matchedIdx].resultSummary) {
                const preview = resultStr.length > 200 ? resultStr.slice(0, 200) + '...' : resultStr;
                toolCallNodes[matchedIdx].resultSummary = preview;
              }
            }

            toolResultMessages.push({
              role: 'tool',
              tool_call_id: tc.id,
              name: name,
              content: JSON.stringify(resultValue)
            });

            setChats(prev => prev.map(chat => {
              if (chat.id === chatId) {
                return {
                  ...chat,
                  messages: chat.messages.map(m => m.id === thinkingId ? {
                    ...m,
                    toolCalls: [...toolCallNodes]
                  } : m)
                };
              }
              return chat;
            }));
          }

          apiMessages.push(choice);
          apiMessages.push(...toolResultMessages);

          await new Promise(r => setTimeout(r, 600));
          triggerWorkspaceRefresh();

          if (shouldStopAfterAsk) {
            break;
          }

          const nextResponse = await callLlamaBridge(apiMessages, activeTools, signal);
          choice = nextResponse.choices?.[0]?.message;
        }

        triggerWorkspaceRefresh();
      } else {
        if (Array.isArray(toolCallsRaw) && toolCallsRaw.length > 0) {
          toolCallsRaw.forEach((tc: any, idx: number) => {
            const fn = tc.function || {};
            const name = fn.name || 'unknown';
            const args = fn.arguments ? (() => { try { return JSON.parse(fn.arguments); } catch { return {}; } })() : {};

            toolCallNodes.push({
              id: tc.id || `tc-${idx}`,
              type: 'tool',
              label: name,
              status: 'complete',
              argsCount: typeof args === 'object' && Object.keys(args).length === 0 ? 0 : Object.keys(args).length,
              toolName: name,
              icon: name.includes('search') || name.includes('research') ? <Search size={14} /> :
                    name.includes('wikipedia') ? <Globe size={14} /> :
                    name.includes('read') || name.includes('view') || name.includes('file') || name.includes('fs') ? <FileText size={14} /> :
                    name.includes('write') || name.includes('edit') ? <PenTool size={14} /> :
                    name.includes('github') ? <Box size={14} /> :
                    name.includes('weather') ? <CloudMoon size={14} /> :
                    <Sparkles size={14} />
            });
          });
        }
      }

      const responseContent = choice?.content;
      const finalContent = [agentTraceContent, responseContent]
        .filter((part, idx, arr) => part && (idx === 0 || part !== arr[0]))
        .join('\n\n') || (toolCallsRaw?.length > 0 ? `Running ${toolCallsRaw.length} tool(s)...` : '');
      
      const scavengedImages: any[] = [];
      toolCallNodes.forEach(tc => {
        if (tc.toolName === 'web_scrape') {
          const scraped = scrapingResults.get(tc.id);
          if (scraped && scraped.images && scraped.images.length > 0) {
            scraped.images.slice(0, 12).forEach((imgUrl: string, idx: number) => {
              if (imgUrl && !scavengedImages.some(x => x.url === imgUrl)) {
                scavengedImages.push({
                  title: `Scraped Image ${idx + 1}`,
                  url: imgUrl,
                  source: scraped.title || 'Web Scrape'
                });
              }
            });
          }
        } else if (tc.toolName?.startsWith('wiki_')) {
          const wikiRes = wikiResults.get(tc.id);
          if (wikiRes && wikiRes.data) {
            if (wikiRes.wikiType === 'page' && wikiRes.data.images && wikiRes.data.images.length > 0) {
              wikiRes.data.images.slice(0, 12).forEach((img: any, idx: number) => {
                if (img.url && !scavengedImages.some(x => x.url === img.url)) {
                  scavengedImages.push({
                    title: img.name || `Wiki Image ${idx + 1}`,
                    url: img.url,
                    source: 'Wikipedia'
                  });
                }
              });
            } else if (wikiRes.wikiType === 'summary' && wikiRes.data.thumbnail?.url) {
              const url = wikiRes.data.thumbnail.url;
              if (url && !scavengedImages.some(x => x.url === url)) {
                scavengedImages.push({
                  title: wikiRes.data.title || 'Wiki Image',
                  url: url,
                  source: 'Wikipedia'
                });
              }
            }
          }
        }
      });

      const imagesToAttach = [...responseImages, ...scavengedImages].map((img: any) => ({
        title: img.title || 'Image',
        url: img.url,
        source: img.source,
        thumbnail: img.thumbnail
      }));

      const finalToolNodes = [...toolCallNodes];

      const modelForLabel = activeModelList.find(m => m.id === activeModelId);
      const aiLabel = modelForLabel?.name || activeModelId;

      const synthesisSubNodes: ToolCallNode[] = [];

      if (toolCallNodes.length > 0) {
        toolCallNodes.forEach((tc, idx) => {
          synthesisSubNodes.push({
            id: `synth-sub-${idx}`,
            type: 'sub-tool',
            label: `resolved: ${tc.toolName || tc.label}`,
            status: 'complete',
            icon: tc.icon,
            resultSummary: tc.argsCount !== undefined
              ? (tc.argsCount === 0 ? 'no args' : `${tc.argsCount} arg${tc.argsCount > 1 ? 's' : ''}`)
              : undefined
          });
        });
      }

      if (searchResults.length > 0) {
        synthesisSubNodes.push({
          id: 'synth-sub-search',
          type: 'sub-tool',
          label: 'injected search context',
          status: 'complete',
          icon: <Globe size={12} />,
          resultSummary: `${searchResults.length} result${searchResults.length > 1 ? 's' : ''} grounded`
        });
      }

      if (writingStyle && writingStyle !== 'default') {
        synthesisSubNodes.push({
          id: 'synth-sub-style',
          type: 'sub-tool',
          label: `applied style: ${writingStyle}`,
          status: 'complete',
          icon: <Sparkles size={12} />
        });
      }

      if (finalContent && finalContent.length > 0) {
        const approxTokens = Math.round(finalContent.length / 4);
        synthesisSubNodes.push({
          id: 'synth-sub-tokens',
          type: 'result',
          label: `output generated`,
          status: 'complete',
          icon: <Sparkles size={12} />,
          resultSummary: `~${approxTokens} tokens`
        });
      }

      let synthLabel: string;
      if (toolCallNodes.length > 1) {
        synthLabel = `${aiLabel} — ${toolCallNodes.length} tools resolved, synthesised`;
      } else if (toolCallNodes.length === 1) {
        synthLabel = `${aiLabel} — tool result synthesised`;
      } else if (searchResults.length > 0) {
        synthLabel = `${aiLabel} — web context synthesised`;
      } else if (isWebSearchEnabled && searchResults.length === 0) {
        synthLabel = `${aiLabel} — direct response (no search hits)`;
      } else if (writingStyle && writingStyle !== 'default') {
        synthLabel = `${aiLabel} — ${writingStyle} response generated`;
      } else {
        synthLabel = `${aiLabel} — response generated`;
      }

      finalToolNodes.push({
        id: 'final-ai',
        type: 'ai',
        label: synthLabel,
        status: 'complete',
        icon: <Sparkles size={12} />,
        subNodes: synthesisSubNodes.length > 0 ? synthesisSubNodes : undefined,
        resultSummary: synthesisSubNodes.length > 0
          ? `${synthesisSubNodes.length} sub-step${synthesisSubNodes.length > 1 ? 's' : ''} completed`
          : undefined
      });

      const activeToolNodes = finalToolNodes.map(n => ({ ...n, status: 'active' as const }));
      
      const thinkTagMatch = finalContent.match(/<think>[\s\S]*?<\/think>/);
      const finalThinkContent = thinkTagMatch ? thinkTagMatch[0] : '';
      const finalDisplayContent = finalContent.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

      // Detect the size of the largest code block to dynamically scale up typing streaming speed
      const codeBlockThreshold = 50;
      let maxLinesOfCode = 0;
      const codeMatches = finalContent.match(/```[\s\S]*?```/g);
      if (codeMatches) {
        for (const block of codeMatches) {
          const lines = block.split('\n').length;
          if (lines > maxLinesOfCode) {
            maxLinesOfCode = lines;
          }
        }
      }

      // Compute dynamic throughput (characters per second) based on file scale & line counts
      const totalLength = finalContent.length;
      let speedFactor = 95; // default for tiny conversational replies

      if (totalLength > 8000) {
        speedFactor = 1600;
      } else if (totalLength > 4000) {
        speedFactor = 1200;
      } else if (totalLength > 2000) {
        speedFactor = 850;
      } else if (totalLength > 1000) {
        speedFactor = 550;
      } else if (totalLength > 500) {
        speedFactor = 280;
      }

      // Scale dynamically with code block complexity to prevent stuttering but keep readable scrolling
      if (maxLinesOfCode > codeBlockThreshold) {
        if (maxLinesOfCode > 800) {
          speedFactor = Math.max(speedFactor, 1950);
        } else if (maxLinesOfCode > 400) {
          speedFactor = Math.max(speedFactor, 1450);
        } else if (maxLinesOfCode > 200) {
          speedFactor = Math.max(speedFactor, 980);
        } else if (maxLinesOfCode > 100) {
          speedFactor = Math.max(speedFactor, 680);
        } else {
          speedFactor = Math.max(speedFactor, 420);
        }
      }

      const startTime = Date.now();
      let currentPos = 0;
      let lastRenderTime = 0;
      const RENDER_INTERVAL = 30; // ~33 FPS viewport updates

      while (currentPos < totalLength) {
        if (signal.aborted) {
          break;
        }

        const elapsed = Date.now() - startTime;
        // Exact character cursor position proportional to actual time elapsed
        const targetPos = Math.min(totalLength, Math.floor(elapsed * (speedFactor / 1000)));

        if (targetPos > currentPos) {
          currentPos = targetPos;
          const partial = finalContent.slice(0, currentPos);
          const now = Date.now();

          // Smoothly update state without loading main thread excessively
          if (now - lastRenderTime > RENDER_INTERVAL || currentPos === totalLength) {
            lastRenderTime = now;
            const parsed = parseThinkTags(partial);
            const displayContent = (parsed.before + parsed.after).trim();
            setChats(prev => prev.map(chat => {
              if (chat.id === chatId) {
                return {
                  ...chat,
                  messages: chat.messages.map(m => m.id === thinkingId ? {
                    ...m,
                    content: parsed.isThinking ? displayContent : (displayContent || partial),
                    thinkContent: parsed.think || undefined,
                    isThinking: parsed.isThinking,
                    streamPos: currentPos,
                    toolCalls: activeToolNodes
                  } : m),
                };
              }
              return chat;
            }));
          }
        }

        // Relinquish execution back to the browser event loop for responsiveness (mouse tracking, layout drag)
        await new Promise(resolve => setTimeout(resolve, 8));
      }

      if (signal.aborted) {
        return;
      }

      const finalArtifacts = isCoderMode ? [] : extractArtifacts(finalDisplayContent, writingStyle, chats, chatId);
      if (finalArtifacts.length > 0) {
        setActiveArtifact(finalArtifacts[0]);
        setIsCanvasOpen(true);
        setCanvasView(finalArtifacts[0].type === 'html' ? 'preview' : 'code');
      }

      setChats(prev => prev.map(chat => {
        if (chat.id === chatId) {
          return {
            ...chat,
            messages: chat.messages.map(m =>
              m.id === thinkingId
                ? {
                    ...m,
                    content: finalDisplayContent || finalContent.trim(),
                    thinkContent: finalThinkContent.replace(/<\/?think>/g, '').trim() || undefined,
                    isThinking: false,
                    streamPos: undefined,
                    thinking: undefined,
                    toolCalls: finalToolNodes,
                    isStreaming: false,
                    sources: searchResults.length > 0 ? searchResults.slice(0, 10).map(r => ({ title: r.title, url: r.url, snippet: r.snippet })) : undefined,
                    images: imagesToAttach.length > 0 ? imagesToAttach : undefined,
                    searchQuery: isWebSearchEnabled ? userMessage.content : undefined,
                    isSearching: false,
                    timestamp: new Date(),
                    artifacts: finalArtifacts.length > 0 ? finalArtifacts : undefined
                  }
                : m
            ),
            updatedAt: new Date(),
          };
        }
        return chat;
      }));
    } catch (error: any) {
      if (error?.name === 'AbortError' || signal.aborted) {
        console.log('Stream generation aborted.');
        // Gracefully finalize typing message structure up to where it currently was
        setChats(prev => prev.map(chat => {
          if (chat.id === chatId) {
            return {
              ...chat,
              messages: chat.messages.map(m =>
                m.id === thinkingId
                  ? {
                      ...m,
                      isThinking: false,
                      isStreaming: false,
                      isSearching: false,
                      timestamp: new Date()
                    }
                  : m
              ),
              updatedAt: new Date(),
            };
          }
          return chat;
        }));
        return;
      }
      console.error('Lumina API Error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Error: Failed to connect to ${serverUrl}. Please check your API key and server configuration in Settings.`,
        timestamp: new Date(),
      };
      setChats(prev => prev.map(chat => {
        if (chat.id === chatId) {
          const filtered = chat.messages.filter(m => m.id !== thinkingId);
          return { ...chat, messages: [...filtered, errorMessage] };
        }
        return chat;
      }));
    } finally {
      setIsTyping(false);
      setTypingMessageId(null);
      abortControllerRef.current = null;
      setCoderTodos(prev => prev.map(t => ({ ...t, status: 'complete' })));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showsSlashCommands && filteredCommands.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedCommandIndex(prev => (prev + 1) % filteredCommands.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedCommandIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length);
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        const selectedCmd = filteredCommands[selectedCommandIndex];
        if (selectedCmd) {
          setInput(`/${selectedCmd.name} `);
          setSelectedCommandIndex(0);
        }
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setInput(input + ' ');
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const adjustTextareaHeight = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = e.target;
    setInput(textarea.value);

    requestAnimationFrame(() => {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    });
  };

  function showToast(message: string) {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 2000);
  }

  const handleScreenshot = async () => {
    setIsPlusMenuOpen(false);
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const track = stream.getVideoTracks()[0];
      const imageCapture = new (window as any).ImageCapture(track);
      const bitmap = await imageCapture.grabFrame();
      const canvas = document.createElement('canvas');
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      canvas.getContext('2d')?.drawImage(bitmap, 0, 0);
      track.stop();
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `screenshot-${Date.now()}.png`, { type: 'image/png' });
          handleFileAttach([file]);
        }
      });
    } catch {
      showToast('Screenshot cancelled or not supported.');
    }
  };

  const ensureScrapedFilesOnDisk = async (doc: any) => {
    if (!doc.id) return;
    const docId = doc.id;
    const isOcr = !!doc.isOcr;
    const title = doc.title;
    const url = doc.url;
    const text = doc.content;
    
    const rawTitle = isOcr ? url.replace(/^\[OCR Image Attachment\]:\s*/, '') : title;
    const safeTitle = rawTitle.replace(/[^a-zA-Z0-9-_.]/g, '_').slice(0, 50);

    const folder = isOcr ? 'ocr_transcripts' : 'scraped_pages';
    const prefix = isOcr ? 'ocr_' : '';
    const markdownPath = `${folder}/${prefix}${safeTitle}_${docId}.md`;
    const jsonPath = `${folder}/${prefix}${safeTitle}_${docId}.json`;

    const markdownContent = isOcr ? (
      `# OCR Image Transcript: ${rawTitle}\n\n` +
      `- **Source Image:** ${rawTitle}\n` +
      `- **Captured/Uploaded On:** ${new Date().toLocaleString()}\n` +
      `- **OCR Parser Confidence:** 100%\n` +
      `- **Extracted Char Count:** ${text.length}\n\n` +
      `---\n\n` +
      `## Transcribed Text Extracted by Node.js OCR Engine\n\n` +
      `${text || '*[No textual content found in image background]*'}`
    ) : (
      `# Scraped Page: ${title}\n\n` +
      `- **URL:** ${url}\n` +
      `- **Attached On:** ${new Date().toLocaleString()}\n` +
      `- **Char Count:** ${text.length}\n\n` +
      `## Full Scraped Content\n\n` +
      `${text}`
    );

    try {
      await fetch('/api/fs/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: markdownPath, content: markdownContent })
      });

      const jsonContent = isOcr ? JSON.stringify({
        id: docId,
        sourceFile: rawTitle,
        processedAt: new Date().toISOString(),
        extractedText: text
      }, null, 2) : JSON.stringify({
        id: docId,
        url,
        title,
        scrapedAt: new Date().toISOString(),
        content: text
      }, null, 2);

      await fetch('/api/fs/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: jsonPath, content: jsonContent })
      });

      triggerWorkspaceRefresh();
    } catch (err) {
      console.error("Error creating files on disk:", err);
    }
  };

  const processOcrForJoinedImage = async (file: File) => {
    setIsOcrProcessing(true);
    showToast(`🔍 Background OCR started for: ${file.name}...`);
    
    try {
      // 1. Read file as Base64 helper
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (e) => reject(e);
        reader.readAsDataURL(file);
      });

      // 2. POST to our custom backend
      const res = await fetch('/api/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64Data })
      });

      if (!res.ok) {
        throw new Error(`Server returned error: ${res.statusText}`);
      }

      const data = await res.json();
      const extractedText = data.text || '';
      const confidence = data.confidence || 0;

      if (!extractedText.trim()) {
        showToast(`⚠️ OCR scan completed, but no readable characters were extracted from ${file.name}.`);
      } else {
        showToast(`✨ OCR transcribed ${file.name} successfully (${Math.round(confidence)}% confidence)!`);
      }

      const docId = Date.now().toString();
      const safeTitle = file.name.replace(/[^a-zA-Z0-9-_.]/g, '_').slice(0, 50);
      const markdownPath = `ocr_transcripts/ocr_${safeTitle}_${docId}.md`;
      const jsonPath = `ocr_transcripts/ocr_${safeTitle}_${docId}.json`;

      // Formulate detailed layout markdown
      const markdownContent = `# OCR Image Transcript: ${file.name}\n\n` +
        `- **Source Image:** ${file.name}\n` +
        `- **Captured/Uploaded On:** ${new Date().toLocaleString()}\n` +
        `- **OCR Parser Confidence:** ${Math.round(confidence)}%\n` +
        `- **Extracted Words:** ${data.words?.length || 0}\n\n` +
        `---\n\n` +
        `## Transcribed Text Extracted by Node.js OCR Engine\n\n` +
        `${extractedText || '*[No textual content found in image background]*'}\n\n` +
        `---\n\n` +
        `## Character Positioning Matrix\n\n` +
        `| Text Element | Confidence | Layout Bounding Box |\n` +
        `| :--- | :--- | :--- |\n` +
        (data.words?.slice(0, 100).map((w: any) => `| **${w.text}** | ${w.confidence}% | x0: ${w.bbox.x0}, y0: ${w.bbox.y0}, x1: ${w.bbox.x1}, y1: ${w.bbox.y1} |`).join('\n') || '| N/A | N/A | N/A |') +
        (data.words?.length > 100 ? `\n| ... and ${data.words.length - 100} more words | | |` : '');

      // Write files in background
      await fetch('/api/fs/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: markdownPath, content: markdownContent })
      });

      await fetch('/api/fs/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filePath: jsonPath,
          content: JSON.stringify({
            id: docId,
            sourceFile: file.name,
            fileSize: file.size,
            fileType: file.type,
            processedAt: new Date().toISOString(),
            confidence,
            extractedText,
            words: data.words || []
          }, null, 2)
        })
      });

      // 4. Create and attach document
      const newDoc = {
        id: docId,
        url: `[OCR Image Attachment]: ${file.name}`,
        title: `OCR Data: ${file.name}`,
        content: extractedText,
        favicon: base64Data, // Show real thumbnail preview
        isOcr: true
      };

      setAttachedUrlDocs(prev => [...prev, newDoc]);
      setTranscriptionOptionsDoc(newDoc); // Prompt options to edit/view right away!
      triggerWorkspaceRefresh();
    } catch (err: any) {
      console.error("OCR background execution error: ", err);
      showToast(`❌ OCR processing failed: ${err?.message || err}`);
    } finally {
      setIsOcrProcessing(false);
    }
  };

  const handleFileAttach = async (files: File[]) => {
    const images = files.filter(f => f.type.startsWith('image/'));
    const nonImages = files.filter(f => !f.type.startsWith('image/'));

    // Attach non-images as regular files
    if (nonImages.length > 0) {
      setAttachedFiles(prev => [...prev, ...nonImages]);
      showToast(`${nonImages.length} file(s) attached successfully!`);
    }

    // Process images sequentially with OCR of Node.js Server in background
    for (const img of images) {
      await processOcrForJoinedImage(img);
    }
  };

  const handleAttachUrl = async () => {
    const url = urlToolInput.trim();
    if (!url) return;
    setUrlToolLoading(true);
    setUrlToolError(null);
    try {
      // Use the existing scrapeUrl service
      const result: ScrapeResult = await scrapeUrl({ url, extractLinks: false, extractImages: false });
      
      // Compress: strip HTML, collapse whitespace, cap at 8000 chars
      let text = '';
      if (result.rawText) {
        text = result.rawText;
      } else if (result.data) {
        text = result.data.text || result.data.content || result.data.markdown || JSON.stringify(result.data);
      }
      text = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      if (text.length > 8000) text = text.slice(0, 8000) + '...[truncated]';
      
      if (!text && result.error) {
        throw new Error(result.error);
      }
      
      const title = result.title || url;
      const favicon = `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=32`;
      
      const newDoc = { id: Date.now().toString(), url, title, content: text, favicon };
      
      setAttachedUrlDocs(prev => [
        ...prev,
        newDoc
      ]);
      
      // Auto save on disk & refresh workspace
      await ensureScrapedFilesOnDisk(newDoc);
      setTranscriptionOptionsDoc(newDoc); // Prompt options right away!
      
      setUrlToolInput('');
      setIsUrlToolOpen(false);
      showToast(`✅ Attached and written to workspace folder!`);
    } catch (err: any) {
      setUrlToolError(err?.message || 'Failed to fetch URL. Make sure it is accessible and try again.');
    } finally {
      setUrlToolLoading(false);
    }
  };

  const ensureTranscriptFilesOnDisk = async (doc: any) => {
    if (!doc.videoId || !doc.segments) return;
    const videoId = doc.videoId;
    const title = doc.title;
    const url = doc.url;
    const segments = doc.segments;
    const transcript = doc.content;

    const markdownPath = `transcripts/transcript_${videoId}.md`;
    const markdownContent = `# YouTube Video Transcript\n\n` +
      `**Video Title:** ${title}\n` +
      `**Video URL:** ${url}\n` +
      `**Video ID:** ${videoId}\n` +
      `**Total Segment Milestones:** ${segments.length}\n\n` +
      `---\n\n` +
      `## Fully Assembled Text\n\n` +
      `${transcript}\n\n` +
      `---\n\n` +
      `## Timestamped Collected Segments\n\n` +
      `| Timestamp | Caption Line |\n` +
      `| :--- | :--- |\n` +
      segments.map((s: any) => `| **${s.timeStr}** | ${s.text} |`).join('\n');

    try {
      await fetch('/api/fs/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: markdownPath, content: markdownContent })
      });

      const jsonPath = `transcripts/transcript_${videoId}.json`;
      const jsonContent = JSON.stringify({
        videoId,
        videoUrl: url,
        videoTitle: title,
        totalSegments: segments.length,
        fullText: transcript,
        segments: segments
      }, null, 2);

      await fetch('/api/fs/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: jsonPath, content: jsonContent })
      });

      triggerWorkspaceRefresh();
    } catch (err) {
      console.error("Error creating files on the fly:", err);
    }
  };

  const handleFetchTranscript = async () => {
    const url = transcriptToolInput.trim();
    if (!url) return;
    setTranscriptToolLoading(true);
    setTranscriptToolError(null);
    
    try {
      const videoId = extractYouTubeId(url);
      if (!videoId) throw new Error('Could not detect a valid YouTube video ID from this URL.');
      
      const transcriptRes = await fetchYouTubeTranscript(videoId);
      const transcript = transcriptRes.text;
      const segments = transcriptRes.segments;
      const title = `YouTube Transcript – ${videoId}`;
      const truncated = transcript.length > 12000 ? transcript.slice(0, 12000) + '...[truncated]' : transcript;
      
      const newDoc = {
        id: Date.now().toString(),
        url,
        title,
        content: truncated,
        favicon: `https://www.google.com/s2/favicons?domain=youtube.com&sz=32`,
        segments,
        videoId
      };
      
      setAttachedUrlDocs(prev => [...prev, newDoc]);
      
      // Auto save on disk & refresh workspace
      await ensureTranscriptFilesOnDisk(newDoc);
      
      setTranscriptionOptionsDoc(newDoc); // Prompt with option choices!
      
      setTranscriptToolInput('');
      setIsTranscriptToolOpen(false);
      showToast(`✅ Transcript attached and written to workspace transcripts folder!`);
    } catch (err: any) {
      setTranscriptToolError(err?.message || 'Failed to fetch transcript. This video may not have captions enabled.');
    } finally {
      setTranscriptToolLoading(false);
    }
  };

  const markdownComponents = useMemo(() => ({
    code({ className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || '');
      const codeStr = String(children).replace(/\n$/, '');
      const isMultiLine = codeStr.includes('\n');
      
      const isTreeStructure = (() => {
        const lines = codeStr.split('\n');
        let branches = 0;
        for (let i = 0; i < Math.min(lines.length, 15); i++) {
          const line = lines[i];
          if (line.includes('├──') || line.includes('└──') || line.includes('│  ') || line.includes('└──') || line.includes('║') || line.includes('╠══') || line.includes('╚══')) {
            branches++;
          }
        }
        return branches >= 1;
      })();

      if (isTreeStructure) {
        return (
          <CustomCodeBlockVisualizer
            language="tree"
            code={codeStr}
            defaultRender={<CanvasBlock language="tree" code={codeStr} />}
          />
        );
      }

      if (match) {
        return (
          <CustomCodeBlockVisualizer
            language={match[1]}
            code={codeStr}
            defaultRender={<CanvasBlock language={match[1]} code={codeStr} />}
          />
        );
      }

      if (isMultiLine) {
        return (
          <CanvasBlock 
            language="text" 
            code={codeStr} 
          />
        );
      }

      return (
        <code className="bg-white/10 px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
          {children}
        </code>
      );
    },
    p({ children, ...props }: any) {
      return (
        <p className="leading-relaxed my-2" {...props}>
          {renderTextWithMath(children)}
        </p>
      );
    },
    table({ children }: any) {
      return <InteractiveTableVisualizer>{children}</InteractiveTableVisualizer>;
    },
    img({ src, alt, ...props }: any) {
      return (
        <div className="my-4 overflow-hidden rounded-2xl border border-zinc-200/50 dark:border-white/5 bg-zinc-50 dark:bg-zinc-900/20 max-w-full sm:max-w-md shadow-xs group relative">
          <img 
            src={src} 
            alt={alt || 'AI Attached Visual'} 
            className="w-full h-auto object-cover max-h-[320px] hover:scale-[1.01] transition-transform duration-300 cursor-pointer" 
            referrerPolicy="no-referrer"
            onClick={() => {
              window.open(src, '_blank');
            }}
            {...props}
          />
          {alt && (
            <div className="px-4 py-2 bg-zinc-50 dark:bg-zinc-900/80 border-t border-zinc-150/40 dark:border-white/5 text-[11px] font-medium text-zinc-550 dark:text-zinc-400 select-none">
              {alt}
            </div>
          )}
        </div>
      );
    },
    a({ href, children, ...props }: any) {
      const isImgUrl = href && /\.(png|jpe?g|gif|webp|svg|bmp)(\?.*)?$/i.test(href);
      if (isImgUrl) {
        return (
          <div className="my-4 overflow-hidden rounded-2xl border border-zinc-200/50 dark:border-white/5 bg-zinc-50 dark:bg-zinc-900/20 max-w-full sm:max-w-md shadow-xs group relative">
            <img 
              src={href} 
              alt={String(children) || 'Attached Visual'} 
              className="w-full h-auto object-cover max-h-[320px] hover:scale-[1.01] transition-transform duration-300 cursor-pointer" 
              referrerPolicy="no-referrer"
              onClick={() => {
                window.open(href, '_blank');
              }}
            />
            <div className="px-4 py-2 bg-zinc-50 dark:bg-zinc-900/80 border-t border-zinc-150/40 dark:border-white/5 text-[11px] font-semibold text-blue-550 dark:text-blue-400 select-none flex items-center justify-between">
              <span className="truncate max-w-[80%]">{String(children) || 'Image Preview'}</span>
              <a href={href} target="_blank" rel="noreferrer" className="underline hover:text-blue-600 dark:hover:text-blue-300 text-[10px] uppercase font-bold tracking-wider">Source</a>
            </div>
          </div>
        );
      }
      return (
        <a 
          href={href} 
          target="_blank" 
          rel="noreferrer" 
          className="text-blue-550 dark:text-blue-400 hover:underline font-semibold" 
          {...props}
        >
          {children}
        </a>
      );
    }
  }), []);

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



  const renderChatBox = (isCenteredState: boolean = false) => {
    const isClaude = theme.id === 'claude';
    return (
      <div className="w-full flex flex-col text-left">
        <AnimatePresence mode="popLayout">
          {(writingStyle !== 'default' || isWebSearchEnabled || bridgeTools.some(t => t.enabled) || activeSkills.length > 0 || useTurboQuant) && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 5 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 5 }}
              className="flex items-center gap-1.5 px-1 mb-2.5 flex-wrap z-10"
            >
              {writingStyle !== 'default' && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsPlusMenuOpen(true);
                    setActivePlusSubMenu('style');
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-500/10 text-orange-500 border border-orange-500/20 shadow-sm cursor-pointer hover:bg-orange-500/15 text-xs font-semibold"
                >
                  {WRITING_STYLES.find(s => s.id === writingStyle)?.icon}
                  <span>Style: {WRITING_STYLES.find(s => s.id === writingStyle)?.label}</span>
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
                    setActivePlusSubMenu('main');
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20 shadow-sm cursor-pointer hover:bg-blue-500/15 text-xs font-semibold"
                >
                  <Globe size={13} />
                  <span>Web Search</span>
                </motion.button>
              )}
              {luminaTools.some(t => t.enabled) && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsPlusMenuOpen(true);
                    setActivePlusSubMenu('lumina_tools');
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 shadow-sm cursor-pointer hover:bg-indigo-500/15 text-xs font-semibold"
                >
                  <Hammer size={12} />
                  <span>Lumina Tools ({luminaTools.filter(t => t.enabled).length})</span>
                </motion.button>
              )}
              {bridgeTools.some(t => t.enabled) && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsPlusMenuOpen(true);
                    setActivePlusSubMenu('tools');
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shadow-sm cursor-pointer hover:bg-emerald-500/15 text-xs font-semibold"
                >
                  <Wrench size={12} />
                  <span>Bridge Tools ({bridgeTools.filter(t => t.enabled).length})</span>
                </motion.button>
              )}
              {activeSkills.map(skillId => {
                const skill = SKILLS.find(s => s.id === skillId);
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
                      setActivePlusSubMenu('skills');
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

        <div className={`relative border border-[var(--theme-input-border)] bg-[var(--theme-input-bg)] focus-within:border-[var(--theme-accent)]/40 overflow-visible flex flex-col p-2 min-h-[100px] justify-between transition-all duration-300 ${
          isCenteredState 
            ? 'rounded-[24px] shadow-lg border-[var(--theme-input-border)] z-10' 
            : 'rounded-xl shadow-none border-[var(--theme-border)]/60 z-10'
        }`}>

          {/* Nested Panel: Todo Checklist Strategy */}
          <AnimatePresence>
            {showTodoPanel && coderTodos.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0, y: -10 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                exit={{ opacity: 0, height: 0, y: -10 }}
                transition={{ type: 'spring', stiffness: 320, damping: 26 }}
                className="overflow-hidden w-full border-b border-[var(--theme-border)]/45 pb-3.5 mb-3 flex flex-col gap-2.5 shrink-0"
              >
                <div className="flex flex-col gap-3 bg-[var(--theme-surface-alt)]/35 hover:bg-[var(--theme-surface-alt)]/55 backdrop-blur-md transition-all p-4 rounded-2xl border border-[var(--theme-border)]/45 text-left mx-1 mt-1 shadow-md">
                  {/* Title block representing the command being executed */}
                  <div className="flex items-center justify-between border-b border-[var(--theme-border)]/25 pb-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center justify-center w-5 h-5 rounded-lg bg-[var(--theme-accent)]/10 text-[var(--theme-accent)] text-xs font-mono">📂</span>
                      <span className="font-semibold text-xs tracking-tight truncate max-w-[280px] sm:max-w-md text-[var(--theme-primary)]">
                        {activeCommandQuery 
                          ? `/${activeCommandType} ${activeCommandQuery}`
                          : isCoderMode 
                            ? "Execute Coder Engineering Task" 
                            : "Execute Workspace Task Strategy"}
                      </span>
                    </div>
                    {/* Progress Percentage Badge */}
                    <span className="text-[10px] font-mono font-bold text-[var(--theme-accent)] bg-[var(--theme-accent)]/10 border border-[var(--theme-accent)]/20 px-2 py-0.5 rounded-full select-none">
                      {Math.round((coderTodos.filter(t => t.status === 'complete').length / coderTodos.length) * 100)}% COMPLETE
                    </span>
                  </div>

                  {/* Header */}
                  <div className="flex items-center justify-between font-sans select-none">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]" />
                      <span className="text-[11px] font-extrabold uppercase tracking-widest text-[var(--theme-primary)]">Active Runbook</span>
                      <span className="text-[10px] text-[var(--theme-muted)] bg-[var(--theme-border)]/15 border border-[var(--theme-border)]/25 px-2 py-0.5 rounded-full font-mono font-bold">
                        {coderTodos.filter(t => t.status === 'complete').length}/{coderTodos.length} Tasks
                      </span>
                      {isGeneratingTodos && (
                        <span className="text-[10px] text-[var(--theme-muted)] italic animate-pulse flex items-center gap-1">
                          <Loader2 size={10} className="animate-spin text-[var(--theme-accent)]" /> (planning...)
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setTodoCollapsed(!todoCollapsed)}
                        className="p-1 hover:bg-[var(--theme-border)]/25 rounded-lg text-[var(--theme-muted)] hover:text-[var(--theme-primary)] transition-all cursor-pointer flex items-center justify-center w-6 h-6 border border-transparent"
                        title={todoCollapsed ? "Expand task checklist" : "Collapse task checklist"}
                      >
                        <ChevronRight 
                          size={14} 
                          className={`transition-transform duration-200 ${todoCollapsed ? '' : 'rotate-90 text-[var(--theme-accent)]'}`} 
                        />
                      </button>
                      <button 
                        type="button"
                        onClick={() => {
                          setShowTodoPanel(false);
                          setCoderTodos([]);
                          setActiveCommandQuery(null);
                          setActiveCommandType(null);
                        }}
                        className="p-1 hover:bg-red-500/10 hover:text-red-400 rounded-lg text-[var(--theme-muted)] transition-all cursor-pointer flex items-center justify-center w-6 h-6 border border-transparent"
                        title="Dismiss checklist"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Redesign: Real-time progress line */}
                  <div className="w-full bg-[var(--theme-border)]/25 h-1.5 rounded-full overflow-hidden select-none">
                    <div 
                      className="bg-emerald-500 h-full transition-all duration-300 ease-out rounded-full shadow-[0_0_6px_#10b981]" 
                      style={{ width: `${(coderTodos.filter(t => t.status === 'complete').length / coderTodos.length) * 100}%` }}
                    />
                  </div>

                  {/* List (collapsible) */}
                  <AnimatePresence initial={false}>
                    {!todoCollapsed && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.18, ease: 'easeInOut' }}
                        className="overflow-hidden"
                      >
                        <div className="flex flex-col gap-1.5 max-h-[175px] overflow-y-auto custom-scrollbar font-sans pr-1">
                          {coderTodos.map((todo) => {
                            const isDone = todo.status === 'complete';
                            const isActive = todo.status === 'in_progress';
                            return (
                              <motion.div
                                key={todo.id || todo.content || Math.random()}
                                initial={{ opacity: 0, x: -5 }}
                                animate={{ opacity: 1, x: 0 }}
                                className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all ${
                                  isActive 
                                    ? 'bg-[var(--theme-accent)]/5 border border-[var(--theme-accent)]/20' 
                                    : 'border border-transparent hover:bg-[var(--theme-border)]/15'
                                }`}
                              >
                                <div className={`w-[18px] h-[18px] rounded-full flex items-center justify-center shrink-0 transition-all duration-200 ${
                                  isDone
                                    ? 'bg-emerald-500/15 border border-emerald-500 text-emerald-400'
                                    : isActive
                                      ? 'border-2 border-[var(--theme-accent)] bg-[var(--theme-accent)]/10 shadow-[0_0_8px_var(--theme-accent)]'
                                      : 'border border-[var(--theme-muted)]/40 bg-transparent'
                                }`}>
                                  {isDone && <Check size={11} strokeWidth={3.5} className="text-emerald-400" />}
                                  {isActive && <div className="w-1.5 h-1.5 rounded-full bg-[var(--theme-accent)] animate-ping" />}
                                </div>

                                <span className={`text-xs font-medium flex-1 transition-colors ${
                                  isDone 
                                    ? 'line-through text-[var(--theme-muted)]/75' 
                                    : isActive 
                                      ? 'text-[var(--theme-primary)] font-semibold' 
                                      : 'text-[var(--theme-secondary)]'
                                }`}>
                                  {todo.content || todo.text || ''}
                                </span>

                                {isDone && (
                                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400 flex items-center gap-1 shrink-0 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                                    <Check size={10} strokeWidth={3} /> Done
                                  </span>
                                )}
                                {isActive && (
                                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--theme-accent)] flex items-center gap-1.5 shrink-0 bg-[var(--theme-accent)]/15 px-2 py-0.5 rounded-md animate-pulse">
                                    <Loader2 size={10} className="text-[var(--theme-accent)] animate-spin" /> In Progress
                                  </span>
                                )}
                              </motion.div>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Nested Panel: Workspace Command Center */}
          <AnimatePresence>
            {showsSlashCommands && filteredCommands.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0, y: -10 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                exit={{ opacity: 0, height: 0, y: -10 }}
                transition={{ type: 'spring', stiffness: 320, damping: 26 }}
                className="overflow-hidden w-full border-b border-[var(--theme-border)]/45 pb-3.5 mb-3 flex flex-col gap-2.5 shrink-0"
              >
                <div className="flex flex-col gap-2.5 bg-[var(--theme-surface-alt)]/35 hover:bg-[var(--theme-surface-alt)]/55 backdrop-blur-md transition-all p-3.5 rounded-2xl border border-[var(--theme-border)]/45 mx-1 mt-1 shadow-md">
                  {/* Header */}
                  <div className="h-10 border-b border-[var(--theme-border)]/25 pl-2 pr-1 py-1.5 flex items-center justify-between shrink-0 select-none font-sans">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-[var(--theme-accent)] animate-pulse" />
                      <span className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--theme-accent)]">Workspace Command Center</span>
                      <span className="text-[10px] text-[var(--theme-primary)] bg-[var(--theme-border)]/15 border border-[var(--theme-border)]/25 px-2 py-0.5 rounded-full font-mono font-bold">
                        {filteredCommands.length} Found
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] text-[var(--theme-muted)] italic hidden sm:inline mr-1">Press Up/Down to Navigate, Enter to Select</span>
                      <button 
                        type="button"
                        onClick={() => setInput(input + ' ')}
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
                            if (inputRef && 'current' in inputRef && inputRef.current) {
                              inputRef.current.focus();
                            }
                          }}
                          onMouseEnter={() => setSelectedCommandIndex(idx)}
                          className={`w-full flex items-center px-3 py-2.5 rounded-xl text-left transition-all select-none gap-3 outline-none duration-200 border cursor-pointer relative overflow-hidden ${
                            isSelected 
                              ? 'bg-[var(--theme-accent)]/[0.07] text-[var(--theme-primary)] border-[var(--theme-accent)]/40 shadow-sm' 
                              : 'text-[var(--theme-secondary)] hover:text-[var(--theme-primary)] hover:bg-[var(--theme-border)]/10 border-transparent'
                          }`}
                        >
                          {/* Active Slide Accent highlight */}
                          {isSelected && (
                            <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[var(--theme-accent)]" />
                          )}

                          {/* Left icon badge or dynamic type */}
                          <div className={`w-[22px] h-[22px] rounded-lg flex items-center justify-center shrink-0 transition-transform ${
                            isSelected
                              ? 'bg-[var(--theme-accent)]/15 text-[var(--theme-accent)] scale-105'
                              : 'bg-[var(--theme-border)]/20 text-[var(--theme-muted)]/70'
                          }`}>
                            <span className="text-xs font-mono font-bold">/</span>
                          </div>

                          <div className="flex-1 flex flex-col sm:flex-row sm:items-center sm:gap-3">
                            <span className={`font-mono text-xs font-bold leading-none ${
                              isSelected ? 'text-[var(--theme-accent)]' : 'text-[var(--theme-primary)]'
                            }`}>
                              /{cmd.name}
                            </span>
                            <span className={`font-sans text-[11px] truncate leading-none ${
                              isSelected ? 'text-[var(--theme-primary)]' : 'text-[var(--theme-muted)]'
                            }`}>
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
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                exit={{ opacity: 0, height: 0, y: -10 }}
                transition={{ type: 'spring', stiffness: 320, damping: 26 }}
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
                                  ? 'bg-[var(--theme-accent)] scale-110 shadow-[0_0_10px_var(--theme-accent)]' 
                                  : isAnswered 
                                    ? 'bg-[var(--theme-accent)]/55 hover:bg-[var(--theme-accent)]' 
                                    : 'bg-[var(--theme-border)] hover:bg-[var(--theme-secondary)]/30 disabled:pointer-events-none'
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
                      {!isTransitioningQuestion && !isGeneratingQuestions && !isAnalyzingAnswers && (
                        <motion.div
                          key={currentQuestionIndex}
                          initial={{ y: 15, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          exit={{ y: -20, opacity: 0 }}
                          transition={{ duration: 0.2, ease: 'easeInOut' }}
                          className="flex flex-col h-full justify-between gap-3.5"
                        >
                          {/* Question Text */}
                          <div className="text-[14px] leading-normal tracking-tight flex flex-col gap-1 select-none font-sans">
                            <span className="text-[var(--theme-primary)] font-semibold text-sm sm:text-base">{askAiQuestions[currentQuestionIndex].question}</span>
                            {askAiQuestions[currentQuestionIndex].purpose && (
                              <span className="text-[11px] text-[var(--theme-muted)] font-medium select-none font-sans flex items-center gap-1">
                                <span className="text-[12px] shrink-0">💡</span>
                                <span className="italic">Purpose: {askAiQuestions[currentQuestionIndex].purpose}</span>
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
                          <Loader2 size={28} className="text-[var(--theme-accent)] animate-spin" />
                          <div className="flex flex-col gap-1">
                            <span className="text-xs font-extrabold tracking-widest uppercase text-[var(--theme-accent)] animate-pulse">
                              Cognitive Appraisal
                            </span>
                            <span className="text-[11px] text-[var(--theme-muted)]">
                              Formulating clarification questions for your workspace session...
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
                          <Loader2 size={28} className="text-[var(--theme-accent)] animate-spin" />
                          <div className="flex flex-col gap-1">
                            <span className="text-xs font-extrabold tracking-widest uppercase text-[var(--theme-accent)] animate-pulse">
                              Synthesizing Intent
                            </span>
                            <span className="text-[11px] text-[var(--theme-muted)]">
                              Weaving answers into a high-fidelity engineer task blueprint...
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
          {(attachedFiles.length > 0 || localElementAttachments.length > 0 || attachedUrlDocs.length > 0 || isOcrProcessing) && (
            <div className="flex flex-wrap gap-2 pt-1 pb-3 items-center">
              {attachedFiles.map((file, idx) => {
                const isImage = file.type.startsWith('image/');
                const ext = file.name.split('.').pop()?.toUpperCase() || 'DOC';
                let previewUrl = '';
                if (isImage) {
                  try {
                    previewUrl = URL.createObjectURL(file);
                  } catch (e) {
                    previewUrl = '';
                  }
                }
                return (
                  <motion.div 
                    key={`${file.name}-${idx}`}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative flex items-center gap-2.5 px-3 py-1.5 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface-alt)] text-[var(--theme-primary)] hover:bg-[var(--theme-hover-bg)] transition-all max-w-[215px] h-12 shadow-sm group/file"
                  >
                    <button
                      onClick={() => setAttachedFiles(prev => prev.filter((_, i) => i !== idx))}
                      className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-zinc-800 hover:bg-zinc-700 border border-[var(--theme-border)] text-gray-400 hover:text-white flex items-center justify-center transition-all z-10 shadow-lg cursor-pointer"
                    >
                      <X size={12} />
                    </button>
                    <div className="w-8 h-8 bg-zinc-800 border border-[var(--theme-border)] rounded-lg flex items-center justify-center text-[9px] font-black uppercase text-gray-400 tracking-wider overflow-hidden shrink-0">
                      {isImage && previewUrl ? (
                        <img src={previewUrl} alt="" className="w-full h-full object-cover" />
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
                    setAttachmentContextMenu({
                      visible: true,
                      x: e.clientX,
                      y: e.clientY,
                      attachment: att,
                      index: idx
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
                      setLocalElementAttachments(prev => prev.filter((_, i) => i !== idx));
                    }}
                    className="absolute -top-1.5 -right-1.5 w-4.5 h-4.5 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-teal-500 text-teal-300 hover:text-white flex items-center justify-center transition-all z-10 shadow-lg cursor-pointer animate-fade-in"
                  >
                    <X size={10} />
                  </button>
                  <div className="flex items-center justify-center">
                    <MousePointerClick size={18} className="text-teal-400 animate-pulse" />
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
                  title={doc.isOcr ? `Click to view or edit OCR text for: ${doc.title}` : "Click to open or view in virtual code editor"}
                >
                  {doc.isOcr ? (
                    doc.favicon ? (
                      <img src={doc.favicon} alt="" className="w-5 h-5 rounded object-cover shrink-0 border border-blue-500/40" />
                    ) : (
                      <Sparkles size={11} className="shrink-0 text-blue-400 animate-pulse" />
                    )
                  ) : doc.favicon ? (
                    <img src={doc.favicon} alt="" className="w-4 h-4 rounded-sm shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  ) : null}
                  {!doc.isOcr && <LinkIcon size={12} className="shrink-0 text-blue-400" />}
                  <span className="truncate">{doc.title.slice(0, 30) || doc.url}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setAttachedUrlDocs(prev => prev.filter(d => d.id !== doc.id));
                    }}
                    className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-zinc-900 border border-blue-500/50 text-blue-300 hover:text-white flex items-center justify-center transition-all z-10 cursor-pointer animate-fade-in"
                  >
                    <X size={9} />
                  </button>
                </motion.div>
              ))}

              {isOcrProcessing && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-blue-500/30 bg-blue-500/5 text-blue-300 h-10 shadow-sm shrink-0 animate-pulse font-sans"
                >
                  <Sparkles size={13} className="animate-spin text-blue-400" />
                  <div className="flex flex-col text-left">
                    <span className="text-[10px] font-bold">OCR Transcribing...</span>
                  </div>
                </motion.div>
              )}
            </div>
          )}

          {/* Advanced Voice Dictation & Ambient Soundboard Control Pane */}
          <AnimatePresence>
            {showVoiceControlPanel && (
              <motion.div
                initial={{ opacity: 0, height: 0, y: -7 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                exit={{ opacity: 0, height: 0, y: -7 }}
                className="overflow-hidden w-full border-b border-[var(--theme-border)]/55 pb-3 mb-3 flex flex-col gap-2.5 shrink-0"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 bg-[var(--theme-surface-alt)]/45 hover:bg-[var(--theme-bg)]/60 transition-all p-3 rounded-2xl border border-[var(--theme-border)]/55 shadow-inner">
                  {/* Left: Interactive Mic Controller */}
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      {isVoiceListening ? (
                        <>
                          <span className="absolute -inset-1.5 rounded-full bg-red-500/25 animate-ping" style={{ animationDuration: '1.4s' }}></span>
                          <span className="absolute -inset-3.5 rounded-full bg-red-500/10 animate-ping" style={{ animationDuration: '2.4s' }}></span>
                          <div 
                            className="w-10 h-10 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center cursor-pointer relative z-10 transition-all active:scale-90 shadow-md shadow-red-500/20"
                            onClick={stopVoiceDictation}
                            title="Deactivate Voice Input"
                          >
                            <MicOff size={16} className="animate-pulse" />
                          </div>
                        </>
                      ) : (
                        <div 
                          className="w-10 h-10 rounded-full bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center cursor-pointer relative z-10 transition-all active:scale-90 shadow-md shadow-blue-500/20"
                          onClick={startVoiceDictation}
                          title="Activate Voice Input"
                        >
                          <Mic size={16} />
                        </div>
                      )}
                    </div>

                    <div className="text-left select-none">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10.5px] font-extrabold tracking-widest uppercase ${isVoiceListening ? 'text-red-500 animate-pulse' : 'text-[var(--theme-secondary)]'}`}>
                          {isVoiceListening ? 'Recording Live Transcripts' : 'Voice Dictation'}
                        </span>
                        {isVoiceListening && (
                          <span className="text-[9px] font-mono bg-red-500/15 text-red-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                            {voiceLanguage}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-[var(--theme-muted)] mt-0.5 max-w-[210px] sm:max-w-xs truncate">
                        {isVoiceListening 
                          ? (voiceInterimText ? 'Transcribing speech stream...' : 'Start speaking to formulate message...') 
                          : 'Dictate custom prompts and codes organically'}
                      </div>
                    </div>
                  </div>

                  {/* Center: Web Audio Level Waveform representation */}
                  <div className="flex items-center gap-1 h-5 min-w-[70px] justify-center">
                    {isVoiceListening ? (
                      Array.from({ length: 12 }).map((_, i) => {
                        // Dynamic organic heights with responsive microphone amplitude
                        const volScale = micVolume > 0 ? (micVolume / 100) : 0.15;
                        const minH = 3;
                        const maxH = 20;
                        const individualOffset = Math.sin(Date.now() / 140 + i * 40) * 0.45 + 0.55;
                        const height = Math.max(minH, Math.min(maxH, maxH * volScale * individualOffset));
                        
                        return (
                          <motion.span
                            key={i}
                            className="w-[3px] rounded-full bg-gradient-to-t from-red-500 via-orange-500 to-yellow-400"
                            animate={{ height }}
                            transition={{ type: 'spring', stiffness: 350, damping: 20 }}
                          />
                        );
                      })
                    ) : (
                      Array.from({ length: 8 }).map((_, i) => (
                        <div
                          key={i}
                          className="w-[3px] h-1.5 rounded-full bg-[var(--theme-border)]/50"
                        />
                      ))
                    )}
                  </div>

                  {/* Right: Fine-grain Customization parameters */}
                  <div className="flex items-center gap-3.5 flex-wrap">
                    {/* Locale targets */}
                    <div className="flex flex-col text-left">
                      <label className="text-[9px] font-mono uppercase tracking-widest text-[var(--theme-secondary)]/70 font-bold mb-0.5 select-none">Locale language</label>
                      <select
                        value={voiceLanguage}
                        onChange={(e) => {
                          const code = e.target.value;
                          setVoiceLanguage(code);
                          showToast(`Acoustic language swapped: ${SUPPORTED_VOICE_LANGUAGES.find(s=>s.code===code)?.label}`);
                          if (isVoiceListening) {
                            stopVoiceDictation();
                            setTimeout(() => {
                              const RecognitionConstructor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
                              if (RecognitionConstructor) {
                                const rec = new RecognitionConstructor();
                                rec.continuous = true;
                                rec.interimResults = true;
                                rec.lang = code;
                                rec.onstart = () => { setIsVoiceListening(true); };
                                rec.onerror = (err_e: any) => { if (err_e.error !== 'no-speech') setVoiceError(`Error: ${err_e.error}`); };
                                rec.onend = () => { setIsVoiceListening(false); };
                                rec.onresult = (res_e: any) => {
                                  let finalTrans = '';
                                  let interimTrans = '';
                                  for (let idx = res_e.resultIndex; idx < res_e.results.length; ++idx) {
                                    if (res_e.results[idx].isFinal) finalTrans += res_e.results[idx][0].transcript;
                                    else interimTrans += res_e.results[idx][0].transcript;
                                  }
                                  if (interimTrans) setVoiceInterimText(interimTrans);
                                  if (finalTrans) {
                                    setInput(prev => {
                                      const added = finalTrans.trim();
                                      if (!added) return prev;
                                      return voiceAppendMode ? (prev ? (prev.endsWith(' ') ? prev + added : prev + ' ' + added) : added) : added;
                                    });
                                    setVoiceInterimText('');
                                  }
                                };
                                recognitionRef.current = rec;
                                rec.start();
                              }
                            }, 250);
                          }
                        }}
                        className="h-7 bg-[var(--theme-surface)] text-[var(--theme-primary)] border border-[var(--theme-border)] text-[10px] rounded-lg px-2.5 outline-none cursor-pointer focus:border-[var(--theme-accent)] transition-all shrink-0 max-w-[125px] font-sans"
                      >
                        {SUPPORTED_VOICE_LANGUAGES.map(lang => (
                          <option key={lang.code} value={lang.code}>{lang.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Mode (overwrite vs append) */}
                    <div className="flex flex-col text-left">
                      <span className="text-[9px] font-mono uppercase tracking-widest text-[var(--theme-secondary)]/70 font-bold mb-0.5 select-none font-bold">Write Target</span>
                      <button
                        type="button"
                        onClick={() => {
                          setVoiceAppendMode(!voiceAppendMode);
                          showToast(voiceAppendMode ? "Direct text Overwrite mode active" : "Concatenate Append text mode active");
                        }}
                        className={`h-7 px-2.5 rounded-lg text-[10px] border font-bold transition-all flex items-center justify-center gap-1 cursor-pointer font-sans ${
                          voiceAppendMode 
                            ? 'bg-blue-500/10 text-blue-400 border-blue-500/25 hover:bg-blue-500/20' 
                            : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/25 hover:bg-indigo-500/20'
                        }`}
                        title={voiceAppendMode ? "Speech is appended" : "Speech replaces input text"}
                      >
                        {voiceAppendMode ? '📝 Append' : '🔄 Replace'}
                      </button>
                    </div>

                    {/* Auto Submission */}
                    <div className="flex flex-col text-left">
                      <span className="text-[9px] font-mono uppercase tracking-widest text-[var(--theme-secondary)]/70 font-bold mb-0.5 select-none font-bold">Auto submission</span>
                      <button
                        type="button"
                        onClick={() => {
                          setVoiceAutoSend(!voiceAutoSend);
                          showToast(voiceAutoSend ? "Semi-auto submission mode disabled" : "Voice stop submission mode enabled!");
                        }}
                        className={`h-7 px-2.5 rounded-lg text-[10px] border font-bold transition-all flex items-center justify-center gap-1 cursor-pointer font-sans ${
                          voiceAutoSend 
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25 shadow-inner' 
                            : 'bg-[var(--theme-hover-bg)] text-[var(--theme-secondary)] border-[var(--theme-border)]/70 hover:bg-[var(--theme-border)]/20'
                        }`}
                        title="Submit message instantly upon voice completion"
                      >
                        {voiceAutoSend ? '🚀 Auto-Send' : '⏸️ Manual'}
                      </button>
                    </div>

                    {/* Quick Sweep clear */}
                    <div className="flex flex-col text-left justify-end">
                      <span className="text-[9px] h-2 leading-0 select-none"></span>
                      <button
                        type="button"
                        onClick={() => {
                          setInput('');
                          setVoiceInterimText('');
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

                {/* Real-time Subtitle translation stream feedback */}
                {isVoiceListening && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.99, y: 3 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.99, y: 3 }}
                    className="p-3 bg-gradient-to-r from-red-500/5 via-amber-500/5 to-transparent border border-red-500/15 hover:border-red-500/35 transition-all rounded-2xl flex items-start gap-2.5 text-left relative overflow-hidden"
                  >
                    <Sparkles size={13} className="text-amber-500 animate-spin shrink-0 mt-0.5" />
                    <div className="flex-1 text-xs leading-relaxed select-none font-sans">
                      <span className="text-[var(--theme-secondary)] font-semibold font-sans">Interim Speech Chunk: </span>
                      <span className="text-amber-400 italic font-bold font-sans">
                        {voiceInterimText || 'Awaiting live voice stream inputs...'}
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
                if (items[i].type.indexOf('image') !== -1) {
                  const blob = items[i].getAsFile();
                  if (blob) {
                    files.push(new File([blob], `pasted-image-${Date.now()}.png`, { type: blob.type }));
                  }
                }
              }
              if (files.length > 0) {
                e.preventDefault();
                handleFileAttach(files);
              }
            }}
            placeholder={
              activeAssistantMode === 'builder'
                ? "Describe the feature or component you want me to build autonomously..."
                : activeAssistantMode === 'planner'
                  ? "Describe a complex high-level task to draft a detailed architecture blueprint..."
                  : "Trace syntax errors, explain complex codes, or hot-fix bugs..."
            }
            rows={1}
            className="w-full bg-transparent border-none focus:ring-0 focus:outline-none text-[16px] p-0 resize-none min-h-[40px] text-[var(--theme-primary)] placeholder-zinc-500/70 scroll-none"
          />
        </div>
        
        <div className="flex items-center justify-between px-3 pb-1.5 pt-1">
          <div className="flex items-center gap-2">
            <div className="relative" ref={plusMenuRef}>
              <motion.button 
                whileTap={{ scale: 0.92 }}
                transition={{ duration: 0.08 }}
                onClick={() => {
                  setIsPlusMenuOpen(!isPlusMenuOpen);
                  setActivePlusSubMenu('main');
                }}
                className={`p-2 rounded-2xl transition-all ${
                  isWebSearchEnabled 
                    ? 'text-blue-500 bg-blue-500/10 hover:bg-blue-500/20' 
                    : (luminaTools.some(t => t.enabled) || bridgeTools.some(t => t.enabled))
                      ? 'text-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/20' 
                      : 'text-[var(--theme-secondary)] hover:text-[var(--theme-primary)] hover:bg-[var(--theme-hover-bg)]'
                }`}
              >
                <Plus size={20} className={`transition-transform duration-200 ${isPlusMenuOpen ? 'rotate-45' : ''}`} />
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
                    {activePlusSubMenu === 'main' ? (
                      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar space-y-0.5 p-0.5">
                        {[
                          { id: 'files', label: 'Add files or photos', icon: <FileUp size={16} /> },
                          { id: 'attach_url', label: 'Attach URL', icon: <LinkIcon size={16} /> },
                          { id: 'transcript', label: 'Video Transcript', icon: <Video size={16} /> },
                          { id: 'screenshot', label: 'Take a screenshot', icon: <Camera size={16} /> },
                          { id: 'skills', label: 'Skills', icon: <Box size={16} />, hasArrow: true },
                          { id: 'style', label: 'Writing Style', icon: <Palette size={16} />, hasArrow: true },
                          { type: 'separator' },
                          { id: 'lumina_tools', label: 'Lumina Tools', icon: <Hammer size={16} />, hasArrow: true },
                          { id: 'tools', label: 'Bridge Tools', icon: <Wrench size={16} />, hasArrow: true },
                          { id: 'search', label: 'Web search', icon: <Globe size={16} />, isSelected: isWebSearchEnabled },
                        ].map((item, idx) => (
                          item.type === 'separator' ? (
                            <div key={idx} className="my-1 border-t border-[var(--theme-border)]" />
                          ) : (
                            <button
                              key={item.id}
                              onClick={() => {
                                switch (item.id) {
                                  case 'files':
                                    fileInputRef.current?.click();
                                    setIsPlusMenuOpen(false);
                                    break;
                                  case 'attach_url':
                                    setIsPlusMenuOpen(false);
                                    setIsUrlToolOpen(true);
                                    break;
                                  case 'transcript':
                                    setIsPlusMenuOpen(false);
                                    setIsTranscriptToolOpen(true);
                                    break;
                                  case 'screenshot':
                                    handleScreenshot();
                                    break;
                                  case 'skills':
                                    setActivePlusSubMenu('skills');
                                    break;
                                  case 'style':
                                    setActivePlusSubMenu('style');
                                    break;
                                  case 'search':
                                    setIsWebSearchEnabled(prev => !prev);
                                    break;
                                  case 'lumina_tools':
                                    setActivePlusSubMenu('lumina_tools');
                                    break;
                                  case 'tools':
                                    setActivePlusSubMenu('tools');
                                    break;
                                }
                              }}
                              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-[var(--theme-secondary)] hover:bg-[var(--theme-hover-bg)] hover:text-[var(--theme-primary)] transition-colors group/item"
                            >
                              <div className="flex items-center gap-3">
                                <span className={`transition-colors ${(item as any).isSelected ? 'text-blue-500' : 'group-hover/item:text-[var(--theme-primary)]'}`}>{item.icon}</span>
                                {item.label}
                              </div>
                              <div className="flex items-center gap-2">
                                {(item as any).isSelected && <Check size={14} className="text-blue-500" />}
                                {(item as any).hasArrow && <ChevronRight size={14} className="text-[var(--theme-secondary)] group-hover/item:text-[var(--theme-primary)]" />}
                              </div>
                            </button>
                          )
                        ))}
                      </div>
                    ) : activePlusSubMenu === 'lumina_tools' ? (
                      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
                        <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--theme-border)] mb-1 shrink-0">
                          <button 
                            onClick={() => setActivePlusSubMenu('main')}
                            className="p-1 hover:bg-[var(--theme-hover-bg)] rounded-lg text-[var(--theme-secondary)] hover:text-[var(--theme-primary)] transition-colors"
                          >
                            <ChevronLeft size={16} />
                          </button>
                          <span className="text-[10px] font-bold text-[var(--theme-secondary)] uppercase tracking-widest">Lumina Tools</span>
                        </div>

                        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-0.5">
                          {luminaTools.map(tool => (
                            <button
                              key={tool.id}
                              onClick={() => {
                                setLuminaTools(prev => prev.map(t => t.id === tool.id ? { ...t, enabled: !t.enabled } : t));
                                showToast(`${tool.enabled ? 'Disabled' : 'Enabled'} ${tool.name}`);
                              }}
                              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium text-[var(--theme-secondary)] hover:bg-[var(--theme-hover-bg)] transition-colors group/tool"
                            >
                              <div className="flex items-center gap-3">
                                <div className={`p-1.5 rounded-lg transition-colors ${tool.enabled ? 'bg-[var(--theme-accent)]/10 text-[var(--theme-accent)]' : 'bg-[var(--theme-hover-bg)] text-[var(--theme-secondary)]'}`}>
                                  {tool.icon}
                                </div>
                                <div className="text-left">
                                  <div className={`transition-colors ${tool.enabled ? 'text-[var(--theme-primary)]' : 'text-[var(--theme-secondary)]'}`}>{tool.name}</div>
                                  <div className="text-[10px] text-[var(--theme-muted)] truncate w-32">{tool.description}</div>
                                </div>
                              </div>
                              <div className={`w-8 h-4 rounded-full transition-colors relative ${tool.enabled ? 'bg-[var(--theme-accent)]' : 'bg-[var(--theme-hover-bg)]'}`}>
                                <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${tool.enabled ? 'right-0.5' : 'left-0.5'}`} />
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : activePlusSubMenu === 'tools' ? (
                      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
                        <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--theme-border)] mb-1 shrink-0">
                          <button 
                            onClick={() => setActivePlusSubMenu('main')}
                            className="p-1 hover:bg-[var(--theme-hover-bg)] rounded-lg text-[var(--theme-secondary)] hover:text-[var(--theme-primary)] transition-colors"
                          >
                            <ChevronLeft size={16} />
                          </button>
                          <span className="text-[10px] font-bold text-[var(--theme-secondary)] uppercase tracking-widest">Bridge Tools</span>
                        </div>

                        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-0.5">
                          {bridgeTools.map(tool => (
                            <button
                              key={tool.id}
                              onClick={() => {
                                setBridgeTools(prev => prev.map(t => t.id === tool.id ? { ...t, enabled: !t.enabled } : t));
                                showToast(`${tool.enabled ? 'Disabled' : 'Enabled'} ${tool.name}`);
                              }}
                              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium text-[var(--theme-secondary)] hover:bg-[var(--theme-hover-bg)] transition-colors group/tool"
                            >
                              <div className="flex items-center gap-3">
                                <div className={`p-1.5 rounded-lg transition-colors ${tool.enabled ? 'bg-[var(--theme-accent)]/10 text-[var(--theme-accent)]' : 'bg-[var(--theme-hover-bg)] text-[var(--theme-secondary)]'}`}>
                                  {tool.icon}
                                </div>
                                <div className="text-left">
                                  <div className={`transition-colors ${tool.enabled ? 'text-[var(--theme-primary)]' : 'text-[var(--theme-secondary)]'}`}>{tool.name}</div>
                                  <div className="text-[10px] text-[var(--theme-muted)] truncate w-32">{tool.description}</div>
                                </div>
                              </div>
                              <div className={`w-8 h-4 rounded-full transition-colors relative ${tool.enabled ? 'bg-[var(--theme-accent)]' : 'bg-[var(--theme-hover-bg)]'}`}>
                                <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${tool.enabled ? 'right-0.5' : 'left-0.5'}`} />
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : activePlusSubMenu === 'skills' ? (
                      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
                        <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--theme-border)] mb-1 shrink-0">
                          <button 
                            onClick={() => setActivePlusSubMenu('main')}
                            className="p-1 hover:bg-[var(--theme-hover-bg)] rounded-lg text-[var(--theme-secondary)] hover:text-[var(--theme-primary)] transition-colors"
                          >
                            <ChevronLeft size={16} />
                          </button>
                          <span className="text-[10px] font-bold text-[var(--theme-secondary)] uppercase tracking-widest">Skills</span>
                        </div>
                        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-0.5">
                          {SKILLS.map(skill => (
                            <button
                              key={skill.id}
                              onClick={() => {
                                setActiveSkills(prev => 
                                  prev.includes(skill.id) 
                                    ? prev.filter(id => id !== skill.id) 
                                    : [...prev, skill.id]
                                );
                                showToast(`${activeSkills.includes(skill.id) ? 'Deactivated' : 'Activated'} ${skill.label}`);
                              }}
                              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-colors ${
                                activeSkills.includes(skill.id) 
                                  ? 'bg-[var(--theme-hover-bg)] text-[var(--theme-primary)]' 
                                  : 'text-[var(--theme-secondary)] hover:bg-[var(--theme-hover-bg)] hover:text-[var(--theme-primary)]'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`p-1.5 rounded-lg transition-colors ${activeSkills.includes(skill.id) ? 'bg-indigo-500/10 text-indigo-500' : 'bg-[var(--theme-hover-bg)] text-[var(--theme-secondary)]'}`}>
                                  {skill.icon}
                                </div>
                                {skill.label}
                              </div>
                              <div className={`w-8 h-4 rounded-full transition-colors relative ${activeSkills.includes(skill.id) ? 'bg-indigo-500' : 'bg-[var(--theme-hover-bg)]'}`}>
                                <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${activeSkills.includes(skill.id) ? 'right-0.5' : 'left-0.5'}`} />
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : activePlusSubMenu === 'style' ? (
                      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
                        <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--theme-border)] mb-1 shrink-0">
                          <button 
                            onClick={() => setActivePlusSubMenu('main')}
                            className="p-1 hover:bg-[var(--theme-hover-bg)] rounded-lg text-[var(--theme-secondary)] hover:text-[var(--theme-primary)] transition-colors"
                          >
                            <ChevronLeft size={16} />
                          </button>
                          <span className="text-[10px] font-bold text-[var(--theme-secondary)] uppercase tracking-widest">Writing Style</span>
                        </div>
                        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-0.5">
                          {WRITING_STYLES.map((style) => (
                            <button
                              key={style.id}
                              onClick={() => {
                                setWritingStyle(style.id);
                                setIsPlusMenuOpen(false);
                                setActivePlusSubMenu('main');
                              }}
                              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-colors ${
                                writingStyle === style.id 
                                  ? 'bg-[var(--theme-hover-bg)] text-[var(--theme-primary)]' 
                                  : 'text-[var(--theme-secondary)] hover:bg-[var(--theme-hover-bg)] hover:text-[var(--theme-primary)]'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`p-1.5 rounded-lg transition-colors ${writingStyle === style.id ? 'bg-blue-500/10 text-blue-500' : 'bg-[var(--theme-hover-bg)] text-[var(--theme-secondary)]'}`}>
                                  {style.icon}
                                </div>
                                {style.label}
                              </div>
                              {writingStyle === style.id && <Check size={14} className="text-blue-500" />}
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
              <div className="relative" ref={modeDropdownRef}>
                <motion.button 
                  whileTap={{ scale: 0.95 }}
                  transition={{ duration: 0.08 }}
                  onClick={() => setIsModeDropdownOpen(!isModeDropdownOpen)}
                  className="flex items-center gap-1.5 px-3 py-2 hover:bg-[var(--theme-hover-bg)] rounded-2xl text-sm font-medium text-[var(--theme-secondary)] hover:text-[var(--theme-primary)] transition-all active:scale-95 cursor-pointer select-none"
                  title="Select Assistant Mode"
                >
                  <div className="shrink-0 flex items-center justify-center">
                    {activeAssistantMode === 'builder' && <Bot size={14} className="text-orange-500 animate-pulse" />}
                    {activeAssistantMode === 'planner' && <Layers size={14} className="text-violet-500" />}
                    {activeAssistantMode === 'debugger' && <Bug size={14} className="text-amber-500" />}
                  </div>
                  <span>
                    {activeAssistantMode === 'builder' ? 'Builder Mode' : activeAssistantMode === 'planner' ? 'Planner Mode' : 'Debugger Mode'}
                  </span>
                  <ChevronDown size={14} className="text-[var(--theme-muted)] transition-transform duration-200" style={{ transform: isModeDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
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
                            id: 'builder',
                            name: 'Builder Mode',
                            icon: <Bot size={13} />,
                            color: 'text-orange-500',
                            bgColor: 'bg-orange-500/10',
                            accentColor: 'bg-orange-500',
                          },
                          {
                            id: 'planner',
                            name: 'Planner Mode',
                            icon: <Layers size={13} />,
                            color: 'text-violet-500',
                            bgColor: 'bg-violet-500/10',
                            accentColor: 'bg-violet-500',
                          },
                          {
                            id: 'debugger',
                            name: 'Debugger Mode',
                            icon: <Bug size={13} />,
                            color: 'text-amber-500',
                            bgColor: 'bg-amber-500/10',
                            accentColor: 'bg-amber-500',
                          }
                        ].map((mode, idx) => {
                          const isActive = activeAssistantMode === mode.id;
                          return (
                            <motion.div
                              key={mode.id}
                              initial={{ opacity: 0, x: -8 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.05, type: 'spring', stiffness: 140 }}
                            >
                              <button
                                onClick={() => {
                                  setActiveAssistantMode(mode.id as any);
                                  setIsModeDropdownOpen(false);
                                  showToast(`Switched focus to ${mode.name}.`);
                                }}
                                className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-left transition-colors relative group/item cursor-pointer text-xs font-semibold ${
                                  isActive 
                                    ? 'bg-[var(--theme-hover-bg)]' 
                                    : 'hover:bg-[var(--theme-hover-bg)] text-[var(--theme-secondary)] hover:text-[var(--theme-primary)]'
                                }`}
                              >
                                <div className={`p-1.5 rounded-lg shrink-0 flex items-center justify-center ${isActive ? mode.color + ' ' + mode.bgColor : 'bg-[var(--theme-hover-bg)] text-[var(--theme-secondary)]'}`}>
                                  {mode.icon}
                                </div>
                                <span className={isActive ? mode.color : 'text-[var(--theme-primary)]'}>{mode.name}</span>
                                {isActive && (
                                  <div className="ml-auto flex items-center gap-1">
                                    <motion.div
                                      animate={{ scale: [1, 1.25, 1], opacity: [0.5, 1, 0.5] }}
                                      transition={{ repeat: Infinity, duration: 1.5 }}
                                      className={`w-1.5 h-1.5 rounded-full ${mode.accentColor}`}
                                    />
                                    <Check size={12} className="text-emerald-500 shrink-0" />
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


          </div>

          <div className="flex items-center gap-3">
            <div className="relative" ref={dropdownRef}>
              <motion.button 
                whileTap={{ scale: 0.95 }}
                transition={{ duration: 0.08 }}
                onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                className="flex items-center gap-1.5 px-3 py-2 hover:bg-[var(--theme-hover-bg)] rounded-2xl text-sm font-medium text-[var(--theme-secondary)] hover:text-[var(--theme-primary)] transition-all active:scale-95"
              >
                <span>{(activeModelList.find(m => m.id === activeModelId)?.name) || 'Select Model'}</span>
                <ChevronDown size={14} className={`transition-transform duration-200 ${isModelDropdownOpen ? 'rotate-180' : ''}`} />
              </motion.button>
              <AnimatePresence>
                {isModelDropdownOpen && (
                  <motion.div
                    ref={modelDropdownContentRef}
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    style={modelDropdownPosition.style}
                    className="fixed w-[269px] bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-2xl shadow-2xl z-[180] flex flex-col overflow-hidden text-left"
                  >
                    {availableModels.length > 5 && (
                      <div className="px-3 py-2 bg-[var(--theme-surface)] border-b border-[var(--theme-border)] shrink-0">
                        <div className="relative group">
                          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--theme-muted)]" />
                          <input 
                            type="text"
                            placeholder="Search models..."
                            value={modelSearchQuery}
                            onChange={(e) => setModelSearchQuery(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full h-8 pl-8 pr-3 bg-[var(--theme-hover-bg)] border border-[var(--theme-border)] rounded-xl text-[11px] outline-none placeholder-gray-600 text-[var(--theme-primary)]"
                          />
                        </div>
                      </div>
                    )}
                    <div className="h-[220px] overflow-y-auto p-1.5 space-y-0.5 custom-scrollbar shrink-0">
                      {activeModelList
                        .filter(m => m.name.toLowerCase().includes(modelSearchQuery.toLowerCase()))
                        .map((model) => (
                          <button
                            key={model.id}
                            onClick={() => {
                              setActiveModelId(model.id);
                              setIsModelDropdownOpen(false);
                              setModelSearchQuery('');
                            }}
                            className={`w-full h-[36px] flex items-center gap-3 px-3 rounded-xl text-xs font-medium transition-colors shrink-0 ${
                              activeModelId === model.id 
                                ? 'bg-[var(--theme-hover-bg)] text-[var(--theme-primary)] font-bold' 
                                : 'text-[var(--theme-secondary)] hover:bg-[var(--theme-hover-bg)] hover:text-[var(--theme-primary)]'
                            }`}
                          >
                            <div className={model.color || ''}>
                              {model.icon}
                            </div>
                            <div className="flex-1 text-left truncate">{model.name}</div>
                            {activeModelId === model.id && <Check size={12} className="text-[var(--theme-accent)] shrink-0" />}
                          </button>
                        ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={() => {
                const nextOpenState = !showVoiceControlPanel;
                setShowVoiceControlPanel(nextOpenState);
                if (isVoiceListening) {
                  stopVoiceDictation();
                } else if (nextOpenState) {
                  // Pre-start speech recognition automatically when panel opens for a frictionless UI!
                  startVoiceDictation();
                }
              }}
              className={`p-2 rounded-2xl transition-all cursor-pointer mr-0.5 flex items-center justify-center shrink-0 border ${
                isVoiceListening 
                  ? 'bg-red-500/10 text-red-500 border-red-500/30 shadow-sm shadow-red-500/10 animate-pulse' 
                  : showVoiceControlPanel
                    ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                    : 'text-[var(--theme-secondary)] hover:text-[var(--theme-primary)] hover:bg-[var(--theme-hover-bg)] border-transparent'
              }`}
              title="Advanced Speech Transcription"
            >
              {isVoiceListening ? (
                <MicOff size={18} className="text-red-500 animate-pulse" />
              ) : (
                <Mic size={18} className={showVoiceControlPanel ? 'text-blue-400' : 'text-zinc-500 hover:text-zinc-300 transition-colors'} />
              )}
            </motion.button>



            {isTyping ? (
              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={() => {
                  setIsTyping(false);
                  if (abortControllerRef.current) {
                    abortControllerRef.current.abort();
                  }
                }}
                className="w-10 h-10 rounded-2xl bg-[var(--theme-hover-bg)] border border-[var(--theme-border)] flex items-center justify-center text-[var(--theme-primary)] transition-all active:scale-95"
              >
                <StopCircle size={20} fill="currentColor" />
              </motion.button>
            ) : (
              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={() => handleSend()}
                disabled={!input.trim() && attachedFiles.length === 0 && attachedUrlDocs.length === 0}
                className={`
                  w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-sm cursor-pointer
                  ${input.trim() || attachedFiles.length > 0 || attachedUrlDocs.length > 0
                    ? 'bg-[var(--theme-accent)] text-white hover:scale-105 active:scale-95'
                    : 'bg-[var(--theme-hover-bg)] text-[var(--theme-muted)]'
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
            e.target.value = '';
          }}
        />
      </div>
    </div>
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
                chats={chats} 
                currentChatId={currentChatId} 
                setCurrentChatId={(id) => {
                  setCurrentChatId(id);
                  setActiveAgent(null);
                  setIsMobileMenuOpen(false);
                }} 
                createNewChat={createNewChat} 
                setChats={setChats}
                onSelect={() => setIsMobileMenuOpen(false)}
                onOpenSettings={() => {
                  setIsSettingsOpen(true);
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
          <SidebarContent 
            chats={chats} 
            currentChatId={currentChatId} 
            setCurrentChatId={(id) => {
              setCurrentChatId(id);
              setActiveAgent(null);
            }} 
            createNewChat={createNewChat} 
            setChats={setChats}
            onOpenSettings={() => setIsSettingsOpen(true)}
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
          />
        ) : (
          <>

        {!isCoderMode && (
          <header className={`h-14 border-b border-[var(--theme-border)]/40 flex items-center justify-between px-4 md:px-6 bg-[var(--theme-bg)]/80 backdrop-blur-md transition-all duration-300 ease-in-out ${
            autoHideTopBar 
              ? 'absolute top-0 left-0 right-0 z-[160] transform -translate-y-[48px] hover:translate-y-0 opacity-0 hover:opacity-100 hover:shadow-lg' 
              : 'sticky top-0 z-[150] shrink-0 opacity-100 shadow-none'
          }`}>
            <div className="flex items-center gap-2">
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
                          if (currentChatId) {
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
                        { id: 'settings', label: 'Settings', icon: <Settings size={16} />, onClick: () => { setIsSettingsOpen(true); setIsHeaderMenuOpen(false); } },
                        { id: 'mcp', label: 'Bridge Tools', icon: <HardDrive size={16} className={isMcpConnected ? 'text-blue-500' : ''} />, onClick: () => { setActiveSettingsTab('mcp'); setIsSettingsOpen(true); setIsHeaderMenuOpen(false); } },
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

        {isCoderMode ? (
          <div className="flex-1 flex overflow-hidden bg-[#0A0908] text-[#EDE6DD] h-full relative font-sans">
            {/* LEFT PANEL: File Explorer (VS Code Styled collapsible sidebar) */}
            <AnimatePresence>
              {isCoderLeftPanelOpen && (
                <motion.div
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 280, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.22, ease: 'easeOut' }}
                  className="h-full border-r border-[#221B17] bg-[#110E0D] flex flex-col overflow-hidden shrink-0 z-10 shadow-xl"
                >
                  <CoderLeftExplorer 
                    workspaceRefreshKey={workspaceRefreshKey}
                    triggerWorkspaceRefresh={triggerWorkspaceRefresh}
                    showToast={showToast}
                    workspaceRootPath={coderWorkspacePath}
                    onWorkspaceRootPathChange={setCoderWorkspacePath}
                    onSelectFile={(filePath) => {
                      setFloatingEditFile(filePath);
                      const rel = filePath.replace(/\\/g, '/').split('coder/').pop() || '';
                      if (rel) {
                        setRightPreviewSubpath(rel);
                      }
                    }}
                    fileAttributions={orchestrationState.isActive ? orchestrationState.agents.flatMap(a =>
                      a.filesCreated.map(fp => ({
                        relativePath: fp.replace(/\\/g, '/'),
                        agentId: a.id,
                        status: a.status === 'done' ? 'done' as const : a.status === 'needs_review' ? 'needs_review' as const : 'pending' as const
                      }))
                    ) : undefined}
                    onClose={() => setIsCoderLeftPanelOpen(false)}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* CENTER PANEL: Standard & customized Coder chat and text layout */}
            <div className="flex-1 flex flex-col overflow-hidden h-full relative bg-[#0A0908]">
              
              {/* Coder Top Navigation Bar */}
              <div className="h-12 border-b border-[#2C241E] px-4 flex items-center justify-between shrink-0 bg-[#151211] backdrop-blur-md relative z-[150]" style={{ backgroundColor: '#151211' }}>
                <div className="flex items-center gap-3">
                  {/* Coder Panel Toggles */}
                  <div className="flex items-center gap-2 border-r border-[#261E1A] pr-3 mr-1 select-none">
                    <button
                      onClick={() => setIsCoderLeftPanelOpen(!isCoderLeftPanelOpen)}
                      className={`p-2 rounded-lg border transition-all cursor-pointer flex items-center justify-center ${
                        isCoderLeftPanelOpen 
                          ? 'bg-[#D97756]/15 text-[#D97756] border-[#D97756]/40 shadow-inner scale-95' 
                          : 'bg-[#0E0C0B]/40 border-[#2C241E] text-[#9B8C7D] hover:text-[#EDE6DD] hover:bg-[#1D1917] hover:border-[#2C241E]'
                      }`}
                      title="Toggle Workspace Files Left Sidebar"
                    >
                      <SidebarIcon size={14} />
                    </button>

                    <button
                      onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                      className={`p-2 rounded-lg border transition-all cursor-pointer flex items-center justify-center ${
                        isSidebarOpen 
                          ? 'bg-[#D97756]/15 text-[#D97756] border-[#D97756]/40 shadow-inner scale-95' 
                          : 'bg-[#0E0C0B]/40 border-[#2C241E] text-[#9B8C7D] hover:text-[#EDE6DD] hover:bg-[#1D1917] hover:border-[#2C241E]'
                      }`}
                      title={isSidebarOpen ? "Collapse AI Chat Assistant Panel" : "Expand AI Chat Assistant Panel"}
                    >
                      <Sparkles size={14} className={isSidebarOpen ? 'animate-pulse text-[#D97756]' : ''} />
                    </button>
                  </div>

                  {/* Back and Forward navigation controls as requested in mockup */}
                  <div className="flex items-center gap-1.5 select-none">
                    <button className="p-1 text-[#AD9F91] hover:text-white transition-colors cursor-pointer" title="Go Back">
                      <ChevronLeft size={16} />
                    </button>
                    <button className="p-1 text-[#AD9F91] hover:text-white transition-colors cursor-pointer" title="Go Forward">
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>

                {/* Center instance indicator */}
                <div className="text-[11px] font-mono font-semibold tracking-wide text-zinc-500 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse"></span>
                  <span>CODER WORKSPACE ACTIVE</span>
                </div>

                {/* Right side live preview panel toggle */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsWhiteboardOpen(!isWhiteboardOpen)}
                    className={`p-2 rounded-lg border transition-all cursor-pointer flex items-center justify-center ${
                      isWhiteboardOpen 
                        ? 'bg-[#D97756]/15 text-[#D97756] border-[#D97756]/40 shadow-inner scale-95' 
                        : 'bg-[#0E0C0B]/40 border-[#2C241E] text-[#9B8C7D] hover:text-[#EDE6DD] hover:bg-[#1D1917] hover:border-[#2C241E]'
                    }`}
                    title={isWhiteboardOpen ? "Collapse Whiteboard Panel" : "Expand Whiteboard Panel"}
                  >
                    <Palette size={14} className={isWhiteboardOpen ? 'text-[#D97756]' : ''} />
                  </button>

                  <button
                    onClick={() => setIsTerminalOpen(!isTerminalOpen)}
                    className={`p-2 rounded-lg border transition-all cursor-pointer flex items-center justify-center ${
                      isTerminalOpen 
                        ? 'bg-[#D97756]/15 text-[#D97756] border-[#D97756]/40 shadow-inner scale-95' 
                        : 'bg-[#0E0C0B]/40 border-[#2C241E] text-[#9B8C7D] hover:text-[#EDE6DD] hover:bg-[#1D1917] hover:border-[#2C241E]'
                    }`}
                    title={isTerminalOpen ? "Collapse Terminal Panel" : "Expand Terminal Panel"}
                  >
                    <Terminal size={14} className={isTerminalOpen ? 'text-[#D97756]' : ''} />
                  </button>

                  <button
                    onClick={() => setIsTerminalPopupOpen(!isTerminalPopupOpen)}
                    className={`p-2 rounded-lg border transition-all cursor-pointer flex items-center justify-center ${
                      isTerminalPopupOpen 
                        ? 'bg-[#D97756]/15 text-[#D97756] border-[#D97756]/40 shadow-inner scale-95' 
                        : 'bg-[#0E0C0B]/40 border-[#2C241E] text-[#9B8C7D] hover:text-[#EDE6DD] hover:bg-[#1D1917] hover:border-[#2C241E]'
                    }`}
                    title={isTerminalPopupOpen ? "Close Terminal Popup" : "Open Terminal Popup Panel"}
                  >
                    <SquareTerminal size={14} className={isTerminalPopupOpen ? 'text-[#D97756]' : ''} />
                  </button>

                  <button
                    onClick={() => setIsCoderRightPanelOpen(!isCoderRightPanelOpen)}
                    className={`p-2 rounded-lg border transition-all cursor-pointer flex items-center justify-center ${
                      isCoderRightPanelOpen 
                        ? 'bg-[#D97756]/15 text-[#D97756] border-[#D97756]/40 shadow-inner scale-95' 
                        : 'bg-[#0E0C0B]/40 border-[#2C241E] text-[#9B8C7D] hover:text-[#EDE6DD] hover:bg-[#1D1917] hover:border-[#2C241E]'
                    }`}
                    title={isCoderRightPanelOpen ? "Collapse App Live Preview" : "Expand App Live Preview"}
                  >
                    <Play size={14} className={isCoderRightPanelOpen ? 'animate-pulse text-[#D97756]' : ''} />
                  </button>
                </div>
              </div>

              {/* Chat View, Centered Watermarked / Mockup Interface */}
              <div className="flex-1 flex flex-col overflow-hidden relative bg-[#131210]" style={{ backgroundColor: '#131210' }}>
                <div 
                  ref={scrollRef}
                  className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar scroll-smooth"
                  style={{ backgroundColor: '#131210' }}
                >
                  <div className="mx-auto space-y-6 pb-6 max-w-4xl xl:max-w-[1100px]">
                    {messages.length === 0 ? (
                      <div className="min-h-[50vh] flex flex-col items-center justify-center text-center px-4 relative w-full animate-fade-in animate-duration-300">
                        <p className="text-[#9B8C7D] max-w-sm mb-6 text-sm">
                          Lumina Coder Workspace. Describe a component to build, or run instructions below.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {messages.map((message) => (
                          <MessageItem
                            key={message.id}
                            message={message}
                            markdownComponents={markdownComponents}
                            userProfile={userProfile}
                            persona={persona}
                            isSourcesPanelOpen={false}
                            setIsSourcesPanelOpen={() => {}}
                            setSourcesPanelMessageId={() => {}}
                            setActiveArtifact={handleSetActiveArtifact}
                            setIsCanvasOpen={() => {}}
                            setCanvasView={handleSetCanvasView}
                            onOpenInEditor={setFloatingEditFile}
                            showToast={showToast}
                            onUpdateTodoPlan={handleUpdateTodoPlan}
                            onStartBuilding={handleStartBuildingBtn}
                            scrapingResults={scrapingResults}
                            wikiResults={wikiResults}
                            onSendMessage={handleSend}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="px-6 pb-6 pt-2 z-30 shrink-0 bg-transparent border-transparent">
                  <div className={`mx-auto relative transition-all duration-300 ${
                    messages.length === 0 
                      ? 'max-w-xl md:max-w-2xl' 
                      : 'max-w-4xl xl:max-w-[1100px]'
                  }`}>
                    {renderChatBox(messages.length === 0)}
                  </div>
                </div>
              </div>

              {/* Collapsible Integrated Terminal */}
              <AnimatePresence>
                {isTerminalOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 280, opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22, ease: 'easeOut' }}
                    className="h-[280px] border-t border-[#2C241E] bg-[#030302] flex flex-col overflow-hidden shrink-0 z-20"
                  >
                    {/* Header */}
                    <div className="h-8 bg-[#0F0D0C] border-b border-[#2C241E] px-4 flex items-center justify-between shrink-0 select-none">
                      <div className="flex items-center gap-2">
                        <Terminal size={12} className="text-[#D97756]" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#D97756]">Developer Shell Terminal</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setIsTerminalPopupOpen(true);
                            setIsTerminalOpen(false);
                          }}
                          className="p-1 hover:bg-[#201916] rounded text-[#AD9F91] hover:text-[#EDE6DD] transition-all cursor-pointer"
                          title="Pop Out Terminal to Popup Panel"
                        >
                          <Maximize2 size={11} />
                        </button>
                        <button
                          onClick={() => setElizaToggleSignal(s => s + 1)}
                          className={`p-1 rounded transition-all cursor-pointer border ${
                            isElizaActive
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20'
                              : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20 hover:bg-indigo-500/20 hover:text-white'
                          }`}
                          title={isElizaActive ? "Exit ELIZA Psychotherapist CLI" : "Launch ELIZA Psychotherapist CLI"}
                        >
                          <Bot size={11} className={isElizaActive ? "animate-bounce text-pink-400" : ""} />
                        </button>
                        <button
                          onClick={() => {
                            setWorkspaceRefreshKey(k => k + 1);
                          }}
                          className="p-1 hover:bg-[#201916] rounded text-[#AD9F91] hover:text-[#EDE6DD] transition-all cursor-pointer"
                          title="Refresh Filesystem State"
                        >
                          <RefreshCw size={11} />
                        </button>
                        <button 
                          onClick={() => setIsTerminalOpen(false)}
                          className="p-1 hover:bg-[#201916] rounded text-[#7F7469] hover:text-[#EDE6DD] transition-all cursor-pointer"
                          title="Close Terminal Console"
                        >
                          <X size={11} />
                        </button>
                      </div>
                    </div>
                    {/* Terminal Console Component */}
                    <div className="flex-1 min-h-0">
                      <TerminalConsole 
                        onToast={showToast} 
                        triggerRefresh={() => setWorkspaceRefreshKey(k => k + 1)}
                        onElizaActiveChange={(active) => setIsElizaActive(active)}
                        elizaToggleSignal={elizaToggleSignal}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* RIGHT PANEL: Live App Preview Frame (collapsible sidebar) */}
            <AnimatePresence>
              {isCoderRightPanelOpen && (
                <motion.div
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ 
                    width: rightViewportMode === 'desktop' ? 480 : rightViewportMode === 'tablet' ? 820 : 440, 
                    opacity: 1 
                  }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.22, ease: 'easeOut' }}
                  className="h-full border-l border-[#1e1e22] bg-[#141416] flex flex-col overflow-hidden shrink-0 z-10 shadow-2xl transition-all duration-300"
                >
                  {/* Top Header & Viewport Selector Bar */}
                  <div className="shrink-0">
                    <div className="flex items-center justify-between px-3.5 py-2 bg-zinc-950 border-b border-zinc-900/80 select-none">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span className="text-xs font-bold uppercase tracking-wider text-zinc-350 mr-1">Preview</span>
                        {projectFramework && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-500/15 text-teal-400 font-mono border border-teal-500/20">{projectFramework}</span>
                        )}
                        {projectType && !projectFramework && projectType !== 'unknown' && projectType !== 'empty' && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono border border-zinc-700/50">{projectType}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button 
                          onClick={() => setIframeKey(k => k + 1)}
                          className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition-all cursor-pointer"
                          title="Force reload preview frame"
                        >
                          <RefreshCw size={12} />
                        </button>
                        <button 
                          onClick={() => setIsCoderRightPanelOpen(false)}
                          className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition-all cursor-pointer"
                          title="Close App Live Preview"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    </div>
                    {projectType && ['vite', 'next', 'react', 'node'].includes(projectType) && (
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-950/80 border-b border-zinc-900/40">
                        <span className="text-[10px] text-zinc-500 font-mono whitespace-nowrap">Dev URL:</span>
                        <input
                          type="text"
                          value={devServerUrl}
                          onChange={e => setDevServerUrl(e.target.value)}
                          placeholder="http://localhost:5173"
                          className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-[11px] font-mono text-zinc-300 placeholder-zinc-600 outline-none focus:border-teal-500/40 transition-colors"
                        />
                        {devServerUrl && (
                          <button
                            onClick={() => setIframeKey(k => k + 1)}
                            className="text-[10px] px-2 py-1 rounded bg-teal-500/10 text-teal-400 border border-teal-500/20 hover:bg-teal-500/20 transition-all cursor-pointer font-mono"
                          >
                            Go
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Viewport controls bar */}
                  <div className="flex items-center gap-1 px-3 py-1.5 bg-zinc-950 border-b border-zinc-900/80 shrink-0">
                    <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-0.5">
                      <button
                        onClick={() => setRightViewportMode('desktop')}
                        className={`p-1 rounded-md transition-all cursor-pointer ${
                          rightViewportMode === 'desktop'
                            ? 'bg-[#D97756]/20 border border-[#D97756]/30 text-[#D97756]'
                            : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                        }`}
                        title="Desktop View"
                      >
                        <Monitor size={10} />
                      </button>
                      <button
                        onClick={() => setRightViewportMode('tablet')}
                        className={`p-1 rounded-md transition-all cursor-pointer ${
                          rightViewportMode === 'tablet'
                            ? 'bg-[#D97756]/20 border border-[#D97756]/30 text-[#D97756]'
                            : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                        }`}
                        title="Tablet View (768px Width)"
                      >
                        <Tablet size={10} />
                      </button>
                      <button
                        onClick={() => setRightViewportMode('mobile')}
                        className={`p-1 rounded-md transition-all cursor-pointer ${
                          rightViewportMode === 'mobile'
                            ? 'bg-[#D97756]/20 border border-[#D97756]/30 text-[#D97756]'
                            : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                        }`}
                        title="Mobile View (390px Width)"
                      >
                        <Smartphone size={10} />
                      </button>

                      <div className="w-[1px] h-3 bg-zinc-800 mx-1" />

                      <button
                        onClick={() => setRightIsGridEnabled(!rightIsGridEnabled)}
                        className={`p-1 rounded-md transition-all cursor-pointer ${
                          rightIsGridEnabled
                            ? 'bg-[#D97756]/20 border border-[#D97756]/30 text-[#D97756]'
                            : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                        }`}
                        title="Toggle Measurement Grid Overlay"
                      >
                        <Grid size={10} />
                      </button>

                      <button
                        onClick={() => setRightIsInspectMode(!rightIsInspectMode)}
                        className={`p-1 rounded-md transition-all cursor-pointer ${
                          rightIsInspectMode
                            ? 'bg-teal-500/10 border border-teal-500/30 text-teal-400 animate-pulse'
                            : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                        }`}
                        title="Inspect & Select Element from Live Preview"
                      >
                        <MousePointerClick size={10} className={rightIsInspectMode ? "text-teal-400" : ""} />
                      </button>
                    </div>
                  </div>

                  {/* Frame Container */}
                  <div className="flex-1 overflow-auto flex items-center justify-center p-4 bg-[#070606] relative">
                    {rightIsGridEnabled && (
                      <div 
                        className="absolute inset-0 pointer-events-none z-10 opacity-30" 
                        style={{
                          backgroundImage: 'radial-gradient(rgba(217, 119, 86, 0.25) 1px, transparent 1px)',
                          backgroundSize: '16px 16px'
                        }}
                      />
                    )}

                    <div 
                      style={{
                        width: rightViewportMode === 'mobile' ? '390px' : rightViewportMode === 'tablet' ? '768px' : '100%',
                        height: rightViewportMode === 'desktop' ? '100%' : '640px',
                        transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)'
                      }}
                      className={`relative bg-white shadow-2xl overflow-hidden ${
                        rightViewportMode !== 'desktop' ? 'rounded-2xl border-4 border-[#1D1917]' : 'w-full h-full'
                      }`}
                    >
                      {devServerUrl ? (
                        <iframe
                          ref={rightIframeRef}
                          key={iframeKey}
                          src={devServerUrl}
                          className="w-full h-full border-none bg-white"
                          referrerPolicy="no-referrer"
                          title="Workspace App Preview"
                        />
                      ) : isRightPreviewStarting ? (
                        <div className="w-full h-full bg-[#0A0808] flex flex-col items-center justify-center gap-3 text-zinc-500 p-6">
                          <RefreshCw size={18} className="animate-spin text-[#D97756]" />
                          <span className="text-sm font-medium text-zinc-400">Starting preview</span>
                          <div className="max-w-md w-full rounded-lg border border-zinc-800 bg-black/30 p-3 text-left">
                            {(rightPreviewLogs.length ? rightPreviewLogs.slice(-5) : ['Detecting project']).map((log, idx) => (
                              <div key={idx} className="truncate text-[10px] font-mono text-zinc-500">&gt; {log}</div>
                            ))}
                          </div>
                        </div>
                      ) : rightPreviewError ? (
                        <div className="w-full h-full bg-[#0A0808] flex flex-col items-center justify-center gap-3 text-zinc-500 p-6">
                          <span className="text-sm font-medium text-red-400">Preview could not start</span>
                          <span className="max-w-md text-center text-xs text-zinc-600">{rightPreviewError}</span>
                          <button
                            onClick={startCoderPreview}
                            className="mt-2 rounded-lg border border-[#D97756]/30 bg-[#D97756]/10 px-3 py-1.5 text-xs font-semibold text-[#D97756] hover:bg-[#D97756]/20"
                          >
                            Retry
                          </button>
                        </div>
                      ) : (
                        <div className="w-full h-full bg-[#0A0808] flex flex-col items-center justify-center gap-3 text-zinc-500">
                          <div className="w-12 h-12 rounded-xl border border-zinc-800 bg-zinc-900/50 flex items-center justify-center">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6 text-zinc-600">
                              <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                              <path d="M8 21h8"/>
                              <path d="M12 17v4"/>
                            </svg>
                          </div>
                          <span className="text-sm font-medium text-zinc-600">No preview running</span>
                          <button
                            onClick={startCoderPreview}
                            className="text-xs text-[#D97756] hover:underline"
                          >
                            Start workspace preview
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Floating manual code editor */}
            {floatingEditFile && (
              <FloatingCodeEditor 
                filePath={floatingEditFile}
                onClose={() => setFloatingEditFile(null)}
                showToast={showToast}
                triggerWorkspaceRefresh={triggerWorkspaceRefresh}
              />
            )}

            {/* Floating manual terminal popup panel */}
            <AnimatePresence>
              {isTerminalPopupOpen && (
                <div className="fixed inset-0 bg-[#0F0D0C]/85 backdrop-blur-md flex items-center justify-center z-[200] p-4 md:p-6 select-none animate-fade-in animate-duration-200">
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.96, y: 16 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, y: 16 }}
                    transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                    className="w-full max-w-4xl h-[78vh] bg-[#141211] border border-[#2D241E] rounded-2xl flex flex-col overflow-hidden shadow-[0_32px_80px_rgba(10,8,7,0.85)] relative font-sans"
                  >
                    {/* Soft ambient glow backing */}
                    <div className="absolute top-0 left-0 w-64 h-64 bg-[#D97756]/5 rounded-full blur-[70px] pointer-events-none" />
                    <div className="absolute bottom-0 right-0 w-64 h-64 bg-teal-500/3 rounded-full blur-[70px] pointer-events-none" />

                    {/* Header */}
                    <div className="h-14 border-b border-[#2C241E] bg-[#1F1917]/95 px-5 flex items-center justify-between shrink-0 relative z-10 select-none backdrop-blur-sm">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-[#D97756]/15 text-[#D97756] border border-[#D97756]/20">
                          <SquareTerminal size={16} />
                        </div>
                        <div className="flex flex-col text-left">
                          <span className="text-xs font-bold text-[#EDE6DD] tracking-wider uppercase font-sans">
                            Interactive Developer Shell
                          </span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
                            <span className="text-[10px] font-mono text-[#AD9F91]">
                              Terminal Popup Mode
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setElizaToggleSignal(s => s + 1)}
                          className={`p-2 border rounded-lg transition-all cursor-pointer flex items-center justify-center ${
                            isElizaActive
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20'
                              : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20 hover:bg-indigo-500/20 hover:text-white'
                          }`}
                          title={isElizaActive ? "Exit ELIZA Psychotherapist CLI" : "Launch ELIZA Psychotherapist CLI"}
                        >
                          <Bot size={12} className={isElizaActive ? "animate-bounce text-pink-400" : ""} />
                        </button>

                        <button
                          onClick={() => setWorkspaceRefreshKey(k => k + 1)}
                          className="p-2 border border-[#2D241E] bg-[#1C1816]/40 text-[#AD9F91] hover:text-white rounded-lg transition-all cursor-pointer flex items-center gap-1.5 text-xs font-medium"
                          title="Refresh Filesystem State"
                        >
                          <RefreshCw size={12} />
                          <span className="text-[10px] font-semibold">Sync</span>
                        </button>

                        <button
                          onClick={() => setIsTerminalPopupOpen(false)}
                          className="p-2 hover:bg-[#2A2420] border border-[#2F2722] bg-[#1C1816]/50 rounded-lg text-[#AD9F91] hover:text-white transition-all cursor-pointer"
                          title="Close Terminal Popup"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Interactive Terminal TerminalConsole */}
                    <div className="flex-1 min-h-0 bg-[#060505]">
                      <TerminalConsole 
                        onToast={showToast} 
                        triggerRefresh={() => setWorkspaceRefreshKey(k => k + 1)}
                        onElizaActiveChange={(active) => setIsElizaActive(active)}
                        elizaToggleSignal={elizaToggleSignal}
                      />
                    </div>

                    {/* Footer Info Bar */}
                    <div className="h-9 border-t border-[#2C241E] bg-[#0F0E0D] px-5 flex items-center justify-between text-[10px] text-[#7F7469] font-mono shrink-0 select-none">
                      <span>Server Terminal environment: Active on port 3000</span>
                      <span>Press ESC or click outside to dismiss</span>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {/* Floating manual Whiteboard popup panel */}
            <AnimatePresence>
              {isWhiteboardOpen && (
                <div className="fixed inset-0 bg-[#0F0D0C]/85 backdrop-blur-md flex items-center justify-center z-[202] p-4 md:p-6 select-none animate-fade-in animate-duration-200">
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.96, y: 16 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, y: 16 }}
                    transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                    className="w-full max-w-5xl h-[82vh] bg-[#141211] border border-[#2D241E] rounded-2xl flex flex-col overflow-hidden shadow-[0_32px_80px_rgba(10,8,7,0.85)] relative font-sans"
                  >
                    {/* Soft ambient glow backing */}
                    <div className="absolute top-0 left-0 w-64 h-64 bg-[#D97756]/5 rounded-full blur-[70px] pointer-events-none" />
                    <div className="absolute bottom-0 right-0 w-64 h-64 bg-teal-500/3 rounded-full blur-[70px] pointer-events-none" />

                    {/* Header */}
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
                              Whiteboard Popup Mode
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

                    {/* Collaborative Whiteboard canvas */}
                    <div className="flex-1 min-h-0 bg-[#141211]">
                      <Whiteboard />
                    </div>

                    {/* Footer Info Bar */}
                    <div className="h-9 border-t border-[#2C241E] bg-[#0F0E0D] px-5 flex items-center justify-between text-[10px] text-[#7F7469] font-mono shrink-0 select-none">
                      <span>Interactive vector drawing platform</span>
                      <span>Press ESC or click outside to dismiss</span>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <>
            {isSettingsOpen ? (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                className="flex-1 flex overflow-hidden relative w-full h-full bg-[var(--theme-surface)]"
              >
                <SettingsModal
                  onClose={() => setIsSettingsOpen(false)}
                  activeSettingsTab={activeSettingsTab}
                  setActiveSettingsTab={setActiveSettingsTab}
                  useBubbles={useBubbles}
                  setUseBubbles={setUseBubbles}
                  isCompactSidebar={isCompactSidebar}
                  setIsCompactSidebar={setIsCompactSidebar}
                  autoHideTopBar={autoHideTopBar}
                  setAutoHideTopBar={setAutoHideTopBar}
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
              </motion.div>
            ) : showAgentCreation ? (
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
                          setIsSourcesPanelOpen={() => {}}
                          setSourcesPanelMessageId={() => {}}
                          setActiveArtifact={handleSetActiveArtifact}
                          setIsCanvasOpen={handleSetIsCanvasOpen}
                          setCanvasView={handleSetCanvasView}
                          onOpenInEditor={setFloatingEditFile}
                          showToast={showToast}
                          onUpdateTodoPlan={handleUpdateTodoPlan}
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
          </>
        )}
  </main>
      </div>

      <AnimatePresence>
        {false && isSettingsOpen && (
          <SettingsModal
            onClose={() => setIsSettingsOpen(false)}
            activeSettingsTab={activeSettingsTab}
            setActiveSettingsTab={setActiveSettingsTab}
            useBubbles={useBubbles}
            setUseBubbles={setUseBubbles}
            isCompactSidebar={isCompactSidebar}
            setIsCompactSidebar={setIsCompactSidebar}
            autoHideTopBar={autoHideTopBar}
            setAutoHideTopBar={setAutoHideTopBar}
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

      <div style={{ display: 'none' }}>
        {/* Hidden fallback wrapper */}
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

                            {/* Simple text lists for matching providers to avoid bulkiness */}
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
                              onChange={(e) => { setServerUrl(e.target.value); setIsAiSaved(false); setSelectedProvider('custom'); }}
                              placeholder="http://localhost:8080/v1"
                              className="w-full h-11 px-4 text-sm bg-gray-50 dark:bg-zinc-950 border border-gray-100 dark:border-white/5 rounded-xl focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[11px] font-medium text-gray-500">API Key</label>
                            <input 
                              type="password" 
                              value={apiKey}
                              onChange={(e) => { setApiKey(e.target.value); setIsAiSaved(false); }}
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
                                onClick={() => { setSearchProvider('tavily'); setIsSearchSaved(false); }}
                                className={`flex-1 h-11 rounded-xl text-sm font-semibold transition-all border ${
                                  searchProvider === 'tavily'
                                    ? 'bg-blue-600 text-white border-blue-600'
                                    : 'bg-gray-50 dark:bg-zinc-900 text-gray-700 dark:text-zinc-300 border-gray-200 dark:border-white/10'
                                }`}
                              >
                                Tavily
                              </button>
                              <button
                                onClick={() => { setSearchProvider('serpapi'); setIsSearchSaved(false); }}
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
                          {searchProvider === 'tavily' ? (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <label className="text-xs font-bold text-gray-500 uppercase">Tavily API Key</label>
                                <a href="https://tavily.com" target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-500 hover:underline">Get Key</a>
                              </div>
                              <input 
                                type="password"
                                value={tavilyApiKey}
                                onChange={(e) => { setTavilyApiKey(e.target.value); setIsSearchSaved(false); }}
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
                                onChange={(e) => { setSerpApiKey(e.target.value); setIsSearchSaved(false); }}
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
                                <span className={`w-2 h-2 rounded-full ${tavilyApiKey && tavilyApiKey.trim() ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                                <span>Tavily {tavilyApiKey?.trim() ? '(Active)' : '(Not configured)'}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${serpApiKey && serpApiKey.trim() ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                                <span>SerpAPI {serpApiKey?.trim() ? '(Active)' : '(Not configured)'}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                <span>DuckDuckGo (Fallback)</span>
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
                            <label className="text-[11px] font-medium text-gray-500">Persona Name</label>
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
                          <div className="p-4 bg-[var(--theme-accent)]/5 border border-[var(--theme-accent)]/10 rounded-2xl">
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

                          <div className="grid grid-cols-1 gap-2 max-h-80 overflow-y-auto custom-scrollbar pr-1">
                            {luminaTools.map(tool => (
                              <div
                                key={tool.id}
                                className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-zinc-950 rounded-xl border border-gray-100 dark:border-white/5"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="p-1.5 rounded-lg bg-[var(--theme-accent)]/10 text-[var(--theme-accent)]">
                                    {tool.icon}
                                  </div>
                                  <div className="text-left truncate">
                                    <div className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">{tool.name}</div>
                                    <div className="text-[10px] text-gray-500 truncate max-w-[200px]">{tool.description}</div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] text-gray-400 font-mono shrink-0">inbuilt</span>
                                  <button
                                    onClick={() => {
                                      setLuminaTools(prev => prev.map(t => t.id === tool.id ? { ...t, enabled: !t.enabled } : t));
                                      showToast(`${tool.enabled ? 'Disabled' : 'Enabled'} ${tool.name}`);
                                    }}
                                    className={`w-8 h-4 rounded-full transition-colors relative ${tool.enabled ? 'bg-[var(--theme-accent)]' : 'bg-[var(--theme-hover-bg)]'}`}
                                  >
                                    <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${tool.enabled ? 'right-0.5' : 'left-0.5'}`} />
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
                                      <span className={"w-1.5 h-1.5 rounded-full " + (tool.enabled ? "bg-emerald-500 animate-pulse" : "bg-gray-400")} />
                                      <span className="text-[10px] text-gray-400 font-mono tracking-wider uppercase">Bridge MCP</span>
                                    </div>
                                    <button
                                      onClick={() => {
                                        setBridgeTools(prev => prev.map(t => t.id === tool.id ? { ...t, enabled: !t.enabled } : t));
                                        showToast((tool.enabled ? 'Disabled' : 'Enabled') + ' ' + tool.name);
                                      }}
                                      className={"w-11 h-6 rounded-full transition-all relative " + (tool.enabled ? "bg-[var(--theme-accent)]" : "bg-gray-200 dark:bg-zinc-800")}
                                    >
                                      <div className={"absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-md " + (tool.enabled ? "right-1" : "left-1")} />
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

                          <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--theme-border)' }}>
                            <div className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest" style={{ background: 'var(--theme-surface)', color: 'var(--theme-secondary)', borderBottom: '1px solid var(--theme-border)' }}>
                              Supported Endpoints
                            </div>
                            <div className="divide-y" style={{ borderColor: 'var(--theme-border)' }}>
                              {[
                                { path: '/health', method: 'GET', desc: 'Server health check' },
                                { path: '/v1/models', method: 'GET', desc: 'List available models' },
                                { path: '/v1/chat/completions', method: 'POST', desc: 'Chat & tool execution' },
                                { path: '/v1/tools', method: 'GET', desc: 'List bridge tools' },
                                { path: '/v1/tools/call', method: 'POST', desc: 'Call a bridge tool' },
                                { path: '/v1/messages', method: 'POST', desc: 'Anthropic-compatible chat' },
                                { path: '/v1/embeddings', method: 'POST', desc: 'Text embeddings' },
                                { path: '/mcp', method: 'POST', desc: 'MCP JSON-RPC endpoint' },
                                { path: '/api/generate', method: 'POST', desc: 'Ollama-compatible generate' },
                                { path: '/api/chat', method: 'POST', desc: 'Ollama-compatible chat' },
                              ].map((ep, i) => (
                                <div key={i} className="flex items-center gap-3 px-4 py-2" style={{ background: i % 2 === 0 ? 'transparent' : 'var(--theme-surface-alt)' }}>
                                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase shrink-0 ${
                                    ep.method === 'GET' ? 'text-emerald-500 bg-emerald-500/10' : 'text-blue-500 bg-blue-500/10'
                                  }`}>{ep.method}</span>
                                  <code className="text-[10px] font-mono" style={{ color: 'var(--theme-primary)' }}>{ep.path}</code>
                                  <span className="text-[10px] ml-auto" style={{ color: 'var(--theme-secondary)' }}>{ep.desc}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="p-4 rounded-xl border" style={{ background: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}>
                            <div className="flex gap-3">
                              <Terminal size={16} className="shrink-0 mt-0.5" style={{ color: 'var(--theme-accent)' }} />
                              <p className="text-xs leading-relaxed" style={{ color: 'var(--theme-secondary)' }}>
                                The Llama Bridge is a universal API gateway that translates between OpenAI, Anthropic, Cohere, Gemini, and Ollama formats. Chat requests go directly to <strong style={{ color: 'var(--theme-primary)' }}>{llamaBridgeUrl}</strong>. Bridge tools are auto-discovered via <code style={{ color: 'var(--theme-accent)' }}>/v1/tools</code>.
                              </p>
                            </div>
                          </div>

                        </div>
                      </div>
                    </motion.div>
                  )}


      </div>

      <div className="fixed top-20 right-6 flex flex-col gap-1.5 items-end z-[9999] pointer-events-none">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 24, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 12, scale: 0.95 }}
              className="px-3 py-1.5 bg-zinc-950/95 border border-white/10 rounded-lg text-[10.5px] font-medium text-white shadow-lg backdrop-blur-md flex items-center gap-2 max-w-sm pointer-events-auto"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
              <span>{toast.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <Canvas 
        artifact={activeArtifact} 
        isOpen={!isCoderMode && isCanvasOpen} 
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
      <AnimatePresence>
        {isDevToolsOpen && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDevToolsOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-4xl h-[600px] bg-zinc-950 text-white rounded-3xl border border-zinc-900 shadow-2xl overflow-hidden flex font-mono"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Left sidebar nav panel */}
              <div className="w-60 border-r border-zinc-900 bg-zinc-950 p-5 flex flex-col justify-between select-none">
                <div>
                  <div className="flex items-center gap-2 px-1 mb-6">
                    <Terminal size={18} className="text-blue-500 animate-pulse" />
                    <div>
                      <h3 className="font-mono text-xs font-bold tracking-widest uppercase text-zinc-100">LUMINA DEBUG</h3>
                      <p className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest mt-0.5">DEV PANEL CORE V1.0</p>
                    </div>
                  </div>
                  
                  <nav className="space-y-1">
                    {[
                      { id: 'status', label: 'System Nodes', icon: <HardDrive size={13} /> },
                      { id: 'console', label: 'Diagnostic Terminal', icon: <SquareTerminal size={13} /> },
                      { id: 'perf', label: 'Telemetry/Perf', icon: <Activity size={13} /> },
                      { id: 'storage', label: 'State & Storage', icon: <Sliders size={13} /> },
                      { id: 'flags', label: 'Feature Toggles', icon: <Wrench size={13} /> },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveDevTab(tab.id as any)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-mono font-medium transition-all cursor-pointer ${
                          activeDevTab === tab.id 
                            ? 'bg-blue-600/15 text-blue-400 border border-blue-500/20 shadow-md' 
                            : 'text-zinc-400 hover:text-zinc-250 hover:bg-zinc-900/40 border border-transparent'
                        }`}
                      >
                        {tab.icon}
                        <span>{tab.label}</span>
                      </button>
                    ))}
                  </nav>
                </div>
                
                {/* dev stats summary footer */}
                <div className="pt-4 border-t border-zinc-900/60">
                  <div className="flex items-center justify-between font-mono text-[10px] text-zinc-500 px-1">
                    <span>Websocket Port</span>
                    <span className="text-emerald-400 font-bold">3000 (IN CLOUD)</span>
                  </div>
                  <div className="flex items-center justify-between font-mono text-[10px] text-zinc-500 px-1 mt-1.5">
                    <span>Active Chats</span>
                    <span className="text-zinc-300 font-bold">{chats.length}</span>
                  </div>
                  <div className="flex items-center justify-between font-mono text-[10px] text-zinc-500 px-1 mt-1.5">
                    <span>Latency Simulation</span>
                    <span className={`${simLatency ? 'text-orange-400' : 'text-zinc-500'} font-bold`}>
                      {simLatency ? '+500ms' : '0ms'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Main Tab Contents Panel Area */}
              <div className="flex-1 flex flex-col min-w-0">
                {/* Header title */}
                <div className="flex items-center justify-between p-5 border-b border-zinc-900 bg-zinc-950/40 z-10 select-none">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-300">
                      {activeDevTab === 'status' && 'System Node Status Map'}
                      {activeDevTab === 'console' && 'Diagnostic Terminal Emulator'}
                      {activeDevTab === 'perf' && 'Real-time Telemetry Graph'}
                      {activeDevTab === 'storage' && 'Runtime Key-Value Storage Inspector'}
                      {activeDevTab === 'flags' && 'Experimental Dev Toggles'}
                    </h2>
                  </div>
                  <button 
                    onClick={() => setIsDevToolsOpen(false)}
                    className="p-1.5 hover:bg-zinc-900 bg-zinc-950 border border-zinc-800 rounded-full transition-all text-zinc-400 hover:text-white cursor-pointer"
                    title="Close Panel"
                  >
                    <X size={14} />
                  </button>
                </div>

                {/* Content Body */}
                <div className="flex-1 overflow-y-auto p-6 bg-zinc-950/20 custom-scrollbar font-mono">
                  
                  {/* TAB 1: STATUS MAP */}
                  {activeDevTab === 'status' && (
                    <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
                      <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                        Dynamic routing diagram linking AI models, interface nodes, server processes, and databases live in your current preview sandbox.
                      </p>
                      
                      {/* Interactive Diagram UI */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="border border-zinc-900 bg-zinc-900/25 p-4 rounded-2xl">
                          <div className="flex items-center gap-2.5 mb-2">
                            <Bot className="text-blue-400" size={16} />
                            <h4 className="text-xs font-bold text-zinc-200 font-mono">Antigravity Core Model</h4>
                          </div>
                          <div className="text-[10px] space-y-1 text-zinc-400">
                            <div>Provider: <span className="text-zinc-300 font-semibold">{selectedProvider === 'custom' ? 'Custom HTTP proxy' : selectedProvider}</span></div>
                            <div>Endpoint: <span className="text-zinc-300 truncate font-mono block max-w-xs">{serverUrl || 'N/A'}</span></div>
                            <div>State: <span className="text-emerald-400 font-semibold">Ready</span></div>
                          </div>
                        </div>

                        <div className="border border-zinc-900 bg-zinc-900/25 p-4 rounded-2xl">
                          <div className="flex items-center gap-2.5 mb-2">
                            <Code className="text-teal-400" size={16} />
                            <h4 className="text-xs font-bold text-zinc-200 font-mono">Coder Mode Module</h4>
                          </div>
                          <div className="text-[10px] space-y-1 text-zinc-400">
                            <div>State: <span className={isCoderMode ? 'text-teal-400 font-bold' : 'text-zinc-500'}>{isCoderMode ? 'ACTIVE & LOADED' : 'INACTIVE'}</span></div>
                            <div>Left Explorer Panel: <span className={isCoderLeftPanelOpen ? 'text-teal-400' : 'text-zinc-500'}>{isCoderLeftPanelOpen ? 'OPENED' : 'CLOSED'}</span></div>
                            <div>Preview Frame State: <span className={isCoderRightPanelOpen ? 'text-orange-400' : 'text-zinc-500'}>{isCoderRightPanelOpen ? 'RUNNING' : 'COLLAPSED'}</span></div>
                          </div>
                        </div>

                        <div className="border border-zinc-900 bg-zinc-900/25 p-4 rounded-2xl">
                          <div className="flex items-center gap-2.5 mb-2">
                            <Settings className="text-zinc-400 animate-[spin_4s_linear_infinite]" size={16} />
                            <h4 className="text-xs font-bold text-zinc-200 font-mono">Llama Bridge Integrator</h4>
                          </div>
                          <div className="text-[10px] space-y-1 text-zinc-400">
                            <div>Bridge Client Url: <span className="text-zinc-300 truncate block max-w-xs font-mono">http://localhost:11434</span></div>
                            <div>Bridge Connection: <span className={isMcpConnected ? 'text-emerald-400 font-bold' : 'text-orange-400'}>{isMcpConnected ? 'CONNECTED' : 'STANDBY'}</span></div>
                          </div>
                        </div>
                      </div>

                      {/* Diagnostic Status Box */}
                      <div className="border border-zinc-900 bg-zinc-900/30 p-4 rounded-2xl select-text">
                        <h4 className="text-xs font-bold text-zinc-200 mb-3 uppercase tracking-wider">Diagnostic Connections Logs</h4>
                        <div className="space-y-1 text-[10px] text-zinc-500 font-mono">
                          <div>[03:21:15] Checking Port 3000 ingress server... <span className="text-emerald-400">OK</span></div>
                          <div>[03:21:16] Scanning active workspace files... found {workspaceRefreshKey > 0 ? 'modified files cache' : 'fresh directories'}</div>
                          <div>[03:21:17] Loading available theme configurations ... standard Dark/White contrast active.</div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* TAB 2: DIAGNOSTIC TERMINAL / CONSOLE */}
                  {activeDevTab === 'console' && (
                    <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col h-full space-y-4">
                      <div className="flex items-center justify-between text-[11px] text-zinc-400 pb-1.5 border-b border-zinc-905 select-none">
                        <span>Lumina Debug Logger Console stdout Logs</span>
                        <button 
                          onClick={() => setDevLogs([{ timestamp: new Date().toLocaleTimeString(), level: 'system', text: 'Logs cleared.' }])}
                          className="px-2 py-1 text-[10px] bg-zinc-900 border border-zinc-800 rounded hover:bg-zinc-800 text-zinc-300 cursor-pointer"
                        >
                          Clear
                        </button>
                      </div>
                      
                      {/* Virtual terminal screen */}
                      <div className="bg-black/80 border border-zinc-900 rounded-xl p-4 h-60 overflow-y-auto custom-scrollbar font-mono text-xs text-zinc-300 space-y-2 select-text">
                        {devLogs.map((log, index) => (
                          <div key={index} className="flex gap-2 items-start leading-relaxed">
                            <span className="text-zinc-650 shrink-0 select-none">[{log.timestamp}]</span>
                            <span className={`shrink-0 select-none font-bold uppercase text-[9px] px-1.5 py-0.5 rounded ${
                              log.level === 'system' ? 'bg-purple-900/35 text-purple-400' :
                              log.level === 'success' ? 'bg-emerald-900/35 text-emerald-400' :
                              log.level === 'warn' ? 'bg-orange-900/35 text-orange-400' : 'bg-blue-900/35 text-blue-400'
                            }`}>
                              {log.level}
                            </span>
                            <span className="break-all font-mono select-text">{log.text}</span>
                          </div>
                        ))}
                      </div>

                      {/* Terminal prompt input for executing mock command line! */}
                      <div className="border border-zinc-900 bg-zinc-900/25 p-3 rounded-2xl">
                        <p className="text-[10px] text-zinc-400 mb-2 font-mono">Execute diagnostic actions in workspace container:</p>
                        <div className="flex gap-2">
                          <input 
                            type="text"
                            placeholder="Type a debugging instruction (e.g. 'help', 'ping', 'stats', 'trigger-scans', 'logs-test')..."
                            className="flex-1 h-10 px-3 bg-black text-xs border border-zinc-900 rounded-xl text-blue-400 font-mono outline-none focus:border-blue-500"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                const input = (e.target as HTMLInputElement).value.trim();
                                if (!input) return;
                                (e.target as HTMLInputElement).value = '';
                                handleExecMockCommand(input);
                              }
                            }}
                          />
                          <button 
                            onClick={() => {
                              const inputEl = document.querySelector('input[placeholder*="Type a debugging instruction"]') as HTMLInputElement;
                              if (inputEl && inputEl.value.trim()) {
                                handleExecMockCommand(inputEl.value.trim());
                                inputEl.value = '';
                              }
                            }}
                            className="px-4.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold cursor-pointer font-sans"
                          >
                            RUN
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* TAB 3: TELEMETRY & PERF GRAPH */}
                  {activeDevTab === 'perf' && (
                    <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                      <div className="flex items-center justify-between select-none">
                        <p className="text-xs text-zinc-400 font-sans">
                          Real-time canvas-based performance monitor drawing core metrics, render delay, and thread frames.
                        </p>
                        <div className="flex gap-3 text-[10px] bg-zinc-900 border border-zinc-800 rounded-full px-3 py-1 font-semibold text-zinc-400 font-mono">
                          <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>FPS: {simLatency ? '58 stable' : '60 constant'}</span>
                          <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>CPU: ~1.2%</span>
                        </div>
                      </div>

                      {/* Performance Visualizer (Canvas Canvas) */}
                      <div className="border border-zinc-900 bg-zinc-900/25 p-4.5 rounded-2xl relative select-none">
                        <h4 className="text-xs font-bold text-zinc-200 mb-3 flex items-center gap-1.5 font-mono">
                          <Activity size={12} className="text-emerald-500 animate-pulse" />
                          <span>Interactive Telemetry Waveform</span>
                        </h4>
                        
                        <div className="h-44 bg-black/60 border border-zinc-900 rounded-xl overflow-hidden flex items-end p-1 relative">
                          <DevPerfCanvas />
                          <div className="absolute top-3 left-3 flex flex-col gap-1 text-[9px] font-mono text-zinc-500">
                            <div>Memory Limit: 512.0 MB</div>
                            <div>Active Usage: ~41.6 MB (Stable Peak)</div>
                          </div>
                        </div>
                      </div>

                      {/* Resource Heap Info boxes */}
                      <div className="grid grid-cols-2 gap-4 select-none">
                        <div className="border border-zinc-900 bg-zinc-950 p-4 rounded-xl">
                          <span className="text-[10px] text-zinc-500 uppercase block mb-1">Heap Details</span>
                          <span className="text-sm font-bold text-zinc-200">41,617 KB / 524,288 KB</span>
                          <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden mt-3">
                            <div className="bg-emerald-500 h-full rounded-full" style={{ width: '8%' }}></div>
                          </div>
                        </div>

                        <div className="border border-zinc-900 bg-zinc-950 p-4 rounded-xl">
                          <span className="text-[10px] text-zinc-500 uppercase block mb-1">Render Latency delay</span>
                          <span className="text-sm font-bold text-zinc-200">~1.42 ms <span className="text-zinc-500 text-xs font-normal font-sans">avg</span></span>
                          <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden mt-3">
                            <div className="bg-blue-500 h-full rounded-full" style={{ width: '4%' }}></div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* TAB 4: STORAGE / KEY-VALUE INSPECTOR */}
                  {activeDevTab === 'storage' && (
                    <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                      <p className="text-xs text-zinc-400 font-sans leading-relaxed">
                        Read, edit, delete, or inject debugging parameters directly into your sandbox's standard `localStorage` cache storage.
                      </p>

                      <div className="border border-zinc-900 bg-zinc-900/25 rounded-2xl overflow-hidden">
                        <div className="bg-zinc-900/40 px-4.5 py-2.5 border-b border-zinc-900 flex items-center justify-between text-xs text-zinc-300 select-none">
                          <span className="font-bold">LocalStorage Workspace Tree</span>
                          <button 
                            onClick={() => {
                              localStorage.clear();
                              addDevLog('localStorage wiped by developer', 'warn');
                              showToast('System LocalStorage key-value storage wiped completely.');
                            }}
                            className="flex items-center gap-1.5 px-2 py-1 text-[10px] border border-red-500/20 text-red-400 hover:bg-red-500/10 rounded transition-all cursor-pointer font-bold uppercase font-sans"
                          >
                            <Trash2 size={11} />
                            <span>Wipe Storage</span>
                          </button>
                        </div>

                        {/* actual reading from storage */}
                        <div className="p-2 divide-y divide-zinc-900 text-xs">
                          {(() => {
                            const keys = Object.keys(localStorage).filter(k => k.startsWith('lumina_') || k.includes('chat') || k === 'user_profile' || k.includes('settings'));
                            if (keys.length === 0) {
                              return (
                                <p className="text-[11px] text-zinc-500 p-4 italic text-center">
                                  No active local-storage tracking entries detected. Type values or select tabs to initialize keys.
                                </p>
                              );
                            }
                            return keys.map(k => {
                              const val = localStorage.getItem(k) || '';
                              return (
                                <div key={k} className="p-3 select-text flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between group">
                                  <div className="min-w-0 flex-1">
                                    <span className="block font-bold text-blue-400 truncate text-[11px] mb-0.5">{k}</span>
                                    <span className="block font-mono text-zinc-400 text-[10px] break-all max-h-12 overflow-y-auto select-text bg-[#0A0908] px-2 py-1 rounded border border-zinc-900">
                                      {val}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center opacity-80 group-hover:opacity-100 transition-opacity">
                                    <button 
                                      onClick={() => {
                                        const newVal = prompt(`Value for ${k}:`, val);
                                        if (newVal !== null) {
                                          localStorage.setItem(k, newVal);
                                          addDevLog(`Storage updated: ${k}`, 'success');
                                          showToast(`Storage updated: ${k}`);
                                          if (k === 'lumina_compact_sidebar') {
                                            setIsCompactSidebar(newVal === 'true');
                                          } else if (k === 'lumina_use_bubbles') {
                                            setUseBubbles(newVal !== 'false');
                                          } else if (k === 'lumina_auto_hide_top_bar') {
                                            setAutoHideTopBar(newVal === 'true');
                                          }
                                        }
                                      }}
                                      className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded transition-all cursor-pointer border border-zinc-850 bg-zinc-900"
                                      title="Edit Value"
                                    >
                                      <Wrench size={11} />
                                    </button>
                                    <button 
                                      onClick={() => {
                                        if (confirm(`Delete key ${k}?`)) {
                                          localStorage.removeItem(k);
                                          addDevLog(`Storage key deleted: ${k}`, 'warn');
                                          showToast(`Deleted storage key: ${k}`);
                                        }
                                      }}
                                      className="p-1.5 hover:bg-red-950/20 text-red-450 rounded transition-all cursor-pointer border border-zinc-850 bg-zinc-900"
                                      title="Delete Key"
                                    >
                                      <Trash2 size={11} />
                                    </button>
                                  </div>
                                </div>
                              );
                            });
                          })()}
                        </div>
                      </div>

                      {/* Custom Storage Injector */}
                      <div className="border border-zinc-900 bg-zinc-900/25 p-4 rounded-2xl space-y-3">
                        <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-wide">Inject Custom Key-Value</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <input 
                            id="storage-key-input"
                            type="text"
                            placeholder="Key (e.g., lumina_custom_debug)"
                            className="bg-black text-xs border border-zinc-900 rounded-xl h-9.5 px-3 font-mono text-zinc-300 outline-none"
                          />
                          <input 
                            id="storage-val-input"
                            type="text"
                            placeholder="Value (e.g., true)"
                            className="bg-black text-xs border border-zinc-900 rounded-xl h-9.5 px-3 font-mono text-zinc-300 outline-none"
                          />
                        </div>
                        <button 
                          onClick={() => {
                            const keyEl = document.getElementById('storage-key-input') as HTMLInputElement;
                            const valEl = document.getElementById('storage-val-input') as HTMLInputElement;
                            if (keyEl && valEl && keyEl.value.trim() && valEl.value.trim()) {
                              localStorage.setItem(keyEl.value.trim(), valEl.value.trim());
                              addDevLog(`Injected storage key: ${keyEl.value}`, 'success');
                              showToast(`Injected key: ${keyEl.value}`);
                              keyEl.value = '';
                              valEl.value = '';
                            } else {
                              showToast('Please provide both unique key and value.');
                            }
                          }}
                          className="w-full h-9.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-bold text-white transition-all cursor-pointer font-sans"
                        >
                          INJECT INTO STORAGE DB
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* TAB 5: EXPERIMENTAL FLAGS */}
                  {activeDevTab === 'flags' && (
                    <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
                      <p className="text-xs text-zinc-400 font-sans leading-relaxed">
                        Control micro-interactions, simulate slow sandbox models, and experiment with styling overlays in real-time.
                      </p>

                      <div className="space-y-4 select-none">
                        {/* Simulation Latency Toggle */}
                        <div className="flex items-center justify-between p-4 bg-zinc-900/30 border border-zinc-900 rounded-2xl">
                          <div>
                            <div className="font-bold text-xs text-zinc-250 uppercase tracking-wide mb-1 select-none font-mono">Simulate Endpoint Latency</div>
                            <div className="text-[10px] text-zinc-400 font-sans leading-relaxed">Apply +500ms delay to mock network API calls</div>
                          </div>
                          <button 
                            onClick={() => {
                              const next = !simLatency;
                              setSimLatency(next);
                              addDevLog(`Latency Simulation changed: ${next ? 'ENABLED' : 'DISABLED'}`, 'warn');
                              showToast(next ? 'Active simulation latency +500ms enabled.' : 'Simulation latency delay disabled.');
                            }}
                            className={`w-11 h-5.5 rounded-full transition-all relative cursor-pointer ${simLatency ? 'bg-blue-600' : 'bg-zinc-805'}`}
                          >
                            <motion.div 
                              animate={{ x: simLatency ? 22 : 2 }}
                              className="absolute top-0.5 w-4.5 h-4.5 rounded-full bg-white shadow-sm"
                            />
                          </button>
                        </div>

                        {/* Retro Cyberpunk Scanlines */}
                        <div className="flex items-center justify-between p-4 bg-zinc-900/30 border border-zinc-900 rounded-2xl">
                          <div>
                            <div className="font-bold text-xs text-zinc-250 uppercase tracking-wide mb-1 select-none font-mono">Retro Scanlines CRT overlay</div>
                            <div className="text-[10px] text-zinc-400 font-sans leading-relaxed">Toggle visual phosphor phosphor grid filters</div>
                          </div>
                          <button 
                            onClick={() => {
                              const next = !retroFilter;
                              setRetroFilter(next);
                              addDevLog(`Retro Monitor Overlay switched: ${next ? 'ON' : 'OFF'}`, 'success');
                              showToast(next ? 'Retro CRT grid styling active.' : 'Retro CRT overlay disabled.');
                            }}
                            className={`w-11 h-5.5 rounded-full transition-all relative cursor-pointer ${retroFilter ? 'bg-blue-600' : 'bg-zinc-805'}`}
                          >
                            <motion.div 
                              animate={{ x: retroFilter ? 22 : 2 }}
                              className="absolute top-0.5 w-4.5 h-4.5 rounded-full bg-white shadow-sm"
                            />
                          </button>
                        </div>

                        {/* Interactive Sparkles Animation Toggle */}
                        <div className="flex items-center justify-between p-4 bg-zinc-900/30 border border-zinc-900 rounded-2xl">
                          <div>
                            <div className="font-bold text-xs text-zinc-250 uppercase tracking-wide mb-1 select-none font-mono">Verbose Debug Log level</div>
                            <div className="text-[10px] text-zinc-400 font-sans leading-relaxed">Logs more events from header selections, folder trees, and layout clicks</div>
                          </div>
                          <button 
                            onClick={() => {
                              const next = !verboseDebug;
                              setVerboseDebug(next);
                              addDevLog(`Verbose Debug switch: ${next ? 'LOG ALL' : 'STANDARD'}`, 'info');
                              showToast(next ? 'Verbose session logging active.' : 'Verbose logging level normalized.');
                            }}
                            className={`w-11 h-5.5 rounded-full transition-all relative cursor-pointer ${verboseDebug ? 'bg-blue-600' : 'bg-zinc-805'}`}
                          >
                            <motion.div 
                              animate={{ x: verboseDebug ? 22 : 2 }}
                              className="absolute top-0.5 w-4.5 h-4.5 rounded-full bg-white shadow-sm"
                            />
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

      {/* Scanned Layout Element Report Modal */}
      <AnimatePresence>
        {selectedModalAttachment && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[250] p-4 animate-fade-in font-sans">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#1C1816]/95 border border-[#2D241E] max-w-2xl w-full rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] select-none text-left"
            >
              {/* Header */}
              <div className="px-6 py-4 border-b border-[#2D241E] flex items-center justify-between bg-[#141110]">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 animate-pulse">
                    <MousePointerClick size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-100 font-sans">Scanned Layout Element</h3>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-black leading-none mt-1">Inspection analysis report</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedModalAttachment(null)}
                  className="p-1.5 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-zinc-250 transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Scrollable contents */}
              <div className="p-6 overflow-y-auto space-y-5 custom-scrollbar bg-[#1E1917]/30">
                {/* File Name */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#D97756]">1. File Destination</span>
                  <div className="bg-[#14110F] border border-[#221D1A] rounded-xl p-3 flex items-center justify-between">
                    <div className="truncate pr-4">
                      <span className="font-semibold text-zinc-100 block text-xs truncate font-sans">{selectedModalAttachment.fileName}</span>
                      <span className="text-[10px] text-zinc-500 truncate block mt-1 font-mono">{selectedModalAttachment.filePath}</span>
                    </div>
                    <button
                      onClick={() => {
                        setFloatingEditFile(selectedModalAttachment.filePath);
                        setSelectedModalAttachment(null);
                      }}
                      className="px-3 py-1.5 bg-[#D97756]/10 text-[#D97756] hover:bg-[#D97756]/15 text-xs font-bold rounded-lg border border-[#D97756]/30 transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                    >
                      <Code size={12} />
                      <span>Edit File</span>
                    </button>
                  </div>
                </div>

                {/* Element Work */}
                {selectedModalAttachment.elementWork && (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#D97756]">2. Functionality & Actions</span>
                    <div className="bg-[#171412] border border-[#231E1B] rounded-xl p-3.5 text-xs text-zinc-350 leading-relaxed font-sans shadow-inner">
                      {selectedModalAttachment.elementWork}
                    </div>
                  </div>
                )}

                {/* Specific Code */}
                {selectedModalAttachment.specificCode && (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#D97756]">3. Controlling Code</span>
                    <div className="rounded-xl border border-[#2D241E] bg-[#14110F] overflow-hidden leading-relaxed font-mono">
                      <div className="bg-[#1C1816] px-4 py-2 border-b border-[#2D241E] flex items-center justify-between select-none">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Source Segment</span>
                        <span className="text-[9px] text-[#D97756] font-bold uppercase tracking-widest bg-[#D97756]/10 px-2 py-0.5 rounded-full border border-[#D97756]/20">Pure Javascript / TSX</span>
                      </div>
                      <pre className="p-4 text-xs text-zinc-300 custom-scrollbar max-h-60 overflow-y-auto whitespace-pre-wrap word-break select-text leading-relaxed font-mono bg-[#0f0d0c]">
                        {selectedModalAttachment.specificCode}
                      </pre>
                    </div>
                  </div>
                )}

                {/* Connections */}
                {selectedModalAttachment.connections && selectedModalAttachment.connections.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#D97756]">4. Module Connections</span>
                    <div className="flex flex-wrap gap-2 pt-0.5">
                      {selectedModalAttachment.connections.map((c: any, id: number) => (
                        <button
                          key={id}
                          onClick={() => {
                            setFloatingEditFile(c.filePath || c.name || '');
                            setSelectedModalAttachment(null);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 border border-[#2D241E] hover:border-teal-500/40 text-xs text-zinc-350 hover:text-teal-400 rounded-lg transition-all cursor-pointer shadow-sm"
                          title={`Open ${c.fileName} in editor`}
                        >
                          <FileText size={12} className="text-zinc-650" />
                          <span className="font-semibold">{c.fileName}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Backing footer */}
              <div className="px-6 py-3 border-t border-[#2D241E] bg-[#141110] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedModalAttachment(null)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold rounded-lg transition-all cursor-pointer font-sans"
                >
                  Close Report
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Dynamic Image Lightbox Overlay Popup */}
      <AnimatePresence>
        {lightboxImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-md z-[500] flex items-center justify-center p-4 select-none"
            onClick={() => setLightboxImage(null)}
          >
            {/* Close button with high visibility */}
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute top-4 right-4 p-3 bg-zinc-900/80 hover:bg-zinc-850 border border-zinc-800 rounded-full text-white cursor-pointer transition-all hover:scale-105 z-[510] shadow-lg flex items-center justify-center w-10 h-10"
              title="Close image display"
            >
              <X size={18} />
            </button>

            {/* Inner Content Card (prevent click-through closure) */}
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="relative max-w-5xl max-h-[85vh] w-full flex flex-col items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Actual Image Panel with rich framing */}
              <div className="relative rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-950 shadow-2xl flex items-center justify-center max-h-[70vh]" style={{ aspectRatio: 'auto' }}>
                <img
                  src={lightboxImage.url}
                  alt={lightboxImage.title || 'Image detail view'}
                  className="max-w-full max-h-[70vh] object-contain select-text"
                  referrerPolicy="no-referrer"
                />
              </div>

              {/* High-fidelity Photo Footer Details */}
              <div className="mt-4 flex flex-col sm:flex-row items-center gap-3 justify-between w-full max-w-3xl bg-zinc-900/90 border border-zinc-805 px-5 py-3 rounded-2xl shadow-xl">
                <div className="text-left select-text truncate pr-4 max-w-[80%]">
                  <h4 className="text-xs font-bold text-zinc-150 tracking-wide truncate">{lightboxImage.title || 'Visual Attachment'}</h4>
                  <p className="text-[10px] text-zinc-400 truncate font-mono mt-0.5">{lightboxImage.url}</p>
                </div>
                <div className="flex items-center gap-2.5 shrink-0">
                  <a
                    href={lightboxImage.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] font-bold rounded-xl border border-zinc-700/50 transition-all cursor-pointer shadow-xs"
                  >
                    <ExternalLink size={12} />
                    <span>Open Original</span>
                  </a>
                  <button
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = lightboxImage.url;
                      link.download = lightboxImage.title || 'scraped-image';
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-[11px] font-black rounded-xl transition-all cursor-pointer shadow-md"
                  >
                    <Download size={12} />
                    <span>Download</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
 
      {/* Dynamic Video Popup Player Panel */}
      <AnimatePresence>
        {activeVideo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/95 backdrop-blur-md z-[500] flex items-center justify-center p-4 animate-fade-in"
            onClick={() => setActiveVideo(null)}
          >
            {/* Close button with high visibility */}
            <button
              onClick={() => setActiveVideo(null)}
              className="absolute top-4 right-4 p-3 bg-zinc-900/80 hover:bg-zinc-850 border border-zinc-800 rounded-full text-white cursor-pointer transition-all hover:scale-105 z-[510] shadow-lg flex items-center justify-center w-10 h-10 border-0 focus:outline-none"
              title="Close video player"
            >
              <X size={18} />
            </button>
 
            {/* Inner Content Card (prevent click-through closure) */}
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="relative max-w-4xl w-full flex flex-col items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Actual Video Frame */}
              <div className="relative rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-950 shadow-2xl flex items-center justify-center w-full aspect-video select-none">
                {(() => {
                  if (!activeVideo.url) return null;
                  
                  // YouTube Watch or Share URL transform to embed
                  let youtubeId = null;
                  const ytMatch = activeVideo.url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
                  if (ytMatch) {
                    youtubeId = ytMatch[1];
                  }
                  
                  // Vimeo Watch URL transform to embed
                  let vimeoId = null;
                  const vimeoMatch = activeVideo.url.match(/(?:vimeo\.com\/)(?:channels\/[^\/]+\/|groups\/[^\/]+\/video\/|album\/[^\/]+\/video\/|showcase\/[^\/]+\/video\/|video\/)?([0-9]+)/i);
                  if (vimeoMatch) {
                    vimeoId = vimeoMatch[1];
                  }
 
                  if (youtubeId) {
                    return (
                      <iframe
                        src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1`}
                        title={activeVideo.title || 'YouTube Video'}
                        className="w-full h-full border-0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        referrerPolicy="no-referrer"
                      />
                    );
                  } else if (vimeoId) {
                    return (
                      <iframe
                        src={`https://player.vimeo.com/video/${vimeoId}?autoplay=1`}
                        title={activeVideo.title || 'Vimeo Video'}
                        className="w-full h-full border-0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        referrerPolicy="no-referrer"
                      />
                    );
                  } else if (activeVideo.url.includes('/embed/')) {
                    // Pre-made embed URL
                    return (
                      <iframe
                        src={activeVideo.url}
                        title={activeVideo.title || 'Embedded Video'}
                        className="w-full h-full border-0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        referrerPolicy="no-referrer"
                      />
                    );
                  } else {
                    // Standard direct file source video elements
                    return (
                      <video
                        src={activeVideo.url}
                        title={activeVideo.title || 'Direct Media Video Player'}
                        controls
                        autoPlay
                        className="w-full h-full object-contain rounded-2xl bg-neutral-950"
                      />
                    );
                  }
                })()}
              </div>
 
              {/* High-fidelity Video Footer Details */}
              <div className="mt-4 flex flex-col sm:flex-row items-center gap-3 justify-between w-full bg-zinc-900/95 border border-zinc-800 px-5 py-3.5 rounded-2xl shadow-xl select-text">
                <div className="text-left truncate pr-4 max-w-[80%]">
                  <h4 className="text-sm font-bold text-zinc-150 tracking-wide truncate flex items-center gap-1.5">
                    <Play size={13} className="text-orange-500 fill-orange-500 shrink-0" />
                    <span>{activeVideo.title || 'Lumina Media player'}</span>
                  </h4>
                  <p className="text-[10px] text-zinc-500 truncate font-mono mt-1">{activeVideo.url}</p>
                </div>
                <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
                  <a
                    href={activeVideo.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] font-bold rounded-xl border border-zinc-750/50 transition-all cursor-pointer shadow-xs no-underline"
                  >
                    <ExternalLink size={12} />
                    <span>Open in New Tab</span>
                  </a>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* URL Tool Modal */}
      <AnimatePresence>
        {isUrlToolOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[600] flex items-center justify-center p-4 font-sans"
            onClick={() => { if (!urlToolLoading) { setIsUrlToolOpen(false); setUrlToolError(null); setUrlToolInput(''); } }}
          >
            <motion.div
              initial={{ scale: 0.96, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 12 }}
              transition={{ type: 'spring', damping: 26, stiffness: 380 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-2xl shadow-2xl p-6 flex flex-col gap-4 text-left"
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-blue-500/10 rounded-xl">
                    <LinkIcon size={16} className="text-blue-400 font-sans" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[var(--theme-primary)] font-sans">Attach URL</h3>
                    <p className="text-[11px] text-[var(--theme-muted)] leading-none mt-1 font-sans">Scrape a web page and attach it as context</p>
                  </div>
                </div>
                <button
                  onClick={() => { setIsUrlToolOpen(false); setUrlToolError(null); setUrlToolInput(''); }}
                  disabled={urlToolLoading}
                  className="p-1.5 hover:bg-[var(--theme-hover-bg)] rounded-lg text-[var(--theme-secondary)] hover:text-[var(--theme-primary)] transition-all cursor-pointer disabled:opacity-40"
                >
                  <X size={16} />
                </button>
              </div>

              {/* URL Input */}
              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-semibold text-[var(--theme-secondary)] uppercase tracking-widest font-sans">
                  Page URL
                </label>
                <input
                  type="url"
                  value={urlToolInput}
                  onChange={(e) => { setUrlToolInput(e.target.value); setUrlToolError(null); }}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !urlToolLoading) handleAttachUrl(); }}
                  placeholder="https://example.com/article"
                  disabled={urlToolLoading}
                  autoFocus
                  className="w-full h-11 px-4 bg-[var(--theme-hover-bg)] border border-[var(--theme-border)] focus:border-blue-500/50 rounded-xl text-sm text-[var(--theme-primary)] placeholder-[var(--theme-muted)] outline-none transition-all disabled:opacity-50 font-sans"
                />
                {urlToolError && (
                  <p className="text-xs text-rose-400 font-medium font-sans">{urlToolError}</p>
                )}
              </div>

              {/* Action Button */}
              <button
                onClick={handleAttachUrl}
                disabled={!urlToolInput.trim() || urlToolLoading}
                className="w-full h-11 flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl transition-all shadow-md cursor-pointer font-sans"
              >
                {urlToolLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span className="font-sans">Fetching page...</span>
                  </>
                ) : (
                  <>
                    <LinkIcon size={15} />
                    <span className="font-sans">Fetch &amp; Attach</span>
                  </>
                )}
              </button>

              <p className="text-[10px] text-center text-[var(--theme-muted)] font-sans">
                The page content will be compressed and attached as a document for the AI to read.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Transcript Tool Modal */}
      <AnimatePresence>
        {isTranscriptToolOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[600] flex items-center justify-center p-4 font-sans"
            onClick={() => { if (!transcriptToolLoading) { setIsTranscriptToolOpen(false); setTranscriptToolError(null); setTranscriptToolInput(''); } }}
          >
            <motion.div
              initial={{ scale: 0.96, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 12 }}
              transition={{ type: 'spring', damping: 26, stiffness: 380 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-2xl shadow-2xl p-6 flex flex-col gap-4 text-left"
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-rose-500/10 rounded-xl">
                    <Video size={16} className="text-rose-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[var(--theme-primary)] font-sans">Video Transcript</h3>
                    <p className="text-[11px] text-[var(--theme-muted)] leading-none mt-1 font-sans">Fetch captions from YouTube &amp; attach as context</p>
                  </div>
                </div>
                <button
                  onClick={() => { setIsTranscriptToolOpen(false); setTranscriptToolError(null); setTranscriptToolInput(''); }}
                  disabled={transcriptToolLoading}
                  className="p-1.5 hover:bg-[var(--theme-hover-bg)] rounded-lg text-[var(--theme-secondary)] hover:text-[var(--theme-primary)] transition-all cursor-pointer disabled:opacity-40"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Input */}
              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-semibold text-[var(--theme-secondary)] uppercase tracking-widest font-sans">
                  YouTube URL
                </label>
                <input
                  type="url"
                  value={transcriptToolInput}
                  onChange={(e) => { setTranscriptToolInput(e.target.value); setTranscriptToolError(null); }}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !transcriptToolLoading) handleFetchTranscript(); }}
                  placeholder="https://youtube.com/watch?v=..."
                  disabled={transcriptToolLoading}
                  autoFocus
                  className="w-full h-11 px-4 bg-[var(--theme-hover-bg)] border border-[var(--theme-border)] focus:border-rose-500/50 rounded-xl text-sm text-[var(--theme-primary)] placeholder-[var(--theme-muted)] outline-none transition-all disabled:opacity-50 font-sans"
                />
                {transcriptToolError && (
                  <p className="text-xs text-rose-400 font-medium font-sans">{transcriptToolError}</p>
                )}
              </div>

              {/* Action Button */}
              <button
                onClick={handleFetchTranscript}
                disabled={!transcriptToolInput.trim() || transcriptToolLoading}
                className="w-full h-11 flex items-center justify-center gap-2 bg-rose-500 hover:bg-rose-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl transition-all shadow-md cursor-pointer font-sans"
              >
                {transcriptToolLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span className="font-sans">Fetching transcript...</span>
                  </>
                ) : (
                  <>
                    <Video size={15} />
                    <span className="font-sans">Get Transcript</span>
                  </>
                )}
              </button>

              <div className="text-[10px] text-center text-[var(--theme-muted)] space-y-0.5 font-sans">
                <p>Works with YouTube videos that have captions enabled.</p>
                <p className="text-[var(--theme-muted)]/60">Supports <code className="font-mono">youtube.com/watch</code> and <code className="font-mono">youtu.be</code> links.</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
      {transcriptionOptionsDoc && (() => {
        const isVideo = !!transcriptionOptionsDoc.videoId && !!transcriptionOptionsDoc.segments;
        const isOcr = !!transcriptionOptionsDoc.isOcr;
        const rawTitle = isOcr ? transcriptionOptionsDoc.url.replace(/^\[OCR Image Attachment\]:\s*/, '') : transcriptionOptionsDoc.title;
        const safeTitle = rawTitle.replace(/[^a-zA-Z0-9-_.]/g, '_').slice(0, 50);
        const docId = transcriptionOptionsDoc.id;
        
        const markdownPath = isOcr 
          ? `ocr_transcripts/ocr_${safeTitle}_${docId}.md`
          : `scraped_pages/${safeTitle || 'page'}_${docId}.md`;
          
        const jsonPath = isOcr
          ? `ocr_transcripts/ocr_${safeTitle}_${docId}.json`
          : `scraped_pages/${safeTitle || 'page'}_${docId}.json`;

        return (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[600] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 15 }}
              className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl relative select-none"
            >
              {/* Header info */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl border shrink-0 ${
                    isVideo ? 'bg-rose-500/10 text-rose-500 border-rose-500/10' :
                    isOcr ? 'bg-amber-500/10 text-amber-500 border-amber-500/10' :
                    'bg-blue-500/10 text-blue-400 border-blue-500/10'
                  }`}>
                    {isVideo ? <Video className="w-5 h-5" /> : 
                     isOcr ? <Sparkles className="w-5 h-5 text-amber-500 animate-pulse" /> : 
                     <LinkIcon className="w-5 h-5" />}
                  </div>
                  <div className="text-left min-w-0">
                    <h3 className="text-sm font-bold text-zinc-100 font-sans truncate max-w-[220px]">
                      {isOcr ? `OCR Data: ${rawTitle}` : transcriptionOptionsDoc.title}
                    </h3>
                    <p className="text-[10px] text-zinc-500 font-mono tracking-wider mt-0.5">
                      {isVideo ? `VIDEO ID: ${transcriptionOptionsDoc.videoId}` : 
                       isOcr ? `OCR IMAGE SCAN` : 
                       `SOURCE URL: ${transcriptionOptionsDoc.url.replace(/https?:\/\/(www\.)?/, '').slice(0, 30)}...`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setTranscriptionOptionsDoc(null)}
                  className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-750 text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
                >
                  <X size={15} />
                </button>
              </div>

              <p className="text-xs text-zinc-400 font-sans text-left mb-6 leading-relaxed">
                {isVideo 
                  ? "This YouTube video transcript and playhead metrics have been processed & written to disk. How would you like to explore this collected data?"
                  : isOcr
                    ? "This image attachment has been fully transcribed using our background OCR engine. Extracted text and layout bounding matrices are saved to disk. How would you like to open it?"
                    : "This webpage has been scraped, compressed, and written to disk as custom markdown/json formats. How would you like to open it in your workspace code editor?"
                }
              </p>

              {/* Selection choices */}
              <div className="space-y-3 select-none">
                {isVideo && (
                  <button
                    onClick={() => {
                      setSelectedTranscriptDoc(transcriptionOptionsDoc);
                      setTranscriptionOptionsDoc(null);
                    }}
                    className="w-full group text-left p-4 bg-zinc-850 hover:bg-rose-500/10 border border-zinc-800 hover:border-rose-500/30 rounded-xl transition-all cursor-pointer flex items-start gap-3.5"
                  >
                    <div className="p-2.5 bg-zinc-90 w-10 h-10 rounded-lg flex items-center justify-center text-zinc-400 group-hover:bg-rose-500/20 group-hover:text-rose-400 shrink-0">
                      <Play size={18} className="fill-current" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-zinc-200 group-hover:text-rose-450 font-sans transition-colors">
                        🎬 Interactive Studio Player
                      </h4>
                      <p className="text-[11px] text-zinc-400 mt-1 font-sans leading-normal">
                        Sync captions with live YouTube, speed-navigate chapters, and consult the AI Q&A Chatbot with integrated playhead pointers.
                      </p>
                    </div>
                  </button>
                )}

                <button
                  onClick={async () => {
                    if (isVideo) {
                      await ensureTranscriptFilesOnDisk(transcriptionOptionsDoc);
                      setFloatingEditFile(`transcripts/transcript_${transcriptionOptionsDoc.videoId}.md`);
                    } else if (isOcr) {
                      setFloatingEditFile(markdownPath);
                    } else {
                      await ensureScrapedFilesOnDisk(transcriptionOptionsDoc);
                      setFloatingEditFile(markdownPath);
                    }
                    setTranscriptionOptionsDoc(null);
                  }}
                  className="w-full group text-left p-4 bg-zinc-850 hover:bg-blue-500/10 border border-zinc-800 hover:border-blue-500/30 rounded-xl transition-all cursor-pointer flex items-start gap-3.5"
                >
                  <div className="p-2.5 bg-zinc-90 w-10 h-10 rounded-lg flex items-center justify-center text-zinc-300 group-hover:bg-blue-500/20 group-hover:text-blue-400 shrink-0">
                    <FileText size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-zinc-200 group-hover:text-blue-400 font-sans transition-colors">
                      📝 Open Markdown in Code Editor
                    </h4>
                    <p className="text-[11px] text-zinc-400 mt-1 font-sans leading-normal">
                      Inspect fully-formatted notes, section blocks, and clean layouts within the premium virtual workbench.
                    </p>
                  </div>
                </button>

                <button
                  onClick={async () => {
                    if (isVideo) {
                      await ensureTranscriptFilesOnDisk(transcriptionOptionsDoc);
                      setFloatingEditFile(`transcripts/transcript_${transcriptionOptionsDoc.videoId}.json`);
                    } else if (isOcr) {
                      setFloatingEditFile(jsonPath);
                    } else {
                      await ensureScrapedFilesOnDisk(transcriptionOptionsDoc);
                      setFloatingEditFile(jsonPath);
                    }
                    setTranscriptionOptionsDoc(null);
                  }}
                  className="w-full group text-left p-4 bg-zinc-850 hover:bg-[#D97756]/10 border border-zinc-800 hover:border-[#D97756]/30 rounded-xl transition-all cursor-pointer flex items-start gap-3.5"
                >
                  <div className="p-2.5 bg-zinc-90 w-10 h-10 rounded-lg flex items-center justify-center text-zinc-305 group-hover:bg-[#D97756]/20 group-hover:text-[#D97756] shrink-0">
                    <FileJson size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-zinc-200 group-hover:text-[#D97756] font-sans transition-colors">
                      📊 Open Captured JSON in Code Editor
                    </h4>
                    <p className="text-[11px] text-zinc-400 mt-1 font-sans leading-normal">
                      {isOcr 
                        ? "Analyze OCR character confidence, pixel dimensions, word layouts, and bounding coordinates."
                        : "Analyze, map, or modify playhead metrics and parsed dialogue segments under standard JSON formatting."}
                    </p>
                  </div>
                </button>
              </div>
            </motion.div>
          </div>
        );
      })()}

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
    </div>
  );
}
