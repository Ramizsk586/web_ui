import { Request, Response } from 'express';
import axios from 'axios';
import { 
  wait, 
  isRetryableError, 
  getRetryDelayMs
} from './utils.js';

export async function handleAnthropic(
  req: Request,
  res: Response,
  options: {
    model: string;
    apiKey: string;
    baseUrl: string;
    messages: any[];
    finalSystemPrompt: string;
  }
) {
  const { model, apiKey, baseUrl, messages, finalSystemPrompt } = options;
  const MAX_RETRIES = 3;
  let response;
  let lastError: any;
  const targetUrl = baseUrl.includes('/v1') ? `${baseUrl}/messages` : `${baseUrl}/v1/messages`;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      response = await axios.post(
        targetUrl,
        {
          model: model || 'claude-3-5-sonnet-20241022',
          max_tokens: 4096,
          system: finalSystemPrompt || undefined,
          messages: messages.map((m: any) => ({
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content: m.content
          })),
          stream: true
        },
        {
          headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json'
          },
          responseType: 'stream',
          timeout: 60000
        }
      );
      break;
    } catch (err: any) {
      lastError = err;
      if (isRetryableError(err) && attempt < MAX_RETRIES) {
        const delay = getRetryDelayMs(err, Math.pow(2, attempt) * 1000);
        console.warn(`[Anthropic] Retryable error (${err.code || err.response?.status}), retry ${attempt + 1}/${MAX_RETRIES} in ${delay}ms...`);
        await wait(delay);
        continue;
      }
      throw err;
    }
  }

  if (!response) throw lastError || new Error('Anthropic connection failed');

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const decoder = new TextDecoder();
  response.data.on('data', (chunk: Buffer) => {
    const text = decoder.decode(chunk, { stream: true });
    const lines = text.split('\n').filter((l: string) => l.trim());
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6));
          if (data.type === 'content_block_delta' && data.delta?.text) {
            res.write(data.delta.text);
          }
        } catch {}
      }
    }
  });
  response.data.on('end', () => res.end());
  response.data.on('error', (err: any) => {
    console.error('Anthropic stream error:', err);
    res.end();
  });
}
