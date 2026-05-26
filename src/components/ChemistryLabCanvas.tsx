import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  X, Play, RotateCcw, ZoomIn, ZoomOut, Flame, Info, Pipette, Beaker, HelpCircle, AlertTriangle,
  ChevronDown, ChevronRight, Sparkles, BookOpen, Atom, Zap, RefreshCw, Thermometer, Eye, Search
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PeriodicPlayground } from './PeriodicPlayground';
import { MOLECULES_DIRECTORY, MoleculeDetail } from './ChemistryMoleculesData';

// Element properties for drop-in beaker additions
interface ElementItem {
  symbol: string;
  name: string;
  atomicNumber: number;
  weight: number;
  color: string;
  type: 'nonmetal' | 'gas' | 'halogen' | 'alkali' | 'transition';
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

interface BondingStep {
  title: string;
  desc: string;
  reactantPositions: Array<{ label: string; x: number; y: number; valences: number; fill: string }>;
  productPositions: Array<{ label: string; x: number; y: number; bonded: boolean; labelOffset?: {x: number, y: number}, fill: string }>;
}

interface ReactionPreset {
  id: string;
  name: string;
  formula: string;
  equation: string;
  category: 'physical' | 'inorganic' | 'organic';
  description: string;
  iupacName?: string;
  hybridization?: string;
  resonanceInfo?: string;
  pH: number;
  dangerLevel: 'Safe' | 'Warning' | 'Hazardous';
  energyExothermic: boolean;
  baseColor: string; // Real-life solution color without indicator
  hasPrecipitate?: boolean;
  precipitateColor?: string;
  hasFumes?: boolean;
  reactantsList: Array<{ symbol: string; count: number }>;
  bondingMechanism: {
    type: 'ionic' | 'covalent' | 'coordinate' | 'resonance';
    steps: BondingStep[];
  };
}

const REACTION_PRESETS: ReactionPreset[] = [
  // --- PHYSICAL CHEMISTRY ---
  {
    id: 'neutralization',
    name: 'HCl & NaOH Neutralization',
    formula: 'H₂O + NaCl',
    equation: 'HCl (aq) + NaOH (aq) ➔ NaCl (aq) + H₂O (l)',
    category: 'physical',
    description: 'Strong acid-base exothermic neutralization. Standard reaction generates salty water and releases 57.3 kJ of energy per mole, rendering solutions neutral.',
    pH: 7.0,
    dangerLevel: 'Safe',
    energyExothermic: true,
    baseColor: '#e2e8f005', // completely transparent clear colorless solution
    reactantsList: [{ symbol: 'H', count: 2 }, { symbol: 'O', count: 1 }, { symbol: 'Na', count: 1 }, { symbol: 'Cl', count: 1 }],
    bondingMechanism: {
      type: 'ionic',
      steps: [
        {
          title: 'Reactant Mobilization',
          desc: 'HCl deprotonates completely in water yielding acidic hydronium H⁺ and Cl⁻. NaOH dissociates fully into basic hydroxide OH⁻ and counter-ion Na⁺.',
          reactantPositions: [
            { label: 'H⁺', x: 120, y: 150, valences: 0, fill: '#38bdf8' },
            { label: 'OH⁻', x: 280, y: 150, valences: 8, fill: '#ef4444' },
            { label: 'Na⁺', x: 180, y: 100, valences: 0, fill: '#fbbf24' },
            { label: 'Cl⁻', x: 220, y: 220, valences: 8, fill: '#4ade80' }
          ],
          productPositions: []
        },
        {
          title: 'Transition State: Protons Transferring',
          desc: 'An extreme electrostatic attractive force guides the free proton H⁺ towards the electron-rich hydroxide OH⁻ oxygen atom.',
          reactantPositions: [],
          productPositions: [
            { label: 'H...', x: 170, y: 150, bonded: false, fill: '#38bdf8' },
            { label: 'O-H', x: 210, y: 150, bonded: true, fill: '#ef4444' },
            { label: 'Na⁺', x: 150, y: 100, bonded: false, fill: '#fbbf24' },
            { label: 'Cl⁻', x: 250, y: 220, bonded: false, fill: '#4ade80' }
          ]
        },
        {
          title: 'Neutralized Product Complex',
          desc: 'High-energy neutralization terminates firmly to form stable water, H₂O, with fully completed octet shells. Solvated NaCl remains fully dissociated.',
          reactantPositions: [],
          productPositions: [
            { label: 'H₂O', x: 200, y: 150, bonded: true, fill: '#3b82f6' },
            { label: 'Na⁺', x: 120, y: 120, bonded: false, fill: '#fbbf24' },
            { label: 'Cl⁻', x: 280, y: 180, bonded: false, fill: '#4ade80' }
          ]
        }
      ]
    }
  },
  {
    id: 'combustion',
    name: 'Methane Fuel Combustion',
    formula: 'CO₂ + 2H₂O',
    equation: 'CH₄ (g) + 2O₂ (g) ➔ CO₂ (g) + 2H₂O (l)',
    category: 'physical',
    description: 'Highly exothermic oxidation of simplest hydrocarbon fuel. Releases heat and produces greenhouse gas carbon dioxide with water vapor.',
    pH: 5.5,
    dangerLevel: 'Warning',
    energyExothermic: true,
    baseColor: '#64748b11',
    reactantsList: [{ symbol: 'C', count: 1 }, { symbol: 'O', count: 2 }, { symbol: 'H', count: 4 }],
    bondingMechanism: {
      type: 'covalent',
      steps: [
        {
          title: 'Gaseous Reaction Mix',
          desc: 'Covalent Methane (CH₄) gas mixed with high-velocity Oxygen (O₂) gas awaiting ignition energy.',
          reactantPositions: [
            { label: 'CH₄', x: 130, y: 150, valences: 4, fill: '#a1a1aa' },
            { label: 'O₂', x: 270, y: 130, valences: 6, fill: '#ef4444' },
            { label: 'O₂', x: 270, y: 170, valences: 6, fill: '#ef4444' }
          ],
          productPositions: []
        },
        {
          title: 'Transition State: Disruption',
          desc: 'Thermal energy breaks existing C-H single bonds and O=O double bonds, creating highly reactive radical assemblies.',
          reactantPositions: [],
          productPositions: [
            { label: '[C]', x: 200, y: 150, bonded: false, fill: '#a1a1aa' },
            { label: 'H*', x: 140, y: 110, bonded: false, fill: '#38bdf8' },
            { label: 'H*', x: 140, y: 190, bonded: false, fill: '#38bdf8' },
            { label: 'H*', x: 160, y: 130, bonded: false, fill: '#38bdf8' },
            { label: 'H*', x: 160, y: 170, bonded: false, fill: '#38bdf8' },
            { label: 'O*', x: 250, y: 120, bonded: false, fill: '#ef4444' },
            { label: 'O*', x: 250, y: 180, bonded: false, fill: '#ef4444' }
          ]
        },
        {
          title: 'Molecular Oxidized State',
          desc: 'Atoms bond into Carbon Dioxide (O=C=O) double covalent bonds and two stable water molecules (H-O-H).',
          reactantPositions: [],
          productPositions: [
            { label: 'CO₂', x: 200, y: 150, bonded: true, fill: '#94a3b8' },
            { label: 'H₂O', x: 130, y: 110, bonded: true, fill: '#3b82f6' },
            { label: 'H₂O', x: 270, y: 190, bonded: true, fill: '#3b82f6' }
          ]
        }
      ]
    }
  },
  {
    id: 'ammonia_fumes',
    name: 'Ammonium Fume Synthesis',
    formula: 'NH₄Cl',
    equation: 'NH₃ (g) + HCl (g) ➔ NH₄Cl (s)',
    category: 'physical',
    description: 'Dry acid-base gas phase condensation. Mixing Ammonia vapors and Hydrogen Chloride gas instantly forms white ammonium chloride precipitate crystallites in mid-air.',
    pH: 5.2,
    dangerLevel: 'Warning',
    energyExothermic: true,
    baseColor: '#ffffff15',
    hasFumes: true,
    reactantsList: [{ symbol: 'N', count: 1 }, { symbol: 'H', count: 4 }, { symbol: 'Cl', count: 1 }],
    bondingMechanism: {
      type: 'coordinate',
      steps: [
        {
          title: 'Volatile Host Gases',
          desc: 'Basic gaseous Ammonia (NH₃) molecules containing a lone electron pair meet acidic, highly polar Hydrogen Chloride (HCl) vapors.',
          reactantPositions: [
            { label: 'NH₃', x: 130, y: 150, valences: 2, fill: '#818cf8' },
            { label: 'HCl', x: 270, y: 150, valences: 6, fill: '#4ade80' }
          ],
          productPositions: []
        },
        {
          title: 'Lone-Pair Coordination',
          desc: 'The lone electron pair on the nitrogen atom of NH₃ attacks the hydrogen proton of HCl, forming a dative conjugate bond.',
          reactantPositions: [],
          productPositions: [
            { label: 'H₃N:...H', x: 170, y: 150, bonded: true, fill: '#818cf8' },
            { label: 'Cl', x: 240, y: 150, bonded: false, fill: '#4ade80' }
          ]
        },
        {
          title: 'Ionic Ammonium Chloride Crystal',
          desc: 'Strong electrostatic linkages bond the positive coordinate polyatomic Ammonium ion [NH₄]⁺ to the negative Chloride ion Cl⁻, condensing as smoke.',
          reactantPositions: [],
          productPositions: [
            { label: '[NH₄]⁺', x: 160, y: 150, bonded: true, fill: '#6366f1' },
            { label: 'Cl⁻', x: 240, y: 150, bonded: false, fill: '#22c55e' }
          ]
        }
      ]
    }
  },
  // --- INORGANIC CHEMISTRY ---
  {
    id: 'golden_rain',
    name: 'Golden Rain Precipitation',
    formula: 'PbI₂',
    equation: 'Pb(NO₃)₂ (aq) + 2KI (aq) ➔ PbI₂ (s)↓ + 2KNO₃ (aq)',
    category: 'inorganic',
    description: 'Double displacement precipitate reaction. Lead Bromide/Iodide compounds form glinting bright yellow crystals ("Golden Rain") that slowly drift and settle down at the bottom.',
    pH: 6.4,
    dangerLevel: 'Hazardous',
    energyExothermic: false,
    baseColor: '#e2e8f00a',
    hasPrecipitate: true,
    precipitateColor: '#fbbf24', // Stunning yellow precipitate!
    reactantsList: [{ symbol: 'Na', count: 1 }, { symbol: 'Cl', count: 1 }],
    bondingMechanism: {
      type: 'ionic',
      steps: [
        {
          title: 'Aqueous Displacement Initiation',
          desc: 'Aqueous Lead Nitrate Pb²⁺ and Potassium Iodide I⁻ ions swim freely, and collide randomly in solution.',
          reactantPositions: [
            { label: 'Pb²⁺', x: 130, y: 140, valences: 0, fill: '#94a3b8' },
            { label: 'I⁻', x: 250, y: 130, valences: 8, fill: '#d946ef' },
            { label: 'I⁻', x: 270, y: 170, valences: 8, fill: '#d946ef' }
          ],
          productPositions: []
        },
        {
          title: 'Ionic Nucleation',
          desc: 'Halide iodide anions attach tightly to the lead center over electrostatic bonding limits, creating nucleating micro-clusters.',
          reactantPositions: [],
          productPositions: [
            { label: 'Pb²⁺', x: 190, y: 150, bonded: false, fill: '#94a3b8' },
            { label: 'I⁻', x: 160, y: 130, bonded: true, fill: '#d946ef' },
            { label: 'I⁻', x: 220, y: 170, bonded: true, fill: '#d946ef' }
          ]
        },
        {
          title: 'Brilliant Crystalline Lattice',
          desc: 'Lead Diiodide (PbI₂) compounds drop out of the aqueous phase as solid yellow micro-crystals, while spectator KNO₃ salts remain solvated.',
          reactantPositions: [],
          productPositions: [
            { label: 'PbI₂ (solid↓)', x: 200, y: 150, bonded: true, fill: '#fbbf24' }
          ]
        }
      ]
    }
  },
  {
    id: 'copper_complex',
    name: 'Royal Blue Copper-Ammonia Complex',
    formula: '[Cu(NH₃)₄]²⁺',
    equation: 'Cu²⁺ (aq) + 4NH₃ (aq) ➔ [Cu(NH₃)₄]²⁺ (aq)',
    category: 'inorganic',
    description: 'Ligand coordination substitution. Adding gaseous or liquid ammonia to faint blue copper sulfate solutions shifts molecules to form coordinate coordinates with an intense deep royal blue color.',
    pH: 11.2,
    dangerLevel: 'Warning',
    energyExothermic: false,
    baseColor: '#1d4ed844', // Intense rich deep blue!
    reactantsList: [{ symbol: 'Cu', count: 1 }, { symbol: 'N', count: 2 }, { symbol: 'H', count: 4 }],
    bondingMechanism: {
      type: 'coordinate',
      steps: [
        {
          title: 'Initial Hydrated Blue State',
          desc: 'Standard hydrated Cu²⁺ ion possesses an outer d-orbital shell that absorbs light, appearing as a soft, translucent light blue tint.',
          reactantPositions: [
            { label: 'Cu²⁺', x: 200, y: 150, valences: 0, fill: '#f97316' },
            { label: 'NH₃', x: 100, y: 80, valences: 2, fill: '#818cf8' },
            { label: 'NH₃', x: 300, y: 80, valences: 2, fill: '#818cf8' },
            { label: 'NH₃', x: 100, y: 220, valences: 2, fill: '#818cf8' },
            { label: 'NH₃', x: 300, y: 220, valences: 2, fill: '#818cf8' }
          ],
          productPositions: []
        },
        {
          title: 'Coordination attack',
          desc: 'Strong basic Nitrogen lone electron pairs coordinate directly with empty d-orbitals of the transition copper cation.',
          reactantPositions: [],
          productPositions: [
            { label: 'Cu²⁺', x: 200, y: 150, bonded: false, fill: '#f97316' },
            { label: 'H₃N:', x: 140, y: 110, bonded: true, fill: '#818cf8' },
            { label: ':NH₃', x: 260, y: 110, bonded: true, fill: '#818cf8' },
            { label: 'H₃N:', x: 140, y: 190, bonded: true, fill: '#818cf8' },
            { label: ':NH₃', x: 260, y: 190, bonded: true, fill: '#818cf8' }
          ]
        },
        {
          title: 'Tetraamminecopper(II) Complex',
          desc: 'Formation of square planar [Cu(NH₃)₄]²⁺ coordinates. This highly stable complex configuration splits energy levels, creating an intense, stunning deep royal blue shift.',
          reactantPositions: [],
          productPositions: [
            { label: '[Cu(NH₃)₄]²⁺', x: 200, y: 150, bonded: true, fill: '#1d4ed8' }
          ]
        }
      ]
    }
  },
  {
    id: 'iron_thiocyanate',
    name: 'Iron Blood-Red Complex',
    formula: '[Fe(SCN)]²⁺',
    equation: 'Fe³⁺ (aq) + SCN⁻ (aq) ➔ [Fe(SCN)]²⁺ (aq)',
    category: 'inorganic',
    description: 'Analytical coordination linkage test. Joining faint yellow iron(III) chloride and colorless potassium thiocyanate yields a deep blood-red complex instantly.',
    pH: 3.2,
    dangerLevel: 'Warning',
    energyExothermic: false,
    baseColor: '#b91c1c49', // Blood Red!
    reactantsList: [{ symbol: 'C', count: 1 }, { symbol: 'N', count: 1 }],
    bondingMechanism: {
      type: 'coordinate',
      steps: [
        {
          title: 'Coordinate Precursors',
          desc: 'Faint yellow coordinate ions water Fe³⁺ meet linear thiocyanate pseudohalide SCN⁻ containing free nucleophilic electron lone pairs on sulphur.',
          reactantPositions: [
            { label: 'Fe³⁺', x: 120, y: 150, valences: 0, fill: '#fbbf24' },
            { label: 'SCN⁻', x: 280, y: 150, valences: 4, fill: '#d946ef' }
          ],
          productPositions: []
        },
        {
          title: 'Dative Orbitals Merging',
          desc: 'Thiocyanate sulfur atoms share an electron pair datively with the unfilled electrophilic ferric d-orbital pathways of the iron atom.',
          reactantPositions: [],
          productPositions: [
            { label: 'Fe³⁺...S', x: 170, y: 150, bonded: true, fill: '#fbbf24' },
            { label: 'C≡N', x: 240, y: 150, bonded: true, fill: '#d946ef' }
          ]
        },
        {
          title: 'Blood-Red Thiocyanatoiron Complex',
          desc: 'The solvated [Fe(NCS)(H₂O)₅]²⁺ complex is established. The electronic charge transfer results in extremely strong absorptive values in blue wave bands, revealing a rich red color.',
          reactantPositions: [],
          productPositions: [
            { label: '[Fe(SCN)]²⁺', x: 200, y: 150, bonded: true, fill: '#b91c1c' }
          ]
        }
      ]
    }
  },
  // --- ORGANIC CHEMISTRY (SHOWS IUPAC, HYBRIDIZATION, RESONANCE STRUCTURES) ---
  {
    id: 'benzene',
    name: 'Benzene Hexagonal Ring',
    formula: 'C₆H₆',
    equation: 'C₆H₆ (Delocalized Conjugated Hexagon)',
    category: 'organic',
    description: 'Simplest stable aromatic hydrocarbon cyclic compound. Exhibits dynamic pi-electron aromaticity and alternating electronic resonance configurations.',
    iupacName: 'Benzene',
    hybridization: 'C atoms: sp² hybrid (Trigonal planar 120° angle)',
    resonanceInfo: 'Shows two equivalent Kekulé alternating structures shifting back and forth, or a single unified delocalized resonance hybrid circle drawing with bond order 1.5.',
    pH: 7.0,
    dangerLevel: 'Hazardous',
    energyExothermic: false,
    baseColor: '#e2e8f002',
    reactantsList: [{ symbol: 'C', count: 3 }, { symbol: 'H', count: 3 }],
    bondingMechanism: {
      type: 'resonance',
      steps: [
        {
          title: 'Kekulé Structure A',
          desc: 'Alternating double bonds positioned on C1=C2, C3=C4, C5=C6. Carbons are sp² conjugated with vertical unhybridized p-orbitals.',
          reactantPositions: [],
          productPositions: [
            { label: 'C1', x: 200, y: 90, bonded: true, fill: '#a1a1aa' },
            { label: 'C2', x: 250, y: 120, bonded: true, fill: '#a1a1aa' },
            { label: 'C3', x: 250, y: 180, bonded: true, fill: '#a1a1aa' },
            { label: 'C4', x: 200, y: 210, bonded: true, fill: '#a1a1aa' },
            { label: 'C5', x: 150, y: 180, bonded: true, fill: '#a1a1aa' },
            { label: 'C6', x: 150, y: 120, bonded: true, fill: '#a1a1aa' }
          ]
        },
        {
          title: 'Kekulé Structure B',
          desc: 'Pi electrons slide symmetrically inside the ring to form equivalent double bonds on C2=C3, C4=C5, C6=C1. Same thermodynamic energy level.',
          reactantPositions: [],
          productPositions: [
            { label: 'C1', x: 200, y: 90, bonded: true, fill: '#a1a1aa' },
            { label: 'C2', x: 250, y: 120, bonded: true, fill: '#a1a1aa' },
            { label: 'C3', x: 250, y: 180, bonded: true, fill: '#a1a1aa' },
            { label: 'C4', x: 200, y: 210, bonded: true, fill: '#a1a1aa' },
            { label: 'C5', x: 150, y: 180, bonded: true, fill: '#a1a1aa' },
            { label: 'C6', x: 150, y: 120, bonded: true, fill: '#a1a1aa' }
          ]
        },
        {
          title: 'Aromatic Resonance Hybrid',
          desc: 'Real physical state: pi electrons are entirely symmetrical and shared. Delocalization circles the loop, reducing structural energy and establishing aromatic resonance stabilization.',
          reactantPositions: [],
          productPositions: [
            { label: 'C', x: 200, y: 90, bonded: true, fill: '#64748b' },
            { label: 'C', x: 250, y: 120, bonded: true, fill: '#64748b' },
            { label: 'C', x: 250, y: 180, bonded: true, fill: '#64748b' },
            { label: 'C', x: 200, y: 210, bonded: true, fill: '#64748b' },
            { label: 'C', x: 150, y: 180, bonded: true, fill: '#64748b' },
            { label: 'C', x: 150, y: 120, bonded: true, fill: '#64748b' }
          ]
        }
      ]
    }
  },
  {
    id: 'ethanoic_acid',
    name: 'Ethanoic Acid Resonance',
    formula: 'CH₃COOH',
    equation: 'CH₃COOH ➔ CH₃COO⁻ + H⁺ (Symmetric Carboxylate anion)',
    category: 'organic',
    description: 'Weak organic vinegar carboxylic acid. Demonstrates resonance oxygen-sharing deprotonation to yield resonance-stabilized acetate.',
    iupacName: 'Ethanoic acid (Acetic acid)',
    hybridization: 'Carbonyl C: sp² , Methyl C: sp³',
    resonanceInfo: 'Once the proton H⁺ leaves, carboxylate anion (COO⁻) negative values delocalize equally. Each carbon-oxygen bond splits order structurally to 1.5, matching bond distances precisely.',
    pH: 2.8,
    dangerLevel: 'Warning',
    energyExothermic: false,
    baseColor: '#ef444408',
    reactantsList: [{ symbol: 'C', count: 2 }, { symbol: 'O', count: 2 }, { symbol: 'H', count: 4 }],
    bondingMechanism: {
      type: 'resonance',
      steps: [
        {
          title: 'Protonated Neutral State',
          desc: 'One oxygen has a terminal covalent double bond C=O, while the hydroxyl oxygen has a single bond C-O-H.',
          reactantPositions: [],
          productPositions: [
            { label: 'CH₃', x: 120, y: 150, bonded: true, fill: '#a1a1aa' },
            { label: 'C', x: 200, y: 150, bonded: true, fill: '#a1a1aa' },
            { label: 'O', x: 240, y: 100, bonded: true, fill: '#ef4444' },
            { label: 'O', x: 240, y: 200, bonded: true, fill: '#ef4444' },
            { label: 'H', x: 290, y: 200, bonded: true, fill: '#38bdf8' }
          ]
        },
        {
          title: 'Ionization Deprotonation',
          desc: 'The O-H bond breaks heterolytically. The acidic hydrogen proton H⁺ floats off, leaving a negative formal charge highly localized on the lower carboxylate oxygen.',
          reactantPositions: [],
          productPositions: [
            { label: 'CH₃', x: 120, y: 150, bonded: true, fill: '#a1a1aa' },
            { label: 'C', x: 200, y: 150, bonded: true, fill: '#a1a1aa' },
            { label: 'O', x: 240, y: 100, bonded: true, fill: '#ef4444' },
            { label: 'O⁻', x: 240, y: 200, bonded: true, fill: '#f43f5e' },
            { label: 'H⁺', x: 300, y: 230, bonded: false, fill: '#38bdf8' }
          ]
        },
        {
          title: 'Carboxylate Resonance Hybrid',
          desc: 'Real state: pi charges spread over both oxygens. Carbonyl and deprotonated oxygen share double bond order. Each oxygen has partial d-negative δ-charge and bond length equalizes.',
          reactantPositions: [],
          productPositions: [
            { label: 'CH₃', x: 120, y: 150, bonded: true, fill: '#64748b' },
            { label: 'C', x: 190, y: 150, bonded: true, fill: '#64748b' },
            { label: 'O(δ-)', x: 240, y: 100, bonded: true, fill: '#ef4444' },
            { label: 'O(δ-)', x: 240, y: 200, bonded: true, fill: '#ef4444' },
            { label: 'H⁺', x: 320, y: 220, bonded: false, fill: '#0ea5e9' }
          ]
        }
      ]
    }
  },
  {
    id: 'acetone',
    name: 'Acetone Carbonyl Resonance',
    formula: 'CH₃COCH₃',
    equation: 'CH₃COCH₃ ➔ (CH₃)₂C⁺-O⁻ (Ketone Polar Resonance)',
    category: 'organic',
    description: 'Extremely popular fast-drying key organic solvent. Demonstrates carbonyl polar resonance and Keto-Enol double bond transformations.',
    iupacName: 'Propan-2-one',
    hybridization: 'Carbonyl Central Carbon: sp² hybrid (Trigonal Planar)',
    resonanceInfo: 'Features polar resonance contributors. Due to high oxygen electronegativity, a strong polarizing shift pulls electron clouds, creating a positive partial charge δ+ on carbon and negative δ- on oxygen.',
    pH: 6.3,
    dangerLevel: 'Warning',
    energyExothermic: false,
    baseColor: '#e2e8f002',
    reactantsList: [{ symbol: 'C', count: 3 }, { symbol: 'H', count: 4 }, { symbol: 'O', count: 1 }],
    bondingMechanism: {
      type: 'resonance',
      steps: [
        {
          title: 'Keto Form (Most Stable)',
          desc: 'Contains central carbon double-bonded to oxygen (C=O) with two lateral terminal covalent methyl branches (CH₃).',
          reactantPositions: [],
          productPositions: [
            { label: 'CH₃', x: 120, y: 190, bonded: true, fill: '#a1a1aa' },
            { label: 'CH₃', x: 280, y: 190, bonded: true, fill: '#a1a1aa' },
            { label: 'C', x: 200, y: 150, bonded: true, fill: '#a1a1aa' },
            { label: 'O', x: 200, y: 80, bonded: true, fill: '#ef4444' }
          ]
        },
        {
          title: 'Carbonyl Ionic Polarization',
          desc: 'Pi electrons migrate fully to the oxygen atom, revealing a dipolar zwitterionic contributor with positive carbocation central charge.',
          reactantPositions: [],
          productPositions: [
            { label: 'CH₃', x: 120, y: 190, bonded: true, fill: '#a1a1aa' },
            { label: 'CH₃', x: 280, y: 190, bonded: true, fill: '#a1a1aa' },
            { label: 'C⁺', x: 200, y: 150, bonded: true, fill: '#f59e0b' },
            { label: 'O⁻', x: 200, y: 80, bonded: true, fill: '#ec4899' }
          ]
        },
        {
          title: 'Keto-Enol Tautomerism',
          desc: 'Equilibrium form where a proton from a carbon branch migrates to oxygen, shifting the double bond to form an enol vinyl alcohol derivative (C=C-O-H).',
          reactantPositions: [],
          productPositions: [
            { label: 'CH₃', x: 110, y: 180, bonded: true, fill: '#a1a1aa' },
            { label: 'C', x: 180, y: 150, bonded: true, fill: '#a1a1aa' },
            { label: 'CH₂', x: 250, y: 170, bonded: true, fill: '#a1a1aa' },
            { label: 'O', x: 180, y: 80, bonded: true, fill: '#ef4444' },
            { label: 'H', x: 230, y: 60, bonded: true, fill: '#38bdf8' }
          ]
        }
      ]
    }
  },
  {
    id: 'ozone_resonance',
    name: 'Ozone Trioxygen Resonance',
    formula: 'O₃',
    equation: 'O₃ (Bent Resonance Hybrid)',
    category: 'inorganic',
    description: 'Bent planar trioxygen molecule. Shows dynamic oxygen resonance delocalization. An average bond order of 1.5 is observed experimentally on each leg.',
    iupacName: 'Ozone',
    hybridization: 'Central O: sp² hybrid (Bent ~117° angle)',
    resonanceInfo: 'Alternates terminal single and double covalent bonds. Double bonds switch continuously in structural phases.',
    pH: 6.0,
    dangerLevel: 'Warning',
    energyExothermic: false,
    baseColor: '#38bdf820',
    reactantsList: [{ symbol: 'O', count: 3 }],
    bondingMechanism: {
      type: 'resonance',
      steps: [
        {
          title: 'Resonance Contributor I',
          desc: 'Double bond situated on left oxygen-oxygen bond, while the right oxygen is coordinately single-bonded with negative formal charge.',
          reactantPositions: [],
          productPositions: [
            { label: 'O(left)', x: 130, y: 190, bonded: true, fill: '#ef4444' },
            { label: 'O(center)⁺', x: 200, y: 120, bonded: true, fill: '#ec4899' },
            { label: 'O(right)⁻', x: 270, y: 190, bonded: true, fill: '#f43f5e' }
          ]
        },
        {
          title: 'Resonance Contributor II',
          desc: 'Pi electrons transfer fully. The single bond shifts to the left oxygen while the double bond completes on the right side.',
          reactantPositions: [],
          productPositions: [
            { label: 'O(left)⁻', x: 130, y: 190, bonded: true, fill: '#f43f5e' },
            { label: 'O(center)⁺', x: 200, y: 120, bonded: true, fill: '#ec4899' },
            { label: 'O(right)', x: 270, y: 190, bonded: true, fill: '#ef4444' }
          ]
        },
        {
          title: 'Trioxygen Hybrid delocalization',
          desc: 'Both bonds are equal in strength and length with a shared pi-cloud (bond order 1.5). Disperses localized charge across terminal oxygen poles.',
          reactantPositions: [],
          productPositions: [
            { label: 'O(δ-)', x: 130, y: 190, bonded: true, fill: '#ef4444' },
            { label: 'O(δ+)', x: 200, y: 120, bonded: true, fill: '#ec4899' },
            { label: 'O(δ-)', x: 270, y: 190, bonded: true, fill: '#ef4444' }
          ]
        }
      ]
    }
  },
  {
    id: 'nitrate_resonance',
    name: 'Nitrate Anion Planar Resonance',
    formula: 'NO₃⁻',
    equation: 'NO₃⁻ (sp² Trigonal Planar Resonance)',
    category: 'inorganic',
    description: 'Symmetric polyatomic nitrate compound. Delocalized pi system with 2/3 double bond configurations on each nitrogen-oxygen branch.',
    iupacName: 'Trioxonitrate(V) Anion',
    hybridization: 'Central Nitrogen: sp² hybrid (120° angles)',
    resonanceInfo: 'Standard planar anion structure with three equal structural bond lengths due to complete valence-symmetry resonance delocalization.',
    pH: 5.8,
    dangerLevel: 'Safe',
    energyExothermic: false,
    baseColor: '#a1a1aa15',
    reactantsList: [{ symbol: 'N', count: 1 }, { symbol: 'O', count: 3 }],
    bondingMechanism: {
      type: 'resonance',
      steps: [
        {
          title: 'Structure I: Top Double Bond',
          desc: 'Shows double bond localized on the vertical nitrogen-oxygen axis with single negative charges localized on bottom lateral oxygens.',
          reactantPositions: [],
          productPositions: [
            { label: 'N⁺', x: 200, y: 155, bonded: true, fill: '#818cf8', labelOffset: { x: 0, y: -25 } },
            { label: 'O', x: 200, y: 80, bonded: true, fill: '#ef4444' },
            { label: 'O⁻', x: 130, y: 210, bonded: true, fill: '#f43f5e' },
            { label: 'O⁻', x: 270, y: 210, bonded: true, fill: '#f43f5e' }
          ]
        },
        {
          title: 'Structure II: Left Double Bond',
          desc: 'Pi charge transfers symmetrically, placing the double bond at the bottom-left nitrogen-oxygen link.',
          reactantPositions: [],
          productPositions: [
            { label: 'N⁺', x: 200, y: 155, bonded: true, fill: '#818cf8', labelOffset: { x: 0, y: -25 } },
            { label: 'O⁻', x: 200, y: 80, bonded: true, fill: '#f43f5e' },
            { label: 'O', x: 130, y: 210, bonded: true, fill: '#ef4444' },
            { label: 'O⁻', x: 270, y: 210, bonded: true, fill: '#f43f5e' }
          ]
        },
        {
          title: 'Nitrate Resonance Hybrid',
          desc: 'Real stabilized molecular anion shape: partial negative charges spread evenly over all three terminal oxygen elements.',
          reactantPositions: [],
          productPositions: [
            { label: 'N⁺', x: 200, y: 155, bonded: true, fill: '#6366f1', labelOffset: { x: 0, y: -25 } },
            { label: 'O(δ-)', x: 200, y: 80, bonded: true, fill: '#ef4444' },
            { label: 'O(δ-)', x: 130, y: 210, bonded: true, fill: '#ef4444' },
            { label: 'O(δ-)', x: 270, y: 210, bonded: true, fill: '#ef4444' }
          ]
        }
      ]
    }
  },
  {
    id: 'carbon_dioxide_covalent',
    name: 'Carbon Dioxide Linear Covalent',
    formula: 'CO₂',
    equation: 'CO₂ (Linear Double Covalent)',
    category: 'physical',
    description: 'Thermally stable linear triatomic molecule (O=C=O). Displays symmetrical dipole moment cancellations.',
    iupacName: 'Carbon Dioxide',
    hybridization: 'Central Carbon: sp hybrid (Linear 180° angle)',
    resonanceInfo: 'Can display minor polar resonance structures but is dominated by the neutral linear double-bond configuration.',
    pH: 5.5,
    dangerLevel: 'Safe',
    energyExothermic: false,
    baseColor: '#cbd5e110',
    reactantsList: [{ symbol: 'C', count: 1 }, { symbol: 'O', count: 2 }],
    bondingMechanism: {
      type: 'covalent',
      steps: [
        {
          title: 'Valence Distribution',
          desc: 'Central carbon possesses 4 valence electrons, approaching two highly electronegative oxygen elements (6 valence electrons each).',
          reactantPositions: [
            { label: 'O', x: 120, y: 150, valences: 6, fill: '#ef4444' },
            { label: 'C', x: 200, y: 150, valences: 4, fill: '#a1a1aa' },
            { label: 'O', x: 280, y: 150, valences: 6, fill: '#ef4444' }
          ],
          productPositions: []
        },
        {
          title: 'Completed Linear Bond',
          desc: 'Atoms bond via two matching sets of dual coordinate double covalent bonds completing fully satisfied octets.',
          reactantPositions: [],
          productPositions: [
            { label: 'O', x: 120, y: 150, bonded: true, fill: '#ef4444' },
            { label: 'C', x: 200, y: 150, bonded: true, fill: '#64748b' },
            { label: 'O', x: 280, y: 150, bonded: true, fill: '#ef4444' }
          ]
        }
      ]
    }
  }
];

export const ChemistryLabCanvas: React.FC<{
  onClose?: () => void;
  isInline?: boolean;
}> = ({ onClose, isInline = true }) => {
  const [activeTab, setActiveTab] = useState<'beaker' | 'orbital' | 'molecules' | 'playground'>('beaker');
  const [selectedPreset, setSelectedPreset] = useState<ReactionPreset>(REACTION_PRESETS[0]);
  
  // Molecules search state
  const [selectedMolecule, setSelectedMolecule] = useState<MoleculeDetail | null>(MOLECULES_DIRECTORY[0] || null);
  const [moleculeSearchQuery, setMoleculeSearchQuery] = useState<string>('');

  const filteredMolecules = useMemo(() => {
    if (!moleculeSearchQuery) return MOLECULES_DIRECTORY;
    const q = moleculeSearchQuery.toLowerCase();
    return MOLECULES_DIRECTORY.filter(m => {
      return m.name.toLowerCase().includes(q) || 
             m.formula.toLowerCase().includes(q) || 
             m.keyProperties.toLowerCase().includes(q) ||
             m.geometry.toLowerCase().includes(q);
    });
  }, [moleculeSearchQuery]);
  
  // Beaker states
  const [temperature, setTemperature] = useState<number>(25); // Celsius
  const [indicatorType, setIndicatorType] = useState<'universal' | 'phenolphthalein' | 'real'>('universal');
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; vx: number; vy: number; color: string; size: number; label: string }[]>([]);
  const [reactionLog, setReactionLog] = useState<string[]>(['Chemistry laboratory active. Select a preset reaction or tap structural models to explore.']);

  // Bonding progress states
  const [bondingStepIdx, setBondingStepIdx] = useState<number>(0);
  const [isAnimatingBond, setIsAnimatingBond] = useState<boolean>(false);

  // Side-panel collapsible categories
  const [expandedCategories, setExpandedCategories] = useState<{ [key: string]: boolean }>({
    physical: true,
    inorganic: true,
    organic: true
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const toggleCategory = (cat: 'physical' | 'inorganic' | 'organic') => {
    setExpandedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  // Switch presets
  const handleSelectPreset = (preset: ReactionPreset) => {
    setSelectedPreset(preset);
    setBondingStepIdx(0);
    setTemperature(preset.energyExothermic ? 45 : 25);
    setReactionLog(logs => [
      `Loaded: ${preset.name}`,
      `Equation: ${preset.equation}`,
      ...logs.slice(0, 6)
    ]);
  };

  // Clear or reset beaker
  const handleReset = () => {
    setTemperature(selectedPreset.energyExothermic ? 45 : 25);
    setReactionLog(logs => ['Vessel reset to preset defaults.', ...logs.slice(0, 7)]);
  };

  // Determine solution liquid color based on pH and Indicator selection
  const liquidColor = useMemo(() => {
    const ph = selectedPreset.pH;
    if (indicatorType === 'universal') {
      if (ph <= 3) return '#dc2626'; // Acid Red
      if (ph <= 4.5) return '#f97316'; // Orange
      if (ph <= 6.2) return '#eab308'; // Yellow
      if (ph <= 7.5) return '#22c55e'; // Green
      if (ph <= 9.2) return '#06b6d4'; // Cyan
      if (ph <= 11) return '#2563eb'; // Blue
      return '#7c3aed'; // Deep Purple/Alkaline
    } else if (indicatorType === 'phenolphthalein') {
      // Colorless in acidic/neutral, bright fuchsia pink in alkaline
      return ph >= 8.2 ? '#ec4899' : '#ffffff10';
    } else {
      // Real actual chemical solution colors without indicator
      return selectedPreset.baseColor;
    }
  }, [selectedPreset, indicatorType]);

  // Handle particle count update based on formula elements
  useEffect(() => {
    const list: typeof particles = [];
    let idCounter = 0;
    
    selectedPreset.reactantsList.forEach(item => {
      const el = ELEMENTS.find(e => e.symbol === item.symbol);
      if (!el) return;
      // Spawn particles
      for (let i = 0; i < item.count * 2; i++) {
        list.push({
          id: idCounter++,
          x: Math.random() * 160 + 120,
          y: Math.random() * 100 + 140,
          vx: (Math.random() - 0.5) * (temperature / 10 + 2),
          vy: (Math.random() - 0.5) * (temperature / 10 + 2),
          color: el.color,
          size: 13 + el.atomicNumber * 0.3,
          label: el.symbol
        });
      }
    });

    setParticles(list);
  }, [selectedPreset, temperature]);

  // Canvas requestAnimationFrame bouncy particle loop
  useEffect(() => {
    let animId: number;
    const update = () => {
      setParticles(prev => {
        return prev.map(p => {
          let nx = p.x + p.vx;
          let ny = p.y + p.vy;
          let nvx = p.vx;
          let nvy = p.vy;

          // Beaker constraints: x: [100, 300], y: [130, 260]
          if (nx < 110 || nx > 290) {
            nvx = -p.vx;
            nx = Math.max(110, Math.min(290, nx));
          }
          if (ny < 140 || ny > 255) {
            nvy = -p.vy;
            ny = Math.max(140, Math.min(255, ny));
          }

          return { ...p, x: nx, y: ny, vx: nvx, vy: nvy };
        });
      });
      animId = requestAnimationFrame(update);
    };
    animId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Periodic slow slide animation when "Simulate Bonding" is playing inside Bonding mode
  useEffect(() => {
    if (!isAnimatingBond) return;
    const interval = setInterval(() => {
      setBondingStepIdx(prev => {
        const next = prev + 1;
        const totalSteps = selectedPreset.bondingMechanism.steps.length;
        if (next >= totalSteps) {
          return 0; // wrap around
        }
        return next;
      });
    }, 4500);

    return () => clearInterval(interval);
  }, [isAnimatingBond, selectedPreset]);

  // Main Canvas drawing logic
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    // Translate and Scale for zooming
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.scale(zoomLevel, zoomLevel);
    ctx.translate(-canvas.width / 2, -canvas.height / 2);

    const isDark = document.documentElement.classList.contains('dark');

    if (activeTab === 'beaker') {
      // --- DRAW BEAKER INTERACTIVE SCENARIO ---

      // Draw Bunsen burner flames underneath if temperature is high
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

        // Burner nozzle structure
        ctx.fillStyle = isDark ? '#475569' : '#64748b';
        ctx.fillRect(185, 305, 30, 25);
        ctx.restore();
      }

      // Draw liquid background (Solution level inside beaker)
      ctx.fillStyle = liquidColor.endsWith('05') || liquidColor.endsWith('15') || liquidColor === '#e2e8f002'
        ? liquidColor 
        : `${liquidColor}35`; // dynamic transparency alpha for indicator density
      ctx.beginPath();
      ctx.moveTo(100, 130);
      ctx.lineTo(300, 130);
      ctx.lineTo(300, 260);
      ctx.lineTo(100, 260);
      ctx.closePath();
      ctx.fill();

      // Fluid top surface oval highlight
      ctx.fillStyle = liquidColor.endsWith('05') || liquidColor.endsWith('15') || liquidColor === '#e2e8f002'
        ? liquidColor
        : `${liquidColor}60`;
      ctx.beginPath();
      ctx.ellipse(200, 130, 100, 7, 0, 0, Math.PI * 2);
      ctx.fill();

      // Draw Lead Iodide precipitation solid particles falling & sitting at the bottom
      if (selectedPreset.hasPrecipitate) {
        ctx.fillStyle = selectedPreset.precipitateColor || '#fbbf24';
        const points = [
          {x: 120, y: 256}, {x: 150, y: 259}, {x: 180, y: 260}, {x: 210, y: 258}, 
          {x: 240, y: 260}, {x: 270, y: 257}, {x: 290, y: 255}, {x: 135, y: 258},
          {x: 220, y: 259}, {x: 165, y: 257}
        ];
        points.forEach((pt, i) => {
          // Slowly settle some animated flakes drifting downwards
          const bounce = (Math.sin(Date.now() * 0.001 + i) * 6);
          const driftY = Math.min(pt.y, 140 + ((Date.now() * 0.015 + i * 20) % 115));
          ctx.beginPath();
          ctx.arc(pt.x + bounce * 0.4, driftY, 3, 0, Math.PI * 2);
          ctx.fill();

          // Settle layer on floor
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 4.5, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      // Draw Ammonium Chloride gaseous vapors spilling over the top
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

      // Draw Beaker Glass outlining container
      ctx.strokeStyle = isDark ? '#64748bbb' : '#94a3b8';
      ctx.lineWidth = 4;
      ctx.beginPath();
      // Lip contour
      ctx.moveTo(95, 80);
      ctx.lineTo(100, 90);
      // Sides
      ctx.lineTo(100, 260);
      ctx.bezierCurveTo(100, 275, 300, 275, 300, 260);
      ctx.lineTo(300, 90);
      ctx.lineTo(305, 80);
      ctx.stroke();

      // Milliliter scale markings printed on glass
      ctx.strokeStyle = isDark ? '#ffffff22' : '#00000015';
      ctx.lineWidth = 1.5;
      ctx.font = '8px monospace';
      ctx.fillStyle = isDark ? '#ffffff44' : '#00000035';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      for (let h = 110; h <= 230; h += 30) {
        ctx.beginPath();
        ctx.moveTo(100, h);
        ctx.lineTo(115, h);
        ctx.stroke();
        ctx.fillText(`${(260 - h) * 1.5}ml`, 120, h);
      }

      // Boiling or thermal convection micro bubbles
      if (temperature > 30) {
        ctx.fillStyle = isDark ? '#ffffff77' : '#ffffffbb';
        const speed = temperature / 10;
        for (let i = 0; i < Math.floor(temperature / 8); i++) {
          const bx = 110 + ((Math.sin(i * 9 + Date.now() * 0.0007) * 0.5 + 0.5) * 170);
          const by = 250 - ((Date.now() * 0.1 * speed + i * 25) % 110);
          ctx.beginPath();
          ctx.arc(bx, by, 1.5 + (i % 2.5), 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Render reactant floating particles (atoms)
      particles.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 3;
        ctx.shadowColor = p.color;
        ctx.fill();
        ctx.shadowBlur = 0; // reset

        ctx.strokeStyle = '#ffffffaa';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(p.label, p.x, p.y + 0.5);
      });

    } else if (activeTab === 'orbital') {
      // --- DRAW STRUCTURAL GRAPH OR ORBITAL BONDING SCHEMATIC ---
      ctx.save();
      
      const step = selectedPreset.bondingMechanism.steps[bondingStepIdx];
      if (!step) {
        ctx.restore();
        ctx.restore();
        return;
      }

      // Draw grid coordinates matching mathematical/scientific labs
      ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)';
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += 30) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += 30) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
      }

      // Specific skeletal graphics for special complex structures
      if (selectedPreset.id === 'benzene') {
        const cx = 200;
        const cy = 160;
        const r = 70;
        const pts: {x: number, y: number}[] = [];
        
        ctx.strokeStyle = isDark ? '#ffffff30' : '#00000020';
        ctx.setLineDash([3, 4]);
        ctx.strokeRect(30, 30, canvas.width - 60, canvas.height - 60);
        ctx.setLineDash([]);

        // Draw outer ring
        for (let i = 0; i < 6; i++) {
          const theta = (i * Math.PI / 3) - Math.PI / 2;
          pts.push({
            x: cx + r * Math.cos(theta),
            y: cy + r * Math.sin(theta)
          });
        }

        // Draw structural carbon sigma bounds
        ctx.strokeStyle = isDark ? '#38bdf8' : '#0284c7';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < 6; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.closePath();
        ctx.stroke();

        // Draw dynamic slide of pi bonds to represent Kekulé resonance shifts!
        const shiftActive = bondingStepIdx === 0 || (bondingStepIdx === 2 && Math.sin(Date.now() * 0.003) > 0);
        ctx.strokeStyle = '#ec4899';
        ctx.lineWidth = 2;
        
        if (bondingStepIdx < 2) {
          // Localized Double Bonds
          for (let i = 0; i < 6; i++) {
            const isDouble = shiftActive ? (i % 2 === 0) : (i % 2 !== 0);
            if (isDouble) {
              const start = pts[i];
              const end = pts[(i + 1) % 6];
              const shrink = 0.85; // slightly shrink inner lines
              const midX = (start.x + end.x) / 2;
              const midY = (start.y + end.y) / 2;
              
              ctx.beginPath();
              ctx.moveTo(cx + (start.x - cx) * shrink, cy + (start.y - cy) * shrink);
              ctx.lineTo(cx + (end.x - cx) * shrink, cy + (end.y - cy) * shrink);
              ctx.stroke();
            }
          }
        } else {
          // Delocalized circular unified cloud!
          ctx.beginPath();
          ctx.arc(cx, cy, r * 0.75, 0, Math.PI * 2);
          ctx.setLineDash([5, 5]);
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 3;
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Draw C elements nodes & H exterior bonds
        pts.forEach((pt, i) => {
          // Hydrogen bonds
          const factor = 1.35;
          const hx = cx + (pt.x - cx) * factor;
          const hy = cy + (pt.y - cy) * factor;
          ctx.strokeStyle = isDark ? '#ffffff20' : '#00000015';
          ctx.lineWidth = 2.0;
          ctx.beginPath(); ctx.moveTo(pt.x, pt.y); ctx.lineTo(hx, hy); ctx.stroke();
          
          // Carbon sphere node
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 14, 0, Math.PI * 2);
          ctx.fillStyle = isDark ? '#1e293b' : '#f1f5f9';
          ctx.strokeStyle = '#64748b';
          ctx.lineWidth = 1.5;
          ctx.fill(); ctx.stroke();

          ctx.fillStyle = isDark ? '#e2e8f0' : '#1e293b';
          ctx.font = 'bold 9px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`C${i+1}`, pt.x, pt.y);

          // Hydrogen sphere node
          ctx.beginPath();
          ctx.arc(hx, hy, 8, 0, Math.PI * 2);
          ctx.fillStyle = '#38bdf8';
          ctx.strokeStyle = '#0284c7';
          ctx.lineWidth = 1;
          ctx.fill(); ctx.stroke();
          
          ctx.fillStyle = '#0f172a';
          ctx.font = 'bold 8px sans-serif';
          ctx.fillText('H', hx, hy + 0.3);
        });

      } else if (selectedPreset.id === 'ethanoic_acid') {
        const stepPosMap = step.productPositions || [];
        // Connect bonds with lines
        ctx.strokeStyle = isDark ? '#ffffff22' : '#00000018';
        ctx.lineWidth = 3;
        
        // Skeletal outlines
        if (stepPosMap.length >= 4) {
          const ch3 = stepPosMap[0];
          const c = stepPosMap[1];
          const o1 = stepPosMap[2];
          const o2 = stepPosMap[3];
          
          ctx.strokeStyle = '#94a3b8';
          // CH3 - C
          ctx.beginPath(); ctx.moveTo(ch3.x, ch3.y); ctx.lineTo(c.x, c.y); ctx.stroke();
          
          // C - O1 (Top carbonyl)
          if (bondingStepIdx === 2) {
            // Resonance hybrid dual order 1.5 bonds!
            ctx.setLineDash([4, 4]);
            ctx.strokeStyle = '#ec4899';
            ctx.beginPath(); ctx.moveTo(c.x + 4, c.y); ctx.lineTo(o1.x + 4, o1.y); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(c.x + 4, c.y); ctx.lineTo(o2.x + 4, o2.y); ctx.stroke();
            ctx.setLineDash([]);
            
            ctx.strokeStyle = '#ef4444';
            ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.lineTo(o1.x, o1.y); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.lineTo(o2.x, o2.y); ctx.stroke();
          } else {
            // Localized bonds (Single and double)
            ctx.strokeStyle = '#ef4444';
            // Double C=O1
            ctx.beginPath(); ctx.moveTo(c.x - 3, c.y); ctx.lineTo(o1.x - 3, o1.y); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(c.x + 3, c.y); ctx.lineTo(o1.x + 3, o1.y); ctx.stroke();

            // Single C-O2
            ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.lineTo(o2.x, o2.y); ctx.stroke();

            // O2 - H (only present in step 0)
            if (bondingStepIdx === 0 && stepPosMap[4]) {
              const h = stepPosMap[4];
              ctx.beginPath(); ctx.moveTo(o2.x, o2.y); ctx.lineTo(h.x, h.y); ctx.stroke();
            }
          }
        }
      } else if (selectedPreset.id === 'acetone') {
        const stepPosMap = step.productPositions || [];
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 3;

        if (stepPosMap.length >= 4) {
          const ch3L = stepPosMap[0];
          const ch3R = stepPosMap[1];
          const c = stepPosMap[2];
          const o = stepPosMap[3];

          // L - C - R
          ctx.beginPath(); ctx.moveTo(ch3L.x, ch3L.y); ctx.lineTo(c.x, c.y); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(ch3R.x, ch3R.y); ctx.lineTo(c.x, c.y); ctx.stroke();

          // C and Oxygen
          if (bondingStepIdx === 1) {
            // Zwitterion single covalent
            ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.lineTo(o.x, o.y); ctx.stroke();
          } else if (bondingStepIdx === 0) {
            // Double C=O
            ctx.beginPath(); ctx.moveTo(c.x - 3.5, c.y); ctx.lineTo(o.x - 3.5, o.y); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(c.x + 3.5, c.y); ctx.lineTo(o.x + 3.5, o.y); ctx.stroke();
          } else {
            // Tautomerized enol double bond C=C and single C-O
            ctx.beginPath(); ctx.moveTo(c.x - 3, c.y); ctx.lineTo(ch3R.x - 3, ch3R.y); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(c.x + 3, c.y); ctx.lineTo(ch3R.x + 3, ch3R.y); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.lineTo(o.x, o.y); ctx.stroke();
            // O-H
            const h = stepPosMap[4];
            if (h) {
              ctx.beginPath(); ctx.moveTo(o.x, o.y); ctx.lineTo(h.x, h.y); ctx.stroke();
            }
          }
        }
      }

      // Draw active positions atoms & structural valence shells
      const activePositions = prevStepPositions(step);
      activePositions.forEach(node => {
        ctx.beginPath();
        ctx.arc(node.x, node.y, 16, 0, Math.PI * 2);
        ctx.fillStyle = node.fill || '#10b981';
        ctx.strokeStyle = isDark ? '#ffffff22' : '#00000010';
        ctx.lineWidth = 1.5;
        ctx.fill(); ctx.stroke();

        ctx.fillStyle = '#1e293b';
        ctx.font = 'bold 9.5px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(node.label, node.x, node.y + 0.3);

        // Draw electronic valence shell surrounding dots
        if (node.valences > 0) {
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

      ctx.restore();
    } else if (activeTab === 'molecules') {
      // --- DRAW MOLECULES CATALOG PREVIEW IN CANVAS ---
      if (selectedMolecule) {
        // Draw grid coordinate backdrop for tech look
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
          // Let's find centroid of the molecule to center it
          let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
          data.atoms.forEach(a => {
            if (a.x < minX) minX = a.x;
            if (a.x > maxX) maxX = a.x;
            if (a.y < minY) minY = a.y;
            if (a.y > maxY) maxY = a.y;
          });

          const cx = (minX + maxX) / 2;
          const cy = (minY + maxY) / 2;
          const targetX = 200;
          const targetY = 170;

          // Draw a soft glowing halo behind the molecule
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

          // Apply slight elegant continuous spin over time so it looks super premium!
          const rotationAngle = Date.now() * 0.0006;
          ctx.rotate(rotationAngle);

          // Render Bonds first so they are under atoms
          if (data.bonds && data.bonds.length > 0) {
            data.bonds.forEach(b => {
              const atomA = data.atoms[b.fromIdx];
              const atomB = data.atoms[b.toIdx];
              if (!atomA || !atomB) return;

              const x1 = atomA.x - cx;
              const y1 = atomA.y - cy;
              const x2 = atomB.x - cx;
              const y2 = atomB.y - cy;

              ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.25)' : 'rgba(15, 23, 42, 0.2)';
              ctx.lineWidth = 4;
              ctx.lineCap = 'round';

              if (b.type === 2) {
                // Double bond
                const dx = x2 - x1;
                const dy = y2 - y1;
                const len = Math.sqrt(dx * dx + dy * dy);
                const nx = -dy / len * 4;
                const ny = dx / len * 4;

                ctx.beginPath();
                ctx.moveTo(x1 + nx, y1 + ny);
                ctx.lineTo(x2 + nx, y2 + ny);
                ctx.stroke();

                ctx.beginPath();
                ctx.moveTo(x1 - nx, y1 - ny);
                ctx.lineTo(x2 - nx, y2 - ny);
                ctx.stroke();
              } else if (b.type === 3) {
                // Triple bond
                const dx = x2 - x1;
                const dy = y2 - y1;
                const len = Math.sqrt(dx * dx + dy * dy);
                const nx = -dy / len * 6;
                const ny = dx / len * 6;

                // Center line
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.stroke();

                // Left line
                ctx.beginPath();
                ctx.moveTo(x1 + nx, y1 + ny);
                ctx.lineTo(x2 + nx, y2 + ny);
                ctx.stroke();

                // Right line
                ctx.beginPath();
                ctx.moveTo(x1 - nx, y1 - ny);
                ctx.lineTo(x2 - nx, y2 - ny);
                ctx.stroke();
              } else {
                // Single bond
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.stroke();
              }
            });
          }

          // Render Atoms
          data.atoms.forEach(atom => {
            const ax = atom.x - cx;
            const ay = atom.y - cy;

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

            ctx.beginPath();
            ctx.arc(ax, ay, 15, 0, Math.PI * 2);
            ctx.fillStyle = atomColor;
            ctx.shadowBlur = 4;
            ctx.shadowColor = atomColor;
            ctx.fill();
            ctx.shadowBlur = 0;

            ctx.strokeStyle = '#ffffffaa';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            ctx.fillStyle = '#0f172a';
            ctx.font = 'bold 9.5px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(atom.symbol, ax, ay + 0.5);

            ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.beginPath();
            ctx.arc(ax - 5, ay - 5, 2.5, 0, Math.PI * 2);
            ctx.fill();
          });

          ctx.restore();
        } else {
          // Fallback orbit drawing
          ctx.beginPath();
          ctx.arc(200, 170, 40, 0, Math.PI * 2);
          const radGrad = ctx.createRadialGradient(200, 170, 5, 200, 170, 40);
          radGrad.addColorStop(0, '#818cf8');
          radGrad.addColorStop(1, '#6366f1');
          ctx.fillStyle = radGrad;
          ctx.fill();

          ctx.strokeStyle = '#ffffffbb';
          ctx.lineWidth = 2;
          ctx.stroke();

          ctx.fillStyle = 'white';
          ctx.font = 'bold 16px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(selectedMolecule.formula, 200, 170);

          ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.ellipse(200, 170, 75, 25, Math.PI / 4, 0, Math.PI * 2);
          ctx.stroke();

          ctx.beginPath();
          ctx.ellipse(200, 170, 75, 25, -Math.PI / 4, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    }

    ctx.restore();
  }, [selectedPreset, activeTab, temperature, liquidColor, particles, zoomLevel, bondingStepIdx, selectedMolecule]);

  // Support helper mapping reactants/products to coordinate structures
  const prevStepPositions = (step: BondingStep) => {
    if (step.productPositions && step.productPositions.length > 0) {
      return step.productPositions;
    }
    return step.reactantPositions || [];
  };

  if (activeTab === 'playground') {
    return (
      <div className="flex-1 flex flex-col h-full w-full min-h-0 text-[var(--theme-primary)] bg-[var(--theme-surface-alt)] relative">
        {/* Workspace bar header */}
        <div className="px-4 py-3 border-b border-[var(--theme-border)] flex items-center justify-between bg-[var(--theme-surface)]">
          {/* Tab selector */}
          <div className="flex bg-[var(--theme-surface-alt)] p-1 rounded-xl border border-[var(--theme-border)] h-9 items-center">
            <button
              type="button"
              onClick={() => setActiveTab('beaker')}
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg transition-all border border-transparent text-[var(--theme-secondary)] hover:text-[var(--theme-primary)] cursor-pointer"
            >
              <Beaker size={13} />
              <span>Simulated Beaker</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('orbital')}
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg transition-all border border-transparent text-[var(--theme-secondary)] hover:text-[var(--theme-primary)] cursor-pointer"
            >
              <Eye size={13} />
              <span>Structure & Resonance</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('molecules')}
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg transition-all border border-transparent text-[var(--theme-secondary)] hover:text-[var(--theme-primary)] cursor-pointer"
            >
              <BookOpen size={13} />
              <span>Molecules</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('playground')}
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg transition-all border bg-[var(--theme-surface)] border-[var(--theme-border)] text-emerald-600 dark:text-emerald-400 font-extrabold shadow-sm cursor-pointer"
            >
              <Sparkles size={13} />
              <span>Interactive Playground</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
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

        {/* The main full-width playground */}
        <div className="flex-1 min-h-0">
          <PeriodicPlayground />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col md:flex-row h-full w-full min-h-0 text-[var(--theme-primary)]">
      
      {/* LEFT COLUMN: Collapsible Sidebar & Preset trigger cards */}
      <div className="w-full md:w-80 border-b md:border-b-0 md:border-r border-[var(--theme-border)] p-4 flex flex-col gap-4 overflow-y-auto custom-scrollbar shrink-0 bg-[var(--theme-surface)]">
        
        {/* Module title header */}
        <div className="select-none py-1 border-b border-zinc-200/40 dark:border-white/5">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Atom size={18} className="text-emerald-500 animate-spin-slow" />
            <h3 className="font-bold text-sm tracking-tight text-zinc-950 dark:text-white">Chemistry Workspace</h3>
          </div>
          <p className="text-[10.5px] leading-relaxed text-[var(--theme-secondary)]">
            Explore interactive solutions and structural atomic resonance orbitals.
          </p>
        </div>

        {activeTab === 'molecules' ? (
          <div className="flex flex-col gap-3 select-text flex-1 min-h-0">
            <div className="border-b border-[var(--theme-border)]/50 pb-2">
              <div className="flex items-center gap-1.5 mb-1 text-emerald-500 font-bold">
                <BookOpen size={14} className="text-emerald-500" />
                <span className="text-xs font-mono uppercase tracking-wider">Molecule Library</span>
              </div>
              <h4 className="text-xs font-extrabold text-zinc-950 dark:text-white uppercase tracking-tight">Molecular Directory</h4>
              <p className="text-[10px] leading-relaxed text-[var(--theme-secondary)] mt-1">
                Search over 100 chemical compounds. Inspect physical profiles and geometry structures.
              </p>
            </div>

            {/* Search Input Box */}
            <div className="relative shrink-0">
              <input
                type="text"
                placeholder="Search compounds..."
                value={moleculeSearchQuery}
                onChange={e => setMoleculeSearchQuery(e.target.value)}
                className="w-full text-xs p-2.5 pl-8 bg-[var(--theme-surface-alt)] border border-[var(--theme-border)] rounded-xl outline-none focus:ring-1 focus:ring-emerald-500 placeholder-[var(--theme-secondary)] text-[var(--theme-primary)]"
              />
              <Search size={13} className="absolute left-2.5 top-3.5 text-[var(--theme-secondary)]" />
            </div>

            {/* List of matches */}
            <div className="space-y-1.5 flex flex-col flex-1 min-h-0">
              <div className="flex items-center justify-between text-[10px] font-bold text-[var(--theme-secondary)] uppercase tracking-wider select-none shrink-0">
                <span>Constituent Matches ({filteredMolecules.length})</span>
                {moleculeSearchQuery && (
                  <button 
                    onClick={() => setMoleculeSearchQuery('')}
                    className="text-red-500 hover:underline cursor-pointer font-bold lowercase"
                  >
                    clear
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 gap-1 overflow-y-auto custom-scrollbar flex-1 rounded-xl p-1 bg-[var(--theme-surface-alt)]/40 border border-[var(--theme-border)]/50">
                {filteredMolecules.map(mol => {
                  const matchesSelected = selectedMolecule?.name === mol.name;
                  return (
                    <button
                      key={mol.name}
                      onClick={() => setSelectedMolecule(mol)}
                      className={`w-full p-2.5 rounded-lg text-left transition-all cursor-pointer flex items-center justify-between border ${
                        matchesSelected
                          ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-600 dark:text-emerald-400 font-extrabold shadow-sm'
                          : 'border-transparent hover:bg-[var(--theme-hover-bg)] text-[var(--theme-primary)]'
                      }`}
                    >
                      <div className="truncate min-w-0 pr-1.5 flex-1">
                        <div className="text-xs truncate font-bold leading-tight">{mol.name}</div>
                        <div className="text-[9px] text-[var(--theme-secondary)] truncate pt-0.5">{mol.keyProperties}</div>
                      </div>
                      <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono text-[9px] rounded font-extrabold shrink-0 ml-1.5">
                        {mol.formula}
                      </span>
                    </button>
                  );
                })}

                {filteredMolecules.length === 0 && (
                  <div className="p-6 text-center text-[var(--theme-secondary)] text-xs font-mono select-none">
                    No matching database formulas.
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Drop elements direct workspace section */}
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--theme-secondary)] block mb-2 font-mono">Reactant Core Atoms</span>
              <div className="flex flex-wrap gap-1.5 max-w-full">
                {ELEMENTS.slice(0, 5).map(el => (
                  <button
                    key={el.symbol}
                    type="button"
                    onClick={() => {
                      setReactionLog(l => [`Added atomic element molecule ${el.symbol} to active vessel state.`, ...l.slice(0, 6)]);
                      handleReset();
                    }}
                    className="px-2.5 py-1.5 bg-[var(--theme-surface-alt)] hover:bg-[var(--theme-hover-bg)] border border-[var(--theme-border)] rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all"
                  >
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: el.color }} />
                    <span>{el.symbol}</span>
                    <span className="text-[9px] text-[var(--theme-secondary)] font-mono">#{el.atomicNumber}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Dynamic Collapsible Category Sections */}
            <div className="flex-1 space-y-3">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--theme-secondary)] block font-mono">Lab Categories</span>
              
              {/* 1. PHYSICAL CHEMISTRY CATEGORY */}
              <div className="border border-[var(--theme-border)] rounded-2xl overflow-hidden bg-[var(--theme-surface-alt)] shadow-sm">
                <button
                  type="button"
                  onClick={() => toggleCategory('physical')}
                  className="w-full px-3.5 py-2.5 flex items-center justify-between text-xs font-bold text-zinc-800 dark:text-zinc-200 hover:bg-[var(--theme-hover-bg)] transition-colors select-none font-sans"
                >
                  <div className="flex items-center gap-2">
                    <Thermometer size={14} className="text-orange-500" />
                    <span>Physical Chemistry</span>
                  </div>
                  {expandedCategories.physical ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
                
                <AnimatePresence>
                  {expandedCategories.physical && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="px-2 pb-2 space-y-1.5 overflow-hidden"
                    >
                      {REACTION_PRESETS.filter(r => r.category === 'physical').map(preset => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => handleSelectPreset(preset)}
                          className={`w-full p-2.5 rounded-xl text-left text-xs transition-all border flex flex-col gap-1 cursor-pointer ${
                            selectedPreset.id === preset.id
                              ? 'bg-emerald-500/10 border-emerald-555 text-emerald-600 dark:text-emerald-400 font-semibold'
                              : 'bg-[var(--theme-surface)] border-[var(--theme-border)] text-zinc-650 hover:bg-[var(--theme-hover-bg)]'
                          }`}
                        >
                          <span className="font-bold flex items-center justify-between pr-0.5">
                            {preset.name}
                            {selectedPreset.id === preset.id && <Zap size={11} className="text-emerald-500 animate-pulse" />}
                          </span>
                          <span className="text-[10px] font-mono opacity-80">{preset.equation}</span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* 2. INORGANIC CHEMISTRY CATEGORY */}
              <div className="border border-[var(--theme-border)] rounded-2xl overflow-hidden bg-[var(--theme-surface-alt)] shadow-sm">
                <button
                  type="button"
                  onClick={() => toggleCategory('inorganic')}
                  className="w-full px-3.5 py-2.5 flex items-center justify-between text-xs font-bold text-zinc-800 dark:text-zinc-200 hover:bg-[var(--theme-hover-bg)] transition-colors select-none font-sans"
                >
                  <div className="flex items-center gap-2">
                    <Pipette size={14} className="text-blue-500" />
                    <span>Inorganic Chemistry</span>
                  </div>
                  {expandedCategories.inorganic ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
                
                <AnimatePresence>
                  {expandedCategories.inorganic && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="px-2 pb-2 space-y-1.5 overflow-hidden"
                    >
                      {REACTION_PRESETS.filter(r => r.category === 'inorganic').map(preset => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => handleSelectPreset(preset)}
                          className={`w-full p-2.5 rounded-xl text-left text-xs transition-all border flex flex-col gap-1 cursor-pointer ${
                            selectedPreset.id === preset.id
                              ? 'bg-emerald-500/10 border-emerald-555 text-emerald-600 dark:text-emerald-400 font-semibold'
                              : 'bg-[var(--theme-surface)] border-[var(--theme-border)] text-zinc-650 hover:bg-[var(--theme-hover-bg)]'
                          }`}
                        >
                          <span className="font-bold flex items-center justify-between pr-0.5">
                            {preset.name}
                            {selectedPreset.id === preset.id && <Zap size={11} className="text-emerald-500 animate-pulse" />}
                          </span>
                          <span className="text-[10px] font-mono opacity-80">{preset.equation}</span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* 3. ORGANIC CHEMISTRY CATEGORY */}
              <div className="border border-[var(--theme-border)] rounded-2xl overflow-hidden bg-[var(--theme-surface-alt)] shadow-sm">
                <button
                  type="button"
                  onClick={() => toggleCategory('organic')}
                  className="w-full px-3.5 py-2.5 flex items-center justify-between text-xs font-bold text-zinc-800 dark:text-zinc-200 hover:bg-[var(--theme-hover-bg)] transition-colors select-none font-sans"
                >
                  <div className="flex items-center gap-2">
                    <BookOpen size={14} className="text-emerald-500" />
                    <span>Organic & Resonance</span>
                  </div>
                  {expandedCategories.organic ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
                
                <AnimatePresence>
                  {expandedCategories.organic && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="px-2 pb-2 space-y-1.5 overflow-hidden"
                    >
                      {REACTION_PRESETS.filter(r => r.category === 'organic').map(preset => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => handleSelectPreset(preset)}
                          className={`w-full p-2.5 rounded-xl text-left text-xs transition-all border flex flex-col gap-1 cursor-pointer ${
                            selectedPreset.id === preset.id
                              ? 'bg-emerald-500/10 border-emerald-555 text-emerald-600 dark:text-emerald-400 font-semibold'
                              : 'bg-[var(--theme-surface)] border-[var(--theme-border)] text-zinc-650 hover:bg-[var(--theme-hover-bg)]'
                          }`}
                        >
                          <span className="font-bold flex items-center justify-between pr-0.5">
                            {preset.name}
                            {selectedPreset.id === preset.id && <Zap size={11} className="text-emerald-500 animate-pulse" />}
                          </span>
                          <span className="text-[10px] font-mono opacity-80">{preset.equation}</span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </>
        )}

        {/* Solution Accessory controls under slide-panel */}
        {activeTab === 'beaker' && (
          <div className="border-t border-[var(--theme-border)] pt-3.5 space-y-3">
            <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--theme-secondary)] block font-mono">Solution Accessories</span>
            
            {/* Visual Indicators toggle */}
            <div>
              <span className="text-[10.5px] font-medium text-[var(--theme-secondary)] block mb-1">Coloring Indicator type</span>
              <select
                value={indicatorType}
                onChange={e => setIndicatorType(e.target.value as any)}
                className="w-full text-xs p-2 bg-[var(--theme-surface-alt)] border border-[var(--theme-border)] rounded-xl outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="universal">Universal Indicator (pH spectrum colors)</option>
                <option value="phenolphthalein">Phenolphthalein Indicator (pink-to-clear)</option>
                <option value="real">Real Chemistry (Natural solution colors)</option>
              </select>
            </div>

            {/* Heat controls */}
            <div>
              <div className="flex items-center justify-between text-[11px] font-bold font-mono text-[var(--theme-secondary)] mb-1">
                <span>Bunsen burner level</span>
                <span className="text-orange-500 font-bold">{temperature}°C</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                value={temperature}
                onChange={e => setTemperature(Number(e.target.value))}
                className="w-full h-1.5 rounded bg-[var(--theme-border)] appearance-none cursor-pointer accent-orange-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* CENTER COLUMN: Central Laboratory Visualizer & Detailed Bonding Mechanism */}
      <div className="flex-1 flex flex-col min-h-0 bg-[var(--theme-surface-alt)] relative">
        
        {/* Workspace bar header */}
        <div className="px-4 py-3 border-b border-[var(--theme-border)] flex items-center justify-between bg-[var(--theme-surface)]">
          
          {/* Tab selector */}
          <div className="flex bg-[var(--theme-surface-alt)] p-1 rounded-xl border border-[var(--theme-border)] h-9 items-center">
            <button
              type="button"
              onClick={() => setActiveTab('beaker')}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg transition-all border cursor-pointer ${
                activeTab === 'beaker'
                  ? 'bg-[var(--theme-surface)] border-[var(--theme-border)] text-emerald-600 dark:text-emerald-400 font-extrabold shadow-sm'
                  : 'border-transparent text-[var(--theme-secondary)] hover:text-[var(--theme-primary)]'
              }`}
            >
              <Beaker size={13} />
              <span>Simulated Beaker</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('orbital')}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg transition-all border cursor-pointer ${
                activeTab === 'orbital'
                  ? 'bg-[var(--theme-surface)] border-[var(--theme-border)] text-emerald-600 dark:text-emerald-400 font-extrabold shadow-sm'
                  : 'border-transparent text-[var(--theme-secondary)] hover:text-[var(--theme-primary)]'
              }`}
            >
              <Eye size={13} />
              <span>Structure & Resonance</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('molecules')}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg transition-all border cursor-pointer ${
                activeTab === 'molecules'
                  ? 'bg-[var(--theme-surface)] border-[var(--theme-border)] text-emerald-600 dark:text-emerald-400 font-extrabold shadow-sm'
                  : 'border-transparent text-[var(--theme-secondary)] hover:text-[var(--theme-primary)]'
              }`}
            >
              <BookOpen size={13} />
              <span>Molecules</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('playground')}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg transition-all border cursor-pointer ${
                (activeTab as string) === 'playground'
                  ? 'bg-[var(--theme-surface)] border-[var(--theme-border)] text-emerald-600 dark:text-emerald-400 font-extrabold shadow-sm'
                  : 'border-transparent text-[var(--theme-secondary)] hover:text-[var(--theme-primary)]'
              }`}
            >
              <Sparkles size={13} />
              <span>Interactive Playground</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Zoom tool buttons */}
            <div className="flex items-center bg-[var(--theme-surface-alt)] border border-[var(--theme-border)] rounded-xl overflow-hidden h-8">
              <button
                type="button"
                onClick={() => setZoomLevel(prev => Math.max(0.25, Number((prev - 0.25).toFixed(2))))}
                className="h-full px-3 text-[var(--theme-secondary)] hover:text-[var(--theme-primary)] hover:bg-[var(--theme-hover-bg)] border-r border-[var(--theme-border)] transition-all cursor-pointer flex items-center justify-center font-bold text-sm"
              >
                <ZoomOut size={12} />
              </button>
              <div className="px-2.5 font-mono text-[10px] text-[var(--theme-secondary)] select-none font-bold min-w-[48px] text-center">
                {Math.round(zoomLevel * 100)}%
              </div>
              <button
                type="button"
                onClick={() => setZoomLevel(prev => Math.min(3.0, Number((prev + 0.25).toFixed(2))))}
                className="h-full px-3 text-[var(--theme-secondary)] hover:text-[var(--theme-primary)] hover:bg-[var(--theme-hover-bg)] border-l border-[var(--theme-border)] transition-all cursor-pointer flex items-center justify-center font-bold text-sm"
              >
                <ZoomIn size={12} />
              </button>
            </div>

            <button
              type="button"
              onClick={handleReset}
              className="h-8 px-3 text-xs bg-[var(--theme-surface)] border border-[var(--theme-border)] text-[var(--theme-secondary)] hover:text-emerald-500 hover:border-emerald-500/20 rounded-xl transition-all flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw size={13} />
              Reset
            </button>

            {/* Mandatory Close boundary action button trigger! */}
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 bg-[var(--theme-surface-alt)] border border-[var(--theme-border)] text-[var(--theme-secondary)] hover:text-red-500 rounded-xl transition-colors cursor-pointer h-8 w-8 flex items-center justify-center hover:bg-red-555/10 hover:border-red-500"
                title="Exit Laboratory"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Dynamic solution chemistry data HUD panel row */}
        <div className="bg-[var(--theme-surface)] border-b border-[var(--theme-border)]/50 px-4 py-2.5 flex items-center justify-between text-xs font-sans">
          {activeTab === 'molecules' ? (
            <>
              <div className="flex items-center gap-1.5 min-w-0 text-left">
                <span className="text-[var(--theme-secondary)] font-medium">Inspecting Compound:</span>
                <span className="font-mono font-bold text-emerald-500 truncate">
                  {selectedMolecule?.name || 'N/A'} ({selectedMolecule?.formula || ''})
                </span>
              </div>

              <div className="flex items-center gap-3 font-mono font-bold shrink-0">
                <span className="text-[10px] bg-[var(--theme-surface-alt)] px-2 py-0.5 rounded border border-[var(--theme-border)]">
                  Molar Mass: <strong className="text-emerald-500 font-extrabold">{selectedMolecule?.weight || 'N/A'} g/mol</strong>
                </span>
                <span className="text-[10px] bg-[var(--theme-surface-alt)] px-2 py-0.5 rounded border border-[var(--theme-border)]">
                  Shape: <strong className="text-orange-500">{selectedMolecule?.geometry || 'N/A'}</strong>
                </span>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-[var(--theme-secondary)] font-medium">Evaluating Reaction:</span>
                <span className="font-mono font-bold text-emerald-500 truncate">{selectedPreset.equation}</span>
              </div>

              <div className="flex items-center gap-3 font-mono font-bold shrink-0">
                <span className="text-[10px] bg-[var(--theme-surface-alt)] px-2 py-0.5 rounded border border-[var(--theme-border)]">
                  Acid pH: <strong className="text-emerald-500 font-extrabold">{selectedPreset.pH}</strong>
                </span>
                <span className="text-[10px] bg-[var(--theme-surface-alt)] px-2 py-0.5 rounded border border-[var(--theme-border)]">
                  Heat release: <strong className={selectedPreset.energyExothermic ? 'text-orange-500' : 'text-zinc-400'}>
                    {selectedPreset.energyExothermic ? 'Exothermic' : 'Isothermal'}
                  </strong>
                </span>
              </div>
            </>
          )}
        </div>

        {/* Interactive canvas viewport */}
        <div className="flex-1 min-h-0 flex items-center justify-center p-4 relative">
          <canvas
            ref={canvasRef}
            width={400}
            height={340}
            className="w-full max-w-[400px] h-[340px] border border-transparent rounded-2xl"
          />

          {/* Active Beaker visual elements HUD card overlay */}
          {activeTab === 'beaker' && (
            <div className="absolute top-4 left-4 bg-[var(--theme-surface)]/85 backdrop-blur-md border border-[var(--theme-border)] rounded-2xl p-3.5 space-y-1.5 w-44 shadow-md max-w-full text-[10.5px]">
              <span className="text-[9.5px] font-bold font-mono uppercase text-[var(--theme-secondary)] tracking-wider block">Solution Indicators</span>
              <div className="h-[1.5px] bg-zinc-200/40 dark:bg-white/5 w-full my-0.5" />
              
              <div className="flex items-center justify-between">
                <span className="text-[var(--theme-secondary)]">Indicator:</span>
                <span className="font-bold text-emerald-500 uppercase text-[9px] font-mono">{indicatorType}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--theme-secondary)]">Solution State:</span>
                <span className="font-bold text-zinc-800 dark:text-zinc-200">
                  {selectedPreset.pH < 7 ? 'Acidic' : selectedPreset.pH > 7 ? 'Alkaline' : 'Neutral'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* BOTTOM ANALYSIS BAR (Name info structures, IUPAC details, step-by-step valence progress) */}
        <div className="p-4 border-t border-[var(--theme-border)] bg-[var(--theme-surface)] space-y-3 shrink-0">
          
          {/* Molecular hybridization description notes container */}
          {activeTab === 'molecules' ? (
            <div className="p-3.5 bg-emerald-500/[0.03] border border-emerald-500/10 rounded-2xl select-text text-left flex flex-col gap-3">
              <div className="flex flex-wrap items-start justify-between gap-1.5 border-b border-[var(--theme-border)]/50 pb-2">
                <div className="min-w-0 flex-1">
                  <h5 className="text-sm font-black text-zinc-950 dark:text-white truncate">
                    {selectedMolecule?.name}
                  </h5>
                  <span className="text-[10px] text-[var(--theme-secondary)] font-medium block pr-1">
                    {selectedMolecule?.keyProperties}
                  </span>
                </div>
                <div className="flex flex-col items-end shrink-0 select-none">
                  <span className="px-1.5 py-0.5 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-mono text-[9.5px] font-black rounded-md">
                    {selectedMolecule?.formula}
                  </span>
                  <span className="text-[8.5px] font-mono text-zinc-400 dark:text-zinc-500 mt-1">{selectedMolecule?.weight} g/mol</span>
                </div>
              </div>

              {/* Ascii illustration schema if exists */}
              {selectedMolecule?.structureAscii && (
                <div className="bg-zinc-950 text-emerald-400 font-mono text-[9.5px] p-2.5 rounded-xl border border-zinc-900 leading-normal select-all whitespace-pre text-center flex flex-col items-center justify-center overflow-x-auto custom-scrollbar select-all">
                  {selectedMolecule.structureAscii}
                </div>
              )}

              {/* Key Properties Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[9px] font-mono select-none">
                <div className="p-1 px-2 bg-[var(--theme-surface-alt)] border border-[var(--theme-border)]/50 rounded-lg flex flex-col">
                  <span className="text-[7.5px] uppercase font-bold text-zinc-400 dark:text-zinc-500 font-sans tracking-wide">Shape</span>
                  <span className="text-zinc-800 dark:text-zinc-200 font-bold truncate mt-0.5">{selectedMolecule?.geometry}</span>
                </div>
                <div className="p-1 px-2 bg-[var(--theme-surface-alt)] border border-[var(--theme-border)]/50 rounded-lg flex flex-col">
                  <span className="text-[7.5px] uppercase font-bold text-zinc-400 dark:text-zinc-500 font-sans tracking-wide">Hybrid</span>
                  <span className="text-zinc-800 dark:text-zinc-200 font-bold truncate mt-0.5">{selectedMolecule?.hybridization}</span>
                </div>
                <div className="p-1 px-2 bg-[var(--theme-surface-alt)] border border-[var(--theme-border)]/50 rounded-lg flex flex-col">
                  <span className="text-[7.5px] uppercase font-bold text-zinc-400 dark:text-zinc-500 font-sans tracking-wide">Polarity</span>
                  <span className="text-zinc-800 dark:text-zinc-200 font-bold truncate mt-0.5">{selectedMolecule?.polarity}</span>
                </div>
                <div className="p-1 px-2 bg-[var(--theme-surface-alt)] border border-[var(--theme-border)]/50 rounded-lg flex flex-col">
                  <span className="text-[7.5px] uppercase font-bold text-zinc-400 dark:text-zinc-500 font-sans tracking-wide">BP / MP</span>
                  <span className="text-zinc-800 dark:text-zinc-200 font-bold truncate mt-0.5" title={`${selectedMolecule?.boilingPoint || 'N/A'} (bp) / ${selectedMolecule?.meltingPoint || 'N/A'} (mp)`}>
                    {selectedMolecule?.boilingPoint || 'N/A'}
                  </span>
                </div>
              </div>

              <div className="text-[10.5px] leading-relaxed text-[var(--theme-secondary)] border-t border-[var(--theme-border)]/45 pt-2">
                <strong>Chemical Profile:</strong> {selectedMolecule?.description}
              </div>

              {/* Deploy directly to Sandbox! */}
              {selectedMolecule?.spawnData && (
                <div className="border-t border-[var(--theme-border)]/30 pt-2 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedMolecule) {
                        localStorage.setItem('preload_sandbox_molecule', selectedMolecule.formula);
                      }
                      setActiveTab('playground');
                    }}
                    className="py-1.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-[10.5px] font-extrabold rounded-xl cursor-pointer flex items-center justify-center gap-1.5 transition-all shadow-sm border border-emerald-500/20"
                  >
                    <Sparkles size={11} className="text-white fill-emerald-200" />
                    <span>Instantiate Compound model inside Sandbox</span>
                  </button>
                </div>
              )}
            </div>
          ) : activeTab === 'orbital' ? (
            <div className="p-3.5 bg-emerald-555/[0.03] border border-emerald-500/10 rounded-2xl space-y-1.5 select-text text-left">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono font-bold text-[10.5px] rounded-md">
                  IUPAC Name: {selectedPreset.iupacName || selectedPreset.formula}
                </span>
                
                {selectedPreset.hybridization && (
                  <span className="px-2 py-0.5 bg-orange-500/10 text-orange-600 dark:text-orange-400 font-mono font-bold text-[10.5px] rounded-md">
                    Hybridization: {selectedPreset.hybridization}
                  </span>
                )}
              </div>

              {selectedPreset.resonanceInfo && (
                <p className="text-[11.5px] leading-relaxed font-medium text-[var(--theme-secondary)] border-l-2 border-emerald-500 pl-2">
                  <strong>Resonance Hybrid:</strong> {selectedPreset.resonanceInfo}
                </p>
              )}
              
              <p className="text-[11px] leading-relaxed text-[var(--theme-secondary)]">
                {selectedPreset.description}
              </p>
            </div>
          ) : (
            <div className="p-3.5 bg-[var(--theme-surface-alt)] border border-[var(--theme-border)] rounded-2xl select-text text-left">
              <span className="text-[9.5px] uppercase font-bold tracking-wider text-[var(--theme-secondary)] font-mono block mb-1">Thermodynamic Analysis</span>
              <p className="text-[11.5px] leading-relaxed text-[var(--theme-secondary)]">
                {selectedPreset.description}
              </p>
            </div>
          )}

          {/* Interactive Bonding Valence step trigger mechanism details */}
          {activeTab === 'orbital' && (
            <div className="p-3.5 bg-zinc-500/[0.02] dark:bg-zinc-400/[0.02] border border-zinc-250/20 dark:border-white/5 rounded-2xl space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="text-left">
                  <div className="text-[9.5px] uppercase font-bold tracking-wider text-emerald-500 flex items-center gap-1">
                    <Sparkles size={11} className="animate-pulse" />
                    Valence Bonding Mechanism Step {bondingStepIdx + 1} of {selectedPreset.bondingMechanism.steps.length}
                  </div>
                  <h4 className="text-xs font-extrabold text-zinc-950 dark:text-white mt-0.5">
                    {selectedPreset.bondingMechanism.steps[bondingStepIdx]?.title}
                  </h4>
                </div>

                {/* Simulated playback controls */}
                <div className="flex items-center gap-1.5 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setIsAnimatingBond(!isAnimatingBond)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg cursor-pointer text-[10px] flex items-center gap-1 transition-all h-8"
                  >
                    <Play size={11} className={isAnimatingBond ? 'animate-spin-slow text-yellow-300' : ''} />
                    <span>{isAnimatingBond ? 'Pause Slider' : 'Autoplay'}</span>
                  </button>

                  <div className="flex items-center border border-[var(--theme-border)] bg-[var(--theme-surface)] rounded-lg overflow-hidden h-8">
                    {selectedPreset.bondingMechanism.steps.map((_, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setBondingStepIdx(idx);
                          setIsAnimatingBond(false);
                        }}
                        className={`px-2.5 h-full text-[10.5px] font-mono font-bold transition-colors cursor-pointer ${
                          bondingStepIdx === idx
                            ? 'bg-emerald-500 text-white'
                            : 'bg-transparent text-[var(--theme-secondary)] hover:bg-[var(--theme-hover-bg)]'
                        }`}
                      >
                        {idx + 1}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <p className="text-[11px] leading-relaxed text-[var(--theme-secondary)] text-left font-sans select-text">
                {selectedPreset.bondingMechanism.steps[bondingStepIdx]?.desc}
              </p>
            </div>
          )}

          {/* Activity terminal logs */}
          <div className="space-y-1 bg-[var(--theme-surface-alt)] border border-[var(--theme-border)] rounded-2xl p-3 h-20 overflow-y-auto custom-scrollbar font-mono text-[10px] leading-relaxed text-left text-[var(--theme-secondary)] shadow-inner">
            {reactionLog.map((log, index) => (
              <div key={index} className="first:text-[var(--theme-primary)] first:font-extrabold flex items-start gap-1">
                <span className="text-emerald-500 shrink-0">➔</span>
                <span className="select-all">{log}</span>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
};
