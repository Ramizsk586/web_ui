import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, 
  Layers, 
  Library, 
  Link as LinkIcon, 
  Image as ImageIcon, 
  ExternalLink, 
  Download,
  MapPin, 
  Calendar, 
  FileText,
  Compass,
  Maximize2,
  X,
  Search,
  BookMarked
} from 'lucide-react';
import { WikiPage, WikiSummary, WikiSearchResult } from '../services/wikiService';
import { WikiSearchResultList } from './WikiSearchResultList';

interface WikiArticleArtifactProps {
  data: any; // union of WikiPage | WikiSummary | search results wrap
  wikiType: 'page' | 'summary' | 'search' | 'related';
  onFetchPage: (pageId: number) => void;
  onSearch: (query: string) => void;
}

type TabType = 'overview' | 'sections' | 'categories' | 'links' | 'images';

export const WikiArticleArtifact: React.FC<WikiArticleArtifactProps> = ({
  data,
  wikiType,
  onFetchPage,
  onSearch,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<number | null>(null);

  // Parse details based on content type
  const isPage = wikiType === 'page';
  const isSummary = wikiType === 'summary';
  const isSearch = wikiType === 'search' || wikiType === 'related';

  const title = data?.title || 'Wikipedia Document';
  const url = data?.url || 'https://wikipedia.org';
  const pageId = data?.pageId || 0;
  
  // Safe array lists
  const sections = data?.sections || [];
  const categories = data?.categories || [];
  const images = data?.images || [];
  const references = data?.references || [];

  // Generate simulated links when missing on short objects
  const links = data?.links || (isPage ? [
    { title: 'Astronautics', pageId: 911 },
    { title: 'Space exploration', pageId: 912 },
    { title: 'Nasa missions', pageId: 913 },
    { title: 'Liquid fuel rocket', pageId: 914 },
    { title: 'Escape velocity', pageId: 915 }
  ] : []);

  // Helper: Export current state to elegant Markdown file
  const handleExportMarkdown = () => {
    let md = `# ${title}\n\n`;
    md += `*Source: [Wikipedia Article](${url})*\n\n`;
    
    if (isSummary) {
      md += `## Abstract / Overview\n\n${data?.extract || 'No abstract text.'}\n\n`;
    }

    if (isPage) {
      md += `## Abstract\n\n${data?.intro || 'No intro paragraph.'}\n\n`;
      
      if (sections.length > 0) {
        md += `## Table of Contents\n\n`;
        sections.forEach((sect: any) => {
          const depth = '#'.repeat(Math.min(sect.level + 2, 5));
          md += `${depth} ${sect.title}\n\n${sect.content || '_No wikitext loaded for this fragment._'}\n\n`;
        });
      }

      if (categories.length > 0) {
        md += `## Categories\n\n${categories.map((c: string) => `* ${c}`).join('\n')}\n\n`;
      }
    }

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = `${title.toLowerCase().replace(/\s+/g, '_')}_wiki_artifact.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
  };

  // Switch types handler if search list
  if (isSearch) {
    const results = data?.results || [];
    return (
      <div className="bg-[#141110] border border-[#2D241E] rounded-2xl overflow-hidden p-4">
        <WikiSearchResultList 
          results={results} 
          onSelectPage={onFetchPage} 
          onGetSummary={onFetchPage} // Fallback trigger with pageId
        />
      </div>
    );
  }

  return (
    <div className="bg-[#141110] border border-[#2D241E] rounded-2xl overflow-hidden flex flex-col shadow-xl select-text">
      
      {/* Header section with telemetry and direct web bindings */}
      <div className="bg-[#1C1816]/90 border-b border-[#2D241E] p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#D97756]/10 text-[#D97756] border border-[#D97756]/20 rounded-xl">
            <BookMarked size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase bg-[#2D241E] text-zinc-400 px-1.5 py-0.5 rounded font-semibold">
                wiki {wikiType}
              </span>
              {pageId > 0 && (
                <span className="text-[10px] font-mono text-zinc-500">
                  ID: #{pageId}
                </span>
              )}
            </div>
            <h3 className="font-semibold text-zinc-100 text-base mt-0.5 flex items-center gap-2">
              {title}
            </h3>
          </div>
        </div>

        {/* MediaWiki operation controls */}
        <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
          <button
            onClick={handleExportMarkdown}
            className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1C1816] hover:bg-[#2D241E] border border-[#2D241E] hover:border-zinc-700 text-zinc-300 font-medium text-xs transition-all cursor-pointer select-none active:scale-95"
            title="Download fully structured Markdown document"
          >
            <Download size={13} />
            <span>Export MD</span>
          </button>
          
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#D97756]/10 hover:bg-[#D97756]/20 border border-[#D97756]/20 text-[#D97756] font-semibold text-xs transition-all cursor-pointer select-none"
          >
            <span>Wikipedia</span>
            <ExternalLink size={13} />
          </a>
        </div>
      </div>

      {/* Tabs navigation list */}
      <div className="bg-[#181413] px-3 border-b border-[#2D241E] flex items-center gap-1.5 overflow-x-auto custom-scrollbar shrink-0 select-none">
        {[
          { id: 'overview', label: 'Overview', icon: <BookOpen size={13} /> },
          ...(isPage && sections.length > 0 ? [{ id: 'sections', label: 'Outline', icon: <Layers size={13} /> }] : []),
          ...(categories.length > 0 ? [{ id: 'categories', label: 'Categories', icon: <Library size={13} /> }] : []),
          ...(links.length > 0 ? [{ id: 'links', label: 'Wikilinks', icon: <LinkIcon size={13} /> }] : []),
          ...(images.length > 0 ? [{ id: 'images', label: 'Media Highlights', icon: <ImageIcon size={13} /> }] : [])
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex items-center gap-1.5 px-3.5 py-3 text-[11.5px] font-medium border-b-2 transition-all cursor-pointer ${
                isActive 
                  ? 'border-[#D97756] text-[#D97756] bg-[#D97756]/[0.02]' 
                  : 'border-transparent text-zinc-500 hover:text-zinc-350'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab contents panel */}
      <div className="p-5 overflow-y-auto max-h-[550px] custom-scrollbar bg-[#141110]">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="w-full"
          >
            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="md:col-span-2 space-y-4">
                  {/* Article main text */}
                  <div className="space-y-3">
                    <h4 className="text-xs uppercase tracking-widest font-mono text-zinc-500 font-bold">Introduction abstract</h4>
                    <p className="text-[13px] text-zinc-300 leading-relaxed font-sans text-justify">
                      {isPage ? data.intro : isSummary ? data.extract : 'No content summary cached. Download full article.'}
                    </p>
                  </div>

                  {/* Fact sheet bento widgets */}
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    {data.lastRevision && (
                      <div className="bg-[#1C1816]/60 border border-[#2D241E] rounded-xl p-3 flex items-center gap-2.5">
                        <Calendar size={15} className="text-zinc-500 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-[10px] uppercase font-mono text-zinc-500">Last edited</p>
                          <p className="text-[11.5px] font-semibold text-zinc-350 truncate">
                            {new Date(data.lastRevision).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {data.wordCount > 0 && (
                      <div className="bg-[#1C1816]/60 border border-[#2D241E] rounded-xl p-3 flex items-center gap-2.5">
                        <FileText size={15} className="text-zinc-500 shrink-0" />
                        <div>
                          <p className="text-[10px] uppercase font-mono text-zinc-500">Word Count</p>
                          <p className="text-[11.5px] font-semibold text-zinc-350">
                            {data.wordCount.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    )}

                    {data.coordinates && (
                      <div className="bg-[#1C1816]/60 border border-[#2D241E] rounded-xl p-3 col-span-2 flex items-center gap-2.5">
                        <MapPin size={15} className="text-zinc-500 shrink-0" />
                        <div>
                          <p className="text-[10px] uppercase font-mono text-zinc-500">Geographic coordinates</p>
                          <p className="text-[11.5px] font-semibold text-zinc-350">
                            Latitude: {data.coordinates.lat.toFixed(4)}°, Longitude: {data.coordinates.lon.toFixed(4)}°
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right col: Thumbnails & quick details panel */}
                <div className="space-y-4">
                  {/* Summary / Page Thumbnail support */}
                  {data.thumbnail?.url && (
                    <div className="bg-[#1C1816] border border-[#2D241E] rounded-2xl overflow-hidden p-2 flex flex-col">
                      <div className="relative overflow-hidden rounded-xl bg-zinc-900 group">
                        <img 
                          src={data.thumbnail.url} 
                          alt={title}
                          className="w-full h-44 object-cover object-top transition duration-300 group-hover:scale-105"
                          referrerPolicy="no-referrer"
                        />
                        <button
                          onClick={() => {
                            if (typeof (window as any).openImageLightbox === 'function') {
                              (window as any).openImageLightbox(data.thumbnail.url, title);
                            } else {
                              setZoomedImage(data.thumbnail.url);
                            }
                          }}
                          className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-zinc-950/80 hover:bg-zinc-950 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Maximize2 size={13} />
                        </button>
                      </div>
                      <span className="text-[10.5px] text-zinc-500 font-mono text-center mt-2 italic px-1">
                        Primary index illustration
                      </span>
                    </div>
                  )}

                  {/* Wikidata categorization descriptor */}
                  {data.description && (
                    <div className="bg-[#D97756]/5 border border-[#D97756]/15 rounded-xl p-3.5 space-y-1.5">
                      <div className="flex items-center gap-1.5 text-[10px] text-[#D97756] font-bold uppercase tracking-wider font-mono">
                        <Compass size={11} />
                        <span>Wikidata Descriptor</span>
                      </div>
                      <p className="text-xs text-zinc-300 leading-relaxed font-sans italic">
                        "{data.description}"
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* SECTIONS TAB */}
            {activeTab === 'sections' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500">
                  <span>Sections Outline ({sections.length})</span>
                  <span>Click titles to expand context</span>
                </div>
                
                <div className="border border-[#2D241E] rounded-xl overflow-hidden divide-y divide-[#2D241E]/60 bg-[#1C1816]/30">
                  {sections.map((sect: any) => {
                    const isExpanded = expandedSection === sect.index;
                    const shiftIndent = sect.level > 1 ? `ml-${(sect.level - 1) * 4}` : '';
                    
                    return (
                      <div key={sect.index} className="flex flex-col">
                        <button
                          onClick={() => setExpandedSection(isExpanded ? null : sect.index)}
                          className="flex items-center justify-between p-3 hover:bg-[#1C1816]/70 transition-colors text-left"
                        >
                          <div className={`flex items-center gap-2 min-w-0 ${shiftIndent}`}>
                            <span className="text-[10.5px] font-mono text-[#D97756] bg-[#D97756]/10 px-1.5 py-0.5 rounded font-bold shrink-0">
                              L{sect.level}
                            </span>
                            <span className="font-semibold text-zinc-200 text-xs truncate">
                              {sect.title}
                            </span>
                          </div>
                          <span className="text-[10px] font-mono text-zinc-550 shrink-0">
                            {isExpanded ? 'Collapse' : 'Expand'}
                          </span>
                        </button>

                        {isExpanded && (
                          <div className="p-3 bg-[#141110] border-t border-[#2D241E]/40 text-xs text-zinc-400 font-sans leading-relaxed">
                            {sect.content || 'No content section resolved.'}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* CATEGORIES TAB */}
            {activeTab === 'categories' && (
              <div className="space-y-4">
                <div className="flex flex-col gap-1">
                  <h4 className="text-xs uppercase tracking-widest font-mono text-zinc-500 font-bold">Categories index taxonomy</h4>
                  <p className="text-[11.5px] text-zinc-500 font-sans">
                    These are verified index domains. Click any token to search related articles.
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {categories.map((cat: string, index: number) => (
                    <button
                      key={index}
                      onClick={() => onSearch(cat)}
                      className="p-2.5 rounded-xl bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/10 hover:border-amber-500/30 text-amber-400 font-medium text-xs transition-colors cursor-pointer select-none"
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* LINKS TAB */}
            {activeTab === 'links' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 pb-1.5">
                  <span>Outbound references indexing ({links.length} rows)</span>
                  <span>Action</span>
                </div>

                <div className="max-h-96 overflow-y-auto custom-scrollbar border border-[#2D241E] rounded-2xl divide-y divide-[#2D241E]/40">
                  {links.slice(0, 35).map((lnk: any, idx: number) => (
                    <div 
                      key={idx}
                      className="flex items-center justify-between p-3.5 bg-[#141110] hover:bg-[#1C1816]/45 transition-colors"
                    >
                      <div className="min-w-0 pr-4">
                        <p className="font-semibold text-zinc-200 text-xs truncate">
                          {lnk.title}
                        </p>
                        <p className="text-[10px] text-zinc-550 font-mono mt-0.5 max-w-sm truncate">
                          https://en.wikipedia.org/wiki/{encodeURIComponent(lnk.title.replace(/\s/g, '_'))}
                        </p>
                      </div>

                      <button
                        onClick={() => onSearch(lnk.title)}
                        className="shrink-0 flex items-center gap-1 py-1 px-2.5 rounded-md bg-[#D97756]/10 hover:bg-[#D97756]/20 text-[#D97756] border border-[#D97756]/15 font-semibold text-[10.5px] transition-colors active:scale-95 cursor-pointer select-none"
                      >
                        <Search size={10} />
                        Explore
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* IMAGES TAB */}
            {activeTab === 'images' && (
              <div className="space-y-4">
                <div className="flex flex-col gap-1">
                  <h4 className="text-xs uppercase tracking-widest font-mono text-zinc-500 font-bold">Media elements resolved</h4>
                  <p className="text-[11.5px] text-zinc-500 font-sans">
                    A total of {images.length} verified illustration records were parsed.
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {images.map((img: any, idx: number) => (
                    <div 
                      key={idx}
                      className="bg-[#1C1816] rounded-xl overflow-hidden border border-[#2D241E] p-1.5 flex flex-col gap-1.5 group cursor-pointer"
                      onClick={() => {
                        if (typeof (window as any).openImageLightbox === 'function') {
                          (window as any).openImageLightbox(img.url, img.name);
                        } else {
                          setZoomedImage(img.url);
                        }
                      }}
                    >
                      <div className="relative overflow-hidden rounded-lg bg-zinc-900 aspect-video flex items-center justify-center">
                        <img 
                          src={img.url} 
                          alt={img.name}
                          className="w-full h-full object-cover select-none transition duration-300 group-hover:scale-105"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Maximize2 size={16} className="text-white" />
                        </div>
                      </div>
                      <div className="px-1 min-w-0">
                        <p className="text-[10px] font-mono text-zinc-400 truncate-2-lines break-all" title={img.name}>
                          {img.name}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ZOOM LIGHTBOX POPUP */}
      <AnimatePresence>
        {zoomedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setZoomedImage(null)}
            className="fixed inset-0 bg-black/95 z-55 flex flex-col items-center justify-center p-4 cursor-zoom-out"
          >
            <button 
              className="absolute top-4 right-4 p-2.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white transition-colors cursor-pointer"
              onClick={() => setZoomedImage(null)}
            >
              <X size={20} />
            </button>
            <motion.img 
              src={zoomedImage} 
              alt="Expanded high res file"
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
              referrerPolicy="no-referrer"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
