import React from 'react';
import { motion } from 'motion/react';
import { Hammer, Search, Cpu, Sparkles, Workflow, Cable, Activity, Database, TerminalSquare } from 'lucide-react';

interface RealtimePipelineAnimationProps {
  statusLabel?: string;
}

const PIPELINE_STAGES = [
  { id: 'ingest', label: 'Input', icon: Database },
  { id: 'route', label: 'Route', icon: Cable },
  { id: 'process', label: 'Process', icon: Activity },
  { id: 'emit', label: 'Output', icon: TerminalSquare }
] as const;

export const RealtimePipelineAnimation = ({ statusLabel }: RealtimePipelineAnimationProps) => (
  <div className="relative overflow-hidden rounded-2xl border border-[#23313A] bg-[linear-gradient(180deg,rgba(10,16,21,0.98)_0%,rgba(8,12,16,0.98)_100%)] px-4 py-4 text-left shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.10),transparent_38%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.10),transparent_34%)] pointer-events-none" />
    <motion.div
      animate={{ x: ['-10%', '110%'] }}
      transition={{ repeat: Infinity, duration: 2.8, ease: 'linear' }}
      className="pointer-events-none absolute left-0 top-[58px] h-px w-28 bg-[linear-gradient(90deg,rgba(34,211,238,0),rgba(34,211,238,0.95),rgba(16,185,129,0))]"
    />

    <div className="relative flex items-start gap-3">
      <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10">
        <motion.div
          animate={{ rotate: 360, scale: [1, 1.04, 1] }}
          transition={{ rotate: { repeat: Infinity, duration: 6, ease: 'linear' }, scale: { repeat: Infinity, duration: 1.8, ease: 'easeInOut' } }}
          className="text-cyan-300"
        >
          <Workflow size={18} strokeWidth={2.2} />
        </motion.div>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-cyan-200/80">
            Realtime Pipeline
          </span>
          <motion.span
            animate={{ opacity: [0.25, 1, 0.25], scale: [0.9, 1.15, 0.9] }}
            transition={{ repeat: Infinity, duration: 1.2 }}
            className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]"
          />
        </div>

        <p className="mt-1 text-sm font-semibold text-[#E6F4F7]">
          {statusLabel || 'Streaming work through the active response pipeline.'}
        </p>

        <div className="mt-3 grid grid-cols-4 gap-2">
          {PIPELINE_STAGES.map((stage, idx) => {
            const Icon = stage.icon;
            return (
              <div key={stage.id} className="relative">
                <motion.div
                  animate={{ opacity: [0.55, 1, 0.55], y: [0, -2, 0] }}
                  transition={{ repeat: Infinity, duration: 1.6, delay: idx * 0.18, ease: 'easeInOut' }}
                  className="rounded-xl border border-cyan-500/10 bg-white/[0.03] px-2 py-2"
                >
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-cyan-400/15 bg-cyan-400/8 text-cyan-300">
                      <Icon size={12} strokeWidth={2.1} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-cyan-100/60">
                        {stage.label}
                      </div>
                      <div className="mt-1 h-1 overflow-hidden rounded-full bg-cyan-950/70">
                        <motion.div
                          animate={{ x: ['-100%', '140%'] }}
                          transition={{ repeat: Infinity, duration: 1.35, delay: idx * 0.12, ease: 'easeInOut' }}
                          className="h-full w-3/4 rounded-full bg-[linear-gradient(90deg,rgba(34,211,238,0),rgba(34,211,238,0.95),rgba(16,185,129,0.9),rgba(34,211,238,0))]"
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>

                {idx < PIPELINE_STAGES.length - 1 && (
                  <div className="pointer-events-none absolute -right-1.5 top-1/2 hidden h-px w-3 -translate-y-1/2 bg-cyan-400/30 sm:block" />
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex items-center gap-2 text-[11px] text-cyan-50/70">
          <span className="font-mono text-cyan-300/90">$ live_status</span>
          <div className="h-px flex-1 bg-[linear-gradient(90deg,rgba(34,211,238,0.4),rgba(34,211,238,0.02))]" />
        </div>
      </div>
    </div>
  </div>
);

/**
 * 🎨 Web Search Animation
 * Highly immersive, spinning orbit radar with orbiting dot waves and glowing rings
 */
export const WebSearchAnimation = () => (
  <div className="flex items-center justify-center relative w-7 h-7 select-none pointer-events-none">
    {/* Concentric expanding wave 1 */}
    <motion.div
      initial={{ scale: 0.8, opacity: 0.6 }}
      animate={{ scale: 1.8, opacity: 0 }}
      transition={{
        repeat: Infinity,
        duration: 1.6,
        ease: "easeOut"
      }}
      className="absolute inset-0 rounded-full border border-cyan-500/30"
    />
    
    {/* Concentric expanding wave 2 */}
    <motion.div
      initial={{ scale: 0.8, opacity: 0.4 }}
      animate={{ scale: 2.3, opacity: 0 }}
      transition={{
        repeat: Infinity,
        duration: 1.6,
        delay: 0.4,
        ease: "easeOut"
      }}
      className="absolute inset-0 rounded-full border border-cyan-400/20"
    />

    {/* Glowing background glow */}
    <div className="absolute inset-0 bg-cyan-500/10 blur-md rounded-full" />

    {/* Rotating external orbit dash ring */}
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, duration: 6, ease: "linear" }}
      className="absolute -inset-1 rounded-full border border-dashed border-cyan-550/40 dark:border-cyan-400/30"
    />

    {/* Rotating internal ring with single satellite dot */}
    <motion.div
      animate={{ rotate: -360 }}
      transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
      className="absolute inset-0.5 rounded-full border border-cyan-500/20"
    >
      <div className="absolute top-0 left-1/2 -ml-0.5 w-1 h-1 bg-cyan-400 rounded-full shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
    </motion.div>

    {/* Center content */}
    <motion.div
      animate={{ scale: [1, 1.1, 1] }}
      transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
      className="relative z-10 flex items-center justify-center text-cyan-550 dark:text-cyan-400 bg-cyan-950/20 border border-cyan-500/40 rounded-full w-5 h-5"
    >
      <Search size={10} strokeWidth={2.5} />
    </motion.div>
  </div>
);

/**
 * 🛠️ Standard Tool Calling Animation
 * A premium rotating blueprint grid with a swinging, high-tech hammer,
 * expanding emerald particles, and active circuit-board traces.
 */
export const ToolCallingAnimation = () => (
  <div className="flex items-center justify-center relative w-7 h-7 select-none pointer-events-none">
    {/* Radiant circular radar line */}
    <motion.div
      initial={{ scale: 0.8, opacity: 0.8 }}
      animate={{ scale: 1.9, opacity: 0 }}
      transition={{
        repeat: Infinity,
        duration: 2.0,
        ease: "easeOut"
      }}
      className="absolute inset-0 rounded-full border border-emerald-500/30"
    />

    {/* Ambient shadow glow */}
    <div className="absolute inset-0 bg-emerald-500/15 blur-lg rounded-full" />

    {/* Spinning hexagonal gear trace */}
    <motion.svg
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
      viewBox="0 0 24 24"
      className="absolute -inset-1.5 w-10 h-10 text-emerald-500/30 dark:text-emerald-400/20"
    >
      <path
        stroke="currentColor"
        strokeWidth="1.5"
        strokeDasharray="4 3"
        fill="none"
        d="M12 2 L20.66 7 L20.66 17 L12 22 L3.34 17 L3.34 7 Z"
      />
    </motion.svg>

    {/* Ring with a pulsing orbit dot */}
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
      className="absolute inset-0 rounded-full border border-emerald-550/20 dark:border-emerald-500/20"
    >
      <div className="absolute bottom-0 left-1/2 -ml-0.5 w-1 h-1 bg-emerald-500 rounded-full shadow-[0_0_6px_#10b981]" />
    </motion.div>

    {/* Swinging instrument core */}
    <motion.div
      animate={{ 
        rotate: [0, -20, 20, 0],
        scale: [1, 1.1, 1, 1]
      }}
      transition={{ 
        repeat: Infinity, 
        duration: 2, 
        ease: "easeInOut" 
      }}
      className="relative z-10 flex items-center justify-center text-emerald-550 dark:text-emerald-400 bg-emerald-950/20 border border-emerald-550/45 dark:border-emerald-500/40 rounded-full w-5.5 h-5.5"
    >
      <Hammer size={11} strokeWidth={2.2} />
    </motion.div>
  </div>
);

/**
 * ✨ Lumina Agent Spark Core Tool Calling Animation
 * A gorgeous amber/orange stellar-particle generator with active floating energy dots,
 * representing intelligent reasoning and powerful cloud agent operations.
 */
export const LuminaToolCallingAnimation = () => (
  <div className="flex items-center justify-center relative w-7 h-7 select-none pointer-events-none">
    {/* Outward ripples */}
    <motion.div
      initial={{ scale: 0.7, opacity: 0.9 }}
      animate={{ scale: 2.0, opacity: 0 }}
      transition={{
        repeat: Infinity,
        duration: 1.5,
        ease: "easeInOut"
      }}
      className="absolute inset-0 rounded-full border border-amber-500/40 dark:border-orange-500/30"
    />

    {/* Deep particle blur backing */}
    <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/20 to-orange-500/20 blur-xl rounded-full" />

    {/* Rotating double-axis gear ring */}
    <motion.div
      animate={{ rotate: -360 }}
      transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
      className="absolute -inset-1 border border-dashed border-orange-500/30 dark:border-orange-400/20 rounded-full"
    />

    {/* Active sparks floating out */}
    {[0, 120, 240].map((angle, idx) => (
      <motion.div
        key={idx}
        animate={{
          scale: [0.5, 1.2, 0.5],
          opacity: [0.3, 1, 0.3],
          y: [-2, -8, -2],
          x: [0, Math.sin(angle * Math.PI / 180) * 6, 0]
        }}
        transition={{
          repeat: Infinity,
          duration: 1.4 + idx * 0.2,
          ease: "easeInOut"
        }}
        className="absolute w-1 h-1 rounded-full bg-amber-400 shadow-[0_0_8px_#f59e0b]"
        style={{
          lineHeight: 0
        }}
      />
    ))}

    {/* Center sparkling core */}
    <motion.div
      animate={{ 
        scale: [1, 1.15, 0.9, 1],
        rotate: [0, 8, -8, 0]
      }}
      transition={{ 
        repeat: Infinity, 
        duration: 1.8, 
        ease: "easeInOut" 
      }}
      className="relative z-10 flex items-center justify-center text-amber-550 dark:text-amber-400 bg-amber-950/20 border border-orange-500/50 rounded-full w-5.5 h-5.5 shadow-[0_0_12px_rgba(245,158,11,0.15)]"
    >
      <Sparkles size={11} strokeWidth={2.2} />
    </motion.div>
  </div>
);

export const AgentThinkingFlowAnimation = () => (
  <div className="flex items-center justify-center relative w-7 h-7 select-none pointer-events-none">
    {/* Radiant circular radar line */}
    <motion.div
      initial={{ scale: 0.8, opacity: 0.8 }}
      animate={{ scale: 1.9, opacity: 0 }}
      transition={{
        repeat: Infinity,
        duration: 2.0,
        ease: "easeOut"
      }}
      className="absolute inset-0 rounded-full border border-cyan-500/30"
    />

    {/* Ambient shadow glow */}
    <div className="absolute inset-0 bg-cyan-500/15 blur-lg rounded-full" />

    {/* Ring with a pulsing orbit dot */}
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
      className="absolute inset-0 rounded-full border border-cyan-500/20"
    >
      <div className="absolute bottom-0 left-1/2 -ml-0.5 w-1 h-1 bg-cyan-400 rounded-full shadow-[0_0_6px_#22d3ee]" />
    </motion.div>

    {/* Centered Cpu core */}
    <motion.div
      animate={{ 
        scale: [1, 1.1, 1],
        rotate: [0, 5, -5, 0]
      }}
      transition={{ 
        repeat: Infinity, 
        duration: 2, 
        ease: "easeInOut" 
      }}
      className="relative z-10 flex items-center justify-center text-cyan-400 bg-cyan-950/20 border border-cyan-500/40 rounded-full w-5.5 h-5.5"
    >
      <Cpu size={11} strokeWidth={2.2} />
    </motion.div>
  </div>
);

/**
 * 🔗 Composio Tool Calling Animation
 * A beautiful violet/indigo high-tech socket/flow representation
 * representing data pipeline integration, api tunnels, and secure triggers.
 */
export const ComposioToolCallingAnimation = () => (
  <div className="flex items-center justify-center relative w-7 h-7 select-none pointer-events-none">
    {/* Concentric outward wave */}
    <motion.div
      initial={{ scale: 0.8, opacity: 0.8 }}
      animate={{ scale: 2.1, opacity: 0 }}
      transition={{
        repeat: Infinity,
        duration: 1.8,
        ease: "easeOut"
      }}
      className="absolute inset-0 rounded-full border border-violet-500/40"
    />

    {/* Purple core glow backing */}
    <div className="absolute inset-0 bg-violet-500/15 blur-md rounded-full" />

    {/* Rotating dashed planetary ring */}
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, duration: 5, ease: "linear" }}
      className="absolute -inset-1 rounded-full border border-dashed border-indigo-500/30 dark:border-indigo-400/20"
    />

    {/* Orbiting flow dot */}
    <motion.div
      animate={{ rotate: -360 }}
      transition={{ repeat: Infinity, duration: 2.5, ease: "linear" }}
      className="absolute inset-0.5 rounded-full border border-violet-500/10"
    >
      <div className="absolute top-0 left-1/2 -ml-0.5 w-1 h-1 bg-violet-400 rounded-full shadow-[0_0_8px_#8b5cf6]" />
    </motion.div>

    {/* Central Pulsing Connector */}
    <motion.div
      animate={{ 
        scale: [1, 1.12, 1],
        rotate: [0, 5, -5, 0]
      }}
      transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
      className="relative z-10 flex items-center justify-center text-violet-600 dark:text-violet-400 bg-violet-950/20 border border-indigo-500/40 rounded-full w-5.5 h-5.5 shadow-[0_0_10px_rgba(139,92,246,0.2)]"
    >
      <Workflow size={11} strokeWidth={2.4} />
    </motion.div>
  </div>
);
