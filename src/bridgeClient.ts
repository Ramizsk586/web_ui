/**
 * Llama Bridge client for Lumina.
 * All tools are sourced from the bridge - no built-in tool duplication.
 */
import type { ToolDefinition } from './types';

/**
 * Call the Llama Bridge chat completions endpoint.
 * Tools are sent to the bridge and the bridge handles execution server-side.
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

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  // Use provided API key, or default to "ollama" for localhost bridge
  const effectiveApiKey = apiKey || (url.includes('localhost') || url.includes('127.0.0.1') ? 'ollama' : '');
  if (effectiveApiKey) headers['Authorization'] = `Bearer ${effectiveApiKey}`;

  const body: Record<string, any> = {
    model,
    messages,
    stream: false,
  };

  if (tools.length > 0) {
    body.tools = tools;
    body.tool_choice = 'auto';
  }

  const res = await fetch(`${url}/v1/chat/completions`, {
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
 * Fetch tools available from the Llama Bridge.
 * This replaces the old inbuiltTools approach - all tools come from the bridge.
 */
export async function fetchBridgeTools(
  bridgeUrl: string,
  apiKey: string
): Promise<Array<{ id: string; name: string; description: string; enabled: boolean; icon?: string }>> {
  const headers: Record<string, string> = {};
  // Use provided API key, or default to "ollama" for localhost bridge
  const effectiveApiKey = apiKey || (bridgeUrl.includes('localhost') || bridgeUrl.includes('127.0.0.1') ? 'ollama' : '');
  if (effectiveApiKey) headers['Authorization'] = `Bearer ${effectiveApiKey}`;

  try {
    // Try the OpenAI-compatible tools listing
    const res = await fetch(`${bridgeUrl}/v1/tools`, { headers });
    if (res.ok) {
      const data = await res.json();
      const toolsList = data.tools || data.data || [];
      return toolsList.map((t: any) => ({
        id: t.function?.name || t.name,
        name: t.function?.name || t.name,
        description: t.function?.description || t.description || '',
        enabled: true,
        parameters: t.function?.parameters || t.parameters,
      }));
    }
  } catch (e) {
    // Fall through to /api/tools
  }

  try {
    // Fallback to the bridge's /api/tools endpoint
    const res = await fetch(`${bridgeUrl}/api/tools`, { headers });
    if (res.ok) {
      const data = await res.json();
      const toolsList = data.tools || data.data || [];
      return toolsList.map((t: any) => ({
        id: t.name,
        name: t.name,
        description: t.description || '',
        enabled: true,
        parameters: t.parameters,
      }));
    }
  } catch (e) {
    // No tools available
  }

  return [];
}

/**
 * Check health of the Llama Bridge server.
 */
export async function checkBridgeHealth(
  bridgeUrl: string,
  apiKey: string
): Promise<boolean> {
  try {
    const headers: Record<string, string> = {};
    // Use provided API key, or default to "ollama" for localhost bridge
    const effectiveApiKey = apiKey || (bridgeUrl.includes('localhost') || bridgeUrl.includes('127.0.0.1') ? 'ollama' : '');
    if (effectiveApiKey) headers['Authorization'] = `Bearer ${effectiveApiKey}`;
    const res = await fetch(`${bridgeUrl}/health`, { headers });
    return res.ok;
  } catch {
    return false;
  }
}