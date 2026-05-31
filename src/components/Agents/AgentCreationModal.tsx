import React, { useState, useEffect } from 'react';
import { X, Sparkles, ArrowLeft, Bot, Check, ChevronDown, ChevronUp, AlertCircle, RefreshCw, Wand2, Terminal, Key, Eye, EyeOff, Server, Globe, Cpu, Brain, FileText } from 'lucide-react';
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

const PROVIDERS = [
  { id: 'google-gemini', label: 'Google Gemini' },
  { id: 'openai', label: 'OpenAI GPT' },
  { id: 'anthropic', label: 'Anthropic Claude' },
  { id: 'deepseek', label: 'DeepSeek' },
  { id: 'groq', label: 'Groq Llama / Mixtral' },
  { id: 'opencode', label: 'OpenCode Zen' },
  { id: 'openprovider', label: 'OpenProvider' },
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

    const builderSystemInstruction = `You are an AI agent configuration generator. Given a user's description of what they want their AI agent to do, generate a complete agent configuration as a JSON object.

Output ONLY valid JSON with no markdown formatting, no backticks, no wrap text, and no explanation. The JSON must match this structure exactly:

{
  "name": "short agent name (2-3 words)",
  "description": "one sentence describing what this agent does",
  "avatarEmoji": "single most fitting emoji",
  "avatarColor": "one of: bg-violet-500, bg-blue-500, bg-teal-500, bg-emerald-500, bg-amber-500, bg-rose-500, bg-fuchsia-500, bg-sky-500",
  "systemPrompt": "detailed system prompt (100-200 words) defining persona and direct goals",
  "skills": ["web_browsing", "memory"],  // array of relevant skill IDs from: web_browsing, memory, artifacts, code_execution, image_generation, file_read_write, wiki_search, web_scraper — max 6
  "tools": ["web_search", "calculator"], // array of relevant tool IDs from: web_search, wikipedia, code_runner, scraper, image_gen, file_manager, calculator, translator, weather, news_reader — max 8
  "tags": ["productivity", "custom"],   // 2-3 lowercase tags
  "model": "gemini-3.5-flash",
  "skillFiles": [
    {
      "name": "AGENT.md",
      "description": "Core Identity & Behavioral Principles",
      "content": "# Agent Identity\\n\\n## Profile\\n[Detailed persona tailored to the user requirements. Keep it professional and immersive.]\\n\\n## Decision Hierarchy\\n[Strategic approach to satisfying instructions, priorities, and standard error fallback paths]\\n\\n## Guidelines\\n- Bulleted specific instructions representing excellence"
    },
    {
      "name": "TOOLS.md",
      "description": "Tool Execution Guide & Priorities",
      "content": "# Tool Usage Guidelines\\n\\n## Recommended Tooling\\n- [Describe how the selected systems of tools should be integrated cleanly]\\n\\n## Strategic Priorities\\n1. Check results prior to making final assumptions\\n2. Perform step-by-step mathematical or code audits"
    },
    {
      "name": "WORKFLOWS.md",
      "description": "Step-by-Step Task Execution Plans",
      "content": "# Core Workflows\\n\\n## Main Interaction Flow\\n1. Receive request and isolate requirements\\n2. Coordinate plans with AGENT.md guidelines\\n3. Execute actions using tools\\n\\n## Edge Cases & Fail-safes\\n- If tools provide empty lists, fall back gracefully."
    }
  ]
}

Ensure that skillFiles contains highly detailed custom markdown content. Do NOT use fake placeholders or 'fill in later'. Custom-write the files completely to map the exact agent's domain and responsibilities.`;

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gemini-3.5-flash',
          messages: [{ role: 'user', content: `Please create an agent for this request: "${promptText}"` }],
          systemPrompt: builderSystemInstruction
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || 'AI agent generation service returned an error status.');
      }

      // Read complete stream response for the JSON output
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let streamResultOutput = '';

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        const decodeText = decoder.decode(value, { stream: true });
        streamResultOutput += decodeText;
      }

      // Ensure JSON parse-safety by stripping backticks blocks safely
      let cleanedJsonText = streamResultOutput.trim();
      if (cleanedJsonText.startsWith('```')) {
        cleanedJsonText = cleanedJsonText.replace(/^```(json)*/i, '').replace(/```$/s, '').trim();
      }

      const generatedConfig = JSON.parse(cleanedJsonText);

      // Inject values to the configuration states
      setName(generatedConfig.name || 'AI Assistant');
      setDesc(generatedConfig.description || 'Specialized AI assistant');
      setSysPrompt(generatedConfig.systemPrompt || '');
      setAvatarEmoji(generatedConfig.avatarEmoji || '🤖');
      setAvatarColor(generatedConfig.avatarColor || 'bg-violet-500');
      setModel(generatedConfig.model || 'gemini-3.5-flash');
      setTags(generatedConfig.tags || ['custom']);

      // Map enabled checklist values
      const skillIds: string[] = generatedConfig.skills || [];
      const toolIds: string[] = generatedConfig.tools || [];

      setSkillsList(ALL_AGENT_SKILLS.map(sk => ({
        ...sk,
        enabled: skillIds.includes(sk.id)
      })));

      setToolsList(ALL_AGENT_TOOLS.map(tl => ({
        ...tl,
        active: toolIds.includes(tl.id)
      })));

      // Map generated skill files
      const generatedSkillFiles: AgentSkillFile[] = generatedConfig.skillFiles || [];
      if (generatedSkillFiles.length === 0) {
        generatedSkillFiles.push({
          name: 'AGENT.md',
          description: 'Core Identity & Behavioral Principles',
          content: `# Identity\n\nYou are ${generatedConfig.name || 'AI Assistant'}.\n\n## Guidelines\n- Deliver highly relevant, accurate responses tailored to constraints.`
        });
      }
      setSkillFiles(generatedSkillFiles);
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
            {phase === 'describe' && !editAgent && (
              <button
                onClick={handleSkipToConfigure}
                className="text-[11px] font-semibold text-zinc-400 hover:text-white px-3 py-1.5 rounded-xl border border-zinc-800 hover:bg-zinc-900 transition-all cursor-pointer font-sans"
              >
                Create Blank
              </button>
            )}
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
                className="space-y-6"
              >
                <div className="space-y-2 select-none text-center">
                  <h3 className="text-lg font-extrabold text-white font-sans tracking-tight">
                    What should your agent do?
                  </h3>
                  <p className="text-xs text-zinc-400 leading-relaxed max-w-md mx-auto font-sans">
                    Provide a brief description of what you desire this custom assistant to specialize in, and our AI model will write its guidelines!
                  </p>
                </div>

                <div className="relative">
                  <textarea
                    value={descriptionInput}
                    onChange={(e) => setDescriptionInput(e.target.value)}
                    placeholder="e.g. Create a technical project manager who helps with agile methodologies..."
                    className="w-full h-40 bg-zinc-900/40 border border-zinc-800 focus:border-zinc-700 focus:outline-none rounded-2xl p-4 text-xs text-zinc-105 placeholder-zinc-500 focus:ring-1 focus:ring-teal-500/30 transition-all resize-none font-sans"
                  />
                  {descriptionInput.trim() && (
                    <button
                      onClick={handleGenerateAgent}
                      disabled={isGenerating}
                      className="absolute bottom-4 right-4 p-2 bg-teal-500 hover:bg-teal-400 text-black rounded-xl shadow-lg transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                    >
                      {isGenerating ? <RefreshCw size={14} className="animate-spin" /> : <Wand2 size={14} />}
                    </button>
                  )}
                </div>

                {generationError && (
                  <div className="flex items-center gap-2 text-rose-400 text-xs bg-rose-500/10 p-3.5 rounded-xl border border-rose-500/25">
                    <AlertCircle size={14} />
                    <span>{generationError}</span>
                  </div>
                )}

                {/* Example Options Grid */}
                <div className="space-y-3 font-sans">
                  <span className="text-[10px] font-bold text-zinc-550 tracking-wider uppercase flex items-center gap-1.5 select-none px-1">
                    💡 Try these examples:
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {EXAMPLES.map((ex, i) => (
                      <button
                        key={i}
                        onClick={() => setDescriptionInput(ex.description)}
                        className="p-4 bg-zinc-900/40 hover:bg-zinc-900/80 border border-zinc-900/80 hover:border-zinc-805 rounded-xl text-left transition-all group cursor-pointer"
                      >
                        <h4 className="text-xs font-bold text-zinc-200 group-hover:text-white mb-1 transition-colors leading-snug">
                          {ex.title}
                        </h4>
                        <p className="text-[10px] text-zinc-500 group-hover:text-zinc-400 line-clamp-2 leading-relaxed transition-colors">
                          {ex.description}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {phase === 'generating' && (
              <div className="py-24 flex flex-col items-center justify-center space-y-4">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full border-2 border-teal-500/10 animate-ping absolute inset-0" />
                  <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-teal-400 relative z-10 shadow-lg">
                    <RefreshCw size={18} className="animate-spin" />
                  </div>
                </div>
                <div className="text-center space-y-1">
                  <h4 className="text-xs font-bold text-white font-sans">Assembling Behavior Profile</h4>
                  <p className="text-[10px] text-zinc-550 max-w-xs font-mono leading-relaxed">
                    AI model is reading details, generating personalized guidelines, tools, and profile styles...
                  </p>
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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Selector 1: Provider */}
                      <div className="flex flex-col gap-1.5 text-left font-sans">
                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Provider</label>
                        <div className="relative">
                          <select
                            value={provider}
                            onChange={(e) => {
                              const nextProv = e.target.value;
                              setProvider(nextProv);
                              const firstModel = PROVIDER_MODELS[nextProv]?.[0]?.value || 'custom';
                              setModel(firstModel);
                              setCustomModelText('');
                              if (nextProv === 'google-gemini') setBaseUrl('https://generativelanguage.googleapis.com/v1beta');
                              else if (nextProv === 'openai') setBaseUrl('https://api.openai.com/v1');
                              else if (nextProv === 'anthropic') setBaseUrl('https://api.anthropic.com/v1');
                              else if (nextProv === 'deepseek') setBaseUrl('https://api.deepseek.com');
                              else if (nextProv === 'groq') setBaseUrl('https://api.groq.com/openai/v1');
                              else if (nextProv === 'opencode') setBaseUrl('https://opencode.ai/zen/v1');
                              else if (nextProv === 'openprovider') setBaseUrl('https://openprovider.mimika.in/v1');
                              else if (nextProv === 'openrouter') setBaseUrl('https://openrouter.ai/api/v1');
                              else if (nextProv === 'together') setBaseUrl('https://api.together.xyz/v1');
                              else if (nextProv === 'mistral') setBaseUrl('https://api.mistral.ai/v1');
                              else if (nextProv === 'cohere') setBaseUrl('https://api.cohere.com/compatibility/v1');
                              else if (nextProv === 'sarvamai') setBaseUrl('https://api.sarvam.ai/v1');
                              else if (nextProv === 'kilo') setBaseUrl('https://api.kilo.ai/api/gateway');
                              else if (nextProv === 'cline') setBaseUrl('https://api.cline.bot');
                              else if (nextProv === 'nvidia_nim') setBaseUrl('https://integrate.api.nvidia.com/v1');
                              else if (nextProv === 'ollama') setBaseUrl('http://localhost:11434/v1');
                              else if (nextProv === 'ollama_cloud') setBaseUrl('https://ollama.com');
                              else if (nextProv === 'lm-studio') setBaseUrl('http://localhost:1234/v1');
                              else setBaseUrl('');
                            }}
                            className="w-full bg-zinc-900 border border-zinc-800 focus:border-zinc-750 focus:outline-none rounded-xl px-3.5 py-2.5 text-xs text-zinc-200 appearance-none cursor-pointer text-left"
                          >
                            {PROVIDERS.map(p => (
                              <option key={p.id} value={p.id}>{p.label}</option>
                            ))}
                          </select>
                          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
                            <ChevronDown size={12} />
                          </div>
                        </div>
                      </div>

                      {/* Selector 2: Choose/Select Model */}
                      <div className="flex flex-col gap-1.5 text-left font-sans">
                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Select Model</label>
                        <div className="relative">
                          <select
                            value={model}
                            onChange={(e) => {
                              setModel(e.target.value);
                              if (e.target.value !== 'custom') {
                                setCustomModelText('');
                              }
                            }}
                            className="w-full bg-zinc-900 border border-zinc-800 focus:border-zinc-750 focus:outline-none rounded-xl px-3.5 py-2.5 text-xs text-zinc-200 appearance-none cursor-pointer text-left"
                          >
                            {(PROVIDER_MODELS[provider] || []).map(m => (
                              <option key={m.value} value={m.value}>{m.label}</option>
                            ))}
                          </select>
                          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
                            <ChevronDown size={12} />
                          </div>
                        </div>
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
            {phase === 'describe' && !editAgent && (
              <button
                onClick={handleSkipToConfigure}
                className="text-[11px] font-semibold text-zinc-400 hover:text-white px-3 py-1.5 rounded-xl border border-zinc-800 hover:bg-zinc-900 transition-all cursor-pointer"
              >
                Create Blank
              </button>
            )}
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
              className="space-y-6"
            >
              <div className="space-y-2 select-none text-center">
                <h3 className="text-lg font-extrabold text-white font-sans tracking-tight">
                  What should your agent do?
                </h3>
                <p className="text-xs text-zinc-500 leading-relaxed max-w-md mx-auto">
                  Provide a brief description of what you desire this custom assistant to specialize in, and our AI model will write its behavioral guidelines!
                </p>
              </div>

              {/* Chat Input Text Area */}
              <div className="relative bg-zinc-900/80 rounded-2xl border border-zinc-850 overflow-hidden focus-within:border-zinc-750 transition-colors">
                <textarea
                  value={descriptionInput}
                  onChange={e => setDescriptionInput(e.target.value)}
                  placeholder="e.g. Create a technical project manager who helps with agile methodologies..."
                  rows={4}
                  className="w-full pl-4 pr-12 py-3.5 bg-transparent border-0 outline-none resize-none text-xs text-zinc-150 leading-relaxed placeholder-zinc-600"
                />
                
                {/* Submit Indicator button inside area */}
                <div className="absolute right-3 bottom-3">
                  <button
                    onClick={handleGenerateAgent}
                    disabled={!descriptionInput.trim() || isGenerating}
                    className={`p-2.5 rounded-xl transition-all duration-200 cursor-pointer ${
                      descriptionInput.trim() && !isGenerating
                        ? 'bg-zinc-100 text-black hover:bg-white hover:scale-105'
                        : 'bg-zinc-850 text-zinc-650 opacity-40 cursor-not-allowed'
                    }`}
                  >
                    <Wand2 size={12} className="animate-pulse" />
                  </button>
                </div>
              </div>

              {generationError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl flex items-start gap-2 max-w-full">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <span>{generationError}</span>
                </div>
              )}

              {/* Six Fixed Suggesters */}
              <div className="space-y-3">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block select-none">
                  💡 Try these examples:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-8">
                  {EXAMPLES.map((ex, idx) => (
                    <button
                      key={idx}
                      onClick={() => setDescriptionInput(ex.description)}
                      className="text-left p-4 rounded-2xl bg-zinc-900/40 border border-zinc-900/80 hover:border-zinc-850 hover:bg-zinc-900/80 transition-all duration-200 cursor-pointer space-y-1.5"
                    >
                      <h4 className="text-xs font-semibold text-zinc-200 line-clamp-1">
                        {ex.title}
                      </h4>
                      <p className="text-[10px] text-zinc-500/80 leading-relaxed line-clamp-2">
                        {ex.description}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {phase === 'generating' && (
            <div className="py-16 flex flex-col items-center justify-center space-y-6 text-center select-none">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
                className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full"
              />
              <div className="space-y-1.5">
                <h4 className="text-sm font-bold text-white font-sans">
                  Assembling your agent...
                </h4>
                <p className="text-xs text-zinc-500 leading-relaxed max-w-sm">
                  We are formatting system prompt logs, analyzing requirements, and compiling specialized tools constraints. This might take a moment.
                </p>
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Selector 1: Provider */}
                    <div className="flex flex-col gap-1.5 text-left font-sans">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block select-none">Provider</label>
                      <div className="relative">
                        <select
                          value={provider}
                          onChange={(e) => {
                            const nextProv = e.target.value;
                            setProvider(nextProv);
                            const firstModel = PROVIDER_MODELS[nextProv]?.[0]?.value || 'custom';
                            setModel(firstModel);
                            setCustomModelText('');
                            if (nextProv === 'google-gemini') setBaseUrl('https://generativelanguage.googleapis.com/v1beta');
                            else if (nextProv === 'openai') setBaseUrl('https://api.openai.com/v1');
                            else if (nextProv === 'anthropic') setBaseUrl('https://api.anthropic.com/v1');
                            else if (nextProv === 'deepseek') setBaseUrl('https://api.deepseek.com');
                            else if (nextProv === 'groq') setBaseUrl('https://api.groq.com/openai/v1');
                            else if (nextProv === 'opencode') setBaseUrl('https://opencode.ai/zen/v1');
                            else if (nextProv === 'openprovider') setBaseUrl('https://openprovider.mimika.in/v1');
                            else if (nextProv === 'openrouter') setBaseUrl('https://openrouter.ai/api/v1');
                            else if (nextProv === 'together') setBaseUrl('https://api.together.xyz/v1');
                            else if (nextProv === 'mistral') setBaseUrl('https://api.mistral.ai/v1');
                            else if (nextProv === 'cohere') setBaseUrl('https://api.cohere.com/compatibility/v1');
                            else if (nextProv === 'sarvamai') setBaseUrl('https://api.sarvam.ai/v1');
                            else if (nextProv === 'kilo') setBaseUrl('https://api.kilo.ai/api/gateway');
                            else if (nextProv === 'cline') setBaseUrl('https://api.cline.bot');
                            else if (nextProv === 'nvidia_nim') setBaseUrl('https://integrate.api.nvidia.com/v1');
                            else if (nextProv === 'ollama') setBaseUrl('http://localhost:11434/v1');
                            else if (nextProv === 'ollama_cloud') setBaseUrl('https://ollama.com');
                            else if (nextProv === 'lm-studio') setBaseUrl('http://localhost:1234/v1');
                            else setBaseUrl('');
                          }}
                          className="w-full px-4 py-2 bg-zinc-900 border border-zinc-850 rounded-xl text-xs text-zinc-200 outline-none focus:border-zinc-750 transition-colors cursor-pointer appearance-none text-left"
                        >
                          {PROVIDERS.map(p => (
                            <option key={p.id} value={p.id}>{p.label}</option>
                          ))}
                        </select>
                        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
                          <ChevronDown size={11} />
                        </div>
                      </div>
                    </div>

                    {/* Selector 2: Choose/Select Model */}
                    <div className="flex flex-col gap-1.5 text-left font-sans">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block select-none">Select Model</label>
                      <div className="relative">
                        <select
                          value={model}
                          onChange={(e) => {
                            setModel(e.target.value);
                            if (e.target.value !== 'custom') {
                              setCustomModelText('');
                            }
                          }}
                          className="w-full px-4 py-2 bg-zinc-900 border border-zinc-850 rounded-xl text-xs text-zinc-200 outline-none focus:border-zinc-750 transition-colors cursor-pointer appearance-none text-left"
                        >
                          {(PROVIDER_MODELS[provider] || []).map(m => (
                            <option key={m.value} value={m.value}>{m.label}</option>
                          ))}
                        </select>
                        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
                          <ChevronDown size={11} />
                        </div>
                      </div>
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
