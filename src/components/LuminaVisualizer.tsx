import React, { useState, useEffect, useMemo, useRef } from 'react';
import { FileTreeCanvas } from './FileTreeCanvas';
import { DiagramCanvas } from './DiagramCanvas';
import { GeometryPlayground, GeometryData } from './GeometryPlayground';
import { InteractiveTableVisualizer } from './InteractiveTableVisualizer';
import { 
  Globe, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  LineChart, 
  BarChart2, 
  PieChart as PieIcon, 
  Settings, 
  RotateCw, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Sliders, 
  Activity, 
  GitCommit, 
  Table, 
  Sigma,
  Info,
  Search,
  ArrowUpDown,
  Download,
  Grid,
  Sparkles
} from 'lucide-react';

export { InteractiveTableVisualizer, GeometryPlayground };
export type { GeometryData };

// ==========================================
// 1. ADVANCED MATHEMATICAL EQUATION PARSER
// ==========================================

const GREEK_AND_MATH_SYMBOLS: Record<string, string> = {
  '\\alpha': 'α', '\\beta': 'β', '\\gamma': 'γ', '\\delta': 'δ', '\\epsilon': 'ε',
  '\\zeta': 'ζ', '\\eta': 'η', '\\theta': 'θ', '\\iota': 'ι', '\\kappa': 'κ',
  '\\lambda': 'λ', '\\mu': 'μ', '\\nu': 'ν', '\\xi': 'ξ', '\\pi': 'π',
  '\\rho': 'ρ', '\\sigma': 'σ', '\\tau': 'τ', '\\upsilon': 'υ', '\\phi': 'φ',
  '\\chi': 'χ', '\\psi': 'ψ', '\\omega': 'ω',
  '\\Delta': 'Δ', '\\Sigma': 'Σ', '\\Omega': 'Ω', '\\Phi': 'Φ', '\\Theta': 'Θ',
  '\\pm': '±', '\\times': '×', '\\div': '÷', '\\neq': '≠', '\\approx': '≈',
  '\\le': '≤', '\\ge': '≥', '\\infty': '∞', '\\partial': '∂', '\\nabla': '∇',
  '\\int': '∫', '\\sum': '∑', '\\prod': '∏', '\\sqrt': '√',
  '\\leftrightarrow': '↔', '\\rightarrow': '→', '\\leftarrow': '←',
  '\\in': '∈', '\\notin': '∉', '\\subset': '⊂', '\\supset': '⊃',
  '\\forall': '∀', '\\exists': '∃', '\\therefore': '∴', '\\because': '∵'
};

interface MathNode {
  type: 'text' | 'fraction' | 'sqrt' | 'subsup' | 'stacked' | 'symbol' | 'matrix';
  text?: string;
  numerator?: MathNode[];
  denominator?: MathNode[];
  radicand?: MathNode[];
  index?: MathNode[];
  base?: MathNode[];
  sub?: MathNode[];
  sup?: MathNode[];
  rows?: MathNode[][][];
}

// Simple expression tokenizer & parser for standard LaTeX math strings
function parseLatex(latexStr: string): MathNode[] {
  let str = latexStr.trim();
  const nodes: MathNode[] = [];
  let i = 0;

  function parseGroup(): MathNode[] {
    const groupNodes: MathNode[] = [];
    while (i < str.length) {
      const char = str[i];
      if (char === '}') {
        i++;
        break;
      }
      if (char === '{') {
        i++;
        groupNodes.push(...parseGroup());
        continue;
      }
      
      // Parse LaTeX control sequence
      if (char === '\\') {
        let cmd = '';
        i++;
        while (i < str.length && /[a-zA-Z]/.test(str[i])) {
          cmd += str[i];
          i++;
        }
        
        const fullCmd = '\\' + cmd;
        if (fullCmd === '\\frac') {
          // Read numerator
          if (str[i] === '{') i++;
          const num = parseGroup();
          // Read denominator
          if (str[i] === '{') i++;
          const den = parseGroup();
          groupNodes.push({ type: 'fraction', numerator: num, denominator: den });
        } else if (fullCmd === '\\sqrt') {
          let index: MathNode[] | undefined;
          if (str[i] === '[') {
            i++;
            const idxStr = readUntil(']');
            index = parseLatex(idxStr);
          }
          if (str[i] === '{') i++;
          const rad = parseGroup();
          groupNodes.push({ type: 'sqrt', radicand: rad, index });
        } else if (fullCmd === '\\sum' || fullCmd === '\\int' || fullCmd === '\\prod') {
          // Check limits
          let sub: MathNode[] | undefined;
          let sup: MathNode[] | undefined;
          const originalCmd = GREEK_AND_MATH_SYMBOLS[fullCmd] || cmd;
          
          if (str[i] === '_') {
            i++;
            if (str[i] === '{') { i++; sub = parseGroup(); }
            else { sub = [{ type: 'text' as const, text: str[i++] }]; }
          }
          if (str[i] === '^') {
            i++;
            if (str[i] === '{') { i++; sup = parseGroup(); }
            else { sup = [{ type: 'text' as const, text: str[i++] }]; }
          }
          groupNodes.push({ type: 'stacked', text: originalCmd, sub, sup });
        } else if (GREEK_AND_MATH_SYMBOLS[fullCmd]) {
          groupNodes.push({ type: 'symbol', text: GREEK_AND_MATH_SYMBOLS[fullCmd] });
        } else {
          groupNodes.push({ type: 'text', text: cmd });
        }
        continue;
      }

      // Subscript / Superscript detection
      if (char === '_' || char === '^') {
        const lastNode = groupNodes.pop();
        const base = lastNode ? [lastNode] : [{ type: 'text' as const, text: '' }];
        let subNodes: MathNode[] | undefined;
        let supNodes: MathNode[] | undefined;

        if (char === '_') {
          i++;
          if (str[i] === '{') { i++; subNodes = parseGroup(); }
          else { subNodes = [{ type: 'text' as const, text: str[i++] }]; }
          // Lookahead for superscript
          if (str[i] === '^') {
            i++;
            if (str[i] === '{') { i++; supNodes = parseGroup(); }
            else { supNodes = [{ type: 'text' as const, text: str[i++] }]; }
          }
        } else {
          i++;
          if (str[i] === '{') { i++; supNodes = parseGroup(); }
          else { supNodes = [{ type: 'text' as const, text: str[i++] }]; }
          // Lookahead for subscript
          if (str[i] === '_') {
            i++;
            if (str[i] === '{') { i++; subNodes = parseGroup(); }
            else { subNodes = [{ type: 'text' as const, text: str[i++] }]; }
          }
        }
        groupNodes.push({ type: 'subsup', base, sub: subNodes, sup: supNodes });
        continue;
      }

      // Ordinary characters
      groupNodes.push({ type: 'text', text: char });
      i++;
    }
    return groupNodes;
  }

  function readUntil(endChar: string): string {
    let content = '';
    while (i < str.length && str[i] !== endChar) {
      content += str[i];
      i++;
    }
    if (str[i] === endChar) i++;
    return content;
  }

  return parseGroup();
}

export const MathEquation: React.FC<{ formula: string; block?: boolean }> = ({ formula, block = false }) => {
  const nodes = useMemo(() => {
    // Clean raw block formulas tags if included
    let cleaned = formula.replace(/^(\$\$|\\\[|\()/, '').replace(/(\$\$|\\\]|\))$/, '');
    return parseLatex(cleaned);
  }, [formula]);

  const renderNode = (node: MathNode, index: number): React.ReactNode => {
    switch (node.type) {
      case 'text':
      case 'symbol':
        return <span key={index} className="mx-0.5 select-all">{node.text}</span>;
      case 'fraction':
        return (
          <span key={index} className="inline-flex flex-col items-center justify-center align-middle mx-1.5 leading-none">
            <span className="text-center text-[0.92em] pb-1.5 border-b border-zinc-400 dark:border-zinc-600 block min-w-[12px] w-full px-1">
              {node.numerator?.map((n, idx) => renderNode(n, idx))}
            </span>
            <span className="text-center text-[0.92em] pt-1.5 block min-w-[12px] w-full px-1">
              {node.denominator?.map((n, idx) => renderNode(n, idx))}
            </span>
          </span>
        );
      case 'sqrt':
        return (
          <span key={index} className="inline-flex items-center align-middle mx-1 border-t border-zinc-400 dark:border-zinc-500 pt-[2px] mt-[-1px] pl-0.5">
            <span className="text-base font-normal mr-[1px] transform scale-y-[1.1] origin-bottom inline-block select-none">
              {node.index ? <sup className="text-[0.6em] left-[-0.2em]">{node.index.map((n, idx) => renderNode(n, idx))}</sup> : null}
              √
            </span>
            <span className="px-0.5 bg-zinc-400/5 dark:bg-white/5 rounded-xs">
              {node.radicand?.map((n, idx) => renderNode(n, idx))}
            </span>
          </span>
        );
      case 'stacked':
        return (
          <span key={index} className="inline-flex flex-col items-center justify-center align-middle mx-1.5 font-sans">
            {node.sup && (
              <span className="text-[0.68em] text-zinc-500 leading-none h-[1.1em] select-all">
                {node.sup.map((n, idx) => renderNode(n, idx))}
              </span>
            )}
            <span className="text-xl font-medium leading-none py-0.5 select-none">{node.text}</span>
            {node.sub && (
              <span className="text-[0.68em] text-zinc-500 leading-none h-[1.1em] select-all">
                {node.sub.map((n, idx) => renderNode(n, idx))}
              </span>
            )}
          </span>
        );
      case 'subsup':
        return (
          <span key={index} className="inline-flex items-center align-middle mx-0.5">
            <span>{node.base?.map((n, idx) => renderNode(n, idx))}</span>
            <span className="inline-flex flex-col text-[0.72em] leading-tight select-all">
              {node.sup && (
                <span className="translate-y-[-0.15em] font-medium h-[1.1em]">
                  {node.sup.map((n, idx) => renderNode(n, idx))}
                </span>
              )}
              {node.sub && (
                <span className="translate-y-[0.1em] font-medium h-[1.1em]">
                  {node.sub.map((n, idx) => renderNode(n, idx))}
                </span>
              )}
            </span>
          </span>
        );
      default:
        return null;
    }
  };

  if (block) {
    return (
      <div className="w-full overflow-x-auto py-5 px-6 my-4 bg-zinc-500/5 dark:bg-white/[0.02] border border-zinc-200/50 dark:border-white/5 rounded-2xl flex justify-center text-[16.5px] font-mono tracking-wide text-zinc-800 dark:text-zinc-150 select-all custom-scrollbar items-center">
        <div className="flex items-center flex-wrap justify-center font-sans tracking-wide">
          {nodes.map((node, idx) => renderNode(node, idx))}
        </div>
      </div>
    );
  }

  return (
    <span className="inline-flex items-center align-middle px-1 py-0.5 mx-0.5 font-sans text-[14.5px] text-zinc-800 dark:text-zinc-200 select-all">
      {nodes.map((node, idx) => renderNode(node, idx))}
    </span>
  );
};

// ==========================================
// 2. PREMIUM INTERACTIVE SVG GRAPHING & CHARTS
// ==========================================

export interface ChartData {
  type: 'line' | 'bar' | 'area' | 'pie';
  title?: string;
  xAxis: string[];
  datasets: Array<{
    label: string;
    data: number[];
    color?: string;
  }>;
}

export const InteractiveChart: React.FC<{ data: ChartData | string }> = ({ data }) => {
  const chartData = useMemo<ChartData>(() => {
    if (typeof data !== 'string') return data;
    try {
      return JSON.parse(data);
    } catch {
      // Fallback CSV to dataset conversion
      const lines = data.trim().split('\n');
      const headers = lines[0]?.split(',').map(s => s.trim()) || [];
      const xAxis: string[] = [];
      const seriesData: number[] = [];
      
      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(',').map(s => s.trim());
        if (parts[0]) {
          xAxis.push(parts[0]);
          seriesData.push(parseFloat(parts[1] || '0'));
        }
      }

      return {
        type: 'line',
        title: 'Analytical Timeline',
        xAxis,
        datasets: [{ label: headers[1] || 'Values', data: seriesData, color: '#3b82f6' }]
      };
    }
  }, [data]);

  const [activeType, setActiveType] = useState<'line' | 'bar' | 'area' | 'pie'>(chartData.type || 'line');
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [hiddenDatasets, setHiddenDatasets] = useState<Record<string, boolean>>({});
  const [showDataSummary, setShowDataSummary] = useState(false);

  const seriesColors = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'];

  const visibleDatasets = useMemo(() => {
    return chartData.datasets.map((ds, idx) => ({
      ...ds,
      color: ds.color || seriesColors[idx % seriesColors.length]
    })).filter(ds => !hiddenDatasets[ds.label]);
  }, [chartData.datasets, hiddenDatasets]);

  // Aggregate stats
  const stats = useMemo(() => {
    const allVals = visibleDatasets.flatMap(d => d.data);
    if (allVals.length === 0) return { max: 0, min: 0, avg: 0, sum: 0 };
    const sum = allVals.reduce((a, b) => a + b, 0);
    return {
      max: Math.max(...allVals),
      min: Math.min(...allVals),
      avg: Math.round((sum / allVals.length) * 10) / 10,
      sum
    };
  }, [visibleDatasets]);

  // SVG dimensions
  const width = 640;
  const height = 300;
  const paddingLeft = 55;
  const paddingRight = 20;
  const paddingTop = 30;
  const paddingBottom = 40;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  // Compute Scales
  const maxVal = Math.max(stats.max * 1.15, 10);
  const minVal = 0; // standard bar baseline
  const valRange = maxVal - minVal;

  const getX = (index: number) => {
    if (chartData.xAxis.length <= 1) return paddingLeft + chartWidth / 2;
    return paddingLeft + (index / (chartData.xAxis.length - 1)) * chartWidth;
  };

  const getY = (value: number) => {
    return height - paddingBottom - ((value - minVal) / valRange) * chartHeight;
  };

  // Grid line values
  const yTicks = 5;
  const gridLines = Array.from({ length: yTicks }, (_, i) => {
    const val = minVal + (i * (maxVal - minVal)) / (yTicks - 1);
    return { value: Math.round(val), y: getY(val) };
  });

  const toggleDataset = (label: string) => {
    setHiddenDatasets(prev => ({ ...prev, [label]: !prev[label] }));
  };

  return (
    <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-white/5 rounded-2xl overflow-hidden shadow-sm my-6 select-none font-sans max-w-3xl">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-5 py-4 border-b border-zinc-100 dark:border-white/5">
        <div className="flex items-center gap-2">
          <Activity size={16} className="text-blue-500 animate-pulse" />
          <h4 className="text-[14px] font-bold tracking-tight text-zinc-800 dark:text-zinc-200 uppercase">
            {chartData.title || 'Dynamic Analytics Data'}
          </h4>
        </div>
        <div className="flex items-center gap-1 bg-zinc-50 dark:bg-white/[0.02] border border-zinc-200/50 dark:border-white/5 p-1 rounded-xl shrink-0">
          {[
            { id: 'line', label: 'Line', icon: <LineChart size={13} /> },
            { id: 'bar', label: 'Bar', icon: <BarChart2 size={13} /> },
            { id: 'area', label: 'Filled Area', icon: <Activity size={13} /> },
            { id: 'pie', label: 'Share', icon: <PieIcon size={13} /> }
          ].map(opt => (
            <button
              key={opt.id}
              onClick={() => setActiveType(opt.id as any)}
              type="button"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                activeType === opt.id
                  ? 'bg-blue-500 dark:bg-blue-600 text-white shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200'
              }`}
            >
              {opt.icon}
              <span className="hidden leading-none xs:inline">{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main SVG Plot Stage */}
      <div className="relative p-5 overflow-x-auto custom-scrollbar">
        {activeType === 'pie' ? (
          // PIE CHART DESIGN
          <div className="flex flex-col md:flex-row items-center justify-center p-6 gap-8 min-h-[220px]">
            <svg width={220} height={220} className="transform rotate-[-90deg]">
              {(() => {
                const total = visibleDatasets.reduce((sum, ds) => sum + ds.data.reduce((a, b) => a + b, 0), 0);
                if (total === 0) return <text x="110" y="110" textAnchor="middle" fill="#888">No data visible</text>;
                
                let accumulatedAngle = 0;
                return visibleDatasets.flatMap((ds, dIdx) => {
                  const dsVal = ds.data.reduce((a, b) => a + b, 0);
                  const share = dsVal / total;
                  const angle = share * 360;
                  
                  const r = 85;
                  const cx = 110;
                  const cy = 110;
                  
                  const x1 = cx + r * Math.cos((accumulatedAngle * Math.PI) / 180);
                  const y1 = cy + r * Math.sin((accumulatedAngle * Math.PI) / 180);
                  
                  accumulatedAngle += angle;
                  
                  const x2 = cx + r * Math.cos((accumulatedAngle * Math.PI) / 180);
                  const y2 = cy + r * Math.sin((accumulatedAngle * Math.PI) / 180);
                  
                  const largeArcFlag = angle > 180 ? 1 : 0;
                  const pathData = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
                  
                  return (
                    <path
                      key={dIdx}
                      d={pathData}
                      fill={ds.color}
                      opacity={hoverIndex === dIdx ? 0.9 : 0.75}
                      onMouseEnter={() => setHoverIndex(dIdx)}
                      onMouseLeave={() => setHoverIndex(null)}
                      className="transition-all duration-150 cursor-pointer stroke-white dark:stroke-zinc-950"
                      strokeWidth={2}
                    />
                  );
                });
              })()}
              <circle cx="110" cy="110" r="50" className="fill-white dark:fill-zinc-950" />
            </svg>

            {/* Pie Legends with shares */}
            <div className="flex flex-col gap-2 font-mono">
              {visibleDatasets.map((ds, dIdx) => {
                const total = chartData.datasets.reduce((sum, d) => sum + d.data.reduce((a, b) => a + b, 0), 0);
                const dsVal = ds.data.reduce((a, b) => a + b, 0);
                const pct = total > 0 ? Math.round((dsVal / total) * 100) : 0;
                return (
                  <div 
                    key={ds.label}
                    className={`flex items-center gap-3 text-xs p-2 rounded-lg cursor-pointer transition-colors ${
                      hoverIndex === dIdx ? 'bg-zinc-100 dark:bg-white/5' : ''
                    }`}
                    onMouseEnter={() => setHoverIndex(dIdx)}
                    onMouseLeave={() => setHoverIndex(null)}
                  >
                    <div className="w-3 h-3 rounded-md" style={{ backgroundColor: ds.color }} />
                    <span className="font-semibold text-zinc-700 dark:text-zinc-350">{ds.label}:</span>
                    <span className="text-zinc-500 font-bold">{dsVal.toLocaleString()}</span>
                    <span className="text-blue-500 font-bold text-[11px] bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded">
                      {pct}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          // CARTS (BAR / LINE / AREA) DESIGN
          <div className="relative select-none">
            <svg width={width} height={height} className="overflow-visible">
              {/* Horizontal grid lines */}
              {gridLines.map((line, idx) => (
                <g key={idx}>
                  <line
                    x1={paddingLeft}
                    y1={line.y}
                    x2={width - paddingRight}
                    y2={line.y}
                    className="stroke-zinc-100 dark:stroke-white/5"
                    strokeWidth={1}
                    strokeDasharray="4 4"
                  />
                  <text
                    x={paddingLeft - 12}
                    y={line.y + 4}
                    textAnchor="end"
                    className="fill-zinc-400 dark:fill-zinc-600 font-mono text-[10px]"
                  >
                    {line.value.toLocaleString()}
                  </text>
                </g>
              ))}

              {/* X-Axis labels */}
              {chartData.xAxis.map((label, idx) => (
                <text
                  key={idx}
                  x={getX(idx)}
                  y={height - paddingBottom + 18}
                  textAnchor="middle"
                  className="fill-zinc-400 dark:fill-zinc-600 font-sans text-[10px] select-none"
                >
                  {label}
                </text>
              ))}

              {/* Area fill rendering first */}
              {activeType === 'area' && visibleDatasets.map((ds) => {
                const points = ds.data.map((val, idx) => `${getX(idx)},${getY(val)}`);
                const closedPath = `M ${getX(0)},${height - paddingBottom} ` +
                  points.map((p, i) => `L ${p}`).join(' ') +
                  ` L ${getX(ds.data.length - 1)},${height - paddingBottom} Z`;

                return (
                  <path
                    key={ds.label + '-area'}
                    d={closedPath}
                    fill={ds.color}
                    fillOpacity={0.12}
                    className="transition-all duration-350"
                  />
                );
              })}

              {/* Line curves plotting */}
              {activeType === 'line' && visibleDatasets.map((ds) => (
                <path
                  key={ds.label}
                  d={`M ${getX(0)},${getY(ds.data[0])} ` + ds.data.slice(1).map((val, idx) => `L ${getX(idx + 1)},${getY(val)}`).join(' ')}
                  fill="none"
                  stroke={ds.color}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="transition-all duration-300"
                />
              ))}

              {/* Bar plots */}
              {activeType === 'bar' && (
                <g>
                  {chartData.xAxis.map((_, idx) => {
                    const barGroupWidth = chartWidth / chartData.xAxis.length * 0.72;
                    const groupX = getX(idx) - barGroupWidth / 2;
                    const spacing = 1.5;
                    const itemsCount = visibleDatasets.length;
                    const singleBarWidth = (barGroupWidth - (itemsCount - 1) * spacing) / itemsCount;

                    return (
                      <g key={idx}>
                        {visibleDatasets.map((ds, dIdx) => {
                          const val = ds.data[idx] || 0;
                          const barHeight = ((val - minVal) / valRange) * chartHeight;
                          const barX = groupX + dIdx * (singleBarWidth + spacing);
                          const barY = getY(val);

                          return (
                            <rect
                              key={ds.label + '-' + idx}
                              x={barX}
                              y={barY}
                              width={Math.max(singleBarWidth, 3)}
                              height={Math.max(barHeight, 2)}
                              fill={ds.color}
                              rx={2}
                              opacity={hoverIndex === idx ? 0.95 : 0.8}
                              onMouseEnter={() => setHoverIndex(idx)}
                              onMouseLeave={() => setHoverIndex(null)}
                              className="transition-all duration-150 cursor-pointer"
                            />
                          );
                        })}
                      </g>
                    );
                  })}
                </g>
              )}

              {/* Interaction points (scatter indicators for lines/areas) */}
              {(activeType === 'line' || activeType === 'area') && visibleDatasets.map((ds) => (
                <g key={ds.label + '-dots'}>
                  {ds.data.map((val, idx) => (
                    <circle
                      key={idx}
                      cx={getX(idx)}
                      cy={getY(val)}
                      r={hoverIndex === idx ? 5 : 3.5}
                      fill={ds.color}
                      stroke="white"
                      strokeWidth={1.5}
                      onMouseEnter={() => setHoverIndex(idx)}
                      onMouseLeave={() => setHoverIndex(null)}
                      className="cursor-pointer transition-all duration-150"
                    />
                  ))}
                </g>
              ))}

              {/* Floating alignment cursor bar */}
              {hoverIndex !== null && hoverIndex < chartData.xAxis.length && (
                <line
                  x1={getX(hoverIndex)}
                  y1={paddingTop}
                  x2={getX(hoverIndex)}
                  y2={height - paddingBottom}
                  className="stroke-zinc-400/40 dark:stroke-white/10 pointer-events-none"
                  strokeWidth={1}
                />
              )}
            </svg>

            {/* Interactive hover tooltip box overlay */}
            {hoverIndex !== null && hoverIndex < chartData.xAxis.length && (
              <div 
                className="absolute bg-zinc-900/95 dark:bg-black/95 border border-zinc-700/50 text-white rounded-xl shadow-xl p-3 text-xs w-48 z-40 pointer-events-none"
                style={{
                  left: `${Math.min(getX(hoverIndex) - 96, width - 210)}px`,
                  top: `${Math.max(paddingTop, 40)}px`
                }}
              >
                <div className="font-bold border-b border-zinc-700 pb-1.5 mb-2 flex justify-between uppercase font-mono tracking-wider text-[10px] text-zinc-400">
                  <span>KEY INDEX:</span>
                  <span className="text-white">{chartData.xAxis[hoverIndex]}</span>
                </div>
                <div className="space-y-1.5">
                  {visibleDatasets.map((ds) => {
                    const dsVal = ds.data[hoverIndex] || 0;
                    return (
                      <div key={ds.label} className="flex items-center justify-between font-sans">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: ds.color }} />
                          <span className="text-zinc-300 truncate">{ds.label}</span>
                        </div>
                        <span className="font-bold font-mono pl-3">{dsVal.toLocaleString()}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Interactive Legend Row */}
      <div className="flex flex-wrap items-center justify-center gap-4 px-5 py-3.5 bg-zinc-50 dark:bg-zinc-950/40 border-t border-zinc-100 dark:border-white/5 font-sans font-medium text-xs text-zinc-500">
        {chartData.datasets.map((ds, idx) => {
          const isHidden = hiddenDatasets[ds.label];
          const color = ds.color || seriesColors[idx % seriesColors.length];
          return (
            <button
              key={ds.label}
              onClick={() => toggleDataset(ds.label)}
              type="button"
              className={`flex items-center gap-2 px-2.5 py-1.5 border hover:border-zinc-300 dark:hover:border-zinc-855 rounded-lg cursor-pointer transition-all ${
                isHidden 
                  ? 'bg-zinc-100 dark:bg-white/[0.01] border-zinc-200/50 dark:border-white/5 opacity-40' 
                  : 'bg-white dark:bg-white/[0.03] border-zinc-200 dark:border-white/10 text-zinc-800 dark:text-zinc-200'
              }`}
            >
              <div 
                className="w-2.5 h-2.5 rounded-sm" 
                style={{ backgroundColor: color }} 
              />
              <span>{ds.label}</span>
              {isHidden && <span className="text-[9px] font-mono font-bold uppercase ml-1 opacity-60">Hidden</span>}
            </button>
          );
        })}
      </div>

      {/* Aggregate Collapse Block */}
      <div className="border-t border-zinc-100 dark:border-white/5 bg-zinc-50/20 dark:bg-black/[0.04] px-5 py-2.5">
        <button
          onClick={() => setShowDataSummary(!showDataSummary)}
          type="button"
          className="flex items-center justify-between w-full text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400 group focus:outline-hidden cursor-pointer"
        >
          <span className="flex items-center gap-1.5 uppercase font-mono tracking-wider font-bold">
            <Sigma size={13} className="text-blue-500" />
            Statistical Summary (Realtime)
          </span>
          <div className="text-zinc-400 group-hover:text-zinc-600">
            {showDataSummary ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </div>
        </button>

        {showDataSummary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-3 mt-2 font-mono border-t border-zinc-100 dark:border-white/5 text-[11px] text-zinc-500">
            <div>
              <span className="block uppercase text-[9px] tracking-wider font-bold">Max Value</span>
              <span className="text-sm font-bold text-zinc-800 dark:text-zinc-200">{stats.max.toLocaleString()}</span>
            </div>
            <div>
              <span className="block uppercase text-[9px] tracking-wider font-bold">Min Value</span>
              <span className="text-sm font-bold text-zinc-800 dark:text-zinc-200">{stats.min.toLocaleString()}</span>
            </div>
            <div>
              <span className="block uppercase text-[9px] tracking-wider font-bold">Mean Average</span>
              <span className="text-sm font-bold text-zinc-800 dark:text-zinc-200">{stats.avg.toLocaleString()}</span>
            </div>
            <div>
              <span className="block uppercase text-[9px] tracking-wider font-bold">Cumulative Sum</span>
              <span className="text-sm font-bold text-zinc-800 dark:text-zinc-200">{stats.sum.toLocaleString()}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ==========================================
// 4. MAIN CUSTOM CONTENT VISUALIZER EXPORT
// ==========================================

// Helper to parse ASCII coordinates plotting patterns back into real dataset objects
const parseAsciiGraph = (code: string): ChartData => {
  const lines = code.split('\n');
  const points: Array<{ xIdx: number; xChar: number; y: number }> = [];
  let xAxisLabels: string[] = [];
  let yAxisTitle = '';
  let xAxisTitle = '';

  // Look for title or header elements
  if (lines[0] && !lines[0].includes('|')) {
    yAxisTitle = lines[0].trim();
  }
  
  const labelCandidate = lines[lines.length - 1] || '';
  if (labelCandidate && !labelCandidate.includes('|') && !labelCandidate.includes('+')) {
    xAxisTitle = labelCandidate.trim();
  }

  // Find all data lines
  lines.forEach(line => {
    const match = line.match(/^\s*(-?[\d.]+)\s*\|\s*(.*)$/);
    if (match) {
      const yVal = parseFloat(match[1]);
      const dataPart = match[2];
      const pointChars = ['*', 'o', 'x', '•'];
      for (const char of pointChars) {
        const idx = dataPart.indexOf(char);
        if (idx !== -1) {
          points.push({ xIdx: 0, xChar: idx, y: yVal });
          break;
        }
      }
    }
  });

  // Find X-Axis line (e.g. +-------)
  const axisIndex = lines.findIndex(l => l.includes('+--') || l.includes('+__') || l.includes('└─') || l.includes('+-----'));
  if (axisIndex !== -1 && lines[axisIndex + 1]) {
    const labelLine = lines[axisIndex + 1];
    xAxisLabels = labelLine.trim().split(/\s+/);
  }

  // Sort points by character index to form ordered X axis sequence
  points.sort((a, b) => a.xChar - b.xChar);

  // Fallback label filling
  if (xAxisLabels.length === 0) {
    xAxisLabels = points.map((_, i) => String(i));
  } else if (xAxisLabels.length < points.length) {
    while (xAxisLabels.length < points.length) {
      xAxisLabels.push(String(xAxisLabels.length));
    }
  }

  const seriesData = points.map(p => p.y);
  return {
    type: 'line',
    title: yAxisTitle || 'Parsed ASCII Coordinate Plot',
    xAxis: xAxisLabels.slice(0, points.length),
    datasets: [{
      label: yAxisTitle || 'Value',
      data: seriesData,
      color: '#3b82f6'
    }]
  };
};

export const CustomCodeBlockVisualizer: React.FC<{ language: string; code: string; defaultRender: React.ReactNode }> = ({ language, code, defaultRender }) => {
  const isChart = language === 'chart' || language === 'graph' || code.includes('"xAxis"') || (language === 'json' && code.includes('"datasets"'));
  const isGeometry = language === 'geometry' || language === 'shape' || code.includes('"dimension"') || code.includes('"shape"');
  const isMath = language === 'math' || language === 'latex';

  const isTree = useMemo(() => {
    const lang = (language || '').toLowerCase();
    if (['tree', 'filetree', 'directory', 'folders', 'structure', 'skeleton', 'project'].includes(lang)) {
      return true;
    }
    const lines = code.split('\n');
    let branches = 0;
    for (let i = 0; i < Math.min(lines.length, 15); i++) {
      const line = lines[i];
      if (line.includes('├──') || line.includes('└──') || line.includes('│  ') || line.includes('└──')) {
        branches++;
      }
    }
    return branches >= 2;
  }, [code, language]);


  // Support smart rendering of Flowchart diagrams & transit maps
  const isFlowchartDiagram = useMemo(() => {
    const lang = (language || '').toLowerCase();
    // Strictly restrict to dedicated diagram declaration languages to protect normal HTML/CSS/JS code
    if (['diagram', 'flowchart', 'sequence', 'mermaid', 'mindmap'].includes(lang)) {
      return true;
    }
    // Never auto-detect diagrams if standard programming, markup, or style language
    if (['html', 'xml', 'css', 'scss', 'less', 'javascript', 'typescript', 'js', 'ts', 'jsx', 'tsx', 'json', 'yaml', 'yml'].includes(lang)) {
      return false;
    }
    const trimmed = code.trim().toLowerCase();
    if (trimmed.includes('<!doctype') || trimmed.includes('<html') || trimmed.includes('<div') || trimmed.includes('</script>') || trimmed.includes('{') || trimmed.includes('[')) {
      return false;
    }
    const lines = code.split('\n');
    let arrows = 0;
    for (let i = 0; i < Math.min(lines.length, 15); i++) {
      const line = lines[i];
      // Exclude HTML comments or XML segments
      if (line.includes('-->') && (line.includes('<!--') || line.includes('<'))) {
        continue;
      }
      if (line.includes('->') || line.includes('-->')) {
        arrows++;
      }
    }
    return arrows >= 2; // Require at least 2 clear arrow lines to trigger
  }, [code, language]);

  // Custom ASCII art coordinates parser check
  const isAsciiPlot = useMemo(() => {
    if (language && language !== 'text' && language !== 'plain' && language !== 'fallback') return false;
    const lines = code.split('\n');
    let pipeLinesCount = 0;
    let hasXAxisLine = false;
    for (const line of lines) {
      if (line.includes('|') && /\d+/.test(line)) {
        pipeLinesCount++;
      }
      if (line.includes('+---') || line.includes('+___') || line.includes('└─') || line.includes('+-------')) {
        hasXAxisLine = true;
      }
    }
    return pipeLinesCount >= 3 && hasXAxisLine;
  }, [code, language]);

  if (isTree) {
    return <FileTreeCanvas code={code} />;
  }


  if (isFlowchartDiagram) {
    return <DiagramCanvas code={code} />;
  }

  if (isChart) {
    return <InteractiveChart data={code} />;
  }

  if (isAsciiPlot) {
    try {
      const chartProps = parseAsciiGraph(code);
      return (
        <div className="w-full my-4 flex flex-col gap-3">
          <div className="text-[10px] uppercase tracking-wider font-bold text-blue-500 dark:text-blue-400 flex items-center gap-1.5 select-none">
            <Sparkles size={11} className="animate-pulse" />
            Lumina Auto-Rendered Coordinate Graphic
          </div>
          <InteractiveChart data={chartProps} />

          {/* Quick reminder to transfer coordinates into our Physics Whiteboard */}
          <div className="p-3.5 bg-blue-500/[0.03] dark:bg-blue-400/[0.03] border border-blue-500/10 dark:border-blue-400/5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs leading-normal select-none">
            <div className="flex items-start gap-2 text-zinc-500 dark:text-zinc-300">
              <Sparkles size={13} className="text-blue-500 dark:text-blue-400 shrink-0 mt-0.5 animate-pulse" />
              <span>
                Want a real, mathematically perfect, human-drawn <strong>Physics Curve</strong>? You can customize, simulate, and export physics diagrams in high definition vector SVG/PNG.
              </span>
            </div>
            <button
              onClick={() => {
                const event = new CustomEvent('open-physics-canvas');
                window.dispatchEvent(event);
              }}
              type="button"
              className="px-3.5 py-1.5 bg-blue-550 hover:bg-blue-600 text-white font-bold rounded-xl whitespace-nowrap self-start sm:self-auto cursor-pointer flex items-center gap-1.5 transition-colors text-[11px]"
            >
              <span>Launch Physics Canvas</span>
            </button>
          </div>

          <details className="text-xs text-zinc-500 font-mono mt-1 opacity-70">
            <summary className="cursor-pointer select-none font-semibold hover:text-zinc-650 dark:hover:text-zinc-300 transition-colors">
              View original monospace characters
            </summary>
            <pre className="p-3 bg-zinc-50 dark:bg-black/20 rounded-xl overflow-x-auto select-all mt-2 max-w-full custom-scrollbar leading-normal text-left">
              {code}
            </pre>
          </details>
        </div>
      );
    } catch (e) {
      console.error('Failed to parse ASCII plot', e);
    }
  }

  if (isGeometry) {
    return <GeometryPlayground data={code} />;
  }

  if (isMath) {
    return <MathEquation formula={code} block={true} />;
  }

  // Fallback to standard pre / copy component
  return <>{defaultRender}</>;
};

// ==========================================
// 5. MATH EQUATION TEXT EXTRACTOR
// ==========================================

export function renderTextWithMath(content: React.ReactNode, sources?: any[]): React.ReactNode {
  if (typeof content !== 'string') {
    if (Array.isArray(content)) {
      return content.map((child, idx) => (
        <React.Fragment key={idx}>{renderTextWithMath(child, sources)}</React.Fragment>
      ));
    }
    return content;
  }

  // Detect formulas wrapped in double dollars ($$) first, then single dollars ($)
  let parts: React.ReactNode[] = [];
  const blockParts = content.split(/(\$\$[\s\S]+?\ $\$)/g); // Note: regex from original split
  const mainBlockParts = blockParts.length > 1 ? blockParts : content.split(/(\$\$[\s\S]+?\$\$)/g);
  
  mainBlockParts.forEach((part, bIdx) => {
    if (part.startsWith('$$') && part.endsWith('$$')) {
      const formula = part.slice(2, -2);
      parts.push(<MathEquation key={`b-${bIdx}`} formula={formula} block={true} />);
    } else {
      // split on single $
      const inlineParts = part.split(/(\$[^\$\n]+?\$)/g);
      inlineParts.forEach((iPart, iIdx) => {
        if (iPart.startsWith('$') && iPart.endsWith('$')) {
          const formula = iPart.slice(1, -1);
          parts.push(<MathEquation key={`i-${bIdx}-${iIdx}`} formula={formula} block={false} />);
        } else {
          if (sources && sources.length > 0) {
            const citationParts = iPart.split(/(\[\d+\]|\(\d+\))/g);
            citationParts.forEach((cPart, cIdx) => {
              const cleaned = cPart.replace(/[\[\]\(\)]/g, '');
              const num = parseInt(cleaned, 10);
              const isCitation = !isNaN(num) && num > 0 && num <= sources.length && 
                ((cPart.startsWith('[') && cPart.endsWith(']')) || (cPart.startsWith('(') && cPart.endsWith(')')));
              
              if (isCitation) {
                const source = sources[num - 1];
                if (source && source.url) {
                  parts.push(
                    <a
                      key={`c-${bIdx}-${iIdx}-${cIdx}`}
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-550 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 font-bold hover:underline mx-0.5 cursor-pointer inline"
                      title={source.title || source.url}
                    >
                      [{num}]
                    </a>
                  );
                } else {
                  parts.push(cPart);
                }
              } else {
                // Standalone citation numbers
                if (cPart.trim().length === 0) {
                  parts.push(cPart);
                  return;
                }
                const miniParts = cPart.split(/(\b\d+\b)/g);
                let currentPosOffset = 0;
                miniParts.forEach((mPart, mIdx) => {
                  if (mIdx % 2 === 1) {
                    const mNum = parseInt(mPart, 10);
                    if (!isNaN(mNum) && mNum > 0 && mNum <= sources.length) {
                      const precedingText = cPart.slice(0, currentPosOffset);
                      const followingText = cPart.slice(currentPosOffset + mPart.length);
                      
                      const isPrecededByParenthesis = precedingText.trim().endsWith(')');
                      const isPrecededBySpace = precedingText.length === 0 || /\s$/.test(precedingText);
                      const isSucceededByPunctuation = followingText.length === 0 || /^[\.\,\s]/.test(followingText);
                      
                      if (isPrecededByParenthesis || (isPrecededBySpace && isSucceededByPunctuation)) {
                        const source = sources[mNum - 1];
                        if (source && source.url) {
                          parts.push(
                            <a
                              key={`cm-${bIdx}-${iIdx}-${cIdx}-${mIdx}`}
                              href={source.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-550 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 font-bold hover:underline mx-0.5 cursor-pointer inline"
                              title={source.title || source.url}
                            >
                              [{mNum}]
                            </a>
                          );
                          currentPosOffset += mPart.length;
                          return;
                        }
                      }
                    }
                  }
                  parts.push(mPart);
                  currentPosOffset += mPart.length;
                });
              }
            });
          } else {
            parts.push(iPart);
          }
        }
      });
    }
  });

  return <>{parts}</>;
}
