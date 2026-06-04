import { query } from "./_generated/server";

export const metrics = query({
  handler: async (ctx) => {
    const [messages, memories, agents, automationRuns, events] = await Promise.all([
      ctx.db.query("activityEvents").order("desc").take(5000),
      ctx.db.query("memoryRecords").order("desc").take(5000),
      ctx.db.query("executionAgents").order("desc").take(5000),
      ctx.db.query("automationRuns").order("desc").take(5000),
      ctx.db.query("activityEvents").order("desc").take(5000),
    ]);

    const activeMemories = memories.filter((m) => m.lifecycle === "active");
    const memoriesByTier = {
      short: activeMemories.filter((m) => m.tier === "short").length,
      long: activeMemories.filter((m) => m.tier === "long").length,
      permanent: activeMemories.filter((m) => m.tier === "permanent").length,
    };

    const agentsByStatus = {
      total: agents.length,
      spawned: agents.filter((a) => a.status === "spawned").length,
      running: agents.filter((a) => a.status === "running").length,
      completed: agents.filter((a) => a.status === "completed").length,
      failed: agents.filter((a) => a.status === "failed").length,
      cancelled: agents.filter((a) => a.status === "cancelled").length,
    };

    const totalCost = agents.reduce((sum, a) => sum + a.costUsd, 0);
    const totalTokens = agents.reduce((sum, a) => sum + a.inputTokens + a.outputTokens, 0);

    const automationStats = {
      total: automationRuns.length,
      completed: automationRuns.filter((r) => r.status === "completed").length,
      failed: automationRuns.filter((r) => r.status === "failed").length,
      running: automationRuns.filter((r) => r.status === "running").length,
    };

    return {
      messages: { count: events.length },
      memories: { total: activeMemories.length, byTier: memoriesByTier },
      agents: agentsByStatus,
      automations: automationStats,
      cost: { total: totalCost },
      tokens: { total: totalTokens },
    };
  },
});
