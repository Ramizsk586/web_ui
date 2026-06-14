import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Database, 
  Search, 
  X, 
  Check, 
  CheckSquare, 
  Square, 
  Info, 
  FileText, 
  SlidersHorizontal,
  BookmarkCheck
} from 'lucide-react';
import { RagDocument } from '../types/rag_types';

interface DocumentSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDocIds: string[];
  onSelectionChange: (ids: string[]) => void;
  ragEnabled: boolean;
  onToggleRag: (enabled: boolean) => void;
}

export function DocumentSelector({
  isOpen,
  onClose,
  selectedDocIds,
  onSelectionChange,
  ragEnabled,
  onToggleRag
}: DocumentSelectorProps) {
  const [documents, setDocuments] = useState<RagDocument[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchDocuments();
    }
  }, [isOpen]);

  const fetchDocuments = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/rag/documents');
      if (response.ok) {
        const data = await response.json();
        // Load only completed index documents for chat mapping
        setDocuments(data.filter((d: RagDocument) => d.status === 'indexed'));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedDocIds.length === documents.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(documents.map(d => d.id));
    }
  };

  const toggleDocument = (id: string) => {
    if (selectedDocIds.includes(id)) {
      onSelectionChange(selectedDocIds.filter(x => x !== id));
    } else {
      onSelectionChange([...selectedDocIds, id]);
    }
  };

  const filtered = documents.filter(doc => 
    doc.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 min-h-screen bg-black/50 backdrop-blur-xs flex items-center justify-center z-[13000] p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="w-full max-w-lg bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden"
        >
          {/* HEADER */}
          <div className="px-5 py-4 border-b border-[var(--theme-border)]/45 flex items-center justify-between bg-[var(--theme-surface)]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
                <Database size={16} />
              </div>
              <div>
                <span className="font-semibold text-xs text-[var(--theme-primary)] block">Select Context Documents</span>
                <span className="text-[10px] text-[var(--theme-secondary)] block">Enable specific files as real-time chat knowledge</span>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-1.5 hover:bg-[var(--theme-hover-bg)] text-[var(--theme-secondary)] hover:text-[var(--theme-primary)] rounded-lg transition-all cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          {/* ACTIVE STATUS CONTROL PANEL */}
          <div className="p-4 bg-[var(--theme-hover-bg)]/20 border-b border-[var(--theme-border)]/20 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <SlidersHorizontal size={14} className="text-blue-500" />
              <span className="text-xs font-bold text-[var(--theme-primary)]">RAG Context Engine Status:</span>
            </div>
            <div className="flex items-center gap-1">
              <button 
                onClick={() => onToggleRag(!ragEnabled)}
                className={`text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer select-none ${
                  ragEnabled 
                    ? 'bg-blue-500 text-white shadow-sm' 
                    : 'bg-[var(--theme-bg)] border border-[var(--theme-border)] text-[var(--theme-secondary)]'
                }`}
              >
                {ragEnabled ? 'ACTIVE' : 'DISABLED'}
              </button>
            </div>
          </div>

          <div className="p-4 flex flex-col flex-1 overflow-hidden space-y-4">
            {/* SEARCH BANNER */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--theme-muted)]" />
              <input 
                type="text"
                placeholder="Search indexed corpus files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[var(--theme-bg)] border border-[var(--theme-border)]/45 focus:border-blue-500/50 rounded-xl py-2 pl-9 pr-4 text-xs focus:ring-0 focus:outline-none placeholder-[var(--theme-muted)] transition-all font-medium"
              />
            </div>

            {/* SELECTION BAR HELPER */}
            <div className="flex items-center justify-between text-[11px] shrink-0 px-1">
              <button 
                onClick={toggleSelectAll}
                className="text-blue-500 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
              >
                <BookmarkCheck size={13} />
                {selectedDocIds.length === documents.length ? 'Clear Selection' : 'Select All Files'}
              </button>
              <span className="text-[var(--theme-secondary)] font-mono">{selectedDocIds.length} of {documents.length} selected</span>
            </div>

            {/* DOCUMENTS BODY SCROLL */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar min-h-[220px]">
              {isLoading ? (
                <div className="text-center py-10 font-mono text-[var(--theme-muted)] text-xs animate-pulse">
                  Querying database index...
                </div>
              ) : documents.length === 0 ? (
                <div className="text-center py-10 text-[var(--theme-muted)] text-xs flex flex-col items-center justify-center gap-2">
                  <Info size={16} className="text-[var(--theme-muted)]" />
                  <div className="font-semibold text-center">No completed indexed documents found</div>
                  <div className="text-[10px] text-[var(--theme-secondary)] max-w-xs text-center leading-normal">
                    Please upload and process files in the RAG Tab in Settings before configuring semantic contexts.
                  </div>
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-10 font-mono text-[var(--theme-muted)] text-xs">
                  No match found for "{searchQuery}"
                </div>
              ) : (
                filtered.map(doc => {
                  const isSelected = selectedDocIds.includes(doc.id);
                  return (
                    <div 
                      key={doc.id}
                      onClick={() => toggleDocument(doc.id)}
                      className={`p-3 border rounded-xl flex items-center justify-between cursor-pointer transition-all ${
                        isSelected 
                          ? 'border-blue-500 bg-blue-500/5' 
                          : 'border-[var(--theme-border)]/50 hover:bg-[var(--theme-hover-bg)]/40 bg-[var(--theme-surface)]'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {isSelected ? (
                          <CheckSquare size={16} className="text-blue-500 shrink-0" />
                        ) : (
                          <Square size={16} className="text-[var(--theme-muted)] shrink-0" />
                        )}
                        <div className="min-w-0">
                          <span className="font-semibold text-xs text-[var(--theme-primary)] truncate block">
                            {doc.name}
                          </span>
                          <span className="text-[9px] text-[var(--theme-secondary)] font-mono block mt-0.5">
                            {doc.chunkCount} segmented blocks • {Math.ceil(doc.size / 1024)} KB
                          </span>
                        </div>
                      </div>
                      <div className="w-7 h-7 rounded bg-[var(--theme-bg)]/60 border border-[var(--theme-border)]/40 flex items-center justify-center text-[var(--theme-secondary)]">
                        <FileText size={14} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* ACTION FOOTER */}
          <div className="p-4 border-t border-[var(--theme-border)]/45 bg-[var(--theme-surface)] flex justify-end gap-2.5 shrink-0">
            <button 
              onClick={onClose}
              className="px-4 py-2 font-bold text-xs rounded-xl bg-blue-500 text-white hover:bg-blue-600 shadow-md transition-all cursor-pointer"
            >
              Done / Persist
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
