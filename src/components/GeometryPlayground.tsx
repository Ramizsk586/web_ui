import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Settings, 
  RotateCw, 
  Sliders, 
  Info
} from 'lucide-react';

export interface GeometryData {
  dimension: '2D' | '3D';
  shape: 'cube' | 'sphere' | 'cylinder' | 'cone' | 'prism' | 'pyramid' | 'triangle' | 'circle' | 'polygon';
  params?: {
    radius?: number;
    width?: number;
    height?: number;
    depth?: number;
    sides?: number;
  };
  showGrid?: boolean;
  showDimensions?: boolean;
}

export const GeometryPlayground: React.FC<{ data: GeometryData | string }> = ({ data }) => {
  const geoData = useMemo<GeometryData>(() => {
    if (typeof data !== 'string') return data;
    try {
      return JSON.parse(data);
    } catch {
      return { dimension: '3D', shape: 'cube' };
    }
  }, [data]);

  const [dimension, setDimension] = useState<'2D' | '3D'>(geoData.dimension || '3D');
  const [shape, setShape] = useState<string>(geoData.shape || 'cube');
  
  // Draggable triangle coordinates for interactive 2D geometry sandbox
  const [trianglePoints, setTrianglePoints] = useState([
    { id: 'A', x: 200, y: 70, label: 'A' },
    { id: 'B', x: 100, y: 230, label: 'B' },
    { id: 'C', x: 300, y: 230, label: 'C' }
  ]);
  const [activePoint, setActivePoint] = useState<string | null>(null);
  const sandboxRef = useRef<SVGSVGElement>(null);

  // 3D rotation params
  const [angleX, setAngleX] = useState(geoData.shape === 'sphere' ? -0.3 : 0.61);
  const [angleY, setAngleY] = useState(geoData.shape === 'sphere' ? 0.3 : 0.78);
  const [angleZ, setAngleZ] = useState(0.2);
  const [isRotating, setIsRotating] = useState(true);
  const [wireframe, setWireframe] = useState(false);
  const [customRadius, setCustomRadius] = useState<number>(geoData.params?.radius || 4.2);
  const [customHeight, setCustomHeight] = useState<number>(geoData.params?.height || 5.5);
  const [customSides, setCustomSides] = useState<number>(geoData.params?.sides || 5);

  const dragOffset = useRef({ x: 0, y: 0 });

  // 3D Projector Matrices & Equations
  useEffect(() => {
    if (!isRotating) return;
    const interval = setInterval(() => {
      setAngleY(prev => (prev + 0.012) % (Math.PI * 2));
      setAngleX(prev => (prev + 0.005) % (Math.PI * 2));
    }, 30);
    return () => clearInterval(interval);
  }, [isRotating]);

  // Points of 3D wireframes
  const projections3D = useMemo(() => {
    const points: Array<[number, number, number]> = [];
    const faces: Array<number[]> = [];

    if (shape === 'cube') {
      const size = 3;
      // 8 vertices
      points.push(
        [-size, -size, -size], [size, -size, -size], [size, size, -size], [-size, size, -size],
        [-size, -size, size], [size, -size, size], [size, size, size], [-size, size, size]
      );
      // 6 faces
      faces.push(
        [0, 1, 2, 3], // Front
        [4, 5, 6, 7], // Back
        [0, 1, 5, 4], // Bottom
        [2, 3, 7, 6], // Top
        [0, 3, 7, 4], // Left
        [1, 2, 6, 5]  // Right
      );
    } else if (shape === 'pyramid') {
      const base = 3.5;
      const heightVal = customHeight * 0.7;
      points.push(
        [-base, -base, -base], [base, -base, -base], [base, -base, base], [-base, -base, base],
        [0, heightVal, 0] // Apex Vertex
      );
      faces.push(
        [0, 1, 2, 3], // Bottom base
        [0, 1, 4], [1, 2, 4], [2, 3, 4], [3, 0, 4] // Sides
      );
    } else if (shape === 'cylinder') {
      const r = customRadius * 0.72;
      const h = customHeight * 0.6;
      const segments = customSides <= 3 ? 12 : customSides * 3;
      
      // Bottom vertices
      for (let s = 0; s < segments; s++) {
        const theta = (s / segments) * Math.PI * 2;
        points.push([r * Math.cos(theta), -h, r * Math.sin(theta)]);
      }
      // Top vertices
      for (let s = 0; s < segments; s++) {
        const theta = (s / segments) * Math.PI * 2;
        points.push([r * Math.cos(theta), h, r * Math.sin(theta)]);
      }

      // Base bottom & top faces
      const botFace: number[] = Array.from({ length: segments }, (_, i) => i);
      const topFace: number[] = Array.from({ length: segments }, (_, i) => segments + i).reverse();
      faces.push(botFace, topFace);

      // Sides index linkage
      for (let s = 0; s < segments; s++) {
        const next = (s + 1) % segments;
        faces.push([s, next, segments + next, segments + s]);
      }
    } else if (shape === 'prism') {
      const r = customRadius * 0.75;
      const h = customHeight * 0.62;
      const segments = customSides;

      // Bottom vertices
      for (let s = 0; s < segments; s++) {
        const theta = (s / segments) * Math.PI * 2;
        points.push([r * Math.cos(theta), -h, r * Math.sin(theta)]);
      }
      // Top vertices
      for (let s = 0; s < segments; s++) {
        const theta = (s / segments) * Math.PI * 2;
        points.push([r * Math.cos(theta), h, r * Math.sin(theta)]);
      }

      faces.push(
        Array.from({ length: segments }, (_, i) => i),
        Array.from({ length: segments }, (_, i) => segments + i).reverse()
      );

      for (let s = 0; s < segments; s++) {
        const next = (s + 1) % segments;
        faces.push([s, next, segments + next, segments + s]);
      }
    } else if (shape === 'sphere') {
      const r = customRadius * 0.75;
      const rings = 12;
      const sectors = 12;

      for (let ri = 0; ri <= rings; ri++) {
        const theta = (ri / rings) * Math.PI;
        for (let se = 0; se < sectors; se++) {
          const phi = (se / sectors) * Math.PI * 2;
          points.push([
            r * Math.sin(theta) * Math.cos(phi),
            r * Math.cos(theta),
            r * Math.sin(theta) * Math.sin(phi)
          ]);
        }
      }

      for (let ri = 0; ri < rings; ri++) {
        for (let se = 0; se < sectors; se++) {
          const first = ri * sectors + se;
          const second = first + sectors;
          const nextSe = (se + 1) % sectors;
          const firstNext = ri * sectors + nextSe;
          const secondNext = firstNext + sectors;

          faces.push([first, firstNext, secondNext, second]);
        }
      }
    }

    // Apply 3D Rotation to coordinate point tuples
    const projected2D = points.map(([x, y, z]) => {
      // Rotation Y
      const cosY = Math.cos(angleY);
      const sinY = Math.sin(angleY);
      let x1 = x * cosY - z * sinY;
      let z1 = x * sinY + z * cosY;

      // Rotation X
      const cosX = Math.cos(angleX);
      const sinX = Math.sin(angleX);
      let y2 = y * cosX - z1 * sinX;
      let z2 = y * sinX + z1 * cosX;

      // Project onto isometric coordinate plane
      const scale = 25;
      const zoom = 1.15;
      const centX = 200;
      const centY = 160;

      return {
        x: centX + x1 * scale * zoom,
        y: centY - y2 * scale * zoom,
        z: z2 // for painters shading order algorithm
      };
    });

    // Face Painter's Shading Algorithm: sort faces by average Z depth to correctly occlude backfaces
    const sortedFaces = faces.map((faceIndices, faceIdx) => {
      const avgZ = faceIndices.reduce((sum, idx) => sum + (projected2D[idx]?.z || 0), 0) / faceIndices.length;
      return { indices: faceIndices, avgZ, originalIndex: faceIdx };
    }).sort((a, b) => b.avgZ - a.avgZ);

    return { projected: projected2D, faces: sortedFaces };
  }, [shape, angleX, angleY, customRadius, customHeight, customSides]);

  // Handle Drag Events in 2D Triangle geometry panel
  const handleMouseDown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!sandboxRef.current) return;
    const rect = sandboxRef.current.getBoundingClientRect();
    const currPoint = trianglePoints.find(p => p.id === id);
    if (!currPoint) return;
    
    // Calculate exact mouse client-coordinates offset offset
    const mX = e.clientX - rect.left;
    const mY = e.clientY - rect.top;

    dragOffset.current = { x: mX - currPoint.x, y: mY - currPoint.y };
    setActivePoint(id);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!activePoint || !sandboxRef.current) return;
    const rect = sandboxRef.current.getBoundingClientRect();
    const mX = e.clientX - rect.left;
    const mY = e.clientY - rect.top;

    // Boundary snap
    const nX = Math.max(20, Math.min(rect.width - 20, mX - dragOffset.current.x));
    const nY = Math.max(20, Math.min(rect.height - 20, mY - dragOffset.current.y));

    setTrianglePoints(prev => prev.map(p => p.id === activePoint ? { ...p, x: nX, y: nY } : p));
  };

  const handleMouseUp = () => {
    setActivePoint(null);
  };

  // Draggable geometry attributes (Triangle angle math)
  const triangleSpecs = useMemo(() => {
    const [A, B, C] = trianglePoints;
    
    // Side Length math
    const dsSquare = (p1: any, p2: any) => Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2);
    const lenA = Math.sqrt(dsSquare(B, C)); // a is opposite to A
    const lenB = Math.sqrt(dsSquare(A, C)); // b is opposite to B
    const lenC = Math.sqrt(dsSquare(A, B)); // c is opposite to C

    // Heron's Area math
    const s = (lenA + lenB + lenC) / 2;
    const rawArea = Math.sqrt(s * (s - lenA) * (s - lenB) * (s - lenC));
    const area = isNaN(rawArea) ? 0 : Math.round(rawArea);

    // Law of Cosines angles values
    const angleAt = (op: number, adj1: number, adj2: number) => {
      const val = (Math.pow(adj1, 2) + Math.pow(adj2, 2) - Math.pow(op, 2)) / (2 * adj1 * adj2);
      return Math.round((Math.acos(Math.max(-1, Math.min(1, val))) * 180) / Math.PI);
    };

    const angleA = angleAt(lenA, lenB, lenC);
    const angleB = angleAt(lenB, lenA, lenC);
    const angleC = angleAt(lenC, lenA, lenB);

    return {
      a: Math.round(lenA * 0.1 * 10) / 10,
      b: Math.round(lenB * 0.1 * 10) / 10,
      c: Math.round(lenC * 0.1 * 10) / 10,
      angleA,
      angleB,
      angleC,
      area
    };
  }, [trianglePoints]);

  return (
    <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-white/5 rounded-2xl overflow-hidden shadow-sm my-6 font-sans select-none max-w-3xl">
      {/* Visual Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-5 py-4 border-b border-zinc-100 dark:border-white/5">
        <div className="flex items-center gap-2">
          <Settings size={16} className="text-emerald-500" />
          <h4 className="text-[14px] font-bold tracking-tight text-zinc-800 dark:text-zinc-200 uppercase">
            Interact with {shape} Shape Sandbox (Interactive Render)
          </h4>
        </div>
        <div className="flex items-center gap-1 bg-zinc-50 dark:bg-white/[0.02] border border-zinc-200/50 dark:border-white/5 p-1 rounded-xl shrink-0 font-mono">
          <button
            onClick={() => setDimension('2D')}
            type="button"
            className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
              dimension === '2D'
                ? 'bg-emerald-500 text-white shadow-xs'
                : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >
            2D Physics
          </button>
          <button
            onClick={() => setDimension('3D')}
            type="button"
            className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
              dimension === '3D'
                ? 'bg-emerald-500 text-white shadow-xs'
                : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >
            3D Projection
          </button>
        </div>
      </div>

      {/* Shapes list toolbar selectors */}
      <div className="flex flex-wrap items-center gap-1 px-4 py-2 border-b border-zinc-100 dark:border-white/5 bg-zinc-50/40 dark:bg-black/10">
        {dimension === '2D' ? (
          ['triangle', 'circle'].map(sKey => (
            <button
              key={sKey}
              onClick={() => setShape(sKey)}
              type="button"
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
                shape === sKey
                  ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                  : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-white/5'
              }`}
            >
              {sKey}
            </button>
          ))
        ) : (
          ['cube', 'cylinder', 'prism', 'pyramid', 'sphere'].map(sKey => (
            <button
              key={sKey}
              onClick={() => setShape(sKey)}
              type="button"
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
                shape === sKey
                  ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                  : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-white/5'
              }`}
            >
              {sKey}
            </button>
          ))
        )}
      </div>

      {/* Main Sandbox Canvas rendering area */}
      <div className="flex flex-col md:flex-row border-b border-zinc-100 dark:border-white/5">
        <div className="flex-1 min-h-[320px] bg-zinc-50/50 dark:bg-zinc-950/40 relative flex items-center justify-center">
          {dimension === '2D' ? (
            shape === 'triangle' ? (
              // 2D Interactive Triangle rendering with draggable snapping points
              <svg
                ref={sandboxRef}
                width={400}
                height={300}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseUp}
                onMouseUp={handleMouseUp}
                className="overflow-visible select-none"
              >
                {/* Visual coordinate Grid lines */}
                <g className="stroke-zinc-100 dark:stroke-zinc-900/40" strokeWidth={1}>
                  {Array.from({ length: 8 }).map((_, i) => (
                    <line key={'h-' + i} x1={0} y1={i * 40} x2={400} y2={i * 40} />
                  ))}
                  {Array.from({ length: 10 }).map((_, i) => (
                    <line key={'w-' + i} x1={i * 40} y1={0} x2={i * 40} y2={300} />
                  ))}
                </g>

                {/* Polygonal Area fill */}
                <polygon
                  points={trianglePoints.map(p => `${p.x},${p.y}`).join(' ')}
                  fill="rgba(16, 185, 129, 0.08)"
                  stroke="#10b981"
                  strokeWidth={2}
                  strokeLinejoin="round"
                />

                {/* Internal dynamic angle arcs labels */}
                {trianglePoints.map((pt, idx) => {
                  const s = triangleSpecs;
                  const labelAngle = idx === 0 ? s.angleA : idx === 1 ? s.angleB : s.angleC;
                  return (
                    <text
                      key={'lbl-' + idx}
                      x={pt.x}
                      y={idx === 0 ? pt.y - 12 : pt.y + 20}
                      textAnchor="middle"
                      className="fill-zinc-400 dark:fill-zinc-500 font-bold text-[10px]"
                    >
                      {pt.id} ({labelAngle}°)
                    </text>
                  );
                })}

                {/* Polygon Segment interactive length values overlay */}
                {(() => {
                  const [A, B, C] = trianglePoints;
                  const mid = (p1: any, p2: any) => ({ x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 });
                  
                  return (
                    <g className="fill-zinc-700 dark:fill-zinc-300 font-semibold text-[10px] bg-white text-center">
                      <rect x={mid(A, B).x - 15} y={mid(A, B).y - 8} width={30} height={16} rx={4} className="fill-white dark:fill-zinc-900 stroke-zinc-200 dark:stroke-white/10" strokeWidth={0.5} />
                      <text x={mid(A, B).x} y={mid(A, B).y + 3} textAnchor="middle">{triangleSpecs.c}m</text>

                      <rect x={mid(B, C).x - 15} y={mid(B, C).y - 8} width={30} height={16} rx={4} className="fill-white dark:fill-zinc-900 stroke-zinc-200 dark:stroke-white/10" strokeWidth={0.5} />
                      <text x={mid(B, C).x} y={mid(B, C).y + 3} textAnchor="middle">{triangleSpecs.a}m</text>

                      <rect x={mid(A, C).x - 15} y={mid(A, C).y - 8} width={30} height={16} rx={4} className="fill-white dark:fill-zinc-900 stroke-zinc-200 dark:stroke-white/10" strokeWidth={0.5} />
                      <text x={mid(A, C).x} y={mid(A, C).y + 3} textAnchor="middle">{triangleSpecs.b}m</text>
                    </g>
                  );
                })()}

                {/* Draggable vertex control points */}
                {trianglePoints.map((pt) => {
                  const isActive = activePoint === pt.id;
                  return (
                     <circle
                      key={pt.id}
                      cx={pt.x}
                      cy={pt.y}
                      r={isActive ? 8 : 6.5}
                      className="fill-white stroke-emerald-500 shadow-md cursor-grab active:cursor-grabbing hover:scale-110 transition-all"
                      strokeWidth={isActive ? 3.5 : 2}
                      onMouseDown={(e) => handleMouseDown(e, pt.id)}
                    />
                  );
                })}
              </svg>
            ) : (
              // 2D Circle coordinates
              <div className="flex flex-col items-center justify-center p-6 gap-3">
                <svg width={300} height={200} className="overflow-visible">
                  <g className="stroke-zinc-100 dark:stroke-zinc-900/40" strokeWidth={1}>
                    {Array.from({ length: 6 }).map((_, i) => (
                      <line key={'h-' + i} x1={0} y1={i * 40} x2={300} y2={i * 40} />
                    ))}
                    {Array.from({ length: 8 }).map((_, i) => (
                      <line key={'w-' + i} x1={i * 40} y1={0} x2={i * 40} y2={200} />
                    ))}
                  </g>
                  <circle cx={150} cy={100} r={customRadius * 15} fill="rgba(16, 185, 129, 0.08)" stroke="#10b981" strokeWidth={2.5} />
                  <line x1={150} y1={100} x2={150 + customRadius * 15} y2={100} stroke="#f59e0b" strokeWidth={2} strokeDasharray="3 3" />
                  <circle cx={150} cy={100} r={4} fill="#10b981" />
                  <text x={150} y={92} textAnchor="middle" className="text-[10px] font-bold fill-zinc-400">Center (0,0)</text>
                  <text x={150 + (customRadius * 15) / 2} y={115} textAnchor="middle" className="text-[10px] font-bold fill-amber-500">Radius (r={customRadius}m)</text>
                </svg>
              </div>
            )
          ) : (
            // ========================
            // 3D Isometric Projection Engine stage rendering
            // ========================
            <div className="relative w-[400px] h-[320px] select-none" onMouseDown={() => setIsRotating(false)}>
              <svg width={400} height={320} className="overflow-visible select-none pointer-events-none">
                {/* Render projection faces */}
                {(() => {
                  const { projected, faces } = projections3D;
                  return faces.map((face, fIdx) => {
                    const pointsStr = face.indices.map(idx => {
                      const pt = projected[idx];
                      return pt ? `${pt.x},${pt.y}` : '0,0';
                    }).join(' ');

                    // Basic lambert lighting algorithm
                    const faceOpacity = wireframe ? 0 : 0.65;
                    const fillColors = {
                      'cube': '#0ea5e9',
                      'cylinder': '#10b981',
                      'prism': '#8b5cf6',
                      'pyramid': '#f59e0b',
                      'sphere': '#ec4899'
                    }[shape] || '#10b981';

                    // Modulate shades based on paint layer index for high-res look
                    const shade = Math.floor((face.originalIndex * 8) % 35);
                    const cellColor = wireframe ? 'none' : `color-mix(in srgb, ${fillColors} ${70 + shade}%, black)`;

                    return (
                      <polygon
                        key={fIdx}
                        points={pointsStr}
                        fill={cellColor}
                        fillOpacity={faceOpacity}
                        stroke={wireframe ? fillColors : 'rgba(255, 255, 255, 0.15)'}
                        strokeWidth={wireframe ? 2 : 0.82}
                        strokeLinejoin="round"
                      />
                    );
                  });
                })()}

                {/* Wireframe outlines on top of shaded plane faces */}
                {!wireframe && projections3D.faces.map((face, fIdx) => {
                  const pointsStr = face.indices.map(idx => {
                    const pt = projections3D.projected[idx];
                    return pt ? `${pt.x},${pt.y}` : '0,0';
                  }).join(' ');
                  return (
                    <polygon
                      key={'w-top-' + fIdx}
                      points={pointsStr}
                      fill="none"
                      stroke="rgba(255, 255, 255, 0.2)"
                      strokeWidth={0.5}
                    />
                  );
                })}
              </svg>

              {/* Slider rotation overlays */}
              <button 
                onClick={() => setIsRotating(!isRotating)}
                type="button"
                className="absolute bottom-3 right-3 p-2 rounded-xl border border-zinc-200 dark:border-white/10 bg-white/90 dark:bg-zinc-900/90 text-[10px] font-bold uppercase flex items-center gap-1 hover:bg-zinc-50 pointer-events-auto cursor-pointer"
              >
                <RotateCw size={11} className={isRotating ? 'animate-spin-slow' : ''} />
                {isRotating ? 'Pause rotation' : 'Orbit shape'}
              </button>
            </div>
          )}
        </div>

        {/* Dynamic Parameter Settings Panel */}
        <div className="w-full md:w-[220px] p-5 border-t md:border-t-0 md:border-l border-zinc-100 dark:border-white/5 space-y-4 shrink-0 bg-zinc-50/40 dark:bg-black/5 flex flex-col justify-between">
          <div className="space-y-4">
            <h5 className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-1.5 font-mono">
              <Sliders size={12} className="text-emerald-500" />
              Dimensions & Metrics
            </h5>

            {/* Shape-specific specifications */}
            <div className="space-y-3 font-mono text-[11px]">
              {dimension === '2D' && shape === 'triangle' && (
                <>
                  <div className="p-2 border border-zinc-100 dark:border-white/5 bg-white dark:bg-zinc-950/40 rounded-lg">
                    <span className="text-zinc-400 block font-bold text-[9px] uppercase">Triangle Area</span>
                    <span className="text-zinc-800 dark:text-zinc-200 text-sm font-bold">{triangleSpecs.area} sqm</span>
                  </div>
                  <div className="p-2 border border-zinc-100 dark:border-white/5 bg-white dark:bg-zinc-950/40 rounded-lg space-y-1">
                    <span className="text-zinc-400 block font-bold text-[9px] uppercase">Vertex Angles</span>
                    <div className="grid grid-cols-3 text-center text-zinc-700 dark:text-zinc-300">
                      <div>A: <b className="text-zinc-805 dark:text-zinc-100">{triangleSpecs.angleA}°</b></div>
                      <div>B: <b className="text-zinc-805 dark:text-zinc-100">{triangleSpecs.angleB}°</b></div>
                      <div>C: <b className="text-zinc-805 dark:text-zinc-100">{triangleSpecs.angleC}°</b></div>
                    </div>
                  </div>
                </>
              )}

              {/* Adjusters */}
              {(shape === 'circle' || shape === 'sphere' || shape === 'cylinder' || shape === 'prism') && (
                <div className="space-y-1">
                  <span className="text-zinc-500 dark:text-zinc-400 text-[10px] font-bold uppercase block justify-between flex">
                    <span>Radius (r)</span>
                    <span className="text-emerald-500 font-mono italic">{customRadius}m</span>
                  </span>
                  <input
                    type="range"
                    min="1.5"
                    max="6.0"
                    step="0.1"
                    value={customRadius}
                    onChange={(e) => setCustomRadius(parseFloat(e.target.value))}
                    className="w-full accent-emerald-512 h-1 rounded-lg bg-zinc-200 dark:bg-zinc-800 outline-hidden cursor-pointer"
                  />
                </div>
              )}

              {(shape === 'cylinder' || shape === 'prism' || shape === 'pyramid') && (
                <div className="space-y-1 mt-3">
                  <span className="text-zinc-500 dark:text-zinc-400 text-[10px] font-bold uppercase block justify-between flex">
                    <span>Height (h)</span>
                    <span className="text-emerald-500 font-mono italic">{customHeight}m</span>
                  </span>
                  <input
                    type="range"
                    min="2"
                    max="8"
                    step="0.2"
                    value={customHeight}
                    onChange={(e) => setCustomHeight(parseFloat(e.target.value))}
                    className="w-full accent-emerald-512 h-1 rounded-lg bg-zinc-200 dark:bg-zinc-800 outline-hidden cursor-pointer"
                  />
                </div>
              )}

              {shape === 'prism' && (
                <div className="space-y-1 mt-3">
                  <span className="text-zinc-500 dark:text-zinc-400 text-[10px] font-bold uppercase block justify-between flex">
                    <span>Polygon Sides</span>
                    <span className="text-emerald-500 font-mono italic">{customSides} faces</span>
                  </span>
                  <input
                    type="range"
                    min="3"
                    max="10"
                    step="1"
                    value={customSides}
                    onChange={(e) => setCustomSides(parseInt(e.target.value, 10))}
                    className="w-full accent-emerald-512 h-1 rounded-lg bg-zinc-200 dark:bg-zinc-800 outline-hidden cursor-pointer"
                  />
                </div>
              )}
            </div>
          </div>

          {dimension === '3D' && (
            <div className="pt-4 border-t border-zinc-150/50 dark:border-white/5 flex flex-col gap-2">
              <button
                onClick={() => setWireframe(!wireframe)}
                type="button"
                className={`w-full py-2 border rounded-xl font-semibold text-xs transition-colors uppercase tracking-wider cursor-pointer ${
                  wireframe 
                    ? 'bg-blue-500/15 border-blue-500/20 text-blue-500' 
                    : 'bg-white dark:bg-zinc-950 hover:bg-zinc-100 dark:hover:bg-white/5 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-white/10'
                }`}
              >
                {wireframe ? 'Shaded mode' : 'Wireframe blueprint'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Numerical output summary footer */}
      <div className="px-5 py-3 bg-zinc-50 dark:bg-zinc-950/20 text-[10px] font-mono text-zinc-400 border-t border-zinc-100 dark:border-white/5 flex items-center justify-between">
        <span className="flex items-center gap-1 tracking-widest font-bold">
          <Info size={11} className="text-emerald-500" />
          ACTIVE PHYSICS SYSTEM: {dimension} • {shape.toUpperCase()} SHADER
        </span>
        <span className="tracking-wide text-zinc-400 dark:text-zinc-500 font-bold uppercase">Ready</span>
      </div>
    </div>
  );
};
