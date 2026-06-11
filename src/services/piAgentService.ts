/**
 * Pi Agent Service - Integration wrapper for @earendil-works/pi-coding-agent SDK
 *
 * This service provides a clean interface to use the pi coding agent SDK
 * as an alternative agent engine in the main application.
 */

import { Type, Static } from '@earendil-works/pi-ai';
import {
  AgentSession,
  AuthStorage,
  createAgentSession,
  defineTool,
  SessionManager,
  type AgentSessionEvent,
} from '@earendil-works/pi-coding-agent';
import type { ThinkingLevel as ThinkingLevelType } from '@earendil-works/pi-agent-core';

// TypeBox schemas for coder tools
const ReadFileSchema = Type.Object({
  filePath: Type.String({ description: 'Path to the file to read (relative to workspace)' }),
  offset: Type.Optional(Type.Number({ description: 'Line offset to start reading from' })),
  limit: Type.Optional(Type.Number({ description: 'Maximum number of lines to read' })),
});

const WriteFileSchema = Type.Object({
  filePath: Type.String({ description: 'Path to the file to write (relative to workspace)' }),
  content: Type.String({ description: 'Content to write to the file' }),
});

const CreateFileSchema = Type.Object({
  filePath: Type.String({ description: 'Path to create (relative to workspace)' }),
  isDirectory: Type.Optional(Type.Boolean({ description: 'Whether to create a directory instead of a file' })),
  content: Type.Optional(Type.String({ description: 'Initial content for the file' })),
});

const DeleteFileSchema = Type.Object({
  filePath: Type.String({ description: 'Path to delete (relative to workspace)' }),
});

const RenameFileSchema = Type.Object({
  filePath: Type.String({ description: 'Current file path (relative to workspace)' }),
  newPath: Type.String({ description: 'New file path (relative to workspace)' }),
});

const GlobToolSchema = Type.Object({
  fileGlob: Type.Optional(Type.String({ description: 'Glob pattern (e.g., "**/*.ts")' })),
  maxResults: Type.Optional(Type.Number({ description: 'Maximum results to return' })),
});

const GrepToolSchema = Type.Object({
  query: Type.String({ description: 'Search query (regex supported)' }),
  fileGlob: Type.Optional(Type.String({ description: 'File glob pattern to filter' })),
  maxResults: Type.Optional(Type.Number({ description: 'Maximum results to return' })),
});

const RunCommandSchema = Type.Object({
  command: Type.String({ description: 'Shell command to execute' }),
  cwd: Type.Optional(Type.String({ description: 'Working directory' })),
});

const WebScrapeSchema = Type.Object({
  url: Type.String({ description: 'URL to scrape' }),
});

const WebSearchSchema = Type.Object({
  query: Type.Array(Type.String(), { description: 'Search queries' }),
});

const AnalyzeFileSchema = Type.Object({
  filePath: Type.String({ description: 'Path to the file to analyze (relative to workspace)' }),
});

const ManageTodosSchema = Type.Object({
  action: Type.Union([Type.Literal('create'), Type.Literal('update'), Type.Literal('complete')], { description: 'Todo action' }),
  task: Type.Optional(Type.String({ description: 'Task description' })),
  taskId: Type.Optional(Type.String({ description: 'Task ID' })),
});

const AskUserSchema = Type.Object({
  question: Type.String({ description: 'Question to ask the user' }),
  options: Type.Optional(Type.Array(Type.String(), { description: 'Options if multiple choice' })),
});

export interface PiAgentContext {
  workspacePath?: string;
  chatHistory: AppAgentMessage[];
  userMessage: string;
  signal?: AbortSignal;
}

export interface AppAgentMessage {
  id?: string;
  role: string;
  content: string;
  timestamp?: number;
  toolCallId?: string;
}

export interface PiAgentResult {
  text: string;
  toolCalls: Array<{
    id: string;
    name: string;
    arguments: any;
  }>;
  toolResults: Array<{
    toolCallId: string;
    result: any;
  }>;
  stopReason: string;
}

export type PiAgentEventHandler = (event: PiAgentEvent) => void;

export type PiAgentEvent =
  | { type: 'text'; content: string }
  | { type: 'tool_call_start'; toolCallId: string; toolName: string; args?: any }
  | { type: 'tool_call_end'; toolCallId: string; toolName: string; result: any; args?: any }
  | { type: 'thinking'; content: string }
  | { type: 'done'; result: PiAgentResult }
  | { type: 'error'; error: string };

export interface PiAgentInstance {
  session: AgentSession;
  authStorage: AuthStorage;
  dispose: () => void;
}

export interface CoderAgentConfig {
  workspacePath: string;
  apiKey?: string;
  model?: {
    id?: string;
    provider?: string;
    baseUrl?: string;
  };
  systemPrompt?: string;
  thinkingLevel?: ThinkingLevelType;
  onToolStart?: (toolCallId: string, toolName: string, args: any) => void;
  onToolEnd?: (toolCallId: string, toolName: string, result: any, args: any) => void;
  onText?: (content: string) => void;
  onThinking?: (content: string) => void;
  onError?: (error: string) => void;
}

function normalizePath(path: string, workspacePath?: string): string {
  const cleaned = path.replace(/^\.?\/?/, '');
  return workspacePath ? `${workspacePath.replace(/\\/g, '/')}/${cleaned}` : `./${cleaned}`;
}

function normalizeRelativePath(path: string, workspacePath?: string): string {
  if (!workspacePath) return path;
  const normalized = path.replace(/\\/g, '/');
  const wpNormalized = workspacePath.replace(/\\/g, '/');
  if (normalized.startsWith(wpNormalized)) {
    return normalized.slice(wpNormalized.length).replace(/^\/?/, '');
  }
  return path;
}

function compressToolResult(name: string, result: any): any {
  if (result === undefined) return { status: 'no_result', message: `Tool "${name}" completed without returning a payload.` };
  if (result === null) return { status: 'null_result', message: `Tool "${name}" returned null.` };

  const str = typeof result === 'string' ? result : JSON.stringify(result);
  if (!str.trim()) return { status: 'empty_result', message: `Tool "${name}" returned an empty payload.` };

  if (str.length <= 2500) return result;

  if (name === 'read_file') {
    return `${str.substring(0, 2000)}\n\n... [Content truncated. Total length: ${str.length} characters]`;
  }

  return str;
}

// Helper to convert thinking level string
function toThinkingLevel(level?: string): ThinkingLevelType {
  const validLevels: ThinkingLevelType[] = ['off', 'minimal', 'low', 'medium', 'high', 'xhigh'];
  return (validLevels.includes(level as ThinkingLevelType) ? level : 'high') as ThinkingLevelType;
}

/**
 * Create a coder pi agent with comprehensive file system tools
 */
export async function createCoderPiAgent(config: CoderAgentConfig): Promise<PiAgentInstance> {
  const { workspacePath, apiKey, systemPrompt, thinkingLevel = 'high' } = config;
  const normalizedWorkspace = workspacePath?.replace(/\\/g, '/') || '.';

  // Set up auth storage
  const authStorage = AuthStorage.create();
  if (apiKey) {
    authStorage.setRuntimeApiKey(config.model?.provider || 'anthropic', apiKey);
  }

  const defaultSystemPrompt = systemPrompt || `You are an expert software developer working in a coding workspace.

## Workspace
You have access to the workspace at: ${normalizedWorkspace}

## Guidelines
- Create, read, write, and edit files in the workspace
- Execute shell commands when needed
- Use glob_tool to discover files, read_file to examine them, write_file to create/modify
- Use grep_tool to search code patterns
- Execute build commands, tests, and linting
- Always verify file writes by reading back
- Provide working, complete code solutions

## Workflow
1. Understand the user's request
2. Plan the changes needed (read existing files first if modifying)
3. Execute changes step by step
4. Verify the changes work correctly`;

  // Define all coder tools
  const tools = [
    // File tools
    defineTool({
      name: 'read_file',
      label: 'Read File',
      description: 'Read the contents of a file from the workspace',
      parameters: ReadFileSchema,
      execute: async (_toolCallId, params) => {
        const fullPath = normalizePath(params.filePath, workspacePath);
        const readBody: any = { filePath: fullPath };
        if (params.offset) readBody.offset = Number(params.offset);
        if (params.limit) readBody.limit = Number(params.limit);

        const res = await fetch('/api/fs/read', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(readBody),
        });
        const data = await res.json().catch(() => ({ error: 'Failed to parse response' }));
        return compressToolResult('read_file', { ...data, filePath: normalizeRelativePath(params.filePath, workspacePath) });
      },
    }),

    defineTool({
      name: 'write_file',
      label: 'Write File',
      description: 'Write content to a file in the workspace (creates new or overwrites existing)',
      parameters: WriteFileSchema,
      execute: async (_toolCallId, params) => {
        const fullPath = normalizePath(params.filePath, workspacePath);
        const cleanedPath = normalizeRelativePath(params.filePath, workspacePath);

        // Check if file exists to get old content for diff
        let oldContent = '';
        try {
          const readOld = await fetch('/api/fs/read', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filePath: fullPath }),
          });
          if (readOld.ok) {
            const oldData = await readOld.json();
            oldContent = oldData.content || '';
          }
        } catch {}

        // Create parent directories if needed
        if (cleanedPath.includes('/')) {
          const folderPart = cleanedPath.substring(0, cleanedPath.lastIndexOf('/'));
          const folderFullPath = normalizePath(folderPart, workspacePath);
          await fetch('/api/fs/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filePath: folderFullPath, isDirectory: true }),
          }).catch(() => {});
        }

        const writeRes = await fetch('/api/fs/write', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filePath: fullPath, content: params.content }),
        });

        if (!writeRes.ok) {
          const verifyRes = await fetch('/api/fs/read', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filePath: fullPath }),
          });
          if (verifyRes.ok) {
            const verifyData = await verifyRes.json();
            if (verifyData.content === params.content) {
              return { success: true, filePath: cleanedPath, action: oldContent ? 'updated_file' : 'created_file' };
            }
          }
          const errorData = await writeRes.json().catch(() => ({}));
          return { error: errorData.error || `Failed to write ${cleanedPath}`, filePath: cleanedPath };
        }

        return {
          success: true,
          filePath: cleanedPath,
          action: oldContent ? 'updated_file' : 'created_file',
          addedCount: params.content.split('\n').length,
          removedCount: oldContent ? oldContent.split('\n').length : 0,
        };
      },
    }),

    defineTool({
      name: 'create_file',
      label: 'Create File',
      description: 'Create a new file or directory in the workspace',
      parameters: CreateFileSchema,
      execute: async (_toolCallId, params) => {
        const fullPath = normalizePath(params.filePath, workspacePath);
        const cleanedPath = normalizeRelativePath(params.filePath, workspacePath);

        // Create parent directories if needed
        if (cleanedPath.includes('/') && !params.isDirectory) {
          const folderPart = cleanedPath.substring(0, cleanedPath.lastIndexOf('/'));
          const folderFullPath = normalizePath(folderPart, workspacePath);
          await fetch('/api/fs/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filePath: folderFullPath, isDirectory: true }),
          }).catch(() => {});
        }

        const res = await fetch('/api/fs/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filePath: fullPath,
            isDirectory: !!params.isDirectory,
            content: params.content || '',
          }),
        });

        const data = await res.json().catch(() => ({ error: 'Failed to parse response' }));
        return { ...data, filePath: cleanedPath, action: params.isDirectory ? 'created_directory' : 'created_file' };
      },
    }),

    defineTool({
      name: 'delete_file',
      label: 'Delete File',
      description: 'Delete a file or directory from the workspace',
      parameters: DeleteFileSchema,
      execute: async (_toolCallId, params) => {
        const fullPath = normalizePath(params.filePath, workspacePath);
        const cleanedPath = normalizeRelativePath(params.filePath, workspacePath);

        const res = await fetch('/api/fs/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filePath: fullPath }),
        });

        const data = await res.json().catch(() => ({ error: 'Failed to parse response' }));
        return { ...data, filePath: cleanedPath, action: 'deleted_file' };
      },
    }),

    defineTool({
      name: 'rename_file',
      label: 'Rename File',
      description: 'Rename or move a file in the workspace',
      parameters: RenameFileSchema,
      execute: async (_toolCallId, params) => {
        const oldFullPath = normalizePath(params.filePath, workspacePath);
        const newFullPath = normalizePath(params.newPath, workspacePath);
        const cleanedOldPath = normalizeRelativePath(params.filePath, workspacePath);
        const cleanedNewPath = normalizeRelativePath(params.newPath, workspacePath);

        const res = await fetch('/api/fs/move', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ oldPath: oldFullPath, newPath: newFullPath }),
        });

        const data = await res.json().catch(() => ({ error: 'Failed to parse response' }));
        return { ...data, filePath: cleanedNewPath, oldPath: cleanedOldPath, newPath: cleanedNewPath, action: 'renamed_file' };
      },
    }),

    defineTool({
      name: 'glob_tool',
      label: 'Find Files',
      description: 'Find files in the workspace matching a glob pattern',
      parameters: GlobToolSchema,
      execute: async (_toolCallId, params) => {
        const listRes = await fetch('/api/fs/list', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ folderPath: workspacePath || '.' }),
        });
        const listData = await listRes.json().catch(() => ({ files: [] }));
        let files = listData.files || [];

        const fileGlob = String(params.fileGlob || '').toLowerCase();
        if (fileGlob) {
          files = files.filter((f: any) => {
            if (f.isDirectory) return false;
            const rel = String(f.relativePath || f.path || '').toLowerCase();
            return matchesGlob(rel, fileGlob);
          });
        }

        const maxResults = Math.max(1, Math.min(Number(params.maxResults || 30), 80));
        return {
          fileGlob,
          count: files.length,
          files: files.slice(0, maxResults).map((f: any) => ({
            filePath: f.relativePath || f.path,
            isDirectory: f.isDirectory,
          })),
        };
      },
    }),

    defineTool({
      name: 'grep_tool',
      label: 'Search Code',
      description: 'Search for text patterns in code files',
      parameters: GrepToolSchema,
      execute: async (_toolCallId, params) => {
        const listRes = await fetch('/api/fs/list', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ folderPath: workspacePath || '.' }),
        });
        const listData = await listRes.json().catch(() => ({ files: [] }));
        let files = listData.files || [];

        const fileGlob = String(params.fileGlob || '').toLowerCase();
        if (fileGlob) {
          files = files.filter((f: any) => {
            if (f.isDirectory) return false;
            const rel = String(f.relativePath || f.path || '').toLowerCase();
            return matchesGlob(rel, fileGlob);
          });
        }

        // Filter to code files
        files = files.filter((f: any) => {
          if (f.isDirectory) return false;
          const rel = String(f.relativePath || f.path || '').toLowerCase();
          return /\.(html?|css|scss|js|jsx|ts|tsx|json|md|vue|svelte|py|rs|go|php|rb|java|kt|swift)$/i.test(rel);
        });

        const maxResults = Math.max(1, Math.min(Number(params.maxResults || 30), 80));
        const query = String(params.query || '').trim();
        let regex: RegExp;
        try {
          regex = new RegExp(query, 'ig');
        } catch {
          regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'ig');
        }

        const matches: any[] = [];
        for (const file of files) {
          if (matches.length >= maxResults) break;
          try {
            const readRes = await fetch('/api/fs/read', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ filePath: file.relativePath || file.path }),
            });
            if (!readRes.ok) continue;
            const readData = await readRes.json();
            const lines = String(readData.content || '').split('\n');
            lines.forEach((line, idx) => {
              if (matches.length >= maxResults) return;
              regex.lastIndex = 0;
              if (regex.test(line)) {
                matches.push({
                  filePath: file.relativePath || file.path,
                  line: idx + 1,
                  text: line.trim().slice(0, 240),
                });
              }
            });
          } catch {}
        }

        return { query, count: matches.length, matches };
      },
    }),

    defineTool({
      name: 'run_command',
      label: 'Run Command',
      description: 'Execute a shell command in the workspace',
      parameters: RunCommandSchema,
      execute: async (_toolCallId, params) => {
        const cwd = params.cwd || workspacePath || '.';
        const res = await fetch('/api/bash', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ command: params.command, cwd }),
        });
        const data = await res.json().catch(() => ({ error: 'Command execution failed' }));
        return data;
      },
    }),

    defineTool({
      name: 'current_time',
      label: 'Current Time',
      description: 'Get the current date and time',
      parameters: Type.Object({}),
      execute: async () => {
        const now = new Date();
        return {
          iso: now.toISOString(),
          timestamp: now.getTime(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
          locale: now.toLocaleString(),
        };
      },
    }),

    defineTool({
      name: 'web_scrape',
      label: 'Web Scrape',
      description: 'Fetch and extract content from a web URL',
      parameters: WebScrapeSchema,
      execute: async (_toolCallId, params) => {
        const res = await fetch('/api/scrape', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: params.url }),
        });
        const data = await res.json().catch(() => ({ error: 'Scrape failed' }));
        return compressToolResult('web_scrape', data);
      },
    }),

    defineTool({
      name: 'search',
      label: 'Web Search',
      description: 'Search the web for information',
      parameters: WebSearchSchema,
      execute: async (_toolCallId, params) => {
        const queries = params.query || [];
        const results = await Promise.all(
          queries.map(async (q: string) => {
            const res = await fetch('/api/search', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ query: q }),
            });
            const data = await res.json().catch(() => ({ results: [] }));
            return { query: q, results: data.results || [] };
          })
        );
        return results;
      },
    }),

    defineTool({
      name: 'analyze_file',
      label: 'Analyze File',
      description: 'Analyze a file for its structure and content',
      parameters: AnalyzeFileSchema,
      execute: async (_toolCallId, params) => {
        const fullPath = normalizePath(params.filePath, workspacePath);
        const cleanedPath = normalizeRelativePath(params.filePath, workspacePath);

        const res = await fetch('/api/fs/read', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filePath: fullPath }),
        });
        const data = await res.json().catch(() => ({ error: 'Failed to read file' }));

        if (data.error || !data.content) {
          return { error: data.error || 'Failed to read file', filePath: cleanedPath };
        }

        const content = data.content;
        const lines = content.split('\n');
        const extension = cleanedPath.split('.').pop()?.toLowerCase() || '';

        return {
          filePath: cleanedPath,
          language: getLanguageFromExtension(extension),
          lineCount: lines.length,
          charCount: content.length,
          preview: lines.slice(0, 20).join('\n'),
          structure: analyzeCodeStructure(content, extension),
        };
      },
    }),
  ];

  // Create the agent session
  const { session } = await createAgentSession({
    authStorage,
    sessionManager: SessionManager.inMemory(),
    customTools: tools,
    cwd: workspacePath || process.cwd(),
  });

  // Set thinking level
  session.setThinkingLevel(toThinkingLevel(thinkingLevel));

  return {
    session,
    authStorage,
    dispose: () => session.dispose(),
  };
}

/**
 * Run a task with the coder pi agent and stream events
 */
export async function runCoderPiAgent(
  agentInstance: PiAgentInstance,
  task: string,
  onEvent: PiAgentEventHandler,
  signal?: AbortSignal
): Promise<PiAgentResult> {
  const { session } = agentInstance;

  let accumulatedText = '';
  let toolCalls: PiAgentResult['toolCalls'] = [];
  let toolResults: PiAgentResult['toolResults'] = [];

  // Set up abort handling
  if (signal) {
    signal.addEventListener('abort', () => {
      session.abort();
    });
  }

  // Subscribe to session events
  const unsubscribe = session.subscribe((event: AgentSessionEvent) => {
    switch (event.type) {
      case 'message_update':
        if (event.assistantMessageEvent.type === 'text_delta') {
          const text = event.assistantMessageEvent.delta;
          accumulatedText += text;
          onEvent({ type: 'text', content: text });
        }
        if (event.assistantMessageEvent.type === 'thinking_delta') {
          onEvent({ type: 'thinking', content: event.assistantMessageEvent.delta });
        }
        break;

      case 'tool_execution_start':
        onEvent({
          type: 'tool_call_start',
          toolCallId: event.toolCallId || '',
          toolName: event.toolName,
        });
        break;

      case 'tool_execution_end':
        const result = event.result;
        toolResults.push({
          toolCallId: event.toolCallId || '',
          result,
        });
        onEvent({
          type: 'tool_call_end',
          toolCallId: event.toolCallId || '',
          toolName: event.toolName,
          result,
        });
        break;

      case 'turn_end':
        // Collect tool calls from the turn
        if (event.message?.tool_calls) {
          for (const tc of event.message.tool_calls) {
            if (!toolCalls.find(t => t.id === tc.id)) {
              toolCalls.push({
                id: tc.id || '',
                name: tc.name || '',
                arguments: tc.input || {},
              });
            }
          }
        }
        break;

      case 'agent_end':
        // Agent finished - collect final tool calls
        if (event.messages) {
          for (const msg of event.messages) {
            if (msg.tool_call_id && msg.role === 'tool') {
              const existingResult = toolResults.find(t => t.toolCallId === msg.tool_call_id);
              if (existingResult) {
                existingResult.result = msg.content;
              }
            }
          }
        }
        break;
    }
  });

  try {
    await session.prompt(task);

    const result: PiAgentResult = {
      text: accumulatedText,
      toolCalls,
      toolResults,
      stopReason: 'end_turn',
    };
    onEvent({ type: 'done', result });
    return result;
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    onEvent({ type: 'error', error: errMsg });
    throw error;
  } finally {
    unsubscribe();
  }
}

// Helper functions
function matchesGlob(path: string, pattern: string): boolean {
  // Simple glob matching - convert pattern to regex
  const regexPattern = pattern
    .replace(/\./g, '\\.')
    .replace(/\*\*/g, '{{DOUBLE_STAR}}')
    .replace(/\*/g, '[^/]*')
    .replace(/\{\{DOUBLE_STAR\}\}/g, '.*')
    .replace(/\?/g, '.');

  try {
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(path);
  } catch {
    return path.includes(pattern.replace(/\*/g, ''));
  }
}

function getLanguageFromExtension(ext: string): string {
  const map: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescript',
    js: 'javascript',
    jsx: 'javascript',
    py: 'python',
    rs: 'rust',
    go: 'go',
    java: 'java',
    rb: 'ruby',
    php: 'php',
    css: 'css',
    scss: 'scss',
    html: 'html',
    json: 'json',
    md: 'markdown',
    vue: 'vue',
    svelte: 'svelte',
  };
  return map[ext] || 'plaintext';
}

function analyzeCodeStructure(content: string, ext: string): any {
  const lines = content.split('\n');
  const structure: any = {
    imports: [],
    exports: [],
    functions: [],
    classes: [],
  };

  // Simple pattern matching for common structures
  const importRegex = /^(import|const|let|var)\s+.+\s+from\s+['"].+['"]/;
  const exportRegex = /^export\s+(default\s+)?(function|const|let|var|class|interface|type)/;
  const functionRegex = /^(export\s+)?(?:async\s+)?function\s+(\w+)/;
  const classRegex = /^(export\s+)?class\s+(\w+)/;
  const constFunctionRegex = /^(export\s+)?(?:async\s+)?(?:const|let|var)\s+(\w+)\s*=/;

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (importRegex.test(trimmed)) {
      structure.imports.push({ line: idx + 1, text: trimmed.slice(0, 80) });
    }
    if (exportRegex.test(trimmed)) {
      const match = trimmed.match(/export\s+(default\s+)?(.+)/);
      if (match) {
        structure.exports.push({ line: idx + 1, text: match[2].slice(0, 80) });
      }
    }
    const funcMatch = trimmed.match(functionRegex);
    if (funcMatch) {
      structure.functions.push({ line: idx + 1, name: funcMatch[2] });
    }
    const classMatch = trimmed.match(classRegex);
    if (classMatch) {
      structure.classes.push({ line: idx + 1, name: classMatch[2] });
    }
    const constMatch = trimmed.match(constFunctionRegex);
    if (constMatch && !trimmed.includes('function')) {
      structure.exports.push({ line: idx + 1, name: constMatch[2] });
    }
  });

  return structure;
}

// Backwards compatibility
export interface PiAgentConfig {
  model: {
    id: string;
    name: string;
    provider: string;
    api: string;
    baseUrl: string;
  };
  systemPrompt: string;
  tools: Array<{
    name: string;
    description: string;
    parameters: any;
    handler: (args: any, context: PiAgentContext) => Promise<any>;
  }>;
  thinkingLevel?: ThinkingLevelType;
  sessionId?: string;
  apiKey?: string;
  workspacePath?: string;
}

export async function createPiAgent(config: PiAgentConfig): Promise<PiAgentInstance> {
  const authStorage = AuthStorage.create();
  if (config.apiKey) {
    authStorage.setRuntimeApiKey(config.model.provider, config.apiKey);
  }

  const { session } = await createAgentSession({
    authStorage,
    sessionManager: SessionManager.inMemory(),
    customTools: config.tools.map(tool =>
      defineTool({
        name: tool.name,
        label: tool.name,
        description: tool.description,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        parameters: tool.parameters as any,
        execute: async (_toolCallId: string, params: any) => {
          try {
            const result = await tool.handler(params, {
              workspacePath: config.workspacePath,
              chatHistory: [],
              userMessage: '',
            });
            return { content: [{ type: 'text' as const, text: typeof result === 'string' ? result : JSON.stringify(result) }], details: result };
          } catch (error) {
            return { content: [{ type: 'text' as const, text: error instanceof Error ? error.message : String(error) }], details: { error: true } };
          }
        },
      })
    ),
    cwd: config.workspacePath || process.cwd(),
  });

  session.setThinkingLevel(toThinkingLevel(config.thinkingLevel));

  return {
    session,
    authStorage,
    dispose: () => session.dispose(),
  };
}

export async function runPiAgent(
  agentInstance: PiAgentInstance,
  userMessage: string,
  history: AppAgentMessage[],
  onEvent: PiAgentEventHandler,
  signal?: AbortSignal
): Promise<PiAgentResult> {
  return runCoderPiAgent(agentInstance, userMessage, onEvent, signal);
}

export async function runCoderTask(
  agentInstance: PiAgentInstance,
  task: string,
  workspacePath: string,
  onEvent: PiAgentEventHandler,
  signal?: AbortSignal
): Promise<PiAgentResult> {
  return runCoderPiAgent(agentInstance, task, onEvent, signal);
}