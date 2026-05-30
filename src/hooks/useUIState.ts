import { useState, useEffect, useCallback, useRef } from 'react';
import { Chat, Artifact } from '../types';

export interface UseUIStateProps {
  setInput: React.Dispatch<React.SetStateAction<string>>;
  handleSend?: (contentOverride?: string) => Promise<void>;
}

export function useUIState({ setInput, handleSend }: UseUIStateProps) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [lightboxImage, setLightboxImage] = useState<{ url: string; title?: string } | null>(null);
  const [activeVideo, setActiveVideo] = useState<{ url: string; title?: string } | null>(null);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSourcesPanelOpen, setIsSourcesPanelOpen] = useState(false);
  const [sourcesPanelMessageId, setSourcesPanelMessageId] = useState<string | null>(null);

  const [toasts, setToasts] = useState<{ id: string; message: string }[]>([]);
  const showToast = useCallback((message: string) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  useEffect(() => {
    (window as any).openImageLightbox = (url: string, title?: string) => {
      setLightboxImage({ url, title });
    };
    (window as any).playVideoInLuminaPopup = (url: string, title?: string) => {
      setActiveVideo({ url, title });
    };
    return () => {
      delete (window as any).openImageLightbox;
      delete (window as any).playVideoInLuminaPopup;
    };
  }, []);

  const [isUrlToolOpen, setIsUrlToolOpen] = useState(false);
  const [urlToolInput, setUrlToolInput] = useState('');
  const [urlToolLoading, setUrlToolLoading] = useState(false);
  const [urlToolError, setUrlToolError] = useState<string | null>(null);
  const [attachedUrlDocs, setAttachedUrlDocs] = useState<
    Array<{ id: string; url: string; title: string; content: string; favicon?: string; segments?: any[]; videoId?: string; isOcr?: boolean }>
  >([]);

  const [isTranscriptToolOpen, setIsTranscriptToolOpen] = useState(false);
  const [transcriptToolInput, setTranscriptToolInput] = useState('');
  const [transcriptToolLoading, setTranscriptToolLoading] = useState(false);
  const [transcriptToolError, setTranscriptToolError] = useState<string | null>(null);
  const [selectedTranscriptDoc, setSelectedTranscriptDoc] = useState<any | null>(null);
  const [transcriptionOptionsDoc, setTranscriptionOptionsDoc] = useState<any | null>(null);

  const [isWebSearchEnabled, setIsWebSearchEnabled] = useState(false);
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);

  // Advanced Voice Input State Engine
  const [isVoiceListening, setIsVoiceListening] = useState(false);
  const [voiceInterimText, setVoiceInterimText] = useState('');
  const [voiceLanguage, setVoiceLanguage] = useState('en-US');
  const [voiceContinuous, setVoiceContinuous] = useState(false);
  const [voiceAppendMode, setVoiceAppendMode] = useState(true);
  const [voiceAutoSend, setVoiceAutoSend] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [micVolume, setMicVolume] = useState<number>(0);
  const [showVoiceControlPanel, setShowVoiceControlPanel] = useState(false);

  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch {}
      }
      if (micStreamRef.current) {
        try { micStreamRef.current.getTracks().forEach((track: any) => track.stop()); } catch {}
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const startVoiceDictation = async () => {
    setVoiceError(null);
    setVoiceInterimText('');
    const RecognitionConstructor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!RecognitionConstructor) {
      setVoiceError("Your browser doesn't support the Web Speech API. Please use Google Chrome, Edge, or Safari.");
      showToast("Speech recognition not supported in this browser.");
      return;
    }

    try {
      const rec = new RecognitionConstructor();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = voiceLanguage;

      rec.onstart = () => {
        setIsVoiceListening(true);
        showToast("🎙️ Voice listening active! Speak now...");
      };

      rec.onresult = (event: any) => {
        let finalTrans = '';
        let interimTrans = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTrans += event.results[i][0].transcript;
          } else {
            interimTrans += event.results[i][0].transcript;
          }
        }

        if (interimTrans) {
          setVoiceInterimText(interimTrans);
        }

        if (finalTrans) {
          const added = finalTrans.trim();
          if (added) {
            setInput(prev => {
              if (voiceAppendMode) {
                return prev ? (prev.endsWith(' ') ? prev + added : prev + ' ' + added) : added;
              } else {
                return added;
              }
            });
            setVoiceInterimText('');
          }
        }
      };

      rec.onerror = (e: any) => {
        console.error("Speech recognition error:", e);
        if (e.error !== 'no-speech') {
          setVoiceError(`Error: ${e.error}`);
        }
      };

      rec.onend = () => {
        setIsVoiceListening(false);
        setVoiceInterimText('');
      };

      recognitionRef.current = rec;
      rec.start();

      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
          micStreamRef.current = stream;
          
          const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
          audioContextRef.current = audioCtx;
          
          const source = audioCtx.createMediaStreamSource(stream);
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 64;
          source.connect(analyser);
          analyserRef.current = analyser;

          const bufferLength = analyser.frequencyBinCount;
          const dataArray = new Uint8Array(bufferLength);

          const updateVolume = () => {
            if (!analyserRef.current) return;
            analyserRef.current.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < bufferLength; i++) {
              sum += dataArray[i];
            }
            const average = sum / bufferLength;
            setMicVolume(Math.min(100, Math.round((average / 128) * 100)));
            animationFrameRef.current = requestAnimationFrame(updateVolume);
          };

          updateVolume();
        } catch (mediaErr) {
          console.warn("Could not initialize mic volume tracking for animations: ", mediaErr);
        }
      }

    } catch (err: any) {
      console.error("Failed to start speech recognition:", err);
      setVoiceError(err?.message || String(err));
      setIsVoiceListening(false);
    }
  };

  const stopVoiceDictation = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      } catch (err) {
        console.error("Error stopping recognition:", err);
      }
      recognitionRef.current = null;
    }

    if (micStreamRef.current) {
      try {
        micStreamRef.current.getTracks().forEach((track: any) => track.stop());
      } catch {}
      micStreamRef.current = null;
    }

    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch {}
      audioContextRef.current = null;
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    setIsVoiceListening(false);
    setMicVolume(0);
    setVoiceInterimText('');
    
    if (voiceAutoSend && handleSend) {
      setTimeout(() => {
        handleSend();
      }, 400);
    }
  };

  const toggleVoiceDictation = () => {
    if (isVoiceListening) {
      stopVoiceDictation();
    } else {
      startVoiceDictation();
    }
  };

  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showScrollButton, setShowScrollButton] = useState(false);

  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [isModeDropdownOpen, setIsModeDropdownOpen] = useState(false);
  const [isPlusMenuOpen, setIsPlusMenuOpen] = useState(false);
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);

  const [activeArtifact, setActiveArtifact] = useState<Artifact | null>(null);
  const [isCanvasOpen, setIsCanvasOpen] = useState(false);
  const [canvasView, setCanvasView] = useState<'code' | 'preview'>('code');

  return {
    chats, setChats,
    lightboxImage, setLightboxImage,
    activeVideo, setActiveVideo,
    currentChatId, setCurrentChatId,
    isSettingsOpen, setIsSettingsOpen,
    isSourcesPanelOpen, setIsSourcesPanelOpen,
    sourcesPanelMessageId, setSourcesPanelMessageId,
    toasts, setToasts, showToast,
    isUrlToolOpen, setIsUrlToolOpen,
    urlToolInput, setUrlToolInput,
    urlToolLoading, setUrlToolLoading,
    urlToolError, setUrlToolError,
    attachedUrlDocs, setAttachedUrlDocs,
    isTranscriptToolOpen, setIsTranscriptToolOpen,
    transcriptToolInput, setTranscriptToolInput,
    transcriptToolLoading, setTranscriptToolLoading,
    transcriptToolError, setTranscriptToolError,
    selectedTranscriptDoc, setSelectedTranscriptDoc,
    transcriptionOptionsDoc, setTranscriptionOptionsDoc,
    isWebSearchEnabled, setIsWebSearchEnabled,
    isOcrProcessing, setIsOcrProcessing,
    isVoiceListening, setIsVoiceListening,
    voiceInterimText, setVoiceInterimText,
    voiceLanguage, setVoiceLanguage,
    voiceContinuous, setVoiceContinuous,
    voiceAppendMode, setVoiceAppendMode,
    voiceAutoSend, setVoiceAutoSend,
    voiceError, setVoiceError,
    micVolume, setMicVolume,
    showVoiceControlPanel, setShowVoiceControlPanel,
    startVoiceDictation, stopVoiceDictation, toggleVoiceDictation,
    attachedFiles, setAttachedFiles,
    searchQuery, setSearchQuery,
    showScrollButton, setShowScrollButton,
    isModelDropdownOpen, setIsModelDropdownOpen,
    isModeDropdownOpen, setIsModeDropdownOpen,
    isPlusMenuOpen, setIsPlusMenuOpen,
    isHeaderMenuOpen, setIsHeaderMenuOpen,
    activeArtifact, setActiveArtifact,
    isCanvasOpen, setIsCanvasOpen,
    canvasView, setCanvasView
  };
}
