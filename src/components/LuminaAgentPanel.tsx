import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutDashboard,
  Bot,
  Brain,
  Workflow,
  Activity,
  GitMerge,
  MessageSquare,
  ChevronLeft,
  RefreshCw,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Filter,
  Trash2,
  Play,
  Pause,
  Zap,
  Send,
  Wifi,
  WifiOff,
  TrendingUp,
  Users,
  Coins,
  Calendar,
  Eye,
  EyeOff,
  Settings,
  X,
  FolderOpen,
  ArrowRight,
  Plus,
  Shield,
  Copy,
  ExternalLink,
  BarChart3,
  Table,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  FileText
} from 'lucide-react';
import { Agent } from '../agents/types';

// ─── Types ──────────────────────────────────────────────────────────────────────
type View = 'dashboard' | 'agents' | 'memory' | 'automations' | 'events' | 'consolidation' | 'telegram' | 'settings';

interface SubAgent {
  id: string;
  name: string;
  phase: number;
  status: 'waiting' | 'running' | 'done' | 'failed' | 'needs_review';
  filesCreated: string[];
  startedAt?: number;
  completedAt?: number;
  error?: string;
  events?: any[];
}

interface AgentOrchestrationState {
  isActive: boolean;
  agents: SubAgent[];
  currentPhase: number;
  totalPhases: number;
}

interface LuminaAgentPanelProps {
  onClose: () => void;
  agents: Agent[];
  orchestrationState: AgentOrchestrationState;
  onOpenAgentsPage?: () => void;
  convex?: {
    isConvexConnected: boolean;
    metrics: any;
    addEvent: (eventType: string, source: string, message: string, metadata?: Record<string, string>) => Promise<void>;
    addAgent: (agent: any) => Promise<void>;
    patchAgent: (agentId: string, patch: any) => Promise<void>;
    deleteAgent: (agentId: string) => Promise<void>;
    addLog: (agentId: string, logType: string, content: string, toolName?: string) => Promise<void>;
  };
}

export interface LlmSettings {
  provider: 'openai' | 'anthropic' | 'llama-bridge' | 'custom';
  model: string;
  apiKey: string;
  baseUrl: string;
  temperature: number;
  maxTokens: number;
}

export function getLlmSettings(): LlmSettings {
  const defaults: LlmSettings = {
    provider: 'llama-bridge',
    model: 'sonnet',
    apiKey: '',
    baseUrl: 'http://127.0.0.1:8089',
    temperature: 0.7,
    maxTokens: 4096,
  };
  try {
    const saved = localStorage.getItem('lumina_llm_settings');
    return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
  } catch {
    return defaults;
  }
}

// ─── Helper Functions ───────────────────────────────────────────────────────────
function timeAgo(ts: number | null): string {
  if (!ts) return 'never';
  const diff = Date.now() - ts;
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

// ─── Status Config ──────────────────────────────────────────────────────────────
const SUBAGENT_STATUS: Record<string, { dot: string; label: string; color: string }> = {
  waiting: { dot: 'bg-amber-400', label: 'Waiting', color: 'text-amber-400' },
  spawned: { dot: 'bg-amber-400', label: 'Spawning', color: 'text-amber-400' },
  running: { dot: 'bg-sky-400', label: 'Running', color: 'text-sky-400' },
  done: { dot: 'bg-emerald-400', label: 'Done', color: 'text-emerald-400' },
  failed: { dot: 'bg-rose-400', label: 'Failed', color: 'text-rose-400' },
  needs_review: { dot: 'bg-orange-400', label: 'Needs Review', color: 'text-orange-400' },
  cancelled: { dot: 'bg-zinc-500', label: 'Cancelled', color: 'text-zinc-500' },
};

// ─── Empty State Component ──────────────────────────────────────────────────────
function EmptyState({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-12 h-12 rounded-2xl bg-zinc-800/50 flex items-center justify-center mb-4 text-zinc-500">
        {icon}
      </div>
      <h3 className="text-sm font-semibold text-zinc-300 mb-1">{title}</h3>
      <p className="text-xs text-zinc-500 max-w-[240px]">{description}</p>
    </div>
  );
}

// ─── Dashboard Panel ────────────────────────────────────────────────────────────
function DashboardSubPanel({ agents, orchestrationState, onOpenAgentsPage }: {
  agents: Agent[];
  orchestrationState: AgentOrchestrationState;
  onOpenAgentsPage?: () => void;
}) {
  const totalAgents = agents.length;
  const builtinAgents = agents.filter(a => a.isBuiltin).length;
  const customAgents = agents.filter(a => !a.isBuiltin).length;

  const runningSubagents = orchestrationState.agents.filter(a => a.status === 'running').length;
  const completedSubagents = orchestrationState.agents.filter(a => a.status === 'done').length;
  const failedSubagents = orchestrationState.agents.filter(a => a.status === 'failed').length;
  const totalSubagents = orchestrationState.agents.length;

  const activeSkills = useMemo(() => {
    const skills = new Set<string>();
    agents.forEach(a => a.skills?.forEach(s => { if (s.enabled) skills.add(s.id); }));
    return skills.size;
  }, [agents]);

  const activeTools = useMemo(() => {
    const tools = new Set<string>();
    agents.forEach(a => a.tools?.forEach(t => { if (t.active) tools.add(t.id); }));
    return tools.size;
  }, [agents]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Overview</h3>
        <span className="text-[10px] text-zinc-600">Live</span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Agents', value: String(totalAgents), icon: <Bot size={14} className="text-violet-400" />, sub: `${customAgents} custom` },
          { label: 'Subagents', value: String(totalSubagents), icon: <Users size={14} className="text-sky-400" />, sub: orchestrationState.isActive ? `${runningSubagents} running` : 'idle' },
          { label: 'Skills', value: String(activeSkills), icon: <Zap size={14} className="text-amber-400" />, sub: 'active' },
          { label: 'Tools', value: String(activeTools), icon: <Settings size={14} className="text-emerald-400" />, sub: 'enabled' },
          { label: 'Phases', value: `${orchestrationState.currentPhase}/${orchestrationState.totalPhases}`, icon: <GitMerge size={14} className="text-cyan-400" />, sub: orchestrationState.isActive ? 'active' : 'idle' },
          { label: 'Completed', value: String(completedSubagents), icon: <CheckCircle2 size={14} className="text-emerald-400" />, sub: failedSubagents > 0 ? `${failedSubagents} failed` : 'all good' },
        ].map((s) => (
          <div key={s.label} className="border border-zinc-800 bg-zinc-900/40 rounded-xl p-3.5">
            <div className="flex items-center gap-2 mb-2">
              {s.icon}
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{s.label}</span>
            </div>
            <div className="text-lg font-bold text-zinc-100">{s.value}</div>
            <div className="text-[10px] text-zinc-500 mt-0.5">{s.sub}</div>
          </div>
        ))}
      </div>

      {orchestrationState.isActive && (
        <div className="border border-zinc-800 bg-zinc-900/40 rounded-xl p-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3">Active Orchestration</h4>
          <div className="space-y-2">
            {orchestrationState.agents.filter(a => a.status === 'running' || a.status === 'waiting').map((sa) => (
              <div key={sa.id} className="flex items-center gap-3 p-2 rounded-lg bg-zinc-800/30">
                <span className={`w-2 h-2 rounded-full ${SUBAGENT_STATUS[sa.status]?.dot || 'bg-zinc-500'}`} />
                <span className="text-xs text-zinc-300 flex-1">{sa.name}</span>
                <span className={`text-[10px] font-medium ${SUBAGENT_STATUS[sa.status]?.color || 'text-zinc-400'}`}>
                  {SUBAGENT_STATUS[sa.status]?.label || sa.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {totalAgents > 0 && (
        <div className="border border-zinc-800 bg-zinc-900/40 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Your Agents</h4>
            {onOpenAgentsPage && (
              <button
                onClick={onOpenAgentsPage}
                className="flex items-center gap-1 text-[10px] text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                View all <ArrowRight size={10} />
              </button>
            )}
          </div>
          <div className="space-y-2">
            {agents.slice(0, 5).map((agent) => (
              <div key={agent.id} className="flex items-center gap-3 p-2 rounded-lg bg-zinc-800/30">
                <div className={`w-8 h-8 rounded-lg ${agent.avatarColor || 'bg-zinc-700'} flex items-center justify-center text-sm`}>
                  {agent.avatarEmoji || '🤖'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-zinc-200 truncate">{agent.name}</div>
                  <div className="text-[10px] text-zinc-500 truncate">{agent.description || 'No description'}</div>
                </div>
                <div className="text-[10px] text-zinc-600">{agent.model || 'default'}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {totalAgents === 0 && !orchestrationState.isActive && (
        <div className="border border-dashed border-zinc-800 rounded-xl p-6 text-center">
          <Bot size={24} className="mx-auto text-zinc-600 mb-3" />
          <p className="text-xs text-zinc-400 mb-1">No agents yet</p>
          <p className="text-[10px] text-zinc-600">Create your first agent to get started</p>
        </div>
      )}
    </div>
  );
}

// ─── Execution Agent Types ──────────────────────────────────────────────────────
type ExecAgentStatus = 'spawned' | 'running' | 'completed' | 'failed' | 'cancelled';

interface AgentLogEntry {
  id: string;
  logType: 'thinking' | 'tool_use' | 'tool_result' | 'text' | 'error';
  toolName?: string;
  content: string;
  createdAt: number;
}

interface ExecutionAgent {
  id: string;
  agentId: string;
  name: string;
  task: string;
  status: ExecAgentStatus;
  result?: string;
  error?: string;
  integrations: string[];
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  startedAt: number;
  completedAt?: number;
  logs: AgentLogEntry[];
  conversationId?: string;
}

const EXEC_AGENTS_KEY = 'lumina_exec_agents';

function loadExecAgents(): ExecutionAgent[] {
  try {
    const raw = localStorage.getItem(EXEC_AGENTS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function saveExecAgents(agents: ExecutionAgent[]) {
  localStorage.setItem(EXEC_AGENTS_KEY, JSON.stringify(agents));
}

function generateAgentId(): string {
  return `agent_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function generateLogId(): string {
  return `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

const EXEC_STATUS_CONFIG: Record<ExecAgentStatus, { dot: string; label: string; color: string; bgColor: string }> = {
  spawned:   { dot: 'bg-amber-400',  label: 'Spawning',  color: 'text-amber-400',  bgColor: 'bg-amber-500/10 border-amber-500/20' },
  running:   { dot: 'bg-sky-400',    label: 'Running',   color: 'text-sky-400',    bgColor: 'bg-sky-500/10 border-sky-500/20' },
  completed: { dot: 'bg-emerald-400', label: 'Done',     color: 'text-emerald-400', bgColor: 'bg-emerald-500/10 border-emerald-500/20' },
  failed:    { dot: 'bg-rose-400',   label: 'Failed',    color: 'text-rose-400',   bgColor: 'bg-rose-500/10 border-rose-500/20' },
  cancelled: { dot: 'bg-zinc-500',   label: 'Cancelled', color: 'text-zinc-400',   bgColor: 'bg-zinc-500/10 border-zinc-500/20' },
};

const INTEGRATION_ICONS: Record<string, { emoji: string; color: string }> = {
  gmail: { emoji: '📧', color: 'bg-red-500/10 text-red-400 border-red-500/20' },
  slack: { emoji: '💬', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  github: { emoji: '🐙', color: 'bg-zinc-400/10 text-zinc-300 border-zinc-400/20' },
  telegram: { emoji: '✈️', color: 'bg-sky-500/10 text-sky-400 border-sky-500/20' },
  notion: { emoji: '📝', color: 'bg-zinc-300/10 text-zinc-300 border-zinc-300/20' },
  googlecalendar: { emoji: '📅', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  twitter: { emoji: '🐦', color: 'bg-sky-400/10 text-sky-300 border-sky-400/20' },
  discord: { emoji: '🎮', color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' },
  web: { emoji: '🌐', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
};

const LOG_TYPE_CONFIG: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  thinking: { icon: <Brain size={10} />, color: 'text-zinc-400', label: 'Thinking' },
  tool_use: { icon: <Zap size={10} />, color: 'text-violet-400', label: 'Tool Use' },
  tool_result: { icon: <CheckCircle2 size={10} />, color: 'text-emerald-400', label: 'Tool Result' },
  text: { icon: <MessageSquare size={10} />, color: 'text-sky-400', label: 'Text' },
  error: { icon: <XCircle size={10} />, color: 'text-rose-400', label: 'Error' },
};

// ─── Simulated Agent Tasks ──────────────────────────────────────────────────────
const SIMULATED_TASKS = [
  { name: 'Email Research', task: 'Search for recent emails and summarize key points', integrations: ['gmail'] },
  { name: 'GitHub Monitor', task: 'Check GitHub notifications and summarize new PRs', integrations: ['github'] },
  { name: 'Calendar Prep', task: 'Review upcoming meetings and prepare agendas', integrations: ['googlecalendar'] },
  { name: 'Slack Digest', task: 'Summarize unread Slack messages from today', integrations: ['slack'] },
  { name: 'Web Research', task: 'Research latest AI news and create a summary', integrations: ['web'] },
  { name: 'Notion Update', task: 'Update project documentation in Notion', integrations: ['notion'] },
  { name: 'Twitter Monitor', task: 'Check Twitter mentions and trending topics', integrations: ['twitter'] },
  { name: 'Multi-Tool Task', task: 'Gather data from multiple sources and compile report', integrations: ['gmail', 'github', 'web'] },
];

function generateSimulatedLogs(task: string, integrations: string[]): AgentLogEntry[] {
  const logs: AgentLogEntry[] = [];
  const now = Date.now();

  logs.push({ id: generateLogId(), logType: 'thinking', content: `Analyzing task: ${task}`, createdAt: now });

  if (integrations.includes('gmail')) {
    logs.push({ id: generateLogId(), logType: 'tool_use', toolName: 'gmail.search', content: 'Searching inbox for recent emails', createdAt: now + 1000 });
    logs.push({ id: generateLogId(), logType: 'tool_result', toolName: 'gmail.search', content: 'Found 12 unread emails', createdAt: now + 2500 });
  }
  if (integrations.includes('github')) {
    logs.push({ id: generateLogId(), logType: 'tool_use', toolName: 'github.list_prs', content: 'Fetching open pull requests', createdAt: now + 1500 });
    logs.push({ id: generateLogId(), logType: 'tool_result', toolName: 'github.list_prs', content: 'Found 5 open PRs across 3 repos', createdAt: now + 3000 });
  }
  if (integrations.includes('web')) {
    logs.push({ id: generateLogId(), logType: 'tool_use', toolName: 'web.search', content: 'Searching for recent news', createdAt: now + 2000 });
    logs.push({ id: generateLogId(), logType: 'tool_result', toolName: 'web.search', content: 'Found 8 relevant articles', createdAt: now + 3500 });
  }
  if (integrations.includes('slack')) {
    logs.push({ id: generateLogId(), logType: 'tool_use', toolName: 'slack.history', content: 'Fetching channel history', createdAt: now + 1200 });
    logs.push({ id: generateLogId(), logType: 'tool_result', toolName: 'slack.history', content: 'Retrieved 45 messages from 3 channels', createdAt: now + 2800 });
  }
  if (integrations.includes('notion')) {
    logs.push({ id: generateLogId(), logType: 'tool_use', toolName: 'notion.update_page', content: 'Updating documentation', createdAt: now + 1800 });
    logs.push({ id: generateLogId(), logType: 'tool_result', toolName: 'notion.update_page', content: 'Page updated successfully', createdAt: now + 3200 });
  }

  logs.push({ id: generateLogId(), logType: 'thinking', content: 'Compiling results and formatting response', createdAt: now + 4000 });
  logs.push({ id: generateLogId(), logType: 'text', content: 'Task completed successfully. Results compiled.', createdAt: now + 5000 });

  return logs;
}

// ─── Agents Panel ───────────────────────────────────────────────────────────────
function AgentsSubPanel({ agents, orchestrationState, onOpenAgentsPage }: {
  agents: Agent[];
  orchestrationState: AgentOrchestrationState;
  onOpenAgentsPage?: () => void;
}) {
  const [execAgents, setExecAgents] = useState<ExecutionAgent[]>(loadExecAgents);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | ExecAgentStatus>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    saveExecAgents(execAgents);
  }, [execAgents]);

  // Re-read from localStorage periodically
  useEffect(() => {
    const interval = setInterval(() => setExecAgents(loadExecAgents()), 2000);
    return () => clearInterval(interval);
  }, []);

  const activeCount = useMemo(() => execAgents.filter(a => a.status === 'running' || a.status === 'spawned').length, [execAgents]);

  const filtered = useMemo(() => {
    let result = execAgents;
    if (statusFilter !== 'all') result = result.filter(a => a.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(a => a.name.toLowerCase().includes(q) || a.task.toLowerCase().includes(q));
    }
    return result;
  }, [execAgents, statusFilter, search]);

  const selectedAgent = useMemo(() => execAgents.find(a => a.id === selectedId) || null, [execAgents, selectedId]);

  const cancelAgent = useCallback((id: string) => {
    setExecAgents(prev => prev.map(a => {
      if (a.id !== id) return a;
      return { ...a, status: 'cancelled' as const, completedAt: Date.now() };
    }));
  }, []);

  const deleteAgent = useCallback((id: string) => {
    setExecAgents(prev => prev.filter(a => a.id !== id));
    if (selectedId === id) setSelectedId(null);
  }, [selectedId]);

  const retryAgent = useCallback((agent: ExecutionAgent) => {
    const newAgent: ExecutionAgent = {
      ...agent,
      id: generateAgentId(),
      agentId: generateAgentId(),
      status: 'spawned',
      result: undefined,
      error: undefined,
      inputTokens: 0,
      outputTokens: 0,
      costUsd: 0,
      startedAt: Date.now(),
      completedAt: undefined,
      logs: [],
    };
    setExecAgents(prev => [newAgent, ...prev]);

    // Simulate lifecycle
    setTimeout(() => {
      setExecAgents(prev => prev.map(a => a.id === newAgent.id ? { ...a, status: 'running' } : a));
    }, 500);

    const duration = 3000 + Math.random() * 5000;
    setTimeout(() => {
      const success = Math.random() > 0.2;
      const logs = generateSimulatedLogs(agent.task, agent.integrations);
      setExecAgents(prev => prev.map(a => {
        if (a.id !== newAgent.id) return a;
        return {
          ...a,
          status: success ? 'completed' : 'failed',
          result: success ? 'Task completed successfully. All objectives met.' : undefined,
          error: success ? undefined : 'Agent timed out while processing',
          logs,
          completedAt: Date.now(),
          inputTokens: Math.floor(Math.random() * 5000) + 500,
          outputTokens: Math.floor(Math.random() * 2000) + 200,
          costUsd: parseFloat((Math.random() * 0.05).toFixed(4)),
        };
      }));
    }, duration);
  }, []);

  // Spawn a new agent
  const spawnAgent = useCallback((taskConfig?: typeof SIMULATED_TASKS[number]) => {
    const config = taskConfig || SIMULATED_TASKS[Math.floor(Math.random() * SIMULATED_TASKS.length)];
    const newAgent: ExecutionAgent = {
      id: generateAgentId(),
      agentId: generateAgentId(),
      name: config.name,
      task: config.task,
      status: 'spawned',
      integrations: config.integrations,
      inputTokens: 0,
      outputTokens: 0,
      costUsd: 0,
      startedAt: Date.now(),
      logs: [],
    };
    setExecAgents(prev => [newAgent, ...prev]);

    // Simulate lifecycle
    setTimeout(() => {
      setExecAgents(prev => prev.map(a => a.id === newAgent.id ? { ...a, status: 'running' } : a));
    }, 800);

    const duration = 3000 + Math.random() * 5000;
    setTimeout(() => {
      const success = Math.random() > 0.15;
      const logs = generateSimulatedLogs(config.task, config.integrations);
      setExecAgents(prev => prev.map(a => {
        if (a.id !== newAgent.id) return a;
        return {
          ...a,
          status: success ? 'completed' : 'failed',
          result: success ? 'Task completed successfully. All objectives met.' : undefined,
          error: success ? undefined : 'Agent encountered an error during execution',
          logs,
          completedAt: Date.now(),
          inputTokens: Math.floor(Math.random() * 5000) + 500,
          outputTokens: Math.floor(Math.random() * 2000) + 200,
          costUsd: parseFloat((Math.random() * 0.05).toFixed(4)),
        };
      }));
    }, duration);
  }, []);

  // ─── Detail View ───────────────────────────────────────────────────────────
  if (selectedAgent) {
    const cfg = EXEC_STATUS_CONFIG[selectedAgent.status];
    const isActive = selectedAgent.status === 'running' || selectedAgent.status === 'spawned';
    const elapsed = selectedAgent.completedAt
      ? ((selectedAgent.completedAt - selectedAgent.startedAt) / 1000).toFixed(1)
      : ((Date.now() - selectedAgent.startedAt) / 1000).toFixed(0);

    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => setSelectedId(null)} className="p-1 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-200 transition-colors">
            <ChevronLeft size={16} />
          </button>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot} ${isActive ? 'animate-pulse' : ''}`} />
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 truncate">{selectedAgent.name}</span>
            <span className={`text-[10px] font-medium ${cfg.color}`}>{cfg.label}</span>
          </div>
          {isActive ? (
            <button
              onClick={() => cancelAgent(selectedAgent.id)}
              className="px-2.5 py-1 text-[10px] font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-lg hover:bg-rose-500/20 transition-colors"
            >
              Cancel
            </button>
          ) : (
            <div className="flex gap-1.5">
              <button
                onClick={() => retryAgent(selectedAgent)}
                className="px-2.5 py-1 text-[10px] font-medium bg-sky-500/10 text-sky-400 border border-sky-500/20 rounded-lg hover:bg-sky-500/20 transition-colors"
              >
                Retry
              </button>
              <button
                onClick={() => deleteAgent(selectedAgent.id)}
                className="px-2.5 py-1 text-[10px] font-medium bg-zinc-800/50 text-zinc-500 border border-zinc-800 rounded-lg hover:text-rose-400 transition-colors"
              >
                <Trash2 size={10} />
              </button>
            </div>
          )}
        </div>

        {/* Request */}
        <div className="border border-zinc-800 bg-zinc-900/40 rounded-xl p-3.5">
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-2">Request</h4>
          <p className="text-[11px] text-zinc-300">{selectedAgent.task}</p>
        </div>

        {/* Integrations */}
        {selectedAgent.integrations.length > 0 && (
          <div className="border border-zinc-800 bg-zinc-900/40 rounded-xl p-3.5">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-2">Integrations</h4>
            <div className="flex gap-1.5 flex-wrap">
              {selectedAgent.integrations.map((int) => {
                const intCfg = INTEGRATION_ICONS[int] || { emoji: '🔧', color: 'bg-zinc-800 text-zinc-400 border-zinc-700' };
                return (
                  <span key={int} className={`px-2 py-1 text-[10px] rounded-full border flex items-center gap-1 ${intCfg.color}`}>
                    {intCfg.emoji} {int}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="border border-zinc-800 bg-zinc-900/40 rounded-xl p-2.5 text-center">
            <div className="text-[9px] text-zinc-500 uppercase tracking-wider">Tokens In</div>
            <div className="text-sm font-bold text-zinc-200">{fmtTokens(selectedAgent.inputTokens)}</div>
          </div>
          <div className="border border-zinc-800 bg-zinc-900/40 rounded-xl p-2.5 text-center">
            <div className="text-[9px] text-zinc-500 uppercase tracking-wider">Tokens Out</div>
            <div className="text-sm font-bold text-zinc-200">{fmtTokens(selectedAgent.outputTokens)}</div>
          </div>
          <div className="border border-zinc-800 bg-zinc-900/40 rounded-xl p-2.5 text-center">
            <div className="text-[9px] text-zinc-500 uppercase tracking-wider">Cost</div>
            <div className="text-sm font-bold text-emerald-400">${selectedAgent.costUsd.toFixed(4)}</div>
          </div>
        </div>

        {/* Timeline */}
        <div className="border border-zinc-800 bg-zinc-900/40 rounded-xl p-3.5">
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-3">
            Timeline
            {isActive && <span className="ml-2 text-sky-400 animate-pulse">● live</span>}
          </h4>
          {selectedAgent.logs.length === 0 ? (
            <p className="text-[10px] text-zinc-600 text-center py-4">Waiting for logs...</p>
          ) : (
            <div className="space-y-0">
              {selectedAgent.logs.map((log, i) => {
                const logCfg = LOG_TYPE_CONFIG[log.logType] || LOG_TYPE_CONFIG.text;
                return (
                  <div key={log.id} className="flex gap-3 relative">
                    {/* Timeline line */}
                    <div className="flex flex-col items-center">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${logCfg.color}`} style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
                        {logCfg.icon}
                      </div>
                      {i < selectedAgent.logs.length - 1 && (
                        <div className="w-px h-full bg-zinc-800 min-h-[20px]" />
                      )}
                    </div>
                    {/* Content */}
                    <div className="pb-4 min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`text-[10px] font-medium ${logCfg.color}`}>{logCfg.label}</span>
                        {log.toolName && (
                          <span className="text-[9px] text-zinc-600 font-mono">{log.toolName}</span>
                        )}
                        <span className="text-[9px] text-zinc-700 ml-auto">{timeAgo(log.createdAt)}</span>
                      </div>
                      <p className="text-[11px] text-zinc-400 break-words">{log.content}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Response */}
        {selectedAgent.result && (
          <div className="border border-emerald-500/20 bg-emerald-500/5 rounded-xl p-3.5">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 mb-2">Response</h4>
            <p className="text-[11px] text-zinc-300">{selectedAgent.result}</p>
          </div>
        )}

        {/* Error */}
        {selectedAgent.error && (
          <div className="border border-rose-500/20 bg-rose-500/5 rounded-xl p-3.5">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-rose-400 mb-2">Error</h4>
            <p className="text-[11px] text-rose-300">{selectedAgent.error}</p>
          </div>
        )}

        {/* Timing */}
        <div className="text-[10px] text-zinc-600 text-center">
          Started {timeAgo(selectedAgent.startedAt)} · Elapsed {elapsed}s
          {selectedAgent.completedAt && ` · Finished ${timeAgo(selectedAgent.completedAt)}`}
        </div>
      </div>
    );
  }

  // ─── List View ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Agents</h3>
          {activeCount > 0 && (
            <span className="flex items-center gap-1.5 text-[10px] text-sky-400 font-medium">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-sky-400 animate-ping opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-400" />
              </span>
              {activeCount} active
            </span>
          )}
        </div>
        <button
          onClick={() => spawnAgent()}
          className="px-2.5 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg text-[10px] font-medium hover:bg-emerald-500/20 transition-colors flex items-center gap-1"
        >
          <Play size={10} />
          Spawn Agent
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-1">
        {(['all', 'running', 'completed', 'failed', 'cancelled'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-2.5 py-1 text-[10px] rounded-md capitalize transition-colors ${
              statusFilter === s
                ? 'bg-zinc-800 text-white font-medium'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
            }`}
          >
            {s}
            {s !== 'all' && (
              <span className="ml-1 text-[9px] text-zinc-600">
                {execAgents.filter(a => s === 'running' ? a.status === 'running' || a.status === 'spawned' : a.status === s).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-600" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search agents..."
          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-7 pr-2 py-1.5 text-[11px] text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-zinc-600"
        />
      </div>

      {/* Agent Cards */}
      {filtered.length === 0 ? (
        <div className="border border-dashed border-zinc-800 rounded-xl p-6 text-center">
          <Bot size={24} className="mx-auto text-zinc-600 mb-3" />
          <p className="text-xs text-zinc-400 mb-1">
            {execAgents.length === 0 ? 'No agents spawned yet' : 'No matching agents'}
          </p>
          <p className="text-[10px] text-zinc-600">
            {execAgents.length === 0 ? 'Click "Spawn Agent" to create one' : 'Try a different filter'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((agent) => {
            const cfg = EXEC_STATUS_CONFIG[agent.status];
            const isActive = agent.status === 'running' || agent.status === 'spawned';
            const elapsed = agent.completedAt
              ? ((agent.completedAt - agent.startedAt) / 1000).toFixed(1)
              : ((Date.now() - agent.startedAt) / 1000).toFixed(0);

            return (
              <button
                key={agent.id}
                onClick={() => setSelectedId(agent.id)}
                className="w-full border border-zinc-800 bg-zinc-900/40 rounded-xl p-3.5 hover:bg-zinc-800/30 transition-colors text-left"
              >
                {/* Header */}
                <div className="flex items-center gap-2.5 mb-1.5">
                  <span className="relative flex h-2.5 w-2.5 shrink-0">
                    {isActive && <span className={`absolute inline-flex h-full w-full rounded-full ${cfg.dot} animate-ping opacity-75`} />}
                    <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${cfg.dot}`} />
                  </span>
                  <span className="text-xs font-medium text-zinc-200 truncate">{agent.name}</span>
                  <span className={`text-[10px] font-medium ${cfg.color} ml-auto`}>{cfg.label}</span>
                </div>

                {/* Task */}
                <p className="text-[11px] text-zinc-500 line-clamp-1 mb-2">{agent.task}</p>

                {/* Integrations */}
                <div className="flex items-center gap-1.5 flex-wrap mb-2">
                  {agent.integrations.map((int) => {
                    const intCfg = INTEGRATION_ICONS[int] || { emoji: '🔧', color: 'bg-zinc-800 text-zinc-400 border-zinc-700' };
                    return (
                      <span key={int} className={`px-1.5 py-0.5 text-[9px] rounded-full border flex items-center gap-0.5 ${intCfg.color}`}>
                        {intCfg.emoji} {int}
                      </span>
                    );
                  })}
                </div>

                {/* Footer stats */}
                <div className="flex items-center gap-3 text-[10px] text-zinc-600">
                  <span>{fmtTokens(agent.inputTokens + agent.outputTokens)} tokens</span>
                  <span>${agent.costUsd.toFixed(4)}</span>
                  <span>{elapsed}s</span>
                  {agent.logs.length > 0 && (
                    <span className="text-zinc-500">{agent.logs.length} logs</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Memory Types ───────────────────────────────────────────────────────────────
type MemoryTier = 'short' | 'long' | 'permanent';
type MemorySegment = 'identity' | 'preference' | 'relationship' | 'project' | 'knowledge' | 'context';
type MemoryViewMode = 'table' | 'graph';
type MemorySortField = 'content' | 'tier' | 'segment' | 'decay' | 'lastAccessed' | 'createdAt';
type MemorySortDir = 'asc' | 'desc';

interface MemoryRecord {
  id: string;
  content: string;
  tier: MemoryTier;
  segment: MemorySegment;
  decay: number;
  memoryId: string;
  lastAccessed: number;
  createdAt: number;
  source: string;
  agentId: string | null;
}

const MEMORY_STORAGE_KEY = 'lumina_memory_records';

function loadMemoryRecords(): MemoryRecord[] {
  try {
    const raw = localStorage.getItem(MEMORY_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function saveMemoryRecords(records: MemoryRecord[]) {
  localStorage.setItem(MEMORY_STORAGE_KEY, JSON.stringify(records));
}

function generateMemoryId(): string {
  return `mem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function generateUUID(): string {
  return `uuid_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

const TIER_CONFIG: Record<MemoryTier, { label: string; color: string; bgColor: string; borderColor: string; description: string }> = {
  short: { label: 'Short', color: 'text-sky-400', bgColor: 'bg-sky-500/10', borderColor: 'border-sky-500/20', description: 'Ephemeral context, high decay rate' },
  long: { label: 'Long', color: 'text-violet-400', bgColor: 'bg-violet-500/10', borderColor: 'border-violet-500/20', description: 'Project knowledge, moderate decay' },
  permanent: { label: 'Permanent', color: 'text-amber-400', bgColor: 'bg-amber-500/10', borderColor: 'border-amber-500/20', description: 'Core identity, near-zero decay' },
};

const SEGMENT_CONFIG: Record<MemorySegment, { label: string; color: string; dotColor: string }> = {
  identity: { label: 'Identity', color: 'text-rose-400', dotColor: 'bg-rose-400' },
  preference: { label: 'Preference', color: 'text-teal-400', dotColor: 'bg-teal-400' },
  relationship: { label: 'Relationship', color: 'text-pink-400', dotColor: 'bg-pink-400' },
  project: { label: 'Project', color: 'text-orange-400', dotColor: 'bg-orange-400' },
  knowledge: { label: 'Knowledge', color: 'text-blue-400', dotColor: 'bg-blue-400' },
  context: { label: 'Context', color: 'text-zinc-400', dotColor: 'bg-zinc-400' },
};

const INITIAL_MEMORIES: MemoryRecord[] = [
  { id: 'mem_init_1', content: 'User prefers dark mode for all applications', tier: 'permanent', segment: 'preference', decay: 0.95, memoryId: 'uuid_init_001', lastAccessed: Date.now() - 60000, createdAt: Date.now() - 86400000 * 30, source: 'conversation', agentId: null },
  { id: 'mem_init_2', content: 'Working on Lumina AI Chat project', tier: 'long', segment: 'project', decay: 0.82, memoryId: 'uuid_init_002', lastAccessed: Date.now() - 3600000, createdAt: Date.now() - 86400000 * 7, source: 'conversation', agentId: null },
  { id: 'mem_init_3', content: 'User name is Alex, software engineer', tier: 'permanent', segment: 'identity', decay: 0.99, memoryId: 'uuid_init_003', lastAccessed: Date.now() - 1200000, createdAt: Date.now() - 86400000 * 60, source: 'conversation', agentId: null },
  { id: 'mem_init_4', content: 'Meeting with Sarah about Q2 roadmap', tier: 'short', segment: 'context', decay: 0.45, memoryId: 'uuid_init_004', lastAccessed: Date.now() - 300000, createdAt: Date.now() - 86400000, source: 'conversation', agentId: null },
  { id: 'mem_init_5', content: 'Uses Composio for integrations', tier: 'long', segment: 'knowledge', decay: 0.78, memoryId: 'uuid_init_005', lastAccessed: Date.now() - 7200000, createdAt: Date.now() - 86400000 * 14, source: 'agent', agentId: null },
  { id: 'mem_init_6', content: 'Colleague David works on backend team', tier: 'long', segment: 'relationship', decay: 0.71, memoryId: 'uuid_init_006', lastAccessed: Date.now() - 86400000, createdAt: Date.now() - 86400000 * 21, source: 'conversation', agentId: null },
];

// ─── Memory Panel ───────────────────────────────────────────────────────────────
function MemorySubPanel({ agents }: { agents: Agent[] }) {
  const [memories, setMemories] = useState<MemoryRecord[]>(() => {
    const loaded = loadMemoryRecords();
    if (loaded.length === 0) {
      saveMemoryRecords(INITIAL_MEMORIES);
      return INITIAL_MEMORIES;
    }
    return loaded;
  });
  const [viewMode, setViewMode] = useState<MemoryViewMode>('table');
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState<'all' | MemoryTier>('all');
  const [segmentFilter, setSegmentFilter] = useState<'all' | MemorySegment>('all');
  const [sortField, setSortField] = useState<MemorySortField>('lastAccessed');
  const [sortDir, setSortDir] = useState<MemorySortDir>('desc');
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Form state
  const [formContent, setFormContent] = useState('');
  const [formTier, setFormTier] = useState<MemoryTier>('long');
  const [formSegment, setFormSegment] = useState<MemorySegment>('knowledge');
  const [formSource, setFormSource] = useState('conversation');
  const [formAgentId, setFormAgentId] = useState<string | null>(null);

  useEffect(() => {
    saveMemoryRecords(memories);
  }, [memories]);

  // Apply decay over time (simulated)
  useEffect(() => {
    const interval = setInterval(() => {
      setMemories(prev => prev.map(m => {
        let decayRate = 0;
        if (m.tier === 'short') decayRate = 0.002;
        else if (m.tier === 'long') decayRate = 0.0003;
        else decayRate = 0.00001;
        const newDecay = Math.max(0, m.decay - decayRate);
        return { ...m, decay: newDecay };
      }));
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const filtered = useMemo(() => {
    let result = memories;
    if (tierFilter !== 'all') result = result.filter(m => m.tier === tierFilter);
    if (segmentFilter !== 'all') result = result.filter(m => m.segment === segmentFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(m =>
        m.content.toLowerCase().includes(q) ||
        m.memoryId.toLowerCase().includes(q) ||
        m.source.toLowerCase().includes(q)
      );
    }
    result.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'content': cmp = a.content.localeCompare(b.content); break;
        case 'tier': cmp = a.tier.localeCompare(b.tier); break;
        case 'segment': cmp = a.segment.localeCompare(b.segment); break;
        case 'decay': cmp = a.decay - b.decay; break;
        case 'lastAccessed': cmp = a.lastAccessed - b.lastAccessed; break;
        case 'createdAt': cmp = a.createdAt - b.createdAt; break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return result;
  }, [memories, tierFilter, segmentFilter, search, sortField, sortDir]);

  // Stats
  const stats = useMemo(() => {
    const tierCounts: Record<MemoryTier, number> = { short: 0, long: 0, permanent: 0 };
    const segmentCounts: Record<MemorySegment, number> = { identity: 0, preference: 0, relationship: 0, project: 0, knowledge: 0, context: 0 };
    let totalDecay = 0;
    memories.forEach(m => {
      tierCounts[m.tier]++;
      segmentCounts[m.segment]++;
      totalDecay += m.decay;
    });
    return {
      total: memories.length,
      tierCounts,
      segmentCounts,
      avgDecay: memories.length > 0 ? totalDecay / memories.length : 0,
    };
  }, [memories]);

  const handleSort = useCallback((field: MemorySortField) => {
    setSortField(prev => {
      if (prev === field) {
        setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        return field;
      }
      setSortDir('desc');
      return field;
    });
  }, []);

  const resetForm = useCallback(() => {
    setFormContent('');
    setFormTier('long');
    setFormSegment('knowledge');
    setFormSource('conversation');
    setFormAgentId(null);
    setEditingId(null);
    setShowCreate(false);
  }, []);

  const startEdit = useCallback((mem: MemoryRecord) => {
    setFormContent(mem.content);
    setFormTier(mem.tier);
    setFormSegment(mem.segment);
    setFormSource(mem.source);
    setFormAgentId(mem.agentId);
    setEditingId(mem.id);
    setShowCreate(true);
  }, []);

  const saveMemory = useCallback(() => {
    if (!formContent.trim()) return;

    if (editingId) {
      setMemories(prev => prev.map(m => {
        if (m.id !== editingId) return m;
        return { ...m, content: formContent.trim(), tier: formTier, segment: formSegment, source: formSource, agentId: formAgentId };
      }));
    } else {
      const newMem: MemoryRecord = {
        id: generateMemoryId(),
        content: formContent.trim(),
        tier: formTier,
        segment: formSegment,
        decay: formTier === 'permanent' ? 0.99 : formTier === 'long' ? 0.85 : 0.6,
        memoryId: generateUUID(),
        lastAccessed: Date.now(),
        createdAt: Date.now(),
        source: formSource,
        agentId: formAgentId,
      };
      setMemories(prev => [newMem, ...prev]);
    }
    resetForm();
  }, [formContent, formTier, formSegment, formSource, formAgentId, editingId, resetForm]);

  const deleteMemory = useCallback((id: string) => {
    setMemories(prev => prev.filter(m => m.id !== id));
  }, []);

  const recallMemory = useCallback((id: string) => {
    setMemories(prev => prev.map(m => {
      if (m.id !== id) return m;
      const boost = Math.min(1, m.decay + 0.1);
      return { ...m, decay: boost, lastAccessed: Date.now() };
    }));
  }, []);

  const maxSegmentCount = useMemo(() => Math.max(1, ...Object.values(stats.segmentCounts)), [stats.segmentCounts]);
  const maxTierCount = useMemo(() => Math.max(1, ...Object.values(stats.tierCounts)), [stats.tierCounts]);

  // ─── Create/Edit Form ───────────────────────────────────────────────────────
  if (showCreate) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={resetForm} className="p-1 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-200 transition-colors">
            <ChevronLeft size={16} />
          </button>
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
            {editingId ? 'Edit Memory' : 'New Memory'}
          </h3>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1 block">Content</label>
            <textarea
              value={formContent}
              onChange={(e) => setFormContent(e.target.value)}
              placeholder="What should the agent remember?"
              rows={3}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-[11px] text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-zinc-600 resize-none"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5 block">Tier</label>
            <div className="grid grid-cols-3 gap-1.5">
              {(Object.entries(TIER_CONFIG) as [MemoryTier, typeof TIER_CONFIG[MemoryTier]][]).map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => setFormTier(key)}
                  className={`px-2 py-2 text-[10px] rounded-lg border transition-colors text-center ${
                    formTier === key
                      ? `${cfg.bgColor} ${cfg.color} ${cfg.borderColor}`
                      : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <div className="font-medium">{cfg.label}</div>
                  <div className="text-[8px] text-zinc-500 mt-0.5">{cfg.description.split(',')[0]}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5 block">Segment</label>
            <div className="grid grid-cols-3 gap-1.5">
              {(Object.entries(SEGMENT_CONFIG) as [MemorySegment, typeof SEGMENT_CONFIG[MemorySegment]][]).map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => setFormSegment(key)}
                  className={`px-2 py-1.5 text-[10px] rounded-lg border transition-colors flex items-center gap-1.5 ${
                    formSegment === key
                      ? 'bg-zinc-800 text-white border-zinc-600'
                      : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${cfg.dotColor}`} />
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1 block">Source</label>
              <select
                value={formSource}
                onChange={(e) => setFormSource(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-[11px] text-zinc-300 focus:outline-none"
              >
                <option value="conversation">Conversation</option>
                <option value="agent">Agent</option>
                <option value="extraction">Extraction</option>
                <option value="manual">Manual</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1 block">Agent</label>
              <select
                value={formAgentId || ''}
                onChange={(e) => setFormAgentId(e.target.value || null)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-[11px] text-zinc-300 focus:outline-none"
              >
                <option value="">None</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>{a.avatarEmoji} {a.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button onClick={resetForm} className="flex-1 py-2.5 rounded-xl text-xs font-medium bg-zinc-800/50 text-zinc-400 border border-zinc-800 hover:bg-zinc-800 transition-colors">
              Cancel
            </button>
            <button
              onClick={saveMemory}
              disabled={!formContent.trim()}
              className="flex-1 py-2.5 rounded-xl text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {editingId ? 'Save Changes' : 'Add Memory'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Main Panel ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Memory</h3>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-zinc-600">{memories.length} records</span>
          {/* View Toggle */}
          <div className="flex items-center rounded-lg border border-zinc-800 bg-zinc-900/50 text-xs overflow-hidden">
            <button
              onClick={() => setViewMode('table')}
              className={`px-2 py-1 flex items-center gap-1 transition-colors ${
                viewMode === 'table' ? 'bg-emerald-600 text-white font-medium' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Table size={10} />
            </button>
            <button
              onClick={() => setViewMode('graph')}
              className={`px-2 py-1 flex items-center gap-1 transition-colors ${
                viewMode === 'graph' ? 'bg-emerald-600 text-white font-medium' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <BarChart3 size={10} />
            </button>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-2">
        <div className="border border-zinc-800 bg-zinc-900/40 rounded-xl p-2.5 text-center">
          <div className="text-lg font-bold text-zinc-100">{stats.total}</div>
          <div className="text-[9px] text-zinc-500 uppercase tracking-wider">Total</div>
        </div>
        <div className="border border-zinc-800 bg-zinc-900/40 rounded-xl p-2.5 text-center">
          <div className="text-lg font-bold text-amber-400">{stats.avgDecay.toFixed(0)}%</div>
          <div className="text-[9px] text-zinc-500 uppercase tracking-wider">Avg Decay</div>
        </div>
        <div className="border border-zinc-800 bg-zinc-900/40 rounded-xl p-2.5 text-center">
          <div className="text-lg font-bold text-sky-400">{stats.tierCounts.short}</div>
          <div className="text-[9px] text-zinc-500 uppercase tracking-wider">Short</div>
        </div>
        <div className="border border-zinc-800 bg-zinc-900/40 rounded-xl p-2.5 text-center">
          <div className="text-lg font-bold text-amber-400">{stats.tierCounts.permanent}</div>
          <div className="text-[9px] text-zinc-500 uppercase tracking-wider">Permanent</div>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-600" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search memories..."
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-7 pr-2 py-1.5 text-[11px] text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-zinc-600"
          />
        </div>
        <select
          value={tierFilter}
          onChange={(e) => setTierFilter(e.target.value as 'all' | MemoryTier)}
          className="bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-[11px] text-zinc-300 focus:outline-none"
        >
          <option value="all">All Tiers</option>
          {Object.entries(TIER_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <select
          value={segmentFilter}
          onChange={(e) => setSegmentFilter(e.target.value as 'all' | MemorySegment)}
          className="bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-[11px] text-zinc-300 focus:outline-none"
        >
          <option value="all">All Segments</option>
          {Object.entries(SEGMENT_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <button
          onClick={() => { resetForm(); setShowCreate(true); }}
          className="px-3 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg text-[11px] font-medium hover:bg-emerald-500/20 transition-colors flex items-center gap-1"
        >
          <Plus size={12} />
          Add
        </button>
      </div>

      {/* ─── Graph View ──────────────────────────────────────────────────────── */}
      {viewMode === 'graph' && (
        <div className="space-y-4">
          {/* Tier Distribution */}
          <div className="border border-zinc-800 bg-zinc-900/40 rounded-xl p-4">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-3">Tier Distribution</h4>
            <div className="space-y-2.5">
              {(Object.entries(TIER_CONFIG) as [MemoryTier, typeof TIER_CONFIG[MemoryTier]][]).map(([tier, cfg]) => (
                <div key={tier} className="space-y-1">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className={`font-medium ${cfg.color}`}>{cfg.label}</span>
                    <span className="text-zinc-500">{stats.tierCounts[tier]}</span>
                  </div>
                  <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(stats.tierCounts[tier] / maxTierCount) * 100}%` }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                      className={`h-full rounded-full ${cfg.bgColor.replace('/10', '/40')}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Segment Distribution */}
          <div className="border border-zinc-800 bg-zinc-900/40 rounded-xl p-4">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-3">Segment Distribution</h4>
            <div className="space-y-2.5">
              {(Object.entries(SEGMENT_CONFIG) as [MemorySegment, typeof SEGMENT_CONFIG[MemorySegment]][]).map(([seg, cfg]) => (
                <div key={seg} className="space-y-1">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dotColor}`} />
                      <span className="font-medium text-zinc-300">{cfg.label}</span>
                    </span>
                    <span className="text-zinc-500">{stats.segmentCounts[seg]}</span>
                  </div>
                  <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(stats.segmentCounts[seg] / maxSegmentCount) * 100}%` }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                      className={`h-full rounded-full ${cfg.dotColor}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Decay Heatmap */}
          <div className="border border-zinc-800 bg-zinc-900/40 rounded-xl p-4">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-3">Decay Overview</h4>
            <div className="grid grid-cols-6 gap-1.5">
              {filtered.slice(0, 24).map((mem) => {
                const hue = mem.decay > 0.7 ? 'bg-emerald-500' : mem.decay > 0.4 ? 'bg-amber-500' : 'bg-rose-500';
                const opacity = Math.max(0.2, mem.decay);
                return (
                  <div
                    key={mem.id}
                    onClick={() => setExpandedId(expandedId === mem.id ? null : mem.id)}
                    className={`aspect-square rounded-lg ${hue} cursor-pointer transition-all hover:scale-110`}
                    style={{ opacity }}
                    title={`${(mem.decay * 100).toFixed(0)}% - ${mem.content.slice(0, 40)}`}
                  />
                );
              })}
            </div>
            <div className="flex items-center justify-center gap-3 mt-3 text-[9px] text-zinc-500">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-rose-500 opacity-50" /> Low</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-amber-500 opacity-70" /> Medium</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-emerald-500 opacity-90" /> High</span>
            </div>
          </div>
        </div>
      )}

      {/* ─── Table View ──────────────────────────────────────────────────────── */}
      {viewMode === 'table' && (
        <>
          {filtered.length === 0 ? (
            <div className="border border-dashed border-zinc-800 rounded-xl p-6 text-center">
              <Brain size={24} className="mx-auto text-zinc-600 mb-3" />
              <p className="text-xs text-zinc-400 mb-1">
                {memories.length === 0 ? 'No memories yet' : 'No matching memories'}
              </p>
              <p className="text-[10px] text-zinc-600">
                {memories.length === 0 ? 'Add your first memory to get started' : 'Try a different filter'}
              </p>
            </div>
          ) : (
            <div className="border border-zinc-800 rounded-xl overflow-hidden">
              {/* Table Header */}
              <div className="grid grid-cols-[1fr_70px_80px_60px_70px_60px] gap-1 px-3 py-2 bg-zinc-900/80 border-b border-zinc-800 text-[9px] font-bold uppercase tracking-wider text-zinc-500">
                <button onClick={() => handleSort('content')} className="flex items-center gap-1 text-left hover:text-zinc-300 transition-colors">
                  Content {sortField === 'content' && (sortDir === 'asc' ? <ArrowUp size={8} /> : <ArrowDown size={8} />)}
                </button>
                <button onClick={() => handleSort('tier')} className="flex items-center gap-1 hover:text-zinc-300 transition-colors">
                  Tier {sortField === 'tier' && (sortDir === 'asc' ? <ArrowUp size={8} /> : <ArrowDown size={8} />)}
                </button>
                <button onClick={() => handleSort('segment')} className="flex items-center gap-1 hover:text-zinc-300 transition-colors">
                  Segment {sortField === 'segment' && (sortDir === 'asc' ? <ArrowUp size={8} /> : <ArrowDown size={8} />)}
                </button>
                <button onClick={() => handleSort('decay')} className="flex items-center gap-1 hover:text-zinc-300 transition-colors">
                  Decay {sortField === 'decay' && (sortDir === 'asc' ? <ArrowUp size={8} /> : <ArrowDown size={8} />)}
                </button>
                <button onClick={() => handleSort('lastAccessed')} className="flex items-center gap-1 hover:text-zinc-300 transition-colors">
                  Last {sortField === 'lastAccessed' && (sortDir === 'asc' ? <ArrowUp size={8} /> : <ArrowDown size={8} />)}
                </button>
                <span>Actions</span>
              </div>

              {/* Table Rows */}
              <div className="divide-y divide-zinc-800/50">
                {filtered.map((mem) => {
                  const tierCfg = TIER_CONFIG[mem.tier];
                  const segCfg = SEGMENT_CONFIG[mem.segment];
                  const decayColor = mem.decay > 0.7 ? 'text-emerald-400' : mem.decay > 0.4 ? 'text-amber-400' : 'text-rose-400';
                  return (
                    <div
                      key={mem.id}
                      className="grid grid-cols-[1fr_70px_80px_60px_70px_60px] gap-1 px-3 py-2.5 hover:bg-zinc-800/20 transition-colors items-center"
                    >
                      <div className="min-w-0">
                        <p className="text-[11px] text-zinc-300 truncate">{mem.content}</p>
                        <p className="text-[9px] text-zinc-600 truncate">{mem.memoryId}</p>
                      </div>
                      <div>
                        <span className={`px-1.5 py-0.5 text-[9px] rounded-full border ${tierCfg.bgColor} ${tierCfg.color} ${tierCfg.borderColor}`}>
                          {tierCfg.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className={`w-1.5 h-1.5 rounded-full ${segCfg.dotColor}`} />
                        <span className={`text-[10px] ${segCfg.color}`}>{segCfg.label}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-8 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${mem.decay > 0.7 ? 'bg-emerald-500' : mem.decay > 0.4 ? 'bg-amber-500' : 'bg-rose-500'}`}
                            style={{ width: `${mem.decay * 100}%` }}
                          />
                        </div>
                        <span className={`text-[9px] ${decayColor}`}>{(mem.decay * 100).toFixed(0)}%</span>
                      </div>
                      <span className="text-[10px] text-zinc-600">{timeAgo(mem.lastAccessed)}</span>
                      <div className="flex items-center gap-0.5">
                        <button
                          onClick={() => recallMemory(mem.id)}
                          className="p-1 text-zinc-600 hover:text-sky-400 transition-colors"
                          title="Recall (boost decay)"
                        >
                          <RefreshCw size={10} />
                        </button>
                        <button
                          onClick={() => startEdit(mem)}
                          className="p-1 text-zinc-600 hover:text-zinc-300 transition-colors"
                          title="Edit"
                        >
                          <Settings size={10} />
                        </button>
                        <button
                          onClick={() => deleteMemory(mem.id)}
                          className="p-1 text-zinc-600 hover:text-rose-400 transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={10} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Automations Types ──────────────────────────────────────────────────────────
type SchedulePreset = 'hourly' | 'daily' | 'weekly' | 'monthly' | 'custom';

interface AutomationRun {
  id: string;
  startedAt: number;
  completedAt: number | null;
  status: 'completed' | 'failed' | 'running';
  output?: string;
}

interface Automation {
  id: string;
  name: string;
  description: string;
  task: string;
  schedulePreset: SchedulePreset;
  scheduleCron: string;
  enabled: boolean;
  agentId: string | null;
  integrations: string[];
  lastRun: number | null;
  nextRun: number | null;
  runHistory: AutomationRun[];
  createdAt: number;
}

const AUTOMATIONS_STORAGE_KEY = 'lumina_automations';

function loadAutomations(): Automation[] {
  try {
    const raw = localStorage.getItem(AUTOMATIONS_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function saveAutomations(automations: Automation[]) {
  localStorage.setItem(AUTOMATIONS_STORAGE_KEY, JSON.stringify(automations));
}

function generateAutomationId(): string {
  return `auto_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function generateAutomationRunId(): string {
  return `arun_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

const SCHEDULE_PRESETS: { value: SchedulePreset; label: string; description: string }[] = [
  { value: 'hourly', label: 'Every Hour', description: 'Runs once every hour' },
  { value: 'daily', label: 'Daily', description: 'Runs once per day' },
  { value: 'weekly', label: 'Weekly', description: 'Runs once per week' },
  { value: 'monthly', label: 'Monthly', description: 'Runs once per month' },
  { value: 'custom', label: 'Custom Cron', description: 'Define a custom schedule' },
];

const INTEGRATION_OPTIONS = [
  { id: 'gmail', label: 'Gmail', color: 'bg-red-500/10 text-red-400 border-red-500/20' },
  { id: 'slack', label: 'Slack', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  { id: 'github', label: 'GitHub', color: 'bg-zinc-400/10 text-zinc-300 border-zinc-400/20' },
  { id: 'telegram', label: 'Telegram', color: 'bg-sky-500/10 text-sky-400 border-sky-500/20' },
  { id: 'notion', label: 'Notion', color: 'bg-zinc-300/10 text-zinc-300 border-zinc-300/20' },
  { id: 'googlecalendar', label: 'Calendar', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  { id: 'twitter', label: 'Twitter', color: 'bg-sky-400/10 text-sky-300 border-sky-400/20' },
  { id: 'discord', label: 'Discord', color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' },
];

function getNextRunTime(preset: SchedulePreset): number {
  const now = Date.now();
  switch (preset) {
    case 'hourly': return now + 3600000;
    case 'daily': return now + 86400000;
    case 'weekly': return now + 604800000;
    case 'monthly': return now + 2592000000;
    default: return now + 3600000;
  }
}

// ─── Automations Panel ──────────────────────────────────────────────────────────
function AutomationsSubPanel({ agents }: { agents: Agent[] }) {
  const [automations, setAutomations] = useState<Automation[]>(loadAutomations);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Create/Edit form state
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formTask, setFormTask] = useState('');
  const [formSchedule, setFormSchedule] = useState<SchedulePreset>('daily');
  const [formCron, setFormCron] = useState('');
  const [formIntegrations, setFormIntegrations] = useState<string[]>([]);
  const [formAgentId, setFormAgentId] = useState<string | null>(null);

  useEffect(() => {
    saveAutomations(automations);
  }, [automations]);

  const filtered = useMemo(() => {
    if (!search.trim()) return automations;
    const q = search.toLowerCase();
    return automations.filter(a =>
      a.name.toLowerCase().includes(q) ||
      a.description.toLowerCase().includes(q) ||
      a.task.toLowerCase().includes(q)
    );
  }, [automations, search]);

  const enabledCount = useMemo(() => automations.filter(a => a.enabled).length, [automations]);
  const totalRuns = useMemo(() => automations.reduce((sum, a) => sum + a.runHistory.length, 0), [automations]);

  const resetForm = useCallback(() => {
    setFormName('');
    setFormDescription('');
    setFormTask('');
    setFormSchedule('daily');
    setFormCron('');
    setFormIntegrations([]);
    setFormAgentId(null);
    setEditingId(null);
    setShowCreate(false);
  }, []);

  const startEdit = useCallback((auto: Automation) => {
    setFormName(auto.name);
    setFormDescription(auto.description);
    setFormTask(auto.task);
    setFormSchedule(auto.schedulePreset);
    setFormCron(auto.scheduleCron);
    setFormIntegrations([...auto.integrations]);
    setFormAgentId(auto.agentId);
    setEditingId(auto.id);
    setShowCreate(true);
  }, []);

  const saveAutomation = useCallback(() => {
    if (!formName.trim() || !formTask.trim()) return;

    if (editingId) {
      setAutomations(prev => prev.map(a => {
        if (a.id !== editingId) return a;
        return {
          ...a,
          name: formName.trim(),
          description: formDescription.trim(),
          task: formTask.trim(),
          schedulePreset: formSchedule,
          scheduleCron: formCron,
          integrations: formIntegrations,
          agentId: formAgentId,
        };
      }));
    } else {
      const newAuto: Automation = {
        id: generateAutomationId(),
        name: formName.trim(),
        description: formDescription.trim(),
        task: formTask.trim(),
        schedulePreset: formSchedule,
        scheduleCron: formCron,
        enabled: true,
        agentId: formAgentId,
        integrations: formIntegrations,
        lastRun: null,
        nextRun: getNextRunTime(formSchedule),
        runHistory: [],
        createdAt: Date.now(),
      };
      setAutomations(prev => [newAuto, ...prev]);
    }
    resetForm();
  }, [formName, formDescription, formTask, formSchedule, formCron, formIntegrations, formAgentId, editingId, resetForm]);

  const toggleAutomation = useCallback((id: string) => {
    setAutomations(prev => prev.map(a => {
      if (a.id !== id) return a;
      const enabled = !a.enabled;
      return {
        ...a,
        enabled,
        nextRun: enabled ? getNextRunTime(a.schedulePreset) : null,
      };
    }));
  }, []);

  const deleteAutomation = useCallback((id: string) => {
    setAutomations(prev => prev.filter(a => a.id !== id));
  }, []);

  const runNow = useCallback((id: string) => {
    const run: AutomationRun = {
      id: generateAutomationRunId(),
      startedAt: Date.now(),
      completedAt: null,
      status: 'running',
    };

    setAutomations(prev => prev.map(a => {
      if (a.id !== id) return a;
      return { ...a, runHistory: [run, ...a.runHistory].slice(0, 50) };
    }));

    setTimeout(() => {
      const success = Math.random() > 0.2;
      setAutomations(prev => prev.map(a => {
        if (a.id !== id) return a;
        return {
          ...a,
          lastRun: Date.now(),
          nextRun: getNextRunTime(a.schedulePreset),
          runHistory: a.runHistory.map(r => {
            if (r.id !== run.id) return r;
            return {
              ...r,
              status: success ? 'completed' : 'failed',
              completedAt: Date.now(),
              output: success ? 'Task executed successfully' : 'Execution failed: timeout',
            };
          }),
        };
      }));
    }, 1500 + Math.random() * 2000);
  }, []);

  const toggleIntegration = useCallback((intId: string) => {
    setFormIntegrations(prev =>
      prev.includes(intId) ? prev.filter(i => i !== intId) : [...prev, intId]
    );
  }, []);

  // Create/Edit Form
  if (showCreate) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={resetForm} className="p-1 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-200 transition-colors">
            <ChevronLeft size={16} />
          </button>
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
            {editingId ? 'Edit Automation' : 'New Automation'}
          </h3>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1 block">Name</label>
            <input
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="e.g. Morning Email Summary"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-[11px] text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-zinc-600"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1 block">Description</label>
            <input
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="Short description of what this automation does"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-[11px] text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-zinc-600"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1 block">Task Prompt</label>
            <textarea
              value={formTask}
              onChange={(e) => setFormTask(e.target.value)}
              placeholder="What should the agent do? e.g. Summarize unread emails and send to Slack"
              rows={3}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-[11px] text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-zinc-600 resize-none"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1 block">Schedule</label>
            <div className="grid grid-cols-2 gap-1.5">
              {SCHEDULE_PRESETS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setFormSchedule(p.value)}
                  className={`px-3 py-2 text-[10px] rounded-lg border transition-colors text-left ${
                    formSchedule === p.value
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <div className="font-medium">{p.label}</div>
                  <div className="text-[9px] text-zinc-500 mt-0.5">{p.description}</div>
                </button>
              ))}
            </div>
            {formSchedule === 'custom' && (
              <input
                value={formCron}
                onChange={(e) => setFormCron(e.target.value)}
                placeholder="*/30 * * * *"
                className="w-full mt-2 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-[11px] text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-zinc-600 font-mono"
              />
            )}
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1 block">Assign Agent</label>
            <select
              value={formAgentId || ''}
              onChange={(e) => setFormAgentId(e.target.value || null)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-[11px] text-zinc-300 focus:outline-none"
            >
              <option value="">No agent (default)</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>{a.avatarEmoji} {a.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5 block">Integrations</label>
            <div className="flex flex-wrap gap-1.5">
              {INTEGRATION_OPTIONS.map((int) => (
                <button
                  key={int.id}
                  onClick={() => toggleIntegration(int.id)}
                  className={`px-2 py-1 text-[10px] rounded-full border transition-colors ${
                    formIntegrations.includes(int.id)
                      ? int.color
                      : 'bg-zinc-900 text-zinc-500 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  {int.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={resetForm}
              className="flex-1 py-2.5 rounded-xl text-xs font-medium bg-zinc-800/50 text-zinc-400 border border-zinc-800 hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={saveAutomation}
              disabled={!formName.trim() || !formTask.trim()}
              className="flex-1 py-2.5 rounded-xl text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {editingId ? 'Save Changes' : 'Create Automation'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main List View
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Automations</h3>
        <span className="text-[10px] text-zinc-600">{enabledCount} active / {automations.length} total</span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="border border-zinc-800 bg-zinc-900/40 rounded-xl p-3 text-center">
          <div className="text-lg font-bold text-emerald-400">{enabledCount}</div>
          <div className="text-[9px] text-zinc-500 uppercase tracking-wider">Active</div>
        </div>
        <div className="border border-zinc-800 bg-zinc-900/40 rounded-xl p-3 text-center">
          <div className="text-lg font-bold text-zinc-300">{automations.length - enabledCount}</div>
          <div className="text-[9px] text-zinc-500 uppercase tracking-wider">Paused</div>
        </div>
        <div className="border border-zinc-800 bg-zinc-900/40 rounded-xl p-3 text-center">
          <div className="text-lg font-bold text-sky-400">{totalRuns}</div>
          <div className="text-[9px] text-zinc-500 uppercase tracking-wider">Total Runs</div>
        </div>
      </div>

      {/* Search + Create */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-600" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search automations..."
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-7 pr-2 py-1.5 text-[11px] text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-zinc-600"
          />
        </div>
        <button
          onClick={() => { resetForm(); setShowCreate(true); }}
          className="px-3 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg text-[11px] font-medium hover:bg-emerald-500/20 transition-colors flex items-center gap-1"
        >
          <Plus size={12} />
          New
        </button>
      </div>

      {/* Automation List */}
      {filtered.length === 0 ? (
        <div className="border border-dashed border-zinc-800 rounded-xl p-6 text-center">
          <Workflow size={24} className="mx-auto text-zinc-600 mb-3" />
          <p className="text-xs text-zinc-400 mb-1">
            {automations.length === 0 ? 'No automations yet' : 'No matching automations'}
          </p>
          <p className="text-[10px] text-zinc-600">
            {automations.length === 0 ? 'Create your first automation to get started' : 'Try a different search'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((auto) => {
            const isExpanded = expandedId === auto.id;
            const lastRunStatus = auto.runHistory.length > 0 ? auto.runHistory[0].status : null;
            return (
              <div
                key={auto.id}
                className="border border-zinc-800 bg-zinc-900/40 rounded-xl overflow-hidden"
              >
                <div className="p-3.5">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      <button
                        onClick={() => toggleAutomation(auto.id)}
                        className={`w-9 h-5 rounded-full transition-colors relative shrink-0 ${
                          auto.enabled ? 'bg-emerald-500' : 'bg-zinc-700'
                        }`}
                      >
                        <div
                          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all shadow ${
                            auto.enabled ? 'right-0.5' : 'left-0.5'
                          }`}
                        />
                      </button>
                      <div className="min-w-0">
                        <div className={`text-xs font-medium truncate ${auto.enabled ? 'text-zinc-200' : 'text-zinc-500'}`}>
                          {auto.name}
                        </div>
                        {auto.description && (
                          <div className="text-[10px] text-zinc-600 truncate">{auto.description}</div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      {lastRunStatus && (
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          lastRunStatus === 'completed' ? 'bg-emerald-400' : lastRunStatus === 'failed' ? 'bg-rose-400' : 'bg-sky-400'
                        }`} />
                      )}
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : auto.id)}
                        className="p-1 text-zinc-600 hover:text-zinc-300 transition-colors"
                      >
                        <ChevronLeft size={12} className={`transition-transform ${isExpanded ? '' : '-rotate-90'}`} />
                      </button>
                    </div>
                  </div>

                  {/* Task preview */}
                  <p className="text-[11px] text-zinc-500 line-clamp-1 mb-2">{auto.task}</p>

                  {/* Schedule + Integrations row */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="flex items-center gap-1 px-1.5 py-0.5 text-[9px] rounded-full bg-zinc-800 text-zinc-400">
                      <Clock size={9} />
                      {SCHEDULE_PRESETS.find(p => p.value === auto.schedulePreset)?.label || auto.schedulePreset}
                    </span>
                    {auto.integrations.slice(0, 3).map((intId) => {
                      const intOpt = INTEGRATION_OPTIONS.find(i => i.id === intId);
                      return (
                        <span key={intId} className={`px-1.5 py-0.5 text-[9px] rounded-full border ${intOpt?.color || 'bg-zinc-800 text-zinc-400 border-zinc-700'}`}>
                          {intOpt?.label || intId}
                        </span>
                      );
                    })}
                    {auto.integrations.length > 3 && (
                      <span className="text-[9px] text-zinc-600">+{auto.integrations.length - 3}</span>
                    )}
                    {auto.agentId && (
                      <span className="flex items-center gap-1 px-1.5 py-0.5 text-[9px] rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20">
                        <Bot size={8} />
                        {agents.find(a => a.id === auto.agentId)?.name || 'Agent'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Expanded Details */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-zinc-800"
                    >
                      <div className="p-3.5 space-y-3">
                        {/* Timing */}
                        <div className="grid grid-cols-2 gap-2 text-[10px]">
                          <div className="bg-zinc-800/30 rounded-lg p-2">
                            <span className="text-zinc-500 block">Last Run</span>
                            <span className="text-zinc-300">{auto.lastRun ? timeAgo(auto.lastRun) : 'never'}</span>
                          </div>
                          <div className="bg-zinc-800/30 rounded-lg p-2">
                            <span className="text-zinc-500 block">Next Run</span>
                            <span className="text-zinc-300">{auto.nextRun ? timeAgo(auto.nextRun).replace('ago', 'from now') : 'paused'}</span>
                          </div>
                        </div>

                        {/* Run History */}
                        {auto.runHistory.length > 0 && (
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5 block">Recent Runs</span>
                            <div className="space-y-1">
                              {auto.runHistory.slice(0, 5).map((run) => (
                                <div key={run.id} className="flex items-center gap-2 text-[10px]">
                                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                    run.status === 'completed' ? 'bg-emerald-400' : run.status === 'failed' ? 'bg-rose-400' : 'bg-sky-400'
                                  }`} />
                                  <span className="text-zinc-500">{timeAgo(run.startedAt)}</span>
                                  <span className={`${
                                    run.status === 'completed' ? 'text-emerald-400' : run.status === 'failed' ? 'text-rose-400' : 'text-sky-400'
                                  }`}>{run.status}</span>
                                  {run.output && <span className="text-zinc-600 truncate flex-1">{run.output}</span>}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-2 pt-1">
                          <button
                            onClick={() => runNow(auto.id)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-medium bg-sky-500/10 text-sky-400 border border-sky-500/20 hover:bg-sky-500/20 transition-colors"
                          >
                            <Play size={10} />
                            Run Now
                          </button>
                          <button
                            onClick={() => startEdit(auto)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-medium bg-zinc-800/50 text-zinc-400 border border-zinc-800 hover:bg-zinc-800 transition-colors"
                          >
                            <Settings size={10} />
                            Edit
                          </button>
                          <button
                            onClick={() => deleteAutomation(auto.id)}
                            className="px-3 py-2 rounded-lg text-[10px] font-medium bg-zinc-800/50 text-zinc-500 border border-zinc-800 hover:text-rose-400 hover:border-rose-500/30 transition-colors"
                          >
                            <Trash2 size={10} />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Events Types ───────────────────────────────────────────────────────────────
type EventType =
  | 'agent.created'
  | 'agent.deleted'
  | 'agent.run_started'
  | 'agent.run_completed'
  | 'agent.run_failed'
  | 'agent.message_sent'
  | 'tool.invoked'
  | 'tool.completed'
  | 'memory.written'
  | 'memory.recalled'
  | 'memory.extracted'
  | 'memory.consolidated'
  | 'memory.cleaned'
  | 'subagent.spawned'
  | 'subagent.completed'
  | 'subagent.failed'
  | 'consolidation.started'
  | 'consolidation.completed'
  | 'consolidation.failed'
  | 'system.startup'
  | 'system.error';

interface ActivityEvent {
  id: string;
  eventType: EventType;
  source: string;
  message: string;
  metadata?: Record<string, string>;
  createdAt: number;
}

const EVENTS_STORAGE_KEY = 'lumina_activity_events';

function loadEvents(): ActivityEvent[] {
  try {
    const raw = localStorage.getItem(EVENTS_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function saveEvents(events: ActivityEvent[]) {
  localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(events));
}

function generateEventId(): string {
  return `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function logEvent(eventType: EventType, source: string, message: string, metadata?: Record<string, string>): ActivityEvent {
  const event: ActivityEvent = {
    id: generateEventId(),
    eventType,
    source,
    message,
    metadata,
    createdAt: Date.now(),
  };
  const events = loadEvents();
  events.unshift(event);
  if (events.length > 500) events.length = 500;
  saveEvents(events);
  return event;
}

const EVENT_TYPE_CONFIG: Record<EventType, { label: string; color: string; bgColor: string }> = {
  'agent.created':            { label: 'Agent Created',      color: 'text-emerald-400', bgColor: 'bg-emerald-500/15 border-emerald-500/20' },
  'agent.deleted':            { label: 'Agent Deleted',      color: 'text-rose-400',    bgColor: 'bg-rose-500/15 border-rose-500/20' },
  'agent.run_started':        { label: 'Run Started',        color: 'text-sky-400',     bgColor: 'bg-sky-500/15 border-sky-500/20' },
  'agent.run_completed':      { label: 'Run Completed',      color: 'text-emerald-400', bgColor: 'bg-emerald-500/15 border-emerald-500/20' },
  'agent.run_failed':         { label: 'Run Failed',         color: 'text-rose-400',    bgColor: 'bg-rose-500/15 border-rose-500/20' },
  'agent.message_sent':       { label: 'Message Sent',       color: 'text-zinc-400',    bgColor: 'bg-zinc-500/15 border-zinc-500/20' },
  'tool.invoked':             { label: 'Tool Invoked',       color: 'text-violet-400',  bgColor: 'bg-violet-500/15 border-violet-500/20' },
  'tool.completed':           { label: 'Tool Completed',     color: 'text-violet-400',  bgColor: 'bg-violet-500/15 border-violet-500/20' },
  'memory.written':           { label: 'Memory Stored',      color: 'text-amber-400',   bgColor: 'bg-amber-500/15 border-amber-500/20' },
  'memory.recalled':          { label: 'Memory Recalled',    color: 'text-sky-400',     bgColor: 'bg-sky-500/15 border-sky-500/20' },
  'memory.extracted':         { label: 'Memory Extracted',   color: 'text-cyan-400',    bgColor: 'bg-cyan-500/15 border-cyan-500/20' },
  'memory.consolidated':      { label: 'Memory Consolidated',color: 'text-orange-400',  bgColor: 'bg-orange-500/15 border-orange-500/20' },
  'memory.cleaned':           { label: 'Memory Cleaned',     color: 'text-zinc-400',    bgColor: 'bg-zinc-500/15 border-zinc-500/20' },
  'subagent.spawned':         { label: 'Subagent Spawned',   color: 'text-amber-400',   bgColor: 'bg-amber-500/15 border-amber-500/20' },
  'subagent.completed':       { label: 'Subagent Completed', color: 'text-emerald-400', bgColor: 'bg-emerald-500/15 border-emerald-500/20' },
  'subagent.failed':          { label: 'Subagent Failed',    color: 'text-rose-400',    bgColor: 'bg-rose-500/15 border-rose-500/20' },
  'consolidation.started':    { label: 'Consolidation Started',  color: 'text-sky-400',  bgColor: 'bg-sky-500/15 border-sky-500/20' },
  'consolidation.completed':  { label: 'Consolidation Done',     color: 'text-emerald-400', bgColor: 'bg-emerald-500/15 border-emerald-500/20' },
  'consolidation.failed':     { label: 'Consolidation Failed',   color: 'text-rose-400',    bgColor: 'bg-rose-500/15 border-rose-500/20' },
  'system.startup':           { label: 'System Startup',     color: 'text-emerald-400', bgColor: 'bg-emerald-500/15 border-emerald-500/20' },
  'system.error':             { label: 'System Error',       color: 'text-rose-400',    bgColor: 'bg-rose-500/15 border-rose-500/20' },
};

type EventCategory = 'all' | 'agent' | 'memory' | 'tool' | 'subagent' | 'consolidation' | 'system';

const EVENT_CATEGORIES: { id: EventCategory; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'agent', label: 'Agent' },
  { id: 'memory', label: 'Memory' },
  { id: 'tool', label: 'Tool' },
  { id: 'subagent', label: 'Subagent' },
  { id: 'consolidation', label: 'Consolidation' },
  { id: 'system', label: 'System' },
];

function getEventCategory(type: EventType): EventCategory {
  if (type.startsWith('agent.')) return 'agent';
  if (type.startsWith('memory.')) return 'memory';
  if (type.startsWith('tool.')) return 'tool';
  if (type.startsWith('subagent.')) return 'subagent';
  if (type.startsWith('consolidation.')) return 'consolidation';
  if (type.startsWith('system.')) return 'system';
  return 'all';
}

// ─── Events Panel ───────────────────────────────────────────────────────────────
function EventsSubPanel({ orchestrationState }: { orchestrationState: AgentOrchestrationState }) {
  const [events, setEvents] = useState<ActivityEvent[]>(loadEvents);
  const [categoryFilter, setCategoryFilter] = useState<EventCategory>('all');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    saveEvents(events);
  }, [events]);

  // Auto-log orchestration events
  const prevOrchestrationRef = React.useRef(orchestrationState);
  useEffect(() => {
    const prev = prevOrchestrationRef.current;
    const curr = orchestrationState;

    if (curr.isActive && !prev.isActive) {
      logEvent('consolidation.started', 'orchestrator', 'Orchestration started');
    }

    curr.agents.forEach((sa) => {
      const prevAgent = prev.agents.find(a => a.id === sa.id);
      if (!prevAgent) {
        logEvent('subagent.spawned', sa.name, `Subagent spawned for phase ${sa.phase}`, { agentId: sa.id });
      } else if (prevAgent.status !== 'done' && sa.status === 'done') {
        logEvent('subagent.completed', sa.name, `Subagent completed`, { agentId: sa.id, files: String(sa.filesCreated.length) });
      } else if (prevAgent.status !== 'failed' && sa.status === 'failed') {
        logEvent('subagent.failed', sa.name, `Subagent failed: ${sa.error || 'unknown error'}`, { agentId: sa.id });
      }
    });

    prevOrchestrationRef.current = curr;
  }, [orchestrationState]);

  // Re-read events from localStorage periodically to catch logs from other panels
  useEffect(() => {
    const interval = setInterval(() => {
      setEvents(loadEvents());
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const filtered = useMemo(() => {
    let result = events;
    if (categoryFilter !== 'all') {
      result = result.filter(e => getEventCategory(e.eventType) === categoryFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(e =>
        e.message.toLowerCase().includes(q) ||
        e.source.toLowerCase().includes(q) ||
        e.eventType.toLowerCase().includes(q)
      );
    }
    return result;
  }, [events, categoryFilter, search]);

  const eventCounts = useMemo(() => {
    const counts: Record<EventCategory, number> = { all: events.length, agent: 0, memory: 0, tool: 0, subagent: 0, consolidation: 0, system: 0 };
    events.forEach(e => { counts[getEventCategory(e.eventType)]++; });
    return counts;
  }, [events]);

  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  const deleteEvent = useCallback((id: string) => {
    setEvents(prev => prev.filter(e => e.id !== id));
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Events</h3>
        <span className="text-[10px] text-zinc-600">{events.length} events</span>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-600" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search events..."
          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-7 pr-2 py-1.5 text-[11px] text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-zinc-600"
        />
      </div>

      {/* Category Filter */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {EVENT_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setCategoryFilter(cat.id)}
            className={`px-2.5 py-1 text-[10px] rounded-md whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              categoryFilter === cat.id
                ? 'bg-zinc-800 text-white font-medium'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
            }`}
          >
            {cat.label}
            <span className="text-[9px] text-zinc-600">{eventCounts[cat.id]}</span>
          </button>
        ))}
      </div>

      {/* Actions */}
      {events.length > 0 && (
        <div className="flex justify-end">
          <button
            onClick={clearEvents}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] text-zinc-500 hover:text-rose-400 transition-colors"
          >
            <Trash2 size={10} />
            Clear all
          </button>
        </div>
      )}

      {/* Event Log */}
      {filtered.length === 0 ? (
        <div className="border border-dashed border-zinc-800 rounded-xl p-6 text-center">
          <Activity size={24} className="mx-auto text-zinc-600 mb-3" />
          <p className="text-xs text-zinc-400 mb-1">
            {events.length === 0 ? 'No events yet' : 'No matching events'}
          </p>
          <p className="text-[10px] text-zinc-600">
            {events.length === 0 ? 'Events will appear here as agents run' : 'Try a different filter or search'}
          </p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {filtered.map((event) => {
            const config = EVENT_TYPE_CONFIG[event.eventType];
            const isExpanded = expandedId === event.id;
            return (
              <div
                key={event.id}
                className="border border-zinc-800 bg-zinc-900/40 rounded-xl overflow-hidden"
              >
                <button
                  onClick={() => setExpandedId(isExpanded ? null : event.id)}
                  className="w-full text-left p-3 hover:bg-zinc-800/20 transition-colors"
                >
                  <div className="flex items-start gap-2.5">
                    <span className={`mt-0.5 px-1.5 py-0.5 text-[9px] rounded-full border shrink-0 ${config.bgColor}`}>
                      {config.label}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-zinc-300 line-clamp-2">{event.message}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-zinc-600">{event.source}</span>
                        <span className="text-[10px] text-zinc-700">·</span>
                        <span className="text-[10px] text-zinc-600">{timeAgo(event.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-zinc-800"
                    >
                      <div className="p-3 space-y-2 text-[10px]">
                        <div className="flex justify-between">
                          <span className="text-zinc-500">Event Type</span>
                          <span className={`font-mono ${config.color}`}>{event.eventType}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-500">Source</span>
                          <span className="text-zinc-400">{event.source}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-500">Time</span>
                          <span className="text-zinc-400">{new Date(event.createdAt).toLocaleString()}</span>
                        </div>
                        {event.metadata && Object.keys(event.metadata).length > 0 && (
                          <div className="space-y-1">
                            <span className="text-zinc-500">Metadata</span>
                            {Object.entries(event.metadata).map(([key, val]) => (
                              <div key={key} className="flex justify-between pl-2">
                                <span className="text-zinc-600">{key}</span>
                                <span className="text-zinc-400 font-mono">{val}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteEvent(event.id); }}
                          className="flex items-center gap-1 text-rose-400/70 hover:text-rose-400 transition-colors mt-1"
                        >
                          <Trash2 size={9} />
                          Delete event
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Consolidation Types ────────────────────────────────────────────────────────
type ConsolidationStatus = 'completed' | 'running' | 'failed';
type ConsolidationTrigger = 'scheduled' | 'manual';

interface ConsolidationRun {
  id: string;
  status: ConsolidationStatus;
  trigger: ConsolidationTrigger;
  proposals: number;
  merged: number;
  pruned: number;
  startedAt: number;
  completedAt: number | null;
  error?: string;
}

const CONSOLIDATION_STORAGE_KEY = 'lumina_consolidation_runs';

function loadConsolidationRuns(): ConsolidationRun[] {
  try {
    const raw = localStorage.getItem(CONSOLIDATION_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function saveConsolidationRuns(runs: ConsolidationRun[]) {
  localStorage.setItem(CONSOLIDATION_STORAGE_KEY, JSON.stringify(runs));
}

function generateRunId(): string {
  return `cr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

const CONSOLIDATION_STATUS: Record<ConsolidationStatus, { dot: string; label: string; color: string; icon: React.ReactNode }> = {
  completed: { dot: 'bg-emerald-400', label: 'Completed', color: 'text-emerald-400', icon: <CheckCircle2 size={12} /> },
  running: { dot: 'bg-sky-400', label: 'Running', color: 'text-sky-400', icon: <Loader2 size={12} className="animate-spin" /> },
  failed: { dot: 'bg-rose-400', label: 'Failed', color: 'text-rose-400', icon: <XCircle size={12} /> },
};

const TRIGGER_LABELS: Record<ConsolidationTrigger, string> = {
  scheduled: 'Scheduled',
  manual: 'Manual',
};

// ─── Consolidation Panel ────────────────────────────────────────────────────────
function ConsolidationSubPanel() {
  const [runs, setRuns] = useState<ConsolidationRun[]>(loadConsolidationRuns);
  const [statusFilter, setStatusFilter] = useState<'all' | ConsolidationStatus>('all');
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    saveConsolidationRuns(runs);
  }, [runs]);

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return runs;
    return runs.filter(r => r.status === statusFilter);
  }, [runs, statusFilter]);

  const totalMerged = useMemo(() => runs.reduce((sum, r) => sum + r.merged, 0), [runs]);
  const totalPruned = useMemo(() => runs.reduce((sum, r) => sum + r.pruned, 0), [runs]);
  const totalProposals = useMemo(() => runs.reduce((sum, r) => sum + r.proposals, 0), [runs]);
  const completedRuns = useMemo(() => runs.filter(r => r.status === 'completed').length, [runs]);
  const failedRuns = useMemo(() => runs.filter(r => r.status === 'failed').length, [runs]);

  const startConsolidation = useCallback(() => {
    if (isRunning) return;

    const newRun: ConsolidationRun = {
      id: generateRunId(),
      status: 'running',
      trigger: 'manual',
      proposals: 0,
      merged: 0,
      pruned: 0,
      startedAt: Date.now(),
      completedAt: null,
    };

    setIsRunning(true);
    setRuns(prev => [newRun, ...prev]);
    logEvent('consolidation.started', 'consolidation', 'Manual consolidation run started', { runId: newRun.id });

    // Simulate consolidation process
    const duration = 2000 + Math.random() * 3000;
    const proposalCount = Math.floor(Math.random() * 8) + 1;
    const mergeCount = Math.floor(Math.random() * proposalCount);
    const pruneCount = Math.floor(Math.random() * 3);

    setTimeout(() => {
      const success = Math.random() > 0.15;
      setRuns(prev => prev.map(r => {
        if (r.id !== newRun.id) return r;
        return {
          ...r,
          status: success ? 'completed' : 'failed',
          proposals: proposalCount,
          merged: mergeCount,
          pruned: pruneCount,
          completedAt: Date.now(),
          error: success ? undefined : 'Memory store unavailable',
        };
      }));
      if (success) {
        logEvent('consolidation.completed', 'consolidation', `Consolidation completed: ${mergeCount} merged, ${pruneCount} pruned`, { runId: newRun.id, proposals: String(proposalCount), merged: String(mergeCount), pruned: String(pruneCount) });
      } else {
        logEvent('consolidation.failed', 'consolidation', 'Consolidation failed: Memory store unavailable', { runId: newRun.id });
      }
      setIsRunning(false);
    }, duration);
  }, [isRunning]);

  const clearHistory = useCallback(() => {
    setRuns([]);
  }, []);

  const deleteRun = useCallback((id: string) => {
    setRuns(prev => prev.filter(r => r.id !== id));
  }, []);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Consolidation</h3>
        <span className="text-[10px] text-zinc-600">{runs.length} runs</span>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Runs', value: String(completedRuns), sub: failedRuns > 0 ? `${failedRuns} failed` : 'all ok', color: 'text-emerald-400' },
          { label: 'Merged', value: String(totalMerged), sub: `from ${totalProposals} proposals`, color: 'text-sky-400' },
          { label: 'Pruned', value: String(totalPruned), sub: 'memories removed', color: 'text-violet-400' },
        ].map((s) => (
          <div key={s.label} className="border border-zinc-800 bg-zinc-900/40 rounded-xl p-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">{s.label}</div>
            <div className={`text-lg font-bold ${s.color}`}>{s.value}</div>
            <div className="text-[10px] text-zinc-600 mt-0.5">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={startConsolidation}
          disabled={isRunning}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-medium transition-colors ${
            isRunning
              ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20 cursor-wait'
              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
          }`}
        >
          {isRunning ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Consolidating...
            </>
          ) : (
            <>
              <Play size={14} />
              Run Consolidation
            </>
          )}
        </button>
        {runs.length > 0 && (
          <button
            onClick={clearHistory}
            className="px-3 py-2.5 bg-zinc-800/50 border border-zinc-800 rounded-xl text-zinc-500 hover:text-rose-400 hover:border-rose-500/30 transition-colors text-xs"
            title="Clear history"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      {/* Filter */}
      {runs.length > 0 && (
        <div className="flex items-center gap-1">
          {(['all', 'completed', 'running', 'failed'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-2.5 py-1 text-[10px] rounded-md capitalize transition-colors ${
                statusFilter === s
                  ? 'bg-zinc-800 text-white font-medium'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Run History */}
      {filtered.length === 0 ? (
        <div className="border border-dashed border-zinc-800 rounded-xl p-6 text-center">
          <GitMerge size={24} className="mx-auto text-zinc-600 mb-3" />
          <p className="text-xs text-zinc-400 mb-1">
            {runs.length === 0 ? 'No consolidation runs yet' : 'No matching runs'}
          </p>
          <p className="text-[10px] text-zinc-600">
            {runs.length === 0 ? 'Click "Run Consolidation" to merge and prune memories' : 'Try a different filter'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((run) => {
            const statusInfo = CONSOLIDATION_STATUS[run.status];
            return (
              <div
                key={run.id}
                className="border border-zinc-800 bg-zinc-900/40 rounded-xl overflow-hidden"
              >
                <div className="p-3.5">
                  {/* Header row */}
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-2">
                      <span className={statusInfo.color}>{statusInfo.icon}</span>
                      <span className={`text-[10px] font-medium ${statusInfo.color}`}>{statusInfo.label}</span>
                      <span className={`px-1.5 py-0.5 text-[9px] rounded-full ${
                        run.trigger === 'manual'
                          ? 'bg-violet-500/10 text-violet-400 border border-violet-500/20'
                          : 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                      }`}>
                        {TRIGGER_LABELS[run.trigger]}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-zinc-600">{timeAgo(run.startedAt)}</span>
                      <button
                        onClick={() => deleteRun(run.id)}
                        className="p-1 text-zinc-600 hover:text-rose-400 transition-colors"
                        title="Delete run"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  </div>

                  {/* Stats grid */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-zinc-800/30 rounded-lg p-2 text-center">
                      <div className="text-[9px] text-zinc-500 uppercase tracking-wider">Proposals</div>
                      <div className="text-sm font-bold text-zinc-200">{run.proposals}</div>
                    </div>
                    <div className="bg-zinc-800/30 rounded-lg p-2 text-center">
                      <div className="text-[9px] text-zinc-500 uppercase tracking-wider">Merged</div>
                      <div className="text-sm font-bold text-emerald-400">{run.merged}</div>
                    </div>
                    <div className="bg-zinc-800/30 rounded-lg p-2 text-center">
                      <div className="text-[9px] text-zinc-500 uppercase tracking-wider">Pruned</div>
                      <div className="text-sm font-bold text-violet-400">{run.pruned}</div>
                    </div>
                  </div>

                  {/* Duration / Error */}
                  {run.completedAt && (
                    <div className="mt-2 text-[10px] text-zinc-600">
                      Duration: {((run.completedAt - run.startedAt) / 1000).toFixed(1)}s
                    </div>
                  )}
                  {run.error && (
                    <div className="mt-2 text-[10px] text-rose-400/80 bg-rose-500/5 rounded-lg px-2 py-1.5">
                      {run.error}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Telegram Config Types ──────────────────────────────────────────────────────
interface TelegramConfig {
  botToken: string;
  allowlist: string[];  // Telegram user IDs
  webhookUrl: string;
  isConnected: boolean;
}

const TELEGRAM_STORAGE_KEY = 'lumina_telegram_config';

function loadTelegramConfig(): TelegramConfig {
  try {
    const raw = localStorage.getItem(TELEGRAM_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { botToken: '', allowlist: [], webhookUrl: '', isConnected: false };
}

function saveTelegramConfig(config: TelegramConfig) {
  localStorage.setItem(TELEGRAM_STORAGE_KEY, JSON.stringify(config));
}

// ─── Telegram Panel ─────────────────────────────────────────────────────────────
function TelegramSubPanel() {
  const [config, setConfig] = useState<TelegramConfig>(loadTelegramConfig);
  const [showToken, setShowToken] = useState(false);
  const [newUserId, setNewUserId] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    saveTelegramConfig(config);
  }, [config]);

  const updateBotToken = useCallback((token: string) => {
    setConfig(prev => ({ ...prev, botToken: token }));
  }, []);

  const updateWebhookUrl = useCallback((url: string) => {
    setConfig(prev => ({ ...prev, webhookUrl: url }));
  }, []);

  const toggleConnection = useCallback(() => {
    setConfig(prev => ({ ...prev, isConnected: !prev.isConnected }));
  }, []);

  const addUserId = useCallback(() => {
    const id = newUserId.trim();
    if (id && !config.allowlist.includes(id)) {
      setConfig(prev => ({ ...prev, allowlist: [...prev.allowlist, id] }));
      setNewUserId('');
    }
  }, [newUserId, config.allowlist]);

  const removeUserId = useCallback((id: string) => {
    setConfig(prev => ({ ...prev, allowlist: prev.allowlist.filter(u => u !== id) }));
  }, []);

  const copyWebhookUrl = useCallback(() => {
    if (config.webhookUrl) {
      navigator.clipboard.writeText(config.webhookUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [config.webhookUrl]);

  const isTokenValid = config.botToken.length > 20;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Telegram Bot</h3>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${config.isConnected ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
          <span className={`text-[10px] font-medium ${config.isConnected ? 'text-emerald-400' : 'text-zinc-500'}`}>
            {config.isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Bot Token */}
      <div className="space-y-2">
        <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Bot Token</label>
        <div className="relative">
          <input
            type={showToken ? 'text' : 'password'}
            value={config.botToken}
            onChange={(e) => updateBotToken(e.target.value)}
            placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-3 pr-9 py-2 text-[11px] text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-zinc-600 font-mono"
          />
          <button
            onClick={() => setShowToken(!showToken)}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            {showToken ? <EyeOff size={12} /> : <Eye size={12} />}
          </button>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-zinc-600">
          <a
            href="https://t.me/BotFather"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-emerald-500 hover:text-emerald-400 transition-colors"
          >
            Get token from BotFather <ExternalLink size={9} />
          </a>
          {config.botToken && (
            <span className={isTokenValid ? 'text-emerald-500' : 'text-amber-500'}>
              {isTokenValid ? 'looks valid' : 'seems too short'}
            </span>
          )}
        </div>
      </div>

      {/* Connection Toggle */}
      <button
        onClick={toggleConnection}
        disabled={!isTokenValid}
        className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-medium transition-colors ${
          config.isConnected
            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20'
            : isTokenValid
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
              : 'bg-zinc-800/50 text-zinc-500 border border-zinc-800 cursor-not-allowed'
        }`}
      >
        {config.isConnected ? (
          <>
            <WifiOff size={14} />
            Disconnect Bot
          </>
        ) : (
          <>
            <Wifi size={14} />
            Connect Bot
          </>
        )}
      </button>

      {/* Webhook URL */}
      <div className="space-y-2">
        <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Webhook URL</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={config.webhookUrl}
            onChange={(e) => updateWebhookUrl(e.target.value)}
            placeholder="https://your-server.com/api/telegram/webhook"
            className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-[11px] text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-zinc-600 font-mono"
          />
          <button
            onClick={copyWebhookUrl}
            disabled={!config.webhookUrl}
            className="px-2.5 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title="Copy URL"
          >
            {copied ? <CheckCircle2 size={12} className="text-emerald-400" /> : <Copy size={12} />}
          </button>
        </div>
        <p className="text-[10px] text-zinc-600">
          Set this URL in BotFather webhook settings or via API
        </p>
      </div>

      {/* Allowlist */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
            <Shield size={10} />
            Allowlist
          </label>
          <span className="text-[10px] text-zinc-600">{config.allowlist.length} users</span>
        </div>
        <p className="text-[10px] text-zinc-600">
          Only these Telegram user IDs can interact with your agents
        </p>

        <div className="flex gap-2">
          <input
            type="text"
            value={newUserId}
            onChange={(e) => setNewUserId(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addUserId()}
            placeholder="Enter Telegram user ID"
            className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-[11px] text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-zinc-600"
          />
          <button
            onClick={addUserId}
            disabled={!newUserId.trim() || config.allowlist.includes(newUserId.trim())}
            className="px-2.5 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title="Add user"
          >
            <Plus size={12} />
          </button>
        </div>

        {config.allowlist.length > 0 ? (
          <div className="space-y-1">
            {config.allowlist.map((userId) => (
              <div
                key={userId}
                className="flex items-center justify-between px-3 py-2 bg-zinc-900/60 border border-zinc-800 rounded-lg"
              >
                <span className="text-[11px] text-zinc-300 font-mono">{userId}</span>
                <button
                  onClick={() => removeUserId(userId)}
                  className="p-1 text-zinc-500 hover:text-rose-400 transition-colors"
                  title="Remove"
                >
                  <Trash2 size={11} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="border border-dashed border-zinc-800 rounded-lg p-4 text-center">
            <p className="text-[10px] text-zinc-600">No users in allowlist</p>
            <p className="text-[10px] text-zinc-600 mt-0.5">
              Find your ID: message <span className="text-zinc-400">@userinfobot</span> on Telegram
            </p>
          </div>
        )}
      </div>

      {/* How it works */}
      <div className="border border-zinc-800 bg-zinc-900/40 rounded-xl p-4 space-y-2">
        <h4 className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">How it works</h4>
        <ol className="text-[10px] text-zinc-500 space-y-1.5 list-decimal list-inside">
          <li>Create a bot via <span className="text-zinc-400">@BotFather</span> and copy the token</li>
          <li>Paste the token above and click <span className="text-zinc-400">Connect Bot</span></li>
          <li>Add your Telegram user ID to the allowlist</li>
          <li>Set the webhook URL to your server endpoint</li>
          <li>Start chatting with your bot on Telegram</li>
        </ol>
      </div>
    </div>
  );
}

// ─── Settings Sub-Panel ────────────────────────────────────────────────────────
const DEFAULT_LLM_SETTINGS: LlmSettings = {
  provider: 'llama-bridge',
  model: 'sonnet',
  apiKey: '',
  baseUrl: 'http://127.0.0.1:8089',
  temperature: 0.7,
  maxTokens: 4096,
};

const PROVIDER_PRESETS: Record<string, Partial<LlmSettings>> = {
  'openai': { baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o' },
  'anthropic': { baseUrl: 'https://api.anthropic.com', model: 'claude-sonnet-4-20250514' },
  'llama-bridge': { baseUrl: 'http://127.0.0.1:8089', model: 'sonnet' },
  'custom': { baseUrl: '', model: '' },
};

function SettingsSubPanel() {
  const [settings, setSettings] = useState<LlmSettings>(() => {
    try {
      const saved = localStorage.getItem('lumina_llm_settings');
      return saved ? { ...DEFAULT_LLM_SETTINGS, ...JSON.parse(saved) } : DEFAULT_LLM_SETTINGS;
    } catch { return DEFAULT_LLM_SETTINGS; }
  });
  const [showApiKey, setShowApiKey] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    localStorage.setItem('lumina_llm_settings', JSON.stringify(settings));
  }, [settings]);

  const handleProviderChange = (provider: LlmSettings['provider']) => {
    const preset = PROVIDER_PRESETS[provider] || {};
    setSettings(prev => ({ ...prev, ...preset, provider }));
  };

  const handleSave = () => {
    localStorage.setItem('lumina_llm_settings', JSON.stringify(settings));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3">LLM Provider</h3>
        <div className="grid grid-cols-4 gap-2">
          {(['llama-bridge', 'openai', 'anthropic', 'custom'] as const).map(p => (
            <button
              key={p}
              onClick={() => handleProviderChange(p)}
              className={`px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                settings.provider === p
                  ? 'bg-emerald-600/20 text-emerald-400 ring-1 ring-emerald-600/40'
                  : 'bg-zinc-800/60 text-zinc-400 hover:bg-zinc-700/60 hover:text-zinc-300'
              }`}
            >
              {p === 'llama-bridge' ? 'Llama Bridge' : p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Model</label>
          <input
            value={settings.model}
            onChange={e => setSettings(s => ({ ...s, model: e.target.value }))}
            placeholder="e.g. sonnet, gpt-4o, claude-sonnet-4-20250514"
            className="mt-1 w-full px-3 py-2 rounded-lg bg-zinc-800/60 border border-zinc-700/50 text-zinc-200 text-xs placeholder:text-zinc-600 focus:outline-none focus:border-emerald-600/50"
          />
          <p className="text-[10px] text-zinc-600 mt-1">
            Aliases: haiku (fast), sonnet (balanced), opus (capable)
          </p>
        </div>

        <div>
          <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">API Key</label>
          <div className="relative mt-1">
            <input
              type={showApiKey ? 'text' : 'password'}
              value={settings.apiKey}
              onChange={e => setSettings(s => ({ ...s, apiKey: e.target.value }))}
              placeholder="sk-... or leave empty for bridge auth"
              className="w-full px-3 py-2 pr-9 rounded-lg bg-zinc-800/60 border border-zinc-700/50 text-zinc-200 text-xs placeholder:text-zinc-600 focus:outline-none focus:border-emerald-600/50"
            />
            <button
              onClick={() => setShowApiKey(!showApiKey)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
            >
              {showApiKey ? <EyeOff size={12} /> : <Eye size={12} />}
            </button>
          </div>
        </div>

        <div>
          <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Base URL</label>
          <input
            value={settings.baseUrl}
            onChange={e => setSettings(s => ({ ...s, baseUrl: e.target.value }))}
            placeholder="http://127.0.0.1:8089"
            className="mt-1 w-full px-3 py-2 rounded-lg bg-zinc-800/60 border border-zinc-700/50 text-zinc-200 text-xs placeholder:text-zinc-600 focus:outline-none focus:border-emerald-600/50"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Temperature</label>
            <div className="flex items-center gap-2 mt-1">
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.temperature}
                onChange={e => setSettings(s => ({ ...s, temperature: parseFloat(e.target.value) }))}
                className="flex-1 h-1 accent-emerald-600"
              />
              <span className="text-xs text-zinc-400 w-8 text-right">{settings.temperature.toFixed(2)}</span>
            </div>
          </div>
          <div>
            <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Max Tokens</label>
            <input
              type="number"
              min="256"
              max="128000"
              step="256"
              value={settings.maxTokens}
              onChange={e => setSettings(s => ({ ...s, maxTokens: parseInt(e.target.value) || 4096 }))}
              className="mt-1 w-full px-3 py-2 rounded-lg bg-zinc-800/60 border border-zinc-700/50 text-zinc-200 text-xs focus:outline-none focus:border-emerald-600/50"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2">
        <p className="text-[10px] text-zinc-600">
          Settings are stored locally. Llama Bridge is the recommended proxy for all providers.
        </p>
        <button
          onClick={handleSave}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            saved
              ? 'bg-emerald-600/20 text-emerald-400'
              : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
          }`}
        >
          {saved ? <><CheckCircle2 size={12} /> Saved</> : <><Settings size={12} /> Save</>}
        </button>
      </div>

      <div className="rounded-lg bg-zinc-800/30 border border-zinc-700/30 p-3">
        <h4 className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-2">Connection Info</h4>
        <div className="space-y-1 text-[11px]">
          <div className="flex justify-between">
            <span className="text-zinc-500">Provider</span>
            <span className="text-zinc-300">{settings.provider}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">Model</span>
            <span className="text-zinc-300">{settings.model || '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">Base URL</span>
            <span className="text-zinc-300 font-mono text-[10px]">{settings.baseUrl || '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">API Key</span>
            <span className="text-zinc-300">{settings.apiKey ? '••••••••' : 'Not set'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Panel ─────────────────────────────────────────────────────────────────
export function LuminaAgentPanel({ onClose, agents, orchestrationState, onOpenAgentsPage, convex }: LuminaAgentPanelProps) {
  const [activeView, setActiveView] = useState<View>('dashboard');

  const NAV_ITEMS: { id: View; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={16} /> },
    { id: 'agents', label: 'Agents', icon: <Bot size={16} /> },
    { id: 'memory', label: 'Memory', icon: <Brain size={16} /> },
    { id: 'automations', label: 'Automations', icon: <Workflow size={16} /> },
    { id: 'events', label: 'Events', icon: <Activity size={16} /> },
    { id: 'consolidation', label: 'Consolidation', icon: <GitMerge size={16} /> },
    { id: 'telegram', label: 'Telegram', icon: <MessageSquare size={16} /> },
  ];

  const renderContent = () => {
    switch (activeView) {
      case 'dashboard': return <DashboardSubPanel agents={agents} orchestrationState={orchestrationState} onOpenAgentsPage={onOpenAgentsPage} />;
      case 'agents': return <AgentsSubPanel agents={agents} orchestrationState={orchestrationState} onOpenAgentsPage={onOpenAgentsPage} />;
      case 'memory': return <MemorySubPanel agents={agents} />;
      case 'automations': return <AutomationsSubPanel agents={agents} />;
      case 'events': return <EventsSubPanel orchestrationState={orchestrationState} />;
      case 'consolidation': return <ConsolidationSubPanel />;
      case 'telegram': return <TelegramSubPanel />;
      case 'settings': return <SettingsSubPanel />;
      default: return null;
    }
  };

  return (
    <div className="flex-1 flex overflow-hidden relative w-full h-full bg-zinc-950">
      {/* Sidebar */}
      <div className="flex flex-col border-r border-zinc-800 bg-zinc-950 shrink-0 w-14">
        <div className="flex items-center justify-center py-3 border-b border-zinc-800">
          <span className="text-[10px] font-bold text-zinc-500">LA</span>
        </div>
        <nav className="flex-1 py-2 space-y-1 px-1.5">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={`w-full flex items-center justify-center px-2 py-2 rounded-lg transition-colors ${
                activeView === item.id
                  ? 'bg-emerald-600/10 text-emerald-400'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
              }`}
              title={item.label}
            >
              {item.icon}
            </button>
          ))}
        </nav>
        <div className="px-1.5 pb-2 border-t border-zinc-800 pt-2">
          <button
            onClick={() => setActiveView('settings')}
            className={`w-full flex items-center justify-center px-2 py-2 rounded-lg transition-colors ${
              activeView === 'settings'
                ? 'bg-emerald-600/10 text-emerald-400'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
            }`}
            title="Settings"
          >
            <Settings size={16} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
            Lumina Agent
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
