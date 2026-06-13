/**
 * clean.ts  (server/)
 * ─────────────────────────────────────────────────────────────────────────────
 * Memory Cleanup Loop
 *
 * Periodically prunes or archives stale memory records from Convex:
 *   • Short-term memories older than CLEANUP_SHORT_TTL_DAYS (default: 3 days)
 *     are archived.
 *   • Archived memories older than CLEANUP_ARCHIVE_TTL_DAYS (default: 30 days)
 *     are pruned (lifecycle → "pruned").
 *   • Finished (completed/failed/cancelled) execution agents older than
 *     CLEANUP_AGENT_TTL_DAYS (default: 7 days) are removed.
 *
 * Runs every CLEANUP_INTERVAL_HOURS hours (default: 6).
 */

import { getConvexClient } from './convex-client.js';
import { api } from '../convex/_generated/api.js';

const CLEANUP_INTERVAL_MS =
  (parseInt(process.env.CLEANUP_INTERVAL_HOURS ?? '6', 10) || 6) * 3_600_000;

const SHORT_TTL_MS =
  (parseInt(process.env.CLEANUP_SHORT_TTL_DAYS ?? '3', 10) || 3) * 86_400_000;

const ARCHIVE_TTL_MS =
  (parseInt(process.env.CLEANUP_ARCHIVE_TTL_DAYS ?? '30', 10) || 30) * 86_400_000;

let _running = false;

export async function runCleanup(): Promise<void> {
  const convex = getConvexClient();
  const now = Date.now();
  let archived = 0;
  let pruned = 0;

  try {
    // 1. Archive stale short-term memories
    const shortTermMems: any[] = await convex.query(api.memory.list, {
      tier: 'short',
      lifecycle: 'active',
      limit: 200,
    }) ?? [];

    for (const mem of shortTermMems) {
      if (now - mem.createdAt > SHORT_TTL_MS) {
        await convex.mutation(api.memory.setLifecycle, {
          memoryId: mem.memoryId,
          lifecycle: 'archived',
        });
        archived++;
      }
    }

    // 2. Prune old archived memories
    const archivedMems: any[] = await convex.query(api.memory.list, {
      lifecycle: 'archived',
      limit: 200,
    }) ?? [];

    for (const mem of archivedMems) {
      if (now - mem.createdAt > ARCHIVE_TTL_MS) {
        await convex.mutation(api.memory.setLifecycle, {
          memoryId: mem.memoryId,
          lifecycle: 'pruned',
        });
        pruned++;
      }
    }

    // 3. Clean up finished execution agents
    await convex.mutation(api.agents.cleanupFinished, {});

  } catch (err) {
    console.error('[Cleanup] Error during cleanup run:', err);
  }

  if (archived > 0 || pruned > 0) {
    console.log(`[Cleanup] Archived ${archived} short-term memories, pruned ${pruned} stale archives.`);
  }
}

/**
 * Start the memory cleanup background loop.
 * Safe to call multiple times.
 */
export function startCleanupLoop(): void {
  if (_running) return;
  _running = true;

  console.log(`[Cleanup] Starting memory cleanup loop (interval: ${CLEANUP_INTERVAL_MS / 3_600_000}h)`);

  // First run 5 minutes after startup
  setTimeout(() => {
    runCleanup().catch(err => console.error('[Cleanup] Initial run error:', err));
  }, 5 * 60_000);

  setInterval(() => {
    runCleanup().catch(err => console.error('[Cleanup] Error:', err));
  }, CLEANUP_INTERVAL_MS);
}
