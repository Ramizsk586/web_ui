import type { ToolDefinition } from '../types';

// ─────────────────────────────────────────────
// TOOL 1: wiki_search
// ─────────────────────────────────────────────
export const wikiSearchTool: ToolDefinition = {
  type: 'function',
  function: {
    name: 'wiki_search',
    description: `Search Wikipedia for a query. Returns a list of matching articles with their page IDs, titles, and short snippets. Use this FIRST to find the correct page ID before calling other wiki tools.`,
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query (e.g. "Apollo 11 moon landing", "Python programming language")'
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results to return (default: 10, max: 20)'
        },
        language: {
          type: 'string',
          description: 'Wikipedia language code (default: "en"). E.g. "fr", "de", "es", "ja"'
        }
      },
      required: ['query']
    }
  }
};

// ─────────────────────────────────────────────
// TOOL 2: wiki_get_page
// ─────────────────────────────────────────────
export const wikiGetPageTool: ToolDefinition = {
  type: 'function',
  function: {
    name: 'wiki_get_page',
    description: `Fetch the full content of a Wikipedia article by its page ID. Returns all sections, intro text, categories, references, and image list. Use wiki_search first to find the correct page ID.`,
    parameters: {
      type: 'object',
      properties: {
        pageId: {
          type: 'number',
          description: 'The Wikipedia page ID (integer) obtained from wiki_search results'
        },
        language: {
          type: 'string',
          description: 'Wikipedia language code (default: "en")'
        }
      },
      required: ['pageId']
    }
  }
};

// ─────────────────────────────────────────────
// TOOL 3: wiki_get_summary
// ─────────────────────────────────────────────
export const wikiGetSummaryTool: ToolDefinition = {
  type: 'function',
  function: {
    name: 'wiki_get_summary',
    description: `Get a fast summary (introduction paragraph only) of a Wikipedia article. Much faster than wiki_get_page. Use when you only need a brief overview, description, or quick fact about a topic.`,
    parameters: {
      type: 'object',
      properties: {
        pageId: {
          type: 'number',
          description: 'The Wikipedia page ID from wiki_search'
        },
        language: {
          type: 'string',
          description: 'Wikipedia language code (default: "en")'
        }
      },
      required: ['pageId']
    }
  }
};

// ─────────────────────────────────────────────
// TOOL 4: wiki_get_sections
// ─────────────────────────────────────────────
export const wikiGetSectionsTool: ToolDefinition = {
  type: 'function',
  function: {
    name: 'wiki_get_sections',
    description: `Get the table of contents (all section titles, levels, and anchors) for a Wikipedia article. Use this to understand an article's structure before deciding which sections to read.`,
    parameters: {
      type: 'object',
      properties: {
        pageId: {
          type: 'number',
          description: 'The Wikipedia page ID from wiki_search'
        },
        language: {
          type: 'string',
          description: 'Wikipedia language code (default: "en")'
        }
      },
      required: ['pageId']
    }
  }
};

// ─────────────────────────────────────────────
// TOOL 5: wiki_get_categories
// ─────────────────────────────────────────────
export const wikiGetCategoriesTool: ToolDefinition = {
  type: 'function',
  function: {
    name: 'wiki_get_categories',
    description: `Get all Wikipedia categories that a page belongs to. Useful for understanding the topic domain, finding related articles, and classifying content.`,
    parameters: {
      type: 'object',
      properties: {
        pageId: {
          type: 'number',
          description: 'The Wikipedia page ID from wiki_search'
        },
        language: {
          type: 'string',
          description: 'Wikipedia language code (default: "en")'
        }
      },
      required: ['pageId']
    }
  }
};

// ─────────────────────────────────────────────
// TOOL 6: wiki_get_links
// ─────────────────────────────────────────────
export const wikiGetLinksTool: ToolDefinition = {
  type: 'function',
  function: {
    name: 'wiki_get_links',
    description: `Get all internal Wikipedia links (wikilinks) from an article. Returns the titles and page IDs of articles linked within the page. Use to explore connected topics or build a knowledge graph.`,
    parameters: {
      type: 'object',
      properties: {
        pageId: {
          type: 'number',
          description: 'The Wikipedia page ID from wiki_search'
        },
        limit: {
          type: 'number',
          description: 'Maximum number of links to return (default: 50, max: 200)'
        },
        language: {
          type: 'string',
          description: 'Wikipedia language code (default: "en")'
        }
      },
      required: ['pageId']
    }
  }
};

// ─────────────────────────────────────────────
// TOOL 7: wiki_get_images
// ─────────────────────────────────────────────
export const wikiGetImagesTool: ToolDefinition = {
  type: 'function',
  function: {
    name: 'wiki_get_images',
    description: `Get all images used in a Wikipedia article with their resolved URLs. Returns filenames, direct image URLs, dimensions, and descriptions where available.`,
    parameters: {
      type: 'object',
      properties: {
        pageId: {
          type: 'number',
          description: 'The Wikipedia page ID from wiki_search'
        },
        language: {
          type: 'string',
          description: 'Wikipedia language code (default: "en")'
        }
      },
      required: ['pageId']
    }
  }
};

// ─────────────────────────────────────────────
// TOOL 8: wiki_get_related
// ─────────────────────────────────────────────
export const wikiGetRelatedTool: ToolDefinition = {
  type: 'function',
  function: {
    name: 'wiki_get_related',
    description: `Find Wikipedia articles related to a given page, by discovering other pages in the same categories. Returns titles, page IDs, and snippets of related articles.`,
    parameters: {
      type: 'object',
      properties: {
        pageId: {
          type: 'number',
          description: 'The Wikipedia page ID to find related articles for'
        },
        limit: {
          type: 'number',
          description: 'Maximum number of related articles to return (default: 10)'
        },
        language: {
          type: 'string',
          description: 'Wikipedia language code (default: "en")'
        }
      },
      required: ['pageId']
    }
  }
};

// ─────────────────────────────────────────────
// EXPORT: all tools as array for easy registration
// ─────────────────────────────────────────────
export const ALL_WIKI_TOOLS: ToolDefinition[] = [
  wikiSearchTool,
  wikiGetPageTool,
  wikiGetSummaryTool,
  wikiGetSectionsTool,
  wikiGetCategoriesTool,
  wikiGetLinksTool,
  wikiGetImagesTool,
  wikiGetRelatedTool,
];
