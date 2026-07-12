import express from 'express';
import path from 'path';
import fs from 'fs';
import axios from 'axios';
import dotenv from 'dotenv';
import {
  anthropicToOpenAIRequest,
  openAIToAnthropicResponse,
  openAIToAnthropicStreamChunk,
  createInitialStreamState
} from './anthropicConverter.js';
import { dispatchChatCompletion, parseStreamError, getUpstreamErrorDetail, getUpstreamErrorStatus } from './providers/index.js';
import { ragBackend } from './rag_routes.js';


const PROVIDER_ENV_KEYS: Record<string, string> = {
  'openai': 'OPENAI_API_KEY',
  'anthropic': 'ANTHROPIC_API_KEY',
  'gemini': 'GEMINI_API_KEY',
  'google-gemini': 'GEMINI_API_KEY',
  'groq': 'GROQ_API_KEY',
  'deepseek': 'DEEPSEEK_API_KEY',
  'openrouter': 'OPENROUTER_API_KEY',
  'together': 'TOGETHER_API_KEY',
  'mistral': 'MISTRAL_API_KEY',
  'nvidia_nim': 'NVIDIA_API_KEY',
  'nvidia': 'NVIDIA_API_KEY',
  'cohere': 'COHERE_API_KEY',
  'sarvamai': 'SARVAM_API_KEY',
  'sarvam': 'SARVAM_API_KEY',
  'kilo': 'KILO_API_KEY',
  'opencode': 'OPENCODE_API_KEY',
  'zed': 'ZED_API_KEY',
  'copilot': 'COPILOT_API_KEY',
  'kimchi': 'KIMCHI_API_KEY',
  'cline': 'CLINE_API_KEY',
  'openprovider': 'AI_API_KEY',
  'custom': 'AI_API_KEY',
  'openai-compatible': 'AI_API_KEY',
  'freemodel_openai': 'FREEMODEL_API_KEY',
  'freemodel_claude': 'FREEMODEL_API_KEY',
};

const PROVIDER_DEFAULTS: Record<string, { endpoint: string; testModel: string }> = {
  'openai': { endpoint: 'https://api.openai.com/v1', testModel: 'gpt-4o-mini' },
  'anthropic': { endpoint: 'https://api.anthropic.com/v1', testModel: 'claude-3-5-haiku-20241022' },
  'gemini': { endpoint: 'https://generativelanguage.googleapis.com/v1beta', testModel: 'gemini-1.5-flash' },
  'google-gemini': { endpoint: 'https://generativelanguage.googleapis.com/v1beta', testModel: 'gemini-1.5-flash' },
  'groq': { endpoint: 'https://api.groq.com/openai/v1', testModel: 'llama-3.1-8b-instant' },
  'deepseek': { endpoint: 'https://api.deepseek.com/v1', testModel: 'deepseek-chat' },
  'openrouter': { endpoint: 'https://openrouter.ai/api/v1', testModel: 'meta-llama/llama-3.1-8b-instruct' },
  'together': { endpoint: 'https://api.together.xyz/v1', testModel: 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo' },
  'mistral': { endpoint: 'https://api.mistral.ai/v1', testModel: 'mistral-small-latest' },
  'nvidia_nim': { endpoint: 'https://integrate.api.nvidia.com/v1', testModel: 'meta/llama3-70b-instruct' },
  'nvidia': { endpoint: 'https://integrate.api.nvidia.com/v1', testModel: 'meta/llama3-70b-instruct' },
  'cohere': { endpoint: 'https://api.cohere.com/compatibility/v1', testModel: 'command-r' },
  'sarvamai': { endpoint: 'https://api.sarvam.ai/v1', testModel: 'sarvam-1' },
  'sarvam': { endpoint: 'https://api.sarvam.ai/v1', testModel: 'sarvam-1' },
  'kilo': { endpoint: 'https://api.kilo.ai/api/gateway', testModel: 'kilo-model-v1' },
  'opencode': { endpoint: 'https://opencode.ai/zen/v1', testModel: 'deepseek-v4-flash-free' },
  'zed': { endpoint: 'https://api.zed.dev/v1', testModel: 'gpt-4o' },
  'copilot': { endpoint: 'https://api.githubcopilot.com', testModel: 'gpt-4o' },
  'cline': { endpoint: 'https://api.cline.bot/api/v1', testModel: 'cline-agent-v1' },
  'kimchi': { endpoint: 'https://llm.kimchi.dev/openai/v1', testModel: 'kimi-k2.5' },
  'openprovider': { endpoint: 'https://openprovider.mimika.in/v1', testModel: 'auto-free' },
  'freemodel_openai': { endpoint: 'https://api.freemodel.dev/v1', testModel: 'gpt-5.5' },
  'freemodel_claude': { endpoint: 'https://cc.freemodel.dev', testModel: 'claude-opus-4-8' },
  'ollama': { endpoint: 'http://localhost:11434/v1', testModel: 'llama3.2' },
  'ollama_cloud': { endpoint: 'https://ollama.com/v1', testModel: 'llama3' },
  'ollama_local': { endpoint: 'http://127.0.0.1:11434/v1', testModel: 'llama3.2' },
  'lm_studio': { endpoint: 'http://127.0.0.1:1234/v1', testModel: 'lm-studio' },
  'custom': { endpoint: 'http://localhost:11434/v1', testModel: 'gpt-4o-mini' },
  'openai-compatible': { endpoint: 'http://localhost:11434/v1', testModel: 'gpt-4o-mini' },
};

function resolveApiKeyFromEnv(provider: string, fallback: string = ''): string {
  const envKey = PROVIDER_ENV_KEYS[provider];
  if (envKey && process.env[envKey]) {
    return process.env[envKey]!;
  }
  return fallback;
}

function resolveKimchiApiKey(apiKey: string): string {
  if (apiKey && apiKey.trim() !== '') {
    return apiKey.trim();
  }
  return process.env.KIMCHI_API_KEY || process.env.CASTAI_API_KEY || '';
}

const getLlmConfig = () => {
  try {
    const profilesPath = path.join(process.cwd(), '.lumina', 'provider_profiles.json');
    if (fs.existsSync(profilesPath)) {
      return JSON.parse(fs.readFileSync(profilesPath, 'utf8'));
    }
  } catch (e) {
    console.error("Failed to read provider profiles config file:", e);
  }
  return null;
};

const ANTHROPIC_CONFIG_PATH = path.join(process.cwd(), '.lumina', 'anthropic.json');

const getAnthropicConfig = () => {
  try {
    if (fs.existsSync(ANTHROPIC_CONFIG_PATH)) {
      return JSON.parse(fs.readFileSync(ANTHROPIC_CONFIG_PATH, 'utf8'));
    }
  } catch (e) {
    console.error("Failed to read anthropic config:", e);
  }
  return { opus: null, sonnet: null, haiku: null };
};

export function setupLlmRoutes(app: express.Express) {
  // Sync endpoint to save provider profiles from frontend to filesystem
  app.post("/api/llm/profiles", (req, res) => {
    try {
      const profilesPath = path.join(process.cwd(), '.lumina', 'provider_profiles.json');
      const configDir = path.dirname(profilesPath);
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }
      fs.writeFileSync(profilesPath, JSON.stringify(req.body, null, 2), 'utf8');

      // Update .env.local with LLM provider API keys
      if (Array.isArray(req.body)) {
        try {
          const envPath = path.resolve(process.cwd(), '.env.local');
          let envContent = '';
          if (fs.existsSync(envPath)) {
            envContent = fs.readFileSync(envPath, 'utf8');
          }

          const lines = envContent.split(/\r?\n/);
          const providerToEnvMap: Record<string, string> = {
            'openai': 'OPENAI_API_KEY',
            'google-gemini': 'GEMINI_API_KEY',
            'google': 'GEMINI_API_KEY',
            'gemini': 'GEMINI_API_KEY',
            'anthropic': 'ANTHROPIC_API_KEY',
            'deepseek': 'DEEPSEEK_API_KEY',
            'groq': 'GROQ_API_KEY',
            'mistral': 'MISTRAL_API_KEY',
            'cohere': 'COHERE_API_KEY',
            'nvidia': 'NVIDIA_API_KEY',
            'together': 'TOGETHER_API_KEY',
            'sarvam': 'SARVAM_API_KEY',
            'kilo': 'KILO_API_KEY',
            'opencode': 'OPENCODE_API_KEY',
            'zed': 'ZED_API_KEY',
            'copilot': 'COPILOT_API_KEY',
            'kimchi': 'KIMCHI_API_KEY',
            'freemodel_openai': 'FREEMODEL_API_KEY',
            'freemodel_claude': 'FREEMODEL_API_KEY',
          };

          const keysToUpdate: Record<string, string> = {};
          for (const profile of req.body) {
            if (!profile || !profile.provider) continue;
            const envVarName = providerToEnvMap[profile.provider.toLowerCase()];
            if (envVarName && profile.apiKey) {
              keysToUpdate[envVarName] = profile.apiKey;
            }
          }

          for (const [envVarName, apiKey] of Object.entries(keysToUpdate)) {
            let found = false;
            for (let i = 0; i < lines.length; i++) {
              if (lines[i].startsWith(`${envVarName}=`)) {
                lines[i] = `${envVarName}=${apiKey}`;
                found = true;
                break;
              }
            }
            if (!found) {
              lines.push(`${envVarName}=${apiKey}`);
            }
            process.env[envVarName] = apiKey;
          }

          fs.writeFileSync(envPath, lines.join('\n'), 'utf8');
        } catch (envErr) {
          console.error('[profiles sync] Error updating .env.local:', envErr);
        }
      }

      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Traffic logs polling endpoint
  app.get("/api/traffic-logs", (req, res) => {
    res.json((global as any).serverTrafficLogs || []);
  });

  // Get list of available models from app profiles
  app.get("/api/llm/models", async (req, res) => {
    try {
      const profiles = getLlmConfig();
      if (!profiles || !Array.isArray(profiles) || profiles.length === 0) {
        // Fallback to environment defaults
        return res.json([
          { id: 'openprovider/auto-free', name: 'Auto Free', provider: 'openprovider', endpoint: process.env.AI_BASE_URL || 'http://localhost:11434/v1' },
          { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', provider: 'anthropic', endpoint: 'https://api.anthropic.com' },
        ]);
      }

      const models = profiles.flatMap((profile: any) =>
        (profile.models || []).map((model: any) => ({
          id: model.id,
          name: model.name,
          provider: profile.provider,
          endpoint: profile.endpoint,
          apiKey: profile.apiKey,
        }))
      );
      res.json(models);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Chat completion endpoint using app's configured providers
  app.post("/api/llm/chat", async (req, res) => {
    const { model, messages, tools, stream, modelId } = req.body;

    if (!messages) {
      return res.status(400).json({ error: "messages are required" });
    }

    res.setHeader('Content-Type', stream ? 'application/x-ndjson' : 'application/json');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
      // Get model config - prefer modelId, then model
      const modelConfig = modelId || model;
      let endpoint = '';
      let apiKey = '';
      let modelName = modelConfig;

      // Check if it's a stored profile model
      const profiles = getLlmConfig();
      if (profiles && Array.isArray(profiles)) {
        for (const profile of profiles) {
          const foundModel = (profile.models || []).find((m: any) => m.id === modelConfig);
          if (foundModel) {
            endpoint = profile.endpoint;
            apiKey = profile.apiKey;
            modelName = foundModel.id;
            break;
          }
        }
      }

      // Fallback to environment variables
      if (!endpoint) {
        endpoint = process.env.AI_BASE_URL || 'http://localhost:11434/v1';
        apiKey = process.env.AI_API_KEY || '';
      }

      if (endpoint.includes('kimchi.dev')) {
        apiKey = resolveKimchiApiKey(apiKey);
      }

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (apiKey) {
        // Check if it's Anthropic
        if (endpoint.includes('anthropic') || endpoint.includes('cc.freemodel.dev')) {
          headers['x-api-key'] = apiKey;
          headers['anthropic-version'] = '2023-06-01';
        } else if (endpoint.includes('opencode.ai')) {
          headers['x-api-key'] = apiKey;
        } else {
          headers['Authorization'] = `Bearer ${apiKey}`;
        }
      }

      const body: Record<string, any> = {
        model: modelName,
        messages,
        stream: !!stream,
      };

      if (tools && tools.length > 0) {
        body.tools = tools;
        body.tool_choice = 'auto';
      }

      // Determine API path based on provider
      let apiPath = '/chat/completions';
      if (endpoint.includes('anthropic') || endpoint.includes('cc.freemodel.dev')) {
        apiPath = '/v1/messages';
      }

      const fullUrl = `${endpoint.replace(/\/$/, '')}${apiPath}`;
      console.log('[LLM Bridge] Calling:', fullUrl, 'model:', modelName);

      if (stream) {
        // Handle streaming response
        const response = await axios.post(fullUrl, body, {
          headers,
          timeout: 120000,
          responseType: 'stream'
        });

        response.data.on('data', (chunk: Buffer) => {
          res.write(chunk);
        });
        response.data.on('end', () => {
          res.end();
        });
        response.data.on('error', (err: Error) => {
          console.error('[LLM Bridge] Stream error:', err.message);
          res.end();
        });
      } else {
        const response = await axios.post(fullUrl, body, { headers, timeout: 120000 });
        res.json(response.data);
      }
    } catch (e: any) {
      console.error('[LLM Bridge] Error:', e.message);
      res.status(500).json({ error: e.message });
    }
  });

  // Health check
  app.get("/health", async (req, res) => {
    res.json({ status: 'ok', service: 'lumina-bridge' });
  });

  // List available models
  app.get("/v1/models", async (req, res) => {
    try {
      const profiles = getLlmConfig();
      const models: any[] = [];

      if (profiles && Array.isArray(profiles)) {
        for (const profile of profiles) {
          for (const model of profile.models || []) {
            models.push({
              id: model.id,
              object: 'model',
              created: Date.now() / 1000,
              owned_by: profile.provider,
              provider: profile.provider,
              endpoint: profile.endpoint,
            });
          }
        }
      }

      // Add fallback models
      if (models.length === 0) {
        models.push(
          { id: 'openprovider/auto-free', object: 'model', created: Date.now() / 1000, owned_by: 'openprovider' },
          { id: 'claude-sonnet-4-20250514', object: 'model', created: Date.now() / 1000, owned_by: 'anthropic' }
        );
      }

      res.json({ object: 'list', data: models });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Get specific model info
  app.get("/v1/models/:model_id", async (req, res) => {
    const { model_id } = req.params;
    const profiles = getLlmConfig();

    if (profiles && Array.isArray(profiles)) {
      for (const profile of profiles) {
        const model = (profile.models || []).find((m: any) => m.id === model_id);
        if (model) {
          return res.json({
            id: model.id,
            object: 'model',
            created: Date.now() / 1000,
            owned_by: profile.provider,
            provider: profile.provider,
            endpoint: profile.endpoint,
          });
        }
      }
    }

    res.json({
      id: model_id,
      object: 'model',
      created: Date.now() / 1000,
      owned_by: 'unknown',
    });
  });

  app.get("/api/anthropic/settings", (req, res) => {
    res.json(getAnthropicConfig());
  });

  app.post("/api/anthropic/settings", (req, res) => {
    try {
      const configDir = path.dirname(ANTHROPIC_CONFIG_PATH);
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }
      fs.writeFileSync(ANTHROPIC_CONFIG_PATH, JSON.stringify(req.body, null, 2), 'utf8');
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/v1/messages", async (req, res) => {
    const startTime = performance.now();
    const { model, stream } = req.body;
    const isStream = stream === true;

    const requestedModel = model || "";
    let tier: 'opus' | 'sonnet' | 'haiku' | null = null;
    if (requestedModel.toLowerCase().includes("opus")) {
      tier = "opus";
    } else if (requestedModel.toLowerCase().includes("sonnet")) {
      tier = "sonnet";
    } else if (requestedModel.toLowerCase().includes("haiku")) {
      tier = "haiku";
    }

    const config = getAnthropicConfig();
    let mapping = tier ? config[tier] : null;

    // Fallback to Llama Bridge if the tier is not explicitly mapped
    if (!mapping) {
      try {
        const settingsPath = path.join(process.cwd(), '.lumina', 'bridge_settings.json');
        if (fs.existsSync(settingsPath)) {
          const data = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
          if (data.bridgeUrl) {
            mapping = {
              modelId: requestedModel || 'gpt-4o-mini',
              endpoint: data.bridgeUrl,
              apiKey: data.apiKey || '',
              provider: 'llama-bridge'
            };
          }
        }
      } catch { }
    }

    let useDirectForward = false;
    let targetUrl = "https://api.anthropic.com/v1/messages";
    let apiKey = "";

    if (mapping) {
      if (
        mapping.provider === "anthropic" ||
        mapping.endpoint?.includes("anthropic.com") ||
        mapping.provider === "opencode" ||
        mapping.endpoint?.includes("opencode.ai") ||
        mapping.provider === "freemodel_claude" ||
        mapping.endpoint?.includes("cc.freemodel.dev") ||
        mapping.provider === "llama-bridge"
      ) {
        useDirectForward = true;
        const cleanEndpoint = mapping.endpoint.replace(/\/+$/, "");
        if (cleanEndpoint.endsWith("/v1")) {
          targetUrl = `${cleanEndpoint}/messages`;
        } else if (cleanEndpoint.endsWith("/v1/messages") || cleanEndpoint.endsWith("/messages")) {
          targetUrl = cleanEndpoint;
        } else {
          targetUrl = `${cleanEndpoint}/v1/messages`;
        }
        apiKey = mapping.apiKey;
      }
    } else {
      useDirectForward = true;
    }

    if (useDirectForward) {
      const headers: Record<string, string> = {
        'content-type': 'application/json',
      };

      const anthKey = apiKey || req.headers['x-api-key'] || req.headers['authorization'];
      if (anthKey) {
        let keyStr = String(anthKey).replace(/^Bearer\s+/i, '');
        if (targetUrl.includes('kimchi.dev') || (mapping && (mapping.provider === 'kimchi' || mapping.endpoint?.includes('kimchi.dev')))) {
          keyStr = resolveKimchiApiKey(keyStr);
        }
        headers['x-api-key'] = keyStr;
      }
      if (req.headers['anthropic-version']) {
        headers['anthropic-version'] = String(req.headers['anthropic-version']);
      } else {
        headers['anthropic-version'] = '2023-06-01';
      }
      if (req.headers['anthropic-beta']) {
        headers['anthropic-beta'] = String(req.headers['anthropic-beta']);
      }

      try {
        res.setHeader('Content-Type', isStream ? 'text/event-stream' : 'application/json');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        if (isStream) {
          const response = await axios.post(targetUrl, req.body, { headers, timeout: 120000, responseType: 'stream' });

          response.data.on('data', (chunk: Buffer) => res.write(chunk));
          response.data.on('end', () => {
            const latency = Math.round(performance.now() - startTime);
            if ((global as any).logServerTraffic) {
              (global as any).logServerTraffic({
                method: 'POST',
                endpoint: '/v1/messages',
                status: 200,
                statusText: 'OK',
                latency,
                type: 'ai',
                request: req.body,
                response: '[Streaming Response]'
              });
            }
            res.end();
          });
          response.data.on('error', (err: Error) => {
            console.error('[Anthropic Proxy Direct] Stream error:', err.message);
            const latency = Math.round(performance.now() - startTime);
            if ((global as any).logServerTraffic) {
              (global as any).logServerTraffic({
                method: 'POST',
                endpoint: '/v1/messages',
                status: 500,
                statusText: 'Stream Error',
                latency,
                type: 'ai',
                request: req.body,
                response: { error: err.message }
              });
            }
            res.end();
          });
        } else {
          const response = await axios.post(targetUrl, req.body, { headers, timeout: 120000 });
          const latency = Math.round(performance.now() - startTime);
          if ((global as any).logServerTraffic) {
            (global as any).logServerTraffic({
              method: 'POST',
              endpoint: '/v1/messages',
              status: response.status,
              statusText: response.statusText,
              latency,
              type: 'ai',
              request: req.body,
              response: response.data
            });
          }
          res.json(response.data);
        }
      } catch (err: any) {
        console.error('[Anthropic Proxy Direct] Error forwarding request:', err?.response?.data || err.message);
        const status = err?.response?.status || 500;
        const data = err?.response?.data || { error: { message: err.message } };
        const latency = Math.round(performance.now() - startTime);
        if ((global as any).logServerTraffic) {
          (global as any).logServerTraffic({
            method: 'POST',
            endpoint: '/v1/messages',
            status,
            statusText: err?.response?.statusText || 'Error',
            latency,
            type: 'ai',
            request: req.body,
            response: data
          });
        }
        res.status(status).json(data);
      }
      return;
    }

    // OpenAI Compatible Forwarding
    const openaiPayload = anthropicToOpenAIRequest(req.body, mapping.modelId);
    const targetEndpoint = mapping.endpoint.replace(/\/+$/, "");
    const hasV1 = targetEndpoint.endsWith('/v1') || targetEndpoint.includes('/v1/');
    const cleanEndpoint = (mapping.provider === 'llama-bridge' && !hasV1)
      ? `${targetEndpoint}/v1`
      : targetEndpoint;
    const fullUrl = `${cleanEndpoint}/chat/completions`;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    let mappingApiKey = mapping.apiKey;
    if (targetEndpoint.includes('kimchi.dev') || mapping.provider === 'kimchi') {
      mappingApiKey = resolveKimchiApiKey(mappingApiKey);
    }
    if (mappingApiKey) {
      if (mapping.provider === 'opencode' || targetEndpoint.includes('opencode.ai')) {
        headers['x-api-key'] = mappingApiKey;
      } else {
        headers['Authorization'] = `Bearer ${mappingApiKey}`;
      }
    }

    try {
      if (isStream) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        const response = await axios.post(fullUrl, openaiPayload, { headers, timeout: 120000, responseType: 'stream' });

        const streamState = createInitialStreamState();
        let buffer = '';

        response.data.on('data', (chunk: Buffer) => {
          buffer += chunk.toString('utf8');
          let boundary = buffer.indexOf('\n');
          while (boundary !== -1) {
            const line = buffer.substring(0, boundary).trim();
            buffer = buffer.substring(boundary + 1);
            boundary = buffer.indexOf('\n');

            if (line.startsWith('data:')) {
              const dataStr = line.substring(5).trim();
              if (dataStr === '[DONE]') {
                continue;
              }
              try {
                const chunkData = JSON.parse(dataStr);
                const anthEvents = openAIToAnthropicStreamChunk(chunkData, streamState, requestedModel);
                for (const ev of anthEvents) {
                  res.write(`event: ${ev.event}\n`);
                  res.write(`data: ${JSON.stringify(ev.data)}\n\n`);
                }
              } catch (e) {
                // ignore
              }
            }
          }
        });

        response.data.on('end', () => {
          const latency = Math.round(performance.now() - startTime);
          if ((global as any).logServerTraffic) {
            (global as any).logServerTraffic({
              method: 'POST',
              endpoint: '/v1/messages',
              status: 200,
              statusText: 'OK',
              latency,
              type: 'ai',
              request: req.body,
              response: '[Streaming Response]'
            });
          }
          if (!streamState.messageStopped) {
            if (streamState.messageStarted && streamState.activeContentIndex >= 0) {
              res.write(`event: content_block_stop\n`);
              res.write(`data: ${JSON.stringify({ type: "content_block_stop", index: streamState.activeContentIndex })}\n\n`);
            }
            res.write(`event: message_stop\n`);
            res.write(`data: ${JSON.stringify({ type: "message_stop" })}\n\n`);
            streamState.messageStopped = true;
          }
          res.end();
        });

        response.data.on('error', (err: Error) => {
          console.error('[Anthropic Proxy OpenAI Stream] Stream error:', err.message);
          const latency = Math.round(performance.now() - startTime);
          if ((global as any).logServerTraffic) {
            (global as any).logServerTraffic({
              method: 'POST',
              endpoint: '/v1/messages',
              status: 500,
              statusText: 'Stream Error',
              latency,
              type: 'ai',
              request: req.body,
              response: { error: err.message }
            });
          }
          res.end();
        });

      } else {
        const response = await axios.post(fullUrl, openaiPayload, { headers, timeout: 120000 });
        const anthResponse = openAIToAnthropicResponse(response.data, requestedModel);
        const latency = Math.round(performance.now() - startTime);
        if ((global as any).logServerTraffic) {
          (global as any).logServerTraffic({
            method: 'POST',
            endpoint: '/v1/messages',
            status: response.status,
            statusText: response.statusText,
            latency,
            type: 'ai',
            request: req.body,
            response: anthResponse
          });
        }
        res.json(anthResponse);
      }
    } catch (err: any) {
      console.error('[Anthropic Proxy OpenAI] Error calling endpoint:', err?.response?.data || err.message);
      const status = err?.response?.status || 500;
      const data = err?.response?.data || { error: { message: err.message } };
      const latency = Math.round(performance.now() - startTime);
      if ((global as any).logServerTraffic) {
        (global as any).logServerTraffic({
          method: 'POST',
          endpoint: '/v1/messages',
          status,
          statusText: err?.response?.statusText || 'Error',
          latency,
          type: 'ai',
          request: req.body,
          response: data
        });
      }
      res.status(status).json(data);
    }
  });

  // Chat completions
  app.post("/v1/chat/completions", async (req, res) => {
    const { model, messages, tools, stream, temperature, max_tokens, ...otherParams } = req.body;

    if (!messages) {
      return res.status(400).json({ error: 'messages are required' });
    }

    const isStream = stream === true;
    res.setHeader('Content-Type', isStream ? 'application/x-ndjson' : 'application/json');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
      let endpoint = '';
      let apiKey = '';
      let modelName = model;

      const profiles = getLlmConfig();
      if (profiles && Array.isArray(profiles)) {
        for (const profile of profiles) {
          const foundModel = (profile.models || []).find((m: any) => m.id === model);
          if (foundModel) {
            endpoint = profile.endpoint;
            apiKey = profile.apiKey;
            modelName = foundModel.id;
            break;
          }
        }
      }

      let reqApiKey = '';
      if (req.headers.authorization) {
        reqApiKey = String(req.headers.authorization).replace(/^Bearer\s+/i, '');
      } else if (req.headers['x-api-key']) {
        reqApiKey = String(req.headers['x-api-key']);
      }

      if (!endpoint) {
        endpoint = process.env.AI_BASE_URL || 'http://localhost:11434/v1';
        apiKey = apiKey || reqApiKey || process.env.AI_API_KEY || '';
      } else {
        apiKey = apiKey || reqApiKey;
      }

      if (endpoint.includes('kimchi.dev')) {
        apiKey = resolveKimchiApiKey(apiKey);
      }

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (apiKey) {
        if (endpoint.includes('anthropic') || endpoint.includes('cc.freemodel.dev')) {
          headers['x-api-key'] = apiKey;
          headers['anthropic-version'] = '2023-06-01';
        } else if (endpoint.includes('opencode.ai')) {
          headers['x-api-key'] = apiKey;
        } else {
          headers['Authorization'] = `Bearer ${apiKey}`;
        }
      }

      const body: Record<string, any> = {
        model: modelName,
        messages,
        stream: isStream,
      };

      if (temperature !== undefined) body.temperature = temperature;
      if (max_tokens !== undefined) body.max_tokens = max_tokens;
      if (tools && tools.length > 0) {
        body.tools = tools;
        body.tool_choice = 'auto';
      }
      // Copy other params
      Object.assign(body, otherParams);

      let apiPath = '/chat/completions';
      if (endpoint.includes('anthropic') || endpoint.includes('cc.freemodel.dev')) apiPath = '/v1/messages';

      const fullUrl = `${endpoint.replace(/\/$/, '')}${apiPath}`;
      console.log('[Bridge] POST', fullUrl);

      if (isStream) {
        const response = await axios.post(fullUrl, body, { headers, timeout: 120000, responseType: 'stream' });
        response.data.on('data', (chunk: Buffer) => res.write(chunk));
        response.data.on('end', () => res.end());
        response.data.on('error', (err: Error) => { console.error('[Bridge] Stream error:', err.message); res.end(); });
      } else {
        const response = await axios.post(fullUrl, body, { headers, timeout: 120000 });
        res.json(response.data);
      }
    } catch (e: any) {
      console.error('[Bridge] Error:', e.message);
      res.status(500).json({ error: e.message });
    }
  });

  // Text completions
  app.post("/v1/completions", async (req, res) => {
    const { model, prompt, stream, temperature, max_tokens, ...otherParams } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'prompt is required' });
    }

    const isStream = stream === true;
    res.setHeader('Content-Type', isStream ? 'application/x-ndjson' : 'application/json');
    res.setHeader('Cache-Control', 'no-cache');

    try {
      let endpoint = process.env.AI_BASE_URL || 'http://localhost:11434/v1';
      let apiKey = process.env.AI_API_KEY || '';
      let modelName = model || 'text-davinci-003';

      const profiles = getLlmConfig();
      if (profiles && Array.isArray(profiles)) {
        for (const profile of profiles) {
          const foundModel = (profile.models || []).find((m: any) => m.id === model);
          if (foundModel) {
            endpoint = profile.endpoint;
            apiKey = profile.apiKey;
            modelName = foundModel.id;
            break;
          }
        }
      }

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

      const body: Record<string, any> = {
        model: modelName,
        prompt,
        stream: isStream,
      };
      if (temperature !== undefined) body.temperature = temperature;
      if (max_tokens !== undefined) body.max_tokens = max_tokens;
      Object.assign(body, otherParams);

      const fullUrl = `${endpoint.replace(/\/$/, '')}/completions`;
      console.log('[Bridge] POST', fullUrl);

      if (isStream) {
        const response = await axios.post(fullUrl, body, { headers, timeout: 120000, responseType: 'stream' });
        response.data.on('data', (chunk: Buffer) => res.write(chunk));
        response.data.on('end', () => res.end());
      } else {
        const response = await axios.post(fullUrl, body, { headers, timeout: 120000 });
        res.json(response.data);
      }
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Embeddings
  app.post("/v1/embeddings", async (req, res) => {
    const { model, input } = req.body;

    if (!input) {
      return res.status(400).json({ error: 'input is required' });
    }

    try {
      let endpoint = process.env.AI_BASE_URL || 'http://localhost:11434/v1';
      let apiKey = process.env.AI_API_KEY || '';
      let modelName = model || 'text-embedding-3-small';

      const profiles = getLlmConfig();
      if (profiles && Array.isArray(profiles)) {
        for (const profile of profiles) {
          const foundModel = (profile.models || []).find((m: any) => m.id === model);
          if (foundModel) {
            endpoint = profile.endpoint;
            apiKey = profile.apiKey;
            modelName = foundModel.id;
            break;
          }
        }
      }

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

      const body = {
        model: modelName,
        input: Array.isArray(input) ? input : [input],
      };

      const fullUrl = `${endpoint.replace(/\/$/, '')}/embeddings`;
      console.log('[Bridge] POST', fullUrl);

      const response = await axios.post(fullUrl, body, { headers, timeout: 60000 });
      res.json(response.data);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  function createMockResponse() {
    const mockRes: any = {
      statusCode: 200,
      headers: {} as Record<string, string>,
      body: '',
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      setHeader(name: string, value: string) {
        this.headers[name] = value;
        return this;
      },
      write(chunk: any) {
        this.body += chunk.toString();
        return true;
      },
      end(chunk?: any) {
        if (chunk) this.body += chunk.toString();
        return this;
      },
      json(data: any) {
        this.body = typeof data === 'string' ? data : JSON.stringify(data);
        return this;
      },
      send(data: any) {
        this.body = data.toString();
        return this;
      }
    };
    return mockRes;
  }

  app.post("/api/provider/models", async (req, res) => {
    const provider = req.body.provider;
    const apiKey = req.body.apiKey;
    const baseUrl = req.body.baseUrl || req.body.endpoint;

    try {
      let modelsList: any[] = [];
      const resolvedProvider = provider || (
        baseUrl?.includes('gemini') || baseUrl?.includes('googleapis.com') ? 'gemini' : 'openai'
      );

      if (resolvedProvider === 'gemini' || resolvedProvider === 'google-gemini') {
        const url = `${baseUrl || 'https://generativelanguage.googleapis.com/v1beta'}/models?key=${apiKey}`;
        const response = await axios.get(url, { timeout: 10000 });
        if (response.data && Array.isArray(response.data.models)) {
          modelsList = response.data.models.map((m: any) => ({
            id: m.name.replace(/^models\//, ''),
            name: m.displayName || m.name.replace(/^models\//, '')
          }));
        }
      } else {
        // OpenAI-compatible and others
        const url = baseUrl ? `${baseUrl.replace(/\/$/, '')}/models` : 'https://api.openai.com/v1/models';
        const response = await axios.get(url, {
          headers: apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {},
          timeout: 10000
        });

        const data = response.data;
        const modelsArr = data.data || data.models || [];
        if (Array.isArray(modelsArr)) {
          modelsList = modelsArr.map((m: any) => ({
            id: m.id,
            name: m.id
          }));
        }
      }
      res.json({ success: true, models: modelsList });
    } catch (e: any) {
      console.error('[ProviderModels] Error fetching models:', e.message);
      res.json({ success: true, models: [] });
    }
  });

  app.post("/api/provider/verify", async (req, res) => {
    const provider = req.body.provider;
    const apiKey = req.body.apiKey;
    const baseUrl = req.body.baseUrl || req.body.endpoint;
    const model = req.body.model;

    const defaults = PROVIDER_DEFAULTS[provider] || PROVIDER_DEFAULTS['custom'];
    const resolvedBaseUrl = baseUrl || defaults.endpoint;
    const testModel = model || defaults.testModel;

    try {
      const mockRes = createMockResponse();
      const testResult = await dispatchChatCompletion(req, mockRes, {
        provider,
        apiKey,
        baseUrl: resolvedBaseUrl,
        model: testModel,
        messages: [{ role: 'user', content: 'Ping' }],
        apiMessages: [{ role: 'user', content: 'Ping' }],
        tools: [],
        stream: false,
        finalSystemPrompt: ''
      });

      let resultData = testResult || mockRes.body;
      if (typeof resultData === 'string') {
        try {
          resultData = JSON.parse(resultData);
        } catch { }
      }
      res.json({ success: true, message: 'Provider API connection verified successfully.', result: resultData });
    } catch (e: any) {
      await parseStreamError(e);
      const detail = getUpstreamErrorDetail(e);
      res.status(getUpstreamErrorStatus(e)).json({ error: 'Verification failed', detail });
    }
  });

  // Auto-detect local providers (Ollama, LM Studio) and return available models
  app.get("/api/provider/detect-local", async (req, res) => {
    const localProviders = [
      { id: 'ollama_local', name: 'Ollama Local', endpoint: 'http://127.0.0.1:11434/v1' },
      { id: 'lm_studio', name: 'LM Studio', endpoint: 'http://127.0.0.1:1234/v1' },
    ];

    const results: Array<{ id: string; name: string; endpoint: string; available: boolean; models: Array<{ id: string; name: string }> }> = [];

    for (const provider of localProviders) {
      try {
        const response = await axios.get(`${provider.endpoint}/models`, { timeout: 3000 });
        if (response.status === 200) {
          const data = response.data;
          const modelsArr = data.data || data.models || [];
          const models = Array.isArray(modelsArr)
            ? modelsArr.map((m: any) => ({ id: m.id, name: m.display_name || m.id }))
            : [];
          results.push({
            id: provider.id,
            name: provider.name,
            endpoint: provider.endpoint,
            available: models.length > 0,
            models,
          });
        } else {
          results.push({ id: provider.id, name: provider.name, endpoint: provider.endpoint, available: false, models: [] });
        }
      } catch {
        results.push({ id: provider.id, name: provider.name, endpoint: provider.endpoint, available: false, models: [] });
      }
    }

    res.json({ success: true, providers: results });
  });

  // Simple in-memory cache for models.dev with 5-minute TTL
  const modelsDevCache: Record<string, { data: any; ts: number }> = {};
  const MODELS_DEV_CACHE_MS = 5 * 60 * 1000;
  const fetchModelsDev = async (path: string) => {
    const now = Date.now();
    const cached = modelsDevCache[path];
    if (cached && now - cached.ts < MODELS_DEV_CACHE_MS) {
      return cached.data;
    }
    const response = await axios.get(`https://models.dev${path}`, { timeout: 15000 });
    modelsDevCache[path] = { data: response.data, ts: now };
    return response.data;
  };

  app.get("/api/models-dev/catalog", async (req, res) => {
    try {
      const data = await fetchModelsDev('/catalog.json');
      res.json(data);
    } catch (e: any) {
      res.status(502).json({ error: 'Failed to fetch models.dev catalog', detail: e.message });
    }
  });

  app.get("/api/models-dev/models", async (req, res) => {
    try {
      const data = await fetchModelsDev('/models.json');
      res.json(data);
    } catch (e: any) {
      res.status(502).json({ error: 'Failed to fetch models.dev models', detail: e.message });
    }
  });

  app.get("/api/models-dev/providers", async (req, res) => {
    try {
      const data = await fetchModelsDev('/api.json');
      res.json(data);
    } catch (e: any) {
      res.status(502).json({ error: 'Failed to fetch models.dev providers', detail: e.message });
    }
  });

  app.post("/api/settings/env", async (req, res) => {
    const { key, value } = req.body;
    if (!key) return res.status(400).json({ error: "Environment key required" });
    try {
      const envPath = path.resolve(process.cwd(), '.env.local');
      let content = '';
      try {
        content = fs.readFileSync(envPath, 'utf8');
      } catch { }
      const lines = content.split('\n');
      let found = false;
      const newLines = lines.map((line: string) => {
        if (line.startsWith(`${key}=`)) {
          found = true;
          return `${key}=${value}`;
        }
        return line;
      });
      if (!found) newLines.push(`${key}=${value}`);
      fs.writeFileSync(envPath, newLines.join('\n') + '\n', 'utf8');
      dotenv.config({ path: envPath, override: true });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: 'Failed to update environment setting', detail: e.message });
    }
  });

  app.post("/api/provider/verify-search", async (req, res) => {
    const { apiKey, engine } = req.body;
    try {
      if (engine === 'tavily') {
        const response = await axios.post('https://api.tavily.com/search', {
          api_key: apiKey,
          query: 'test ping',
          max_results: 1
        }, { timeout: 8000 });
        if (response.data) {
          return res.json({ success: true, message: 'Tavily Search API key verified successfully.' });
        }
      } else {
        const response = await axios.get(`https://serpapi.com/search.json?q=test&api_key=${apiKey}`, { timeout: 8000 });
        if (response.data) {
          return res.json({ success: true, message: 'SerpAPI key verified successfully.' });
        }
      }
      res.status(400).json({ error: 'Empty response from search provider.' });
    } catch (e: any) {
      const msg = e.response?.data?.error || e.message;
      res.status(e.response?.status || 500).json({ error: 'Search key verification failed', detail: msg });
    }
  });

  // Custom proxy to bridge agent chat loops
  app.post("/api/bridge/chat", async (req, res) => {
    const {
      bridgeUrl,
      apiKey,
      bridgeApiKey,
      model,
      bridgeModel,
      messages,
      tools,
      tool_choice,
      stream,
      temperature,
      max_tokens
    } = req.body;
    if (!bridgeUrl) return res.status(400).json({ error: "Bridge URL required" });
    if (!messages) return res.status(400).json({ error: "Messages required" });

    const effectiveKey = apiKey || bridgeApiKey;
    const effectiveModel = model || bridgeModel || 'gpt-4o-mini';

    // Persist bridge settings to disk so background/execution agents can use them
    try {
      const settingsPath = path.join(process.cwd(), '.lumina', 'bridge_settings.json');
      const settingsDir = path.dirname(settingsPath);
      if (!fs.existsSync(settingsDir)) {
        fs.mkdirSync(settingsDir, { recursive: true });
      }
      fs.writeFileSync(settingsPath, JSON.stringify({ bridgeUrl, apiKey: effectiveKey }, null, 2), 'utf8');
    } catch (err) {
      console.error('Failed to write bridge settings to disk:', err);
    }

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (effectiveKey) headers['Authorization'] = `Bearer ${effectiveKey}`;

    const requestBody: Record<string, any> = {
      model: effectiveModel,
      messages
    };
    if (tools !== undefined) requestBody.tools = tools;
    if (tool_choice !== undefined) requestBody.tool_choice = tool_choice;
    if (stream !== undefined) requestBody.stream = stream;
    if (temperature !== undefined) requestBody.temperature = temperature;
    if (max_tokens !== undefined) requestBody.max_tokens = max_tokens;

    try {
      const response = await axios.post(`${bridgeUrl.replace(/\/+$/, '')}/v1/chat/completions`, requestBody, { headers, timeout: 60000 });
      res.json(response.data);
    } catch (e: any) {
      await parseStreamError(e);
      const detail = getUpstreamErrorDetail(e);
      res.status(getUpstreamErrorStatus(e)).json({ error: 'Bridge chat failed', detail });
    }
  });

  // Fetch available models from Llama Bridge
  app.get("/api/bridge/models", async (req, res) => {
    const rawUrl = (req.headers['x-bridge-url'] as string) || '';
    const rawKey = (req.headers['x-api-key'] as string) || '';
    if (!rawUrl) return res.status(400).json({ error: "Bridge URL required" });

    const bridgeUrl = rawUrl.replace(/\/+$/, '');
    const headers: Record<string, string> = {};
    if (rawKey) headers['Authorization'] = `Bearer ${rawKey}`;

    try {
      const response = await axios.get(`${bridgeUrl}/v1/models`, { headers, timeout: 10000 });
      res.json(response.data);
    } catch (e: any) {
      const detail = getUpstreamErrorDetail(e);
      res.status(getUpstreamErrorStatus(e)).json({ error: 'Failed to fetch models from bridge', detail });
    }
  });

  // Fetch tools from Llama Bridge
  app.post("/api/bridge/tools", async (req, res) => {
    const { bridgeUrl, apiKey } = req.body;
    if (!bridgeUrl) return res.status(400).json({ error: "Bridge URL required" });

    const cleanUrl = bridgeUrl.replace(/\/+$/, '');
    const headers: Record<string, string> = {};
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

    try {
      try {
        const response = await axios.get(`${cleanUrl}/v1/tools`, { headers, timeout: 8000 });
        return res.json(response.data);
      } catch (err1) {
        // fallback to /api/tools
        const response = await axios.get(`${cleanUrl}/api/tools`, { headers, timeout: 8000 });
        return res.json(response.data);
      }
    } catch (e: any) {
      const detail = getUpstreamErrorDetail(e);
      res.status(getUpstreamErrorStatus(e)).json({ error: 'Failed to fetch tools from bridge', detail });
    }
  });

  // Verify Llama Bridge health
  app.get("/api/bridge/health", async (req, res) => {
    const rawUrl = (req.headers['x-bridge-url'] as string) || '';
    const rawKey = (req.headers['x-api-key'] as string) || '';
    if (!rawUrl) return res.status(400).json({ error: "Bridge URL required" });

    const bridgeUrl = rawUrl.replace(/\/+$/, '');
    const headers: Record<string, string> = {};
    if (rawKey) headers['Authorization'] = `Bearer ${rawKey}`;

    try {
      const response = await axios.get(`${bridgeUrl}/health`, { headers, timeout: 5000 });
      res.status(response.status).json(response.data || { ok: true });
    } catch (e: any) {
      res.status(500).json({ error: 'Llama Bridge unreachable', detail: e.message });
    }
  });

  // Proxy: connect to a remote MCP server
  app.post("/api/mcp/connect", async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "URL required" });

    try {
      const response = await axios.post(url, {
        jsonrpc: '2.0',
        method: 'tools/list',
        params: {},
        id: 1
      }, {
        timeout: 8000,
        headers: { 'Content-Type': 'application/json' }
      });

      const tools = response.data?.result?.tools || [];
    } catch (e: any) {
      res.status(502).json({ error: 'Could not connect to MCP server', detail: e.message });
    }
  });

  // AI Chat Completion Proxy
  app.post("/api/chat", async (req, res) => {
    // RAG Context Injection
    let finalSystemPrompt = req.body.systemPrompt || '';
    const { ragConfig, messages } = req.body;

    if (ragConfig && ragConfig.enabled && Array.isArray(ragConfig.activeDocumentIds) && ragConfig.activeDocumentIds.length > 0) {
      try {
        const lastMsg = messages[messages.length - 1];
        let userQuery = '';
        if (lastMsg && lastMsg.role === 'user') {
          if (typeof lastMsg.content === 'string') {
            userQuery = lastMsg.content;
          } else if (Array.isArray(lastMsg.content)) {
            const textPart = lastMsg.content.find((c: any) => c.type === 'text');
            userQuery = textPart?.text || '';
          }
        }

        if (userQuery) {
          const matchedChunks = await ragBackend.retrieve(userQuery, 5, ragConfig.activeDocumentIds);
          if (matchedChunks && matchedChunks.length > 0) {
            const allDocs = ragBackend.getDocuments();
            const contextStr = matchedChunks.map(m => {
              const doc = allDocs.find(d => d.id === m.documentId);
              const docName = doc ? doc.fileName : 'Unknown Document';
              return `--- START OF FRAGMENT ---
Source Document: ${docName}

${m.content}
--- END OF FRAGMENT ---`;
            }).join('\n\n');

            const ragInstruction = `Answer the user's question using the provided DOCUMENT CONTEXT whenever possible. 
If information exists in these uploaded documents, prioritize those documents over general model knowledge.
Always cite the source document name and reference (page/section) when using information from it. In your markdown response, cite it elegantly like "[Source: DocumentName.pdf (Page X)]".
If the answer is not found in the documents, state that clearly rather than hallucinating.

DOCUMENT CONTEXT:
${contextStr}`;

            finalSystemPrompt = finalSystemPrompt
              ? `${finalSystemPrompt}\n\n${ragInstruction}`
              : ragInstruction;
          }
        }
      } catch (err: any) {
        console.error("RAG Context Injection error:", err);
      }
    }

    const { model, config, tools, stream = true } = req.body;
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "messages array is required" });
    }

    // Determine provider configuration
    let provider = 'openai-compatible';
    let baseUrl = '';
    let apiKey = '';

    // Check if the model is associated with any active provider profile
    const activeProfiles = getLlmConfig();
    let resolvedProfile: any = null;
    if (activeProfiles && Array.isArray(activeProfiles)) {
      for (const profile of activeProfiles) {
        if (profile.active !== false && Array.isArray(profile.models)) {
          if (profile.models.some((m: any) => m.id === model)) {
            resolvedProfile = profile;
            break;
          }
        }
      }
    }

    if (resolvedProfile) {
      provider = resolvedProfile.provider || 'openai-compatible';
      baseUrl = resolvedProfile.endpoint || '';
      apiKey = resolvedProfile.apiKey || '';
    } else if (config) {
      provider = config.provider || 'openai-compatible';
      baseUrl = config.baseUrl || '';
      apiKey = config.apiKey || '';
    }

    // Always resolve API key from env vars for known providers
    apiKey = resolveApiKeyFromEnv(provider, apiKey);

    console.log('[Chat API] Received - provider:', provider, 'baseUrl:', baseUrl, 'model:', model);

    if (!config || !config.baseUrl) {
      const modelLower = (model || '').toLowerCase();

      // Google Gemini models
      if (modelLower.includes('gemini')) {
        provider = 'google-gemini';
        baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
        apiKey = process.env.GEMINI_API_KEY || '';
      }
      // OpenAI models
      else if (modelLower.startsWith('gpt') || modelLower.startsWith('o1') || modelLower.startsWith('o3')) {
        provider = 'openai';
        baseUrl = 'https://api.openai.com/v1';
        apiKey = process.env.OPENAI_API_KEY || '';
      }
      // Anthropic Claude models
      else if (modelLower.includes('claude')) {
        provider = 'anthropic';
        baseUrl = 'https://api.anthropic.com/v1';
        apiKey = process.env.ANTHROPIC_API_KEY || '';
      }
      // DeepSeek models
      else if (modelLower.includes('deepseek')) {
        provider = 'openai-compatible';
        baseUrl = 'https://api.deepseek.com/v1';
        apiKey = process.env.DEEPSEEK_API_KEY || '';
      }
      // Groq models
      else if (modelLower.includes('groq') || modelLower.includes('llama')) {
        provider = 'openai-compatible';
        baseUrl = 'https://api.groq.com/openai/v1';
        apiKey = process.env.GROQ_API_KEY || '';
      }
      // Ollama local
      else if (modelLower.includes('ollama')) {
        provider = 'openai-compatible';
        baseUrl = 'http://localhost:11434/v1';
        apiKey = '';
      }
      // LM Studio local
      else if (modelLower.includes('lm-studio') || modelLower.includes('lm studio')) {
        provider = 'openai-compatible';
        baseUrl = 'http://localhost:1234/v1';
        apiKey = '';
      }
      // Sarvam AI models
      else if (modelLower.includes('sarvam')) {
        provider = 'openai-compatible';
        baseUrl = 'https://api.sarvam.ai/v1';
        apiKey = process.env.SARVAM_API_KEY || '';
      }
      // Kilo AI models
      else if (modelLower.includes('kilo')) {
        provider = 'openai-compatible';
        baseUrl = 'https://api.kilo.ai/api/gateway';
        apiKey = process.env.KILO_API_KEY || '';
      }
      // OpenCode models
      else if (
        modelLower.startsWith('opencode/') ||
        modelLower.includes('opencode') ||
        modelLower.includes('big pickle') ||
        modelLower.includes('big-pickle') ||
        modelLower.includes('bigpickle') ||
        modelLower.includes('mimo-v2.5-free') ||
        modelLower.includes('north-mini-code-free') ||
        modelLower.includes('nemotron-3-ultra-free') ||
        modelLower.includes('deepseek-v4-flash-free') ||
        modelLower.startsWith('gpt-5.') ||
        modelLower.startsWith('claude-opus-4-') ||
        modelLower.startsWith('claude-sonnet-4-') ||
        modelLower.startsWith('claude-fable-') ||
        modelLower.startsWith('qwen3.7-') ||
        modelLower.startsWith('qwen3.6-') ||
        modelLower.startsWith('qwen3.5-') ||
        modelLower.startsWith('deepseek-v4-') ||
        modelLower.startsWith('minimax-m2.') ||
        modelLower.startsWith('glm-5') ||
        modelLower.startsWith('kimi-k2.') ||
        modelLower.startsWith('grok-build-')
      ) {
        provider = 'opencode';
        baseUrl = 'https://opencode.ai/zen/v1';
        apiKey = process.env.OPENCODE_API_KEY || '';
      }
      // Zed AI models
      else if (modelLower.includes('zed')) {
        provider = 'zed';
        baseUrl = 'https://api.zed.dev/v1';
        apiKey = process.env.ZED_API_KEY || '';
      }
      // GitHub Copilot models
      else if (modelLower.includes('copilot')) {
        provider = 'copilot';
        baseUrl = 'https://api.githubcopilot.com';
        apiKey = process.env.COPILOT_API_KEY || '';
      }
      // Cline models
      else if (modelLower.includes('cline')) {
        provider = 'openai-compatible';
        baseUrl = 'https://api.cline.bot/api/v1';
        apiKey = process.env.CLINE_API_KEY || '';
      }
      // Kimchi models
      else if (modelLower.includes('kimi') || modelLower.includes('kimchi')) {
        provider = 'openai-compatible';
        baseUrl = 'https://llm.kimchi.dev/openai/v1';
        apiKey = process.env.KIMCHI_API_KEY || process.env.CASTAI_API_KEY || '';
      }
      // OpenProvider
      else if (modelLower.includes('openprovider') || modelLower.includes('auto-free')) {
        provider = 'openai-compatible';
        baseUrl = process.env.AI_BASE_URL || 'https://openprovider.mimika.in/v1';
        apiKey = process.env.AI_API_KEY || '';
      }
      // NVIDIA NIM
      else if (modelLower.includes('nvidia') || modelLower.includes('nemotron')) {
        provider = 'openai-compatible';
        baseUrl = 'https://integrate.api.nvidia.com/v1';
        apiKey = process.env.NVIDIA_API_KEY || '';
      }
      // Together AI
      else if (modelLower.includes('together')) {
        provider = 'openai-compatible';
        baseUrl = 'https://api.together.xyz/v1';
        apiKey = process.env.TOGETHER_API_KEY || '';
      }
      // Mistral
      else if (modelLower.includes('mistral') || modelLower.includes('mixtral')) {
        provider = 'openai-compatible';
        baseUrl = 'https://api.mistral.ai/v1';
        apiKey = process.env.MISTRAL_API_KEY || '';
      }
      // Cohere
      else if (modelLower.includes('cohere') || modelLower.includes('command')) {
        provider = 'cohere';
        baseUrl = 'https://api.cohere.com/compatibility/v1';
        apiKey = process.env.COHERE_API_KEY || '';
      }
      // OpenRouter
      else if (modelLower.includes('openrouter') || (!modelLower.includes('anthropic') && modelLower.includes('/'))) {
        const parts = modelLower.split('/');
        if (parts.length >= 2) {
          provider = 'openai-compatible';
        }
        apiKey = process.env.OPENROUTER_API_KEY || '';
      }
      // Default fallback to environment variable
      else {
        provider = 'openai-compatible';
        baseUrl = process.env.AI_BASE_URL || 'http://localhost:11434/v1';
        apiKey = process.env.AI_API_KEY || '';
      }
    }

    if (baseUrl.includes('kimchi.dev') || provider === 'kimchi') {
      apiKey = resolveKimchiApiKey(apiKey);
    }

    // Build the API messages array with system prompt
    const apiMessages: any[] = [];
    if (finalSystemPrompt) {
      apiMessages.push({ role: 'system', content: finalSystemPrompt });
    }
    apiMessages.push(...messages.map((m: any) => {
      const msg: any = { role: m.role, content: m.content };
      if (m.tool_calls && Array.isArray(m.tool_calls)) {
        msg.tool_calls = m.tool_calls;
      }
      if (m.tool_call_id) {
        msg.tool_call_id = m.tool_call_id;
      }
      if (m.name) {
        msg.name = m.name;
      }
      return msg;
    }));

    try {
      await dispatchChatCompletion(req, res, {
        provider,
        model,
        apiKey,
        baseUrl,
        messages,
        apiMessages,
        tools,
        stream,
        finalSystemPrompt
      });
    } catch (e: any) {
      await parseStreamError(e);
      const detail = getUpstreamErrorDetail(e);
      console.error('Chat API Error:', detail);
      if (!res.headersSent) {
        res.status(getUpstreamErrorStatus(e)).json({ error: 'Chat completion failed', detail });
      } else {
        res.end();
      }
    }
  });

  // Keep a minimal stub for backward compatibility
  app.get("/api/v1/tools", (req, res) => {
    res.json({ tools: [] });
  });

  app.post("/api/list_tools", (req, res) => {
    res.json({ tools: [] });
  });
}
