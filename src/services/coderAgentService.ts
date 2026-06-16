/**
 * Coder Agent Service - Integration wrapper for the AI SDK coder-agent via server API
 *
 * This service provides a clean interface to use the AI SDK coder agent
 * by making requests to the server endpoint /api/coder/run.
 */

export interface AppAgentMessage {
  id?: string;
  role: string;
  content: string;
  timestamp?: number;
  toolCallId?: string;
}

export interface CoderAgentResult {
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

export type CoderAgentEventHandler = (event: CoderAgentEvent) => void;

export type CoderAgentEvent =
  | { type: 'token'; text: string }
  | { type: 'thinking'; content: string }
  | { type: 'tool_call_start'; toolCallId: string; toolName: string; args?: any }
  | { type: 'tool_call_end'; toolCallId: string; toolName: string; result: any; args?: any }
  | { type: 'text'; content: string }
  | { type: 'done'; result?: CoderAgentResult }
  | { type: 'error'; error: string };

export interface CoderAgentInstance {
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
 * Create a coder agent - returns a lightweight instance that uses server API
 */
export async function createCoderAgent(config: CoderAgentConfig): Promise<CoderAgentInstance> {
  const agentConfig = config;
  
  return {
    dispose: () => {
      // No cleanup needed
    },
    _config: agentConfig,
  } as CoderAgentInstance;
}

// Extend CoderAgentInstance to include config
declare module './coderAgentService' {
  interface CoderAgentInstance {
    _config?: CoderAgentConfig;
  }
}

/**
 * Resolve the correct provider profile for a given model ID from localStorage.
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

      // Second: any profile with this model
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
    console.warn('[CoderAgent Service] Failed to read aiProviderProfiles from localStorage:', e);
  }

  return {
    provider: fallbackProvider || localStorage.getItem('lumina_provider') || 'openprovider',
    endpoint: fallbackEndpoint || localStorage.getItem('lumina_server_url') || 'https://openprovider.mimika.in/v1',
    apiKey: fallbackApiKey || '',
    modelId,
  };
}

/**
 * Run a task with the coder agent and stream events via server API
 */
export async function runCoderAgent(
  agentInstance: CoderAgentInstance,
  task: string,
  onEvent: CoderAgentEventHandler,
  signal?: AbortSignal
): Promise<CoderAgentResult> {
  const config = (agentInstance as any)._config as CoderAgentConfig;
  
  // Resolve model ID from config
  const actualModelId = config.model?.id || localStorage.getItem('lumina_selected_model') || 'openprovider/auto-free';
  
  // Look up the correct provider profile
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

  console.log('[CoderAgent Service] Selected model:', actualModelId);
  console.log('[CoderAgent Service] Provider profile found:', providerProfile?.provider, '- endpoint:', providerProfile?.endpoint);
  console.log('[CoderAgent Service] Actual model ID to use:', actualModelId);

  const subagentConfigs: Record<string, any> = {};
  try {
    const savedConfigsStr = localStorage.getItem('lumina_subagent_configs');
    const profilesStr = localStorage.getItem('lumina_ai_provider_profiles');
    if (savedConfigsStr && profilesStr) {
      const configs = JSON.parse(savedConfigsStr);
      const profiles = JSON.parse(profilesStr);
      const agentIds = ['orchestrator', 'analyzer', 'coder', 'debugger', 'reviewer'];
      for (const id of agentIds) {
        if (configs[id]) {
          const cfg = configs[id];
          const modelId = cfg.modelId;
          const matchingProfile = profiles.find((p: any) => p.id === cfg.providerProfileId || p.models.some((m: any) => m.id === modelId));
          if (matchingProfile) {
            subagentConfigs[id] = {
              modelId,
              endpoint: matchingProfile.endpoint,
              apiKey: matchingProfile.apiKey,
              provider: matchingProfile.provider,
              systemPrompt: cfg.systemPrompt,
              tools: cfg.tools
            };
          }
        }
      }
    }
  } catch (e) {
    console.warn('[CoderAgent Service] Failed to parse subagent configs:', e);
  }

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
    systemPrompt: config.systemPrompt,
    providerProfile: providerProfile || null,
    subagentConfigs,
  };

  console.log('[CoderAgent Service] Sending request to backend /api/coder/run:', requestBody);
  
  if (typeof window !== 'undefined') {
    const apiLog = {
      id: `coder-agent-req-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      method: 'POST',
      endpoint: '/api/coder/run',
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
  const toolResults: CoderAgentResult['toolResults'] = [];
  const toolCalls: CoderAgentResult['toolCalls'] = [];
  let finalResultFromBackend: CoderAgentResult | null = null;
  let didDispatchDoneEvent = false;
  
  const controller = new AbortController();
  const runningRequest: RunningRequest = {
    controller,
    reader: {} as ReadableStreamDefaultReader<Uint8Array>,
  };

  if (signal) {
    signal.addEventListener('abort', () => {
      controller.abort();
    });
  }

  try {
    const response = await fetch('/api/coder/run', {
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
      
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;
        
        let parsedLine = line;
        
        // Detect Vercel AI SDK SSE format and convert to legacy format
        if (line.startsWith('0:') || line.startsWith('b:') || line.startsWith('a:') || line.startsWith('d:') || line.startsWith('3:')) {
          try {
            const prefix = line[0];
            const data = line.substring(2);
            
            if (prefix === '0') {
              // text delta
              parsedLine = JSON.stringify({ type: 'token', text: JSON.parse(data) });
            } else if (prefix === 'b') {
              // tool call start
              const obj = JSON.parse(data);
              parsedLine = JSON.stringify({ type: 'tool_call_start', toolCallId: obj.toolCallId, toolName: obj.toolName, args: obj.argsTextDelta || {} });
            } else if (prefix === 'a') {
              // tool result
              const obj = JSON.parse(data);
              parsedLine = JSON.stringify({ type: 'tool_call_end', toolCallId: obj.toolCallId, toolName: '', result: obj.result });
            } else if (prefix === 'd') {
              // done
              parsedLine = JSON.stringify({ type: 'done' });
            } else if (prefix === '3') {
              // error
              parsedLine = JSON.stringify({ type: 'error', error: JSON.parse(data) });
            }
          } catch (e) {
            console.warn('[CoderAgent] Failed to convert Vercel format line:', line.substring(0, 50));
          }
        }
        
        try {
          const event = JSON.parse(parsedLine) as CoderAgentEvent;
          
          switch (event.type) {
            case 'token':
              accumulatedText += event.text;
              onEvent({ type: 'text', content: event.text });
              break;
            case 'thinking':
              onEvent({ type: 'thinking', content: event.content });
              break;
            case 'tool_call_start':
              console.log(`[CoderAgent Backend Log] Tool execution start: "${event.toolName}" (ID: ${event.toolCallId || ''})`, 'args:', event.args || {});
              if (typeof window !== 'undefined') {
                const toolLog = {
                  id: `coder-agent-tool-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
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
              console.log(`[CoderAgent Backend Log] Tool execution end: "${event.toolName}" (ID: ${event.toolCallId || ''})`, 'result:', event.result);
              if (typeof window !== 'undefined') {
                const toolLog = {
                  id: `coder-agent-tool-end-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
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
              console.log('[CoderAgent Backend Log] Done - execution completed.');
              if (event.result) {
                finalResultFromBackend = event.result;
                if (!accumulatedText && typeof event.result.text === 'string') {
                  accumulatedText = event.result.text;
                }
                if (Array.isArray(event.result.toolCalls) && event.result.toolCalls.length > 0) {
                  toolCalls.splice(0, toolCalls.length, ...event.result.toolCalls);
                }
                if (Array.isArray(event.result.toolResults) && event.result.toolResults.length > 0) {
                  toolResults.splice(0, toolResults.length, ...event.result.toolResults);
                }
              }
              if (typeof window !== 'undefined') {
                const doneLog = {
                  id: `coder-agent-done-${Date.now()}`,
                  timestamp: new Date().toLocaleTimeString(),
                  method: 'DONE',
                  endpoint: '/api/coder/run',
                  status: 200,
                  statusText: 'Done',
                  latency: 0,
                  type: 'ai' as const,
                  request: 'Done',
                  response: 'Coder Agent execution finished successfully.'
                };
                window.dispatchEvent(new CustomEvent('lumina_new_api_log', { detail: doneLog }));
              }
              didDispatchDoneEvent = true;
              onEvent({ type: 'done', result: event.result });
              break;
            case 'error':
              console.error('[CoderAgent Backend Log] Error:', event.error);
              if (typeof window !== 'undefined') {
                const errLog = {
                  id: `coder-agent-err-${Date.now()}`,
                  timestamp: new Date().toLocaleTimeString(),
                  method: 'ERROR',
                  endpoint: '/api/coder/run',
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
          console.warn('Failed to parse event:', line.substring(0, 100));
        }
      }
    }

    const result: CoderAgentResult = finalResultFromBackend || {
      text: accumulatedText,
      toolCalls,
      toolResults,
      stopReason: 'end_turn',
    };
    
    if (!didDispatchDoneEvent) {
      onEvent({ type: 'done', result });
    }
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

// Backwards compatibility
export interface PiAgentConfig extends CoderAgentConfig {
  model: {
    id: string;
    name: string;
    provider: string;
    api: string;
    baseUrl: string;
  };
  tools: Array<{
    name: string;
    description: string;
    parameters: any;
    handler: (args: any, context: any) => Promise<any>;
  }>;
  sessionId?: string;
}
export type PiAgentInstance = CoderAgentInstance;
export type PiAgentResult = CoderAgentResult;
export type PiAgentEventHandler = CoderAgentEventHandler;
export type PiAgentEvent = CoderAgentEvent;

export async function createPiAgent(config: any): Promise<PiAgentInstance> {
  return createCoderAgent({
    workspacePath: config.workspacePath || '.',
    apiKey: config.apiKey,
    model: {
      id: config.model?.id,
      provider: config.model?.provider,
      baseUrl: config.model?.baseUrl,
    },
    thinkingLevel: config.thinkingLevel,
  });
}

export async function runPiAgent(
  agentInstance: PiAgentInstance,
  userMessage: string,
  history: AppAgentMessage[],
  onEvent: PiAgentEventHandler,
  signal?: AbortSignal
): Promise<PiAgentResult> {
  const task = history.map(m => `${m.role}: ${m.content}`).join('\n\n') + '\n\nuser: ' + userMessage;
  return runCoderAgent(agentInstance, task, onEvent, signal);
}

export async function runCoderTask(
  agentInstance: PiAgentInstance,
  task: string,
  workspacePath: string,
  onEvent: PiAgentEventHandler,
  signal?: AbortSignal
): Promise<PiAgentResult> {
  return runCoderAgent(agentInstance, task, onEvent, signal);
}

export const createCoderPiAgent = createCoderAgent;
export const runCoderPiAgent = runCoderAgent;
