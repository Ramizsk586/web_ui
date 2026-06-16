import * as fs from "fs";
import * as path from "path";
import { v4 as uuidv4 } from "uuid";
import { configureBridgeEnvironment, DEFAULT_AGENT_MODEL } from "./bridge-client.js";
import { getConvexClient } from "./convex-client.js";
import { api } from "../convex/_generated/api.js";
import { deliverToTelegram } from "./telegram-delivery.js";
import { broadcast } from "./broadcast.js";
import { query, createSdkMcpServer, tool, type SDKMessage } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";

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

export interface UsageTotals {
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
  costUsd: number;
}

export const EMPTY_USAGE: UsageTotals = {
  model: "unknown",
  inputTokens: 0,
  outputTokens: 0,
  cacheReadTokens: 0,
  cacheCreationTokens: 0,
  costUsd: 0,
};

const activeAgents = new Map<string, AbortController>();

const EXECUTION_SYSTEM_PROMPT = `You are a focused execution agent inside Lumina.

Your role:
- Complete the delegated task end to end.
- Use your tools to investigate and act.
- Return a concise, well-structured answer.
`;

const BLOCKED_COMMANDS = ["rm ", "rmdir", "git push", "git reset", "del ", "curl -x", "wget "];

function safeRead(filePath: string): string {
  const resolved = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(resolved)) {
    return `File not found: ${resolved}`;
  }
  return fs.readFileSync(resolved, "utf8").slice(0, 12000);
}

function mcpText(text: string) {
  return {
    content: [{ type: "text" as const, text }],
  };
}

export function createLuminaCoreMcp() {
  return createSdkMcpServer({
    name: "lumina-core-tools",
    version: "0.1.0",
    tools: [
      tool(
        "read_file",
        "Read a file from disk.",
        { path: z.string().describe("Absolute or relative file path.") },
        async (args) => {
          return mcpText(safeRead(args.path));
        }
      ),
      tool(
        "glob_tool",
        "List files matching a pattern.",
        { pattern: z.string().describe("Filename pattern fragment to match.") },
        async (args) => {
          const pattern = args.pattern.toLowerCase();
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
          return mcpText(results.length ? results.join("\n") : "No files matched.");
        }
      ),
      tool(
        "grep_tool",
        "Search file contents for a pattern.",
        {
          pattern: z.string().describe("Pattern to search for in lines."),
          directory: z.string().optional().describe("Directory to search in. Defaults to current working directory."),
        },
        async (args) => {
          const pattern = args.pattern.toLowerCase();
          const directory = path.resolve(process.cwd(), args.directory || ".");
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
                  // ignore
                }
              }
              if (matches.length >= 100) return;
            }
          };
          walk(directory);
          return mcpText(matches.length ? matches.join("\n") : "No matches found.");
        }
      ),
      tool(
        "run_command",
        "Run a read-only shell command.",
        {
          command: z.string().describe("Shell command to run."),
          cwd: z.string().optional().describe("Working directory for the command."),
        },
        async (args) => {
          const lower = args.command.toLowerCase();
          if (BLOCKED_COMMANDS.some((blocked) => lower.includes(blocked))) {
            return mcpText("Blocked potentially mutating command.");
          }
          const { execSync } = await import("child_process");
          try {
            const out = execSync(args.command, {
              cwd: args.cwd ? path.resolve(process.cwd(), args.cwd) : process.cwd(),
              encoding: "utf8",
              timeout: 30000,
            });
            return mcpText(out.slice(0, 12000));
          } catch (e: any) {
            return mcpText(`Command failed: ${e.message}`);
          }
        }
      ),
      tool(
        "web_scrape",
        "Fetch a web page and extract text.",
        { url: z.string().describe("URL to fetch.") },
        async (args) => {
          try {
            const response = await fetch(args.url, {
              headers: { "User-Agent": "Lumina-Agent/1.0" },
              signal: AbortSignal.timeout(20000),
            });
            const text = await response.text();
            const cleaned = text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 12000);
            return mcpText(cleaned);
          } catch (e: any) {
            return mcpText(`Web fetch failed: ${e.message}`);
          }
        }
      ),
    ],
  });
}

function aggregateUsageFromResult(
  msg: Extract<SDKMessage, { type: "result" }>,
  requestedModel?: string,
): UsageTotals {
  const modelUsage = (msg as any).modelUsage ?? {};

  let inputTokens = 0;
  let outputTokens = 0;
  let cacheReadTokens = 0;
  let cacheCreationTokens = 0;
  let fallbackModel = "";
  let fallbackTotal = 0;

  for (const [model, u] of Object.entries(modelUsage)) {
    const data = u as {
      inputTokens?: number;
      outputTokens?: number;
      cacheReadInputTokens?: number;
      cacheCreationInputTokens?: number;
    };
    const inT = data.inputTokens ?? 0;
    const outT = data.outputTokens ?? 0;
    inputTokens += inT;
    outputTokens += outT;
    cacheReadTokens += data.cacheReadInputTokens ?? 0;
    cacheCreationTokens += data.cacheCreationInputTokens ?? 0;
    const total = inT + outT;
    if (total > fallbackTotal) {
      fallbackTotal = total;
      fallbackModel = model;
    }
  }

  let reportedModel = fallbackModel || requestedModel || "unknown";

  return {
    model: reportedModel,
    inputTokens,
    outputTokens,
    cacheReadTokens,
    cacheCreationTokens,
    costUsd: msg.total_cost_usd ?? 0,
  };
}

export async function runExecutionAgent(opts: ExecutionAgentOptions): Promise<string> {
  configureBridgeEnvironment();
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

  const abort = new AbortController();
  activeAgents.set(opts.agentId, abort);
  broadcast("agent_spawned", {
    agentId: opts.agentId,
    name: opts.name,
    task: opts.task,
  });

  const mcpServers: Record<string, any> = {
    "lumina-core-tools": createLuminaCoreMcp(),
  };

  const allowedTools = [
    "mcp__lumina-core-tools__*",
  ];

  let buffer = "";
  let usage: UsageTotals = { ...EMPTY_USAGE };
  let status: "completed" | "failed" | "cancelled" = "completed";
  let finalResult = "";

  try {
    for await (const msg of query({
      prompt: opts.task,
      options: {
        systemPrompt: EXECUTION_SYSTEM_PROMPT,
        model: DEFAULT_AGENT_MODEL,
        mcpServers,
        allowedTools,
        settingSources: ["project"],
        permissionMode: "bypassPermissions",
        abortController: abort,
      },
    })) {
      if (abort.signal.aborted) {
        status = "cancelled";
        break;
      }

      if (msg.type === "assistant") {
        for (const block of msg.message.content) {
          if (block.type === "text") {
            buffer += block.text;
            await convex.mutation(api.agents.addLog, {
              agentId: opts.agentId,
              logType: "text",
              content: block.text,
            });
          } else if (block.type === "tool_use") {
            await convex.mutation(api.agents.addLog, {
              agentId: opts.agentId,
              logType: "tool_use",
              toolName: block.name,
              content: JSON.stringify(block.input).slice(0, 2000),
            });
            broadcast("agent_tool", { agentId: opts.agentId, toolName: block.name });
          }
        }
      } else if (msg.type === "user") {
        for (const block of msg.message.content) {
          if (typeof block !== "string" && block.type === "tool_result") {
            const text = Array.isArray(block.content)
              ? block.content
                  .map((c: { type: string; text?: string }) => (c.type === "text" ? (c.text ?? "") : ""))
                  .join("")
              : String(block.content ?? "");
            await convex.mutation(api.agents.addLog, {
              agentId: opts.agentId,
              logType: "tool_result",
              content: text.slice(0, 2000),
            });
          }
        }
      } else if (msg.type === "result") {
        usage = aggregateUsageFromResult(msg, DEFAULT_AGENT_MODEL);
      }
    }

    if (abort.signal.aborted) {
      status = "cancelled";
    }

    if (status === "cancelled") {
      finalResult = "Agent was cancelled.";
      await convex.mutation(api.agents.update, {
        agentId: opts.agentId,
        status: "cancelled",
        error: "Cancelled by user.",
        completedAt: Date.now(),
      });
      broadcast("agent_done", {
        agentId: opts.agentId,
        status: "cancelled",
        result: "",
      });
    } else {
      finalResult = buffer.trim() || "Task completed.";
      await convex.mutation(api.agents.update, {
        agentId: opts.agentId,
        status: "completed",
        result: finalResult.slice(0, 4000),
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        cacheReadTokens: usage.cacheReadTokens,
        cacheCreationTokens: usage.cacheCreationTokens,
        costUsd: usage.costUsd,
        completedAt: Date.now(),
      });
      broadcast("agent_done", {
        agentId: opts.agentId,
        status: "completed",
        result: finalResult.slice(0, 500),
      });
    }
  } catch (error: any) {
    status = abort.signal.aborted ? "cancelled" : "failed";
    finalResult = `Agent failed: ${error?.message || String(error)}`;
    await convex.mutation(api.agents.addLog, {
      agentId: opts.agentId,
      logType: "error",
      content: finalResult,
    });
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

export function cancelAgent(agentId: string): boolean {
  const abort = activeAgents.get(agentId);
  if (abort) {
    abort.abort();
    activeAgents.delete(agentId);
    return true;
  }
  return false;
}

export async function cancelAgentWork(agentId: string): Promise<boolean> {
  const aborted = cancelAgent(agentId);
  const convex = getConvexClient();
  const updated = await convex.mutation(api.agents.update, {
    agentId,
    status: "cancelled",
    error: "Cancelled by user.",
  });
  if (updated) {
    await convex.mutation(api.agents.addLog, {
      agentId,
      logType: "error",
      content: "Cancelled by user.",
    });
    broadcast("agent_done", { agentId, status: "cancelled", result: "" });
  }
  return aborted || Boolean(updated);
}

export async function deleteAgentWork(agentId: string): Promise<{ deleted: number }> {
  cancelAgent(agentId);
  const convex = getConvexClient();
  return await convex.mutation(api.agents.remove, { agentId });
}

export async function cleanupFinishedAgentWork(): Promise<{ deleted: number }> {
  const convex = getConvexClient();
  return await convex.mutation(api.agents.cleanupFinished, { limit: 500 });
}

export async function retryAgent(agentId: string): Promise<SpawnResult | null> {
  const convex = getConvexClient();
  const existing = await convex.query(api.agents.get, { agentId });
  if (!existing) return null;
  return await spawnExecutionAgent({
    task: existing.task,
    integrations: existing.integrations ?? existing.mcpServers ?? [],
    conversationId: existing.conversationId,
    name: existing.name,
  });
}

export function availableIntegrations(): string[] {
  return ["filesystem", "shell", "web"];
}
