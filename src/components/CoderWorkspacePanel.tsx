import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Folder, 
  RefreshCw, 
  Code, 
  Eye, 
  Trash2, 
  ChevronRight, 
  ChevronDown, 
  Save,
  Plus,
  FileText,
  Smartphone,
  Tablet,
  Monitor,
  Grid,
  Sliders,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Copy,
  Check,
  Layout,
  Maximize,
  Download,
  Braces,
  FileCode,
  Hash,
  FolderPlus,
  FilePlus,
  MousePointerClick,
  Bot,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Play,
  XCircle,
  Users,
  X
} from 'lucide-react';

import type { SubAgent, OrchestrationConflict, AgentOrchestrationState } from '../hooks/useCoderMode';

interface FileNode {
  name: string;
  path: string;
  isDirectory: boolean;
  size?: number;
  relativePath?: string;
}

interface CoderWorkspacePanelProps {
  workspaceRefreshKey: number;
  triggerWorkspaceRefresh: () => void;
  showToast: (msg: string) => void;
  workspaceRootPath: string;
  onInsertAttachedText?: (text: string) => void;
  orchestrationState?: AgentOrchestrationState;
  orchestrationCollapsed?: boolean;
  setOrchestrationCollapsed?: (collapsed: boolean) => void;
  onClose?: () => void;
}

export const CoderWorkspacePanel: React.FC<CoderWorkspacePanelProps> = ({
  workspaceRefreshKey,
  triggerWorkspaceRefresh,
  showToast,
  workspaceRootPath,
  onInsertAttachedText,
  orchestrationState,
  orchestrationCollapsed,
  setOrchestrationCollapsed,
  onClose
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
  const [creationType, setCreationType] = useState<'file' | 'folder'>('file');

  // New features: Viewport simulator & Layout Tool state
  const [viewportMode, setViewportMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [isGridEnabled, setIsGridEnabled] = useState<boolean>(false);
  const [isLayoutToolOpen, setIsLayoutToolOpen] = useState<boolean>(false);
  const [previewSubpath, setPreviewSubpath] = useState<string>('');
  const [isInspectMode, setIsInspectMode] = useState<boolean>(false);
  const [projectFramework, setProjectFramework] = useState<string | null>(null);
  const [projectType, setProjectType] = useState<string | null>(null);
  const [devServerUrl, setDevServerUrl] = useState<string>('');
  const [previewLogs, setPreviewLogs] = useState<string[]>([]);
  const [previewError, setPreviewError] = useState<string>('');
  const [isPreviewStarting, setIsPreviewStarting] = useState<boolean>(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const previewPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const attachInspectListeners = () => {
      try {
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (!doc) return;

        let hoveredEl: HTMLElement | null = null;
        let originalOutline = '';
        let originalTransition = '';

        const handleMouseOver = (e: MouseEvent) => {
          if (!isInspectMode) return;
          e.stopPropagation();

          if (hoveredEl && hoveredEl !== e.target) {
            hoveredEl.style.outline = originalOutline;
            hoveredEl.style.transition = originalTransition;
          }

          hoveredEl = e.target as HTMLElement;
          if (hoveredEl) {
            originalOutline = hoveredEl.style.outline;
            originalTransition = hoveredEl.style.transition;

            hoveredEl.style.transition = 'outline 0.1s ease';
            hoveredEl.style.outline = '2px dashed #0D9488';
          }
        };

        const handleMouseOut = (e: MouseEvent) => {
          if (!isInspectMode) return;
          if (hoveredEl) {
            hoveredEl.style.outline = originalOutline;
            hoveredEl.style.transition = originalTransition;
            hoveredEl = null;
          }
        };

        const handleElementClick = (e: MouseEvent) => {
          if (!isInspectMode) return;
          e.preventDefault();
          e.stopPropagation();

          const clickedEl = e.target as HTMLElement;
          if (clickedEl) {
            clickedEl.style.outline = originalOutline;
            clickedEl.style.transition = originalTransition;

            const classes = clickedEl.className && typeof clickedEl.className === 'string' ? clickedEl.className : '';
            const tag = clickedEl.tagName.toLowerCase();
            const placeholder = clickedEl.getAttribute('placeholder') || '';
            const href = clickedEl.getAttribute('href') || '';
            const src = clickedEl.getAttribute('src') || '';
            const text = clickedEl.innerText?.substring(0, 300).trim() || clickedEl.textContent?.substring(0, 300).trim() || '';

            let cssSelector = tag;
            if (clickedEl.id) {
              cssSelector += `#${clickedEl.id}`;
            } else if (classes) {
              const firstFewClasses = classes.split(/\s+/).filter(Boolean).slice(0, 2).map(c => `.${c}`).join('');
              cssSelector += firstFewClasses;
            }

            const detailsMarkdown = `Please edit this element:
- Selector: \`${cssSelector}\`
- Tag: \`<${tag}>\`
- Classes: \`${classes}\`
${text ? `- Content: "${text}"` : ''}
${placeholder ? `- Placeholder: "${placeholder}"` : ''}
${src ? `- Src: "${src}"` : ''}
${href ? `- Link href: "${href}"` : ''}

I would like to change this element to:
`;

            if (onInsertAttachedText) {
              onInsertAttachedText(detailsMarkdown);
              showToast(`Attached selected <${tag}> element to chat input!`);
            } else {
              navigator.clipboard.writeText(detailsMarkdown);
              showToast(`Copied selected <${tag}> element info to Clipboard!`);
            }
            setIsInspectMode(false);
          }
        };

        if (isInspectMode) {
          doc.addEventListener('mouseover', handleMouseOver, true);
          doc.addEventListener('mouseout', handleMouseOut, true);
          doc.addEventListener('click', handleElementClick, true);

          let style = doc.getElementById('inspect-mode-cursor-style');
          if (!style) {
            style = doc.createElement('style');
            style.id = 'inspect-mode-cursor-style';
            style.innerHTML = `
              * {
                cursor: crosshair !important;
              }
            `;
            doc.head.appendChild(style);
          }
        } else {
          doc.getElementById('inspect-mode-cursor-style')?.remove();
        }

        return () => {
          doc.removeEventListener('mouseover', handleMouseOver, true);
          doc.removeEventListener('mouseout', handleMouseOut, true);
          doc.removeEventListener('click', handleElementClick, true);
          doc.getElementById('inspect-mode-cursor-style')?.remove();
          if (hoveredEl) {
            (hoveredEl as HTMLElement).style.outline = originalOutline;
            (hoveredEl as HTMLElement).style.transition = originalTransition;
          }
        };
      } catch (err) {
        console.warn("Workspace iframe same-origin inspection warning:", err);
      }
    };

    attachInspectListeners();

    iframe.addEventListener('load', attachInspectListeners);
    return () => {
      iframe.removeEventListener('load', attachInspectListeners);
    };
  }, [isInspectMode, iframeKey, previewSubpath, onInsertAttachedText, showToast]);

  // Box model inputs as in uploaded image
  const [paddingTop, setPaddingTop] = useState<string>('16');
  const [paddingRight, setPaddingRight] = useState<string>('16');
  const [paddingBottom, setPaddingBottom] = useState<string>('8');
  const [paddingLeft, setPaddingLeft] = useState<string>('12');

  const [marginTop, setMarginTop] = useState<string>('0');
  const [marginRight, setMarginRight] = useState<string>('0');
  const [marginBottom, setMarginBottom] = useState<string>('0');
  const [marginLeft, setMarginLeft] = useState<string>('0');

  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right'>('center');
  const [borderRadius, setBorderRadius] = useState<string>('8');
  const [bgPreset, setBgPreset] = useState<string>('#E08A69');

  // Load file structure
  const fetchFiles = useCallback(async (folderPath: string) => {
    setIsLoadingFiles(true);
    try {
      const response = await fetch('/api/fs/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderPath })
      });
      if (response.ok) {
        const data = await response.json();
        if (data && Array.isArray(data.files)) {
          const formattedFiles: FileNode[] = data.files.map((f: any) => ({
            name: f.name || f.path.split('/').pop(),
            path: f.path,
            isDirectory: f.isDirectory !== undefined ? f.isDirectory : !f.path.includes('.'),
            relativePath: f.relativePath
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

  useEffect(() => {
    if (workspaceRefreshKey > 0 && workspaceRootPath) {
      fetchFiles(workspaceRootPath);
    }
  }, [workspaceRefreshKey, fetchFiles, workspaceRootPath]);

  const startWorkspacePreview = useCallback(async () => {
    setIsPreviewStarting(true);
    setPreviewError('');
    setPreviewLogs([]);
    if (previewPollRef.current) {
      clearInterval(previewPollRef.current);
      previewPollRef.current = null;
    }

    try {
      const res = await fetch('/api/preview/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderPath: workspaceRootPath || undefined })
      });
      const data = await res.json();
      if (!res.ok) {
        setPreviewError(data.error || 'Could not start preview');
        setPreviewLogs(data.logs || []);
        setDevServerUrl('');
        setIsPreviewStarting(false);
        return;
      }

      setPreviewLogs(data.logs || []);
      if (data.detection?.framework) {
        setProjectFramework(data.detection.framework);
      }
      if (data.detection?.kind) {
        setProjectType(data.detection.kind);
      }
      if (data.frameUrl) {
        setDevServerUrl(data.frameUrl);
        setIframeKey(prev => prev + 1);
        setIsPreviewStarting(false);
        return;
      }

      previewPollRef.current = setInterval(async () => {
        try {
          const statusRes = await fetch(`/api/preview/status${workspaceRootPath ? `?folderPath=${encodeURIComponent(workspaceRootPath)}` : ''}`);
          const status = await statusRes.json();
          setPreviewLogs(status.logs || []);
          if (status.frameUrl) {
            setDevServerUrl(status.frameUrl);
            setIframeKey(prev => prev + 1);
            setIsPreviewStarting(false);
            if (previewPollRef.current) {
              clearInterval(previewPollRef.current);
              previewPollRef.current = null;
            }
          }
        } catch {
          // Keep polling while the dev server warms up.
        }
      }, 1200);
    } catch (err: any) {
      setPreviewError(err.message || 'Preview start failed');
      setDevServerUrl('');
      setIsPreviewStarting(false);
    }
  }, [workspaceRootPath]);

  useEffect(() => {
    if (activeTab === 'preview') {
      startWorkspacePreview();
    }
    return () => {
      if (previewPollRef.current) {
        clearInterval(previewPollRef.current);
        previewPollRef.current = null;
      }
    };
  }, [activeTab, workspaceRefreshKey, workspaceRootPath, startWorkspacePreview]);

  // Auto-detect project type in workspace
  useEffect(() => {
    if (workspaceRefreshKey > 0) {
      const detectProject = async () => {
        try {
          const res = await fetch('/api/fs/detect-project', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ folderPath: workspaceRootPath || undefined })
          });
          if (res.ok) {
            const data = await res.json();
            setProjectType(data.type);
            setProjectFramework(data.framework);
            if (data.entryPoint && !previewSubpath) {
              setPreviewSubpath(data.entryPoint);
            }
          }
        } catch { /* ignore */ }
      };
      detectProject();
    }
  }, [workspaceRefreshKey, workspaceRootPath]);

  const handleLoadFileContent = async (filePath: string) => {
    setIsLoadingContent(true);
    setSelectedFilePath(filePath);
    setIsEditing(false);
    const rel = getRelativePath(filePath);
    const lowRel = rel.toLowerCase();
    const previewableExts = ['.html', '.htm', '.jsx', '.tsx', '.js', '.css', '.svg', '.json', '.md'];
    if (previewableExts.some(ext => lowRel.endsWith(ext))) {
      setPreviewSubpath(rel);
    }
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
        showToast(`Saved layout file!`);
        triggerWorkspaceRefresh();
        setIframeKey(prev => prev + 1);
      } else {
        showToast("Failed to write to file.");
      }
    } catch (err) {
      console.error("Save error:", err);
    }
  };

  const handleCreateNewFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileName.trim()) return;
    const cleanName = newFileName.trim().replace(/^\/+/, '');
    const path = `./${cleanName}`;
    try {
      let response;
      if (creationType === 'folder') {
        response = await fetch('/api/fs/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filePath: path, isDirectory: true })
        });
      } else {
        response = await fetch('/api/fs/write', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filePath: path, content: `<!-- Code created in Lumina -->\n` })
        });
      }
      if (response.ok) {
        showToast(`Created ${creationType}: ${cleanName}`);
        setNewFileName('');
        setIsCreatingNewFile(false);
        triggerWorkspaceRefresh();
        if (creationType === 'file') {
          handleLoadFileContent(path);
        }
      } else {
        showToast(`Error creating ${creationType}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDownloadFile = async (filePath: string, fileName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const response = await fetch('/api/fs/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath })
      });
      if (response.ok) {
        const data = await response.json();
        const blob = new Blob([data.content || ''], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast(`Downloaded ${fileName}!`);
      } else {
        showToast("Error downloading file.");
      }
    } catch (err) {
      console.error(err);
      showToast("Download failed.");
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
        showToast(`Deleted file.`);
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

  const getRelativePath = (absolute: string) => {
    const file = files.find(f => f.path === absolute);
    if (file && file.relativePath) return file.relativePath;
    const parts = absolute.split('coder/');
    return parts.length > 1 ? parts[1] : absolute;
  };

  return (
    <div className="flex flex-col h-full bg-[#110E0D] border-l border-[#241C18] text-[#DDD2C4] font-sans select-none overflow-hidden">
      {/* Title Header Panel */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#181412] border-b border-[#241C18] shrink-0">
        <div className="flex items-center gap-2">
          <Code size={14} className="text-[#D97756] animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-wider text-[#D97756]">Workspace Directory</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button 
            onClick={() => {
              if (workspaceRootPath) fetchFiles(workspaceRootPath);
              startWorkspacePreview();
              setIframeKey(k => k + 1);
              showToast("Workspace refreshed!");
            }}
            className="p-1.5 hover:bg-[#1D1917] border border-[#241C18] bg-[#0E0B0A]/50 rounded-lg text-[#AD9F91] hover:text-[#EDE6DD] transition-all flex items-center justify-center cursor-pointer"
            title="Refresh Directory & Preview"
          >
            <RefreshCw size={12} />
          </button>
          
          {onClose && (
            <button 
              onClick={onClose}
              className="p-1.5 hover:bg-[#1D1917] border border-[#241C18] bg-[#0E0B0A]/50 rounded-lg text-[#AD9F91] hover:text-[#EDE6DD] transition-all flex items-center justify-center cursor-pointer"
              title="Close Workspace Panel"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Navigation tabs */}
      <div className="flex bg-[#0A0808] border-b border-[#241C18] p-1 gap-1 shrink-0 relative z-10">
        <button
          onClick={() => setActiveTab('preview')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'preview' 
              ? 'bg-[#D97756] text-white shadow-md'
              : 'text-[#AD9F91] hover:bg-[#1D1917]/50 hover:text-white'
          }`}
        >
          <Eye size={13} />
          View Live App
        </button>
        <button
          onClick={() => setActiveTab('files')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'files'
              ? 'bg-[#D97756] text-white shadow-md'
              : 'text-[#AD9F91] hover:bg-[#1D1917]/50 hover:text-white'
          }`}
        >
          <Folder size={13} />
          Files & Manual Code
        </button>
      </div>

      {/* Agent Orchestration Status Board */}
      {orchestrationState?.isActive && (
        <div className="shrink-0 border-b border-[#241C18] bg-[#181412]">
          <button
            onClick={() => setOrchestrationCollapsed?.(!orchestrationCollapsed)}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold text-[#D97756] hover:bg-[#1D1917] transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Bot size={14} />
              <span>Agent Orchestration</span>
              {orchestrationState && (
                <span className="text-[10px] font-mono text-[#AD9F91]">
                  Phase {orchestrationState.currentPhase}/{orchestrationState.totalPhases}
                </span>
              )}
            </div>
            <ChevronDown size={12} className={`transition-transform ${orchestrationCollapsed ? '-rotate-90' : ''}`} />
          </button>

          {!orchestrationCollapsed && (
            <div className="px-3 pb-3 space-y-2">
              {/* Progress bar */}
              {orchestrationState && (
                <div className="w-full h-1 bg-[#0E0B0A] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#D97756] transition-all duration-500"
                    style={{
                      width: `${orchestrationState.totalPhases > 0
                        ? ((orchestrationState.currentPhase - 1) / orchestrationState.totalPhases) * 100
                        : 0}%`
                    }}
                  />
                </div>
              )}

              {/* Agent list */}
              <div className="space-y-1 max-h-[160px] overflow-y-auto custom-scrollbar">
                {orchestrationState?.agents.map(agent => {
                  const statusIcon = () => {
                    switch (agent.status) {
                      case 'done': return <CheckCircle2 size={12} className="text-green-400 shrink-0" />;
                      case 'running': return <Play size={12} className="text-[#D97756] animate-pulse shrink-0" />;
                      case 'failed': return <XCircle size={12} className="text-red-400 shrink-0" />;
                      case 'needs_review': return <AlertTriangle size={12} className="text-yellow-400 shrink-0" />;
                      default: return <Clock size={12} className="text-[#635F59] shrink-0" />;
                    }
                  };
                  const statusBg = () => {
                    switch (agent.status) {
                      case 'done': return 'bg-green-500/10 border-green-500/20';
                      case 'running': return 'bg-[#D97756]/10 border-[#D97756]/20';
                      case 'failed': return 'bg-red-500/10 border-red-500/20';
                      case 'needs_review': return 'bg-yellow-500/10 border-yellow-500/20';
                      default: return 'bg-[#0E0B0A] border-[#1D1917]';
                    }
                  };
                  return (
                    <div key={agent.id} className={`flex items-center gap-2 px-2 py-1.5 rounded border text-[11px] ${statusBg()}`}>
                      {statusIcon()}
                      <span className="font-mono text-[10px] text-[#AD9F91] shrink-0">{agent.id}</span>
                      <span className="text-[#EDE6DD] truncate">{agent.name}</span>
                      <span className="ml-auto text-[9px] uppercase font-bold tracking-wider"
                        style={{
                          color: agent.status === 'done' ? '#4ade80' :
                                 agent.status === 'running' ? '#D97756' :
                                 agent.status === 'failed' ? '#f87171' :
                                 agent.status === 'needs_review' ? '#fbbf24' : '#635F59'
                        }}
                      >
                        {agent.status === 'needs_review' ? 'REVIEW' : agent.status}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Conflicts */}
              {orchestrationState && orchestrationState.conflicts.length > 0 && (
                <div className="space-y-1">
                  {orchestrationState.conflicts.filter(c => !c.resolved).map(conflict => (
                    <div key={conflict.id} className="flex items-start gap-2 px-2 py-1.5 rounded border bg-yellow-500/5 border-yellow-500/20 text-[11px]">
                      <AlertTriangle size={12} className="text-yellow-400 shrink-0 mt-0.5" />
                      <span className="text-[#EDE6DD]">{conflict.description}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="flex-1 overflow-hidden flex flex-col relative bg-[#110E0D]">
        {/* TAB 1: Live Web Frame Viewer */}
        {activeTab === 'preview' && (
          <div className="flex-1 flex flex-col bg-[#0A0808] relative w-full h-full">
            {/* Top Toolbar controls */}
            <div className="flex items-center justify-between bg-[#110E0D] px-3 py-1.5 border-b border-[#241C18] shrink-0">
              <div className="flex items-center gap-1">
                {/* Viewport simulations */}
                <button
                  onClick={() => setViewportMode('desktop')}
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                    viewportMode === 'desktop'
                      ? 'bg-[#D97756]/15 border border-[#D97756]/30 text-[#D97756]'
                      : 'text-[#AD9F91] hover:text-[#EDE6DD] hover:bg-[#1D1917]'
                  }`}
                  title="Desktop View (Full Screen)"
                >
                  <Monitor size={12} />
                </button>
                <button
                  onClick={() => setViewportMode('tablet')}
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                    viewportMode === 'tablet'
                      ? 'bg-[#D97756]/15 border border-[#D97756]/30 text-[#D97756]'
                      : 'text-[#AD9F91] hover:text-[#EDE6DD] hover:bg-[#1D1917]'
                  }`}
                  title="Tablet View (768px Width)"
                >
                  <Tablet size={12} />
                </button>
                <button
                  onClick={() => setViewportMode('mobile')}
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                    viewportMode === 'mobile'
                      ? 'bg-[#D97756]/15 border border-[#D97756]/30 text-[#D97756]'
                      : 'text-[#AD9F91] hover:text-[#EDE6DD] hover:bg-[#1D1917]'
                  }`}
                  title="Mobile View (390px Width)"
                >
                  <Smartphone size={12} />
                </button>
                
                <div className="w-[1px] h-3.5 bg-[#241C18] mx-1" />

                {/* Grid utility */}
                <button
                  onClick={() => setIsGridEnabled(!isGridEnabled)}
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                    isGridEnabled
                      ? 'bg-[#D97756]/15 border border-[#D97756]/30 text-[#D97756]'
                      : 'text-[#AD9F91] hover:text-[#EDE6DD] hover:bg-[#1D1917]'
                  }`}
                  title="Toggle Visual Measurement Grid Alignment Overlay"
                >
                  <Grid size={12} />
                </button>

                {/* Box layout tool toggle */}
                <button
                  onClick={() => setIsLayoutToolOpen(!isLayoutToolOpen)}
                  className={`p-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                    isLayoutToolOpen
                      ? 'bg-[#D97756]/15 border border-[#D97756]/30 text-[#D97756]'
                      : 'text-[#AD9F91] hover:text-[#EDE6DD] hover:bg-[#1D1917]'
                  }`}
                  title="Toggle Visual Box Model Style Designer HUD"
                >
                  <Sliders size={12} />
                  <span className="text-[10px] font-bold">Box Model HUD</span>
                </button>

                {/* Element Inspector Select Tool */}
                <button
                  onClick={() => setIsInspectMode(!isInspectMode)}
                  className={`p-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                    isInspectMode
                      ? 'bg-teal-500/10 border border-teal-500/30 text-teal-400 animate-pulse'
                      : 'text-[#AD9F91] hover:text-[#EDE6DD] hover:bg-[#1D1917]'
                  }`}
                  title={isInspectMode ? "Click an element inside preview to select, or click here to cancel" : "Inspect & Select Element from Live Preview to attach to chat"}
                >
                  <MousePointerClick size={12} className={isInspectMode ? "text-teal-400" : ""} />
                  <span className="text-[10px] font-bold">Select Element</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                {projectFramework && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-teal-500/15 text-teal-400 font-mono border border-teal-500/20">{projectFramework}</span>
                )}
                <div className="flex items-center gap-1 bg-[#0E0C0B] px-2 py-0.5 rounded border border-[#241C18]">
                  <span className="text-[10px] text-[#7F7469] font-mono select-none">URL: /coder-preview/</span>
                  <input
                    type="text"
                    placeholder="index.html"
                    value={previewSubpath}
                    onChange={(e) => setPreviewSubpath(e.target.value)}
                    className="bg-transparent border-none text-[10.5px] text-[#EDE6DD] font-mono w-[110px] focus:outline-none focus:ring-0 p-0"
                    title="Route subpath relative to ./coder (e.g. about.html or index.html)"
                  />
                </div>
                <button 
                  onClick={() => setIframeKey(k => k + 1)}
                  className="p-1 px-1.5 hover:bg-[#1D1917] rounded-lg text-[#AD9F91] hover:text-white transition-all cursor-pointer flex items-center justify-center"
                  title="Reload Preview Frame"
                >
                  <RefreshCw size={11} />
                </button>
              </div>
            </div>

            {projectType && ['vite', 'next', 'react', 'node'].includes(projectType) && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-950/80 border-b border-[#241C18] shrink-0">
                <span className="text-[9px] text-zinc-500 font-mono whitespace-nowrap">Dev URL:</span>
                <input
                  type="text"
                  value={devServerUrl}
                  onChange={e => setDevServerUrl(e.target.value)}
                  placeholder="http://localhost:5173"
                  className="flex-1 bg-[#0E0C0B] border border-[#241C18] rounded px-2 py-1 text-[10px] font-mono text-[#EDE6DD] placeholder-zinc-600 outline-none focus:border-teal-500/40 transition-colors"
                />
              </div>
            )}

            {/* Visual Box model builder design HUD if toggled */}
            {isLayoutToolOpen && (
              <div className="bg-[#181412] border-b border-[#241C18] p-3 text-xs flex flex-col gap-3 animate-fade-in shrink-0">
                <div className="flex items-center justify-between border-b border-[#241C18]/50 pb-2">
                  <div className="flex items-center gap-1.5 font-bold text-[#D97756]">
                    <Sliders size={13} />
                    <span>Visual Box Model Tool</span>
                  </div>
                  <button 
                    onClick={() => {
                      const twClass = `pt-[${paddingTop}px] pr-[${paddingRight}px] pb-[${paddingBottom}px] pl-[${paddingLeft}px] mt-[${marginTop}px] mr-[${marginRight}px] mb-[${marginBottom}px] ml-[${marginLeft}px] text-${textAlign} rounded-[${borderRadius}px]`;
                      navigator.clipboard.writeText(twClass);
                      showToast("Copied Tailwind box layout classes!");
                    }}
                    className="bg-[#D97756] hover:bg-[#E08A69] text-white text-[10px] font-bold px-2 py-0.5 rounded cursor-pointer transition-all flex items-center gap-1"
                    title="Copy Tailwind CSS class list"
                  >
                    <Copy size={10} />
                    <span>Copy CSS/Tailwind</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* PADDING LABELS & INPUTHUD */}
                  <div className="space-y-2">
                    <span className="text-[10px] text-[#AD9F91] uppercase tracking-wider font-bold">Padding (px)</span>
                    <div className="grid grid-cols-2 gap-1.5">
                      <div>
                        <span className="text-[9px] text-[#6E6358] block mb-0.5">Top</span>
                        <input 
                          type="number" 
                          value={paddingTop} 
                          onChange={(e) => setPaddingTop(e.target.value)}
                          className="w-full text-xs font-mono bg-[#0E0B0A] border border-[#241C18] text-[#EDE6DD] rounded px-2 py-1 focus:outline-none focus:border-[#D97756]"
                        />
                      </div>
                      <div>
                        <span className="text-[9px] text-[#6E6358] block mb-0.5">Right</span>
                        <input 
                          type="number" 
                          value={paddingRight} 
                          onChange={(e) => setPaddingRight(e.target.value)}
                          className="w-full text-xs font-mono bg-[#0E0B0A] border border-[#241C18] text-[#EDE6DD] rounded px-2 py-1 focus:outline-none focus:border-[#D97756]"
                        />
                      </div>
                      <div>
                        <span className="text-[9px] text-[#6E6358] block mb-0.5">Bottom</span>
                        <input 
                          type="number" 
                          value={paddingBottom} 
                          onChange={(e) => setPaddingBottom(e.target.value)}
                          className="w-full text-xs font-mono bg-[#0E0B0A] border border-[#241C18] text-[#EDE6DD] rounded px-2 py-1 focus:outline-none focus:border-[#D97756]"
                        />
                      </div>
                      <div>
                        <span className="text-[9px] text-[#6E6358] block mb-0.5">Left</span>
                        <input 
                          type="number" 
                          value={paddingLeft} 
                          onChange={(e) => setPaddingLeft(e.target.value)}
                          className="w-full text-xs font-mono bg-[#0E0B0A] border border-[#241C18] text-[#EDE6DD] rounded px-2 py-1 focus:outline-none focus:border-[#D97756]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* MARGIN LABELS & INPUTHUD */}
                  <div className="space-y-2">
                    <span className="text-[10px] text-[#AD9F91] uppercase tracking-wider font-bold">Margin (px)</span>
                    <div className="grid grid-cols-2 gap-1.5">
                      <div>
                        <span className="text-[9px] text-[#6E6358] block mb-0.5">Top</span>
                        <input 
                          type="number" 
                          value={marginTop} 
                          onChange={(e) => setMarginTop(e.target.value)}
                          className="w-full text-xs font-mono bg-[#0E0B0A] border border-[#241C18] text-[#EDE6DD] rounded px-2 py-1 focus:outline-none focus:border-[#D97756]"
                        />
                      </div>
                      <div>
                        <span className="text-[9px] text-[#6E6358] block mb-0.5">Right</span>
                        <input 
                          type="number" 
                          value={marginRight} 
                          onChange={(e) => setMarginRight(e.target.value)}
                          className="w-full text-xs font-mono bg-[#0E0B0A] border border-[#241C18] text-[#EDE6DD] rounded px-2 py-1 focus:outline-none focus:border-[#D97756]"
                        />
                      </div>
                      <div>
                        <span className="text-[9px] text-[#6E6358] block mb-0.5">Bottom</span>
                        <input 
                          type="number" 
                          value={marginBottom} 
                          onChange={(e) => setMarginBottom(e.target.value)}
                          className="w-full text-xs font-mono bg-[#0E0B0A] border border-[#241C18] text-[#EDE6DD] rounded px-2 py-1 focus:outline-none focus:border-[#D97756]"
                        />
                      </div>
                      <div>
                        <span className="text-[9px] text-[#6E6358] block mb-0.5">Left</span>
                        <input 
                          type="number" 
                          value={marginLeft} 
                          onChange={(e) => setMarginLeft(e.target.value)}
                          className="w-full text-xs font-mono bg-[#0E0B0A] border border-[#241C18] text-[#EDE6DD] rounded px-2 py-1 focus:outline-none focus:border-[#D97756]"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Additional custom alignment options & live box mock */}
                <div className="flex items-center justify-between mt-1 pt-2 border-t border-[#241C18]/40 gap-3">
                  <div className="flex items-center gap-1 select-none">
                    <span className="text-[10px] text-[#AD9F91] font-medium mr-1.5">Align:</span>
                    <button 
                      onClick={() => setTextAlign('left')}
                      className={`p-1 rounded cursor-pointer transition-colors ${textAlign === 'left' ? 'bg-[#D97756]/15 text-[#D97756] border border-[#D97756]/30' : 'text-[#7F7469] hover:text-[#EDE6DD]'}`}
                    >
                      <AlignLeft size={11} />
                    </button>
                    <button 
                      onClick={() => setTextAlign('center')}
                      className={`p-1 rounded cursor-pointer transition-colors ${textAlign === 'center' ? 'bg-[#D97756]/15 text-[#D97756] border border-[#D97756]/30' : 'text-[#7F7469] hover:text-[#EDE6DD]'}`}
                    >
                      <AlignCenter size={11} />
                    </button>
                    <button 
                      onClick={() => setTextAlign('right')}
                      className={`p-1 rounded cursor-pointer transition-colors ${textAlign === 'right' ? 'bg-[#D97756]/15 text-[#D97756] border border-[#D97756]/30' : 'text-[#7F7469] hover:text-[#EDE6DD]'}`}
                    >
                      <AlignRight size={11} />
                    </button>
                  </div>

                  {/* LIVE BOX PREVIEW COMPONENT MODEL */}
                  <div className="flex-1 flex items-center justify-center p-2 rounded-lg bg-[#0E0B0A]/40 border border-[#241C18] max-w-[200px] overflow-hidden">
                    <div 
                      style={{
                        paddingTop: `${paddingTop}px`,
                        paddingRight: `${paddingRight}px`,
                        paddingBottom: `${paddingBottom}px`,
                        paddingLeft: `${paddingLeft}px`,
                        marginTop: `${marginTop}px`,
                        marginRight: `${marginRight}px`,
                        marginBottom: `${marginBottom}px`,
                        marginLeft: `${marginLeft}px`,
                        textAlign: textAlign,
                        borderRadius: `${borderRadius}px`,
                        backgroundColor: bgPreset,
                        transition: 'all 0.15s ease'
                      }}
                      className="border border-[#D97756]/40 text-[#EDE6DD] text-[9px] select-none font-mono tracking-tight font-semibold"
                    >
                       layout_item
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* IFrame App Preview Container Wrapper */}
            <div className="flex-1 overflow-auto flex items-center justify-center p-4 bg-[#070606] relative">
              {/* Optional grid pattern style overlay */}
              {isGridEnabled && (
                <div 
                  className="absolute inset-0 pointer-events-none z-10 opacity-30" 
                  style={{
                    backgroundImage: 'radial-gradient(rgba(217, 119, 86, 0.25) 1px, transparent 1px)',
                    backgroundSize: '16px 16px'
                  }}
                />
              )}

              {/* Viewport limits constraint */}
              <div 
                style={{
                  width: viewportMode === 'mobile' ? '390px' : viewportMode === 'tablet' ? '768px' : '100%',
                  height: viewportMode === 'desktop' ? '100%' : '640px',
                  transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
                className={`relative bg-white shadow-2xl overflow-hidden ${
                  viewportMode !== 'desktop' ? 'rounded-2xl border-4 border-[#1D1917]' : 'w-full h-full'
                }`}
              >
                {devServerUrl ? (
                  <iframe
                    ref={iframeRef}
                    key={iframeKey}
                    src={devServerUrl}
                    className="w-full h-full border-none bg-white"
                    referrerPolicy="no-referrer"
                    title="Workspace App Preview"
                  />
                ) : isPreviewStarting ? (
                  <div className="w-full h-full bg-[#0A0808] flex flex-col items-center justify-center gap-3 text-zinc-500 p-6">
                    <RefreshCw size={18} className="animate-spin text-[#D97756]" />
                    <span className="text-sm font-medium text-zinc-400">Starting preview</span>
                    <div className="max-w-md w-full rounded-lg border border-zinc-800 bg-black/30 p-3 text-left">
                      {(previewLogs.length ? previewLogs.slice(-5) : ['Detecting project']).map((log, idx) => (
                        <div key={idx} className="truncate text-[10px] font-mono text-zinc-500">&gt; {log}</div>
                      ))}
                    </div>
                  </div>
                ) : previewError ? (
                  <div className="w-full h-full bg-[#0A0808] flex flex-col items-center justify-center gap-3 text-zinc-500 p-6">
                    <span className="text-sm font-medium text-red-400">Preview could not start</span>
                    <span className="max-w-md text-center text-xs text-zinc-600">{previewError}</span>
                    <button
                      onClick={startWorkspacePreview}
                      className="mt-2 rounded-lg border border-[#D97756]/30 bg-[#D97756]/10 px-3 py-1.5 text-xs font-semibold text-[#D97756] hover:bg-[#D97756]/20"
                    >
                      Retry
                    </button>
                  </div>
                ) : (
                  <div className="w-full h-full bg-[#0A0808] flex flex-col items-center justify-center gap-3 text-zinc-500">
                    <div className="w-12 h-12 rounded-xl border border-zinc-800 bg-zinc-900/50 flex items-center justify-center">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6 text-zinc-600">
                        <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                        <path d="M8 17h8"/>
                        <path d="M12 17v4"/>
                      </svg>
                    </div>
                    <span className="text-sm font-medium text-zinc-600">No preview running</span>
                    <button
                      onClick={startWorkspacePreview}
                      className="text-xs text-[#D97756] hover:underline"
                    >
                      Start workspace preview
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Split Folder Browser and Code View */}
        {activeTab === 'files' && (
          <div className="flex-1 flex flex-col overflow-hidden h-full">
            {/* Top Split segment -> Directory File List */}
            <div className="h-[42%] border-b border-[#241C18] flex flex-col bg-[#0A0808]/40 overflow-hidden shrink-0">
              <div className="px-3.5 py-2 border-b border-[#241C18] bg-[#161211]/70 flex items-center justify-between shrink-0">
                <span className="text-[10px] uppercase font-bold text-[#AD9F91] tracking-widest">Workspace Browser</span>
                
                <div className="flex items-center gap-1.5">
                  <div className="w-[1px] h-3 bg-[#241C18] mx-0.5" />

                  <button
                    type="button"
                    onClick={() => setIsCreatingNewFile(prev => !prev)}
                    className={`p-1 px-2 rounded hover:bg-[#1D1917] text-xs font-semibold flex items-center gap-1 transition-all border shrink-0 cursor-pointer ${
                      isCreatingNewFile
                        ? 'bg-[#D97756]/15 border-[#D97756]/30 text-[#D97756]'
                        : 'border-transparent text-[#AD9F91] hover:text-[#EDE6DD]'
                    }`}
                  >
                    <Plus size={11} /> New File/Folder
                  </button>
                </div>
              </div>

              {isCreatingNewFile && (
                <form onSubmit={handleCreateNewFile} className="p-3.5 border-b border-[#241C18] gap-2 flex flex-col bg-[#110E0D] shrink-0 animate-fade-in">
                  <div className="flex items-center justify-between pb-1">
                    <span className="text-[10px] text-[#AD9F91] font-bold font-sans tracking-wide uppercase">Type:</span>
                    <div className="flex bg-[#0E0B0A] rounded-lg p-0.5 border border-[#241C18]">
                      <button
                        type="button"
                        onClick={() => setCreationType('file')}
                        className={`px-2.5 py-1 rounded-md text-[9.5px] font-bold cursor-pointer transition-all flex items-center gap-1 leading-none ${creationType === 'file' ? 'bg-[#D97756] text-white' : 'text-[#8D7F72] hover:text-white'}`}
                      >
                        <FilePlus size={10} />
                        <span>File</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setCreationType('folder')}
                        className={`px-2.5 py-1 rounded-md text-[9.5px] font-bold cursor-pointer transition-all flex items-center gap-1 leading-none ${creationType === 'folder' ? 'bg-[#D97756] text-white' : 'text-[#8D7F72] hover:text-white'}`}
                      >
                        <FolderPlus size={10} />
                        <span>Folder</span>
                      </button>
                    </div>
                  </div>
                  <div className="text-[10px] text-[#AD9F91] font-bold font-sans tracking-wide uppercase mt-1">
                    {creationType === 'folder' ? 'Folder Relative Path' : 'File relative path'}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      autoFocus
                      placeholder={creationType === 'folder' ? 'e.g. components or utils' : 'e.g. stylesheet.css'}
                      value={newFileName}
                      onChange={(e) => setNewFileName(e.target.value)}
                      className="text-xs bg-[#0E0B0A] border border-[#241C18] rounded-lg px-3 py-1.5 flex-1 text-white select-text focus:outline-none focus:border-[#D97756]"
                    />
                    <button
                      type="submit"
                      className="bg-[#D97756] hover:bg-[#E08A69] text-white font-semibold text-xs px-4 py-1.5 rounded-lg cursor-pointer transition-colors shadow-sm"
                    >
                      Create
                    </button>
                  </div>
                </form>
              )}

              <div className="flex-1 overflow-y-auto custom-scrollbar p-2.5 space-y-0.5 animate-fade-in">
                {isLoadingFiles ? (
                  <div className="flex items-center justify-center h-full text-xs text-[#AD9F91] gap-2 font-sans py-8">
                    <RefreshCw size={12} className="animate-spin text-[#D97756]" /> Loading files...
                  </div>
                ) : files.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-8 text-center text-[#AD9F91] font-sans mt-4">
                    <Folder size={24} className="opacity-25 text-[#D97756] mb-2" />
                    <span className="text-xs font-bold">Workspace contains no files yet.</span>
                    <span className="text-[10px] text-[#AD9F91]/50 mt-1">Files you create will populate here.</span>
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    {files.map((file) => {
                      const ext = file.name.split('.').pop()?.toLowerCase();
                      const getIcon = () => {
                        if (file.isDirectory) return <Folder size={13} className="text-[#D97756] fill-[#D97756]/10 shrink-0" />;
                        switch (ext) {
                          case 'html': return <Code size={13} className="text-[#E28743] shrink-0" />;
                          case 'css': return <Hash size={13} className="text-[#cc7a5c] shrink-0" />;
                          case 'js':
                          case 'jsx': return <FileCode size={13} className="text-[#E0A96D] shrink-0" />;
                          case 'ts':
                          case 'tsx': return <Code size={13} className="text-[#D97756] shrink-0" />;
                          case 'json': return <Braces size={13} className="text-[#b79d85] shrink-0" />;
                          default: return <FileText size={13} className={selectedFilePath === file.path ? 'text-[#D97756]' : 'text-[#7F7469]'} />;
                        }
                      };

                      return (
                        <div
                          key={file.path}
                          onClick={() => {
                            if (!file.isDirectory) {
                              handleLoadFileContent(file.path);
                            }
                          }}
                          className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs cursor-pointer transition-all border group/row ${
                            selectedFilePath === file.path 
                              ? 'bg-[#1D1917] text-white font-bold border-[#241C18]' 
                              : 'text-[#DDD2C4]/85 border-transparent hover:bg-[#1D1917]/50 hover:text-white'
                          } ${file.isDirectory ? 'font-semibold text-[#D97756]/95' : ''}`}
                        >
                          <div className="flex items-center gap-2 truncate pr-2">
                            {getIcon()}
                            <span className="truncate font-medium tracking-tight text-[12.5px]">{getRelativePath(file.path)}</span>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover/row:opacity-100 transition-all shrink-0">
                            {!file.isDirectory && (
                              <button
                                onClick={(e) => handleDownloadFile(file.path, file.name, e)}
                                className="text-[#AD9F91] hover:text-[#D97756] p-1 rounded-md hover:bg-[#2A2420] transition-all cursor-pointer"
                                title="Download File"
                              >
                                <Download size={11} />
                              </button>
                            )}
                            <button
                              onClick={(e) => handleDeleteFile(file.path, e)}
                              className="text-[#AD9F91] hover:text-[#D97756] p-1 rounded-md hover:bg-[#2A2420] transition-all cursor-pointer"
                              title={file.isDirectory ? "Delete Folder" : "Delete File"}
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Split segment -> Code File Editor Panel */}
            <div className="flex-1 flex flex-col bg-[#110E0D] overflow-hidden">
              <div className="px-3.5 py-2 border-b border-[#241C18] bg-[#161211]/70 flex items-center justify-between shrink-0 select-none">
                <span className="text-[10px] uppercase font-bold text-[#AD9F91] tracking-widest max-w-[65%] truncate">
                  {selectedFilePath ? `Active: ${getRelativePath(selectedFilePath)}` : 'Inline Editor'}
                </span>
                {selectedFilePath && (
                  <div className="flex gap-2 shrink-0">
                    {!isEditing ? (
                      <button
                        onClick={() => setIsEditing(true)}
                        className="bg-[#1D1917] hover:bg-[#231E1B] border border-[#241C18] text-[#EDE6DD] text-[10px] font-bold px-2.5 py-1 rounded transition-all cursor-pointer"
                      >
                        Edit Code
                      </button>
                    ) : (
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => {
                            setEditedContent(fileContent);
                            setIsEditing(false);
                          }}
                          className="bg-[#1D1917]/45 hover:bg-[#1D1917] text-[#AD9F91] hover:text-white text-[10px] font-semibold px-2.5 py-1 rounded transition-all cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSaveFileContent}
                          className="bg-[#D97756] hover:bg-[#E08A69] text-white text-[10px] font-bold px-2.5 py-1 rounded-lg cursor-pointer flex items-center gap-1 transition-all shadow-sm"
                        >
                          <Save size={10} /> Save
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex-1 overflow-auto p-3.5 bg-[#0A0808]">
                {isLoadingContent ? (
                  <div className="flex justify-center items-center h-40 text-xs text-[#AD9F91] select-none font-sans">
                    <RefreshCw size={12} className="animate-spin text-[#D97756] mr-1.5" /> Retrieving code block...
                  </div>
                ) : !selectedFilePath ? (
                  <div className="flex flex-col items-center justify-center text-center p-8 mt-6 text-[#AD9F91] h-full select-none">
                    <Code size={28} className="text-[#D97756] opacity-35 mb-2" />
                    <span className="text-xs font-bold uppercase tracking-wider">Select a file above</span>
                    <span className="text-[11px] mt-1 text-[#AD9F91]/65 max-w-[200px]">to read its contents and make manual edits here.</span>
                  </div>
                ) : isEditing ? (
                  <textarea
                    value={editedContent}
                    onChange={(e) => setEditedContent(e.target.value)}
                    className="w-full h-full text-xs font-mono bg-[#110E0D] text-[#EDE6DD] border border-[#241C18] rounded-xl p-3.5 focus:outline-none focus:border-[#D97756] select-text resize-none line-clamp-15"
                    style={{ minHeight: '160px', tabSize: 4 }}
                  />
                ) : (
                  <pre className="font-mono text-xs text-[#DDD2C4] p-3.5 rounded-xl bg-[#110E0D] overflow-auto whitespace-pre-wrap select-text selection:bg-[#D97756]/20 border border-[#241C18] text-left leading-relaxed">
                    <code>{fileContent || '/* Empty File content */'}</code>
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
