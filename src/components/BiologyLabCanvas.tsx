import React, { useState, useEffect, useRef } from 'react';
import { 
  X, ZoomIn, ZoomOut, Play, Pause, RotateCcw, Shield, Flower2, RefreshCw, LineChart, HelpCircle, Activity
} from 'lucide-react';

interface Actor {
  id: number;
  type: 'rabbit' | 'wolf';
  x: number;
  y: number;
  vx: number;
  vy: number;
  energy: number; // wolves need energy to survive
}

export const BiologyLabCanvas: React.FC<{
  onClose?: () => void;
  isInline?: boolean;
}> = ({ onClose, isInline = true }) => {
  const [animating, setAnimating] = useState<boolean>(true);
  const [rabbitBirthRate, setRabbitBirthRate] = useState<number>(0.08); // speed of rabbit reproduction
  const [wolfDeathRate, setWolfDeathRate] = useState<number>(0.04); // speed of wolf starvation
  const [huntingEfficiency, setHuntingEfficiency] = useState<number>(0.012); // probability of eating rabbit on contact
  const [ecosystemCarryingCapacity, setEcosystemCarryingCapacity] = useState<number>(180);

  const [actors, setActors] = useState<Actor[]>([]);
  const [populationHistory, setPopulationHistory] = useState<{ rabbits: number; wolves: number }[]>([]);
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [activeTab, setActiveTab] = useState<'ecosystem' | 'dna'>('ecosystem');
  const [dnaChain, setDnaChain] = useState<string[]>(['A', 'T', 'G', 'C', 'C', 'A', 'T', 'G', 'G', 'T', 'A', 'C']);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const idCounter = useRef<number>(0);

  // Initialize populations
  const initializeEcosystem = () => {
    const list: Actor[] = [];
    idCounter.current = 0;

    // Build 50 Rabbits
    for (let i = 0; i < 40; i++) {
      list.push({
        id: idCounter.current++,
        type: 'rabbit',
        x: Math.random() * 280 + 20,
        y: Math.random() * 220 + 20,
        vx: (Math.random() - 0.5) * 5,
        vy: (Math.random() - 0.5) * 5,
        energy: 100
      });
    }

    // Build 8 Wolves
    for (let i = 0; i < 7; i++) {
      list.push({
        id: idCounter.current++,
        type: 'wolf',
        x: Math.random() * 280 + 20,
        y: Math.random() * 220 + 20,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4,
        energy: 120
      });
    }

    setActors(list);
    setPopulationHistory([{ rabbits: 40, wolves: 7 }]);
  };

  useEffect(() => {
    initializeEcosystem();
  }, []);

  // Frame Updates for Ecosystem Loop
  useEffect(() => {
    if (!animating || activeTab !== 'ecosystem') return;

    let animId: number;

    const gameTick = () => {
      setActors(prev => {
        // Separate actors
        const rabbits = prev.filter(a => a.type === 'rabbit');
        const wolves = prev.filter(a => a.type === 'wolf');

        let nextRabbits: Actor[] = [...rabbits];
        let nextWolves: Actor[] = [...wolves];

        // 1. Breed Rabbits with some birth probability (up to carrying capacity)
        if (rabbits.length > 2 && rabbits.length < ecosystemCarryingCapacity && Math.random() < rabbitBirthRate) {
          const parent = rabbits[Math.floor(Math.random() * rabbits.length)];
          nextRabbits.push({
            id: idCounter.current++,
            type: 'rabbit',
            x: Math.max(10, Math.min(310, parent.x + (Math.random() - 0.5) * 15)),
            y: Math.max(10, Math.min(250, parent.y + (Math.random() - 0.5) * 15)),
            vx: (Math.random() - 0.5) * 5,
            vy: (Math.random() - 0.5) * 5,
            energy: 100
          });
        }

        // 2. Wolves seek closest rabbits and drift towards them, starve otherwise
        nextWolves = nextWolves.map(wolf => {
          let closestRabbit: Actor | null = null;
          let minDist = 99999;

          nextRabbits.forEach(rab => {
            const dist = Math.hypot(rab.x - wolf.x, rab.y - wolf.y);
            if (dist < minDist) {
              minDist = dist;
              closestRabbit = rab;
            }
          });

          let nvx = wolf.vx;
          let nvy = wolf.vy;

          if (closestRabbit) {
            // steer towards closest rabbit slightly
            const target: Actor = closestRabbit;
            const dx = target.x - wolf.x;
            const dy = target.y - wolf.y;
            nvx += (dx / minDist) * 0.18;
            nvy += (dy / minDist) * 0.18;

            // clamp velocity speed
            const speed = Math.hypot(nvx, nvy) || 1;
            nvx = (nvx / speed) * 3.5;
            nvy = (nvy / speed) * 3.5;
          }

          // lose energy over time
          const energyNext = wolf.energy - wolfDeathRate * 18;

          return {
            ...wolf,
            vx: nvx,
            vy: nvy,
            energy: energyNext
          };
        }).filter(w => w.energy > 0); // starve to death if energy <= 0

        // 3. Wolves eat rabbits
        const actualSurvivors: Actor[] = [];
        nextRabbits.forEach(rab => {
          let standsEaten = false;

          nextWolves.forEach(wolf => {
            const dist = Math.hypot(rab.x - wolf.x, rab.y - wolf.y);
            if (dist < 18 && Math.random() < huntingEfficiency * 15) {
              standsEaten = true;
              wolf.energy = Math.min(200, wolf.energy + 60); // gain energy
            }
          });

          if (!standsEaten) {
            actualSurvivors.push(rab);
          }
        });

        // 4. Wolf Breed on high energy
        const breedingWolves: Actor[] = [];
        nextWolves.forEach(w => {
          breedingWolves.push(w);
          if (w.energy > 165 && Math.random() < 0.05) {
            w.energy = 90; // split energy
            breedingWolves.push({
              id: idCounter.current++,
              type: 'wolf',
              x: Math.max(10, Math.min(310, w.x + (Math.random() - 0.5) * 10)),
              y: Math.max(10, Math.min(250, w.y + (Math.random() - 0.5) * 10)),
              vx: (Math.random() - 0.5) * 4,
              vy: (Math.random() - 0.5) * 4,
              energy: 100
            });
          }
        });

        // Move all survivors
        const updatedMoved: Actor[] = [...actualSurvivors, ...breedingWolves].map(p => {
          let nx = p.x + p.vx;
          let ny = p.y + p.vy;

          let nvx = p.vx;
          let nvy = p.vy;

          // Field limits: x: [0, 320], y: [0, 260]
          if (nx < 8 || nx > 312) {
            nvx = -p.vx;
            nx = Math.max(8, Math.min(312, nx));
          }
          if (ny < 8 || ny > 252) {
            nvy = -p.vy;
            ny = Math.max(8, Math.min(252, ny));
          }

          return {
            ...p,
            x: nx,
            y: ny,
            vx: nvx,
            vy: nvy
          };
        });

        return updatedMoved;
      });

      animId = requestAnimationFrame(gameTick);
    };

    animId = requestAnimationFrame(gameTick);
    return () => cancelAnimationFrame(animId);
  }, [animating, rabbitBirthRate, wolfDeathRate, huntingEfficiency, ecosystemCarryingCapacity, activeTab]);

  // Periodic population tracking
  useEffect(() => {
    if (!animating || activeTab !== 'ecosystem') return;
    const interval = setInterval(() => {
      setActors(p => {
        const rabbits = p.filter(a => a.type === 'rabbit').length;
        const wolves = p.filter(a => a.type === 'wolf').length;
        setPopulationHistory(prev => [...prev.slice(-40), { rabbits, wolves }]);
        return p;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [animating, activeTab]);

  // Render Biology simulation on Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    ctx.save();
    // Apply layout Zoom
    ctx.translate(width / 2, height / 2);
    ctx.scale(zoomLevel, zoomLevel);
    ctx.translate(-width / 2, -height / 2);

    if (activeTab === 'ecosystem') {
      // Ecosystem background grass field
      ctx.fillStyle = '#f0fdf4';
      if (document.documentElement.classList.contains('dark')) {
        ctx.fillStyle = '#052e1644';
      }
      ctx.fillRect(5, 5, width - 10, height - 10);

      // Boundaries outline
      ctx.strokeStyle = '#22c55e44';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(5, 5, width - 10, height - 10);

      // Draw carrying capacity dashed limit
      ctx.strokeStyle = '#ef444422';
      ctx.setLineDash([4, 6]);
      ctx.beginPath();
      ctx.moveTo(0, height - 50);
      ctx.lineTo(width, height - 50);
      ctx.stroke();
      ctx.setLineDash([]);

      // Render Actors
      actors.forEach(act => {
        ctx.beginPath();
        if (act.type === 'rabbit') {
          // Cute jumping Rabbit (green dot)
          ctx.arc(act.x, act.y, 4.5, 0, Math.PI * 2);
          ctx.fillStyle = '#4ade80';
          ctx.shadowBlur = 3;
          ctx.shadowColor = '#4ade80';
          ctx.fill();
          ctx.shadowBlur = 0; // reset
          ctx.strokeStyle = '#15803d';
          ctx.lineWidth = 1;
          ctx.stroke();

          // Small ears
          ctx.beginPath();
          ctx.ellipse(act.x - 2, act.y - 5, 1.2, 4, -0.15, 0, Math.PI * 2);
          ctx.ellipse(act.x + 2, act.y - 5, 1.2, 4, 0.15, 0, Math.PI * 2);
          ctx.fillStyle = '#bbf7d0';
          ctx.fill();
        } else {
          // Wolf (Predator)
          ctx.arc(act.x, act.y, 8, 0, Math.PI * 2);
          ctx.fillStyle = '#f97316';
          ctx.shadowBlur = 5;
          ctx.shadowColor = '#f97316';
          ctx.fill();
          ctx.shadowBlur = 0; // reset
          ctx.strokeStyle = '#b45309';
          ctx.lineWidth = 1.2;
          ctx.stroke();

          // Wolf golden hunting eyes
          ctx.fillStyle = '#ffeb3b';
          ctx.beginPath();
          ctx.arc(act.x - 2.5, act.y - 1.5, 1.5, 0, Math.PI * 2);
          ctx.arc(act.x + 2.5, act.y - 1.5, 1.5, 0, Math.PI * 2);
          ctx.fill();

          // Wolf small fangs
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(act.x - 2, act.y + 3);
          ctx.lineTo(act.x - 3, act.y + 6);
          ctx.moveTo(act.x + 2, act.y + 3);
          ctx.lineTo(act.x + 3, act.y + 6);
          ctx.stroke();
        }
      });
    } else {
      // DNA Double Helix Mode
      ctx.fillStyle = '#fafafa';
      if (document.documentElement.classList.contains('dark')) {
        ctx.fillStyle = '#1e1e247a';
      }
      ctx.fillRect(10, 10, width - 20, height - 20);

      // Render 2 linked swirling DNA ribbons
      const spacingX = (width - 60) / (dnaChain.length - 1);
      const centerY = height / 2;
      const amplitude = 50;

      // Draw strands connectors
      dnaChain.forEach((base, i) => {
        const x = 30 + i * spacingX;
        const angle = i * 0.7 + Date.now() * 0.0015;
        const y1 = centerY + Math.sin(angle) * amplitude;
        const y2 = centerY - Math.sin(angle) * amplitude;

        // Base pairs pairing lines
        ctx.strokeStyle = '#94a3b866';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(x, y1);
        ctx.lineTo(x, y2);
        ctx.stroke();

        // Base 1 Dot
        ctx.beginPath();
        ctx.arc(x, y1, 7.5, 0, Math.PI * 2);
        const col1 = base === 'A' ? '#38bdf8' : base === 'T' ? '#fb7185' : base === 'G' ? '#fbbf24' : '#34d399';
        ctx.fillStyle = col1;
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();

        // Label 1
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 8px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(base, x, y1 + 0.3);

        // Complementary pairing Base 2 Dot (A-T, G-C)
        const complement = base === 'A' ? 'T' : base === 'T' ? 'A' : base === 'G' ? 'C' : 'G';
        const col2 = complement === 'A' ? '#38bdf8' : complement === 'T' ? '#fb7185' : complement === 'G' ? '#fbbf24' : '#34d399';
        ctx.beginPath();
        ctx.arc(x, y2, 7.5, 0, Math.PI * 2);
        ctx.fillStyle = col2;
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();

        // Label 2
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 8px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(complement, x, y2 + 0.3);
      });

      // Red helix backbone ribbons
      ctx.strokeStyle = '#ef444444';
      ctx.lineWidth = 4;
      ctx.beginPath();
      dnaChain.forEach((_, i) => {
        const x = 30 + i * spacingX;
        const angle = i * 0.7 + Date.now() * 0.0015;
        const y1 = centerY + Math.sin(angle) * amplitude;
        if (i === 0) ctx.moveTo(x, y1);
        else ctx.lineTo(x, y1);
      });
      ctx.stroke();

      // Blue complementary backbone helix
      ctx.strokeStyle = '#3b82f644';
      ctx.beginPath();
      dnaChain.forEach((_, i) => {
        const x = 30 + i * spacingX;
        const angle = i * 0.7 + Date.now() * 0.0015;
        const y2 = centerY - Math.sin(angle) * amplitude;
        if (i === 0) ctx.moveTo(x, y2);
        else ctx.lineTo(x, y2);
      });
      ctx.stroke();
    }

    ctx.restore();
  }, [actors, activeTab, dnaChain, zoomLevel]);

  // Transcribe nucleotide button handler
  const handleMutateStrand = () => {
    const bases = ['A', 'T', 'G', 'C'];
    setDnaChain(prev => {
      const idx = Math.floor(Math.random() * prev.length);
      const nextBases = [...prev];
      const cur = nextBases[idx];
      const choices = bases.filter(b => b !== cur);
      nextBases[idx] = choices[Math.floor(Math.random() * choices.length)];
      return nextBases;
    });
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row h-full w-full min-h-0 text-[var(--theme-primary)]">
      {/* LEFT COLUMN: Controls & Presets */}
      <div className="w-full md:w-80 border-b md:border-b-0 md:border-r border-[var(--theme-border)] p-4 flex flex-col gap-4 overflow-y-auto custom-scrollbar shrink-0">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <Activity size={16} className="text-emerald-500 animate-pulse" />
            <h3 className="font-bold text-sm tracking-tight">Biology Simulation</h3>
          </div>
          <p className="text-xs text-[var(--theme-secondary)]">Toggle between dynamic ecosystem modeling or gene double helix exploration:</p>
        </div>

        {/* Tab switcher */}
        <div className="flex bg-[var(--theme-surface-alt)] p-1 rounded-xl border border-[var(--theme-border)]">
          <button
            type="button"
            onClick={() => setActiveTab('ecosystem')}
            className={`flex-1 text-center py-1.5 text-xs font-semibold rounded-lg transition-all border cursor-pointer ${
              activeTab === 'ecosystem'
                ? 'bg-[var(--theme-surface)] border-[var(--theme-border)] text-[var(--theme-primary)] shadow-sm font-bold'
                : 'border-transparent text-[var(--theme-secondary)] hover:text-[var(--theme-primary)]'
            }`}
          >
            Ecosystem (Lotka-Volterra)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('dna')}
            className={`flex-1 text-center py-1.5 text-xs font-semibold rounded-lg transition-all border cursor-pointer ${
              activeTab === 'dna'
                ? 'bg-[var(--theme-surface)] border-[var(--theme-border)] text-[var(--theme-primary)] shadow-sm font-bold'
                : 'border-transparent text-[var(--theme-secondary)] hover:text-[var(--theme-primary)]'
            }`}
          >
            DNA Helix Genome
          </button>
        </div>

        {activeTab === 'ecosystem' ? (
          <div className="space-y-4">
            <span className="text-[10px] uppercase tracking-wider font-bold text-[var(--theme-secondary)] font-mono block">Ecosystem Speciation parameters</span>

            {/* Rabbit reproductive rate */}
            <div>
              <div className="flex items-center justify-between text-xs font-bold font-mono tracking-tight mb-1">
                <span>Prey (Rabbit) Birth Coeff</span>
                <span className="text-emerald-500">{(rabbitBirthRate * 10).toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.01"
                max="0.25"
                step="0.01"
                value={rabbitBirthRate}
                onChange={e => setRabbitBirthRate(Number(e.target.value))}
                className="w-full h-1.5 rounded-lg bg-[var(--theme-border)] appearance-none cursor-pointer accent-emerald-500"
              />
            </div>

            {/* Wolf death/starve rate */}
            <div>
              <div className="flex items-center justify-between text-xs font-bold font-mono tracking-tight mb-1">
                <span>Predator Wolf Hunger Coeff</span>
                <span className="text-orange-500">{(wolfDeathRate * 100).toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="0.01"
                max="0.1"
                step="0.01"
                value={wolfDeathRate}
                onChange={e => setWolfDeathRate(Number(e.target.value))}
                className="w-full h-1.5 rounded-lg bg-[var(--theme-border)] appearance-none cursor-pointer accent-emerald-500"
              />
            </div>

            {/* Predator Efficiency */}
            <div>
              <div className="flex items-center justify-between text-xs font-bold font-mono tracking-tight mb-1">
                <span>Hunting Efficiency Coeff</span>
                <span className="text-emerald-500">{(huntingEfficiency * 1000).toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="0.002"
                max="0.04"
                step="0.002"
                value={huntingEfficiency}
                onChange={e => setHuntingEfficiency(Number(e.target.value))}
                className="w-full h-1.5 rounded-lg bg-[var(--theme-border)] appearance-none cursor-pointer accent-emerald-500"
              />
            </div>

            <div className="border-t border-[var(--theme-border)] pt-4 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setAnimating(!animating)}
                className={`p-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all text-white cursor-pointer ${
                  animating ? 'bg-orange-500 hover:bg-orange-600' : 'bg-green-500 hover:bg-green-600'
                }`}
              >
                {animating ? <Pause size={13} /> : <Play size={13} />}
                {animating ? 'Pause Ecosystem' : 'Resume Simulation'}
              </button>

              <button
                type="button"
                onClick={initializeEcosystem}
                className="p-2.5 bg-[var(--theme-surface)] border border-[var(--theme-border)] text-xs text-[var(--theme-secondary)] hover:text-[var(--theme-primary)] font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-all"
              >
                <RefreshCw size={13} />
                Re-Seed Environment
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <span className="text-[10px] uppercase tracking-wider font-bold text-[var(--theme-secondary)] font-mono block">DNA Strand Accessories</span>
            <p className="text-xs text-[var(--theme-secondary)] leading-relaxed">Each gene strand pairs Adenine (A) to Thymine (T) and Guanine (G) to Cytosine (C) to form molecular ladders.</p>
            
            <button
              type="button"
              onClick={handleMutateStrand}
              className="w-full p-2.5 bg-blue-500 hover:bg-blue-600 font-bold text-white rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all"
            >
              <RefreshCw size={13} className="animate-spin-reverse" />
              Induce Point Mutation (X-Ray)
            </button>
          </div>
        )}
      </div>

      {/* CENTER COLUMN: Graph Canvas & History Plotted Panel */}
      <div className="flex-1 flex flex-col min-h-0 bg-[var(--theme-surface-alt)] relative">
        {/* Canvas Header */}
        <div className="px-4 py-3 border-b border-[var(--theme-border)] flex items-center justify-between bg-[var(--theme-surface)]">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold uppercase font-mono tracking-wider">
              {activeTab === 'ecosystem' ? 'Biotope Ecosystem Solver' : 'Genomic DNA Ribbons'}
            </span>
          </div>

          <div className="flex items-center gap-2">
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

            {activeTab === 'ecosystem' && (
              <button
                type="button"
                onClick={initializeEcosystem}
                className="h-8 px-3 text-xs bg-[var(--theme-surface)] border border-[var(--theme-border)] text-[var(--theme-secondary)] hover:text-emerald-500 hover:border-emerald-500/20 rounded-xl transition-all flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw size={13} />
                Reset
              </button>
            )}

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

        {/* Population Header HUD */}
        {activeTab === 'ecosystem' && (
          <div className="bg-[var(--theme-surface)] border-b border-[var(--theme-border)]/50 px-4 py-2 flex items-center justify-between text-xs">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                <span>Rabbits Count: <strong className="text-emerald-500 font-bold font-mono">{actors.filter(a => a.type === 'rabbit').length}</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-orange-400" />
                <span>Wolves Count: <strong className="text-orange-500 font-bold font-mono">{actors.filter(a => a.type === 'wolf').length}</strong></span>
              </div>
            </div>

            <span className="text-[10px] font-mono font-medium text-[var(--theme-secondary)]">Lotka-Volverra model dynamic solver</span>
          </div>
        )}

        {/* Live Vector Graphical Grid Plot */}
        <div className="flex-1 min-h-0 flex items-center justify-center p-4 relative">
          <canvas
            ref={canvasRef}
            width={340}
            height={260}
            className="w-full max-w-[340px] h-[260px] border border-transparent rounded-2xl"
          />
        </div>

        {/* Real-time population trends plot underneath the ecosystem canvas */}
        {activeTab === 'ecosystem' && populationHistory.length > 1 && (
          <div className="mx-4 mb-4 p-3 bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-2xl">
            <div className="flex items-center justify-between text-[10px] font-mono uppercase text-[var(--theme-secondary)] tracking-wider mb-2">
              <span className="flex items-center gap-1"><LineChart size={11} /> Live Biogenesis Population Trend</span>
              <span>Time-series Interval</span>
            </div>
            
            {/* Simple sparkline chart for history */}
            <div className="h-12 w-full flex items-end gap-[2px] pt-1">
              {populationHistory.map((h, i) => {
                const maxVal = Math.max(1, ...populationHistory.map(p => Math.max(p.rabbits, p.wolves * 4)));
                const rH = `${(h.rabbits / maxVal) * 100}%`;
                const wH = `${((h.wolves * 4) / maxVal) * 100}%`;

                return (
                  <div key={i} className="flex-1 h-full flex flex-col justify-end relative group/spark animate-fade-in">
                    <div 
                      className="w-full bg-orange-500/80 rounded-t-xs mb-[1px]"
                      style={{ height: wH }}
                    />
                    <div 
                      className="w-full bg-emerald-500 rounded-t-xs"
                      style={{ height: rH }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
