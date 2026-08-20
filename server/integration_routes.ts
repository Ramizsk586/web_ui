import express from 'express';

export async function setupIntegrationRoutes(app: express.Express) {
  app.get("/api/composio/status", (_req, res) => {
    res.json({ enabled: false });
  });

  app.post("/api/composio/refresh", async (_req, res) => {
    res.json({ ok: true });
  });

  app.get("/api/convex/read-env", async (_req, res) => {
    res.json({ deployment: '', url: '' });
  });
}

