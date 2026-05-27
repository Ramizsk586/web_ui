import React, { useState, useEffect, useCallback } from 'react';
import { 
  Folder, 
  File, 
  RefreshCw, 
  Trash2, 
  Plus, 
  FileText,
  ChevronRight,
  ChevronDown
} from 'lucide-react';

interface FileNode {
  name: string;
  path: string;
  isDirectory: boolean;
}

interface CoderLeftExplorerProps {
  workspaceRefreshKey: number;
  triggerWorkspaceRefresh: () => void;
  showToast: (msg: string) => void;
  onSelectFile: (filePath: string) => void;
}

export const CoderLeftExplorer: React.FC<CoderLeftExplorerProps> = ({
  workspaceRefreshKey,
  triggerWorkspaceRefresh,
  showToast,
  onSelectFile
}) => {
  const [files, setFiles] = useState<FileNode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingFile, setIsCreatingFile] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [isExpanded, setIsExpanded] = useState(true);

  const fetchFiles = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/fs/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderPath: './coder' })
      });
      if (response.ok) {
        const data = await response.json();
        if (data && Array.isArray(data.files)) {
          const formattedFiles: FileNode[] = data.files.map((f: any) => ({
            name: f.name || f.path.split('/').pop(),
            path: f.path,
            isDirectory: f.isDirectory !== undefined ? f.isDirectory : !f.path.includes('.')
          }));
          setFiles(formattedFiles);
        } else {
          setFiles([]);
        }
      }
    } catch (err) {
      console.error("Failed to fetch workspace files:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFiles();
  }, [workspaceRefreshKey, fetchFiles]);

  const handleCreateNewFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileName.trim()) return;
    const cleanName = newFileName.trim().replace(/^\/+/, '');
    const path = `./coder/${cleanName}`;
    try {
      const response = await fetch('/api/fs/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: path, content: `<!-- Code created in Lumina -->\n` })
      });
      if (response.ok) {
        showToast(`Created file: ${cleanName}`);
        setNewFileName('');
        setIsCreatingFile(false);
        triggerWorkspaceRefresh();
        onSelectFile(path);
      } else {
        showToast("Error creating file");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteFile = async (filePath: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to delete this file? This cannot be undone.`)) return;
    try {
      const response = await fetch('/api/fs/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath })
      });
      if (response.ok) {
        showToast(`Deleted file successfully.`);
        triggerWorkspaceRefresh();
      } else {
        showToast("Failed to delete file.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getRelativePath = (absolute: string) => {
    const parts = absolute.split('coder/');
    return parts.length > 1 ? parts[1] : absolute;
  };

  // Determine file icons based on file type
  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'html':
        return <span className="font-mono text-[9px] font-bold text-orange-500 shrink-0 w-3.5 h-3.5 flex items-center justify-center border border-orange-500/20 rounded bg-orange-500/5">5</span>;
      case 'css':
        return <span className="font-mono text-[9px] font-bold text-blue-400 shrink-0 w-3.5 h-3.5 flex items-center justify-center border border-blue-400/20 rounded bg-blue-400/5">C</span>;
      case 'js':
      case 'jsx':
        return <span className="font-mono text-[9px] font-bold text-yellow-500 shrink-0 w-3.5 h-3.5 flex items-center justify-center border border-yellow-500/20 rounded bg-yellow-500/5">JS</span>;
      case 'ts':
      case 'tsx':
        return <span className="font-mono text-[9px] font-bold text-sky-500 shrink-0 w-3.5 h-3.5 flex items-center justify-center border border-sky-500/20 rounded bg-sky-500/5">TS</span>;
      case 'json':
        return <span className="font-mono text-[9px] font-bold text-purple-400 shrink-0 w-3.5 h-3.5 flex items-center justify-center border border-purple-400/20 rounded bg-purple-400/5">{}</span>;
      default:
        return <FileText size={12} className="text-zinc-500" />;
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#141416] select-none text-zinc-300 font-sans overflow-hidden">
      {/* Sidebar Section Title */}
      <div className="flex items-center justify-between px-3.5 py-3 border-b border-zinc-850 bg-[#161619] shrink-0">
        <span className="text-[10px] tracking-widest font-bold uppercase text-zinc-400">Workspace Files</span>
        <div className="flex items-center gap-1">
          <button 
            onClick={() => setIsCreatingFile(prev => !prev)}
            className="p-1 hover:bg-zinc-850 rounded text-zinc-400 hover:text-white transition-all cursor-pointer"
            title="Create New File"
          >
            <Plus size={13} />
          </button>
          <button 
            onClick={() => {
              fetchFiles();
              showToast("Workspace checked!");
            }}
            className="p-1 hover:bg-zinc-850 rounded text-zinc-400 hover:text-white transition-all cursor-pointer"
            title="Reload Workspace Directory"
          >
            <RefreshCw size={11} />
          </button>
        </div>
      </div>

      {isCreatingFile && (
        <form onSubmit={handleCreateNewFile} className="p-3 border-b border-zinc-850 bg-zinc-900/40 shrink-0 gap-2 flex flex-col">
          <span className="text-[9px] text-zinc-400 uppercase font-bold tracking-wider">File Relative Path</span>
          <div className="flex gap-2">
            <input
              type="text"
              required
              placeholder="e.g. style.css or js/app.js"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              className="text-xs w-full bg-[#0b0b0c] border border-zinc-800 rounded px-2.5 py-1.5 text-white select-text focus:outline-none focus:border-teal-500"
            />
            <button
              type="submit"
              className="bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-[11px] px-3.5 py-1.5 rounded transition-colors shrink-0 cursor-pointer"
            >
              Add
            </button>
          </div>
        </form>
      )}

      {/* VS Code styled tree viewer */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
        {/* Workspace directory tree block */}
        <div className="flex items-center gap-1 px-1 py-1 rounded hover:bg-zinc-900/50 cursor-pointer text-zinc-400 hover:text-white transition-colors"
             onClick={() => setIsExpanded(!isExpanded)}>
          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <Folder size={13} className="text-zinc-500 fill-zinc-500/20" />
          <span className="text-xs font-semibold uppercase tracking-wider font-sans select-none truncate">coder (Workplace root)</span>
        </div>

        {isExpanded && (
          <div className="ml-4 pl-2 border-l border-zinc-850 mt-1 space-y-0.5">
            {isLoading ? (
              <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 px-2 py-2">
                <RefreshCw size={10} className="animate-spin" />
                <span>Reading folder...</span>
              </div>
            ) : files.length === 0 ? (
              <div className="text-[10px] text-zinc-500 italic px-2 py-4">
                No files. Add files using the '+' button!
              </div>
            ) : (
              files.map((file) => (
                <div
                  key={file.path}
                  onClick={() => onSelectFile(file.path)}
                  className="flex items-center justify-between px-2 py-2 rounded-lg text-xs cursor-pointer hover:bg-zinc-900 text-zinc-400 hover:text-white transition-colors group/item"
                >
                  <div className="flex items-center gap-2 truncate pr-2">
                    {getFileIcon(file.name)}
                    <span className="truncate font-sans tracking-tight text-[12px]">{getRelativePath(file.path)}</span>
                  </div>
                  <button
                    onClick={(e) => handleDeleteFile(file.path, e)}
                    className="text-zinc-650 hover:text-red-400 p-0.5 rounded opacity-0 group-hover/item:opacity-100 transition-opacity cursor-pointer"
                    title="Delete File"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
