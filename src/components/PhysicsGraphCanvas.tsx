import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTheme } from '../themes';
import { 
  X, 
  Play, 
  Pause, 
  RotateCcw, 
  Download, 
  Sliders, 
  Layers, 
  Sparkles,
  HelpCircle,
  Eye,
  Settings,
  Grid,
  Maximize2,
  TrendingUp,
  Volume2,
  Activity,
  PenTool,
  Plus,
  RefreshCw,
  Trash2,
  Bookmark,
  ChevronDown,
  ChevronRight,
  MoreVertical,
  ZoomIn,
  ZoomOut
} from 'lucide-react';

// Define the shape of physics presets
interface PhysicsPreset {
  id: string;
  name: string;
  description: string;
  xAxisLabel: string;
  yAxisLabel: string;
  defaultXRange: [number, number];
  defaultYRange: [number, number];
  sliders: Array<{
    key: string;
    label: string;
    symbol: string;
    min: number;
    max: number;
    step: number;
    defaultValue: number;
    unit: string;
  }>;
  formulaDisplay: string;
  // Function to calculate Y given X and active slider parameters
  calculate: (x: number, params: Record<string, number>) => number;
  // Function to calculate tangent slope at a point
  calculateSlope?: (x: number, params: Record<string, number>) => number;
  // Custom graphics overlay (e.g., launching vectors, components, particle simulations)
  renderOverlay?: (
    ctx: {
      getX: (v: number) => number;
      getY: (v: number) => number;
      params: Record<string, number>;
      activeX: number;
      activeY: number;
    }
  ) => React.ReactNode;
}

// Full suite of precision physics presets
const PHYSICS_PRESETS: PhysicsPreset[] = [
  {
    id: 'uniform-motion',
    name: 'Uniform Direct Motion',
    description: 'Constant velocity linear displacement. Graphing position (s) vs time (t).',
    xAxisLabel: 'Time t (s)',
    yAxisLabel: 'Displacement s (m)',
    defaultXRange: [0, 10],
    defaultYRange: [0, 100],
    formulaDisplay: 's(t) = v · t + s₀',
    sliders: [
      { key: 'v', label: 'Velocity', symbol: 'v', min: -10, max: 20, step: 0.5, defaultValue: 8, unit: 'm/s' },
      { key: 's0', label: 'Initial Position', symbol: 's₀', min: -20, max: 50, step: 1, defaultValue: 10, unit: 'm' }
    ],
    calculate: (t, p) => p.v * t + p.s0,
    calculateSlope: (_, p) => p.v,
    renderOverlay: ({ getX, getY, params, activeX, activeY }) => {
      const v = params.v || 0;
      return (
        <g>
          {/* Vector velocity indicator arrow at active hover bubble */}
          <line
            x1={getX(activeX)}
            y1={getY(activeY)}
            x2={getX(activeX) + (v * 4)}
            y2={getY(activeY)}
            stroke="#10b981"
            strokeWidth={3}
            markerEnd="url(#arrow-green)"
          />
          <text 
            x={getX(activeX) + (v * 4) + 6} 
            y={getY(activeY) + 4} 
            className="fill-emerald-500 font-bold font-mono text-[10px]"
          >
            v⃗ = {v} m/s
          </text>
        </g>
      );
    }
  },
  {
    id: 'accelerated-motion',
    name: 'Uniformly Accelerated Motion',
    description: 'Constant acceleration quadratic displacement graph. Position (s) vs time (t).',
    xAxisLabel: 'Time t (s)',
    yAxisLabel: 'Position s (m)',
    defaultXRange: [0, 10],
    defaultYRange: [0, 150],
    formulaDisplay: 's(t) = ½at² + v₀t + s₀',
    sliders: [
      { key: 'a', label: 'Acceleration', symbol: 'a', min: -5, max: 10, step: 0.2, defaultValue: 2, unit: 'm/s²' },
      { key: 'v0', label: 'Initial Velocity', symbol: 'v₀', min: -10, max: 25, step: 1, defaultValue: 4, unit: 'm/s' },
      { key: 's0', label: 'Initial Position', symbol: 's₀', min: 0, max: 40, step: 1, defaultValue: 10, unit: 'm' }
    ],
    calculate: (t, p) => 0.5 * p.a * Math.pow(t, 2) + p.v0 * t + p.s0,
    calculateSlope: (t, p) => p.a * t + p.v0,
    renderOverlay: ({ getX, getY, params, activeX, activeY }) => {
      // Show tangential slope rate acceleration text
      const velocityNow = (params.a * activeX + params.v0);
      return (
        <g>
          <line
            x1={getX(activeX)}
            y1={getY(activeY)}
            x2={getX(activeX)}
            y2={getY(activeY) - (velocityNow * 2)}
            stroke="#ec4899"
            strokeWidth={2}
            markerEnd="url(#arrow-pink)"
          />
          <text 
            x={getX(activeX) + 6} 
            y={getY(activeY) - (velocityNow * 2) - 4} 
            className="fill-pink-500 font-bold font-mono text-[10px]"
          >
            v_inst = {velocityNow.toFixed(2)} m/s
          </text>
        </g>
      );
    }
  },
  {
    id: 'projectile-trajectory',
    name: 'Classic Projectile Path',
    description: 'Gravitational parabolic trajectory curve. Height (y) vs horizontal distance (x).',
    xAxisLabel: 'Range x (m)',
    yAxisLabel: 'Height y (m)',
    defaultXRange: [0, 100],
    defaultYRange: [0, 60],
    formulaDisplay: 'y(x) = x·tan(θ) - [g·x² / (2v₀²·cos²(θ))]',
    sliders: [
      { key: 'v0', label: 'Launch Speed', symbol: 'v₀', min: 10, max: 40, step: 1, defaultValue: 25, unit: 'm/s' },
      { key: 'theta', label: 'Launch Angle', symbol: 'θ', min: 10, max: 85, step: 1, defaultValue: 45, unit: '°' },
      { key: 'g', label: 'Gravity Acceleration', symbol: 'g', min: 2, max: 25, step: 0.1, defaultValue: 9.81, unit: 'm/s²' }
    ],
    calculate: (x, p) => {
      const rad = (p.theta * Math.PI) / 180;
      const term1 = x * Math.tan(rad);
      const term2 = (p.g * x * x) / (2 * p.v0 * p.v0 * Math.pow(Math.cos(rad), 2));
      const val = term1 - term2;
      return Math.max(0, val);
    },
    calculateSlope: (x, p) => {
      const rad = (p.theta * Math.PI) / 180;
      const term1 = Math.tan(rad);
      const term2 = (p.g * x) / (p.v0 * p.v0 * Math.pow(Math.cos(rad), 2));
      return term1 - term2;
    },
    renderOverlay: ({ getX, getY, params, activeX, activeY }) => {
      const rad = (params.theta * Math.PI) / 180;
      const x0Line = getX(0);
      const y0Line = getY(0);
      return (
        <g>
          {/* Angled launch vector guide at origin */}
          <line
            x1={x0Line}
            y1={y0Line}
            x2={x0Line + Math.cos(rad) * 60}
            y2={y0Line - Math.sin(rad) * 60}
            stroke="#f59e0b"
            strokeWidth={2}
            strokeDasharray="3 3 M0 0"
            markerEnd="url(#arrow-amber)"
          />
          <text 
            x={x0Line + Math.cos(rad) * 60 + 5} 
            y={y0Line - Math.sin(rad) * 60 - 5}
            className="fill-amber-500 font-mono text-[10px] font-semibold"
          >
            θ = {params.theta}°
          </text>
        </g>
      );
    }
  },
  {
    id: 'damped-oscillation',
    name: 'Harmonic Damped Oscillator',
    description: 'Perfect sinusoidal decay curve of shock absorbers. Position (y) vs time (t).',
    xAxisLabel: 'Time t (s)',
    yAxisLabel: 'Position x (m)',
    defaultXRange: [0, 8],
    defaultYRange: [-15, 15],
    formulaDisplay: 'x(t) = A · e^(-γt) · cos(ωt)',
    sliders: [
      { key: 'A', label: 'Amplitude', symbol: 'A', min: 2, max: 15, step: 0.5, defaultValue: 12, unit: 'm' },
      { key: 'gamma', label: 'Damping Factor', symbol: 'γ', min: 0, max: 1.5, step: 0.05, defaultValue: 0.4, unit: 'kg/s' },
      { key: 'omega', label: 'Angular Speed', symbol: 'ω', min: 1, max: 8, step: 0.2, defaultValue: 4, unit: 'rad/s' }
    ],
    calculate: (t, p) => p.A * Math.exp(-p.gamma * t) * Math.cos(p.omega * t),
    renderOverlay: ({ getX, getY, params }) => {
      // Draw smooth exponential decay envelope (dashed outline bounds)
      const tSamples = Array.from({ length: 150 }, (_, i) => (i / 149) * 8);
      const envelopeUpper = tSamples.map(t => `${getX(t)},${getY(params.A * Math.exp(-params.gamma * t))}`).join(' ');
      const envelopeLower = tSamples.map(t => `${getX(t)},${getY(-params.A * Math.exp(-params.gamma * t))}`).join(' ');
      return (
        <g opacity={0.35}>
          <polyline points={envelopeUpper} fill="none" stroke="#ec4899" strokeWidth={1} strokeDasharray="3 3" />
          <polyline points={envelopeLower} fill="none" stroke="#ec4899" strokeWidth={1} strokeDasharray="3 3" />
        </g>
      );
    }
  },
  {
    id: 'rc-circuit',
    name: 'Capacitor Charge / Discharge',
    description: 'Asymptotic exponential RC decay/charge curve. Voltage (V) vs time (t).',
    xAxisLabel: 'Time t (s)',
    yAxisLabel: 'Voltage V (V)',
    defaultXRange: [0, 6],
    defaultYRange: [0, 12],
    formulaDisplay: 'V(t) = V₀ · (1 - e^(-t / RC))',
    sliders: [
      { key: 'V0', label: 'Battery Source', symbol: 'V₀', min: 3, max: 12, step: 0.5, defaultValue: 10, unit: 'V' },
      { key: 'R', label: 'Resistor Resistance', symbol: 'R', min: 1, max: 15, step: 0.5, defaultValue: 5, unit: 'kΩ' },
      { key: 'C', label: 'Capacitance', symbol: 'C', min: 20, max: 200, step: 10, defaultValue: 100, unit: 'μF' }
    ],
    calculate: (t, p) => {
      const rcSeconds = (p.R * 1000) * (p.C * 1e-6); // R in kOhm = R * 1000, C in uF = C * 1e-6
      return p.V0 * (1 - Math.exp(-t / rcSeconds));
    },
    calculateSlope: (t, p) => {
      const rcSeconds = (p.R * 1000) * (p.C * 1e-6);
      return (p.V0 / rcSeconds) * Math.exp(-t / rcSeconds);
    },
    renderOverlay: ({ getX, getY, params }) => {
      const rcSeconds = (params.R * 1000) * (params.C * 1e-6);
      const charge63Val = params.V0 * 0.632;
      return (
        <g>
          {/* RC Time constant landmark at 63.2% charge */}
          {rcSeconds <= 6 && (
            <>
              <line
                x1={getX(rcSeconds)}
                y1={getY(0)}
                x2={getX(rcSeconds)}
                y2={getY(charge63Val)}
                stroke="#3b82f6"
                strokeWidth={1}
                strokeDasharray="2 2"
              />
              <circle cx={getX(rcSeconds)} cy={getY(charge63Val)} r={4} className="fill-blue-500" />
              <text 
                x={getX(rcSeconds) + 5} 
                y={getY(charge63Val) - 6} 
                className="fill-blue-500 font-mono text-[9px] font-semibold"
              >
                τ = RC ({rcSeconds.toFixed(3)}s, 63%)
              </text>
            </>
          )}
        </g>
      );
    }
  },
  {
    id: 'sine-wave',
    name: 'Progressive Wave Envelope',
    description: 'Perfect sinusoidal progressive mechanical wave displacement. Amplitude (y) vs x.',
    xAxisLabel: 'Position x (m)',
    yAxisLabel: 'Amplitude y (cm)',
    defaultXRange: [0, 20],
    defaultYRange: [-10, 10],
    formulaDisplay: 'y(x) = A · sin(k·x + φ)',
    sliders: [
      { key: 'A', label: 'Max Amplitude', symbol: 'A', min: 1, max: 10, step: 0.5, defaultValue: 6, unit: 'cm' },
      { key: 'wavelength', label: 'Wavelength', symbol: 'λ', min: 2, max: 15, step: 0.5, defaultValue: 10, unit: 'm' },
      { key: 'phi', label: 'Phase Angle', symbol: 'φ', min: 0, max: 360, step: 10, defaultValue: 0, unit: '°' }
    ],
    calculate: (x, p) => {
      const k = (2 * Math.PI) / p.wavelength;
      const phiRad = (p.phi * Math.PI) / 180;
      return p.A * Math.sin(k * x + phiRad);
    }
  }
];

// Interface for 3D Preset configuration
interface Physics3DPreset {
  id: string;
  name: string;
  description: string;
  formulaDisplay: string;
  sliders: Array<{
    key: string;
    label: string;
    symbol: string;
    min: number;
    max: number;
    step: number;
    defaultValue: number;
    unit: string;
  }>;
}

const PHYSICS_3D_PRESETS: Physics3DPreset[] = [
  {
    id: 'lorenz-attractor',
    name: 'Lorenz Chaotic Attractor',
    description: 'Charming atmospheric atmospheric convection model. Features double-wing orbits.',
    formulaDisplay: 'dx/dt = σ(y - x) | dy/dt = x(ρ - z) - y | dz/dt = xy - βz',
    sliders: [
      { key: 'sigma', label: 'Prandtl Number', symbol: 'σ', min: 1, max: 20, step: 0.5, defaultValue: 10, unit: '' },
      { key: 'rho', label: 'Rayleigh Number', symbol: 'ρ', min: 10, max: 40, step: 0.5, defaultValue: 28, unit: '' },
      { key: 'beta', label: 'Ratio Scale', symbol: 'β', min: 1, max: 5, step: 0.1, defaultValue: 2.66, unit: '' }
    ]
  },
  {
    id: 'magnetic-solenoid',
    name: 'Magnetic Solenoid Coil',
    description: 'Beautiful looping spiral of charge winding in a magnetic cylinder field.',
    formulaDisplay: 'r(t) = R·cos(ωt) î + R·sin(ωt) ĵ + s·t k̂',
    sliders: [
      { key: 'radius', label: 'Solenoid Radius', symbol: 'R', min: 0.2, max: 1.5, step: 0.05, defaultValue: 0.8, unit: 'm' },
      { key: 'coils', label: 'Coils Rotations', symbol: 'N', min: 2, max: 12, step: 1, defaultValue: 6, unit: ' turns' },
      { key: 'spacing', label: 'Pitch Spacing', symbol: 's', min: 0.1, max: 0.8, step: 0.05, defaultValue: 0.25, unit: 'm' }
    ]
  },
  {
    id: 'spherical-torus',
    name: 'Spherical Winding Torus',
    description: 'Exquisite helical trajectory wrapping on an electromagnetic torus shield.',
    formulaDisplay: 'x = (R + r·cos(pθ))·cos(qθ) | y = r·sin(pθ)',
    sliders: [
      { key: 'R', label: 'Major Radius', symbol: 'R', min: 0.5, max: 2.0, step: 0.1, defaultValue: 1.2, unit: 'm' },
      { key: 'r', label: 'Minor Ring Radius', symbol: 'r', min: 0.1, max: 0.8, step: 0.05, defaultValue: 0.4, unit: 'm' },
      { key: 'p', label: 'Winding Major Ratio', symbol: 'p', min: 1, max: 18, step: 1, defaultValue: 8, unit: '' },
      { key: 'q', label: 'Winding Minor Ratio', symbol: 'q', min: 1, max: 12, step: 1, defaultValue: 3, unit: '' }
    ]
  }
];

export const PhysicsGraphCanvas: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  isInline?: boolean;
  initialConfig?: string;
}> = ({ isOpen, onClose, isInline = false, initialConfig }) => {
  const { isDark: isDarkTheme, theme } = useTheme();
  const [isOptionsPanelOpen, setIsOptionsPanelOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<PhysicsPreset>(PHYSICS_PRESETS[0]);
  const [sliderVals, setSliderVals] = useState<Record<string, number>>({});
  const [sketchMode, setSketchMode] = useState<boolean>(false); // whiteboard journal mode
  const [interactiveHover, setInteractiveHover] = useState<number | null>(null);
  const [tangentMode, setTangentMode] = useState<boolean>(true); // show instantaneous slope line
  const [animating, setAnimating] = useState<boolean>(false);
  const [animTime, setAnimTime] = useState<number>(0);
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  
  // Custom user formulas state
  const [customRangeX, setCustomRangeX] = useState<[number, number]>([0, 10]);
  const [customRangeY, setCustomRangeY] = useState<[number, number]>([0, 100]);

  // Collapsible state values for workspace sections
  const [isSystemCollapsed, setIsSystemCollapsed] = useState(false);
  const [isParamsCollapsed, setIsParamsCollapsed] = useState(false);
  const [isStylesCollapsed, setIsStylesCollapsed] = useState(false);
  const [isPinsCollapsed, setIsPinsCollapsed] = useState(false);
  const [isAiCollapsed, setIsAiCollapsed] = useState(false);
  const [isCustomParamsCollapsed, setIsCustomParamsCollapsed] = useState(true); // closed by default to save space

  // 3D Graphing engine states
  const [is3DMode, setIs3DMode] = useState(false);
  const [selected3DPreset, setSelected3DPreset] = useState<Physics3DPreset>(PHYSICS_3D_PRESETS[0]);
  const [azimuth, setAzimuth] = useState<number>(45);
  const [elevation, setElevation] = useState<number>(30);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Custom added variables states
  const [customSliders, setCustomSliders] = useState<Array<{
    key: string;
    label: string;
    symbol: string;
    min: number;
    max: number;
    defaultValue: number;
    step: number;
    unit: string;
  }>>([
    { key: 'lambda', label: 'Wavelength Scale', symbol: 'λ', min: 1, max: 20, defaultValue: 5, step: 0.5, unit: 'm' }
  ]);
  const [newSliderLabel, setNewSliderLabel] = useState('');
  const [newSliderSymbol, setNewSliderSymbol] = useState('');
  const [newSliderMin, setNewSliderMin] = useState(1);
  const [newSliderMax, setNewSliderMax] = useState(25);
  const [newSliderDefault, setNewSliderDefault] = useState(8);
  const [newSliderStep, setNewSliderStep] = useState(1);
  const [newSliderUnit, setNewSliderUnit] = useState('');

  // AI Assistant States
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResponseText, setAiResponseText] = useState('Laboratory AI ready. Enter instructions or choose a macro command above to orchestrate the formulas.');
  const [sliderTargets, setSliderTargets] = useState<Record<string, number> | null>(null);

  const handleAiCommand = (cmd: string) => {
    const term = cmd.toLowerCase().trim();
    if (!term) return;

    const targets: Record<string, number> = {};
    let responseText = '';

    if (term === 'maximize peaks') {
      responseText = "AI: Optimizing resonance parameters. Raising Amplitude factor and decreasing damping constants to elevate signal peaks to maximum resonance.";
      if (sliderVals['A'] !== undefined) targets['A'] = 45;
      if (sliderVals['b'] !== undefined) targets['b'] = 0.1;
      if (sliderVals['g'] !== undefined) targets['g'] = 9.81;
    } else if (term === 'trigger chaos attractor') {
      responseText = "AI: Configuring Chaos Attractor variables. Maximizing lorenz constant inputs to kickstart unstable trajectory bifurcations.";
      if (sliderVals['sigma'] !== undefined) targets['sigma'] = 10;
      if (sliderVals['rho'] !== undefined) targets['rho'] = 28;
      if (sliderVals['beta'] !== undefined) targets['beta'] = 2.667;
    } else if (term === 'moon landing weak gravity') {
      responseText = "AI: Simulating weak gravity equations. Reducing gravitational constant downwards to establish high-altitude suspension orbits.";
      if (sliderVals['g'] !== undefined) targets['g'] = 1.62;
      if (sliderVals['A'] !== undefined) targets['A'] = 20; 
    } else if (term === 'perfect damping shock absorbers') {
      responseText = "AI: Tuning to perfectly critically-damped or over-damped state. Raising damping factor 'b' to absorb kinetic oscillations instantly.";
      if (sliderVals['b'] !== undefined) targets['b'] = 8.0; 
      if (sliderVals['k'] !== undefined) targets['k'] = 15;
    } else {
      const gravityMatch = term.match(/(?:gravity|gravitational|g)\s*(?:to|at|is|=)?\s*([0-9.]+)/i);
      if (gravityMatch && sliderVals['g'] !== undefined) {
        targets['g'] = Number(gravityMatch[1]);
      }
      const dampingMatch = term.match(/(?:damping|damp|b)\s*(?:to|at|is|=)?\s*([0-9.]+)/i);
      if (dampingMatch && sliderVals['b'] !== undefined) {
        targets['b'] = Number(dampingMatch[1]);
      }
      const ampMatch = term.match(/(?:amplitude|amp|a)\s*(?:to|at|is|=)?\s*([0-9.]+)/i);
      if (ampMatch && sliderVals['A'] !== undefined) {
        targets['A'] = Number(ampMatch[1]);
      }
      currentSlidersList.forEach(s => {
        const keyRegex = new RegExp(`(?:${s.label.toLowerCase()}|\\b${s.key.toLowerCase()}\\b)\\s*(?:to|at|is|=)?\\s*([0-9.]+)`, 'i');
        const match = term.match(keyRegex);
        if (match) {
          const val = Number(match[1]);
          if (val >= s.min && val <= s.max) {
            targets[s.key] = val;
          }
        }
      });

      if (Object.keys(targets).length > 0) {
        const changesDesc = Object.entries(targets).map(([k, v]) => `${k} to ${v}`).join(', ');
        responseText = `AI: Intercepted calibration instructions. Re-targeting parameters: ${changesDesc}. Initiating smooth kinetic sliders glide.`;
      } else {
        responseText = `AI: Analytical report. No matching parameters identified for "${cmd}". Try instructions like "Set gravity to 4.5" or "Set amplitude to 35" to orchestrate the formulas dynamically.`;
      }
    }

    if (Object.keys(targets).length > 0) {
      setSliderTargets(targets);
    }
    setAiResponseText(responseText);
  };

  // Local annotation tracker states
  const [annotations, setAnnotations] = useState<Array<{
    id: string;
    x: number;
    y: number;
    label: string;
    color: string;
    isSnapped: boolean;
  }>>([
    { id: '1', x: 2.5, y: 30, label: 'Resonant Axis', color: '#ef4444', isSnapped: true },
    { id: '2', x: 7.5, y: 70, label: 'Decay Control', color: '#f59e0b', isSnapped: false }
  ]);
  const [newAnnotationCoords, setNewAnnotationCoords] = useState<{ x: number; y: number; px: number; py: number } | null>(null);
  const [newAnnotationText, setNewAnnotationText] = useState<string>('');
  const [newAnnotationColor, setNewAnnotationColor] = useState<string>('#3b82f6');
  const [newAnnotationSnap, setNewAnnotationSnap] = useState<boolean>(true);
  const [showStageMenu, setShowStageMenu] = useState<boolean>(false);

  // Combine default sliders with custom added sliders
  const currentSlidersList = useMemo(() => {
    return is3DMode 
      ? [...selected3DPreset.sliders, ...customSliders] 
      : [...selectedPreset.sliders, ...customSliders];
  }, [is3DMode, selectedPreset, selected3DPreset, customSliders]);

  // Synchronously compute the parameters map so there is no lag or NaN values on preset switch
  const activeParams = useMemo(() => {
    const merged: Record<string, number> = {};
    const currentSliders = is3DMode ? selected3DPreset.sliders : selectedPreset.sliders;
    currentSliders.forEach(slide => {
      merged[slide.key] = slide.defaultValue;
    });
    customSliders.forEach(slide => {
      merged[slide.key] = slide.defaultValue;
    });
    Object.keys(sliderVals).forEach(key => {
      if (sliderVals[key] !== undefined) {
        merged[key] = sliderVals[key];
      }
    });
    return merged;
  }, [is3DMode, selectedPreset, selected3DPreset, customSliders, sliderVals]);

  // Initializing active parameters for the selected preset
  useEffect(() => {
    const defaultParams: Record<string, number> = {};
    
    // Set up standard sliders
    const currentSliders = is3DMode ? selected3DPreset.sliders : selectedPreset.sliders;
    currentSliders.forEach(slide => {
      defaultParams[slide.key] = slide.defaultValue;
    });

    // Set up custom sliders values
    customSliders.forEach(slide => {
      defaultParams[slide.key] = slide.defaultValue;
    });

    setSliderVals(defaultParams);
    setAnimTime(is3DMode ? 0 : selectedPreset.defaultXRange[0]);
    setZoomLevel(1.0); // Reset zoom on preset/mode switch
  }, [is3DMode, selectedPreset, selected3DPreset, customSliders]);

  // Sizing and boundaries
  const width = 640;
  const height = 400;
  const paddingLeft = 60;
  const paddingRight = 30;
  const paddingTop = 40;
  const paddingBottom = 50;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  // Zooming calculations: scale range from current selected preset defaults
  const defaultMinX = selectedPreset.defaultXRange[0];
  const defaultMaxX = selectedPreset.defaultXRange[1];
  const defaultMinY = selectedPreset.defaultYRange[0];
  const defaultMaxY = selectedPreset.defaultYRange[1];

  const midX = (defaultMinX + defaultMaxX) / 2;
  const halfRangeX = (defaultMaxX - defaultMinX) / 2;

  const midY = (defaultMinY + defaultMaxY) / 2;
  const halfRangeY = (defaultMaxY - defaultMinY) / 2;

  const minX = midX - halfRangeX / zoomLevel;
  const maxX = midX + halfRangeX / zoomLevel;
  const minY = midY - halfRangeY / zoomLevel;
  const maxY = midY + halfRangeY / zoomLevel;

  const getRelativeX = (xVal: number) => {
    return paddingLeft + ((xVal - minX) / (maxX - minX)) * chartWidth;
  };

  const getRelativeY = (yVal: number) => {
    return height - paddingBottom - ((yVal - minY) / (maxY - minY)) * chartHeight;
  };

  const getCanvasX = (rawPixelX: number, containerRect: DOMRect) => {
    const fraction = (rawPixelX - paddingLeft) / chartWidth;
    return minX + fraction * (maxX - minX);
  };

  const getCanvasY = (rawPixelY: number) => {
    const fraction = (height - paddingBottom - rawPixelY) / chartHeight;
    return minY + fraction * (maxY - minY);
  };

  // Projected annotations mapped into screen pixels based on current simulation scaling state
  const renderedAnnotations = useMemo(() => {
    return annotations.map(ann => {
      let currentY = ann.y;
      if (ann.isSnapped) {
        try {
          currentY = selectedPreset.calculate(ann.x, activeParams);
        } catch {
          currentY = ann.y;
        }
      }
      return {
        ...ann,
        px: getRelativeX(ann.x),
        py: getRelativeY(currentY),
        currentY
      };
    });
  }, [annotations, selectedPreset, activeParams, minX, maxX, minY, maxY]);

  // Math Curve coordinate samples (smooth high resolution sequence of 300 plotting points)
  const curvePoints = useMemo(() => {
    const seq: Array<{ x: number; y: number; px: number; py: number }> = [];
    const steps = 300;
    for (let i = 0; i <= steps; i++) {
      const xVal = minX + (i / steps) * (maxX - minX);
      try {
        const yVal = selectedPreset.calculate(xVal, activeParams);
        seq.push({
          x: xVal,
          y: yVal,
          px: getRelativeX(xVal),
          py: getRelativeY(yVal)
        });
      } catch (e) {
        // ignore math exceptions for out of boundary inputs
      }
    }
    return seq;
  }, [selectedPreset, activeParams, minX, maxX, minY, maxY]);

  // Handle ticking animation frames for physics trajectory particles
  useEffect(() => {
    let animId: number;
    if (animating) {
      const tick = () => {
        setAnimTime(prev => {
          let next = prev + 0.05 * (maxX - minX) / 5;
          if (next > maxX) {
            next = minX;
          }
          return next;
        });
        animId = requestAnimationFrame(tick);
      };
      animId = requestAnimationFrame(tick);
    }
    return () => cancelAnimationFrame(animId);
  }, [animating, minX, maxX]);

  // Current physics animated state coordinates
  const animatedParticle = useMemo(() => {
    try {
      const py = selectedPreset.calculate(animTime, activeParams);
      return { x: animTime, y: py, px: getRelativeX(animTime), py: getRelativeY(py) };
    } catch {
      return null;
    }
  }, [animTime, selectedPreset, activeParams]);

  // 3D perspective projection formula
  const project3D = React.useCallback((x: number, y: number, z: number) => {
    const theta = (azimuth * Math.PI) / 180;
    const phi = (elevation * Math.PI) / 180;

    // Rotate around Y axis (azimuth)
    const x1 = x * Math.cos(theta) - z * Math.sin(theta);
    const z1 = x * Math.sin(theta) + z * Math.cos(theta);
    const y1 = y;

    // Rotate around X axis (elevation)
    const y2 = y1 * Math.cos(phi) - z1 * Math.sin(phi);
    const z2 = y1 * Math.sin(phi) + z1 * Math.cos(phi);

    const d = 5; // distance of observer
    const scale = 110 * zoomLevel; // rendering scaling bounds scaled by zoomLevel
    const cx = paddingLeft + chartWidth / 2;
    const cy = paddingTop + chartHeight / 2;

    const perspective = d / (d + z2);
    const px = cx + x1 * scale * perspective;
    const py = cy - y2 * scale * perspective;

    return { px, py, z: z2 };
  }, [azimuth, elevation, chartWidth, chartHeight, paddingLeft, paddingTop, zoomLevel]);

  // 3D calculation loop
  const curve3DPoints = useMemo(() => {
    if (!is3DMode) return [];
    const points: Array<{ px: number; py: number; x: number; y: number; z: number }> = [];

    if (selected3DPreset.id === 'lorenz-attractor') {
      let curX = 0.1, curY = 1.0, curZ = 1.0;
      const dt = 0.015;
      const sigma = sliderVals.sigma !== undefined ? sliderVals.sigma : 10;
      const rho = sliderVals.rho !== undefined ? sliderVals.rho : 28;
      const beta = sliderVals.beta !== undefined ? sliderVals.beta : 2.66;
      for (let i = 0; i < 400; i++) {
        const dx = sigma * (curY - curX) * dt;
        const dy = (curX * (rho - curZ) - curY) * dt;
        const dz = (curX * curY - beta * curZ) * dt;
        curX += dx;
        curY += dy;
        curZ += dz;
        // Normalise coordinate sizes to map within [-1.5, 1.5] viewport
        const { px, py } = project3D(curX * 0.05, curY * 0.05, (curZ - 25) * 0.05);
        points.push({ px, py, x: curX, y: curY, z: curZ });
      }
    } else if (selected3DPreset.id === 'magnetic-solenoid') {
      const radius = sliderVals.radius !== undefined ? sliderVals.radius : 0.8;
      const coils = sliderVals.coils !== undefined ? sliderVals.coils : 6;
      const spacing = sliderVals.spacing !== undefined ? sliderVals.spacing : 0.25;
      for (let i = 0; i <= 300; i++) {
        const t = (i / 300) * coils * 2 * Math.PI;
        const x = radius * Math.cos(t);
        const z = radius * Math.sin(t);
        const y = (t / (coils * 2 * Math.PI)) * spacing * coils - (spacing * coils / 2);
        const { px, py } = project3D(x, y, z);
        points.push({ px, py, x, y, z });
      }
    } else if (selected3DPreset.id === 'spherical-torus') {
      const R = sliderVals.R !== undefined ? sliderVals.R : 1.2;
      const r = sliderVals.r !== undefined ? sliderVals.r : 0.4;
      const p = sliderVals.p !== undefined ? sliderVals.p : 8;
      const q = sliderVals.q !== undefined ? sliderVals.q : 3;
      for (let i = 0; i <= 400; i++) {
        const theta = (i / 400) * 2 * Math.PI * q;
        const x = (R + r * Math.cos(p * theta)) * Math.cos(theta) * 0.7;
        const z = (R + r * Math.cos(p * theta)) * Math.sin(theta) * 0.7;
        const y = r * Math.sin(p * theta) * 0.7;
        const { px, py } = project3D(x, y, z);
        points.push({ px, py, x, y, z });
      }
    }
    return points;
  }, [is3DMode, selected3DPreset, sliderVals, project3D]);

  // Animated 3D particle state mapping along trajectory
  const animated3DParticle = useMemo(() => {
    if (!is3DMode || curve3DPoints.length === 0) return null;
    const stepCount = curve3DPoints.length;
    // Map normal ranges with wraps
    const fraction = (animTime - minX) / (maxX - minX || 1);
    const index = Math.min(stepCount - 1, Math.max(0, Math.floor(fraction * stepCount)));
    return curve3DPoints[index];
  }, [is3DMode, curve3DPoints, animTime, minX, maxX]);

  // Smooth sliding mechanism for target parameter setting
  useEffect(() => {
    if (!sliderTargets) return;
    let animId: number;
    const animateSliders = () => {
      let done = true;
      setSliderVals(prev => {
        const next = { ...prev };
        Object.keys(sliderTargets).forEach(key => {
          const target = sliderTargets[key];
          const current = prev[key] !== undefined ? prev[key] : target;
          const diff = target - current;
          if (Math.abs(diff) > 0.05) {
            next[key] = Number((current + diff * 0.18).toFixed(3));
            done = false;
          } else {
            next[key] = target;
          }
        });
        return next;
      });
      if (done) {
        setSliderTargets(null);
      } else {
        animId = requestAnimationFrame(animateSliders);
      }
    };
    animId = requestAnimationFrame(animateSliders);
    return () => cancelAnimationFrame(animId);
  }, [sliderTargets]);

  const activePointsCombined = useMemo(() => {
    if (interactiveHover !== null) {
      const hoverIndex = Math.min(Math.max(0, Math.floor((interactiveHover - minX) / (maxX - minX) * 300)), 300);
      return curvePoints[hoverIndex] || curvePoints[0];
    }
    return null;
  }, [interactiveHover, curvePoints, minX, maxX]);

  // Calculate coordinates for tangent vectors at active hover
  const tangentLinePath = useMemo(() => {
    if (!activePointsCombined || !selectedPreset.calculateSlope) return null;
    const slope = selectedPreset.calculateSlope(activePointsCombined.x, activeParams);
    
    // Line formula: y - y1 = m(x - x1) ==> y = m*(x - activeX) + activeY
    const deltaX = (maxX - minX) * 0.15; // length of tangent line handle
    const xStart = Math.max(minX, activePointsCombined.x - deltaX);
    const xEnd = Math.min(maxX, activePointsCombined.x + deltaX);
    
    const yStart = slope * (xStart - activePointsCombined.x) + activePointsCombined.y;
    const yEnd = slope * (xEnd - activePointsCombined.x) + activePointsCombined.y;

    return {
      x1: getRelativeX(xStart),
      y1: getRelativeY(yStart),
      x2: getRelativeX(xEnd),
      y2: getRelativeY(yEnd)
    };
  }, [activePointsCombined, selectedPreset, activeParams, maxX, minX]);

  // Handlers for dragging / sliding coordinates on graph svg directly or rotating 3D viewport
  const svgRef = useRef<SVGSVGElement>(null);

  const handleSvgMouseDown = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    if (is3DMode) {
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleSvgMouseMove = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    if (is3DMode) {
      if (isDragging) {
        const deltaX = e.clientX - dragStart.x;
        const deltaY = e.clientY - dragStart.y;
        setAzimuth(prev => (prev + deltaX * 1.1) % 360);
        setElevation(prev => Math.min(85, Math.max(-85, prev - deltaY * 1.1)));
        setDragStart({ x: e.clientX, y: e.clientY });
      }
      return;
    }

    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const pixelX = e.clientX - rect.left;
    const plotXVal = getCanvasX(pixelX, rect);
    if (plotXVal >= minX && plotXVal <= maxX) {
      setInteractiveHover(plotXVal);
    } else {
      setInteractiveHover(null);
    }
  };

  const handleSvgMouseUp = () => {
    setIsDragging(false);
  };

  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    if (is3DMode) return; // Clicking doesn't add annotations in 3D mode
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const pixelX = e.clientX - rect.left;
    const pixelY = e.clientY - rect.top;

    // Boundary check for coordinate plotting box
    if (
      pixelX >= paddingLeft &&
      pixelX <= width - paddingRight &&
      pixelY >= paddingTop &&
      pixelY <= height - paddingBottom
    ) {
      const plotX = getCanvasX(pixelX, rect);
      const plotY = getCanvasY(pixelY);

      setNewAnnotationCoords({
        x: plotX,
        y: plotY,
        px: pixelX,
        py: pixelY
      });
      setNewAnnotationText('');
      setNewAnnotationSnap(true);
    }
  };

  const handleExportSVG = () => {
    if (!svgRef.current) return;
    const svgContent = new XMLSerializer().serializeToString(svgRef.current);
    const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `physics_vector_plot_${selectedPreset.id}.svg`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const innerContent = (
    <div className={`text-[var(--theme-primary)] overflow-hidden flex flex-col font-sans ${isInline ? 'w-full h-full border-none rounded-none bg-[var(--theme-bg)]' : 'bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-3xl w-full max-w-5xl shadow-2xl h-[90vh]'}`}>
 
        {/* Dynamic Studio Split Panel Layout */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
          
          {/* SLIDING LEFT PANEL */}
          <AnimatePresence>
            {isOptionsPanelOpen && (
              <>
                {/* Backdrop overlay for focus & quick close - hidden on desktop so it doesn't block interactivity */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.35 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsOptionsPanelOpen(false)}
                  className="absolute inset-0 bg-black/60 z-30 pointer-events-auto md:hidden"
                />
                
                {/* Sliding Card Container wrapping the left controls - push-styled on desktop (md:relative) */}
                <motion.div
                  initial={{ x: '-100%', opacity: 0.95 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: '-100%', opacity: 0.95 }}
                  transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                  className="md:relative absolute left-0 top-0 bottom-0 w-full sm:w-[350px] border-r border-[var(--theme-border)] bg-[var(--theme-surface)] dark:bg-[var(--theme-surface-alt)] backdrop-blur-md overflow-hidden flex flex-col z-40 shadow-2xl h-full shrink-0"
                >
                  <div className="px-5 py-4 border-b border-[var(--theme-border)] flex items-center justify-between shrink-0">
                    <span className="text-xs font-bold uppercase tracking-wider text-[var(--theme-primary)] flex items-center gap-1.5">
                      <Sliders size={14} className="text-[var(--theme-accent)]" />
                      Laboratory Controls
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsOptionsPanelOpen(false)}
                      className="p-1 hover:bg-[var(--theme-hover-bg)] text-[var(--theme-secondary)] hover:text-[var(--theme-primary)] rounded-full transition-colors cursor-pointer"
                      title="Collapse Controls"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-5 pb-8 flex flex-col gap-6 custom-scrollbar bg-[var(--theme-bg)] dark:bg-black/5">
                    {/* Presets Grid Category */}
                    <div className="flex flex-col gap-2.5">
                      <button
                        onClick={() => setIsSystemCollapsed(!isSystemCollapsed)}
                        className="flex items-center justify-between text-[10px] uppercase tracking-wider text-[var(--theme-secondary)] font-bold font-mono py-1 cursor-pointer select-none border-b border-[var(--theme-border)]"
                      >
                        <span className="flex items-center gap-1.5">
                          <Layers size={11} className="text-[var(--theme-secondary)]" />
                          Select Physics System
                        </span>
                        {isSystemCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                      </button>

                      {!isSystemCollapsed && (
                        <div className="flex flex-col gap-2 mt-1">
                          {/* Mode Selector Segmented Control */}
                          <div className="grid grid-cols-2 gap-1 p-1 bg-[var(--theme-surface-alt)] rounded-xl mb-1 text-[10px] font-bold border border-[var(--theme-border)]">
                            <button
                              type="button"
                              onClick={() => {
                                setIs3DMode(false);
                              }}
                              className={`py-1 rounded-lg cursor-pointer transition-all ${
                                !is3DMode 
                                  ? 'bg-[var(--theme-surface)] text-[var(--theme-accent)] shadow-xs border border-[var(--theme-border)]' 
                                  : 'text-[var(--theme-secondary)] hover:text-[var(--theme-primary)]'
                              }`}
                            >
                              2D Classical
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setIs3DMode(true);
                              }}
                              className={`py-1 rounded-lg cursor-pointer transition-all ${
                                is3DMode 
                                  ? 'bg-[var(--theme-surface)] text-purple-450 dark:text-purple-300 shadow-xs border border-[var(--theme-border)]' 
                                  : 'text-[var(--theme-secondary)] hover:text-[var(--theme-primary)]'
                              }`}
                            >
                              3D Perspective
                            </button>
                          </div>

                          {/* Render 2D Presets List */}
                          {!is3DMode && PHYSICS_PRESETS.map((preset) => {
                            const isActive = selectedPreset.id === preset.id;
                            return (
                              <button
                                key={preset.id}
                                type="button"
                                onClick={() => setSelectedPreset(preset)}
                                className={`text-left text-xs px-3.5 py-2.5 rounded-2xl transition-all cursor-pointer flex flex-col gap-0.5 border ${
                                  isActive
                                    ? 'bg-[var(--theme-surface-alt)] border-[var(--theme-accent)] text-[var(--theme-accent)] shadow-xs ring-1 ring-[var(--theme-accent)]'
                                    : 'bg-[var(--theme-surface)] border-[var(--theme-border)] text-[var(--theme-secondary)] hover:border-[var(--theme-primary)] hover:bg-[var(--theme-hover-bg)]'
                                }`}
                              >
                                <span className="font-bold">{preset.name}</span>
                                <span className="text-[10px] opacity-75 text-ellipsis overflow-hidden whitespace-nowrap w-full">
                                  {preset.description}
                                </span>
                              </button>
                            );
                          })}

                          {/* Render 3D Presets List */}
                          {is3DMode && PHYSICS_3D_PRESETS.map((preset) => {
                            const isActive = selected3DPreset.id === preset.id;
                            return (
                              <button
                                key={preset.id}
                                type="button"
                                onClick={() => setSelected3DPreset(preset)}
                                className={`text-left text-xs px-3.5 py-2.5 rounded-2xl transition-all cursor-pointer flex flex-col gap-0.5 border ${
                                  isActive
                                    ? 'bg-purple-500/15 border-purple-500/30 text-purple-400 dark:text-purple-300 shadow-xs ring-1 ring-purple-500/20'
                                    : 'bg-[var(--theme-surface)] border-[var(--theme-border)] text-[var(--theme-secondary)] hover:border-[var(--theme-primary)] hover:bg-[var(--theme-hover-bg)]'
                                }`}
                              >
                                <span className="font-bold">{preset.name}</span>
                                <span className="text-[10px] opacity-75 text-ellipsis overflow-hidden whitespace-nowrap w-full">
                                  {preset.description}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Formula Dashboard Card */}
                    <div className="p-4 bg-[var(--theme-surface-alt)] border border-[var(--theme-border)] rounded-2xl flex flex-col gap-2.5 select-none text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold text-[var(--theme-secondary)] font-mono tracking-wider">Analytical Model</span>
                        <Sparkles size={11} className="text-[var(--theme-accent)]" />
                      </div>
                      <div className="font-mono text-xs text-[var(--theme-accent)] bg-[var(--theme-input-bg)] p-2.5 rounded-xl border border-[var(--theme-input-border)] font-semibold shadow-2xs text-center">
                        {is3DMode ? selected3DPreset.formulaDisplay : selectedPreset.formulaDisplay}
                      </div>
                    </div>

                    {/* AI Laboratory Coprocessor Section */}
                    <div className="flex flex-col gap-2.5">
                      <button
                        type="button"
                        onClick={() => setIsAiCollapsed(!isAiCollapsed)}
                        className="flex items-center justify-between text-[10px] uppercase tracking-wider text-[var(--theme-secondary)] font-bold font-mono py-1 cursor-pointer select-none border-b border-[var(--theme-border)]"
                      >
                        <span className="flex items-center gap-1.5">
                          <Sparkles size={11} className="text-[var(--theme-accent)] animate-pulse" />
                          AI Bench Command
                        </span>
                        {isAiCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                      </button>

                      {!isAiCollapsed && (
                        <div className="flex flex-col gap-2 p-3 bg-[var(--theme-surface-alt)] border border-[var(--theme-border)] rounded-2xl text-xs">
                          {/* Preset Quick Actions */}
                          <div className="flex flex-wrap gap-1">
                            <button
                              type="button"
                              onClick={() => handleAiCommand('maximize peaks')}
                              className="px-2 py-1 bg-[var(--theme-surface-alt)] hover:bg-[var(--theme-hover-bg)] text-[var(--theme-accent)] rounded-lg text-[9px] font-bold cursor-pointer transition-colors border border-[var(--theme-border)] active:scale-95"
                            >
                              ⚡ Max Peaks
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAiCommand('trigger chaos attractor')}
                              className="px-2 py-1 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 dark:text-purple-300 rounded-lg text-[9px] font-bold cursor-pointer transition-colors border border-purple-500/10 active:scale-95"
                            >
                              🌀 Chaos Lorenz
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAiCommand('moon landing weak gravity')}
                              className="px-2 py-1 bg-[var(--theme-surface-alt)] hover:bg-[var(--theme-hover-bg)] text-[var(--theme-accent)] rounded-lg text-[9px] font-bold cursor-pointer transition-colors border border-[var(--theme-border)] active:scale-95"
                            >
                              🌘 Lunar Orbit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAiCommand('perfect damping shock absorbers')}
                              className="px-2 py-1 bg-[var(--theme-surface-alt)] hover:bg-[var(--theme-hover-bg)] text-[var(--theme-accent)] rounded-lg text-[9px] font-bold cursor-pointer transition-colors border border-[var(--theme-border)] active:scale-95"
                            >
                              🛡️ Overdamped
                            </button>
                          </div>

                          {/* Manual AI Control Box */}
                          <div className="flex items-center gap-1.5 mt-1">
                            <input
                              type="text"
                              placeholder="e.g. Set gravity to 4.2..."
                              value={aiPrompt}
                              onChange={e => setAiPrompt(e.target.value)}
                              className="flex-1 bg-[var(--theme-input-bg)] text-[var(--theme-primary)] px-2.5 py-1.5 rounded-xl border border-[var(--theme-input-border)] font-bold placeholder-[var(--theme-secondary)] text-[11px] focus:outline-none focus:ring-1 focus:ring-[var(--theme-accent)]"
                              onKeyDown={e => {
                                if (e.key === 'Enter') {
                                  handleAiCommand(aiPrompt);
                                  setAiPrompt('');
                                }
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                handleAiCommand(aiPrompt);
                                setAiPrompt('');
                              }}
                              className="p-1.5 bg-[var(--theme-accent)] hover:opacity-90 text-[var(--theme-accent-foreground)] font-bold rounded-xl cursor-pointer"
                            >
                              <Sparkles size={11} />
                            </button>
                          </div>

                          {/* AI Speech Area */}
                          <div className="text-[10px] leading-normal p-2.5 bg-[var(--theme-surface)] rounded-xl border border-[var(--theme-border)] text-[var(--theme-secondary)] italic">
                            {aiResponseText}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Custom Parameters Setup Section */}
                    <div className="flex flex-col gap-2.5">
                      <button
                        type="button"
                        onClick={() => setIsCustomParamsCollapsed(!isCustomParamsCollapsed)}
                        className="flex items-center justify-between text-[10px] uppercase tracking-wider text-[var(--theme-secondary)] font-bold font-mono py-1 cursor-pointer select-none border-b border-[var(--theme-border)]"
                      >
                        <span className="flex items-center gap-1.5">
                          <Plus size={11} className="text-emerald-500" />
                          Create Custom Parameter
                        </span>
                        {isCustomParamsCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                      </button>

                      {!isCustomParamsCollapsed && (
                        <div className="bg-[var(--theme-surface-alt)] border border-[var(--theme-border)] p-3 rounded-2xl flex flex-col gap-2.5 text-xs">
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              placeholder="Label e.g. Viscosity"
                              value={newSliderLabel}
                              autoComplete="off"
                              onChange={e => setNewSliderLabel(e.target.value)}
                              className="flex-1 bg-[var(--theme-input-bg)] border border-[var(--theme-input-border)] px-2.5 py-1.5 rounded-xl text-[var(--theme-primary)]"
                            />
                            <input
                              type="text"
                              placeholder="Sym (μ)"
                              value={newSliderSymbol}
                              autoComplete="off"
                              onChange={e => setNewSliderSymbol(e.target.value)}
                              className="w-16 bg-[var(--theme-input-bg)] border border-[var(--theme-input-border)] px-2 py-1.5 rounded-xl text-[var(--theme-primary)] text-center uppercase"
                            />
                          </div>

                          <div className="grid grid-cols-3 gap-1.5 text-[9px] font-bold text-[var(--theme-secondary)] uppercase">
                            <div>
                              <span>Min</span>
                              <input
                                type="number"
                                value={newSliderMin}
                                onChange={e => setNewSliderMin(Number(e.target.value))}
                                className="w-full bg-[var(--theme-input-bg)] border border-[var(--theme-input-border)] px-2 py-1 rounded-xl font-mono text-xs text-[var(--theme-primary)]"
                              />
                            </div>
                            <div>
                              <span>Max</span>
                              <input
                                type="number"
                                value={newSliderMax}
                                onChange={e => setNewSliderMax(Number(e.target.value))}
                                className="w-full bg-[var(--theme-input-bg)] border border-[var(--theme-input-border)] px-2 py-1 rounded-xl font-mono text-xs text-[var(--theme-primary)]"
                              />
                            </div>
                            <div>
                              <span>Default</span>
                              <input
                                type="number"
                                value={newSliderDefault}
                                onChange={e => setNewSliderDefault(Number(e.target.value))}
                                className="w-full bg-[var(--theme-input-bg)] border border-[var(--theme-input-border)] px-2 py-1 rounded-xl font-mono text-xs text-[var(--theme-primary)]"
                              />
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              placeholder="Unit (e.g. kg/s)"
                              value={newSliderUnit}
                              autoComplete="off"
                              onChange={e => setNewSliderUnit(e.target.value)}
                              className="flex-1 bg-[var(--theme-input-bg)] border border-[var(--theme-input-border)] px-2.5 py-1.5 rounded-xl text-[var(--theme-primary)]"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (!newSliderLabel.trim()) return;
                                const key = `custom_${Date.now()}`;
                                setCustomSliders(prev => [
                                  ...prev,
                                  {
                                    key,
                                    label: newSliderLabel,
                                    symbol: newSliderSymbol || 'c',
                                    min: newSliderMin,
                                    max: newSliderMax,
                                    defaultValue: newSliderDefault,
                                    step: Number(((newSliderMax - newSliderMin) / 20).toFixed(2)) || 0.5,
                                    unit: newSliderUnit
                                  }
                                ]);
                                setNewSliderLabel('');
                                setNewSliderSymbol('');
                                setNewSliderMin(1);
                                setNewSliderMax(25);
                                setNewSliderDefault(8);
                                setNewSliderUnit('');
                              }}
                              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-750 text-white font-bold text-[10px] uppercase tracking-wider rounded-xl cursor-pointer"
                            >
                              Register
                            </button>
                          </div>

                          {customSliders.length > 0 && (
                            <div className="flex flex-col gap-1 inline-block py-1">
                              <span className="text-[9px] uppercase text-[var(--theme-secondary)] font-bold block mb-1">Active Custom Variables</span>
                              {customSliders.map(cs => (
                                <div key={cs.key} className="flex items-center justify-between text-[10px] bg-[var(--theme-surface)] p-2 rounded-xl border border-[var(--theme-border)]">
                                  <span className="font-semibold text-[var(--theme-primary)]">{cs.label} ({cs.symbol})</span>
                                  <button
                                    type="button"
                                    onClick={() => setCustomSliders(prev => prev.filter(item => item.key !== cs.key))}
                                    className="text-red-500 hover:underline font-bold text-[9px] uppercase cursor-pointer"
                                  >
                                    delete
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Physics Slider Adjusters */}
                    <div className="flex flex-col gap-3.5">
                      <button
                        type="button"
                        onClick={() => setIsParamsCollapsed(!isParamsCollapsed)}
                        className="flex items-center justify-between text-[10px] uppercase tracking-wider text-[var(--theme-secondary)] font-bold font-mono py-1 cursor-pointer select-none border-b border-[var(--theme-border)]"
                      >
                        <span className="flex items-center gap-1.5">
                          <Sliders size={11} className="text-[var(--theme-secondary)]" />
                          Adjust Parameters
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const resetVals: Record<string, number> = {};
                              const targetSliders = is3DMode ? selected3DPreset.sliders : selectedPreset.sliders;
                              targetSliders.forEach(s => resetVals[s.key] = s.defaultValue);
                              customSliders.forEach(s => resetVals[s.key] = s.defaultValue);
                              setSliderVals(resetVals);
                              setAnimTime(is3DMode ? 0 : selectedPreset.defaultXRange[0]);
                            }}
                            className="text-[9px] uppercase font-bold tracking-wider text-[var(--theme-accent)] hover:underline flex items-center gap-1 cursor-pointer"
                            title="Reset sliders to defaults"
                          >
                            <RotateCcw size={10} />
                            Reset
                          </button>
                          {isParamsCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                        </div>
                      </button>

                      <AnimatePresence initial={false}>
                        {!isParamsCollapsed && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.23, ease: 'easeInOut' }}
                            className="overflow-hidden"
                          >
                            <div className="flex flex-col gap-3 mt-1 pt-1">
                              {currentSlidersList.map((s) => {
                                const val = sliderVals[s.key] !== undefined ? sliderVals[s.key] : s.defaultValue;
                                return (
                                  <div key={s.key} className="flex flex-col gap-1.5 bg-[var(--theme-surface)] border border-[var(--theme-border)] p-3 rounded-2xl relative">
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs text-[var(--theme-primary)] font-bold flex items-center gap-1 leading-none">
                                        {s.label}
                                        <span className="text-[10px] font-mono text-[var(--theme-secondary)] font-normal">({s.symbol})</span>
                                      </span>
                                      <span className="text-xs font-mono font-bold text-[var(--theme-primary)] bg-[var(--theme-surface-alt)] px-2 py-0.5 rounded-lg border border-[var(--theme-border)] leading-none">
                                        {val} {s.unit}
                                      </span>
                                    </div>
                                    <input
                                      type="range"
                                      min={s.min}
                                      max={s.max}
                                      step={s.step}
                                      value={val}
                                      onChange={(e) => {
                                        setSliderVals(prev => ({
                                          ...prev,
                                          [s.key]: Number(e.target.value)
                                        }));
                                      }}
                                      className="w-full h-1 bg-[var(--theme-border)] rounded-lg appearance-none cursor-ew-resize accent-[var(--theme-accent)] focus:outline-none"
                                    />
                                  </div>
                                );
                              })}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Layout Customizer Toggles */}
                    <div className="flex flex-col gap-2.5">
                      <button
                        type="button"
                        onClick={() => setIsStylesCollapsed(!isStylesCollapsed)}
                        className="flex items-center justify-between text-[10px] uppercase tracking-wider text-[var(--theme-secondary)] font-bold font-mono py-1 cursor-pointer select-none border-b border-[var(--theme-border)]"
                      >
                        <span className="flex items-center gap-1.5">
                          <Grid size={11} className="text-[var(--theme-secondary)]" />
                          Render Styles
                        </span>
                        {isStylesCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                      </button>

                      <AnimatePresence initial={false}>
                        {!isStylesCollapsed && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.23, ease: 'easeInOut' }}
                            className="overflow-hidden"
                          >
                            <div className="flex flex-col gap-2 mt-1 pt-1">
                              <label className="flex items-center justify-between text-xs font-semibold text-[var(--theme-primary)] bg-[var(--theme-surface)] border border-[var(--theme-border)] px-4 py-2 rounded-2xl cursor-pointer select-none">
                                <span className="flex items-center gap-1.5">
                                  <Grid size={12} className="text-[var(--theme-secondary)] animate-spin-reverse" />
                                  Whiteboard Grid Style
                                </span>
                                <input
                                  type="checkbox"
                                  checked={sketchMode}
                                  onChange={(e) => setSketchMode(e.target.checked)}
                                  className="w-4 h-4 rounded text-[var(--theme-accent)] focus:ring-[var(--theme-accent)] border-gray-300 cursor-pointer accent-[var(--theme-accent)]"
                                />
                              </label>

                              <label className="flex items-center justify-between text-xs font-semibold text-[var(--theme-primary)] bg-[var(--theme-surface)] border border-[var(--theme-border)] px-4 py-2 rounded-2xl cursor-pointer select-none">
                                <span className="flex items-center gap-1.5">
                                  <TrendingUp size={12} className="text-[var(--theme-secondary)]" />
                                  Velocity vectors & Slope
                                </span>
                                <input
                                  type="checkbox"
                                  checked={tangentMode}
                                  onChange={(e) => setTangentMode(e.target.checked)}
                                  className="w-4 h-4 rounded text-[var(--theme-accent)] focus:ring-[var(--theme-accent)] border-gray-300 cursor-pointer accent-[var(--theme-accent)]"
                                />
                              </label>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* EDUCATIONAL ANNOTATIONS PANEL */}
                    <div className="flex flex-col gap-3.5 border-t border-[var(--theme-border)] pt-4">
                      <button
                        type="button"
                        onClick={() => setIsPinsCollapsed(!isPinsCollapsed)}
                        className="flex items-center justify-between text-[10px] uppercase tracking-wider text-[var(--theme-secondary)] font-bold font-mono py-1 cursor-pointer select-none border-b border-[var(--theme-border)]"
                      >
                        <span className="flex items-center gap-1.5">
                          <PenTool size={11} className="text-[var(--theme-accent)]" />
                          Educational Pins ({annotations.length})
                        </span>
                        <div className="flex items-center gap-2">
                          {annotations.length > 0 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setAnnotations([]);
                              }}
                              className="text-[9px] text-red-500 hover:underline flex items-center gap-0.5 cursor-pointer lowercase"
                            >
                              <Trash2 size={10} />
                              clear
                            </button>
                          )}
                          {isPinsCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                        </div>
                      </button>

                      <AnimatePresence initial={false}>
                        {!isPinsCollapsed && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.23, ease: 'easeInOut' }}
                            className="overflow-hidden"
                          >
                            <div className="flex flex-col gap-3 mt-1 pt-1">
                              {annotations.length === 0 ? (
                                <div className="text-[11px] text-[var(--theme-secondary)] font-medium leading-normal p-3.5 bg-[var(--theme-surface-alt)] border border-dashed border-[var(--theme-border)] rounded-2xl text-center">
                                  Click inside the 2D coordinate grid to place permanent annotated pin-points at formula equations locations.
                                </div>
                              ) : (
                                <div className="flex flex-col gap-2 max-h-[190px] overflow-y-auto custom-scrollbar pr-1">
                                  {annotations.map((ann) => (
                                    <div 
                                      key={ann.id} 
                                      className="bg-[var(--theme-surface)] p-2.5 rounded-xl border border-[var(--theme-border)] flex flex-col gap-1.5 focus-within:ring-1 focus-within:ring-[var(--theme-accent)]"
                                    >
                                      <div className="flex items-center gap-1.5 justify-between">
                                        {/* Dynamic label inline editor */}
                                        <input
                                          type="text"
                                          value={ann.label}
                                          onChange={(e) => {
                                            const newText = e.target.value;
                                            setAnnotations(prev => prev.map(a => a.id === ann.id ? { ...a, label: newText } : a));
                                          }}
                                          className="bg-transparent text-xs font-bold text-[var(--theme-primary)] focus:outline-none focus:border-b focus:border-[var(--theme-accent)] w-[60%] select-text"
                                          placeholder="Untitled Label"
                                        />
                                        <div className="flex items-center gap-1 shrink-0">
                                          {/* Snapped state toggle badge */}
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setAnnotations(prev => prev.map(a => a.id === ann.id ? { ...a, isSnapped: !a.isSnapped } : a));
                                            }}
                                            className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold transition-colors cursor-pointer ${
                                              ann.isSnapped 
                                                ? 'bg-[var(--theme-surface-alt)] text-[var(--theme-accent)] border border-[var(--theme-border)]' 
                                                : 'bg-[var(--theme-surface-alt)] text-[var(--theme-secondary)] hover:text-[var(--theme-primary)]'
                                            }`}
                                            title={ann.isSnapped ? "Mathematically snapped to curve" : "Free-coordinate pinned"}
                                          >
                                            {ann.isSnapped ? "snap" : "free"}
                                          </button>
                                          
                                          {/* Trash delete */}
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setAnnotations(prev => prev.filter(a => a.id !== ann.id));
                                            }}
                                            className="p-1 text-[var(--theme-secondary)] hover:text-red-500 transition-colors cursor-pointer"
                                            title="Delete Annotation"
                                          >
                                            <Trash2 size={11} />
                                          </button>
                                        </div>
                                      </div>

                                      {/* Coordinates details */}
                                      <div className="flex items-center justify-between text-[10px] font-mono text-[var(--theme-secondary)] leading-none">
                                        <span>P: ({ann.x.toFixed(1)}, {ann.isSnapped ? 'Snapped' : ann.y.toFixed(1)})</span>
                                        {/* Simple color circles selector in list */}
                                        <div className="flex items-center gap-1">
                                          {['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#a855f7'].map(colorVal => (
                                            <button
                                              key={colorVal}
                                              type="button"
                                              onClick={() => {
                                                setAnnotations(prev => prev.map(a => a.id === ann.id ? { ...a, color: colorVal } : a));
                                              }}
                                              className={`w-2.5 h-2.5 rounded-full cursor-pointer transition-transform ${
                                                ann.color === colorVal ? 'ring-1 ring-offset-1 ring-[var(--theme-primary)] scale-110' : 'opacity-70 hover:opacity-100'
                                              }`}
                                              style={{ backgroundColor: colorVal }}
                                            />
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>

          {/* MAIN GRAPH DISPLAY STAGE */}
          <div className="flex-1 flex flex-col bg-[var(--theme-bg)] p-6 relative overflow-hidden select-none">
            
            {/* Simulation Motion Control Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-[var(--theme-surface-alt)] border border-[var(--theme-border)] rounded-2xl mb-4 text-xs font-semibold">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setAnimating(!animating)}
                  className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 font-bold cursor-pointer transition-all ${
                    animating
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                      : 'bg-[var(--theme-surface)] border-[var(--theme-border)] text-[var(--theme-primary)] hover:bg-[var(--theme-hover-bg)]'
                  }`}
                >
                  {animating ? <Pause size={12} /> : <Play size={12} />}
                  <span>{animating ? 'Sim Active' : 'Start Simulation'}</span>
                </button>
                <button
                  onClick={() => {
                    setAnimating(false);
                    setAnimTime(minX);
                  }}
                  disabled={animTime === minX}
                  className="p-1.5 bg-[var(--theme-surface)] border border-[var(--theme-border)] text-[var(--theme-primary)] hover:bg-[var(--theme-hover-bg)] disabled:opacity-40 rounded-xl cursor-pointer transition-opacity"
                  title="Reset simulation dot"
                >
                  <RotateCcw size={12} />
                </button>
                <button
                  onClick={() => setIsOptionsPanelOpen(!isOptionsPanelOpen)}
                  className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 font-bold cursor-pointer transition-all active:scale-95 text-[11px] select-none shadow-xs ${
                    isOptionsPanelOpen
                      ? 'bg-[var(--theme-surface-alt)] border-[var(--theme-accent)] text-[var(--theme-accent)]'
                      : 'bg-[var(--theme-surface)] border-[var(--theme-border)] text-[var(--theme-primary)] hover:bg-[var(--theme-hover-bg)]'
                  }`}
                  title="Configure presets, constants, and custom parameters"
                >
                  <Sliders size={11} className={isOptionsPanelOpen ? "text-[var(--theme-accent)]" : "text-zinc-450"} />
                  <span>{isOptionsPanelOpen ? 'Collapse Panel' : 'Expand Panel'}</span>
                </button>

                {/* PRESETS QUICK DROP-DOWN DISPLAYED DIRECTLY IN TOP BAR */}
                <span className="h-4 w-px bg-zinc-200 dark:bg-zinc-700/60 mx-1 hidden sm:inline" />
                <div className="flex items-center gap-1.5 select-none text-[11px]">
                  <span className="text-zinc-400 font-bold uppercase tracking-wider text-[9px] hidden sm:inline">System:</span>
                  <select
                    value={is3DMode ? selected3DPreset.id : selectedPreset.id}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (is3DMode) {
                        const matched = PHYSICS_3D_PRESETS.find(p => p.id === val);
                        if (matched) setSelected3DPreset(matched);
                      } else {
                        const matched = PHYSICS_PRESETS.find(p => p.id === val);
                        if (matched) setSelectedPreset(matched);
                      }
                    }}
                    className="bg-[var(--theme-surface)] text-[var(--theme-primary)] border border-[var(--theme-border)] hover:bg-[var(--theme-hover-bg)] text-[11px] py-1 px-2.5 rounded-lg font-bold cursor-pointer outline-none focus:ring-1 focus:ring-[var(--theme-accent)] transition-all max-w-[145px] truncate"
                  >
                    {is3DMode 
                      ? PHYSICS_3D_PRESETS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)
                      : PHYSICS_PRESETS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)
                    }
                  </select>
                </div>

                {/* QUICK CHECKS / OPTIONS OF PANEL */}
                <div className="flex items-center gap-1 hidden md:flex border-l border-[var(--theme-border)] pl-2">
                  <button
                    type="button"
                    onClick={() => setIs3DMode(!is3DMode)}
                    className={`h-7 px-2.5 rounded-lg text-[10px] uppercase tracking-wider font-extrabold border transition-all cursor-pointer ${
                      is3DMode 
                        ? 'bg-purple-500/15 border-purple-500/40 text-purple-600 dark:text-purple-450'
                        : 'bg-[var(--theme-surface)] border-[var(--theme-border)] text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                    }`}
                  >
                    {is3DMode ? '3D' : '2D'}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (!is3DMode) {
                        setTangentMode(prev => !prev);
                      }
                    }}
                    disabled={is3DMode}
                    className={`h-7 px-2.5 rounded-lg text-[10px] uppercase tracking-wider font-extrabold border transition-all cursor-pointer ${
                      tangentMode
                        ? 'bg-[var(--theme-accent)]/15 border-[var(--theme-accent)]/40 text-[var(--theme-accent)]'
                        : 'bg-[var(--theme-surface)] border-[var(--theme-border)] text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                    }`}
                  >
                    Tangent
                  </button>

                  <button
                    type="button"
                    onClick={() => setSketchMode(prev => !prev)}
                    className={`h-7 px-2.5 rounded-lg text-[10px] uppercase tracking-wider font-extrabold border transition-all cursor-pointer ${
                      sketchMode
                        ? 'bg-[var(--theme-accent)]/15 border-[var(--theme-accent)]/40 text-[var(--theme-accent)]'
                        : 'bg-[var(--theme-surface)] border-[var(--theme-border)] text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                    }`}
                  >
                    Grid
                  </button>
                </div>
              </div>

              {/* Simulation status logs */}
              {animatedParticle && (
                <div className="font-mono text-[10px] text-[var(--theme-secondary)] bg-[var(--theme-surface-alt)] px-3 py-1.5 rounded-xl border border-[var(--theme-border)] flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--theme-accent)] animate-ping" />
                    X: <strong className="text-[var(--theme-primary)]">{animatedParticle.x.toFixed(2)}</strong>
                  </span>
                  <span>
                    Y: <strong className="text-[var(--theme-primary)]">{animatedParticle.y.toFixed(2)}</strong>
                  </span>
                </div>
              )}
 
              <div className="flex items-center gap-2">
                {/* ZOOM CONTROLS */}
                <div className="flex items-center bg-[var(--theme-surface-alt)] border border-[var(--theme-border)] rounded-xl shadow-xs overflow-hidden h-8">
                  <button
                    type="button"
                    onClick={() => setZoomLevel(prev => Math.max(0.25, Number((prev - 0.25).toFixed(2))))}
                    className="h-full px-3 text-[var(--theme-secondary)] hover:text-[var(--theme-primary)] hover:bg-[var(--theme-hover-bg)] border-r border-[var(--theme-border)] transition-all cursor-pointer flex items-center justify-center font-bold text-sm"
                    title="Zoom Out (-)"
                  >
                    <ZoomOut size={12} className="mr-1" />
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
                    <ZoomIn size={12} className="mr-1" />
                    <span>+</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleExportSVG}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--theme-surface-alt)] border border-[var(--theme-border)] hover:bg-[var(--theme-hover-bg)] rounded-xl text-[var(--theme-primary)] transition-all font-bold cursor-pointer font-sans"
                >
                  <Download size={12} />
                  <span>Download SVG</span>
                </button>
 
                {/* Unified 3-Dot Options Dropdown */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowStageMenu(!showStageMenu)}
                    className={`p-1.5 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
                      showStageMenu
                        ? 'bg-[var(--theme-surface-alt)] border-[var(--theme-accent)] text-[var(--theme-accent)]'
                        : 'bg-[var(--theme-surface)] border border-[var(--theme-border)] text-[var(--theme-secondary)] hover:text-[var(--theme-primary)]'
                    }`}
                    title="Menu Actions"
                  >
                    <MoreVertical size={14} />
                  </button>
 
                  <AnimatePresence>
                    {showStageMenu && (
                      <>
                        {/* Outside click handler */}
                        <div 
                          className="fixed inset-0 z-40" 
                          onClick={() => setShowStageMenu(false)} 
                        />
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95, y: -10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: -10 }}
                          transition={{ duration: 0.15, ease: 'easeOut' }}
                          className="absolute right-0 mt-2 w-56 bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-2xl shadow-xl p-2.5 z-50 flex flex-col gap-1 text-left"
                        >
                          <div className="px-2 py-1 text-[10px] uppercase font-bold tracking-wider text-zinc-400 font-mono select-none">
                            Lab Chart Settings
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setIs3DMode(!is3DMode);
                              setShowStageMenu(false);
                            }}
                            className="w-full flex items-center justify-between px-2.5 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-xl text-zinc-700 dark:text-zinc-200 font-medium text-xs font-sans text-left transition-colors cursor-pointer"
                          >
                            <span>Toggle 3D Projection</span>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold uppercase ${is3DMode ? 'bg-purple-500/15 text-purple-600 dark:text-purple-400' : 'bg-zinc-100 dark:bg-zinc-850 text-zinc-500'}`}>
                              {is3DMode ? '3D Active' : '2D Mode'}
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setSketchMode(!sketchMode);
                              setShowStageMenu(false);
                            }}
                            className="w-full flex items-center justify-between px-2.5 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-xl text-zinc-700 dark:text-zinc-200 font-medium text-xs font-sans text-left transition-colors cursor-pointer"
                          >
                            <span>Drafting Grid Overlay</span>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold uppercase ${sketchMode ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400' : 'bg-zinc-100 dark:bg-zinc-850 text-zinc-500'}`}>
                              {sketchMode ? 'Enabled' : 'Disabled'}
                            </span>
                          </button>

                          {!is3DMode && (
                            <button
                              type="button"
                              onClick={() => {
                                setTangentMode(!tangentMode);
                                setShowStageMenu(false);
                              }}
                              className="w-full flex items-center justify-between px-2.5 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-xl text-zinc-700 dark:text-zinc-200 font-medium text-xs font-sans text-left transition-colors cursor-pointer"
                            >
                              <span>Velocity Vector Slopes</span>
                              <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold uppercase ${tangentMode ? 'bg-violet-500/15 text-violet-700 dark:text-violet-400' : 'bg-zinc-100 dark:bg-zinc-850 text-zinc-500'}`}>
                                {tangentMode ? 'Active' : 'Off'}
                              </span>
                            </button>
                          )}

                          <div className="border-t border-zinc-100 dark:border-white/5 my-1.5" />
                          
                          <div className="px-2 py-1 text-[10px] uppercase font-bold tracking-wider text-zinc-400 font-mono select-none">
                            Annotation Pins
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setAnnotations([]);
                              setShowStageMenu(false);
                            }}
                            disabled={annotations.length === 0}
                            className="w-full flex items-center justify-between px-2.5 py-2 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-500 disabled:opacity-40 rounded-xl font-medium text-xs font-sans text-left transition-colors cursor-pointer"
                          >
                            <span>Wipe All Lab Pins</span>
                            <span className="text-[9px] font-mono select-none">({annotations.length})</span>
                          </button>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>

                <button 
                  type="button"
                  onClick={onClose}
                  className="p-1.5 bg-[var(--theme-surface-alt)] border border-[var(--theme-border)] text-[var(--theme-secondary)] hover:text-red-500 rounded-xl transition-colors cursor-pointer h-8 w-8 flex items-center justify-center hover:bg-red-500/10 hover:border-red-500"
                  title="Close Physics Laboratory"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Core Interactive SVG Board */}
            <div className={`flex-1 flex items-center justify-center p-2 rounded-2xl relative border ${
              sketchMode 
                ? 'bg-[#f7f6f2] dark:bg-[#1a1917] border-amber-200/40 dark:border-amber-900/10' 
                : 'bg-zinc-50/50 dark:bg-[#080808] border-zinc-200/40 dark:border-white/5'
            } overflow-hidden transition-all duration-300`}>
              
              <svg
                ref={svgRef}
                width={width}
                height={height}
                className={`overflow-visible cursor-crosshair select-none ${sketchMode ? 'drop-shadow-xs' : ''}`}
                onMouseDown={handleSvgMouseDown}
                onMouseMove={handleSvgMouseMove}
                onMouseUp={handleSvgMouseUp}
                onMouseLeave={() => {
                  handleSvgMouseUp();
                  setInteractiveHover(null);
                }}
                onClick={handleSvgClick}
              >
                <defs>
                  {/* Grid pattern */}
                  <pattern id="millimeter-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                    <line x1="0" y1="0" x2="20" y2="0" stroke={sketchMode ? '#dbd4c0' : 'rgba(255,255,255,0.02)'} strokeWidth="0.5" />
                    <line x1="0" y1="0" x2="0" y2="20" stroke={sketchMode ? '#dbd4c0' : 'rgba(255,255,255,0.02)'} strokeWidth="0.5" />
                  </pattern>

                  {/* Sharp vector arrows marker */}
                  <marker id="arrow-axis" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill={sketchMode ? '#5e5a4f' : '#888888'} />
                  </marker>
                  <marker id="arrow-green" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#10b981" />
                  </marker>
                  <marker id="arrow-pink" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#ec4899" />
                  </marker>
                  <marker id="arrow-amber" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#f59e0b" />
                  </marker>
                </defs>

                {/* Millimeter engineering grid paper overlay */}
                {!is3DMode && (
                  <rect 
                    x={paddingLeft} 
                    y={paddingTop} 
                    width={chartWidth} 
                    height={chartHeight} 
                    fill={sketchMode ? 'url(#millimeter-grid)' : 'none'} 
                  />
                )}

                {/* Vertical/Horizontal axis lines styled for physics laboratory charts */}
                {!is3DMode && (
                  <>
                    {/* Y-Axis Grid Line Ticks */}
                    {Array.from({ length: 6 }).map((_, idx) => {
                      const val = minY + (idx / 5) * (maxY - minY);
                      const y = getRelativeY(val);
                      return (
                        <g key={idx}>
                          {y >= paddingTop && y <= height - paddingBottom && (
                            <>
                              <line
                                x1={paddingLeft}
                                y1={y}
                                x2={width - paddingRight}
                                y2={y}
                                className={sketchMode ? 'stroke-amber-900/10' : 'stroke-white/[0.03]'}
                                strokeWidth={1}
                                strokeDasharray={idx === 0 ? '0' : '3 3'}
                              />
                              <text
                                x={paddingLeft - 10}
                                y={y + 3}
                                textAnchor="end"
                                className={`font-mono text-[9px] ${
                                  sketchMode ? 'fill-[#5e5a4f]' : 'fill-zinc-500 font-semibold'
                                }`}
                              >
                                {Math.round(val)}
                              </text>
                            </>
                          )}
                        </g>
                      );
                    })}

                    {/* X-Axis Grid Line Ticks */}
                    {Array.from({ length: 6 }).map((_, idx) => {
                      const val = minX + (idx / 5) * (maxX - minX);
                      const x = getRelativeX(val);
                      return (
                        <g key={idx}>
                          {x >= paddingLeft && x <= width - paddingRight && (
                            <>
                              <line
                                x1={x}
                                y1={paddingTop}
                                x2={x}
                                y2={height - paddingBottom}
                                className={sketchMode ? 'stroke-amber-900/10' : 'stroke-white/[0.03]'}
                                strokeWidth={1}
                                strokeDasharray={idx === 0 ? '0' : '3 3'}
                              />
                              <text
                                x={x}
                                y={height - paddingBottom + 16}
                                textAnchor="middle"
                                className={`font-mono text-[9px] ${
                                  sketchMode ? 'fill-[#5e5a4f]' : 'fill-zinc-500 font-semibold'
                                }`}
                              >
                                {val.toFixed(1)}
                              </text>
                            </>
                          )}
                        </g>
                      );
                    })}

                    {/* CORE SOLID LABORATORY AXES WITH ARROW HEADS */}
                    {/* X-Axis Horizontal */}
                    <line
                      x1={paddingLeft - 10}
                      y1={getRelativeY(0 >= minY && 0 <= maxY ? 0 : minY)}
                      x2={width - paddingRight + 12}
                      y2={getRelativeY(0 >= minY && 0 <= maxY ? 0 : minY)}
                      stroke={sketchMode ? '#5e5a4f' : '#71717a'}
                      strokeWidth={2}
                      markerEnd="url(#arrow-axis)"
                    />
                    
                    {/* Y-Axis Vertical */}
                    <line
                      x1={getRelativeX(0 >= minX && 0 <= maxX ? 0 : minX)}
                      y1={height - paddingBottom + 10}
                      x2={getRelativeX(0 >= minX && 0 <= maxX ? 0 : minX)}
                      y2={paddingTop - 12}
                      stroke={sketchMode ? '#5e5a4f' : '#71717a'}
                      strokeWidth={2}
                      markerEnd="url(#arrow-axis)"
                    />

                    {/* Axes Label titles */}
                    <text
                      x={width - paddingRight + 12}
                      y={getRelativeY(0 >= minY && 0 <= maxY ? 0 : minY) + 20}
                      textAnchor="end"
                      className={`font-bold font-sans text-[11px] uppercase tracking-wider ${
                        sketchMode ? 'fill-amber-900' : 'fill-zinc-200'
                      }`}
                    >
                      {selectedPreset.xAxisLabel}
                    </text>
                    
                    <text
                      x={getRelativeX(0 >= minX && 0 <= maxX ? 0 : minX) - 15}
                      y={paddingTop - 18}
                      textAnchor="start"
                      className={`font-bold font-sans text-[11px] uppercase tracking-wider ${
                        sketchMode ? 'fill-amber-900' : 'fill-zinc-200'
                      }`}
                    >
                      {selectedPreset.yAxisLabel}
                    </text>
                  </>
                )}

                {/* CONTINUOUS CURVE PATH COMPOSITOR */}
                {!is3DMode && (
                  <>
                    {curvePoints.length > 1 && (
                      <path
                        d={`M ${curvePoints[0].px},${curvePoints[0].py} ` + 
                          curvePoints.slice(1).map(pt => `L ${pt.px},${pt.py}`).join(' ')
                        }
                        fill="none"
                        stroke={sketchMode ? '#1e3a8a' : '#3b82f6'}
                        strokeWidth={sketchMode ? 3.5 : 3}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        opacity={0.9}
                      />
                    )}

                    {/* TANGENT Slope rate overlay lines */}
                    {tangentMode && tangentLinePath && (
                      <line
                        x1={tangentLinePath.x1}
                        y1={tangentLinePath.y1}
                        x2={tangentLinePath.x2}
                        y2={tangentLinePath.y2}
                        stroke="#8b5cf6"
                        strokeWidth={2}
                        strokeDasharray="4 4"
                      />
                    )}

                    {/* PHYSICS VECTOR MARKER OVERLAYS (Preset Custom) */}
                    {selectedPreset.renderOverlay && activePointsCombined && (
                      selectedPreset.renderOverlay({
                        getX: getRelativeX,
                        getY: getRelativeY,
                        params: activeParams,
                        activeX: activePointsCombined.x,
                        activeY: activePointsCombined.y
                      })
                    )}

                    {/* SIMULATED TRAJECTORY PARTICLE */}
                    {animatedParticle && (
                      <g>
                        <circle
                          cx={animatedParticle.px}
                          cy={animatedParticle.py}
                          r={6}
                          fill={sketchMode ? '#b91c1c' : '#10b981'}
                          stroke="white"
                          strokeWidth={2}
                          className="drop-shadow-sm font-sans font-semibold pointer-events-none"
                        />
                      </g>
                    )}

                    {/* EDUCATIONAL ANNOTATIONS SVG MARKERS */}
                    {renderedAnnotations.map((ann) => {
                      const isVisible = ann.px >= paddingLeft && ann.px <= width - paddingRight &&
                                        ann.py >= paddingTop && ann.py <= height - paddingBottom;
                      if (!isVisible) return null;
                      
                      return (
                        <g key={ann.id} className="transition-all duration-300">
                          {/* Pulsating locator ring */}
                          <circle
                            cx={ann.px}
                            cy={ann.py}
                            r={8}
                            fill="none"
                            stroke={ann.color}
                            strokeWidth={1}
                            className="animate-pulse"
                            opacity={0.4}
                          />
                          {/* Inner anchor pinpoint */}
                          <circle
                            cx={ann.px}
                            cy={ann.py}
                            r={4.5}
                            fill={ann.color}
                            stroke="#ffffff"
                            strokeWidth={1.5}
                            className="cursor-pointer shadow-xs hover:scale-125 transition-transform"
                          >
                            <title>{`Pin: (${ann.x.toFixed(1)}, ${ann.currentY.toFixed(1)}) - ${ann.label}`}</title>
                          </circle>
                          
                          {/* Elegant vector tag callout label */}
                          <g transform={`translate(${ann.px}, ${ann.py})`}>
                            {/* Angled dashed callout line */}
                            <line
                              x1={0}
                              y1={0}
                              x2={10}
                              y2={-10}
                              stroke={ann.color}
                              strokeWidth={1.2}
                              strokeDasharray="2 2"
                            />
                            {/* Absolute background card element */}
                            <g transform="translate(10, -26)" className="select-none pointer-events-none drop-shadow-xs">
                              <rect
                                x={0}
                                y={0}
                                width={Math.max(70, ann.label.length * 6.0 + 14)}
                                height={18}
                                rx={5}
                                fill={sketchMode ? '#ffffff' : '#1e1e24'}
                                stroke={ann.color}
                                strokeWidth={1.2}
                              />
                              <text
                                x={7}
                                y={12}
                                fill={sketchMode ? '#1e1e24' : '#f4f4f5'}
                                className="font-sans font-bold text-[9px] tracking-wide"
                              >
                                {ann.label}
                              </text>
                            </g>
                          </g>
                        </g>
                      );
                    })}

                    {/* TEMPORARY PRE-PIN POINT */}
                    {newAnnotationCoords && (
                      <g>
                        <circle
                          cx={newAnnotationCoords.px}
                          cy={newAnnotationCoords.py}
                          r={7}
                          fill="none"
                          stroke={newAnnotationColor}
                          strokeWidth={1.5}
                          className="animate-ping"
                          opacity={0.6}
                        />
                        <circle
                          cx={newAnnotationCoords.px}
                          cy={newAnnotationCoords.py}
                          r={4}
                          fill={newAnnotationColor}
                          stroke="#ffffff"
                          strokeWidth={1}
                        />
                        
                        {/* Add Pin Form Box Context Dialog */}
                        <foreignObject
                          x={Math.min(width - 230, Math.max(paddingLeft, newAnnotationCoords.px - 110))}
                          y={Math.min(height - 180, Math.max(paddingTop, newAnnotationCoords.py - 165))}
                          width={220}
                          height={165}
                          className="z-50 overflow-visible"
                        >
                          <div 
                            className="bg-zinc-950/95 dark:bg-zinc-900 w-full hover:shadow-2xl border border-zinc-700 dark:border-white/15 p-3 rounded-2xl shadow-xl flex flex-col gap-2 font-sans text-left leading-normal"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-zinc-300 font-bold uppercase tracking-wider flex items-center gap-1 font-mono">
                                <PenTool size={11} className="text-blue-400" />
                                Coordinate Label
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setNewAnnotationCoords(null);
                                }}
                                className="p-1 hover:bg-white/10 rounded-full text-zinc-400 hover:text-white transition-colors cursor-pointer"
                              >
                                <X size={12} />
                              </button>
                            </div>

                            <div className="flex flex-col gap-1.5">
                              <input
                                type="text"
                                value={newAnnotationText}
                                onChange={(e) => setNewAnnotationText(e.target.value)}
                                placeholder="e.g. Inflection Peak"
                                className="w-full bg-zinc-800 text-white placeholder-zinc-500 text-xs px-2.5 py-1.5 rounded-xl border border-zinc-700 focus:outline-none focus:border-blue-500 font-medium font-sans"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    document.getElementById('save-pin-point-marker')?.click();
                                  }
                                }}
                              />
                            </div>

                            {/* Snap Checkbox */}
                            <label className="flex items-center gap-1.5 text-[9px] text-zinc-300 select-none cursor-pointer">
                              <input
                                type="checkbox"
                                checked={newAnnotationSnap}
                                onChange={(e) => setNewAnnotationSnap(e.target.checked)}
                                className="w-3.5 h-3.5 rounded text-blue-500 border-none cursor-pointer accent-blue-500"
                              />
                              <span>Snap to continuous curve</span>
                            </label>

                            {/* Color Selector */}
                            <div className="flex items-center justify-between pt-0.5">
                              <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wide">Pin color</span>
                              <div className="flex items-center gap-1">
                                {['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#a855f7'].map((c) => (
                                  <button
                                    key={c}
                                    type="button"
                                    onClick={() => setNewAnnotationColor(c)}
                                    className={`w-3.5 h-3.5 rounded-full border transition-all hover:scale-110 cursor-pointer ${
                                      newAnnotationColor === c ? 'ring-2 ring-white/60 border-transparent scale-110' : 'border-zinc-700'
                                    }`}
                                    style={{ backgroundColor: c }}
                                  />
                                ))}
                              </div>
                            </div>

                            <button
                              id="save-pin-point-marker"
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const finalLabel = newAnnotationText.trim() || `Pin (${newAnnotationCoords.x.toFixed(1)}, ${newAnnotationCoords.y.toFixed(1)})`;
                                const newPin = {
                                  id: Date.now().toString(),
                                  x: newAnnotationCoords.x,
                                  y: newAnnotationCoords.y,
                                  label: finalLabel,
                                  color: newAnnotationColor,
                                  isSnapped: newAnnotationSnap
                                };
                                setAnnotations(prev => [...prev, newPin]);
                                setNewAnnotationCoords(null);
                              }}
                              className="w-full py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-[10px] font-bold rounded-xl transition-all uppercase tracking-wider cursor-pointer mt-1"
                            >
                              Add Annotation Pin
                            </button>
                          </div>
                        </foreignObject>
                      </g>
                    )}

                    {/* DYNAMIC GUIDELINES & TOOLTIPS ON HOVER */}
                    {activePointsCombined && (
                      <g>
                        {/* Horizontal drop pointer */}
                        <line
                          x1={paddingLeft}
                          y1={activePointsCombined.py}
                          x2={activePointsCombined.px}
                          y2={activePointsCombined.py}
                          stroke={sketchMode ? '#5e5a4f' : '#ffffff'}
                          strokeWidth={1}
                          strokeDasharray="2 2"
                          opacity={0.5}
                        />
                        {/* Vertical drop pointer */}
                        <line
                          x1={activePointsCombined.px}
                          y1={activePointsCombined.py}
                          x2={activePointsCombined.px}
                          y2={height - paddingBottom}
                          stroke={sketchMode ? '#5e5a4f' : '#ffffff'}
                          strokeWidth={1}
                          strokeDasharray="2 2"
                          opacity={0.5}
                        />

                        {/* Laser point anchor */}
                        <circle
                          cx={activePointsCombined.px}
                          cy={activePointsCombined.py}
                          r={5}
                          className="fill-blue-500 stroke-white dark:stroke-zinc-950"
                          strokeWidth={1.5}
                        />

                        {/* Coordinates box bubble */}
                        <foreignObject
                          x={Math.min(width - 150, Math.max(paddingLeft, activePointsCombined.px - 60))}
                          y={Math.max(paddingTop + 10, activePointsCombined.py - 55)}
                          width={130}
                          height={46}
                        >
                          <div className="bg-zinc-800/95 dark:bg-zinc-900 border border-white/20 px-2.5 py-1.5 rounded-xl shadow-lg leading-tight select-none">
                            <div className="text-[9px] text-zinc-400 font-mono font-bold uppercase tracking-wider">Hover coordinates</div>
                            <div className="text-[10px] font-mono text-white font-bold flex gap-2 pt-0.5 justify-center">
                              <span>X: {activePointsCombined.x.toFixed(2)}</span>
                              <span>Y: {activePointsCombined.y.toFixed(2)}</span>
                            </div>
                          </div>
                        </foreignObject>
                      </g>
                    )}
                  </>
                )}

                {/* 3D RENDERING SYSTEM */}
                {is3DMode && (
                  <g>
                    {/* Perspective floor grid parallel to Z and X plane */}
                    {(() => {
                      const gridLines = [];
                      for (let x = -1.2; x <= 1.25; x += 0.45) {
                        const p1 = project3D(x, -0.8, -1.2);
                        const p2 = project3D(x, -0.8, 1.2);
                        gridLines.push(<line key={`grid-3d-x-${x}`} x1={p1.px} y1={p1.py} x2={p2.px} y2={p2.py} stroke={sketchMode ? '#c2bca8' : 'rgba(255,255,255,0.08)'} strokeWidth="1" />);
                      }
                      for (let z = -1.2; z <= 1.25; z += 0.45) {
                        const p1 = project3D(-1.2, -0.8, z);
                        const p2 = project3D(1.2, -0.8, z);
                        gridLines.push(<line key={`grid-3d-z-${z}`} x1={p1.px} y1={p1.py} x2={p2.px} y2={p2.py} stroke={sketchMode ? '#c2bca8' : 'rgba(255,255,255,0.08)'} strokeWidth="1" />);
                      }
                      return gridLines;
                    })()}

                    {/* Projected XYZ Space Axes */}
                    {(() => {
                      const origin = project3D(0, 0, 0);
                      const xAxis = project3D(1.15, 0, 0);
                      const yAxis = project3D(0, 1.15, 0);
                      const zAxis = project3D(0, 0, 1.15);
                      return (
                        <g>
                          {/* X Horizontal (Red Vector) */}
                          <line x1={origin.px} y1={origin.py} x2={xAxis.px} y2={xAxis.py} stroke="#f87171" strokeWidth="2" opacity={0.8} markerEnd="url(#arrow-axis)" />
                          <text x={xAxis.px + 10} y={xAxis.py + 4} fill="#ef4444" className="font-mono font-bold text-[10px]">X</text>

                          {/* Y Height vertical (Green Vector) */}
                          <line x1={origin.px} y1={origin.py} x2={yAxis.px} y2={yAxis.py} stroke="#34d399" strokeWidth="2" opacity={0.8} markerEnd="url(#arrow-axis)" />
                          <text x={yAxis.px} y={yAxis.py - 10} fill="#10b981" className="font-mono font-bold text-[10px]" textAnchor="middle">Y (Height)</text>

                          {/* Z Depth Perspective (Blue Vector) */}
                          <line x1={origin.px} y1={origin.py} x2={zAxis.px} y2={zAxis.py} stroke="#60a5fa" strokeWidth="2" opacity={0.8} markerEnd="url(#arrow-axis)" />
                          <text x={zAxis.px - 10} y={zAxis.py + 12} fill="#3b82f6" className="font-mono font-bold text-[10px]">Z (Depth)</text>
                        </g>
                      );
                    })()}

                    {/* 3D Attractor/Solenoid trajectory vector strip */}
                    {curve3DPoints.length > 1 && (
                      <path
                        d={`M ${curve3DPoints[0].px},${curve3DPoints[0].py} ` + 
                          curve3DPoints.slice(1).map(pt => `L ${pt.px},${pt.py}`).join(' ')
                        }
                        fill="none"
                        stroke={sketchMode ? '#4c1d95' : '#a855f7'}
                        strokeWidth={sketchMode ? 3.5 : 3.0}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        opacity={0.9}
                      />
                    )}

                    {/* Projected Shadow dot & Interactive floating glowing particle */}
                    {animated3DParticle && (
                      <g>
                        {/* Floor projection coordinates line */}
                        {(() => {
                          const scaleFactor = selected3DPreset.id === 'lorenz-attractor' ? 0.05 : 1;
                          const shadowFloor = project3D(
                            animated3DParticle.x * scaleFactor, 
                            -0.8, 
                            animated3DParticle.z * scaleFactor
                          );
                          return (
                            <>
                              <line 
                                x1={animated3DParticle.px} 
                                y1={animated3DParticle.py} 
                                x2={shadowFloor.px} 
                                y2={shadowFloor.py} 
                                stroke={sketchMode ? 'rgba(76,29,149,0.3)' : 'rgba(168,85,247,0.35)'} 
                                strokeWidth="1" 
                                strokeDasharray="3 3" 
                              />
                              <circle 
                                cx={shadowFloor.px} 
                                cy={shadowFloor.py} 
                                r="4" 
                                fill="rgba(0,0,0,0.18)" 
                                stroke="rgba(168,85,247,0.4)" 
                                strokeWidth="1" 
                              />
                            </>
                          );
                        })()}

                        <circle
                          cx={animated3DParticle.px}
                          cy={animated3DParticle.py}
                          r={7}
                          fill="#f3e8ff"
                          stroke="#a052f5"
                          strokeWidth={2}
                          className="drop-shadow-sm pointer-events-none"
                        />

                        {/* Floating coordinate telemetry metrics box inside SVG area */}
                        <foreignObject
                          x={Math.min(width - 165, Math.max(paddingLeft, animated3DParticle.px - 70))}
                          y={Math.max(paddingTop + 10, animated3DParticle.py - 60)}
                          width={140}
                          height={50}
                        >
                          <div className="bg-purple-950/95 dark:bg-zinc-900 border border-purple-500/30 px-2.5 py-1.5 rounded-xl shadow-lg leading-tight select-none">
                            <div className="text-[8px] text-purple-300 font-mono font-bold uppercase tracking-wider text-center">3D State Vector</div>
                            <div className="text-[9px] font-mono text-zinc-100 font-bold flex gap-2 pt-0.5 justify-center leading-none">
                              <span>X: {animated3DParticle.x.toFixed(1)}</span>
                              <span>Y: {animated3DParticle.y.toFixed(1)}</span>
                              <span>Z: {animated3DParticle.z.toFixed(1)}</span>
                            </div>
                          </div>
                        </foreignObject>
                      </g>
                    )}
                  </g>
                )}
              </svg>

            </div>
          </div>
        </div>
      </div>
  );

  if (isInline) {
    return innerContent;
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22, ease: "easeInOut" }}
          className="fixed inset-0 bg-zinc-950/70 dark:bg-black/80 backdrop-blur-md z-[120] flex items-center justify-center p-4"
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: "spring", stiffness: 360, damping: 28 }}
            className="flex h-[90vh] w-full max-w-5xl"
          >
            {innerContent}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
