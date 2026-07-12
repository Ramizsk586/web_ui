import React from "react";

const EVENT_COLOR: Record<string, string> = {
  "memory.written": "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  "memory.recalled": "bg-sky-500/20 text-sky-400 border-sky-500/30",
  "memory.extracted": "bg-violet-500/20 text-violet-400 border-violet-500/30",
  "memory.consolidated": "bg-amber-500/20 text-amber-400 border-amber-500/30",
  "memory.cleaned": "bg-slate-500/20 text-slate-400 border-slate-500/30",
  "agent_spawned": "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
  "agent_done": "bg-purple-500/20 text-purple-400 border-purple-500/30",
};

interface ActivityEvent {
  eventType: string;
  source: string;
  message: string;
  metadata?: Record<string, string>;
  createdAt: number;
}

interface EventsPanelProps {
  convex?: {
    events: ActivityEvent[];
    clearAllEvents?: () => Promise<void>;
  };
}

export function EventsPanel({ convex }: EventsPanelProps) {
  const events = convex?.events;

  async function handleClear() {
    if (convex?.clearAllEvents) {
      await convex.clearAllEvents();
    }
  }

  return (
    <div className="flex flex-col h-full -m-5">
      <div
        className="shrink-0 border-b px-5 py-3.5 flex items-center justify-between backdrop-blur-md"
        style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-header-bg)' }}
      >
        <div className="flex items-center gap-3">
          <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--theme-secondary)' }}>
            System Events
          </h2>
          {events && events.length > 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full font-mono" style={{ background: 'var(--theme-surface-alt)', color: 'var(--theme-muted)' }}>
              {events.length} event(s)
            </span>
          )}
        </div>
        {events && events.length > 0 && (
          <button
            onClick={handleClear}
            className="text-xs px-3 py-1.5 rounded-xl border font-medium transition-all hover:bg-[rgba(255,255,255,0.05)] active:scale-95"
            style={{ borderColor: 'var(--theme-border)', color: 'var(--theme-muted)' }}
          >
            Clear Log
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-3">
        {!events ? (
          <div className="py-12 text-center text-sm animate-pulse" style={{ color: 'var(--theme-muted)' }}>
            Loading event stream…
          </div>
        ) : events.length === 0 ? (
          <div className="py-16 text-center border border-dashed rounded-2xl p-6" style={{ borderColor: 'var(--theme-border)' }}>
            <div className="text-sm font-medium" style={{ color: 'var(--theme-primary)' }}>No events yet</div>
            <div className="text-xs mt-1.5 leading-relaxed" style={{ color: 'var(--theme-muted)' }}>
              Activities, memory recall events, and background agent launches will appear here in real-time.
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {events.map((e, idx) => (
              <div
                key={idx}
                className="border rounded-2xl p-4 transition-all duration-300 hover:shadow-md backdrop-blur-sm"
                style={{
                  background: 'var(--theme-surface-alt, rgba(255, 255, 255, 0.02))',
                  borderColor: 'var(--theme-border)',
                }}
              >
                <div className="flex items-center gap-2.5 text-[10px] font-mono mb-2">
                  <span className={`px-2 py-0.5 rounded-md border font-semibold ${EVENT_COLOR[e.eventType] ?? "bg-slate-800/40 text-slate-400 border-slate-700/50"}`}>
                    {e.eventType}
                  </span>
                  <span className="opacity-60" style={{ color: 'var(--theme-secondary)' }}>src:{e.source}</span>
                  <span className="ml-auto opacity-50" style={{ color: 'var(--theme-muted)' }}>
                    {new Date(e.createdAt).toLocaleTimeString()}
                  </span>
                </div>
                <div className="text-xs font-medium leading-relaxed" style={{ color: 'var(--theme-primary)' }}>
                  {e.message}
                </div>
                {e.metadata && Object.keys(e.metadata).length > 0 && (
                  <div className="mt-2 text-[10px] font-mono p-2 rounded-lg border flex flex-wrap gap-x-4 gap-y-1.5" style={{ background: 'var(--theme-bg, rgba(0,0,0,0.15))', borderColor: 'var(--theme-border)' }}>
                    {Object.entries(e.metadata).map(([k, v]) => (
                      <span key={k}>
                        <span className="opacity-55" style={{ color: 'var(--theme-muted)' }}>{k}:</span>
                        <span className="ml-1" style={{ color: 'var(--theme-secondary)' }}>{String(v)}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
