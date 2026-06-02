import { useState, useEffect, useRef } from 'react';
import { Chat } from '../types';

export interface ResearchAgent {
  id: string;
  name: string;
  role: string;
  status: 'idle' | 'searching' | 'reading' | 'analyzing' | 'done' | 'failed';
  currentTask: string;
  progress: number;
  resultsFound: number;
}

export interface ToolChainNode {
  id: string;
  type: 'query' | 'search' | 'scrape' | 'correlate' | 'synthesize';
  title: string;
  description: string;
  status: 'idle' | 'active' | 'complete' | 'failed';
  timestamp?: string;
  details?: string;
}

export interface UseResearchModeProps {
  currentChatId: string | null;
  chats: Chat[];
  setChats: React.Dispatch<React.SetStateAction<Chat[]>>;
  isSidebarOpen: boolean;
  setIsSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export function useResearchMode({
  currentChatId,
  chats,
  setChats,
  isSidebarOpen,
  setIsSidebarOpen,
}: UseResearchModeProps) {
  const [isResearchMode, setIsResearchMode] = useState(false);
  const [isResearchWorkspaceOpen, setIsResearchWorkspaceOpen] = useState(false);
  const [activeAgentCount, setActiveAgentCount] = useState<number>(3);
  const [depthPreset, setDepthPreset] = useState<'standard' | 'extreme'>('standard');
  const [isResearchActive, setIsResearchActive] = useState(false);
  const [customQueries, setCustomQueries] = useState<string>('fusion milestone 2026, academic fusion developments');

  const [agents, setAgents] = useState<ResearchAgent[]>([
    { id: '1', name: 'Planner', role: 'Question Decomposer & Query Planner', status: 'idle', currentTask: 'Awaiting research goal', progress: 0, resultsFound: 0 },
    { id: '2', name: 'Searcher', role: 'Batched Web and Scholar Searcher', status: 'idle', currentTask: 'Awaiting query batch', progress: 0, resultsFound: 0 },
    { id: '3', name: 'Reader', role: 'Targeted Page Visitor & Evidence Extractor', status: 'idle', currentTask: 'Awaiting URL assignments', progress: 0, resultsFound: 0 },
    { id: '4', name: 'Verifier', role: 'Cross-source Claim Checker', status: 'idle', currentTask: 'Awaiting collected evidence', progress: 0, resultsFound: 0 },
    { id: '5', name: 'Synthesizer', role: 'Cited Answer Composer', status: 'idle', currentTask: 'Awaiting final evidence set', progress: 0, resultsFound: 0 },
  ]);

  const [toolChain, setToolChain] = useState<ToolChainNode[]>([
    { id: '1', type: 'query', title: 'Objective Planning', description: 'Decomposes the question into complementary query angles', status: 'idle' },
    { id: '2', type: 'search', title: 'Batched Search', description: 'Calls search/google_scholar with multiple query branches', status: 'idle' },
    { id: '3', type: 'scrape', title: 'Targeted Visit', description: 'Visits high-value URLs with explicit extraction goals', status: 'idle' },
    { id: '4', type: 'correlate', title: 'Evidence Validation', description: 'Cross-checks claims, dates, and source agreement', status: 'idle' },
    { id: '5', type: 'synthesize', title: 'Final Answer', description: 'Writes the cited Markdown synthesis once evidence is sufficient', status: 'idle' },
  ]);

  const [researchLogs, setResearchLogs] = useState<string[]>([
    '[SYSTEM] Deep Research Orchestrator initialized. Ready for user objective...',
  ]);

  const lastHandledChatIdRef = useRef<string | null>(null);

  // Synchronize state with currentChat
  useEffect(() => {
    if (currentChatId) {
      const activeChat = chats.find(c => c.id === currentChatId);
      if (activeChat) {
        if (currentChatId !== lastHandledChatIdRef.current) {
          lastHandledChatIdRef.current = currentChatId;
          const chatIsResearch = !!(activeChat as any).isResearchMode;
          setIsResearchMode(chatIsResearch);
          if (chatIsResearch) {
            setIsResearchWorkspaceOpen(true);
            setIsSidebarOpen(false);
          }
        }
      } else {
        // If the active chat is not found in the list yet (during transition/creation of a new chat),
        // we DO NOT reset the state to false! This prevents blinking during creation transitions.
      }
    } else {
      lastHandledChatIdRef.current = null;
      setIsResearchMode(false);
    }
  }, [currentChatId, chats, setIsSidebarOpen]);

  // Simulated live research process when active
  useEffect(() => {
    if (!isResearchActive) return;

    let step = 0;
    const interval = setInterval(() => {
      setResearchLogs(prev => {
        const timestamp = new Date().toLocaleTimeString();
        const logs = [...prev];

        if (step === 0) {
          logs.push(`[${timestamp}] [Orchestrator] Starting bounded ReAct research loop for objective: "${customQueries}"`);
          setToolChain(tc => tc.map(n => n.type === 'query' ? { ...n, status: 'active', details: 'Building complementary query branches.' } : n));
          setAgents(agts => agts.map((a, i) => i < activeAgentCount ? { ...a, status: 'searching', currentTask: 'Planning search angles...', progress: 20 } : a));
        } else if (step === 1) {
          logs.push(`[${timestamp}] [Searcher] Emitting batched <tool_call> search/google_scholar queries: [${customQueries}]`);
          setToolChain(tc => tc.map(n => n.type === 'query' ? { ...n, status: 'complete' } : n.type === 'search' ? { ...n, status: 'active', details: 'Calling search tools and ranking URLs.' } : n));
          setAgents(agts => agts.map((a, i) => i < activeAgentCount ? { ...a, progress: 40, resultsFound: 8 + i * 3 } : a));
        } else if (step === 2) {
          logs.push(`[${timestamp}] [Searcher] Search responses appended as <tool_response> context.`);
          logs.push(`[${timestamp}] [Reader] Visiting top high-relevance URLs with targeted extraction goals...`);
          setToolChain(tc => tc.map(n => n.type === 'search' ? { ...n, status: 'complete' } : n.type === 'scrape' ? { ...n, status: 'active', details: 'Extracting evidence and page summaries.' } : n));
          setAgents(agts => agts.map((a, i) => i === 2 ? { ...a, status: 'reading', currentTask: 'Reading selected sources...', progress: 65 } : a));
        } else if (step === 3) {
          logs.push(`[${timestamp}] [Reader] Visit responses returned evidence and summaries for source comparison.`);
          logs.push(`[${timestamp}] [Verifier] Triggering comparative claim alignment...`);
          setToolChain(tc => tc.map(n => n.type === 'scrape' ? { ...n, status: 'complete' } : n.type === 'correlate' ? { ...n, status: 'active', details: 'Cross-referencing claims and conflicts.' } : n));
          setAgents(agts => agts.map((a, i) => i === 3 ? { ...a, status: 'analyzing', currentTask: 'Cross-checking evidence...', progress: 80 } : a));
        } else if (step === 4) {
          logs.push(`[${timestamp}] [Synthesizer] Evidence is sufficient; compiling final cited Markdown answer.`);
          setToolChain(tc => tc.map(n => n.type === 'correlate' ? { ...n, status: 'complete' } : n.type === 'synthesize' ? { ...n, status: 'active', details: 'Rendering Markdown Report...' } : n));
          setAgents(agts => agts.map((a, i) => i < activeAgentCount ? { ...a, status: 'done', progress: 100 } : a));
        } else if (step === 5) {
          logs.push(`[${timestamp}] [Orchestrator] Deep Research ReAct loop complete or awaiting model final answer.`);
          setToolChain(tc => tc.map(n => n.type === 'synthesize' ? { ...n, status: 'complete' } : n));
          setIsResearchActive(false);
          clearInterval(interval);
        }

        step++;
        return logs;
      });
    }, depthPreset === 'extreme' ? 4500 : 2500);

    return () => clearInterval(interval);
  }, [isResearchActive, activeAgentCount, depthPreset, customQueries]);

  return {
    isResearchMode,
    setIsResearchMode,
    isResearchWorkspaceOpen,
    setIsResearchWorkspaceOpen,
    agents,
    setAgents,
    toolChain,
    setToolChain,
    researchLogs,
    setResearchLogs,
    activeAgentCount,
    setActiveAgentCount,
    depthPreset,
    setDepthPreset,
    isResearchActive,
    setIsResearchActive,
    customQueries,
    setCustomQueries,
  };
}
