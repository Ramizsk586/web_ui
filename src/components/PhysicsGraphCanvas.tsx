import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Play, Pause, RotateCcw, Download, Sliders, Layers, Sparkles,
  Eye, Grid, TrendingUp, PenTool, Plus, RefreshCw, Trash2,
  ChevronDown, ChevronRight, MoreVertical, ZoomIn, ZoomOut,
  Compass, Atom, Waves, Zap, Thermometer, Orbit, Rocket as RocketIcon,
  Box, Filter, Sigma, EyeOff, Grid3x3, Wind, Flame, CircleDot,
  Activity, Magnet
} from 'lucide-react';

/* ============================================================
   TYPES
   ============================================================ */
type PhysicsCategory =
  | 'mechanics' | 'dynamics' | 'waves' | 'circuits'
  | 'thermo' | 'astro' | 'em';

type ViewMode = 'graph2d' | 'sim' | '3d';

interface PhysicsPreset {
  id: string;
  name: string;
  description: string;
  category: PhysicsCategory;
  xAxisLabel: string;
  yAxisLabel: string;
  defaultXRange: [number, number];
  defaultYRange: [number, number];
  sliders: Array<{
    key: string; label: string; symbol: string;
    min: number; max: number; step: number; defaultValue: number; unit: string;
  }>;
  formulaDisplay: string;
  calculate: (x: number, params: Record<string, number>) => number;
  calculateSlope?: (x: number, params: Record<string, number>) => number;
  renderOverlay?: (ctx: {
    getX: (v: number) => number; getY: (v: number) => number;
    params: Record<string, number>; activeX: number; activeY: number;
  }) => React.ReactNode;
}

interface Physics3DPreset {
  id: string;
  name: string;
  description: string;
  category: PhysicsCategory;
  formulaDisplay: string;
  sliders: Array<{
    key: string; label: string; symbol: string;
    min: number; max: number; step: number; defaultValue: number; unit: string;
  }>;
}

interface SimPreset {
  id: string;
  name: string;
  description: string;
  category: PhysicsCategory;
  icon: React.ReactNode;
  color: string;
  sliders: Array<{
    key: string; label: string; symbol: string;
    min: number; max: number; step: number; defaultValue: number; unit: string;
  }>;
}

/* ============================================================
   CATEGORY METADATA
   ============================================================ */
const CATEGORIES: {
  id: PhysicsCategory | 'all' | '3d';
  label: string; icon: React.ReactNode; color: string; desc: string;
}[] = [
  { id: 'all',       label: 'All Topics',    icon: <Layers size={12}/>,      color: 'text-zinc-400',    desc: 'Every physics system' },
  { id: 'mechanics', label: 'Mechanics',     icon: <Compass size={12}/>,     color: 'text-blue-400',    desc: 'Forces, pendulums, springs' },
  { id: 'dynamics',  label: 'Dynamics',      icon: <RocketIcon size={12}/>,  color: 'text-orange-400',  desc: 'Motion & projectiles' },
  { id: 'waves',     label: 'Waves',         icon: <Waves size={12}/>,       color: 'text-cyan-400',    desc: 'Sound, light, resonance' },
  { id: 'circuits',  label: 'Circuits',      icon: <Zap size={12}/>,         color: 'text-yellow-400',  desc: 'RC, RLC, voltage' },
  { id: 'thermo',    label: 'Thermodynamics',icon: <Thermometer size={12}/>, color: 'text-red-400',     desc: 'Heat & gases' },
  { id: 'astro',     label: 'Astrophysics',  icon: <Orbit size={12}/>,       color: 'text-purple-400',  desc: 'Orbits & gravity' },
  { id: 'em',        label: 'EM Fields',     icon: <Magnet size={12}/>,      color: 'text-pink-400',    desc: 'Electric & magnetic' },
  { id: '3d',        label: '3D Lab',        icon: <Box size={12}/>,         color: 'text-fuchsia-400', desc: '3D physics systems' },
];

/* ============================================================
   2D GRAPH PRESETS (expanded)
   ============================================================ */
const PHYSICS_PRESETS: PhysicsPreset[] = [
  // -------- Mechanics --------
  {
    id: 'uniform-motion', name: 'Uniform Direct Motion', category: 'mechanics',
    description: 'Constant velocity linear displacement.',
    xAxisLabel: 'Time t (s)', yAxisLabel: 'Displacement s (m)',
    defaultXRange: [0, 10], defaultYRange: [0, 100],
    formulaDisplay: 's(t) = v · t + s₀',
    sliders: [
      { key: 'v', label: 'Velocity', symbol: 'v', min: -10, max: 20, step: 0.5, defaultValue: 8, unit: 'm/s' },
      { key: 's0', label: 'Initial Position', symbol: 's₀', min: -20, max: 50, step: 1, defaultValue: 10, unit: 'm' }
    ],
    calculate: (t, p) => p.v * t + p.s0,
    calculateSlope: (_, p) => p.v,
  },
  {
    id: 'accelerated-motion', name: 'Uniformly Accelerated', category: 'mechanics',
    description: 'Constant acceleration quadratic displacement.',
    xAxisLabel: 'Time t (s)', yAxisLabel: 'Position s (m)',
    defaultXRange: [0, 10], defaultYRange: [0, 150],
    formulaDisplay: 's(t) = ½at² + v₀t + s₀',
    sliders: [
      { key: 'a', label: 'Acceleration', symbol: 'a', min: -5, max: 10, step: 0.2, defaultValue: 2, unit: 'm/s²' },
      { key: 'v0', label: 'Initial Velocity', symbol: 'v₀', min: -10, max: 25, step: 1, defaultValue: 4, unit: 'm/s' },
      { key: 's0', label: 'Initial Position', symbol: 's₀', min: 0, max: 40, step: 1, defaultValue: 10, unit: 'm' }
    ],
    calculate: (t, p) => 0.5 * p.a * t * t + p.v0 * t + p.s0,
    calculateSlope: (t, p) => p.a * t + p.v0,
  },
  {
    id: 'pendulum-period', name: 'Pendulum Period vs Length', category: 'mechanics',
    description: 'Simple pendulum period T = 2π√(L/g).',
    xAxisLabel: 'Length L (m)', yAxisLabel: 'Period T (s)',
    defaultXRange: [0, 5], defaultYRange: [0, 5],
    formulaDisplay: 'T(L) = 2π · √(L/g)',
    sliders: [
      { key: 'g', label: 'Gravity', symbol: 'g', min: 1, max: 25, step: 0.1, defaultValue: 9.81, unit: 'm/s²' }
    ],
    calculate: (L, p) => 2 * Math.PI * Math.sqrt(Math.max(0, L) / p.g),
  },
  {
    id: 'spring-hooke', name: 'Spring Force (Hooke\'s Law)', category: 'mechanics',
    description: 'Restoring force F = -kx.',
    xAxisLabel: 'Displacement x (m)', yAxisLabel: 'Force F (N)',
    defaultXRange: [-2, 2], defaultYRange: [-20, 20],
    formulaDisplay: 'F(x) = -k · x',
    sliders: [
      { key: 'k', label: 'Spring Constant', symbol: 'k', min: 1, max: 30, step: 0.5, defaultValue: 10, unit: 'N/m' }
    ],
    calculate: (x, p) => -p.k * x,
    calculateSlope: (_, p) => -p.k,
  },
  // -------- Dynamics --------
  {
    id: 'projectile-trajectory', name: 'Projectile Path', category: 'dynamics',
    description: 'Parabolic trajectory under gravity.',
    xAxisLabel: 'Range x (m)', yAxisLabel: 'Height y (m)',
    defaultXRange: [0, 100], defaultYRange: [0, 60],
    formulaDisplay: 'y(x) = x·tan(θ) - g·x²/(2v₀²·cos²θ)',
    sliders: [
      { key: 'v0', label: 'Launch Speed', symbol: 'v₀', min: 10, max: 40, step: 1, defaultValue: 25, unit: 'm/s' },
      { key: 'theta', label: 'Launch Angle', symbol: 'θ', min: 10, max: 85, step: 1, defaultValue: 45, unit: '°' },
      { key: 'g', label: 'Gravity', symbol: 'g', min: 2, max: 25, step: 0.1, defaultValue: 9.81, unit: 'm/s²' }
    ],
    calculate: (x, p) => {
      const rad = (p.theta * Math.PI) / 180;
      const t1 = x * Math.tan(rad);
      const t2 = (p.g * x * x) / (2 * p.v0 * p.v0 * Math.pow(Math.cos(rad), 2));
      return Math.max(0, t1 - t2);
    },
    calculateSlope: (x, p) => {
      const rad = (p.theta * Math.PI) / 180;
      return Math.tan(rad) - (p.g * x) / (p.v0 * p.v0 * Math.pow(Math.cos(rad), 2));
    },
  },
  {
    id: 'rocket-thrust', name: 'Rocket Thrust Curve', category: 'dynamics',
    description: 'Tsiolkovsky: Δv = ve·ln(m0/mf).',
    xAxisLabel: 'Mass ratio m₀/m', yAxisLabel: 'Δv (m/s)',
    defaultXRange: [1, 10], defaultYRange: [0, 8000],
    formulaDisplay: 'Δv = vₑ · ln(m₀/m)',
    sliders: [
      { key: 've', label: 'Exhaust Velocity', symbol: 'vₑ', min: 500, max: 5000, step: 50, defaultValue: 2500, unit: 'm/s' }
    ],
    calculate: (m, p) => p.ve * Math.log(Math.max(1.01, m)),
  },
  {
    id: 'free-fall', name: 'Free Fall Velocity', category: 'dynamics',
    description: 'v(t) with air drag (terminal velocity).',
    xAxisLabel: 'Time t (s)', yAxisLabel: 'Velocity v (m/s)',
    defaultXRange: [0, 20], defaultYRange: [0, 80],
    formulaDisplay: 'v(t) = vₜ·tanh(g·t/vₜ)',
    sliders: [
      { key: 'vt', label: 'Terminal Velocity', symbol: 'vₜ', min: 10, max: 100, step: 1, defaultValue: 55, unit: 'm/s' },
      { key: 'g', label: 'Gravity', symbol: 'g', min: 1, max: 25, step: 0.1, defaultValue: 9.81, unit: 'm/s²' }
    ],
    calculate: (t, p) => p.vt * Math.tanh((p.g * t) / p.vt),
  },
  // -------- Waves --------
  {
    id: 'sine-wave', name: 'Progressive Wave', category: 'waves',
    description: 'Sinusoidal mechanical wave y = A·sin(kx + φ).',
    xAxisLabel: 'Position x (m)', yAxisLabel: 'Amplitude y (cm)',
    defaultXRange: [0, 20], defaultYRange: [-10, 10],
    formulaDisplay: 'y(x) = A · sin(k·x + φ)',
    sliders: [
      { key: 'A', label: 'Amplitude', symbol: 'A', min: 1, max: 10, step: 0.5, defaultValue: 6, unit: 'cm' },
      { key: 'wavelength', label: 'Wavelength', symbol: 'λ', min: 2, max: 15, step: 0.5, defaultValue: 10, unit: 'm' },
      { key: 'phi', label: 'Phase Angle', symbol: 'φ', min: 0, max: 360, step: 10, defaultValue: 0, unit: '°' }
    ],
    calculate: (x, p) => {
      const k = (2 * Math.PI) / p.wavelength;
      return p.A * Math.sin(k * x + (p.phi * Math.PI) / 180);
    }
  },
  {
    id: 'damped-oscillation', name: 'Damped Oscillator', category: 'waves',
    description: 'Exponential decay sinusoid.',
    xAxisLabel: 'Time t (s)', yAxisLabel: 'Position x (m)',
    defaultXRange: [0, 8], defaultYRange: [-15, 15],
    formulaDisplay: 'x(t) = A · e^(-γt) · cos(ωt)',
    sliders: [
      { key: 'A', label: 'Amplitude', symbol: 'A', min: 2, max: 15, step: 0.5, defaultValue: 12, unit: 'm' },
      { key: 'gamma', label: 'Damping', symbol: 'γ', min: 0, max: 1.5, step: 0.05, defaultValue: 0.4, unit: '1/s' },
      { key: 'omega', label: 'Angular Speed', symbol: 'ω', min: 1, max: 8, step: 0.2, defaultValue: 4, unit: 'rad/s' }
    ],
    calculate: (t, p) => p.A * Math.exp(-p.gamma * t) * Math.cos(p.omega * t),
  },
  {
    id: 'blackbody', name: 'Blackbody Radiation', category: 'waves',
    description: 'Planck\'s law spectral radiance.',
    xAxisLabel: 'Wavelength λ (μm)', yAxisLabel: 'Intensity (a.u.)',
    defaultXRange: [0, 5], defaultYRange: [0, 1.2],
    formulaDisplay: 'B(λ,T) ∝ 1/(λ⁵·(e^(hc/λkT) - 1))',
    sliders: [
      { key: 'T', label: 'Temperature', symbol: 'T', min: 2000, max: 10000, step: 100, defaultValue: 5000, unit: 'K' }
    ],
    calculate: (lam, p) => {
      if (lam <= 0.01) return 0;
      const c1 = 1.44e4; // hc/k in μm·K
      const x = c1 / (lam * p.T);
      if (x > 500) return 0;
      const intensity = 1 / (Math.pow(lam, 5) * (Math.exp(x) - 1));
      // Normalize to ~1 at peak
      const peakLam = 2898 / p.T; // Wien's law (μm)
      const peakX = c1 / (peakLam * p.T);
      const peakI = 1 / (Math.pow(peakLam, 5) * (Math.exp(peakX) - 1));
      return Math.min(1.2, intensity / peakI);
    }
  },
  // -------- Circuits --------
  {
    id: 'rc-circuit', name: 'RC Charge / Discharge', category: 'circuits',
    description: 'Exponential RC charging curve.',
    xAxisLabel: 'Time t (s)', yAxisLabel: 'Voltage V (V)',
    defaultXRange: [0, 6], defaultYRange: [0, 12],
    formulaDisplay: 'V(t) = V₀ · (1 - e^(-t/RC))',
    sliders: [
      { key: 'V0', label: 'Battery', symbol: 'V₀', min: 3, max: 12, step: 0.5, defaultValue: 10, unit: 'V' },
      { key: 'R', label: 'Resistance', symbol: 'R', min: 1, max: 15, step: 0.5, defaultValue: 5, unit: 'kΩ' },
      { key: 'C', label: 'Capacitance', symbol: 'C', min: 20, max: 200, step: 10, defaultValue: 100, unit: 'μF' }
    ],
    calculate: (t, p) => {
      const rc = (p.R * 1000) * (p.C * 1e-6);
      return p.V0 * (1 - Math.exp(-t / rc));
    },
  },
  {
    id: 'rlc-resonance', name: 'RLC Resonance Curve', category: 'circuits',
    description: 'Current amplitude vs frequency.',
    xAxisLabel: 'Frequency f (Hz)', yAxisLabel: 'Current I (A)',
    defaultXRange: [0, 2000], defaultYRange: [0, 1.2],
    formulaDisplay: 'I(f) = V / √(R² + (2πfL - 1/(2πfC))²)',
    sliders: [
      { key: 'V', label: 'Voltage', symbol: 'V', min: 1, max: 20, step: 0.5, defaultValue: 10, unit: 'V' },
      { key: 'R', label: 'Resistance', symbol: 'R', min: 1, max: 100, step: 1, defaultValue: 20, unit: 'Ω' },
      { key: 'L', label: 'Inductance', symbol: 'L', min: 1, max: 50, step: 1, defaultValue: 10, unit: 'mH' },
      { key: 'C', label: 'Capacitance', symbol: 'C', min: 0.1, max: 5, step: 0.1, defaultValue: 1, unit: 'μF' }
    ],
    calculate: (f, p) => {
      if (f <= 0) return 0;
      const w = 2 * Math.PI * f;
      const XL = w * p.L * 1e-3;
      const XC = 1 / (w * p.C * 1e-6);
      const Z = Math.sqrt(p.R * p.R + Math.pow(XL - XC, 2));
      return p.V / Z;
    }
  },
  // -------- Thermo --------
  {
    id: 'ideal-gas', name: 'Ideal Gas (Isotherms)', category: 'thermo',
    description: 'PV = nRT — pressure vs volume.',
    xAxisLabel: 'Volume V (L)', yAxisLabel: 'Pressure P (atm)',
    defaultXRange: [1, 20], defaultYRange: [0, 10],
    formulaDisplay: 'P(V) = nRT / V',
    sliders: [
      { key: 'n', label: 'Moles', symbol: 'n', min: 0.5, max: 5, step: 0.1, defaultValue: 1, unit: 'mol' },
      { key: 'T', label: 'Temperature', symbol: 'T', min: 200, max: 800, step: 10, defaultValue: 300, unit: 'K' }
    ],
    calculate: (V, p) => {
      const R = 0.08206;
      return (p.n * R * p.T) / Math.max(0.1, V);
    }
  },
  {
    id: 'coulomb', name: 'Coulomb Force', category: 'em',
    description: 'Electric force between two charges.',
    xAxisLabel: 'Distance r (m)', yAxisLabel: 'Force F (N)',
    defaultXRange: [0.1, 3], defaultYRange: [0, 50],
    formulaDisplay: 'F(r) = k·q₁·q₂/r²',
    sliders: [
      { key: 'q1', label: 'Charge q₁', symbol: 'q₁', min: 1, max: 20, step: 1, defaultValue: 5, unit: 'μC' },
      { key: 'q2', label: 'Charge q₂', symbol: 'q₂', min: 1, max: 20, step: 1, defaultValue: 5, unit: 'μC' }
    ],
    calculate: (r, p) => {
      const k = 8.99e9;
      return (k * p.q1 * 1e-6 * p.q2 * 1e-6) / (r * r);
    }
  },
  // -------- Astro --------
  {
    id: 'gravity-inverse', name: 'Gravitational Force', category: 'astro',
    description: 'Newton: F = GMm/r².',
    xAxisLabel: 'Distance r (10⁶ m)', yAxisLabel: 'Force F (N)',
    defaultXRange: [1, 40], defaultYRange: [0, 50],
    formulaDisplay: 'F(r) = G·M·m/r²',
    sliders: [
      { key: 'M', label: 'Mass M', symbol: 'M', min: 1, max: 20, step: 0.5, defaultValue: 6, unit: '10²⁴ kg' },
      { key: 'm', label: 'Mass m', symbol: 'm', min: 1, max: 20, step: 0.5, defaultValue: 1, unit: '10²⁴ kg' }
    ],
    calculate: (r, p) => {
      const G = 6.674e-11;
      const M = p.M * 1e24;
      const m = p.m * 1e24;
      const rMeters = r * 1e6;
      return (G * M * m) / (rMeters * rMeters);
    }
  },
];

/* ============================================================
   ANIMATED SIMULATION PRESETS
   ============================================================ */
const SIM_PRESETS: SimPreset[] = [
  {
    id: 'pendulum', name: 'Simple Pendulum', category: 'mechanics',
    description: 'Swinging mass with energy transfer visualization',
    icon: <Activity size={12}/>, color: 'text-blue-500',
    sliders: [
      { key: 'L', label: 'Length', symbol: 'L', min: 0.5, max: 3, step: 0.1, defaultValue: 1.5, unit: 'm' },
      { key: 'theta0', label: 'Initial Angle', symbol: 'θ₀', min: 5, max: 80, step: 1, defaultValue: 30, unit: '°' },
      { key: 'g', label: 'Gravity', symbol: 'g', min: 1, max: 25, step: 0.1, defaultValue: 9.81, unit: 'm/s²' },
      { key: 'damp', label: 'Damping', symbol: 'β', min: 0, max: 0.5, step: 0.01, defaultValue: 0.05, unit: '' }
    ]
  },
  {
    id: 'double-pendulum', name: 'Double Pendulum', category: 'mechanics',
    description: 'Chaotic two-link system — sensitive to initial conditions',
    icon: <Activity size={12}/>, color: 'text-purple-500',
    sliders: [
      { key: 'L1', label: 'Length 1', symbol: 'L₁', min: 0.5, max: 2, step: 0.1, defaultValue: 1, unit: 'm' },
      { key: 'L2', label: 'Length 2', symbol: 'L₂', min: 0.5, max: 2, step: 0.1, defaultValue: 1, unit: 'm' },
      { key: 'm1', label: 'Mass 1', symbol: 'm₁', min: 0.5, max: 3, step: 0.1, defaultValue: 1, unit: 'kg' },
      { key: 'm2', label: 'Mass 2', symbol: 'm₂', min: 0.5, max: 3, step: 0.1, defaultValue: 1, unit: 'kg' }
    ]
  },
  {
    id: 'spring-mass', name: 'Spring-Mass System', category: 'mechanics',
    description: 'Oscillating block on a spring with energy bars',
    icon: <TrendingUp size={12}/>, color: 'text-emerald-500',
    sliders: [
      { key: 'k', label: 'Spring Constant', symbol: 'k', min: 5, max: 80, step: 1, defaultValue: 25, unit: 'N/m' },
      { key: 'm', label: 'Mass', symbol: 'm', min: 0.2, max: 3, step: 0.1, defaultValue: 1, unit: 'kg' },
      { key: 'A', label: 'Amplitude', symbol: 'A', min: 0.1, max: 1.5, step: 0.05, defaultValue: 0.8, unit: 'm' },
      { key: 'damp', label: 'Damping', symbol: 'β', min: 0, max: 2, step: 0.05, defaultValue: 0.1, unit: '' }
    ]
  },
  {
    id: 'atwood', name: 'Atwood Machine', category: 'mechanics',
    description: 'Two masses over a pulley — accelerated system',
    icon: <CircleDot size={12}/>, color: 'text-amber-500',
    sliders: [
      { key: 'm1', label: 'Mass 1', symbol: 'm₁', min: 1, max: 10, step: 0.5, defaultValue: 3, unit: 'kg' },
      { key: 'm2', label: 'Mass 2', symbol: 'm₂', min: 1, max: 10, step: 0.5, defaultValue: 5, unit: 'kg' },
      { key: 'g', label: 'Gravity', symbol: 'g', min: 1, max: 25, step: 0.1, defaultValue: 9.81, unit: 'm/s²' }
    ]
  },
  {
    id: 'collision', name: 'Elastic Collision', category: 'mechanics',
    description: 'Two balls with conservation of momentum',
    icon: <CircleDot size={12}/>, color: 'text-rose-500',
    sliders: [
      { key: 'm1', label: 'Mass 1', symbol: 'm₁', min: 1, max: 10, step: 0.5, defaultValue: 2, unit: 'kg' },
      { key: 'm2', label: 'Mass 2', symbol: 'm₂', min: 1, max: 10, step: 0.5, defaultValue: 5, unit: 'kg' },
      { key: 'v1', label: 'Velocity 1', symbol: 'v₁', min: -10, max: 10, step: 0.5, defaultValue: 4, unit: 'm/s' },
      { key: 'v2', label: 'Velocity 2', symbol: 'v₂', min: -10, max: 10, step: 0.5, defaultValue: -2, unit: 'm/s' }
    ]
  },
  {
    id: 'projectile', name: 'Projectile Motion', category: 'dynamics',
    description: 'Animated ball with trajectory trail & velocity vector',
    icon: <RocketIcon size={12}/>, color: 'text-orange-500',
    sliders: [
      { key: 'v0', label: 'Launch Speed', symbol: 'v₀', min: 5, max: 30, step: 0.5, defaultValue: 15, unit: 'm/s' },
      { key: 'theta', label: 'Angle', symbol: 'θ', min: 10, max: 85, step: 1, defaultValue: 45, unit: '°' },
      { key: 'g', label: 'Gravity', symbol: 'g', min: 1, max: 25, step: 0.1, defaultValue: 9.81, unit: 'm/s²' }
    ]
  },
  {
    id: 'rocket', name: 'Rocket Launch', category: 'dynamics',
    description: 'Thrust vs gravity with fuel consumption',
    icon: <Flame size={12}/>, color: 'text-red-500',
    sliders: [
      { key: 'thrust', label: 'Thrust', symbol: 'F', min: 10, max: 50, step: 1, defaultValue: 25, unit: 'kN' },
      { key: 'mass', label: 'Initial Mass', symbol: 'm₀', min: 500, max: 3000, step: 50, defaultValue: 1500, unit: 'kg' },
      { key: 'fuel', label: 'Fuel Burn Rate', symbol: 'ṁ', min: 5, max: 50, step: 1, defaultValue: 20, unit: 'kg/s' },
      { key: 'g', label: 'Gravity', symbol: 'g', min: 1, max: 25, step: 0.1, defaultValue: 9.81, unit: 'm/s²' }
    ]
  },
  {
    id: 'inclined-plane', name: 'Inclined Plane', category: 'dynamics',
    description: 'Block sliding with friction & force components',
    icon: <TrendingUp size={12}/>, color: 'text-yellow-600',
    sliders: [
      { key: 'theta', label: 'Angle', symbol: 'θ', min: 5, max: 70, step: 1, defaultValue: 30, unit: '°' },
      { key: 'm', label: 'Mass', symbol: 'm', min: 1, max: 20, step: 0.5, defaultValue: 5, unit: 'kg' },
      { key: 'mu', label: 'Friction μ', symbol: 'μ', min: 0, max: 1, step: 0.05, defaultValue: 0.2, unit: '' },
      { key: 'g', label: 'Gravity', symbol: 'g', min: 1, max: 25, step: 0.1, defaultValue: 9.81, unit: 'm/s²' }
    ]
  },
  {
    id: 'wave-interference', name: 'Wave Interference', category: 'waves',
    description: 'Two-source interference pattern',
    icon: <Waves size={12}/>, color: 'text-cyan-500',
    sliders: [
      { key: 'freq', label: 'Frequency', symbol: 'f', min: 0.5, max: 5, step: 0.1, defaultValue: 2, unit: 'Hz' },
      { key: 'sep', label: 'Source Separation', symbol: 'd', min: 10, max: 100, step: 5, defaultValue: 50, unit: 'px' },
      { key: 'amp', label: 'Amplitude', symbol: 'A', min: 0.5, max: 3, step: 0.1, defaultValue: 1.5, unit: '' }
    ]
  },
  {
    id: 'standing-wave', name: 'Standing Wave', category: 'waves',
    description: 'String with nodes & antinodes (harmonics)',
    icon: <Waves size={12}/>, color: 'text-sky-500',
    sliders: [
      { key: 'n', label: 'Harmonic', symbol: 'n', min: 1, max: 8, step: 1, defaultValue: 3, unit: '' },
      { key: 'amp', label: 'Amplitude', symbol: 'A', min: 0.2, max: 2, step: 0.1, defaultValue: 1, unit: '' },
      { key: 'freq', label: 'Speed', symbol: 'ω', min: 0.5, max: 5, step: 0.1, defaultValue: 2, unit: '' }
    ]
  },
  {
    id: 'doppler', name: 'Doppler Effect', category: 'waves',
    description: 'Moving source with compressed/expanded wavefronts',
    icon: <Wind size={12}/>, color: 'text-teal-500',
    sliders: [
      { key: 'vs', label: 'Source Speed', symbol: 'vₛ', min: 0, max: 1, step: 0.05, defaultValue: 0.5, unit: '·v_w' },
      { key: 'freq', label: 'Wave Freq', symbol: 'f', min: 1, max: 5, step: 0.2, defaultValue: 2, unit: 'Hz' }
    ]
  },
  {
    id: 'gas-particles', name: 'Gas Kinetic Theory', category: 'thermo',
    description: 'Molecules in a container — pressure from collisions',
    icon: <Atom size={12}/>, color: 'text-red-500',
    sliders: [
      { key: 'T', label: 'Temperature', symbol: 'T', min: 100, max: 1000, step: 10, defaultValue: 400, unit: 'K' },
      { key: 'N', label: 'Particle Count', symbol: 'N', min: 10, max: 150, step: 5, defaultValue: 60, unit: '' },
      { key: 'size', label: 'Volume', symbol: 'V', min: 0.5, max: 2, step: 0.1, defaultValue: 1, unit: '×' }
    ]
  },
  {
    id: 'orbital', name: 'Orbital Mechanics', category: 'astro',
    description: 'Planets orbiting a star — Kepler\'s laws',
    icon: <Orbit size={12}/>, color: 'text-indigo-500',
    sliders: [
      { key: 'GM', label: 'Star Mass', symbol: 'GM', min: 1, max: 10, step: 0.5, defaultValue: 4, unit: '' },
      { key: 'v0', label: 'Initial Speed', symbol: 'v₀', min: 0.5, max: 3, step: 0.1, defaultValue: 1.4, unit: '' },
      { key: 'trail', label: 'Trail Length', symbol: 'τ', min: 50, max: 500, step: 10, defaultValue: 200, unit: '' }
    ]
  },
  {
    id: 'e-field', name: 'Electric Field Lines', category: 'em',
    description: 'Field visualization around point charges',
    icon: <Magnet size={12}/>, color: 'text-pink-500',
    sliders: [
      { key: 'q1', label: 'Charge 1', symbol: 'q₁', min: -5, max: 5, step: 1, defaultValue: 2, unit: '' },
      { key: 'q2', label: 'Charge 2', symbol: 'q₂', min: -5, max: 5, step: 1, defaultValue: -2, unit: '' },
      { key: 'sep', label: 'Separation', symbol: 'd', min: 50, max: 200, step: 10, defaultValue: 120, unit: 'px' }
    ]
  },
];

/* ============================================================
   3D PRESETS (expanded)
   ============================================================ */
const PHYSICS_3D_PRESETS: Physics3DPreset[] = [
  {
    id: 'lorenz-attractor', name: 'Lorenz Attractor', category: 'dynamics',
    description: 'Chaotic atmospheric convection butterfly.',
    formulaDisplay: 'dx/dt = σ(y-x) | dy/dt = x(ρ-z) - y | dz/dt = xy - βz',
    sliders: [
      { key: 'sigma', label: 'Prandtl σ', symbol: 'σ', min: 1, max: 20, step: 0.5, defaultValue: 10, unit: '' },
      { key: 'rho', label: 'Rayleigh ρ', symbol: 'ρ', min: 10, max: 40, step: 0.5, defaultValue: 28, unit: '' },
      { key: 'beta', label: 'Ratio β', symbol: 'β', min: 1, max: 5, step: 0.1, defaultValue: 2.66, unit: '' }
    ]
  },
  {
    id: 'magnetic-solenoid', name: 'Magnetic Solenoid', category: 'em',
    description: 'Helical charge path in a solenoid coil.',
    formulaDisplay: 'r(t) = R·cos(ωt) î + R·sin(ωt) ĵ + s·t k̂',
    sliders: [
      { key: 'radius', label: 'Radius', symbol: 'R', min: 0.2, max: 1.5, step: 0.05, defaultValue: 0.8, unit: 'm' },
      { key: 'coils', label: 'Coils', symbol: 'N', min: 2, max: 12, step: 1, defaultValue: 6, unit: '' },
      { key: 'spacing', label: 'Pitch', symbol: 's', min: 0.1, max: 0.8, step: 0.05, defaultValue: 0.25, unit: 'm' }
    ]
  },
  {
    id: 'spherical-torus', name: 'Toroidal Winding', category: 'em',
    description: 'Helical path on a torus (tokamak-style).',
    formulaDisplay: 'x=(R+r·cos(pθ))·cos(qθ) | y=r·sin(pθ)',
    sliders: [
      { key: 'R', label: 'Major R', symbol: 'R', min: 0.5, max: 2, step: 0.1, defaultValue: 1.2, unit: 'm' },
      { key: 'r', label: 'Minor r', symbol: 'r', min: 0.1, max: 0.8, step: 0.05, defaultValue: 0.4, unit: 'm' },
      { key: 'p', label: 'p', symbol: 'p', min: 1, max: 18, step: 1, defaultValue: 8, unit: '' },
      { key: 'q', label: 'q', symbol: 'q', min: 1, max: 12, step: 1, defaultValue: 3, unit: '' }
    ]
  },
  {
    id: 'helmholtz', name: 'Helmholtz Coils', category: 'em',
    description: 'Uniform magnetic field between two parallel coils.',
    formulaDisplay: 'B(z) = (μ₀NI/R)·(4/5)^(-3/2)',
    sliders: [
      { key: 'R', label: 'Coil Radius', symbol: 'R', min: 0.5, max: 2, step: 0.1, defaultValue: 1.2, unit: 'm' },
      { key: 'turns', label: 'Turns', symbol: 'N', min: 20, max: 200, step: 10, defaultValue: 80, unit: '' },
      { key: 'lines', label: 'Field Lines', symbol: 'L', min: 4, max: 16, step: 2, defaultValue: 8, unit: '' }
    ]
  },
  {
    id: 'em-wave', name: 'Electromagnetic Wave', category: 'waves',
    description: 'Orthogonal E and B fields propagating.',
    formulaDisplay: 'E = E₀·sin(kx - ωt) | B = B₀·sin(kx - ωt)',
    sliders: [
      { key: 'amp', label: 'Amplitude', symbol: 'E₀', min: 0.3, max: 1.5, step: 0.1, defaultValue: 1, unit: '' },
      { key: 'lambda', label: 'Wavelength', symbol: 'λ', min: 0.5, max: 3, step: 0.1, defaultValue: 1.5, unit: 'm' },
      { key: 'cycles', label: 'Cycles', symbol: 'n', min: 1, max: 6, step: 1, defaultValue: 3, unit: '' }
    ]
  },
  {
    id: 'gravity-well', name: 'Gravity Well', category: 'astro',
    description: 'Curved spacetime funnel around a mass.',
    formulaDisplay: 'z(r) = -GM / √(r² + ε²)',
    sliders: [
      { key: 'M', label: 'Mass', symbol: 'M', min: 0.5, max: 3, step: 0.1, defaultValue: 1.5, unit: '' },
      { key: 'grid', label: 'Grid Density', symbol: 'n', min: 8, max: 24, step: 2, defaultValue: 14, unit: '' }
    ]
  },
  {
    id: 'quantum-wave', name: 'Hydrogen Orbital', category: 'em',
    description: 'Probability cloud (|ψ|² isosurface).',
    formulaDisplay: 'ψ ∝ (2 - r/a₀)·e^(-r/2a₀)',
    sliders: [
      { key: 'a', label: 'Bohr Radius', symbol: 'a₀', min: 0.3, max: 1.5, step: 0.1, defaultValue: 0.8, unit: '' },
      { key: 'samples', label: 'Samples', symbol: 'N', min: 200, max: 1500, step: 100, defaultValue: 800, unit: '' }
    ]
  },
  {
    id: 'projectile-3d', name: '3D Projectile', category: 'dynamics',
    description: 'Parabolic path in 3D with landing marker.',
    formulaDisplay: 'r(t) = v₀t·cos θ · î + (v₀t·sin θ - ½gt²) ĵ',
    sliders: [
      { key: 'v0', label: 'Speed', symbol: 'v₀', min: 5, max: 25, step: 0.5, defaultValue: 15, unit: 'm/s' },
      { key: 'theta', label: 'Elevation', symbol: 'θ', min: 10, max: 85, step: 1, defaultValue: 50, unit: '°' },
      { key: 'phi', label: 'Azimuth', symbol: 'φ', min: 0, max: 90, step: 5, defaultValue: 30, unit: '°' }
    ]
  },
];

/* ============================================================
   3D PROJECTION UTILITY
   ============================================================ */
const project3DUtil = (
  x: number, y: number, z: number,
  rotX: number, rotY: number,
  focal: number, cx: number, cy: number, scale: number
) => {
  const cyR = Math.cos(rotY), syR = Math.sin(rotY);
  const x1 = x * cyR + z * syR;
  const z1 = -x * syR + z * cyR;
  const cxR = Math.cos(rotX), sxR = Math.sin(rotX);
  const y1 = y * cxR - z1 * sxR;
  const z2 = y * sxR + z1 * cxR;
  const p = focal / (focal + z2);
  return { x: cx + x1 * p * scale, y: cy - y1 * p * scale, z: z2, p };
};

/* ============================================================
   MAIN COMPONENT
   ============================================================ */
export const PhysicsGraphCanvas: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  isInline?: boolean;
}> = ({ isOpen, onClose, isInline = false }) => {
  // ---- mode & selection ----
  const [viewMode, setViewMode] = useState<ViewMode>('graph2d');
  const [activeCategory, setActiveCategory] = useState<PhysicsCategory | 'all'>('all');
  const [selectedPreset, setSelectedPreset] = useState<PhysicsPreset>(PHYSICS_PRESETS[0]);
  const [selectedSim, setSelectedSim] = useState<SimPreset>(SIM_PRESETS[0]);
  const [selected3DPreset, setSelected3DPreset] = useState<Physics3DPreset>(PHYSICS_3D_PRESETS[0]);
  const [isOptionsPanelOpen, setIsOptionsPanelOpen] = useState(true);

  // ---- 2D graph state ----
  const [sliderVals, setSliderVals] = useState<Record<string, number>>({});
  const [interactiveHover, setInteractiveHover] = useState<number | null>(null);
  const [tangentMode, setTangentMode] = useState(true);
  const [sketchMode, setSketchMode] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [animTime, setAnimTime] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1.0);
  const [showStageMenu, setShowStageMenu] = useState(false);

  // ---- Simulation state ----
  const [simRunning, setSimRunning] = useState(true);
  const simTimeRef = useRef(0);
  const simLastTickRef = useRef(Date.now());
  const simStateRef = useRef<any>({});
  const simCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // ---- 3D state ----
  const [rotX3D, setRotX3D] = useState(-0.5);
  const [rotY3D, setRotY3D] = useState(0.7);
  const [zoom3D, setZoom3D] = useState(80);
  const [autoRotate, setAutoRotate] = useState(false);
  const [showWireframe, setShowWireframe] = useState(true);
  const [showFloor, setShowFloor] = useState(true);
  const [showAxes3D, setShowAxes3D] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const svgRef = useRef<SVGSVGElement>(null);

  // ---- Derived: filtered presets by category ----
  const filteredPresets = useMemo(() => {
    if (activeCategory === 'all') return PHYSICS_PRESETS;
    return PHYSICS_PRESETS.filter(p => p.category === activeCategory);
  }, [activeCategory]);

  const filteredSims = useMemo(() => {
    if (activeCategory === 'all') return SIM_PRESETS;
    return SIM_PRESETS.filter(s => s.category === activeCategory);
  }, [activeCategory]);

  const filtered3DPresets = useMemo(() => {
    if (activeCategory === 'all') return PHYSICS_3D_PRESETS;
    return PHYSICS_3D_PRESETS.filter(p => p.category === activeCategory);
  }, [activeCategory]);

  // ---- Initialize slider values when preset/sim/3D changes ----
  useEffect(() => {
    const target = viewMode === 'graph2d' ? selectedPreset.sliders
      : viewMode === 'sim' ? selectedSim.sliders
      : selected3DPreset.sliders;
    const defaults: Record<string, number> = {};
    target.forEach(s => { defaults[s.key] = s.defaultValue; });
    setSliderVals(defaults);
    setAnimTime(0);
    simTimeRef.current = 0;
    simStateRef.current = {};
  }, [viewMode, selectedPreset, selectedSim, selected3DPreset]);

  // ---- Active params ----
  const activeParams = useMemo(() => {
    const target = viewMode === 'graph2d' ? selectedPreset.sliders
      : viewMode === 'sim' ? selectedSim.sliders
      : selected3DPreset.sliders;
    const merged: Record<string, number> = {};
    target.forEach(s => { merged[s.key] = s.defaultValue; });
    Object.keys(sliderVals).forEach(k => {
      if (sliderVals[k] !== undefined) merged[k] = sliderVals[k];
    });
    return merged;
  }, [viewMode, selectedPreset, selectedSim, selected3DPreset, sliderVals]);

  const currentSlidersList = useMemo(() => {
    return viewMode === 'graph2d' ? selectedPreset.sliders
      : viewMode === 'sim' ? selectedSim.sliders
      : selected3DPreset.sliders;
  }, [viewMode, selectedPreset, selectedSim, selected3DPreset]);

  // ---- Graph sizing ----
  const width = 640, height = 400;
  const paddingLeft = 60, paddingRight = 30, paddingTop = 40, paddingBottom = 50;
  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

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

  const getRelativeX = (xVal: number) => paddingLeft + ((xVal - minX) / (maxX - minX)) * chartWidth;
  const getRelativeY = (yVal: number) => height - paddingBottom - ((yVal - minY) / (maxY - minY)) * chartHeight;

  // ---- 2D curve points ----
  const curvePoints = useMemo(() => {
    if (viewMode !== 'graph2d') return [];
    const seq: Array<{ x: number; y: number; px: number; py: number }> = [];
    const steps = 300;
    for (let i = 0; i <= steps; i++) {
      const xVal = minX + (i / steps) * (maxX - minX);
      try {
        const yVal = selectedPreset.calculate(xVal, activeParams);
        seq.push({ x: xVal, y: yVal, px: getRelativeX(xVal), py: getRelativeY(yVal) });
      } catch {}
    }
    return seq;
  }, [viewMode, selectedPreset, activeParams, minX, maxX, minY, maxY]);

  // ---- Animation tick for 2D graph ----
  useEffect(() => {
    if (!animating || viewMode !== 'graph2d') return;
    let animId: number;
    const tick = () => {
      setAnimTime(prev => {
        let next = prev + 0.05 * (maxX - minX) / 5;
        if (next > maxX) next = minX;
        return next;
      });
      animId = requestAnimationFrame(tick);
    };
    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [animating, viewMode, minX, maxX]);

  const animatedParticle = useMemo(() => {
    if (viewMode !== 'graph2d') return null;
    try {
      const py = selectedPreset.calculate(animTime, activeParams);
      return { x: animTime, y: py, px: getRelativeX(animTime), py: getRelativeY(py) };
    } catch { return null; }
  }, [animTime, selectedPreset, activeParams, viewMode]);

  // ---- Hover logic ----
  const activePointsCombined = useMemo(() => {
    if (interactiveHover === null || curvePoints.length === 0) return null;
    const hoverIndex = Math.min(Math.max(0, Math.floor((interactiveHover - minX) / (maxX - minX) * 300)), 300);
    return curvePoints[hoverIndex] || curvePoints[0];
  }, [interactiveHover, curvePoints, minX, maxX]);

  const tangentLinePath = useMemo(() => {
    if (!activePointsCombined || !selectedPreset.calculateSlope) return null;
    const slope = selectedPreset.calculateSlope(activePointsCombined.x, activeParams);
    const deltaX = (maxX - minX) * 0.15;
    const xStart = Math.max(minX, activePointsCombined.x - deltaX);
    const xEnd = Math.min(maxX, activePointsCombined.x + deltaX);
    const yStart = slope * (xStart - activePointsCombined.x) + activePointsCombined.y;
    const yEnd = slope * (xEnd - activePointsCombined.x) + activePointsCombined.y;
    return {
      x1: getRelativeX(xStart), y1: getRelativeY(yStart),
      x2: getRelativeX(xEnd), y2: getRelativeY(yEnd)
    };
  }, [activePointsCombined, selectedPreset, activeParams, maxX, minX]);

  // ---- 3D rendering ----
  useEffect(() => {
    if (!autoRotate || viewMode !== '3d') return;
    let raf = 0;
    const loop = () => { setRotY3D(r => r + 0.008); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [autoRotate, viewMode]);

  // Project function for 3D presets (SVG-based for existing 3D graph mode)
  const project3D = React.useCallback((x: number, y: number, z: number) => {
    const theta = rotY3D;
    const phi = rotX3D;
    const x1 = x * Math.cos(theta) - z * Math.sin(theta);
    const z1 = x * Math.sin(theta) + z * Math.cos(theta);
    const y2 = y * Math.cos(phi) - z1 * Math.sin(phi);
    const z2 = y * Math.sin(phi) + z1 * Math.cos(phi);
    const d = 5;
    const scale = 110 * zoomLevel;
    const cx = paddingLeft + chartWidth / 2;
    const cy = paddingTop + chartHeight / 2;
    const perspective = d / (d + z2);
    return { px: cx + x1 * scale * perspective, py: cy - y2 * scale * perspective, z: z2 };
  }, [rotX3D, rotY3D, chartWidth, chartHeight, paddingLeft, paddingTop, zoomLevel]);

  // 3D curves
  const curve3DPoints = useMemo(() => {
    if (viewMode !== '3d') return [];
    const points: Array<{ px: number; py: number; x: number; y: number; z: number }> = [];
    const p = activeParams;
    const id = selected3DPreset.id;

    if (id === 'lorenz-attractor') {
      let curX = 0.1, curY = 1.0, curZ = 1.0;
      const dt = 0.015;
      for (let i = 0; i < 500; i++) {
        const dx = p.sigma * (curY - curX) * dt;
        const dy = (curX * (p.rho - curZ) - curY) * dt;
        const dz = (curX * curY - p.beta * curZ) * dt;
        curX += dx; curY += dy; curZ += dz;
        const proj = project3D(curX * 0.05, curY * 0.05, (curZ - 25) * 0.05);
        points.push({ ...proj, x: curX, y: curY, z: curZ });
      }
    }
    else if (id === 'magnetic-solenoid') {
      const R = p.radius, N = p.coils, s = p.spacing;
      for (let i = 0; i <= 400; i++) {
        const t = (i / 400) * N * 2 * Math.PI;
        const x = R * Math.cos(t), z = R * Math.sin(t);
        const y = (t / (N * 2 * Math.PI)) * s * N - (s * N / 2);
        points.push({ ...project3D(x, y, z), x, y, z });
      }
    }
    else if (id === 'spherical-torus') {
      const R = p.R, r = p.r, pp = p.p, qq = p.q;
      for (let i = 0; i <= 500; i++) {
        const th = (i / 500) * 2 * Math.PI * qq;
        const x = (R + r * Math.cos(pp * th)) * Math.cos(th) * 0.7;
        const z = (R + r * Math.cos(pp * th)) * Math.sin(th) * 0.7;
        const y = r * Math.sin(pp * th) * 0.7;
        points.push({ ...project3D(x, y, z), x, y, z });
      }
    }
    else if (id === 'helmholtz') {
      const R = p.R, linesN = Math.floor(p.lines);
      // Draw two coils as circles
      for (let coil = -1; coil <= 1; coil += 2) {
        const cy = coil * R / 2;
        for (let i = 0; i <= 80; i++) {
          const th1 = (i / 80) * 2 * Math.PI;
          const th2 = ((i + 1) / 80) * 2 * Math.PI;
          const x1 = R * Math.cos(th1), z1 = R * Math.sin(th1);
          const x2 = R * Math.cos(th2), z2 = R * Math.sin(th2);
          points.push({ ...project3D(x1, cy, z1), x: x1, y: cy, z: z1 });
          points.push({ ...project3D(x2, cy, z2), x: x2, y: cy, z: z2 });
        }
      }
      // Field lines along axis
      for (let l = 0; l < linesN; l++) {
        const ang = (l / linesN) * 2 * Math.PI;
        const rStart = 0.3;
        for (let i = 0; i <= 40; i++) {
          const y = -R + (i / 40) * 2 * R;
          // Field line bulges outward in middle
          const bulge = 1 + 0.4 * Math.cos((y / R) * Math.PI);
          const x = rStart * bulge * Math.cos(ang);
          const z = rStart * bulge * Math.sin(ang);
          points.push({ ...project3D(x, y, z), x, y, z });
        }
      }
    }
    else if (id === 'em-wave') {
      const A = p.amp, lam = p.lambda, cycles = p.cycles;
      const k = (2 * Math.PI) / lam;
      // E field (y-axis)
      for (let i = 0; i <= 200; i++) {
        const x = (i / 200) * lam * cycles;
        const y = A * Math.sin(k * x);
        points.push({ ...project3D(x - lam * cycles / 2, y, 0), x, y, z: 0 });
      }
      // B field (z-axis)
      for (let i = 0; i <= 200; i++) {
        const x = (i / 200) * lam * cycles;
        const z = A * Math.sin(k * x);
        points.push({ ...project3D(x - lam * cycles / 2, 0, z), x, y: 0, z });
      }
    }
    else if (id === 'gravity-well') {
      const M = p.M, n = Math.floor(p.grid);
      const extent = 2.5;
      // Radial grid lines
      for (let i = 0; i < n; i++) {
        const ang = (i / n) * 2 * Math.PI;
        for (let j = 0; j <= 30; j++) {
          const r = (j / 30) * extent;
          const x = r * Math.cos(ang);
          const z = r * Math.sin(ang);
          const y = -M / Math.sqrt(r * r + 0.1) + 1;
          points.push({ ...project3D(x, y, z), x, y, z });
        }
      }
      // Circular rings
      for (let j = 1; j <= 6; j++) {
        const r = (j / 6) * extent;
        const y = -M / Math.sqrt(r * r + 0.1) + 1;
        for (let i = 0; i <= 60; i++) {
          const ang = (i / 60) * 2 * Math.PI;
          const x = r * Math.cos(ang);
          const z = r * Math.sin(ang);
          points.push({ ...project3D(x, y, z), x, y, z });
        }
      }
    }
    else if (id === 'quantum-wave') {
      const a = p.a, N = Math.floor(p.samples);
      // Sample points in 3D; keep those with high |ψ|²
      const pts: Array<{x:number;y:number;z:number;prob:number}> = [];
      for (let i = 0; i < N * 4; i++) {
        // Random spherical
        const r = -a * 4 * Math.log(Math.random() + 0.001);
        const th = Math.random() * 2 * Math.PI;
        const phi = Math.acos(2 * Math.random() - 1);
        const x = r * Math.sin(phi) * Math.cos(th);
        const y = r * Math.sin(phi) * Math.sin(th);
        const z = r * Math.cos(phi);
        // 2s orbital ψ ∝ (2 - r/a)·e^(-r/2a)
        const rr = Math.sqrt(x*x + y*y + z*z);
        const psi = (2 - rr / a) * Math.exp(-rr / (2 * a));
        const prob = psi * psi;
        if (Math.random() < prob * 3) pts.push({x, y, z, prob});
      }
      pts.slice(0, N).forEach(pt => {
        points.push({ ...project3D(pt.x, pt.y, pt.z), x: pt.x, y: pt.y, z: pt.z });
      });
    }
    else if (id === 'projectile-3d') {
      const v0 = p.v0, theta = (p.theta * Math.PI) / 180, phi = (p.phi * Math.PI) / 180;
      const g = 9.81;
      const T = (2 * v0 * Math.sin(theta)) / g;
      for (let i = 0; i <= 80; i++) {
        const t = (i / 80) * T;
        const horiz = v0 * Math.cos(theta) * t;
        const x = horiz * Math.cos(phi) * 0.1;
        const z = horiz * Math.sin(phi) * 0.1;
        const y = (v0 * Math.sin(theta) * t - 0.5 * g * t * t) * 0.1;
        points.push({ ...project3D(x, y, z), x, y, z });
      }
    }

    return points;
  }, [viewMode, selected3DPreset, activeParams, project3D]);

  // ---- SIMULATION LOOP (canvas-based) ----
  useEffect(() => {
    if (viewMode !== 'sim' || !simRunning) return;
    let rafId: number;
    const tick = () => {
      const now = Date.now();
      const dt = Math.min(0.05, (now - simLastTickRef.current) / 1000);
      simLastTickRef.current = now;
      simTimeRef.current += dt;
      drawSimulation();
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [viewMode, simRunning, activeParams, selectedSim]);

  // Also redraw when paused but params change
  useEffect(() => {
    if (viewMode === 'sim') drawSimulation();
  }, [activeParams, selectedSim, viewMode]);

  /* ============================================================
     SIMULATION DRAW ROUTER
     ============================================================ */
  const drawSimulation = () => {
    const canvas = simCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const W = canvas.width, H = canvas.height;
    const isDark = document.documentElement.classList.contains('dark');
    ctx.clearRect(0, 0, W, H);

    // Background
    const bg = ctx.createRadialGradient(W/2, H/2, 0, W/2, H/2, W*0.7);
    if (isDark) {
      bg.addColorStop(0, '#0a0a0f');
      bg.addColorStop(1, '#000000');
    } else {
      bg.addColorStop(0, '#fafafa');
      bg.addColorStop(1, '#f1f5f9');
    }
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    const id = selectedSim.id;
    const p = activeParams;
    const t = simTimeRef.current;

    if (id === 'pendulum') drawPendulum(ctx, W, H, p, t, isDark);
    else if (id === 'double-pendulum') drawDoublePendulum(ctx, W, H, p, t, isDark);
    else if (id === 'spring-mass') drawSpringMass(ctx, W, H, p, t, isDark);
    else if (id === 'atwood') drawAtwood(ctx, W, H, p, t, isDark);
    else if (id === 'collision') drawCollision(ctx, W, H, p, t, isDark);
    else if (id === 'projectile') drawProjectile(ctx, W, H, p, t, isDark);
    else if (id === 'rocket') drawRocket(ctx, W, H, p, t, isDark);
    else if (id === 'inclined-plane') drawInclinedPlane(ctx, W, H, p, t, isDark);
    else if (id === 'wave-interference') drawWaveInterference(ctx, W, H, p, t, isDark);
    else if (id === 'standing-wave') drawStandingWave(ctx, W, H, p, t, isDark);
    else if (id === 'doppler') drawDoppler(ctx, W, H, p, t, isDark);
    else if (id === 'gas-particles') drawGasParticles(ctx, W, H, p, t, isDark);
    else if (id === 'orbital') drawOrbital(ctx, W, H, p, t, isDark);
    else if (id === 'e-field') drawElectricField(ctx, W, H, p, t, isDark);
  };

  /* ============================================================
     INDIVIDUAL SIMULATION RENDERERS
     ============================================================ */

  const drawPendulum = (ctx: CanvasRenderingContext2D, W: number, H: number, p: any, t: number, dark: boolean) => {
    const L = p.L * 80; // px
    const g = p.g;
    const omega = Math.sqrt(g / p.L);
    const theta0 = (p.theta0 * Math.PI) / 180;
    const damp = Math.exp(-p.damp * t);
    const theta = theta0 * Math.cos(omega * t) * damp;

    const pivotX = W / 2, pivotY = 60;
    const bobX = pivotX + L * Math.sin(theta);
    const bobY = pivotY + L * Math.cos(theta);

    // Trail
    if (!simStateRef.current.pendTrail) simStateRef.current.pendTrail = [];
    simStateRef.current.pendTrail.push({ x: bobX, y: bobY });
    if (simStateRef.current.pendTrail.length > 120) simStateRef.current.pendTrail.shift();
    const trail = simStateRef.current.pendTrail;
    for (let i = 0; i < trail.length - 1; i++) {
      const alpha = i / trail.length;
      ctx.strokeStyle = `rgba(59,130,246,${alpha * 0.6})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(trail[i].x, trail[i].y);
      ctx.lineTo(trail[i+1].x, trail[i+1].y);
      ctx.stroke();
    }

    // Rod
    ctx.strokeStyle = dark ? '#cbd5e1' : '#475569';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(pivotX, pivotY); ctx.lineTo(bobX, bobY); ctx.stroke();

    // Pivot
    ctx.fillStyle = dark ? '#94a3b8' : '#64748b';
    ctx.beginPath(); ctx.arc(pivotX, pivotY, 6, 0, Math.PI * 2); ctx.fill();

    // Bob
    const bobGrad = ctx.createRadialGradient(bobX - 4, bobY - 4, 2, bobX, bobY, 20);
    bobGrad.addColorStop(0, '#60a5fa');
    bobGrad.addColorStop(1, '#1d4ed8');
    ctx.fillStyle = bobGrad;
    ctx.shadowBlur = 10; ctx.shadowColor = '#3b82f6';
    ctx.beginPath(); ctx.arc(bobX, bobY, 18, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;

    // Energy bars
    const v = theta0 * omega * L * Math.abs(Math.sin(omega * t)) * damp;
    const KE = 0.5 * v * v;
    const h = L * (1 - Math.cos(theta));
    const PE = g * h * 10;
    const maxE = 0.5 * Math.pow(theta0 * omega * L, 2) + g * L * (1 - Math.cos(theta0)) * 10;
    const barW = 120, barH = 10;
    ctx.fillStyle = dark ? '#1e293b' : '#e2e8f0';
    ctx.fillRect(20, H - 60, barW, barH);
    ctx.fillRect(20, H - 40, barW, barH);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(20, H - 60, (KE / maxE) * barW, barH);
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(20, H - 40, (PE / maxE) * barW, barH);
    ctx.fillStyle = dark ? '#fff' : '#000';
    ctx.font = 'bold 10px monospace';
    ctx.fillText(`KE: ${KE.toFixed(1)} J`, 150, H - 52);
    ctx.fillText(`PE: ${PE.toFixed(1)} J`, 150, H - 32);
    ctx.fillText(`θ = ${(theta * 180 / Math.PI).toFixed(1)}°`, 20, 30);
    ctx.fillText(`T = ${(2 * Math.PI / omega).toFixed(2)} s`, 20, 45);
  };

  const drawDoublePendulum = (ctx: CanvasRenderingContext2D, W: number, H: number, p: any, t: number, dark: boolean) => {
    // Numerical RK4 integration
    if (!simStateRef.current.dp) {
      simStateRef.current.dp = {
        t1: Math.PI / 2, t2: Math.PI / 2,
        w1: 0, w2: 0,
        trail: []
      };
    }
    const s = simStateRef.current.dp;
    const g = 9.81;
    const { L1, L2, m1, m2 } = p;
    const dt = 0.02;

    // Derivatives
    const deriv = (t1: number, t2: number, w1: number, w2: number) => {
      const d = t1 - t2;
      const den1 = (2 * m1 + m2 - m2 * Math.cos(2 * d));
      const a1 = (-g * (2 * m1 + m2) * Math.sin(t1) - m2 * g * Math.sin(t1 - 2 * t2) - 2 * Math.sin(d) * m2 * (w2 * w2 * L2 + w1 * w1 * L1 * Math.cos(d))) / (L1 * den1);
      const a2 = (2 * Math.sin(d) * (w1 * w1 * L1 * (m1 + m2) + g * (m1 + m2) * Math.cos(t1) + w2 * w2 * L2 * m2 * Math.cos(d))) / (L2 * den1);
      return [w1, w2, a1, a2];
    };

    // RK4
    for (let step = 0; step < 3; step++) {
      const k1 = deriv(s.t1, s.t2, s.w1, s.w2);
      const k2 = deriv(s.t1 + dt/2 * k1[0], s.t2 + dt/2 * k1[1], s.w1 + dt/2 * k1[2], s.w2 + dt/2 * k1[3]);
      const k3 = deriv(s.t1 + dt/2 * k2[0], s.t2 + dt/2 * k2[1], s.w1 + dt/2 * k2[2], s.w2 + dt/2 * k2[3]);
      const k4 = deriv(s.t1 + dt * k3[0], s.t2 + dt * k3[1], s.w1 + dt * k3[2], s.w2 + dt * k3[3]);
      s.t1 += dt/6 * (k1[0] + 2*k2[0] + 2*k3[0] + k4[0]);
      s.t2 += dt/6 * (k1[1] + 2*k2[1] + 2*k3[1] + k4[1]);
      s.w1 += dt/6 * (k1[2] + 2*k2[2] + 2*k3[2] + k4[2]);
      s.w2 += dt/6 * (k1[3] + 2*k2[3] + 2*k3[3] + k4[3]);
    }

    const scale = 70;
    const pivotX = W / 2, pivotY = 70;
    const x1 = pivotX + L1 * scale * Math.sin(s.t1);
    const y1 = pivotY + L1 * scale * Math.cos(s.t1);
    const x2 = x1 + L2 * scale * Math.sin(s.t2);
    const y2 = y1 + L2 * scale * Math.cos(s.t2);

    // Trail of second bob
    s.trail.push({ x: x2, y: y2 });
    if (s.trail.length > 400) s.trail.shift();
    for (let i = 0; i < s.trail.length - 1; i++) {
      const alpha = i / s.trail.length;
      ctx.strokeStyle = `rgba(168,85,247,${alpha * 0.8})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(s.trail[i].x, s.trail[i].y);
      ctx.lineTo(s.trail[i+1].x, s.trail[i+1].y);
      ctx.stroke();
    }

    // Rods
    ctx.strokeStyle = dark ? '#cbd5e1' : '#475569';
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(pivotX, pivotY); ctx.lineTo(x1, y1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();

    // Pivot
    ctx.fillStyle = '#64748b';
    ctx.beginPath(); ctx.arc(pivotX, pivotY, 5, 0, Math.PI * 2); ctx.fill();

    // Bobs
    ctx.fillStyle = '#a855f7';
    ctx.shadowBlur = 10; ctx.shadowColor = '#a855f7';
    ctx.beginPath(); ctx.arc(x1, y1, 12 + m1 * 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ec4899';
    ctx.shadowColor = '#ec4899';
    ctx.beginPath(); ctx.arc(x2, y2, 12 + m2 * 3, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = dark ? '#fff' : '#000';
    ctx.font = 'bold 10px monospace';
    ctx.fillText('Chaotic Motion — sensitive to initial conditions', 15, 25);
  };

  const drawSpringMass = (ctx: CanvasRenderingContext2D, W: number, H: number, p: any, t: number, dark: boolean) => {
    const omega = Math.sqrt(p.k / p.m);
    const x = p.A * Math.cos(omega * t) * Math.exp(-p.damp * t);
    const v = -p.A * omega * Math.sin(omega * t) * Math.exp(-p.damp * t);

    const wallX = 40, anchorY = H / 2;
    const blockW = 50, blockH = 50;
    const restLen = 150;
    const blockX = wallX + restLen + x * 100;

    // Wall
    ctx.fillStyle = dark ? '#475569' : '#64748b';
    ctx.fillRect(20, anchorY - 60, 20, 120);
    // Hatch marks
    ctx.strokeStyle = dark ? '#334155' : '#94a3b8';
    ctx.lineWidth = 1;
    for (let i = 0; i < 8; i++) {
      ctx.beginPath();
      ctx.moveTo(20, anchorY - 55 + i * 15);
      ctx.lineTo(30, anchorY - 65 + i * 15);
      ctx.stroke();
    }

    // Spring (zigzag)
    const coils = 12;
    const springLen = blockX - wallX - blockW / 2;
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(wallX, anchorY);
    for (let i = 0; i <= coils; i++) {
      const xx = wallX + (i / coils) * springLen;
      const yy = anchorY + (i % 2 === 0 ? -10 : 10);
      ctx.lineTo(xx, yy);
    }
    ctx.lineTo(blockX - blockW / 2, anchorY);
    ctx.stroke();

    // Block
    const blockGrad = ctx.createLinearGradient(blockX - blockW/2, anchorY - blockH/2, blockX + blockW/2, anchorY + blockH/2);
    blockGrad.addColorStop(0, '#60a5fa');
    blockGrad.addColorStop(1, '#1e40af');
    ctx.fillStyle = blockGrad;
    ctx.shadowBlur = 8; ctx.shadowColor = '#3b82f6';
    ctx.fillRect(blockX - blockW / 2, anchorY - blockH / 2, blockW, blockH);
    ctx.shadowBlur = 0;

    // Mass label
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${p.m.toFixed(1)}kg`, blockX, anchorY + 5);
    ctx.textAlign = 'left';

    // Floor
    ctx.strokeStyle = dark ? '#475569' : '#94a3b8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(20, anchorY + blockH / 2 + 10);
    ctx.lineTo(W - 20, anchorY + blockH / 2 + 10);
    ctx.stroke();

    // Energy bars
    const KE = 0.5 * p.m * v * v;
    const PE = 0.5 * p.k * x * x;
    const E = KE + PE;
    const maxE = 0.5 * p.k * p.A * p.A;
    const barW = 180, barH = 12;
    ctx.fillStyle = dark ? '#1e293b' : '#e2e8f0';
    ctx.fillRect(W - 200, 40, barW, barH);
    ctx.fillRect(W - 200, 60, barW, barH);
    ctx.fillRect(W - 200, 80, barW, barH);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(W - 200, 40, (KE / maxE) * barW, barH);
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(W - 200, 60, (PE / maxE) * barW, barH);
    ctx.fillStyle = '#10b981';
    ctx.fillRect(W - 200, 80, (E / maxE) * barW, barH);
    ctx.fillStyle = dark ? '#fff' : '#000';
    ctx.font = 'bold 10px monospace';
    ctx.fillText(`KE: ${KE.toFixed(2)} J`, W - 200, 35);
    ctx.fillText(`PE: ${PE.toFixed(2)} J`, W - 200, 55);
    ctx.fillText(`Total E: ${E.toFixed(2)} J`, W - 200, 75);
    ctx.fillText(`x = ${x.toFixed(3)} m`, 20, 30);
    ctx.fillText(`ω = ${omega.toFixed(2)} rad/s`, 20, 45);
    ctx.fillText(`T = ${(2 * Math.PI / omega).toFixed(2)} s`, 20, 60);
  };

  const drawAtwood = (ctx: CanvasRenderingContext2D, W: number, H: number, p: any, t: number, dark: boolean) => {
    const { m1, m2, g } = p;
    const a = ((m2 - m1) * g) / (m1 + m2);
    const maxT = 3;
    const tClamped = Math.min(t % (maxT * 2), maxT);
    const dir = (Math.floor(t / maxT) % 2) === 0 ? 1 : -1;
    const s = 0.5 * a * tClamped * tClamped * dir;

    const pulleyX = W / 2, pulleyY = 80, pulleyR = 30;
    const ropeLen = 180;
    const leftY = pulleyY + ropeLen + s * 20;
    const rightY = pulleyY + ropeLen - s * 20;

    // Pulley
    ctx.strokeStyle = dark ? '#94a3b8' : '#475569';
    ctx.fillStyle = dark ? '#334155' : '#cbd5e1';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(pulleyX, pulleyY, pulleyR, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    // Rotating spokes
    const spokeAngle = s * 0.1;
    for (let i = 0; i < 4; i++) {
      const ang = spokeAngle + (i * Math.PI) / 2;
      ctx.beginPath();
      ctx.moveTo(pulleyX, pulleyY);
      ctx.lineTo(pulleyX + Math.cos(ang) * pulleyR * 0.9, pulleyY + Math.sin(ang) * pulleyR * 0.9);
      ctx.stroke();
    }

    // Rope
    ctx.strokeStyle = dark ? '#fbbf24' : '#a16207';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(pulleyX - pulleyR, pulleyY);
    ctx.lineTo(pulleyX - pulleyR, leftY);
    ctx.moveTo(pulleyX + pulleyR, pulleyY);
    ctx.lineTo(pulleyX + pulleyR, rightY);
    ctx.stroke();
    // Over top
    ctx.beginPath();
    ctx.arc(pulleyX, pulleyY, pulleyR, Math.PI, 0);
    ctx.stroke();

    // Mass 1 (left)
    const m1W = 35 + m1 * 2, m1H = 35 + m1 * 2;
    ctx.fillStyle = '#3b82f6';
    ctx.shadowBlur = 8; ctx.shadowColor = '#3b82f6';
    ctx.fillRect(pulleyX - pulleyR - m1W / 2, leftY, m1W, m1H);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${m1}kg`, pulleyX - pulleyR, leftY + m1H / 2 + 4);

    // Mass 2 (right)
    const m2W = 35 + m2 * 2, m2H = 35 + m2 * 2;
    ctx.fillStyle = '#ef4444';
    ctx.shadowBlur = 8; ctx.shadowColor = '#ef4444';
    ctx.fillRect(pulleyX + pulleyR - m2W / 2, rightY, m2W, m2H);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff';
    ctx.fillText(`${m2}kg`, pulleyX + pulleyR, rightY + m2H / 2 + 4);
    ctx.textAlign = 'left';

    // Info
    ctx.fillStyle = dark ? '#fff' : '#000';
    ctx.font = 'bold 10px monospace';
    ctx.fillText(`a = ${a.toFixed(3)} m/s²`, 20, 30);
    ctx.fillText(`T = ${(2 * m1 * m2 * g / (m1 + m2)).toFixed(2)} N`, 20, 45);
    ctx.fillText(`Net force: ${((m2 - m1) * g).toFixed(2)} N`, 20, 60);
  };

  const drawCollision = (ctx: CanvasRenderingContext2D, W: number, H: number, p: any, t: number, dark: boolean) => {
    if (!simStateRef.current.coll) {
      simStateRef.current.coll = {
        x1: 80, x2: W - 120,
        v1: p.v1 * 20, v2: p.v2 * 20,
        collided: false
      };
    }
    const s = simStateRef.current.coll;
    // Reset if params change
    if (Math.abs(s.v1 - p.v1 * 20) > 0.01 || Math.abs(s.v2 - p.v2 * 20) > 0.01) {
      s.x1 = 80; s.x2 = W - 120; s.v1 = p.v1 * 20; s.v2 = p.v2 * 20; s.collided = false;
    }

    const r1 = 15 + p.m1 * 3;
    const r2 = 15 + p.m2 * 3;
    const y = H / 2;

    // Update positions
    s.x1 += s.v1 * 0.016;
    s.x2 += s.v2 * 0.016;

    // Collision check
    if (!s.collided && Math.abs(s.x1 - s.x2) <= r1 + r2) {
      // Elastic collision formulas
      const u1 = s.v1, u2 = s.v2;
      s.v1 = ((p.m1 - p.m2) * u1 + 2 * p.m2 * u2) / (p.m1 + p.m2);
      s.v2 = ((p.m2 - p.m1) * u2 + 2 * p.m1 * u1) / (p.m1 + p.m2);
      s.collided = true;
    }

    // Reset if out of bounds
    if (s.x1 < -50 || s.x1 > W + 50 || s.x2 < -50 || s.x2 > W + 50) {
      s.x1 = 80; s.x2 = W - 120; s.v1 = p.v1 * 20; s.v2 = p.v2 * 20; s.collided = false;
    }

    // Floor
    ctx.strokeStyle = dark ? '#475569' : '#94a3b8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(20, y + r1 + 20);
    ctx.lineTo(W - 20, y + r1 + 20);
    ctx.stroke();

    // Ball 1
    const grad1 = ctx.createRadialGradient(s.x1 - 5, y - 5, 2, s.x1, y, r1);
    grad1.addColorStop(0, '#60a5fa'); grad1.addColorStop(1, '#1d4ed8');
    ctx.fillStyle = grad1;
    ctx.shadowBlur = 10; ctx.shadowColor = '#3b82f6';
    ctx.beginPath(); ctx.arc(s.x1, y, r1, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;

    // Ball 2
    const grad2 = ctx.createRadialGradient(s.x2 - 5, y - 5, 2, s.x2, y, r2);
    grad2.addColorStop(0, '#f87171'); grad2.addColorStop(1, '#b91c1c');
    ctx.fillStyle = grad2;
    ctx.shadowBlur = 10; ctx.shadowColor = '#ef4444';
    ctx.beginPath(); ctx.arc(s.x2, y, r2, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;

    // Velocity arrows
    const drawArrow = (x: number, v: number, color: string) => {
      const len = v * 2;
      ctx.strokeStyle = color; ctx.fillStyle = color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x, y - r1 - 15);
      ctx.lineTo(x + len, y - r1 - 15);
      ctx.stroke();
      // Arrow head
      const dir = Math.sign(len);
      ctx.beginPath();
      ctx.moveTo(x + len, y - r1 - 15);
      ctx.lineTo(x + len - dir * 8, y - r1 - 20);
      ctx.lineTo(x + len - dir * 8, y - r1 - 10);
      ctx.closePath(); ctx.fill();
    };
    drawArrow(s.x1, s.v1, '#3b82f6');
    drawArrow(s.x2, s.v2, '#ef4444');

    // Info
    const pTotal = p.m1 * s.v1 / 20 + p.m2 * s.v2 / 20;
    const KE = 0.5 * p.m1 * Math.pow(s.v1 / 20, 2) + 0.5 * p.m2 * Math.pow(s.v2 / 20, 2);
    ctx.fillStyle = dark ? '#fff' : '#000';
    ctx.font = 'bold 10px monospace';
    ctx.fillText(`v₁ = ${(s.v1 / 20).toFixed(2)} m/s`, 20, 30);
    ctx.fillText(`v₂ = ${(s.v2 / 20).toFixed(2)} m/s`, 20, 45);
    ctx.fillText(`p (total) = ${pTotal.toFixed(2)} kg·m/s`, 20, 60);
    ctx.fillText(`KE = ${KE.toFixed(2)} J`, 20, 75);
    ctx.fillText(s.collided ? '✓ Collision occurred' : '● Pre-collision', 20, H - 20);
  };

  const drawProjectile = (ctx: CanvasRenderingContext2D, W: number, H: number, p: any, t: number, dark: boolean) => {
    const { v0, theta, g } = p;
    const rad = (theta * Math.PI) / 180;
    const T = (2 * v0 * Math.sin(rad)) / g;
    const R = (v0 * v0 * Math.sin(2 * rad)) / g;
    const Hmax = (v0 * v0 * Math.sin(rad) * Math.sin(rad)) / (2 * g);

    const scale = Math.min((W - 80) / Math.max(R, 1), (H - 120) / Math.max(Hmax, 1)) * 0.9;
    const originX = 50, originY = H - 50;

    const tLoop = t % (T + 1);
    const tCur = Math.min(tLoop, T);
    const x = v0 * Math.cos(rad) * tCur;
    const y = v0 * Math.sin(rad) * tCur - 0.5 * g * tCur * tCur;

    // Trail
    if (!simStateRef.current.projTrail) simStateRef.current.projTrail = [];
    if (tCur < T) simStateRef.current.projTrail.push({ x, y });
    else simStateRef.current.projTrail = [];
    const trail = simStateRef.current.projTrail;
    ctx.strokeStyle = 'rgba(249,115,22,0.5)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    for (let i = 0; i < trail.length; i++) {
      const px = originX + trail[i].x * scale;
      const py = originY - trail[i].y * scale;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Predicted full path
    ctx.strokeStyle = dark ? 'rgba(249,115,22,0.3)' : 'rgba(234,88,12,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i <= 50; i++) {
      const tt = (i / 50) * T;
      const xx = v0 * Math.cos(rad) * tt;
      const yy = v0 * Math.sin(rad) * tt - 0.5 * g * tt * tt;
      const px = originX + xx * scale;
      const py = originY - yy * scale;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Ground
    ctx.strokeStyle = dark ? '#475569' : '#94a3b8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(20, originY); ctx.lineTo(W - 20, originY);
    ctx.stroke();

    // Cannon
    ctx.fillStyle = dark ? '#334155' : '#64748b';
    ctx.save();
    ctx.translate(originX, originY);
    ctx.rotate(-rad);
    ctx.fillRect(0, -6, 35, 12);
    ctx.restore();
    ctx.beginPath(); ctx.arc(originX, originY, 10, 0, Math.PI * 2); ctx.fill();

    // Ball
    const bx = originX + x * scale;
    const by = originY - y * scale;
    const grad = ctx.createRadialGradient(bx - 3, by - 3, 1, bx, by, 12);
    grad.addColorStop(0, '#fbbf24'); grad.addColorStop(1, '#c2410c');
    ctx.fillStyle = grad;
    ctx.shadowBlur = 12; ctx.shadowColor = '#f97316';
    ctx.beginPath(); ctx.arc(bx, by, 10, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;

    // Velocity vector
    const vx = v0 * Math.cos(rad);
    const vy = v0 * Math.sin(rad) - g * tCur;
    const vScale = 1.5;
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx + vx * vScale, by - vy * vScale);
    ctx.stroke();

    // Landing marker
    if (tCur >= T) {
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(originX + R * scale - 8, originY);
      ctx.lineTo(originX + R * scale + 8, originY - 10);
      ctx.moveTo(originX + R * scale + 8, originY);
      ctx.lineTo(originX + R * scale - 8, originY - 10);
      ctx.stroke();
    }

    ctx.fillStyle = dark ? '#fff' : '#000';
    ctx.font = 'bold 10px monospace';
    ctx.fillText(`R = ${R.toFixed(1)} m`, 20, 30);
    ctx.fillText(`H = ${Hmax.toFixed(1)} m`, 20, 45);
    ctx.fillText(`T = ${T.toFixed(2)} s`, 20, 60);
    ctx.fillText(`v = ${Math.hypot(vx, vy).toFixed(1)} m/s`, 20, 75);
  };

  const drawRocket = (ctx: CanvasRenderingContext2D, W: number, H: number, p: any, t: number, dark: boolean) => {
    const { thrust, mass, fuel, g } = p;
    const thrustN = thrust * 1000;
    const burnTime = mass * 0.5 / fuel; // seconds of fuel
    const tClamped = Math.min(t, burnTime + 5);
    const burning = tClamped < burnTime;

    // Compute trajectory
    let y = 0, v = 0, currentMass = mass;
    const dt = 0.05;
    for (let tt = 0; tt < tClamped; tt += dt) {
      if (tt < burnTime) {
        currentMass -= fuel * dt;
        const a = thrustN / currentMass - g;
        v += a * dt;
      } else {
        v -= g * dt;
      }
      y += v * dt;
      if (y < 0 && tt > 0.5) { y = 0; v = 0; break; }
    }

    // Scale view
    const maxAlt = Math.max(100, (thrustN / (mass * 0.5) - g) * burnTime * burnTime * 0.3);
    const scale = (H - 120) / maxAlt;
    const rocketScreenY = H - 60 - y * scale;

    // Sky gradient
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    if (dark) {
      sky.addColorStop(0, '#020617');
      sky.addColorStop(0.7, '#1e1b4b');
      sky.addColorStop(1, '#431407');
    } else {
      sky.addColorStop(0, '#bae6fd');
      sky.addColorStop(0.7, '#fef3c7');
      sky.addColorStop(1, '#fed7aa');
    }
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    // Stars if high altitude
    if (y > maxAlt * 0.3) {
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      for (let i = 0; i < 30; i++) {
        const sx = (i * 37) % W;
        const sy = (i * 53) % (H / 2);
        ctx.fillRect(sx, sy, 2, 2);
      }
    }

    // Ground
    ctx.fillStyle = dark ? '#1e293b' : '#65a30d';
    ctx.fillRect(0, H - 60, W, 60);

    // Launch tower
    ctx.strokeStyle = dark ? '#64748b' : '#475569';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(W / 2 + 30, H - 60);
    ctx.lineTo(W / 2 + 30, H - 120);
    ctx.stroke();

    // Rocket body
    const rx = W / 2;
    const ry = rocketScreenY;
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.moveTo(rx, ry - 35);
    ctx.lineTo(rx + 10, ry - 15);
    ctx.lineTo(rx + 10, ry + 15);
    ctx.lineTo(rx - 10, ry + 15);
    ctx.lineTo(rx - 10, ry - 15);
    ctx.closePath();
    ctx.fill();
    // Nose cone
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(rx, ry - 45);
    ctx.lineTo(rx + 10, ry - 25);
    ctx.lineTo(rx - 10, ry - 25);
    ctx.closePath();
    ctx.fill();
    // Window
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath(); ctx.arc(rx, ry - 10, 4, 0, Math.PI * 2); ctx.fill();
    // Fins
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(rx - 10, ry + 15);
    ctx.lineTo(rx - 18, ry + 25);
    ctx.lineTo(rx - 10, ry + 20);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(rx + 10, ry + 15);
    ctx.lineTo(rx + 18, ry + 25);
    ctx.lineTo(rx + 10, ry + 20);
    ctx.closePath(); ctx.fill();

    // Flame
    if (burning) {
      const flameLen = 20 + Math.random() * 15;
      const flameGrad = ctx.createLinearGradient(rx, ry + 15, rx, ry + 15 + flameLen);
      flameGrad.addColorStop(0, '#fef3c7');
      flameGrad.addColorStop(0.3, '#f97316');
      flameGrad.addColorStop(1, 'rgba(239,68,68,0)');
      ctx.fillStyle = flameGrad;
      ctx.shadowBlur = 20; ctx.shadowColor = '#f97316';
      ctx.beginPath();
      ctx.moveTo(rx - 7, ry + 15);
      ctx.lineTo(rx, ry + 15 + flameLen);
      ctx.lineTo(rx + 7, ry + 15);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Altitude scale
    ctx.strokeStyle = dark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)';
    ctx.fillStyle = dark ? '#fff' : '#000';
    ctx.font = '9px monospace';
    ctx.lineWidth = 1;
    for (let alt = 0; alt <= maxAlt; alt += maxAlt / 5) {
      const yLine = H - 60 - alt * scale;
      if (yLine < 10) break;
      ctx.beginPath();
      ctx.moveTo(W - 40, yLine);
      ctx.lineTo(W - 20, yLine);
      ctx.stroke();
      ctx.fillText(`${Math.round(alt)}m`, W - 60, yLine + 3);
    }

    ctx.fillStyle = dark ? '#fff' : '#000';
    ctx.font = 'bold 10px monospace';
    ctx.fillText(`Altitude: ${y.toFixed(1)} m`, 20, 30);
    ctx.fillText(`Velocity: ${v.toFixed(1)} m/s`, 20, 45);
    ctx.fillText(`Mass: ${currentMass.toFixed(0)} kg`, 20, 60);
    ctx.fillText(`Thrust: ${burning ? thrustN.toFixed(0) : 0} N`, 20, 75);
    ctx.fillText(`Fuel: ${Math.max(0, mass * 0.5 - fuel * Math.min(tClamped, burnTime)).toFixed(0)} kg`, 20, 90);
  };

  const drawInclinedPlane = (ctx: CanvasRenderingContext2D, W: number, H: number, p: any, t: number, dark: boolean) => {
    const rad = (p.theta * Math.PI) / 180;
    const a = p.g * (Math.sin(rad) - p.mu * Math.cos(rad));
    const sliding = a > 0;

    // Triangle base
    const baseX = 50, baseY = H - 60;
    const topX = W - 100, topY = baseY - Math.tan(rad) * (topX - baseX);
    const rampLen = Math.hypot(topX - baseX, topY - baseY);

    // Ramp
    ctx.fillStyle = dark ? '#334155' : '#cbd5e1';
    ctx.beginPath();
    ctx.moveTo(baseX, baseY);
    ctx.lineTo(topX, topY);
    ctx.lineTo(topX, baseY);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = dark ? '#64748b' : '#475569';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Block on ramp
    const blockSize = 30;
    let s = 0.5 * a * (t * t);
    const maxS = rampLen - blockSize;
    const tLoop = Math.sqrt(2 * maxS / Math.max(0.01, a));
    const tCur = sliding ? (t % tLoop) : 0;
    s = sliding ? 0.5 * a * tCur * tCur : 0;

    const alongX = baseX + (s / rampLen) * (topX - baseX);
    const alongY = baseY + (s / rampLen) * (topY - baseY);
    // Block corners
    const nx = -Math.sin(rad), ny = -Math.cos(rad); // normal
    ctx.save();
    ctx.translate(alongX, alongY);
    ctx.rotate(-rad);
    const grad = ctx.createLinearGradient(-blockSize/2, -blockSize, blockSize/2, 0);
    grad.addColorStop(0, '#fbbf24'); grad.addColorStop(1, '#c2410c');
    ctx.fillStyle = grad;
    ctx.shadowBlur = 8; ctx.shadowColor = '#f59e0b';
    ctx.fillRect(-blockSize / 2, -blockSize, blockSize, blockSize);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${p.m}kg`, 0, -blockSize / 2 + 4);
    ctx.textAlign = 'left';
    ctx.restore();

    // Force vectors
    const blockCenterX = alongX + nx * blockSize / 2;
    const blockCenterY = alongY + ny * blockSize / 2;
    const fScale = 2;
    // Weight mg (down)
    const mg = p.m * p.g;
    ctx.strokeStyle = '#ef4444'; ctx.fillStyle = '#ef4444';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(blockCenterX, blockCenterY);
    ctx.lineTo(blockCenterX, blockCenterY + mg * fScale);
    ctx.stroke();
    // Parallel component
    const fPar = mg * Math.sin(rad);
    const tx = Math.cos(rad), ty = -Math.sin(rad);
    ctx.strokeStyle = '#10b981';
    ctx.beginPath();
    ctx.moveTo(blockCenterX, blockCenterY);
    ctx.lineTo(blockCenterX + tx * fPar * fScale, blockCenterY + ty * fPar * fScale);
    ctx.stroke();
    // Normal
    const fNorm = mg * Math.cos(rad);
    ctx.strokeStyle = '#3b82f6';
    ctx.beginPath();
    ctx.moveTo(blockCenterX, blockCenterY);
    ctx.lineTo(blockCenterX + nx * fNorm * fScale, blockCenterY + ny * fNorm * fScale);
    ctx.stroke();

    // Angle arc
    ctx.strokeStyle = dark ? '#fff' : '#000';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(baseX, baseY, 40, -Math.PI, -Math.PI + rad, false);
    ctx.stroke();
    ctx.fillStyle = dark ? '#fff' : '#000';
    ctx.font = 'bold 10px monospace';
    ctx.fillText(`θ=${p.theta}°`, baseX + 45, baseY - 10);

    ctx.fillText(`a = ${a.toFixed(2)} m/s²`, 20, 30);
    ctx.fillText(`F_parallel = ${fPar.toFixed(2)} N`, 20, 45);
    ctx.fillText(`F_normal = ${fNorm.toFixed(2)} N`, 20, 60);
    ctx.fillText(`F_friction = ${(p.mu * fNorm).toFixed(2)} N`, 20, 75);
    ctx.fillText(sliding ? '● Sliding' : '● Static (μ too high)', 20, 90);
  };

  const drawWaveInterference = (ctx: CanvasRenderingContext2D, W: number, H: number, p: any, t: number, dark: boolean) => {
    const { freq, sep, amp } = p;
    const s1x = W / 2 - sep / 2, s1y = H / 2;
    const s2x = W / 2 + sep / 2, s2y = H / 2;
    const lambda = 60 / freq;
    const k = (2 * Math.PI) / lambda;
    const omega = 2 * Math.PI * freq;

    // Interference pattern as colored pixels
    const step = 6;
    for (let x = 0; x < W; x += step) {
      for (let y = 0; y < H; y += step) {
        const r1 = Math.hypot(x - s1x, y - s1y);
        const r2 = Math.hypot(x - s2x, y - s2y);
        const psi1 = amp * Math.sin(k * r1 - omega * t) / Math.sqrt(r1 + 10);
        const psi2 = amp * Math.sin(k * r2 - omega * t) / Math.sqrt(r2 + 10);
        const psi = psi1 + psi2;
        const intensity = psi;
        // Color: positive = cyan, negative = pink
        const mag = Math.min(1, Math.abs(intensity) * 3);
        if (intensity > 0) {
          ctx.fillStyle = `rgba(34,211,238,${mag})`;
        } else {
          ctx.fillStyle = `rgba(236,72,153,${mag})`;
        }
        ctx.fillRect(x, y, step, step);
      }
    }

    // Source markers
    ctx.fillStyle = '#fff';
    ctx.shadowBlur = 12; ctx.shadowColor = '#22d3ee';
    ctx.beginPath(); ctx.arc(s1x, s1y, 6, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(s2x, s2y, 6, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = dark ? '#fff' : '#000';
    ctx.font = 'bold 10px monospace';
    ctx.fillText(`λ = ${lambda.toFixed(1)} px`, 20, 30);
    ctx.fillText(`d = ${sep} px`, 20, 45);
    ctx.fillText('Constructive = cyan | Destructive = pink', 20, H - 20);
  };

  const drawStandingWave = (ctx: CanvasRenderingContext2D, W: number, H: number, p: any, t: number, dark: boolean) => {
    const { n, amp, freq } = p;
    const y0 = H / 2;
    const x0 = 50, xEnd = W - 50;
    const L = xEnd - x0;
    const k = (n * Math.PI) / L;
    const omega = 2 * Math.PI * freq;

    // Ghost outline (envelope)
    ctx.strokeStyle = dark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    for (let i = 0; i <= 200; i++) {
      const xx = x0 + (i / 200) * L;
      const yy = y0 + amp * 40 * Math.sin(k * (xx - x0));
      if (i === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
    }
    ctx.stroke();
    ctx.beginPath();
    for (let i = 0; i <= 200; i++) {
      const xx = x0 + (i / 200) * L;
      const yy = y0 - amp * 40 * Math.sin(k * (xx - x0));
      if (i === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Main wave
    ctx.strokeStyle = '#06b6d4';
    ctx.shadowBlur = 10; ctx.shadowColor = '#06b6d4';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i <= 200; i++) {
      const xx = x0 + (i / 200) * L;
      const yy = y0 + amp * 40 * Math.sin(k * (xx - x0)) * Math.cos(omega * t);
      if (i === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Fixed ends
    ctx.fillStyle = dark ? '#cbd5e1' : '#475569';
    ctx.fillRect(x0 - 8, y0 - 40, 8, 80);
    ctx.fillRect(xEnd, y0 - 40, 8, 80);
    // Hatch marks
    ctx.strokeStyle = dark ? '#64748b' : '#94a3b8';
    ctx.lineWidth = 1;
    for (let i = 0; i < 8; i++) {
      ctx.beginPath();
      ctx.moveTo(x0 - 8, y0 - 38 + i * 10);
      ctx.lineTo(x0 - 14, y0 - 44 + i * 10);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(xEnd + 8, y0 - 38 + i * 10);
      ctx.lineTo(xEnd + 14, y0 - 44 + i * 10);
      ctx.stroke();
    }

    // Nodes (points of zero amplitude)
    ctx.fillStyle = '#ef4444';
    for (let i = 0; i <= n; i++) {
      const xx = x0 + (i / n) * L;
      ctx.beginPath(); ctx.arc(xx, y0, 5, 0, Math.PI * 2); ctx.fill();
    }

    // Antinodes label
    ctx.fillStyle = dark ? '#fff' : '#000';
    ctx.font = 'bold 10px monospace';
    ctx.fillText(`Harmonic n = ${n}`, 20, 30);
    ctx.fillText(`Nodes: ${n + 1}`, 20, 45);
    ctx.fillText(`Antinodes: ${n}`, 20, 60);
    ctx.fillText(`λ = ${(2 * L / n).toFixed(1)} px`, 20, 75);
    ctx.fillStyle = '#ef4444';
    ctx.fillText('● nodes (zero motion)', 20, H - 30);
  };

  const drawDoppler = (ctx: CanvasRenderingContext2D, W: number, H: number, p: any, t: number, dark: boolean) => {
    const { vs, freq } = p;
    const vw = 1; // wave speed normalized
    const sourceSpeed = vs * vw;

    // Source moves right
    const sourceX = ((t * sourceSpeed * 80) % (W + 100)) - 50;
    const sourceY = H / 2;

    // Emit wavefronts periodically
    if (!simStateRef.current.dopplerWaves) simStateRef.current.dopplerWaves = [];
    const period = 1 / freq;
    const lastEmit = simStateRef.current.dopplerLastEmit || 0;
    if (t - lastEmit > period) {
      simStateRef.current.dopplerWaves.push({
        x: sourceX, y: sourceY, emitTime: t
      });
      simStateRef.current.dopplerLastEmit = t;
    }
    // Remove old waves
    simStateRef.current.dopplerWaves = simStateRef.current.dopplerWaves.filter(
      (w: any) => t - w.emitTime < 6
    );

    // Draw waves as expanding circles
    simStateRef.current.dopplerWaves.forEach((w: any) => {
      const age = t - w.emitTime;
      const r = age * vw * 120;
      const alpha = Math.max(0, 1 - age / 6);
      ctx.strokeStyle = `rgba(34,211,238,${alpha})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(w.x, w.y, r, 0, Math.PI * 2);
      ctx.stroke();
    });

    // Source
    ctx.fillStyle = '#f97316';
    ctx.shadowBlur = 15; ctx.shadowColor = '#f97316';
    ctx.beginPath(); ctx.arc(sourceX, sourceY, 10, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;

    // Direction arrow
    ctx.strokeStyle = '#f97316';
    ctx.fillStyle = '#f97316';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sourceX + 12, sourceY);
    ctx.lineTo(sourceX + 25, sourceY);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(sourceX + 25, sourceY);
    ctx.lineTo(sourceX + 20, sourceY - 4);
    ctx.lineTo(sourceX + 20, sourceY + 4);
    ctx.closePath(); ctx.fill();

    // Observers
    ctx.fillStyle = '#10b981';
    ctx.beginPath(); ctx.arc(W - 30, sourceY, 8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ef4444';
    ctx.beginPath(); ctx.arc(30, sourceY, 8, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = dark ? '#fff' : '#000';
    ctx.font = 'bold 10px monospace';
    ctx.fillText(`v_source = ${(sourceSpeed * 100).toFixed(0)}% of wave speed`, 20, 30);
    const fApproach = freq / (1 - sourceSpeed);
    const fRecede = freq / (1 + sourceSpeed);
    ctx.fillText(`f (approach) = ${fApproach.toFixed(2)} Hz`, 20, 45);
    ctx.fillText(`f (recede) = ${fRecede.toFixed(2)} Hz`, 20, 60);
    ctx.fillText('Mach cone forms if vₛ ≥ v_wave', 20, H - 20);
  };

  const drawGasParticles = (ctx: CanvasRenderingContext2D, W: number, H: number, p: any, t: number, dark: boolean) => {
    const { T, N, size } = p;
    const containerW = (W - 80) * size;
    const containerH = (H - 120) * size;
    const x0 = (W - containerW) / 2;
    const y0 = (H - containerH) / 2;

    // Initialize particles
    if (!simStateRef.current.gas || simStateRef.current.gasN !== N) {
      const arr: any[] = [];
      for (let i = 0; i < N; i++) {
        const speed = Math.sqrt(T / 100) * (0.5 + Math.random() * 1.5);
        const ang = Math.random() * 2 * Math.PI;
        arr.push({
          x: x0 + Math.random() * containerW,
          y: y0 + Math.random() * containerH,
          vx: Math.cos(ang) * speed * 80,
          vy: Math.sin(ang) * speed * 80,
          r: 3 + Math.random() * 2,
          hue: 180 + Math.random() * 60
        });
      }
      simStateRef.current.gas = arr;
      simStateRef.current.gasN = N;
      simStateRef.current.wallHits = 0;
    }
    const parts = simStateRef.current.gas;

    // Container
    ctx.strokeStyle = dark ? '#94a3b8' : '#475569';
    ctx.fillStyle = dark ? 'rgba(30,41,59,0.5)' : 'rgba(241,245,249,0.5)';
    ctx.lineWidth = 3;
    ctx.fillRect(x0, y0, containerW, containerH);
    ctx.strokeRect(x0, y0, containerW, containerH);

    // Update and draw particles
    let hitsThisFrame = 0;
    parts.forEach((pt: any) => {
      pt.x += pt.vx * 0.016;
      pt.y += pt.vy * 0.016;
      if (pt.x - pt.r < x0) { pt.x = x0 + pt.r; pt.vx = -pt.vx; hitsThisFrame++; }
      if (pt.x + pt.r > x0 + containerW) { pt.x = x0 + containerW - pt.r; pt.vx = -pt.vx; hitsThisFrame++; }
      if (pt.y - pt.r < y0) { pt.y = y0 + pt.r; pt.vy = -pt.vy; hitsThisFrame++; }
      if (pt.y + pt.r > y0 + containerH) { pt.y = y0 + containerH - pt.r; pt.vy = -pt.vy; hitsThisFrame++; }

      const speed = Math.hypot(pt.vx, pt.vy);
      const hue = 240 - Math.min(180, speed * 1.5);
      ctx.fillStyle = `hsl(${hue}, 80%, 55%)`;
      ctx.shadowBlur = 4; ctx.shadowColor = `hsl(${hue}, 80%, 55%)`;
      ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2); ctx.fill();
    });
    ctx.shadowBlur = 0;
    simStateRef.current.wallHits = (simStateRef.current.wallHits || 0) + hitsThisFrame;

    const vRms = Math.sqrt(T * 3 * 8.314 / 0.028); // for N2 at T
    const pressure = (T * N) / (containerW * containerH / 1000);

    ctx.fillStyle = dark ? '#fff' : '#000';
    ctx.font = 'bold 10px monospace';
    ctx.fillText(`T = ${T} K`, 20, 25);
    ctx.fillText(`N = ${N} particles`, 20, 40);
    ctx.fillText(`v_rms ≈ ${vRms.toFixed(0)} m/s`, 20, 55);
    ctx.fillText(`P ∝ ${pressure.toFixed(1)} (arb)`, 20, 70);
    ctx.fillText(`Wall collisions: ${simStateRef.current.wallHits}`, 20, 85);
    ctx.fillText('PV = nRT — color = speed (blue slow → red fast)', 20, H - 20);
  };

  const drawOrbital = (ctx: CanvasRenderingContext2D, W: number, H: number, p: any, t: number, dark: boolean) => {
    const { GM, v0, trail } = p;
    const cx = W / 2, cy = H / 2;

    // Initialize planet state
    if (!simStateRef.current.orb) {
      simStateRef.current.orb = {
        x: 100, y: 0,
        vx: 0, vy: v0 * 50,
        trail: []
      };
    }
    const orb = simStateRef.current.orb;

    // Verlet integration
    for (let step = 0; step < 3; step++) {
      const r = Math.hypot(orb.x, orb.y);
      const ax = -GM * 1000 * orb.x / Math.pow(r, 3);
      const ay = -GM * 1000 * orb.y / Math.pow(r, 3);
      orb.vx += ax * 0.016;
      orb.vy += ay * 0.016;
      orb.x += orb.vx * 0.016;
      orb.y += orb.vy * 0.016;
    }

    orb.trail.push({ x: cx + orb.x, y: cy + orb.y });
    if (orb.trail.length > trail) orb.trail.shift();

    // Starfield
    if (!simStateRef.current.stars) {
      simStateRef.current.stars = [];
      for (let i = 0; i < 80; i++) {
        simStateRef.current.stars.push({
          x: Math.random() * W, y: Math.random() * H,
          r: Math.random() * 1.5
        });
      }
    }
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    simStateRef.current.stars.forEach((s: any) => {
      ctx.fillRect(s.x, s.y, s.r, s.r);
    });

    // Trail
    for (let i = 0; i < orb.trail.length - 1; i++) {
      const alpha = i / orb.trail.length;
      ctx.strokeStyle = `rgba(99,102,241,${alpha})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(orb.trail[i].x, orb.trail[i].y);
      ctx.lineTo(orb.trail[i+1].x, orb.trail[i+1].y);
      ctx.stroke();
    }

    // Star (sun)
    const sunGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, 35);
    sunGrad.addColorStop(0, '#fef3c7');
    sunGrad.addColorStop(0.4, '#f59e0b');
    sunGrad.addColorStop(1, '#b45309');
    ctx.fillStyle = sunGrad;
    ctx.shadowBlur = 30; ctx.shadowColor = '#f59e0b';
    ctx.beginPath(); ctx.arc(cx, cy, 25, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;

    // Planet
    const px = cx + orb.x, py = cy + orb.y;
    const plGrad = ctx.createRadialGradient(px - 3, py - 3, 1, px, py, 12);
    plGrad.addColorStop(0, '#60a5fa'); plGrad.addColorStop(1, '#1e3a8a');
    ctx.fillStyle = plGrad;
    ctx.shadowBlur = 10; ctx.shadowColor = '#3b82f6';
    ctx.beginPath(); ctx.arc(px, py, 10, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;

    // Velocity vector
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px + orb.vx * 0.5, py + orb.vy * 0.5);
    ctx.stroke();

    // Force vector (towards sun)
    const rVec = Math.hypot(orb.x, orb.y);
    const fx = -orb.x / rVec * 30;
    const fy = -orb.y / rVec * 30;
    ctx.strokeStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px + fx, py + fy);
    ctx.stroke();

    const r = Math.hypot(orb.x, orb.y);
    const v = Math.hypot(orb.vx, orb.vy);
    const KE = 0.5 * v * v;
    const PE = -GM * 1000 / r;
    ctx.fillStyle = dark ? '#fff' : '#fff';
    ctx.font = 'bold 10px monospace';
    ctx.fillText(`r = ${r.toFixed(0)} px`, 20, 30);
    ctx.fillText(`v = ${v.toFixed(1)} px/s`, 20, 45);
    ctx.fillText(`E = ${(KE + PE).toFixed(1)} (E<0: bound)`, 20, 60);
    ctx.fillStyle = '#10b981'; ctx.fillText('→ velocity', 20, H - 35);
    ctx.fillStyle = '#ef4444'; ctx.fillText('→ gravity', 20, H - 20);
  };

  const drawElectricField = (ctx: CanvasRenderingContext2D, W: number, H: number, p: any, t: number, dark: boolean) => {
    const { q1, q2, sep } = p;
    const c1x = W / 2 - sep / 2, c1y = H / 2;
    const c2x = W / 2 + sep / 2, c2y = H / 2;

    // Compute E field at each point and color
    const step = 8;
    for (let x = 0; x < W; x += step) {
      for (let y = 0; y < H; y += step) {
        const dx1 = x - c1x, dy1 = y - c1y;
        const dx2 = x - c2x, dy2 = y - c2y;
        const r1sq = dx1 * dx1 + dy1 * dy1 + 100;
        const r2sq = dx2 * dx2 + dy2 * dy2 + 100;
        const r1 = Math.sqrt(r1sq), r2 = Math.sqrt(r2sq);
        const Ex = q1 * dx1 / (r1sq * r1) + q2 * dx2 / (r2sq * r2);
        const Ey = q1 * dy1 / (r1sq * r1) + q2 * dy2 / (r2sq * r2);
        const E = Math.hypot(Ex, Ey);
        const mag = Math.min(1, E * 500);
        ctx.fillStyle = `rgba(236,72,153,${mag})`;
        ctx.fillRect(x, y, step, step);
      }
    }

    // Field lines from q1
    const lineCount = 12;
    ctx.strokeStyle = dark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)';
    ctx.lineWidth = 1.2;
    for (let i = 0; i < lineCount; i++) {
      const ang = (i / lineCount) * 2 * Math.PI;
      let x = c1x + Math.cos(ang) * 15;
      let y = c1y + Math.sin(ang) * 15;
      ctx.beginPath();
      ctx.moveTo(x, y);
      for (let s = 0; s < 200; s++) {
        const dx1 = x - c1x, dy1 = y - c1y;
        const dx2 = x - c2x, dy2 = y - c2y;
        const r1sq = dx1 * dx1 + dy1 * dy1 + 50;
        const r2sq = dx2 * dx2 + dy2 * dy2 + 50;
        const r1 = Math.sqrt(r1sq), r2 = Math.sqrt(r2sq);
        let Ex = q1 * dx1 / (r1sq * r1) + q2 * dx2 / (r2sq * r2);
        let Ey = q1 * dy1 / (r1sq * r1) + q2 * dy2 / (r2sq * r2);
        const E = Math.hypot(Ex, Ey) || 1;
        Ex /= E; Ey /= E;
        x += Ex * 3; y += Ey * 3;
        ctx.lineTo(x, y);
        if (Math.hypot(x - c2x, y - c2y) < 15) break;
        if (x < 0 || x > W || y < 0 || y > H) break;
      }
      ctx.stroke();
    }

    // Charge markers
    const drawCharge = (x: number, y: number, q: number, color: string) => {
      ctx.fillStyle = color;
      ctx.shadowBlur = 15; ctx.shadowColor = color;
      ctx.beginPath(); ctx.arc(x, y, 15, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(q > 0 ? '+' : '−', x, y + 6);
      ctx.textAlign = 'left';
    };
    drawCharge(c1x, c1y, q1, q1 > 0 ? '#ef4444' : '#3b82f6');
    drawCharge(c2x, c2y, q2, q2 > 0 ? '#ef4444' : '#3b82f6');

    ctx.fillStyle = dark ? '#fff' : '#000';
    ctx.font = 'bold 10px monospace';
    ctx.fillText(`q₁ = ${q1}, q₂ = ${q2}`, 20, 25);
    ctx.fillText(`d = ${sep} px`, 20, 40);
    ctx.fillText('Field lines: + → −', 20, H - 20);
  };

  /* ============================================================
     SVG MOUSE HANDLERS
     ============================================================ */
  const handleSvgMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (viewMode === '3d' && isDragging) {
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      setRotY3D(prev => prev + dx * 0.01);
      setRotX3D(prev => Math.max(-1.4, Math.min(1.4, prev + dy * 0.01)));
      setDragStart({ x: e.clientX, y: e.clientY });
      return;
    }
    if (viewMode !== 'graph2d' || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const pixelX = e.clientX - rect.left;
    const fraction = (pixelX - paddingLeft) / chartWidth;
    const plotXVal = minX + fraction * (maxX - minX);
    if (plotXVal >= minX && plotXVal <= maxX) setInteractiveHover(plotXVal);
    else setInteractiveHover(null);
  };

  const handleSvgMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (viewMode === '3d') {
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleSvgMouseUp = () => setIsDragging(false);

  const handleSvgWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    if (viewMode === '3d') {
      e.preventDefault();
      setZoom3D(z => Math.max(20, Math.min(300, z - e.deltaY * 0.1)));
    }
  };

  const handleExportSVG = () => {
    if (!svgRef.current) return;
    const svgContent = new XMLSerializer().serializeToString(svgRef.current);
    const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `physics_${selectedPreset.id}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const resetSim = () => {
    simTimeRef.current = 0;
    simStateRef.current = {};
    simLastTickRef.current = Date.now();
  };

  const activeMeta = viewMode === 'graph2d'
    ? { label: selectedPreset.name, color: 'text-blue-500', category: selectedPreset.category }
    : viewMode === 'sim'
    ? { label: selectedSim.name, color: selectedSim.color, category: selectedSim.category }
    : { label: selected3DPreset.name, color: 'text-fuchsia-500', category: selected3DPreset.category };

  /* ============================================================
     RENDER
     ============================================================ */
  const innerContent = (
    <div className={`text-[var(--theme-primary)] overflow-hidden flex flex-col font-sans ${
      isInline ? 'w-full h-full border-none rounded-none bg-[var(--theme-bg)]'
               : 'bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-3xl w-full max-w-5xl shadow-2xl h-[90vh]'
    }`}>
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">

        {/* ================= SIDEBAR ================= */}
        <AnimatePresence>
          {isOptionsPanelOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 0.35 }} exit={{ opacity: 0 }}
                onClick={() => setIsOptionsPanelOpen(false)}
                className="absolute inset-0 bg-black/60 z-30 pointer-events-auto md:hidden"
              />
              <motion.div
                initial={{ x: '-100%', opacity: 0.95 }} animate={{ x: 0, opacity: 1 }}
                exit={{ x: '-100%', opacity: 0.95 }}
                transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                className="md:relative absolute left-0 top-0 bottom-0 w-full sm:w-[350px] border-r border-[var(--theme-border)] bg-[var(--theme-surface)] dark:bg-[var(--theme-surface-alt)] backdrop-blur-md overflow-hidden flex flex-col z-40 shadow-2xl h-full shrink-0"
              >
                <div className="px-5 py-4 border-b border-[var(--theme-border)] flex items-center justify-between shrink-0">
                  <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <Sliders size={14} className="text-[var(--theme-accent)]" />
                    Physics Laboratory
                  </span>
                  <button onClick={() => setIsOptionsPanelOpen(false)}
                    className="p-1 hover:bg-[var(--theme-hover-bg)] rounded-full transition-colors cursor-pointer">
                    <X size={14} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 pb-8 flex flex-col gap-5 custom-scrollbar bg-[var(--theme-bg)] dark:bg-black/5">

                  {/* Mode switcher */}
                  <div className="grid grid-cols-3 gap-1 p-1 bg-[var(--theme-surface-alt)] rounded-xl border border-[var(--theme-border)]">
                    <button onClick={() => setViewMode('graph2d')}
                      className={`py-1.5 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-all ${
                        viewMode === 'graph2d' ? 'bg-blue-500 text-white shadow' : 'text-[var(--theme-secondary)] hover:text-[var(--theme-primary)]'
                      }`}>
                      <TrendingUp size={11}/> Graphs
                    </button>
                    <button onClick={() => setViewMode('sim')}
                      className={`py-1.5 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-all ${
                        viewMode === 'sim' ? 'bg-emerald-500 text-white shadow' : 'text-[var(--theme-secondary)] hover:text-[var(--theme-primary)]'
                      }`}>
                      <Play size={11}/> Simulations
                    </button>
                    <button onClick={() => setViewMode('3d')}
                      className={`py-1.5 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-all ${
                        viewMode === '3d' ? 'bg-fuchsia-500 text-white shadow' : 'text-[var(--theme-secondary)] hover:text-[var(--theme-primary)]'
                      }`}>
                      <Box size={11}/> 3D Lab
                    </button>
                  </div>

                  {/* Category chips */}
                  <div>
                    <span className="text-[10px] uppercase tracking-wider font-bold text-[var(--theme-secondary)] font-mono block mb-1.5 flex items-center gap-1">
                      <Filter size={10}/> Category
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {CATEGORIES.filter(c => c.id !== '3d').map(cat => (
                        <button key={cat.id}
                          onClick={() => setActiveCategory(cat.id as PhysicsCategory | 'all')}
                          className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all flex items-center gap-1 ${
                            activeCategory === cat.id
                              ? 'bg-blue-500/15 border-blue-500/50 text-blue-500'
                              : 'bg-[var(--theme-surface-alt)] border-[var(--theme-border)] text-[var(--theme-secondary)] hover:text-[var(--theme-primary)]'
                          }`}>
                          <span className={cat.color}>{cat.icon}</span>
                          {cat.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Formula card */}
                  <div className="p-4 bg-[var(--theme-surface-alt)] border border-[var(--theme-border)] rounded-2xl flex flex-col gap-2.5 select-none text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-[var(--theme-secondary)] font-mono tracking-wider">
                        {viewMode === 'graph2d' ? 'Analytical Model' : viewMode === 'sim' ? 'Simulation' : '3D System'}
                      </span>
                      <Sparkles size={11} className="text-[var(--theme-accent)]" />
                    </div>
                    <div className="font-mono text-xs text-[var(--theme-accent)] bg-[var(--theme-input-bg)] p-2.5 rounded-xl border border-[var(--theme-input-border)] font-semibold text-center">
                      {viewMode === 'graph2d' ? selectedPreset.formulaDisplay
                       : viewMode === 'sim' ? selectedSim.description
                       : selected3DPreset.formulaDisplay}
                    </div>
                  </div>

                  {/* Preset list */}
                  <div>
                    <span className="text-[10px] uppercase tracking-wider font-bold text-[var(--theme-secondary)] font-mono block mb-1.5">
                      {viewMode === 'graph2d' ? `Graphs (${filteredPresets.length})`
                       : viewMode === 'sim' ? `Simulations (${filteredSims.length})`
                       : `3D Presets (${filtered3DPresets.length})`}
                    </span>
                    <div className="flex flex-col gap-1.5 max-h-[280px] overflow-y-auto custom-scrollbar">
                      {viewMode === 'graph2d' && filteredPresets.map(pr => (
                        <button key={pr.id} onClick={() => setSelectedPreset(pr)}
                          className={`text-left text-xs px-3 py-2.5 rounded-xl transition-all cursor-pointer flex flex-col gap-0.5 border ${
                            selectedPreset.id === pr.id
                              ? 'bg-blue-500/10 border-blue-500 text-blue-600 dark:text-blue-400'
                              : 'bg-[var(--theme-surface)] border-[var(--theme-border)] text-[var(--theme-secondary)] hover:bg-[var(--theme-hover-bg)]'
                          }`}>
                          <span className="font-bold">{pr.name}</span>
                          <span className="text-[9px] opacity-75 truncate">{pr.description}</span>
                        </button>
                      ))}
                      {viewMode === 'sim' && filteredSims.map(s => (
                        <button key={s.id} onClick={() => { setSelectedSim(s); resetSim(); }}
                          className={`text-left text-xs px-3 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-2 border ${
                            selectedSim.id === s.id
                              ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400'
                              : 'bg-[var(--theme-surface)] border-[var(--theme-border)] text-[var(--theme-secondary)] hover:bg-[var(--theme-hover-bg)]'
                          }`}>
                          <span className={s.color}>{s.icon}</span>
                          <div className="min-w-0 flex-1">
                            <span className="block truncate font-bold">{s.name}</span>
                            <span className="text-[9px] opacity-75 block truncate">{s.description}</span>
                          </div>
                        </button>
                      ))}
                      {viewMode === '3d' && filtered3DPresets.map(pr => (
                        <button key={pr.id} onClick={() => setSelected3DPreset(pr)}
                          className={`text-left text-xs px-3 py-2.5 rounded-xl transition-all cursor-pointer flex flex-col gap-0.5 border ${
                            selected3DPreset.id === pr.id
                              ? 'bg-fuchsia-500/10 border-fuchsia-500 text-fuchsia-600 dark:text-fuchsia-400'
                              : 'bg-[var(--theme-surface)] border-[var(--theme-border)] text-[var(--theme-secondary)] hover:bg-[var(--theme-hover-bg)]'
                          }`}>
                          <span className="font-bold">{pr.name}</span>
                          <span className="text-[9px] opacity-75 truncate">{pr.description}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Sliders */}
                  <div className="flex flex-col gap-3 border-t border-[var(--theme-border)] pt-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase tracking-wider font-bold text-[var(--theme-secondary)] font-mono flex items-center gap-1.5">
                        <Sliders size={11}/> Parameters
                      </span>
                      <button onClick={() => {
                          const defs: Record<string, number> = {};
                          currentSlidersList.forEach(s => { defs[s.key] = s.defaultValue; });
                          setSliderVals(defs);
                          resetSim();
                        }}
                        className="text-[9px] uppercase font-bold tracking-wider text-[var(--theme-accent)] hover:underline flex items-center gap-1 cursor-pointer">
                        <RotateCcw size={10}/> Reset
                      </button>
                    </div>
                    {currentSlidersList.map(s => {
                      const val = sliderVals[s.key] !== undefined ? sliderVals[s.key] : s.defaultValue;
                      return (
                        <div key={s.key} className="flex flex-col gap-1.5 bg-[var(--theme-surface)] border border-[var(--theme-border)] p-3 rounded-2xl">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold flex items-center gap-1">
                              {s.label} <span className="text-[10px] font-mono text-[var(--theme-secondary)]">({s.symbol})</span>
                            </span>
                            <span className="text-xs font-mono font-bold bg-[var(--theme-surface-alt)] px-2 py-0.5 rounded-lg border border-[var(--theme-border)]">
                              {val} {s.unit}
                            </span>
                          </div>
                          <input type="range" min={s.min} max={s.max} step={s.step} value={val}
                            onChange={e => setSliderVals(prev => ({ ...prev, [s.key]: Number(e.target.value) }))}
                            className="w-full h-1 bg-[var(--theme-border)] rounded-lg appearance-none cursor-pointer accent-[var(--theme-accent)]" />
                        </div>
                      );
                    })}
                  </div>

                  {/* View toggles for graph mode */}
                  {viewMode === 'graph2d' && (
                    <div className="flex flex-col gap-2 border-t border-[var(--theme-border)] pt-4">
                      <span className="text-[10px] uppercase tracking-wider font-bold text-[var(--theme-secondary)] font-mono">
                        Render Styles
                      </span>
                      <label className="flex items-center justify-between text-xs font-semibold bg-[var(--theme-surface)] border border-[var(--theme-border)] px-4 py-2 rounded-2xl cursor-pointer">
                        <span className="flex items-center gap-1.5"><Grid size={12}/> Drafting Grid</span>
                        <input type="checkbox" checked={sketchMode} onChange={e => setSketchMode(e.target.checked)}
                          className="w-4 h-4 rounded accent-[var(--theme-accent)] cursor-pointer"/>
                      </label>
                      <label className="flex items-center justify-between text-xs font-semibold bg-[var(--theme-surface)] border border-[var(--theme-border)] px-4 py-2 rounded-2xl cursor-pointer">
                        <span className="flex items-center gap-1.5"><TrendingUp size={12}/> Tangent Slope</span>
                        <input type="checkbox" checked={tangentMode} onChange={e => setTangentMode(e.target.checked)}
                          className="w-4 h-4 rounded accent-[var(--theme-accent)] cursor-pointer"/>
                      </label>
                    </div>
                  )}

                  {/* 3D view controls */}
                  {viewMode === '3d' && (
                    <div className="flex flex-col gap-2.5 border-t border-[var(--theme-border)] pt-4">
                      <span className="text-[10px] uppercase tracking-wider font-bold text-[var(--theme-secondary)] font-mono">
                        3D View
                      </span>
                      {[
                        { label: 'Auto-rotate', val: autoRotate, set: setAutoRotate, icon: <Orbit size={12}/> },
                        { label: 'Wireframe', val: showWireframe, set: setShowWireframe, icon: <Grid3x3 size={12}/> },
                        { label: 'Floor grid', val: showFloor, set: setShowFloor, icon: <Layers size={12}/> },
                        { label: 'Axes', val: showAxes3D, set: setShowAxes3D, icon: <Compass size={12}/> },
                      ].map((t, i) => (
                        <label key={i} className="flex items-center gap-2 text-xs font-medium cursor-pointer text-[var(--theme-secondary)] hover:text-[var(--theme-primary)]">
                          <input type="checkbox" checked={t.val} onChange={e => t.set(e.target.checked)} className="accent-fuchsia-500"/>
                          {t.icon} {t.label}
                        </label>
                      ))}
                      <button onClick={() => { setRotX3D(-0.5); setRotY3D(0.7); setZoom3D(80); }}
                        className="w-full mt-1 px-3 py-1.5 rounded-lg text-[11px] font-bold border border-[var(--theme-border)] text-[var(--theme-secondary)] hover:text-fuchsia-500 hover:border-fuchsia-500 flex items-center justify-center gap-1.5">
                        <RotateCcw size={12}/> Reset Camera
                      </button>
                      <div className="text-[10px] text-[var(--theme-secondary)] leading-relaxed pt-2">
                        <p>• Drag to orbit · Scroll to zoom</p>
                      </div>
                    </div>
                  )}

                  {/* Sim playback */}
                  {viewMode === 'sim' && (
                    <div className="flex flex-col gap-2 border-t border-[var(--theme-border)] pt-4">
                      <span className="text-[10px] uppercase tracking-wider font-bold text-[var(--theme-secondary)] font-mono">
                        Playback
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => setSimRunning(r => !r)}
                          className={`p-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 text-white ${
                            simRunning ? 'bg-orange-500 hover:bg-orange-600' : 'bg-green-500 hover:bg-green-600'
                          }`}>
                          {simRunning ? <Pause size={13}/> : <Play size={13}/>}
                          {simRunning ? 'Pause' : 'Resume'}
                        </button>
                        <button onClick={resetSim}
                          className="p-2 bg-[var(--theme-surface)] border border-[var(--theme-border)] text-xs text-[var(--theme-secondary)] hover:text-emerald-500 font-bold rounded-xl flex items-center justify-center gap-1.5">
                          <RefreshCw size={13}/> Reset
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* ================= MAIN AREA ================= */}
        <div className="flex-1 flex flex-col bg-[var(--theme-bg)] p-6 relative overflow-hidden select-none">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-[var(--theme-surface-alt)] border border-[var(--theme-border)] rounded-2xl mb-4 text-xs font-semibold">
            <div className="flex items-center gap-2">
              <button onClick={() => setIsOptionsPanelOpen(!isOptionsPanelOpen)}
                className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 font-bold cursor-pointer transition-all text-[11px] ${
                  isOptionsPanelOpen ? 'bg-[var(--theme-surface-alt)] border-[var(--theme-accent)] text-[var(--theme-accent)]'
                                     : 'bg-[var(--theme-surface)] border-[var(--theme-border)] text-[var(--theme-primary)] hover:bg-[var(--theme-hover-bg)]'
                }`}>
                <Sliders size={11}/> {isOptionsPanelOpen ? 'Collapse' : 'Expand'}
              </button>

              <span className="h-4 w-px bg-zinc-200 dark:bg-zinc-700/60 mx-1 hidden sm:inline"/>

              {viewMode === 'graph2d' && (
                <>
                  <button onClick={() => setAnimating(!animating)}
                    className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 font-bold cursor-pointer ${
                      animating ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                                : 'bg-[var(--theme-surface)] border-[var(--theme-border)] text-[var(--theme-primary)] hover:bg-[var(--theme-hover-bg)]'
                    }`}>
                    {animating ? <Pause size={12}/> : <Play size={12}/>}
                    <span>{animating ? 'Sim Active' : 'Start Simulation'}</span>
                  </button>
                  <button onClick={() => { setAnimating(false); setAnimTime(minX); }}
                    disabled={animTime === minX}
                    className="p-1.5 bg-[var(--theme-surface)] border border-[var(--theme-border)] text-[var(--theme-primary)] hover:bg-[var(--theme-hover-bg)] disabled:opacity-40 rounded-xl cursor-pointer">
                    <RotateCcw size={12}/>
                  </button>
                </>
              )}

              {viewMode === 'sim' && (
                <>
                  <button onClick={() => setSimRunning(r => !r)}
                    className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 font-bold cursor-pointer ${
                      simRunning ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                                 : 'bg-[var(--theme-surface)] border-[var(--theme-border)] text-[var(--theme-primary)] hover:bg-[var(--theme-hover-bg)]'
                    }`}>
                    {simRunning ? <Pause size={12}/> : <Play size={12}/>}
                    <span>{simRunning ? 'Running' : 'Paused'}</span>
                  </button>
                  <button onClick={resetSim}
                    className="p-1.5 bg-[var(--theme-surface)] border border-[var(--theme-border)] text-[var(--theme-primary)] hover:bg-[var(--theme-hover-bg)] rounded-xl cursor-pointer">
                    <RefreshCw size={12}/>
                  </button>
                </>
              )}

              {viewMode === '3d' && (
                <button onClick={() => setAutoRotate(r => !r)}
                  className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 font-bold cursor-pointer ${
                    autoRotate ? 'bg-fuchsia-500/10 border-fuchsia-500/30 text-fuchsia-600 dark:text-fuchsia-400'
                               : 'bg-[var(--theme-surface)] border-[var(--theme-border)] text-[var(--theme-primary)] hover:bg-[var(--theme-hover-bg)]'
                  }`}>
                  <Orbit size={12}/>
                  <span>{autoRotate ? 'Spinning' : 'Auto-Spin'}</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {viewMode === 'graph2d' && (
                <div className="flex items-center bg-[var(--theme-surface-alt)] border border-[var(--theme-border)] rounded-xl overflow-hidden h-8">
                  <button onClick={() => setZoomLevel(p => Math.max(0.25, Number((p - 0.25).toFixed(2))))}
                    className="h-full px-3 text-[var(--theme-secondary)] hover:text-[var(--theme-primary)] hover:bg-[var(--theme-hover-bg)] border-r border-[var(--theme-border)] transition-all cursor-pointer">
                    <ZoomOut size={12}/>
                  </button>
                  <div className="px-2.5 font-mono text-[10px] text-[var(--theme-secondary)] select-none font-bold min-w-[48px] text-center">
                    {Math.round(zoomLevel * 100)}%
                  </div>
                  <button onClick={() => setZoomLevel(p => Math.min(4.0, Number((p + 0.25).toFixed(2))))}
                    className="h-full px-3 text-[var(--theme-secondary)] hover:text-[var(--theme-primary)] hover:bg-[var(--theme-hover-bg)] border-l border-[var(--theme-border)] transition-all cursor-pointer">
                    <ZoomIn size={12}/>
                  </button>
                </div>
              )}

              {viewMode === 'graph2d' && (
                <button onClick={handleExportSVG}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--theme-surface-alt)] border border-[var(--theme-border)] hover:bg-[var(--theme-hover-bg)] rounded-xl font-bold cursor-pointer">
                  <Download size={12}/>
                  <span>Export SVG</span>
                </button>
              )}

              <button onClick={onClose}
                className="p-1.5 bg-[var(--theme-surface-alt)] border border-[var(--theme-border)] text-[var(--theme-secondary)] hover:text-red-500 rounded-xl transition-colors cursor-pointer h-8 w-8 flex items-center justify-center hover:bg-red-500/10 hover:border-red-500">
                <X size={14}/>
              </button>
            </div>
          </div>

          {/* HUD */}
          <div className="bg-[var(--theme-surface)] border-b border-[var(--theme-border)]/50 px-4 py-2 flex items-center justify-between text-xs mb-3 rounded-xl">
            <div className="flex items-center gap-1.5">
              <span className="text-[var(--theme-secondary)] font-medium">Active:</span>
              <span className={`font-mono font-bold ${activeMeta.color}`}>{activeMeta.label}</span>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[var(--theme-surface-alt)] border border-[var(--theme-border)] text-[var(--theme-secondary)] ml-1">
                {CATEGORIES.find(c => c.id === activeMeta.category)?.label}
              </span>
            </div>
            {viewMode === 'graph2d' && animatedParticle && (
              <div className="font-mono text-[10px] text-[var(--theme-secondary)] flex items-center gap-3">
                <span>X: <strong className="text-[var(--theme-primary)]">{animatedParticle.x.toFixed(2)}</strong></span>
                <span>Y: <strong className="text-[var(--theme-primary)]">{animatedParticle.y.toFixed(2)}</strong></span>
              </div>
            )}
            {viewMode === 'sim' && (
              <div className="font-mono text-[10px] text-[var(--theme-secondary)]">
                t = {simTimeRef.current.toFixed(2)} s
              </div>
            )}
          </div>

          {/* ============ CANVAS AREA ============ */}
          <div className={`flex-1 flex items-center justify-center p-2 rounded-2xl relative border overflow-hidden transition-all duration-300 ${
            sketchMode && viewMode === 'graph2d'
              ? 'bg-[#f7f6f2] dark:bg-[#1a1917] border-amber-200/40 dark:border-amber-900/10'
              : 'bg-zinc-50/50 dark:bg-[#080808] border-zinc-200/40 dark:border-white/5'
          }`}>

            {/* GRAPH 2D MODE - SVG */}
            {viewMode === 'graph2d' && (
              <svg ref={svgRef} width={width} height={height}
                className="overflow-visible cursor-crosshair select-none max-w-full h-auto"
                onMouseDown={handleSvgMouseDown}
                onMouseMove={handleSvgMouseMove}
                onMouseUp={handleSvgMouseUp}
                onMouseLeave={() => { handleSvgMouseUp(); setInteractiveHover(null); }}
              >
                <defs>
                  <pattern id="millimeter-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                    <line x1="0" y1="0" x2="20" y2="0" stroke={sketchMode ? '#dbd4c0' : 'rgba(255,255,255,0.02)'} strokeWidth="0.5"/>
                    <line x1="0" y1="0" x2="0" y2="20" stroke={sketchMode ? '#dbd4c0' : 'rgba(255,255,255,0.02)'} strokeWidth="0.5"/>
                  </pattern>
                  <marker id="arrow-axis" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill={sketchMode ? '#5e5a4f' : '#888'}/>
                  </marker>
                </defs>

                {sketchMode && (
                  <rect x={paddingLeft} y={paddingTop} width={chartWidth} height={chartHeight} fill="url(#millimeter-grid)"/>
                )}

                {/* Y axis ticks */}
                {Array.from({ length: 6 }).map((_, idx) => {
                  const val = minY + (idx / 5) * (maxY - minY);
                  const y = getRelativeY(val);
                  return y >= paddingTop && y <= height - paddingBottom && (
                    <g key={idx}>
                      <line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y}
                        className={sketchMode ? 'stroke-amber-900/10' : 'stroke-white/[0.03]'} strokeWidth={1} strokeDasharray="3 3"/>
                      <text x={paddingLeft - 10} y={y + 3} textAnchor="end"
                        className={`font-mono text-[9px] ${sketchMode ? 'fill-[#5e5a4f]' : 'fill-zinc-500 font-semibold'}`}>
                        {Math.round(val)}
                      </text>
                    </g>
                  );
                })}

                {/* X axis ticks */}
                {Array.from({ length: 6 }).map((_, idx) => {
                  const val = minX + (idx / 5) * (maxX - minX);
                  const x = getRelativeX(val);
                  return x >= paddingLeft && x <= width - paddingRight && (
                    <g key={idx}>
                      <line x1={x} y1={paddingTop} x2={x} y2={height - paddingBottom}
                        className={sketchMode ? 'stroke-amber-900/10' : 'stroke-white/[0.03]'} strokeWidth={1} strokeDasharray="3 3"/>
                      <text x={x} y={height - paddingBottom + 16} textAnchor="middle"
                        className={`font-mono text-[9px] ${sketchMode ? 'fill-[#5e5a4f]' : 'fill-zinc-500 font-semibold'}`}>
                        {val.toFixed(1)}
                      </text>
                    </g>
                  );
                })}

                {/* Axes */}
                <line x1={paddingLeft - 10} y1={getRelativeY(0 >= minY && 0 <= maxY ? 0 : minY)}
                      x2={width - paddingRight + 12} y2={getRelativeY(0 >= minY && 0 <= maxY ? 0 : minY)}
                      stroke={sketchMode ? '#5e5a4f' : '#71717a'} strokeWidth={2} markerEnd="url(#arrow-axis)"/>
                <line x1={getRelativeX(0 >= minX && 0 <= maxX ? 0 : minX)} y1={height - paddingBottom + 10}
                      x2={getRelativeX(0 >= minX && 0 <= maxX ? 0 : minX)} y2={paddingTop - 12}
                      stroke={sketchMode ? '#5e5a4f' : '#71717a'} strokeWidth={2} markerEnd="url(#arrow-axis)"/>

                <text x={width - paddingRight + 12} y={getRelativeY(0 >= minY && 0 <= maxY ? 0 : minY) + 20} textAnchor="end"
                  className={`font-bold text-[11px] uppercase tracking-wider ${sketchMode ? 'fill-amber-900' : 'fill-zinc-200'}`}>
                  {selectedPreset.xAxisLabel}
                </text>
                <text x={getRelativeX(0 >= minX && 0 <= maxX ? 0 : minX) - 15} y={paddingTop - 18} textAnchor="start"
                  className={`font-bold text-[11px] uppercase tracking-wider ${sketchMode ? 'fill-amber-900' : 'fill-zinc-200'}`}>
                  {selectedPreset.yAxisLabel}
                </text>

                {/* Curve */}
                {curvePoints.length > 1 && (
                  <path d={`M ${curvePoints[0].px},${curvePoints[0].py} ` +
                           curvePoints.slice(1).map(pt => `L ${pt.px},${pt.py}`).join(' ')}
                    fill="none" stroke={sketchMode ? '#1e3a8a' : '#3b82f6'}
                    strokeWidth={sketchMode ? 3.5 : 3} strokeLinecap="round" strokeLinejoin="round" opacity={0.9}/>
                )}

                {/* Tangent */}
                {tangentMode && tangentLinePath && (
                  <line x1={tangentLinePath.x1} y1={tangentLinePath.y1} x2={tangentLinePath.x2} y2={tangentLinePath.y2}
                    stroke="#8b5cf6" strokeWidth={2} strokeDasharray="4 4"/>
                )}

                {/* Animated particle */}
                {animatedParticle && (
                  <circle cx={animatedParticle.px} cy={animatedParticle.py} r={6}
                    fill={sketchMode ? '#b91c1c' : '#10b981'} stroke="white" strokeWidth={2}/>
                )}

                {/* Hover guidelines */}
                {activePointsCombined && (
                  <g>
                    <line x1={paddingLeft} y1={activePointsCombined.py} x2={activePointsCombined.px} y2={activePointsCombined.py}
                      stroke={sketchMode ? '#5e5a4f' : '#fff'} strokeWidth={1} strokeDasharray="2 2" opacity={0.5}/>
                    <line x1={activePointsCombined.px} y1={activePointsCombined.py} x2={activePointsCombined.px} y2={height - paddingBottom}
                      stroke={sketchMode ? '#5e5a4f' : '#fff'} strokeWidth={1} strokeDasharray="2 2" opacity={0.5}/>
                    <circle cx={activePointsCombined.px} cy={activePointsCombined.py} r={5}
                      className="fill-blue-500 stroke-white dark:stroke-zinc-950" strokeWidth={1.5}/>
                    <foreignObject
                      x={Math.min(width - 150, Math.max(paddingLeft, activePointsCombined.px - 60))}
                      y={Math.max(paddingTop + 10, activePointsCombined.py - 55)}
                      width={130} height={46}>
                      <div className="bg-zinc-800/95 dark:bg-zinc-900 border border-white/20 px-2.5 py-1.5 rounded-xl shadow-lg select-none">
                        <div className="text-[9px] text-zinc-400 font-mono font-bold uppercase">Hover</div>
                        <div className="text-[10px] font-mono text-white font-bold flex gap-2 pt-0.5 justify-center">
                          <span>X: {activePointsCombined.x.toFixed(2)}</span>
                          <span>Y: {activePointsCombined.y.toFixed(2)}</span>
                        </div>
                      </div>
                    </foreignObject>
                  </g>
                )}
              </svg>
            )}

            {/* SIMULATION MODE - CANVAS */}
            {viewMode === 'sim' && (
              <canvas ref={simCanvasRef} width={640} height={420}
                className="w-full max-w-[720px] h-[480px] border border-transparent rounded-2xl"/>
            )}

            {/* 3D MODE - SVG */}
            {viewMode === '3d' && (
              <svg width={width} height={height}
                className="overflow-visible cursor-grab active:cursor-grabbing select-none max-w-full h-auto"
                onMouseDown={handleSvgMouseDown}
                onMouseMove={handleSvgMouseMove}
                onMouseUp={handleSvgMouseUp}
                onMouseLeave={handleSvgMouseUp}
                onWheel={handleSvgWheel}
              >
                <defs>
                  <marker id="arrow-3d" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#888"/>
                  </marker>
                </defs>

                {/* Floor grid */}
                {showFloor && (() => {
                  const lines: React.ReactNode[] = [];
                  for (let x = -1.2; x <= 1.25; x += 0.35) {
                    const p1 = project3D(x, -0.8, -1.2);
                    const p2 = project3D(x, -0.8, 1.2);
                    lines.push(<line key={`gx-${x}`} x1={p1.px} y1={p1.py} x2={p2.px} y2={p2.py}
                      stroke="rgba(255,255,255,0.08)" strokeWidth="1"/>);
                  }
                  for (let z = -1.2; z <= 1.25; z += 0.35) {
                    const p1 = project3D(-1.2, -0.8, z);
                    const p2 = project3D(1.2, -0.8, z);
                    lines.push(<line key={`gz-${z}`} x1={p1.px} y1={p1.py} x2={p2.px} y2={p2.py}
                      stroke="rgba(255,255,255,0.08)" strokeWidth="1"/>);
                  }
                  return <g>{lines}</g>;
                })()}

                {/* Axes */}
                {showAxes3D && (() => {
                  const o = project3D(0, 0, 0);
                  const xA = project3D(1.2, 0, 0);
                  const yA = project3D(0, 1.2, 0);
                  const zA = project3D(0, 0, 1.2);
                  return (
                    <g>
                      <line x1={o.px} y1={o.py} x2={xA.px} y2={xA.py} stroke="#f87171" strokeWidth="2" markerEnd="url(#arrow-3d)"/>
                      <text x={xA.px + 10} y={xA.py + 4} fill="#ef4444" className="font-mono font-bold text-[10px]">X</text>
                      <line x1={o.px} y1={o.py} x2={yA.px} y2={yA.py} stroke="#34d399" strokeWidth="2" markerEnd="url(#arrow-3d)"/>
                      <text x={yA.px} y={yA.py - 10} fill="#10b981" className="font-mono font-bold text-[10px]" textAnchor="middle">Y</text>
                      <line x1={o.px} y1={o.py} x2={zA.px} y2={zA.py} stroke="#60a5fa" strokeWidth="2" markerEnd="url(#arrow-3d)"/>
                      <text x={zA.px - 10} y={zA.py + 12} fill="#3b82f6" className="font-mono font-bold text-[10px]">Z</text>
                    </g>
                  );
                })()}

                {/* 3D curve — draw as series of line segments for depth */}
                {curve3DPoints.length > 1 && (() => {
                  const id = selected3DPreset.id;
                  // For certain presets, draw as paired segments (e.g., helmholtz)
                  if (id === 'helmholtz') {
                    const pairs: React.ReactNode[] = [];
                    for (let i = 0; i < curve3DPoints.length - 1; i += 2) {
                      const a = curve3DPoints[i], b = curve3DPoints[i+1];
                      pairs.push(<line key={i} x1={a.px} y1={a.py} x2={b.px} y2={b.py}
                        stroke="#a855f7" strokeWidth={2} opacity={0.9}/>);
                    }
                    return <g>{pairs}</g>;
                  }
                  if (id === 'quantum-wave') {
                    return (
                      <g>
                        {curve3DPoints.map((pt, i) => (
                          <circle key={i} cx={pt.px} cy={pt.py} r={1.5}
                            fill={pt.x * pt.x + pt.y * pt.y + pt.z * pt.z < 1 ? '#f472b6' : '#a855f7'}
                            opacity={0.7}/>
                        ))}
                      </g>
                    );
                  }
                  return (
                    <path d={`M ${curve3DPoints[0].px},${curve3DPoints[0].py} ` +
                             curve3DPoints.slice(1).map(pt => `L ${pt.px},${pt.py}`).join(' ')}
                      fill="none" stroke="#a855f7" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" opacity={0.9}/>
                  );
                })()}
              </svg>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  if (isInline) return innerContent;
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          className="fixed inset-0 bg-zinc-950/70 dark:bg-black/80 backdrop-blur-md z-[120] flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', stiffness: 360, damping: 28 }}
            className="flex h-[90vh] w-full max-w-5xl"
          >
            {innerContent}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};