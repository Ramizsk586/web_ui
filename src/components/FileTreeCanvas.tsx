import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  Folder, FolderOpen, FileText, ChevronRight, ChevronDown, Sparkles, 
  Search, X, Play, Copy, Check, Download, Layers, Grid, Sliders, Info, 
  BookOpen, Code, Hash, Zap, FileCode, Braces, Terminal, RefreshCw, AlertCircle
} from 'lucide-react';

// ==================== TYPES & STRUCTS ====================
export interface FileTreeNode {
  id: string;          // Full path representation, e.g. "src/components"
  name: string;        // Just the file or folder name, e.g. "components"
  type: 'file' | 'folder';
  comment?: string;    // Extra comments parsed inline, e.g. "static assets"
  children: FileTreeNode[];
  depth: number;
  isOpen?: boolean;    // Expand/collapse state
}

interface FileTreeCanvasProps {
  code: string;        // Raw ASCII list/tree text
  isStreaming?: boolean;
}

// Lightweight random ID generator
const generateId = () => Math.random().toString(36).substr(2, 9);

// Standard file category/icon builder matching workspace explorer
const getFileStyleAndIcon = (name: string, type: 'file' | 'folder', isOpen: boolean = false) => {
  if (type === 'folder') {
    return {
      icon: isOpen 
        ? <FolderOpen size={16} className="text-[#dcb67a] shrink-0" />
        : <Folder size={16} className="text-[#dcb67a] shrink-0" />,
      colorClass: 'text-[#dcb67a]',
      bgAccent: 'bg-[#dcb67a]/5 border-[#dcb67a]/20'
    };
  }
  
  const ext = name.split('.').pop()?.toLowerCase() || '';
  switch (ext) {
    case 'html': 
    case 'svg':
      return {
        icon: <Code size={15} className="text-[#e37933] shrink-0" />,
        colorClass: 'text-[#e37933]',
        bgAccent: 'bg-[#e37933]/5 border-[#e37933]/20'
      };
    case 'css': 
    case 'style':
    case 'scss':
      return {
        icon: <Hash size={15} className="text-[#3b82f6] shrink-0" />,
        colorClass: 'text-[#3b82f6]',
        bgAccent: 'bg-[#3b82f6]/5 border-[#3b82f6]/20'
      };
    case 'js': 
    case 'jsx': 
      return {
        icon: <Zap size={15} className="text-[#eab308] shrink-0" />,
        colorClass: 'text-[#eab308]',
        bgAccent: 'bg-[#eab308]/5 border-[#eab308]/20'
      };
    case 'ts': 
    case 'tsx': 
      return {
        icon: <FileCode size={15} className="text-[#2563eb] shrink-0" />,
        colorClass: 'text-[#2563eb]',
        bgAccent: 'bg-[#2563eb]/5 border-[#2563eb]/20'
      };
    case 'json': 
    case 'yaml':
    case 'yml':
      return {
        icon: <Braces size={15} className="text-[#dbbb8e] shrink-0" />,
        colorClass: 'text-[#dbbb8e]',
        bgAccent: 'bg-[#dbbb8e]/5 border-[#dbbb8e]/20'
      };
    case 'md': 
    case 'txt':
    case 'readme':
      return {
        icon: <BookOpen size={15} className="text-[#a1a1aa] shrink-0" />,
        colorClass: 'text-[#a1a1aa]',
        bgAccent: 'bg-[#a1a1aa]/5 border-[#a1a1aa]/20'
      };
    case 'py': 
      return {
        icon: <FileCode size={15} className="text-[#22c55e] shrink-0" />,
        colorClass: 'text-[#22c55e]',
        bgAccent: 'bg-[#22c55e]/5 border-[#22c55e]/20'
      };
    default: 
      return {
        icon: <FileText size={15} className="text-[#cccccc] shrink-0" />,
        colorClass: 'text-[#cccccc]',
        bgAccent: 'bg-[#cccccc]/5 border-[#cccccc]/20'
      };
  }
};

// ==================== TREE TEXT PARSER ====================
export function parseAsciiTree(text: string): FileTreeNode[] {
  const lines = text.split('\n');
  const roots: FileTreeNode[] = [];
  const stack: FileTreeNode[] = [];

  for (let line of lines) {
    if (!line.trim()) continue;

    // Detect inline comment
    let comment = '';
    const commentMatch = line.match(/(?:\s+#\s*|\s+\/\/|#\s+)(.+)$/);
    if (commentMatch) {
      comment = commentMatch[1].trim();
      line = line.substring(0, line.indexOf(commentMatch[0]));
    }

    // Capture branch indentation and actual file/folder name
    const match = line.match(/^([│\s├└─├──└──\-\|\s·╎]*)(.*)$/);
    if (!match) continue;

    const prefix = match[1];
    let name = match[2].trim();
    if (!name) continue;

    // Skip root wrapping folders if they are just dots or repository-name indicators
    if (name === '.' || name === './') continue;

    let type: 'file' | 'folder' = 'file';
    if (name.endsWith('/')) {
      name = name.slice(0, -1);
      type = 'folder';
    }

    // Determine nesting depth based on prefix matching
    let depth = 0;
    let index = 0;
    while (index < prefix.length) {
      const char = prefix[index];
      if (char === '│' || char === '|' || char === '├' || char === '└' || char === '╎') {
        depth++;
        index++;
        while (index < prefix.length && (prefix[index] === ' ' || prefix[index] === '─' || prefix[index] === '└')) {
          index++;
        }
      } else if (prefix.substring(index, index + 4) === '    ') {
        depth++;
        index += 4;
      } else if (prefix.substring(index, index + 2) === '  ') {
        depth++;
        index += 2;
      } else {
        index++;
      }
    }

    const node: FileTreeNode = {
      id: name,
      name,
      type,
      comment: comment || undefined,
      children: [],
      depth,
      isOpen: true
    };

    while (stack.length > 0 && stack[stack.length - 1].depth >= depth) {
      stack.pop();
    }

    if (stack.length > 0) {
      const parent = stack[stack.length - 1];
      parent.children.push(node);
      parent.type = 'folder';
      node.id = `${parent.id}/${name}`;
    } else {
      roots.push(node);
    }

    stack.push(node);
  }

  return roots;
}

// Convert absolute path candidates down to clean project root targets
const cleanPathForWorkspace = (path: string): string => {
  // If path starts with repository wrappers, strip them.
  let cleaned = path;
  const parts = cleaned.split('/');
  if (parts.length > 1 && (parts[0] === 'labverse' || parts[0] === 'my-app' || parts[0] === 'project')) {
    cleaned = parts.slice(1).join('/');
  }
  return `./${cleaned}`;
};

// ==================== CORE COMPONENT ====================
export const FileTreeCanvas: React.FC<FileTreeCanvasProps> = ({ code, isStreaming }) => {
  const [activeTab, setActiveTab] = useState<'visual' | 'code'>('visual');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [collapsedPaths, setCollapsedPaths] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);

  // Scaffolding status indicators
  const [scaffoldConsole, setScaffoldConsole] = useState<string[]>([]);
  const [isScaffolding, setIsScaffolding] = useState(false);
  const [scaffoldError, setScaffoldError] = useState<string | null>(null);
  const [scaffoldSuccess, setScaffoldSuccess] = useState(false);
  
  // Canvas View scaling/dimensions
  const [zoom, setZoom] = useState(1);
  const canvasRef = useRef<HTMLDivElement>(null);
  const linesSvgRef = useRef<SVGSVGElement>(null);

  // Parse lines into a stable visual tree hierarchy
  const rawTreeStructure = useMemo(() => {
    return parseAsciiTree(code);
  }, [code]);

  // Adjust tree based on local collapse states
  const traverseTreeRecurse = useCallback((nodes: FileTreeNode[]): FileTreeNode[] => {
    return nodes.map(node => ({
      ...node,
      isOpen: !collapsedPaths.has(node.id),
      children: node.children ? traverseTreeRecurse(node.children) : []
    }));
  }, [collapsedPaths]);

  const treeStructure = useMemo(() => {
    return traverseTreeRecurse(rawTreeStructure);
  }, [rawTreeStructure, traverseTreeRecurse]);

  // Generate flat visible items list for sidebar explorer and path analysis
  const flatNodesList = useMemo(() => {
    const list: FileTreeNode[] = [];
    const recurse = (arr: FileTreeNode[]) => {
      arr.forEach(node => {
        list.push(node);
        const isOpen = !collapsedPaths.has(node.id);
        if (isOpen && node.children && node.children.length > 0) {
          recurse(node.children);
        }
      });
    };
    recurse(treeStructure);
    return list;
  }, [treeStructure, collapsedPaths]);

  // Fetch the ancestral line of pathways for path glows
  const currentHoveredPathAncestors = useMemo(() => {
    if (!hoveredNodeId) return new Set<string>();
    const ancestors = new Set<string>();
    const parts = hoveredNodeId.split('/');
    let current = '';
    parts.forEach((part, idx) => {
      current = idx === 0 ? part : `${current}/${part}`;
      ancestors.add(current);
    });
    return ancestors;
  }, [hoveredNodeId]);

  // Handle collapsible togglers
  const handleTogglePathCollapse = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCollapsedPaths(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // SVG Connector paths linking visual node grids
  const [connectorPaths, setConnectorPaths] = useState<Array<{ d: string; isHovered: boolean }>>([]);

  const computeConnectorPaths = useCallback(() => {
    if (!canvasRef.current || !linesSvgRef.current) return;
    const canvasRect = canvasRef.current.getBoundingClientRect();
    const svgRect = linesSvgRef.current.getBoundingClientRect();

    const paths: Array<{ d: string; isHovered: boolean }> = [];

    const recurse = (nodes: FileTreeNode[]) => {
      nodes.forEach(node => {
        const parentId = `card-node-${node.id.replace(/\//g, '-')}`;
        const parentEl = document.getElementById(parentId);

        if (parentEl && node.children && node.children.length > 0 && !collapsedPaths.has(node.id)) {
          const parentBox = parentEl.getBoundingClientRect();
          // Middle-right of parent card
          const pX = parentBox.right - svgRect.left;
          const pY = parentBox.top + parentBox.height / 2 - svgRect.top;

          node.children.forEach(child => {
            const childId = `card-node-${child.id.replace(/\//g, '-')}`;
            const childEl = document.getElementById(childId);

            if (childEl) {
              const childBox = childEl.getBoundingClientRect();
              // Middle-left of child card
              const cX = childBox.left - svgRect.left;
              const cY = childBox.top + childBox.height / 2 - svgRect.top;

              // Smooth bezier path
              const ctrlX = pX + Math.max(25, (cX - pX) * 0.45);
              const pathString = `M ${pX} ${pY} C ${ctrlX} ${pY} ${cX - 25} ${cY} ${cX} ${cY}`;

              const isGlow = hoveredNodeId === child.id || 
                             hoveredNodeId === node.id || 
                             (hoveredNodeId && hoveredNodeId.startsWith(child.id + '/')) ||
                             (currentHoveredPathAncestors.has(child.id) && currentHoveredPathAncestors.has(node.id));

              paths.push({
                d: pathString,
                isHovered: !!isGlow
              });
            }
          });

          recurse(node.children);
        }
      });
    };

    recurse(treeStructure);
    setConnectorPaths(paths);
  }, [treeStructure, collapsedPaths, hoveredNodeId, currentHoveredPathAncestors]);

  // Re-render links on layout changes or window resizes
  useEffect(() => {
    // Small delay to ensure cards DOM elements are updated and sized
    const timer = setTimeout(() => {
      computeConnectorPaths();
    }, 100);

    window.addEventListener('resize', computeConnectorPaths);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', computeConnectorPaths);
    };
  }, [treeStructure, collapsedPaths, hoveredNodeId, computeConnectorPaths, activeTab, zoom]);

  // Handle Copy Raw Text
  const handleCopyText = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Trigger custom Workspace workspace reload after skeleton write
  const triggerAppletReload = () => {
    window.dispatchEvent(new CustomEvent('trigger-workspace-refresh'));
  };

  // Scaffolder to write folders/files directly into the real workspace file system
  const handleCreateSkeleton = async () => {
    if (isScaffolding) return;
    setIsScaffolding(true);
    setScaffoldError(null);
    setScaffoldSuccess(false);
    setScaffoldConsole(['Initializing architecture scaffold sync...']);

    // 1. Gather all files and directories recursively
    const nodesToCreate: Array<{ relativePath: string; isDirectory: boolean }> = [];
    
    const recurseCollector = (nodes: FileTreeNode[]) => {
      nodes.forEach(node => {
        const destPath = cleanPathForWorkspace(node.id);
        nodesToCreate.push({
          relativePath: destPath,
          isDirectory: node.type === 'folder'
        });
        if (node.children && node.children.length > 0) {
          recurseCollector(node.children);
        }
      });
    };
    recurseCollector(rawTreeStructure);

    // 2. Sort so folders are created first from shallowest level to deepest
    nodesToCreate.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.relativePath.split('/').length - b.relativePath.split('/').length;
    });

    try {
      let createdCounter = 0;
      for (const item of nodesToCreate) {
        setScaffoldConsole(prev => [...prev, `Syncing: ${item.relativePath} (${item.isDirectory ? 'directory' : 'blank file'})...`]);
        
        const endpoint = item.isDirectory ? '/api/fs/create' : '/api/fs/write';
        // Check if directory or file needs basic empty contents
        const bodyContent: any = { filePath: item.relativePath };
        if (item.isDirectory) {
          bodyContent.isDirectory = true;
        } else {
          bodyContent.content = '';
        }

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bodyContent)
        });

        if (!response.ok) {
          const detail = await response.json();
          throw new Error(detail.error || `Error scaffolding '${item.relativePath}'`);
        }
        
        createdCounter++;
      }

      setScaffoldConsole(prev => [
        ...prev, 
        `----------------------------------------`,
        `Scaffolding successfully completed! Created ${createdCounter} resources.`,
        `Dispatched workspace live-reload refresh.`
      ]);
      setScaffoldSuccess(true);
      triggerAppletReload();
    } catch (err: any) {
      console.error(err);
      setScaffoldError(err?.message || 'Scaffolding failed.');
      setScaffoldConsole(prev => [...prev, `[CRITICAL ERROR] Scaffold process aborted: ${err?.message || 'Network error'}`]);
    } finally {
      setIsScaffolding(false);
    }
  };

  // Search filter matches index
  const filteredFlatNodes = useMemo(() => {
    if (!searchQuery.trim()) return flatNodesList;
    const q = searchQuery.toLowerCase();
    return flatNodesList.filter(n => n.name.toLowerCase().includes(q) || n.id.toLowerCase().includes(q));
  }, [flatNodesList, searchQuery]);

  // Group directory elements into columns based on Depth for architecture decks mapping
  const columnsAtDepth = useMemo(() => {
    const depthMap: Record<number, FileTreeNode[]> = {};
    
    // Recurse to extract actual nodes categorized by depth
    const recurseSort = (nodes: FileTreeNode[]) => {
      nodes.forEach(node => {
        // Only show node if its parents are expanded (not collapsed)
        const pathParts = node.id.split('/');
        let isParentCollapsed = false;
        let subPath = '';
        
        for (let i = 0; i < pathParts.length - 1; i++) {
          subPath = i === 0 ? pathParts[i] : `${subPath}/${pathParts[i]}`;
          if (collapsedPaths.has(subPath)) {
            isParentCollapsed = true;
            break;
          }
        }

        if (!isParentCollapsed) {
          if (!depthMap[node.depth]) {
            depthMap[node.depth] = [];
          }
          depthMap[node.depth].push(node);
        }

        if (node.children && node.children.length > 0) {
          recurseSort(node.children);
        }
      });
    };

    recurseSort(treeStructure);
    return depthMap;
  }, [treeStructure, collapsedPaths]);

  // Selected Node Details
  const selectedNodeMetadata = useMemo(() => {
    if (!selectedNodeId) return null;
    return flatNodesList.find(n => n.id === selectedNodeId) || null;
  }, [selectedNodeId, flatNodesList]);

  return (
    <div className="w-full bg-[#0d0d0d] border border-white/8 rounded-2xl overflow-hidden shadow-2xl my-5 font-sans select-none flex flex-col text-[#AD9F91]">
      {/* 1. INTERACTIVE DESIGN HEADER */}
      <div className="px-5 py-3.5 bg-[#161616] border-b border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 z-20">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-[#D97756]/15 text-[#D97756] border border-[#D97756]/20">
            <Layers size={16} className="animate-pulse" />
          </div>
          <div className="flex flex-col">
            <span className="text-white text-sm font-bold tracking-tight uppercase">Project Architecture Skeleteen</span>
            <span className="text-[10px] text-zinc-505 uppercase tracking-wider font-mono">Auto-Parsed Canvas Engine</span>
          </div>
        </div>

        {/* Action controls */}
        <div className="flex items-center gap-2.5 self-stretch sm:self-auto justify-between sm:justify-start">
          <div className="flex items-center gap-1 bg-[#1F1F1F] border border-white/5 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('visual')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold tracking-wide uppercase transition-all ${
                activeTab === 'visual'
                  ? 'bg-white/[0.08] text-white shadow-xs'
                  : 'text-[#8A7D71] hover:text-[#EDE6DD]'
              }`}
            >
              <Grid size={12} />
              <span>Sitemap Canvas</span>
            </button>
            <button
              onClick={() => setActiveTab('code')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold tracking-wide uppercase transition-all ${
                activeTab === 'code'
                  ? 'bg-white/[0.08] text-white shadow-xs'
                  : 'text-[#8A7D71] hover:text-[#EDE6DD]'
              }`}
            >
              <Terminal size={12} />
              <span>ASCII Text</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleCopyText}
              className={`p-2 rounded-xl border border-white/5 hover:bg-white/5 transition-all flex items-center justify-center text-[#A89F93] hover:text-white`}
              title="Copy Raw ASCII Text"
            >
              {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            </button>
            
            <button
              onClick={handleCreateSkeleton}
              disabled={isScaffolding || isStreaming}
              className="px-3.5 py-1.5 bg-[#D46C49] hover:bg-[#E37933] disabled:opacity-45 text-white font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer text-[11px] shadow-sm uppercase tracking-wider"
              title="Creates directories and blank file nodes directly inside workspace"
            >
              <Sparkles size={12} className="shrink-0" />
              <span>Apply to Workspace</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. MAIN WORKING INTERFACES */}
      {activeTab === 'visual' ? (
        <div className="flex flex-col lg:flex-row min-h-[460px] relative overflow-hidden">
          
          {/* A. SIDEBAR FILE TREE BROWSING */}
          <div className="w-full lg:w-[260px] border-r border-white/5 flex flex-col bg-[#11100F] shrink-0">
            {/* Sidebar search filter */}
            <div className="p-3 border-b border-white/5 bg-[#141312]">
              <div className="relative flex items-center bg-[#1D1C1A] border border-white/[0.04] focus-within:border-[#D97756]/50 transition-colors pl-2.5 h-[26px] py-1 rounded-lg">
                <Search size={13} className="text-[#635F59] mr-1.5 shrink-0" />
                <input
                  type="text"
                  placeholder="Filter elements..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent outline-none border-none text-[12px] text-[#EDE6DD] placeholder-[#635F59] h-full"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="p-1 text-[#A89F93] hover:text-[#EDE6DD]"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>

            {/* Micro tree rows rendering list */}
            <div className="flex-1 overflow-y-auto max-h-[260px] lg:max-h-[420px] py-2 custom-scrollbar text-xs font-mono font-medium leading-relaxed">
              {filteredFlatNodes.length === 0 ? (
                <div className="text-zinc-600 italic px-4 py-3">No matching nodes.</div>
              ) : (
                filteredFlatNodes.map(node => {
                  const isSelected = selectedNodeId === node.id;
                  const isHovered = hoveredNodeId === node.id || currentHoveredPathAncestors.has(node.id);
                  const isCollapsed = collapsedPaths.has(node.id);
                  const { icon, colorClass } = getFileStyleAndIcon(node.name, node.type, !isCollapsed);

                  return (
                    <div
                      key={node.id}
                      onClick={() => setSelectedNodeId(node.id)}
                      onMouseEnter={() => setHoveredNodeId(node.id)}
                      onMouseLeave={() => setHoveredNodeId(null)}
                      className={`flex items-center justify-between group h-6 px-3 cursor-pointer select-none transition-colors border-l-2
                        ${isSelected ? 'bg-[#2C241E] text-[#EDE6DD] border-l-[#D97756]' : 'border-l-transparent text-[#AD9F91] hover:bg-white/[0.02]'}
                        ${isHovered ? 'bg-white/[0.015]' : ''}
                      `}
                      style={{ paddingLeft: `${node.depth * 14 + 10}px` }}
                    >
                      <div className="flex items-center gap-2 truncate max-w-[80%]">
                        {node.type === 'folder' ? (
                          <button
                            onClick={(e) => handleTogglePathCollapse(node.id, e)}
                            className="p-0.5 hover:bg-white/5 rounded text-[#A89F93] hover:text-white flex items-center justify-center cursor-pointer"
                          >
                            <ChevronRight size={12} className={`transition-transform duration-100 ${!isCollapsed ? 'rotate-90' : 'rotate-0'}`} />
                          </button>
                        ) : (
                          <div className="w-[16px]" />
                        )}
                        {icon}
                        <span className={`truncate ${isSelected ? 'font-semibold text-white' : ''}`}>
                          {node.name}
                        </span>
                      </div>
                      
                      {node.comment && (
                        <span className="hidden group-hover:block ml-2 text-[9px] text-zinc-550 truncate max-w-[40%] bg-white/5 px-1 rounded">
                          {node.comment}
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* B. DYNAMIC VISUAL FLOWCHART MAP STAGE */}
          <div className="flex-1 overflow-auto bg-[#0d0d0d] relative flex flex-col h-[340px] lg:h-auto custom-scrollbar" ref={canvasRef}>
            
            {/* Stage Grid Overlay */}
            <div className="absolute inset-0 bg-[radial-gradient(#1e1e1e_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none opacity-42" />

            {/* Connection Paths SVG */}
            <svg 
              className="absolute inset-0 pointer-events-none w-full h-full z-10 transition-all" 
              ref={linesSvgRef}
              style={{ minWidth: '800px', minHeight: '400px' }}
            >
              <defs>
                <linearGradient id="glowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#D97756" stopOpacity="0.4" />
                  <stop offset="50%" stopColor="#D97756" stopOpacity="1" />
                  <stop offset="100%" stopColor="#dcb67a" stopOpacity="0.5" />
                </linearGradient>
              </defs>
              {connectorPaths.map((path, idx) => (
                <path
                  key={idx}
                  d={path.d}
                  fill="none"
                  stroke={path.isHovered ? 'url(#glowGrad)' : 'rgba(255, 255, 255, 0.04)'}
                  strokeWidth={path.isHovered ? 2 : 1}
                  className={`transition-all duration-200 ${path.isHovered ? 'shadow-xl drop-shadow-[0_0_6px_rgba(217,119,86,0.3)]' : ''}`}
                />
              ))}
            </svg>

            {/* Toolbar utilities */}
            <div className="absolute top-3 right-3 flex items-center gap-1.5 z-30 bg-[#161616]/90 backdrop-blur-md px-2 py-1 border border-white/5 rounded-xl text-xs font-mono">
              <button 
                onClick={() => setZoom(prev => Math.max(0.7, prev - 0.1))} 
                className="p-1 hover:text-white rounded"
                title="Zoom Out"
              >
                -
              </button>
              <span className="text-[#888] select-none text-[10px]">{Math.round(zoom * 100)}%</span>
              <button 
                onClick={() => setZoom(prev => Math.min(1.4, prev + 0.1))} 
                className="p-1 hover:text-white rounded"
                title="Zoom In"
              >
                +
              </button>
              <button 
                onClick={() => setZoom(1)} 
                className="p-1 text-[#D97756] hover:text-white rounded ml-1 text-[10px]"
                title="Reset Scale"
              >
                Reset
              </button>
            </div>

            {/* Architecture node decks */}
            <div 
              className="flex-1 flex gap-16 px-8 py-10 items-start justify-start z-25 relative transition-transform duration-200 origin-top-left"
              style={{ transform: `scale(${zoom})`, minWidth: '950px' }}
            >
              {Object.keys(columnsAtDepth).length === 0 ? (
                <div className="flex items-center justify-center h-full w-full text-zinc-650 italic text-sm">
                  Parse index nodes ... empty
                </div>
              ) : (
                Object.keys(columnsAtDepth).map(depthStr => {
                  const depth = Number(depthStr);
                  const colNodes = columnsAtDepth[depth] || [];

                  return (
                    <div key={depth} className="flex flex-col gap-5 w-52 shrink-0 z-20">
                      
                      {/* Depth title deck identifier */}
                      <div className="flex items-center gap-1.5 px-3 border-b border-white/[0.04] pb-2 select-none">
                        <span className="text-[10px] uppercase tracking-wider font-bold text-zinc-550 font-mono">
                          Level {depth} Decks
                        </span>
                        <span className="text-[9px] bg-white/[0.03] text-zinc-550 px-1.5 rounded-full font-sans font-semibold">
                          {colNodes.length}
                        </span>
                      </div>

                      {/* Columns visual card wrapper */}
                      <div className="flex flex-col gap-3.5">
                        {colNodes.map(node => {
                          const isSelected = selectedNodeId === node.id;
                          const isHovered = hoveredNodeId === node.id || currentHoveredPathAncestors.has(node.id);
                          const isCollapsed = collapsedPaths.has(node.id);
                          const isDirectHover = hoveredNodeId === node.id;
                          const { icon, bgAccent } = getFileStyleAndIcon(node.name, node.type, !isCollapsed);

                          return (
                            <div
                              key={node.id}
                              id={`card-node-${node.id.replace(/\//g, '-')}`}
                              onClick={() => setSelectedNodeId(node.id)}
                              onMouseEnter={() => setHoveredNodeId(node.id)}
                              onMouseLeave={() => setHoveredNodeId(null)}
                              className={`p-3 rounded-xl border flex flex-col gap-2 transition-all cursor-pointer relative select-none
                                ${isSelected 
                                  ? 'bg-[#211a15] border-[#D97756] shadow-md shadow-[#D97756]/5' 
                                  : 'bg-[#121110] hover:bg-[#181715]/75 border-white/[0.04]'
                                }
                                ${isDirectHover ? 'border-white/10 ring-1 ring-white/5' : ''}
                                ${isHovered && !isSelected ? 'border-[#dcb67a]/40' : ''}
                              `}
                            >
                              {/* Header element */}
                              <div className="flex items-center justify-between gap-1.5">
                                <div className="flex items-center gap-2 truncate max-w-[85%]">
                                  {icon}
                                  <span className={`text-[12px] font-bold font-mono truncate ${isSelected ? 'text-white' : 'text-[#EDE6DD]'}`}>
                                    {node.name}
                                  </span>
                                </div>

                                {node.type === 'folder' && (
                                  <button
                                    onClick={(e) => handleTogglePathCollapse(node.id, e)}
                                    className="p-1 hover:bg-white/5 rounded text-[#A89F93] hover:text-white"
                                  >
                                    <ChevronDown size={11} className={`transition-transform duration-100 ${isCollapsed ? '-rotate-90 text-[#D97756]' : 'rotate-0'}`} />
                                  </button>
                                )}
                              </div>

                              {/* Comment details parsed */}
                              {node.comment && (
                                <p className="text-[9.5px] leading-normal text-zinc-500 font-sans italic border-t border-white/[0.02] pt-1.5 truncate" title={node.comment}>
                                  {node.comment}
                                </p>
                              )}

                              {/* Folders statistics indicators */}
                              {node.type === 'folder' && node.children && node.children.length > 0 && (
                                <div className="flex items-center gap-2 text-[9px] text-zinc-500 font-mono select-none">
                                  <span>items:</span>
                                  <span className="text-[#dcb67a] font-bold">{node.children.length}</span>
                                  {isCollapsed && (
                                    <span className="text-[8px] bg-[#D97756]/15 text-[#D97756] px-1 rounded uppercase tracking-wider font-semibold">
                                      Collapsed
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      ) : (
        /* CODE TAB: MONOSPACE ASCII CHARACTERS DISPLAY */
        <div className="flex-1 overflow-x-auto p-5 bg-[#080808] border-b border-white/5 relative items-center justify-center flex">
          <pre className="text-gray-300 text-[13px] leading-relaxed font-mono whitespace-pre w-full max-w-2xl select-text custom-scrollbar">
            {code}
          </pre>
        </div>
      )}

      {/* 3. SCAFFOLDING REPORT PANEL CONSOLE */}
      {scaffoldConsole.length > 0 && (
        <div className="bg-[#090909] border-t border-white/5 px-5 py-4 max-h-[180px] overflow-y-auto custom-scrollbar font-mono text-[11px] select-text">
          <div className="flex items-center justify-between border-b border-white/[0.03] pb-1.5 mb-2 select-none">
            <span className="text-[#D97756] font-bold flex items-center gap-1.5 uppercase text-[10px]">
              <Terminal size={12} />
              Scaffolding Tracker Console Logs
            </span>
            <div className="flex items-center gap-2">
              {isScaffolding && <RefreshCw size={11} className="animate-spin text-[#D97756]" />}
              {scaffoldSuccess && <span className="text-emerald-400 font-bold uppercase text-[9px]">Success</span>}
              {scaffoldError && <span className="text-rose-400 font-bold uppercase text-[9px]">Failed</span>}
              <button 
                onClick={() => setScaffoldConsole([])}
                className="text-zinc-550 hover:text-white"
              >
                Clear logs
              </button>
            </div>
          </div>
          <div className="space-y-1">
            {scaffoldConsole.map((line, idx) => (
              <div 
                key={idx} 
                className={
                  line.startsWith('[CRITICAL') ? 'text-rose-400' : 
                  line.startsWith('Syncing') ? 'text-zinc-400 font-light' : 
                  line.includes('successfully') ? 'text-emerald-400 font-bold z-10 animate-pulse' : 
                  'text-zinc-550'
                }
              >
                {line}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. FOOTER INSPECTOR HUD SECTION */}
      {selectedNodeMetadata && (
        <div className="px-5 py-3.5 bg-[#141312] border-t border-white/5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 select-none z-10">
          <div className="flex items-center gap-3">
            <div className={`p-1 px-1.5 text-xs font-mono rounded bg-white/[0.03] text-zinc-300 border border-white/5`}>
              {selectedNodeMetadata.type === 'folder' ? 'DIRECTORY' : 'FILE'}
            </div>
            <div className="flex flex-col">
              <span className="text-white text-[12px] font-bold font-mono tracking-tight">{selectedNodeMetadata.id}</span>
              {selectedNodeMetadata.comment && (
                <span className="text-[10px] text-zinc-450 italic font-medium leading-relaxed mt-0.5">
                  Comment notes: {selectedNodeMetadata.comment}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 font-mono text-[10px] text-zinc-505 shrink-0 select-none">
            {selectedNodeMetadata.type === 'folder' ? (
              <>
                <span>subdirectories:</span>
                <span className="text-white font-bold">{selectedNodeMetadata.children.filter(n => n.type === 'folder').length}</span>
                <span>files:</span>
                <span className="text-white font-bold">{selectedNodeMetadata.children.filter(n => n.type === 'file').length}</span>
              </>
            ) : (
              <>
                <span>classification:</span>
                <span className="text-[#dcb67a] font-bold">
                  {selectedNodeMetadata.name.split('.').pop()?.toUpperCase() || 'RAW TEXT'} Extension Resource
                </span>
              </>
            )}
            <button
              onClick={() => {
                const targetPath = cleanPathForWorkspace(selectedNodeMetadata.id);
                navigator.clipboard.writeText(targetPath);
              }}
              className="ml-2 text-[10px] text-[#D97756] hover:underline font-semibold"
              title="Copy relative workspace target path"
            >
              Copy workspace path
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
