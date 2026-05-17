import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { fileURLToPath } from 'url';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isDev = process.env.NODE_ENV !== "production";

async function startServer() {
  const app = express();
  const PORT = 3000;

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
      const { model: requestedModel, messages, writing_style = 'default' } = req.body;
      const modelId = (requestedModel && requestedModel.includes("ultra")) ? "gemini-1.5-pro" : "gemini-1.5-flash";
      
      const stylePrompts: Record<string, string> = {
        poem: "You are a poet. Write in a poetic style with stanzas and rhythmic line breaks. Use evocative language.",
        letter: "You are a correspondent. Format your response as a formal or informal letter, including a date, salutation, body, and closing.",
        story: "You are a storyteller. Use narrative techniques, descriptive imagery, and character-driven prose. Structure your response as a story.",
        essay: "You are an academic writer. Use a formal tone, clear structure (introduction, body, conclusion), and logical flow.",
        script: "You are a screenwriter. Use standard screenplay formatting for dialogues, scene headings, and action lines.",
        default: "You are a helpful and intelligent assistant. Be concise and use Markdown for formatting."
      };

      const generativeModel = (genAI as any).getGenerativeModel({ 
        model: modelId,
        systemInstruction: stylePrompts[writing_style] || stylePrompts.default
      });

      const lastMessage = messages[messages.length - 1];
      const history = messages.slice(0, -1).map((m: any) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }]
      }));

      const chat = generativeModel.startChat({ history });
      const result = await chat.sendMessage(lastMessage.content);
      const response = await result.response;
      const text = response.text();

      res.json({
        choices: [{
          message: {
            content: text,
            role: "assistant"
          }
        }]
      });
    } catch (error: any) {
      console.error("Gemini Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // MCP Mock Routes for Verification
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

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`\n🚀 Proxy server ready at http://0.0.0.0:${PORT}`);
    console.log(`🔗 App connects via internal API proxy`);
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