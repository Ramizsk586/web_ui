import express from 'express';
import path from 'path';
import fs from 'fs';
import axios from 'axios';
import { spawn } from 'child_process';
import { runDeepResearch } from './deepResearchAgent.js';
import { loadOpenCodeWorkspaceContext, resolveOpenCodeAgentProfile } from './opencode.js';
import { runConsolidation } from './consolidation.js';
import { handleUserMessage } from './interaction-agent.js';
import { resolveCoderPath } from './utils.js';
import { state } from './state.js';

const PORT = 3000;

type RuntimeTool = {
  id: string;
  name: string;
  description: string;
  enabled?: boolean;
  active?: boolean;
  parameters?: any;
  source?: string;
};

type RuntimeAgent = {
  id: string;
  name: string;
  description?: string;
  systemPrompt?: string;
  model?: string;
  provider?: string;
  apiKey?: string;
  baseUrl?: string;
  bridgeUrl?: string;
  bridgeApiKey?: string;
  bridgeModel?: string;
  tools?: RuntimeTool[];
  skills?: Array<{ id: string; name: string; enabled: boolean }>;
  skillFiles?: Array<{ name: string; content: string; description?: string }>;
  mode?: 'primary' | 'subagent' | 'all';
  hidden?: boolean;
  steps?: number;
  permissions?: Record<string, any>;
};

type OpenCodeContextPayload = ReturnType<typeof loadOpenCodeWorkspaceContext>;

const randomRuntimeId = (prefix: string) =>
  `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

const sanitizeRuntimeToolName = (rawName: string) => {
  const name = String(rawName || '').trim();
  if (!name) return '';
  const normalized = name
    .replace(/<\|[^|>]+?\|>/g, '')
    .replace(/\[[^\]]+\]/g, '')
    .replace(/[|>]+/g, '')
    .trim()
    .toLowerCase();
  const knownTools = ['read_file', 'write_file', 'edit_file', 'create_file', 'delete_file', 'rename_file', 'run_command', 'glob_tool', 'grep_tool'];
  const exact = knownTools.find(tool => normalized === tool);
  if (exact) return exact;
  const partial = knownTools.find(tool => normalized.startsWith(tool));
  return partial || normalized;
};

const writeAgentEvent = (res: express.Response, payload: Record<string, any>) => {
  res.write(`${JSON.stringify(payload)}\n`);
};

const parseXmlToolCalls = (content: string): { cleanedContent: string; toolCalls: any[] } | null => {
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
      id: `tool_call_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type: 'function',
      function: {
        name: toolName,
        arguments: JSON.stringify(params)
      }
    });
    cleanedContent = cleanedContent
      .replace(fullMatch, '');
  }
  cleanedContent = cleanedContent
    .replace(/minimax:tool_call\s*/gi, '')
    .replace(/^\s*text\s*$/gm, '')
    .replace(/^\s*Copy\s*$/gm, '')
    .trim();
  if (toolCalls.length === 0) return null;
  return { cleanedContent, toolCalls };
};

const normalizeLlmResponse = (responseData: any): any => {
  if (!responseData?.choices?.[0]?.message) return responseData;
  const message = responseData.choices[0].message;
  if (message.tool_calls && Array.isArray(message.tool_calls) && message.tool_calls.length > 0) {
    return responseData;
  }
  if (message.content && typeof message.content === 'string') {
    const parsed = parseXmlToolCalls(message.content);
    if (parsed && parsed.toolCalls.length > 0) {
      console.log(`[LUMINA_DEBUG] Parsed ${parsed.toolCalls.length} XML tool call(s) from model content`);
      message.tool_calls = parsed.toolCalls;
      if (parsed.cleanedContent) {
        message.content = parsed.cleanedContent;
      }
    }
  }
  return responseData;
};

const mapRuntimeToolSchema = (tool: RuntimeTool) => ({
  type: 'function',
  function: {
    name: tool.name || tool.id,
    description: tool.description || '',
    parameters: tool.parameters || { type: 'object', properties: {}, required: [] }
  }
});

const DEFAULT_SUBAGENT_PERMISSIONS = {
  read: 'allow',
  list: 'allow',
  glob: 'allow',
  grep: 'allow',
  edit: 'allow',
  bash: 'ask',
  webfetch: 'ask',
  websearch: 'ask',
  question: 'allow',
};

const normalizeAgentMode = (mode?: string): 'primary' | 'subagent' | 'all' => {
  if (mode === 'primary' || mode === 'subagent' || mode === 'all') return mode;
  return 'all';
};

const normalizeAgentPermissions = (permissions?: Record<string, any>) =>
  permissions && typeof permissions === 'object'
    ? permissions
    : DEFAULT_SUBAGENT_PERMISSIONS;

const summarizeOpenCodeContext = (context: OpenCodeContextPayload) => {
  if (!context.available) return '';

  const sections: string[] = [];

  if (context.commands.length > 0) {
    sections.push(
      `OpenCode workspace commands:\n${context.commands
        .map((command) => `- /${command.id}: ${command.description}`)
        .join('\n')}`
    );
  }

  if (context.agents.length > 0) {
    sections.push(
      `OpenCode workspace agents:\n${context.agents
        .map((agent) => `- ${agent.name} [mode=${agent.mode}]: ${agent.description}`)
        .join('\n')}`
    );
  }

  if (context.tools.length > 0) {
    sections.push(
      `OpenCode workspace tools:\n${context.tools
        .map((tool) => `- ${tool.name}: ${tool.description}`)
        .join('\n')}`
    );
  }

  if (context.config) {
    const enabledTools = Object.entries(context.config.toolStates)
      .filter(([, enabled]) => enabled !== false)
      .map(([name]) => name);
    if (enabledTools.length > 0) {
      sections.push(`OpenCode enabled tool flags: ${enabledTools.join(', ')}`);
    }
    const references = Object.entries(context.config.references || {});
    if (references.length > 0) {
      sections.push(
        `OpenCode references:\n${references
          .map(([name, target]) => `- ${name}: ${target}`)
          .join('\n')}`
      );
    }
  }

  return sections.join('\n\n');
};

const extractOpenCodeToolIds = (context: OpenCodeContextPayload) => {
  const ids = new Set<string>();
  for (const item of [...context.commands, ...context.agents, ...context.tools]) {
    for (const toolId of item.tools || []) {
      if (toolId) ids.add(toolId);
    }
  }
  return [...ids];
};

const normalizeOpenCodeToolNames = (toolIds: string[]) => {
  const mappedTools: string[] = [];
  for (const rt of toolIds.map((item) => String(item || '').trim().toLowerCase()).filter(Boolean)) {
    if (rt === 'write') {
      mappedTools.push('write_file', 'edit_file');
    } else if (rt === 'filecreate') {
      mappedTools.push('create_file');
    } else if (rt === 'read') {
      mappedTools.push('read_file');
    } else if (rt === 'command' || rt === 'run_command' || rt === 'bash') {
      mappedTools.push('run_command');
    } else if (rt === 'search' || rt === 'search_code') {
      mappedTools.push('glob_tool', 'grep_tool');
    } else {
      mappedTools.push(rt);
    }
  }
  return [...new Set(mappedTools)];
};

const buildAgentInstruction = (agent: RuntimeAgent) => {
  const docFiles = (agent.skillFiles || []).filter(f => f.name.startsWith('docs/'));
  
  let bootSequenceBlock = '';
  let soulContent = '';
  let guidelinesContent = '';
  let promptContent = '';
  let knowledgeContent = '';
  let toolsContent = '';
  
  if (docFiles.length > 0) {
    const loaded: string[] = [];
    const skipped: string[] = [];
    const fileNames = ['soul.md', 'guidelines.md', 'prompt.md', 'knowledge.md', 'tools.md'];
    
    for (const fname of fileNames) {
      const fileObj = (agent.skillFiles || []).find(f => f.name === `docs/${fname}`);
      if (fileObj && fileObj.content) {
        loaded.push(fname);
        if (fname === 'soul.md') soulContent = fileObj.content;
        else if (fname === 'guidelines.md') guidelinesContent = fileObj.content;
        else if (fname === 'prompt.md') promptContent = fileObj.content;
        else if (fname === 'knowledge.md') knowledgeContent = fileObj.content;
        else if (fname === 'tools.md') toolsContent = fileObj.content;
      } else {
        skipped.push(fname);
      }
    }
    
    bootSequenceBlock = `
## MANDATORY BOOT SEQUENCE
Before responding to ANY query, you MUST silently execute this boot sequence:
ON_START:
${loaded.map(f => `  READ /docs/${f} → internalized\n  LOG "Loaded: ${f}"`).join('\n')}
${skipped.map(f => `  LOG "Skipped (not present): ${f}"`).join('\n')}

  SET identity FROM soul.md
  SET behavior_rules FROM guidelines.md
  SET system_prompt FROM prompt.md
  ${knowledgeContent ? 'SET domain_knowledge FROM knowledge.md' : ''}
  ${toolsContent ? 'SET available_tools FROM tools.md' : ''}

  CONFIRM_READY: "${agent.name} initialized. Docs loaded: ${loaded.length}/${fileNames.length}"

***

### BOOT LOADER CONTENTS LOADED:

${soulContent ? `#### [soul.md]\n${soulContent}\n\n` : ''}
${guidelinesContent ? `#### [guidelines.md]\n${guidelinesContent}\n\n` : ''}
${promptContent ? `#### [prompt.md]\n${promptContent}\n\n` : ''}
${knowledgeContent ? `#### [knowledge.md]\n${knowledgeContent}\n\n` : ''}
${toolsContent ? `#### [tools.md]\n${toolsContent}\n\n` : ''}
`;
  }

  const otherSkillFiles = (agent.skillFiles || []).filter(f => !f.name.startsWith('docs/'));
  const skillBlock = otherSkillFiles
    .map(file => `### ${file.name}\n${file.description || ''}\n\n${file.content}`)
    .join('\n\n---\n\n');

  const enabledTools = (agent.tools || []).filter(tool => tool.enabled !== false);
  const enabledSkills = (agent.skills || []).filter(skill => skill.enabled);

  return [
    bootSequenceBlock ? `System Prompt & Persona override from boot sequence. Main System Prompt:\n${promptContent || agent.systemPrompt || ''}` : (agent.systemPrompt || `You are ${agent.name}, a focused AI assistant.`),
    bootSequenceBlock || '',
    enabledSkills.length ? `Enabled skills: ${enabledSkills.map(skill => skill.name || skill.id).join(', ')}` : '',
    enabledTools.length ? `Available tools: ${enabledTools.map(tool => tool.name || tool.id).join(', ')}` : '',
    skillBlock ? `Skill files:\n\n${skillBlock}` : '',
    `Execution policy:
- Decide whether to answer directly or spawn a focused sub-agent for tool-heavy work.
- Spawn a sub-agent when the task needs web research, external APIs, file operations, or multiple-step execution.
- Be concise, grounded, and only claim tool results you actually observed.
- Treat agents attached by the user as available collaborators. Delegate only when their role clearly matches the task.`
  ].filter(Boolean).join('\n\n');
};

const filterToolsByAgentPermissions = (tools: RuntimeTool[], permissions?: Record<string, any>) => {
  const normalized = normalizeAgentPermissions(permissions);
  const editState = normalized.edit;
  const bashState = normalized.bash;
  const webfetchState = normalized.webfetch;
  const websearchState = normalized.websearch;

  return tools.filter((tool) => {
    const name = tool.name || tool.id;
    if (['write_file', 'edit_file', 'create_file', 'delete_file', 'rename_file'].includes(name)) {
      return editState !== 'deny';
    }
    if (name === 'run_command') {
      return bashState !== 'deny';
    }
    if (['fetch_url', 'web_scrape', 'visit'].includes(name)) {
      return webfetchState !== 'deny';
    }
    if (['search', 'web_search', 'wiki_search', 'google_scholar'].includes(name)) {
      return websearchState !== 'deny';
    }
    return true;
  });
};

const looksLikeResearchTask = (text: string) =>
  /\b(search|find|latest|current|news|look up|lookup|scrape|research|compare|url|website|api|docs|documentation|weather|price|score|external|tool)\b/i.test(text);

const runOpenAiCompatibleChat = async ({
  baseUrl,
  apiKey,
  model,
  messages,
  tools
}: {
  baseUrl: string;
  apiKey?: string;
  model: string;
  messages: any[];
  tools?: any[];
}) => {
  const body: any = {
    model,
    messages,
    stream: false,
    max_tokens: 2048,
    temperature: 0.5,
  };
  if (tools?.length) {
    body.tools = tools;
    body.tool_choice = 'auto';
  }

  const response = await axios.post(`${baseUrl.replace(/\/+$/, '')}/chat/completions`, body, {
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {})
    },
    timeout: 120000
  });

  return response.data;
};

const callBridgeToolDirect = async ({
  bridgeUrl,
  apiKey,
  name,
  args
}: {
  bridgeUrl: string;
  apiKey?: string;
  name: string;
  args: Record<string, any>;
}) => {
  const response = await axios.post(
    `${bridgeUrl.replace(/\/+$/, '')}/api/tools/${encodeURIComponent(name)}`,
    args,
    {
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {})
      },
      timeout: 120000
    }
  );
  return response.data;
};

const runExecutionAgent = async ({
  agent,
  task,
  bridgeTools,
  res
}: {
  agent: RuntimeAgent;
  task: string;
  bridgeTools: RuntimeTool[];
  res: express.Response;
}) => {
  const spawnId = randomRuntimeId('spawn');
  const enabledTools = [...(agent.tools || []).filter(tool => tool.enabled !== false), ...bridgeTools.filter(tool => tool.enabled !== false)];

  writeAgentEvent(res, {
    type: 'event',
    event: {
      id: spawnId,
      type: 'spawn',
      name: agent.name,
      agentId: agent.id,
      mode: normalizeAgentMode(agent.mode),
      status: 'active',
      task,
      integrations: enabledTools.map(tool => tool.name || tool.id),
      permissions: normalizeAgentPermissions(agent.permissions),
      summary: `Delegated to ${agent.name} with ${enabledTools.length} tool${enabledTools.length === 1 ? '' : 's'}`
    }
  });

  const bridgeBacked = `http://127.0.0.1:${PORT}/v1`;
  const bridgeKey = 'lumina-proxy';
  const model = 'claude-3-5-sonnet-20241022';
  const toolSchemas = enabledTools.map(mapRuntimeToolSchema);

  const messages: any[] = [
    {
      role: 'system',
      content: `You are a focused execution sub-agent.\nUse tools when needed. If you use a tool, cite only real returned data.`
    },
    { role: 'user', content: task }
  ];

  let finalText = '';
  let loopCount = 0;

  while (loopCount < 6) {
    loopCount += 1;
    const response = await runOpenAiCompatibleChat({
      baseUrl: bridgeBacked.endsWith('/v1') ? bridgeBacked : `${bridgeBacked}/v1`,
      apiKey: bridgeKey,
      model,
      messages,
      tools: toolSchemas
    });

    const choice = response?.choices?.[0]?.message;
    if (!choice) break;

    if (choice.content) {
      finalText += typeof choice.content === 'string' ? choice.content : JSON.stringify(choice.content);
    }

    if (!choice.tool_calls?.length) {
      break;
    }

    messages.push({
      role: 'assistant',
      content: choice.content || '',
      tool_calls: choice.tool_calls
    });

    for (const toolCall of choice.tool_calls) {
      const toolName = sanitizeRuntimeToolName(toolCall?.function?.name || 'unknown_tool');
      const args = (() => {
        try {
          return JSON.parse(toolCall?.function?.arguments || '{}');
        } catch {
          return {};
        }
      })();

      const toolEventId = randomRuntimeId('tool');
      writeAgentEvent(res, {
        type: 'event',
        event: {
          id: toolEventId,
          type: 'tool',
          name: toolName,
          status: 'active',
          input: args
        }
      });

      let toolResult: any = null;
      try {
        toolResult = await callBridgeToolDirect({
          bridgeUrl: bridgeBacked,
          apiKey: bridgeKey,
          name: toolName,
          args
        });

        writeAgentEvent(res, {
          type: 'event',
          event: {
            id: toolEventId,
            type: 'tool',
            name: toolName,
            status: 'complete',
            input: args,
            output: JSON.stringify(toolResult).slice(0, 4000)
          }
        });
      } catch (error: any) {
        const message = error?.message || 'Tool execution failed';
        writeAgentEvent(res, {
          type: 'event',
          event: {
            id: toolEventId,
            type: 'tool',
            name: toolName,
            status: 'failed',
            input: args,
            output: message
          }
        });
        toolResult = { error: message };
      }

      messages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: JSON.stringify(toolResult)
      });
    }
  }

  writeAgentEvent(res, {
    type: 'event',
    event: {
      id: spawnId,
      type: 'spawn',
      name: agent.name,
      agentId: agent.id,
      mode: normalizeAgentMode(agent.mode),
      status: 'complete',
      task,
      integrations: enabledTools.map(tool => tool.name || tool.id),
      permissions: normalizeAgentPermissions(agent.permissions),
      summary: finalText.trim() ? 'Subagent completed delegated task' : 'Subagent completed with no text output',
      result: finalText.slice(0, 4000)
    }
  });

  return finalText.trim();
};

const getWorkspaceSummary = (workspaceRoot?: string): string => {
  if (!workspaceRoot) return '(none)';
  try {
    const resolved = path.resolve(workspaceRoot);
    if (fs.existsSync(resolved) && fs.statSync(resolved).isDirectory()) {
      const items = fs.readdirSync(resolved);
      if (items.length === 0) {
        return 'Empty workspace directory';
      }
      const lines = items.map(name => {
        if (name === '.git' || name === 'node_modules' || name === '.lumina' || name === '.lumina_opencode') return null;
        const full = path.join(resolved, name);
        try {
          const isDir = fs.statSync(full).isDirectory();
          return `- ${name}${isDir ? '/' : ''}`;
        } catch {
          return `- ${name}`;
        }
      }).filter(Boolean);
      return lines.length > 0 ? lines.join('\n') : 'No user files present';
    }
  } catch (e) {
    return 'Could not read directory';
  }
  return 'Directory does not exist';
};

let rustAgentProcess: any = null;

async function ensureRustAgentRunning(params: {
  provider?: string;
  model?: string;
  apiKey?: string;
  baseUrl?: string;
}): Promise<boolean> {
  const rustAgentCwd = path.resolve(process.cwd(), 'src/agent');

  // Check health
  try {
    const health = await axios.get('http://127.0.0.1:3001/api/agent/health', { timeout: 1000 });
    if (health.status === 200) {
      return true;
    }
  } catch (err) {
    // Not running
  }

  if (rustAgentProcess) {
    try { rustAgentProcess.kill(); } catch {}
    rustAgentProcess = null;
  }

  if (!fs.existsSync(rustAgentCwd)) {
    console.warn(`Rust Agent project not found at ${rustAgentCwd}; skipping auto-start.`);
    return false;
  }

  console.log('🤖 Starting Rust Agent server via "cargo run"...');
  
  // Set up env variables
  const env: Record<string, string> = { ...process.env };
  const { provider, model, apiKey, baseUrl } = params;

  if (provider === 'openai' || provider === 'openprovider' || provider === 'opencode' || provider === 'groq' || provider === 'mistral' || provider === 'google' || provider === 'anthropic') {
    env.LLM_PROVIDER = 'OpenAI';
    if (baseUrl) env.OPENAI_URL = baseUrl;
    if (apiKey) env.OPENAI_API_KEY = apiKey;
  } else if (provider === 'ollama') {
    env.LLM_PROVIDER = 'Ollama';
    if (baseUrl) env.OLLAMA_URL = baseUrl;
  }
  
  if (model) {
    env.DEFAULT_MODEL = model;
  }

  // Ensure port is set to 3001
  env.PORT = '3001';

  try {
    rustAgentProcess = spawn('cargo', ['run'], {
      cwd: rustAgentCwd,
      stdio: ['ignore', 'pipe', 'pipe'],
      env,
      shell: false
    });

    rustAgentProcess.stdout.on('data', (data: Buffer) => {
      console.log(`[Rust Agent stdout] ${data.toString().trim()}`);
    });

    rustAgentProcess.stderr.on('data', (data: Buffer) => {
      console.error(`[Rust Agent stderr] ${data.toString().trim()}`);
    });

    rustAgentProcess.on('close', (code: number) => {
      console.log(`[Rust Agent] Process exited with code ${code}`);
      rustAgentProcess = null;
    });

    // Wait for it to become healthy (up to 15 seconds)
    for (let i = 0; i < 30; i++) {
      await new Promise(resolve => setTimeout(resolve, 500));
      try {
        const health = await axios.get('http://127.0.0.1:3001/api/agent/health', { timeout: 500 });
        if (health.status === 200) {
          console.log('✅ Rust Agent server started successfully on port 3001!');
          return true;
        }
      } catch (err) {
        // Continue waiting
      }
    }
    console.error('❌ Rust Agent server failed to start within 15 seconds.');
    return false;
  } catch (err: any) {
    console.error('❌ Failed to spawn cargo run for Rust Agent:', err.message);
    return false;
  }
}

export function setupAgentRoutes(app: express.Express) {
  // Trigger Rust Agent startup in background on server start
  ensureRustAgentRunning({}).catch((err) => {
    console.warn('⚠️ Rust Agent startup check failed on initial server boot:', err.message);
  });
  // Boop Agent Chat Endpoint
  app.post("/api/agent/chat", async (req, res) => {
    const { content, conversationId, source } = req.body;
    if (!content && req.body.task) {
      return res.status(400).json({ error: 'content (string) is required — did you mean /api/coder/run?' });
    }
    if (!content || typeof content !== 'string') {
      return res.status(400).json({ error: 'content (string) is required' });
    }
    try {
      const response = await handleUserMessage({
        content,
        conversationId,
        source: source ?? 'web',
      });
      res.json(response);
    } catch (err: any) {
      console.error('[/api/agent/chat]', err);
      res.status(500).json({ error: err.message ?? 'Agent error' });
    }
  });

  // Draft Retrieval
  app.get("/api/agent/drafts/:draftId", (req, res) => {
    res.json({ draftId: req.params.draftId });
  });

  // Manual Consolidation Trigger
  app.post("/api/consolidate", async (req, res) => {
    try {
      const result = await runConsolidation('manual');
      res.json(result);
    } catch (err: any) {
      console.error('[/api/consolidate]', err);
      res.status(500).json({ error: err.message ?? 'Consolidation failed' });
    }
  });

  app.post("/api/deep-research/run", async (req, res) => {
    const {
      query,
      preset = "standard",
      tavilyKey,
      serpKey,
      provider,
      model,
      apiKey,
      baseUrl
    } = req.body || {};

    if (!query || !String(query).trim()) {
      return res.status(400).json({ error: "query is required" });
    }

    try {
      const result = await runDeepResearch({
        query: String(query),
        preset: preset === "extreme" ? "extreme" : "standard",
        tavilyKey: typeof tavilyKey === "string" ? tavilyKey : undefined,
        serpKey: typeof serpKey === "string" ? serpKey : undefined,
        provider: typeof provider === "string" ? provider : undefined,
        model: typeof model === "string" ? model : undefined,
        apiKey: typeof apiKey === "string" ? apiKey : undefined,
        baseUrl: typeof baseUrl === "string" ? baseUrl : undefined,
      });
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: "Failed to run deep research", detail: err.message });
    }
  });

  app.post("/api/opencode/context", (req, res) => {
    const workspaceRoot = resolveCoderPath(req.body?.workspaceRoot);
    const context = loadOpenCodeWorkspaceContext(workspaceRoot);
    res.json({
      available: context.available,
      summary: summarizeOpenCodeContext(context),
      toolIds: extractOpenCodeToolIds(context),
      mappedTools: normalizeOpenCodeToolNames(extractOpenCodeToolIds(context)),
      config: context.config,
      commands: context.commands || [],
      agents: context.agents || [],
      tools: context.tools || []
    });
  });

  app.post("/api/agents/run", async (req, res) => {
    const { agent, messages, bridgeTools = [], attachedAgents = [] } = req.body as {
      agent: RuntimeAgent;
      messages: Array<{ role: string; content: any }>;
      bridgeTools?: RuntimeTool[];
      attachedAgents?: RuntimeAgent[];
    };

    if (!agent || !messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'agent and messages are required' });
    }

    const runId = randomRuntimeId('run');
    res.setHeader('Content-Type', 'application/x-ndjson');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    writeAgentEvent(res, { type: 'run_started', runId });

    try {
      const latestUserMessage = [...messages].reverse().find(message => message.role === 'user');
      const userText = Array.isArray(latestUserMessage?.content)
        ? latestUserMessage?.content?.map((part: any) => part?.text || '').join('\n')
        : String(latestUserMessage?.content || '');

      const attachedAgentSummaries = attachedAgents
        .filter((item) => normalizeAgentMode(item.mode) === 'subagent' || normalizeAgentMode(item.mode) === 'all')
        .map((item) => `Attached agent: ${item.name}\nMode: ${normalizeAgentMode(item.mode)}\nDescription: ${item.description || 'No description'}`)
        .join('\n\n');

      const dispatcherSystem = [
        buildAgentInstruction(agent),
        attachedAgentSummaries ? `Available attached agents for delegation:\n\n${attachedAgentSummaries}` : ''
      ].filter(Boolean).join('\n\n');
      const dispatcherMessages = [
        { role: 'system', content: dispatcherSystem },
        ...messages.map(message => ({
          role: message.role === 'tool' ? 'assistant' : message.role,
          content: typeof message.content === 'string' ? message.content : JSON.stringify(message.content)
        }))
      ];

      let finalReply = '';
      const permittedBridgeTools = filterToolsByAgentPermissions(
        bridgeTools.filter(tool => tool.enabled !== false),
        agent.permissions
      );
      if (looksLikeResearchTask(userText) || permittedBridgeTools.length > 0 || (agent.tools || []).some(tool => tool.active || tool.enabled)) {
        finalReply = await runExecutionAgent({
          agent: {
            ...agent,
            mode: normalizeAgentMode(agent.mode),
            permissions: normalizeAgentPermissions(agent.permissions),
          },
          task: userText,
          bridgeTools: permittedBridgeTools,
          res
        });
      } else {
        const response = await runOpenAiCompatibleChat({
          baseUrl: (agent.baseUrl || process.env.AI_BASE_URL || 'http://localhost:11434/v1').replace(/\/+$/, ''),
          apiKey: agent.apiKey || process.env.AI_API_KEY || '',
          model: agent.model || 'openprovider/auto-free',
          messages: dispatcherMessages
        });
        finalReply = response?.choices?.[0]?.message?.content || '';
      }

      const chunks = String(finalReply || '').match(/.{1,120}/g) || [''];
      for (const chunk of chunks) {
        writeAgentEvent(res, { type: 'token', text: chunk });
      }

      writeAgentEvent(res, { type: 'done', runId });
      res.end();
    } catch (error: any) {
      console.error('[agent-runtime] failed:', error);
      writeAgentEvent(res, {
        type: 'error',
        runId,
        error: error?.message || 'Agent runtime failed'
      });
      res.end();
    }
  });

  app.post("/api/coder/run", async (req: express.Request, res: express.Response) => {
    const { task, apiKey } = req.body;
    let provider = req.body.provider;
    let model = req.body.model;
    let baseUrl = req.body.baseUrl;

    if (model && typeof model === 'object') {
      provider = model.provider || provider;
      baseUrl = model.baseUrl || baseUrl;
      model = model.id || '';
    } else if (typeof model !== 'string') {
      model = req.body.modelId || '';
    }

    const workspaceRoot = req.body.workspaceRoot || req.body.workspacePath;
    if (!task) {
      return res.status(400).json({ error: 'task is required' });
    }

    const runId = randomRuntimeId('coder');
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const resolvedWorkspace = resolveCoderPath(workspaceRoot);

    try {
      console.log('🤖 Running coder mode using Pi Agent backend...');
      const { runAiSdkAgentLoop } = await import('./ai_sdk_agent.js');
      await runAiSdkAgentLoop({
        task,
        workspaceRoot: resolvedWorkspace,
        provider: typeof provider === 'string' ? provider : undefined,
        model: typeof model === 'string' ? model : undefined,
        apiKey,
        baseUrl: typeof baseUrl === 'string' ? baseUrl : undefined,
        onEvent: (event) => {
          res.write(`${JSON.stringify(event)}\n`);
          if ((res as any).flush) {
            (res as any).flush();
          }
        }
      });
      res.end();
    } catch (error: any) {
      console.error('[coder-agent] Run error:', error);
      res.write(`${JSON.stringify({ type: 'error', error: error.message })}\n`);
      res.end();
    }
  });

  app.post("/api/agents/spawn", async (req, res) => {
    const { agentName, task, workspaceRoot, modelConfig, customPrompt, customTools } = req.body;
    if (!agentName || !task) {
      return res.status(400).json({ error: "agentName and task are required" });
    }

    const agentId = `agent_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    
    state.activeSubagents[agentId] = {
      id: agentId,
      name: agentName,
      mode: 'subagent',
      phase: 1,
      status: 'running',
      filesCreated: [],
      startedAt: Date.now(),
      events: [],
      summary: '',
      permissions: { ...DEFAULT_SUBAGENT_PERMISSIONS }
    };

    res.json({
      success: true,
      agentId
    });

    (async () => {
      try {
        const resolvedWorkspace = resolveCoderPath(workspaceRoot);
        const openCodeContext = loadOpenCodeWorkspaceContext(resolvedWorkspace);
        const openCodeProfile = resolveOpenCodeAgentProfile(resolvedWorkspace, agentName);

        let systemPrompt: string;
        let configuredTools: string[];
        let resolvedPermissions = { ...DEFAULT_SUBAGENT_PERMISSIONS };

        if (customPrompt) {
          systemPrompt = customPrompt;
          configuredTools = Array.isArray(customTools) && customTools.length > 0
            ? customTools
            : ['read_file', 'write_file', 'edit_file', 'create_file', 'delete_file', 'rename_file', 'run_command', 'glob_tool', 'grep_tool'];
          if (openCodeProfile?.permissions) {
            resolvedPermissions = { ...resolvedPermissions, ...openCodeProfile.permissions };
          }
        } else if (openCodeProfile) {
          systemPrompt = openCodeProfile.content;
          configuredTools = normalizeOpenCodeToolNames(openCodeProfile.tools);
          if (configuredTools.length === 0) {
            configuredTools = normalizeOpenCodeToolNames(extractOpenCodeToolIds(openCodeContext));
          }
          if (configuredTools.length === 0) {
            configuredTools = ['read_file', 'glob_tool', 'grep_tool', 'run_command'];
          }
          if (openCodeProfile.permissions) {
            resolvedPermissions = { ...resolvedPermissions, ...openCodeProfile.permissions };
          } else if (openCodeContext.config?.permissions) {
            resolvedPermissions = { ...resolvedPermissions, ...openCodeContext.config.permissions };
          }
        } else {
          systemPrompt = `You are a specialized subagent named ${agentName}.\nRun commands and modify files to achieve the task.`;
          configuredTools = ['read_file', 'write_file', 'edit_file', 'create_file', 'delete_file', 'rename_file', 'run_command', 'glob_tool', 'grep_tool'];
        }

        const agent: RuntimeAgent = {
          id: agentId,
          name: agentName,
          systemPrompt,
          provider: modelConfig?.provider || 'openprovider',
          model: modelConfig?.model || 'auto-free',
          apiKey: modelConfig?.apiKey,
          baseUrl: modelConfig?.baseUrl,
          permissions: resolvedPermissions,
          tools: configuredTools.map(tname => ({
            id: tname,
            name: tname,
            description: `Runs ${tname}`,
            enabled: true
          }))
        };

        const eventStreamMock = {
          write: (data: string) => {
            try {
              const parsed = JSON.parse(data.trim());
              if (parsed.type === 'event' && parsed.event) {
                state.activeSubagents[agentId]?.events.push(parsed.event);
              }
            } catch {}
          },
          end: () => {}
        } as any;

        const summary = await runExecutionAgent({
          agent,
          task,
          bridgeTools: [],
          res: eventStreamMock
        });

        if (state.activeSubagents[agentId]) {
          state.activeSubagents[agentId].status = 'completed';
          state.activeSubagents[agentId].summary = summary;
        }
      } catch (err: any) {
        console.error(`Subagent spawn loop failed for ${agentId}:`, err);
        if (state.activeSubagents[agentId]) {
          state.activeSubagents[agentId].status = 'failed';
          state.activeSubagents[agentId].summary = err.message;
        }
      }
    })();
  });

  app.get("/api/agents/subagents", (req, res) => {
    res.json(Object.values(state.activeSubagents));
  });

  app.get("/api/agents/subagents/:agentId", (req, res) => {
    const sa = state.activeSubagents[req.params.agentId];
    if (!sa) return res.status(404).json({ error: 'Subagent not found' });
    res.json(sa);
  });
}
