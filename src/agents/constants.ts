import { AgentSkill, AgentTool, Agent } from './types';

export const ALL_AGENT_SKILLS: AgentSkill[] = [
  {
    id: 'memory',
    name: 'Memory',
    description: 'Agent remembers things across conversations',
    icon: 'Brain',
    enabled: false,
  },
  {
    id: 'artifacts',
    name: 'Artifacts',
    description: 'Agent can create interactive code, charts, and UI',
    icon: 'Box',
    enabled: false,
  },
  {
    id: 'code_execution',
    name: 'Code Execution',
    description: 'Agent can write and run code in a sandbox',
    icon: 'Terminal',
    enabled: false,
  },
  {
    id: 'image_generation',
    name: 'Image Generation',
    description: 'Agent can create images from text descriptions',
    icon: 'Image',
    enabled: false,
  },
  {
    id: 'file_read_write',
    name: 'File Access',
    description: 'Agent can read and write files in workspace',
    icon: 'HardDrive',
    enabled: false,
  },
  {
    id: 'wiki_search',
    name: 'Wikipedia',
    description: 'Agent can search and read Wikipedia articles',
    icon: 'BookOpen',
    enabled: false,
  },
];

export const ALL_AGENT_TOOLS: AgentTool[] = [
  { id: 'web_search',   name: 'Web Search',      description: 'Search the web for real-time info',    icon: 'Search',      active: false },
  { id: 'wikipedia',    name: 'Wikipedia',        description: 'Query Wikipedia articles',              icon: 'BookOpen',    active: false },
  { id: 'code_runner',  name: 'Code Runner',      description: 'Execute code in a sandboxed env',      icon: 'Play',        active: false },
  { id: 'image_gen',    name: 'Image Gen',         description: 'Generate images from prompts',         icon: 'Camera',      active: false },
  { id: 'file_manager', name: 'File Manager',      description: 'Read, write, list workspace files',   icon: 'Folder',      active: false },
  { id: 'calculator',   name: 'Calculator',        description: 'Perform complex math computations',    icon: 'Hash',        active: false },
  { id: 'translator',   name: 'Translator',        description: 'Translate text between languages',     icon: 'Languages',   active: false },
  { id: 'weather',      name: 'Weather',           description: 'Get live weather for any location',    icon: 'CloudSun',    active: false },
  { id: 'news_reader',  name: 'News Reader',       description: 'Read recent news headlines & articles', icon: 'Newspaper',  active: false },
];

export const MAX_AGENT_SKILLS = 6;
export const MAX_AGENT_TOOLS = 8;

export const AGENT_AVATARS = ['🤖', '🧠', '🎯', '🚀', '💡', '🎨', '📊', '🔬', '🏗️', '🌿', '⚡', '🎓', '🧑‍💻', '🧘', '📸', '🐾'];

export const AGENT_AVATAR_COLORS = [
  'bg-violet-500', 'bg-blue-500', 'bg-teal-500', 'bg-emerald-500',
  'bg-amber-500', 'bg-rose-500', 'bg-fuchsia-500', 'bg-sky-500',
];

export const BUILTIN_AGENTS: Agent[] = [];
