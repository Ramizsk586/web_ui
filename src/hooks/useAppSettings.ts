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

export interface AiProviderProfile {
  id: string;
  name: string;
  provider: string;
  endpoint: string;
  apiKey: string;
  models: Array<{ id: string; name: string; color?: string; providerProfileId?: string; providerProfileName?: string }>;
  selectedModelIds: string[];
  active: boolean;
  accentColor: string;
  verifiedAt: number;
  updatedAt: number;
}

const PROFILE_ACCENT_COLORS = [
  '#3b82f6',
  '#a855f7',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#06b6d4',
  '#ec4899',
  '#84cc16',
];

const normalizeProviderProfiles = (profiles: AiProviderProfile[]): AiProviderProfile[] => {
  const providerCounts = new Map<string, number>();
  return profiles.map((profile) => {
    const count = providerCounts.get(profile.provider) || 0;
    providerCounts.set(profile.provider, count + 1);
    return {
      ...profile,
      accentColor: profile.accentColor || PROFILE_ACCENT_COLORS[count % PROFILE_ACCENT_COLORS.length],
      selectedModelIds: Array.isArray(profile.selectedModelIds) && profile.selectedModelIds.length > 0
        ? profile.selectedModelIds
        : profile.models.map(model => model.id),
    };
  });
};

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

  const [activeSettingsTab, setActiveSettingsTab] = useState<'general' | 'ai' | 'mcp' | 'bridge' | 'sources' | 'search' | 'persona' | 'profile' | 'theme' | 'lumina_tools' | 'llama_cpp' | 'models' | 'rag' | 'skills'>('general');
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

  const [selectedProvider, setSelectedProvider] = useState(() => safeGetItem('lumina_provider', 'openprovider'));
  const [searchProvider, setSearchProvider] = useState(() => localStorage.getItem('lumina_search_provider') || 'duckduckgo');
  const [tavilyApiKey, setTavilyApiKey] = useState(() => safeGetItem('lumina_tavily_key', ''));
  const [serpApiKey, setSerpApiKey] = useState(() => safeGetItem('lumina_serp_key', ''));

  const [aiVerificationState, setAiVerificationState] = useState<'idle' | 'verifying' | 'success' | 'error'>(() => {
    try {
      const savedKey = localStorage.getItem('lumina_verified_api_key') || '';
      const savedUrl = localStorage.getItem('lumina_verified_server_url') || '';
      const savedProv = localStorage.getItem('lumina_verified_provider') || '';
      const currentKey = localStorage.getItem('lumina_api_key') || '';
      const currentUrl = localStorage.getItem('lumina_server_url') || 'https://openprovider.mimika.in/v1';
      const currentProv = localStorage.getItem('lumina_provider') || 'openprovider';
      const isVerified = localStorage.getItem('lumina_ai_verified') === 'true';
      if (isVerified && savedKey === currentKey && savedUrl === currentUrl && savedProv === currentProv) {
        return 'success';
      }
    } catch {}
    return 'idle';
  });

  const [searchVerificationState, setSearchVerificationState] = useState<'idle' | 'verifying' | 'success' | 'error'>(() => {
    try {
      const savedSearchProvider = localStorage.getItem('lumina_verified_search_provider') || '';
      const savedTavilyKey = localStorage.getItem('lumina_verified_tavily_key') || '';
      const savedSerpKey = localStorage.getItem('lumina_verified_serp_key') || '';
      const currentSearchProvider = localStorage.getItem('lumina_search_provider') || 'duckduckgo';
      const currentTavilyKey = localStorage.getItem('lumina_tavily_key') || '';
      const currentSerpKey = localStorage.getItem('lumina_serp_key') || '';
      const isVerified = localStorage.getItem('lumina_search_verified') === 'true';
      if (isVerified && savedSearchProvider === currentSearchProvider && savedTavilyKey === currentTavilyKey && savedSerpKey === currentSerpKey) {
        return 'success';
      }
    } catch {}
    return 'idle';
  });

  useEffect(() => {
    try {
      const savedKey = localStorage.getItem('lumina_verified_api_key') || '';
      const savedUrl = localStorage.getItem('lumina_verified_server_url') || '';
      const savedProv = localStorage.getItem('lumina_verified_provider') || '';
      if (apiKey !== savedKey || serverUrl !== savedUrl || selectedProvider !== savedProv) {
        localStorage.setItem('lumina_ai_verified', 'false');
        setAiVerificationState('idle');
      } else if (localStorage.getItem('lumina_ai_verified') === 'true') {
        setAiVerificationState('success');
      }
    } catch {}
  }, [apiKey, serverUrl, selectedProvider]);

  useEffect(() => {
    try {
      const savedSearchProvider = localStorage.getItem('lumina_verified_search_provider') || '';
      const savedTavilyKey = localStorage.getItem('lumina_verified_tavily_key') || '';
      const savedSerpKey = localStorage.getItem('lumina_verified_serp_key') || '';
      if (searchProvider !== savedSearchProvider || tavilyApiKey !== savedTavilyKey || serpApiKey !== savedSerpKey) {
        localStorage.setItem('lumina_search_verified', 'false');
        setSearchVerificationState('idle');
      } else if (localStorage.getItem('lumina_search_verified') === 'true') {
        setSearchVerificationState('success');
      }
    } catch {}
  }, [searchProvider, tavilyApiKey, serpApiKey]);

  const [isAiSaved, setIsAiSaved] = useState(false);
  const [isSearchSaved, setIsSearchSaved] = useState(false);
  const [isMcpSaved, setIsMcpSaved] = useState(false);
  const [writingStyle, setWritingStyle] = useState('default');
  const [aiProviderProfiles, setAiProviderProfiles] = useState<AiProviderProfile[]>(() => {
    try {
      return normalizeProviderProfiles(JSON.parse(localStorage.getItem('lumina_ai_provider_profiles') || '[]'));
    } catch {
      return [];
    }
  });
  const [editingAiProfileId, setEditingAiProfileId] = useState<string | null>(null);

  const applyActiveProviderModels = useCallback((profiles: AiProviderProfile[]) => {
    const activeProfiles = profiles.filter(profile => profile.active);
    const profileModels = activeProfiles.flatMap(profile =>
      profile.models
        .filter(model => profile.selectedModelIds.includes(model.id))
        .map(model => ({
          ...model,
          id: model.id,
          name: model.name || model.id,
          color: model.color || 'text-blue-500',
          providerProfileId: profile.id,
          providerProfileName: profile.name,
        }))
    );

    const deduped = profileModels.filter((model, index, list) =>
      list.findIndex(item => item.id === model.id && item.providerProfileId === model.providerProfileId) === index
    );

    if (deduped.length > 0) {
      setAvailableModels(deduped);
      setSelectedModel(prev => {
        const existing = deduped.find(model => model.id === prev);
        return existing ? prev : deduped[0].id;
      });
    } else {
      setAvailableModels([
        { id: 'openprovider/auto-free', name: 'OpenProvider Auto Free', isAutoFree: true }
      ]);
      setSelectedModel(prev => prev || 'openprovider/auto-free');
    }
  }, [setAvailableModels, setSelectedModel]);

  const persistAiProviderProfiles = useCallback((nextProfiles: AiProviderProfile[]) => {
    setAiProviderProfiles(nextProfiles);
    localStorage.setItem('lumina_ai_provider_profiles', JSON.stringify(nextProfiles));
    applyActiveProviderModels(nextProfiles);
  }, [applyActiveProviderModels]);

  useEffect(() => {
    applyActiveProviderModels(aiProviderProfiles);
  }, [aiProviderProfiles, applyActiveProviderModels]);

  const getProfileDisplayName = useCallback((providerId: string, endpoint: string) => {
    const providerLabel = CLOUD_PROVIDERS.find(p => p.id === providerId)?.label || providerId || 'Custom';
    try {
      const host = new URL(endpoint).hostname.replace(/^api\./, '');
      return `${providerLabel} (${host})`;
    } catch {
      return providerLabel;
    }
  }, []);

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
      let fetchedModels: Array<{ id: string; name: string; color?: string }> = [];
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
                fetchedModels = modelsData.models.map((m: any) => ({
                  id: m.id,
                  name: m.name || m.id,
                  color: 'text-blue-500'
                }));
              }
            }
          } catch (err) {
            console.warn('Failed to fetch models but verified connection', err);
          }
          saveVerifiedAiProfile(fetchedModels);
          setAiVerificationState('success');
          try {
            localStorage.setItem('lumina_ai_verified', 'true');
            localStorage.setItem('lumina_verified_api_key', apiKey);
            localStorage.setItem('lumina_verified_server_url', serverUrl);
            localStorage.setItem('lumina_verified_provider', selectedProvider);
          } catch {}
        } else {
          setAiVerificationState('error');
          setTimeout(() => setAiVerificationState('idle'), 3000);
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
            fetchedModels = modelsArr.map((m: any) => ({
              id: m.id,
              name: m.display_name || m.id,
              color: 'text-blue-500'
            }));
          }
          saveVerifiedAiProfile(fetchedModels);
          setAiVerificationState('success');
          try {
            localStorage.setItem('lumina_ai_verified', 'true');
            localStorage.setItem('lumina_verified_api_key', apiKey);
            localStorage.setItem('lumina_verified_server_url', serverUrl);
            localStorage.setItem('lumina_verified_provider', selectedProvider);
          } catch {}
        } else {
          setAiVerificationState('error');
          setTimeout(() => setAiVerificationState('idle'), 3000);
        }
      }
    } catch (error) {
      console.error('Verification failed:', error);
      setAiVerificationState('error');
      setTimeout(() => setAiVerificationState('idle'), 3000);
    }
  }, [serverUrl, apiKey, selectedProvider, editingAiProfileId, aiProviderProfiles, persistAiProviderProfiles, getProfileDisplayName]);

  const saveVerifiedAiProfile = (
    models: Array<{ id: string; name: string; color?: string }>,
    override?: { profileId?: string; provider?: string; endpoint?: string; apiKey?: string }
  ) => {
    const now = Date.now();
    const targetProvider = override?.provider || selectedProvider;
    const targetEndpoint = override?.endpoint || serverUrl;
    const targetApiKey = override?.apiKey || apiKey;
    const matchingProfile = aiProviderProfiles.find(profile =>
      profile.provider === targetProvider &&
      profile.endpoint === targetEndpoint &&
      profile.apiKey === targetApiKey
    );
    const profileId = override?.profileId || editingAiProfileId || matchingProfile?.id || `profile-${now}`;
    const existing = aiProviderProfiles.find(profile => profile.id === profileId);
    const profileName = existing?.name || getProfileDisplayName(targetProvider, targetEndpoint);
    const sameProviderCount = aiProviderProfiles.filter(profile => profile.provider === targetProvider).length;
    const normalizedModels = models.length > 0 ? models : [
      { id: `${targetProvider || 'custom'}/default`, name: `${profileName} Default`, color: 'text-blue-500' }
    ];

    const nextProfile: AiProviderProfile = {
      id: profileId,
      name: profileName,
      provider: targetProvider,
      endpoint: targetEndpoint,
      apiKey: targetApiKey,
      models: normalizedModels,
      selectedModelIds: existing?.selectedModelIds?.filter(id => normalizedModels.some(model => model.id === id)) ?? normalizedModels.map(model => model.id),
      active: existing?.active ?? true,
      accentColor: existing?.accentColor || PROFILE_ACCENT_COLORS[sameProviderCount % PROFILE_ACCENT_COLORS.length],
      verifiedAt: now,
      updatedAt: now,
    };

    const nextProfiles = existing
      ? aiProviderProfiles.map(profile => profile.id === profileId ? nextProfile : profile)
      : [nextProfile, ...aiProviderProfiles];

    persistAiProviderProfiles(nextProfiles);
    if (!override?.profileId) {
      setEditingAiProfileId(null);
    }
    localStorage.setItem('lumina_server_url', targetEndpoint);
    localStorage.setItem('lumina_api_key', targetApiKey);
    localStorage.setItem('lumina_provider', targetProvider);
    showToast(existing ? 'Provider profile updated' : 'Provider profile saved');
  };

  const handleToggleAiProfile = useCallback((profileId: string) => {
    const nextProfiles = aiProviderProfiles.map(profile =>
      profile.id === profileId ? { ...profile, active: !profile.active, updatedAt: Date.now() } : profile
    );
    persistAiProviderProfiles(nextProfiles);
  }, [aiProviderProfiles, persistAiProviderProfiles]);

  const handleEditAiProfile = useCallback((profileId: string) => {
    const profile = aiProviderProfiles.find(item => item.id === profileId);
    if (!profile) return;
    setEditingAiProfileId(profile.id);
    setIsAiSaved(false);
  }, [aiProviderProfiles]);

  const handleCloseAiProfileEditor = useCallback(() => {
    setEditingAiProfileId(null);
  }, []);

  const handleUpdateAiProfileConfig = useCallback((profileId: string, patch: Partial<Pick<AiProviderProfile, 'name' | 'provider' | 'endpoint' | 'apiKey' | 'selectedModelIds'>>) => {
    const nextProfiles = aiProviderProfiles.map(profile =>
      profile.id === profileId ? { ...profile, ...patch, updatedAt: Date.now() } : profile
    );
    persistAiProviderProfiles(nextProfiles);
  }, [aiProviderProfiles, persistAiProviderProfiles]);

  const handleToggleAiProfileModel = useCallback((profileId: string, modelId: string) => {
    const nextProfiles = aiProviderProfiles.map(profile => {
      if (profile.id !== profileId) return profile;
      const selected = new Set(profile.selectedModelIds);
      if (selected.has(modelId)) {
        selected.delete(modelId);
      } else {
        selected.add(modelId);
      }
      return { ...profile, selectedModelIds: Array.from(selected), updatedAt: Date.now() };
    });
    persistAiProviderProfiles(nextProfiles);
  }, [aiProviderProfiles, persistAiProviderProfiles]);

  const handleSetAiProfileModelsVisible = useCallback((profileId: string, visible: boolean) => {
    const nextProfiles = aiProviderProfiles.map(profile =>
      profile.id === profileId
        ? { ...profile, selectedModelIds: visible ? profile.models.map(model => model.id) : [], updatedAt: Date.now() }
        : profile
    );
    persistAiProviderProfiles(nextProfiles);
  }, [aiProviderProfiles, persistAiProviderProfiles]);

  const handleVerifyAiProfile = useCallback(async (profileId: string) => {
    const profile = aiProviderProfiles.find(item => item.id === profileId);
    if (!profile) return;
    setAiVerificationState('verifying');
    try {
      let fetchedModels: Array<{ id: string; name: string; color?: string }> = [];
      const isExternal = profile.endpoint.startsWith('http://') || profile.endpoint.startsWith('https://');
      if (isExternal) {
        const response = await fetch('/api/provider/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            endpoint: profile.endpoint,
            apiKey: profile.apiKey,
            provider: profile.provider
          })
        });
        if (!response.ok) {
          setAiVerificationState('error');
          return;
        }
        const modelsResponse = await fetch('/api/provider/models', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            endpoint: profile.endpoint,
            apiKey: profile.apiKey
          })
        });
        if (modelsResponse.ok) {
          const modelsData = await modelsResponse.json();
          if (modelsData.success && Array.isArray(modelsData.models)) {
            fetchedModels = modelsData.models.map((m: any) => ({
              id: m.id,
              name: m.name || m.id,
              color: 'text-blue-500'
            }));
          }
        }
      } else {
        const headers: Record<string, string> = profile.provider === 'opencode'
          ? { 'x-api-key': profile.apiKey }
          : { Authorization: `Bearer ${profile.apiKey}` };
        const response = await fetch(`${profile.endpoint.replace(/\/+$/, '')}/models`, {
          method: 'GET',
          headers
        });
        if (!response.ok) {
          setAiVerificationState('error');
          return;
        }
        const data = await response.json();
        const modelsArr = data.data || data.models || [];
        if (Array.isArray(modelsArr)) {
          fetchedModels = modelsArr.map((m: any) => ({
            id: m.id,
            name: m.display_name || m.id,
            color: 'text-blue-500'
          }));
        }
      }
      saveVerifiedAiProfile(fetchedModels, {
        profileId: profile.id,
        provider: profile.provider,
        endpoint: profile.endpoint,
        apiKey: profile.apiKey,
      });
      setAiVerificationState('success');
    } catch (error) {
      console.error('Profile verification failed:', error);
      setAiVerificationState('error');
    } finally {
      setTimeout(() => setAiVerificationState('idle'), 3000);
    }
  }, [aiProviderProfiles, saveVerifiedAiProfile]);

  const handleDeleteAiProfile = useCallback((profileId: string) => {
    const nextProfiles = aiProviderProfiles.filter(profile => profile.id !== profileId);
    persistAiProviderProfiles(nextProfiles);
    if (editingAiProfileId === profileId) {
      setEditingAiProfileId(null);
    }
  }, [aiProviderProfiles, editingAiProfileId, persistAiProviderProfiles]);

  const handleRenameAiProfile = useCallback((profileId: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const nextProfiles = aiProviderProfiles.map(profile =>
      profile.id === profileId ? { ...profile, name: trimmed, updatedAt: Date.now() } : profile
    );
    persistAiProviderProfiles(nextProfiles);
  }, [aiProviderProfiles, persistAiProviderProfiles]);

  const handleSelectAiProfileModel = useCallback((modelId: string, profileId: string) => {
    const profile = aiProviderProfiles.find(item => item.id === profileId);
    if (!profile) return;
    setSelectedProvider(profile.provider);
    setServerUrl(profile.endpoint);
    setApiKey(profile.apiKey);
    localStorage.setItem('lumina_server_url', profile.endpoint);
    localStorage.setItem('lumina_api_key', profile.apiKey);
    localStorage.setItem('lumina_provider', profile.provider);
    setSelectedModel(modelId);
  }, [aiProviderProfiles, setSelectedModel]);

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
      if (searchProvider !== 'duckduckgo' && searchProvider !== 'ddg' && (!key || !key.trim())) {
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
        try {
          localStorage.setItem('lumina_search_verified', 'true');
          localStorage.setItem('lumina_verified_search_provider', searchProvider);
          localStorage.setItem('lumina_verified_tavily_key', tavilyApiKey);
          localStorage.setItem('lumina_verified_serp_key', serpApiKey);
        } catch {}
      } else {
        setSearchVerificationState('error');
        setTimeout(() => setSearchVerificationState('idle'), 3000);
      }
    } catch (error) {
      console.error('Search verification failed:', error);
      setSearchVerificationState('error');
      setTimeout(() => setSearchVerificationState('idle'), 3000);
    }
  }, [searchProvider, tavilyApiKey, serpApiKey]);

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
    aiProviderProfiles,
    editingAiProfileId,
    handleProviderSelect,
    handleSaveAI,
    handleVerifyAI,
    handleToggleAiProfile,
    handleEditAiProfile,
    handleCloseAiProfileEditor,
    handleUpdateAiProfileConfig,
    handleToggleAiProfileModel,
    handleSetAiProfileModelsVisible,
    handleVerifyAiProfile,
    handleDeleteAiProfile,
    handleRenameAiProfile,
    handleSelectAiProfileModel,
    handleSaveSearch,
    handleVerifySearch,
    handleSaveMcp,
    useLocalModelsOnly, setUseLocalModelsOnly,
  };
}
