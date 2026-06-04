import { useState, useEffect, useCallback, useMemo } from 'react';

// ─── Types ──────────────────────────────────────────────────────────────────────
export type ExecAgentStatus = 'spawned' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface AgentLogEntry {
  agentId: string;
  logType: 'thinking' | 'tool_use' | 'tool_result' | 'text' | 'error';
  toolName?: string;
  content: string;
  createdAt: number;
}

export interface ExecutionAgent {
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
}

export interface MemoryRecord {
  memoryId: string;
  content: string;
  tier: 'short' | 'long' | 'permanent';
  segment: 'identity' | 'preference' | 'correction' | 'relationship' | 'project' | 'knowledge' | 'context';
  importance: number;
  decayRate: number;
  accessCount: number;
  lastAccessedAt: number;
  lifecycle: 'active' | 'archived' | 'pruned';
  source: string;
  agentId?: string;
  createdAt: number;
}

export interface Automation {
  automationId: string;
  name: string;
  task: string;
  integrations: string[];
  schedule: string;
  enabled: boolean;
  lastRunAt?: number;
  nextRunAt?: number;
  createdAt: number;
}

export interface ActivityEvent {
  eventType: string;
  source: string;
  message: string;
  metadata?: Record<string, string>;
  createdAt: number;
}

export interface DashboardMetrics {
  messages: { count: number };
  memories: { total: number; byTier: { short: number; long: number; permanent: number } };
  agents: { total: number; spawned: number; running: number; completed: number; failed: number; cancelled: number };
  automations: { total: number; completed: number; failed: number; running: number };
  cost: { total: number };
  tokens: { total: number };
}

// ─── Storage helpers ────────────────────────────────────────────────────────────
function load<T>(key: string, fallback: T): T {
  try { const r = localStorage.getItem(key); if (r) return JSON.parse(r); } catch {} return fallback;
}
function save<T>(key: string, data: T) { localStorage.setItem(key, JSON.stringify(data)); }
function genId(p: string) { return `${p}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`; }

// ─── Convex API helper (fetch-based) ───────────────────────────────────────────
const CONVEX_URL_KEY = 'convex_vite_url';

async function convexQuery(tableName: string, indexName?: string, indexField?: string, fieldValue?: any): Promise<any[]> {
  const url = localStorage.getItem(CONVEX_URL_KEY);
  if (!url) return [];
  // Use the Convex HTTP API for queries
  try {
    const res = await fetch(`${url}/api/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: `${tableName}:list`,
        args: {},
      }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.value ?? [];
  } catch { return []; }
}

async function convexMutation(path: string, args: Record<string, any>): Promise<any> {
  const url = localStorage.getItem(CONVEX_URL_KEY);
  if (!url) return null;
  try {
    const res = await fetch(`${url}/api/mutation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, args }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.value;
  } catch { return null; }
}

// ─── Hook ───────────────────────────────────────────────────────────────────────
export function useLuminaConvex() {
  const isConvexConnected = useMemo(() => {
    return typeof window !== 'undefined' && !!localStorage.getItem(CONVEX_URL_KEY);
  }, []);

  // ─── Agents ────────────────────────────────────────────────────────────────
  const [agents, setAgents] = useState<ExecutionAgent[]>(() => load('lumina_exec_agents', []));

  useEffect(() => {
    if (!isConvexConnected) save('lumina_exec_agents', agents);
  }, [agents, isConvexConnected]);

  const addAgent = useCallback(async (agent: ExecutionAgent) => {
    if (isConvexConnected) {
      await convexMutation('agents:create', {
        agentId: agent.agentId,
        name: agent.name,
        task: agent.task,
        integrations: agent.integrations,
      });
    }
    setAgents(prev => [agent, ...prev]);
  }, [isConvexConnected]);

  const patchAgent = useCallback(async (agentId: string, patch: Partial<ExecutionAgent>) => {
    if (isConvexConnected) {
      await convexMutation('agents:update', { agentId, ...patch });
    }
    setAgents(prev => prev.map(a => a.agentId === agentId ? { ...a, ...patch } : a));
  }, [isConvexConnected]);

  const deleteAgent = useCallback(async (agentId: string) => {
    if (isConvexConnected) {
      await convexMutation('agents:remove', { agentId });
    }
    setAgents(prev => prev.filter(a => a.agentId !== agentId));
  }, [isConvexConnected]);

  const addLog = useCallback(async (agentId: string, logType: AgentLogEntry['logType'], content: string, toolName?: string) => {
    const log: AgentLogEntry = { agentId, logType, content, toolName, createdAt: Date.now() };
    if (isConvexConnected) {
      await convexMutation('agents:addLog', { agentId, logType, content, toolName });
    }
    setAgents(prev => prev.map(a => a.agentId === agentId ? { ...a, logs: [...a.logs, log] } : a));
  }, [isConvexConnected]);

  // ─── Memory ────────────────────────────────────────────────────────────────
  const [memories, setMemories] = useState<MemoryRecord[]>(() => load('lumina_memory_records', []));

  useEffect(() => {
    if (!isConvexConnected) save('lumina_memory_records', memories);
  }, [memories, isConvexConnected]);

  const addMemory = useCallback(async (mem: MemoryRecord) => {
    if (isConvexConnected) {
      await convexMutation('memory:create', {
        memoryId: mem.memoryId, content: mem.content, tier: mem.tier,
        segment: mem.segment, source: mem.source, agentId: mem.agentId,
      });
    }
    setMemories(prev => [mem, ...prev]);
  }, [isConvexConnected]);

  const patchMemory = useCallback(async (memoryId: string, patch: Partial<MemoryRecord>) => {
    if (isConvexConnected) {
      await convexMutation('memory:update', { memoryId, ...patch });
    }
    setMemories(prev => prev.map(m => m.memoryId === memoryId ? { ...m, ...patch } : m));
  }, [isConvexConnected]);

  const deleteMemory = useCallback(async (memoryId: string) => {
    if (isConvexConnected) {
      await convexMutation('memory:remove', { memoryId });
    }
    setMemories(prev => prev.filter(m => m.memoryId !== memoryId));
  }, [isConvexConnected]);

  const recallMemory = useCallback(async (memoryId: string) => {
    if (isConvexConnected) {
      await convexMutation('memory:markAccessed', { memoryId });
    }
    setMemories(prev => prev.map(m => m.memoryId === memoryId ? {
      ...m, importance: Math.min(1, m.importance + 0.1), lastAccessedAt: Date.now(), accessCount: m.accessCount + 1,
    } : m));
  }, [isConvexConnected]);

  // ─── Automations ───────────────────────────────────────────────────────────
  const [automations, setAutomations] = useState<Automation[]>(() => load('lumina_automations', []));

  useEffect(() => {
    if (!isConvexConnected) save('lumina_automations', automations);
  }, [automations, isConvexConnected]);

  const addAutomation = useCallback(async (auto: Automation) => {
    if (isConvexConnected) {
      await convexMutation('automations:create', {
        automationId: auto.automationId, name: auto.name, task: auto.task,
        integrations: auto.integrations, schedule: auto.schedule,
      });
    }
    setAutomations(prev => [auto, ...prev]);
  }, [isConvexConnected]);

  const patchAutomation = useCallback(async (automationId: string, patch: Partial<Automation>) => {
    if (isConvexConnected) {
      await convexMutation('automations:update', { automationId, ...patch });
    }
    setAutomations(prev => prev.map(a => a.automationId === automationId ? { ...a, ...patch } : a));
  }, [isConvexConnected]);

  const toggleAutomation = useCallback(async (automationId: string, enabled: boolean) => {
    if (isConvexConnected) {
      await convexMutation('automations:setEnabled', { automationId, enabled });
    }
    setAutomations(prev => prev.map(a => a.automationId === automationId ? { ...a, enabled } : a));
  }, [isConvexConnected]);

  const deleteAutomation = useCallback(async (automationId: string) => {
    if (isConvexConnected) {
      await convexMutation('automations:remove', { automationId });
    }
    setAutomations(prev => prev.filter(a => a.automationId !== automationId));
  }, [isConvexConnected]);

  // ─── Events ────────────────────────────────────────────────────────────────
  const [events, setEvents] = useState<ActivityEvent[]>(() => load('lumina_activity_events', []));

  useEffect(() => {
    if (!isConvexConnected) save('lumina_activity_events', events);
  }, [events, isConvexConnected]);

  const addEvent = useCallback(async (eventType: string, source: string, message: string, metadata?: Record<string, string>) => {
    const event: ActivityEvent = { eventType, source, message, metadata, createdAt: Date.now() };
    if (isConvexConnected) {
      await convexMutation('events:log', { eventType, source, message, metadata });
    }
    setEvents(prev => [event, ...prev].slice(0, 500));
  }, [isConvexConnected]);

  const deleteEvent = useCallback(async (idx: number) => {
    setEvents(prev => prev.filter((_, i) => i !== idx));
  }, []);

  const clearAllEvents = useCallback(async () => {
    if (isConvexConnected) {
      await convexMutation('events:clearAll', {});
    }
    setEvents([]);
  }, [isConvexConnected]);

  // ─── Dashboard Metrics ─────────────────────────────────────────────────────
  const metrics: DashboardMetrics = useMemo(() => ({
    messages: { count: events.length },
    memories: {
      total: memories.filter(m => m.lifecycle === 'active').length,
      byTier: {
        short: memories.filter(m => m.tier === 'short' && m.lifecycle === 'active').length,
        long: memories.filter(m => m.tier === 'long' && m.lifecycle === 'active').length,
        permanent: memories.filter(m => m.tier === 'permanent' && m.lifecycle === 'active').length,
      },
    },
    agents: {
      total: agents.length,
      spawned: agents.filter(a => a.status === 'spawned').length,
      running: agents.filter(a => a.status === 'running').length,
      completed: agents.filter(a => a.status === 'completed').length,
      failed: agents.filter(a => a.status === 'failed').length,
      cancelled: agents.filter(a => a.status === 'cancelled').length,
    },
    automations: {
      total: automations.length,
      completed: 0,
      failed: 0,
      running: 0,
    },
    cost: { total: agents.reduce((s, a) => s + a.costUsd, 0) },
    tokens: { total: agents.reduce((s, a) => s + a.inputTokens + a.outputTokens, 0) },
  }), [agents, memories, automations, events]);

  return {
    isConvexConnected,
    agents, addAgent, patchAgent, deleteAgent, addLog,
    memories, addMemory, patchMemory, deleteMemory, recallMemory,
    automations, addAutomation, patchAutomation, toggleAutomation, deleteAutomation,
    events, addEvent, deleteEvent, clearAllEvents,
    metrics,
  };
}
