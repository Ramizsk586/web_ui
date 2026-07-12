import React, { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
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
import { EmbeddingBanner } from './EmbeddingBanner';
const MemoryGraphView = React.lazy(() => import('./MemoryGraphView'));
import { IntegrationLogo, prettyToolName } from '../utils/branding';
import { SettingsPanel } from './SettingsPanel';
import { EventsPanel } from './EventsPanel';
import { ConsolidationPanel } from './ConsolidationPanel';

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
    memories?: SharedMemoryRecord[];
    events?: any[];
    automations?: any[];
    getAgentLogs?: (agentId: string) => Promise<any[]>;
    addAutomation?: (auto: any) => Promise<void>;
    patchAutomation?: (automationId: string, patch: any) => Promise<void>;
    toggleAutomation?: (automationId: string, enabled: boolean) => Promise<void>;
    deleteAutomation?: (automationId: string) => Promise<void>;
    getAutomationRuns?: (automationId: string) => Promise<any[]>;
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

type TimeRange = "all" | "7d" | "30d" | "90d";

const RANGES: { id: TimeRange; label: string }[] = [
  { id: "7d", label: "7 days" },
  { id: "30d", label: "30 days" },
  { id: "90d", label: "90 days" },
  { id: "all", label: "All time" },
];

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

function StatCard({
  label,
  value,
  sub,
  color,
  info,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
  info?: { title: string; body: ReactNode };
}) {
  const [open, setOpen] = useState(false);
  const popRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (popRef.current && !popRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  return (
    <div className="rounded-xl border p-3.5 relative" style={{ background: 'var(--theme-card-bg)', borderColor: 'var(--theme-border)' }}>
      <div className="text-[11px] font-medium uppercase tracking-wider flex items-center gap-1.5" style={{ color: 'var(--theme-muted)' }}>
        <span>{label}</span>
        {info && (
          <div className="relative" ref={popRef}>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-label={`What does ${label} mean?`}
              aria-expanded={open}
              className="w-3.5 h-3.5 inline-flex items-center justify-center rounded-full border text-[9px] font-bold normal-case tracking-normal transition-colors cursor-pointer"
              style={{
                borderColor: 'var(--theme-border)',
                color: 'var(--theme-muted)',
              }}
            >
              i
            </button>
            {open && (
              <div
                role="dialog"
                aria-label={info.title}
                className="absolute z-30 left-0 top-full mt-1.5 w-64 rounded-lg border px-3 py-2.5 shadow-lg text-[11px] leading-snug normal-case tracking-normal"
                style={{
                  background: 'var(--theme-card-bg)',
                  borderColor: 'var(--theme-border)',
                  color: 'var(--theme-primary)',
                }}
              >
                <div className="font-semibold mb-1" style={{ color: 'var(--theme-primary)' }}>
                  {info.title}
                </div>
                <div className="font-normal">{info.body}</div>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="text-xl font-bold mt-1" style={color ? { color } : { color: 'var(--theme-primary)' }}>
        {value}
      </div>
      {sub && <div className="text-[11px] mt-0.5" style={{ color: 'var(--theme-muted)' }}>{sub}</div>}
    </div>
  );
}

function BarRow({
  label,
  value,
  total,
  color,
  format,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
  format?: (v: number) => string;
}) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  const display = format ? format(value) : `$${value.toFixed(2)}`;
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-24 truncate capitalize font-medium" style={{ color: 'var(--theme-secondary)' }}>
        {label}
      </span>
      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--theme-surface-alt)' }}>
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${Math.max(pct, 1)}%` }}
        />
      </div>
      <span className="w-16 text-right font-medium" style={{ color: 'var(--theme-primary)' }}>
        {display}
      </span>
    </div>
  );
}

function StackedAreaChart({
  data,
  keys,
  colors,
  labels,
  format,
}: {
  data: Record<string, any>[];
  keys: string[];
  colors: string[];
  labels: string[];
  format: (v: number) => string;
}) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  if (data.length < 2) return null;

  const W = 800;
  const H = 180;
  const PL = 55;
  const PR = 16;
  const PT = 8;
  const PB = 28;
  const chartW = W - PL - PR;
  const chartH = H - PT - PB;

  const stacked = data.map((d) => {
    let cum = 0;
    const layers: number[] = [];
    const raw: number[] = [];
    for (const k of keys) {
      const v = d[k] ?? 0;
      raw.push(v);
      cum += v;
      layers.push(cum);
    }
    return { day: d.day as string, layers, raw, total: cum };
  });

  const maxVal = Math.max(...stacked.map((d) => d.total), 0.01);
  const x = (i: number) => PL + (i / (data.length - 1)) * chartW;
  const y = (v: number) => PT + chartH - (v / maxVal) * chartH;
  const yTicks = [0, maxVal * 0.5, maxVal];

  const areaPaths: string[] = [];
  for (let k = keys.length - 1; k >= 0; k--) {
    const topPoints = stacked.map((d, i) => `${x(i)},${y(d.layers[k])}`).join(" L");
    const bottomLayer =
      k > 0
        ? stacked
            .map((d, i) => `${x(i)},${y(d.layers[k - 1])}`)
            .reverse()
            .join(" L")
        : stacked
            .map((_, i) => `${x(i)},${y(0)}`)
            .reverse()
            .join(" L");
    areaPaths.push(`M${topPoints} L${bottomLayer} Z`);
  }

  const step = Math.max(1, Math.floor(data.length / 6));
  const xLabels: { i: number; label: string }[] = [];
  for (let i = 0; i < data.length; i += step)
    xLabels.push({ i, label: (data[i].day as string).slice(5) });
  if (xLabels[xLabels.length - 1]?.i !== data.length - 1) {
    xLabels.push({
      i: data.length - 1,
      label: (data[data.length - 1].day as string).slice(5),
    });
  }

  const gridColor = 'var(--theme-border)';
  const textColor = 'var(--theme-muted)';
  const crosshair = 'var(--theme-border)';

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const mouseX = ((e.clientX - rect.left) / rect.width) * W;
      const chartX = mouseX - PL;
      if (chartX < 0 || chartX > chartW) {
        setHoverIdx(null);
        return;
      }
      const idx = Math.round((chartX / chartW) * (data.length - 1));
      setHoverIdx(Math.max(0, Math.min(data.length - 1, idx)));
    },
    [data.length, chartW],
  );

  const hovered = hoverIdx !== null ? stacked[hoverIdx] : null;
  const tooltipLeft = hoverIdx !== null ? (x(hoverIdx) / W) * 100 : 0;
  const flipTooltip = hoverIdx !== null && tooltipLeft > 65;

  return (
    <div ref={containerRef} className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        preserveAspectRatio="none"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverIdx(null)}
      >
        {yTicks.map((v, i) => (
          <g key={i}>
            <line x1={PL} x2={W - PR} y1={y(v)} y2={y(v)} stroke={gridColor} strokeWidth={1} style={{ stroke: 'var(--theme-border)' }} />
            <text
              x={PL - 6}
              y={y(v) + 3.5}
              textAnchor="end"
              fill={textColor}
              fontSize={10}
              fontFamily="monospace"
              style={{ fill: 'var(--theme-muted)' }}
            >
              {format(v)}
            </text>
          </g>
        ))}

        {areaPaths.map((path, i) => (
          <path key={i} d={path} fill={colors[i]} opacity={0.35} />
        ))}

        {keys.map((_, k) => {
          const linePoints = stacked
            .map((d, i) => `${x(i)},${y(d.layers[k])}`)
            .join(" L");
          return (
            <path
              key={k}
              d={`M${linePoints}`}
              fill="none"
              stroke={colors[k]}
              strokeWidth={1.5}
            />
          );
        })}

        {xLabels.map(({ i, label }) => (
          <text
            key={i}
            x={x(i)}
            y={H - 4}
            textAnchor="middle"
            fill={textColor}
            fontSize={10}
            fontFamily="monospace"
            style={{ fill: 'var(--theme-muted)' }}
          >
            {label}
          </text>
        ))}

        {hoverIdx !== null && hovered && (
          <>
            <line
              x1={x(hoverIdx)}
              x2={x(hoverIdx)}
              y1={PT}
              y2={PT + chartH}
              stroke={crosshair}
              strokeWidth={1}
              strokeDasharray="3,3"
              style={{ stroke: 'var(--theme-border)' }}
            />
            {keys.map((_, k) => (
              <circle
                key={k}
                cx={x(hoverIdx)}
                cy={y(hovered.layers[k])}
                r={3.5}
                fill={colors[k]}
                stroke="#ffffff"
                strokeWidth={1.5}
              />
            ))}
          </>
        )}
      </svg>

      {hoverIdx !== null && hovered && (
        <div
          className="absolute pointer-events-none rounded-lg border px-3 py-2 shadow-lg text-xs z-10"
          style={{
            top: 4,
            left: flipTooltip ? undefined : `calc(${tooltipLeft}% + 12px)`,
            right: flipTooltip ? `calc(${100 - tooltipLeft}% + 12px)` : undefined,
            background: 'var(--theme-card-bg)',
            borderColor: 'var(--theme-border)',
            color: 'var(--theme-primary)',
          }}
        >
          <div className="font-semibold mb-1.5" style={{ color: 'var(--theme-primary)' }}>
            {hovered.day}
          </div>
          {keys.map((_, k) => (
            <div key={k} className="flex items-center gap-2 py-0.5">
              <span
                className="w-2.5 h-2.5 rounded-sm shrink-0"
                style={{ background: colors[k] }}
              />
              <span style={{ color: 'var(--theme-muted)' }}>
                {labels[k]}
              </span>
              <span className="ml-auto font-medium pl-3" style={{ fontFamily: 'monospace' }}>
                {format(hovered.raw[k])}
              </span>
            </div>
          ))}
          <div
            className="border-t mt-1.5 pt-1.5 flex justify-between font-semibold"
            style={{ borderColor: 'var(--theme-border)' }}
          >
            <span>Total</span>
            <span style={{ fontFamily: 'monospace' }}>{format(hovered.total)}</span>
          </div>
        </div>
      )}

      <div className="flex items-center gap-4 mt-2 ml-14">
        {labels.map((l, i) => (
          <div key={i} className="flex items-center gap-1.5 text-[11px]">
            <span
              className="w-2.5 h-2.5 rounded-sm"
              style={{ background: colors[i] }}
            />
            <span style={{ color: 'var(--theme-muted)' }}>
              {l}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DashboardPanel({
  execAgents,
  memories = [],
  events = [],
  orchestrationState,
  agents,
}: {
  execAgents: ExecutionAgent[];
  memories?: SharedMemoryRecord[];
  events?: any[];
  orchestrationState: AgentOrchestrationState;
  agents: Agent[];
}) {
  const [range, setRange] = useState<TimeRange>("all");

  const filtered = useMemo(() => {
    let cutoffMs = 0;
    if (range !== "all") {
      const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
      cutoffMs = Date.now() - days * 86_400_000;
    }

    const rangeAgents = cutoffMs > 0 
      ? execAgents.filter(a => a.startedAt >= cutoffMs)
      : execAgents;

    const buckets = new Map<string, {
      day: string;
      agentCost: number;
      inputTokens: number;
      outputTokens: number;
      agentsSpawned: number;
      agentsCompleted: number;
      agentsFailed: number;
      agentsCancelled: number;
    }>();

    function keyFor(ts: number) {
      return new Date(ts).toISOString().slice(0, 10);
    }
    
    function bucketFor(day: string) {
      let b = buckets.get(day);
      if (!b) {
        b = {
          day,
          agentCost: 0,
          inputTokens: 0,
          outputTokens: 0,
          agentsSpawned: 0,
          agentsCompleted: 0,
          agentsFailed: 0,
          agentsCancelled: 0,
        };
        buckets.set(day, b);
      }
      return b;
    }

    for (const a of rangeAgents) {
      const dayStr = keyFor(a.startedAt);
      const b = bucketFor(dayStr);
      b.agentsSpawned += 1;
      b.agentCost += a.costUsd ?? 0;
      b.inputTokens += a.inputTokens ?? 0;
      b.outputTokens += a.outputTokens ?? 0;
      if (a.status === "completed") b.agentsCompleted += 1;
      else if (a.status === "failed") b.agentsFailed += 1;
      else if (a.status === "cancelled") b.agentsCancelled += 1;
    }

    const dailyBuckets = [...buckets.values()].sort((a, b) => a.day.localeCompare(b.day));

    let totalCost = 0;
    let inputTokens = 0;
    let outputTokens = 0;
    let agentsSpawned = 0;
    let agentsCompleted = 0;
    let agentsFailed = 0;
    let agentsCancelled = 0;

    for (const d of dailyBuckets) {
      totalCost += d.agentCost;
      inputTokens += d.inputTokens;
      outputTokens += d.outputTokens;
      agentsSpawned += d.agentsSpawned;
      agentsCompleted += d.agentsCompleted;
      agentsFailed += d.agentsFailed;
      agentsCancelled += d.agentsCancelled;
    }

    const totalTokens = inputTokens + outputTokens;

    const activeMemories = memories.filter((m) => m.lifecycle === "active");
    const memoriesByTier = {
      short: activeMemories.filter((m) => m.tier === "short").length,
      long: activeMemories.filter((m) => m.tier === "long").length,
      permanent: activeMemories.filter((m) => m.tier === "permanent").length,
    };

    return {
      dailyBuckets,
      cost: { total: totalCost },
      tokens: { input: inputTokens, output: outputTokens, total: totalTokens },
      agents: {
        total: agentsSpawned,
        completed: agentsCompleted,
        failed: agentsFailed,
        cancelled: agentsCancelled,
        running: execAgents.filter((a) => a.status === "running" || a.status === "spawned").length,
        failureRate: agentsSpawned > 0 ? agentsFailed / agentsSpawned : 0,
      },
      memories: {
        total: activeMemories.length,
        short: memoriesByTier.short,
        long: memoriesByTier.long,
        permanent: memoriesByTier.permanent,
      },
      messagesCount: events.length,
    };
  }, [execAgents, memories, events, range]);

  const failPct = (filtered.agents.failureRate * 100).toFixed(1);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--theme-muted)' }}>
          Overview
        </h2>
        <div className="flex items-center rounded-lg border text-xs" style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface-alt)' }}>
          {RANGES.map((r) => (
            <button
              key={r.id}
              onClick={() => setRange(r.id)}
              className="px-3 py-1.5 transition-colors focus:outline-none cursor-pointer"
              style={{
                background: range === r.id ? 'var(--theme-hover-bg)' : 'transparent',
                color: range === r.id ? 'var(--theme-primary)' : 'var(--theme-muted)',
                fontWeight: range === r.id ? 500 : 400,
                borderTopLeftRadius: r.id === '7d' ? '7px' : '0px',
                borderBottomLeftRadius: r.id === '7d' ? '7px' : '0px',
                borderTopRightRadius: r.id === 'all' ? '7px' : '0px',
                borderBottomRightRadius: r.id === 'all' ? '7px' : '0px',
              }}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard label="Messages" value={fmt(filtered.messagesCount)} />
        <StatCard
          label="Memories"
          value={fmt(filtered.memories.total)}
          sub={`${fmt(filtered.memories.short)}s / ${fmt(filtered.memories.long)}l / ${fmt(filtered.memories.permanent)}p`}
        />
        <StatCard
          label="Agents Spawned"
          value={fmt(filtered.agents.total)}
          sub={`${filtered.agents.running} running`}
        />
        <StatCard
          label="Total Cost"
          value={`$${filtered.cost.total.toFixed(2)}`}
          color="var(--theme-success)"
          info={{
            title: "API-equivalent cost",
            body: (
              <>
                <p className="mb-1.5">
                  This number is what your token usage <em>would</em> cost at Anthropic API rates.
                </p>
                <p className="mb-1.5">
                  If you're using your <strong>Claude Code subscription</strong> (the default), you're
                  paying a flat monthly rate — not these dollar amounts.
                </p>
                <p>
                  Watch this as a usage-burn proxy (against subscription rate limits) or as a
                  forecast for what API auth would cost.
                </p>
              </>
            ),
          }}
        />
        <StatCard
          label="Tokens"
          value={fmtTokens(filtered.tokens.total)}
          sub={`${fmtTokens(filtered.tokens.input)} in / ${fmtTokens(filtered.tokens.output)} out`}
        />
        <StatCard
          label="Failure Rate"
          value={`${failPct}%`}
          sub={`${filtered.agents.failed} of ${filtered.agents.total}`}
          color={Number(failPct) > 20 ? "var(--theme-danger)" : undefined}
        />
      </div>

      {filtered.dailyBuckets.length > 1 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="rounded-xl border p-4" style={{ background: 'var(--theme-card-bg)', borderColor: 'var(--theme-border)' }}>
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--theme-muted)' }}>
              Cost Over Time
            </h3>
            <StackedAreaChart
              data={filtered.dailyBuckets}
              keys={["agentCost"]}
              colors={["var(--theme-accent)"]}
              labels={["Agents"]}
              format={(v) => `$${v.toFixed(2)}`}
            />
          </div>
          <div className="rounded-xl border p-4" style={{ background: 'var(--theme-card-bg)', borderColor: 'var(--theme-border)' }}>
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--theme-muted)' }}>
              Token Usage Over Time
            </h3>
            <StackedAreaChart
              data={filtered.dailyBuckets}
              keys={["inputTokens", "outputTokens"]}
              colors={["var(--theme-accent)", "var(--theme-success)"]}
              labels={["Input", "Output"]}
              format={fmtTokens}
            />
          </div>
        </div>
      ) : (
        <div className="border rounded-xl p-5 text-center" style={{ background: 'var(--theme-card-bg)', borderColor: 'var(--theme-border)' }}>
          <p className="text-xs" style={{ color: 'var(--theme-muted)' }}>Not enough historical run data to render charts. Runs must span at least 2 distinct calendar days.</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="rounded-xl border p-4" style={{ background: 'var(--theme-card-bg)', borderColor: 'var(--theme-border)' }}>
          <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--theme-muted)' }}>
            Agent Status
          </h3>
          <div className="space-y-2">
            {(
              [
                ["completed", filtered.agents.completed, "bg-emerald-500"],
                ["failed", filtered.agents.failed, "bg-rose-500"],
                ["cancelled", filtered.agents.cancelled, "bg-slate-500"],
              ] as const
            ).map(([label, count, color]) =>
              count > 0 ? (
                <BarRow
                  key={label}
                  label={label}
                  value={count}
                  total={filtered.agents.total}
                  color={color}
                  format={String}
                />
              ) : null,
            )}
            {filtered.agents.total === 0 && (
              <p className="text-xs" style={{ color: 'var(--theme-muted)' }}>
                No agents run yet in this range.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-xl border p-4" style={{ background: 'var(--theme-card-bg)', borderColor: 'var(--theme-border)' }}>
          <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--theme-muted)' }}>
            Token Breakdown
          </h3>
          <div className="space-y-2">
            <BarRow
              label="Input"
              value={filtered.tokens.input}
              total={filtered.tokens.total}
              color="bg-sky-500"
              format={fmtTokens}
            />
            <BarRow
              label="Output"
              value={filtered.tokens.output}
              total={filtered.tokens.total}
              color="bg-emerald-500"
              format={fmtTokens}
            />
          </div>
        </div>
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
  const [busyAction, setBusyAction] = useState<'cancel' | 'delete' | 'retry' | null>(null);
  const [logs, setLogs] = useState<AgentLogEntry[]>([]);

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
  const isActive = selectedAgent ? (selectedAgent.status === 'running' || selectedAgent.status === 'spawned') : false;

  useEffect(() => {
    if (!selectedId) return;
    let active = true;

    const loadLogs = async () => {
      if (convex?.getAgentLogs) {
        const fetchedLogs = await convex.getAgentLogs(selectedId);
        if (active) setLogs(fetchedLogs);
      } else {
        if (active && selectedAgent) setLogs(selectedAgent.logs || []);
      }
    };

    loadLogs();
    if (!isActive) return;

    const interval = setInterval(loadLogs, 2000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [selectedId, isActive, selectedAgent, convex]);

  const cleanupFinished = useCallback(async () => {
    if (cleaning) return;
    const ok = window.confirm("Delete completed, failed, and cancelled agent work from the dashboard?");
    if (!ok) return;
    setCleaning(true);
    try {
      await fetch('/api/agents/cleanup', { method: 'POST' });
    } finally {
      setCleaning(false);
    }
  }, [cleaning]);

  const cancelThisAgent = async () => {
    if (busyAction || !selectedId) return;
    setBusyAction('cancel');
    try {
      const r = await fetch(`/api/agents/${encodeURIComponent(selectedId)}/cancel`, { method: "POST" });
      if (r.ok && convex?.getAgentLogs) {
        const fetchedLogs = await convex.getAgentLogs(selectedId);
        setLogs(fetchedLogs);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setBusyAction(null);
    }
  };

  const deleteThisAgent = async () => {
    if (busyAction || !selectedId) return;
    const ok = window.confirm("Delete this agent work and its logs?");
    if (!ok) return;
    setBusyAction('delete');
    try {
      const r = await fetch(`/api/agents/${encodeURIComponent(selectedId)}`, { method: "DELETE" });
      if (r.ok) {
        setSelectedId(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setBusyAction(null);
    }
  };

  const retryThisAgent = async () => {
    if (busyAction || !selectedId) return;
    setBusyAction('retry');
    try {
      const r = await fetch(`/api/agents/${encodeURIComponent(selectedId)}/retry`, { method: "POST" });
      if (r.ok) {
        const spawned = await r.json();
        if (spawned?.agentId) {
          setSelectedId(spawned.agentId);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setBusyAction(null);
    }
  };

  if (selectedAgent) {
    const cfg = EXEC_STATUS_CONFIG[selectedAgent.status];
    const totalTokens = selectedAgent.inputTokens + selectedAgent.outputTokens;

    return (
      <div className="flex flex-col h-full -m-5 fade-in">
        <div className="shrink-0 border-b px-5 py-3 flex items-center gap-3 backdrop-blur-sm" style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-header-bg)' }}>
          <button
            onClick={() => setSelectedId(null)}
            className="text-xs rounded-md px-2.5 py-1 transition-colors"
            style={{ color: 'var(--theme-text-muted)', background: 'var(--theme-border)' }}
          >
            ← Back
          </button>
          <span className="relative flex h-2.5 w-2.5">
            {isActive && <span className={`absolute inline-flex h-full w-full rounded-full ${cfg.dot} animate-ping opacity-75`} />}
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${cfg.dot}`} />
          </span>
          <span className="text-sm font-medium" style={{ color: 'var(--theme-text)' }}>{selectedAgent.name}</span>
          <span className={`text-xs ${cfg.color}`}>{cfg.label}</span>
          <div className="ml-auto flex items-center gap-3 text-xs">
            {isActive && (
              <button
                onClick={cancelThisAgent}
                disabled={busyAction !== null}
                className="rounded-md px-2.5 py-1 text-xs transition-colors disabled:opacity-50"
                style={{ background: 'var(--theme-danger)', color: 'white' }}
                title="Cancel this running agent"
              >
                {busyAction === 'cancel' ? 'Cancelling...' : 'Cancel'}
              </button>
            )}
            {!isActive && (
              <>
                <button
                  onClick={retryThisAgent}
                  disabled={busyAction !== null}
                  className="rounded-md px-2.5 py-1 text-xs transition-colors disabled:opacity-50"
                  style={{ background: 'var(--theme-border)', color: 'var(--theme-text)' }}
                  title="Retry this agent task"
                >
                  {busyAction === 'retry' ? 'Retrying...' : 'Retry'}
                </button>
                <button
                  onClick={deleteThisAgent}
                  disabled={busyAction !== null}
                  className="rounded-md px-2.5 py-1 text-xs transition-colors disabled:opacity-50"
                  style={{ background: 'var(--theme-border)', color: 'var(--theme-danger)' }}
                  title="Delete this agent work"
                >
                  {busyAction === 'delete' ? 'Deleting...' : 'Delete'}
                </button>
              </>
            )}
            {selectedAgent.costUsd > 0 && <span className="text-emerald-400 font-semibold">${selectedAgent.costUsd.toFixed(4)}</span>}
            {totalTokens > 0 && <span style={{ color: 'var(--theme-text-muted)' }}>{(totalTokens / 1000).toFixed(1)}k tok</span>}
          </div>
        </div>

        <div className="shrink-0 p-4 pb-2">
          <div className="rounded-xl border px-4 py-3 shadow-lg" style={{ background: 'var(--theme-card-bg)', borderColor: 'var(--theme-border)' }}>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-sky-400 shrink-0" />
              <span className="text-[10px] font-bold tracking-wider text-sky-400">REQUEST</span>
            </div>
            <p className="text-xs whitespace-pre-wrap break-words mt-2" style={{ color: 'var(--theme-text)' }}>{selectedAgent.task}</p>
          </div>
        </div>

        {selectedAgent.integrations.length > 0 && (
          <div className="shrink-0 px-4 pb-2">
            <div className="rounded-xl border px-4 py-2.5" style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-card-bg)' }}>
              <span className="text-[10px] font-bold tracking-wider" style={{ color: 'var(--theme-text-muted)' }}>INTEGRATIONS</span>
              <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                {selectedAgent.integrations.map((name) => (
                  <span key={name} className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium" style={{ background: 'var(--theme-border)', color: 'var(--theme-text)' }}>
                    <IntegrationLogo raw={name} size={14} />
                    {name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-5 debug-scroll">
          {logs.length === 0 ? (
            <div className="flex items-center gap-3 py-4">
              <Loader2 size={14} className="animate-spin text-sky-400" />
              <span className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>{isActive ? 'Waiting for activity…' : 'No logs recorded'}</span>
            </div>
          ) : (
            <div className="space-y-0">
              {logs.map((log, index) => (
                <TimelineRow key={log.createdAt + '-' + index} log={log} isLast={index === logs.length - 1} />
              ))}
            </div>
          )}
        </div>

        {selectedAgent.result && (
          <div className="sticky bottom-0 p-4 pt-2">
            <div className="rounded-xl border px-4 py-3 shadow-lg" style={{ background: 'var(--theme-card-bg)', borderColor: 'var(--theme-border)' }}>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                <span className="text-[10px] font-bold tracking-wider text-emerald-400">RESPONSE</span>
              </div>
              <p className="text-xs whitespace-pre-wrap break-words mt-2" style={{ color: 'var(--theme-text)' }}>{selectedAgent.result}</p>
            </div>
          </div>
        )}

        {selectedAgent.error && (
          <div className="sticky bottom-0 p-4 pt-2">
            <div className="rounded-xl border px-4 py-3 shadow-lg" style={{ background: 'var(--theme-card-bg)', borderColor: 'var(--theme-border)' }}>
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
        <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--theme-text-muted)' }}>Agents</h2>
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
            className="px-2.5 py-1 text-xs rounded-md transition-colors disabled:opacity-50 hover:bg-[var(--theme-border)]/40"
            style={{ color: 'var(--theme-text-muted)' }}
          >
            {cleaning ? 'Cleaning...' : 'Cleanup'}
          </button>
          {(['all', 'running', 'completed', 'failed'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className="px-2.5 py-1 text-xs rounded-md capitalize transition-colors"
              style={{
                background: statusFilter === status ? 'var(--theme-border)' : 'transparent',
                color: statusFilter === status ? 'var(--theme-text)' : 'var(--theme-text-muted)',
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
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--theme-text-muted)' }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search agents..."
            className="w-full border rounded-lg pl-7 pr-2 py-1.5 text-[11px] focus:outline-none"
            style={{ background: 'var(--theme-bg-input)', borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pt-2 space-y-3 debug-scroll">
        {filtered.length === 0 ? (
          <p className="text-sm py-8 text-center" style={{ color: 'var(--theme-text-muted)' }}>
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
                className="border rounded-xl p-4 cursor-pointer transition-all duration-150 fade-in hover:bg-[var(--theme-border)]/20"
                style={{ background: 'var(--theme-card-bg)', borderColor: 'var(--theme-border)' }}
              >
                <div className="flex items-center gap-2.5 mb-1.5">
                  <span className="relative flex h-2.5 w-2.5 shrink-0">
                    {isActive && <span className={`absolute inline-flex h-full w-full rounded-full ${cfg.dot} animate-ping opacity-75`} />}
                    <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${cfg.dot}`} />
                  </span>
                  <span className="text-sm font-medium truncate" style={{ color: 'var(--theme-text)' }}>{agent.name}</span>
                  <span className={`flex items-center gap-2 text-xs ml-auto ${cfg.color}`}>{cfg.label}</span>
                </div>

                <p className="text-xs truncate mb-2" style={{ color: 'var(--theme-text-muted)' }}>
                  {agent.status === 'completed'
                    ? agent.result?.slice(0, 120)
                    : agent.status === 'failed'
                      ? agent.error?.slice(0, 120)
                      : agent.task.slice(0, 120)}
                </p>

                {(agent.costUsd > 0 || totalTokens > 0) && (
                  <div className="flex items-center gap-3 text-[10px] mb-2">
                    {agent.costUsd > 0 && <span className="text-emerald-400 font-semibold">${agent.costUsd.toFixed(4)}</span>}
                    {totalTokens > 0 && <span style={{ color: 'var(--theme-text-muted)' }}>{(totalTokens / 1000).toFixed(1)}k tok</span>}
                    <span style={{ color: 'var(--theme-text-muted)' }}>{elapsed.toFixed(1)}s</span>
                  </div>
                )}

                {agent.integrations.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {agent.integrations.map((name) => (
                      <span key={name} className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] rounded-md" style={{ background: 'var(--theme-border)', color: 'var(--theme-text)' }}>
                        <IntegrationLogo raw={name} size={14} />
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

function TimelineRow({
  log,
  isLast,
}: {
  log: AgentLogEntry;
  isLast: boolean;
}) {
  const isToolUse = log.logType === "tool_use";
  const isToolResult = log.logType === "tool_result";
  const isError = log.logType === "error";

  const dotColor = isToolUse
    ? "bg-sky-400"
    : isError
      ? "bg-rose-400"
      : "bg-[var(--theme-border)]";

  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center shrink-0 w-5">
        <div className="mt-1.5">
          {isToolUse ? (
            <IntegrationLogo raw={log.toolName} size={20} />
          ) : (
            <span
              className={`block w-2.5 h-2.5 rounded-full ${dotColor}`}
              style={{ marginLeft: "3.75px" }}
            />
          )}
        </div>
        {!isLast && (
          <div
            className="flex-1 w-px mt-1"
            style={{ background: 'var(--theme-border)' }}
          />
        )}
      </div>
      <div className="flex-1 min-w-0 pb-4">
        <div className="flex items-center gap-2 mb-0.5">
          <span
            className="text-[10px] font-bold tracking-wider"
            style={{
              color: isToolUse
                ? 'var(--theme-accent, #38bdf8)'
                : isError
                  ? 'var(--theme-danger, #f43f5e)'
                  : 'var(--theme-text-muted, #94a3b8)'
            }}
          >
            {isToolUse ? "TOOL" : isError ? "ERROR" : isToolResult ? "RESPONSE" : "TEXT"}
          </span>
          {isToolUse && log.toolName && (
            <span className="text-xs font-medium text-sky-300">
              {prettyToolName(log.toolName)}
            </span>
          )}
          {isToolUse && (log as any).accounts && (log as any).accounts.length > 0 && (
            <span
              className="text-[9px] font-mono px-1.5 py-px rounded bg-[var(--theme-border)] border border-[var(--theme-border)] text-[var(--theme-text-muted)]"
              title="Composio account(s) targeted by this call"
            >
              {(log as any).accounts.join(", ")}
            </span>
          )}
          <span className="text-[9px] ml-auto" style={{ color: 'var(--theme-text-muted)' }}>
            {new Date(log.createdAt).toLocaleTimeString()}
          </span>
        </div>
        <p
          className="text-xs whitespace-pre-wrap break-words"
          style={{
            color: isError
              ? 'var(--theme-danger, #f43f5e)'
              : isToolUse
                ? 'var(--theme-accent, #38bdf8)'
                : 'var(--theme-text, #e2e8f0)'
          }}
        >
          {log.content.slice(0, 600)}
        </p>
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

const RUN_STATUS_COLOR: Record<string, { dot: string; text: string }> = {
  running: { dot: "bg-sky-400 animate-pulse", text: "text-sky-400" },
  completed: { dot: "bg-emerald-400", text: "text-emerald-400" },
  failed: { dot: "bg-rose-400", text: "text-rose-400" },
};

function AutomationDetail({
  automationId,
  onBack,
  convex,
}: {
  automationId: string;
  onBack: () => void;
  convex?: LuminaAgentPanelProps['convex'];
}) {
  const auto = convex?.automations?.find((a: any) => a.automationId === automationId);
  const [runs, setRuns] = useState<any[] | undefined>(undefined);

  useEffect(() => {
    if (!convex?.getAutomationRuns) return;
    let active = true;

    const loadRuns = async () => {
      const fetchedRuns = await convex.getAutomationRuns!(automationId);
      if (active) setRuns(fetchedRuns);
    };

    loadRuns();
    const interval = setInterval(loadRuns, 3000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [automationId, convex]);

  if (!auto) {
    return (
      <div className="p-5">
        <div className="h-20 rounded-xl shimmer" style={{ background: 'var(--theme-card-bg)' }} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full -m-5 fade-in">
      <div className="shrink-0 border-b px-5 py-3 flex items-center gap-3 backdrop-blur-sm" style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-header-bg)' }}>
        <button
          onClick={onBack}
          className="text-xs rounded-md px-2.5 py-1 transition-colors cursor-pointer"
          style={{ color: 'var(--theme-text-muted)', background: 'var(--theme-border)' }}
        >
          ← Back
        </button>

        <button
          onClick={() => {
            if (convex?.toggleAutomation) {
              convex.toggleAutomation(auto.automationId, !auto.enabled);
            }
          }}
          className={`relative inline-flex items-center w-9 h-5 rounded-full transition-colors shrink-0 cursor-pointer ${
            auto.enabled ? "bg-emerald-500" : "bg-slate-700"
          }`}
        >
          <span
            className={`inline-block w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-transform ${
              auto.enabled ? "translate-x-[18px]" : "translate-x-[3px]"
            }`}
          />
        </button>

        <span className="text-sm font-medium" style={{ color: 'var(--theme-text)' }}>
          {auto.name}
        </span>

        <span
          className="text-[10px] px-1.5 py-0.5 rounded border font-medium"
          style={{
            color: 'var(--theme-accent, #38bdf8)',
            backgroundColor: 'var(--theme-border)',
            borderColor: 'var(--theme-border)',
          }}
        >
          Scheduled
        </span>

        <span className="text-xs ml-auto font-mono" style={{ color: 'var(--theme-text-muted)' }}>
          {auto.schedule}
        </span>

        <button
          onClick={() => {
            if (window.confirm(`Delete automation "${auto.name}"?`)) {
              if (convex?.deleteAutomation) {
                convex.deleteAutomation(auto.automationId);
              }
              onBack();
            }
          }}
          className="text-[11px] text-rose-500 hover:text-rose-400 font-medium cursor-pointer"
        >
          Delete
        </button>
      </div>

      <div className="shrink-0 border-b px-5 py-3 space-y-2" style={{ borderColor: 'var(--theme-border)' }}>
        <div>
          <span className="text-[10px] font-bold font-mono" style={{ color: 'var(--theme-text-muted)' }}>
            TASK{" "}
          </span>
          <span className="text-xs" style={{ color: 'var(--theme-text)' }}>
            {auto.task}
          </span>
        </div>
        {auto.integrations && auto.integrations.length > 0 && (
          <div>
            <span className="text-[10px] font-bold font-mono" style={{ color: 'var(--theme-text-muted)' }}>
              INTEGRATIONS{" "}
            </span>
            <div className="flex items-center gap-1.5 flex-wrap mt-1">
              {auto.integrations.map((name: string) => (
                <span key={name} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] font-medium" style={{ background: 'var(--theme-border)', color: 'var(--theme-text)' }}>
                  <IntegrationLogo raw={name} size={12} />
                  {name}
                </span>
              ))}
            </div>
          </div>
        )}
        {auto.nextRunAt && auto.enabled && (
          <div>
            <span className="text-[10px] font-bold font-mono" style={{ color: 'var(--theme-text-muted)' }}>
              NEXT RUN{" "}
            </span>
            <span className="text-xs font-mono" style={{ color: 'var(--theme-text)' }}>
              {new Date(auto.nextRunAt).toLocaleString()}
            </span>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto debug-scroll">
        <div className="px-5 py-2 border-b" style={{ borderColor: 'var(--theme-border)' }}>
          <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--theme-text-muted)' }}>
            Run History ({runs?.length ?? 0})
          </span>
        </div>

        {runs === undefined ? (
          <div className="p-5 space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 rounded shimmer" style={{ background: 'var(--theme-card-bg)' }} />
            ))}
          </div>
        ) : runs.length === 0 ? (
          <p className="text-sm text-center py-8" style={{ color: 'var(--theme-text-muted)' }}>
            No runs yet
          </p>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--theme-border)' }}>
            {runs.map((run: any) => {
              const color = RUN_STATUS_COLOR[run.status] ?? RUN_STATUS_COLOR.running;
              return (
                <div
                  key={run.runId}
                  className="px-5 py-2.5 hover:bg-[var(--theme-border)]/20"
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${color.dot}`} />
                    <span className={`text-[10px] font-bold font-mono w-20 shrink-0 capitalize ${color.text}`}>
                      {run.status}
                    </span>
                    <span className="text-xs flex-1 truncate" style={{ color: 'var(--theme-text)' }}>
                      {run.result
                        ? run.result.slice(0, 120)
                        : run.error
                          ? run.error.slice(0, 120)
                          : "—"}
                    </span>
                    <span className="text-[10px] font-mono shrink-0" style={{ color: 'var(--theme-text-muted)' }}>
                      {run.startedAt ? timeAgo(run.startedAt) : ""}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function AutomationsPanel({ convex }: {
  convex?: LuminaAgentPanelProps['convex'];
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  
  const automations = convex?.automations ?? [];
  const enabledCount = automations.filter((a: any) => a.enabled).length;

  if (selectedId) {
    return (
      <AutomationDetail
        automationId={selectedId}
        onBack={() => setSelectedId(null)}
        convex={convex}
      />
    );
  }

  return (
    <div className="flex flex-col h-full -m-5">
      <div className="shrink-0 border-b px-5 py-3 flex items-center gap-3 backdrop-blur-sm" style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-header-bg)' }}>
        <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--theme-text-muted)' }}>
          Automations
        </h2>
        <span className="text-xs font-mono" style={{ color: 'var(--theme-text-muted)' }}>
          {enabledCount} enabled / {automations.length} total
        </span>
      </div>

      <div className="flex-1 overflow-y-auto debug-scroll p-4 space-y-3">
        {convex?.automations === undefined ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 rounded-xl border shimmer" style={{ background: 'var(--theme-card-bg)', borderColor: 'var(--theme-border)' }} />
            ))}
          </div>
        ) : automations.length === 0 ? (
          <p className="text-sm py-8 text-center" style={{ color: 'var(--theme-text-muted)' }}>
            No automations yet. Text the agent: <em>"every morning at 8, summarize my calendar"</em>.
          </p>
        ) : (
          automations.map((auto: any) => (
            <div
              key={auto.automationId}
              className="border rounded-xl p-4 cursor-pointer transition-all duration-150 fade-in hover:bg-[var(--theme-border)]/20"
              style={{ background: 'var(--theme-card-bg)', borderColor: 'var(--theme-border)' }}
              onClick={() => setSelectedId(auto.automationId)}
            >
              <div className="flex items-center gap-2.5 mb-1.5">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (convex?.toggleAutomation) {
                      convex.toggleAutomation(auto.automationId, !auto.enabled);
                    }
                  }}
                  className={`relative inline-flex items-center w-9 h-5 rounded-full transition-colors shrink-0 cursor-pointer ${
                    auto.enabled ? "bg-emerald-500" : "bg-slate-700"
                  }`}
                >
                  <span
                    className={`inline-block w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-transform ${
                      auto.enabled ? "translate-x-[18px]" : "translate-x-[3px]"
                    }`}
                  />
                </button>

                <span
                  className="text-sm font-medium truncate"
                  style={{
                    color: 'var(--theme-text)',
                    opacity: !auto.enabled ? 0.5 : 1,
                  }}
                >
                  {auto.name}
                </span>

                <span
                  className="text-[10px] px-1.5 py-0.5 rounded border font-medium"
                  style={{
                    color: 'var(--theme-accent, #38bdf8)',
                    backgroundColor: 'var(--theme-border)',
                    borderColor: 'var(--theme-border)',
                  }}
                >
                  Scheduled
                </span>

                <span className="text-xs ml-auto font-mono" style={{ color: 'var(--theme-text-muted)' }}>
                  {auto.schedule}
                </span>
              </div>

              <p
                className="text-xs truncate mb-2 ml-[46px]"
                style={{
                  color: 'var(--theme-text-muted)',
                  opacity: !auto.enabled ? 0.5 : 1,
                }}
              >
                {auto.task}
              </p>

              <div
                className="flex items-center gap-3 ml-[46px] text-[10px] font-mono"
                style={{ color: 'var(--theme-text-muted)' }}
              >
                {auto.lastRunAt && <span>Last run: {timeAgo(auto.lastRunAt)}</span>}
                {auto.nextRunAt && auto.enabled && (
                  <span>
                    Next:{" "}
                    {new Date(auto.nextRunAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                )}
                {auto.integrations && auto.integrations.length > 0 && (
                  <span className="flex items-center gap-1.5 ml-auto">
                    {auto.integrations.map((name: string) => (
                      <span key={name} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md" style={{ background: 'var(--theme-border)', color: 'var(--theme-text)' }}>
                        <IntegrationLogo raw={name} size={12} />
                      </span>
                    ))}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
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
      content = (
        <DashboardPanel
          agents={agents}
          orchestrationState={orchestrationState}
          execAgents={execAgents}
          memories={convex?.memories}
          events={convex?.events}
        />
      );
      break;
    case 'agents':
      content = <AgentsPanel execAgents={execAgents} convex={convex} />;
      break;
    case 'memory':
      content = <LuminaMemoryPanelInner agents={agents} convex={convex} />;
      break;
    case 'automations':
      content = <AutomationsPanel convex={convex} />;
      break;
    case 'events':
      content = <EventsPanel convex={convex as any} />;
      break;
    case 'consolidation':
      content = <ConsolidationPanel convex={convex as any} />;
      break;
    case 'logs':
      content = <StubPanel title="Traffic Logs" description="Traffic logs are still available, and this section now sits inside the same dashboard shell." />;
      break;
    case 'settings':
      content = <SettingsPanel convex={convex as any} />;
      break;
    default:
      content = null;
  }

  return (
    <PanelShell
      title="Lumina Agent"
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

type Tier = "all" | "short" | "long" | "permanent";
type Segment = "all" | "identity" | "preference" | "correction" | "relationship" | "project" | "knowledge" | "context";
type ViewMode = "table" | "graph";

const TIER_OPTIONS: { value: Tier; label: string }[] = [
  { value: "all", label: "All" },
  { value: "short", label: "Short" },
  { value: "long", label: "Long" },
  { value: "permanent", label: "Permanent" },
];

const SEGMENT_OPTIONS: Segment[] = [
  "all",
  "identity",
  "preference",
  "correction",
  "relationship",
  "project",
  "knowledge",
  "context",
];

const TIER_BADGE: Record<string, { dark: string; light: string }> = {
  short: {
    dark: "text-sky-400 bg-sky-400/10 border-sky-500/20",
    light: "text-sky-600 bg-sky-50 border-sky-200",
  },
  long: {
    dark: "text-violet-400 bg-violet-400/10 border-violet-500/20",
    light: "text-violet-600 bg-violet-50 border-violet-200",
  },
  permanent: {
    dark: "text-amber-400 bg-amber-400/10 border-amber-500/20",
    light: "text-amber-600 bg-amber-50 border-amber-200",
  },
};

const SEGMENT_COLOR: Record<string, { dark: string; light: string }> = {
  identity: { dark: "text-rose-400", light: "text-rose-600" },
  preference: { dark: "text-teal-400", light: "text-teal-600" },
  correction: { dark: "text-red-400", light: "text-red-600" },
  relationship: { dark: "text-pink-400", light: "text-pink-600" },
  project: { dark: "text-orange-400", light: "text-orange-600" },
  knowledge: { dark: "text-blue-400", light: "text-blue-600" },
  context: { dark: "text-slate-400", light: "text-slate-500" },
};

function LuminaMemoryPanelInner({
  agents,
  convex,
}: {
  agents: Agent[];
  convex?: any;
}) {
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [tierFilter, setTierFilter] = useState<Tier>("all");
  const [segmentFilter, setSegmentFilter] = useState<Segment>("all");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const allRecords = convex?.memories ?? [];
  const filtered = allRecords.filter((r: any) => {
    if (r.lifecycle !== "active") return false;
    if (tierFilter !== "all" && r.tier !== tierFilter) return false;
    if (segmentFilter !== "all" && r.segment !== segmentFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        (r.content ?? "").toLowerCase().includes(q) ||
        (r.memoryId ?? "").toLowerCase().includes(q) ||
        (r.segment ?? "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  const isDark = true;
  const btnActive = "bg-[var(--theme-border)] text-[var(--theme-text)] font-medium";
  const btnInactive = "text-[var(--theme-text-muted)] hover:text-[var(--theme-text)] hover:bg-[var(--theme-border)]/40";

  return (
    <div className="flex flex-col h-full -m-5 bg-[var(--theme-bg)]">
      <EmbeddingBanner isDark={isDark} />

      {/* Toolbar */}
      <div className="shrink-0 border-b border-[var(--theme-border)] px-5 py-3 flex flex-wrap items-center gap-3">
        <div className="flex items-center rounded-md border border-[var(--theme-border)] bg-[var(--theme-bg-input)]">
          {(["table", "graph"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-3 py-1 text-xs capitalize transition-colors ${
                viewMode === mode ? btnActive : btnInactive
              } ${mode === "table" ? "rounded-l-md" : "rounded-r-md"}`}
            >
              {mode}
            </button>
          ))}
        </div>

        {viewMode === "table" && (
          <>
            <div className="flex items-center gap-1">
              {TIER_OPTIONS.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setTierFilter(t.value)}
                  className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                    tierFilter === t.value ? btnActive : btnInactive
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <select
              value={segmentFilter}
              onChange={(e) => setSegmentFilter(e.target.value as Segment)}
              className="text-xs rounded-md px-2.5 py-1.5 focus:outline-none border border-[var(--theme-border)] bg-[var(--theme-bg-input)] text-[var(--theme-text)]"
            >
              {SEGMENT_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s === "all" ? "All segments" : s}
                </option>
              ))}
            </select>

            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search memories…"
              className="flex-1 min-w-[200px] text-xs rounded-md px-3 py-1.5 focus:outline-none border border-[var(--theme-border)] bg-[var(--theme-bg-input)] text-[var(--theme-text)] placeholder:text-[var(--theme-text-muted)]"
            />

            <span className="text-xs font-mono text-[var(--theme-text-muted)]">
              {filtered.length}/{allRecords.length}
            </span>
          </>
        )}
      </div>

      {viewMode === "graph" && (
        <div className="flex-1 min-h-0">
          <React.Suspense fallback={
            <div className="flex flex-col items-center justify-center h-full text-xs text-[var(--theme-text-muted)] gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-[var(--theme-text-muted)]" />
              <span>Loading memory graph...</span>
            </div>
          }>
            <MemoryGraphView records={allRecords as any} isDark={isDark} />
          </React.Suspense>
        </div>
      )}

      {viewMode === "table" && (
        <div className="flex-1 overflow-y-auto debug-scroll">
          {allRecords.length === 0 ? (
            <p className="text-sm text-center py-12 text-[var(--theme-text-muted)]">
              No memories found. Start chatting with the agent to create memories.
            </p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-center py-12 text-[var(--theme-text-muted)]">
              No records match your filters
            </p>
          ) : (
            <div className="divide-y divide-[var(--theme-border)]/40">
              {filtered.map((r: any) => {
                const isExpanded = expandedId === r.memoryId;
                const tierBadge = TIER_BADGE[r.tier] ?? { dark: "", light: "" };
                const segColor =
                  SEGMENT_COLOR[r.segment] ?? {
                    dark: "text-slate-400",
                    light: "text-slate-500",
                  };

                return (
                  <div
                    key={r.memoryId}
                    className="px-5 py-3 cursor-pointer transition-colors hover:bg-[var(--theme-border)]/20"
                    onClick={() =>
                      setExpandedId(isExpanded ? null : r.memoryId)
                    }
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${
                          isDark ? tierBadge.dark : tierBadge.light
                        }`}
                      >
                        {r.tier}
                      </span>
                      <span
                        className={`text-[10px] font-semibold ${
                          isDark ? segColor.dark : segColor.light
                        }`}
                      >
                        {r.segment}
                      </span>
                      <span className="text-[10px] font-mono ml-auto text-[var(--theme-text-muted)]">
                        {(r.importance ?? 0).toFixed(2)}
                      </span>
                      <span className="text-[10px] font-mono text-[var(--theme-text-muted)]">
                        {r.accessCount ?? 0}x
                      </span>
                    </div>

                    <p className={`text-sm ${isExpanded ? "" : "line-clamp-2"} text-[var(--theme-text)]`}>
                      {r.content}
                    </p>

                    {isExpanded && (
                      <div className="mt-3 space-y-2 text-xs opacity-90 transition-all">
                        <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-[var(--theme-text-muted)]">
                          <div>
                            ID:{" "}
                            <span className="font-mono text-[var(--theme-text)]">
                              {r.memoryId}
                            </span>
                          </div>
                          <div>
                            Decay:{" "}
                            <span className="font-mono text-[var(--theme-text)]">
                              {r.decayRate}
                            </span>
                          </div>
                          {r.sourceTurn && (
                            <div>
                              Turn:{" "}
                              <span className="font-mono text-[var(--theme-text)]">
                                {r.sourceTurn}
                              </span>
                            </div>
                          )}
                          <div>
                            Last accessed:{" "}
                            <span className="text-[var(--theme-text)]">
                              {new Date(r.lastAccessedAt).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
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
      <LuminaMemoryPanelInner agents={agents} convex={convex} />
    </PanelShell>
  );
}
