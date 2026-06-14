/**
 * Llama Bridge client for Lumina.
 * All tools are sourced from the bridge - no built-in tool duplication.
 */
import type { ToolDefinition } from './types';
import { ALL_WIKI_TOOLS } from './tools/wikiTools';

export const registeredTools: ToolDefinition[] = [];

export function registerTool(tool: ToolDefinition): void {
  const existing = registeredTools.find(t => t.function.name === tool.function.name);
  if (!existing) {
    registeredTools.push(tool);
  }
}

// Register default scrape and general Wikipedia tools on startup
ALL_WIKI_TOOLS.forEach(registerTool);

/**
 * Normalize a URL by removing trailing slash.
 */
function normalizeUrl(url: string): string {
  return url.replace(/\/+$/, '');
}

/**
 * Call the Llama Bridge chat completions endpoint.
 * Routes through the Express proxy to avoid CORS issues.
 */
export async function callLlamaBridge(
  messages: Array<{ role: string; content: string }>,
  tools: ToolDefinition[],
  options: {
    url: string;
    apiKey: string;
    model: string;
  }
): Promise<any> {
  const { url, apiKey, model } = options;

  // Use the Express proxy (same origin, no CORS issues)
  const proxyRes = await fetch('/api/bridge/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      bridgeUrl: normalizeUrl(url),
      apiKey,
      model,
      messages,
      tools: tools.length > 0 ? tools : undefined,
      stream: false,
    }),
  });

  if (proxyRes.ok) {
    return proxyRes.json();
  }

  // Fallback: try direct to bridge
  const baseUrl = normalizeUrl(url);
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const effectiveApiKey = apiKey || (baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1') ? 'ollama' : '');
  if (effectiveApiKey) headers['Authorization'] = `Bearer ${effectiveApiKey}`;

  const body: Record<string, any> = { model, messages, stream: false };
  if (tools.length > 0) {
    body.tools = tools;
    body.tool_choice = 'auto';
  }

  const res = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`Llama Bridge error ${res.status}: ${res.statusText}`);
  }

  return res.json();
}

/**
 * Fetch tools available from the Llama Bridge via the Express proxy.
 * This avoids CORS issues by routing through the same-origin server.
 */
export async function fetchBridgeTools(
  bridgeUrl: string,
  apiKey: string
): Promise<Array<{ id: string; name: string; description: string; enabled: boolean; icon?: string }>> {
  try {
    // Use the Express proxy (same origin, no CORS issues)
    const res = await fetch('/api/bridge/tools', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bridgeUrl: normalizeUrl(bridgeUrl), apiKey }),
    });
    if (res.ok) {
      const data = await res.json();
      const toolsList = data.tools || data.data || [];
      return toolsList.map((t: any) => ({
        id: t.function?.name || t.name || t.id,
        name: t.function?.name || t.name || t.id,
        description: t.function?.description || t.description || '',
        enabled: false,
        parameters: t.function?.parameters || t.parameters,
      }));
    }
  } catch (e) {
    console.warn('Bridge proxy tool discovery failed, trying direct...');
  }

  // Fallback: try direct (some bridges handle CORS)
  const baseUrl = normalizeUrl(bridgeUrl);
  const headers: Record<string, string> = {};
  const effectiveApiKey = apiKey || (baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1') ? 'ollama' : '');
  if (effectiveApiKey) headers['Authorization'] = `Bearer ${effectiveApiKey}`;

  try {
    const res = await fetch(`${baseUrl}/v1/tools`, { headers, mode: 'cors' });
    if (res.ok) {
      const data = await res.json();
      const toolsList = data.tools || data.data || [];
      return toolsList.map((t: any) => ({
        id: t.function?.name || t.name,
        name: t.function?.name || t.name,
        description: t.function?.description || t.description || '',
        enabled: false,
        parameters: t.function?.parameters || t.parameters,
      }));
    }
  } catch {}

  try {
    const res = await fetch(`${baseUrl}/api/tools`, { headers, mode: 'cors' });
    if (res.ok) {
      const data = await res.json();
      const toolsList = data.tools || data.data || [];
      return toolsList.map((t: any) => ({
        id: t.name,
        name: t.name,
        description: t.description || '',
        enabled: false,
        parameters: t.parameters,
      }));
    }
  } catch {}

  return [];
}

/**
 * Check health of the Llama Bridge server via the Express proxy.
 */
export async function checkBridgeHealth(
  bridgeUrl: string,
  apiKey: string
): Promise<boolean> {
  try {
    // Use the Express proxy (same origin, no CORS issues)
    const res = await fetch('/api/bridge/health', {
      headers: {
        'X-Bridge-Url': normalizeUrl(bridgeUrl),
        'X-Api-Key': apiKey,
      },
    });
    return res.ok;
  } catch {
    // Fallback: try direct
    try {
      const baseUrl = normalizeUrl(bridgeUrl);
      const headers: Record<string, string> = {};
      const effectiveApiKey = apiKey || (baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1') ? 'ollama' : '');
      if (effectiveApiKey) headers['Authorization'] = `Bearer ${effectiveApiKey}`;
      const res = await fetch(`${baseUrl}/health`, { headers, mode: 'cors' });
      return res.ok;
    } catch {
      return false;
    }
  }
}