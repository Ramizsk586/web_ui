import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import cors from "cors";
import { createServer } from "node:http";
import { WebSocketServer } from "ws";

import { addClient } from "./server/broadcast.js";
import { setupLlmRoutes } from "./server/llm_routes.js";
import { setupAgentRoutes } from "./server/agent_routes.js";
import { setupFsGitRoutes } from "./server/fs_git_routes.js";
import { setupIntegrationRoutes } from "./server/integration_routes.js";
import { setupToolRoutes } from "./server/tool_routes.js";
import { setupProxyRoutes } from "./server/proxy_routes.js";
import { setupLlamaRoutes } from "./server/llama.js";
import { setupRagRoutes } from "./server/rag_routes.js";
import { setupSkillRoutes } from "./server/skill_routes.js";
import { createMemoryRouter } from "./server/memory_routes.js";
import { preloadLocalModel } from "./server/embeddings.js";
import { startCleanupLoop } from "./server/clean.js";
import { startConsolidationLoop } from "./server/consolidation.js";
import { startAutomationLoop } from "./server/automations.js";
import { startTelegram } from "./server/telegram.js";

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), override: true });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isDev = process.env.NODE_ENV !== "production";
const PORT = Number(process.env.PORT ?? 3000);

(global as any).serverTrafficLogs = [];
(global as any).logServerTraffic = (log: any) => {
  const logs = (global as any).serverTrafficLogs || [];
  logs.unshift({
    id: log.id || `server-log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: log.timestamp || new Date().toLocaleTimeString(),
    method: log.method || "POST",
    endpoint: log.endpoint || "",
    status: log.status || 200,
    statusText: log.statusText || "OK",
    latency: log.latency || 0,
    type: log.type || "system",
    request: typeof log.request === "string" ? log.request : JSON.stringify(log.request || {}, null, 2),
    response: typeof log.response === "string" ? log.response : JSON.stringify(log.response || {}, null, 2),
  });
  if (logs.length > 100) logs.pop();
  (global as any).serverTrafficLogs = logs;
};

async function startServer() {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  setupLlmRoutes(app);
  setupAgentRoutes(app);
  setupFsGitRoutes(app);
  await setupIntegrationRoutes(app);
  setupToolRoutes(app);
  setupProxyRoutes(app);
  setupLlamaRoutes(app);
  setupRagRoutes(app);
  await setupSkillRoutes(app);
  app.use("/api/memory", createMemoryRouter());

  app.get("/health", (_req, res) => {
    res.json({ ok: true, service: "lumina-agent" });
  });

  if (isDev) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const httpServer = createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });
  wss.on("connection", (ws) => {
    addClient(ws);
    ws.send(JSON.stringify({ event: "hello", data: { ok: true }, at: Date.now() }));
  });

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Lumina server ready at http://127.0.0.1:${PORT}`);
    startCleanupLoop();
    startConsolidationLoop();
    startAutomationLoop();
    startTelegram();
    preloadLocalModel();
  });

  const shutdown = () => {
    httpServer.close(() => process.exit(0));
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

startServer().catch((error) => {
  console.error("Server failed to start", error);
  process.exit(1);
});
