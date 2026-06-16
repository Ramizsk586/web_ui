import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Configure dotenv
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: true });

// Route registration modules
import { setupLlmRoutes } from './server/llm_routes.js';
import { setupAgentRoutes } from './server/agent_routes.js';
import { setupFsGitRoutes } from './server/fs_git_routes.js';
import { setupIntegrationRoutes } from './server/integration_routes.js';
import { setupToolRoutes } from './server/tool_routes.js';
import { setupProxyRoutes } from './server/proxy_routes.js';
import { setupLlamaRoutes } from './server/llama.js';
import { setupRagRoutes } from './server/rag_routes.js';
import { setupSkillRoutes } from './server/skill_routes.js';

// Background loop services
import { startCleanupLoop } from './server/clean.js';
import { startConsolidationLoop } from './server/consolidation.js';
import { startAutomationLoop } from './server/automations.js';
import { startTelegram } from './server/telegram.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isDev = process.env.NODE_ENV !== 'production';
const PORT = 3000;

// Global server-side traffic logs array for display in the frontend panel
(global as any).serverTrafficLogs = [];
(global as any).logServerTraffic = (log: any) => {
  const logs = (global as any).serverTrafficLogs || [];
  const newLog = {
    id: log.id || `server-log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: log.timestamp || new Date().toLocaleTimeString(),
    method: log.method || 'POST',
    endpoint: log.endpoint || '',
    status: log.status || 200,
    statusText: log.statusText || 'OK',
    latency: log.latency || 0,
    type: log.type || 'system',
    request: typeof log.request === 'string' ? log.request : JSON.stringify(log.request || {}, null, 2),
    response: typeof log.response === 'string' ? log.response : JSON.stringify(log.response || {}, null, 2),
  };
  logs.unshift(newLog);
  if (logs.length > 100) {
    logs.pop();
  }
  (global as any).serverTrafficLogs = logs;
};

async function startServer() {
  const app = express();

  // Middleware limits
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // CORS setup
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', '*');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
    next();
  });

  // Register routing domain controllers
  setupLlmRoutes(app);
  setupAgentRoutes(app);
  setupFsGitRoutes(app);
  await setupIntegrationRoutes(app);
  setupToolRoutes(app);
  setupProxyRoutes(app);
  setupLlamaRoutes(app);
  setupRagRoutes(app);
  await setupSkillRoutes(app);

  // Vite middleware for development
  if (isDev) {
    try {
      console.log('⚡ Starting Vite middleware...');
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
      console.log('✅ Vite middleware ready');
    } catch (e) {
      console.error('⚠️ Vite server failed to start:', e);
      process.exit(1);
    }
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath, {
      maxAge: '1y',
      immutable: true,
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html') || !filePath.includes('assets')) {
          res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
        }
      }
    }));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 Proxy server ready at http://127.0.0.1:${PORT}`);

    // Start background services
    try {
      startCleanupLoop();
      startConsolidationLoop();
      startAutomationLoop();
      startTelegram();
      console.log('🤖 Lumina Agent backend services started.');
    } catch (agentErr) {
      console.warn('⚠️ Agent backend services failed to start:', agentErr);
    }
  }).on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n❌ Error: Port ${PORT} is already in use.`);
      process.exit(1);
    } else {
      console.error(`\n❌ Server failed to start:`, err);
    }
  });

  // Graceful shutdown handlers
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
