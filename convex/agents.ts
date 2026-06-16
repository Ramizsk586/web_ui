import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const create = mutation({
  args: {
    agentId: v.string(),
    name: v.string(),
    task: v.string(),
    integrations: v.array(v.string()),
    conversationId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("executionAgents", {
      agentId: args.agentId,
      conversationId: args.conversationId,
      name: args.name,
      task: args.task,
      status: "spawned",
      mcpServers: args.integrations,
      integrations: args.integrations,
      inputTokens: 0,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheCreationTokens: 0,
      costUsd: 0,
      startedAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    agentId: v.string(),
    status: v.optional(v.union(
      v.literal("spawned"), v.literal("running"), v.literal("completed"),
      v.literal("failed"), v.literal("cancelled"),
    )),
    result: v.optional(v.string()),
    error: v.optional(v.string()),
    inputTokens: v.optional(v.number()),
    outputTokens: v.optional(v.number()),
    cacheReadTokens: v.optional(v.number()),
    cacheCreationTokens: v.optional(v.number()),
    costUsd: v.optional(v.number()),
    completedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const agent = await ctx.db.query("executionAgents")
      .withIndex("by_agent_id", (q) => q.eq("agentId", args.agentId))
      .unique();
    if (!agent) throw new Error(`Agent ${args.agentId} not found`);
    const patch: Record<string, any> = {};
    if (args.status !== undefined) patch.status = args.status;
    if (args.result !== undefined) patch.result = args.result;
    if (args.error !== undefined) patch.error = args.error;
    if (args.inputTokens !== undefined) patch.inputTokens = args.inputTokens;
    if (args.outputTokens !== undefined) patch.outputTokens = args.outputTokens;
    if (args.cacheReadTokens !== undefined) patch.cacheReadTokens = args.cacheReadTokens;
    if (args.cacheCreationTokens !== undefined) patch.cacheCreationTokens = args.cacheCreationTokens;
    if (args.costUsd !== undefined) patch.costUsd = args.costUsd;
    if (args.completedAt !== undefined) patch.completedAt = args.completedAt;
    if (args.status === "completed" || args.status === "failed" || args.status === "cancelled") {
      patch.completedAt = args.completedAt ?? Date.now();
    }
    await ctx.db.patch(agent._id, patch);
    return true;
  },
});

export const addLog = mutation({
  args: {
    agentId: v.string(),
    logType: v.union(
      v.literal("thinking"), v.literal("tool_use"), v.literal("tool_result"),
      v.literal("text"), v.literal("error"),
    ),
    toolName: v.optional(v.string()),
    accounts: v.optional(v.array(v.string())),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("agentLogs", {
      agentId: args.agentId,
      logType: args.logType,
      toolName: args.toolName,
      accounts: args.accounts,
      content: args.content,
      createdAt: Date.now(),
    });
  },
});

export const list = query({
  args: {
    status: v.optional(v.union(
      v.literal("spawned"), v.literal("running"), v.literal("completed"),
      v.literal("failed"), v.literal("cancelled"),
    )),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    if (args.status) {
      return await ctx.db.query("executionAgents")
        .withIndex("by_status", (q) => q.eq("status", args.status))
        .order("desc").take(args.limit ?? 50);
    }
    return await ctx.db.query("executionAgents").order("desc").take(args.limit ?? 50);
  },
});

export const get = query({
  args: { agentId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.query("executionAgents")
      .withIndex("by_agent_id", (q) => q.eq("agentId", args.agentId))
      .unique();
  },
});

export const getLogs = query({
  args: { agentId: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    return await ctx.db.query("agentLogs")
      .withIndex("by_agent", (q) => q.eq("agentId", args.agentId))
      .order("asc")
      .take(args.limit ?? 500);
  },
});

export const remove = mutation({
  args: { agentId: v.string() },
  handler: async (ctx, args) => {
    const agent = await ctx.db.query("executionAgents")
      .withIndex("by_agent_id", (q) => q.eq("agentId", args.agentId))
      .unique();
    if (!agent) return { deleted: 0 };
    const logs = await ctx.db.query("agentLogs")
      .withIndex("by_agent", (q) => q.eq("agentId", args.agentId))
      .collect();
    for (const log of logs) await ctx.db.delete(log._id);
    await ctx.db.delete(agent._id);
    return { deleted: 1 };
  },
});

export const cleanupFinished = mutation({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const agents = await ctx.db.query("executionAgents").collect();
    let deleted = 0;
    for (const agent of agents) {
      if (!["completed", "failed", "cancelled"].includes(agent.status)) continue;
      if (deleted >= (args.limit ?? 500)) break;
      const logs = await ctx.db.query("agentLogs")
        .withIndex("by_agent", (q) => q.eq("agentId", agent.agentId))
        .collect();
      for (const log of logs) await ctx.db.delete(log._id);
      await ctx.db.delete(agent._id);
      deleted += 1;
    }
    return { deleted };
  },
});
