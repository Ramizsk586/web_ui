/**
 * automations.ts  (server/)
 * ─────────────────────────────────────────────────────────────────────────────
 * Cron evaluation loop — checks Convex every 30 seconds for automations whose
 * next run time has arrived, spawns Execution Agents to handle them, and
 * records results back to Convex.
 *
 * Uses the `croner` package for robust cron expression parsing (handles all
 * standard 5-field expressions plus optional seconds field).
 *
 * IMPORTANT: This file is the SERVER-side scheduler loop, not to be confused
 * with the Convex `automations.ts` data-access module.
 */

import { v4 as uuidv4 } from 'uuid';
import { getConvexClient } from './convex-client.js';
import { api } from '../convex/_generated/api.js';
import { runExecutionAgent } from './execution-agent.js';
import { deliverToTelegram } from './telegram-delivery.js';

// Dynamically import croner so startup doesn't fail if the package isn't
// installed yet.
let Cron: any = null;
async function getCroner() {
  if (Cron) return Cron;
  try {
    const mod = await import('croner');
    Cron = mod.Cron;
  } catch {
    console.warn('[Automations] croner not installed — schedule evaluation will fall back to basic ISO 8601.');
    Cron = null;
  }
  return Cron;
}

/** How often (ms) to poll Convex for due automations. */
const TICK_INTERVAL_MS = 30_000;

let _running = false;

/**
 * Evaluate all enabled automations and spawn agents for any that are due.
 */
export async function tickAutomations(): Promise<void> {
  const convex = getConvexClient();
  const croner = await getCroner();

  let automations: any[];
  try {
    automations = await convex.query(api.automations.list, { enabledOnly: true, limit: 100 }) ?? [];
  } catch (err) {
    console.error('[Automations] Failed to fetch automations:', err);
    return;
  }

  const now = Date.now();

  for (const auto of automations) {
    try {
      // Determine if this automation is due
      const nextRun: number | undefined = auto.nextRunAt;
      if (nextRun && nextRun > now) continue; // Not yet due

      // If nextRunAt is not set, compute it from cron schedule
      if (!nextRun) {
        const next = computeNextRun(croner, auto.schedule, auto.timezone);
        await convex.mutation(api.automations.markRan, {
          automationId: auto.automationId,
          lastRunAt: now,
          nextRunAt: next,
        });
        continue; // Wait for next actual trigger time
      }

      // Claim this run
      const runId = `run_${uuidv4().replace(/-/g, '').slice(0, 12)}`;
      const agentId = `agent_auto_${uuidv4().replace(/-/g, '').slice(0, 10)}`;

      await convex.mutation(api.automations.createRun, {
        runId,
        automationId: auto.automationId,
        agentId,
      });

      // Compute next scheduled time
      const next = computeNextRun(croner, auto.schedule, auto.timezone);
      await convex.mutation(api.automations.markRan, {
        automationId: auto.automationId,
        lastRunAt: now,
        nextRunAt: next,
      });

      console.log(`[Automations] Firing "${auto.name}" (${auto.automationId}) → ${agentId}`);

      // Spawn agent (fire-and-forget with result callback)
      const telegramChatId = auto.conversationId ? parseInt(auto.conversationId, 10) : undefined;

      runExecutionAgent({
        agentId,
        name: `[Auto] ${auto.name}`,
        task: auto.task,
        integrations: auto.integrations ?? [],
        telegramChatId: telegramChatId && !isNaN(telegramChatId) ? telegramChatId : undefined,
      })
        .then(async result => {
          await convex.mutation(api.automations.updateRun, {
            runId,
            status: 'completed',
            result: result.slice(0, 2000),
          });
          if (telegramChatId && !isNaN(telegramChatId)) {
            await deliverToTelegram(
              telegramChatId,
              `⏱ **Automation Complete: ${auto.name}**\n\n${result.slice(0, 3000)}`
            );
          }
        })
        .catch(async err => {
          const errMsg = err.message ?? String(err);
          await convex.mutation(api.automations.updateRun, {
            runId,
            status: 'failed',
            error: errMsg,
          });
          console.error(`[Automations] Run ${runId} failed:`, errMsg);
        });
    } catch (err) {
      console.error(`[Automations] Error processing automation "${auto.name}":`, err);
    }
  }
}

function computeNextRun(croner: any, schedule: string, timezone?: string): number {
  if (croner) {
    try {
      const job = new croner(schedule, { timezone, startAt: new Date(), paused: true });
      const next = job.nextRun();
      return next ? next.getTime() : Date.now() + 60_000;
    } catch {
      console.warn(`[Automations] Invalid cron expression "${schedule}"`);
    }
  }
  // Fallback: 1-minute interval
  return Date.now() + 60_000;
}

/**
 * Start the automation polling loop.
 * Idempotent — calling multiple times is safe.
 */
export function startAutomationLoop(): void {
  if (_running) return;
  _running = true;

  console.log(`[Automations] Starting automation loop (interval: ${TICK_INTERVAL_MS / 1000}s)`);

  // Initial tick after a short delay to let Convex connect
  setTimeout(() => tickAutomations(), 5_000);

  setInterval(() => {
    tickAutomations().catch(err =>
      console.error('[Automations] Tick error:', err)
    );
  }, TICK_INTERVAL_MS);
}
