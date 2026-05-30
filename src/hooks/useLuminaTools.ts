import React, { useState } from 'react';
import { Tool } from '../types';
import { Globe, Search, BookOpen, FileText, Layers, Library, Link as LinkIcon, Image as ImageIcon, Compass } from 'lucide-react';
import { ScrapeResult } from '../services/scrapingService';

export function useLuminaTools() {
  const [scrapingResults, setScrapingResults] = useState<Map<string, ScrapeResult>>(new Map());
  const [activeScrapingJobs, setActiveScrapingJobs] = useState<Set<string>>(new Set());
  const [wikiResults, setWikiResults] = useState<Map<string, { wikiType: string; data: any }>>(new Map());

  const [luminaTools, setLuminaTools] = useState<Tool[]>([
    {
      id: 'web_scrape',
      name: 'Web Scraper',
      description: 'Fetch and extract structured data from any webpage',
      enabled: false,
      icon: React.createElement(Globe, { size: 16 }),
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'The URL to scrape' },
          selectors: { type: 'object', description: 'Optional CSS selectors to extract specific data' },
          usePuppeteer: { type: 'boolean', description: 'Set to true if page requires JavaScript execution' },
          extractLinks: { type: 'boolean', description: 'Whether to extract outgoing links' },
          extractTables: { type: 'boolean', description: 'Whether to extract HTML tables' },
          outputFormat: { type: 'string', enum: ['json', 'markdown', 'html'], description: 'Output format' }
        },
        required: ['url']
      }
    },
    {
      id: 'wiki_search',
      name: 'Wikipedia Search',
      description: 'Search Wikipedia for articles by query',
      enabled: false,
      icon: React.createElement(Search, { size: 16 })
    },
    {
      id: 'wiki_get_page',
      name: 'Wikipedia Page Fetch',
      description: 'Fetch full Wikipedia article by page ID',
      enabled: false,
      icon: React.createElement(BookOpen, { size: 16 })
    },
    {
      id: 'wiki_get_summary',
      name: 'Wikipedia Summary',
      description: 'Get a fast summary (introduction paragraph only) of a Wikipedia article',
      enabled: false,
      icon: React.createElement(FileText, { size: 16 })
    },
    {
      id: 'wiki_get_sections',
      name: 'Wikipedia Table of Contents',
      description: 'Get the table of contents sections list for a page',
      enabled: false,
      icon: React.createElement(Layers, { size: 16 })
    },
    {
      id: 'wiki_get_categories',
      name: 'Wikipedia Categories',
      description: 'Get all categories that a page belongs to',
      enabled: false,
      icon: React.createElement(Library, { size: 16 })
    },
    {
      id: 'wiki_get_links',
      name: 'Wikipedia Link Tracker',
      description: 'Get all internal Wikipedia links from an article',
      enabled: false,
      icon: React.createElement(LinkIcon, { size: 16 })
    },
    {
      id: 'wiki_get_images',
      name: 'Wikipedia Media Scraper',
      description: 'Get all images used in a Wikipedia article',
      enabled: false,
      icon: React.createElement(ImageIcon, { size: 16 })
    },
    {
      id: 'wiki_get_related',
      name: 'Wikipedia Related Pages',
      description: 'Find pages in the same category (related articles)',
      enabled: false,
      icon: React.createElement(Compass, { size: 16 })
    }
  ]);

  return {
    scrapingResults, setScrapingResults,
    activeScrapingJobs, setActiveScrapingJobs,
    wikiResults, setWikiResults,
    luminaTools, setLuminaTools
  };
}
