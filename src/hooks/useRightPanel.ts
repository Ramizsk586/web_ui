import { useState, useEffect, useCallback, RefObject } from 'react';

const createAttachmentId = () => `att-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export interface UseRightPanelProps {
  rightIframeRef: RefObject<HTMLIFrameElement | null>;
  iframeKey: number;
  rightPreviewSubpath: string;
  showToast: (msg: string) => void;
}

export function useRightPanel({
  rightIframeRef,
  iframeKey,
  rightPreviewSubpath,
  showToast
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
    outerHTML?: string;
    attributes?: Record<string, string>;
    domPath?: string[];
    selectorPath?: string;
    childIndexPath?: number[];
      sourceHint?: {
        fileName?: string;
        lineNumber?: number;
        columnNumber?: number;
        componentName?: string;
        ownerName?: string;
      };
      role?: string;
      ariaLabel?: string;
      title?: string;
      parentText?: string;
      siblingIndex?: number;
      sameTagSiblingIndex?: number;
      dataAttributes?: Record<string, string>;
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
            id: createAttachmentId(),
            fileName: data.analysis.fileName,
            filePath: data.analysis.filePath,
            specificCode: data.analysis.specificCode,
            lineNumber: data.analysis.lineNumber,
            lineRangeStart: data.analysis.lineRangeStart,
            lineRangeEnd: data.analysis.lineRangeEnd,
            connections: data.analysis.connections || [],
            elementWork: data.analysis.elementWork
          };
          setLocalElementAttachments(prev => [...prev, newAtt]);
          showToast(`Attached selected element as a visual document badge`);
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
  }, [showToast]);

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
            const role = clickedEl.getAttribute('role') || '';
            const ariaLabel = clickedEl.getAttribute('aria-label') || '';
            const title = clickedEl.getAttribute('title') || '';
            const text = clickedEl.innerText?.substring(0, 300).trim() || clickedEl.textContent?.substring(0, 300).trim() || '';
            const parentText = clickedEl.parentElement?.innerText?.substring(0, 300).trim() || '';
            const attributes = Array.from(clickedEl.attributes || []).reduce<Record<string, string>>((acc, attr) => {
              acc[attr.name] = attr.value;
              return acc;
            }, {});
            const dataAttributes = Object.fromEntries(
              Object.entries(attributes).filter(([name]) => name.startsWith('data-')).slice(0, 10)
            );
            const parentChildren = clickedEl.parentElement ? Array.from(clickedEl.parentElement.children) : [];
            const siblingIndex = parentChildren.indexOf(clickedEl);
            const sameTagSiblingIndex = parentChildren.filter(
              (child) => (child as HTMLElement).tagName === clickedEl.tagName
            ).indexOf(clickedEl);
            const domPath: string[] = [];
            let pathEl: HTMLElement | null = clickedEl;
            while (pathEl && pathEl !== doc.body && domPath.length < 8) {
              const pathClasses = typeof pathEl.className === 'string'
                ? pathEl.className.split(/\s+/).filter(Boolean).slice(0, 3).map(cls => `.${cls}`).join('')
                : '';
              domPath.unshift(`${pathEl.tagName.toLowerCase()}${pathEl.id ? `#${pathEl.id}` : pathClasses}`);
              pathEl = pathEl.parentElement;
            }
            const selectorSegments: string[] = [];
            const childIndexPath: number[] = [];
            pathEl = clickedEl;
            while (pathEl && pathEl !== doc.body && selectorSegments.length < 8) {
              const parent = pathEl.parentElement as HTMLElement | null;
              const siblings = parent ? Array.from(parent.children) : [];
              const childIndex = siblings.indexOf(pathEl);
              childIndexPath.unshift(childIndex);

              let segment = pathEl.tagName.toLowerCase();
              if (pathEl.id) {
                segment += `#${pathEl.id}`;
              } else {
                const stableDataAttr = Array.from(pathEl.attributes || []).find(attr =>
                  attr.name.startsWith('data-') && attr.value && attr.value.length < 120
                );
                if (stableDataAttr) {
                  segment += `[${stableDataAttr.name}="${stableDataAttr.value.replace(/"/g, '\\"')}"]`;
                } else if (typeof pathEl.className === 'string' && pathEl.className.trim()) {
                  const firstClass = pathEl.className.split(/\s+/).find(Boolean);
                  if (firstClass) segment += `.${firstClass}`;
                }
                if (parent && childIndex >= 0) {
                  segment += `:nth-child(${childIndex + 1})`;
                }
              }
              selectorSegments.unshift(segment);
              pathEl = parent;
            }
            const selectorPath = selectorSegments.join(' > ');

            const getReactSourceHint = (el: HTMLElement) => {
              let node: HTMLElement | null = el;
              while (node) {
                const fiberKey = Object.keys(node).find(key => key.startsWith('__reactFiber$') || key.startsWith('__reactInternalInstance$'));
                const fiber = fiberKey ? (node as any)[fiberKey] : null;
                let current = fiber;
                while (current) {
                  const debugSource = current._debugSource;
                  if (debugSource?.fileName) {
                    return {
                      fileName: debugSource.fileName,
                      lineNumber: debugSource.lineNumber,
                      columnNumber: debugSource.columnNumber,
                      componentName: typeof current.elementType === 'function' ? current.elementType.name : current.elementType,
                      ownerName: current._debugOwner?.elementType?.name || current._debugOwner?.type?.name
                    };
                  }
                  current = current.return;
                }
                node = node.parentElement;
              }
              return undefined;
            };

            setRightIsInspectMode(false);
            handleSelectedElementAnalysis({
              tag,
              id,
              classes,
              text,
              placeholder,
              src,
              href,
              role,
              ariaLabel,
              title,
              parentText,
              siblingIndex,
              sameTagSiblingIndex,
              attributes,
              dataAttributes,
              domPath,
              selectorPath,
              childIndexPath,
              outerHTML: clickedEl.outerHTML?.slice(0, 4000),
              sourceHint: getReactSourceHint(clickedEl)
            });
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
