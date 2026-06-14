/**
 * interaction-agent.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Boop — the Master Dispatcher Agent.
 *
 * Responsibilities:
 *   • Receive user messages from any channel (web UI, Telegram, automation runs)
 *   • Recall relevant memories via Convex
 *   • Plan the response: answer directly or spawn an Execution Agent sub-task
 *   • Draft and buffer responses before delivery (safety layer)
 *   • Never directly execute filesystem, shell, or browser operations
 *
 * All LLM calls are routed through Lumina's built-in Anthropic Proxy server
 * (configured via bridge-client.ts) so the user controls which backend model
 * is actually invoked through the Settings → Anthropic Proxy panel.
 */

import { v4 as uuidv4 } from 'uuid';
import { chatCompletion, DEFAULT_AGENT_MODEL } from './bridge-client.js';
import { getConvexClient } from './convex-client.js';
import { api } from '../convex/_generated/api.js';
import type { ConvexClient } from 'convex/browser';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface UserMessage {
  content: string;
  userId?: string;
  conversationId?: string;
  telegramChatId?: number;
  source?: 'web' | 'telegram' | 'automation';
}

export interface AgentResponse {
  reply: string;
  agentId?: string;
  spawned?: boolean;
  draft?: boolean;
}

// ── System prompt for Boop ────────────────────────────────────────────────────

const BOOP_SYSTEM_PROMPT = `\
You are Boop, the Master Dispatcher AI for Lumina — an intelligent personal AI operating system.

CORE IDENTITY
─────────────
• You are warm, direct, curious, and highly capable.
• You orchestrate specialised sub-agents for complex tasks; you do NOT perform
  filesystem, shell, or browser operations yourself.
• You maintain a rich memory of the user's preferences, projects, and life.

CAPABILITIES  (tools available to you)
────────────────────────────────────────
recall_memory      – Search long-term memory for relevant context
save_memory        – Persist a new permanent or long-term fact
spawn_agent        – Delegate a complex or side-effectful task to an Execution Agent
save_draft         – Buffer a response for user review before delivery
get_active_agents  – Check on running sub-agents
create_automation  – Register a recurring cron automation

RULES
─────
1. ALWAYS recall_memory at the start of every conversation turn.
2. When a task requires file edits, code execution, or web browsing, use spawn_agent.
3. Never invent file contents or command output — spawn_agent for ground-truth results.
4. For sensitive or large responses, use save_draft first.
5. Persist useful facts with save_memory after every meaningful exchange.
6. Be concise in direct replies; rich in sub-agent task descriptions.
`;

// ── Tool definitions passed to the Anthropic API ─────────────────────────────

const BOOP_TOOLS = [
  {
    name: 'recall_memory',
    description: 'Search Lumina long-term memory for relevant context about the user, their projects, or preferences.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'Search query keywords' },
      },
      required: ['query'],
    },
  },
  {
    name: 'save_memory',
    description: 'Persist a new fact into Lumina long-term memory.',
    input_schema: {
      type: 'object' as const,
      properties: {
        content: { type: 'string', description: 'The fact or preference to remember' },
        tier: { type: 'string', enum: ['short', 'long', 'permanent'] },
        segment: {
          type: 'string',
          enum: ['identity', 'preference', 'correction', 'relationship', 'project', 'knowledge', 'context'],
        },
      },
      required: ['content', 'tier', 'segment'],
    },
  },
  {
    name: 'spawn_agent',
    description: 'Delegate a complex task (file operations, code, web browsing) to an Execution Agent running in the background.',
    input_schema: {
      type: 'object' as const,
      properties: {
        name: { type: 'string', description: 'Short descriptive name for this sub-agent task' },
        task: { type: 'string', description: 'Detailed task description with all required context' },
        integrations: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of integration keys the agent may use (e.g. "github", "gmail")',
        },
      },
      required: ['name', 'task'],
    },
  },
  {
    name: 'save_draft',
    description: 'Buffer a response for user review before sending. Returns a draft ID.',
    input_schema: {
      type: 'object' as const,
      properties: {
        content: { type: 'string', description: 'Draft content to buffer' },
      },
      required: ['content'],
    },
  },
  {
    name: 'get_active_agents',
    description: 'List currently running or recently completed sub-agents.',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'create_automation',
    description: 'Register a recurring cron automation to run a task on a schedule.',
    input_schema: {
      type: 'object' as const,
      properties: {
        name: { type: 'string' },
        task: { type: 'string' },
        schedule: { type: 'string', description: 'Cron expression (e.g. "0 9 * * *" for daily 9am)' },
        timezone: { type: 'string', description: 'IANA timezone (e.g. "America/New_York")' },
        integrations: { type: 'array', items: { type: 'string' } },
      },
      required: ['name', 'task', 'schedule'],
    },
  },
] as const;

// ── Tool execution ────────────────────────────────────────────────────────────

async function executeBoopTool(
  toolName: string,
  toolInput: Record<string, any>,
  convex: ConvexClient,
  conversationId: string
): Promise<string> {
  try {
    switch (toolName) {
      case 'recall_memory': {
        const memories = await convex.query(api.memory.search, {
          query: toolInput.query as string,
          limit: 15,
        });
        if (!memories || memories.length === 0) return 'No relevant memories found.';
        return memories
          .map((m: any) => `[${m.tier}/${m.segment}] ${m.content}`)
          .join('\n');
      }

      case 'save_memory': {
        const memoryId = `mem_${uuidv4().replace(/-/g, '').slice(0, 16)}`;
        await convex.mutation(api.memory.create, {
          memoryId,
          content: toolInput.content as string,
          tier: toolInput.tier as 'short' | 'long' | 'permanent',
          segment: toolInput.segment as any,
          source: 'interaction-agent',
        });
        return `Memory saved (ID: ${memoryId})`;
      }

      case 'spawn_agent': {
        // Import lazily to avoid circular deps
        const { runExecutionAgent } = await import('./execution-agent.js');
        const agentId = `agent_${uuidv4().replace(/-/g, '').slice(0, 12)}`;
        // Fire and forget — result will be posted back via events
        runExecutionAgent({
          agentId,
          name: toolInput.name as string,
          task: toolInput.task as string,
          integrations: (toolInput.integrations as string[]) ?? [],
          conversationId,
        }).catch(err => console.error('[Boop] spawn_agent error:', err));
        return `Agent "${toolInput.name}" spawned (ID: ${agentId}). I'll update you when it completes.`;
      }

      case 'save_draft': {
        const draftId = `draft_${Date.now()}`;
        // Store draft in a simple in-memory registry (could be persisted to Convex)
        DraftRegistry.set(draftId, toolInput.content as string);
        return `Draft saved (ID: ${draftId}). Confirm delivery with "send draft ${draftId}".`;
      }

      case 'get_active_agents': {
        const agents = await convex.query(api.agents.list, { limit: 10 });
        if (!agents || agents.length === 0) return 'No active agents.';
        return agents
          .map((a: any) => `• [${a.status}] ${a.name} (${a.agentId}) — ${a.task.slice(0, 60)}…`)
          .join('\n');
      }

      case 'create_automation': {
        const automationId = `auto_${uuidv4().replace(/-/g, '').slice(0, 12)}`;
        await convex.mutation(api.automations.create, {
          automationId,
          name: toolInput.name as string,
          task: toolInput.task as string,
          schedule: toolInput.schedule as string,
          timezone: toolInput.timezone as string | undefined,
          integrations: (toolInput.integrations as string[]) ?? [],
        });
        return `Automation "${toolInput.name}" created (ID: ${automationId}), schedule: "${toolInput.schedule}".`;
      }

      default:
        return `Unknown tool: ${toolName}`;
    }
  } catch (err: any) {
    console.error(`[Boop] Tool "${toolName}" error:`, err);
    return `Tool error: ${err.message ?? String(err)}`;
  }
}

// ── Draft registry (in-memory, session-scoped) ────────────────────────────────

const DraftRegistry = new Map<string, string>();

export function getDraft(draftId: string): string | undefined {
  return DraftRegistry.get(draftId);
}
export function deleteDraft(draftId: string): void {
  DraftRegistry.delete(draftId);
}

// ── Main entry point ──────────────────────────────────────────────────────────

/**
 * Handle a single user message through the Boop dispatcher loop.
 * Runs tool calls iteratively until the model returns a plain text reply.
 */
export async function handleUserMessage(msg: UserMessage): Promise<AgentResponse> {
  const convex = getConvexClient();
  const conversationId = msg.conversationId ?? `conv_${uuidv4().slice(0, 8)}`;

  // Build initial message array
  const messages: { role: 'user' | 'assistant'; content: any }[] = [
    { role: 'user', content: msg.content },
  ];

  let finalReply = '';
  let spawnedAgentId: string | undefined;
  const MAX_TURNS = 8;

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    let response: any;
    try {
      response = await chatCompletion(messages as any, {
        model: DEFAULT_AGENT_MODEL,
        maxTokens: 4096,
        systemPrompt: BOOP_SYSTEM_PROMPT,
        tools: BOOP_TOOLS as any,
      });
    } catch (err: any) {
      console.error('[Boop] LLM error:', err);
      let replyMessage = `I encountered an error: ${err.message}`;
      const errMsg = String(err.message || '').toLowerCase();
      const errStatus = err.status || (err.response && err.response.status);
      
      if (errStatus === 404 || errMsg.includes('404') || errMsg.includes('not found')) {
        replyMessage = `⚠️ **LLM Routing Error (404 Not Found)**\n\nThe LLM proxy could not route this request because the mapped model endpoint is invalid or returned a 404.\n\n**How to fix:**\n1. Open the **Lumina Agent Panel** in your browser.\n2. Go to **Settings** -> **Anthropic Proxy**.\n3. Verify that the mapping for **sonnet** is configured correctly and points to a working LLM provider endpoint. If you recently configured Gemini or another provider, make sure to save the mapping in the Anthropic Proxy tab.`;
      } else if (errMsg.includes('econnrefused') || errMsg.includes('connection refused') || errMsg.includes('fetch failed')) {
        replyMessage = `⚠️ **LLM Connection Refused**\n\nThe LLM proxy failed to connect to the configured endpoint.\n\n**How to fix:**\n1. Ensure your local LLM service (e.g. Ollama or LM Studio) is running.\n2. Go to **Settings** -> **Anthropic Proxy** and check if the endpoint host/port is correct.`;
      }
      
      return { reply: replyMessage };
    }

    // If the model is done — extract text reply
    if (response.stop_reason === 'end_turn') {
      const textBlocks = (response.content ?? []).filter((b: any) => b.type === 'text');
      finalReply = textBlocks.map((b: any) => b.text).join('\n');
      break;
    }

    // Process tool use blocks
    const toolUseBlocks = (response.content ?? []).filter((b: any) => b.type === 'tool_use');
    if (toolUseBlocks.length === 0) {
      // Fallback — get any text
      const textBlocks = (response.content ?? []).filter((b: any) => b.type === 'text');
      finalReply = textBlocks.map((b: any) => b.text).join('\n');
      break;
    }

    // Push assistant's tool-use turn
    messages.push({ role: 'assistant', content: response.content });

    // Execute all tool calls and collect results
    const toolResults: any[] = [];
    for (const toolBlock of toolUseBlocks) {
      const result = await executeBoopTool(
        toolBlock.name,
        toolBlock.input ?? {},
        convex,
        conversationId
      );
      if (toolBlock.name === 'spawn_agent') {
        const match = result.match(/ID: (agent_[a-z0-9]+)/);
        if (match) spawnedAgentId = match[1];
      }
      toolResults.push({
        type: 'tool_result',
        tool_use_id: toolBlock.id,
        content: result,
      });
    }

    // Push tool results for next turn
    messages.push({ role: 'user', content: toolResults });
  }

  if (!finalReply) finalReply = "I've completed the requested actions.";

  return {
    reply: finalReply,
    agentId: spawnedAgentId,
    spawned: !!spawnedAgentId,
  };
}
