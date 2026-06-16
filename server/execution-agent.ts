import * as fs from "fs";
import * as path from "path";
import { v4 as uuidv4 } from "uuid";
import { chatCompletion, DEFAULT_AGENT_MODEL } from "./bridge-client.js";
import { getConvexClient } from "./convex-client.js";
import { api } from "../convex/_generated/api.js";
import { deliverToTelegram } from "./telegram-delivery.js";
import { broadcast } from "./broadcast.js";

export interface ExecutionAgentOptions {
  agentId: string;
  name: string;
  task: string;
  integrations: string[];
  conversationId?: string;
  telegramChatId?: number;
}

export interface SpawnOptions {
  task: string;
  integrations: string[];
  conversationId?: string;
  name?: string;
}

export interface SpawnResult {
  agentId: string;
  result: string;
  status: "completed" | "failed" | "cancelled";
}

const activeAgents = new Set<string>();

const EXECUTION_SYSTEM_PROMPT = `You are a focused execution agent inside Lumina.

Your role:
- Complete the delegated task end to end.
- Use read-only workspace and web tools when needed.
- Do not directly perform destructive or mutating actions.
- If the task implies a code or file change, inspect first and summarize clearly.
`;

const EXECUTION_TOOLS = [
  {
    name: "read_file",
    description: "Read a file from disk.",
    input_schema: {
      type: "object" as const,
      properties: { path: { type: "string" } },
      required: ["path"],
    },
  },
  {
    name: "glob_tool",
    description: "List files matching a path fragment or extension.",
    input_schema: {
      type: "object" as const,
      properties: {
        pattern: { type: "string" },
      },
      required: ["pattern"],
    },
  },
  {
    name: "grep_tool",
    description: "Search file contents for a pattern.",
    input_schema: {
      type: "object" as const,
      properties: {
        pattern: { type: "string" },
        directory: { type: "string" },
      },
      required: ["pattern"],
    },
  },
  {
    name: "run_command",
    description: "Run a read-only shell command.",
    input_schema: {
      type: "object" as const,
      properties: {
        command: { type: "string" },
        cwd: { type: "string" },
      },
      required: ["command"],
    },
  },
  {
    name: "web_scrape",
    description: "Fetch a web page and extract text.",
    input_schema: {
      type: "object" as const,
      properties: {
        url: { type: "string" },
      },
      required: ["url"],
    },
  },
] as const;

const BLOCKED_COMMANDS = ["rm ", "rmdir", "git push", "git reset", "del ", "curl -x", "wget "];

function safeRead(filePath: string): string {
  const resolved = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(resolved)) {
    return `File not found: ${resolved}`;
  }
  return fs.readFileSync(resolved, "utf8").slice(0, 12000);
}

async function executeTool(
  toolName: string,
  toolInput: Record<string, any>,
  agentId: string,
): Promise<string> {
  const convex = getConvexClient();
  await convex.mutation(api.agents.addLog, {
    agentId,
    logType: "tool_use",
    toolName,
    content: JSON.stringify(toolInput).slice(0, 1000),
  });

  try {
    switch (toolName) {
      case "read_file":
        return safeRead(String(toolInput.path || ""));

      case "glob_tool": {
        const pattern = String(toolInput.pattern || "").toLowerCase();
        const results: string[] = [];
        const walk = (dir: string) => {
          for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            if (entry.name === "node_modules" || entry.name === ".git" || entry.name === "dist") continue;
            const full = path.join(dir, entry.name);
            const relative = path.relative(process.cwd(), full).replace(/\\/g, "/");
            if (entry.isDirectory()) {
              walk(full);
            } else if (relative.toLowerCase().includes(pattern.replace(/\*/g, ""))) {
              results.push(relative);
            }
            if (results.length >= 100) return;
          }
        };
        walk(process.cwd());
        return results.length ? results.join("\n") : "No files matched.";
      }

      case "grep_tool": {
        const pattern = String(toolInput.pattern || "").toLowerCase();
        const directory = path.resolve(process.cwd(), String(toolInput.directory || "."));
        const matches: string[] = [];
        const walk = (dir: string) => {
          for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            if (entry.name === "node_modules" || entry.name === ".git" || entry.name === "dist") continue;
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) {
              walk(full);
            } else {
              try {
                const content = fs.readFileSync(full, "utf8");
                const lines = content.split(/\r?\n/);
                lines.forEach((line, index) => {
                  if (line.toLowerCase().includes(pattern) && matches.length < 100) {
                    matches.push(`${path.relative(process.cwd(), full)}:${index + 1}:${line.trim()}`);
                  }
                });
              } catch {
                // Ignore non-text files.
              }
            }
            if (matches.length >= 100) return;
          }
        };
        walk(directory);
        return matches.length ? matches.join("\n") : "No matches found.";
      }

      case "run_command": {
        const command = String(toolInput.command || "");
        const lower = command.toLowerCase();
        if (BLOCKED_COMMANDS.some((blocked) => lower.includes(blocked))) {
          return "Blocked potentially mutating command.";
        }
        const { execSync } = await import("child_process");
        return execSync(command, {
          cwd: toolInput.cwd ? path.resolve(process.cwd(), String(toolInput.cwd)) : process.cwd(),
          encoding: "utf8",
          timeout: 30000,
        }).slice(0, 12000);
      }

      case "web_scrape": {
        const response = await fetch(String(toolInput.url || ""), {
          headers: { "User-Agent": "Lumina-Agent/1.0" },
          signal: AbortSignal.timeout(20000),
        });
        const text = await response.text();
        return text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 12000);
      }

      default:
        return `Unknown tool: ${toolName}`;
    }
  } catch (error: any) {
    const message = `Tool "${toolName}" failed: ${error?.message || String(error)}`;
    await convex.mutation(api.agents.addLog, {
      agentId,
      logType: "error",
      toolName,
      content: message,
    });
    return message;
  }
}

export async function runExecutionAgent(opts: ExecutionAgentOptions): Promise<string> {
  const convex = getConvexClient();

  await convex.mutation(api.agents.create, {
    agentId: opts.agentId,
    name: opts.name,
    task: opts.task,
    integrations: opts.integrations,
    conversationId: opts.conversationId,
  });
  await convex.mutation(api.agents.update, {
    agentId: opts.agentId,
    status: "running",
  });

  activeAgents.add(opts.agentId);
  broadcast("agent_spawned", {
    agentId: opts.agentId,
    name: opts.name,
    task: opts.task,
  });

  const messages: Array<{ role: "user" | "assistant"; content: any }> = [
    {
      role: "user",
      content: opts.task,
    },
  ];

  let finalResult = "";

  try {
    for (let turn = 0; turn < 10; turn += 1) {
      if (!activeAgents.has(opts.agentId)) {
        finalResult = "Agent was cancelled.";
        break;
      }

      const response: any = await chatCompletion(messages as any, {
        model: DEFAULT_AGENT_MODEL,
        maxTokens: 4096,
        systemPrompt: EXECUTION_SYSTEM_PROMPT,
        tools: EXECUTION_TOOLS as any,
      });

      const textBlocks = (response.content ?? []).filter((block: any) => block.type === "text");
      for (const block of textBlocks) {
        await convex.mutation(api.agents.addLog, {
          agentId: opts.agentId,
          logType: "text",
          content: block.text,
        });
      }

      const toolUseBlocks = (response.content ?? []).filter((block: any) => block.type === "tool_use");
      if (response.stop_reason === "end_turn" || toolUseBlocks.length === 0) {
        finalResult = textBlocks.map((block: any) => block.text).join("\n").trim() || "Task completed.";
        break;
      }

      messages.push({ role: "assistant", content: response.content });
      const toolResults = [];
      for (const toolBlock of toolUseBlocks) {
        const result = await executeTool(toolBlock.name, toolBlock.input ?? {}, opts.agentId);
        await convex.mutation(api.agents.addLog, {
          agentId: opts.agentId,
          logType: "tool_result",
          toolName: toolBlock.name,
          content: result.slice(0, 2000),
        });
        broadcast("agent_tool", {
          agentId: opts.agentId,
          toolName: toolBlock.name,
        });
        toolResults.push({
          type: "tool_result",
          tool_use_id: toolBlock.id,
          content: result,
        });
      }
      messages.push({ role: "user", content: toolResults });
    }

    await convex.mutation(api.agents.update, {
      agentId: opts.agentId,
      status: "completed",
      result: finalResult.slice(0, 4000),
      completedAt: Date.now(),
    });
    broadcast("agent_done", {
      agentId: opts.agentId,
      status: "completed",
      result: finalResult.slice(0, 500),
    });
  } catch (error: any) {
    finalResult = `Agent failed: ${error?.message || String(error)}`;
    await convex.mutation(api.agents.update, {
      agentId: opts.agentId,
      status: "failed",
      error: finalResult,
      completedAt: Date.now(),
    });
    broadcast("agent_done", {
      agentId: opts.agentId,
      status: "failed",
      result: finalResult,
    });
  } finally {
    activeAgents.delete(opts.agentId);
  }

  if (opts.telegramChatId) {
    await deliverToTelegram(opts.telegramChatId, finalResult.slice(0, 3500) || "Task completed.");
  }

  return finalResult || "Task completed.";
}

export async function spawnExecutionAgent(opts: SpawnOptions): Promise<SpawnResult> {
  const agentId = `agent_${uuidv4().replace(/-/g, "").slice(0, 12)}`;
  const result = await runExecutionAgent({
    agentId,
    name: opts.name ?? (opts.integrations.join("+") || "general"),
    task: opts.task,
    integrations: opts.integrations,
    conversationId: opts.conversationId,
  });
  const convex = getConvexClient();
  const agent = await convex.query(api.agents.get, { agentId });
  const status = (agent?.status ?? "completed") as "completed" | "failed" | "cancelled";
  return { agentId, result, status };
}

export function cancelAgent(agentId: string): void {
  activeAgents.delete(agentId);
}

export function availableIntegrations(): string[] {
  return ["filesystem", "shell", "web"];
}
