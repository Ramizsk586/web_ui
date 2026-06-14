import { Request, Response } from 'express';
import { handleOpenAI } from './openai.js';

export async function handleNvidiaNim(
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
    baseUrl: options.baseUrl || 'https://integrate.api.nvidia.com/v1'
  });
}