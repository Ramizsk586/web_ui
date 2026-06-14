import { Request, Response } from 'express';
import { handleOpenAI } from './openai.js';

// freemodel_openai uses OpenAI-compatible endpoint
export async function handleFreemodelOpenAI(
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
    baseUrl: options.baseUrl || 'https://api.freemodel.dev'
  });
}

// freemodel_claude uses Anthropic-compatible endpoint
export async function handleFreemodelClaude(
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
    baseUrl: options.baseUrl || 'https://cc.freemodel.dev'
  });
}