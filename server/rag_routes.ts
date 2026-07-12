import express from 'express';
import mammoth from 'mammoth';
import { RagBackendService } from '../src/services/ragBackendService.js';
import { PDFParse } from 'pdf-parse';


export const ragBackend = new RagBackendService();

export function setupRagRoutes(app: express.Express) {
  // ─── RAG Document Database API Endpoints ─────────────────────────────────
  app.get("/api/rag/stats", (req, res) => {
    try {
      res.json(ragBackend.getStats());
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/rag/documents", (req, res) => {
    try {
      res.json(ragBackend.getDocuments());
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/rag/upload", async (req, res) => {
    const { fileName, base64, mimeType } = req.body;
    if (!base64 || !fileName) {
      return res.status(400).json({ error: "fileName and base64 payloads match required fields" });
    }
    try {
      const buffer = Buffer.from(base64.replace(/^data:[^;]+;base64,/, ''), 'base64');
      const doc = await ragBackend.addDocument(fileName, mimeType || 'text/plain', buffer);
      res.json({ success: true, document: doc });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/rag/documents/:id", async (req, res) => {
    try {
      const success = await ragBackend.deleteDocument(req.params.id);
      res.json({ success });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/rag/settings", (req, res) => {
    try {
      res.json(ragBackend.getSettings());
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/rag/settings", (req, res) => {
    try {
      const updated = ragBackend.saveSettings(req.body);
      res.json(updated);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/rag/logs", (req, res) => {
    try {
      res.json(ragBackend.getLogs());
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/rag/rebuild", async (req, res) => {
    try {
      ragBackend.rebuildIndex().catch(err => {
        ragBackend.log('error', `Reindexing pipeline error: ${err.message || err}`);
      });
      res.json({ success: true, message: "Reindexing process launched" });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/rag/clear", async (req, res) => {
    try {
      await ragBackend.clearAll();
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/rag/query", async (req, res) => {
    const { query, limit, documentIds } = req.body;
    if (!query) {
      return res.status(400).json({ error: "query text is required" });
    }
    try {
      const matches = await ragBackend.retrieve(query, limit || 5, documentIds);
      res.json(matches);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Document Parsing Service
  app.post("/api/parse-doc", async (req, res) => {
    const { fileName, base64, mimeType } = req.body;
    if (!base64) {
      return res.status(400).json({ error: "base64 file content is required" });
    }

    try {
      const buffer = Buffer.from(base64, 'base64');
      let extractedText = '';

      const lowerName = (fileName || '').toLowerCase();
      if (lowerName.endsWith('.pdf') || mimeType === 'application/pdf') {
        const parser = new PDFParse({ data: buffer });
        const result = await parser.getText();
        extractedText = result.text || '';
      } else if (lowerName.endsWith('.docx') || mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const result = await mammoth.extractRawText({ buffer });
        extractedText = result.value || '';
      } else {
        extractedText = buffer.toString('utf8');
      }

      res.json({ text: extractedText });
    } catch (error: any) {
      console.error("Error parsing document:", error);
      res.status(500).json({ error: error.message || "Failed to parse document" });
    }
  });
}
