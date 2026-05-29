import { useState, useEffect, useCallback, RefObject } from 'react';

export interface UseRightPanelProps {
  rightIframeRef: RefObject<HTMLIFrameElement | null>;
  iframeKey: number;
  rightPreviewSubpath: string;
  showToast: (msg: string) => void;
  setFloatingEditFile: React.Dispatch<React.SetStateAction<string | null>>;
}

export function useRightPanel({
  rightIframeRef,
  iframeKey,
  rightPreviewSubpath,
  showToast,
  setFloatingEditFile
}: UseRightPanelProps) {
  const [rightViewportMode, setRightViewportMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [rightIsInspectMode, setRightIsInspectMode] = useState<boolean>(false);
  const [isAnalyzingElement, setIsAnalyzingElement] = useState<boolean>(false);
  const [localElementAttachments, setLocalElementAttachments] = useState<any[]>([]);

  const handleSelectedElementAnalysis = useCallback(async (metadata: {
    tag: string;
    id: string;
    classes: string;
    text: string;
    placeholder: string;
    src: string;
    href: string;
  }) => {
    setIsAnalyzingElement(true);
    showToast("Analyzing selected element...");
    try {
      const response = await fetch('/api/fs/analyze_element', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(metadata)
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.analysis) {
          const newAtt = {
            id: Date.now().toString(),
            fileName: data.analysis.fileName,
            filePath: data.analysis.filePath,
            specificCode: data.analysis.specificCode,
            connections: data.analysis.connections || [],
            elementWork: data.analysis.elementWork
          };
          setLocalElementAttachments(prev => [...prev, newAtt]);
          showToast(`Attached selected element as a visual document badge`);
          
          // Also set as floatingEditFile so developer can edit it in floating editor if they want
          if (data.analysis.filePath) {
            setFloatingEditFile(data.analysis.filePath);
          }
        } else {
          showToast("Automated element source trace returned an error.");
        }
      } else {
        showToast("Error communicating with source analysis API.");
      }
    } catch (err) {
      console.error(err);
      showToast("Network error tracing element source code.");
    } finally {
      setIsAnalyzingElement(false);
    }
  }, [showToast, setFloatingEditFile]);

  useEffect(() => {
    const iframe = rightIframeRef.current;
    if (!iframe) return;

    let docCleanup: (() => void) | null = null;

    const attachInspectListeners = () => {
      try {
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (!doc) return;

        let hoveredEl: HTMLElement | null = null;
        let originalOutline = '';
        let originalTransition = '';

        const handleMouseOver = (e: MouseEvent) => {
          if (!rightIsInspectMode) return;
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
          if (!rightIsInspectMode) return;
          if (hoveredEl) {
            hoveredEl.style.outline = originalOutline;
            hoveredEl.style.transition = originalTransition;
            hoveredEl = null;
          }
        };

        const handleElementClick = (e: MouseEvent) => {
          if (!rightIsInspectMode) return;
          e.preventDefault();
          e.stopPropagation();

          const clickedEl = e.target as HTMLElement;
          if (clickedEl) {
            clickedEl.style.outline = originalOutline;
            clickedEl.style.transition = originalTransition;

            const classes = clickedEl.className && typeof clickedEl.className === 'string' ? clickedEl.className : '';
            const tag = clickedEl.tagName.toLowerCase();
            const id = clickedEl.id || '';
            const placeholder = clickedEl.getAttribute('placeholder') || '';
            const href = clickedEl.getAttribute('href') || '';
            const src = clickedEl.getAttribute('src') || '';
            const text = clickedEl.innerText?.substring(0, 300).trim() || clickedEl.textContent?.substring(0, 300).trim() || '';

            setRightIsInspectMode(false);
            handleSelectedElementAnalysis({ tag, id, classes, text, placeholder, src, href });
          }
        };

        if (rightIsInspectMode) {
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

        docCleanup = () => {
          try {
            doc.removeEventListener('mouseover', handleMouseOver, true);
            doc.removeEventListener('mouseout', handleMouseOut, true);
            doc.removeEventListener('click', handleElementClick, true);
            doc.getElementById('inspect-mode-cursor-style')?.remove();
            if (hoveredEl) {
              (hoveredEl as HTMLElement).style.outline = originalOutline;
              (hoveredEl as HTMLElement).style.transition = originalTransition;
            }
          } catch (err) {
            console.warn("Error cleaning up inspect listeners:", err);
          }
        };
      } catch (err) {
        console.warn("Iframe same-origin inspection warning:", err);
      }
    };

    attachInspectListeners();

    iframe.addEventListener('load', attachInspectListeners);
    return () => {
      iframe.removeEventListener('load', attachInspectListeners);
      if (docCleanup) {
        docCleanup();
      }
    };
  }, [rightIsInspectMode, iframeKey, rightPreviewSubpath, handleSelectedElementAnalysis, rightIframeRef]);

  return {
    rightViewportMode,
    setRightViewportMode,
    rightIsInspectMode,
    setRightIsInspectMode,
    isAnalyzingElement,
    setIsAnalyzingElement,
    localElementAttachments,
    setLocalElementAttachments,
    handleSelectedElementAnalysis
  };
}
