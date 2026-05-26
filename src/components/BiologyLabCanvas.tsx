import React, { useState, useEffect, useRef } from 'react';
import { 
  X, ZoomIn, ZoomOut, Play, Pause, RotateCcw, Flower2, RefreshCw, LineChart, HelpCircle, Activity, Sliders,
  Heart, Wind, Droplets, Zap, Eye, Globe
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Actor {
  id: number;
  type: 'rabbit' | 'wolf';
  x: number;
  y: number;
  vx: number;
  vy: number;
  energy: number;
}

type BioTab = 'ecosystem' | 'heart' | 'respiratory' | 'sewage' | 'dna';

export const BiologyLabCanvas: React.FC<{
  onClose?: () => void;
  isInline?: boolean;
}> = ({ onClose, isInline = true }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<BioTab>('ecosystem');
  const [animating, setAnimating] = useState<boolean>(true);
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);

  // === TAB 1: ECOSYSTEM & FOOD WEB ===
  const [rabbitBirthRate, setRabbitBirthRate] = useState<number>(0.08);
  const [wolfDeathRate, setWolfDeathRate] = useState<number>(0.04);
  const [huntingEfficiency, setHuntingEfficiency] = useState<number>(0.012);
  const [ecosystemCarryingCapacity, setEcosystemCarryingCapacity] = useState<number>(180);
  const [actors, setActors] = useState<Actor[]>([]);
  const [populationHistory, setPopulationHistory] = useState<{ rabbits: number; wolves: number }[]>([]);
  const idCounter = useRef<number>(0);

  // === TAB 2: HEART BLOOD CIRCULATION ===
  const [bpm, setBpm] = useState<number>(75);
  const [adrenalineActive, setAdrenalineActive] = useState<boolean>(false);
  const [showDeox, setShowDeox] = useState<boolean>(true);
  const [showOx, setShowOx] = useState<boolean>(true);
  const heartParticles = useRef<{ x: number; y: number; progress: number; type: 'deox' | 'ox'; speed: number }[]>([]);

  // === TAB 3: O2/CO2 DUAL EXCHANGE ===
  const [respiratoryMode, setRespiratoryMode] = useState<'global' | 'capillary'>('global');
  const [respirationRate, setRespirationRate] = useState<number>(16);
  const [pollutionSpike, setPollutionSpike] = useState<number>(0); // 0 to 100
  const [photosynthesisSpeed, setPhotosynthesisSpeed] = useState<number>(50);
  const gasParticles = useRef<{ x: number; y: number; vx: number; vy: number; type: 'O2' | 'CO2' | 'sun'; radius: number; alpha: number }[]>([]);
  const bloodCells = useRef<{ x: number; y: number; oxygen: number; originalX: number }[]>([]);

  // === TAB 4: SEWAGE PURIFICATION ===
  const [sewageSpeed, setSewageSpeed] = useState<number>(1.0);
  const [aerationPower, setAerationPower] = useState<number>(60);
  const [sewageOrganicLoad, setSewageOrganicLoad] = useState<number>(25);
  const sewageParticles = useRef<{ x: number; y: number; vx: number; vy: number; type: 'water' | 'grit' | 'bubble' | 'bacteria'; radius: number; color: string; stageProgress?: number }[]>([]);

  // === TAB 5: DNA DOUBLE HELIX ===
  const [dnaChain, setDnaChain] = useState<string[]>(['A', 'T', 'G', 'C', 'C', 'A', 'T', 'G', 'G', 'T', 'A', 'C']);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // ==========================================
  // INITIALIZERS
  // ==========================================
  const initializeEcosystem = () => {
    const list: Actor[] = [];
    idCounter.current = 0;

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

  // Frame Updates for Ecosystem Loop (Lotka-Volterra)
  useEffect(() => {
    if (!animating || activeTab !== 'ecosystem') return;

    let animId: number;

    const gameTick = () => {
      setActors(prev => {
        const rabbits = prev.filter(a => a.type === 'rabbit');
        const wolves = prev.filter(a => a.type === 'wolf');

        let nextRabbits: Actor[] = [...rabbits];
        let nextWolves: Actor[] = [...wolves];

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
            const target: Actor = closestRabbit;
            const dx = target.x - wolf.x;
            const dy = target.y - wolf.y;
            nvx += (dx / minDist) * 0.18;
            nvy += (dy / minDist) * 0.18;

            const speed = Math.hypot(nvx, nvy) || 1;
            nvx = (nvx / speed) * 3.5;
            nvy = (nvy / speed) * 3.5;
          }

          const energyNext = wolf.energy - wolfDeathRate * 18;

          return {
            ...wolf,
            vx: nvx,
            vy: nvy,
            energy: energyNext
          };
        }).filter(w => w.energy > 0);

        const actualSurvivors: Actor[] = [];
        nextRabbits.forEach(rab => {
          let standsEaten = false;

          nextWolves.forEach(wolf => {
            const dist = Math.hypot(rab.x - wolf.x, rab.y - wolf.y);
            if (dist < 18 && Math.random() < huntingEfficiency * 15) {
              standsEaten = true;
              wolf.energy = Math.min(200, wolf.energy + 60);
            }
          });

          if (!standsEaten) {
            actualSurvivors.push(rab);
          }
        });

        const breedingWolves: Actor[] = [];
        nextWolves.forEach(w => {
          breedingWolves.push(w);
          if (w.energy > 165 && Math.random() < 0.05) {
            w.energy = 90;
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

        const updatedMoved: Actor[] = [...actualSurvivors, ...breedingWolves].map(p => {
          let nx = p.x + p.vx;
          let ny = p.y + p.vy;

          let nvx = p.vx;
          let nvy = p.vy;

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

  // Periodic population tracking for graph
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


  // ==========================================
  // MASTER TICK FOR OTHER LABS
  // ==========================================
  useEffect(() => {
    if (!animating || activeTab === 'ecosystem') return;

    let animId: number;

    const mainGameLoop = () => {
      const ts = Date.now();

      // --- HEART CIRCULATION ---
      if (activeTab === 'heart') {
        const activeBpm = adrenalineActive ? 135 : bpm;
        // Spawning blood cell particles
        const spawnRate = activeBpm / 240; 
        if (Math.random() < spawnRate) {
          if (showDeox) {
            heartParticles.current.push({
              x: 0,
              y: 0,
              progress: 0,
              type: 'deox',
              speed: 0.005 + Math.random() * 0.003
            });
          }
          if (showOx) {
            heartParticles.current.push({
              x: 0,
              y: 0,
              progress: 0,
              type: 'ox',
              speed: 0.005 + Math.random() * 0.003
            });
          }
        }

        // Move heart circulation particles
        const speedMult = activeBpm / 75;
        heartParticles.current = heartParticles.current.map(p => {
          return {
            ...p,
            progress: p.progress + p.speed * speedMult
          };
        }).filter(p => p.progress < 1.0);
      }

      // --- RESPIRATORY GAS EXCHANGE ---
      if (activeTab === 'respiratory') {
        if (respiratoryMode === 'global') {
          // Tree emits O2, human/animal emits CO2
          // spawn sunbeams
          if (Math.random() < (photosynthesisSpeed / 120)) {
            gasParticles.current.push({
              x: 20 + Math.random() * 100,
              y: 10 + Math.random() * 20,
              vx: 0.8 + Math.random() * 1.5,
              vy: 1.5 + Math.random() * 2.5,
              type: 'sun',
              radius: 1 + Math.random() * 2,
              alpha: 0.8
            });
          }

          // spawn O2 from tree leaves (centered around (80, 100))
          if (Math.random() < (photosynthesisSpeed / 250)) {
            gasParticles.current.push({
              x: 80 + (Math.random() - 0.5) * 40,
              y: 100 + (Math.random() - 0.5) * 40,
              vx: 1.0 + Math.random() * 1.5,
              vy: (Math.random() - 0.5) * 0.6,
              type: 'O2',
              radius: 3 + Math.random() * 2,
              alpha: 1.0
            });
          }

          // spawn CO2 from organisms (centered around (260, 150))
          const breathingFactor = (respirationRate / 16) * (1 + pollutionSpike / 100);
          if (Math.random() < 0.04 * breathingFactor) {
            gasParticles.current.push({
              x: 255 + (Math.random() - 0.5) * 15,
              y: 145 + (Math.random() - 0.5) * 15,
              vx: -1.2 - Math.random() * 1.5,
              vy: -0.5 + Math.random() * 1.0,
              type: 'CO2',
              radius: 3 + Math.random() * 1.8,
              alpha: 1.0
            });
          }

          // update global gas particles
          gasParticles.current = gasParticles.current.map(p => {
            let nx = p.x + p.vx;
            let ny = p.y + p.vy;
            let nvy = p.vy;

            if (p.type === 'O2') {
              // gentle weave towards rabbit/human
              nvy += Math.sin(nx * 0.05) * 0.1;
            } else if (p.type === 'CO2') {
              // weaving towards tree
              nvy += Math.sin(nx * 0.05) * 0.1;
            }

            return {
              ...p,
              x: nx,
              y: ny,
              vy: nvy,
              alpha: p.alpha - 0.004
            };
          }).filter(p => p.alpha > 0 && p.x > 5 && p.x < 335 && p.y > 5 && p.y < 255);

        } else {
          // Capillary microscopic exchange mode
          // Blood cells flowing in at y = 175, x from 5 to 335
          if (bloodCells.current.length < 15) {
            for (let i = bloodCells.current.length; i < 15; i++) {
              bloodCells.current.push({
                x: i * 25,
                y: 170 + (Math.random() - 0.5) * 6,
                oxygen: i < 5 ? 0.0 : (i > 10 ? 1.0 : (i - 5) / 5),
                originalX: i * 25
              });
            }
          }

          // Move blood cells
          const speedMult = respirationRate / 16;
          bloodCells.current = bloodCells.current.map(cell => {
            let nx = cell.x + 0.85 * speedMult;
            let ox = cell.oxygen;

            if (nx > 335) {
              nx = 5;
              ox = 0.0; // deoxygenated entering on left again
            }

            // At center coordinates [120, 220], capture O2 and drop CO2
            if (nx > 110 && nx < 230) {
              // diffuse oxygen absorption
              ox = Math.min(1.0, ox + 0.015 * speedMult);
              
              // spawn diffusing O2 particle from alveolus into coordinate
              if (Math.random() < 0.15) {
                gasParticles.current.push({
                  x: 170 + (Math.random() - 0.5) * 50,
                  y: 90 + Math.random() * 15,
                  vx: (Math.random() - 0.5) * 0.4,
                  vy: 0.8 + Math.random() * 1.2,
                  type: 'O2',
                  radius: 2 + Math.random() * 1.5,
                  alpha: 1.0
                });
              }
            }

            return {
              ...cell,
              x: nx,
              oxygen: ox
            };
          });

          // Diffusing gas particles in capillary
          gasParticles.current = gasParticles.current.map(p => {
            return {
              ...p,
              x: p.x + p.vx,
              y: p.y + p.vy,
              alpha: p.alpha - 0.015
            };
          }).filter(p => p.alpha > 0);
        }
      }

      // --- SEWAGE PURIFICATION ---
      if (activeTab === 'sewage') {
        const moveSpeed = sewageSpeed;
        
        // Spawn inlet dirty water particles at stage 1 left (10, 110)
        if (Math.random() < 0.28 * moveSpeed) {
          // normal water molecule
          sewageParticles.current.push({
            x: 10,
            y: 90 + Math.random() * 60,
            vx: 0.5 + Math.random() * 0.8,
            vy: (Math.random() - 0.5) * 0.6,
            type: 'water',
            radius: 2.5 + Math.random() * 1.5,
            color: '#78350f' // initially turbid brownish
          });

          // heavy grit pollution molecules
          if (sewageParticles.current.filter(p => p.type === 'grit').length < sewageOrganicLoad) {
            sewageParticles.current.push({
              x: 10 + Math.random() * 15,
              y: 80 + Math.random() * 70,
              vx: 0.3 + Math.random() * 0.5,
              vy: (Math.random() - 0.5) * 0.5,
              type: 'grit',
              radius: 3 + Math.random() * 2,
              color: '#3f3f46' // grey grit chunks
            });
          }
        }

        // Spawn bacteria in filtration tank 2 [90, 175]
        const currentBac = sewageParticles.current.filter(p => p.type === 'bacteria').length;
        if (currentBac < 18) {
          sewageParticles.current.push({
            x: 100 + Math.random() * 70,
            y: 80 + Math.random() * 80,
            vx: (Math.random() - 0.5) * 0.8,
            vy: (Math.random() - 0.5) * 0.8,
            type: 'bacteria',
            radius: 1.5 + Math.random() * 1.0,
            color: '#10b981' // green helpful aerobic bacteria
          });
        }

        // Spawn bubbles in tank 2
        if (Math.random() < (aerationPower / 120)) {
          sewageParticles.current.push({
            x: 100 + Math.random() * 65,
            y: 175,
            vx: (Math.random() - 0.5) * 0.4,
            vy: -1.2 - Math.random() * 1.6,
            type: 'bubble',
            radius: 1.0 + Math.random() * 2.0,
            color: '#ffffff'
          });
        }

        // Update sewage step system
        sewageParticles.current = sewageParticles.current.map(p => {
          let nx = p.x + p.vx * moveSpeed;
          let ny = p.y + p.vy * moveSpeed;
          let nvx = p.vx;
          let nvy = p.vy;
          let col = p.color;

          // Process mechanical filtering at boundary x = 90
          if (p.type === 'grit' && nx > 88 && nx < 96) {
            // grit gets trapped in screen 1 and slowly slides to bottom
            nvx = 0;
            nvy = 0.5; // fall as sludge
            col = '#52525b';
          }

          // Aeration biological digestions at stage 2 [90, 175]
          if (p.type === 'water') {
            if (nx > 90 && nx < 175) {
              // water starts to lighten slightly in aeration phase
              col = '#a16207'; // muddy yellow
            } else if (nx >= 175 && nx < 255) {
              col = '#cbd5e1'; // turning clear blue grey
            } else if (nx >= 255) {
              col = '#e0f2fe'; // beautiful crystal aqua blue!
            }
          }

          // Grit gets heavy and settles at Clarifier stage 3 [175, 255]
          if (p.type === 'grit' && nx > 175 && nx < 255) {
            nvx = 0.1;
            nvy = 0.8; // sink down heavily to settle
          }

          // Bubbles pop at liquid surface y = 75
          if (p.type === 'bubble' && ny < 80) {
            ny = -999; // destroy
          }

          // Microscopic bacteria boundary constraints [90, 175]
          if (p.type === 'bacteria') {
            if (nx < 95 || nx > 170) nvx = -nvx;
            if (ny < 80 || ny > 175) nvy = -nvy;
          }

          return {
            ...p,
            x: nx,
            y: ny,
            vx: nvx,
            vy: nvy,
            color: col
          };
        }).filter(p => p.x > 0 && p.x < 335 && p.y > 0 && p.y < 230);
      }

      animId = requestAnimationFrame(mainGameLoop);
    };

    animId = requestAnimationFrame(mainGameLoop);
    return () => cancelAnimationFrame(animId);
  }, [animating, activeTab, bpm, adrenalineActive, showDeox, showOx, respiratoryMode, respirationRate, pollutionSpike, photosynthesisSpeed, sewageSpeed, aerationPower, sewageOrganicLoad]);

  // ==========================================
  // CANVAS RENDER ENGINE
  // ==========================================
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const isDark = document.documentElement.classList.contains('dark');

    ctx.clearRect(0, 0, width, height);
    ctx.save();
    
    // Zoom translate
    ctx.translate(width / 2, height / 2);
    ctx.scale(zoomLevel, zoomLevel);
    ctx.translate(-width / 2, -height / 2);

    // Render Tab 1: Ecosystem
    if (activeTab === 'ecosystem') {
      ctx.fillStyle = isDark ? '#052e1644' : '#f0fdf4';
      ctx.fillRect(5, 5, width - 10, height - 10);

      ctx.strokeStyle = '#22c55e44';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(5, 5, width - 10, height - 10);

      // Dash Limit line
      ctx.strokeStyle = '#ef444422';
      ctx.setLineDash([4, 6]);
      ctx.beginPath();
      ctx.moveTo(0, height - 50);
      ctx.lineTo(width, height - 50);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw Prey / Predator actors
      actors.forEach(act => {
        ctx.beginPath();
        if (act.type === 'rabbit') {
          ctx.arc(act.x, act.y, 4.5, 0, Math.PI * 2);
          ctx.fillStyle = '#4ade80';
          ctx.shadowBlur = 3;
          ctx.shadowColor = '#4ade80';
          ctx.fill();
          ctx.shadowBlur = 0;
          ctx.strokeStyle = '#15803d';
          ctx.lineWidth = 1;
          ctx.stroke();

          ctx.beginPath();
          ctx.ellipse(act.x - 2, act.y - 5, 1.2, 4, -0.15, 0, Math.PI * 2);
          ctx.ellipse(act.x + 2, act.y - 5, 1.2, 4, 0.15, 0, Math.PI * 2);
          ctx.fillStyle = '#bbf7d0';
          ctx.fill();
        } else {
          ctx.arc(act.x, act.y, 8, 0, Math.PI * 2);
          ctx.fillStyle = '#f97316';
          ctx.shadowBlur = 5;
          ctx.shadowColor = '#f97316';
          ctx.fill();
          ctx.shadowBlur = 0;
          ctx.strokeStyle = '#b45309';
          ctx.lineWidth = 1.2;
          ctx.stroke();

          ctx.fillStyle = '#ffeb3b';
          ctx.beginPath();
          ctx.arc(act.x - 2.5, act.y - 1.5, 1.5, 0, Math.PI * 2);
          ctx.arc(act.x + 2.5, act.y - 1.5, 1.5, 0, Math.PI * 2);
          ctx.fill();

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
    }

    // Render Tab 2: Heart Blood Circulation
    else if (activeTab === 'heart') {
      const activeBpm = adrenalineActive ? 135 : bpm;
      const beatCycle = (Date.now() / 1000) * (activeBpm / 60) * Math.PI * 2;
      const heartPulseScale = 1.0 + 0.06 * Math.sin(beatCycle); // smooth beating contraction and expansion
      
      // Heart background shadow layer and layout boundaries
      ctx.fillStyle = isDark ? '#111115' : '#fafafa';
      ctx.fillRect(5, 5, width - 10, height - 10);
      ctx.strokeStyle = isDark ? '#27272a' : '#e4e4e7';
      ctx.strokeRect(5, 5, width - 10, height - 10);

      // Draw heart anatomical chambers at center (170, 130) with dynamic scale
      ctx.save();
      ctx.translate(170, 130);
      ctx.scale(heartPulseScale, heartPulseScale);
      ctx.translate(-170, -130);

      // 1. Right Side (Vena Cava/Blue deox blood chambers) (Left of screen)
      ctx.fillStyle = 'rgba(59, 130, 246, 0.15)'; // Blue tint for Deox right atrium/ventricle
      ctx.beginPath();
      ctx.moveTo(110, 60);
      ctx.bezierCurveTo(90, 80, 80, 130, 110, 190);
      ctx.bezierCurveTo(130, 200, 150, 200, 170, 195);
      ctx.lineTo(170, 90);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#2563eb';
      ctx.lineWidth = 1.8;
      ctx.stroke();

      // 2. Left Side (Aorta/Red ox blood chambers) (Right of screen)
      ctx.fillStyle = 'rgba(239, 68, 68, 0.15)'; // Red tint for Ox left atrium/ventricle
      ctx.beginPath();
      ctx.moveTo(230, 60);
      ctx.bezierCurveTo(250, 80, 260, 130, 230, 190);
      ctx.bezierCurveTo(210, 200, 190, 200, 170, 195);
      ctx.lineTo(170, 90);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 1.8;
      ctx.stroke();

      // 3. Septum boundary (central dividing wall)
      ctx.strokeStyle = isDark ? '#52525b' : '#a1a1aa';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(170, 90);
      ctx.lineTo(170, 195);
      ctx.stroke();

      // Atrium Ventricle dividers & labels
      ctx.fillStyle = isDark ? '#71717a' : '#52525b';
      ctx.font = '7px monospace';
      ctx.textAlign = 'center';
      
      // Right Atrium (RA) & Right Ventricle (RV)
      ctx.fillText('RA', 130, 105);
      ctx.fillText('RV', 125, 160);
      // Left Atrium (LA) & Left Ventricle (LV)
      ctx.fillText('LA', 210, 105);
      ctx.fillText('LV', 215, 160);

      // Draw Vena Cava input pipes (top left and bottom left)
      ctx.fillStyle = '#1d4ed8';
      ctx.beginPath();
      ctx.arc(110, 60, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillText('SVC', 110, 48);

      // Draw Aorta vascular curve outlet (top right)
      ctx.fillStyle = '#b91c1c';
      ctx.beginPath();
      ctx.arc(230, 60, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillText('AORTA', 230, 48);

      // Draw valves (tricuspid/mitral valves blinking)
      const valveOpen = Math.sin(beatCycle) > 0;
      ctx.strokeStyle = isDark ? '#ffffff' : '#000000';
      ctx.lineWidth = 2.5;
      
      // Tricuspid valve (RA to RV)
      ctx.beginPath();
      if (valveOpen) {
        ctx.moveTo(115, 125); ctx.lineTo(120, 135);
        ctx.moveTo(140, 125); ctx.lineTo(135, 135);
      } else {
        ctx.moveTo(115, 128); ctx.lineTo(140, 128);
      }
      ctx.stroke();

      // Mitral valve (LA to LV)
      ctx.beginPath();
      if (valveOpen) {
        ctx.moveTo(200, 125); ctx.lineTo(205, 135);
        ctx.moveTo(225, 125); ctx.lineTo(220, 135);
      } else {
        ctx.moveTo(200, 128); ctx.lineTo(225, 128);
      }
      ctx.stroke();

      ctx.restore();

      // Helper function to track bezier circulation progress nicely
      const getDeoxLocation = (p: number) => {
        if (p < 0.35) {
          const r = p / 0.35;
          return { x: 110 + 20 * r, y: 60 + 50 * r }; // enters SVC into RA
        } else if (p < 0.7) {
          const r = (p - 0.35) / 0.35;
          return { x: 130 - 5 * r, y: 110 + 50 * r }; // RA enters RV
        } else {
          const r = (p - 0.7) / 0.3;
          return { x: 125 - 45 * r, y: 160 - 70 * r }; // RV exits to lungs (drawn left)
        }
      };

      const getOxLocation = (p: number) => {
        if (p < 0.35) {
          const r = p / 0.35;
          return { x: 250 - 40 * r, y: 80 + 30 * r }; // enters from pulmonary vein to LA
        } else if (p < 0.7) {
          const r = (p - 0.35) / 0.35;
          return { x: 210 + 5 * r, y: 110 + 50 * r }; // LA enters LV
        } else {
          const r = (p - 0.7) / 0.3;
          return { x: 215 + 15 * r, y: 160 - 100 * r }; // LV output to body Aorta
        }
      };

      // Draw the actual moving blood cell particles (glowing crimson/aquamarine beads)
      heartParticles.current.forEach(p => {
        const hPulse = Math.sin(beatCycle);
        const ratioPulse = p.progress + (hPulse * 0.015);
        const loc = p.type === 'deox' ? getDeoxLocation(ratioPulse) : getOxLocation(ratioPulse);
        
        ctx.beginPath();
        ctx.arc(loc.x, loc.y, 3.2, 0, Math.PI * 2);
        ctx.fillStyle = p.type === 'deox' ? '#60a5fa' : '#ef4444';
        ctx.shadowBlur = 4;
        ctx.shadowColor = p.type === 'deox' ? '#3b82f6' : '#ef4444';
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // Overlay lung & body connections diagram
      ctx.font = '8px monospace';
      ctx.fillStyle = isDark ? '#a1a1aa' : '#52525b';
      ctx.textAlign = 'left';
      ctx.fillText('◀ To Lungs (deox)', 15, 95);
      ctx.textAlign = 'right';
      ctx.fillText('From Lungs (ox) ◀', 320, 80);
    }

    // Render Tab 3: Respiratory O2/CO2 Cycle
    else if (activeTab === 'respiratory') {
      ctx.fillStyle = isDark ? '#111115' : '#fafafa';
      ctx.fillRect(5, 5, width - 10, height - 10);
      ctx.strokeStyle = isDark ? '#27272a' : '#e4e4e7';
      ctx.strokeRect(5, 5, width - 10, height - 10);

      // MODE 1: GLOBAL CYCLE DISPLAY
      if (respiratoryMode === 'global') {
        // Draw Sunshine center top (30, 20)
        ctx.beginPath();
        ctx.arc(30, 20, 10, 0, Math.PI * 2);
        ctx.fillStyle = '#fef08a';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#facc15';
        ctx.fill();
        ctx.shadowBlur = 0;

        // Draw tree foliage on left [70, 120]
        ctx.fillStyle = '#047857'; // emerald foliage
        ctx.beginPath();
        ctx.arc(65, 110, 22, 0, Math.PI * 2);
        ctx.arc(95, 110, 20, 0, Math.PI * 2);
        ctx.arc(80, 85, 25, 0, Math.PI * 2);
        ctx.fill();
        // trunk
        ctx.fillStyle = '#78350f';
        ctx.fillRect(75, 125, 10, 45);

        // Draw organism on the right (Cute animated breathing Rabbit) [260, 150]
        const breathPhase = Math.sin((Date.now() / 1000) * (respirationRate / 15) * Math.PI);
        const chestScale = 1.0 + breathPhase * 0.05;

        ctx.save();
        ctx.translate(260, 150);
        ctx.scale(chestScale, chestScale);
        
        // rabbit body
        ctx.beginPath();
        ctx.ellipse(0, 0, 15, 10, 0, 0, Math.PI * 2);
        ctx.fillStyle = isDark ? '#d4d4d8' : '#e4e4e7';
        ctx.fill();
        // head
        ctx.beginPath();
        ctx.arc(12, -7, 8, 0, Math.PI * 2);
        ctx.fill();
        // ears
        ctx.ellipse(10, -17, 3, 9, 0.1, 0, Math.PI * 2);
        ctx.ellipse(14, -17, 3, 9, -0.1, 0, Math.PI * 2);
        ctx.fillStyle = '#fecdd3';
        ctx.fill();
        ctx.ellipse(10, -17, 1.5, 6, 0.1, 0, Math.PI * 2);
        ctx.ellipse(14, -17, 1.5, 6, -0.1, 0, Math.PI * 2);
        ctx.fillStyle = isDark ? '#ffffff' : '#f43f5e';
        ctx.fill();

        ctx.restore();

        // Draw gas cycles arrows & labels
        ctx.font = '8px monospace';
        ctx.fillStyle = '#10b981'; // Green for O2
        ctx.fillText('Oxygen O₂ ➔ ➔ ➔', 125, 100);
        ctx.fillStyle = '#71717a'; // Grey/Orange for CO2
        ctx.fillText('◀ ◀ ◀ Carbon Dioxide CO₂', 115, 150);

        // Render animated cycle particles
        gasParticles.current.forEach(p => {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          if (p.type === 'O2') {
            ctx.fillStyle = `rgba(16, 185, 129, ${p.alpha})`; // glowing green oxygen
            ctx.shadowBlur = 4;
            ctx.shadowColor = '#10b981';
          } else if (p.type === 'CO2') {
            ctx.fillStyle = `rgba(139, 92, 246, ${p.alpha})`; // purple gas carbon
            ctx.shadowBlur = 4;
            ctx.shadowColor = '#8b5cf6';
          } else {
            ctx.fillStyle = `rgba(253, 224, 71, ${p.alpha})`; // golden sun beam ray
          }
          ctx.fill();
          ctx.shadowBlur = 0;
        });

        // Ecological balance info labels
        ctx.fillStyle = isDark ? '#4ade80' : '#15803d';
        ctx.fillText('Photosynthesis (Absorbs CO₂, Releases O₂)', 20, 195);
        ctx.fillStyle = isDark ? '#fb7185' : '#be123c';
        ctx.fillText('Respiration (Inhales O₂, Exhales CO₂)', 150, 215);

      } else {
        // MICRO CAPILLARY RESPIRED MODE
        // Draw big Lung Alveolus chamber (top center [170, 75])
        ctx.fillStyle = 'rgba(253, 164, 175, 0.1)'; // soft pink alveolar sac
        ctx.beginPath();
        ctx.arc(170, 75, 45, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#f43f5e';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = isDark ? '#ffffff' : '#334155';
        ctx.font = 'bold 9px font-sans';
        ctx.textAlign = 'center';
        ctx.fillText('Alveolus Air Sac', 170, 65);
        ctx.fillStyle = '#0ea5e9';
        ctx.fillText('O₂ Oxygen concentration', 170, 80);

        // Draw capillary pipe boundary (curving below it, y: 155 to 195)
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 20; // thick track for blood vessel flow
        ctx.beginPath();
        ctx.moveTo(10, 175);
        ctx.lineTo(330, 175);
        ctx.stroke();

        ctx.strokeStyle = isDark ? '#ef444455' : '#fca5a5';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(10, 163); ctx.lineTo(330, 163);
        ctx.moveTo(10, 187); ctx.lineTo(330, 187);
        ctx.stroke();

        ctx.font = '8px monospace';
        ctx.fillStyle = isDark ? '#a1a1aa' : '#64748b';
        ctx.fillText('◀ Deoxygenated inlet', 50, 195);
        ctx.fillText('Oxygenated outlet ➔', 280, 195);

        // Draw individual Red Blood Cells
        bloodCells.current.forEach(cell => {
          ctx.beginPath();
          ctx.arc(cell.x, cell.y, 7, 0, Math.PI * 2);
          
          // Blend colors from dark blue/purple (deox) to bright scarlet red (ox)
          const r = Math.floor(95 + 160 * cell.oxygen);
          const g = Math.floor(125 - 90 * cell.oxygen);
          const b = Math.floor(185 - 130 * cell.oxygen);
          ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
          ctx.fill();
          
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1;
          ctx.stroke();

          // Small concave erythrocyte indentation circle at center
          ctx.beginPath();
          ctx.arc(cell.x, cell.y, 2.5, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${r - 30}, ${g - 30}, ${b - 35}, 0.5)`;
          ctx.fill();
        });

        // Draw diffusing O2 glowing particles
        gasParticles.current.forEach(p => {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(14, 165, 233, ${p.alpha})`; // cool bright blue O2 diffusing
          ctx.shadowBlur = 4;
          ctx.shadowColor = '#0ea5e9';
          ctx.fill();
          ctx.shadowBlur = 0;
        });
      }
    }

    // Render Tab 4: Sewage Purification
    else if (activeTab === 'sewage') {
      ctx.fillStyle = isDark ? '#0c0a09' : '#fafaf9';
      ctx.fillRect(5, 5, width - 10, height - 10);
      ctx.strokeStyle = '#57534e';
      ctx.strokeRect(5, 5, width - 10, height - 10);

      // Draw the 4 processing chambers horizontally
      const topY = 65;
      const botY = 195;
      const stepW = (width - 20) / 4; // width of each step tank

      ctx.fillStyle = isDark ? 'rgba(120, 113, 108, 0.05)' : 'rgba(214, 211, 209, 0.2)';
      ctx.fillRect(10, topY, width - 20, botY - topY);

      // Draw tanks divides
      ctx.strokeStyle = isDark ? '#44403c' : '#d6d3d1';
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let i = 1; i < 4; i++) {
        ctx.moveTo(10 + i * stepW, topY);
        ctx.lineTo(10 + i * stepW, botY);
      }
      ctx.stroke();

      // Render Stage Labels
      ctx.fillStyle = isDark ? '#78716c' : '#78716c';
      ctx.font = 'bold 8px font-sans';
      ctx.textAlign = 'center';
      ctx.fillText('1. Grit Screen', 10 + stepW * 0.5, topY - 14);
      ctx.fillText('2. Aeration Tank', 10 + stepW * 1.5, topY - 14);
      ctx.fillText('3. Settling Clarifier', 10 + stepW * 2.5, topY - 14);
      ctx.fillText('4. UV Clean Sanit', 10 + stepW * 3.5, topY - 14);

      // Render Screen Grid vertical bars in tank 1
      ctx.strokeStyle = '#a8a29e';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let sx = 40; sx < 80; sx += 10) {
        ctx.moveTo(sx, topY + 5);
        ctx.lineTo(sx, botY - 5);
      }
      ctx.stroke();

      // Render aerator diffusers bubbler grid in tank 2 floor
      ctx.fillStyle = '#44403c';
      ctx.fillRect(10 + stepW + 10, botY - 8, stepW - 20, 6);

      // Render settling sludge layer at clarifying tank 3 floor
      ctx.fillStyle = '#6e3c15';
      ctx.beginPath();
      ctx.ellipse(10 + stepW * 2.5, botY, stepW * 0.42, 10, 0, 0, Math.PI, true);
      ctx.fill();

      // Render neon purple active sanitizing rays flashing in disinfection chamber 4
      const flashPurp = Math.floor(190 + 60 * Math.sin(Date.now() / 150));
      ctx.fillStyle = `rgba(${flashPurp}, 112, 255, 0.08)`;
      ctx.fillRect(10 + stepW * 3, topY, stepW, botY - topY);

      // Draw UV physical glowing bulb in stage 4 center
      ctx.fillStyle = '#c084fc';
      ctx.fillRect(10 + stepW * 3.5 - 2, topY + 15, 4, 30);
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#a855f7';
      ctx.beginPath();
      ctx.arc(10 + stepW * 3.5, topY + 45, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#e9d5ff';
      ctx.fill();
      ctx.shadowBlur = 0;

      // Draw Sewage Purification stream flowing particles
      sewageParticles.current.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        if (p.type === 'bubble') {
          ctx.strokeStyle = 'rgba(255,255,255,0.4)';
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
        ctx.fill();
      });

      // Flow pipeline labels
      ctx.font = '7px monospace';
      ctx.fillStyle = '#a8a29e';
      ctx.fillText('INFLOW WATER ➔', 50, botY + 16);
      ctx.fillText('➔ PURIFIED OUTLET', 270, botY + 16);
    }

    // Render Tab 5: DNA Genome Double Helix
    else if (activeTab === 'dna') {
      ctx.fillStyle = isDark ? '#111115' : '#fafafa';
      ctx.fillRect(10, 10, width - 20, height - 20);
      ctx.strokeStyle = isDark ? '#27272a' : '#e4e4e7';
      ctx.strokeRect(10, 10, width - 20, height - 20);

      const spacingX = (width - 60) / (dnaChain.length - 1);
      const centerY = height / 2;
      const amplitude = 50;

      dnaChain.forEach((base, i) => {
        const x = 30 + i * spacingX;
        const angle = i * 0.7 + Date.now() * 0.0015;
        const y1 = centerY + Math.sin(angle) * amplitude;
        const y2 = centerY - Math.sin(angle) * amplitude;

        ctx.strokeStyle = isDark ? '#44444f' : '#cbd5e1';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(x, y1);
        ctx.lineTo(x, y2);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(x, y1, 7.5, 0, Math.PI * 2);
        const col1 = base === 'A' ? '#38bdf8' : base === 'T' ? '#fb7185' : base === 'G' ? '#fbbf24' : '#34d399';
        ctx.fillStyle = col1;
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();

        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 8px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(base, x, y1 + 0.3);

        const complement = base === 'A' ? 'T' : base === 'T' ? 'A' : base === 'G' ? 'C' : 'G';
        const col2 = complement === 'A' ? '#38bdf8' : complement === 'T' ? '#fb7185' : complement === 'G' ? '#fbbf24' : '#34d399';
        ctx.beginPath();
        ctx.arc(x, y2, 7.5, 0, Math.PI * 2);
        ctx.fillStyle = col2;
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();

        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 8px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(complement, x, y2 + 0.3);
      });

      ctx.strokeStyle = 'rgba(239, 68, 68, 0.25)';
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

      ctx.strokeStyle = 'rgba(59, 130, 246, 0.25)';
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
  }, [actors, activeTab, dnaChain, zoomLevel, bpm, adrenalineActive, showDeox, showOx, respiratoryMode, respirationRate, pollutionSpike, photosynthesisSpeed, sewageSpeed, aerationPower, sewageOrganicLoad]);

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

  const handleInjectAdrenaline = () => {
    setAdrenalineActive(true);
    setTimeout(() => {
      setAdrenalineActive(false);
    }, 4500); // 4.5 seconds adrenaline shot
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
                  <Activity size={16} className="text-emerald-500 animate-pulse" />
                  <h3 className="font-bold text-sm tracking-tight text-emerald-600 dark:text-emerald-400">Biology Laboratory</h3>
                </div>
                <p className="text-xs text-[var(--theme-secondary)]">Explore custom animated biological ecosystems, organs, and dynamic water filtration:</p>
              </div>

              {/* Tab Category Switcher */}
              <div className="flex flex-col gap-1 bg-[var(--theme-surface-alt)] p-1 rounded-xl border border-[var(--theme-border)]">
                <button
                  type="button"
                  onClick={() => setActiveTab('ecosystem')}
                  className={`text-left px-3 py-1.5 text-xs font-semibold rounded-lg transition-all border flex items-center justify-between cursor-pointer ${
                    activeTab === 'ecosystem'
                      ? 'bg-[var(--theme-surface)] border-[var(--theme-border)] text-emerald-600 dark:text-emerald-400 shadow-sm font-bold'
                      : 'border-transparent text-[var(--theme-secondary)] hover:text-[var(--theme-primary)]'
                  }`}
                >
                  <span>1. Grassland Ecosystem</span>
                  <Flower2 size={12} />
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('heart')}
                  className={`text-left px-3 py-1.5 text-xs font-semibold rounded-lg transition-all border flex items-center justify-between cursor-pointer ${
                    activeTab === 'heart'
                      ? 'bg-[var(--theme-surface)] border-[var(--theme-border)] text-red-500 shadow-sm font-bold'
                      : 'border-transparent text-[var(--theme-secondary)] hover:text-[var(--theme-primary)]'
                  }`}
                >
                  <span>2. Heart Circulatory System</span>
                  <Heart size={12} />
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('respiratory')}
                  className={`text-left px-3 py-1.5 text-xs font-semibold rounded-lg transition-all border flex items-center justify-between cursor-pointer ${
                    activeTab === 'respiratory'
                      ? 'bg-[var(--theme-surface)] border-[var(--theme-border)] text-sky-500 shadow-sm font-bold'
                      : 'border-transparent text-[var(--theme-secondary)] hover:text-[var(--theme-primary)]'
                  }`}
                >
                  <span>3. Respiratory Gas Cycle</span>
                  <Wind size={12} />
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('sewage')}
                  className={`text-left px-3 py-1.5 text-xs font-semibold rounded-lg transition-all border flex items-center justify-between cursor-pointer ${
                    activeTab === 'sewage'
                      ? 'bg-[var(--theme-surface)] border-[var(--theme-border)] text-amber-600 dark:text-amber-450 shadow-sm font-bold'
                      : 'border-transparent text-[var(--theme-secondary)] hover:text-[var(--theme-primary)]'
                  }`}
                >
                  <span>4. Sewage Purification</span>
                  <Droplets size={12} />
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('dna')}
                  className={`text-left px-3 py-1.5 text-xs font-semibold rounded-lg transition-all border flex items-center justify-between cursor-pointer ${
                    activeTab === 'dna'
                      ? 'bg-[var(--theme-surface)] border-[var(--theme-border)] text-blue-500 shadow-sm font-bold'
                      : 'border-transparent text-[var(--theme-secondary)] hover:text-[var(--theme-primary)]'
                  }`}
                >
                  <span>5. DNA Molecular Helix</span>
                  <Globe size={12} />
                </button>
              </div>

              {/* TAB CONTENT: ECOSYSTEM */}
              {activeTab === 'ecosystem' && (
                <div className="space-y-4">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-[var(--theme-secondary)] font-mono block">Ecosystem parameters</span>

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

                  <div>
                    <div className="flex items-center justify-between text-xs font-bold font-mono tracking-tight mb-1">
                      <span>Hunting Efficiency Coeff</span>
                      <span className="text-emerald-500 font-mono">{(huntingEfficiency * 1000).toFixed(1)}</span>
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

                  {/* Food Chain Diagram Widget */}
                  <div className="mt-2 p-3 bg-[var(--theme-surface-alt)] rounded-xl border border-[var(--theme-border)]">
                    <span className="text-[9px] uppercase font-bold tracking-wider font-mono text-[var(--theme-secondary)]">Ecosystem Food Chain Flow</span>
                    <div className="flex items-center justify-between mt-2 text-[10px] font-mono text-[var(--theme-primary)]">
                      <span className="p-1 px-1.5 bg-yellow-500/10 text-yellow-600 rounded">Sun</span>
                      <span>➔</span>
                      <span className="p-1 px-1.5 bg-emerald-500/10 text-emerald-600 rounded">Grass</span>
                      <span>➔</span>
                      <span className="p-1 px-1.5 bg-green-500/10 text-green-600 rounded">Rabbit</span>
                      <span>➔</span>
                      <span className="p-1 px-1.5 bg-orange-500/10 text-orange-600 rounded">Wolf</span>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB CONTENT: HEART */}
              {activeTab === 'heart' && (
                <div className="space-y-4">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-red-500 font-mono block">Circulation Configurator</span>
                  
                  <div>
                    <div className="flex items-center justify-between text-xs font-bold font-mono mb-1">
                      <span>Resting Heart Rate (BPM)</span>
                      <span className="text-red-500 font-bold">{adrenalineActive ? '135 (Adrenaline Spike!)' : `${bpm} BPM`}</span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="130"
                      step="5"
                      disabled={adrenalineActive}
                      value={bpm}
                      onChange={e => setBpm(Number(e.target.value))}
                      className="w-full h-1.5 rounded-lg bg-[var(--theme-border)] appearance-none cursor-pointer accent-red-500 disabled:opacity-50"
                    />
                  </div>

                  <div className="space-y-2 border-t border-[var(--theme-border)] pt-3">
                    <span className="text-[10px] font-semibold text-[var(--theme-secondary)] block">Visibility Toggles</span>
                    <div className="flex flex-col gap-1.5">
                      <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                        <input
                          type="checkbox"
                          checked={showDeox}
                          onChange={e => setShowDeox(e.target.checked)}
                          className="rounded text-blue-500 focus:ring-blue-500 h-4 w-4 bg-[var(--theme-surface-alt)] border-[var(--theme-border)]"
                        />
                        <span className="text-blue-500 font-bold">Deoxygenated Blood Vis (Blue)</span>
                      </label>
                      <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                        <input
                          type="checkbox"
                          checked={showOx}
                          onChange={e => setShowOx(e.target.checked)}
                          className="rounded text-red-500 focus:ring-red-500 h-4 w-4 bg-[var(--theme-surface-alt)] border-[var(--theme-border)]"
                        />
                        <span className="text-red-500 font-bold">Oxygenated Blood Vis (Red)</span>
                      </label>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleInjectAdrenaline}
                    disabled={adrenalineActive}
                    className={`w-full p-2.5 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                      adrenalineActive 
                        ? 'bg-rose-600 text-white animate-pulse' 
                        : 'bg-red-500 hover:bg-red-600 text-white shadow'
                    }`}
                  >
                    <Zap size={13} className={adrenalineActive ? 'animate-bounce' : ''} />
                    {adrenalineActive ? 'Adrenaline Injected!' : 'Inject Adrenaline (135 BPM)'}
                  </button>
                </div>
              )}

              {/* TAB CONTENT: RESPIRATORY */}
              {activeTab === 'respiratory' && (
                <div className="space-y-4">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-sky-500 font-mono block">Respiration Parameters</span>

                  {/* Mode Selector */}
                  <div className="flex bg-[var(--theme-surface-alt)] p-1 rounded-xl border border-[var(--theme-border)] gap-1">
                    <button
                      type="button"
                      onClick={() => setRespiratoryMode('global')}
                      className={`flex-1 text-center py-1.5 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                        respiratoryMode === 'global'
                          ? 'bg-[var(--theme-surface)] border-[var(--theme-border)] text-sky-500 shadow-sm border'
                          : 'border-transparent text-[var(--theme-secondary)]'
                      }`}
                    >
                      Global (Eco Cycle)
                    </button>
                    <button
                      type="button"
                      onClick={() => setRespiratoryMode('capillary')}
                      className={`flex-1 text-center py-1.5 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                        respiratoryMode === 'capillary'
                          ? 'bg-[var(--theme-surface)] border-[var(--theme-border)] text-sky-500 shadow-sm border'
                          : 'border-transparent text-[var(--theme-secondary)]'
                      }`}
                    >
                      Micro (Capillaries)
                    </button>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs font-bold font-mono mb-1">
                      <span>Breathing Velocity (Rate)</span>
                      <span className="text-sky-500">{respirationRate} / min</span>
                    </div>
                    <input
                      type="range"
                      min="8"
                      max="32"
                      step="2"
                      value={respirationRate}
                      onChange={e => setRespirationRate(Number(e.target.value))}
                      className="w-full h-1.5 rounded-lg bg-[var(--theme-border)] appearance-none cursor-pointer accent-sky-500"
                    />
                  </div>

                  {respiratoryMode === 'global' ? (
                    <div>
                      <div className="flex items-center justify-between text-xs font-bold font-mono mb-1">
                        <span>Photosynthesis Efficiency</span>
                        <span className="text-sky-500">{photosynthesisSpeed}%</span>
                      </div>
                      <input
                        type="range"
                        min="10"
                        max="100"
                        step="5"
                        value={photosynthesisSpeed}
                        onChange={e => setPhotosynthesisSpeed(Number(e.target.value))}
                        className="w-full h-1.5 rounded-lg bg-[var(--theme-border)] appearance-none cursor-pointer accent-sky-500"
                      />
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center justify-between text-xs font-bold font-mono mb-1">
                        <span>Lungs CO₂ Pollution Load</span>
                        <span className="text-purple-500">{pollutionSpike}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={pollutionSpike}
                        onChange={e => setPollutionSpike(Number(e.target.value))}
                        className="w-full h-1.5 rounded-lg bg-[var(--theme-border)] appearance-none cursor-pointer accent-sky-500"
                      />
                    </div>
                  )}

                  <div className="p-3 bg-[var(--theme-surface-alt)] rounded-xl border border-[var(--theme-border)] text-[11px] text-[var(--theme-secondary)] leading-relaxed">
                    <strong>Did you know?</strong> In capillaries, blood drops off Carbon Dioxide (exhaled) and absorbs Oxygen from the alveoli to become oxygenated (bright red).
                  </div>
                </div>
              )}

              {/* TAB CONTENT: SEWAGE */}
              {activeTab === 'sewage' && (
                <div className="space-y-4">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-amber-500 font-mono block">Plant Controls</span>

                  <div>
                    <div className="flex items-center justify-between text-xs font-bold font-mono mb-1">
                      <span>Wastewater Inflow Rate</span>
                      <span className="text-amber-500font-bold">{sewageSpeed.toFixed(1)}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.2"
                      max="2.5"
                      step="0.1"
                      value={sewageSpeed}
                      onChange={e => setSewageSpeed(Number(e.target.value))}
                      className="w-full h-1.5 rounded-lg bg-[var(--theme-border)] appearance-none cursor-pointer accent-amber-500"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs font-bold font-mono mb-1">
                      <span>Aeration Tank Air Flow</span>
                      <span className="text-amber-500 font-bold">{aerationPower}%</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      step="5"
                      value={aerationPower}
                      onChange={e => setAerationPower(Number(e.target.value))}
                      className="w-full h-1.5 rounded-lg bg-[var(--theme-border)] appearance-none cursor-pointer accent-amber-500"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs font-bold font-mono mb-1">
                      <span>Organic Litter Toxicity Load</span>
                      <span className="text-amber-500 font-bold">{sewageOrganicLoad} units</span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="50"
                      step="5"
                      value={sewageOrganicLoad}
                      onChange={e => setSewageOrganicLoad(Number(e.target.value))}
                      className="w-full h-1.5 rounded-lg bg-[var(--theme-border)] appearance-none cursor-pointer accent-amber-500"
                    />
                  </div>

                  <div className="p-3 bg-[var(--theme-surface-alt)] rounded-xl border border-[var(--theme-border)] text-xs text-[var(--theme-secondary)] space-y-1.5">
                    <div className="font-bold text-[10px] uppercase tracking-wider text-[var(--theme-primary)]">Purification Stages:</div>
                    <p className="text-[11px] leading-relaxed">
                      1. Mechanical screens catch large grit.<br />
                      2. Aeration bubbling breeds helpful organic degrading bacteria.<br />
                      3. Clarifier settles toxic sludge.<br />
                      4. UV Chamber sanitizes pathogens!
                    </p>
                  </div>
                </div>
              )}

              {/* TAB CONTENT: DNA */}
              {activeTab === 'dna' && (
                <div className="space-y-4">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-blue-500 font-mono block">DNA Strand Accessories</span>
                  <p className="text-xs text-[var(--theme-secondary)] leading-relaxed">Each gene strand pairs Adenine (A) to Thymine (T) and Guanine (G) to Cytosine (C) to form molecular ladders.</p>
                  
                  <button
                    type="button"
                    onClick={handleMutateStrand}
                    className="w-full p-2.5 bg-blue-500 hover:bg-blue-600 font-bold text-white rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all border border-blue-400/25"
                  >
                    <RefreshCw size={13} className="animate-spin-reverse" />
                    Induce Point Mutation (X-Ray)
                  </button>
                </div>
              )}

              {/* Collapsible Action Controls at bottom of panel */}
              <div className="border-t border-[var(--theme-border)] pt-4 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => setAnimating(!animating)}
                  className={`p-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all text-white cursor-pointer ${
                    animating ? 'bg-orange-500 hover:bg-orange-600' : 'bg-green-500 hover:bg-green-600'
                  }`}
                >
                  {animating ? <Pause size={13} /> : <Play size={13} />}
                  {animating ? 'Pause Lab Animation' : 'Resume Lab Simulation'}
                </button>

                {activeTab === 'ecosystem' && (
                  <button
                    type="button"
                    onClick={initializeEcosystem}
                    className="p-2.5 bg-[var(--theme-surface)] border border-[var(--theme-border)] text-xs text-[var(--theme-secondary)] hover:text-[var(--theme-primary)] font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                  >
                    <RefreshCw size={13} />
                    Re-Seed Grassland
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CENTER COLUMN: Graph Canvas & History Plotted Panel */}
      <div className="flex-1 flex flex-col min-h-0 bg-[var(--theme-surface-alt)] relative">
        {/* Canvas Header */}
        <div className="px-4 py-3 border-b border-[var(--theme-border)] flex flex-wrap items-center justify-between gap-3 bg-[var(--theme-surface)] z-10">
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
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold uppercase font-mono tracking-wider text-[var(--theme-secondary)]">
              {activeTab === 'ecosystem' && 'Biotope Grazing Ecosystem Solver'}
              {activeTab === 'heart' && 'Heart Chamber Circulatory Beats'}
              {activeTab === 'respiratory' && `Pulmonary Respiration Gas Exchange [${respiratoryMode.toUpperCase()}]`}
              {activeTab === 'sewage' && 'Wastewater Reclamation Purifier Flow'}
              {activeTab === 'dna' && 'Double Helix Genomic Sequencing'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Dropdown in Header */}
            <div className="hidden lg:flex items-center gap-1.5 border-r border-[var(--theme-border)] pr-2 select-none h-8 mr-1">
              <select
                value={activeTab}
                onChange={(e) => setActiveTab(e.target.value as any)}
                className="bg-[var(--theme-surface)] text-[var(--theme-primary)] border border-[var(--theme-border)] hover:bg-[var(--theme-hover-bg)] text-[11px] py-1 px-2.5 rounded-lg font-bold cursor-pointer outline-none focus:ring-1 focus:ring-[var(--theme-accent)] transition-all max-w-[155px] truncate"
              >
                <option value="ecosystem">1. Grassland Eco</option>
                <option value="heart">2. Heart Circ</option>
                <option value="respiratory">3. Respiratory Gas</option>
                <option value="sewage">4. Sewage Purifier</option>
                <option value="dna">5. DNA Molecules</option>
              </select>
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

        {/* HUD Overlay Displays */}
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
            <span className="text-[10px] font-mono text-[var(--theme-secondary)]">Grass ➔ Rabbit ➔ Wolf Food Web logic</span>
          </div>
        )}

        {/* Live Rendering Canvas */}
        <div className="flex-1 min-h-0 flex items-center justify-center p-4 relative">
          <canvas
            ref={canvasRef}
            width={340}
            height={260}
            className={`w-full max-w-[340px] h-[260px] border border-transparent rounded-2xl shadow transition-all ${
              activeTab === 'heart' && adrenalineActive ? 'ring-2 ring-rose-500 animate-pulse' : ''
            }`}
          />
        </div>

        {/* Real-time Graph/Trends Displays */}
        {activeTab === 'ecosystem' && populationHistory.length > 1 && (
          <div className="mx-4 mb-4 p-3 bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-2xl">
            <div className="flex items-center justify-between text-[10px] font-mono uppercase text-[var(--theme-secondary)] tracking-wider mb-2">
              <span className="flex items-center gap-1"><LineChart size={11} /> Live Biogenesis Population Trend</span>
              <span>Time-series Loop</span>
            </div>
            
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

        {activeTab === 'heart' && (
          <div className="mx-4 mb-4 p-3.5 bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-2xl flex flex-col gap-1 text-[11px] font-sans leading-relaxed text-[var(--theme-secondary)]">
            <div className="font-bold flex items-center gap-1 text-[var(--theme-primary)] text-xs mb-1">
              <Activity size={12} className="text-red-500" /> Circulatory Science Insight
            </div>
            <p>
              The Right Atrium and Ventricle handle <strong>deoxygenated blood</strong> (depleted of oxygen after circulating). Inside these chambers, blood cells (rendered in <span className="text-blue-500 font-bold">blue</span>) are pumped into the pulmonary artery to the lungs, where they absorb O₂ gas.
            </p>
            <p className="mt-1">
              The Left Atria and Ventricle receive <strong>oxygenated blood</strong> from the lungs. Blood cells (rendered in <span className="text-red-500 font-bold">red</span>) enter the chamber, proceed down the ventricles, and are pumped out from the aorta to support tissues in the body.
            </p>
          </div>
        )}

        {activeTab === 'respiratory' && (
          <div className="mx-4 mb-4 p-3.5 bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-2xl flex flex-col gap-1 text-[11px] font-sans leading-relaxed text-[var(--theme-secondary)]">
            <div className="font-bold flex items-center gap-1 text-[var(--theme-primary)] text-xs mb-1">
              <Wind size={12} className="text-sky-500 animate-pulse" /> Gas Cycle Science Insight
            </div>
            {respiratoryMode === 'global' ? (
              <p>
                <strong>Global Carbon Cycle:</strong> Forests and plants take carbon dioxide (CO₂) and water, converting them under sunlight (Photosynthesis) to synthesize sugars and release pure Oxygen (O₂) as a byproduct. Animals inhale O₂ for active respiration and exhale CO₂.
              </p>
            ) : (
              <p>
                <strong>Microscopic Capillary Gas Exchange:</strong> Inside lungs at the alveolar boundary, deoxygenated de-sat cells flow. Oxygen diffuses across alveolar walls into red blood cells (turning them <span className="text-red-500 font-bold">bright red</span>), while Carbon Dioxide transfers out of blood to be exhaled.
              </p>
            )}
          </div>
        )}

        {activeTab === 'sewage' && (
          <div className="mx-4 mb-4 p-3.5 bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-2xl flex flex-col gap-1 text-[11px] font-sans leading-relaxed text-[var(--theme-secondary)]">
            <div className="font-bold flex items-center gap-1 text-[var(--theme-primary)] text-xs mb-1">
              <Droplets size={12} className="text-amber-500 animate-pulse" /> Sewage Purification Science Insight
            </div>
            <p>
              In aeration tanks, <strong>aerated oxygen bubbles</strong> allow aerobic micro-organisms and bacteria (small green particles) to rapidly consume and decay suspended bio-hazardous waste. The ultraviolet radiation chamber uses short-wavelength UV-C lights to scramble pathogen DNA, completely sanitizing the outflow before it is safely returned to natural rivers.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
