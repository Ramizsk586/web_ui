import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  KeyRound, 
  Workflow, 
  Radio, 
  Check, 
  Server, 
  AlertCircle, 
  Loader2, 
  Activity, 
  Layers, 
  ExternalLink 
} from 'lucide-react';
import { ToolCallNode } from '../types';

interface ComposioToolCallIndicatorProps {
  node: ToolCallNode;
}

export const ComposioToolCallIndicator: React.FC<ComposioToolCallIndicatorProps> = ({ node }) => {
  const { toolName, status, label, resultSummary } = node;
  const [elapsed, setElapsed] = useState(0);
  const [pulseIndex, setPulseIndex] = useState(0);

  const isActive = status === 'active';
  const isComplete = status === 'complete';
  const isFailed = status === 'failed';

  // 1. Live timer
  useEffect(() => {
    let timerID: any;
    if (isActive) {
      const start = Date.now();
      timerID = setInterval(() => {
        setElapsed(Math.round((Date.now() - start) / 100) / 10);
      }, 100);
    }
    return () => clearInterval(timerID);
  }, [isActive]);

  // 2. Cycle pipeline progress
  useEffect(() => {
    let timerID: any;
    if (isActive) {
      timerID = setInterval(() => {
        setPulseIndex(p => (p + 1) % 4);
      }, 1500);
    } else if (isComplete) {
      setPulseIndex(3);
    }
    return () => clearInterval(timerID);
  }, [isActive, isComplete]);

  // Extract parameters from label e.g. "composio_gmail_send_email ({ to: '...' })"
  const argsMatch = label.match(/\(([^)]+)\)/)?.[1] || '';

  const STAGES = [
    {
      id: 'auth_gate',
      label: 'Auth Checkpoint',
      activeText: 'Validating Composio OAuth & Access Key...',
      completeText: 'Connection established & authenticated',
      icon: KeyRound,
      color: 'from-teal-500 to-teal-600',
    },
    {
      id: 'schema_bind',
      label: 'Arg Schema Match',
      activeText: 'Mapping JSON argument schema to toolkit action...',
      completeText: 'Toolkit parameters validated successfully',
      icon: Workflow,
      color: 'from-teal-600 to-emerald-500',
    },
    {
      id: 'api_forward',
      label: 'Gateway Forward',
      activeText: 'Routing request down secure API tunnel gateway...',
      completeText: 'Remote action execution succeeded',
      icon: Radio,
      color: 'from-emerald-500 to-emerald-600',
    },
    {
      id: 'res_pack',
      label: 'Response Process',
      activeText: 'De-serializing provider callback values...',
      completeText: 'Execution complete. Return values formatted.',
      icon: Check,
      color: 'from-emerald-600 to-teal-500',
    }
  ];

  const currentStageText = isFailed 
    ? 'Composio integration action failed during execution' 
    : isComplete 
      ? STAGES[3].completeText 
      : STAGES[pulseIndex]?.activeText || 'Processing remote action...';

  return (
    <div className="mt-3.5 w-full ml-7 max-w-2xl text-xs font-sans">
      <div className="border border-zinc-200/10 dark:border-zinc-800 bg-white/40 dark:bg-zinc-950/40 rounded-xl p-4.5 shadow-lg flex flex-col gap-3.5 relative overflow-hidden">
        
        {/* Dynamic backdrop pulse */}
        {isActive && (
          <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/5 dark:bg-teal-400/5 rounded-full blur-2xl pointer-events-none" />
        )}

        {/* 1. Header Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="shrink-0 p-2 rounded-xl bg-teal-50 dark:bg-zinc-900 border border-teal-100 dark:border-zinc-800 shadow-inner flex items-center justify-center">
              {isActive ? (
                <Loader2 size={14} className="text-teal-500 dark:text-teal-400 animate-spin" />
              ) : isComplete ? (
                <div className="w-3.5 h-3.5 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/40">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-550" />
                </div>
              ) : (
                <AlertCircle size={14} className="text-rose-500 animate-pulse" />
              )}
            </span>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-zinc-900 dark:text-zinc-150 uppercase tracking-widest font-mono text-[9px] bg-teal-500/10 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 px-1.5 py-0.5 rounded-md border border-teal-500/10 dark:border-zinc-850">
                  Composio Integration
                </span>
                <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500">
                  {toolName?.replace('composio_', '').replace(/_/g, ' ')}
                </span>
              </div>
              <span className="text-[11.5px] font-semibold text-zinc-700 dark:text-zinc-300 mt-1">
                {isFailed ? 'Tool Execution Failed' : isComplete ? 'Action Execution Completed' : 'Streaming Active Live-Pipeline'}
              </span>
            </div>
          </div>

          <div className="text-[10.5px] font-mono text-zinc-400 dark:text-zinc-500 flex flex-col items-end">
            {isActive && (
              <span className="font-semibold text-teal-500 dark:text-teal-400 animate-pulse flex items-center gap-1">
                <Activity size={11} />
                {elapsed.toFixed(1)}s active
              </span>
            )}
            {!isActive && (
              <span className="text-zinc-500 font-medium">
                Type: Secure HTTPS Gateway
              </span>
            )}
          </div>
        </div>

        {/* 2. Visual Pipeline Core */}
        <div className="relative mt-2.5 py-4 px-3 bg-zinc-50/50 dark:bg-[#08080a]/60 rounded-xl border border-zinc-150 dark:border-zinc-900 shadow-inner">
          <div className="flex items-center justify-between relative z-10">
            {STAGES.map((step, idx) => {
              const StepIcon = step.icon;
              const isPast = idx < pulseIndex || isComplete;
              const isCurrent = idx === pulseIndex && isActive;
              const isFuture = idx > pulseIndex && !isComplete;

              return (
                <div key={step.id} className="flex flex-col items-center gap-2 relative z-15 flex-1 select-none">
                  {/* Circle Node */}
                  <motion.div 
                    animate={isCurrent ? { 
                      scale: [1, 1.15, 1],
                      boxShadow: ['0 0 0 rgba(20,184,166,0)', '0 0 12px rgba(20,184,166,0.3)', '0 0 0 rgba(20,184,166,0)']
                    } : {}}
                    transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
                    className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all duration-300 relative
                      ${isPast 
                        ? 'bg-gradient-to-tr from-emerald-500/10 to-teal-500/5 border-emerald-500/30 text-teal-600 dark:text-teal-400 shadow-[0_4px_12px_rgba(16,185,129,0.15)]' 
                        : isCurrent
                          ? `bg-teal-500/10 border-teal-500/50 text-teal-600 dark:text-teal-400 shadow-[0_0_12px_rgba(20,184,166,0.15)]`
                          : isFailed && idx === pulseIndex
                            ? 'bg-rose-500/10 border-rose-500/50 text-rose-500 shadow-[0_4px_12px_rgba(244,63,94,0.15)]'
                            : 'bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-400 dark:text-zinc-650'
                      }
                    `}
                  >
                    {isFailed && idx === pulseIndex ? (
                      <AlertCircle size={15} className="animate-bounce" />
                    ) : isPast ? (
                      <Check size={15} strokeWidth={2.5} />
                    ) : (
                      <StepIcon size={14} strokeWidth={2.2} />
                    )}

                    {/* Stage number bubble */}
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-zinc-200 dark:bg-zinc-830 text-[8.5px] font-bold font-mono border border-zinc-300 dark:border-zinc-700 flex items-center justify-center text-zinc-700 dark:text-zinc-300 shadow-sm">
                      {idx + 1}
                    </span>
                  </motion.div>

                  {/* Stage Label */}
                  <div className="flex flex-col items-center">
                    <span className={`text-[9.5px] font-bold transition-colors ${
                      isCurrent 
                        ? 'text-teal-600 dark:text-teal-400' 
                        : isPast 
                          ? 'text-emerald-600 dark:text-emerald-555' 
                          : isFailed && idx === pulseIndex 
                            ? 'text-rose-500 font-bold' 
                            : 'text-zinc-450 dark:text-zinc-600'
                    }`}>
                      {step.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Glowing Connection Flow Pipeline Lines */}
          <div className="absolute top-8.5 left-8 right-8 h-0.5 bg-zinc-200 dark:bg-zinc-850 -translate-y-1/2 z-0 rounded-full overflow-hidden">
            {isActive && (
              <motion.div 
                className="h-full bg-gradient-to-r from-teal-500 via-emerald-500 to-teal-400"
                initial={{ left: '-100%', width: '100%', position: 'absolute' }}
                animate={{ left: '100%' }}
                transition={{ repeat: Infinity, duration: 2.2, ease: 'linear' }}
              />
            )}
            {isComplete && (
              <div className="w-full h-full bg-emerald-500/50" />
            )}
            {isFailed && (
              <div className="w-full h-full bg-rose-500/30" />
            )}
          </div>
        </div>

        {/* 3. Terminal Live Status Line */}
        <div className="flex flex-col gap-2 select-none">
          <div className="flex justify-between items-center text-[10.5px]">
            <span className="text-zinc-600 dark:text-zinc-400 font-mono flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                {isActive ? (
                  <>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-500 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
                  </>
                ) : isComplete ? (
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                ) : (
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                )}
              </span>
              <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                {currentStageText}
              </span>
            </span>
            <span className="text-zinc-500 dark:text-zinc-650 font-mono text-[9px]">
              {isFailed ? 'Error Blocked' : isComplete ? 'Stage 4/4 Complete' : `Running Stage ${pulseIndex + 1}/4`}
            </span>
          </div>

          {/* Micro Progress Bar */}
          <div className="w-full bg-zinc-150 dark:bg-zinc-900 rounded-full h-1 overflow-hidden border border-zinc-200 dark:border-zinc-800">
            <motion.div 
              className={`bg-gradient-to-r ${isFailed ? 'from-rose-500 to-red-600' : 'from-teal-500 to-emerald-500'} h-full`}
              initial={{ width: '5%' }}
              animate={{ width: isComplete ? '100%' : isFailed ? `${(pulseIndex + 1) * 25}%` : `${(pulseIndex + 1) * 25}%` }}
              transition={{ duration: 0.8, ease: 'easeInOut' }}
            />
          </div>
        </div>

        {/* 4. Display args if active or completed */}
        {argsMatch && (
          <div className="mt-1 flex flex-col gap-1 text-left">
            <span className="text-[9.5px] font-bold text-zinc-450 dark:text-zinc-500 uppercase tracking-wider font-mono">Parameters Bound:</span>
            <pre className="text-[10px] font-mono p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-850 text-zinc-700 dark:text-zinc-400 overflow-x-auto max-h-24 custom-scrollbar whitespace-pre-wrap leading-relaxed shadow-inner">
              {argsMatch}
            </pre>
          </div>
        )}

        {/* 5. Return value summary */}
        {isComplete && resultSummary && (
          <div className="mt-1 flex flex-col gap-1 text-left">
            <span className="text-[9.5px] font-bold text-zinc-455 dark:text-zinc-500 uppercase tracking-wider font-mono">Execution Return:</span>
            <div className="p-2.5 rounded-lg bg-emerald-500/[0.02] dark:bg-emerald-950/5 border border-emerald-500/10 dark:border-emerald-500/15 text-[10.5px] text-zinc-700 dark:text-zinc-300 font-mono whitespace-pre-wrap leading-relaxed shadow-sm">
              {resultSummary}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
