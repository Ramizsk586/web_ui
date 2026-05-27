import React, { useState, useEffect, useRef } from 'react';
import {
  X, ZoomIn, ZoomOut, Play, Pause, RotateCcw, Flower2, RefreshCw, LineChart,
  Activity, Sliders, Heart, Wind, Droplets, Zap, Globe, Box, Orbit,
  Bug, Atom, Cloud, Brain, CircleDot, Microscope, Waves, Filter,
  Sigma, Eye, EyeOff, Grid3x3, Layers, Compass, ChevronRight, Biohazard,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

/* ============================================================
   TYPES
   ============================================================ */
interface Actor {
  id: number; type: 'rabbit' | 'wolf';
  x: number; y: number; vx: number; vy: number; energy: number;
}

type BioCategory = 'ecology' | 'anatomy' | 'cellular' | 'environment' | 'molecular';
type BioTab =
  | 'ecosystem' | 'epidemic'
  | 'heart' | 'respiratory' | 'neuron'
  | 'mitosis' | 'bacteria'
  | 'enzyme' | 'dna'
  | 'sewage' | 'watercycle';

type ViewMode = 'sim' | '3d';

/* ============================================================
   CATEGORY + TAB METADATA
   ============================================================ */
const CATEGORIES: {
  id: BioCategory | 'all' | '3d';
  label: string; icon: React.ReactNode; color: string; desc: string;
}[] = [
  { id: 'all',         label: 'All Labs',    icon: <Layers size={12}/>,      color: 'text-zinc-400',   desc: 'Browse every simulation' },
  { id: 'ecology',     label: 'Ecology',     icon: <Flower2 size={12}/>,     color: 'text-emerald-400',desc: 'Populations & ecosystems' },
  { id: 'anatomy',     label: 'Anatomy',     icon: <Heart size={12}/>,       color: 'text-rose-400',   desc: 'Organ systems' },
  { id: 'cellular',    label: 'Cellular',    icon: <CircleDot size={12}/>,   color: 'text-purple-400', desc: 'Cells & microbes' },
  { id: 'environment', label: 'Environment', icon: <Cloud size={12}/>,       color: 'text-sky-400',    desc: 'Earth systems' },
  { id: 'molecular',   label: 'Molecular',   icon: <Atom size={12}/>,        color: 'text-amber-400',  desc: 'Molecules & reactions' },
  { id: '3d',          label: '3D Bio Lab',  icon: <Box size={12}/>,         color: 'text-fuchsia-400',desc: '3D biomolecular viewer' },
];

const TABS: {
  id: BioTab; label: string; category: BioCategory;
  icon: React.ReactNode; color: string; subtitle: string;
}[] = [
  { id: 'ecosystem',   label: 'Grassland Ecosystem',     category: 'ecology',     icon: <Flower2 size={12}/>,   color: 'text-emerald-500', subtitle: 'Lotka–Volterra predator–prey' },
  { id: 'epidemic',    label: 'SIR Epidemic Model',      category: 'ecology',     icon: <Biohazard size={12}/>,     color: 'text-red-500',     subtitle: 'Disease transmission dynamics' },
  { id: 'heart',       label: 'Heart Circulatory',       category: 'anatomy',     icon: <Heart size={12}/>,     color: 'text-rose-500',    subtitle: 'Cardiac blood flow' },
  { id: 'respiratory', label: 'Respiratory Gas Cycle',   category: 'anatomy',     icon: <Wind size={12}/>,      color: 'text-sky-500',     subtitle: 'O₂ / CO₂ exchange' },
  { id: 'neuron',      label: 'Neuron Action Potential', category: 'anatomy',     icon: <Zap size={12}/>,       color: 'text-yellow-500',  subtitle: 'Voltage-gated ion channels' },
  { id: 'mitosis',     label: 'Cell Mitosis',            category: 'cellular',    icon: <CircleDot size={12}/>, color: 'text-purple-500',  subtitle: 'PMAT cell division stages' },
  { id: 'bacteria',    label: 'Bacterial Colony',        category: 'cellular',    icon: <Bug size={12}/>,       color: 'text-lime-500',    subtitle: 'Logistic growth in a petri dish' },
  { id: 'enzyme',      label: 'Enzyme Kinetics',         category: 'molecular',   icon: <Atom size={12}/>,      color: 'text-amber-500',   subtitle: 'Michaelis–Menten reaction' },
  { id: 'dna',         label: 'DNA Double Helix',        category: 'molecular',   icon: <Globe size={12}/>,     color: 'text-blue-500',    subtitle: 'Base-pair genome strand' },
  { id: 'sewage',      label: 'Sewage Purification',     category: 'environment', icon: <Droplets size={12}/>,  color: 'text-amber-600',   subtitle: '4-stage water treatment' },
  { id: 'watercycle',  label: 'Water Cycle',             category: 'environment', icon: <Cloud size={12}/>,     color: 'text-cyan-500',    subtitle: 'Evaporation → rain → runoff' },
];

/* ============================================================
   3D BIO SHAPE PRESETS
   build(a,b,c,res) => array of line segments [p1, p2]
   ============================================================ */
interface Bio3DShape {
  id: string; name: string; description: string;
  build: (a: number, b: number, c: number, res: number) => [number, number, number][][];
}

const BIO_3D_SHAPES: Bio3DShape[] = [
  {
    id: 'dna3d', name: 'DNA Double Helix',
    description: 'Two antiparallel sugar-phosphate backbones with base-pair rungs',
    build: (a, b, _c, res) => {
      const R = a * 0.6, pitch = b * 0.8, turns = 3;
      const segs: [number,number,number][][] = [];
      const N = Math.max(80, Math.floor(res * 4));
      const H = turns * pitch * 2;
      const strand1: [number,number,number][] = [];
      const strand2: [number,number,number][] = [];
      for (let i = 0; i <= N; i++) {
        const t = (i / N) * turns * Math.PI * 2;
        const y = (i / N) * H - H / 2;
        strand1.push([R * Math.cos(t), y, R * Math.sin(t)]);
        strand2.push([R * Math.cos(t + Math.PI), y, R * Math.sin(t + Math.PI)]);
      }
      for (let i = 0; i < N; i++) {
        segs.push([strand1[i], strand1[i+1]]);
        segs.push([strand2[i], strand2[i+1]]);
      }
      // base-pair rungs every ~10 steps
      const rungGap = Math.max(2, Math.floor(N / (turns * 10)));
      for (let i = 0; i < N; i += rungGap) {
        segs.push([strand1[i], strand2[i]]);
      }
      return segs;
    }
  },
  {
    id: 'alpha', name: 'Alpha Helix Protein',
    description: 'Right-handed coiled polypeptide backbone (secondary structure)',
    build: (a, b, _c, res) => {
      const R = a * 0.4, rise = b * 0.25, turns = 5;
      const segs: [number,number,number][][] = [];
      const N = Math.max(120, Math.floor(res * 5));
      const H = turns * rise * 3.6 * 2;
      const pts: [number,number,number][] = [];
      for (let i = 0; i <= N; i++) {
        const t = (i / N) * turns * Math.PI * 2;
        const y = (i / N) * H - H / 2;
        pts.push([R * Math.cos(t), y, R * Math.sin(t)]);
      }
      for (let i = 0; i < N; i++) segs.push([pts[i], pts[i+1]]);
      // hydrogen bonds (every 4 residues ≈ every 4/N-th of a turn)
      const hbGap = Math.max(4, Math.floor(N / (turns * 3.6)));
      for (let i = 0; i + hbGap * 4 < N; i += hbGap) {
        segs.push([pts[i], pts[i + hbGap * 4]]);
      }
      return segs;
    }
  },
  {
    id: 'virus', name: 'Icosahedral Virus Capsid',
    description: '20-face capsid shell with glycoprotein spike proteins',
    build: (a, _b, _c, _res) => {
      const R = a * 1.2;
      const segs: [number,number,number][][] = [];
      const phi = (1 + Math.sqrt(5)) / 2;
      const raw: [number,number,number][] = [
        [-1, phi, 0], [1, phi, 0], [-1, -phi, 0], [1, -phi, 0],
        [0, -1, phi], [0, 1, phi], [0, -1, -phi], [0, 1, -phi],
        [phi, 0, -1], [phi, 0, 1], [-phi, 0, -1], [-phi, 0, 1]
      ];
      const verts = raw.map(v => {
        const l = Math.hypot(v[0], v[1], v[2]);
        return [v[0]/l*R, v[1]/l*R, v[2]/l*R] as [number,number,number];
      });
      const faces: number[][] = [
        [0,11,5],[0,5,1],[0,1,7],[0,7,10],[0,10,11],
        [1,5,9],[5,11,4],[11,10,2],[10,7,6],[7,1,8],
        [3,9,4],[3,4,2],[3,2,6],[3,6,8],[3,8,9],
        [4,9,5],[2,4,11],[6,2,10],[8,6,7],[9,8,1]
      ];
      faces.forEach(f => {
        segs.push([verts[f[0]], verts[f[1]]]);
        segs.push([verts[f[1]], verts[f[2]]]);
        segs.push([verts[f[2]], verts[f[0]]]);
        // spike protein from face centroid
        const cx = (verts[f[0]][0]+verts[f[1]][0]+verts[f[2]][0])/3;
        const cy = (verts[f[0]][1]+verts[f[1]][1]+verts[f[2]][1])/3;
        const cz = (verts[f[0]][2]+verts[f[1]][2]+verts[f[2]][2])/3;
        const cl = Math.hypot(cx,cy,cz) || 1;
        const spike: [number,number,number] = [cx/cl*R*1.35, cy/cl*R*1.35, cz/cl*R*1.35];
        const centroid: [number,number,number] = [cx, cy, cz];
        segs.push([centroid, spike]);
      });
      return segs;
    }
  },
  {
    id: 'bilayer', name: 'Phospholipid Bilayer',
    description: 'Cell membrane — hydrophilic heads outward, hydrophobic tails inward',
    build: (a, b, _c, res) => {
      const segs: [number,number,number][][] = [];
      const W = a * 2, D = b * 2;
      const nX = Math.max(4, Math.floor(res * 0.4));
      const nZ = Math.max(4, Math.floor(res * 0.4));
      const gap = 0.55;
      for (let i = 0; i < nX; i++) {
        for (let j = 0; j < nZ; j++) {
          const x = (i / (nX-1) - 0.5) * W;
          const z = (j / (nZ-1) - 0.5) * D;
          // top layer: head at +gap, tails down
          segs.push([[x, gap, z], [x, gap - 0.4, z]]);
          segs.push([[x, gap - 0.4, z], [x + 0.05, gap - 0.8, z]]);
          segs.push([[x, gap - 0.4, z], [x - 0.05, gap - 0.8, z]]);
          // bottom layer (flipped)
          segs.push([[x, -gap, z], [x, -gap + 0.4, z]]);
          segs.push([[x, -gap + 0.4, z], [x + 0.05, -gap + 0.8, z]]);
          segs.push([[x, -gap + 0.4, z], [x - 0.05, -gap + 0.8, z]]);
        }
      }
      return segs;
    }
  },
  {
    id: 'rbc', name: 'Red Blood Cell',
    description: 'Biconcave disc — torus-like with central dimple for gas exchange',
    build: (a, b, _c, res) => {
      const R = a, depth = b * 0.3;
      const segs: [number,number,number][][] = [];
      const uN = Math.max(24, Math.floor(res * 1.2));
      const vN = Math.max(12, Math.floor(res * 0.6));
      const pts: [number,number,number][][] = [];
      for (let i = 0; i <= uN; i++) {
        const row: [number,number,number][] = [];
        const u = (i / uN) * Math.PI * 2;
        for (let j = 0; j <= vN; j++) {
          const v = (j / vN) * Math.PI * 2;
          const rr = R + 0.35 * Math.cos(v);
          const yy = 0.35 * Math.sin(v) - depth * Math.cos(v) * 0.5;
          row.push([rr * Math.cos(u), yy, rr * Math.sin(u)]);
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
    id: 'neuron3d', name: 'Neuron Cell',
    description: 'Soma with branching dendrites and long myelinated axon',
    build: (a, b, c, res) => {
      const segs: [number,number,number][][] = [];
      const somaR = a * 0.4;
      // soma sphere (low-res)
      const sN = Math.max(8, Math.floor(res * 0.3));
      for (let i = 0; i < sN; i++) {
        const u1 = (i / sN) * Math.PI * 2;
        const u2 = ((i+1) / sN) * Math.PI * 2;
        segs.push([[somaR*Math.cos(u1), somaR*Math.sin(u1), 0],
                   [somaR*Math.cos(u2), somaR*Math.sin(u2), 0]]);
        segs.push([[somaR*Math.cos(u1), 0, somaR*Math.sin(u1)],
                   [somaR*Math.cos(u2), 0, somaR*Math.sin(u2)]]);
        segs.push([[0, somaR*Math.cos(u1), somaR*Math.sin(u1)],
                   [0, somaR*Math.cos(u2), somaR*Math.sin(u2)]]);
      }
      // dendrites (7 branches in different directions)
      const dendN = 7;
      for (let d = 0; d < dendN; d++) {
        const ang = (d / dendN) * Math.PI * 2;
        const elev = (Math.random() - 0.5) * 1.2;
        const len = a * 1.4;
        const start: [number,number,number] = [somaR*Math.cos(ang), elev*somaR, somaR*Math.sin(ang)];
        const end: [number,number,number] = [
          (somaR + len) * Math.cos(ang),
          elev * (somaR + len*0.4),
          (somaR + len) * Math.sin(ang)
        ];
        segs.push([start, end]);
        // small sub-branches
        const subLen = len * 0.4;
        for (let k = 0; k < 3; k++) {
          const t = 0.5 + k * 0.18;
          const mid: [number,number,number] = [
            start[0] + (end[0]-start[0]) * t,
            start[1] + (end[1]-start[1]) * t,
            start[2] + (end[2]-start[2]) * t
          ];
          const off = (k - 1) * 0.4;
          segs.push([mid, [mid[0] + off*Math.cos(ang+1), mid[1]+subLen*0.3, mid[2] + off*Math.sin(ang+1)]]);
        }
      }
      // axon going in +X direction, with myelin sheath segments
      const axonLen = b * 3;
      const myelinN = Math.max(4, Math.floor(c * 3));
      const axonStart: [number,number,number] = [somaR, 0, 0];
      const axonEnd: [number,number,number] = [somaR + axonLen, 0, 0];
      segs.push([axonStart, axonEnd]);
      // myelin sheath rings along axon
      for (let m = 0; m < myelinN; m++) {
        const t = (m + 0.5) / myelinN;
        const mx = axonStart[0] + (axonEnd[0] - axonStart[0]) * t;
        const mr = somaR * 0.6;
        for (let k = 0; k < 8; k++) {
          const a1 = (k/8) * Math.PI * 2;
          const a2 = ((k+1)/8) * Math.PI * 2;
          segs.push([
            [mx + 0.2*Math.cos(a1), mr*Math.sin(a1), mr*Math.cos(a1)],
            [mx + 0.2*Math.cos(a2), mr*Math.sin(a2), mr*Math.cos(a2)]
          ]);
        }
      }
      // axon terminals
      for (let t = 0; t < 4; t++) {
        const ang = (t / 4) * Math.PI * 2;
        segs.push([axonEnd, [
          axonEnd[0] + 0.4,
          0.3 * Math.sin(ang),
          0.3 * Math.cos(ang)
        ]]);
      }
      return segs;
    }
  },
];

/* ============================================================
   3D PROJECTION
   ============================================================ */
const project3D = (
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
export const BiologyLabCanvas: React.FC<{
  onClose?: () => void; isInline?: boolean;
}> = ({ onClose, isInline = true }) => {
  // ---- mode & tab ----
  const [viewMode, setViewMode] = useState<ViewMode>('sim');
  const [activeTab, setActiveTab] = useState<BioTab>('ecosystem');
  const [activeCategory, setActiveCategory] = useState<BioCategory | 'all'>('all');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [animating, setAnimating] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(1.0);

  // === TAB 1: ECOSYSTEM ===
  const [rabbitBirthRate, setRabbitBirthRate] = useState(0.08);
  const [wolfDeathRate, setWolfDeathRate] = useState(0.04);
  const [huntingEfficiency, setHuntingEfficiency] = useState(0.012);
  const [ecosystemCarryingCapacity, setEcosystemCarryingCapacity] = useState(180);
  const [actors, setActors] = useState<Actor[]>([]);
  const [populationHistory, setPopulationHistory] = useState<{rabbits:number;wolves:number}[]>([]);
  const idCounter = useRef(0);

  // === TAB 2: HEART ===
  const [bpm, setBpm] = useState(75);
  const [adrenalineActive, setAdrenalineActive] = useState(false);
  const [showDeox, setShowDeox] = useState(true);
  const [showOx, setShowOx] = useState(true);
  const heartParticles = useRef<{x:number;y:number;progress:number;type:'deox'|'ox';speed:number}[]>([]);

  // === TAB 3: RESPIRATORY ===
  const [respiratoryMode, setRespiratoryMode] = useState<'global'|'capillary'>('global');
  const [respirationRate, setRespirationRate] = useState(16);
  const [pollutionSpike, setPollutionSpike] = useState(0);
  const [photosynthesisSpeed, setPhotosynthesisSpeed] = useState(50);
  const gasParticles = useRef<{x:number;y:number;vx:number;vy:number;type:'O2'|'CO2'|'sun'|'vapor'|'drop';radius:number;alpha:number}[]>([]);
  const bloodCells = useRef<{x:number;y:number;oxygen:number;originalX:number}[]>([]);

  // === TAB 4: SEWAGE ===
  const [sewageSpeed, setSewageSpeed] = useState(1.0);
  const [aerationPower, setAerationPower] = useState(60);
  const [sewageOrganicLoad, setSewageOrganicLoad] = useState(25);
  const sewageParticles = useRef<{x:number;y:number;vx:number;vy:number;type:'water'|'grit'|'bubble'|'bacteria';radius:number;color:string}[]>([]);

  // === TAB 5: DNA ===
  const [dnaChain, setDnaChain] = useState<string[]>(['A','T','G','C','C','A','T','G','G','T','A','C']);

  // === TAB 6: NEURON ACTION POTENTIAL ===
  const [neuronStimulus, setNeuronStimulus] = useState(0); // 0–1
  const [neuronMyelin, setNeuronMyelin] = useState(true);
  const [apTime, setApTime] = useState(0); // ms, 0–5
  const neuronFiredRef = useRef(false);

  // === TAB 7: MITOSIS ===
  const [mitosisStage, setMitosisStage] = useState(0); // 0..4 (inter, pro, meta, ana, telo)
  const [mitosisSpeed, setMitosisSpeed] = useState(1);

  // === TAB 8: BACTERIA ===
  const [bacteriaRate, setBacteriaRate] = useState(0.6);
  const [bacteriaCapacity, setBacteriaCapacity] = useState(180);
  const [bacteriaCount, setBacteriaCount] = useState(4);
  const [bacteriaHistory, setBacteriaHistory] = useState<number[]>([4]);
  const bacteriaPos = useRef<{x:number;y:number;r:number;age:number}[]>([]);

  // === TAB 9: ENZYME KINETICS ===
  const [substrateConc, setSubstrateConc] = useState(30);
  const [vmax, setVmax] = useState(100);
  const [km, setKm] = useState(20);
  const enzymeSubstrates = useRef<{x:number;y:number;vx:number;vy:number;bound:boolean;product:boolean;life:number}[]>([]);

  // === TAB 10: EPIDEMIC SIR ===
  const [sirBeta, setSirBeta] = useState(0.35);
  const [sirGamma, setSirGamma] = useState(0.1);
  const [sirActors, setSirActors] = useState<{id:number;x:number;y:number;vx:number;vy:number;state:'S'|'I'|'R';t:number}[]>([]);
  const [sirHistory, setSirHistory] = useState<{S:number;I:number;R:number}[]>([]);
  const sirIdRef = useRef(0);

  // === TAB 11: WATER CYCLE ===
  const [waterTemp, setWaterTemp] = useState(22);
  const [waterHumidity, setWaterHumidity] = useState(60);
  const waterParticles = useRef<{x:number;y:number;vx:number;vy:number;type:'vapor'|'cloud'|'rain'|'river';life:number}[]>([]);

  // === 3D MODE ===
  const [shape3D, setShape3D] = useState<Bio3DShape>(BIO_3D_SHAPES[0]);
  const [rotX3D, setRotX3D] = useState(-0.4);
  const [rotY3D, setRotY3D] = useState(0.6);
  const [zoom3D, setZoom3D] = useState(70);
  const [p3A, setP3A] = useState(2.0);
  const [p3B, setP3B] = useState(1.0);
  const [p3C, setP3C] = useState(2.0);
  const [p3Res, setP3Res] = useState(24);
  const [autoRotate, setAutoRotate] = useState(false);
  const [showWireframe, setShowWireframe] = useState(true);
  const [showFloor, setShowFloor] = useState(true);
  const [showAxes3D, setShowAxes3D] = useState(true);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dragRef = useRef<{x:number;y:number;rx:number;ry:number}|null>(null);

  /* ---------- Filtered tabs ---------- */
  const filteredTabs = activeCategory === 'all' ? TABS : TABS.filter(t => t.category === activeCategory);

  /* ---------- Initializers ---------- */
  const initializeEcosystem = () => {
    const list: Actor[] = [];
    idCounter.current = 0;
    for (let i = 0; i < 40; i++) list.push({ id: idCounter.current++, type:'rabbit', x:Math.random()*280+20, y:Math.random()*220+20, vx:(Math.random()-0.5)*5, vy:(Math.random()-0.5)*5, energy:100 });
    for (let i = 0; i < 7; i++) list.push({ id: idCounter.current++, type:'wolf', x:Math.random()*280+20, y:Math.random()*220+20, vx:(Math.random()-0.5)*4, vy:(Math.random()-0.5)*4, energy:120 });
    setActors(list);
    setPopulationHistory([{rabbits:40,wolves:7}]);
  };

  const initializeSIR = () => {
    const list: {id:number;x:number;y:number;vx:number;vy:number;state:'S'|'I'|'R';t:number}[] = [];
    sirIdRef.current = 0;
    const N = 80;
    for (let i = 0; i < N; i++) {
      list.push({
        id: sirIdRef.current++,
        x: Math.random() * 300 + 20, y: Math.random() * 220 + 20,
        vx: (Math.random()-0.5) * 2, vy: (Math.random()-0.5) * 2,
        state: i < 3 ? 'I' : 'S', t: 0
      });
    }
    setSirActors(list);
    setSirHistory([{S: N-3, I: 3, R: 0}]);
  };

  const initializeBacteria = () => {
    bacteriaPos.current = [];
    for (let i = 0; i < 4; i++) {
      bacteriaPos.current.push({
        x: 170 + (Math.random()-0.5)*20, y: 130 + (Math.random()-0.5)*20,
        r: 2, age: 0
      });
    }
    setBacteriaCount(4);
    setBacteriaHistory([4]);
  };

  useEffect(() => {
    if (activeTab === 'ecosystem' && actors.length === 0) initializeEcosystem();
    if (activeTab === 'epidemic' && sirActors.length === 0) initializeSIR();
    if (activeTab === 'bacteria' && bacteriaPos.current.length === 0) initializeBacteria();
  }, [activeTab]);

  /* ---------- Ecosystem loop ---------- */
  useEffect(() => {
    if (!animating || activeTab !== 'ecosystem') return;
    let animId: number;
    const gameTick = () => {
      setActors(prev => {
        const rabbits = prev.filter(a => a.type === 'rabbit');
        const wolves = prev.filter(a => a.type === 'wolf');
        let nextRabbits = [...rabbits];
        let nextWolves = [...wolves];
        if (rabbits.length > 2 && rabbits.length < ecosystemCarryingCapacity && Math.random() < rabbitBirthRate) {
          const parent = rabbits[Math.floor(Math.random()*rabbits.length)];
          nextRabbits.push({ id: idCounter.current++, type:'rabbit', x:Math.max(10,Math.min(310,parent.x+(Math.random()-0.5)*15)), y:Math.max(10,Math.min(250,parent.y+(Math.random()-0.5)*15)), vx:(Math.random()-0.5)*5, vy:(Math.random()-0.5)*5, energy:100 });
        }
        nextWolves = nextWolves.map(wolf => {
          let closest: Actor|null = null, minD = 99999;
          nextRabbits.forEach(r => { const d = Math.hypot(r.x-wolf.x,r.y-wolf.y); if (d<minD){minD=d;closest=r;} });
          let nvx = wolf.vx, nvy = wolf.vy;
          if (closest) {
            const t = closest as Actor;
            const dx = t.x - wolf.x, dy = t.y - wolf.y;
            nvx += (dx/minD)*0.18; nvy += (dy/minD)*0.18;
            const sp = Math.hypot(nvx,nvy)||1;
            nvx = nvx/sp*3.5; nvy = nvy/sp*3.5;
          }
          return { ...wolf, vx:nvx, vy:nvy, energy: wolf.energy - wolfDeathRate*18 };
        }).filter(w => w.energy > 0);
        const survivors: Actor[] = [];
        nextRabbits.forEach(r => {
          let eaten = false;
          nextWolves.forEach(w => { if (Math.hypot(r.x-w.x,r.y-w.y) < 18 && Math.random() < huntingEfficiency*15) { eaten=true; w.energy = Math.min(200, w.energy+60);} });
          if (!eaten) survivors.push(r);
        });
        const breedingW: Actor[] = [];
        nextWolves.forEach(w => {
          breedingW.push(w);
          if (w.energy > 165 && Math.random() < 0.05) {
            w.energy = 90;
            breedingW.push({ id:idCounter.current++, type:'wolf', x:Math.max(10,Math.min(310,w.x+(Math.random()-0.5)*10)), y:Math.max(10,Math.min(250,w.y+(Math.random()-0.5)*10)), vx:(Math.random()-0.5)*4, vy:(Math.random()-0.5)*4, energy:100 });
          }
        });
        return [...survivors, ...breedingW].map(p => {
          let nx = p.x + p.vx, ny = p.y + p.vy, nvx=p.vx, nvy=p.vy;
          if (nx<8||nx>312){ nvx=-p.vx; nx=Math.max(8,Math.min(312,nx)); }
          if (ny<8||ny>252){ nvy=-p.vy; ny=Math.max(8,Math.min(252,ny)); }
          return { ...p, x:nx, y:ny, vx:nvx, vy:nvy };
        });
      });
      animId = requestAnimationFrame(gameTick);
    };
    animId = requestAnimationFrame(gameTick);
    return () => cancelAnimationFrame(animId);
  }, [animating, rabbitBirthRate, wolfDeathRate, huntingEfficiency, ecosystemCarryingCapacity, activeTab]);

  useEffect(() => {
    if (!animating || activeTab !== 'ecosystem') return;
    const interval = setInterval(() => {
      setActors(p => {
        const rabbits = p.filter(a => a.type==='rabbit').length;
        const wolves = p.filter(a => a.type==='wolf').length;
        setPopulationHistory(prev => [...prev.slice(-40), {rabbits, wolves}]);
        return p;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [animating, activeTab]);

  /* ---------- SIR epidemic loop ---------- */
  useEffect(() => {
    if (!animating || activeTab !== 'epidemic') return;
    let animId: number;
    const tick = () => {
      setSirActors(prev => {
        const next = prev.map(a => {
          let nx = a.x + a.vx, ny = a.y + a.vy;
          let nvx = a.vx, nvy = a.vy;
          if (nx<10||nx>330) { nvx=-a.vx; nx=Math.max(10,Math.min(330,nx)); }
          if (ny<10||ny>250) { nvy=-a.vy; ny=Math.max(10,Math.min(250,ny)); }
          let newState = a.state;
          let nt = a.t + 1/60;
          if (a.state === 'I') {
            if (nt > 6 + Math.random()*4) { newState = 'R'; nt = 0; }
            else if (Math.random() < sirGamma * 0.01) { newState = 'R'; nt = 0; }
          }
          return { ...a, x:nx, y:ny, vx:nvx, vy:nvy, state:newState, t:nt };
        });
        // S → I via contact with I
        for (let i = 0; i < next.length; i++) {
          if (next[i].state !== 'S') continue;
          for (let j = 0; j < next.length; j++) {
            if (next[j].state !== 'I') continue;
            const d = Math.hypot(next[i].x-next[j].x, next[i].y-next[j].y);
            if (d < 14 && Math.random() < sirBeta * 0.08) {
              next[i] = { ...next[i], state: 'I', t: 0 };
              break;
            }
          }
        }
        return next;
      });
      animId = requestAnimationFrame(tick);
    };
    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [animating, activeTab, sirBeta, sirGamma]);

  useEffect(() => {
    if (!animating || activeTab !== 'epidemic') return;
    const interval = setInterval(() => {
      setSirActors(p => {
        const S = p.filter(a => a.state==='S').length;
        const I = p.filter(a => a.state==='I').length;
        const R = p.filter(a => a.state==='R').length;
        setSirHistory(prev => [...prev.slice(-60), {S,I,R}]);
        return p;
      });
    }, 500);
    return () => clearInterval(interval);
  }, [animating, activeTab]);

  /* ---------- Bacteria growth loop ---------- */
  useEffect(() => {
    if (!animating || activeTab !== 'bacteria') return;
    let animId: number;
    const tick = () => {
      const arr = bacteriaPos.current;
      // Each bacterium slowly grows in size
      arr.forEach(b => { b.age += 1/60; b.r = Math.min(3.5, 2 + b.age * 0.1); });
      // Division if under capacity
      if (arr.length < bacteriaCapacity && Math.random() < bacteriaRate * 0.04) {
        const parent = arr[Math.floor(Math.random()*arr.length)];
        if (parent.age > 1.2) {
          parent.age = 0;
          const ang = Math.random() * Math.PI * 2;
          arr.push({
            x: Math.max(30, Math.min(310, parent.x + Math.cos(ang)*5)),
            y: Math.max(40, Math.min(220, parent.y + Math.sin(ang)*5)),
            r: 2, age: 0
          });
        }
      }
      setBacteriaCount(arr.length);
      animId = requestAnimationFrame(tick);
    };
    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [animating, activeTab, bacteriaRate, bacteriaCapacity]);

  useEffect(() => {
    if (!animating || activeTab !== 'bacteria') return;
    const interval = setInterval(() => {
      setBacteriaHistory(prev => [...prev.slice(-60), bacteriaPos.current.length]);
    }, 600);
    return () => clearInterval(interval);
  }, [animating, activeTab]);

  /* ---------- Mitosis auto-advance ---------- */
  useEffect(() => {
    if (!animating || activeTab !== 'mitosis') return;
    const interval = setInterval(() => {
      setMitosisStage(s => (s + 1) % 5);
    }, 2500 / mitosisSpeed);
    return () => clearInterval(interval);
  }, [animating, activeTab, mitosisSpeed]);

  /* ---------- Neuron AP loop ---------- */
  useEffect(() => {
    if (!animating || activeTab !== 'neuron') return;
    let animId: number;
    const tick = () => {
      setApTime(t => {
        let nt = t + 1/60;
        if (nt > 5) nt = 0;
        return nt;
      });
      animId = requestAnimationFrame(tick);
    };
    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [animating, activeTab]);

  /* ---------- Master tick (other labs) ---------- */
  useEffect(() => {
    if (!animating || (activeTab !== 'heart' && activeTab !== 'respiratory' && activeTab !== 'sewage' && activeTab !== 'enzyme' && activeTab !== 'watercycle')) return;
    let animId: number;
    const mainGameLoop = () => {
      // ---- HEART ----
      if (activeTab === 'heart') {
        const activeBpm = adrenalineActive ? 135 : bpm;
        const spawnRate = activeBpm / 240;
        if (Math.random() < spawnRate) {
          if (showDeox) heartParticles.current.push({ x:0, y:0, progress:0, type:'deox', speed:0.005+Math.random()*0.003 });
          if (showOx) heartParticles.current.push({ x:0, y:0, progress:0, type:'ox', speed:0.005+Math.random()*0.003 });
        }
        const speedMult = activeBpm / 75;
        heartParticles.current = heartParticles.current.map(p => ({ ...p, progress: p.progress + p.speed * speedMult })).filter(p => p.progress < 1.0);
      }
      // ---- RESPIRATORY ----
      if (activeTab === 'respiratory') {
        if (respiratoryMode === 'global') {
          if (Math.random() < photosynthesisSpeed / 120) gasParticles.current.push({ x:20+Math.random()*100, y:10+Math.random()*20, vx:0.8+Math.random()*1.5, vy:1.5+Math.random()*2.5, type:'sun', radius:1+Math.random()*2, alpha:0.8 });
          if (Math.random() < photosynthesisSpeed / 250) gasParticles.current.push({ x:80+(Math.random()-0.5)*40, y:100+(Math.random()-0.5)*40, vx:1.0+Math.random()*1.5, vy:(Math.random()-0.5)*0.6, type:'O2', radius:3+Math.random()*2, alpha:1.0 });
          const bf = (respirationRate / 16) * (1 + pollutionSpike / 100);
          if (Math.random() < 0.04 * bf) gasParticles.current.push({ x:255+(Math.random()-0.5)*15, y:145+(Math.random()-0.5)*15, vx:-1.2-Math.random()*1.5, vy:-0.5+Math.random()*1.0, type:'CO2', radius:3+Math.random()*1.8, alpha:1.0 });
          gasParticles.current = gasParticles.current.map(p => {
            let nvy = p.vy;
            if (p.type === 'O2') nvy += Math.sin(p.x*0.05)*0.1;
            else if (p.type === 'CO2') nvy += Math.sin(p.x*0.05)*0.1;
            return { ...p, x:p.x+p.vx, y:p.y+nvy, vy:nvy, alpha:p.alpha-0.004 };
          }).filter(p => p.alpha>0 && p.x>5 && p.x<335 && p.y>5 && p.y<255);
        } else {
          if (bloodCells.current.length < 15) {
            for (let i = bloodCells.current.length; i < 15; i++) {
              bloodCells.current.push({ x:i*25, y:170+(Math.random()-0.5)*6, oxygen:i<5?0.0:(i>10?1.0:(i-5)/5), originalX:i*25 });
            }
          }
          const sm = respirationRate / 16;
          bloodCells.current = bloodCells.current.map(cell => {
            let nx = cell.x + 0.85*sm, ox = cell.oxygen;
            if (nx > 335) { nx = 5; ox = 0.0; }
            if (nx > 110 && nx < 230) {
              ox = Math.min(1.0, ox + 0.015*sm);
              if (Math.random() < 0.15) gasParticles.current.push({ x:170+(Math.random()-0.5)*50, y:90+Math.random()*15, vx:(Math.random()-0.5)*0.4, vy:0.8+Math.random()*1.2, type:'O2', radius:2+Math.random()*1.5, alpha:1.0 });
            }
            return { ...cell, x:nx, oxygen:ox };
          });
          gasParticles.current = gasParticles.current.map(p => ({ ...p, x:p.x+p.vx, y:p.y+p.vy, alpha:p.alpha-0.015 })).filter(p => p.alpha > 0);
        }
      }
      // ---- SEWAGE ----
      if (activeTab === 'sewage') {
        const ms = sewageSpeed;
        if (Math.random() < 0.28 * ms) {
          sewageParticles.current.push({ x:10, y:90+Math.random()*60, vx:0.5+Math.random()*0.8, vy:(Math.random()-0.5)*0.6, type:'water', radius:2.5+Math.random()*1.5, color:'#78350f' });
          if (sewageParticles.current.filter(p => p.type==='grit').length < sewageOrganicLoad) {
            sewageParticles.current.push({ x:10+Math.random()*15, y:80+Math.random()*70, vx:0.3+Math.random()*0.5, vy:(Math.random()-0.5)*0.5, type:'grit', radius:3+Math.random()*2, color:'#3f3f46' });
          }
        }
        if (sewageParticles.current.filter(p => p.type==='bacteria').length < 18) {
          sewageParticles.current.push({ x:100+Math.random()*70, y:80+Math.random()*80, vx:(Math.random()-0.5)*0.8, vy:(Math.random()-0.5)*0.8, type:'bacteria', radius:1.5+Math.random()*1.0, color:'#10b981' });
        }
        if (Math.random() < aerationPower/120) {
          sewageParticles.current.push({ x:100+Math.random()*65, y:175, vx:(Math.random()-0.5)*0.4, vy:-1.2-Math.random()*1.6, type:'bubble', radius:1.0+Math.random()*2.0, color:'#ffffff' });
        }
        sewageParticles.current = sewageParticles.current.map(p => {
          let nx = p.x + p.vx*ms, ny = p.y + p.vy*ms, nvx = p.vx, nvy = p.vy, col = p.color;
          if (p.type === 'grit' && nx>88 && nx<96) { nvx=0; nvy=0.5; col='#52525b'; }
          if (p.type === 'water') {
            if (nx>90 && nx<175) col='#a16207';
            else if (nx>=175 && nx<255) col='#cbd5e1';
            else if (nx>=255) col='#e0f2fe';
          }
          if (p.type==='grit' && nx>175 && nx<255) { nvx=0.1; nvy=0.8; }
          if (p.type==='bubble' && ny<80) ny=-999;
          if (p.type==='bacteria') { if (nx<95||nx>170) nvx=-nvx; if (ny<80||ny>175) nvy=-nvy; }
          return { ...p, x:nx, y:ny, vx:nvx, vy:nvy, color:col };
        }).filter(p => p.x>0 && p.x<335 && p.y>0 && p.y<230);
      }
      // ---- ENZYME ----
      if (activeTab === 'enzyme') {
        const desired = Math.floor(substrateConc / 5);
        while (enzymeSubstrates.current.length < desired) {
          enzymeSubstrates.current.push({
            x: 20 + Math.random()*300, y: 40 + Math.random()*160,
            vx: (Math.random()-0.5)*1.5, vy: (Math.random()-0.5)*1.5,
            bound: false, product: false, life: 0
          });
        }
        while (enzymeSubstrates.current.length > desired) enzymeSubstrates.current.pop();
        const enzymeX = 170, enzymeY = 130, enzymeR = 25;
        const rate = vmax / (km + substrateConc);
        enzymeSubstrates.current = enzymeSubstrates.current.map(s => {
          let nx = s.x + s.vx, ny = s.y + s.vy;
          let nb = s.bound, np = s.product, nl = s.life + 1/60;
          const dE = Math.hypot(nx - enzymeX, ny - enzymeY);
          if (!nb && !np && dE < enzymeR + 4 && Math.random() < 0.05 * (rate/100)) {
            nb = true; nl = 0;
          }
          if (nb && nl > 0.8) { nb = false; np = true; nl = 0; }
          if (np) { nx += 1.2; ny += (Math.random()-0.5)*1; }
          if (nx < 10 || nx > 330) s.vx = -s.vx;
          if (ny < 20 || ny > 220) s.vy = -s.vy;
          return { ...s, x:nx, y:ny, bound:nb, product:np, life:nl };
        });
      }
      // ---- WATER CYCLE ----
      if (activeTab === 'watercycle') {
        const evapRate = waterTemp / 30;
        // evaporation from ocean (bottom)
        if (Math.random() < 0.12 * evapRate) {
          waterParticles.current.push({ x:40+Math.random()*260, y:220, vx:(Math.random()-0.5)*0.5, vy:-0.6-Math.random()*0.8, type:'vapor', life:0 });
        }
        // cloud formation at top (if humidity high enough)
        if (Math.random() < 0.04 * (waterHumidity/60)) {
          waterParticles.current.push({ x:60+Math.random()*220, y:30+Math.random()*30, vx:0.2+Math.random()*0.3, vy:(Math.random()-0.5)*0.1, type:'cloud', life:0 });
        }
        // precipitation from clouds
        const cloudCount = waterParticles.current.filter(p => p.type==='cloud').length;
        if (cloudCount > 8 && Math.random() < 0.15) {
          const cloud = waterParticles.current.filter(p => p.type==='cloud')[Math.floor(Math.random()*cloudCount)];
          if (cloud) waterParticles.current.push({ x:cloud.x, y:cloud.y+5, vx:(Math.random()-0.5)*0.3, vy:1.5+Math.random()*1.5, type:'rain', life:0 });
        }
        waterParticles.current = waterParticles.current.map(p => {
          let nx = p.x + p.vx, ny = p.y + p.vy, nl = p.life + 1/60;
          let ntype = p.type;
          // vapor rises and becomes cloud
          if (p.type === 'vapor' && ny < 50) { ntype = 'cloud'; nl = 0; }
          // rain falls to ocean/ground
          if (p.type === 'rain' && ny > 215) { ntype = 'river'; nl = 0; }
          // river flows back to ocean
          if (p.type === 'river' && nx > 330) nl = 999;
          return { ...p, x:nx, y:ny, life:nl, type:ntype };
        }).filter(p => p.life < (p.type==='cloud'?8:p.type==='river'?6:10) && p.y > -5 && p.y < 240);
      }
      animId = requestAnimationFrame(mainGameLoop);
    };
    animId = requestAnimationFrame(mainGameLoop);
    return () => cancelAnimationFrame(animId);
  }, [animating, activeTab, bpm, adrenalineActive, showDeox, showOx, respiratoryMode, respirationRate, pollutionSpike, photosynthesisSpeed, sewageSpeed, aerationPower, sewageOrganicLoad, substrateConc, vmax, km, waterTemp, waterHumidity]);

  /* ---------- 3D auto-rotate ---------- */
  useEffect(() => {
    if (!autoRotate || viewMode !== '3d') return;
    let raf = 0;
    const loop = () => { setRotY3D(r => r + 0.008); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [autoRotate, viewMode]);

  /* ============================================================
     CANVAS RENDER
     ============================================================ */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const W = canvas.width, H = canvas.height;
    const isDark = document.documentElement.classList.contains('dark');
    ctx.clearRect(0, 0, W, H);
    ctx.save();

    /* ============ 3D MODE ============ */
    if (viewMode === '3d') {
      ctx.translate(W/2, H/2); ctx.scale(zoomLevel, zoomLevel); ctx.translate(-W/2, -H/2);
      const cx = W/2, cy = H/2, focal = 600, scale = zoom3D;

      // Floor grid
      if (showFloor) {
        const floorY = 2.8, gridN = 10, ext = 4;
        ctx.strokeStyle = 'rgba(100,116,139,0.25)'; ctx.lineWidth = 1;
        for (let i = -gridN; i <= gridN; i++) {
          const t = (i/gridN)*ext;
          const a = project3D(-ext, floorY, t, rotX3D, rotY3D, focal, cx, cy, scale);
          const b = project3D( ext, floorY, t, rotX3D, rotY3D, focal, cx, cy, scale);
          const c = project3D(t, floorY, -ext, rotX3D, rotY3D, focal, cx, cy, scale);
          const d = project3D(t, floorY,  ext, rotX3D, rotY3D, focal, cx, cy, scale);
          ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(c.x,c.y); ctx.lineTo(d.x,d.y); ctx.stroke();
        }
      }

      // Axes
      if (showAxes3D) {
        const o = project3D(0,0,0, rotX3D, rotY3D, focal, cx, cy, scale);
        const axLen = 3;
        const axes = [
          { p:[axLen,0,0] as [number,number,number], color:'#ef4444', label:'X' },
          { p:[0,axLen,0] as [number,number,number], color:'#22c55e', label:'Y' },
          { p:[0,0,axLen] as [number,number,number], color:'#3b82f6', label:'Z' },
        ];
        axes.forEach(ax => {
          const e = project3D(ax.p[0],ax.p[1],ax.p[2], rotX3D, rotY3D, focal, cx, cy, scale);
          ctx.strokeStyle = ax.color; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(o.x,o.y); ctx.lineTo(e.x,e.y); ctx.stroke();
          ctx.fillStyle = ax.color; ctx.font = 'bold 12px monospace';
          ctx.fillText(ax.label, e.x+4, e.y-4);
        });
      }

      const segs = shape3D.build(p3A, p3B, p3C, p3Res);
      type PSeg = { a: ReturnType<typeof project3D>; b: ReturnType<typeof project3D>; mz:number };
      const projected: PSeg[] = segs.map(([p1,p2]) => {
        const a = project3D(p1[0],p1[1],p1[2], rotX3D, rotY3D, focal, cx, cy, scale);
        const b = project3D(p2[0],p2[1],p2[2], rotX3D, rotY3D, focal, cx, cy, scale);
        return { a, b, mz: (a.z+b.z)/2 };
      });
      projected.sort((x,y) => y.mz - x.mz);
      for (const s of projected) {
        const depth = (s.mz + 5) / 10;
        const alpha = Math.max(0.15, Math.min(1, 1 - depth*0.15));
        if (showWireframe) {
          ctx.strokeStyle = `rgba(232,121,249,${alpha})`; // fuchsia-pink bio theme
          ctx.lineWidth = 1.1;
        } else {
          ctx.strokeStyle = `rgba(34,211,238,${alpha})`;
          ctx.lineWidth = 1.6;
        }
        ctx.beginPath(); ctx.moveTo(s.a.x, s.a.y); ctx.lineTo(s.b.x, s.b.y); ctx.stroke();
      }

      ctx.fillStyle = 'rgba(148,163,184,0.9)'; ctx.font = '10px monospace';
      ctx.fillText(`segments: ${segs.length}`, 10, 16);
      ctx.fillText(`drag to orbit · scroll to zoom`, 10, H - 10);
      ctx.restore();
      return;
    }

    /* ============ SIMULATION MODE ============ */
    ctx.translate(W/2, H/2); ctx.scale(zoomLevel, zoomLevel); ctx.translate(-W/2, -H/2);

    // ----- ECOSYSTEM -----
    if (activeTab === 'ecosystem') {
      ctx.fillStyle = isDark ? '#052e1644' : '#f0fdf4';
      ctx.fillRect(5,5,W-10,H-10);
      ctx.strokeStyle = '#22c55e44'; ctx.lineWidth = 2.5;
      ctx.strokeRect(5,5,W-10,H-10);
      ctx.strokeStyle = '#ef444422'; ctx.setLineDash([4,6]);
      ctx.beginPath(); ctx.moveTo(0, H-50); ctx.lineTo(W, H-50); ctx.stroke();
      ctx.setLineDash([]);
      actors.forEach(act => {
        ctx.beginPath();
        if (act.type === 'rabbit') {
          ctx.arc(act.x, act.y, 4.5, 0, Math.PI*2);
          ctx.fillStyle = '#4ade80'; ctx.shadowBlur = 3; ctx.shadowColor = '#4ade80'; ctx.fill();
          ctx.shadowBlur = 0; ctx.strokeStyle = '#15803d'; ctx.lineWidth = 1; ctx.stroke();
          ctx.beginPath();
          ctx.ellipse(act.x-2, act.y-5, 1.2, 4, -0.15, 0, Math.PI*2);
          ctx.ellipse(act.x+2, act.y-5, 1.2, 4, 0.15, 0, Math.PI*2);
          ctx.fillStyle = '#bbf7d0'; ctx.fill();
        } else {
          ctx.arc(act.x, act.y, 8, 0, Math.PI*2);
          ctx.fillStyle = '#f97316'; ctx.shadowBlur = 5; ctx.shadowColor = '#f97316'; ctx.fill();
          ctx.shadowBlur = 0; ctx.strokeStyle = '#b45309'; ctx.lineWidth = 1.2; ctx.stroke();
          ctx.fillStyle = '#ffeb3b';
          ctx.beginPath();
          ctx.arc(act.x-2.5, act.y-1.5, 1.5, 0, Math.PI*2);
          ctx.arc(act.x+2.5, act.y-1.5, 1.5, 0, Math.PI*2);
          ctx.fill();
        }
      });
    }

    // ----- EPIDEMIC SIR -----
    else if (activeTab === 'epidemic') {
      ctx.fillStyle = isDark ? '#0c0a09' : '#fafaf9';
      ctx.fillRect(5,5,W-10,H-10);
      ctx.strokeStyle = '#dc262644'; ctx.lineWidth = 2;
      ctx.strokeRect(5,5,W-10,H-10);
      sirActors.forEach(a => {
        ctx.beginPath();
        ctx.arc(a.x, a.y, 4, 0, Math.PI*2);
        ctx.fillStyle = a.state === 'S' ? '#22c55e' : a.state === 'I' ? '#ef4444' : '#9ca3af';
        if (a.state === 'I') { ctx.shadowBlur = 6; ctx.shadowColor = '#ef4444'; }
        ctx.fill();
        ctx.shadowBlur = 0;
      });
      // SIR curve bottom
      const curveY = H - 20, curveH = 35;
      ctx.fillStyle = isDark ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.6)';
      ctx.fillRect(5, H-60, W-10, 55);
      if (sirHistory.length > 1) {
        const N = sirActors.length || 80;
        ctx.lineWidth = 1.6;
        const drawLine = (key: 'S'|'I'|'R', color: string) => {
          ctx.strokeStyle = color; ctx.beginPath();
          sirHistory.forEach((h, i) => {
            const x = 10 + (i / (sirHistory.length-1)) * (W - 20);
            const y = curveY - (h[key] / N) * curveH;
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          });
          ctx.stroke();
        };
        drawLine('S', '#22c55e'); drawLine('I', '#ef4444'); drawLine('R', '#9ca3af');
      }
      ctx.font = '8px monospace';
      ctx.fillStyle = '#22c55e'; ctx.fillText('● Susceptible', 10, H - 48);
      ctx.fillStyle = '#ef4444'; ctx.fillText('● Infected', 90, H - 48);
      ctx.fillStyle = '#9ca3af'; ctx.fillText('● Recovered', 160, H - 48);
    }

    // ----- HEART -----
    else if (activeTab === 'heart') {
      const activeBpm = adrenalineActive ? 135 : bpm;
      const beatCycle = (Date.now() / 1000) * (activeBpm / 60) * Math.PI * 2;
      const heartPulseScale = 1.0 + 0.06 * Math.sin(beatCycle);
      ctx.fillStyle = isDark ? '#111115' : '#fafafa'; ctx.fillRect(5,5,W-10,H-10);
      ctx.strokeStyle = isDark ? '#27272a' : '#e4e4e7'; ctx.strokeRect(5,5,W-10,H-10);
      ctx.save();
      ctx.translate(170, 130); ctx.scale(heartPulseScale, heartPulseScale); ctx.translate(-170, -130);
      ctx.fillStyle = 'rgba(59,130,246,0.15)'; ctx.beginPath();
      ctx.moveTo(110, 60);
      ctx.bezierCurveTo(90, 80, 80, 130, 110, 190);
      ctx.bezierCurveTo(130, 200, 150, 200, 170, 195);
      ctx.lineTo(170, 90); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#2563eb'; ctx.lineWidth = 1.8; ctx.stroke();
      ctx.fillStyle = 'rgba(239,68,68,0.15)'; ctx.beginPath();
      ctx.moveTo(230, 60);
      ctx.bezierCurveTo(250, 80, 260, 130, 230, 190);
      ctx.bezierCurveTo(210, 200, 190, 200, 170, 195);
      ctx.lineTo(170, 90); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#dc2626'; ctx.lineWidth = 1.8; ctx.stroke();
      ctx.strokeStyle = isDark ? '#52525b' : '#a1a1aa'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(170,90); ctx.lineTo(170,195); ctx.stroke();
      ctx.fillStyle = isDark ? '#71717a' : '#52525b'; ctx.font = '7px monospace'; ctx.textAlign = 'center';
      ctx.fillText('RA', 130, 105); ctx.fillText('RV', 125, 160);
      ctx.fillText('LA', 210, 105); ctx.fillText('LV', 215, 160);
      ctx.fillStyle = '#1d4ed8'; ctx.beginPath(); ctx.arc(110,60,6,0,Math.PI*2); ctx.fill();
      ctx.fillStyle = '#b91c1c'; ctx.beginPath(); ctx.arc(230,60,6,0,Math.PI*2); ctx.fill();
      ctx.fillStyle = isDark ? '#71717a' : '#52525b';
      ctx.fillText('SVC', 110, 48); ctx.fillText('AORTA', 230, 48);
      const valveOpen = Math.sin(beatCycle) > 0;
      ctx.strokeStyle = isDark ? '#fff' : '#000'; ctx.lineWidth = 2.5;
      ctx.beginPath();
      if (valveOpen) { ctx.moveTo(115,125); ctx.lineTo(120,135); ctx.moveTo(140,125); ctx.lineTo(135,135); }
      else { ctx.moveTo(115,128); ctx.lineTo(140,128); }
      ctx.stroke();
      ctx.beginPath();
      if (valveOpen) { ctx.moveTo(200,125); ctx.lineTo(205,135); ctx.moveTo(225,125); ctx.lineTo(220,135); }
      else { ctx.moveTo(200,128); ctx.lineTo(225,128); }
      ctx.stroke();
      ctx.restore();
      const getDeox = (p:number) => p<0.35 ? {x:110+20*(p/0.35), y:60+50*(p/0.35)} : p<0.7 ? {x:130-5*((p-0.35)/0.35), y:110+50*((p-0.35)/0.35)} : {x:125-45*((p-0.7)/0.3), y:160-70*((p-0.7)/0.3)};
      const getOx = (p:number) => p<0.35 ? {x:250-40*(p/0.35), y:80+30*(p/0.35)} : p<0.7 ? {x:210+5*((p-0.35)/0.35), y:110+50*((p-0.35)/0.35)} : {x:215+15*((p-0.7)/0.3), y:160-100*((p-0.7)/0.3)};
      heartParticles.current.forEach(p => {
        const hPulse = Math.sin(beatCycle);
        const ratioPulse = p.progress + (hPulse*0.015);
        const loc = p.type === 'deox' ? getDeox(ratioPulse) : getOx(ratioPulse);
        ctx.beginPath(); ctx.arc(loc.x, loc.y, 3.2, 0, Math.PI*2);
        ctx.fillStyle = p.type === 'deox' ? '#60a5fa' : '#ef4444';
        ctx.shadowBlur = 4; ctx.shadowColor = p.type === 'deox' ? '#3b82f6' : '#ef4444'; ctx.fill();
        ctx.shadowBlur = 0;
      });
    }

    // ----- RESPIRATORY -----
    else if (activeTab === 'respiratory') {
      ctx.fillStyle = isDark ? '#111115' : '#fafafa'; ctx.fillRect(5,5,W-10,H-10);
      ctx.strokeStyle = isDark ? '#27272a' : '#e4e4e7'; ctx.strokeRect(5,5,W-10,H-10);
      if (respiratoryMode === 'global') {
        ctx.beginPath(); ctx.arc(30,20,10,0,Math.PI*2);
        ctx.fillStyle = '#fef08a'; ctx.shadowBlur=10; ctx.shadowColor='#facc15'; ctx.fill(); ctx.shadowBlur=0;
        ctx.fillStyle = '#047857'; ctx.beginPath();
        ctx.arc(65,110,22,0,Math.PI*2); ctx.arc(95,110,20,0,Math.PI*2); ctx.arc(80,85,25,0,Math.PI*2); ctx.fill();
        ctx.fillStyle = '#78350f'; ctx.fillRect(75,125,10,45);
        const breathPhase = Math.sin((Date.now()/1000)*(respirationRate/15)*Math.PI);
        const chestScale = 1.0 + breathPhase*0.05;
        ctx.save(); ctx.translate(260,150); ctx.scale(chestScale, chestScale);
        ctx.beginPath(); ctx.ellipse(0,0,15,10,0,0,Math.PI*2);
        ctx.fillStyle = isDark ? '#d4d4d8' : '#e4e4e7'; ctx.fill();
        ctx.beginPath(); ctx.arc(12,-7,8,0,Math.PI*2); ctx.fill();
        ctx.restore();
        ctx.font = '8px monospace';
        ctx.fillStyle = '#10b981'; ctx.fillText('Oxygen O₂ ➔ ➔ ➔', 125, 100);
        ctx.fillStyle = '#71717a'; ctx.fillText('◀ ◀ ◀ Carbon Dioxide CO₂', 115, 150);
        gasParticles.current.forEach(p => {
          ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI*2);
          if (p.type==='O2') { ctx.fillStyle=`rgba(16,185,129,${p.alpha})`; ctx.shadowColor='#10b981'; }
          else if (p.type==='CO2') { ctx.fillStyle=`rgba(139,92,246,${p.alpha})`; ctx.shadowColor='#8b5cf6'; }
          else { ctx.fillStyle=`rgba(253,224,71,${p.alpha})`; }
          ctx.shadowBlur = 4; ctx.fill(); ctx.shadowBlur = 0;
        });
      } else {
        ctx.fillStyle = 'rgba(253,164,175,0.1)'; ctx.beginPath(); ctx.arc(170,75,45,0,Math.PI*2); ctx.fill();
        ctx.strokeStyle = '#f43f5e'; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.fillStyle = isDark ? '#fff' : '#334155'; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('Alveolus Air Sac', 170, 65);
        ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 20;
        ctx.beginPath(); ctx.moveTo(10,175); ctx.lineTo(330,175); ctx.stroke();
        bloodCells.current.forEach(cell => {
          ctx.beginPath(); ctx.arc(cell.x, cell.y, 7, 0, Math.PI*2);
          const r = Math.floor(95+160*cell.oxygen), g = Math.floor(125-90*cell.oxygen), b = Math.floor(185-130*cell.oxygen);
          ctx.fillStyle = `rgb(${r},${g},${b})`; ctx.fill();
          ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.stroke();
        });
      }
    }

    // ----- NEURON ACTION POTENTIAL -----
    else if (activeTab === 'neuron') {
      ctx.fillStyle = isDark ? '#0a0a0f' : '#fefce8';
      ctx.fillRect(5,5,W-10,H-10);
      ctx.strokeStyle = '#eab30844'; ctx.lineWidth = 2; ctx.strokeRect(5,5,W-10,H-10);
      // Neuron body on left
      const somaX = 60, somaY = 130, somaR = 22;
      ctx.fillStyle = '#fde047'; ctx.shadowBlur = 8; ctx.shadowColor = '#facc15';
      ctx.beginPath(); ctx.arc(somaX, somaY, somaR, 0, Math.PI*2); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#a16207'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = '#854d0e'; ctx.beginPath(); ctx.arc(somaX, somaY, 7, 0, Math.PI*2); ctx.fill();
      // Dendrites
      ctx.strokeStyle = '#facc15'; ctx.lineWidth = 2;
      for (let i = 0; i < 5; i++) {
        const ang = Math.PI * 0.6 + (i/4) * Math.PI * 0.8;
        ctx.beginPath();
        ctx.moveTo(somaX + Math.cos(ang)*somaR, somaY + Math.sin(ang)*somaR);
        ctx.lineTo(somaX + Math.cos(ang)*(somaR+20), somaY + Math.sin(ang)*(somaR+20));
        ctx.stroke();
      }
      // Axon with myelin sheath
      const axonStartX = somaX + somaR;
      const axonEndX = W - 20;
      ctx.strokeStyle = '#fde047'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(axonStartX, somaY); ctx.lineTo(axonEndX, somaY); ctx.stroke();
      if (neuronMyelin) {
        const segN = 6;
        for (let i = 0; i < segN; i++) {
          const sx = axonStartX + 10 + i * ((axonEndX - axonStartX - 20) / segN);
          ctx.fillStyle = 'rgba(253,224,71,0.4)';
          ctx.beginPath();
          ctx.ellipse(sx + 10, somaY, 14, 8, 0, 0, Math.PI*2);
          ctx.fill();
          ctx.strokeStyle = '#ca8a04'; ctx.lineWidth = 1; ctx.stroke();
        }
      }
      // Axon terminals
      for (let i = 0; i < 4; i++) {
        const ang = (i/3 - 0.5) * 0.8;
        ctx.strokeStyle = '#facc15'; ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(axonEndX, somaY);
        ctx.lineTo(axonEndX + 12, somaY + Math.sin(ang)*15);
        ctx.stroke();
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath(); ctx.arc(axonEndX + 12, somaY + Math.sin(ang)*15, 3, 0, Math.PI*2); ctx.fill();
      }
      // Travelling action potential (glowing pulse)
      const speed = neuronMyelin ? 2.0 : 1.0;
      const pulseX = axonStartX + ((apTime * speed * 60) % (axonEndX - axonStartX));
      ctx.fillStyle = '#f97316'; ctx.shadowBlur = 15; ctx.shadowColor = '#f97316';
      ctx.beginPath(); ctx.arc(pulseX, somaY, 6, 0, Math.PI*2); ctx.fill();
      ctx.shadowBlur = 0;

      // AP voltage graph (top-right inset)
      const gX = 20, gY = 20, gW = 140, gH = 50;
      ctx.fillStyle = isDark ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.8)';
      ctx.fillRect(gX, gY, gW, gH);
      ctx.strokeStyle = isDark ? '#52525b' : '#d4d4d8'; ctx.lineWidth = 1;
      ctx.strokeRect(gX, gY, gW, gH);
      // baseline -70mV, peak +30mV
      ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 1.8; ctx.beginPath();
      for (let i = 0; i < gW; i++) {
        const t = (i / gW) * 5; // 5 ms total
        let v = -70;
        if (t > 1.0 && t < 1.5) v = -70 + (t-1.0)/0.5 * 100; // depolarize
        else if (t >= 1.5 && t < 2.0) v = 30 - (t-1.5)/0.5 * 110; // repolarize
        else if (t >= 2.0 && t < 3.0) v = -80 + (t-2.0) * 10; // hyperpolarize
        else v = -70;
        const px = gX + i;
        const py = gY + gH - ((v + 90) / 140) * gH;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.fillStyle = isDark ? '#fff' : '#000'; ctx.font = '7px monospace';
      ctx.fillText('mV', gX + 2, gY + 8);
      ctx.fillText('+30', gX + 2, gY + 15);
      ctx.fillText('-70', gX + 2, gY + gH - 3);
      ctx.fillText('5 ms', gX + gW - 20, gY + gH - 3);

      ctx.fillStyle = isDark ? '#fbbf24' : '#92400e';
      ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'left';
      ctx.fillText('Na⁺ channels → depolarization', 20, H - 30);
      ctx.fillText('K⁺ channels → repolarization', 20, H - 18);
    }

    // ----- MITOSIS -----
    else if (activeTab === 'mitosis') {
      ctx.fillStyle = isDark ? '#1e1b4b' : '#f5f3ff';
      ctx.fillRect(5,5,W-10,H-10);
      ctx.strokeStyle = '#8b5cf644'; ctx.lineWidth = 2; ctx.strokeRect(5,5,W-10,H-10);
      const cx = W/2, cy = H/2;
      const stages = ['Interphase', 'Prophase', 'Metaphase', 'Anaphase', 'Telophase'];
      const stageColors = ['#a78bfa', '#c084fc', '#e879f9', '#f472b6', '#fb7185'];
      // Cell membrane
      const cellW = mitosisStage >= 4 ? 130 : 100;
      const cellH = 80;
      const splitOffset = mitosisStage === 3 ? 25 : mitosisStage === 4 ? 55 : 0;
      // Draw one or two cells
      const drawCell = (offsetX: number) => {
        ctx.fillStyle = 'rgba(196,181,253,0.3)';
        ctx.beginPath(); ctx.ellipse(cx + offsetX, cy, cellW/2, cellH/2, 0, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = '#7c3aed'; ctx.lineWidth = 2; ctx.stroke();
      };
      if (mitosisStage < 4) drawCell(0);
      else { drawCell(-splitOffset); drawCell(splitOffset); }

      // Chromosomes
      ctx.lineWidth = 3;
      if (mitosisStage === 0) {
        // loose chromatin - dots
        ctx.fillStyle = '#7c3aed';
        for (let i = 0; i < 12; i++) {
          ctx.beginPath();
          ctx.arc(cx + (Math.random()-0.5)*60, cy + (Math.random()-0.5)*40, 2, 0, Math.PI*2);
          ctx.fill();
        }
      } else if (mitosisStage === 1) {
        // condensed X shapes scattered
        ctx.strokeStyle = '#7c3aed';
        for (let i = 0; i < 4; i++) {
          const x = cx - 30 + i*20, y = cy - 15 + (i%2)*30;
          ctx.beginPath(); ctx.moveTo(x-5,y-5); ctx.lineTo(x+5,y+5); ctx.moveTo(x+5,y-5); ctx.lineTo(x-5,y+5); ctx.stroke();
        }
      } else if (mitosisStage === 2) {
        // aligned at metaphase plate
        ctx.strokeStyle = '#c026d3';
        for (let i = 0; i < 4; i++) {
          const y = cy - 25 + i*17;
          ctx.beginPath(); ctx.moveTo(cx-5,y-5); ctx.lineTo(cx+5,y+5); ctx.moveTo(cx+5,y-5); ctx.lineTo(cx-5,y+5); ctx.stroke();
        }
        // spindle fibers
        ctx.strokeStyle = '#a78bfa88'; ctx.lineWidth = 1;
        for (let i = 0; i < 4; i++) {
          const y = cy - 25 + i*17;
          ctx.beginPath(); ctx.moveTo(cx - 60, cy); ctx.lineTo(cx, y); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(cx + 60, cy); ctx.lineTo(cx, y); ctx.stroke();
        }
      } else if (mitosisStage === 3) {
        // pulling apart
        ctx.strokeStyle = '#db2777';
        for (let i = 0; i < 4; i++) {
          const y = cy - 25 + i*17;
          ctx.beginPath(); ctx.moveTo(cx-25-5,y-3); ctx.lineTo(cx-25+5,y+3); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(cx+25-5,y-3); ctx.lineTo(cx+25+5,y+3); ctx.stroke();
        }
        ctx.strokeStyle = '#a78bfa88'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(cx-60, cy); ctx.lineTo(cx+60, cy); ctx.stroke();
      } else {
        // two nuclei
        ctx.strokeStyle = '#7c3aed';
        for (let side = -1; side <= 1; side += 2) {
          for (let i = 0; i < 4; i++) {
            const x = cx + side*splitOffset - 10 + i*7;
            const y = cy;
            ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI*2); ctx.stroke();
          }
          // nuclear envelope
          ctx.strokeStyle = '#8b5cf6'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.ellipse(cx + side*splitOffset, cy, 20, 15, 0, 0, Math.PI*2); ctx.stroke();
        }
        // cleavage furrow
        ctx.strokeStyle = '#f43f5e'; ctx.lineWidth = 2; ctx.setLineDash([3,3]);
        ctx.beginPath(); ctx.moveTo(cx, cy - cellH/2); ctx.lineTo(cx, cy + cellH/2); ctx.stroke();
        ctx.setLineDash([]);
      }

      // Stage label
      ctx.fillStyle = stageColors[mitosisStage];
      ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(stages[mitosisStage], cx, 25);
      // stage dots
      for (let i = 0; i < 5; i++) {
        ctx.fillStyle = i === mitosisStage ? stageColors[i] : isDark ? '#52525b' : '#d4d4d8';
        ctx.beginPath(); ctx.arc(cx - 40 + i*20, H - 20, i === mitosisStage ? 5 : 3, 0, Math.PI*2); ctx.fill();
      }
    }

    // ----- BACTERIA -----
    else if (activeTab === 'bacteria') {
      // Petri dish
      ctx.fillStyle = isDark ? '#1c1917' : '#fef3c7';
      ctx.beginPath(); ctx.ellipse(W/2, H/2, W/2 - 15, H/2 - 20, 0, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = '#a16207'; ctx.lineWidth = 3; ctx.stroke();
      ctx.fillStyle = isDark ? 'rgba(120,113,108,0.2)' : 'rgba(254,243,199,0.8)';
      ctx.beginPath(); ctx.ellipse(W/2, H/2, W/2 - 22, H/2 - 27, 0, 0, Math.PI*2); ctx.fill();
      // Bacteria
      bacteriaPos.current.forEach(b => {
        ctx.fillStyle = '#84cc16';
        ctx.shadowBlur = 3; ctx.shadowColor = '#84cc16';
        ctx.beginPath(); ctx.ellipse(b.x, b.y, b.r, b.r*0.7, 0, 0, Math.PI*2); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#4d7c0f'; ctx.lineWidth = 0.8; ctx.stroke();
      });
      // Logistic curve inset
      const gX = 10, gY = H - 55, gW = 120, gH = 45;
      ctx.fillStyle = isDark ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.8)';
      ctx.fillRect(gX, gY, gW, gH);
      ctx.strokeStyle = '#78716c'; ctx.lineWidth = 1; ctx.strokeRect(gX, gY, gW, gH);
      if (bacteriaHistory.length > 1) {
        ctx.strokeStyle = '#84cc16'; ctx.lineWidth = 1.8; ctx.beginPath();
        const maxV = Math.max(bacteriaCapacity, ...bacteriaHistory);
        bacteriaHistory.forEach((v, i) => {
          const x = gX + (i / (bacteriaHistory.length-1)) * gW;
          const y = gY + gH - (v / maxV) * gH;
          if (i === 0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
        });
        ctx.stroke();
        // K line
        ctx.strokeStyle = '#ef444488'; ctx.setLineDash([3,3]);
        const kY = gY + gH - (bacteriaCapacity / maxV) * gH;
        ctx.beginPath(); ctx.moveTo(gX, kY); ctx.lineTo(gX + gW, kY); ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.fillStyle = isDark ? '#fff' : '#000'; ctx.font = '7px monospace';
      ctx.fillText('N(t)', gX + 2, gY + 8);
      ctx.fillStyle = '#ef4444'; ctx.fillText(`K=${bacteriaCapacity}`, gX + gW - 30, gY + 10);
    }

    // ----- ENZYME KINETICS -----
    else if (activeTab === 'enzyme') {
      ctx.fillStyle = isDark ? '#0c0a09' : '#fffbeb';
      ctx.fillRect(5,5,W-10,H-10);
      ctx.strokeStyle = '#f59e0b44'; ctx.lineWidth = 2; ctx.strokeRect(5,5,W-10,H-10);
      // Enzyme (pac-man shape at center)
      const ex = 170, ey = 130, er = 22;
      ctx.fillStyle = '#fbbf24'; ctx.shadowBlur = 6; ctx.shadowColor = '#f59e0b';
      ctx.beginPath();
      ctx.moveTo(ex, ey);
      ctx.arc(ex, ey, er, 0.3, Math.PI*2 - 0.3);
      ctx.closePath(); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#92400e'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = '#78350f'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('Enzyme', ex, ey + 4);
      // Substrates & products
      enzymeSubstrates.current.forEach(s => {
        ctx.beginPath(); ctx.arc(s.x, s.y, 5, 0, Math.PI*2);
        if (s.product) { ctx.fillStyle = '#10b981'; ctx.shadowColor = '#10b981'; }
        else if (s.bound) { ctx.fillStyle = '#f97316'; ctx.shadowColor = '#f97316'; }
        else { ctx.fillStyle = '#3b82f6'; ctx.shadowColor = '#3b82f6'; }
        ctx.shadowBlur = 4; ctx.fill(); ctx.shadowBlur = 0;
      });
      // Michaelis-Menten curve (bottom)
      const gX = 10, gY = H - 60, gW = W - 20, gH = 50;
      ctx.fillStyle = isDark ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.8)';
      ctx.fillRect(gX, gY, gW, gH);
      ctx.strokeStyle = '#78716c'; ctx.lineWidth = 1; ctx.strokeRect(gX, gY, gW, gH);
      ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 2; ctx.beginPath();
      for (let i = 0; i <= gW; i++) {
        const S = (i / gW) * 100;
        const v = vmax * S / (km + S);
        const x = gX + i;
        const y = gY + gH - (v / vmax) * gH;
        if (i === 0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
      }
      ctx.stroke();
      // Current operating point
      const curV = vmax * substrateConc / (km + substrateConc);
      const cpx = gX + (substrateConc / 100) * gW;
      const cpy = gY + gH - (curV / vmax) * gH;
      ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.arc(cpx, cpy, 4, 0, Math.PI*2); ctx.fill();
      ctx.setLineDash([3,3]); ctx.strokeStyle = '#ef444488';
      ctx.beginPath(); ctx.moveTo(cpx, gY + gH); ctx.lineTo(cpx, cpy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(gX, cpy); ctx.lineTo(cpx, cpy); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = isDark ? '#fff' : '#000'; ctx.font = '7px monospace'; ctx.textAlign = 'left';
      ctx.fillText(`Vmax=${vmax}`, gX + 3, gY + 10);
      ctx.fillText(`Km=${km}`, gX + 3, gY + 20);
      ctx.fillText(`v = ${curV.toFixed(1)}`, gX + 3, gY + 30);
      ctx.fillText('[S] substrate →', gX + gW - 60, gY + gH - 3);
      // legend
      ctx.textAlign = 'right';
      ctx.fillStyle = '#3b82f6'; ctx.fillText('● substrate', W - 10, 15);
      ctx.fillStyle = '#f97316'; ctx.fillText('● enzyme-substrate complex', W - 10, 25);
      ctx.fillStyle = '#10b981'; ctx.fillText('● product', W - 10, 35);
    }

    // ----- SEWAGE -----
    else if (activeTab === 'sewage') {
      ctx.fillStyle = isDark ? '#0c0a09' : '#fafaf9';
      ctx.fillRect(5,5,W-10,H-10);
      ctx.strokeStyle = '#57534e'; ctx.strokeRect(5,5,W-10,H-10);
      const topY = 65, botY = 195;
      const stepW = (W - 20) / 4;
      ctx.fillStyle = isDark ? 'rgba(120,113,108,0.05)' : 'rgba(214,211,209,0.2)';
      ctx.fillRect(10, topY, W - 20, botY - topY);
      ctx.strokeStyle = isDark ? '#44403c' : '#d6d3d1'; ctx.lineWidth = 3;
      ctx.beginPath();
      for (let i = 1; i < 4; i++) { ctx.moveTo(10+i*stepW, topY); ctx.lineTo(10+i*stepW, botY); }
      ctx.stroke();
      ctx.fillStyle = isDark ? '#78716c' : '#78716c'; ctx.font = 'bold 8px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('1. Grit Screen', 10+stepW*0.5, topY-14);
      ctx.fillText('2. Aeration Tank', 10+stepW*1.5, topY-14);
      ctx.fillText('3. Settling Clarifier', 10+stepW*2.5, topY-14);
      ctx.fillText('4. UV Clean Sanit', 10+stepW*3.5, topY-14);
      ctx.strokeStyle = '#a8a29e'; ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let sx = 40; sx < 80; sx += 10) { ctx.moveTo(sx, topY+5); ctx.lineTo(sx, botY-5); }
      ctx.stroke();
      ctx.fillStyle = '#44403c'; ctx.fillRect(10+stepW+10, botY-8, stepW-20, 6);
      ctx.fillStyle = '#6e3c15'; ctx.beginPath();
      ctx.ellipse(10+stepW*2.5, botY, stepW*0.42, 10, 0, 0, Math.PI, true); ctx.fill();
      const flashPurp = Math.floor(190 + 60 * Math.sin(Date.now()/150));
      ctx.fillStyle = `rgba(${flashPurp},112,255,0.08)`;
      ctx.fillRect(10+stepW*3, topY, stepW, botY-topY);
      ctx.fillStyle = '#c084fc'; ctx.fillRect(10+stepW*3.5-2, topY+15, 4, 30);
      ctx.shadowBlur = 8; ctx.shadowColor = '#a855f7';
      ctx.beginPath(); ctx.arc(10+stepW*3.5, topY+45, 4, 0, Math.PI*2);
      ctx.fillStyle = '#e9d5ff'; ctx.fill();
      ctx.shadowBlur = 0;
      sewageParticles.current.forEach(p => {
        ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI*2);
        ctx.fillStyle = p.color; ctx.fill();
      });
    }

    // ----- WATER CYCLE -----
    else if (activeTab === 'watercycle') {
      // Sky gradient
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, isDark ? '#0c4a6e' : '#bae6fd');
      grad.addColorStop(0.7, isDark ? '#082f49' : '#e0f2fe');
      grad.addColorStop(1, '#1e40af');
      ctx.fillStyle = grad; ctx.fillRect(5, 5, W-10, H-10);
      // Sun
      ctx.fillStyle = '#fde047'; ctx.shadowBlur = 20; ctx.shadowColor = '#facc15';
      ctx.beginPath(); ctx.arc(40, 40, 18, 0, Math.PI*2); ctx.fill();
      ctx.shadowBlur = 0;
      // Mountains
      ctx.fillStyle = isDark ? '#334155' : '#64748b';
      ctx.beginPath();
      ctx.moveTo(0, 180); ctx.lineTo(60, 120); ctx.lineTo(120, 170); ctx.lineTo(180, 130);
      ctx.lineTo(240, 175); ctx.lineTo(300, 140); ctx.lineTo(W, 180); ctx.lineTo(W, H); ctx.lineTo(0, H);
      ctx.closePath(); ctx.fill();
      // Ocean
      ctx.fillStyle = isDark ? '#1e3a8a' : '#3b82f6';
      ctx.fillRect(0, H - 50, W, 50);
      // waves
      ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1;
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        const y = H - 40 + i*8;
        for (let x = 0; x < W; x += 5) {
          const yy = y + Math.sin((x + Date.now()*0.002 + i)*0.1) * 2;
          if (x === 0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
        }
        ctx.stroke();
      }
      // Particles
      waterParticles.current.forEach(p => {
        ctx.beginPath();
        if (p.type === 'vapor') {
          ctx.arc(p.x, p.y, 2, 0, Math.PI*2);
          ctx.fillStyle = 'rgba(186,230,253,0.7)';
        } else if (p.type === 'cloud') {
          ctx.arc(p.x, p.y, 6, 0, Math.PI*2);
          ctx.fillStyle = isDark ? 'rgba(226,232,240,0.6)' : 'rgba(255,255,255,0.9)';
        } else if (p.type === 'rain') {
          ctx.moveTo(p.x, p.y); ctx.lineTo(p.x, p.y + 4);
          ctx.strokeStyle = '#60a5fa'; ctx.lineWidth = 1.5; ctx.stroke();
          return;
        } else if (p.type === 'river') {
          ctx.arc(p.x, p.y, 2, 0, Math.PI*2);
          ctx.fillStyle = '#3b82f6';
        }
        ctx.fill();
      });
      // Labels
      ctx.fillStyle = '#fff'; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'left';
      ctx.fillText('☀ Evaporation', 65, 45);
      ctx.fillText('☁ Condensation', 150, 35);
      ctx.fillText('🌧 Precipitation', 220, 80);
      ctx.fillStyle = '#fde047'; ctx.fillText(`T = ${waterTemp}°C`, 10, H - 10);
      ctx.fillStyle = '#bae6fd'; ctx.fillText(`Humidity = ${waterHumidity}%`, 90, H - 10);
    }

    // ----- DNA -----
    else if (activeTab === 'dna') {
      ctx.fillStyle = isDark ? '#111115' : '#fafafa';
      ctx.fillRect(10, 10, W-20, H-20);
      ctx.strokeStyle = isDark ? '#27272a' : '#e4e4e7';
      ctx.strokeRect(10, 10, W-20, H-20);
      const spacingX = (W - 60) / (dnaChain.length - 1);
      const centerY = H/2;
      const amplitude = 50;
      dnaChain.forEach((base, i) => {
        const x = 30 + i * spacingX;
        const angle = i * 0.7 + Date.now() * 0.0015;
        const y1 = centerY + Math.sin(angle) * amplitude;
        const y2 = centerY - Math.sin(angle) * amplitude;
        ctx.strokeStyle = isDark ? '#44444f' : '#cbd5e1'; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(x, y1); ctx.lineTo(x, y2); ctx.stroke();
        ctx.beginPath(); ctx.arc(x, y1, 7.5, 0, Math.PI*2);
        const col1 = base === 'A' ? '#38bdf8' : base === 'T' ? '#fb7185' : base === 'G' ? '#fbbf24' : '#34d399';
        ctx.fillStyle = col1; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.stroke();
        ctx.fillStyle = '#0f172a'; ctx.font = 'bold 8px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(base, x, y1+0.3);
        const complement = base === 'A' ? 'T' : base === 'T' ? 'A' : base === 'G' ? 'C' : 'G';
        const col2 = complement === 'A' ? '#38bdf8' : complement === 'T' ? '#fb7185' : complement === 'G' ? '#fbbf24' : '#34d399';
        ctx.beginPath(); ctx.arc(x, y2, 7.5, 0, Math.PI*2);
        ctx.fillStyle = col2; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.stroke();
        ctx.fillStyle = '#0f172a'; ctx.fillText(complement, x, y2+0.3);
      });
    }

    ctx.restore();
  }, [
    viewMode, actors, activeTab, dnaChain, zoomLevel,
    bpm, adrenalineActive, showDeox, showOx,
    respiratoryMode, respirationRate, pollutionSpike, photosynthesisSpeed,
    sewageSpeed, aerationPower, sewageOrganicLoad,
    neuronStimulus, neuronMyelin, apTime,
    mitosisStage, bacteriaCount, bacteriaHistory,
    substrateConc, vmax, km,
    sirActors, sirHistory, sirBeta, sirGamma,
    waterTemp, waterHumidity,
    shape3D, rotX3D, rotY3D, zoom3D, p3A, p3B, p3C, p3Res,
    showWireframe, showFloor, showAxes3D
  ]);

  /* ---------- Mouse handlers ---------- */
  const handleMouseDown3D = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (viewMode !== '3d') return;
    dragRef.current = { x:e.clientX, y:e.clientY, rx:rotX3D, ry:rotY3D };
  };
  const handleMouseMove3D = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (viewMode !== '3d' || !dragRef.current) return;
    const dx = e.clientX - dragRef.current.x;
    const dy = e.clientY - dragRef.current.y;
    setRotY3D(dragRef.current.ry + dx * 0.01);
    setRotX3D(Math.max(-Math.PI/2+0.01, Math.min(Math.PI/2-0.01, dragRef.current.rx + dy * 0.01)));
  };
  const handleMouseUp3D = () => { dragRef.current = null; };
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    if (viewMode !== '3d') return;
    e.preventDefault();
    setZoom3D(z => Math.max(10, Math.min(300, z - e.deltaY * 0.1)));
  };

  const handleMutateStrand = () => {
    const bases = ['A','T','G','C'];
    setDnaChain(prev => {
      const idx = Math.floor(Math.random()*prev.length);
      const next = [...prev];
      const cur = next[idx];
      const choices = bases.filter(b => b !== cur);
      next[idx] = choices[Math.floor(Math.random()*choices.length)];
      return next;
    });
  };
  const handleInjectAdrenaline = () => {
    setAdrenalineActive(true);
    setTimeout(() => setAdrenalineActive(false), 4500);
  };
  const fireNeuron = () => {
    setApTime(0);
    neuronFiredRef.current = true;
  };

  const activeTabMeta = TABS.find(t => t.id === activeTab)!;

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
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  {viewMode === 'sim'
                    ? <Microscope size={16} className="text-emerald-500 animate-pulse" />
                    : <Box size={16} className="text-fuchsia-500" />}
                  <h3 className="font-bold text-sm tracking-tight">
                    {viewMode === 'sim' ? 'Biology Laboratory' : '3D Bio Playground'}
                  </h3>
                </div>
                <p className="text-xs text-[var(--theme-secondary)]">
                  {viewMode === 'sim'
                    ? 'Browse simulations by category:'
                    : 'Explore biomolecules in 3D:'}
                </p>
              </div>

              {/* Mode toggle */}
              <div className="grid grid-cols-2 gap-1 p-1 bg-[var(--theme-surface-alt)] rounded-xl border border-[var(--theme-border)]">
                <button
                  onClick={() => setViewMode('sim')}
                  className={`px-2 py-1.5 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all ${
                    viewMode === 'sim' ? 'bg-emerald-500 text-white shadow' : 'text-[var(--theme-secondary)] hover:text-[var(--theme-primary)]'
                  }`}
                >
                  <Microscope size={12} /> Simulation Lab
                </button>
                <button
                  onClick={() => setViewMode('3d')}
                  className={`px-2 py-1.5 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all ${
                    viewMode === '3d' ? 'bg-fuchsia-500 text-white shadow' : 'text-[var(--theme-secondary)] hover:text-[var(--theme-primary)]'
                  }`}
                >
                  <Box size={12} /> 3D Bio Lab
                </button>
              </div>

              {viewMode === 'sim' ? (
                <>
                  {/* Category chips */}
                  <div>
                    <span className="text-[10px] uppercase tracking-wider font-bold text-[var(--theme-secondary)] font-mono block mb-1.5 flex items-center gap-1">
                      <Filter size={10}/> Category
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {CATEGORIES.filter(c => c.id !== '3d').map(cat => (
                        <button
                          key={cat.id}
                          onClick={() => setActiveCategory(cat.id as BioCategory | 'all')}
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

                  {/* Tab list */}
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-[var(--theme-secondary)] font-mono block mb-1.5">
                      Simulations ({filteredTabs.length})
                    </span>
                    {filteredTabs.map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`w-full p-2.5 rounded-xl text-left text-xs font-semibold flex items-center justify-between border transition-all ${
                          activeTab === tab.id
                            ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400'
                            : 'bg-[var(--theme-surface)] border-[var(--theme-border)] text-[var(--theme-secondary)] hover:bg-[var(--theme-hover-bg)]'
                        }`}
                      >
                        <div className="truncate pr-1 flex items-center gap-2">
                          <span className={tab.color}>{tab.icon}</span>
                          <div className="min-w-0">
                            <span className="block truncate font-bold">{tab.label}</span>
                            <span className="text-[9px] opacity-70">{tab.subtitle}</span>
                          </div>
                        </div>
                        {activeTab === tab.id && <ChevronRight size={12} className="shrink-0"/>}
                      </button>
                    ))}
                  </div>

                  {/* TAB-SPECIFIC CONTROLS */}
                  <div className="border-t border-[var(--theme-border)] pt-4 space-y-4">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-[var(--theme-secondary)] font-mono block">
                      {activeTabMeta.label} · Parameters
                    </span>

                    {activeTab === 'ecosystem' && (
                      <>
                        <div>
                          <div className="flex justify-between text-xs font-bold font-mono mb-1">
                            <span>Rabbit Birth</span>
                            <span className="text-emerald-500">{(rabbitBirthRate*10).toFixed(2)}</span>
                          </div>
                          <input type="range" min="0.01" max="0.25" step="0.01" value={rabbitBirthRate}
                            onChange={e => setRabbitBirthRate(Number(e.target.value))}
                            className="w-full h-1.5 rounded-lg bg-[var(--theme-border)] appearance-none cursor-pointer accent-emerald-500"/>
                        </div>
                        <div>
                          <div className="flex justify-between text-xs font-bold font-mono mb-1">
                            <span>Wolf Hunger</span>
                            <span className="text-orange-500">{(wolfDeathRate*100).toFixed(1)}</span>
                          </div>
                          <input type="range" min="0.01" max="0.1" step="0.01" value={wolfDeathRate}
                            onChange={e => setWolfDeathRate(Number(e.target.value))}
                            className="w-full h-1.5 rounded-lg bg-[var(--theme-border)] appearance-none cursor-pointer accent-emerald-500"/>
                        </div>
                        <div>
                          <div className="flex justify-between text-xs font-bold font-mono mb-1">
                            <span>Hunting Efficiency</span>
                            <span className="text-emerald-500">{(huntingEfficiency*1000).toFixed(1)}</span>
                          </div>
                          <input type="range" min="0.002" max="0.04" step="0.002" value={huntingEfficiency}
                            onChange={e => setHuntingEfficiency(Number(e.target.value))}
                            className="w-full h-1.5 rounded-lg bg-[var(--theme-border)] appearance-none cursor-pointer accent-emerald-500"/>
                        </div>
                        <button onClick={initializeEcosystem}
                          className="w-full p-2 bg-[var(--theme-surface-alt)] border border-[var(--theme-border)] text-xs text-[var(--theme-secondary)] hover:text-emerald-500 rounded-lg flex items-center justify-center gap-1.5">
                          <RefreshCw size={12}/> Re-seed Grassland
                        </button>
                      </>
                    )}

                    {activeTab === 'epidemic' && (
                      <>
                        <div>
                          <div className="flex justify-between text-xs font-bold font-mono mb-1">
                            <span>Transmission β</span>
                            <span className="text-red-500">{sirBeta.toFixed(2)}</span>
                          </div>
                          <input type="range" min="0.05" max="0.9" step="0.05" value={sirBeta}
                            onChange={e => setSirBeta(Number(e.target.value))}
                            className="w-full h-1.5 rounded-lg bg-[var(--theme-border)] appearance-none cursor-pointer accent-red-500"/>
                        </div>
                        <div>
                          <div className="flex justify-between text-xs font-bold font-mono mb-1">
                            <span>Recovery γ</span>
                            <span className="text-emerald-500">{sirGamma.toFixed(2)}</span>
                          </div>
                          <input type="range" min="0.02" max="0.5" step="0.02" value={sirGamma}
                            onChange={e => setSirGamma(Number(e.target.value))}
                            className="w-full h-1.5 rounded-lg bg-[var(--theme-border)] appearance-none cursor-pointer accent-emerald-500"/>
                        </div>
                        <div className="p-2.5 bg-[var(--theme-surface-alt)] rounded-lg border border-[var(--theme-border)] text-[10px] text-[var(--theme-secondary)] leading-relaxed">
                          <strong className="text-[var(--theme-primary)]">R₀ = β/γ = {(sirBeta/sirGamma).toFixed(2)}</strong>
                          <br/>Epidemic grows if R₀ &gt; 1
                        </div>
                        <button onClick={initializeSIR}
                          className="w-full p-2 bg-[var(--theme-surface-alt)] border border-[var(--theme-border)] text-xs text-[var(--theme-secondary)] hover:text-red-500 rounded-lg flex items-center justify-center gap-1.5">
                          <RefreshCw size={12}/> Reset Outbreak
                        </button>
                      </>
                    )}

                    {activeTab === 'heart' && (
                      <>
                        <div>
                          <div className="flex justify-between text-xs font-bold font-mono mb-1">
                            <span>Resting BPM</span>
                            <span className="text-red-500">{adrenalineActive ? '135 ⚡' : bpm}</span>
                          </div>
                          <input type="range" min="50" max="130" step="5" disabled={adrenalineActive} value={bpm}
                            onChange={e => setBpm(Number(e.target.value))}
                            className="w-full h-1.5 rounded-lg bg-[var(--theme-border)] appearance-none cursor-pointer accent-red-500 disabled:opacity-50"/>
                        </div>
                        <label className="flex items-center gap-2 text-xs cursor-pointer">
                          <input type="checkbox" checked={showDeox} onChange={e => setShowDeox(e.target.checked)} className="accent-blue-500"/>
                          <span className="text-blue-500 font-bold">Deoxygenated (Blue)</span>
                        </label>
                        <label className="flex items-center gap-2 text-xs cursor-pointer">
                          <input type="checkbox" checked={showOx} onChange={e => setShowOx(e.target.checked)} className="accent-red-500"/>
                          <span className="text-red-500 font-bold">Oxygenated (Red)</span>
                        </label>
                        <button onClick={handleInjectAdrenaline} disabled={adrenalineActive}
                          className={`w-full p-2.5 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 ${
                            adrenalineActive ? 'bg-rose-600 text-white animate-pulse' : 'bg-red-500 hover:bg-red-600 text-white shadow'
                          }`}>
                          <Zap size={13}/>{adrenalineActive ? 'Injected!' : 'Inject Adrenaline'}
                        </button>
                      </>
                    )}

                    {activeTab === 'respiratory' && (
                      <>
                        <div className="flex bg-[var(--theme-surface-alt)] p-1 rounded-lg border border-[var(--theme-border)] gap-1">
                          <button onClick={() => setRespiratoryMode('global')}
                            className={`flex-1 text-center py-1.5 text-[10px] font-bold rounded-md ${respiratoryMode==='global' ? 'bg-[var(--theme-surface)] text-sky-500 border border-[var(--theme-border)]' : 'text-[var(--theme-secondary)]'}`}>
                            Global
                          </button>
                          <button onClick={() => setRespiratoryMode('capillary')}
                            className={`flex-1 text-center py-1.5 text-[10px] font-bold rounded-md ${respiratoryMode==='capillary' ? 'bg-[var(--theme-surface)] text-sky-500 border border-[var(--theme-border)]' : 'text-[var(--theme-secondary)]'}`}>
                            Capillary
                          </button>
                        </div>
                        <div>
                          <div className="flex justify-between text-xs font-bold font-mono mb-1">
                            <span>Breathing Rate</span>
                            <span className="text-sky-500">{respirationRate}/min</span>
                          </div>
                          <input type="range" min="8" max="32" step="2" value={respirationRate}
                            onChange={e => setRespirationRate(Number(e.target.value))}
                            className="w-full h-1.5 rounded-lg bg-[var(--theme-border)] appearance-none cursor-pointer accent-sky-500"/>
                        </div>
                        {respiratoryMode === 'global' ? (
                          <div>
                            <div className="flex justify-between text-xs font-bold font-mono mb-1">
                              <span>Photosynthesis</span>
                              <span className="text-sky-500">{photosynthesisSpeed}%</span>
                            </div>
                            <input type="range" min="10" max="100" step="5" value={photosynthesisSpeed}
                              onChange={e => setPhotosynthesisSpeed(Number(e.target.value))}
                              className="w-full h-1.5 rounded-lg bg-[var(--theme-border)] appearance-none cursor-pointer accent-sky-500"/>
                          </div>
                        ) : (
                          <div>
                            <div className="flex justify-between text-xs font-bold font-mono mb-1">
                              <span>CO₂ Pollution</span>
                              <span className="text-purple-500">{pollutionSpike}%</span>
                            </div>
                            <input type="range" min="0" max="100" value={pollutionSpike}
                              onChange={e => setPollutionSpike(Number(e.target.value))}
                              className="w-full h-1.5 rounded-lg bg-[var(--theme-border)] appearance-none cursor-pointer accent-sky-500"/>
                          </div>
                        )}
                      </>
                    )}

                    {activeTab === 'neuron' && (
                      <>
                        <label className="flex items-center gap-2 text-xs cursor-pointer">
                          <input type="checkbox" checked={neuronMyelin} onChange={e => setNeuronMyelin(e.target.checked)} className="accent-yellow-500"/>
                          <span className="font-bold">Myelinated axon</span>
                        </label>
                        <div className="p-2.5 bg-[var(--theme-surface-alt)] rounded-lg border border-[var(--theme-border)] text-[10px] text-[var(--theme-secondary)] leading-relaxed">
                          <strong className="text-[var(--theme-primary)]">Action potential:</strong>
                          {neuronMyelin ? ' Saltatory conduction (2× faster) via Nodes of Ranvier' : ' Continuous propagation along membrane'}
                        </div>
                        <button onClick={fireNeuron}
                          className="w-full p-2.5 bg-yellow-500 hover:bg-yellow-600 font-bold text-white rounded-xl text-xs flex items-center justify-center gap-1.5 shadow">
                          <Zap size={13}/> Trigger Stimulus
                        </button>
                      </>
                    )}

                    {activeTab === 'mitosis' && (
                      <>
                        <div>
                          <div className="flex justify-between text-xs font-bold font-mono mb-1">
                            <span>Speed</span>
                            <span className="text-purple-500">{mitosisSpeed.toFixed(1)}×</span>
                          </div>
                          <input type="range" min="0.2" max="3" step="0.1" value={mitosisSpeed}
                            onChange={e => setMitosisSpeed(Number(e.target.value))}
                            className="w-full h-1.5 rounded-lg bg-[var(--theme-border)] appearance-none cursor-pointer accent-purple-500"/>
                        </div>
                        <div className="grid grid-cols-5 gap-1">
                          {['I','P','M','A','T'].map((l, i) => (
                            <button key={i} onClick={() => setMitosisStage(i)}
                              className={`p-1.5 text-[10px] font-bold rounded border ${
                                mitosisStage === i ? 'bg-purple-500 text-white border-purple-500' : 'bg-[var(--theme-surface-alt)] border-[var(--theme-border)] text-[var(--theme-secondary)]'
                              }`}>
                              {l}
                            </button>
                          ))}
                        </div>
                      </>
                    )}

                    {activeTab === 'bacteria' && (
                      <>
                        <div>
                          <div className="flex justify-between text-xs font-bold font-mono mb-1">
                            <span>Growth Rate</span>
                            <span className="text-lime-500">{bacteriaRate.toFixed(2)}</span>
                          </div>
                          <input type="range" min="0.1" max="1.5" step="0.05" value={bacteriaRate}
                            onChange={e => setBacteriaRate(Number(e.target.value))}
                            className="w-full h-1.5 rounded-lg bg-[var(--theme-border)] appearance-none cursor-pointer accent-lime-500"/>
                        </div>
                        <div>
                          <div className="flex justify-between text-xs font-bold font-mono mb-1">
                            <span>Carrying Cap. (K)</span>
                            <span className="text-red-500">{bacteriaCapacity}</span>
                          </div>
                          <input type="range" min="40" max="300" step="10" value={bacteriaCapacity}
                            onChange={e => setBacteriaCapacity(Number(e.target.value))}
                            className="w-full h-1.5 rounded-lg bg-[var(--theme-border)] appearance-none cursor-pointer accent-red-500"/>
                        </div>
                        <button onClick={initializeBacteria}
                          className="w-full p-2 bg-[var(--theme-surface-alt)] border border-[var(--theme-border)] text-xs text-[var(--theme-secondary)] hover:text-lime-500 rounded-lg flex items-center justify-center gap-1.5">
                          <RefreshCw size={12}/> Re-inoculate Dish
                        </button>
                      </>
                    )}

                    {activeTab === 'enzyme' && (
                      <>
                        <div>
                          <div className="flex justify-between text-xs font-bold font-mono mb-1">
                            <span>Substrate [S]</span>
                            <span className="text-blue-500">{substrateConc}</span>
                          </div>
                          <input type="range" min="1" max="100" step="1" value={substrateConc}
                            onChange={e => setSubstrateConc(Number(e.target.value))}
                            className="w-full h-1.5 rounded-lg bg-[var(--theme-border)] appearance-none cursor-pointer accent-blue-500"/>
                        </div>
                        <div>
                          <div className="flex justify-between text-xs font-bold font-mono mb-1">
                            <span>Vmax</span>
                            <span className="text-amber-500">{vmax}</span>
                          </div>
                          <input type="range" min="20" max="200" step="5" value={vmax}
                            onChange={e => setVmax(Number(e.target.value))}
                            className="w-full h-1.5 rounded-lg bg-[var(--theme-border)] appearance-none cursor-pointer accent-amber-500"/>
                        </div>
                        <div>
                          <div className="flex justify-between text-xs font-bold font-mono mb-1">
                            <span>Km (affinity)</span>
                            <span className="text-purple-500">{km}</span>
                          </div>
                          <input type="range" min="5" max="80" step="1" value={km}
                            onChange={e => setKm(Number(e.target.value))}
                            className="w-full h-1.5 rounded-lg bg-[var(--theme-border)] appearance-none cursor-pointer accent-purple-500"/>
                        </div>
                        <div className="p-2.5 bg-[var(--theme-surface-alt)] rounded-lg border border-[var(--theme-border)] text-[10px] text-[var(--theme-secondary)] leading-relaxed font-mono">
                          v = (Vmax·[S]) / (Km + [S])<br/>
                          <strong className="text-amber-500">= {(vmax*substrateConc/(km+substrateConc)).toFixed(2)}</strong>
                        </div>
                      </>
                    )}

                    {activeTab === 'dna' && (
                      <button onClick={handleMutateStrand}
                        className="w-full p-2.5 bg-blue-500 hover:bg-blue-600 font-bold text-white rounded-xl text-xs flex items-center justify-center gap-1.5 shadow">
                        <RefreshCw size={13}/> Induce Point Mutation
                      </button>
                    )}

                    {activeTab === 'sewage' && (
                      <>
                        <div>
                          <div className="flex justify-between text-xs font-bold font-mono mb-1">
                            <span>Inflow Rate</span>
                            <span className="text-amber-500">{sewageSpeed.toFixed(1)}×</span>
                          </div>
                          <input type="range" min="0.2" max="2.5" step="0.1" value={sewageSpeed}
                            onChange={e => setSewageSpeed(Number(e.target.value))}
                            className="w-full h-1.5 rounded-lg bg-[var(--theme-border)] appearance-none cursor-pointer accent-amber-500"/>
                        </div>
                        <div>
                          <div className="flex justify-between text-xs font-bold font-mono mb-1">
                            <span>Aeration Power</span>
                            <span className="text-amber-500">{aerationPower}%</span>
                          </div>
                          <input type="range" min="10" max="100" step="5" value={aerationPower}
                            onChange={e => setAerationPower(Number(e.target.value))}
                            className="w-full h-1.5 rounded-lg bg-[var(--theme-border)] appearance-none cursor-pointer accent-amber-500"/>
                        </div>
                        <div>
                          <div className="flex justify-between text-xs font-bold font-mono mb-1">
                            <span>Organic Load</span>
                            <span className="text-amber-500">{sewageOrganicLoad}</span>
                          </div>
                          <input type="range" min="5" max="50" step="5" value={sewageOrganicLoad}
                            onChange={e => setSewageOrganicLoad(Number(e.target.value))}
                            className="w-full h-1.5 rounded-lg bg-[var(--theme-border)] appearance-none cursor-pointer accent-amber-500"/>
                        </div>
                      </>
                    )}

                    {activeTab === 'watercycle' && (
                      <>
                        <div>
                          <div className="flex justify-between text-xs font-bold font-mono mb-1">
                            <span>Temperature</span>
                            <span className="text-orange-500">{waterTemp}°C</span>
                          </div>
                          <input type="range" min="5" max="40" step="1" value={waterTemp}
                            onChange={e => setWaterTemp(Number(e.target.value))}
                            className="w-full h-1.5 rounded-lg bg-[var(--theme-border)] appearance-none cursor-pointer accent-orange-500"/>
                        </div>
                        <div>
                          <div className="flex justify-between text-xs font-bold font-mono mb-1">
                            <span>Humidity</span>
                            <span className="text-sky-500">{waterHumidity}%</span>
                          </div>
                          <input type="range" min="20" max="100" step="5" value={waterHumidity}
                            onChange={e => setWaterHumidity(Number(e.target.value))}
                            className="w-full h-1.5 rounded-lg bg-[var(--theme-border)] appearance-none cursor-pointer accent-sky-500"/>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Global action */}
                  <div className="border-t border-[var(--theme-border)] pt-4">
                    <button onClick={() => setAnimating(!animating)}
                      className={`w-full p-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 text-white ${
                        animating ? 'bg-orange-500 hover:bg-orange-600' : 'bg-green-500 hover:bg-green-600'
                      }`}>
                      {animating ? <Pause size={13}/> : <Play size={13}/>}
                      {animating ? 'Pause Simulation' : 'Resume Simulation'}
                    </button>
                  </div>
                </>
              ) : (
                /* ============== 3D SIDEBAR ============== */
                <>
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-[var(--theme-secondary)] font-mono block mb-1.5">
                      Biomolecule Presets ({BIO_3D_SHAPES.length})
                    </span>
                    {BIO_3D_SHAPES.map(s => (
                      <button
                        key={s.id}
                        onClick={() => setShape3D(s)}
                        className={`w-full p-2.5 rounded-xl text-left text-xs font-semibold flex items-center justify-between border transition-all ${
                          shape3D.id === s.id
                            ? 'bg-fuchsia-500/10 border-fuchsia-500 text-fuchsia-600 dark:text-fuchsia-400'
                            : 'bg-[var(--theme-surface)] border-[var(--theme-border)] text-[var(--theme-secondary)] hover:bg-[var(--theme-hover-bg)]'
                        }`}
                      >
                        <div className="truncate pr-1">
                          <span className="block truncate font-bold">{s.name}</span>
                          <span className="text-[9px] opacity-70">{s.description}</span>
                        </div>
                        {shape3D.id === s.id && <Check size={12} className="shrink-0"/>}
                      </button>
                    ))}
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
                        <div className="flex justify-between text-xs font-bold font-mono mb-1">
                          <span>{p.label}</span>
                          <span className="text-fuchsia-500">{p.val.toFixed(1)}</span>
                        </div>
                        <input type="range" min={p.min} max={p.max} step={0.05}
                          value={p.val} onChange={e => p.set(Number(e.target.value))}
                          className="w-full h-1.5 rounded-lg bg-[var(--theme-border)] appearance-none cursor-pointer accent-fuchsia-500"/>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-[var(--theme-border)] pt-4 space-y-2.5">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-[var(--theme-secondary)] font-mono block">
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
                        {t.icon}
                        {t.label}
                      </label>
                    ))}
                    <button onClick={() => { setRotX3D(-0.4); setRotY3D(0.6); setZoom3D(70); }}
                      className="w-full mt-2 px-3 py-1.5 rounded-lg text-[11px] font-bold border border-[var(--theme-border)] text-[var(--theme-secondary)] hover:text-fuchsia-500 hover:border-fuchsia-500 flex items-center justify-center gap-1.5">
                      <RotateCcw size={12}/> Reset Camera
                    </button>
                  </div>

                  <div className="border-t border-[var(--theme-border)] pt-3 text-[10px] text-[var(--theme-secondary)] leading-relaxed">
                    <p className="font-bold text-[var(--theme-primary)] mb-1">Controls</p>
                    <p>• Drag to orbit · Scroll to zoom</p>
                    <p>• Sliders deform the biomolecule</p>
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
            <button onClick={() => setIsSidebarOpen(p => !p)}
              className={`p-1.5 rounded-xl border flex items-center justify-center transition-all cursor-pointer h-8 px-2.5 gap-1.5 text-xs font-bold leading-none ${
                isSidebarOpen ? 'bg-[var(--theme-surface-alt)] border-[var(--theme-accent)] text-[var(--theme-accent)]'
                             : 'bg-[var(--theme-surface)] border-[var(--theme-border)] text-[var(--theme-primary)] hover:bg-[var(--theme-hover-bg)]'
              }`}>
              <Sliders size={12}/>
              <span className="hidden sm:inline">{isSidebarOpen ? 'Hide' : 'Controls'}</span>
            </button>
            <span className={`h-2 w-2 rounded-full animate-pulse ${viewMode === 'sim' ? 'bg-emerald-500' : 'bg-fuchsia-500'}`}/>
            <span className="text-xs font-bold uppercase font-mono tracking-wider">
              {viewMode === 'sim' ? `${activeTabMeta.label} · Simulation` : '3D Biomolecular Playground'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {viewMode === 'sim' && (
              <div className="hidden lg:flex items-center gap-1.5 border-r border-[var(--theme-border)] pr-2 h-8 mr-1">
                <select value={activeTab} onChange={e => setActiveTab(e.target.value as BioTab)}
                  className="bg-[var(--theme-surface)] text-[var(--theme-primary)] border border-[var(--theme-border)] hover:bg-[var(--theme-hover-bg)] text-[11px] py-1 px-2.5 rounded-lg font-bold cursor-pointer outline-none max-w-[180px] truncate">
                  {TABS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
              </div>
            )}

            {viewMode === '3d' && (
              <div className="hidden lg:flex items-center gap-1.5 border-r border-[var(--theme-border)] pr-2 h-8 mr-1">
                <button onClick={() => setAutoRotate(p => !p)}
                  className={`h-7 px-2.5 rounded-lg text-[10px] uppercase tracking-wider font-extrabold border transition-all cursor-pointer flex items-center gap-1 ${
                    autoRotate ? 'bg-fuchsia-500/15 border-fuchsia-500/40 text-fuchsia-500'
                               : 'bg-[var(--theme-surface)] border-[var(--theme-border)] text-zinc-500'}`}>
                  {autoRotate ? <Pause size={10}/> : <Play size={10}/>}
                  {autoRotate ? 'Stop' : 'Spin'}
                </button>
                <button onClick={() => setShowWireframe(p => !p)}
                  className={`h-7 px-2.5 rounded-lg text-[10px] uppercase tracking-wider font-extrabold border transition-all cursor-pointer flex items-center gap-1 ${
                    showWireframe ? 'bg-fuchsia-500/15 border-fuchsia-500/40 text-fuchsia-500'
                                  : 'bg-[var(--theme-surface)] border-[var(--theme-border)] text-zinc-500'}`}>
                  {showWireframe ? <Eye size={10}/> : <EyeOff size={10}/>}
                  Wire
                </button>
              </div>
            )}

            <div className="flex items-center bg-[var(--theme-surface-alt)] border border-[var(--theme-border)] rounded-xl overflow-hidden h-8">
              <button onClick={() => {
                  if (viewMode === 'sim') setZoomLevel(p => Math.max(0.25, Number((p-0.25).toFixed(2))));
                }}
                className="h-full px-3 text-[var(--theme-secondary)] hover:text-[var(--theme-primary)] hover:bg-[var(--theme-hover-bg)] border-r border-[var(--theme-border)] transition-all cursor-pointer flex items-center justify-center font-bold text-sm">
                <ZoomOut size={12} className="mr-0.5"/><span>−</span>
              </button>
              <div className="px-2.5 font-mono text-[10px] text-[var(--theme-secondary)] select-none font-bold min-w-[48px] text-center">
                {Math.round((viewMode === 'sim' ? zoomLevel : zoom3D/70) * 100)}%
              </div>
              <button onClick={() => {
                  if (viewMode === 'sim') setZoomLevel(p => Math.min(4.0, Number((p+0.25).toFixed(2))));
                }}
                className="h-full px-3 text-[var(--theme-secondary)] hover:text-[var(--theme-primary)] hover:bg-[var(--theme-hover-bg)] border-l border-[var(--theme-border)] transition-all cursor-pointer flex items-center justify-center font-bold text-sm">
                <ZoomIn size={12} className="mr-0.5"/><span>+</span>
              </button>
            </div>

            <button onClick={() => {
                if (viewMode === 'sim') { setZoomLevel(1); }
                else { setP3A(2); setP3B(1); setP3C(2); setP3Res(24); setRotX3D(-0.4); setRotY3D(0.6); setZoom3D(70); }
              }}
              className="h-8 px-3 text-xs bg-[var(--theme-surface)] border border-[var(--theme-border)] text-[var(--theme-secondary)] hover:text-emerald-500 rounded-xl transition-all flex items-center gap-1 cursor-pointer">
              <RotateCcw size={13}/> Reset
            </button>

            {onClose && (
              <button onClick={onClose}
                className="p-1.5 bg-[var(--theme-surface-alt)] border border-[var(--theme-border)] text-[var(--theme-secondary)] hover:text-red-500 rounded-xl transition-colors cursor-pointer h-8 w-8 flex items-center justify-center hover:bg-red-500/10 hover:border-red-500">
                <X size={14}/>
              </button>
            )}
          </div>
        </div>

        {/* HUD */}
        <div className="bg-[var(--theme-surface)] border-b border-[var(--theme-border)]/50 px-4 py-2 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-[var(--theme-secondary)] font-medium">
              {viewMode === 'sim' ? 'Simulation:' : 'Biomolecule:'}
            </span>
            <span className={`font-mono font-bold ${viewMode === 'sim' ? 'text-emerald-500' : 'text-fuchsia-500'}`}>
              {viewMode === 'sim' ? activeTabMeta.label : shape3D.name}
            </span>
            {viewMode === 'sim' && (
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[var(--theme-surface-alt)] border border-[var(--theme-border)] text-[var(--theme-secondary)] ml-1">
                {CATEGORIES.find(c => c.id === activeTabMeta.category)?.label}
              </span>
            )}
          </div>
          {viewMode === 'sim' && activeTab === 'ecosystem' && (
            <div className="text-[10px] font-mono font-bold text-[var(--theme-secondary)]">
              🐰 <span className="text-emerald-500">{actors.filter(a => a.type==='rabbit').length}</span> · 🐺 <span className="text-orange-500">{actors.filter(a => a.type==='wolf').length}</span>
            </div>
          )}
          {viewMode === 'sim' && activeTab === 'epidemic' && (
            <div className="text-[10px] font-mono font-bold text-[var(--theme-secondary)]">
              S:<span className="text-emerald-500">{sirActors.filter(a=>a.state==='S').length}</span> · I:<span className="text-red-500">{sirActors.filter(a=>a.state==='I').length}</span> · R:<span className="text-zinc-400">{sirActors.filter(a=>a.state==='R').length}</span>
            </div>
          )}
          {viewMode === 'sim' && activeTab === 'bacteria' && (
            <div className="text-[10px] font-mono font-bold text-lime-500">
              Colony: {bacteriaCount}
            </div>
          )}
        </div>

        {/* Canvas */}
        <div className="flex-1 min-h-0 flex items-center justify-center p-4 relative">
          <canvas
            ref={canvasRef}
            width={340}
            height={260}
            onMouseMove={handleMouseMove3D}
            onMouseLeave={handleMouseUp3D}
            onMouseDown={handleMouseDown3D}
            onMouseUp={handleMouseUp3D}
            onWheel={handleWheel}
            className={`w-full max-w-[560px] h-[420px] border border-transparent rounded-2xl ${
              viewMode === '3d' ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'
            }`}
          />

          {viewMode === '3d' && (
            <div className="absolute bottom-4 left-4 right-4 bg-[var(--theme-surface)]/85 backdrop-blur-md border border-[var(--theme-border)] rounded-xl p-3 text-[10px] text-[var(--theme-secondary)] text-center">
              <strong className="text-fuchsia-500">{shape3D.name}</strong> · {shape3D.description}
            </div>
          )}

          {viewMode === 'sim' && activeTab === 'mitosis' && (
            <div className="absolute bottom-4 left-4 right-4 bg-[var(--theme-surface)]/85 backdrop-blur-md border border-[var(--theme-border)] rounded-xl p-3 text-[10px] text-[var(--theme-secondary)] text-center">
              <strong className="text-purple-500">PMAT</strong> — Prophase · Metaphase · Anaphase · Telophase
            </div>
          )}
        </div>
      </div>
    </div>
  );
};