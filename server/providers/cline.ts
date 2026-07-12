import { Request, Response } from 'express';
import { handleOpenAI } from './openai.js';

export async function handleCline(
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
  const apiKey = options.apiKey || process.env.CLINE_API_KEY || '';
  return handleOpenAI(req, res, {
    ...options,
    apiKey,
    baseUrl: options.baseUrl || 'https://api.cline.bot/api/v1'
  });
}