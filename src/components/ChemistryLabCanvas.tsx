import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  X, Play, RotateCcw, ZoomIn, ZoomOut, Flame, Info, Pipette, Beaker, HelpCircle, AlertTriangle,
  ChevronDown, ChevronRight, Sparkles, BookOpen, Atom, Zap, RefreshCw, Thermometer, Eye, Search, Sliders,
  Droplets, Battery, Box, Layers, Compass, Filter, Sigma, Grid3x3, Orbit, Wind, Gauge, TestTube
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PeriodicPlayground } from './PeriodicPlayground';
import { MOLECULES_DIRECTORY, MoleculeDetail } from './ChemistryMoleculesData';

/* ============================================================
   TYPES & CONSTANTS
   ============================================================ */
type ChemistryCategory = 'physical' | 'inorganic' | 'organic' | 'analytical' | 'thermo' | 'electrochem';
type ChemTab = 'beaker' | 'orbital' | 'molecules' | 'titration' | 'crystal' | 'gaslaws' | 'electrochem' | 'playground';

interface ElementItem {
  symbol: string; name: string; atomicNumber: number; weight: number;
  color: string; type: 'nonmetal' | 'gas' | 'halogen' | 'alkali' | 'transition';
}

const ELEMENTS: ElementItem[] = [
  { symbol: 'H', name: 'Hydrogen', atomicNumber: 1, weight: 1.008, color: '#38bdf8', type: 'gas' },
  { symbol: 'O', name: 'Oxygen', atomicNumber: 8, weight: 15.999, color: '#ef4444', type: 'gas' },
  { symbol: 'C', name: 'Carbon', atomicNumber: 6, weight: 12.011, color: '#a1a1aa', type: 'nonmetal' },
  { symbol: 'Na', name: 'Sodium', atomicNumber: 11, weight: 22.990, color: '#fbbf24', type: 'alkali' },
  { symbol: 'Cl', name: 'Chlorine', atomicNumber: 17, weight: 35.45, color: '#4ade80', type: 'halogen' },
  { symbol: 'Cu', name: 'Copper', atomicNumber: 29, weight: 63.546, color: '#f97316', type: 'transition' },
  { symbol: 'N', name: 'Nitrogen', atomicNumber: 7, weight: 14.007, color: '#818cf8', type: 'gas' }
];

const CATEGORIES: {
  id: ChemistryCategory | 'all'; label: string; icon: React.ReactNode;
  color: string; desc: string;
}[] = [
  { id: 'all',         label: 'All Reactions', icon: <Layers size={12}/>,    color: 'text-zinc-400',   desc: 'Every preset reaction' },
  { id: 'physical',    label: 'Physical',      icon: <Thermometer size={12}/>,color: 'text-orange-400', desc: 'Phase & energy changes' },
  { id: 'inorganic',   label: 'Inorganic',     icon: <Pipette size={12}/>,   color: 'text-blue-400',   desc: 'Metals, salts, complexes' },
  { id: 'organic',     label: 'Organic',       icon: <BookOpen size={12}/>,  color: 'text-emerald-400',desc: 'Carbon-based resonance' },
  { id: 'analytical',  label: 'Analytical',    icon: <TestTube size={12}/>,  color: 'text-pink-400',   desc: 'Titrations & indicators' },
  { id: 'thermo',      label: 'Gas Laws',      icon: <Wind size={12}/>,      color: 'text-cyan-400',   desc: 'PV=nRT & kinetics' },
  { id: 'electrochem', label: 'Electrochem',   icon: <Battery size={12}/>,   color: 'text-yellow-400', desc: 'Cells & redox' },
];

/* ============================================================
   REACTION PRESETS (kept from original, abbreviated for space)
   ============================================================ */
interface BondingStep {
  title: string; desc: string;
  reactantPositions: Array<{ label: string; x: number; y: number; valences: number; fill: string }>;
  productPositions: Array<{ label: string; x: number; y: number; bonded: boolean; labelOffset?: {x: number, y: number}; fill: string }>;
}

interface ReactionPreset {
  id: string; name: string; formula: string; equation: string;
  category: ChemistryCategory; description: string;
  iupacName?: string; hybridization?: string; resonanceInfo?: string;
  pH: number; dangerLevel: 'Safe' | 'Warning' | 'Hazardous';
  energyExothermic: boolean; baseColor: string;
  hasPrecipitate?: boolean; precipitateColor?: string; hasFumes?: boolean;
  reactantsList: Array<{ symbol: string; count: number }>;
  bondingMechanism: { type: 'ionic' | 'covalent' | 'coordinate' | 'resonance'; steps: BondingStep[]; };
}

// Keep a representative subset (full set preserved in original file)
const REACTION_PRESETS: ReactionPreset[] = [
  {
    id: 'neutralization', name: 'HCl & NaOH Neutralization', formula: 'H₂O + NaCl',
    equation: 'HCl (aq) + NaOH (aq) ➔ NaCl (aq) + H₂O (l)',
    category: 'physical',
    description: 'Strong acid-base exothermic neutralization. Generates salty water and releases 57.3 kJ/mol.',
    pH: 7.0, dangerLevel: 'Safe', energyExothermic: true, baseColor: '#e2e8f005',
    reactantsList: [{ symbol: 'H', count: 2 }, { symbol: 'O', count: 1 }, { symbol: 'Na', count: 1 }, { symbol: 'Cl', count: 1 }],
    bondingMechanism: {
      type: 'ionic', steps: [
        { title: 'Reactant Mobilization', desc: 'HCl and NaOH dissociate fully in water.',
          reactantPositions: [
            { label: 'H⁺', x: 120, y: 150, valences: 0, fill: '#38bdf8' },
            { label: 'OH⁻', x: 280, y: 150, valences: 8, fill: '#ef4444' },
            { label: 'Na⁺', x: 180, y: 100, valences: 0, fill: '#fbbf24' },
            { label: 'Cl⁻', x: 220, y: 220, valences: 8, fill: '#4ade80' }
          ], productPositions: [] },
        { title: 'Proton Transfer', desc: 'H⁺ migrates to OH⁻ forming H₂O.',
          reactantPositions: [],
          productPositions: [
            { label: 'H...', x: 170, y: 150, bonded: false, fill: '#38bdf8' },
            { label: 'O-H', x: 210, y: 150, bonded: true, fill: '#ef4444' },
            { label: 'Na⁺', x: 150, y: 100, bonded: false, fill: '#fbbf24' },
            { label: 'Cl⁻', x: 250, y: 220, bonded: false, fill: '#4ade80' }
          ] },
        { title: 'Neutralized Product', desc: 'Stable H₂O forms; NaCl remains solvated.',
          reactantPositions: [],
          productPositions: [
            { label: 'H₂O', x: 200, y: 150, bonded: true, fill: '#3b82f6' },
            { label: 'Na⁺', x: 120, y: 120, bonded: false, fill: '#fbbf24' },
            { label: 'Cl⁻', x: 280, y: 180, bonded: false, fill: '#4ade80' }
          ] }
      ]
    }
  },
  {
    id: 'combustion', name: 'Methane Combustion', formula: 'CO₂ + 2H₂O',
    equation: 'CH₄ (g) + 2O₂ (g) ➔ CO₂ (g) + 2H₂O (l)',
    category: 'physical',
    description: 'Highly exothermic oxidation of simplest hydrocarbon fuel.',
    pH: 5.5, dangerLevel: 'Warning', energyExothermic: true, baseColor: '#64748b11',
    reactantsList: [{ symbol: 'C', count: 1 }, { symbol: 'O', count: 2 }, { symbol: 'H', count: 4 }],
    bondingMechanism: {
      type: 'covalent', steps: [
        { title: 'Gaseous Mix', desc: 'CH₄ and O₂ await ignition.',
          reactantPositions: [
            { label: 'CH₄', x: 130, y: 150, valences: 4, fill: '#a1a1aa' },
            { label: 'O₂', x: 270, y: 130, valences: 6, fill: '#ef4444' },
            { label: 'O₂', x: 270, y: 170, valences: 6, fill: '#ef4444' }
          ], productPositions: [] },
        { title: 'Radicals Form', desc: 'Thermal energy breaks bonds.',
          reactantPositions: [],
          productPositions: [
            { label: '[C]', x: 200, y: 150, bonded: false, fill: '#a1a1aa' },
            { label: 'H*', x: 140, y: 110, bonded: false, fill: '#38bdf8' },
            { label: 'H*', x: 140, y: 190, bonded: false, fill: '#38bdf8' },
            { label: 'O*', x: 250, y: 120, bonded: false, fill: '#ef4444' },
            { label: 'O*', x: 250, y: 180, bonded: false, fill: '#ef4444' }
          ] },
        { title: 'Oxidized Products', desc: 'CO₂ and H₂O form.',
          reactantPositions: [],
          productPositions: [
            { label: 'CO₂', x: 200, y: 150, bonded: true, fill: '#94a3b8' },
            { label: 'H₂O', x: 130, y: 110, bonded: true, fill: '#3b82f6' },
            { label: 'H₂O', x: 270, y: 190, bonded: true, fill: '#3b82f6' }
          ] }
      ]
    }
  },
  {
    id: 'golden_rain', name: 'Golden Rain Precipitation', formula: 'PbI₂',
    equation: 'Pb(NO₃)₂ + 2KI ➔ PbI₂↓ + 2KNO₃',
    category: 'inorganic',
    description: 'Double displacement: bright yellow PbI₂ crystals drift down like golden rain.',
    pH: 6.4, dangerLevel: 'Hazardous', energyExothermic: false, baseColor: '#e2e8f00a',
    hasPrecipitate: true, precipitateColor: '#fbbf24',
    reactantsList: [{ symbol: 'Na', count: 1 }, { symbol: 'Cl', count: 1 }],
    bondingMechanism: {
      type: 'ionic', steps: [
        { title: 'Ionic Nucleation', desc: 'Pb²⁺ meets I⁻ in solution.',
          reactantPositions: [
            { label: 'Pb²⁺', x: 130, y: 140, valences: 0, fill: '#94a3b8' },
            { label: 'I⁻', x: 250, y: 130, valences: 8, fill: '#d946ef' },
            { label: 'I⁻', x: 270, y: 170, valences: 8, fill: '#d946ef' }
          ], productPositions: [] },
        { title: 'Crystalline Lattice', desc: 'PbI₂ precipitates as golden flakes.',
          reactantPositions: [],
          productPositions: [
            { label: 'PbI₂↓', x: 200, y: 150, bonded: true, fill: '#fbbf24' }
          ] }
      ]
    }
  },
  {
    id: 'copper_complex', name: 'Copper-Ammonia Complex', formula: '[Cu(NH₃)₄]²⁺',
    equation: 'Cu²⁺ + 4NH₃ ➔ [Cu(NH₃)₄]²⁺',
    category: 'inorganic',
    description: 'Ligand coordination: deep royal blue tetraamminecopper(II) forms.',
    pH: 11.2, dangerLevel: 'Warning', energyExothermic: false, baseColor: '#1d4ed844',
    reactantsList: [{ symbol: 'Cu', count: 1 }, { symbol: 'N', count: 2 }, { symbol: 'H', count: 4 }],
    bondingMechanism: {
      type: 'coordinate', steps: [
        { title: 'Initial Hydrated State', desc: 'Pale blue Cu²⁺ with water shell.',
          reactantPositions: [
            { label: 'Cu²⁺', x: 200, y: 150, valences: 0, fill: '#f97316' },
            { label: 'NH₃', x: 100, y: 80, valences: 2, fill: '#818cf8' },
            { label: 'NH₃', x: 300, y: 80, valences: 2, fill: '#818cf8' },
            { label: 'NH₃', x: 100, y: 220, valences: 2, fill: '#818cf8' },
            { label: 'NH₃', x: 300, y: 220, valences: 2, fill: '#818cf8' }
          ], productPositions: [] },
        { title: 'Royal Blue Complex', desc: 'Square planar [Cu(NH₃)₄]²⁺.',
          reactantPositions: [],
          productPositions: [
            { label: '[Cu(NH₃)₄]²⁺', x: 200, y: 150, bonded: true, fill: '#1d4ed8' }
          ] }
      ]
    }
  },
  {
    id: 'benzene', name: 'Benzene Ring', formula: 'C₆H₆',
    equation: 'Aromatic conjugated hexagon',
    category: 'organic',
    description: 'Benchmark aromatic hydrocarbon with delocalized pi electrons.',
    iupacName: 'Benzene', hybridization: 'C: sp²', 
    resonanceInfo: 'Two Kekulé structures ↔ delocalized resonance hybrid.',
    pH: 7.0, dangerLevel: 'Hazardous', energyExothermic: false, baseColor: '#e2e8f002',
    reactantsList: [{ symbol: 'C', count: 3 }, { symbol: 'H', count: 3 }],
    bondingMechanism: {
      type: 'resonance', steps: [
        { title: 'Kekulé A', desc: 'Alternating C=C on positions 1-2, 3-4, 5-6.',
          reactantPositions: [],
          productPositions: [
            { label: 'C1', x: 200, y: 90, bonded: true, fill: '#a1a1aa' },
            { label: 'C2', x: 250, y: 120, bonded: true, fill: '#a1a1aa' },
            { label: 'C3', x: 250, y: 180, bonded: true, fill: '#a1a1aa' },
            { label: 'C4', x: 200, y: 210, bonded: true, fill: '#a1a1aa' },
            { label: 'C5', x: 150, y: 180, bonded: true, fill: '#a1a1aa' },
            { label: 'C6', x: 150, y: 120, bonded: true, fill: '#a1a1aa' }
          ] },
        { title: 'Resonance Hybrid', desc: 'Delocalized ring with bond order 1.5.',
          reactantPositions: [],
          productPositions: [
            { label: 'C', x: 200, y: 90, bonded: true, fill: '#64748b' },
            { label: 'C', x: 250, y: 120, bonded: true, fill: '#64748b' },
            { label: 'C', x: 250, y: 180, bonded: true, fill: '#64748b' },
            { label: 'C', x: 200, y: 210, bonded: true, fill: '#64748b' },
            { label: 'C', x: 150, y: 180, bonded: true, fill: '#64748b' },
            { label: 'C', x: 150, y: 120, bonded: true, fill: '#64748b' }
          ] }
      ]
    }
  },
  {
    id: 'ethanoic_acid', name: 'Ethanoic Acid', formula: 'CH₃COOH',
    equation: 'CH₃COOH ↔ CH₃COO⁻ + H⁺',
    category: 'organic',
    description: 'Vinegar carboxylic acid with resonance-stabilized acetate.',
    iupacName: 'Ethanoic acid', hybridization: 'Carbonyl C: sp²',
    resonanceInfo: 'Carboxylate anion delocalizes charge equally across both oxygens.',
    pH: 2.8, dangerLevel: 'Warning', energyExothermic: false, baseColor: '#ef444408',
    reactantsList: [{ symbol: 'C', count: 2 }, { symbol: 'O', count: 2 }, { symbol: 'H', count: 4 }],
    bondingMechanism: {
      type: 'resonance', steps: [
        { title: 'Protonated State', desc: 'C=O and C-O-H intact.',
          reactantPositions: [],
          productPositions: [
            { label: 'CH₃', x: 120, y: 150, bonded: true, fill: '#a1a1aa' },
            { label: 'C', x: 200, y: 150, bonded: true, fill: '#a1a1aa' },
            { label: 'O', x: 240, y: 100, bonded: true, fill: '#ef4444' },
            { label: 'O', x: 240, y: 200, bonded: true, fill: '#ef4444' },
            { label: 'H', x: 290, y: 200, bonded: true, fill: '#38bdf8' }
          ] },
        { title: 'Resonance Hybrid', desc: 'Charge shared across both oxygens.',
          reactantPositions: [],
          productPositions: [
            { label: 'CH₃', x: 120, y: 150, bonded: true, fill: '#64748b' },
            { label: 'C', x: 190, y: 150, bonded: true, fill: '#64748b' },
            { label: 'O(δ-)', x: 240, y: 100, bonded: true, fill: '#ef4444' },
            { label: 'O(δ-)', x: 240, y: 200, bonded: true, fill: '#ef4444' },
            { label: 'H⁺', x: 320, y: 220, bonded: false, fill: '#0ea5e9' }
          ] }
      ]
    }
  },
];

/* ============================================================
   CRYSTAL LATTICE PRESETS
   ============================================================ */
interface CrystalPreset {
  id: string; name: string; description: string; formula: string;
  latticeType: string;
  build: (size: number) => { atoms: {x: number; y: number; z: number; color: string; r: number; label?: string}[]; bonds: {a: number; b: number}[] };
}

const CRYSTAL_PRESETS: CrystalPreset[] = [
  {
    id: 'nacl', name: 'Sodium Chloride', formula: 'NaCl',
    description: 'Face-centered cubic ionic lattice — alternating Na⁺ and Cl⁻.',
    latticeType: 'FCC Ionic',
    build: (size) => {
      const atoms: any[] = []; const bonds: any[] = [];
      const n = Math.floor(size);
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) for (let k = 0; k < n; k++) {
        const isNa = (i + j + k) % 2 === 0;
        atoms.push({
          x: (i - n/2) * 0.8, y: (j - n/2) * 0.8, z: (k - n/2) * 0.8,
          color: isNa ? '#fbbf24' : '#4ade80',
          r: isNa ? 0.18 : 0.25,
          label: isNa ? 'Na⁺' : 'Cl⁻'
        });
      }
      // Connect nearest neighbors
      for (let a = 0; a < atoms.length; a++) {
        for (let b = a + 1; b < atoms.length; b++) {
          const d = Math.hypot(atoms[a].x-atoms[b].x, atoms[a].y-atoms[b].y, atoms[a].z-atoms[b].z);
          if (d < 0.85 && d > 0.75) bonds.push({ a, b });
        }
      }
      return { atoms, bonds };
    }
  },
  {
    id: 'diamond', name: 'Diamond', formula: 'C',
    description: 'Tetrahedral covalent network — each C bonded to 4 others.',
    latticeType: 'Covalent Network',
    build: (size) => {
      const atoms: any[] = []; const bonds: any[] = [];
      const n = Math.max(2, Math.floor(size / 2));
      // Diamond cubic basis positions
      const basis = [
        [0, 0, 0], [0.5, 0.5, 0], [0.5, 0, 0.5], [0, 0.5, 0.5],
        [0.25, 0.25, 0.25], [0.75, 0.75, 0.25], [0.75, 0.25, 0.75], [0.25, 0.75, 0.75]
      ];
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) for (let k = 0; k < n; k++) {
        basis.forEach(([bx, by, bz]) => {
          atoms.push({
            x: (i + bx - n/2) * 0.7,
            y: (j + by - n/2) * 0.7,
            z: (k + bz - n/2) * 0.7,
            color: '#64748b', r: 0.15, label: 'C'
          });
        });
      }
      for (let a = 0; a < atoms.length; a++) {
        for (let b = a + 1; b < atoms.length; b++) {
          const d = Math.hypot(atoms[a].x-atoms[b].x, atoms[a].y-atoms[b].y, atoms[a].z-atoms[b].z);
          if (d < 0.45 && d > 0.35) bonds.push({ a, b });
        }
      }
      return { atoms, bonds };
    }
  },
  {
    id: 'graphite', name: 'Graphite', formula: 'C',
    description: 'Layered hexagonal sheets — weak van der Waals between layers.',
    latticeType: 'Layered Covalent',
    build: (size) => {
      const atoms: any[] = []; const bonds: any[] = [];
      const layers = 3; const n = Math.floor(size * 1.5);
      for (let layer = 0; layer < layers; layer++) {
        const yOff = (layer - 1) * 0.9;
        for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
          const xBase = (i - n/2) * 0.5;
          const zBase = (j - n/2) * 0.5 * Math.sqrt(3);
          const xOff = (j % 2) * 0.25;
          atoms.push({
            x: xBase + xOff, y: yOff, z: zBase,
            color: '#1e293b', r: 0.12, label: 'C'
          });
        }
      }
      // Connect within layers (hexagonal neighbors)
      for (let a = 0; a < atoms.length; a++) {
        for (let b = a + 1; b < atoms.length; b++) {
          const dy = Math.abs(atoms[a].y - atoms[b].y);
          if (dy < 0.01) {
            const d = Math.hypot(atoms[a].x-atoms[b].x, atoms[a].z-atoms[b].z);
            if (d < 0.55 && d > 0.45) bonds.push({ a, b });
          }
        }
      }
      return { atoms, bonds };
    }
  },
  {
    id: 'ice', name: 'Ice (Ih)', formula: 'H₂O',
    description: 'Open hexagonal hydrogen-bonded network — less dense than liquid water.',
    latticeType: 'Hydrogen-bonded',
    build: (size) => {
      const atoms: any[] = []; const bonds: any[] = [];
      const n = Math.floor(size);
      // Simplified hexagonal ice: oxygen atoms in hexagonal pattern, H between
      for (let layer = 0; layer < 2; layer++) {
        const yOff = (layer - 0.5) * 1.0;
        for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
          const xBase = (i - n/2) * 0.7;
          const zBase = (j - n/2) * 0.7 * Math.sqrt(3);
          const xOff = (j % 2) * 0.35;
          atoms.push({
            x: xBase + xOff, y: yOff, z: zBase,
            color: '#ef4444', r: 0.2, label: 'O'
          });
        }
      }
      // Connect nearest oxygens (hydrogen bond)
      for (let a = 0; a < atoms.length; a++) {
        for (let b = a + 1; b < atoms.length; b++) {
          const d = Math.hypot(atoms[a].x-atoms[b].x, atoms[a].y-atoms[b].y, atoms[a].z-atoms[b].z);
          if (d < 0.8 && d > 0.65) bonds.push({ a, b });
        }
      }
      return { atoms, bonds };
    }
  },
  {
    id: 'quartz', name: 'Quartz', formula: 'SiO₂',
    description: '3D silicate framework — each Si tetrahedrally bonded to 4 O.',
    latticeType: 'Framework Silicate',
    build: (size) => {
      const atoms: any[] = []; const bonds: any[] = [];
      const n = Math.max(2, Math.floor(size / 2));
      // Simplified: Si in BCC-like positions, O between
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) for (let k = 0; k < n; k++) {
        atoms.push({
          x: (i - n/2) * 1.0, y: (j - n/2) * 1.0, z: (k - n/2) * 1.0,
          color: '#eab308', r: 0.2, label: 'Si'
        });
        // 4 oxygens around each Si (tetrahedral)
        const offsets = [
          [0.3, 0.3, 0.3], [-0.3, -0.3, 0.3], [-0.3, 0.3, -0.3], [0.3, -0.3, -0.3]
        ];
        offsets.forEach(([ox, oy, oz]) => {
          atoms.push({
            x: (i - n/2) * 1.0 + ox,
            y: (j - n/2) * 1.0 + oy,
            z: (k - n/2) * 1.0 + oz,
            color: '#ef4444', r: 0.15, label: 'O'
          });
        });
      }
      for (let a = 0; a < atoms.length; a++) {
        for (let b = a + 1; b < atoms.length; b++) {
          const d = Math.hypot(atoms[a].x-atoms[b].x, atoms[a].y-atoms[b].y, atoms[a].z-atoms[b].z);
          if (d < 0.55 && d > 0.4 && atoms[a].label !== atoms[b].label) bonds.push({ a, b });
        }
      }
      return { atoms, bonds };
    }
  },
];

/* ============================================================
   MAIN COMPONENT
   ============================================================ */
export const ChemistryLabCanvas: React.FC<{
  onClose?: () => void;
  isInline?: boolean;
}> = ({ onClose, isInline = true }) => {
  const [activeTab, setActiveTab] = useState<ChemTab>('beaker');
  const [selectedPreset, setSelectedPreset] = useState<ReactionPreset>(REACTION_PRESETS[0]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeCategory, setActiveCategory] = useState<ChemistryCategory | 'all'>('all');

  // Molecules search
  const [selectedMolecule, setSelectedMolecule] = useState<MoleculeDetail | null>(MOLECULES_DIRECTORY[0] || null);
  const [moleculeSearchQuery, setMoleculeSearchQuery] = useState<string>('');
  const [moleculeRotate, setMoleculeRotate] = useState(true);

  const filteredMolecules = useMemo(() => {
    if (!moleculeSearchQuery) return MOLECULES_DIRECTORY;
    const q = moleculeSearchQuery.toLowerCase();
    return MOLECULES_DIRECTORY.filter(m =>
      m.name.toLowerCase().includes(q) || m.formula.toLowerCase().includes(q) ||
      m.keyProperties.toLowerCase().includes(q) || m.geometry.toLowerCase().includes(q)
    );
  }, [moleculeSearchQuery]);

  // Beaker states
  const [temperature, setTemperature] = useState<number>(25);
  const [indicatorType, setIndicatorType] = useState<'universal' | 'phenolphthalein' | 'real'>('universal');
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [particles, setParticles] = useState<any[]>([]);
  const [reactionLog, setReactionLog] = useState<string[]>(['Chemistry laboratory active. Select a preset or explore new labs.']);
  const [bondingStepIdx, setBondingStepIdx] = useState<number>(0);
  const [isAnimatingBond, setIsAnimatingBond] = useState<boolean>(false);
  const [expandedCategories, setExpandedCategories] = useState<{ [key: string]: boolean }>({
    physical: true, inorganic: true, organic: true
  });

  // Titration states
  const [titrationAcid, setTitrationAcid] = useState<'HCl' | 'H2SO4' | 'CH3COOH'>('HCl');
  const [titrationBase, setTitrationBase] = useState<'NaOH' | 'KOH' | 'NH3'>('NaOH');
  const [titrationAcidConc, setTitrationAcidConc] = useState(0.1);
  const [titrationBaseConc, setTitrationBaseConc] = useState(0.1);
  const [titrationVolume, setTitrationVolume] = useState(25);
  const [titrationAdded, setTitrationAdded] = useState(0);
  const [titrationRunning, setTitrationRunning] = useState(false);
  const [titrationIndicator, setTitrationIndicator] = useState<'phenolphthalein' | 'methyl-orange' | 'bromothymol'>('phenolphthalein');
  const [titrationHistory, setTitrationHistory] = useState<{v: number; pH: number}[]>([]);

  // Crystal states
  const [selectedCrystal, setSelectedCrystal] = useState<CrystalPreset>(CRYSTAL_PRESETS[0]);
  const [crystalSize, setCrystalSize] = useState(4);
  const [crystalRotX, setCrystalRotX] = useState(-0.4);
  const [crystalRotY, setCrystalRotY] = useState(0.6);
  const [crystalAutoRotate, setCrystalAutoRotate] = useState(true);
  const [crystalZoom, setCrystalZoom] = useState(80);
  const crystalDragRef = useRef<{x: number; y: number; rx: number; ry: number} | null>(null);

  // Gas laws states
  const [gasParticlesCount, setGasParticlesCount] = useState(60);
  const [gasTemperature, setGasTemperature] = useState(300);
  const [gasVolume, setGasVolume] = useState(1.0);
  const [gasParticles, setGasParticles] = useState<any[]>([]);
  const gasCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Electrochemistry states
  const [cellAnode, setCellAnode] = useState<'Zn' | 'Mg' | 'Fe'>('Zn');
  const [cellCathode, setCellCathode] = useState<'Cu' | 'Ag' | 'Pb'>('Cu');
  const [cellRunning, setCellRunning] = useState(true);
  const [cellTime, setCellTime] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Filter reactions by category
  const filteredReactions = useMemo(() => {
    if (activeCategory === 'all') return REACTION_PRESETS;
    return REACTION_PRESETS.filter(r => r.category === activeCategory);
  }, [activeCategory]);

  const toggleCategory = (cat: 'physical' | 'inorganic' | 'organic') => {
    setExpandedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  const handleSelectPreset = (preset: ReactionPreset) => {
    setSelectedPreset(preset);
    setBondingStepIdx(0);
    setTemperature(preset.energyExothermic ? 45 : 25);
    setReactionLog(logs => [`Loaded: ${preset.name}`, `Equation: ${preset.equation}`, ...logs.slice(0, 6)]);
  };

  const handleReset = () => {
    setTemperature(selectedPreset.energyExothermic ? 45 : 25);
    setReactionLog(logs => ['Vessel reset.', ...logs.slice(0, 7)]);
  };

  const liquidColor = useMemo(() => {
    const ph = selectedPreset.pH;
    if (indicatorType === 'universal') {
      if (ph <= 3) return '#dc2626';
      if (ph <= 4.5) return '#f97316';
      if (ph <= 6.2) return '#eab308';
      if (ph <= 7.5) return '#22c55e';
      if (ph <= 9.2) return '#06b6d4';
      if (ph <= 11) return '#2563eb';
      return '#7c3aed';
    } else if (indicatorType === 'phenolphthalein') {
      return ph >= 8.2 ? '#ec4899' : '#ffffff10';
    } else {
      return selectedPreset.baseColor;
    }
  }, [selectedPreset, indicatorType]);

  // Initialize particles
  useEffect(() => {
    const list: any[] = [];
    let idCounter = 0;
    selectedPreset.reactantsList.forEach(item => {
      const el = ELEMENTS.find(e => e.symbol === item.symbol);
      if (!el) return;
      for (let i = 0; i < item.count * 2; i++) {
        list.push({
          id: idCounter++,
          x: Math.random() * 160 + 120,
          y: Math.random() * 100 + 140,
          vx: (Math.random() - 0.5) * (temperature / 10 + 2),
          vy: (Math.random() - 0.5) * (temperature / 10 + 2),
          color: el.color, size: 13 + el.atomicNumber * 0.3, label: el.symbol
        });
      }
    });
    setParticles(list);
  }, [selectedPreset, temperature]);

  // Particle physics
  useEffect(() => {
    let animId: number;
    const update = () => {
      setParticles(prev => prev.map(p => {
        let nx = p.x + p.vx, ny = p.y + p.vy;
        let nvx = p.vx, nvy = p.vy;
        if (nx < 110 || nx > 290) { nvx = -p.vx; nx = Math.max(110, Math.min(290, nx)); }
        if (ny < 140 || ny > 255) { nvy = -p.vy; ny = Math.max(140, Math.min(255, ny)); }
        return { ...p, x: nx, y: ny, vx: nvx, vy: nvy };
      }));
      animId = requestAnimationFrame(update);
    };
    animId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Bonding animation
  useEffect(() => {
    if (!isAnimatingBond) return;
    const interval = setInterval(() => {
      setBondingStepIdx(prev => {
        const next = prev + 1;
        return next >= selectedPreset.bondingMechanism.steps.length ? 0 : next;
      });
    }, 4500);
    return () => clearInterval(interval);
  }, [isAnimatingBond, selectedPreset]);

  // Titration auto-run
  useEffect(() => {
    if (!titrationRunning) return;
    const interval = setInterval(() => {
      setTitrationAdded(prev => {
        const next = prev + 0.1;
        if (next > 60) { setTitrationRunning(false); return prev; }
        return next;
      });
    }, 80);
    return () => clearInterval(interval);
  }, [titrationRunning]);

  // Compute titration pH
  const titrationPH = useMemo(() => {
    const Va = titrationVolume;
    const Ca = titrationAcidConc;
    const Cb = titrationBaseConc;
    const Vb = titrationAdded;
    const eqV = (Ca * Va) / Cb;
    const isStrong = titrationAcid === 'HCl' || titrationAcid === 'H2SO4';
    const isWeak = titrationAcid === 'CH3COOH';
    const isWeakBase = titrationBase === 'NH3';

    if (Vb < 0.01) {
      if (isStrong) return -Math.log10(Ca * (titrationAcid === 'H2SO4' ? 2 : 1));
      if (isWeak) {
        const Ka = 1.8e-5;
        return -Math.log10(Math.sqrt(Ka * Ca));
      }
    }
    if (Math.abs(Vb - eqV) < 0.1) return 7.0;
    if (Vb < eqV) {
      const remaining = Ca * Va - Cb * Vb;
      const totalV = Va + Vb;
      if (isStrong) return -Math.log10(Math.max(1e-10, remaining / totalV));
      if (isWeak) {
        const Ka = 1.8e-5;
        const buffer = remaining / (Cb * Vb);
        return 4.74 + Math.log10(Math.max(0.01, 1 / buffer));
      }
    } else {
      const excess = Cb * Vb - Ca * Va;
      const totalV = Va + Vb;
      const oh = excess / totalV;
      return 14 + Math.log10(Math.max(1e-10, oh));
    }
    return 7.0;
  }, [titrationAcid, titrationBase, titrationAcidConc, titrationBaseConc, titrationVolume, titrationAdded]);

  // Track titration history
  useEffect(() => {
    setTitrationHistory(prev => {
      const next = [...prev, { v: titrationAdded, pH: titrationPH }];
      return next.slice(-200);
    });
  }, [titrationAdded, titrationPH]);

  // Gas particles init
  useEffect(() => {
    if (activeTab !== 'gaslaws') return;
    const list: any[] = [];
    for (let i = 0; i < gasParticlesCount; i++) {
      const speed = Math.sqrt(gasTemperature / 100) * (0.5 + Math.random() * 1.5);
      const ang = Math.random() * Math.PI * 2;
      list.push({
        x: 50 + Math.random() * 240,
        y: 50 + Math.random() * 200,
        vx: Math.cos(ang) * speed * 3,
        vy: Math.sin(ang) * speed * 3,
        r: 3 + Math.random() * 2,
        hue: 200 + Math.random() * 40
      });
    }
    setGasParticles(list);
  }, [activeTab, gasParticlesCount]);

  // Gas particle physics
  useEffect(() => {
    if (activeTab !== 'gaslaws') return;
    let animId: number;
    const tick = () => {
      setGasParticles(prev => {
        const containerW = 290 * gasVolume;
        const containerH = 240 * gasVolume;
        const x0 = (340 - containerW) / 2;
        const y0 = (300 - containerH) / 2;
        let hits = 0;
        const next = prev.map(p => {
          let nx = p.x + p.vx * 0.016;
          let ny = p.y + p.vy * 0.016;
          let nvx = p.vx, nvy = p.vy;
          if (nx < x0 || nx > x0 + containerW) { nvx = -p.vx; hits++; nx = Math.max(x0, Math.min(x0 + containerW, nx)); }
          if (ny < y0 || ny > y0 + containerH) { nvy = -p.vy; hits++; ny = Math.max(y0, Math.min(y0 + containerH, ny)); }
          return { ...p, x: nx, y: ny, vx: nvx, vy: nvy };
        });
        return next;
      });
      animId = requestAnimationFrame(tick);
    };
    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [activeTab, gasVolume, gasTemperature]);

  // Electrochemistry time
  useEffect(() => {
    if (activeTab !== 'electrochem' || !cellRunning) return;
    let animId: number;
    const tick = () => {
      setCellTime(t => t + 0.016);
      animId = requestAnimationFrame(tick);
    };
    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [activeTab, cellRunning]);

  // Crystal auto-rotate
  useEffect(() => {
    if (activeTab !== 'crystal' || !crystalAutoRotate) return;
    let animId: number;
    const tick = () => {
      setCrystalRotY(r => r + 0.008);
      animId = requestAnimationFrame(tick);
    };
    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [activeTab, crystalAutoRotate]);

  /* ============================================================
     CANVAS RENDER
     ============================================================ */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.scale(zoomLevel, zoomLevel);
    ctx.translate(-canvas.width / 2, -canvas.height / 2);

    const isDark = document.documentElement.classList.contains('dark');

    /* ============ BEAKER TAB ============ */
    if (activeTab === 'beaker') {
      if (temperature > 40) {
        ctx.save();
        const baseHeight = 310;
        const flameGradient = ctx.createLinearGradient(200, baseHeight, 200, 270);
        flameGradient.addColorStop(0, '#f97316fc');
        flameGradient.addColorStop(0.4, '#ef4444dd');
        flameGradient.addColorStop(0.8, '#3b82f677');
        flameGradient.addColorStop(1, '#60a5fa00');
        ctx.fillStyle = flameGradient;
        ctx.beginPath();
        ctx.moveTo(170, baseHeight);
        ctx.quadraticCurveTo(200, 255 + (Math.sin(Date.now() * 0.04) * 6), 230, baseHeight);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = isDark ? '#475569' : '#64748b';
        ctx.fillRect(185, 305, 30, 25);
        ctx.restore();
      }

      ctx.fillStyle = liquidColor.endsWith('05') || liquidColor.endsWith('15') || liquidColor === '#e2e8f002'
        ? liquidColor : `${liquidColor}35`;
      ctx.beginPath();
      ctx.moveTo(100, 130); ctx.lineTo(300, 130);
      ctx.lineTo(300, 260); ctx.lineTo(100, 260);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = liquidColor.endsWith('05') || liquidColor.endsWith('15') || liquidColor === '#e2e8f002'
        ? liquidColor : `${liquidColor}60`;
      ctx.beginPath();
      ctx.ellipse(200, 130, 100, 7, 0, 0, Math.PI * 2);
      ctx.fill();

      if (selectedPreset.hasPrecipitate) {
        ctx.fillStyle = selectedPreset.precipitateColor || '#fbbf24';
        const points = [
          {x: 120, y: 256}, {x: 150, y: 259}, {x: 180, y: 260}, {x: 210, y: 258},
          {x: 240, y: 260}, {x: 270, y: 257}, {x: 290, y: 255}, {x: 135, y: 258}
        ];
        points.forEach((pt, i) => {
          const bounce = Math.sin(Date.now() * 0.001 + i) * 6;
          const driftY = Math.min(pt.y, 140 + ((Date.now() * 0.015 + i * 20) % 115));
          ctx.beginPath();
          ctx.arc(pt.x + bounce * 0.4, driftY, 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 4.5, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      if (selectedPreset.hasFumes) {
        ctx.fillStyle = isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(226, 232, 240, 0.55)';
        for (let i = 0; i < 6; i++) {
          const shiftX = Math.sin(Date.now() * 0.002 + i) * 20;
          const shiftY = (Date.now() * 0.04 + i * 30) % 80;
          ctx.beginPath();
          ctx.arc(140 + i * 25 + shiftX, 120 - shiftY, 15 + i * 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.strokeStyle = isDark ? '#64748bbb' : '#94a3b8';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(95, 80); ctx.lineTo(100, 90);
      ctx.lineTo(100, 260);
      ctx.bezierCurveTo(100, 275, 300, 275, 300, 260);
      ctx.lineTo(300, 90); ctx.lineTo(305, 80);
      ctx.stroke();

      ctx.strokeStyle = isDark ? '#ffffff22' : '#00000015';
      ctx.lineWidth = 1.5;
      ctx.font = '8px monospace';
      ctx.fillStyle = isDark ? '#ffffff44' : '#00000035';
      ctx.textAlign = 'left';
      for (let h = 110; h <= 230; h += 30) {
        ctx.beginPath();
        ctx.moveTo(100, h); ctx.lineTo(115, h);
        ctx.stroke();
        ctx.fillText(`${(260 - h) * 1.5}ml`, 120, h);
      }

      if (temperature > 30) {
        ctx.fillStyle = isDark ? '#ffffff77' : '#ffffffbb';
        for (let i = 0; i < Math.floor(temperature / 8); i++) {
          const bx = 110 + ((Math.sin(i * 9 + Date.now() * 0.0007) * 0.5 + 0.5) * 170);
          const by = 250 - ((Date.now() * 0.1 * (temperature / 10) + i * 25) % 110);
          ctx.beginPath();
          ctx.arc(bx, by, 1.5 + (i % 2.5), 0, Math.PI * 2);
          ctx.fill();
        }
      }

      particles.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 3; ctx.shadowColor = p.color;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#ffffffaa';
        ctx.lineWidth = 1; ctx.stroke();
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(p.label, p.x, p.y + 0.5);
      });
    }

    /* ============ ORBITAL TAB ============ */
    else if (activeTab === 'orbital') {
      ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)';
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += 30) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += 30) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
      }

      const step = selectedPreset.bondingMechanism.steps[bondingStepIdx];
      if (!step) { ctx.restore(); return; }

      if (selectedPreset.id === 'benzene') {
        const cx = 200, cy = 160, r = 70;
        const pts: {x: number; y: number}[] = [];
        for (let i = 0; i < 6; i++) {
          const theta = (i * Math.PI / 3) - Math.PI / 2;
          pts.push({ x: cx + r * Math.cos(theta), y: cy + r * Math.sin(theta) });
        }
        ctx.strokeStyle = isDark ? '#38bdf8' : '#0284c7';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < 6; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.closePath();
        ctx.stroke();

        const shiftActive = bondingStepIdx === 0 || (bondingStepIdx === 1 && Math.sin(Date.now() * 0.003) > 0);
        ctx.strokeStyle = '#ec4899';
        ctx.lineWidth = 2;
        if (bondingStepIdx < 2) {
          for (let i = 0; i < 6; i++) {
            const isDouble = shiftActive ? (i % 2 === 0) : (i % 2 !== 0);
            if (isDouble) {
              const start = pts[i], end = pts[(i + 1) % 6];
              const shrink = 0.85;
              ctx.beginPath();
              ctx.moveTo(cx + (start.x - cx) * shrink, cy + (start.y - cy) * shrink);
              ctx.lineTo(cx + (end.x - cx) * shrink, cy + (end.y - cy) * shrink);
              ctx.stroke();
            }
          }
        } else {
          ctx.beginPath();
          ctx.arc(cx, cy, r * 0.75, 0, Math.PI * 2);
          ctx.setLineDash([5, 5]);
          ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 3;
          ctx.stroke();
          ctx.setLineDash([]);
        }

        pts.forEach((pt, i) => {
          const factor = 1.35;
          const hx = cx + (pt.x - cx) * factor;
          const hy = cy + (pt.y - cy) * factor;
          ctx.strokeStyle = isDark ? '#ffffff20' : '#00000015';
          ctx.lineWidth = 2.0;
          ctx.beginPath(); ctx.moveTo(pt.x, pt.y); ctx.lineTo(hx, hy); ctx.stroke();
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 14, 0, Math.PI * 2);
          ctx.fillStyle = isDark ? '#1e293b' : '#f1f5f9';
          ctx.strokeStyle = '#64748b'; ctx.lineWidth = 1.5;
          ctx.fill(); ctx.stroke();
          ctx.fillStyle = isDark ? '#e2e8f0' : '#1e293b';
          ctx.font = 'bold 9px sans-serif';
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(`C${i+1}`, pt.x, pt.y);
          ctx.beginPath();
          ctx.arc(hx, hy, 8, 0, Math.PI * 2);
          ctx.fillStyle = '#38bdf8';
          ctx.strokeStyle = '#0284c7'; ctx.lineWidth = 1;
          ctx.fill(); ctx.stroke();
          ctx.fillStyle = '#0f172a';
          ctx.font = 'bold 8px sans-serif';
          ctx.fillText('H', hx, hy + 0.3);
        });
      } else {
        const activePositions = step.productPositions.length > 0 ? step.productPositions : step.reactantPositions;
        activePositions.forEach(node => {
          ctx.beginPath();
          ctx.arc(node.x, node.y, 16, 0, Math.PI * 2);
          ctx.fillStyle = node.fill || '#10b981';
          ctx.strokeStyle = isDark ? '#ffffff22' : '#00000010';
          ctx.lineWidth = 1.5;
          ctx.fill(); ctx.stroke();
          ctx.fillStyle = '#1e293b';
          ctx.font = 'bold 9.5px monospace';
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(node.label, node.x, node.y + 0.3);
          if ('valences' in node && node.valences > 0) {
            ctx.fillStyle = '#fbbf24';
            const rShell = 24;
            for (let i = 0; i < node.valences; i++) {
              const rot = (i * Math.PI * 2 / node.valences) + Date.now() * 0.001;
              ctx.beginPath();
              ctx.arc(node.x + rShell * Math.cos(rot), node.y + rShell * Math.sin(rot), 2.5, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        });
      }
    }

    /* ============ MOLECULES TAB (3D ROTATING) ============ */
    else if (activeTab === 'molecules') {
      if (selectedMolecule) {
        ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)';
        ctx.lineWidth = 1;
        for (let x = 0; x < canvas.width; x += 30) {
          ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
        }
        for (let y = 0; y < canvas.height; y += 30) {
          ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
        }

        const data = selectedMolecule.spawnData;
        if (data && data.atoms && data.atoms.length > 0) {
          let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
          data.atoms.forEach(a => {
            if (a.x < minX) minX = a.x; if (a.x > maxX) maxX = a.x;
            if (a.y < minY) minY = a.y; if (a.y > maxY) maxY = a.y;
          });
          const cx = (minX + maxX) / 2;
          const cy = (minY + maxY) / 2;
          const targetX = 200, targetY = 170;

          const glowRad = Math.max(50, Math.min(130, (maxX - minX + maxY - minY) * 0.7));
          const radGlow = ctx.createRadialGradient(targetX, targetY, glowRad * 0.2, targetX, targetY, glowRad);
          radGlow.addColorStop(0, isDark ? 'rgba(99, 102, 241, 0.08)' : 'rgba(99, 102, 241, 0.05)');
          radGlow.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = radGlow;
          ctx.beginPath();
          ctx.arc(targetX, targetY, glowRad, 0, Math.PI * 2);
          ctx.fill();

          ctx.save();
          ctx.translate(targetX, targetY);
          const rotationAngle = moleculeRotate ? Date.now() * 0.0006 : 0;
          // Simulated 3D rotation: apply Y-rotation by scaling x by cos(θ)
          const rotY = moleculeRotate ? Date.now() * 0.001 : 0;
          const cosR = Math.cos(rotY);
          const depthShading = true;

          if (data.bonds && data.bonds.length > 0) {
            data.bonds.forEach(b => {
              const atomA = data.atoms[b.fromIdx];
              const atomB = data.atoms[b.toIdx];
              if (!atomA || !atomB) return;
              const x1 = (atomA.x - cx) * cosR;
              const y1 = atomA.y - cy;
              const x2 = (atomB.x - cx) * cosR;
              const y2 = atomB.y - cy;

              ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.25)' : 'rgba(15, 23, 42, 0.2)';
              ctx.lineWidth = 4; ctx.lineCap = 'round';
              if (b.type === 2) {
                const dx = x2 - x1, dy = y2 - y1;
                const len = Math.sqrt(dx * dx + dy * dy);
                const nx = -dy / len * 4, ny = dx / len * 4;
                ctx.beginPath(); ctx.moveTo(x1 + nx, y1 + ny); ctx.lineTo(x2 + nx, y2 + ny); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(x1 - nx, y1 - ny); ctx.lineTo(x2 - nx, y2 - ny); ctx.stroke();
              } else if (b.type === 3) {
                const dx = x2 - x1, dy = y2 - y1;
                const len = Math.sqrt(dx * dx + dy * dy);
                const nx = -dy / len * 6, ny = dx / len * 6;
                ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(x1 + nx, y1 + ny); ctx.lineTo(x2 + nx, y2 + ny); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(x1 - nx, y1 - ny); ctx.lineTo(x2 - nx, y2 - ny); ctx.stroke();
              } else {
                ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
              }
            });
          }

          // Sort atoms by depth for proper 3D rendering
          const atomsWithDepth = data.atoms.map((atom, i) => ({
            ...atom, idx: i,
            depth: (atom.x - cx) * Math.sin(rotY)
          })).sort((a, b) => a.depth - b.depth);

          atomsWithDepth.forEach(atom => {
            const ax = (atom.x - cx) * cosR;
            const ay = atom.y - cy;
            const depth = atom.depth;
            const depthScale = 1 + depth * 0.005;
            const depthAlpha = 0.6 + Math.min(0.4, Math.max(0, (depth + 50) / 100));

            let atomColor = '#94a3b8';
            if (atom.symbol === 'H') atomColor = '#38bdf8';
            else if (atom.symbol === 'O') atomColor = '#ef4444';
            else if (atom.symbol === 'C') atomColor = '#64748b';
            else if (atom.symbol === 'N') atomColor = '#818cf8';
            else if (atom.symbol === 'Cl') atomColor = '#4ade80';
            else if (atom.symbol === 'Na') atomColor = '#fbbf24';
            else if (atom.symbol === 'S') atomColor = '#eab308';
            else if (atom.symbol === 'F') atomColor = '#22c55e';
            else if (atom.symbol === 'P') atomColor = '#ec4899';

            ctx.globalAlpha = depthAlpha;
            ctx.beginPath();
            ctx.arc(ax, ay, 15 * depthScale, 0, Math.PI * 2);
            ctx.fillStyle = atomColor;
            ctx.shadowBlur = 4; ctx.shadowColor = atomColor;
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.strokeStyle = '#ffffffaa'; ctx.lineWidth = 1.5;
            ctx.stroke();
            ctx.fillStyle = '#0f172a';
            ctx.font = `bold ${9.5 * depthScale}px sans-serif`;
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(atom.symbol, ax, ay + 0.5);
            ctx.globalAlpha = 1;
          });
          ctx.restore();
        }
      }
    }

    /* ============ TITRATION TAB ============ */
    else if (activeTab === 'titration') {
      // Background
      ctx.fillStyle = isDark ? '#0c0a09' : '#fefce8';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Burette on left
      ctx.fillStyle = isDark ? '#1e293b' : '#f1f5f9';
      ctx.fillRect(40, 20, 20, 200);
      ctx.strokeStyle = isDark ? '#64748b' : '#94a3b8';
      ctx.lineWidth = 2;
      ctx.strokeRect(40, 20, 20, 200);
      // Titrant inside burette (decreases as added)
      const buretteFill = Math.max(0, 50 - titrationAdded);
      ctx.fillStyle = '#a855f7aa';
      ctx.fillRect(42, 22 + (200 - buretteFill * 4), 16, buretteFill * 4);
      // Scale markings
      ctx.fillStyle = isDark ? '#cbd5e1' : '#475569';
      ctx.font = '7px monospace';
      ctx.textAlign = 'left';
      for (let i = 0; i <= 50; i += 10) {
        const y = 22 + i * 4;
        ctx.beginPath(); ctx.moveTo(40, y); ctx.lineTo(45, y); ctx.stroke();
        ctx.fillText(`${50 - i}`, 62, y + 2);
      }
      // Stopcock
      ctx.fillStyle = '#64748b';
      ctx.fillRect(45, 220, 10, 8);
      // Dripping
      if (titrationRunning) {
        const dropY = 230 + ((Date.now() * 0.2) % 40);
        ctx.fillStyle = '#a855f7';
        ctx.beginPath();
        ctx.ellipse(50, dropY, 2, 3, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = isDark ? '#fff' : '#000';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${titrationBase}`, 50, 15);

      // Flask (Erlenmeyer) below
      ctx.strokeStyle = isDark ? '#64748bbb' : '#94a3b8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(90, 240);
      ctx.lineTo(110, 260);
      ctx.lineTo(110, 290);
      ctx.bezierCurveTo(110, 310, 220, 310, 220, 290);
      ctx.lineTo(220, 260);
      ctx.lineTo(240, 240);
      ctx.stroke();

      // Solution in flask (color based on pH and indicator)
      const getIndicatorColor = (pH: number, ind: string) => {
        if (ind === 'phenolphthalein') {
          if (pH < 8.2) return 'rgba(255,255,255,0.1)';
          if (pH < 10) return `rgba(236,72,153,${Math.min(1, (pH - 8.2) / 1.8)})`;
          return '#ec4899';
        }
        if (ind === 'methyl-orange') {
          if (pH < 3.1) return '#ef4444';
          if (pH < 4.4) return '#f97316';
          return '#eab308';
        }
        if (ind === 'bromothymol') {
          if (pH < 6.0) return '#eab308';
          if (pH < 7.6) return '#22c55e';
          return '#3b82f6';
        }
        return '#94a3b8';
      };
      const flaskColor = getIndicatorColor(titrationPH, titrationIndicator);
      ctx.fillStyle = flaskColor;
      ctx.beginPath();
      ctx.moveTo(112, 265);
      ctx.lineTo(112, 290);
      ctx.bezierCurveTo(112, 308, 218, 308, 218, 290);
      ctx.lineTo(218, 265);
      ctx.closePath();
      ctx.fill();

      // Swirling animation
      if (titrationRunning) {
        const swirlT = Date.now() * 0.005;
        for (let i = 0; i < 5; i++) {
          const ang = swirlT + i * 1.2;
          const rx = 165 + Math.cos(ang) * 30;
          const ry = 285 + Math.sin(ang) * 5;
          ctx.strokeStyle = 'rgba(255,255,255,0.3)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(rx, ry, 3, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      ctx.fillStyle = isDark ? '#fff' : '#000';
      ctx.font = 'bold 9px sans-serif';
      ctx.fillText('Analyte Flask', 165, 325);

      // pH curve graph on right
      const gX = 260, gY = 30, gW = 75, gH = 260;
      ctx.fillStyle = isDark ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.8)';
      ctx.fillRect(gX, gY, gW, gH);
      ctx.strokeStyle = isDark ? '#64748b' : '#94a3b8';
      ctx.lineWidth = 1;
      ctx.strokeRect(gX, gY, gW, gH);

      // pH scale markings
      ctx.fillStyle = isDark ? '#cbd5e1' : '#475569';
      ctx.font = '7px monospace';
      ctx.textAlign = 'right';
      for (let p = 0; p <= 14; p += 2) {
        const y = gY + gH - (p / 14) * gH;
        ctx.beginPath(); ctx.moveTo(gX, y); ctx.lineTo(gX + 3, y); ctx.stroke();
        ctx.fillText(`${p}`, gX - 3, y + 2);
      }

      // Equivalence line
      const eqV = (titrationAcidConc * titrationVolume) / titrationBaseConc;
      ctx.strokeStyle = '#ef444488';
      ctx.setLineDash([3, 3]);
      const eqX = gX + (eqV / 60) * gW;
      ctx.beginPath(); ctx.moveTo(eqX, gY); ctx.lineTo(eqX, gY + gH); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#ef4444';
      ctx.textAlign = 'center';
      ctx.fillText('eq', eqX, gY - 3);

      // Plot curve
      if (titrationHistory.length > 1) {
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        ctx.beginPath();
        titrationHistory.forEach((h, i) => {
          const x = gX + (h.v / 60) * gW;
          const y = gY + gH - (h.pH / 14) * gH;
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        });
        ctx.stroke();

        // Current point
        const last = titrationHistory[titrationHistory.length - 1];
        const cx = gX + (last.v / 60) * gW;
        const cy = gY + gH - (last.pH / 14) * gH;
        ctx.fillStyle = '#ef4444';
        ctx.shadowBlur = 8; ctx.shadowColor = '#ef4444';
        ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
      }

      ctx.fillStyle = isDark ? '#fff' : '#000';
      ctx.font = 'bold 8px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('pH Curve', gX + gW / 2, gY - 10);
      ctx.fillText(`V (${titrationBase})`, gX + gW / 2, gY + gH + 12);

      // Digital pH meter display
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(10, 340, 100, 35);
      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 20px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`pH ${titrationPH.toFixed(2)}`, 15, 365);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '7px monospace';
      ctx.fillText('DIGITAL METER', 15, 350);
    }

    /* ============ CRYSTAL LATTICE TAB ============ */
    else if (activeTab === 'crystal') {
      ctx.fillStyle = isDark ? '#0a0a0f' : '#f8fafc';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const data = selectedCrystal.build(crystalSize);
      const project = (x: number, y: number, z: number) => {
        const cyR = Math.cos(crystalRotY), syR = Math.sin(crystalRotY);
        const x1 = x * cyR + z * syR;
        const z1 = -x * syR + z * cyR;
        const cxR = Math.cos(crystalRotX), sxR = Math.sin(crystalRotX);
        const y1 = y * cxR - z1 * sxR;
        const z2 = y * sxR + z1 * cxR;
        const focal = 5;
        const scale = crystalZoom;
        const p = focal / (focal + z2);
        return {
          x: 200 + x1 * p * scale,
          y: 190 - y1 * p * scale,
          z: z2, p
        };
      };

      // Project bonds first (behind atoms)
      data.bonds.forEach(b => {
        const a1 = data.atoms[b.a], a2 = data.atoms[b.b];
        const p1 = project(a1.x, a1.y, a1.z);
        const p2 = project(a2.x, a2.y, a2.z);
        const alpha = Math.max(0.2, Math.min(0.8, 1 - (p1.z + p2.z) / 6));
        ctx.strokeStyle = `rgba(148, 163, 184, ${alpha})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      });

      // Sort atoms by depth
      const projectedAtoms = data.atoms.map((a, i) => ({
        ...a, idx: i,
        proj: project(a.x, a.y, a.z)
      })).sort((a, b) => b.proj.z - a.proj.z);

      projectedAtoms.forEach(a => {
        const { x, y, p, z } = a.proj;
        const depthScale = 0.5 + p * 0.8;
        const alpha = Math.max(0.3, Math.min(1, 1 - z / 4));
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(x, y, a.r * 40 * depthScale, 0, Math.PI * 2);
        const grad = ctx.createRadialGradient(x - a.r * 10, y - a.r * 10, 1, x, y, a.r * 40 * depthScale);
        grad.addColorStop(0, a.color);
        grad.addColorStop(1, isDark ? '#000' : '#334155');
        ctx.fillStyle = grad;
        ctx.shadowBlur = 6; ctx.shadowColor = a.color;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();
        if (a.label && depthScale > 0.8) {
          ctx.fillStyle = '#fff';
          ctx.font = `bold ${8 * depthScale}px sans-serif`;
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(a.label, x, y);
        }
        ctx.globalAlpha = 1;
      });

      // Info HUD
      ctx.fillStyle = isDark ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.8)';
      ctx.fillRect(10, 10, 150, 50);
      ctx.strokeStyle = isDark ? '#475569' : '#cbd5e1';
      ctx.strokeRect(10, 10, 150, 50);
      ctx.fillStyle = '#3b82f6';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(selectedCrystal.name, 18, 25);
      ctx.fillStyle = isDark ? '#cbd5e1' : '#475569';
      ctx.font = '9px monospace';
      ctx.fillText(`Formula: ${selectedCrystal.formula}`, 18, 38);
      ctx.fillText(`Type: ${selectedCrystal.latticeType}`, 18, 50);

      // Controls hint
      ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
      ctx.font = '9px monospace';
      ctx.textAlign = 'left';
      ctx.fillText('Drag to rotate · Scroll to zoom', 10, canvas.height - 10);
    }

    /* ============ GAS LAWS TAB ============ */
    else if (activeTab === 'gaslaws') {
      const isDark = document.documentElement.classList.contains('dark');
      ctx.fillStyle = isDark ? '#0c0a09' : '#fafaf9';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const containerW = 290 * gasVolume;
      const containerH = 240 * gasVolume;
      const x0 = (340 - containerW) / 2;
      const y0 = (300 - containerH) / 2;

      // Container (piston)
      ctx.fillStyle = isDark ? 'rgba(30, 41, 59, 0.5)' : 'rgba(241, 245, 249, 0.8)';
      ctx.fillRect(x0, y0, containerW, containerH);
      ctx.strokeStyle = isDark ? '#64748b' : '#475569';
      ctx.lineWidth = 3;
      ctx.strokeRect(x0, y0, containerW, containerH);

      // Piston at top
      ctx.fillStyle = '#64748b';
      ctx.fillRect(x0 - 5, y0 - 10, containerW + 10, 10);
      // Piston handle
      ctx.fillRect(x0 + containerW / 2 - 15, y0 - 25, 30, 15);

      // Particles
      gasParticles.forEach(p => {
        const speed = Math.hypot(p.vx, p.vy);
        const hue = 240 - Math.min(180, speed * 8);
        ctx.fillStyle = `hsl(${hue}, 80%, 55%)`;
        ctx.shadowBlur = 4; ctx.shadowColor = `hsl(${hue}, 80%, 55%)`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // Compute pressure (PV = nRT)
      const n = gasParticlesCount / 6.022e23 * 1000; // scaled moles
      const R = 8.314;
      const V = containerW * containerH / 10000;
      const P = (n * R * gasTemperature) / Math.max(0.01, V);
      const Pdisplay = P.toFixed(1);

      // Pressure gauge (right side)
      const gaugeX = 290, gaugeY = 20, gaugeR = 40;
      ctx.fillStyle = isDark ? '#1e293b' : '#f1f5f9';
      ctx.beginPath();
      ctx.arc(gaugeX, gaugeY + gaugeR, gaugeR, Math.PI, 0);
      ctx.lineTo(gaugeX + gaugeR, gaugeY + gaugeR);
      ctx.lineTo(gaugeX - gaugeR, gaugeY + gaugeR);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = isDark ? '#64748b' : '#475569';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Gauge color gradient
      const gaugeGrad = ctx.createLinearGradient(gaugeX - gaugeR, 0, gaugeX + gaugeR, 0);
      gaugeGrad.addColorStop(0, '#22c55e');
      gaugeGrad.addColorStop(0.5, '#eab308');
      gaugeGrad.addColorStop(1, '#ef4444');
      ctx.strokeStyle = gaugeGrad;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(gaugeX, gaugeY + gaugeR, gaugeR - 5, Math.PI, 0);
      ctx.stroke();

      // Needle
      const needleAng = Math.PI + Math.min(Math.PI, Math.max(0, P / 30)) * Math.PI;
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(gaugeX, gaugeY + gaugeR);
      ctx.lineTo(gaugeX + Math.cos(needleAng) * (gaugeR - 8), gaugeY + gaugeR + Math.sin(needleAng) * (gaugeR - 8));
      ctx.stroke();
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(gaugeX, gaugeY + gaugeR, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = isDark ? '#fff' : '#000';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('PRESSURE', gaugeX, gaugeY + gaugeR + 15);
      ctx.fillStyle = '#3b82f6';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(`${Pdisplay} kPa`, gaugeX, gaugeY + gaugeR + 28);

      // Info HUD bottom
      ctx.fillStyle = isDark ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.8)';
      ctx.fillRect(10, 310, 320, 50);
      ctx.strokeStyle = isDark ? '#475569' : '#cbd5e1';
      ctx.strokeRect(10, 310, 320, 50);
      ctx.fillStyle = isDark ? '#fff' : '#000';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'left';
      ctx.fillText('PV = nRT', 18, 325);
      ctx.font = '9px monospace';
      ctx.fillText(`n = ${(gasParticlesCount / 10).toFixed(1)} mol`, 18, 340);
      ctx.fillText(`T = ${gasTemperature} K`, 110, 340);
      ctx.fillText(`V = ${V.toFixed(2)} L`, 200, 340);
      ctx.fillText(`P = ${Pdisplay} kPa`, 18, 353);
      ctx.fillText(`KE ∝ T (color = speed)`, 110, 353);
    }

    /* ============ ELECTROCHEMISTRY TAB ============ */
    else if (activeTab === 'electrochem') {
      ctx.fillStyle = isDark ? '#0a0a0f' : '#fefce8';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Standard reduction potentials
      const potentials: Record<string, number> = {
        Zn: -0.76, Mg: -2.37, Fe: -0.44,
        Cu: 0.34, Ag: 0.80, Pb: -0.13
      };
      const Ecell = potentials[cellCathode] - potentials[cellAnode];

      // Two beakers
      const leftBeaker = { x: 50, y: 150, w: 100, h: 150 };
      const rightBeaker = { x: 190, y: 150, w: 100, h: 150 };

      // Solutions
      ctx.fillStyle = isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.3)';
      ctx.fillRect(leftBeaker.x, leftBeaker.y + 30, leftBeaker.w, leftBeaker.h - 30);
      ctx.fillStyle = isDark ? 'rgba(249, 115, 22, 0.2)' : 'rgba(249, 115, 22, 0.3)';
      ctx.fillRect(rightBeaker.x, rightBeaker.y + 30, rightBeaker.w, rightBeaker.h - 30);

      // Beaker outlines
      ctx.strokeStyle = isDark ? '#64748b' : '#94a3b8';
      ctx.lineWidth = 2;
      ctx.strokeRect(leftBeaker.x, leftBeaker.y, leftBeaker.w, leftBeaker.h);
      ctx.strokeRect(rightBeaker.x, rightBeaker.y, rightBeaker.w, rightBeaker.h);

      // Electrodes
      const anodeX = leftBeaker.x + leftBeaker.w / 2;
      const cathodeX = rightBeaker.x + rightBeaker.w / 2;
      // Anode (negative, dissolves)
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(anodeX - 8, leftBeaker.y - 20, 16, leftBeaker.h - 20);
      // Cathode (positive, plates)
      ctx.fillStyle = cellCathode === 'Cu' ? '#f97316' : cellCathode === 'Ag' ? '#cbd5e1' : '#64748b';
      ctx.fillRect(cathodeX - 8, rightBeaker.y - 20, 16, rightBeaker.h - 20);

      // Wire connecting electrodes (top)
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(anodeX, leftBeaker.y - 20);
      ctx.lineTo(anodeX, leftBeaker.y - 40);
      ctx.lineTo(cathodeX, leftBeaker.y - 40);
      ctx.lineTo(cathodeX, rightBeaker.y - 20);
      ctx.stroke();

      // Voltmeter
      const vmX = (anodeX + cathodeX) / 2;
      const vmY = leftBeaker.y - 55;
      ctx.fillStyle = isDark ? '#1e293b' : '#f1f5f9';
      ctx.beginPath();
      ctx.arc(vmX, vmY, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('V', vmX, vmY - 3);
      ctx.fillStyle = isDark ? '#fff' : '#000';
      ctx.font = 'bold 9px monospace';
      ctx.fillText(`${Ecell.toFixed(2)}`, vmX, vmY + 10);

      // Salt bridge (U-tube between beakers)
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(leftBeaker.x + leftBeaker.w, leftBeaker.y + 50);
      ctx.quadraticCurveTo((leftBeaker.x + leftBeaker.w + rightBeaker.x) / 2, leftBeaker.y + 20, rightBeaker.x, rightBeaker.y + 50);
      ctx.stroke();
      ctx.fillStyle = '#a855f7';
      ctx.font = 'bold 8px monospace';
      ctx.fillText('Salt Bridge', vmX, leftBeaker.y + 25);

      // Electron flow (animated dots along wire)
      if (cellRunning && Ecell > 0) {
        const flowCount = 8;
        for (let i = 0; i < flowCount; i++) {
          const t = ((cellTime * 0.5 + i / flowCount) % 1);
          // Path: anode top → across wire → cathode top
          const totalLen = (leftBeaker.y - 20) - (leftBeaker.y - 40) + (cathodeX - anodeX) + ((leftBeaker.y - 20) - (leftBeaker.y - 40));
          const dist = t * ((cathodeX - anodeX) + 40);
          let ex, ey;
          if (dist < 20) { ex = anodeX; ey = leftBeaker.y - 20 - dist; }
          else if (dist < 20 + (cathodeX - anodeX)) { ex = anodeX + (dist - 20); ey = leftBeaker.y - 40; }
          else { ex = cathodeX; ey = leftBeaker.y - 40 + (dist - 20 - (cathodeX - anodeX)); }
          ctx.fillStyle = '#fbbf24';
          ctx.shadowBlur = 8; ctx.shadowColor = '#fbbf24';
          ctx.beginPath();
          ctx.arc(ex, ey, 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
          ctx.fillStyle = '#000';
          ctx.font = 'bold 6px sans-serif';
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText('e⁻', ex, ey);
        }
      }

      // Ion migration in salt bridge
      if (cellRunning && Ecell > 0) {
        for (let i = 0; i < 5; i++) {
          const t = ((cellTime * 0.3 + i / 5) % 1);
          // Cations (positive) move left → right
          const cx = leftBeaker.x + leftBeaker.w + t * (rightBeaker.x - leftBeaker.x - leftBeaker.w);
          const cy = leftBeaker.y + 50 - Math.sin(t * Math.PI) * 30;
          ctx.fillStyle = '#22c55e';
          ctx.beginPath();
          ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
          ctx.fill();
          // Anions (negative) move right → left
          const ax = rightBeaker.x - t * (rightBeaker.x - leftBeaker.x - leftBeaker.w);
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.arc(ax, cy + 5, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Labels
      ctx.fillStyle = isDark ? '#fff' : '#000';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`ANODE (−)`, anodeX, leftBeaker.y + leftBeaker.h + 15);
      ctx.fillText(`${cellAnode} → ${cellAnode}²⁺ + 2e⁻`, anodeX, leftBeaker.y + leftBeaker.h + 28);
      ctx.fillText(`CATHODE (+)`, cathodeX, rightBeaker.y + rightBeaker.h + 15);
      ctx.fillText(`${cellCathode}²⁺ + 2e⁻ → ${cellCathode}`, cathodeX, rightBeaker.y + rightBeaker.h + 28);

      // Bubbles at cathode (if reduction produces gas)
      if (cellRunning && Ecell > 0) {
        for (let i = 0; i < 3; i++) {
          const bx = cathodeX + (Math.sin(cellTime * 2 + i) * 10);
          const by = rightBeaker.y + rightBeaker.h - 20 - ((cellTime * 30 + i * 20) % 80);
          ctx.strokeStyle = 'rgba(255,255,255,0.5)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(bx, by, 2, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      // Info box
      ctx.fillStyle = isDark ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.8)';
      ctx.fillRect(10, 10, 150, 60);
      ctx.strokeStyle = isDark ? '#475569' : '#cbd5e1';
      ctx.strokeRect(10, 10, 150, 60);
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('Galvanic Cell', 18, 25);
      ctx.fillStyle = isDark ? '#fff' : '#000';
      ctx.font = '9px monospace';
      ctx.fillText(`E°cell = ${Ecell.toFixed(2)} V`, 18, 40);
      ctx.fillText(`ΔG = ${(-Ecell * 96485 * 2 / 1000).toFixed(1)} kJ/mol`, 18, 53);
      ctx.fillText(Ecell > 0 ? '✓ Spontaneous' : '✗ Non-spontaneous', 18, 66);
    }

    ctx.restore();
  }, [activeTab, selectedPreset, temperature, liquidColor, particles, zoomLevel, bondingStepIdx,
      selectedMolecule, moleculeRotate, titrationPH, titrationAdded, titrationRunning,
      titrationIndicator, titrationAcid, titrationBase, titrationAcidConc, titrationBaseConc,
      titrationVolume, titrationHistory, selectedCrystal, crystalSize, crystalRotX, crystalRotY,
      crystalZoom, gasParticles, gasVolume, gasTemperature, gasParticlesCount,
      cellAnode, cellCathode, cellRunning, cellTime]);

  // Crystal drag handlers
  const handleCrystalMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeTab !== 'crystal') return;
    crystalDragRef.current = { x: e.clientX, y: e.clientY, rx: crystalRotX, ry: crystalRotY };
  };
  const handleCrystalMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeTab !== 'crystal' || !crystalDragRef.current) return;
    const dx = e.clientX - crystalDragRef.current.x;
    const dy = e.clientY - crystalDragRef.current.y;
    setCrystalRotY(crystalDragRef.current.ry + dx * 0.01);
    setCrystalRotX(Math.max(-1.4, Math.min(1.4, crystalDragRef.current.rx + dy * 0.01)));
  };
  const handleCrystalMouseUp = () => { crystalDragRef.current = null; };
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    if (activeTab === 'crystal') {
      e.preventDefault();
      setCrystalZoom(z => Math.max(30, Math.min(200, z - e.deltaY * 0.1)));
    }
  };

  const handleMutateStrand = () => { /* DNA tab only */ };
  const handleInjectAdrenaline = () => { /* not used */ };

  const prevStepPositions = (step: BondingStep) => {
    if (step.productPositions && step.productPositions.length > 0) return step.productPositions;
    return step.reactantPositions || [];
  };

  const activeTabMeta = {
    beaker: { label: 'Simulated Beaker', color: 'text-emerald-500' },
    orbital: { label: 'Structure & Resonance', color: 'text-purple-500' },
    molecules: { label: '3D Molecules', color: 'text-blue-500' },
    titration: { label: 'Acid-Base Titration', color: 'text-pink-500' },
    crystal: { label: 'Crystal Lattice', color: 'text-cyan-500' },
    gaslaws: { label: 'Gas Laws (PV=nRT)', color: 'text-orange-500' },
    electrochem: { label: 'Galvanic Cell', color: 'text-yellow-500' },
    playground: { label: 'Interactive Sandbox', color: 'text-fuchsia-500' },
  }[activeTab];

  if (activeTab === 'playground') {
    return (
      <div className="flex-1 flex flex-col h-full w-full min-h-0 text-[var(--theme-primary)] bg-[var(--theme-surface-alt)] relative">
        <div className="px-4 py-3 border-b border-[var(--theme-border)] flex items-center justify-between bg-[var(--theme-surface)]">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-fuchsia-500" />
            <span className="font-bold text-sm">Molecular Playground</span>
          </div>
          {onClose && (
            <button onClick={onClose} className="p-1.5 bg-[var(--theme-surface-alt)] border border-[var(--theme-border)] text-[var(--theme-secondary)] hover:text-red-500 rounded-xl">
              <X size={14} />
            </button>
          )}
        </div>
        <div className="flex-1 min-h-0">
          <PeriodicPlayground />
        </div>
      </div>
    );
  }

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
              <div className="select-none py-1 border-b border-zinc-200/40 dark:border-white/5">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Atom size={18} className="text-emerald-500 animate-spin-slow" />
                  <h3 className="font-bold text-sm tracking-tight text-zinc-950 dark:text-white">Chemistry Workspace</h3>
                </div>
                <p className="text-[10.5px] leading-relaxed text-[var(--theme-secondary)]">
                  8 interactive labs: beakers, titrations, crystals, gases, and more.
                </p>
              </div>

              {/* Tab Switcher (compact) */}
              <div className="grid grid-cols-2 gap-1 p-1 bg-[var(--theme-surface-alt)] rounded-xl border border-[var(--theme-border)]">
                {[
                  { id: 'beaker', label: 'Beaker', icon: <Beaker size={11}/> },
                  { id: 'orbital', label: 'Orbital', icon: <Orbit size={11}/> },
                  { id: 'molecules', label: '3D Molecules', icon: <Box size={11}/> },
                  { id: 'titration', label: 'Titration', icon: <Droplets size={11}/> },
                  { id: 'crystal', label: 'Crystal', icon: <Grid3x3 size={11}/> },
                  { id: 'gaslaws', label: 'Gas Laws', icon: <Wind size={11}/> },
                  { id: 'electrochem', label: 'Cell', icon: <Battery size={11}/> },
                  { id: 'playground', label: 'Sandbox', icon: <Sparkles size={11}/> },
                ].map(t => (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id as ChemTab)}
                    className={`py-1.5 px-2 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-all ${
                      activeTab === t.id
                        ? 'bg-emerald-500 text-white shadow'
                        : 'text-[var(--theme-secondary)] hover:text-[var(--theme-primary)]'
                    }`}
                  >
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>

              {/* Category filter chips (only for beaker/orbital) */}
              {(activeTab === 'beaker' || activeTab === 'orbital') && (
                <div>
                  <span className="text-[10px] uppercase tracking-wider font-bold text-[var(--theme-secondary)] font-mono block mb-1.5 flex items-center gap-1">
                    <Filter size={10}/> Reaction Category
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {CATEGORIES.map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => setActiveCategory(cat.id as ChemistryCategory | 'all')}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all flex items-center gap-1 ${
                          activeCategory === cat.id
                            ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-500'
                            : 'bg-[var(--theme-surface-alt)] border-[var(--theme-border)] text-[var(--theme-secondary)] hover:text-[var(--theme-primary)]'
                        }`}
                      >
                        <span className={cat.color}>{cat.icon}</span>
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB-SPECIFIC CONTROLS */}

              {/* Beaker / Orbital — Reaction list */}
              {(activeTab === 'beaker' || activeTab === 'orbital') && (
                <>
                  <div className="flex-1 space-y-1.5">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--theme-secondary)] block font-mono">
                      Preset Reactions ({filteredReactions.length})
                    </span>
                    <div className="space-y-1 max-h-[280px] overflow-y-auto custom-scrollbar">
                      {filteredReactions.map(preset => (
                        <button
                          key={preset.id}
                          onClick={() => handleSelectPreset(preset)}
                          className={`w-full p-2.5 rounded-xl text-left text-xs transition-all border flex flex-col gap-1 cursor-pointer ${
                            selectedPreset.id === preset.id
                              ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400 font-semibold'
                              : 'bg-[var(--theme-surface)] border-[var(--theme-border)] hover:bg-[var(--theme-hover-bg)]'
                          }`}
                        >
                          <span className="font-bold flex items-center justify-between pr-0.5">
                            {preset.name}
                            {selectedPreset.id === preset.id && <Zap size={11} className="text-emerald-500 animate-pulse" />}
                          </span>
                          <span className="text-[10px] font-mono opacity-80">{preset.equation}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {activeTab === 'beaker' && (
                    <div className="border-t border-[var(--theme-border)] pt-3.5 space-y-3">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--theme-secondary)] block font-mono">Solution Accessories</span>
                      <div>
                        <span className="text-[10.5px] font-medium text-[var(--theme-secondary)] block mb-1">Coloring Indicator</span>
                        <select
                          value={indicatorType}
                          onChange={e => setIndicatorType(e.target.value as any)}
                          className="w-full text-xs p-2 bg-[var(--theme-surface-alt)] border border-[var(--theme-border)] rounded-xl outline-none focus:ring-1 focus:ring-emerald-500"
                        >
                          <option value="universal">Universal Indicator</option>
                          <option value="phenolphthalein">Phenolphthalein</option>
                          <option value="real">Real Chemistry</option>
                        </select>
                      </div>
                      <div>
                        <div className="flex items-center justify-between text-[11px] font-bold font-mono text-[var(--theme-secondary)] mb-1">
                          <span>Bunsen burner</span>
                          <span className="text-orange-500 font-bold">{temperature}°C</span>
                        </div>
                        <input
                          type="range" min="10" max="100"
                          value={temperature}
                          onChange={e => setTemperature(Number(e.target.value))}
                          className="w-full h-1.5 rounded bg-[var(--theme-border)] appearance-none cursor-pointer accent-orange-500"
                        />
                      </div>
                    </div>
                  )}

                  {activeTab === 'orbital' && (
                    <div className="border-t border-[var(--theme-border)] pt-3.5 space-y-2">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--theme-secondary)] block font-mono">Bonding Animation</span>
                      <button
                        onClick={() => setIsAnimatingBond(!isAnimatingBond)}
                        className="w-full p-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5"
                      >
                        <Play size={13} className={isAnimatingBond ? 'animate-spin-slow' : ''} />
                        {isAnimatingBond ? 'Pause Steps' : 'Autoplay Steps'}
                      </button>
                      <div className="flex items-center border border-[var(--theme-border)] bg-[var(--theme-surface)] rounded-lg overflow-hidden h-8">
                        {selectedPreset.bondingMechanism.steps.map((_, idx) => (
                          <button
                            key={idx}
                            onClick={() => { setBondingStepIdx(idx); setIsAnimatingBond(false); }}
                            className={`px-2.5 h-full text-[10.5px] font-mono font-bold transition-colors cursor-pointer ${
                              bondingStepIdx === idx ? 'bg-emerald-500 text-white' : 'text-[var(--theme-secondary)] hover:bg-[var(--theme-hover-bg)]'
                            }`}
                          >
                            {idx + 1}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Molecules tab */}
              {activeTab === 'molecules' && (
                <div className="flex flex-col gap-3 flex-1 min-h-0">
                  <div>
                    <div className="flex items-center gap-1.5 mb-1 text-emerald-500 font-bold">
                      <BookOpen size={14} />
                      <span className="text-xs font-mono uppercase tracking-wider">Molecule Library</span>
                    </div>
                    <h4 className="text-xs font-extrabold uppercase tracking-tight">100+ Compounds</h4>
                  </div>
                  <div className="relative shrink-0">
                    <input
                      type="text"
                      placeholder="Search compounds..."
                      value={moleculeSearchQuery}
                      onChange={e => setMoleculeSearchQuery(e.target.value)}
                      className="w-full text-xs p-2.5 pl-8 bg-[var(--theme-surface-alt)] border border-[var(--theme-border)] rounded-xl outline-none focus:ring-1 focus:ring-emerald-500 placeholder-[var(--theme-secondary)]"
                    />
                    <Search size={13} className="absolute left-2.5 top-3.5 text-[var(--theme-secondary)]" />
                  </div>
                  <label className="flex items-center gap-2 text-xs cursor-pointer">
                    <input type="checkbox" checked={moleculeRotate} onChange={e => setMoleculeRotate(e.target.checked)} className="accent-emerald-500"/>
                    <span className="font-bold">Auto-rotate 3D</span>
                  </label>
                  <div className="grid grid-cols-1 gap-1 overflow-y-auto custom-scrollbar flex-1 rounded-xl p-1 bg-[var(--theme-surface-alt)]/40 border border-[var(--theme-border)]/50">
                    {filteredMolecules.slice(0, 40).map(mol => (
                      <button
                        key={mol.name}
                        onClick={() => setSelectedMolecule(mol)}
                        className={`w-full p-2.5 rounded-lg text-left transition-all cursor-pointer flex items-center justify-between border ${
                          selectedMolecule?.name === mol.name
                            ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-600 dark:text-emerald-400 font-extrabold shadow-sm'
                            : 'border-transparent hover:bg-[var(--theme-hover-bg)]'
                        }`}
                      >
                        <div className="truncate min-w-0 pr-1.5 flex-1">
                          <div className="text-xs truncate font-bold">{mol.name}</div>
                          <div className="text-[9px] text-[var(--theme-secondary)] truncate pt-0.5">{mol.geometry}</div>
                        </div>
                        <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono text-[9px] rounded font-extrabold shrink-0 ml-1.5">
                          {mol.formula}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Titration tab */}
              {activeTab === 'titration' && (
                <div className="space-y-3">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-pink-500 block font-mono">Titration Setup</span>

                  <div>
                    <span className="text-[10px] font-bold text-[var(--theme-secondary)] block mb-1">Analyte (flask)</span>
                    <select value={titrationAcid} onChange={e => { setTitrationAcid(e.target.value as any); setTitrationHistory([]); setTitrationAdded(0); }}
                      className="w-full text-xs p-2 bg-[var(--theme-surface-alt)] border border-[var(--theme-border)] rounded-xl">
                      <option value="HCl">HCl (strong acid)</option>
                      <option value="H2SO4">H₂SO₄ (diprotic)</option>
                      <option value="CH3COOH">CH₃COOH (weak acid)</option>
                    </select>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-[var(--theme-secondary)] block mb-1">Titrant (burette)</span>
                    <select value={titrationBase} onChange={e => { setTitrationBase(e.target.value as any); setTitrationHistory([]); setTitrationAdded(0); }}
                      className="w-full text-xs p-2 bg-[var(--theme-surface-alt)] border border-[var(--theme-border)] rounded-xl">
                      <option value="NaOH">NaOH (strong base)</option>
                      <option value="KOH">KOH (strong base)</option>
                      <option value="NH3">NH₃ (weak base)</option>
                    </select>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-bold font-mono mb-1">
                      <span>Analyte Volume</span>
                      <span className="text-pink-500">{titrationVolume} mL</span>
                    </div>
                    <input type="range" min="10" max="50" step="5" value={titrationVolume}
                      onChange={e => { setTitrationVolume(Number(e.target.value)); setTitrationHistory([]); setTitrationAdded(0); }}
                      className="w-full h-1.5 rounded bg-[var(--theme-border)] appearance-none cursor-pointer accent-pink-500"/>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-bold font-mono mb-1">
                      <span>[Analyte]</span>
                      <span className="text-pink-500">{titrationAcidConc.toFixed(2)} M</span>
                    </div>
                    <input type="range" min="0.05" max="0.5" step="0.05" value={titrationAcidConc}
                      onChange={e => { setTitrationAcidConc(Number(e.target.value)); setTitrationHistory([]); setTitrationAdded(0); }}
                      className="w-full h-1.5 rounded bg-[var(--theme-border)] appearance-none cursor-pointer accent-pink-500"/>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-bold font-mono mb-1">
                      <span>[Titrant]</span>
                      <span className="text-purple-500">{titrationBaseConc.toFixed(2)} M</span>
                    </div>
                    <input type="range" min="0.05" max="0.5" step="0.05" value={titrationBaseConc}
                      onChange={e => { setTitrationBaseConc(Number(e.target.value)); setTitrationHistory([]); setTitrationAdded(0); }}
                      className="w-full h-1.5 rounded bg-[var(--theme-border)] appearance-none cursor-pointer accent-purple-500"/>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-[var(--theme-secondary)] block mb-1">Indicator</span>
                    <select value={titrationIndicator} onChange={e => setTitrationIndicator(e.target.value as any)}
                      className="w-full text-xs p-2 bg-[var(--theme-surface-alt)] border border-[var(--theme-border)] rounded-xl">
                      <option value="phenolphthalein">Phenolphthalein (8.2-10)</option>
                      <option value="methyl-orange">Methyl Orange (3.1-4.4)</option>
                      <option value="bromothymol">Bromothymol Blue (6.0-7.6)</option>
                    </select>
                  </div>

                  <div className="p-2.5 bg-[var(--theme-surface-alt)] rounded-lg border border-[var(--theme-border)] text-[10px] font-mono">
                    <div>Equivalence vol: <strong className="text-pink-500">{((titrationAcidConc * titrationVolume) / titrationBaseConc).toFixed(2)} mL</strong></div>
                    <div>Current added: <strong className="text-purple-500">{titrationAdded.toFixed(2)} mL</strong></div>
                    <div>pH now: <strong className="text-emerald-500">{titrationPH.toFixed(2)}</strong></div>
                  </div>

                  <div className="grid grid-cols-3 gap-1">
                    <button onClick={() => setTitrationRunning(!titrationRunning)}
                      className={`py-1.5 font-bold text-[10px] rounded-lg ${titrationRunning ? 'bg-orange-500 text-white' : 'bg-emerald-500 text-white'}`}>
                      {titrationRunning ? 'Pause' : 'Run'}
                    </button>
                    <button onClick={() => setTitrationAdded(v => Math.min(60, v + 0.5))}
                      className="py-1.5 font-bold text-[10px] rounded-lg bg-blue-500 text-white">
                      +0.5 mL
                    </button>
                    <button onClick={() => { setTitrationAdded(0); setTitrationHistory([]); setTitrationRunning(false); }}
                      className="py-1.5 font-bold text-[10px] rounded-lg bg-red-500 text-white">
                      Reset
                    </button>
                  </div>
                </div>
              )}

              {/* Crystal tab */}
              {activeTab === 'crystal' && (
                <div className="space-y-3">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-cyan-500 block font-mono">Crystal Presets</span>
                  <div className="space-y-1 max-h-[280px] overflow-y-auto custom-scrollbar">
                    {CRYSTAL_PRESETS.map(c => (
                      <button
                        key={c.id}
                        onClick={() => setSelectedCrystal(c)}
                        className={`w-full p-2.5 rounded-xl text-left text-xs transition-all border cursor-pointer ${
                          selectedCrystal.id === c.id
                            ? 'bg-cyan-500/10 border-cyan-500 text-cyan-600 dark:text-cyan-400 font-semibold'
                            : 'bg-[var(--theme-surface)] border-[var(--theme-border)] hover:bg-[var(--theme-hover-bg)]'
                        }`}
                      >
                        <span className="font-bold block">{c.name}</span>
                        <span className="text-[10px] font-mono opacity-80">{c.formula} · {c.latticeType}</span>
                      </button>
                    ))}
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-bold font-mono mb-1">
                      <span>Lattice Size</span>
                      <span className="text-cyan-500">{crystalSize}</span>
                    </div>
                    <input type="range" min="2" max="6" step="1" value={crystalSize}
                      onChange={e => setCrystalSize(Number(e.target.value))}
                      className="w-full h-1.5 rounded bg-[var(--theme-border)] appearance-none cursor-pointer accent-cyan-500"/>
                  </div>

                  <label className="flex items-center gap-2 text-xs cursor-pointer">
                    <input type="checkbox" checked={crystalAutoRotate} onChange={e => setCrystalAutoRotate(e.target.checked)} className="accent-cyan-500"/>
                    <span className="font-bold">Auto-rotate</span>
                  </label>

                  <button onClick={() => { setCrystalRotX(-0.4); setCrystalRotY(0.6); setCrystalZoom(80); }}
                    className="w-full p-2 bg-[var(--theme-surface-alt)] border border-[var(--theme-border)] text-xs hover:text-cyan-500 rounded-lg flex items-center justify-center gap-1.5">
                    <RotateCcw size={12}/> Reset Camera
                  </button>

                  <div className="p-2.5 bg-[var(--theme-surface-alt)] rounded-lg border border-[var(--theme-border)] text-[10px] text-[var(--theme-secondary)] leading-relaxed">
                    <strong className="text-[var(--theme-primary)]">{selectedCrystal.name}</strong><br/>
                    {selectedCrystal.description}
                  </div>
                </div>
              )}

              {/* Gas Laws tab */}
              {activeTab === 'gaslaws' && (
                <div className="space-y-3">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-orange-500 block font-mono">Gas Variables</span>

                  <div>
                    <div className="flex justify-between text-xs font-bold font-mono mb-1">
                      <span>Particle Count (n)</span>
                      <span className="text-orange-500">{gasParticlesCount}</span>
                    </div>
                    <input type="range" min="10" max="150" step="5" value={gasParticlesCount}
                      onChange={e => setGasParticlesCount(Number(e.target.value))}
                      className="w-full h-1.5 rounded bg-[var(--theme-border)] appearance-none cursor-pointer accent-orange-500"/>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-bold font-mono mb-1">
                      <span>Temperature (T)</span>
                      <span className="text-red-500">{gasTemperature} K</span>
                    </div>
                    <input type="range" min="100" max="1000" step="10" value={gasTemperature}
                      onChange={e => setGasTemperature(Number(e.target.value))}
                      className="w-full h-1.5 rounded bg-[var(--theme-border)] appearance-none cursor-pointer accent-red-500"/>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-bold font-mono mb-1">
                      <span>Volume (V)</span>
                      <span className="text-blue-500">{gasVolume.toFixed(2)}×</span>
                    </div>
                    <input type="range" min="0.5" max="2" step="0.05" value={gasVolume}
                      onChange={e => setGasVolume(Number(e.target.value))}
                      className="w-full h-1.5 rounded bg-[var(--theme-border)] appearance-none cursor-pointer accent-blue-500"/>
                  </div>

                  <div className="p-2.5 bg-[var(--theme-surface-alt)] rounded-lg border border-[var(--theme-border)] text-[10px] space-y-1">
                    <div className="font-bold text-[var(--theme-primary)]">Classic Gas Laws:</div>
                    <button onClick={() => { setGasTemperature(600); setGasVolume(1); }}
                      className="w-full text-left p-1.5 rounded hover:bg-[var(--theme-hover-bg)] text-orange-500">
                      ⬆ Charles: T↑ → P↑ (const V)
                    </button>
                    <button onClick={() => { setGasVolume(0.6); setGasTemperature(300); }}
                      className="w-full text-left p-1.5 rounded hover:bg-[var(--theme-hover-bg)] text-blue-500">
                      ⬇ Boyle: V↓ → P↑ (const T)
                    </button>
                    <button onClick={() => { setGasTemperature(600); setGasVolume(2); }}
                      className="w-full text-left p-1.5 rounded hover:bg-[var(--theme-hover-bg)] text-purple-500">
                      ⬆ Gay-Lussac: T↑ → V↑ (const P)
                    </button>
                  </div>

                  <div className="p-2.5 bg-orange-500/5 rounded-lg border border-orange-500/20 text-[10px] text-[var(--theme-secondary)] leading-relaxed">
                    <strong className="text-orange-500">Color = speed:</strong> blue (slow/cold) → red (fast/hot). KE ∝ T.
                  </div>
                </div>
              )}

              {/* Electrochemistry tab */}
              {activeTab === 'electrochem' && (
                <div className="space-y-3">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-yellow-500 block font-mono">Galvanic Cell Setup</span>

                  <div>
                    <span className="text-[10px] font-bold text-[var(--theme-secondary)] block mb-1">Anode (oxidation, −)</span>
                    <select value={cellAnode} onChange={e => setCellAnode(e.target.value as any)}
                      className="w-full text-xs p-2 bg-[var(--theme-surface-alt)] border border-[var(--theme-border)] rounded-xl">
                      <option value="Zn">Zinc (E° = −0.76 V)</option>
                      <option value="Mg">Magnesium (E° = −2.37 V)</option>
                      <option value="Fe">Iron (E° = −0.44 V)</option>
                    </select>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-[var(--theme-secondary)] block mb-1">Cathode (reduction, +)</span>
                    <select value={cellCathode} onChange={e => setCellCathode(e.target.value as any)}
                      className="w-full text-xs p-2 bg-[var(--theme-surface-alt)] border border-[var(--theme-border)] rounded-xl">
                      <option value="Cu">Copper (E° = +0.34 V)</option>
                      <option value="Ag">Silver (E° = +0.80 V)</option>
                      <option value="Pb">Lead (E° = −0.13 V)</option>
                    </select>
                  </div>

                  <button onClick={() => setCellRunning(!cellRunning)}
                    className={`w-full py-2 font-bold text-xs rounded-lg ${cellRunning ? 'bg-orange-500 text-white' : 'bg-emerald-500 text-white'}`}>
                    {cellRunning ? '⏸ Pause Flow' : '▶ Start Cell'}
                  </button>

                  <div className="p-2.5 bg-yellow-500/5 rounded-lg border border-yellow-500/20 text-[10px] text-[var(--theme-secondary)] leading-relaxed space-y-1">
                    <div><strong className="text-yellow-500">E°cell = E°(cathode) − E°(anode)</strong></div>
                    <div>Electrons flow through external wire from anode to cathode.</div>
                    <div>Cations move through salt bridge to cathode; anions to anode.</div>
                    <div>Positive E°cell → spontaneous reaction (ΔG &lt; 0).</div>
                  </div>
                </div>
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
            <span className={`h-2 w-2 rounded-full animate-pulse bg-emerald-500`} />
            <span className={`text-xs font-bold uppercase font-mono tracking-wider ${activeTabMeta.color}`}>
              {activeTabMeta.label}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {activeTab !== 'crystal' && activeTab !== 'gaslaws' && activeTab !== 'electrochem' && (
              <div className="flex items-center bg-[var(--theme-surface-alt)] border border-[var(--theme-border)] rounded-xl overflow-hidden h-8">
                <button
                  onClick={() => setZoomLevel(p => Math.max(0.25, Number((p - 0.25).toFixed(2))))}
                  className="h-full px-3 text-[var(--theme-secondary)] hover:text-[var(--theme-primary)] hover:bg-[var(--theme-hover-bg)] border-r border-[var(--theme-border)]"
                >
                  <ZoomOut size={12} />
                </button>
                <div className="px-2.5 font-mono text-[10px] text-[var(--theme-secondary)] select-none font-bold min-w-[48px] text-center">
                  {Math.round(zoomLevel * 100)}%
                </div>
                <button
                  onClick={() => setZoomLevel(p => Math.min(3.0, Number((p + 0.25).toFixed(2))))}
                  className="h-full px-3 text-[var(--theme-secondary)] hover:text-[var(--theme-primary)] hover:bg-[var(--theme-hover-bg)] border-l border-[var(--theme-border)]"
                >
                  <ZoomIn size={12} />
                </button>
              </div>
            )}

            <button
              onClick={handleReset}
              className="h-8 px-3 text-xs bg-[var(--theme-surface)] border border-[var(--theme-border)] text-[var(--theme-secondary)] hover:text-emerald-500 rounded-xl flex items-center gap-1"
            >
              <RotateCcw size={13} /> Reset
            </button>

            {onClose && (
              <button
                onClick={onClose}
                className="p-1.5 bg-[var(--theme-surface-alt)] border border-[var(--theme-border)] text-[var(--theme-secondary)] hover:text-red-500 rounded-xl h-8 w-8 flex items-center justify-center"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* HUD */}
        <div className="bg-[var(--theme-surface)] border-b border-[var(--theme-border)]/50 px-4 py-2 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-[var(--theme-secondary)] font-medium">
              {activeTab === 'molecules' ? 'Inspecting:' : activeTab === 'crystal' ? 'Lattice:' : activeTab === 'titration' ? 'Titration:' : 'Reaction:'}
            </span>
            <span className="font-mono font-bold text-emerald-500 truncate max-w-[300px]">
              {activeTab === 'molecules' && selectedMolecule ? `${selectedMolecule.name} (${selectedMolecule.formula})` :
               activeTab === 'crystal' ? selectedCrystal.name :
               activeTab === 'titration' ? `${titrationAcid} vs ${titrationBase}` :
               selectedPreset.equation}
            </span>
          </div>
          <div className="flex items-center gap-2 font-mono font-bold">
            {(activeTab === 'beaker' || activeTab === 'orbital') && (
              <>
                <span className="text-[10px] bg-[var(--theme-surface-alt)] px-2 py-0.5 rounded border border-[var(--theme-border)]">
                  pH: <strong className="text-emerald-500">{selectedPreset.pH}</strong>
                </span>
                <span className="text-[10px] bg-[var(--theme-surface-alt)] px-2 py-0.5 rounded border border-[var(--theme-border)]">
                  {selectedPreset.energyExothermic ? <span className="text-orange-500">Exothermic</span> : <span className="text-zinc-400">Isothermal</span>}
                </span>
              </>
            )}
            {activeTab === 'titration' && (
              <span className="text-[10px] bg-[var(--theme-surface-alt)] px-2 py-0.5 rounded border border-[var(--theme-border)]">
                pH: <strong className="text-pink-500">{titrationPH.toFixed(2)}</strong>
              </span>
            )}
            {activeTab === 'crystal' && (
              <span className="text-[10px] bg-[var(--theme-surface-alt)] px-2 py-0.5 rounded border border-[var(--theme-border)]">
                Type: <strong className="text-cyan-500">{selectedCrystal.latticeType}</strong>
              </span>
            )}
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 min-h-0 flex items-center justify-center p-4 relative">
          <canvas
            ref={canvasRef}
            width={400}
            height={activeTab === 'gaslaws' ? 380 : activeTab === 'electrochem' ? 380 : activeTab === 'titration' ? 380 : 340}
            onMouseDown={handleCrystalMouseDown}
            onMouseMove={handleCrystalMouseMove}
            onMouseUp={handleCrystalMouseUp}
            onMouseLeave={handleCrystalMouseUp}
            onWheel={handleWheel}
            className={`w-full max-w-[500px] h-[${activeTab === 'gaslaws' || activeTab === 'electrochem' || activeTab === 'titration' ? '480px' : '420px'}] border border-transparent rounded-2xl ${
              activeTab === 'crystal' ? 'cursor-grab active:cursor-grabbing' : ''
            }`}
          />

          {/* pH Gauge overlay (for beaker) */}
          {activeTab === 'beaker' && (
            <div className="absolute top-4 right-4 bg-[var(--theme-surface)]/90 backdrop-blur-md border border-[var(--theme-border)] rounded-2xl p-3 w-32">
              <div className="text-[9px] uppercase font-bold text-[var(--theme-secondary)] font-mono mb-2 text-center">pH Meter</div>
              <div className="relative h-16 flex items-center justify-center">
                {/* Semi-circle gradient */}
                <svg viewBox="0 0 100 60" className="w-full h-full">
                  <defs>
                    <linearGradient id="phGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#ef4444" />
                      <stop offset="25%" stopColor="#f97316" />
                      <stop offset="50%" stopColor="#22c55e" />
                      <stop offset="75%" stopColor="#3b82f6" />
                      <stop offset="100%" stopColor="#7c3aed" />
                    </linearGradient>
                  </defs>
                  <path d="M 10 50 A 40 40 0 0 1 90 50" stroke="url(#phGrad)" strokeWidth="8" fill="none" strokeLinecap="round"/>
                  {/* Needle */}
                  {(() => {
                    const ph = selectedPreset.pH;
                    const angle = Math.PI - (ph / 14) * Math.PI;
                    const nx = 50 + Math.cos(angle) * 35;
                    const ny = 50 - Math.sin(angle) * 35;
                    return (
                      <>
                        <line x1="50" y1="50" x2={nx} y2={ny} stroke="#000" strokeWidth="2"/>
                        <circle cx="50" cy="50" r="3" fill="#000"/>
                      </>
                    );
                  })()}
                </svg>
              </div>
              <div className="text-center font-mono font-bold text-sm text-[var(--theme-primary)]">
                {selectedPreset.pH.toFixed(1)}
              </div>
              <div className="text-center text-[8px] text-[var(--theme-secondary)] mt-0.5">
                {selectedPreset.pH < 7 ? 'ACIDIC' : selectedPreset.pH > 7 ? 'BASIC' : 'NEUTRAL'}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};