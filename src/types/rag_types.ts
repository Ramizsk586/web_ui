export interface RagDocument {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  chunkCount: number;
  status: 'pending' | 'processing' | 'indexed' | 'failed';
  error?: string;
  uploadedAt: string;
}

export interface RagChunk {
  id: string;
  documentId: string;
  documentName: string;
  content: string;
  pageNumber?: number;
  section?: string;
  createdAt: string;
  tokenCount: number;
}

export interface RagStats {
  documentCount: number;
  chunkCount: number;
  indexedCount: number;
  storageUsage: number; // in bytes
  lastUpdated: string;
}

export interface ProcessingLog {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
}

export interface RagSettingsConfig {
  chunkSize: number;
  chunkOverlap: number;
  embeddingModel: 'local-fallback' | 'ollama' | 'openai' | 'gemini';
  ollamaUrl: string;
  ollamaModel: string;
  openaiApiKey: string;
  openaiUrl: string;
  openaiModel: string;
  geminiApiKey: string;
  geminiModel: string;
}
