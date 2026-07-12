/**
 * bridge-client.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Configures the Anthropic SDK client to target Lumina's own built-in Anthropic
 * proxy server (POST /v1/messages) rather than the real Anthropic API.
 *
 * The proxy (registered in server.ts) transparently maps incoming claude-* model
 * requests to whichever LLM provider profile the user configured in the
 * Anthropic Proxy settings panel, including local / OpenAI-compatible backends.
 *
 * Usage:
 *   import { getLuminaAnthropicClient, chatCompletion } from './bridge-client.js';
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';

// ── Environment ───────────────────────────────────────────────────────────────

/** Port Lumina's Express server listens on (default 3000). */
const LUMINA_PORT = process.env.LUMINA_PORT ?? process.env.PORT ?? '3000';

/** Base URL of Lumina's Anthropic proxy endpoint. */
export const PROXY_BASE_URL = `http://127.0.0.1:${LUMINA_PORT}`;

/**
 * Default model alias to use for Master-Agent calls through the proxy.
 * The proxy will map this to whichever profile the user mapped for "sonnet".
 * Any claude-* model string works; the proxy detects opus/sonnet/haiku in the name.
 */
export const DEFAULT_AGENT_MODEL = process.env.LUMINA_AGENT_MODEL ?? 'claude-3-5-sonnet-20241022';

export function configureBridgeEnvironment(): void {
  const port = process.env.LUMINA_PORT ?? process.env.PORT ?? '3000';

  // Always point ANTHROPIC_BASE_URL to Lumina's local proxy so that requests
  // for all three models (haiku, sonnet, opus) are intercepted and mapped
  // according to the user's settings.
  process.env.ANTHROPIC_BASE_URL = `http://127.0.0.1:${port}/v1`;
  process.env.ANTHROPIC_AUTH_TOKEN = 'lumina-proxy';

  // Force the default model names to be the standard Claude ones so the proxy
  // can identify the requested model tier (haiku, sonnet, opus).
  process.env.ANTHROPIC_DEFAULT_HAIKU_MODEL = 'claude-3-haiku-20240307';
  process.env.ANTHROPIC_DEFAULT_SONNET_MODEL = 'claude-3-5-sonnet-20241022';
  process.env.ANTHROPIC_DEFAULT_OPUS_MODEL = 'claude-3-opus-20240229';
  process.env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC = "1";
}

// ── Shared Anthropic SDK client ───────────────────────────────────────────────

let _client: Anthropic | null = null;

/**
 * Returns (and lazily creates) an Anthropic SDK client pointed at Lumina's
 * own proxy server so all claude-* requests are routed through user-configured
 * LLM profiles instead of hitting api.anthropic.com directly.
 */
export function getLuminaAnthropicClient(): Anthropic {
  if (_client) return _client;
  _client = new Anthropic({
    apiKey: 'lumina-proxy',            // proxy ignores the key; placeholder required by SDK
    baseURL: `${PROXY_BASE_URL}/v1`,   // → http://127.0.0.1:3000/v1
  });
  return _client;
}

// ── Chat completion helper ────────────────────────────────────────────────────

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionOptions {
  model?: string;
  maxTokens?: number;
  systemPrompt?: string;
  tools?: Anthropic.Tool[];
  temperature?: number;
}

let _chatCompletionMock: ((messages: ChatMessage[], options: ChatCompletionOptions) => Promise<any>) | null = null;

export function setChatCompletionMock(mock: typeof chatCompletion | null): void {
  console.log('[setChatCompletionMock] Called with mock:', mock ? 'defined' : 'undefined');
  _chatCompletionMock = mock;
}

/**
 * Sends a single non-streaming chat completion through Lumina's proxy.
 * Returns the full Anthropic Message response object.
 */
export async function chatCompletion(
  messages: ChatMessage[],
  options: ChatCompletionOptions = {}
): Promise<Anthropic.Message> {
  if (_chatCompletionMock) {
    return _chatCompletionMock(messages, options);
  }
  const client = getLuminaAnthropicClient();
  const {
    model = DEFAULT_AGENT_MODEL,
    maxTokens = 4096,
    systemPrompt,
    tools,
    temperature,
  } = options;

  const requestBody: Anthropic.MessageCreateParamsNonStreaming = {
    model,
    max_tokens: maxTokens,
    messages: messages as Anthropic.MessageParam[],
    ...(systemPrompt && { system: systemPrompt }),
    ...(tools && tools.length > 0 && { tools }),
    ...(temperature !== undefined && { temperature }),
  };

  return await client.messages.create(requestBody);
}

/**
 * Streams a chat completion through Lumina's proxy, yielding text delta chunks.
 * Suitable for real-time console or SSE output.
 */
export async function* streamCompletion(
  messages: ChatMessage[],
  options: ChatCompletionOptions = {}
): AsyncGenerator<string> {
  const client = getLuminaAnthropicClient();
  const { model = DEFAULT_AGENT_MODEL, maxTokens = 4096, systemPrompt } = options;

  const stream = await client.messages.stream({
    model,
    max_tokens: maxTokens,
    messages: messages as Anthropic.MessageParam[],
    ...(systemPrompt && { system: systemPrompt }),
  });

  for await (const event of stream) {
    if (
      event.type === 'content_block_delta' &&
      event.delta.type === 'text_delta'
    ) {
      yield event.delta.text;
    }
  }
}
