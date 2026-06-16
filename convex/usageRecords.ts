import { mutation } from "./_generated/server";
import { v } from "convex/values";

const sourceV = v.union(
  v.literal("dispatcher"),
  v.literal("execution"),
  v.literal("extract"),
  v.literal("consolidation-proposer"),
  v.literal("consolidation-adversary"),
  v.literal("consolidation-judge"),
  v.literal("proactive"),
);

export const record = mutation({
  args: {
    source: sourceV,
    conversationId: v.optional(v.string()),
    turnId: v.optional(v.string()),
    agentId: v.optional(v.string()),
    runId: v.optional(v.string()),
    model: v.string(),
    inputTokens: v.number(),
    outputTokens: v.number(),
    cacheReadTokens: v.number(),
    cacheCreationTokens: v.number(),
    costUsd: v.number(),
    durationMs: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("usageRecords", { ...args, createdAt: Date.now() });
  },
});
