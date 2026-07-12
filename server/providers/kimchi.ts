import { Request, Response } from 'express';
import { handleOpenAI } from './openai.js';

export function resolveKimchiApiKey(apiKey: string): string {
  if (apiKey && apiKey.trim() !== '') {
    return apiKey.trim();
  }
  return process.env.KIMCHI_API_KEY || process.env.CASTAI_API_KEY || '';
}

export async function handleKimchi(
  req: Request,
  res: Response,
  options: {
    model: string;
    apiKey: string;
    baseUrl: string;
    apiMessages: any[];
    tools: any[];
    stream: boolean;
  }
) {
  const apiKey = resolveKimchiApiKey(options.apiKey);
  return handleOpenAI(req, res, {
    ...options,
    apiKey,
    baseUrl: options.baseUrl || 'https://llm.kimchi.dev/openai/v1'
  });
}
