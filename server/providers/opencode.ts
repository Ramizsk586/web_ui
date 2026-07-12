import { Request, Response } from 'express';
import axios from 'axios';
import { 
  wait, 
  isRetryableError, 
  getRetryDelayMs, 
  parseStreamError, 
  getUpstreamErrorDetail, 
  getUpstreamErrorStatus,
  normalizeLlmResponse
} from './utils.js';

export async function handleOpencode(
  req: Request,
  res: Response,
  options: {
    model: string;
    apiKey: string;
    baseUrl: string;
    messages: any[];
    stream: boolean;
    finalSystemPrompt: string;
  }
) {
  const { model, apiKey, baseUrl, messages, stream, finalSystemPrompt } = options;
  const resolvedApiKey = apiKey || process.env.OPENCODE_API_KEY || '';
  const MAX_RETRIES = 3;
  let lastError: any;

  let cleanModel = model || 'deepseek-v4-flash';
  if (cleanModel.startsWith('opencode/')) {
    cleanModel = cleanModel.substring(9);
  }

  const modelLower = cleanModel.toLowerCase();
  let format: 'openai' | 'anthropic' = 'openai';
  let targetUrl = '';
  let headers: Record<string, string> = { 'Content-Type': 'application/json' };
  let requestBody: any = {};

  // --- Build request based on model family ---
  if (modelLower.startsWith('claude-')) {
    format = 'anthropic';
    targetUrl = baseUrl.includes('messages') ? baseUrl : 'https://opencode.ai/zen/v1/messages';
    headers['x-api-key'] = resolvedApiKey;
    headers['anthropic-version'] = '2023-06-01';
    requestBody = {
      model: cleanModel,
      max_tokens: 4096,
      system: finalSystemPrompt || undefined,
      messages: messages.map((m: any) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content
      })),
      stream: stream !== false
    };
  } else {
    format = 'openai';
    if (modelLower.startsWith('gpt-')) {
      targetUrl = baseUrl.includes('responses') ? baseUrl : 'https://opencode.ai/zen/v1/responses';
    } else if (modelLower.startsWith('gemini-')) {
      targetUrl = baseUrl.includes('models') ? baseUrl : `https://opencode.ai/zen/v1/models/${cleanModel}`;
    } else {
      targetUrl = baseUrl.includes('chat/completions') ? baseUrl : 'https://opencode.ai/zen/v1/chat/completions';
    }

    if (resolvedApiKey) {
      headers['Authorization'] = `Bearer ${resolvedApiKey}`;
    }

    const apiMessages: any[] = [];
    if (finalSystemPrompt) {
      apiMessages.push({ role: 'system', content: finalSystemPrompt });
    }
    apiMessages.push(...messages.map((m: any) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content
    })));

    requestBody = {
      model: cleanModel,
      messages: apiMessages,
      stream: stream !== false
    };
  }

  // =============================================
  // NON-STREAMING PATH: return JSON directly
  // =============================================
  if (stream === false) {
    let response;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        response = await axios.post(targetUrl, requestBody, {
          headers,
          timeout: 120000
        });
        break;
      } catch (err: any) {
        lastError = err;
        if (isRetryableError(err) && attempt < MAX_RETRIES) {
          const delay = getRetryDelayMs(err, Math.pow(2, attempt) * 1000);
          console.warn(`[OpenCode] Retryable error (${err.code || err.response?.status}), retry ${attempt + 1}/${MAX_RETRIES} in ${delay}ms...`);
          await wait(delay);
          continue;
        }
        throw err;
      }
    }

    if (!response) throw lastError || new Error('OpenCode connection failed');

    // Anthropic format → normalize to OpenAI-compatible shape
    if (format === 'anthropic') {
      const data = response.data;
      const text = data.content?.map((c: any) => c.text || '').join('') || '';
      return res.json(normalizeLlmResponse({
        id: data.id || 'opencode-anthropic',
        object: 'chat.completion',
        model: data.model || cleanModel,
        choices: [{
          index: 0,
          message: { role: 'assistant', content: text },
          finish_reason: data.stop_reason || 'stop'
        }],
        usage: data.usage ? {
          prompt_tokens: data.usage.input_tokens || 0,
          completion_tokens: data.usage.output_tokens || 0,
          total_tokens: (data.usage.input_tokens || 0) + (data.usage.output_tokens || 0)
        } : undefined
      }));
    }

    // OpenAI format → pass through as-is
    return res.json(normalizeLlmResponse(response.data));
  }

  // =============================================
  // STREAMING PATH: pipe SSE chunks
  // =============================================
  let response;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      response = await axios.post(targetUrl, requestBody, {
        headers,
        responseType: 'stream',
        timeout: 120000
      });
      break;
    } catch (err: any) {
      lastError = err;
      if (isRetryableError(err) && attempt < MAX_RETRIES) {
        const delay = getRetryDelayMs(err, Math.pow(2, attempt) * 1000);
        console.warn(`[OpenCode] Retryable error (${err.code || err.response?.status}), retry ${attempt + 1}/${MAX_RETRIES} in ${delay}ms...`);
        await wait(delay);
        continue;
      }
      throw err;
    }
  }

  if (!response) throw lastError || new Error('OpenCode connection failed');

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const decoder = new TextDecoder();
  response.data.on('data', (chunk: Buffer) => {
    const text = decoder.decode(chunk, { stream: true });
    const lines = text.split('\n').filter((l: string) => l.trim());
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const dataStr = line.slice(6);
        if (dataStr === '[DONE]') continue;
        try {
          const data = JSON.parse(dataStr);
          if (format === 'anthropic') {
            if (data.type === 'content_block_delta' && data.delta?.text) {
              res.write(data.delta.text);
            }
          } else {
            const content = data.choices?.[0]?.delta?.content || '';
            if (content) {
              res.write(content);
            }
          }
        } catch {}
      }
    }
  });
  response.data.on('end', () => res.end());
  response.data.on('error', (err: any) => {
    console.error('OpenCode stream error:', err);
    res.end();
  });
}
