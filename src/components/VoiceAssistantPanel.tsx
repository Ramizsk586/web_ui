import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mic, 
  X, 
  Sparkles, 
  Radio, 
  Volume2
} from 'lucide-react';

interface VoiceAssistantPanelProps {
  isOpen: boolean;
  onClose: () => void;
  isVoiceListening: boolean;
  startVoiceDictation: () => void;
  stopVoiceDictation: (shouldAutoSend?: boolean) => void;
  toggleVoiceDictation: () => void;
  micVolume: number;
  voiceInterimText: string;
  voiceError: string | null;
  isAiSpeaking: boolean;
  stopSpeaking: () => void;
  messages: any[];
  isTyping: boolean;
  speakText: (text: string) => void;
  handleSend?: (contentOverride?: string) => Promise<void>;
  setVoiceDirectSendCallback?: (cb: ((transcript: string) => void) | null) => void;
  setInput?: (val: string) => void;
  silenceCountdown: number | null;
}

export function VoiceAssistantPanel({
  isOpen,
  onClose,
  isVoiceListening,
  startVoiceDictation,
  stopVoiceDictation,
  toggleVoiceDictation,
  micVolume,
  voiceInterimText,
  voiceError,
  isAiSpeaking,
  stopSpeaking,
  messages,
  isTyping,
  handleSend,
  setVoiceDirectSendCallback,
  setInput,
  silenceCountdown
}: VoiceAssistantPanelProps) {
  const [handsFree, setHandsFree] = useState(true);
  const wasSpeakingRef = useRef(false);

  // Get the last assistant message
  const assistantMessages = messages.filter(m => m.role === 'assistant');
  const lastAssistantMsg = assistantMessages[assistantMessages.length - 1];

  // Set up callback to write transcript to input box and auto-send
  const startDirectVoiceDictation = useCallback(() => {
    if (setVoiceDirectSendCallback && handleSend) {
      setVoiceDirectSendCallback((transcript) => {
        const cleanedTranscript = transcript.trim();
        if (!cleanedTranscript) {
          return;
        }
        if (setInput) {
          setInput(cleanedTranscript);
        }
        void handleSend(cleanedTranscript);
      });
    }
    startVoiceDictation();
  }, [setVoiceDirectSendCallback, handleSend, startVoiceDictation, setInput]);

  // Toggle that uses direct send mode for the voice panel
  const toggleDirectVoiceDictation = useCallback(() => {
    if (isVoiceListening) {
      stopVoiceDictation();
    } else {
      startDirectVoiceDictation();
    }
  }, [isVoiceListening, stopVoiceDictation, startDirectVoiceDictation]);

  // Auto-start listening on mount when handsfree is enabled
  useEffect(() => {
    if (isOpen && !isVoiceListening && !isAiSpeaking && !isTyping) {
      const timer = setTimeout(() => {
        startDirectVoiceDictation();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Keep track of speaking state transitions for Hands-Free response trigger
  useEffect(() => {
    if (isAiSpeaking) {
      wasSpeakingRef.current = true;
    } else if (wasSpeakingRef.current && !isAiSpeaking) {
      // Transitioned from speaking to not speaking
      wasSpeakingRef.current = false;
      if (handsFree && isOpen && !isVoiceListening && !isTyping) {
        // Auto trigger listening!
        const timer = setTimeout(() => {
          startDirectVoiceDictation();
        }, 600);
        return () => clearTimeout(timer);
      }
    }
  }, [isAiSpeaking, handsFree, isOpen, isTyping]);

  // Determine active visual state
  let visualState: 'listening' | 'speaking' | 'thinking' | 'idle' = 'idle';
  if (isVoiceListening) {
    visualState = 'listening';
  } else if (isAiSpeaking) {
    visualState = 'speaking';
  } else if (isTyping) {
    visualState = 'thinking';
  }

  // Calculate volume-driven scale multiplier
  const volumeMultiplier = 1 + (micVolume / 100) * 0.4;

  const handleClosePanel = () => {
    stopSpeaking();
    if (isVoiceListening) {
      setVoiceDirectSendCallback?.(null);
      stopVoiceDictation(false);
    }
    setVoiceDirectSendCallback?.(null);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* SOFT BACKDROP OVERLAY */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleClosePanel}
            className="fixed inset-0 z-[500] bg-black/30 backdrop-blur-[1px]"
            id="voice-panel-backdrop"
          />

          {/* RIGHT SIDE PANEL DRAWER */}
          <motion.div
            initial={{ x: '100%', opacity: 0.95 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0.95 }}
            transition={{ type: 'spring', damping: 28, stiffness: 220 }}
            className="fixed top-0 right-0 z-[510] h-full w-[100%] sm:w-[420px] flex flex-col justify-between bg-[var(--theme-surface)] border-l border-[var(--theme-border)] text-[var(--theme-primary)] p-6 md:p-7 select-none font-sans shadow-2xl overflow-y-auto overflow-x-hidden"
            id="voice-assistant-side-panel"
          >
            {/* TOP STATUS BAR */}
            <div className="flex items-center justify-between w-full border-b border-[var(--theme-border)] pb-4 mb-4 select-none">
              <div className="flex items-center gap-2.5">
                <div className={`w-2 h-2 rounded-full ${visualState === 'listening' ? 'bg-[var(--theme-accent)] animate-ping' : 'bg-[var(--theme-accent)]'}`} />
                <span className="text-xs font-mono font-bold tracking-widest text-[var(--theme-secondary)] uppercase">
                  Voice Space
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Hands Free Toggle */}
                <button
                  onClick={() => setHandsFree(!handsFree)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-medium transition-all ${
                    handsFree 
                      ? 'bg-[var(--theme-accent)]/10 border-[var(--theme-accent)]/20 text-[var(--theme-accent)]' 
                      : 'bg-[var(--theme-surface-alt,var(--theme-bg))] border-[var(--theme-border)] text-[var(--theme-secondary)]'
                  }`}
                >
                  <Radio size={11} className={handsFree ? 'animate-pulse' : ''} />
                  <span>{handsFree ? 'Hands-Free' : 'P-to-T'}</span>
                </button>
              </div>
            </div>

            {/* REVOLVING CENTER ORB AREA */}
            <div className="flex-1 flex flex-col items-center justify-center relative my-4 w-full select-none">
              
              {/* ORB AREA CONTAINER */}
              <div className="relative w-60 h-60 flex items-center justify-center">
                
                {/* OUTER AMBIENT PULSING RINGS (when listening) */}
                <AnimatePresence>
                  {visualState === 'listening' && (
                    <>
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0.5 }}
                        animate={{ 
                          scale: [1, 1.8], 
                          opacity: [0.35, 0] 
                        }}
                        transition={{ 
                          repeat: Infinity, 
                          duration: 1.8, 
                          ease: 'easeOut' 
                        }}
                        className="absolute inset-0 rounded-full bg-[var(--theme-accent)]/25 filter blur-md"
                      />
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0.5 }}
                        animate={{ 
                          scale: [0.9, 1.45], 
                          opacity: [0.2, 0] 
                        }}
                        transition={{ 
                          repeat: Infinity, 
                          duration: 2.2, 
                          ease: 'easeOut',
                          delay: 0.6
                        }}
                        className="absolute inset-0 rounded-full bg-[var(--theme-accent)]/15 filter blur-lg"
                      />
                    </>
                  )}
                </AnimatePresence>

                {/* ACTIVE SPEAKING GLOWS */}
                {visualState === 'speaking' && (
                  <motion.div
                    animate={{
                      boxShadow: [
                        '0 0 35px rgba(59, 130, 246, 0.22)',
                        '0 0 75px rgba(59, 130, 246, 0.45)',
                        '0 0 35px rgba(59, 130, 246, 0.22)'
                      ]
                    }}
                    transition={{
                      repeat: Infinity,
                      duration: 2,
                      ease: 'easeInOut'
                    }}
                    className="absolute inset-4 rounded-full bg-[var(--theme-accent)]/10 filter blur-xl"
                  />
                )}

                {/* SPINNING DASHED THINKING INDICATOR */}
                {visualState === 'thinking' && (
                  <motion.div
                    animate={{
                      rotate: 360,
                      scale: [0.96, 1.04, 0.96]
                    }}
                    transition={{
                      rotate: { repeat: Infinity, duration: 6, ease: 'linear' },
                      scale: { repeat: Infinity, duration: 1.8, ease: 'easeInOut' }
                    }}
                    className="absolute inset-0 rounded-full border border-dashed border-[var(--theme-accent)]/40 filter blur-[1px]"
                  />
                )}

                {/* MAIN GLOWING NEBULA CLOUD ORB (COMPLETELY COMPATIBLE CONTRAST DESIGN) */}
                <motion.div
                  animate={
                    visualState === 'listening'
                      ? { 
                          scale: volumeMultiplier,
                          transition: { type: 'spring', damping: 15, stiffness: 220 }
                        }
                      : visualState === 'speaking'
                      ? {
                          scale: [1, 1.05, 0.98, 1.03, 1],
                          transition: { repeat: Infinity, duration: 3, ease: 'easeInOut' }
                        }
                      : visualState === 'thinking'
                      ? {
                          scale: [0.97, 1.02, 0.97],
                          transition: { repeat: Infinity, duration: 1.5, ease: 'easeInOut' }
                        }
                      : {
                          scale: [1, 1.02, 1],
                          transition: { repeat: Infinity, duration: 4, ease: 'easeInOut' }
                        }
                  }
                  className={`relative z-10 w-48 h-48 rounded-full flex items-center justify-center overflow-hidden transition-all duration-300 border-2 shadow-xl cursor-pointer ${
                    visualState === 'listening' 
                      ? 'border-[var(--theme-accent)] bg-[var(--theme-surface-alt,var(--theme-bg))]' 
                      : visualState === 'speaking' 
                      ? 'border-[var(--theme-accent)]/80 bg-[var(--theme-surface-alt,var(--theme-bg))]'
                      : visualState === 'thinking'
                      ? 'border-[var(--theme-accent)]/40 bg-[var(--theme-bg)]'
                      : 'border-[var(--theme-border)] bg-[var(--theme-surface-alt,var(--theme-bg))]'
                  }`}
                  style={{
                    boxShadow: visualState === 'listening' ? '0 10px 25px -5px rgba(59, 130, 246, 0.15)' : 'none'
                  }}
                  onClick={toggleDirectVoiceDictation}
                >
                  {/* Radial backdrop overlay for nice glass shading */}
                  <div className="absolute inset-0 bg-gradient-to-b from-white/[0.04] to-black/[0.04] z-[1]" />
                  
                  {/* Fluid water visualizer background */}
                  <div className="absolute inset-0 pointer-events-none z-0">
                    <VoiceWaveCanvas 
                      isListening={isVoiceListening}
                      volume={micVolume}
                      isSpeaking={isAiSpeaking}
                      isThinking={isTyping}
                    />
                  </div>
                  
                  <div className="relative z-10 text-[var(--theme-primary)] font-semibold flex flex-col items-center justify-center p-4 text-center">
                    <AnimatePresence mode="wait">
                      {visualState === 'listening' && (
                        <motion.div
                          key="lst"
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.8, opacity: 0 }}
                          className="flex flex-col items-center gap-1.5"
                        >
                          <span className="text-[9px] font-bold tracking-widest uppercase text-[var(--theme-accent)] font-mono">Listening</span>
                          <Mic size={22} className="text-[var(--theme-accent)] animate-pulse" />
                          <span className="text-[10px] font-mono text-[var(--theme-secondary)]/80 mt-1">{micVolume}% INT</span>
                        </motion.div>
                      )}

                      {visualState === 'speaking' && (
                        <motion.div
                          key="spk"
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.8, opacity: 0 }}
                          className="flex flex-col items-center gap-1.5"
                        >
                          <span className="text-[9px] font-bold tracking-widest uppercase text-[var(--theme-accent)] font-mono">Speaking</span>
                          <Volume2 size={22} className="text-[var(--theme-accent)] animate-bounce" />
                        </motion.div>
                      )}

                      {visualState === 'thinking' && (
                        <motion.div
                          key="thk"
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.8, opacity: 0 }}
                          className="flex flex-col items-center gap-1.5"
                        >
                          <span className="text-[9px] font-bold tracking-widest uppercase text-[var(--theme-secondary)] font-mono">Thinking</span>
                          <Sparkles size={20} className="text-[var(--theme-accent)] animate-spin" style={{ animationDuration: '3s' }} />
                        </motion.div>
                      )}

                      {visualState === 'idle' && (
                        <motion.div
                          key="idl"
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.8, opacity: 0 }}
                          className="flex flex-col items-center gap-1"
                        >
                          <span className="text-[9px] font-bold tracking-widest uppercase text-[var(--theme-secondary)]/85 font-mono">Ready</span>
                          <span className="text-xs font-semibold text-[var(--theme-primary)]">Tap Orb</span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>

              </div>

              {/* Voice status and response display */}
              <div className="w-full text-center px-1 mt-4 flex flex-col gap-3 relative z-25 min-h-[120px] justify-center">
                
                <AnimatePresence mode="wait">
                  {isVoiceListening && (
                    <motion.div
                      key="voice-listening"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="text-[var(--theme-secondary)] text-xs italic font-sans flex flex-col gap-1 items-center"
                    >
                      <span>Listening...</span>
                      {silenceCountdown !== null && (
                        <span className="text-[10px] text-[var(--theme-accent)] not-italic font-mono font-semibold animate-pulse">
                          Auto-submitting in {silenceCountdown}s
                        </span>
                      )}
                    </motion.div>
                  )}

                  {/* AI response display summary */}
                  {!isVoiceListening && (lastAssistantMsg || isTyping) && (
                    <motion.div
                      key="ai-resp"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="space-y-2 max-w-sm mx-auto bg-[var(--theme-surface-alt,var(--theme-bg))] border border-[var(--theme-border)] p-4 rounded-2xl shadow-sm"
                    >
                      <p className="text-[10px] font-mono text-[var(--theme-accent)] uppercase tracking-widest flex items-center justify-center gap-1.5">
                        <Sparkles size={11} className="text-[var(--theme-accent)]" />
                        {isTyping ? 'Thinking...' : 'Response:'}
                      </p>
                      
                      <div className="text-xs font-medium leading-relaxed text-[var(--theme-primary)] max-h-[110px] overflow-y-auto px-1 custom-scrollbar">
                        {isTyping ? (
                          <div className="flex items-center justify-center gap-1 py-1.5">
                            <span className="w-1 h-1 bg-[var(--theme-accent)] rounded-full animate-bounce delay-75" />
                            <span className="w-1 h-1 bg-[var(--theme-accent)] rounded-full animate-bounce delay-150" />
                            <span className="w-1 h-1 bg-[var(--theme-accent)] rounded-full animate-bounce delay-200" />
                          </div>
                        ) : (
                          lastAssistantMsg?.content?.replace(/<think>[\s\S]*?<\/think>/gi, '').trim()
                        )}
                      </div>
                    </motion.div>
                  )}

                  {/* Default Welcome */}
                  {!isVoiceListening && !lastAssistantMsg && !isTyping && (
                    <motion.div
                      key="welcome"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-[var(--theme-secondary)] text-xs italic font-sans"
                    >
                      "How can I help you today? I'm listening."
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Error Indicators */}
                {voiceError && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-[11px] text-red-500 font-mono bg-red-500/5 border border-red-500/10 px-3 py-2 rounded-xl mt-2 max-w-xs mx-auto"
                  >
                    ⚠️ {voiceError}
                  </motion.div>
                )}
              </div>

            </div>

            {/* BOTTOM CALL NAVIGATION CONTROLS */}
            <div className="w-full flex items-center justify-between border-t border-[var(--theme-border)] pt-4 mt-auto">
              
              {/* MICROPHONE TOGGLE CONTROL */}
              <div className="flex flex-col items-center gap-1 shrink-0 w-20">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={toggleDirectVoiceDictation}
                  className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${
                    isVoiceListening 
                      ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' 
                      : 'bg-[var(--theme-surface-alt,var(--theme-bg))] text-[var(--theme-secondary)] hover:text-[var(--theme-primary)] hover:bg-[var(--theme-hover-bg)] border border-[var(--theme-border)]'
                  }`}
                  title={isVoiceListening ? 'Stop Recording' : 'Mute / Talk'}
                  id="voice-panel-mic-trigger"
                >
                  {isVoiceListening ? <Mic size={18} className="animate-pulse" /> : <Mic size={18} />}
                </motion.button>
                <span className="text-[9px] font-mono text-[var(--theme-secondary)]/80 uppercase tracking-widest font-bold mt-1">
                  {isVoiceListening ? 'Mute' : 'Speak'}
                </span>
              </div>

              {/* ACTIVE STATUS LABEL */}
              <div className="text-center">
                <div className="text-[10px] font-mono text-[var(--theme-secondary)] tracking-tight">
                  {isVoiceListening 
                    ? (silenceCountdown !== null ? `PAUSING (${silenceCountdown}S)...` : 'RECORDING...') 
                    : isAiSpeaking 
                    ? 'REPLYING...' 
                    : 'WAITING...'}
                </div>
              </div>

              {/* FULL EXIT OVERLAY CONTROL */}
              <div className="flex flex-col items-center gap-1 shrink-0 w-20">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleClosePanel}
                  className="w-11 h-11 rounded-full bg-[var(--theme-surface-alt,var(--theme-bg))] text-[var(--theme-secondary)] hover:bg-red-500/10 hover:text-red-500 flex items-center justify-center border border-[var(--theme-border)] hover:border-red-500/20 transition-all cursor-pointer"
                  title="Close Voice Space"
                  id="voice-panel-dismiss-trigger"
                >
                  <X size={18} />
                </motion.button>
                <span className="text-[9px] font-mono text-[var(--theme-secondary)]/80 uppercase tracking-widest font-bold mt-1">
                  Leave
                </span>
              </div>

            </div>

          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

interface VoiceWaveCanvasProps {
  isListening: boolean;
  volume: number;
  isSpeaking: boolean;
  isThinking: boolean;
}

export function VoiceWaveCanvas({ isListening, volume, isSpeaking, isThinking }: VoiceWaveCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let phase = 0;

    // Set precise physical size & handle retina display
    const dpr = window.devicePixelRatio || 1;
    const parent = canvas.parentElement;
    const rect = parent ? parent.getBoundingClientRect() : { width: 192, height: 192 };
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    // Track simulated speech pattern values to make the AI speaking rhythm organic
    let simulatedVoiceEnvelope = 0.15;
    let targetSimulatedEnvelope = 0.15;
    let envelopeTimer = 0;

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      // Phase changes (determines speed of horizontal movement)
      let speed = 0.05;
      if (isListening) {
        speed = 0.12 + (volume / 100) * 0.08;
      } else if (isSpeaking) {
        speed = 0.09;
      } else if (isThinking) {
        speed = 0.04;
      } else {
        speed = 0.015; // Gentle calm water
      }
      phase += speed;

      // Amplitude multiplier based on active volume or state
      let ampMult = 1.0;
      if (isListening) {
        ampMult = 0.3 + (volume / 100) * 1.8;
      } else if (isSpeaking) {
        // Simulate real speech rhythm with randomly shifting word boundaries
        envelopeTimer--;
        if (envelopeTimer <= 0) {
          targetSimulatedEnvelope = 0.2 + Math.random() * 0.9;
          envelopeTimer = 10 + Math.floor(Math.random() * 25);
        }
        simulatedVoiceEnvelope += (targetSimulatedEnvelope - simulatedVoiceEnvelope) * 0.15;
        ampMult = 0.4 + simulatedVoiceEnvelope * 1.3;
      } else if (isThinking) {
        ampMult = 0.3 + Math.sin(phase * 0.5) * 0.15;
      } else {
        ampMult = 0.12; // Slow baseline breathing
      }

      // Read accent color from DOM CSS property dynamically to guarantee pixel-perfect theme pairing
      let accentColor = '#3b82f6';
      try {
        const computed = getComputedStyle(document.documentElement).getPropertyValue('--theme-accent').trim();
        if (computed) accentColor = computed;
      } catch (e) {
        // fallback
      }

      if (isListening) {
        const barCount = 15;
        const gap = width * 0.025;
        const barWidth = (width * 0.68 - gap * (barCount - 1)) / barCount;
        const centerX = width / 2;
        const centerY = height / 2;
        const baseX = centerX - ((barWidth * barCount + gap * (barCount - 1)) / 2);
        const intensity = Math.max(0.18, volume / 100);

        ctx.fillStyle = hexToRgba(accentColor, 0.14);
        ctx.beginPath();
        ctx.roundRect(width * 0.16, centerY - height * 0.18, width * 0.68, height * 0.36, height * 0.18);
        ctx.fill();

        for (let i = 0; i < barCount; i++) {
          const distanceFromCenter = Math.abs(i - (barCount - 1) / 2) / ((barCount - 1) / 2);
          const motion = Math.sin(phase * 1.6 + i * 0.58) * 0.5 + 0.5;
          const heightRatio = 0.18 + intensity * (0.2 + (1 - distanceFromCenter) * 0.58) + motion * 0.28 * intensity;
          const h = Math.min(height * 0.64, height * heightRatio);
          const x = baseX + i * (barWidth + gap);
          const y = centerY - h / 2;
          const gradient = ctx.createLinearGradient(0, y, 0, y + h);
          gradient.addColorStop(0, hexToRgba(accentColor, 0.45));
          gradient.addColorStop(0.5, hexToRgba(accentColor, 0.9));
          gradient.addColorStop(1, hexToRgba(accentColor, 0.45));
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, h, barWidth / 2);
          ctx.fill();
        }

        animationFrameId = requestAnimationFrame(draw);
        return;
      }

      // Draw Wave Layers starting from deep to foreground with organic wave patterns
      const waveLayers = [
        {
          wavelength: width * 0.85,
          amplitude: 15 * ampMult,
          verticalOffset: height * 0.55,
          speedOffset: 0.8,
          color: hexToRgba(accentColor, 0.12),
          sinFactor: 1.0
        },
        {
          wavelength: width * 0.6,
          amplitude: 22 * ampMult,
          verticalOffset: height * 0.58,
          speedOffset: -0.6,
          color: hexToRgba(accentColor, 0.22),
          sinFactor: 1.4
        },
        {
          wavelength: width * 0.45,
          amplitude: 28 * ampMult,
          verticalOffset: height * 0.61,
          speedOffset: 1.1,
          color: hexToRgba(accentColor, 0.35),
          sinFactor: 2.1
        },
        // Foreground glow crest
        {
          wavelength: width * 0.35,
          amplitude: 12 * ampMult,
          verticalOffset: height * 0.63,
          speedOffset: -1.4,
          color: hexToRgba(accentColor, 0.55),
          sinFactor: 2.8
        }
      ];

      waveLayers.forEach((wave) => {
        ctx.beginPath();
        ctx.fillStyle = wave.color;

        // Draw path connecting sine coordinates across horizontal canvas axis
        for (let x = 0; x <= width; x++) {
          const sinValue = Math.sin((x / wave.wavelength) * Math.PI * 2 + phase * wave.speedOffset);
          const cosineValue = Math.cos((x / (wave.wavelength * 0.5)) * Math.PI + phase * 0.4);
          const finalY = wave.verticalOffset + (sinValue * wave.amplitude) + (cosineValue * wave.amplitude * 0.25);
          
          if (x === 0) {
            ctx.moveTo(x, finalY);
          } else {
            ctx.lineTo(x, finalY);
          }
        }

        // Complete the polygon down to fill the bottom of current orb area
        ctx.lineTo(width, height);
        ctx.lineTo(0, height);
        ctx.closePath();
        ctx.fill();
      });

      // Ambient spherical center glow
      if (ampMult > 0.1) {
        const glowRadius = Math.min(width, height) * 0.45 * Math.min(1.5, ampMult);
        const grad = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, glowRadius);
        grad.addColorStop(0, hexToRgba(accentColor, 0.08 * ampMult));
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(width / 2, height / 2, glowRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isListening, volume, isSpeaking, isThinking]);

  return (
    <canvas 
      ref={canvasRef} 
      className="w-full h-full block select-none pointer-events-none rounded-full"
    />
  );
}

// Simple absolute hex-to-rgba utility for complete style compliance
function hexToRgba(hex: string, alpha: number): string {
  if (hex.startsWith('rgb')) {
    return hex.replace('rgb', 'rgba').replace(')', `, ${alpha})`);
  }
  let c = hex.substring(1);
  if (c.length === 3) {
    c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
  }
  const r = parseInt(c.slice(0, 2), 16) || 0;
  const g = parseInt(c.slice(2, 4), 16) || 0;
  const b = parseInt(c.slice(4, 6), 16) || 0;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
