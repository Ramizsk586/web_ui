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
  return handleOpenAI(req, res, {
    ...options,
    baseUrl: options.baseUrl || 'https://api.cline.bot/api/v1'
  });
}