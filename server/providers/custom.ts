import { Request, Response } from 'express';
import { handleOpenAI } from './openai.js';

// Custom / Local provider - uses whatever baseUrl the user provides
export async function handleCustom(
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
  // Custom provider uses the user-configured baseUrl directly
  // Default to localhost for local development
  const baseUrl = options.baseUrl || 'http://localhost:8080/v1';
  
  return handleOpenAI(req, res, {
    ...options,
    baseUrl
  });
}