/**
 * Pi Agent Service - Integration wrapper for the pi-coding-agent via server API
 *
 * This service provides a clean interface to use the pi coding agent SDK
 * by making requests to the server endpoint /api/pi-agent/run instead of
 * importing the Node.js SDK directly (which doesn't work in browsers).
 */

export interface AppAgentMessage {
  id?: string;
  role: string;
  content: string;
  timestamp?: number;
  toolCallId?: string;
}

export interface PiAgentResult {
  text: string;
  toolCalls: Array<{
    id: string;
    name: string;
    arguments: any;
  }>;
  toolResults: Array<{
    toolCallId: string;
    result: any;
  }>;
  stopReason: string;
}

export type PiAgentEventHandler = (event: PiAgentEvent) => void;

export type PiAgentEvent =
  | { type: 'token'; text: string }
  | { type: 'thinking'; content: string }
  | { type: 'tool_call_start'; toolCallId: string; toolName: string; args?: any }
  | { type: 'tool_call_end'; toolCallId: string; toolName: string; result: any; args?: any }
  | { type: 'text'; content: string }
  | { type: 'done'; result?: PiAgentResult }
  | { type: 'error'; error: string };

export interface PiAgentInstance {
  dispose: () => void;
}

export type ThinkingLevel = 'off' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh';

export interface CoderAgentConfig {
  workspacePath: string;
  apiKey?: string;
  model?: {
    id?: string;
    provider?: string;
    baseUrl?: string;
  };
  systemPrompt?: string;
  thinkingLevel?: ThinkingLevel;
}

interface RunningRequest {
  controller: AbortController;
  reader: ReadableStreamDefaultReader<Uint8Array>;
}

/**
 * Create a coder pi agent - returns a lightweight instance that uses server API
 * Note: We don't actually create a session on the server until we run a task
 */
export async function createCoderPiAgent(config: CoderAgentConfig): Promise<PiAgentInstance> {
  // The actual session is created on the server when we run a task
  // We just store the config for later use
  const agentConfig = config;
  
  return {
    dispose: () => {
      // No cleanup needed - the server handles session lifecycle
    },
    _config: agentConfig,
  } as PiAgentInstance;
}

// Extend PiAgentInstance to include config
declare module './piAgentService' {
  interface PiAgentInstance {
    _config?: CoderAgentConfig;
  }
}

/**
 * Resolve the correct provider profile for a given model ID from localStorage.
 * This mirrors how normal chat mode resolves providers via handleSelectAiProfileModel.
 */
function resolveProviderForModel(modelId: string, fallbackProvider?: string, fallbackEndpoint?: string, fallbackApiKey?: string) {
  try {
    const profilesRaw = localStorage.getItem('lumina_ai_provider_profiles');
    if (profilesRaw) {
      const profiles: Array<{
        id: string;
        name: string;
        provider: string;
        endpoint: string;
        apiKey: string;
        models: Array<{ id: string; name: string }>;
        active?: boolean;
      }> = JSON.parse(profilesRaw);

      // First: look for an active profile that has this exact model
      const activeProfileWithModel = profiles.find(
        p => p.active !== false && p.models.some(m => m.id === modelId)
      );
      if (activeProfileWithModel) {
        return {
          provider: activeProfileWithModel.provider,
          endpoint: activeProfileWithModel.endpoint,
          apiKey: activeProfileWithModel.apiKey,
          modelId,
        };
      }

      // Second: any profile (active or not) with this model — prefer active
      const anyProfileWithModel = profiles.find(p => p.models.some(m => m.id === modelId));
      if (anyProfileWithModel) {
        return {
          provider: anyProfileWithModel.provider,
          endpoint: anyProfileWithModel.endpoint,
          apiKey: anyProfileWithModel.apiKey,
          modelId,
        };
      }
    }
  } catch (e) {
    console.warn('[PiAgent Service] Failed to read aiProviderProfiles from localStorage:', e);
  }

  // Fallback to values passed directly (from selectedProvider / serverUrl / apiKey state)
  return {
    provider: fallbackProvider || localStorage.getItem('lumina_provider') || 'openprovider',
    endpoint: fallbackEndpoint || localStorage.getItem('lumina_server_url') || 'https://openprovider.mimika.in/v1',
    apiKey: fallbackApiKey || localStorage.getItem('lumina_api_key') || '',
    modelId,
  };
}

/**
 * Run a task with the coder pi agent and stream events via server API
 */
export async function runCoderPiAgent(
  agentInstance: PiAgentInstance,
  task: string,
  onEvent: PiAgentEventHandler,
  signal?: AbortSignal
): Promise<PiAgentResult> {
  const config = (agentInstance as any)._config as CoderAgentConfig;
  
  // Resolve model ID from config
  const actualModelId = config.model?.id || localStorage.getItem('lumina_selected_model') || 'openprovider/auto-free';
  
  // Look up the correct provider profile using the same method as normal chat mode
  const resolved = resolveProviderForModel(
    actualModelId,
    config.model?.provider,
    config.model?.baseUrl,
    config.apiKey
  );
  
  const actualProvider = resolved.provider;
  const actualEndpoint = resolved.endpoint;
  const actualApiKey = resolved.apiKey;

  const providerProfile = {
    id: actualProvider,
    name: actualProvider,
    provider: actualProvider,
    endpoint: actualEndpoint,
    apiKey: actualApiKey,
    models: [{ id: actualModelId, name: actualModelId }],
  };

  console.log('[PiAgent Service] Selected model:', actualModelId);
  console.log('[PiAgent Service] Provider profile found:', providerProfile?.provider, '- endpoint:', providerProfile?.endpoint);
  console.log('[PiAgent Service] Actual model ID to use:', actualModelId);

  const requestBody = {
    task,
    workspacePath: config.workspacePath,
    apiKey: actualApiKey || config.apiKey || '',
    model: {
      id: actualModelId,
      provider: actualProvider,
      baseUrl: actualEndpoint,
    },
    modelId: actualModelId,
    thinkingLevel: config.thinkingLevel || 'high',
    providerProfile: providerProfile || null,
  };

  console.log('[PiAgent Service] Sending request to backend /api/pi-agent/run:', requestBody);
  
  if (typeof window !== 'undefined') {
    const apiLog = {
      id: `pi-agent-req-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      method: 'POST',
      endpoint: '/api/pi-agent/run',
      status: 200,
      statusText: 'Pending',
      latency: 0,
      type: 'ai' as const,
      request: JSON.stringify(requestBody, null, 2),
      response: 'Streaming logs...'
    };
    window.dispatchEvent(new CustomEvent('lumina_new_api_log', { detail: apiLog }));
  }

  let accumulatedText = '';
  const toolResults: PiAgentResult['toolResults'] = [];
  const toolCalls: PiAgentResult['toolCalls'] = [];
  
  const controller = new AbortController();
  const runningRequest: RunningRequest = {
    controller,
    reader: {} as ReadableStreamDefaultReader<Uint8Array>,
  };

  // Handle external abort signal
  if (signal) {
    signal.addEventListener('abort', () => {
      controller.abort();
    });
  }

  try {
    const response = await fetch('/api/pi-agent/run', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Server error: ${response.status}`);
    }

    if (!response.body) {
      throw new Error('No response body');
    }

    const reader = response.body.getReader();
    runningRequest.reader = reader;

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      
      // Split by newlines and process each JSON line
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer

      for (const line of lines) {
        if (!line.trim()) continue;
        
        try {
          const event = JSON.parse(line) as PiAgentEvent;
          
          // Transform server events to client events
          switch (event.type) {
            case 'token':
              accumulatedText += event.text;
              onEvent({ type: 'text', content: event.text });
              break;
            case 'thinking':
              onEvent({ type: 'thinking', content: event.content });
              break;
            case 'tool_call_start':
              console.log(`[PiAgent Backend Log] Tool execution start: "${event.toolName}" (ID: ${event.toolCallId || ''})`, 'args:', event.args || {});
              if (typeof window !== 'undefined') {
                const toolLog = {
                  id: `pi-agent-tool-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                  timestamp: new Date().toLocaleTimeString(),
                  method: 'EXEC',
                  endpoint: `tool:${event.toolName}`,
                  status: 200,
                  statusText: 'Running',
                  latency: 0,
                  type: 'ai' as const,
                  request: JSON.stringify(event.args || {}, null, 2),
                  response: 'Running...'
                };
                window.dispatchEvent(new CustomEvent('lumina_new_api_log', { detail: toolLog }));
              }
              onEvent({
                type: 'tool_call_start',
                toolCallId: event.toolCallId || '',
                toolName: event.toolName,
                args: event.args,
              });
              break;
            case 'tool_call_end':
              console.log(`[PiAgent Backend Log] Tool execution end: "${event.toolName}" (ID: ${event.toolCallId || ''})`, 'result:', event.result);
              if (typeof window !== 'undefined') {
                const toolLog = {
                  id: `pi-agent-tool-end-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                  timestamp: new Date().toLocaleTimeString(),
                  method: 'RESULT',
                  endpoint: `tool:${event.toolName}`,
                  status: 200,
                  statusText: 'Completed',
                  latency: 0,
                  type: 'ai' as const,
                  request: `Tool ID: ${event.toolCallId || ''}`,
                  response: typeof event.result === 'string' ? event.result : JSON.stringify(event.result || {}, null, 2)
                };
                window.dispatchEvent(new CustomEvent('lumina_new_api_log', { detail: toolLog }));
              }
              toolResults.push({
                toolCallId: event.toolCallId || '',
                result: event.result,
              });
              onEvent({
                type: 'tool_call_end',
                toolCallId: event.toolCallId || '',
                toolName: event.toolName,
                result: event.result,
              });
              break;
            case 'done':
              console.log('[PiAgent Backend Log] Done - execution completed.');
              if (typeof window !== 'undefined') {
                const doneLog = {
                  id: `pi-agent-done-${Date.now()}`,
                  timestamp: new Date().toLocaleTimeString(),
                  method: 'DONE',
                  endpoint: '/api/pi-agent/run',
                  status: 200,
                  statusText: 'Done',
                  latency: 0,
                  type: 'ai' as const,
                  request: 'Done',
                  response: 'Pi Agent execution finished successfully.'
                };
                window.dispatchEvent(new CustomEvent('lumina_new_api_log', { detail: doneLog }));
              }
              onEvent({ type: 'done' });
              break;
            case 'error':
              console.error('[PiAgent Backend Log] Error:', event.error);
              if (typeof window !== 'undefined') {
                const errLog = {
                  id: `pi-agent-err-${Date.now()}`,
                  timestamp: new Date().toLocaleTimeString(),
                  method: 'ERROR',
                  endpoint: '/api/pi-agent/run',
                  status: 500,
                  statusText: 'Failed',
                  latency: 0,
                  type: 'ai' as const,
                  request: 'Error',
                  response: event.error
                };
                window.dispatchEvent(new CustomEvent('lumina_new_api_log', { detail: errLog }));
              }
              onEvent({ type: 'error', error: event.error });
              break;
          }
        } catch (e) {
          // Skip parse errors for malformed JSON lines
          console.warn('Failed to parse event:', line.substring(0, 100));
        }
      }
    }

    const result: PiAgentResult = {
      text: accumulatedText,
      toolCalls,
      toolResults,
      stopReason: 'end_turn',
    };
    
    onEvent({ type: 'done', result });
    return result;
    
  } catch (error: any) {
    if (error.name === 'AbortError') {
      onEvent({ type: 'error', error: 'Request aborted' });
      throw error;
    }
    const errMsg = error instanceof Error ? error.message : String(error);
    onEvent({ type: 'error', error: errMsg });
    throw error;
  }
}

// Backwards compatibility - PiAgentConfig (legacy)
export interface PiAgentConfig {
  model: {
    id: string;
    name: string;
    provider: string;
    api: string;
    baseUrl: string;
  };
  systemPrompt: string;
  tools: Array<{
    name: string;
    description: string;
    parameters: any;
    handler: (args: any, context: any) => Promise<any>;
  }>;
  thinkingLevel?: ThinkingLevel;
  sessionId?: string;
  apiKey?: string;
  workspacePath?: string;
}

/**
 * Legacy createPiAgent - maps to createCoderPiAgent
 */
export async function createPiAgent(config: PiAgentConfig): Promise<PiAgentInstance> {
  return createCoderPiAgent({
    workspacePath: config.workspacePath || '.',
    apiKey: config.apiKey,
    model: {
      id: config.model.id,
      provider: config.model.provider,
      baseUrl: config.model.baseUrl,
    },
    thinkingLevel: config.thinkingLevel,
  });
}

/**
 * Legacy runPiAgent - maps to runCoderPiAgent
 */
export async function runPiAgent(
  agentInstance: PiAgentInstance,
  userMessage: string,
  history: AppAgentMessage[],
  onEvent: PiAgentEventHandler,
  signal?: AbortSignal
): Promise<PiAgentResult> {
  // Combine history and user message
  const task = history.map(m => `${m.role}: ${m.content}`).join('\n\n') + '\n\nuser: ' + userMessage;
  return runCoderPiAgent(agentInstance, task, onEvent, signal);
}

/**
 * Legacy runCoderTask - maps to runCoderPiAgent
 */
export async function runCoderTask(
  agentInstance: PiAgentInstance,
  task: string,
  workspacePath: string,
  onEvent: PiAgentEventHandler,
  signal?: AbortSignal
): Promise<PiAgentResult> {
  return runCoderPiAgent(agentInstance, task, onEvent, signal);
}