import React, { useState, useEffect, useCallback } from 'react';
import { 
  Folder, 
  File, 
  RefreshCw, 
  Code, 
  Eye, 
  Trash2, 
  ChevronRight, 
  ChevronDown, 
  Save,
  Plus,
  FileText
} from 'lucide-react';

interface FileNode {
  name: string;
  path: string;
  isDirectory: boolean;
  size?: number;
}

interface CoderWorkspacePanelProps {
  workspaceRefreshKey: number;
  triggerWorkspaceRefresh: () => void;
  showToast: (msg: string) => void;
}

export const CoderWorkspacePanel: React.FC<CoderWorkspacePanelProps> = ({
  workspaceRefreshKey,
  triggerWorkspaceRefresh,
  showToast
}) => {
  const [activeTab, setActiveTab] = useState<'files' | 'preview'>('preview');
  const [files, setFiles] = useState<FileNode[]>([]);
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [editedContent, setEditedContent] = useState<string>('');
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isLoadingFiles, setIsLoadingFiles] = useState<boolean>(false);
  const [isLoadingContent, setIsLoadingContent] = useState<boolean>(false);
  const [iframeKey, setIframeKey] = useState<number>(0);
  const [newFileName, setNewFileName] = useState<string>('');
  const [isCreatingNewFile, setIsCreatingNewFile] = useState<boolean>(false);

  // Load file structure
  const fetchFiles = useCallback(async () => {
    setIsLoadingFiles(true);
    try {
      const response = await fetch('/api/fs/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderPath: './coder' })
      });
      if (response.ok) {
        const data = await response.json();
        if (data && Array.isArray(data.files)) {
          // Normalize nodes
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
      console.error("Failed to load workspace files:", err);
    } finally {
      setIsLoadingFiles(false);
    }
  }, []);

  // Sync files list on external refresh triggers
  useEffect(() => {
    fetchFiles();
  }, [workspaceRefreshKey, fetchFiles]);

  // Load a single file content
  const handleLoadFileContent = async (filePath: string) => {
    setIsLoadingContent(true);
    setSelectedFilePath(filePath);
    setIsEditing(false);
    try {
      const response = await fetch('/api/fs/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath })
      });
      if (response.ok) {
        const data = await response.json();
        setFileContent(data.content || '');
        setEditedContent(data.content || '');
      } else {
        showToast("Error reading file.");
      }
    } catch (err) {
      console.error("Failed to read file:", err);
    } finally {
      setIsLoadingContent(false);
    }
  };

  // Save changes back to server
  const handleSaveFileContent = async () => {
    if (!selectedFilePath) return;
    try {
      const response = await fetch('/api/fs/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: selectedFilePath, content: editedContent })
      });
      if (response.ok) {
        setFileContent(editedContent);
        setIsEditing(false);
        showToast(`Saved changes successfully!`);
        triggerWorkspaceRefresh();
        // Increment iframe to reload preview instantly
        setIframeKey(prev => prev + 1);
      } else {
        showToast("Failed to write to file.");
      }
    } catch (err) {
      console.error("Save error:", err);
    }
  };

  // Create new blank file
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
        setIsCreatingNewFile(false);
        triggerWorkspaceRefresh();
        handleLoadFileContent(path);
      } else {
        showToast("Error creating file");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Delete an existing file
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
        if (selectedFilePath === filePath) {
          setSelectedFilePath(null);
          setFileContent('');
        }
        triggerWorkspaceRefresh();
        setIframeKey(p => p + 1);
      } else {
        showToast("Failed to delete file.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Relative pathway presentation
  const getRelativePath = (absolute: string) => {
    const parts = absolute.split('coder/');
    return parts.length > 1 ? parts[1] : absolute;
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border-l border-zinc-800 text-zinc-100 font-sans select-none overflow-hidden">
      {/* Header Panel */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-950 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <Code size={16} className="text-teal-400 animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-wider text-teal-300">Workspace Directory</span>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => {
              fetchFiles();
              setIframeKey(k => k + 1);
              showToast("Workspace refreshed!");
            }}
            className="p-1 px-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-all flex items-center gap-1.5 text-xs font-medium cursor-pointer"
            title="Refresh Files & Preview"
          >
            <RefreshCw size={12} />
          </button>
        </div>
      </div>

      {/* Primary Navigation Tabs */}
      <div className="flex bg-slate-950/60 border-b border-zinc-800/80 p-1 gap-1">
        <button
          onClick={() => setActiveTab('preview')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors flex items-center justify-center gap-1.5 ${
            activeTab === 'preview' 
              ? 'bg-teal-500 text-slate-950 shadow'
              : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'
          }`}
        >
          <Eye size={13} />
          Live Preview
        </button>
        <button
          onClick={() => setActiveTab('files')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors flex items-center justify-center gap-1.5 ${
            activeTab === 'files'
              ? 'bg-teal-500 text-slate-950 shadow'
              : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'
          }`}
        >
          <Folder size={13} />
          Files & Manual Code
        </button>
      </div>

      {/* Main Tab content container */}
      <div className="flex-1 overflow-hidden flex flex-col relative">

        {/* Tab 1: Live Preview iframe */}
        {activeTab === 'preview' && (
          <div className="flex-1 flex flex-col bg-slate-950 relative">
            <div className="flex items-center justify-between bg-zinc-900 px-3 py-1 text-[10px] text-zinc-400 font-mono border-b border-zinc-800 shrink-0">
              <span className="truncate">Local Preview Frame: /coder-preview/</span>
              <button 
                onClick={() => setIframeKey(k => k + 1)}
                className="hover:text-white p-0.5"
                title="Force iframe reload"
              >
                <RefreshCw size={10} />
              </button>
            </div>
            <div className="flex-1 relative bg-white">
              <iframe
                key={iframeKey}
                src={`/coder-preview/?t=${iframeKey}`}
                className="w-full h-full border-none bg-white"
                referrerPolicy="no-referrer"
                title="Workspace App Preview"
              />
            </div>
          </div>
        )}

        {/* Tab 2: Code files tree list and manual review */}
        {activeTab === 'files' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Split Screen: Top -> File Browser, Bottom -> Selected Code Viewer */}
            <div className="h-2/5 border-b border-zinc-800/80 flex flex-col bg-slate-950 overflow-hidden shrink-0">
              <div className="px-3 py-2 border-b border-zinc-800/50 bg-slate-900/60 flex items-center justify-between shrink-0">
                <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">File Browser</span>
                <button
                  onClick={() => setIsCreatingNewFile(prev => !prev)}
                  className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white flex items-center gap-1 text-[10px] font-medium cursor-pointer"
                >
                  <Plus size={10} /> Add File
                </button>
              </div>

              {isCreatingNewFile && (
                <form onSubmit={handleCreateNewFile} className="p-3 border-b border-zinc-800 gap-1.5 flex flex-col bg-zinc-900/40 shrink-0">
                  <div className="text-[10px] text-zinc-400 font-medium font-sans">Relative path (e.g., style.css or js/main.js):</div>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      placeholder="filepath"
                      value={newFileName}
                      onChange={(e) => setNewFileName(e.target.value)}
                      className="text-xs bg-slate-950 border border-zinc-800 rounded px-2.5 py-1 flex-1 text-white select-text focus:outline-none focus:border-teal-500"
                    />
                    <button
                      type="submit"
                      className="bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-xs px-3 py-1 rounded cursor-pointer"
                    >
                      Create
                    </button>
                  </div>
                </form>
              )}

              <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                {isLoadingFiles ? (
                  <div className="flex items-center justify-center h-full text-xs text-zinc-500 gap-2">
                    <RefreshCw size={12} className="animate-spin" /> Load files...
                  </div>
                ) : files.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-6 text-center text-zinc-500 font-sans mt-4">
                    <Folder size={28} className="opacity-30 mb-1.5" />
                    <span className="text-xs">No files generated yet.</span>
                    <span className="text-[10px] text-zinc-650 mt-0.5">Prompt the AI coder agent to begin!</span>
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    {files.map((file) => (
                      <div
                        key={file.path}
                        onClick={() => handleLoadFileContent(file.path)}
                        className={`flex items-center justify-between px-2 py-1.5 rounded-lg text-xs cursor-pointer transition-colors group/row ${
                          selectedFilePath === file.path 
                            ? 'bg-zinc-800 text-white font-medium shadow-sm' 
                            : 'text-zinc-400 hover:bg-zinc-900/80 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <FileText size={13} className={selectedFilePath === file.path ? 'text-teal-400' : 'text-zinc-500'} />
                          <span className="truncate">{getRelativePath(file.path)}</span>
                        </div>
                        <button
                          onClick={(e) => handleDeleteFile(file.path, e)}
                          className="text-zinc-650 hover:text-red-400 p-0.5 rounded hover:bg-zinc-950 opacity-0 group-hover/row:opacity-100 transition-all cursor-pointer"
                          title="Delete File"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Split: Code Editor / manual source modifier */}
            <div className="flex-1 flex flex-col bg-slate-950 overflow-hidden">
              <div className="px-3 py-2 border-b border-zinc-800 bg-slate-900/60 flex items-center justify-between shrink-0 select-none">
                <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                  {selectedFilePath ? `Active Editor: ${getRelativePath(selectedFilePath)}` : 'Editor'}
                </span>
                {selectedFilePath && (
                  <div className="flex gap-2">
                    {!isEditing ? (
                      <button
                        onClick={() => setIsEditing(true)}
                        className="bg-zinc-800 hover:bg-zinc-750 text-white text-[10px] font-semibold px-2 py-0.5 rounded cursor-pointer transition-all"
                      >
                        Manual Edit
                      </button>
                    ) : (
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => {
                            setEditedContent(fileContent);
                            setIsEditing(false);
                          }}
                          className="bg-zinc-800 hover:bg-zinc-750 text-zinc-300 text-[10px] font-semibold px-2 py-0.5 rounded cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSaveFileContent}
                          className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[10px] font-bold px-2 py-0.5 rounded cursor-pointer flex items-center gap-1 shadow-sm"
                        >
                          <Save size={10} /> Save
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex-1 overflow-auto p-3">
                {isLoadingContent ? (
                  <div className="flex justify-center items-center h-40 text-xs text-zinc-500 select-none">
                    <RefreshCw size={12} className="animate-spin mr-1.5" /> Loading contents...
                  </div>
                ) : !selectedFilePath ? (
                  <div className="flex flex-col items-center justify-center text-center p-8 mt-10 text-zinc-550 h-full">
                    <Code size={32} className="opacity-25 mb-2" />
                    <span className="text-xs font-medium">Select a file from browser above</span>
                    <span className="text-[10px] mt-0.5 text-zinc-650">to display its code structure and make manual edits here.</span>
                  </div>
                ) : isEditing ? (
                  <textarea
                    value={editedContent}
                    onChange={(e) => setEditedContent(e.target.value)}
                    className="w-full h-full text-xs font-mono bg-zinc-950 text-zinc-150 border border-zinc-800 rounded-xl p-3 focus:outline-none focus:border-teal-500 select-text resize-none"
                    style={{ minHeight: '160px' }}
                  />
                ) : (
                  <pre className="font-mono text-xs text-emerald-400 p-3 rounded-xl bg-zinc-950/60 overflow-auto whitespace-pre-wrap select-text selection:bg-teal-900 selection:text-white border border-zinc-900">
                    <code>{fileContent || '/* Empty File */'}</code>
                  </pre>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
