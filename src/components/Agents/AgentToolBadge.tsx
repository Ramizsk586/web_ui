import React from 'react';

interface AgentToolBadgeProps {
  label: string;
  icon: React.ReactNode;
  color?: string; // default 'text-teal-400'
}

export function AgentToolBadge({ label, icon, color = 'text-teal-400' }: AgentToolBadgeProps) {
  return (
    <div className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-900/80 border border-zinc-800 flex items-center gap-1 text-zinc-300 shadow-sm">
      <span className={`${color} flex items-center shrink-0`}>
        {icon}
      </span>
      <span className="font-medium shrink-0 leading-none">{label}</span>
    </div>
  );
}
