/**
 * Shared types extracted from App.tsx.
 * Pure TypeScript — no React dependency beyond what is re-exported.
 */
export interface ToolCallNode {
  id: string;
  type: 'ai' | 'tool' | 'sub-tool' | 'result' | 'error';
  label: string;
  status: 'pending' | 'active' | 'complete' | 'failed';
  icon?: React.ReactNode;
  toolName?: string;
  argsCount?: number;
  durationMs?: number;
  resultSummary?: string;
  subNodes?: ToolCallNode[];
}

export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, { type: string; description: string }>;
      required: string[];
    };
  };
}

export interface McpTool {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  icon: React.ReactNode;
  parameters?: any;
}
