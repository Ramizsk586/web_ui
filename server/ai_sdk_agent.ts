import { getModel, Type } from '@earendil-works/pi-ai';
import { Agent, type ThinkingLevel } from '@earendil-works/pi-agent-core';
import { streamText, tool } from 'ai';
import { z } from 'zod';
import path from 'path';
import fs from 'fs';
import { execSync, exec } from 'child_process';
import { buildProviderModel } from './ai_sdk_providers.js';
import { getFilesRecursively, matchesWorkspaceGlob } from './utils.js';

export interface StreamEvent {
  type: string;
  text?: string;
  content?: string;
  toolCallId?: string;
  toolName?: string;
  args?: any;
  result?: any;
  progress?: {
    addedCount?: number;
    removedCount?: number;
    filePath?: string;
  };
  error?: string;
}

type AgentLoopParams = {
  task: string;
  workspaceRoot: string;
  provider?: string;
  model?: string;
  apiKey?: string;
  baseUrl?: string;
  systemPrompt?: string;
  thinkingLevel?: string;
  onEvent: (event: StreamEvent) => void;
};

type ToolProgressEmitter = {
  toolCallId: string;
  toolName: string;
  emit: (event: StreamEvent) => void;
};

const DEFAULT_THINKING_LEVEL: ThinkingLevel = 'medium';

function normalizeThinkingLevel(value?: string): ThinkingLevel {
  switch (value) {
    case 'off':
    case 'minimal':
    case 'low':
    case 'medium':
    case 'high':
    case 'xhigh':
      return value;
    default:
      return DEFAULT_THINKING_LEVEL;
  }
}

type WorkspaceToolResult = {
  success: boolean;
  action: string;
  filePath?: string;
  oldPath?: string;
  newPath?: string;
  content?: string;
  bytes?: number;
  lines?: number;
  oldContent?: string;
  newContent?: string;
  addedCount?: number;
  removedCount?: number;
  matches?: string[];
  hits?: Array<{ path: string; line: number; text: string }>;
  stdout?: string;
  stderr?: string;
  code?: number | null;
  cwd?: string;
  error?: string;
  __modelText?: string;
  files?: string[];
};

const PI_SUPPORTED_PROVIDERS = new Set([
  'amazon-bedrock', 'ant-ling', 'anthropic', 'google', 'google-vertex', 'openai',
  'azure-openai-responses', 'openai-codex', 'nvidia', 'deepseek', 'github-copilot',
  'xai', 'groq', 'cerebras', 'openrouter', 'vercel-ai-gateway', 'zai', 'zai-coding-cn',
  'mistral', 'minimax', 'minimax-cn', 'moonshotai', 'moonshotai-cn', 'huggingface',
  'fireworks', 'together', 'opencode', 'opencode-go', 'kimi-coding', 'cloudflare-workers-ai',
  'cloudflare-ai-gateway', 'xiaomi', 'xiaomi-token-plan-cn', 'xiaomi-token-plan-ams',
  'xiaomi-token-plan-sgp'
]);

function isPiSupportedProvider(provider: string): boolean {
  return PI_SUPPORTED_PROVIDERS.has(provider.toLowerCase());
}

function resolveProvider(modelId: string, providerInput?: string) {
  let provider = providerInput || '';
  const modelLower = (modelId || '').toLowerCase();

  if (!provider) {
    if (modelLower.includes('gemini')) {
      provider = 'google';
    } else if (modelLower.startsWith('gpt') || modelLower.startsWith('o1') || modelLower.startsWith('o3')) {
      provider = 'openai';
    } else if (modelLower.includes('claude')) {
      provider = 'anthropic';
    } else if (modelLower.includes('deepseek')) {
      provider = 'deepseek';
    } else if (modelLower.includes('groq') || modelLower.includes('llama')) {
      provider = 'groq';
    } else {
      provider = 'openai';
    }
  }

  return provider;
}

function buildSystemPrompt(workspaceRoot: string, extraPrompt?: string) {
  const basePrompt = `You are a highly capable, fully autonomous AI software engineering assistant.
Your workspace directory is at: ${workspaceRoot}.
You have direct read/write access to files in this workspace and can run terminal commands.

YOUR MANDATE:
1. AUTONOMY & SEQUENCE: Completely resolve the task autonomously. Use as many tool calls in sequence as necessary for searching, reading files, editing, compiling, and testing.
2. NO PREMATURE STOPPING: Do not stop after 1 or 2 tool calls just to report progress or ask the user what to do next unless you are truly blocked by a missing credential or required human input.
3. VERIFICATION: After editing files, run build, compilation, or test commands when appropriate. If a build or test fails, use the error output to fix the issue and run verification again.
4. ACCURACY: Always keep file modifications precise. Prefer targeted edits when possible and full rewrites only when justified.
5. WORKSPACE SAFETY: Stay inside the provided workspace root unless the user explicitly instructs otherwise.

TOOL CONFIGURATION GUIDELINES:
- To explore directory contents, use the \`list_directory\` tool or \`glob_tool\`.
- To search for occurrences of functions, variables, or text, use the \`grep_tool\`.
- To view file content, use the \`read_file\` tool.
- To edit existing files, prefer the \`edit_file\` tool with precise search and replacement blocks. Make sure your target searches match the file contents exactly, including leading indentation and spacing.
- When creating new files, use \`write_file\`.
- When verifying, running or compiling your changes, use \`run_command\`. All commands are executed in the workspace directory.`;

  if (!extraPrompt || !extraPrompt.trim()) {
    return basePrompt;
  }

  return `${basePrompt}\n\nADDITIONAL INSTRUCTIONS:\n${extraPrompt.trim()}`;
}

function resolveWorkspacePath(workspaceRoot: string, filePathInput: string) {
  const root = path.resolve(workspaceRoot);
  const raw = String(filePathInput || '').trim();
  const candidate = raw
    ? (/^[a-zA-Z]:[\\/]/.test(raw) || raw.startsWith('\\\\') || path.isAbsolute(raw)
        ? path.resolve(raw)
        : path.resolve(root, raw))
    : root;
  const relative = path.relative(root, candidate);
  const isInside = relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));

  if (!isInside) {
    return {
      ok: false as const,
      error: `Path is outside the workspace: ${raw || candidate}`,
      root
    };
  }

  return {
    ok: true as const,
    root,
    absolutePath: candidate,
    relativePath: relative.replace(/\\/g, '/') || path.basename(candidate)
  };
}

function stripInternalToolFields<T>(value: T): T {
  if (!value || typeof value !== 'object') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => stripInternalToolFields(item)) as T;
  }

  const cloned: Record<string, any> = {};
  for (const [key, val] of Object.entries(value as Record<string, any>)) {
    if (key.startsWith('__')) continue;
    cloned[key] = stripInternalToolFields(val);
  }
  return cloned as T;
}

function summarizeLineDiff(oldContent: string, newContent: string) {
  const oldLines = oldContent.split('\n');
  const newLines = newContent.split('\n');
  let oldIndex = 0;
  let newIndex = 0;
  let removedCount = 0;
  let addedCount = 0;

  while (oldIndex < oldLines.length && newIndex < newLines.length) {
    if (oldLines[oldIndex] === newLines[newIndex]) {
      oldIndex += 1;
      newIndex += 1;
      continue;
    }

    if (oldLines[oldIndex + 1] === newLines[newIndex]) {
      removedCount += 1;
      oldIndex += 1;
      continue;
    }

    if (oldLines[oldIndex] === newLines[newIndex + 1]) {
      addedCount += 1;
      newIndex += 1;
      continue;
    }

    removedCount += 1;
    addedCount += 1;
    oldIndex += 1;
    newIndex += 1;
  }

  removedCount += oldLines.length - oldIndex;
  addedCount += newLines.length - newIndex;

  return { addedCount, removedCount };
}

function normalizeEventArgs(toolName: string, input: Record<string, any>) {
  switch (toolName) {
    case 'read_file':
    case 'write_file':
    case 'edit_file':
    case 'create_file':
    case 'delete_file':
      return {
        ...input,
        filePath: input.path || input.filePath || ''
      };
    case 'rename_file':
      return {
        ...input,
        filePath: input.newPath || input.oldPath || ''
      };
    case 'glob_tool':
      return {
        ...input,
        fileGlob: input.pattern || input.fileGlob || '*'
      };
    case 'grep_tool':
      return {
        ...input,
        query: input.pattern || input.query || '',
        fileGlob: input.fileGlob || '*'
      };
    default:
      return input;
  }
}

function toModelText(result: WorkspaceToolResult) {
  if (result.__modelText) {
    return result.__modelText;
  }

  if (result.error) {
    return `Error: ${result.error}`;
  }

  if (result.stdout || result.stderr) {
    return [result.stdout, result.stderr].filter(Boolean).join('\n') || '(command executed with no output)';
  }

  if (Array.isArray(result.matches)) {
    return result.matches.join('\n') || 'No files matched.';
  }

  if (Array.isArray(result.hits)) {
    return result.hits.map((hit) => `${hit.path}:${hit.line}: ${hit.text}`).join('\n') || 'No matches found.';
  }

  return JSON.stringify(stripInternalToolFields(result), null, 2);
}

function buildPiToolResponse(result: WorkspaceToolResult) {
  return {
    content: [{ type: 'text' as const, text: toModelText(result) }],
    details: stripInternalToolFields(result)
  };
}

async function executeReadFile(workspaceRoot: string, input: { path: string }): Promise<WorkspaceToolResult> {
  const resolved = resolveWorkspacePath(workspaceRoot, input.path);
  if (!resolved.ok) {
    return {
      success: false,
      action: 'read_failed',
      filePath: input.path,
      error: resolved.error,
      __modelText: `Error: ${resolved.error}`
    };
  }

  if (!fs.existsSync(resolved.absolutePath)) {
    return {
      success: false,
      action: 'read_failed',
      filePath: resolved.relativePath,
      error: `File not found at ${resolved.relativePath}`,
      __modelText: `Error: File not found at ${resolved.relativePath}`
    };
  }

  try {
    const content = fs.readFileSync(resolved.absolutePath, 'utf8');
    return {
      success: true,
      action: 'read',
      filePath: resolved.relativePath,
      content,
      bytes: Buffer.byteLength(content, 'utf8'),
      lines: content.split('\n').length,
      __modelText: content
    };
  } catch (error: any) {
    return {
      success: false,
      action: 'read_failed',
      filePath: resolved.relativePath,
      error: error.message,
      __modelText: `Error reading file: ${error.message}`
    };
  }
}

async function executeWriteFile(workspaceRoot: string, input: { path: string; content: string }): Promise<WorkspaceToolResult> {
  const resolved = resolveWorkspacePath(workspaceRoot, input.path);
  if (!resolved.ok) {
    return {
      success: false,
      action: 'write_failed',
      filePath: input.path,
      error: resolved.error,
      __modelText: `Error: ${resolved.error}`
    };
  }

  try {
    const oldContent = fs.existsSync(resolved.absolutePath)
      ? fs.readFileSync(resolved.absolutePath, 'utf8')
      : '';
    fs.mkdirSync(path.dirname(resolved.absolutePath), { recursive: true });
    fs.writeFileSync(resolved.absolutePath, input.content, 'utf8');
    const { addedCount, removedCount } = summarizeLineDiff(oldContent, input.content);

    return {
      success: true,
      action: oldContent ? 'updated_file' : 'written',
      filePath: resolved.relativePath,
      oldContent,
      newContent: input.content,
      addedCount,
      removedCount,
      bytes: Buffer.byteLength(input.content, 'utf8'),
      lines: input.content.split('\n').length,
      __modelText: `Successfully wrote content to ${resolved.relativePath}`
    };
  } catch (error: any) {
    return {
      success: false,
      action: 'write_failed',
      filePath: resolved.relativePath,
      error: error.message,
      __modelText: `Error writing file: ${error.message}`
    };
  }
}

async function executeEditFile(
  workspaceRoot: string,
  input: { path: string; target: string; replacement: string },
  progress?: ToolProgressEmitter
): Promise<WorkspaceToolResult> {
  const resolved = resolveWorkspacePath(workspaceRoot, input.path);
  if (!resolved.ok) {
    return {
      success: false,
      action: 'edit_failed',
      filePath: input.path,
      error: resolved.error,
      __modelText: `Error: ${resolved.error}`
    };
  }

  if (!fs.existsSync(resolved.absolutePath)) {
    return {
      success: false,
      action: 'edit_failed',
      filePath: resolved.relativePath,
      error: `File not found at ${resolved.relativePath}`,
      __modelText: `Error: File not found at ${resolved.relativePath}`
    };
  }

  try {
    const oldContent = fs.readFileSync(resolved.absolutePath, 'utf8');
    let target = input.target;
    let replacement = input.replacement;
    const isCrlf = oldContent.includes('\r\n');
    if (isCrlf) {
      if (target.includes('\n') && !target.includes('\r\n')) {
        target = target.replace(/\r?\n/g, '\r\n');
      }
      if (replacement.includes('\n') && !replacement.includes('\r\n')) {
        replacement = replacement.replace(/\r?\n/g, '\r\n');
      }
    } else {
      if (target.includes('\r\n')) {
        target = target.replace(/\r\n/g, '\n');
      }
      if (replacement.includes('\r\n')) {
        replacement = replacement.replace(/\r\n/g, '\n');
      }
    }

    if (!oldContent.includes(target)) {
      return {
        success: false,
        action: 'edit_failed',
        filePath: resolved.relativePath,
        error: 'Target string not found in file. Make sure the target text matches exactly, including indentation and spacing.',
        __modelText: 'Error: Target string not found in file. Make sure the target text matches exactly, including indentation and spacing.'
      };
    }

    const newContent = oldContent.replace(target, replacement);
    const oldTargetLines = target ? target.split('\n').length : 0;
    const newTargetLines = replacement ? replacement.split('\n').length : 0;
    if (progress && (oldTargetLines > 0 || newTargetLines > 0)) {
      const totalSteps = Math.max(oldTargetLines, newTargetLines, 1);
      for (let step = 1; step <= totalSteps; step += 1) {
        progress.emit({
          type: 'tool_call_progress',
          toolCallId: progress.toolCallId,
          toolName: progress.toolName,
          progress: {
            filePath: resolved.relativePath,
            addedCount: Math.min(newTargetLines, step),
            removedCount: Math.min(oldTargetLines, step)
          }
        });
      }
    }
    fs.writeFileSync(resolved.absolutePath, newContent, 'utf8');
    const { addedCount, removedCount } = summarizeLineDiff(oldContent, newContent);

    return {
      success: true,
      action: 'updated_file',
      filePath: resolved.relativePath,
      oldContent,
      newContent,
      addedCount,
      removedCount,
      __modelText: `Successfully updated ${resolved.relativePath}`
    };
  } catch (error: any) {
    return {
      success: false,
      action: 'edit_failed',
      filePath: resolved.relativePath,
      error: error.message,
      __modelText: `Error editing file: ${error.message}`
    };
  }
}

async function executeCreateFile(workspaceRoot: string, input: { path: string }): Promise<WorkspaceToolResult> {
  const resolved = resolveWorkspacePath(workspaceRoot, input.path);
  if (!resolved.ok) {
    return {
      success: false,
      action: 'create_failed',
      filePath: input.path,
      error: resolved.error,
      __modelText: `Error: ${resolved.error}`
    };
  }

  if (fs.existsSync(resolved.absolutePath)) {
    return {
      success: false,
      action: 'create_failed',
      filePath: resolved.relativePath,
      error: `File already exists at ${resolved.relativePath}`,
      __modelText: `Error: File already exists at ${resolved.relativePath}`
    };
  }

  try {
    fs.mkdirSync(path.dirname(resolved.absolutePath), { recursive: true });
    fs.writeFileSync(resolved.absolutePath, '', 'utf8');
    return {
      success: true,
      action: 'created_file',
      filePath: resolved.relativePath,
      oldContent: '',
      newContent: '',
      addedCount: 0,
      removedCount: 0,
      __modelText: `Successfully created empty file at ${resolved.relativePath}`
    };
  } catch (error: any) {
    return {
      success: false,
      action: 'create_failed',
      filePath: resolved.relativePath,
      error: error.message,
      __modelText: `Error creating file: ${error.message}`
    };
  }
}

async function executeDeleteFile(workspaceRoot: string, input: { path: string }): Promise<WorkspaceToolResult> {
  const resolved = resolveWorkspacePath(workspaceRoot, input.path);
  if (!resolved.ok) {
    return {
      success: false,
      action: 'delete_failed',
      filePath: input.path,
      error: resolved.error,
      __modelText: `Error: ${resolved.error}`
    };
  }

  if (!fs.existsSync(resolved.absolutePath)) {
    return {
      success: false,
      action: 'delete_failed',
      filePath: resolved.relativePath,
      error: `File not found at ${resolved.relativePath}`,
      __modelText: `Error: File not found at ${resolved.relativePath}`
    };
  }

  try {
    const oldContent = fs.readFileSync(resolved.absolutePath, 'utf8');
    fs.unlinkSync(resolved.absolutePath);
    return {
      success: true,
      action: 'deleted_file',
      filePath: resolved.relativePath,
      oldContent,
      newContent: '',
      addedCount: 0,
      removedCount: oldContent.split('\n').length,
      __modelText: `Successfully deleted file ${resolved.relativePath}`
    };
  } catch (error: any) {
    return {
      success: false,
      action: 'delete_failed',
      filePath: resolved.relativePath,
      error: error.message,
      __modelText: `Error deleting file: ${error.message}`
    };
  }
}

async function executeRenameFile(
  workspaceRoot: string,
  input: { oldPath: string; newPath: string }
): Promise<WorkspaceToolResult> {
  const oldResolved = resolveWorkspacePath(workspaceRoot, input.oldPath);
  const newResolved = resolveWorkspacePath(workspaceRoot, input.newPath);

  if (!oldResolved.ok) {
    return {
      success: false,
      action: 'rename_failed',
      oldPath: input.oldPath,
      newPath: input.newPath,
      error: oldResolved.error,
      __modelText: `Error: ${oldResolved.error}`
    };
  }

  if (!newResolved.ok) {
    return {
      success: false,
      action: 'rename_failed',
      oldPath: input.oldPath,
      newPath: input.newPath,
      error: newResolved.error,
      __modelText: `Error: ${newResolved.error}`
    };
  }

  if (!fs.existsSync(oldResolved.absolutePath)) {
    return {
      success: false,
      action: 'rename_failed',
      oldPath: oldResolved.relativePath,
      newPath: newResolved.relativePath,
      error: `Source file not found at ${oldResolved.relativePath}`,
      __modelText: `Error: Source file not found at ${oldResolved.relativePath}`
    };
  }

  try {
    fs.mkdirSync(path.dirname(newResolved.absolutePath), { recursive: true });
    fs.renameSync(oldResolved.absolutePath, newResolved.absolutePath);
    return {
      success: true,
      action: 'renamed_file',
      filePath: newResolved.relativePath,
      oldPath: oldResolved.relativePath,
      newPath: newResolved.relativePath,
      __modelText: `Successfully moved or renamed file from ${oldResolved.relativePath} to ${newResolved.relativePath}`
    };
  } catch (error: any) {
    return {
      success: false,
      action: 'rename_failed',
      oldPath: oldResolved.relativePath,
      newPath: newResolved.relativePath,
      error: error.message,
      __modelText: `Error renaming file: ${error.message}`
    };
  }
}

async function executeListDirectory(workspaceRoot: string, input: { path: string }): Promise<WorkspaceToolResult> {
  const resolved = resolveWorkspacePath(workspaceRoot, input.path);
  if (!resolved.ok) {
    return {
      success: false,
      action: 'list_directory_failed',
      filePath: input.path,
      error: resolved.error,
      __modelText: `Error: ${resolved.error}`
    };
  }

  if (!fs.existsSync(resolved.absolutePath)) {
    return {
      success: false,
      action: 'list_directory_failed',
      filePath: resolved.relativePath,
      error: `Directory not found at ${resolved.relativePath}`,
      __modelText: `Error: Directory not found at ${resolved.relativePath}`
    };
  }

  try {
    const stats = fs.statSync(resolved.absolutePath);
    if (!stats.isDirectory()) {
      return {
        success: false,
        action: 'list_directory_failed',
        filePath: resolved.relativePath,
        error: `Path is a file, not a directory: ${resolved.relativePath}`,
        __modelText: `Error: Path is a file, not a directory: ${resolved.relativePath}`
      };
    }

    const items = fs.readdirSync(resolved.absolutePath);
    const files = items.map(name => {
      const fullPath = path.join(resolved.absolutePath, name);
      const isDir = fs.statSync(fullPath).isDirectory();
      return `${name}${isDir ? '/' : ''}`;
    });

    const modelText = files.length > 0 
      ? `Contents of ${resolved.relativePath || '.'}/:\n${files.map(f => `- ${f}`).join('\n')}`
      : `Directory ${resolved.relativePath || '.'}/ is empty.`;

    return {
      success: true,
      action: 'list_directory',
      filePath: resolved.relativePath,
      files,
      __modelText: modelText
    };
  } catch (error: any) {
    return {
      success: false,
      action: 'list_directory_failed',
      filePath: resolved.relativePath,
      error: error.message,
      __modelText: `Error listing directory: ${error.message}`
    };
  }
}

async function executeGlobTool(workspaceRoot: string, input: { pattern: string }): Promise<WorkspaceToolResult> {
  try {
    const files = getFilesRecursively(workspaceRoot);
    const matches = files
      .filter((file) => !file.isDirectory && matchesWorkspaceGlob(file.relativePath, input.pattern))
      .map((file) => file.relativePath)
      .slice(0, 300);

    return {
      success: true,
      action: 'glob',
      matches,
      __modelText: matches.length > 0 ? matches.join('\n') : 'No files matched.'
    };
  } catch (error: any) {
    return {
      success: false,
      action: 'glob_failed',
      error: error.message,
      __modelText: `Error finding files: ${error.message}`
    };
  }
}

async function executeGrepTool(
  workspaceRoot: string,
  input: { pattern: string; fileGlob?: string }
): Promise<WorkspaceToolResult> {
  try {
    const files = getFilesRecursively(workspaceRoot);
    const hits: Array<{ path: string; line: number; text: string }> = [];

    for (const file of files) {
      if (file.isDirectory) continue;
      if (input.fileGlob && !matchesWorkspaceGlob(file.relativePath, input.fileGlob)) continue;

      try {
        const content = fs.readFileSync(file.path, 'utf8');
        const lines = content.split('\n');
        lines.forEach((line, index) => {
          if (line.includes(input.pattern)) {
            hits.push({
              path: file.relativePath,
              line: index + 1,
              text: line.trim()
            });
          }
        });
      } catch {
        // Ignore unreadable files.
      }

      if (hits.length >= 200) break;
    }

    return {
      success: true,
      action: 'grep',
      hits,
      __modelText: hits.length > 0
        ? hits.map((hit) => `${hit.path}:${hit.line}: ${hit.text}`).join('\n')
        : 'No matches found.'
    };
  } catch (error: any) {
    return {
      success: false,
      action: 'grep_failed',
      error: error.message,
      __modelText: `Error running search: ${error.message}`
    };
  }
}

async function executeRunCommand(workspaceRoot: string, input: { command: string }): Promise<WorkspaceToolResult> {
  const blockedPatterns = ['rm -rf /', 'rm -rf *', 'sudo ', 'mkfs'];
  const blockedPattern = blockedPatterns.find((pattern) => input.command.includes(pattern));

  if (blockedPattern) {
    return {
      success: false,
      action: 'command_blocked',
      cwd: workspaceRoot,
      code: null,
      error: `Command blocked due to disallowed pattern: "${blockedPattern}"`,
      __modelText: `Command blocked due to disallowed pattern: "${blockedPattern}"`
    };
  }

  return new Promise((resolve) => {
    exec(input.command, {
      cwd: workspaceRoot,
      timeout: 30_000,
    }, (error: any, stdout, stderr) => {
      const outStr = String(stdout || '');
      const errStr = String(stderr || '');
      
      if (error) {
        const message = error.message || 'Command failed';
        resolve({
          success: false,
          action: 'command_failed',
          cwd: workspaceRoot,
          stdout: outStr,
          stderr: errStr,
          code: typeof error.code === 'number' ? error.code : (typeof error.status === 'number' ? error.status : 1),
          error: message,
          __modelText: `Command exited with error:\n${outStr || ''}${outStr && errStr ? '\n' : ''}${errStr || ''}\n${message}`.trim()
        });
      } else {
        resolve({
          success: true,
          action: 'command_executed',
          cwd: workspaceRoot,
          stdout: outStr,
          stderr: errStr,
          code: 0,
          __modelText: outStr || '(command executed with no output)'
        });
      }
    });
  });
}

async function executeWorkspaceTool(toolName: string, workspaceRoot: string, input: Record<string, any>) {
  switch (toolName) {
    case 'read_file':
      return executeReadFile(workspaceRoot, { path: String(input.path || '') });
    case 'write_file':
      return executeWriteFile(workspaceRoot, {
        path: String(input.path || ''),
        content: String(input.content || '')
      });
    case 'edit_file':
      return executeEditFile(workspaceRoot, {
        path: String(input.path || ''),
        target: String(input.target || ''),
        replacement: String(input.replacement || '')
      }, input.__progressEmitter);
    case 'create_file':
      return executeCreateFile(workspaceRoot, { path: String(input.path || '') });
    case 'delete_file':
      return executeDeleteFile(workspaceRoot, { path: String(input.path || '') });
    case 'rename_file':
      return executeRenameFile(workspaceRoot, {
        oldPath: String(input.oldPath || ''),
        newPath: String(input.newPath || '')
      });
    case 'glob_tool':
      return executeGlobTool(workspaceRoot, { pattern: String(input.pattern || '') });
    case 'grep_tool':
      return executeGrepTool(workspaceRoot, {
        pattern: String(input.pattern || ''),
        fileGlob: input.fileGlob ? String(input.fileGlob) : undefined
      });
    case 'run_command':
      return executeRunCommand(workspaceRoot, { command: String(input.command || '') });
    case 'list_directory':
      return executeListDirectory(workspaceRoot, { path: String(input.path || '') });
    default:
      return {
        success: false,
        action: 'unknown_tool',
        error: `Unknown tool: ${toolName}`,
        __modelText: `Error: Unknown tool ${toolName}`
      } satisfies WorkspaceToolResult;
  }
}

function createPiWorkspaceTools(workspaceRoot: string) {
  return [
    {
      name: 'read_file',
      label: 'Read File',
      description: 'Read the contents of a file in the workspace.',
      parameters: Type.Object({
        path: Type.String({ description: 'Absolute path or relative path from the workspace root' }),
      }),
      execute: async (_toolCallId: string, input: any) => buildPiToolResponse(await executeWorkspaceTool('read_file', workspaceRoot, input))
    },
    {
      name: 'write_file',
      label: 'Write File',
      description: 'Create a new file or completely overwrite an existing file with content.',
      parameters: Type.Object({
        path: Type.String({ description: 'Absolute path or relative path from the workspace root' }),
        content: Type.String({ description: 'The complete file content to write' }),
      }),
      execute: async (_toolCallId: string, input: any) => buildPiToolResponse(await executeWorkspaceTool('write_file', workspaceRoot, input))
    },
    {
      name: 'edit_file',
      label: 'Edit File',
      description: 'Edit a specific block of text in a file by replacing target text with replacement text.',
      parameters: Type.Object({
        path: Type.String({ description: 'Absolute path or relative path from the workspace root' }),
        target: Type.String({ description: 'The exact string to find in the file' }),
        replacement: Type.String({ description: 'The new string to replace the target with' }),
      }),
      execute: async (_toolCallId: string, input: any) => buildPiToolResponse(await executeWorkspaceTool('edit_file', workspaceRoot, input))
    },
    {
      name: 'create_file',
      label: 'Create File',
      description: 'Create an empty file if it does not already exist.',
      parameters: Type.Object({
        path: Type.String({ description: 'Absolute path or relative path from the workspace root' }),
      }),
      execute: async (_toolCallId: string, input: any) => buildPiToolResponse(await executeWorkspaceTool('create_file', workspaceRoot, input))
    },
    {
      name: 'delete_file',
      label: 'Delete File',
      description: 'Delete a file from the workspace.',
      parameters: Type.Object({
        path: Type.String({ description: 'Absolute path or relative path from the workspace root' }),
      }),
      execute: async (_toolCallId: string, input: any) => buildPiToolResponse(await executeWorkspaceTool('delete_file', workspaceRoot, input))
    },
    {
      name: 'rename_file',
      label: 'Rename File',
      description: 'Rename or move a file in the workspace.',
      parameters: Type.Object({
        oldPath: Type.String({ description: 'Current relative path of the file' }),
        newPath: Type.String({ description: 'Target relative path of the file' }),
      }),
      execute: async (_toolCallId: string, input: any) => buildPiToolResponse(await executeWorkspaceTool('rename_file', workspaceRoot, input))
    },
    {
      name: 'list_directory',
      label: 'List Directory',
      description: 'List all files and subdirectories within a directory in the workspace.',
      parameters: Type.Object({
        path: Type.String({ description: 'Relative path of the directory from the workspace root (e.g., "." or "src")' }),
      }),
      execute: async (_toolCallId: string, input: any) => buildPiToolResponse(await executeWorkspaceTool('list_directory', workspaceRoot, input))
    },
    {
      name: 'glob_tool',
      label: 'Glob Search',
      description: 'List files matching a glob pattern in the workspace.',
      parameters: Type.Object({
        pattern: Type.String({ description: 'Glob pattern (e.g., src/**/*.ts, package.json)' }),
      }),
      execute: async (_toolCallId: string, input: any) => buildPiToolResponse(await executeWorkspaceTool('glob_tool', workspaceRoot, input))
    },
    {
      name: 'grep_tool',
      label: 'Grep Search',
      description: 'Search for content matches matching a pattern in the workspace.',
      parameters: Type.Object({
        pattern: Type.String({ description: 'Text/string pattern to search for' }),
        fileGlob: Type.Optional(Type.String({ description: 'Optional file extension glob (e.g. *.ts)' })),
      }),
      execute: async (_toolCallId: string, input: any) => buildPiToolResponse(await executeWorkspaceTool('grep_tool', workspaceRoot, input))
    },
    {
      name: 'run_command',
      label: 'Run Command',
      description: 'Run a shell command in the workspace directory.',
      parameters: Type.Object({
        command: Type.String({ description: 'The bash/shell command to execute' }),
      }),
      execute: async (_toolCallId: string, input: any) => buildPiToolResponse(await executeWorkspaceTool('run_command', workspaceRoot, input))
    }
  ];
}

function createAiSdkWorkspaceTools(workspaceRoot: string) {
  const makeTool = <T extends z.ZodTypeAny>(
    name: string,
    description: string,
    inputSchema: T,
    onEvent?: AgentLoopParams['onEvent']
  ) =>
    tool({
      description,
      inputSchema,
      execute: async (input: z.infer<T>, options?: { toolCallId?: string }) => {
        const payload = input as Record<string, any>;
        if (onEvent && options?.toolCallId) {
          payload.__progressEmitter = {
            toolCallId: options.toolCallId,
            toolName: name,
            emit: onEvent
          } satisfies ToolProgressEmitter;
        }
        return executeWorkspaceTool(name, workspaceRoot, payload);
      },
      toModelOutput: ({ output }) => ({
        type: 'text' as const,
        value: toModelText(output as WorkspaceToolResult)
      })
    });

  return {
    read_file: makeTool(
      'read_file',
      'Read the contents of a file in the workspace.',
      z.object({
        path: z.string().describe('Absolute path or relative path from the workspace root')
      }),
      undefined
    ),
    write_file: makeTool(
      'write_file',
      'Create a new file or completely overwrite an existing file with content.',
      z.object({
        path: z.string().describe('Absolute path or relative path from the workspace root'),
        content: z.string().describe('The complete file content to write')
      }),
      undefined
    ),
    edit_file: makeTool(
      'edit_file',
      'Edit a specific block of text in a file by replacing target text with replacement text.',
      z.object({
        path: z.string().describe('Absolute path or relative path from the workspace root'),
        target: z.string().describe('The exact string to find in the file'),
        replacement: z.string().describe('The new string to replace the target with')
      }),
      undefined
    ),
    create_file: makeTool(
      'create_file',
      'Create an empty file if it does not already exist.',
      z.object({
        path: z.string().describe('Absolute path or relative path from the workspace root')
      }),
      undefined
    ),
    delete_file: makeTool(
      'delete_file',
      'Delete a file from the workspace.',
      z.object({
        path: z.string().describe('Absolute path or relative path from the workspace root')
      }),
      undefined
    ),
    rename_file: makeTool(
      'rename_file',
      'Rename or move a file in the workspace.',
      z.object({
        oldPath: z.string().describe('Current relative path of the file'),
        newPath: z.string().describe('Target relative path of the file')
      }),
      undefined
    ),
    list_directory: makeTool(
      'list_directory',
      'List all files and subdirectories within a directory in the workspace.',
      z.object({
        path: z.string().describe('Relative path of the directory from the workspace root (e.g., "." or "src")')
      }),
      undefined
    ),
    glob_tool: makeTool(
      'glob_tool',
      'List files matching a glob pattern in the workspace.',
      z.object({
        pattern: z.string().describe('Glob pattern (e.g., src/**/*.ts, package.json)')
      }),
      undefined
    ),
    grep_tool: makeTool(
      'grep_tool',
      'Search for content matches matching a pattern in the workspace.',
      z.object({
        pattern: z.string().describe('Text/string pattern to search for'),
        fileGlob: z.string().optional().describe('Optional file extension glob (e.g. *.ts)')
      }),
      undefined
    ),
    run_command: makeTool(
      'run_command',
      'Run a shell command in the workspace directory.',
      z.object({
        command: z.string().describe('The bash/shell command to execute')
      }),
      undefined
    )
  };
}

function createAiSdkWorkspaceToolsWithEvents(workspaceRoot: string, onEvent: AgentLoopParams['onEvent']) {
  const tools = createAiSdkWorkspaceTools(workspaceRoot) as any;
  const patchTool = (name: string) => {
    const original = tools[name];
    if (!original?.execute) return;
    const originalExecute = original.execute;
    original.execute = async (input: any, options?: { toolCallId?: string }) => {
      const payload = { ...(input || {}) };
      if (options?.toolCallId) {
        payload.__progressEmitter = {
          toolCallId: options.toolCallId,
          toolName: name,
          emit: onEvent
        } satisfies ToolProgressEmitter;
      }
      return originalExecute(payload, options);
    };
  };

  patchTool('edit_file');
  return tools;
}

async function runPiAgentLoop(params: AgentLoopParams & { provider: string; model: string }) {
  const { task, workspaceRoot, provider, model, apiKey, baseUrl, systemPrompt, thinkingLevel, onEvent } = params;

  let modelInstance: any = getModel(provider as any, model);
  if (!modelInstance) {
    throw new Error(`Pi runtime does not have a native model config for ${provider}/${model}`);
  } else if (baseUrl) {
    modelInstance = {
      ...modelInstance,
      baseUrl
    };
  }

  const agent = new Agent({
    initialState: {
      systemPrompt: buildSystemPrompt(workspaceRoot, systemPrompt),
      model: modelInstance,
      thinkingLevel: normalizeThinkingLevel(thinkingLevel),
      tools: createPiWorkspaceTools(workspaceRoot) as any
    },
    getApiKey: () => apiKey
  });

  agent.subscribe((event) => {
    switch (event.type) {
      case 'message_update': {
        const update = event.assistantMessageEvent;
        if (update.type === 'text_delta') {
          onEvent({ type: 'token', text: update.delta });
        } else if (update.type === 'thinking_delta') {
          onEvent({ type: 'thinking', content: update.delta });
        }
        break;
      }
      case 'tool_execution_start': {
        onEvent({
          type: 'tool_call_start',
          toolCallId: event.toolCallId,
          toolName: event.toolName,
          args: normalizeEventArgs(event.toolName, event.args || {})
        });
        break;
      }
      case 'tool_execution_end': {
        const rawResult = event.result?.details ?? event.result?.content?.[0]?.text ?? event.result?.content ?? event.result;
        onEvent({
          type: 'tool_call_end',
          toolCallId: event.toolCallId,
          toolName: event.toolName,
          result: stripInternalToolFields(rawResult)
        });
        break;
      }
    }
  });

  await agent.prompt(task);

  const messages = agent.state.messages;
  let finalAnswer = '';
  const toolCalls: any[] = [];
  const toolResults: any[] = [];

  for (const msg of messages) {
    if (msg.role === 'assistant') {
      for (const contentBlock of msg.content) {
        if (contentBlock.type === 'text' && 'text' in contentBlock) {
          finalAnswer += contentBlock.text;
        } else if (contentBlock.type === 'toolCall') {
          toolCalls.push({
            id: contentBlock.id,
            name: contentBlock.name,
            arguments: contentBlock.arguments
          });
        }
      }
    } else if (msg.role === 'toolResult') {
      const firstContent = Array.isArray(msg.content) ? msg.content[0] : undefined;
      toolResults.push({
        toolCallId: msg.toolCallId,
        result: firstContent && firstContent.type === 'text' ? firstContent.text : msg.content
      });
    }
  }

  onEvent({
    type: 'done',
    result: {
      text: finalAnswer,
      toolCalls,
      toolResults,
      stopReason: 'stop'
    }
  });
}

async function runDirectAiSdkLoop(params: AgentLoopParams & { provider: string; model: string }) {
  const { task, workspaceRoot, provider, model, apiKey, baseUrl, systemPrompt, onEvent } = params;
  const modelInstance = buildProviderModel({
    provider,
    modelId: model,
    apiKey,
    baseUrl
  });

  const toolCalls: Array<{ id: string; name: string; arguments: any }> = [];
  const toolResults: Array<{ toolCallId: string; result: any }> = [];
  let streamedText = '';

  const resultStream = streamText({
    model: modelInstance,
    system: buildSystemPrompt(workspaceRoot, systemPrompt),
    prompt: task,
    maxSteps: 20,
    tools: createAiSdkWorkspaceToolsWithEvents(workspaceRoot, onEvent),
  } as any);

  for await (const chunk of resultStream.fullStream as any) {
    switch (chunk.type) {
      case 'text-delta':
        streamedText += chunk.text || chunk.delta || '';
        onEvent({ type: 'token', text: chunk.text || chunk.delta || '' });
        break;
      case 'reasoning-delta':
        onEvent({ type: 'thinking', content: chunk.delta || '' });
        break;
      case 'tool-call': {
        const args = normalizeEventArgs(chunk.toolName, chunk.input || {});
        toolCalls.push({
          id: chunk.toolCallId,
          name: chunk.toolName,
          arguments: chunk.input || {}
        });
        onEvent({
          type: 'tool_call_start',
          toolCallId: chunk.toolCallId,
          toolName: chunk.toolName,
          args
        });
        break;
      }
      case 'tool-result': {
        if (chunk.preliminary) break;
        const sanitized = stripInternalToolFields(chunk.output);
        toolResults.push({
          toolCallId: chunk.toolCallId,
          result: sanitized
        });
        onEvent({
          type: 'tool_call_end',
          toolCallId: chunk.toolCallId,
          toolName: chunk.toolName,
          result: sanitized
        });
        break;
      }
      case 'tool-error': {
        const errorText = typeof chunk.error === 'string'
          ? chunk.error
          : (chunk.error as any)?.message || 'Tool execution failed';
        const errorResult = {
          success: false,
          action: 'tool_failed',
          error: errorText
        };
        toolResults.push({
          toolCallId: chunk.toolCallId,
          result: errorResult
        });
        onEvent({
          type: 'tool_call_end',
          toolCallId: chunk.toolCallId,
          toolName: chunk.toolName,
          result: errorResult
        });
        break;
      }
      case 'error':
        onEvent({ type: 'error', error: chunk.errorText || 'Agent loop encountered an error' });
        break;
    }
  }

  let finalAnswer = streamedText;
  try {
    const resolvedText = await resultStream.text;
    if (resolvedText && !finalAnswer) {
      finalAnswer = resolvedText;
    }
  } catch {
    // Ignore text promise failures when streaming text already succeeded.
  }

  let stopReason = 'stop';
  try {
    stopReason = String(await resultStream.finishReason);
  } catch {
    stopReason = 'stop';
  }

  onEvent({
    type: 'done',
    result: {
      text: finalAnswer,
      toolCalls,
      toolResults,
      stopReason
    }
  });
}

export async function runAiSdkAgentLoop(params: AgentLoopParams): Promise<void> {
  const resolvedProvider = resolveProvider(params.model || 'gpt-4o-mini', params.provider);
  const model = params.model || 'gpt-4o-mini';
  const shouldUsePi = isPiSupportedProvider(resolvedProvider);

  let emittedEventCount = 0;
  const countedOnEvent = (event: StreamEvent) => {
    emittedEventCount += 1;
    params.onEvent(event);
  };

  try {
    if (shouldUsePi) {
      await runPiAgentLoop({
        ...params,
        provider: resolvedProvider,
        model,
        onEvent: countedOnEvent
      });
      return;
    }

    await runDirectAiSdkLoop({
      ...params,
      provider: resolvedProvider,
      model,
      onEvent: countedOnEvent
    });
  } catch (error: any) {
    if (shouldUsePi && emittedEventCount === 0) {
      try {
        console.warn('[Pi Agent Core] Falling back to direct AI SDK runtime:', error?.message || error);
        await runDirectAiSdkLoop({
          ...params,
          provider: resolvedProvider,
          model,
          onEvent: countedOnEvent
        });
        return;
      } catch (fallbackError: any) {
        console.error('[Direct AI SDK] Fallback runtime error:', fallbackError);
        params.onEvent({
          type: 'error',
          error: fallbackError.message || 'Agent loop encountered an error'
        });
        return;
      }
    }

    console.error('[Agent Loop] Runtime error:', error);
    params.onEvent({
      type: 'error',
      error: error.message || 'Agent loop encountered an error'
    });
  }
}
