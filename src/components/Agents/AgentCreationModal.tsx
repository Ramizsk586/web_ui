import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, Sparkles, ArrowLeft, Bot, Check, ChevronDown, ChevronUp, AlertCircle, RefreshCw, Wand2, Terminal, Key, Eye, EyeOff, Server, Globe, Cpu, Brain, FileText, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Agent, AgentSkill, AgentTool, AgentModel, AgentSkillFile } from '../../agents/types';
import { ALL_AGENT_SKILLS, ALL_AGENT_TOOLS, AGENT_AVATARS, AGENT_AVATAR_COLORS, MAX_AGENT_SKILLS, MAX_AGENT_TOOLS } from '../../agents/constants';
import { AgentAvatar } from './AgentAvatar';

interface AgentCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAgentCreated: (agent: Agent) => void;
  editAgent?: Agent | null; // Optional: If provided, modal operates in Edit Mode
  onAgentUpdated?: (id: string, patch: Partial<Agent>) => void;
  isPanel?: boolean;
}

const EXAMPLES = [
  { title: 'Help me manage my technical project', description: 'Create a technical project manager who can help with agile methodology implementation, sprint planning, risk management, stakeholder communication, resource allocation...' },
  { title: 'Teach me mindfulness and meditation', description: 'Create a mindfulness guide who can teach meditation techniques, help you manage stress, develop present-moment awareness, and maintain focus...' },
  { title: 'Help me become more productive', description: 'Become a Productivity & GTD Coach. Help users implement Getting Things Done (GTD), time-blocking, list prioritization, and build daily habits.' },
  { title: 'Help me capture better photographs', description: 'Create an Interactive Photography Coach. Provide a "Composition Deconstructor" to analyze balance, golden ratio, rule of thirds, lighting, and frame structure.' },
  { title: 'Help me design my backend architecture', description: 'Create a backend architect who specializes in designing scalable microservices architectures, implementing event-driven systems, and defining data schemas.' },
  { title: 'Help me take better care of my pet', description: 'Create a pet care advisor that provides guidance on pet health, behavior training, nutrition, enrichment activities, and emotional wellness.' },
];

const getExampleIcon = (index: number) => {
  switch (index) {
    case 0: return <Terminal size={14} className="text-blue-400 shrink-0" />;
    case 1: return <Brain size={14} className="text-teal-400 shrink-0" />;
    case 2: return <Cpu size={14} className="text-amber-400 shrink-0" />;
    case 3: return <Globe size={14} className="text-rose-400 shrink-0" />;
    case 4: return <Server size={14} className="text-indigo-400 shrink-0" />;
    case 5: return <Bot size={14} className="text-emerald-400 shrink-0" />;
    default: return <Sparkles size={14} className="text-zinc-400 shrink-0" />;
  }
};

const getExampleCategory = (index: number) => {
  switch (index) {
    case 0: return 'Agile PM';
    case 1: return 'Wellness';
    case 2: return 'Productivity';
    case 3: return 'Creative';
    case 4: return 'Engineering';
    case 5: return 'Lifestyle';
    default: return 'Assistant';
  }
};

const PROVIDERS = [
  { id: 'google-gemini', label: 'Google Gemini' },
  { id: 'openai', label: 'OpenAI GPT' },
  { id: 'anthropic', label: 'Anthropic Claude' },
  { id: 'deepseek', label: 'DeepSeek' },
  { id: 'groq', label: 'Groq Llama / Mixtral' },
  { id: 'opencode', label: 'OpenCode Zen' },
  { id: 'openprovider', label: 'OpenProvider' },
  { id: 'kimchi', label: 'Kimchi' },
  { id: 'openrouter', label: 'OpenRouter' },
  { id: 'together', label: 'Together AI' },
  { id: 'mistral', label: 'Mistral' },
  { id: 'cohere', label: 'Cohere' },
  { id: 'sarvamai', label: 'Sarvam AI' },
  { id: 'kilo', label: 'Kilo AI' },
  { id: 'cline', label: 'Cline' },
  { id: 'nvidia_nim', label: 'NVIDIA NIM' },
  { id: 'ollama', label: 'Ollama (Local)' },
  { id: 'ollama_cloud', label: 'Ollama Cloud' },
  { id: 'lm-studio', label: 'LM Studio (Local)' },
  { id: 'custom-openai-compatible', label: 'Custom OpenAI-Compatible' }
];

const PROVIDER_MODELS: Record<string, { label: string; value: string }[]> = {
  'google-gemini': [
    { label: 'Gemini 3.5 Flash (Recommended)', value: 'gemini-3.5-flash' },
    { label: 'Gemini 3.5 Pro (Ultra Smart)', value: 'gemini-3.5-pro' },
    { label: 'Gemini 2.5 Flash', value: 'gemini-2.5-flash' },
    { label: 'Gemini 2.5 Pro', value: 'gemini-2.5-pro' },
    { label: 'Custom Model ID...', value: 'custom' }
  ],
  'openai': [
    { label: 'GPT-4o (Standard)', value: 'gpt-4o' },
    { label: 'GPT-4o-mini (Fast & Light)', value: 'gpt-4o-mini' },
    { label: 'o1-preview (Advanced Reasoning)', value: 'o1-preview' },
    { label: 'gpt-4-turbo', value: 'gpt-4-turbo' },
    { label: 'Custom Model ID...', value: 'custom' }
  ],
  'anthropic': [
    { label: 'Claude 3.5 Sonnet', value: 'claude-3-5-sonnet-20241022' },
    { label: 'Claude 3.5 Haiku', value: 'claude-3-5-haiku-20241022' },
    { label: 'Claude 3 Opus', value: 'claude-3-opus-20240229' },
    { label: 'Custom Model ID...', value: 'custom' }
  ],
  'deepseek': [
    { label: 'DeepSeek Chat (V3)', value: 'deepseek-chat' },
    { label: 'DeepSeek Coder', value: 'deepseek-coder' },
    { label: 'DeepSeek Reasoner (R1)', value: 'deepseek-reasoner' },
    { label: 'Custom Model ID...', value: 'custom' }
  ],
  'groq': [
    { label: 'Llama 3.3 70B (Groq)', value: 'llama-3.3-70b-specdec' },
    { label: 'Llama 3.1 8B (Groq)', value: 'llama-3.1-8b-instant' },
    { label: 'Mixtral 8x7b (Groq)', value: 'mixtral-8x7b-32768' },
    { label: 'Custom Model ID...', value: 'custom' }
  ],
  'opencode': [
    { label: 'OpenCode Zen (v1)', value: 'opencode-zen-v1' },
    { label: 'Big Pickle Coder', value: 'big-pickle-coder' },
    { label: 'Custom Model ID...', value: 'custom' }
  ],
  'openprovider': [
    { label: 'OpenProvider Standard', value: 'gpt-4o' },
    { label: 'OpenProvider Smart', value: 'claude-3-5-sonnet' },
    { label: 'Custom Model ID...', value: 'custom' }
  ],
  'kimchi': [
    { label: 'Custom Model ID...', value: 'custom' }
  ],
  'openrouter': [
    { label: 'Llama 3.1 405B Instruct', value: 'meta-llama/llama-3.1-405b' },
    { label: 'Claude 3.5 Sonnet', value: 'anthropic/claude-3.5-sonnet' },
    { label: 'Gemini Pro 1.5', value: 'google/gemini-pro-1.5' },
    { label: 'Custom Model ID...', value: 'custom' }
  ],
  'together': [
    { label: 'Llama 3.1 70B Instruct Turbo', value: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo' },
    { label: 'Mixtral 8x7B Instruct v0.1', value: 'mistralai/Mixtral-8x7B-Instruct-v0.1' },
    { label: 'Custom Model ID...', value: 'custom' }
  ],
  'mistral': [
    { label: 'Mistral Large Latest', value: 'mistral-large-latest' },
    { label: 'Mistral Medium Latest', value: 'mistral-medium-latest' },
    { label: 'Mistral Small Latest', value: 'mistral-small-latest' },
    { label: 'Custom Model ID...', value: 'custom' }
  ],
  'cohere': [
    { label: 'Command R+', value: 'command-r-plus' },
    { label: 'Command R', value: 'command-r' },
    { label: 'Custom Model ID...', value: 'custom' }
  ],
  'sarvamai': [
    { label: 'Sarvam 1', value: 'sarvam-1' },
    { label: 'Custom Model ID...', value: 'custom' }
  ],
  'kilo': [
    { label: 'Kilo Model v1', value: 'kilo-model-v1' },
    { label: 'Custom Model ID...', value: 'custom' }
  ],
  'cline': [
    { label: 'Cline Agent v1', value: 'cline-agent-v1' },
    { label: 'Custom Model ID...', value: 'custom' }
  ],
  'nvidia_nim': [
    { label: 'Llama 3 70B Instruct', value: 'meta/llama3-70b-instruct' },
    { label: 'Custom Model ID...', value: 'custom' }
  ],
  'ollama': [
    { label: 'Llama 3.3 (Local)', value: 'llama3.3' },
    { label: 'Mistral (Local)', value: 'mistral' },
    { label: 'Phi-3 (Local)', value: 'phi3' },
    { label: 'Qwen 2.5 Coder (Local)', value: 'qwen2.5-coder' },
    { label: 'Custom Model ID...', value: 'custom' }
  ],
  'ollama_cloud': [
    { label: 'Llama 3 (Cloud)', value: 'llama3' },
    { label: 'Custom Model ID...', value: 'custom' }
  ],
  'lm-studio': [
    { label: 'LM Studio Default Loaded', value: 'lm-studio' },
    { label: 'Custom Model ID...', value: 'custom' }
  ],
  'custom-openai-compatible': [
    { label: 'Custom Model (Specify below...)', value: 'custom' }
  ]
};

const editModelProvider = (modelVal: string, providerVal?: string): string => {
  if (providerVal) return providerVal;
  const modelLower = (modelVal || '').toLowerCase();
  if (modelLower.includes('gemini')) return 'google-gemini';
  if (modelLower.includes('claude')) return 'anthropic';
  if (modelLower.startsWith('gpt') || modelLower.startsWith('o1')) return 'openai';
  if (modelLower.includes('deepseek')) return 'deepseek';
  if (modelLower.includes('llama') || modelLower.includes('groq')) return 'groq';
  if (modelLower.includes('opencode')) return 'opencode';
  if (modelLower.includes('openprovider')) return 'openprovider';
  if (modelLower.includes('kimchi')) return 'kimchi';
  if (modelLower.includes('openrouter')) return 'openrouter';
  if (modelLower.includes('together')) return 'together';
  if (modelLower.includes('mistral')) return 'mistral';
  if (modelLower.includes('cohere')) return 'cohere';
  if (modelLower.includes('sarvam')) return 'sarvamai';
  if (modelLower.includes('kilo')) return 'kilo';
  if (modelLower.includes('cline')) return 'cline';
  if (modelLower.includes('nvidia')) return 'nvidia_nim';
  if (modelLower.includes('ollama_cloud')) return 'ollama_cloud';
  if (modelLower.includes('ollama')) return 'ollama';
  if (modelLower.includes('lm-studio')) return 'lm-studio';
  return 'google-gemini';
};

export function AgentCreationModal({
  isOpen,
  onClose,
  onAgentCreated,
  editAgent = null,
  onAgentUpdated,
  isPanel = false,
}: AgentCreationModalProps) {
  // Phase management: 'describe' (Phase 1) | 'generating' (Phase 2) | 'configure' (Phase 3)
  const [phase, setPhase] = useState<'describe' | 'generating' | 'configure'>('describe');
  
  // Pipeline steps tracking state
  const [generationSteps, setGenerationSteps] = useState<Array<{ id: string; label: string; file: string; status: 'idle' | 'running' | 'completed' | 'failed' }>>([]);

  const parseYamlFrontmatter = (content: string) => {
    const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    const result: Record<string, string> = {};
    if (match) {
      const lines = match[1].split('\n');
      for (const line of lines) {
        const idx = line.indexOf(':');
        if (idx !== -1) {
          const key = line.slice(0, idx).trim();
          const val = line.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
          result[key] = val;
        }
      }
    }
    return result;
  };

  const getFallbackContent = (stepId: string, agentName: string, role: string, userDesc: string) => {
    const ts = new Date().toISOString();
    if (stepId === 'soul') {
      return `---
agent: "${agentName}"
file: "docs/soul.md"
version: "1.0.0"
generated_by: "Agent Forge Sub-Agent Pipeline"
created: "${ts}"
read_order: 1
---
# soul.md
You are ${agentName}, a specialized digital assistant with the role of ${role}.
You exist to: ${userDesc}.
Your core values are: Precision, Integrity, and Focus.
Your persona is highly helpful, objective, and dedicated.
`;
    }
    if (stepId === 'guidelines') {
      return `---
agent: "${agentName}"
file: "docs/guidelines.md"
version: "1.0.0"
generated_by: "Agent Forge Sub-Agent Pipeline"
created: "${ts}"
read_order: 2
---
# guidelines.md
1. Focus entirely on user requirements.
2. Structure answers step-by-step for transparency.
3. Be concise and precise.
4. Verify code or data thoroughly.
`;
    }
    if (stepId === 'prompt') {
      return `---
agent: "${agentName}"
file: "docs/prompt.md"
version: "1.0.0"
generated_by: "Agent Forge Sub-Agent Pipeline"
created: "${ts}"
read_order: 3
---
# prompt.md
You are ${agentName}, serving as ${role}.
Read all documents in /docs/ before starting.
Core Directive: ${userDesc}
`;
    }
    if (stepId === 'knowledge') {
      return `---
agent: "${agentName}"
file: "docs/knowledge.md"
version: "1.0.0"
generated_by: "Agent Forge Sub-Agent Pipeline"
created: "${ts}"
read_order: 4
---
# knowledge.md
Domain overview: specialized digital assistance for ${userDesc}.
Focus on precision and fast reasoning.
`;
    }
    if (stepId === 'tools') {
      return `---
agent: "${agentName}"
file: "docs/tools.md"
version: "1.0.0"
generated_by: "Agent Forge Sub-Agent Pipeline"
created: "${ts}"
read_order: 5
---
# tools.md
Available tools: Web Search, Code Runner, and Workspace Access.
`;
    }
    return '';
  };

  const runSubAgent = async (
    systemPrompt: string,
    messages: Array<{ role: string; content: string }>,
    retryCount = 0
  ): Promise<string> => {
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gemini-3.5-flash',
          messages: messages,
          systemPrompt: systemPrompt
        }),
      });

      if (!response.ok) {
        throw new Error(`Upstream chat error: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let output = '';

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        output += decoder.decode(value, { stream: true });
      }

      let cleaned = output.trim();
      if (cleaned.startsWith('```')) {
        // Safe strip markdown wrappers
        cleaned = cleaned.replace(/^```[a-zA-Z]*\r?\n/i, '').replace(/```$/s, '').trim();
      }
      return cleaned;
    } catch (err: any) {
      if (retryCount < 1) {
        // Wait 1s and retry
        await new Promise(r => setTimeout(r, 1000));
        return runSubAgent(systemPrompt, messages, retryCount + 1);
      }
      throw err;
    }
  };

  // Prompt input
  const [descriptionInput, setDescriptionInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  // Editable configuration fields
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [sysPrompt, setSysPrompt] = useState('');
  const [avatarEmoji, setAvatarEmoji] = useState('🤖');
  const [avatarColor, setAvatarColor] = useState('bg-violet-500');
  const [model, setModel] = useState<AgentModel>('gemini-3.5-flash');
  const [provider, setProvider] = useState<string>('google-gemini');
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [customModelText, setCustomModelText] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [skillsList, setSkillsList] = useState<AgentSkill[]>([]);
  const [toolsList, setToolsList] = useState<AgentTool[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [showPromptEditor, setShowPromptEditor] = useState(false);
  const [skillFiles, setSkillFiles] = useState<AgentSkillFile[]>([]);
  const [activeSkillFileIdx, setActiveSkillFileIdx] = useState<number>(0);
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
  const [modelSearchQuery, setModelSearchQuery] = useState('');
  const modelDropdownRef = useRef<HTMLDivElement>(null);

  const allModelEntries = useMemo(() => {
    const entries: { provider: string; providerLabel: string; label: string; value: string }[] = [];
    Object.entries(PROVIDER_MODELS).forEach(([provId, models]) => {
      const provDef = PROVIDERS.find(p => p.id === provId);
      const provLabel = provDef?.label || provId;
      models.forEach(m => {
        entries.push({ provider: provId, providerLabel: provLabel, label: m.label, value: m.value });
      });
    });
    return entries;
  }, []);

  const filteredModelEntries = modelSearchQuery
    ? allModelEntries.filter(m =>
        m.label.toLowerCase().includes(modelSearchQuery.toLowerCase()) ||
        m.providerLabel.toLowerCase().includes(modelSearchQuery.toLowerCase()) ||
        m.value.toLowerCase().includes(modelSearchQuery.toLowerCase())
      )
    : allModelEntries;

  // Click outside to close model menu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(e.target as Node)) {
        setIsModelMenuOpen(false);
        setModelSearchQuery('');
      }
    };
    if (isModelMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isModelMenuOpen]);

  const handleModelSelect = (provId: string, modelVal: string) => {
    setProvider(provId);
    setModel(modelVal as AgentModel);
    setCustomModelText('');
    if (provId === 'google-gemini') setBaseUrl('https://generativelanguage.googleapis.com/v1beta');
    else if (provId === 'openai') setBaseUrl('https://api.openai.com/v1');
    else if (provId === 'anthropic') setBaseUrl('https://api.anthropic.com/v1');
    else if (provId === 'deepseek') setBaseUrl('https://api.deepseek.com');
    else if (provId === 'groq') setBaseUrl('https://api.groq.com/openai/v1');
    else if (provId === 'opencode') setBaseUrl('https://opencode.ai/zen/v1');
    else if (provId === 'openprovider') setBaseUrl('https://openprovider.mimika.in/v1');
    else if (provId === 'kimchi') setBaseUrl('https://llm.kimchi.dev/openai/v1');
    else if (provId === 'openrouter') setBaseUrl('https://openrouter.ai/api/v1');
    else if (provId === 'together') setBaseUrl('https://api.together.xyz/v1');
    else if (provId === 'mistral') setBaseUrl('https://api.mistral.ai/v1');
    else if (provId === 'cohere') setBaseUrl('https://api.cohere.com/compatibility/v1');
    else if (provId === 'sarvamai') setBaseUrl('https://api.sarvam.ai/v1');
    else if (provId === 'kilo') setBaseUrl('https://api.kilo.ai/api/gateway');
    else if (provId === 'cline') setBaseUrl('https://api.cline.bot');
    else if (provId === 'nvidia_nim') setBaseUrl('https://integrate.api.nvidia.com/v1');
    else if (provId === 'ollama') setBaseUrl('http://localhost:11434/v1');
    else if (provId === 'ollama_cloud') setBaseUrl('https://ollama.com');
    else if (provId === 'lm-studio') setBaseUrl('http://localhost:1234/v1');
    else setBaseUrl('');
    setIsModelMenuOpen(false);
    setModelSearchQuery('');
  };

  // Initialize skills, tools, and configurations if entering edit modes or reset
  useEffect(() => {
    if (!isOpen) return;

    if (editAgent) {
      // Direct configuration edit flow
      setPhase('configure');
      setName(editAgent.name);
      setDesc(editAgent.description);
      setSysPrompt(editAgent.systemPrompt);
      setAvatarEmoji(editAgent.avatarEmoji);
      setAvatarColor(editAgent.avatarColor);
      setTags(editAgent.tags || []);
      setSkillFiles(editAgent.skillFiles || []);
      setActiveSkillFileIdx(0);
      
      const editProvider = editModelProvider(editAgent.model, editAgent.provider);
      setProvider(editProvider);
      setApiKey(editAgent.apiKey || '');
      setBaseUrl(editAgent.baseUrl || '');
      
      const standardModelsList = PROVIDER_MODELS[editProvider] || [];
      const matchesStandard = standardModelsList.some(m => m.value === editAgent.model);
      if (matchesStandard) {
        setModel(editAgent.model);
        setCustomModelText('');
      } else {
        setModel('custom');
        setCustomModelText(editAgent.model);
      }
      
      // Initialize Edit Skills list matching editAgent enabled state
      const initialSkills = ALL_AGENT_SKILLS.map(sk => {
        const found = editAgent.skills.find(s => s.id === sk.id);
        return { ...sk, enabled: found ? found.enabled : false };
      });
      setSkillsList(initialSkills);

      // Initialize Edit Tools list matching editAgent active state
      const initialTools = ALL_AGENT_TOOLS.map(tl => {
        const found = editAgent.tools.find(t => t.id === tl.id);
        return { ...tl, active: found ? found.active : false };
      });
      setToolsList(initialTools);
    } else {
      // Normal blank creation initializer
      setPhase('describe');
      setDescriptionInput('');
      setGenerationError(null);
      setName('');
      setDesc('');
      setSysPrompt('');
      setAvatarEmoji('🤖');
      setAvatarColor('bg-violet-500');
      setModel('gemini-3.5-flash');
      setProvider('google-gemini');
      setApiKey('');
      setBaseUrl('');
      setCustomModelText('');
      setTags(['assistant']);
      setSkillsList(ALL_AGENT_SKILLS.map(s => ({ ...s, enabled: false })));
      setToolsList(ALL_AGENT_TOOLS.map(t => ({ ...t, active: false })));
      setSkillFiles([]);
      setActiveSkillFileIdx(0);
    }
  }, [isOpen, editAgent]);

  // Handle ESC key close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleSkipToConfigure = () => {
    setName('New Custom Agent');
    setDesc('A customized digital assistant ready for personalized work.');
    setSysPrompt(`You are an expert digital assistant styled with specialized expertise. Act to fulfill requests with the highest fidelity.`);
    setAvatarEmoji('🧠');
    setAvatarColor('bg-violet-500');
    setModel('gemini-3.5-flash');
    setProvider('google-gemini');
    setApiKey('');
    setBaseUrl('');
    setCustomModelText('');
    setSkillsList(ALL_AGENT_SKILLS.map(sk => ({ ...sk, enabled: false })));
    setToolsList(ALL_AGENT_TOOLS.map(tl => ({ ...tl, active: false })));
    setSkillFiles([
      {
        name: 'AGENT.md',
        description: 'Core Identity & Behavior Guidelines',
        content: `# Identity\n\nYou are an expert digital assistant with custom capabilities.\n\n## Core Principles\n- Deliver highly relevant, accurate responses tailored to constraints.\n- Outline decisions step-by-step to expose logic.\n- Avoid verbose filler words.`
      }
    ]);
    setActiveSkillFileIdx(0);
    setPhase('configure');
  };

  const handleGenerateAgent = async () => {
    const promptText = descriptionInput.trim();
    if (!promptText) return;

    setPhase('generating');
    setIsGenerating(true);
    setGenerationError(null);

    // Initialize the steps visually
    const steps = [
      { id: 'soul', label: 'Soul Writer Sub-Agent', file: 'docs/soul.md', status: 'running' as const },
      { id: 'guidelines', label: 'Guidelines Writer Sub-Agent', file: 'docs/guidelines.md', status: 'idle' as const },
      { id: 'prompt', label: 'Prompt Engineer Sub-Agent', file: 'docs/prompt.md', status: 'idle' as const },
      { id: 'knowledge', label: 'Knowledge Base Sub-Agent', file: 'docs/knowledge.md', status: 'idle' as const },
      { id: 'tools', label: 'Tools Integrator Sub-Agent', file: 'docs/tools.md', status: 'idle' as const },
      { id: 'finalizer', label: 'Finalizer Sub-Agent', file: 'config.json & README.md', status: 'idle' as const }
    ];
    setGenerationSteps(steps);

    const timestamp = new Date().toISOString();
    let currentSoul = '';
    let currentGuidelines = '';
    let currentPrompt = '';
    let currentKnowledge = '';
    let currentTools = '';
    
    let inferredName = '';
    let inferredRole = '';

    const updateStepStatus = (stepId: string, status: 'running' | 'completed' | 'failed') => {
      setGenerationSteps(prev => prev.map(s => {
        if (s.id === stepId) {
          return { ...s, status };
        }
        // If we set one to complete, auto start the next one in the chain
        if (status === 'completed' && stepId === 'soul' && s.id === 'guidelines') return { ...s, status: 'running' as const };
        if (status === 'completed' && stepId === 'guidelines' && s.id === 'prompt') return { ...s, status: 'running' as const };
        if (status === 'completed' && stepId === 'prompt' && s.id === 'knowledge') return { ...s, status: 'running' as const };
        if (status === 'completed' && stepId === 'knowledge' && s.id === 'tools') return { ...s, status: 'running' as const };
        if (status === 'completed' && stepId === 'tools' && s.id === 'finalizer') return { ...s, status: 'running' as const };
        return s;
      }));
    };

    try {
      // 1. Soul Writer
      const soulPrompt = `You are the Soul Writer sub-agent.
Given the agent description below, write a soul.md file that defines:
1. IDENTITY: Who this agent is in 2–3 sentences (first-person voice)
2. VALUES: 4–6 core values as bullet points (e.g. precision, curiosity)
3. PERSONA: Communication style, tone, and personality traits
4. PURPOSE: The single most important thing this agent exists to do
5. BOUNDARIES: What this agent is NOT (prevents scope creep)

Write in second-person ("You are…") so the agent can read it as self-description.
Output ONLY the markdown content of soul.md, no preamble. Do NOT wrap in backticks or code markdown blocks.

Use the following YAML front matter at the very top of soul.md. Infer a professional, distinct AGENT_NAME and specialized ROLE based on the description, and replace {{AGENT_NAME}} and {{ROLE}} in the front matter:
---
agent: "{{AGENT_NAME}}"
role: "{{ROLE}}"
file: "docs/soul.md"
version: "1.0.0"
generated_by: "Agent Forge Sub-Agent Pipeline"
created: "${timestamp}"
read_order: 1
---

Agent description: ${promptText}
`;

      try {
        currentSoul = await runSubAgent(soulPrompt, [{ role: 'user', content: 'Generate docs/soul.md' }]);
        if (!currentSoul || currentSoul.length < 50 || !currentSoul.includes('---')) {
          throw new Error('Soul files did not meet validation standards.');
        }
        updateStepStatus('soul', 'completed');
      } catch (err) {
        console.error('Soul Writer error:', err);
        currentSoul = getFallbackContent('soul', 'AI Assistant', 'Focused Digital Assistant', promptText);
        updateStepStatus('soul', 'completed');
      }

      // Parse name & role from soul
      const parsedSoulYaml = parseYamlFrontmatter(currentSoul);
      inferredName = parsedSoulYaml.agent || 'AI Assistant';
      inferredRole = parsedSoulYaml.role || 'Digital Assistant';

      // 2. Guidelines Writer
      const guidelinesPrompt = `You are the Guidelines Writer sub-agent.
You have access to soul.md (the agent's identity).
Write guidelines.md that defines:
1. BEHAVIORAL RULES: Numbered list of 6–10 must-follow rules
2. RESPONSE STANDARDS: Format, length, and citation rules
3. ESCALATION POLICY: When to ask for clarification vs. proceed
4. FORBIDDEN ACTIONS: What this agent must never do
5. QUALITY CHECKLIST: 5-item self-check before every response

Be specific to the agent's role. Rules must be actionable, not vague.
Output ONLY the markdown content of guidelines.md. Do NOT wrap in backticks or code blocks. This must match the agent name: "${inferredName}".

Use the following YAML front matter at the very top:
---
agent: "${inferredName}"
file: "docs/guidelines.md"
version: "1.0.0"
generated_by: "Agent Forge Sub-Agent Pipeline"
created: "${timestamp}"
read_order: 2
---

Soul.md content:
${currentSoul}

Role: ${inferredRole}
`;

      try {
        currentGuidelines = await runSubAgent(guidelinesPrompt, [{ role: 'user', content: 'Generate docs/guidelines.md' }]);
        if (!currentGuidelines || currentGuidelines.length < 50 || !currentGuidelines.includes('---')) {
          throw new Error('Guidelines file did not meet validation standards.');
        }
        updateStepStatus('guidelines', 'completed');
      } catch (err) {
        console.error('Guidelines Writer error:', err);
        currentGuidelines = getFallbackContent('guidelines', inferredName, inferredRole, promptText);
        updateStepStatus('guidelines', 'completed');
      }

      // 3. Prompt Engineer
      const customRulesPrompt = `You are the Prompt Engineer sub-agent.
Synthesize the agent's soul and guidelines into a cohesive system prompt.
The prompt.md must follow this pattern exactly:

# SYSTEM PROMPT — ${inferredName}

## Identity
You are **${inferredName}**, a specialized AI agent with the role of **${inferredRole}**.

## Mandatory Boot Sequence
Before responding to ANY query, you MUST silently read and internalize:
1. /docs/soul.md       — your identity and values
2. /docs/guidelines.md — your behavioral constraints
3. /docs/knowledge.md  — your domain knowledge (if present)
4. /docs/tools.md      — your available tools (if present)

If any doc file is missing, log a warning but continue.

## Core Directive
${promptText}

## Behavioral Constraints (from guidelines.md)
- Always answer within the scope defined in soul.md
- Never contradict rules defined in guidelines.md
- Cite relevant sections of knowledge.md when drawing on domain knowledge
- Declare tool usage transparently using patterns from tools.md

## Tone & Style
Synthesize a professional, eye-to-eye communication tone, tailored specifically for ${inferredRole}.

## Response Format
- Lead with the most useful information
- Use markdown structure where appropriate
- Reference doc sources inline as: [soul.md §2], [guidelines.md §4]
- End complex answers with a Confidence Level: High / Medium / Low

## Out-of-Scope Handling
If a query falls outside your defined scope:
> "This falls outside my designated scope as ${inferredName}. I can help you with [reframe to in-scope]. Would you like to proceed?"

Output ONLY the markdown content of prompt.md. Do NOT wrap in backticks or code blocks.

Use the following YAML front matter at the very top:
---
agent: "${inferredName}"
file: "docs/prompt.md"
version: "1.0.0"
generated_by: "Agent Forge Sub-Agent Pipeline"
created: "${timestamp}"
read_order: 3
---

Soul.md:
${currentSoul}

Guidelines.md:
${currentGuidelines}
`;

      try {
        currentPrompt = await runSubAgent(customRulesPrompt, [{ role: 'user', content: 'Generate docs/prompt.md' }]);
        if (!currentPrompt || currentPrompt.length < 50 || !currentPrompt.includes('---')) {
          throw new Error('Prompt file did not meet validation.');
        }
        updateStepStatus('prompt', 'completed');
      } catch (err) {
        console.error('Prompt Engineer error:', err);
        currentPrompt = getFallbackContent('prompt', inferredName, inferredRole, promptText);
        updateStepStatus('prompt', 'completed');
      }

      // 4. Knowledge Base Writer (optional but generated elegantly)
      const knowledgePrompt = `You are the Knowledge Base sub-agent.
Generate a structured knowledge.md that includes:
1. DOMAIN OVERVIEW: Key concepts the agent must know (2–3 paragraphs)
2. KEY TERMS: Glossary of 10–20 domain-specific terms with definitions
3. REFERENCE FRAMEWORKS: Mental models or frameworks relevant to the role: "${inferredRole}"
4. COMMON QUERIES: 5–8 likely user questions with guidance on answering
5. KNOWLEDGE GAPS: Areas where the agent should explicitly say it's unsure

Output ONLY the markdown content of knowledge.md. Do NOT wrap in backticks or code blocks.
Use the following YAML front matter at the very top:
---
agent: "${inferredName}"
file: "docs/knowledge.md"
version: "1.0.0"
generated_by: "Agent Forge Sub-Agent Pipeline"
created: "${timestamp}"
read_order: 4
---

Role: ${inferredRole}
Description: ${promptText}
`;

      try {
        currentKnowledge = await runSubAgent(knowledgePrompt, [{ role: 'user', content: 'Generate docs/knowledge.md' }]);
        if (!currentKnowledge || currentKnowledge.length < 50 || !currentKnowledge.includes('---')) {
          throw new Error('Knowledge Base file did not meet validation.');
        }
        updateStepStatus('knowledge', 'completed');
      } catch (err) {
        console.error('Knowledge Base Writer error:', err);
        currentKnowledge = getFallbackContent('knowledge', inferredName, inferredRole, promptText);
        updateStepStatus('knowledge', 'completed');
      }

      // 5. Tools Integrator (optional but generated elegantly)
      const toolsPrompt = `You are the Tools Integrator sub-agent.
Write tools.md that documents:
1. AVAILABLE TOOLS: List of each tool with name, purpose, and usage pattern
2. INVOCATION RULES: When and how to call each tool
3. OUTPUT HANDLING: How to present tool results to users
4. FALLBACK BEHAVIOR: What to do if a tool fails
5. TOOL CHAINING: Approved multi-tool workflows for complex tasks

Output ONLY the markdown content of tools.md. Do NOT wrap in backticks or code blocks.
Use the following YAML front matter at the very top:
---
agent: "${inferredName}"
file: "docs/tools.md"
version: "1.0.0"
generated_by: "Agent Forge Sub-Agent Pipeline"
created: "${timestamp}"
read_order: 5
---

Enabled tools/integrations: Web Search, Code Runner, File manager, Scraper.
Agent role: ${inferredRole}
`;

      try {
        currentTools = await runSubAgent(toolsPrompt, [{ role: 'user', content: 'Generate docs/tools.md' }]);
        if (!currentTools || currentTools.length < 50 || !currentTools.includes('---')) {
          throw new Error('Tools file did not meet validation.');
        }
        updateStepStatus('tools', 'completed');
      } catch (err) {
        console.error('Tools Integrator error:', err);
        currentTools = getFallbackContent('tools', inferredName, inferredRole, promptText);
        updateStepStatus('tools', 'completed');
      }

      // 6. Finalizer
      const finalizerPrompt = `You are the Finalizer sub-agent.
You look at all generated files (soul.md, guidelines.md, prompt.md, knowledge.md, tools.md) and create the final config.json and README.md.

Output ONLY a valid raw JSON object with these exact keys:
{
  "configJson": "{ ...config.json file content as string... }",
  "readmeMd": "README.md file content as string"
}

The nested config.json schema content MUST be:
{
  "agent_name": "${inferredName}",
  "role": "${inferredRole}",
  "version": "1.0.0",
  "created": "${timestamp}",
  "docs": ["soul.md", "guidelines.md", "prompt.md", "knowledge.md", "tools.md"],
  "model": "gemini-3.5-flash",
  "boot_sequence": true,
  "scope": "${promptText.slice(0, 80).replace(/"/g, '\\"')}"
}

The README.md should be styled as an elegant agent card containing:
- Name, role, emoji
- 2-sentence description
- Capabilities list
- File tree
- How to invoke the agent

Do NOT output any markdown backticks outside the JSON. Return only the raw JSON.
`;

      let configJsonStr = '';
      let readmeMdStr = '';

      try {
        const finalizerOutput = await runSubAgent(finalizerPrompt, [{ role: 'user', content: 'Finalize config.json and README.md' }]);
        const parsed = JSON.parse(finalizerOutput);
        configJsonStr = typeof parsed.configJson === 'string' ? parsed.configJson : JSON.stringify(parsed.configJson, null, 2);
        readmeMdStr = parsed.readmeMd || '';
        updateStepStatus('finalizer', 'completed');
      } catch (err) {
        console.error('Finalizer error:', err);
        configJsonStr = JSON.stringify({
          agent_name: inferredName,
          role: inferredRole,
          version: "1.0.0",
          created: timestamp,
          docs: ["soul.md", "guidelines.md", "prompt.md", "knowledge.md", "tools.md"],
          model: "gemini-3.5-flash",
          boot_sequence: true,
          scope: promptText.slice(0, 100)
        }, null, 2);
        readmeMdStr = `# ${inferredName} Agent Card\n- **Role**: ${inferredRole}\n- **Goal**: ${promptText}\n`;
        updateStepStatus('finalizer', 'completed');
      }

      // Folder target base
      const slugName = inferredName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
      const basePath = `agents/${slugName}`;

      // Write folder files
      const filesToWrite = [
        { path: `${basePath}/docs/soul.md`, content: currentSoul },
        { path: `${basePath}/docs/guidelines.md`, content: currentGuidelines },
        { path: `${basePath}/docs/prompt.md`, content: currentPrompt },
        { path: `${basePath}/docs/knowledge.md`, content: currentKnowledge },
        { path: `${basePath}/docs/tools.md`, content: currentTools },
        { path: `${basePath}/config.json`, content: configJsonStr },
        { path: `${basePath}/README.md`, content: readmeMdStr }
      ];

      for (const file of filesToWrite) {
        try {
          await fetch('/api/fs/write', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              filePath: file.path,
              content: file.content
            })
          });
        } catch (fsWriteErr) {
          console.error("Failed writing files to disk path:", file.path, fsWriteErr);
        }
      }

      // Pre-fill editable configuration states
      setName(inferredName);
      setDesc(promptText.slice(0, 150));
      setSysPrompt(currentPrompt);
      setAvatarEmoji('🤖');
      setAvatarColor('bg-violet-500');
      setModel('gemini-3.5-flash');
      setTags(['pipeline', 'orchestrator']);

      setSkillFiles([
        { name: 'docs/soul.md', description: 'Agent Identity, Persona, and Boundaries', content: currentSoul },
        { name: 'docs/guidelines.md', description: 'Must-Follow Behavioral Rules & Response Standards', content: currentGuidelines },
        { name: 'docs/prompt.md', description: 'System Cohesive Engine Prompt Pattern', content: currentPrompt },
        { name: 'docs/knowledge.md', description: 'Structured Domain Concept Base', content: currentKnowledge },
        { name: 'docs/tools.md', description: 'Usage Rules & Handling Guides For Active Tools', content: currentTools },
        { name: 'config.json', description: 'Capabilities Schema Config settings', content: configJsonStr },
        { name: 'README.md', description: 'Specialized One-Page Profile Summary Card', content: readmeMdStr }
      ]);
      setActiveSkillFileIdx(0);

      setPhase('configure');
    } catch (e: any) {
      console.error(e);
      setGenerationError(e.message || 'We encountered a parser issue while constructing your agent. Please try again or create blank.');
      setPhase('describe');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFinishCreateOrUpdate = () => {
    if (!name.trim()) {
      alert('Please provide a name for your agent.');
      return;
    }

    const resolvedModel = (model === 'custom' ? customModelText.trim() : model) || 'gemini-3.5-flash';

    if (editAgent) {
      // Edit mode handler callback
      if (onAgentUpdated) {
        onAgentUpdated(editAgent.id, {
          name: name.trim(),
          description: desc.trim(),
          systemPrompt: sysPrompt.trim(),
          avatarEmoji,
          avatarColor,
          model: resolvedModel,
          skills: skillsList,
          tools: toolsList,
          tags,
          provider: provider,
          apiKey: apiKey.trim(),
          baseUrl: baseUrl.trim(),
          skillFiles: skillFiles,
        });
      }
      onClose();
    } else {
      // Creation mode handler callback
      const finalAgent: Agent = {
        id: crypto.randomUUID(),
        name: name.trim(),
        description: desc.trim(),
        systemPrompt: sysPrompt.trim(),
        avatarEmoji,
        avatarColor,
        model: resolvedModel,
        skills: skillsList,
        tools: toolsList,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        chatHistory: [],
        isBuiltin: false,
        tags,
        provider: provider,
        apiKey: apiKey.trim(),
        baseUrl: baseUrl.trim(),
        skillFiles: skillFiles,
      };
      onAgentCreated(finalAgent);
    }
  };

  // Checkbox limit locks
  const activeSkillsCount = skillsList.filter(s => s.enabled).length;
  const activeToolsCount = toolsList.filter(t => t.active).length;

  const toggleSkill = (id: string) => {
    setSkillsList(prev => prev.map(s => {
      if (s.id !== id) return s;
      if (!s.enabled && activeSkillsCount >= MAX_AGENT_SKILLS) return s; // Limit locked
      return { ...s, enabled: !s.enabled };
    }));
  };

  const toggleTool = (id: string) => {
    setToolsList(prev => prev.map(t => {
      if (t.id !== id) return t;
      if (!t.active && activeToolsCount >= MAX_AGENT_TOOLS) return t; // Limit locked
      return { ...t, active: !t.active };
    }));
  };

  if (!isOpen) return null;

  if (isPanel) {
    return (
      <div className="w-full h-full bg-zinc-950 flex flex-col overflow-hidden text-zinc-300">
        {/* Top Action Navigation Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-900 bg-zinc-950 w-full shrink-0">
          <div className="flex items-center gap-2">
            <Bot size={18} className="text-teal-400" />
            <h2 className="text-sm font-bold text-white select-none font-sans">
              {editAgent ? 'Edit Agent Profile' : 'Configure Custom Agent'}
            </h2>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-1 px-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-900 transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Panel Scrollable Content Container */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 text-left bg-zinc-950 custom-scrollbar">
          <div className="max-w-2xl mx-auto space-y-8 pb-12">
            {phase === 'describe' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-8"
              >
                {/* Visual Header & Welcome Badge */}
                <div className="space-y-3 text-center md:text-left select-none">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-teal-500/10 text-teal-400 border border-teal-500/20 rounded-full">
                    <Sparkles size={11} className="text-teal-400 animate-pulse" />
                    <span className="text-[9px] font-bold font-mono tracking-widest uppercase">Lumina Agent Forge v1.2</span>
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="text-xl font-black text-white font-sans tracking-tight leading-none">
                      What should your agent specialize in?
                    </h3>
                    <p className="text-xs text-zinc-400 leading-relaxed font-sans max-w-lg">
                      Give us a brief brief description of the specialized persona you need. Our creator pipeline builds the soul, guidelines, and tool configurations dynamically.
                    </p>
                  </div>
                </div>

                {/* Virtual Code/Workspace Console */}
                <div className="border border-zinc-850 bg-zinc-90 w-full rounded-2xl overflow-hidden shadow-2xl transition-all duration-350 focus-within:border-teal-500/30 focus-within:shadow-[0_0_20px_rgba(20,184,166,0.03)]">
                  {/* Console Header Bar */}
                  <div className="flex items-center justify-between px-4 py-3 bg-zinc-900 border-b border-zinc-850 select-none">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-rose-500/80" />
                        <span className="w-2 h-2 rounded-full bg-amber-500/80" />
                        <span className="w-2 h-2 rounded-full bg-emerald-500/80" />
                      </div>
                      <span className="text-[9px] font-mono tracking-wider font-bold text-zinc-500 uppercase ml-1.5">PROMPT_ENGINE_CONSTRUCT</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <span className="text-[8px] font-mono text-zinc-600">CHAR_COUNT: {descriptionInput.length}</span>
                      {descriptionInput.trim() && (
                        <button 
                          onClick={() => setDescriptionInput('')}
                          className="text-[8.5px] font-mono font-bold text-rose-400/80 hover:text-rose-400 transition-colors cursor-pointer capitalize"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Textarea Workspace area */}
                  <div className="relative bg-zinc-900/30 p-2">
                    <textarea
                      value={descriptionInput}
                      onChange={(e) => setDescriptionInput(e.target.value)}
                      placeholder="e.g. Create a technical project manager who helps with agile methodology implementation, sprint planning, and team delivery audits..."
                      className="w-full h-36 bg-transparent border-0 outline-none resize-none p-2 text-xs text-zinc-100 placeholder-zinc-650 leading-relaxed font-sans focus:ring-0 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Main Process Execution Button */}
                <div className="space-y-4">
                  <button
                    onClick={handleGenerateAgent}
                    disabled={!descriptionInput.trim() || isGenerating}
                    className={`w-full py-3 px-4 rounded-xl font-bold font-sans text-xs flex items-center justify-center gap-2.5 transition-all duration-200 ${
                      descriptionInput.trim() && !isGenerating
                        ? 'bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-black font-extrabold shadow-md active:scale-[0.99] cursor-pointer'
                        : 'bg-zinc-900 border border-zinc-850 text-zinc-550 select-none cursor-not-allowed'
                    }`}
                  >
                    <Wand2 size={13} className={descriptionInput.trim() && !isGenerating ? 'animate-pulse text-zinc-950' : 'text-zinc-600'} />
                    <span>Generate Guidelines and Core System Docs</span>
                  </button>

                  {generationError && (
                    <div className="flex items-center gap-3 text-rose-400 text-xs bg-rose-500/10 p-3.5 rounded-xl border border-rose-500/25">
                      <AlertCircle size={14} className="shrink-0" />
                      <span>{generationError}</span>
                    </div>
                  )}
                </div>

                {/* Example Blueprint Templates Matrix */}
                <div className="space-y-3.5 font-sans pt-2">
                  <div className="flex items-center gap-2 select-none px-1">
                    <span className="text-[10px] font-bold text-zinc-520 uppercase tracking-widest block">
                      💡 Preset Blueprint Templates:
                    </span>
                    <span className="text-[9px] text-zinc-600 italic">(click to preload blueprint config)</span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {EXAMPLES.map((ex, i) => (
                      <button
                        key={i}
                        onClick={() => setDescriptionInput(ex.description)}
                        className="p-4 bg-zinc-900/30 hover:bg-zinc-900/70 border border-zinc-900 hover:border-zinc-800 rounded-xl text-left transition-all group cursor-pointer space-y-2 flex flex-col justify-between"
                      >
                        <div>
                          {/* Header row with Icon & Class custom Badging */}
                          <div className="flex items-center justify-between pb-1.5 border-b border-zinc-900/40">
                            <div className="flex items-center gap-2">
                              {getExampleIcon(i)}
                              <span className="text-[10px] uppercase font-mono font-extrabold tracking-wider text-zinc-400 group-hover:text-zinc-350 transition-colors">
                                {ex.title.replace('Help me ', '')}
                              </span>
                            </div>
                            <span className="text-[8.5px] font-bold px-1.5 py-0.5 rounded-md bg-zinc-900 border border-zinc-850 text-zinc-500 uppercase tracking-wide">
                              {getExampleCategory(i)}
                            </span>
                          </div>

                          <p className="text-[10.5px] text-zinc-500 group-hover:text-zinc-450 line-clamp-2 leading-relaxed transition-colors mt-2">
                            {ex.description}
                          </p>
                        </div>

                        {/* Bottom action bar */}
                        <div className="flex items-center justify-end text-[9px] font-bold text-teal-500/60 group-hover:text-teal-400 transition-colors pt-2 border-t border-zinc-900/10">
                          <span>Apply Blueprint →</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {phase === 'generating' && (
              <div className="py-12 flex flex-col items-center justify-center space-y-6">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full border-2 border-teal-500/10 animate-ping absolute inset-0" />
                  <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-850 flex items-center justify-center text-teal-400 relative z-10 shadow-lg">
                    <RefreshCw size={18} className="animate-spin" />
                  </div>
                </div>
                
                <div className="text-center space-y-1 select-none">
                  <h4 className="text-xs font-bold text-white font-sans">Agent Forge Sub-Agent Pipeline</h4>
                  <p className="text-[10px] text-zinc-500 font-mono">
                    Executing sequential file construction...
                  </p>
                </div>

                <div className="w-full max-w-md bg-zinc-900/60 rounded-2xl border border-zinc-850 p-4 space-y-3 font-sans text-left">
                  {generationSteps.map((step) => (
                    <div key={step.id} className="flex items-center justify-between text-xs py-1">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-2 h-2 rounded-full ${
                          step.status === 'completed' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' :
                          step.status === 'running' ? 'bg-amber-500 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'bg-zinc-700'
                        }`} />
                        <div>
                          <span className={`${step.status === 'completed' ? 'text-zinc-200' : step.status === 'running' ? 'text-white font-semibold' : 'text-zinc-550'}`}>
                            {step.label}
                          </span>
                          <span className="block text-[9px] text-zinc-600 font-mono">{step.file}</span>
                        </div>
                      </div>
                      
                      <span className={`text-[10px] font-mono leading-none ${
                        step.status === 'completed' ? 'text-emerald-400' :
                        step.status === 'running' ? 'text-amber-400 animate-pulse' : 'text-zinc-600'
                      }`}>
                        {step.status === 'completed' ? 'Loaded' :
                         step.status === 'running' ? 'Generating...' : 'Pending'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {phase === 'configure' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6 animate-fade-in"
              >
                {/* Visual Avatar customization */}
                <div className="flex flex-col sm:flex-row items-center gap-5 bg-zinc-900/30 p-5 rounded-2xl border border-zinc-900">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center p-3.5 shrink-0 shadow-md ${avatarColor}`}>
                    <AgentAvatar emoji={avatarEmoji} className="w-7 h-7 text-white" />
                  </div>

                  <div className="flex-1 w-full space-y-4">
                    <div className="flex flex-col text-left font-sans">
                      <span className="text-[10px] font-bold text-zinc-550 uppercase tracking-widest mb-1.5">Avatar Emoji</span>
                      <div className="flex flex-wrap gap-1">
                        {AGENT_AVATARS.map((em) => (
                          <button
                            key={em}
                            type="button"
                            onClick={() => setAvatarEmoji(em)}
                            className={`w-7 h-7 rounded-lg p-1.5 flex items-center justify-center hover:bg-zinc-800 transition-colors cursor-pointer select-none ${
                              avatarEmoji === em ? 'bg-zinc-800 ring-1 ring-zinc-700' : 'bg-transparent'
                            }`}
                          >
                            <AgentAvatar emoji={em} className="w-4 h-4 text-zinc-305 hover:text-white" />
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col text-left font-sans">
                      <span className="text-[10px] font-bold text-zinc-550 uppercase tracking-widest mb-1.5">Background Theme</span>
                      <div className="flex flex-wrap gap-1.5">
                        {AGENT_AVATAR_COLORS.map((bg) => (
                          <button
                            key={bg}
                            type="button"
                            onClick={() => setAvatarColor(bg)}
                            className={`w-5 h-5 rounded-md hover:scale-110 transition-transform cursor-pointer select-none ${bg} ${
                              avatarColor === bg ? 'ring-2 ring-white ring-offset-2 ring-offset-zinc-950 scale-105' : ''
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Fields */}
                <div className="space-y-4">
                  <div className="flex flex-col gap-1.5 text-left font-sans">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Agent Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Code Reviewer..."
                      className="bg-zinc-900 border border-zinc-800 focus:border-zinc-750 focus:outline-none rounded-xl px-3.5 py-2.5 text-xs text-zinc-200 placeholder-zinc-600 w-full"
                    />
                  </div>

                  {/* Choose Provider, Enter API Key, and Select Model layout */}
                  <div className="border border-zinc-850 bg-zinc-900/10 rounded-2xl p-4.5 space-y-4">
                    <div className="flex items-center gap-2 select-none border-b border-zinc-900 pb-2.5">
                      <Cpu size={14} className="text-teal-400" />
                      <span className="text-xs font-bold uppercase tracking-wider text-white">LLM Engine Configuration</span>
                    </div>

                    {/* Model Selection Button (replaces provider + model selects) */}
                    <div className="flex flex-col gap-1.5 text-left font-sans">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Choose Model</label>
                      <div className="relative" ref={modelDropdownRef}>
                        <button
                          type="button"
                          onClick={() => setIsModelMenuOpen(!isModelMenuOpen)}
                          className="w-full flex items-center gap-2 px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 focus:border-zinc-750 focus:outline-none rounded-xl text-xs text-zinc-200 cursor-pointer select-none transition-all"
                        >
                          <Sparkles size={11} className="text-amber-500 shrink-0" />
                          <span className="flex-1 text-left truncate font-semibold">
                            {(() => {
                              if (customModelText) return customModelText;
                              const foundProvider = PROVIDERS.find(p => p.id === provider);
                              const foundModel = (PROVIDER_MODELS[provider] || []).find(m => m.value === model);
                              const modelLabel = foundModel?.label || model;
                              const providerLabel = foundProvider?.label || provider;
                              return `${modelLabel}  ·  ${providerLabel}`;
                            })()}
                          </span>
                          <ChevronDown size={11} className={`text-zinc-500 shrink-0 transition-transform duration-150 ${isModelMenuOpen ? 'rotate-180' : ''}`} />
                        </button>

                        <AnimatePresence>
                          {isModelMenuOpen && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95, y: 8 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95, y: 8 }}
                              transition={{ type: 'spring', stiffness: 420, damping: 28 }}
                              className="absolute left-0 right-0 mt-1 w-full bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden"
                            >
                              <div className="px-3 pt-3 pb-1 shrink-0">
                                <div className="relative group">
                                  <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-blue-500 transition-colors" />
                                  <input
                                    type="text"
                                    placeholder="Search models..."
                                    value={modelSearchQuery}
                                    onChange={(e) => setModelSearchQuery(e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                    className="w-full h-8 pl-8 pr-3 bg-zinc-800 border border-zinc-700/60 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/15 rounded-xl text-[11px] outline-none text-zinc-200 placeholder-zinc-500 font-medium transition-all"
                                  />
                                </div>
                              </div>

                              <div className="max-h-[230px] overflow-y-auto p-1.5 space-y-1 shrink-0 border-t border-zinc-800 mt-1 custom-scrollbar">
                                {filteredModelEntries.length > 0 ? (
                                  filteredModelEntries.map((item) => {
                                    const isSelected = provider === item.provider && model === item.value;
                                    return (
                                      <button
                                        key={`${item.provider}-${item.value}`}
                                        type="button"
                                        onClick={() => handleModelSelect(item.provider, item.value)}
                                        className={`w-full min-h-[36px] flex items-center gap-2 px-2 py-1.5 rounded-xl text-[11px] font-semibold transition-all border-l-[3px] cursor-pointer ${
                                          isSelected
                                            ? 'bg-zinc-800 text-white border-blue-500 shadow-sm'
                                            : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200 border-transparent'
                                        }`}
                                      >
                                        <span className="flex-1 text-left min-w-0">
                                          <span className="block truncate">{item.label}</span>
                                          <span className="block text-[8px] font-mono text-zinc-500 truncate uppercase tracking-tight">{item.providerLabel}</span>
                                        </span>
                                        {isSelected && (
                                          <Check size={11} className="text-blue-500 shrink-0" strokeWidth={3} />
                                        )}
                                      </button>
                                    );
                                  })
                                ) : (
                                  <div className="py-8 text-center text-[11px] text-zinc-500">No models match</div>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    {/* Custom Model Text Input field (Shows if model === 'custom' or LM Studio etc) */}
                    {(model === 'custom' || provider === 'lm-studio' || provider === 'custom-openai-compatible') && (
                      <div className="flex flex-col gap-1.5 text-left font-sans">
                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Custom Model ID / Identifier</label>
                        <input
                          type="text"
                          value={customModelText}
                          onChange={(e) => setCustomModelText(e.target.value)}
                          placeholder="e.g. llama3-70b-custom-q4, gpt-4-32k, my-fine-tune"
                          className="bg-zinc-900 border border-zinc-800 focus:border-zinc-750 focus:outline-none rounded-xl px-3.5 py-2.5 text-xs text-zinc-200 placeholder-zinc-650 w-full"
                        />
                      </div>
                    )}

                    {/* Selector 3: Give API Key */}
                    <div className="flex flex-col gap-1.5 text-left font-sans w-full">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                          <Key size={10} className="text-zinc-500" />
                          <span>Custom API Key / Credentials</span>
                        </label>
                        <span className="text-[9px] text-zinc-500 italic select-none">Optional. Falls back to workspace key if left blank</span>
                      </div>
                      <div className="relative">
                        <input
                          type={showApiKey ? 'text' : 'password'}
                          value={apiKey}
                          onChange={(e) => setApiKey(e.target.value)}
                          placeholder={`Enter Custom API Key...`}
                          className="w-full bg-zinc-900 border border-zinc-800 focus:border-zinc-750 focus:outline-none rounded-xl pl-9 pr-10 py-2.5 text-xs text-zinc-200 placeholder-zinc-600 font-mono"
                        />
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none">
                          <Key size={12} />
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowApiKey(!showApiKey)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                        >
                          {showApiKey ? <EyeOff size={12} /> : <Eye size={12} />}
                        </button>
                      </div>
                    </div>

                    {/* Selector 4: Custom Base URL (Only if local or custom OpenAI provider) */}
                    {['ollama', 'lm-studio', 'custom-openai-compatible'].includes(provider) && (
                      <div className="flex flex-col gap-1.5 text-left font-sans w-full">
                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                          <Server size={10} className="text-zinc-500" />
                          <span>Connection Endpoint (Base URL)</span>
                        </label>
                        <input
                          type="text"
                          value={baseUrl}
                          onChange={(e) => setBaseUrl(e.target.value)}
                          placeholder="e.g. http://localhost:11434/v1"
                          className="bg-zinc-900 border border-zinc-800 focus:border-zinc-750 focus:outline-none rounded-xl px-3.5 py-2.5 text-xs text-zinc-200 placeholder-zinc-650 font-mono w-full"
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-1.5 text-left font-sans">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Subtitle Description</label>
                    <input
                      type="text"
                      value={desc}
                      onChange={(e) => setDesc(e.target.value)}
                      placeholder="e.g. Specialized in reviews..."
                      className="bg-zinc-900 border border-zinc-800 focus:border-zinc-750 focus:outline-none rounded-xl px-3.5 py-2.5 text-xs text-zinc-200 placeholder-zinc-600"
                    />
                  </div>

                  <div className="border border-zinc-850 rounded-xl overflow-hidden bg-zinc-900/10">
                    <button
                      type="button"
                      onClick={() => setShowPromptEditor(!showPromptEditor)}
                      className="w-full px-4 py-3 flex items-center justify-between text-zinc-400 hover:text-white transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider font-sans">
                        <Terminal size={12} className="text-teal-400" />
                        <span>System instructions guidelines</span>
                      </div>
                      {showPromptEditor ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>
                    {showPromptEditor && (
                      <div className="p-4 border-t border-zinc-900">
                        <textarea
                          value={sysPrompt}
                          onChange={(e) => setSysPrompt(e.target.value)}
                          className="w-full h-44 bg-zinc-950 border border-zinc-900 focus:outline-none rounded-xl p-3 text-xs font-mono text-zinc-200 resize-none outline-none"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Subskills */}
                <div className="space-y-3 font-sans">
                  <span className="text-[10px] font-bold text-zinc-500 tracking-wider uppercase">
                    🧠 Enable Specialized Sub-Skills ({activeSkillsCount} / {MAX_AGENT_SKILLS}):
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {skillsList.map((sk) => (
                      <div
                        key={sk.id}
                        onClick={() => toggleSkill(sk.id)}
                        className={`flex items-start gap-3 p-3 rounded-xl border transition-all select-none cursor-pointer ${
                          sk.enabled
                            ? 'bg-zinc-900/80 border-[#2c241e] text-zinc-100 shadow-sm'
                            : 'bg-zinc-950/20 border-zinc-900 text-zinc-400 hover:bg-zinc-900/20'
                        }`}
                      >
                        <div className={`mt-0.5 rounded-md p-1.5 ${sk.enabled ? 'bg-teal-500/10 text-teal-400' : 'bg-zinc-900 text-zinc-500'}`}>
                          <Bot size={12} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[11px] font-bold leading-tight">{sk.name}</div>
                          <div className="text-[9px] text-zinc-500 mt-0.5">{sk.description}</div>
                        </div>
                        <div className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 mt-0.5 ${
                          sk.enabled ? 'border-teal-500 bg-teal-500 text-black' : 'border-zinc-800'
                        }`}>
                          {sk.enabled && <Check size={10} strokeWidth={3} />}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actionable Tools */}
                <div className="space-y-3 font-sans">
                  <span className="text-[10px] font-bold text-zinc-500 tracking-wider uppercase">
                    🛠️ Enable Actionable tools ({activeToolsCount} / {MAX_AGENT_TOOLS}):
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {toolsList.map((tl) => (
                      <div
                        key={tl.id}
                        onClick={() => toggleTool(tl.id)}
                        className={`flex items-start gap-3 p-3 rounded-xl border transition-all select-none cursor-pointer ${
                          tl.active
                            ? 'bg-zinc-900/80 border-[#2c241e] text-zinc-100 shadow-sm'
                            : 'bg-zinc-950/20 border-zinc-900 text-zinc-400 hover:bg-zinc-900/20'
                        }`}
                      >
                        <div className={`mt-0.5 rounded-md p-1.5 ${tl.active ? 'bg-teal-500/10 text-teal-400' : 'bg-zinc-900 text-zinc-500'}`}>
                          <Bot size={12} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[11px] font-bold leading-tight">{tl.name}</div>
                          <div className="text-[9px] text-zinc-500 mt-0.5">{tl.description}</div>
                        </div>
                        <div className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 mt-0.5 ${
                          tl.active ? 'border-teal-500 bg-teal-500 text-black' : 'border-zinc-800'
                        }`}>
                          {tl.active && <Check size={10} strokeWidth={3} />}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* Top/Bottom divider bar & controls */}
        <div className="px-6 py-4 border-t border-zinc-900 bg-zinc-950/40 flex items-center justify-between shrink-0">
          <div>
            {phase === 'configure' && !editAgent && (
              <button
                onClick={() => setPhase('describe')}
                className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-white cursor-pointer select-none font-sans"
              >
                <ArrowLeft size={12} />
                Back to Describe
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 hover:bg-zinc-900 rounded-xl text-xs text-zinc-400 font-semibold hover:text-white transition-colors cursor-pointer font-sans"
            >
              Cancel
            </button>
            {phase === 'configure' && (
              <button
                onClick={handleFinishCreateOrUpdate}
                className="px-4 py-2 bg-zinc-100 hover:bg-white text-black font-semibold text-xs rounded-xl shadow-md transition-transform active:scale-95 cursor-pointer flex items-center gap-1.5 font-sans"
              >
                <Sparkles size={12} />
                <span>{editAgent ? 'Save Profile Changes' : 'Launch Custom Agent'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-zinc-950 border border-zinc-900 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Modal Top Action Navigation Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-950 bg-zinc-90 w-full shrink-0">
          <div className="flex items-center gap-2">
            <Bot size={18} className="text-teal-400" />
            <h2 className="text-sm font-bold text-white select-none">
              {editAgent ? 'Edit Agent Profile' : 'Configure Custom Agent'}
            </h2>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-1 px-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-900 transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Dynamic Modal Content panel based on current state Phase */}
        <div className="flex-1 overflow-y-auto p-6 text-left">
          {phase === 'describe' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              {/* Visual Header & Welcome Badge */}
              <div className="space-y-3 text-center md:text-left select-none">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-teal-500/10 text-teal-400 border border-teal-500/20 rounded-full">
                  <Sparkles size={11} className="text-teal-400 animate-pulse" />
                  <span className="text-[9px] font-bold font-mono tracking-widest uppercase">Lumina Agent Forge v1.2</span>
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-xl font-black text-white font-sans tracking-tight leading-none">
                    What should your agent specialize in?
                  </h3>
                  <p className="text-xs text-zinc-500 leading-relaxed font-sans max-w-lg">
                    Give us a brief description of the specialized persona you need. Our creator pipeline builds the soul, guidelines, and tool configurations dynamically.
                  </p>
                </div>
              </div>

              {/* Virtual Code/Workspace Console */}
              <div className="border border-zinc-850 bg-zinc-90 w-full rounded-2xl overflow-hidden shadow-2xl transition-all duration-350 focus-within:border-teal-500/30 focus-within:shadow-[0_0_20px_rgba(20,184,166,0.03)]">
                {/* Console Header Bar */}
                <div className="flex items-center justify-between px-4 py-3 bg-zinc-900 border-b border-zinc-850 select-none">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-rose-500/80" />
                      <span className="w-2 h-2 rounded-full bg-amber-500/80" />
                      <span className="w-2 h-2 rounded-full bg-emerald-500/80" />
                    </div>
                    <span className="text-[9px] font-mono tracking-wider font-bold text-zinc-500 uppercase ml-1.5">PROMPT_ENGINE_CONSTRUCT</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-[8px] font-mono text-zinc-650">CHAR_COUNT: {descriptionInput.length}</span>
                    {descriptionInput.trim() && (
                      <button 
                        onClick={() => setDescriptionInput('')}
                        className="text-[8.5px] font-mono font-bold text-rose-400 hover:text-rose-350 transition-colors cursor-pointer capitalize"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                {/* Textarea Workspace area */}
                <div className="relative bg-zinc-900/30 p-2">
                  <textarea
                    value={descriptionInput}
                    onChange={(e) => setDescriptionInput(e.target.value)}
                    placeholder="e.g. Create a technical project manager who helps with agile methodology implementation, sprint planning, and team delivery audits..."
                    className="w-full h-36 bg-transparent border-0 outline-none resize-none p-2 text-xs text-zinc-100 placeholder-zinc-700 leading-relaxed font-sans focus:ring-0 focus:outline-none"
                  />
                </div>
              </div>

              {/* Main Process Execution Button */}
              <div className="space-y-4">
                <button
                  onClick={handleGenerateAgent}
                  disabled={!descriptionInput.trim() || isGenerating}
                  className={`w-full py-3 px-4 rounded-xl font-bold font-sans text-xs flex items-center justify-center gap-2.5 transition-all duration-200 ${
                    descriptionInput.trim() && !isGenerating
                      ? 'bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-black font-extrabold shadow-md active:scale-[0.99] cursor-pointer'
                      : 'bg-zinc-900 border border-zinc-850 text-zinc-650 select-none cursor-not-allowed'
                  }`}
                >
                  <Wand2 size={13} className={descriptionInput.trim() && !isGenerating ? 'animate-pulse text-zinc-950' : 'text-zinc-650'} />
                  <span>Generate Guidelines and Core System Docs</span>
                </button>

                {generationError && (
                  <div className="flex items-center gap-3 text-rose-400 text-xs bg-rose-500/10 p-3.5 rounded-xl border border-rose-500/25">
                    <AlertCircle size={14} className="shrink-0" />
                    <span>{generationError}</span>
                  </div>
                )}
              </div>

              {/* Example Blueprint Templates Matrix */}
              <div className="space-y-3.5 font-sans pt-2">
                <div className="flex items-center gap-2 select-none px-1">
                  <span className="text-[10px] font-bold text-zinc-520 uppercase tracking-widest block">
                    💡 Preset Blueprint Templates:
                  </span>
                  <span className="text-[9px] text-zinc-500/60 italic">(click to preload blueprint config)</span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-8">
                  {EXAMPLES.map((ex, i) => (
                    <button
                      key={i}
                      onClick={() => setDescriptionInput(ex.description)}
                      className="p-4 bg-zinc-900/30 hover:bg-zinc-900/70 border border-zinc-900 hover:border-zinc-800 rounded-xl text-left transition-all group cursor-pointer space-y-2 flex flex-col justify-between"
                    >
                      <div>
                        {/* Header row with Icon & Class custom Badging */}
                        <div className="flex items-center justify-between pb-1.5 border-b border-zinc-900/40">
                          <div className="flex items-center gap-2">
                            {getExampleIcon(i)}
                            <span className="text-[10px] uppercase font-mono font-extrabold tracking-wider text-zinc-400 group-hover:text-zinc-350 transition-colors">
                              {ex.title.replace('Help me ', '')}
                            </span>
                          </div>
                          <span className="text-[8.5px] font-bold px-1.5 py-0.5 rounded-md bg-zinc-900 border border-zinc-850 text-zinc-500 uppercase tracking-wide">
                            {getExampleCategory(i)}
                          </span>
                        </div>

                        <p className="text-[10.5px] text-zinc-500/80 group-hover:text-zinc-450 line-clamp-2 leading-relaxed transition-colors mt-2">
                          {ex.description}
                        </p>
                      </div>

                      {/* Bottom action bar */}
                      <div className="flex items-center justify-end text-[9px] font-bold text-teal-500/60 group-hover:text-teal-400 transition-colors pt-2 border-t border-zinc-900/10">
                        <span>Apply Blueprint →</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {phase === 'generating' && (
            <div className="py-12 flex flex-col items-center justify-center space-y-6">
              <div className="relative">
                <div className="w-12 h-12 rounded-full border-2 border-teal-500/10 animate-ping absolute inset-0" />
                <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-850 flex items-center justify-center text-teal-400 relative z-10 shadow-lg">
                  <RefreshCw size={18} className="animate-spin" />
                </div>
              </div>
              
              <div className="text-center space-y-1 select-none">
                <h4 className="text-xs font-bold text-white font-sans">Agent Forge Sub-Agent Pipeline</h4>
                <p className="text-[10px] text-zinc-500 font-mono">
                  Executing sequential file construction...
                </p>
              </div>

              <div className="w-full max-w-md bg-zinc-900/60 rounded-2xl border border-zinc-850 p-4 space-y-3 font-sans text-left">
                {generationSteps.map((step) => (
                  <div key={step.id} className="flex items-center justify-between text-xs py-1">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-2 h-2 rounded-full ${
                        step.status === 'completed' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' :
                        step.status === 'running' ? 'bg-amber-500 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'bg-zinc-700'
                      }`} />
                      <div>
                        <span className={`${step.status === 'completed' ? 'text-zinc-200' : step.status === 'running' ? 'text-white font-semibold' : 'text-zinc-550'}`}>
                          {step.label}
                        </span>
                        <span className="block text-[9px] text-zinc-650 font-mono">{step.file}</span>
                      </div>
                    </div>
                    
                    <span className={`text-[10px] font-mono leading-none ${
                      step.status === 'completed' ? 'text-emerald-400' :
                      step.status === 'running' ? 'text-amber-400 animate-pulse' : 'text-zinc-600'
                    }`}>
                      {step.status === 'completed' ? 'Loaded' :
                       step.status === 'running' ? 'Generating...' : 'Pending'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {phase === 'configure' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-6 pb-6"
            >
              {/* Profile Avatar section */}
              <div className="flex flex-col sm:flex-row items-center gap-5 bg-zinc-900/20 p-5 rounded-2xl border border-zinc-900/80">
                {/* Visual Circle Preview */}
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center p-3.5 shrink-0 shadow-md ${avatarColor}`}>
                  <AgentAvatar emoji={avatarEmoji} className="w-7 h-7 text-white" />
                </div>

                <div className="flex-1 w-full space-y-4">
                  {/* Emoji selector row */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
                      Choose Avatar Style:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {AGENT_AVATARS.map(em => (
                        <button
                          key={em}
                          type="button"
                          onClick={() => setAvatarEmoji(em)}
                          className={`w-7 h-7 rounded-lg p-1.5 flex items-center justify-center hover:bg-zinc-800 transition-colors cursor-pointer select-none ${
                            avatarEmoji === em ? 'bg-zinc-800 ring-1 ring-zinc-700' : 'bg-transparent'
                          }`}
                        >
                          <AgentAvatar emoji={em} className="w-4 h-4 text-zinc-300 hover:text-white" />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Colors selector chip list */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
                      Choose Avatar Color:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {AGENT_AVATAR_COLORS.map(colorClass => (
                        <button
                          key={colorClass}
                          type="button"
                          onClick={() => setAvatarColor(colorClass)}
                          className={`w-4 h-4 rounded-full cursor-pointer relative transition-transform hover:scale-110 ${colorClass}`}
                        >
                          {avatarColor === colorClass && (
                            <div className="absolute inset-0 flex items-center justify-center text-[8px] text-white">
                              <Check size={8} strokeWidth={3} />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Properties Information section */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block select-none">
                    Agent Name:
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. Sales Assistant"
                    className="w-full px-4 py-2 bg-zinc-900 border border-zinc-850 rounded-xl text-xs text-zinc-150 outline-none focus:border-zinc-750 transition-colors"
                  />
                </div>

                {/* Choose Provider, Enter API Key, and Select Model layout */}
                <div className="border border-zinc-850 bg-zinc-900/10 rounded-2xl p-4.5 space-y-4">
                  <div className="flex items-center gap-2 select-none border-b border-zinc-900 pb-2.5">
                    <Cpu size={14} className="text-teal-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-white">LLM Engine Configuration</span>
                  </div>

                  {/* Model Selection Button (replaces provider + model selects) */}
                  <div className="flex flex-col gap-1.5 text-left font-sans">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block select-none">Choose Model</label>
                    <div className="relative" ref={modelDropdownRef}>
                      <button
                        type="button"
                        onClick={() => setIsModelMenuOpen(!isModelMenuOpen)}
                        className="w-full flex items-center gap-2 px-3.5 py-2.5 bg-zinc-900 border border-zinc-850 hover:border-zinc-750 focus:border-zinc-750 focus:outline-none rounded-xl text-xs text-zinc-200 cursor-pointer select-none transition-all"
                      >
                        <Sparkles size={11} className="text-amber-500 shrink-0" />
                        <span className="flex-1 text-left truncate font-semibold">
                          {(() => {
                            if (customModelText) return customModelText;
                            const foundProvider = PROVIDERS.find(p => p.id === provider);
                            const foundModel = (PROVIDER_MODELS[provider] || []).find(m => m.value === model);
                            const modelLabel = foundModel?.label || model;
                            const providerLabel = foundProvider?.label || provider;
                            return `${modelLabel}  ·  ${providerLabel}`;
                          })()}
                        </span>
                        <ChevronDown size={11} className={`text-zinc-500 shrink-0 transition-transform duration-150 ${isModelMenuOpen ? 'rotate-180' : ''}`} />
                      </button>

                      <AnimatePresence>
                        {isModelMenuOpen && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 8 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 8 }}
                            transition={{ type: 'spring', stiffness: 420, damping: 28 }}
                            className="absolute left-0 right-0 mt-1 w-full bg-zinc-900 border border-zinc-850 rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden text-zinc-300"
                          >
                            <div className="px-3 pt-3 pb-1 shrink-0">
                              <div className="relative group">
                                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-blue-500 transition-colors" />
                                <input
                                  type="text"
                                  placeholder="Search models..."
                                  value={modelSearchQuery}
                                  onChange={(e) => setModelSearchQuery(e.target.value)}
                                  onClick={(e) => e.stopPropagation()}
                                  className="w-full h-8 pl-8 pr-3 bg-zinc-850 border border-zinc-750/60 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/15 rounded-xl text-[11px] outline-none text-zinc-200 placeholder-zinc-500 font-medium transition-all"
                                />
                              </div>
                            </div>

                            <div className="max-h-[230px] overflow-y-auto p-1.5 space-y-1 shrink-0 border-t border-zinc-850 mt-1 custom-scrollbar">
                              {filteredModelEntries.length > 0 ? (
                                filteredModelEntries.map((item) => {
                                  const isSelected = provider === item.provider && model === item.value;
                                  return (
                                    <button
                                      key={`${item.provider}-${item.value}`}
                                      type="button"
                                      onClick={() => handleModelSelect(item.provider, item.value)}
                                      className={`w-full min-h-[36px] flex items-center gap-2 px-2 py-1.5 rounded-xl text-[11px] font-semibold transition-all border-l-[3px] cursor-pointer ${
                                        isSelected
                                          ? 'bg-zinc-800 text-white border-blue-500 shadow-sm'
                                          : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200 border-transparent'
                                      }`}
                                    >
                                      <span className="flex-1 text-left min-w-0 font-semibold">
                                        <span className="block truncate text-zinc-200">{item.label}</span>
                                        <span className="block text-[8px] font-mono text-zinc-500 truncate uppercase tracking-tight">{item.providerLabel}</span>
                                      </span>
                                      {isSelected && (
                                        <Check size={11} className="text-blue-500 shrink-0" strokeWidth={3} />
                                      )}
                                    </button>
                                  );
                                })
                              ) : (
                                <div className="py-8 text-center text-[11px] text-zinc-500">No models match</div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* Custom Model Text Input field (Shows if model === 'custom' or LM Studio etc) */}
                  {(model === 'custom' || provider === 'lm-studio' || provider === 'custom-openai-compatible') && (
                    <div className="flex flex-col gap-1.5 text-left font-sans">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block select-none">Custom Model ID / Identifier</label>
                      <input
                        type="text"
                        value={customModelText}
                        onChange={(e) => setCustomModelText(e.target.value)}
                        placeholder="e.g. llama3-70b-custom-q4, gpt-4-32k, my-fine-tune"
                        className="bg-zinc-900 border border-zinc-850 rounded-xl px-4 py-2 text-xs text-zinc-200 outline-none focus:border-zinc-750 transition-colors w-full"
                      />
                    </div>
                  )}

                  {/* Selector 3: Give API Key */}
                  <div className="flex flex-col gap-1.5 text-left font-sans w-full">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block select-none flex items-center gap-1">
                        <Key size={10} className="text-zinc-500" />
                        <span>Custom API Key / Credentials</span>
                      </label>
                      <span className="text-[9px] text-zinc-500 italic select-none">Optional. Falls back to workspace key if left blank</span>
                    </div>
                    <div className="relative">
                      <input
                        type={showApiKey ? 'text' : 'password'}
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder={`Enter Custom API Key...`}
                        className="w-full px-4 py-2 bg-zinc-900 border border-zinc-850 rounded-xl pl-9 pr-10 text-xs text-zinc-200 outline-none focus:border-zinc-750 transition-colors font-mono"
                      />
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none">
                        <Key size={12} />
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                      >
                        {showApiKey ? <EyeOff size={11} /> : <Eye size={11} />}
                      </button>
                    </div>
                  </div>

                  {/* Selector 4: Custom Base URL (Only if local or custom OpenAI provider) */}
                  {['ollama', 'lm-studio', 'custom-openai-compatible'].includes(provider) && (
                    <div className="flex flex-col gap-1.5 text-left font-sans w-full">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block select-none flex items-center gap-1">
                        <Server size={10} className="text-zinc-500" />
                        <span>Connection Endpoint (Base URL)</span>
                      </label>
                      <input
                        type="text"
                        value={baseUrl}
                        onChange={(e) => setBaseUrl(e.target.value)}
                        placeholder="e.g. http://localhost:11434/v1"
                        className="bg-zinc-900 border border-zinc-850 rounded-xl px-4 py-2 text-xs text-zinc-200 outline-none focus:border-zinc-750 transition-colors font-mono w-full"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block select-none">
                  One-Line Description:
                </label>
                <input
                  type="text"
                  value={desc}
                  onChange={e => setDesc(e.target.value)}
                  placeholder="e.g. expert proposal writer and Consultant"
                  className="w-full px-4 py-2 bg-zinc-900 border border-zinc-850 rounded-xl text-xs text-zinc-150 outline-none focus:border-zinc-750 transition-colors"
                />
              </div>

              {/* Editable System Prompt expanded block */}
              <div className="border border-zinc-900 rounded-2xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowPromptEditor(!showPromptEditor)}
                  className="flex items-center justify-between w-full p-4 bg-zinc-900/30 hover:bg-zinc-900/60 transition-colors text-xs font-semibold text-zinc-300 cursor-pointer select-none"
                >
                  <span className="flex items-center gap-2">
                    <Terminal size={12} className="text-zinc-500" />
                    System Instructions & Guidelines
                  </span>
                  {showPromptEditor ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>

                <AnimatePresence>
                  {showPromptEditor && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: 'auto' }}
                      exit={{ height: 0 }}
                      className="overflow-hidden bg-zinc-950 border-t border-zinc-900"
                    >
                      <textarea
                        value={sysPrompt}
                        onChange={e => setSysPrompt(e.target.value)}
                        placeholder="Detailed system instructions..."
                        rows={8}
                        className="w-full p-4 bg-transparent border-0 outline-none resize-none text-[10.5px] font-mono text-zinc-400 placeholder-zinc-700 leading-relaxed"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Custom .md Skill Files Workspace */}
              <div className="border border-zinc-900 rounded-2xl overflow-hidden bg-zinc-950 p-4.5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-900 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Brain size={14} className="text-teal-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-white">Custom Skill Files Workspace</span>
                  </div>
                  <span className="self-start text-[9.5px] px-2 py-0.5 rounded bg-teal-500/10 text-teal-400 border border-teal-500/20 font-sans font-medium">
                    Claude Identity System Compatible
                  </span>
                </div>

                <p className="text-[10px] text-zinc-500 leading-normal">
                  These autonomous markdown files represent the agent's identity, instructions, and constraints. When executing, the agent directly reads and operates from these custom files.
                </p>

                {skillFiles.length === 0 ? (
                  <div className="text-center py-6 bg-zinc-900/10 rounded-xl border border-dashed border-zinc-850">
                    <span className="text-xs text-zinc-500 block">No guidelines scale files generated. Try Generating or click add below.</span>
                    <button
                      type="button"
                      onClick={() => {
                        setSkillFiles([
                          {
                            name: 'AGENT.md',
                            description: 'Core Identity & Behavioral Principles',
                            content: `# Identity\n\nYou are a customized digital assistant.\n\n## Guidelines\n- Satisfy instructions with highest developer speed.`
                          }
                        ]);
                        setActiveSkillFileIdx(0);
                      }}
                      className="mt-3 text-[10px] bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 px-3 py-1.5 rounded-lg active:scale-95 transition-transform cursor-pointer font-sans"
                    >
                      + Bootstrap Default AGENT.md
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 min-h-[260px] border border-zinc-900/80 rounded-xl overflow-hidden bg-zinc-950">
                    {/* Sidebar file explorer column */}
                    <div className="bg-zinc-900/10 border-r border-zinc-900/60 p-2 space-y-2 flex flex-col justify-between">
                      <div className="space-y-1">
                        <span className="text-[9px] font-bold text-zinc-500 tracking-wider uppercase block px-1 pb-1">FILES</span>
                        {skillFiles.map((f, i) => (
                          <div
                            key={f.name}
                            onClick={() => setActiveSkillFileIdx(i)}
                            className={`w-full group text-left p-2 rounded-lg text-[10.5px] transition-all flex items-center justify-between cursor-pointer ${
                              activeSkillFileIdx === i
                                ? 'bg-zinc-900 text-teal-400 font-semibold border-l-2 border-teal-500 pl-2'
                                : 'text-zinc-400 hover:bg-zinc-900/30 hover:text-zinc-200 pl-1.5'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 min-w-0">
                              <FileText size={12} className={activeSkillFileIdx === i ? 'text-teal-400' : 'text-zinc-500'} />
                              <span className="truncate">{f.name}</span>
                            </div>
                            {skillFiles.length > 1 && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const nextList = skillFiles.filter((_, idx) => idx !== i);
                                  setSkillFiles(nextList);
                                  setActiveSkillFileIdx(0);
                                }}
                                className="p-0.5 rounded text-zinc-650 hover:text-rose-400 hover:bg-zinc-950 transition-colors opacity-0 group-hover:opacity-100"
                              >
                                <X size={10} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const fileName = prompt('Enter name of new custom skill file (e.g. EXTRA.md):', 'RULES.md');
                          if (fileName && fileName.trim()) {
                            const trimmedName = fileName.trim();
                            const nameClean = trimmedName.toUpperCase().endsWith('.md') ? trimmedName : `${trimmedName}.md`;
                            if (skillFiles.some(f => f.name === nameClean)) {
                              alert('A skill file with that name already exists!');
                              return;
                            }
                            const nextList = [
                              ...skillFiles,
                              {
                                name: nameClean,
                                description: 'Custom domain reference instructions',
                                content: `# ${nameClean.replace('.md', '')}\n\n## Guidelines\n- Add guidelines instructions here.`
                              }
                            ];
                            setSkillFiles(nextList);
                            setActiveSkillFileIdx(nextList.length - 1);
                          }
                        }}
                        className="w-full text-center py-1.5 hover:bg-zinc-900/30 rounded-lg border border-dashed border-zinc-800 hover:border-zinc-750 text-[10px] text-zinc-500 hover:text-zinc-300 font-sans cursor-pointer transition-colors"
                      >
                        + Add Skill File
                      </button>
                    </div>

                    {/* Editor column */}
                    <div className="md:col-span-2 flex flex-col bg-zinc-950 p-3 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider">
                          Editing: <strong className="text-zinc-300 font-semibold">{skillFiles[activeSkillFileIdx]?.name}</strong>
                        </span>
                        <span className="text-[8.5px] italic text-zinc-600">Markdown format</span>
                      </div>
                      <textarea
                        value={skillFiles[activeSkillFileIdx]?.content || ''}
                        onChange={(e) => {
                          const updated = [...skillFiles];
                          if (updated[activeSkillFileIdx]) {
                            updated[activeSkillFileIdx].content = e.target.value;
                            setSkillFiles(updated);
                          }
                        }}
                        rows={10}
                        className="w-full bg-zinc-900/40 border border-zinc-900 rounded-lg p-3 text-[10.5px] font-mono text-zinc-300 placeholder-zinc-800 leading-relaxed focus:outline-none focus:ring-1 focus:ring-teal-500/20"
                      />
                      <input
                        type="text"
                        value={skillFiles[activeSkillFileIdx]?.description || ''}
                        onChange={(e) => {
                          const updated = [...skillFiles];
                          if (updated[activeSkillFileIdx]) {
                            updated[activeSkillFileIdx].description = e.target.value;
                            setSkillFiles(updated);
                          }
                        }}
                        placeholder="Short description of this file... (e.g. Strategic priority tree)"
                        className="w-full bg-zinc-900/30 border border-zinc-900 rounded-lg px-2.5 py-1 text-[9.5px] text-zinc-400 placeholder-zinc-700 outline-none focus:border-zinc-800 transition-colors"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Skills checklist Checklist */}
              <div className="space-y-2">
                <div className="flex items-center justify-between select-none">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                    Enable Agent Skills ({activeSkillsCount} / {MAX_AGENT_SKILLS} enabled)
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {skillsList.map(sk => {
                    const isDisabled = !sk.enabled && activeSkillsCount >= MAX_AGENT_SKILLS;
                    return (
                      <button
                        type="button"
                        key={sk.id}
                        onClick={() => toggleSkill(sk.id)}
                        disabled={isDisabled}
                        className={`flex items-start gap-3 p-3 rounded-xl border transition-all text-left ${
                          sk.enabled
                            ? 'bg-zinc-900/60 border-zinc-800 text-white'
                            : isDisabled
                            ? 'bg-zinc-950 border-zinc-950 text-zinc-650 opacity-30 cursor-not-allowed'
                            : 'bg-transparent border-zinc-900 text-zinc-400 hover:border-zinc-850 hover:bg-zinc-900/20 cursor-pointer'
                        }`}
                      >
                        <div className={`mt-0.5 rounded-md p-1.5 ${sk.enabled ? 'bg-teal-500/10 text-teal-400' : 'bg-zinc-900 text-zinc-500'}`}>
                          <Bot size={12} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[11px] font-bold">{sk.name}</div>
                          <p className="text-[9.5px] text-zinc-500 leading-normal mt-0.5">{sk.description}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tools Checklist */}
              <div className="space-y-2">
                <div className="flex items-center justify-between select-none">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                    Assigned Execution Tools ({activeToolsCount} / {MAX_AGENT_TOOLS} active)
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {toolsList.map(tl => {
                    const isDisabled = !tl.active && activeToolsCount >= MAX_AGENT_TOOLS;
                    return (
                      <button
                        type="button"
                        key={tl.id}
                        onClick={() => toggleTool(tl.id)}
                        disabled={isDisabled}
                        className={`flex items-start gap-3 p-3 rounded-xl border transition-all text-left ${
                          tl.active
                            ? 'bg-zinc-900/60 border-zinc-800 text-white'
                            : isDisabled
                            ? 'bg-zinc-950 border-zinc-950 text-zinc-650 opacity-30 cursor-not-allowed'
                            : 'bg-transparent border-zinc-900 text-zinc-400 hover:border-zinc-850 hover:bg-zinc-900/20 cursor-pointer'
                        }`}
                      >
                        <div className={`mt-0.5 rounded-md p-1.5 ${tl.active ? 'bg-teal-500/10 text-teal-400' : 'bg-zinc-900 text-zinc-500'}`}>
                          <Bot size={12} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[11px] font-bold">{tl.name}</div>
                          <p className="text-[9.5px] text-zinc-500 leading-normal mt-0.5">{tl.description}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Modal Bottom confirmation controls footer */}
        <div className="px-6 py-4 border-t border-zinc-900 bg-zinc-950/45 flex items-center justify-between shrink-0">
          <div>
            {phase === 'configure' && !editAgent && (
              <button
                onClick={() => setPhase('describe')}
                className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-white cursor-pointer select-none"
              >
                <ArrowLeft size={12} />
                Back to Describe
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 hover:bg-zinc-900 rounded-xl text-xs text-zinc-400 font-semibold hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>
            
            {phase === 'configure' && (
              <button
                onClick={handleFinishCreateOrUpdate}
                className="px-4 py-2 bg-zinc-100 hover:bg-white text-black font-semibold text-xs rounded-xl shadow-lg transition-transform active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                <Sparkles size={12} />
                <span>{editAgent ? 'Save Profile Changes' : 'Launch Custom Agent'}</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
