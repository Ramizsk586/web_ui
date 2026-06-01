import { useState, useEffect, useCallback, useRef } from 'react';
import { Chat, Artifact } from '../types';

export interface UseUIStateProps {
  setInput: React.Dispatch<React.SetStateAction<string>>;
  handleSend?: (contentOverride?: string) => Promise<void>;
}

export function useUIState({ setInput, handleSend }: UseUIStateProps) {
  const [chats, setChats] = useState<Chat[]>(() => {
    try {
      const saved = localStorage.getItem('lumina_chats');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.map((chat: any) => ({
          ...chat,
          updatedAt: chat.updatedAt ? new Date(chat.updatedAt) : new Date(),
          messages: chat.messages.map((m: any) => ({
            ...m,
            timestamp: m.timestamp ? new Date(m.timestamp) : undefined,
            todoPlan: m.todoPlan ? {
              ...m.todoPlan,
              todos: m.todoPlan.todos || []
            } : undefined
          }))
        }));
      }
    } catch (e) {
      console.error("Error loading chats from local storage:", e);
    }
    return [];
  });

  const [currentChatId, setCurrentChatId] = useState<string | null>(() => {
    try {
      return localStorage.getItem('lumina_current_chat_id');
    } catch {
      return null;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('lumina_chats', JSON.stringify(chats));
    } catch (e) {
      console.error("Error saving chats to local storage:", e);
    }
  }, [chats]);

  useEffect(() => {
    try {
      if (currentChatId) {
        localStorage.setItem('lumina_current_chat_id', currentChatId);
      } else {
        localStorage.removeItem('lumina_current_chat_id');
      }
    } catch {}
  }, [currentChatId]);

  const [lightboxImage, setLightboxImage] = useState<{ url: string; title?: string } | null>(null);
  const [activeVideo, setActiveVideo] = useState<{ url: string; title?: string } | null>(null);
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
    Array<{ id: string; url: string; title: string; content: string; favicon?: string; segments?: any[]; videoId?: string }>
  >([]);

  const [isTranscriptToolOpen, setIsTranscriptToolOpen] = useState(false);
  const [transcriptToolInput, setTranscriptToolInput] = useState('');
  const [transcriptToolLoading, setTranscriptToolLoading] = useState(false);
  const [transcriptToolError, setTranscriptToolError] = useState<string | null>(null);
  const [selectedTranscriptDoc, setSelectedTranscriptDoc] = useState<any | null>(null);
  const [transcriptionOptionsDoc, setTranscriptionOptionsDoc] = useState<any | null>(null);

  const [isWebSearchEnabled, setIsWebSearchEnabled] = useState(false);

  const [isVoiceListening, setIsVoiceListening] = useState(false);
  const [voiceInterimText, setVoiceInterimText] = useState('');
  const [voiceLanguage, setVoiceLanguage] = useState('en-US');
  const [voiceContinuous, setVoiceContinuous] = useState(false);
  const [voiceAppendMode, setVoiceAppendMode] = useState(true);
  const [voiceAutoSend, setVoiceAutoSend] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [micVolume, setMicVolume] = useState<number>(0);
  const [showVoiceControlPanel, setShowVoiceControlPanel] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingMimeTypeRef = useRef('audio/webm');
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const autoSendAfterRecordingRef = useRef(true);

  const releaseVoiceResources = useCallback(() => {
    if (micStreamRef.current) {
      try { micStreamRef.current.getTracks().forEach((track: any) => track.stop()); } catch {}
      micStreamRef.current = null;
    }

    if (audioContextRef.current) {
      try { audioContextRef.current.close(); } catch {}
      audioContextRef.current = null;
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    analyserRef.current = null;
    setMicVolume(0);
  }, []);

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try { mediaRecorderRef.current.stop(); } catch {}
      }
      releaseVoiceResources();
    };
  }, [releaseVoiceResources]);

  const getBestRecordingMimeType = () => {
    const candidates = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/ogg;codecs=opus',
      'audio/wav'
    ];
    return candidates.find(type => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) || '';
  };

  const blobToBase64 = async (blob: Blob) => {
    const arrayBuffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    return btoa(binary);
  };

  const transcribeRecordedAudio = async (audioBlob: Blob, language: string, shouldAutoSend: boolean) => {
    if (!audioBlob.size) {
      setVoiceError('No audio was captured. Try speaking a little longer.');
      setVoiceInterimText('');
      return;
    }

    setVoiceInterimText('Transcribing locally with Whisper...');
    try {
      const response = await fetch('/api/stt/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioBase64: await blobToBase64(audioBlob),
          mimeType: audioBlob.type || recordingMimeTypeRef.current,
          language,
          modelName: 'base.en'
        })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.detail || data.error || `Local transcription failed (${response.status})`);
      }

      const transcript = String(data.transcript || '').trim();
      if (!transcript) {
        setVoiceError('Whisper did not detect speech in the recording.');
        return;
      }

      setInput(prev => {
        if (voiceAppendMode) {
          return prev ? (prev.endsWith(' ') ? prev + transcript : prev + ' ' + transcript) : transcript;
        }
        return transcript;
      });
      showToast('Local Whisper transcription complete.');

      if (shouldAutoSend && voiceAutoSend && handleSend) {
        setTimeout(() => {
          handleSend();
        }, 400);
      }
    } catch (err: any) {
      const message = err?.message || 'Local Whisper transcription failed.';
      console.error('Local STT error:', message);
      setVoiceError(message);
      showToast(message);
    } finally {
      setVoiceInterimText('');
    }
  };

  const startVoiceDictation = async (languageOverride?: string) => {
    setVoiceError(null);
    setVoiceInterimText('');

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      const message = 'Local voice recording is not available in this browser runtime.';
      setVoiceError(message);
      showToast(message);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      micStreamRef.current = stream;
      audioChunksRef.current = [];
      autoSendAfterRecordingRef.current = true;

      const mimeType = getBestRecordingMimeType();
      recordingMimeTypeRef.current = mimeType || 'audio/webm';
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.onstart = () => {
        setIsVoiceListening(true);
        setVoiceInterimText('Recording locally. Stop when you are done.');
        showToast('Offline voice recording active. Speak now...');
      };

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onerror = () => {
        const message = 'Local audio recording failed.';
        setVoiceError(message);
        showToast(message);
        setIsVoiceListening(false);
        mediaRecorderRef.current = null;
        releaseVoiceResources();
      };

      recorder.onstop = () => {
        const chunks = [...audioChunksRef.current];
        const shouldAutoSend = autoSendAfterRecordingRef.current;
        audioChunksRef.current = [];
        setIsVoiceListening(false);
        mediaRecorderRef.current = null;
        releaseVoiceResources();
        const blob = new Blob(chunks, { type: recordingMimeTypeRef.current });
        void transcribeRecordedAudio(blob, languageOverride || voiceLanguage, shouldAutoSend);
      };

      recorder.start();

      try {
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
        console.warn('Could not initialize mic volume tracking for animations:', mediaErr);
      }
    } catch (err: any) {
      let message = err?.message || 'Failed to start local voice recording.';
      if (err?.name === 'NotAllowedError' || err?.name === 'SecurityError') {
        message = 'Microphone permission is blocked. Allow microphone access and try again.';
      } else if (err?.name === 'NotFoundError') {
        message = 'No microphone was detected. Check your input device and try again.';
      }
      console.error('Failed to start local voice recording:', message);
      setVoiceError(message);
      showToast(message);
      setIsVoiceListening(false);
      releaseVoiceResources();
    }
  };

  const stopVoiceDictation = (shouldAutoSend = true) => {
    if (mediaRecorderRef.current) {
      autoSendAfterRecordingRef.current = shouldAutoSend;
      try {
        if (mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
          setVoiceInterimText('Preparing local transcription...');
          return;
        }
      } catch (err) {
        console.error('Error stopping local voice recorder:', err);
      }
      mediaRecorderRef.current = null;
    }

    releaseVoiceResources();
    setIsVoiceListening(false);
    setVoiceInterimText('');
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
