import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Globe, 
  Clock, 
  ExternalLink, 
  ChevronRight, 
  ChevronDown, 
  Download, 
  RefreshCw, 
  AlertTriangle, 
  FileText, 
  Link as LinkIcon, 
  Image as ImageIcon, 
  Table as TableIcon,
  ChevronsLeft,
  ChevronsRight,
  ChevronLeft,
  Copy,
  Check,
  Play,
  Video,
  Film
} from 'lucide-react';
import { InteractiveTableVisualizer } from './LuminaVisualizer';

export interface ScrapeResult {
  url: string;
  title: string;
  statusCode: number;
  scrapedAt: string;
  data: Record<string, any>;
  links?: string[];
  images?: string[];
  tables?: string[][][]; // support multiple tables
  rawText?: string;
  robotsWarning?: string;
  error?: string;
  videos?: Array<{ title: string; url: string; type: 'youtube' | 'vimeo' | 'direct' | 'other' }>;
}

interface ScrapingResultArtifactProps {
  result: ScrapeResult;
  onReScrape?: (url: string) => void;
}

export const ScrapingResultArtifact: React.FC<ScrapingResultArtifactProps> = ({ result, onReScrape }) => {
  const [activeSegment, setActiveSegment] = useState<'overview' | 'links' | 'images' | 'tables' | 'rawtext' | 'videos'>('overview');
  const [copied, setCopied] = useState(false);
  const [dataKeysExpanded, setDataKeysExpanded] = useState<Record<string, boolean>>({
    headings: true,
    paragraphs: false,
    metaDescription: true
  });

  // Links Pagination State
  const [linksPage, setLinksPage] = useState(1);
  const linksPerPage = 20;
  const links = result.links || [];
  const totalLinkPages = Math.max(1, Math.ceil(links.length / linksPerPage));
  const currentLinks = links.slice((linksPage - 1) * linksPerPage, linksPage * linksPerPage);

  // Images Pagination State
  const [imagesPage, setImagesPage] = useState(1);
  const imagesPerPage = 12;
  const images = result.images || [];
  const totalImagePages = Math.max(1, Math.ceil(images.length / imagesPerPage));
  const currentImages = images.slice((imagesPage - 1) * imagesPerPage, imagesPage * imagesPerPage);

  const videos = result.videos || [];

  const toggleKey = (key: string) => {
    setDataKeysExpanded(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const downloadJson = () => {
    try {
      const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `lumina_scraped_${result.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Failed to export JSON file:', e);
    }
  };

  const handleCopyText = async () => {
    if (!result.rawText) return;
    try {
      await navigator.clipboard.writeText(result.rawText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  // Status code helper
  const isSuccess = result.statusCode >= 200 && result.statusCode < 300;
  const statusColor = isSuccess ? 'text-teal-400 bg-teal-500/10' : 'text-rose-400 bg-rose-500/10';

  return (
    <div className="w-full h-full flex flex-col bg-[#141110] border border-[#2D241E] rounded-xl overflow-hidden shadow-2xl text-zinc-300">
      
      {/* Top Header */}
      <div className="flex items-center justify-between p-4 bg-[#1C1816] border-b border-[#2D241E]">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#D97756]/10 text-[#D97756] rounded-lg">
            <Globe size={18} className="animate-spin-slow" />
          </div>
          <div>
            <h3 className="font-sans font-medium text-base text-zinc-100 truncate max-w-[280px] sm:max-w-[400px]">
              {result.title}
            </h3>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5 text-xs text-zinc-500 font-mono">
              <span className={`px-1.5 py-0.5 rounded font-bold ${statusColor}`}>
                HTTP {result.statusCode}
              </span>
              <span className="flex items-center gap-1">
                <Clock size={12} />
                {new Date(result.scrapedAt).toLocaleTimeString()}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onReScrape && (
            <button 
              onClick={() => onReScrape(result.url)}
              title="Rescrape Webpage"
              className="p-1 px-2.5 rounded bg-[#2D241E] hover:bg-[#D97756]/15 hover:text-[#D97756] border border-[#3e342c] transition-all flex items-center gap-1.5 text-xs cursor-pointer text-zinc-300 font-medium"
            >
              <RefreshCw size={13} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          )}
          <button 
            onClick={downloadJson}
            title="Download JSON Payload"
            className="p-1 px-2.5 rounded bg-[#2D241E] hover:bg-[#D97756]/15 hover:text-[#D97756] border border-[#3e342c] transition-all flex items-center gap-1.5 text-xs cursor-pointer text-zinc-300 font-medium"
          >
            <Download size={13} />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </div>

      {/* Target URL Reference Banner */}
      <div className="px-4 py-2 bg-[#1C1816]/70 border-b border-[#2D241E]/40 flex items-center justify-between text-xs font-mono text-zinc-400 gap-4 overflow-hidden">
        <span className="truncate flex-1 max-w-full hover:text-white transition-colors select-all">
          SOURCE: {result.url}
        </span>
        <a 
          href={result.url} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="text-[#D97756] hover:underline flex items-center gap-1 select-none flex-shrink-0"
        >
          <span>Visit URL</span>
          <ExternalLink size={11} />
        </a>
      </div>

      {/* Robots.txt Warning Overlay */}
      {result.robotsWarning && (
        <div className="mx-4 mt-3 p-3 bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded-lg text-xs flex items-start gap-2.5 font-sans leading-relaxed">
          <AlertTriangle size={15} className="flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Robots.txt Policy Advisory:</span> {result.robotsWarning}
          </div>
        </div>
      )}

      {/* Segment Tabs */}
      <div className="flex border-b border-[#2D241E]/80 bg-[#161312] px-2 overflow-x-auto select-none mt-3">
        <button 
          onClick={() => setActiveSegment('overview')}
          className={`px-4 py-2 text-xs font-medium font-sans border-b-2 text-zinc-300 transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${activeSegment === 'overview' ? 'border-[#D97756] text-white bg-[#1C1816]/50' : 'border-transparent text-zinc-400 hover:text-zinc-200'}`}
        >
          <FileText size={14} />
          Structured Data ({Object.keys(result.data || {}).length})
        </button>
        <button 
          onClick={() => setActiveSegment('links')}
          className={`px-4 py-2 text-xs font-medium font-sans border-b-2 text-zinc-300 transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${activeSegment === 'links' ? 'border-[#D97756] text-white bg-[#1C1816]/50' : 'border-transparent text-zinc-400 hover:text-zinc-200'}`}
        >
          <LinkIcon size={14} />
          Outgoing Links ({links.length})
        </button>
        <button 
          onClick={() => setActiveSegment('images')}
          className={`px-4 py-2 text-xs font-medium font-sans border-b-2 text-zinc-300 transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${activeSegment === 'images' ? 'border-[#D97756] text-white bg-[#1C1816]/50' : 'border-transparent text-zinc-400 hover:text-zinc-200'}`}
        >
          <ImageIcon size={14} />
          Extracted Images ({images.length})
        </button>
        <button 
          onClick={() => setActiveSegment('videos')}
          className={`px-4 py-2 text-xs font-medium font-sans border-b-2 text-zinc-300 transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${activeSegment === 'videos' ? 'border-[#D97756] text-white bg-[#1C1816]/50' : 'border-transparent text-zinc-400 hover:text-zinc-200'}`}
        >
          <Play size={14} className="text-orange-400" />
          Extracted Videos ({videos.length})
        </button>
        {result.tables && result.tables.length > 0 && (
          <button 
            onClick={() => setActiveSegment('tables')}
            className={`px-4 py-2 text-xs font-medium font-sans border-b-2 text-zinc-300 transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${activeSegment === 'tables' ? 'border-[#D97756] text-white bg-[#1C1816]/50' : 'border-transparent text-zinc-400 hover:text-zinc-200'}`}
          >
            <TableIcon size={14} />
            Tables ({result.tables.length})
          </button>
        )}
        <button 
          onClick={() => setActiveSegment('rawtext')}
          className={`px-4 py-2 text-xs font-medium font-sans border-b-2 text-zinc-300 transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${activeSegment === 'rawtext' ? 'border-[#D97756] text-white bg-[#1C1816]/50' : 'border-transparent text-zinc-400 hover:text-zinc-200'}`}
        >
          <FileText size={14} />
          Markdown Page
        </button>
      </div>

      {/* Main Panel Content Area */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        <AnimatePresence mode="wait">
          
          {/* OverView / Key Value Data Tree */}
          {activeSegment === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="space-y-3"
            >
              {Object.keys(result.data).length === 0 ? (
                <div className="py-12 text-center text-zinc-500 text-sm font-sans">
                  No key-value elements could be scraped. Use custom CSS selectors for granular extraction.
                </div>
              ) : (
                Object.entries(result.data).map(([key, value]) => {
                  const isExpanded = !!dataKeysExpanded[key];
                  const hasChildren = Array.isArray(value) && value.length > 0;
                  const displayLabel = key.toUpperCase();

                  return (
                    <div key={key} className="border border-[#2D241E]/60 bg-[#1C1816]/40 rounded-lg overflow-hidden">
                      <button
                        onClick={() => toggleKey(key)}
                        className="w-full flex items-center justify-between p-3 py-2 bg-[#1C1816]/70 text-left cursor-pointer hover:bg-[#D97756]/5 transition-colors font-mono text-xs font-semibold text-zinc-300"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-[#D97756]">🔑</span>
                          <span>{displayLabel}</span>
                          <span className="text-[10px] text-zinc-500 px-1.5 py-0.2 bg-[#2D241E] rounded font-normal">
                            {Array.isArray(value) ? `${value.length} items` : '1 item'}
                          </span>
                        </div>
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </button>

                      {isExpanded && (
                        <div className="p-3 bg-[#110E0D] border-t border-[#2D241E]/30 text-sm overflow-x-auto text-zinc-300 font-sans leading-relaxed">
                          {!hasChildren ? (
                            <div className="whitespace-pre-wrap selection:bg-[#D97756]/30 py-1 text-xs sm:text-sm">
                              {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                            </div>
                          ) : (
                            <ul className="space-y-2 divider-y divider-[#2D241E]/20 text-xs sm:text-sm">
                              {(value as any[]).map((item, index) => (
                                <li key={index} className="flex gap-2 items-start py-1.5 border-b border-[#2D241E]/10 last:border-0">
                                  {typeof item === 'object' ? (
                                    <pre className="text-zinc-400 font-mono text-[11px] whitespace-pre-wrap overflow-x-auto bg-[#1C1816]/30 p-2 rounded border border-[#2D241E]/20 w-full">
                                      {JSON.stringify(item, null, 2)}
                                    </pre>
                                  ) : (
                                    <>
                                      <span className="font-mono text-xs text-[#D97756] mt-0.5 select-none font-bold">
                                        {(index + 1).toString().padStart(2, '0')}.
                                      </span>
                                      <span className="selection:bg-[#D97756]/30">{item}</span>
                                    </>
                                  )}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </motion.div>
          )}

          {/* Outgoing Links */}
          {activeSegment === 'links' && (
            <motion.div
              key="links"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="space-y-4"
            >
              {links.length === 0 ? (
                <div className="py-12 text-center text-zinc-500 text-sm">
                  No hyperlinks discovered on the page.
                </div>
              ) : (
                <>
                  <div className="space-y-1.5">
                    {currentLinks.map((href, index) => {
                      const absoluteIndex = (linksPage - 1) * linksPerPage + index + 1;
                      return (
                        <div 
                          key={href + index} 
                          className="flex items-center justify-between p-2.5 bg-[#1C1816]/40 hover:bg-[#D97756]/5 rounded border border-[#2D241E]/30 transition-all text-xs font-mono select-none"
                        >
                          <div className="flex items-center gap-2 overflow-hidden mr-4">
                            <span className="text-[#D97756] font-bold min-w-5">{absoluteIndex}.</span>
                            <span className="truncate text-zinc-300 hover:text-white transition-colors" title={href}>
                              {href}
                            </span>
                          </div>
                          <a 
                            href={href} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="p-1 px-1.5 rounded bg-[#2D241E] text-zinc-400 hover:text-[#D97756] hover:bg-[#D97756]/10 transition-colors flex-shrink-0"
                          >
                            <ExternalLink size={12} />
                          </a>
                        </div>
                      );
                    })}
                  </div>

                  {/* Links Pagination Controls */}
                  {totalLinkPages > 1 && (
                    <div className="flex items-center justify-between pt-3 border-t border-[#2D241E]/40 text-xs font-mono">
                      <span className="text-zinc-500">
                        Showing {((linksPage - 1) * linksPerPage) + 1} - {Math.min(linksPage * linksPerPage, links.length)} of {links.length} links
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button 
                          onClick={() => setLinksPage(1)} 
                          disabled={linksPage === 1}
                          className="p-1.5 rounded bg-[#1C1816] border border-[#2D241E] text-zinc-400 hover:text-[#D97756] disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                        >
                          <ChevronsLeft size={13} />
                        </button>
                        <button 
                          onClick={() => setLinksPage(prev => Math.max(1, prev - 1))} 
                          disabled={linksPage === 1}
                          className="p-1.5 px-2 rounded bg-[#1C1816] border border-[#2D241E] text-zinc-400 hover:text-[#D97756] disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                        >
                          Prev
                        </button>
                        <span className="px-2.5 text-zinc-300 bg-[#1C1816] py-1 rounded border border-[#2D241E]/50">
                          {linksPage} / {totalLinkPages}
                        </span>
                        <button 
                          onClick={() => setLinksPage(prev => Math.min(totalLinkPages, prev + 1))} 
                          disabled={linksPage === totalLinkPages}
                          className="p-1.5 px-2 rounded bg-[#1C1816] border border-[#2D241E] text-zinc-400 hover:text-[#D97756] disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                        >
                          Next
                        </button>
                        <button 
                          onClick={() => setLinksPage(totalLinkPages)} 
                          disabled={linksPage === totalLinkPages}
                          className="p-1.5 rounded bg-[#1C1816] border border-[#2D241E] text-zinc-400 hover:text-[#D97756] disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                        >
                          <ChevronsRight size={13} />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}

          {/* Extracted Images */}
          {activeSegment === 'images' && (
            <motion.div
              key="images"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="space-y-4"
            >
              {images.length === 0 ? (
                <div className="py-12 text-center text-zinc-500 text-sm">
                  No images discovered on the page.
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {currentImages.map((src, idx) => (
                      <div 
                        key={src + idx} 
                        className="bg-[#1C1816]/70 border border-[#2D241E]/50 rounded-lg overflow-hidden group relative aspect-square flex flex-col items-center justify-between"
                      >
                        <div 
                          className="flex-1 w-full flex items-center justify-center p-2 bg-stone-900 overflow-hidden relative cursor-zoom-in"
                          onClick={() => {
                            if (typeof (window as any).openImageLightbox === 'function') {
                              (window as any).openImageLightbox(src, `Scraped from: ${result.title || result.url}`);
                            } else {
                              window.open(src, '_blank');
                            }
                          }}
                        >
                          <img 
                            src={src} 
                            alt={`Scraped asset ${idx}`}
                            className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              // Replace with a standard placeholder SVG visual on image load failure due to hotlinking restrictions
                              (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="%234d3d33" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>';
                            }}
                          />
                        </div>
                        <div className="w-full p-1.5 px-2 bg-[#1C1816] text-[10px] font-mono flex items-center justify-between border-t border-[#2D241E]/30 gap-2">
                          <span className="truncate flex-1 select-all hover:text-[#D97756]" title={src}>{src}</span>
                          <a 
                            href={src} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-[#D97756] hover:text-[#e0896b] flex-shrink-0"
                          >
                            <ExternalLink size={10} />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Images Pagination Controls */}
                  {totalImagePages > 1 && (
                    <div className="flex items-center justify-between pt-3 border-t border-[#2D241E]/40 text-xs font-mono">
                      <span className="text-zinc-500">
                        Showing {((imagesPage - 1) * imagesPerPage) + 1} - {Math.min(imagesPage * imagesPerPage, images.length)} of {images.length} images
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button 
                          onClick={() => setImagesPage(1)} 
                          disabled={imagesPage === 1}
                          className="p-1.5 rounded bg-[#1C1816] border border-[#2D241E] text-zinc-400 hover:text-[#D97756] disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                        >
                          <ChevronsLeft size={13} />
                        </button>
                        <button 
                          onClick={() => setImagesPage(prev => Math.max(1, prev - 1))} 
                          disabled={imagesPage === 1}
                          className="p-1.5 px-2 rounded bg-[#1C1816] border border-[#2D241E] text-zinc-400 hover:text-[#D97756] disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                        >
                          Prev
                        </button>
                        <span className="px-2.5 text-zinc-300 bg-[#1C1816] py-1 rounded border border-[#2D241E]/50">
                          {imagesPage} / {totalImagePages}
                        </span>
                        <button 
                          onClick={() => setImagesPage(prev => Math.min(totalImagePages, prev + 1))} 
                          disabled={imagesPage === totalImagePages}
                          className="p-1.5 px-2 rounded bg-[#1C1816] border border-[#2D241E] text-zinc-400 hover:text-[#D97756] disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                        >
                          Next
                        </button>
                        <button 
                          onClick={() => setImagesPage(totalImagePages)} 
                          disabled={imagesPage === totalImagePages}
                          className="p-1.5 rounded bg-[#1C1816] border border-[#2D241E] text-zinc-400 hover:text-[#D97756] disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                        >
                          <ChevronsRight size={13} />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}

          {/* Discovered HTML Tables */}
          {activeSegment === 'tables' && result.tables && result.tables.length > 0 && (
            <motion.div
              key="tables"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="space-y-6"
            >
              {result.tables.map((tableGrid, tableIdx) => {
                const headers = tableGrid[0] || [];
                const rows = tableGrid.slice(1);

                return (
                  <div key={tableIdx} className="border border-[#2D241E]/60 bg-[#1C1816]/20 rounded-xl overflow-hidden p-4">
                    <h4 className="text-xs font-mono font-bold text-zinc-400 mb-2.5 flex items-center gap-1.5 select-none">
                      <TableIcon size={13} className="text-[#D97756]" />
                      DISCOVERED TABLE #{tableIdx + 1} ({headers.length} Columns)
                    </h4>
                    
                    <InteractiveTableVisualizer>
                      <table>
                        <thead>
                          <tr>
                            {headers.map((h, i) => (
                              <th key={i}>{h || `-Col ${i + 1}-`}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((row, rIdx) => (
                            <tr key={rIdx}>
                              {row.map((cell, cIdx) => (
                                <td key={cIdx}>{cell}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </InteractiveTableVisualizer>
                  </div>
                );
              })}
            </motion.div>
          )}

          {/* Raw Markdown Output Page */}
          {activeSegment === 'rawtext' && (
            <motion.div
              key="rawtext"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="relative rounded-lg overflow-hidden border border-[#2D241E]/60 h-full flex flex-col"
            >
              <div className="absolute right-3 top-3 z-10">
                <button
                  onClick={handleCopyText}
                  className="p-1.5 px-3 bg-[#1C1816] hover:bg-[#D97756]/15 hover:text-[#D97756] border border-[#2D241E] text-zinc-300 hover:border-[#D97756]/40 rounded-md transition-all text-xs font-mono flex items-center gap-1.5 cursor-pointer"
                >
                  {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              <textarea
                readOnly
                className="w-full min-h-[480px] p-4 pt-12 bg-[#0C0A09] text-zinc-300 font-mono text-xs selection:bg-[#D97756]/30 leading-relaxed border-0 outline-none resize-none focus:ring-0 custom-scrollbar-textarea select-text"
                value={result.rawText || '# No readable text found.\n\nThis page may be empty or contain only Javascript, which did not load dynamically.'}
              />
            </motion.div>
          )}

          {/* Extracted Videos Segment */}
          {activeSegment === 'videos' && (
            <motion.div
              key="videos"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="space-y-4"
            >
              {videos.length === 0 ? (
                <div className="py-12 text-center text-zinc-500 text-sm">
                  <Film size={26} className="mx-auto text-zinc-650 mb-2.5 animate-pulse" />
                  <p>No video anchors, iframes, or HTML5 sources discovered on this page.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {videos.map((vid, idx) => (
                    <div 
                      key={vid.url + idx}
                      className="bg-[#1C1816]/70 border border-[#2D241E]/50 rounded-xl overflow-hidden p-3.5 flex flex-col justify-between hover:border-[#D97756]/20 col-span-1 transition-all group relative"
                    >
                      {/* Video Media Simulated Thumbnail / Action container */}
                      <div className="aspect-video bg-[#0C0A09] rounded-lg flex flex-col items-center justify-center relative overflow-hidden ring-1 ring-white/5 mb-3 select-none">
                        {/* Play overlay hover indicator */}
                        <div className="absolute inset-0 bg-[#D97756]/0 group-hover:bg-[#D97756]/10 transition-colors duration-300 z-10" />
                        
                        {/* Type indicator badge */}
                        <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded bg-black/60 font-mono text-[9px] uppercase tracking-wider text-orange-400 font-bold z-20">
                          {vid.type}
                        </div>
                        
                        <button 
                          onClick={() => {
                            if (typeof (window as any).playVideoInLuminaPopup === 'function') {
                              (window as any).playVideoInLuminaPopup(vid.url, vid.title);
                            } else {
                              window.open(vid.url, '_blank');
                            }
                          }}
                          className="w-12 h-12 rounded-full bg-orange-500 hover:bg-orange-600 text-white flex items-center justify-center shadow-lg transform transition-transform group-hover:scale-110 z-20 cursor-pointer active:scale-95 border-0 focus:outline-none"
                          title="Play video in Lumina Popup Player"
                        >
                          <Play size={20} fill="currentColor" className="ml-0.5" />
                        </button>
                        
                        <div className="absolute bottom-2 px-3 text-center text-[10px] text-zinc-500 font-mono truncate max-w-full select-all" title={vid.url}>
                          {vid.url}
                        </div>
                      </div>

                      {/* Header details & meta */}
                      <div className="flex-1">
                        <h4 className="font-semibold text-zinc-200 text-sm line-clamp-2 leading-relaxed" title={vid.title}>
                          {vid.title || 'Untitled Web Video'}
                        </h4>
                        <div className="flex items-center justify-between text-[11px] text-zinc-500 font-mono mt-2.5 pt-2 border-t border-[#2D241E]/30 select-all">
                          <span className="truncate max-w-[80%]">{vid.url}</span>
                          <a 
                            href={vid.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-[#D97756] hover:text-[#e0896b] hover:underline flex items-center gap-0.5 shrink-0 ml-2"
                          >
                            <span>Open</span>
                            <ExternalLink size={10} />
                          </a>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
};
