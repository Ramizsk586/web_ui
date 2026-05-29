import React from 'react';
import { motion } from 'motion/react';
import { Hammer } from 'lucide-react';

export const WebSearchAnimation = () => (
  <motion.div
    animate={{ 
      rotate: 360,
      scale: [1, 1.1, 1],
    }}
    transition={{ 
      rotate: { repeat: Infinity, duration: 8, ease: "linear" },
      scale: { repeat: Infinity, duration: 3, ease: "easeInOut" }
    }}
    className="flex items-center justify-center relative"
  >
    <div className="absolute inset-0 bg-teal-500/20 blur-xl rounded-full" />
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-teal-500 relative z-10">
      <circle cx="12" cy="12" r="1"/>
      <path d="M20.2 20.2c2.04-2.03.02-7.36-4.5-11.9c-4.54-4.52-9.87-6.54-11.9-4.5c-2.04 2.03-.02 7.36 4.5 11.9c4.54 4.52 9.87 6.54 11.9 4.5"/>
      <path d="M15.7 15.7c4.52-4.54 6.54-9.87 4.5-11.9c-2.03-2.04-7.36-.02-11.9 4.5c-4.52 4.54-6.54 9.87-4.5 11.9c2.03 2.04 7.36.02 11.9-4.5"/>
    </svg>
  </motion.div>
);

export const ToolCallingAnimation = () => (
  <motion.div
    animate={{ 
      y: [0, -2, 0],
      rotate: [0, 8, -8, 0],
      scale: [1, 1.05, 1]
    }}
    transition={{ 
      repeat: Infinity, 
      duration: 2.5, 
      ease: "easeInOut" 
    }}
    className="flex items-center justify-center relative"
  >
    <div className="absolute inset-0 bg-emerald-500/20 blur-xl rounded-full" />
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500 relative z-10">
      <path d="m14 12l-8.381 8.38a1 1 0 0 1-3.001-3L11 9"/>
      <path d="M15 15.5a.5.5 0 0 0 .5.5A6.5 6.5 0 0 0 22 9.5a.5.5 0 0 0-.5-.5h-1.672a2 2 0 0 1-1.414-.586l-5.062-5.062a1.205 1.205 0 0 0-1.704 0L9.352 5.648a1.205 1.205 0 0 0 0 1.704l5.062 5.062A2 2 0 0 1 15 13.828z"/>
    </svg>
  </motion.div>
);

export const LuminaToolCallingAnimation = () => (
  <motion.div
    animate={{ 
      y: [0, -3, 0],
      rotate: [0, -12, 12, 0],
      scale: [1, 1.08, 1]
    }}
    transition={{ 
      repeat: Infinity, 
      duration: 2.2, 
      ease: "easeInOut" 
    }}
    className="flex items-center justify-center relative select-none pointer-events-none"
  >
    <div className="absolute inset-0 bg-orange-500/20 blur-xl rounded-full animate-pulse" />
    <Hammer size={16} className="text-orange-500 relative z-10" />
  </motion.div>
);
