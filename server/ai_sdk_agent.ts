import { streamText } from 'ai';
import { buildProviderModel } from './ai_sdk_providers.js';
import { z } from 'zod';
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
    const modelInstance = buildProviderModel({
      provider: provider || 'openai',
      modelId: model || 'gpt-4o-mini',
      apiKey,
      baseUrl,
    });

    const systemPrompt = `You are a highly capable AI software engineering assistant.
Your workspace directory is at: ${workspaceRoot}.
You have direct read/write access to the files in the workspace and can run terminal commands.
Always think step-by-step and write clean, correct code. Use your tools to inspect files, make changes, and run tests or compile steps to verify your work.
Always write full files when using write_file (not snippets), and keep your file modifications accurate.`;

    const toolCallsList: any[] = [];
    const toolResultsList: any[] = [];
    let accumulatedText = '';

    const piTools: any = {
      read_file: {
        description: 'Read the contents of a file in the workspace.',
        parameters: z.object({
          path: z.string().describe('Absolute path or relative path from the workspace root'),
        }) as any,
        execute: async ({ path: filePathInput }: any) => {
          const filePath = path.resolve(workspaceRoot, filePathInput);
          if (!fs.existsSync(filePath)) {
            return `Error: File not found at ${filePathInput}`;
          }
          try {
            const content = fs.readFileSync(filePath, 'utf8');
            return content;
          } catch (err: any) {
            return `Error reading file: ${err.message}`;
          }
        },
      },

      write_file: {
        description: 'Create a new file or completely overwrite an existing file with content.',
        parameters: z.object({
          path: z.string().describe('Absolute path or relative path from the workspace root'),
          content: z.string().describe('The complete file content to write'),
        }) as any,
        execute: async ({ path: filePathInput, content }: any) => {
          const filePath = path.resolve(workspaceRoot, filePathInput);
          try {
            fs.mkdirSync(path.dirname(filePath), { recursive: true });
            fs.writeFileSync(filePath, content, 'utf8');
            return `Successfully wrote content to ${filePathInput}`;
          } catch (err: any) {
            return `Error writing file: ${err.message}`;
          }
        },
      },

      edit_file: {
        description: 'Edit a specific block of text in a file by replacing target text with replacement text.',
        parameters: z.object({
          path: z.string().describe('Absolute path or relative path from the workspace root'),
          target: z.string().describe('The exact string to find in the file'),
          replacement: z.string().describe('The new string to replace the target with'),
        }) as any,
        execute: async ({ path: filePathInput, target, replacement }: any) => {
          const filePath = path.resolve(workspaceRoot, filePathInput);
          if (!fs.existsSync(filePath)) {
            return `Error: File not found at ${filePathInput}`;
          }
          try {
            const content = fs.readFileSync(filePath, 'utf8');
            if (!content.includes(target)) {
              return `Error: Target string not found in file. Make sure the target text matches exactly, including indentation and spacing.`;
            }
            const updatedContent = content.replace(target, replacement);
            fs.writeFileSync(filePath, updatedContent, 'utf8');
            return `Successfully updated ${filePathInput}`;
          } catch (err: any) {
            return `Error editing file: ${err.message}`;
          }
        },
      },

      create_file: {
        description: 'Create an empty file if it does not already exist.',
        parameters: z.object({
          path: z.string().describe('Absolute path or relative path from the workspace root'),
        }) as any,
        execute: async ({ path: filePathInput }: any) => {
          const filePath = path.resolve(workspaceRoot, filePathInput);
          if (fs.existsSync(filePath)) {
            return `Error: File already exists at ${filePathInput}`;
          }
          try {
            fs.mkdirSync(path.dirname(filePath), { recursive: true });
            fs.writeFileSync(filePath, '', 'utf8');
            return `Successfully created empty file at ${filePathInput}`;
          } catch (err: any) {
            return `Error creating file: ${err.message}`;
          }
        },
      },

      delete_file: {
        description: 'Delete a file from the workspace.',
        parameters: z.object({
          path: z.string().describe('Absolute path or relative path from the workspace root'),
        }) as any,
        execute: async ({ path: filePathInput }: any) => {
          const filePath = path.resolve(workspaceRoot, filePathInput);
          if (!fs.existsSync(filePath)) {
            return `Error: File not found at ${filePathInput}`;
          }
          try {
            fs.unlinkSync(filePath);
            return `Successfully deleted file ${filePathInput}`;
          } catch (err: any) {
            return `Error deleting file: ${err.message}`;
          }
        },
      },

      rename_file: {
        description: 'Rename or move a file in the workspace.',
        parameters: z.object({
          oldPath: z.string().describe('Current relative path of the file'),
          newPath: z.string().describe('Target relative path of the file'),
        }) as any,
        execute: async ({ oldPath, newPath }: any) => {
          const oldFilePath = path.resolve(workspaceRoot, oldPath);
          const newFilePath = path.resolve(workspaceRoot, newPath);
          if (!fs.existsSync(oldFilePath)) {
            return `Error: Source file not found at ${oldPath}`;
          }
          try {
            fs.mkdirSync(path.dirname(newFilePath), { recursive: true });
            fs.renameSync(oldFilePath, newFilePath);
            return `Successfully moved/renamed file from ${oldPath} to ${newPath}`;
          } catch (err: any) {
            return `Error renaming file: ${err.message}`;
          }
        },
      },

      glob_tool: {
        description: 'List files matching a glob pattern in the workspace.',
        parameters: z.object({
          pattern: z.string().describe('Glob pattern (e.g., src/**/*.ts, package.json)'),
        }) as any,
        execute: async ({ pattern }: any) => {
          try {
            const files = getFilesRecursively(workspaceRoot);
            const matched = files
              .filter(f => !f.isDirectory && matchesWorkspaceGlob(f.relativePath, pattern))
              .map(f => f.relativePath);
            return matched.length > 0 ? matched.join('\n') : 'No files matched.';
          } catch (err: any) {
            return `Error finding files: ${err.message}`;
          }
        },
      },

      grep_tool: {
        description: 'Search for content matches matching a pattern in the workspace.',
        parameters: z.object({
          pattern: z.string().describe('Text/string pattern to search for'),
          fileGlob: z.string().optional().describe('Optional file extension glob (e.g. *.ts)'),
        }) as any,
        execute: async ({ pattern, fileGlob }: any) => {
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
            return results.slice(0, 100).join('\n') || 'No matches found.';
          } catch (err: any) {
            return `Error running search: ${err.message}`;
          }
        },
      },

      run_command: {
        description: 'Run a shell command in the workspace directory.',
        parameters: z.object({
          command: z.string().describe('The bash/shell command to execute'),
        }) as any,
        execute: async ({ command }: any) => {
          const BLOCKED = ['rm -rf /', 'rm -rf *', 'sudo ', 'mkfs'];
          const foundBlocked = BLOCKED.find(b => command.includes(b));
          if (foundBlocked) {
            return `Command blocked due to disallowed pattern: "${foundBlocked}"`;
          }
          try {
            const { execSync } = await import('child_process');
            const output = execSync(command, { cwd: workspaceRoot, encoding: 'utf8', timeout: 30_000 });
            return output || '(command executed with no output)';
          } catch (err: any) {
            return `Command exited with error: ${err.stdout || ''}\n${err.stderr || ''}\n${err.message}`;
          }
        },
      },
    };

    const result = streamText({
      model: modelInstance,
      system: systemPrompt,
      prompt: task,
      maxSteps: 12,
      tools: piTools,
    } as any);

    for await (const chunk of result.fullStream as any) {
      if (chunk.type === 'text-delta') {
        const textVal = chunk.text || chunk.textDelta || '';
        accumulatedText += textVal;
        onEvent({ type: 'token', text: textVal });
      } else if (chunk.type === 'reasoning-delta') {
        const reasoningVal = chunk.text || chunk.reasoningDelta || '';
        onEvent({ type: 'thinking', content: reasoningVal });
      } else if (chunk.type === 'tool-call') {
        const argsVal = chunk.args || chunk.input || {};
        toolCallsList.push({
          id: chunk.toolCallId,
          name: chunk.toolName,
          arguments: argsVal,
        });
        onEvent({
          type: 'tool_call_start',
          toolCallId: chunk.toolCallId,
          toolName: chunk.toolName,
          args: argsVal,
        });
      } else if (chunk.type === 'tool-result') {
        const resultVal = chunk.result || chunk.output || '';
        const argsVal = chunk.args || chunk.input || {};
        toolResultsList.push({
          toolCallId: chunk.toolCallId,
          result: resultVal,
        });
        onEvent({
          type: 'tool_call_end',
          toolCallId: chunk.toolCallId,
          toolName: chunk.toolName,
          result: resultVal,
          args: argsVal,
        });
      }
    }

    onEvent({
      type: 'done',
      result: {
        text: accumulatedText,
        toolCalls: toolCallsList,
        toolResults: toolResultsList,
        stopReason: 'stop',
      },
    });
  } catch (err: any) {
    console.error('[AI SDK Agent] Runtime error:', err);
    onEvent({
      type: 'error',
      error: err.message || 'Agent loop encountered an error',
    });
  }
}
