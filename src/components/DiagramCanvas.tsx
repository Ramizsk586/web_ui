import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { 
  GitCommit, ChevronRight, Play, Square, Pause, RotateCcw, 
  Copy, Check, Layout, Grid, Sparkles, Navigation, Info, ArrowRight, Layers
} from 'lucide-react';

interface DiagramCanvasProps {
  code: string;
}

interface DiagramNode {
  id: string;
  label: string;
  description?: string;
}

interface DiagramEdge {
  from: string;
  to: string;
  label?: string;
}

function parseDiagramText(text: string): { nodes: DiagramNode[]; edges: DiagramEdge[] } {
  const nodes: DiagramNode[] = [];
  const edges: DiagramEdge[] = [];
  const nodesSet = new Set<string>();

  const lines = text.split('\n');
  
  lines.forEach(line => {
    let cleaned = line.trim();
    if (!cleaned) return;

    // Reject markdown syntax block markers
    if (cleaned.startsWith('```')) return;

    // Look for arrows representations like: A -> B or A --> B
    const arrowMatch = cleaned.match(/(.+?)(?:--?>|-->|->)(.+)/);
    if (arrowMatch) {
      const fromPart = arrowMatch[1].trim();
      const rightPart = arrowMatch[2].trim();

      // Check for inline edge labels: Client -> "Get Request" -> Server
      let toPart = rightPart;
      let edgeLabel = undefined;
      
      const labelMatch = rightPart.match(/(?:"|')([^"']+)(?:"|')\s*(?:--?>|-->|->)\s*(.+)/);
      if (labelMatch) {
        edgeLabel = labelMatch[1];
        toPart = labelMatch[2].trim();
      }

      // Add from node if not exists
      const fromClean = fromPart.replace(/[\[\]\(\)\{\}]/g, '');
      const toClean = toPart.replace(/[\[\]\(\)\{\}]/g, '');

      if (!nodesSet.has(fromClean)) {
        nodes.push({ id: fromClean, label: fromClean });
        nodesSet.add(fromClean);
      }
      
      if (!nodesSet.has(toClean)) {
        nodes.push({ id: toClean, label: toClean });
        nodesSet.add(toClean);
      }

      edges.push({
        from: fromClean,
        to: toClean,
        label: edgeLabel
      });
    } else {
      // Just list lines describing individual node definitions, e.g. Client: handles UI triggers
      const colonMatch = cleaned.match(/^([^:]+):(.+)/);
      if (colonMatch) {
        const id = colonMatch[1].trim().replace(/[\[\]\(\)\{\}]/g, '');
        const desc = colonMatch[2].trim();
        if (!nodesSet.has(id)) {
          nodes.push({ id, label: id, description: desc });
          nodesSet.add(id);
        } else {
          // Update description
          const nd = nodes.find(n => n.id === id);
          if (nd) nd.description = desc;
        }
      } else {
        // Flat node
        const flatLabel = cleaned.replace(/[\[\]\(\)\{\}]/g, '');
        if (!nodesSet.has(flatLabel) && flatLabel.length < 35 && !flatLabel.startsWith('#')) {
          nodes.push({ id: flatLabel, label: flatLabel });
          nodesSet.add(flatLabel);
        }
      }
    }
  });

  // Default flowchart if parsing came up completely empty
  if (nodes.length === 0) {
    return {
      nodes: [
        { id: 'User Web Interface', label: 'User Interface', description: 'Browser SPA application client rendering' },
        { id: 'Express Gateway', label: 'Express Proxy Gateway', description: 'Routes secure APIs & proxies request headers' },
        { id: 'Lumina LLM Model', label: 'Lumina LLM Worker', description: 'Underlying language models performing analysis' },
        { id: 'System Sandboxes', label: 'Analysis Engine', description: 'Runs physics, mathematics, and geometry charts' }
      ],
      edges: [
        { from: 'User Web Interface', to: 'Express Gateway', label: 'https/POST' },
        { from: 'Express Gateway', to: 'Lumina LLM Model', label: 'gRPC stream' },
        { from: 'Express Gateway', to: 'User Web Interface', label: 'response' }
      ]
    };
  }

  return { nodes, edges };
}

export const DiagramCanvas: React.FC<DiagramCanvasProps> = ({ code }) => {
  const [activeStepIdx, setActiveStepIdx] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const stageRef = useRef<HTMLDivElement>(null);
  const pathsSvgRef = useRef<SVGSVGElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const { nodes, edges } = useMemo(() => {
    return parseDiagramText(code);
  }, [code]);

  // Connectors recalculator
  const [edgePaths, setEdgePaths] = useState<Array<{ d: string; fromId: string; toId: string; label?: string; isHighlighted: boolean }>>([]);

  const recalculateEdges = useCallback(() => {
    if (!stageRef.current || !pathsSvgRef.current) return;
    const stageRect = stageRef.current.getBoundingClientRect();
    const svgRect = pathsSvgRef.current.getBoundingClientRect();

    const computed: typeof edgePaths = [];

    edges.forEach(edge => {
      const parentId = `node-box-${edge.from.replace(/\s+/g, '-')}`;
      const childId = `node-box-${edge.to.replace(/\s+/g, '-')}`;

      const pEl = document.getElementById(parentId);
      const cEl = document.getElementById(childId);

      if (pEl && cEl) {
        const pBox = pEl.getBoundingClientRect();
        const cBox = cEl.getBoundingClientRect();

        // Check relative positioning to determine best layout terminals (left-to-right or top-to-bottom)
        const isHorizontal = Math.abs(pBox.top - cBox.top) < 100;

        let startX = 0, startY = 0, endX = 0, endY = 0;

        if (isHorizontal) {
          if (pBox.left < cBox.left) {
            // Right of parent to left of child
            startX = pBox.right - svgRect.left;
            startY = pBox.top + pBox.height / 2 - svgRect.top;
            endX = cBox.left - svgRect.left;
            endY = cBox.top + cBox.height / 2 - svgRect.top;
          } else {
            // Left of parent to right of child
            startX = pBox.left - svgRect.left;
            startY = pBox.top + pBox.height / 2 - svgRect.top;
            endX = cBox.right - svgRect.left;
            endY = cBox.top + cBox.height / 2 - svgRect.top;
          }
        } else {
          if (pBox.top < cBox.top) {
            // Bottom of parent to top of child
            startX = pBox.left + pBox.width / 2 - svgRect.left;
            startY = pBox.bottom - svgRect.top;
            endX = cBox.left + cBox.width / 2 - svgRect.left;
            endY = cBox.top - svgRect.top;
          } else {
            // Top of parent to bottom of child
            startX = pBox.left + pBox.width / 2 - svgRect.left;
            startY = pBox.top - svgRect.top;
            endX = cBox.left + cBox.width / 2 - svgRect.left;
            endY = cBox.bottom - svgRect.top;
          }
        }

        // Draw curve lines using quadratic beziers
        let d = '';
        if (isHorizontal) {
          const ctrlX = startX + (endX - startX) * 0.5;
          d = `M ${startX} ${startY} C ${ctrlX} ${startY} ${ctrlX} ${endY} ${endX} ${endY}`;
        } else {
          const ctrlY = startY + (endY - startY) * 0.5;
          d = `M ${startX} ${startY} C ${startX} ${ctrlY} ${endX} ${ctrlY} ${endX} ${endY}`;
        }

        const isHighlighted = activeStepIdx !== null && 
          ((nodes[activeStepIdx]?.id === edge.from) || (nodes[activeStepIdx]?.id === edge.to));

        computed.push({
          d,
          fromId: edge.from,
          toId: edge.to,
          label: edge.label,
          isHighlighted
        });
      }
    });

    setEdgePaths(computed);
  }, [edges, nodes, activeStepIdx]);

  // Handle window resizing or deck alignment shifts
  useEffect(() => {
    const timer = setTimeout(() => {
      recalculateEdges();
    }, 150);

    window.addEventListener('resize', recalculateEdges);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', recalculateEdges);
    };
  }, [recalculateEdges, activeStepIdx]);

  // Stepper Animator loop
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setActiveStepIdx(prev => {
          if (prev === null || prev >= nodes.length - 1) {
            return 0;
          }
          return prev + 1;
        });
      }, 2500);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, nodes.length]);

  const handleCopyText = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full bg-[#0d0d0d] border border-white/8 rounded-2xl overflow-hidden shadow-xl my-4 font-sans select-none flex flex-col text-[#AD9F91]">
      
      {/* 1. HEADER SECTION */}
      <div className="px-5 py-3.5 bg-[#161616] border-b border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 z-20">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-[#22c55e]/15 text-[#22c55e] border border-[#22c55e]/25">
            <GitCommit size={15} className="animate-pulse" />
          </div>
          <div className="flex flex-col">
            <span className="text-white text-sm font-bold tracking-tight uppercase">Diagram Logic Flow Sandbox</span>
            <span className="text-[10px] text-zinc-505 uppercase tracking-wider font-mono">Dynamic Model Flowchart Analyzer</span>
          </div>
        </div>

        {/* Stepper control play / pause buttons */}
        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-between sm:justify-start">
          <div className="flex items-center gap-1 bg-[#1F1F1F] border border-white/5 p-1 rounded-xl">
            <button
              onClick={() => {
                if (isPlaying) setIsPlaying(false);
                else setIsPlaying(true);
              }}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10.5px] font-bold uppercase transition-all whitespace-nowrap ${
                isPlaying
                  ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                  : 'text-[#8A7D71] hover:text-[#EDE6DD]'
              }`}
              title="Simulator Playback Auto Stepper"
            >
              {isPlaying ? <Pause size={12} className="shrink-0" /> : <Play size={12} className="shrink-0" />}
              <span>{isPlaying ? 'Pause simulation' : 'Automate steps'}</span>
            </button>

            <button
              onClick={() => {
                setIsPlaying(false);
                setActiveStepIdx(null);
              }}
              className="p-1.5 hover:bg-white/5 text-zinc-500 hover:text-white rounded"
              title="Reset manual highlights"
            >
              <RotateCcw size={12} />
            </button>
          </div>

          <button
            onClick={handleCopyText}
            className="p-2 rounded-xl border border-white/5 hover:bg-white/5 text-[#A89F93] hover:text-white transition-all cursor-pointer"
            title="Copy Raw Sequence String"
          >
            {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
          </button>
        </div>
      </div>

      {/* 2. LIVE SIMULATION TRACKER HUD */}
      <div className="px-5 py-2.5 bg-[#121110] border-b border-white/[0.04] text-[11px] flex flex-wrap items-center gap-4 text-zinc-400 font-mono">
        <span className="font-bold text-[#22c55e] uppercase tracking-wide">Flow Index Decks</span>
        <div className="flex gap-1.5 flex-wrap">
          {nodes.map((n, idx) => (
            <button
              key={idx}
              onClick={() => {
                setIsPlaying(false);
                setActiveStepIdx(idx);
              }}
              className={`px-2 py-0.5 rounded-md border text-[10px] transition-all font-bold uppercase ${
                activeStepIdx === idx 
                  ? 'bg-[#22c55e]/10 border-[#22c55e]/30 text-[#22c55e]' 
                  : 'bg-white/[0.02] border-white/5 text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Step {idx + 1}
            </button>
          ))}
        </div>
      </div>

      {/* 3. DIAGRAM CONTAINER MAP STAGE */}
      <div 
        ref={stageRef}
        className="relative bg-[#0b0b0a] min-h-[300px] flex flex-col md:flex-row items-center justify-around gap-8 md:gap-4 p-8 overflow-x-auto select-none"
      >
        {/* Stage Grid Overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(#1a1a19_1.2px,transparent_1.2px)] [background-size:14px_14px] pointer-events-none opacity-45" />

        {/* Connections Vector Paths */}
        <svg 
          className="absolute inset-0 pointer-events-none w-full h-full z-10 transition-all" 
          ref={pathsSvgRef}
        >
          <defs>
            <marker
              id="arrowhead"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#444" />
            </marker>
            <marker
              id="arrowhead-glow"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#22c55e" />
            </marker>
          </defs>
          
          {edgePaths.map((path, idx) => (
            <g key={idx}>
              <path
                d={path.d}
                fill="none"
                stroke={path.isHighlighted ? '#22c55e' : 'rgba(255, 255, 255, 0.05)'}
                strokeWidth={path.isHighlighted ? 2.5 : 1}
                markerEnd={path.isHighlighted ? 'url(#arrowhead-glow)' : 'url(#arrowhead)'}
                className="transition-all duration-300"
              />
              {path.label && (
                <text
                  className="font-mono text-[9px] fill-zinc-600 bg-black font-semibold"
                  dy="-5"
                  textAnchor="middle"
                >
                  <textPath href={`#path-${idx}`} startOffset="50%">
                    {path.label}
                  </textPath>
                  {/* Fallback absolute label if SVG textpath fails */}
                  {path.label}
                </text>
              )}
            </g>
          ))}
        </svg>

        {/* Dynamic Nodes layout maps boxes */}
        {nodes.map((node, idx) => {
          const isActive = activeStepIdx === idx;
          const isTargetedByGlow = activeStepIdx !== null && 
            edges.some(e => (e.from === nodes[activeStepIdx].id && e.to === node.id) || 
                            (e.to === nodes[activeStepIdx].id && e.from === node.id));

          return (
            <div
              key={node.id}
              id={`node-box-${node.id.replace(/\s+/g, '-')}`}
              onClick={() => {
                setIsPlaying(false);
                setActiveStepIdx(idx);
              }}
              className={`max-w-xs w-48 p-4 rounded-xl border flex flex-col gap-1.5 transition-all duration-300 cursor-pointer text-left z-20 hover:scale-102 relative
                ${isActive 
                  ? 'bg-[#1b2b1e]/90 border-[#22c55e]/60 shadow-lg shadow-[#22c55e]/5 scale-105 select-text' 
                  : isTargetedByGlow 
                    ? 'bg-[#121110] border-[#22c55e]/20 ring-1 ring-[#22c55e]/10' 
                    : 'bg-[#121110] border-white/[0.03] hover:border-white/10'
                }
              `}
            >
              {/* Box status identifier */}
              <div className="flex items-center justify-between">
                <span className="text-[9.5px] uppercase tracking-wider font-bold text-zinc-550 font-mono">
                  step {idx + 1}
                </span>
                {isActive && (
                  <span className="w-1.5 h-1.5 bg-[#22c55e] rounded-full animate-ping" />
                )}
              </div>

              <span className={`text-[12.5px] font-bold tracking-tight font-mono ${isActive ? 'text-white' : 'text-[#EDE6DD]'}`}>
                {node.label}
              </span>

              {node.description && (
                <p className="text-[10px] text-zinc-500 border-t border-white/[0.02] pt-1 leading-normal italic select-text">
                  {node.description}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* 4. SELECTION DETAIL HUD SUMMARY */}
      {activeStepIdx !== null && nodes[activeStepIdx] && (
        <div className="px-5 py-3.5 bg-[#121110] border-t border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 font-mono select-text z-10 text-left">
          <div className="flex items-start gap-3">
            <div className="p-1 px-1.5 text-[10px] rounded bg-white/[0.03] text-zinc-400 border border-white/5 uppercase">
              Selected Segment
            </div>
            <div className="flex flex-col">
              <span className="text-white text-xs font-bold leading-none">{nodes[activeStepIdx].id}</span>
              <p className="text-[10.5px] text-zinc-505 leading-normal italic mt-1 font-sans">
                {nodes[activeStepIdx].description || 'No custom descriptive annotations specified for this flowchart node.'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
