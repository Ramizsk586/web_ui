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

  app.use(express.json());

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

  app.listen(PORT, "localhost", () => {
    console.log(`\n🚀 Server ready at http://localhost:${PORT}`);
    console.log(`🔗 App connects directly to llama bridge at http://127.0.0.1:8089`);
  }).on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n❌ Error: Port ${PORT} is already in use.`);
      process.exit(1);
    } else {
      console.error(`\n❌ Server failed to start:`, err);
    }
  });
}

startServer();