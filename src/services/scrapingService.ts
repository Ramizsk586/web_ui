import axios from 'axios';

export interface ScrapeOptions {
  url: string;
  selectors?: Record<string, string>;   // e.g. { title: 'h1', price: '.price' }
  waitForSelector?: string;             // for dynamic pages
  usePuppeteer?: boolean;
  extractLinks?: boolean;
  extractImages?: boolean;
  extractTables?: boolean;
  outputFormat?: 'json' | 'markdown' | 'html';
  maxDepth?: number;                    // for multi-page crawling
  followLinks?: boolean;
}

export interface ScrapeResult {
  url: string;
  title: string;
  statusCode: number;
  scrapedAt: string;
  data: Record<string, any>;
  links?: string[];
  images?: string[];
  tables?: string[][][];
  rawText?: string;
  error?: string;
}

/**
 * Scrapes a single URL via our backend server-side proxy
 */
export async function scrapeUrl(options: ScrapeOptions): Promise<ScrapeResult> {
  try {
    // Validate that the URL is a standard HTTP/HTTPS link
    const parsed = new URL(options.url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error('Only HTTP or HTTPS protocols are supported.');
    }
  } catch (error) {
    return {
      url: options.url,
      title: 'Invalid URL Format',
      statusCode: 400,
      scrapedAt: new Date().toISOString(),
      data: {},
      error: 'Please enter a valid HTTP/HTTPS URL.'
    };
  }

  try {
    const response = await axios.post('/api/scrape', options, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 25000 // allow ample time for fetching and parsing
    });
    return response.data;
  } catch (err: any) {
    console.error('Frontend scrape request failed:', err);
    return {
      url: options.url,
      title: 'Scrape Operational Failure',
      statusCode: err.response?.status || 500,
      scrapedAt: new Date().toISOString(),
      data: {},
      error: err.response?.data?.error || err.message || 'Unknown backend scraping error occurred'
    };
  }
}

/**
 * Scrapes a batch of URLs sequentially or in parallel
 */
export async function scrapeBatch(urls: string[], options?: Partial<ScrapeOptions>): Promise<ScrapeResult[]> {
  const results: ScrapeResult[] = [];
  for (const url of urls) {
    const singleRes = await scrapeUrl({ ...options, url });
    results.push(singleRes);
  }
  return results;
}

/**
 * Helper to turn html into basic markdown (fallback in case server doesn't do it)
 */
export function htmlToMarkdown(html: string): string {
  if (!html) return '';
  // Basic strip tags and parse representation
  let text = html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi, '\n\n# $1\n')
    .replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '\n\n$1\n')
    .replace(/<br[^>]*>/gi, '\n')
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '\n- $1')
    .replace(/<[^>]*>/g, '');
  
  // Clean double whitespaces
  text = text.replace(/\n\s*\n/g, '\n\n').trim();
  return text;
}
