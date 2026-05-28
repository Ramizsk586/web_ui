import type { ToolDefinition } from '../types';

export const webScrapeTool: ToolDefinition = {
  type: 'function',
  function: {
    name: 'web_scrape',
    description: `Scrape a webpage and extract structured data. Supports static HTML pages and JavaScript-rendered pages. Can extract text, links, images, and tables using CSS selectors.`,
    parameters: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'The URL to scrape'
        },
        selectors: {
          type: 'object',
          description: 'Optional CSS selectors to extract specific data. Key = field name, Value = CSS selector string.',
          additionalProperties: { type: 'string' }
        },
        usePuppeteer: {
          type: 'boolean',
          description: 'Set to true if the page requires JavaScript execution (React/Vue SPAs, infinite scroll)'
        },
        extractLinks: {
          type: 'boolean',
          description: 'Whether to extract all links from the page'
        },
        extractTables: {
          type: 'boolean',
          description: 'Whether to extract HTML tables as structured arrays'
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
