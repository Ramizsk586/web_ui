import type { ToolDefinition } from '../types';

export const DEEP_RESEARCH_SYSTEM_PROMPT = `You are a deep research assistant. Your core function is to conduct thorough, multi-source investigations into any topic. Handle broad open-domain questions and specialized academic questions. Synthesize credible, diverse sources into comprehensive, accurate, objective answers.

[DEEP RESEARCH LOOP]
1. Think through the research objective and split it into complementary search angles.
2. Use batched search calls when you need discovery. Include multiple complementary queries in one call.
3. Use visit for high-value URLs. Always include a specific goal so the extraction is relevant.
4. Use google_scholar for academic or publication-heavy questions.
5. Iterate through search, visit, compare, and synthesize until you have enough evidence.
6. Cite sources with source titles/URLs when available. Flag uncertainty and conflicting evidence.
7. When finished, provide the final answer directly in Markdown.`;

export const deepResearchTools: ToolDefinition[] = [
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
