import React from 'react';
import { motion } from 'motion/react';
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
  BookOpen
} from 'lucide-react';
import { CLOUD_PROVIDERS } from '../constants';

interface SettingsModalProps {
  onClose: () => void;
  activeSettingsTab: 'general' | 'ai' | 'mcp' | 'bridge' | 'sources' | 'search' | 'persona' | 'profile' | 'theme' | 'lumina_tools';
  setActiveSettingsTab: (tab: 'general' | 'ai' | 'mcp' | 'bridge' | 'sources' | 'search' | 'persona' | 'profile' | 'theme' | 'lumina_tools') => void;
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
}

export function SettingsModal({
  onClose,
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
  handleLoadBridgeTools
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

  // Rich Persona State
  const [personaTone, setPersonaTone] = React.useState(() => localStorage.getItem('lumina_persona_tone') || 'technical');
  const [personaLength, setPersonaLength] = React.useState(() => localStorage.getItem('lumina_persona_length') || 'balanced');
  const [personaCreativity, setPersonaCreativity] = React.useState(() => localStorage.getItem('lumina_persona_creativity') || 'balanced');

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
              { id: 'persona', label: 'Persona', icon: <User size={16} /> },
              { id: 'lumina_tools', label: 'Lumina Tools', icon: <Hammer size={16} /> },
              { id: 'bridge', label: 'Llama Bridge', icon: <Terminal size={16} /> },
              { id: 'mcp', label: 'MCP Tools', icon: <HardDrive size={16} /> },
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
        </div>

        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center justify-end p-6 pb-0">
            <button 
              onClick={onClose}
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
                    {searchProvider === 'tavily' ? (
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
        </div>
      </motion.div>
    </div>
  );
}
