import React, { useState, useEffect, useRef } from 'react';
import { 
  X, ZoomIn, ZoomOut, Play, RotateCcw, Plus, Percent, Sliders, Settings, Check, Compass, Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface MathPreset {
  id: string;
  name: string;
  equation: string;
  formulaLabel: string;
  defaultXRange: [number, number];
  defaultYRange: [number, number];
  presetType: '2D' | 'polar' | 'spiral' | 'fractal';
}

const MATH_PRESETS: MathPreset[] = [
  { id: 'sin', name: 'Trigonometric Sine Wave', equation: 'y = A * sin(B * x + C)', formulaLabel: 'y = a · sin(b·x + c)', defaultXRange: [-10, 10], defaultYRange: [-4, 4], presetType: '2D' },
  { id: 'polar-heart', name: 'Cardioid Polar Curve (Heart)', equation: 'r = a * (1 - sin(θ))', formulaLabel: 'r = a · (1 - sin(θ))', defaultXRange: [-5, 5], defaultYRange: [-5, 5], presetType: 'polar' },
  { id: 'fourier', name: 'Fourier Square Wave Approximation', equation: 'y = sum(sin((2k-1)x)/(2k-1))', formulaLabel: 'y = ∑ [4/π · (sin(nx)/n)]', defaultXRange: [-6, 6], defaultYRange: [-3, 3], presetType: '2D' },
  { id: 'exponential', name: 'Exponential Decay & Growth', equation: 'y = A * e^(k * x)', formulaLabel: 'y = a · e^(k·x)', defaultXRange: [-4, 4], defaultYRange: [-2, 10], presetType: '2D' },
  { id: 'spiral', name: 'Archimedean Spiral', equation: 'r = a * θ', formulaLabel: 'r = a · θ', defaultXRange: [-15, 15], defaultYRange: [-15, 15], presetType: 'spiral' }
];

export const MathLabCanvas: React.FC<{
  onClose?: () => void;
  isInline?: boolean;
}> = ({ onClose, isInline = true }) => {
  const [selectedPreset, setSelectedPreset] = useState<MathPreset>(MATH_PRESETS[0]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [paramA, setParamA] = useState<number>(2.0);
  const [paramB, setParamB] = useState<number>(1.5);
  const [paramC, setParamC] = useState<number>(0.0);
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [showAxes, setShowAxes] = useState<boolean>(true);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [showTangent, setShowTangent] = useState<boolean>(false);
  const [mouseX, setMouseX] = useState<number>(0);
  const [hoveredCoords, setHoveredCoords] = useState<{ x: number; y: number } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Reset parameters when preset changes
  useEffect(() => {
    if (selectedPreset.id === 'polar-heart') {
      setParamA(2.5);
      setParamB(1.0);
    } else if (selectedPreset.id === 'fourier') {
      setParamA(3); // harmonics count
      setParamB(1.0);
    } else if (selectedPreset.id === 'spiral') {
      setParamA(0.4);
      setParamB(1.0);
    } else {
      setParamA(2.0);
      setParamB(1.5);
      setParamC(0.0);
    }
    setZoomLevel(1.0);
  }, [selectedPreset]);

  // Compute boundaries
  const defaultMinX = selectedPreset.defaultXRange[0];
  const defaultMaxX = selectedPreset.defaultXRange[1];
  const defaultMinY = selectedPreset.defaultYRange[0];
  const defaultMaxY = selectedPreset.defaultYRange[1];

  const minX = defaultMinX / zoomLevel;
  const maxX = defaultMaxX / zoomLevel;
  const minY = defaultMinY / zoomLevel;
  const maxY = defaultMaxY / zoomLevel;

  // Render graph loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // Helpers to transform math coordinates to screen pixels
    const toScreenX = (x: number) => {
      const fraction = (x - minX) / (maxX - minX);
      return fraction * width;
    };

    const toScreenY = (y: number) => {
      const fraction = (y - minY) / (maxY - minY);
      // Math Y goes up, screen Y goes down
      return height - fraction * height;
    };

    const toMathX = (px: number) => {
      const fraction = px / width;
      return minX + fraction * (maxX - minX);
    };

    // Draw Grid Lines
    if (showGrid) {
      ctx.strokeStyle = '#e2e8f01a';
      if (document.documentElement.classList.contains('dark')) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      } else {
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.04)';
      }
      ctx.lineWidth = 1;

      // Vertical grids
      const stepX = (maxX - minX) / 10;
      for (let x = Math.ceil(minX); x <= Math.floor(maxX); x++) {
        const sx = toScreenX(x);
        ctx.beginPath();
        ctx.moveTo(sx, 0);
        ctx.lineTo(sx, height);
        ctx.stroke();
      }

      // Horizontal grids
      const stepY = (maxY - minY) / 10;
      for (let y = Math.ceil(minY); y <= Math.floor(maxY); y++) {
        const sy = toScreenY(y);
        ctx.beginPath();
        ctx.moveTo(0, sy);
        ctx.lineTo(width, sy);
        ctx.stroke();
      }
    }

    // Draw Axes (X and Y axis lines)
    if (showAxes) {
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 1.5;

      const originX = toScreenX(0);
      const originY = toScreenY(0);

      // X-Axis
      if (originY >= 0 && originY <= height) {
        ctx.beginPath();
        ctx.moveTo(0, originY);
        ctx.lineTo(width, originY);
        ctx.stroke();

        // Arrow tick marks for X label
        ctx.font = '9px monospace';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText('X', width - 12, originY - 6);
      }

      // Y-Axis
      if (originX >= 0 && originX <= width) {
        ctx.beginPath();
        ctx.moveTo(originX, 0);
        ctx.lineTo(originX, height);
        ctx.stroke();

        ctx.font = '9px monospace';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText('Y', originX + 6, 12);
      }
    }

    // Draw mathematical function curve
    ctx.lineWidth = 3.2;
    ctx.strokeStyle = '#3b82f6'; // Bright glow blue
    ctx.beginPath();

    const pointsCount = 350;

    if (selectedPreset.presetType === '2D') {
      let isFirst = true;

      for (let i = 0; i <= pointsCount; i++) {
        const x = minX + (i / pointsCount) * (maxX - minX);
        let y = 0;

        if (selectedPreset.id === 'sin') {
          // y = A * sin(B * x + C)
          y = paramA * Math.sin(paramB * x + paramC);
        } else if (selectedPreset.id === 'fourier') {
          // Fourier square wave
          // y = sum_k (sin((2k-1)x) / (2k-1)) * (4/pi)
          let sum = 0;
          const harmonics = Math.max(1, Math.floor(paramA));
          for (let k = 1; k <= harmonics; k++) {
            const num = 2 * k - 1;
            sum += Math.sin(num * x * paramB) / num;
          }
          y = sum * 2.2;
        } else if (selectedPreset.id === 'exponential') {
          // y = A * e^(k * x)
          y = paramA * Math.exp(paramB * 0.3 * x);
        }

        const sx = toScreenX(x);
        const sy = toScreenY(y);

        if (sx >= 0 && sx <= width && sy >= 0 && sy <= height) {
          if (isFirst) {
            ctx.moveTo(sx, sy);
            isFirst = false;
          } else {
            ctx.lineTo(sx, sy);
          }
        }
      }
      ctx.stroke();
    } else if (selectedPreset.presetType === 'polar' || selectedPreset.presetType === 'spiral') {
      // Polar Coordinates calculations
      let isFirst = true;
      const maxTheta = selectedPreset.id === 'spiral' ? 6 * Math.PI : 2 * Math.PI;
      const step = maxTheta / pointsCount;

      for (let theta = 0; theta <= maxTheta; theta += step) {
        let r = 0;

        if (selectedPreset.id === 'polar-heart') {
          // r = a * (1 - sin(th))
          r = paramA * (1 - Math.sin(theta));
        } else if (selectedPreset.id === 'spiral') {
          // r = a * theta
          r = paramA * theta;
        }

        // Convert Polar to Cartesian
        const x = r * Math.cos(theta);
        const y = r * Math.sin(theta);

        const sx = toScreenX(x);
        const sy = toScreenY(y);

        if (sx >= 0 && sx <= width && sy >= 0 && sy <= height) {
          if (isFirst) {
            ctx.moveTo(sx, sy);
            isFirst = false;
          } else {
            ctx.lineTo(sx, sy);
          }
        }
      }
      ctx.stroke();
    }

    // Tangent slope / derivative visual line
    if (showTangent && hoveredCoords && selectedPreset.presetType === '2D') {
      const hX = hoveredCoords.x;
      let hY = 0;
      let dy_dx = 0; // derivative at hX

      if (selectedPreset.id === 'sin') {
        hY = paramA * Math.sin(paramB * hX + paramC);
        dy_dx = paramA * paramB * Math.cos(paramB * hX + paramC);
      } else if (selectedPreset.id === 'fourier') {
        let sum = 0;
        let dSum = 0;
        const harmonics = Math.max(1, Math.floor(paramA));
        for (let k = 1; k <= harmonics; k++) {
          const num = 2 * k - 1;
          sum += Math.sin(num * hX * paramB) / num;
          dSum += Math.cos(num * hX * paramB) * paramB;
        }
        hY = sum * 2.2;
        dy_dx = dSum * 2.2;
      } else if (selectedPreset.id === 'exponential') {
        hY = paramA * Math.exp(paramB * 0.3 * hX);
        dy_dx = paramA * (paramB * 0.3) * Math.exp(paramB * 0.3 * hX);
      }

      const pointScreenX = toScreenX(hX);
      const pointScreenY = toScreenY(hY);

      // Draw point of tangency
      ctx.beginPath();
      ctx.arc(pointScreenX, pointScreenY, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#ef4444';
      ctx.fill();

      // Tangent line formula: y - y1 = m(x - x1) -> y = m(x - hX) + hY
      ctx.strokeStyle = '#ef4444bb';
      ctx.lineWidth = 1.8;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();

      const tangentLength = 2.0;
      const xStart = hX - tangentLength;
      const xEnd = hX + tangentLength;

      ctx.moveTo(toScreenX(xStart), toScreenY(dy_dx * (xStart - hX) + hY));
      ctx.lineTo(toScreenX(xEnd), toScreenY(dy_dx * (xEnd - hX) + hY));
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw derivative text HUD
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 9px monospace';
      ctx.fillText(`dy/dx = ${dy_dx.toFixed(2)}`, pointScreenX + 10, pointScreenY - 10);
    }
  }, [selectedPreset, paramA, paramB, paramC, zoomLevel, showAxes, showGrid, showTangent, hoveredCoords, minX, maxX, minY, maxY]);

  // Handle canvas mouse movements
  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const px = event.clientX - rect.left;
    const py = event.clientY - rect.top;

    // Convert pixel back to mathematical values
    const mapFractionX = px / canvas.width;
    const mathX = minX + mapFractionX * (maxX - minX);

    // Compute Y value based on preset
    let mathY = 0;
    if (selectedPreset.id === 'sin') {
      mathY = paramA * Math.sin(paramB * mathX + paramC);
    } else if (selectedPreset.id === 'fourier') {
      let sum = 0;
      const harmonics = Math.max(1, Math.floor(paramA));
      for (let k = 1; k <= harmonics; k++) {
        const num = 2 * k - 1;
        sum += Math.sin(num * mathX * paramB) / num;
      }
      mathY = sum * 2.2;
    } else if (selectedPreset.id === 'exponential') {
      mathY = paramA * Math.exp(paramB * 0.3 * mathX);
    } else {
      // Polar coordinates
      setHoveredCoords({ x: mathX, y: 0 });
      return;
    }

    setHoveredCoords({ x: mathX, y: mathY });
  };

  const handleMouseLeave = () => {
    setHoveredCoords(null);
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row h-full w-full min-h-0 text-[var(--theme-primary)]">
      {/* LEFT COLUMN: Controls & Presets */}
      <AnimatePresence initial={false}>
        {isSidebarOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="w-full md:w-80 border-b md:border-b-0 md:border-r border-[var(--theme-border)] p-4 flex flex-col gap-4 overflow-hidden shrink-0 bg-[var(--theme-surface)] h-full"
          >
            <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-4 w-[288px]">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <Compass size={16} className="text-blue-500" />
            <h3 className="font-bold text-sm tracking-tight">Mathematical Functions</h3>
          </div>
          <p className="text-xs text-[var(--theme-secondary)]">Explore algebraic, polar, and Fourier transformations dynamically:</p>
        </div>

        {/* Preset Selectors */}
        <div className="space-y-1">
          <span className="text-[10px] uppercase tracking-wider font-bold text-[var(--theme-secondary)] font-mono block mb-1.5">Function Preset</span>
          <div className="space-y-1">
            {MATH_PRESETS.map(preset => (
              <button
                key={preset.id}
                type="button"
                onClick={() => setSelectedPreset(preset)}
                className={`w-full p-2.5 rounded-xl text-left text-xs font-semibold flex items-center justify-between border cursor-pointer transition-all ${
                  selectedPreset.id === preset.id
                    ? 'bg-blue-500/10 border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'bg-[var(--theme-surface)] border-[var(--theme-border)] text-[var(--theme-secondary)] hover:bg-[var(--theme-hover-bg)]'
                }`}
              >
                <div className="truncate pr-1">
                  <span className="block truncate font-bold">{preset.name}</span>
                  <span className="text-[9px] font-mono opacity-80">{preset.equation}</span>
                </div>
                {selectedPreset.id === preset.id && <Check size={12} className="shrink-0" />}
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Parameter Sliders */}
        <div className="border-t border-[var(--theme-border)] pt-4 space-y-4">
          <span className="text-[10px] uppercase tracking-wider font-bold text-[var(--theme-secondary)] font-mono block">Function Parameters</span>

          {/* Slider A */}
          <div>
            <div className="flex items-center justify-between text-xs font-bold font-mono tracking-tight mb-1">
              <span>Amplitude / Coefficient (a)</span>
              <span className="text-blue-500">{paramA.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="5"
              step="0.1"
              value={paramA}
              onChange={e => setParamA(Number(e.target.value))}
              className="w-full h-1.5 rounded-lg bg-[var(--theme-border)] appearance-none cursor-pointer accent-blue-500"
            />
          </div>

          {/* Slider B */}
          <div>
            <div className="flex items-center justify-between text-xs font-bold font-mono tracking-tight mb-1">
              <span>Frequency / Parameter (b)</span>
              <span className="text-blue-500">{paramB.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="4"
              step="0.1"
              value={paramB}
              onChange={e => setParamB(Number(e.target.value))}
              className="w-full h-1.5 rounded-lg bg-[var(--theme-border)] appearance-none cursor-pointer accent-blue-500"
            />
          </div>

          {/* Slider C - only relevant for sine wave */}
          {selectedPreset.id === 'sin' && (
            <div>
              <div className="flex items-center justify-between text-xs font-bold font-mono tracking-tight mb-1">
                <span>Phase Shift (c)</span>
                <span className="text-blue-500">{paramC.toFixed(2)} rad</span>
              </div>
              <input
                type="range"
                min="-3.14"
                max="3.14"
                step="0.1"
                value={paramC}
                onChange={e => setParamC(Number(e.target.value))}
                className="w-full h-1.5 rounded-lg bg-[var(--theme-border)] appearance-none cursor-pointer accent-blue-500"
              />
            </div>
          )}
        </div>

        {/* View toggles */}
        <div className="border-t border-[var(--theme-border)] pt-4 space-y-2.5">
          <span className="text-[10px] uppercase tracking-wider font-bold text-[var(--theme-secondary)] font-mono block">Render Accessories</span>
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-xs font-medium cursor-pointer text-[var(--theme-secondary)] hover:text-[var(--theme-primary)]">
              <input
                type="checkbox"
                checked={showAxes}
                onChange={e => setShowAxes(e.target.checked)}
                className="rounded border-[var(--theme-border)] text-blue-500 accent-blue-500"
              />
              Show Grid Axes
            </label>

            <label className="flex items-center gap-2 text-xs font-medium cursor-pointer text-[var(--theme-secondary)] hover:text-[var(--theme-primary)]">
              <input
                type="checkbox"
                checked={showGrid}
                onChange={e => setShowGrid(e.target.checked)}
                className="rounded border-[var(--theme-border)] text-blue-500 accent-blue-500"
              />
              Show Grid Lines
            </label>

            {selectedPreset.presetType === '2D' && (
              <label className="flex items-center gap-2 text-xs font-medium cursor-pointer text-[var(--theme-secondary)] hover:text-[var(--theme-primary)]">
                <input
                  type="checkbox"
                  checked={showTangent}
                  onChange={e => setShowTangent(e.target.checked)}
                  className="rounded border-[var(--theme-border)] text-blue-500 accent-blue-500"
                />
                Show Tangent & Instant derivative
              </label>
            )}
          </div>
        </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CENTER COLUMN: Interactive Graphical Coordinate Canvas */}
      <div className="flex-1 flex flex-col min-h-0 bg-[var(--theme-surface-alt)] relative">
        {/* Canvas Header */}
        <div className="px-4 py-3 border-b border-[var(--theme-border)] flex flex-wrap items-center justify-between gap-3 bg-[var(--theme-surface)]">
          <div className="flex items-center gap-2">
            {/* COLLAPSIBLE SIDEBAR TOGGLER BUTTON */}
            <button
              onClick={() => setIsSidebarOpen(prev => !prev)}
              className={`p-1.5 rounded-xl border flex items-center justify-center transition-all cursor-pointer h-8 px-2.5 gap-1.5 text-xs font-bold leading-none ${
                isSidebarOpen
                  ? 'bg-[var(--theme-surface-alt)] border-[var(--theme-accent)] text-[var(--theme-accent)]'
                  : 'bg-[var(--theme-surface)] border-[var(--theme-border)] text-[var(--theme-primary)] hover:bg-[var(--theme-hover-bg)]'
              }`}
              title={isSidebarOpen ? 'Collapse panel' : 'Expand panel'}
            >
              <Sliders size={12} />
              <span className="hidden sm:inline">{isSidebarOpen ? 'Hide' : 'Controls'}</span>
            </button>
            <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-xs font-bold uppercase font-mono tracking-wider">Analytical Mathematical Plotter</span>
          </div>

          <div className="flex items-center gap-2">
            {/* QUICK OPTIONS OF CURRENT PANEL IN THE HEADER */}
            <div className="hidden lg:flex items-center gap-1.5 border-r border-[var(--theme-border)] pr-2 select-none h-8 mr-1">
              <select
                value={selectedPreset.id}
                onChange={(e) => {
                  const matched = MATH_PRESETS.find(p => p.id === e.target.value);
                  if (matched) setSelectedPreset(matched);
                }}
                className="bg-[var(--theme-surface)] text-[var(--theme-primary)] border border-[var(--theme-border)] hover:bg-[var(--theme-hover-bg)] text-[11px] py-1 px-2 rounded-lg font-bold cursor-pointer outline-none focus:ring-1 focus:ring-[var(--theme-accent)] transition-all max-w-[155px] truncate"
              >
                {MATH_PRESETS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>

              <button
                type="button"
                onClick={() => setShowAxes(prev => !prev)}
                className={`h-7 px-2.5 rounded-lg text-[10px] uppercase tracking-wider font-extrabold border transition-all cursor-pointer ${
                  showAxes
                    ? 'bg-blue-500/15 border-blue-500/40 text-blue-600 dark:text-blue-400'
                    : 'bg-[var(--theme-surface)] border-[var(--theme-border)] text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                Axes
              </button>

              <button
                type="button"
                onClick={() => setShowGrid(prev => !prev)}
                className={`h-7 px-2.5 rounded-lg text-[10px] uppercase tracking-wider font-extrabold border transition-all cursor-pointer ${
                  showGrid
                    ? 'bg-blue-500/15 border-blue-500/40 text-blue-600 dark:text-blue-400'
                    : 'bg-[var(--theme-surface)] border-[var(--theme-border)] text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                Grid
              </button>

              {selectedPreset.presetType === '2D' && (
                <button
                  type="button"
                  onClick={() => setShowTangent(prev => !prev)}
                  className={`h-7 px-2.5 rounded-lg text-[10px] uppercase tracking-wider font-extrabold border transition-all cursor-pointer ${
                    showTangent
                      ? 'bg-blue-500/15 border-blue-500/40 text-blue-600 dark:text-blue-400'
                      : 'bg-[var(--theme-surface)] border-[var(--theme-border)] text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                  }`}
                >
                  Tangent
                </button>
              )}
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center bg-[var(--theme-surface-alt)] border border-[var(--theme-border)] rounded-xl overflow-hidden h-8">
              <button
                type="button"
                onClick={() => setZoomLevel(prev => Math.max(0.25, Number((prev - 0.25).toFixed(2))))}
                className="h-full px-3 text-[var(--theme-secondary)] hover:text-[var(--theme-primary)] hover:bg-[var(--theme-hover-bg)] border-r border-[var(--theme-border)] transition-all cursor-pointer flex items-center justify-center font-bold text-sm"
                title="Zoom Out (-)"
              >
                <ZoomOut size={12} className="mr-0.5" />
                <span>-</span>
              </button>
              <div className="px-2.5 font-mono text-[10px] text-[var(--theme-secondary)] select-none font-bold min-w-[48px] text-center">
                {Math.round(zoomLevel * 100)}%
              </div>
              <button
                type="button"
                onClick={() => setZoomLevel(prev => Math.min(4.0, Number((prev + 0.25).toFixed(2))))}
                className="h-full px-3 text-[var(--theme-secondary)] hover:text-[var(--theme-primary)] hover:bg-[var(--theme-hover-bg)] border-l border-[var(--theme-border)] transition-all cursor-pointer flex items-center justify-center font-bold text-sm"
                title="Zoom In (+)"
              >
                <ZoomIn size={12} className="mr-0.5" />
                <span>+</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setParamA(2.0);
                setParamB(1.5);
                setParamC(0.0);
                setZoomLevel(1.0);
              }}
              className="h-8 px-3 text-xs bg-[var(--theme-surface)] border border-[var(--theme-border)] text-[var(--theme-secondary)] hover:text-blue-500 rounded-xl transition-all flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw size={13} />
              Reset Plot
            </button>

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 bg-[var(--theme-surface-alt)] border border-[var(--theme-border)] text-[var(--theme-secondary)] hover:text-red-500 rounded-xl transition-colors cursor-pointer h-8 w-8 flex items-center justify-center hover:bg-red-500/10 hover:border-red-500"
                title="Exit Laboratory"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Dynamic Function Equation Header HUD */}
        <div className="bg-[var(--theme-surface)] border-b border-[var(--theme-border)]/50 px-4 py-2 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-[var(--theme-secondary)] font-medium">Evaluation Model:</span>
            <span className="font-mono font-bold text-blue-500">{selectedPreset.formulaLabel}</span>
          </div>

          {hoveredCoords && (
            <div className="text-[10px] font-mono font-bold bg-[var(--theme-surface-alt)] px-2 py-0.5 rounded border border-[var(--theme-border)] text-blue-500">
              X: {hoveredCoords.x.toFixed(3)} , Y: {hoveredCoords.y.toFixed(3)}
            </div>
          )}
        </div>

        {/* Live Vector Graphical Grid Plot */}
        <div className="flex-1 min-h-0 flex items-center justify-center p-4 relative">
          <canvas
            ref={canvasRef}
            width={480}
            height={360}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className="w-full max-w-[480px] h-[360px] border border-transparent rounded-2xl cursor-crosshair"
          />

          {/* Polar or Spiral helper HUD info box */}
          {(selectedPreset.presetType === 'polar' || selectedPreset.presetType === 'spiral') && (
            <div className="absolute bottom-4 left-4 right-4 bg-[var(--theme-surface)]/85 backdrop-blur-md border border-[var(--theme-border)] rounded-xl p-3 text-[10px] text-[var(--theme-secondary)] text-center">
              This represents a <strong>{selectedPreset.presetType} coordinate function</strong> graphed symmetrically as a function of theta angle θ from 0 to {selectedPreset.id === 'spiral' ? '6π' : '2π'}.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
