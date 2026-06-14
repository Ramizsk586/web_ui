import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Upload, 
  Trash2, 
  RefreshCw, 
  Database, 
  Search, 
  X, 
  Settings, 
  Activity, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  Download, 
  Info,
  Clock,
  Sparkles,
  Server,
  KeyRound,
  LayoutDashboard,
  Sliders,
  Terminal,
  FolderOpen
} from 'lucide-react';
import { RagDocument, RagStats, ProcessingLog, RagSettingsConfig } from '../types/rag_types';

interface RAGPanelProps {
  onClose?: () => void;
}

export function RAGPanel({ onClose }: RAGPanelProps) {
  const [documents, setDocuments] = useState<RagDocument[]>([]);
  const [stats, setStats] = useState<RagStats>({
    documentCount: 0,
    chunkCount: 0,
    indexedCount: 0,
    storageUsage: 0,
    lastUpdated: new Date().toISOString()
  });
  const [logs, setLogs] = useState<ProcessingLog[]>([]);
  const [config, setConfig] = useState<RagSettingsConfig>({
    chunkSize: 1024,
    chunkOverlap: 200,
    embeddingModel: 'local-fallback',
    ollamaUrl: 'http://localhost:11434',
    ollamaModel: 'all-minilm',
    openaiApiKey: '',
    openaiUrl: 'https://api.openai.com/v1',
    openaiModel: 'text-embedding-3-small',
    geminiApiKey: '',
    geminiModel: 'text-embedding-004'
  });

  const [activeTab, setActiveTab] = useState<'dashboard' | 'documents' | 'embedders' | 'parameters' | 'logs'>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [logFilter, setLogFilter] = useState<'all' | 'info' | 'warn' | 'error'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ name: string; pct: number } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Poll for document status and stats when processing is ongoing
  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
      // If any document is still processing/pending, keep fetching updates
      const needsPolling = documents.some(d => d.status === 'processing' || d.status === 'pending');
      if (needsPolling || isRefreshing) {
        fetchData();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [documents, isRefreshing]);

  const fetchData = async () => {
    try {
      const statsRes = await fetch('/api/rag/stats');
      if (statsRes.ok) setStats(await statsRes.json());

      const docsRes = await fetch('/api/rag/documents');
      if (docsRes.ok) setDocuments(await docsRes.json());

      const logsRes = await fetch('/api/rag/logs');
      if (logsRes.ok) setLogs(await logsRes.json());

      const configRes = await fetch('/api/rag/settings');
      if (configRes.ok) setConfig(await configRes.json());
    } catch (e) {
      console.error("Error loading RAG panel inputs:", e);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchData();
    setTimeout(() => setIsRefreshing(false), 800);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFiles(Array.from(e.target.files));
    }
  };

  const handleFiles = async (files: File[]) => {
    setIsUploading(true);
    for (const file of files) {
      setUploadProgress({ name: file.name, pct: 20 });
      try {
        const reader = new FileReader();
        reader.onload = async (event) => {
          const base64 = event.target?.result as string;
          setUploadProgress({ name: file.name, pct: 60 });
          
          const response = await fetch('/api/rag/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fileName: file.name,
              mimeType: file.type,
              base64: base64
            })
          });

          if (response.ok) {
            setUploadProgress({ name: file.name, pct: 100 });
            fetchData();
          } else {
            console.error("RAG File upload failed:", await response.text());
          }
        };
        reader.readAsDataURL(file);
      } catch (err) {
        console.error("RAG FileReader Exception:", err);
      }
      await new Promise(r => setTimeout(r, 600));
    }
    setUploadProgress(null);
    setIsUploading(false);
  };

  const handleDeleteDoc = async (id: string) => {
    try {
      const response = await fetch(`/api/rag/documents/${id}`, { method: 'DELETE' });
      if (response.ok) {
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveConfig = async (updated: Partial<RagSettingsConfig>) => {
    const newConfig = { ...config, ...updated };
    setConfig(newConfig);
    try {
      await fetch('/api/rag/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleRebuildIndex = async () => {
    try {
      await fetch('/api/rag/rebuild', { method: 'POST' });
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleClearAll = async () => {
    if (!confirm("Are you sure you want to delete all indexed document chunks completely inside the Knowledge Base?")) return;
    try {
      await fetch('/api/rag/clear', { method: 'POST' });
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleExportKB = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ documents, stats, config }, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href",     dataStr     );
    dlAnchorElem.setAttribute("download", `lumina-knowledge-base-${Date.now()}.json`);
    dlAnchorElem.click();
  };

  const filteredDocs = documents.filter(doc => 
    doc.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredLogs = logs.filter(log => {
    if (logFilter === 'all') return true;
    return log.level === logFilter;
  });

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = 2;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  const sidebarTabs = [
    { id: 'dashboard' as const, label: 'Overview', icon: <LayoutDashboard size={15} />, count: null },
    { id: 'documents' as const, label: 'Files Manager', icon: <FolderOpen size={15} />, count: filteredDocs.length },
    { id: 'embedders' as const, label: 'Embedding Setup', icon: <Sparkles size={15} />, count: null },
    { id: 'parameters' as const, label: 'Chunking Parameters', icon: <Sliders size={15} />, count: null },
    { id: 'logs' as const, label: 'Engine Logs', icon: <Terminal size={15} />, count: filteredLogs.length !== logs.length ? `${filteredLogs.length}/${logs.length}` : logs.length }
  ];

  return (
    <div id="rag-container-panel" className="flex-1 flex flex-col md:flex-row h-full bg-[var(--theme-bg)] text-[var(--theme-primary)] overflow-hidden font-sans relative">
      
      {/* LEFT SIDEBAR NAVIGATION */}
      <div id="rag-sidebar" className="w-full md:w-64 shrink-0 border-b md:border-b-0 md:border-r border-[var(--theme-border)]/40 bg-[var(--theme-surface)]/40 p-5 flex flex-col justify-between overflow-y-auto">
        <div>
          {/* Sidebar Title */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-500/10 to-indigo-500/10 border border-blue-500/15 flex items-center justify-center text-blue-500 shadow-sm shrink-0">
              <Database size={18} />
            </div>
            <div className="min-w-0">
              <span className="font-display font-bold text-sm tracking-tight text-[var(--theme-primary)] block truncate">Knowledge Base</span>
              <span className="text-[10px] text-[var(--theme-secondary)] tracking-wide block truncate">RAG Document Store</span>
            </div>
          </div>

          {/* Tab buttons list */}
          <nav className="space-y-1.5">
            {sidebarTabs.map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all duration-150 border relative cursor-pointer select-none ${
                    isActive
                      ? 'bg-[var(--theme-surface)] text-blue-500 border-[var(--theme-border)]/50 shadow-sm font-bold'
                      : 'text-[var(--theme-secondary)] hover:text-[var(--theme-primary)] hover:bg-[var(--theme-hover-bg)]/30 border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={isActive ? 'text-blue-500' : 'text-[var(--theme-muted)]'}>
                      {tab.icon}
                    </span>
                    <span className="truncate">{tab.label}</span>
                  </div>
                  {tab.count !== null && (
                    <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold ${
                      isActive 
                        ? 'bg-blue-500/10 text-blue-500' 
                        : 'bg-[var(--theme-hover-bg)] text-[var(--theme-secondary)]'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer Metadata info */}
        <div className="mt-8 pt-4 border-t border-[var(--theme-border)]/20 space-y-2">
          <div className="flex items-center justify-between text-[10px] font-medium text-[var(--theme-secondary)]">
            <span className="flex items-center gap-1"><Server size={10} className="text-zinc-500" /> Embedder:</span>
            <span className="font-mono bg-[var(--theme-hover-bg)]/50 px-1.5 py-0.5 rounded text-[9px] text-[#D97756] uppercase tracking-wider font-semibold border border-[var(--theme-border)]/20">
              {config.embeddingModel === 'local-fallback' ? 'deterministic' : config.embeddingModel}
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] font-medium text-[var(--theme-secondary)]">
            <span className="flex items-center gap-1"><Clock size={10} className="text-zinc-500" /> Files sync:</span>
            <span className="font-mono text-[10px] lowercase text-[var(--theme-muted)]">live polling</span>
          </div>
        </div>
      </div>

      {/* RIGHT VIEWPORT CONTENT */}
      <div id="rag-viewport" className="flex-1 flex flex-col overflow-hidden min-w-0">
        
        {/* Top Control Bar with Close and Trigger refresh */}
        <div className="h-14 border-b border-[var(--theme-border)]/45 flex items-center justify-between px-6 bg-[var(--theme-sidebar)]/35 backdrop-blur-md shrink-0 z-10 transition-colors">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-bold text-[var(--theme-primary)] uppercase tracking-wider flex items-center gap-2">
                {sidebarTabs.find(t => t.id === activeTab)?.icon}
                {sidebarTabs.find(t => t.id === activeTab)?.label}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleRefresh}
              title="Sync knowledge parameters"
              className={`p-2 hover:bg-[var(--theme-hover-bg)] text-[var(--theme-secondary)] hover:text-[var(--theme-primary)] rounded-lg transition-all border border-transparent hover:border-[var(--theme-border)]/30 cursor-pointer ${isRefreshing ? 'animate-spin text-blue-500' : ''}`}
            >
              <RefreshCw size={15} />
            </button>
            {onClose && (
              <button 
                onClick={onClose}
                className="p-2 hover:bg-rose-500/10 text-[var(--theme-secondary)] hover:text-rose-400 rounded-lg transition-colors cursor-pointer"
                title="Close knowledge base"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* View Transition Frame */}
        <div id="rag-content-view" className="flex-1 overflow-hidden relative">
          <AnimatePresence mode="wait">
            
            {/* SUB-PANEL 1: DASHBOARD / OVERVIEW */}
            {activeTab === 'dashboard' && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.15 }}
                className="h-full overflow-y-auto p-6 space-y-6 custom-scrollbar"
              >
                {/* Stats cards Grid container */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: 'Total Source Files', val: stats.documentCount, sub: 'managed files inside memory', icon: <FileText size={16} className="text-blue-500" /> },
                    { label: 'Segmented Chunks', val: stats.chunkCount, sub: 'vector indices generated', icon: <Database size={16} className="text-violet-500" /> },
                    { label: 'Embedding Vector Index', val: `${stats.indexedCount} / ${stats.chunkCount}`, sub: 'synchronized embedding rows', icon: <Sparkles size={16} className="text-emerald-500" /> },
                    { label: 'Total Storage Consumed', val: formatBytes(stats.storageUsage), sub: 'persistent cache size', icon: <Server size={16} className="text-amber-500" /> },
                  ].map((item, idx) => (
                    <div key={idx} className="bg-[var(--theme-surface)] border border-[var(--theme-border)]/30 rounded-2xl p-4 shadow-sm flex flex-col justify-between hover:border-blue-500/15 transition-all">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] text-[var(--theme-secondary)] block font-bold uppercase tracking-widest">{item.label}</span>
                        <div className="w-8 h-8 rounded-lg bg-[var(--theme-hover-bg)]/40 border border-[var(--theme-border)]/20 flex items-center justify-center">
                          {item.icon}
                        </div>
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-xl font-bold font-mono text-[var(--theme-primary)] block leading-tight">{item.val}</span>
                        <span className="text-[10px] text-[var(--theme-muted)] block font-medium truncate">{item.sub}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Main Dashboard Rows */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                  
                  {/* Left: Quick Actions and System Diagnostics */}
                  <div className="lg:col-span-3 space-y-6">
                    
                    {/* Maintenance Actions */}
                    <div className="bg-[var(--theme-surface)] border border-[var(--theme-border)]/30 rounded-2xl p-5 shadow-sm space-y-4">
                      <div>
                        <span className="font-bold text-xs uppercase tracking-wider text-[var(--theme-primary)] block">Maintenance Tools</span>
                        <span className="text-[10px] text-[var(--theme-secondary)] block mt-0.5">Perform standard index compilation or clear storage registers.</span>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                        <button 
                          onClick={handleRebuildIndex}
                          className="p-3.5 rounded-xl border border-[var(--theme-border)] hover:border-blue-500/30 hover:bg-blue-500/5 text-[var(--theme-primary)] text-xs font-semibold flex flex-col items-center justify-center gap-2 transition-all cursor-pointer group active:scale-98"
                        >
                          <RefreshCw size={15} className="text-blue-500 group-hover:rotate-180 transition-transform duration-500" />
                          <span className="text-[11px]">Rebuild Index</span>
                        </button>
                        <button 
                          onClick={handleExportKB}
                          className="p-3.5 rounded-xl border border-[var(--theme-border)] hover:border-violet-500/30 hover:bg-violet-500/5 text-[var(--theme-primary)] text-xs font-semibold flex flex-col items-center justify-center gap-2 transition-all cursor-pointer group active:scale-98"
                        >
                          <Download size={15} className="text-violet-500 group-hover:translate-y-0.5 transition-transform" />
                          <span className="text-[11px]">Export JSON</span>
                        </button>
                        <button 
                          onClick={handleClearAll}
                          className="p-3.5 rounded-xl bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/15 hover:border-rose-500/30 text-rose-500 text-xs font-bold flex flex-col items-center justify-center gap-2 transition-all cursor-pointer active:scale-98"
                        >
                          <Trash2 size={15} className="text-rose-500" />
                          <span className="text-[11px]">Purge Store</span>
                        </button>
                      </div>
                    </div>

                    {/* Quick Overview Description Info */}
                    <div className="bg-[var(--theme-surface)] border border-[var(--theme-border)]/30 rounded-2xl p-5 shadow-sm space-y-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500 shrink-0">
                          <Info size={14} />
                        </div>
                        <span className="font-bold text-xs uppercase tracking-wider text-[var(--theme-primary)]">What is RAG Knowledge Base?</span>
                      </div>
                      <p className="text-[11px] text-[var(--theme-secondary)] leading-relaxed space-y-2">
                        Retrieval-Augmented Generation (RAG) empowers your local Lumina AI agent to fetch semantic facts from files you load here. When you send queries in the chat workspace, files are filtered, matched with vectors, and injected as relevant context directly to minimize model hallucinations.
                      </p>
                      <div className="pt-2 flex flex-wrap items-center gap-2">
                        {['Vector Cosine Store', 'Local Indexed Cache', 'Markdown & PDF Parser', 'Zero Latency Context Matching'].map((badge, bIdx) => (
                          <span key={bIdx} className="text-[9px] px-2 py-0.8 bg-[var(--theme-hover-bg)] border border-[var(--theme-border)]/30 text-[var(--theme-secondary)] font-mono font-bold rounded-lg uppercase tracking-wide">
                            {badge}
                          </span>
                        ))}
                      </div>
                    </div>

                  </div>

                  {/* Right Column: Engine Status Card & Quick Instructions */}
                  <div className="lg:col-span-2 space-y-6">
                    
                    {/* Active Configuration details summary */}
                    <div className="bg-[var(--theme-surface)] border border-[var(--theme-border)]/30 rounded-2xl p-5 shadow-sm space-y-4">
                      <div>
                        <span className="font-bold text-xs uppercase tracking-wider text-[var(--theme-primary)] block">Active Profile Status</span>
                        <span className="text-[10px] text-[var(--theme-secondary)] block mt-0.5">Parameters verified for execution.</span>
                      </div>

                      <div className="space-y-2 text-xs">
                        <div className="p-3 rounded-xl bg-[var(--theme-bg)]/40 border border-[var(--theme-border)]/35 space-y-2">
                          <div className="flex justify-between items-center text-[11px] font-mono">
                            <span className="text-[var(--theme-secondary)] font-sans">Active Embeddings:</span>
                            <span className="font-bold text-[#D97756] uppercase shrink-0 truncate max-w-[120px]">{config.embeddingModel}</span>
                          </div>
                          <div className="flex justify-between items-center text-[11px] font-mono">
                            <span className="text-[var(--theme-secondary)] font-sans">Segment size:</span>
                            <span className="font-bold text-[var(--theme-primary)]">{config.chunkSize} tokens</span>
                          </div>
                          <div className="flex justify-between items-center text-[11px] font-mono">
                            <span className="text-[var(--theme-secondary)] font-sans">Overlapping:</span>
                            <span className="font-bold text-[var(--theme-primary)]">{config.chunkOverlap} tokens</span>
                          </div>
                        </div>


                      </div>
                    </div>

                    {/* Action Step guide */}
                    <div className="p-4 rounded-2xl bg-gradient-to-tr from-blue-500/5 to-purple-500/5 border border-blue-500/10 space-y-2">
                      <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--theme-secondary)] block">Quick Start Guideline</span>
                      <ol className="text-[10px] text-[var(--theme-secondary)] leading-relaxed list-decimal list-inside space-y-1">
                        <li>Navigate to the <span className="font-bold text-blue-500">Files Manager</span>.</li>
                        <li>Drag and drop your knowledge files.</li>
                        <li>Wait for chunks index computation completes.</li>
                        <li>Ask questions in Coder Workspace chat!</li>
                      </ol>
                    </div>

                  </div>

                </div>

              </motion.div>
            )}

            {/* SUB-PANEL 2: DOCUMENTS MANAGER */}
            {activeTab === 'documents' && (
              <motion.div
                key="documents"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.15 }}
                className="h-full flex flex-col overflow-hidden"
              >
                {/* Search Bar / File Selector Trigger */}
                <div className="p-4 mx-6 mt-4 border border-[var(--theme-border)]/30 rounded-2xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[var(--theme-surface)]/90">
                  <div className="relative flex-1">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--theme-muted)]" />
                    <input 
                      type="text"
                      placeholder="Search managed documents by name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-[var(--theme-bg)] border border-[var(--theme-border)]/45 focus:border-blue-500/50 rounded-xl py-2 pl-9 pr-4 text-xs focus:ring-0 focus:outline-none placeholder-[var(--theme-muted)] transition-all font-medium"
                    />
                  </div>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-blue-500 text-white hover:bg-blue-600 font-bold text-xs select-none shadow-md transition-all cursor-pointer hover:scale-[1.01]"
                  >
                    <Upload size={13} strokeWidth={2.5} />
                    <span>Upload Documents</span>
                  </button>
                </div>

                {/* Main Documents Box Container */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                  
                  {/* DRAG AND DROP PORT */}
                  <div 
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                      dragActive 
                        ? 'border-blue-500 bg-blue-500/5 scale-[0.99] shadow-inner' 
                        : 'border-[var(--theme-border)] hover:border-blue-500/40 hover:bg-[var(--theme-hover-bg)]/20'
                    }`}
                  >
                    <div className="w-11 h-11 bg-blue-500/15 rounded-xl flex items-center justify-center mb-3 text-blue-500">
                      <Upload size={20} className={dragActive ? 'text-blue-500' : 'animate-bounce'} />
                    </div>
                    <span className="text-xs font-bold block mb-1">Drag and Drop Knowledge sources here</span>
                    <span className="text-[10px] text-[var(--theme-muted)] leading-relaxed">PDF, WORD (docx), TXT, MARKDOWN (md), HTML, CSV, JSON</span>
                    <span className="text-[9px] text-blue-500 font-medium underline mt-2 block">or browse system files</span>
                  </div>

                  <input 
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    multiple
                    accept=".pdf,.docx,.txt,.md,.html,.htm,.json,.csv"
                    className="hidden"
                  />

                  {/* ACTIVE UPLOAD LOADER */}
                  {isUploading && uploadProgress && (
                    <div className="p-3.5 border border-blue-500/15 bg-blue-500/5 rounded-2xl space-y-2">
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="font-bold truncate max-w-xs">{uploadProgress.name}</span>
                        <span className="text-blue-500 font-mono font-bold">{uploadProgress.pct}%</span>
                      </div>
                      <div className="w-full bg-[var(--theme-hover-bg)] h-1.5 rounded-full overflow-hidden">
                        <div className="bg-blue-500 h-full rounded-full transition-all" style={{ width: `${uploadProgress.pct}%` }} />
                      </div>
                    </div>
                  )}

                  {/* DOCUMENTS LIST */}
                  <div className="space-y-2">
                    {filteredDocs.length === 0 && !isUploading ? (
                      <div className="text-center py-12 text-[var(--theme-muted)] block text-xs font-mono">
                        No documents loaded yet or matching query constraints.
                      </div>
                    ) : (
                      filteredDocs.map(doc => {
                        let statusBadge = (
                          <span className="text-[9px] px-2 py-0.8 rounded-full font-bold bg-amber-500/10 text-amber-500 flex items-center gap-1 shrink-0">
                            <Clock size={9} /> Pending
                          </span>
                        );
                        if (doc.status === 'processing') {
                          statusBadge = (
                            <span className="text-[9px] px-2 py-0.8 rounded-full font-bold bg-blue-500/10 text-blue-500 flex items-center gap-1 animate-pulse shrink-0">
                              <RefreshCw size={9} className="animate-spin" /> Chunks...
                            </span>
                          );
                        } else if (doc.status === 'indexed') {
                          statusBadge = (
                            <span className="text-[9px] px-2 py-0.8 rounded-full font-semibold bg-emerald-500/10 text-emerald-500 flex items-center gap-1 shrink-0">
                              <CheckCircle2 size={10} /> Indexed
                            </span>
                          );
                        } else if (doc.status === 'failed') {
                          statusBadge = (
                            <span className="text-[9px] px-2 py-0.8 rounded-full font-bold bg-rose-500/10 text-rose-500 flex items-center gap-1 shrink-0" title={doc.error}>
                              <AlertTriangle size={10} /> Failed
                            </span>
                          );
                        }

                        return (
                          <div key={doc.id} className="border border-[var(--theme-border)]/50 rounded-xl p-3 flex items-center justify-between bg-[var(--theme-surface)] hover:border-blue-500/25 transition-all group shadow-sm">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-9 h-9 rounded-lg bg-[var(--theme-hover-bg)] flex items-center justify-center text-[var(--theme-secondary)] hover:text-blue-500 border border-[var(--theme-border)]/40 shrink-0">
                                <FileText size={18} />
                              </div>
                              <div className="min-w-0">
                                <span className="font-semibold text-xs text-[var(--theme-primary)] truncate block" title={doc.name}>
                                  {doc.name}
                                </span>
                                <div className="flex items-center gap-2 text-[10px] text-[var(--theme-secondary)] font-mono mt-0.5">
                                  <span>{formatBytes(doc.size)}</span>
                                  <span>•</span>
                                  <span>{doc.chunkCount} chunks</span>
                                  <span>•</span>
                                  <span className="capitalize">{doc.name.split('.').pop()} file</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              {statusBadge}
                              <button 
                                onClick={() => handleDeleteDoc(doc.id)}
                                title="Remove document and citations index"
                                className="p-1.5 hover:bg-rose-500/10 text-[var(--theme-muted)] hover:text-rose-500 rounded-lg transition-all cursor-pointer"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                </div>
              </motion.div>
            )}

            {/* SUB-PANEL 3: EMBEDDING DETAILS */}
            {activeTab === 'embedders' && (
              <motion.div
                key="embedders"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.15 }}
                className="h-full overflow-y-auto p-6 space-y-6 custom-scrollbar"
              >
                <div className="border-b border-[var(--theme-border)]/30 pb-4">
                  <span className="font-bold text-sm tracking-tight block text-[var(--theme-primary)]">Embedding Generation Source</span>
                  <span className="text-[10px] text-[var(--theme-secondary)] tracking-wide block mt-0.5">Select and calibrate local or remote vectors constructors.</span>
                </div>

                {/* SELECTOR BOXES CONTAINER */}
                <div className="space-y-3">
                  <label className="text-[11px] uppercase font-mono tracking-widest font-bold text-[var(--theme-secondary)] flex items-center gap-1.5">
                    <Database size={12} className="text-blue-500" />
                    Embedding Model Source:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {[
                      { id: 'local-fallback', name: 'Deterministic Local', desc: 'Secure, zero latency fallback vectors calculated locally in memory' },
                      { id: 'ollama', name: 'Ollama Model', desc: 'Queries local Ollama embed services run on localhost or remote URL' },
                      { id: 'openai', name: 'OpenAI Embeds', desc: 'Standard cloud embeddings vectors (charges may apply dynamically)' },
                      { id: 'gemini', name: 'Gemini Embeds', desc: 'Developer API Google embeddings generation models' },
                    ].map(item => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSaveConfig({ embeddingModel: item.id as any })}
                        className={`p-4 border rounded-xl cursor-pointer text-left flex flex-col justify-between transition-all select-none group active:scale-98 ${
                          config.embeddingModel === item.id 
                            ? 'border-blue-500 bg-blue-500/5 shadow-sm font-bold' 
                            : 'border-[var(--theme-border)] hover:bg-[var(--theme-hover-bg)]/40 hover:border-zinc-500/20'
                        }`}
                      >
                        <span className={`text-[11px] font-bold block ${config.embeddingModel === item.id ? 'text-blue-500' : 'text-[var(--theme-primary)]'}`}>{item.name}</span>
                        <span className="text-[9.5px] text-[var(--theme-muted)] leading-relaxed mt-1.5 block font-medium">{item.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* DYNAMIC SUBSECTION ASSIGNED TO THE ACTIVE MODEL */}
                <div className="mt-4 pt-2">
                  <AnimatePresence mode="popLayout">
                    
                    {config.embeddingModel === 'ollama' && (
                      <motion.div 
                        initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
                        className="p-5 border border-[var(--theme-border)]/45 bg-[var(--theme-surface)] rounded-2xl space-y-4 shadow-sm"
                      >
                        <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--theme-secondary)] flex items-center gap-1.5">
                          <Server size={12} className="text-blue-500" /> Ollama Configuration
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-[10px] uppercase tracking-wider font-semibold text-[var(--theme-secondary)] block">Ollama Endpoint URL:</label>
                            <input 
                              type="text"
                              value={config.ollamaUrl}
                              onChange={(e) => handleSaveConfig({ ollamaUrl: e.target.value })}
                              className="w-full bg-[var(--theme-bg)] border border-[var(--theme-border)]/45 focus:border-blue-500/50 rounded-xl px-3.5 py-2 text-xs focus:ring-0 focus:outline-none transition-all font-mono"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] uppercase tracking-wider font-semibold text-[var(--theme-secondary)] block">Embedding Model Identifier Name:</label>
                            <input 
                              type="text"
                              value={config.ollamaModel}
                              onChange={(e) => handleSaveConfig({ ollamaModel: e.target.value })}
                              className="w-full bg-[var(--theme-bg)] border border-[var(--theme-border)]/45 focus:border-blue-500/50 rounded-xl px-3.5 py-2 text-xs focus:ring-0 focus:outline-none transition-all font-mono"
                            />
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {config.embeddingModel === 'openai' && (
                      <motion.div 
                        initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
                        className="p-5 border border-[var(--theme-border)]/45 bg-[var(--theme-surface)] rounded-2xl space-y-4 shadow-sm"
                      >
                        <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--theme-secondary)] flex items-center gap-1.5">
                          <KeyRound size={12} className="text-blue-500" /> OpenAI Embeddings Configuration
                        </span>
                        <div className="space-y-4">
                          <div className="space-y-1.5">
                            <label className="text-[10px] uppercase tracking-wider font-semibold text-[var(--theme-secondary)] block">OpenAI Bearer API Secret Key:</label>
                            <input 
                              type="password"
                              placeholder="sk-..."
                              value={config.openaiApiKey}
                              onChange={(e) => handleSaveConfig({ openaiApiKey: e.target.value })}
                              className="w-full bg-[var(--theme-bg)] border border-[var(--theme-border)]/45 focus:border-blue-500/50 rounded-xl px-3.5 py-2 text-xs focus:ring-0 focus:outline-none transition-all font-mono"
                            />
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <label className="text-[10px] uppercase tracking-wider font-semibold text-[var(--theme-secondary)] block">OpenAI Proxy URL endpoint:</label>
                              <input 
                                type="text"
                                value={config.openaiUrl}
                                onChange={(e) => handleSaveConfig({ openaiUrl: e.target.value })}
                                className="w-full bg-[var(--theme-bg)] border border-[var(--theme-border)]/45 focus:border-blue-500/50 rounded-xl px-3.5 py-2 text-xs focus:ring-0 focus:outline-none transition-all font-mono"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[10px] uppercase tracking-wider font-semibold text-[var(--theme-secondary)] block">Model Name Identifier:</label>
                              <input 
                                type="text"
                                value={config.openaiModel}
                                onChange={(e) => handleSaveConfig({ openaiModel: e.target.value })}
                                className="w-full bg-[var(--theme-bg)] border border-[var(--theme-border)]/45 focus:border-blue-500/50 rounded-xl px-3.5 py-2 text-xs focus:ring-0 focus:outline-none transition-all font-mono"
                              />
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {config.embeddingModel === 'gemini' && (
                      <motion.div 
                        initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
                        className="p-5 border border-[var(--theme-border)]/45 bg-[var(--theme-surface)] rounded-2xl space-y-4 shadow-sm"
                      >
                        <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--theme-secondary)] flex items-center gap-1.5">
                          <KeyRound size={12} className="text-blue-500" /> Google Gemini Configuration
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-[10px] uppercase tracking-wider font-semibold text-[var(--theme-secondary)] block">Gemini API Key (optional fallback to system env):</label>
                            <input 
                              type="password"
                              placeholder="AIzaSy..."
                              value={config.geminiApiKey}
                              onChange={(e) => handleSaveConfig({ geminiApiKey: e.target.value })}
                              className="w-full bg-[var(--theme-bg)] border border-[var(--theme-border)]/45 focus:border-blue-500/50 rounded-xl px-3.5 py-2 text-xs focus:ring-0 focus:outline-none transition-all font-mono"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] uppercase tracking-wider font-semibold text-[var(--theme-secondary)] block">Gemini Embedding Model Name:</label>
                            <input 
                              type="text"
                              value={config.geminiModel}
                              onChange={(e) => handleSaveConfig({ geminiModel: e.target.value })}
                              className="w-full bg-[var(--theme-bg)] border border-[var(--theme-border)]/45 focus:border-blue-500/50 rounded-xl px-3.5 py-2 text-xs focus:ring-0 focus:outline-none transition-all font-mono"
                            />
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {config.embeddingModel === 'local-fallback' && (
                      <motion.div 
                        initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
                        className="p-5 border border-[var(--theme-border)]/30 bg-[var(--theme-surface)]/40 rounded-2xl flex items-center gap-4 shadow-sm"
                      >
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-500 shrink-0">
                          <CheckCircle2 size={18} />
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-bold block text-[var(--theme-primary)]">Deterministic Local Embeddings Active</span>
                          <span className="text-[10.5px] text-[var(--theme-secondary)] leading-relaxed block mt-0.5">
                            This mode translates text chunks into numeric vectors mathematically without requiring any external internet connections or paying credential fee tokens. This guarantees 100% offline security, private operation, and zero API costs.
                          </span>
                        </div>
                      </motion.div>
                    )}

                  </AnimatePresence>
                </div>
              </motion.div>
            )}

            {/* SUB-PANEL 4: CHUNKING PARAMETERS */}
            {activeTab === 'parameters' && (
              <motion.div
                key="parameters"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.15 }}
                className="h-full overflow-y-auto p-6 space-y-6 custom-scrollbar"
              >
                <div className="border-b border-[var(--theme-border)]/30 pb-4">
                  <span className="font-bold text-sm tracking-tight block text-[var(--theme-primary)]">Chunking Parameters Configuration</span>
                  <span className="text-[10px] text-[var(--theme-secondary)] tracking-wide block mt-0.5">Set the semantic segment sizes and sliding windows boundaries.</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Chunk size input */}
                  <div className="space-y-2 bg-[var(--theme-surface)] border border-[var(--theme-border)]/35 p-5 rounded-2xl shadow-sm">
                    <label className="text-xs font-bold text-[var(--theme-primary)] block">Chunk Token Size (characters / estimated tokens)</label>
                    <input 
                      type="number"
                      value={config.chunkSize}
                      onChange={(e) => handleSaveConfig({ chunkSize: parseInt(e.target.value) || 128 })}
                      className="w-full bg-[var(--theme-bg)] border border-[var(--theme-border)]/45 focus:border-blue-500/50 rounded-xl px-4 py-2.5 text-xs focus:ring-0 focus:outline-none placeholder-[var(--theme-muted)] transition-all font-mono font-bold"
                    />
                    <p className="text-[10px] text-[var(--theme-muted)] leading-relaxed mt-1">
                      Determines the specific word size split boundary for each document chunk. Making this larger preserves wider context but limits total records retrieved. Recommended default is <span className="font-bold text-blue-500 font-mono">1024</span>.
                    </p>
                  </div>

                  {/* Overlap size input */}
                  <div className="space-y-2 bg-[var(--theme-surface)] border border-[var(--theme-border)]/35 p-5 rounded-2xl shadow-sm">
                    <label className="text-xs font-bold text-[var(--theme-primary)] block">Chunk Overlap Window (estimated tokens)</label>
                    <input 
                      type="number"
                      value={config.chunkOverlap}
                      onChange={(e) => handleSaveConfig({ chunkOverlap: parseInt(e.target.value) || 0 })}
                      className="w-full bg-[var(--theme-bg)] border border-[var(--theme-border)]/45 focus:border-blue-500/50 rounded-xl px-4 py-2.5 text-xs focus:ring-0 focus:outline-none placeholder-[var(--theme-muted)] transition-all font-mono font-bold"
                    />
                    <p className="text-[10px] text-[var(--theme-muted)] leading-relaxed mt-1">
                      Sets overlapping text length kept between adjacent sliding chunks. This ensures sentence-level meaning and flow aren't cut apart at index thresholds. Recommended default is <span className="font-bold text-blue-500 font-mono">200</span>.
                    </p>
                  </div>
                </div>

                {/* Important instruction parameters card */}
                <div className="bg-[var(--theme-surface)] border border-[var(--theme-border)]/30 rounded-2xl p-5 shadow-sm space-y-3.5">
                  <div className="flex items-center gap-2">
                    <Info size={14} className="text-amber-500" />
                    <span className="font-bold text-xs uppercase tracking-wider text-[var(--theme-primary)]">Why do these sizes matter?</span>
                  </div>
                  <div className="text-[10.5px] text-[var(--theme-secondary)] leading-relaxed space-y-2">
                    <p>
                      When documents are indexed, they are segmented into blocks of text. Choosing the ideal combination depends heavily on the structure of your files:
                    </p>
                    <ul className="list-disc list-inside space-y-1 pl-1">
                      <li><span className="font-bold">Fact sheets / Small Tables</span>: Benefit from smaller, precise chunk sizes (e.g. 512) and minor overlap.</li>
                      <li><span className="font-bold">Literary PDFs / Transcripts</span>: Call for larger semantic sizes (e.g. 1024 or 2048) with standard overlaps (e.g. 200) to keep long narrative streams connected.</li>
                    </ul>
                    <p className="font-semibold text-amber-500/90 flex gap-1 items-center mt-2">
                      <AlertTriangle size={13} />
                      Note: Changing parameters takes effect on newly uploaded files only. To apply to old files, purge first!
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* SUB-PANEL 5: ENGINE EXECUTION LOGS */}
            {activeTab === 'logs' && (
              <motion.div
                key="logs"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.15 }}
                className="h-full flex flex-col overflow-hidden"
              >
                {/* Control bar with level filters */}
                <div className="p-4 mx-6 mt-4 border border-[var(--theme-border)]/30 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 bg-[var(--theme-surface)]/90 shrink-0">
                  <span className="flex items-center gap-1.5 uppercase font-mono tracking-widest text-[var(--theme-secondary)] text-xs font-bold">
                    <Activity size={13} className="text-blue-500 animate-pulse" />
                    RAG EXECUTION TRACE
                  </span>
                  
                  {/* Log Filter Toggle Controls */}
                  <div className="flex items-center gap-1 bg-[var(--theme-bg)] border border-[var(--theme-border)]/30 p-1 rounded-xl">
                    {(['all', 'info', 'warn', 'error'] as const).map(filter => (
                      <button
                        key={filter}
                        onClick={() => setLogFilter(filter)}
                        className={`px-3 py-1 text-[10px] font-bold uppercase rounded-lg transition-all cursor-pointer ${
                          logFilter === filter
                            ? 'bg-blue-500 text-white shadow-sm'
                            : 'text-[var(--theme-secondary)] hover:text-[var(--theme-primary)]'
                        }`}
                      >
                        {filter}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Main Scroll Log lines body container */}
                <div className="flex-1 overflow-hidden p-6">
                  <div className="w-full h-full bg-[var(--theme-surface)] border border-[var(--theme-border)]/30 rounded-2xl flex flex-col overflow-hidden shadow-sm">
                    <div className="p-3 border-b border-[var(--theme-border)]/40 flex items-center justify-between bg-[var(--theme-surface)] shrink-0 text-[10px] font-mono text-[var(--theme-muted)]">
                      <span>Live Terminal Output stream logs</span>
                      <span>{filteredLogs.length} matching events</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 bg-[var(--theme-bg)]/20 font-mono text-[10px] leading-relaxed space-y-1.5 custom-scrollbar select-text selection:bg-blue-500/20">
                      {filteredLogs.length === 0 ? (
                        <div className="text-center py-10 text-[var(--theme-muted)] italic">
                          No matching logs or processing log activity recorded yet.
                        </div>
                      ) : (
                        filteredLogs.map(log => {
                          let levelColor = 'text-blue-400';
                          if (log.level === 'warn') levelColor = 'text-amber-500';
                          if (log.level === 'error') levelColor = 'text-rose-400';

                          return (
                            <div key={log.id} className="flex gap-4 p-1 hover:bg-[var(--theme-hover-bg)]/40 rounded transition-all">
                              <span className="text-[var(--theme-muted)] shrink-0 select-none">{new Date(log.timestamp).toLocaleTimeString()}</span>
                              <span className={`font-bold uppercase tracking-wider shrink-0 select-none ${levelColor}`}>[{log.level}]</span>
                              <span className="text-[var(--theme-primary)] font-medium break-all">{log.message}</span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>

              </motion.div>
            )}

          </AnimatePresence>
        </div>

      </div>

    </div>
  );
}
