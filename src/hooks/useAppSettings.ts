import { useState, useEffect, useCallback } from 'react';
import { safeGetItem } from '../utils/storageUtils';
import { DEFAULT_SERVER_URL, DEFAULT_MCP_URL, DEFAULT_API_KEY, CLOUD_PROVIDERS } from '../constants';

export interface UserProfile {
  name: string;
  avatar: string;
  dob: string;
  location: string;
  age?: number | string;
}

export interface UseAppSettingsProps {
  setAvailableModels: React.Dispatch<React.SetStateAction<any[]>>;
  setSelectedModel: React.Dispatch<React.SetStateAction<string>>;
  showToast: (msg: string) => void;
}

export function useAppSettings({
  setAvailableModels,
  setSelectedModel,
  showToast
}: UseAppSettingsProps) {
  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
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
  const [useLocalModelsOnly, setUseLocalModelsOnly] = useState(() => {
    return localStorage.getItem('lumina_use_local_models') === 'true';
  });
  const [modelSelectorMode, setModelSelectorMode] = useState<'popup' | 'drawer'>(() => {
    const saved = localStorage.getItem('lumina_model_selector_mode');
    return saved === 'drawer' ? 'drawer' : 'popup';
  });

  const [activeSettingsTab, setActiveSettingsTab] = useState<'general' | 'ai' | 'mcp' | 'bridge' | 'sources' | 'search' | 'persona' | 'profile' | 'theme' | 'lumina_tools' | 'llama_cpp' | 'models'>('general');
  const [activePlusSubMenu, setActivePlusSubMenu] = useState<'main' | 'mcp' | 'tools' | 'lumina_tools' | 'project' | 'skills' | 'style'>('main');
  const [mcpMode, setMcpMode] = useState<'local' | 'remote'>('local');
  const [remoteMcpConfig, setRemoteMcpConfig] = useState({ url: '', status: 'disconnected' as 'disconnected' | 'connecting' | 'connected', error: '' });
  const [testToolInput, setTestToolInput] = useState({ name: '', args: '{}' });
  const [isTestingTool, setIsTestingTool] = useState(false);
  const [testToolResult, setTestToolResult] = useState<any>(null);
  const [modelSearchQuery, setModelSearchQuery] = useState('');
  const [providerSearchQuery, setProviderSearchQuery] = useState('');
  const [persona, setPersona] = useState(() => {
    try {
      const saved = localStorage.getItem('lumina_persona');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          name: parsed.name || 'Lumina',
          role: parsed.role || 'Modern Intelligence',
          avatar: parsed.avatar || '',
          isGeneratingAvatar: !!parsed.isGeneratingAvatar,
          systemPrompt: parsed.systemPrompt || 'You are a helpful, precise, and highly capable AI assistant.'
        };
      }
    } catch (e) {}
    return {
      name: 'Lumina',
      role: 'Modern Intelligence',
      avatar: '',
      isGeneratingAvatar: false,
      systemPrompt: 'You are a helpful, precise, and highly capable AI assistant.'
    };
  });

  useEffect(() => {
    try {
      localStorage.setItem('lumina_persona', JSON.stringify(persona));
    } catch (e) {}
  }, [persona]);
  const [serverUrl, setServerUrl] = useState(() => safeGetItem('lumina_server_url', 'https://openprovider.mimika.in/v1'));
  const [apiKey, setApiKey] = useState(() => safeGetItem('lumina_api_key', DEFAULT_API_KEY));
  const [mcpUrl, setMcpUrl] = useState(() => safeGetItem('lumina_mcp_url', DEFAULT_MCP_URL));
  const [mcpKey, setMcpKey] = useState(() => safeGetItem('lumina_mcp_key', DEFAULT_API_KEY));

  const [searchProvider, setSearchProvider] = useState(() => localStorage.getItem('lumina_search_provider') || 'tavily');
  const [tavilyApiKey, setTavilyApiKey] = useState(() => safeGetItem('lumina_tavily_key', ''));
  const [serpApiKey, setSerpApiKey] = useState(() => safeGetItem('lumina_serp_key', ''));

  const [aiVerificationState, setAiVerificationState] = useState<'idle' | 'verifying' | 'success' | 'error'>('idle');
  const [searchVerificationState, setSearchVerificationState] = useState<'idle' | 'verifying' | 'success' | 'error'>('idle');
  const [isAiSaved, setIsAiSaved] = useState(false);
  const [isSearchSaved, setIsSearchSaved] = useState(false);
  const [isMcpSaved, setIsMcpSaved] = useState(false);
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
            { id: 'openprovider/auto-free', name: 'OpenProvider Auto Free', isAutoFree: true },
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
  }, [serverUrl, apiKey, selectedProvider, setAvailableModels]);

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

  return {
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
    handleProviderSelect,
    handleSaveAI,
    handleVerifyAI,
    handleSaveSearch,
    handleVerifySearch,
    handleSaveMcp,
    useLocalModelsOnly, setUseLocalModelsOnly
  };
}
