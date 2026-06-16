import { v } from "convex/values";
import { query, mutation, action } from "./_generated/server";
import { api } from "./_generated/api";

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
    supersedes: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const decayRate = args.tier === "permanent"
      ? (args.segment === "identity" ? 0.0000228 : 0.000114)
      : args.tier === "long" ? 0.00015 : 0.0005;
    const importance = args.tier === "permanent" ? 0.99 : args.tier === "long" ? 0.85 : 0.6;
    const id = await ctx.db.insert("memoryRecords", {
      memoryId: args.memoryId,
      content: args.content,
      tier: args.tier,
      segment: args.segment,
      importance,
      decayRate,
      accessCount: 0,
      lastAccessedAt: Date.now(),
      lifecycle: "active",
      supersedes: args.supersedes,
      source: args.source,
      agentId: args.agentId,
      createdAt: Date.now(),
    });
    // Archive any memories this one supersedes
    if (args.supersedes) {
      for (const sid of args.supersedes) {
        const old = await ctx.db.query("memoryRecords")
          .withIndex("by_memory_id", (q) => q.eq("memoryId", sid))
          .unique();
        if (old && old.lifecycle === "active") {
          await ctx.db.patch(old._id, { lifecycle: "archived" });
        }
      }
    }
    return id;
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

// ── Upsert — for debate consolidation decisions ──────────────────────────────
// Creates a new memory record and atomically archives any records it supersedes.
// If a record with memoryId already exists it patches the content instead.
export const upsert = mutation({
  args: {
    memoryId: v.string(),
    content: v.string(),
    tier: v.union(v.literal("short"), v.literal("long"), v.literal("permanent")),
    segment: v.union(
      v.literal("identity"), v.literal("preference"), v.literal("correction"),
      v.literal("relationship"), v.literal("project"), v.literal("knowledge"),
      v.literal("context"),
    ),
    importance: v.number(),
    decayRate: v.number(),
    sourceTurn: v.optional(v.string()),
    supersedes: v.optional(v.array(v.string())),
    embedding: v.optional(v.array(v.float64())),
    metadata: v.optional(v.string()),
    source: v.string(),
    agentId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Archive all superseded records
    if (args.supersedes?.length) {
      for (const sid of args.supersedes) {
        if (sid === args.memoryId) continue; // never archive self
        const old = await ctx.db.query("memoryRecords")
          .withIndex("by_memory_id", (q) => q.eq("memoryId", sid))
          .unique();
        if (old && old.lifecycle === "active") {
          await ctx.db.patch(old._id, { lifecycle: "archived" });
        }
      }
    }

    const existing = await ctx.db.query("memoryRecords")
      .withIndex("by_memory_id", (q) => q.eq("memoryId", args.memoryId))
      .unique();

    if (existing) {
      // Patch existing record
      await ctx.db.patch(existing._id, {
        content: args.content,
        tier: args.tier,
        segment: args.segment,
        importance: args.importance,
        decayRate: args.decayRate,
        supersedes: args.supersedes,
        embedding: args.embedding ?? existing.embedding,
        metadata: args.metadata ?? existing.metadata,
        lastAccessedAt: now,
      });
      return existing._id;
    }

    // Insert fresh record
    return await ctx.db.insert("memoryRecords", {
      memoryId: args.memoryId,
      content: args.content,
      tier: args.tier,
      segment: args.segment,
      importance: args.importance,
      decayRate: args.decayRate,
      sourceTurn: args.sourceTurn,
      supersedes: args.supersedes,
      embedding: args.embedding,
      metadata: args.metadata,
      source: args.source,
      agentId: args.agentId,
      accessCount: 0,
      lastAccessedAt: now,
      lifecycle: "active",
      createdAt: now,
    });
  },
});

export const getByIds = query({
  args: { ids: v.array(v.id("memoryRecords")) },
  handler: async (ctx, args) => {
    const out = [];
    for (const id of args.ids) {
      const r = await ctx.db.get(id);
      if (r) out.push(r);
    }
    return out;
  },
});

export const vectorSearch = action({
  args: { embedding: v.array(v.float64()), limit: v.optional(v.number()) },
  handler: async (ctx, args): Promise<Array<{ _id: any; score: number; record: any }>> => {
    const results = await ctx.vectorSearch("memoryRecords", "by_embedding", {
      vector: args.embedding,
      limit: args.limit ?? 20,
      filter: (q) => q.eq("lifecycle", "active"),
    });
    const records = await ctx.runQuery(api.memory.getByIds, {
      ids: results.map((r) => r._id),
    });
    const byId = new Map(records.map((r: any) => [r._id, r]));
    return results
      .map((r) => ({ _id: r._id, score: r._score, record: byId.get(r._id) }))
      .filter((r) => r.record);
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
    const limit = args.limit ?? 100;
    let results;
    if (args.tier) {
      results = await ctx.db.query("memoryRecords")
        .withIndex("by_tier", (q) => q.eq("tier", args.tier!))
        .order("desc").take(limit * 2);
    } else if (args.segment) {
      results = await ctx.db.query("memoryRecords")
        .withIndex("by_segment", (q) => q.eq("segment", args.segment!))
        .order("desc").take(limit * 2);
    } else {
      results = await ctx.db.query("memoryRecords").order("desc").take(limit * 2);
    }
    const lifecycle = args.lifecycle ?? "active";
    return results.filter((r) => r.lifecycle === lifecycle).slice(0, limit);
  },
});

export const search = query({
  args: { query: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;
    const q = args.query.toLowerCase();
    const active = await ctx.db.query("memoryRecords")
      .withIndex("by_lifecycle", (idx) => idx.eq("lifecycle", "active"))
      .order("desc")
      .take(500);
    return active
      .filter((m) => m.content.toLowerCase().includes(q))
      .sort((a, b) => b.importance - a.importance)
      .slice(0, limit);
  },
});

const COUNTS_SCAN_LIMIT = 5000;

export const embeddingStats = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db
      .query("memoryRecords")
      .withIndex("by_lifecycle", (q) => q.eq("lifecycle", "active"))
      .order("desc")
      .take(COUNTS_SCAN_LIMIT);
    let withEmbedding = 0;
    let withoutEmbedding = 0;
    for (const m of all) {
      if (m.embedding && m.embedding.length > 0) withEmbedding++;
      else withoutEmbedding++;
    }
    return {
      total: all.length,
      withEmbedding,
      withoutEmbedding,
      truncated: all.length === COUNTS_SCAN_LIMIT,
    };
  },
});

export const listUnembeddedPage = query({
  args: {
    cursor: v.optional(v.union(v.string(), v.null())),
    pageSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const result = await ctx.db
      .query("memoryRecords")
      .withIndex("by_lifecycle", (q) => q.eq("lifecycle", "active"))
      .order("desc")
      .paginate({
        cursor: args.cursor ?? null,
        numItems: args.pageSize ?? 50,
      });
    return {
      page: result.page
        .filter((m) => !m.embedding || m.embedding.length === 0)
        .map((m) => ({ memoryId: m.memoryId, content: m.content })),
      isDone: result.isDone,
      continueCursor: result.continueCursor,
    };
  },
});

export const setEmbedding = mutation({
  args: {
    memoryId: v.string(),
    embedding: v.array(v.float64()),
  },
  handler: async (ctx, args) => {
    const mem = await ctx.db
      .query("memoryRecords")
      .withIndex("by_memory_id", (q) => q.eq("memoryId", args.memoryId))
      .unique();
    if (!mem) return null;
    await ctx.db.patch(mem._id, { embedding: args.embedding });
    return mem._id;
  },
});

export const countsByTier = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("memoryRecords").order("desc").take(COUNTS_SCAN_LIMIT);
    const active = all.filter((m) => m.lifecycle === "active");
    return {
      short: active.filter((m) => m.tier === "short").length,
      long: active.filter((m) => m.tier === "long").length,
      permanent: active.filter((m) => m.tier === "permanent").length,
      archived: all.filter((m) => m.lifecycle === "archived").length,
      pruned: all.filter((m) => m.lifecycle === "pruned").length,
      truncated: all.length === COUNTS_SCAN_LIMIT,
      scanLimit: COUNTS_SCAN_LIMIT,
    };
  },
});
