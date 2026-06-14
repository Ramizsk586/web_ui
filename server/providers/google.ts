import { Request, Response } from 'express';
import axios from 'axios';
import { 
  wait, 
  isRetryableError, 
  getRetryDelayMs, 
  parseStreamError, 
  getUpstreamErrorDetail, 
  getUpstreamErrorStatus 
} from './utils.js';

export async function handleGoogle(
  req: Request,
  res: Response,
  options: {
    model: string;
    apiKey: string;
    baseUrl: string;
    apiMessages: any[];
    finalSystemPrompt: string;
  }
) {
  const { model, apiKey, baseUrl, apiMessages, finalSystemPrompt } = options;
  const MAX_RETRIES = 3;
  const url = `${baseUrl}/models/${model || 'gemini-2.5-flash'}:streamGenerateContent?alt=sse&key=${apiKey}`;
  let response;
  let lastError: any;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      response = await axios.post(
        url,
        {
          contents: apiMessages.map((m: any) => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }]
          })),
          systemInstruction: finalSystemPrompt ? {
            parts: [{ text: finalSystemPrompt }]
          } : undefined,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 8192
          }
        },
        {
          headers: { 'Content-Type': 'application/json' },
          responseType: 'stream',
          timeout: 60000
        }
      );
      break;
    } catch (err: any) {
      lastError = err;
      if (isRetryableError(err) && attempt < MAX_RETRIES) {
        const delay = getRetryDelayMs(err, Math.pow(2, attempt) * 1000);
        console.warn(`[Gemini] Retryable error (${err.code || err.response?.status}), retry ${attempt + 1}/${MAX_RETRIES} in ${delay}ms...`);
        await wait(delay);
        continue;
      }
      throw err;
    }
  }

  if (!response) throw lastError || new Error('Gemini connection failed');

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
          if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
            res.write(data.candidates[0].content.parts[0].text);
          }
        } catch {}
      }
    }
  });
  response.data.on('end', () => res.end());
  response.data.on('error', (err: any) => {
    console.error('Gemini stream error:', err);
    res.end();
  });
}
