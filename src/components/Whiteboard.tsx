import React, { useState, useRef, useEffect, useCallback, type ReactElement } from 'react';
import {
  Pencil, Eraser, Minus, Square, Circle, Type, Download, Trash2,
  RotateCcw, RotateCw, StickyNote, MousePointer, Settings, HelpCircle, GripHorizontal, X,
  Triangle, Diamond, ArrowRight, Star, PaintBucket, Send
} from 'lucide-react';

type Tool = 'pen' | 'eraser' | 'line' | 'rect' | 'circle' | 'triangle' | 'diamond' | 'arrow' | 'star' | 'text' | 'select' | 'fill';

interface DrawAction {
  type: 'draw' | 'erase' | 'line' | 'rect' | 'circle' | 'triangle' | 'diamond' | 'arrow' | 'star' | 'text';
  points?: { x: number; y: number }[];
  color: string;
  size: number;
  text?: string;
  x?: number;
  y?: number;
  endX?: number;
  endY?: number;
  filled?: boolean;
}

interface StickyNoteData {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
}

const CANVAS_WIDTH = 2000;
const CANVAS_HEIGHT = 1500;
const COLORS = [
  '#EDE6DD', // Off-white
  '#D97756', // Brand Orange
  '#EF4444', // Red
  '#10B981', // Emerald Green
  '#3B82F6', // Blue
  '#F59E0B', // Amber/Yellow
  '#EC4899', // Pink
  '#8B5CF6', // Purple
  '#06B6D4'  // Cyan
];

const NOTE_COLORS = [
  '#FEF08A', // soft yellow
  '#FED7AA', // soft orange
  '#A7F3D0', // soft emerald
  '#BFDBFE', // soft blue
  '#FBCFE8', // soft pink
  '#DDD6FE'  // soft violet
];

interface WhiteboardProps {
  onAttachToChat?: (file: File) => void;
  onClose?: () => void;
  attachTriggerRef?: React.MutableRefObject<(() => void) | null>;
}

function Whiteboard({ onAttachToChat, onClose, attachTriggerRef }: WhiteboardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const customCursorRef = useRef<HTMLDivElement>(null);
  const [tool, setTool] = useState<Tool>('pen');
  const [zoom, setZoom] = useState<'fit' | 0.5 | 1 | 1.5 | 2>('fit');
  const [color, setColor] = useState('#EDE6DD');
  const [brushSize, setBrushSize] = useState(3);
  const [stabilizedDist, setStabilizedDist] = useState<number>(25);
  const [actions, setActions] = useState<DrawAction[]>([]);
  const [redoStack, setRedoStack] = useState<DrawAction[]>([]);
  const [stickyNotes, setStickyNotes] = useState<StickyNoteData[]>([]);
  const [showTextInput, setShowTextInput] = useState(false);
  const [textPos, setTextPos] = useState({ x: 0, y: 0 });
  const [textValue, setTextValue] = useState('');
  const [draggedNote, setDraggedNote] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [selectedActionIndex, setSelectedActionIndex] = useState<number | null>(null);

  // Dragging selected drawings
  const isDraggingActionRef = useRef(false);
  const dragStartPointRef = useRef({ x: 0, y: 0 });
  const draggedActionOriginalPointsRef = useRef<{ x: number; y: number }[]>([]);
  const draggedActionOriginalXRef = useRef<number | undefined>(undefined);
  const draggedActionOriginalYRef = useRef<number | undefined>(undefined);
  const draggedActionOriginalEndXRef = useRef<number | undefined>(undefined);
  const draggedActionOriginalEndYRef = useRef<number | undefined>(undefined);

  // Refs for extreme drawing performance and smoothness
  const isDrawingRef = useRef(false);
  const startPosRef = useRef({ x: 0, y: 0 });
  const lastPointRef = useRef({ x: 0, y: 0 });
  const pointsRef = useRef<{ x: number; y: number }[]>([]);
  const stabilizedPointRef = useRef({ x: 0, y: 0 });
  const currentCursorPosRef = useRef({ x: 0, y: 0 });
  const canvasRectRef = useRef<DOMRect | null>(null);

  const handleAttach = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((nextBlob) => resolve(nextBlob), 'image/png');
      });
      if (!blob) {
        throw new Error('Failed to export whiteboard image');
      }
      const file = new File([blob], `whiteboard-${Date.now()}.png`, { type: 'image/png' });
      onAttachToChat?.(file);
    } catch (err) {
      console.error("Error attaching sketch:", err);
    }
  }, [onAttachToChat]);

  useEffect(() => {
    if (attachTriggerRef) {
      attachTriggerRef.current = handleAttach;
      return () => {
        if (attachTriggerRef.current === handleAttach) {
          attachTriggerRef.current = null;
        }
      };
    }
  }, [attachTriggerRef, handleAttach]);

  const getCanvasRect = useCallback(() => {
    if (!canvasRectRef.current && canvasRef.current) {
      canvasRectRef.current = canvasRef.current.getBoundingClientRect();
    }
    return canvasRectRef.current;
  }, []);

  useEffect(() => {
    const handleResize = () => {
      canvasRectRef.current = null;
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handleScroll = () => {
      canvasRectRef.current = null;
    };
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [containerRef.current]);

  const getCanvasPoint = useCallback((e: React.MouseEvent) => {
    const rect = getCanvasRect();
    if (!rect) return { x: 0, y: 0 };
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }, [getCanvasRect]);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const rootStyle = getComputedStyle(document.documentElement);
    const themeInputBg = rootStyle.getPropertyValue('--theme-input-bg').trim() || '#0B0908';

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.fillStyle = themeInputBg;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw grid
    ctx.strokeStyle = 'rgba(217, 119, 86, 0.04)'; // Soft amber grid
    ctx.lineWidth = 1;
    for (let x = 0; x < CANVAS_WIDTH; x += 40) { 
      ctx.beginPath(); 
      ctx.moveTo(x, 0); 
      ctx.lineTo(x, CANVAS_HEIGHT); 
      ctx.stroke(); 
    }
    for (let y = 0; y < CANVAS_HEIGHT; y += 40) { 
      ctx.beginPath(); 
      ctx.moveTo(0, y); 
      ctx.lineTo(CANVAS_WIDTH, y); 
      ctx.stroke(); 
    }

    // Actions
    actions.forEach(action => {
      ctx.strokeStyle = action.color;
      ctx.fillStyle = action.color;
      ctx.lineWidth = action.size;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      if ((action.type === 'draw' || action.type === 'erase') && action.points && action.points.length > 0) {
        ctx.globalCompositeOperation = action.type === 'erase' ? 'destination-out' : 'source-over';
        ctx.beginPath();
        ctx.moveTo(action.points[0].x, action.points[0].y);
        if (action.points.length > 2) {
          // Quadratic bezier smoothing for gorgeous fluid curves
          ctx.moveTo(action.points[0].x, action.points[0].y);
          for (let i = 1; i < action.points.length - 1; i++) {
            const xc = (action.points[i].x + action.points[i + 1].x) / 2;
            const yc = (action.points[i].y + action.points[i + 1].y) / 2;
            ctx.quadraticCurveTo(action.points[i].x, action.points[i].y, xc, yc);
          }
          ctx.lineTo(action.points[action.points.length - 1].x, action.points[action.points.length - 1].y);
        } else if (action.points.length === 2) {
          ctx.moveTo(action.points[0].x, action.points[0].y);
          ctx.lineTo(action.points[1].x, action.points[1].y);
        } else if (action.points.length === 1) {
          ctx.moveTo(action.points[0].x, action.points[0].y);
          ctx.arc(action.points[0].x, action.points[0].y, action.size / 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.stroke();
        ctx.globalCompositeOperation = 'source-over';
      } else if (action.type === 'line' && action.x !== undefined) {
        ctx.beginPath();
        ctx.moveTo(action.x, action.y!);
        ctx.lineTo(action.endX!, action.endY!);
        ctx.stroke();
      } else if (action.type === 'rect' && action.x !== undefined) {
        if (action.filled) {
          ctx.fillRect(action.x, action.y!, (action.endX! - action.x), (action.endY! - action.y!));
        }
        ctx.strokeRect(action.x, action.y!, (action.endX! - action.x), (action.endY! - action.y!));
      } else if (action.type === 'circle' && action.x !== undefined) {
        const rx = Math.abs(action.endX! - action.x) / 2;
        const ry = Math.abs(action.endY! - action.y!) / 2;
        const cx = (action.x + action.endX!) / 2;
        const cy = (action.y! + action.endY!) / 2;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        if (action.filled) {
          ctx.fill();
        }
        ctx.stroke();
      } else if (action.type === 'triangle' && action.x !== undefined) {
        ctx.beginPath();
        ctx.moveTo((action.x + action.endX!) / 2, action.y!);
        ctx.lineTo(action.endX!, action.endY!);
        ctx.lineTo(action.x, action.endY!);
        ctx.closePath();
        if (action.filled) {
          ctx.fill();
        }
        ctx.stroke();
      } else if (action.type === 'diamond' && action.x !== undefined) {
        const cx = (action.x + action.endX!) / 2;
        const cy = (action.y! + action.endY!) / 2;
        ctx.beginPath();
        ctx.moveTo(cx, action.y!);
        ctx.lineTo(action.endX!, cy);
        ctx.lineTo(cx, action.endY!);
        ctx.lineTo(action.x, cy);
        ctx.closePath();
        if (action.filled) {
          ctx.fill();
        }
        ctx.stroke();
      } else if (action.type === 'arrow' && action.x !== undefined) {
        const minX = Math.min(action.x, action.endX!);
        const maxX = Math.max(action.x, action.endX!);
        const minY = Math.min(action.y!, action.endY!);
        const maxY = Math.max(action.y!, action.endY!);
        const w = maxX - minX;
        const h = maxY - minY;
        ctx.beginPath();
        ctx.moveTo(minX, minY + h * 0.35);
        ctx.lineTo(minX + w * 0.5, minY + h * 0.35);
        ctx.lineTo(minX + w * 0.5, minY);
        ctx.lineTo(maxX, minY + h * 0.5);
        ctx.lineTo(minX + w * 0.5, maxY);
        ctx.lineTo(minX + w * 0.5, minY + h * 0.65);
        ctx.lineTo(minX, minY + h * 0.65);
        ctx.closePath();
        if (action.filled) {
          ctx.fill();
        }
        ctx.stroke();
      } else if (action.type === 'star' && action.x !== undefined) {
        const cx = (action.x + action.endX!) / 2;
        const cy = (action.y! + action.endY!) / 2;
        const rx = Math.abs(action.endX! - action.x) / 2;
        const ry = Math.abs(action.endY! - action.y!) / 2;
        ctx.beginPath();
        const spikes = 5;
        const rot = Math.PI / 2 * 3;
        const step = Math.PI / spikes;
        for (let i = 0; i < spikes * 2; i++) {
          const r = i % 2 === 0 ? rx : rx * 0.4;
          const rY = i % 2 === 0 ? ry : ry * 0.4;
          const angle = rot + i * step;
          const xVal = cx + Math.cos(angle) * r;
          const yVal = cy + Math.sin(angle) * rY;
          if (i === 0) {
            ctx.moveTo(xVal, yVal);
          } else {
            ctx.lineTo(xVal, yVal);
          }
        }
        ctx.closePath();
        if (action.filled) {
          ctx.fill();
        }
        ctx.stroke();
      } else if (action.type === 'text' && action.x !== undefined) {
        ctx.font = `semibold ${action.size * 4}px "Space Grotesk", "Inter", sans-serif`;
        ctx.fillStyle = action.color;
        ctx.fillText(action.text || '', action.x, action.y!);
      }
    });

    // Selection dash boundary highlighter overlay
    if (selectedActionIndex !== null && selectedActionIndex < actions.length) {
      const act = actions[selectedActionIndex];
      ctx.save();
      ctx.strokeStyle = '#D97756';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      if (act.x !== undefined && act.endX !== undefined && act.y !== undefined && act.endY !== undefined) {
        const minX = Math.min(act.x, act.endX);
        const maxX = Math.max(act.x, act.endX);
        const minY = Math.min(act.y, act.endY);
        const maxY = Math.max(act.y, act.endY);
        ctx.strokeRect(minX - 6, minY - 6, (maxX - minX) + 12, (maxY - minY) + 12);
      } else if (act.points && act.points.length > 0) {
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        act.points.forEach(pt => {
          if (pt.x < minX) minX = pt.x;
          if (pt.x > maxX) maxX = pt.x;
          if (pt.y < minY) minY = pt.y;
          if (pt.y > maxY) maxY = pt.y;
        });
        if (minX !== Infinity) {
          ctx.strokeRect(minX - 6, minY - 6, (maxX - minX) + 12, (maxY - minY) + 12);
        }
      }
      ctx.restore();
    }
  }, [actions, selectedActionIndex]);

  useEffect(() => { redraw(); }, [redraw]);

  const handleMouseDown = (e: React.MouseEvent) => {
    const p = getCanvasPoint(e);
    if (tool === 'text') {
      setTextPos(p);
      setShowTextInput(true);
      setTextValue('');
      return;
    }

    if (tool === 'fill') {
      let foundIdx: number | null = null;
      // Iterate backwards to find topmost shape under pointer
      for (let i = actions.length - 1; i >= 0; i--) {
        const act = actions[i];
        if (act.type === 'text') continue;
        if (act.x !== undefined && act.endX !== undefined && act.y !== undefined && act.endY !== undefined) {
          const minX = Math.min(act.x, act.endX);
          const maxX = Math.max(act.x, act.endX);
          const minY = Math.min(act.y, act.endY);
          const maxY = Math.max(act.y, act.endY);
          const pad = 12;
          if (p.x >= minX - pad && p.x <= maxX + pad && p.y >= minY - pad && p.y <= maxY + pad) {
            foundIdx = i;
            break;
          }
        } else if (act.points && act.points.length > 0) {
          const clickedNear = act.points.some(pt => Math.hypot(pt.x - p.x, pt.y - p.y) <= (act.size + 12));
          if (clickedNear) {
            foundIdx = i;
            break;
          }
        }
      }
      if (foundIdx !== null) {
        setActions(prev => prev.map((act, i) => {
          if (i === foundIdx) {
            const shouldFill = !act.filled || act.color !== color;
            return {
              ...act,
              color: color,
              filled: shouldFill
            };
          }
          return act;
        }));
        setRedoStack([]);
      }
      return;
    }

    if (tool === 'select') {
      let foundIdx: number | null = null;
      for (let i = actions.length - 1; i >= 0; i--) {
        const act = actions[i];
        if (act.x !== undefined && act.endX !== undefined && act.y !== undefined && act.endY !== undefined) {
          const minX = Math.min(act.x, act.endX);
          const maxX = Math.max(act.x, act.endX);
          const minY = Math.min(act.y, act.endY);
          const maxY = Math.max(act.y, act.endY);
          const pad = 12;
          if (p.x >= minX - pad && p.x <= maxX + pad && p.y >= minY - pad && p.y <= maxY + pad) {
            foundIdx = i;
            break;
          }
        } else if (act.points && act.points.length > 0) {
          const clickedNear = act.points.some(pt => Math.hypot(pt.x - p.x, pt.y - p.y) <= (act.size + 12));
          if (clickedNear) {
            foundIdx = i;
            break;
          }
        }
      }
      setSelectedActionIndex(foundIdx);
      if (foundIdx !== null) {
        isDraggingActionRef.current = true;
        dragStartPointRef.current = p;
        const act = actions[foundIdx];
        if (act.points) {
          draggedActionOriginalPointsRef.current = act.points.map(pt => ({ ...pt }));
        } else {
          draggedActionOriginalXRef.current = act.x;
          draggedActionOriginalYRef.current = act.y;
          draggedActionOriginalEndXRef.current = act.endX;
          draggedActionOriginalEndYRef.current = act.endY;
        }
      }
      return;
    }

    isDrawingRef.current = true;
    startPosRef.current = p;
    lastPointRef.current = p;
    pointsRef.current = [p];
    stabilizedPointRef.current = p;
    currentCursorPosRef.current = p;

    if (tool === 'pen' || tool === 'eraser') {
      // Small dot on initial click to feel responsive
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.save();
          ctx.strokeStyle = tool === 'eraser' ? '#000000' : color;
          ctx.fillStyle = tool === 'eraser' ? '#000000' : color;
          ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
          ctx.lineWidth = brushSize;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          
          ctx.beginPath();
          ctx.arc(p.x, p.y, brushSize / 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }
    }
  };

  const updateCustomCursor = (e: React.MouseEvent) => {
    const customCursor = customCursorRef.current;
    if (!customCursor) return;
    const rect = getCanvasRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const scale = rect.width / CANVAS_WIDTH;
    const size = Math.max(4, brushSize * scale);

    customCursor.style.display = (tool === 'select' || tool === 'text') ? 'none' : 'block';
    customCursor.style.transform = `translate3d(${x}px, ${y}px, 0)`;

    if (tool === 'eraser') {
      customCursor.style.width = `${size}px`;
      customCursor.style.height = `${size}px`;
      customCursor.style.marginLeft = `${-size / 2}px`;
      customCursor.style.marginTop = `${-size / 2}px`;
      customCursor.style.borderRadius = '0px';
      customCursor.style.border = '1.5px solid #D97756';
      customCursor.style.boxShadow = '0 0 0 1px #ffffff';
      customCursor.style.backgroundColor = 'rgba(217, 119, 86, 0.15)';
    } else if (tool === 'pen') {
      customCursor.style.width = `${size}px`;
      customCursor.style.height = `${size}px`;
      customCursor.style.marginLeft = `${-size / 2}px`;
      customCursor.style.marginTop = `${-size / 2}px`;
      customCursor.style.borderRadius = '50%';
      customCursor.style.border = '1px solid #ffffff';
      customCursor.style.boxShadow = '0 0 2px rgba(0, 0, 0, 0.5)';
      customCursor.style.backgroundColor = color;
    } else {
      customCursor.style.width = '8px';
      customCursor.style.height = '8px';
      customCursor.style.marginLeft = '-4px';
      customCursor.style.marginTop = '-4px';
      customCursor.style.borderRadius = '50%';
      customCursor.style.border = '1.5px solid #D97756';
      customCursor.style.boxShadow = '0 0 0 1px #ffffff';
      customCursor.style.backgroundColor = 'rgba(217, 119, 86, 0.3)';
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const p = getCanvasPoint(e);

    if (tool === 'select' && isDraggingActionRef.current && selectedActionIndex !== null) {
      const start = dragStartPointRef.current;
      const dx = p.x - start.x;
      const dy = p.y - start.y;
      
      setActions(prev => prev.map((act, idx) => {
        if (idx === selectedActionIndex) {
          if (act.points) {
            const originalPoints = draggedActionOriginalPointsRef.current;
            return {
              ...act,
              points: originalPoints.map(opt => ({
                x: opt.x + dx,
                y: opt.y + dy
              }))
            };
          } else if (act.x !== undefined && act.y !== undefined && act.endX !== undefined && act.endY !== undefined) {
            const origX = draggedActionOriginalXRef.current!;
            const origY = draggedActionOriginalYRef.current!;
            const origEndX = draggedActionOriginalEndXRef.current!;
            const origEndY = draggedActionOriginalEndYRef.current!;
            return {
              ...act,
              x: origX + dx,
              y: origY + dy,
              endX: origEndX + dx,
              endY: origEndY + dy
            };
          }
        }
        return act;
      }));
      return;
    }

    if (!isDrawingRef.current) {
      updateCustomCursor(e);
      return;
    }

    if (tool === 'pen' || tool === 'eraser') {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.save();
          ctx.strokeStyle = tool === 'eraser' ? '#000000' : color;
          ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
          ctx.lineWidth = brushSize;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';

          ctx.beginPath();
          ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
          if (stabilizedDist > 0) {
            // Calculate distance from previous stabilized point to current mouse position
            const dx = p.x - stabilizedPointRef.current.x;
            const dy = p.y - stabilizedPointRef.current.y;
            const dist = Math.hypot(dx, dy);

            if (dist > stabilizedDist) {
              const angle = Math.atan2(dy, dx);
              const targetX = p.x - Math.cos(angle) * stabilizedDist;
              const targetY = p.y - Math.sin(angle) * stabilizedDist;
              const stabilizedP = { x: targetX, y: targetY };

              // Smooth quadratic curve from lastPoint to stabilizedP through previous midpoint
              const prevPoints = pointsRef.current;
              if (prevPoints.length >= 1) {
                const prev = prevPoints[prevPoints.length - 1];
                const xc = (prev.x + stabilizedP.x) / 2;
                const yc = (prev.y + stabilizedP.y) / 2;
                ctx.quadraticCurveTo(prev.x, prev.y, xc, yc);
                lastPointRef.current = { x: xc, y: yc };
              } else {
                ctx.lineTo(stabilizedP.x, stabilizedP.y);
                lastPointRef.current = stabilizedP;
              }

              pointsRef.current.push(stabilizedP);
              stabilizedPointRef.current = stabilizedP;

              // Draw leash preview thread on preview canvas
              const pCanvas = previewCanvasRef.current;
              if (pCanvas) {
                const pCtx = pCanvas.getContext('2d');
                if (pCtx) {
                  pCtx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
                  pCtx.save();
                  pCtx.strokeStyle = 'rgba(217, 119, 86, 0.45)';
                  pCtx.lineWidth = 1.5;
                  pCtx.setLineDash([4, 4]);
                  pCtx.beginPath();
                  pCtx.moveTo(stabilizedP.x, stabilizedP.y);
                  pCtx.lineTo(p.x, p.y);
                  pCtx.stroke();

                  pCtx.fillStyle = '#D97756';
                  pCtx.beginPath();
                  pCtx.arc(stabilizedP.x, stabilizedP.y, 4, 0, Math.PI * 2);
                  pCtx.fill();
                  pCtx.restore();
                }
              }
            } else {
              // Just draw static preview thread
              const pCanvas = previewCanvasRef.current;
              if (pCanvas) {
                const pCtx = pCanvas.getContext('2d');
                if (pCtx) {
                  pCtx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
                  pCtx.save();
                  pCtx.strokeStyle = 'rgba(217, 119, 86, 0.45)';
                  pCtx.lineWidth = 1.5;
                  pCtx.setLineDash([4, 4]);
                  pCtx.beginPath();
                  pCtx.moveTo(stabilizedPointRef.current.x, stabilizedPointRef.current.y);
                  pCtx.lineTo(p.x, p.y);
                  pCtx.stroke();

                  pCtx.fillStyle = '#D97756';
                  pCtx.beginPath();
                  pCtx.arc(stabilizedPointRef.current.x, stabilizedPointRef.current.y, 4, 0, Math.PI * 2);
                  pCtx.fill();
                  pCtx.restore();
                }
              }
              // Prevent stroke from drawing any segment since brush didn't move
              ctx.closePath();
            }
          } else {
            // Freehand with optimization
            const lastReg = pointsRef.current[pointsRef.current.length - 1];
            const distFromLast = lastReg ? Math.hypot(p.x - lastReg.x, p.y - lastReg.y) : Infinity;

            if (distFromLast >= 2.0 || pointsRef.current.length === 0) {
              const prevPoints = pointsRef.current;
              if (prevPoints.length >= 1) {
                const prev = prevPoints[prevPoints.length - 1];
                const xc = (prev.x + p.x) / 2;
                const yc = (prev.y + p.y) / 2;
                ctx.quadraticCurveTo(prev.x, prev.y, xc, yc);
                lastPointRef.current = { x: xc, y: yc };
              } else {
                ctx.lineTo(p.x, p.y);
                lastPointRef.current = p;
              }
              pointsRef.current.push(p);
            } else {
              // Skip line to avoid redundant close points
              ctx.closePath();
            }
          }
          ctx.stroke();
          ctx.restore();
        }
      }
      lastPointRef.current = p;
      pointsRef.current.push(p);
      updateCustomCursor(e);
    } else if (['line', 'rect', 'circle', 'triangle', 'diamond', 'arrow', 'star'].includes(tool)) {
      const pCanvas = previewCanvasRef.current;
      if (pCanvas) {
        const pCtx = pCanvas.getContext('2d');
        if (pCtx) {
          pCtx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
          pCtx.save();
          pCtx.strokeStyle = color;
          pCtx.lineWidth = brushSize;
          pCtx.lineCap = 'round';
          pCtx.lineJoin = 'round';

          const start = startPosRef.current;
          if (tool === 'line') {
            pCtx.beginPath();
            pCtx.moveTo(start.x, start.y);
            pCtx.lineTo(p.x, p.y);
            pCtx.stroke();
          } else if (tool === 'rect') {
            pCtx.strokeRect(start.x, start.y, p.x - start.x, p.y - start.y);
          } else if (tool === 'circle') {
            const rx = Math.abs(p.x - start.x) / 2;
            const ry = Math.abs(p.y - start.y) / 2;
            const cx = (start.x + p.x) / 2;
            const cy = (start.y + p.y) / 2;
            pCtx.beginPath();
            pCtx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
            pCtx.stroke();
          } else if (tool === 'triangle') {
            pCtx.beginPath();
            pCtx.moveTo((start.x + p.x) / 2, start.y);
            pCtx.lineTo(p.x, p.y);
            pCtx.lineTo(start.x, p.y);
            pCtx.closePath();
            pCtx.stroke();
          } else if (tool === 'diamond') {
            const cx = (start.x + p.x) / 2;
            const cy = (start.y + p.y) / 2;
            pCtx.beginPath();
            pCtx.moveTo(cx, start.y);
            pCtx.lineTo(p.x, cy);
            pCtx.lineTo(cx, p.y);
            pCtx.lineTo(start.x, cy);
            pCtx.closePath();
            pCtx.stroke();
          } else if (tool === 'arrow') {
            const minX = Math.min(start.x, p.x);
            const maxX = Math.max(start.x, p.x);
            const minY = Math.min(start.y, p.y);
            const maxY = Math.max(start.y, p.y);
            const w = maxX - minX;
            const h = maxY - minY;
            pCtx.beginPath();
            pCtx.moveTo(minX, minY + h * 0.35);
            pCtx.lineTo(minX + w * 0.5, minY + h * 0.35);
            pCtx.lineTo(minX + w * 0.5, minY);
            pCtx.lineTo(maxX, minY + h * 0.5);
            pCtx.lineTo(minX + w * 0.5, maxY);
            pCtx.lineTo(minX + w * 0.5, minY + h * 0.65);
            pCtx.lineTo(minX, minY + h * 0.65);
            pCtx.closePath();
            pCtx.stroke();
          } else if (tool === 'star') {
            const cx = (start.x + p.x) / 2;
            const cy = (start.y + p.y) / 2;
            const rx = Math.abs(p.x - start.x) / 2;
            const ry = Math.abs(p.y - start.y) / 2;
            pCtx.beginPath();
            const spikes = 5;
            const rot = Math.PI / 2 * 3;
            const step = Math.PI / spikes;
            for (let i = 0; i < spikes * 2; i++) {
              const r = i % 2 === 0 ? rx : rx * 0.4;
              const rY = i % 2 === 0 ? ry : ry * 0.4;
              const angle = rot + i * step;
              const xVal = cx + Math.cos(angle) * r;
              const yVal = cy + Math.sin(angle) * rY;
              if (i === 0) {
                pCtx.moveTo(xVal, yVal);
              } else {
                pCtx.lineTo(xVal, yVal);
              }
            }
            pCtx.closePath();
            pCtx.stroke();
          }
          pCtx.restore();
        }
      }
      lastPointRef.current = p;
      updateCustomCursor(e);
    }
  };

  const handleMouseUp = () => {
    if (tool === 'select' && isDraggingActionRef.current) {
      isDraggingActionRef.current = false;
      return;
    }

    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;

    // Clear shape preview layout
    const pCanvas = previewCanvasRef.current;
    if (pCanvas) {
      const pCtx = pCanvas.getContext('2d');
      if (pCtx) {
        pCtx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      }
    }

    const start = startPosRef.current;
    const end = lastPointRef.current;

    if (tool === 'pen' || tool === 'eraser') {
      if (pointsRef.current.length > 0) {
        setActions(prev => [...prev, { type: tool === 'eraser' ? 'erase' : 'draw', points: pointsRef.current, color, size: brushSize }]);
        setRedoStack([]);
      }
    } else if (['line', 'rect', 'circle', 'triangle', 'diamond', 'arrow', 'star'].includes(tool)) {
      setActions(prev => [...prev, { type: tool as any, color, size: brushSize, x: start.x, y: start.y, endX: end.x, endY: end.y }]);
      setRedoStack([]);
    }
  };

  const handleMouseLeave = () => {
    handleMouseUp();
    const pCanvas = previewCanvasRef.current;
    if (pCanvas) {
      const pCtx = pCanvas.getContext('2d');
      if (pCtx) {
        pCtx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      }
    }
    const customCursor = customCursorRef.current;
    if (customCursor) {
      customCursor.style.display = 'none';
    }
  };

  const addText = () => {
    if (!textValue.trim()) { setShowTextInput(false); return; }
    setActions(prev => [...prev, { type: 'text', color, size: brushSize, x: textPos.x, y: textPos.y, text: textValue.trim() }]);
    setRedoStack([]);
    setShowTextInput(false);
    setTextValue('');
  };

  const addStickyNote = () => {
    const rect = getCanvasRect();
    if (!rect) return;
    const sx = containerRef.current?.scrollLeft || 0;
    const sy = containerRef.current?.scrollTop || 0;
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;
    const x = sx * scaleX + 50;
    const y = sy * scaleY + 120;
    const note: StickyNoteData = { 
      id: Date.now().toString(), 
      x: x < CANVAS_WIDTH - 200 ? x : 100, 
      y: y < CANVAS_HEIGHT - 200 ? y : 150, 
      text: 'Note text...', 
      color: NOTE_COLORS[Math.floor(Math.random() * NOTE_COLORS.length)] 
    };
    setStickyNotes(prev => [...prev, note]);
  };

  const undo = () => {
    setActions(prev => { 
      if (prev.length === 0) return prev; 
      const last = prev[prev.length - 1]; 
      setRedoStack(r => [...r, last]); 
      return prev.slice(0, -1); 
    });
  };

  const redo = () => {
    setRedoStack(prev => { 
      if (prev.length === 0) return prev; 
      const last = prev[prev.length - 1]; 
      setActions(a => [...a, last]); 
      return prev.slice(0, -1); 
    });
  };

  const clearCanvas = () => { 
    setActions([]); 
    setRedoStack([]); 
    setStickyNotes([]); 
  };

  const exportCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = CANVAS_WIDTH;
    exportCanvas.height = CANVAS_HEIGHT;
    const ctx = exportCanvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#0B0908';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.drawImage(canvas, 0, 0);
    
    // Draw sticky notes onto exporting canvas
    stickyNotes.forEach(note => {
      ctx.fillStyle = note.color;
      ctx.fillRect(note.x, note.y, 180, 140);
      ctx.strokeStyle = '#2D2420';
      ctx.lineWidth = 2;
      ctx.strokeRect(note.x, note.y, 180, 140);
      
      ctx.fillStyle = '#181513';
      ctx.font = 'semibold 13px Inter, sans-serif';
      const words = note.text.split(' ');
      let line = '';
      let y = note.y + 25;
      words.forEach(word => {
        const test = line + word + ' ';
        if (ctx.measureText(test).width > 160 && line) {
          ctx.fillText(line, note.x + 12, y);
          line = word + ' ';
          y += 18;
        } else {
          line = test;
        }
      });
      ctx.fillText(line, note.x + 12, y);
    });

    const link = document.createElement('a');
    link.download = 'lumina-whiteboard.png';
    link.href = exportCanvas.toDataURL('image/png');
    link.click();
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { 
        e.preventDefault(); 
        undo(); 
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'Z'))) { 
        e.preventDefault(); 
        redo(); 
      }
      if (selectedActionIndex !== null && (e.key === 'Delete' || e.key === 'Backspace')) {
        const activeNode = document.activeElement;
        const isInputField = activeNode?.tagName === 'INPUT' || activeNode?.tagName === 'TEXTAREA' || activeNode?.getAttribute('contenteditable') === 'true';
        if (!isInputField) {
          e.preventDefault();
          setActions(prev => prev.filter((_, idx) => idx !== selectedActionIndex));
          setSelectedActionIndex(null);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [actions, redoStack, selectedActionIndex]);

  const toolBtn = (t: Tool, icon: ReactElement, label: string) => (
    <button
      onClick={() => {
        setTool(t);
        if (t !== 'select') {
          setSelectedActionIndex(null);
        }
      }}
      className={`p-1.5 rounded-lg border flex items-center justify-center transition-all cursor-pointer ${
        tool === t 
          ? 'bg-[#D97756]/15 border-[#D97756]/40 text-[#D97756] shadow-sm scale-95' 
          : 'bg-[var(--theme-bg)]/45 border-[var(--theme-border)]/35 text-[var(--theme-secondary)] hover:text-[var(--theme-primary)] hover:bg-[var(--theme-bg)]/80'
      }`}
      title={label}
      aria-label={label}
    >
      {React.cloneElement(icon as React.ReactElement<any>, { size: 14 })}
    </button>
  );

  const groupTitleClass = "mt-2 text-[10px] tracking-[0.18em] uppercase text-[var(--theme-muted)]/85 text-center";
  const toolbarSectionClass = "flex h-[124px] shrink-0 flex-col justify-between rounded-2xl border border-white/6 bg-[rgba(255,255,255,0.03)] px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]";
  const panelButtonClass = "flex h-9 w-9 items-center justify-center rounded-xl border transition-all cursor-pointer";

  return (
    <div className="flex flex-col h-full bg-[var(--theme-input-bg)] select-none font-sans text-xs">
      {/* Dynamic Toolbar */}
      <div className="shrink-0 border-b border-[var(--theme-border)]/35 bg-[linear-gradient(180deg,rgba(29,26,24,0.97),rgba(20,17,16,0.94))] px-3 py-2 backdrop-blur-md">
        <div className="flex items-stretch gap-2 overflow-hidden">
          <div className={`${toolbarSectionClass} w-[188px]`}>
            <div className="grid grid-cols-3 gap-2">
              {toolBtn('pen', <Pencil />, 'Pen')}
              {toolBtn('eraser', <Eraser />, 'Eraser')}
              {toolBtn('text', <Type />, 'Text')}
              {toolBtn('fill', <PaintBucket />, 'Fill color / Paint shapes')}
              <button
                onClick={addStickyNote}
                className={`${panelButtonClass} bg-[var(--theme-bg)]/45 border-[var(--theme-border)]/35 text-[var(--theme-secondary)] hover:text-[var(--theme-primary)] hover:bg-[var(--theme-bg)]/80`}
                title="Add Sticky Note"
                aria-label="Add Sticky Note"
              >
                <StickyNote size={16} className="text-yellow-500" />
              </button>
              {toolBtn('select', <MousePointer />, 'Select & move shapes')}
            </div>
            <div className={groupTitleClass}>Tools</div>
          </div>

          <div className={`${toolbarSectionClass} w-[164px]`}>
            <div className="flex flex-col gap-2">
              <div className="rounded-2xl border border-[#d4af6d]/65 bg-[#201a14] px-3 py-2 shadow-[0_0_0_1px_rgba(212,175,109,0.15)]">
                <div className="flex items-center justify-between">
                  <PaintBucket size={16} className="text-[#f2ddaa]" />
                  <span className="text-[10px] font-mono font-bold text-[#f2ddaa]">{brushSize}</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={100}
                  value={brushSize}
                  onChange={e => {
                    const sz = Number(e.target.value);
                    setBrushSize(sz);
                    if (selectedActionIndex !== null) {
                      setActions(prev => prev.map((act, idx) => idx === selectedActionIndex ? { ...act, size: sz } : act));
                    }
                  }}
                  className="mt-2 w-full cursor-pointer appearance-none rounded-lg accent-[#D97756]"
                  title="Brush Size"
                />
              </div>
              <div className="rounded-xl border border-[#d4af6d]/15 bg-white/4 px-3 py-1.5 shadow-[0_1px_1px_rgba(0,0,0,0.1)] select-none">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-bold text-gray-300 uppercase tracking-wider">Leash</span>
                  <span className="text-[10px] font-mono font-bold text-orange-400">{stabilizedDist}px</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={80}
                  value={stabilizedDist}
                  onChange={e => {
                    setStabilizedDist(Number(e.target.value));
                  }}
                  className="mt-1 w-full h-1 cursor-pointer appearance-none rounded bg-[#352a1e] accent-orange-500"
                  title="Stabilizer Leash Length (0 px = Raw Drawing)"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={undo}
                  className={`${panelButtonClass} bg-[var(--theme-bg)]/45 border-[var(--theme-border)]/35 text-[var(--theme-muted)] hover:text-[var(--theme-primary)] hover:bg-[var(--theme-bg)]/80`}
                  title="Undo Canvas (Ctrl+Z)"
                >
                  <RotateCcw size={15} />
                </button>
                <button
                  onClick={redo}
                  className={`${panelButtonClass} bg-[var(--theme-bg)]/45 border-[var(--theme-border)]/35 text-[var(--theme-muted)] hover:text-[var(--theme-primary)] hover:bg-[var(--theme-bg)]/80`}
                  title="Redo Canvas (Ctrl+Y)"
                >
                  <RotateCw size={15} />
                </button>
              </div>
            </div>
            <div className={groupTitleClass}>Stroke & Smooth</div>
          </div>

          <div className={`${toolbarSectionClass} w-[150px]`}>
            <div className="grid grid-cols-4 gap-1.5">
              {toolBtn('line', <Minus />, 'Line')}
              {toolBtn('rect', <Square />, 'Rect')}
              {toolBtn('circle', <Circle />, 'Circle')}
              {toolBtn('triangle', <Triangle />, 'Triangle')}
              {toolBtn('diamond', <Diamond />, 'Diamond')}
              {toolBtn('arrow', <ArrowRight />, 'Arrow')}
              {toolBtn('star', <Star />, 'Star')}
            </div>
            <div className={groupTitleClass}>Shapes</div>
          </div>

          <div className={`${toolbarSectionClass} w-[180px]`}>
            <div className="flex flex-col items-center justify-center gap-1.5 p-0.5">
              {/* Upper row: 5 colors */}
              <div className="flex items-center gap-1.5 justify-center">
                {COLORS.slice(0, 5).map(c => (
                  <button
                    key={c}
                    onClick={() => {
                      setColor(c);
                      if (selectedActionIndex !== null) {
                        setActions(prev => prev.map((act, idx) => idx === selectedActionIndex ? { ...act, color: c } : act));
                      }
                    }}
                    className="relative h-7 w-7 rounded-full border transition-all cursor-pointer"
                    style={{
                      background: c,
                      borderColor: color === c ? '#f2ddaa' : 'rgba(255,255,255,0.22)',
                      boxShadow: color === c ? '0 0 0 2px rgba(242,221,170,0.22)' : 'none',
                      transform: color === c ? 'scale(1.08)' : 'scale(1)'
                    }}
                    title={`Use Color: ${c}`}
                  >
                    {color === c && (
                      <span className="absolute inset-0 m-auto h-2 w-2 rounded-full bg-black/40" />
                    )}
                  </button>
                ))}
              </div>
              {/* Lower row: 4 colors */}
              <div className="flex items-center gap-1.5 justify-center">
                {COLORS.slice(5).map(c => (
                  <button
                    key={c}
                    onClick={() => {
                      setColor(c);
                      if (selectedActionIndex !== null) {
                        setActions(prev => prev.map((act, idx) => idx === selectedActionIndex ? { ...act, color: c } : act));
                      }
                    }}
                    className="relative h-7 w-7 rounded-full border transition-all cursor-pointer"
                    style={{
                      background: c,
                      borderColor: color === c ? '#f2ddaa' : 'rgba(255,255,255,0.22)',
                      boxShadow: color === c ? '0 0 0 2px rgba(242,221,170,0.22)' : 'none',
                      transform: color === c ? 'scale(1.08)' : 'scale(1)'
                    }}
                    title={`Use Color: ${c}`}
                  >
                    {color === c && (
                      <span className="absolute inset-0 m-auto h-2 w-2 rounded-full bg-black/40" />
                    )}
                  </button>
                ))}
              </div>
            </div>
            <div className={groupTitleClass}>Colours</div>
          </div>
        </div>
      </div>

      {/* Canvas viewport container */}
      <div 
        ref={containerRef} 
        className={`flex-1 relative bg-[var(--theme-input-bg)] flex items-center justify-center ${
          zoom === 'fit' ? 'overflow-hidden' : 'overflow-auto custom-scrollbar'
        }`}
        style={{ cursor: tool === 'select' ? 'default' : tool === 'text' ? 'text' : 'none' }}
      >
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          style={{ 
            width: zoom === 'fit' ? '100%' : `${CANVAS_WIDTH * zoom}px`, 
            height: zoom === 'fit' ? '100%' : `${CANVAS_HEIGHT * zoom}px`,
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain',
            cursor: tool === 'select' ? 'default' : tool === 'text' ? 'text' : 'none'
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          className="block select-none shrink-0"
        />
        <canvas
          ref={previewCanvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          style={{ 
            width: zoom === 'fit' ? '100%' : `${CANVAS_WIDTH * zoom}px`, 
            height: zoom === 'fit' ? '100%' : `${CANVAS_HEIGHT * zoom}px`,
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain',
            pointerEvents: 'none',
            cursor: tool === 'select' ? 'default' : tool === 'text' ? 'text' : 'none'
          }}
          className="absolute block select-none pointer-events-none shrink-0"
        />
        <div 
          ref={customCursorRef}
          className="pointer-events-none absolute left-0 top-0 hidden bg-[#D97756]/15 border border-[#D97756] select-none pointer-events-none z-[60]"
          style={{
            willChange: 'transform'
          }}
        />

        {/* Interactive Sticky Notes layered overlay */}
        {stickyNotes.map(note => {
          const isNoteDragged = draggedNote === note.id;
          return (
            <div
              key={note.id}
              style={{ 
                position: 'absolute', 
                left: note.x, 
                top: note.y, 
                width: 170, 
                minHeight: 120, 
                backgroundColor: note.color, 
                borderRadius: 8, 
                padding: 10, 
                color: '#181513', 
                zIndex: isNoteDragged ? 50 : 10,
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.25)' 
              }}
              onMouseDown={(e) => {
                if (tool === 'select') {
                  const clickOffset = getCanvasPoint(e);
                  setDraggedNote(note.id);
                  setDragOffset({ x: clickOffset.x - note.x, y: clickOffset.y - note.y });
                }
              }}
              className="group select-text flex flex-col justify-between border-2 border-transparent hover:border-[#D97756]/50 transition-colors"
            >
              <div className="flex justify-between items-center select-none cursor-move h-4 opacity-50 hover:opacity-100 mb-1 shrink-0">
                <GripHorizontal size={10} className="text-zinc-600" />
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setStickyNotes(prev => prev.filter(n => n.id !== note.id));
                  }}
                  className="w-3.5 h-3.5 hover:bg-black/10 rounded flex items-center justify-center cursor-pointer text-zinc-600"
                  title="Remove Sticky Note"
                >
                  <X size={10} strokeWidth={2.5} />
                </button>
              </div>
              <div
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => { 
                  const text = e.currentTarget.innerText || '';
                  setStickyNotes(prev => prev.map(n => n.id === note.id ? { ...n, text } : n)); 
                }}
                className="flex-1 text-xs select-text focus:outline-none overflow-y-auto leading-relaxed scrollbar-thin scrollbar-thumb-black/20"
                style={{ fontFamily: 'var(--font-sans)', fontWeight: 550 }}
              >
                {note.text}
              </div>
            </div>
          );
        })}

        {/* Contextual overlay for typing interactive text action */}
        {showTextInput && (
          <div 
            style={{ 
              position: 'absolute', 
              left: textPos.x, 
              top: textPos.y, 
              zIndex: 20 
            }}
          >
            <input
              value={textValue} 
              onChange={e => setTextValue(e.target.value)} 
              onKeyDown={e => e.key === 'Enter' && addText()} 
              onBlur={addText}
              autoFocus
              className="px-2 py-1 text-sm outline-none bg-[#120F0D] border border-[#D97756] rounded shadow-lg text-[#EDE6DD]"
              style={{ minWidth: 120 }}
              placeholder="Print text + Enter..."
            />
          </div>
        )}
      </div>

      {/* Secondary mouse listener to release the sticky notes from dragging safely */}
      {draggedNote && (
        <div 
          className="fixed inset-0 z-[99]"
          onMouseMove={(e) => {
            if (draggedNote) {
              const rect = getCanvasRect();
              if (!rect) return;
              const scaleX = CANVAS_WIDTH / rect.width;
              const scaleY = CANVAS_HEIGHT / rect.height;
              
              const xOnCanvas = (e.clientX - rect.left) * scaleX;
              const yOnCanvas = (e.clientY - rect.top) * scaleY;
              
              setStickyNotes(prev => prev.map(n => n.id === draggedNote ? { 
                ...n, 
                x: Math.max(0, Math.min(CANVAS_WIDTH - 180, xOnCanvas - dragOffset.x)), 
                y: Math.max(0, Math.min(CANVAS_HEIGHT - 140, yOnCanvas - dragOffset.y)) 
              } : n));
            }
          }}
          onMouseUp={() => setDraggedNote(null)}
        />
      )}
    </div>
  );
}

export default React.memo(Whiteboard);
