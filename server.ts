import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { fileURLToPath } from 'url';
import os from 'os';
import 'dotenv/config';
import axios from 'axios';
import { search } from 'duck-duck-scrape';
import * as cheerio from 'cheerio';
import TurndownService from 'turndown';
import { spawn, spawnSync, type ChildProcessByStdio, type ChildProcessWithoutNullStreams } from "child_process";
import si from 'systeminformation';

import { createRequire } from "module";
const require = createRequire(import.meta.url);
// @ts-ignore
const pdf = require("pdf-parse");
// @ts-ignore
import mammoth from "mammoth";

import { RagBackendService } from "./src/services/ragBackendService";
import { runDeepResearch } from "./server/deepResearchAgent";
import { loadOpenCodeWorkspaceContext, resolveOpenCodeAgentProfile } from "./server/opencode";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isDev = process.env.NODE_ENV !== "production";

async function startServer() {
  const app = express();
  const PORT = 3000;
  let previewProcess: ChildProcessWithoutNullStreams | null = null;
  let previewUrl = '';
  let previewProxyOrigin = '';
  let previewLogs: string[] = [];
  let activePreviewRoot = process.cwd();
  const activeSubagents: Record<string, any> = {};


  // Handle JSON and CORS with increased body limits for large payloads
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', '*');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
    next();
  });

  const ragBackend = new RagBackendService();

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
    // 1. Check if any docs/ files exist in skillFiles (e.g. docs/soul.md, docs/guidelines.md, etc.)
    const docFiles = (agent.skillFiles || []).filter(f => f.name.startsWith('docs/'));
    
    let bootSequenceBlock = '';
    let soulContent = '';
    let guidelinesContent = '';
    let promptContent = '';
    let knowledgeContent = '';
    let toolsContent = '';
    
    if (docFiles.length > 0) {
      // We have the new agent sub-pipeline design files! Let's build the Mandatory Boot Sequence.
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

    // Standard skill files (if any non-doc files)
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

    const bridgeBacked = agent.bridgeUrl || process.env.LLAMA_BRIDGE_URL || 'http://localhost:8089';
    const bridgeKey = agent.bridgeApiKey || process.env.LLAMA_BRIDGE_API_KEY || '';
    const model = agent.bridgeModel || agent.model || 'openprovider/auto-free';
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

  // Health check endpoint
  app.get("/api/health", async (req, res) => {
    res.json({
      status: 'ok',
      server: 'Lumina Web UI Server',
    });
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
    } catch (error: any) {
      console.error("[deep-research] failed:", error);
      res.status(500).json({ error: error?.message || "Deep research failed" });
    }
  });

  app.post("/api/opencode/context", (req, res) => {
    const workspaceRoot = resolveCoderPath(req.body?.workspaceRoot);
    try {
      const context = loadOpenCodeWorkspaceContext(workspaceRoot);
      res.json(context);
    } catch (error: any) {
      res.status(500).json({ error: error?.message || "Failed to load OpenCode workspace context" });
    }
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

  app.get("/api/agents/status", (req, res) => {
    const { agentId } = req.query;
    if (agentId) {
      const agent = activeSubagents[String(agentId)];
      if (!agent) {
        return res.status(404).json({ error: "Agent not found" });
      }
      return res.json(agent);
    }
    return res.json(Object.values(activeSubagents));
  });

  app.post("/api/agents/spawn", async (req, res) => {
    const { agentName, task, workspaceRoot, modelConfig, customPrompt, customTools } = req.body;
    if (!agentName || !task) {
      return res.status(400).json({ error: "agentName and task are required" });
    }

    const agentId = `agent_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    
    activeSubagents[agentId] = {
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

        // If customPrompt is provided from settings, use it directly
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
          const promptPath = path.join(resolvedWorkspace, '.lumina', 'subagents', `${agentName}.prompt`);
          let promptContent = '';
          if (fs.existsSync(promptPath)) {
            promptContent = fs.readFileSync(promptPath, 'utf8');
          } else {
            const fallbackPath = path.join(process.cwd(), '.lumina', 'subagents', `${agentName}.prompt`);
            if (fs.existsSync(fallbackPath)) {
              promptContent = fs.readFileSync(fallbackPath, 'utf8');
            } else {
              promptContent = `---\ntools: [read_file, write_file, edit_file, delete_file, rename_file, run_command, glob_tool, grep_tool]\n---\nYou are ${agentName}, a specialized software engineering subagent. Your task is: ${task}`;
            }
          }

          systemPrompt = promptContent;
          configuredTools = ['read_file', 'write_file', 'edit_file', 'delete_file', 'rename_file', 'run_command', 'glob_tool', 'grep_tool'];
          const fmMatch = promptContent.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
          if (fmMatch) {
            const fmContent = fmMatch[1];
            systemPrompt = fmMatch[2];
            const toolsMatch = fmContent.match(/tools:\s*\[(.*?)\]/i);
            if (toolsMatch) {
              const rawTools = toolsMatch[1].split(',').map(s => s.trim().toLowerCase());
              const mappedTools = [];
              for (const rt of rawTools) {
                if (rt === 'write') {
                  mappedTools.push('write_file', 'edit_file');
                } else if (rt === 'filecreate' || rt === 'create_file') {
                  mappedTools.push('write_file');
                } else if (rt === 'read') {
                  mappedTools.push('read_file');
                } else if (rt === 'command' || rt === 'run_command') {
                  mappedTools.push('run_command');
                } else if (rt === 'search' || rt === 'search_code') {
                  mappedTools.push('glob_tool', 'grep_tool');
                } else {
                  mappedTools.push(rt);
                }
              }
              if (mappedTools.length > 0) {
                configuredTools = [...new Set(mappedTools)];
              }
            }
          }
        }

        if (openCodeContext.available) {
          const contextSummary = summarizeOpenCodeContext(openCodeContext);
          if (contextSummary) {
            systemPrompt += `\n\n[OPENCODE WORKSPACE CONTEXT]\n${contextSummary}`;
          }
        }

        activeSubagents[agentId].permissions = resolvedPermissions;

        if (agentName.toLowerCase().includes('analyzer')) {
          systemPrompt += `\n\nAnalyzer operating rules:
- Never call read_file with ".", "./", an empty path, or the workspace root by itself.
- Never call search_code with an empty query, ".", or whitespace-only text.
- Use search_code only for concrete filenames, symbols, selectors, error messages, or text fragments.
- Do not repeat the same tool call with the same arguments once it has already returned.
- Prefer specific files discovered from earlier results instead of broad retries.`;
        }

        const subagentToolsSchemas = [];
        const toolMap = new Map();

        toolMap.set('read_file', {
          type: 'function',
          function: {
            name: 'read_file',
            description: 'Read contents of a file in the workspace.',
            parameters: {
              type: 'object',
              properties: {
                filePath: { type: 'string', description: 'Path to file.' },
                offset: { type: 'number', description: 'Line offset (1-based).' },
                limit: { type: 'number', description: 'Line count limit.' }
              },
              required: ['filePath']
            }
          }
        });

        toolMap.set('write_file', {
          type: 'function',
          function: {
            name: 'write_file',
            description: 'Write complete contents to a file.',
            parameters: {
              type: 'object',
              properties: {
                filePath: { type: 'string', description: 'Path to file.' },
                content: { type: 'string', description: 'File content.' }
              },
              required: ['filePath', 'content']
            }
          }
        });

        toolMap.set('edit_file', {
          type: 'function',
          function: {
            name: 'edit_file',
            description: 'Edit a file using search and replace blocks.',
            parameters: {
              type: 'object',
              properties: {
                filePath: { type: 'string', description: 'Path to file.' },
                search: { type: 'string', description: 'Search content.' },
                replace: { type: 'string', description: 'Replacement content.' },
                all: { type: 'boolean', description: 'Replace all occurrences.' }
              },
              required: ['filePath', 'search', 'replace']
            }
          }
        });

        toolMap.set('delete_file', {
          type: 'function',
          function: {
            name: 'delete_file',
            description: 'Delete a file or directory.',
            parameters: {
              type: 'object',
              properties: {
                filePath: { type: 'string', description: 'Path to delete.' }
              },
              required: ['filePath']
            }
          }
        });

        toolMap.set('rename_file', {
          type: 'function',
          function: {
            name: 'rename_file',
            description: 'Rename or move a file or directory.',
            parameters: {
              type: 'object',
              properties: {
                filePath: { type: 'string', description: 'Current path.' },
                newPath: { type: 'string', description: 'New path.' }
              },
              required: ['filePath', 'newPath']
            }
          }
        });

        toolMap.set('run_command', {
          type: 'function',
          function: {
            name: 'run_command',
            description: 'Run a shell/terminal command in the workspace.',
            parameters: {
              type: 'object',
              properties: {
                command: { type: 'string', description: 'The command string to execute.' }
              },
              required: ['command']
            }
          }
        });

        toolMap.set('glob_tool', {
          type: 'function',
          function: {
            name: 'glob_tool',
            description: 'Finds files by matching patterns against their file names or directory paths.',
            parameters: {
              type: 'object',
              properties: {
                fileGlob: { type: 'string', description: 'File filter pattern like "**/*.tsx" or "*.css".' },
                maxResults: { type: 'number', description: 'Max results (default 30).' }
              },
              required: ['fileGlob']
            }
          }
        });

        toolMap.set('grep_tool', {
          type: 'function',
          function: {
            name: 'grep_tool',
            description: 'Finds text lines inside files by matching regular expressions against the file contents.',
            parameters: {
              type: 'object',
              properties: {
                query: { type: 'string', description: 'Regex/text to search for.' },
                fileGlob: { type: 'string', description: 'Optional file filter like "*.tsx".' },
                maxResults: { type: 'number', description: 'Max results (default 30).' }
              },
              required: ['query']
            }
          }
        });

        for (const tName of configuredTools) {
          const schema = toolMap.get(tName);
          if (schema) {
            subagentToolsSchemas.push(schema);
          }
        }

        if (subagentToolsSchemas.length === 0) {
          subagentToolsSchemas.push(
            toolMap.get('read_file'),
            toolMap.get('write_file'),
            toolMap.get('edit_file'),
            toolMap.get('glob_tool')
          );
        }

        const bridgeBacked = process.env.LLAMA_BRIDGE_URL || 'http://localhost:8089';
        const bridgeKey = process.env.LLAMA_BRIDGE_API_KEY || '';
        const model = process.env.LLAMA_BRIDGE_MODEL || 'openprovider/auto-free';

        const messages: any[] = [
          { role: 'system', content: `${systemPrompt}\n\nExecution context: Working on workspace ${resolvedWorkspace}. Only write code inside this workspace. When you are finished, output ✅ ${agentName.toUpperCase()} COMPLETE and a summary.\n\nCRITICAL DIRECTIVE - TODO.md PROGRESS TRACKING:\n1. Before you begin work, READ the TODO.md file in the workspace root to see the checklist.\n2. Work on ONE task at a time in strict order.\n3. After completing each individual task step, IMMEDIATELY use 'edit_file' to update TODO.md, changing that step's '- [ ]' to '- [x]'.\n4. Only then proceed to the next task step.\n5. NEVER batch multiple tasks before updating TODO.md. Each task MUST be marked complete in TODO.md before starting the next one.\nThis ensures real-time progress visibility. Failure to update TODO.md after each step is a critical error.` },
          { role: 'user', content: task }
        ];

        const agentEvents = activeSubagents[agentId].events;
        let finalSummary = '';
        let loopCount = 0;
        const maxLoops = 15;

        while (loopCount < maxLoops) {
          loopCount++;
          
          let choice = null;
          try {
            const chatRes = await axios.post(`http://127.0.0.1:${PORT}/api/chat`, {
              messages,
              model: modelConfig?.model || model || 'gpt-4o-mini',
              config: modelConfig?.config || {
                provider: 'openai-compatible',
                baseUrl: bridgeBacked,
                apiKey: bridgeKey
              },
              tools: subagentToolsSchemas,
              stream: false
            }, {
              headers: { 'Content-Type': 'application/json' },
              timeout: 120000
            });

            const chatData = chatRes.data;
            choice = chatData?.choices?.[0]?.message;
          } catch (chatErr: any) {
            const errDetail = chatErr.response?.data?.error?.message || chatErr.response?.data?.error || chatErr.message;
            console.error("Subagent API chat completion failed:", errDetail);
            throw new Error(`Subagent upstream LLM error: ${errDetail}`);
          }

          if (!choice) break;

          if (choice.content) {
            finalSummary += choice.content;
            activeSubagents[agentId].summary = finalSummary;
          }

          messages.push(choice);

          if (!choice.tool_calls || choice.tool_calls.length === 0) {
            break;
          }

          for (const toolCall of choice.tool_calls) {
            const toolName = toolCall.function.name;
            const args = JSON.parse(toolCall.function.arguments || '{}');
            
            let toolOutput = null;
            const eventId = `evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
            
            agentEvents.push({
              id: eventId,
              type: 'tool',
              name: toolName,
              status: 'active',
              input: args
            });

            try {
              const normalizedFilePath = String(args.filePath || '').trim();
              const normalizedQuery = String(args.query || '').trim();

              if (toolName === 'read_file' && (!normalizedFilePath || normalizedFilePath === '.' || normalizedFilePath === './')) {
                toolOutput = { error: 'read_file requires a concrete file path, not "." or an empty path' };
              } else if (toolName === 'read_file') {
                const fileRes = resolveCoderPath(args.filePath, resolvedWorkspace);
                if (fs.existsSync(fileRes) && fs.statSync(fileRes).isFile()) {
                  const offset = args.offset !== undefined ? Math.max(0, Number(args.offset) - 1) : 0;
                  const limit = args.limit !== undefined ? Math.max(1, Number(args.limit)) : undefined;
                  const fullContent = fs.readFileSync(fileRes, 'utf8');
                  const lines = fullContent.split('\n');
                  const sliced = limit !== undefined ? lines.slice(offset, offset + limit) : lines.slice(offset);
                  toolOutput = { success: true, content: sliced.join('\n'), totalLines: lines.length };
                } else {
                  toolOutput = { error: 'File not found' };
                }
              } else if (toolName === 'write_file') {
                const fileRes = resolveCoderPath(args.filePath, resolvedWorkspace);
                fs.mkdirSync(path.dirname(fileRes), { recursive: true });
                const writeOffset = args.offset ? Math.max(0, Number(args.offset) - 1) : 0;
                const writeLimit = args.limit ? Math.max(1, Number(args.limit)) : undefined;
                const newContent = args.content || '';
                
                if (writeOffset > 0 && fs.existsSync(fileRes)) {
                  // Append mode: read existing, slice, then append
                  const existingContent = fs.readFileSync(fileRes, 'utf8');
                  const existingLines = existingContent.split('\n');
                  const contentLines = newContent.split('\n');
                  const limitedLines = writeLimit ? contentLines.slice(0, writeLimit) : contentLines;
                  const finalLines = [...existingLines.slice(0, writeOffset), ...limitedLines];
                  fs.writeFileSync(fileRes, finalLines.join('\n'), 'utf8');
                  toolOutput = { success: true, appended: true, atLine: writeOffset, linesWritten: limitedLines.length };
                } else if (writeLimit) {
                  // Limit mode: only write specified number of lines
                  const contentLines = newContent.split('\n');
                  const limitedLines = contentLines.slice(0, writeLimit);
                  fs.writeFileSync(fileRes, limitedLines.join('\n'), 'utf8');
                  toolOutput = { success: true, linesWritten: limitedLines.length, totalContentLines: contentLines.length };
                } else {
                  fs.writeFileSync(fileRes, newContent, 'utf8');
                  toolOutput = { success: true };
                }
              } else if (toolName === 'edit_file') {
                const fileRes = resolveCoderPath(args.filePath, resolvedWorkspace);
                if (!fs.existsSync(fileRes)) {
                  toolOutput = { error: 'File not found' };
                } else {
                  const rawContent = fs.readFileSync(fileRes, 'utf8');
                  const searchText = String(args.search ?? '');
                  const replaceText = String(args.replace ?? '');
                  const replaceAll = Boolean(args.all);
                  const editOffset = args.offset ? Math.max(1, Number(args.offset)) : 1;
                  const editLimit = args.limit ? Math.max(1, Number(args.limit)) : Infinity;
                  
                  // If offset/limit provided, only search within that range
                  let searchContent = rawContent;
                  if (args.offset || args.limit) {
                    const lines = rawContent.split('\n');
                    const startIdx = Math.max(0, editOffset - 1);
                    const endIdx = Math.min(lines.length, startIdx + (editLimit === Infinity ? lines.length : editLimit));
                    const rangeLines = lines.slice(startIdx, endIdx);
                    searchContent = rangeLines.join('\n');
                    
                    // If not found in range, check if it exists at all for helpful error
                    if (!searchContent.includes(searchText) && rawContent.includes(searchText)) {
                      toolOutput = { 
                        error: `Search text found in file but not within specified range (lines ${editOffset}-${endIdx}). Use read_file to find the correct location.`,
                        foundInRange: false,
                        searchRange: { start: editOffset, end: endIdx }
                      };
                    }
                  }
                  
                  // Improved matching - try multiple strategies
                  const normalizeForMatch = (s: string) =>
                    s.replace(/\r\n?/g, '\n')
                     .split('\n')
                     .map((line) => line.replace(/[ \t]+$/g, ''))
                     .join('\n')
                     .trim();
                  
                  // Try to find closest matching lines for better error messages
                  const findClosestMatch = (search: string, content: string) => {
                    const searchLines = search.split('\n');
                    const contentLines = content.split('\n');
                    let bestMatch = null;
                    let bestScore = 0;
                    
                    for (let i = 0; i <= contentLines.length - searchLines.length; i++) {
                      let score = 0;
                      for (let j = 0; j < searchLines.length; j++) {
                        const fileLine = contentLines[i + j].trim();
                        const searchLine = searchLines[j].trim();
                        if (fileLine === searchLine) {
                          score += searchLine.length;
                        } else if (fileLine.includes(searchLine) || searchLine.includes(fileLine)) {
                          score += Math.min(fileLine.length, searchLine.length) * 0.5;
                        }
                      }
                      if (score > bestScore) {
                        bestScore = score;
                        bestMatch = contentLines.slice(Math.max(0, i - 1), i + searchLines.length + 1).join('\n');
                      }
                    }
                    return bestMatch;
                  };
                  
                  const buildSearchError = (hint: string, closestMatch?: string) => {
                    const totalLines = rawContent.split('\n').length;
                    const searchPreview = searchText.length > 240
                      ? `${searchText.slice(0, 240)}… (+${searchText.length - 240} more chars)`
                      : searchText;
                    const fileHead = rawContent.length > 2000
                      ? `${rawContent.slice(0, 2000)}\n… [truncated, file has ${totalLines} lines and ${rawContent.length} chars]`
                      : rawContent;
                    return {
                      error: `Exact search text was not found in ${path.basename(fileRes)} (${hint}).`,
                      hint: closestMatch 
                        ? `Found similar content in file. Try using this exact text:\n${closestMatch.slice(0, 500)}`
                        : 'The search text must EXACTLY match a contiguous block of the file content. Recovery: (1) call read_file on this file to get the current contents, (2) copy the EXACT text from the read_file output as your new search value, (3) re-issue the edit. For small files (<= ~150 lines) you can use write_file to rewrite the whole file in one call. Do NOT retry the same search text.',
                      filePath: path.relative(resolvedWorkspace, fileRes).replace(/\\/g, '/'),
                      totalLines,
                      fileLength: rawContent.length,
                      searchLength: searchText.length,
                      replaceLength: replaceText.length,
                      searchPreview,
                      fileContent: fileHead,
                      closestMatch: closestMatch?.slice(0, 500)
                    };
                  };
                  
                  // Strategy 1: Exact match
                  if (searchText && rawContent.includes(searchText)) {
                    const updated = replaceAll
                      ? rawContent.split(searchText).join(replaceText)
                      : rawContent.replace(searchText, replaceText);
                    fs.writeFileSync(fileRes, updated, 'utf8');
                    toolOutput = { success: true, match: 'exact' };
                  } 
                  // Strategy 2: Normalized match (trim trailing whitespace)
                  else {
                    const normalizedContent = normalizeForMatch(rawContent);
                    const normalizedSearch = normalizeForMatch(searchText);
                    
                    if (normalizedSearch && normalizedContent.includes(normalizedSearch)) {
                      const searchLines = normalizedSearch.split('\n');
                      const contentLines = rawContent.replace(/\r\n?/g, '\n').split('\n');
                      let matched = false;
                      outer: for (let i = 0; i <= contentLines.length - searchLines.length; i++) {
                        for (let j = 0; j < searchLines.length; j++) {
                          if (contentLines[i + j].replace(/[ \t]+$/g, '') !== searchLines[j]) continue outer;
                        }
                        const startCharOffset = contentLines.slice(0, i).join('\n').length + (i > 0 ? 1 : 0);
                        const matchedBlock = contentLines.slice(i, i + searchLines.length).join('\n');
                        const before = rawContent.slice(0, startCharOffset);
                        const after = rawContent.slice(startCharOffset + matchedBlock.length);
                        fs.writeFileSync(fileRes, before + replaceText + after, 'utf8');
                        toolOutput = { success: true, match: 'normalized', normalizedWhitespace: true };
                        matched = true;
                        break;
                      }
                      if (!matched) {
                        const closest = findClosestMatch(searchText, rawContent);
                        toolOutput = buildSearchError('normalized match failed during splice', closest);
                      }
                    }
                    // Strategy 3: Flexible match - try without leading/trailing empty lines
                    else {
                      const flexibleSearch = searchText.replace(/^\n+/, '').replace(/\n+$/, '');
                      const flexContent = rawContent.replace(/\r\n?/g, '\n');
                      
                      // Try finding with loose matching
                      let foundPos = -1;
                      const searchTrimmed = flexibleSearch.trim();
                      
                      for (let i = 0; i < flexContent.length; i++) {
                        const window = flexContent.slice(i, i + searchTrimmed.length + 50);
                        if (window.trim().includes(searchTrimmed)) {
                          foundPos = i;
                          break;
                        }
                      }
                      
                      if (foundPos >= 0) {
                        // Found a loose match, now find exact boundaries
                        const before = rawContent.slice(0, foundPos);
                        const after = rawContent.slice(foundPos + searchTrimmed.length);
                        fs.writeFileSync(fileRes, before + replaceText + after, 'utf8');
                        toolOutput = { success: true, match: 'flexible' };
                      } else {
                        const closest = findClosestMatch(searchText, rawContent);
                        toolOutput = buildSearchError('even after whitespace normalization', closest);
                      }
                    }
                  }
                }
              } else if (toolName === 'delete_file') {
                const fileRes = resolveCoderPath(args.filePath, resolvedWorkspace);
                if (fs.existsSync(fileRes)) {
                  if (fs.statSync(fileRes).isDirectory()) {
                    fs.rmdirSync(fileRes, { recursive: true });
                  } else {
                    fs.unlinkSync(fileRes);
                  }
                  toolOutput = { success: true };
                } else {
                  toolOutput = { error: 'File not found' };
                }
              } else if (toolName === 'rename_file') {
                const oldRes = resolveCoderPath(args.filePath, resolvedWorkspace);
                const newRes = resolveCoderPath(args.newPath, resolvedWorkspace);
                if (fs.existsSync(oldRes)) {
                  fs.mkdirSync(path.dirname(newRes), { recursive: true });
                  fs.renameSync(oldRes, newRes);
                  toolOutput = { success: true };
                } else {
                  toolOutput = { error: 'Source file not found' };
                }
              } else if (toolName === 'run_command') {
                const isWin = process.platform === 'win32';
                const cmdStr = args.command || '';
                const translated = isWin ? translateCommand(cmdStr) : cmdStr;
                
                const parts = cmdStr.trim().split(/\s+/);
                if (parts[0].toLowerCase() === 'cd') {
                  toolOutput = { exitCode: 0, stdout: '', stderr: 'Notice: cd is handled statefully in main terminal sessions. For subagents, commands run in the workspace root.' };
                } else {
                  const runRes = await new Promise((resolve) => {
                    const proc = isWin 
                      ? spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', translated], { cwd: resolvedWorkspace, env: process.env })
                      : spawn(translated, [], { cwd: resolvedWorkspace, env: process.env, shell: true });
                    let stdout = '', stderr = '';
                    proc.stdout.on('data', (c) => stdout += c.toString());
                    proc.stderr.on('data', (c) => stderr += c.toString());
                    proc.on('close', (exitCode) => resolve({ exitCode: exitCode || 0, stdout, stderr }));
                    proc.on('error', (err) => resolve({ exitCode: 1, stdout: '', stderr: err.message }));
                  });
                  toolOutput = runRes;
                }
              } else if (toolName === 'glob_tool') {
                const fileGlob = args.fileGlob ? String(args.fileGlob).toLowerCase() : '';
                const excludeStr = args.exclude ? String(args.exclude) : '';
                const excludePatterns = excludeStr ? excludeStr.split(',').map(p => p.trim().toLowerCase()).filter(Boolean) : [];
                let files = getFilesRecursively(resolvedWorkspace);
                if (excludePatterns.length > 0) {
                  files = files.filter(f => {
                    const relPath = f.relativePath.toLowerCase();
                    return !excludePatterns.some(pattern => relPath.includes(pattern));
                  });
                }
                if (fileGlob) {
                  files = files.filter(f => !f.isDirectory && matchesWorkspaceGlob(f.relativePath, fileGlob));
                } else {
                  files = files.filter(f => !f.isDirectory);
                }
                const maxResults = Math.min(Number(args.maxResults) || 50, 100);
                toolOutput = { fileGlob, exclude: excludeStr, count: files.length, files: files.slice(0, maxResults).map(f => ({ filePath: f.relativePath, isDirectory: f.isDirectory })) };
              } else if (toolName === 'grep_tool') {
                const query = normalizedQuery;
                if (!query || query === '.') {
                  toolOutput = { query, count: 0, matches: [], skipped: 'Blocked empty or non-specific search query to save tokens' };
                } else {
                  const fileGlob = args.fileGlob ? String(args.fileGlob).toLowerCase() : '';
                  const grepOffset = args.offset ? Math.max(1, Number(args.offset)) : 1;
                  const grepLimit = args.limit ? Math.max(1, Number(args.limit)) : Infinity;
                  let files = getFilesRecursively(resolvedWorkspace);
                  if (fileGlob) {
                    files = files.filter(f => !f.isDirectory && matchesWorkspaceGlob(f.relativePath, fileGlob));
                  } else {
                    files = files.filter(f => !f.isDirectory);
                  }
                  const matches: { filePath: string; line: number; text: string }[] = [];
                  const maxResults = Math.min(Number(args.maxResults) || 30, 80);
                  let count = 0;
                  for (const file of files) {
                    if (count >= maxResults) break;
                    const fullF = path.join(resolvedWorkspace, file.relativePath);
                    if (fs.existsSync(fullF)) {
                      let content = fs.readFileSync(fullF, 'utf8');
                      if (grepOffset > 1 || grepLimit !== Infinity) {
                        const lines = content.split('\n');
                        const startIdx = Math.max(0, grepOffset - 1);
                        const endIdx = grepLimit === Infinity ? lines.length : Math.min(lines.length, startIdx + grepLimit);
                        content = lines.slice(startIdx, endIdx).join('\n');
                      }
                      if (content.toLowerCase().includes(query.toLowerCase())) {
                        const lines = content.split('\n');
                        const lineOffset = grepOffset > 1 ? grepOffset - 1 : 0;
                        lines.forEach((line, idx) => {
                          if (count < maxResults && line.toLowerCase().includes(query.toLowerCase())) {
                            matches.push({ filePath: file.relativePath, line: idx + 1 + lineOffset, text: line.trim() });
                            count++;
                          }
                        });
                      }
                    }
                  }
                  toolOutput = { query, fileGlob, offset: grepOffset, limit: grepLimit === Infinity ? undefined : grepLimit, count: matches.length, matches };
                }
              } else {
                toolOutput = { error: `Tool ${toolName} not implemented` };
              }

              const ev = agentEvents.find((e: { id: string }) => e.id === eventId);
              if (ev) {
                ev.status = 'complete';
                ev.output = JSON.stringify(toolOutput).slice(0, 500);
              }

              if (toolName === 'write_file' || toolName === 'edit_file') {
                const relPath = path.relative(resolvedWorkspace, resolveCoderPath(args.filePath, resolvedWorkspace)).replace(/\\/g, '/');
                if (!activeSubagents[agentId].filesCreated.includes(relPath)) {
                  activeSubagents[agentId].filesCreated.push(relPath);
                }
              }
            } catch (toolErr: any) {
              toolOutput = { error: toolErr.message };
              const ev = agentEvents.find((e: { id: string }) => e.id === eventId);
              if (ev) {
                ev.status = 'failed';
                ev.output = toolErr.message;
              }
            }

            messages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: JSON.stringify(toolOutput)
            });
          }
        }

        activeSubagents[agentId].status = 'done';
        activeSubagents[agentId].completedAt = Date.now();
        activeSubagents[agentId].summary = finalSummary;
      } catch (err: any) {
        console.error("Subagent background execution failed:", err);
        activeSubagents[agentId].status = 'failed';
        activeSubagents[agentId].completedAt = Date.now();
        activeSubagents[agentId].error = err.message || "Subagent spawn failure";
      }
    })();
  });

  const getUpstreamErrorDetail = (e: any) => {
    const raw = e?.response?.data ?? e?.message ?? String(e);
    if (typeof raw === 'string') return raw;
    try {
      const seen = new WeakSet();
      return JSON.stringify(raw, (_key, value) => {
        if (typeof value === 'object' && value !== null) {
          if (seen.has(value)) return '[Circular]';
          seen.add(value);
        }
        return value;
      });
    } catch {
      return e?.message || String(raw);
    }
  };

  const getUpstreamErrorStatus = (e: any) => {
    const status = Number(e?.response?.status);
    if (status === 429) return 429;
    if (status >= 400 && status < 500) return status;
    const detail = getUpstreamErrorDetail(e).toLowerCase();
    if (
      detail.includes('rate_limit') ||
      detail.includes('rate limit') ||
      detail.includes('rate-limited') ||
      detail.includes('too many requests') ||
      detail.includes('quota exceeded')
    ) {
      return 429;
    }
    return 502;
  };

  const getRetryDelayMs = (e: any, fallbackMs: number) => {
    const retryAfter = Number(e?.response?.headers?.['retry-after']);
    if (Number.isFinite(retryAfter) && retryAfter > 0) {
      return Math.min(30000, Math.ceil(retryAfter * 1000) + 500);
    }
    const detail = getUpstreamErrorDetail(e);
    const match = detail.match(/try again in\s+([0-9.]+)\s*s/i) ||
      detail.match(/retry(?:-after| after)?\s*:?\s*([0-9.]+)\s*s?/i);
    if (match) {
      const seconds = Number(match[1]);
      if (Number.isFinite(seconds) && seconds > 0) {
        return Math.min(30000, Math.ceil(seconds * 1000) + 500);
      }
    }
    return fallbackMs;
  };

  const getLuminaDataDir = () => {
    return process.env.LUMINA_DATA_DIR || path.join(os.homedir(), '.lumina');
  };

  const extensionFromMime = (mimeType = '') => {
    const clean = mimeType.split(';')[0].trim().toLowerCase();
    if (clean === 'audio/wav' || clean === 'audio/wave' || clean === 'audio/x-wav') return '.wav';
    if (clean === 'audio/mpeg' || clean === 'audio/mp3') return '.mp3';
    if (clean === 'audio/mp4' || clean === 'video/mp4') return '.mp4';
    if (clean === 'audio/flac') return '.flac';
    if (clean === 'audio/ogg' || clean === 'audio/opus') return '.ogg';
    if (clean === 'audio/webm' || clean === 'video/webm') return '.webm';
    return '.webm';
  };

  const cleanWhisperTranscript = (raw: string) => {
    return String(raw || '')
      .split(/\r?\n/)
      .map(line => line
        .replace(/^\s*\[[^\]]*-->\s*[^\]]*\]\s*/g, '')
        .replace(/^\s*\[[0-9:.]+\s*-->\s*[0-9:.]+\]\s*/g, '')
        .trim())
      .filter(line => {
        if (!line) return false;
        const lower = line.toLowerCase();
        return !lower.includes('[nodejs-whisper]') &&
          !lower.startsWith('whisper_') &&
          !lower.startsWith('system_info:') &&
          !lower.startsWith('main:');
      })
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  app.post("/api/stt/transcribe", async (req, res) => {
    const { audioBase64, mimeType = 'audio/webm', modelName = 'base.en', language } = req.body || {};
    if (!audioBase64 || typeof audioBase64 !== 'string') {
      return res.status(400).json({ error: 'audioBase64 is required' });
    }

    const audioBuffer = Buffer.from(audioBase64.replace(/^data:[^;]+;base64,/, ''), 'base64');
    if (!audioBuffer.length) {
      return res.status(400).json({ error: 'Audio payload is empty' });
    }

    const sttRoot = path.join(getLuminaDataDir(), 'local-stt');
    const audioDir = path.join(sttRoot, 'audio');
    const modelRootPath = path.join(sttRoot, 'models');
    fs.mkdirSync(audioDir, { recursive: true });
    fs.mkdirSync(modelRootPath, { recursive: true });

    const audioPath = path.join(audioDir, `voice-${Date.now()}-${Math.random().toString(36).slice(2)}${extensionFromMime(mimeType)}`);
    fs.writeFileSync(audioPath, audioBuffer);

    try {
      // Windows Auto-Heal: If whisper-cli.exe is missing, download prebuilt whisper.cpp binary
      if (process.platform === 'win32') {
        const whisperCppPath = path.join(process.cwd(), 'node_modules', 'nodejs-whisper', 'cpp', 'whisper.cpp');
        const execName = 'whisper-cli.exe';
        const possiblePaths = [
          path.join(whisperCppPath, 'build', 'bin', execName),
          path.join(whisperCppPath, 'build', 'bin', 'Release', execName),
          path.join(whisperCppPath, 'build', 'bin', 'Debug', execName),
          path.join(whisperCppPath, 'build', execName),
          path.join(whisperCppPath, execName)
        ];
        const exists = possiblePaths.some(p => fs.existsSync(p));
        if (!exists) {
          console.log('[Lumina Server] Local Whisper CLI binary not found on Windows. Downloading prebuilt binary...');
          const zipUrl = 'https://github.com/ggml-org/whisper.cpp/releases/download/v1.8.4/whisper-bin-x64.zip';
          const targetDir = path.join(whisperCppPath, 'build', 'bin', 'Release');
          fs.mkdirSync(targetDir, { recursive: true });
          const zipPath = path.join(whisperCppPath, 'whisper-bin-x64.zip');
          
          const response = await axios({
            method: 'get',
            url: zipUrl,
            responseType: 'arraybuffer'
          });
          fs.writeFileSync(zipPath, response.data);
          
          const { execSync } = await import('child_process');
          execSync(`powershell.exe -NoProfile -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${targetDir}' -Force"`);
          fs.unlinkSync(zipPath);
          
          // The zip has a nested Release/ directory: move its content up one level if it exists
          const nestedReleaseDir = path.join(targetDir, 'Release');
          if (fs.existsSync(nestedReleaseDir) && fs.statSync(nestedReleaseDir).isDirectory()) {
            const files = fs.readdirSync(nestedReleaseDir);
            for (const file of files) {
              const src = path.join(nestedReleaseDir, file);
              const dest = path.join(targetDir, file);
              fs.renameSync(src, dest);
            }
            fs.rmdirSync(nestedReleaseDir);
          }
          console.log('[Lumina Server] Prebuilt Whisper CLI binary downloaded and configured successfully.');
        }
      }

      const whisperModule: any = await import('nodejs-whisper');
      const nodewhisper = whisperModule.nodewhisper || whisperModule.default?.nodewhisper;
      if (typeof nodewhisper !== 'function') {
        throw new Error('nodejs-whisper did not expose nodewhisper().');
      }

      const whisperLanguage = typeof language === 'string' && language
        ? language.split('-')[0].toLowerCase()
        : undefined;
      const logs: string[] = [];
      const logger = {
        debug: (...args: any[]) => logs.push(args.map(String).join(' ')),
        log: (...args: any[]) => logs.push(args.map(String).join(' ')),
        error: (...args: any[]) => logs.push(args.map(String).join(' '))
      };

      const rawTranscript = await nodewhisper(audioPath, {
        modelName,
        autoDownloadModelName: modelName,
        modelRootPath,
        removeWavFileAfterTranscription: true,
        withCuda: false,
        logger,
        whisperOptions: {
          language: whisperLanguage,
          outputInText: false,
          outputInSrt: false,
          outputInVtt: false,
          outputInJson: false,
          splitOnWord: true,
          noGpu: true
        }
      });

      try { fs.unlinkSync(audioPath); } catch {}
      res.json({
        success: true,
        transcript: cleanWhisperTranscript(rawTranscript) || rawTranscript.trim(),
        rawTranscript,
        modelName,
        modelRootPath
      });
    } catch (e: any) {
      try { fs.unlinkSync(audioPath); } catch {}
      const detail = e?.message || String(e);
      const ffmpegHint = detail.toLowerCase().includes('ffmpeg')
        ? ' Install FFmpeg and ensure it is available on PATH. Windows: scoop install ffmpeg, or download from https://ffmpeg.org/download.html'
        : '';
      res.status(500).json({
        error: 'Local transcription failed',
        detail: `${detail}${ffmpegHint}`,
        prerequisites: {
          ffmpeg: {
            macOS: 'brew install ffmpeg',
            linux: 'sudo apt install ffmpeg',
            windows: 'scoop install ffmpeg or download from https://ffmpeg.org/download.html'
          }
        }
      });
    }
  });



  // ─── Terminal Session Store ────────────────────────────────────────────────────
  const terminalSessions = new Map<string, { cwd: string; lastAccess: number }>();

  function getTerminalSession(sessionId?: string) {
    if (!sessionId || !terminalSessions.has(sessionId)) {
      const newSession: { cwd: string; lastAccess: number } = {
        cwd: process.cwd(),
        lastAccess: Date.now(),
      };
      const id = sessionId || `sess_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      terminalSessions.set(id, newSession);
      return { id, session: newSession };
    }
    const session = terminalSessions.get(sessionId)!;
    session.lastAccess = Date.now();
    return { id: sessionId, session };
  }

  // Clean up stale terminal sessions every 10 minutes
  setInterval(() => {
    const now = Date.now();
    for (const [id, sess] of terminalSessions.entries()) {
      if (now - sess.lastAccess > 60 * 60 * 1000) {
        terminalSessions.delete(id);
      }
    }
  }, 10 * 60 * 1000);

  // GET /api/terminal/session — create or resume a session
  app.get("/api/terminal/session", (req, res) => {
    const workspaceRoot = typeof req.query.workspaceRoot === 'string' && req.query.workspaceRoot.trim()
      ? req.query.workspaceRoot
      : process.cwd();
    const { id, session } = getTerminalSession();
    session.cwd = workspaceRoot;
    res.json({
      sessionId: id,
      cwd: session.cwd,
      currentPath: session.cwd,
      platform: process.platform,
      shell: process.platform === 'win32' ? 'powershell' : 'bash',
      hostname: os.hostname(),
      username: os.userInfo().username,
    });
  });

  // ─── Unix → PowerShell command translation (Windows only) ─────────────────
  const PS_CMD_MAP: Record<string, string> = {
    'cat': 'Get-Content', 'cp': 'Copy-Item', 'mv': 'Move-Item',
    'rm': 'Remove-Item', 'grep': 'Select-String', 'which': 'Get-Command',
    'head': 'Select-Object', 'tail': 'Select-Object',
    'wc': 'Measure-Object', 'sort': 'Sort-Object', 'diff': 'Compare-Object',
    'find': 'Where-Object', 'touch': 'New-Item',
    'whoami': 'whoami', 'echo': 'Write-Output',
    'ps': 'Get-Process', 'kill': 'Stop-Process',
    'curl': 'Invoke-WebRequest', 'wget': 'Invoke-WebRequest',
    'date': 'Get-Date', 'alias': 'Get-Alias', 'history': 'Get-History',
    'man': 'Get-Help', 'ping': 'Test-Connection',
  };

  /** Extract the first word (command name) from a trimmed command string */
  function firstWordOf(s: string): string {
    return s.split(/\s+/)[0].replace(/["']/g, '').toLowerCase();
  }

  /** Translate ls flags to PowerShell parameters */
  function translateLs(rest: string): string {
    let target = '';
    let hasForce = false, hasRecurse = false, hasReverse = false;
    let extraPipes = '';
    const parts = rest.match(/\S+/g) || [];
    for (const p of parts) {
      if (p.startsWith('--')) {
        const f = p.slice(2);
        if (f === 'all' || f === 'almost-all') hasForce = true;
        else if (f === 'recursive') hasRecurse = true;
        else if (f === 'reverse') hasReverse = true;
        else target = p;
      } else if (p.startsWith('-') && p.length > 1) {
        for (const ch of p.slice(1)) {
          switch (ch) {
            case 'a': hasForce = true; break;
            case 'R': hasRecurse = true; break;
            case 'r': hasReverse = true; break;
            case 'S': extraPipes = ' | Sort-Object Length -Descending'; break;
            case 't': extraPipes = ' | Sort-Object LastWriteTime -Descending'; break;
          }
        }
      } else {
        target = p;
      }
    }
    let cmd = 'Get-ChildItem';
    if (target) cmd += ` -Path "${target.replace(/"/g, '\\"')}"`;
    if (hasForce) cmd += ' -Force';
    if (hasRecurse) cmd += ' -Recurse';
    cmd += extraPipes || ' | Format-Table -AutoSize';
    return cmd;
  }

  /** Translate rm flags to PowerShell parameters */
  function translateRm(rest: string): string {
    let target = '';
    let recurse = false, force = false;
    const parts = rest.match(/\S+/g) || [];
    for (const p of parts) {
      if (p.startsWith('-') && p.length > 1) {
        for (const ch of p.slice(1)) {
          if (ch === 'r' || ch === 'R') recurse = true;
          if (ch === 'f') force = true;
        }
      } else {
        target = p;
      }
    }
    if (!target) return 'Remove-Item';
    let cmd = `Remove-Item -Path "${target.replace(/"/g, '\\"')}"`;
    if (recurse) cmd += ' -Recurse';
    if (force) cmd += ' -Force';
    return cmd;
  }

  /** Translate cp/mv flags */
  function translateCpMv(rest: string, cmd: string): string {
    let src = '', dst = '';
    let recurse = false, force = false;
    const parts = rest.match(/\S+/g) || [];
    for (const p of parts) {
      if (p.startsWith('-') && p.length > 1) {
        for (const ch of p.slice(1)) {
          if (ch === 'r' || ch === 'R') recurse = true;
          if (ch === 'f') force = true;
        }
      } else if (!src) {
        src = p;
      } else {
        dst = p;
      }
    }
    let ps = cmd;
    if (src) ps += ` -Path "${src.replace(/"/g, '\\"')}"`;
    if (dst) ps += ` -Destination "${dst.replace(/"/g, '\\"')}"`;
    if (recurse) ps += ' -Recurse';
    if (force) ps += ' -Force';
    return ps;
  }

  /** Translate grep patterns to PowerShell Select-String */
  function translateGrep(rest: string): string {
    const parts = rest.match(/\S+/g) || [];
    const pattern: string[] = [];
    const files: string[] = [];
    let inPattern = false, invert = false, ignoreCase = false;
    for (const p of parts) {
      if (p.startsWith('-') && p.length > 1) {
        for (const ch of p.slice(1)) {
          if (ch === 'i') ignoreCase = true;
          if (ch === 'v') invert = true;
          if (ch === 'r' || ch === 'R') { /* -r not needed */ }
          if (ch === 'E') { /* extended regex not needed */ }
        }
      } else if (!inPattern) {
        pattern.push(p);
        inPattern = true;
      } else {
        files.push(p);
      }
    }
    let ps = `Select-String -Pattern "${pattern.join(' ').replace(/"/g, '\\"')}"`;
    if (files.length > 0) ps += ` -Path "${files.map(f => f.replace(/"/g, '\\"')).join(',')}"`;
    if (ignoreCase) ps += ' -CaseSensitive:$false';
    if (invert) ps += ' -NotMatch';
    return ps;
  }

  /** Translate one segment (before/after a pipe) */
  function translateSegment(seg: string): string {
    const t = seg.trim();
    if (!t) return t;
    const fw = firstWordOf(t);
    const rest = t.slice(fw.length).trim();

    switch (fw) {
      case 'ls': return translateLs(rest);
      case 'rm': return translateRm(rest);
      case 'cp': return translateCpMv(rest, 'Copy-Item');
      case 'mv': return translateCpMv(rest, 'Move-Item');
      case 'grep': return translateGrep(rest);
      case 'mkdir': return `New-Item -ItemType Directory -Path "${rest.replace(/"/g, '\\"')}"`;
      case 'touch': return `New-Item -ItemType File -Path "${(rest || '.').replace(/"/g, '\\"')}" -Force`;
      case 'pwd': return 'Get-Location | Select-Object -ExpandProperty Path';
      case 'ps': return 'Get-Process | Format-Table -AutoSize';
      case 'kill': return `Stop-Process ${rest.replace(/^-/, '-Id ')}`;
      case 'which': return `Get-Command ${rest || ''} | Select-Object -ExpandProperty Source`;
      case 'chmod': return 'Write-Output "chmod is not available on Windows"';
      case 'chown': return 'Write-Output "chown is not available on Windows"';
      case 'ifconfig': return 'Get-NetIPConfiguration | Format-Table -AutoSize';
      case 'netstat': return 'Get-NetTCPConnection | Format-Table -AutoSize';
      case 'uname': return rest?.includes('-a') ? '[Environment]::OSVersion | Format-List *' : '[Environment]::OSVersion.OSVersion.Platform';
      case 'head': {
        const n = rest.match(/-n\s+(\d+)/);
        return `Select-Object -First ${n ? n[1] : 10}`;
      }
      case 'tail': {
        const n = rest.match(/-n\s+(\d+)/);
        return `Select-Object -Last ${n ? n[1] : 10}`;
      }
      case 'wc': return 'Measure-Object -Line -Word -Character | Select-Object Lines, Words, Characters';
      case 'clear': return 'Clear-Host';
      case 'exit': return 'exit';
      default: {
        if (PS_CMD_MAP[fw]) {
          return `${PS_CMD_MAP[fw]} ${rest}`;
        }
        return seg;
      }
    }
  }

  /** Translate a full command (handling pipes) */
  function translateCommand(cmd: string): string {
    return cmd.split(/(\||;)/g).map((part, idx) => {
      if (part === '|' || part === ';') return part;
      return translateSegment(part);
    }).join('');
  }

  // POST /api/terminal/execute — shell command execution
  app.post("/api/terminal/execute", async (req, res) => {
    let { command, currentPath, sessionId: clientSessionId, workspaceRoot } = req.body;
    if (!command || typeof command !== 'string') {
      return res.status(400).json({ stderr: 'No command provided.' });
    }

    const hostWorkspaceRoot = path.resolve(workspaceRoot || currentPath || process.cwd());
    const { id: sessionId, session } = getTerminalSession(clientSessionId);

    if (currentPath && currentPath !== '.') {
      const resolved = path.resolve(currentPath);
      if (resolved === hostWorkspaceRoot || resolved.startsWith(hostWorkspaceRoot + path.sep)) {
        session.cwd = resolved;
      }
    }
    if (!(session.cwd === hostWorkspaceRoot || session.cwd.startsWith(hostWorkspaceRoot + path.sep))) {
      session.cwd = hostWorkspaceRoot;
    }

    const trimmed = command.trim();
    const firstWord = trimmed.split(/\s+/)[0].toLowerCase();
    // Translate Unix commands to PowerShell equivalents on Windows
    const isWin = process.platform === 'win32';
    const translatedCommand = isWin ? translateCommand(trimmed) : trimmed;

    if (['cls', 'clear', 'clear-host'].includes(firstWord)) {
      return res.json({ sessionId, clear: true, stdout: '', stderr: '' });
    }

    if (firstWord === 'cd') {
      const args = trimmed.slice(firstWord.length).trim();
      const nextPath = path.resolve(session.cwd, args || hostWorkspaceRoot);
      if (!(nextPath === hostWorkspaceRoot || nextPath.startsWith(hostWorkspaceRoot + path.sep))) {
        return res.status(403).json({ sessionId, stdout: '', stderr: `Permission denied: terminal is sandboxed to ${hostWorkspaceRoot}\n`, newPath: session.cwd });
      }
      session.cwd = nextPath;
      return res.json({ sessionId, stdout: '', stderr: '', newPath: session.cwd });
    }

    if (firstWord === 'pwd') {
      return res.json({ sessionId, stdout: session.cwd + '\n', stderr: '', newPath: session.cwd });
    }

    const result = await new Promise<{ stdout: string; stderr: string; exitCode: number }>((resolve) => {
      // Use PowerShell on Windows for Unix command compatibility, /bin/sh elsewhere
      const proc = isWin
        ? spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', translatedCommand], {
            cwd: session.cwd,
            env: process.env,
            stdio: ['ignore', 'pipe', 'pipe'],
          })
        : spawn(translatedCommand, [], {
            cwd: session.cwd,
            env: process.env,
            stdio: ['ignore', 'pipe', 'pipe'],
            shell: true,
          });
      let stdout = '';
      let stderr = '';
      proc.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
      proc.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
      proc.on('close', (code) => resolve({ stdout, stderr, exitCode: code ?? 0 }));
      proc.on('error', (error) => resolve({ stdout: '', stderr: `Execution failed: ${error.message}\n`, exitCode: 1 }));
    });
    return res.json({
      sessionId,
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode,
      newPath: session.cwd,
    });
  });

  // Live Compiler/Transpiler Sandbox Interceptor for React / JSX / TSX and JS
  app.get('/coder-preview/*', (req, res, next) => {
    const subpath = (req.params as Record<string, string>)['0'] || '';
    if (!subpath) {
      return next();
    }
    const targetFilePath = path.resolve(activePreviewRoot, subpath);
    if (fs.existsSync(targetFilePath) && fs.statSync(targetFilePath).isFile()) {
      const ext = path.extname(targetFilePath).toLowerCase();
      if (ext === '.jsx' || ext === '.tsx' || ext === '.js') {
        try {
          const fileContent = fs.readFileSync(targetFilePath, 'utf8');
          // Escape single/double quotes, code blocks, etc. for JS template literals
          const escapedContent = fileContent
            .replace(/\\/g, '\\\\')
            .replace(/`/g, '\\`')
            .replace(/\${/g, '\\${');

          const wrappedHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Lumina Sandbox: ${path.basename(subpath)}</title>
  
  <!-- CSS styled overlay -->
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  
  <!-- Umd standard files -->
  <script src="https://unpkg.com/react@18/umd/react.development.js" crossorigin></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js" crossorigin></script>
  <script src="https://unpkg.com/lucide@latest"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>

  <style>
    body {
      font-family: 'Inter', sans-serif;
      margin: 0;
      padding: 0;
      background-color: #0b0c10;
      color: #f3f4f6;
    }
    ::-webkit-scrollbar {
      width: 8px;
    }
    ::-webkit-scrollbar-track {
      background: #0f1115;
    }
    ::-webkit-scrollbar-thumb {
      background: #252833;
      border-radius: 4px;
    }
    #root {
      min-height: calc(100vh - 40px);
    }
  </style>
  <script>
    window.process = { env: { NODE_ENV: 'development' } };
  </script>
</head>
<body class="bg-[#0b0c10] text-[#f3f4f6] min-h-screen flex flex-col">

  <!-- Top status header -->
  <div class="flex items-center justify-between px-4 py-2 border-b border-zinc-850 bg-[#0f1115] select-none text-xs text-zinc-400 h-10">
    <div class="flex items-center gap-2">
      <span class="inline-block w-2 h-2 rounded-full bg-teal-500 animate-pulse"></span>
      <span class="font-mono text-zinc-300 font-medium">Lumina Transpiler Engine</span>
      <span class="text-zinc-700">|</span>
      <span class="font-semibold text-teal-400 font-mono">${path.basename(subpath)}</span>
    </div>
    <div class="flex items-center gap-3 font-mono text-[10px]">
      <span class="text-zinc-500">TYPE: <strong class="text-[#D97756]">${ext.toUpperCase().slice(1)}</strong></span>
      <span>•</span>
      <span class="text-zinc-500">SANDBOX: <strong class="text-emerald-500">React 18</strong></span>
    </div>
  </div>

  <!-- Sandbox UI Container -->
  <div id="root" class="flex-1 p-6"></div>

  <!-- Error Boundary Overlay -->
  <div id="error-boundary-overlay" class="hidden fixed bottom-6 right-6 max-w-xl p-5 bg-rose-950/95 border border-rose-500 rounded-xl shadow-2xl backdrop-blur-md z-50 animate-fade-in">
    <div class="flex items-start gap-4">
      <div class="p-1 px-2 rounded bg-rose-800 text-white font-mono text-[10px] select-none uppercase font-bold tracking-wider">Compile / Runtime Error</div>
      <div class="flex-1">
        <h4 class="text-sm font-semibold text-rose-200">Execution Stacktrace</h4>
        <pre class="mt-2.5 text-xs font-mono text-rose-300 whitespace-pre-wrap max-h-56 overflow-y-auto bg-stone-950/80 p-3 rounded border border-rose-900/50" id="error-message"></pre>
      </div>
    </div>
  </div>

  <script type="text/babel" data-presets="react,typescript">
    function reportError(err) {
      console.error("Sandbox component error:", err);
      const overlay = document.getElementById('error-boundary-overlay');
      const msg = document.getElementById('error-message');
      if (overlay && msg) {
        msg.textContent = err.stack || err.message || String(err);
        overlay.classList.remove('hidden');
      }
    }

    try {
      let userCode = \`${escapedContent}\`;
      
      // Stand-in export transformation
      userCode = userCode.replace(/export\\s+default\\s+/g, 'const DefaultExportComponent = ');
      userCode = userCode.replace(/export\\s+const\\s+/g, 'const ');
      userCode = userCode.replace(/export\\s+function\\s+/g, 'function ');
      
      // Comment standard NPM imports that are not supported in basic browser UMD imports env
      userCode = userCode.replace(/import\\s+.*?\\s+from\\s+['"].*?['"]/g, match => '// ' + match);

      const { useState, useEffect, useMemo, useCallback, useRef } = React;
      
      const evalWrapper = new Function('React', 'useState', 'useEffect', 'useMemo', 'useCallback', 'useRef', 'lucide', \`
        \${userCode}
        return typeof DefaultExportComponent !== 'undefined' ? DefaultExportComponent : (typeof App !== 'undefined' ? App : null);
      \`);

      const TargetComponent = evalWrapper(React, useState, useEffect, useMemo, useCallback, useRef, window.lucide);

      if (TargetComponent) {
        const rootElement = document.getElementById('root');
        const root = ReactDOM.createRoot(rootElement);
        root.render(<TargetComponent />);
        
        setTimeout(() => {
          if (window.lucide && typeof window.lucide.createIcons === 'function') {
            window.lucide.createIcons();
          }
        }, 300);
      } else {
        // Vanilla fallback loop
        const runModule = new Function('React', 'useState', 'useEffect', 'useMemo', 'useCallback', 'useRef', 'lucide', userCode);
        runModule(React, useState, useEffect, useMemo, useCallback, useRef, window.lucide);
      }
    } catch (compileErr) {
      reportError(compileErr);
    }
  <\/script>
</body>
</html>`;
          res.setHeader('Content-Type', 'text/html;charset=utf-8');
          return res.send(wrappedHtml);
        } catch (err: any) {
          return res.status(500).send(`Transpiler error: ${err.message}`);
        }
      }
    }
    next();
  });
  app.use('/coder-preview', (req, res, next) => {
    express.static(activePreviewRoot)(req, res, next);
  });

  const decodeDuckDuckGoRedirectUrl = (inputUrl: string): string => {
    try {
      const parsed = new URL(inputUrl);
      const uddg = parsed.searchParams.get('uddg');
      if (uddg) {
        return decodeURIComponent(uddg);
      }
    } catch {}
    return inputUrl;
  };

  const normalizeSearchResults = (rawResults: any[] = []) =>
    rawResults
      .map((result: any) => ({
        title: String(result?.title || '').trim(),
        url: String(result?.url || result?.link || '').trim(),
        snippet: String(result?.snippet || result?.description || result?.content || '').trim()
      }))
      .filter((result: any) => result.url);

  const searchDuckDuckGoHtml = async (query: string) => {
    const response = await axios.get('https://html.duckduckgo.com/html/', {
      params: { q: query },
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });

    const $ = cheerio.load(typeof response.data === 'string' ? response.data : '');
    const results: Array<{ title: string; url: string; snippet: string }> = [];

    $('.result').each((_, element) => {
      const anchor = $(element).find('.result__title a, a.result__a').first();
      const snippet = $(element).find('.result__snippet').first().text().trim();
      const title = anchor.text().trim();
      const href = anchor.attr('href');
      if (!title || !href) return;

      results.push({
        title,
        url: decodeDuckDuckGoRedirectUrl(href),
        snippet
      });
    });

    return results.filter((result) => /^https?:\/\//i.test(result.url));
  };

  const runDuckDuckGoSearch = async (query: string) => {
    try {
      const ddgResults = await search(query, {
        region: 'wt-wt',
        safeSearch: -1,
        time: 'y',
        offset: 0
      });

      const normalized = normalizeSearchResults(ddgResults.results || []);
      if (normalized.length > 0) {
        return {
          results: normalized,
          related: Array.isArray(ddgResults.related) ? ddgResults.related : []
        };
      }
    } catch (error) {
      console.warn('DuckDuckGo package search failed, trying HTML fallback:', error);
    }

    const fallbackResults = await searchDuckDuckGoHtml(query);
    return { results: fallbackResults, related: [] };
  };

  // Search endpoint
  app.post("/api/search", async (req, res) => {
    const { query, tavilyKey, serpKey, provider: preferredProvider } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: "Query is required" });
    }

    let results: any[] = [];
    let provider = "duckduckgo";

    try {
      const tryTavily = async () => {
        if (!tavilyKey) return;
        try {
          const response = await axios.post('https://api.tavily.com/search', {
            api_key: tavilyKey,
            query: query,
            search_depth: "advanced",
            include_answer: true,
            include_raw_content: false
          });
          if (response.data && response.data.results) {
            results = response.data.results.map((r: any) => ({
              title: r.title,
              url: r.url,
              snippet: r.content
            }));
            provider = "tavily";
          }
        } catch (e) {
          console.log("Tavily failed, falling back...");
        }
      };

      const trySerpApi = async () => {
        if (!serpKey) return;
        try {
          const response = await axios.post('https://google.serper.dev/search', { q: query }, {
            headers: { 'X-API-KEY': serpKey, 'Content-Type': 'application/json' }
          });
          if (response.data && response.data.organic) {
            results = response.data.organic.map((r: any) => ({
              title: r.title,
              url: r.link,
              snippet: r.snippet
            }));
            provider = "serper";
          }
        } catch (e) {
          console.log("SerpApi failed, falling back...");
        }
      };

      const tryDdg = async () => {
        try {
          const ddgResults = await runDuckDuckGoSearch(query);
          let enrichedResults: any[] = ddgResults.results.slice(0, 10);

          if (enrichedResults.length === 0 && ddgResults.related.length > 0) {
            enrichedResults = ddgResults.related.map((t: any) => ({
              title: t.text,
              url: '',
              snippet: t.text
            }));
          }

          results = enrichedResults;
          provider = "duckduckgo";
        } catch (e) {
          console.error("DuckDuckGo search failed:", e);
        }
      };

      // Try the preferred provider first, then fallback to the other, then DDG
      if (preferredProvider === 'serpapi') {
        await trySerpApi();
        if (results.length === 0) await tryTavily();
      } else {
        await tryTavily();
        if (results.length === 0) await trySerpApi();
      }
      if (results.length === 0) await tryDdg();

      res.json({ results, provider });
    } catch (error: any) {
      console.error("Search API Error:", error);
      res.status(500).json({ error: "Search failed" });
    }
  });

  app.post("/api/image-search", async (req, res) => {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: "Query is required" });
    }

    try {
      const { searchImages } = await import('duck-duck-scrape');
      const results = await searchImages(query);
      
      const formattedResults = results.results.slice(0, 10).map((img: any) => ({
        title: img.title,
        url: img.image,
        source: img.source,
        thumbnail: img.thumbnail
      }));

      res.json({ results: formattedResults });
    } catch (error: any) {
      console.error("Image Search API Error:", error);
      res.status(500).json({ error: "Image search failed" });
    }
  });

  type ScrapeStrategy = 'static' | 'dynamic' | 'crawl';
  type BrowserEngine = 'lightpanda';
  type LightpandaCloudConfig = {
    region?: 'euwest' | 'uswest' | 'useast';
    token?: string;
    browser?: string;
    proxy?: string;
  };

  const DEFAULT_SCRAPER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
  const DEFAULT_LIGHTPANDA_CLOUD_REGION = (process.env.LIGHTPANDA_CLOUD_REGION || 'euwest') as NonNullable<LightpandaCloudConfig['region']>;
  const DEFAULT_LIGHTPANDA_CLOUD_BROWSER = process.env.LIGHTPANDA_CLOUD_BROWSER || 'lightpanda';
  const DEFAULT_LIGHTPANDA_CLOUD_PROXY = process.env.LIGHTPANDA_CLOUD_PROXY || 'fast_dc';
  const LIGHTPANDA_CLOUD_HOSTS: Record<NonNullable<LightpandaCloudConfig['region']>, string> = {
    euwest: 'euwest.cloud.lightpanda.io',
    uswest: 'uswest.cloud.lightpanda.io',
    useast: 'useast.cloud.lightpanda.io',
  };

  const getScraperHeaders = () => ({
    'User-Agent': DEFAULT_SCRAPER_UA,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1'
  });

  const isPrivateHostname = (hostname: string) => {
    const lower = hostname.toLowerCase();
    return (
      lower === 'localhost' ||
      lower === '127.0.0.1' ||
      lower.startsWith('192.168.') ||
      lower.startsWith('10.') ||
      lower.startsWith('169.254.') ||
      lower.endsWith('.local')
    );
  };

  const containsSuspiciousSelector = (selectors: Record<string, string> = {}) =>
    Object.entries(selectors).some(([, value]) => typeof value === 'string' && (value.includes('<script') || value.toLowerCase().includes('javascript:')));

  const getSearchQueryIfSearchEngine = (urlStr: string): string | null => {
    try {
      const parsed = new URL(urlStr);
      const host = parsed.hostname.toLowerCase();
      const isSearchEngine = host.includes('google.') || host.includes('bing.') || host.includes('duckduckgo.') || host.includes('yahoo.');
      if (!isSearchEngine) return null;
      const q = parsed.searchParams.get('q') || parsed.searchParams.get('query') || parsed.searchParams.get('p') || parsed.searchParams.get('text');
      if (q && q.trim()) return q.trim();
      if (parsed.hash) {
        const hashParams = new URLSearchParams(parsed.hash.substring(1));
        const hashQ = hashParams.get('q') || hashParams.get('query');
        if (hashQ && hashQ.trim()) return hashQ.trim();
      }
    } catch {}
    return null;
  };

  const isWrongOrGarbageLink = (linkUrl: string, srcUrl: string): boolean => {
    try {
      const parsed = new URL(linkUrl);
      const host = parsed.hostname.toLowerCase();
      const path = parsed.pathname.toLowerCase();
      const search = parsed.search.toLowerCase();
      const sourceHost = new URL(srcUrl).hostname.toLowerCase();
      const socialMediaPatterns = ['facebook.com', 'twitter.com', 'x.com', 'instagram.com', 'linkedin.com', 'pinterest.com', 'youtube.com', 'youtu.be', 'tiktok.com', 'snapchat.com', 'whatsapp.com', 'reddit.com', 'tumblr.com', 'flickr.com', 'vimeo.com'];
      if (socialMediaPatterns.some((domain) => host.includes(domain)) && !sourceHost.includes(host) && !host.includes(sourceHost)) return true;
      const adPatterns = ['ads.', 'adserver', 'doubleclick', 'googleadservices', 'amazon-adsystem', 'taboola', 'outbrain', 'adsystem', 'affiliate', 'adnxs', 'marketing', 'analytics', 'pixel', 'clktrkr'];
      if (adPatterns.some((pattern) => host.includes(pattern) || path.includes(pattern) || search.includes(pattern))) return true;
      const clutterPatterns = ['/privacy', '/terms', '/cookie', '/contact', '/about-us', '/about/info', '/tos', '/disclaimer', '/help', '/support', '/faq', '/subscribe', '/newsletter', '/login', '/signin', '/signup', '/register', '/cart', '/checkout', '/account', '/profile', '/settings', '/feedback', '/sitemap'];
      if (clutterPatterns.some((pattern) => path === pattern || path.startsWith(pattern + '/') || path.endsWith(pattern))) return true;
      if (host === sourceHost && (path.includes('/search') || search.includes('?s=') || search.includes('&s=') || search.includes('?q=') || search.includes('&q='))) return true;
      const nonScrapableExtensions = ['.zip', '.pdf', '.docx', '.xlsx', '.pptx', '.bin', '.tar', '.gz', '.dmg', '.exe', '.mp3', '.mp4', '.avi', '.mov', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'];
      if (nonScrapableExtensions.some((ext) => path.endsWith(ext))) return true;
    } catch {}
    return false;
  };

  const decodeRedirectUrl = (urlStr: string): string => {
    try {
      const parsed = new URL(urlStr);
      const host = parsed.hostname.toLowerCase();
      if (host.includes('duckduckgo.com') && parsed.searchParams.has('uddg')) return parsed.searchParams.get('uddg') || urlStr;
      if (host.includes('google.') && parsed.pathname === '/url') return parsed.searchParams.get('url') || parsed.searchParams.get('q') || urlStr;
      if (parsed.pathname === '/url' || parsed.pathname === '/redirect') {
        return parsed.searchParams.get('url') || parsed.searchParams.get('q') || parsed.searchParams.get('to') || parsed.searchParams.get('target') || urlStr;
      }
    } catch {}
    return urlStr;
  };

  const checkRobotsTxt = async (targetUrl: string): Promise<{ allowed: boolean; warning?: string }> => {
    try {
      const parsed = new URL(targetUrl);
      const robotsUrl = `${parsed.protocol}//${parsed.host}/robots.txt`;
      const response = await axios.get(robotsUrl, { timeout: 3000, headers: { 'User-Agent': DEFAULT_SCRAPER_UA } });
      if (response.status === 200 && typeof response.data === 'string') {
        const lines = response.data.split('\n');
        let inWildcardAgent = false;
        const pathToCheck = parsed.pathname + parsed.search;
        for (const rawLine of lines) {
          const line = rawLine.trim();
          if (line.toLowerCase().startsWith('user-agent:')) {
            inWildcardAgent = (line.split(':')[1]?.trim() || '') === '*';
          }
          if (inWildcardAgent && line.toLowerCase().startsWith('disallow:')) {
            const rule = line.split(':')[1]?.trim() || '';
            if (rule && pathToCheck.startsWith(rule)) {
              return { allowed: false, warning: `Robots.txt on ${parsed.host} disallows crawling paths matching "${rule}". Proceeded via user override.` };
            }
          }
        }
      }
    } catch {}
    return { allowed: true };
  };

  const buildScrapeResultFromHtml = ({
    html,
    effectiveUrl,
    requestedUrl,
    statusCode,
    selectors,
    extractLinks,
    extractImages,
    extractTables,
    outputFormat,
    robotsWarning,
    strategy,
    engine
  }: any) => {
    const $ = cheerio.load(html || '');
    const effectiveParsedUrl = new URL(effectiveUrl);
    const foundVideos: Array<{ title: string; url: string; type: 'youtube' | 'vimeo' | 'direct' | 'other' }> = [];

    $('iframe').each((_, el) => {
      const srcAttr = $(el).attr('src');
      const titleAttr = $(el).attr('title') || 'Embedded Video';
      if (!srcAttr) return;
      try {
        const absSrc = new URL(srcAttr, effectiveUrl).href;
        if (absSrc.includes('youtube.com/') || absSrc.includes('youtu.be/') || absSrc.includes('youtube-nocookie.com/')) foundVideos.push({ title: titleAttr.trim(), url: absSrc, type: 'youtube' });
        else if (absSrc.includes('vimeo.com/')) foundVideos.push({ title: titleAttr.trim(), url: absSrc, type: 'vimeo' });
        else if (absSrc.endsWith('.mp4') || absSrc.endsWith('.webm') || absSrc.endsWith('.ogg')) foundVideos.push({ title: titleAttr.trim(), url: absSrc, type: 'direct' });
        else if (absSrc.includes('/embed/')) foundVideos.push({ title: titleAttr.trim(), url: absSrc, type: 'other' });
      } catch {}
    });

    $('video').each((_, el) => {
      $(el).find('source').each((_, srcEl) => {
        const src = $(srcEl).attr('src');
        if (!src) return;
        try {
          foundVideos.push({ title: $(el).attr('title') || 'HTML5 Video Source', url: new URL(src, effectiveUrl).href, type: 'direct' });
        } catch {}
      });
      const srcAttr = $(el).attr('src');
      if (srcAttr) {
        try {
          foundVideos.push({ title: $(el).attr('title') || 'HTML5 Video Direct', url: new URL(srcAttr, effectiveUrl).href, type: 'direct' });
        } catch {}
      }
    });

    $('script, style, noscript, iframe, link, svg, video, audio').remove();

    const result: any = {
      url: effectiveUrl,
      requestedUrl,
      title: $('title').text().trim() || $('h1').first().text().trim() || effectiveParsedUrl.hostname,
      statusCode,
      scrapedAt: new Date().toISOString(),
      data: {},
      links: [],
      images: [],
      tables: [],
      videos: Array.from(new Map(foundVideos.map((item) => [item.url, item])).values()).slice(0, 30),
      strategy,
      engine
    };

    if (robotsWarning) result.robotsWarning = robotsWarning;

    if (selectors && typeof selectors === 'object' && Object.keys(selectors).length > 0) {
      const customData: Record<string, any> = {};
      for (const [key, selector] of Object.entries(selectors)) {
        if (typeof selector !== 'string') continue;
        const matches: string[] = [];
        $(selector).each((_, el) => {
          const textVal = $(el).text().trim();
          if (textVal) matches.push(textVal);
        });
        customData[key] = matches.length === 1 ? matches[0] : matches;
      }
      result.data = customData;
    } else {
      const headings: Array<{ level: string; text: string }> = [];
      $('h1, h2, h3, h4').each((_, el) => {
        const txt = $(el).text().trim();
        if (txt) headings.push({ level: el.tagName.toLowerCase(), text: txt });
      });
      const paragraphs: string[] = [];
      $('p').each((_, el) => {
        const txt = $(el).text().trim();
        if (txt && txt.length > 30) paragraphs.push(txt);
      });
      result.data = {
        headings: headings.slice(0, 30),
        paragraphs: paragraphs.slice(0, 50),
        metaDescription: $('meta[name="description"]').attr('content') || ''
      };
    }

    if (extractLinks) {
      const foundLinks = new Set<string>();
      $('a[href]').each((_, el) => {
        const href = $(el).attr('href');
        if (!href) return;
        try {
          let absUrl = new URL(href, effectiveUrl).href;
          absUrl = decodeRedirectUrl(absUrl);
          if (absUrl !== effectiveUrl && !absUrl.includes('#') && !isWrongOrGarbageLink(absUrl, effectiveUrl)) foundLinks.add(absUrl);
        } catch {}
      });
      result.links = Array.from(foundLinks).slice(0, 500);
    }

    if (extractImages) {
      const foundImages = new Set<string>();
      $('img[src]').each((_, el) => {
        const srcAttr = $(el).attr('src');
        if (!srcAttr) return;
        try {
          foundImages.add(new URL(srcAttr, effectiveUrl).href);
        } catch {}
      });
      result.images = Array.from(foundImages).slice(0, 50);
    }

    if (extractTables) {
      const resolvedTables: Array<string[][]> = [];
      $('table').each((_, tableEl) => {
        const currentTable: string[][] = [];
        $(tableEl).find('tr').each((_, rowEl) => {
          const rowData: string[] = [];
          $(rowEl).find('td, th').each((_, cellEl) => {
            rowData.push($(cellEl).text().trim().replace(/\s+/g, ' '));
          });
          if (rowData.length > 0) currentTable.push(rowData);
        });
        if (currentTable.length > 0) resolvedTables.push(currentTable);
      });
      result.tables = resolvedTables.slice(0, 5);
    }

    try {
      const turndownService = new TurndownService({
        headingStyle: 'atx' as const,
        codeBlockStyle: 'fenced' as const,
        bulletListMarker: '-' as const
      });
      turndownService.keep(['table']);
      const bodyContent = $('body').html();
      if (bodyContent) {
        let convertedMarkdown = turndownService.turndown(bodyContent);
        if (convertedMarkdown.length > 50000) convertedMarkdown = convertedMarkdown.slice(0, 50000) + '\n\n... [Content Truncated due to size limit of 50K chars] ...';
        result.rawText = convertedMarkdown;
      }
    } catch {
      result.rawText = $('body').text().slice(0, 50000);
    }

    if (outputFormat === 'markdown') result.formattedOutput = result.rawText;
    else if (outputFormat === 'html') result.formattedOutput = $.html();
    else result.formattedOutput = JSON.stringify(result.data, null, 2);

    return result;
  };

  const resolveScrapeTargetUrl = async (inputUrl: string) => {
    const searchQuery = getSearchQueryIfSearchEngine(inputUrl);
    if (!searchQuery) return inputUrl;
    const ddgResults = await runDuckDuckGoSearch(searchQuery);
    const resultsList = (ddgResults.results || []).filter((r: any) => r.url && !isWrongOrGarbageLink(r.url, inputUrl));
    if (resultsList.length === 0) throw new Error(`Could not resolve the search page into a real website for query: ${searchQuery}`);
    return resultsList[0].url;
  };

  const scrapeStaticPage = async (targetUrl: string) => {
    const response = await axios.get(targetUrl, {
      timeout: 15000,
      headers: getScraperHeaders(),
      maxRedirects: 5,
      responseType: 'arraybuffer'
    });
    const rawData = response.data?.length > 5 * 1024 * 1024 ? response.data.slice(0, 100 * 1024) : response.data;
    return {
      html: rawData.toString('utf8'),
      statusCode: response.status,
      finalUrl: response.request?.res?.responseUrl || targetUrl
    };
  };

  const buildLightpandaCloudCdpUrl = (cloud?: LightpandaCloudConfig) => {
    const region = (cloud?.region && LIGHTPANDA_CLOUD_HOSTS[cloud.region]) ? cloud.region : DEFAULT_LIGHTPANDA_CLOUD_REGION;
    const token = String(cloud?.token || process.env.LIGHTPANDA_CLOUD_TOKEN || '').trim();
    if (!token) {
      throw new Error('Lightpanda Cloud is enabled, but no cloud token was provided.');
    }

    const browser = String(cloud?.browser || DEFAULT_LIGHTPANDA_CLOUD_BROWSER || 'lightpanda').trim() || 'lightpanda';
    const proxy = String(cloud?.proxy || DEFAULT_LIGHTPANDA_CLOUD_PROXY || 'fast_dc').trim() || 'fast_dc';
    const endpoint = new URL(`wss://${LIGHTPANDA_CLOUD_HOSTS[region]}/ws`);
    endpoint.searchParams.set('token', token);
    endpoint.searchParams.set('browser', browser);
    endpoint.searchParams.set('proxy', proxy);
    return endpoint.toString();
  };

  const connectToLightpandaCloud = async (cloud?: LightpandaCloudConfig) => {
    let playwrightMod: any;
    try {
      playwrightMod = await import('playwright-core');
    } catch {
      throw new Error('Dynamic scraping requested, but the "playwright-core" package is not installed.');
    }

    let browser: any = null;
    let cleanup = async () => {};
    const cdpUrl = buildLightpandaCloudCdpUrl(cloud);
    browser = await playwrightMod.chromium.connectOverCDP({ endpointURL: cdpUrl });
    cleanup = async () => {
      try {
        if (browser) await browser.close();
      } catch {}
    };
    return { browser, cdpUrl, engineLabel: 'lightpanda-cloud', cleanup };
  };

  const withLightpandaSession = async <T>(cloud: LightpandaCloudConfig | undefined, fn: (helpers: { browser: any; cdpUrl: string; engineLabel: string }) => Promise<T>) => {
    const session = await connectToLightpandaCloud(cloud);
    let browser: any = null;
    try {
      browser = session.browser;
      return await fn({ browser, cdpUrl: session.cdpUrl, engineLabel: session.engineLabel });
    } finally {
      await session.cleanup();
    }
  };

  const scrapeDynamicPage = async (
    targetUrl: string,
    _engine: BrowserEngine,
    waitForSelector?: string,
    lightpandaCloudConfig?: LightpandaCloudConfig
  ): Promise<{ html: string; statusCode: number; finalUrl: string; cdpUrl: string; engineLabel: string }> =>
    withLightpandaSession(lightpandaCloudConfig, async ({ browser, cdpUrl, engineLabel }) => {
      try {
        const context = await browser.newContext({
          userAgent: DEFAULT_SCRAPER_UA
        });
        const page = await context.newPage();
        const response = await page.goto(targetUrl, { waitUntil: 'networkidle' });
        if (waitForSelector) await page.waitForSelector(waitForSelector, { timeout: 10000 });
        const html = await page.content();
        const finalUrl = page.url();
        await page.close();
        await context.close();
        return {
          html,
          statusCode: response?.status() || 200,
          finalUrl,
          cdpUrl,
          engineLabel,
        };
      } catch (error: any) {
        throw new Error(`Lightpanda CDP session failed at ${cdpUrl}: ${error?.message || 'Unknown error'}`);
      }
    });

  const scrapeWithCrawler = async (
    targetUrl: string,
    useJavaScript: boolean,
    maxPages: number,
    selectors: Record<string, string> | undefined,
    lightpandaCloudConfig?: LightpandaCloudConfig
  ): Promise<{
    url: string;
    requestedUrl: string;
    title: string;
    statusCode: number;
    scrapedAt: string;
    data: { pages: Array<{ pageNumber: number; url: string; title: string; data: any }>; totalPages: number };
    links: any[];
    images: any[];
    tables: any[];
    rawText: string;
    strategy: 'crawl';
    engine: string;
    robotsWarning?: string;
  }> => {
    let crawleeMod: any;
    try {
      crawleeMod = await import('crawlee');
    } catch {
      throw new Error('Crawl scraping requested, but the "crawlee" package is not installed.');
    }

    const pages: any[] = [];
    const requestLimit = Math.min(Math.max(maxPages || 3, 1), 10);

    if (useJavaScript) {
      const { PlaywrightCrawler } = crawleeMod;
      const crawler = new PlaywrightCrawler({
        launchContext: {
          launcher: async () => {
            const session = await connectToLightpandaCloud(lightpandaCloudConfig);
            const browser = session.browser;
            browser.on?.('disconnected', () => {
              void session.cleanup();
            });
            return browser;
          }
        },
        maxRequestsPerCrawl: requestLimit,
        requestHandler: async ({ request, page, enqueueLinks }: any) => {
          pages.push({
            url: page.url(),
            title: await page.title(),
            html: await page.content()
          });
          if (pages.length < requestLimit) {
            await enqueueLinks({ strategy: 'same-domain' });
          }
        }
      });
      await crawler.run([targetUrl]);
    } else {
      const { CheerioCrawler } = crawleeMod;
      const crawler = new CheerioCrawler({
        maxRequestsPerCrawl: requestLimit,
        requestHandler: async ({ request, $, enqueueLinks }: any) => {
          pages.push({
            url: request.loadedUrl || request.url,
            title: $('title').text().trim() || $('h1').first().text().trim() || request.url,
            html: $.html()
          });
          if (pages.length < requestLimit) {
            await enqueueLinks({ strategy: 'same-domain' });
          }
        }
      });
      await crawler.run([targetUrl]);
    }

    const combinedData = pages.map((page, index) => {
      const pageResult = buildScrapeResultFromHtml({
        html: page.html,
        effectiveUrl: page.url,
        requestedUrl: targetUrl,
        statusCode: 200,
        selectors,
        extractLinks: true,
        extractImages: true,
        extractTables: true,
        outputFormat: 'json',
        strategy: 'crawl',
        engine: useJavaScript ? 'lightpanda-cloud' : 'cheerio'
      });
      return {
        pageNumber: index + 1,
        url: page.url,
        title: page.title,
        data: pageResult.data
      };
    });

    return {
      url: targetUrl,
      requestedUrl: targetUrl,
      title: combinedData[0]?.title || targetUrl,
      statusCode: 200,
      scrapedAt: new Date().toISOString(),
      data: {
        pages: combinedData,
        totalPages: combinedData.length
      },
      links: [],
      images: [],
      tables: [],
      rawText: combinedData.map((page: any) => `# ${page.title}\n${JSON.stringify(page.data, null, 2)}`).join('\n\n'),
      strategy: 'crawl',
      engine: useJavaScript ? 'lightpanda-cloud' : 'cheerio'
    };
  };

  app.post("/api/scrape", async (req, res) => {
    const {
      url,
      selectors,
      extractLinks = true,
      extractImages = true,
      extractTables = false,
      outputFormat = 'markdown',
      strategy,
      mode,
      browserEngine,
      waitForSelector,
      useJavaScript,
      maxPages,
      maxDepth,
      lightpanda
    } = req.body;

    if (!url) return res.status(400).json({ error: 'URL is required' });

    try {
      const parsedUrl = new URL(url);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) return res.status(400).json({ error: 'Only HTTP/HTTPS URLs are supported.' });
      if (isPrivateHostname(parsedUrl.hostname)) return res.status(403).json({ error: 'Security Exception: Requests to local or private IP spaces are forbidden.' });
      if (selectors && typeof selectors === 'object' && containsSuspiciousSelector(selectors)) return res.status(400).json({ error: 'Security Exception: Suspicious selector payload detected.' });

      const scrapeTargetUrl = await resolveScrapeTargetUrl(url);
      const robotsCheck = await checkRobotsTxt(scrapeTargetUrl);
      const selectedStrategy: ScrapeStrategy =
        strategy || mode || (maxPages || maxDepth ? 'crawl' : (useJavaScript ? 'dynamic' : 'static'));
      const selectedEngine: BrowserEngine = 'lightpanda';
      const lightpandaCloudConfig = lightpanda?.cloud;

      if (selectedStrategy === 'crawl') {
        const crawlResult = await scrapeWithCrawler(
          scrapeTargetUrl,
          Boolean(useJavaScript),
          Number(maxPages || maxDepth || 3),
          selectors,
          lightpandaCloudConfig
        );
        if (robotsCheck.warning) crawlResult.robotsWarning = robotsCheck.warning;
        return res.json(crawlResult);
      }

      const source: { html: string; statusCode: number; finalUrl: string; engineLabel?: string } =
        selectedStrategy === 'dynamic'
          ? await scrapeDynamicPage(scrapeTargetUrl, selectedEngine, waitForSelector, lightpandaCloudConfig)
          : await scrapeStaticPage(scrapeTargetUrl);

      const result = buildScrapeResultFromHtml({
        html: source.html,
        effectiveUrl: source.finalUrl || scrapeTargetUrl,
        requestedUrl: url,
        statusCode: source.statusCode || 200,
        selectors,
        extractLinks,
        extractImages,
        extractTables,
        outputFormat,
        robotsWarning: robotsCheck.warning,
        strategy: selectedStrategy,
        engine: selectedStrategy === 'static' ? 'axios+cheerio' : (source.engineLabel || selectedEngine)
      });

      return res.json(result);
    } catch (e: any) {
      console.error('Operational error on server scrap request:', e);
      const msg = String(e?.message || 'Unknown scraping failure');
      if (msg.includes('not installed')) return res.status(501).json({ error: msg });
      if (e?.code === 'ECONNABORTED' || msg.toLowerCase().includes('timeout')) return res.status(504).json({ error: 'Timeout while scraping the target webpage.' });
      if (e?.response?.status) return res.status(e.response.status).json({ error: e.response?.data?.error || msg });
      return res.status(500).json({ error: `Server Scraping Failure: ${msg}` });
    }
  });

  // Llama Bridge proxy endpoints
  app.get("/api/bridge/health", async (req, res) => {
    const bridgeUrl = req.headers['x-bridge-url'] as string || 'http://localhost:8089';
    const apiKey = req.headers['x-api-key'] as string || '';
    try {
      const headers: Record<string, string> = {};
      if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
      const response = await axios.get(`${bridgeUrl}/health`, { headers, timeout: 5000 });
      res.json(response.data);
    } catch (e: any) {
      res.status(502).json({ error: 'Could not reach Llama Bridge', detail: e.message });
    }
  });

  // Proxy: list tools from Llama Bridge
  app.post("/api/bridge/tools", async (req, res) => {
    const { bridgeUrl, apiKey, model } = req.body;
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
      
      // Send a probe request to let the bridge return its available tools
      const response = await axios.post(
        `${bridgeUrl}/v1/chat/completions`,
        {
          model: model || 'auto',
          messages: [{ role: 'user', content: '__tools_probe__' }],
          max_tokens: 1,
          _probe_tools: true
        },
        { headers, timeout: 8000 }
      );
      
      // Extract tool definitions from the response
      const tools = response.data?.tools || [];
      res.json({ tools, connected: true });
    } catch (e: any) {
      // Fallback: try direct tool listing
      try {
        const response = await axios.get(`${bridgeUrl}/v1/tools`, { timeout: 5000 });
        res.json({ tools: response.data?.tools || response.data?.data || [], connected: true });
      } catch (e2: any) {
        res.status(502).json({ error: 'Could not reach Llama Bridge', detail: e.message });
      }
    }
  });

  // Proxy: list models from Llama Bridge
  app.get("/api/bridge/models", async (req, res) => {
    const bridgeUrl = req.headers['x-bridge-url'] as string || 'http://localhost:8089';
    const apiKey = req.headers['x-api-key'] as string || '';
    try {
      const headers: Record<string, string> = {};
      if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
      const response = await axios.get(`${bridgeUrl}/v1/models`, { headers, timeout: 5000 });
      res.json(response.data);
    } catch (e: any) {
      res.status(502).json({ error: 'Could not fetch models', detail: e.message });
    }
  });

  // Universal model listing proxy: fetch models from any OpenAI-compatible endpoint server-side to avoid CORS
  app.post("/api/provider/models", async (req, res) => {
    const { endpoint, apiKey } = req.body;
    if (!endpoint) {
      return res.status(400).json({ error: "endpoint is required" });
    }
    try {
      const url = endpoint.replace(/\/+$/, '');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

      // Most OpenAI-compatible endpoints expose /models or /v1/models
      let models: any[] = [];
      let triedPaths: string[] = [];

      const tryFetch = async (path: string): Promise<boolean> => {
        triedPaths.push(path);
        try {
          const response = await axios.get(path, { headers, timeout: 10000 });
          if (response.status === 200) {
            const data = response.data;
            const list = data.data || data.models || [];
            if (Array.isArray(list) && list.length > 0) {
              models = list.map((m: any) => ({
                id: m.id,
                name: m.display_name || m.name || m.id,
              }));
              return true;
            }
          }
        } catch {}
        return false;
      };

      // Try multiple common paths: /models, /v1/models, /api/models
      const pathsToTry = [
        `${url}/models`,
        `${url}/v1/models`,
        `${url}/api/models`,
      ];

      for (const path of pathsToTry) {
        if (await tryFetch(path)) break;
        await new Promise(r => setTimeout(r, 300));
      }

      if (models.length > 0) {
        res.json({ success: true, models });
      } else {
        // If all paths failed, try the health endpoint to at least verify connectivity
        const healthPaths = [`${url}/health`, `${url}/v1/health`, `${url}/api/health`];
        let reached = false;
        for (const hp of healthPaths) {
          try {
            const hr = await axios.get(hp, { headers, timeout: 5000 });
            if (hr.status === 200) { reached = true; break; }
          } catch {}
        }
        if (reached) {
          res.json({ success: true, models: [], message: 'Connected but no models endpoint found. Enter model name manually.' });
        } else {
          res.status(502).json({ error: 'Could not reach provider endpoint', triedPaths });
        }
      }
    } catch (e: any) {
      res.status(502).json({ error: 'Provider request failed', detail: e.message });
    }
  });

  // Universal verification proxy: checks if an endpoint responds with valid auth
  app.post("/api/provider/verify", async (req, res) => {
    const { endpoint, apiKey, provider: providerType } = req.body;
    if (!endpoint) {
      return res.status(400).json({ error: "endpoint is required" });
    }
    try {
      const url = endpoint.replace(/\/+$/, '');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };

      const isOpenCode = providerType === 'opencode' || url.includes('opencode.ai');
      if (apiKey) {
        if (isOpenCode) {
          headers['x-api-key'] = apiKey;
        } else {
          headers['Authorization'] = `Bearer ${apiKey}`;
        }
      }

      // Try fetching models to verify connectivity + auth
      const pathsToTry = [
        `${url}/models`,
        `${url}/v1/models`,
        `${url}/api/models`,
      ];

      let verified = false;
      let responseData: any = null;
      for (const path of pathsToTry) {
        try {
          const response = await axios.get(path, { headers, timeout: 10000 });
          if (response.status === 200) {
            verified = true;
            responseData = response.data;
            break;
          }
        } catch {}
      }

      // If models paths fail, try health
      if (!verified) {
        const healthPaths = [`${url}/health`, `${url}/v1/health`, `${url}/api/health`];
        for (const hp of healthPaths) {
          try {
            const hr = await axios.get(hp, { headers, timeout: 5000 });
            if (hr.status === 200) { verified = true; break; }
          } catch {}
        }
      }

      if (verified) {
        res.json({ success: true, message: 'Connection verified', data: responseData });
      } else {
        res.status(502).json({ error: 'Could not verify connection', message: 'Endpoint is unreachable or API key is invalid' });
      }
    } catch (e: any) {
      res.status(502).json({ error: 'Verification failed', detail: e.message });
    }
  });

  // Search API key verification proxy
  app.post("/api/provider/verify-search", async (req, res) => {
    const { provider: searchProvider, apiKey } = req.body;
    if (!apiKey) {
      return res.status(400).json({ error: "API key is required" });
    }
    try {
      if (searchProvider === 'serpapi') {
        const response = await axios.post('https://google.serper.dev/search', { q: 'test', num: 1 }, {
          headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
          timeout: 10000
        });
        if (response.status === 200) {
          return res.json({ success: true, message: 'SerpAPI key verified' });
        }
      } else {
        // Tavily
        const response = await axios.post('https://api.tavily.com/search', {
          api_key: apiKey,
          query: 'test',
          search_depth: 'basic',
          include_answer: false,
          include_raw_content: false,
          max_results: 1
        }, { timeout: 10000 });
        if (response.status === 200) {
          return res.json({ success: true, message: 'Tavily key verified' });
        }
      }
      res.status(502).json({ error: 'Verification failed', message: 'API key is invalid' });
    } catch (e: any) {
      res.status(502).json({ error: 'Verification failed', detail: e.message });
    }
  });

  // Proxy: chat completions to Llama Bridge
  app.post("/api/bridge/chat", async (req, res) => {
    const { bridgeUrl, apiKey, model, messages, tools, stream } = req.body;
    if (!bridgeUrl || !messages) {
      return res.status(400).json({ error: "bridgeUrl and messages are required" });
    }
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
      const body: Record<string, any> = { model, messages, stream: !!stream };

      // Debug: log content types in messages
      const hasArrayContent = Array.isArray(messages) && messages.some((m: any) => Array.isArray(m.content));
      console.log('[LUMINA_DEBUG] /api/bridge/chat received messages with array content:', hasArrayContent);
      if (hasArrayContent) {
        const visionMsg = messages.find((m: any) => Array.isArray(m.content));
        if (visionMsg) {
          console.log('[LUMINA_DEBUG] Bridge proxy content types:', visionMsg.content.map((c: any) => c.type));
          const imgPart = visionMsg.content.find((c: any) => c.type === 'image_url');
          if (imgPart) {
            console.log('[LUMINA_DEBUG] Image URL length:', imgPart.image_url?.url?.length || 0);
            console.log('[LUMINA_DEBUG] Image URL prefix:', (imgPart.image_url?.url || '').substring(0, 60));
          }
        }
      }
      console.log('[LUMINA_DEBUG] Forwarding to:', `${bridgeUrl}/v1/chat/completions`);

      if (tools && tools.length > 0) {
        body.tools = tools;
        body.tool_choice = 'auto';
      }
      let response;
      try {
        response = await axios.post(`${bridgeUrl}/v1/chat/completions`, body, { headers, timeout: 30000 });
      } catch (toolChoiceError: any) {
        const upstreamDetail = JSON.stringify(toolChoiceError.response?.data || '').toLowerCase();
        const canRetryWithoutToolChoice = body.tool_choice && (
          upstreamDetail.includes('tool_choice') ||
          upstreamDetail.includes('unsupported') ||
          upstreamDetail.includes('extra_forbidden') ||
          upstreamDetail.includes('unrecognized')
        );
        if (!canRetryWithoutToolChoice) throw toolChoiceError;

        const retryBody = { ...body };
        delete retryBody.tool_choice;
        response = await axios.post(`${bridgeUrl}/v1/chat/completions`, retryBody, { headers, timeout: 30000 });
      }
      res.json(response.data);
    } catch (e: any) {
      const detail = getUpstreamErrorDetail(e);
      res.status(getUpstreamErrorStatus(e)).json({ error: 'Bridge chat failed', detail });
    }
  });

  // Proxy: connect to a remote MCP server
  app.post("/api/mcp/connect", async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "URL required" });
    
    try {
      // Try standard MCP tool listing endpoint (JSON-RPC over HTTP)
      const response = await axios.post(url, {
        jsonrpc: '2.0',
        method: 'tools/list',
        params: {},
        id: 1
      }, { 
        timeout: 8000,
        headers: { 'Content-Type': 'application/json' }
      });
      
      const tools = response.data?.result?.tools || [];
      res.json({ tools, connected: true });
    } catch (e: any) {
      res.status(502).json({ error: 'Could not connect to MCP server', detail: e.message });
    }
  });

  // Helper to list files recursively
  function getFilesRecursively(dir: string, baseDir: string = dir): any[] {
    let results: any[] = [];
    try {
      if (!fs.existsSync(dir)) return [];
      const list = fs.readdirSync(dir, { withFileTypes: true });
      for (const file of list) {
        const name = file.name;
        // Skip common dependency folders, builds, and dot folders
        if (
          name === 'node_modules' || 
          name === '.git' || 
          name === 'dist' || 
          name === '.next' || 
          name === '.svelte-kit' ||
          name === '.github' ||
          name === 'package-lock.json' ||
          name === 'yarn.lock' ||
          name === 'pnpm-lock.yaml'
        ) {
          continue;
        }
        const fullPath = path.join(dir, name);
        const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
        const isDirectory = file.isDirectory();
        
        results.push({
          name,
          path: fullPath.replace(/\\/g, '/'),
          relativePath,
          isDirectory,
        });

        if (isDirectory) {
          results = results.concat(getFilesRecursively(fullPath, baseDir));
        }
      }
    } catch (error) {
      console.error(`Error scanning directory: ${dir}`, error);
    }
    return results;
  }

  const escapeGlobRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const globToRegExp = (pattern: string) => {
    const normalized = String(pattern || '')
      .replace(/\\/g, '/')
      .trim()
      .replace(/^\.\//, '');

    if (!normalized) return null;

    let regex = '';
    for (let i = 0; i < normalized.length; i += 1) {
      const char = normalized[i];
      const next = normalized[i + 1];

      if (char === '*' && next === '*') {
        const afterNext = normalized[i + 2];
        if (afterNext === '/') {
          regex += '(?:.*/)?';
          i += 2;
        } else {
          regex += '.*';
          i += 1;
        }
        continue;
      }

      if (char === '*') {
        regex += '[^/]*';
        continue;
      }

      if (char === '?') {
        regex += '[^/]';
        continue;
      }

      regex += escapeGlobRegex(char);
    }

    return new RegExp(`^${regex}$`, 'i');
  };

  const matchesWorkspaceGlob = (filePath: string, pattern: string) => {
    const normalizedPath = String(filePath || '').replace(/\\/g, '/').replace(/^\/+/, '');
    const normalizedPattern = String(pattern || '').replace(/\\/g, '/').trim();

    if (!normalizedPattern) return true;

    const regex = globToRegExp(normalizedPattern);
    if (!regex) return true;

    return regex.test(normalizedPath);
  };

  const resolveCoderPath = (inputPath?: string, workspaceRoot?: string) => {
    const raw = (inputPath || '').trim();
    const base = workspaceRoot || process.cwd();
    if (!raw || raw === '.') {
      return path.resolve(base);
    }
    const normalized = raw.replace(/\\/g, '/');
    const isAbsolute = path.isAbsolute(raw) || /^[a-zA-Z]:[\\/]/.test(raw) || raw.startsWith('\\\\');
    if (isAbsolute) {
      return path.resolve(raw);
    }
    const withoutDot = normalized.replace(/^\.\/+/, '').replace(/^\/+/, '');
    return path.resolve(base, withoutDot);
  };

  const ensureGitPresentAndInitialized = (targetDir: string) => {
    try {
      const { execSync } = require('child_process');
      // Verify if git command is installed and present
      try {
        execSync('git --version', { stdio: 'ignore' });
      } catch {
        // Git is not present on the device, do nothing
        return false;
      }

      // Check if targetDir is already a git workspace
      let isGit = true;
      try {
        execSync('git rev-parse --is-inside-work-tree', { cwd: targetDir, stdio: 'ignore' });
      } catch {
        isGit = false;
      }

      if (!isGit) {
        console.log(`[LUMINA_DEBUG] Initializing Git repository in: ${targetDir}`);
        execSync('git init', { cwd: targetDir });
        try {
          execSync('git config user.name "Lumina User"', { cwd: targetDir });
          execSync('git config user.email "user@lumina.local"', { cwd: targetDir });
        } catch {
          // Ignore config set failures
        }
        return true;
      }
    } catch (err: any) {
      console.error('[LUMINA_DEBUG] Git init failed:', err.message);
    }
    return false;
  };

  const fileExists = (filePath: string) => fs.existsSync(filePath);

  const readJsonFile = (filePath: string) => {
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch {
      return null;
    }
  };

  type WorkspaceChangeRecord = {
    filePath: string;
    fileName: string;
    folder: string;
    status: 'modified' | 'added' | 'deleted';
    added: number;
    removed: number;
    oldContent: string;
    newContent: string;
  };

  const workspaceChangeLedger = new Map<string, Map<string, WorkspaceChangeRecord>>();

  const normalizeWorkspaceKey = (workspaceRoot?: string) =>
    path.resolve(workspaceRoot || process.cwd()).replace(/\\/g, '/').toLowerCase();

  const toWorkspaceRelativePath = (absolutePath: string, workspaceRoot?: string) => {
    const root = path.resolve(workspaceRoot || process.cwd());
    const rel = path.relative(root, absolutePath);
    return (!rel || rel.startsWith('..') || path.isAbsolute(rel) ? path.basename(absolutePath) : rel).replace(/\\/g, '/');
  };

  const countChangedLines = (oldContent: string, newContent: string) => {
    const oldLines = oldContent ? oldContent.split('\n') : [];
    const newLines = newContent ? newContent.split('\n') : [];
    let commonPrefix = 0;
    while (
      commonPrefix < oldLines.length &&
      commonPrefix < newLines.length &&
      oldLines[commonPrefix] === newLines[commonPrefix]
    ) {
      commonPrefix++;
    }
    let oldSuffix = oldLines.length - 1;
    let newSuffix = newLines.length - 1;
    while (
      oldSuffix >= commonPrefix &&
      newSuffix >= commonPrefix &&
      oldLines[oldSuffix] === newLines[newSuffix]
    ) {
      oldSuffix--;
      newSuffix--;
    }
    return {
      added: Math.max(0, newSuffix - commonPrefix + 1),
      removed: Math.max(0, oldSuffix - commonPrefix + 1)
    };
  };

  const buildLedgerDiff = (record: WorkspaceChangeRecord) => {
    const oldLines = record.oldContent ? record.oldContent.split('\n') : [];
    const newLines = record.newContent ? record.newContent.split('\n') : [];
    return [
      `--- a/${record.filePath}`,
      `+++ b/${record.filePath}`,
      `@@ -1,${Math.max(oldLines.length, 1)} +1,${Math.max(newLines.length, 1)} @@`,
      ...oldLines.map(line => `-${line}`),
      ...newLines.map(line => `+${line}`)
    ].join('\n');
  };

  const recordWorkspaceChange = (absolutePath: string, workspaceRoot: string | undefined, oldContent: string, newContent: string, forcedStatus?: WorkspaceChangeRecord['status']) => {
    const filePath = toWorkspaceRelativePath(absolutePath, workspaceRoot);
    const workspaceKey = normalizeWorkspaceKey(workspaceRoot);
    const lastSlash = filePath.lastIndexOf('/');
    const fileName = lastSlash !== -1 ? filePath.substring(lastSlash + 1) : filePath;
    const folder = lastSlash !== -1 ? filePath.substring(0, lastSlash) : '/';
    const changedLines = countChangedLines(oldContent, newContent);
    const status = forcedStatus || (!oldContent ? 'added' : 'modified');
    const workspaceChanges = workspaceChangeLedger.get(workspaceKey) || new Map<string, WorkspaceChangeRecord>();

    workspaceChanges.set(filePath, {
      filePath,
      fileName,
      folder,
      status,
      added: status === 'deleted' ? 0 : changedLines.added,
      removed: status === 'added' ? 0 : changedLines.removed,
      oldContent,
      newContent
    });
    workspaceChangeLedger.set(workspaceKey, workspaceChanges);
  };

  // Filesystem Listing Endpoints
  app.post("/api/fs/list", (req, res) => {
    const { folderPath, workspaceRoot } = req.body;
    
    const resolvedPath = resolveCoderPath(folderPath, workspaceRoot);
    if (!fs.existsSync(resolvedPath)) {
      return res.status(404).json({ error: "Directory not found" });
    }
    
    // Auto-init git repository if git is installed on host and repo is not yet initialized
    try {
      const targetWorkspace = workspaceRoot ? path.resolve(workspaceRoot) : resolvedPath;
      ensureGitPresentAndInitialized(targetWorkspace);
    } catch (gitErr: any) {
      console.warn('[LUMINA_DEBUG] Auto git init during list failed:', gitErr.message);
    }

    const files = getFilesRecursively(resolvedPath);
    res.json({ files, rootPath: resolvedPath.replace(/\\/g, '/') });
  });

  app.post("/api/fs/read", (req, res) => {
    const { filePath, workspaceRoot, offset, limit } = req.body;
    if (!filePath) {
      return res.status(400).json({ error: "filePath is required" });
    }
    
    const resolvedPath = resolveCoderPath(filePath, workspaceRoot);
    if (!fs.existsSync(resolvedPath)) {
      return res.status(404).json({ error: "File not found", filePath: resolvedPath.replace(/\\/g, '/') });
    }
    if (fs.statSync(resolvedPath).isDirectory()) {
      return res.status(400).json({ error: "Cannot read a directory as a file", filePath: resolvedPath.replace(/\\/g, '/') });
    }
    try {
      const fullContent = fs.readFileSync(resolvedPath, 'utf8');
      const lines = fullContent.split('\n');
      const totalLines = lines.length;
      if (offset !== undefined) {
        const start = Math.max(0, (Number(offset) || 1) - 1);
        const count = limit !== undefined ? Math.max(1, Number(limit) || 1) : totalLines - start;
        const selected = lines.slice(start, start + count);
        res.json({
          content: selected.join('\n'),
          filePath: resolvedPath.replace(/\\/g, '/'),
          name: path.basename(resolvedPath),
          offset: start + 1,
          limit: selected.length,
          totalLines
        });
      } else {
        res.json({ content: fullContent, filePath: resolvedPath.replace(/\\/g, '/'), name: path.basename(resolvedPath), totalLines });
      }
    } catch (e: any) {
      res.status(500).json({ error: "Failed to read file", detail: e.message });
    }
  });

  app.get("/api/fs/raw", (req, res) => {
    const { filePath } = req.query;
    if (!filePath || typeof filePath !== 'string') {
      return res.status(400).send("filePath is required");
    }
    const resolvedPath = resolveCoderPath(filePath);
    if (!fs.existsSync(resolvedPath)) {
      return res.status(404).send("File not found");
    }
    try {
      res.sendFile(resolvedPath);
    } catch (e: any) {
      res.status(500).send("Error reading file");
    }
  });

  app.post("/api/fs/write", (req, res) => {
    const { filePath, content, workspaceRoot } = req.body;
    if (!filePath || content === undefined) {
      return res.status(400).json({ error: "filePath and content are required" });
    }
    
    const resolvedPath = resolveCoderPath(filePath, workspaceRoot);
    try {
      const existed = fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isFile();
      const oldContent = existed ? fs.readFileSync(resolvedPath, 'utf8') : '';
      fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
      fs.writeFileSync(resolvedPath, content, 'utf8');
      recordWorkspaceChange(resolvedPath, workspaceRoot, oldContent, String(content), existed ? 'modified' : 'added');
      res.json({ success: true, filePath: resolvedPath.replace(/\\/g, '/') });
    } catch (e: any) {
      res.status(500).json({ error: "Failed to write file", detail: e.message });
    }
  });

  app.post("/api/fs/create", (req, res) => {
    const { filePath, isDirectory, workspaceRoot, content } = req.body;
    if (!filePath) {
      return res.status(400).json({ error: "filePath is required" });
    }
    
    const resolvedPath = resolveCoderPath(filePath, workspaceRoot);
    try {
      if (isDirectory) {
        fs.mkdirSync(resolvedPath, { recursive: true });
       } else {
        const existed = fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isFile();
        const oldContent = existed ? fs.readFileSync(resolvedPath, 'utf8') : '';
        const nextContent = content !== undefined ? String(content) : '';
        fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
        fs.writeFileSync(resolvedPath, nextContent, 'utf8');
        recordWorkspaceChange(resolvedPath, workspaceRoot, oldContent, nextContent, existed ? 'modified' : 'added');
      }
      res.json({ success: true, filePath: resolvedPath.replace(/\\/g, '/') });
    } catch (e: any) {
      res.status(500).json({ error: "Failed to create", detail: e.message });
    }
  });

  app.post("/api/fs/delete", (req, res) => {
    const { filePath, workspaceRoot } = req.body;
    if (!filePath) {
      return res.status(400).json({ error: "filePath is required" });
    }
    
    const resolvedPath = resolveCoderPath(filePath, workspaceRoot);
    if (!fs.existsSync(resolvedPath)) {
      return res.status(404).json({ error: "File or directory not found" });
    }
    try {
      const oldContent = fs.statSync(resolvedPath).isFile() ? fs.readFileSync(resolvedPath, 'utf8') : '';
      if (fs.statSync(resolvedPath).isDirectory()) {
        fs.rmSync(resolvedPath, { recursive: true, force: true });
      } else {
        fs.unlinkSync(resolvedPath);
      }
      recordWorkspaceChange(resolvedPath, workspaceRoot, oldContent, '', 'deleted');
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: "Failed to delete", detail: e.message });
    }
  });

  // Rename/move files and folders atomically
  app.post("/api/fs/move", (req, res) => {
    const { oldPath, newPath } = req.body;
    if (!oldPath || !newPath) {
      return res.status(400).json({ error: "oldPath and newPath are required" });
    }
    
    const resolvedOld = path.resolve(oldPath);
    const resolvedNew = path.resolve(newPath);
    try {
      if (!fs.existsSync(resolvedOld)) {
        return res.status(404).json({ error: "Source path not found" });
      }
      fs.mkdirSync(path.dirname(resolvedNew), { recursive: true });
      fs.renameSync(resolvedOld, resolvedNew);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: "Failed to move or rename", detail: e.message });
    }
  });

  app.post("/api/git/changes", (req, res) => {
    const _initTarget = req.body.workspaceRoot ? path.resolve(req.body.workspaceRoot) : process.cwd();
    try {
      ensureGitPresentAndInitialized(_initTarget);
    } catch (_) {}
    const { workspaceRoot } = req.body;
    const targetDir = workspaceRoot ? path.resolve(workspaceRoot) : process.cwd();
    
    try {
      const { execSync } = require('child_process');
      let isGit = true;
      try {
        execSync('git rev-parse --is-inside-work-tree', { cwd: targetDir, stdio: 'ignore' });
      } catch {
        isGit = false;
      }

      if (!isGit) {
        const ledgerChanges = Array.from((workspaceChangeLedger.get(normalizeWorkspaceKey(targetDir)) || new Map()).values())
          .map(({ oldContent, newContent, ...change }) => change);
        return res.json({ success: true, changes: ledgerChanges, source: 'workspace-ledger' });
      }

      const statusOutput = execSync('git status --porcelain', { cwd: targetDir, encoding: 'utf8' });
      const lines = statusOutput.split('\n').filter(Boolean);
      
      let numstatMap = new Map<string, { added: number, removed: number }>();
      try {
        const numstatOutput = execSync('git diff --numstat', { cwd: targetDir, encoding: 'utf8' });
        numstatOutput.split('\n').filter(Boolean).forEach((line: string) => {
          const parts = line.trim().split(/\s+/);
          if (parts.length >= 3) {
            const added = parseInt(parts[0], 10) || 0;
            const removed = parseInt(parts[1], 10) || 0;
            const file = parts[2];
            numstatMap.set(file.replace(/\\/g, '/'), { added, removed });
          }
        });
      } catch (err) {
        console.warn('git diff --numstat failed:', err);
      }

      const changes = lines.map((line: string) => {
        const status = line.substring(0, 2);
        const filePath = line.substring(3).trim().replace(/"/g, '');
        const normPath = filePath.replace(/\\/g, '/');
        
        let fileStatus: 'modified' | 'added' | 'deleted' = 'modified';
        let added = 0;
        let removed = 0;
        
        if (status.includes('M')) {
          fileStatus = 'modified';
          const stats = numstatMap.get(normPath);
          if (stats) {
            added = stats.added;
            removed = stats.removed;
          }
        } else if (status.includes('A') || status.includes('?')) {
          fileStatus = 'added';
          const fullPath = path.join(targetDir, normPath);
          if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
            try {
              const content = fs.readFileSync(fullPath, 'utf8');
              added = content.split('\n').length;
            } catch {
              added = 0;
            }
          }
        } else if (status.includes('D')) {
          fileStatus = 'deleted';
          const stats = numstatMap.get(normPath);
          if (stats) {
            removed = stats.removed;
          }
        }
        
        const lastSlash = normPath.lastIndexOf('/');
        const fileName = lastSlash !== -1 ? normPath.substring(lastSlash + 1) : normPath;
        const folder = lastSlash !== -1 ? normPath.substring(0, lastSlash) : '/';
        
        return {
          filePath: normPath,
          fileName,
          folder,
          status: fileStatus,
          added,
          removed
        };
      });
      
      const ledgerChanges = Array.from((workspaceChangeLedger.get(normalizeWorkspaceKey(targetDir)) || new Map()).values())
        .filter(change => !changes.some((gitChange: { filePath: string }) => gitChange.filePath === change.filePath))
        .map(({ oldContent, newContent, ...change }) => change);

      res.json({ success: true, changes: [...changes, ...ledgerChanges], source: 'git' });
    } catch (e: any) {
      res.status(500).json({ error: "Failed to get git changes", detail: e.message });
    }
  });

  app.post("/api/git/diff", (req, res) => {
    const _initTarget = req.body.workspaceRoot ? path.resolve(req.body.workspaceRoot) : process.cwd();
    try {
      ensureGitPresentAndInitialized(_initTarget);
    } catch (_) {}
    const { filePath, workspaceRoot } = req.body;
    if (!filePath) {
      return res.status(400).json({ error: "filePath is required" });
    }
    const targetDir = workspaceRoot ? path.resolve(workspaceRoot) : process.cwd();
    const fullPath = path.resolve(targetDir, filePath);
    
    try {
      const { execSync } = require('child_process');
      let diffOutput = '';
      const ledgerRecord = workspaceChangeLedger.get(normalizeWorkspaceKey(targetDir))?.get(filePath.replace(/\\/g, '/'));
      
      let isUntracked = false;
      try {
        const statusOutput = execSync(`git status --porcelain "${filePath}"`, { cwd: targetDir, encoding: 'utf8' });
        isUntracked = statusOutput.startsWith('??');
      } catch {
        // ignore
      }
      
      if (isUntracked) {
        if (fs.existsSync(fullPath)) {
          const content = fs.readFileSync(fullPath, 'utf8');
          const lines = content.split('\n');
          diffOutput = [
            `--- /dev/null`,
            `+++ b/${filePath}`,
            `@@ -0,0 +1,${lines.length} @@`,
            ...lines.map(l => `+${l}`)
          ].join('\n');
        }
      } else {
        try {
          diffOutput = execSync(`git diff --unified=3 -- "${filePath}"`, { cwd: targetDir, encoding: 'utf8' });
          if (!diffOutput.trim()) {
            diffOutput = execSync(`git diff --cached --unified=3 -- "${filePath}"`, { cwd: targetDir, encoding: 'utf8' });
          }
        } catch {
          if (fs.existsSync(fullPath)) {
            const content = fs.readFileSync(fullPath, 'utf8');
            const lines = content.split('\n');
            diffOutput = [
              `--- a/${filePath}`,
              `+++ b/${filePath}`,
              `@@ -0,0 +1,${lines.length} @@`,
              ...lines.map(l => `+${l}`)
            ].join('\n');
          }
        }
      }

      if (!diffOutput.trim() && ledgerRecord) {
        diffOutput = buildLedgerDiff(ledgerRecord);
      }
      
      res.json({ success: true, diff: diffOutput });
    } catch (e: any) {
      res.status(500).json({ error: "Failed to get git diff", detail: e.message });
    }
  });

  // Provision dummy/demo workspace folder in coder mode
  app.post("/api/fs/create-demo", (req, res) => {
    try {
      const demoDir = path.resolve(process.cwd(), 'demo-workspace');
      if (!fs.existsSync(demoDir)) {
        fs.mkdirSync(demoDir, { recursive: true });
      }
      
      const srcDir = path.join(demoDir, 'src');
      if (!fs.existsSync(srcDir)) {
        fs.mkdirSync(srcDir, { recursive: true });
      }

      // Write .gitignore
      fs.writeFileSync(path.join(demoDir, '.gitignore'), `node_modules/\ndist/\n.DS_Store\n`, 'utf8');

      // Write package.json
      const pkg = {
        name: "demo-workspace",
        version: "1.0.0",
        description: "Lumina Coder Demo Workspace",
        scripts: {
          dev: "vite",
          build: "tsc && vite build"
        },
        dependencies: {
          react: "^18.2.0",
          "react-dom": "^18.2.0"
        },
        devDependencies: {
          vite: "^5.0.0",
          typescript: "^5.0.0",
          "@types/react": "^18.2.0",
          "@types/react-dom": "^18.2.0"
        }
      };
      fs.writeFileSync(path.join(demoDir, 'package.json'), JSON.stringify(pkg, null, 2), 'utf8');

      // Write index.html
      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Lumina Coder Demo</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>`;
      fs.writeFileSync(path.join(demoDir, 'index.html'), html, 'utf8');

      // Write App.tsx
      const appTsx = `import React, { useState } from 'react';

export default function App() {
  const [count, setCount] = useState(0);

  return (
    <div style={{ padding: '32px', fontFamily: 'system-ui, sans-serif', maxWidth: '600px', margin: '0 auto' }}>
      <h1 style={{ color: '#D97756', fontSize: '28px' }}>Welcome to Lumina Coder Demo!</h1>
      <p style={{ color: '#aaa', lineHeight: '1.6' }}>This is a live workspace created to test real-time code changes, file status logs, and Git integration.</p>
      
      <div style={{ marginTop: '24px', padding: '16px', backgroundColor: '#1b1b1e', borderRadius: '12px', border: '1px solid #2d2d30' }}>
        <p style={{ margin: '0 0 16px 0' }}>Click the button below to test interactivity:</p>
        <button 
          onClick={() => setCount(prev => prev + 1)}
          style={{
            backgroundColor: '#D97756',
            color: '#fff',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          Clicks: {count}
        </button>
      </div>

      <div style={{ marginTop: '32px', fontSize: '12px', color: '#666' }}>
        Try editing <code>src/App.tsx</code> to see live-preview auto-reload in action!
      </div>
    </div>
  );
}`;
      fs.writeFileSync(path.join(srcDir, 'App.tsx'), appTsx, 'utf8');

      // Write index.css
      const css = `body {
  margin: 0;
  background-color: #0d0c0c;
  color: #f3f3f3;
  -webkit-font-smoothing: antialiased;
}`;
      fs.writeFileSync(path.join(srcDir, 'index.css'), css, 'utf8');

      // Write main.tsx
      const mainTsx = `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`;
      fs.writeFileSync(path.join(srcDir, 'main.tsx'), mainTsx, 'utf8');

      // Run git init, git add, and initial commit
      try {
        const { execSync } = require('child_process');
        execSync('git --version', { stdio: 'ignore' });
        
        let isGit = true;
        try {
          execSync('git rev-parse --is-inside-work-tree', { cwd: demoDir, stdio: 'ignore' });
        } catch {
          isGit = false;
        }

        if (!isGit) {
          execSync('git init', { cwd: demoDir });
          try {
            execSync('git config user.name "Lumina User"', { cwd: demoDir });
            execSync('git config user.email "user@lumina.local"', { cwd: demoDir });
          } catch (_) {}
          execSync('git add .', { cwd: demoDir });
          execSync('git commit -m "Initial commit of Lumina Coder Demo"', { cwd: demoDir });
        }
      } catch (gitErr: any) {
        console.warn('[LUMINA_DEBUG] Git init in demo creation failed:', gitErr.message);
      }

      res.json({ success: true, folderPath: demoDir.replace(/\\/g, '/') });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to create demo workspace", detail: err.message });
    }
  });

  // Dummy wrapper to match final closing brackets safely
  app.get("/api/dummy-placeholder", (req, res) => {
    try {
      console.log();
    } catch (e: any) {
      res.status(500).json({ error: "Failed to get git diff", detail: e.message });
    }
  });

  // Detect project type
  app.post("/api/fs/detect-project", async (req, res) => {
    const { folderPath, workspaceRoot } = req.body;

    const targetDir = folderPath
      ? resolveCoderPath(folderPath, workspaceRoot)
      : (workspaceRoot ? path.resolve(workspaceRoot) : process.cwd());
    if (!fs.existsSync(targetDir)) {
      return res.json({ type: 'empty', entryPoint: null, framework: null });
    }

    const files = getFilesRecursively(targetDir);
    const fileNames = files.map(f => f.name.toLowerCase());
    const filePaths = files.map(f => f.path.replace(/\\/g, '/'));

    // Check for package.json (framework project)
    const pkgPath = path.join(targetDir, 'package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        const deps = { ...pkg.dependencies, ...pkg.devDependencies };
        if (deps.vite || fileNames.some(f => f.startsWith('vite.config'))) {
          return res.json({ type: 'vite', entryPoint: 'index.html', framework: 'Vite' });
        }
        if (deps.next) {
          return res.json({ type: 'next', entryPoint: null, framework: 'Next.js' });
        }
        if (deps.react || deps['react-dom']) {
          const entry = fileNames.includes('index.html') ? 'index.html' : null;
          return res.json({ type: 'react', entryPoint: entry, framework: 'React' });
        }
        return res.json({ type: 'node', entryPoint: null, framework: pkg.name || 'Node.js' });
      } catch { /* fall through */ }
    }

    // Check for index.html (static site)
    if (fileNames.includes('index.html')) {
      return res.json({ type: 'static', entryPoint: 'index.html', framework: null });
    }

    // Check for single HTML file
    const htmlFiles = fileNames.filter(f => f.endsWith('.html'));
    if (htmlFiles.length === 1) {
      return res.json({ type: 'single', entryPoint: htmlFiles[0], framework: null });
    }
    if (htmlFiles.length > 1) {
      return res.json({ type: 'multi-static', entryPoint: htmlFiles[0], framework: null });
    }

    return res.json({ type: 'unknown', entryPoint: null, framework: null });
  });



  // Report OS info for the AI to adapt its commands
  // Report detected system VRAM / GPU information
  app.get("/api/os/gpu-info", async (req, res) => {
    try {
      const getGPUDetails = async () => {
        const results: { gpus: any[]; totalDedicatedVRAM_MB: number } = {
          gpus: [],
          totalDedicatedVRAM_MB: 0
        };

        const detectGPUType = (gpu: any) => {
          const model = (gpu.model || "").toLowerCase();
          const vendor = (gpu.vendor || "").toLowerCase();
          if (gpu.vramDynamic) return "Integrated (Shared VRAM)";
          if (model.includes("intel") || vendor.includes("intel")) return "Integrated";
          if (model.includes("radeon") && model.includes("graphics")) return "Integrated (APU)";
          return "Discrete";
        };

        try {
          const graphics = await si.graphics();
          if (graphics && graphics.controllers) {
            for (const gpu of graphics.controllers) {
              results.gpus.push({
                vendor: gpu.vendor,
                model: gpu.model,
                vramMB: gpu.vram,
                vramDynamic: gpu.vramDynamic,
                bus: gpu.bus,
                driverVersion: gpu.driverVersion,
                type: detectGPUType(gpu)
              });
            }
          }
        } catch (e) {
          console.error("si.graphics error:", e);
        }

        try {
          const raw = spawnSync(
            "nvidia-smi",
            ["--query-gpu=name,memory.total,memory.free,memory.used", "--format=csv,noheader,nounits"],
            { timeout: 5000, encoding: "utf8" }
          ).stdout?.trim();

          if (raw) {
            raw.split("\n").forEach((line) => {
              const [name, total, free, used] = line.split(",").map(s => s.trim());
              const existing = results.gpus.find(g =>
                g.model?.toLowerCase().includes(name?.toLowerCase().split(" ")[1])
              );
              const nvidiaData = {
                vendor: "NVIDIA",
                model: name,
                type: "Discrete",
                vramMB: parseInt(total, 10),
                source: "nvidia-smi"
              };
              if (existing) {
                Object.assign(existing, nvidiaData);
              } else {
                results.gpus.push(nvidiaData);
              }
            });
          }
        } catch {}

        results.totalDedicatedVRAM_MB = results.gpus
          .filter(g => g.type === "Discrete")
          .reduce((sum, g) => sum + (g.vramMB || 0), 0);

        return results;
      };

      const details = await getGPUDetails();
      let vramTotalBytes = 8192 * 1024 * 1024; // Default 8GB

      const discreteGPUs = details.gpus.filter(g => g.type === "Discrete" && g.vramMB);
      if (discreteGPUs.length > 0) {
        const bestGPU = discreteGPUs.reduce((prev, current) => {
          const prevVal = prev.vramMB || 0;
          const currVal = current.vramMB || 0;
          return prevVal > currVal ? prev : current;
        });
        vramTotalBytes = bestGPU.vramMB * 1024 * 1024;
      } else {
        const anyGPU = details.gpus.find(g => g.vramMB);
        if (anyGPU) {
          vramTotalBytes = anyGPU.vramMB * 1024 * 1024;
        } else if (process.platform === 'darwin') {
          vramTotalBytes = Math.floor(os.totalmem() * 0.6);
        } else {
          vramTotalBytes = Math.floor(os.totalmem() * 0.4);
        }
      }

      const vramTotalGB = vramTotalBytes / (1024 * 1024 * 1024);
      res.json({
        gpus: details.gpus,
        vramTotalBytes,
        vramTotalGB,
        detected: discreteGPUs.length > 0 || details.gpus.length > 0
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/os/info", (req, res) => {
    res.json({
      platform: process.platform,
      isWindows: process.platform === 'win32',
      isMac: process.platform === 'darwin',
      isLinux: process.platform === 'linux',
      shell: process.platform === 'win32' ? 'powershell' : '/bin/bash',
      hostname: os.hostname(),
    });
  });

  // Experimental LSP endpoint: provides diagnostics & symbols for a file
  app.post("/api/lsp/analyze", async (req, res) => {
    const { filePath, workspaceRoot } = req.body;
    if (!filePath) {
      return res.status(400).json({ error: "filePath is required" });
    }
    const resolvedPath = resolveCoderPath(filePath, workspaceRoot);
    if (!fs.existsSync(resolvedPath)) {
      return res.status(404).json({ error: "File not found" });
    }
    try {
      const ext = path.extname(resolvedPath).toLowerCase();
      const content = fs.readFileSync(resolvedPath, 'utf8');
      const lines = content.split('\n');
      const imports: string[] = [];
      const diagnostics: any[] = [];
      const symbols: any[] = [];

      // Basic static analysis by file type
      if (['.ts', '.tsx', '.js', '.jsx', '.mjs'].includes(ext)) {
        const importRegex = /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+)?['"]([^'"]+)['"]/g;
        let importMatch: RegExpExecArray | null;
        while ((importMatch = importRegex.exec(content)) !== null) {
          imports.push(importMatch[1]);
        }
        const exportRegex = /export\s+(?:default\s+)?(?:function|class|const|let|var|interface|type|enum)\s+(\w+)/g;
        let exportMatch: RegExpExecArray | null;
        while ((exportMatch = exportRegex.exec(content)) !== null) {
          symbols.push({ name: exportMatch[1], kind: 'export', line: content.substring(0, exportMatch.index).split('\n').length });
        }
        const funcRegex = /(?:function|const)\s+(\w+)\s*(?:[=:]\s*(?:\([^)]*\)\s*=>|function)?)/g;
        let funcMatch: RegExpExecArray | null;
        while ((funcMatch = funcRegex.exec(content)) !== null) {
          const funcName = funcMatch[1];
          if (!symbols.find(s => s.name === funcName)) {
            symbols.push({ name: funcName, kind: 'function', line: content.substring(0, funcMatch.index).split('\n').length });
          }
        }
      }
      let lspMatch: RegExpExecArray | null;
      if (['.css', '.scss', '.less'].includes(ext)) {
        const classRegex = /\.([\w-]+)\s*\{/g;
        while ((lspMatch = classRegex.exec(content)) !== null) {
          symbols.push({ name: lspMatch[1], kind: 'class', line: content.substring(0, lspMatch.index).split('\n').length });
        }
      }
      if (['.html', '.htm'].includes(ext)) {
        const tagRegex = /<([\w-]+)(?:\s[^>]*)?>/g;
        while ((lspMatch = tagRegex.exec(content)) !== null) {
          symbols.push({ name: lspMatch[1], kind: 'tag', line: content.substring(0, lspMatch.index).split('\n').length });
        }
      }

      // Basic diagnostics
      const longLines = lines.map((l, i) => ({ line: i + 1, length: l.length })).filter(l => l.length > 200);
      longLines.forEach(ll => diagnostics.push({
        severity: 'warning',
        message: `Line ${ll.line} is ${ll.length} characters long (recommended max: 200)`,
        line: ll.line
      }));
      const tabLines = lines.map((l, i) => ({ line: i + 1, hasTabs: l.includes('\t') })).filter(l => l.hasTabs);
      tabLines.forEach(tl => diagnostics.push({
        severity: 'info',
        message: `Line ${tl.line} contains tab characters (consider using spaces)`,
        line: tl.line
      }));

      res.json({
        success: true,
        fileType: ext,
        lineCount: lines.length,
        imports: [...new Set(imports)],
        symbols,
        diagnostics,
        language: ext.replace('.', '')
      });
    } catch (e: any) {
      res.status(500).json({ error: "LSP analysis failed", detail: e.message });
    }
  });

  type PreviewDetection = {
    kind: 'node' | 'static-html' | 'unknown';
    framework: string;
    packageManager: 'npm' | 'pnpm' | 'yarn' | 'bun' | null;
    devCommand: string | null;
    previewUrl: string | null;
    entryFile: string | null;
    notes: string[];
  };

  const detectPackageManager = (workspaceRoot: string): PreviewDetection['packageManager'] => {
    if (fileExists(path.join(workspaceRoot, 'pnpm-lock.yaml'))) return 'pnpm';
    if (fileExists(path.join(workspaceRoot, 'yarn.lock'))) return 'yarn';
    if (fileExists(path.join(workspaceRoot, 'bun.lockb')) || fileExists(path.join(workspaceRoot, 'bun.lock'))) return 'bun';
    return 'npm';
  };

  const detectStaticEntry = (workspaceRoot: string) => {
    const candidates = ['index.html', 'public/index.html', 'dist/index.html', 'build/index.html'];
    for (const candidate of candidates) {
      if (fileExists(path.join(workspaceRoot, candidate))) return candidate;
    }
    const htmlFiles = getFilesRecursively(workspaceRoot)
      .filter(f => !f.isDirectory && /\.html?$/i.test(f.name))
      .map(f => f.relativePath)
      .sort();
    return htmlFiles[0] || null;
  };

  const encodePreviewPath = (relativePath: string) =>
    relativePath.replace(/\\/g, '/').split('/').map(encodeURIComponent).join('/');

  const detectPreviewProject = (workspaceRoot: string): PreviewDetection => {
    const notes: string[] = [];
    if (!fileExists(workspaceRoot)) {
      return {
        kind: 'unknown',
        framework: 'No workspace',
        packageManager: null,
        devCommand: null,
        previewUrl: null,
        entryFile: null,
        notes: ['Workspace folder does not exist.']
      };
    }

    const pkgPath = path.join(workspaceRoot, 'package.json');
    const pkg = readJsonFile(pkgPath);
    if (pkg) {
      const packageManager = detectPackageManager(workspaceRoot);
      const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
      const scripts = pkg.scripts || {};
      const scriptName = scripts.dev ? 'dev' : scripts.start ? 'start' : scripts.serve ? 'serve' : scripts.preview ? 'preview' : null;
      let framework = pkg.name || 'Node app';
      if (deps.vite || scripts.dev?.includes('vite')) framework = 'Vite';
      else if (deps.next || scripts.dev?.includes('next')) framework = 'Next.js';
      else if (deps['react-scripts']) framework = 'Create React App';
      else if (deps.astro) framework = 'Astro';
      else if (deps.nuxt) framework = 'Nuxt';
      else if (deps['@sveltejs/kit'] || deps.svelte) framework = 'Svelte';
      else if (deps.express) framework = 'Express';
      if (!scriptName) notes.push('package.json exists but no dev/start/serve/preview script was found.');
      return {
        kind: 'node',
        framework,
        packageManager,
        devCommand: scriptName ? `${packageManager} run ${scriptName}` : null,
        previewUrl: null,
        entryFile: null,
        notes
      };
    }

    const entryFile = detectStaticEntry(workspaceRoot);
    if (entryFile) {
      notes.push('Static HTML project detected. No dev server is required.');
      return {
        kind: 'static-html',
        framework: 'Static HTML',
        packageManager: null,
        devCommand: null,
        previewUrl: `http://localhost:${PORT}/preview-static/${encodePreviewPath(entryFile)}`,
        entryFile,
        notes
      };
    }

    return {
      kind: 'unknown',
      framework: 'Unknown project',
      packageManager: null,
      devCommand: null,
      previewUrl: null,
      entryFile: null,
      notes: ['Could not detect package.json or an HTML entry file.']
    };
  };

  const stopPreviewProcess = () => {
    if (previewProcess) {
      if (process.platform === 'win32' && previewProcess.pid) {
        try {
          spawn('taskkill', ['/pid', previewProcess.pid.toString(), '/f', '/t']);
        } catch {
          previewProcess.kill();
        }
      } else {
        previewProcess.kill();
      }
      previewProcess = null;
    }
    previewUrl = '';
    previewProxyOrigin = '';
  };

  const pushPreviewLog = (chunk: Buffer | string) => {
    const text = chunk.toString();
    previewLogs.push(...text.split(/\r?\n/).filter(Boolean));
    previewLogs = previewLogs.slice(-200);
    const urlMatch = text.match(/https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?\/?/i);
    if (urlMatch) {
      previewUrl = urlMatch[0].replace('[::1]', 'localhost');
      previewProxyOrigin = new URL(previewUrl).origin;
    }
  };

  const rewritePreviewText = (text: string) => {
    return text
      .replace(/<meta[^>]*http-equiv=["']Content-Security-Policy["'][^>]*>/gi, '')
      .replace(/(["'`])\/(?!preview-proxy\/)(@vite|@react-refresh|src|node_modules|assets)\//g, '$1/preview-proxy/$2/')
      .replace(/(href|src)=["']\/(?!\/|preview-proxy\/)([^"']*)["']/g, '$1="/preview-proxy/$2"')
      .replace(/url\(\s*\/(?!\/|preview-proxy\/)([^)"']+)\s*\)/g, 'url(/preview-proxy/$1)');
  };

  const getSafeFrameUrl = (urlStr: string, isStaticHtml: boolean): string => {
    if (!urlStr) return '';
    if (isStaticHtml) {
      try {
        return new URL(urlStr).pathname;
      } catch {
        return urlStr;
      }
    }
    return previewProxyOrigin ? '/preview-proxy/' : urlStr;
  };

  app.get('/api/preview/status', (req, res) => {
    const workspaceRoot = resolveCoderPath(typeof req.query.folderPath === 'string' ? req.query.folderPath : undefined);
    activePreviewRoot = workspaceRoot;
    const detection = detectPreviewProject(workspaceRoot);
    res.json({
      running: Boolean(previewProcess),
      url: previewUrl,
      frameUrl: getSafeFrameUrl(previewUrl, detection.kind === 'static-html'),
      logs: previewLogs,
      workspacePath: workspaceRoot.replace(/\\/g, '/'),
      detection
    });
  });

  app.post('/api/preview/stop', (_req, res) => {
    stopPreviewProcess();
    previewLogs = [];
    res.json({ success: true });
  });

  app.post('/api/preview/start', async (req, res) => {
    try {
      const workspaceRoot = resolveCoderPath(req.body?.folderPath);
      const samePreviewRoot = activePreviewRoot === workspaceRoot;
      activePreviewRoot = workspaceRoot;
      const detection = detectPreviewProject(workspaceRoot);

      if (previewProcess && previewUrl && samePreviewRoot) {
        return res.json({
          running: true,
          url: previewUrl,
          frameUrl: getSafeFrameUrl(previewUrl, detection.kind === 'static-html'),
          logs: previewLogs,
          detection
        });
      }

      if (detection.kind === 'static-html' && detection.previewUrl) {
        stopPreviewProcess();
        previewUrl = detection.previewUrl;
        previewProxyOrigin = '';
        previewLogs = [`Launching ${detection.entryFile}`];
        return res.json({
          running: false,
          url: previewUrl,
          frameUrl: getSafeFrameUrl(previewUrl, true),
          logs: previewLogs,
          detection
        });
      }

      if (!detection.devCommand) {
        return res.status(400).json({
          error: detection.notes.join(' ') || 'Could not detect how to start this project.',
          detection
        });
      }

      stopPreviewProcess();
      previewLogs = [`Detected ${detection.framework}`, `Running ${detection.devCommand}`];
      const proc = spawn(detection.devCommand, {
        cwd: workspaceRoot,
        env: { ...process.env, BROWSER: 'none' },
        shell: true
      });
      previewProcess = proc;

      proc.stdout.on('data', pushPreviewLog);
      proc.stderr.on('data', pushPreviewLog);
      proc.on('exit', (code) => {
        pushPreviewLog(`Preview process exited with code ${code}`);
        previewProcess = null;
      });
      proc.on('error', (error) => {
        pushPreviewLog(`Preview process failed: ${error.message}`);
        previewProcess = null;
      });

      res.json({
        running: true,
        url: previewUrl,
        frameUrl: getSafeFrameUrl(previewUrl, false),
        logs: previewLogs,
        detection
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/preview-static/*', (req, res) => {
    const subpath = (req.params as Record<string, string>)['0'] || '';
    const resolved = path.resolve(activePreviewRoot, subpath);
    if (resolved !== activePreviewRoot && !resolved.startsWith(activePreviewRoot + path.sep)) {
      return res.status(403).send('Path escapes preview workspace');
    }
    if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
      return res.status(404).send('Preview file not found');
    }
    res.sendFile(resolved);
  });

  app.use('/preview-proxy', async (req, res) => {
    if (!previewProxyOrigin) {
      return res.status(503).send('Preview server is not running yet');
    }
    try {
      const upstreamUrl = new URL(req.originalUrl.replace(/^\/preview-proxy/, '') || '/', previewProxyOrigin);
      const upstream = await fetch(upstreamUrl, {
        method: req.method,
        headers: {
          accept: req.headers.accept || '*/*',
          'user-agent': req.headers['user-agent'] || 'LuminaPreview'
        } as any
      });
      const contentType = upstream.headers.get('content-type') || '';
      res.status(upstream.status);
      if (contentType) res.setHeader('content-type', contentType);
      if (contentType.includes('text/html') || contentType.includes('javascript') || contentType.includes('text/css')) {
        res.send(rewritePreviewText(await upstream.text()));
      } else {
        const buffer = Buffer.from(await upstream.arrayBuffer());
        res.send(buffer);
      }
    } catch (error: any) {
      res.status(502).send(`Preview proxy error: ${error.message}`);
    }
  });

  // Analyze element endpoint using filesystem scan and optional Gemini analysis
  app.post("/api/fs/analyze_element", async (req, res) => {
    const {
      tag,
      id,
      classes,
      text,
      placeholder,
      src,
      href,
      outerHTML,
      attributes = {},
      dataAttributes = {},
      domPath = [],
      selectorPath,
      childIndexPath = [],
      sourceHint,
      role,
      ariaLabel,
      title,
      parentText,
      siblingIndex,
      sameTagSiblingIndex
    } = req.body;

    const normalizeText = (value = '') => String(value).replace(/\s+/g, ' ').trim();
    const normalizePath = (value = '') => String(value).replace(/\\/g, '/');
    const previewRoot = fs.existsSync(activePreviewRoot) ? activePreviewRoot : process.cwd();
    const sourceExtScore = (fileName: string) => {
      const ext = path.extname(fileName).toLowerCase();
      if (['.tsx', '.jsx', '.vue', '.svelte'].includes(ext)) return 90;
      if (['.ts', '.js'].includes(ext)) return 55;
      if (['.html', '.htm'].includes(ext)) return 45;
      if (ext === '.css' || ext === '.scss' || ext === '.less') return -40;
      return 0;
    };

    const resolveSourceHintFile = () => {
      const hintName = sourceHint?.fileName;
      if (!hintName || typeof hintName !== 'string') return null;
      const direct = path.resolve(hintName);
      if (fs.existsSync(direct)) return direct;
      const normalizedHint = normalizePath(hintName);
      const srcIndex = normalizedHint.lastIndexOf('/src/');
      if (srcIndex !== -1) {
        const candidate = path.join(previewRoot, normalizedHint.slice(srcIndex + 1));
        if (fs.existsSync(candidate)) return candidate;
      }
      const basename = path.basename(hintName);
      const match = getFilesRecursively(previewRoot).find(f => !f.isDirectory && f.name === basename);
      return match?.path || null;
    };

    const getLineIndex = (content: string, lineNumber?: number) => {
      if (!lineNumber || lineNumber < 1) return -1;
      const lines = content.split(/\r?\n/);
      let index = 0;
      for (let i = 0; i < Math.min(lineNumber - 1, lines.length); i++) {
        index += lines[i].length + 1;
      }
      return index;
    };

    const getLineNumberFromIndex = (content: string, index: number) => {
      if (index < 0) return undefined;
      const lines = content.split(/\r?\n/);
      let charCount = 0;
      for (let i = 0; i < lines.length; i++) {
        const lineLength = lines[i].length + 1;
        if (charCount + lineLength > index) {
          return i + 1;
        }
        charCount += lineLength;
      }
      return lines.length || undefined;
    };

    const getLineRangeForSnippet = (content: string, snippet: string, preferredIndex: number) => {
      if (!snippet) return {};
      let startIndex = preferredIndex >= 0 ? content.indexOf(snippet, Math.max(0, preferredIndex - 20)) : -1;
      if (startIndex === -1) startIndex = content.indexOf(snippet);
      if (startIndex === -1) return {};
      const startLine = getLineNumberFromIndex(content, startIndex);
      const endLine = getLineNumberFromIndex(content, startIndex + Math.max(0, snippet.length - 1));
      return {
        lineNumber: startLine,
        lineRangeStart: startLine,
        lineRangeEnd: endLine
      };
    };

    const countTagOccurrences = (snippet: string, tagName: string) => {
      if (!tagName) return 0;
      const matches = snippet.match(new RegExp(`<${tagName}(?=\\s|>|/)`, 'gi'));
      return matches ? matches.length : 0;
    };

    const normalizeHtmlFragment = (value = '') =>
      String(value)
        .replace(/\s+/g, ' ')
        .replace(/>\s+</g, '><')
        .trim();

    type ElementSnippetMatch = {
      snippet: string;
      lineNumber: number;
      lineRangeStart: number;
      lineRangeEnd: number;
      score: number;
      exact: boolean;
    };

    const exactAttributeMatchers = () => {
      const matchers: Array<{ name: string; value: string; weight: number; exact: boolean }> = [];
      if (id) matchers.push({ name: 'id', value: String(id), weight: 900, exact: true });
      if (placeholder) matchers.push({ name: 'placeholder', value: String(placeholder), weight: 360, exact: true });
      if (href) matchers.push({ name: 'href', value: String(href), weight: 420, exact: true });
      if (src) matchers.push({ name: 'src', value: String(src), weight: 420, exact: true });
      if (role) matchers.push({ name: 'role', value: String(role), weight: 240, exact: true });
      if (ariaLabel) matchers.push({ name: 'aria-label', value: String(ariaLabel), weight: 500, exact: true });
      if (title) matchers.push({ name: 'title', value: String(title), weight: 260, exact: true });

      for (const [name, value] of Object.entries(dataAttributes as Record<string, string>)) {
        if (typeof value === 'string' && value.trim() && value.length < 300) {
          matchers.push({ name, value, weight: 760, exact: true });
        }
      }
      for (const [name, value] of Object.entries(attributes as Record<string, string>)) {
        if (name === 'class' || name.startsWith('data-')) continue;
        if (typeof value === 'string' && value.trim() && value.length < 300) {
          matchers.push({ name, value, weight: 240, exact: true });
        }
      }
      return matchers;
    };

    const lineHasAttribute = (line: string, name: string, value: string) =>
      line.includes(`${name}="${value}"`) ||
      line.includes(`${name}='${value}'`) ||
      line.includes(`${name}={${value}}`) ||
      line.includes(`${name}={"${value}"}`) ||
      line.includes(`${name}={'${value}'}`);

    const isSingleElementLine = (line: string) =>
      tag ? countTagOccurrences(line, tag) === 1 : false;

    const buildElementWork = () => {
      const elementClasses = String(classes || '').split(/\s+/).filter(Boolean);
      const selectorDetails = [
        id ? `#${id}` : '',
        Object.entries(dataAttributes as Record<string, string>)
          .map(([name, value]) => `[${name}="${value}"]`)
          .join(''),
        elementClasses.length ? `.${elementClasses.slice(0, 2).join('.')}` : ''
      ].filter(Boolean).join('');
      return `Represents the selected <${tag}>${selectorDetails ? ` (${selectorDetails})` : ''} element from the preview. The attached code is the exact source node matched from its DOM attributes${selectorPath ? ` and selector path ${selectorPath}` : ''}.`;
    };

    const staticAssetPathFromRef = (refValue: string) => {
      const raw = String(refValue || '').trim();
      if (!raw || /^([a-z]+:)?\/\//i.test(raw) || raw.startsWith('data:') || raw.startsWith('#')) return null;
      const clean = raw.split('?')[0].split('#')[0].replace(/^\/+/, '');
      if (!clean) return null;
      const resolved = path.resolve(previewRoot, clean);
      if (resolved !== previewRoot && !resolved.startsWith(previewRoot + path.sep)) return null;
      if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) return null;
      return resolved;
    };

    const extractStaticLinkedAssets = (htmlContent: string) => {
      const assets: Array<{ path: string; kind: 'script' | 'style' }> = [];
      for (const match of htmlContent.matchAll(/<script[^>]+src=["']([^"']+)["'][^>]*>/gi)) {
        const resolved = staticAssetPathFromRef(match[1]);
        if (resolved) assets.push({ path: resolved, kind: 'script' });
      }
      for (const match of htmlContent.matchAll(/<link[^>]+href=["']([^"']+)["'][^>]*>/gi)) {
        const tagText = match[0] || '';
        if (!/stylesheet/i.test(tagText)) continue;
        const resolved = staticAssetPathFromRef(match[1]);
        if (resolved) assets.push({ path: resolved, kind: 'style' });
      }
      return assets.filter((asset, index, arr) =>
        arr.findIndex((entry) => normalizePath(entry.path) === normalizePath(asset.path)) === index
      );
    };

    const runtimeHintTerms = (() => {
      const values = [
        tag,
        id,
        text,
        parentText,
        ariaLabel,
        title,
        selectorPath,
        ...(domPath as string[]),
        ...Object.keys(attributes as Record<string, string>),
        ...Object.values(attributes as Record<string, string>),
        ...Object.keys(dataAttributes as Record<string, string>),
        ...Object.values(dataAttributes as Record<string, string>),
        ...String(classes || '').split(/\s+/)
      ];
      return [...new Set(values
        .flatMap((value) => String(value || '').toLowerCase().split(/[^a-z0-9_-]+/))
        .map((term) => term.trim())
        .filter((term) => term.length >= 3)
      )];
    })();

    const looksRuntimeDrivenSelection = () => {
      if (tag === 'canvas') return true;
      if (sourceHint?.componentName || sourceHint?.ownerName) return true;
      if ((domPath as string[]).some((segment) => /canvas|board|snake|food|apple|game|tile|cell|segment|score/i.test(String(segment)))) {
        return true;
      }
      return runtimeHintTerms.some((term) => ['snake', 'food', 'apple', 'game', 'board', 'score', 'segment', 'cell', 'tile'].includes(term));
    };

    const scoreRuntimeAsset = (content: string, kind: 'script' | 'style') => {
      let score = kind === 'script' ? 120 : 80;
      for (const term of runtimeHintTerms) {
        if (!term) continue;
        if (content.includes(term)) score += kind === 'script' ? 40 : 28;
      }
      if (id && content.includes(id)) score += kind === 'script' ? 90 : 70;
      for (const cls of selectedClasses) {
        if (content.includes(cls)) score += kind === 'script' ? 65 : 95;
      }
      for (const [name, value] of Object.entries(dataAttributes as Record<string, string>)) {
        if (value && content.includes(`${name}`)) score += 55;
        if (value && content.includes(String(value))) score += 65;
      }
      if (selectedText && content.toLowerCase().includes(selectedText.toLowerCase())) score += 40;
      if (selectorPath && content.includes(selectorPath.split('>').slice(-1)[0]?.trim() || '')) score += 20;
      if (kind === 'script' && looksRuntimeDrivenSelection()) score += 140;
      return score;
    };

    const findNeedleIndex = (content: string) => {
      const checks: string[] = [];
      if (id) checks.push(`id="${id}"`, `id='${id}'`, `id={${id}}`, `id={"${id}"}`, String(id));
      if (placeholder) checks.push(String(placeholder));
      if (href) checks.push(String(href));
      if (src) checks.push(String(src));
      if (role) checks.push(`role="${role}"`, `role='${role}'`, role);
      if (ariaLabel) checks.push(`aria-label="${ariaLabel}"`, `aria-label='${ariaLabel}'`, ariaLabel);
      if (title) checks.push(`title="${title}"`, `title='${title}'`, title);
      if (text && normalizeText(text).length > 1) checks.push(normalizeText(text), String(text).trim());
      if (parentText && normalizeText(parentText).length > 1) checks.push(normalizeText(parentText));
      for (const value of Object.values(attributes as Record<string, string>)) {
        if (typeof value === 'string' && value.trim().length > 2 && value.length < 200) checks.push(value.trim());
      }
      const classList = String(classes || '').split(/\s+/).filter(c => c.length > 2);
      checks.push(...classList);

      for (const needle of checks.filter(Boolean)) {
        const exactIndex = content.indexOf(needle);
        if (exactIndex !== -1) return exactIndex;
        const lowerIndex = content.toLowerCase().indexOf(needle.toLowerCase());
        if (lowerIndex !== -1) return lowerIndex;
      }
      return -1;
    };

    const scoreSnippet = (snippet: string) => {
      let score = 0;
      const normalizedSnippet = normalizeText(snippet);
      const normalizedOuterHTML = normalizeHtmlFragment(outerHTML || '');
      const normalizedSnippetHtml = normalizeHtmlFragment(snippet);
      const tagOccurrences = countTagOccurrences(snippet, tag);
      const exactDataAttributeCount = Object.entries(dataAttributes as Record<string, string>).reduce((count, [attrName, attrValue]) => {
        if (!attrValue || attrValue.length > 200) return count;
        return count + (
          snippet.includes(`${attrName}="${attrValue}"`) || snippet.includes(`${attrName}='${attrValue}'`)
            ? 1
            : 0
        );
      }, 0);
      const hasUniqueDataAttributeMatch = exactDataAttributeCount > 0;

      if (normalizedOuterHTML && normalizedSnippetHtml === normalizedOuterHTML) {
        score += 700;
      } else if (normalizedOuterHTML && normalizedSnippetHtml.includes(normalizedOuterHTML)) {
        score += 320;
      }

      if (selectedText.length > 1 && normalizedSnippet.includes(selectedText)) {
        score += 240 + Math.min(120, selectedText.length * 2);
      }
      if (id && snippet.includes(id)) {
        score += 220;
      }
      if (ariaLabel && snippet.includes(ariaLabel)) {
        score += 180;
      }
      if (title && snippet.includes(title)) {
        score += 90;
      }
      if (role && snippet.includes(role)) {
        score += 70;
      }
      if (tag && new RegExp(`<${tag}(\\s|>|/)`, 'i').test(snippet)) {
        score += 80;
      }
      for (const cls of selectedClasses) {
        if (snippet.includes(cls)) score += 45;
      }
      for (const [attrName, attrValue] of Object.entries(attributes as Record<string, string>)) {
        if (!attrValue || attrValue.length > 200) continue;
        if (snippet.includes(`${attrName}="${attrValue}"`) || snippet.includes(`${attrName}='${attrValue}'`)) {
          score += 110;
        } else if (snippet.includes(attrValue)) {
          score += 35;
        }
      }
      for (const [attrName, attrValue] of Object.entries(dataAttributes as Record<string, string>)) {
        if (!attrValue || attrValue.length > 200) continue;
        if (snippet.includes(`${attrName}="${attrValue}"`) || snippet.includes(`${attrName}='${attrValue}'`)) {
          score += 150;
        } else if (snippet.includes(attrValue)) {
          score += 50;
        }
      }
      if (hasUniqueDataAttributeMatch && tagOccurrences === 1) {
        score += 260;
      }
      if (typeof siblingIndex === 'number' && siblingIndex >= 0) {
        if (snippet.includes(`[${siblingIndex}]`)) score += 20;
        if (snippet.includes(`index === ${siblingIndex}`) || snippet.includes(`index===${siblingIndex}`)) score += 70;
        if (snippet.includes(`${siblingIndex}`)) score += 8;
      }
      if (typeof sameTagSiblingIndex === 'number' && sameTagSiblingIndex >= 0) {
        if (snippet.includes(`index === ${sameTagSiblingIndex}`) || snippet.includes(`index===${sameTagSiblingIndex}`)) score += 90;
        if (snippet.includes(`key={${sameTagSiblingIndex}}`) || snippet.includes(`key="${sameTagSiblingIndex}"`)) score += 40;
      }

      if (tagOccurrences > 1) {
        score -= Math.min(240, (tagOccurrences - 1) * 55);
      }
      if (hasUniqueDataAttributeMatch && tagOccurrences > 1) {
        score -= Math.min(420, (tagOccurrences - 1) * 110);
      }

      if (parentText && selectedText && normalizeText(parentText) !== selectedText && normalizedSnippet.includes(normalizeText(parentText))) {
        score -= 45;
      }

      score -= Math.floor(snippet.length / 140);
      return score;
    };

    const extractFocusedJsxSnippet = (content: string, index: number) => {
      if (index < 0) return null;
      const lines = content.split(/\r?\n/);
      const lineIndex = Math.max(0, (getLineNumberFromIndex(content, index) || 1) - 1);

      let bestSnippet: { snippet: string; startLine: number; endLine: number; score: number } | null = null;
      const exactAttrMatchers = Object.entries(attributes as Record<string, string>)
        .filter(([, value]) => typeof value === 'string' && value.trim().length > 0 && value.length < 220)
        .map(([name, value]) => `${name}="${value}"`);
      const exactSingleAttrMatchers = Object.entries(attributes as Record<string, string>)
        .filter(([, value]) => typeof value === 'string' && value.trim().length > 0 && value.length < 220)
        .map(([name, value]) => `${name}='${value}'`);
      const normalizedOuterHTML = normalizeHtmlFragment(outerHTML || '');

      for (let start = lineIndex; start >= Math.max(0, lineIndex - 12); start--) {
        const firstLine = lines[start];
        if (!new RegExp(`<${tag}(\\s|>|/)`, 'i').test(firstLine) && !firstLine.includes('<')) continue;
        let tagBalance = 0;
        let seenTargetTag = false;
        for (let end = start; end <= Math.min(lines.length - 1, start + 24); end++) {
          const snippet = lines.slice(start, end + 1).join('\n').trim();
          if (!snippet) continue;
          if (snippet.length > 2200) break;
          const line = lines[end];
          const openMatches = line.match(new RegExp(`<${tag}(?=\\s|>|/)`, 'gi')) || [];
          const closeMatches = line.match(new RegExp(`</${tag}>`, 'gi')) || [];
          const selfClosingMatches = line.match(new RegExp(`<${tag}[^>]*\\/\\s*>`, 'gi')) || [];
          if (openMatches.length > 0) {
            seenTargetTag = true;
            tagBalance += openMatches.length;
          }
          if (closeMatches.length > 0) tagBalance -= closeMatches.length;
          if (selfClosingMatches.length > 0) tagBalance -= selfClosingMatches.length;
          if (!seenTargetTag) continue;
          let snippetScore = scoreSnippet(snippet);
          if (exactAttrMatchers.some((match) => snippet.includes(match)) || exactSingleAttrMatchers.some((match) => snippet.includes(match))) {
            snippetScore += 220;
          }
          if (normalizedOuterHTML && normalizeHtmlFragment(snippet) === normalizedOuterHTML) {
            snippetScore += 320;
          }
          if (!bestSnippet || snippetScore > bestSnippet.score || (snippetScore === bestSnippet.score && snippet.length < bestSnippet.snippet.length)) {
            bestSnippet = { snippet, startLine: start + 1, endLine: end + 1, score: snippetScore };
          }
          if (tagBalance <= 0 && (line.includes('>') || selfClosingMatches.length > 0)) break;
        }
      }

      if (bestSnippet) return bestSnippet;

      for (let start = lineIndex; start >= Math.max(0, lineIndex - 10); start--) {
        for (let end = lineIndex; end <= Math.min(lines.length - 1, lineIndex + 10); end++) {
          const snippet = lines.slice(start, end + 1).join('\n').trim();
          if (!snippet) continue;
          if (snippet.length > 1400) break;
          const snippetScore = scoreSnippet(snippet) - Math.floor(snippet.length / 180);
          if (!bestSnippet || snippetScore > bestSnippet.score || (snippetScore === bestSnippet.score && snippet.length < bestSnippet.snippet.length)) {
            bestSnippet = { snippet, startLine: start + 1, endLine: end + 1, score: snippetScore };
          }
        }
      }
      return bestSnippet;
    };

    const extractBalancedSnippet = (content: string, index: number) => {
      const focusedSnippet = extractFocusedJsxSnippet(content, index);
      if (focusedSnippet) {
        return {
          snippet: focusedSnippet.snippet.length > 2400 ? focusedSnippet.snippet.slice(0, 2400) : focusedSnippet.snippet,
          lineNumber: focusedSnippet.startLine,
          lineRangeStart: focusedSnippet.startLine,
          lineRangeEnd: focusedSnippet.endLine
        };
      }
      if (index < 0) return content.substring(0, 1600);
      const lines = content.split(/\r?\n/);
      let charCount = 0;
      let lineIndex = 0;
      for (; lineIndex < lines.length; lineIndex++) {
        if (charCount + lines[lineIndex].length + 1 > index) break;
        charCount += lines[lineIndex].length + 1;
      }

      let startLine = Math.max(0, lineIndex - 8);
      for (let i = lineIndex; i >= Math.max(0, lineIndex - 80); i--) {
        const line = lines[i];
        if (
          /^\s*(export\s+)?(default\s+)?function\s+\w+/.test(line) ||
          /^\s*(const|let|var)\s+\w+\s*=\s*(\([^)]*\)|[^=]*)\s*=>/.test(line) ||
          /^\s*return\s*\(/.test(line) ||
          /^\s*<[\w.-]+/.test(line)
        ) {
          startLine = i;
          break;
        }
      }

      let endLine = Math.min(lines.length - 1, lineIndex + 22);
      let balance = 0;
      let seenCode = false;
      for (let i = startLine; i < Math.min(lines.length, startLine + 140); i++) {
        const line = lines[i];
        for (const char of line) {
          if ('({['.includes(char)) balance++;
          if (')}]'.includes(char)) balance--;
        }
        if (i >= lineIndex) seenCode = true;
        if (seenCode && i > lineIndex + 6 && balance <= 0) {
          endLine = i;
          break;
        }
      }

      const snippet = lines.slice(startLine, endLine + 1).join('\n').trim();
      return {
        snippet: snippet.length > 2800 ? snippet.slice(0, 2800) : snippet,
        lineNumber: startLine + 1,
        lineRangeStart: startLine + 1,
        lineRangeEnd: endLine + 1
      };
    };

    const extractExactElementSnippet = (content: string): ElementSnippetMatch | null => {
      const lines = content.split(/\r?\n/);
      const exactAttrMatchers = Object.entries(attributes as Record<string, string>)
        .filter(([, value]) => typeof value === 'string' && value.trim().length > 0 && value.length < 220)
        .flatMap(([name, value]) => [`${name}="${value}"`, `${name}='${value}'`]);
      const normalizedOuterHTML = normalizeHtmlFragment(outerHTML || '');
      const sourceMatchers = exactAttributeMatchers();

      let best: ElementSnippetMatch | null = null;

      for (let i = 0; i < lines.length; i++) {
        const rawLine = lines[i];
        const trimmed = rawLine.trim();
        if (!trimmed) continue;
        if (!tag || !new RegExp(`^<${tag}(\\s|>|/)`, 'i').test(trimmed)) continue;

        let score = 0;
        const normalizedLine = normalizeHtmlFragment(trimmed);
        if (normalizedOuterHTML && normalizedLine === normalizedOuterHTML) score += 1000;
        if (id && (trimmed.includes(`id="${id}"`) || trimmed.includes(`id='${id}'`))) score += 400;
        if (selectedText && normalizeText(trimmed).includes(selectedText)) score += 120;
        if (ariaLabel && trimmed.includes(ariaLabel)) score += 250;
        if (title && trimmed.includes(title)) score += 120;

        let authoritativeMatches = 0;
        for (const matcher of sourceMatchers) {
          if (lineHasAttribute(trimmed, matcher.name, matcher.value)) {
            score += matcher.weight;
            if (matcher.exact) authoritativeMatches += 1;
          }
        }
        for (const cls of selectedClasses) {
          if (trimmed.includes(cls)) score += 50;
        }
        for (const matcher of exactAttrMatchers) {
          if (trimmed.includes(matcher)) score += 320;
        }
        for (const [, value] of Object.entries(dataAttributes as Record<string, string>)) {
          if (value && trimmed.includes(String(value))) score += 220;
        }
        if (Object.keys(dataAttributes as Record<string, string>).length > 0) {
          const exactDataMatches = Object.entries(dataAttributes as Record<string, string>).filter(([attrName, attrValue]) =>
            Boolean(attrValue) &&
            (trimmed.includes(`${attrName}="${attrValue}"`) || trimmed.includes(`${attrName}='${attrValue}'`))
          ).length;
          if (exactDataMatches > 0) {
            score += 420 + exactDataMatches * 80;
          }
        }

        if (score <= 0) continue;
        if (authoritativeMatches > 0 && isSingleElementLine(trimmed)) {
          score += 900;
        }
        if (tag && countTagOccurrences(trimmed, tag) > 1) {
          score -= countTagOccurrences(trimmed, tag) * 300;
        }
        score -= Math.floor(trimmed.length / 40);

        if (!best || score > best.score || (score === best.score && trimmed.length < best.snippet.length)) {
          best = {
            snippet: rawLine.trimEnd(),
            lineNumber: i + 1,
            lineRangeStart: i + 1,
            lineRangeEnd: i + 1,
            score,
            exact: authoritativeMatches > 0 && isSingleElementLine(trimmed)
          };
        }
      }

      return best;
    };

    const allFiles = getFilesRecursively(previewRoot);
    const textFiles = allFiles.filter(f => !f.isDirectory && /\.(html|css|scss|less|js|jsx|ts|tsx|vue|svelte)$/i.test(f.name));
    const candidates: Array<any> = [];
    const hintedPath = resolveSourceHintFile();

    if (hintedPath && fs.existsSync(hintedPath)) {
      try {
        const content = fs.readFileSync(hintedPath, 'utf8');
        candidates.push({
          name: path.basename(hintedPath),
          path: normalizePath(hintedPath),
          content,
          score: 1200 + sourceExtScore(hintedPath),
          matchIndex: getLineIndex(content, sourceHint?.lineNumber)
        });
      } catch {
        // Ignore stale React debug source hints.
      }
    }

    let bestFile = null;
    let bestScore = -1;
    const selectedText = normalizeText(text);
    const selectedClasses = String(classes || '').split(/\s+/).filter(c =>
      c.length > 2 &&
      !['flex', 'grid', 'hidden', 'block', 'w-full', 'h-full', 'relative', 'absolute', 'items-center', 'justify-between', 'text-center', 'cursor-pointer', 'rounded', 'border', 'shadow', 'bg-white', 'text-black', 'text-white'].includes(c)
    );

    for (const file of textFiles) {
      try {
        const content = fs.readFileSync(file.path, 'utf8');
        const lowerContent = content.toLowerCase();
        let score = sourceExtScore(file.name);
        let matchIndex = -1;

        if (hintedPath && normalizePath(file.path) === normalizePath(hintedPath)) {
          score += 1200;
          matchIndex = getLineIndex(content, sourceHint?.lineNumber);
        }

        if (id) {
          if (content.includes(`id="${id}"`) || content.includes(`id='${id}'`) || content.includes(`id={${id}}`) || content.includes(`id={"${id}"}`)) {
            score += 220;
            matchIndex = content.indexOf(id);
          } else if (content.includes(id)) {
            score += 45;
            if (matchIndex === -1) matchIndex = content.indexOf(id);
          }
        }

        if (selectedText.length > 1) {
          if (content.includes(selectedText)) {
            score += Math.min(220, 80 + selectedText.length);
            if (matchIndex === -1) matchIndex = content.indexOf(selectedText);
          } else if (lowerContent.includes(selectedText.toLowerCase())) {
            score += Math.min(120, 40 + selectedText.length / 2);
            if (matchIndex === -1) matchIndex = lowerContent.indexOf(selectedText.toLowerCase());
          }
        }

        if (ariaLabel) {
          if (content.includes(`aria-label="${ariaLabel}"`) || content.includes(`aria-label='${ariaLabel}'`)) {
            score += 260;
            if (matchIndex === -1) matchIndex = content.indexOf(ariaLabel);
          } else if (content.includes(ariaLabel)) {
            score += 90;
            if (matchIndex === -1) matchIndex = content.indexOf(ariaLabel);
          }
        }

        if (title) {
          if (content.includes(`title="${title}"`) || content.includes(`title='${title}'`)) {
            score += 130;
            if (matchIndex === -1) matchIndex = content.indexOf(title);
          }
        }

        if (role && content.includes(role)) {
          score += 35;
          if (matchIndex === -1) matchIndex = content.indexOf(role);
        }

        for (const [attrName, attrValue] of Object.entries(attributes as Record<string, string>)) {
          if (!attrValue || attrValue.length > 300) continue;
          const exactAttrDouble = `${attrName}="${attrValue}"`;
          const exactAttrSingle = `${attrName}='${attrValue}'`;
          if (content.includes(exactAttrDouble) || content.includes(exactAttrSingle)) {
            score += 140;
            if (matchIndex === -1) matchIndex = content.indexOf(attrValue);
          } else if (attrValue.length > 2 && content.includes(attrValue)) {
            score += 35;
            if (matchIndex === -1) matchIndex = content.indexOf(attrValue);
          }
        }

        for (const [attrName, attrValue] of Object.entries(dataAttributes as Record<string, string>)) {
          if (!attrValue || attrValue.length > 300) continue;
          const exactAttrDouble = `${attrName}="${attrValue}"`;
          const exactAttrSingle = `${attrName}='${attrValue}'`;
          if (content.includes(exactAttrDouble) || content.includes(exactAttrSingle)) {
            score += 190;
            if (matchIndex === -1) matchIndex = content.indexOf(attrValue);
          } else if (attrValue.length > 1 && content.includes(attrValue)) {
            score += 50;
            if (matchIndex === -1) matchIndex = content.indexOf(attrValue);
          }
        }

        if (src && content.includes(src)) {
          score += 170;
          if (matchIndex === -1) matchIndex = content.indexOf(src);
        }
        if (href && content.includes(href)) {
          score += 170;
          if (matchIndex === -1) matchIndex = content.indexOf(href);
        }

        let classMatches = 0;
        for (const cls of selectedClasses) {
          if (content.includes(cls)) {
            classMatches++;
            if (matchIndex === -1) matchIndex = content.indexOf(cls);
          }
        }
        if (classMatches > 0) {
          score += classMatches * 22;
          if (classMatches >= Math.min(3, selectedClasses.length)) score += 80;
        }

        for (const segment of domPath as string[]) {
          const cleanSegment = String(segment).replace(/^[a-z0-9-]+/i, '').replace(/[.#]/g, '');
          if (cleanSegment && content.includes(cleanSegment)) score += 12;
        }

        if (outerHTML && typeof outerHTML === 'string') {
          const attrNames = Array.from(outerHTML.matchAll(/\s([\w:-]+)=/g)).map(m => m[1]).slice(0, 8);
          for (const attrName of attrNames) {
            if (content.includes(attrName)) score += 6;
          }
        }

        if (tag && (content.includes(`<${tag}`) || content.includes(`text-${tag}`))) {
          score += 12;
          if (matchIndex === -1) matchIndex = content.indexOf(`<${tag}`);
        }

        if (matchIndex === -1) {
          matchIndex = findNeedleIndex(content);
        }

        if (matchIndex !== -1) {
          const focusedSnippet = extractFocusedJsxSnippet(content, matchIndex);
          if (focusedSnippet) {
            score += scoreSnippet(focusedSnippet.snippet);
            score -= Math.floor(focusedSnippet.snippet.length / 220);
          }
        }

        candidates.push({ ...file, content, score, matchIndex });
        if (score > bestScore) {
          bestScore = score;
          bestFile = { ...file, content, matchIndex };
        }
      } catch (err) {
        // Skip unreadable files
      }
    }

    const strongest = candidates.sort((a, b) => b.score - a.score)[0];
    if (strongest && strongest.score > bestScore) {
      bestFile = strongest;
      bestScore = strongest.score;
    }

    // Default fallbacks if no file scored above 0
    let targetFile = bestFile;
    if (!targetFile || bestScore <= 0) {
      // Look for App.tsx as logical default
      const probableFile = textFiles.find(f => ['App.tsx', 'App.jsx', 'index.html'].includes(f.name));
      if (probableFile) {
        try {
          targetFile = {
            ...probableFile,
            content: fs.readFileSync(probableFile.path, 'utf8'),
            matchIndex: -1
          };
        } catch {}
      }
    }

    if (!targetFile) {
      return res.status(404).json({ error: "No matching files or default files found in the workspace." });
    }

    let fileContentWindow = targetFile.content;
    let fileContent = targetFile.content;
    let filePath = targetFile.path;
    let matchIndex = typeof targetFile.matchIndex === 'number' ? targetFile.matchIndex : -1;
    if (matchIndex === -1) matchIndex = findNeedleIndex(fileContent);

    let relatedConnections: Array<{ fileName: string; filePath: string; name?: string }> = [];
    const htmlReferenceFile =
      /\.(html?|htm)$/i.test(targetFile.name)
        ? targetFile
        : candidates.find((candidate) => normalizePath(candidate.path) !== normalizePath(targetFile.path) && /\.(html?|htm)$/i.test(candidate.name));

    if (htmlReferenceFile?.content) {
      const linkedAssets = extractStaticLinkedAssets(htmlReferenceFile.content);
      relatedConnections = linkedAssets.map((asset) => ({
        fileName: path.basename(asset.path),
        filePath: normalizePath(asset.path),
        name: asset.kind === 'script' ? 'Linked script' : 'Linked stylesheet'
      }));

      if (/\.(html?|htm)$/i.test(targetFile.name) && linkedAssets.length > 0) {
        let promotedAsset: { name: string; path: string; content: string; score: number; matchIndex: number } | null = null;

        for (const asset of linkedAssets) {
          try {
            const content = fs.readFileSync(asset.path, 'utf8');
            const score = scoreRuntimeAsset(content.toLowerCase(), asset.kind);
            const rawMatchIndex = findNeedleIndex(content);
            const clsMatchIndex = selectedClasses.find((cls) => content.includes(cls));
            const matchIndexForAsset = rawMatchIndex !== -1
              ? rawMatchIndex
              : clsMatchIndex
                ? content.indexOf(clsMatchIndex)
                : runtimeHintTerms.find((term) => content.toLowerCase().includes(term))
                  ? content.toLowerCase().indexOf(runtimeHintTerms.find((term) => content.toLowerCase().includes(term)) as string)
                  : -1;

            if (!promotedAsset || score > promotedAsset.score) {
              promotedAsset = {
                name: path.basename(asset.path),
                path: normalizePath(asset.path),
                content,
                score,
                matchIndex: matchIndexForAsset
              };
            }
          } catch {
            // Ignore unreadable linked asset.
          }
        }

        if (promotedAsset && promotedAsset.score >= 180) {
          targetFile = promotedAsset;
          fileContent = promotedAsset.content;
          filePath = promotedAsset.path;
          fileContentWindow = promotedAsset.content;
          matchIndex = promotedAsset.matchIndex;
        }
      }
    }

    const exactElementSnippet = extractExactElementSnippet(fileContent);
    const extractedSnippet = exactElementSnippet || extractBalancedSnippet(fileContent, matchIndex);
    if (typeof extractedSnippet === 'string') {
      fileContentWindow = extractedSnippet;
    } else {
      fileContentWindow = extractedSnippet.snippet;
    }
    const lineMetadata = typeof extractedSnippet === 'string'
      ? getLineRangeForSnippet(fileContent, fileContentWindow, matchIndex)
      : {
          lineNumber: extractedSnippet.lineNumber,
          lineRangeStart: extractedSnippet.lineRangeStart,
          lineRangeEnd: extractedSnippet.lineRangeEnd
        };

    if (exactElementSnippet?.exact) {
      return res.json({
        success: true,
        analysis: {
          fileName: targetFile.name,
          filePath: filePath,
          specificCode: exactElementSnippet.snippet,
          lineNumber: exactElementSnippet.lineNumber,
          lineRangeStart: exactElementSnippet.lineRangeStart,
          lineRangeEnd: exactElementSnippet.lineRangeEnd,
          connections: relatedConnections,
          elementWork: buildElementWork()
        }
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      // Local Heuristic Fallback if Google Gemini API key is missing
      const specificSnippet = fileContentWindow.substring(0, 1000);
      return res.json({
        success: true,
        analysis: {
          fileName: targetFile.name,
          filePath: filePath,
          specificCode: specificSnippet,
          lineNumber: lineMetadata.lineNumber,
          lineRangeStart: lineMetadata.lineRangeStart,
          lineRangeEnd: lineMetadata.lineRangeEnd,
          connections: relatedConnections,
          elementWork: `Controls the UI view and rendering logic for selected <${tag}> element on the preview viewport.`
        }
      });
    }

    // Call Gemini
    try {
      const cssSelector = `${tag}${id ? `#${id}` : ''}${classes ? `.${classes.split(/\s+/)[0]}` : ''}`;
      const prompt = `You are a developer tool. I have selected an HTML/JSX element from a live web preview:
- CSS Selector: ${cssSelector}
- Tag Name: <${tag}>
- Classes: ${classes}
- Text content: "${text || ''}"
- Placeholder: "${placeholder || ''}"
- Image src: "${src || ''}"
- Link href: "${href || ''}"

This element was traced to reside in the source file: "${targetFile.name}" (at path: "${filePath}").
We have extracted the relevant section of that file's code:
\`\`\`
${fileContentWindow}
\`\`\`

Based on this content, extract/formulate the 4 parts required. Return a valid RAW JSON object matching this schema exactly (without any markdown block wrapper):
{
  "fileName": "The clean filename, e.g. '${targetFile.name}'",
  "filePath": "The path to the file, e.g. '${filePath}'",
  "lineNumber": ${lineMetadata.lineNumber || sourceHint?.lineNumber || 1},
  "lineRangeStart": ${lineMetadata.lineRangeStart || sourceHint?.lineNumber || 1},
  "lineRangeEnd": ${lineMetadata.lineRangeEnd || sourceHint?.lineNumber || 1},
  "specificCode": "The specific functional subset of code from the file that controls/renders this element. Include its event handlers, styling, attributes or properties. Keep it to a clean and perfectly formatted block of code.",
  "connections": [
    { "fileName": "Name of connected/imported/associated file", "filePath": "Path of the connected file" }
  ],
  "elementWork": "A highly professional, developer-focused 1-2 sentence description explaining exactly what this clicked element does, how it works, and its role in the interface."
}

Ensure the JSON is perfectly valid and matches the requested keys. Output only raw JSON text. No markdown backticks.`;

      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            responseMimeType: "application/json"
          }
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 20000
        }
      );

      let responseText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      responseText = responseText.trim();
      if (responseText.startsWith('```json')) {
        responseText = responseText.substring(7, responseText.length - 3).trim();
      } else if (responseText.startsWith('```')) {
        responseText = responseText.substring(3, responseText.length - 3).trim();
      }

      const parsed = JSON.parse(responseText);
      return res.json({
        success: true,
        analysis: {
          fileName: parsed.fileName || targetFile.name,
          filePath: parsed.filePath || filePath,
          lineNumber: parsed.lineNumber || lineMetadata.lineNumber || sourceHint?.lineNumber,
          lineRangeStart: parsed.lineRangeStart || lineMetadata.lineRangeStart || parsed.lineNumber || sourceHint?.lineNumber,
          lineRangeEnd: parsed.lineRangeEnd || lineMetadata.lineRangeEnd || parsed.lineNumber || sourceHint?.lineNumber,
          specificCode: parsed.specificCode || fileContentWindow.substring(0, 1000),
          connections: Array.isArray(parsed.connections) && parsed.connections.length > 0 ? parsed.connections : relatedConnections,
          elementWork: parsed.elementWork || `Controls interaction and state updates for this selected <${tag}> element.`
        }
      });

    } catch (err: any) {
      console.error("Gemini inspect analysis failed, using fallback:", err.message);
      return res.json({
        success: true,
        analysis: {
          fileName: targetFile.name,
          filePath: filePath,
          lineNumber: lineMetadata.lineNumber,
          lineRangeStart: lineMetadata.lineRangeStart,
          lineRangeEnd: lineMetadata.lineRangeEnd,
          specificCode: fileContentWindow.substring(0, 1000),
          connections: relatedConnections,
          elementWork: `Controls state updates and visual layout representation for the selected <${tag}> element.`
        }
      });
    }
  });

  // ─── RAG Document Database API Endpoints ─────────────────────────────────
  app.get("/api/rag/stats", (req, res) => {
    try {
      res.json(ragBackend.getStats());
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/rag/documents", (req, res) => {
    try {
      res.json(ragBackend.getDocuments());
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/rag/upload", async (req, res) => {
    const { fileName, base64, mimeType } = req.body;
    if (!base64 || !fileName) {
      return res.status(400).json({ error: "fileName and base64 payloads match required fields" });
    }
    try {
      const buffer = Buffer.from(base64.replace(/^data:[^;]+;base64,/, ''), 'base64');
      const doc = await ragBackend.addDocument(fileName, mimeType || 'text/plain', buffer);
      res.json({ success: true, document: doc });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/rag/documents/:id", async (req, res) => {
    try {
      const success = await ragBackend.deleteDocument(req.params.id);
      res.json({ success });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/rag/settings", (req, res) => {
    try {
      res.json(ragBackend.getSettings());
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/rag/settings", (req, res) => {
    try {
      const updated = ragBackend.saveSettings(req.body);
      res.json(updated);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/rag/logs", (req, res) => {
    try {
      res.json(ragBackend.getLogs());
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/rag/rebuild", async (req, res) => {
    try {
      // Run as promise background task so we don't block request loop
      ragBackend.rebuildIndex().catch(err => {
        ragBackend.log('error', `Reindexing pipeline error: ${err.message || err}`);
      });
      res.json({ success: true, message: "Reindexing process launched" });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/rag/clear", async (req, res) => {
    try {
      await ragBackend.clearAll();
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/rag/query", async (req, res) => {
    const { query, limit, documentIds } = req.body;
    if (!query) {
      return res.status(400).json({ error: "query text is required" });
    }
    try {
      const matches = await ragBackend.retrieve(query, limit || 5, documentIds);
      res.json(matches);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Document Parsing Service
  app.post("/api/parse-doc", async (req, res) => {
    const { fileName, base64, mimeType } = req.body;
    if (!base64) {
      return res.status(400).json({ error: "base64 file content is required" });
    }

    try {
      const buffer = Buffer.from(base64, 'base64');
      let extractedText = '';

      const lowerName = (fileName || '').toLowerCase();
      if (lowerName.endsWith('.pdf') || mimeType === 'application/pdf') {
        const data = await pdf(buffer);
        extractedText = data.text || '';
      } else if (lowerName.endsWith('.docx') || mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const result = await mammoth.extractRawText({ buffer });
        extractedText = result.value || '';
      } else {
        // Fallback: try reading as plain utf-8 text
        extractedText = buffer.toString('utf8');
      }

      res.json({ text: extractedText });
    } catch (error: any) {
      console.error("Error parsing document:", error);
      res.status(500).json({ error: error.message || "Failed to parse document" });
    }
  });

  // AI Chat Completion Proxy
  app.post("/api/chat", async (req, res) => {
    // RAG Context Injection
    let finalSystemPrompt = req.body.systemPrompt || '';
    const { ragConfig, messages } = req.body;
    
    if (ragConfig && ragConfig.enabled && Array.isArray(ragConfig.activeDocumentIds) && ragConfig.activeDocumentIds.length > 0) {
      try {
        const lastMsg = messages[messages.length - 1];
        let userQuery = '';
        if (lastMsg && lastMsg.role === 'user') {
          if (typeof lastMsg.content === 'string') {
            userQuery = lastMsg.content;
          } else if (Array.isArray(lastMsg.content)) {
            const textPart = lastMsg.content.find((c: any) => c.type === 'text');
            userQuery = textPart?.text || '';
          }
        }
        
        if (userQuery) {
          const matchedChunks = await ragBackend.retrieve(userQuery, 5, ragConfig.activeDocumentIds);
          if (matchedChunks && matchedChunks.length > 0) {
            const contextStr = matchedChunks.map(m => {
              const loc = m.chunk.pageNumber ? `Page ${m.chunk.pageNumber}` : (m.chunk.section ? `Section: ${m.chunk.section}` : 'General');
              return `--- START OF FRAGMENT ---
Source Document: ${m.chunk.documentName}
Location Reference: ${loc}

${m.chunk.content}
--- END OF FRAGMENT ---`;
            }).join('\n\n');
            
            const ragInstruction = `Answer the user's question using the provided DOCUMENT CONTEXT whenever possible. 
If information exists in these uploaded documents, prioritize those documents over general model knowledge.
Always cite the source document name and reference (page/section) when using information from it. In your markdown response, cite it elegantly like "[Source: DocumentName.pdf (Page X)]".
If the answer is not found in the documents, state that clearly rather than hallucinating.

DOCUMENT CONTEXT:
${contextStr}`;
            
            finalSystemPrompt = finalSystemPrompt 
              ? `${finalSystemPrompt}\n\n${ragInstruction}`
              : ragInstruction;
          }
        }
      } catch (err: any) {
        console.error("RAG Context Injection error:", err);
      }
    }

    const { model, config, tools, stream = true } = req.body;
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "messages array is required" });
    }

    // Debug: check for vision content
    const hasArrayContent = messages.some((m: any) => Array.isArray(m.content));
    if (hasArrayContent) {
      const visionMsg = messages.find((m: any) => Array.isArray(m.content));
      console.log('[LUMINA_DEBUG] /api/chat received vision message');
      console.log('[LUMINA_DEBUG] Content types:', visionMsg?.content?.map((c: any) => c.type));
      const imgPart = visionMsg?.content?.find((c: any) => c.type === 'image_url');
      if (imgPart) {
        console.log('[LUMINA_DEBUG] Image URL length:', imgPart.image_url?.url?.length || 0);
        console.log('[LUMINA_DEBUG] Image URL prefix:', (imgPart.image_url?.url || '').substring(0, 60));
      }
    }

    // Determine provider configuration
    let provider = 'openai-compatible';
    let baseUrl = '';
    let apiKey = '';

    if (config) {
      provider = config.provider || 'openai-compatible';
      baseUrl = config.baseUrl || '';
      apiKey = config.apiKey || '';
    }

    // Resolve endpoint based on the selected model/provider from agentApiKeys
    // If no config provided, try to infer from the model name
    if (!config || !config.baseUrl) {
      const modelLower = (model || '').toLowerCase();
      
      // Google Gemini models
      if (modelLower.includes('gemini')) {
        provider = 'google-gemini';
        baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
        apiKey = process.env.GEMINI_API_KEY || '';
      }
      // OpenAI models
      else if (modelLower.startsWith('gpt') || modelLower.startsWith('o1') || modelLower.startsWith('o3')) {
        provider = 'openai';
        baseUrl = 'https://api.openai.com/v1';
        apiKey = process.env.OPENAI_API_KEY || '';
      }
      // Anthropic Claude models
      else if (modelLower.includes('claude')) {
        provider = 'anthropic';
        baseUrl = 'https://api.anthropic.com/v1';
        apiKey = process.env.ANTHROPIC_API_KEY || '';
      }
      // DeepSeek models
      else if (modelLower.includes('deepseek')) {
        provider = 'openai-compatible';
        baseUrl = 'https://api.deepseek.com/v1';
        apiKey = process.env.DEEPSEEK_API_KEY || '';
      }
      // Groq models
      else if (modelLower.includes('groq') || modelLower.includes('llama')) {
        provider = 'openai-compatible';
        baseUrl = 'https://api.groq.com/openai/v1';
        apiKey = process.env.GROQ_API_KEY || '';
      }
      // Ollama local
      else if (modelLower.includes('ollama')) {
        provider = 'openai-compatible';
        baseUrl = 'http://localhost:11434/v1';
        apiKey = '';
      }
      // LM Studio local
      else if (modelLower.includes('lm-studio') || modelLower.includes('lm studio')) {
        provider = 'openai-compatible';
        baseUrl = 'http://localhost:1234/v1';
        apiKey = '';
      }
      // Sarvam AI models
      else if (modelLower.includes('sarvam')) {
        provider = 'openai-compatible';
        baseUrl = 'https://api.sarvam.ai/v1';
        apiKey = process.env.SARVAM_API_KEY || '';
      }
      // Kilo AI models
      else if (modelLower.includes('kilo')) {
        provider = 'openai-compatible';
        baseUrl = 'https://api.kilo.ai/api/gateway';
        apiKey = process.env.KILO_API_KEY || '';
      }
      // OpenCode models
      else if (modelLower.includes('opencode') || modelLower.includes('big pickle') || modelLower.includes('big-pickle') || modelLower.includes('bigpickle')) {
        provider = 'opencode';
        baseUrl = 'https://opencode.ai/zen/v1';
        apiKey = process.env.OPENCODE_API_KEY || '';
      }
      // Cline models
      else if (modelLower.includes('cline')) {
        provider = 'openai-compatible';
        baseUrl = 'https://api.cline.bot';
        apiKey = process.env.CLINE_API_KEY || '';
      }
      // Default fallback to environment variable
      else {
        provider = 'openai-compatible';
        baseUrl = process.env.AI_BASE_URL || 'http://localhost:11434/v1';
        apiKey = process.env.AI_API_KEY || '';
      }
    }

    // Build the API messages array with system prompt
    const apiMessages: any[] = [];
    if (finalSystemPrompt) {
      apiMessages.push({ role: 'system', content: finalSystemPrompt });
    }
    apiMessages.push(...messages.map((m: any) => {
      const msg: any = { role: m.role, content: m.content };
      if (m.tool_calls && Array.isArray(m.tool_calls)) {
        msg.tool_calls = m.tool_calls;
      }
      if (m.tool_call_id) {
        msg.tool_call_id = m.tool_call_id;
      }
      if (m.name) {
        msg.name = m.name;
      }
      return msg;
    }));

    try {
      if (provider === 'anthropic' || provider === 'opencode') {
        // Anthropic/OpenCode uses a different API format (x-api-key auth, /v1/messages)
        const response = await axios.post(
          `${baseUrl}/messages`,
          {
            model: model || 'claude-3-5-sonnet-20241022',
            max_tokens: 4096,
            system: finalSystemPrompt || undefined,
            messages: messages.map((m: any) => ({
              role: m.role === 'assistant' ? 'assistant' : 'user',
              content: m.content
            })),
            stream: true
          },
          {
            headers: {
              'x-api-key': apiKey,
              'anthropic-version': '2023-06-01',
              'Content-Type': 'application/json'
            },
            responseType: 'stream',
            timeout: 60000
          }
        );

        // Transform Anthropic stream to OpenAI-compatible SSE format
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        const decoder = new TextDecoder();
        response.data.on('data', (chunk: Buffer) => {
          const text = decoder.decode(chunk, { stream: true });
          const lines = text.split('\n').filter((l: string) => l.trim());
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.type === 'content_block_delta' && data.delta?.text) {
                  res.write(data.delta.text);
                }
              } catch {}
            }
          }
        });
        response.data.on('end', () => res.end());
        response.data.on('error', (err: any) => {
          console.error('Anthropic stream error:', err);
          res.end();
        });
        return;
      }

      if (provider === 'google-gemini') {
        // Google Gemini API format
        const url = `${baseUrl}/models/${model || 'gemini-2.5-flash'}:streamGenerateContent?alt=sse&key=${apiKey}`;
        const response = await axios.post(
          url,
          {
            contents: apiMessages.map((m: any) => ({
              role: m.role === 'assistant' ? 'model' : 'user',
              parts: [{ text: m.content }]
            })),
            systemInstruction: finalSystemPrompt ? {
              parts: [{ text: finalSystemPrompt }]
            } : undefined,
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 8192
            }
          },
          {
            headers: { 'Content-Type': 'application/json' },
            responseType: 'stream',
            timeout: 60000
          }
        );

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        const decoder = new TextDecoder();
        response.data.on('data', (chunk: Buffer) => {
          const text = decoder.decode(chunk, { stream: true });
          const lines = text.split('\n').filter((l: string) => l.trim());
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
                  res.write(data.candidates[0].content.parts[0].text);
                }
              } catch {}
            }
          }
        });
        response.data.on('end', () => res.end());
        response.data.on('error', (err: any) => {
          console.error('Gemini stream error:', err);
          res.end();
        });
        return;
      }

      // Default: OpenAI-compatible streaming
      const hasTools = tools && Array.isArray(tools) && tools.length > 0;
      const requestBody: any = {
        model: model || 'gpt-4o-mini',
        messages: apiMessages,
        stream: stream !== false,
        max_tokens: hasTools ? 2048 : 4096,
        temperature: 0.7
      };

      if (hasTools) {
        requestBody.tools = tools;
        requestBody.tool_choice = 'auto';
      }

      const MAX_RETRIES = 3;
      const wait = (ms: number) => new Promise(r => setTimeout(r, ms));

      if (stream === false) {
        let response;
        let lastError: any;

        for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
          try {
            response = await axios.post(
              `${baseUrl}/chat/completions`,
              requestBody,
              {
                headers: {
                  'Content-Type': 'application/json',
                  ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {})
                },
                timeout: 60000
              }
            );
            break;
          } catch (toolChoiceError: any) {
            lastError = toolChoiceError;

            // Retry on rate limit (429) with exponential backoff
            if (toolChoiceError.response?.status === 429 && attempt < MAX_RETRIES) {
              const delay = getRetryDelayMs(toolChoiceError, Math.pow(2, attempt) * 1000);
              console.warn(`Rate limited (429), retry ${attempt + 1}/${MAX_RETRIES} in ${delay}ms...`);
              await wait(delay);
              continue;
            }

            const upstreamDetail = JSON.stringify(toolChoiceError.response?.data || '').toLowerCase();
            const canRetryWithoutToolChoice = requestBody.tool_choice && (
              upstreamDetail.includes('tool_choice') ||
              upstreamDetail.includes('unsupported') ||
              upstreamDetail.includes('extra_forbidden') ||
              upstreamDetail.includes('unrecognized')
            );
            if (!canRetryWithoutToolChoice) throw toolChoiceError;

            const retryBody = { ...requestBody };
            delete retryBody.tool_choice;
            try {
              response = await axios.post(
                `${baseUrl}/chat/completions`,
                retryBody,
                {
                  headers: {
                    'Content-Type': 'application/json',
                    ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {})
                  },
                  timeout: 60000
                }
              );
              break;
            } catch (retryError: any) {
              lastError = retryError;
              if (retryError.response?.status === 429 && attempt < MAX_RETRIES) {
                const delay = getRetryDelayMs(retryError, Math.pow(2, attempt) * 1000);
                console.warn(`Rate limited (429) on tool_choice fallback, retry ${attempt + 1}/${MAX_RETRIES} in ${delay}ms...`);
                await wait(delay);
                continue;
              }
              throw retryError;
            }
          }
        }

        if (!response) throw lastError || new Error('Chat completion failed after retries');
        return res.json(response.data);
      }

      let response;
      let lastError: any;

      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          response = await axios.post(
            `${baseUrl}/chat/completions`,
            requestBody,
            {
              headers: {
                'Content-Type': 'application/json',
                ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {})
              },
              responseType: 'stream',
              timeout: 60000
            }
          );
          break;
        } catch (error: any) {
          lastError = error;
          if (error.response?.status === 429 && attempt < MAX_RETRIES) {
            const delay = getRetryDelayMs(error, Math.pow(2, attempt) * 1000);
            console.warn(`Rate limited (429) on stream, retry ${attempt + 1}/${MAX_RETRIES} in ${delay}ms...`);
            await wait(delay);
            continue;
          }
          throw error;
        }
      }

      if (!response) throw lastError || new Error('Chat completion failed after retries');

      // Stream the response back to the client
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const decoder = new TextDecoder();
      response.data.on('data', (chunk: Buffer) => {
        const text = decoder.decode(chunk, { stream: true });
        const lines = text.split('\n').filter((l: string) => l.trim());
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6);
            if (dataStr === '[DONE]') {
              res.end();
              return;
            }
            try {
              const data = JSON.parse(dataStr);
              const content = data.choices?.[0]?.delta?.content || '';
              if (content) {
                res.write(content);
              }
            } catch {}
          }
        }
      });
      response.data.on('end', () => res.end());
      response.data.on('error', (err: any) => {
        console.error('Stream error:', err);
        res.end();
      });

    } catch (e: any) {
      const detail = getUpstreamErrorDetail(e);
      console.error('Chat API Error:', detail);
      // If streaming headers haven't been set yet, send JSON error
      if (!res.headersSent) {
        res.status(getUpstreamErrorStatus(e)).json({ error: 'Chat completion failed', detail });
      } else {
        res.end();
      }
    }
  });

  // Keep a minimal stub for backward compatibility
  app.get("/api/v1/tools", (req, res) => {
    res.json({ tools: [] });
  });

  app.post("/api/list_tools", (req, res) => {
    res.json({ tools: [] });
  });

  // ─── llama.cpp Management ─────────────────────────────────────────────────────
  let llamaServerProcess: ChildProcessWithoutNullStreams | null = null;

  const getLlamaInstallDir = () => {
    return path.join(getLuminaDataDir(), 'llama');
  };

  const extractZip = async (zipPath: string, destDir: string): Promise<void> => {
    fs.mkdirSync(destDir, { recursive: true });
    if (process.platform === 'win32') {
      await new Promise<void>((resolve, reject) => {
        const ps = spawn('powershell', [
          '-NoProfile', '-NonInteractive',
          '-Command',
          `Expand-Archive -Path '${zipPath}' -DestinationPath '${destDir}' -Force`
        ]);
        ps.on('close', (code) => code === 0 ? resolve() : reject(new Error(`Extract-Archive exited with code ${code}`)));
        ps.on('error', reject);
      });
    } else {
      await new Promise<void>((resolve, reject) => {
        const proc = spawn('unzip', ['-o', zipPath, '-d', destDir]);
        proc.on('close', (code) => code === 0 ? resolve() : reject(new Error(`unzip exited with code ${code}`)));
        proc.on('error', reject);
      });
    }
  };

  const killProcess = (proc: ChildProcessWithoutNullStreams | null) => {
    if (!proc) return;
    try {
      if (process.platform === 'win32') {
        spawn('taskkill', ['/pid', proc.pid?.toString() || '', '/f', '/t']);
      } else {
        proc.kill('SIGTERM');
        setTimeout(() => proc.kill('SIGKILL'), 3000);
      }
    } catch {}
  };

  // Download and extract a llama.cpp release
  app.post("/api/llama/download", async (req, res) => {
    const { url, fileName, releaseTag } = req.body;
    if (!url || !fileName) {
      return res.status(400).json({ error: 'url and fileName are required' });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const sendEvent = (data: any) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    const installDir = getLlamaInstallDir();
    const releaseDir = path.join(installDir, `llama.cpp-release-${releaseTag || 'latest'}`);
    fs.mkdirSync(releaseDir, { recursive: true });

    const zipPath = path.join(installDir, fileName);
    const logs: string[] = [];
    const addLog = (msg: string) => {
      logs.push(`[${new Date().toLocaleTimeString()}] ${msg}`);
    };

    try {
      addLog(`Starting download: ${fileName}`);
      addLog(`Target: ${url}`);

      const writer = fs.createWriteStream(zipPath);
      const response = await axios({
        method: 'GET',
        url,
        responseType: 'stream',
        timeout: 300000,
      });

      const contentLength = response.headers['content-length'];
      const totalSize = parseInt(String(contentLength || '0'), 10);
      let downloaded = 0;
      let lastChunkTime = Date.now();
      let lastDownloaded = 0;

      const progressInterval = setInterval(() => {
        const now = Date.now();
        const elapsed = (now - lastChunkTime) / 1000;
        const chunkBytes = downloaded - lastDownloaded;
        const speed = elapsed > 0 ? chunkBytes / elapsed : 0;

        sendEvent({
          type: 'progress',
          stage: 'download',
          percent: totalSize > 0 ? Math.min(Math.round((downloaded / totalSize) * 100), 99) : 0,
          downloaded: (downloaded / 1024 / 1024).toFixed(1) + ' MB',
          total: totalSize > 0 ? (totalSize / 1024 / 1024).toFixed(1) + ' MB' : 'Unknown',
          speed: speed > 0 ? (speed / 1024 / 1024).toFixed(1) + ' MB/s' : 'Calculating...',
        });

        lastChunkTime = now;
        lastDownloaded = downloaded;
      }, 200);

      response.data.on('data', (chunk: Buffer) => {
        downloaded += chunk.length;
      });

      response.data.pipe(writer);

      await new Promise<void>((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', (err) => {
          clearInterval(progressInterval);
          reject(err);
        });
      });

      clearInterval(progressInterval);

      sendEvent({
        type: 'progress',
        stage: 'download',
        percent: 100,
        downloaded: (downloaded / 1024 / 1024).toFixed(1) + ' MB',
        total: totalSize > 0 ? (totalSize / 1024 / 1024).toFixed(1) + ' MB' : (downloaded / 1024 / 1024).toFixed(1) + ' MB',
        speed: 'Done',
      });

      addLog(`Download complete (${(downloaded / 1024 / 1024).toFixed(1)} MB)`);
      sendEvent({ type: 'status', message: 'Extracting...' });

      addLog(`Extracting to: ${releaseDir}`);
      sendEvent({
        type: 'progress',
        stage: 'extract',
        percent: 0,
      });

      await extractZip(zipPath, releaseDir);

      sendEvent({
        type: 'progress',
        stage: 'extract',
        percent: 100,
      });

      addLog('Extraction complete');

      try { fs.unlinkSync(zipPath); } catch {}

      // Find binary files in the extracted directory
      const findBinaries = (dir: string, depth = 0): string[] => {
        if (depth > 4) return [];
        const results: string[] = [];
        try {
          const entries = fs.readdirSync(dir, { withFileTypes: true });
          for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
              results.push(...findBinaries(fullPath, depth + 1));
            } else if (entry.isFile()) {
              const lower = entry.name.toLowerCase();
              if (lower.includes('llama-') || lower.endsWith('.exe')) {
                results.push(fullPath);
              }
            }
          }
        } catch {}
        return results;
      };

      const binaries = findBinaries(releaseDir);
      addLog(`Found ${binaries.length} binaries`);

      // Make binaries executable on non-Windows
      if (process.platform !== 'win32') {
        for (const bin of binaries) {
          try {
            fs.chmodSync(bin, 0o755);
            addLog(`chmod +x ${path.basename(bin)}`);
          } catch {}
        }
      }

      const config = {
        version: releaseTag || 'latest',
        fileName,
        installedAt: new Date().toISOString(),
        path: releaseDir,
        binaries,
        size: `${(totalSize / 1024 / 1024).toFixed(1)} MB`,
        url,
      };

      sendEvent({ type: 'complete', success: true, config, logs });
      res.end();
    } catch (err: any) {
      addLog(`Error: ${err.message}`);
      try { fs.unlinkSync(zipPath); } catch {}
      sendEvent({ type: 'error', message: err.message, logs });
      res.end();
    }
  });

  // Calculate GPU layers and read model metadata using 'gguf'
  app.post("/api/llama/gpu-recommendation", async (req, res) => {
    const { modelPath, reserveVRAM = 512 * 1024 * 1024 } = req.body;
    if (!modelPath) {
      return res.status(400).json({ error: "modelPath is required" });
    }

    // Resolve path: support mapped Windows user format and absolute/relative maps
    let resolvedPath = modelPath.replace(/\\/g, '/');
    const match = resolvedPath.match(/^C:\/Users\/([^\/]+)\/(.*)$/i);
    if (match) {
      resolvedPath = path.join(os.homedir(), match[2]);
    } else {
      resolvedPath = path.resolve(resolvedPath);
    }

    if (!fs.existsSync(resolvedPath)) {
      return res.status(404).json({ error: `Model file not found at: ${resolvedPath}` });
    }

    try {
      const getGPUDetails = async () => {
        const results: { gpus: any[]; summary: any } = {
          gpus: [],
          summary: {}
        };

        const detectGPUType = (gpu: any) => {
          const model = (gpu.model || "").toLowerCase();
          const vendor = (gpu.vendor || "").toLowerCase();
          if (gpu.vramDynamic) return "Integrated (Shared VRAM)";
          if (model.includes("intel") || vendor.includes("intel")) return "Integrated";
          if (model.includes("radeon") && model.includes("graphics")) return "Integrated (APU)";
          return "Discrete";
        };

        const detectTypeFromName = (name = "") => {
          const n = name.toLowerCase();
          if (n.includes("intel") || n.includes("iris") || n.includes("uhd")) return "Integrated";
          if (n.includes("rtx") || n.includes("gtx") || n.includes("rx 6") || n.includes("rx 7")) return "Discrete";
          if (n.includes("radeon") && !n.includes("rx")) return "Integrated (APU)";
          return "Unknown";
        };

        // 1. systeminformation
        try {
          const graphics = await si.graphics();
          if (graphics && graphics.controllers) {
            for (const gpu of graphics.controllers) {
              results.gpus.push({
                vendor: gpu.vendor,
                model: gpu.model,
                vramMB: gpu.vram,
                vramDynamic: gpu.vramDynamic,
                bus: gpu.bus,
                driverVersion: gpu.driverVersion,
                type: detectGPUType(gpu),
                source: "systeminformation"
              });
            }
          }
        } catch (e) {
          console.error("si.graphics error:", e);
        }

        // 2. nvidia-smi
        try {
          const raw = spawnSync(
            "nvidia-smi",
            ["--query-gpu=name,memory.total,memory.free,memory.used", "--format=csv,noheader,nounits"],
            { timeout: 5000, encoding: "utf8" }
          ).stdout?.trim();

          if (raw) {
            raw.split("\n").forEach((line) => {
              const [name, total, free, used] = line.split(",").map(s => s.trim());
              const existing = results.gpus.find(g =>
                g.model?.toLowerCase().includes(name?.toLowerCase().split(" ")[1])
              );
              const nvidiaData = {
                vendor: "NVIDIA",
                model: name,
                type: "Discrete",
                vramTotalMB: parseInt(total, 10),
                vramFreeMB: parseInt(free, 10),
                vramUsedMB: parseInt(used, 10),
                vramMB: parseInt(total, 10),
                source: "nvidia-smi",
              };
              if (existing) {
                Object.assign(existing, nvidiaData);
              } else {
                results.gpus.push(nvidiaData);
              }
            });
          }
        } catch {}

        // 3. WMIC (Windows fallback)
        if (process.platform === "win32") {
          try {
            const raw = spawnSync(
              "wmic",
              ["path", "Win32_VideoController", "get", "Name,AdapterRAM,AdapterDACType,VideoProcessor", "/format:csv"],
              { timeout: 5000, encoding: "utf8" }
            ).stdout;

            if (raw) {
              const lines = raw.split("\n").filter(l => l.includes(",") && !l.startsWith("Node"));
              for (const line of lines) {
                const parts = line.split(",");
                const adapterRAM = parseInt(parts[2], 10);
                const name = parts[3]?.trim();
                if (!name) continue;

                const vramMB = adapterRAM > 0 ? Math.round(adapterRAM / 1024 / 1024) : 0;
                const existing = results.gpus.find(g =>
                  g.model?.toLowerCase().includes(name.toLowerCase().substring(0, 10))
                );
                const wmicData = {
                  model: name,
                  vramMB,
                  vramNote: adapterRAM === 0
                    ? "Shared/Dynamic (actual size set by OS)"
                    : `${vramMB} MB`,
                  source: "wmic",
                  type: detectTypeFromName(name),
                };
                if (existing) {
                  Object.assign(existing, wmicData);
                } else {
                  results.gpus.push(wmicData);
                }
              }
            }
          } catch {}

          // 4. PowerShell Windows fallback
          try {
            const psCmd = `Get-CimInstance Win32_VideoController | Select-Object -Property Name, AdapterRAM, CurrentHorizontalResolution, AdapterCompatibility | ConvertTo-Json`.replace(/\n/g, " ");
            const raw = spawnSync(`powershell.exe`, ["-Command", psCmd], { timeout: 8000, encoding: "utf8" }).stdout;
            if (raw) {
              const parsed = JSON.parse(raw);
              const gpuList = Array.isArray(parsed) ? parsed : [parsed];

              for (const g of gpuList) {
                if (!g || !g.Name) continue;
                const existing = results.gpus.find(gpu =>
                  gpu.model?.toLowerCase().includes(g.Name?.toLowerCase().substring(0, 10))
                );
                const psData = {
                  model: g.Name,
                  adapterCompatibility: g.AdapterCompatibility,
                  vramMB: g.AdapterRAM ? Math.round(g.AdapterRAM / 1024 / 1024) : 0,
                  source: "powershell",
                };
                if (existing) {
                  Object.assign(existing, psData);
                } else {
                  results.gpus.push(psData);
                }
              }
            }
          } catch {}
        }

        // 5. Linux AMD / lspci fallback
        if (process.platform === "linux") {
          try {
            const amd = fs.readFileSync("/sys/class/drm/card0/device/mem_info_vram_total", "utf8").trim();
            if (amd) {
              const vramBytes = parseInt(amd, 10);
              const vramMB = Math.round(vramBytes / 1024 / 1024);
              results.gpus.push({
                vendor: "AMD",
                model: "AMD Radeon GPU (Linux Core)",
                type: "Discrete",
                vramMB,
                vramTotalMB: vramMB,
                source: "/sys/class/drm"
              });
            }
          } catch {}
        }

        // Calculate summary
        results.summary = {
          totalGPUs: results.gpus.length,
          hasNvidiaDiscrete: results.gpus.some(g => g.vendor?.includes("NVIDIA") || g.model?.includes("NVIDIA")),
          hasAMDDiscrete: results.gpus.some(g => g.vendor?.includes("AMD") && g.type === "Discrete"),
          hasIntegrated: results.gpus.some(g => g.type === "Integrated"),
          totalDedicatedVRAM_MB: results.gpus
            .filter(g => g.type === "Discrete")
            .reduce((sum, g) => sum + (g.vramTotalMB || g.vramMB || 0), 0),
        };

        return results;
      };

      const details = await getGPUDetails();
      let vramTotal = 8192 * 1024 * 1024; // Default fallback to 8GB

      // Determine the best VRAM output
      const discreteGPUs = details.gpus.filter(g => g.type === "Discrete" && (g.vramTotalMB || g.vramMB));
      if (discreteGPUs.length > 0) {
        const bestGPU = discreteGPUs.reduce((prev, current) => {
          const prevVal = prev.vramTotalMB || prev.vramMB || 0;
          const currVal = current.vramTotalMB || current.vramMB || 0;
          return prevVal > currVal ? prev : current;
        });
        vramTotal = (bestGPU.vramTotalMB || bestGPU.vramMB) * 1024 * 1024;
      } else {
        const anyGPU = details.gpus.find(g => (g.vramTotalMB || g.vramMB));
        if (anyGPU) {
          vramTotal = (anyGPU.vramTotalMB || anyGPU.vramMB) * 1024 * 1024;
        } else if (process.platform === 'darwin') {
          vramTotal = Math.floor(os.totalmem() * 0.6);
        } else {
          vramTotal = Math.floor(os.totalmem() * 0.4);
        }
      }

      const { parseRawMetadata } = (await import("gguf")) as any;
      const { metadata } = await parseRawMetadata(resolvedPath);

      let numLayers = 0;
      for (const key of Object.keys(metadata)) {
        if (key.endsWith('.block_count')) {
          numLayers = Number(metadata[key]);
          break;
        }
      }
      if (!numLayers) {
        numLayers = Number(
          metadata["llama.block_count"] ||
          metadata["phi3.block_count"] ||
          metadata["mistral.block_count"] ||
          metadata["gemma.block_count"] ||
          metadata["qwen2.block_count"] ||
          32
        );
      }

      const architecture = metadata["general.architecture"] || "unknown";
      const name = metadata["general.name"] || path.basename(resolvedPath, '.gguf');

      const modelSizeBytes = fs.statSync(resolvedPath).size;
      const bytesPerLayer = modelSizeBytes / numLayers;
      const usableVRAM = vramTotal - reserveVRAM;
      const maxLayers = Math.floor(usableVRAM / bytesPerLayer);
      const recommendedLayers = Math.max(0, Math.min(maxLayers, numLayers));

      res.json({
        success: true,
        vramTotal: (vramTotal / 1024 / 1024).toFixed(0) + " MB",
        modelSize: (modelSizeBytes / 1024 / 1024).toFixed(0) + " MB",
        totalLayers: numLayers,
        bytesPerLayer: (bytesPerLayer / 1024 / 1024).toFixed(1) + " MB",
        recommendedLayers,
        fullyOffloaded: recommendedLayers >= numLayers,
        architecture,
        name,
        metadata: {
          file_size: modelSizeBytes,
          context_length: (() => {
            const key = Object.keys(metadata).find(k => k.endsWith('.context_length'));
            if (key && metadata[key]) return Number(metadata[key]);
            return Number(
              metadata["llama.context_length"] ||
              metadata["gemma.context_length"] ||
              metadata["phi3.context_length"] ||
              metadata["qwen2.context_length"] ||
              metadata["mistral.context_length"] ||
              null
            );
          })(),
          attention_head_count: metadata["llama.attention.head_count"] || null,
          feed_forward_length: metadata["llama.feed_forward_length"] || null,
        }
      });
    } catch (err: any) {
      console.error("GGUF Calculation Error:", err);
      res.status(500).json({ error: `GGUF metadata parsing error: ${err.message}` });
    }
  });

  // Start llama-server process
  app.post("/api/llama/start", async (req, res) => {
    const {
      binaryPath: customBinaryPath,
      modelPath,
      mmprojPath,
      gpuOffload = 99,
      contextLength = 32768,
      cacheTypeK = 'q8_0',
      cacheTypeV = 'q8_0',
      threads = 8,
      host = '127.0.0.1',
      port = 1234,
      flashAttn = false,
      noMmap = false,
      seed,
      maxConcurrent,
      unifiedKVCache,
      ropeFreqBase,
      ropeFreqScale,
      offloadKV,
      keepInMemory,
      evalBatchSize,
      physicalBatchSize,
    } = req.body;

    if (!modelPath) {
      return res.status(400).json({ error: 'modelPath is required' });
    }

    // Kill existing process if any
    killProcess(llamaServerProcess);
    llamaServerProcess = null;

    // Find the llama-server binary
    let llamaServerBin = customBinaryPath || '';
    if (!llamaServerBin) {
      const installConfig = req.headers['x-llama-config']
        ? JSON.parse(req.headers['x-llama-config'] as string)
        : null;
      if (installConfig?.binaries) {
        llamaServerBin = installConfig.binaries.find((b: string) => {
          const base = path.basename(b).toLowerCase();
          return base.includes('llama-server') || base === 'server.exe' || base === 'server';
        }) || installConfig.binaries[0] || '';
      }
    }

    if (!llamaServerBin) {
      // Search in default install dir
      const installDir = getLlamaInstallDir();
      const allFiles: string[] = [];
      const walkDir = (dir: string) => {
        try {
          for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) walkDir(full);
            else allFiles.push(full);
          }
        } catch {}
      };
      walkDir(installDir);
      llamaServerBin = allFiles.find(f => {
        const base = path.basename(f).toLowerCase();
        return base.includes('llama-server') || base === 'server.exe' || base === 'server';
      }) || '';
    }

    if (!llamaServerBin || !fs.existsSync(llamaServerBin)) {
      return res.status(404).json({ error: 'llama-server binary not found. Please install llama.cpp first.' });
    }

    const args: string[] = [
      '-m', modelPath,
      '-ngl', String(gpuOffload),
      '-c', String(contextLength),
      '--cache-type-k', cacheTypeK,
      '--cache-type-v', cacheTypeV,
      '-t', String(threads),
      '--host', host,
      '--port', String(port),
    ];

    if (mmprojPath) {
      args.push('--mmproj', mmprojPath);
    }

    // --flash-attn removed
    if (noMmap) args.push('--no-mmap');
    if (seed && seed !== 'Random Seed' && seed !== '-1' && seed !== -1) args.push('--seed', String(seed));

    if (maxConcurrent && Number(maxConcurrent) > 0) {
      args.push('--parallel', String(maxConcurrent));
    }
    // Removed --slot-save-state: not a valid llama-server argument in recent builds
    if (ropeFreqBase && ropeFreqBase !== 'Auto' && String(ropeFreqBase).trim() !== '') {
      args.push('--rope-freq-base', String(ropeFreqBase));
    }
    if (ropeFreqScale && ropeFreqScale !== 'Auto' && String(ropeFreqScale).trim() !== '') {
      args.push('--rope-freq-scale', String(ropeFreqScale));
    }
    if (offloadKV === false) {
      args.push('--no-kv-offload');
    }
    if (keepInMemory) {
      args.push('--mlock');
    }
    if (evalBatchSize && Number(evalBatchSize) > 0) {
      args.push('--batch-size', String(evalBatchSize));
    }
    if (physicalBatchSize && Number(physicalBatchSize) > 0) {
      args.push('--ubatch-size', String(physicalBatchSize));
    }

    const serverUrl = `http://${host}:${port}`;

    try {
      const logStream = fs.createWriteStream(
        path.join(getLlamaInstallDir(), 'llama-server.log'),
        { flags: 'a' }
      );

      if (process.platform === 'win32') {
        const pArgs = [
          '-NoProfile',
          '-NonInteractive',
          '-Command',
          `& "${llamaServerBin}" ${args.map(arg => {
            if (arg.includes(' ') || arg.includes('/') || arg.includes('\\')) {
              return `"${arg.replace(/"/g, '`"')}"`;
            }
            return arg;
          }).join(' ')}`
        ];
        llamaServerProcess = spawn('powershell.exe', pArgs, {
          stdio: ['ignore', 'pipe', 'pipe'],
        }) as unknown as ChildProcessWithoutNullStreams;
      } else {
        llamaServerProcess = spawn(llamaServerBin, args, {
          stdio: ['ignore', 'pipe', 'pipe'],
        }) as unknown as ChildProcessWithoutNullStreams;
      }

      const proc = llamaServerProcess;
      proc.stdout.on('data', (data: Buffer) => {
        logStream.write(`[stdout] ${data.toString()}`);
      });
      proc.stderr.on('data', (data: Buffer) => {
        logStream.write(`[stderr] ${data.toString()}`);
      });

      proc.on('error', (err) => {
        console.error('llama-server error:', err);
        logStream.write(`[error] ${err.message}\n`);
        logStream.end();
      });

      proc.on('exit', (code) => {
        console.log(`llama-server exited with code ${code}`);
        logStream.write(`[exit] code ${code}\n`);
        logStream.end();
        llamaServerProcess = null;
      });

      // Wait for the server to be ready (poll health endpoint)
      let ready = false;
      const maxRetries = 30;
      for (let i = 0; i < maxRetries; i++) {
        await new Promise(r => setTimeout(r, 1000));
        try {
          const healthRes = await axios.get(`${serverUrl}/v1/models`, { timeout: 2000 });
          if (healthRes.status === 200 || healthRes.status === 405) {
            ready = true;
            break;
          }
        } catch {}
      }

      if (!ready) {
        if (proc) {
          killProcess(proc);
        }
        llamaServerProcess = null;
        logStream.end();
        return res.status(500).json({ error: 'llama-server started but did not become ready within 30s' });
      }

      res.json({
        success: true,
        serverUrl,
        command: process.platform === 'win32'
          ? `& "${llamaServerBin}" ${args.map(a => (a.includes(' ') || a.includes('/') || a.includes('\\')) ? `"${a}"` : a).join(' ')}`
          : `${llamaServerBin} ${args.join(' ')}`,
        pid: proc.pid,
      });
    } catch (err: any) {
      if (llamaServerProcess) {
        killProcess(llamaServerProcess);
      }
      llamaServerProcess = null;
      res.status(500).json({ error: `Failed to start llama-server: ${err.message}` });
    }
  });

  // Stop llama-server process
  app.post("/api/llama/stop", async (_req, res) => {
    if (!llamaServerProcess) {
      return res.json({ success: true, message: 'No server running' });
    }
    killProcess(llamaServerProcess);
    llamaServerProcess = null;
    res.json({ success: true, message: 'Server stopped' });
  });

  // Get llama-server status
  app.get("/api/llama/status", async (_req, res) => {
    const running = llamaServerProcess !== null && !llamaServerProcess.killed;
    res.json({ running, pid: running ? llamaServerProcess?.pid : null });
  });

  // Delete llama.cpp install directory
  app.post("/api/llama/delete", async (_req, res) => {
    const installDir = getLlamaInstallDir();
    try {
      // Kill server if running
      if (llamaServerProcess) {
        killProcess(llamaServerProcess);
        llamaServerProcess = null;
      }
      if (fs.existsSync(installDir)) {
        fs.rmSync(installDir, { recursive: true, force: true });
      }
      res.json({ success: true, message: 'llama.cpp installation deleted' });
    } catch (err: any) {
      res.status(500).json({ error: `Failed to delete llama.cpp: ${err.message}` });
    }
  });

  // Verify llama-server binary by running it with --version
  app.post("/api/llama/verify", async (req, res) => {
    const { binaryPath } = req.body;
    if (!binaryPath) {
      return res.status(400).json({ success: false, error: 'binaryPath is required' });
    }
    if (!fs.existsSync(binaryPath)) {
      return res.status(404).json({ success: false, error: `Binary not found at: ${binaryPath}` });
    }
    try {
      const result = await new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
        const proc = spawn(binaryPath, ['--version'], { timeout: 10000, stdio: ['ignore', 'pipe', 'pipe'] });
        let stdout = '';
        let stderr = '';
        proc.stdout?.on('data', (d: Buffer) => { stdout += d.toString(); });
        proc.stderr?.on('data', (d: Buffer) => { stderr += d.toString(); });
        proc.on('error', reject);
        proc.on('close', (code) => {
          resolve({ stdout: stdout.trim(), stderr: stderr.trim() });
        });
      });
      res.json({
        success: true,
        version: result.stdout || result.stderr || 'version info unavailable',
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: `Failed to run binary: ${err.message}` });
    }
  });

  // Test a running llama-server health
  app.get("/api/llama/test", async (req, res) => {
    const host = (req.query.host as string) || '127.0.0.1';
    const port = (req.query.port as string) || '1234';
    try {
      const response = await axios.get(`http://${host}:${port}/v1/models`, { timeout: 5000 });
      res.json({
        success: true,
        status: response.status,
        data: response.data,
        serverUrl: `http://${host}:${port}`,
      });
    } catch (err: any) {
      res.json({
        success: false,
        error: err.message,
        serverUrl: `http://${host}:${port}`,
      });
    }
  });

  // Verify if a local server supports and has successfully activated vision processing
  app.post("/api/llama/verify-vision", async (req, res) => {
    const { host = '127.0.0.1', port = 1234 } = req.body;
    const url = `http://${host}:${port}/v1/chat/completions`;
    
    // Tiny 1x1 solid red pixel base64 PNG
    const probeImageBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
    
    try {
      const response = await axios.post(url, {
        model: "active-model",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "What color is this 1x1 image? Respond in one word." },
              { type: "image_url", image_url: { url: probeImageBase64 } }
            ]
          }
        ],
        temperature: 0.1,
        max_tokens: 10
      }, {
        timeout: 10000,
        headers: { 'Content-Type': 'application/json' }
      });
      
      const content = response.data?.choices?.[0]?.message?.content || "";
      const isRed = content.toLowerCase().includes("red");
      
      res.json({
        success: true,
        visionActive: true,
        isRed,
        modelResponse: content
      });
    } catch (e: any) {
      const errorMsg = e.response?.data 
        ? (typeof e.response.data === 'object' ? JSON.stringify(e.response.data) : String(e.response.data)) 
        : e.message;
        
      res.json({
        success: false,
        visionActive: false,
        error: "Vision verification failed",
        detail: errorMsg
      });
    }
  });

  // Download a GGUF model from Hugging Face
  app.post("/api/models/download", async (req, res) => {
    const { modelId, fileName, publisher, modelFolder, modelFile } = req.body;
    if (!modelId || !fileName) {
      return res.status(400).json({ error: 'modelId and fileName are required' });
    }

    const modelsDir = path.join(getLuminaDataDir(), 'models', publisher || 'huggingface', modelFolder || modelId.split('/')[1] || modelId);
    fs.mkdirSync(modelsDir, { recursive: true });

    // Extract the actual filename from a string like "model-q4_k_m.gguf (4.15 GB)"
    const actualFileName = fileName.split(' ')[0];
    const savePath = path.join(modelsDir, modelFile || actualFileName);

    // If file already exists, return immediately
    if (fs.existsSync(savePath)) {
      const sizeBytes = fs.statSync(savePath).size;
      return res.json({
        success: true,
        path: savePath,
        size: (sizeBytes / 1024 / 1024 / 1024).toFixed(2) + ' GB',
        alreadyExisted: true,
        logs: [`[${new Date().toLocaleTimeString()}] File already exists at ${savePath}`],
      });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const sendEvent = (data: any) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    const hfUrl = `https://huggingface.co/${modelId}/resolve/main/${actualFileName}`;
    const logs: string[] = [];
    const addLog = (msg: string) => {
      logs.push(`[${new Date().toLocaleTimeString()}] ${msg}`);
    };

    addLog(`Downloading: ${actualFileName}`);
    addLog(`From: ${hfUrl}`);
    addLog(`To: ${savePath}`);

    try {
      const response = await axios({
        method: 'GET',
        url: hfUrl,
        responseType: 'stream',
        timeout: 600000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      const totalSize = parseInt(String(response.headers['content-length'] || '0'), 10);
      const writer = fs.createWriteStream(savePath);
      let downloaded = 0;
      let lastChunkTime = Date.now();
      let lastDownloaded = 0;

      const progressInterval = setInterval(() => {
        const now = Date.now();
        const elapsed = (now - lastChunkTime) / 1000;
        const chunkBytes = downloaded - lastDownloaded;
        const speed = elapsed > 0 ? chunkBytes / elapsed : 0;

        sendEvent({
          type: 'progress',
          stage: 'download',
          percent: totalSize > 0 ? Math.min(Math.round((downloaded / totalSize) * 100), 99) : 0,
          downloaded: (downloaded / 1024 / 1024).toFixed(1) + ' MB',
          total: totalSize > 0 ? (totalSize / 1024 / 1024).toFixed(1) + ' MB' : 'Unknown',
          speed: speed > 0 ? (speed / 1024 / 1024).toFixed(1) + ' MB/s' : 'Calculating...',
        });

        lastChunkTime = now;
        lastDownloaded = downloaded;
      }, 200);

      response.data.on('data', (chunk: Buffer) => {
        downloaded += chunk.length;
      });

      response.data.pipe(writer);

      await new Promise<void>((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', (err) => {
          clearInterval(progressInterval);
          reject(err);
        });
      });

      clearInterval(progressInterval);

      const sizeMb = (downloaded / 1024 / 1024).toFixed(1);
      addLog(`Download complete: ${sizeMb} MB`);

      sendEvent({
        type: 'complete',
        success: true,
        path: savePath,
        size: (downloaded / 1024 / 1024 / 1024).toFixed(2) + ' GB',
        bytes: downloaded,
        logs,
      });
      res.end();
    } catch (err: any) {
      // Clean up partial download
      try { fs.unlinkSync(savePath); } catch {}
      addLog(`Error: ${err.message}`);
      sendEvent({ type: 'error', message: err.message, logs });
      res.end();
    }
  });

  // Find mmproj file for a given model path by scanning its directory
  app.post("/api/llama/find-mmproj", async (req, res) => {
    const { modelPath } = req.body;
    if (!modelPath) return res.status(400).json({ error: 'modelPath is required' });

    // Resolve to actual filesystem path
    let resolvedModel = modelPath.replace(/\\/g, '/');
    const cwMatch = resolvedModel.match(/^C:\/Users\/([^\/]+)\/(.*)$/i);
    if (cwMatch) {
      resolvedModel = path.join(os.homedir(), cwMatch[2]);
    } else {
      resolvedModel = path.resolve(resolvedModel);
    }

    const dir = path.dirname(resolvedModel);
    if (!fs.existsSync(dir)) {
      return res.json({ found: false, path: null });
    }

    const isMmproj = (name: string) => {
      const l = name.toLowerCase();
      return l.includes('mmproj') || l.includes('projector') || l.includes('clip-vision') || l.includes('siglip');
    };

    try {
      const entries = fs.readdirSync(dir);
      const match = entries.find(e => e.toLowerCase().endsWith('.gguf') && isMmproj(e));
      if (match) {
        return res.json({ found: true, path: path.join(dir, match).replace(/\\/g, '/') });
      }
      return res.json({ found: false, path: null });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  // Scan models directory and return all locally available models
  app.get("/api/models/list", async (_req, res) => {
    const modelsDir = path.join(getLuminaDataDir(), 'models');
    const results: { id: string; name: string; publisher: string; folder: string; file: string; path: string; size: string }[] = [];

    const isProjectorFile = (name: string) => {
      const lower = name.toLowerCase();
      return lower.includes('mmproj') || lower.includes('projector') || lower.includes('clip-vision') || lower.includes('siglip');
    };

    const scanDir = (dir: string, publisher: string, folder: string) => {
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            scanDir(fullPath, publisher || entry.name, entry.name);
          } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.gguf') && !isProjectorFile(entry.name)) {
            const sizeBytes = fs.statSync(fullPath).size;
            results.push({
              id: `${publisher}/${folder}`,
              name: entry.name.replace(/\.gguf$/i, '').replace(/[-_]/g, ' '),
              publisher,
              folder,
              file: entry.name,
              path: fullPath,
              size: (sizeBytes / 1024 / 1024 / 1024).toFixed(2) + ' GB',
            });
          }
        }
      } catch {}
    };

    if (fs.existsSync(modelsDir)) {
      scanDir(modelsDir, '', '');
    }

    res.json({ success: true, models: results });
  });

  // ---- Composio Integration Routes ----
  const { getComposio, CURATED_TOOLKITS, listConnectedToolkits, authorizeToolkit, disconnectToolkit, renameConnection, resetComposio, setApiKey, verifyApiKey, listToolkitTools, executeComposioTool } = await import('./server/composio.js');

  app.get("/api/composio/status", (_req, res) => {
    res.json({ enabled: Boolean(getComposio()) });
  });

  app.post("/api/composio/refresh", async (req, res) => {
    const apiKey = req.body?.apiKey as string | undefined;
    resetComposio();
    if (apiKey) {
      setApiKey(apiKey);
    }
    res.json({ ok: true });
  });

  app.post("/api/composio/verify", async (req, res) => {
    const apiKey = req.body?.apiKey as string | undefined;
    if (!apiKey) {
      res.status(400).json({ valid: false, error: "apiKey required" });
      return;
    }
    try {
      resetComposio();
      setApiKey(apiKey);
      const result = await verifyApiKey(apiKey);
      if (result.valid) {
        res.json({ enabled: true });
      } else {
        res.json({ enabled: false, error: result.error });
      }
    } catch (err) {
      res.json({ enabled: false, error: String(err) });
    }
  });

  app.get("/api/composio/toolkit-tools/:slug", async (req, res) => {
    const slug = req.params.slug;
    try {
      const tools = await listToolkitTools(slug);
      res.json({ tools });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  app.post("/api/composio/execute", async (req, res) => {
    const { toolSlug, args, connectedAccountId } = req.body || {};
    if (!toolSlug) {
      res.status(400).json({ error: "toolSlug required" });
      return;
    }
    try {
      const result = await executeComposioTool(toolSlug, args || {}, connectedAccountId);
      res.json({ result });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  app.get("/api/composio/toolkits", async (_req, res) => {
    try {
      const connected = await listConnectedToolkits();
      const connectionsBySlug = new Map<string, typeof connected>();
      for (const c of connected) {
        const arr = connectionsBySlug.get(c.slug) ?? [];
        arr.push(c);
        connectionsBySlug.set(c.slug, arr);
      }
      const toolkits = CURATED_TOOLKITS.map((t) => {
        const conns = connectionsBySlug.get(t.slug) ?? [];
        return {
          slug: t.slug,
          displayName: t.displayName,
          authMode: t.authMode,
          connections: conns.map((c) => ({
            id: c.connectionId,
            status: c.status,
            alias: c.alias ?? null,
            accountLabel: c.accountLabel ?? null,
            accountEmail: c.accountEmail ?? null,
            accountName: c.accountName ?? null,
            accountAvatarUrl: c.accountAvatarUrl ?? null,
            createdAt: c.createdAt ?? null,
          })),
        };
      });
      res.json({ enabled: Boolean(getComposio()), toolkits });
    } catch (err) {
      console.error("[composio] list toolkits failed", err);
      res.status(500).json({ error: String(err) });
    }
  });

  app.post("/api/composio/toolkits/:slug/authorize", async (req, res) => {
    const slug = req.params.slug;
    const alias = typeof req.body?.alias === "string" ? req.body.alias : undefined;
    try {
      const result = await authorizeToolkit(slug, alias ? { alias } : undefined);
      res.json(result);
    } catch (err) {
      console.error(`[composio] authorize ${slug} failed`, err);
      res.status(500).json({ error: String(err) });
    }
  });

  app.post("/api/composio/toolkits/:slug/disconnect", async (req, res) => {
    const connectionId = req.body?.connectionId as string | undefined;
    if (!connectionId) {
      res.status(400).json({ error: "connectionId required in body" });
      return;
    }
    try {
      await disconnectToolkit(connectionId);
      res.json({ ok: true });
    } catch (err) {
      console.error(`[composio] disconnect failed`, err);
      res.status(500).json({ error: String(err) });
    }
  });

  app.post("/api/composio/connections/:id/rename", async (req, res) => {
    const id = req.params.id;
    const alias = typeof req.body?.alias === "string" ? req.body.alias.trim() : "";
    if (!alias) {
      res.status(400).json({ error: "alias required in body" });
      return;
    }
    try {
      await renameConnection(id, alias);
      res.json({ ok: true });
    } catch (err) {
      console.error(`[composio] rename ${id} failed`, err);
      res.status(500).json({ error: String(err) });
    }
  });

  // Vite middleware for development
  if (isDev) {
    try {
      console.log('⚡ Starting Vite middleware...');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
      console.log('✅ Vite middleware ready');
    } catch (e) {
      console.error("⚠️ Vite server failed to start:", e);
      process.exit(1);
    }
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, "127.0.0.1", () => {
    console.log(`\n🚀 Proxy server ready at http://127.0.0.1:${PORT}`);
  }).on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n❌ Error: Port ${PORT} is already in use.`);
      process.exit(1);
    } else {
      console.error(`\n❌ Server failed to start:`, err);
    }
  });

  // Graceful shutdown on Ctrl+C / SIGTERM
  const shutdown = () => {
    console.log('\n🛑 Shutting down server...');
    server.close(() => {
      console.log('✅ Server closed.');
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
  process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught exception:', err);
    server.close(() => process.exit(1));
  });
}

startServer();
