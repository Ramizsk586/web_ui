import React, { useEffect, useState } from "react";
import { useSocket } from "../hooks";

type Phase =
  | "loaded"
  | "proposing"
  | "proposed"
  | "challenging"
  | "challenged"
  | "judging"
  | "judged"
  | "applying"
  | "completed"
  | "failed";

interface LivePhase {
  runId: string;
  phase: Phase;
  memoriesCount?: number;
  proposalsCount?: number;
  approvedCount?: number;
  rejectedCount?: number;
  mergedCount?: number;
  prunedCount?: number;
  error?: string;
  ts: number;
}

const PHASE_CONFIG: Record<
  string,
  { icon: string; dot: string; color: string; label: string }
> = {
  started: { icon: "🚀", dot: "bg-sky-400", color: "text-sky-400", label: "STARTED" },
  loaded: { icon: "📥", dot: "bg-sky-400", color: "text-sky-400", label: "LOADED MEMORIES" },
  proposing: {
    icon: "📋",
    dot: "bg-emerald-400 animate-pulse",
    color: "text-emerald-400",
    label: "PROPOSER THINKING",
  },
  proposed: {
    icon: "📋",
    dot: "bg-emerald-400",
    color: "text-emerald-400",
    label: "PROPOSALS GENERATED",
  },
  challenging: {
    icon: "⚖️",
    dot: "bg-amber-400 animate-pulse",
    color: "text-amber-400",
    label: "ADVERSARY EVALUATING",
  },
  challenged: {
    icon: "⚖️",
    dot: "bg-amber-400",
    color: "text-amber-400",
    label: "OBJECTIONS REGISTERED",
  },
  judging: {
    icon: "⚖️",
    dot: "bg-amber-400 animate-pulse",
    color: "text-amber-400",
    label: "JUDGE DELIBERATING",
  },
  judged: { icon: "⚖️", dot: "bg-amber-400", color: "text-amber-400", label: "VERDICT RESOLVED" },
  applying: { icon: "🔧", dot: "bg-cyan-400 animate-pulse", color: "text-cyan-400", label: "APPLYING CHANGES" },
  completed: {
    icon: "🏁",
    dot: "bg-emerald-400",
    color: "text-emerald-400",
    label: "COMPLETED",
  },
  failed: { icon: "❌", dot: "bg-rose-400", color: "text-rose-400", label: "FAILED" },
};

function timeAgo(ts?: number): string {
  if (!ts) return "—";
  const diff = Date.now() - ts;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

interface ConsolidationPanelProps {
  convex?: {
    consolidationRuns: any[];
  };
}

export function ConsolidationPanel({ convex }: ConsolidationPanelProps) {
  const runs = convex?.consolidationRuns || [];
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [livePhases, setLivePhases] = useState<Record<string, LivePhase[]>>({});
  const [triggering, setTriggering] = useState(false);

  useSocket((evt) => {
    if (
      evt.event === "consolidation_started" ||
      evt.event === "consolidation_phase" ||
      evt.event === "consolidation_completed" ||
      evt.event === "consolidation_failed"
    ) {
      const data = evt.data as any;
      const id = data.runId;
      if (!id) return;
      let phase: Phase;
      if (evt.event === "consolidation_started") phase = "loaded";
      else if (evt.event === "consolidation_completed") phase = "completed";
      else if (evt.event === "consolidation_failed") phase = "failed";
      else phase = data.phase as Phase;
      setLivePhases((prev) => {
        const next = { ...prev };
        next[id] = [
          ...(prev[id] ?? []),
          { ...data, phase, runId: id, ts: evt.at },
        ];
        return next;
      });
    }
  });

  async function triggerManual() {
    setTriggering(true);
    try {
      await fetch("/api/consolidate", { method: "POST" });
    } catch (err) {
      console.error(err);
    } finally {
      setTimeout(() => setTriggering(false), 1500);
    }
  }

  if (selectedId) {
    return (
      <ConsolidationDetail
        runId={selectedId}
        runs={runs}
        phases={livePhases[selectedId] ?? []}
        onBack={() => setSelectedId(null)}
      />
    );
  }

  return (
    <div className="flex flex-col h-full -m-5">
      <div
        className="shrink-0 border-b px-5 py-3.5 flex items-center justify-between backdrop-blur-md"
        style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-header-bg)' }}
      >
        <div className="flex items-center gap-3">
          <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--theme-secondary)' }}>
            Memory Consolidation
          </h2>
          <span className="text-[10px] px-2 py-0.5 rounded-full font-mono" style={{ background: 'var(--theme-surface-alt)', color: 'var(--theme-muted)' }}>
            {runs.length} run(s)
          </span>
        </div>
        <button
          onClick={triggerManual}
          disabled={triggering}
          className="text-xs px-3.5 py-1.5 rounded-xl font-semibold shadow-md active:scale-95 disabled:opacity-50 transition-all"
          style={{
            background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)',
            color: '#FFF',
          }}
        >
          {triggering ? "Running debate…" : "Run debate loop"}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {runs.length === 0 ? (
          <div className="py-16 text-center border border-dashed rounded-2xl p-6" style={{ borderColor: 'var(--theme-border)' }}>
            <div className="text-sm font-medium" style={{ color: 'var(--theme-primary)' }}>No consolidation runs yet</div>
            <div className="text-xs mt-1.5 leading-relaxed" style={{ color: 'var(--theme-muted)' }}>
              Consolidation runs automatically in the background, or click "Run debate loop" to start a proposer-adversary-judge pipeline manual trigger.
            </div>
          </div>
        ) : (
          runs.map((run: any) => {
            const isActive = run.status === "running";
            const statusCfg =
              run.status === "completed"
                ? PHASE_CONFIG.completed
                : run.status === "failed"
                  ? PHASE_CONFIG.failed
                  : PHASE_CONFIG.started;
            const durationMs =
              run.completedAt && run.startedAt
                ? run.completedAt - run.startedAt
                : Date.now() - run.startedAt;
            return (
              <div
                key={run.runId}
                onClick={() => setSelectedId(run.runId)}
                className="border rounded-2xl p-5 cursor-pointer transition-all duration-300 hover:shadow-lg backdrop-blur-sm hover:scale-[1.005]"
                style={{
                  background: 'var(--theme-surface-alt, rgba(255, 255, 255, 0.02))',
                  borderColor: 'var(--theme-border)',
                }}
              >
                <div className="flex items-center gap-2.5 mb-2.5">
                  <span className="relative flex h-2 w-2 shrink-0">
                    {isActive && (
                      <span className={`absolute inline-flex h-full w-full rounded-full animate-ping opacity-75 ${statusCfg.dot}`} />
                    )}
                    <span className={`relative inline-flex rounded-full h-2 w-2 ${statusCfg.dot}`} />
                  </span>
                  <span className="text-xs font-semibold tracking-wide" style={{ color: 'var(--theme-primary)' }}>
                    {statusCfg.label}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded" style={{ background: 'var(--theme-surface-alt)', color: 'var(--theme-muted)' }}>
                    trigger: {run.trigger}
                  </span>
                  <span className="text-[10px] ml-auto font-mono" style={{ color: 'var(--theme-muted)' }}>
                    {timeAgo(run.startedAt)} · {(durationMs / 1000).toFixed(1)}s
                  </span>
                </div>

                <div className="flex items-center gap-4 text-xs font-mono">
                  <Metric
                    label="proposals"
                    value={run.proposalsCount}
                    color="text-emerald-400"
                  />
                  <Metric
                    label="merged"
                    value={run.mergedCount}
                    color="text-sky-400"
                  />
                  <Metric
                    label="pruned"
                    value={run.prunedCount}
                    color="text-rose-400"
                  />
                  {run.notes && (
                    <span className="truncate max-w-[200px] opacity-60" style={{ color: 'var(--theme-muted)' }}>
                      · {run.notes}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <span>
      <span className={`font-semibold ${color}`}>{value ?? 0}</span>
      <span className="opacity-60 ml-1" style={{ color: 'var(--theme-muted)' }}>{label}</span>
    </span>
  );
}

function ConsolidationDetail({
  runId,
  runs,
  phases,
  onBack,
}: {
  runId: string;
  runs: any[];
  phases: LivePhase[];
  onBack: () => void;
}) {
  const run = runs?.find((r: any) => r.runId === runId);
  const [allPhases, setAllPhases] = useState<LivePhase[]>(phases);

  useSocket((evt) => {
    const data = evt.data as any;
    if (data?.runId !== runId) return;
    if (
      evt.event === "consolidation_phase" ||
      evt.event === "consolidation_started" ||
      evt.event === "consolidation_completed" ||
      evt.event === "consolidation_failed"
    ) {
      let phase: Phase;
      if (evt.event === "consolidation_started") phase = "loaded";
      else if (evt.event === "consolidation_completed") phase = "completed";
      else if (evt.event === "consolidation_failed") phase = "failed";
      else phase = data.phase as Phase;
      setAllPhases((prev) => [...prev, { ...data, phase, runId, ts: evt.at }]);
    }
  });

  useEffect(() => {
    setAllPhases(phases);
  }, [runId, phases]);

  if (!run) {
    return (
      <div className="p-5">
        <button
          onClick={onBack}
          className="text-xs px-3 py-1.5 rounded-xl border font-semibold transition-all hover:bg-[rgba(255,255,255,0.05)] active:scale-95 mb-4"
          style={{ borderColor: 'var(--theme-border)', color: 'var(--theme-primary)' }}
        >
          ← Back to runs
        </button>
        <div className="text-sm animate-pulse" style={{ color: 'var(--theme-muted)' }}>
          Loading run {runId}…
        </div>
      </div>
    );
  }

  const statusCfg =
    run.status === "completed"
      ? PHASE_CONFIG.completed
      : run.status === "failed"
        ? PHASE_CONFIG.failed
        : PHASE_CONFIG.started;

  return (
    <div className="flex flex-col h-full -m-5">
      <div
        className="shrink-0 border-b px-5 py-3 flex items-center justify-between backdrop-blur-md"
        style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-header-bg)' }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="text-xs px-2.5 py-1.5 rounded-lg border font-semibold transition-all hover:bg-[rgba(255,255,255,0.05)] active:scale-95"
            style={{ borderColor: 'var(--theme-border)', color: 'var(--theme-primary)' }}
          >
            ← Back
          </button>
          <span className="relative flex h-2 w-2 shrink-0">
            {run.status === "running" && (
              <span className={`absolute inline-flex h-full w-full rounded-full animate-ping opacity-75 ${statusCfg.dot}`} />
            )}
            <span className={`relative inline-flex rounded-full h-2 w-2 ${statusCfg.dot}`} />
          </span>
          <span className="text-sm font-semibold" style={{ color: 'var(--theme-primary)' }}>
            Consolidation {runId.slice(-6)}
          </span>
          <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${statusCfg.color} bg-[rgba(255,255,255,0.05)]`}>
            {statusCfg.label}
          </span>
        </div>
        <span className="text-[10px] font-mono opacity-65" style={{ color: 'var(--theme-muted)' }}>
          trigger: {run.trigger}
        </span>
      </div>

      <div
        className="shrink-0 border-b px-5 py-3 grid grid-cols-4 gap-4 text-center"
        style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface-alt, rgba(0,0,0,0.15))' }}
      >
        <SummaryStat label="proposals" value={run.proposalsCount} color="text-emerald-400" />
        <SummaryStat label="merged" value={run.mergedCount} color="text-sky-400" />
        <SummaryStat label="pruned" value={run.prunedCount} color="text-rose-400" />
        <SummaryStat
          label="duration"
          value={
            run.completedAt && run.startedAt
              ? `${((run.completedAt - run.startedAt) / 1000).toFixed(1)}s`
              : "running…"
          }
          color="text-slate-300"
        />
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        <section>
          <div className="text-[10px] font-semibold uppercase tracking-wider mb-3.5 opacity-60" style={{ color: 'var(--theme-secondary)' }}>
            Pipeline Timeline
          </div>
          {allPhases.length === 0 ? (
            <div className="text-xs" style={{ color: 'var(--theme-muted)' }}>
              {run.status === "completed" || run.status === "failed"
                ? "This run already completed. View decisions below."
                : "Awaiting pipeline phase events…"}
            </div>
          ) : (
            <div className="space-y-0 relative border-l-2 ml-2 pl-4" style={{ borderColor: 'var(--theme-border)' }}>
              {allPhases.map((p, i) => {
                const cfg = PHASE_CONFIG[p.phase] ?? PHASE_CONFIG.started;
                return (
                  <div key={`${p.ts}-${i}`} className="relative pb-4 flex gap-3 flex-col">
                    <span className="absolute -left-[23px] top-1.5 flex h-2 w-2 rounded-full" style={{ background: cfg.color.includes('rose') ? '#EF4444' : cfg.color.includes('emerald') ? '#10B981' : '#F59E0B' }} />
                    <div className="flex items-center gap-2">
                      <span className="text-[14px]">{cfg.icon}</span>
                      <span className={`text-[10px] font-bold tracking-wider ${cfg.color}`}>{cfg.label}</span>
                      <span className="text-[9px] font-mono opacity-50" style={{ color: 'var(--theme-muted)' }}>
                        {new Date(p.ts).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="text-xs opacity-80 pl-6" style={{ color: 'var(--theme-primary)' }}>
                      {p.memoriesCount !== undefined && `Memories scanned: ${p.memoriesCount}`}
                      {p.proposalsCount !== undefined && `Debated Proposals: ${p.proposalsCount}`}
                      {p.approvedCount !== undefined && `Verdict: Approved ${p.approvedCount} / Rejected ${p.rejectedCount ?? 0}`}
                      {p.mergedCount !== undefined && `Execution: Merged ${p.mergedCount} / Pruned ${p.prunedCount ?? 0}`}
                      {p.error && <span className="text-rose-400 font-medium">Error: {p.error}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <ReasoningSection run={run} />

        {run.notes && (
          <section className="border-t pt-4" style={{ borderColor: 'var(--theme-border)' }}>
            <div className="text-[10px] font-semibold uppercase tracking-wider mb-2 opacity-60" style={{ color: 'var(--theme-secondary)' }}>
              Notes
            </div>
            <div className="text-xs leading-relaxed" style={{ color: 'var(--theme-primary)' }}>
              {run.notes}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function SummaryStat({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div>
      <div className={`text-lg font-bold font-mono ${color}`}>{value ?? 0}</div>
      <div className="text-[9px] font-bold uppercase tracking-wider opacity-60 mt-0.5" style={{ color: 'var(--theme-muted)' }}>
        {label}
      </div>
    </div>
  );
}

function ReasoningSection({ run }: { run: any }) {
  let details: any = null;
  try {
    details = run.details ? JSON.parse(run.details) : null;
  } catch {}

  if (!details || !details.proposals?.length) {
    return (
      <section className="border-t pt-4" style={{ borderColor: 'var(--theme-border)' }}>
        <div className="text-[10px] font-semibold uppercase tracking-wider mb-2 opacity-60" style={{ color: 'var(--theme-secondary)' }}>
          Proposals & Decisions
        </div>
        <div className="text-xs" style={{ color: 'var(--theme-muted)' }}>
          {run.status === "running"
            ? "Debated proposals will load incrementally."
            : run.proposalsCount === 0
              ? "Proposer determined memory state is clean; no changes proposed."
              : "No stored details are available for this run."}
        </div>
      </section>
    );
  }

  const verdicts: any[] = details.verdicts ?? [];
  const verdictMap = new Map<number, any>();
  for (const v of verdicts) verdictMap.set(v.proposalIndex, v);

  return (
    <section className="border-t pt-4" style={{ borderColor: 'var(--theme-border)' }}>
      <div className="text-[10px] font-semibold uppercase tracking-wider mb-3.5 opacity-60" style={{ color: 'var(--theme-secondary)' }}>
        Proposals & Decisions · {details.proposals.length} total
      </div>
      <div className="space-y-3.5">
        {details.proposals.map((p: any, idx: number) => {
          const v = verdictMap.get(idx);
          const approved = v && v.decision !== 'reject';
          const modified = v && v.decision === 'modify';
          const statusLabel = !v ? "NO VERDICT" : v.decision.toUpperCase();
          const statusColor = !v
            ? "text-slate-400 bg-slate-500/10 border-slate-500/20"
            : approved
              ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
              : "text-rose-400 bg-rose-500/10 border-rose-500/20";

          return (
            <div
              key={idx}
              className="border rounded-2xl p-4 transition-all hover:shadow-md"
              style={{
                background: 'var(--theme-surface-alt, rgba(255, 255, 255, 0.015))',
                borderColor: 'var(--theme-border)',
              }}
            >
              <div className="flex items-center gap-2 mb-3">
                <span className={`text-[9px] px-2 py-0.5 rounded border font-bold font-mono ${statusColor}`}>
                  {statusLabel}
                </span>
                <span className="text-[9px] font-mono px-2 py-0.5 rounded border uppercase opacity-75" style={{ borderColor: 'var(--theme-border)', color: 'var(--theme-primary)' }}>
                  {p.action}
                </span>
                <span className="text-[10px] font-mono ml-auto opacity-50" style={{ color: 'var(--theme-muted)' }}>
                  #{idx}
                </span>
              </div>

              <div className="text-xs space-y-2 font-mono">
                <div style={{ color: 'var(--theme-primary)' }}>
                  <span className="opacity-50" style={{ color: 'var(--theme-muted)' }}>Action:</span> {p.action}
                </div>
                {p.targetIds && p.targetIds.length > 0 && (
                  <div style={{ color: 'var(--theme-primary)' }}>
                    <span className="opacity-50" style={{ color: 'var(--theme-muted)' }}>Targets:</span> {p.targetIds.join(', ')}
                  </div>
                )}
                {p.replacementContent && (
                  <div className="p-2.5 rounded border text-[11px] leading-relaxed" style={{ background: 'var(--theme-bg, rgba(0,0,0,0.15))', borderColor: 'var(--theme-border)', color: 'var(--theme-primary)' }}>
                    {p.replacementContent}
                  </div>
                )}
                {p.reason && (
                  <div className="text-[11px] leading-relaxed opacity-75" style={{ color: 'var(--theme-muted)' }}>
                    <span className="opacity-50">Reason:</span> {p.reason}
                  </div>
                )}
              </div>

              {v && (
                <div className="mt-3 pt-3 border-t text-[11px] leading-relaxed" style={{ borderColor: 'var(--theme-border)', color: 'var(--theme-muted)' }}>
                  <span className={`font-bold ${approved ? "text-emerald-400" : "text-rose-400"}`}>
                    JUDGEMENT:
                  </span>{" "}
                  {v.reason}
                  {modified && v.finalContent && (
                    <div className="mt-2 p-2.5 rounded border text-[11px] font-mono" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.05), rgba(5,150,105,0.05))', borderColor: 'rgba(16,185,129,0.2)', color: '#10B981' }}>
                      <span className="font-bold">Modified to:</span> {v.finalContent}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
