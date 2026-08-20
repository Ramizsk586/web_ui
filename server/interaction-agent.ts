import { v4 as uuidv4 } from "uuid";
import { chatCompletion, DEFAULT_AGENT_MODEL } from "./bridge-client.js";
import { broadcast } from "./broadcast.js";

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
  switch (toolName) {
    case "recall_memory":
      return { result: "No relevant memories found." };
    case "save_memory":
      return { result: `Memory saved.` };
    case "update_memory":
      return { result: `Memory updated.` };
    case "delete_memory":
      return { result: `Memory deleted.` };
    case "spawn_agent":
      return { result: `Task dispatched: ${toolInput.task || ''}` };
    case "create_automation":
      return { result: `Automation created.` };
    default:
      return { result: `Unknown tool: ${toolName}` };
  }
}

export async function handleUserMessage(msg: UserMessage): Promise<AgentResponse> {
  const conversationId = msg.conversationId ?? `conv_${uuidv4().slice(0, 8)}`;
  broadcast("user_message", { conversationId, content: msg.content });

  const response: any = await chatCompletion([
    { role: "user", content: msg.content }
  ] as any, {
    model: DEFAULT_AGENT_MODEL,
    maxTokens: 4096,
    systemPrompt: SYSTEM_PROMPT,
  });

  const textBlocks = (response.content ?? []).filter((block: any) => block.type === "text");
  const reply = textBlocks.map((block: any) => block.text).join("\n").trim() || "OK";

  return { reply };
}
