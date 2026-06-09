import type { ToolDefinition } from '../types';

export const webScrapeTool: ToolDefinition = {
  type: 'function',
  function: {
    name: 'web_scrape',
    description: `Scrape a webpage using an explicit strategy. Use 'static' for Axios + Cheerio, 'dynamic' for browser-rendered pages, and 'crawl' for multi-page extraction.`,
    parameters: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'The URL to scrape'
        },
        strategy: {
          type: 'string',
          enum: ['static', 'dynamic', 'crawl'],
          description: 'Scraping strategy. Use static for fast HTML fetches, dynamic for JS-rendered pages, crawl for multi-page collection.'
        },
        browserEngine: {
          type: 'string',
          enum: ['puppeteer', 'playwright'],
          description: 'Browser engine for dynamic scraping.'
        },
        selectors: {
          type: 'object',
          description: 'Optional CSS selectors to extract specific data. Key = field name, Value = CSS selector string.',
          additionalProperties: { type: 'string' }
        },
        useJavaScript: {
          type: 'boolean',
          description: 'Set to true when the page requires JavaScript execution.'
        },
        waitForSelector: {
          type: 'string',
          description: 'Optional CSS selector to wait for before extracting dynamic content.'
        },
        extractLinks: {
          type: 'boolean',
          description: 'Whether to extract all links from the page'
        },
        extractImages: {
          type: 'boolean',
          description: 'Whether to extract image URLs from the page'
        },
        extractTables: {
          type: 'boolean',
          description: 'Whether to extract HTML tables as structured arrays'
        },
        maxPages: {
          type: 'number',
          description: 'Maximum pages to collect when using crawl strategy.'
        },
        outputFormat: {
          type: 'string',
          enum: ['json', 'markdown', 'html'],
          description: 'Output format for the scraped data'
        }
      },
      required: ['url']
    }
  }
};
