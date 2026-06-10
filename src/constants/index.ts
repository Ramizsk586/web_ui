import React from 'react';
import { 
  Terminal, 
  Sparkles, 
  Brain, 
  Box, 
  CloudSun, 
  HardDrive, 
  Globe,
  PenTool,
  Music,
  History,
  Mail,
  FileText,
  Type as TypeIcon,
  Code,
  Wrench
} from 'lucide-react';
import { Skill } from '../types';

export const DEFAULT_SERVER_URL = '/api';
export const DEFAULT_MCP_URL = '/api';
export const DEFAULT_API_KEY = 'llama';

export const AVAILABLE_AVATARS = [
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Sophia",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=John",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Sasha",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Jack",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Buster",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Lily",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Max",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=George",
];

export const CLOUD_PROVIDERS = [
  { id: 'custom', label: 'Custom / Local', endpoint: '', key: '', icon: React.createElement(Terminal, { size: 13 }) },
  { id: 'openprovider', label: 'OpenProvider', endpoint: 'https://openprovider.mimika.in/v1', key: '', icon: React.createElement(Sparkles, { size: 13 }) },
  { id: 'kimchi', label: 'Kimchi', endpoint: 'https://llm.kimchi.dev/openai/v1', key: '', icon: React.createElement(Sparkles, { size: 13 }) },
  { id: 'openai', label: 'OpenAI', endpoint: 'https://api.openai.com/v1', key: '', icon: React.createElement(Sparkles, { size: 13 }) },
  { id: 'anthropic', label: 'Anthropic', endpoint: 'https://api.anthropic.com/v1', key: '', icon: React.createElement(Brain, { size: 13 }) },
  { id: 'groq', label: 'Groq', endpoint: 'https://api.groq.com/openai/v1', key: '', icon: React.createElement(Terminal, { size: 13 }) },
  { id: 'openrouter', label: 'OpenRouter', endpoint: 'https://openrouter.ai/api/v1', key: '', icon: React.createElement(Box, { size: 13 }) },
  { id: 'together', label: 'Together AI', endpoint: 'https://api.together.xyz/v1', key: '', icon: React.createElement(Sparkles, { size: 13 }) },
  { id: 'mistral', label: 'Mistral', endpoint: 'https://api.mistral.ai/v1', key: '', icon: React.createElement(Sparkles, { size: 13 }) },
  { id: 'ollama_cloud', label: 'Ollama Cloud', endpoint: 'https://ollama.com/v1', key: '', icon: React.createElement(CloudSun, { size: 13 }) },
  { id: 'ollama_local', label: 'Ollama Local', endpoint: 'http://127.0.0.1:11434/v1', key: '', icon: React.createElement(Terminal, { size: 13 }) },
  { id: 'lm_studio', label: 'LM Studio', endpoint: 'http://127.0.0.1:1234/v1', key: '', icon: React.createElement(HardDrive, { size: 13 }) },
  { id: 'nvidia_nim', label: 'NVIDIA NIM', endpoint: 'https://integrate.api.nvidia.com/v1', key: '', icon: React.createElement(Sparkles, { size: 13 }) },
  { id: 'gemini', label: 'Gemini', endpoint: 'https://generativelanguage.googleapis.com/v1beta/openai', key: '', icon: React.createElement(Sparkles, { size: 13 }) },
  { id: 'cohere', label: 'Cohere', endpoint: 'https://api.cohere.com/compatibility/v1', key: '', icon: React.createElement(Globe, { size: 13 }) },
  { id: 'deepseek', label: 'DeepSeek', endpoint: 'https://api.deepseek.com', key: '', icon: React.createElement(Box, { size: 13 }) },
  { id: 'sarvamai', label: 'Sarvam AI', endpoint: 'https://api.sarvam.ai/v1', key: '', icon: React.createElement(Sparkles, { size: 13 }) },
  { id: 'kilo', label: 'Kilo AI', endpoint: 'https://api.kilo.ai/api/gateway', key: '', icon: React.createElement(Brain, { size: 13 }) },
  { id: 'opencode', label: 'OpenCode Zen', endpoint: 'https://opencode.ai/zen/v1', key: '', icon: React.createElement(Code, { size: 13 }) },
  { id: 'cline', label: 'Cline', endpoint: 'https://api.cline.bot', key: '', icon: React.createElement(Terminal, { size: 13 }) },
];

export const WRITING_STYLES = [
  { id: 'default', label: 'Default', icon: React.createElement(PenTool, { size: 14 }) },
  { id: 'poem', label: 'Poem', icon: React.createElement(Music, { size: 14 }) },
  { id: 'story', label: 'Story', icon: React.createElement(History, { size: 14 }) },
  { id: 'letter', label: 'Letter', icon: React.createElement(Mail, { size: 14 }) },
  { id: 'essay', label: 'Essay', icon: React.createElement(FileText, { size: 14 }) },
  { id: 'script', label: 'Script', icon: React.createElement(TypeIcon, { size: 14 }) },
];

export const SKILLS: Skill[] = [
  { id: 'summarize', label: 'Summarize', prompt: 'Summarize the following: ', icon: React.createElement(FileText, { size: 16 }) },
  { id: 'translate', label: 'Translate', prompt: 'Translate the following to English: ', icon: React.createElement(Globe, { size: 16 }) },
  { id: 'explain', label: 'Explain Code', prompt: 'Explain this code step by step: ', icon: React.createElement(Code, { size: 16 }) },
  { id: 'brainstorm', label: 'Brainstorm', prompt: 'Brainstorm 5 creative ideas for: ', icon: React.createElement(Sparkles, { size: 16 }) },
  { id: 'refactor', label: 'Refactor', prompt: 'Refactor and improve this code: ', icon: React.createElement(Wrench, { size: 16 }) },
];

export const SLASH_COMMANDS = [
  { id: 'clear', name: 'clear', desc: 'Clear current chat history' },
  { id: 'new', name: 'new', desc: 'Start a new chat session' },
  { id: 'goal', name: 'goal', desc: 'Run until the specified goal is completely finished' },
  { id: 'schedule', name: 'schedule', desc: 'Run custom instruction on a recurring schedule or as a one-time timer' },
  { id: 'browser', name: 'browser', desc: 'Invoke a browser agent for web tasks' },
  { id: 'grill-me', name: 'grill-me', desc: 'Interview me to align on a plan' },
  { id: 'coder', name: 'coder', desc: 'Activate autonomous Software Engineering Agent mode' },
  { id: 'coder_off', name: 'coder off', desc: 'Deactivate autonomous Software Engineering Agent mode' }
];

export * from './voiceLanguages';
