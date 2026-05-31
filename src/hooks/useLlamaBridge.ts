import { useState, useCallback, useEffect } from 'react';
import { fetchBridgeTools, checkBridgeHealth } from '../bridgeClient';
import { Tool, ToolDefinition } from '../types';

export interface UseLlamaBridgeProps {
  serverUrl: string;
  apiKey: string;
  selectedProvider: string;
  activeModelId: string;
  showToast: (msg: string) => void;
}

export function useLlamaBridge({
  serverUrl,
  apiKey,
  selectedProvider,
  activeModelId,
  showToast
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
        throw new Error(errorMsg);
      }

      const text = await response.text();
      try {
        return JSON.parse(text);
      } catch {
        throw new Error(`Failed to parse response: ${text.substring(0, 100)}`);
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
