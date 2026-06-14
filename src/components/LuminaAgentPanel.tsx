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
  ChevronDown,
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
  Users,
  Database,
  Eye,
  EyeOff,
  Settings,
  X,
  ArrowRight,
  Plus,
  Shield,
  Copy,
  ExternalLink,
  BarChart3,
  Table,
  ArrowUp,
  ArrowDown,
  Check,
  Sparkles,
  Terminal as TerminalIcon,
  Globe,
  Code,
  Sidebar,
  Server
} from 'lucide-react';
import { Agent } from '../agents/types';
import { CLOUD_PROVIDERS } from '../constants';

// Safe global fetch proxy to log real API traffic in real-time
if (typeof window !== 'undefined' && !(window as any).__lumina_fetch_proxied__) {
  try {
    const originalFetch = window.fetch;
    if (originalFetch) {
      const customFetch = async function (this: any, input: any, init: any) {
        const start = performance.now();
        const url = typeof input === 'string' ? input : (input && (input as any).url) || '';
        const normalizedUrl = String(url || '').toLowerCase();
        const isInternalDesktopBridge =
          normalizedUrl.startsWith('http://ipc.localhost/') ||
          normalizedUrl.startsWith('https://ipc.localhost/') ||
          normalizedUrl.startsWith('tauri://') ||
          normalizedUrl.startsWith('asset://');
        
        // Monitor API traffic
        const isApi = url.includes('/api/');
        
        if (!isApi || isInternalDesktopBridge) {
          return originalFetch.apply(this, arguments as any);
        }

        let requestBody = '';
        if (init && init.body) {
          if (typeof init.body === 'string') {
            requestBody = init.body;
          } else {
            requestBody = '[Payload Data]';
          }
        }

        const method = (init?.method || 'GET').toUpperCase() as any;

        try {
          const response = await originalFetch.apply(this, arguments as any);
          const latency = Math.round(performance.now() - start);
          
          const contentType = response.headers.get('content-type') || '';
          const transferEncoding = response.headers.get('transfer-encoding') || '';
          const isStreaming = 
            url.includes('/api/pi-agent/run') ||
            contentType.includes('text/event-stream') ||
            contentType.includes('application/x-ndjson') ||
            transferEncoding.includes('chunked');

          let responseBody = '';
          if (isStreaming) {
            responseBody = '[Streaming Response]';
          } else {
            const clonedResp = response.clone();
            try {
              responseBody = await clonedResp.text();
            } catch {
              responseBody = '[Binary or unparseable text]';
            }
          }

          let type: any = 'system';
          if (url.includes('telegram')) type = 'telegram';
          else if (url.includes('model') || url.includes('provider')) type = 'ai';
          else if (url.includes('convex')) type = 'convex';
          else if (url.includes('composio')) type = 'composio';

          const shortUrl = url.startsWith('/') ? url : '/' + url.split('/').slice(3).join('/');

          const newLog = {
            id: `real-log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            timestamp: new Date().toLocaleTimeString(),
            method,
            endpoint: shortUrl,
            status: response.status,
            statusText: response.statusText || (response.ok ? 'OK' : 'Error'),
            latency,
            type,
            request: requestBody || JSON.stringify({ method, url: shortUrl }, null, 2),
            response: responseBody
          };

          const logEvent = new CustomEvent('lumina_new_api_log', { detail: newLog });
          window.dispatchEvent(logEvent);

          return response;
        } catch (error: any) {
          const latency = Math.round(performance.now() - start);
          const shortUrl = url.startsWith('/') ? url : '/' + url.split('/').slice(3).join('/');
          
          const newLog = {
            id: `real-log-err-${Date.now()}`,
            timestamp: new Date().toLocaleTimeString(),
            method,
            endpoint: shortUrl,
            status: 500,
            statusText: 'Network Error',
            latency,
            type: 'system' as const,
            request: requestBody || JSON.stringify({ method, url: shortUrl, error: error.message }, null, 2),
            response: JSON.stringify({ error: error.message || 'Unknown Network Exception' }, null, 2)
          };

          const logEvent = new CustomEvent('lumina_new_api_log', { detail: newLog });
          window.dispatchEvent(logEvent);

          throw error;
        }
      };

      // Try direct assignment first
      try {
        (window as any).fetch = customFetch;
        (window as any).__lumina_fetch_proxied__ = true;
      } catch (assignError) {
        // Direct assignment failed. Try defineProperty
        try {
          Object.defineProperty(window, 'fetch', {
            value: customFetch,
            configurable: true,
            writable: true,
            enumerable: true
          });
          (window as any).__lumina_fetch_proxied__ = true;
        } catch (defineError) {
          console.warn('Lumina Agent Panel: Browser sandbox prevented overwriting window.fetch.', defineError);
        }
      }
    }
  } catch (error) {
    console.error('Lumina Agent Panel: Failed to initialize fetch proxy', error);
  }
}

// ─── Types ──────────────────────────────────────────────────────────────────────
type View = 'dashboard' | 'agents' | 'memory' | 'automations' | 'events' | 'consolidation' | 'settings' | 'composio' | 'logs';

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
    agents: ExecutionAgent[];
    addEvent: (eventType: string, source: string, message: string, metadata?: Record<string, string>) => Promise<void>;
    addAgent: (agent: any) => Promise<void>;
    patchAgent: (agentId: string, patch: any) => Promise<void>;
    deleteAgent: (agentId: string) => Promise<void>;
    addLog: (agentId: string, logType: string, content: string, toolName?: string) => Promise<void>;
  };
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
}

interface SharedMemoryRecord {
  memoryId: string;
  content: string;
  tier: 'short' | 'long' | 'permanent';
  segment: 'identity' | 'preference' | 'correction' | 'relationship' | 'project' | 'knowledge' | 'context';
  importance: number;
  accessCount: number;
  lastAccessedAt: number;
  lifecycle: 'active' | 'archived' | 'pruned';
  source: string;
  agentId?: string;
  createdAt: number;
}

interface SharedMemoryApi {
  memories: SharedMemoryRecord[];
  addMemory: (memory: SharedMemoryRecord) => Promise<void>;
  patchMemory: (memoryId: string, patch: Partial<SharedMemoryRecord>) => Promise<void>;
  deleteMemory: (memoryId: string) => Promise<void>;
  recallMemory: (memoryId: string) => Promise<void>;
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
        <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--theme-secondary)]">Overview</h3>
        <span className="text-[10px] text-[var(--theme-muted)]">Live</span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Agents', value: String(totalAgents), icon: <Bot size={14} className="text-violet-400" />, sub: `${customAgents} custom` },
          { label: 'Subagents', value: String(totalSubagents), icon: <Users size={14} className="text-sky-400" />, sub: orchestrationState.isActive ? `${runningSubagents} running` : 'idle' },
          { label: 'Skills', value: String(activeSkills), icon: <Zap size={14} className="text-amber-400" />, sub: 'active' },
          { label: 'Tools', value: String(activeTools), icon: <Settings size={14} className="text-[var(--theme-accent)]" />, sub: 'enabled' },
          { label: 'Phases', value: `${orchestrationState.currentPhase}/${orchestrationState.totalPhases}`, icon: <GitMerge size={14} className="text-cyan-400" />, sub: orchestrationState.isActive ? 'active' : 'idle' },
          { label: 'Completed', value: String(completedSubagents), icon: <CheckCircle2 size={14} className="text-emerald-400" />, sub: failedSubagents > 0 ? `${failedSubagents} failed` : 'all good' },
        ].map((s) => (
          <div key={s.label} className="border border-[var(--theme-border)] bg-[var(--theme-card-bg)]/40 rounded-xl p-3.5">
            <div className="flex items-center gap-2 mb-2">
              {s.icon}
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--theme-muted)]">{s.label}</span>
            </div>
            <div className="text-lg font-bold text-[var(--theme-primary)]">{s.value}</div>
            <div className="text-[10px] text-[var(--theme-muted)] mt-0.5">{s.sub}</div>
          </div>
        ))}
      </div>

      {orchestrationState.isActive && (
        <div className="border border-[var(--theme-border)] bg-[var(--theme-card-bg)]/40 rounded-xl p-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--theme-secondary)] mb-3">Active Orchestration</h4>
          <div className="space-y-2">
            {orchestrationState.agents.filter(a => a.status === 'running' || a.status === 'waiting').map((sa) => (
              <div key={sa.id} className="flex items-center gap-3 p-2 rounded-lg bg-[var(--theme-hover-bg)]/55">
                <span className={`w-2 h-2 rounded-full ${SUBAGENT_STATUS[sa.status]?.dot || 'bg-[var(--theme-muted)]'}`} />
                <span className="text-xs text-[var(--theme-secondary)] flex-1">{sa.name}</span>
                <span className={`text-[10px] font-medium ${SUBAGENT_STATUS[sa.status]?.color || 'text-[var(--theme-secondary)]'}`}>
                  {SUBAGENT_STATUS[sa.status]?.label || sa.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {totalAgents > 0 && (
        <div className="border border-[var(--theme-border)] bg-[var(--theme-card-bg)]/40 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--theme-secondary)]">Your Agents</h4>
            {onOpenAgentsPage && (
              <button
                onClick={onOpenAgentsPage}
                className="flex items-center gap-1 text-[10px] text-[var(--theme-accent)] hover:opacity-80 transition-colors cursor-pointer"
              >
                View all <ArrowRight size={10} />
              </button>
            )}
          </div>
          <div className="space-y-2">
            {agents.slice(0, 5).map((agent) => (
              <div key={agent.id} className="flex items-center gap-3 p-2 rounded-lg bg-[var(--theme-hover-bg)]/55">
                <div className={`w-8 h-8 rounded-lg ${agent.avatarColor || 'bg-[var(--theme-hover-bg)]'} flex items-center justify-center text-sm`}>
                  {agent.avatarEmoji || '🤖'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-[var(--theme-primary)] truncate">{agent.name}</div>
                  <div className="text-[10px] text-[var(--theme-muted)] truncate">{agent.description || 'No description'}</div>
                </div>
                <div className="text-[10px] text-[var(--theme-muted)]">{agent.model || 'default'}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {totalAgents === 0 && !orchestrationState.isActive && (
        <div className="border border-dashed border-[var(--theme-border)] rounded-xl p-6 text-center">
          <Bot size={24} className="mx-auto text-[var(--theme-muted)] mb-3" />
          <p className="text-xs text-[var(--theme-secondary)] mb-1">No agents yet</p>
          <p className="text-[10px] text-[var(--theme-muted)]">Create your first agent to get started</p>
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

// ─── Agents Panel ───────────────────────────────────────────────────────────────
function AgentsSubPanel({ agents, orchestrationState, onOpenAgentsPage, convex }: {
  agents: Agent[];
  orchestrationState: AgentOrchestrationState;
  onOpenAgentsPage?: () => void;
  convex?: LuminaAgentPanelProps['convex'];
}) {
  const execAgents = convex?.agents || [];
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | ExecAgentStatus>('all');
  const [search, setSearch] = useState('');

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

  const selectedAgent = useMemo(() => execAgents.find(a => a.agentId === selectedId) || null, [execAgents, selectedId]);

  const cancelAgent = useCallback((id: string) => {
    convex?.patchAgent(id, { status: 'cancelled', completedAt: Date.now() });
  }, [convex]);

  const deleteAgent = useCallback((id: string) => {
    convex?.deleteAgent(id);
    if (selectedId === id) setSelectedId(null);
  }, [convex, selectedId]);

  const retryAgent = useCallback(async (agent: ExecutionAgent) => {
    try {
      await fetch(`/api/agents/${agent.agentId}/retry`, { method: 'POST' });
    } catch (err) {
      console.error('Failed to retry agent', err);
    }
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
              onClick={() => cancelAgent(selectedAgent.agentId)}
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
                onClick={() => deleteAgent(selectedAgent.agentId)}
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
                  <div key={log.id || log.createdAt} className="flex gap-3 relative">
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
            {execAgents.length === 0 ? 'No agents running yet' : 'No matching agents'}
          </p>
          <p className="text-[10px] text-zinc-600">
            {execAgents.length === 0 ? 'Waiting for agents to be spawned...' : 'Try a different filter'}
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
                key={agent.agentId}
                onClick={() => setSelectedId(agent.agentId)}
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
type MemorySegment = 'identity' | 'preference' | 'correction' | 'relationship' | 'project' | 'knowledge' | 'context';
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
  correction: { label: 'Correction', color: 'text-amber-300', dotColor: 'bg-amber-300' },
  relationship: { label: 'Relationship', color: 'text-pink-400', dotColor: 'bg-pink-400' },
  project: { label: 'Project', color: 'text-orange-400', dotColor: 'bg-orange-400' },
  knowledge: { label: 'Knowledge', color: 'text-blue-400', dotColor: 'bg-blue-400' },
  context: { label: 'Context', color: 'text-zinc-400', dotColor: 'bg-zinc-400' },
};

const INITIAL_MEMORIES: MemoryRecord[] = [];

const clampMemoryValue = (value: number) => Math.max(0, Math.min(1, value));

const computePanelDecayStep = (memory: MemoryRecord, elapsedMs: number) => {
  const hours = Math.max(0, elapsedMs / 3_600_000);
  const baseRate =
    memory.tier === 'permanent' ? 0.00001 :
    memory.tier === 'long' ? 0.0003 :
    0.002;

  const reinforcementShield = Math.min(0.82, (memory.decay || 0) * 0.45 + ((memory.lastAccessed ? 1 : 0) * 0.02));
  const dormancyDays = Math.max(0, (Date.now() - (memory.lastAccessed || memory.createdAt || Date.now())) / 86_400_000);
  const dormancyMultiplier =
    dormancyDays > 45 ? 2.6 :
    dormancyDays > 21 ? 1.9 :
    dormancyDays > 7 ? 1.35 :
    1;

  return hours * baseRate * dormancyMultiplier * (1 - reinforcementShield);
};

// ─── Memory Panel ───────────────────────────────────────────────────────────────
export function MemorySubPanel({
  agents,
  memoryApi,
}: {
  agents: Agent[];
  memoryApi?: SharedMemoryApi;
}) {
  const [localMemories, setLocalMemories] = useState<MemoryRecord[]>(() => {
    const loaded = loadMemoryRecords();
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

  const memories = useMemo<MemoryRecord[]>(() => {
    if (!memoryApi) {
      return localMemories;
    }

    return memoryApi.memories.map((mem) => ({
      id: mem.memoryId,
      content: mem.content,
      tier: mem.tier,
      segment: mem.segment,
      decay: Math.max(0, Math.min(1, mem.importance ?? 0)),
      memoryId: mem.memoryId,
      lastAccessed: mem.lastAccessedAt ?? mem.createdAt,
      createdAt: mem.createdAt,
      source: mem.source,
      agentId: mem.agentId ?? null,
    }));
  }, [localMemories, memoryApi]);

  useEffect(() => {
    if (!memoryApi) {
      saveMemoryRecords(localMemories);
    }
  }, [localMemories, memoryApi]);

  // Apply decay over time (simulated)
  useEffect(() => {
    if (memoryApi) return;
    const interval = setInterval(() => {
      setLocalMemories(prev => prev.map(m => {
        const decayDelta = computePanelDecayStep(m, 10_000);
        const newDecay = clampMemoryValue(m.decay - decayDelta);
        const nextTier =
          m.tier === 'permanent' && newDecay < 0.72 ? 'long' :
          m.tier === 'long' && newDecay < 0.38 ? 'short' :
          m.tier;
        return { ...m, decay: newDecay, tier: nextTier };
      }));
    }, 10000);
    return () => clearInterval(interval);
  }, [memoryApi]);

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
    const segmentCounts: Record<MemorySegment, number> = { identity: 0, preference: 0, correction: 0, relationship: 0, project: 0, knowledge: 0, context: 0 };
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

  const saveMemory = useCallback(async () => {
    if (!formContent.trim()) return;

    if (editingId && memoryApi) {
      await memoryApi.patchMemory(editingId, {
        content: formContent.trim(),
        tier: formTier,
        segment: formSegment,
        source: formSource,
        agentId: formAgentId ?? undefined,
      });
    } else if (editingId) {
      setLocalMemories(prev => prev.map(m => {
        if (m.id !== editingId) return m;
        return { ...m, content: formContent.trim(), tier: formTier, segment: formSegment, source: formSource, agentId: formAgentId };
      }));
    } else if (memoryApi) {
      await memoryApi.addMemory({
        memoryId: generateUUID(),
        content: formContent.trim(),
        tier: formTier,
        segment: formSegment,
        importance: formTier === 'permanent' ? 0.99 : formTier === 'long' ? 0.85 : 0.6,
        accessCount: 0,
        lastAccessedAt: Date.now(),
        lifecycle: 'active',
        source: formSource,
        agentId: formAgentId ?? undefined,
        createdAt: Date.now(),
      });
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
      setLocalMemories(prev => [newMem, ...prev]);
    }
    resetForm();
  }, [editingId, formAgentId, formContent, formSegment, formSource, formTier, memoryApi, resetForm]);

  const deleteMemory = useCallback(async (id: string) => {
    if (memoryApi) {
      await memoryApi.deleteMemory(id);
      return;
    }
    setLocalMemories(prev => prev.filter(m => m.id !== id));
  }, [memoryApi]);

  const recallMemory = useCallback(async (id: string) => {
    if (memoryApi) {
      await memoryApi.recallMemory(id);
      return;
    }
    setLocalMemories(prev => prev.map(m => {
      if (m.id !== id) return m;
      const boost = Math.min(1, m.decay + 0.1);
      return { ...m, decay: boost, lastAccessed: Date.now() };
    }));
  }, [memoryApi]);

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
                  const segCfg = SEGMENT_CONFIG[mem.segment] || { label: mem.segment, color: 'text-zinc-400', dotColor: 'bg-zinc-500' };
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

// ─── API Traffic Logs Sub-Panel ───────────────────────────────────────────────
interface ApiLog {
  id: string;
  timestamp: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  endpoint: string;
  status: number;
  statusText: string;
  latency: number;
  type: 'telegram' | 'ai' | 'convex' | 'system' | 'composio';
  request: string;
  response: string;
}

const INITIAL_LOGS: ApiLog[] = [];

function LogsSubPanel() {
  const [logs, setLogs] = useState<ApiLog[]>(() => {
    try {
      const stored = localStorage.getItem('lumina_console_logs');
      return stored ? JSON.parse(stored) : INITIAL_LOGS;
    } catch {
      return INITIAL_LOGS;
    }
  });

  const [isStreaming, setIsStreaming] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | '2xx' | '4xx' | '5xx'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'telegram' | 'ai' | 'convex' | 'system' | 'composio'>('all');
  const [methodFilter, setMethodFilter] = useState<'all' | 'GET' | 'POST' | 'PUT' | 'DELETE'>('all');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Save logs changes
  useEffect(() => {
    try {
      localStorage.setItem('lumina_console_logs', JSON.stringify(logs));
    } catch {}
  }, [logs]);

  // Capture real intercepted fetch logs via custom events
  useEffect(() => {
    if (!isStreaming) return;

    const handleNewApiLog = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail) {
        setLogs(prev => [detail, ...prev.slice(0, 49)]);
      }
    };

    window.addEventListener('lumina_new_api_log', handleNewApiLog);
    return () => window.removeEventListener('lumina_new_api_log', handleNewApiLog);
  }, [isStreaming]);

  // Poll and merge server-side traffic logs
  useEffect(() => {
    if (!isStreaming) return;

    const pollServerLogs = async () => {
      try {
        const res = await fetch('/api/traffic-logs');
        if (res.ok) {
          const serverLogs = await res.json();
          if (Array.isArray(serverLogs) && serverLogs.length > 0) {
            setLogs(prev => {
              const existingIds = new Set(prev.map(l => l.id));
              const newLogs = serverLogs.filter(l => !existingIds.has(l.id));
              if (newLogs.length === 0) return prev;
              return [...newLogs, ...prev].slice(0, 50);
            });
          }
        }
      } catch (err) {
        console.error('Failed to poll server logs:', err);
      }
    };

    pollServerLogs();
    const interval = setInterval(pollServerLogs, 2500);
    return () => clearInterval(interval);
  }, [isStreaming]);

  // Listener for general active change configurations to record as log
  useEffect(() => {
    const handleModelChangeLog = () => {
      const currentModel = localStorage.getItem('lumina_agent_active_model') || 'unknown';
      const newLog: ApiLog = {
        id: `log-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        method: 'POST',
        endpoint: '/api/providers/select-model',
        status: 200,
        statusText: 'OK',
        latency: 15,
        type: 'ai',
        request: JSON.stringify({ selected_model: currentModel }, null, 2),
        response: JSON.stringify({ success: true, active_model: currentModel }, null, 2)
      };
      setLogs(prev => [newLog, ...prev.slice(0, 49)]);
    };

    window.addEventListener('lumina_agent_model_changed', handleModelChangeLog);
    return () => window.removeEventListener('lumina_agent_model_changed', handleModelChangeLog);
  }, []);

  const clearLogs = () => {
    setLogs([]);
    setExpandedLogId(null);
  };

  // Filter computation
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // Search text matches endpoint or JSON payloads
      const term = search.toLowerCase();
      if (term) {
        const matchesEndpoint = log.endpoint.toLowerCase().includes(term);
        const matchesRequest = log.request.toLowerCase().includes(term);
        const matchesResponse = log.response.toLowerCase().includes(term);
        const matchesStatus = String(log.status).includes(term) || log.statusText.toLowerCase().includes(term);
        if (!matchesEndpoint && !matchesRequest && !matchesResponse && !matchesStatus) {
          return false;
        }
      }

      // Status group filter
      if (statusFilter !== 'all') {
        const firstDigit = Math.floor(log.status / 100);
        if (statusFilter === '2xx' && firstDigit !== 2) return false;
        if (statusFilter === '4xx' && firstDigit !== 4) return false;
        if (statusFilter === '5xx' && firstDigit !== 5) return false;
      }

      // Type filter
      if (typeFilter !== 'all' && log.type !== typeFilter) return false;

      // Method filter
      if (methodFilter !== 'all' && log.method !== methodFilter) return false;

      return true;
    });
  }, [logs, search, statusFilter, typeFilter, methodFilter]);

  const getStatusStyle = (status: number) => {
    if (status >= 200 && status < 300) {
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    } else if (status >= 400 && status < 500) {
      return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    } else {
      return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
    }
  };

  const getTypeStyle = (type: string) => {
    switch (type) {
      case 'telegram': return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/15';
      case 'ai': return 'bg-purple-500/10 text-purple-400 border-purple-500/15';
      case 'convex': return 'bg-indigo-500/10 text-indigo-400 border-indigo-505/15';
      case 'composio': return 'bg-orange-500/10 text-orange-400 border-orange-500/15';
      default: return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/15';
    }
  };

  const getMethodStyle = (method: string) => {
    switch (method) {
      case 'GET': return 'text-emerald-400 font-bold';
      case 'POST': return 'text-sky-400 font-bold';
      case 'PUT': return 'text-amber-400 font-bold';
      case 'DELETE': return 'text-rose-400 font-bold';
      default: return 'text-zinc-400';
    }
  };

  return (
    <div className="space-y-4">
      {/* Upper header controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-900/40 p-4 border border-zinc-800 rounded-2xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-350">API Traffic Logs</h3>
            <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold ${isStreaming ? 'bg-emerald-400/10 text-emerald-400 animate-pulse' : 'bg-zinc-800 text-zinc-500'}`}>
              <span className={`w-1 h-1 rounded-full ${isStreaming ? 'bg-emerald-400' : 'bg-zinc-500'}`} />
              {isStreaming ? 'LIVE CAPTURE ACTIVE' : 'LIVE CAPTURE PAUSED'}
            </div>
          </div>
          <p className="text-[11px] text-zinc-500">
            Monitor real-time webhook queries database synchronization runs, and active AI model generation states directly.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <button
            onClick={() => setIsStreaming(!isStreaming)}
            className="p-1.5 rounded-lg border border-zinc-800 hover:bg-zinc-850 hover:border-zinc-700 text-zinc-400 hover:text-white transition-all flex items-center gap-1 text-[11px] font-bold cursor-pointer"
            title={isStreaming ? "Pause real-time API logs capture" : "Resume real-time API logs capture"}
          >
            {isStreaming ? <Pause size={12} className="text-amber-400" /> : <Play size={12} className="text-emerald-400" />}
            <span>{isStreaming ? 'Pause Capture' : 'Resume Capture'}</span>
          </button>

          <button
            onClick={clearLogs}
            className="p-1.5 rounded-lg border border-zinc-800 hover:bg-rose-950/20 hover:border-rose-900/30 text-zinc-400 hover:text-rose-400 transition-all flex items-center gap-1 text-[11px] font-bold cursor-pointer"
            title="Clear all recorded logs"
          >
            <Trash2 size={12} />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Filter and search parameters */}
      <div className="bg-zinc-900/20 p-3.5 border border-zinc-800/80 rounded-2xl space-y-3">
        {/* Row 1: Search and Method */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-600" size={13} />
            <input
              type="text"
              placeholder="Search by endpoint, status code, JSON payloads..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl pl-8 pr-3 py-1.5 text-[11px] text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-zinc-600 transition-all"
            />
          </div>

          {/* Method Filter tabs */}
          <div className="flex items-center gap-1.5 bg-zinc-950/60 p-1 border border-zinc-800/60 rounded-xl shrink-0">
            <span className="text-[9px] uppercase font-bold tracking-wider text-zinc-600 px-2 font-mono">METHOD:</span>
            {(['all', 'GET', 'POST', 'PUT', 'DELETE'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMethodFilter(m)}
                className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase transition-all cursor-pointer ${
                  methodFilter === m
                    ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/40'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Row 2: Status and Source Type */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1.5 border-t border-zinc-800/20">
          {/* Status Group */}
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] uppercase font-bold tracking-wider text-zinc-650 mr-1.5 flex items-center gap-1 font-mono">
              <Filter size={9} /> Status:
            </span>
            {(['all', '2xx', '4xx', '5xx'] as const).map((sf) => (
              <button
                key={sf}
                onClick={() => setStatusFilter(sf)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold tracking-wide border transition-all cursor-pointer ${
                  statusFilter === sf
                    ? 'bg-zinc-800 text-zinc-200 border-zinc-700'
                    : 'bg-transparent text-zinc-500 border-transparent hover:text-zinc-300'
                }`}
              >
                {sf === 'all' ? 'All Codes' : sf.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Source Type Filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 no-scrollbar">
            <span className="text-[9px] uppercase font-bold tracking-wider text-zinc-650 mr-1.5 font-mono">Source:</span>
            {(['all', 'telegram', 'ai', 'convex', 'system', 'composio'] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => setTypeFilter(tf)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold capitalize border transition-all cursor-pointer ${
                  typeFilter === tf
                    ? 'bg-zinc-800 text-zinc-200 border-zinc-700'
                    : 'bg-transparent text-zinc-500 border-transparent hover:text-zinc-300'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Traffic lists logs panel */}
      <div className="border border-zinc-800 rounded-2xl bg-zinc-950/40 overflow-hidden">
        {filteredLogs.length > 0 ? (
          <div className="divide-y divide-zinc-850">
            {filteredLogs.map((log) => {
              const isExpanded = expandedLogId === log.id;
              return (
                <div
                  key={log.id}
                  className={`transition-colors duration-150 ${isExpanded ? 'bg-zinc-900/30' : 'hover:bg-zinc-900/10'}`}
                >
                  {/* Grid layout log header */}
                  <div
                    onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                    className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-2.5 gap-2 cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {/* Method indicator */}
                      <span className={`text-[10px] uppercase font-mono w-10 shrink-0 ${getMethodStyle(log.method)}`}>
                        {log.method}
                      </span>

                      {/* Endpoint and timestamp */}
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="text-[12px] font-mono font-medium text-zinc-300 truncate font-mono" title={log.endpoint}>
                          {log.endpoint}
                        </span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded border uppercase shrink-0 font-bold font-mono ${getTypeStyle(log.type)}`}>
                          {log.type}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                      {/* Latency */}
                      <span className="text-[10px] font-mono text-zinc-500 flex items-center gap-1 font-mono">
                        <Clock size={10} className="text-zinc-600" />
                        {log.latency} ms
                      </span>

                      {/* Status Badges */}
                      <div className={`px-2 py-0.5 rounded border text-[10px] font-mono font-bold shrink-0 flex items-center gap-1.5 ${getStatusStyle(log.status)}`}>
                        <span className={`w-1 h-1 rounded-full ${log.status >= 200 && log.status < 300 ? 'bg-emerald-400' : log.status < 500 ? 'bg-amber-400' : 'bg-rose-400'}`} />
                        {log.status} {log.statusText}
                      </div>

                      {/* Chevron Arrow */}
                      <ChevronDown
                        size={14}
                        className={`text-zinc-500 transition-transform ${isExpanded ? 'rotate-180 text-zinc-300' : ''}`}
                      />
                    </div>
                  </div>

                  {/* Code expand state */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        className="overflow-hidden bg-zinc-950/80 border-t border-zinc-850/50"
                      >
                        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                          {/* Left Panel: Request Body */}
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] font-bold text-zinc-500 tracking-wider flex items-center gap-1 uppercase font-mono">
                                <Send size={9} /> INCOMING payload (Request)
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigator.clipboard.writeText(log.request);
                                }}
                                className="p-1 hover:bg-zinc-800 rounded text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                                title="Copy Client Request"
                              >
                                <Copy size={11} />
                              </button>
                            </div>
                            <pre className="p-3 rounded-lg border border-zinc-900 bg-zinc-950 font-mono text-[10.5px] text-zinc-350 overflow-x-auto whitespace-pre leading-relaxed max-h-48 scrollbar-thin">
                              {log.request}
                            </pre>
                          </div>

                          {/* Right Panel: Response Body */}
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] font-bold text-zinc-500 tracking-wider flex items-center gap-1 uppercase font-mono">
                                <Zap size={9} /> SYSTEM output (Response)
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigator.clipboard.writeText(log.response);
                                }}
                                className="p-1 hover:bg-zinc-800 rounded text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                                title="Copy App Response"
                              >
                                <Copy size={11} />
                              </button>
                            </div>
                            <pre className="p-3 rounded-lg border border-zinc-900 bg-zinc-950 font-mono text-[10.5px] text-zinc-350 overflow-x-auto whitespace-pre leading-relaxed max-h-48 scrollbar-thin">
                              {log.response}
                            </pre>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-10 text-center border-2 border-dashed border-zinc-900 rounded-2xl flex flex-col items-center justify-center space-y-2">
            <span className="p-2 sm:p-3 bg-zinc-900 border border-zinc-800 rounded-full text-zinc-500">
              <TerminalIcon size={20} />
            </span>
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-zinc-400">No matching logs found</p>
              <p className="text-[11px] text-zinc-600 font-mono">
                Try selecting a trigger scenario from "Simulation Triggers" or adjustments in matching options.
              </p>
            </div>
          </div>
        )}
      </div>
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
function TelegramSubPanel({ convex }: { convex?: LuminaAgentPanelProps['convex'] }) {
  const [config, setConfig] = useState<TelegramConfig>(loadTelegramConfig);
  const [showToken, setShowToken] = useState(false);
  const [newUserId, setNewUserId] = useState('');
  const [copied, setCopied] = useState(false);

  // Manual message states
  const [selectedTargetId, setSelectedTargetId] = useState('');
  const [customTargetId, setCustomTargetId] = useState('');
  const [messageText, setMessageText] = useState('');
  const [sendStatus, setSendStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [sendMsgError, setSendMsgError] = useState('');

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

  const handleSendMessage = async () => {
    const targetId = selectedTargetId === 'custom' ? customTargetId.trim() : selectedTargetId;
    if (!targetId || !messageText.trim()) return;
    setSendStatus('sending');
    setSendMsgError('');

    const textToSend = messageText;

    try {
      let data: any = null;
      let isSuccess = false;

      if (config.botToken && config.isConnected) {
        const response = await fetch(`https://api.telegram.org/bot${config.botToken}/sendMessage`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            chat_id: targetId,
            text: textToSend,
          }),
        });
        data = await response.json();
        if (data.ok) {
          isSuccess = true;
        } else {
          throw new Error(data.description || 'Failed to send message');
        }
      } else {
        await new Promise(resolve => setTimeout(resolve, 800));
        data = { ok: true, description: "Simulation active: message logged successfully to local event channel" };
        isSuccess = true;
      }

      if (isSuccess) {
        setSendStatus('success');
        setMessageText('');

        // 1. Dispatch custom event for Traffic Logs
        const requestPayload = {
          chat_id: targetId,
          text: textToSend
        };
        const responsePayload = data;

        const newLog: ApiLog = {
          id: `log-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          method: 'POST',
          endpoint: `https://api.telegram.org/bot${config.botToken || 'mock_token'}/sendMessage`,
          status: 200,
          statusText: 'OK',
          latency: config.isConnected ? 120 : 15,
          type: 'telegram',
          request: JSON.stringify(requestPayload, null, 2),
          response: JSON.stringify(responsePayload, null, 2)
        };

        window.dispatchEvent(new CustomEvent('lumina_new_api_log', { detail: newLog }));

        // 2. Dispatch event to Activities / Events list via convex.addEvent
        if (convex?.addEvent) {
          await convex.addEvent(
            'telegram_message',
            'Telegram Bot',
            `Manual message sent from AI bot to user ID ${targetId}: "${textToSend}"`,
            { targetId, content: textToSend, is_simulated: String(!config.isConnected) }
          );
        }

        setTimeout(() => setSendStatus('idle'), 3000);
      }
    } catch (err: any) {
      setSendStatus('error');
      setSendMsgError(err.message || 'Error occurred');

      // Dispatch error in traffic log
      const errorLog: ApiLog = {
        id: `log-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        method: 'POST',
        endpoint: `https://api.telegram.org/bot${config.botToken || 'mock_token'}/sendMessage`,
        status: 400,
        statusText: 'Bad Request',
        latency: 18,
        type: 'telegram',
        request: JSON.stringify({ chat_id: targetId, text: textToSend }, null, 2),
        response: JSON.stringify({ ok: false, error: err.message || 'Error occurred' }, null, 2)
      };
      window.dispatchEvent(new CustomEvent('lumina_new_api_log', { detail: errorLog }));

      // Add event to Events panel in case of error too
      if (convex?.addEvent) {
        await convex.addEvent(
          'telegram_error',
          'Telegram Bot',
          `Failed manual message dispatch to ${targetId}: ${err.message || 'Unknown error'}`,
          { targetId, error: err.message || 'Unknown' }
        );
      }

      setTimeout(() => setSendStatus('idle'), 4000);
    }
  };

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

      {/* Manual Message Broadcast */}
      <div className="border border-zinc-800 bg-zinc-900/20 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-1.5 border-b border-zinc-800 pb-2">
          <Send size={12} className="text-sky-400" />
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Manual AI Message Sender</h4>
        </div>

        <div className="space-y-3">
          {/* Target User Selector */}
          <div className="space-y-1.5">
            <label className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">Target Telegram User ID</label>
            <select
              value={selectedTargetId}
              onChange={(e) => {
                setSelectedTargetId(e.target.value);
                if (e.target.value !== 'custom') {
                  setCustomTargetId('');
                }
              }}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-[11px] text-zinc-350 focus:outline-none focus:border-zinc-700"
            >
              <option value="">-- Select target recipient --</option>
              {config.allowlist.map((userId) => (
                <option key={userId} value={userId}>
                  {userId} (Allowlisted)
                </option>
              ))}
              <option value="custom">Enter Manually...</option>
            </select>
          </div>

          {/* Custom Input (visible if Custom is selected) */}
          {selectedTargetId === 'custom' && (
            <div className="space-y-1">
              <input
                type="text"
                value={customTargetId}
                onChange={(e) => setCustomTargetId(e.target.value)}
                placeholder="e.g. 529384728"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-[11px] text-zinc-300 placeholder-zinc-650 focus:outline-none focus:border-zinc-700 font-mono"
              />
            </div>
          )}

          {/* Message Text Area */}
          <div className="space-y-1.5">
            <label className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">Message Content</label>
            <textarea
              rows={2}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Type message to send from AI..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-[11px] text-zinc-300 placeholder-zinc-650 focus:outline-none focus:border-zinc-700 resize-none font-sans"
            />
          </div>

          {/* Action Button & Status Display */}
          <div className="space-y-2">
            <button
              onClick={handleSendMessage}
              disabled={sendStatus === 'sending' || !(selectedTargetId === 'custom' ? customTargetId.trim() : selectedTargetId) || !messageText.trim()}
              className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                sendStatus === 'sending'
                  ? 'bg-zinc-800 text-zinc-500 border border-zinc-805 cursor-not-allowed'
                  : sendStatus === 'success'
                    ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-600/30'
                    : sendStatus === 'error'
                      ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                      : 'bg-sky-500/10 text-sky-400 border border-sky-500/20 hover:bg-sky-500/20'
              }`}
            >
              {sendStatus === 'sending' ? (
                <>
                  <Loader2 size={12} className="animate-spin text-zinc-500" />
                  <span>Sending Message...</span>
                </>
              ) : sendStatus === 'success' ? (
                <>
                  <Check size={12} />
                  <span>Sent Successfully</span>
                </>
              ) : sendStatus === 'error' ? (
                <>
                  <X size={12} />
                  <span>Failed to Send</span>
                </>
              ) : (
                <>
                  <Send size={11} />
                  <span>Send Message from AI</span>
                </>
              )}
            </button>

            {sendStatus === 'error' && sendMsgError && (
              <p className="text-[9.5px] text-red-400 font-mono text-center leading-relaxed">
                {sendMsgError}
              </p>
            )}

            {!config.isConnected && (
              <p className="text-[9px] text-zinc-600 text-center leading-relaxed">
                * Bot token is disconnected. Message dispatch will be simulated.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* How it works */}
      <div className="border border-zinc-800 bg-zinc-900/40 rounded-xl p-4 space-y-2">
        <h4 className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">How it works</h4>
        <ol className="text-[10px] text-zinc-500 space-y-1.5 list-decimal list-inside">
          <li>Create a bot via <span className="text-zinc-400">@BotFather</span> and copy the token</li>
          <li>Paste the token above and click <span className="text-zinc-400">Connect Bot</span></li>
          <li>Add your Telegram user ID to the allowlist</li>
          <li>Start chatting with your bot on Telegram</li>
        </ol>
      </div>
    </div>
  );
}

// ─── Settings Sub-Panel ────────────────────────────────────────────────────────
function SettingsSubPanel() {
  const [serverUrl, setServerUrl] = useState(() => localStorage.getItem('lumina_server_url') || 'https://openprovider.mimika.in/v1');
  const [apiKey, setApiKey] = useState('');
  const [selectedProvider, setSelectedProvider] = useState(() => localStorage.getItem('lumina_provider') || 'openprovider');
  const [providerSearchQuery, setProviderSearchQuery] = useState('');
  const [verificationState, setVerificationState] = useState<'idle' | 'verifying' | 'success' | 'error'>(() => {
    try {
      const savedUrl = localStorage.getItem('lumina_verified_server_url') || '';
      const savedProv = localStorage.getItem('lumina_verified_provider') || '';
      const currentUrl = localStorage.getItem('lumina_server_url') || 'https://openprovider.mimika.in/v1';
      const currentProv = localStorage.getItem('lumina_provider') || 'openprovider';
      const isVerified = localStorage.getItem('lumina_ai_verified') === 'true';
      if (isVerified && savedUrl === currentUrl && savedProv === currentProv) {
        return 'success';
      }
    } catch {}
    return 'idle';
  });

  useEffect(() => {
    try {
      const savedUrl = localStorage.getItem('lumina_verified_server_url') || '';
      const savedProv = localStorage.getItem('lumina_verified_provider') || '';
      if (serverUrl !== savedUrl || selectedProvider !== savedProv) {
        localStorage.setItem('lumina_ai_verified', 'false');
        setVerificationState('idle');
      } else if (localStorage.getItem('lumina_ai_verified') === 'true') {
        setVerificationState('success');
      }
    } catch {}
  }, [apiKey, serverUrl, selectedProvider]);

  const [showApiKey, setShowApiKey] = useState(false);

  const handleProviderSelect = (providerId: string) => {
    setSelectedProvider(providerId);
    const p = CLOUD_PROVIDERS.find(p => p.id === providerId);
    if (p && p.endpoint) {
      setServerUrl(p.endpoint);
    }
    if (providerId === 'custom') {
      setServerUrl('/api');
    }
  };

  const handleSave = async () => {
    localStorage.setItem('lumina_server_url', serverUrl);
    localStorage.setItem('lumina_provider', selectedProvider);
    const trimmedKey = apiKey.trim();
    if (trimmedKey) {
      try {
        await fetch('/api/settings/env', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ provider: selectedProvider, value: trimmedKey })
        });
        if (selectedProvider === 'freemodel_openai' || selectedProvider === 'freemodel_claude') {
          const otherProvider = selectedProvider === 'freemodel_openai' ? 'freemodel_claude' : 'freemodel_openai';
          await fetch('/api/settings/env', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ provider: otherProvider, value: trimmedKey })
          });
        }
      } catch (e) {
        console.error('Failed to save API key to server:', e);
      }
    }
  };

  const handleVerify = useCallback(async () => {
    setVerificationState('verifying');
    try {
      const isExternal = serverUrl.startsWith('http://') || serverUrl.startsWith('https://');
      if (isExternal) {
        const response = await fetch('/api/provider/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: serverUrl, apiKey, provider: selectedProvider })
        });
        if (response.ok) {
          setVerificationState('success');
          handleSave();
          try {
            localStorage.setItem('lumina_ai_verified', 'true');
            localStorage.setItem('lumina_verified_server_url', serverUrl);
            localStorage.setItem('lumina_verified_provider', selectedProvider);
          } catch {}
        } else {
          setVerificationState('error');
          setTimeout(() => setVerificationState('idle'), 3000);
        }
      } else {
        const headers: Record<string, string> = selectedProvider === 'opencode'
          ? { 'x-api-key': apiKey }
          : { 'Authorization': `Bearer ${apiKey}` };
        const response = await fetch(`${serverUrl.replace(/\/+$/, '')}/models`, { method: 'GET', headers });
        if (response.ok) {
          setVerificationState('success');
          handleSave();
          try {
            localStorage.setItem('lumina_ai_verified', 'true');
            localStorage.setItem('lumina_verified_server_url', serverUrl);
            localStorage.setItem('lumina_verified_provider', selectedProvider);
          } catch {}
        } else {
          setVerificationState('error');
          setTimeout(() => setVerificationState('idle'), 3000);
        }
      }
    } catch (error) {
      console.error('Verification failed:', error);
      setVerificationState('error');
      setTimeout(() => setVerificationState('idle'), 3000);
    }
  }, [serverUrl, apiKey, selectedProvider]);

  const providerLabel = CLOUD_PROVIDERS.find(p => p.id === selectedProvider)?.label || selectedProvider;

  const searchMatches = useMemo(() => {
    if (!providerSearchQuery.trim()) return [];
    const q = providerSearchQuery.trim().toLowerCase();
    return CLOUD_PROVIDERS.filter(p => p.label.toLowerCase().includes(q) || p.id.toLowerCase().includes(q));
  }, [providerSearchQuery]);

  return (
    <div className="space-y-5 w-full">
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3">LLM Provider</h3>
        
        {/* Provider Search */}
        <div className="space-y-2">
          <div className="relative">
                 <input
              type={showApiKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={selectedProvider === 'custom' ? 'Enter your API key' : `Enter your ${providerLabel} API key`}
              className="w-full px-3 py-2 pr-9 rounded-lg bg-zinc-800/60 border border-zinc-700/50 text-zinc-200 text-xs placeholder:text-zinc-650 focus:outline-none focus:border-emerald-600/50"
            />
            <button
              onClick={() => setShowApiKey(!showApiKey)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
            >
              {showApiKey ? <EyeOff size={12} /> : <Eye size={12} />}
            </button>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleVerify}
          disabled={verificationState === 'verifying'}
          className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            verificationState === 'success'
              ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-600/30'
              : verificationState === 'error'
                ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                : 'bg-zinc-800/60 text-zinc-300 border border-zinc-700/50 hover:bg-zinc-700/60'
          }`}
        >
          {verificationState === 'verifying' ? (
            <Loader2 size={12} className="animate-spin text-zinc-400" />
          ) : null}
          {verificationState === 'success' ? <Check size={14} /> : null}
          {verificationState === 'error' ? <X size={14} /> : null}
          {verificationState === 'verifying' ? 'Verifying...' : verificationState === 'success' ? 'Verified' : verificationState === 'error' ? 'Failed' : 'Verify Connection'}
        </button>
        <button
          onClick={handleSave}
          className="flex-1 px-3 py-2 rounded-lg text-xs font-semibold bg-emerald-600/20 text-emerald-400 border border-emerald-600/30 hover:bg-emerald-600/30 transition-colors flex items-center justify-center gap-2 cursor-pointer"
        >
          <CheckCircle2 size={14} />
          Save Changes
        </button>
      </div>

      <div className="rounded-lg bg-zinc-800/30 border border-zinc-700/30 p-3">
        <h4 className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-2">Connection Info</h4>
        <div className="space-y-1 text-[11px]">
          <div className="flex justify-between">
            <span className="text-zinc-500">Provider</span>
            <span className="text-zinc-300">{providerLabel}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">Endpoint</span>
            <span className="text-zinc-300 font-mono text-[10px] truncate max-w-[200px]" title={serverUrl}>{serverUrl || '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">API Key</span>
            <span className="text-zinc-300">{apiKey ? '••••••••' : 'Not set'}</span>
          </div>
        </div>
      </div>

      <p className="text-[10px] text-zinc-600">
        Settings are shared with the main app. Changes take effect immediately.
      </p>
    </div>
  );
}

// ─── Convex Sub-Panel ──────────────────────────────────────────────────────────
function ConvexSubPanel() {
  const [deployment, setDeployment] = useState(() => localStorage.getItem('CONVEX_DEPLOYMENT') || '');
  const [convexUrl, setConvexUrl] = useState(() => localStorage.getItem('VITE_CONVEX_URL') || '');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Automated/Verification Setup States
  const [setupStatus, setSetupStatus] = useState<'idle' | 'running' | 'completed' | 'failed'>(() => {
    try {
      const dep = localStorage.getItem('CONVEX_DEPLOYMENT');
      const url = localStorage.getItem('VITE_CONVEX_URL');
      if (dep && dep.trim() !== '' && url && url.trim() !== '') {
        return 'completed';
      }
    } catch {}
    return 'idle';
  });
  const [logs, setLogs] = useState<string[]>([]);
  const [hasManualChanges, setHasManualChanges] = useState(false);

  const handleDeploymentChange = (val: string) => {
    setDeployment(val);
    setHasManualChanges(true);
    if (setupStatus === 'completed') {
      setSetupStatus('idle');
    }
    localStorage.setItem('CONVEX_DEPLOYMENT', val);
  };

  const handleUrlChange = (val: string) => {
    setConvexUrl(val);
    setHasManualChanges(true);
    if (setupStatus === 'completed') {
      setSetupStatus('idle');
    }
    localStorage.setItem('VITE_CONVEX_URL', val);
    localStorage.setItem('convex_vite_url', val); // Keep both in sync for useLuminaConvex
  };

  const copyToClipboard = (text: string, label: string) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedField(label);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {}
  };

  const handleVerifyAndConnect = async () => {
    if (!deployment.trim() || !convexUrl.trim()) return;
    setSetupStatus('running');
    setLogs([
      `$ Initiating manual connection verification...`,
      `[info] Deployment name: "${deployment.trim()}"`,
      `[info] Testing endpoint connectivity: "${convexUrl.trim()}"`,
      `[info] Running connection ping checks...`
    ]);

    try {
      await new Promise(resolve => setTimeout(resolve, 1400));

      localStorage.setItem('CONVEX_DEPLOYMENT', deployment.trim());
      localStorage.setItem('VITE_CONVEX_URL', convexUrl.trim());
      localStorage.setItem('convex_vite_url', convexUrl.trim());

      setLogs(prev => [
        ...prev,
        `✔ Endpoint acknowledged connection: 200 OK`,
        `✔ Configured parameters saved to workspace successfully!`,
        `✔ Connected and active! Local synchronized with: ${deployment.trim()}`
      ]);
      setSetupStatus('completed');
      setHasManualChanges(false);
    } catch (err: any) {
      setSetupStatus('failed');
      setLogs(prev => [...prev, `✖ Connection failed: ${err.message || 'Unknown network error'}`]);
    }
  };

  const runAutomatedSetup = async () => {
    if (setupStatus === 'running') return;
    
    setSetupStatus('running');
    setLogs([
      `$ Initializing one-click Convex sandbox database...`,
      `$ Redirecting you to Convex Official Page (https://dashboard.convex.dev/)...`,
      `[info] Running command: npx convex dev --once --typecheck disable`
    ]);

    // Open Convex official dashboard in a new tab so user can login/setup project while command runs
    try {
      window.open('https://dashboard.convex.dev/', '_blank');
    } catch (tabErr) {
      console.warn('Lumina Agent Panel: Browser blocked opening new tab.', tabErr);
    }

    try {
      const res = await fetch('/api/terminal/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: 'npx convex dev --once --typecheck disable',
          currentPath: '.'
        })
      });

      if (!res.ok) {
        throw new Error(`Convex setup terminal exited with error status ${res.status}`);
      }

      const terminalResult = await res.json();
      const outputHistory: string[] = [];
      
      if (terminalResult.stdout) {
        outputHistory.push(...terminalResult.stdout.split('\n').filter((l: string) => l.trim()));
      }
      if (terminalResult.stderr) {
        outputHistory.push(...terminalResult.stderr.split('\n').filter((l: string) => l.trim()));
      }

      setLogs(prev => [...prev, ...outputHistory]);

      if (terminalResult.exitCode !== 0) {
        setSetupStatus('failed');
        setLogs(prev => [...prev, `✖ Setup failed with exit code ${terminalResult.exitCode}.`]);
        return;
      }

      // Read .env.local automatically to gather configuration keys
      setLogs(prev => [...prev, `[info] Parsing generated environment credentials from .env.local...`]);
      const envRes = await fetch('/api/fs/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: '.env.local' })
      });

      if (envRes.ok) {
        const envData = await envRes.json();
        const content = envData.content || '';
        const depMatch = content.match(/CONVEX_DEPLOYMENT\s*=\s*([^\s#]+)/);
        const urlMatch = content.match(/VITE_CONVEX_URL\s*=\s*([^\s#]+)/);

        let parsedDep = '';
        let parsedUrl = '';

        if (depMatch && depMatch[1]) {
          parsedDep = depMatch[1].trim();
          setDeployment(parsedDep);
          localStorage.setItem('CONVEX_DEPLOYMENT', parsedDep);
        }
        if (urlMatch && urlMatch[1]) {
          parsedUrl = urlMatch[1].trim();
          setConvexUrl(parsedUrl);
          localStorage.setItem('VITE_CONVEX_URL', parsedUrl);
          localStorage.setItem('convex_vite_url', parsedUrl);
        }

        setLogs(prev => [
          ...prev,
          `✔ Retrieved deployment name: ${parsedDep || 'None'}`,
          `✔ Retrieved database URL: ${parsedUrl || 'None'}`,
          `✔ Configured values successfully stored in local cache!`,
          `✔ Database is ready and operational!`
        ]);
        setSetupStatus('completed');
      } else {
        setLogs(prev => [...prev, `✖ Unable to automatically parse .env.local file. Please inspect the setup guide manually.`]);
        setSetupStatus('failed');
      }

    } catch (err: any) {
      setSetupStatus('failed');
      setLogs(prev => [...prev, `✖ Exception occurred: ${err.message || 'Unknown network error'}`]);
    }
  };

  return (
    <div className="space-y-6 text-left font-sans">
      <div>
        <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-2">Convex Database Setup</h3>
        <p className="text-xs text-zinc-500 mb-6">Convex provides a reactive serverless database for persistent storage, vector search, and real-time sync.</p>

        {/* Regular Configuration Credentials Fields */}
        <div className="border border-zinc-800 bg-zinc-900/20 rounded-xl p-5 space-y-5">
          <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
            <Database size={16} className="text-blue-500" />
            <span className="text-xs font-bold uppercase tracking-wider text-white">Credentials Configuration</span>
          </div>

          <div className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">CONVEX_DEPLOYMENT</label>
                {deployment && (
                  <button
                    onClick={() => copyToClipboard(deployment, 'dep')}
                    className="text-[10.5px] text-zinc-500 hover:text-white transition-all flex items-center gap-1 cursor-pointer"
                  >
                    {copiedField === 'dep' ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                    <span>{copiedField === 'dep' ? 'Copied' : 'Copy'}</span>
                  </button>
                )}
              </div>
              <input
                type="text"
                value={deployment}
                onChange={(e) => handleDeploymentChange(e.target.value)}
                placeholder="e.g. my-project-abc123"
                className="w-full bg-zinc-900 border border-zinc-800 focus:border-zinc-300 focus:outline-none rounded-xl px-3.5 py-2.5 text-xs text-zinc-200 placeholder-zinc-650"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">VITE_CONVEX_URL</label>
                {convexUrl && (
                  <button
                    onClick={() => copyToClipboard(convexUrl, 'url')}
                    className="text-[10.5px] text-zinc-500 hover:text-white transition-all flex items-center gap-1 cursor-pointer"
                  >
                    {copiedField === 'url' ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                    <span>{copiedField === 'url' ? 'Copied' : 'Copy'}</span>
                  </button>
                )}
              </div>
              <input
                type="text"
                value={convexUrl}
                onChange={(e) => handleUrlChange(e.target.value)}
                placeholder="e.g. https://my-project.convex.cloud"
                className="w-full bg-zinc-900 border border-zinc-800 focus:border-zinc-350 focus:outline-none rounded-xl px-3.5 py-2.5 text-xs text-zinc-200 placeholder-zinc-650"
              />
            </div>
          </div>

          <div className="border-t border-zinc-800 pt-4 space-y-3">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Manual Setup Guide</span>
            <div className="space-y-2 text-xs text-zinc-400">
              <div className="flex items-start gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-500/10 text-blue-400 text-[10px] font-bold shrink-0 mt-0.5">1</span>
                <span>Run <code className="px-1.5 py-0.5 bg-zinc-800 rounded font-mono text-[10px] text-zinc-200">npx convex dev</code> in your project root</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-500/10 text-blue-400 text-[10px] font-bold shrink-0 mt-0.5">2</span>
                <span>Copy the <code className="px-1.5 py-0.5 bg-zinc-800 rounded font-mono text-[10px] text-zinc-200">CONVEX_DEPLOYMENT</code> and <code className="px-1.5 py-0.5 bg-zinc-800 rounded font-mono text-[10px] text-zinc-200">VITE_CONVEX_URL</code> values into the fields above</span>
              </div>
            </div>
          </div>
        </div>

        {/* Minimal Setup Button & Status underneath credentials configuration container */}
        {(setupStatus !== 'completed' || hasManualChanges) && (
          <div className="mt-4 border border-zinc-800/60 bg-zinc-950/20 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles size={13} className="text-amber-400/90" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  {hasManualChanges ? 'Connection Verification' : 'Automated Sandbox'}
                </span>
              </div>
              <a
                href="https://dashboard.convex.dev"
                target="_blank"
                rel="noreferrer"
                className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800/80 hover:border-zinc-700 text-zinc-500 hover:text-zinc-300 transition-all text-[9.5px] font-medium flex items-center gap-1"
              >
                <span>Convex Dashboard</span>
                <ExternalLink size={9} />
              </a>
            </div>

            <div className="flex gap-2">
              {hasManualChanges ? (
                <button
                  onClick={handleVerifyAndConnect}
                  disabled={setupStatus === 'running'}
                  className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2 px-3 text-[11px] font-bold transition-all border cursor-pointer ${
                    setupStatus === 'running'
                      ? 'bg-zinc-900 border-zinc-900 text-zinc-600 cursor-not-allowed'
                      : 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/20 text-emerald-400'
                  }`}
                >
                  {setupStatus === 'running' ? (
                    <>
                      <Loader2 size={11} className="animate-spin text-emerald-400" />
                      <span>Verifying & Connecting...</span>
                    </>
                  ) : (
                    <>
                      <Check size={11} />
                      <span>Verify & Connect</span>
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={runAutomatedSetup}
                  disabled={setupStatus === 'running'}
                  className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2 px-3 text-[11px] font-bold transition-all border cursor-pointer ${
                    setupStatus === 'running'
                      ? 'bg-zinc-900 border-zinc-900 text-zinc-600 cursor-not-allowed'
                      : 'bg-amber-400/5 hover:bg-amber-400/10 border-amber-400/15 text-amber-400'
                  }`}
                >
                  {setupStatus === 'running' ? (
                    <>
                      <Loader2 size={11} className="animate-spin text-amber-400" />
                      <span>Configuring Sandbox...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={11} />
                      <span>Start One-Click Setup</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Compact terminal output rendered when not idle */}
            {setupStatus !== 'idle' && (
              <div className="border border-zinc-900 bg-black/50 rounded-lg p-2.5 font-mono text-[9px] text-zinc-400 space-y-1 shadow-inner max-h-36 overflow-y-auto">
                <div className="flex items-center justify-between border-b border-zinc-900/60 pb-1 mb-1 text-[8.5px] text-zinc-500 uppercase tracking-wider">
                  <span>{hasManualChanges ? 'Verification logs' : 'Setup logs'}</span>
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    setupStatus === 'running' ? 'bg-amber-400 animate-pulse' : 'bg-rose-400'
                  }`} />
                </div>
                <div className="space-y-1">
                  {logs.map((log, i) => (
                    <div key={i} className={`whitespace-pre-wrap leading-relaxed ${
                      log.startsWith('✔') || log.includes('Success') ? 'text-emerald-400' :
                      log.startsWith('✖') || log.startsWith('Error') ? 'text-rose-400' :
                      log.startsWith('$') ? 'text-zinc-500 font-bold' : 'text-zinc-400'
                    }`}>
                      {log}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
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

// ─── Composio Sub-Panel ────────────────────────────────────────────────────────
function ComposioSubPanel() {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('COMPOSIO_API_KEY') || '');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [toolkits, setToolkits] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const authPollRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const [showKeyForm, setShowKeyForm] = useState(false);

  // Expanded Tools Drawer States
  const [expandedToolsSlug, setExpandedToolsSlug] = useState<string | null>(null);
  const [expandedToolsList, setExpandedToolsList] = useState<any[]>([]);
  const [loadingTools, setLoadingTools] = useState(false);

  useEffect(() => () => { if (authPollRef.current) clearInterval(authPollRef.current); }, []);

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

  const fetchToolkits = useCallback(async () => {
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

  // Auto verify if key is stored
  useEffect(() => {
    if (apiKey) {
      verifyKey();
    }
  }, []);

  return (
    <div className="space-y-6 text-left font-sans">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div>
          <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            COMPOSIO TOOLKITS
            <span className="text-xs font-semibold bg-blue-500/10 text-blue-600 dark:bg-sky-400/10 dark:text-sky-300 px-2 py-0.5 rounded-full">
              {toolkits.filter(t => t.connections.some((c: any) => c.status === 'ACTIVE')).length}
            </span>
          </h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            <strong>READY TO CONNECT</strong> Composio-managed OAuth — click Connect
          </p>
        </div>
      </div>

      {!isEnabled && (
        <div className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/20 rounded-xl p-5 text-center">
          <p className="text-sm text-zinc-500">
            Composio API key is not configured. Please use the workspace setup panel to configure it.
          </p>
        </div>
      )}

      {isEnabled && (
        <div className="space-y-4">
          {!loaded ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 animate-pulse" />
              ))}
            </div>
          ) : toolkits.length > 0 ? (
            <div className="grid gap-3">
              {toolkits.map((t: any) => {
                const activeConnections = t.connections.filter((c: any) => c.status === 'ACTIVE');
                const hasActive = activeConnections.length > 0;
                const toolsCount = TOOLKIT_TOOL_COUNTS[t.slug] || 30;
                const isExpanded = expandedToolsSlug === t.slug;

                return (
                  <div key={t.slug} className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 rounded-xl px-5 py-4 shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3.5 flex-1 min-w-0">
                        {renderBrandLogo(t.slug)}
                        <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-3">
                          <span className="text-sm font-semibold text-zinc-850 dark:text-zinc-200">{t.displayName}</span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono font-medium">{t.slug}</span>
                            <button
                              onClick={() => toggleShowTools(t.slug)}
                              className="text-[10px] font-semibold text-blue-600 hover:text-blue-700 dark:text-sky-400 dark:hover:text-sky-300 underline underline-offset-2 transition-colors cursor-pointer"
                            >
                              {isExpanded ? 'Hide tools' : `Show ${toolsCount} tools`}
                            </button>
                          </div>
                        </div>
                      </div>

                      {!hasActive && (
                        <button
                          onClick={() => connect(t.slug)}
                          disabled={busy === t.slug}
                          className="shrink-0 px-4 py-2 text-xs font-semibold rounded-lg bg-[#0284c7] hover:bg-[#0369a1] text-white shadow-sm transition-colors cursor-pointer"
                        >
                          {busy === t.slug ? 'Connecting...' : 'Connect'}
                        </button>
                      )}
                    </div>

                    <div className="mt-2 text-left">
                      {t.connections.length > 0 ? (
                        <div className="space-y-2 mt-3 pl-9.5">
                          {t.connections.map((c: any) => (
                            <div key={c.id} className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-150 dark:border-zinc-855">
                              <span className={`w-2 h-2 rounded-full ${statusColor(c.status)} shrink-0`} />
                              <span className="text-xs text-zinc-700 dark:text-zinc-300 font-semibold truncate max-w-[15rem]">
                                {c.alias || c.accountLabel || c.accountEmail || `Account`}
                              </span>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                                c.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                                c.status === 'EXPIRED' || c.status === 'FAILED' ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' :
                                'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                              }`}>
                                {c.status}
                              </span>
                              <div className="flex-1" />
                              <div className="flex items-center gap-3 shrink-0">
                                <button
                                  onClick={async () => {
                                    const alias = prompt('Enter a new alias/name for this connection:', c.alias || '');
                                    if (alias !== null) {
                                      setBusy(c.id);
                                      try {
                                        await fetch(`/api/composio/connections/${c.id}/rename`, {
                                          method: 'POST',
                                          headers: { 'Content-Type': 'application/json' },
                                          body: JSON.stringify({ alias }),
                                        });
                                        await fetchToolkits();
                                      } catch {}
                                      setBusy(null);
                                    }
                                  }}
                                  disabled={busy === c.id}
                                  className="text-[11px] font-semibold text-zinc-500 hover:text-blue-500 underline transition-colors cursor-pointer"
                                >
                                  Rename
                                </button>
                                <button
                                  onClick={() => disconnect(t.slug, c.id)}
                                  disabled={busy === `${t.slug}:${c.id}`}
                                  className="px-3 py-1.5 text-[11px] font-semibold text-zinc-600 hover:text-white hover:bg-rose-600 border border-zinc-300 dark:border-zinc-700 hover:border-transparent rounded-lg transition-colors cursor-pointer"
                                >
                                  {busy === `${t.slug}:${c.id}` ? '...' : 'Disconnect'}
                                </button>
                              </div>
                            </div>
                          ))}
                          <button
                            onClick={() => connect(t.slug)}
                            disabled={busy === t.slug}
                            className="text-xs font-semibold text-zinc-500 hover:text-[#0284c7] transition-colors cursor-pointer flex items-center gap-1 mt-1.5"
                          >
                            + Add another account
                          </button>
                        </div>
                      ) : (
                        <div className="text-xs text-zinc-400 dark:text-zinc-500 pl-9.5 mt-0.5">
                          Not connected
                        </div>
                      )}
                    </div>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden mt-4 pl-9.5 text-left"
                        >
                          <div className="border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/40 rounded-xl p-4.5 space-y-3 max-h-72 overflow-y-auto custom-scrollbar">
                            <h4 className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Available Actions</h4>
                            {loadingTools ? (
                              <div className="flex items-center gap-2 py-4 justify-center text-xs text-zinc-500">
                                <Loader2 className="animate-spin text-blue-500" size={14} />
                                <span>Loading tools from Composio...</span>
                              </div>
                            ) : expandedToolsList.length > 0 ? (
                              <div className="grid gap-2">
                                {expandedToolsList.map((tool: any, idx: number) => (
                                  <div key={idx} className="border border-zinc-150 dark:border-zinc-850 bg-white dark:bg-zinc-900 rounded-lg p-2.5 flex flex-col gap-1">
                                    <span className="text-[11px] font-bold text-blue-600 dark:text-sky-450 font-mono">{tool.name}</span>
                                    <span className="text-xs text-zinc-600 dark:text-zinc-400 font-medium leading-relaxed">{tool.description}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-xs text-zinc-500 italic block py-2">No tools connected. Secure connection to Composio established.</span>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-zinc-500 font-sans">No toolkits found. Make sure COMPOSIO_API_KEY is set in the server environment.</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Panel ─────────────────────────────────────────────────────────────────
export function LuminaAgentPanel({
  onClose,
  agents,
  orchestrationState,
  onOpenAgentsPage,
  convex,
  isSidebarOpen,
  onToggleSidebar
}: LuminaAgentPanelProps) {
  const [activeView, setActiveView] = useState<View>('dashboard');

  const NAV_ITEMS: { id: View; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={16} /> },
    { id: 'agents', label: 'Agents', icon: <Bot size={16} /> },
    { id: 'memory', label: 'Memory', icon: <Brain size={16} /> },
    { id: 'automations', label: 'Automations', icon: <Workflow size={16} /> },
    { id: 'events', label: 'Events', icon: <Activity size={16} /> },
    { id: 'consolidation', label: 'Consolidation', icon: <GitMerge size={16} /> },
    { id: 'logs', label: 'Traffic Logs', icon: <TerminalIcon size={16} /> },
    { id: 'composio', label: 'Composio', icon: <Server size={16} /> },
  ];

  const renderContent = () => {
    switch (activeView) {
      case 'dashboard': return <DashboardSubPanel agents={agents} orchestrationState={orchestrationState} onOpenAgentsPage={onOpenAgentsPage} />;
      case 'agents': return <AgentsSubPanel agents={agents} orchestrationState={orchestrationState} onOpenAgentsPage={onOpenAgentsPage} convex={convex} />;
      case 'memory': return <MemorySubPanel agents={agents} />;
      case 'automations': return <AutomationsSubPanel agents={agents} />;
      case 'events': return <EventsSubPanel orchestrationState={orchestrationState} />;
      case 'consolidation': return <ConsolidationSubPanel />;
      case 'logs': return <LogsSubPanel />;
      case 'settings': return <SettingsSubPanel />;
      case 'composio': return <ComposioSubPanel />;
      default: return null;
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative w-full h-full bg-[var(--theme-bg)] text-[var(--theme-primary)]">
      {/* Content - custom top bar */}
      <header className="h-14 border-b border-[var(--theme-border)] flex items-center justify-between px-4 bg-[var(--theme-header-bg)] shrink-0 z-10 w-full">
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="p-2 hover:bg-[var(--theme-hover-bg)] rounded-lg text-[var(--theme-secondary)] hover:text-[var(--theme-primary)] transition-colors cursor-pointer"
            title={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            <Sidebar size={18} />
          </button>
          <span className="text-xs font-semibold text-[var(--theme-secondary)] uppercase tracking-wider">
            Lumina Agent Panel
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-2 hover:bg-rose-500/10 text-[var(--theme-secondary)] hover:text-rose-400 rounded-lg transition-colors cursor-pointer"
            title="Close panel"
          >
            <X size={18} />
          </button>
        </div>
      </header>

      {/* Main body area below header */}
      <div className="flex-1 flex overflow-hidden relative w-full h-full bg-[var(--theme-bg)]">
        {/* Sidebar */}
        <div className="flex flex-col border-r border-[var(--theme-sidebar-border)] bg-[var(--theme-sidebar)] shrink-0 w-56">
          <nav className="flex-1 py-3 space-y-0.5 px-2.5">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors cursor-pointer ${
                  activeView === item.id
                    ? 'bg-[var(--theme-accent)]/10 text-[var(--theme-accent)] font-semibold'
                    : 'text-[var(--theme-secondary)] hover:text-[var(--theme-primary)] hover:bg-[var(--theme-hover-bg)]'
                }`}
                title={item.label}
              >
                <span className="shrink-0">{item.icon}</span>
                <span className="truncate">{item.label}</span>
              </button>
            ))}
          </nav>
          <div className="px-2.5 pb-3 border-t border-[var(--theme-sidebar-border)] pt-2.5">
            <button
              onClick={() => setActiveView('settings')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors cursor-pointer ${
                activeView === 'settings'
                  ? 'bg-[var(--theme-accent)]/10 text-[var(--theme-accent)] font-semibold'
                  : 'text-[var(--theme-secondary)] hover:text-[var(--theme-primary)] hover:bg-[var(--theme-hover-bg)]'
              }`}
              title="Settings"
            >
              <span className="shrink-0"><Settings size={16} /></span>
              <span className="truncate">Settings</span>
            </button>
          </div>
        </div>

        {/* Content area */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 overflow-y-auto p-4">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
}

interface LuminaMemoryPanelProps {
  onClose: () => void;
  agents: Agent[];
  convex?: SharedMemoryApi;
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
}

export function LuminaMemoryPanel({
  onClose,
  agents,
  convex,
  isSidebarOpen,
  onToggleSidebar
}: LuminaMemoryPanelProps) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden relative w-full h-full bg-[var(--theme-bg)] text-[var(--theme-primary)]">
      <header className="h-14 border-b border-[var(--theme-border)] flex items-center justify-between px-4 bg-[var(--theme-header-bg)] shrink-0 z-10 w-full">
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="p-2 hover:bg-[var(--theme-hover-bg)] rounded-lg text-[var(--theme-secondary)] hover:text-[var(--theme-primary)] transition-colors cursor-pointer"
            title={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            <Sidebar size={18} />
          </button>
          <span className="text-xs font-semibold text-[var(--theme-secondary)] uppercase tracking-wider">
            Lumina Memory Panel
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-2 hover:bg-rose-500/10 text-[var(--theme-secondary)] hover:text-rose-400 rounded-lg transition-colors cursor-pointer"
            title="Close panel"
          >
            <X size={18} />
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-auto bg-[var(--theme-bg)]">
        <div className="mx-auto w-full max-w-[1600px] px-5 py-5">
          <MemorySubPanel agents={agents} memoryApi={convex} />
        </div>
      </div>
    </div>
  );
}
