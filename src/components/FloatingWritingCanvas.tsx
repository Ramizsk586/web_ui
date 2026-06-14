import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, RefreshCw, FileText, Send } from 'lucide-react';
import { WRITING_STYLES } from '../constants';

interface FloatingWritingCanvasProps {
  writingStyle: string;
  onClose: () => void;
}

const STYLE_DESCRIPTIONS: Record<string, string> = {
  default: 'Default writing style.',
  poem: 'Creative and poetic expression with rhythm, imagery, and emotional depth.',
  story: 'Narrative storytelling with character development, setting, and plot progression.',
  letter: 'Personal letter format with warm tone, salutations, and closings.',
  essay: 'Structured academic writing with thesis, arguments, and conclusion.',
  script: 'Screenplay or stage play format with dialogue, action lines, and scene directions.',
};

const FloatingWritingCanvasComponent: React.FC<FloatingWritingCanvasProps> = ({
  writingStyle,
  onClose,
}) => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [output, setOutput] = useState('');

  const style = useMemo(
    () => WRITING_STYLES.find((s) => s.id === writingStyle),
    [writingStyle]
  );

  const styleDescription = STYLE_DESCRIPTIONS[writingStyle] || STYLE_DESCRIPTIONS.default;

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;
    setIsGenerating(true);
    setOutput('');

    // Simulate AI generation - this will be wired up to callLlamaBridge via parent
    setTimeout(() => {
      setOutput(`[This is a placeholder for AI-generated ${style?.label || 'writing'} content based on your prompt: "${prompt}"].\n\nIn a production implementation, this would call the LLM bridge with instructions to generate content in the "${style?.label}" writing style.`);
      setIsGenerating(false);
    }, 1500);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      handleGenerate();
    }
  };

  return (
    <div className="fixed inset-0 bg-[#0F0D0C]/80 backdrop-blur-md flex items-center justify-center z-[150] p-4 md:p-6 animate-fade-in select-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 12 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-4xl bg-[#1A1715] border border-[#2D241E] rounded-2xl flex flex-col overflow-hidden shadow-[0_24px_64px_rgba(18,16,15,0.7)] relative font-sans"
      >
        {/* Ambient glows */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#D97756]/4 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#AD9F91]/4 rounded-full blur-[80px] pointer-events-none" />

        {/* Header */}
        <div className="h-14 border-b border-[#2C241E] bg-[#221D1A]/90 px-5 flex items-center justify-between shrink-0 relative z-10 select-none backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#D97756]/10 text-[#D97756] border border-[#D97756]/15">
              <FileText size={16} />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-xs font-bold text-[#EDE6DD] tracking-wider uppercase font-sans">
                AI Writing Canvas
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#D97756] animate-pulse" />
                <span className="text-[10px] font-mono text-[#AD9F91]">
                  {style?.label || 'Default'} writing style active
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={onClose}
              className="p-2 hover:bg-[#2A2420] border border-[#2F2722] bg-[#1C1816]/50 rounded-lg text-[#AD9F91] hover:text-white transition-all cursor-pointer"
              title="Close Writing Canvas"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Style info bar */}
        <div className="px-5 py-3 border-b border-[#2C241E] bg-[#1E1917]/70 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-[#D97756]/10 text-[#D97756]">
              {style?.icon}
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] font-bold text-[#EDE6DD]">
                {style?.label} Style
              </span>
              <span className="text-[10px] text-[#AD9F91] leading-relaxed">
                {styleDescription}
              </span>
            </div>
          </div>
        </div>

        {/* Content area - no fixed height, takes natural space */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Prompt input */}
          <div className="p-5 border-b border-[#2C241E] bg-[#161311]/50">
            <div className="relative">
              <textarea
                autoFocus
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Describe what you want to write in ${style?.label || 'this'} style...`}
                className="w-full bg-[#1A1715] border border-[#2D241E] rounded-xl px-4 py-3 pr-12 text-[13px] text-[#EDE6DD] placeholder-[#564E46] font-sans resize-none focus:outline-none focus:border-[#D97756]/50 focus:ring-1 focus:ring-[#D97756]/20 leading-relaxed"
                rows={3}
              />
              <button
                onClick={handleGenerate}
                disabled={!prompt.trim() || isGenerating}
                className="absolute bottom-3 right-3 p-2 rounded-lg bg-[#D97756] hover:bg-[#E08A69] disabled:bg-[#2C241E] disabled:text-[#564E46] text-white transition-all cursor-pointer disabled:cursor-not-allowed"
              >
                {isGenerating ? (
                  <RefreshCw size={13} className="animate-spin" />
                ) : (
                  <Send size={13} />
                )}
              </button>
            </div>
            <div className="mt-2 text-[10px] text-[#564E46] text-right font-mono">
              Ctrl + Enter to generate
            </div>
          </div>

          {/* Output area */}
          <div className="flex-1 min-h-0 overflow-hidden">
            {isGenerating ? (
              <div className="h-full flex flex-col items-center justify-center gap-3 text-[#AD9F91]">
                <RefreshCw size={18} className="animate-spin text-[#D97756]" />
                <span className="text-[11px] font-mono uppercase tracking-widest">
                  Generating {style?.label}...
                </span>
              </div>
            ) : output ? (
              <div className="h-full overflow-y-auto custom-scrollbar p-5">
                <div className="prose prose-invert prose-sm max-w-none text-[#DDD2C4] leading-relaxed whitespace-pre-wrap font-sans">
                  {output}
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center gap-4 select-none font-sans p-8 text-center">
                <div className="w-14 h-14 rounded-xl bg-[#2A2420]/60 border border-[#2D241E] flex items-center justify-center text-[#AD9F91]">
                  <FileText size={24} className="text-[#D97756]" />
                </div>
                <h2 className="text-xs font-bold text-[#EDE6DD] uppercase tracking-wider">
                  Your writing will appear here
                </h2>
                <p className="text-[12px] text-[#AD9F91] max-w-xs leading-relaxed">
                  Enter a prompt above and click generate, or press Ctrl+Enter to create content in the {style?.label} style.
                </p>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export const FloatingWritingCanvas = React.memo(FloatingWritingCanvasComponent);