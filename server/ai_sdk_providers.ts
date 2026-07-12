import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createGroq } from '@ai-sdk/groq';
import { createMistral } from '@ai-sdk/mistral';
import { createCohere } from '@ai-sdk/cohere';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';

export interface ProviderConfig {
  provider: string;
  modelId: string;
  apiKey?: string;
  baseUrl?: string;
}

// Providers directly supported by the AI SDK - use native SDK
const DIRECTLY_SUPPORTED_PROVIDERS = new Set([
  'openai',
  'anthropic',
  'google',
  'gemini',
  'google-gemini',
  'groq',
  'mistral',
  'cohere',
  'together',
  'openrouter',
  'deepseek',
  'zed',
  'copilot',
  'nvidia_nim',
  'kilo',
  'kimchi',
  'cline',
  'ollama',
  'ollama_local',
  'ollama_cloud',
  'lm_studio',
]);

function isDirectlySupportedProvider(provider: string): boolean {
  return DIRECTLY_SUPPORTED_PROVIDERS.has(provider.toLowerCase());
}

export function buildProviderModel(config: ProviderConfig) {
  const provider = String(config.provider || '').trim().toLowerCase();
  const modelId = String(config.modelId || '').trim();
  const baseUrl = config.baseUrl ? String(config.baseUrl).trim().replace(/\/+$/, '') : undefined;
  
  // Resolve default api keys from env if not provided
  let apiKey = config.apiKey || '';
  if (!apiKey) {
    if (provider === 'openai') apiKey = process.env.OPENAI_API_KEY || '';
    else if (provider === 'anthropic') apiKey = process.env.ANTHROPIC_API_KEY || '';
    else if (provider === 'google' || provider === 'gemini' || provider === 'google-gemini') {
      apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || '';
    }
    else if (provider === 'groq') apiKey = process.env.GROQ_API_KEY || '';
    else if (provider === 'mistral') apiKey = process.env.MISTRAL_API_KEY || '';
    else if (provider === 'cohere') apiKey = process.env.COHERE_API_KEY || '';
    else if (provider === 'together') apiKey = process.env.TOGETHER_API_KEY || '';
    else if (provider === 'openrouter') apiKey = process.env.OPENROUTER_API_KEY || '';
    else if (provider === 'deepseek') apiKey = process.env.DEEPSEEK_API_KEY || '';
    else if (provider === 'zed') apiKey = process.env.ZED_API_KEY || '';
    else if (provider === 'copilot') apiKey = process.env.COPILOT_API_KEY || '';
    
    // Generic fallback
    if (!apiKey) {
      apiKey = process.env.AI_API_KEY || '';
    }
  }

  // Handle native providers
  if (provider === 'openai') {
    const client = createOpenAI({
      apiKey: apiKey || undefined,
      baseURL: baseUrl,
    });
    return client(modelId || 'gpt-4o-mini');
  }

  if (provider === 'anthropic') {
    const client = createAnthropic({
      apiKey: apiKey || undefined,
      baseURL: baseUrl,
    });
    return client(modelId || 'claude-3-5-sonnet-20241022');
  }

  if (provider === 'google' || provider === 'gemini' || provider === 'google-gemini') {
    const client = createGoogleGenerativeAI({
      apiKey: apiKey || undefined,
      baseURL: baseUrl,
    });
    return client(modelId || 'gemini-2.5-flash');
  }

  if (provider === 'groq') {
    const client = createGroq({
      apiKey: apiKey || undefined,
      baseURL: baseUrl,
    });
    return client(modelId || 'llama-3.3-70b-versatile');
  }

  if (provider === 'mistral') {
    const client = createMistral({
      apiKey: apiKey || undefined,
      baseURL: baseUrl,
    });
    return client(modelId || 'mistral-large-latest');
  }

  if (provider === 'cohere') {
    const client = createCohere({
      apiKey: apiKey || undefined,
      baseURL: baseUrl,
    });
    return client(modelId || 'command-r-plus');
  }

  // Handle OpenAI-Compatible, custom, and opencode providers
  let finalBaseUrl = baseUrl;
  let finalApiKey = apiKey;

  switch (provider) {
    case 'opencode':
      finalBaseUrl = finalBaseUrl || 'https://opencode.ai/zen/v1';
      finalApiKey = finalApiKey || process.env.OPENCODE_API_KEY || '';
      break;
    case 'together':
      finalBaseUrl = finalBaseUrl || 'https://api.together.xyz/v1';
      break;
    case 'openrouter':
      finalBaseUrl = finalBaseUrl || 'https://openrouter.ai/api/v1';
      finalApiKey = finalApiKey || process.env.OPENROUTER_API_KEY || '';
      break;
    case 'deepseek':
      finalBaseUrl = finalBaseUrl || 'https://api.deepseek.com/v1';
      break;
    case 'zed':
      finalBaseUrl = finalBaseUrl || 'https://api.zed.dev/v1';
      break;
    case 'copilot':
      finalBaseUrl = finalBaseUrl || 'https://api.githubcopilot.com';
      break;
    case 'nvidia_nim':
      finalBaseUrl = finalBaseUrl || 'https://integrate.api.nvidia.com/v1';
      break;
    case 'kilo':
      finalBaseUrl = finalBaseUrl || 'https://api.kilo.ai/api/gateway';
      break;
    case 'kimchi':
      finalBaseUrl = finalBaseUrl || 'https://llm.kimchi.dev/openai/v1';
      finalApiKey = finalApiKey || process.env.KIMCHI_API_KEY || process.env.CASTAI_API_KEY || '';
      break;
    case 'cline':
      finalBaseUrl = finalBaseUrl || 'https://api.cline.bot/api/v1';
      finalApiKey = finalApiKey || process.env.CLINE_API_KEY || '';
      break;
    case 'openprovider':
      finalBaseUrl = finalBaseUrl || 'https://openprovider.mimika.in/v1';
      break;
    case 'sarvamai':
      finalBaseUrl = finalBaseUrl || 'https://api.sarvam.ai/v1';
      break;
    case 'ollama_local':
    case 'ollama_cloud':
    case 'ollama':
      if (!finalBaseUrl || finalBaseUrl === 'https://ollama.com/v1') {
        finalBaseUrl = 'https://ollama.com/v1';
      }
      if (finalBaseUrl.includes('localhost') || finalBaseUrl.includes('127.0.0.1') || finalBaseUrl.includes('10.0.')) {
        finalApiKey = finalApiKey || 'ollama';
      }
      break;
    case 'lm_studio':
      finalBaseUrl = finalBaseUrl || 'http://127.0.0.1:1234/v1';
      if (finalBaseUrl.includes('localhost') || finalBaseUrl.includes('127.0.0.1')) {
        finalApiKey = finalApiKey || 'lm-studio';
      }
      break;
    case 'custom':
      finalBaseUrl = finalBaseUrl || 'http://localhost:8080/v1';
      break;
    default:
      // Default to standard OpenAI or custom endpoint if one is specified
      break;
  }

  let cleanModel = modelId || 'deepseek-v4-flash';
  if (cleanModel.startsWith('opencode/')) {
    cleanModel = cleanModel.substring(9);
  }
  const modelLower = cleanModel.toLowerCase();

  // Determine dynamic routing URLs specifically for opencode
  let routingBaseUrl = finalBaseUrl;
  if (provider === 'opencode') {
    if (modelLower.startsWith('claude-')) {
      routingBaseUrl = finalBaseUrl || 'https://opencode.ai/zen/v1/messages';
    } else if (modelLower.startsWith('gpt-')) {
      routingBaseUrl = finalBaseUrl || 'https://opencode.ai/zen/v1/responses';
    } else if (modelLower.startsWith('gemini-')) {
      routingBaseUrl = finalBaseUrl || 'https://opencode.ai/zen/v1/models';
    }
  }

  // If provider is not directly supported, route through OpenAI-compatible converter
  if (!isDirectlySupportedProvider(provider)) {
    // Use openai-compatible converter for unsupported providers
    const client = createOpenAICompatible({
      name: provider,
      apiKey: finalApiKey || 'dummy-key',
      baseURL: routingBaseUrl || finalBaseUrl || 'http://localhost:8080/v1',
    });
    return client(cleanModel);
  }

  // Dynamic model-family routing for custom/fallback providers
  if (modelLower.startsWith('claude-')) {
    const client = createAnthropic({
      apiKey: finalApiKey || undefined,
      baseURL: routingBaseUrl,
    });
    return client(cleanModel);
  } else if (modelLower.startsWith('gpt-') || modelLower.startsWith('o1-') || modelLower.startsWith('o3-')) {
    const client = createOpenAI({
      apiKey: finalApiKey || undefined,
      baseURL: routingBaseUrl,
    });
    return client(cleanModel);
  } else if (modelLower.startsWith('gemini-')) {
    const client = createGoogleGenerativeAI({
      apiKey: finalApiKey || undefined,
      baseURL: routingBaseUrl,
    });
    return client(cleanModel);
  } else {
    // Fallback to OpenAI compatible client forcing chat completions
    const client = createOpenAI({
      apiKey: finalApiKey || 'dummy-key',
      baseURL: routingBaseUrl,
    });
    return client.chat(cleanModel);
  }
}
