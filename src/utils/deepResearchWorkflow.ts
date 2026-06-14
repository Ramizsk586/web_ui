import type { ToolDefinition } from '../types';

export type DeepResearchPreset = 'standard' | 'extreme';

export const DEEP_RESEARCH_SYSTEM_PROMPT = `You are a deep research assistant. Your core function is to conduct thorough, multi-source investigations into any topic. Handle broad open-domain questions and specialized academic questions. Synthesize credible, diverse sources into comprehensive, accurate, objective answers.

[DEEP RESEARCH LOOP]
1. Your first tool call must be current_time so you anchor the research to the real current date and time.
2. Immediately after the time tool, write a concise research plan in your reasoning and then execute it step by step.
3. Split the objective into complementary search angles and track which angle each tool call supports.
4. Start with normal web discovery using search when you need current sources, news, product pages, company pages, blogs, or documentation.
5. Use visit for high-value URLs. Always include a specific goal so the extraction is relevant.
6. Use wiki_search, wiki_get_summary, wiki_get_page, and wiki_get_related for background knowledge, entity grounding, timelines, terminology, and adjacent topics.
7. Use google_scholar for academic or publication-heavy questions.
8. Every deep research run must include at least 3 successful wiki_search calls before you finalize.
9. Blend evidence from search results and Wikipedia instead of relying on a single source type.
10. Iterate through search, visit, compare, and synthesize until you have enough evidence.
11. During each research round, gather both factual evidence and useful visual material when available: portraits, product images, diagrams, maps, logos, charts, or contextual photos.
12. For people-heavy topics, build enough evidence to support dedicated people spotlight/profile sections in the final report.
13. Cite sources with source titles/URLs when available. Flag uncertainty and conflicting evidence.
14. Do not finalize early. If the minimum required wiki searches are not complete yet, continue researching.
15. The research process should feel iterative: web search, Wikipedia grounding, targeted visits, comparison, reasoning, and another round if evidence is still thin.
16. Finish with two deliverables:
   a. a polished Markdown report for the chat transcript
   b. a self-contained HTML visual report for preview/export
17. The HTML report must be wrapped in one \`\`\`html fenced block and should include a strong hero section, executive summary, evidence-based sections, source-aware callouts, segmented narrative structure, and visual/profile blocks when relevant.`;

export const getDeepResearchPresetPrompt = (preset: DeepResearchPreset) => {
  if (preset === 'extreme') {
    return `\n[ADVANCED DEEP RESEARCH MODE]
- Run a more thorough pipeline with wider query coverage and stronger source triangulation.
- Build a multi-phase plan: discovery, background grounding, source expansion, deep extraction, verification, and synthesis.
- Use more complementary search angles before converging on conclusions.
- Prefer additional visit and comparison passes before finalizing.
- Use Wikipedia not only for definitions, but also for timeline checks, related entities, and disambiguation.
- Visit multiple high-value pages across different source types whenever possible.
- Explicitly compare source agreement, conflicts, recency, and evidence quality before writing the final answer.
- The final answer should be more complete, structured, and source-dense than normal mode.`;
  }

  return `\n[NORMAL DEEP RESEARCH MODE]
- Keep the pipeline efficient and reliable.
- Make a concise plan, gather enough evidence to answer well, verify key facts, then synthesize clearly.
- Stay thorough, but prefer shorter research loops when the answer is already well supported.`;
};

export const getDeepResearchMinimums = (preset: DeepResearchPreset) => {
  if (preset === 'extreme') {
    return {
      minWikiSearches: 5,
      minVisits: 3,
      minSearchCalls: 3
    };
  }

  return {
    minWikiSearches: 3,
    minVisits: 1,
    minSearchCalls: 1
  };
};

export const deepResearchTools: ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'current_time',
      description: 'Get the current local date, time, timezone, timestamp, and ISO datetime before beginning research.',
      parameters: {
        type: 'object',
        properties: {},
        required: []
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'search',
      description: 'Perform batched web searches and return top results. Accepts multiple complementary queries in one call.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'array',
            items: { type: 'string' },
            minItems: 1,
            description: 'Array of search queries.'
          }
        },
        required: ['query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'visit',
      description: 'Visit webpage(s), extract content, and return evidence plus summary relevant to a stated goal.',
      parameters: {
        type: 'object',
        properties: {
          url: {
            type: 'array',
            items: { type: 'string' },
            description: 'One or more webpage URLs to visit.'
          },
          goal: {
            type: 'string',
            description: 'The specific information goal for these page visits.'
          }
        },
        required: ['url', 'goal']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'wiki_search',
      description: 'Search Wikipedia for background context, entities, timelines, definitions, and related topic hubs.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The Wikipedia search query.'
          },
          limit: {
            type: 'number',
            description: 'Maximum number of results to return.'
          },
          language: {
            type: 'string',
            description: 'Wikipedia language code, usually en.'
          }
        },
        required: ['query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'wiki_get_summary',
      description: 'Fetch a concise Wikipedia summary for a known page or entity.',
      parameters: {
        type: 'object',
        properties: {
          pageId: {
            type: 'number',
            description: 'Wikipedia page ID returned by wiki_search.'
          },
          language: {
            type: 'string',
            description: 'Wikipedia language code, usually en.'
          }
        },
        required: ['pageId']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'wiki_get_page',
      description: 'Fetch the richer Wikipedia article structure, sections, and metadata for an important page.',
      parameters: {
        type: 'object',
        properties: {
          pageId: {
            type: 'number',
            description: 'Wikipedia page ID returned by wiki_search.'
          },
          language: {
            type: 'string',
            description: 'Wikipedia language code, usually en.'
          }
        },
        required: ['pageId']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'wiki_get_related',
      description: 'Expand research by finding related Wikipedia pages around a confirmed article.',
      parameters: {
        type: 'object',
        properties: {
          pageId: {
            type: 'number',
            description: 'Wikipedia page ID returned by wiki_search.'
          },
          limit: {
            type: 'number',
            description: 'Maximum number of related pages to return.'
          },
          language: {
            type: 'string',
            description: 'Wikipedia language code, usually en.'
          }
        },
        required: ['pageId']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'google_scholar',
      description: 'Search for academic publications and scholarly sources. Also returns general search results when no scholar-specific backend is configured.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'array',
            items: { type: 'string' },
            minItems: 1,
            description: 'Array of academic search queries.'
          }
        },
        required: ['query']
      }
    }
  }
];

export const formatDeepResearchSearchResults = (query: string, results: any[]) => {
  if (!results.length) {
    return `No results found for '${query}'. Try a broader query.`;
  }

  return `A web search for '${query}' found ${results.length} results:\n\n` +
    results.slice(0, 10).map((result, index) => {
      const title = result.title || 'Untitled';
      const url = result.url || result.link || '';
      const snippet = result.snippet || result.content || '';
      return `${index + 1}. [${title}](${url})\n${snippet}`;
    }).join('\n\n');
};

export const formatDeepResearchVisitResult = (url: string, goal: string, result: any, maxChars = 6000) => {
  const rawText = result?.rawText || result?.data?.markdown || result?.data?.text || result?.data?.content || '';
  const text = String(rawText || '').replace(/\s+/g, ' ').trim();
  const evidence = text
    ? text.slice(0, maxChars) + (text.length > maxChars ? '... [truncated]' : '')
    : 'The webpage content could not be accessed or no readable text was extracted.';

  return `The useful information in ${url} for user goal "${goal}" is as follows:\n\n` +
    `Evidence in page:\n${evidence}\n\n` +
    `Summary:\n${result?.title ? `Page title: ${result.title}. ` : ''}${result?.error ? `Fetch error: ${result.error}` : 'Relevant page evidence extracted for comparison and synthesis.'}`;
};

export const sanitizeDeepResearchReport = (content: string) => {
  return String(content || '')
    .replace(/<think>[\s\S]*?<\/think>/g, '')
    .replace(/<tool_call>[\s\S]*?<\/tool_call>/g, '')
    .replace(/<tool_response>[\s\S]*?<\/tool_response>/g, '')
    .replace(/\[\[tool_call:[^\]]+\]\]/g, '')
    .replace(/^Running \d+ tool\(s\)\.\.\.$/gim, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

export const createDeepResearchReportTitle = (content: string, fallback = 'Deep Research Report') => {
  const firstHeading = content.match(/^#{1,3}\s+(.+)$/m)?.[1]?.trim();
  if (firstHeading) return firstHeading.slice(0, 80);

  const firstLine = content
    .split('\n')
    .map(line => line.replace(/[*_`>#-]/g, '').trim())
    .find(line => line.length > 8);

  return (firstLine || fallback).slice(0, 80);
};