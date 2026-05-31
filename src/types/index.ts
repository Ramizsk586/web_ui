import React from 'react';

export interface ToolCallNode {
  id: string;
  type: 'ai' | 'tool' | 'sub-tool' | 'result' | 'error';
  label: string;
  status: 'pending' | 'active' | 'complete' | 'failed';
  icon?: React.ReactNode;
  toolName?: string;
  argsCount?: number;
  durationMs?: number;
  resultSummary?: string;
  result?: string;
  subNodes?: ToolCallNode[];
  filePath?: string;
  addedCount?: number;
  removedCount?: number;
}

export interface Artifact {
  id: string;
  title: string;
  language: string;
  content: string;
  type: 'code' | 'markdown' | 'html' | 'poem' | 'report';
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  thinking?: string;
  thinkContent?: string;
  isThinking?: boolean;
  sources?: { title: string; url: string; icon?: string; snippet?: string }[];
  images?: { title: string; url: string; thumbnail?: string; source?: string }[];
  searchQuery?: string;
  isSearching?: boolean;
  isStreaming?: boolean;
  streamPos?: number;
  toolCalls?: ToolCallNode[];
  artifacts?: Artifact[];
  elementAttachments?: any[];
  todoPlan?: {
    title: string;
    todos: { id: string; text: string; status: 'pending' | 'in_progress' | 'complete' | 'failed' }[];
    isConfirmed?: boolean;
    countdown?: number;
  };
}

export interface Chat {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: Date;
  projectId?: string;
  isCoderMode?: boolean;
}

export interface Tool {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  icon?: React.ReactNode;
  parameters?: any;
}

export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, any>;
      required: string[];
    };
  };
}

export interface Skill {
  id: string;
  label: string;
  prompt: string;
  icon: React.ReactNode;
}

export interface AskAiQuestion {
  id: string;
  question: string;
  type: 'single_choice' | 'multi_choice' | 'scale' | 'text_input' | 'confirm';
  options?: string[];
  purpose: string;
}
