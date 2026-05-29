import { useState, useEffect } from 'react';
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
  const [coderTodos, setCoderTodos] = useState<{ id: string; text?: string; content?: string; status: 'pending' | 'in_progress' | 'complete' | 'failed' }[]>([]);
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
      setIsCoderMode(false);
    }
  }, [currentChatId, currentChatActive, setIsSidebarOpen]);

  // Countdown Timer Effect for To-dos
  useEffect(() => {
    const timer = setInterval(() => {
      setChats(prev => {
        let updated = false;
        const nextChats = prev.map(chat => {
          const nextMessages = chat.messages.map(m => {
            if (m.todoPlan && !m.todoPlan.isConfirmed && m.todoPlan.countdown !== undefined && m.todoPlan.countdown > 0) {
              updated = true;
              const nextCountdown = m.todoPlan.countdown - 1;
              if (nextCountdown === 0) {
                // Auto-starts
                setTimeout(() => handleStartBuilding(chat.id, m.id, m.todoPlan!.todos), 0);
                return {
                  ...m,
                  todoPlan: {
                    ...m.todoPlan,
                    countdown: 0,
                    isConfirmed: true
                  }
                };
              }
              return {
                ...m,
                todoPlan: {
                  ...m.todoPlan,
                  countdown: nextCountdown
                }
              };
            }
            return m;
          });
          return { ...chat, messages: nextMessages };
        });
        return updated ? nextChats : prev;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [chats, setChats, handleStartBuilding]);

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
