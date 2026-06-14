import { useState, useCallback, useEffect } from 'react';
import { fetchBridgeTools, checkBridgeHealth } from '../bridgeClient';
import { Tool, ToolDefinition } from '../types';

export interface UseLlamaBridgeProps {
  serverUrl: string;
  apiKey: string;
  selectedProvider: string;
  activeModelId: string;
  showToast: (msg: string) => void;
  useLocalModelsOnly: boolean;
}

function getLocalThinkingPreference() {
  try {
    return localStorage.getItem('lumina_local_thinking_enabled') === 'true';
  } catch {
    return false;
  }
}

function resolveThinkSetting(modelId: string) {
  if (!getLocalThinkingPreference()) return undefined;
  const normalized = String(modelId || '').toLowerCase();
  if (normalized.includes('gpt-oss')) return 'medium';
  return true;
}

function isRateLimitError(msg: string, status?: number): boolean {
  // Only match actual 429 status code, not text containing "429"
  if (status === 429) return true;
  const lower = msg.toLowerCase();
  return lower.includes('rate_limit') ||
    lower.includes('rate-limited') ||
    lower.includes('rate limited') ||
    lower.includes('too many requests') ||
    lower.includes('quota exceeded');
}

// Parse XML-style tool calls from models like minimax
function parseXmlToolCalls(content: string): { cleanedContent: string; toolCalls: any[] } | null {
  if (!content || typeof content !== 'string') return null;
  const invokeRegex = /<invoke\s+name=["']([^"']+)["']>\s*[\s\S]*?<\/invoke>/gi;
  const matches = [...content.matchAll(invokeRegex)];
  if (matches.length === 0) return null;
  const toolCalls: any[] = [];
  let cleanedContent = content;
  for (const match of matches) {
    const fullMatch = match[0];
    const toolName = match[1];
    const paramsBlock = fullMatch.slice(fullMatch.indexOf('>') + 1, fullMatch.lastIndexOf('<'));
    const params: Record<string, any> = {};
    const paramRegex = /<parameter\s+name=["']([^"']+)["']>\s*([\s\S]*?)\s*<\/parameter>/gi;
    let paramMatch;
    while ((paramMatch = paramRegex.exec(paramsBlock)) !== null) {
      const key = paramMatch[1];
      let value: any = paramMatch[2].trim();
      if (value.startsWith('{') || value.startsWith('[')) {
        try { value = JSON.parse(value); } catch {}
      } else if (value === 'true') { value = true; }
      else if (value === 'false') { value = false; }
      else if (/^\d+$/.test(value)) { value = parseInt(value, 10); }
      else if (/^\d+\.\d+$/.test(value)) { value = parseFloat(value); }
      params[key] = value;
    }
    toolCalls.push({
      id: `tc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type: 'function',
      function: {
        name: toolName,
        arguments: JSON.stringify(params)
      }
    });
    cleanedContent = cleanedContent.replace(fullMatch, '');
  }
  cleanedContent = cleanedContent
    .replace(/minimax:tool_call\s*/gi, '')
    .replace(/^\s*text\s*$/gm, '')
    .replace(/^\s*Copy\s*$/gm, '')
    .trim();
  if (toolCalls.length === 0) return null;
  return { cleanedContent, toolCalls };
}

// Normalize LLM response: if tool_calls are missing but content has XML tool calls, extract them
function normalizeLlmResponse(responseData: any): any {
  if (!responseData?.choices?.[0]?.message) return responseData;
  const message = responseData.choices[0].message;
  // If proper tool_calls already exist, return as-is
  if (message.tool_calls && Array.isArray(message.tool_calls) && message.tool_calls.length > 0) {
    return responseData;
  }
  // Try to parse XML tool calls from content
  if (message.content && typeof message.content === 'string') {
    const parsed = parseXmlToolCalls(message.content);
    if (parsed && parsed.toolCalls.length > 0) {
      console.log(`[LUMINA_DEBUG] Client parsed ${parsed.toolCalls.length} XML tool call(s) from content`);
      message.tool_calls = parsed.toolCalls;
      if (parsed.cleanedContent) {
        message.content = parsed.cleanedContent;
      }
    }
  }
  return responseData;
}

function summarizeContentForLog(content: any): any {
  if (Array.isArray(content)) {
    return content.map(part => {
      if (part?.type === 'image_url') {
        const url = part.image_url?.url || '';
        return {
          ...part,
          image_url: {
            ...part.image_url,
            url: url.startsWith('data:')
              ? `${url.substring(0, 80)}...[base64 ${url.length} chars]`
              : url
          }
        };
      }
      return part;
    });
  }
  return content;
}

function logLlmPayload(label: string, payload: {
  provider: string;
  model: string;
  baseUrl: string;
  messages: any[];
  tools?: any[];
  stream?: boolean;
}) {
  try {
    const safeMessages = (payload.messages || []).map((message, index) => {
      const content = summarizeContentForLog(message.content);
      const textLength = typeof message.content === 'string'
        ? message.content.length
        : JSON.stringify(content || '').length;

      return {
        index,
        role: message.role,
        textLength,
        content,
        tool_calls: message.tool_calls,
        tool_call_id: message.tool_call_id,
        name: message.name
      };
    });

    const totalTextChars = safeMessages.reduce((sum, message) => sum + (message.textLength || 0), 0);
    const toolNames = (payload.tools || []).map(tool => tool?.function?.name || tool?.name).filter(Boolean);

    console.groupCollapsed(
      `[LUMINA_LLM_PAYLOAD] ${label} -> ${payload.provider} / ${payload.model} ` +
      `(${safeMessages.length} messages, ${totalTextChars} chars, ${toolNames.length} tools)`
    );
    console.log('Route:', label);
    console.log('Provider:', payload.provider);
    console.log('Model:', payload.model);
    console.log('Base URL:', payload.baseUrl);
    console.log('Stream:', payload.stream);
    console.log('Tools:', toolNames);
    console.log('Messages sent to LLM:', safeMessages);
    console.log('Full request payload sent to LLM:', {
      provider: payload.provider,
      model: payload.model,
      baseUrl: payload.baseUrl,
      stream: payload.stream,
      tools: payload.tools,
      messages: safeMessages
    });
    console.groupEnd();
  } catch (error) {
    console.warn('[LUMINA_LLM_PAYLOAD] Failed to log outbound LLM payload:', error);
  }
}

function compactToolSchema(schema: any): any {
  if (!schema || typeof schema !== 'object' || Array.isArray(schema)) {
    return schema;
  }

  const compact: any = {};
  const allowedKeys = ['type', 'properties', 'required', 'items', 'enum', 'additionalProperties'];

  for (const key of allowedKeys) {
    if (schema[key] === undefined) continue;

    if (key === 'properties' && schema.properties && typeof schema.properties === 'object') {
      compact.properties = Object.fromEntries(
        Object.entries(schema.properties).map(([propName, propSchema]) => [
          propName,
          compactToolSchema(propSchema)
        ])
      );
      continue;
    }

    if (key === 'items') {
      compact.items = compactToolSchema(schema.items);
      continue;
    }

    compact[key] = schema[key];
  }

  return compact;
}

export function useLlamaBridge({
  serverUrl,
  apiKey,
  selectedProvider,
  activeModelId,
  showToast,
  useLocalModelsOnly
}: UseLlamaBridgeProps) {
  const [llamaBridgeUrl, setLlamaBridgeUrl] = useState(() => 
    localStorage.getItem('lumina_llama_url') || 'http://localhost:8089'
  );
  const [llamaBridgeApiKey, setLlamaBridgeApiKey] = useState(() => 
    localStorage.getItem('lumina_llama_key') || ''
  );
  const [llamaBridgeModels, setLlamaBridgeModels] = useState<{ id: string; name: string }[]>([]);
  const [selectedLlamaModel, setSelectedLlamaModel] = useState('');
  const [useBridgeTools, setUseBridgeTools] = useState(() => localStorage.getItem('lumina_bridge_enabled') === 'true');
  const [bridgeTools, setBridgeTools] = useState<Tool[]>([]);
  const [isMcpConnected, setIsMcpConnected] = useState(false);
  const [aiVerificationState, setAiVerificationState] = useState<'idle' | 'verifying' | 'success' | 'error'>('idle');

  const normalizeTools = (tools: ToolDefinition[] = []) => tools.map((tool) => {
    const functionName = tool.function?.name;
    const parameters = tool.function?.parameters && typeof tool.function.parameters === 'object'
      ? tool.function.parameters
      : null;

    if (!functionName) {
      return null;
    }

    if (!parameters) {
      return {
        type: 'function' as const,
        function: {
          name: functionName
        }
      };
    }

    const compactParameters = compactToolSchema({
      type: parameters.type || 'object',
      properties: parameters.properties || {},
      required: Array.isArray(parameters.required) ? parameters.required : []
    });

    const hasParameterShape =
      Object.keys(compactParameters.properties || {}).length > 0 ||
      (compactParameters.required?.length || 0) > 0;

    if (!hasParameterShape) {
      return {
        type: 'function' as const,
        function: {
          name: functionName
        }
      };
    }

    return {
      type: 'function' as const,
      function: {
        name: functionName,
        parameters: compactParameters
      }
    };
  }).filter(Boolean);

  const handleTestLlamaConnection = async () => {
    setAiVerificationState('verifying');
    try {
      const healthy = await checkBridgeHealth(llamaBridgeUrl, llamaBridgeApiKey);
      setAiVerificationState(healthy ? 'success' : 'error');
    } catch (error) {
      console.error('Llama Bridge connection failed:', error);
      setAiVerificationState('error');
    } finally {
      setTimeout(() => setAiVerificationState('idle'), 3000);
    }
  };

  const handleLoadBridgeTools = useCallback(async () => {
    try {
      const tools = await fetchBridgeTools(llamaBridgeUrl, llamaBridgeApiKey);
      if (tools.length > 0) {
        const mappedTools: Tool[] = tools.map((t: any) => {
          const name = (t.name || t.id || '').toLowerCase();
          
          return {
            id: t.id || t.name,
            name: t.name || t.id,
            description: t.description || '',
            enabled: false,
            parameters: t.parameters,
          };
        });
        // Filter out native built-in tools (web_scrape and wiki_*) to avoid duplicates
        const filteredTools = mappedTools.filter(t => t.id !== 'web_scrape' && !t.id.startsWith('wiki_'));
        setBridgeTools(filteredTools);
        setIsMcpConnected(true);
        showToast(`Loaded ${mappedTools.length} bridge tools`);
      }
    } catch (error) {
      console.error('Failed to load bridge tools:', error);
    }
  }, [llamaBridgeUrl, llamaBridgeApiKey, showToast]);

  const handleLoadLlamaModels = async () => {
    try {
      const response = await fetch('/api/bridge/models', {
        method: 'GET',
        headers: {
          'X-Bridge-Url': llamaBridgeUrl.replace(/\/+$/, ''),
          'X-Api-Key': llamaBridgeApiKey,
        }
      });
      
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          const models = data.data || data.models || [];
          const fetchedModels = models.map((m: any) => ({
            id: m.id,
            name: m.display_name || m.id,
            color: 'text-blue-500'
          }));
          setLlamaBridgeModels(fetchedModels);
          if (fetchedModels.length > 0 && !selectedLlamaModel) {
            setSelectedLlamaModel(fetchedModels[0].id);
          }
          showToast(`Loaded ${fetchedModels.length} models`);
        } else {
          console.warn('Expected JSON response from /api/bridge/models, got non-JSON content type:', contentType);
          showToast('Failed to load models (unexpected server response)');
        }
      } else {
        showToast('Failed to load models');
      }
    } catch (error) {
      console.error('Failed to load Llama Bridge models:', error);
      showToast('Failed to load models');
    }
  };

  const callLlamaBridge = async (messagesPrompt: any[], tools: ToolDefinition[], signal?: AbortSignal) => {
    const ragEnabledLocal = localStorage.getItem('lumina_rag_enabled') !== 'false';
    const ragDocIdsLocal = JSON.parse(localStorage.getItem('lumina_rag_doc_ids') || '[]');
    const ragConfig = { enabled: ragEnabledLocal, activeDocumentIds: ragDocIdsLocal };
    const useBridge = useBridgeTools && llamaBridgeUrl;
    const baseUrl = useBridge ? llamaBridgeUrl.replace(/\/+$/, '') : serverUrl.replace(/\/+$/, '');
    const key = useBridge ? llamaBridgeApiKey : apiKey;
    const requestTools = normalizeTools(tools);

    if (useBridge) {
      console.log('[LUMINA_DEBUG] callLlamaBridge -> BRIDGE PATH');
      if (messagesPrompt.some(m => Array.isArray(m.content))) {
        console.log('[LUMINA_DEBUG] Bridge path has array content messages');
      }
      logLlmPayload('BRIDGE PATH', {
        provider: 'llama-bridge',
        model: selectedLlamaModel,
        baseUrl,
        messages: messagesPrompt,
        tools: requestTools,
        stream: false
      });
      const response = await fetch('/api/bridge/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bridgeUrl: baseUrl.replace(/\/v1\/?$/, '').replace(/\/$/, ''),
          apiKey: key,
          model: selectedLlamaModel, ragConfig,
          messages: messagesPrompt,
          tools: requestTools,
          stream: false
        }),
        signal
      });

      if (!response.ok) {
        const text = await response.text();
        let errorMsg = `Server returned status ${response.status}`;
        try {
          const parsed = JSON.parse(text);
          errorMsg = parsed.error?.message || parsed.error || parsed.message || parsed.detail || errorMsg;
          if (typeof errorMsg === 'object') {
            errorMsg = JSON.stringify(errorMsg);
          }
        } catch {
          if (text.trim().startsWith('<')) {
            errorMsg = `Server error (HTML response with status ${response.status})`;
          } else if (text) {
            errorMsg = text.substring(0, 200);
          }
        }
        if (isRateLimitError(errorMsg)) {
          throw new Error(`Rate limited: ${errorMsg}. Try waiting, adding your own API key in Settings, or switching to a different model.`);
        }
        throw new Error(errorMsg);
      }

      const text = await response.text();
      try {
        return normalizeLlmResponse(JSON.parse(text));
      } catch {
        throw new Error(`Failed to parse response: ${text.substring(0, 100)}`);
      }
    }

    const isLocalModelActive = useLocalModelsOnly || activeModelId.toLowerCase().includes('gguf');

    if (isLocalModelActive) {
      let localUrl = 'http://127.0.0.1:1234/v1';
      let localHost = '127.0.0.1';
      let localPort = 1234;
      let savedConfig: any = null;

      try {
        const stored = localStorage.getItem(`lumina_model_settings_${activeModelId}`);
        if (stored) {
          savedConfig = JSON.parse(stored);
          localPort = savedConfig.localPort || 1234;
          localHost = savedConfig.localHost || '127.0.0.1';
          localUrl = `http://${localHost}:${localPort}/v1`;
        }
      } catch (e) {
        console.warn("Could not parse local model settings", e);
      }

      // Check if server is already running
      let serverAlreadyUp = false;
      try {
        const healthController = new AbortController();
        const healthTimeout = setTimeout(() => healthController.abort(), 1500);
        const health = await fetch(`http://${localHost}:${localPort}/v1/models`, { method: 'GET', signal: healthController.signal });
        clearTimeout(healthTimeout);
        serverAlreadyUp = health.ok || health.status === 405 || health.status === 404;
      } catch {
        serverAlreadyUp = false;
      }

      // Check if this request contains image content (vision)
      const hasImageContent = messagesPrompt.some(m =>
        Array.isArray(m.content) && m.content.some((c: any) => c.type === 'image_url')
      );

      // Resolve model path and mmproj path — async so we can query disk via server
      const resolveLocalPaths = async () => {
        let modelPath = '';
        let mmprojPath: string | undefined;

        // 1. Try lumina_downloaded_models list (in-app downloads)
        try {
          const downloaded: any[] = JSON.parse(localStorage.getItem('lumina_downloaded_models') || '[]');
          const match = downloaded.find((m: any) => m.id === activeModelId);
          if (match?.path) {
            modelPath = match.path.replace(/\\/g, '/');
            const sep = match.path.includes('\\') ? '\\' : '/';
            const dir = match.path.substring(0, match.path.lastIndexOf(sep));
            const projFile = downloaded.find((m: any) =>
              m.path && (m.path.startsWith(dir + '\\') || m.path.startsWith(dir + '/')) &&
              (m.path.toLowerCase().includes('mmproj') || m.path.toLowerCase().includes('projector'))
            );
            if (projFile?.path) mmprojPath = projFile.path.replace(/\\/g, '/');
          }
        } catch {}

        // 2. Fallback model path from saved config
        if (!modelPath && savedConfig) {
          const osUser = savedConfig.osUser || 'YOU';
          modelPath = `C:/Users/${osUser}/.lumina/models/${savedConfig.modelPublisher || 'publisher'}/${savedConfig.modelFolder || 'model-GGUF'}/${savedConfig.modelFile || 'model-Q4_K_M.gguf'}`;
        }

        // 3. Use explicitly saved projector path from modal config
        if (!mmprojPath && savedConfig?.projectorPath && savedConfig?.useProjector !== false) {
          mmprojPath = savedConfig.projectorPath;
        }

        // 4. If still no mmproj, ask server to scan the model's directory on disk
        if (!mmprojPath && modelPath) {
          try {
            const scanRes = await fetch('/api/llama/find-mmproj', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ modelPath }),
            });
            if (scanRes.ok) {
              const scanData = await scanRes.json();
              if (scanData.found && scanData.path) {
                mmprojPath = scanData.path;
              }
            }
          } catch {}
        }

        return { modelPath, mmprojPath };
      };

      // Track whether the currently running server has mmproj loaded
      const runningWithMmproj = localStorage.getItem(`lumina_server_mmproj_${activeModelId}`) === 'true';

      // Need to start/restart if:
      // - server is not running at all
      // - vision request AND server is known to not have mmproj loaded
      const needsStart = !serverAlreadyUp;
      const needsVisionRestart = hasImageContent && serverAlreadyUp && !runningWithMmproj;

      if (needsStart || needsVisionRestart) {
        const installedConfigRaw = localStorage.getItem('lumina_llama_installed_config');
        const installedConfig = installedConfigRaw ? JSON.parse(installedConfigRaw) : null;
        const binaryPath = installedConfig?.binaries?.find((b: string) => {
          const lower = b.toLowerCase();
          return (lower.includes('llama-server') && lower.endsWith('.exe')) || lower.replace(/\\/g, '/').includes('/server.exe');
        }) || installedConfig?.binaries?.[0] || null;

        if (binaryPath) {
          if (needsVisionRestart) {
            showToast('Restarting llama-server with vision projector...');
          } else {
            showToast('Auto-starting local llama-server...');
          }
          try {
            const kCache = ((savedConfig?.kCacheQuant === 'Auto' ? 'q8_0' : savedConfig?.kCacheQuant) || 'q8_0').toLowerCase();
            const vCache = ((savedConfig?.vCacheQuant === 'Auto' ? 'q8_0' : savedConfig?.vCacheQuant) || 'q8_0').toLowerCase();

            const { modelPath, mmprojPath } = await resolveLocalPaths();

            const startBody: any = {
              binaryPath,
              modelPath,
              gpuOffload: savedConfig?.gpuOffload ?? 99,
              contextLength: savedConfig?.contextLength ?? 8192,
              cacheTypeK: kCache,
              cacheTypeV: vCache,
              threads: savedConfig?.cpuThreads ?? 8,
              host: localHost,
              port: localPort,
              noMmap: savedConfig ? !savedConfig.tryMmap : false,
              seed: (savedConfig?.seed === 'Random Seed' || String(savedConfig?.seed) === '-1') ? undefined : savedConfig?.seed,
              maxConcurrent: savedConfig?.maxConcurrent ?? 4,
              ropeFreqBase: savedConfig?.ropeFreqBase,
              ropeFreqScale: savedConfig?.ropeFreqScale,
              offloadKV: savedConfig?.offloadKV ?? true,
              keepInMemory: false, // never lock memory on auto-start, avoids Windows resource issues
              evalBatchSize: savedConfig?.evalBatchSize ?? 2048,
              physicalBatchSize: savedConfig?.physicalBatchSize ?? 512,
            };

            if (mmprojPath) {
              startBody.mmprojPath = mmprojPath;
              localStorage.setItem(`lumina_server_mmproj_${activeModelId}`, 'true');
            } else {
              localStorage.removeItem(`lumina_server_mmproj_${activeModelId}`);
            }

            await fetch('/api/llama/start', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(startBody),
            });
            showToast('llama-server ready!');
          } catch (startErr: any) {
            console.warn('Auto-start failed:', startErr);
          }
        }
      }

      const doLocalChatRequest = async () => {
        const hasVisionContent = messagesPrompt.some(m => Array.isArray(m.content));
        const thinkSetting = resolveThinkSetting(activeModelId);
        console.log('[LUMINA_DEBUG] doLocalChatRequest -> LOCAL DIRECT PATH');
        console.log('[LUMINA_DEBUG] URL:', `${localUrl}/chat/completions`);
        console.log('[LUMINA_DEBUG] Has vision content:', hasVisionContent);
        if (hasVisionContent) {
          const visionMsg = messagesPrompt.find(m => Array.isArray(m.content));
            console.log('[LUMINA_DEBUG] Vision message content types:', visionMsg?.content?.map((c: any) => c.type));
        }
        logLlmPayload('LOCAL DIRECT PATH', {
          provider: 'local-llama.cpp',
          model: activeModelId,
          baseUrl: localUrl,
          messages: messagesPrompt,
          tools: [],
          stream: false
        });
        const response = await fetch(`${localUrl}/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: activeModelId,
            messages: messagesPrompt.map(m => ({
              role: m.role,
              content: m.content  // may be string or array (vision)
            })),
            stream: false,
            temperature: 0.7,
            ...(thinkSetting !== undefined ? { think: thinkSetting } : {})
          }),
          signal
        });

        if (!response.ok) {
          // Read the real error from llama-server before throwing
          let serverError = `llama-server error ${response.status}`;
          try {
            const errBody = await response.text();
            const parsed = JSON.parse(errBody);
            serverError = parsed?.error?.message || parsed?.error || parsed?.message || errBody || serverError;
          } catch {}
          throw new Error(`[llama-server ${response.status}] ${serverError}`);
        }

        return normalizeLlmResponse(await response.json());
      };

      try {
        return await doLocalChatRequest();
      } catch (err: any) {
        // If the error is "image input is not supported" (missing mmproj), restart with mmproj and retry once
        const isMmprojError = err.message?.toLowerCase().includes('mmproj') || err.message?.toLowerCase().includes('image input is not supported');
        if (hasImageContent && isMmprojError) {
          const installedConfigRaw = localStorage.getItem('lumina_llama_installed_config');
          const installedConfig = installedConfigRaw ? JSON.parse(installedConfigRaw) : null;
          const binaryPath = installedConfig?.binaries?.find((b: string) => {
            const lower = b.toLowerCase();
            return (lower.includes('llama-server') && lower.endsWith('.exe')) || lower.replace(/\\/g, '/').includes('/server.exe');
          }) || installedConfig?.binaries?.[0] || null;

          if (binaryPath) {
            showToast('Restarting with vision projector (mmproj)...');
            try {
              const kCache = ((savedConfig?.kCacheQuant === 'Auto' ? 'q8_0' : savedConfig?.kCacheQuant) || 'q8_0').toLowerCase();
              const vCache = ((savedConfig?.vCacheQuant === 'Auto' ? 'q8_0' : savedConfig?.vCacheQuant) || 'q8_0').toLowerCase();
              const { modelPath, mmprojPath } = await resolveLocalPaths();

              if (mmprojPath) {
                const retryBody: any = {
                  binaryPath,
                  modelPath,
                  gpuOffload: savedConfig?.gpuOffload ?? 99,
                  contextLength: savedConfig?.contextLength ?? 8192,
                  cacheTypeK: kCache,
                  cacheTypeV: vCache,
                  threads: savedConfig?.cpuThreads ?? 8,
                  host: localHost,
                  port: localPort,
                  noMmap: savedConfig ? !savedConfig.tryMmap : false,
                  maxConcurrent: savedConfig?.maxConcurrent ?? 4,
                  offloadKV: savedConfig?.offloadKV ?? true,
                  keepInMemory: false,
                  evalBatchSize: savedConfig?.evalBatchSize ?? 2048,
                  physicalBatchSize: savedConfig?.physicalBatchSize ?? 512,
                  mmprojPath,
                };
                await fetch('/api/llama/start', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(retryBody),
                });
                localStorage.setItem(`lumina_server_mmproj_${activeModelId}`, 'true');
                showToast('Vision projector loaded — retrying...');
                return await doLocalChatRequest();
              }
            } catch (retryErr: any) {
              console.warn('Vision restart failed:', retryErr);
            }
          }
        }

        // Only show the fallback CLI hint for genuine connection failures, not server-side errors
        const isConnectionError = err.name === 'TypeError' || err.message?.includes('fetch') || err.message?.includes('ECONNREFUSED') || err.message?.includes('Failed to fetch');
        if (isConnectionError) {
          const storedCmd = localStorage.getItem(`lumina_cmd_${activeModelId}`) || `llama-server -m "C:/Users/YOU/.lumina/models/...GGUF" -ngl 99 -c 8192 -t 8 --host 127.0.0.1 --port 1234`;
          throw new Error(`Unable to reach local llama.cpp server at ${localUrl.replace(/\/v1$/, '')}.\n\nFallback: paste this into your terminal:\n\n${storedCmd}`);
        }
        throw err;
      }
    }

    console.log('[LUMINA_DEBUG] callLlamaBridge -> /api/chat FALLBACK PATH');
    console.log('[LUMINA_DEBUG] Provider:', selectedProvider, 'Base URL:', baseUrl);
    const hasArrayContent = messagesPrompt.some(m => Array.isArray(m.content));
    console.log('[LUMINA_DEBUG] Has array content in messages:', hasArrayContent);
    logLlmPayload('/api/chat FALLBACK PATH', {
      provider: selectedProvider,
      model: activeModelId,
      baseUrl,
      messages: messagesPrompt,
      tools: requestTools,
      stream: false
    });
    const makeFallbackRequest = () => fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: messagesPrompt,
        model: activeModelId,
        config: {
          provider: selectedProvider,
          baseUrl,
        },
        tools: requestTools,
        stream: false,
        ragConfig,
        think: resolveThinkSetting(activeModelId)
      }),
      signal,
    });

    let response = await makeFallbackRequest();

    if (!response.ok) {
      const text = await response.text();
      let errorMsg = `Server returned status ${response.status}`;
      try {
        const parsed = JSON.parse(text);
        const baseMsg = parsed.error?.message || parsed.error || parsed.message || errorMsg;
        const detail = parsed.detail ? (typeof parsed.detail === 'string' ? parsed.detail : JSON.stringify(parsed.detail)) : '';
        errorMsg = detail ? `${baseMsg} — ${detail}` : (typeof baseMsg === 'object' ? JSON.stringify(baseMsg) : baseMsg);
      } catch {
        if (text.trim().startsWith('<')) {
          errorMsg = `Server error (HTML response with status ${response.status})`;
        } else if (text) {
          errorMsg = text.substring(0, 200);
        }
      }
      if (isRateLimitError(errorMsg, response.status)) {
        throw new Error(`Rate limited: ${errorMsg}. Try waiting, adding your own API key in Settings, or switching to a different model.`);
      }
      if (response.status === 402) {
        throw new Error(`Payment required: ${errorMsg}. The provider has exhausted its credits or your API key is invalid. Try adding your own API key in Settings or switching to a different model.`);
      }
      throw new Error(errorMsg);
    }

    const contentLength = response.headers.get('content-length');
    const contentType = response.headers.get('content-type');
    if (contentLength === '0' || (!contentLength && contentType && !contentType.includes('application/json'))) {
      throw new Error(`Server returned status ${response.status} with an empty or non-JSON response body.`);
    }

    return normalizeLlmResponse(await response.json());
  };

  return {
    llamaBridgeUrl, setLlamaBridgeUrl,
    llamaBridgeApiKey, setLlamaBridgeApiKey,
    llamaBridgeModels, setLlamaBridgeModels,
    selectedLlamaModel, setSelectedLlamaModel,
    useBridgeTools, setUseBridgeTools,
    bridgeTools, setBridgeTools,
    isMcpConnected, setIsMcpConnected,
    aiVerificationState,
    handleTestLlamaConnection,
    handleLoadBridgeTools,
    handleLoadLlamaModels,
    callLlamaBridge
  };
}
