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

function isRateLimitError(msg: string): boolean {
  const lower = msg.toLowerCase();
  return lower.includes('429') ||
    lower.includes('rate_limit') ||
    lower.includes('rate-limited') ||
    lower.includes('rate limited') ||
    lower.includes('too many requests') ||
    lower.includes('quota exceeded');
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
    const parameters = tool.function?.parameters && typeof tool.function.parameters === 'object'
      ? tool.function.parameters
      : { type: 'object', properties: {}, required: [] };

    return {
      type: 'function' as const,
      function: {
        name: tool.function.name,
        description: tool.function.description || tool.function.name,
        parameters: {
          type: parameters.type || 'object',
          properties: parameters.properties || {},
          required: Array.isArray(parameters.required) ? parameters.required : []
        }
      }
    };
  });

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
    const useBridge = useBridgeTools && llamaBridgeUrl;
    const baseUrl = useBridge ? llamaBridgeUrl.replace(/\/+$/, '') : serverUrl.replace(/\/+$/, '');
    const key = useBridge ? llamaBridgeApiKey : apiKey;
    const requestTools = normalizeTools(tools);

    if (useBridge) {
      console.log('[LUMINA_DEBUG] callLlamaBridge -> BRIDGE PATH');
      if (messagesPrompt.some(m => Array.isArray(m.content))) {
        console.log('[LUMINA_DEBUG] Bridge path has array content messages');
      }
      const response = await fetch('/api/bridge/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bridgeUrl: baseUrl.replace(/\/v1\/?$/, '').replace(/\/$/, ''),
          apiKey: key,
          model: selectedLlamaModel,
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
        return JSON.parse(text);
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
        console.log('[LUMINA_DEBUG] doLocalChatRequest -> LOCAL DIRECT PATH');
        console.log('[LUMINA_DEBUG] URL:', `${localUrl}/chat/completions`);
        console.log('[LUMINA_DEBUG] Has vision content:', hasVisionContent);
        if (hasVisionContent) {
          const visionMsg = messagesPrompt.find(m => Array.isArray(m.content));
          console.log('[LUMINA_DEBUG] Vision message content types:', visionMsg?.content?.map((c: any) => c.type));
        }
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
            temperature: 0.7
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

        return await response.json();
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
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: messagesPrompt,
        model: activeModelId,
        config: {
          provider: selectedProvider,
          baseUrl,
          apiKey: key,
        },
        tools: requestTools,
        stream: false,
      }),
      signal,
    });

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
      if (isRateLimitError(errorMsg)) {
        throw new Error(`Rate limited: ${errorMsg}. Try waiting, adding your own API key in Settings, or switching to a different model.`);
      }
      throw new Error(errorMsg);
    }

    return response.json();
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
