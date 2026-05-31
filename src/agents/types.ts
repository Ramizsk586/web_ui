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
  id: AgentToolId;
  name: string;
  description: string;
  icon: string;
  active: boolean;
}

export type AgentModel = string;

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
}

export interface AgentCreationDraft {
  userDescription: string;       // raw user input e.g. "a coach who helps me with fitness"
  isGenerating: boolean;
  generatedAgent: Partial<Agent> | null;
  error: string | null;
}
