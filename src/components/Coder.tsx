import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Terminal, 
  Settings, 
  FolderPlus, 
  X, 
  Loader2, 
  Check, 
  ChevronDown, 
  ArrowUp,
  Code,
  ArrowLeft,
  Settings2,
  Cpu,
  CornerDownRight,
  Sparkles,
  ChevronRight,
  Folder,
  FolderOpen,
  FileCode,
  FileJson,
  FileText,
  Image as ImageIcon,
  FileKey,
  Save,
  Plus,
  Search,
  Sidebar
} from 'lucide-react';
import Markdown from 'react-markdown';
import MonacoEditor from '@monaco-editor/react';
import { CoderSettingsPanel } from './CoderSettingsPanel';

export interface CodingAgentProps {
  isDark: boolean;
  theme: any;
  agentWorkspace: string | null;
  setAgentWorkspace: (path: string | null) => void;
  agentPlan: string | null;
  setAgentPlan: (plan: string | null) => void;
  agentTodos: { id: string; title: string; status: 'pending' | 'success' | 'running' | 'failed' | 'waiting' }[];
  setAgentTodos: React.Dispatch<React.SetStateAction<{ id: string; title: string; status: 'pending' | 'success' | 'running' | 'failed' | 'waiting' }[]>>;
  agentRunning: boolean;
  setAgentRunning: (running: boolean) => void;
  agentStep: number;
  setAgentStep: React.Dispatch<React.SetStateAction<number>>;
  agentLogs: string[];
  setAgentLogs: React.Dispatch<React.SetStateAction<string[]>>;
  agentSelectedProvider: string;
  setAgentSelectedProvider: (p: string) => void;
  agentApiKeys: any;
  setAgentApiKeys: (keys: any) => void;
  setIsSettingsOpen: (open: boolean) => void;
  setActiveSettingsTab: (tab: any) => void;
  onExitMode?: () => void;
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
}

export interface FileNode {
  name: string;
  path: string;
  relativePath: string;
  isDirectory: boolean;
  size?: number;
}

export interface TreeNode {
  name: string;
  path: string;
  relativePath: string;
  isDirectory: boolean;
  size?: number;
  children: TreeNode[];
}

export const DEFAULT_FALLBACK_MODELS = [
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: 'Google Gemini', icon: '✨', color: 'text-amber-500' },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'Google Gemini', icon: '⚡', color: 'text-orange-500' },
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', provider: 'Google Gemini', icon: '✨', color: 'text-amber-400' },
  { id: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'Anthropic', icon: '🧠', color: 'text-purple-500' },
  { id: 'claude-3-opus', name: 'Claude 3 Opus', provider: 'Anthropic', icon: '🔮', color: 'text-indigo-500' },
  { id: 'gpt-4o', name: 'GPT-4o Heavy', provider: 'OpenAI', icon: '🚀', color: 'text-emerald-500' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'OpenAI', icon: '⚡', color: 'text-emerald-400' },
  { id: 'deepseek-coder', name: 'DeepSeek Coder', provider: 'DeepSeek', icon: '🐳', color: 'text-blue-400' },
  { id: 'deepseek-chat', name: 'DeepSeek Chat', provider: 'DeepSeek', icon: '💬', color: 'text-cyan-500' },
  { id: 'groq-llama3-70b', name: 'Llama 3 70B (Groq)', provider: 'Groq', icon: '⚡', color: 'text-red-500' },
  { id: 'openrouter-best', name: 'Auto Router (OpenRouter)', provider: 'OpenRouter', icon: '🌍', color: 'text-fuchsia-400' },
  { id: 'together-llama-3', name: 'Llama 3 (Together AI)', provider: 'Together AI', icon: '☀️', color: 'text-yellow-500' },
  { id: 'mistral-large', name: 'Mistral Large', provider: 'Mistral', icon: '🌌', color: 'text-[#e57e25]' },
  { id: 'ollama-cloud', name: 'Llama 4 (Ollama Cloud)', provider: 'Ollama Cloud', icon: '☁️', color: 'text-sky-400' },
  { id: 'ollama-local', name: 'Local Model (Ollama Local)', provider: 'Ollama Local', icon: '🏠', color: 'text-zinc-500' },
  { id: 'lm-studio-local', name: 'LM Studio Link', provider: 'LM Studio', icon: '💻', color: 'text-cyan-500' },
  { id: 'nvidia-nim', name: 'NIM (NVIDIA)', provider: 'NVIDIA NIM', icon: '🟢', color: 'text-green-600' },
  { id: 'cohere-command', name: 'Command R+ (Cohere)', provider: 'Cohere', icon: '🌐', color: 'text-teal-500' },
  { id: 'sarvam-ai', name: 'Sarvam Indica', provider: 'Sarvam AI', icon: '🇮🇳', color: 'text-orange-600' },
  { id: 'kilo-code', name: 'Kilo Gateway Plus', provider: 'Kilo Code', icon: '🔑', color: 'text-rose-500' },
  { id: 'opencode-zen', name: 'OpenCode Zen-1.0', provider: 'OpenCode', icon: '🌸', color: 'text-[#cc5a37]' },
  { id: 'cline-agent', name: 'Cline Agent Core', provider: 'Cline', icon: '🤖', color: 'text-indigo-500' },
  { id: 'custom-endpoint', name: 'Custom Gateway (Local)', provider: 'Custom API', icon: '⚙️', color: 'text-zinc-400' },
];

export const CodingAgentWorkspace = ({
  isDark,
  theme,
  agentWorkspace,
  setAgentWorkspace,
  agentPlan,
  setAgentPlan,
  agentTodos,
  setAgentTodos,
  agentRunning,
  setAgentRunning,
  agentStep,
  setAgentStep,
  agentLogs,
  setAgentLogs,
  agentSelectedProvider,
  setAgentSelectedProvider,
  agentApiKeys,
  setAgentApiKeys,
  setIsSettingsOpen,
  setActiveSettingsTab,
  onExitMode,
  isSidebarOpen,
  onToggleSidebar
}: CodingAgentProps) => {
  const [promptInput, setPromptInput] = useState('');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [customPathInput, setCustomPathInput] = useState('');
  const [isFolderPickerOpen, setIsFolderPickerOpen] = useState(false);
  const [isPanelSettingsOpen, setIsPanelSettingsOpen] = useState(false);
  const [expandedTodos, setExpandedTodos] = useState(true);
  const [logSearch, setLogSearch] = useState('');
  const [terminalTheme, setTerminalTheme] = useState<'phosphor' | 'amber' | 'cyberpunk'>('cyberpunk');
  const [autoscrollEnabled, setAutoscrollEnabled] = useState(true);

  // Model Selector Dropdown & Search setup
  const [modelSearchQuery, setModelSearchQuery] = useState('');
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [loadedModels, setLoadedModels] = useState<{ id: string; name: string; provider: string; icon: string; color: string }[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const modelDropdownRef = useRef<HTMLDivElement>(null);

  // Auto load model list same like Lumina Chat
  useEffect(() => {
    const loadBridgeModels = async () => {
      const bridgeUrl = localStorage.getItem('lumina_llama_url') || 'http://localhost:8089';
      const bridgeApiKey = localStorage.getItem('lumina_llama_key') || '';
      try {
        setIsLoadingModels(true);
        const response = await fetch('/api/bridge/models', {
          method: 'GET',
          headers: {
            'X-Bridge-Url': bridgeUrl.replace(/\/+$/, ''),
            'X-Api-Key': bridgeApiKey,
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
              provider: 'Llama Bridge',
              icon: '🔗',
              color: 'text-blue-500'
            }));
            if (fetchedModels.length > 0) {
              setLoadedModels(fetchedModels);
            }
          } else {
            console.warn('Expected JSON response from /api/bridge/models, got non-JSON content type:', contentType);
          }
        }
      } catch (err) {
        console.error('Failed to auto-load bridge models in Coder:', err);
      } finally {
        setIsLoadingModels(false);
      }
    };

    loadBridgeModels();
  }, []);

  // Outside click to close model selector dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(e.target as Node)) {
        setIsModelDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const allModels = useMemo(() => {
    return [...loadedModels, ...DEFAULT_FALLBACK_MODELS];
  }, [loadedModels]);

  const filteredModels = useMemo(() => {
    return allModels.filter(m => 
      m.name.toLowerCase().includes(modelSearchQuery.toLowerCase()) ||
      m.provider.toLowerCase().includes(modelSearchQuery.toLowerCase())
    );
  }, [allModels, modelSearchQuery]);

  // Tree Structures and Monaco Helpers
  const [explorerFiles, setExplorerFiles] = useState<FileNode[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [editorTabs, setEditorTabs] = useState<{ path: string; name: string; content: string; isModified: boolean }[]>([]);
  const [activeTabPath, setActiveTabPath] = useState<string | null>(null);
  const [activeCenterTab, setActiveCenterTab] = useState<'pipeline' | 'editor'>('pipeline');
  
  const terminalBottomRef = useRef<HTMLDivElement>(null);

  const mockPredefinedDirs = [
    { path: '.', description: 'Current Active Project Workspace (Recommended)' },
    { path: './src', description: 'Source code directory' },
    { path: '/tmp/isolated-lab', description: 'Clean isolated temporary sandbox environment' }
  ];

  const fetchWorkspaceFiles = useCallback(async () => {
    if (!agentWorkspace) return;
    try {
      const response = await fetch('/api/fs/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderPath: agentWorkspace })
      });
      const data = await response.json();
      if (data.files) {
        setExplorerFiles(data.files);
      }
    } catch (err) {
      console.error("Error listing workspace files:", err);
    }
  }, [agentWorkspace]);

  useEffect(() => {
    fetchWorkspaceFiles();
  }, [agentWorkspace, fetchWorkspaceFiles]);

  const handleOpenFile = async (filePath: string, name: string) => {
    try {
      const response = await fetch('/api/fs/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath })
      });
      const data = await response.json();
      if (data.error) {
        console.error("Failed to read file:", data.error);
        return;
      }
      
      const existing = editorTabs.find(tab => tab.path === filePath);
      if (!existing) {
        setEditorTabs(prev => [...prev, {
          path: filePath,
          name,
          content: data.content,
          isModified: false
        }]);
      }
      setActiveTabPath(filePath);
      setActiveCenterTab('editor');
    } catch (err) {
      console.error("Open file error:", err);
    }
  };

  const handleCloseTab = (filePath: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = editorTabs.filter(tab => tab.path !== filePath);
    setEditorTabs(updated);
    if (activeTabPath === filePath) {
      if (updated.length > 0) {
        setActiveTabPath(updated[updated.length - 1].path);
      } else {
        setActiveTabPath(null);
        setActiveCenterTab('pipeline');
      }
    }
  };

  const handleEditorChange = (newContent: string | undefined) => {
    if (newContent === undefined || !activeTabPath) return;
    setEditorTabs(prev => prev.map(tab => tab.path === activeTabPath ? { ...tab, content: newContent, isModified: true } : tab));
  };

  const handleSaveActiveFile = async () => {
    const activeTab = editorTabs.find(tab => tab.path === activeTabPath);
    if (!activeTab) return;
    try {
      const response = await fetch('/api/fs/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: activeTab.path, content: activeTab.content })
      });
      const data = await response.json();
      if (data.success) {
        setEditorTabs(prev => prev.map(tab => tab.path === activeTabPath ? { ...tab, isModified: false } : tab));
        setAgentLogs(prev => [...prev, `[editor] Saved file: ${activeTab.name} successfully.`]);
        fetchWorkspaceFiles();
      } else {
        console.error("Save error:", data.error);
      }
    } catch (err) {
      console.error("Save fetch failed:", err);
    }
  };

  const handleCreateFile = async (name: string) => {
    if (!agentWorkspace) return;
    const filePath = `${agentWorkspace}/${name}`;
    try {
      const response = await fetch('/api/fs/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath, isDirectory: false })
      });
      const data = await response.json();
      if (data.success) {
        setAgentLogs(prev => [...prev, `[explorer] Created file: ${name}`]);
        fetchWorkspaceFiles();
        handleOpenFile(filePath, name);
      } else {
        console.error("Create error:", data.error);
      }
    } catch (err) {
      console.error("Create failed:", err);
    }
  };

  // Helper tree builders
  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (['ts', 'tsx', 'js', 'jsx'].includes(ext || '')) return <FileCode size={13} className="text-blue-400 shrink-0" />;
    if (['json'].includes(ext || '')) return <FileJson size={13} className="text-yellow-500 shrink-0" />;
    if (['md'].includes(ext || '')) return <FileText size={13} className="text-emerald-400 shrink-0" />;
    if (['png', 'jpg', 'jpeg', 'svg', 'webp', 'gif'].includes(ext || '')) return <ImageIcon size={13} className="text-purple-400 shrink-0" />;
    if (['css', 'less', 'scss'].includes(ext || '')) return <FileCode size={13} className="text-pink-400 shrink-0" />;
    if (['env', 'config'].includes(ext || '')) return <FileKey size={13} className="text-amber-500 shrink-0" />;
    return <FileText size={13} className="text-zinc-400 shrink-0" />;
  };

  const getMonacoLanguage = (filePath: string) => {
    const ext = filePath.split('.').pop()?.toLowerCase();
    if (ext === 'js' || ext === 'jsx') return 'javascript';
    if (ext === 'ts' || ext === 'tsx') return 'typescript';
    if (ext === 'json') return 'json';
    if (ext === 'html') return 'html';
    if (ext === 'css') return 'css';
    if (ext === 'md') return 'markdown';
    return 'plaintext';
  };

  const workspaceTree = useMemo(() => {
    const root: TreeNode = { name: 'root', path: '', relativePath: '', isDirectory: true, children: [] };
    const map: Record<string, TreeNode> = { '': root };
    
    const sorted = [...explorerFiles].sort((a, b) => a.relativePath.localeCompare(b.relativePath));
    
    sorted.forEach(file => {
      const node: TreeNode = { ...file, children: [] };
      map[file.relativePath] = node;
      
      const parts = file.relativePath.split('/');
      parts.pop();
      const parentPath = parts.join('/');
      
      const parent = map[parentPath] || root;
      parent.children.push(node);
    });
    
    return root.children;
  }, [explorerFiles]);

  const renderTreeNode = (node: TreeNode, depth: number = 0) => {
    const isExpanded = expandedFolders[node.relativePath];
    
    if (node.isDirectory) {
      return (
        <div key={node.path} className="select-none text-left">
          <button
            onClick={() => {
              setExpandedFolders(prev => ({ ...prev, [node.relativePath]: !prev[node.relativePath] }));
            }}
            className="w-full flex items-center gap-1 py-1 hover:bg-[#ebdcb9]/25 dark:hover:bg-[#2c2b29] rounded transition-all cursor-pointer font-mono text-[11px] font-bold text-[#8f6244] dark:text-[#df9e7e]"
            style={{ paddingLeft: `${depth * 8 + 4}px` }}
          >
            {isExpanded ? (
              <ChevronDown size={11} className="text-zinc-400 shrink-0" />
            ) : (
              <ChevronRight size={11} className="text-zinc-400 shrink-0" />
            )}
            {isExpanded ? (
              <FolderOpen size={13} className="text-yellow-500 shrink-0" />
            ) : (
              <Folder size={13} className="text-yellow-500 shrink-0" />
            )}
            <span className="truncate">{node.name}</span>
          </button>
          
          {isExpanded && node.children.map(child => renderTreeNode(child, depth + 1))}
        </div>
      );
    } else {
      return (
        <button
          key={node.path}
          onClick={() => handleOpenFile(node.path, node.name)}
          className={`w-full flex items-center gap-1.5 py-1 px-2.5 rounded transition-all cursor-pointer font-mono text-[11px] ${
            activeTabPath === node.path
              ? 'bg-[#ebdcb9]/40 dark:bg-[#d97756]/15 hover:bg-[#ebdcb9]/50 dark:hover:bg-[#d97756]/20 border border-[#ebdcb9] dark:border-[#d97756]/20 text-[#cc5a37] dark:text-[#df9e7e] font-bold'
              : 'hover:bg-[#ebdcb9]/15 dark:hover:bg-[#201f1d] text-[#3a352d] dark:text-[#cccab9] border border-transparent'
          }`}
          style={{ paddingLeft: `${depth * 8 + 16}px` }}
        >
          {getFileIcon(node.name)}
          <span className="truncate">{node.name}</span>
        </button>
      );
    }
  };

  const mockDefaultFiles = [
    { name: 'package.json', type: 'config' },
    { name: 'tsconfig.json', type: 'config' },
    { name: 'vite.config.ts', type: 'config' },
    { name: 'src/main.tsx', type: 'code' },
    { name: 'src/App.tsx', type: 'code' },
    { name: 'src/index.css', type: 'style' }
  ];

  // Helper code generator & simulator
  const handleSelectWorkspace = (path: string) => {
    setAgentWorkspace(path);
    setIsFolderPickerOpen(false);
    setAgentLogs(prev => [
      ...prev,
      `[workspace] Directory authorized: ${path}`,
      `[workspace] Safe Unix environment verified.`,
      `[security] Full access permissions READ / WRITE / REPLACE / DELETE granted on total of 6 matching elements.`
    ]);
  };

  const handleCustomPathSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customPathInput.trim()) {
      handleSelectWorkspace(customPathInput.trim());
    }
  };

  const executePlannerMock = async (query: string) => {
    setIsEvaluating(true);
    setAgentPlan(null);
    setAgentRunning(false);
    setAgentTodos([]);

    setAgentLogs([
      `[hub] Routing evaluation request to planning role: [${agentApiKeys.planner.provider.toUpperCase()}: ${agentApiKeys.planner.model}]`,
      `[planner] Analyzing requirement: "${query}"`,
      `[planner] Evaluating local codebase at authorized directory: ${agentWorkspace || 'unnamed-repo'}`,
      `[workspace] Inspecting configuration manifests: package.json, tsconfig.json...`,
      `[planner] Structuring multi-stage roadmap & pipeline tasks...`
    ]);

    await new Promise(resolve => setTimeout(resolve, 1400));

    setIsEvaluating(false);
    const mockDesignReport = `### 📋 Software Engineering Specification: ${query.slice(0, 45)}${query.length > 45 ? '...' : ''}

**Role Allocation Hierarchy:**
- **Planner Instance**: \`${agentApiKeys.planner.provider.toUpperCase()} (${agentApiKeys.planner.model})\`
- **Coding Executor**: \`${agentApiKeys.coder.provider.toUpperCase()} (${agentApiKeys.coder.model})\`
- **Lint / Verifier**: \`${agentApiKeys.linter.provider.toUpperCase()} (${agentApiKeys.linter.model})\`
- **Security Fallback**: \`${agentApiKeys.fallback.provider.toUpperCase()} (${agentApiKeys.fallback.model})\`

---

### 🌲 Structural Engineering Plan
The coding agent needs to establish several directory upgrades recursively:
1. **Dependency Ingress**: Incorporate key libraries into modern structure without modifying custom root scripts.
2. **Component Integration**: Assemble safe responsive layout and code logic with error prevention.
3. **Execution Guardrails**: Build system safety routines verifying standard execution.

### 📝 Predicted File System Mutations
- **CREATE** \`src/components/AcousticWaves.tsx\` (Custom audio visualizers and waveforms)
- **EDIT** \`src/App.tsx\` (Bridge in the canvas overlay modules)
- **VERIFY** \`package.json\` (Import required packages safely)
`;
    setAgentPlan(mockDesignReport);
    setAgentLogs(prev => [
      ...prev,
      `[planner] Implementation roadmap designed successfully.`,
      `[hub] Design specification printed in interactive viewer.`,
      `[hub] Awaiting workspace authorization & consent: (Say ok, implement, do it, or continue)`
    ]);
  };

  const startTodoExecution = async () => {
    if (agentRunning) return;
    
    // Create standard interactive todos
    const todos = [
      { id: 't1', title: 'Verify authorized directory permissions & ingest node environments', status: 'running' as const },
      { id: 't2', title: 'Generate responsive component schema in src/components/AcousticWaves.tsx', status: 'waiting' as const },
      { id: 't3', title: 'Synthesize custom styling formulas and Tailwind configuration injection', status: 'waiting' as const },
      { id: 't4', title: 'Launch sandboxed "npm run build && npm run lint" system verification', status: 'waiting' as const },
      { id: 't5', title: 'Production compiler: Bundle optimized dist/server.cjs artifacts', status: 'waiting' as const }
    ];

    setAgentTodos(todos);
    setAgentRunning(true);
    setAgentStep(0);

    setAgentLogs(prev => [
      ...prev,
      `[coder] Handshaking with specialized execution agent: [${agentApiKeys.coder.provider.toUpperCase()}: ${agentApiKeys.coder.model}]`,
      `[workspace] Locked directory. Initiating progressive checklist (5 total stages).`
    ]);

    // Stage 1
    await new Promise(resolve => setTimeout(resolve, 2000));
    setAgentTodos(prev => prev.map((t, idx) => {
      if (idx === 0) return { ...t, status: 'success' };
      if (idx === 1) return { ...t, status: 'running' };
      return t;
    }));
    setAgentStep(1);
    setAgentLogs(prev => [
      ...prev,
      `[shell] $ npm install --silent`,
      `[shell] Loaded 45 cached node_modules in 186ms.`,
      `[workspace] Permissions: fully authorized.`,
      `[coder] Resolving codebase layout...`
    ]);

    // Stage 2
    await new Promise(resolve => setTimeout(resolve, 2200));
    setAgentTodos(prev => prev.map((t, idx) => {
      if (idx === 1) return { ...t, status: 'success' };
      if (idx === 2) return { ...t, status: 'running' };
      return t;
    }));
    setAgentStep(2);
    setAgentLogs(prev => [
      ...prev,
      `[coder] Created file: 'src/components/AcousticWaves.tsx'`,
      `[coder] Embedded pristine visual state managers & audio synthesis loops.`,
      `[workspace] Saved to device disk (3,810 bytes).`
    ]);

    // Stage 3
    await new Promise(resolve => setTimeout(resolve, 1800));
    setAgentTodos(prev => prev.map((t, idx) => {
      if (idx === 2) return { ...t, status: 'success' };
      if (idx === 3) return { ...t, status: 'running' };
      return t;
    }));
    setAgentStep(3);
    setAgentLogs(prev => [
      ...prev,
      `[coder] Modified styling parameters inside App.tsx and index.css`,
      `[coder] Injected tailored Tailwind classes and @theme colors.`,
      `[verifier] Initializing role-specific linter: [${agentApiKeys.linter.provider.toUpperCase()}: ${agentApiKeys.linter.model}]`
    ]);

    // Stage 4
    await new Promise(resolve => setTimeout(resolve, 2000));
    setAgentTodos(prev => prev.map((t, idx) => {
      if (idx === 3) return { ...t, status: 'success' };
      if (idx === 4) return { ...t, status: 'running' };
      return t;
    }));
    setAgentStep(4);
    setAgentLogs(prev => [
      ...prev,
      `[shell] $ npm run lint`,
      `[shell] > lumina-ai-chat@1.0.0 lint`,
      `[shell] > tsc --noEmit`,
      `[linter] Lint checking finished. Current status: SUCCESS (0 errors found).`,
      `[shell] $ npm run build`
    ]);

    // Stage 5
    await new Promise(resolve => setTimeout(resolve, 2500));
    setAgentTodos(prev => prev.map((t, idx) => {
      if (idx === 4) return { ...t, status: 'success' };
      return t;
    }));
    setAgentStep(5);
    setAgentRunning(false);
    setAgentLogs(prev => [
      ...prev,
      `[shell] Build succeeded in 1.48s. Bundle size: 247 KB.`,
      `[workspace] production server start instruction added to package.json.`,
      `[hub] Multi-Agent Pipeline execution COMPLETE.`,
      `🎉 Software application successfully optimized and deployed natively on Port 3000!`
    ]);
  };

  useEffect(() => {
    if (terminalBottomRef.current && autoscrollEnabled) {
      terminalBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [agentLogs, autoscrollEnabled]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!promptInput.trim()) return;

      const val = promptInput.trim().toLowerCase();
      // Intercept Approval words
      if (['ok', 'implement', 'do it', 'continue', 'yes', 'approve'].includes(val)) {
        if (agentPlan && !agentRunning && agentTodos.length === 0) {
          startTodoExecution();
          setPromptInput('');
          return;
        }
      }

      executePlannerMock(promptInput.trim());
      setPromptInput('');
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[var(--theme-bg)] text-[var(--theme-primary)] font-sans antialiased transition-colors duration-300">
      
      {/* CLAUDE BRANDED STYLING MINIMAL TOP HEADER */}
      <div className="h-14 border-b border-[var(--theme-border)] flex items-center justify-between px-5 md:px-7 bg-[var(--theme-surface)] backdrop-blur-md sticky top-0 shrink-0 z-30 transition-colors duration-300">
        <div className="flex items-center gap-3">
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="p-1.5 hover:bg-[#ebdcb9] dark:hover:bg-[#32302b] rounded-lg transition-colors text-gray-500 hover:text-[#8f6244] dark:hover:text-[#df9e7e] cursor-pointer flex items-center justify-center border border-transparent hover:border-[#ebdcb9] dark:hover:border-[#3a3834] -ml-2"
              title={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
            >
              <Sidebar size={18} />
            </button>
          )}
          <div className="flex items-center gap-2">
            <span className="text-[#8f6244] dark:text-[#d97756] font-display font-semibold tracking-tight text-sm flex items-center gap-1.5">
              Claude Coder Lab
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsPanelSettingsOpen(!isPanelSettingsOpen)}
            className={`h-8 px-3 border rounded-lg flex items-center gap-1.5 text-[11px] font-bold leading-none tracking-wider transition-colors duration-200 cursor-pointer ${
              isPanelSettingsOpen 
                ? 'bg-[#ebdcb9] dark:bg-[#3d3a35] border-[#ebdcb9] text-[#8f6244] dark:text-[#df9e7e]' 
                : 'bg-[#f5f2e9] dark:bg-[#2d2c29] border-[#ebdcb9] dark:border-[#3a3834] text-[#5e574a] dark:text-[#ccc7be] hover:bg-[#ebdcb9]/60 dark:hover:bg-[#32302b]'
            }`}
            title="Configure model agencies"
          >
            <Settings2 size={12} />
            <span className="uppercase">Pipeline Grid</span>
          </button>

          {onExitMode && (
            <button 
              onClick={onExitMode}
              className="h-8 w-8 border border-[#ebdcb9] dark:border-[#3a3834] rounded-lg bg-[#f5f2e9] dark:bg-[#2d2c29] hover:bg-[#ebdcb9]/60 dark:hover:bg-[#32302b] text-[#5e574a] dark:text-[#ccc7be] hover:text-[#191919] dark:hover:text-white transition-all duration-200 cursor-pointer flex items-center justify-center shrink-0"
              title="Exit Coder Lab"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* WORKSPACE PANELS CONTAINER */}
      <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden">
        
        {/* LEFT AREA: Workspace context, Simulated filesystem, role configurations */}
        <div className="w-full md:w-80 border-b md:border-b-0 md:border-r border-[var(--theme-border)] bg-[var(--theme-sidebar)] p-5 flex flex-col shrink-0 overflow-y-auto custom-scrollbar transition-colors duration-300">
          


          {/* Directory Selector and status with nice Claude sand aesthetics */}
          <div className="mb-5 p-4 rounded-xl bg-[var(--theme-surface)] border border-[var(--theme-border)] relative shadow-sm">
            <div className="text-[10px] uppercase font-bold text-[#8a8170] dark:text-[#a5a29a] tracking-wide mb-2 flex items-center justify-between">
              <span>Target repository</span>
              <span className="text-[9px] uppercase tracking-wider font-extrabold text-[#d97756]">Read/Write</span>
            </div>
            
            {agentWorkspace ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs truncate font-mono text-[#8f6244] dark:text-[#e5a287] p-2 bg-[#ebdcb9]/30 dark:bg-[#d97756]/10 border border-[#ebdcb9] dark:border-[#d97756]/20 rounded-lg">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#d97756] animate-pulse"></span>
                  <span className="truncate" title={agentWorkspace}>{agentWorkspace}</span>
                </div>
                <div className="text-[10px] text-[#736e64] dark:text-[#acaba4] space-y-1 bg-[#ebdcb9]/10 dark:bg-[#191918]/45 p-2 rounded-lg border border-[#ebdcb9]/30 dark:border-zinc-800/20">
                  <div className="flex justify-between"><span>Linter status</span> <span className="text-emerald-600 dark:text-emerald-400 font-semibold font-mono">STANDBY</span></div>
                  <div className="flex justify-between"><span>Replaces</span> <span className="text-emerald-600 dark:text-emerald-400 font-semibold font-mono">AUTHORIZED</span></div>
                  <div className="flex justify-between"><span>Shell Engine</span> <span className="text-amber-600 dark:text-amber-500 font-semibold font-mono">INTEGRATED</span></div>
                </div>
                <button 
                  onClick={() => setAgentWorkspace(null)}
                  className="w-full py-1.5 text-center bg-[#FAF9F5] hover:bg-[#ebdcb9]/15 dark:bg-[#242320] dark:hover:bg-[#2c2b27] text-[10px] text-[#8a8170] dark:text-[#9c9a94] hover:text-[#191919] dark:hover:text-white font-semibold rounded-lg border border-[#ebdcb9] dark:border-[#3d3a35] transition-all cursor-pointer shadow-xs"
                >
                  Change Repository
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-[11px] text-[#8a8170] dark:text-[#a3a097] leading-relaxed">
                  Authorize a workspace folder to trigger Claude's full autonomous writing permissions. It can edit, replace, delete and execute safe build loops.
                </p>
                <button 
                  onClick={() => setIsFolderPickerOpen(true)}
                  className="w-full py-2 px-3 text-center bg-[#d97756] hover:bg-[#c66442] dark:bg-[#cc6e4b] dark:hover:bg-[#e28461] text-white text-xs font-bold rounded-lg transition-transform hover:scale-[1.01] active:scale-[0.99] cursor-pointer inline-flex items-center justify-center gap-2 shadow-sm"
                >
                  <FolderPlus size={14} />
                  <span>Choose Workspace Folder</span>
                </button>
              </div>
            )}
          </div>

          {/* Directory browser when workspace is selected */}
          {agentWorkspace && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }} 
              className="flex-1 flex flex-col min-h-[160px] mb-4 group/explorer border border-[var(--theme-border)] rounded-2xl p-3 bg-[var(--theme-surface-alt)] shadow-lg shadow-[#d97756]/5 dark:shadow-black/40 ring-1 ring-[#d97756]/15 dark:ring-[#d97756]/5 transition-all duration-300"
            >
              <div className="text-[10px] uppercase tracking-wider font-extrabold text-[#d97756] mb-2 flex items-center justify-between border-b border-[var(--theme-border)] pb-1.5 select-none">
                <span className="flex items-center gap-1.5 font-sans">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#d97756] animate-pulse"></span>
                  Workspace Tree
                </span>
                
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      const name = prompt("Enter new file name (e.g. hello.ts or components/Timer.tsx):");
                      if (name) {
                        handleCreateFile(name);
                      }
                    }}
                    title="New File"
                    className="p-1 hover:bg-[#ebdcb9]/30 dark:hover:bg-[#201f1d] rounded text-[#8f6244] dark:text-[#df9e7e] transition-colors cursor-pointer"
                  >
                    <Plus size={11} />
                  </button>
                  <button
                    onClick={fetchWorkspaceFiles}
                    title="Refresh Files"
                    className="p-1 hover:bg-[#ebdcb9]/30 dark:hover:bg-[#201f1d] rounded text-[#8f6244] dark:text-[#df9e7e] transition-colors cursor-pointer"
                  >
                    <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M9 11l3-3 3 3" />
                    </svg>
                  </button>
                  <span className="text-[#a09482] dark:text-[#99968f] font-mono font-bold text-[9px] bg-[#ebdcb9]/30 dark:bg-[#252422] px-1.5 py-0.5 rounded-full">{explorerFiles.length} FILES</span>
                </div>
              </div>
              
              <div className="flex-1 p-2 border border-[var(--theme-border)] rounded-xl bg-[var(--theme-surface)] text-xs font-mono max-h-[350px] overflow-y-auto shadow-inner custom-scrollbar">
                <div className="p-1 px-2.5 text-[#191919] dark:text-[#ffffff] text-[11px] bg-[#ebdcb9]/20 dark:bg-[#d97756]/10 border border-[#ebdcb9]/40 dark:border-[#d97756]/10 rounded-lg flex items-center gap-2 font-sans font-bold shadow-xs select-none mb-2">
                  <span className="text-[12px]">📁</span>
                  <span className="truncate">{agentWorkspace.split('/').pop() || 'project-root'}</span>
                </div>
                
                <div className="space-y-0.5 py-1">
                  {explorerFiles.length === 0 ? (
                    <div className="text-[10px] text-[var(--theme-secondary)] p-3 text-center italic font-sans">
                      No files found. Tap refresh or connect default.
                    </div>
                  ) : (
                    workspaceTree.map(node => renderTreeNode(node, 0))
                  )}
                </div>
              </div>
            </motion.div>
          )}



        </div>

        {/* CENTRAL AREA: Current Tasks output console logs */}
        <div className="flex-1 flex flex-col h-full bg-[var(--theme-bg)] overflow-hidden relative transition-colors duration-300">
          
          {/* Editor/Pipeline Switcher Tab Ribbon */}
          {editorTabs.length > 0 && (
            <div className="flex items-center justify-between border-b border-[var(--theme-border)] bg-[var(--theme-surface)] text-xs h-10 select-none shrink-0">
              <div className="flex items-center gap-0 overflow-x-auto h-full scrollbar-none">
                <button
                  onClick={() => setActiveCenterTab('pipeline')}
                  className={`h-full px-4 border-r border-[var(--theme-border)] font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    activeCenterTab === 'pipeline'
                      ? 'bg-[var(--theme-surface-alt)] text-[#cc5a37] dark:text-[#df9e7e] border-b-2 border-b-[#d97756]'
                      : 'text-zinc-500 hover:text-[var(--theme-primary)] hover:bg-[#ebdcb9]/10'
                  }`}
                >
                  <Terminal size={12} />
                  <span>Pipeline</span>
                </button>

                {editorTabs.map(tab => (
                  <div
                    key={tab.path}
                    onClick={() => {
                      setActiveTabPath(tab.path);
                      setActiveCenterTab('editor');
                    }}
                    className={`h-full px-4 border-r border-[#ebdcb9]/60 dark:border-[var(--theme-border)] font-mono flex items-center gap-1.5 transition-all cursor-pointer relative group ${
                      activeCenterTab === 'editor' && activeTabPath === tab.path
                        ? 'bg-[var(--theme-surface-alt)] border-t-[3px] border-t-[#d97756] text-[#cc5a37] dark:text-[#df9e7e] font-bold'
                        : 'text-zinc-500 hover:text-[var(--theme-primary)] hover:bg-[#ebdcb9]/15'
                    }`}
                  >
                    <span>📄</span>
                    <span className="truncate max-w-[100px]">{tab.name}</span>
                    {tab.isModified && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></span>}
                    <button
                      onClick={(e) => handleCloseTab(tab.path, e)}
                      className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 opacity-60 hover:opacity-100 transition-opacity ml-1.5 cursor-pointer"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>

              {activeCenterTab === 'editor' && activeTabPath && (
                <div className="flex items-center gap-2 px-3">
                  <button
                    onClick={handleSaveActiveFile}
                    className="flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-[10px] tracking-wide transition-all h-7 cursor-pointer shadow-xs font-sans"
                    title="Save current file (Ctrl+S)"
                  >
                    <Save size={11} />
                    <span>Save</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Workspace directory popover dialog model */}
          {isFolderPickerOpen && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-[150]">
              <div className="w-full max-w-md bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-2xl shadow-xl p-6 text-left">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-bold text-[#191919] dark:text-white flex items-center gap-1.5">
                    <span>📁</span> <span>Connect folder</span>
                  </h4>
                  <button onClick={() => setIsFolderPickerOpen(false)} className="p-1.5 hover:bg-[#ebdcb9]/40 dark:hover:bg-[#34322e] rounded-lg text-[#8a8170] dark:text-zinc-500">
                    <X size={16} />
                  </button>
                </div>
                <p className="text-xs text-[#615c54] dark:text-[#aeaba0] leading-relaxed mb-4 font-sans">
                  Choose an authorized directory for Claude Coder Lab to execute scripts. Files will be parsed and re-rendered dynamically.
                </p>
                
                <div className="space-y-2 mb-5 max-h-56 overflow-y-auto pr-1">
                  {mockPredefinedDirs.map(dir => (
                    <button
                      key={dir.path}
                      onClick={() => handleSelectWorkspace(dir.path)}
                      className="w-full text-left p-3 border border-[#ebdcb9]/60 dark:border-[#35332f] bg-[#FAF9F5] hover:bg-[#ebdcb9]/20 dark:bg-[#161615]/60 dark:hover:bg-[#1f1e1c]/80 rounded-xl transition-all font-mono text-xs group flex flex-col gap-1 cursor-pointer"
                    >
                      <span className="text-[#8f6244] dark:text-[#df9e7e] font-bold flex items-center gap-1.5">
                        <span>📁</span> {dir.path}
                      </span>
                      <span className="text-[10px] text-[#8a8170] dark:text-[#99958c] font-sans">{dir.description}</span>
                    </button>
                  ))}
                </div>

                <form onSubmit={handleCustomPathSubmit} className="flex gap-2 mb-3">
                  <input 
                    type="text" 
                    value={customPathInput}
                    onChange={(e) => setCustomPathInput(e.target.value)}
                    placeholder="Enter custom path: /sandbox/my-app"
                    className="flex-1 px-3 py-2 bg-white dark:bg-[#161615] border border-[#ebdcb9] dark:border-[#3d3a35] rounded-xl text-xs font-mono text-[#8f6244] dark:text-[#df9e7e] focus:border-[#d97756] focus:ring-0 outline-none"
                  />
                  <button type="submit" className="px-4 py-2 bg-[#d97756] hover:bg-[#c66442] dark:bg-[#cc6e4b] dark:hover:bg-[#e28461] text-white font-semibold text-xs rounded-xl transition-colors cursor-pointer">
                    Connect
                  </button>
                </form>

                <div className="border-t border-[#ebdcb9]/60 dark:border-[#35332f] pt-3">
                  <button
                    onClick={async () => {
                      const api = (window as any).__electronAPI;
                      if (api && api.openFolderDialog) {
                        const folder = await api.openFolderDialog();
                        if (folder) {
                          handleSelectWorkspace(folder);
                        }
                      } else {
                        // Fallback for browser: use the current custom path input or current directory
                        const path = customPathInput.trim() || '.';
                        handleSelectWorkspace(path);
                      }
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-3 border border-dashed border-[#ebdcb9]/60 dark:border-[#3d3a35] bg-[#FAF9F5] hover:bg-[#ebdcb9]/30 dark:bg-[#161615]/40 dark:hover:bg-[#1f1e1c]/60 rounded-xl transition-all text-xs cursor-pointer group"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#8f6244] dark:text-[#df9e7e]">
                      <path d="M21 12v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h3.5l2-2h5l2 2H19a2 2 0 0 1 2 2z"/>
                      <circle cx="12" cy="13" r="2"/>
                    </svg>
                    <span className="text-[#8f6244] dark:text-[#df9e7e] font-bold">Browse from Device</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Content Viewer area */}
          {activeCenterTab === 'editor' && activeTabPath ? (
            <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#1e1e1e]">
              <div className="flex-1 relative">
                <MonacoEditor
                  height="100%"
                  language={getMonacoLanguage(activeTabPath)}
                  theme="vs-dark"
                  value={editorTabs.find(t => t.path === activeTabPath)?.content || ''}
                  onChange={handleEditorChange}
                  options={{
                    fontSize: 13,
                    fontFamily: "'JetBrains Mono', Consolas, monospace",
                    minimap: { enabled: true },
                    wordWrap: 'on',
                    automaticLayout: true,
                    tabSize: 2,
                    padding: { top: 12 },
                  }}
                />
              </div>
              <div className="h-6 bg-[#007acc] text-white flex items-center justify-between px-4 text-[10px] font-mono select-none shrink-0">
                <div className="flex items-center gap-3">
                  <span className="font-bold flex items-center gap-1 uppercase bg-[#005a96] px-2 py-0.5 rounded text-[9px]">LUMINA EDIT</span>
                  <span className="truncate">{activeTabPath}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span>Lines: {(editorTabs.find(t => t.path === activeTabPath)?.content || '').split('\n').length}</span>
                  <span>UTF-8</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 custom-scrollbar pb-36">
            
            {/* Unconnected Empty State */}
            {!agentWorkspace && (
              <div className="min-h-[50vh] flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-[#f5efe2] dark:bg-[#252320] border border-[#ebdcb9] dark:border-[#3d3932] flex items-center justify-center text-[#8f6244] dark:text-[#e5a287] shadow-xs">
                  <FolderPlus size={30} />
                </div>
                <h2 className="text-lg font-display font-semibold text-[#191919] dark:text-white">Workspace directory folder required</h2>
                <p className="text-xs text-[#736a5c] dark:text-[#a09c91] leading-relaxed font-sans">
                  Connect any sandbox folder to trigger Claude's full autonomous code writing permissions. Once connected, our multi-agent pipeline compiles, bundles, and deploys.
                </p>
                <button 
                  onClick={() => setIsFolderPickerOpen(true)}
                  className="px-5 py-2.5 bg-[#d97756] hover:bg-[#c66442] dark:bg-[#cc6e4b] dark:hover:bg-[#e28461] rounded-xl text-xs font-bold text-white transition-all shadow-md flex items-center gap-2 cursor-pointer"
                >
                  <FolderPlus size={15} />
                  <span>Connect a Folder from Device</span>
                </button>
              </div>
            )}

            {/* Connected Waiting for input Empty State */}
            {agentWorkspace && !isEvaluating && !agentPlan && !agentRunning && agentTodos.length === 0 && (
              <div className="min-h-[48vh] flex flex-col items-center justify-center text-center max-w-lg mx-auto space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-[#ebdcb9]/40 dark:bg-[#d97756]/15 border border-[#ebdcb9] dark:border-[#d97756]/20 flex items-center justify-center text-[#d97756] animate-pulse shadow-sm">
                  <Terminal size={24} />
                </div>
                <h2 className="text-base font-display font-bold text-[#191919] dark:text-white">Lumina Software agent is initialized</h2>
                <p className="text-xs text-[#6e6659] dark:text-[#aba69a] leading-relaxed">
                  Specify your software component requirements in the prompt box below. The specialized pipeline planner model will design a roadmap. Once approved, the coding engine runs file writes task by task.
                </p>
                
                <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-3 text-left mt-4 text-xs font-mono font-medium">
                  <button 
                    onClick={() => {
                      const prompt = "Implement acoustic waveform canvas audio visualizer with custom synthesizer";
                      setPromptInput(prompt);
                      executePlannerMock(prompt);
                    }}
                    className="p-3.5 border border-[#e1d5ba] hover:border-[#d97756]/40 dark:border-[#35332f] hover:bg-[#ebdcb9]/20 dark:hover:bg-[#201f1c] bg-[#FAF9F5] dark:bg-[#1a1a19] rounded-xl transition-all cursor-pointer text-left text-[#5e574b] dark:text-[#aba89f] hover:text-[#191919] dark:hover:text-white group"
                  >
                    <span className="text-[#8f6244] dark:text-[#df9e7e] font-bold block mb-1 group-hover:text-[#cc5a37] flex items-center gap-1.5">
                      <span>🎹</span> Audio Waves Visualizer
                    </span>
                    Audio visualizer canvas module supporting custom tone selectors
                  </button>
                  <button 
                    onClick={() => {
                      const prompt = "Write dynamic dark theme selector with cosmic system presets";
                      setPromptInput(prompt);
                      executePlannerMock(prompt);
                    }}
                    className="p-3.5 border border-[#e1d5ba] hover:border-[#d97756]/40 dark:border-[#35332f] hover:bg-[#ebdcb9]/20 dark:hover:bg-[#201f1c] bg-[#FAF9F5] dark:bg-[#1a1a19] rounded-xl transition-all cursor-pointer text-left text-[#5e574b] dark:text-[#aba89f] hover:text-[#191919] dark:hover:text-white group"
                  >
                    <span className="text-[#8f6244] dark:text-[#df9e7e] font-bold block mb-1 group-hover:text-[#cc5a37] flex items-center gap-1.5">
                      <span>🎨</span> Cosmic Theme System
                    </span>
                    Dark/Light visual system presets tailored for tailwind elements
                  </button>
                </div>
              </div>
            )}

            {/* Plan rendering state & loader */}
            {isEvaluating && (
              <div className="min-h-[30vh] flex flex-col items-center justify-center space-y-3">
                <Loader2 className="w-8 h-8 text-[#d97756] animate-spin" />
                <div className="text-center">
                  <p className="text-xs font-mono text-[#8f6244] dark:text-[#df9e7e] font-semibold">Formulating software specification...</p>
                  <p className="text-[10px] text-[#8c8270] dark:text-[#9e9a93] mt-1 font-mono">Routing task checklist to Planner agent</p>
                </div>
              </div>
            )}

            {/* Plan markdown published */}
            {agentPlan && (
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-6 rounded-2xl bg-[var(--theme-surface)] border border-[var(--theme-border)] prose prose-zinc dark:prose-invert max-w-none shadow-md text-left transition-colors duration-300"
              >
                <div className="flex items-center justify-between border-b border-[var(--theme-border)] pb-3 mb-4">
                  <span className="text-[10.5px] uppercase font-bold tracking-wider text-[#d97756] bg-[#d97756]/10 border border-[#d97756]/20 px-2.5 py-1 rounded-full">
                    Roadmap blueprint proposal
                  </span>
                  <span className="text-[10px] text-[#8a8170] dark:text-[#9c9993] font-mono">Consent Awaiting</span>
                </div>
                
                <div className="text-xs sm:text-sm text-[#3a352c] dark:text-[#dfded9] space-y-4 markdown-body">
                  <Markdown>{agentPlan}</Markdown>
                </div>

                {/* Action consent prompt call-to-action */}
                {agentTodos.length === 0 && (
                  <div className="mt-6 p-4 rounded-xl bg-[#ebdcb9]/20 dark:bg-[#d97756]/5 border border-[#ebdcb9]/70 dark:border-[#d97756]/20 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-xs">
                      <span className="font-bold text-[#191919] dark:text-[#ffffff] block flex items-center gap-1.5">
                        <CornerDownRight size={13} className="text-[#d97756]" /> Task pipeline ready to inject
                      </span>
                      <span className="text-[#696356] dark:text-[#a1a09a]">Deploy is ready. Tap approve below or say "ok" to execute.</span>
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto shrink-0">
                      <button 
                        onClick={startTodoExecution}
                        className="flex-1 sm:flex-initial px-4 py-2 bg-[#d97756] hover:bg-[#c66442] text-white font-bold text-xs rounded-lg transition-transform hover:scale-[1.01] active:scale-[0.99] cursor-pointer uppercase tracking-wider shadow-sm"
                      >
                        Approve & Execute
                      </button>
                      <button 
                        onClick={() => setAgentPlan(null)}
                        className="px-3 py-2 bg-transparent text-[#8a8170] dark:text-[#aba8a2] hover:text-[#191919] dark:hover:text-white hover:bg-[#kbdcb9]/20 dark:hover:bg-[#2d2c29] text-xs font-semibold rounded-lg border border-[#ebdcb9] dark:border-[#3d3a35] transition-colors cursor-pointer"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* Interactive active Todo task execution tracking panel and Advanced AI Telemetry/Terminal */}
            {agentTodos.length > 0 && (
              <div className="space-y-6 text-left">
                {/* 1. Main Pipeline Stage Tracker Card */}
                <motion.div 
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] shadow-lg overflow-hidden"
                >
                  {/* Header block with Total Task progress states */}
                  <div className="p-4 bg-[var(--theme-surface-alt)] border-b border-[var(--theme-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-orange-500/10 dark:bg-orange-500/15 border border-[#d97756]/30 flex items-center justify-center text-[#d97756]">
                        <Terminal size={17} className={agentRunning ? "animate-pulse text-[#cc5a37]" : ""} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-[#191919] dark:text-white">Active Multi-Agent Task Pipeline ({agentStep}/5)</span>
                          {agentStep === 5 ? (
                            <span className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-extrabold px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/25 rounded-full select-none uppercase tracking-wider">
                              <Check size={10} className="stroke-[3]" /> Pipeline Succeeded
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-[10px] text-blue-600 dark:text-blue-400 font-extrabold px-2 py-0.5 bg-blue-500/10 border border-blue-500/25 rounded-full select-none uppercase tracking-wider animate-pulse">
                              Stage {agentStep + 1} processing
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-[#8a8170] dark:text-[#a39f96] font-mono mt-0.5">
                          <span className="flex h-1.5 w-1.5 relative">
                            {agentRunning ? (
                              <>
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-500"></span>
                              </>
                            ) : (
                              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-zinc-400 dark:bg-zinc-600 animate-pulse"></span>
                            )}
                          </span>
                          <span>
                            {agentRunning 
                              ? `Invoking automated routine: ${agentTodos[agentStep]?.title || 'Finalizing bundle'}` 
                              : 'Deployment, testing, and production validations completed.'}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setExpandedTodos(!expandedTodos)}
                        className="p-1.5 hover:bg-[#ebdcb9]/40 dark:hover:bg-[#2e2d2a] rounded-lg text-[#8a8170] dark:text-[#a09e96] transition-colors cursor-pointer text-xs flex items-center gap-1 pl-2 font-bold"
                      >
                        <span>{expandedTodos ? 'Hide pipeline grid' : 'Expand pipeline grid'}</span>
                        <ChevronDown size={14} className={`transition-transform duration-200 ${expandedTodos ? 'rotate-180' : ''}`} />
                      </button>
                    </div>
                  </div>

                  {/* Tasks list checkbox items */}
                  <AnimatePresence initial={false}>
                    {expandedTodos && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="divide-y divide-[#ebdcb9]/50 dark:divide-[#2f2e2a] overflow-hidden bg-white dark:bg-[#1e1e1d]"
                      >
                        {agentTodos.map((todo, idx) => {
                          const isCurrent = todo.status === 'running';
                          const isSuccess = todo.status === 'success';
                          return (
                            <motion.div 
                              key={todo.id} 
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.05 }}
                              className={`p-3.5 px-6 flex items-start gap-4 transition-all text-xs relative ${
                                isCurrent 
                                  ? 'bg-[#d97756]/[0.03] text-[#d97756] border-l-3 border-[#d97756] shadow-inner' 
                                  : isSuccess 
                                    ? 'text-[#7e776a] dark:text-[#9e9a92] bg-zinc-50/20 dark:bg-zinc-900/10' 
                                    : 'text-[#a1998b] dark:text-[#7e7b75]'
                              }`}
                            >
                              {/* Background pulsing line for active step */}
                              {isCurrent && (
                                <span className="absolute inset-0 bg-gradient-to-r from-[#d97756]/10 to-transparent pointer-events-none animate-pulse" />
                              )}
                              
                              <div className="mt-0.5 shrink-0 z-10">
                                {isSuccess ? (
                                  <div className="w-5.3 h-5.3 rounded-full bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-500 shadow-xs">
                                    <Check size={11} className="stroke-[3]" />
                                  </div>
                                ) : isCurrent ? (
                                  <div className="w-5.3 h-5.3 rounded-full flex items-center justify-center border border-blue-500/30 bg-blue-500/10 text-blue-500 animate-spin">
                                    <Loader2 size={11} />
                                  </div>
                                ) : (
                                  <div className="w-5.3 h-5.3 rounded-full border border-[#ebdcb9]/80 dark:border-zinc-700 bg-[#fbfaf8] dark:bg-zinc-800 flex items-center justify-center text-[10px] text-[#8c8273] dark:text-[#aba59b] font-bold font-mono">
                                    {idx + 1}
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 z-10">
                                <div className="flex items-center gap-2">
                                  <span className={`font-semibold text-[12px] ${isSuccess ? 'line-through text-[#8c8574] dark:text-[#88857f] font-normal' : ''}`}>{todo.title}</span>
                                  {isCurrent && (
                                    <span className="text-[9px] uppercase tracking-wider font-extrabold bg-[#d97756]/10 border border-[#d97756]/20 text-[#cc5a37] px-1.5 py-0.1 rounded animate-pulse">Running</span>
                                  )}
                                </div>
                                {isCurrent && (
                                  <span className="block text-[10px] text-blue-500 dark:text-blue-400 font-mono mt-1 font-semibold animate-pulse">
                                    ⚙️ Tool Active: {idx === 0 ? 'list_dir & install_dependencies' : idx === 1 ? 'create_file (write components)' : idx === 2 ? 'edit_file (coordinate modifications)' : idx === 3 ? 'compile_applet & lint' : 'deploy_firebase bundles'}...
                                  </span>
                                )}
                              </div>
                            </motion.div>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>

                {/* 2. Dual-Column Advanced AI Telemetry & Code Editor Diff Mock */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                  
                  {/* Left Column (5/12): Radar Scanner HUD */}
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="lg:col-span-5 rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] shadow-md p-5 flex flex-col justify-between relative overflow-hidden"
                  >
                    {/* Background glow matrix */}
                    <div className="absolute inset-0 bg-radial-gradient from-blue-500/5 to-transparent pointer-events-none" />
                    
                    <div>
                      <div className="flex items-center gap-2 mb-4 border-b border-[var(--theme-border)] pb-2.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-ping"></span>
                        <h4 className="text-xs uppercase tracking-widest font-extrabold text-[#d97756]">Active AI Tool Telemetry</h4>
                      </div>

                      <div className="flex items-center justify-center py-4 relative mb-4">
                        {/* Scanning Radar Dial SVG */}
                        <svg className="w-28 h-28 transform origin-center" viewBox="0 0 120 120">
                          {/* Outer concentric grids */}
                          <circle cx="60" cy="60" r="55" fill="none" stroke="currentColor" className="text-[#ebdcb9]/40 dark:text-zinc-800" strokeWidth="1" />
                          <circle cx="60" cy="60" r="40" fill="none" stroke="currentColor" className="text-[#ebdcb9]/30 dark:text-zinc-800" strokeWidth="1" strokeDasharray="3,3" />
                          <circle cx="60" cy="60" r="25" fill="none" stroke="currentColor" className="text-[#ebdcb9]/20 dark:text-zinc-850" strokeWidth="1" />
                          <line x1="5" y1="60" x2="115" y2="60" stroke="currentColor" className="text-[#ebdcb9]/25 dark:text-zinc-800" strokeWidth="0.8" />
                          <line x1="60" y1="5" x2="60" y2="115" stroke="currentColor" className="text-[#ebdcb9]/25 dark:text-zinc-800" strokeWidth="0.8" />
                          
                          {/* Interactive sweeping arm */}
                          {agentRunning && (
                            <g className="animate-[spin_4s_linear_infinite]" style={{ transformOrigin: '60px 60px' }}>
                              <line x1="60" y1="60" x2="60" y2="5" stroke="rgba(59, 130, 246, 0.7)" strokeWidth="1.5" />
                              <path d="M60 5 A 55 55 0 0 1 108 35 L 60 60 Z" fill="rgba(59, 130, 246, 0.08)" />
                            </g>
                          )}
                          
                          {/* Centered blinking node */}
                          <circle cx="60" cy="60" r="4" fill="#3b82f6" className="animate-pulse" />
                        </svg>

                        {/* Blinking scanning nodes to simulate file crawl targets */}
                        {agentRunning && (
                          <>
                            <span className="absolute top-[28%] left-[34%] w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></span>
                            <span className="absolute top-[30%] left-[34%] w-1.5 h-1.5 rounded-full bg-red-400"></span>
                            <span className="absolute bottom-[35%] right-[25%] w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" style={{ animationDelay: '1.2s' }}></span>
                            <span className="absolute bottom-[37%] right-[25%] w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                          </>
                        )}
                      </div>

                      {/* Tool and environment stats table */}
                      <div className="space-y-2 text-[10.5px] font-mono leading-relaxed bg-[#fdfdfc] dark:bg-[#161615] rounded-xl p-3 border border-[var(--theme-border)] shadow-xs">
                        <div className="flex justify-between border-b border-zinc-100 dark:border-zinc-850 pb-1">
                          <span className="text-[#8a8170] dark:text-zinc-500 font-sans">Active Method:</span>
                          <span className="text-blue-500 font-bold uppercase">{agentStep === 0 ? 'list_dir' : agentStep === 1 ? 'create_file' : agentStep === 2 ? 'edit_file' : agentStep === 3 ? 'compile_applet' : agentStep === 4 ? 'deploy_firebase' : 'idle'}</span>
                        </div>
                        <div className="flex justify-between border-b border-zinc-100 dark:border-zinc-850 pb-1 truncate">
                          <span className="text-[#8a8170] dark:text-zinc-500 font-sans shrink-0 mr-4">Target Node:</span>
                          <span className="text-[#8f6244] dark:text-[#df9e7e] font-semibold truncate select-all">{agentStep === 1 ? 'AcousticWaves.tsx' : (agentStep === 2 ? 'App.tsx / index.css' : (agentStep === 4 ? 'dist/server.cjs' : 'package.json'))}</span>
                        </div>
                        <div className="flex justify-between border-b border-zinc-100 dark:border-zinc-850 pb-1">
                          <span className="text-[#8a8170] dark:text-zinc-500 font-sans">Lexical Diff Impact:</span>
                          <span className={agentStep > 0 && agentStep < 3 ? "text-emerald-500 font-bold" : "text-zinc-500"}>{agentStep === 1 ? '+156 lines, -0' : agentStep === 2 ? '+24 lines, -8' : 'N/A STABLE'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#8a8170] dark:text-zinc-500 font-sans">Verification Engine:</span>
                          <span className="text-purple-500 font-extrabold uppercase">LUMIN_CHECK v5.0</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 text-[10px] text-[#8c8273] dark:text-[#9e9a93] pl-1 font-sans border-t border-[var(--theme-border)] pt-2 select-none">
                      AI is indexing variables across 100% abstract trees.
                    </div>
                  </motion.div>

                  {/* Right Column (7/12): Interactive Live Editor Diff simulation */}
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="lg:col-span-7 rounded-2xl border border-[var(--theme-border)] bg-zinc-950 shadow-md p-4 flex flex-col h-full min-h-[290px]"
                  >
                    <div className="flex items-center justify-between border-b border-zinc-850 pb-2 mb-3.5 select-none">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500/80"></span>
                        <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80"></span>
                        <span className="w-2.5 h-2.5 rounded-full bg-green-500/80"></span>
                        <span className="text-[10px] uppercase font-bold text-zinc-500 pl-1 tracking-wider">Active Workspace Diff Code Generator</span>
                      </div>
                      <span className="text-[9px] font-mono bg-zinc-900 border border-zinc-800 text-zinc-400 px-1.5 rounded select-none uppercase tracking-wide">
                        {agentStep === 1 ? 'create src/components/AcousticWaves.tsx' : (agentStep === 2 ? 'edit src/App.tsx' : (agentStep === 3 ? 'Lint tests' : 'Standby'))}
                      </span>
                    </div>

                    {/* Diff Snip lines mapped dynamically */}
                    <div className="flex-1 font-mono text-[11px] leading-relaxed p-3 rounded-lg bg-zinc-950 shadow-inner overflow-hidden text-left space-y-1.5 max-h-[190px] overflow-y-auto custom-scrollbar select-all">
                      {(() => {
                        const snips = agentStep === 0 ? [
                          { type: 'info', text: '// parsing dependencies inside package.json...' },
                          { type: 'add', text: '+   "motion": "^11.11.17",' },
                          { type: 'add', text: '+   "react-markdown": "^9.0.1",' },
                          { type: 'add', text: '+   "@monaco-editor/react": "^4.6.0",' },
                          { type: 'info', text: '✔ Resolution finished. Environment setup successful.' }
                        ] : agentStep === 1 ? [
                          { type: 'add', text: '+ import React, { useState } from "react";' },
                          { type: 'add', text: '+ import { motion } from "motion/react";' },
                          { type: 'add', text: '+ export const AcousticWavesVal = () => {' },
                          { type: 'add', text: '+   const [waveScale, setWaveScale] = useState(1);' },
                          { type: 'add', text: '+   // Computing mathematical canvas coordinates dynamically' },
                          { type: 'add', text: '+   return <canvas className="wave-emitter-hud" />;' },
                          { type: 'add', text: '+ };' }
                        ] : agentStep === 2 ? [
                          { type: 'info', text: '// patch styling overrides in index.css...' },
                          { type: 'delete', text: '-   --color-background-primary: #ffffff;' },
                          { type: 'add', text: '+   --color-background-primary: #060608;' },
                          { type: 'add', text: '+   --color-brand-accent: #d97756;' },
                          { type: 'add', text: '+   --font-sans: "Inter", sans-serif;' }
                        ] : agentStep === 3 ? [
                          { type: 'info', text: '$ npm run lint' },
                          { type: 'info', text: '✔ [Linter verification] passed 12 modules inspect.' },
                          { type: 'info', text: '$ npm run build' },
                          { type: 'add', text: '✔ compiled static build package index successfully.' }
                        ] : agentStep === 4 ? [
                          { type: 'info', text: '// esbuild bundle pipeline production output' },
                          { type: 'add', text: '✔ bundler: created dist/server.cjs in 410ms (247 KB)' },
                          { type: 'add', text: '✔ ready for standalone container routing on port 3000.' }
                        ] : [
                          { type: 'info', text: '// Standby. Software agent pipelines are idle.' },
                          { type: 'info', text: '✔ All files synchronized.' },
                          { type: 'add', text: '+ Verified: Port 3000 online routing. Server is complete!' }
                        ];

                        return snips.map((s, sIdx) => {
                          const isAdd = s.type === 'add';
                          const isDel = s.type === 'delete';
                          return (
                            <motion.div 
                              key={sIdx}
                              initial={{ opacity: 0, x: -8 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ duration: 0.25, delay: sIdx * 0.04 }}
                              className={`px-2 py-0.5 rounded font-mono ${
                                isAdd 
                                  ? 'bg-[#102a1d] text-[#4ade80] border-l-2 border-emerald-500' 
                                  : isDel 
                                    ? 'bg-[#3b1219] text-[#f87171] border-l-2 border-rose-500 line-through' 
                                    : 'text-zinc-550'
                              }`}
                            >
                              {s.text}
                            </motion.div>
                          );
                        });
                      })()}

                      {agentRunning && (
                        <div className="flex items-center gap-1.5 px-2 py-0.5 text-blue-400 font-mono text-[11px] font-semibold animate-pulse">
                          <span>Writing code stream</span>
                          <span className="w-1.5 h-3.5 bg-blue-500 animate-ping inline-block"></span>
                        </div>
                      )}
                    </div>

                    <div className="text-[10px] text-zinc-500 mt-2 text-right border-t border-zinc-900 pt-2 font-mono select-none">
                      Lines: {agentStep === 1 ? '156 insertions, 0 deletions' : (agentStep === 2 ? '24 insertions, 8 deletions' : '0 errors')}
                    </div>
                  </motion.div>

                </div>

                {/* 3. Vintage Mainframe Terminal Emulator Dashboard Box for agentLogs */}
                <motion.div 
                  initial={{ opacity: 0, scale: 0.99 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] shadow-lg overflow-hidden flex flex-col text-left"
                >
                  {/* Console Header toolbar */}
                  <div className="p-3 px-4 bg-[var(--theme-surface-alt)] border-b border-[var(--theme-border)] flex flex-col md:flex-row md:items-center justify-between gap-3 select-none">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
                      <span className="text-xs font-bold text-[#191919] dark:text-white font-mono uppercase tracking-widest">
                        Lumina Compiler Terminal v2.5
                      </span>
                    </div>

                    {/* Console custom interactive buttons */}
                    <div className="flex flex-wrap items-center gap-2 font-sans">
                      {/* Theme selection buttons */}
                      <div className="flex items-center border border-[#ebdcb9] dark:border-[#34322e] rounded-lg p-0.5 bg-white/20 dark:bg-black/15">
                        <button 
                          onClick={() => setTerminalTheme('cyberpunk')}
                          className={`px-2 py-0.8 text-[9px] font-bold uppercase rounded-md cursor-pointer transition-colors ${
                            terminalTheme === 'cyberpunk' 
                              ? 'bg-zinc-900 text-cyan-400 font-extrabold shadow-sm' 
                              : 'text-zinc-500 hover:text-[#191919] dark:hover:text-white'
                          }`}
                          title="Neon cyberpunk palette"
                        >
                          Cyber
                        </button>
                        <button 
                          onClick={() => setTerminalTheme('phosphor')}
                          className={`px-2 py-0.8 text-[9px] font-bold uppercase rounded-md cursor-pointer transition-colors ${
                            terminalTheme === 'phosphor' 
                              ? 'bg-emerald-950 text-emerald-400 font-extrabold shadow-sm' 
                              : 'text-zinc-500 hover:text-[#191919] dark:hover:text-white'
                          }`}
                          title="Fallout green monitor"
                        >
                          Phos
                        </button>
                        <button 
                          onClick={() => setTerminalTheme('amber')}
                          className={`px-2 py-0.8 text-[9px] font-bold uppercase rounded-md cursor-pointer transition-colors ${
                            terminalTheme === 'amber' 
                              ? 'bg-[#211402] text-amber-500 font-extrabold shadow-sm' 
                              : 'text-zinc-500 hover:text-[#191919] dark:hover:text-white'
                          }`}
                          title="Amber mainframe screen"
                        >
                          Amber
                        </button>
                      </div>

                      {/* Autoscroll checkbox */}
                      <button 
                        onClick={() => setAutoscrollEnabled(!autoscrollEnabled)}
                        className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border cursor-pointer flex items-center gap-1 transition-all ${
                          autoscrollEnabled 
                            ? 'bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400' 
                            : 'bg-[#faf9f6] dark:bg-[#1f1e1c] border-[#ebdcb9] dark:border-zinc-800 text-zinc-400'
                        }`}
                        title="Toggle autoscrolling"
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${autoscrollEnabled ? 'bg-blue-500' : 'bg-zinc-400'}`}></span>
                        <span>Auto-scroll</span>
                      </button>

                      {/* Copy stream database button */}
                      <button 
                        onClick={() => {
                          const logStr = agentLogs.join('\n');
                          navigator.clipboard?.writeText(logStr);
                          alert('Terminal logs copied successfully!');
                        }}
                        className="px-2.5 py-1 text-[10px] font-bold rounded-lg border border-[#ebdcb9] dark:border-[#3a3834] bg-[#FAF9F5] dark:bg-[#2d2c29] hover:bg-[#ebdcb9]/40 hover:text-[#191919] dark:hover:text-white text-[#5e574a] dark:text-[#ccc7be] transition-all cursor-pointer font-semibold"
                      >
                        Copy Raw
                      </button>
                    </div>
                  </div>

                  {/* Terminal filter search input bar */}
                  <div className="p-2 border-b border-[var(--theme-border)] bg-zinc-50/50 dark:bg-black/10 flex items-center gap-2">
                    <Search size={12} className="text-zinc-500 shrink-0 ml-2" />
                    <input 
                      type="text"
                      className="w-full bg-transparent border-none p-0 focus:ring-0 outline-none text-xs text-[#191919] dark:text-white placeholder-zinc-500 font-medium pl-1 leading-none h-6 font-sans"
                      placeholder="Crawl terminal streams..."
                      value={logSearch}
                      onChange={(e) => setLogSearch(e.target.value)}
                    />
                    {logSearch && (
                      <button 
                        onClick={() => setLogSearch('')}
                        className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded text-zinc-500 mr-1.5"
                      >
                        <X size={10} />
                      </button>
                    )}
                  </div>

                  {/* Console logs body container */}
                  <div 
                    className={`max-h-[280px] min-h-[160px] overflow-y-auto p-4 flex flex-col font-mono text-[11px] leading-relaxed select-all custom-scrollbar ${
                      terminalTheme === 'cyberpunk' 
                        ? 'bg-[#04040a] text-zinc-200 border-zinc-900 shadow-inner' 
                        : terminalTheme === 'phosphor' 
                          ? 'bg-[#010901] text-[#33ff33] shadow-inner' 
                          : 'bg-[#0f0900] text-[#ffb500] shadow-inner'
                    }`}
                  >
                    {(() => {
                      const logsToRender = logSearch 
                        ? agentLogs.filter(log => log.toLowerCase().includes(logSearch.toLowerCase()))
                        : agentLogs;

                      if (logsToRender.length === 0) {
                        return (
                          <div className="text-zinc-500 italic p-6 text-center text-xs font-sans">
                            No matching terminal lines identified.
                          </div>
                        );
                      }

                      return logsToRender.map((log, idx) => {
                        const isShell = log.startsWith('[shell]');
                        const isError = log.toLowerCase().includes('error') || log.toLowerCase().includes('failed');
                        const isCdr = log.startsWith('[coder]');
                        const isVer = log.startsWith('[verifier]') || log.startsWith('[linter]');
                        const isPlan = log.startsWith('[planner]');
                        const isWs = log.startsWith('[workspace]');
                        const isSuccessMark = log.startsWith('🎉') || log.includes('COMPLETE') || log.includes('succeeded');
                        
                        return (
                          <motion.div 
                            key={idx}
                            initial={{ opacity: 0, x: -5 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.15 }}
                            className={`py-0.8 flex items-start gap-1 font-mono hover:bg-white/[0.02] rounded px-1 group ${
                              isError 
                                ? 'bg-red-950/20 text-rose-500' 
                                : isSuccessMark 
                                  ? 'text-emerald-400 font-semibold' 
                                  : ''
                            }`}
                          >
                            <span className="text-zinc-650 font-sans select-none block shrink-0 text-right w-6 leading-none pt-0.5 group-hover:text-zinc-400">{idx + 1}</span>
                            
                            <div className="flex-1 truncate">
                              {/* Colored Badges based on theme palette matches */}
                              {isShell && (
                                <span className={`mr-1.5 font-bold uppercase shrink-0 select-none ${
                                  terminalTheme === 'cyberpunk' ? 'text-cyan-400' : (terminalTheme === 'phosphor' ? 'text-emerald-300' : 'text-amber-300')
                                }`}>sh $</span>
                              )}
                              
                              {isCdr && (
                                <span className="mr-1.5 text-purple-400 font-extrabold select-none">🧙 [coder]</span>
                              )}

                              {isVer && (
                                <span className="mr-1.5 text-blue-400 font-extrabold select-none">🛡️ [linter]</span>
                              )}

                              {isPlan && (
                                <span className="mr-1.5 text-orange-400 font-extrabold select-none">📋 [planner]</span>
                              )}

                              {isWs && (
                                <span className="mr-1.5 text-teal-400 font-extrabold select-none">💾 [workspace]</span>
                              )}

                              <span className="whitespace-pre-wrap select-text selection:bg-blue-500 select-all">{log}</span>
                            </div>
                          </motion.div>
                        );
                      });
                    })()}
                    <div ref={terminalBottomRef} />
                  </div>
                </motion.div>
              </div>
            )}

          </div>
          )}

          {/* BOTTOM FIXED PANEL: input control fields mimicking requested design */}
          <div className="p-4 md:p-6 bg-gradient-to-t from-[#fbfaf8] via-[#fbfaf8]/95 to-transparent dark:from-[#191919] dark:via-[#191919]/95 z-25 transition-all text-left">
            <div className="max-w-3xl mx-auto">
              
              {/* Input area bounding frame styled as the high-end Claude input field */}
              <div className="border border-[#ebdcb9]/90 dark:border-[#35332f] bg-[#fdfdfc] dark:bg-[#1f1e1c] rounded-2xl flex flex-col p-2 pt-3 shadow-md focus-within:border-[#d97756] focus-within:shadow-lg transition-all">
                
                {/* Actual textbox */}
                <textarea
                  value={promptInput}
                  onChange={(e) => setPromptInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Detail what component files you need modified or created..."
                  className="w-full bg-transparent border-none focus:ring-0 focus:outline-none text-sm px-4 resize-none min-h-[44px] text-[#191919] dark:text-[#ecebe5] placeholder-[#8c887d] dark:placeholder-zinc-500 font-sans scrollbar-none"
                  rows={1}
                />

                {/* Actions alignment toolbar */}
                <div className="flex items-center justify-between border-t border-[#ebdcb9]/40 dark:border-[#2d2c29] mt-2 pt-2.5 px-3">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold text-[#8a8170] dark:text-[#aba79c] flex items-center gap-1.5 uppercase select-none">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#d97756]"></span> 
                      Target Namespace: <span className="text-[#8f6244] dark:text-[#df9e7e] font-mono normal-case tracking-tight font-extrabold bg-[#ebdcb9]/40 dark:bg-[#2d2c29] px-2 py-0.5 rounded">{agentWorkspace || '(Disconnected)'}</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-3">

                    {/* Custom Searchable Model Dropdown Box matching Lumina style */}
                    <div className="relative" ref={modelDropdownRef}>
                      <button
                        type="button"
                        onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                        className="flex items-center gap-2 bg-[#f5f2e9] dark:bg-[#2d2c29] border border-[#ebdcb9] dark:border-[#3a3834] rounded-lg px-3 py-1 text-[11px] font-bold text-[#5e574a] dark:text-[#ccc7be] hover:text-[#191919] dark:hover:text-white outline-none cursor-pointer transition-colors font-semibold uppercase tracking-wider h-8"
                      >
                        <span className="truncate max-w-[120px]">{agentSelectedProvider}</span>
                        <ChevronDown size={11} className={`transition-transform duration-200 shrink-0 ${isModelDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>

                      <AnimatePresence>
                        {isModelDropdownOpen && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="absolute bottom-full right-0 mb-2 w-72 max-h-[340px] bg-[#FAF9F5] dark:bg-[#1d1c1a] border border-[#ebdcb9] dark:border-[#33312e] rounded-xl shadow-2xl z-[150] flex flex-col overflow-hidden text-left"
                          >
                            {/* Search Header */}
                            <div className="p-2 border-b border-[#ebdcb9]/60 dark:border-[#2a2926] shrink-0 bg-[#f4f2eb] dark:bg-[#181716] flex items-center gap-2">
                              <Search size={12} className="text-[#8c8273] dark:text-zinc-500 shrink-0" />
                              <input
                                type="text"
                                placeholder="Search models or providers..."
                                value={modelSearchQuery}
                                onChange={(e) => setModelSearchQuery(e.target.value)}
                                className="w-full bg-transparent border-none p-0 outline-none focus:ring-0 text-xs text-[#191919] dark:text-white placeholder-[#8c887d] dark:placeholder-zinc-500 font-medium"
                                autoFocus
                              />
                              {isLoadingModels && <Loader2 size={12} className="animate-spin text-[#d97756] shrink-0" />}
                            </div>

                            {/* Options Scroll List */}
                            <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5 max-h-[260px] custom-scrollbar">
                              {filteredModels.length > 0 ? (
                                filteredModels.map((m) => {
                                  const isSelected = agentSelectedProvider === m.name || agentSelectedProvider === m.id;
                                  return (
                                    <button
                                      key={m.id}
                                      type="button"
                                      onClick={() => {
                                        setAgentSelectedProvider(m.name);
                                        setIsModelDropdownOpen(false);
                                        setModelSearchQuery('');
                                      }}
                                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold text-left transition-all ${
                                        isSelected
                                          ? 'bg-[#ebdcb9]/60 dark:bg-[#35332f] text-[#d97756] dark:text-[#df9e7e]'
                                          : 'text-[#5e574a] dark:text-[#ccc7be] hover:bg-[#ebdcb9]/20 dark:hover:bg-[#201f1c]'
                                      }`}
                                    >
                                      <div className="flex items-center gap-2 truncate">
                                        <span className="text-sm shrink-0">{m.icon}</span>
                                        <div className="truncate flex flex-col">
                                          <span className="truncate">{m.name}</span>
                                          <span className="text-[9px] text-[#8a8170] dark:text-zinc-500 font-sans uppercase font-bold tracking-tight">{m.provider}</span>
                                        </div>
                                      </div>
                                      {isSelected && <Check size={12} className="text-[#d97756] shrink-0" />}
                                    </button>
                                  );
                                })
                              ) : (
                                <div className="text-center p-4 text-[11px] text-[#8c8273] dark:text-zinc-500">
                                  No models found
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Send Action */}
                    <button
                      onClick={() => {
                        if (!promptInput.trim()) return;
                        executePlannerMock(promptInput.trim());
                        setPromptInput('');
                      }}
                      disabled={!promptInput.trim()}
                      className={`p-2 rounded-xl transition-all flex items-center justify-center cursor-pointer ${
                        promptInput.trim() 
                          ? 'bg-[#d97756] hover:bg-[#c66442] text-white hover:scale-[1.05] shadow-xs' 
                          : 'bg-[#ebdcb9]/40 dark:bg-[#252422] text-[#8c8270] dark:text-zinc-650'
                      }`}
                    >
                      <ArrowUp size={15} />
                    </button>
                  </div>
                </div>

              </div>

              {/* Hint subtitle */}
              <div className="text-center text-[10px] text-[#8c8273] dark:text-[#918f88] mt-2 font-medium">
                Claude Coder mode routes actions sequentially across custom orchestrators to assure safe execution.
              </div>

            </div>
          </div>

        </div>

        <AnimatePresence>
          {isPanelSettingsOpen && (
            <CoderSettingsPanel
              agentApiKeys={agentApiKeys}
              setAgentApiKeys={setAgentApiKeys}
              onClose={() => setIsPanelSettingsOpen(false)}
            />
          )}
        </AnimatePresence>

      </div>

    </div>
  );
};
