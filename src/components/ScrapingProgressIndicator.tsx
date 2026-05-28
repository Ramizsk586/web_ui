import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Globe, Cpu, Hash, FileLineChart } from 'lucide-react';

interface ScrapingProgressIndicatorProps {
  status: 'pending' | 'active' | 'complete' | 'failed';
  url?: string;
}

export const ScrapingProgressIndicator: React.FC<ScrapingProgressIndicatorProps> = ({ status, url }) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [bytesCounter, setBytesCounter] = useState(0);
  const [elementsCounter, setElementsCounter] = useState(0);

  const steps = [
    'Resolving DNS Node Host...',
    'Establishing Secure Proxy...',
    'Discharging Agent Request...',
    'Downloading Document Payload...',
    'Sanitizing Document DOM...',
    'Executing Node Extraction...',
    'Complete!'
  ];

  // Progressive timer details
  useEffect(() => {
    if (status === 'active') {
      const stepTimer = setInterval(() => {
        setStepIndex(prev => {
          if (prev < steps.length - 2) return prev + 1;
          return prev;
        });
      }, 700);

      const bytesTimer = setInterval(() => {
        setBytesCounter(prev => prev + Math.floor(Math.random() * 8500) + 1200);
      }, 150);

      const elementsTimer = setInterval(() => {
        setElementsCounter(prev => prev + Math.floor(Math.random() * 3) + 1);
      }, 200);

      return () => {
        clearInterval(stepTimer);
        clearInterval(bytesTimer);
        clearInterval(elementsTimer);
      };
    } else if (status === 'complete') {
      setStepIndex(steps.length - 1); // Jump to Complete!
      if (bytesCounter === 0) setBytesCounter(84200);
      if (elementsCounter === 0) setElementsCounter(54);
    }
  }, [status]);

  // Clean domain name for display
  let cleanDomain = 'Target Host';
  if (url) {
    try {
      cleanDomain = new URL(url).hostname;
    } catch {}
  }

  return (
    <div className="p-3.5 bg-[#1C1816]/70 border border-[#2D241E]/50 rounded-lg text-xs font-mono mb-2 w-full max-w-md shadow-inner text-zinc-300">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Globe className="text-[#D97756] animate-pulse" size={13} />
          <span className="text-zinc-400 font-semibold truncate max-w-[150px] sm:max-w-xs">{cleanDomain}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className={`inline-block w-1.5 h-1.5 rounded-full ${
            status === 'active' ? 'bg-teal-400 animate-ping' :
            status === 'complete' ? 'bg-teal-500' :
            status === 'failed' ? 'bg-rose-500' : 'bg-zinc-500'
          }`}></span>
          <span className={`text-[10px] uppercase font-bold tracking-wider ${
            status === 'active' ? 'text-teal-400' :
            status === 'complete' ? 'text-teal-500' :
            status === 'failed' ? 'text-rose-400' : 'text-zinc-500'
          }`}>{status}</span>
        </div>
      </div>

      {/* Progress Path */}
      <div className="space-y-2 select-none">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded bg-[#D97756]" />
          <div className="flex-1 text-zinc-300 select-all font-semibold font-sans">
            {status === 'complete' ? 'Active Extraction Concluded.' : steps[stepIndex]}
          </div>
        </div>

        {/* Loading bar */}
        <div className="w-full h-1 bg-[#1C1816] rounded overflow-hidden">
          <motion.div 
            className="h-full bg-[#D97756]"
            initial={{ width: '0%' }}
            animate={{ 
              width: status === 'complete' ? '100%' : 
                     status === 'active' ? `${Math.min(92, (stepIndex + 1) * (100 / steps.length))}%` : '0%' 
            }}
            transition={{ type: 'tween', ease: 'easeInOut' }}
          />
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#2D241E]/40 mt-2 text-[10px] text-zinc-500 select-none">
          <div className="flex items-center gap-1.5">
            <Cpu size={11} className="text-zinc-600" />
            <span>PAYLOAD: </span>
            <strong className="text-zinc-400">
              {bytesCounter > 1000 ? `${(bytesCounter / 1024).toFixed(1)} KB` : `${bytesCounter} B`}
            </strong>
          </div>
          <div className="flex items-center gap-1.5">
            <Hash size={11} className="text-zinc-600" />
            <span>ELEMENTS FOUND: </span>
            <strong className="text-zinc-400 font-sans">{elementsCounter}</strong>
          </div>
        </div>
      </div>
    </div>
  );
};
