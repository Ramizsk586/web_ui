/**
 * consolidation.ts  (server/)
 * ─────────────────────────────────────────────────────────────────────────────
 * Proposer–Adversary–Judge Memory Consolidation
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * A three-stage LLM debate pipeline that keeps user memories accurate,
 * non-redundant, and safe from information loss:
 *
 *   Stage 1  PROPOSER  — scans active memories, proposes merge/supersede/prune
 *   Stage 2  ADVERSARY — critically challenges each proposal (flags info loss)
 *   Stage 3  JUDGE     — weighs proposals vs objections, makes final decisions
 *
 * Model assignment (all routed through Lumina's Anthropic proxy):
 *   CONSOLIDATION_PROPOSER_MODEL   (default: claude-3-5-sonnet-20241022)
 *   CONSOLIDATION_ADVERSARY_MODEL  (default: claude-3-opus-20240229)
 *   CONSOLIDATION_JUDGE_MODEL      (default: claude-3-5-sonnet-20241022)
 *
 * Environment:
 *   CONSOLIDATION_INTERVAL_MIN  — minutes between automatic runs (default: 60)
 *   CONSOLIDATION_MIN_MEMORIES  — min active memories to trigger debate (default: 5)
 */

import { v4 as uuidv4 } from 'uuid';
import { chatCompletion } from './bridge-client.js';
import { getConvexClient } from './convex-client.js';
import { api } from '../convex/_generated/api.js';
import { broadcast } from './broadcast.js';

// ── Model configuration ───────────────────────────────────────────────────────

const PROPOSER_MODEL =
  process.env.CONSOLIDATION_PROPOSER_MODEL ?? 'claude-3-5-sonnet-20241022';
const ADVERSARY_MODEL =
  process.env.CONSOLIDATION_ADVERSARY_MODEL ?? 'claude-3-opus-20240229';
const JUDGE_MODEL =
  process.env.CONSOLIDATION_JUDGE_MODEL ?? 'claude-3-5-sonnet-20241022';

const INTERVAL_MS =
  (parseInt(process.env.CONSOLIDATION_INTERVAL_MIN ?? '60', 10) || 60) * 60_000;
const MIN_MEMORIES =
  parseInt(process.env.CONSOLIDATION_MIN_MEMORIES ?? '5', 10) || 5;

// ── Types ─────────────────────────────────────────────────────────────────────

export type ProposalAction = 'merge' | 'supersede' | 'prune' | 'keep';

export interface Proposal {
  action: ProposalAction;
  /** IDs of memory records targeted by this proposal */
  targetIds: string[];
  /** New content for merge/supersede; omitted for prune/keep */
  replacementContent?: string;
  /** Target segment for the resulting record */
  segment?: string;
  /** Target tier for the resulting record */
  tier?: string;
  reason: string;
}

export interface Objection {
  proposalIndex: number;
  objection: string;
  /** high → automatically blocks; medium → judge weighs; low → minor note */
  severity: 'high' | 'medium' | 'low';
}

export type JudgeDecision = 'approve' | 'reject' | 'modify';

export interface Verdict {
  proposalIndex: number;
  decision: JudgeDecision;
  /** Only set when decision === 'modify' */
  finalContent?: string;
  reason: string;
}

export interface ConsolidationResult {
  trigger: string;
  memoriesScanned: number;
  proposals: Proposal[];
  objections: Objection[];
  verdicts: Verdict[];
  applied: number;
  rejected: number;
  runId: string;
  durationMs: number;
}

// ── Stage prompts ─────────────────────────────────────────────────────────────

const PROPOSER_SYSTEM = `\
You are the Proposer in a memory consolidation system for a personal AI assistant.

YOUR TASK
─────────
Analyse the user's active memory records (provided as a numbered list) and
identify opportunities to improve memory quality. Output a compact JSON array of
proposals — one object per action.

PROPOSAL SCHEMA
───────────────
{
  "action":             "merge" | "supersede" | "prune" | "keep",
  "targetIds":          ["memId1", "memId2", ...],   // IDs of records involved
  "replacementContent": "Single precise sentence",   // for merge/supersede only
  "segment":            "preference",                // target segment
  "tier":               "long",                      // target tier
  "reason":             "Why this action improves memory quality"
}

ACTION GUIDE
────────────
• merge      — Two or more records say the same thing. Combine into one precise sentence.
• supersede  — A newer record contradicts or corrects an older one. Keep the newer fact,
               mark the older as replaced. targetIds = [olderIdToReplace].
               replacementContent = the corrected, newer statement.
• prune      — Record is expired, demonstrably false, trivially low-value, or a
               duplicate already captured elsewhere. targetIds = [idToPrune].
• keep       — No action needed (omit these; only include actionable proposals).

RULES
─────
1. Prefer merge over prune when information can be preserved in a unified statement.
2. Never prune a correction memory without a supersede to capture the corrected fact.
3. Output ONLY the JSON array — no prose, no markdown fences.
4. If no consolidation is needed, output [].
`;

const ADVERSARY_SYSTEM = `\
You are the Adversary in a memory consolidation peer-review system.

YOUR TASK
─────────
Critically examine each Proposer proposal (provided as a numbered JSON array) and
raise objections where information loss, context blurring, or over-aggressive pruning
is a risk. Output a JSON array of objections.

OBJECTION SCHEMA
────────────────
{
  "proposalIndex": 0,         // 0-based index into the proposals array
  "objection":     "Specific reason this proposal is dangerous",
  "severity":      "high" | "medium" | "low"
}

SEVERITY GUIDE
──────────────
• high   — Significant information would be permanently lost or falsified.
           The Judge should almost certainly REJECT.
• medium — Potential information loss; the Judge should carefully evaluate.
• low    — Minor concern; acceptable trade-off, note for the Judge only.

RULES
─────
1. Only raise objections that are substantive — do not object to clearly safe proposals.
2. A merge that faithfully preserves all facts from both sources has no objection.
3. Output ONLY the JSON array. If there are no objections, output [].
`;

const JUDGE_SYSTEM = `\
You are the Judge in a memory consolidation peer-review system.

YOUR TASK
─────────
Weigh each Proposer proposal against the Adversary's objections and issue a final
verdict for every proposal. Output a JSON array of verdicts.

VERDICT SCHEMA
──────────────
{
  "proposalIndex": 0,
  "decision":      "approve" | "reject" | "modify",
  "finalContent":  "Revised sentence (only when decision === 'modify')",
  "reason":        "Brief explanation of the verdict"
}

DECISION GUIDE
──────────────
• approve — No objection, or only low-severity objections. Apply the proposal as-is.
• modify  — Medium-severity objection raised a valid point. Approve with a corrected
            replacementContent that addresses the concern.
• reject  — High-severity objection. Do not apply; preserve original records.

RULES
─────
1. Every proposal must receive exactly one verdict.
2. High-severity objections default to reject unless clearly unfounded.
3. For 'modify' decisions include a 'finalContent' that is a complete replacement sentence.
4. Output ONLY the JSON array — no prose, no markdown.
`;

// ── Utility ───────────────────────────────────────────────────────────────────

function safeParseJSON<T>(text: string, fallback: T): T {
  try {
    // Strip markdown fences if the model wrapped anyway
    const cleaned = text.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim();
    return JSON.parse(cleaned) as T;
  } catch {
    return fallback;
  }
}

function extractText(response: any): string {
  return (response.content ?? [])
    .filter((b: any) => b.type === 'text')
    .map((b: any) => b.text as string)
    .join('');
}

// ── Main pipeline ─────────────────────────────────────────────────────────────

/**
 * Run one full Proposer–Adversary–Judge consolidation cycle.
 * @param trigger  label for the run source, e.g. "schedule" | "manual" | "test"
 */
export async function runConsolidation(trigger = 'schedule'): Promise<ConsolidationResult> {
  const runId = `cons_${uuidv4().replace(/-/g, '').slice(0, 14)}`;
  const started = Date.now();
  const convex = getConvexClient();

  console.log(`[Consolidation:${runId}] Starting (trigger=${trigger})…`);
  try {
    await convex.mutation(api.consolidation.createRun, { runId, trigger });
  } catch (err: any) {
    console.warn('[Consolidation] Failed to create run in Convex:', err.message);
  }
  broadcast('consolidation_started', { runId, trigger });

  // ── Fetch active memories ────────────────────────────────────────────────

  const memories: any[] = await convex.query(api.memory.list, {
    lifecycle: 'active',
    limit: 200,
  }) ?? [];

  broadcast('consolidation_phase', { runId, phase: 'loaded', memoriesCount: memories.length });

  if (memories.length < MIN_MEMORIES) {
    console.log(`[Consolidation:${runId}] Only ${memories.length} active memories — skipping.`);
    try {
      await convex.mutation(api.consolidation.updateRun, {
        runId,
        status: 'completed',
        notes: 'Not enough memories to consolidate',
      });
    } catch {}
    broadcast('consolidation_completed', { runId, merged: 0, pruned: 0, notes: 'Not enough memories to consolidate' });
    return { trigger, memoriesScanned: memories.length, proposals: [], objections: [], verdicts: [], applied: 0, rejected: 0, runId, durationMs: Date.now() - started };
  }

  // Format memories for the prompt
  const memoryList = memories
    .map((m: any) => `[${m.memoryId}] (${m.tier}/${m.segment}) ${m.content}`)
    .join('\n');

  console.log(`[Consolidation:${runId}] Scanning ${memories.length} memories…`);

  // ── Stage 1: Proposer ────────────────────────────────────────────────────

  broadcast('consolidation_phase', { runId, phase: 'proposing' });
  let proposals: Proposal[] = [];
  try {
    const proposerResponse = await chatCompletion(
      [{ role: 'user', content: `Active memory records:\n\n${memoryList}` }],
      { model: PROPOSER_MODEL, maxTokens: 2048, systemPrompt: PROPOSER_SYSTEM }
    );
    proposals = safeParseJSON<Proposal[]>(extractText(proposerResponse), []);
    // Filter out 'keep' actions that leaked through
    proposals = proposals.filter(p => p.action !== 'keep');
    console.log(`[Consolidation:${runId}] Proposer: ${proposals.length} proposals.`);
  } catch (err: any) {
    console.error(`[Consolidation:${runId}] Proposer failed:`, err.message);
  }

  broadcast('consolidation_phase', { runId, phase: 'proposed', proposalsCount: proposals.length });
  try {
    await convex.mutation(api.consolidation.updateRun, {
      runId,
      proposalsCount: proposals.length,
      details: JSON.stringify({
        memoriesScanned: memories.length,
        proposals,
      }),
    });
  } catch {}

  if (proposals.length === 0) {
    console.log(`[Consolidation:${runId}] No proposals — memories are clean.`);
    try {
      await convex.mutation(api.consolidation.updateRun, {
        runId,
        status: 'completed',
        notes: 'No proposals',
      });
    } catch {}
    broadcast('consolidation_completed', { runId, merged: 0, pruned: 0, notes: 'No proposals' });
    return { trigger, memoriesScanned: memories.length, proposals: [], objections: [], verdicts: [], applied: 0, rejected: 0, runId, durationMs: Date.now() - started };
  }

  // ── Stage 2: Adversary ───────────────────────────────────────────────────

  broadcast('consolidation_phase', { runId, phase: 'challenging' });
  let objections: Objection[] = [];
  try {
    const adversaryInput = [
      `Original memories:\n${memoryList}`,
      `\nProposals (0-indexed):\n${JSON.stringify(proposals, null, 2)}`,
    ].join('\n\n');

    const adversaryResponse = await chatCompletion(
      [{ role: 'user', content: adversaryInput }],
      { model: ADVERSARY_MODEL, maxTokens: 2048, systemPrompt: ADVERSARY_SYSTEM }
    );
    objections = safeParseJSON<Objection[]>(extractText(adversaryResponse), []);
    console.log(`[Consolidation:${runId}] Adversary: ${objections.length} objections.`);
  } catch (err: any) {
    console.error(`[Consolidation:${runId}] Adversary failed (continuing without):`, err.message);
  }

  broadcast('consolidation_phase', { runId, phase: 'challenged' });
  try {
    await convex.mutation(api.consolidation.updateRun, {
      runId,
      details: JSON.stringify({
        memoriesScanned: memories.length,
        proposals,
        objections,
      }),
    });
  } catch {}

  // ── Stage 3: Judge ───────────────────────────────────────────────────────

  broadcast('consolidation_phase', { runId, phase: 'judging' });
  let verdicts: Verdict[] = [];
  try {
    const judgeInput = [
      `Proposals:\n${JSON.stringify(proposals, null, 2)}`,
      `\nAdversary objections:\n${JSON.stringify(objections, null, 2)}`,
    ].join('\n\n');

    const judgeResponse = await chatCompletion(
      [{ role: 'user', content: judgeInput }],
      { model: JUDGE_MODEL, maxTokens: 2048, systemPrompt: JUDGE_SYSTEM }
    );
    verdicts = safeParseJSON<Verdict[]>(extractText(judgeResponse), []);
    console.log(`[Consolidation:${runId}] Judge: ${verdicts.length} verdicts.`);
  } catch (err: any) {
    console.error(`[Consolidation:${runId}] Judge failed:`, err.message);
  }

  broadcast('consolidation_phase', { runId, phase: 'judged' });
  try {
    await convex.mutation(api.consolidation.updateRun, {
      runId,
      details: JSON.stringify({
        memoriesScanned: memories.length,
        proposals,
        objections,
        verdicts,
      }),
    });
  } catch {}

  // ── Apply approved verdicts ───────────────────────────────────────────────

  broadcast('consolidation_phase', { runId, phase: 'applying' });
  let applied = 0;
  let rejected = 0;

  for (const verdict of verdicts) {
    const proposal = proposals[verdict.proposalIndex];
    if (!proposal) continue;

    if (verdict.decision === 'reject') {
      rejected++;
      console.log(`[Consolidation:${runId}] REJECT [${verdict.proposalIndex}] ${proposal.action} — ${verdict.reason}`);
      continue;
    }

    try {
      const effectiveContent = verdict.decision === 'modify'
        ? (verdict.finalContent ?? proposal.replacementContent ?? '')
        : (proposal.replacementContent ?? '');

      const tier = (proposal.tier ?? 'long') as 'short' | 'long' | 'permanent';
      const segment = (proposal.segment ?? 'context') as any;

      switch (proposal.action) {
        case 'merge': {
          if (!effectiveContent) { rejected++; break; }
          const newId = `mem_mrg_${uuidv4().replace(/-/g, '').slice(0, 12)}`;
          await convex.mutation(api.memory.upsert, {
            memoryId: newId,
            content: effectiveContent,
            tier,
            segment,
            source: `consolidation:${runId}`,
            supersedes: proposal.targetIds,
          });
          applied++;
          console.log(`[Consolidation:${runId}] MERGE → ${newId}: "${effectiveContent.slice(0, 60)}…"`);
          break;
        }

        case 'supersede': {
          if (!effectiveContent) { rejected++; break; }
          const newId = `mem_sup_${uuidv4().replace(/-/g, '').slice(0, 12)}`;
          await convex.mutation(api.memory.upsert, {
            memoryId: newId,
            content: effectiveContent,
            tier,
            segment,
            source: `consolidation:${runId}`,
            supersedes: proposal.targetIds,
          });
          applied++;
          console.log(`[Consolidation:${runId}] SUPERSEDE → ${newId}: "${effectiveContent.slice(0, 60)}…"`);
          break;
        }

        case 'prune': {
          for (const targetId of proposal.targetIds) {
            await convex.mutation(api.memory.setLifecycle, {
              memoryId: targetId,
              lifecycle: 'pruned',
            });
          }
          applied++;
          console.log(`[Consolidation:${runId}] PRUNE ${proposal.targetIds.join(', ')}`);
          break;
        }
      }
    } catch (err: any) {
      console.error(`[Consolidation:${runId}] Apply error (proposal ${verdict.proposalIndex}):`, err.message);
      rejected++;
    }
  }

  const duration = Date.now() - started;
  console.log(`[Consolidation:${runId}] Done in ${duration}ms — applied=${applied} rejected=${rejected}`);

  const pruneCount = proposals.filter(p => p.action === 'prune').length;
  try {
    await convex.mutation(api.consolidation.updateRun, {
      runId,
      status: 'completed',
      mergedCount: applied,
      prunedCount: pruneCount,
      notes: `Applied ${applied} changes, rejected ${rejected}`,
    });
  } catch {}
  broadcast('consolidation_completed', { runId, merged: applied, pruned: pruneCount, notes: `Applied ${applied} changes, rejected ${rejected}` });

  return { trigger, memoriesScanned: memories.length, proposals, objections, verdicts, applied, rejected, runId, durationMs: duration };
}

// ── Scheduled loop ────────────────────────────────────────────────────────────

let _loopRunning = false;

/**
 * Start the recurring consolidation loop.
 * Idempotent — safe to call multiple times.
 */
export function startConsolidationLoop(): void {
  if (_loopRunning) return;
  _loopRunning = true;

  console.log(`[Consolidation] Loop started — interval: ${INTERVAL_MS / 60_000}m, models: proposer=${PROPOSER_MODEL} adversary=${ADVERSARY_MODEL} judge=${JUDGE_MODEL}`);

  // First run after a 3-minute warm-up delay so Convex has time to connect
  setTimeout(() => {
    runConsolidation('startup').catch(err =>
      console.error('[Consolidation] Startup run error:', err)
    );
  }, 3 * 60_000);

  setInterval(() => {
    runConsolidation('schedule').catch(err =>
      console.error('[Consolidation] Scheduled run error:', err)
    );
  }, INTERVAL_MS);
}
