/**
 * Llama Bridge client for Lumina.
 * Large async helpers extracted from App.tsx so the component
 * body stays readable and each function is independently testable.
 */
import type { ToolDefinition } from './types';

/**
 * Sinless no-op shim – the real Llama Bridge client.
 * Kept minimal here as a placeholder so the rest of the prompt can be implemented
 * with confidence.
 */
// ── helpers ─────────────────────────────────────────────────────────────────

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
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

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

export async function handleToolCalls(
  toolCalls: Array<{ id: string; function: { name: string; arguments: string } }>,
  conversationMessages: Array<{ role: string; content: string }>,
  options: {
    url: string;
    apiKey: string;
    model: string;
    bridgeMode: boolean; // not used yet; reserved for future MCP-to-bridge proxying
  }
): Promise<string> {
  const { url, apiKey, model } = options;

  const toolResults: any[] = [];

  for (const call of toolCalls) {
    const args = JSON.parse(call.function.arguments);
    let result: any;

    // ── built-in: web_search ──────────────────────────────────────────────
    if (call.function.name === 'web_search') {
      try {
        const r = await fetch('/api/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: args.query }),
        });
        result = await r.json();
      } catch (e) {
        result = { error: 'Web search failed' };
      }
    }
    // ── built-in: image_search ────────────────────────────────────────────
    else if (call.function.name === 'image_search') {
      try {
        const r = await fetch('/api/image-search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: args.query }),
        });
        result = await r.json();
      } catch (e) {
        result = { error: 'Image search failed' };
      }
    }
    // ── built-in: Wikipedia (via search backend) ──────────────────────────
    else if (call.function.name === 'wikipedia') {
      try {
        const r = await fetch('/api/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: args.query }),
        });
        const data = await r.json();
        result = { results: data.results || [] };
      } catch (e) {
        result = { error: 'Wikipedia search failed' };
      }
    }
    // ── MCP / third-party tools ───────────────────────────────────────────
    else {
      // MCP tools are executed by Llama Bridge itself; just acknowledge them.
      result = { status: 'forwarded', tool: call.function.name };
    }

    toolResults.push({
      role: 'tool' as const,
      tool_call_id: call.id,
      name: call.function.name,
      content: JSON.stringify(result),
    });
  }

  // Feed results back to the model
  const followUpMessages = [
    ...conversationMessages,
    { role: 'assistant', tool_calls: toolCalls },
    ...toolResults,
  ];

  const finalResponse = await callLlamaBridge(
    followUpMessages,
    [],
    { url, apiKey, model }
  );

  return finalResponse?.choices?.[0]?.message?.content ?? '';
}
