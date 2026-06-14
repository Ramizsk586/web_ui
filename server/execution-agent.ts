/**
 * execution-agent.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Execution / Worker Agent — handles tasks delegated by the Boop dispatcher.
 *
 * Design rules:
 *   • All destructive/side-effectful outputs (file writes, git commits, etc.)
 *     must be staged via save_draft and returned for user approval first.
 *   • Read-only tools (read_file, glob, grep, web_scrape, search) can run freely.
 *   • Every run is recorded in Convex (executionAgents + agentLogs tables).
 *
 * The LLM brain is the Anthropic SDK pointed at Lumina's proxy server via
 * bridge-client.ts — exactly the same routing path as the Master agent.
 */

import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { chatCompletion, DEFAULT_AGENT_MODEL } from './bridge-client.js';
import { getConvexClient } from './convex-client.js';
import { api } from '../convex/_generated/api.js';
import { deliverToTelegram } from './telegram-delivery.js';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ExecutionAgentOptions {
  agentId: string;
  name: string;
  task: string;
  integrations: string[];
  conversationId?: string;
  telegramChatId?: number;
}

// ── In-flight registry (allows cancellation checks) ───────────────────────────

const activeAgents = new Set<string>();
export function isAgentActive(agentId: string): boolean {
  return activeAgents.has(agentId);
}
export function cancelAgent(agentId: string): void {
  activeAgents.delete(agentId);
}

// ── System prompt ─────────────────────────────────────────────────────────────

const EXECUTION_SYSTEM_PROMPT = `\
You are a specialised Execution Agent inside Lumina.

YOUR ROLE
─────────
• Complete the task delegated to you by the Master Agent (Boop).
• You have access to workspace tools: read files, search, web scrape, run shell
  commands (read-only), and grep code.
• NEVER directly write, delete, or execute mutating commands without first
  staging the change with save_draft.

TOOL PROTOCOL
──────────────
read_file       – Read a file's content (safe, unrestricted).
write_draft     – Stage a proposed file write/command for user approval.
glob_tool       – List files matching a glob pattern.
grep_tool       – Search file content for a pattern.
run_command     – Execute a read-only shell command (ls, cat, find, git log…).
web_scrape      – Fetch and parse a URL.
web_search      – Run a web search query.
complete_task   – Signal task completion with a summary result.

SAFETY
──────
1. Use write_draft for ALL content that would mutate state.
2. Do not run commands with side-effects (rm, git push, curl -X POST, etc.)
   without explicit write_draft staging first.
3. Keep each tool call focused and atomic.
`;

// ── Tool definitions ───────────────────────────────────────────────────────────

const EXECUTION_TOOLS = [
  {
    name: 'read_file',
    description: 'Read the content of a file at the given path.',
    input_schema: {
      type: 'object' as const,
      properties: {
        path: { type: 'string', description: 'Absolute or relative file path' },
      },
      required: ['path'],
    },
  },
  {
    name: 'write_draft',
    description: 'Stage a proposed file write or destructive command for user approval. Does NOT execute it.',
    input_schema: {
      type: 'object' as const,
      properties: {
        description: { type: 'string', description: 'Human-readable description of what this change does' },
        action: { type: 'string', enum: ['write_file', 'run_command', 'delete_file'] },
        path: { type: 'string', description: 'File path (for write_file / delete_file)' },
        content: { type: 'string', description: 'New file content (for write_file)' },
        command: { type: 'string', description: 'Shell command (for run_command)' },
      },
      required: ['description', 'action'],
    },
  },
  {
    name: 'glob_tool',
    description: 'List files matching a glob pattern in a directory.',
    input_schema: {
      type: 'object' as const,
      properties: {
        pattern: { type: 'string', description: 'Glob pattern (e.g. src/**/*.ts)' },
        cwd: { type: 'string', description: 'Working directory (optional)' },
      },
      required: ['pattern'],
    },
  },
  {
    name: 'grep_tool',
    description: 'Search for a string or regex pattern in files.',
    input_schema: {
      type: 'object' as const,
      properties: {
        pattern: { type: 'string', description: 'Search pattern' },
        directory: { type: 'string', description: 'Directory to search in' },
        fileGlob: { type: 'string', description: 'File extension filter (e.g. *.ts)' },
        caseSensitive: { type: 'boolean' },
      },
      required: ['pattern'],
    },
  },
  {
    name: 'run_command',
    description: 'Run a read-only shell command and return its stdout.',
    input_schema: {
      type: 'object' as const,
      properties: {
        command: { type: 'string' },
        cwd: { type: 'string' },
      },
      required: ['command'],
    },
  },
  {
    name: 'web_scrape',
    description: 'Fetch and extract text from a URL.',
    input_schema: {
      type: 'object' as const,
      properties: {
        url: { type: 'string' },
      },
      required: ['url'],
    },
  },
  {
    name: 'web_search',
    description: 'Run a web search and return top results.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string' },
        numResults: { type: 'number' },
      },
      required: ['query'],
    },
  },
  {
    name: 'complete_task',
    description: 'Signal that the task is complete and return the final result summary.',
    input_schema: {
      type: 'object' as const,
      properties: {
        result: { type: 'string', description: 'Summary of what was accomplished' },
        drafts: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of draft IDs staged for user approval',
        },
      },
      required: ['result'],
    },
  },
] as const;

// ── Tool execution ─────────────────────────────────────────────────────────────

const BLOCKED_COMMANDS = ['rm ', 'rmdir', 'curl -X', 'wget ', 'git push', 'git reset', 'dd ', 'mkfs', 'sudo '];

async function executeTool(
  toolName: string,
  toolInput: Record<string, any>,
  agentId: string
): Promise<{ result: string; completed?: boolean; finalResult?: string }> {
  const convex = getConvexClient();

  // Log tool use
  await convex.mutation(api.agents.addLog, {
    agentId,
    logType: 'tool_use',
    toolName,
    content: JSON.stringify(toolInput).slice(0, 500),
  });

  try {
    switch (toolName) {
      case 'read_file': {
        const filePath = path.resolve(process.cwd(), toolInput.path as string);
        if (!fs.existsSync(filePath)) return { result: `File not found: ${filePath}` };
        const content = fs.readFileSync(filePath, 'utf8');
        const truncated = content.length > 8000 ? content.slice(0, 8000) + '\n… (truncated)' : content;
        return { result: truncated };
      }

      case 'write_draft': {
        const draftId = `draft_${agentId}_${Date.now()}`;
        const record = { ...toolInput, draftId, agentId, createdAt: new Date().toISOString() };
        const draftPath = path.join(process.cwd(), '.lumina', 'drafts');
        fs.mkdirSync(draftPath, { recursive: true });
        fs.writeFileSync(path.join(draftPath, `${draftId}.json`), JSON.stringify(record, null, 2));
        return { result: `Draft staged (ID: ${draftId}) — "${toolInput.description}"` };
      }

      case 'glob_tool': {
        const { execSync } = await import('child_process');
        const cwd = (toolInput.cwd as string) ?? process.cwd();
        const pattern = toolInput.pattern as string;
        // Convert simple glob pattern to a find command
        // e.g. "src/**/*.ts" → find src -name "*.ts"
        const parts = pattern.split('/');
        const namePart = parts[parts.length - 1];
        const dirPart = parts.slice(0, -1).join('/').replace(/\*\*/g, '').replace(/\/\//g, '/').replace(/\/$/, '') || '.';
        const findCmd = `find "${cwd}/${dirPart}" -name "${namePart}" -maxdepth 10 2>/dev/null | head -100`;
        const output = execSync(findCmd, { encoding: 'utf8', timeout: 15_000 }).trim();
        return { result: output || 'No files matched.' };
      }

      case 'grep_tool': {
        const { execSync } = await import('child_process');
        const flags = toolInput.caseSensitive ? '' : '-i';
        const dir = toolInput.directory ?? '.';
        const include = toolInput.fileGlob ? `--include="${toolInput.fileGlob}"` : '';
        const cmd = `grep -r ${flags} ${include} "${toolInput.pattern}" "${dir}" --line-number 2>/dev/null | head -60`;
        const output = execSync(cmd, { encoding: 'utf8', timeout: 15_000 }).trim();
        return { result: output || 'No matches found.' };
      }

      case 'run_command': {
        const cmd = toolInput.command as string;
        // Safety check — block destructive patterns
        const blocked = BLOCKED_COMMANDS.find(b => cmd.toLowerCase().includes(b.toLowerCase()));
        if (blocked) {
          return { result: `BLOCKED: Command contains disallowed pattern "${blocked}". Use write_draft to stage mutations.` };
        }
        const { execSync } = await import('child_process');
        const cwd = toolInput.cwd as string ?? process.cwd();
        const output = execSync(cmd, { encoding: 'utf8', cwd, timeout: 30_000 }).trim();
        return { result: output.slice(0, 6000) || '(no output)' };
      }

      case 'web_scrape': {
        const res = await fetch(toolInput.url as string, {
          headers: { 'User-Agent': 'Lumina-Agent/1.0' },
          signal: AbortSignal.timeout(20_000),
        });
        const text = await res.text();
        // Strip tags roughly
        const stripped = text.replace(/<[^>]+>/g, ' ').replace(/\s{2,}/g, ' ').trim();
        return { result: stripped.slice(0, 6000) };
      }

      case 'web_search': {
        // Delegate to the existing Lumina search endpoint
        const query = encodeURIComponent(toolInput.query as string);
        const num = (toolInput.numResults as number) ?? 5;
        const LUMINA_PORT = process.env.LUMINA_PORT ?? '3000';
        const res = await fetch(
          `http://127.0.0.1:${LUMINA_PORT}/api/search?q=${query}&num=${num}`,
          { signal: AbortSignal.timeout(20_000) }
        );
        if (!res.ok) return { result: `Search failed: ${res.status}` };
        const data = await res.json();
        const results = (data.results ?? data.data ?? []).slice(0, num);
        return {
          result: results
            .map((r: any) => `• ${r.title ?? ''}\n  ${r.url ?? ''}\n  ${r.snippet ?? ''}`)
            .join('\n\n') || 'No results.',
        };
      }

      case 'complete_task': {
        return {
          result: toolInput.result as string,
          completed: true,
          finalResult: toolInput.result as string,
        };
      }

      default:
        return { result: `Unknown tool: ${toolName}` };
    }
  } catch (err: any) {
    const errMsg = `Tool "${toolName}" error: ${err.message ?? String(err)}`;
    await convex.mutation(api.agents.addLog, {
      agentId,
      logType: 'error',
      toolName,
      content: errMsg,
    });
    return { result: errMsg };
  }
}

// ── Main runner ───────────────────────────────────────────────────────────────

/**
 * Run an Execution Agent to completion.  Persists progress to Convex and
 * optionally delivers the result to Telegram.
 */
export async function runExecutionAgent(opts: ExecutionAgentOptions): Promise<string> {
  const { agentId, name, task, integrations, conversationId, telegramChatId } = opts;
  const convex = getConvexClient();

  // Register in Convex
  await convex.mutation(api.agents.create, {
    agentId,
    name,
    task,
    integrations,
    conversationId,
  });
  await convex.mutation(api.agents.update, { agentId, status: 'running' });
  activeAgents.add(agentId);

  console.log(`[ExecutionAgent] Starting agent "${name}" (${agentId})`);

  const messages: { role: 'user' | 'assistant'; content: any }[] = [
    {
      role: 'user',
      content: `Complete the following task:\n\n${task}\n\nAgent ID: ${agentId}`,
    },
  ];

  let finalResult = '';
  const MAX_TURNS = 15;

  try {
    for (let turn = 0; turn < MAX_TURNS; turn++) {
      if (!activeAgents.has(agentId)) {
        finalResult = 'Agent was cancelled.';
        break;
      }

      let response: any;
      try {
        response = await chatCompletion(messages as any, {
          model: DEFAULT_AGENT_MODEL,
          maxTokens: 4096,
          systemPrompt: EXECUTION_SYSTEM_PROMPT,
          tools: EXECUTION_TOOLS as any,
        });
      } catch (err: any) {
        finalResult = `LLM error: ${err.message}`;
        break;
      }

      // Log any text output
      const textBlocks = (response.content ?? []).filter((b: any) => b.type === 'text');
      for (const tb of textBlocks) {
        await convex.mutation(api.agents.addLog, {
          agentId,
          logType: 'text',
          content: tb.text,
        });
      }

      if (response.stop_reason === 'end_turn') {
        finalResult = textBlocks.map((b: any) => b.text).join('\n') || 'Task completed.';
        break;
      }

      // Process tool calls
      const toolUseBlocks = (response.content ?? []).filter((b: any) => b.type === 'tool_use');
      if (toolUseBlocks.length === 0) {
        finalResult = textBlocks.map((b: any) => b.text).join('\n') || 'Task completed.';
        break;
      }

      messages.push({ role: 'assistant', content: response.content });

      const toolResults: any[] = [];
      for (const toolBlock of toolUseBlocks) {
        const { result, completed, finalResult: fr } = await executeTool(
          toolBlock.name,
          toolBlock.input ?? {},
          agentId
        );
        await convex.mutation(api.agents.addLog, {
          agentId,
          logType: 'tool_result',
          toolName: toolBlock.name,
          content: result.slice(0, 1000),
        });
        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolBlock.id,
          content: result,
        });
        if (completed) {
          finalResult = fr ?? result;
          // Push tool result then break
          messages.push({ role: 'user', content: toolResults });
          break;
        }
      }

      if (finalResult) break;

      messages.push({ role: 'user', content: toolResults });
    }

    if (!finalResult) finalResult = 'Task completed (max turns reached).';

    await convex.mutation(api.agents.update, {
      agentId,
      status: 'completed',
      result: finalResult.slice(0, 2000),
      completedAt: Date.now(),
    });

  } catch (err: any) {
    const errMsg = `Agent failed: ${err.message ?? String(err)}`;
    console.error(`[ExecutionAgent] ${agentId} error:`, err);
    await convex.mutation(api.agents.update, {
      agentId,
      status: 'failed',
      error: errMsg,
      completedAt: Date.now(),
    });
    finalResult = errMsg;
  } finally {
    activeAgents.delete(agentId);
  }

  // Deliver to Telegram if a chat ID was provided
  if (telegramChatId) {
    await deliverToTelegram(telegramChatId, `✅ Agent **${name}** completed:\n\n${finalResult.slice(0, 3500)}`);
  }

  console.log(`[ExecutionAgent] "${name}" (${agentId}) done.`);
  return finalResult;
}
