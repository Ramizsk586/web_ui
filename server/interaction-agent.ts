import { v4 as uuidv4 } from "uuid";
import { chatCompletion, DEFAULT_AGENT_MODEL } from "./bridge-client.js";
import { getConvexClient } from "./convex-client.js";
import { api } from "../convex/_generated/api.js";
import { broadcast } from "./broadcast.js";
import { spawnExecutionAgent, availableIntegrations } from "./execution-agent.js";

export interface UserMessage {
  content: string;
  userId?: string;
  conversationId?: string;
  telegramChatId?: number;
  source?: "web" | "telegram" | "automation";
}

export interface AgentResponse {
  reply: string;
  agentId?: string;
  spawned?: boolean;
  draft?: boolean;
}

const SYSTEM_PROMPT = `You are Boop, the personal dispatcher for Lumina.

You are a dispatcher, not the tool-using worker.

Rules:
- Reply directly only for simple conversational turns.
- If the user needs research, file/code work, tool use, multi-step execution, or current factual lookup, call spawn_agent.
- Before claiming anything about the user's stored preferences or history, call recall_memory first.
- Save durable user facts with save_memory.
- If the user asks to schedule recurring work, call create_automation.
- Keep final replies concise and friendly.
`;

const BOOP_TOOLS = [
  {
    name: "recall_memory",
    description: "Search saved memory for relevant context. Returns matched memories along with their unique ID, tier, and segment.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: { type: "string" },
      },
      required: ["query"],
    },
  },
  {
    name: "save_memory",
    description: "Persist a durable fact about the user or their work.",
    input_schema: {
      type: "object" as const,
      properties: {
        content: { type: "string" },
        tier: { type: "string", enum: ["short", "long", "permanent"] },
        segment: {
          type: "string",
          enum: ["identity", "preference", "correction", "relationship", "project", "knowledge", "context"],
        },
      },
      required: ["content", "tier", "segment"],
    },
  },
  {
    name: "update_memory",
    description: "Update the content, tier, or segment of an existing memory by its ID.",
    input_schema: {
      type: "object" as const,
      properties: {
        memoryId: { type: "string", description: "The unique ID of the memory to update (e.g. mem_xxx)." },
        content: { type: "string", description: "The new updated fact content." },
        tier: { type: "string", enum: ["short", "long", "permanent"] },
        segment: {
          type: "string",
          enum: ["identity", "preference", "correction", "relationship", "project", "knowledge", "context"],
        },
      },
      required: ["memoryId"],
    },
  },
  {
    name: "delete_memory",
    description: "Delete an existing memory by its ID.",
    input_schema: {
      type: "object" as const,
      properties: {
        memoryId: { type: "string", description: "The unique ID of the memory to delete (e.g. mem_xxx)." },
      },
      required: ["memoryId"],
    },
  },
  {
    name: "spawn_agent",
    description: "Delegate a task that needs tools, research, or execution.",
    input_schema: {
      type: "object" as const,
      properties: {
        name: { type: "string" },
        task: { type: "string" },
        integrations: {
          type: "array",
          items: { type: "string" },
          description: "List of integrations to spawn the agent with. Choose from the available integrations listed in the system prompt."
        },
      },
      required: ["name", "task"],
    },
  },
  {
    name: "create_automation",
    description: "Register a recurring scheduled task.",
    input_schema: {
      type: "object" as const,
      properties: {
        name: { type: "string" },
        task: { type: "string" },
        schedule: { type: "string" },
        timezone: { type: "string" },
        integrations: {
          type: "array",
          items: { type: "string" },
          description: "List of integrations to spawn the agent with. Choose from the available integrations listed in the system prompt."
        },
      },
      required: ["name", "task", "schedule"],
    },
  },
] as const;

async function executeTool(
  toolName: string,
  toolInput: Record<string, any>,
  conversationId: string,
): Promise<{ result: string; agentId?: string }> {
  const convex = getConvexClient();

  switch (toolName) {
    case "recall_memory": {
      const memories = (await convex.query(api.memory.search, {
        query: String(toolInput.query || ""),
        limit: 15,
      })) ?? [];
      if (!memories.length) {
        return { result: "No relevant memories found." };
      }
      return {
        result: memories
          .map((m: any) => `[ID: ${m.memoryId}] [${m.tier}/${m.segment}] ${m.content}`)
          .join("\n"),
      };
    }

    case "save_memory": {
      const memoryId = `mem_${uuidv4().replace(/-/g, "").slice(0, 16)}`;
      await convex.mutation(api.memory.create, {
        memoryId,
        content: String(toolInput.content || ""),
        tier: toolInput.tier,
        segment: toolInput.segment,
        source: "interaction-agent",
      });
      return { result: `Memory saved (${memoryId}).` };
    }

    case "update_memory": {
      await convex.mutation(api.memory.update, {
        memoryId: String(toolInput.memoryId),
        content: toolInput.content ? String(toolInput.content) : undefined,
        tier: toolInput.tier,
        segment: toolInput.segment,
      });
      return { result: `Memory ${toolInput.memoryId} updated.` };
    }

    case "delete_memory": {
      await convex.mutation(api.memory.remove, {
        memoryId: String(toolInput.memoryId),
      });
      return { result: `Memory ${toolInput.memoryId} deleted.` };
    }

    case "spawn_agent": {
      const spawned = await spawnExecutionAgent({
        task: String(toolInput.task || ""),
        integrations: Array.isArray(toolInput.integrations) ? toolInput.integrations : [],
        conversationId,
        name: String(toolInput.name || "general"),
      });
      return {
        result: spawned.result,
        agentId: spawned.agentId,
      };
    }

    case "create_automation": {
      const automationId = `auto_${uuidv4().replace(/-/g, "").slice(0, 12)}`;
      await convex.mutation(api.automations.create, {
        automationId,
        name: String(toolInput.name || "automation"),
        task: String(toolInput.task || ""),
        schedule: String(toolInput.schedule || ""),
        timezone: typeof toolInput.timezone === "string" ? toolInput.timezone : undefined,
        integrations: Array.isArray(toolInput.integrations) ? toolInput.integrations : [],
      });
      return { result: `Automation created (${automationId}).` };
    }

    default:
      return { result: `Unknown tool: ${toolName}` };
  }
}

export async function handleUserMessage(msg: UserMessage): Promise<AgentResponse> {
  const convex = getConvexClient();
  const conversationId = msg.conversationId ?? `conv_${uuidv4().slice(0, 8)}`;
  const turnId = `turn_${uuidv4().replace(/-/g, "").slice(0, 12)}`;

  await convex.mutation(api.messages.send, {
    conversationId,
    role: "user",
    content: msg.content,
    turnId,
  });
  broadcast("user_message", { conversationId, content: msg.content });

  const prior = (await convex.query(api.messages.recent, {
    conversationId,
    limit: 10,
  })) ?? [];

  const promptHistory = prior
    .slice(0, -1)
    .map((entry: any) => `${String(entry.role).toUpperCase()}: ${entry.content}`)
    .join("\n");

  const tools = BOOP_TOOLS as any;
  const messages: Array<{ role: "user" | "assistant"; content: any }> = [
    {
      role: "user",
      content: promptHistory
        ? `Prior turns:\n${promptHistory}\n\nCurrent message:\n${msg.content}`
        : msg.content,
    },
  ];

  let finalReply = "";
  let spawnedAgentId: string | undefined;

  for (let turn = 0; turn < 8; turn += 1) {
    const response: any = await chatCompletion(messages as any, {
      model: DEFAULT_AGENT_MODEL,
      maxTokens: 4096,
      systemPrompt: `${SYSTEM_PROMPT}\nAvailable integrations: ${availableIntegrations().join(", ") || "(none)"}`,
      tools,
    });

    const textBlocks = (response.content ?? []).filter((block: any) => block.type === "text");
    const toolUseBlocks = (response.content ?? []).filter((block: any) => block.type === "tool_use");

    if (response.stop_reason === "end_turn" || toolUseBlocks.length === 0) {
      finalReply = textBlocks.map((block: any) => block.text).join("\n").trim();
      break;
    }

    messages.push({ role: "assistant", content: response.content });

    const toolResults = [];
    for (const toolBlock of toolUseBlocks) {
      const outcome = await executeTool(toolBlock.name, toolBlock.input ?? {}, conversationId);
      if (toolBlock.name === "spawn_agent" && outcome.agentId) {
        spawnedAgentId = outcome.agentId;
      }
      toolResults.push({
        type: "tool_result",
        tool_use_id: toolBlock.id,
        content: outcome.result,
      });
    }

    messages.push({ role: "user", content: toolResults });
  }

  if (!finalReply) {
    finalReply = spawnedAgentId
      ? "I handed that off and the agent is working on it."
      : "I completed that request.";
  }

  await convex.mutation(api.messages.send, {
    conversationId,
    role: "assistant",
    content: finalReply,
    turnId,
    agentId: spawnedAgentId,
  });
  broadcast("assistant_message", { conversationId, content: finalReply, agentId: spawnedAgentId });

  return {
    reply: finalReply,
    agentId: spawnedAgentId,
    spawned: Boolean(spawnedAgentId),
  };
}
