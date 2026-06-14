import fs from "fs";
import os from "os";
import path from "path";
import axios from "axios";
import { load as loadHtml } from "cheerio";
import TurndownService from "turndown";
import { search as ddgSearch } from "duck-duck-scrape";
import { z } from "zod";
import { streamText, generateText, tool } from "ai";
import { buildProviderModel } from "./ai_sdk_providers.js";
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

type ResearchAngle = {
  angle: string;
  goal: string;
  query: string;
  sourceType: "web" | "wiki" | "scholar";
};

type ResearchCheckpoint = {
  title: string;
  summary: string;
  evidence: string[];
  openQuestions: string[];
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
  onEvent?: (event: DeepResearchStreamEvent) => void | Promise<void>;
};

const isOpenAiCompatibleResearchProvider = (provider?: string, baseUrl?: string, model?: string) => {
  const normalizedProvider = String(provider || "").trim().toLowerCase();
  const normalizedBaseUrl = String(baseUrl || "").trim().toLowerCase();
  const normalizedModel = String(model || "").trim().toLowerCase();

  if (!normalizedProvider && !normalizedBaseUrl) {
    return true;
  }

  if (normalizedProvider === "zed" || normalizedProvider === "copilot") {
    return true;
  }

  if (normalizedProvider === "openai" || normalizedProvider === "openai-compatible" || normalizedProvider === "llama-bridge") {
    return true;
  }

  if (
    normalizedProvider.includes("anthropic") ||
    normalizedProvider.includes("opencode") ||
    normalizedProvider.includes("google") ||
    normalizedProvider.includes("gemini")
  ) {
    return false;
  }

  if (
    normalizedBaseUrl.includes("anthropic.com") ||
    normalizedBaseUrl.includes("opencode.ai") ||
    normalizedBaseUrl.includes("generativelanguage.googleapis.com")
  ) {
    return false;
  }

  if (normalizedModel.includes("claude") || normalizedModel.includes("gemini")) {
    return false;
  }

  return true;
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
  subNodes?: DeepResearchEvent[];
};

export type DeepResearchStreamEvent =
  | { type: "pipeline"; node: DeepResearchEvent }
  | { type: "report"; chunk: string; report?: string }
  | { type: "final"; result: DeepResearchRunResult };

export type DeepResearchRunResult = {
  report: string;
  htmlReport?: string;
  toolCalls: DeepResearchEvent[];
};

const randomId = (prefix: string) =>
  `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

const ensureModel = (model?: string) => model || process.env.AI_MODEL || "gpt-4o-mini";
const turndown = new TurndownService({ headingStyle: "atx", codeBlockStyle: "fenced" });
const DDG_MIN_INTERVAL_MS = 2000;
let lastDdgRequestAt = 0;
const DDG_USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.3 Safari/605.1.15",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:135.0) Gecko/20100101 Firefox/135.0",
];

const createWorkspaceDir = () => {
  const dir = path.join(os.tmpdir(), "lumina-deep-research");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
};

interface ResearchModel {
  id: string;
  provider: string;
  baseUrl: string;
}

const buildPiResearchModel = (modelId?: string, provider?: string, baseUrl?: string): ResearchModel => {
  const normalizedProvider = String(provider || "").trim().toLowerCase();
  let effectiveModelId = modelId || "";
  let effectiveProvider = provider || "";

  if (normalizedProvider === "anthropic") {
    effectiveModelId = modelId || "claude-3-5-sonnet-20241022";
    effectiveProvider = "anthropic";
  } else if (normalizedProvider.includes("google") || normalizedProvider.includes("gemini")) {
    effectiveModelId = modelId || "gemini-2.5-flash";
    effectiveProvider = "google";
  } else {
    effectiveModelId = modelId || "gpt-4o-mini";
    effectiveProvider = provider || "openai";
  }

  return {
    id: effectiveModelId,
    provider: effectiveProvider,
    baseUrl: baseUrl || "",
  };
};

const formatToolResult = (value: unknown, maxLen = 4000) => {
  const text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  return text.length > maxLen ? `${text.slice(0, maxLen)}\n...[truncated]` : text;
};

const uniqueStrings = (items: string[]) =>
  [...new Set(items.map((item) => item.trim()).filter(Boolean))];

const getDdgHeaders = () => ({
  "User-Agent": DDG_USER_AGENTS[Math.floor(Math.random() * DDG_USER_AGENTS.length)],
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Referer": "https://duckduckgo.com/",
  "Origin": "https://duckduckgo.com",
  "Cache-Control": "no-cache",
});

const waitForDdgSlot = async () => {
  const now = Date.now();
  const delta = now - lastDdgRequestAt;
  if (delta < DDG_MIN_INTERVAL_MS) {
    await new Promise(resolve => setTimeout(resolve, DDG_MIN_INTERVAL_MS - delta));
  }
  lastDdgRequestAt = Date.now();
};

const normalizeDdgHref = (rawHref: string) => {
  if (!rawHref) return "";
  if (/^https?:\/\//i.test(rawHref)) return rawHref;
  try {
    const full = new URL(rawHref, "https://duckduckgo.com");
    if (full.hostname.includes("duckduckgo.com") && full.searchParams.has("uddg")) {
      return decodeURIComponent(full.searchParams.get("uddg") || "");
    }
    return full.toString();
  } catch {
    return rawHref;
  }
};

const buildResearchAngles = (query: string, preset: DeepResearchPreset): ResearchAngle[] => {
  const normalized = query.trim();
  const baseAngles: ResearchAngle[] = [
    {
      angle: "Core question",
      goal: `Answer the main question directly: ${normalized}`,
      query: normalized,
      sourceType: "web",
    },
    {
      angle: "Background and definitions",
      goal: `Ground terminology, entities, and timeline context for ${normalized}`,
      query: normalized,
      sourceType: "wiki",
    },
    {
      angle: "Primary or official sources",
      goal: `Find official pages, docs, company sites, or authoritative records related to ${normalized}`,
      query: `${normalized} official source`,
      sourceType: "web",
    },
    {
      angle: "Analysis and expert context",
      goal: `Find expert analysis, detailed explainers, or third-party evaluation related to ${normalized}`,
      query: `${normalized} analysis`,
      sourceType: "web",
    },
    {
      angle: "Research literature",
      goal: `Find papers or technical publications related to ${normalized}`,
      query: normalized,
      sourceType: "scholar",
    },
  ];

  if (preset === "extreme") {
    baseAngles.push(
      {
        angle: "Recent developments",
        goal: `Check recent developments, updates, or changes related to ${normalized}`,
        query: `${normalized} latest developments`,
        sourceType: "web",
      },
      {
        angle: "Contradictions and risks",
        goal: `Look for disagreement, limitations, criticism, or unresolved issues around ${normalized}`,
        query: `${normalized} criticism limitations controversy`,
        sourceType: "web",
      }
    );
  }

  return baseAngles;
};

const buildOutline = (query: string, angles: ResearchAngle[], preset: DeepResearchPreset) => {
  const sections = uniqueStrings([
    "Executive summary",
    "Question framing",
    ...angles.map((angle) => angle.angle),
    "Cross-source validation",
    preset === "extreme" ? "Open questions and edge cases" : "",
    "Final synthesis",
    "Sources",
  ]);

  return [
    `Research objective: ${query}`,
    ...sections.map((section, index) => `${index + 1}. ${section}`),
  ].join("\n");
};

const createCheckpoint = (title: string, evidenceItems: string[], toolCalls: DeepResearchEvent[]): ResearchCheckpoint => {
  const recentEvidence = evidenceItems.slice(-5);
  const recentTools = toolCalls.slice(-6).map((event) => `${event.label}: ${event.resultSummary || event.status}`);
  return {
    title,
    summary: recentEvidence.length
      ? `Recent evidence highlights: ${recentEvidence.join(" | ")}`
      : "Research is still gathering evidence.",
    evidence: recentTools.slice(-4),
    openQuestions: [
      "Which claims still rely on a single source?",
      "What important facts need recency or primary-source verification?",
      "Which section of the outline still lacks enough evidence?",
    ],
  };
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
    try {
      await waitForDdgSlot();
      const response = await ddgSearch(query, {
        region: "wt-wt",
        safeSearch: -1,
        time: "y",
        offset: 0,
      });
      results = (response.results || []).slice(0, 10).map((item: any) => ({
        title: item.title || "Untitled",
        url: normalizeDdgHref(item.url || ""),
        snippet: item.description || "",
      })).filter((item: SearchResult) => !!item.url);
      if (results.length > 0) return;
    } catch {}

    await waitForDdgSlot();
    const url = new URL("https://duckduckgo.com/html/");
    url.searchParams.set("q", query);
    url.searchParams.set("kl", "wt-wt");
    url.searchParams.set("df", "y");
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: getDdgHeaders(),
    });
    if (!response.ok) {
      throw new Error(`DuckDuckGo HTML search failed with status ${response.status}`);
    }
    const html = await response.text();
    const $ = loadHtml(html);
    const seen = new Set<string>();
    const parsed: SearchResult[] = [];
    $(".result").each((_, element) => {
      if (parsed.length >= 10) return false;
      const anchor = $(element).find(".result__title a, .result__a").first();
      const title = anchor.text().replace(/\s+/g, " ").trim();
      const snippet = $(element).find(".result__snippet").first().text().replace(/\s+/g, " ").trim();
      const href = normalizeDdgHref(anchor.attr("href") || "");
      if (!href || seen.has(href)) return;
      seen.add(href);
      parsed.push({
        title: title || "Untitled",
        url: href,
        snippet,
      });
    });
    results = parsed;
  };

  try {
    if (preferredProvider === "duckduckgo" || preferredProvider === "ddg") {
      try { await tryDdg(); } catch {}
      if (results.length === 0) {
        try { await tryTavily(); } catch {}
      }
      if (results.length === 0) {
        try { await trySerper(); } catch {}
      }
    } else if (preferredProvider === "serpapi") {
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
  const $ = loadHtml(html);
  $("script, style, noscript").remove();
  const title = $("title").first().text().trim() || url;
  const markdown = turndown.turndown($.html("body") || html);
  const text = $("body").text().replace(/\s+/g, " ").trim();
  const resolveAssetUrl = (candidate: string) => {
    try {
      return new URL(candidate, url).toString();
    } catch {
      return candidate;
    }
  };
  const links = extractLinks
    ? uniqueStrings(
        $("a[href]")
          .map((_, element) => resolveAssetUrl($(element).attr("href") || ""))
          .get()
      ).slice(0, 40)
    : [];
  const images = uniqueStrings(
    $("img[src]")
      .map((_, element) => resolveAssetUrl($(element).attr("src") || ""))
      .get()
  )
    .filter(Boolean)
    .slice(0, 24);
  const tables = extractTables
    ? $("table")
        .map((_, table) =>
          $(table)
            .text()
            .replace(/\s+/g, " ")
            .trim()
        )
        .get()
        .filter(Boolean)
        .slice(0, 10)
    : [];

  return {
    url,
    outputFormat,
    extractLinks,
    extractTables,
    title,
    rawText: text,
    links,
    images,
    tables,
    content: outputFormat === "html" ? html : outputFormat === "json" ? { title, text, links, tables } : markdown || text,
  };
}

const extractHtmlBlock = (content: string) => {
  const match = String(content || "").match(/```html\s*([\s\S]*?)```/i);
  return match ? match[1].trim() : "";
};

const buildVisualReportPrompt = ({
  query,
  markdownReport,
  imageUrls,
}: {
  query: string;
  markdownReport: string;
  imageUrls: string[];
}) => [
  "Transform the research findings below into a standalone HTML visual report.",
  "Return exactly one fenced ```html block and nothing else.",
  "The HTML must be self-contained with embedded CSS and no external JavaScript dependencies.",
  "Design direction: premium editorial deep research report with a strong hero, elegant typography, section navigation, insight cards, timeline/segmented story flow, people spotlights when relevant, and source-aware callouts.",
  "Use only the provided image URLs if you include images. Do not invent new URLs.",
  "If the topic involves people, create clean people/profile segments.",
  "Keep the output production-ready and suitable for preview inside an app canvas.",
  `Topic: ${query}`,
  imageUrls.length
    ? `Available image URLs:\n${imageUrls.slice(0, 12).map((item, index) => `${index + 1}. ${item}`).join("\n")}`
    : "Available image URLs: none",
  `Research report in Markdown:\n${markdownReport}`,
].join("\n\n");

export async function runDeepResearch(params: DeepResearchRunParams): Promise<DeepResearchRunResult> {
  const minimums = getDeepResearchMinimums(params.preset);
  const toolCalls: DeepResearchEvent[] = [];
  const evidenceLedger: string[] = [];
  const imageLedger: string[] = [];
  const researchAngles = buildResearchAngles(params.query, params.preset);
  const initialOutline = buildOutline(params.query, researchAngles, params.preset);
  const emit = async (event: DeepResearchStreamEvent) => {
    await params.onEvent?.(event);
  };
  const emitPipelineNode = async (node: DeepResearchEvent) => {
    toolCalls.push(node);
    await emit({ type: "pipeline", node: { ...node } });
  };

  await emitPipelineNode({
    id: randomId("dr_ai"),
    type: "ai",
    label: "planner",
    status: "complete",
    icon: "compass",
    resultSummary: formatToolResult({
      outline: initialOutline,
      angles: researchAngles,
    }, 1200),
  });

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
    await emitPipelineNode({ ...event });
    try {
      const result = await fn();
      event.status = "complete";
      event.resultSummary = formatToolResult(result, 700);
      if (typeof result === "string") {
        evidenceLedger.push(result.slice(0, 220));
      } else if (Array.isArray(result)) {
        evidenceLedger.push(
          result
            .map((item) => {
              if (typeof item === "string") return item;
              if (item && typeof item === "object") {
                return JSON.stringify(item).slice(0, 180);
              }
              return String(item);
            })
            .join(" | ")
            .slice(0, 260)
        );
      } else if (result && typeof result === "object") {
        evidenceLedger.push(JSON.stringify(result).slice(0, 260));
        const maybeImages = Array.isArray((result as any).images) ? (result as any).images : [];
        for (const image of maybeImages) {
          if (typeof image === "string" && /^https?:\/\//i.test(image)) {
            imageLedger.push(image);
          }
        }
      }
      await emit({ type: "pipeline", node: { ...event } });
      return result;
    } catch (error: any) {
      event.status = "failed";
      event.resultSummary = error?.message || "Tool failed";
      await emit({ type: "pipeline", node: { ...event } });
      throw error;
    }
  };

  const researchUsesProvidedLlm = isOpenAiCompatibleResearchProvider(params.provider, params.baseUrl, params.model);
  const effectiveModel = researchUsesProvidedLlm
    ? ensureModel(params.model)
    : ensureModel(process.env.AI_MODEL || process.env.OPENAI_MODEL || "gpt-4o-mini");
  const effectiveApiKey = researchUsesProvidedLlm
    ? (params.apiKey || process.env.AI_API_KEY || process.env.OPENAI_API_KEY || "not-needed")
    : (process.env.AI_API_KEY || process.env.OPENAI_API_KEY || "not-needed");
  const effectiveBaseUrl = researchUsesProvidedLlm
    ? (params.baseUrl || process.env.AI_BASE_URL || "").replace(/\/+$/, "")
    : (process.env.AI_BASE_URL || "").replace(/\/+$/, "");

  if (!researchUsesProvidedLlm) {
    await emitPipelineNode({
      id: randomId("dr_ai"),
      type: "ai",
      label: "provider fallback",
      status: "complete",
      icon: "alert-triangle",
      resultSummary: `Deep research currently runs through an OpenAI-compatible client. Active provider "${params.provider || "unknown"}" was skipped for research and fell back to ${effectiveBaseUrl || "default OpenAI-compatible configuration"}.`,
    });
  }

  const piModel = buildPiResearchModel(effectiveModel, params.provider, effectiveBaseUrl);
  const checkpointOne = createCheckpoint("Initial research memory", evidenceLedger, toolCalls);

  const researchWorkspace = createWorkspaceDir();

  const piTools: any = {
    current_time: {
      description: "Get the current local date, time, timezone, timestamp, and ISO datetime before beginning research.",
      parameters: z.object({}) as any,
      execute: async () => {
        const result = await trackTool("current_time", {}, "clock", async () => {
          const now = new Date();
          return {
            iso: now.toISOString(),
            locale: now.toLocaleString(),
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            unixMs: now.getTime(),
          };
        });
        return JSON.stringify(result);
      },
    },
    search: {
      description: "Search the web for recent and relevant sources.",
      parameters: z.object({
        query: z.array(z.string()),
      }) as any,
      execute: async (paramsValue: any) => {
        const result = await trackTool("search", { query: paramsValue.query }, "search", async () => {
          const batches = await Promise.all((paramsValue.query || []).map((item: string) => runSearch(item, params.tavilyKey, params.serpKey, params.provider)));
          return (paramsValue.query || []).map((item: string, index: number) => ({ query: item, results: batches[index] }));
        });
        return JSON.stringify(result);
      },
    },
    google_scholar: {
      description: "Find academic and publication-heavy sources.",
      parameters: z.object({
        query: z.array(z.string()),
      }) as any,
      execute: async (paramsValue: any) => {
        const result = await trackTool("google_scholar", { query: paramsValue.query }, "search", async () => {
          const batches = await Promise.all((paramsValue.query || []).map((item: string) => runSearch(`${item} research paper`, params.tavilyKey, params.serpKey, params.provider)));
          return (paramsValue.query || []).map((item: string, index: number) => ({ query: item, results: batches[index] }));
        });
        return JSON.stringify(result);
      },
    },
    visit: {
      description: "Open a web page and extract goal-focused evidence.",
      parameters: z.object({
        url: z.array(z.string()),
        goal: z.string(),
      }) as any,
      execute: async (paramsValue: any) => {
        const result = await trackTool("visit", { url: paramsValue.url, goal: paramsValue.goal }, "globe", async () => {
          const pages = await Promise.all((paramsValue.url || []).map((item: string) => scrapeUrl(item, "markdown", false, false)));
          return (paramsValue.url || []).map((item: string, index: number) => ({
            url: item,
            goal: paramsValue.goal,
            evidence: formatToolResult(pages[index]?.rawText, 3000),
          }));
        });
        return JSON.stringify(result);
      },
    },
    web_scrape: {
      description: "Extract fuller text from a high-value page.",
      parameters: z.object({
        url: z.string(),
        outputFormat: z.string().optional(),
        extractLinks: z.boolean().optional(),
        extractTables: z.boolean().optional(),
      }) as any,
      execute: async (paramsValue: any) => {
        const result = await trackTool("web_scrape", paramsValue, "globe", async () =>
          scrapeUrl(
            paramsValue.url,
            paramsValue.outputFormat || "markdown",
            Boolean(paramsValue.extractLinks),
            Boolean(paramsValue.extractTables)
          )
        );
        return JSON.stringify(result);
      },
    },
    wiki_search: {
      description: "Search Wikipedia for background context and entities.",
      parameters: z.object({
        query: z.string(),
        limit: z.number().optional(),
        language: z.string().optional(),
      }) as any,
      execute: async (paramsValue: any) => {
        const result = await trackTool("wiki_search", paramsValue, "globe", async () =>
          wikiSearch(paramsValue.query, paramsValue.limit || 5, paramsValue.language || "en")
        );
        return JSON.stringify(result);
      },
    },
    wiki_get_summary: {
      description: "Fetch a concise Wikipedia summary.",
      parameters: z.object({
        pageId: z.number(),
        language: z.string().optional(),
      }) as any,
      execute: async (paramsValue: any) => {
        const result = await trackTool("wiki_get_summary", paramsValue, "globe", async () =>
          wikiGetSummary(paramsValue.pageId, paramsValue.language || "en")
        );
        return JSON.stringify(result);
      },
    },
    wiki_get_page: {
      description: "Fetch a detailed Wikipedia page.",
      parameters: z.object({
        pageId: z.number(),
        language: z.string().optional(),
      }) as any,
      execute: async (paramsValue: any) => {
        const result = await trackTool("wiki_get_page", paramsValue, "globe", async () =>
          wikiGetPage(paramsValue.pageId, paramsValue.language || "en")
        );
        return JSON.stringify(result);
      },
    },
    wiki_get_related: {
      description: "Find related Wikipedia pages.",
      parameters: z.object({
        pageId: z.number(),
        limit: z.number().optional(),
        language: z.string().optional(),
      }) as any,
      execute: async (paramsValue: any) => {
        const result = await trackTool("wiki_get_related", paramsValue, "globe", async () =>
          wikiGetRelated(paramsValue.pageId, paramsValue.limit || 10, paramsValue.language || "en")
        );
        return JSON.stringify(result);
      },
    },
  };

  const modelInstance = buildProviderModel({
    provider: piModel.provider,
    modelId: piModel.id,
    apiKey: effectiveApiKey,
    baseUrl: piModel.baseUrl,
  });

  const systemPrompt = [
    DEEP_RESEARCH_SYSTEM_PROMPT,
    getDeepResearchPresetPrompt(params.preset),
    `Current date: ${new Date().toISOString().slice(0, 10)}`,
    `Deep research preset: ${params.preset}`,
    `Minimum wiki searches: ${minimums.minWikiSearches}`,
    `Minimum web scrapes: ${(minimums as any).minWebScrapes || minimums.minVisits || 1}`,
    `Minimum visit calls: ${minimums.minVisits}`,
    `Minimum search calls: ${minimums.minSearchCalls}`,
    `Research workspace: ${researchWorkspace}`,
    `Initial planner outline:\n${initialOutline}`,
    `Planned research angles:\n${researchAngles.map((angle, index) => `${index + 1}. ${angle.angle} - ${angle.goal} | query: ${angle.query} | source: ${angle.sourceType}`).join("\n")}`,
    `Compressed research memory checkpoint:\n${formatToolResult(checkpointOne, 1600)}`,
    "Use the available tools in loops to gather evidence across web search, wiki, visit, and scrape.",
    "Do not stop after one search pass. Re-search, compare, and refine until the outline is well-supported.",
    "When evidence is sufficient, write a polished Markdown report with section headings, synthesis, and sources.",
    "Your final answer must be the complete Markdown report only.",
  ].join("\n\n");

  const reportChunks: string[] = [];
  let activeReasoningNode: DeepResearchEvent | null = null;

  const ensureReasoningNodeActive = async () => {
    if (!activeReasoningNode) {
      activeReasoningNode = {
        id: randomId("dr_ai"),
        type: "ai",
        label: "reasoning",
        status: "active",
        icon: "sparkles",
        resultSummary: "Planning the next research move",
      };
      await emitPipelineNode(activeReasoningNode);
    }
  };

  const ensureReasoningNodeComplete = async (summary: string) => {
    if (activeReasoningNode) {
      activeReasoningNode.status = "complete";
      activeReasoningNode.resultSummary = summary;
      await emit({ type: "pipeline", node: { ...activeReasoningNode } });
      activeReasoningNode = null;
    }
  };

  // Start the first reasoning node immediately
  await ensureReasoningNodeActive();

  const promptText = [
    `Research question: ${params.query}`,
    `Required workflow:`,
    `1. Start with current_time.`,
    `2. Build evidence through web search, wiki, visit, and scrape in loops.`,
    `3. Cross-check claims using multiple sources whenever possible.`,
    `4. Use at least the requested minimum tool coverage from the system prompt.`,
    `5. End with a detailed Markdown report with a Sources section.`,
  ].join("\n");

  const resultStream = streamText({
    model: modelInstance,
    system: systemPrompt,
    prompt: promptText,
    maxSteps: 12,
    tools: piTools,
  } as any);

  for await (const chunk of resultStream.fullStream as any) {
    if (chunk.type === "text-delta") {
      await ensureReasoningNodeComplete("Updated the research narrative");
      const textDelta = chunk.text || chunk.textDelta || "";
      if (textDelta) {
        reportChunks.push(textDelta);
        await emit({ type: "report", chunk: textDelta, report: reportChunks.join("") });
      }
    } else if (chunk.type === "reasoning-delta") {
      await ensureReasoningNodeActive();
    } else if (chunk.type === "tool-call") {
      await ensureReasoningNodeComplete("Planned the next research move");
    } else if (chunk.type === "tool-result") {
      await ensureReasoningNodeActive();
    }
  }

  await ensureReasoningNodeComplete(reportChunks.length > 0 ? "Updated the research narrative" : "Completed planning");

  const report = reportChunks.join("").trim() || "Deep Research completed, but no report text was returned.";
  await emit({ type: "report", chunk: "", report });

  let htmlReport = "";
  try {
    const htmlResponse = await generateText({
      model: modelInstance,
      system: "Generate a self-contained HTML visual report. Return only a fenced ```html block.",
      prompt: buildVisualReportPrompt({
        query: params.query,
        markdownReport: report,
        imageUrls: uniqueStrings(imageLedger),
      }),
    });
    const htmlReportRaw = htmlResponse.text || "";
    htmlReport = extractHtmlBlock(htmlReportRaw) || htmlReportRaw.trim();
  } catch (error) {
    htmlReport = "";
  }

  const finalCheckpoint = createCheckpoint("Final research memory", evidenceLedger, toolCalls);

  await emitPipelineNode({
    id: randomId("dr_ai"),
    type: "ai",
    label: "memory checkpoint",
    status: "complete",
    icon: "database",
    resultSummary: formatToolResult(finalCheckpoint, 1200),
  });

  await emitPipelineNode({
    id: randomId("dr_ai"),
    type: "ai",
    label: "writer synthesis",
    status: "complete",
    icon: "sparkles",
    resultSummary: `${Math.round(report.length / 4)} tokens approx`,
  });

  if (htmlReport) {
    await emitPipelineNode({
      id: randomId("dr_ai"),
      type: "ai",
      label: "visual html report",
      status: "complete",
      icon: "layout",
      resultSummary: `${Math.round(htmlReport.length / 4)} tokens approx`,
    });
  }

  const result = {
    report,
    htmlReport: htmlReport || undefined,
    toolCalls,
  };
  await emit({ type: "final", result });
  return result;
}
