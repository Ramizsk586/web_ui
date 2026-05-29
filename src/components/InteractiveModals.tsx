import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  ExternalLink, 
  Download, 
  Play, 
  Link as LinkIcon, 
  Loader2, 
  Video, 
  Code, 
  FileText, 
  Activity 
} from 'lucide-react';

// ======================== Lightbox Component ========================
interface ImageLightboxProps {
  image: { url: string; title?: string } | null;
  onClose: () => void;
}

export function ImageLightbox({ image, onClose }: ImageLightboxProps) {
  return (
    <AnimatePresence>
      {image && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/90 backdrop-blur-md z-[500] flex items-center justify-center p-4 select-none"
          onClick={onClose}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-3 bg-zinc-900/80 hover:bg-zinc-850 border border-zinc-800 rounded-full text-white cursor-pointer transition-all hover:scale-105 z-[510] shadow-lg flex items-center justify-center w-10 h-10"
            title="Close image display"
          >
            <X size={18} />
          </button>

          <motion.div
            initial={{ scale: 0.95, y: 15 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 15 }}
            transition={{ type: "spring", damping: 25, stiffness: 350 }}
            className="relative max-w-5xl max-h-[85vh] w-full flex flex-col items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-950 shadow-2xl flex items-center justify-center max-h-[70vh]">
              <img
                src={image.url}
                alt={image.title || 'Image detail view'}
                className="max-w-full max-h-[70vh] object-contain select-text"
                referrerPolicy="no-referrer"
              />
            </div>

            <div className="mt-4 flex flex-col sm:flex-row items-center gap-3 justify-between w-full max-w-3xl bg-zinc-900/90 border border-zinc-805 px-5 py-3 rounded-2xl shadow-xl">
              <div className="text-left select-text truncate pr-4 max-w-[80%]">
                <h4 className="text-xs font-bold text-zinc-150 tracking-wide truncate">{image.title || 'Visual Attachment'}</h4>
                <p className="text-[10px] text-zinc-400 truncate font-mono mt-0.5">{image.url}</p>
              </div>
              <div className="flex items-center gap-2.5 shrink-0">
                <a
                  href={image.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] font-bold rounded-xl border border-zinc-700/50 transition-all cursor-pointer shadow-xs no-underline"
                >
                  <ExternalLink size={12} />
                  <span>Open Original</span>
                </a>
                <button
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = image.url;
                    link.download = image.title || 'scraped-image';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-[11px] font-black rounded-xl transition-all cursor-pointer shadow-md"
                >
                  <Download size={12} />
                  <span>Download</span>
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ======================== Video Popup Player Component ========================
interface VideoPlayerPopupProps {
  video: { url: string; title?: string } | null;
  onClose: () => void;
}

export function VideoPlayerPopup({ video, onClose }: VideoPlayerPopupProps) {
  return (
    <AnimatePresence>
      {video && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/95 backdrop-blur-md z-[500] flex items-center justify-center p-4"
          onClick={onClose}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-3 bg-zinc-900/80 hover:bg-zinc-850 border border-zinc-800 rounded-full text-white cursor-pointer transition-all hover:scale-105 z-[510] shadow-lg flex items-center justify-center w-10 h-10 focus:outline-none"
            title="Close video player"
          >
            <X size={18} />
          </button>

          <motion.div
            initial={{ scale: 0.95, y: 15 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 15 }}
            transition={{ type: "spring", damping: 25, stiffness: 350 }}
            className="relative max-w-4xl w-full flex flex-col items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-950 shadow-2xl flex items-center justify-center w-full aspect-video select-none">
              {(() => {
                if (!video.url) return null;
                
                let youtubeId = null;
                const ytMatch = video.url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
                if (ytMatch) youtubeId = ytMatch[1];
                
                let vimeoId = null;
                const vimeoMatch = video.url.match(/(?:vimeo\.com\/)(?:channels\/[^\/]+\/|groups\/[^\/]+\/video\/|album\/[^\/]+\/video\/|showcase\/[^\/]+\/video\/|video\/)?([0-9]+)/i);
                if (vimeoMatch) vimeoId = vimeoMatch[1];

                if (youtubeId) {
                  return (
                    <iframe
                      src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1`}
                      title={video.title || 'YouTube Video'}
                      className="w-full h-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      referrerPolicy="no-referrer"
                    />
                  );
                } else if (vimeoId) {
                  return (
                    <iframe
                      src={`https://player.vimeo.com/video/${vimeoId}?autoplay=1`}
                      title={video.title || 'Vimeo Video'}
                      className="w-full h-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      referrerPolicy="no-referrer"
                    />
                  );
                } else if (video.url.includes('/embed/')) {
                  return (
                    <iframe
                      src={video.url}
                      title={video.title || 'Embedded Video'}
                      className="w-full h-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      referrerPolicy="no-referrer"
                    />
                  );
                } else {
                  return (
                    <video
                      src={video.url}
                      title={video.title || 'Direct Media Video Player'}
                      controls
                      autoPlay
                      className="w-full h-full object-contain rounded-2xl bg-neutral-950"
                    />
                  );
                }
              })()}
            </div>

            <div className="mt-4 flex flex-col sm:flex-row items-center gap-3 justify-between w-full bg-zinc-900/95 border border-zinc-800 px-5 py-3.5 rounded-2xl shadow-xl select-text">
              <div className="text-left truncate pr-4 max-w-[80%]">
                <h4 className="text-sm font-bold text-zinc-150 tracking-wide truncate flex items-center gap-1.5">
                  <Play size={13} className="text-orange-500 fill-orange-500 shrink-0" />
                  <span>{video.title || 'Lumina Media player'}</span>
                </h4>
                <p className="text-[10px] text-zinc-500 truncate font-mono mt-1">{video.url}</p>
              </div>
              <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
                <a
                  href={video.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] font-bold rounded-xl border border-zinc-750/50 transition-all cursor-pointer shadow-xs no-underline"
                >
                  <ExternalLink size={12} />
                  <span>Open in New Tab</span>
                </a>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ======================== URL Attachment Modal ========================
interface UrlAttachmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  urlInput: string;
  setUrlInput: (val: string) => void;
  loading: boolean;
  error: string | null;
  setError: (err: string | null) => void;
  onSubmit: () => void;
}

export function UrlAttachmentModal({
  isOpen,
  onClose,
  urlInput,
  setUrlInput,
  loading,
  error,
  setError,
  onSubmit
}: UrlAttachmentModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[600] flex items-center justify-center p-4 font-sans"
          onClick={() => { if (!loading) { onClose(); setError(null); setUrlInput(''); } }}
        >
          <motion.div
            initial={{ scale: 0.96, y: 12 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.96, y: 12 }}
            transition={{ type: 'spring', damping: 26, stiffness: 380 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-2xl shadow-2xl p-6 flex flex-col gap-4 text-left"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-500/10 rounded-xl">
                  <LinkIcon size={16} className="text-blue-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[var(--theme-primary)]">Attach URL</h3>
                  <p className="text-[11px] text-[var(--theme-muted)] mt-1">Scrape a web page and attach it as context</p>
                </div>
              </div>
              <button
                onClick={() => { onClose(); setError(null); setUrlInput(''); }}
                disabled={loading}
                className="p-1.5 hover:bg-[var(--theme-hover-bg)] rounded-lg text-[var(--theme-secondary)] hover:text-[var(--theme-primary)] transition-all cursor-pointer disabled:opacity-40"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-semibold text-[var(--theme-secondary)] uppercase tracking-widest">
                Page URL
              </label>
              <input
                type="url"
                value={urlInput}
                onChange={(e) => { setUrlInput(e.target.value); setError(null); }}
                onKeyDown={(e) => { if (e.key === 'Enter' && !loading) onSubmit(); }}
                placeholder="https://example.com/article"
                disabled={loading}
                autoFocus
                className="w-full h-11 px-4 bg-[var(--theme-hover-bg)] border border-[var(--theme-border)] focus:border-blue-500/50 rounded-xl text-sm text-[var(--theme-primary)] placeholder-[var(--theme-muted)] outline-none transition-all disabled:opacity-50"
              />
              {error && (
                <p className="text-xs text-rose-400 font-medium">{error}</p>
              )}
            </div>

            <button
              onClick={onSubmit}
              disabled={!urlInput.trim() || loading}
              className="w-full h-11 flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl transition-all shadow-md cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Fetching page...</span>
                </>
              ) : (
                <>
                  <LinkIcon size={15} />
                  <span>Fetch &amp; Attach</span>
                </>
              )}
            </button>

            <p className="text-[10px] text-center text-[var(--theme-muted)]">
              The page content will be compressed and attached as a document for the AI to read.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ======================== Transcript Tool Modal ========================
interface TranscriptModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoUrlInput: string;
  setVideoUrlInput: (val: string) => void;
  loading: boolean;
  error: string | null;
  setError: (err: string | null) => void;
  onSubmit: () => void;
}

export function TranscriptModal({
  isOpen,
  onClose,
  videoUrlInput,
  setVideoUrlInput,
  loading,
  error,
  setError,
  onSubmit
}: TranscriptModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[600] flex items-center justify-center p-4 font-sans"
          onClick={() => { if (!loading) { onClose(); setError(null); setVideoUrlInput(''); } }}
        >
          <motion.div
            initial={{ scale: 0.96, y: 12 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.96, y: 12 }}
            transition={{ type: 'spring', damping: 26, stiffness: 380 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-2xl shadow-2xl p-6 flex flex-col gap-4 text-left"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-rose-500/10 rounded-xl">
                  <Video size={16} className="text-rose-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[var(--theme-primary)]">Video Transcript</h3>
                  <p className="text-[11px] text-[var(--theme-muted)] mt-1">Fetch captions from YouTube &amp; attach as context</p>
                </div>
              </div>
              <button
                onClick={() => { onClose(); setError(null); setVideoUrlInput(''); }}
                disabled={loading}
                className="p-1.5 hover:bg-[var(--theme-hover-bg)] rounded-lg text-[var(--theme-secondary)] hover:text-[var(--theme-primary)] transition-all cursor-pointer disabled:opacity-40"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-semibold text-[var(--theme-secondary)] uppercase tracking-widest">
                YouTube URL
              </label>
              <input
                type="url"
                value={videoUrlInput}
                onChange={(e) => { setVideoUrlInput(e.target.value); setError(null); }}
                onKeyDown={(e) => { if (e.key === 'Enter' && !loading) onSubmit(); }}
                placeholder="https://youtube.com/watch?v=..."
                disabled={loading}
                autoFocus
                className="w-full h-11 px-4 bg-[var(--theme-hover-bg)] border border-[var(--theme-border)] focus:border-rose-500/50 rounded-xl text-sm text-[var(--theme-primary)] placeholder-[var(--theme-muted)] outline-none transition-all disabled:opacity-50"
              />
              {error && (
                <p className="text-xs text-rose-400 font-medium">{error}</p>
              )}
            </div>

            <button
              onClick={onSubmit}
              disabled={!videoUrlInput.trim() || loading}
              className="w-full h-11 flex items-center justify-center gap-2 bg-rose-500 hover:bg-rose-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl transition-all shadow-md cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Fetching transcript...</span>
                </>
              ) : (
                <>
                  <Video size={15} />
                  <span>Get Transcript</span>
                </>
              )}
            </button>

            <div className="text-[10px] text-center text-[var(--theme-muted)] space-y-0.5">
              <p>Works with YouTube videos that have captions enabled.</p>
              <p className="text-[var(--theme-muted)]/60">Supports <code className="font-mono">youtube.com/watch</code> and <code className="font-mono">youtu.be</code> links.</p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ======================== Element Analysis Report Component ========================
interface ElementAnalysisModalProps {
  attachment: {
    fileName: string;
    filePath: string;
    elementWork?: string;
    specificCode?: string;
    connections?: Array<{ fileName: string; filePath?: string; name?: string }>;
  } | null;
  onClose: () => void;
  onEditFile: (path: string) => void;
}

export function ElementAnalysisModal({
  attachment,
  onClose,
  onEditFile
}: ElementAnalysisModalProps) {
  return (
    <AnimatePresence>
      {attachment && (
        <div className="fixed inset-0 z-[220] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          <motion.div 
            initial={{ opacity: 0, scale: 0.96, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 15 }}
            className="relative w-full max-w-2xl bg-[#1C1816] text-[#EDE6DD] rounded-2xl shadow-2xl border border-[#2D241E] overflow-hidden flex flex-col h-[80vh] font-mono"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Real Header block */}
            <div className="px-6 py-4 border-b border-[#2D241E] bg-[#141110] flex items-center justify-between select-none shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-[#D97756] animate-pulse" />
                <span className="text-[11px] font-bold uppercase tracking-widest text-[#D97756]">Module Analysis Insight</span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1 hover:bg-zinc-850 rounded-lg text-zinc-500 hover:text-white transition-all cursor-pointer"
                title="Exit element view info"
              >
                <X size={16} />
              </button>
            </div>

            {/* Scroll Container body elements */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar text-left font-sans select-none">
              <div className="flex flex-col gap-1.5 font-sans">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#D97756] font-mono">1. Module Environment</span>
                <div className="bg-[#14110F] border border-[#221D1A] rounded-xl p-3 flex items-center justify-between">
                  <div className="truncate pr-4">
                    <span className="font-semibold text-zinc-150 block text-xs truncate font-sans">{attachment.fileName}</span>
                    <span className="text-[10px] text-zinc-500 truncate block mt-1 font-mono">{attachment.filePath}</span>
                  </div>
                  <button
                    onClick={() => {
                      onEditFile(attachment.filePath);
                      onClose();
                    }}
                    className="px-3 py-1.5 bg-[#D97756]/10 text-[#D97756] hover:bg-[#D97756]/15 text-xs font-bold rounded-lg border border-[#D97756]/30 transition-all cursor-pointer flex items-center gap-1.5 shrink-0 font-sans"
                  >
                    <Code size={12} />
                    <span>Edit File</span>
                  </button>
                </div>
              </div>

              {/* Element Work */}
              {attachment.elementWork && (
                <div className="flex flex-col gap-1.5 font-sans">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#D97756] font-mono">2. Functionality & Actions</span>
                  <div className="bg-[#171412] border border-[#231E1B] rounded-xl p-3.5 text-xs text-zinc-350 leading-relaxed font-sans shadow-inner">
                    {attachment.elementWork}
                  </div>
                </div>
              )}

              {/* Specific Code */}
              {attachment.specificCode && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#D97756] font-mono">3. Controlling Code</span>
                  <div className="rounded-xl border border-[#2D241E] bg-[#14110F] overflow-hidden leading-relaxed font-mono">
                    <div className="bg-[#1C1816] px-4 py-2 border-b border-[#2D241E] flex items-center justify-between select-none">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Source Segment</span>
                      <span className="text-[9px] text-[#D97756] font-bold uppercase tracking-widest bg-[#D97756]/10 px-2 py-0.5 rounded-full border border-[#D97756]/20">Pure Javascript / TSX</span>
                    </div>
                    <pre className="p-4 text-xs text-zinc-300 custom-scrollbar max-h-60 overflow-y-auto whitespace-pre-wrap word-break select-text leading-relaxed font-mono bg-[#0f0d0c]">
                      {attachment.specificCode}
                    </pre>
                  </div>
                </div>
              )}

              {/* Connections */}
              {attachment.connections && attachment.connections.length > 0 && (
                <div className="flex flex-col gap-1.5 font-sans">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#D97756] font-mono">4. Module Connections</span>
                  <div className="flex flex-wrap gap-2 pt-0.5">
                    {attachment.connections.map((c: any, id: number) => (
                      <button
                        key={id}
                        onClick={() => {
                          onEditFile(c.filePath || c.name || '');
                          onClose();
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 border border-[#2D241E] hover:border-teal-500/40 text-xs text-zinc-150 hover:text-teal-400 rounded-lg transition-all cursor-pointer shadow-sm font-sans"
                        title={`Open ${c.fileName} in editor`}
                      >
                        <FileText size={12} className="text-zinc-550" />
                        <span className="font-semibold">{c.fileName}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Backing footer */}
            <div className="px-6 py-3 border-t border-[#2D241E] bg-[#141110] flex justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold rounded-lg transition-all cursor-pointer font-sans"
              >
                Close Report
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
