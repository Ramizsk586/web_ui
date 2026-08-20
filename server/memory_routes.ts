import express from "express";

export function createMemoryRouter(): express.Router {
  const router = express.Router();
  router.get("/embedding-status", (_req, res) => {
    res.json({ provider: 'none', running: false, total: 0 });
  });
  router.post("/reembed", (_req, res) => {
    res.json({ ok: true, started: false });
  });
  return router;
}
