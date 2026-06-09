/**
 * Pi-Powered Coder Mode Hook
 * 
 * Replaces manual tool-calling loops with pi agent's native agentic execution.
 * Uses the advanced pi agent framework for intelligent tool orchestration.
 */

import { useState, useCallback, useRef } from 'react';
import { Chat, Message } from '../types';
import { 
  createCoderPiAgent, 
  runCoderTask, 
  type PiAgentEvent, 
  type PiAgentEventHandler,
  type PiAgentResult 
} from '../services/piAgentService';
import type { Agent } from '../agents/types';

export interface PiCoderTodo {
  id: string;
  text: string;
  status: 'pending' | 'in_progress' | 'complete' | 'failed';
}

export interface UsePiCoderModeProps {
  currentChatId: string | null;
  chats: Chat[];
  setChats: React.Dispatch<React.SetStateAction<Chat[]>>;
  workspacePath: string;
  modelConfig?: {
    id?: string;
    provider?: string;
    baseUrl?: string;
    apiKey?: string;
  };
}

export interface UsePiCoderModeReturn {
  // State
  isCoderMode: boolean;
  setIsCoderMode: (v: boolean) => void;
  isCoderWorkspacePanelOpen: boolean;
  setIsCoderWorkspacePanelOpen: (v: boolean) => void;
  coderTodos: PiCoderTodo[];
  setCoderTodos: React.Dispatch<React.SetStateAction<PiCoderTodo[]>>;
  isGeneratingTodos: boolean;
  setIsGeneratingTodos: React.Dispatch<React.SetStateAction<boolean>>;
  showTodoPanel: boolean;
  setShowTodoPanel: React.Dispatch<React.SetStateAction<boolean>>;
  
  // Actions
  startCoderTask: (task: string) => Promise<void>;
  executeTodo: (todoId: string) => Promise<void>;
  abortCoderTask: () => void;
  
  // State from pi agent
  currentToolCall: { name: string; status: 'starting' | 'running' | 'complete' | 'error' } | null;
  isRunning: boolean;
}

export function usePiCoderMode({
  currentChatId,
  chats,
  setChats,
  workspacePath,
  modelConfig,
}: UsePiCoderModeProps): UsePiCoderModeReturn {
  const [isCoderMode, setIsCoderMode] = useState(false);
  const [isCoderWorkspacePanelOpen, setIsCoderWorkspacePanelOpen] = useState(true);
  const [coderTodos, setCoderTodos] = useState<PiCoderTodo[]>([]);
  const [isGeneratingTodos, setIsGeneratingTodos] = useState(false);
  const [showTodoPanel, setShowTodoPanel] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [currentToolCall, setCurrentToolCall] = useState<{ name: string; status: 'starting' | 'running' | 'complete' | 'error' } | null>(null);
  
  const agentRef = useRef<ReturnType<typeof createCoderPiAgent> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Handle pi agent events for UI updates
  const handlePiEvent: PiAgentEventHandler = useCallback((event: PiAgentEvent) => {
    switch (event.type) {
      case 'text':
        // Text is streamed to the chat - handled by runCoderTask callback
        break;
      case 'tool_call_start':
        setCurrentToolCall({ name: event.toolName, status: 'starting' });
        break;
      case 'tool_call_end':
        setCurrentToolCall({ name: event.toolName, status: 'complete' });
        setTimeout(() => setCurrentToolCall(null), 1500);
        break;
      case 'thinking':
        // Could show thinking indicator
        break;
      case 'error':
        console.error('Pi Coder error:', event.error);
        setCurrentToolCall(prev => prev ? { ...prev, status: 'error' } : null);
        break;
    }
  }, []);

  // Start a coding task with pi agent
  const startCoderTask = useCallback(async (task: string) => {
    if (!workspacePath) {
      console.error('No workspace path configured');
      return;
    }

    setIsRunning(true);
    setIsCoderMode(true);
    setShowTodoPanel(true);

    // Create pi agent for coder mode
    const agent = createCoderPiAgent({
      workspacePath,
      apiKey: modelConfig?.apiKey,
      model: modelConfig,
    });
    agentRef.current = agent;
    
    abortControllerRef.current = new AbortController();

    // Add user task message to chat
    const taskMessageId = `task-${Date.now()}`;
    if (currentChatId) {
      setChats(prev => prev.map(chat => {
        if (chat.id === currentChatId) {
          return {
            ...chat,
            messages: [
              ...chat.messages,
              {
                id: taskMessageId,
                role: 'user' as const,
                content: task,
                timestamp: Date.now(),
              }
            ]
          };
        }
        return chat;
      }));
    }

    try {
      const result = await runCoderTask(
        agent,
        task,
        workspacePath,
        handlePiEvent,
        abortControllerRef.current.signal
      );

      // Add assistant response to chat
      if (currentChatId) {
        setChats(prev => prev.map(chat => {
          if (chat.id === currentChatId) {
            return {
              ...chat,
              messages: [
                ...chat.messages,
                {
                  id: `response-${Date.now()}`,
                  role: 'assistant' as const,
                  content: result.text,
                  timestamp: Date.now(),
                }
              ]
            };
          }
          return chat;
        }));
      }
    } catch (error) {
      console.error('Coder task failed:', error);
      if (currentChatId) {
        setChats(prev => prev.map(chat => {
          if (chat.id === currentChatId) {
            return {
              ...chat,
              messages: [
                ...chat.messages,
                {
                  id: `error-${Date.now()}`,
                  role: 'assistant' as const,
                  content: `❌ Task failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                  timestamp: Date.now(),
                }
              ]
            };
          }
          return chat;
        }));
      }
    } finally {
      setIsRunning(false);
      setCurrentToolCall(null);
    }
  }, [workspacePath, modelConfig, currentChatId, setChats, handlePiEvent]);

  // Execute a specific todo item
  const executeTodo = useCallback(async (todoId: string) => {
    const todo = coderTodos.find(t => t.id === todoId);
    if (!todo || isRunning) return;

    // Mark todo as in progress
    setCoderTodos(prev => prev.map(t => 
      t.id === todoId ? { ...t, status: 'in_progress' as const } : t
    ));

    try {
      await startCoderTask(todo.text);
      
      // Mark todo as complete
      setCoderTodos(prev => prev.map(t => 
        t.id === todoId ? { ...t, status: 'complete' as const } : t
      ));
    } catch (error) {
      // Mark todo as failed
      setCoderTodos(prev => prev.map(t => 
        t.id === todoId ? { ...t, status: 'failed' as const } : t
      ));
    }
  }, [coderTodos, isRunning, startCoderTask]);

  // Abort the current coder task
  const abortCoderTask = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (agentRef.current) {
      agentRef.current.abort();
    }
    setIsRunning(false);
    setCurrentToolCall(null);
  }, []);

  return {
    isCoderMode,
    setIsCoderMode,
    isCoderWorkspacePanelOpen,
    setIsCoderWorkspacePanelOpen,
    coderTodos,
    setCoderTodos,
    isGeneratingTodos,
    setIsGeneratingTodos,
    showTodoPanel,
    setShowTodoPanel,
    startCoderTask,
    executeTodo,
    abortCoderTask,
    currentToolCall,
    isRunning,
  };
}