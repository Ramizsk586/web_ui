import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Layout, FileText, PenTool, Terminal, Download, ChevronDown, X } from 'lucide-react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Artifact } from '../../types';
import { getCombinedSrcDoc } from '../../utils/artifactUtils';

interface CanvasProps {
  artifact: Artifact | null; 
  isOpen: boolean; 
  onClose: () => void;
  view: 'code' | 'preview';
  onSetView: (v: 'code' | 'preview') => void;
  allArtifacts?: Artifact[];
}

export const Canvas = ({ 
  artifact, 
  isOpen, 
  onClose, 
  view, 
  onSetView,
  allArtifacts = []
}: CanvasProps) => {
  const [isDownloadDropdownOpen, setIsDownloadDropdownOpen] = useState(false);

  if (!artifact) return null;

  const handleDownload = (format: 'txt' | 'md' | 'html' | 'print') => {
    setIsDownloadDropdownOpen(false);

    if (format === 'print') {
      const printWindow = window.open('', '_blank');
      if (!printWindow) return;
      
      const isPoem = artifact.type === 'poem';
      const cleanTitle = artifact.title.replace(/"/g, '&quot;');
      const htmlContent = isPoem ? `
        <div style="text-align: center; max-width: 600px; margin: 40px auto; padding: 20px; font-family: Georgia, serif;">
          <div style="color: #f59e0b; font-size: 1.5rem; margin-bottom: 20px;">✦ ❁ ✦</div>
          <h1 style="font-size: 2.2rem; margin-bottom: 8px; color: #111827;">${cleanTitle}</h1>
          <div style="font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.15em; color: #9ca3af; margin-bottom: 40px; font-family: sans-serif; font-weight: 600;">By Lumina AI • Verse</div>
          <div style="font-size: 1.25rem; line-height: 2; color: #374151; white-space: pre-wrap; font-style: italic;">${artifact.content}</div>
          <div style="color: #f59e0b; font-size: 1.5rem; margin-top: 40px;">❦</div>
        </div>
      ` : `
        <div style="max-width: 800px; margin: 40px auto; padding: 40px; font-family: -apple-system, system-ui, sans-serif; line-height: 1.6; color: #1f2937;">
          <div style="font-size: 0.65rem; font-weight: 800; color: #2563eb; text-transform: uppercase; letter-spacing: 0.2em; margin-bottom: 4px;">Lumina Intel Report</div>
          <h1 style="font-size: 2.5rem; font-weight: 800; color: #111827; margin-top: 0; margin-bottom: 20px; line-height: 1.15;">${cleanTitle}</h1>
          <div style="display: flex; justify-content: space-between; border-bottom: 2px solid #e5e7eb; padding-bottom: 24px; margin-bottom: 40px; font-size: 0.8rem; color: #6b7280;">
            <div><strong>Date:</strong> ${new Date().toLocaleDateString()}</div>
            <div><strong>Author:</strong> Lumina Professional Engine</div>
            <div><strong>Doc ID:</strong> LUM-${(Math.random() * 100000).toFixed(0)}</div>
          </div>
          <div style="font-size: 1rem; color: #1f2937;">
            ${artifact.content
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/^#{3}\s+(.+)$/gm, '<h3>$1</h3>')
              .replace(/^#{2}\s+(.+)$/gm, '<h2>$1</h2>')
              .replace(/^#{1}\s+(.+)$/gm, '<h1>$1</h1>')
              .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
              .replace(/^\>\s+(.+)$/gm, '<blockquote style="border-left: 4px solid #3b82f6; background-color: #eff6ff; padding: 12px 20px; margin: 1.5rem 0; border-radius: 0 8px 8px 0;">$1</blockquote>')
              .replace(/^\-\s+(.+)$/gm, '<li>$1</li>')
              .replace(/^\*\s+(.+)$/gm, '<li>$1</li>')
              .replace(/\`(.+?)\`/g, '<code style="font-family: monospace; background-color: #f3f4f6; padding: 2px 6px; border-radius: 4px;">$1</code>')
              .split('\n\n')
              .map(p => {
                const trimmed = p.trim();
                if (!trimmed) return '';
                if (trimmed.startsWith('<h') || trimmed.startsWith('<blockquote') || trimmed.startsWith('<li')) {
                  return trimmed;
                }
                if (trimmed.includes('<li>')) {
                  return '<ul>' + trimmed + '</ul>';
                }
                return '<p>' + trimmed.replace(/\n/g, '<br>') + '</p>';
              })
              .join('\n')
            }
          </div>
          <div style="margin-top: 60px; border-top: 1px solid #e5e7eb; padding-top: 24px; display: flex; justify-content: space-between; align-items: center; font-size: 0.75rem; color: #9ca3af;">
            <div>Lumina Professional Publication. All rights reserved.</div>
            <div style="text-align: center;">
              <div style="width: 160px; border-bottom: 1px solid #d1d5db; margin-bottom: 6px; height: 30px;"></div>
              <div>Authorized Representative</div>
            </div>
          </div>
        </div>
      `;

      printWindow.document.write(`
        <html>
          <head>
            <title>${cleanTitle}</title>
            <style>
              @media print {
                .no-print { display: none !important; }
              }
            </style>
          </head>
          <body style="margin: 0; padding: 0; background: white;">
            ${htmlContent}
            <script>
              setTimeout(() => {
                window.print();
                window.close();
              }, 500);
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
      return;
    }

    let fileContent = '';
    let fileExtension = '';
    let mimeType = '';

    if (format === 'txt') {
      fileExtension = 'txt';
      mimeType = 'text/plain;charset=utf-8';
      if (artifact.type === 'poem') {
        fileContent = `${artifact.title}\nBy Lumina AI\n\n${artifact.content}`;
      } else if (artifact.type === 'report') {
        fileContent = `${artifact.title}\nDate: ${new Date().toLocaleDateString()}\nAuthor: Lumina Professional Engine\n\n${artifact.content}`;
      } else {
        fileContent = artifact.content;
      }
    } else if (format === 'md') {
      fileExtension = 'md';
      mimeType = 'text/markdown;charset=utf-8';
      if (artifact.type === 'poem') {
        fileContent = `# ${artifact.title}\n*By Lumina AI*\n\n---\n\n${artifact.content}\n\n---\n*Generated using Lumina AI Canvas*`;
      } else {
        fileContent = `# ${artifact.title}\n\n**Date:** ${new Date().toLocaleDateString()}\n**Author:** Lumina Professional Engine\n\n---\n\n${artifact.content}`;
      }
    } else if (format === 'html') {
      fileExtension = 'html';
      mimeType = 'text/html;charset=utf-8';
      const isPoem = artifact.type === 'poem';
      const cleanTitle = artifact.title.replace(/"/g, '&quot;');
      fileContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${cleanTitle}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Playfair+Display:ital,wght@0,600;0,700;1,400&family=JetBrains+Mono&display=swap" rel="stylesheet">
  <style>
    body {
      background-color: ${isPoem ? '#f6f5f0' : '#fcfcfc'};
      color: #1f2937;
      font-family: 'Inter', -apple-system, sans-serif;
      margin: 0;
      padding: 40px 20px;
      display: flex;
      justify-content: center;
      min-height: 100vh;
      box-sizing: border-box;
    }
    .paper {
      background-color: #ffffff;
      border: 1px solid #e5e7eb;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05);
      width: 100%;
      max-width: 800px;
      padding: ${isPoem ? '60px 40px' : '80px 60px'};
      box-sizing: border-box;
      border-radius: ${isPoem ? '24px' : '12px'};
      position: relative;
    }
    ${isPoem ? `
    .paper {
      background-color: #fafcf9;
      border-color: #e2e8df;
      max-width: 600px;
      font-family: 'Playfair Display', Georgia, serif;
      text-align: center;
    }
    .paper::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 6px;
      background: linear-gradient(to right, #fbbf24, #f472b6, #f43f5e);
      border-radius: 24px 24px 0 0;
    }
    .poem-title {
      font-size: 2.2rem;
      font-weight: 700;
      color: #111827;
      margin-bottom: 8px;
    }
    .poem-meta {
      font-family: 'Inter', sans-serif;
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.15em;
      color: #9ca3af;
      margin-bottom: 40px;
      font-weight: 600;
    }
    .poem-divider {
      color: #f59e0b;
      font-size: 1.5rem;
      margin: 30px 0;
    }
    .content {
      font-size: 1.25rem;
      line-height: 2;
      color: #374151;
      white-space: pre-wrap;
      font-style: italic;
    }
    ` : `
    .report-logo {
      font-size: 0.65rem;
      font-weight: 800;
      color: #2563eb;
      text-transform: uppercase;
      letter-spacing: 0.2em;
      margin-bottom: 4px;
    }
    .report-title {
      font-size: 2.5rem;
      font-weight: 800;
      color: #111827;
      line-height: 1.15;
      margin-top: 0;
      margin-bottom: 20px;
    }
    .report-meta {
      display: flex;
      justify-content: space-between;
      border-bottom: 2px solid #e5e7eb;
      padding-bottom: 24px;
      margin-bottom: 40px;
      font-size: 0.8rem;
      color: #6b7280;
    }
    .report-meta-item strong {
      color: #374151;
    }
    .content {
      font-size: 1rem;
      line-height: 1.7;
      color: #1f2937;
    }
    .content p {
      margin-top: 0;
      margin-bottom: 1.5rem;
    }
    .content h2 {
      font-size: 1.4rem;
      font-weight: 700;
      color: #111827;
      margin-top: 2rem;
      margin-bottom: 1rem;
      border-bottom: 1px solid #f3f4f6;
      padding-bottom: 6px;
    }
    .content h3 {
      font-size: 1.15rem;
      font-weight: 600;
      color: #1f2937;
      margin-top: 1.5rem;
      margin-bottom: 0.75rem;
    }
    .content ul, .content ol {
      margin-top: 0;
      margin-bottom: 1.5rem;
      padding-left: 1.5rem;
    }
    .content li {
      margin-bottom: 0.5rem;
    }
    .content blockquote {
      border-left: 4px solid #3b82f6;
      background-color: #eff6ff;
      padding: 12px 20px;
      margin: 1.5rem 0;
      border-radius: 0 8px 8px 0;
    }
    .content strong {
      color: #111827;
    }
    .content code {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.85em;
      background-color: #f3f4f6;
      padding: 2px 6px;
      border-radius: 4px;
    }
    .report-footer {
      margin-top: 60px;
      border-top: 1px solid #e5e7eb;
      padding-top: 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.75rem;
      color: #9ca3af;
    }
    .signature-block {
      text-align: center;
    }
    .signature-line {
      width: 160px;
      border-bottom: 1px solid #d1d5db;
      margin-bottom: 6px;
      height: 30px;
    }
    `}
    
    @media print {
      body {
        background-color: #ffffff;
        padding: 0;
      }
      .paper {
        border: none;
        box-shadow: none;
        padding: 40px;
      }
      .no-print {
        display: none !important;
      }
    }
    
    .print-btn {
      position: fixed;
      bottom: 24px;
      right: 24px;
      background-color: #1f2937;
      color: #ffffff;
      border: none;
      border-radius: 50px;
      padding: 12px 24px;
      font-family: 'Inter', sans-serif;
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s;
    }
    .print-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      background-color: #111827;
    }
  </style>
</head>
<body>
  <div class="paper">
    ${isPoem ? `
      <div class="poem-divider">✦ ❁ ✦</div>
      <div class="poem-title">${cleanTitle}</div>
      <div class="poem-meta">By Lumina AI • Verse</div>
      <div class="content">${artifact.content}</div>
      <div class="poem-divider" style="margin-top: 40px;">❦</div>
    ` : `
      <div class="report-logo">Lumina Intel Report</div>
      <h1 class="report-title">${cleanTitle}</h1>
      <div class="report-meta">
        <div class="report-meta-item"><strong>Date:</strong> ${new Date().toLocaleDateString()}</div>
        <div class="report-meta-item"><strong>Author:</strong> Lumina Engine</div>
        <div class="report-meta-item"><strong>Doc ID:</strong> LUM-${(Math.random() * 100000).toFixed(0)}</div>
      </div>
      <div class="content">
        ${
          artifact.content
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/^#{3}\s+(.+)$/gm, '<h3>$1</h3>')
            .replace(/^#{2}\s+(.+)$/gm, '<h2>$1</h2>')
            .replace(/^#{1}\s+(.+)$/gm, '<h1 class="report-title" style="font-size: 2rem;">$1</h1>')
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/^\>\s+(.+)$/gm, '<blockquote>$1</blockquote>')
            .replace(/^\-\s+(.+)$/gm, '<li>$1</li>')
            .replace(/^\*\s+(.+)$/gm, '<li>$1</li>')
            .replace(/\`(.+?)\`/g, '<code>$1</code>')
            .split('\n\n')
            .map(p => {
              const trimmed = p.trim();
              if (!trimmed) return '';
              if (trimmed.startsWith('<h') || trimmed.startsWith('<blockquote') || trimmed.startsWith('<li')) {
                return trimmed;
              }
              if (trimmed.includes('<li>')) {
                return '<ul>' + trimmed + '</ul>';
              }
              return '<p>' + trimmed.replace(/\n/g, '<br>') + '</p>';
            })
            .join('\n')
        }
      </div>
      <div class="report-footer">
        <div>Lumina Professional Publication. All rights reserved.</div>
        <div class="signature-block">
          <div class="signature-line"></div>
          <div>Authorized Representative</div>
        </div>
      </div>
    `}
  </div>
  
  <button class="print-btn no-print" onclick="window.print()">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
    <span>Print Document</span>
  </button>
</body>
</html>`;
    }

    const blob = new Blob([fileContent], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${artifact.title.toLowerCase().replace(/[^a-z0-9]+/g, '_')}.${fileExtension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className="fixed inset-y-0 right-0 w-full lg:w-[45vw] bg-white dark:bg-[#0a0a0a] border-l border-zinc-100 dark:border-white/5 z-[200] flex flex-col shadow-2xl"
        >
          <div className="h-16 border-b border-zinc-100 dark:border-white/5 flex items-center justify-between px-6 shrink-0 bg-white/80 dark:bg-black/80 backdrop-blur-xl sticky top-0 z-10">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-zinc-100 dark:bg-white/5 rounded-lg text-zinc-500">
                  {artifact.type === 'html' ? <Layout size={18} /> : 
                   artifact.type === 'markdown' ? <FileText size={18} /> : 
                   artifact.type === 'poem' ? <PenTool size={18} className="text-amber-500" /> : 
                   artifact.type === 'report' ? <FileText size={18} className="text-blue-500" /> : 
                   <Terminal size={18} />}
                </div>
                <div className="text-left">
                  <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-100 uppercase tracking-tighter">
                    {artifact.title}
                  </h3>
                  <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-widest">{artifact.language}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {(artifact.type === 'html' || artifact.type === 'markdown' || artifact.type === 'poem' || artifact.type === 'report') && (
                <div className="flex items-center p-1 bg-zinc-100 dark:bg-white/5 rounded-xl border border-zinc-200/50 dark:border-white/5">
                  <button
                    type="button"
                    onClick={() => onSetView('code')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      view === 'code' ? 'bg-white dark:bg-zinc-800 text-black dark:text-white shadow-sm font-semibold' : 'text-zinc-500 font-normal'
                    }`}
                  >
                    Code
                  </button>
                  <button
                    type="button"
                    onClick={() => onSetView('preview')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      view === 'preview' ? 'bg-white dark:bg-zinc-800 text-black dark:text-white shadow-sm font-semibold' : 'text-zinc-500 font-normal'
                    }`}
                  >
                    Preview
                  </button>
                </div>
              )}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsDownloadDropdownOpen(!isDownloadDropdownOpen)}
                  className="px-2.5 py-1.5 bg-zinc-150 dark:bg-white/5 hover:bg-zinc-200 dark:hover:bg-white/10 rounded-xl text-zinc-700 dark:text-zinc-300 transition-all flex items-center gap-1 text-xs font-bold shadow-xs cursor-pointer"
                  title="Download / Export Options"
                >
                  <Download size={14} strokeWidth={2.5} />
                  <ChevronDown size={11} className={`transition-transform duration-200 ${isDownloadDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {isDownloadDropdownOpen && (
                    <>
                      <div 
                        className="fixed inset-0 z-40 bg-transparent" 
                        onClick={() => setIsDownloadDropdownOpen(false)} 
                      />
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        className="absolute right-0 mt-2 w-52 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-white/10 shadow-2xl py-2 z-50 flex flex-col"
                      >
                        <div className="px-3.5 py-1 text-[9px] font-extrabold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 select-none">
                          File Format Options
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDownload('txt')}
                          className="px-4 py-2 hover:bg-zinc-50 dark:hover:bg-white/5 text-left text-xs font-semibold text-zinc-700 dark:text-zinc-200 flex items-center gap-2 cursor-pointer border-none bg-transparent"
                        >
                          <span className="w-5 h-5 bg-zinc-100 dark:bg-white/10 rounded-md flex items-center justify-center text-[9px] font-bold text-zinc-500 shrink-0">TXT</span>
                          <span className="truncate">Plain Text (.txt)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownload('md')}
                          className="px-4 py-2 hover:bg-zinc-50 dark:hover:bg-white/5 text-left text-xs font-semibold text-zinc-700 dark:text-zinc-200 flex items-center gap-2 cursor-pointer border-none bg-transparent"
                        >
                          <span className="w-5 h-5 bg-blue-50 dark:bg-blue-950/40 rounded-md flex items-center justify-center text-[9px] font-bold text-blue-500 shrink-0">MD</span>
                          <span className="truncate">Markdown (.md)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownload('html')}
                          className="px-4 py-2 hover:bg-zinc-50 dark:hover:bg-white/5 text-left text-xs font-semibold text-zinc-700 dark:text-zinc-200 flex items-center gap-2 cursor-pointer border-none bg-transparent"
                        >
                          <span className="w-5 h-5 bg-emerald-50 dark:bg-emerald-950/40 rounded-md flex items-center justify-center text-[9px] font-bold text-emerald-500 shrink-0">HTML</span>
                          <span className="truncate">Offline Page (.html)</span>
                        </button>
                        <div className="w-full h-px bg-zinc-100 dark:bg-white/5 my-1" />
                        <button
                          type="button"
                          onClick={() => handleDownload('print')}
                          className="px-4 py-2 hover:bg-zinc-50 dark:hover:bg-white/5 text-left text-xs font-semibold text-zinc-700 dark:text-zinc-200 flex items-center gap-2 cursor-pointer border-none bg-transparent"
                        >
                          <div className="w-5 h-5 bg-amber-50 dark:bg-amber-950/40 rounded-md flex items-center justify-center text-amber-500 shrink-0">
                            <FileText size={10} />
                          </div>
                          <span className="font-bold text-amber-600 dark:text-amber-400 truncate">Save PDF / Print</span>
                        </button>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
              <div className="w-px h-4 bg-zinc-200 dark:bg-white/10 mx-1" />
              <button
                type="button"
                onClick={onClose}
                className="p-2 hover:bg-zinc-100 dark:hover:bg-white/5 rounded-xl text-zinc-500 transition-colors cursor-pointer border-none bg-transparent"
              >
                <X size={20} />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-hidden relative">
            <AnimatePresence mode="wait">
              {view === 'code' ? (
                <motion.div
                  key="code"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full overflow-y-auto custom-scrollbar bg-transparent text-left"
                >
                  <SyntaxHighlighter
                    language={artifact.language}
                    style={oneDark}
                    customStyle={{ 
                      background: 'transparent', 
                      backgroundColor: 'transparent',
                      fontSize: '14px', 
                      lineHeight: '1.7', 
                      margin: 0,
                      padding: '24px',
                      border: 'none',
                      boxShadow: 'none',
                      textDecoration: 'none'
                    }}
                    codeTagProps={{
                      style: {
                        background: 'transparent',
                        backgroundColor: 'transparent',
                        border: 'none',
                        textDecoration: 'none',
                        boxShadow: 'none'
                      }
                    }}
                    showLineNumbers
                    lineNumberStyle={{ 
                      color: '#3f3f46', 
                      minWidth: '3.5em',
                      background: 'transparent',
                      backgroundColor: 'transparent',
                      paddingRight: '1em',
                      textAlign: 'right',
                      userSelect: 'none',
                      borderRight: 'none',
                      textDecoration: 'none'
                    }}
                  >
                    {artifact.content}
                  </SyntaxHighlighter>
                </motion.div>
              ) : (
                <motion.div
                  key="preview"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full overflow-y-auto bg-[var(--theme-bg)] custom-scrollbar"
                >
                  {artifact.type === 'poem' ? (
                    <div className="flex flex-col min-h-full bg-[#030303] text-zinc-300 font-mono select-none">
                      <div className="flex items-center justify-between px-5 py-2.5 bg-[#0a0a0c] border-b border-zinc-900 text-xs text-zinc-400 shrink-0 select-none">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            <span className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
                            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
                            <span className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
                          </div>
                          <div className="w-px h-3.5 bg-zinc-800 mx-2" />
                          <div className="flex items-center gap-1.5 bg-[#121215] text-zinc-100 px-3 py-1.5 rounded-t-lg border-t border-x border-zinc-900 text-[10px] font-bold">
                            <PenTool size={12} className="text-amber-500 animate-pulse" />
                            <span>{artifact.title.toLowerCase().replace(/[^a-z0-9]+/g, '_') || 'verse'}.poetry</span>
                          </div>
                        </div>
                        <div className="text-[9px] uppercase tracking-widest text-zinc-500 font-extrabold flex items-center gap-2">
                          <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-ping" />
                          LUMINA VERSE ENGINE
                        </div>
                      </div>

                      <div className="flex-1 flex overflow-y-auto bg-[#030303] custom-scrollbar">
                        <div className="py-6 border-r border-zinc-900/60 flex flex-col items-end pr-4 text-[11px] text-zinc-700 font-mono select-none bg-[#030205] w-14 shrink-0">
                          {artifact.content.split('\n').map((_, idx) => (
                            <div key={idx} className="h-7 flex items-center justify-end font-medium">
                              {idx + 1}
                            </div>
                          ))}
                        </div>

                        <div className="flex-1 py-6 px-8 font-mono text-[13px] md:text-[14px] leading-relaxed text-zinc-100 select-text overflow-x-auto text-left">
                          <div className="text-zinc-600 select-none mb-6 font-mono italic">
                            <div>/**</div>
                            <div>&nbsp;* @file {artifact.title.toLowerCase().replace(/[^a-z0-9]+/g, '_') || 'verse'}.poetry</div>
                            <div>&nbsp;* @title {artifact.title}</div>
                            <div>&nbsp;* @author Lumina Core Synthesizer</div>
                            <div>&nbsp;* @synthesized {new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                            <div>&nbsp;*/</div>
                          </div>

                          <div className="space-y-0.5">
                            {artifact.content.split('\n').map((line, idx) => {
                              const isComment = line.trim().startsWith('//') || line.trim().startsWith('/*') || line.trim().startsWith('*');
                              const isEmpty = line.trim().length === 0;
                              return (
                                <div 
                                  key={idx} 
                                  className={`h-7 flex items-center px-2 -mx-2 hover:bg-zinc-900/40 rounded transition-colors group cursor-text ${
                                    isEmpty ? 'h-4' : ''
                                  }`}
                                >
                                  <span className={
                                    isComment ? 'text-zinc-500 italic' :
                                    isEmpty ? 'text-zinc-700' :
                                    'text-amber-100/90 dark:text-amber-50 font-medium'
                                  }>
                                    {line || '\u00A0'}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      <div className="px-4 py-1.5 bg-[#0a0a0c] border-t border-zinc-900 text-[10px] text-zinc-500 font-mono flex justify-between select-none shrink-0">
                        <div className="flex items-center gap-4">
                          <span>UTF-8</span>
                          <span>LF</span>
                          <span className="text-amber-500 font-semibold">Poetry Visualizer</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span>Lines: {artifact.content.split('\n').length}</span>
                          <span>Words: {artifact.content.trim().split(/\s+/).filter(Boolean).length}</span>
                        </div>
                      </div>
                    </div>
                  ) : artifact.type === 'report' || artifact.type === 'markdown' ? (
                    <div className="flex flex-col min-h-full bg-[#030303] text-zinc-300 font-mono select-none">
                      <div className="flex items-center justify-between px-5 py-2.5 bg-[#0a0a0c] border-b border-zinc-900 text-xs text-zinc-400 shrink-0 select-none">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            <span className="w-2.5 h-2.5 rounded-full bg-red-400/70" />
                            <span className="w-2.5 h-2.5 rounded-full bg-yellow-400/70" />
                            <span className="w-2.5 h-2.5 rounded-full bg-green-400/70" />
                          </div>
                          <div className="w-px h-3.5 bg-zinc-800 mx-2" />
                          <div className="flex items-center gap-1.5 bg-[#121215] text-zinc-100 px-3 py-1.5 rounded-t-lg border-t border-x border-zinc-900 text-[10px] font-bold">
                            <FileText size={12} className="text-blue-500 animate-pulse" />
                            <span>{artifact.title.toLowerCase().replace(/[^a-z0-9]+/g, '_') || 'document'}.md</span>
                          </div>
                        </div>
                        <div className="text-[9px] uppercase tracking-widest text-zinc-500 font-extrabold flex items-center gap-2">
                          <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping" />
                          LUMINA DOCS ENGINE
                        </div>
                      </div>

                      <div className="flex-1 flex overflow-y-auto bg-[#030303] custom-scrollbar">
                        <div className="py-8 border-r border-zinc-900/65 flex flex-col items-end pr-4 text-[11px] text-zinc-700 font-mono select-none bg-[#030205] w-14 shrink-0">
                          {Array.from({ length: Math.max(12, Math.ceil(artifact.content.split('\n').length * 1.05)) }).map((_, idx) => (
                            <div key={idx} className="h-6 flex items-center justify-end font-medium">
                              {idx + 1}
                            </div>
                          ))}
                        </div>

                        <div className="flex-1 py-8 px-8 select-text overflow-x-hidden text-left">
                          <div className="text-zinc-600 select-none mb-6 font-mono text-[13px] md:text-[14px] italic border-b border-zinc-900 pb-4 text-left">
                            <div>---</div>
                            <div>document: {artifact.title}</div>
                            <div>author: Lumina Core</div>
                            <div>synthesized: {new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                            <div>document_id: LUM-{(Math.random() * 100000).toFixed(0)}</div>
                            <div>type: {artifact.type}</div>
                            <div>---</div>
                          </div>

                          <div className="markdown-body prose dark:prose-invert max-w-none prose-zinc dark:prose-zinc text-zinc-200 leading-relaxed text-sm md:text-base font-sans pb-12 text-left">
                            <Markdown remarkPlugins={[remarkGfm]}>{artifact.content}</Markdown>
                          </div>
                        </div>
                      </div>

                      <div className="px-4 py-1.5 bg-[#0a0a0c] border-t border-zinc-900 text-[10px] text-zinc-500 font-mono flex justify-between select-none shrink-0">
                        <div className="flex items-center gap-4">
                          <span>UTF-8</span>
                          <span>LF</span>
                          <span className="text-blue-400 font-semibold">Markdown Live Preview</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span>Lines: {artifact.content.split('\n').length}</span>
                          <span>Words: {artifact.content.trim().split(/\s+/).filter(Boolean).length}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="h-full bg-[var(--theme-surface)] overflow-hidden">
                      <iframe
                        title="Preview"
                        srcDoc={artifact.language === 'html' || artifact.type === 'html' ? getCombinedSrcDoc(artifact.content, allArtifacts) : artifact.content}
                        className="w-full h-full border-none bg-white"
                        sandbox="allow-scripts"
                      />
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
