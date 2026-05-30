import { Agent, AgentMessage } from './types';
import { BUILTIN_AGENTS } from './constants';

const STORAGE_KEY = 'lumina_agents_v1';

export function loadAgents(): Agent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const userAgents: Agent[] = raw ? JSON.parse(raw) : [];
    // Always prepend builtins (non-editable/deletable from UI)
    // Map existing user agents to ensure fields are present
    const cleanUserAgents = userAgents.map((a: any) => ({
      ...a,
      chatHistory: a.chatHistory || [],
      skills: a.skills || [],
      tools: a.tools || [],
      tags: a.tags || [],
    }));
    return [...BUILTIN_AGENTS, ...cleanUserAgents];
  } catch {
    return [...BUILTIN_AGENTS];
  }
}

export function saveAgents(agents: Agent[]): void {
  // Only persist user-created agents (isBuiltin === false)
  const userOnly = agents.filter(a => !a.isBuiltin);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(userOnly));
}

export function addAgent(agent: Agent): Agent[] {
  const current = loadAgents();
  const updated = [...current, agent];
  saveAgents(updated);
  return updated;
}

export function updateAgent(id: string, patch: Partial<Agent>): Agent[] {
  const current = loadAgents();
  const updated = current.map(a => a.id === id ? { ...a, ...patch, updatedAt: Date.now() } : a);
  saveAgents(updated);
  return updated;
}

export function deleteAgent(id: string): Agent[] {
  const current = loadAgents();
  const updated = current.filter(a => a.id !== id);
  saveAgents(updated);
  return updated;
}

export function appendAgentMessage(agentId: string, message: AgentMessage): Agent[] {
  const current = loadAgents();
  const updated = current.map(a => {
    if (a.id !== agentId) return a;
    return { ...a, chatHistory: [...a.chatHistory, message], updatedAt: Date.now() };
  });
  saveAgents(updated);
  return updated;
}
