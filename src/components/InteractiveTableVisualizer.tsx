import React, { useState, useEffect, useMemo } from 'react';
import { 
  LineChart, 
  Check, 
  Grid, 
  Download, 
  Search, 
  ArrowUpDown
} from 'lucide-react';
import { InteractiveChart, ChartData } from './LuminaVisualizer';

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
            type="button"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
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
              type="button"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
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
          type="button"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-white/[0.04] border border-zinc-200/80 dark:border-white/10 hover:bg-zinc-50 dark:hover:bg-white/5 rounded-xl font-bold text-zinc-700 dark:text-zinc-300 transition-all self-start cursor-pointer"
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
                        <div className="flex items-center gap-1.5 select-none font-bold">
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
                  type="button"
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
                  type="button"
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
            <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-zinc-550">
              <div className="flex flex-col gap-1.5">
                <span className="uppercase text-[10px] tracking-wider text-zinc-400 font-bold font-mono">X-Axis Variable</span>
                <select
                  value={selectedXCol}
                  onChange={(e) => setSelectedXCol(Number(e.target.value))}
                  className="bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10 rounded-xl px-3 py-1.5 text-zinc-700 dark:text-zinc-300 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500/50 cursor-pointer"
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
                      type="button"
                      className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
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
                      type="button"
                      className={`px-2.5 py-1 rounded-lg border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        isActive
                          ? 'bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400'
                          : 'bg-zinc-50 dark:bg-white/[0.03] border-zinc-200 dark:border-white/10 text-zinc-500 hover:border-zinc-300 hover:text-zinc-655'
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
