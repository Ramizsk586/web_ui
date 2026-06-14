import { Request, Response } from 'express';
import { handleOpencode } from './opencode.js';
import { handleAnthropic } from './anthropic.js';
import { handleGoogle } from './google.js';
import { handleKimchi } from './kimchi.js';
import { handleCohere } from './cohere.js';
import { handleOpenAI } from './openai.js';
import { handleGroq } from './groq.js';
import { handleOpenRouter } from './openrouter.js';
import { handleTogether } from './together.js';
import { handleMistral } from './mistral.js';
import { handleNvidiaNim } from './nvidia_nim.js';
import { handleDeepSeek } from './deepseek.js';
import { handleSarvamAI } from './sarvamai.js';
import { handleKiloAI } from './kilo.js';
import { handleCline } from './cline.js';
import { handleOllama } from './ollama.js';
import { handleLmStudio } from './lmstudio.js';
import { handleOpenProvider } from './openprovider.js';
import { handleFreemodelOpenAI, handleFreemodelClaude } from './freemodel.js';
import { handleCustom } from './custom.js';

export { parseStreamError, getUpstreamErrorDetail, getUpstreamErrorStatus } from './utils.js';

export async function dispatchChatCompletion(
  req: Request,
  res: Response,
  options: {
    provider: string;
    model: string;
    apiKey: string;
    baseUrl: string;
    messages: any[];
    apiMessages: any[];
    tools: any[];
    stream: boolean;
    finalSystemPrompt: string;
  }
) {
  const { provider } = options;

  switch (provider) {
    case 'opencode':
      return handleOpencode(req, res, options);

    case 'anthropic':
      return handleAnthropic(req, res, options);

    case 'freemodel_claude':
      return handleFreemodelClaude(req, res, options);

    case 'freemodel_openai':
      return handleFreemodelOpenAI(req, res, options);

    case 'google-gemini':
    case 'gemini':
      return handleGoogle(req, res, options);

    case 'kimchi':
      return handleKimchi(req, res, options);

    case 'cohere':
      return handleCohere(req, res, options);

    case 'groq':
      return handleGroq(req, res, options);

    case 'openrouter':
      return handleOpenRouter(req, res, options);

    case 'together':
      return handleTogether(req, res, options);

    case 'mistral':
      return handleMistral(req, res, options);

    case 'nvidia_nim':
      return handleNvidiaNim(req, res, options);

    case 'deepseek':
      return handleDeepSeek(req, res, options);

    case 'sarvamai':
      return handleSarvamAI(req, res, options);

    case 'kilo':
      return handleKiloAI(req, res, options);

    case 'cline':
      return handleCline(req, res, options);

    case 'ollama_local':
    case 'ollama_cloud':
    case 'ollama':
      return handleOllama(req, res, options);

    case 'lm_studio':
      return handleLmStudio(req, res, options);

    case 'openprovider':
      return handleOpenProvider(req, res, options);

    case 'custom':
      return handleCustom(req, res, options);

    case 'openai':
    case 'openai-compatible':
    default:
      return handleOpenAI(req, res, options);
  }
}