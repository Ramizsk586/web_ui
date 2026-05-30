import { useState, useCallback } from 'react';
import { Agent } from '../agents/types';
import { loadAgents, addAgent, updateAgent, deleteAgent } from '../agents/agentStore';

export interface UseAgentsProps {
  setCurrentChatId: React.Dispatch<React.SetStateAction<string | null>>;
}

export function useAgents({ setCurrentChatId }: UseAgentsProps) {
  const [agents, setAgents] = useState<Agent[]>(() => loadAgents());
  const [activeAgent, setActiveAgent] = useState<Agent | null>(null);
  const [showAgentCreation, setShowAgentCreation] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);

  const handleSelectAgent = useCallback((agent: Agent) => {
    setActiveAgent(agent);
    setCurrentChatId(null); // Deselect generic chat since we are in Agent View!
  }, [setCurrentChatId]);

  const handleAgentCreated = useCallback((agent: Agent) => {
    const updated = addAgent(agent);
    setAgents(updated);
    setActiveAgent(agent);
    setShowAgentCreation(false);
  }, []);

  const handleDeleteAgent = useCallback((id: string) => {
    const updated = deleteAgent(id);
    setAgents(updated);
    if (activeAgent?.id === id) setActiveAgent(null);
  }, [activeAgent]);

  const handleUpdateAgent = useCallback((id: string, patch: Partial<Agent>) => {
    const updated = updateAgent(id, patch);
    setAgents(updated);
    setActiveAgent(prev => prev?.id === id ? { ...prev, ...patch } : prev);
  }, []);

  const handleEditAgent = useCallback((agent: Agent) => {
    setEditingAgent(agent);
    setShowAgentCreation(true);
  }, []);

  return {
    agents, setAgents,
    activeAgent, setActiveAgent,
    showAgentCreation, setShowAgentCreation,
    editingAgent, setEditingAgent,
    handleSelectAgent,
    handleAgentCreated,
    handleDeleteAgent,
    handleUpdateAgent,
    handleEditAgent
  };
}
