import { Request, Response } from 'express';
import { handleOpenAI } from './openai.js';

export async function handleCohere(
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
  return handleOpenAI(req, res, {
    ...options,
    baseUrl: options.baseUrl || 'https://api.cohere.com/compatibility/v1'
  });
}
