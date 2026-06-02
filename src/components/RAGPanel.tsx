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
  KeyRound
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

  const [activeTab, setActiveTab] = useState<'documents' | 'settings' | 'logs'>('documents');
  const [searchQuery, setSearchQuery] = useState('');
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
      console.error("Error loaded RAG panel inputs:", e);
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

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = 2;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[var(--theme-bg)] text-[var(--theme-primary)] overflow-hidden font-sans relative">
      {/* HEADER SECTION */}
      <div className="h-16 border-b border-[var(--theme-border)]/40 flex items-center justify-between px-6 bg-[var(--theme-surface)] shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 shadow-sm border border-blue-500/15">
            <Database size={20} />
          </div>
          <div>
            <span className="font-display font-bold text-base tracking-tight block">RAG Knowledge Base</span>
            <span className="text-[10px] text-[var(--theme-secondary)] tracking-wide">Fully local, secure semantic document indexing & retrieval</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleRefresh}
            title="Refresh database registers"
            className={`p-2 hover:bg-[var(--theme-hover-bg)] text-[var(--theme-secondary)] hover:text-[var(--theme-primary)] rounded-lg transition-all border border-transparent hover:border-[var(--theme-border)]/40 cursor-pointer ${isRefreshing ? 'animate-spin text-blue-500' : ''}`}
          >
            <RefreshCw size={16} />
          </button>
          {onClose && (
            <button 
              onClick={onClose}
              className="p-2 hover:bg-[var(--theme-hover-bg)] text-[var(--theme-secondary)] hover:text-[var(--theme-primary)] rounded-lg transition-all cursor-pointer"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* STATS STRIP */}
      <div className="grid grid-cols-4 gap-4 px-6 py-4 bg-[var(--theme-surface)]/10 border-b border-[var(--theme-border)]/20 shrink-0">
        {[
          { label: 'Total Source Files', val: stats.documentCount, icon: <FileText size={14} className="text-blue-500" /> },
          { label: 'Segmented Chunks', val: stats.chunkCount, icon: <Database size={14} className="text-violet-500" /> },
          { label: 'Embedding Vector Index', val: `${stats.indexedCount} / ${stats.chunkCount}`, icon: <Sparkles size={14} className="text-emerald-500" /> },
          { label: 'Total Storage Consumed', val: formatBytes(stats.storageUsage), icon: <Server size={14} className="text-amber-500" /> },
        ].map((item, idx) => (
          <div key={idx} className="bg-[var(--theme-surface)] border border-[var(--theme-border)]/30 rounded-xl p-3.5 shadow-sm flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[10px] text-[var(--theme-secondary)] block font-medium uppercase tracking-widest">{item.label}</span>
              <span className="text-base font-bold font-mono text-[var(--theme-primary)] block leading-tight">{item.val}</span>
            </div>
            <div className="w-8 h-8 rounded-lg bg-[var(--theme-hover-bg)]/50 flex items-center justify-center">
              {item.icon}
            </div>
          </div>
        ))}
      </div>

      {/* TABS CONTROLLERS */}
      <div className="flex border-b border-[var(--theme-border)]/20 bg-[var(--theme-surface)]/20 px-6 shrink-0">
        {[
          { id: 'documents', label: 'Knowledge Documents', count: filteredDocs.length },
          { id: 'settings', label: 'Indexing Settings' },
          { id: 'logs', label: 'Processing Logs', count: logs.length },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`py-3 px-4 text-xs font-semibold relative transition-all border-b-2 cursor-pointer ${
              activeTab === tab.id 
                ? 'border-blue-500 text-blue-500 font-bold' 
                : 'border-transparent text-[var(--theme-secondary)] hover:text-[var(--theme-primary)]'
            }`}
          >
            <span className="flex items-center gap-1.5">
              {tab.label}
              {tab.hasOwnProperty('count') && (
                <span className={`text-[9px] px-1.2 py-0.2 rounded-full font-bold ${activeTab === tab.id ? 'bg-blue-500/10 text-blue-500' : 'bg-[var(--theme-hover-bg)] text-[var(--theme-secondary)]'}`}>
                  {tab.count}
                </span>
              )}
            </span>
          </button>
        ))}
      </div>

      {/* CORE INNER VIEW */}
      <div className="flex-1 overflow-hidden p-6 relative">
        <AnimatePresence mode="wait">
          {activeTab === 'documents' && (
            <motion.div 
              initial={{ opacity: 0, y: 5 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -5 }} 
              transition={{ duration: 0.15 }}
              className="h-full flex gap-6 overflow-hidden"
            >
              {/* LEFT: DRAG-DROP & FILES LISTVIEW */}
              <div className="flex-1 flex flex-col h-full bg-[var(--theme-surface)] border border-[var(--theme-border)]/30 rounded-2xl overflow-hidden shadow-sm">
                
                {/* Search Bar / File Selector Trigger */}
                <div className="p-4 border-b border-[var(--theme-border)]/40 flex items-center justify-between gap-4 bg-[var(--theme-surface)]">
                  <div className="relative flex-1">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--theme-muted)]" />
                    <input 
                      type="text"
                      placeholder="Search managed documents..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-[var(--theme-bg)] border border-[var(--theme-border)]/45 focus:border-blue-500/50 rounded-xl py-2 pl-9 pr-4 text-xs focus:ring-0 focus:outline-none placeholder-[var(--theme-muted)] transition-all font-medium"
                    />
                  </div>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-500 text-white hover:bg-blue-600 font-bold text-xs select-none shadow-md transition-all cursor-pointer hover:scale-[1.01]"
                  >
                    <Upload size={13} strokeWidth={2.5} />
                    <span>Upload Documents</span>
                  </button>
                </div>

                {/* Main Documents Box Container */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                  
                  {/* DRAG AND DROP PORT */}
                  <div 
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                      dragActive 
                        ? 'border-blue-500 bg-blue-500/5 scale-[0.99] shadow-inner' 
                        : 'border-[var(--theme-border)] hover:border-blue-500/40 hover:bg-[var(--theme-hover-bg)]/20'
                    }`}
                  >
                    <Upload size={24} className={`mb-2 ${dragActive ? 'text-blue-500' : 'text-[var(--theme-secondary)] animate-bounce'}`} />
                    <span className="text-xs font-bold block mb-1">Drag and Drop Knowledge sources here</span>
                    <span className="text-[10px] text-[var(--theme-muted)] leading-relaxed">PDF, WORD (docx), TXT, MARKDOWN (md), HTML, CSV, JSON</span>
                    <span className="text-[9px] text-blue-500 font-medium underline mt-1.5">or browse your system files</span>
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
                    <div className="p-3 border border-blue-500/15 bg-blue-500/5 rounded-xl space-y-2">
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
                      <div className="text-center py-8 text-[var(--theme-muted)] block text-xs font-mono">
                        No documents loaded yet or query mismatch
                      </div>
                    ) : (
                      filteredDocs.map(doc => {
                        let statusBadge = (
                          <span className="text-[9px] px-1.8 py-0.6 rounded-full font-bold bg-amber-500/10 text-amber-500 flex items-center gap-1">
                            <Clock size={9} /> Pending
                          </span>
                        );
                        if (doc.status === 'processing') {
                          statusBadge = (
                            <span className="text-[9px] px-1.8 py-0.6 rounded-full font-bold bg-blue-500/10 text-blue-500 flex items-center gap-1 animate-pulse">
                              <RefreshCw size={9} className="animate-spin" /> Chunks...
                            </span>
                          );
                        } else if (doc.status === 'indexed') {
                          statusBadge = (
                            <span className="text-[9px] px-1.8 py-0.6 rounded-full font-semibold bg-emerald-500/10 text-emerald-500 flex items-center gap-1">
                              <CheckCircle2 size={10} /> Indexed
                            </span>
                          );
                        } else if (doc.status === 'failed') {
                          statusBadge = (
                            <span className="text-[9px] px-1.8 py-0.6 rounded-full font-bold bg-rose-500/10 text-rose-500 flex items-center gap-1" title={doc.error}>
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
                                className="p-1.5 hover:bg-rose-500/10 text-[var(--theme-muted)] hover:text-rose-500 rounded-lg transition-all group-hover:opacity-100 cursor-pointer"
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
              </div>

              {/* RIGHT: BULK OPERATION UTILITIES */}
              <div className="w-80 flex flex-col gap-4 shrink-0">
                <div className="bg-[var(--theme-surface)] border border-[var(--theme-border)]/30 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-xs flex items-center gap-1.5 mb-1 text-[var(--theme-primary)]">
                      <Settings size={13} className="text-blue-500" />
                      Bulk Actions
                    </h3>
                    <p className="text-[10px] text-[var(--theme-secondary)] leading-relaxed mb-4">Execute maintenance actions on your Knowledge Base files.</p>
                  </div>
                  <div className="space-y-2">
                    <button 
                      onClick={handleRebuildIndex}
                      className="w-full py-2.5 rounded-xl border border-[var(--theme-border)] text-[var(--theme-primary)] hover:bg-[var(--theme-hover-bg)] text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <RefreshCw size={12} />
                      Rebuild Index Registries
                    </button>
                    <button 
                      onClick={handleExportKB}
                      className="w-full py-2.5 rounded-xl border border-[var(--theme-border)] text-[var(--theme-primary)] hover:bg-[var(--theme-hover-bg)] text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <Download size={12} />
                      Export Index JSON
                    </button>
                    <button 
                      onClick={handleClearAll}
                      className="w-full py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 hover:bg-rose-500/20 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <Trash2 size={12} />
                      Purge Knowledge Base
                    </button>
                  </div>
                </div>

                <div className="bg-[var(--theme-surface)] border border-[var(--theme-border)]/30 rounded-2xl p-4 shadow-sm flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-xs flex items-center gap-1.5 mb-1.5 text-[var(--theme-primary)]">
                      <Info size={13} className="text-violet-500" />
                      Local RAG Info
                    </h3>
                    <p className="text-[11px] text-[var(--theme-secondary)] leading-relaxed space-y-2">
                      <span>RAG uses an in-memory cosine vector store with persistence cache. When you submit text queries, they are converted to vectors and searched matches are injected directly as context for context-sensitive answers.</span>
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-[var(--theme-hover-bg)]/50 border border-[var(--theme-border)]/35 flex items-center gap-2.5">
                    <Server size={14} className="text-blue-500" />
                    <div className="text-[10px]">
                      <span className="font-semibold block">Store Engine</span>
                      <span className="font-mono text-[var(--theme-muted)]">RAG VectorDB JSON Persistent Cache</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div 
              initial={{ opacity: 0, y: 5 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -5 }} 
              transition={{ duration: 0.15 }}
              className="h-full overflow-y-auto max-w-3xl bg-[var(--theme-surface)] border border-[var(--theme-border)]/30 rounded-2xl p-6 shadow-sm space-y-6 custom-scrollbar"
            >
              <div className="border-b border-[var(--theme-border)]/30 pb-4">
                <span className="font-bold text-sm tracking-tight block">RAG Engine Settings</span>
                <span className="text-[10px] text-[var(--theme-secondary)] tracking-wide">Configure chunk delimiters, semantic sizes, and local embedding vector generators.</span>
              </div>

              {/* CORE MODEL SELECTOR */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-[var(--theme-primary)] flex items-center gap-1.5">
                  <Database size={13} className="text-blue-500" />
                  Embedding Generation Model Source:
                </label>
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { id: 'local-fallback', name: 'Deterministic Local', desc: 'Secure, zero latency fallback vectors' },
                    { id: 'ollama', name: 'Ollama Model', desc: 'Queries local model (/api/embeddings)' },
                    { id: 'openai', name: 'OpenAI Embeds', desc: 'Standard cloud embedding vectors' },
                    { id: 'gemini', name: 'Gemini Embeds', desc: 'Developer API embeddings models' },
                  ].map(item => (
                    <button
                      key={item.id}
                      onClick={() => handleSaveConfig({ embeddingModel: item.id as any })}
                      className={`p-3.5 border rounded-xl cursor-pointer text-left flex flex-col justify-between transition-all select-none ${
                        config.embeddingModel === item.id 
                          ? 'border-blue-500 bg-blue-500/5 shadow-sm' 
                          : 'border-[var(--theme-border)] hover:bg-[var(--theme-hover-bg)]'
                      }`}
                    >
                      <span className={`text-[10px] font-bold block ${config.embeddingModel === item.id ? 'text-blue-500' : 'text-[var(--theme-primary)]'}`}>{item.name}</span>
                      <span className="text-[9px] text-[var(--theme-muted)] leading-relaxed mt-1 block">{item.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* CHUNK AND OVERLAP BOUNDARIES */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-[var(--theme-primary)] block">Chunk Token Size (tokens)</label>
                  <input 
                    type="number"
                    value={config.chunkSize}
                    onChange={(e) => handleSaveConfig({ chunkSize: parseInt(e.target.value) || 128 })}
                    className="w-full bg-[var(--theme-bg)] border border-[var(--theme-border)]/45 focus:border-blue-500/50 rounded-xl px-3 py-2 text-xs focus:ring-0 focus:outline-none placeholder-[var(--theme-muted)] transition-all font-mono font-bold"
                  />
                  <span className="text-[9px] text-[var(--theme-muted)] leading-relaxed block">Determines the word size cutoff for each document chunk file. Standard default is 1024.</span>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-[var(--theme-primary)] block">Chunk Overlap Window (tokens)</label>
                  <input 
                    type="number"
                    value={config.chunkOverlap}
                    onChange={(e) => handleSaveConfig({ chunkOverlap: parseInt(e.target.value) || 0 })}
                    className="w-full bg-[var(--theme-bg)] border border-[var(--theme-border)]/45 focus:border-blue-500/50 rounded-xl px-3 py-2 text-xs focus:ring-0 focus:outline-none placeholder-[var(--theme-muted)] transition-all font-mono font-bold"
                  />
                  <span className="text-[9px] text-[var(--theme-muted)] leading-relaxed block">Token overlapping size to keep semantic structure intact between sliding chunks. Standard default is 200.</span>
                </div>
              </div>

              {/* CUSTOM API HOST DETAILS BOUND to SELECTIVE MODELS */}
              <AnimatePresence mode="popLayout">
                {config.embeddingModel === 'ollama' && (
                  <motion.div 
                    initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
                    className="p-4 border border-[var(--theme-border)]/45 bg-[var(--theme-bg)]/40 rounded-xl space-y-3"
                  >
                    <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--theme-secondary)] flex items-center gap-1">
                      <Server size={11} className="text-blue-500" /> Ollama Configuration
                    </span>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] text-[var(--theme-secondary)]">Ollama Service URL API endpoint:</label>
                        <input 
                          type="text"
                          value={config.ollamaUrl}
                          onChange={(e) => handleSaveConfig({ ollamaUrl: e.target.value })}
                          className="w-full bg-[var(--theme-bg)] border border-[var(--theme-border)]/45 focus:border-blue-500/50 rounded-xl px-3 py-2 text-xs focus:ring-0 focus:outline-none transition-all font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-[var(--theme-secondary)]">Ollama Embedding Model Name:</label>
                        <input 
                          type="text"
                          value={config.ollamaModel}
                          onChange={(e) => handleSaveConfig({ ollamaModel: e.target.value })}
                          className="w-full bg-[var(--theme-bg)] border border-[var(--theme-border)]/45 focus:border-blue-500/50 rounded-xl px-3 py-2 text-xs focus:ring-0 focus:outline-none transition-all font-mono"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}

                {config.embeddingModel === 'openai' && (
                  <motion.div 
                    initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
                    className="p-4 border border-[var(--theme-border)]/45 bg-[var(--theme-bg)]/40 rounded-xl space-y-3"
                  >
                    <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--theme-secondary)] flex items-center gap-1">
                      <KeyRound size={11} className="text-blue-500" /> OpenAI Configuration
                    </span>
                    <div className="space-y-2">
                      <div className="space-y-1">
                        <label className="text-[10px] text-[var(--theme-secondary)]">OpenAI Bearer API Key:</label>
                        <input 
                          type="password"
                          placeholder="sk-..."
                          value={config.openaiApiKey}
                          onChange={(e) => handleSaveConfig({ openaiApiKey: e.target.value })}
                          className="w-full bg-[var(--theme-bg)] border border-[var(--theme-border)]/45 focus:border-blue-500/50 rounded-xl px-3 py-2 text-xs focus:ring-0 focus:outline-none transition-all font-mono"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4 pt-1">
                        <div className="space-y-1">
                          <label className="text-[10px] text-[var(--theme-secondary)]">OpenAI Proxy base URL:</label>
                          <input 
                            type="text"
                            value={config.openaiUrl}
                            onChange={(e) => handleSaveConfig({ openaiUrl: e.target.value })}
                            className="w-full bg-[var(--theme-bg)] border border-[var(--theme-border)]/45 focus:border-blue-500/50 rounded-xl px-3 py-2 text-xs focus:ring-0 focus:outline-none transition-all font-mono"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] text-[var(--theme-secondary)]">Model Identifier:</label>
                          <input 
                            type="text"
                            value={config.openaiModel}
                            onChange={(e) => handleSaveConfig({ openaiModel: e.target.value })}
                            className="w-full bg-[var(--theme-bg)] border border-[var(--theme-border)]/45 focus:border-blue-500/50 rounded-xl px-3 py-2 text-xs focus:ring-0 focus:outline-none transition-all font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {config.embeddingModel === 'gemini' && (
                  <motion.div 
                    initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
                    className="p-4 border border-[var(--theme-border)]/45 bg-[var(--theme-bg)]/40 rounded-xl space-y-3"
                  >
                    <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--theme-secondary)] flex items-center gap-1">
                      <KeyRound size={11} className="text-blue-500" /> Google Gemini Configuration
                    </span>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] text-[var(--theme-secondary)]">Gemini API Key (optional fallback to env):</label>
                        <input 
                          type="password"
                          placeholder="AIzaSy..."
                          value={config.geminiApiKey}
                          onChange={(e) => handleSaveConfig({ geminiApiKey: e.target.value })}
                          className="w-full bg-[var(--theme-bg)] border border-[var(--theme-border)]/45 focus:border-blue-500/50 rounded-xl px-3 py-2 text-xs focus:ring-0 focus:outline-none transition-all font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-[var(--theme-secondary)]">Embedding Model Name:</label>
                        <input 
                          type="text"
                          value={config.geminiModel}
                          onChange={(e) => handleSaveConfig({ geminiModel: e.target.value })}
                          className="w-full bg-[var(--theme-bg)] border border-[var(--theme-border)]/45 focus:border-blue-500/50 rounded-xl px-3 py-2 text-xs focus:ring-0 focus:outline-none transition-all font-mono"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {activeTab === 'logs' && (
            <motion.div 
              initial={{ opacity: 0, y: 5 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -5 }} 
              transition={{ duration: 0.15 }}
              className="h-full flex flex-col bg-[var(--theme-surface)] border border-[var(--theme-border)]/30 rounded-2xl overflow-hidden shadow-sm"
            >
              <div className="p-4 border-b border-[var(--theme-border)]/40 flex items-center justify-between bg-[var(--theme-surface)] font-bold text-xs shrink-0">
                <span className="flex items-center gap-1.5 uppercase font-mono tracking-widest text-[var(--theme-secondary)]">
                  <Activity size={13} className="text-blue-500 animate-pulse" />
                  RAG Execution Engine logs
                </span>
                <span className="text-[10px] font-mono text-[var(--theme-muted)]">{logs.length} logs captured</span>
              </div>
              <div className="flex-1 overflow-y-auto p-4 bg-[var(--theme-bg)]/20 font-mono text-[10px] leading-relaxed space-y-1.5 custom-scrollbar select-text selection:bg-blue-500/20">
                {logs.length === 0 ? (
                  <div className="text-center py-6 text-[var(--theme-muted)] italic">
                    No processing log activity recorded yet.
                  </div>
                ) : (
                  logs.map(log => {
                    let levelColor = 'text-blue-400';
                    if (log.level === 'warn') levelColor = 'text-amber-500';
                    if (log.level === 'error') levelColor = 'text-rose-500';

                    return (
                      <div key={log.id} className="flex gap-4 p-1 hover:bg-[var(--theme-hover-bg)]/40 rounded transition-all">
                        <span className="text-[var(--theme-muted)] shrink-0">{new Date(log.timestamp).toLocaleTimeString()}</span>
                        <span className={`font-bold uppercase tracking-wider shrink-0 ${levelColor}`}>[{log.level}]</span>
                        <span className="text-[var(--theme-primary)] font-medium break-all">{log.message}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
