import { useState, useEffect, useCallback } from 'react';
import { Chat } from '../types';

export interface SubAgent {
  id: string;
  name: string;
  phase: number;
  status: 'waiting' | 'running' | 'done' | 'failed' | 'needs_review';
  filesCreated: string[];
  startedAt?: number;
  completedAt?: number;
  error?: string;
  events?: any[];
}

export interface OrchestrationConflict {
  id: string;
  description: string;
  optionA: string;
  optionB: string;
  resolved: boolean;
}

export interface ProjectAnalysis {
  complexityScore: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  estimatedFiles: number;
  domainsDetected: string[];
  recommendedStrategy: 'SOLO' | 'SUBAGENT_TEAM';
}

export interface AgentOrchestrationState {
  isActive: boolean;
  projectAnalysis: ProjectAnalysis | null;
  agents: SubAgent[];
  currentPhase: number;
  totalPhases: number;
  awaitingUserConfirmation: boolean;
  conflicts: OrchestrationConflict[];
}

export interface UseCoderModeProps {
  currentChatId: string | null;
  chats: Chat[];
  setChats: React.Dispatch<React.SetStateAction<Chat[]>>;
  isSidebarOpen: boolean;
  setIsSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  handleStartBuilding: (chatId: string, messageId: string, todos: any[]) => void;
  isTyping: boolean;
}

const INITIAL_ORCHESTRATION: AgentOrchestrationState = {
  isActive: false,
  projectAnalysis: null,
  agents: [],
  currentPhase: 0,
  totalPhases: 0,
  awaitingUserConfirmation: false,
  conflicts: [],
};

export function useCoderMode({
  currentChatId,
  chats,
  setChats,
  isSidebarOpen,
  setIsSidebarOpen,
  handleStartBuilding,
  isTyping
}: UseCoderModeProps) {
  const [isCoderMode, setIsCoderMode] = useState(false);
  const [isCoderWorkspacePanelOpen, setIsCoderWorkspacePanelOpen] = useState(true);
  const [activeCommandType, setActiveCommandType] = useState<string | null>(null);
  const [activeCommandQuery, setActiveCommandQuery] = useState<string | null>(null);
  const [coderTodos, setCoderTodosRaw] = useState<{ id: string; text?: string; content?: string; status: 'pending' | 'in_progress' | 'complete' | 'failed' }[]>([]);

  const setCoderTodos = useCallback((value: any) => {
    if (typeof value === 'function') {
      setCoderTodosRaw((prev: any) => {
        const res = value(prev);
        if (Array.isArray(res)) {
          return res.map((t: any) => ({
            ...t,
            content: t.content || t.text,
            text: t.text || t.content
          }));
        }
        return res;
      });
    } else if (Array.isArray(value)) {
      setCoderTodosRaw(
        value.map((t: any) => ({
          ...t,
          content: t.content || t.text,
          text: t.text || t.content
        }))
      );
    } else {
      setCoderTodosRaw(value);
    }
  }, []);
  const [isGeneratingTodos, setIsGeneratingTodos] = useState(false);
  const [showTodoPanel, setShowTodoPanel] = useState(false);
  const [todoCollapsed, setTodoCollapsed] = useState(false);

  const [orchestrationState, setOrchestrationState] = useState<AgentOrchestrationState>(INITIAL_ORCHESTRATION);
  const [orchestrationCollapsed, setOrchestrationCollapsed] = useState(false);

  // Synchronize isCoderMode with currentChat active coder state
  const currentChatActive = chats.find(c => c.id === currentChatId);
  useEffect(() => {
    if (currentChatActive) {
      const chatIsCoder = !!(currentChatActive as any).isCoderMode;
      setIsCoderMode(chatIsCoder);
      if (chatIsCoder) {
        setIsCoderWorkspacePanelOpen(true);
        setIsSidebarOpen(false);
      }
    } else {
      setIsCoderMode(prev => prev);
    }
  }, [currentChatId, currentChatActive, setIsSidebarOpen]);

  // Handle Mock Todo progress auto-advancement in non-coder simulated responses
  useEffect(() => {
    if (!isTyping) return;
    if (coderTodos.length === 0) return;

    // Only auto-advance if we are NOT in Coder Mode (which relies on real tool-call transitions)
    if (!isCoderMode) {
      const interval = setInterval(() => {
        setCoderTodos(prev => {
          const currentProgressIdx = prev.findIndex(t => t.status === 'in_progress');
          if (currentProgressIdx === -1) {
            const firstPendingIdx = prev.findIndex(t => t.status === 'pending');
            if (firstPendingIdx !== -1) {
              return prev.map((item, idx) => {
                if (idx === firstPendingIdx) return { ...item, status: 'in_progress' };
                return item;
              });
            }
            return prev;
          }

          return prev.map((item, idx) => {
            if (idx === currentProgressIdx) return { ...item, status: 'complete' };
            if (idx === currentProgressIdx + 1) return { ...item, status: 'in_progress' };
            return item;
          });
        });
      }, 3500);

      return () => clearInterval(interval);
    }
  }, [isTyping, isCoderMode, coderTodos.length]);

  useEffect(() => {
    if (!isCoderMode) return;
    if (coderTodos.length === 0) return;
    setShowTodoPanel(true);
    setTodoCollapsed(false);
  }, [isCoderMode, coderTodos.length]);

  useEffect(() => {
    if (!showTodoPanel) return;
    if (coderTodos.length === 0) return;
    const allDone = coderTodos.every(todo => todo.status === 'complete' || todo.status === 'completed');
    if (allDone) {
      setShowTodoPanel(false);
    }
  }, [coderTodos, showTodoPanel]);

  return {
    isCoderMode,
    setIsCoderMode,
    isCoderWorkspacePanelOpen,
    setIsCoderWorkspacePanelOpen,
    activeCommandType,
    setActiveCommandType,
    activeCommandQuery,
    setActiveCommandQuery,
    coderTodos,
    setCoderTodos,
    isGeneratingTodos,
    setIsGeneratingTodos,
    showTodoPanel,
    setShowTodoPanel,
    todoCollapsed,
    setTodoCollapsed,
    orchestrationState,
    setOrchestrationState,
    orchestrationCollapsed,
    setOrchestrationCollapsed,
  };
}
