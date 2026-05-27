import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { fileURLToPath } from 'url';
import 'dotenv/config';
import axios from 'axios';
import { search } from 'duck-duck-scrape';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isDev = process.env.NODE_ENV !== "production";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Handle JSON and CORS
  app.use(express.json());

  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', '*');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
    next();
  });

  // Health check endpoint
  app.get("/api/health", async (req, res) => {
    res.json({ status: 'ok', server: 'Lumina Web UI Server' });
  });

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
          const ddgResults = await search(query, {
            region: 'wt-wt',
            safeSearch: -1,
            time: 'y',
            offset: 0
          });

          let enrichedResults: any[] = [];
          for (const result of ddgResults.results.slice(0, 10)) {
            enrichedResults.push({
              title: result.title,
              url: result.url,
              snippet: result.description
            });
          }

          if (ddgResults.related && ddgResults.related.length > 0) {
            const relatedTopics = ddgResults.related.map((t) => ({
              title: t.text,
              url: '',
              snippet: t.text
            }));
            enrichedResults = [...enrichedResults, ...relatedTopics];
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
    const { endpoint, apiKey } = req.body;
    if (!endpoint) {
      return res.status(400).json({ error: "endpoint is required" });
    }
    try {
      const url = endpoint.replace(/\/+$/, '');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

      // Try fetching models to verify connectivity + auth
      const pathsToTry = [
        `${url}/models`,
        `${url}/v1/models`,
        `${url}/api/models`,
      ];

      let verified = false;
      for (const path of pathsToTry) {
        try {
          const response = await axios.get(path, { headers, timeout: 10000 });
          if (response.status === 200) {
            verified = true;
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
        res.json({ success: true, message: 'Connection verified' });
      } else {
        res.status(502).json({ error: 'Could not verify connection', message: 'Endpoint is unreachable or API key is invalid' });
      }
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
      if (tools && tools.length > 0) {
        body.tools = tools;
        body.tool_choice = 'auto';
      }
      const response = await axios.post(`${bridgeUrl}/v1/chat/completions`, body, { headers, timeout: 30000 });
      res.json(response.data);
    } catch (e: any) {
      res.status(502).json({ error: 'Bridge chat failed', detail: e.message });
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
          name === 'dist-electron' ||
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

  // Filesystem Listing Endpoints
  app.post("/api/fs/list", (req, res) => {
    let { folderPath } = req.body;
    if (!folderPath) {
      folderPath = process.cwd();
    }
    
    const resolvedPath = path.resolve(folderPath);
    if (!fs.existsSync(resolvedPath)) {
      return res.status(404).json({ error: "Directory not found" });
    }
    
    const files = getFilesRecursively(resolvedPath);
    res.json({ files, rootPath: resolvedPath.replace(/\\/g, '/') });
  });

  app.post("/api/fs/read", (req, res) => {
    const { filePath } = req.body;
    if (!filePath) {
      return res.status(400).json({ error: "filePath is required" });
    }
    
    const resolvedPath = path.resolve(filePath);
    try {
      const content = fs.readFileSync(resolvedPath, 'utf8');
      res.json({ content, filePath: resolvedPath.replace(/\\/g, '/'), name: path.basename(resolvedPath) });
    } catch (e: any) {
      res.status(500).json({ error: "Failed to read file", detail: e.message });
    }
  });

  app.post("/api/fs/write", (req, res) => {
    const { filePath, content } = req.body;
    if (!filePath || content === undefined) {
      return res.status(400).json({ error: "filePath and content are required" });
    }
    
    const resolvedPath = path.resolve(filePath);
    try {
      fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
      fs.writeFileSync(resolvedPath, content, 'utf8');
      res.json({ success: true, filePath: resolvedPath.replace(/\\/g, '/') });
    } catch (e: any) {
      res.status(500).json({ error: "Failed to write file", detail: e.message });
    }
  });

  app.post("/api/fs/create", (req, res) => {
    const { filePath, isDirectory } = req.body;
    if (!filePath) {
      return res.status(400).json({ error: "filePath is required" });
    }
    
    const resolvedPath = path.resolve(filePath);
    try {
      if (isDirectory) {
        fs.mkdirSync(resolvedPath, { recursive: true });
       } else {
        fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
        fs.writeFileSync(resolvedPath, '', 'utf8');
      }
      res.json({ success: true, filePath: resolvedPath.replace(/\\/g, '/') });
    } catch (e: any) {
      res.status(500).json({ error: "Failed to create", detail: e.message });
    }
  });

  app.post("/api/fs/delete", (req, res) => {
    const { filePath } = req.body;
    if (!filePath) {
      return res.status(400).json({ error: "filePath is required" });
    }
    
    const resolvedPath = path.resolve(filePath);
    try {
      if (fs.statSync(resolvedPath).isDirectory()) {
        fs.rmSync(resolvedPath, { recursive: true, force: true });
      } else {
        fs.unlinkSync(resolvedPath);
      }
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: "Failed to delete", detail: e.message });
    }
  });

  // AI Chat Completion Proxy
  app.post("/api/chat", async (req, res) => {
    const { messages, systemPrompt, model, config } = req.body;
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "messages array is required" });
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
      // Default fallback to environment variable
      else {
        provider = 'openai-compatible';
        baseUrl = process.env.AI_BASE_URL || 'http://localhost:11434/v1';
        apiKey = process.env.AI_API_KEY || '';
      }
    }

    // Build the API messages array with system prompt
    const apiMessages: any[] = [];
    if (systemPrompt) {
      apiMessages.push({ role: 'system', content: systemPrompt });
    }
    apiMessages.push(...messages.map((m: any) => ({
      role: m.role,
      content: m.content
    })));

    try {
      if (provider === 'anthropic') {
        // Anthropic uses a different API format
        const response = await axios.post(
          `${baseUrl}/messages`,
          {
            model: model || 'claude-3-5-sonnet-20241022',
            max_tokens: 4096,
            system: systemPrompt || undefined,
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
            systemInstruction: systemPrompt ? {
              parts: [{ text: systemPrompt }]
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
      const requestBody: any = {
        model: model || 'gpt-4o-mini',
        messages: apiMessages,
        stream: true,
        max_tokens: 4096,
        temperature: 0.7
      };

      const response = await axios.post(
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
      console.error('Chat API Error:', e.message);
      // If streaming headers haven't been set yet, send JSON error
      if (!res.headersSent) {
        res.status(502).json({ error: 'Chat completion failed', detail: e.message });
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

  const server = app.listen(PORT, "localhost", () => {
    console.log(`\n🚀 Proxy server ready at http://localhost:${PORT}`);
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
}

startServer();