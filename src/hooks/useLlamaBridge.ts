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
      try {
        const stored = localStorage.getItem(`lumina_model_settings_${activeModelId}`);
        if (stored) {
          const config = JSON.parse(stored);
          const port = config.localPort || 1234;
          const host = config.localHost || '127.0.0.1';
          localUrl = `http://${host}:${port}/v1`;
        }
      } catch (e) {
        console.warn("Could not parse local model settings", e);
      }

      try {
        const response = await fetch(`${localUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: activeModelId,
            messages: messagesPrompt.map(m => ({
              role: m.role,
              content: m.content
            })),
            stream: false,
            temperature: 0.7
          }),
          signal
        });

        if (!response.ok) {
          throw new Error(`Local llama-server returned status ${response.status}`);
        }

        const data = await response.json();
        return data;
      } catch (err: any) {
        console.error("Local llama-server connection failed:", err);
        const storedCmd = localStorage.getItem(`lumina_cmd_${activeModelId}`) || `llama-server -m "C:/Users/YOU/.lumina/models/...GGUF" -ngl 99 -c 32768 -t 8 --host 127.0.0.1 --port 1234`;
        throw new Error(`Unable to reach your local llama.cpp server at ${localUrl.replace(/\/v1$/, '')}.\n\nPlease ensure your server is running by pasting this command into your terminal:\n\n${storedCmd}`);
      }
    }

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
