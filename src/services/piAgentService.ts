/**
 * Pi Agent Service - Integration wrapper for the advanced pi agent framework
 * 
 * This service provides a clean interface to use the pi agent (from "src - pi")
 * as an alternative agent engine in the main application.
 */

import { Agent, runAgentLoop, runAgentLoopContinue, type AgentMessage } from '@pi-agent/index';
import type { Agent as AppAgent, AgentMessage as AppAgentMessage, AgentTool, AgentPermissions } from '../agents/types';

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
    handler: (args: any, context: PiAgentContext) => Promise<any>;
  }>;
  thinkingLevel?: 'off' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh';
  sessionId?: string;
  apiKey?: string;
}

export interface PiAgentContext {
  workspacePath?: string;
  chatHistory: AppAgentMessage[];
  userMessage: string;
  signal?: AbortSignal;
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
  usage?: {
    input: number;
    output: number;
    total: number;
  };
  stopReason: string;
}

export type PiAgentEventHandler = (event: PiAgentEvent) => void;

export type PiAgentEvent = 
  | { type: 'text'; content: string }
  | { type: 'tool_call_start'; toolCallId: string; toolName: string }
  | { type: 'tool_call_end'; toolCallId: string; toolName: string; result: any }
  | { type: 'thinking'; content: string }
  | { type: 'done'; result: PiAgentResult }
  | { type: 'error'; error: string };

/**
 * Convert app agent message format to pi agent message format
 */
function toPiMessages(messages: AppAgentMessage[]): AgentMessage[] {
  return messages.map(msg => ({
    role: msg.role === 'tool' ? 'tool' : msg.role,
    content: [{ type: 'text' as const, text: msg.content }],
    timestamp: msg.timestamp,
    toolCallId: msg.toolCallId,
  }));
}

/**
 * Create a new pi agent instance
 */
export function createPiAgent(config: PiAgentConfig): Agent {
  const tools = config.tools.map(tool => ({
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters || { type: 'object', properties: {}, required: [] },
    handler: async (args: any, context: any) => {
      try {
        return await tool.handler(args, context as PiAgentContext);
      } catch (error) {
        return { error: error instanceof Error ? error.message : String(error) };
      }
    },
  }));

  return new Agent({
    initialState: {
      systemPrompt: config.systemPrompt,
      model: {
        id: config.model.id,
        name: config.model.name,
        provider: config.model.provider,
        api: config.model.api,
        baseUrl: config.model.baseUrl,
        reasoning: config.thinkingLevel !== 'off',
        input: [],
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
        contextWindow: 128000,
        maxTokens: 32768,
      },
      thinkingLevel: config.thinkingLevel || 'medium',
      tools: tools as any,
      messages: [],
    },
    sessionId: config.sessionId,
    getApiKey: config.apiKey ? () => config.apiKey : undefined,
  });
}

/**
 * Run a pi agent with streaming callbacks
 */
export async function runPiAgent(
  agent: Agent,
  userMessage: string,
  history: AppAgentMessage[],
  onEvent: PiAgentEventHandler,
  signal?: AbortSignal
): Promise<PiAgentResult> {
  const messages: AgentMessage[] = [
    ...toPiMessages(history),
    { role: 'user', content: [{ type: 'text', text: userMessage }], timestamp: Date.now() }
  ];

  let accumulatedText = '';
  let toolCalls: PiAgentResult['toolCalls'] = [];
  let toolResults: PiAgentResult['toolResults'] = [];

  return new Promise((resolve, reject) => {
    const handleError = (error: unknown) => {
      const errMsg = error instanceof Error ? error.message : String(error);
      onEvent({ type: 'error', error: errMsg });
      reject(new Error(errMsg));
    };

    try {
      agent.prompt(messages).then(() => {
        const result: PiAgentResult = {
          text: accumulatedText,
          toolCalls,
          toolResults,
          stopReason: 'end_turn',
        };
        onEvent({ type: 'done', result });
        resolve(result);
      }).catch(handleError);

      // Subscribe to agent events for streaming
      const unsubscribe = agent.subscribe(async (event, eventSignal) => {
        if (signal?.aborted || eventSignal.aborted) {
          agent.abort();
          return;
        }

        switch (event.type) {
          case 'message_start':
            break;
          case 'message_update':
            if (event.message.content) {
              const text = event.message.content
                .filter((c: any) => c.type === 'text')
                .map((c: any) => c.text)
                .join('');
              if (text) {
                accumulatedText += text;
                onEvent({ type: 'text', content: text });
              }
            }
            break;
          case 'tool_execution_start':
            onEvent({ 
              type: 'tool_call_start', 
              toolCallId: event.toolCallId, 
              toolName: event.toolName 
            });
            break;
          case 'tool_execution_end':
            onEvent({ 
              type: 'tool_call_end', 
              toolCallId: event.toolCallId, 
              toolName: event.toolName,
              result: event.result 
            });
            toolResults.push({
              toolCallId: event.toolCallId,
              result: event.result,
            });
            break;
          case 'thinking':
            if (event.content) {
              onEvent({ type: 'thinking', content: event.content });
            }
            break;
        }
      });
    } catch (error) {
      handleError(error);
    }
  });
}

/**
 * Create a pi agent optimized for coder mode with file system tools
 */
export function createCoderPiAgent(config: {
  workspacePath: string;
  apiKey?: string;
  model?: {
    id?: string;
    provider?: string;
    baseUrl?: string;
  };
}) {
  const modelConfig = config.model || {};
  
  return createPiAgent({
    model: {
      id: modelConfig.id || 'anthropic/claude-sonnet-4-20250514',
      name: modelConfig.id || 'claude-sonnet-4',
      provider: modelConfig.provider || 'anthropic',
      api: 'anthropic',
      baseUrl: modelConfig.baseUrl || 'https://api.anthropic.com',
    },
    systemPrompt: `You are an expert software developer working in a coding workspace.

## Workspace
You have access to the workspace at: ${config.workspacePath}

## Capabilities
- Read, write, and edit files in the workspace
- Execute commands in a terminal
- Use LSP for code intelligence
- Search and analyze codebases

## Workflow
1. Understand the user's request
2. Plan the changes needed
3. Execute changes step by step
4. Verify the changes work correctly

Always provide clear, working code solutions.`,
    thinkingLevel: 'high',
    sessionId: `coder-${Date.now()}`,
    apiKey: config.apiKey,
    tools: [
      {
        name: 'read_file',
        description: 'Read the contents of a file',
        parameters: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Relative path to the file' }
          },
          required: ['path']
        },
        handler: async (args: { path: string }) => {
          const response = await fetch('/api/fs/read', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              filePath: `${config.workspacePath}/${args.path}` 
            })
          });
          if (!response.ok) {
            throw new Error(`Failed to read file: ${args.path}`);
          }
          return await response.json();
        }
      },
      {
        name: 'write_file',
        description: 'Write content to a file',
        parameters: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Relative path to the file' },
            content: { type: 'string', description: 'Content to write' }
          },
          required: ['path', 'content']
        },
        handler: async (args: { path: string; content: string }) => {
          const response = await fetch('/api/fs/write', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              filePath: `${config.workspacePath}/${args.path}`,
              content: args.content
            })
          });
          if (!response.ok) {
            throw new Error(`Failed to write file: ${args.path}`);
          }
          return { success: true, path: args.path };
        }
      },
      {
        name: 'bash',
        description: 'Execute a bash command',
        parameters: {
          type: 'object',
          properties: {
            command: { type: 'string', description: 'Command to execute' },
            cwd: { type: 'string', description: 'Working directory (optional)' }
          },
          required: ['command']
        },
        handler: async (args: { command: string; cwd?: string }) => {
          const response = await fetch('/api/bash', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              command: args.command,
              cwd: args.cwd || config.workspacePath
            })
          });
          if (!response.ok) {
            throw new Error(`Command failed: ${args.command}`);
          }
          return await response.json();
        }
      },
      {
        name: 'glob',
        description: 'Find files matching a pattern',
        parameters: {
          type: 'object',
          properties: {
            pattern: { type: 'string', description: 'Glob pattern (e.g., "**/*.ts")' }
          },
          required: ['pattern']
        },
        handler: async (args: { pattern: string }) => {
          const response = await fetch('/api/fs/glob', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              pattern: args.pattern,
              workspaceRoot: config.workspacePath
            })
          });
          if (!response.ok) {
            throw new Error(`Glob failed: ${args.pattern}`);
          }
          return await response.json();
        }
      },
      {
        name: 'grep',
        description: 'Search for text in files',
        parameters: {
          type: 'object',
          properties: {
            pattern: { type: 'string', description: 'Search pattern' },
            path: { type: 'string', description: 'File path or directory to search' }
          },
          required: ['pattern']
        },
        handler: async (args: { pattern: string; path?: string }) => {
          const response = await fetch('/api/bash', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              command: `grep -r "${args.pattern}" ${args.path || config.workspacePath} --include="*" | head -50`
            })
          });
          if (!response.ok) {
            throw new Error(`Grep failed: ${args.pattern}`);
          }
          return await response.text();
        }
      },
      {
        name: 'list_directory',
        description: 'List files in a directory',
        parameters: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Directory path' }
          },
          required: ['path']
        },
        handler: async (args: { path: string }) => {
          const response = await fetch('/api/fs/list', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              dirPath: `${config.workspacePath}/${args.path}`
            })
          });
          if (!response.ok) {
            throw new Error(`Failed to list directory: ${args.path}`);
          }
          return await response.json();
        }
      },
    ],
  });
}

/**
 * Execute a coder task using pi agent with native tool execution loops
 */
export async function runCoderTask(
  agent: Agent,
  task: string,
  workspacePath: string,
  onEvent: PiAgentEventHandler,
  signal?: AbortSignal
): Promise<PiAgentResult> {
  return runPiAgent(agent, task, [], onEvent, signal);
}