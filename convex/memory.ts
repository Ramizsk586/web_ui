import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const create = mutation({
  args: {
    memoryId: v.string(),
    content: v.string(),
    tier: v.union(v.literal("short"), v.literal("long"), v.literal("permanent")),
    segment: v.union(
      v.literal("identity"), v.literal("preference"), v.literal("correction"),
      v.literal("relationship"), v.literal("project"), v.literal("knowledge"),
      v.literal("context"),
    ),
    source: v.string(),
    agentId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const decayRate = args.tier === "permanent"
      ? (args.segment === "identity" ? 0.0000228 : 0.000114)
      : args.tier === "long" ? 0.00015 : 0.0005;
    const importance = args.tier === "permanent" ? 0.99 : args.tier === "long" ? 0.85 : 0.6;
    return await ctx.db.insert("memoryRecords", {
      memoryId: args.memoryId,
      content: args.content,
      tier: args.tier,
      segment: args.segment,
      importance,
      decayRate,
      accessCount: 0,
      lastAccessedAt: Date.now(),
      lifecycle: "active",
      source: args.source,
      agentId: args.agentId,
      createdAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    memoryId: v.string(),
    content: v.optional(v.string()),
    tier: v.optional(v.union(v.literal("short"), v.literal("long"), v.literal("permanent"))),
    segment: v.optional(v.union(
      v.literal("identity"), v.literal("preference"), v.literal("correction"),
      v.literal("relationship"), v.literal("project"), v.literal("knowledge"),
      v.literal("context"),
    )),
  },
  handler: async (ctx, args) => {
    const mem = await ctx.db.query("memoryRecords")
      .withIndex("by_memory_id", (q) => q.eq("memoryId", args.memoryId))
      .unique();
    if (!mem) throw new Error(`Memory ${args.memoryId} not found`);
    const patch: Record<string, any> = {};
    if (args.content !== undefined) patch.content = args.content;
    if (args.tier !== undefined) patch.tier = args.tier;
    if (args.segment !== undefined) patch.segment = args.segment;
    await ctx.db.patch(mem._id, patch);
  },
});

export const markAccessed = mutation({
  args: { memoryId: v.string() },
  handler: async (ctx, args) => {
    const mem = await ctx.db.query("memoryRecords")
      .withIndex("by_memory_id", (q) => q.eq("memoryId", args.memoryId))
      .unique();
    if (!mem) return;
    const boost = Math.min(1, mem.importance + 0.1);
    await ctx.db.patch(mem._id, {
      accessCount: mem.accessCount + 1,
      lastAccessedAt: Date.now(),
      importance: boost,
    });
  },
});

export const setLifecycle = mutation({
  args: {
    memoryId: v.string(),
    lifecycle: v.union(v.literal("active"), v.literal("archived"), v.literal("pruned")),
  },
  handler: async (ctx, args) => {
    const mem = await ctx.db.query("memoryRecords")
      .withIndex("by_memory_id", (q) => q.eq("memoryId", args.memoryId))
      .unique();
    if (!mem) return;
    await ctx.db.patch(mem._id, { lifecycle: args.lifecycle });
  },
});

export const remove = mutation({
  args: { memoryId: v.string() },
  handler: async (ctx, args) => {
    const mem = await ctx.db.query("memoryRecords")
      .withIndex("by_memory_id", (q) => q.eq("memoryId", args.memoryId))
      .unique();
    if (!mem) return;
    await ctx.db.delete(mem._id);
  },
});

export const list = query({
  args: {
    tier: v.optional(v.union(v.literal("short"), v.literal("long"), v.literal("permanent"))),
    segment: v.optional(v.union(
      v.literal("identity"), v.literal("preference"), v.literal("correction"),
      v.literal("relationship"), v.literal("project"), v.literal("knowledge"),
      v.literal("context"),
    )),
    lifecycle: v.optional(v.union(v.literal("active"), v.literal("archived"), v.literal("pruned"))),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let q = ctx.db.query("memoryRecords");
    if (args.tier) q = q.withIndex("by_tier", (q) => q.eq("tier", args.tier));
    else if (args.segment) q = q.withIndex("by_segment", (q) => q.eq("segment", args.segment));
    else if (args.lifecycle) q = q.withIndex("by_lifecycle", (q) => q.eq("lifecycle", args.lifecycle));
    return await q.order("desc").take(args.limit ?? 100);
  },
});

export const search = query({
  args: { query: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const all = await ctx.db.query("memoryRecords")
      .withIndex("by_lifecycle", (q) => q.eq("lifecycle", "active"))
      .take(500);
    const q = args.query.toLowerCase();
    return all
      .filter((m) => m.content.toLowerCase().includes(q))
      .slice(0, args.limit ?? 50);
  },
});

export const countsByTier = query({
  handler: async (ctx) => {
    const all = await ctx.db.query("memoryRecords").take(5000);
    const counts: Record<string, number> = { short: 0, long: 0, permanent: 0 };
    for (const m of all) {
      if (m.lifecycle === "active") counts[m.tier]++;
    }
    return counts;
  },
});
