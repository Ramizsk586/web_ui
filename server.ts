import express from "express";
import path from "path";
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
  const PORT = 5173;

  // Handle JSON and CORS
  app.use(express.json());

  app.use((_req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', '*');
    next();
  });

  // Gemini API Implementation
  const genaiModule = await import("@google/genai");
  const GoogleGenAI = genaiModule.GoogleGenAI;
  const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

  app.get("/api/models", async (req, res) => {
    res.json({
      data: [
        { id: "gemini-1.5-pro", display_name: "Lumina Ultra Plus" },
        { id: "gemini-1.5-flash", display_name: "Lumina Mini Flash" }
      ]
    });
  });

  app.post("/api/chat/completions", async (req, res) => {
    try {
      const { model: requestedModel, messages, writing_style = 'default', system_prompt, use_tools } = req.body;
      const modelId = (requestedModel && requestedModel.includes("ultra")) ? "gemini-1.5-pro" : "gemini-1.5-flash";
      
      const stylePrompts: Record<string, string> = {
        poem: "You are a poet. Write in a poetic style with stanzas and rhythmic line breaks. Use evocative language.",
        letter: "You are a correspondent. Format your response as a formal or informal letter, including a date, salutation, body, and closing.",
        story: "You are a storyteller. Use narrative techniques, descriptive imagery, and character-driven prose. Structure your response as a story.",
        essay: "You are an academic writer. Use a formal tone, clear structure (introduction, body, conclusion), and logical flow.",
        script: "You are a screenwriter. Use standard screenplay formatting for dialogues, scene headings, and action lines.",
        default: "You are a helpful and intelligent assistant. Be concise and use Markdown for formatting."
      };

      const baseInstruction = system_prompt || stylePrompts[writing_style] || stylePrompts.default;

      // Define tools for image search
      const toolConfigs = use_tools ? [
        {
          functionDeclarations: [
            {
              name: "image_search",
              description: "Search for images using DuckDuckGo. Use this tool when the user asks for pictures, images, or photos of something.",
              parameters: {
                type: "OBJECT",
                properties: {
                  query: {
                    type: "STRING",
                    description: "The search query for images."
                  }
                },
                required: ["query"]
              }
            }
          ]
        }
      ] : [];

      // Use genAI.models.generateContent for @google/genai v2 SDK
      // Build conversation history in Gemini format
      const history = messages.slice(0, -1).map((m: any) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }]
      }));
      const lastMessage = messages[messages.length - 1];

      const contents = [
        ...history,
        { role: "user", parts: [{ text: lastMessage.content }] }
      ];

      let geminiResponse = await (genAI as any).models.generateContent({
        model: modelId,
        systemInstruction: baseInstruction,
        tools: toolConfigs.length > 0 ? toolConfigs : undefined,
        contents
      });

      let response = geminiResponse;
      
      let toolCalls = [];
      let imagesResponse: { title: string; url: string; source: string; thumbnail: string }[] = [];

      // Inspect parts for function calls
      const parts = response.candidates?.[0]?.content?.parts || response.candidates[0].content.parts;
      const functionCalls = parts.filter((p: any) => p.functionCall);

      if (functionCalls.length > 0) {
        for (const fc of functionCalls) {
          const call = fc.functionCall;
          if (call.name === "image_search") {
            try {
              const { searchImages } = await import('duck-duck-scrape');
              const searchResults = await searchImages(call.args.query);
              const results = searchResults.results.slice(0, 6).map((img: any) => ({
                title: img.title,
                url: img.image,
                source: img.source,
                thumbnail: img.thumbnail
              }));
              
              imagesResponse = results;

              // Follow-up call with tool result
              const followUpContents = [
                ...contents,
                { role: "model", parts },
                {
                  role: "user",
                  parts: [{
                    functionResponse: {
                      name: "image_search",
                      response: { results }
                    }
                  }]
                }
              ];

              const followUpResponse = await (genAI as any).models.generateContent({
                model: modelId,
                systemInstruction: baseInstruction,
                contents: followUpContents
              });
              response = followUpResponse;
              
              toolCalls.push({
                id: Math.random().toString(36).substring(7),
                function: {
                  name: "image_search",
                  arguments: JSON.stringify(call.args)
                }
              });
            } catch (err) {
              console.error("Tool execution failed:", err);
            }
          }
        }
      }

      // Extract text from response
      const responseText = response.candidates?.[0]?.content?.parts
        ?.filter((p: any) => p.text)
        ?.map((p: any) => p.text)
        ?.join('') || response.text?.() || '';

      res.json({
        choices: [{
          message: {
            content: responseText,
            role: "assistant",
            tool_calls: toolCalls.length > 0 ? toolCalls : undefined
          }
        }],
        images: imagesResponse.length > 0 ? imagesResponse : undefined
      });
    } catch (error: any) {
      console.error("Gemini Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/generate-avatar", async (req, res) => {
    try {
      const { prompt } = req.body;
      
      // Use gemini-2.5-flash-image for standard image generation
      const response = await (genAI as any).models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [{ text: `A clean, minimalist profile avatar image for a digital assistant persona. Description: ${prompt}. Cinematic lighting, flat design aesthetic, centered composition, high quality, square format.` }]
        },
        config: {
          imageConfig: {
            aspectRatio: "1:1"
          }
        }
      });

      let base64Image = "";
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          base64Image = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          break;
        }
      }

      if (!base64Image) {
        throw new Error("No image data returned from model");
      }

      res.json({ imageUrl: base64Image });
    } catch (error: any) {
      console.error("Avatar Gen Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/search", async (req, res) => {
    const { query, tavilyKey, serpKey } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: "Query is required" });
    }

    let results: any[] = [];
    let provider = "duckduckgo";

    try {
      // Priority-based search provider selection:
      // 1. Tavily API (if key is saved) -> primary
      // 2. SerpApi (if Tavily not present but SerpApi key saved) -> secondary
      // 3. DuckDuckGo (fallback if neither key is configured)
      
      // 1. Try Tavily if key provided (primary)
      if (tavilyKey) {
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
      }

      // 2. Try SerpApi if Tavily failed/not used and key provided (secondary)
      if (results.length === 0 && serpKey) {
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
      }

      // 3. Fallback to DDG (DuckDuckGo) if neither key configured or both failed
      if (results.length === 0) {
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
      }

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
    try {
      const response = await axios.get(`${bridgeUrl}/health`, { timeout: 5000 });
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