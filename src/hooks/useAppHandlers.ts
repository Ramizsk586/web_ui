import React, { useCallback, useEffect, useRef } from 'react';
import { computeLineDiff } from '../components/NodeGraph/FileDiffNode';
import { parseThinkTags, turboQuantCompress } from '../utils/textUtils';
import { extractArtifacts } from '../utils/artifactUtils';
import { extractYouTubeId, fetchYouTubeTranscript } from '../utils/youtubeUtils';
import {
  DEEP_RESEARCH_SYSTEM_PROMPT,
  createDeepResearchReportTitle,
  deepResearchTools,
  formatDeepResearchSearchResults,
  formatDeepResearchVisitResult,
  getDeepResearchMinimums,
  getDeepResearchPresetPrompt,
  sanitizeDeepResearchReport
} from '../utils/deepResearchWorkflow';
import { SKILLS } from '../constants';
import { Chat, Message, ToolCallNode } from '../types';
import { CoderPermissionMode } from '../types';
import { scrapeUrl, ScrapeResult } from '../services/scrapingService';
import { explainCommandRestriction, shouldRequestCommandPermission } from '../utils/permissionUtils';
import { executeViaTerminal } from '../utils/terminalService';
import {
  wikiSearch,
  wikiGetPage,
  wikiGetSummary,
  wikiGetSections,
  wikiGetCategories,
  wikiGetLinks,
  wikiGetImages,
  wikiGetRelated
} from '../services/wikiService';
import { createCoderPiAgent, runCoderPiAgent, type PiAgentInstance, type PiAgentEvent } from '../services/piAgentService';

// Maps our frontend composio tool names → actual Composio API tool slugs.
// Composio slug format is always UPPERCASE_WITH_UNDERSCORES.
const COMPOSIO_TOOL_SLUG_MAP: Record<string, string> = {
  // Gmail
  composio_gmail_send_email: 'GMAIL_SEND_EMAIL',
  composio_gmail_search:     'GMAIL_SEARCH_EMAILS',
  composio_gmail_read_email: 'GMAIL_GET_ATTACHMENT',
  // GitHub
  composio_github_list_repos:    'GITHUB_LIST_REPOSITORIES_FOR_AUTHENTICATED_USER',
  composio_github_search_repos:  'GITHUB_SEARCH_REPOSITORIES',
  composio_github_get_repo:      'GITHUB_GET_A_REPOSITORY',
  composio_github_create_issue:  'GITHUB_CREATE_AN_ISSUE',
  // Slack
  composio_slack_send_message:        'SLACK_SENDS_A_MESSAGE_TO_A_SLACK_CHANNEL',
  composio_slack_list_channels:       'SLACK_LISTS_ALL_CHANNELS_IN_A_SLACK_TEAM',
  composio_slack_get_channel_history: 'SLACK_FETCH_MESSAGE_HISTORY_BY_CHANNEL',
  // Google Drive
  composio_gdrive_list_files: 'GOOGLEDRIVE_FIND_FILE',
  composio_gdrive_search:     'GOOGLEDRIVE_FIND_FILE',
  // Notion
  composio_notion_search:      'NOTION_SEARCH',
  composio_notion_create_page: 'NOTION_CREATE_PAGE',
  // Google Calendar
  composio_gcal_list_events:  'GOOGLECALENDAR_LIST_EVENTS',
  composio_gcal_create_event: 'GOOGLECALENDAR_CREATE_EVENT',
  // Linear
  composio_linear_list_issues:  'LINEAR_LIST_LINEAR_ISSUES',
  composio_linear_create_issue: 'LINEAR_CREATE_ISSUE',
};

// Convert a frontend composio tool name to the actual Composio API slug.
// Falls back to a best-effort uppercase transformation if not in the map.
const resolveComposioSlug = (name: string): string => {
  if (COMPOSIO_TOOL_SLUG_MAP[name]) return COMPOSIO_TOOL_SLUG_MAP[name];
  return name.replace(/^composio_/, '').toUpperCase().replace(/-/g, '_');
};

const compressToolResultForApi = (name: string, result: any): string => {
  if (result === undefined) {
    return JSON.stringify({
      status: 'no_result',
      message: `Tool "${name}" completed without returning a payload.`
    });
  }

  if (result === null) {
    return "null";
  }

  const str = typeof result === 'string'
    ? result
    : (() => {
        try {
          const serialized = JSON.stringify(result);
          if (typeof serialized === 'string') {
            return serialized;
          }
        } catch {}

        return JSON.stringify({
          status: 'serialization_fallback',
          message: `Tool "${name}" returned a non-serializable payload.`,
          preview: String(result)
        });
      })();

  if (!str.trim()) {
    return JSON.stringify({
      status: 'empty_result',
      message: `Tool "${name}" returned an empty payload.`
    });
  }
  
  if (str.length <= 2500) {
    return str;
  }
  
  if (name === 'read_file') {
    return `${str.substring(0, 2000)}\n\n... [Content truncated to save token rate limits. Total length: ${str.length} characters]`;
  }
  
  if (name === 'run_command') {
    if (typeof result === 'object' && result) {
      const stdout = result.stdout || '';
      const stderr = result.stderr || '';
      const exitCode = result.exitCode ?? 0;
      
      const truncStdout = stdout.length > 1500 
        ? `${stdout.substring(0, 800)}\n... [truncated] ...\n${stdout.substring(stdout.length - 700)}`
        : stdout;
      const truncStderr = stderr.length > 1000 
        ? `${stderr.substring(0, 500)}\n... [truncated] ...\n${stderr.substring(stderr.length - 500)}`
        : stderr;
        
      return JSON.stringify({
        exitCode,
        stdout: truncStdout,
        stderr: truncStderr,
        info: `[Output truncated to save Groq TPM rate limits. Total stdout: ${stdout.length} chars, stderr: ${stderr.length} chars]`
      });
    }
  }
  
  if (name === 'web_scrape' || name === 'fetch_url') {
    return `${str.substring(0, 2000)}\n\n... [Webpage content truncated to save token rate limits. Total length: ${str.length} characters]`;
  }
  
  return `${str.substring(0, 2500)}\n\n... [Truncated to save token rate limits]`;
};

const normalizeToolFilePath = (filePath: string, workspaceRoot?: string) => {
  const raw = String(filePath || '').replace(/\\/g, '/').trim();
  if (!raw) return '';

  const withoutLeading = raw.replace(/^\/+/, '');
  const normalizedRoot = String(workspaceRoot || '').replace(/\\/g, '/').replace(/\/+$/, '');

  if (normalizedRoot) {
    const escapedRoot = normalizedRoot.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const rootPattern = new RegExp(`^${escapedRoot}/?`, 'i');
    if (rootPattern.test(raw)) {
      return raw.replace(rootPattern, '');
    }
  }

  return withoutLeading.replace(/^[A-Za-z]:\/Project\/?/i, '');
};

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const splitGlobBraceOptions = (value: string) => {
  const options: string[] = [];
  let current = '';
  let depth = 0;

  for (let i = 0; i < value.length; i += 1) {
    const char = value[i];

    if (char === ',' && depth === 0) {
      options.push(current);
      current = '';
      continue;
    }

    if (char === '{') {
      depth += 1;
    } else if (char === '}' && depth > 0) {
      depth -= 1;
    }

    current += char;
  }

  options.push(current);
  return options;
};

const globToRegExp = (pattern: string) => {
  const normalized = String(pattern || '')
    .replace(/\\/g, '/')
    .trim()
    .replace(/^\.\//, '');

  if (!normalized) return null;

  let regex = '';
  for (let i = 0; i < normalized.length; i += 1) {
    const char = normalized[i];
    const next = normalized[i + 1];

    if (char === '*' && next === '*') {
      const afterNext = normalized[i + 2];
      if (afterNext === '/') {
        regex += '(?:.*/)?';
        i += 2;
      } else {
        regex += '.*';
        i += 1;
      }
      continue;
    }

    if (char === '*') {
      regex += '[^/]*';
      continue;
    }

    if (char === '?') {
      regex += '[^/]';
      continue;
    }

    if (char === '{') {
      let depth = 1;
      let end = i + 1;

      while (end < normalized.length && depth > 0) {
        if (normalized[end] === '{') depth += 1;
        if (normalized[end] === '}') depth -= 1;
        end += 1;
      }

      if (depth === 0) {
        const braceContent = normalized.slice(i + 1, end - 1);
        const options = splitGlobBraceOptions(braceContent)
          .map(option => globToRegExp(option))
          .filter((value): value is RegExp => Boolean(value))
          .map(value => value.source.replace(/^\^/, '').replace(/\$$/, ''));

        if (options.length > 0) {
          regex += `(?:${options.join('|')})`;
          i = end - 1;
          continue;
        }
      }
    }

    regex += escapeRegex(char);
  }

  return new RegExp(`^${regex}$`, 'i');
};

const matchesWorkspaceGlob = (filePath: string, pattern: string) => {
  const normalizedPath = String(filePath || '').replace(/\\/g, '/').replace(/^\/+/, '');
  const normalizedPattern = String(pattern || '').replace(/\\/g, '/').trim();

  if (!normalizedPattern) return true;

  const regex = globToRegExp(normalizedPattern);
  if (!regex) return true;

  return regex.test(normalizedPath);
};

const getToolCategory = (toolName: string): ToolCallNode['toolCategory'] => {
  if (['glob_tool', 'grep_tool', 'analyze_file'].includes(toolName)) return 'discovery';
  if (toolName === 'read_file') return 'read';
  if (['write_file', 'edit_file', 'create_file', 'delete_file', 'rename_file', 'apply_patch'].includes(toolName)) return 'write';
  if (toolName === 'run_command') return 'execute';
  if (toolName.startsWith('spawn_')) return 'delegate';
  if (['fetch_url', 'web_search', 'web_scrape', 'search', 'visit', 'google_scholar'].includes(toolName) || toolName.startsWith('wiki_') || toolName.startsWith('composio_')) return 'web';
  if (toolName === 'ask_user') return 'question';
  if (['run_skill', 'manage_todos', 'todowrite', 'current_time'].includes(toolName)) return 'workflow';
  return 'other';
};

const buildCoderToolSelection = (
  allTools: any[],
  userInput: string,
  activeAssistantMode: string
) => {
  const lower = String(userInput || '').toLowerCase();
  const allow = new Set<string>();

  [
    'run_skill', 'read_file', 'glob_tool', 'grep_tool', 'analyze_file',
    'edit_file', 'apply_patch', 'write_file', 'create_file',
    'todowrite', 'ask_user'
  ].forEach(name => allow.add(name));

  if (/\b(run|test|build|lint|start|npm|pnpm|yarn|command|terminal|debug|error|failing|verify|compile)\b/.test(lower) || activeAssistantMode === 'debugger' || activeAssistantMode === 'tester') {
    allow.add('run_command');
    allow.add('spawn_debugger');
  }

  if (/\b(delete|remove)\b/.test(lower)) {
    allow.add('delete_file');
  }

  if (/\b(rename|move)\b/.test(lower)) {
    allow.add('rename_file');
  }

  if (/\b(search the web|latest|docs|documentation|api|website|url|fetch|scrape|current)\b/.test(lower)) {
    allow.add('fetch_url');
    allow.add('web_search');
  }

  if (/\b(review|audit|analyze|trace|find|locate|where|which file)\b/.test(lower) || activeAssistantMode === 'reviewer' || activeAssistantMode === 'planner') {
    allow.add('spawn_analyzer');
    allow.add('spawn_reviewer');
  }

  if (/\b(build|implement|feature|refactor|create)\b/.test(lower) || activeAssistantMode === 'builder') {
    allow.add('spawn_coder');
  }

  if (/\b(orchestrate|plan|phases|workflow|complex|full app|full project)\b/.test(lower) || activeAssistantMode === 'planner') {
    allow.add('spawn_orchestrator');
  }

  const priorityOrder = [
    'run_skill', 'glob_tool', 'grep_tool', 'read_file', 'analyze_file',
    'edit_file', 'apply_patch', 'write_file', 'create_file', 'rename_file', 'delete_file',
    'run_command', 'spawn_analyzer', 'spawn_coder', 'spawn_debugger', 'spawn_reviewer', 'spawn_orchestrator',
    'fetch_url', 'web_search', 'ask_user', 'todowrite'
  ];

  const tools = allTools
    .filter((tool: any) => allow.has(tool?.function?.name))
    .sort((a: any, b: any) => {
      const aIdx = priorityOrder.indexOf(a?.function?.name);
      const bIdx = priorityOrder.indexOf(b?.function?.name);
      return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx);
    });

  const toolNames = tools.map((tool: any) => tool?.function?.name).filter(Boolean);
  const guidance = [
    'Tool strategy for this request:',
    `- Start with discovery tools when the target file or symbol is not already known: ${toolNames.filter((name: string) => ['run_skill', 'glob_tool', 'grep_tool', 'read_file', 'analyze_file'].includes(name)).join(', ') || 'glob_tool, grep_tool, read_file'}.`,
    `- Use edit tools for existing files and reserve full rewrites for clear cases: ${toolNames.filter((name: string) => ['edit_file', 'apply_patch', 'write_file', 'create_file', 'rename_file', 'delete_file'].includes(name)).join(', ') || 'edit_file, write_file'}.`,
    `- Use execution or delegation only when needed for verification or parallel work: ${toolNames.filter((name: string) => ['run_command', 'spawn_analyzer', 'spawn_coder', 'spawn_debugger', 'spawn_reviewer', 'spawn_orchestrator'].includes(name)).join(', ') || 'run_command'}.`,
    '- Avoid repeating the same tool call with identical arguments after it has already succeeded or failed in this turn.',
    '- Prefer one high-signal tool call over multiple overlapping exploratory calls.'
  ].join('\n');

  return {
    tools: tools.length > 0 ? tools : allTools,
    guidance
  };
};

const getVirtualSkillMatch = (filePath: string) => {
  const normalized = filePath.replace(/\\/g, '/').replace(/^\.\//, '').trim();
  const match = normalized.match(/^(?:\.lumina\/)?skills\/([a-zA-Z0-9_-]+)\/(.+)$/i);
  if (match) {
    return {
      skillId: match[1],
      subPath: match[2]
    };
  }
  return null;
};

const findVirtualSkillFile = (nodes: any[], pathParts: string[]): any => {
  if (pathParts.length === 0) return null;
  const currentPart = pathParts[0];
  const found = nodes.find((n: any) => n.name.toLowerCase() === currentPart.toLowerCase());
  if (!found) return null;
  if (pathParts.length === 1) {
    if (found.type === 'file') return found;
    return null;
  }
  if (found.type === 'folder' && found.children) {
    return findVirtualSkillFile(found.children, pathParts.slice(1));
  }
  return null;
};

const setVirtualSkillFileContent = (nodes: any[], pathParts: string[], newContent: string): boolean => {
  if (pathParts.length === 0) return false;
  const currentPart = pathParts[0];
  const foundIndex = nodes.findIndex((n: any) => n.name.toLowerCase() === currentPart.toLowerCase());
  
  if (pathParts.length === 1) {
    if (foundIndex !== -1 && nodes[foundIndex].type === 'file') {
      nodes[foundIndex].content = newContent;
      return true;
    } else if (foundIndex === -1) {
      nodes.push({ name: pathParts[0], type: 'file', content: newContent });
      return true;
    }
    return false;
  }
  
  if (foundIndex !== -1 && nodes[foundIndex].type === 'folder') {
    if (!nodes[foundIndex].children) nodes[foundIndex].children = [];
    return setVirtualSkillFileContent(nodes[foundIndex].children, pathParts.slice(1), newContent);
  } else if (foundIndex === -1) {
    const newFolder = { name: currentPart, type: 'folder', children: [] };
    nodes.push(newFolder);
    return setVirtualSkillFileContent(newFolder.children, pathParts.slice(1), newContent);
  }
  
  return false;
};

const createStableTurnId = (prefix: string, ...parts: Array<string | number | undefined>) => {
  const suffix = parts
    .filter((part) => part !== undefined && part !== null && String(part).length > 0)
    .map((part) => String(part).replace(/[^a-zA-Z0-9_.-]+/g, '-'))
    .join('-');
  return `${prefix}-${Date.now().toString(36)}-${suffix || 'item'}-${Math.random().toString(36).slice(2, 8)}`;
};

const SCRAPE_SEARCH_HOST_PATTERNS = [
  /(^|\.)google\./i,
  /(^|\.)bing\.com$/i,
  /(^|\.)duckduckgo\.com$/i,
  /(^|\.)search\.yahoo\.com$/i,
  /(^|\.)yahoo\.com$/i,
];

const looksLikeSearchEngineUrl = (value: string) => {
  try {
    const parsed = new URL(String(value || '').trim());
    const host = parsed.hostname.toLowerCase();
    return SCRAPE_SEARCH_HOST_PATTERNS.some((pattern) => pattern.test(host));
  } catch {
    return false;
  }
};

const extractSearchQueryFromUrl = (value: string) => {
  try {
    const parsed = new URL(String(value || '').trim());
    const directQuery =
      parsed.searchParams.get('q') ||
      parsed.searchParams.get('query') ||
      parsed.searchParams.get('p') ||
      parsed.searchParams.get('text');

    if (directQuery && directQuery.trim()) {
      return directQuery.trim();
    }

    if (parsed.hash) {
      const hashParams = new URLSearchParams(parsed.hash.replace(/^#/, ''));
      const hashQuery = hashParams.get('q') || hashParams.get('query') || hashParams.get('text');
      if (hashQuery && hashQuery.trim()) {
        return hashQuery.trim();
      }
    }
  } catch {}

  return '';
};

const pickResolvedScrapeCandidate = (results: any[] = []) => {
  for (const item of results) {
    const candidate = String(item?.url || item?.link || '').trim();
    if (!candidate) continue;
    if (looksLikeSearchEngineUrl(candidate)) continue;
    return candidate;
  }
  return '';
};

const resolveScrapeTargetUrl = async ({
  targetUrl,
  queryFallback,
  tavilyApiKey,
  serpApiKey,
  searchProvider,
  signal
}: {
  targetUrl: string;
  queryFallback?: string;
  tavilyApiKey?: string;
  serpApiKey?: string;
  searchProvider?: string;
  signal?: AbortSignal;
}) => {
  const requestedUrl = String(targetUrl || '').trim();
  if (!requestedUrl || !looksLikeSearchEngineUrl(requestedUrl)) {
    return { requestedUrl, resolvedUrl: requestedUrl };
  }

  const inferredQuery = extractSearchQueryFromUrl(requestedUrl) || String(queryFallback || '').trim();
  if (!inferredQuery) {
    return { requestedUrl, resolvedUrl: requestedUrl };
  }

  try {
    const searchRes = await fetch('/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: inferredQuery,
        tavilyKey: tavilyApiKey,
        serpKey: serpApiKey,
        provider: searchProvider
      }),
      signal
    });

    if (!searchRes.ok) {
      return { requestedUrl, resolvedUrl: requestedUrl, inferredQuery };
    }

    const searchData = await searchRes.json();
    const resolvedUrl = pickResolvedScrapeCandidate(searchData.results || []);
    return { requestedUrl, resolvedUrl: resolvedUrl || requestedUrl, inferredQuery };
  } catch {
    return { requestedUrl, resolvedUrl: requestedUrl, inferredQuery };
  }
};

type OpenCodeContextItem = {
  id: string;
  name: string;
  description: string;
  content: string;
  sourcePath: string;
  tools: string[];
  mode: 'primary' | 'subagent' | 'all';
  permissions?: Record<string, any>;
};

type OpenCodeContext = {
  available: boolean;
  root: string;
  commands: OpenCodeContextItem[];
  agents: OpenCodeContextItem[];
  tools: OpenCodeContextItem[];
  config: {
    references: Record<string, string>;
    permissions: Record<string, any>;
    toolStates: Record<string, boolean>;
  } | null;
};

const normalizeOpenCodeKey = (value: string) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const inferOpenCodeCommandKey = (input: string) => {
  const trimmed = String(input || '').trim();
  if (!trimmed.startsWith('/')) return '';
  const firstSpace = trimmed.indexOf(' ');
  const raw = firstSpace === -1 ? trimmed.slice(1) : trimmed.slice(1, firstSpace);
  return normalizeOpenCodeKey(raw);
};

const buildOpenCodePromptPrelude = (
  context: OpenCodeContext | null,
  input: string,
  activeAssistantMode: string
) => {
  if (!context?.available) {
    return {
      prompt: '',
      preferredTools: [] as string[],
    };
  }

  const commandKey = inferOpenCodeCommandKey(input);
  const normalizedMode = normalizeOpenCodeKey(activeAssistantMode);
  const directCommand = commandKey
    ? context.commands.find((item) => normalizeOpenCodeKey(item.id) === commandKey || normalizeOpenCodeKey(item.name) === commandKey)
    : null;
  const roleAgent = context.agents.find((item) => {
    const id = normalizeOpenCodeKey(item.id);
    return (
      id === normalizedMode ||
      (normalizedMode === 'builder' && id === 'build') ||
      (normalizedMode === 'planner' && id === 'plan') ||
      ((normalizedMode === 'reviewer' || normalizedMode === 'tester') && id === 'general')
    );
  }) || null;

  const selectedItems = [directCommand, roleAgent].filter(Boolean) as OpenCodeContextItem[];
  const preferredTools = [...new Set(selectedItems.flatMap((item) => item.tools || []))];

  const sections: string[] = [];
  if (directCommand) {
    sections.push(`Selected OpenCode command /${directCommand.id} from ${directCommand.sourcePath}:\n${directCommand.content}`);
  }
  if (roleAgent) {
    sections.push(`Selected OpenCode agent profile ${roleAgent.name} from ${roleAgent.sourcePath}:\n${roleAgent.content}`);
  }

  if (!directCommand && context.commands.length > 0) {
    sections.push(
      `Available OpenCode commands:\n${context.commands
        .map((item) => `- /${item.id}: ${item.description}`)
        .join('\n')}`
    );
  }

  if (context.agents.length > 0) {
    sections.push(
      `Available OpenCode agents:\n${context.agents
        .map((item) => `- ${item.name} [mode=${item.mode}]: ${item.description}`)
        .join('\n')}`
    );
  }

  if (context.tools.length > 0) {
    sections.push(
      `Available OpenCode tool guides:\n${context.tools
        .map((item) => `- ${item.name}: ${item.description}`)
        .join('\n')}`
    );
  }

  if (context.config) {
    const enabledFlags = Object.entries(context.config.toolStates || {})
      .filter(([, enabled]) => enabled !== false)
      .map(([name]) => name);
    if (enabledFlags.length > 0) {
      sections.push(`OpenCode enabled tool flags: ${enabledFlags.join(', ')}`);
    }
    const references = Object.entries(context.config.references || {});
    if (references.length > 0) {
      sections.push(`OpenCode references:\n${references.map(([name, target]) => `- ${name}: ${target}`).join('\n')}`);
    }
  }

  return {
    prompt: sections.length > 0 ? `\n\n[OPENCODE WORKSPACE CONTEXT]\n${sections.join('\n\n')}` : '',
    preferredTools,
  };
};

const inferWritingStyleFromPrompt = (input: string): string => {
  const text = String(input || '').trim().toLowerCase();
  if (!text) return 'default';

  if (/\b(poem|poetry|haiku|sonnet|verse|rhym(e|ing)|limerick)\b/.test(text)) {
    return 'poem';
  }
  if (/\b(story|short story|tale|fiction|narrative|fairy tale|bedtime story)\b/.test(text)) {
    return 'story';
  }
  if (/\b(letter|email|mail|application|cover letter|formal letter|apology letter|message to)\b/.test(text)) {
    return 'letter';
  }
  if (/\b(essay|article|blog post|editorial|long-form|composition|write-up)\b/.test(text)) {
    return 'essay';
  }
  if (/\b(script|screenplay|dialogue scene|scene format|play format|stage play|dramatic scene)\b/.test(text)) {
    return 'script';
  }

  return 'default';
};

const mapSpawnEventsToSubNodes = (toolCallId: string, events: any[] = []): ToolCallNode[] => {
  return events.map((evt: any, ei: number) => ({
    id: `spawn-sub-${toolCallId}-${ei}`,
    type: (evt.type === 'spawn' ? 'ai' : evt.type === 'text' ? 'result' : 'tool') as ToolCallNode['type'],
    label: evt.type === 'spawn'
      ? `Spawning: ${evt.name}`
      : evt.type === 'text'
        ? (evt.text || '').slice(0, 60)
        : evt.name,
    status: (evt.status === 'complete' ? 'complete' : evt.status === 'failed' ? 'failed' : 'active') as ToolCallNode['status'],
    toolName: evt.type === 'tool' ? evt.name : undefined,
    filePath: evt.input?.filePath || evt.input?.path || '',
    resultSummary: evt.output || evt.result || '',
    icon: evt.type === 'spawn' ? 'sparkles' :
      evt.name === 'read_file' ? 'file' :
      evt.name === 'write_file' ? 'write' :
      evt.name === 'edit_file' ? 'edit' :
      evt.name === 'run_command' ? 'terminal' :
      evt.name === 'glob_tool' || evt.name === 'grep_tool' ? 'search' :
      'sparkles',
  }));
};

export interface UseAppHandlersParams {
  input: string;
  setInput: (v: string) => void;
  isTyping: boolean;
  setIsTyping: (v: boolean) => void;
  activeSkills: string[];
  showsSlashCommands: boolean;
  filteredCommands: any[];
  selectedCommandIndex: number;
  setSelectedCommandIndex: (v: number | ((prev: number) => number)) => void;
  setTypingMessageId: (v: string | null) => void;

  callLlamaBridge: any;

  persona: any;
  writingStyle: string;
  useTurboQuant: boolean;
  tavilyApiKey: string;
  serpApiKey: string;
  searchProvider: string;
  selectedModel: string;
  activeModelId: string;
  activeModelList: any[];
  serverUrl?: string;
  apiKey?: string;
  selectedProvider?: string;
  llamaBridgeUrl?: string;
  llamaBridgeApiKey?: string;
  selectedLlamaModel?: string;
  useBridgeTools?: boolean;

  chats: Chat[];
  setChats: React.Dispatch<React.SetStateAction<Chat[]>>;
  currentChatId: string | null;
  setCurrentChatId: (v: string | null) => void;
  isWebSearchEnabled: boolean;
  isDeepSearchEnabled: boolean;
  setIsDeepSearchEnabled: (v: boolean) => void;
  researchMode: any;
  isVoiceListening: boolean;
  stopVoiceDictation: () => void;
  attachedFiles: File[];
  setAttachedFiles: React.Dispatch<React.SetStateAction<File[]>>;
  attachedUrlDocs: any[];
  setAttachedUrlDocs: React.Dispatch<React.SetStateAction<any[]>>;
  isPlusMenuOpen: boolean;
  setIsPlusMenuOpen: (v: boolean) => void;
  isUrlToolOpen: boolean;
  setIsUrlToolOpen: (v: boolean) => void;
  urlToolInput: string;
  setUrlToolInput: (v: string) => void;
  urlToolLoading: boolean;
  setUrlToolLoading: (v: boolean) => void;
  urlToolError: string | null;
  setUrlToolError: (v: string | null) => void;
  isTranscriptToolOpen: boolean;
  setIsTranscriptToolOpen: (v: boolean) => void;
  isTranscriptToolMinimized: boolean;
  setIsTranscriptToolMinimized: (v: boolean) => void;
  transcriptToolInput: string;
  setTranscriptToolInput: (v: string) => void;
  transcriptToolLoading: boolean;
  setTranscriptToolLoading: (v: boolean) => void;
  transcriptToolError: string | null;
  setTranscriptToolError: (v: string | null) => void;
  transcriptToolProgress: number;
  setTranscriptToolProgress: (v: number) => void;
  transcriptToolStatus: string;
  setTranscriptToolStatus: (v: string) => void;
  setTranscriptionOptionsDoc: (v: any) => void;
  setActiveArtifact: (v: any) => void;
  setIsCanvasOpen: (v: boolean) => void;
  setCanvasView: (v: any) => void;
  showToast: (v: string) => void;

  isCoderMode: boolean;
  setIsCoderMode: (v: boolean) => void;
  isCoderWorkspacePanelOpen: boolean;
  setIsCoderWorkspacePanelOpen: (v: boolean) => void;
  activeAssistantMode: string;
  activeCommandType: string | null;
  activeCommandQuery: string | null;
  setActiveCommandType: (v: string | null) => void;
  setActiveCommandQuery: (v: string | null) => void;
  coderTodos: any[];
  setCoderTodos: React.Dispatch<React.SetStateAction<any[]>>;
  isGeneratingTodos: boolean;
  setIsGeneratingTodos: (v: boolean) => void;
  showTodoPanel: boolean;
  setShowTodoPanel: (v: boolean) => void;
  todoCollapsed: boolean;
  setTodoCollapsed: (v: boolean) => void;
  orchestrationState: any;
  setOrchestrationState: React.Dispatch<React.SetStateAction<any>>;

  setIsSidebarOpen: (v: boolean) => void;

  coderWorkspacePath: string;
  triggerWorkspaceRefresh: () => void;

  scrapingResults: Map<string, any>;
  setScrapingResults: React.Dispatch<React.SetStateAction<Map<string, any>>>;
  setActiveScrapingJobs: React.Dispatch<React.SetStateAction<Set<string>>>;
  wikiResults: Map<string, any>;
  setWikiResults: React.Dispatch<React.SetStateAction<Map<string, any>>>;

  localElementAttachments: any[];
  setLocalElementAttachments: React.Dispatch<React.SetStateAction<any[]>>;

  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  abortControllerRef: React.RefObject<AbortController | null>;

  setAskAiQuestions: (v: any[]) => void;
  setCurrentQuestionIndex: (v: number) => void;
  setAskAiAnswers: (v: any) => void;
  setShowAskAiPanel: (v: boolean) => void;
  createNewChat: (projId?: string | null, isCoder?: boolean, isResearch?: boolean, agentId?: string | null) => string;

  buildActiveTools: () => any[];
  coderPermissionMode: CoderPermissionMode;
  alwaysAllowedCommands: string[];
  setAlwaysAllowedCommands: React.Dispatch<React.SetStateAction<string[]>>;
  requestCommandPermission: (command: string, reason: string) => Promise<'allow-once' | 'allow-always' | 'deny'>;
  logPermissionAction: (entry: { command?: string; action: string; detail?: string; mode?: CoderPermissionMode }) => void;
  luminaConvex?: any;
}

const isLikelyCoderTask = (message: string) => {
  const trimmed = message.trim().toLowerCase();
  if (!trimmed) return false;
  if (trimmed.startsWith('/coder')) return true;
  if (trimmed.length <= 24 && /^(hi|hey|hello|yo|sup|thanks|thank you|ok|okay|yes|no|hmm|hmmm|test)[!.? ]*$/.test(trimmed)) {
    return false;
  }

  const coderTriggers = [
    'build', 'create', 'make', 'implement', 'add', 'fix', 'debug', 'repair',
    'change', 'modify', 'update', 'edit', 'refactor', 'remove', 'delete',
    'file', 'folder', 'component', 'page', 'app', 'website', 'ui', 'bug',
    'error', 'stack trace', 'typescript', 'css', 'html', 'react', 'electron',
    'server', 'api', 'database', 'route', 'function', 'class', 'import',
    'install', 'package', 'dependency', 'run', 'test', 'lint'
  ];

  return coderTriggers.some(trigger => trimmed.includes(trigger));
};

const ORCHESTRATION_TRIGGERS = [
  'full app', 'entire', 'complete project', 'everything', 'end-to-end',
  'full-stack', 'full stack', 'whole thing', 'the whole', 'from scratch', 'build me a',
  'create a complete', 'scaffold', 'production ready', 'deploy',
  'walkthrough', 'walk through', 'sub-agent', 'subagent', 'big feature', 'big project', 'complex app', 'complex project'
];

const shouldActivateOrchestration = (msg: string): boolean => {
  const lower = msg.toLowerCase();
  return ORCHESTRATION_TRIGGERS.some(trigger => lower.includes(trigger));
};

const loadCustomSkillsFromStorage = () => {
  try {
    const saved = localStorage.getItem('lumina_custom_skills');
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Failed to parse custom skills from localStorage:', error);
    return [];
  }
};

const findSkillMarkdownNode = (skill: any) => {
  if (!skill?.tree || !Array.isArray(skill.tree)) return null;
  return skill.tree.find((node: any) => node?.type === 'file' && String(node.name || '').toLowerCase() === 'skill.md') || null;
};

const buildSkillExecutionPayload = (skill: any, inputVal: string) => {
  const skillMd = findSkillMarkdownNode(skill);
  const referencesFolder = Array.isArray(skill?.tree)
    ? skill.tree.find((node: any) => node?.type === 'folder' && String(node.name || '').toLowerCase() === 'references')
    : null;
  const scriptsFolder = Array.isArray(skill?.tree)
    ? skill.tree.find((node: any) => node?.type === 'folder' && String(node.name || '').toLowerCase() === 'scripts')
    : null;

  return {
    skillId: skill.id,
    skillLabel: skill.name || skill.id,
    description: skill.description || '',
    trigger: skill.trigger || '',
    input: inputVal,
    mode: 'read_skill_context',
    markdown: skillMd?.content || '',
    files: Array.isArray(skill?.tree)
      ? skill.tree.map((node: any) => ({
          name: node?.name || '',
          type: node?.type || 'file'
        }))
      : [],
    references: Array.isArray(referencesFolder?.children)
      ? referencesFolder.children.map((node: any) => node?.name || '').filter(Boolean)
      : [],
    scripts: Array.isArray(scriptsFolder?.children)
      ? scriptsFolder.children.map((node: any) => node?.name || '').filter(Boolean)
      : [],
    instructions: [
      `Read the SKILL.md content as the primary operating procedure for "${skill.name || skill.id}".`,
      'This tool loads skill context for the AI. It does not execute a separate built-in runtime skill.',
      'Read any referenced files from the virtual .lumina/skills directory if the skill says they are needed.',
      'Treat this as a reusable workflow and knowledge source, not as a single static prefix prompt.',
      'Follow the procedure, constraints, and verification guidance described by the skill.'
    ]
  };
};

const isHeavySkillTask = (content: string) => {
  const lower = String(content || '').toLowerCase();
  return [
    'build', 'implement', 'refactor', 'debug', 'research', 'architecture',
    'complex', 'multi-file', 'large', 'deep', 'workflow', 'analyze', 'fix'
  ].some((marker) => lower.includes(marker));
};

const DDG_SEQUENTIAL_DELAY_MS = 5000;

const isOllamaSearchEnabledForCurrentProvider = (selectedProvider?: string) => {
  try {
    const toggleEnabled = localStorage.getItem('lumina_ollama_web_search_enabled') === 'true';
    if (!toggleEnabled) return false;

    const providerId = String(
      selectedProvider || localStorage.getItem('lumina_provider') || ''
    ).toLowerCase();

    return providerId === 'ollama_local' || providerId === 'ollama_cloud';
  } catch {
    return false;
  }
};

const runPreferredWebSearch = async ({
  content,
  tavilyApiKey,
  serpApiKey,
  searchProvider,
  selectedProvider,
  apiKey,
  signal,
}: {
  content: string;
  tavilyApiKey: string;
  serpApiKey: string;
  searchProvider: string;
  selectedProvider?: string;
  apiKey?: string;
  signal?: AbortSignal;
}) => {
  const useOllamaSearch = isOllamaSearchEnabledForCurrentProvider(selectedProvider);
  const response = await fetch(useOllamaSearch ? '/api/ollama/web-search' : '/api/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(
      useOllamaSearch
        ? {
            query: content,
            apiKey,
          }
        : {
            query: content,
            tavilyKey: tavilyApiKey,
            serpKey: serpApiKey,
            provider: searchProvider,
          }
    ),
    signal
  });

  if (!response.ok) {
    return {
      ok: false,
      results: [],
      provider: useOllamaSearch ? 'Ollama Web Search' : 'Search'
    };
  }

  const data = await response.json();
  return {
    ok: true,
    results: data.results || [],
    provider: data.provider || (useOllamaSearch ? 'Ollama Web Search' : 'Search')
  };
};

export function useAppHandlers(params: UseAppHandlersParams) {
  const {
    input, setInput,
    isTyping, setIsTyping,
    activeSkills,
    showsSlashCommands, filteredCommands,
    selectedCommandIndex, setSelectedCommandIndex,
    setTypingMessageId,
    callLlamaBridge,
    persona, writingStyle, useTurboQuant,
    tavilyApiKey, serpApiKey, searchProvider,
    selectedModel, activeModelId, activeModelList,
    serverUrl, apiKey, selectedProvider,
    llamaBridgeUrl, llamaBridgeApiKey, selectedLlamaModel,
    useBridgeTools,
    chats, setChats,
    currentChatId, setCurrentChatId,
    isWebSearchEnabled,
    isDeepSearchEnabled, setIsDeepSearchEnabled,
    researchMode,
    isVoiceListening, stopVoiceDictation,
    attachedFiles, setAttachedFiles,
    attachedUrlDocs, setAttachedUrlDocs,
    isPlusMenuOpen, setIsPlusMenuOpen,
    isUrlToolOpen, setIsUrlToolOpen,
    urlToolInput, setUrlToolInput,
    urlToolLoading, setUrlToolLoading,
    urlToolError, setUrlToolError,
    isTranscriptToolOpen, setIsTranscriptToolOpen,
    transcriptToolInput, setTranscriptToolInput,
    transcriptToolLoading, setTranscriptToolLoading,
    transcriptToolError, setTranscriptToolError,
    transcriptToolProgress, setTranscriptToolProgress,
    transcriptToolStatus, setTranscriptToolStatus,
    setTranscriptionOptionsDoc,
    setActiveArtifact, setIsCanvasOpen, setCanvasView,
    showToast,
    isCoderMode, setIsCoderMode,
    isCoderWorkspacePanelOpen, setIsCoderWorkspacePanelOpen,
    activeAssistantMode,
    activeCommandType, activeCommandQuery,
    setActiveCommandType, setActiveCommandQuery,
    coderTodos, setCoderTodos,
    isGeneratingTodos, setIsGeneratingTodos,
    showTodoPanel, setShowTodoPanel,
    todoCollapsed, setTodoCollapsed,
    orchestrationState, setOrchestrationState,
    setIsSidebarOpen,
    coderWorkspacePath, triggerWorkspaceRefresh,
    scrapingResults, setScrapingResults,
    setActiveScrapingJobs,
    wikiResults, setWikiResults,
    localElementAttachments, setLocalElementAttachments,
    inputRef, abortControllerRef,
    setAskAiQuestions, setCurrentQuestionIndex,
    setAskAiAnswers, setShowAskAiPanel,
    createNewChat,
    buildActiveTools,
    coderPermissionMode,
    alwaysAllowedCommands,
    setAlwaysAllowedCommands,
    requestCommandPermission,
    logPermissionAction
    , luminaConvex
  } = params;

  const coderPermissionModeRef = React.useRef(coderPermissionMode);
  const alwaysAllowedCommandsRef = React.useRef(alwaysAllowedCommands);
  const piAgentCacheRef = useRef<Map<string, PiAgentInstance>>(new Map());

  useEffect(() => {
    coderPermissionModeRef.current = coderPermissionMode;
  }, [coderPermissionMode]);

  useEffect(() => {
    alwaysAllowedCommandsRef.current = alwaysAllowedCommands;
  }, [alwaysAllowedCommands]);

  const retrieveAndRecallMemories = useCallback((userQuery: string): { systemPromptAddendum: string; matchedMemories: any[] } => {
    let records: any[] = [];
    try {
      const raw = localStorage.getItem('lumina_memory_records');
      if (raw) records = JSON.parse(raw);
    } catch (e) {
      console.error('Failed to parse memories for recall', e);
    }

    if (!records || records.length === 0) {
      return { systemPromptAddendum: '', matchedMemories: [] };
    }

    const activeRecords = records.filter(r => r.lifecycle !== 'archived' && r.lifecycle !== 'pruned');
    const queryWords = userQuery.toLowerCase().split(/[\s,.:;?!#@()\'\"]+/).filter(w => w.length > 3);
    
    const stopWords = new Set([
      'this', 'that', 'with', 'from', 'your', 'have', 'what', 'some', 'about', 'would', 'could', 'should',
      'there', 'their', 'them', 'then', 'than', 'were', 'been', 'will', 'make', 'just', 'more', 'much',
      'here', 'there', 'want', 'need', 'like', 'good', 'well', 'know', 'think', 'find', 'take', 'come',
      'create', 'build', 'using', 'please', 'help', 'show', 'view', 'open', 'close', 'edit', 'inside', 'index'
    ]);

    const matchedMemories: any[] = [];

    activeRecords.forEach(mem => {
      const contentLower = mem.content.toLowerCase();
      let isMatch = false;

      if (queryWords.length > 0) {
        if (contentLower.includes(userQuery.toLowerCase().trim())) {
          isMatch = true;
        } else {
          let overlapCount = 0;
          for (const word of queryWords) {
            if (!stopWords.has(word) && contentLower.includes(word)) {
              overlapCount++;
            }
          }
          if (queryWords.length <= 2 && overlapCount >= 1) {
            isMatch = true;
          } else if (queryWords.length > 2 && overlapCount >= 2) {
            isMatch = true;
          }
        }
      }

      if (isMatch) {
         matchedMemories.push(mem);
      }
    });

    if (matchedMemories.length === 0) {
      return { systemPromptAddendum: '', matchedMemories: [] };
    }

    const segmentPriority: Record<string, number> = {
      identity: 0.18,
      correction: 0.16,
      preference: 0.14,
      project: 0.12,
      knowledge: 0.1,
      relationship: 0.08,
      context: 0.04,
    };

    matchedMemories.sort((a, b) => {
      const aTierBonus = a.tier === 'permanent' ? 0.35 : a.tier === 'long' ? 0.18 : 0;
      const bTierBonus = b.tier === 'permanent' ? 0.35 : b.tier === 'long' ? 0.18 : 0;
      const aRecencyBoost = a.lastAccessedAt ? Math.max(0, 0.12 - ((Date.now() - a.lastAccessedAt) / 86_400_000) * 0.01) : 0;
      const bRecencyBoost = b.lastAccessedAt ? Math.max(0, 0.12 - ((Date.now() - b.lastAccessedAt) / 86_400_000) * 0.01) : 0;
      const aScore = (a.importance || 0.5) * 2.4 + (a.decay || a.decayRate || 0) + (a.accessCount || 0) * 0.14 + aTierBonus + (segmentPriority[a.segment] || 0) + aRecencyBoost;
      const bScore = (b.importance || 0.5) * 2.4 + (b.decay || b.decayRate || 0) + (b.accessCount || 0) * 0.14 + bTierBonus + (segmentPriority[b.segment] || 0) + bRecencyBoost;
      return bScore - aScore;
    });

    const topMemories = matchedMemories.slice(0, 5);

    topMemories.forEach(mem => {
      const mId = mem.memoryId || mem.id;
      if (mId && luminaConvex?.recallMemory) {
        luminaConvex.recallMemory(mId);
      }
      
      if (luminaConvex?.addEvent) {
        const snippet = mem.content.length > 50 ? mem.content.substring(0, 50) + '...' : mem.content;
        luminaConvex.addEvent('memory.recalled', 'Main Chat', `Recalled memory: "${snippet}"`, { memoryId: mId });
      }
    });

    let addendum = `\n\n=== 🧠 RECALLED MEMORIES ABOUT USER/PROJECT (REAL-TIME CONTEXT) ===
You have recalled the following structured memories from your memory vault. These are objective facts, user preferences, corrections, or relationship parameters. Use them to customize your behaviour and provide a highly personalized, evolved experience. Keep in mind that some might be project-specific or stylistic:`;
    
    topMemories.forEach((mem, idx) => {
      addendum += `\n${idx + 1}. [Segment: ${mem.segment}, Tier: ${mem.tier}] ${mem.content}`;
    });
    addendum += `\n\nEnsure you respect these preferences implicitly without necessarily stating "I retrieved this from memory" unless the user asks how you knew.`;

    return { systemPromptAddendum: addendum, matchedMemories: topMemories };
  }, [luminaConvex]);

  const triggerBackgroundMemoryExtraction = useCallback(async (userContent: string, assistantContent: string) => {
    if (!userContent || !assistantContent || assistantContent.length < 10) return;

    try {
      console.log('[LUMINA_DEBUG] Running background Cognitive Memory Extractor...');

      const extractionPrompt = [
        {
          role: 'system',
          content: `You are the Cognitive Memory Consolidation Processor for the Lumina AI agent.
Your job is to analyze the preceding single conversational turn (the user's request and the assistant's response) and extract only key, durable memories that should survive beyond the current moment.

Focus strictly on high-value facts:
- **identity**: Facts about who the user is, their job, goals, background, habits.
- **preference**: Style, framing, coding conventions, themes (e.g. prefers Tailwind, Inter font, Space Grotesk, Cosmic slate theme, etc.).
- **relationship**: How they interact, their sentiment or inside jokes, nickname preferences, expectations.
- **project**: Current file structures, app goals, target functionality being built, tech stack decisions.
- **knowledge**: Critical domain knowledge or solutions discovered in the turn.
- **correction**: Direct instructions to fix something, changes in styling, or behavioral rules.

Treat memory like a human brain:
- store only things likely to matter again
- prefer fewer, sharper memories over many weak ones
- avoid one-off details unless they clearly affect future behavior
- repeated corrections, stable preferences, identity facts, and recurring project constraints are especially valuable

Tier selection rules:
- "short": useful soon, but may fade if not referenced again
- "long": likely useful across multiple future turns or the whole project
- "permanent": core identity, stable preferences, critical corrections, or truths that should rarely be forgotten

Only choose "permanent" when the information is central and durable. Do not mark ordinary temporary work details as permanent.

Do NOT extract trivial conversational filler, general greetings, or temporary questions. Do NOT store throwaway one-turn planning unless it defines an ongoing project constraint.

You must respond with a JSON array under the "memories" key. Each memory object must have:
- "content": A concise declarative sentence expressing the memory (e.g. "User prefers a Swiss minimal dark aesthetic for their dashboards.").
- "segment": "identity" | "preference" | "relationship" | "project" | "knowledge" | "correction" | "context"
- "tier": "short" | "long" | "permanent"

If no durable memories are found, return an empty array.

Return EXACTLY JSON in this format (do not include any conversational text or markdown wrap, just the raw JSON):
{
  "memories": [
    {
      "content": "User prefers Inter font paired with Space Grotesk headings.",
      "segment": "preference",
      "tier": "long"
    }
  ]
}`
        },
        {
          role: 'user',
          content: `CONVERSATION TURN TO ANALYZE:
[USER]: "${userContent.replace(/"/g, '\\"')}"
[ASSISTANT]: "${assistantContent.substring(0, 1500).replace(/"/g, '\\"')}${assistantContent.length > 1500 ? '... [truncated for token safety]' : ''}"`
        }
      ];

      const res = await callLlamaBridge(extractionPrompt, []);
      let text = res?.choices?.[0]?.message?.content || '';
      // Clean XML tool call artifacts from minimax-style models
      text = text
        .replace(/minimax:tool_call\s*/gi, '')
        .replace(/<invoke[\s\S]*?<\/invoke>/gi, '')
        .replace(/^\s*text\s*$/gm, '')
        .replace(/^\s*Copy\s*$/gm, '')
        .trim();
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        if (Array.isArray(parsed.memories) && parsed.memories.length > 0) {
          console.log('[LUMINA_DEBUG] Extracted memories from turn, running critique panel:', parsed.memories);

          // Build critique prompt
          const critiquePrompt = [
            {
              role: 'system',
              content: `You are the Cognitive Memory Critique Panel, consisting of two specialized agents:
1. **Agent A (Proponent)**: Argues for saving the memory, explaining how it uniquely personalizes the agent, helps form its core persona, and provides long-term utility.
2. **Agent B (Opponent/Critic)**: Challenges the memory, criticizing it if it is generic, a throwaway one-off detail, redundant, or a "one-liner" (too short/simple) that lacks enough rich descriptive context to actually shape the agent's personality.

One-Liner Rule:
- Opponent MUST veto any generic "one-liner" memories (e.g. "User likes JavaScript", "User prefers dark mode") unless it is a simple, indisputable atomic fact (like a user's nickname, location, or timezone). If it is a preference, correction, or project knowledge, it must be descriptive and contextualized (explaining *why* or *how* it applies) so the LLM can gain proper personality.

You will analyze the candidate memories extracted from the conversation turn and output a JSON object indicating which memories are approved for saving.

For each memory:
- Print the discussion/arguments between Agent A and Agent B.
- Provide a final consensus verdict: true (keep) or false (discard/critique failed). If approved, you may also output a "refinedContent" string with a richer, more descriptive version of the memory (incorporating context from the conversation to ensure it isn't a simple generic one-liner).

Return EXACTLY JSON in this format (do not include any conversational text or markdown wrap, just the raw JSON):
{
  "critiques": [
    {
      "originalContent": "User prefers React.",
      "discussion": "Agent A: Framework preference is useful. Agent B: Too generic. Refine to specify styling or project details. Verdict: Approved after refining.",
      "approved": true,
      "refinedContent": "User prefers React for frontend projects, particularly building custom UI layouts with Tailwind and Framer Motion."
    }
  ]
}`
            },
            {
              role: 'user',
              content: `CONVERSATION TURN CONTEXT:
[USER]: "${userContent.replace(/"/g, '\\"')}"
[ASSISTANT]: "${assistantContent.substring(0, 1000).replace(/"/g, '\\"')}"

CANDIDATE MEMORIES TO CRITIQUE:
${JSON.stringify(parsed.memories, null, 2)}`
            }
          ];

          const critiqueRes = await callLlamaBridge(critiquePrompt, []);
          let critiqueText = critiqueRes?.choices?.[0]?.message?.content || '';
          critiqueText = critiqueText
            .replace(/minimax:tool_call\s*/gi, '')
            .replace(/<invoke[\s\S]*?<\/invoke>/gi, '')
            .replace(/^\s*text\s*$/gm, '')
            .replace(/^\s*Copy\s*$/gm, '')
            .trim();
          
          let approvedMemories = parsed.memories;
          const critiqueMatch = critiqueText.match(/\{[\s\S]*\}/);
          if (critiqueMatch) {
            try {
              const critiqueData = JSON.parse(critiqueMatch[0]);
              if (Array.isArray(critiqueData.critiques)) {
                approvedMemories = parsed.memories.map((rawMem: any) => {
                  const crit = critiqueData.critiques.find((c: any) => c.originalContent === rawMem.content || c.originalContent?.trim() === rawMem.content?.trim());
                  if (crit && !crit.approved) {
                    console.log(`[LUMINA_DEBUG] Memory rejected by critique: "${rawMem.content}" - Discussion: ${crit.discussion}`);
                    return null;
                  }
                  if (crit && crit.approved) {
                    console.log(`[LUMINA_DEBUG] Memory approved/refined by critique: "${rawMem.content}" -> "${crit.refinedContent || rawMem.content}"`);
                    return {
                      ...rawMem,
                      content: crit.refinedContent || rawMem.content
                    };
                  }
                  return rawMem;
                }).filter(Boolean);
              }
            } catch (err) {
              console.warn('[LUMINA_DEBUG] Failed to parse critique response, falling back to original memories:', err);
            }
          }

          for (const rawMem of approvedMemories) {
            if (!rawMem.content || !rawMem.content.trim()) continue;

            const generatedId = `mem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
            const generatedUuid = `uuid_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
            
            const tierVal = ['short', 'long', 'permanent'].includes(rawMem.tier) ? rawMem.tier : 'long';
            const segmentVal = ['identity', 'preference', 'relationship', 'project', 'knowledge', 'correction', 'context'].includes(rawMem.segment) ? rawMem.segment : 'knowledge';

            const importanceByTier: Record<string, number> = {
              short: 0.58,
              long: 0.78,
              permanent: 0.94,
            };

            const compatMem = {
              id: generatedId,
              decay: tierVal === 'permanent' ? 0.99 : tierVal === 'long' ? 0.85 : 0.6,
              lastAccessed: Date.now(),
              agentId: null,
              memoryId: generatedUuid,
              content: rawMem.content.trim(),
              tier: tierVal,
              segment: segmentVal,
              decayRate: tierVal === 'short'
                ? 0.0005
                : tierVal === 'long'
                  ? 0.00015
                  : (segmentVal === 'identity' ? 0.0000228 : 0.000114),
              accessCount: 0,
              lastAccessedAt: Date.now(),
              lifecycle: 'active',
              source: 'conversation',
              createdAt: Date.now(),
            };

            if (luminaConvex?.addMemory) {
              await luminaConvex.addMemory(compatMem);
            } else {
              try {
                const currentRecordsRaw = localStorage.getItem('lumina_memory_records');
                const currentRecords = currentRecordsRaw ? JSON.parse(currentRecordsRaw) : [];
                currentRecords.unshift(compatMem);
                localStorage.setItem('lumina_memory_records', JSON.stringify(currentRecords));
              } catch (err) {
                console.error('Local fallback saving failed', err);
              }
            }

            if (luminaConvex?.addEvent) {
              const snippet = compatMem.content.length > 40 ? compatMem.content.substring(0, 40) + '...' : compatMem.content;
              
              await luminaConvex.addEvent(
                'memory.extracted',
                'Cognitive Extractor',
                `Extracted new raw perception: "${snippet}"`,
                { memoryId: compatMem.id, segment: segmentVal }
              );

              await luminaConvex.addEvent(
                'memory.written', 
                'Cognitive Extractor',
                `Successfully consolidated and stored memory about user: [Segment: ${segmentVal}]`,
                { memoryId: compatMem.id, tier: tierVal }
              );
            }
          }

          if (showToast) {
            showToast(`🧠 Lumina consolidated ${parsed.memories.length} new memory insights.`);
          }
        }
      }
    } catch (err) {
      console.warn('[LUMINA_DEBUG] Background memory extraction error or JSON parsing failure:', err);
    }
  }, [luminaConvex, callLlamaBridge, showToast]);

  const handleClearChat = () => {
    setChats(prev => prev.map(chat => {
      if (chat.id === currentChatId) {
        return {
          ...chat,
          messages: [],
          updatedAt: new Date()
        };
      }
      return chat;
    }));
    showToast("Chat cleared successfully!");
  };

  /**
   * Run a coder task using the pi agent SDK
   * This replaces the manual callLlamaBridge + tool execution loop
   */
  const runCoderTaskWithPiAgent = async (params: {
    chatId: string;
    thinkingId: string;
    task: string;
    systemPrompt: string;
    coderWorkspacePath: string;
    apiKey?: string;
    modelId?: string;
    provider?: string;
    baseUrl?: string;
    signal?: AbortSignal;
  }) => {
    const {
      chatId,
      thinkingId,
      task,
      systemPrompt,
      coderWorkspacePath,
      apiKey,
      modelId,
      provider,
      baseUrl,
      signal,
    } = params;

    // Create or reuse pi agent instance
    const cachedAgentKey = `${coderWorkspacePath}:${modelId || 'default'}:${provider || 'anthropic'}`;
    let agentInstance = piAgentCacheRef.current.get(cachedAgentKey);

    if (!agentInstance) {
      try {
        agentInstance = await createCoderPiAgent({
          workspacePath: coderWorkspacePath,
          apiKey,
          model: {
            id: modelId || 'anthropic/claude-sonnet-4-20250514',
            provider: provider || 'anthropic',
            baseUrl: baseUrl || 'https://api.anthropic.com',
          },
          systemPrompt,
          thinkingLevel: 'high',
        });
        piAgentCacheRef.current.set(cachedAgentKey, agentInstance);
      } catch (error) {
        console.error('[PiAgent] Failed to create coder agent:', error);
        throw error;
      }
    }

    const toolCallNodes: ToolCallNode[] = [];
    let loopCount = 0;
    const maxLoops = 20;

    let targetContent = '';
    let displayedContent = '';
    let targetThinkContent = '';
    let displayedThinkContent = '';
    let currentToolCalls: ToolCallNode[] = [];
    let isDone = false;
    let finalEventResultText: string | undefined = undefined;
    let lastToolCallsJson = '';
    let typingInterval: any;

    // Helper to get tool category
    const getToolCategory = (name: string): ToolCallNode['toolCategory'] => {
      if (name === 'read_file' || name === 'glob_tool' || name === 'grep_tool' || name === 'analyze_file' || name === 'list_directory') return 'read';
      if (name === 'write_file' || name === 'edit_file' || name === 'create_file' || name === 'delete_file' || name === 'rename_file') return 'write';
      if (name === 'run_command' || name === 'run_build' || name === 'run_test') return 'execute';
      if (name === 'analyze_file' || name === 'inspect_code') return 'discovery';
      if (name === 'spawn_subagent' || name === 'delegate_task') return 'delegate';
      if (name === 'web_scrape' || name === 'web_search' || name === 'search' || name === 'visit') return 'web';
      if (name === 'ask_user' || name === 'manage_todos') return 'workflow';
      if (name.startsWith('wiki_')) return 'web';
      return 'read';
    };

    // Helper to get icon for tool
    const getToolIcon = (name: string): string => {
      if (name === 'web_scrape' || name === 'search' || name === 'web_search') return 'globe';
      if (name === 'glob_tool' || name === 'list_directory') return 'file';
      if (name === 'grep_tool') return 'search';
      if (name === 'read_file') return 'file';
      if (name === 'write_file' || name === 'create_file') return 'write';
      if (name === 'edit_file') return 'edit';
      if (name === 'analyze_file') return 'code';
      if (name === 'run_command' || name === 'run_build' || name === 'run_test') return 'terminal';
      if (name === 'delete_file') return 'terminal';
      if (name === 'rename_file') return 'edit';
      if (name === 'spawn_subagent' || name.startsWith('composio_')) return 'puzzle';
      if (name.includes('grep') || name.includes('search') || name.includes('subtask')) return 'search';
      if (name.includes('read') || name.includes('file')) return 'file';
      if (name.includes('edit') || name.includes('create')) return 'edit';
      return 'sparkles';
    };

    // Event handler for pi agent
    const handlePiEvent = async (event: PiAgentEvent) => {
      switch (event.type) {
        case 'tool_call_start': {
          loopCount++;
          const toolName = event.toolName;
          const normalizedArgPath = event.args?.filePath || '';

          const displayLabel =
            toolName === 'run_command' ? `Run command (${String(event.args?.command || '').trim() || 'shell'})` :
            toolName === 'read_file' ? `Read file ${normalizedArgPath ? `(${normalizedArgPath})` : ''}` :
            toolName === 'write_file' ? `Write file ${normalizedArgPath ? `(${normalizedArgPath})` : ''}` :
            toolName === 'create_file' ? `Create file ${normalizedArgPath ? `(${normalizedArgPath})` : ''}` :
            toolName === 'delete_file' ? `Delete file ${normalizedArgPath ? `(${normalizedArgPath})` : ''}` :
            toolName === 'rename_file' ? `Rename file` :
            toolName === 'glob_tool' ? `Find files (${String(event.args?.fileGlob || '*').trim()})` :
            toolName === 'grep_tool' ? `Search code (${String(event.args?.query || '').trim()})` :
            toolName === 'analyze_file' ? `Analyze file ${normalizedArgPath ? `(${normalizedArgPath})` : ''}` :
            toolName === 'web_scrape' ? `Web scrape (${event.args?.url || 'url'})` :
            toolName === 'search' ? `Web search` :
            toolName === 'current_time' ? 'Get current time' :
            toolName;

          const node: ToolCallNode = {
            id: event.toolCallId || `pi-${loopCount}-${Date.now().toString(36)}`,
            type: 'tool',
            label: displayLabel,
            status: 'active',
            toolName,
            toolCategory: getToolCategory(toolName),
            icon: getToolIcon(toolName),
            filePath: normalizedArgPath,
            args: event.args,
          };

          toolCallNodes.push(node);
          currentToolCalls = [...toolCallNodes];

          // Append tool call marker immediately to targetContent
          targetContent = targetContent + (targetContent ? '\n\n' : '') + `[[tool_call:${node.id}]]`;

          // Sequential TODO advancement: on each tool call start, ensure
          // the first pending task is activated (if none is in_progress yet).
          setCoderTodos(prev => {
            const hasInProgress = prev.some(t => t.status === 'in_progress');
            if (!hasInProgress) {
              const firstPendingIdx = prev.findIndex(t => t.status === 'pending');
              if (firstPendingIdx !== -1) {
                return prev.map((item, idx) =>
                  idx === firstPendingIdx ? { ...item, status: 'in_progress' } : item
                );
              }
            }
            return prev;
          });
          break;
        }

        case 'tool_call_end': {
          const node = toolCallNodes.find(n => n.id === event.toolCallId) || 
                       toolCallNodes.find(n => n.id.startsWith('pi-') && n.status === 'active') || 
                       toolCallNodes[toolCallNodes.length - 1];
          if (node) {
            node.status = event.result?.error ? 'failed' : 'complete';

            // Handle result
            const result = event.result;
            if (result) {
              node.result = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
              if (result.filePath && (result.action === 'created_file' || result.action === 'updated_file' || result.action === 'written' || result.oldContent !== undefined || result.newContent !== undefined)) {
                node.filePath = result.filePath;
                if (result.addedCount !== undefined) {
                  node.addedCount = result.addedCount;
                  node.removedCount = result.removedCount;
                }
                if (result.oldContent !== undefined) {
                  node.oldContent = result.oldContent;
                }
                if (result.newContent !== undefined) {
                  node.newContent = result.newContent;
                }
                triggerWorkspaceRefresh();
              }
              if (result.success) {
                node.resultSummary = result.action || 'Success';
              } else if (result.error) {
                node.resultSummary = result.error;
              } else {
                node.resultSummary = typeof result === 'string' ? result.slice(0, 100) : JSON.stringify(result).slice(0, 100);
              }
            }
            currentToolCalls = [...toolCallNodes];

            // Sequential TODO advancement: when a tool call completes successfully,
            // mark the current in_progress todo as complete and start the next pending one,
            // then rewrite TODO.md with live [x]/[~]/[ ] checkboxes.
            if (node.status === 'complete') {
              setCoderTodos(prev => {
                const inProgressIdx = prev.findIndex(t => t.status === 'in_progress');
                if (inProgressIdx === -1) return prev;

                const updated = prev.map((item, idx) => {
                  if (idx === inProgressIdx) return { ...item, status: 'complete' as const };
                  if (idx === inProgressIdx + 1 && item.status === 'pending') return { ...item, status: 'in_progress' as const };
                  return item;
                });

                // Rewrite TODO.md with live status indicators
                const todoContent =
                  '# Tasks Checklist\n\n' +
                  updated
                    .map(t => {
                      const prefix =
                        t.status === 'complete' ? '[x]' :
                        t.status === 'in_progress' ? '[~]' :
                        t.status === 'failed' ? '[!]' : '[ ]';
                      return `- ${prefix} ${t.text || (t as any).content || ''}`;
                    })
                    .join('\n') + '\n';

                const workspaceArg = coderWorkspacePath ? { workspaceRoot: coderWorkspacePath } : {};
                const fullPath = coderWorkspacePath
                  ? `${coderWorkspacePath.replace(/\\/g, '/')}/TODO.md`
                  : './TODO.md';

                fetch('/api/fs/write', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ filePath: fullPath, content: todoContent, ...workspaceArg }),
                }).catch(err => console.warn('[TODO.md] Failed to update:', err));

                return updated;
              });
            }
          }
          break;
        }

        case 'text': {
          targetContent += event.content || '';
          break;
        }

        case 'thinking': {
          targetThinkContent += event.content || '';
          break;
        }

        case 'done': {
          finalEventResultText = event.result?.text;
          isDone = true;
          triggerWorkspaceRefresh();
          break;
        }

        case 'error': {
          targetContent = targetContent + (targetContent ? '\n\n' : '') + `❌ **Error**: ${event.error}`;
          isDone = true;
          break;
        }
      }
    };

    const getNextChunk = (displayed: string, target: string): string => {
      if (displayed.length >= target.length) return '';

      const diff = target.length - displayed.length;
      const nextSlice = target.slice(displayed.length);

      // Check if the next part is a tool call marker
      const toolCallMatch = nextSlice.match(/^\[\[tool_call:[^\]]+\]\]/);
      if (toolCallMatch) {
        return toolCallMatch[0];
      }

      // Determine characters to add (proportional catch-up)
      let charsToAdd = 1;
      if (diff > 500) {
        charsToAdd = Math.ceil(diff / 6);
      } else if (diff > 100) {
        charsToAdd = Math.ceil(diff / 10);
      } else if (diff > 20) {
        charsToAdd = Math.ceil(diff / 15);
      }

      let chunk = nextSlice.slice(0, charsToAdd);
      const openBracketIndex = chunk.indexOf('[[');
      if (openBracketIndex !== -1) {
        if (openBracketIndex === 0) {
          const closingIndex = nextSlice.indexOf(']]');
          if (closingIndex !== -1) {
            return nextSlice.slice(0, closingIndex + 2);
          } else if (!isDone) {
            return ''; // Wait for full marker
          }
          chunk = nextSlice.slice(0, charsToAdd);
        } else {
          chunk = chunk.slice(0, openBracketIndex);
        }
      }
      return chunk;
    };

    const runPromise = new Promise<void>((resolve) => {
      typingInterval = setInterval(() => {
        let contentChanged = false;
        let thinkContentChanged = false;

        // 1. Catch up text content
        if (displayedContent.length < targetContent.length) {
          const chunk = getNextChunk(displayedContent, targetContent);
          if (chunk) {
            displayedContent += chunk;
            contentChanged = true;
          }
        }

        // 2. Catch up think content (thinking delta)
        if (displayedThinkContent.length < targetThinkContent.length) {
          const diff = targetThinkContent.length - displayedThinkContent.length;
          const charsToAdd = diff > 100 ? Math.ceil(diff / 5) : (diff > 20 ? Math.ceil(diff / 10) : 1);
          displayedThinkContent += targetThinkContent.slice(displayedThinkContent.length, displayedThinkContent.length + charsToAdd);
          thinkContentChanged = true;
        }

        const currentToolCallsJson = JSON.stringify(currentToolCalls);
        const toolCallsChanged = currentToolCallsJson !== lastToolCallsJson;

        if (contentChanged || thinkContentChanged || toolCallsChanged || isDone) {
          lastToolCallsJson = currentToolCallsJson;

          setChats(prev => prev.map(chat => {
            if (chat.id !== chatId) return chat;
            return {
              ...chat,
              messages: chat.messages.map(m => m.id === thinkingId ? {
                ...m,
                content: displayedContent,
                thinkContent: displayedThinkContent || undefined,
                isThinking: !isDone && (displayedThinkContent.length > 0 || m.isThinking),
                isStreaming: !isDone,
                toolCalls: [...currentToolCalls],
                ...(isDone && displayedContent.length === targetContent.length && displayedThinkContent.length === targetThinkContent.length ? {
                  content: displayedContent || finalEventResultText || '',
                  isThinking: false,
                  isStreaming: false,
                  thinking: undefined,
                  timestamp: new Date()
                } : {})
              } : m)
            };
          }));
        }

        if (isDone && displayedContent.length === targetContent.length && displayedThinkContent.length === targetThinkContent.length) {
          clearInterval(typingInterval);
          resolve();
        }
      }, 25);
    });

    const abortHandler = () => {
      clearInterval(typingInterval);
    };
    if (signal) {
      signal.addEventListener('abort', abortHandler);
    }

    try {
      await runCoderPiAgent(agentInstance, task, handlePiEvent, signal);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      targetContent = targetContent + (targetContent ? '\n\n' : '') + `❌ **Agent Error**: ${errorMsg}`;
      isDone = true;
      throw error;
    } finally {
      isDone = true;
      await runPromise;
      clearInterval(typingInterval);
      if (signal) {
        signal.removeEventListener('abort', abortHandler);
      }
    }
  };

  const handleSend = async (contentOverride?: string) => {
    // START OF HANDLESEND METHOD
    // INTENT INTERCEPTION FOR SUBAGENT WALKTHROUGH APPROVALS
    const cleanContent = (contentOverride || input.trim()).trim().toLowerCase().replace(/[.,!?:;]/g, '');
    const isWalkthroughApproval = ['ok', 'okay', 'continue', 'doit', 'do it', 'approve', 'go', 'yes', 'proceed', 'start', 'run', 'lets go', 'let is go', 'yea', 'yep', 'y', 'correct'].includes(cleanContent) || cleanContent.startsWith('ok ') || cleanContent.startsWith('continue ') || cleanContent.startsWith('do it ');

    if (isCoderMode && orchestrationState.isActive && orchestrationState.awaitingUserConfirmation && isWalkthroughApproval && currentChatId) {
      const activeChat = chats.find(c => c.id === currentChatId);
      if (activeChat) {
        const lastAssMsg = activeChat.messages.slice().reverse().find(m => m.role === 'assistant' && m.todoPlan && !m.todoPlan.isConfirmed);
        if (lastAssMsg && lastAssMsg.todoPlan) {
          showToast("Walkthrough Plan approved! Spawning subagents step-by-step...");

          setOrchestrationState((prev: any) => ({
            ...prev,
            awaitingUserConfirmation: false,
            agents: prev.agents.map((a: any, idx: number) => idx === 0 ? { ...a, status: 'done', completedAt: Date.now() } : a)
          }));

          setChats((prev: any[]) => prev.map(chat => {
            if (chat.id === currentChatId) {
              return {
                ...chat,
                messages: chat.messages.map((m: any) => m.id === lastAssMsg.id ? {
                  ...m,
                  todoPlan: {
                    ...m.todoPlan!,
                    isConfirmed: true,
                    countdown: 0
                  }
                } : m)
              };
            }
            return chat;
          }));

          // Self-contained walk-through implementation launch
          const todos = lastAssMsg.todoPlan.todos;
          const todoContent = `# Tasks Checklist\n\n` + 
            todos.map((t: any) => `- [ ] ${t.text || t.content}`).join('\n') + '\n';
            
          const workspaceArg = coderWorkspacePath ? { workspaceRoot: coderWorkspacePath } : {};
          const fullPath = coderWorkspacePath ? `${coderWorkspacePath.replace(/\\/g, '/')}/TODO.md` : `./TODO.md`;
          
          fetch('/api/fs/write', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filePath: fullPath, content: todoContent, ...workspaceArg })
          }).then(() => {
            if (triggerWorkspaceRefresh) {
              triggerWorkspaceRefresh();
            }
            setTimeout(() => {
              if ((window as any).openFileInPreview) {
                (window as any).openFileInPreview('TODO.md');
              }
            }, 300);
          }).catch(err => {
            console.error("Failed to write TODO.md in interceptor:", err);
          });

          setActiveCommandType("coder");
          setCoderTodos(todos.map((t: any, idx: number) => ({ id: String(idx + 1), content: t.text || t.content, status: idx === 0 ? 'in_progress' as const : 'pending' as const })));
          setShowTodoPanel(true);

          setInput('');
          setIsTyping(false);
          
          setTimeout(() => {
            handleSend("Excellent. Proceed and implement the approved Walkthrough Plan step-by-step.");
          }, 400);
          return;
        }
      }
    }
    if (isVoiceListening) {
      stopVoiceDictation();
    }
    if (isTyping) {
      if (!abortControllerRef.current) {
        setIsTyping(false);
      } else {
        return;
      }
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const signal = controller.signal;

    let content = contentOverride || input.trim();
    if (!content && attachedFiles.length === 0 && attachedUrlDocs.length === 0) return;

    if (content.trim().toLowerCase() === '/clear') {
      handleClearChat();
      setInput('');
      return;
    }

    if (content.trim().toLowerCase() === '/new') {
      createNewChat(null, isCoderMode);
      setInput('');
      return;
    }

    if (content.toLowerCase().startsWith('/coder')) {
      const trimCmd = content.trim().toLowerCase();
      let newState = true;
      if (trimCmd === '/coder off') {
        newState = false;
      }
      
      setIsCoderMode(newState);
      setIsCoderWorkspacePanelOpen(newState);
      if (newState) {
        setIsSidebarOpen(false);
      }
      
      const targetChatId = createNewChat(null, newState);
      
      setChats(prev => prev.map(chat => {
        if (chat.id === targetChatId) {
          const sysMsgId = (Date.now() + 1).toString();
          return {
            ...chat,
            isCoderMode: newState,
            messages: [
              ...chat.messages,
              {
                id: Date.now().toString(),
                role: 'user',
                content: content,
                timestamp: new Date()
              },
              {
                id: sysMsgId,
                role: 'assistant',
                content: newState 
                  ? "⚡ **Coder Mode Activated!**\n\nI am now running as an autonomous Software Engineering Agent. I am connected directly to your active project workspace directory and am ready to write, read, edit, and list files in real-time. Give me instructions on what to build!"
                  : "🚫 **Coder Mode Deactivated.**\n\nI will now answer your questions as a standard digital assistant without modifying the workspace.",
                timestamp: new Date()
              }
            ],
            updatedAt: new Date()
          };
        }
        return chat;
      }));
      
      setInput('');
      triggerWorkspaceRefresh();
      return;
    }

    const effectiveWritingStyle =
      writingStyle && writingStyle !== 'default'
        ? writingStyle
        : inferWritingStyleFromPrompt(content);

    if (activeSkills.length > 0) {
      const skillPrompts = activeSkills.map(id => SKILLS.find(s => s.id === id)?.prompt).filter(Boolean);
      content = skillPrompts.join('') + content;
    }

    // Inject attached URL documents into content
    if (attachedUrlDocs.length > 0) {
      const docBlocks = attachedUrlDocs.map(doc => {
        const processedContent = useTurboQuant
          ? turboQuantCompress(doc.content, 5000, 'medium')
          : doc.content;
        return `\n\n[ATTACHED URL DOCUMENT${useTurboQuant ? ' — TurboQuant Compressed' : ''}]\nSource: ${doc.url}\nTitle: ${doc.title}\nContent:\n${processedContent}\n[END DOCUMENT]`;
      }).join('');
      content = content + docBlocks;
    }

    const pendingImages: { title: string; url: string }[] = [];
    // Collect image files for multimodal LLM input and read text-only files
    const pendingImageDataUrls: string[] = [];
    console.log('[LUMINA_DEBUG] handleSend attachedFiles count:', attachedFiles.length);
    if (attachedFiles.length > 0) {
      const fileBlocks: string[] = [];
      for (const file of attachedFiles) {
        if (file.type.startsWith('image/')) {
          const dataUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => resolve('');
            reader.readAsDataURL(file);
          });
          if (dataUrl) {
            pendingImageDataUrls.push(dataUrl);
            pendingImages.push({ title: file.name, url: dataUrl });
            console.log('[LUMINA_DEBUG] Image converted to data URL, length:', dataUrl.length);
          }
        } else {
          const isTextExtension = /\.(txt|md|js|jsx|ts|tsx|json|css|html|xml|yaml|yml|csv|log|ini|sh|py|go|rs|cpp|c|h|java|sql)$/i.test(file.name);
          const isTextMime = file.type && (file.type.startsWith('text/') || file.type === 'application/json' || file.type === 'application/javascript' || file.type === 'application/x-typescript');
          const isReadableText = isTextExtension || isTextMime;
          const isLikelyBinary = !isReadableText;
          const dummyUnused = 
            !/\.(txt|md|js|jsx|ts|tsx|json|css|html|xml|yaml|yml|csv|log|ini|sh)$/i.test(file.name);
          if (!isLikelyBinary && file.size < 2 * 1024 * 1024) {
            const fileContent = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string || '');
              reader.onerror = () => resolve('');
              reader.readAsText(file);
            });
            fileBlocks.push(`\n\n[ATTACHED FILE: ${file.name}]\nContent:\n${fileContent}\n[END FILE]`);
          } else {
            // Send to our backend document parser for PDF, DOCX, and other files!
            const base64 = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onload = () => {
                const result = reader.result as string;
                const base64Str = result.split(',')[1] || '';
                resolve(base64Str);
              };
              reader.onerror = () => resolve('');
              reader.readAsDataURL(file);
            });

            if (base64) {
              try {
                const parseRes = await fetch('/api/parse-doc', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    fileName: file.name,
                    mimeType: file.type,
                    base64
                  })
                });
                if (parseRes.ok) {
                  const parseData = await parseRes.json();
                  if (parseData.text) {
                    fileBlocks.push(`\n\n[ATTACHED FILE: ${file.name}]\nContent:\n${parseData.text}\n[END FILE]`);
                  } else {
                    fileBlocks.push(`\n\n[ATTACHED FILE: ${file.name} - Empty or unparseable content]`);
                  }
                } else {
                  fileBlocks.push(`\n\n[ATTACHED FILE REFERENCE: ${file.name} (${(file.size / 1024).toFixed(1)} KB) - Binary or unreadable content]`);
                }
              } catch (parseErr: any) {
                console.error("Failed to parse document on backend", parseErr);
                fileBlocks.push(`\n\n[ATTACHED FILE REFERENCE: ${file.name} (${(file.size / 1024).toFixed(1)} KB) - Parsing error: ${parseErr.message}]`);
              }
            } else {
              fileBlocks.push(`\n\n[ATTACHED FILE REFERENCE: ${file.name} (${(file.size / 1024).toFixed(1)} KB) - Unsupported or unreadable format]`);
            }
          }
        }
      }
      content = content + fileBlocks.join('');
    }

    let chatId = currentChatId;
    if (!chatId) {
      chatId = createNewChat(null, isCoderMode);
    }

    // Find or create chat and ensure coder mode is set
    let activeChatForTurn = chats.find(c => c.id === chatId) || null;
    
    // If this is a new chat and coder mode is active, set it on the chat
    if (!activeChatForTurn && isCoderMode) {
      setChats((prev: Chat[]) => prev.map(chat => {
        if (chat.id === chatId) {
          return { ...chat, isCoderMode: true };
        }
        return chat;
      }));
      activeChatForTurn = { id: chatId, title: '', messages: [], updatedAt: new Date(), isCoderMode: true };
    }
    
    const effectiveCoderMode =
      isCoderMode ||
      Boolean(activeChatForTurn?.isCoderMode) ||
      content.toLowerCase().startsWith('/coder');

    const userMessage: Message = {
      id: createStableTurnId('msg', chatId, 'user'),
      role: 'user',
      content: content,
      timestamp: new Date(),
      elementAttachments: [...localElementAttachments],
      images: pendingImages.length > 0 ? pendingImages : undefined
    } as any;

    setAttachedFiles([]);
    setAttachedUrlDocs([]);
    setLocalElementAttachments([]);

    setChats(prev => prev.map(chat => {
      if (chat.id === chatId) {
        const newMessages = [...chat.messages, userMessage];
        return {
          ...chat,
          messages: newMessages,
          title: chat.messages.length === 0 ? content.slice(0, 30) + (content.length > 30 ? '...' : '') : chat.title,
          updatedAt: new Date(),
        };
      }
      return chat;
    }));

    setInput('');
    setIsTyping(true);

    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }

    const thinkingId = createStableTurnId('msg', chatId, 'assistant');
    const isCoderPlanning = effectiveCoderMode || content.startsWith('/coder');
    const thinkingMessage: Message = {
      id: thinkingId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      startedAt: new Date(),
      thinking: isCoderPlanning ? 'Preparing engineering task plan...' : (isWebSearchEnabled ? 'Collecting live web sources...' : `${persona.name} is preparing a response...`),
      isSearching: isWebSearchEnabled,
      isStreaming: true,
      toolCalls: [
        {
          id: 'thinking-node',
          label: isCoderPlanning
            ? 'Coder planner - preparing TODO plan'
            : (isWebSearchEnabled ? 'Web search in progress' : `${persona.name} - response preparation`),
          type: 'ai',
          status: 'active',
          icon: isCoderPlanning ? 'manage_todos' : (isWebSearchEnabled ? 'globe' : 'sparkles')
        }
      ]
    };

    setTypingMessageId(thinkingId);
    setChats(prev => prev.map(chat => {
      if (chat.id === chatId) {
        return {
          ...chat,
          messages: [...chat.messages, thinkingMessage],
          updatedAt: new Date(),
        };
      }
      return chat;
    }));

    const isSlash = content.startsWith('/');
    const shouldRunCoderAgent = effectiveCoderMode && isLikelyCoderTask(content);
    if (isSlash || shouldRunCoderAgent) {
      setIsGeneratingTodos(true);
      setShowTodoPanel(true);
      setTodoCollapsed(false);
      
      const firstSpaceIdx = content.indexOf(' ');
      const cmdName = firstSpaceIdx !== -1 ? content.substring(1, firstSpaceIdx).toLowerCase() : content.substring(1).toLowerCase();
      const cmdQuery = firstSpaceIdx !== -1 ? content.substring(firstSpaceIdx + 1).trim() : '';

      setActiveCommandType(cmdName);
      setActiveCommandQuery(cmdQuery || null);

      if (cmdName === 'goal') {
        setCoderTodos([
          { id: 'goal-1', text: `Analyzing task goals for: "${cmdQuery || 'objective'}"`, status: 'in_progress' },
          { id: 'goal-2', text: 'Scaffolding requirements & database blueprint schemas', status: 'pending' },
          { id: 'goal-3', text: 'Assembling components and validating API payloads', status: 'pending' },
          { id: 'goal-4', text: 'Running local test executions and structural verification', status: 'pending' },
          { id: 'goal-5', text: 'Compiling final build output for interactive preview', status: 'pending' }
        ]);
        setIsGeneratingTodos(false);
      } else if (cmdName === 'browser') {
        setCoderTodos([
          { id: 'browser-1', text: `Booting sandboxed browser module for: "${cmdQuery || 'target host'}"`, status: 'in_progress' },
          { id: 'browser-2', text: 'Parsing viewport elements, stylesheets, and meta nodes', status: 'pending' },
          { id: 'browser-3', text: 'Simulating interactive pointer clicks and network requests', status: 'pending' },
          { id: 'browser-4', text: 'Capturing High-Definition page screenshots and asset state', status: 'pending' },
          { id: 'browser-5', text: 'Outputting full diagnostic site audits and log reports', status: 'pending' }
        ]);
        setIsGeneratingTodos(false);
      } else if (cmdName === 'schedule') {
        setCoderTodos([
          { id: 'schedule-1', text: `Registering recurring task rules: "${cmdQuery || 'automation schedule'}"`, status: 'in_progress' },
          { id: 'schedule-2', text: 'Binding execution cron listeners & persistent intervals', status: 'pending' },
          { id: 'schedule-3', text: 'Syncing backend job dispatch triggers and logs database', status: 'pending' },
          { id: 'schedule-4', text: 'Running first-pass scheduler dry-runs', status: 'pending' }
        ]);
        setIsGeneratingTodos(false);
      } else if (cmdName === 'grill-me') {
        setCoderTodos([
          { id: 'grill-1', text: `Reviewing initial alignment details for: "${cmdQuery || 'feature design'}"`, status: 'in_progress' },
          { id: 'grill-2', text: 'Formulating diagnostic clarification interview questions', status: 'pending' },
          { id: 'grill-3', text: 'Rendering dynamic user feedback input prompts', status: 'pending' },
          { id: 'grill-4', text: 'Realigning architecture blueprint based on user responses', status: 'pending' }
        ]);
        setIsGeneratingTodos(false);
      } else if (shouldRunCoderAgent || cmdName === 'coder') {
        const queryPreview = (cmdQuery || content).substring(0, 42);
        setCoderTodos([
          { id: 'planning-1', text: `Understanding request: "${queryPreview}${(cmdQuery || content).length > 42 ? '...' : ''}"`, status: 'in_progress' },
          { id: 'planning-2', text: 'Inspecting workspace intent and likely files', status: 'pending' },
          { id: 'planning-3', text: 'Preparing executable engineering checklist', status: 'pending' }
        ]);
        setChats(prev => prev.map(chat => chat.id === chatId ? {
          ...chat,
          messages: chat.messages.map(m => m.id === thinkingId ? {
            ...m,
            thinking: 'Preparing engineering task plan...',
            toolCalls: [
              {
                id: 'coder-plan-node',
                label: 'Preparing coder TODO runbook',
                type: 'tool',
                status: 'active',
                toolName: 'manage_todos',
                icon: 'manage_todos',
                resultSummary: 'planning workspace steps'
              },
              {
                id: 'coder-plan-ai',
                label: `${persona.name} - preparing agent path`,
                type: 'ai',
                status: 'active',
                icon: 'sparkles'
              }
            ]
          } : m)
        } : chat));
        try {
          const planPromptMessage = [
            {
              role: 'system',
              content: 'You are an expert technical planner. Formulate a targeted, structured task checklist of 3-5 concrete engineering steps to accomplish the user\'s workspace request. Focus on specifying relevant files to check, create, edit, or build. Respond ONLY with a clean JSON object containing a "todos" array with items having "id" (string starting at "1"), "text" (the specific task description), and "status" (always "pending"). Do not explain. Do not wrap in markdown tags. Example: {"todos": [{"id": "1", "text": "Analyze existing project files for structure", "status": "pending"}]}.'
            },
            {
              role: 'user',
              content: `User query: "${cmdQuery || content}"`
            }
          ];
          const planRes = await callLlamaBridge(planPromptMessage, [], signal);
          let textResponse = planRes?.choices?.[0]?.message?.content || '';
          // Clean any XML tool call artifacts that minimax-style models may inject
          textResponse = textResponse
            .replace(/minimax:tool_call\s*/gi, '')
            .replace(/<invoke[\s\S]*?<\/invoke>/gi, '')
            .replace(/^\s*text\s*$/gm, '')
            .replace(/^\s*Copy\s*$/gm, '')
            .trim();
          const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (Array.isArray(parsed.todos) && parsed.todos.length > 0) {
              const mapped = parsed.todos.map((t: any, idx: number) => ({
                id: t.id || (idx + 1).toString(),
                text: t.text || 'Engineering task',
                status: idx === 0 ? 'in_progress' : 'pending'
              }));
              setCoderTodos(mapped);

              if (!shouldActivateOrchestration(content)) {
                const todoContent = `# Tasks Checklist\n\n` + 
                  mapped.map((t: any) => `- [ ] ${t.text || t.content || t.text}`).join('\n') + '\n';
                
                const workspaceArg = coderWorkspacePath ? { workspaceRoot: coderWorkspacePath } : {};
                const fullPath = coderWorkspacePath ? `${coderWorkspacePath.replace(/\\/g, '/')}/TODO.md` : `./TODO.md`;
                
                fetch('/api/fs/write', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ filePath: fullPath, content: todoContent, ...workspaceArg })
                }).then(() => {
                  if (triggerWorkspaceRefresh) {
                    triggerWorkspaceRefresh();
                  }
                  setTimeout(() => {
                    if ((window as any).openFileInPreview) {
                      (window as any).openFileInPreview('TODO.md');
                    }
                  }, 300);
                }).catch(err => {
                  console.error("Failed to write TODO.md:", err);
                });
              }
              setChats(prev => prev.map(chat => chat.id === chatId ? {
                ...chat,
                messages: chat.messages.map(m => m.id === thinkingId ? {
                  ...m,
                  thinking: shouldActivateOrchestration(content) ? 'Subagent plan prepared. Awaiting walkthrough approval...' : 'Coder TODOs ready. Starting agent...',
                  ...(shouldActivateOrchestration(content) ? {
                    todoPlan: {
                      title: "📋 Multi-Agent Walkthrough Plan",
                      todos: mapped,
                      isConfirmed: false,
                      countdown: undefined
                    }
                  } : {}),
                  toolCalls: [
                    {
                      id: 'coder-plan-node',
                      label: 'Coder TODO runbook generated',
                      type: 'tool',
                      status: 'complete',
                      toolName: 'manage_todos',
                      icon: 'check',
                      resultSummary: `${mapped.length} tasks prepared`
                    },
                    {
                      id: 'coder-plan-ai',
                      label: `${persona.name} - starting tool execution`,
                      type: 'ai',
                      status: 'active',
                      icon: 'terminal'
                    }
                  ]
                } : m)
              } : chat));
            } else {
              throw new Error("Invalid structure");
            }
          } else {
            throw new Error("No JSON found");
          }
        } catch (err) {
          console.warn("Failed to generate dynamic todos via AI:", err);
          const fallbackTodos = [
            { id: 'fb-1', text: 'Analyze file layout and project components', status: 'in_progress' as const },
            { id: 'fb-2', text: `Implement build changes matching query: ${(cmdQuery || content).substring(0, 35)}${(cmdQuery || content).length > 35 ? '...' : ''}`, status: 'pending' as const },
            { id: 'fb-3', text: 'Verify application and render interactive hot-fix', status: 'pending' as const }
          ];
          setCoderTodos(fallbackTodos);

          if (!shouldActivateOrchestration(content)) {
            const todoContent = `# Tasks Checklist\n\n` + 
              fallbackTodos.map((t: any) => `- [ ] ${t.text}`).join('\n') + '\n';
            
            const workspaceArg = coderWorkspacePath ? { workspaceRoot: coderWorkspacePath } : {};
            const fullPath = coderWorkspacePath ? `${coderWorkspacePath.replace(/\\/g, '/')}/TODO.md` : `./TODO.md`;
            
            fetch('/api/fs/write', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ filePath: fullPath, content: todoContent, ...workspaceArg })
            }).then(() => {
              if (triggerWorkspaceRefresh) {
                triggerWorkspaceRefresh();
              }
              setTimeout(() => {
                if ((window as any).openFileInPreview) {
                  (window as any).openFileInPreview('TODO.md');
                }
              }, 300);
            }).catch(writeErr => {
              console.error("Failed to write fallback TODO.md:", writeErr);
            });
          }
          setChats(prev => prev.map(chat => chat.id === chatId ? {
            ...chat,
            messages: chat.messages.map(m => m.id === thinkingId ? {
              ...m,
              thinking: shouldActivateOrchestration(content) ? 'Fallback plan prepared. Awaiting walkthrough approval...' : 'Using fallback TODOs. Starting agent...',
              ...(shouldActivateOrchestration(content) ? {
                todoPlan: {
                  title: "📋 Multi-Agent Walkthrough Plan",
                  todos: [
                    { id: 'fb-1', text: 'Analyze file layout and project components', status: 'in_progress' as const },
                    { id: 'fb-2', text: `Implement build changes matching query: ${(cmdQuery || content).substring(0, 35)}${(cmdQuery || content).length > 35 ? '...' : ''}`, status: 'pending' as const },
                    { id: 'fb-3', text: 'Verify application and render interactive hot-fix', status: 'pending' as const }
                  ],
                  isConfirmed: false,
                  countdown: undefined
                }
              } : {}),
              toolCalls: [
                {
                  id: 'coder-plan-node',
                  label: 'Fallback coder TODO runbook prepared',
                  type: 'tool',
                  status: 'complete',
                  toolName: 'manage_todos',
                  icon: 'check',
                  resultSummary: '3 tasks prepared'
                },
                {
                  id: 'coder-plan-ai',
                  label: `${persona.name} - starting tool execution`,
                  type: 'ai',
                  status: 'active',
                  icon: 'terminal'
                }
              ]
            } : m)
          } : chat));
        } finally {
          setIsGeneratingTodos(false);
        }
      } else {
        setCoderTodos([
          { id: 'fb-1', text: `Formulating workspace task: "/${cmdName} ${cmdQuery}"`, status: 'in_progress' },
          { id: 'fb-2', text: `Processing task strategies with ${selectedModel}`, status: 'pending' },
          { id: 'fb-3', text: 'Executing response flow actions', status: 'pending' }
        ]);
        setIsGeneratingTodos(false);
      }
    } else {
      setActiveCommandType(null);
      setActiveCommandQuery(null);
    }

    let searchResults: any[] = [];
    let searchProviderVal = "";

    if (isDeepSearchEnabled) {
      try {
        setChats(prev => prev.map(chat => {
          if (chat.id !== chatId) return chat;
          return {
            ...chat,
            messages: chat.messages.map(m => m.id === thinkingId
              ? { ...m, thinking: 'Orchestrating Deep Multi-Agent Research...', isSearching: true }
              : m)
          };
        }));

        // Launch the UI Research simulation
        if (researchMode) {
          researchMode.setIsResearchActive(false);
          setTimeout(() => {
            researchMode.setCustomQueries(content);
            // researchMode.setIsResearchMode(true);
            // setIsSidebarOpen(false);
            researchMode.setIsResearchActive(true);
            researchMode.setResearchLogs([
              `[${new Date().toLocaleTimeString()}] [Orchestrator] Deep recursive search triggered via Chat Toggle: "${content}"`,
              `[${new Date().toLocaleTimeString()}] [System] Allocating multi-agent parallel loops...`
            ]);
            // researchMode.setIsResearchWorkspaceOpen(true);
          }, 100);
        }

        const hasTavilyKey = tavilyApiKey && tavilyApiKey.trim().length > 0;
        const hasSerpKey = serpApiKey && serpApiKey.trim().length > 0;
        
        let providerName = 'DuckDuckGo';
        if (searchProvider === 'tavily' && hasTavilyKey) {
          providerName = 'Tavily';
        } else if (searchProvider === 'serpapi' && hasSerpKey) {
          providerName = 'SerpApi';
        } else if (hasTavilyKey) {
          providerName = 'Tavily';
        } else if (hasSerpKey) {
          providerName = 'SerpApi';
        }

        const searchData = await runPreferredWebSearch({
          content,
          tavilyApiKey,
          serpApiKey,
          searchProvider,
          selectedProvider,
          apiKey,
          signal
        });
        
        if (searchData.ok) {
          searchResults = searchData.results || [];
          searchProviderVal = searchData.provider === 'Ollama Web Search'
            ? 'Deep Research Engine (Ollama Web Search)'
            : "Deep Research Engine (" + providerName + ")";
        } else {
          console.warn('Backend search failed, no further fallback available.');
        }

        if (searchResults.length > 0) {
          setChats(prev => prev.map(chat => {
            if (chat.id === chatId) {
              return {
                ...chat,
                messages: chat.messages.map(m => m.id === thinkingId ? { 
                  ...m, 
                  isSearching: true, 
                  thinking: `Synthesizing deep results and Agent claims (${searchProviderVal})...`,
                  sources: searchResults.slice(0, 10).map(r => ({ title: r.title, url: r.url, snippet: r.snippet })) 
                } : m),
              };
            }
            return chat;
          }));
        }
      } catch (err) {
        console.error('Deep search error:', err);
      }
    } else if (isWebSearchEnabled) {
      try {
        setChats(prev => prev.map(chat => {
          if (chat.id !== chatId) return chat;
          return {
            ...chat,
            messages: chat.messages.map(m => m.id === thinkingId
              ? {
                  ...m,
                  thinking: isOllamaSearchEnabledForCurrentProvider(selectedProvider)
                    ? 'Searching with Ollama Web Search...'
                    : 'Searching the web...',
                  isSearching: true
                }
              : m)
          };
        }));

        const hasTavilyKey = tavilyApiKey && tavilyApiKey.trim().length > 0;
        const hasSerpKey = serpApiKey && serpApiKey.trim().length > 0;
        
        let providerName = 'DuckDuckGo';
        if (searchProvider === 'tavily' && hasTavilyKey) {
          providerName = 'Tavily';
        } else if (searchProvider === 'serpapi' && hasSerpKey) {
          providerName = 'SerpApi';
        } else if (hasTavilyKey) {
          providerName = 'Tavily';
        } else if (hasSerpKey) {
          providerName = 'SerpApi';
        }

        const searchData = await runPreferredWebSearch({
          content,
          tavilyApiKey,
          serpApiKey,
          searchProvider,
          selectedProvider,
          apiKey,
          signal
        });
        
        if (searchData.ok) {
          searchResults = searchData.results || [];
          searchProviderVal = searchData.provider || "Search";
        } else {
          console.warn('Backend search failed, no further fallback available.');
        }

        if (searchResults.length > 0) {
          setChats(prev => prev.map(chat => {
            if (chat.id === chatId) {
              return {
                ...chat,
                messages: chat.messages.map(m => m.id === thinkingId ? { 
                  ...m, 
                  isSearching: true, 
                  thinking: `Synthesizing info from ${searchProviderVal}...`,
                  sources: searchResults.slice(0, 10).map(r => ({ title: r.title, url: r.url, snippet: r.snippet })) 
                } : m),
              };
            }
            return chat;
          }));
        } else {
          console.warn("Search returned no results from any provider.");
        }
      } catch (err) {
        console.error("Search step failed:", err);
      }
    }

    let openCodeContext: OpenCodeContext | null = null;
    if (effectiveCoderMode) {
      try {
        const contextRes = await fetch('/api/opencode/context', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ workspaceRoot: coderWorkspacePath || '.' }),
          signal
        });
        if (contextRes.ok) {
          openCodeContext = await contextRes.json();
        }
      } catch (error) {
        console.warn('Failed to load OpenCode workspace context:', error);
      }
    }

    try {
      const chatContext = chats.find(c => c.id === chatId)?.messages || [];
      
      let activeTools = buildActiveTools();
      if (isDeepSearchEnabled && !effectiveCoderMode) {
        const existingNames = new Set(activeTools.map((tool: any) => tool?.function?.name).filter(Boolean));
        for (const tool of deepResearchTools) {
          if (!existingNames.has(tool.function.name)) {
            activeTools.push(tool);
          }
        }
      }
      if (effectiveCoderMode) {
        activeTools.push(
          ...[
            { name: 'spawn_orchestrator', desc: 'Spawn the Orchestrator agent to coordinate execution, plan subtasks, and assign work for a project.' },
            { name: 'spawn_analyzer', desc: 'Spawn the Analyzer agent to research codebase, trace dependencies, and locate functions. Does not write code.' },
            { name: 'spawn_coder', desc: 'Spawn the Coder agent to implement features, refactor, and edit workspace files.' },
            { name: 'spawn_debugger', desc: 'Spawn the Debugger agent to diagnose failures, run compiler checks, and verify fixes.' },
            { name: 'spawn_reviewer', desc: 'Spawn the Reviewer agent to perform static analysis, review code, and check styles.' },
          ].map(agent => ({
            type: 'function' as const,
            function: {
              name: agent.name,
              description: agent.desc,
              parameters: {
                type: 'object',
                properties: {
                  task: {
                    type: 'string',
                    description: 'The specific task instruction for the agent. Be very precise, detailed, and clear about the context.'
                  }
                },
                required: ['task']
              }
            }
          })),
          {
            type: 'function',
            function: {
              name: 'apply_patch',
              description: 'Apply a unified patch to one or more existing files. Prefer this for precise code edits across multiple hunks.',
              parameters: {
                type: 'object',
                properties: {
                  patch: { type: 'string', description: 'Unified patch text to apply.' }
                },
                required: ['patch']
              }
            }
          },
          {
            type: 'function',
            function: {
              name: 'write_file',
              description: 'Create or overwrite a file. Creates parent dirs automatically. For partial writes, use offset to append or limit to control content size.',
              parameters: {
                type: 'object',
                properties: {
                  filePath: { type: 'string', description: 'Relative path from project root.' },
                  content: { type: 'string', description: 'File content to write.' },
                  offset: { type: 'number', description: 'Line number to append to (default: 0 = overwrite from start).' },
                  limit: { type: 'number', description: 'Max lines to write at a time (helps for large files).' }
                },
                required: ['filePath', 'content']
              }
            }
          },
          {
            type: 'function',
            function: {
              name: 'todowrite',
              description: 'Create or update TODO.md task checklists for coder-mode execution progress.',
              parameters: {
                type: 'object',
                properties: {
                  content: { type: 'string', description: 'Full markdown content to write into TODO.md.' },
                  filePath: { type: 'string', description: 'Optional relative path. Defaults to TODO.md.' }
                },
                required: ['content']
              }
            }
          },
          {
            type: 'function',
            function: {
              name: 'read_file',
              description: 'Read file contents. Use offset/limit to read large files in chunks. For 100-200 lines at a time.',
              parameters: {
                type: 'object',
                properties: {
                  filePath: { type: 'string', description: 'Relative file path.' },
                  offset: { type: 'number', description: 'Start line number (1-indexed). Default 1.' },
                  limit: { type: 'number', description: 'Max lines to return (default 200). Use smaller values for large files.' }
                },
                required: ['filePath']
              }
            }
          },
          {
            type: 'function',
            function: {
              name: 'glob_tool',
              description: 'Finds files by matching patterns. Use exclude to skip node_modules, dist, etc.',
              parameters: {
                type: 'object',
                properties: {
                  fileGlob: { type: 'string', description: 'File filter pattern like "**/*.tsx" or "*.css".' },
                  maxResults: { type: 'number', description: 'Max results (default 50).' },
                  exclude: { type: 'string', description: 'Comma-separated patterns to exclude (e.g. "node_modules,dist,.git").' }
                },
                required: ['fileGlob']
              }
            }
          },
          {
            type: 'function',
            function: {
              name: 'grep_tool',
              description: 'Finds text lines in files using regex. Use offset/limit to paginate through results.',
              parameters: {
                type: 'object',
                properties: {
                  query: { type: 'string', description: 'Regex/text to search for.' },
                  fileGlob: { type: 'string', description: 'Optional file filter like "*.tsx".' },
                  maxResults: { type: 'number', description: 'Max results per file (default 30).' },
                  offset: { type: 'number', description: 'Start line number to search from (1-indexed).' },
                  limit: { type: 'number', description: 'Max lines to search in each file.' }
                },
                required: ['query']
              }
            }
          },
          {
            type: 'function',
            function: {
              name: 'analyze_file',
              description: 'LSP analysis: imports, symbols, diagnostics, metadata.',
              parameters: {
                type: 'object',
                properties: {
                  filePath: { type: 'string', description: 'Relative file path.' }
                },
                required: ['filePath']
              }
            }
          },
          {
            type: 'function',
            function: {
              name: 'edit_file',
              description: 'Find and replace text in an existing file. Use offset/limit to target specific line ranges.',
              parameters: {
                type: 'object',
                properties: {
                  filePath: { type: 'string', description: 'Relative file path.' },
                  search: { type: 'string', description: 'Exact text to find.' },
                  replace: { type: 'string', description: 'Replacement text.' },
                  all: { type: 'boolean', description: 'Replace all occurrences.' },
                  offset: { type: 'number', description: 'Start line for search (1-indexed).' },
                  limit: { type: 'number', description: 'Max lines to search in.' }
                },
                required: ['filePath', 'search', 'replace']
              }
            }
          },
          {
            type: 'function',
            function: {
              name: 'run_skill',
              description: 'Execute a skill template.',
              parameters: {
                type: 'object',
                properties: {
                  skillId: { type: 'string', description: 'Skill ID.' },
                  input: { type: 'string', description: 'Input text.' }
                },
                required: ['skillId', 'input']
              }
            }
          },

          {
            type: 'function',
            function: {
              name: 'fetch_url',
              description: 'Fetch and scrape a webpage. Prioritize scraping high-quality articles, primary databases, and reputable resources. Avoid scraping empty landing pages, social media logins, terms of service, documents like PDF, or invalid redirect URLs.',
              parameters: {
                type: 'object',
                properties: {
                  url: { type: 'string', description: 'The exact target URL to fetch. Do NOT pass a social media account, login form, privacy policy link, downloading file path, or empty homepage.' },
                  outputFormat: { type: 'string', enum: ['markdown', 'text', 'html'], description: 'Output format (default: markdown).' }
                },
                required: ['url']
              }
            }
          },
          {
            type: 'function',
            function: {
              name: 'web_search',
              description: 'Search the web for current information.',
              parameters: {
                type: 'object',
                properties: {
                  query: { type: 'string', description: 'Search query.' },
                  maxResults: { type: 'number', description: 'Max results (default 5).' }
                },
                required: ['query']
              }
            }
          },
          {
            type: 'function',
            function: {
              name: 'ask_user',
              description: 'Ask clarifying questions when requirements are ambiguous.',
              parameters: {
                type: 'object',
                properties: {
                  questions: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        question: { type: 'string' },
                        type: { type: 'string', enum: ['single_choice', 'multi_choice', 'text_input', 'confirm'] },
                        options: { type: 'array', items: { type: 'string' } }
                      },
                      required: ['id', 'question', 'type']
                    }
                  }
                },
                required: ['questions']
              }
            }
          },
          {
            type: 'function',
            function: {
              name: 'create_file',
              description: 'Create a file or directory.',
              parameters: {
                type: 'object',
                properties: {
                  filePath: { type: 'string', description: 'Relative path.' },
                  content: { type: 'string', description: 'File content.' },
                  isDirectory: { type: 'boolean', description: 'Create directory instead.' }
                },
                required: ['filePath']
              }
            }
          },
          {
            type: 'function',
            function: {
              name: 'delete_file',
              description: 'Delete a file or directory.',
              parameters: {
                type: 'object',
                properties: {
                  filePath: { type: 'string', description: 'Relative path to delete.' }
                },
                required: ['filePath']
              }
            }
          },
          {
            type: 'function',
            function: {
              name: 'rename_file',
              description: 'Rename or move a file/directory.',
              parameters: {
                type: 'object',
                properties: {
                  filePath: { type: 'string', description: 'Current path.' },
                  newPath: { type: 'string', description: 'New path.' }
                },
                required: ['filePath', 'newPath']
              }
            }
          },
          {
            type: 'function',
            function: {
              name: 'run_command',
              description: 'Run a shell/terminal command in the workspace. Suitable for running tests, build scripts, installing packages, or general shell commands.',
              parameters: {
                type: 'object',
                properties: {
                  command: { type: 'string', description: 'The command line string to execute.' }
                },
                required: ['command']
              }
            }
          }
        );
      }

      let coderToolGuidance = '';
      let openCodePreferredTools: string[] = [];
      if (effectiveCoderMode) {
        const coderSelection = buildCoderToolSelection(activeTools, content, activeAssistantMode);
        activeTools = coderSelection.tools;
        coderToolGuidance = coderSelection.guidance;
        const openCodePrelude = buildOpenCodePromptPrelude(openCodeContext, content, activeAssistantMode);
        openCodePreferredTools = openCodePrelude.preferredTools;
        if (openCodePreferredTools.length > 0) {
          const byName = new Map(activeTools.map((tool: any) => [tool?.function?.name, tool]));
          const extraTools = buildActiveTools()
            .filter((tool: any) => openCodePreferredTools.includes(tool?.function?.name))
            .filter((tool: any) => !byName.has(tool?.function?.name));
          if (extraTools.length > 0) {
            activeTools = [...activeTools, ...extraTools];
          }
          coderToolGuidance += `\n- OpenCode workspace preference tools for this request: ${openCodePreferredTools.join(', ')}.`;
        }
      }

      if (effectiveCoderMode && orchestrationState.awaitingUserConfirmation) {
        activeTools = [];
      }
      const personaLine = `You are ${persona.name}. Character description/Role: ${persona.role || 'helpful digital assistant'}.${persona.systemPrompt ? `\nInstructions: ${persona.systemPrompt}` : ''}`;
      let systemPrompt = personaLine;

      // Integrate long term memories recalled from the Lumina memory vault based on user demand
      try {
        const { systemPromptAddendum } = retrieveAndRecallMemories(content);
        systemPrompt += systemPromptAddendum;
      } catch (err) {
        console.warn('Lumina memory recall failed:', err);
      }

      // Load custom skills from localStorage to connect AI directly with them
      const customSkills: any[] = loadCustomSkillsFromStorage();

      const enabledCustomSkills = customSkills.filter((s: any) => s.enabled);
      const masterSkill = enabledCustomSkills.find((s: any) =>
        s.id === 'master-orchestrator' || String(s.name || '').toLowerCase() === 'master-orchestrator'
      );
      let activeCustomSkill: any = null;
      const firstWord = content.trim().split(/\s+/)[0]?.toLowerCase() || '';

      // 1. Direct command match (e.g. /skill-id or /skill-name)
      if (firstWord.startsWith('/')) {
        const candidateId = firstWord.substring(1);
        activeCustomSkill = enabledCustomSkills.find(
          (s: any) => s.id === candidateId || s.name.toLowerCase() === candidateId
        );
      }

      // 2. Semantic/Keyword matched auto-load
      if (!activeCustomSkill) {
        for (const s of enabledCustomSkills) {
          const isAuto = s.trigger?.toLowerCase().includes('auto') || s.trigger?.toLowerCase().includes('semantic');
          if (isAuto) {
            // Check direct mentions of skill name
            const nameMention = content.toLowerCase().includes(s.id.toLowerCase()) || content.toLowerCase().includes(s.name.toLowerCase());
            // Specialized matches based on specific default skills
            const specMatch = s.id === 'skill-creator' && (
              content.toLowerCase().includes('skill') || 
              content.toLowerCase().includes('prompt') || 
              content.toLowerCase().includes('system prompt') ||
              content.toLowerCase().includes('benchmark')
            );
            
            // Check descriptions keywords
            const descWords = s.description.toLowerCase().split(/\s+/).filter((w: string) => w.length > 4);
            const descMatch = descWords.some((w: string) => content.toLowerCase().includes(w));

            if (nameMention || specMatch || descMatch) {
              activeCustomSkill = s;
              break;
            }
          }
        }
      }

      // Append general custom skill registry so AI knows its capabilities
      if (enabledCustomSkills.length > 0) {
        systemPrompt += `\n\n[AVAILABLE CUSTOM MODULAR SKILLS]
You have direct, real-time access to the following custom workspace skills. When a task clearly matches one of these skills, proactively load it with the 'run_skill' tool before major reasoning or file changes. You may also read/write their files directly when refining them:`;
        enabledCustomSkills.forEach((s: any) => {
          systemPrompt += `\n- **${s.name}** (Trigger: ${s.trigger}) — ${s.description}`;
        });
        systemPrompt += `\n\nSkill usage rules:
- If the task matches a skill description, call 'run_skill' first to load it.
- Treat the skill result as live execution guidance for the current task.
- You can access or customize their configuration files in your virtual directory at ".lumina/skills/{skill-name}/SKILL.md".
- Prefer 'run_skill' for execution guidance and 'read_file'/'edit_file' for maintenance or improvement.`;
      }

      if (masterSkill && isHeavySkillTask(content)) {
        const masterSkillMd = findSkillMarkdownNode(masterSkill);
        if (masterSkillMd?.content) {
          systemPrompt += `\n\n=== MASTER SKILL PRELUDE: ${masterSkill.name} ===
This task looks heavy. Use the following master orchestration skill before major actions so you choose the right skill files, references, and workflow steps.

${masterSkillMd.content}

=== END MASTER SKILL PRELUDE ===`;
        }
      }

      // If a specific skill is active, set it as the primary system prompt!
      if (activeCustomSkill) {
        const skillMd = activeCustomSkill.tree?.find((t: any) => t.name === 'SKILL.md');
        if (skillMd && skillMd.content) {
          systemPrompt += `\n\n=== 🧠 ACTIVE DISPATCH SKILL PROMPT: ${activeCustomSkill.name} ===
You have automatically transitioned your core system prompt to prioritize this specialized skill.
You should prefer a 'run_skill' call for ${activeCustomSkill.id} so the skill is explicitly loaded into the tool/result chain before execution. Then execute the following skill guide with absolute discipline:

${skillMd.content}

=== END OF ACTIVE DISPATCH SKILL PROMPT ===`;
        }
      }

      if (!isCoderMode) {
        systemPrompt += `\n[CHAT MODE] Respond as a conversational assistant. Do not claim to be in Coder/Builder mode unless asked.`;
      }

      systemPrompt += `\n[CURRENT DATE] Today is ${new Date().toISOString().slice(0, 10)}. Do not invent a different current year or date.`;

      if (activeTools.length > 0) {
        systemPrompt += `\n[TOOLS] Active: ${activeTools.map(t => t.function.name).join(', ')}. Use relevant tools proactively.`;
      }
      if (!isCoderMode) {
        const hasWebTooling = activeTools.some((tool: any) => ['fetch_url', 'web_search', 'web_scrape'].includes(tool?.function?.name));
        const requestsLiveInfo = /\b(latest|current|today|now|recent|real[- ]?time|use the tool|search|scrape|fetch|look up|check online|web)\b/i.test(content);
        if (hasWebTooling && requestsLiveInfo) {
          systemPrompt += `\n[MANDATORY WEB TOOL RULE]
For this request, you MUST use the available web tools before answering if the user is asking for current, recent, live, searchable, scraped, or externally verifiable information.
- Do not answer from memory first.
- First call an appropriate web tool such as 'web_search', 'fetch_url', or 'web_scrape'.
- If the user gives a search-engine URL or asks a factual current-events question, resolve and inspect real destination pages, not just search result summaries.
- After tool results arrive, answer using the collected data.`;
        }
      }
      if (isCoderMode && coderToolGuidance) {
        systemPrompt += `\n\n[CODER TOOL ROUTING]\n${coderToolGuidance}`;
      }
      if (isCoderMode) {
        const openCodePrelude = buildOpenCodePromptPrelude(openCodeContext, content, activeAssistantMode);
        if (openCodePrelude.prompt) {
          systemPrompt += openCodePrelude.prompt;
        }
      }

      const deepResearchPreset = (researchMode?.depthPreset || 'standard') as 'standard' | 'extreme';
      const deepResearchMinimums = getDeepResearchMinimums(deepResearchPreset);
      if (isDeepSearchEnabled && !isCoderMode) {
        systemPrompt += `\n\n${DEEP_RESEARCH_SYSTEM_PROMPT}${getDeepResearchPresetPrompt(deepResearchPreset)}\nCurrent date: ${new Date().toISOString().slice(0, 10)}\nDeep research preset: ${deepResearchPreset === 'extreme' ? 'Advanced' : 'Normal'}\nMinimum wiki searches: ${deepResearchMinimums.minWikiSearches}\nMinimum web scrapes: ${deepResearchMinimums.minWebScrapes}\nMinimum visit calls: ${deepResearchMinimums.minVisits}\nMinimum search calls: ${deepResearchMinimums.minSearchCalls}`;
      }

      if (isCoderMode) {
        const osName = (navigator as any)?.platform || 'unknown';
        if (!shouldRunCoderAgent) {
          systemPrompt += `\n[CODER CHAT MODE - ${osName}] Coder mode is open, but this message is conversational. Reply briefly. Do not call tools or discuss file changes unless the user asks for engineering work.`;
        } else {
          systemPrompt += `\n\n[CODER MODE — ${osName}]
You are a software engineering agent. When asked to build/modify code:
1. Create, read, and maintain the task checklist in TODO.md at the project root.
2. Work on ONE task at a time in strict order. After completing each individual task, IMMEDIATELY use 'edit_file' to update TODO.md, changing that task's '- [ ]' to '- [x]'. Only then proceed to the next task.
3. NEVER batch multiple tasks before updating TODO.md. Each task MUST be marked complete before starting the next.
4. File reading efficiency:
   - For small files (<200 lines), read WITHOUT offset/limit to get the full content
   - For large files, use offset=1 and a reasonable limit (100-200 lines)
   - Do NOT re-read the same file multiple times in a row - the content stays in context
   - Only re-read if you need to see changes made by other tool calls
5. Use 'edit_file' for targeted changes, 'write_file' for full rewrites/new files.
6. Use 'glob_tool' to find files by name patterns. Use 'grep_tool' to search text inside files. Use 'create_file'/'delete_file'/'rename_file' for file ops. Use 'run_command' to run shell commands or execute code.
7. Work in tool-call cycles until all tasks are complete. Give a summary when done.

[SUBAGENTS DELEGATION SYSTEM]
Spawn specialized subagents for engineering tasks using their dedicated tools:
- 'spawn_orchestrator': Sends a task to the Orchestrator agent (coordinates, plans, assigns work).
- 'spawn_analyzer': Sends a task to the Analyzer agent (researches, traces, locates — no code writes).
- 'spawn_coder': Sends a task to the Coder agent (implements features, refactors, edits files).
- 'spawn_debugger': Sends a task to the Debugger agent (diagnoses, runs checks, verifies fixes).
- 'spawn_reviewer': Sends a task to the Reviewer agent (static analysis, code review, style checks).

Provide specific and detailed task strings so they know exactly what to build.

[ASK USER TOOL INSTRUCTIONS]
- Do NOT call 'ask_user' to ask trivial or basic questions (e.g. asking for file paths, project names, or generic things you can check yourself using tools like 'glob_tool', 'grep_tool', 'read_file', or by running commands).
- Before asking any clarifying question about framework, engine, file layout, current implementation, or project structure, you MUST inspect the opened workspace first using 'glob_tool' and then 'read_file' on the most relevant files you find.
- If the Explorer/workspace already shows files, assume the active project is the target. Use those files as ground truth instead of asking the user where the code is.
- For requests like "improve", "fix", "make it better", "add animation", "polish UI", or similar follow-up edits, default to:
  1. 'glob_tool' to list likely project files in the opened workspace
  2. 'read_file' on the primary entry/source files
  3. only then decide whether clarification is still critically necessary
- Never ask the user to point you to a file or tell you the framework if you can infer it from filenames/imports/code in the workspace.
- Only ask clarifying questions if there is a critical ambiguity in the requirements that prevents you from proceeding.
- When calling 'ask_user', prefer using 'single_choice', 'multi_choice', or 'confirm' types and provide clear, actionable selectable options (e.g., in the 'options' field) rather than open-ended 'text_input'. This provides a premium, interactive experience.`;

          if (activeAssistantMode === 'builder') {
            systemPrompt += `\n[MODE: BUILDER] Implement features, create files, write working code.`;
          } else if (activeAssistantMode === 'planner') {
            systemPrompt += `\n[MODE: PLANNER] Plan architecture and sequencing. Ask before executing.`;
          } else if (activeAssistantMode === 'reviewer') {
            systemPrompt += `\n[MODE: REVIEWER]
Your primary objective is to perform a comprehensive code review focusing on:
1. Static code analysis and finding logical errors or anti-patterns
2. Detecting dead, unreachable, or unused code/variables
3. Verifying architectural consistency (e.g. state management, API separation, responsive CSS layouts)

When the user types "start" (or other equivalent command / trigger), you MUST automatically start browsing and analyzing the codebase to build a detailed review report.
To complete the task quickly and precisely, you can spawn specialized review and developer subagents IN PARALLEL:
- Use 'spawn_analyzer' to scan directories or find code usages.
- Use 'spawn_reviewer' to perform static analysis on different specific files.
- Combine these parallel agents to gather context.

Once the review is completed, output a highly detailed, professional, structured Markdown report. Avoid generic statements; specify exact file names, lines, and patterns. Title the report "🔍 LUMINA CODE REVIEW & ANALYSIS REPORT". Include sections:
- Executive Summary
- Dead/Unused Code Analysis (specific file and line references if any)
- Logic Flaws & Edge Cases
- Architectural/Style Recommendations`;
          } else if (activeAssistantMode === 'tester') {
            systemPrompt += `\n[MODE: TESTER]
Your primary objective is to execute deep auditing, security checking, and logical testing:
1. Check for security vulnerabilities (XSS, Injection, exposed secrets, unchecked inputs, missing exception handling)
2. Identify incorrect or wrong business logic, performance bottlenecks, and edge cases
3. Suggest clear, constructive, technical improvements
4. Rate the overall security & logic health of the codebase (e.g. Health Score / 100)

When the user types "start" (or other equivalent command / trigger), you MUST automatically inspect the codebase to build a premium test/security analysis report.
To complete the task quickly and precisely, you can spawn specialized auditing subagents IN PARALLEL:
- Use 'spawn_debugger' or 'spawn_analyzer' to query specific files for bad logic, edge cases, vulnerabilities, or test compilation.
- Gather their parallel findings to compile your final analysis.

Once compliance has been assessed, output a highly detailed, structured Markdown report. Title it "🛡️ LUMINA SECURITY & LOGICAL TESTING REPORT". Ensure it includes:
- Security & Vulnerability Audit (rated with severity: HIGH, MEDIUM, LOW)
- Logic Correctness & Functional Issues
- Design & Code Improvement Recommendations
- Health Score Rating (e.g. Health Score: 85/100)
- Step-by-Step Resolution Guide (clear step-by-step instructions with code examples on how to address every issue with proper guidelines)`;
          } else if (activeAssistantMode === 'debugger') {
            systemPrompt += `\n[MODE: DEBUGGER] Trace errors, fix bugs with minimal changes.`;
          }

          systemPrompt += `\n[CODER EXECUTION DISCIPLINE]
- Inspect before editing whenever the target file or symbol is not already certain.
- Prefer small, verifiable tool cycles over long speculative action chains.
- Keep edits aligned with existing project structure and naming patterns.
- Use tools to gather evidence, then act decisively.
- End with concrete outcomes, not generic completion language.`;

          if (activeAssistantMode === 'builder') {
            systemPrompt += `\n[BUILDER DIRECTIVES]
- Default to implementation.
- Make the feature actually usable end to end, including any required glue code.
- Prefer focused edits over broad rewrites unless a rewrite is clearly simpler and safer.
- Validate behavior after meaningful code changes when practical.`;
          } else if (activeAssistantMode === 'planner') {
            systemPrompt += `\n[PLANNER DIRECTIVES]
- Default to planning, sequencing, and risk reduction.
- Ground the plan in real files, modules, and dependencies discovered from tools.
- Break work into concrete phases with validation steps.
- Do not start implementation unless the user explicitly moves from planning to execution.`;
          } else if (activeAssistantMode === 'reviewer') {
            systemPrompt += `\n[REVIEWER DIRECTIVES]
- Prioritize bugs, regressions, edge cases, architectural drift, and missing validation.
- Use exact evidence with file references and concrete impact.
- Keep findings ordered by severity.
- Treat style commentary as secondary to correctness and maintainability risks.`;
          } else if (activeAssistantMode === 'tester') {
            systemPrompt += `\n[TESTER DIRECTIVES]
- Prioritize security issues, reliability problems, failure handling gaps, and unsafe assumptions.
- Look for missing tests, weak validation, brittle state transitions, and production risk.
- Use commands or delegated checks for verification when they increase confidence.
- Report severity, likely impact, and recommended fix order clearly.`;
          } else if (activeAssistantMode === 'debugger') {
            systemPrompt += `\n[DEBUGGER DIRECTIVES]
- Isolate root cause before broad editing whenever possible.
- Prefer reproduction, traces, diagnostics, and narrow code inspection over guesswork.
- Keep the blast radius small and avoid unrelated refactors.
- Verify the specific failure path after the fix and state what was confirmed.`;
          }
        }
      }

      // Orchestration Trigger Detection
      const ORCHESTRATION_TRIGGERS = [
        'full app', 'entire', 'complete project', 'everything', 'end-to-end',
        'full-stack', 'full stack', 'whole thing', 'the whole', 'from scratch', 'build me a',
        'create a complete', 'scaffold', 'production ready', 'deploy', 'walkthrough', 'walk through', 'sub-agent', 'subagent', 'big feature', 'big project', 'complex app', 'complex project'
      ];
      const shouldActivateOrchestration = (msg: string): boolean => {
        const lower = msg.toLowerCase();
        return ORCHESTRATION_TRIGGERS.some(trigger => lower.includes(trigger));
      };

      if (isCoderMode && shouldActivateOrchestration(content) && !orchestrationState.isActive) {
        setOrchestrationState({
          isActive: true,
          projectAnalysis: {
            complexityScore: 'HIGH',
            estimatedFiles: 20,
            domainsDetected: ['frontend', 'backend', 'database', 'auth', 'devops'],
            recommendedStrategy: 'SUBAGENT_TEAM',
          },
          agents: [
            {
              id: 'plan-analyzer',
              name: 'Analyzer Subagent',
              phase: 1,
              status: 'running',
              filesCreated: [],
              startedAt: Date.now(),
              events: [
                { id: 'evt-1', text: 'Analyzing existing project layout & dependencies...', timestamp: Date.now() },
                { id: 'evt-2', text: 'Decomposing task requirements into modular segments...', timestamp: Date.now() },
                { id: 'evt-3', text: 'Formulating multi-agent phased walkthrough blueprint...', timestamp: Date.now() },
              ]
            }
          ],
          currentPhase: 1,
          totalPhases: 5,
          awaitingUserConfirmation: true,
          conflicts: [],
        });
        const bypassed = ({
          currentPhase: 1,
          totalPhases: 5,
          awaitingUserConfirmation: false,
          conflicts: [],
        });

        systemPrompt += `\n\n[SUBAGENT ORCHESTRATION MODE: WALKTHROUGH PLANNING]
You are the Lumina AI Master Orchestrator in Coder Mode. The user has initiated a walkthrough/plan/big project request.
You MUST outline a comprehensive architecture walkthrough and multi-agent plan first.
1. Present a clear PROJECT ANALYSIS BOARD using unicode box characters (e.g., 🔍 PROJECT ANALYSIS).
2. Briefly describe the roles of subagents involved (Analyzer, Coder, Debugger, Reviewer).
3. Outline a phased task plan.
4. Stop and ask the user for confirmation (e.g. "To approve this walkthrough and begin step-by-step implementation, please click the 'Start Building' button below or reply with 'ok', 'continue', or 'doit'").

Do NOT invoke any tools or execute code edits yet. Just print this beautiful plaintext plan and stop.`;
        if (false) {
          const dummyTemp = `
You are the Lumina AI Master Orchestrator operating in Coder Mode.
Your primary role is to analyze incoming software projects and INTELLIGENTLY DECOMPOSE
large, complex work into coordinated subagent tasks that run with maximum parallelism
and minimum inter-dependency conflicts.

When the user asks to build a full project, FIRST output a PROJECT ANALYSIS BLOCK:
┌─────────────────────────────────────────────────────┐
│ 🔍 PROJECT ANALYSIS                                 │
├─────────────────────────────────────────────────────┤
│ Project Name: <name or "Unnamed Project">           │
│ Complexity Score: <LOW | MEDIUM | HIGH | CRITICAL>  │
│ Estimated Files: <number>                           │
│ Domains Detected: <comma-separated list>            │
│ Parallelizable: <YES | NO>                          │
│ Recommended Strategy: <SOLO | SUBAGENT_TEAM>        │
└─────────────────────────────────────────────────────┘

Then output a SUBAGENT TASK DECOMPOSITION PLAN with phases.
Then ask the user for confirmation before beginning.

Available tools: spawn_orchestrator, spawn_analyzer, spawn_coder, spawn_debugger, spawn_reviewer.`;
        }
      }

      // Inject search context into systemPrompt BEFORE building apiMessages
      if (searchResults.length > 0 && !isCoderMode) {
        const rawContextString = searchResults.slice(0, 8)
          .map((r, i) => `[${i+1}] ${r.title}: ${r.snippet} (URL: ${r.url})`)
          .join('\n\n');
        
        const contextString = useTurboQuant
          ? turboQuantCompress(rawContextString, 5000, 'medium')
          : rawContextString;

        systemPrompt += `\n\nWeb Search Results${useTurboQuant ? ' (TurboQuant compressed)' : ''}:\n${contextString}\n\nPlease use the above search results to provide a grounded, up-to-date response. Cite your sources using [number] notation when appropriate. If the results include an instant answer, prioritize that information.`;
      }

      const recentContext = isCoderMode ? chatContext.slice(-4) : chatContext;
      const hasPendingImages = pendingImageDataUrls.length > 0;
      const apiMessages = [
        { role: 'system', content: systemPrompt },
        ...([...recentContext, userMessage]
          .filter(m => (m.content && m.content.trim().length > 0) || (m.elementAttachments && m.elementAttachments.length > 0) || hasPendingImages)
          .map(m => {
            let text = m.content || '';
            if (m.elementAttachments && m.elementAttachments.length > 0) {
              text += `\n\n[INSPECTED CODE ATTACHMENT FOR CONTEXT]:`;
              m.elementAttachments.forEach((att: any) => {
                const lineInfo = att.lineRangeStart && att.lineRangeEnd && att.lineRangeStart !== att.lineRangeEnd
                  ? `${att.lineRangeStart}-${att.lineRangeEnd}`
                  : (att.lineNumber || att.lineRangeStart || '');
                text += `\n- File Name: ${att.fileName}\n- File Path: ${att.filePath}\n${lineInfo ? `- Line Reference: ${lineInfo}\n` : ''}- Code Subsection:\n\`\`\`\n${att.specificCode}\n\`\`\`\n- Functional Role: ${att.elementWork}\n`;
                if (att.connections && att.connections.length > 0) {
                  text += `- Connected File Sections:\n`;
                  att.connections.forEach((connection: any) => {
                    const connectionLineInfo = connection.lineRangeStart && connection.lineRangeEnd && connection.lineRangeStart !== connection.lineRangeEnd
                      ? `${connection.lineRangeStart}-${connection.lineRangeEnd}`
                      : (connection.lineNumber || connection.lineRangeStart || '');
                    const connectionCode = connection.specificCode || connection.code || connection.snippet || connection.content || '';
                    text += `  - File Name: ${connection.fileName || connection.name || 'Connected file'}\n`;
                    text += `    File Path: ${connection.filePath || connection.name || ''}\n`;
                    if (connectionLineInfo) text += `    Line Reference: ${connectionLineInfo}\n`;
                    if (connectionCode) {
                      text += `    Code Section:\n\`\`\`\n${connectionCode}\n\`\`\`\n`;
                    }
                  });
                }
              });
            }
            return {
              role: m.role,
              content: text
            };
          }))
      ];

      // Attach images as multimodal content to the last user message
      if (pendingImageDataUrls.length > 0) {
        const userMsgIdx = apiMessages.length - 1;
        console.log('[LUMINA_DEBUG] Attaching', pendingImageDataUrls.length, 'images to apiMessages index', userMsgIdx);
        console.log('[LUMINA_DEBUG] apiMessages[userMsgIdx] role:', apiMessages[userMsgIdx]?.role);
        if (apiMessages[userMsgIdx]?.role === 'user') {
          const textContent = apiMessages[userMsgIdx].content || '';
          const contentParts: any[] = [];
          if (textContent) {
            contentParts.push({ type: 'text', text: textContent });
          }
          contentParts.push(...pendingImageDataUrls.map(url => ({ type: 'image_url', image_url: { url } })));
          (apiMessages[userMsgIdx] as any).content = contentParts;
          console.log('[LUMINA_DEBUG] Content array length:', (apiMessages[userMsgIdx] as any).content.length);
          console.log('[LUMINA_DEBUG] Content types:', (apiMessages[userMsgIdx] as any).content.map((c: any) => c.type));
        }
      }
      
      // Log the final apiMessages structure (truncate base64)
      if (pendingImageDataUrls.length > 0) {
        const logSafe = JSON.parse(JSON.stringify(apiMessages));
        for (const msg of logSafe) {
          if (Array.isArray(msg.content)) {
            msg.content = msg.content.map((c: any) => {
              if (c.type === 'image_url' && c.image_url?.url) {
                return { type: 'image_url', image_url: { url: c.image_url.url.substring(0, 80) + '...[truncated]' } };
              }
              return c;
            });
          }
        }
        console.log('[LUMINA_DEBUG] Final apiMessages structure:', JSON.stringify(logSafe, null, 2));
      }

      if (isDeepSearchEnabled && !isCoderMode) {
        setChats(prev => prev.map(chat => {
          if (chat.id !== chatId) return chat;
          return {
            ...chat,
            messages: chat.messages.map(m => m.id === thinkingId
              ? { ...m, thinking: 'Running Deep Research agent...', isSearching: true }
              : m)
          };
        }));

        const deepResearchResponse = await fetch('/api/deep-research/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: content,
            preset: researchMode?.depthPreset || 'standard',
            tavilyKey: tavilyApiKey,
            serpKey: serpApiKey,
            provider: selectedProvider,
            model: selectedModel || activeModelId,
            apiKey,
            baseUrl: serverUrl
          }),
          signal
        });

        if (!deepResearchResponse.ok) {
          const errorPayload = await deepResearchResponse.json().catch(() => ({}));
          throw new Error(errorPayload?.error || 'Deep Research request failed');
        }

        const reader = deepResearchResponse.body?.getReader();
        if (!reader) {
          throw new Error('Deep Research stream was not available');
        }

        const decoder = new TextDecoder();
        let streamBuffer = '';
        let deepResearchData: any = null;
        let streamedReport = '';
        const toolCallNodeMap = new Map<string, ToolCallNode>();
        const buildToolNode = (tc: any, idx = 0): ToolCallNode => ({
          id: tc.id || `deep-tool-${idx}`,
          type: tc.type === 'ai' ? 'ai' : 'tool',
          label: tc.label || tc.toolName || 'deep research step',
          status: tc.status === 'failed' ? 'failed' : tc.status === 'active' ? 'active' : 'complete',
          toolName: tc.toolName,
          argsCount: tc.argsCount,
          resultSummary: tc.resultSummary,
          icon: tc.icon || (
            (tc.toolName || '').includes('search') ? 'search' :
            (tc.toolName || '').includes('wiki') || (tc.toolName || '').includes('visit') || (tc.toolName || '').includes('scrape') ? 'globe' :
            'sparkles'
          )
        });
        const syncThinkingMessage = (contentValue: string, toolCallsValue: ToolCallNode[], isFinal = false) => {
          setChats(prev => prev.map(chat => {
            if (chat.id !== chatId) return chat;
            return {
              ...chat,
              messages: chat.messages.map(m => m.id === thinkingId ? {
                ...m,
                content: contentValue || m.content,
                thinking: isFinal ? undefined : 'Running Deep Research pipeline...',
                isSearching: !isFinal,
                isThinking: !isFinal,
                toolCalls: toolCallsValue,
                isStreaming: !isFinal,
                timestamp: isFinal ? new Date() : m.timestamp
              } : m)
            };
          }));
        };

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          streamBuffer += decoder.decode(value, { stream: true });
          const lines = streamBuffer.split('\n');
          streamBuffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            const evt = JSON.parse(trimmed);

            if (evt.type === 'pipeline' && evt.node) {
              const nextNode = buildToolNode(evt.node, toolCallNodeMap.size);
              toolCallNodeMap.set(nextNode.id, {
                ...(toolCallNodeMap.get(nextNode.id) || {}),
                ...nextNode
              });
              syncThinkingMessage(streamedReport, [...toolCallNodeMap.values()]);
            } else if (evt.type === 'report') {
              streamedReport = sanitizeDeepResearchReport(evt.report || `${streamedReport}${evt.chunk || ''}`);
              syncThinkingMessage(streamedReport, [...toolCallNodeMap.values()]);
            } else if (evt.type === 'final' && evt.result) {
              deepResearchData = evt.result;
            } else if (evt.type === 'done' && evt.result) {
              deepResearchData = evt.result;
            } else if (evt.type === 'error') {
              throw new Error(evt.error || 'Deep Research stream failed');
            }
          }
        }

        if (!deepResearchData) {
          throw new Error('Deep Research completed without a final result');
        }

        const toolCallNodes: ToolCallNode[] = Array.isArray(deepResearchData.toolCalls)
          ? deepResearchData.toolCalls.map((tc: any, idx: number) => buildToolNode(tc, idx))
          : [...toolCallNodeMap.values()];
        const finalContent = sanitizeDeepResearchReport(deepResearchData.report || streamedReport || 'Deep Research completed, but no final report text was returned.');
        const thinkTagMatch = finalContent.match(/<think>[\s\S]*?<\/think>/);
        const finalThinkContent = thinkTagMatch ? thinkTagMatch[0] : '';
        const finalDisplayContent = finalContent.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

        if (signal.aborted) {
          return;
        }

        let finalArtifacts = extractArtifacts(finalDisplayContent, effectiveWritingStyle, chats, chatId);
        const cleanReport = sanitizeDeepResearchReport(finalDisplayContent || finalContent);
        const cleanHtmlReport = String(deepResearchData.htmlReport || '').trim();
        if (cleanReport.length > 80) {
          const reportTitle = createDeepResearchReportTitle(cleanReport);
          const prioritizedArtifacts: any[] = [];
          if (cleanHtmlReport) {
            prioritizedArtifacts.push({
              id: 'deep-research-html-report-' + Date.now().toString(36),
              title: `${reportTitle} Visual Report`,
              language: 'html',
              content: cleanHtmlReport,
              type: 'html'
            });
          }
          prioritizedArtifacts.push({
            id: 'deep-research-report-' + Date.now().toString(36),
            title: reportTitle,
            language: 'markdown',
            content: cleanReport,
            type: 'report'
          });
          finalArtifacts = [
            ...prioritizedArtifacts,
            ...finalArtifacts.filter(artifact => !['report', 'markdown', 'html'].includes(artifact.type))
          ];
        }

        if (finalArtifacts.length > 0) {
          setActiveArtifact(finalArtifacts[0]);
          setIsCanvasOpen(true);
          setCanvasView(['html', 'markdown', 'report'].includes(finalArtifacts[0].type) ? 'preview' : 'code');
        }

        try {
          triggerBackgroundMemoryExtraction(content, finalDisplayContent || finalContent.trim());
        } catch (err) {
          console.warn('Memory extraction invocation failed:', err);
        }

        setChats(prev => prev.map(chat => {
          if (chat.id === chatId) {
            return {
              ...chat,
              messages: chat.messages.map(m =>
                m.id === thinkingId
                  ? {
                    ...m,
                      content: finalDisplayContent || finalContent.trim(),
                      thinkContent: finalThinkContent.replace(/<\/?think>/g, '').trim() || undefined,
                      isThinking: false,
                      streamPos: undefined,
                      thinking: undefined,
                      toolCalls: toolCallNodes,
                      isStreaming: false,
                      sources: searchResults.length > 0 ? searchResults.slice(0, 10).map(r => ({ title: r.title, url: r.url, snippet: r.snippet })) : undefined,
                      images: undefined,
                      searchQuery: userMessage.content,
                      isSearching: false,
                      timestamp: new Date(),
                      artifacts: finalArtifacts.length > 0 ? finalArtifacts : undefined
                    }
                  : m
              ),
              updatedAt: new Date(),
            };
          }
          return chat;
        }));
        return;
      }
      
      // Coder Mode: delegate all heavy lifting to the Pi Agent
      // The UI is just a wrapper — pi agent handles tool execution, streaming, and finalization
      if (effectiveCoderMode && !orchestrationState.awaitingUserConfirmation) {
        // Ensure typing state is managed by this function's finally block
        try {
          await runCoderTaskWithPiAgent({
            chatId: chatId!,
            thinkingId,
            task: content,
            systemPrompt: '',
            coderWorkspacePath,
            apiKey: apiKey,
            modelId: activeModelId,
            provider: selectedProvider,
            baseUrl: serverUrl,
            signal,
          });
        } catch (err) {
          // runCoderTaskWithPiAgent handles its own state updates; surface a toast
          const msg = err instanceof Error ? err.message : String(err);
          if (!signal.aborted) {
            showToast(`Agent error: ${msg}`);
          }
        }
        return;
      }

      // Non-coder or orchestrator-pending: use the bridge as before
      let rawResponse: any = await callLlamaBridge(apiMessages, activeTools, signal);

      const data = rawResponse;
      let choice = data.choices?.[0]?.message;
      let toolCallsRaw = choice?.tool_calls;
      const responseImages = data.images || [];

      const toolCallNodes: ToolCallNode[] = [];
      let agentTraceContent = '';

      const hasWebScrapeCall = toolCallsRaw && toolCallsRaw.some((tc: any) => {
        const name = tc.function?.name || '';
        return name === 'current_time' || name === 'web_scrape' || name === 'search' || name === 'visit' || name === 'google_scholar' || name.startsWith('wiki_') || name.startsWith('composio_');
      });
      if (isCoderMode || hasWebScrapeCall) {
        let successfulScrapesCount = 0;
        let successfulWikiSearchCount = 0;
        let successfulVisitCount = 0;
        let successfulSearchCallCount = 0;
        let hasDeepResearchTimeToolRun = false;
        let loopCount = 0;
        const turnToolResultCache = new Map<string, any>();
        const maxLoops = 20;
        while (choice?.tool_calls && choice.tool_calls.length > 0 && loopCount < maxLoops) {
          loopCount++;
          let shouldStopAfterAsk = false;

          const interimThought = typeof choice.content === 'string' ? choice.content.trim() : '';
          if (interimThought) {
            agentTraceContent += `${agentTraceContent ? '\n\n' : ''}${interimThought}`;
            setChats(prev => prev.map(chat => {
              if (chat.id !== chatId) return chat;
              return {
                ...chat,
                messages: chat.messages.map(m => m.id === thinkingId ? {
                  ...m,
                  content: `${m.content || ''}${m.content ? '\n\n' : ''}${interimThought}`,
                  thinking: `Planning next tool step ${loopCount}...`
                } : m)
              };
            }));
          }
          
          const activeToolNames = choice.tool_calls.map((t: any) => t.function?.name || '');
          if (activeToolNames.some((n: string) => n === 'read_file' || n === 'glob_tool' || n === 'grep_tool' || n === 'analyze_file')) {
            setCoderTodos(prev => {
              if (prev.length > 0) {
                return prev.map((item, idx) => {
                  if (idx === 0) return { ...item, status: 'complete' };
                  if (idx === 1 && item.status === 'pending') return { ...item, status: 'in_progress' };
                  return item;
                });
              }
              return prev;
            });
          }
          if (activeToolNames.some((n: string) => n === 'write_file' || n === 'edit_file')) {
            setCoderTodos(prev => {
              if (prev.length > 1) {
                return prev.map((item, idx) => {
                  if (idx <= 1) return { ...item, status: 'complete' };
                  if (idx === 2 && item.status === 'pending') return { ...item, status: 'in_progress' };
                  return item;
                });
              }
              return prev;
            });
          }
          if (loopCount >= 2) {
            setCoderTodos(prev => {
              if (prev.length > 2) {
                return prev.map((item, idx) => {
                  if (idx <= 2) return { ...item, status: 'complete' };
                  if (idx === 3 && item.status === 'pending') return { ...item, status: 'in_progress' };
                  return item;
                });
              }
              return prev;
            });
          }

          const currentCallNodes: ToolCallNode[] = [];
          
          for (const [idx, tc] of choice.tool_calls.entries()) {
            const fn = tc.function || {};
            const name = fn.name || 'unknown';
            const args = fn.arguments ? (() => { try { return JSON.parse(fn.arguments); } catch { return {}; } })() : {};
            
            const isScrape = name === 'web_scrape' || name === 'fetch_url';
            const readRange = name === 'read_file' && (args.offset || args.limit) ? ` [offset=${args.offset || 1}, limit=${args.limit || 'all'}]` : '';
            const normalizedArgPath = normalizeToolFilePath(String(args.filePath || ''), coderWorkspacePath);
            const toolCategory = getToolCategory(name);
            const displayLabel =
              isScrape ? `Web fetch (${args.url})` :
              name === 'run_command' ? `Run command (${String(args.command || '').trim() || 'shell'})` :
              name.startsWith('spawn_') ? `Delegate ${name.replace('spawn_', '')} (${String(args.task || '').slice(0, 60) || 'task'})` :
              name === 'grep_tool' ? `Search code (${String(args.query || '').slice(0, 60) || 'query'})${args.fileGlob ? ` in ${args.fileGlob}` : ''}` :
              name === 'glob_tool' ? `Find files (${String(args.fileGlob || '').slice(0, 60) || '*'})` :
              name === 'read_file' ? `Read file ${normalizedArgPath ? `(${normalizedArgPath})` : ''}${readRange}` :
              name === 'edit_file' ? `Edit file ${normalizedArgPath ? `(${normalizedArgPath})` : ''}` :
              name === 'write_file' ? `Write file ${normalizedArgPath ? `(${normalizedArgPath})` : ''}` :
              name === 'apply_patch' ? 'Apply patch' :
              name === 'analyze_file' ? `Analyze file ${normalizedArgPath ? `(${normalizedArgPath})` : ''}` :
              name === 'glob_tool' ? `glob_tool ${String(args.fileGlob || args.pattern || args.glob || '').trim() ? `(${String(args.fileGlob || args.pattern || args.glob || '').trim()})` : ''}` :
              name === 'grep_tool' ? `grep_tool ${String(args.query || args.pattern || '').trim() ? `(${String(args.query || args.pattern || '').trim()})` : ''}` :
              name === 'run_skill' ? `read_skill ${String(args.skillId || '').trim() ? `(${String(args.skillId || '').trim()})` : ''}` :
              name.startsWith('composio_') ? `Composio: ${name.replace('composio_', '').replace(/_/g, ' ')}` :
              `${name} ${normalizedArgPath ? `(${normalizedArgPath})` : ''}${readRange}`;
            const node: ToolCallNode = {
              id: tc.id || createStableTurnId('tc', loopCount, idx, name),
              type: 'tool',
              label: displayLabel,
              status: 'active',
              toolName: name,
              toolCategory,
              argsCount: typeof args === 'object' && args ? Object.keys(args).length : 0,
              icon: isScrape ? 'globe' :
                    name === 'web_search' ? 'search' :
                    name === 'glob_tool' ? 'file' :
                    name === 'grep_tool' ? 'search' :
                    name === 'read_file' ? 'file' :
                    name === 'write_file' ? 'write' :
                    name === 'edit_file' ? 'edit' :
                    name === 'analyze_file' ? 'code' :
                    name === 'run_skill' ? 'sparkles' :
                    name === 'manage_todos' ? 'wrench' :
                    name === 'ask_user' ? 'sparkles' :
                    name === 'create_file' ? 'sparkles' :
                    name === 'delete_file' ? 'terminal' :
                    name === 'rename_file' ? 'edit' :
                    name === 'run_command' ? 'terminal' :
                    name.startsWith('composio_') ? 'puzzle' :
                    name.includes('grep') || name.includes('search') || name.includes('subtask') ? 'search' :
                    name.includes('read') || name.includes('file') ? 'file' :
                    name.includes('edit') || name.includes('create') ? 'edit' :
                    'sparkles',
              filePath: normalizedArgPath || '',
              addedCount: undefined,
              removedCount: undefined
            };
            currentCallNodes.push(node);
            toolCallNodes.push(node);
          }
          const currentRawNodeIds = new Set(currentCallNodes.map(node => node.id));

          // Group consecutive wiki tool calls into a single wiki_research parent node with animated sub-nodes
          {
            const groupedCallNodes: ToolCallNode[] = [];
            let i = 0;
            while (i < currentCallNodes.length) {
              const node = currentCallNodes[i];
              if (node.toolName?.startsWith('wiki_')) {
                // Collect consecutive wiki tool nodes
                const wikiGroup: ToolCallNode[] = [];
                while (i < currentCallNodes.length && currentCallNodes[i].toolName?.startsWith('wiki_')) {
                  wikiGroup.push(currentCallNodes[i]);
                  i++;
                }
                if (wikiGroup.length === 1) {
                  // Single wiki tool — keep as-is
                  groupedCallNodes.push(wikiGroup[0]);
                } else {
                  // Multiple consecutive wiki tools — create parent with animated sub-nodes
                  const firstArgs = wikiGroup[0].label?.match(/\[([^\]]+)\]/)?.[1] || '';
                  const parentNode: ToolCallNode = {
                    id: `wiki-group-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                    type: 'tool',
                    label: firstArgs ? `Wiki research (${firstArgs})` : 'Wiki research',
                    status: 'active',
                    toolName: 'wiki_research',
                    toolCategory: 'web',
                    argsCount: wikiGroup.length,
                    icon: 'globe',
                    subNodes: wikiGroup.map(sub => ({ ...sub, id: sub.id })),
                  };
                  groupedCallNodes.push(parentNode);
                }
              } else {
                groupedCallNodes.push(node);
                i++;
              }
            }
            currentCallNodes.length = 0;
            currentCallNodes.push(...groupedCallNodes);
            // Also update toolCallNodes to match the grouped current batch.
            const previousNodes = toolCallNodes.filter(node => !currentRawNodeIds.has(node.id));
            toolCallNodes.length = 0;
            toolCallNodes.push(...previousNodes, ...groupedCallNodes);
          }

          const currentPlaceholders = currentCallNodes.map(node => `[[tool_call:${node.id}]]`).join('\n\n');
          agentTraceContent += `${agentTraceContent ? '\n\n' : ''}${currentPlaceholders}`;

          setChats(prev => prev.map(chat => {
            if (chat.id === chatId) {
              return {
                ...chat,
                messages: chat.messages.map(m => m.id === thinkingId ? {
                  ...m,
                  content: `${m.content || ''}${m.content ? '\n\n' : ''}${currentPlaceholders}`,
                  toolCalls: [...toolCallNodes]
                } : m)
              };
            }
            return chat;
          }));

          const toolResultMessages = [];
          for (const tc of choice.tool_calls) {
            const fn = tc.function || {};
            const name = fn.name || 'unknown';
            const args = fn.arguments ? (() => { try { return JSON.parse(fn.arguments); } catch { return {}; } })() : {};
            let resultValue: any = null;
            const cacheKey = `${name}:${JSON.stringify({
              ...args,
              filePath: normalizeToolFilePath(String(args.filePath || ''), coderWorkspacePath),
              newPath: normalizeToolFilePath(String(args.newPath || ''), coderWorkspacePath),
              command: String(args.command || '').trim()
            })}`;

            try {
              if (turnToolResultCache.has(cacheKey)) {
                resultValue = {
                  ...turnToolResultCache.get(cacheKey),
                  reusedFromCache: true
                };
                const cachedNode = toolCallNodes.find(n => n.id === tc.id);
                if (cachedNode) {
                  cachedNode.resultSummary = 'Reused previously collected result in this turn';
                  cachedNode.label = `${cachedNode.label} [cached]`;
                }
                showToast(`Reused cached result for ${name}`);
              } else if (!isCoderMode && ['write_file', 'edit_file', 'read_file', 'glob_tool', 'grep_tool', 'analyze_file', 'run_skill', 'manage_todos', 'ask_user', 'create_file', 'delete_file', 'rename_file', 'run_command'].includes(name)) {
                throw new Error("Coder tools are disabled when Coder Mode is inactive (Chat Mode).");
              } else {
                const workspaceArg = coderWorkspacePath ? { workspaceRoot: coderWorkspacePath } : {};
                if (isDeepSearchEnabled && !isCoderMode && loopCount === 1 && !hasDeepResearchTimeToolRun && name !== 'current_time') {
                  resultValue = {
                    error: 'Deep research must start with current_time as the first tool call. Call current_time first, then create a brief research plan, then continue.'
                  };
                } else if (name === 'current_time') {
                  const now = new Date();
                  resultValue = {
                    iso: now.toISOString(),
                    timestamp: now.getTime(),
                    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
                    locale: Intl.DateTimeFormat().resolvedOptions().locale || 'en-US',
                    date: now.toLocaleDateString(),
                    time: now.toLocaleTimeString(),
                    utcOffsetMinutes: -now.getTimezoneOffset(),
                    dayOfWeek: now.toLocaleDateString(undefined, { weekday: 'long' })
                  };
                  hasDeepResearchTimeToolRun = true;
                  const currentN = toolCallNodes.find(n => n.id === tc.id);
                  if (currentN) {
                    currentN.resultSummary = `Current time loaded: ${resultValue.iso}`;
                  }
                } else if (name === 'create_file') {
                const cleanedPath = normalizeToolFilePath(args.filePath, coderWorkspacePath);
                const fullPath = coderWorkspacePath ? `${coderWorkspacePath.replace(/\\/g, '/')}/${cleanedPath}` : `./${cleanedPath}`;
                if (cleanedPath.includes('/') && !args.isDirectory) {
                  const folderPart = cleanedPath.substring(0, cleanedPath.lastIndexOf('/'));
                  const folderFullPath = coderWorkspacePath ? `${coderWorkspacePath.replace(/\\/g, '/')}/${folderPart}` : `./${folderPart}`;
                  await fetch('/api/fs/create', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ filePath: folderFullPath, isDirectory: true, ...workspaceArg }), signal
                  });
                }
                const createRes = await fetch('/api/fs/create', {
                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ filePath: fullPath, isDirectory: !!args.isDirectory, content: args.content, ...workspaceArg }), signal
                });
                resultValue = { ...(await createRes.json()), filePath: cleanedPath, action: args.isDirectory ? 'created_directory' : 'created_file' };
                showToast(`Created ${cleanedPath}`);
              } else if (name === 'delete_file') {
                const cleanedPath = normalizeToolFilePath(args.filePath, coderWorkspacePath);
                const fullPath = coderWorkspacePath ? `${coderWorkspacePath.replace(/\\/g, '/')}/${cleanedPath}` : `./${cleanedPath}`;
                const delRes = await fetch('/api/fs/delete', {
                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ filePath: fullPath, ...workspaceArg }), signal
                });
                resultValue = { ...(await delRes.json()), filePath: cleanedPath, action: 'deleted_file' };
                showToast(`Deleted ${cleanedPath}`);
              } else if (name === 'rename_file') {
                const oldPath = normalizeToolFilePath(args.filePath, coderWorkspacePath);
                const newPath = normalizeToolFilePath(args.newPath, coderWorkspacePath);
                const fullOldPath = coderWorkspacePath ? `${coderWorkspacePath.replace(/\\/g, '/')}/${oldPath}` : `./${oldPath}`;
                const fullNewPath = coderWorkspacePath ? `${coderWorkspacePath.replace(/\\/g, '/')}/${newPath}` : `./${newPath}`;
                const moveRes = await fetch('/api/fs/move', {
                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ oldPath: fullOldPath, newPath: fullNewPath, ...workspaceArg }), signal
                });
                resultValue = { ...(await moveRes.json()), filePath: newPath, oldPath, newPath, action: 'renamed_file' };
                showToast(`Renamed ${oldPath} → ${newPath}`);
              } else if (name === 'write_file' && (() => {
                const cleanedPath = normalizeToolFilePath(args.filePath, coderWorkspacePath);
                const skillMatch = getVirtualSkillMatch(cleanedPath);
                if (skillMatch) {
                  let customSkills: any[] = [];
                  try {
                    const saved = localStorage.getItem('lumina_custom_skills');
                    if (saved) customSkills = JSON.parse(saved);
                  } catch (e) {}
                  let targetSkillIndex = customSkills.findIndex((s: any) => s.id === skillMatch.skillId || s.name.toLowerCase() === skillMatch.skillId.toLowerCase());
                  if (targetSkillIndex === -1) {
                    const formattedId = skillMatch.skillId.toLowerCase();
                    const newSkill = {
                      id: formattedId,
                      name: formattedId,
                      addedBy: 'AI',
                      trigger: 'Slash command + auto',
                      description: 'AI-created skill module.',
                      enabled: true,
                      tree: []
                    };
                    customSkills.push(newSkill);
                    targetSkillIndex = customSkills.length - 1;
                  }
                  const skill = customSkills[targetSkillIndex];
                  const pathParts = skillMatch.subPath.split('/');
                  const isUpdated = setVirtualSkillFileContent(skill.tree, pathParts, args.content || '');
                  if (isUpdated) {
                    localStorage.setItem('lumina_custom_skills', JSON.stringify(customSkills));
                    window.dispatchEvent(new Event('lumina_skills_updated'));
                    resultValue = { success: true, filePath: cleanedPath, action: 'created_or_updated_skill_file' };
                  } else {
                    resultValue = { error: `Could not write virtual skill file ${cleanedPath}` };
                  }
                  showToast(`Wrote skill file ${cleanedPath}`);
                  return false;
                }
                return true;
              })()) {
                const cleanedPath = normalizeToolFilePath(args.filePath, coderWorkspacePath);
                const fullPath = coderWorkspacePath ? `${coderWorkspacePath.replace(/\\/g, '/')}/${cleanedPath}` : `./${cleanedPath}`;
                
                let oldContent = '';
                try {
                  const readOld = await fetch('/api/fs/read', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ filePath: fullPath, ...workspaceArg }),
                    signal
                  });
                  if (readOld.ok) {
                    const oldData = await readOld.json();
                    oldContent = oldData.content || '';
                  }
                } catch (e) {}

                if (cleanedPath.includes('/')) {
                  const folderPart = cleanedPath.substring(0, cleanedPath.lastIndexOf('/'));
                  const folderFullPath = coderWorkspacePath ? `${coderWorkspacePath.replace(/\\/g, '/')}/${folderPart}` : `./${folderPart}`;
                  await fetch('/api/fs/create', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ filePath: folderFullPath, isDirectory: true, ...workspaceArg }),
                    signal
                  });
                }
                const writeRes = await fetch('/api/fs/write', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ filePath: fullPath, content: args.content, ...workspaceArg }),
                  signal
                });
                const writeData = await writeRes.json().catch(() => ({}));
                
                const newContent = args.content || '';
                const diffValues = computeLineDiff(oldContent, newContent);
                
                const matchingNode = toolCallNodes.find(n => n.id === tc.id);
                if (matchingNode) {
                  matchingNode.addedCount = diffValues.added;
                  matchingNode.removedCount = diffValues.removed;
                  matchingNode.oldContent = oldContent;
                  matchingNode.newContent = newContent;
                  matchingNode.filePath = cleanedPath;
                }
                if (!writeRes.ok) {
                  try {
                    const verifyRes = await fetch('/api/fs/read', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ filePath: fullPath, ...workspaceArg }),
                      signal
                    });
                    const verifyData = await verifyRes.json().catch(() => ({}));
                    const verifiedContent = typeof verifyData.content === 'string' ? verifyData.content : '';
                    if (verifyRes.ok && verifiedContent === newContent) {
                      resultValue = {
                        success: true,
                        recoveredAfterWriteError: true,
                        filePath: cleanedPath,
                        action: oldContent ? 'updated_file' : 'created_file',
                        addedCount: diffValues.added,
                        removedCount: diffValues.removed
                      };
                    } else {
                      resultValue = {
                        ...writeData,
                        error: writeData.error || writeData.detail || `Failed to write ${cleanedPath}`,
                        filePath: cleanedPath,
                        action: oldContent ? 'updated_file' : 'created_file',
                        addedCount: diffValues.added,
                        removedCount: diffValues.removed
                      };
                    }
                  } catch {
                    resultValue = {
                      ...writeData,
                      error: writeData.error || writeData.detail || `Failed to write ${cleanedPath}`,
                      filePath: cleanedPath,
                      action: oldContent ? 'updated_file' : 'created_file',
                      addedCount: diffValues.added,
                      removedCount: diffValues.removed
                    };
                  }
                } else {
                  resultValue = {
                    ...writeData,
                    filePath: cleanedPath,
                    action: oldContent ? 'updated_file' : 'created_file',
                    addedCount: diffValues.added,
                    removedCount: diffValues.removed
                  };
                }
                showToast(`Wrote ${cleanedPath}`);
              } else if (name === 'read_file') {
                const cleanedPath = normalizeToolFilePath(args.filePath, coderWorkspacePath);
                const skillMatch = getVirtualSkillMatch(cleanedPath);
                if (skillMatch) {
                  let customSkills: any[] = [];
                  try {
                    const saved = localStorage.getItem('lumina_custom_skills');
                    if (saved) customSkills = JSON.parse(saved);
                  } catch (e) {}
                  const targetSkill = customSkills.find((s: any) => s.id === skillMatch.skillId || s.name.toLowerCase() === skillMatch.skillId.toLowerCase());
                  if (targetSkill) {
                    const pathParts = skillMatch.subPath.split('/');
                    const foundFile = findVirtualSkillFile(targetSkill.tree, pathParts);
                    if (foundFile && foundFile.content !== undefined) {
                      resultValue = { success: true, content: foundFile.content, filePath: cleanedPath };
                    } else {
                      resultValue = { error: `File ${skillMatch.subPath} not found in skill ${skillMatch.skillId}` };
                    }
                  } else {
                    resultValue = { error: `Skill ${skillMatch.skillId} not found in custom skills list` };
                  }
                  showToast(`Read skill file ${cleanedPath}`);
                } else {
                  const fullPath = coderWorkspacePath ? `${coderWorkspacePath.replace(/\\/g, '/')}/${cleanedPath}` : `./${cleanedPath}`;
                const readBody: any = { filePath: fullPath, ...workspaceArg };
                if (args.offset) readBody.offset = Number(args.offset);
                if (args.limit) readBody.limit = Number(args.limit);
                const readRes = await fetch('/api/fs/read', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(readBody),
                  signal
                });
                resultValue = { ...(await readRes.json()), filePath: cleanedPath };
                const range = args.offset ? ` [offset=${args.offset}${args.limit ? `, limit=${args.limit}` : ''}]` : '';
                showToast(`Read ${cleanedPath}${range}`);
                }
              } else if (name === 'glob_tool') {
                const maxResults = Math.max(1, Math.min(Number(args.maxResults || 30), 80));
                const listRes = await fetch('/api/fs/list', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ folderPath: coderWorkspacePath || '.', ...workspaceArg }),
                  signal
                });
                const listData = await listRes.json();
                let files = listData.files || [];

                const fileGlob = String(args.fileGlob || '').toLowerCase();
                if (fileGlob) {
                  files = files.filter((f: any) => {
                    if (f.isDirectory) return false;
                    const rel = String(f.relativePath || f.path || '');
                    return matchesWorkspaceGlob(rel, fileGlob);
                  });
                }

                resultValue = { fileGlob, count: files.length, files: files.slice(0, maxResults).map((f: any) => ({ filePath: f.relativePath || f.path, isDirectory: f.isDirectory })) };
                showToast(`Glob matched ${files.length} file${files.length === 1 ? '' : 's'}`);
              } else if (name === 'grep_tool') {
                const maxResults = Math.max(1, Math.min(Number(args.maxResults || 30), 80));
                const listRes = await fetch('/api/fs/list', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ folderPath: coderWorkspacePath || '.', ...workspaceArg }),
                  signal
                });
                const listData = await listRes.json();
                let files = listData.files || [];

                const fileGlob = String(args.fileGlob || '').toLowerCase();
                if (fileGlob) {
                  files = files.filter((f: any) => {
                    if (f.isDirectory) return false;
                    const rel = String(f.relativePath || f.path || '');
                    return matchesWorkspaceGlob(rel, fileGlob);
                  });
                }

                files = files.filter((f: any) => {
                  if (f.isDirectory) return false;
                  const rel = String(f.relativePath || f.path || '').toLowerCase();
                  return /\.(html?|css|scss|js|jsx|ts|tsx|json|md|vue|svelte|py|rs|go|php|rb|java|kt|swift)$/i.test(rel);
                });

                const query = String(args.query || '').trim();
                let regex: RegExp;
                try { regex = new RegExp(query, 'ig'); } catch { regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'ig'); }
                const matches: any[] = [];
                for (const file of files) {
                  if (matches.length >= maxResults) break;
                  const readRes = await fetch('/api/fs/read', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ filePath: file.relativePath || file.path, ...workspaceArg }),
                    signal
                  });
                  if (!readRes.ok) continue;
                  const readData = await readRes.json();
                  const lines = String(readData.content || '').split('\n');
                  lines.forEach((line, idx) => {
                    if (matches.length >= maxResults) return;
                    regex.lastIndex = 0;
                    if (regex.test(line)) {
                      matches.push({ filePath: file.relativePath || file.path, line: idx + 1, text: line.trim().slice(0, 240) });
                    }
                  });
                }
                resultValue = { query, count: matches.length, matches };
                showToast(`Grep found ${matches.length} match${matches.length === 1 ? '' : 'es'}`);
              } else if (name === 'apply_patch') {
                const patch = String(args.patch || '');
                if (!patch.trim()) throw new Error("apply_patch requires a patch parameter");
                showToast('Applying patch...');
                const runData = await executeViaTerminal(`apply_patch <<'PATCH'\n${patch}\nPATCH`, coderWorkspacePath, {
                  workspaceRoot: coderWorkspacePath,
                  isCoderMode: isCoderMode,
                  signal,
                });
                resultValue = {
                  exitCode: runData.exitCode,
                  stdout: runData.stdout,
                  stderr: runData.stderr,
                  applied: runData.exitCode === 0
                };
                if (runData.exitCode === 0) {
                  triggerWorkspaceRefresh();
                }
              } else if (name === 'todowrite') {
                const contentValue = String(args.content || '');
                const todoPathRaw = String(args.filePath || 'TODO.md');
                const cleanedPath = normalizeToolFilePath(todoPathRaw, coderWorkspacePath) || 'TODO.md';
                if (!contentValue.trim()) throw new Error("todowrite requires content");
                const fullPath = coderWorkspacePath ? `${coderWorkspacePath.replace(/\\/g, '/')}/${cleanedPath}` : `./${cleanedPath}`;
                const writeRes = await fetch('/api/fs/write', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ filePath: fullPath, content: contentValue, ...workspaceArg }),
                  signal
                });
                const writeData = await writeRes.json();
                if (!writeRes.ok) throw new Error(writeData.error || writeData.detail || 'Failed to write TODO file');
                resultValue = {
                  ...writeData,
                  filePath: cleanedPath,
                  action: 'todowrite'
                };
                triggerWorkspaceRefresh();
                showToast(`Updated ${cleanedPath}`);
              } else if (name === 'analyze_file') {
                const cleanedPath = normalizeToolFilePath(String(args.filePath || ''), coderWorkspacePath);
                if (!cleanedPath) throw new Error("LSP_Experimental requires filePath");
                const fullPath = coderWorkspacePath ? `${coderWorkspacePath.replace(/\\/g, '/')}/${cleanedPath}` : `./${cleanedPath}`;
                const lspRes = await fetch('/api/lsp/analyze', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ filePath: fullPath, ...workspaceArg }),
                  signal
                });
                resultValue = { ...(await lspRes.json()), filePath: cleanedPath };
                showToast(`LSP analyzed ${cleanedPath}`);
              } else if (name === 'edit_file' && (() => {
                const cleanedPath = normalizeToolFilePath(String(args.filePath || ''), coderWorkspacePath);
                const skillMatch = getVirtualSkillMatch(cleanedPath);
                if (skillMatch) {
                  let customSkills: any[] = [];
                  try {
                    const saved = localStorage.getItem('lumina_custom_skills');
                    if (saved) customSkills = JSON.parse(saved);
                  } catch (e) {}
                  const targetSkill = customSkills.find((s: any) => s.id === skillMatch.skillId || s.name.toLowerCase() === skillMatch.skillId.toLowerCase());
                  if (targetSkill) {
                    const pathParts = skillMatch.subPath.split('/');
                    const foundFile = findVirtualSkillFile(targetSkill.tree, pathParts);
                    if (foundFile && foundFile.content !== undefined) {
                      const oldContent = foundFile.content || '';
                      const searchText = String(args.search || '');
                      const replaceText = String(args.replace ?? '');
                      const occurrences = oldContent.split(searchText).length - 1;
                      
                      if (occurrences === 0) {
                        throw new Error(`Exact search text was not found in ${cleanedPath}`);
                      }
                      
                      const newContentVal = args.all ? oldContent.split(searchText).join(replaceText) : oldContent.replace(searchText, replaceText);
                      foundFile.content = newContentVal;
                      
                      localStorage.setItem('lumina_custom_skills', JSON.stringify(customSkills));
                      window.dispatchEvent(new Event('lumina_skills_updated'));
                      
                      const diffValues = computeLineDiff(oldContent, newContentVal);
                      const matchingNode = toolCallNodes.find(n => n.id === tc.id);
                      if (matchingNode) {
                        matchingNode.addedCount = diffValues.added;
                        matchingNode.removedCount = diffValues.removed;
                        matchingNode.oldContent = oldContent;
                        matchingNode.newContent = newContentVal;
                        matchingNode.filePath = cleanedPath;
                      }
                      resultValue = {
                        success: true,
                        filePath: cleanedPath,
                        replacements: args.all ? occurrences : 1,
                        addedCount: diffValues.added,
                        removedCount: diffValues.removed,
                        action: 'edited_file'
                      };
                      showToast(`Patched virtual skill file ${cleanedPath}`);
                    } else {
                      resultValue = { error: `File ${skillMatch.subPath} not found in skill ${skillMatch.skillId}` };
                    }
                  } else {
                    resultValue = { error: `Skill ${skillMatch.skillId} not found in custom skills list` };
                  }
                  return false;
                }
                return true;
              })()) {
                const cleanedPath = normalizeToolFilePath(String(args.filePath || ''), coderWorkspacePath);
                const searchText = String(args.search || '');
                const replaceText = String(args.replace ?? '');
                if (!cleanedPath || !searchText) throw new Error("edit_file requires filePath and search");
                const fullPath = coderWorkspacePath ? `${coderWorkspacePath.replace(/\\/g, '/')}/${cleanedPath}` : `./${cleanedPath}`;
                const readRes = await fetch('/api/fs/read', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ filePath: fullPath, ...workspaceArg }),
                  signal
                });
                const readData = await readRes.json();
                if (!readRes.ok) throw new Error(readData.error || readData.detail || `Could not read ${cleanedPath}`);
                const oldContent = readData.content || '';
                const occurrences = oldContent.split(searchText).length - 1;
                if (occurrences === 0) throw new Error(`Exact search text was not found in ${cleanedPath}`);
                const newContentVal = args.all ? oldContent.split(searchText).join(replaceText) : oldContent.replace(searchText, replaceText);
                const writeRes = await fetch('/api/fs/write', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ filePath: fullPath, content: newContentVal, ...workspaceArg }),
                  signal
                });
                const writeData = await writeRes.json().catch(() => ({}));
                const diffValues = computeLineDiff(oldContent, newContentVal);
                const matchingNode = toolCallNodes.find(n => n.id === tc.id);
                if (matchingNode) {
                  matchingNode.addedCount = diffValues.added;
                  matchingNode.removedCount = diffValues.removed;
                  matchingNode.oldContent = oldContent;
                  matchingNode.newContent = newContentVal;
                  matchingNode.filePath = cleanedPath;
                }
                if (!writeRes.ok) {
                  try {
                    const verifyRes = await fetch('/api/fs/read', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ filePath: fullPath, ...workspaceArg }),
                      signal
                    });
                    const verifyData = await verifyRes.json().catch(() => ({}));
                    const verifiedContent = typeof verifyData.content === 'string' ? verifyData.content : '';
                    if (verifyRes.ok && verifiedContent === newContentVal) {
                      resultValue = {
                        success: true,
                        recoveredAfterWriteError: true,
                        filePath: cleanedPath,
                        replacements: args.all ? occurrences : 1,
                        addedCount: diffValues.added,
                        removedCount: diffValues.removed,
                        action: 'edited_file'
                      };
                    } else {
                      resultValue = {
                        ...writeData,
                        error: writeData.error || writeData.detail || `Failed to update ${cleanedPath}`,
                        filePath: cleanedPath,
                        replacements: args.all ? occurrences : 1,
                        addedCount: diffValues.added,
                        removedCount: diffValues.removed,
                        action: 'edited_file'
                      };
                    }
                  } catch {
                    resultValue = {
                      ...writeData,
                      error: writeData.error || writeData.detail || `Failed to update ${cleanedPath}`,
                      filePath: cleanedPath,
                      replacements: args.all ? occurrences : 1,
                      addedCount: diffValues.added,
                      removedCount: diffValues.removed,
                      action: 'edited_file'
                    };
                  }
                } else {
                  resultValue = {
                    ...writeData,
                    filePath: cleanedPath,
                    replacements: args.all ? occurrences : 1,
                    addedCount: diffValues.added,
                    removedCount: diffValues.removed,
                    action: 'edited_file'
                  };
                }
                showToast(`Patched ${cleanedPath}`);
              } else if (name === 'run_skill') {
                const skillId = String(args.skillId || '');
                const inputVal = String(args.input || '');
                const customSkills = loadCustomSkillsFromStorage();
                const customSkill = customSkills.find((s: any) =>
                  s?.id === skillId ||
                  String(s?.name || '').toLowerCase() === skillId.toLowerCase()
                );

                if (customSkill) {
                  const skillMd = findSkillMarkdownNode(customSkill);
                  if (!skillMd?.content) {
                    resultValue = {
                      error: `Custom skill "${customSkill.name || skillId}" is missing SKILL.md content.`
                    };
                  } else {
                    resultValue = buildSkillExecutionPayload(customSkill, inputVal);
                  }
                } else {
                  const skill = SKILLS.find((s: any) => s.id === skillId);
                  if (skill) {
                    resultValue = {
                      skillId,
                      skillLabel: skill.label,
                      description: `Legacy quick skill reference: ${skill.label}`,
                      input: inputVal,
                      mode: 'read_skill_context',
                      markdown: skill.prompt,
                      instructions: [
                        'Read this legacy skill prompt as context for the task.',
                        'This is not an executable skill runtime.',
                        'Prefer custom SKILL.md-based skills when available for richer workflows.'
                      ]
                    };
                  } else {
                    resultValue = { error: `Unknown skill: ${skillId}. Available built-ins: ${SKILLS.map((s: any) => s.id).join(', ')}` };
                  }
                }
                showToast(`Loaded skill context: ${skillId}`);
              
              } else if (name === 'fetch_url') {
                const targetUrl = args.url;
                if (!targetUrl) throw new Error("Missing required 'url' parameter for Webfetch.");
                if (successfulScrapesCount >= 3) {
                  resultValue = { error: "Scraping limit of 3 successful pages reached. Further web scrapes are blocked in this turn." };
                  showToast("Scrape limit reached (3 max)");
                } else {
                  const scrapeTarget = await resolveScrapeTargetUrl({
                    targetUrl,
                    queryFallback: content,
                    tavilyApiKey,
                    serpApiKey,
                    searchProvider,
                    signal
                  });
                  setActiveScrapingJobs(prev => { const c = new Set(prev); c.add(tc.id); return c; });
                  showToast(`Fetching: ${scrapeTarget.resolvedUrl.substring(0, 30)}...`);
                  const scrapeResult = await scrapeUrl({
                    url: scrapeTarget.resolvedUrl,
                    outputFormat: args.outputFormat || 'markdown',
                    extractLinks: args.extractLinks ?? true,
                    extractImages: args.extractImages ?? true
                  });
                  const normalizedScrapeResult = {
                    ...scrapeResult,
                    requestedUrl: scrapeTarget.requestedUrl,
                    url: scrapeResult.url || scrapeTarget.resolvedUrl
                  };
                  setScrapingResults(prev => { const c = new Map(prev); c.set(tc.id, normalizedScrapeResult); return c; });
                  setActiveScrapingJobs(prev => { const c = new Set(prev); c.delete(tc.id); return c; });
                  if (normalizedScrapeResult.error) {
                    resultValue = { error: normalizedScrapeResult.error };
                  } else {
                    successfulScrapesCount++;
                    const rawText = normalizedScrapeResult.rawText || '';
                    const processedText = useTurboQuant
                      ? turboQuantCompress(rawText, 8000, 'medium')
                      : rawText.substring(0, 6000) + (rawText.length > 6000 ? '\n\n...[truncated]' : '');
                    resultValue = {
                      title: normalizedScrapeResult.title,
                      url: normalizedScrapeResult.url,
                      requestedUrl: normalizedScrapeResult.requestedUrl,
                      statusCode: normalizedScrapeResult.statusCode,
                      linksFound: normalizedScrapeResult.links?.length || 0,
                      content: processedText
                    };
                  }
                }
              } else if (name === 'web_search') {
                const searchQueryVal = String(args.query || '');
                const maxRes = Math.min(Number(args.maxResults || 5), 10);
                if (!searchQueryVal) throw new Error("Websearch requires query");
                showToast(`Searching: ${searchQueryVal.substring(0, 40)}`);
                const key = searchProvider === 'serpapi' ? serpApiKey : tavilyApiKey;
                const searchRes = await fetch('/api/search', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    query: searchQueryVal,
                    tavilyKey: tavilyApiKey,
                    serpKey: serpApiKey,
                    provider: key && key.trim() ? searchProvider : 'duckduckgo'
                  }),
                  signal
                });
                const searchData = await searchRes.json();
                const sliced = (searchData.results || []).slice(0, maxRes);
                resultValue = { query: searchQueryVal, provider: searchData.provider, count: sliced.length, results: sliced };
              } else if (name === 'deep_search') {
                const searchQueryVal = String(args.query || '');
                const depthPresetVal = String(args.depth || 'standard');
                if (!searchQueryVal) throw new Error("Deep search requires a query parameter.");

                // Trigger the UI Deep Research scanner simulation
                if (researchMode) {
                  researchMode.setIsResearchActive(false);
                  setTimeout(() => {
                    researchMode.setCustomQueries(searchQueryVal);
                    if (depthPresetVal === 'extreme') {
                      researchMode.setDepthPreset('extreme');
                    } else {
                      researchMode.setDepthPreset('standard');
                    }
                    researchMode.setIsResearchActive(true);
                    researchMode.setResearchLogs([
                      `[${new Date().toLocaleTimeString()}] [Orchestrator] Deep recursive search triggered via tool call: "${searchQueryVal}"`,
                      `[${new Date().toLocaleTimeString()}] [System] Allocating multi-agent parallel loops...`
                    ]);
                    // researchMode.setIsResearchWorkspaceOpen(true);
                  }, 100);
                }

                showToast(`Launching Deep Research: ${searchQueryVal.substring(0, 40)}`);

                // Fetch real background results
                const key = searchProvider === 'serpapi' ? serpApiKey : tavilyApiKey;
                let results = [];
                if (key && key.trim()) {
                  try {
                    const searchRes = await fetch('/api/search', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ query: searchQueryVal, tavilyKey: tavilyApiKey, serpKey: serpApiKey, provider: searchProvider }),
                      signal
                    });
                    const searchData = await searchRes.json();
                    results = (searchData.results || []).slice(0, 8);
                  } catch (err) {
                    console.error('Deep search background fetch failed', err);
                  }
                }

                resultValue = {
                  query: searchQueryVal,
                  researchEngine: "Deep Research Multi-Agent Core",
                  depth: depthPresetVal,
                  status: "Complete",
                  durationMs: depthPresetVal === 'extreme' ? 4500 : 2500,
                  verifiedClaimsCount: results.length,
                  results: results.length > 0 ? results : [
                    { title: `${searchQueryVal} Synthesis Report`, url: `https://intel.local/report`, snippet: `Synthesized findings on ${searchQueryVal}. Agents Alpha, Beta, and Gamma processed parameters recursively.` }
                  ]
                };
              } else if (name.startsWith('spawn_')) {
                const agentToolName = name.replace('spawn_', '') + '-agent';
                const taskText = String(args.task || '');
                if (!taskText) throw new Error(`${name} requires a task parameter`);
                showToast(`Spawning ${agentToolName}...`);

                let localAgentId = `agent_temp_${Date.now()}`;
                
                try {
                  let targetModel = activeModelId;
                  let targetBaseUrl = serverUrl?.replace(/\/+$/, '') || '';
                  let targetKey = apiKey || '';
                  let targetProvider = selectedProvider || 'openai-compatible';

                  let customPrompt = '';
                  let customTools: string[] = [];
                  let targetRuntime: 'default' | 'pi' = 'default';

                  try {
                    const savedConfigsStr = localStorage.getItem('lumina_subagent_configs');
                    if (savedConfigsStr) {
                      const configs = JSON.parse(savedConfigsStr);
                      let mappedAgentId = '';
                      const lowerName = agentToolName.toLowerCase();
                      if (lowerName.includes('orchestrator') || lowerName.includes('dispatcher')) {
                        mappedAgentId = 'orchestrator';
                      } else if (lowerName.includes('analyzer') || lowerName.includes('research') || lowerName.includes('scaffold') || lowerName.includes('docs') || lowerName.includes('project-analyzer')) {
                        mappedAgentId = 'analyzer';
                      } else if (lowerName.includes('coder') || lowerName.includes('backend') || lowerName.includes('frontend') || lowerName.includes('config') || lowerName.includes('database') || lowerName.includes('auth') || lowerName.includes('deploy')) {
                        mappedAgentId = 'coder';
                      } else if (lowerName.includes('debug') || lowerName.includes('test') || lowerName.includes('fix')) {
                        mappedAgentId = 'debugger';
                      } else if (lowerName.includes('reviewer') || lowerName.includes('review') || lowerName.includes('audit')) {
                        mappedAgentId = 'reviewer';
                      }

                      if (mappedAgentId && configs[mappedAgentId]) {
                        const agentCfg = configs[mappedAgentId];
                        const modelId = agentCfg.modelId;
                        targetRuntime = agentCfg.runtime === 'pi' ? 'pi' : 'default';
                        if (agentCfg.systemPrompt) {
                          customPrompt = agentCfg.systemPrompt;
                        }
                        if (Array.isArray(agentCfg.tools) && agentCfg.tools.length > 0) {
                          customTools = agentCfg.tools;
                        }
                        if (modelId && modelId !== 'openprovider/auto-free') {
                          const profilesStr = localStorage.getItem('lumina_ai_provider_profiles');
                          if (profilesStr) {
                            const profiles = JSON.parse(profilesStr);
                            const matchingProfile = profiles.find((p: any) => p.id === agentCfg.providerProfileId || p.models.some((m: any) => m.id === modelId));
                            if (matchingProfile) {
                              targetModel = modelId;
                              targetBaseUrl = matchingProfile.endpoint?.replace(/\/+$/, '') || '';
                              targetKey = matchingProfile.apiKey || '';
                              targetProvider = matchingProfile.provider || 'openai-compatible';
                              console.log(`[LUMINA] Mapped subagent ${agentToolName} to ${mappedAgentId} configuration using model ${modelId} from profile ${matchingProfile.name}`);
                            }
                          }
                        }
                      }
                    }
                  } catch (e) {
                    console.error("[LUMINA] Failed to map subagent settings:", e);
                  }

                  const useBridge = useBridgeTools && llamaBridgeUrl;
                  const activeBaseUrl = useBridge ? llamaBridgeUrl.replace(/\/+$/, '') : targetBaseUrl;
                  const activeKey = useBridge ? llamaBridgeApiKey : targetKey;
                  const activeProvider = useBridge ? 'llama-bridge' : targetProvider;
                  const activeModel = useBridge ? selectedLlamaModel : targetModel;

                  const spawnRes = await fetch('/api/agents/spawn', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      agentName: agentToolName,
                      task: taskText,
                      workspaceRoot: coderWorkspacePath,
                      modelConfig: {
                        model: activeModel,
                        runtime: targetRuntime,
                        config: {
                          provider: activeProvider,
                          baseUrl: activeBaseUrl,
                          apiKey: activeKey
                        }
                      },
                      ...(customPrompt ? { customPrompt } : {}),
                      ...(customTools.length > 0 ? { customTools } : {})
                    }),
                    signal
                  });
                  const spawnData = await spawnRes.json();
                  if (!spawnRes.ok || spawnData.error) {
                    throw new Error(spawnData.error || 'Subagent execution failed to start');
                  }

                  const agentId = spawnData.agentId;
                  localAgentId = agentId;

                  setOrchestrationState((prev: any) => {
                    const cleanName = agentToolName.replace('-agent', '').toUpperCase();
                    const existingIdx = prev.agents.findIndex((a: any) => a.id === agentId);
                    let nextAgents = [...prev.agents];
                    if (existingIdx !== -1) {
                      nextAgents[existingIdx] = {
                        ...nextAgents[existingIdx],
                        status: 'running',
                        startedAt: Date.now(),
                        events: []
                      };
                    } else {
                      nextAgents.push({
                        id: agentId,
                        name: `${cleanName} Agent`,
                        phase: prev.currentPhase || 1,
                        status: 'running',
                        filesCreated: [],
                        startedAt: Date.now(),
                        events: []
                      });
                    }
                    return {
                      ...prev,
                      isActive: true,
                      agents: nextAgents
                    };
                  });

                  // Start polling loop
                  let isDone = false;
                  let pollCount = 0;
                  let finalAgentData = null;

                  while (!isDone && pollCount < 600) { // Max 10 minutes
                    await new Promise((resolve, reject) => {
                      const timer = setTimeout(resolve, 1000);
                      if (signal) {
                        signal.addEventListener('abort', () => {
                          clearTimeout(timer);
                          reject(new Error('Aborted'));
                        });
                      }
                    });
                    pollCount++;

                    const statusRes = await fetch(`/api/agents/status?agentId=${agentId}`, { signal });
                    if (!statusRes.ok) {
                      throw new Error(`Failed to fetch status: ${statusRes.statusText}`);
                    }
                    const statusData = await statusRes.json();
                    finalAgentData = statusData;

                    const liveSubNodes = mapSpawnEventsToSubNodes(tc.id, statusData.events || []);
                    const liveSpawnStatus = statusData.status === 'failed'
                      ? 'failed'
                      : statusData.status === 'done'
                        ? 'complete'
                        : 'active';

                    const spawnNode = toolCallNodes.find(n => n.id === tc.id);
                    if (spawnNode) {
                      spawnNode.subNodes = liveSubNodes;
                      spawnNode.label = `Subagent: ${agentToolName}`;
                      spawnNode.status = liveSpawnStatus;
                      spawnNode.resultSummary = statusData.summary || `${liveSubNodes.length} step${liveSubNodes.length === 1 ? '' : 's'} tracked`;
                    }

                    setChats(prev => prev.map(chat => {
                      if (chat.id !== chatId) return chat;
                      return {
                        ...chat,
                        messages: chat.messages.map(m => m.id === thinkingId ? {
                          ...m,
                          toolCalls: [...toolCallNodes]
                        } : m)
                      };
                    }));

                    setOrchestrationState((prev: any) => ({
                      ...prev,
                      agents: prev.agents.map((a: any) => {
                        if (a.id === agentId) {
                          return {
                            ...a,
                            status: statusData.status,
                            events: statusData.events || [],
                            filesCreated: statusData.filesCreated || [],
                            completedAt: statusData.completedAt,
                            error: statusData.error
                          };
                        }
                        return a;
                      })
                    }));

                    if (statusData.status === 'done' || statusData.status === 'failed') {
                      isDone = true;
                    }
                  }

                  if (finalAgentData?.status === 'failed') {
                    throw new Error(finalAgentData.error || 'Subagent execution failed');
                  }

                  resultValue = {
                    success: true,
                    agentToolName,
                    task: taskText,
                    summary: finalAgentData?.summary || '',
                    events: finalAgentData?.events || []
                  };

                  // Build sub-nodes from spawn events for pipeline display in chat
                  const spawnEvents = finalAgentData?.events || [];
                  if (spawnEvents.length > 0) {
                    const spawnNode = toolCallNodes.find(n => n.id === tc.id);
                    if (spawnNode) {
                      spawnNode.subNodes = mapSpawnEventsToSubNodes(tc.id, spawnEvents);
                      // Update the label to show agent name
                      spawnNode.label = `Subagent: ${agentToolName}`;
                    }
                  }

                  showToast(`Subagent ${agentToolName} complete!`);
                  triggerWorkspaceRefresh();
                } catch (subErr: any) {
                  const errMsg = subErr.message || 'Subagent failed';
                  setOrchestrationState((prev: any) => {
                    const existingIdx = prev.agents.findIndex((a: any) => a.id === localAgentId);
                    let nextAgents = [...prev.agents];
                    if (existingIdx !== -1) {
                      nextAgents[existingIdx] = {
                        ...nextAgents[existingIdx],
                        status: 'failed',
                        error: errMsg
                      };
                    } else {
                      const cleanName = agentToolName.replace('-agent', '').toUpperCase();
                      nextAgents.push({
                        id: localAgentId,
                        name: `${cleanName} Agent`,
                        phase: prev.currentPhase || 1,
                        status: 'failed',
                        filesCreated: [],
                        startedAt: Date.now(),
                        error: errMsg,
                        events: []
                      });
                    }
                    return {
                      ...prev,
                      agents: nextAgents
                    };
                  });
                  resultValue = {
                    success: false,
                    agentToolName,
                    error: errMsg
                  };

                  const failNode = toolCallNodes.find(n => n.id === tc.id);
                  if (failNode) {
                    failNode.label = `Subagent: ${agentToolName} (failed)`;
                    failNode.subNodes = [{
                      id: `spawn-sub-fail-${tc.id}`,
                      type: 'error',
                      label: `Failed: ${errMsg}`,
                      status: 'failed',
                      resultSummary: errMsg,
                      icon: 'terminal',
                    }];
                  }

                  showToast(`Subagent ${agentToolName} failed!`);
                }
              } else if (name === 'run_command') {
                const commandText = args.command;
                if (!commandText) throw new Error("run_command requires command parameter");
                const livePermissionMode = coderPermissionModeRef.current;
                const liveAlwaysAllowedCommands = alwaysAllowedCommandsRef.current;
                const restrictionReason = explainCommandRestriction(commandText);
                if (shouldRequestCommandPermission(commandText, livePermissionMode, liveAlwaysAllowedCommands)) {
                  logPermissionAction({
                    command: commandText,
                    action: 'permission_requested',
                    detail: restrictionReason,
                    mode: livePermissionMode
                  });
                  const decision = await requestCommandPermission(commandText, restrictionReason);
                  logPermissionAction({
                    command: commandText,
                    action: decision,
                    detail: restrictionReason,
                    mode: livePermissionMode
                  });
                  if (decision === 'deny') {
                    throw new Error(`Permission denied for terminal command: ${commandText}`);
                  }
                  if (decision === 'allow-always') {
                    setAlwaysAllowedCommands(prev => prev.includes(commandText.trim()) ? prev : [...prev, commandText.trim()]);
                  }
                } else {
                  logPermissionAction({
                    command: commandText,
                    action: 'auto_allowed',
                    detail: livePermissionMode === 'full-access' ? 'Full access mode' : 'Safe command or previously allowed command',
                    mode: livePermissionMode
                  });
                }
                showToast(`Running: ${commandText.substring(0, 30)}...`);
                const runData = await executeViaTerminal(commandText, coderWorkspacePath, {
                  workspaceRoot: coderWorkspacePath,
                  isCoderMode: isCoderMode,
                  signal,
                });
                resultValue = {
                  exitCode: runData.exitCode,
                  stdout: runData.stdout,
                  stderr: runData.stderr
                };
                const currentN = toolCallNodes.find(n => n.id === tc.id);
                if (currentN) {
                  currentN.resultSummary = runData.exitCode === 0
                    ? 'Command completed successfully (exit code 0)'
                    : `Command failed with exit code ${runData.exitCode}`;
                }
              } else if (name === 'ask_user') {
                const qs = args.questions || [];
                // Attach to current message instead of show global panel
                setShowAskAiPanel(false);
                shouldStopAfterAsk = true;
                resultValue = { status: "success", message: "Successfully presented clarify questions to the user inline. Generation has paused for user inputs." };
                showToast("AI is asking you clarifying questions!");
                
                setChats(prev => prev.map(chat => {
                  if (chat.id === chatId) {
                    return {
                      ...chat,
                      messages: chat.messages.map(m => m.id === thinkingId ? {
                        ...m,
                        askAiQuestions: qs,
                        currentQuestionIndex: 0,
                        askAiAnswers: {},
                        isAskAiActive: true,
                        thinking: undefined
                      } : m)
                    };
                  }
                  return chat;
                }));
              }

              if (resultValue !== undefined) {
                if (resultValue && !resultValue.error) {
                  turnToolResultCache.set(cacheKey, resultValue);
                }
              } else if (name === 'search' || name === 'google_scholar') {
                const rawQueries = Array.isArray(args.query) ? args.query : [args.query].filter(Boolean);
                const queries = rawQueries.map((q: any) => String(q).trim()).filter(Boolean);
                if (queries.length === 0) {
                  throw new Error(`Missing required 'query' parameter for ${name}.`);
                }

                const batchedResults: string[] = [];
                const collectedResults: any[] = [];
                const isDuckDuckGoProvider = !searchProvider || searchProvider === 'duckduckgo' || searchProvider === 'ddg';

                for (const [queryIndex, query] of queries.entries()) {
                  const effectiveQuery = name === 'google_scholar'
                    ? `${query} scholarly article OR paper OR publication`
                    : query;

                  if (isDuckDuckGoProvider && queryIndex > 0) {
                    showToast(`Waiting 5 seconds before next DuckDuckGo search...`);
                    await new Promise((resolve, reject) => {
                      const timer = setTimeout(resolve, DDG_SEQUENTIAL_DELAY_MS);
                      if (signal) {
                        signal.addEventListener('abort', () => {
                          clearTimeout(timer);
                          reject(new Error('Aborted'));
                        }, { once: true });
                      }
                    });
                  }

                  if (isDuckDuckGoProvider) {
                    setChats(prev => prev.map(chat => {
                      if (chat.id !== chatId) return chat;
                      return {
                        ...chat,
                        messages: chat.messages.map(m => m.id === thinkingId ? {
                          ...m,
                          thinking: `Running DuckDuckGo search ${queryIndex + 1} of ${queries.length}: ${effectiveQuery}`
                        } : m)
                      };
                    }));
                  }

                  const searchResp = await fetch(`/api/search`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      query: effectiveQuery,
                      tavilyKey: tavilyApiKey,
                      serpKey: serpApiKey,
                      provider: searchProvider
                    }),
                    signal
                  });

                  if (!searchResp.ok) {
                    batchedResults.push(`No results found for '${effectiveQuery}'. Search backend returned ${searchResp.status}.`);
                    continue;
                  }

                  const searchData = await searchResp.json();
                  const results = searchData.results || [];
                  collectedResults.push(...results);
                  batchedResults.push(formatDeepResearchSearchResults(effectiveQuery, results));
                }

                if (collectedResults.length > 0) {
                  searchResults = [...searchResults, ...collectedResults].filter((result, index, arr) => {
                    const url = result?.url || result?.link || '';
                    return url && arr.findIndex(other => (other?.url || other?.link || '') === url) === index;
                  });
                  setChats(prev => prev.map(chat => {
                    if (chat.id !== chatId) return chat;
                    return {
                      ...chat,
                      messages: chat.messages.map(m => m.id === thinkingId ? {
                        ...m,
                        sources: searchResults.slice(0, 10).map(r => ({ title: r.title, url: r.url, snippet: r.snippet })),
                        thinking: `Reviewing ${searchResults.length} discovered source candidates...`
                      } : m)
                    };
                  }));
                }

                resultValue = batchedResults.join('\n=======\n');
                if (collectedResults.length > 0) {
                  successfulSearchCallCount++;
                }
                const currentN = toolCallNodes.find(n => n.id === tc.id);
                if (currentN) {
                  currentN.resultSummary = `${queries.length} quer${queries.length === 1 ? 'y' : 'ies'} searched${isDuckDuckGoProvider ? ' sequentially' : ''}, ${collectedResults.length} result candidates`;
                }
              } else if (name === 'visit') {
                const rawUrls = Array.isArray(args.url) ? args.url : [args.url].filter(Boolean);
                const urls = rawUrls.map((u: any) => String(u).trim()).filter(Boolean);
                const goal = String(args.goal || content).trim();
                if (urls.length === 0 || !goal) {
                  throw new Error("Missing required 'url' or 'goal' parameter for visit.");
                }

                const visitOutputs: string[] = [];
                for (const targetUrl of urls.slice(0, 5)) {
                  const scrapeResult = await scrapeUrl({
                    url: targetUrl,
                    extractLinks: false,
                    extractTables: false,
                    outputFormat: 'markdown'
                  });
                  visitOutputs.push(formatDeepResearchVisitResult(targetUrl, goal, scrapeResult, useTurboQuant ? 4000 : 6000));
                }

                resultValue = visitOutputs.join('\n=======\n');
                if (visitOutputs.length > 0) {
                  successfulVisitCount++;
                }
                const currentN = toolCallNodes.find(n => n.id === tc.id);
                if (currentN) {
                  currentN.resultSummary = `${urls.slice(0, 5).length} page${urls.length === 1 ? '' : 's'} visited for targeted evidence`;
                }
              } else if (name === 'web_scrape') {
                const targetUrl = args.url;
                if (!targetUrl) {
                  throw new Error("Missing required 'url' parameter for web_scrape.");
                }
                const scrapeTarget = await resolveScrapeTargetUrl({
                  targetUrl,
                  queryFallback: String(args.goal || args.query || content || ''),
                  tavilyApiKey,
                  serpApiKey,
                  searchProvider,
                  signal
                });

                // Push to active scraping jobs set
                setActiveScrapingJobs(prev => {
                  const cloned = new Set(prev);
                  cloned.add(tc.id);
                  return cloned;
                });

                showToast(`Scraping webpage: ${scrapeTarget.resolvedUrl.substring(0, 30)}...`);

                // Perform proxy-mediated scraping
                const scrapeResult = await scrapeUrl({
                  url: scrapeTarget.resolvedUrl,
                  strategy: args.strategy,
                  browserEngine: args.browserEngine,
                  selectors: args.selectors,
                  useJavaScript: args.useJavaScript,
                  waitForSelector: args.waitForSelector,
                  extractLinks: args.extractLinks ?? true,
                  extractImages: args.extractImages ?? true,
                  extractTables: args.extractTables,
                  outputFormat: args.outputFormat,
                  maxPages: args.maxPages,
                  maxDepth: args.maxDepth
                });
                const normalizedScrapeResult = {
                  ...scrapeResult,
                  requestedUrl: scrapeTarget.requestedUrl,
                  url: scrapeResult.url || scrapeTarget.resolvedUrl
                };

                // Update scraping results Map state
                setScrapingResults(prev => {
                  const cloned = new Map(prev);
                  cloned.set(tc.id, normalizedScrapeResult);
                  return cloned;
                });

                // Evict from active scraping jobs set
                setActiveScrapingJobs(prev => {
                  const cloned = new Set(prev);
                  cloned.delete(tc.id);
                  return cloned;
                });

                if (normalizedScrapeResult.error) {
                  resultValue = { error: normalizedScrapeResult.error };
                  showToast(`Scrape failed: ${normalizedScrapeResult.error.substring(0, 30)}...`);
                } else {
                  const rawMarkdown = normalizedScrapeResult.rawText || '';
                  const processedMarkdown = useTurboQuant
                    ? turboQuantCompress(rawMarkdown, 4000, 'medium')
                    : (rawMarkdown.substring(0, 3000) + (rawMarkdown.length > 3000 ? '... [Truncated for prompt boundaries]' : ''));

                  resultValue = {
                    title: normalizedScrapeResult.title,
                    url: normalizedScrapeResult.url,
                    statusCode: normalizedScrapeResult.statusCode,
                    scrapedAt: normalizedScrapeResult.scrapedAt,
                    dataExcerpt: normalizedScrapeResult.data,
                    linksFound: normalizedScrapeResult.links?.length || 0,
                    markdownExcerpt: processedMarkdown || 'No page text extracted.',
                    turboQuantApplied: useTurboQuant,
                  };
                  successfulScrapesCount++;
                  showToast(`Successfully scraped "${normalizedScrapeResult.title || 'Page'}"`);
                }

                if (!resultValue) {
                  resultValue = {
                    error: 'web_scrape completed without a usable payload'
                  };
                }
              } else if (name === 'wiki_search') {
                const { query, limit = 10, language = 'en' } = args;
                showToast(`Searching Wikipedia for: ${query}`);
                const searchResultsVal = await wikiSearch(query, limit, language);
                
                // Store results
                setWikiResults(prev => {
                  const cloned = new Map(prev);
                  cloned.set(tc.id, { wikiType: 'search', data: { results: searchResultsVal } });
                  return cloned;
                });

                resultValue = {
                  resultsCount: searchResultsVal.length,
                  resultsBrief: searchResultsVal.slice(0, 3).map((r: any) => ({ pageId: r.pageId, title: r.title, url: r.url })),
                  payload: searchResultsVal
                };
                if (Array.isArray(searchResultsVal) && searchResultsVal.length > 0) {
                  successfulWikiSearchCount++;
                }
                
                const currentN = toolCallNodes.find(n => n.id === tc.id);
                if (currentN) {
                  currentN.resultSummary = `Found ${searchResultsVal.length} indexed pages matching "${query}"`;
                }
              } else if (name === 'wiki_get_page') {
                const { pageId, language = 'en' } = args;
                showToast(`Fetching full page ID: ${pageId}`);
                const pageResult = await wikiGetPage(Number(pageId), language);

                setWikiResults(prev => {
                  const cloned = new Map(prev);
                  cloned.set(tc.id, { wikiType: 'page', data: pageResult });
                  return cloned;
                });

                const rawIntro = pageResult.intro || '';
                const rawSections = pageResult.sections
                  ? pageResult.sections.map((s: any) => `## ${s.title}\n${s.content || ''}`).join('\n\n')
                  : '';
                const fullWikiText = rawIntro + '\n\n' + rawSections;

                const compressedWikiText = useTurboQuant
                  ? turboQuantCompress(fullWikiText, 5000, 'medium')
                  : fullWikiText.substring(0, 5000);

                resultValue = {
                  title: pageResult.title,
                  wordCount: pageResult.wordCount,
                  sectionsCount: pageResult.sections?.length || 0,
                  introExcerpt: useTurboQuant
                    ? turboQuantCompress(rawIntro, 600, 'light')
                    : rawIntro.substring(0, 500),
                  compressedContent: compressedWikiText,
                  turboQuantApplied: useTurboQuant,
                  payload: pageResult
                };

                const currentN = toolCallNodes.find(n => n.id === tc.id);
                if (currentN) {
                  currentN.resultSummary = `"${pageResult.title}" fully loaded — ${pageResult.sections?.length || 0} sections, ${pageResult.wordCount} words`;
                }
              } else if (name === 'wiki_get_summary') {
                const { pageId, language = 'en' } = args;
                showToast(`Getting summary for ID: ${pageId}`);
                const summaryResult = await wikiGetSummary(Number(pageId), language);

                setWikiResults(prev => {
                  const cloned = new Map(prev);
                  cloned.set(tc.id, { wikiType: 'summary', data: summaryResult });
                  return cloned;
                });

                const rawExtract = summaryResult.extract || '';
                resultValue = {
                  title: summaryResult.title,
                  extract: useTurboQuant
                    ? turboQuantCompress(rawExtract, 1500, 'light')
                    : rawExtract,
                  url: summaryResult.url,
                  turboQuantApplied: useTurboQuant,
                  payload: summaryResult
                };

                const currentN = toolCallNodes.find(n => n.id === tc.id);
                if (currentN) {
                  currentN.resultSummary = `Summary for "${summaryResult.title}" parsed: "${summaryResult.extract.substring(0, 100)}..."`;
                }
              } else if (name === 'wiki_get_sections') {
                const { pageId, language = 'en' } = args;
                showToast(`Reading page ID: ${pageId}`);
                const sectionsList = await wikiGetSections(Number(pageId), language);

                setWikiResults(prev => {
                  const cloned = new Map(prev);
                  cloned.set(tc.id, { wikiType: 'page', data: { title: `Page ID ${pageId} sections`, url: `https://${language}.wikipedia.org/?curid=${pageId}`, sections: sectionsList } });
                  return cloned;
                });

                resultValue = {
                  sectionsCount: sectionsList.length,
                  list: sectionsList.map((s: any) => ({ index: s.index, title: s.title, level: s.level })),
                  payload: sectionsList
                };

                const currentN = toolCallNodes.find(n => n.id === tc.id);
                if (currentN) {
                  currentN.resultSummary = `Header index parsed: ${sectionsList.length} sections found`;
                }
              } else if (name === 'wiki_get_categories') {
                const { pageId, language = 'en' } = args;
                showToast(`Reading target indices...`);
                const catsList = await wikiGetCategories(Number(pageId), language);

                setWikiResults(prev => {
                  const cloned = new Map(prev);
                  cloned.set(tc.id, { wikiType: 'page', data: { title: `Categories for page ${pageId}`, url: `https://${language}.wikipedia.org/?curid=${pageId}`, categories: catsList.map((c: any) => c.name) } });
                  return cloned;
                });

                resultValue = {
                  categoriesCount: catsList.length,
                  list: catsList.map((c: any) => c.name),
                  payload: catsList
                };

                const currentN = toolCallNodes.find(n => n.id === tc.id);
                if (currentN) {
                  currentN.resultSummary = `${catsList.length} taxonomies resolved`;
                }
              } else if (name === 'wiki_get_links') {
                const { pageId, limit = 50, language = 'en' } = args;
                showToast(`Collecting outbound page links...`);
                const linksList = await wikiGetLinks(Number(pageId), Number(limit), language);

                setWikiResults(prev => {
                  const cloned = new Map(prev);
                  cloned.set(tc.id, { wikiType: 'page', data: { title: `Outbound links for page ${pageId}`, url: `https://${language}.wikipedia.org/?curid=${pageId}`, links: linksList } });
                  return cloned;
                });

                resultValue = {
                  linksCount: linksList.length,
                  payload: linksList
                };

                const currentN = toolCallNodes.find(n => n.id === tc.id);
                if (currentN) {
                  currentN.resultSummary = `${linksList.length} outbound connections logged`;
                }
              } else if (name === 'wiki_get_images') {
                const { pageId, language = 'en' } = args;
                showToast(`Extracting static elements...`);
                const imgsList = await wikiGetImages(Number(pageId), language);

                setWikiResults(prev => {
                  const cloned = new Map(prev);
                  cloned.set(tc.id, { wikiType: 'page', data: { title: `Media elements for page ${pageId}`, url: `https://${language}.wikipedia.org/?curid=${pageId}`, images: imgsList } });
                  return cloned;
                });

                resultValue = {
                  imagesCount: imgsList.length,
                  list: imgsList.map((i: any) => i.name),
                  payload: imgsList
                };

                const currentN = toolCallNodes.find(n => n.id === tc.id);
                if (currentN) {
                  currentN.resultSummary = `${imgsList.length} static illustrations resolved`;
                }
              } else if (name === 'wiki_get_related') {
                const { pageId, limit = 10, language = 'en' } = args;
                showToast(`Finding adjacent articles...`);
                const relatedList = await wikiGetRelated(Number(pageId), Number(limit), language);

                setWikiResults(prev => {
                  const cloned = new Map(prev);
                  cloned.set(tc.id, { wikiType: 'search', data: { results: relatedList } });
                  return cloned;
                });

                resultValue = {
                  relatedCount: relatedList.length,
                  payload: relatedList
                };

                const currentN = toolCallNodes.find(n => n.id === tc.id);
                if (currentN) {
                  currentN.resultSummary = `Trajectory logged: ${relatedList.length} related pages found`;
                }
                } else if (name.startsWith('composio_')) {
                  const composioSlug = resolveComposioSlug(name);
                  showToast(`Executing: ${composioSlug.replace(/_/g, ' ').toLowerCase()}`);
                  try {
                    const execRes = await fetch('/api/composio/execute', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ toolSlug: composioSlug, args }),
                      signal
                    });
                    const execData = await execRes.json();
                    if (execRes.ok) {
                      // Server now returns { result: { successful, data, error? } }
                      const inner = execData?.result ?? execData;
                      if (inner && typeof inner === 'object' && 'successful' in inner) {
                        if (inner.successful) {
                          // data can be null/undefined for tools that return no data
                          resultValue = inner.data ?? null;
                        } else {
                          resultValue = { error: inner.error || `Composio tool ${composioSlug} returned unsuccessful result` };
                        }
                      } else {
                        // Legacy shape or unexpected — pass through
                        resultValue = inner;
                      }
                    } else {
                      resultValue = { error: execData.error || 'Composio tool execution failed' };
                    }
                  } catch (execErr: any) {
                    resultValue = { error: execErr.message || 'Composio tool execution failed' };
                  }
                  const currentN = toolCallNodes.find(n => n.id === tc.id);
                  if (currentN) {
                    if (resultValue?.error) {
                      currentN.resultSummary = `Failed: ${resultValue.error}`;
                    } else if (resultValue === null || resultValue === undefined) {
                      currentN.resultSummary = `Tool executed — no data returned`;
                    } else {
                      const preview = JSON.stringify(resultValue);
                      currentN.resultSummary = preview.length > 120 ? preview.slice(0, 120) + '…' : preview;
                    }
                  }
                } else {
                  resultValue = { error: `Unsupported coder tool: ${name}` };
                }

                if (resultValue !== undefined && !(resultValue && resultValue.error)) {
                  turnToolResultCache.set(cacheKey, resultValue);
                }
              }
            } catch (err: any) {
              resultValue = { error: err.message };
            }

            const matchedIdx = toolCallNodes.findIndex(node => (node.id === tc.id) || (node.label.startsWith(name) && node.status === 'active'));
            if (matchedIdx !== -1) {
              toolCallNodes[matchedIdx].status = (resultValue && resultValue.error) ? 'failed' : 'complete';
              const resultStr = JSON.stringify(resultValue, null, 2);
              toolCallNodes[matchedIdx].result = resultStr;
              if (!toolCallNodes[matchedIdx].filePath && resultValue?.filePath) {
                toolCallNodes[matchedIdx].filePath = String(resultValue.filePath).replace(/\\/g, '/');
              }
              if (!toolCallNodes[matchedIdx].resultSummary) {
                const preview = resultStr.length > 200 ? resultStr.slice(0, 200) + '...' : resultStr;
                toolCallNodes[matchedIdx].resultSummary = preview;
              }
            }

            toolResultMessages.push({
              role: 'tool',
              tool_call_id: tc.id,
              name: name,
              content: compressToolResultForApi(name, resultValue)
            });

            setChats(prev => prev.map(chat => {
              if (chat.id === chatId) {
                return {
                  ...chat,
                  messages: chat.messages.map(m => m.id === thinkingId ? {
                    ...m,
                    toolCalls: [...toolCallNodes]
                  } : m)
                };
              }
              return chat;
            }));
          }

          if (isDeepSearchEnabled && !isCoderMode) {
            const unmetRequirements: string[] = [];
            if (!hasDeepResearchTimeToolRun) {
              unmetRequirements.push('Call current_time first.');
            }
            if (successfulSearchCallCount < deepResearchMinimums.minSearchCalls) {
              unmetRequirements.push(`Complete at least ${deepResearchMinimums.minSearchCalls} successful search or scholar discovery calls. Current count: ${successfulSearchCallCount}.`);
            }
            if (successfulWikiSearchCount < deepResearchMinimums.minWikiSearches) {
              unmetRequirements.push(`Complete at least ${deepResearchMinimums.minWikiSearches} successful wiki_search calls. Current count: ${successfulWikiSearchCount}.`);
            }
            if (successfulVisitCount < deepResearchMinimums.minVisits) {
              unmetRequirements.push(`Complete at least ${deepResearchMinimums.minVisits} successful visit calls. Current count: ${successfulVisitCount}.`);
            }
            if (successfulScrapesCount < deepResearchMinimums.minWebScrapes) {
              unmetRequirements.push(`Complete at least ${deepResearchMinimums.minWebScrapes} successful web_scrape calls. Current count: ${successfulScrapesCount}.`);
            }

            if (unmetRequirements.length > 0) {
              apiMessages.push({
                role: 'system',
                content: [
                  'Deep research requirements are not satisfied yet.',
                  ...unmetRequirements,
                  'Do not finalize. Continue with planning or additional research tool calls until all requirements are satisfied.'
                ].join('\n')
              });
            }
          }

          apiMessages.push(choice);
          apiMessages.push(...toolResultMessages);

          await new Promise(r => setTimeout(r, 600));
          triggerWorkspaceRefresh();

          if (shouldStopAfterAsk) {
            break;
          }

          const nextResponse = await callLlamaBridge(apiMessages, activeTools, signal);
          choice = nextResponse.choices?.[0]?.message;
        }

        triggerWorkspaceRefresh();
      } else {
        if (Array.isArray(toolCallsRaw) && toolCallsRaw.length > 0) {
          const chatPlaceholders = toolCallsRaw.map((tc: any, idx: number) => {
            return `[[tool_call:${tc.id || `tc-${idx}`}]]`;
          }).join('\n\n');
          agentTraceContent = chatPlaceholders;

          toolCallsRaw.forEach((tc: any, idx: number) => {
            const fn = tc.function || {};
            const name = fn.name || 'unknown';
            const args = fn.arguments ? (() => { try { return JSON.parse(fn.arguments); } catch { return {}; } })() : {};

            toolCallNodes.push({
              id: tc.id || `tc-${idx}`,
              type: 'tool',
              label: name,
              status: 'complete',
              argsCount: typeof args === 'object' && Object.keys(args).length === 0 ? 0 : Object.keys(args).length,
              toolName: name,
              icon: name.includes('search') || name.includes('research') ? 'search' :
                    name.includes('wikipedia') || name.includes('globe') ? 'globe' :
                    name.includes('read') || name.includes('view') || name.includes('file') || name.includes('fs') ? 'file' :
                    name.includes('write') || name.includes('edit') ? 'edit' :
                    name.includes('github') || name.includes('box') ? 'box' :
                    name.includes('weather') || name.includes('cloud') ? 'cloud' :
                    name.includes('shell') || name.includes('terminal') ? 'terminal' :
                    name.includes('manage_todos') || name.includes('wrench') ? 'wrench' :
                    name.includes('git-branch') || name.includes('git') ? 'git' :
                    'sparkles'
            });
          });
        }
      }

      const responseContent = choice?.content;
      const hasAskUser = toolCallsRaw && toolCallsRaw.some((tc: any) => tc.function?.name === 'ask_user');
      const finalContent = isDeepSearchEnabled && !isCoderMode
        ? (sanitizeDeepResearchReport(responseContent || agentTraceContent) || 'Deep Research completed, but no final report text was returned.')
        : ([agentTraceContent, responseContent]
          .filter((part, idx, arr) => part && (idx === 0 || part !== arr[0]))
          .join('\n\n') || (toolCallsRaw?.length > 0 && !hasAskUser ? `Running ${toolCallsRaw.length} tool(s)...` : ''));
      
      const scavengedImages: any[] = [];
      toolCallNodes.forEach(tc => {
        if (tc.toolName === 'web_scrape') {
          const scraped = scrapingResults.get(tc.id);
          if (scraped && scraped.images && scraped.images.length > 0) {
            scraped.images.slice(0, 12).forEach((imgUrl: string, idx: number) => {
              if (imgUrl && !scavengedImages.some(x => x.url === imgUrl)) {
                scavengedImages.push({
                  title: `Scraped Image ${idx + 1}`,
                  url: imgUrl,
                  source: scraped.title || 'Web Scrape'
                });
              }
            });
          }
        } else if (tc.toolName?.startsWith('wiki_')) {
          const wikiRes = wikiResults.get(tc.id);
          if (wikiRes && wikiRes.data) {
            if (wikiRes.wikiType === 'page' && wikiRes.data.images && wikiRes.data.images.length > 0) {
              wikiRes.data.images.slice(0, 12).forEach((img: any, idx: number) => {
                if (img.url && !scavengedImages.some(x => x.url === img.url)) {
                  scavengedImages.push({
                    title: img.name || `Wiki Image ${idx + 1}`,
                    url: img.url,
                    source: 'Wikipedia'
                  });
                }
              });
            } else if (wikiRes.wikiType === 'summary' && wikiRes.data.thumbnail?.url) {
              const url = wikiRes.data.thumbnail.url;
              if (url && !scavengedImages.some(x => x.url === url)) {
                scavengedImages.push({
                  title: wikiRes.data.title || 'Wiki Image',
                  url: url,
                  source: 'Wikipedia'
                });
              }
            }
          }
        }
      });

      const imagesToAttach = [...responseImages, ...scavengedImages].map((img: any) => ({
        title: img.title || 'Image',
        url: img.url,
        source: img.source,
        thumbnail: img.thumbnail
      }));

      const finalToolNodes = [...toolCallNodes];


      const activeToolNodes = finalToolNodes.map(n => ({ ...n, status: 'active' as const }));
      
      const thinkTagMatch = finalContent.match(/<think>[\s\S]*?<\/think>/);
      const finalThinkContent = thinkTagMatch ? thinkTagMatch[0] : '';
      const finalDisplayContent = isCoderMode
        ? finalContent.trim()
        : finalContent.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

      if (isCoderMode) {
        try {
          triggerBackgroundMemoryExtraction(content, finalDisplayContent || finalContent.trim());
        } catch (err) {
          console.warn('Memory extraction invocation failed:', err);
        }

        setChats(prev => prev.map(chat => {
          if (chat.id === chatId) {
            return {
              ...chat,
              messages: chat.messages.map(m =>
                m.id === thinkingId
                  ? {
                      ...m,
                      content: finalDisplayContent || finalContent.trim(),
                      thinkContent: undefined,
                      isThinking: false,
                      streamPos: undefined,
                      thinking: undefined,
                      toolCalls: finalToolNodes,
                      isStreaming: false,
                      sources: searchResults.length > 0 ? searchResults.slice(0, 10).map(r => ({ title: r.title, url: r.url, snippet: r.snippet })) : undefined,
                      images: imagesToAttach.length > 0 ? imagesToAttach : undefined,
                      searchQuery: isWebSearchEnabled ? userMessage.content : undefined,
                      isSearching: false,
                      timestamp: new Date(),
                      artifacts: undefined
                    }
                  : m
              ),
              updatedAt: new Date(),
            };
          }
          return chat;
        }));
        return;
      }

      // Detect the size of the largest code block to dynamically scale up typing streaming speed
      const codeBlockThreshold = 50;
      let maxLinesOfCode = 0;
      const codeMatches = finalContent.match(/```[\s\S]*?```/g);
      if (codeMatches) {
        for (const block of codeMatches) {
          const lines = block.split('\n').length;
          if (lines > maxLinesOfCode) {
            maxLinesOfCode = lines;
          }
        }
      }

      // Compute dynamic throughput (characters per second) based on file scale & line counts
      const totalLength = finalContent.length;
      let speedFactor = 95; // default for tiny conversational replies

      if (totalLength > 8000) {
        speedFactor = 1600;
      } else if (totalLength > 4000) {
        speedFactor = 1200;
      } else if (totalLength > 2000) {
        speedFactor = 850;
      } else if (totalLength > 1000) {
        speedFactor = 550;
      } else if (totalLength > 500) {
        speedFactor = 280;
      }

      // Scale dynamically with code block complexity to prevent stuttering but keep readable scrolling
      if (maxLinesOfCode > codeBlockThreshold) {
        if (maxLinesOfCode > 800) {
          speedFactor = Math.max(speedFactor, 1950);
        } else if (maxLinesOfCode > 400) {
          speedFactor = Math.max(speedFactor, 1450);
        } else if (maxLinesOfCode > 200) {
          speedFactor = Math.max(speedFactor, 980);
        } else if (maxLinesOfCode > 100) {
          speedFactor = Math.max(speedFactor, 680);
        } else {
          speedFactor = Math.max(speedFactor, 420);
        }
      }

      const startTime = Date.now();
      let currentPos = 0;
      let lastRenderTime = 0;
      const RENDER_INTERVAL = 30; // ~33 FPS viewport updates

      while (currentPos < totalLength) {
        if (signal.aborted) {
          break;
        }

        const elapsed = Date.now() - startTime;
        // Exact character cursor position proportional to actual time elapsed
        const targetPos = Math.min(totalLength, Math.floor(elapsed * (speedFactor / 1000)));

        if (targetPos > currentPos) {
          currentPos = targetPos;
          const partial = finalContent.slice(0, currentPos);
          const now = Date.now();

          // Smoothly update state without loading main thread excessively
          if (now - lastRenderTime > RENDER_INTERVAL || currentPos === totalLength) {
            lastRenderTime = now;
            const parsed = isCoderMode
              ? { before: partial, after: '', think: null as string | null, isThinking: false }
              : parseThinkTags(partial);
            const displayContent = (parsed.before + parsed.after).trim();
            setChats(prev => prev.map(chat => {
              if (chat.id === chatId) {
                return {
                  ...chat,
                  messages: chat.messages.map(m => m.id === thinkingId ? {
                    ...m,
                    content: parsed.isThinking ? displayContent : (displayContent || partial),
                    thinkContent: isCoderMode ? undefined : (parsed.think || undefined),
                    isThinking: isCoderMode ? false : parsed.isThinking,
                    streamPos: currentPos,
                    toolCalls: activeToolNodes
                  } : m),
                };
              }
              return chat;
            }));
          }
        }

        // Relinquish execution back to the browser event loop for responsiveness (mouse tracking, layout drag)
        await new Promise(resolve => setTimeout(resolve, 8));
      }

      if (signal.aborted) {
        return;
      }

      let finalArtifacts = isCoderMode ? [] : extractArtifacts(finalDisplayContent, effectiveWritingStyle, chats, chatId);
      if (isDeepSearchEnabled && !isCoderMode) {
        const cleanReport = sanitizeDeepResearchReport(finalDisplayContent || finalContent);
        if (cleanReport.length > 80) {
          finalArtifacts = [
            {
              id: 'deep-research-report-' + Date.now().toString(36),
              title: createDeepResearchReportTitle(cleanReport),
              language: 'markdown',
              content: cleanReport,
              type: 'report'
            },
            ...finalArtifacts.filter(artifact => artifact.type !== 'report' && artifact.type !== 'markdown')
          ];
        }
      }
      if (finalArtifacts.length > 0) {
        setActiveArtifact(finalArtifacts[0]);
        setIsCanvasOpen(true);
        setCanvasView(['html', 'markdown', 'report'].includes(finalArtifacts[0].type) ? 'preview' : 'code');
      }

      // Extract brand-new memories from this conversation turn asynchronously
      try {
        triggerBackgroundMemoryExtraction(content, finalDisplayContent || finalContent.trim());
      } catch (err) {
        console.warn('Memory extraction invocation failed:', err);
      }

      if (false) {
      }

      setChats(prev => prev.map(chat => {
        if (chat.id === chatId) {
          return {
            ...chat,
            messages: chat.messages.map(m =>
              m.id === thinkingId
                ? {
                    ...m,
                    content: finalDisplayContent || finalContent.trim(),
                    thinkContent: isCoderMode ? undefined : (finalThinkContent.replace(/<\/?think>/g, '').trim() || undefined),
                    isThinking: false,
                    streamPos: undefined,
                    thinking: undefined,
                    toolCalls: finalToolNodes,
                    isStreaming: false,
                    sources: searchResults.length > 0 ? searchResults.slice(0, 10).map(r => ({ title: r.title, url: r.url, snippet: r.snippet })) : undefined,
                    images: imagesToAttach.length > 0 ? imagesToAttach : undefined,
                    searchQuery: isWebSearchEnabled ? userMessage.content : undefined,
                    isSearching: false,
                    timestamp: new Date(),
                    artifacts: finalArtifacts.length > 0 ? finalArtifacts : undefined
                  }
                : m
            ),
            updatedAt: new Date(),
          };
        }
        return chat;
      }));
    } catch (error: any) {
      if (error?.name === 'AbortError' || signal.aborted) {
        console.log('Stream generation aborted.');
        // Gracefully finalize typing message structure up to where it currently was
        setChats(prev => prev.map(chat => {
          if (chat.id === chatId) {
            return {
              ...chat,
              messages: chat.messages.map(m =>
                m.id === thinkingId
                  ? {
                      ...m,
                      isThinking: false,
                      isStreaming: false,
                      isSearching: false,
                      timestamp: new Date()
                    }
                  : m
              ),
              updatedAt: new Date(),
            };
          }
          return chat;
        }));
        return;
      }
      console.error('Lumina API Error:', error);
      const msg = error?.message || '';
      const isRateLimit = /429|rate.li[mit]|too many requests|quota/i.test(msg);
      const isPaymentRequired = /402|payment required|exhausted its credits/i.test(msg);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: isRateLimit
          ? `Rate limit exceeded. The upstream provider is rate-limiting this model.\n\n**Suggestions:**\n- Wait a moment and try again\n- Add your own API key in **Settings → AI Provider**\n- Switch to a different model`
          : isPaymentRequired
          ? `Payment required. The provider for this model has exhausted its credits or your API key is invalid.\n\n**Suggestions:**\n- Add your own API key in **Settings → AI Provider**\n- Switch to a different model`
          : `Error: ${msg || 'Chat completion failed'}. Please check your API key, model, and server configuration in Settings.`,
        timestamp: new Date(),
      };
      setChats(prev => prev.map(chat => {
        if (chat.id === chatId) {
          const filtered = chat.messages.filter(m => m.id !== thinkingId);
          return { ...chat, messages: [...filtered, errorMessage] };
        }
        return chat;
      }));
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 100);
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
        setIsTyping(false);
      }
      setTypingMessageId(null);
      setCoderTodos(prev => {
        const allDone = prev.map(t => ({ ...t, status: 'complete' as const }));
        // Final rewrite of TODO.md — all tasks complete
        if (allDone.length > 0) {
          const todoContent =
            '# Tasks Checklist\n\n' +
            allDone
              .map(t => `- [x] ${t.text || (t as any).content || ''}`)
              .join('\n') + '\n';
          const fullPath = coderWorkspacePath
            ? `${coderWorkspacePath.replace(/\\/g, '/')}/TODO.md`
            : './TODO.md';
          const workspaceArg = coderWorkspacePath ? { workspaceRoot: coderWorkspacePath } : {};
          fetch('/api/fs/write', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filePath: fullPath, content: todoContent, ...workspaceArg }),
          }).catch(() => {});
        }
        return allDone;
      });
    }

  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showsSlashCommands && filteredCommands.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedCommandIndex(prev => (prev + 1) % filteredCommands.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedCommandIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length);
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        const selectedCmd = filteredCommands[selectedCommandIndex];
        if (selectedCmd) {
          setInput(`/${selectedCmd.name} `);
          setSelectedCommandIndex(0);
        }
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setInput(input + ' ');
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleScreenshot = async () => {
    setIsPlusMenuOpen(false);
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const track = stream.getVideoTracks()[0];
      const imageCapture = new (window as any).ImageCapture(track);
      const bitmap = await imageCapture.grabFrame();
      const canvas = document.createElement('canvas');
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      canvas.getContext('2d')?.drawImage(bitmap, 0, 0);
      track.stop();
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `screenshot-${Date.now()}.png`, { type: 'image/png' });
          handleFileAttach([file]);
        }
      });
    } catch {
      showToast('Screenshot cancelled or not supported.');
    }
  };

  const ensureScrapedFilesOnDisk = async (doc: any) => {
    if (!doc.id) return;
    const docId = doc.id;
    const title = doc.title;
    const url = doc.url;
    const text = doc.content;
    
    const safeTitle = title.replace(/[^a-zA-Z0-9-_.]/g, '_').slice(0, 50);

    const markdownPath = `scraped_pages/${safeTitle}_${docId}.md`;
    const jsonPath = `scraped_pages/${safeTitle}_${docId}.json`;

    const markdownContent =
      `# Scraped Page: ${title}\n\n` +
      `- **URL:** ${url}\n` +
      `- **Attached On:** ${new Date().toLocaleString()}\n` +
      `- **Char Count:** ${text.length}\n\n` +
      `## Full Scraped Content\n\n` +
      `${text}`;

    try {
      await fetch('/api/fs/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: markdownPath, content: markdownContent })
      });

      const jsonContent = JSON.stringify({
        id: docId,
        url,
        title,
        scrapedAt: new Date().toISOString(),
        content: text
      }, null, 2);

      await fetch('/api/fs/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: jsonPath, content: jsonContent })
      });

      triggerWorkspaceRefresh();
    } catch (err) {
      console.error("Error creating files on disk:", err);
    }
  };

  const handleFileAttach = async (files: File[]) => {
    setAttachedFiles(prev => [...prev, ...files]);
    showToast(`${files.length} file(s) attached successfully!`);
  };

  const handleAttachUrl = async () => {
    const url = urlToolInput.trim();
    if (!url) return;
    setUrlToolLoading(true);
    setUrlToolError(null);
    try {
      const scrapeTarget = await resolveScrapeTargetUrl({
        targetUrl: url,
        queryFallback: '',
        tavilyApiKey,
        serpApiKey,
        searchProvider
      });
      // Use the existing scrapeUrl service
      const result: ScrapeResult = await scrapeUrl({ url: scrapeTarget.resolvedUrl, extractLinks: false, extractImages: false });
      
      // Compress: strip HTML, collapse whitespace, cap at 8000 chars
      let text = '';
      if (result.rawText) {
        text = result.rawText;
      } else if (result.data) {
        text = result.data.text || result.data.content || result.data.markdown || JSON.stringify(result.data);
      }
      text = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      if (text.length > 8000) text = text.slice(0, 8000) + '...[truncated]';
      
      if (!text && result.error) {
        throw new Error(result.error);
      }
      
      const finalUrl = result.url || scrapeTarget.resolvedUrl;
      const title = result.title || finalUrl;
      const favicon = `https://www.google.com/s2/favicons?domain=${new URL(finalUrl).hostname}&sz=32`;
      
      const newDoc = { id: Date.now().toString(), url: finalUrl, requestedUrl: scrapeTarget.requestedUrl, title, content: text, favicon };
      
      setAttachedUrlDocs(prev => [
        ...prev,
        newDoc
      ]);
      
      // Auto save on disk & refresh workspace
      await ensureScrapedFilesOnDisk(newDoc);
      setTranscriptionOptionsDoc(newDoc); // Prompt options right away!
      
      setUrlToolInput('');
      setIsUrlToolOpen(false);
      showToast(`✅ Attached and written to workspace folder!`);
    } catch (err: any) {
      setUrlToolError(err?.message || 'Failed to fetch URL. Make sure it is accessible and try again.');
    } finally {
      setUrlToolLoading(false);
    }
  };

  const ensureTranscriptFilesOnDisk = async (doc: any) => {
    if (!doc.videoId || !doc.segments) return;
    const videoId = doc.videoId;
    const title = doc.title;
    const url = doc.url;
    const segments = doc.segments;
    const transcript = doc.content;

    const markdownPath = `transcripts/transcript_${videoId}.md`;
    const markdownContent = `# YouTube Video Transcript\n\n` +
      `**Video Title:** ${title}\n` +
      `**Video URL:** ${url}\n` +
      `**Video ID:** ${videoId}\n` +
      `**Total Segment Milestones:** ${segments.length}\n\n` +
      `---\n\n` +
      `## Fully Assembled Text\n\n` +
      `${transcript}\n\n` +
      `---\n\n` +
      `## Timestamped Collected Segments\n\n` +
      `| Timestamp | Caption Line |\n` +
      `| :--- | :--- |\n` +
      segments.map((s: any) => `| **${s.timeStr}** | ${s.text} |`).join('\n');

    try {
      await fetch('/api/fs/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: markdownPath, content: markdownContent })
      });

      const jsonPath = `transcripts/transcript_${videoId}.json`;
      const jsonContent = JSON.stringify({
        videoId,
        videoUrl: url,
        videoTitle: title,
        totalSegments: segments.length,
        fullText: transcript,
        segments: segments
      }, null, 2);

      await fetch('/api/fs/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: jsonPath, content: jsonContent })
      });

      triggerWorkspaceRefresh();
    } catch (err) {
      console.error("Error creating files on the fly:", err);
    }
  };

  const handleFetchTranscript = async () => {
    const url = transcriptToolInput.trim();
    if (!url) return;
    setTranscriptToolLoading(true);
    setTranscriptToolError(null);
    setTranscriptToolProgress(8);
    setTranscriptToolStatus('Checking video link...');
    
    try {
      const videoId = extractYouTubeId(url);
      if (!videoId) throw new Error('Could not detect a valid YouTube video ID from this URL.');
      setTranscriptToolProgress(24);
      setTranscriptToolStatus('Requesting transcript from local server...');
      const transcriptRes = await fetchYouTubeTranscript(videoId);
      setTranscriptToolProgress(68);
      setTranscriptToolStatus('Preparing transcript for workspace...');
      const transcript = transcriptRes.text;
      const segments = transcriptRes.segments;
      const title = `YouTube Transcript – ${videoId}`;
      const truncated = transcript.length > 12000 ? transcript.slice(0, 12000) + '...[truncated]' : transcript;
      
      const newDoc = {
        id: Date.now().toString(),
        url,
        title,
        content: truncated,
        favicon: `https://www.google.com/s2/favicons?domain=youtube.com&sz=32`,
        segments,
        videoId
      };
      
      setAttachedUrlDocs(prev => [...prev, newDoc]);
      
      // Auto save on disk & refresh workspace
      setTranscriptToolProgress(86);
      setTranscriptToolStatus('Saving transcript into workspace...');
      await ensureTranscriptFilesOnDisk(newDoc);

      setTranscriptionOptionsDoc(newDoc); // Prompt with option choices!
      setTranscriptToolProgress(100);
      setTranscriptToolStatus('Transcript ready.');
      
      setTranscriptToolInput('');
      setIsTranscriptToolOpen(false);
      showToast(`✅ Transcript attached and written to workspace transcripts folder!`);
    } catch (err: any) {
      setTranscriptToolError(err?.message || 'Failed to fetch transcript. This video may not have captions enabled.');
    } finally {
      setTranscriptToolLoading(false);
    }
  };

  const processOcrForJoinedImage = async (_imageFile: File): Promise<string | null> => {
    return null;
  };

  return {
    handleSend,
    handleClearChat,
    handleKeyDown,
    handleScreenshot,
    ensureScrapedFilesOnDisk,
    processOcrForJoinedImage,
    handleFileAttach,
    handleAttachUrl,
    ensureTranscriptFilesOnDisk,
    handleFetchTranscript
  };
}
