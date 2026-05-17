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
  const PORT = 5173;
  const LLAMA_BRIDGE_URL = "http://localhost:8089";

  app.use(express.json());

  app.use((_req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', '*');
    next();
  });

  app.get("/api/models", async (req, res) => {
    try {
      const response = await fetch(`${LLAMA_BRIDGE_URL}/v1/models`);
      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error("Llama Bridge Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/chat/completions", async (req, res) => {
    try {
      const response = await fetch(`${LLAMA_BRIDGE_URL}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body)
      });
      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error("Llama Bridge Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/v1/tools", async (req, res) => {
    try {
      const response = await fetch(`${LLAMA_BRIDGE_URL}/v1/tools`);
      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error("MCP Error:", error);
      res.json({ tools: [] });
    }
  });

  app.post("/api/list_tools", async (req, res) => {
    try {
      const response = await fetch(`${LLAMA_BRIDGE_URL}/v1/tools`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body)
      });
      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error("MCP Error:", error);
      res.json({ tools: [] });
    }
  });

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
    console.log(`\n🚀 Server ready at http://localhost:${PORT}`);
    console.log(`🔗 Connected to Llama Bridge at ${LLAMA_BRIDGE_URL}`);
  }).on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n❌ Error: Port ${PORT} is already in use.`);
      process.exit(1);
    } else {
      console.error(`\n❌ Server failed to start:`, err);
    }
  });

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