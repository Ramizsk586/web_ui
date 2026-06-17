import React from 'react';
import { motion } from 'motion/react';
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
  const rawTitle = transcriptionOptionsDoc.title || 'document';
  const safeTitle = String(rawTitle).replace(/[^a-zA-Z0-9-_.]/g, '_').slice(0, 50);
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
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-xl border shrink-0 ${
                isVideo
                  ? 'bg-rose-500/10 text-rose-500 border-rose-500/10'
                  : 'bg-blue-500/10 text-blue-400 border-blue-500/10'
              }`}
            >
              {isVideo ? <Video className="w-5 h-5" /> : <LinkIcon className="w-5 h-5" />}
            </div>
            <div className="text-left min-w-0">
              <h3 className="text-sm font-bold text-zinc-100 font-sans truncate max-w-[220px]">
                {transcriptionOptionsDoc.title}
              </h3>
              <p className="text-[10px] text-zinc-500 font-mono tracking-wider mt-0.5">
                {isVideo
                  ? `VIDEO ID: ${transcriptionOptionsDoc.videoId}`
                  : `SOURCE URL: ${String(transcriptionOptionsDoc.url || '').replace(/https?:\/\/(www\.)?/, '').slice(0, 30)}...`}
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
            ? 'This YouTube transcript and its metadata were written to disk. How would you like to explore this data?'
            : 'This webpage was written to disk as markdown and JSON files. How would you like to continue with them?'}
        </p>

        <div className="space-y-3 select-none">
          {isVideo && (
            <button
              onClick={() => {
                setSelectedTranscriptDoc(transcriptionOptionsDoc);
                setTranscriptionOptionsDoc(null);
              }}
              className="w-full group text-left p-4 bg-zinc-850 hover:bg-rose-500/10 border border-zinc-800 hover:border-rose-500/30 rounded-xl transition-all cursor-pointer flex items-start gap-3.5"
            >
              <div className="p-2.5 bg-zinc-900 w-10 h-10 rounded-lg flex items-center justify-center text-zinc-400 group-hover:bg-rose-500/20 group-hover:text-rose-400 shrink-0">
                <Play size={18} className="fill-current" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-zinc-200 group-hover:text-rose-400 font-sans transition-colors">
                  Interactive Studio Player
                </h4>
                <p className="text-[11px] text-zinc-400 mt-1 font-sans leading-normal">
                  Explore the synced transcript and navigate the video with the studio player.
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
            <div className="p-2.5 bg-zinc-900 w-10 h-10 rounded-lg flex items-center justify-center text-zinc-300 group-hover:bg-blue-500/20 group-hover:text-blue-400 shrink-0">
              <FileText size={18} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-zinc-200 group-hover:text-blue-400 font-sans transition-colors">
                Open Markdown File Path
              </h4>
              <p className="text-[11px] text-zinc-400 mt-1 font-sans leading-normal">
                Save the markdown file to disk, then continue in your external editor.
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
            <div className="p-2.5 bg-zinc-900 w-10 h-10 rounded-lg flex items-center justify-center text-zinc-300 group-hover:bg-[#D97756]/20 group-hover:text-[#D97756] shrink-0">
              <FileJson size={18} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-zinc-200 group-hover:text-[#D97756] font-sans transition-colors">
                Open JSON File Path
              </h4>
              <p className="text-[11px] text-zinc-400 mt-1 font-sans leading-normal">
                Save the JSON file to disk, then continue in your external editor.
              </p>
            </div>
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default React.memo(TranscriptionOptionsModalComponent);
