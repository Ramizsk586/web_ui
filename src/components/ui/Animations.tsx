import React from 'react';
import { motion } from 'motion/react';
import { Hammer, Search, Cpu, Sparkles, Workflow, Cable } from 'lucide-react';

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
