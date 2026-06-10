import axios from 'axios';

export interface LightpandaCloudConfig {
  region: 'euwest' | 'uswest' | 'useast';
  token: string;
  browser: string;
  proxy: string;
}

export interface ScrapeOptions {
  url: string;
  selectors?: Record<string, string>;   // e.g. { title: 'h1', price: '.price' }
  waitForSelector?: string;             // for dynamic pages
  strategy?: 'static' | 'dynamic' | 'crawl';
  browserEngine?: 'puppeteer' | 'playwright';
  useJavaScript?: boolean;
  extractLinks?: boolean;
  extractImages?: boolean;
  extractTables?: boolean;
  outputFormat?: 'json' | 'markdown' | 'html';
  maxDepth?: number;                    // for multi-page crawling
  maxPages?: number;
  followLinks?: boolean;
  lightpanda?: {
    mode: 'local' | 'cloud';
    cloud?: LightpandaCloudConfig;
  };
}

export interface ScrapeResult {
  url: string;
  requestedUrl?: string;
  title: string;
  statusCode: number;
  scrapedAt: string;
  data: Record<string, any>;
  links?: string[];
  images?: string[];
  tables?: string[][][];
  rawText?: string;
  strategy?: 'static' | 'dynamic' | 'crawl';
  engine?: string;
  robotsWarning?: string;
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
    let requestOptions: ScrapeOptions = { ...options };

    try {
      const rawConfig = localStorage.getItem('lumina_lightpanda_cloud_config');
      const parsedConfig = rawConfig ? JSON.parse(rawConfig) : {};
      requestOptions = {
        ...requestOptions,
        lightpanda: {
          mode: 'cloud',
          cloud: {
            region: parsedConfig?.region || 'euwest',
            token: parsedConfig?.token || '',
            browser: parsedConfig?.browser || 'lightpanda',
            proxy: parsedConfig?.proxy || 'fast_dc',
          }
        }
      };
    } catch {}

    const response = await axios.post('/api/scrape', requestOptions, {
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

