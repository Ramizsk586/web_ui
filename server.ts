import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // CORS Proxy Endpoint
  app.post("/api/proxy", async (req, res) => {
    const { url, method, headers, body } = req.body;

    try {
      const response = await fetch(url, {
        method: method || 'POST',
        headers: headers || {},
        body: body ? JSON.stringify(body) : undefined
      });

      const data = await response.json();
      res.status(response.status).json(data);
    } catch (error: any) {
      console.error("Proxy Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`\n🚀 Server ready at http://localhost:${PORT}`);
    console.log(`📁 Proxy endpoint: http://localhost:${PORT}/api/proxy`);
  }).on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n❌ Error: Port ${PORT} is already in use.`);
      console.error(`💡 Tips:`);
      console.error(`   1. Stop any other instances of this app (running as "npm run dev")`);
      console.error(`   2. If you are running locally, use 'netstat -ano | findstr :${PORT}' (Windows) or 'lsof -i :${PORT}' (Mac/Linux) to find the process ID and kill it.`);
      process.exit(1);
    } else {
      console.error(`\n❌ Server failed to start:`, err);
    }
  });
}

startServer();
