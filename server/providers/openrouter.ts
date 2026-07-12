import { Request, Response } from 'express';
import { handleOpenAI } from './openai.js';

export async function handleOpenRouter(
  req: Request,
  res: Response,
  options: {
    model: string;
    apiKey: string;
    baseUrl: string;
    apiMessages: any[];
    tools: any[];
    stream: boolean;
    finalSystemPrompt: string;
  }
) {
  const apiKey = options.apiKey || process.env.OPENROUTER_API_KEY || '';
  return handleOpenAI(req, res, {
    ...options,
    apiKey,
    baseUrl: options.baseUrl || 'https://openrouter.ai/api/v1'
  });
}