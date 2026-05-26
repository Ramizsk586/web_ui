import React, { useState, useEffect, useMemo, useRef } from 'react';
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

interface ChartData {
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
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                activeType === opt.id
                  ? 'bg-blue-550 dark:bg-blue-600 text-white shadow-xs'
                  : 'text-zinc-450 dark:text-zinc-450 hover:text-zinc-700 dark:hover:text-zinc-200'
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
                    className="fill-zinc-400 dark:fill-zinc-650 font-mono text-[10px]"
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
                  className="fill-zinc-400 dark:fill-zinc-650 font-sans text-[10px] select-none"
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
                    className="transition-all duration-305"
                  />
                );
              })}

              {/* Line curves plotting */}
              {activeType === 'line' && visibleDatasets.map((ds, dIdx) => (
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
              {(activeType === 'line' || activeType === 'area') && visibleDatasets.map((ds, dIdx) => (
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
              className={`flex items-center gap-2 px-2.5 py-1.5 border hover:border-zinc-300 dark:hover:border-zinc-800 rounded-lg cursor-pointer transition-all ${
                isHidden 
                  ? 'bg-zinc-100 dark:bg-white/[0.01] border-zinc-200/50 dark:border-white/5 opacity-40' 
                  : 'bg-white dark:bg-white/[0.03] border-zinc-205 dark:border-white/10 text-zinc-800 dark:text-zinc-200'
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
          className="flex items-center justify-between w-full text-left text-xs font-semibold text-zinc-650 dark:text-zinc-400 group focus:outline-hidden"
        >
          <span className="flex items-center gap-1.5 uppercase font-mono tracking-wider font-bold">
            <Sigma size={13} className="text-blue-500" />
            Statistical Summary (Realtime)
          </span>
          <div className="text-zinc-400 group-hover:text-zinc-650">
            {showDataSummary ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </div>
        </button>

        {showDataSummary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-3 mt-2 font-mono border-t border-zinc-100 dark:border-white/5 text-[11px] text-zinc-500">
            <div>
              <span className="block uppercase text-[9px] tracking-wider font-bold">Max Value</span>
              <span className="text-sm font-bold text-zinc-850 dark:text-zinc-200">{stats.max.toLocaleString()}</span>
            </div>
            <div>
              <span className="block uppercase text-[9px] tracking-wider font-bold">Min Value</span>
              <span className="text-sm font-bold text-zinc-850 dark:text-zinc-200">{stats.min.toLocaleString()}</span>
            </div>
            <div>
              <span className="block uppercase text-[9px] tracking-wider font-bold">Mean Average</span>
              <span className="text-sm font-bold text-zinc-850 dark:text-zinc-200">{stats.avg.toLocaleString()}</span>
            </div>
            <div>
              <span className="block uppercase text-[9px] tracking-wider font-bold">Cumulative Sum</span>
              <span className="text-sm font-bold text-zinc-850 dark:text-zinc-200">{stats.sum.toLocaleString()}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ==========================================
// 3. INTERACTIVE GEOMETRY PLAYGROUND (2D / 3D)
// ==========================================

interface GeometryData {
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
            className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
              dimension === '2D'
                ? 'bg-emerald-500 text-white shadow-xs'
                : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >
            2D Physics
          </button>
          <button
            onClick={() => setDimension('3D')}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
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
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors capitalize ${
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
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors capitalize ${
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
                className="absolute bottom-3 right-3 p-2 rounded-xl border border-zinc-200 dark:border-white/10 bg-white/90 dark:bg-zinc-900/90 text-[10px] font-bold uppercase flex items-center gap-1 hover:bg-zinc-50 pointer-events-auto"
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
                    className="w-full accent-emerald-555 h-1 rounded-lg bg-zinc-200 dark:bg-zinc-800 outline-hidden"
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
                    className="w-full accent-emerald-555 h-1 rounded-lg bg-zinc-200 dark:bg-zinc-800 outline-hidden"
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
                    className="w-full accent-emerald-555 h-1 rounded-lg bg-zinc-200 dark:bg-zinc-800 outline-hidden"
                  />
                </div>
              )}
            </div>
          </div>

          {dimension === '3D' && (
            <div className="pt-4 border-t border-zinc-150/50 dark:border-white/5 flex flex-col gap-2">
              <button
                onClick={() => setWireframe(!wireframe)}
                className={`w-full py-2 border rounded-xl font-semibold text-xs transition-colors uppercase tracking-wider ${
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

// ==========================================
// 4. MAIN CUSTOM CONTENT VISUALIZER EXPORT
// ==========================================

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

// ==========================================
// 4.5 INTERACTIVE TABLE & PLOTTING VISUALIZER
// ==========================================

export const InteractiveTableVisualizer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<'table' | 'chart'>('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<{ keyIdx: number | null; direction: 'asc' | 'desc' }>({
    keyIdx: null,
    direction: 'asc'
  });
  const [chartType, setChartType] = useState<'line' | 'bar' | 'area' | 'pie'>('line');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Helper to extract texts recursively from any element type
  const getElementText = (node: any): string => {
    if (!node) return '';
    if (typeof node === 'string' || typeof node === 'number') return String(node);
    if (Array.isArray(node)) return node.map(getElementText).join('');
    if (node.props) {
      if (node.props.children !== undefined) {
        return getElementText(node.props.children);
      }
    }
    return '';
  };

  // Extract table headers and rows based on elements
  const parsedHeadersAndRows = useMemo(() => {
    const headers: string[] = [];
    const rows: string[][] = [];
    let currentRow: string[] = [];

    const traverse = (node: any) => {
      if (!node) return;
      if (Array.isArray(node)) {
        node.forEach(traverse);
        return;
      }
      const type = node.type;
      const props = node.props;

      if (type === 'th') {
        headers.push(getElementText(node).trim());
      } else if (type === 'td') {
        currentRow.push(getElementText(node).trim());
      } else if (type === 'tr') {
        const prevRow = currentRow;
        currentRow = [];
        if (props && props.children) {
          traverse(props.children);
        }
        if (currentRow.length > 0) {
          rows.push(currentRow);
        }
        currentRow = prevRow;
      } else if (props && props.children) {
        traverse(props.children);
      }
    };

    traverse(children);

    return { headers, rows };
  }, [children]);

  const { headers, rows } = parsedHeadersAndRows;

  // Find column indicators (e.g. numeric variables vs labels)
  const colAnalysis = useMemo(() => {
    return headers.map((header, colIdx) => {
      const values = rows.map(r => r[colIdx] || '');
      const parsedValues = values.map(v => {
        if (!v) return null;
        const cleaned = v.replace(/,/g, '').replace(/[^0-9.-]/g, '');
        const parsed = parseFloat(cleaned);
        return isNaN(parsed) ? null : parsed;
      });
      const numericCount = parsedValues.filter(v => v !== null).length;
      const validCount = values.filter(Boolean).length;
      const isNumeric = validCount > 0 && (numericCount / validCount >= 0.7);
      return {
        colIdx,
        header,
        isNumeric,
        parsedValues
      };
    });
  }, [headers, rows]);

  const numericCols = useMemo(() => {
    return colAnalysis.filter(c => c.isNumeric);
  }, [colAnalysis]);

  const isPlottable = numericCols.length > 0;

  const [selectedXCol, setSelectedXCol] = useState<number>(0);
  const [selectedYCols, setSelectedYCols] = useState<number[]>([]);

  // Initialize axis selections
  useEffect(() => {
    if (numericCols.length > 0 && selectedYCols.length === 0) {
      // Default plot first numerical column
      setSelectedYCols([numericCols[0].colIdx]);
      const firstNonNumeric = colAnalysis.find(c => !c.isNumeric);
      if (firstNonNumeric) {
        setSelectedXCol(firstNonNumeric.colIdx);
      } else if (numericCols[0].colIdx !== 0) {
        setSelectedXCol(0);
      } else {
        setSelectedXCol(0);
      }
    }
  }, [numericCols, selectedYCols, colAnalysis]);

  // Handle fallback when no data is parsed
  if (headers.length === 0 || rows.length === 0) {
    return (
      <div className="w-full my-4 overflow-x-auto rounded-xl border border-zinc-200/50 dark:border-white/5 bg-white dark:bg-zinc-900/40 p-1">
        <table className="w-full border-collapse text-left text-sm">
          {children}
        </table>
      </div>
    );
  }

  // Filter rows
  const filteredRows = rows.filter(row => 
    row.some(cell => cell.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Sort rows
  let sortedRows = [...filteredRows];
  if (sortConfig.keyIdx !== null) {
    const { keyIdx, direction } = sortConfig;
    const isColNumeric = colAnalysis[keyIdx]?.isNumeric;
    sortedRows.sort((rowA, rowB) => {
      const valA = rowA[keyIdx] || '';
      const valB = rowB[keyIdx] || '';
      if (isColNumeric) {
        const numA = parseFloat(valA.replace(/,/g, '').replace(/[^0-9.-]/g, '')) || 0;
        const numB = parseFloat(valB.replace(/,/g, '').replace(/[^0-9.-]/g, '')) || 0;
        return direction === 'asc' ? numA - numB : numB - numA;
      }
      return direction === 'asc' 
        ? valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' })
        : valB.localeCompare(valA, undefined, { numeric: true, sensitivity: 'base' });
    });
  }

  // Pagination
  const totalRowsCount = sortedRows.length;
  const totalPages = Math.ceil(totalRowsCount / pageSize) || 1;
  const activePageRows = sortedRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleSort = (colIdx: number) => {
    setSortConfig(prev => {
      if (prev.keyIdx === colIdx) {
        return { keyIdx: colIdx, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { keyIdx: colIdx, direction: 'asc' };
    });
    setCurrentPage(1);
  };

  const handleYColToggle = (colIdx: number) => {
    setSelectedYCols(prev => {
      if (prev.includes(colIdx)) {
        if (prev.length === 1) return prev; // Keep at least one selected
        return prev.filter(idx => idx !== colIdx);
      }
      return [...prev, colIdx];
    });
  };

  const exportCSV = () => {
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => {
        const cleanedCell = cell.replace(/"/g, '""');
        return cleanedCell.includes(',') || cleanedCell.includes('\n') || cleanedCell.includes('"')
          ? `"${cleanedCell}"`
          : cleanedCell;
      }).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `lumina_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Setup dynamic dataset for charts
  const dynamicChartData: ChartData | null = isPlottable && selectedYCols.length > 0 ? {
    type: chartType,
    title: `${selectedYCols.map(idx => headers[idx]).join(' & ')} by ${headers[selectedXCol]}`,
    xAxis: rows.map(r => r[selectedXCol] || ''),
    datasets: selectedYCols.map((yColIdx, idx) => {
      const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'];
      const dataPoints = rows.map(r => {
        const val = r[yColIdx] || '';
        const cleaned = val.replace(/,/g, '').replace(/[^0-9.-]/g, '');
        const parsed = parseFloat(cleaned);
        return isNaN(parsed) ? 0 : parsed;
      });
      return {
        label: headers[yColIdx],
        data: dataPoints,
        color: colors[idx % colors.length]
      };
    })
  } : null;

  return (
    <div className="w-full bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-white/5 rounded-2xl overflow-hidden shadow-xs my-6">
      {/* Visualizer header tabs */}
      <div className="px-5 py-3 bg-zinc-50 dark:bg-zinc-950/40 border-b border-zinc-200/50 dark:border-white/5 flex flex-col xs:flex-row xs:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-1.5 p-1 bg-zinc-100 dark:bg-white/[0.02] border border-zinc-200/30 dark:border-white/5 rounded-xl self-start">
          <button
            onClick={() => setActiveTab('table')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
              activeTab === 'table'
                ? 'bg-white dark:bg-white/10 text-zinc-900 dark:text-white shadow-xs'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            <Grid size={13} />
            <span>Table View</span>
          </button>
          
          {isPlottable && (
            <button
              onClick={() => setActiveTab('chart')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
                activeTab === 'chart'
                  ? 'bg-white dark:bg-white/10 text-zinc-900 dark:text-white shadow-xs'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              <LineChart size={13} />
              <span>Interactive Graph</span>
            </button>
          )}
        </div>

        <button
          onClick={exportCSV}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-white/[0.04] border border-zinc-200/80 dark:border-white/10 hover:bg-zinc-50 dark:hover:bg-white/5 rounded-xl font-bold text-zinc-700 dark:text-zinc-300 transition-all self-start"
          title="Export as CSV"
        >
          <Download size={13} />
          <span>Export CSV</span>
        </button>
      </div>

      {activeTab === 'table' ? (
        // TABLE MODE
        <div className="flex flex-col">
          {/* Table Toolbar Search */}
          <div className="p-4 border-b border-zinc-100 dark:border-white/5 bg-white dark:bg-zinc-900 flex justify-end">
            <div className="relative w-full max-w-xs">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder="Search table rows..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full text-xs pl-10 pr-4 py-2 border border-zinc-200/80 dark:border-white/10 rounded-xl bg-zinc-50/50 dark:bg-white/[0.02] text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
              />
            </div>
          </div>

          {/* Core HTML Table styled */}
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full border-collapse text-left text-xs font-medium">
              <thead>
                <tr className="bg-zinc-50/80 dark:bg-zinc-950/20 text-zinc-400 dark:text-zinc-400 font-bold uppercase tracking-wider border-b border-zinc-200/50 dark:border-white/5">
                  {headers.map((header, colIdx) => {
                    const isSorted = sortConfig.keyIdx === colIdx;
                    return (
                      <th
                        key={colIdx}
                        onClick={() => handleSort(colIdx)}
                        className="px-5 py-3 cursor-pointer hover:bg-zinc-100/45 dark:hover:bg-white/[0.02] transition-colors group"
                      >
                        <div className="flex items-center gap-1.5 select-none">
                          <span>{header}</span>
                          <ArrowUpDown
                            size={11}
                            className={`transition-colors shrink-0 ${
                              isSorted 
                                ? 'text-blue-550 dark:text-blue-400' 
                                : 'text-zinc-300 dark:text-zinc-650 group-hover:text-zinc-400 dark:group-hover:text-zinc-350'
                            }`}
                          />
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-white/5 text-zinc-700 dark:text-zinc-300">
                {activePageRows.map((row, rIdx) => (
                  <tr 
                    key={rIdx} 
                    className="hover:bg-zinc-50/50 dark:hover:bg-white/[0.01] transition-colors"
                  >
                    {headers.map((_, colIdx) => (
                      <td key={colIdx} className="px-5 py-3.5 font-sans">
                        {row[colIdx] !== undefined ? row[colIdx] : ''}
                      </td>
                    ))}
                  </tr>
                ))}
                {activePageRows.length === 0 && (
                  <tr>
                    <td 
                      colSpan={headers.length} 
                      className="px-5 py-12 text-center text-zinc-400 font-medium"
                    >
                      No matching records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Table Pagination Controller */}
          {totalPages > 1 && (
            <div className="px-5 py-3.5 bg-zinc-50/50 dark:bg-zinc-950/10 border-t border-zinc-150/50 dark:border-white/5 flex items-center justify-between text-xs text-zinc-500 font-semibold select-none">
              <span>
                Showing <strong className="text-zinc-700 dark:text-zinc-300">{(currentPage - 1) * pageSize + 1}</strong> to <strong className="text-zinc-700 dark:text-zinc-300">{Math.min(currentPage * pageSize, totalRowsCount)}</strong> of <strong className="text-zinc-700 dark:text-zinc-300">{totalRowsCount}</strong> records
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  className="px-3 py-1.5 bg-white dark:bg-white/[0.04] border border-zinc-200/80 dark:border-white/10 hover:bg-zinc-50 dark:hover:bg-white/5 disabled:opacity-40 disabled:hover:bg-white rounded-xl cursor-pointer"
                >
                  Previous
                </button>
                <span className="font-mono px-1">
                  {currentPage} of {totalPages}
                </span>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  className="px-3 py-1.5 bg-white dark:bg-white/[0.04] border border-zinc-200/80 dark:border-white/10 hover:bg-zinc-50 dark:hover:bg-white/5 disabled:opacity-40 disabled:hover:bg-white rounded-xl cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        // CHART MODE
        <div className="p-5 flex flex-col gap-5 bg-white dark:bg-zinc-900 border-t border-zinc-100 dark:border-white/5">
          {/* Chart Configurations */}
          <div className="flex flex-wrap items-center gap-5 justify-between py-2 border-b border-zinc-100 dark:border-white/5 pb-4">
            <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-zinc-505">
              <div className="flex flex-col gap-1.5">
                <span className="uppercase text-[10px] tracking-wider text-zinc-400 font-bold font-mono">X-Axis Variable</span>
                <select
                  value={selectedXCol}
                  onChange={(e) => setSelectedXCol(Number(e.target.value))}
                  className="bg-zinc-50 dark:bg-white/[0.03] border border-zinc-204 dark:border-white/10 rounded-xl px-3 py-1.5 text-zinc-705 dark:text-zinc-300 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                >
                  {headers.map((header, idx) => (
                    <option key={idx} value={idx}>{header}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="uppercase text-[10px] tracking-wider text-zinc-400 font-bold font-mono">Chart Style</span>
                <div className="flex items-center gap-1 bg-zinc-50 dark:bg-white/[0.02] border border-zinc-200 dark:border-white/5 p-1 rounded-xl">
                  {[
                    { id: 'line', label: 'Line' },
                    { id: 'bar', label: 'Bar' },
                    { id: 'area', label: 'Area' },
                    { id: 'pie', label: 'Pie' }
                  ].map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => setChartType(opt.id as any)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                        chartType === opt.id
                          ? 'bg-white dark:bg-white/10 text-zinc-900 dark:text-white shadow-xs'
                          : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Checkboxes of Y variables */}
            <div className="flex flex-col gap-1.5 text-xs font-semibold">
              <span className="uppercase text-[10px] tracking-wider text-zinc-400 font-bold font-mono">Y-Axis Variables</span>
              <div className="flex flex-wrap gap-2">
                {numericCols.map(col => {
                  const isActive = selectedYCols.includes(col.colIdx);
                  return (
                    <button
                      key={col.colIdx}
                      onClick={() => handleYColToggle(col.colIdx)}
                      className={`px-2.5 py-1 rounded-lg border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        isActive
                          ? 'bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400'
                          : 'bg-zinc-50 dark:bg-white/[0.03] border-zinc-204 dark:border-white/10 text-zinc-450 hover:border-zinc-350 hover:text-zinc-600'
                      }`}
                    >
                      <Check size={11} className={`transition-transform duration-200 ${isActive ? 'scale-100' : 'scale-0'}`} />
                      <span>{col.header}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Chart component render */}
          <div className="w-full flex justify-center py-2">
            {dynamicChartData ? (
              <InteractiveChart data={dynamicChartData} />
            ) : (
              <div className="flex items-center justify-center p-12 text-zinc-400 border border-dashed border-zinc-200 dark:border-white/10 rounded-xl w-full">
                Please select at least one Y-Axis column to plot.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};


export const CustomCodeBlockVisualizer: React.FC<{ language: string; code: string; defaultRender: React.ReactNode }> = ({ language, code, defaultRender }) => {
  const isChart = language === 'chart' || language === 'graph' || code.includes('"xAxis"') || (language === 'json' && code.includes('"datasets"'));
  const isGeometry = language === 'geometry' || language === 'shape' || code.includes('"dimension"') || code.includes('"shape"');
  const isMath = language === 'math' || language === 'latex';

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

  if (isChart) {
    return <InteractiveChart data={code} />;
  }

  if (isAsciiPlot) {
    try {
      const chartProps = parseAsciiGraph(code);
      return (
        <div className="w-full my-4 flex flex-col gap-3">
          <div className="text-[10px] uppercase tracking-wider font-bold text-blue-550 dark:text-blue-400 flex items-center gap-1.5 select-none">
            <Sparkles size={11} className="animate-pulse" />
            Lumina Auto-Rendered Coordinate Graphic
          </div>
          <InteractiveChart data={chartProps} />

          {/* Quick reminder to transfer coordinates into our Physics Whiteboard */}
          <div className="p-3.5 bg-blue-500/[0.03] dark:bg-blue-400/[0.03] border border-blue-500/10 dark:border-blue-400/5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs leading-normal select-none">
            <div className="flex items-start gap-2 text-zinc-550 dark:text-zinc-350">
              <Sparkles size={13} className="text-blue-550 dark:text-blue-400 shrink-0 mt-0.5 animate-pulse" />
              <span>
                Want a real, mathematically perfect, human-drawn <strong>Physics Curve</strong>? You can customize, simulate, and export physics diagrams in high definition vector SVG/PNG.
              </span>
            </div>
            <button
              onClick={() => {
                const event = new CustomEvent('open-physics-canvas');
                window.dispatchEvent(event);
              }}
              className="px-3.5 py-1.5 bg-blue-550 hover:bg-blue-600 text-white font-bold rounded-xl whitespace-nowrap self-start sm:self-auto cursor-pointer flex items-center gap-1.5 transition-colors text-[11px]"
            >
              <span>Launch Physics Canvas</span>
            </button>
          </div>

          <details className="text-xs text-zinc-450 font-mono mt-1 opacity-70">
            <summary className="cursor-pointer select-none font-semibold hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors">
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
  const blockParts = content.split(/(\$\$[\s\S]+?\$\$)/g);
  
  blockParts.forEach((part, bIdx) => {
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
                      className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 font-bold hover:underline mx-0.5 cursor-pointer inline"
                      title={source.title || source.url}
                    >
                      [{num}]
                    </a>
                  );
                } else {
                  parts.push(cPart);
                }
              } else {
                // If it's not a standard citation block, parse for standalone citation numbers (like suffix citations)
                if (cPart.trim().length === 0) {
                  parts.push(cPart);
                  return;
                }
                const miniParts = cPart.split(/(\b\d+\b)/g);
                let currentPosOffset = 0;
                miniParts.forEach((mPart, mIdx) => {
                  if (mIdx % 2 === 1) { // It is a captured matched number from the split regex
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
                              className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 font-bold hover:underline mx-0.5 cursor-pointer inline"
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
