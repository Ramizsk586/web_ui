export type AgentSkillId =
  | 'web_browsing'
  | 'memory'
  | 'artifacts'
  | 'code_execution'
  | 'image_generation'
  | 'file_read_write'
  | 'wiki_search'
  | 'web_scraper'
  | 'calendar'
  | 'email';

export interface AgentSkill {
  id: AgentSkillId;
  name: string;
  description: string;
  icon: string;           // Lucide icon name as string e.g. "Globe"
  enabled: boolean;
}

export type AgentToolId =
  | 'web_search'
  | 'wikipedia'
  | 'code_runner'
  | 'scraper'
  | 'image_gen'
  | 'file_manager'
  | 'calculator'
  | 'translator'
  | 'weather'
  | 'news_reader';

export interface AgentTool {
  id: AgentToolId | string;
  name: string;
  description: string;
  icon: string;
  active: boolean;
  parameters?: any;
  source?: 'built_in' | 'bridge' | 'external';
}

export type AgentModel = string;

export type AgentMode = 'primary' | 'subagent' | 'all';

export type AgentPermissionAction = 'allow' | 'ask' | 'deny';

export interface AgentPermissionRule {
  [pattern: string]: AgentPermissionAction;
}

export interface AgentPermissions {
  read?: AgentPermissionAction | AgentPermissionRule;
  edit?: AgentPermissionAction | AgentPermissionRule;
  glob?: AgentPermissionAction | AgentPermissionRule;
  grep?: AgentPermissionAction | AgentPermissionRule;
  list?: AgentPermissionAction | AgentPermissionRule;
  bash?: AgentPermissionAction | AgentPermissionRule;
  task?: AgentPermissionAction | AgentPermissionRule;
  external_directory?: AgentPermissionAction | AgentPermissionRule;
  todowrite?: AgentPermissionAction;
  question?: AgentPermissionAction;
  webfetch?: AgentPermissionAction;
  websearch?: AgentPermissionAction;
  lsp?: AgentPermissionAction | AgentPermissionRule;
  doom_loop?: AgentPermissionAction;
  skill?: AgentPermissionAction;
}

export interface AgentSkillFile {
  name: string;          // e.g. "AGENT.md", "TOOLS.md", "WORKFLOWS.md", "DOMAIN.md", "MEMORY.md"
  content: string;       // markdown content
  description: string;   // short description of what this file contains
}

export interface Agent {
  id: string;                    // nanoid or crypto.randomUUID()
  name: string;                  // e.g. "Technical PM", "Mindfulness Coach"
  description: string;           // one-liner shown in sidebar
  systemPrompt: string;          // full system prompt AI generated or user edited
  avatarEmoji: string;           // e.g. "🤖", "🧠", "🎯"
  avatarColor: string;           // tailwind color class e.g. "bg-violet-500"
  model: AgentModel;
  skills: AgentSkill[];          // max 6 skills
  tools: AgentTool[];            // max 8 tools
  createdAt: number;             // Date.now()
  updatedAt: number;
  chatHistory: AgentMessage[];   // persisted conversation with this agent
  isBuiltin: boolean;            // true = "Lobe AI" style default agents, false = user-created
  tags: string[];                // e.g. ["productivity", "coding"]
  provider?: string;             // Custom LLM provider
  apiKey?: string;               // Custom API Key
  baseUrl?: string;              // Custom Base URL
  skillFiles?: AgentSkillFile[]; // custom generated markdown skill files
  bridgeUrl?: string;
  bridgeApiKey?: string;
  bridgeModel?: string;
  mode?: AgentMode;
  hidden?: boolean;
  steps?: number;
  permissions?: AgentPermissions;
  executionMode?: 'legacy' | 'dispatcher';
}

export interface AgentMessage {
  id: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  timestamp: number;
  toolCallId?: string;
  toolName?: string;
  isStreaming?: boolean;
  toolCalls?: any[]; // For render animations
  runId?: string;
  agentEvents?: AgentRunEvent[];
  attachedAgentIds?: string[];
  thinkContent?: string;
}

export interface AgentRunToolEvent {
  id: string;
  type: 'tool';
  name: string;
  status: 'active' | 'complete' | 'failed';
  serverName?: string;
  input?: any;
  output?: string;
}

export interface AgentRunSpawnEvent {
  id: string;
  type: 'spawn';
  name: string;
  agentId?: string;
  mode?: AgentMode;
  status: 'active' | 'complete' | 'failed';
  task: string;
  integrations: string[];
  permissions?: AgentPermissions;
  summary?: string;
  result?: string;
}

export interface AgentRunTextEvent {
  id: string;
  type: 'text';
  text: string;
}

export type AgentRunEvent = AgentRunToolEvent | AgentRunSpawnEvent | AgentRunTextEvent;
