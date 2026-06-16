import React, { useCallback, useMemo, useState } from 'react';
import {
  Activity,
  Bot,
  Brain,
  ChevronLeft,
  GitMerge,
  LayoutDashboard,
  Loader2,
  Search,
  Settings,
  Sidebar,
  Terminal as TerminalIcon,
  Workflow,
  X,
} from 'lucide-react';
import { Agent } from '../agents/types';

type View = 'dashboard' | 'agents' | 'memory' | 'automations' | 'events' | 'consolidation' | 'logs' | 'settings';

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

type ExecAgentStatus = 'spawned' | 'running' | 'completed' | 'failed' | 'cancelled';

interface AgentLogEntry {
  id?: string;
  logType: 'thinking' | 'tool_use' | 'tool_result' | 'text' | 'error';
  toolName?: string;
  content: string;
  createdAt: number;
}

interface ExecutionAgent {
  id?: string;
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

interface LuminaMemoryPanelProps {
  onClose: () => void;
  agents: Agent[];
  convex?: SharedMemoryApi;
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
}

const NAV_ITEMS: Array<{ id: View; label: string; icon: React.ReactNode }> = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={16} /> },
  { id: 'agents', label: 'Agents', icon: <Bot size={16} /> },
  { id: 'memory', label: 'Memory', icon: <Brain size={16} /> },
  { id: 'automations', label: 'Automations', icon: <Workflow size={16} /> },
  { id: 'events', label: 'Events', icon: <Activity size={16} /> },
  { id: 'consolidation', label: 'Consolidation', icon: <GitMerge size={16} /> },
  { id: 'logs', label: 'Traffic Logs', icon: <TerminalIcon size={16} /> },
];

const EXEC_STATUS_CONFIG: Record<ExecAgentStatus, { dot: string; label: string; color: string }> = {
  spawned: { dot: 'bg-amber-400', label: 'Spawning', color: 'text-amber-400' },
  running: { dot: 'bg-sky-400', label: 'Running', color: 'text-sky-400' },
  completed: { dot: 'bg-emerald-400', label: 'Done', color: 'text-emerald-400' },
  failed: { dot: 'bg-rose-400', label: 'Failed', color: 'text-rose-400' },
  cancelled: { dot: 'bg-slate-500', label: 'Cancelled', color: 'text-slate-500' },
};

const INTEGRATION_ICONS: Record<string, string> = {
  gmail: '📧',
  slack: '💬',
  github: '🐙',
  telegram: '✈️',
  notion: '📝',
  googlecalendar: '📅',
  twitter: '🐦',
  discord: '🎮',
  web: '🌐',
  filesystem: '📁',
  shell: '⌘',
};

function timeAgo(ts: number | null | undefined): string {
  if (!ts) return 'never';
  const diff = Date.now() - ts;
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

function PanelShell({
  title,
  activeView,
  setActiveView,
  activeAgentCount,
  onClose,
  onToggleSidebar,
  isSidebarOpen,
  children,
}: {
  title: string;
  activeView: View;
  setActiveView: (view: View) => void;
  activeAgentCount: number;
  onClose: () => void;
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="h-full w-full flex flex-col" style={{ background: 'var(--theme-bg)', color: 'var(--theme-primary)' }}>
      <header className="flex items-center justify-between px-5 py-2.5 border-b shrink-0 backdrop-blur-sm" style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-header-bg)' }}>
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold tracking-wide uppercase" style={{ color: 'var(--theme-secondary)' }}>{title}</span>
          <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--theme-success)' }}>
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full animate-ping opacity-75" style={{ background: 'var(--theme-success)' }} />
              <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: 'var(--theme-success)' }} />
            </span>
            Live
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg transition-colors"
          style={{ color: 'var(--theme-muted)' }}
          title="Close panel"
        >
          <X size={16} />
        </button>
      </header>

      <div className="flex flex-1 min-h-0">
        <div className="w-[168px] shrink-0 border-r flex flex-col py-1.5" style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-sidebar)' }}>
          <nav className="flex-1 py-1.5">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-[13px] transition-all duration-150"
                style={{
                  background: activeView === item.id ? 'var(--theme-hover-bg)' : 'transparent',
                  color: activeView === item.id ? 'var(--theme-primary)' : 'var(--theme-muted)',
                  fontWeight: activeView === item.id ? 500 : 400,
                }}
              >
                <span className="shrink-0">{item.icon}</span>
                <span className="truncate">{item.label}</span>
                {item.id === 'agents' && activeAgentCount > 0 && (
                  <span className="ml-auto flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold bg-sky-500 text-white">
                    {activeAgentCount}
                  </span>
                )}
              </button>
            ))}
          </nav>
          <div className="mt-auto px-4 py-3 flex items-center gap-2">
            <span className="w-5 h-5 rounded flex items-center justify-center text-[10px]" style={{ background: 'var(--theme-surface-alt)' }}>L</span>
            <span className="text-[10px]" style={{ color: 'var(--theme-muted)' }}>v0.1</span>
          </div>
          <div className="px-2.5 pb-3 border-t pt-2.5" style={{ borderColor: 'var(--theme-border)' }}>
            <button
              onClick={() => setActiveView('settings')}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-[13px] transition-all duration-150"
              style={{
                background: activeView === 'settings' ? 'var(--theme-hover-bg)' : 'transparent',
                color: activeView === 'settings' ? 'var(--theme-primary)' : 'var(--theme-muted)',
                fontWeight: activeView === 'settings' ? 500 : 400,
              }}
            >
              <span className="shrink-0"><Settings size={16} /></span>
              <span className="truncate">Settings</span>
            </button>
          </div>
        </div>

        <main className="flex-1 min-w-0 overflow-hidden">
          <div className="h-full w-full overflow-auto p-5 fade-in">{children}</div>
        </main>
      </div>
    </div>
  );
}

function OverviewPanel({ agents, orchestrationState, execAgents }: {
  agents: Agent[];
  orchestrationState: AgentOrchestrationState;
  execAgents: ExecutionAgent[];
}) {
  const running = execAgents.filter((agent) => agent.status === 'running' || agent.status === 'spawned').length;
  const completed = execAgents.filter((agent) => agent.status === 'completed').length;
  const failed = execAgents.filter((agent) => agent.status === 'failed').length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--theme-secondary)' }}>Dashboard</h3>
        <span className="text-[10px]" style={{ color: 'var(--theme-muted)' }}>Live metrics</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          ['Configured Agents', String(agents.length)],
          ['Active Runs', String(running)],
          ['Completed', String(completed)],
          ['Failed', String(failed)],
        ].map(([label, value]) => (
          <div key={label} className="border rounded-xl p-4" style={{ background: 'var(--theme-card-bg)', borderColor: 'var(--theme-border)' }}>
            <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--theme-muted)' }}>{label}</div>
            <div className="text-2xl font-semibold mt-2" style={{ color: 'var(--theme-primary)' }}>{value}</div>
          </div>
        ))}
      </div>

      <div className="border rounded-xl p-4" style={{ background: 'var(--theme-card-bg)', borderColor: 'var(--theme-border)' }}>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--theme-secondary)' }}>Orchestration</h4>
          <span className="text-[10px]" style={{ color: 'var(--theme-muted)' }}>
            Phase {orchestrationState.currentPhase}/{orchestrationState.totalPhases}
          </span>
        </div>
        {orchestrationState.agents.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--theme-muted)' }}>No subagents have been spawned yet.</p>
        ) : (
          <div className="space-y-2">
            {orchestrationState.agents.slice(0, 6).map((agent) => (
              <div key={agent.id} className="flex items-center gap-3 p-2 rounded-lg" style={{ background: 'var(--theme-surface-alt)' }}>
                <span className={`w-2 h-2 rounded-full ${agent.status === 'running' ? 'bg-sky-400' : agent.status === 'failed' ? 'bg-rose-400' : 'bg-emerald-400'}`} />
                <span className="text-xs flex-1" style={{ color: 'var(--theme-primary)' }}>{agent.name}</span>
                <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--theme-muted)' }}>{agent.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AgentsPanel({ execAgents, convex }: {
  execAgents: ExecutionAgent[];
  convex?: LuminaAgentPanelProps['convex'];
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | ExecAgentStatus>('all');
  const [search, setSearch] = useState('');
  const [cleaning, setCleaning] = useState(false);

  const activeCount = execAgents.filter((agent) => agent.status === 'running' || agent.status === 'spawned').length;

  const filtered = useMemo(() => {
    let result = execAgents;
    if (statusFilter !== 'all') {
      result = result.filter((agent) => agent.status === statusFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (agent) => agent.name.toLowerCase().includes(q) || agent.task.toLowerCase().includes(q),
      );
    }
    return result;
  }, [execAgents, search, statusFilter]);

  const selectedAgent = execAgents.find((agent) => agent.agentId === selectedId) || null;

  const cleanupFinished = useCallback(async () => {
    if (cleaning) return;
    setCleaning(true);
    try {
      await fetch('/api/agents/cleanup', { method: 'POST' });
    } finally {
      setCleaning(false);
    }
  }, [cleaning]);

  if (selectedAgent) {
    const cfg = EXEC_STATUS_CONFIG[selectedAgent.status];
    const isActive = selectedAgent.status === 'running' || selectedAgent.status === 'spawned';
    const totalTokens = selectedAgent.inputTokens + selectedAgent.outputTokens;

    return (
      <div className="flex flex-col h-full -m-5 fade-in">
        <div className="shrink-0 border-b px-5 py-3 flex items-center gap-3 backdrop-blur-sm" style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-header-bg)' }}>
          <button
            onClick={() => setSelectedId(null)}
            className="text-xs rounded-md px-2.5 py-1 transition-colors"
            style={{ color: 'var(--theme-secondary)', background: 'var(--theme-surface-alt)' }}
          >
            ← Back
          </button>
          <span className="relative flex h-2.5 w-2.5">
            {isActive && <span className={`absolute inline-flex h-full w-full rounded-full ${cfg.dot} animate-ping opacity-75`} />}
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${cfg.dot}`} />
          </span>
          <span className="text-sm font-medium" style={{ color: 'var(--theme-primary)' }}>{selectedAgent.name}</span>
          <span className={`text-xs ${cfg.color}`}>{cfg.label}</span>
          <div className="ml-auto flex items-center gap-3 text-xs">
            {selectedAgent.costUsd > 0 && <span className="text-emerald-400 font-semibold">${selectedAgent.costUsd.toFixed(4)}</span>}
            {totalTokens > 0 && <span style={{ color: 'var(--theme-muted)' }}>{(totalTokens / 1000).toFixed(1)}k tok</span>}
          </div>
        </div>

        <div className="shrink-0 p-4 pb-2">
          <div className="rounded-xl border border-sky-800/40 px-4 py-3 shadow-lg" style={{ background: 'var(--theme-card-bg)' }}>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-sky-400 shrink-0" />
              <span className="text-[10px] font-bold tracking-wider text-sky-400">REQUEST</span>
            </div>
            <p className="text-xs whitespace-pre-wrap break-words mt-2" style={{ color: 'var(--theme-primary)' }}>{selectedAgent.task}</p>
          </div>
        </div>

        {selectedAgent.integrations.length > 0 && (
          <div className="shrink-0 px-4 pb-2">
            <div className="rounded-xl border px-4 py-2.5" style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-card-bg)' }}>
              <span className="text-[10px] font-bold tracking-wider" style={{ color: 'var(--theme-muted)' }}>INTEGRATIONS</span>
              <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                {selectedAgent.integrations.map((name) => (
                  <span key={name} className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium" style={{ background: 'var(--theme-surface-alt)', color: 'var(--theme-primary)' }}>
                    {INTEGRATION_ICONS[name] ?? '🔧'} {name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-5">
          {selectedAgent.logs.length === 0 ? (
            <div className="flex items-center gap-3 py-4">
              <Loader2 size={14} className="animate-spin text-sky-400" />
              <span className="text-xs" style={{ color: 'var(--theme-muted)' }}>{isActive ? 'Waiting for activity…' : 'No logs recorded'}</span>
            </div>
          ) : (
            <div className="space-y-0">
              {selectedAgent.logs.map((log, index) => {
                const isToolUse = log.logType === 'tool_use';
                const isToolResult = log.logType === 'tool_result';
                const isError = log.logType === 'error';
                return (
                  <div key={log.id || `${log.createdAt}-${index}`} className="flex gap-3">
                    <div className="flex flex-col items-center shrink-0 w-5">
                      <div className="mt-1.5">
                        <span className={`block w-2.5 h-2.5 rounded-full ${isToolUse ? 'bg-sky-400' : isError ? 'bg-rose-400' : ''}`} style={!isToolUse && !isError ? { background: 'var(--theme-muted)' } : undefined} />
                      </div>
                      {index < selectedAgent.logs.length - 1 && <div className="flex-1 w-px mt-1" style={{ background: 'var(--theme-border)' }} />}
                    </div>
                    <div className="flex-1 min-w-0 pb-4">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[10px] font-bold tracking-wider" style={{ color: isToolUse ? 'var(--theme-accent)' : isError ? 'var(--theme-danger)' : 'var(--theme-muted)' }}>
                          {isToolUse ? 'TOOL' : isError ? 'ERROR' : isToolResult ? 'RESPONSE' : 'TEXT'}
                        </span>
                        {log.toolName && <span className="text-xs font-medium text-sky-300">{log.toolName}</span>}
                        <span className="text-[9px] ml-auto" style={{ color: 'var(--theme-muted)' }}>{timeAgo(log.createdAt)}</span>
                      </div>
                      <p className="text-xs whitespace-pre-wrap break-words" style={{ color: isError ? 'var(--theme-danger)' : 'var(--theme-secondary)' }}>
                        {log.content.slice(0, 600)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {selectedAgent.result && (
          <div className="sticky bottom-0 p-4 pt-2">
            <div className="rounded-xl border border-emerald-800/40 px-4 py-3 shadow-lg" style={{ background: 'var(--theme-card-bg)' }}>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                <span className="text-[10px] font-bold tracking-wider text-emerald-400">RESPONSE</span>
              </div>
              <p className="text-xs whitespace-pre-wrap break-words mt-2" style={{ color: 'var(--theme-primary)' }}>{selectedAgent.result}</p>
            </div>
          </div>
        )}

        {selectedAgent.error && (
          <div className="sticky bottom-0 p-4 pt-2">
            <div className="rounded-xl border border-rose-800/40 px-4 py-3 shadow-lg" style={{ background: 'var(--theme-card-bg)' }}>
              <span className="text-[10px] font-bold tracking-wider text-rose-500">ERROR</span>
              <p className="text-xs whitespace-pre-wrap break-words mt-1 text-rose-300">{selectedAgent.error}</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full -m-5">
      <div className="shrink-0 border-b px-5 py-3 flex items-center gap-3 backdrop-blur-sm" style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-header-bg)' }}>
        <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--theme-muted)' }}>Agents</h2>
        {activeCount > 0 && (
          <span className="flex items-center gap-1.5 text-xs text-sky-400 font-medium">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-sky-400 animate-ping opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-400" />
            </span>
            {activeCount} active
          </span>
        )}
        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={cleanupFinished}
            disabled={cleaning}
            className="px-2.5 py-1 text-xs rounded-md transition-colors disabled:opacity-50"
            style={{ color: 'var(--theme-muted)' }}
          >
            {cleaning ? 'Cleaning...' : 'Cleanup'}
          </button>
          {(['all', 'running', 'completed', 'failed'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className="px-2.5 py-1 text-xs rounded-md capitalize transition-colors"
              style={{
                background: statusFilter === status ? 'var(--theme-hover-bg)' : 'transparent',
                color: statusFilter === status ? 'var(--theme-primary)' : 'var(--theme-muted)',
                fontWeight: statusFilter === status ? 500 : 400,
              }}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      <div className="shrink-0 p-4 pb-2">
        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--theme-muted)' }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search agents..."
            className="w-full border rounded-lg pl-7 pr-2 py-1.5 text-[11px] focus:outline-none"
            style={{ background: 'var(--theme-input-bg)', borderColor: 'var(--theme-input-border)', color: 'var(--theme-primary)' }}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pt-2 space-y-3">
        {filtered.length === 0 ? (
          <p className="text-sm py-8 text-center" style={{ color: 'var(--theme-muted)' }}>
            {execAgents.length === 0 ? 'No agents yet' : 'No matching agents'}
          </p>
        ) : (
          filtered.map((agent) => {
            const cfg = EXEC_STATUS_CONFIG[agent.status];
            const isActive = agent.status === 'running' || agent.status === 'spawned';
            const totalTokens = agent.inputTokens + agent.outputTokens;
            const elapsed = agent.completedAt ? (agent.completedAt - agent.startedAt) / 1000 : (Date.now() - agent.startedAt) / 1000;

            return (
              <div
                key={agent.agentId}
                onClick={() => setSelectedId(agent.agentId)}
                className="border rounded-xl p-4 cursor-pointer transition-all duration-150 fade-in"
                style={{ background: 'var(--theme-card-bg)', borderColor: 'var(--theme-border)' }}
              >
                <div className="flex items-center gap-2.5 mb-1.5">
                  <span className="relative flex h-2.5 w-2.5 shrink-0">
                    {isActive && <span className={`absolute inline-flex h-full w-full rounded-full ${cfg.dot} animate-ping opacity-75`} />}
                    <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${cfg.dot}`} />
                  </span>
                  <span className="text-sm font-medium truncate" style={{ color: 'var(--theme-primary)' }}>{agent.name}</span>
                  <span className={`flex items-center gap-2 text-xs ml-auto ${cfg.color}`}>{cfg.label}</span>
                </div>

                <p className="text-xs truncate mb-2" style={{ color: 'var(--theme-muted)' }}>
                  {agent.status === 'completed'
                    ? agent.result?.slice(0, 120)
                    : agent.status === 'failed'
                      ? agent.error?.slice(0, 120)
                      : agent.task.slice(0, 120)}
                </p>

                {(agent.costUsd > 0 || totalTokens > 0) && (
                  <div className="flex items-center gap-3 text-[10px] mb-2">
                    {agent.costUsd > 0 && <span className="text-emerald-400 font-semibold">${agent.costUsd.toFixed(4)}</span>}
                    {totalTokens > 0 && <span style={{ color: 'var(--theme-muted)' }}>{(totalTokens / 1000).toFixed(1)}k tok</span>}
                    <span style={{ color: 'var(--theme-muted)' }}>{elapsed.toFixed(1)}s</span>
                  </div>
                )}

                {agent.integrations.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {agent.integrations.map((name) => (
                      <span key={name} className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] rounded-md" style={{ background: 'var(--theme-surface-alt)', color: 'var(--theme-primary)' }}>
                        {INTEGRATION_ICONS[name] ?? '🔧'}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function StubPanel({ title, description }: { title: string; description: string }) {
  return (
    <div className="border rounded-xl p-5" style={{ background: 'var(--theme-card-bg)', borderColor: 'var(--theme-border)' }}>
      <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--theme-secondary)' }}>{title}</h3>
      <p className="text-sm" style={{ color: 'var(--theme-muted)' }}>{description}</p>
    </div>
  );
}

export function LuminaAgentPanel({
  onClose,
  agents,
  orchestrationState,
  onOpenAgentsPage,
  convex,
  isSidebarOpen,
  onToggleSidebar,
}: LuminaAgentPanelProps) {
  const [activeView, setActiveView] = useState<View>('dashboard');
  const execAgents = convex?.agents || [];
  const activeAgentCount = execAgents.filter((agent) => agent.status === 'running' || agent.status === 'spawned').length;

  let content: React.ReactNode;
  switch (activeView) {
    case 'dashboard':
      content = <OverviewPanel agents={agents} orchestrationState={orchestrationState} execAgents={execAgents} />;
      break;
    case 'agents':
      content = <AgentsPanel execAgents={execAgents} convex={convex} />;
      break;
    case 'memory':
      content = <StubPanel title="Memory" description="Memory panel styling can be aligned next in the same Boop dashboard style." />;
      break;
    case 'automations':
      content = <StubPanel title="Automations" description="Automations panel is preserved separately and can be brought to the same debug layout next." />;
      break;
    case 'events':
      content = <StubPanel title="Events" description="Events stream panel is ready for a follow-up visual pass." />;
      break;
    case 'consolidation':
      content = <StubPanel title="Consolidation" description="Consolidation view can be styled to match the Llama dashboard in the next pass." />;
      break;
    case 'logs':
      content = <StubPanel title="Traffic Logs" description="Traffic logs are still available, and this section now sits inside the same dashboard shell." />;
      break;
    case 'settings':
      content = <StubPanel title="Settings" description="Settings remain available and can be visually aligned in a follow-up pass." />;
      break;
    default:
      content = null;
  }

  return (
    <PanelShell
      title="Lumina Debug"
      activeView={activeView}
      setActiveView={setActiveView}
      activeAgentCount={activeAgentCount}
      onClose={onClose}
      onToggleSidebar={onToggleSidebar}
      isSidebarOpen={isSidebarOpen}
    >
      {content}
    </PanelShell>
  );
}

export function LuminaMemoryPanel({
  onClose,
  agents,
  convex,
  isSidebarOpen,
  onToggleSidebar,
}: LuminaMemoryPanelProps) {
  return (
    <PanelShell
      title="Lumina Memory"
      activeView="memory"
      setActiveView={() => {}}
      activeAgentCount={0}
      onClose={onClose}
      onToggleSidebar={onToggleSidebar}
      isSidebarOpen={isSidebarOpen}
    >
      <StubPanel
        title="Memory"
        description="The memory panel shell now matches the Llama-style dashboard chrome. Detailed memory table/graph styling can be aligned next."
      />
    </PanelShell>
  );
}
