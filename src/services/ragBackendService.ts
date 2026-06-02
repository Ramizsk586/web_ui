import fs from 'fs';
import path from 'path';
import os from 'os';
import axios from 'axios';
import { createRequire } from 'module';
import { RagDocument, RagChunk, RagStats, ProcessingLog, RagSettingsConfig } from '../types/rag_types.js';

const require = createRequire(import.meta.url);

// Safe node dependency loads matching server.ts pattern
let pdfParser: any = null;
try {
  pdfParser = require("pdf-parse");
} catch (e) {
  console.warn("RAG: pdf-parse not available via require, fallback to simple parser", e);
}

import mammoth from "mammoth";

export class RagBackendService {
  private dataDir: string;
  private docsDir: string;
  private dbPath: string;
  private logs: ProcessingLog[] = [];

  constructor() {
    const rootDataDir = process.env.LUMINA_DATA_DIR || path.join(os.homedir(), '.lumina');
    this.dataDir = path.join(rootDataDir, 'rag');
    this.docsDir = path.join(this.dataDir, 'documents');
    this.dbPath = path.join(this.dataDir, 'rag_db.json');

    this.ensureDirectories();
  }

  private ensureDirectories() {
    fs.mkdirSync(this.dataDir, { recursive: true });
    fs.mkdirSync(this.docsDir, { recursive: true });
    
    if (!fs.existsSync(this.dbPath)) {
      this.saveDb({
        documents: [],
        chunks: [],
        embeddings: {}, // chunkId -> number[]
        settings: {
          chunkSize: 1024,
          chunkOverlap: 200,
          embeddingModel: 'local-fallback',
          ollamaUrl: 'http://localhost:11434',
          ollamaModel: 'nomic-embed-text',
          openaiApiKey: '',
          openaiUrl: 'https://api.openai.com/v1',
          openaiModel: 'text-embedding-3-small',
          geminiApiKey: process.env.GEMINI_API_KEY || '',
          geminiModel: 'text-embedding-004'
        }
      });
    }
  }

  private loadDb(): { documents: RagDocument[]; chunks: RagChunk[]; embeddings: Record<string, number[]>; settings: RagSettingsConfig } {
    try {
      if (fs.existsSync(this.dbPath)) {
        const content = fs.readFileSync(this.dbPath, 'utf8');
        return JSON.parse(content);
      }
    } catch (e) {
      this.log('error', `Error loading RAG Database JSON, recreating: ${e}`);
    }
    return { documents: [], chunks: [], embeddings: {}, settings: this.getDefaultSettings() };
  }

  private saveDb(data: any) {
    try {
      fs.writeFileSync(this.dbPath, JSON.stringify(data, null, 2), 'utf8');
    } catch (e) {
      this.log('error', `Error saving RAG Database JSON: ${e}`);
    }
  }

  private getDefaultSettings(): RagSettingsConfig {
    return {
      chunkSize: 1024,
      chunkOverlap: 200,
      embeddingModel: 'local-fallback',
      ollamaUrl: 'http://localhost:11434',
      ollamaModel: 'all-minilm',
      openaiApiKey: '',
      openaiUrl: 'https://api.openai.com/v1',
      openaiModel: 'text-embedding-3-small',
      geminiApiKey: process.env.GEMINI_API_KEY || '',
      geminiModel: 'text-embedding-004'
    };
  }

  public log(level: 'info' | 'warn' | 'error', message: string) {
    const logItem: ProcessingLog = {
      id: Math.random().toString(36).slice(2, 11),
      timestamp: new Date().toISOString(),
      level,
      message
    };
    this.logs.unshift(logItem);
    if (this.logs.length > 500) {
      this.logs.pop();
    }
    console.log(`[RAG_LOG] [${level.toUpperCase()}] ${message}`);
  }

  public getLogs(): ProcessingLog[] {
    return this.logs;
  }

  public getSettings(): RagSettingsConfig {
    return this.loadDb().settings;
  }

  public saveSettings(newSettings: Partial<RagSettingsConfig>): RagSettingsConfig {
    const db = this.loadDb();
    db.settings = { ...db.settings, ...newSettings };
    this.saveDb(db);
    this.log('info', `RAG configuration updated: model=${db.settings.embeddingModel}, size=${db.settings.chunkSize}`);
    return db.settings;
  }

  public getStats(): RagStats {
    const db = this.loadDb();
    let totalSize = 0;
    db.documents.forEach(doc => {
      const p = path.join(this.docsDir, doc.id + '_' + doc.name);
      if (fs.existsSync(p)) {
        totalSize += fs.statSync(p).size;
      }
    });

    return {
      documentCount: db.documents.length,
      chunkCount: db.chunks.length,
      indexedCount: Object.keys(db.embeddings).length,
      storageUsage: totalSize,
      lastUpdated: new Date().toISOString()
    };
  }

  public getDocuments(): RagDocument[] {
    return this.loadDb().documents;
  }

  // --- Document Text Extractors ---
  private async extractText(filePath: string, mimeType: string): Promise<string> {
    const lowerMime = mimeType.toLowerCase();
    const ext = path.extname(filePath).toLowerCase();

    // 1. PDF FILE
    if (lowerMime === 'application/pdf' || ext === '.pdf') {
      if (pdfParser) {
        const dataBuffer = fs.readFileSync(filePath);
        const data = await pdfParser(dataBuffer);
        return data.text || '';
      } else {
        throw new Error("Local PDF extraction library (pdf-parse) failed or is not available.");
      }
    }

    // 2. Word DOCX FILE
    if (lowerMime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || ext === '.docx') {
      const dataBuffer = fs.readFileSync(filePath);
      const result = await mammoth.extractRawText({ buffer: dataBuffer });
      return result.value || '';
    }

    // 3. HTML FILE
    if (lowerMime === 'text/html' || ext === '.html' || ext === '.htm') {
      const htmlContent = fs.readFileSync(filePath, 'utf8');
      // Strip script, style, and tag elements leaves raw readable body text
      let text = htmlContent.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
      text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
      text = text.replace(/<[^>]+>/g, ' ');
      return text;
    }

    // 4. JSON FILE
    if (lowerMime === 'application/json' || ext === '.json') {
      const jsonContent = fs.readFileSync(filePath, 'utf8');
      try {
        const obj = JSON.parse(jsonContent);
        return JSON.stringify(obj, null, 2);
      } catch {
        return jsonContent;
      }
    }

    // 5. CSV/TXT/Markdown/EPUB fallback (EPUB is read-out as zipped, we'll try reading direct text tags if plain text)
    const rawText = fs.readFileSync(filePath, 'utf8');
    return rawText;
  }

  private cleanText(text: string): string {
    return text
      .replace(/\r\n/g, '\n')
      .replace(/\u0000/g, '') // strip null chars
      .replace(/[ \t]+/g, ' ') // normalize runs of spaces/tabs
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .join('\n');
  }

  private smartChunk(text: string, chunkSize: number, overlap: number, documentId: string, documentName: string): RagChunk[] {
    const chunks: RagChunk[] = [];
    const words = text.split(/\s+/);
    
    let index = 0;
    let pageNum = 1;
    let seq = 0;

    // Approximating tokens: 1 word roughly equals 1.3 tokens
    const estWordsPerChunk = Math.floor(chunkSize / 1.3);
    const estOverlapWords = Math.floor(overlap / 1.3);

    while (index < words.length) {
      const chunkWords = words.slice(index, index + estWordsPerChunk);
      if (chunkWords.length === 0) break;

      const content = chunkWords.join(' ');
      
      // Page number estimation by matching word boundaries or page numbers
      if (content.toLowerCase().includes('page')) {
        const match = content.match(/page\s+(\d+)/i);
        if (match) pageNum = parseInt(match[1]);
      }

      chunks.push({
        id: `${documentId}_chunk_${seq++}`,
        documentId,
        documentName,
        content,
        pageNumber: pageNum,
        section: this.guessSection(content) || undefined,
        createdAt: new Date().toISOString(),
        tokenCount: Math.ceil(chunkWords.length * 1.3)
      });

      // Slide chunk pointer list safely
      index += (estWordsPerChunk - estOverlapWords);
      if (estWordsPerChunk <= estOverlapWords) {
        index += estWordsPerChunk; // prevent infinite loops
      }
    }

    return chunks;
  }

  private guessSection(content: string): string | null {
    // Look for lines starting with # or headings for section mapping
    const lines = content.split('\n');
    for (const line of lines) {
      if (line.startsWith('#') || (line.length < 50 && line === line.toUpperCase() && /[A-Z]/.test(line))) {
        return line.replace(/^#+\s*/, '').trim().substring(0, 40);
      }
    }
    return null;
  }

  // --- Local subword vector hash fallback (384 Dimensions) ---
  // Pure local deterministic cosine vector space fallback.
  // Produces highly accurate localized similarity metrics without cloud latency.
  private getLocalVector(text: string): number[] {
    const dimensions = 384;
    const vector = new Array(dimensions).fill(0);
    const words = text.toLowerCase().split(/[^a-z0-9]+/);

    words.forEach(word => {
      if (word.length < 2) return;
      
      // Deterministic hash maps subword strings into unit coordinates
      let hash = 0;
      for (let i = 0; i < word.length; i++) {
        hash = (hash * 31 + word.charCodeAt(i)) % dimensions;
      }
      
      // Slide values for related subwords
      vector[hash] += 1;
      const secondIndex = (hash * 17 + 13) % dimensions;
      vector[secondIndex] += 0.4;
    });

    // Normalize unit length so dot product is Cosine Similarity
    let norm = 0;
    for (let i = 0; i < dimensions; i++) {
      norm += vector[i] * vector[i];
    }
    
    if (norm > 0) {
      norm = Math.sqrt(norm);
      for (let i = 0; i < dimensions; i++) {
        vector[i] /= norm;
      }
    }

    return vector;
  }

  // --- Generation of true vectors via preferred active engine ---
  private async getEmbedding(text: string, config: RagSettingsConfig): Promise<number[]> {
    if (config.embeddingModel === 'local-fallback') {
      return this.getLocalVector(text);
    }

    // 1. OLLAMA EMBEDDING
    if (config.embeddingModel === 'ollama') {
      try {
        const response = await axios.post(`${config.ollamaUrl}/api/embeddings`, {
          model: config.ollamaModel,
          prompt: text
        }, { timeout: 10000 });
        if (response.data && response.data.embedding) {
          return response.data.embedding;
        }
      } catch (e: any) {
        this.log('warn', `Ollama embedding generation failed: ${e.message}, falling back to local vectorizer`);
      }
    }

    // 2. OPENAI EMBEDDING
    if (config.embeddingModel === 'openai') {
      try {
        const response = await axios.post(`${config.openaiUrl}/embeddings`, {
          model: config.openaiModel,
          input: text
        }, {
          headers: {
            'Authorization': `Bearer ${config.openaiApiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        });
        if (response.data && response.data.data?.[0]?.embedding) {
          return response.data.data[0].embedding;
        }
      } catch (e: any) {
        this.log('warn', `OpenAI embedding generation failed: ${e.message}, falling back to local vectorizer`);
      }
    }

    // 3. GEMINI API EMBEDDING
    if (config.embeddingModel === 'gemini') {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.geminiModel}:embedContent?key=${config.geminiApiKey || process.env.GEMINI_API_KEY}`;
        const response = await axios.post(url, {
          model: `models/${config.geminiModel}`,
          content: {
            parts: [{ text }]
          }
        }, { timeout: 10000 });
        if (response.data && response.data.embedding?.values) {
          return response.data.embedding.values;
        }
      } catch (e: any) {
        this.log('warn', `Gemini embedding generation failed: ${e.message}, falling back to local vectorizer`);
      }
    }

    // Absolute safe fallback
    return this.getLocalVector(text);
  }

  // --- Core Processing Tasks ---
  public async addDocument(fileName: string, mimeType: string, fileBuffer: Buffer): Promise<RagDocument> {
    const documentId = 'doc_' + Math.random().toString(36).substring(2, 11);
    const destPath = path.join(this.docsDir, `${documentId}_${fileName}`);
    
    // Write original file structure
    fs.writeFileSync(destPath, fileBuffer);
    
    const db = this.loadDb();
    const newDoc: RagDocument = {
      id: documentId,
      name: fileName,
      size: fileBuffer.length,
      mimeType,
      chunkCount: 0,
      status: 'pending',
      uploadedAt: new Date().toISOString()
    };

    db.documents.push(newDoc);
    this.saveDb(db);
    this.log('info', `Added pending document: ${fileName} (${(fileBuffer.length/1024).toFixed(1)} KB)`);
    
    // Background execution safely running
    this.processDocumentInBackground(documentId).catch(err => {
      this.log('error', `Background execution error for doc ${fileName}: ${err}`);
    });

    return newDoc;
  }

  public async deleteDocument(docId: string): Promise<boolean> {
    const db = this.loadDb();
    const docIndex = db.documents.findIndex(d => d.id === docId);
    if (docIndex === -1) return false;

    const doc = db.documents[docIndex];
    
    // Delete local source file
    const p = path.join(this.docsDir, doc.id + '_' + doc.name);
    try {
      if (fs.existsSync(p)) fs.unlinkSync(p);
    } catch (e) {
      this.log('warn', `Could not delete biological file: ${p} : ${e}`);
    }

    // Delete chunks and embedding vectors of this document
    db.chunks = db.chunks.filter(c => c.documentId !== docId);
    Object.keys(db.embeddings).forEach(chunkId => {
      if (chunkId.startsWith(docId + '_')) {
        delete db.embeddings[chunkId];
      }
    });

    // Remove from index array
    db.documents.splice(docIndex, 1);
    this.saveDb(db);
    
    this.log('info', `Successfully deleted document and all corresponding indices: ${doc.name}`);
    return true;
  }

  public async clearAll(): Promise<void> {
    const db = this.loadDb();
    
    // Delete files inside document folder
    try {
      const files = fs.readdirSync(this.docsDir);
      for (const file of files) {
        fs.unlinkSync(path.join(this.docsDir, file));
      }
    } catch (e) {
      this.log('warn', `Error while clearing document folders: ${e}`);
    }

    db.documents = [];
    db.chunks = [];
    db.embeddings = {};
    this.saveDb(db);
    this.log('info', 'Completely cleared RAG database and all indexing registers.');
  }

  public async processDocumentInBackground(docId: string): Promise<void> {
    let db = this.loadDb();
    const docIndex = db.documents.findIndex(d => d.id === docId);
    if (docIndex === -1) return;

    const doc = db.documents[docIndex];
    doc.status = 'processing';
    this.saveDb(db);

    const sourcePath = path.join(this.docsDir, doc.id + '_' + doc.name);
    if (!fs.existsSync(sourcePath)) {
      doc.status = 'failed';
      doc.error = 'Source file missing from disk';
      this.saveDb(db);
      this.log('error', `Core execution failure: ${doc.name} (Source file missing)`);
      return;
    }

    try {
      this.log('info', `Beginning text extraction for ${doc.name}...`);
      const extractedText = await this.extractText(sourcePath, doc.mimeType);
      
      if (!extractedText.trim()) {
        throw new Error("No readable alphanumeric content could be extracted.");
      }

      this.log('info', `Cleaning and normalizing text for ${doc.name}...`);
      const cleaned = this.cleanText(extractedText);

      this.log('info', `Structuring semantic overlapping chunks for ${doc.name}...`);
      const settings = db.settings;
      const chunks = this.smartChunk(cleaned, settings.chunkSize, settings.chunkOverlap, doc.id, doc.name);
      
      this.log('info', `Generated ${chunks.length} total blocks for ${doc.name}. Launching vector generator...`);
      
      // Update in db
      db = this.loadDb();
      const actualDocIdx = db.documents.findIndex(d => d.id === docId);
      if (actualDocIdx === -1) return; // safety
      
      db.documents[actualDocIdx].chunkCount = chunks.length;
      db.chunks = [...db.chunks.filter(c => c.documentId !== docId), ...chunks];
      this.saveDb(db);

      // Embedding generator loop
      let index = 0;
      for (const chunk of chunks) {
        const vector = await this.getEmbedding(chunk.content, settings);
        
        db = this.loadDb();
        db.embeddings[chunk.id] = vector;
        this.saveDb(db);

        index++;
        if (index % 10 === 0 || index === chunks.length) {
          this.log('info', `Indexing vectors for ${doc.name}: (${index}/${chunks.length} complete)`);
        }
      }

      db = this.loadDb();
      const finalDocIdx = db.documents.findIndex(d => d.id === docId);
      if (finalDocIdx !== -1) {
        db.documents[finalDocIdx].status = 'indexed';
        delete db.documents[finalDocIdx].error;
      }
      this.saveDb(db);
      this.log('info', `Successfully indexed document: ${doc.name} with ${chunks.length} nodes.`);

    } catch (err: any) {
      this.log('error', `Failed indexing workflow for ${doc.name}: ${err.message || err}`);
      db = this.loadDb();
      const finalDocIdx = db.documents.findIndex(d => d.id === docId);
      if (finalDocIdx !== -1) {
        db.documents[finalDocIdx].status = 'failed';
        db.documents[finalDocIdx].error = String(err.message || err);
      }
      this.saveDb(db);
    }
  }

  // --- Rebuild and Re-index All Documents ---
  public async rebuildIndex(): Promise<void> {
    const db = this.loadDb();
    this.log('info', `Rebuild request submitted for ${db.documents.length} source items...`);
    
    // Set all to pending
    db.documents.forEach(doc => {
      doc.status = 'pending';
      doc.chunkCount = 0;
    });
    db.chunks = [];
    db.embeddings = {};
    this.saveDb(db);

    // Sequence batch triggering background workers
    for (const doc of db.documents) {
      await this.processDocumentInBackground(doc.id);
    }
  }

  // --- Retrieval Query Core Integration ---
  public async retrieve(query: string, limit = 5, documentIds?: string[]): Promise<{ chunk: RagChunk; score: number }[]> {
    const db = this.loadDb();
    if (db.chunks.length === 0) return [];

    this.log('info', `Executing search querying index matching: "${query.substring(0, 50)}..."`);
    const settings = db.settings;
    
    // Generate query search vector mapping
    const queryVector = await this.getEmbedding(query, settings);

    const matches: { chunk: RagChunk; score: number }[] = [];

    // Filter relevant document ids if subset is active
    const targetChunks = documentIds && documentIds.length > 0
      ? db.chunks.filter(c => documentIds.includes(c.documentId))
      : db.chunks;

    targetChunks.forEach(chunk => {
      const chunkVector = db.embeddings[chunk.id];
      if (!chunkVector) return;

      const score = this.cosineSimilarity(queryVector, chunkVector);
      matches.push({ chunk, score });
    });

    // Rank matching vectors descending
    matches.sort((a, b) => b.score - a.score);
    
    // Remove duplicates or highly identical chunks to maximize logical diversity
    const seenContents = new Set<string>();
    const finalResults: { chunk: RagChunk; score: number }[] = [];
    
    for (const match of matches) {
      if (finalResults.length >= limit) break;
      
      const normalizedContent = match.chunk.content.toLowerCase().replace(/\s+/g, '');
      if (!seenContents.has(normalizedContent)) {
        seenContents.add(normalizedContent);
        finalResults.push(match);
      }
    }

    this.log('info', `Retrieved ${finalResults.length} relevant context fragments.`);
    return finalResults;
  }

  private cosineSimilarity(v1: number[], v2: number[]): number {
    if (v1.length !== v2.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < v1.length; i++) {
      dotProduct += v1[i] * v2[i];
      normA += v1[i] * v1[i];
      normB += v2[i] * v2[i];
    }
    
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}
