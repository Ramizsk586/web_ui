import { useState, useEffect, useCallback, useRef } from 'react';

export interface UseWorkspaceProps {
  isCoderMode: boolean;
  showToast: (msg: string) => void;
}

export function useWorkspace({ isCoderMode, showToast }: UseWorkspaceProps) {
  const [isCoderLeftPanelOpen, setIsCoderLeftPanelOpen] = useState(true);
  const [coderWorkspacePath, setCoderWorkspacePath] = useState('');
  const [isCoderRightPanelOpen, setIsCoderRightPanelOpen] = useState(false);
  const [isWhiteboardOpen, setIsWhiteboardOpen] = useState(false);
  const [floatingEditFile, setFloatingEditFile] = useState<string | null>(null);
  const [workspaceRefreshKey, setWorkspaceRefreshKey] = useState(0);
  const [iframeKey, setIframeKey] = useState(0);

  const [rightIsGridEnabled, setRightIsGridEnabled] = useState<boolean>(false);
  const [rightPreviewSubpath, setRightPreviewSubpath] = useState<string>('');
  const [projectType, setProjectType] = useState<string | null>(null);
  const [projectFramework, setProjectFramework] = useState<string | null>(null);
  const [devServerUrl, setDevServerUrl] = useState<string>('');
  const [rightPreviewLogs, setRightPreviewLogs] = useState<string[]>([]);
  const [rightPreviewError, setRightPreviewError] = useState<string>('');
  const [isRightPreviewStarting, setIsRightPreviewStarting] = useState(false);
  const rightPreviewPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  const [attachmentContextMenu, setAttachmentContextMenu] = useState<{ visible: boolean, x: number, y: number, attachment: any, index: number }>({ visible: false, x: 0, y: 0, attachment: null, index: -1 });
  const [selectedModalAttachment, setSelectedModalAttachment] = useState<any | null>(null);
  const rightIframeRef = useRef<HTMLIFrameElement>(null);

  const triggerWorkspaceRefresh = useCallback(() => {
    setWorkspaceRefreshKey(prev => prev + 1);
  }, []);

  useEffect(() => {
    const handleWorkspaceGlobalRefresh = () => {
      triggerWorkspaceRefresh();
    };
    window.addEventListener('trigger-workspace-refresh', handleWorkspaceGlobalRefresh);
    return () => {
      window.removeEventListener('trigger-workspace-refresh', handleWorkspaceGlobalRefresh);
    };
  }, [triggerWorkspaceRefresh]);

  const startCoderPreview = useCallback(async () => {
    setIsRightPreviewStarting(true);
    setRightPreviewError('');
    setRightPreviewLogs([]);
    if (rightPreviewPollRef.current) {
      clearInterval(rightPreviewPollRef.current);
      rightPreviewPollRef.current = null;
    }

    try {
      const res = await fetch('/api/preview/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderPath: coderWorkspacePath || undefined })
      });
      const data = await res.json();
      if (!res.ok) {
        setRightPreviewError(data.error || 'Could not start preview');
        setRightPreviewLogs(data.logs || []);
        setDevServerUrl('');
        setIsRightPreviewStarting(false);
        return;
      }

      setRightPreviewLogs(data.logs || []);
      if (data.detection?.kind) setProjectType(data.detection.kind);
      if (data.detection?.framework) setProjectFramework(data.detection.framework);
      if (data.detection?.entryFile) setRightPreviewSubpath(data.detection.entryFile);

      if (data.frameUrl) {
        setDevServerUrl(data.frameUrl);
        setIframeKey(prev => prev + 1);
        setIsRightPreviewStarting(false);
        return;
      }

      rightPreviewPollRef.current = setInterval(async () => {
        try {
          const statusRes = await fetch(`/api/preview/status${coderWorkspacePath ? `?folderPath=${encodeURIComponent(coderWorkspacePath)}` : ''}`);
          const status = await statusRes.json();
          setRightPreviewLogs(status.logs || []);
          if (status.frameUrl) {
            setDevServerUrl(status.frameUrl);
            setIframeKey(prev => prev + 1);
            setIsRightPreviewStarting(false);
            if (rightPreviewPollRef.current) {
              clearInterval(rightPreviewPollRef.current);
              rightPreviewPollRef.current = null;
            }
          }
        } catch {
          // The dev server can take a moment to emit its URL.
        }
      }, 1200);
    } catch (err: any) {
      setRightPreviewError(err.message || 'Preview start failed');
      setDevServerUrl('');
      setIsRightPreviewStarting(false);
    }
  }, [coderWorkspacePath]);

  useEffect(() => {
    if (isCoderMode && workspaceRefreshKey > 0) {
      const detectProject = async () => {
        try {
          const res = await fetch('/api/fs/detect-project', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ folderPath: coderWorkspacePath || undefined })
          });
          if (res.ok) {
            const data = await res.json();
            setProjectType(data.type);
            setProjectFramework(data.framework);
            if (data.entryPoint) {
              setRightPreviewSubpath(data.entryPoint);
            }
          }
        } catch { /* ignore */ }
      };
      detectProject();
    }
    return () => {
      if (rightPreviewPollRef.current) {
        clearInterval(rightPreviewPollRef.current);
        rightPreviewPollRef.current = null;
      }
    };
  }, [workspaceRefreshKey, isCoderMode, coderWorkspacePath]);

  return {
    isCoderLeftPanelOpen, setIsCoderLeftPanelOpen,
    coderWorkspacePath, setCoderWorkspacePath,
    isCoderRightPanelOpen, setIsCoderRightPanelOpen,
    isWhiteboardOpen, setIsWhiteboardOpen,
    floatingEditFile, setFloatingEditFile,
    workspaceRefreshKey, setWorkspaceRefreshKey,
    iframeKey, setIframeKey,
    rightIsGridEnabled, setRightIsGridEnabled,
    rightPreviewSubpath, setRightPreviewSubpath,
    projectType, setProjectType,
    projectFramework, setProjectFramework,
    devServerUrl, setDevServerUrl,
    rightPreviewLogs, setRightPreviewLogs,
    rightPreviewError, setRightPreviewError,
    isRightPreviewStarting, setIsRightPreviewStarting,
    attachmentContextMenu, setAttachmentContextMenu,
    selectedModalAttachment, setSelectedModalAttachment,
    rightIframeRef,
    triggerWorkspaceRefresh,
    startCoderPreview
  };
}
