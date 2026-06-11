import React from 'react';
import { Agent } from '../../agents/types';

interface AgentSidebarSectionProps {
  agents: Agent[];
  activeAgentId: string | null;
  onSelectAgent: (agent: Agent) => void;
  onCreateAgent: () => void;
  onDeleteAgent: (id: string) => void;
  onEditAgent: (agent: Agent) => void;
}

export function AgentSidebarSection({
  agents,
  activeAgentId,
  onSelectAgent,
  onCreateAgent,
  onDeleteAgent,
  onEditAgent,
}: AgentSidebarSectionProps) {
  return null;
}
