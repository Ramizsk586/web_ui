import fs from "fs";
import os from "os";
import path from "path";
import axios from "axios";
import { z } from "zod";
import { createDeepAgent, FilesystemBackend } from "deepagents";
import { ChatOpenAI } from "@langchain/openai";
import { tool } from "@langchain/core/tools";
import { HumanMessage } from "@langchain/core/messages";
import { search as ddgSearch } from "duck-duck-scrape";
import { DEEP_RESEARCH_SYSTEM_PROMPT, getDeepResearchMinimums, getDeepResearchPresetPrompt } from "../src/utils/deepResearchWorkflow";
import {
  wikiSearch,
  wikiGetSummary,
  wikiGetPage,
  wikiGetRelated,
} from "../src/services/wikiService";

export type DeepResearchPreset = "standard" | "extreme";

type SearchResult = {
  title: string;
  url: string;
  snippet: string;
};

type DeepResearchRunParams = {
  query: string;
  preset: DeepResearchPreset;
  tavilyKey?: string;
  serpKey?: string;
  provider?: string;
  model?: string;
  apiKey?: string;
  baseUrl?: string;
};

type DeepResearchEvent = {
  id: string;
  type: "tool" | "ai";
  label: string;
  toolName?: string;
  status: "complete" | "failed" | "active";
  argsCount?: number;
  resultSummary?: string;
  icon?: string;
};

export type DeepResearchRunResult = {
  report: string;
  toolCalls: DeepResearchEvent[];
};

const randomId = (prefix: string) =>
  `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

const ensureModel = (model?: string) => model || process.env.AI_MODEL || "gpt-4o-mini";

const createWorkspaceDir = () => {
  const dir = path.join(os.tmpdir(), "lumina-deep-research");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
};

const formatToolResult = (value: unknown, maxLen = 4000) => {
  const text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  return text.length > maxLen ? `${text.slice(0, maxLen)}\n...[truncated]` : text;
};

async function runSearch(query: string, tavilyKey?: string, serpKey?: string, preferredProvider?: string): Promise<SearchResult[]> {
  let results: SearchResult[] = [];

  const tryTavily = async () => {
    if (!tavilyKey) return;
    const response = await axios.post("https://api.tavily.com/search", {
      api_key: tavilyKey,
      query,
      search_depth: "advanced",
      include_answer: true,
      include_raw_content: false,
    });
    const raw = response.data?.results || [];
    results = raw.map((item: any) => ({
      title: item.title || "Untitled",
      url: item.url || "",
      snippet: item.content || "",
    }));
  };

  const trySerper = async () => {
    if (!serpKey) return;
    const response = await axios.post(
      "https://google.serper.dev/search",
      { q: query },
      {
        headers: {
          "X-API-KEY": serpKey,
          "Content-Type": "application/json",
        },
      }
    );
    const raw = response.data?.organic || [];
    results = raw.map((item: any) => ({
      title: item.title || "Untitled",
      url: item.link || "",
      snippet: item.snippet || "",
    }));
  };

  const tryDdg = async () => {
    const response = await ddgSearch(query, {
      region: "wt-wt",
      safeSearch: -1,
      time: "y",
      offset: 0,
    });
    results = (response.results || []).slice(0, 10).map((item: any) => ({
      title: item.title || "Untitled",
      url: item.url || "",
      snippet: item.description || "",
    }));
  };

  try {
    if (preferredProvider === "serpapi") {
      try { await trySerper(); } catch {}
      if (results.length === 0) {
        try { await tryTavily(); } catch {}
      }
    } else {
      try { await tryTavily(); } catch {}
      if (results.length === 0) {
        try { await trySerper(); } catch {}
      }
    }
    if (results.length === 0) {
      await tryDdg();
    }
  } catch {
    return [];
  }

  return results.slice(0, 10);
}

async function scrapeUrl(url: string, outputFormat: string, extractLinks: boolean, extractTables: boolean) {
  const response = await axios.get(url, {
    timeout: 30000,
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    },
  });

  const html = typeof response.data === "string" ? response.data : JSON.stringify(response.data);
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return {
    url,
    outputFormat,
    extractLinks,
    extractTables,
    title: url,
    rawText: text,
    content: outputFormat === "html" ? html : text,
  };
}

export async function runDeepResearch(params: DeepResearchRunParams): Promise<DeepResearchRunResult> {
  const minimums = getDeepResearchMinimums(params.preset);
  const toolCalls: DeepResearchEvent[] = [];
  const trackTool = async <T,>(name: string, input: unknown, icon: string, fn: () => Promise<T>) => {
    const event: DeepResearchEvent = {
      id: randomId("dr"),
      type: "tool",
      label: name,
      toolName: name,
      status: "active",
      icon,
      argsCount: input && typeof input === "object" ? Object.keys(input as Record<string, unknown>).length : 0,
    };
    toolCalls.push(event);
    try {
      const result = await fn();
      event.status = "complete";
      event.resultSummary = formatToolResult(result, 700);
      return result;
    } catch (error: any) {
      event.status = "failed";
      event.resultSummary = error?.message || "Tool failed";
      throw error;
    }
  };

  const model = new ChatOpenAI({
    model: ensureModel(params.model),
    temperature: 0,
    apiKey: params.apiKey || process.env.AI_API_KEY || process.env.OPENAI_API_KEY || "not-needed",
    configuration: params.baseUrl || process.env.AI_BASE_URL
      ? { baseURL: (params.baseUrl || process.env.AI_BASE_URL || "").replace(/\/+$/, "") }
      : undefined,
  });

  const searchTool = tool(
    async ({ query }: { query: string[] }) =>
      trackTool("search", { query }, "search", async () => {
        const batches = await Promise.all(query.map((item) => runSearch(item, params.tavilyKey, params.serpKey, params.provider)));
        return query.map((item, index) => ({ query: item, results: batches[index] }));
      }),
    {
      name: "search",
      description: "Search the web for recent and relevant sources.",
      schema: z.object({
        query: z.array(z.string()).min(1),
      }),
    }
  );

  const scholarTool = tool(
    async ({ query }: { query: string[] }) =>
      trackTool("google_scholar", { query }, "search", async () => {
        const batches = await Promise.all(query.map((item) => runSearch(`${item} research paper`, params.tavilyKey, params.serpKey, params.provider)));
        return query.map((item, index) => ({ query: item, results: batches[index] }));
      }),
    {
      name: "google_scholar",
      description: "Find academic and publication-heavy sources.",
      schema: z.object({
        query: z.array(z.string()).min(1),
      }),
    }
  );

  const visitTool = tool(
    async ({ url, goal }: { url: string[]; goal: string }) =>
      trackTool("visit", { url, goal }, "globe", async () => {
        const pages = await Promise.all(url.map((item) => scrapeUrl(item, "markdown", false, false)));
        return pages.map((page, index) => ({
          url: url[index],
          goal,
          evidence: formatToolResult(page.rawText, 3000),
        }));
      }),
    {
      name: "visit",
      description: "Open a web page and extract goal-focused evidence.",
      schema: z.object({
        url: z.array(z.string().url()).min(1),
        goal: z.string().min(1),
      }),
    }
  );

  const scrapeTool = tool(
    async ({ url, outputFormat = "markdown", extractLinks = false, extractTables = false }: { url: string; outputFormat?: string; extractLinks?: boolean; extractTables?: boolean }) =>
      trackTool("web_scrape", { url, outputFormat, extractLinks, extractTables }, "globe", async () =>
        scrapeUrl(url, outputFormat, extractLinks, extractTables)
      ),
    {
      name: "web_scrape",
      description: "Extract fuller text from a high-value page.",
      schema: z.object({
        url: z.string().url(),
        outputFormat: z.enum(["markdown", "json", "html"]).optional(),
        extractLinks: z.boolean().optional(),
        extractTables: z.boolean().optional(),
      }),
    }
  );

  const wikiSearchTool = tool(
    async ({ query, limit = 5, language = "en" }: { query: string; limit?: number; language?: string }) =>
      trackTool("wiki_search", { query, limit, language }, "globe", async () => wikiSearch(query, limit, language)),
    {
      name: "wiki_search",
      description: "Search Wikipedia for background context and entities.",
      schema: z.object({
        query: z.string().min(1),
        limit: z.number().optional(),
        language: z.string().optional(),
      }),
    }
  );

  const wikiSummaryTool = tool(
    async ({ pageId, language = "en" }: { pageId: number; language?: string }) =>
      trackTool("wiki_get_summary", { pageId, language }, "globe", async () => wikiGetSummary(pageId, language)),
    {
      name: "wiki_get_summary",
      description: "Fetch a concise Wikipedia summary.",
      schema: z.object({
        pageId: z.number(),
        language: z.string().optional(),
      }),
    }
  );

  const wikiPageTool = tool(
    async ({ pageId, language = "en" }: { pageId: number; language?: string }) =>
      trackTool("wiki_get_page", { pageId, language }, "globe", async () => wikiGetPage(pageId, language)),
    {
      name: "wiki_get_page",
      description: "Fetch a detailed Wikipedia page.",
      schema: z.object({
        pageId: z.number(),
        language: z.string().optional(),
      }),
    }
  );

  const wikiRelatedTool = tool(
    async ({ pageId, limit = 10, language = "en" }: { pageId: number; limit?: number; language?: string }) =>
      trackTool("wiki_get_related", { pageId, limit, language }, "globe", async () => wikiGetRelated(pageId, limit, language)),
    {
      name: "wiki_get_related",
      description: "Find related Wikipedia pages.",
      schema: z.object({
        pageId: z.number(),
        limit: z.number().optional(),
        language: z.string().optional(),
      }),
    }
  );

  const backend = new FilesystemBackend({ rootDir: createWorkspaceDir() });
  const agent = createDeepAgent({
    model,
    backend,
    systemPrompt: [
      DEEP_RESEARCH_SYSTEM_PROMPT,
      getDeepResearchPresetPrompt(params.preset),
      `Current date: ${new Date().toISOString().slice(0, 10)}`,
      `Deep research preset: ${params.preset}`,
      `Minimum wiki searches: ${minimums.minWikiSearches}`,
      `Minimum web scrapes: ${minimums.minWebScrapes}`,
      `Minimum visit calls: ${minimums.minVisits}`,
      `Minimum search calls: ${minimums.minSearchCalls}`,
      "Always finish with a polished Markdown report with sources.",
    ].join("\n\n"),
    tools: [
      searchTool,
      scholarTool,
      visitTool,
      scrapeTool,
      wikiSearchTool,
      wikiSummaryTool,
      wikiPageTool,
      wikiRelatedTool,
    ],
    subagents: [
      {
        name: "source-hunter",
        description: "Finds strong search angles and primary sources.",
        systemPrompt: "Find diverse, recent, high-signal sources and return concise evidence summaries.",
      },
      {
        name: "synthesizer",
        description: "Combines evidence into a coherent report.",
        systemPrompt: "Synthesize evidence, compare sources, surface uncertainty, and draft clean Markdown.",
      },
    ],
  });

  const result: any = await (agent as any).invoke({
    messages: [new HumanMessage(params.query)],
  });

  const report = String(
    (typeof result?.output === "string" && result.output) ||
    (typeof result?.structuredResponse === "string" && result.structuredResponse) ||
    (Array.isArray(result?.messages)
      ? [...result.messages].reverse().find((message: any) => typeof message?.content === "string")?.content
      : "") ||
    "Deep Research completed, but no report text was returned."
  );

  toolCalls.push({
    id: randomId("dr_ai"),
    type: "ai",
    label: "deep research synthesis",
    status: "complete",
    icon: "sparkles",
    resultSummary: `${Math.round(report.length / 4)} tokens approx`,
  });

  return {
    report,
    toolCalls,
  };
}
