import React from 'react';
import { motion } from 'motion/react';
import { Layout, FileText, PenTool, Terminal } from 'lucide-react';
import { Artifact } from '../../types';

interface ArtifactCardProps {
  artifact: Artifact;
  onOpen: (a: Artifact) => void;
}

export const ArtifactCard = React.memo(({ artifact, onOpen }: ArtifactCardProps) => {
  const downloadFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    const typeMap = {
      code: 'text/plain',
      markdown: 'text/markdown',
      html: 'text/html',
      poem: 'text/plain',
      report: 'text/markdown'
    };
    const blob = new Blob([artifact.content], { type: (typeMap as any)[artifact.type] || 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const ext = artifact.type === 'poem' ? 'txt' : artifact.type === 'report' ? 'md' : artifact.language === 'javascript' ? 'js' : artifact.language === 'typescript' ? 'ts' : artifact.language === 'markdown' ? 'md' : artifact.language;
    a.download = `${artifact.title.toLowerCase().replace(/[^a-z0-9]+/g, '_')}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => onOpen(artifact)}
      className="flex items-center gap-4 p-4 bg-zinc-50 dark:bg-white/5 border border-zinc-100 dark:border-white/10 rounded-2xl cursor-pointer hover:bg-zinc-100 dark:hover:bg-white/10 transition-all group my-4 shadow-sm text-left"
    >
      <div className="w-12 h-12 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-100 dark:border-white/5 flex items-center justify-center text-zinc-400 group-hover:text-blue-500 transition-colors shadow-sm">
        {artifact.type === 'html' ? <Layout size={24} /> : 
         artifact.type === 'markdown' ? <FileText size={24} className="text-zinc-500" /> : 
         artifact.type === 'poem' ? <PenTool size={24} className="text-amber-550 dark:text-amber-400" /> :
         artifact.type === 'report' ? <FileText size={24} className="text-blue-550 dark:text-blue-400 animate-pulse" /> :
         <Terminal size={24} />}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-[14px] font-semibold text-zinc-800 dark:text-zinc-200 truncate">{artifact.title}</h4>
        <p className="text-[11px] text-zinc-400 font-medium uppercase tracking-wider">
          {artifact.language} • {artifact.type}
        </p>
      </div>
      <button
        type="button"
        onClick={downloadFile}
        className="px-4 py-2 text-zinc-900 border border-zinc-200 rounded-xl text-xs font-bold transition-all hover:scale-105 active:scale-95 shadow-md shrink-0 cursor-pointer"
        style={{ backgroundColor: '#ffffff' }}
      >
        Download
      </button>
    </motion.div>
  );
});
