import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const log = mutation({
  args: {
    eventType: v.string(),
    source: v.string(),
    message: v.string(),
    metadata: v.optional(v.record(v.string(), v.string())),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("activityEvents", {
      eventType: args.eventType,
      source: args.source,
      message: args.message,
      metadata: args.metadata,
      createdAt: Date.now(),
    });
  },
});

export const list = query({
  args: {
    eventType: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let q = ctx.db.query("activityEvents");
    if (args.eventType) {
      q = q.withIndex("by_type", (q) => q.eq("eventType", args.eventType));
    }
    return await q.order("desc").take(args.limit ?? 100);
  },
});

export const remove = mutation({
  args: { eventId: v.id("activityEvents") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.eventId);
  },
});

export const clearAll = mutation({
  handler: async (ctx) => {
    const events = await ctx.db.query("activityEvents").take(5000);
    for (const e of events) await ctx.db.delete(e._id);
  },
});
