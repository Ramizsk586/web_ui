import { Request, Response } from 'express';
import { handleOpenAI } from './openai.js';

export async function handleOllama(
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
  // Ollama supports both cloud (ollama.com) and local (localhost) endpoints
  // For local, apiKey defaults to 'ollama' (any non-empty string works as no auth is used locally)
  let baseUrl = options.baseUrl;
  
  if (!baseUrl || baseUrl === 'https://ollama.com/v1') {
    baseUrl = 'https://ollama.com/v1';
  } else if (!baseUrl.includes('localhost') && !baseUrl.includes('127.0.0.1')) {
    // Cloud endpoint
  }
  
  // For local Ollama, ensure API key is set to any non-empty value to satisfy OpenAI-compatible auth header
  const apiKey = (baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1'))
    ? (options.apiKey || 'ollama')
    : options.apiKey;
  
  return handleOpenAI(req, res, {
    ...options,
    apiKey,
    baseUrl
  });
}