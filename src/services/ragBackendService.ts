/**
 * RagBackendService - RAG (Retrieval-Augmented Generation) document management
 * 
 * This service handles document storage, indexing, and retrieval for RAG functionality.
 */

export interface RagDocument {
  id: string;
  fileName: string;
  mimeType: string;
  content: string;
  addedAt: number;
  chunkCount?: number;
}

export interface RagChunk {
  id: string;
  documentId: string;
  content: string;
  embedding?: number[];
  score?: number;
}

export interface RagSettings {
  embeddingModel: string;
  chunkSize: number;
  chunkOverlap: number;
  topK: number;
}

export interface RagLog {
  level: 'info' | 'warn' | 'error';
  message: string;
  timestamp: number;
}

export class RagBackendService {
  private documents: Map<string, RagDocument> = new Map();
  private chunks: Map<string, RagChunk[]> = new Map();
  private logs: RagLog[] = [];
  private settings: RagSettings = {
    embeddingModel: 'sentence-transformers',
    chunkSize: 512,
    chunkOverlap: 50,
    topK: 5,
  };

  constructor() {
    this.log('info', 'RAG Backend Service initialized');
  }

  getStats() {
    return {
      documentCount: this.documents.size,
      totalChunks: Array.from(this.chunks.values()).reduce((acc, chunks) => acc + chunks.length, 0),
      indexReady: this.documents.size > 0,
    };
  }

  getDocuments() {
    return Array.from(this.documents.values()).map(doc => ({
      id: doc.id,
      fileName: doc.fileName,
      mimeType: doc.mimeType,
      addedAt: doc.addedAt,
      chunkCount: this.chunks.get(doc.id)?.length || 0,
    }));
  }

  async addDocument(fileName: string, mimeType: string, buffer: Buffer): Promise<RagDocument> {
    const id = `doc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const content = buffer.toString('utf-8');
    
    const document: RagDocument = {
      id,
      fileName,
      mimeType,
      content,
      addedAt: Date.now(),
    };
    
    this.documents.set(id, document);
    
    // Simple chunking (in production, this would use proper text splitting)
    const chunks = this.chunkText(content);
    this.chunks.set(id, chunks.map((text, idx) => ({
      id: `chunk_${id}_${idx}`,
      documentId: id,
      content: text,
    })));
    
    this.log('info', `Document added: ${fileName} (${chunks.length} chunks)`);
    return document;
  }

  async deleteDocument(id: string): Promise<boolean> {
    const doc = this.documents.get(id);
    if (!doc) return false;
    
    this.documents.delete(id);
    this.chunks.delete(id);
    this.log('info', `Document deleted: ${doc.fileName}`);
    return true;
  }

  getSettings() {
    return { ...this.settings };
  }

  saveSettings(settings: Partial<RagSettings>): RagSettings {
    this.settings = { ...this.settings, ...settings };
    this.log('info', 'Settings updated');
    return this.settings;
  }

  getLogs() {
    return this.logs.slice(-100);
  }

  async rebuildIndex(): Promise<void> {
    this.log('info', 'Index rebuild started');
    // In production, this would rebuild embeddings
    await new Promise(resolve => setTimeout(resolve, 100));
    this.log('info', 'Index rebuild completed');
  }

  async clearAll(): Promise<void> {
    this.documents.clear();
    this.chunks.clear();
    this.log('info', 'All documents cleared');
  }

  async retrieve(query: string, limit: number = 5, documentIds?: string[]): Promise<RagChunk[]> {
    // Simple keyword-based retrieval (in production, would use embeddings)
    const results: RagChunk[] = [];
    const queryLower = query.toLowerCase();
    
    for (const [docId, chunks] of this.chunks) {
      if (documentIds && !documentIds.includes(docId)) continue;
      
      for (const chunk of chunks) {
        if (chunk.content.toLowerCase().includes(queryLower)) {
          results.push({
            ...chunk,
            score: chunk.content.toLowerCase().split(queryLower).length - 1,
          });
        }
      }
    }
    
    // Sort by score and limit
    results.sort((a, b) => (b.score || 0) - (a.score || 0));
    return results.slice(0, limit);
  }

  log(level: 'info' | 'warn' | 'error', message: string) {
    this.logs.push({
      level,
      message,
      timestamp: Date.now(),
    });
    // Keep only last 1000 logs
    if (this.logs.length > 1000) {
      this.logs = this.logs.slice(-1000);
    }
  }

  private chunkText(text: string): string[] {
    const chunks: string[] = [];
    const chunkSize = this.settings.chunkSize;
    const overlap = this.settings.chunkOverlap;
    
    for (let i = 0; i < text.length; i += chunkSize - overlap) {
      const chunk = text.slice(i, i + chunkSize);
      if (chunk.trim()) {
        chunks.push(chunk);
      }
      if (i + chunkSize >= text.length) break;
    }
    
    return chunks;
  }
}