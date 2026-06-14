import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Video, Link as LinkIcon, X, Play, FileText, FileJson } from 'lucide-react';

interface TranscriptionOptionsModalProps {
  transcriptionOptionsDoc: any;
  setTranscriptionOptionsDoc: (doc: any) => void;
  ensureTranscriptFilesOnDisk: (doc: any) => Promise<void>;
  ensureScrapedFilesOnDisk: (doc: any) => Promise<void>;
  setFloatingEditFile: (filePath: string | null) => void;
  setSelectedTranscriptDoc: (doc: any) => void;
}

const TranscriptionOptionsModalComponent = ({
  transcriptionOptionsDoc,
  setTranscriptionOptionsDoc,
  ensureTranscriptFilesOnDisk,
  ensureScrapedFilesOnDisk,
  setFloatingEditFile,
  setSelectedTranscriptDoc,
}: TranscriptionOptionsModalProps) => {
  if (!transcriptionOptionsDoc) return null;

  const isVideo = !!transcriptionOptionsDoc.videoId && !!transcriptionOptionsDoc.segments;
  const rawTitle = transcriptionOptionsDoc.title;
  const safeTitle = rawTitle.replace(/[^a-zA-Z0-9-_.]/g, '_').slice(0, 50);
  const docId = transcriptionOptionsDoc.id;
  
  const markdownPath = `scraped_pages/${safeTitle || 'page'}_${docId}.md`;
  const jsonPath = `scraped_pages/${safeTitle || 'page'}_${docId}.json`;

  return (
    <div className="fixed inset-0 bg-zinc-950/80 z-[600] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl relative select-none"
      >
        {/* Header info */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl border shrink-0 ${
              isVideo ? 'bg-rose-500/10 text-rose-500 border-rose-500/10' :
              'bg-blue-500/10 text-blue-400 border-blue-500/10'
            }`}>
              {isVideo ? <Video className="w-5 h-5" /> : 
               <LinkIcon className="w-5 h-5" />}
            </div>
            <div className="text-left min-w-0">
              <h3 className="text-sm font-bold text-zinc-100 font-sans truncate max-w-[220px]">
                {transcriptionOptionsDoc.title}
              </h3>
              <p className="text-[10px] text-zinc-500 font-mono tracking-wider mt-0.5">
                {isVideo ? `VIDEO ID: ${transcriptionOptionsDoc.videoId}` : 
                 `SOURCE URL: ${transcriptionOptionsDoc.url.replace(/https?:\/\/(www\.)?/, '').slice(0, 30)}...`}
              </p>
            </div>
          </div>
          <button
            onClick={() => setTranscriptionOptionsDoc(null)}
            className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-750 text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        <p className="text-xs text-zinc-400 font-sans text-left mb-6 leading-relaxed">
          {isVideo 
            ? "This YouTube video transcript and playhead metrics have been processed & written to disk. How would you like to explore this collected data?"
            : "This webpage has been scraped, compressed, and written to disk as custom markdown/json formats. How would you like to open it in your workspace code editor?"
          }
        </p>

        {/* Selection choices */}
        <div className="space-y-3 select-none">
          {isVideo && (
            <button
              onClick={() => {
                setSelectedTranscriptDoc(transcriptionOptionsDoc);
                setTranscriptionOptionsDoc(null);
              }}
              className="w-full group text-left p-4 bg-zinc-850 hover:bg-rose-500/10 border border-zinc-800 hover:border-rose-500/30 rounded-xl transition-all cursor-pointer flex items-start gap-3.5"
            >
              <div className="p-2.5 bg-zinc-90 w-10 h-10 rounded-lg flex items-center justify-center text-zinc-400 group-hover:bg-rose-500/20 group-hover:text-rose-400 shrink-0">
                <Play size={18} className="fill-current" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-zinc-200 group-hover:text-rose-450 font-sans transition-colors">
                  🎬 Interactive Studio Player
                </h4>
                <p className="text-[11px] text-zinc-400 mt-1 font-sans leading-normal">
                  Sync captions with live YouTube, speed-navigate chapters, and consult the AI Q&A Chatbot with integrated playhead pointers.
                </p>
              </div>
            </button>
          )}

          <button
            onClick={async () => {
              if (isVideo) {
                await ensureTranscriptFilesOnDisk(transcriptionOptionsDoc);
                setFloatingEditFile(`transcripts/transcript_${transcriptionOptionsDoc.videoId}.md`);
              } else {
                await ensureScrapedFilesOnDisk(transcriptionOptionsDoc);
                setFloatingEditFile(markdownPath);
              }
              setTranscriptionOptionsDoc(null);
            }}
            className="w-full group text-left p-4 bg-zinc-850 hover:bg-blue-500/10 border border-zinc-800 hover:border-blue-500/30 rounded-xl transition-all cursor-pointer flex items-start gap-3.5"
          >
            <div className="p-2.5 bg-zinc-90 w-10 h-10 rounded-lg flex items-center justify-center text-zinc-300 group-hover:bg-blue-500/20 group-hover:text-blue-400 shrink-0">
              <FileText size={18} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-zinc-200 group-hover:text-blue-400 font-sans transition-colors">
                📝 Open Markdown in Code Editor
              </h4>
              <p className="text-[11px] text-zinc-400 mt-1 font-sans leading-normal">
                Inspect fully-formatted notes, section blocks, and clean layouts within the premium virtual workbench.
              </p>
            </div>
          </button>

          <button
            onClick={async () => {
              if (isVideo) {
                await ensureTranscriptFilesOnDisk(transcriptionOptionsDoc);
                setFloatingEditFile(`transcripts/transcript_${transcriptionOptionsDoc.videoId}.json`);
              } else {
                await ensureScrapedFilesOnDisk(transcriptionOptionsDoc);
                setFloatingEditFile(jsonPath);
              }
              setTranscriptionOptionsDoc(null);
            }}
            className="w-full group text-left p-4 bg-zinc-850 hover:bg-[#D97756]/10 border border-zinc-800 hover:border-[#D97756]/30 rounded-xl transition-all cursor-pointer flex items-start gap-3.5"
          >
            <div className="p-2.5 bg-zinc-90 w-10 h-10 rounded-lg flex items-center justify-center text-zinc-305 group-hover:bg-[#D97756]/20 group-hover:text-[#D97756] shrink-0">
              <FileJson size={18} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-zinc-200 group-hover:text-[#D97756] font-sans transition-colors">
                📊 Open Captured JSON in Code Editor
              </h4>
              <p className="text-[11px] text-zinc-400 mt-1 font-sans leading-normal">
                Analyze, map, or modify playhead metrics and parsed dialogue segments under standard JSON formatting.
              </p>
            </div>
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default React.memo(TranscriptionOptionsModalComponent);
