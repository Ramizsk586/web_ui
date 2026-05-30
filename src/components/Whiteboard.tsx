import React, { useState, useRef, useEffect, useCallback, type ReactElement } from 'react';
import {
  Pencil, Eraser, Minus, Square, Circle, Type, Download, Trash2,
  RotateCcw, RotateCw, StickyNote, MousePointer, Settings, HelpCircle, GripHorizontal, X,
  Triangle, Diamond, ArrowRight, Star, PaintBucket
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

function Whiteboard() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const customCursorRef = useRef<HTMLDivElement>(null);
  const [tool, setTool] = useState<Tool>('pen');
  const [color, setColor] = useState('#EDE6DD');
  const [brushSize, setBrushSize] = useState(3);
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
  const canvasRectRef = useRef<DOMRect | null>(null);

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
        action.points.forEach(p => ctx.lineTo(p.x, p.y));
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
      customCursor.style.border = '1.5px solid #D97756';
      customCursor.style.boxShadow = '0 0 0 1px #ffffff';
      customCursor.style.backgroundColor = 'transparent';
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
          ctx.lineTo(p.x, p.y);
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

  return (
    <div className="flex flex-col h-full bg-[var(--theme-input-bg)] select-none font-sans text-xs">
      {/* Dynamic Toolbar */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--theme-bg)]/80 border-b border-[var(--theme-border)]/35 overflow-x-auto custom-scrollbar shrink-0 backdrop-blur-sm">
        {toolBtn('select', <MousePointer />, 'Select & move shapes')}
        {toolBtn('fill', <PaintBucket />, 'Fill color / Paint shapes')}
        {toolBtn('pen', <Pencil />, 'Pen')}
        {toolBtn('eraser', <Eraser />, 'Eraser')}
        {toolBtn('line', <Minus />, 'Line')}
        {toolBtn('rect', <Square />, 'Rect')}
        {toolBtn('circle', <Circle />, 'Circle')}
        {toolBtn('triangle', <Triangle />, 'Triangle')}
        {toolBtn('diamond', <Diamond />, 'Diamond')}
        {toolBtn('arrow', <ArrowRight />, 'Arrow')}
        {toolBtn('star', <Star />, 'Star')}
        {toolBtn('text', <Type />, 'Text')}

        <div className="w-px h-5 bg-[var(--theme-border)]/35 mx-1 self-center" />

        <button 
          onClick={addStickyNote} 
          className="p-1.5 rounded-lg border bg-[var(--theme-bg)]/45 border-[var(--theme-border)]/35 text-[var(--theme-secondary)] hover:text-[var(--theme-primary)] hover:bg-[var(--theme-bg)]/80 flex items-center justify-center cursor-pointer transition-all"
          title="Add Yellow Sticky Note"
          aria-label="Add Sticky Note"
        >
          <StickyNote size={14} className="text-yellow-500" />
        </button>

        <div className="w-px h-5 bg-[var(--theme-border)]/35 mx-1 self-center" />

        {/* Brush Color Palettes */}
        <div className="flex gap-1.5 items-center mr-1">
          {COLORS.map(c => (
            <button 
              key={c} 
              onClick={() => {
                setColor(c);
                if (selectedActionIndex !== null) {
                  setActions(prev => prev.map((act, idx) => idx === selectedActionIndex ? { ...act, color: c } : act));
                }
              }} 
              className="w-4 h-4 rounded-full border transition-all cursor-pointer relative"
              style={{ 
                background: c, 
                borderColor: color === c ? '#D97756' : 'rgba(255,255,255,0.15)',
                transform: color === c ? 'scale(1.25)' : 'scale(1)'
              }}
              title={`Use Color: ${c}`}
            >
              {color === c && (
                <span className="absolute inset-0 m-auto w-1 h-1 rounded-full bg-black/40" />
              )}
            </button>
          ))}
        </div>

        <div className="w-px h-5 bg-[var(--theme-border)]/35 mx-1 self-center" />

        {/* Brush Size Slider */}
        <div className="flex items-center gap-2 px-1.5 py-1 rounded-lg bg-[var(--theme-bg)]/45 border border-[var(--theme-border)]/35">
          <span className="text-[9px] font-mono font-bold text-[var(--theme-muted)] w-6 text-right">{brushSize}</span>
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
            className="w-14 h-1 bg-[var(--theme-border)]/25 rounded-lg appearance-none cursor-pointer accent-[#D97756]" 
            title="Brush Size"
          />
        </div>

        <div className="flex-1" />

        {/* Action Controls */}
        <div className="flex gap-1 items-center">
          {selectedActionIndex !== null && (
            <button 
              onClick={() => {
                setActions(prev => prev.filter((_, idx) => idx !== selectedActionIndex));
                setSelectedActionIndex(null);
              }} 
              className="p-1.5 rounded-lg text-red-500 hover:text-red-400 hover:bg-red-500/15 transition-all cursor-pointer flex items-center justify-center"
              title="Delete selected item (Delete or Backspace)"
            >
              <Trash2 size={13} />
            </button>
          )}
          <button 
            onClick={undo} 
            className="p-1.5 rounded-lg text-[var(--theme-muted)] hover:text-[var(--theme-primary)] hover:bg-[var(--theme-bg)]/80 transition-all cursor-pointer"
            title="Undo Canvas (Ctrl+Z)"
          >
            <RotateCcw size={13} />
          </button>
          <button 
            onClick={redo} 
            className="p-1.5 rounded-lg text-[var(--theme-muted)] hover:text-[var(--theme-primary)] hover:bg-[var(--theme-bg)]/80 transition-all cursor-pointer"
            title="Redo Canvas (Ctrl+Y)"
          >
            <RotateCw size={13} />
          </button>
          <button 
            onClick={clearCanvas} 
            className="p-1.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all cursor-pointer"
            title="Wipe canvas completely"
          >
            <Trash2 size={13} />
          </button>
          <button 
            onClick={exportCanvas} 
            className="p-1.5 rounded-lg text-[var(--theme-muted)] hover:text-[var(--theme-primary)] hover:bg-[var(--theme-bg)]/80 transition-all cursor-pointer"
            title="Export Board to PNG image"
          >
            <Download size={13} />
          </button>
        </div>
      </div>

      {/* Canvas viewport container */}
      <div ref={containerRef} className="flex-1 overflow-auto custom-scrollbar relative bg-[var(--theme-input-bg)]">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          style={{ 
            width: CANVAS_WIDTH, 
            height: CANVAS_HEIGHT, 
            cursor: tool === 'text' ? 'text' : tool === 'select' ? 'default' : (tool === 'eraser' || tool === 'pen') ? 'none' : 'crosshair' 
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          className="block select-none"
        />
        <canvas
          ref={previewCanvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          style={{ 
            width: CANVAS_WIDTH, 
            height: CANVAS_HEIGHT,
            pointerEvents: 'none'
          }}
          className="absolute top-0 left-0 block select-none pointer-events-none"
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
