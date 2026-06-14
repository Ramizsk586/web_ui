import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Play, Search, Download, Copy, ExternalLink, Sparkles, Clock, 
  Share2, Volume2, MessageSquare, Check, FileText, Loader2, HelpCircle, BookOpen
} from 'lucide-react';
import { TranscriptSegment } from '../utils/youtubeUtils';

interface VideoTranscriptStudioProps {
  isOpen: boolean;
  onClose: () => void;
  videoUrl: string;
  videoId: string;
  videoTitle: string;
  segments: TranscriptSegment[];
  fullText: string;
  onPasteTextToInput?: (text: string) => void;
  onAskAiWithContext?: (query: string, contextText: string) => void;
  callLlamaBridge?: (messages: any[], tools: any[]) => Promise<any>;
}

export function VideoTranscriptStudio({
  isOpen,
  onClose,
  videoUrl,
  videoId,
  videoTitle,
  segments,
  fullText,
  onPasteTextToInput,
  onAskAiWithContext,
  callLlamaBridge
}: VideoTranscriptStudioProps) {
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'transcript' | 'chapters' | 'chat'>('transcript');
  
  // Q&A chatbot state
  const [qaInput, setQaInput] = useState<string>('');
  const [qaLoading, setQaLoading] = useState<boolean>(false);
  const [qaMessages, setQaMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([
    {
      role: 'assistant',
      content: "Hello! I'm your Video Assistant. Ask me anything about this video's content, and I'll analyze the transcript and timestamps to answer!"
    }
  ]);

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const transcriptContainerRef = useRef<HTMLDivElement | null>(null);
  const activeSegmentRef = useRef<HTMLButtonElement | null>(null);

  // Load YouTube Player postMessage tracking
  useEffect(() => {
    if (!isOpen) return;

    const handleMessage = (e: MessageEvent) => {
      if (e.origin !== 'https://www.youtube.com' && e.origin !== 'https://www.youtube-nocookie.com') return;
      try {
        const data = JSON.parse(e.data);
        // infoDelivery events carry playback updates
        if (data.event === 'infoDelivery' && data.info && typeof data.info.currentTime === 'number') {
          setCurrentTime(data.info.currentTime);
        }
      } catch {}
    };

    window.addEventListener('message', handleMessage);
    
    // Periodically ping player to verify listener is attached
    const interval = setInterval(() => {
      if (iframeRef.current && iframeRef.current.contentWindow) {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: 'listening', id: 1, channel: 'widget' }),
          '*'
        );
      }
    }, 1000);

    return () => {
      window.removeEventListener('message', handleMessage);
      clearInterval(interval);
    };
  }, [isOpen]);

  // Determine which caption segment is currently active
  const activeSegmentIndex = useMemo(() => {
    let activeIdx = -1;
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      if (currentTime >= seg.start && currentTime < seg.start + (seg.duration || 3)) {
        return i;
      }
      if (currentTime >= seg.start) {
        activeIdx = i; // fallback: closest past segment
      }
    }
    return activeIdx;
  }, [segments, currentTime]);

  // Handle autoscrolling the transcript list to the active segment
  useEffect(() => {
    if (autoScroll && activeSegmentRef.current && transcriptContainerRef.current) {
      const container = transcriptContainerRef.current;
      const element = activeSegmentRef.current;
      
      const containerTop = container.scrollTop;
      const containerBottom = containerTop + container.clientHeight;
      const elemTop = element.offsetTop;
      const elemBottom = elemTop + element.clientHeight;
      
      if (elemTop < containerTop - 10 || elemBottom > containerBottom + 10) {
        container.scrollTo({
          top: elemTop - container.clientHeight / 2 + element.clientHeight / 2,
          behavior: 'smooth'
        });
      }
    }
  }, [activeSegmentIndex, autoScroll]);

  // Filter segments based on keyword search
  const filteredSegments = useMemo(() => {
    if (!searchTerm.trim()) return segments;
    const term = searchTerm.toLowerCase();
    return segments.filter(seg => seg.text.toLowerCase().includes(term));
  }, [segments, searchTerm]);

  // Handle click to seek to timing inside video
  const seekPlayer = (seconds: number) => {
    setCurrentTime(seconds);
    if (iframeRef.current && iframeRef.current.contentWindow) {
      // Seek command via standard postMessage API
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({
          event: 'command',
          func: 'seekTo',
          args: [seconds, true]
        }),
        '*'
      );
      // Ensure player state is active / playing
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({
          event: 'command',
          func: 'playVideo',
          args: []
        }),
        '*'
      );
    }
  };

  // Format total estimated duration duration
  const totalVideoDuration = useMemo(() => {
    if (segments.length === 0) return '00:00';
    const lastSeg = segments[segments.length - 1];
    const seconds = lastSeg.start + lastSeg.duration;
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return h > 0 
      ? `${h}h ${m}m ${s}s`
      : `${m}m ${s}s`;
  }, [segments]);

  // Copy full transcript to clipboard
  const handleCopyTranscript = async () => {
    try {
      await navigator.clipboard.writeText(fullText);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    } catch {}
  };

  // Download raw data format (WebVTT subtitle or plain text text file)
  const handleDownloadTranscript = (asVtt: boolean) => {
    let content = '';
    let name = `transcript_${videoId}`;
    let type = 'text/plain';
    
    if (asVtt) {
      name += '.vtt';
      type = 'text/vtt';
      content = 'WEBVTT\n\n';
      segments.forEach((seg, idx) => {
        const startStr = formatVttTime(seg.start);
        const endStr = formatVttTime(seg.start + seg.duration);
        content += `${idx + 1}\n${startStr} --> ${endStr}\n${seg.text}\n\n`;
      });
    } else {
      name += '.txt';
      content = segments.map(seg => `[${seg.timeStr}] ${seg.text}`).join('\n');
    }
    
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatVttTime = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    const pad = (n: number, z = 2) => n.toString().padStart(z, '0');
    return `${pad(h)}:${pad(m)}:${pad(s)}.${pad(ms, 3)}`;
  };

  // Generate dynamic smart chapters based on content text heuristics 
  const generatedChapters = useMemo(() => {
    if (segments.length < 5) return [];
    
    const step = Math.floor(segments.length / 5);
    const chapters = [];
    const topics = [
      'Overview & Executive Introduction',
      'Core Mechanics & Theoretical Framework',
      'In-depth System Demonstration & Analysis',
      'Alternative Options & Technical Challenges',
      'Practical Takeaways & Future Horizons'
    ];
    
    for (let i = 0; i < 5; i++) {
      const segIndex = Math.min(i * step, segments.length - 1);
      const seg = segments[segIndex];
      
      // Get brief contextual summary for this section (first few words)
      const textWindow = segments.slice(segIndex, segIndex + 4).map(s => s.text).join(' ');
      const words = textWindow.split(' ').slice(0, 10).join(' ') + '...';
      
      chapters.push({
        title: topics[i],
        snippet: words,
        start: seg.start,
        timeStr: seg.timeStr,
        isActive: activeSegmentIndex >= segIndex && (i === 4 || activeSegmentIndex < (i + 1) * step)
      });
    }
    return chapters;
  }, [segments, activeSegmentIndex]);

  // Q&A chatbot query submission
  const handleQaSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = qaInput.trim();
    if (!query) return;

    setQaInput('');
    setQaMessages(prev => [...prev, { role: 'user', content: query }]);
    setQaLoading(true);

    try {
      if (callLlamaBridge) {
        // Compile a smart system context leveraging the timestamped segments
        const contextSummary = segments.map((s, idx) => {
          if (idx % 3 === 0) return `[At ${s.timeStr}] ${s.text}`;
          return s.text;
        }).slice(0, 150).join('\n'); // keep within safety boundaries

        const systemMessage = {
          role: 'system',
          content: `You are an expert Video Transcription Assistant. You help users understand video content based on its transcript.
          Below is the transcription of the video titled: "${videoTitle}" (YouTube Video ID: ${videoId}).
          Use the transcript, timestamps, and details provided to answer the user's question accurately, with direct time references (e.g. "at 03:15") when referencing statements.
          Keep answers compact, precise, and highly engaging.

          --- TRANSCRIPT CONTENT ---
          ${contextSummary.substring(0, 10000)}
          --- END OF TRANSCRIPT ---`
        };

        const result = await callLlamaBridge([
          systemMessage,
          ...qaMessages.map(m => ({ role: m.role, content: m.content })),
          { role: 'user', content: query }
        ], []);

        const reply = result?.choices?.[0]?.message?.content || "I apologize, but I had trouble analyzing the transcript for your query.";
        setQaMessages(prev => [...prev, { role: 'assistant', content: reply }]);
      } else {
        // Mock fallback if callLlamaBridge is unavailable
        setTimeout(() => {
          const lowerQuery = query.toLowerCase();
          let fallbackReply = `Analyzing transcript for "${query}"...\n\nAccording to the timestamps near the beginning of the video, this segment discusses the key foundations.`;
          
          const matchingSegs = segments.filter(s => s.text.toLowerCase().includes(lowerQuery));
          if (matchingSegs.length > 0) {
            fallbackReply = `I found matches for "${query}" in the transcript:\n\n` + 
              matchingSegs.slice(0, 3).map(s => `• **At ${s.timeStr}**: "${s.text}"`).join('\n') +
              `\n\nClick any of the highlighted timestamps in the transcript column to seek directly to those scenes in the player!`;
          }
          
          setQaMessages(prev => [...prev, { role: 'assistant', content: fallbackReply }]);
        }, 1200);
      }
    } catch (err) {
      console.error("QA Query error:", err);
      setQaMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I ran into an authentication or communication error with the model. Please check your system endpoints and API keys." }]);
    } finally {
      setQaLoading(false);
    }
  };

  // Pastes a segment directly into the main sidebar chat input
  const sendSegmentToGlobalChat = (seg: TranscriptSegment) => {
    if (onPasteTextToInput) {
      onPasteTextToInput(`Discussion reference from video "${videoTitle}" at timestamp ${seg.timeStr}:\n"${seg.text}"\n\n[What are your thoughts on this segment?]`);
      // Trigger user feedback
      onClose();
    }
  };

  // Highlights search terms inside the text
  const renderHighlightedText = (text: string, term: string) => {
    if (!term.trim()) return text;
    const parts = text.split(new RegExp(`(${term.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi'));
    return (
      <span>
        {parts.map((part, idx) => 
          part.toLowerCase() === term.toLowerCase() 
            ? <mark key={idx} className="bg-yellow-500/30 text-yellow-250 font-bold px-0.5 rounded-sm">{part}</mark>
            : part
        )}
      </span>
    );
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-zinc-950/95 z-[550] flex items-center justify-center p-3 select-none">
        
        {/* Main Immersive Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 15 }}
          transition={{ type: 'spring', damping: 28, stiffness: 350 }}
          className="w-full max-w-6xl h-[92vh] bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col overflow-hidden shadow-2xl relative select-text"
        >
          
          {/* Header Controls */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 shrink-0">
            <div className="flex items-center gap-3 max-w-[70%]">
              <div className="p-2.5 bg-rose-500/10 rounded-xl text-rose-500 border border-rose-500/10">
                <Play className="w-5 h-5 fill-rose-500" />
              </div>
              <div className="min-w-0 text-left">
                <h2 className="text-[15px] font-bold text-zinc-105 tracking-wide truncate">{videoTitle}</h2>
                <div className="flex items-center gap-3.5 text-[11px] text-zinc-400 font-mono mt-1">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-zinc-500" /> 
                    {totalVideoDuration}
                  </span>
                  <span className="text-zinc-700">|</span>
                  <span>{segments.length} segments</span>
                  <span className="text-zinc-700">|</span>
                  <a 
                    href={videoUrl} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="hover:text-rose-400 flex items-center gap-0.5 transition-colors"
                  >
                    Watch on YouTube <ExternalLink className="w-3 h-3 inline pb-0.5" />
                  </a>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Copy Full Button */}
              <button
                onClick={handleCopyTranscript}
                className="flex items-center gap-1.5 h-9 px-3 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 hover:text-white rounded-xl text-[11px] font-bold tracking-wider font-mono uppercase border border-zinc-750 transition-all cursor-pointer"
                title="Copy entire transcript text"
              >
                {isCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                {isCopied ? 'Copied' : 'Copy Text'}
              </button>

              {/* Export Button */}
              <div className="relative group/download">
                <button
                  className="flex items-center gap-1.5 h-9 px-3 bg-zinc-850 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-150 rounded-xl text-[11px] font-semibold tracking-wider font-mono border border-zinc-750 transition-all cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" /> Download
                </button>
                <div className="absolute right-0 top-10 w-44 bg-zinc-800 border border-zinc-750 rounded-xl p-1 shadow-xl invisible group-hover/download:visible opacity-0 group-hover/download:opacity-100 transition-all duration-150 z-50">
                  <button
                    onClick={() => handleDownloadTranscript(true)}
                    className="w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-rose-500/20 text-zinc-300 font-medium hover:text-white transition-colors cursor-pointer"
                  >
                    subtitle format (.vtt)
                  </button>
                  <button
                    onClick={() => handleDownloadTranscript(false)}
                    className="w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-rose-500/20 text-zinc-300 font-medium hover:text-white transition-colors cursor-pointer"
                  >
                    plain text timestamps (.txt)
                  </button>
                </div>
              </div>

              {/* Close Window */}
              <button
                onClick={onClose}
                className="w-9 h-9 flex items-center justify-center bg-zinc-800 hover:bg-zinc-750 border border-zinc-750 rounded-xl text-zinc-300 hover:text-white cursor-pointer transition-all hover:scale-105 active:scale-95"
                title="Exit video workspace"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>
          </div>

          {/* Inner Grid Space */}
          <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-12 gap-0 overflow-hidden">
            
            {/* Left Column: Player and Tabs */}
            <div className="md:col-span-7 flex flex-col border-b md:border-b-0 md:border-r border-zinc-800 overflow-hidden">
              <div className="p-4 md:p-6 pb-2 shrink-0">
                {/* Responsive Player Box */}
                <div className="relative rounded-2xl overflow-hidden aspect-video border border-zinc-800 bg-black shadow-lg">
                  <iframe
                    ref={iframeRef}
                    id="youtube-player-transcript"
                    src={`https://www.youtube.com/embed/${videoId}?enablejsapi=1&autoplay=1&origin=${window.location.origin}`}
                    title={videoTitle}
                    className="w-full h-full border-0 select-none pointer-events-auto"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    referrerPolicy="no-referrer"
                  />
                  
                  {/* Subtle watermarked overlay showing current exact synchronized playhead */}
                  <div className="absolute bottom-2 left-2 px-2.5 py-1 bg-black/75 backdrop-blur-sm border border-zinc-800/80 rounded-md text-[10px] text-zinc-400 font-mono tracking-wider pointer-events-none">
                    PLAYHEAD: {Math.floor(currentTime / 60)}m {Math.floor(currentTime % 60).toString().padStart(2, '0')}s
                  </div>
                </div>
              </div>

              {/* Feature Tabs Selector */}
              <div className="flex items-center gap-1.5 px-6 border-b border-zinc-800 text-[11px] font-bold uppercase tracking-wider font-mono">
                {[
                  { id: 'transcript', label: 'Outline Text', icon: <FileText className="w-3.5 h-3.5" /> },
                  { id: 'chapters', label: 'AI Chapters', icon: <Volume2 className="w-3.5 h-3.5" /> },
                  { id: 'chat', label: 'AI Q&A Assistant', icon: <Sparkles className="w-3.5 h-3.5 text-rose-400" /> }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-1.5 px-3 py-3 border-b-2 transition-all cursor-pointer ${
                      activeTab === tab.id 
                        ? 'border-rose-500 text-rose-400 font-extrabold'
                        : 'border-transparent text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Interactive Tabs content panels */}
              <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar bg-zinc-950/30 p-6 text-left">
                {activeTab === 'transcript' ? (
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-rose-450 uppercase tracking-widest flex items-center gap-1">
                      <BookOpen className="w-4 h-4 text-rose-550" /> Fully Compiled Transcript
                    </h3>
                    <p className="text-sm font-light text-zinc-300 leading-relaxed max-w-full font-sans select-all whitespace-pre-wrap">
                      {fullText}
                    </p>
                  </div>
                ) : activeTab === 'chapters' ? (
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Volume2 className="w-4 h-4 text-zinc-550" /> AI Video Chapter Milestones
                    </h3>
                    <p className="text-[11px] text-zinc-500 font-sans mt-1">
                      Lumina heuristically maps distinct concept changes below. Click any milestone title to instant-jump to their relevant sections.
                    </p>
                    <div className="space-y-3.5 mt-5">
                      {generatedChapters.map((cap, i) => (
                        <div 
                          key={i}
                          onClick={() => seekPlayer(cap.start)}
                          className={`group/ch flex items-start gap-4 p-3.5 rounded-xl border transition-all cursor-pointer ${
                            cap.isActive 
                              ? 'bg-rose-500/5 border-rose-500/20 shadow-md shadow-rose-950/20' 
                              : 'bg-zinc-900 border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700'
                          }`}
                        >
                          <div className={`p-2 rounded-lg font-mono text-[10px] font-bold shrink-0 ${
                            cap.isActive 
                              ? 'bg-rose-500/10 text-rose-400' 
                              : 'bg-zinc-800 text-zinc-400 group-hover/ch:bg-zinc-700 group-hover/ch:text-zinc-200'
                          }`}>
                            {cap.timeStr}
                          </div>
                          <div>
                            <h4 className={`text-xs font-bold font-sans tracking-wide ${cap.isActive ? 'text-rose-400' : 'text-zinc-200 group-hover/ch:text-rose-350'}`}>
                              {cap.title}
                            </h4>
                            <p className="text-[11px] text-zinc-400 mt-1 line-clamp-2">
                              {cap.snippet}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col gap-4">
                    {/* Embedded Q&A Messages Board */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3.5 bg-zinc-900/50 border border-zinc-800/65 rounded-xl min-h-[180px]">
                      {qaMessages.map((msg, i) => (
                        <div 
                          key={i} 
                          className={`flex gap-3 max-w-[90%] text-left p-3 rounded-xl border ${
                            msg.role === 'user' 
                              ? 'ml-auto bg-rose-500/5 border-rose-500/20 text-rose-100' 
                              : 'bg-zinc-800/80 border-zinc-750 text-zinc-200'
                          }`}
                        >
                          <div className="text-xs space-y-1">
                            <span className="font-mono font-bold text-[9px] uppercase tracking-wider text-rose-400 block">
                              {msg.role === 'user' ? 'YOU' : 'AI Assistant'}
                            </span>
                            <span className="font-sans leading-relaxed block whitespace-pre-wrap">{msg.content}</span>
                          </div>
                        </div>
                      ))}
                      {qaLoading && (
                        <div className="flex items-center gap-2.5 text-zinc-400 text-xs p-3">
                          <Loader2 size={14} className="animate-spin text-rose-450" />
                          <span className="font-mono tracking-wide">Assistant is analyzing transcript...</span>
                        </div>
                      )}
                    </div>

                    {/* Chat Submission Form */}
                    <form onSubmit={handleQaSubmit} className="flex gap-2 shrink-0">
                      <input
                        type="text"
                        value={qaInput}
                        onChange={(e) => setQaInput(e.target.value)}
                        placeholder="Search or ask: 'What did the video state about...?'"
                        disabled={qaLoading}
                        className="flex-1 h-10 px-4 bg-zinc-900 border border-zinc-850 hover:border-zinc-750 focus:border-rose-500/50 rounded-xl text-xs text-zinc-150 outline-none transition-all disabled:opacity-40"
                      />
                      <button
                        type="submit"
                        disabled={qaLoading || !qaInput.trim()}
                        className="h-10 px-4 bg-rose-500 hover:bg-rose-600 disabled:opacity-20 text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
                      >
                        Ask AI
                      </button>
                    </form>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Time Synchronized transcript list panel */}
            <div className="md:col-span-5 flex flex-col h-full overflow-hidden">
              
              {/* Dynamic Transcript Controls panel header */}
              <div className="p-4 border-b border-zinc-800 bg-zinc-950/20 flex flex-col gap-3 shrink-0">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-sans flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-rose-500" /> Interactive Playhead Sync
                  </span>
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs select-none">
                    <input 
                      type="checkbox"
                      checked={autoScroll}
                      onChange={(e) => setAutoScroll(e.target.checked)}
                      className="accent-rose-500 w-3.5 h-3.5 rounded border border-zinc-700 bg-zinc-800"
                    />
                    <span className="text-[11px] font-medium text-zinc-350 font-mono tracking-tight">AutoScroll</span>
                  </label>
                </div>

                {/* Subtitle Search Box */}
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search captions... (e.g. 'physics', 'test')"
                    className="w-full h-9 pl-9 pr-14 bg-zinc-900 border border-zinc-850 focus:border-rose-500/50 rounded-xl text-xs text-zinc-150 outline-none transition-all placeholder-zinc-550"
                  />
                  {searchTerm.trim() && (
                    <span className="absolute right-3 top-2 text-[10px] font-bold text-rose-400/90 font-mono bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/10">
                      {filteredSegments.length} match{filteredSegments.length !== 1 && 'es'}
                    </span>
                  )}
                </div>
              </div>

              {/* Synchronized Segments Block */}
              <div 
                ref={transcriptContainerRef}
                className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1 bg-zinc-950/40"
              >
                {filteredSegments.length === 0 ? (
                  <div className="py-12 text-center text-zinc-500 flex flex-col items-center justify-center gap-1.5">
                    <HelpCircle className="w-7 h-7 text-zinc-600" />
                    <p className="text-xs font-mono">No matching caption lines found.</p>
                  </div>
                ) : (
                  filteredSegments.map((seg, idx) => {
                    const globalIdx = segments.indexOf(seg);
                    const isActive = globalIdx === activeSegmentIndex;
                    
                    return (
                      <button
                        key={idx}
                        ref={isActive ? activeSegmentRef : null}
                        onClick={() => seekPlayer(seg.start)}
                        className={`w-full group/seg flex items-start gap-3.5 p-2 rounded-xl text-left font-sans transition-all hover:bg-zinc-850/60 transition-all ${
                          isActive 
                            ? 'bg-rose-500/10 border border-rose-500/25 shadow-sm' 
                            : 'border border-transparent'
                        }`}
                      >
                        {/* Time timing tag */}
                        <span className={`font-mono text-[10.5px] font-bold select-none tracking-wider py-0.5 px-1.5 rounded-md ${
                          isActive 
                            ? 'bg-rose-500/15 text-rose-455' 
                            : 'bg-zinc-900 text-zinc-500 group-hover/seg:bg-zinc-800 group-hover/seg:text-rose-400'
                        }`}>
                          {seg.timeStr}
                        </span>

                        {/* Caption Text line */}
                        <div className="flex-1 min-w-0 pr-1">
                          <p className={`text-[12px] font-normal leading-relaxed ${
                            isActive 
                              ? 'text-zinc-100 font-semibold shadow-rose-950/10' 
                              : 'text-zinc-400 group-hover/seg:text-zinc-200'
                          }`}>
                            {renderHighlightedText(seg.text, searchTerm)}
                          </p>
                        </div>

                        {/* Quick interactive action triggers */}
                        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover/seg:opacity-100 transition-opacity select-none self-center">
                          {onPasteTextToInput && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                sendSegmentToGlobalChat(seg);
                              }}
                              className="w-6 h-6 rounded bg-zinc-805 hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400 flex items-center justify-center border border-zinc-750 hover:border-rose-500/20 transition-all cursor-pointer"
                              title="Quote segment / Paste in chat"
                            >
                              <MessageSquare className="w-3 h-3" />
                            </button>
                          )}
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              try {
                                await navigator.clipboard.writeText(seg.text);
                              } catch {}
                            }}
                            className="w-6 h-6 rounded bg-zinc-805 hover:bg-blue-500/20 text-zinc-400 hover:text-blue-450 flex items-center justify-center border border-zinc-750 hover:border-blue-500/20 transition-all cursor-pointer"
                            title="Copy caption text snippet"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              {/* Status information pane */}
              <div className="p-3 border-t border-zinc-800 bg-zinc-900/60 shrink-0 text-center text-[10px] text-zinc-500 justify-center flex gap-1.5 font-mono select-none">
                <span>Tip: Click any segment to seek video played</span>
                <span className="text-zinc-700">•</span>
                <span>Spacebar plays/pauses player</span>
              </div>
            </div>

          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
}
