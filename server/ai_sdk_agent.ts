import { getModel, Type } from '@earendil-works/pi-ai';
import { Agent } from '@earendil-works/pi-agent-core';
import path from 'path';
import fs from 'fs';
import { getFilesRecursively, matchesWorkspaceGlob } from './utils.js';

export interface StreamEvent {
  type: string;
  text?: string;
  content?: string;
  toolCallId?: string;
  toolName?: string;
  args?: any;
  result?: any;
  error?: string;
}

const PI_SUPPORTED_PROVIDERS = new Set([
  "amazon-bedrock", "ant-ling", "anthropic", "google", "google-vertex", "openai",
  "azure-openai-responses", "openai-codex", "nvidia", "deepseek", "github-copilot",
  "xai", "groq", "cerebras", "openrouter", "vercel-ai-gateway", "zai", "zai-coding-cn",
  "mistral", "minimax", "minimax-cn", "moonshotai", "moonshotai-cn", "huggingface",
  "fireworks", "together", "opencode", "opencode-go", "kimi-coding", "cloudflare-workers-ai",
  "cloudflare-ai-gateway", "xiaomi", "xiaomi-token-plan-cn", "xiaomi-token-plan-ams",
  "xiaomi-token-plan-sgp"
]);

function isPiSupportedProvider(provider: string): boolean {
  return PI_SUPPORTED_PROVIDERS.has(provider.toLowerCase());
}

function resolveProvider(modelId: string, providerInput?: string) {
  let provider = providerInput || '';
  const modelLower = (modelId || '').toLowerCase();

  if (!provider) {
    if (modelLower.includes('gemini')) {
      provider = 'google';
    } else if (modelLower.startsWith('gpt') || modelLower.startsWith('o1') || modelLower.startsWith('o3')) {
      provider = 'openai';
    } else if (modelLower.includes('claude')) {
      provider = 'anthropic';
    } else if (modelLower.includes('deepseek')) {
      provider = 'deepseek';
    } else if (modelLower.includes('groq') || modelLower.includes('llama')) {
      provider = 'groq';
    } else {
      provider = 'openai';
    }
  }

  return provider;
}

function createGenericModel(provider: string, modelId: string, baseUrl?: string): any {
  return {
    id: modelId,
    name: modelId,
    api: 'openai-completions',
    provider: provider,
    baseUrl: baseUrl || 'http://localhost:11434/v1',
    reasoning: false,
    input: ['text', 'image'],
    cost: {
      input: 0,
      output: 0,
      cacheRead: 0,
      cacheWrite: 0
    },
    contextWindow: 128000,
    maxTokens: 4096
  };
}

export async function runAiSdkAgentLoop(params: {
  task: string;
  workspaceRoot: string;
  provider?: string;
  model?: string;
  apiKey?: string;
  baseUrl?: string;
  onEvent: (event: StreamEvent) => void;
}): Promise<void> {
  const { task, workspaceRoot, provider, model, apiKey, baseUrl, onEvent } = params;

  try {
    const resolvedProvider = resolveProvider(model || 'gpt-4o-mini', provider);
    const isSupported = isPiSupportedProvider(resolvedProvider);

    let modelInstance: any;
    if (isSupported) {
      modelInstance = getModel(resolvedProvider as any, model || 'gpt-4o-mini');
      if (!modelInstance) {
        modelInstance = createGenericModel(resolvedProvider, model || 'gpt-4o-mini', baseUrl);
      } else if (baseUrl) {
        modelInstance.baseUrl = baseUrl;
      }
    } else {
      // Use 'openai' as the provider interface but keep the target model ID,
      // and point baseUrl to the server's local proxy route
      modelInstance = getModel('openai', model || 'gpt-4o-mini');
      if (!modelInstance) {
        modelInstance = createGenericModel('openai', model || 'gpt-4o-mini', 'http://127.0.0.1:3000/v1');
      } else {
        modelInstance = {
          ...modelInstance,
          baseUrl: 'http://127.0.0.1:3000/v1'
        };
      }
    }

    const systemPrompt = `You are a highly capable, fully autonomous AI software engineering assistant.
Your workspace directory is at: ${workspaceRoot}.
You have direct read/write access to the files in the workspace and can run terminal commands.

YOUR MANDATE:
1. AUTONOMY & SEQUENCE: You must completely resolve the task autonomously. Use as many tool calls in sequence as necessary (searching, reading files, editing, compiling, and testing) to verify and complete the job. 
2. NO PREMATURE STOPPING: Do NOT stop after 1 or 2 tool calls just to report progress or ask the user "should I proceed" or "what should I do next" unless you are completely blocked by a missing credential or require manual user input. Proceed to edit, compile, build, and test your changes yourself.
3. VERIFICATION: After editing files, run build/compilation commands or tests to verify your changes actually work. If a build/test fails, use the error output to fix your changes and run the build/test again. Iterate until it passes.
4. ACCURACY: Always write full files when using write_file (not snippets), and keep your file modifications accurate.`;

    // 1. read_file
    const readFileTool = {
      name: 'read_file',
      label: 'Read File',
      description: 'Read the contents of a file in the workspace.',
      parameters: Type.Object({
        path: Type.String({ description: 'Absolute path or relative path from the workspace root' }),
      }),
      execute: async (toolCallId: string, { path: filePathInput }: any) => {
        const filePath = path.resolve(workspaceRoot, filePathInput);
        if (!fs.existsSync(filePath)) {
          return { content: [{ type: 'text' as const, text: `Error: File not found at ${filePathInput}` }], details: {} };
        }
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          return { content: [{ type: 'text' as const, text: content }], details: {} };
        } catch (err: any) {
          return { content: [{ type: 'text' as const, text: `Error reading file: ${err.message}` }], details: {} };
        }
      }
    };

    // 2. write_file
    const writeFileTool = {
      name: 'write_file',
      label: 'Write File',
      description: 'Create a new file or completely overwrite an existing file with content.',
      parameters: Type.Object({
        path: Type.String({ description: 'Absolute path or relative path from the workspace root' }),
        content: Type.String({ description: 'The complete file content to write' }),
      }),
      execute: async (toolCallId: string, { path: filePathInput, content }: any) => {
        const filePath = path.resolve(workspaceRoot, filePathInput);
        try {
          fs.mkdirSync(path.dirname(filePath), { recursive: true });
          fs.writeFileSync(filePath, content, 'utf8');
          return { content: [{ type: 'text' as const, text: `Successfully wrote content to ${filePathInput}` }], details: {} };
        } catch (err: any) {
          return { content: [{ type: 'text' as const, text: `Error writing file: ${err.message}` }], details: {} };
        }
      }
    };

    // 3. edit_file
    const editFileTool = {
      name: 'edit_file',
      label: 'Edit File',
      description: 'Edit a specific block of text in a file by replacing target text with replacement text.',
      parameters: Type.Object({
        path: Type.String({ description: 'Absolute path or relative path from the workspace root' }),
        target: Type.String({ description: 'The exact string to find in the file' }),
        replacement: Type.String({ description: 'The new string to replace the target with' }),
      }),
      execute: async (toolCallId: string, { path: filePathInput, target, replacement }: any) => {
        const filePath = path.resolve(workspaceRoot, filePathInput);
        if (!fs.existsSync(filePath)) {
          return { content: [{ type: 'text' as const, text: `Error: File not found at ${filePathInput}` }], details: {} };
        }
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          if (!content.includes(target)) {
            return {
              content: [{ type: 'text' as const, text: `Error: Target string not found in file. Make sure the target text matches exactly, including indentation and spacing.` }],
              details: {}
            };
          }
          const updatedContent = content.replace(target, replacement);
          fs.writeFileSync(filePath, updatedContent, 'utf8');
          return { content: [{ type: 'text' as const, text: `Successfully updated ${filePathInput}` }], details: {} };
        } catch (err: any) {
          return { content: [{ type: 'text' as const, text: `Error editing file: ${err.message}` }], details: {} };
        }
      }
    };

    // 4. create_file
    const createFileTool = {
      name: 'create_file',
      label: 'Create File',
      description: 'Create an empty file if it does not already exist.',
      parameters: Type.Object({
        path: Type.String({ description: 'Absolute path or relative path from the workspace root' }),
      }),
      execute: async (toolCallId: string, { path: filePathInput }: any) => {
        const filePath = path.resolve(workspaceRoot, filePathInput);
        if (fs.existsSync(filePath)) {
          return { content: [{ type: 'text' as const, text: `Error: File already exists at ${filePathInput}` }], details: {} };
        }
        try {
          fs.mkdirSync(path.dirname(filePath), { recursive: true });
          fs.writeFileSync(filePath, '', 'utf8');
          return { content: [{ type: 'text' as const, text: `Successfully created empty file at ${filePathInput}` }], details: {} };
        } catch (err: any) {
          return { content: [{ type: 'text' as const, text: `Error creating file: ${err.message}` }], details: {} };
        }
      }
    };

    // 5. delete_file
    const deleteFileTool = {
      name: 'delete_file',
      label: 'Delete File',
      description: 'Delete a file from the workspace.',
      parameters: Type.Object({
        path: Type.String({ description: 'Absolute path or relative path from the workspace root' }),
      }),
      execute: async (toolCallId: string, { path: filePathInput }: any) => {
        const filePath = path.resolve(workspaceRoot, filePathInput);
        if (!fs.existsSync(filePath)) {
          return { content: [{ type: 'text' as const, text: `Error: File not found at ${filePathInput}` }], details: {} };
        }
        try {
          fs.unlinkSync(filePath);
          return { content: [{ type: 'text' as const, text: `Successfully deleted file ${filePathInput}` }], details: {} };
        } catch (err: any) {
          return { content: [{ type: 'text' as const, text: `Error deleting file: ${err.message}` }], details: {} };
        }
      }
    };

    // 6. rename_file
    const renameFileTool = {
      name: 'rename_file',
      label: 'Rename File',
      description: 'Rename or move a file in the workspace.',
      parameters: Type.Object({
        oldPath: Type.String({ description: 'Current relative path of the file' }),
        newPath: Type.String({ description: 'Target relative path of the file' }),
      }),
      execute: async (toolCallId: string, { oldPath, newPath }: any) => {
        const oldFilePath = path.resolve(workspaceRoot, oldPath);
        const newFilePath = path.resolve(workspaceRoot, newPath);
        if (!fs.existsSync(oldFilePath)) {
          return { content: [{ type: 'text' as const, text: `Error: Source file not found at ${oldPath}` }], details: {} };
        }
        try {
          fs.mkdirSync(path.dirname(newFilePath), { recursive: true });
          fs.renameSync(oldFilePath, newFilePath);
          return { content: [{ type: 'text' as const, text: `Successfully moved/renamed file from ${oldPath} to ${newPath}` }], details: {} };
        } catch (err: any) {
          return { content: [{ type: 'text' as const, text: `Error renaming file: ${err.message}` }], details: {} };
        }
      }
    };

    // 7. glob_tool
    const globTool = {
      name: 'glob_tool',
      label: 'Glob Search',
      description: 'List files matching a glob pattern in the workspace.',
      parameters: Type.Object({
        pattern: Type.String({ description: 'Glob pattern (e.g., src/**/*.ts, package.json)' }),
      }),
      execute: async (toolCallId: string, { pattern }: any) => {
        try {
          const files = getFilesRecursively(workspaceRoot);
          const matched = files
            .filter(f => !f.isDirectory && matchesWorkspaceGlob(f.relativePath, pattern))
            .map(f => f.relativePath);
          return { content: [{ type: 'text' as const, text: matched.length > 0 ? matched.join('\n') : 'No files matched.' }], details: {} };
        } catch (err: any) {
          return { content: [{ type: 'text' as const, text: `Error finding files: ${err.message}` }], details: {} };
        }
      }
    };

    // 8. grep_tool
    const grepTool = {
      name: 'grep_tool',
      label: 'Grep Search',
      description: 'Search for content matches matching a pattern in the workspace.',
      parameters: Type.Object({
        pattern: Type.String({ description: 'Text/string pattern to search for' }),
        fileGlob: Type.Optional(Type.String({ description: 'Optional file extension glob (e.g. *.ts)' })),
      }),
      execute: async (toolCallId: string, { pattern, fileGlob }: any) => {
        try {
          const files = getFilesRecursively(workspaceRoot);
          const results: string[] = [];
          for (const file of files) {
            if (file.isDirectory) continue;
            if (fileGlob && !matchesWorkspaceGlob(file.relativePath, fileGlob)) continue;
            try {
              const content = fs.readFileSync(file.path, 'utf8');
              const lines = content.split('\n');
              lines.forEach((line, index) => {
                if (line.includes(pattern)) {
                  results.push(`${file.relativePath}:${index + 1}: ${line.trim()}`);
                }
              });
            } catch {}
          }
          return { content: [{ type: 'text' as const, text: results.slice(0, 100).join('\n') || 'No matches found.' }], details: {} };
        } catch (err: any) {
          return { content: [{ type: 'text' as const, text: `Error running search: ${err.message}` }], details: {} };
        }
      }
    };

    // 9. run_command
    const runCommandTool = {
      name: 'run_command',
      label: 'Run Command',
      description: 'Run a shell command in the workspace directory.',
      parameters: Type.Object({
        command: Type.String({ description: 'The bash/shell command to execute' }),
      }),
      execute: async (toolCallId: string, { command }: any) => {
        const BLOCKED = ['rm -rf /', 'rm -rf *', 'sudo ', 'mkfs'];
        const foundBlocked = BLOCKED.find(b => command.includes(b));
        if (foundBlocked) {
          return { content: [{ type: 'text' as const, text: `Command blocked due to disallowed pattern: "${foundBlocked}"` }], details: {} };
        }
        try {
          const { execSync } = await import('child_process');
          const output = execSync(command, { cwd: workspaceRoot, encoding: 'utf8', timeout: 30_000 });
          return { content: [{ type: 'text' as const, text: output || '(command executed with no output)' }], details: {} };
        } catch (err: any) {
          return { content: [{ type: 'text' as const, text: `Command exited with error: ${err.stdout || ''}\n${err.stderr || ''}\n${err.message}` }], details: {} };
        }
      }
    };

    const agent = new Agent({
      initialState: {
        systemPrompt,
        model: modelInstance,
        thinkingLevel: 'medium',
        tools: [
          readFileTool,
          writeFileTool,
          editFileTool,
          createFileTool,
          deleteFileTool,
          renameFileTool,
          globTool,
          grepTool,
          runCommandTool
        ] as any
      },
      getApiKey: () => apiKey
    });

    agent.subscribe((event) => {
      switch (event.type) {
        case 'message_update': {
          const update = event.assistantMessageEvent;
          if (update.type === 'text_delta') {
            onEvent({ type: 'token', text: update.delta });
          } else if (update.type === 'thinking_delta') {
            onEvent({ type: 'thinking', content: update.delta });
          }
          break;
        }
        case 'tool_execution_start': {
          onEvent({
            type: 'tool_call_start',
            toolCallId: event.toolCallId,
            toolName: event.toolName,
            args: event.args
          });
          break;
        }
        case 'tool_execution_end': {
          onEvent({
            type: 'tool_call_end',
            toolCallId: event.toolCallId,
            toolName: event.toolName,
            result: event.result?.content?.[0]?.text || event.result?.content || event.result
          });
          break;
        }
      }
    });

    await agent.prompt(task);

    // After prompt completes, gather final results
    const messages = agent.state.messages;
    let finalAnswer = '';
    const toolCalls: any[] = [];
    const toolResults: any[] = [];

    for (const msg of messages) {
      if (msg.role === 'assistant') {
        for (const contentBlock of msg.content) {
          if (contentBlock.type === 'text') {
            finalAnswer += contentBlock.text;
          } else if (contentBlock.type === 'toolCall') {
            toolCalls.push({
              id: contentBlock.id,
              name: contentBlock.name,
              arguments: contentBlock.arguments
            });
          }
        }
      } else if (msg.role === 'toolResult') {
        toolResults.push({
          toolCallId: msg.toolCallId,
          result: msg.content?.[0]?.text || msg.content
        });
      }
    }

    onEvent({
      type: 'done',
      result: {
        text: finalAnswer,
        toolCalls,
        toolResults,
        stopReason: 'stop'
      }
    });
  } catch (err: any) {
    console.error('[Pi Agent Core] Runtime error:', err);
    onEvent({
      type: 'error',
      error: err.message || 'Agent loop encountered an error'
    });
  }
}
