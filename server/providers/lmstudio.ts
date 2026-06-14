import { Request, Response } from 'express';
import { handleOpenAI } from './openai.js';

export async function handleLmStudio(
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
  // LM Studio defaults to local server at localhost:1234
  // No API key required for local LM Studio
  const baseUrl = options.baseUrl || 'http://127.0.0.1:1234/v1';
  const apiKey = (baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1'))
    ? (options.apiKey || 'lm-studio')
    : options.apiKey;
  
  return handleOpenAI(req, res, {
    ...options,
    apiKey,
    baseUrl
  });
}