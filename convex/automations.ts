import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const create = mutation({
  args: {
    automationId: v.string(),
    name: v.string(),
    task: v.string(),
    integrations: v.array(v.string()),
    schedule: v.string(),
    timezone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("automations", {
      automationId: args.automationId,
      name: args.name,
      task: args.task,
      integrations: args.integrations,
      schedule: args.schedule,
      timezone: args.timezone,
      enabled: true,
      createdAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    automationId: v.string(),
    name: v.optional(v.string()),
    task: v.optional(v.string()),
    integrations: v.optional(v.array(v.string())),
    schedule: v.optional(v.string()),
    enabled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const auto = await ctx.db.query("automations")
      .withIndex("by_automation_id", (q) => q.eq("automationId", args.automationId))
      .unique();
    if (!auto) throw new Error(`Automation ${args.automationId} not found`);
    const patch: Record<string, any> = {};
    if (args.name !== undefined) patch.name = args.name;
    if (args.task !== undefined) patch.task = args.task;
    if (args.integrations !== undefined) patch.integrations = args.integrations;
    if (args.schedule !== undefined) patch.schedule = args.schedule;
    if (args.enabled !== undefined) patch.enabled = args.enabled;
    await ctx.db.patch(auto._id, patch);
  },
});

export const setEnabled = mutation({
  args: { automationId: v.string(), enabled: v.boolean() },
  handler: async (ctx, args) => {
    const auto = await ctx.db.query("automations")
      .withIndex("by_automation_id", (q) => q.eq("automationId", args.automationId))
      .unique();
    if (!auto) return;
    await ctx.db.patch(auto._id, { enabled: args.enabled });
  },
});

export const remove = mutation({
  args: { automationId: v.string() },
  handler: async (ctx, args) => {
    const auto = await ctx.db.query("automations")
      .withIndex("by_automation_id", (q) => q.eq("automationId", args.automationId))
      .unique();
    if (!auto) return;
    await ctx.db.delete(auto._id);
  },
});

export const list = query({
  args: { enabledOnly: v.optional(v.boolean()), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    if (args.enabledOnly) {
      return await ctx.db.query("automations")
        .withIndex("by_enabled", (q) => q.eq("enabled", true))
        .order("desc").take(args.limit ?? 50);
    }
    return await ctx.db.query("automations").order("desc").take(args.limit ?? 50);
  },
});

export const get = query({
  args: { automationId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.query("automations")
      .withIndex("by_automation_id", (q) => q.eq("automationId", args.automationId))
      .unique();
  },
});

export const markRan = mutation({
  args: { automationId: v.string(), lastRunAt: v.number(), nextRunAt: v.number() },
  handler: async (ctx, args) => {
    const auto = await ctx.db.query("automations")
      .withIndex("by_automation_id", (q) => q.eq("automationId", args.automationId))
      .unique();
    if (!auto) return;
    await ctx.db.patch(auto._id, { lastRunAt: args.lastRunAt, nextRunAt: args.nextRunAt });
  },
});

// ─── Automation Runs ─────────────────────────────────────────────────────────
export const createRun = mutation({
  args: {
    runId: v.string(),
    automationId: v.string(),
    agentId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("automationRuns", {
      runId: args.runId,
      automationId: args.automationId,
      status: "running",
      agentId: args.agentId,
      startedAt: Date.now(),
    });
  },
});

export const updateRun = mutation({
  args: {
    runId: v.string(),
    status: v.union(v.literal("running"), v.literal("completed"), v.literal("failed")),
    result: v.optional(v.string()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const run = await ctx.db.query("automationRuns")
      .withIndex("by_run_id", (q) => q.eq("runId", args.runId))
      .unique();
    if (!run) return;
    await ctx.db.patch(run._id, {
      status: args.status,
      result: args.result,
      error: args.error,
      completedAt: Date.now(),
    });
  },
});

export const recentRuns = query({
  args: { automationId: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    return await ctx.db.query("automationRuns")
      .withIndex("by_automation", (q) => q.eq("automationId", args.automationId))
      .order("desc")
      .take(args.limit ?? 20);
  },
});
