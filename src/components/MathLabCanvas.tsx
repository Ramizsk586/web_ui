import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X, ZoomIn, ZoomOut, RotateCcw, Check, Compass, Sliders,
  Box, Waves, Circle as CircleIcon, Atom, Sparkles, TrendingUp,
  Layers, MousePointer2, Play, Pause, Grid3x3, Eye, EyeOff,
  Orbit, Filter, ChevronDown, Sigma
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

/* ============================================================
   TYPES
   ============================================================ */
type PresetCategory =
  | 'trig' | 'conic' | 'polar' | 'parametric' | 'wave' | 'fractal';

type PresetType = '2D' | 'polar' | 'spiral' | 'fractal' | 'parametric' | 'implicit';

interface MathPreset {
  id: string;
  name: string;
  equation: string;
  formulaLabel: string;
  defaultXRange: [number, number];
  defaultYRange: [number, number];
  presetType: PresetType;
  category: PresetCategory;
  /** which sliders are meaningful: a / b / c */
  params?: ('a' | 'b' | 'c')[];
  paramLabels?: { a?: string; b?: string; c?: string };
}

interface Shape3DPreset {
  id: string;
  name: string;
  description: string;
  /** returns list of line segments [p1, p2] in 3D */
  build: (a: number, b: number, c: number, res: number) => [number, number, number][][];
}

/* ============================================================
   CATEGORY METADATA
   ============================================================ */
const CATEGORIES: {
  id: PresetCategory | 'all' | '3d';
  label: string;
  icon: React.ReactNode;
  color: string;
}[] = [
  { id: 'all',        label: 'All',          icon: <Layers size={12} />,       color: 'text-zinc-400' },
  { id: 'trig',       label: 'Trigonometric',icon: <TrendingUp size={12} />,   color: 'text-blue-400' },
  { id: 'conic',      label: 'Conic Sections',icon: <CircleIcon size={12} />,  color: 'text-emerald-400' },
  { id: 'polar',      label: 'Polar Curves', icon: <Compass size={12} />,      color: 'text-pink-400' },
  { id: 'parametric', label: 'Parametric',   icon: <Atom size={12} />,         color: 'text-purple-400' },
  { id: 'wave',       label: 'Waves & Physics', icon: <Waves size={12} />,     color: 'text-cyan-400' },
  { id: 'fractal',    label: 'Fractals',     icon: <Sparkles size={12} />,     color: 'text-amber-400' },
  { id: '3d',         label: '3D Playground',icon: <Box size={12} />,          color: 'text-rose-400' },
];

/* ============================================================
   2D PRESETS (extended)
   ============================================================ */
const MATH_PRESETS: MathPreset[] = [
  // ---------- Trigonometric ----------
  { id: 'sin', name: 'Sine Wave', equation: 'y = A·sin(Bx + C)', formulaLabel: 'y = a · sin(b·x + c)',
    defaultXRange: [-10, 10], defaultYRange: [-4, 4], presetType: '2D', category: 'trig',
    params: ['a','b','c'], paramLabels: { a:'Amplitude', b:'Frequency', c:'Phase' } },
  { id: 'cos', name: 'Cosine Wave', equation: 'y = A·cos(Bx + C)', formulaLabel: 'y = a · cos(b·x + c)',
    defaultXRange: [-10, 10], defaultYRange: [-4, 4], presetType: '2D', category: 'trig',
    params: ['a','b','c'], paramLabels: { a:'Amplitude', b:'Frequency', c:'Phase' } },
  { id: 'tan', name: 'Tangent', equation: 'y = A·tan(Bx)', formulaLabel: 'y = a · tan(b·x)',
    defaultXRange: [-6, 6], defaultYRange: [-8, 8], presetType: '2D', category: 'trig',
    params: ['a','b'], paramLabels: { a:'Amplitude', b:'Frequency' } },
  { id: 'sinc', name: 'Sinc Function', equation: 'y = sin(x)/x', formulaLabel: 'y = a · sin(bx)/(bx)',
    defaultXRange: [-15, 15], defaultYRange: [-1, 3], presetType: '2D', category: 'trig',
    params: ['a','b'], paramLabels: { a:'Amplitude', b:'Stretch' } },

  // ---------- Conic Sections ----------
  { id: 'circle', name: 'Circle', equation: 'x² + y² = r²', formulaLabel: 'x² + y² = a²',
    defaultXRange: [-5, 5], defaultYRange: [-5, 5], presetType: 'polar', category: 'conic',
    params: ['a'], paramLabels: { a:'Radius' } },
  { id: 'ellipse', name: 'Ellipse', equation: 'x²/a² + y²/b² = 1', formulaLabel: 'x²/a² + y²/b² = 1',
    defaultXRange: [-6, 6], defaultYRange: [-6, 6], presetType: 'parametric', category: 'conic',
    params: ['a','b'], paramLabels: { a:'Semi-major', b:'Semi-minor' } },
  { id: 'parabola', name: 'Parabola', equation: 'y = a·x²', formulaLabel: 'y = a · x²',
    defaultXRange: [-5, 5], defaultYRange: [-2, 10], presetType: '2D', category: 'conic',
    params: ['a'], paramLabels: { a:'Curvature' } },
  { id: 'hyperbola', name: 'Hyperbola', equation: 'x²/a² - y²/b² = 1', formulaLabel: 'x²/a² − y²/b² = 1',
    defaultXRange: [-8, 8], defaultYRange: [-6, 6], presetType: 'parametric', category: 'conic',
    params: ['a','b'], paramLabels: { a:'a', b:'b' } },

  // ---------- Polar ----------
  { id: 'polar-heart', name: 'Cardioid (Heart)', equation: 'r = a(1 - sinθ)', formulaLabel: 'r = a · (1 − sin θ)',
    defaultXRange: [-5, 5], defaultYRange: [-5, 5], presetType: 'polar', category: 'polar',
    params: ['a'], paramLabels: { a:'Scale' } },
  { id: 'rose', name: 'Rose Curve', equation: 'r = cos(kθ)', formulaLabel: 'r = a · cos(b · θ)',
    defaultXRange: [-4, 4], defaultYRange: [-4, 4], presetType: 'polar', category: 'polar',
    params: ['a','b'], paramLabels: { a:'Amplitude', b:'Petals (k)' } },
  { id: 'limacon', name: 'Limaçon', equation: 'r = a + b·cosθ', formulaLabel: 'r = a + b · cos θ',
    defaultXRange: [-6, 6], defaultYRange: [-6, 6], presetType: 'polar', category: 'polar',
    params: ['a','b'], paramLabels: { a:'Offset', b:'Radius' } },
  { id: 'lemniscate', name: 'Lemniscate of Bernoulli', equation: 'r² = a²·cos2θ', formulaLabel: 'r² = a² · cos(2θ)',
    defaultXRange: [-4, 4], defaultYRange: [-4, 4], presetType: 'polar', category: 'polar',
    params: ['a'], paramLabels: { a:'Scale' } },
  { id: 'spiral', name: 'Archimedean Spiral', equation: 'r = a·θ', formulaLabel: 'r = a · θ',
    defaultXRange: [-15, 15], defaultYRange: [-15, 15], presetType: 'spiral', category: 'polar',
    params: ['a','b'], paramLabels: { a:'Tightness', b:'Turns' } },
  { id: 'log-spiral', name: 'Logarithmic Spiral', equation: 'r = a·e^(bθ)', formulaLabel: 'r = a · e^(bθ)',
    defaultXRange: [-10, 10], defaultYRange: [-10, 10], presetType: 'spiral', category: 'polar',
    params: ['a','b'], paramLabels: { a:'Scale', b:'Growth' } },

  // ---------- Parametric ----------
  { id: 'lissajous', name: 'Lissajous Curve', equation: 'x=sin(at), y=sin(bt)', formulaLabel: 'x = sin(a·t), y = sin(b·t)',
    defaultXRange: [-3, 3], defaultYRange: [-3, 3], presetType: 'parametric', category: 'parametric',
    params: ['a','b','c'], paramLabels: { a:'Freq X', b:'Freq Y', c:'Phase δ' } },
  { id: 'butterfly', name: 'Butterfly Curve', equation: 'r = e^sinθ - 2cos4θ + ...', formulaLabel: 'r = e^(sin θ) − 2cos(4θ) + sin⁵((2θ−π)/24)',
    defaultXRange: [-5, 5], defaultYRange: [-5, 5], presetType: 'polar', category: 'parametric',
    params: ['a'], paramLabels: { a:'Scale' } },
  { id: 'hypotrochoid', name: 'Spirograph (Hypotrochoid)', equation: 'x=(R-r)cosθ+d·cos((R-r)θ/r)',
    formulaLabel: 'x=(R−r)cos t + d·cos((R−r)t/r)',
    defaultXRange: [-6, 6], defaultYRange: [-6, 6], presetType: 'parametric', category: 'parametric',
    params: ['a','b','c'], paramLabels: { a:'R (outer)', b:'r (inner)', c:'d (pen)' } },
  { id: 'astroid', name: 'Astroid', equation: 'x=a·cos³t, y=a·sin³t', formulaLabel: 'x = a·cos³t, y = a·sin³t',
    defaultXRange: [-4, 4], defaultYRange: [-4, 4], presetType: 'parametric', category: 'parametric',
    params: ['a'], paramLabels: { a:'Scale' } },

  // ---------- Waves ----------
  { id: 'fourier', name: 'Fourier Square Wave', equation: 'Σ sin((2k-1)x)/(2k-1)', formulaLabel: 'y = Σ [sin(n·x)/n]',
    defaultXRange: [-6, 6], defaultYRange: [-3, 3], presetType: '2D', category: 'wave',
    params: ['a','b'], paramLabels: { a:'Harmonics', b:'Frequency' } },
  { id: 'damped', name: 'Damped Oscillation', equation: 'y = A·e^(-bx)·sin(cx)', formulaLabel: 'y = a·e^(−b|x|)·sin(c·x)',
    defaultXRange: [-10, 10], defaultYRange: [-3, 3], presetType: '2D', category: 'wave',
    params: ['a','b','c'], paramLabels: { a:'Amplitude', b:'Damping', c:'Frequency' } },
  { id: 'beats', name: 'Beat Interference', equation: 'y = sin(ax)+sin(bx)', formulaLabel: 'y = sin(a·x) + sin(b·x)',
    defaultXRange: [-15, 15], defaultYRange: [-3, 3], presetType: '2D', category: 'wave',
    params: ['a','b'], paramLabels: { a:'Freq 1', b:'Freq 2' } },
  { id: 'exponential', name: 'Exponential', equation: 'y = A·e^(kx)', formulaLabel: 'y = a · e^(k·x)',
    defaultXRange: [-4, 4], defaultYRange: [-2, 10], presetType: '2D', category: 'wave',
    params: ['a','b'], paramLabels: { a:'Scale', b:'Growth k' } },

  // ---------- Fractals ----------
  { id: 'koch', name: 'Koch Snowflake', equation: 'iterative fractal', formulaLabel: 'Koch Snowflake (depth = a)',
    defaultXRange: [-3, 3], defaultYRange: [-3, 3], presetType: 'fractal', category: 'fractal',
    params: ['a'], paramLabels: { a:'Depth' } },
  { id: 'sierpinski', name: 'Sierpiński Triangle', equation: 'recursive fractal', formulaLabel: 'Sierpiński (depth = a)',
    defaultXRange: [-3, 3], defaultYRange: [-3, 3], presetType: 'fractal', category: 'fractal',
    params: ['a'], paramLabels: { a:'Depth' } },
  { id: 'dragon', name: 'Dragon Curve', equation: 'L-system', formulaLabel: 'Dragon Curve (iter = a)',
    defaultXRange: [-4, 4], defaultYRange: [-4, 4], presetType: 'fractal', category: 'fractal',
    params: ['a'], paramLabels: { a:'Iterations' } },
  { id: 'mandelbrot', name: 'Mandelbrot Set', equation: 'z = z² + c', formulaLabel: 'Mandelbrot · zoom = a',
    defaultXRange: [-2.5, 1.5], defaultYRange: [-1.5, 1.5], presetType: 'fractal', category: 'fractal',
    params: ['a','b'], paramLabels: { a:'Zoom', b:'Max iter' } },
];

/* ============================================================
   3D SHAPE PRESETS
   build(a,b,c,res) => array of line segments [ [x,y,z],[x,y,z] ]
   ============================================================ */
const rotY = (p: [number,number,number], a: number): [number,number,number] => [
  p[0]*Math.cos(a) + p[2]*Math.sin(a), p[1], -p[0]*Math.sin(a) + p[2]*Math.cos(a)
];

const SHAPE_3D_PRESETS: Shape3DPreset[] = [
  {
    id: 'sphere', name: 'Sphere',
    description: 'Parametric surface (u,v) → spherical coords',
    build: (a, b, _c, res) => {
      const r = a; const segs: [number,number,number][][] = [];
      const uN = Math.max(6, Math.floor(res * 0.6));
      const vN = Math.max(6, Math.floor(res * 0.6));
      const pts: [number,number,number][][] = [];
      for (let i = 0; i <= uN; i++) {
        const row: [number,number,number][] = [];
        const u = (i / uN) * Math.PI * 2;
        for (let j = 0; j <= vN; j++) {
          const v = (j / vN) * Math.PI;
          row.push([r*Math.cos(u)*Math.sin(v), r*Math.sin(u)*Math.sin(v), r*Math.cos(v)]);
        }
        pts.push(row);
      }
      for (let i = 0; i <= uN; i++) for (let j = 0; j < vN; j++)
        segs.push([pts[i][j], pts[i][j+1]]);
      for (let j = 0; j <= vN; j++) for (let i = 0; i < uN; i++)
        segs.push([pts[i][j], pts[i+1][j]]);
      return segs;
    }
  },
  {
    id: 'torus', name: 'Torus',
    description: 'Donut shape with major R and minor r',
    build: (a, b, _c, res) => {
      const R = a, r = b * 0.5;
      const segs: [number,number,number][][] = [];
      const uN = Math.max(12, Math.floor(res * 0.8));
      const vN = Math.max(8, Math.floor(res * 0.5));
      const pts: [number,number,number][][] = [];
      for (let i = 0; i <= uN; i++) {
        const row: [number,number,number][] = [];
        const u = (i / uN) * Math.PI * 2;
        for (let j = 0; j <= vN; j++) {
          const v = (j / vN) * Math.PI * 2;
          row.push([(R + r*Math.cos(v))*Math.cos(u), (R + r*Math.cos(v))*Math.sin(u), r*Math.sin(v)]);
        }
        pts.push(row);
      }
      for (let i = 0; i <= uN; i++) for (let j = 0; j < vN; j++)
        segs.push([pts[i][j], pts[i][j+1]]);
      for (let j = 0; j <= vN; j++) for (let i = 0; i < uN; i++)
        segs.push([pts[i][j], pts[i+1][j]]);
      return segs;
    }
  },
  {
    id: 'cube', name: 'Cube',
    description: 'Regular hexahedron with edges',
    build: (a) => {
      const s = a;
      const v: [number,number,number][] = [
        [-s,-s,-s],[s,-s,-s],[s,s,-s],[-s,s,-s],
        [-s,-s,s],[s,-s,s],[s,s,s],[-s,s,s]
      ];
      const edges = [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]];
      return edges.map(([i,j]) => [v[i], v[j]]);
    }
  },
  {
    id: 'cylinder', name: 'Cylinder',
    description: 'Circular cylinder along Z axis',
    build: (a, b, _c, res) => {
      const r = a, h = b;
      const segs: [number,number,number][][] = [];
      const N = Math.max(12, Math.floor(res));
      for (let i = 0; i < N; i++) {
        const u1 = (i / N) * Math.PI * 2;
        const u2 = ((i + 1) / N) * Math.PI * 2;
        segs.push([[r*Math.cos(u1), r*Math.sin(u1), -h], [r*Math.cos(u2), r*Math.sin(u2), -h]]);
        segs.push([[r*Math.cos(u1), r*Math.sin(u1), h], [r*Math.cos(u2), r*Math.sin(u2), h]]);
        segs.push([[r*Math.cos(u1), r*Math.sin(u1), -h], [r*Math.cos(u1), r*Math.sin(u1), h]]);
      }
      return segs;
    }
  },
  {
    id: 'cone', name: 'Cone',
    description: 'Right circular cone',
    build: (a, b, _c, res) => {
      const r = a, h = b;
      const segs: [number,number,number][][] = [];
      const N = Math.max(12, Math.floor(res));
      for (let i = 0; i < N; i++) {
        const u1 = (i / N) * Math.PI * 2;
        const u2 = ((i + 1) / N) * Math.PI * 2;
        segs.push([[r*Math.cos(u1), r*Math.sin(u1), -h], [r*Math.cos(u2), r*Math.sin(u2), -h]]);
        segs.push([[r*Math.cos(u1), r*Math.sin(u1), -h], [0, 0, h]]);
      }
      return segs;
    }
  },
  {
    id: 'helix', name: 'Helix',
    description: 'Spiral curve along an axis',
    build: (a, b, c, res) => {
      const r = a, pitch = b * 0.3, turns = c;
      const segs: [number,number,number][][] = [];
      const N = Math.max(60, Math.floor(res * 3));
      const maxT = turns * Math.PI * 2;
      let prev: [number,number,number] | null = null;
      for (let i = 0; i <= N; i++) {
        const t = (i / N) * maxT;
        const p: [number,number,number] = [r*Math.cos(t), r*Math.sin(t), pitch*t - pitch*maxT/2];
        if (prev) segs.push([prev, p]);
        prev = p;
      }
      return segs;
    }
  },
  {
    id: 'mobius', name: 'Möbius Strip',
    description: 'Non-orientable surface with one side',
    build: (a, _b, _c, res) => {
      const R = a, w = a * 0.4;
      const segs: [number,number,number][][] = [];
      const uN = Math.max(30, Math.floor(res * 1.5));
      const vN = Math.max(4, Math.floor(res * 0.2));
      const pts: [number,number,number][][] = [];
      for (let i = 0; i <= uN; i++) {
        const row: [number,number,number][] = [];
        const u = (i / uN) * Math.PI * 2;
        for (let j = 0; j <= vN; j++) {
          const v = (j / vN - 0.5) * 2 * w;
          row.push([
            (R + v*Math.cos(u/2))*Math.cos(u),
            (R + v*Math.cos(u/2))*Math.sin(u),
            v*Math.sin(u/2)
          ]);
        }
        pts.push(row);
      }
      for (let i = 0; i <= uN; i++) for (let j = 0; j < vN; j++)
        segs.push([pts[i][j], pts[i][j+1]]);
      for (let j = 0; j <= vN; j++) for (let i = 0; i < uN; i++)
        segs.push([pts[i][j], pts[i+1][j]]);
      return segs;
    }
  },
  {
    id: 'klein', name: 'Klein Bottle',
    description: 'Non-orientable 4D surface projected to 3D',
    build: (a, _b, _c, res) => {
      const s = a * 0.3;
      const segs: [number,number,number][][] = [];
      const uN = Math.max(24, Math.floor(res));
      const vN = Math.max(12, Math.floor(res * 0.6));
      const pts: [number,number,number][][] = [];
      for (let i = 0; i <= uN; i++) {
        const row: [number,number,number][] = [];
        const u = (i / uN) * Math.PI * 2;
        for (let j = 0; j <= vN; j++) {
          const v = (j / vN) * Math.PI * 2;
          const cu = Math.cos(u), su = Math.sin(u), cv = Math.cos(v), sv = Math.sin(v);
          const r = 4*(1 - cu/2);
          let x, y, z;
          if (u < Math.PI) {
            x = 6*cu*(1 + su) + r*cu*cv;
            y = 16*su + r*su*cv;
          } else {
            x = 6*cu*(1 + su) - r*cv;
            y = 16*su;
          }
          z = r*sv;
          row.push([x*s*0.08, y*s*0.08 - 1, z*s*0.08]);
        }
        pts.push(row);
      }
      for (let i = 0; i <= uN; i++) for (let j = 0; j < vN; j++)
        segs.push([pts[i][j], pts[i][j+1]]);
      for (let j = 0; j <= vN; j++) for (let i = 0; i < uN; i++)
        segs.push([pts[i][j], pts[i+1][j]]);
      return segs;
    }
  },
  {
    id: 'saddle', name: 'Hyperbolic Paraboloid',
    description: 'Saddle surface z = x² − y²',
    build: (a, _b, _c, res) => {
      const s = a;
      const segs: [number,number,number][][] = [];
      const N = Math.max(10, Math.floor(res * 0.6));
      const pts: [number,number,number][][] = [];
      for (let i = 0; i <= N; i++) {
        const row: [number,number,number][] = [];
        const x = (i / N - 0.5) * 4;
        for (let j = 0; j <= N; j++) {
          const y = (j / N - 0.5) * 4;
          row.push([x*s*0.5, y*s*0.5, (x*x - y*y)*s*0.15]);
        }
        pts.push(row);
      }
      for (let i = 0; i <= N; i++) for (let j = 0; j < N; j++)
        segs.push([pts[i][j], pts[i][j+1]]);
      for (let j = 0; j <= N; j++) for (let i = 0; i < N; i++)
        segs.push([pts[i][j], pts[i+1][j]]);
      return segs;
    }
  },
  {
    id: 'trefoil', name: 'Trefoil Knot',
    description: '(2,3)-torus knot tube',
    build: (a, b, _c, res) => {
      const R = a, r = b * 0.2;
      const segs: [number,number,number][][] = [];
      const N = Math.max(80, Math.floor(res * 3));
      const tubeN = Math.max(6, Math.floor(res * 0.3));
      // Build curve first
      const curve: [number,number,number][] = [];
      const tangents: [number,number,number][] = [];
      for (let i = 0; i <= N; i++) {
        const t = (i / N) * Math.PI * 2;
        curve.push([
          R*(Math.sin(t) + 2*Math.sin(2*t)),
          R*(Math.cos(t) - 2*Math.cos(2*t)),
          R*(-Math.sin(3*t))
        ]);
      }
      for (let i = 0; i <= N; i++) {
        const i0 = Math.max(0, i-1), i1 = Math.min(N, i+1);
        const tx = curve[i1][0]-curve[i0][0];
        const ty = curve[i1][1]-curve[i0][1];
        const tz = curve[i1][2]-curve[i0][2];
        const ln = Math.hypot(tx,ty,tz) || 1;
        tangents.push([tx/ln, ty/ln, tz/ln]);
      }
      // For each curve point build a tube ring using parallel transport approximation
      const rings: [number,number,number][][] = [];
      for (let i = 0; i <= N; i++) {
        const T = tangents[i];
        // pick arbitrary normal
        let nx = 0, ny = 1, nz = 0;
        if (Math.abs(T[1]) > 0.9) { nx = 1; ny = 0; nz = 0; }
        // B = T × N, N = B × T
        const bx = T[1]*nz - T[2]*ny, by = T[2]*nx - T[0]*nz, bz = T[0]*ny - T[1]*nx;
        const bln = Math.hypot(bx,by,bz) || 1;
        const Bx = bx/bln, By = by/bln, Bz = bz/bln;
        const Nx = By*T[2] - Bz*T[1], Ny = Bz*T[0] - Bx*T[2], Nz = Bx*T[1] - By*T[0];
        const ring: [number,number,number][] = [];
        for (let j = 0; j <= tubeN; j++) {
          const a2 = (j / tubeN) * Math.PI * 2;
          const ca = Math.cos(a2), sa = Math.sin(a2);
          ring.push([
            curve[i][0] + r*(ca*Nx + sa*Bx),
            curve[i][1] + r*(ca*Ny + sa*By),
            curve[i][2] + r*(ca*Nz + sa*Bz),
          ]);
        }
        rings.push(ring);
      }
      for (let i = 0; i < N; i++) for (let j = 0; j < tubeN; j++) {
        segs.push([rings[i][j], rings[i+1][j]]);
        segs.push([rings[i][j], rings[i][j+1]]);
      }
      return segs;
    }
  },
];

/* ============================================================
   3D PROJECTION UTILITIES
   ============================================================ */
const project3D = (
  x: number, y: number, z: number,
  rotX: number, rotY: number,
  focal: number, cx: number, cy: number, scale: number
) => {
  // Rotate around Y
  const cyR = Math.cos(rotY), syR = Math.sin(rotY);
  let x1 = x * cyR + z * syR;
  let z1 = -x * syR + z * cyR;
  // Rotate around X
  const cxR = Math.cos(rotX), sxR = Math.sin(rotX);
  const y1 = y * cxR - z1 * sxR;
  const z2 = y * sxR + z1 * cxR;
  const p = focal / (focal + z2);
  return { x: cx + x1 * p * scale, y: cy - y1 * p * scale, z: z2, p };
};

/* ============================================================
   MAIN COMPONENT
   ============================================================ */
export const MathLabCanvas: React.FC<{
  onClose?: () => void;
  isInline?: boolean;
}> = ({ onClose, isInline = true }) => {
  // ---- mode ----
  const [mode, setMode] = useState<'2d' | '3d'>('2d');

  // ---- 2D state ----
  const [selectedPreset, setSelectedPreset] = useState<MathPreset>(MATH_PRESETS[0]);
  const [activeCategory, setActiveCategory] = useState<PresetCategory | 'all'>('all');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [paramA, setParamA] = useState(2.0);
  const [paramB, setParamB] = useState(1.5);
  const [paramC, setParamC] = useState(0.0);
  const [zoomLevel, setZoomLevel] = useState(1.0);
  const [showAxes, setShowAxes] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [showTangent, setShowTangent] = useState(false);
  const [hoveredCoords, setHoveredCoords] = useState<{x:number;y:number}|null>(null);

  // ---- 3D state ----
  const [shape3D, setShape3D] = useState<Shape3DPreset>(SHAPE_3D_PRESETS[0]);
  const [rotX3D, setRotX3D] = useState(-0.5);
  const [rotY3D, setRotY3D] = useState(0.7);
  const [zoom3D, setZoom3D] = useState(60);
  const [p3A, setP3A] = useState(2.0);
  const [p3B, setP3B] = useState(1.0);
  const [p3C, setP3C] = useState(2.0);
  const [p3Res, setP3Res] = useState(24);
  const [autoRotate, setAutoRotate] = useState(false);
  const [showWireframe, setShowWireframe] = useState(true);
  const [showFloor, setShowFloor] = useState(true);
  const [showAxes3D, setShowAxes3D] = useState(true);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dragRef = useRef<{ x: number; y: number; rx: number; ry: number } | null>(null);

  /* ---------- Filtered presets by category ---------- */
  const filteredPresets = useMemo(() => {
    if (activeCategory === 'all') return MATH_PRESETS;
    return MATH_PRESETS.filter(p => p.category === activeCategory);
  }, [activeCategory]);

  /* ---------- Reset parameters on preset change ---------- */
  useEffect(() => {
    const id = selectedPreset.id;
    if (id === 'polar-heart' || id === 'circle') { setParamA(2.5); setParamB(1.0); setParamC(0); }
    else if (id === 'fourier') { setParamA(3); setParamB(1.0); setParamC(0); }
    else if (id === 'spiral' || id === 'log-spiral') { setParamA(0.4); setParamB(0.15); setParamC(0); }
    else if (id === 'rose') { setParamA(2.5); setParamB(3); setParamC(0); }
    else if (id === 'limacon') { setParamA(1.5); setParamB(2.2); setParamC(0); }
    else if (id === 'lemniscate') { setParamA(2.5); setParamB(1); setParamC(0); }
    else if (id === 'lissajous') { setParamA(3); setParamB(2); setParamC(1.57); }
    else if (id === 'hypotrochoid') { setParamA(3.0); setParamB(1.0); setParamC(1.5); }
    else if (id === 'ellipse') { setParamA(3.0); setParamB(1.8); setParamC(0); }
    else if (id === 'hyperbola') { setParamA(2.0); setParamB(1.5); setParamC(0); }
    else if (id === 'damped') { setParamA(2.0); setParamB(0.25); setParamC(2.5); }
    else if (id === 'beats') { setParamA(4.0); setParamB(4.5); setParamC(0); }
    else if (id === 'koch' || id === 'sierpinski') { setParamA(4); setParamB(1); setParamC(0); }
    else if (id === 'dragon') { setParamA(10); setParamB(1); setParamC(0); }
    else if (id === 'mandelbrot') { setParamA(1.0); setParamB(50); setParamC(0); }
    else { setParamA(2.0); setParamB(1.5); setParamC(0.0); }
    setZoomLevel(1.0);
  }, [selectedPreset]);

  /* ---------- Auto-rotate 3D ---------- */
  useEffect(() => {
    if (!autoRotate || mode !== '3d') return;
    let raf = 0;
    const loop = () => {
      setRotY3D(r => r + 0.008);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [autoRotate, mode]);

  /* ---------- Coordinate helpers (2D) ---------- */
  const defaultMinX = selectedPreset.defaultXRange[0];
  const defaultMaxX = selectedPreset.defaultXRange[1];
  const defaultMinY = selectedPreset.defaultYRange[0];
  const defaultMaxY = selectedPreset.defaultYRange[1];
  const minX = defaultMinX / zoomLevel;
  const maxX = defaultMaxX / zoomLevel;
  const minY = defaultMinY / zoomLevel;
  const maxY = defaultMaxY / zoomLevel;

  /* ---------- Evaluate 2D y = f(x) ---------- */
  const evalY = (x: number): number | null => {
    const id = selectedPreset.id;
    if (id === 'sin') return paramA * Math.sin(paramB * x + paramC);
    if (id === 'cos') return paramA * Math.cos(paramB * x + paramC);
    if (id === 'tan') {
      const v = Math.tan(paramB * x);
      if (Math.abs(v) > 20) return null;
      return paramA * v;
    }
    if (id === 'sinc') {
      const bx = paramB * x;
      return paramA * (Math.abs(bx) < 1e-6 ? 1 : Math.sin(bx) / bx);
    }
    if (id === 'parabola') return paramA * x * x;
    if (id === 'fourier') {
      let sum = 0;
      const h = Math.max(1, Math.floor(paramA));
      for (let k = 1; k <= h; k++) { const n = 2*k - 1; sum += Math.sin(n * x * paramB) / n; }
      return sum * 2.2;
    }
    if (id === 'damped') return paramA * Math.exp(-paramB * Math.abs(x)) * Math.sin(paramC * x);
    if (id === 'beats') return Math.sin(paramA * x) + Math.sin(paramB * x);
    if (id === 'exponential') return paramA * Math.exp(paramB * 0.3 * x);
    return 0;
  };

  /* ---------- Main canvas render ---------- */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    /* ============ 3D MODE ============ */
    if (mode === '3d') {
      const cx = W / 2, cy = H / 2;
      const focal = 600;
      const scale = zoom3D;

      // Floor grid
      if (showFloor) {
        const floorY = 2.5;
        const gridN = 10;
        const extent = 4;
        ctx.strokeStyle = 'rgba(100,116,139,0.25)';
        ctx.lineWidth = 1;
        for (let i = -gridN; i <= gridN; i++) {
          const t = (i / gridN) * extent;
          const a = project3D(-extent, floorY, t, rotX3D, rotY3D, focal, cx, cy, scale);
          const b = project3D( extent, floorY, t, rotX3D, rotY3D, focal, cx, cy, scale);
          const c = project3D(t, floorY, -extent, rotX3D, rotY3D, focal, cx, cy, scale);
          const d = project3D(t, floorY,  extent, rotX3D, rotY3D, focal, cx, cy, scale);
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.lineTo(d.x, d.y); ctx.stroke();
        }
      }

      // 3D axes
      if (showAxes3D) {
        const o = project3D(0,0,0, rotX3D, rotY3D, focal, cx, cy, scale);
        const axLen = 3;
        const axes: { p: [number,number,number]; color: string; label: string }[] = [
          { p: [axLen,0,0], color: '#ef4444', label: 'X' },
          { p: [0,axLen,0], color: '#22c55e', label: 'Y' },
          { p: [0,0,axLen], color: '#3b82f6', label: 'Z' },
        ];
        axes.forEach(ax => {
          const e = project3D(ax.p[0], ax.p[1], ax.p[2], rotX3D, rotY3D, focal, cx, cy, scale);
          ctx.strokeStyle = ax.color; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(o.x, o.y); ctx.lineTo(e.x, e.y); ctx.stroke();
          ctx.fillStyle = ax.color; ctx.font = 'bold 12px monospace';
          ctx.fillText(ax.label, e.x + 4, e.y - 4);
        });
      }

      // Build shape
      const segs = shape3D.build(p3A, p3B, p3C, p3Res);

      // Project and depth-sort by midpoint z
      type ProjSeg = { a: ReturnType<typeof project3D>; b: ReturnType<typeof project3D>; mz: number };
      const projected: ProjSeg[] = segs.map(([p1, p2]) => {
        const a = project3D(p1[0], p1[1], p1[2], rotX3D, rotY3D, focal, cx, cy, scale);
        const b = project3D(p2[0], p2[1], p2[2], rotX3D, rotY3D, focal, cx, cy, scale);
        return { a, b, mz: (a.z + b.z) / 2 };
      });
      projected.sort((x, y) => y.mz - x.mz); // back-to-front

      // Draw
      for (const s of projected) {
        const depth = (s.mz + 5) / 10; // normalize roughly
        const alpha = Math.max(0.15, Math.min(1, 1 - depth * 0.15));
        if (showWireframe) {
          ctx.strokeStyle = `rgba(96,165,250,${alpha})`;
          ctx.lineWidth = 1.1;
        } else {
          ctx.strokeStyle = `rgba(244,114,182,${alpha})`;
          ctx.lineWidth = 1.6;
        }
        ctx.beginPath();
        ctx.moveTo(s.a.x, s.a.y);
        ctx.lineTo(s.b.x, s.b.y);
        ctx.stroke();
      }

      // HUD
      ctx.fillStyle = 'rgba(148,163,184,0.9)';
      ctx.font = '10px monospace';
      ctx.fillText(`segments: ${segs.length}`, 10, 16);
      ctx.fillText(`rot: (${rotX3D.toFixed(2)}, ${rotY3D.toFixed(2)})`, 10, 28);
      ctx.fillText(`drag to orbit · scroll to zoom`, 10, H - 10);
      return;
    }

    /* ============ 2D MODE ============ */
    const toScreenX = (x: number) => ((x - minX) / (maxX - minX)) * W;
    const toScreenY = (y: number) => H - ((y - minY) / (maxY - minY)) * H;

    // Grid
    if (showGrid) {
      ctx.strokeStyle = document.documentElement.classList.contains('dark')
        ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)';
      ctx.lineWidth = 1;
      for (let x = Math.ceil(minX); x <= Math.floor(maxX); x++) {
        const sx = toScreenX(x);
        ctx.beginPath(); ctx.moveTo(sx, 0); ctx.lineTo(sx, H); ctx.stroke();
      }
      for (let y = Math.ceil(minY); y <= Math.floor(maxY); y++) {
        const sy = toScreenY(y);
        ctx.beginPath(); ctx.moveTo(0, sy); ctx.lineTo(W, sy); ctx.stroke();
      }
    }

    // Axes
    if (showAxes) {
      ctx.strokeStyle = '#64748b'; ctx.lineWidth = 1.5;
      const ox = toScreenX(0), oy = toScreenY(0);
      if (oy >= 0 && oy <= H) {
        ctx.beginPath(); ctx.moveTo(0, oy); ctx.lineTo(W, oy); ctx.stroke();
        ctx.font = '9px monospace'; ctx.fillStyle = '#94a3b8';
        ctx.fillText('X', W - 12, oy - 6);
      }
      if (ox >= 0 && ox <= W) {
        ctx.beginPath(); ctx.moveTo(ox, 0); ctx.lineTo(ox, H); ctx.stroke();
        ctx.font = '9px monospace'; ctx.fillStyle = '#94a3b8';
        ctx.fillText('Y', ox + 6, 12);
      }
    }

    // Curve
    ctx.lineWidth = 3.2;
    ctx.strokeStyle = '#3b82f6';
    ctx.beginPath();
    const N = 500;
    let isFirst = true;

    const plotType = selectedPreset.presetType;

    if (plotType === '2D') {
      for (let i = 0; i <= N; i++) {
        const x = minX + (i / N) * (maxX - minX);
        const y = evalY(x);
        if (y === null || !isFinite(y)) { isFirst = true; continue; }
        const sx = toScreenX(x), sy = toScreenY(y);
        if (sx < -5 || sx > W+5 || sy < -200 || sy > H+200) { isFirst = true; continue; }
        if (isFirst) { ctx.moveTo(sx, sy); isFirst = false; }
        else ctx.lineTo(sx, sy);
      }
      ctx.stroke();
    }
    else if (plotType === 'polar' || plotType === 'spiral') {
      const maxTheta = selectedPreset.id === 'spiral' ? (paramB * 2 * Math.PI)
                     : selectedPreset.id === 'log-spiral' ? 6 * Math.PI
                     : selectedPreset.id === 'butterfly' ? 12 * Math.PI
                     : 2 * Math.PI;
      const step = maxTheta / N;
      for (let i = 0; i <= N; i++) {
        const th = i * step;
        let r = 0;
        const id = selectedPreset.id;
        if (id === 'polar-heart') r = paramA * (1 - Math.sin(th));
        else if (id === 'circle') r = paramA;
        else if (id === 'rose') r = paramA * Math.cos(paramB * th);
        else if (id === 'limacon') r = paramA + paramB * Math.cos(th);
        else if (id === 'lemniscate') {
          const v = paramA * paramA * Math.cos(2 * th);
          if (v < 0) { isFirst = true; continue; }
          r = Math.sqrt(v);
        }
        else if (id === 'spiral') r = paramA * th;
        else if (id === 'log-spiral') r = paramA * Math.exp(paramB * th);
        else if (id === 'butterfly') {
          r = paramA * (Math.exp(Math.sin(th)) - 2*Math.cos(4*th) + Math.pow(Math.sin((2*th - Math.PI)/24), 5));
        }
        const x = r * Math.cos(th), y = r * Math.sin(th);
        const sx = toScreenX(x), sy = toScreenY(y);
        if (isFirst) { ctx.moveTo(sx, sy); isFirst = false; }
        else ctx.lineTo(sx, sy);
      }
      ctx.stroke();
    }
    else if (plotType === 'parametric') {
      const id = selectedPreset.id;
      const tMax = id === 'hypotrochoid' ? 20 * Math.PI : 2 * Math.PI;
      for (let i = 0; i <= N; i++) {
        const t = (i / N) * tMax;
        let x = 0, y = 0;
        if (id === 'ellipse') { x = paramA * Math.cos(t); y = paramB * Math.sin(t); }
        else if (id === 'hyperbola') {
          // parametrize both branches using cosh/sinh
          x = paramA * (1/Math.cos(t)) ;
          y = paramB * Math.tan(t);
          if (Math.abs(x) > 100 || Math.abs(y) > 100) { isFirst = true; continue; }
        }
        else if (id === 'lissajous') {
          x = Math.sin(paramA * t + paramC);
          y = Math.sin(paramB * t);
        }
        else if (id === 'hypotrochoid') {
          const R = paramA, r = paramB, d = paramC;
          x = (R - r) * Math.cos(t) + d * Math.cos(((R - r) / r) * t);
          y = (R - r) * Math.sin(t) - d * Math.sin(((R - r) / r) * t);
        }
        else if (id === 'astroid') {
          x = paramA * Math.pow(Math.cos(t), 3);
          y = paramA * Math.pow(Math.sin(t), 3);
        }
        const sx = toScreenX(x), sy = toScreenY(y);
        if (!isFinite(sx) || !isFinite(sy)) { isFirst = true; continue; }
        if (isFirst) { ctx.moveTo(sx, sy); isFirst = false; }
        else ctx.lineTo(sx, sy);
      }
      ctx.stroke();
    }
    else if (plotType === 'fractal') {
      const id = selectedPreset.id;
      ctx.lineWidth = 1.5;

      if (id === 'koch') {
        const depth = Math.min(6, Math.max(0, Math.floor(paramA)));
        // Build Koch snowflake
        const side = 3;
        const h = side * Math.sqrt(3) / 2;
        let pts: [number,number][] = [
          [-side/2, h/3], [side/2, h/3], [0, -2*h/3]
        ];
        const kochSubdivide = (arr: [number,number][]): [number,number][] => {
          const out: [number,number][] = [];
          for (let i = 0; i < arr.length; i++) {
            const A = arr[i], B = arr[(i+1)%arr.length];
            const dx = B[0]-A[0], dy = B[1]-A[1];
            const P1: [number,number] = [A[0]+dx/3, A[1]+dy/3];
            const P2: [number,number] = [A[0]+2*dx/3, A[1]+2*dy/3];
            const mx = (P1[0]+P2[0])/2, my = (P1[1]+P2[1])/2;
            const nx = -(P2[1]-P1[1]), ny = P2[0]-P1[0];
            const peak: [number,number] = [mx + nx*Math.sqrt(3)/2, my + ny*Math.sqrt(3)/2];
            out.push(A, P1, peak, P2);
          }
          return out;
        };
        for (let d = 0; d < depth; d++) pts = kochSubdivide(pts);
        ctx.beginPath();
        pts.forEach((p, i) => {
          const sx = toScreenX(p[0]), sy = toScreenY(p[1]);
          if (i === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
        });
        ctx.closePath(); ctx.stroke();
      }
      else if (id === 'sierpinski') {
        const depth = Math.min(8, Math.max(0, Math.floor(paramA)));
        const side = 4;
        const h = side * Math.sqrt(3) / 2;
        const A: [number,number] = [-side/2, -h/3];
        const B: [number,number] = [side/2, -h/3];
        const C: [number,number] = [0, 2*h/3];
        const draw = (a:[number,number], b:[number,number], c:[number,number], d:number) => {
          if (d === 0) {
            ctx.beginPath();
            ctx.moveTo(toScreenX(a[0]), toScreenY(a[1]));
            ctx.lineTo(toScreenX(b[0]), toScreenY(b[1]));
            ctx.lineTo(toScreenX(c[0]), toScreenY(c[1]));
            ctx.closePath(); ctx.stroke();
            return;
          }
          const m1: [number,number] = [(a[0]+b[0])/2, (a[1]+b[1])/2];
          const m2: [number,number] = [(b[0]+c[0])/2, (b[1]+c[1])/2];
          const m3: [number,number] = [(a[0]+c[0])/2, (a[1]+c[1])/2];
          draw(a, m1, m3, d-1); draw(m1, b, m2, d-1); draw(m3, m2, c, d-1);
        };
        draw(A, B, C, depth);
      }
      else if (id === 'dragon') {
        const iter = Math.min(15, Math.max(1, Math.floor(paramA)));
        let seq: number[] = [1];
        for (let i = 1; i < iter; i++) {
          const rev = [...seq].reverse().map(v => v === 1 ? 0 : 1);
          seq = [...seq, 1, ...rev];
        }
        const dirs: [number,number][] = [[1,0],[0,1],[-1,0],[0,-1]];
        let dir = 0;
        let x = 0, y = 0;
        const step = 3 / Math.pow(2, iter/2);
        ctx.beginPath();
        ctx.moveTo(toScreenX(x), toScreenY(y));
        for (const turn of seq) {
          dir = (dir + (turn === 1 ? 1 : 3)) % 4;
          x += dirs[dir][0] * step;
          y += dirs[dir][1] * step;
          ctx.lineTo(toScreenX(x), toScreenY(y));
        }
        ctx.stroke();
      }
      else if (id === 'mandelbrot') {
        // Low-res pixel render
        const maxIter = Math.max(10, Math.floor(paramB));
        const zoom = paramA;
        const imgW = 160, imgH = 120;
        const img = ctx.createImageData(imgW, imgH);
        const xMin = -2.5/zoom, xMax = 1.5/zoom;
        const yMin = -1.5/zoom, yMax = 1.5/zoom;
        for (let py = 0; py < imgH; py++) {
          for (let px = 0; px < imgW; px++) {
            const cx = xMin + (px / imgW) * (xMax - xMin);
            const cy = yMin + (py / imgH) * (yMax - yMin);
            let zx = 0, zy = 0, i = 0;
            while (zx*zx + zy*zy < 4 && i < maxIter) {
              const nx = zx*zx - zy*zy + cx;
              zy = 2*zx*zy + cy;
              zx = nx;
              i++;
            }
            const idx = (py * imgW + px) * 4;
            if (i === maxIter) {
              img.data[idx]=15; img.data[idx+1]=23; img.data[idx+2]=42; img.data[idx+3]=255;
            } else {
              const t = i / maxIter;
              img.data[idx]   = Math.floor(96 * t + 59 * (1-t));
              img.data[idx+1] = Math.floor(165 * t + 130 * (1-t));
              img.data[idx+2] = Math.floor(250 * t + 246 * (1-t));
              img.data[idx+3] = 255;
            }
          }
        }
        // Blit scaled
        const tmp = document.createElement('canvas');
        tmp.width = imgW; tmp.height = imgH;
        tmp.getContext('2d')!.putImageData(img, 0, 0);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(tmp, 0, 0, W, H);
      }
    }

    // Tangent
    if (showTangent && hoveredCoords && selectedPreset.presetType === '2D') {
      const h = 0.0001;
      const hX = hoveredCoords.x;
      const y0 = evalY(hX);
      const y1 = evalY(hX + h);
      const y2 = evalY(hX - h);
      if (y0 !== null && y1 !== null && y2 !== null) {
        const dy = (y1 - y2) / (2 * h);
        const px = toScreenX(hX), py = toScreenY(y0);
        ctx.beginPath(); ctx.arc(px, py, 5, 0, Math.PI*2);
        ctx.fillStyle = '#ef4444'; ctx.fill();
        ctx.strokeStyle = '#ef4444bb'; ctx.lineWidth = 1.8;
        ctx.setLineDash([4,4]);
        const L = 2;
        ctx.beginPath();
        ctx.moveTo(toScreenX(hX - L), toScreenY(y0 - dy*L));
        ctx.lineTo(toScreenX(hX + L), toScreenY(y0 + dy*L));
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#ef4444'; ctx.font = 'bold 10px monospace';
        ctx.fillText(`dy/dx = ${dy.toFixed(2)}`, px + 8, py - 8);
      }
    }
  }, [
    mode, selectedPreset, paramA, paramB, paramC, zoomLevel,
    showAxes, showGrid, showTangent, hoveredCoords, minX, maxX, minY, maxY,
    shape3D, rotX3D, rotY3D, zoom3D, p3A, p3B, p3C, p3Res,
    showWireframe, showFloor, showAxes3D
  ]);

  /* ---------- 2D Mouse ---------- */
  const handleMouseMove2D = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (mode !== '2d') return;
    const canvas = canvasRef.current; if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const px = (e.clientX - rect.left) * (canvas.width / rect.width);
    const mathX = minX + (px / canvas.width) * (maxX - minX);
    const y = evalY(mathX);
    setHoveredCoords({ x: mathX, y: y ?? 0 });
  };

  /* ---------- 3D Mouse (orbit + zoom) ---------- */
  const handleMouseDown3D = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (mode !== '3d') return;
    dragRef.current = { x: e.clientX, y: e.clientY, rx: rotX3D, ry: rotY3D };
  };
  const handleMouseMove3D = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (mode !== '3d' || !dragRef.current) return;
    const dx = e.clientX - dragRef.current.x;
    const dy = e.clientY - dragRef.current.y;
    setRotY3D(dragRef.current.ry + dx * 0.01);
    setRotX3D(Math.max(-Math.PI/2+0.01, Math.min(Math.PI/2-0.01,
      dragRef.current.rx + dy * 0.01)));
  };
  const handleMouseUp3D = () => { dragRef.current = null; };
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    if (mode !== '3d') return;
    e.preventDefault();
    setZoom3D(z => Math.max(10, Math.min(300, z - e.deltaY * 0.1)));
  };

  /* ---------- UI helpers ---------- */
  const paramActive = (p: 'a'|'b'|'c') => (selectedPreset.params ?? ['a','b','c']).includes(p);
  const paramLabel = (p: 'a'|'b'|'c') => (selectedPreset.paramLabels?.[p]) ?? (p === 'a' ? 'a' : p === 'b' ? 'b' : 'c');

  /* ============================================================
     RENDER
     ============================================================ */
  return (
    <div className="flex-1 flex flex-col md:flex-row h-full w-full min-h-0 text-[var(--theme-primary)]">
      {/* ================= SIDEBAR ================= */}
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
              {/* Header */}
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  {mode === '2d'
                    ? <Compass size={16} className="text-blue-500" />
                    : <Box size={16} className="text-rose-500" />}
                  <h3 className="font-bold text-sm tracking-tight">
                    {mode === '2d' ? 'Mathematical Library' : '3D Shape Library'}
                  </h3>
                </div>
                <p className="text-xs text-[var(--theme-secondary)]">
                  {mode === '2d'
                    ? 'Browse geometry by category:'
                    : 'Pick a surface or solid to explore:'}
                </p>
              </div>

              {/* ===== Mode toggle ===== */}
              <div className="grid grid-cols-2 gap-1 p-1 bg-[var(--theme-surface-alt)] rounded-xl border border-[var(--theme-border)]">
                <button
                  onClick={() => setMode('2d')}
                  className={`px-2 py-1.5 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all ${
                    mode === '2d' ? 'bg-blue-500 text-white shadow' : 'text-[var(--theme-secondary)] hover:text-[var(--theme-primary)]'
                  }`}
                >
                  <Sigma size={12} /> 2D Lab
                </button>
                <button
                  onClick={() => setMode('3d')}
                  className={`px-2 py-1.5 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all ${
                    mode === '3d' ? 'bg-rose-500 text-white shadow' : 'text-[var(--theme-secondary)] hover:text-[var(--theme-primary)]'
                  }`}
                >
                  <Box size={12} /> 3D Playground
                </button>
              </div>

              {mode === '2d' ? (
                <>
                  {/* ===== Category chips ===== */}
                  <div>
                    <span className="text-[10px] uppercase tracking-wider font-bold text-[var(--theme-secondary)] font-mono block mb-1.5 flex items-center gap-1">
                      <Filter size={10} /> Category
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {CATEGORIES.filter(c => c.id !== '3d').map(cat => (
                        <button
                          key={cat.id}
                          onClick={() => setActiveCategory(cat.id as PresetCategory | 'all')}
                          className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all flex items-center gap-1 ${
                            activeCategory === cat.id
                              ? 'bg-blue-500/15 border-blue-500/50 text-blue-500'
                              : 'bg-[var(--theme-surface-alt)] border-[var(--theme-border)] text-[var(--theme-secondary)] hover:text-[var(--theme-primary)]'
                          }`}
                        >
                          <span className={cat.color}>{cat.icon}</span>
                          {cat.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* ===== Preset list ===== */}
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-[var(--theme-secondary)] font-mono block mb-1.5">
                      Function Presets ({filteredPresets.length})
                    </span>
                    <div className="space-y-1">
                      {filteredPresets.map(p => (
                        <button
                          key={p.id}
                          onClick={() => setSelectedPreset(p)}
                          className={`w-full p-2.5 rounded-xl text-left text-xs font-semibold flex items-center justify-between border transition-all ${
                            selectedPreset.id === p.id
                              ? 'bg-blue-500/10 border-blue-500 text-blue-600 dark:text-blue-400'
                              : 'bg-[var(--theme-surface)] border-[var(--theme-border)] text-[var(--theme-secondary)] hover:bg-[var(--theme-hover-bg)]'
                          }`}
                        >
                          <div className="truncate pr-1">
                            <span className="block truncate font-bold">{p.name}</span>
                            <span className="text-[9px] font-mono opacity-80">{p.equation}</span>
                          </div>
                          {selectedPreset.id === p.id && <Check size={12} className="shrink-0" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* ===== Parameter sliders ===== */}
                  <div className="border-t border-[var(--theme-border)] pt-4 space-y-4">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-[var(--theme-secondary)] font-mono block">
                      Parameters
                    </span>
                    {(['a','b','c'] as const).map(p => {
                      if (!paramActive(p)) return null;
                      const val = p === 'a' ? paramA : p === 'b' ? paramB : paramC;
                      const set = p === 'a' ? setParamA : p === 'b' ? setParamB : setParamC;
                      const minV = p === 'c' && selectedPreset.id === 'sin' ? -3.14 : 0.1;
                      const maxV = p === 'c' && selectedPreset.id === 'sin' ? 3.14 : p === 'a' ? 8 : 6;
                      const step = 0.05;
                      return (
                        <div key={p}>
                          <div className="flex items-center justify-between text-xs font-bold font-mono tracking-tight mb-1">
                            <span>{paramLabel(p)}</span>
                            <span className="text-blue-500">{val.toFixed(2)}</span>
                          </div>
                          <input
                            type="range" min={minV} max={maxV} step={step}
                            value={val} onChange={e => set(Number(e.target.value))}
                            className="w-full h-1.5 rounded-lg bg-[var(--theme-border)] appearance-none cursor-pointer accent-blue-500"
                          />
                        </div>
                      );
                    })}
                  </div>

                  {/* ===== Toggles ===== */}
                  <div className="border-t border-[var(--theme-border)] pt-4 space-y-2.5">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-[var(--theme-secondary)] font-mono block">
                      Render Accessories
                    </span>
                    {[
                      { label: 'Show Grid Axes', val: showAxes, set: setShowAxes, always: true },
                      { label: 'Show Grid Lines', val: showGrid, set: setShowGrid, always: true },
                      { label: 'Show Tangent & dy/dx', val: showTangent, set: setShowTangent, always: false,
                        visible: selectedPreset.presetType === '2D' },
                    ].map((t, i) => (
                      (!('visible' in t) || t.visible) && (
                        <label key={i} className="flex items-center gap-2 text-xs font-medium cursor-pointer text-[var(--theme-secondary)] hover:text-[var(--theme-primary)]">
                          <input type="checkbox" checked={t.val} onChange={e => t.set(e.target.checked)}
                            className="rounded border-[var(--theme-border)] text-blue-500 accent-blue-500" />
                          {t.label}
                        </label>
                      )
                    ))}
                  </div>
                </>
              ) : (
                /* ============== 3D SIDEBAR ============== */
                <>
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-[var(--theme-secondary)] font-mono block mb-1.5">
                      Shape Presets ({SHAPE_3D_PRESETS.length})
                    </span>
                    <div className="space-y-1">
                      {SHAPE_3D_PRESETS.map(s => (
                        <button
                          key={s.id}
                          onClick={() => setShape3D(s)}
                          className={`w-full p-2.5 rounded-xl text-left text-xs font-semibold flex items-center justify-between border transition-all ${
                            shape3D.id === s.id
                              ? 'bg-rose-500/10 border-rose-500 text-rose-600 dark:text-rose-400'
                              : 'bg-[var(--theme-surface)] border-[var(--theme-border)] text-[var(--theme-secondary)] hover:bg-[var(--theme-hover-bg)]'
                          }`}
                        >
                          <div className="truncate pr-1">
                            <span className="block truncate font-bold">{s.name}</span>
                            <span className="text-[9px] opacity-70">{s.description}</span>
                          </div>
                          {shape3D.id === s.id && <Check size={12} className="shrink-0" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-[var(--theme-border)] pt-4 space-y-4">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-[var(--theme-secondary)] font-mono block">
                      Shape Parameters
                    </span>
                    {[
                      { label: 'Scale / a', val: p3A, set: setP3A, min: 0.2, max: 5 },
                      { label: 'Secondary / b', val: p3B, set: setP3B, min: 0.1, max: 5 },
                      { label: 'Tertiary / c', val: p3C, set: setP3C, min: 0.1, max: 8 },
                      { label: 'Resolution', val: p3Res, set: setP3Res, min: 6, max: 60 },
                    ].map(p => (
                      <div key={p.label}>
                        <div className="flex items-center justify-between text-xs font-bold font-mono tracking-tight mb-1">
                          <span>{p.label}</span>
                          <span className="text-rose-500">{p.val.toFixed(1)}</span>
                        </div>
                        <input type="range" min={p.min} max={p.max} step={0.05}
                          value={p.val} onChange={e => p.set(Number(e.target.value))}
                          className="w-full h-1.5 rounded-lg bg-[var(--theme-border)] appearance-none cursor-pointer accent-rose-500" />
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-[var(--theme-border)] pt-4 space-y-2.5">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-[var(--theme-secondary)] font-mono block">
                      3D View
                    </span>
                    {[
                      { label: 'Auto-rotate', val: autoRotate, set: setAutoRotate, icon: <Orbit size={12}/> },
                      { label: 'Wireframe mode', val: showWireframe, set: setShowWireframe, icon: <Grid3x3 size={12}/> },
                      { label: 'Show floor grid', val: showFloor, set: setShowFloor, icon: <Layers size={12}/> },
                      { label: 'Show 3D axes', val: showAxes3D, set: setShowAxes3D, icon: <Compass size={12}/> },
                    ].map((t, i) => (
                      <label key={i} className="flex items-center gap-2 text-xs font-medium cursor-pointer text-[var(--theme-secondary)] hover:text-[var(--theme-primary)]">
                        <input type="checkbox" checked={t.val} onChange={e => t.set(e.target.checked)}
                          className="rounded border-[var(--theme-border)] text-rose-500 accent-rose-500" />
                        {t.icon}
                        {t.label}
                      </label>
                    ))}
                    <button
                      onClick={() => { setRotX3D(-0.5); setRotY3D(0.7); setZoom3D(60); }}
                      className="w-full mt-2 px-3 py-1.5 rounded-lg text-[11px] font-bold border border-[var(--theme-border)] text-[var(--theme-secondary)] hover:text-rose-500 hover:border-rose-500 flex items-center justify-center gap-1.5 transition-all"
                    >
                      <RotateCcw size={12} /> Reset Camera
                    </button>
                  </div>

                  <div className="border-t border-[var(--theme-border)] pt-3 text-[10px] text-[var(--theme-secondary)] leading-relaxed">
                    <p className="font-bold text-[var(--theme-primary)] mb-1 flex items-center gap-1">
                      <MousePointer2 size={10} /> Controls
                    </p>
                    <p>• Drag canvas to orbit</p>
                    <p>• Scroll wheel to zoom</p>
                    <p>• Use sliders to deform shape</p>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ================= MAIN AREA ================= */}
      <div className="flex-1 flex flex-col min-h-0 bg-[var(--theme-surface-alt)] relative">
        {/* Header */}
        <div className="px-4 py-3 border-b border-[var(--theme-border)] flex flex-wrap items-center justify-between gap-3 bg-[var(--theme-surface)]">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSidebarOpen(p => !p)}
              className={`p-1.5 rounded-xl border flex items-center justify-center transition-all cursor-pointer h-8 px-2.5 gap-1.5 text-xs font-bold leading-none ${
                isSidebarOpen
                  ? 'bg-[var(--theme-surface-alt)] border-[var(--theme-accent)] text-[var(--theme-accent)]'
                  : 'bg-[var(--theme-surface)] border-[var(--theme-border)] text-[var(--theme-primary)] hover:bg-[var(--theme-hover-bg)]'
              }`}
            >
              <Sliders size={12} />
              <span className="hidden sm:inline">{isSidebarOpen ? 'Hide' : 'Controls'}</span>
            </button>
            <span className={`h-2 w-2 rounded-full animate-pulse ${mode === '2d' ? 'bg-blue-500' : 'bg-rose-500'}`} />
            <span className="text-xs font-bold uppercase font-mono tracking-wider">
              {mode === '2d' ? 'Analytical Plotter' : '3D Geometry Playground'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {mode === '2d' && (
              <div className="hidden lg:flex items-center gap-1.5 border-r border-[var(--theme-border)] pr-2 select-none h-8 mr-1">
                <button onClick={() => setShowAxes(p => !p)}
                  className={`h-7 px-2.5 rounded-lg text-[10px] uppercase tracking-wider font-extrabold border transition-all cursor-pointer ${
                    showAxes ? 'bg-blue-500/15 border-blue-500/40 text-blue-500'
                             : 'bg-[var(--theme-surface)] border-[var(--theme-border)] text-zinc-500'}`}>
                  Axes
                </button>
                <button onClick={() => setShowGrid(p => !p)}
                  className={`h-7 px-2.5 rounded-lg text-[10px] uppercase tracking-wider font-extrabold border transition-all cursor-pointer ${
                    showGrid ? 'bg-blue-500/15 border-blue-500/40 text-blue-500'
                             : 'bg-[var(--theme-surface)] border-[var(--theme-border)] text-zinc-500'}`}>
                  Grid
                </button>
                {selectedPreset.presetType === '2D' && (
                  <button onClick={() => setShowTangent(p => !p)}
                    className={`h-7 px-2.5 rounded-lg text-[10px] uppercase tracking-wider font-extrabold border transition-all cursor-pointer ${
                      showTangent ? 'bg-blue-500/15 border-blue-500/40 text-blue-500'
                                  : 'bg-[var(--theme-surface)] border-[var(--theme-border)] text-zinc-500'}`}>
                    Tangent
                  </button>
                )}
              </div>
            )}

            {mode === '3d' && (
              <div className="hidden lg:flex items-center gap-1.5 border-r border-[var(--theme-border)] pr-2 h-8 mr-1">
                <button onClick={() => setAutoRotate(p => !p)}
                  className={`h-7 px-2.5 rounded-lg text-[10px] uppercase tracking-wider font-extrabold border transition-all cursor-pointer flex items-center gap-1 ${
                    autoRotate ? 'bg-rose-500/15 border-rose-500/40 text-rose-500'
                               : 'bg-[var(--theme-surface)] border-[var(--theme-border)] text-zinc-500'}`}>
                  {autoRotate ? <Pause size={10}/> : <Play size={10}/>}
                  {autoRotate ? 'Stop' : 'Spin'}
                </button>
                <button onClick={() => setShowWireframe(p => !p)}
                  className={`h-7 px-2.5 rounded-lg text-[10px] uppercase tracking-wider font-extrabold border transition-all cursor-pointer flex items-center gap-1 ${
                    showWireframe ? 'bg-rose-500/15 border-rose-500/40 text-rose-500'
                                  : 'bg-[var(--theme-surface)] border-[var(--theme-border)] text-zinc-500'}`}>
                  {showWireframe ? <Eye size={10}/> : <EyeOff size={10}/>}
                  Wire
                </button>
              </div>
            )}

            {mode === '2d' && (
              <div className="flex items-center bg-[var(--theme-surface-alt)] border border-[var(--theme-border)] rounded-xl overflow-hidden h-8">
                <button onClick={() => setZoomLevel(p => Math.max(0.25, Number((p - 0.25).toFixed(2))))}
                  className="h-full px-3 text-[var(--theme-secondary)] hover:text-[var(--theme-primary)] hover:bg-[var(--theme-hover-bg)] border-r border-[var(--theme-border)] transition-all cursor-pointer flex items-center justify-center font-bold text-sm">
                  <ZoomOut size={12} className="mr-0.5" /><span>−</span>
                </button>
                <div className="px-2.5 font-mono text-[10px] text-[var(--theme-secondary)] select-none font-bold min-w-[48px] text-center">
                  {Math.round(zoomLevel * 100)}%
                </div>
                <button onClick={() => setZoomLevel(p => Math.min(4.0, Number((p + 0.25).toFixed(2))))}
                  className="h-full px-3 text-[var(--theme-secondary)] hover:text-[var(--theme-primary)] hover:bg-[var(--theme-hover-bg)] border-l border-[var(--theme-border)] transition-all cursor-pointer flex items-center justify-center font-bold text-sm">
                  <ZoomIn size={12} className="mr-0.5" /><span>+</span>
                </button>
              </div>
            )}

            <button
              onClick={() => {
                if (mode === '2d') {
                  setParamA(2); setParamB(1.5); setParamC(0); setZoomLevel(1);
                } else {
                  setP3A(2); setP3B(1); setP3C(2); setP3Res(24);
                  setRotX3D(-0.5); setRotY3D(0.7); setZoom3D(60);
                }
              }}
              className="h-8 px-3 text-xs bg-[var(--theme-surface)] border border-[var(--theme-border)] text-[var(--theme-secondary)] hover:text-blue-500 rounded-xl transition-all flex items-center gap-1 cursor-pointer">
              <RotateCcw size={13} /> Reset
            </button>

            {onClose && (
              <button onClick={onClose}
                className="p-1.5 bg-[var(--theme-surface-alt)] border border-[var(--theme-border)] text-[var(--theme-secondary)] hover:text-red-500 rounded-xl transition-colors cursor-pointer h-8 w-8 flex items-center justify-center hover:bg-red-500/10 hover:border-red-500">
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Sub-header HUD */}
        <div className="bg-[var(--theme-surface)] border-b border-[var(--theme-border)]/50 px-4 py-2 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-[var(--theme-secondary)] font-medium">
              {mode === '2d' ? 'Evaluation:' : 'Surface:'}
            </span>
            <span className={`font-mono font-bold ${mode === '2d' ? 'text-blue-500' : 'text-rose-500'}`}>
              {mode === '2d' ? selectedPreset.formulaLabel : shape3D.name}
            </span>
            {mode === '2d' && (
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[var(--theme-surface-alt)] border border-[var(--theme-border)] text-[var(--theme-secondary)] ml-1">
                {CATEGORIES.find(c => c.id === selectedPreset.category)?.label}
              </span>
            )}
          </div>
          {hoveredCoords && mode === '2d' && (
            <div className="text-[10px] font-mono font-bold bg-[var(--theme-surface-alt)] px-2 py-0.5 rounded border border-[var(--theme-border)] text-blue-500">
              X: {hoveredCoords.x.toFixed(3)}, Y: {hoveredCoords.y.toFixed(3)}
            </div>
          )}
        </div>

        {/* Canvas stage */}
        <div className="flex-1 min-h-0 flex items-center justify-center p-4 relative">
          <canvas
            ref={canvasRef}
            width={640}
            height={480}
            onMouseMove={e => { handleMouseMove2D(e); handleMouseMove3D(e); }}
            onMouseLeave={() => { setHoveredCoords(null); handleMouseUp3D(); }}
            onMouseDown={handleMouseDown3D}
            onMouseUp={handleMouseUp3D}
            onWheel={handleWheel}
            className={`w-full max-w-[720px] h-[480px] border border-transparent rounded-2xl ${
              mode === '3d' ? 'cursor-grab active:cursor-grabbing' : 'cursor-crosshair'
            }`}
            style={{ background: 'radial-gradient(ellipse at center, rgba(59,130,246,0.04), transparent 70%)' }}
          />

          {mode === '3d' && (
            <div className="absolute bottom-4 left-4 right-4 bg-[var(--theme-surface)]/85 backdrop-blur-md border border-[var(--theme-border)] rounded-xl p-3 text-[10px] text-[var(--theme-secondary)] text-center">
              <strong className="text-rose-500">{shape3D.name}</strong> · {shape3D.description}
            </div>
          )}

          {mode === '2d' && (selectedPreset.presetType === 'polar' || selectedPreset.presetType === 'spiral' || selectedPreset.presetType === 'parametric') && (
            <div className="absolute bottom-4 left-4 right-4 bg-[var(--theme-surface)]/85 backdrop-blur-md border border-[var(--theme-border)] rounded-xl p-3 text-[10px] text-[var(--theme-secondary)] text-center">
              Rendering a <strong>{selectedPreset.presetType}</strong> curve — adjust sliders to morph geometry in real time.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};