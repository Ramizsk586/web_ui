import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ThemeSettingsContent } from './ThemeSettingsContent';

interface ThemeCustomizerPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ThemeCustomizerPanel({ isOpen, onClose }: ThemeCustomizerPanelProps) {
  // Handle closing when striking Escape or clicking backdrop
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Optimized backdrop - simpler fade */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-[2px] z-[180]"
          />

          {/* Slide-in panel with spring animation */}
          <motion.div
            initial={{ x: '-100%', opacity: 0.5 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '-100%', opacity: 0 }}
            transition={{ 
              type: 'spring', 
              damping: 28, 
              stiffness: 200,
              mass: 0.8
            }}
            className="fixed left-0 top-0 bottom-0 h-full w-full max-w-[420px] border-r bg-[var(--theme-surface)] text-[var(--theme-primary)] border-[var(--theme-border)] shadow-2xl z-[190] flex flex-col"
          >
            <ThemeSettingsContent />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}