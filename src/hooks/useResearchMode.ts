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
    { id: '1', name: 'Agent Alpha', role: 'Objective Planner & Scholar Searcher', status: 'idle', currentTask: 'Awaiting research goal', progress: 0, resultsFound: 0 },
    { id: '2', name: 'Agent Beta', role: 'Web Page Extract Specialist', status: 'idle', currentTask: 'Awaiting resource assignment', progress: 0, resultsFound: 0 },
    { id: '3', name: 'Agent Gamma', role: 'Correlator & Fact Checker', status: 'idle', currentTask: 'Awaiting context consolidation', progress: 0, resultsFound: 0 },
    { id: '4', name: 'Agent Delta', role: 'Document Synthesizer', status: 'idle', currentTask: 'Awaiting compilation signal', progress: 0, resultsFound: 0 },
    { id: '5', name: 'Agent Epsilon', role: 'Refinement Auditor', status: 'idle', currentTask: 'Awaiting draft evaluation', progress: 0, resultsFound: 0 },
  ]);

  const [toolChain, setToolChain] = useState<ToolChainNode[]>([
    { id: '1', type: 'query', title: 'Target Objectives', description: 'Formulates multi-angle search queries', status: 'idle' },
    { id: '2', type: 'search', title: 'SerpAPI Scan', description: 'Executes concurrent web and scholar searches', status: 'idle' },
    { id: '3', type: 'scrape', title: 'Jina AI Extracting', description: 'Scrapes and distills raw markdown text of target sites', status: 'idle' },
    { id: '4', type: 'correlate', title: 'Claims Validation', description: 'Cross-checks findings between sources', status: 'idle' },
    { id: '5', type: 'synthesize', title: 'Compile Answers', description: 'Compiles cited comprehensive answers', status: 'idle' },
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
          logs.push(`[${timestamp}] [Orchestrator] Formulating initial sub-queries...`);
          setToolChain(tc => tc.map(n => n.type === 'query' ? { ...n, status: 'active', details: 'Formulated 4 query branches.' } : n));
          setAgents(agts => agts.map((a, i) => i < activeAgentCount ? { ...a, status: 'searching', currentTask: 'Analyzing main query...', progress: 20 } : a));
        } else if (step === 1) {
          logs.push(`[${timestamp}] [Agent Alpha] Dispatching queries: [${customQueries}]`);
          setToolChain(tc => tc.map(n => n.type === 'query' ? { ...n, status: 'complete' } : n.type === 'search' ? { ...n, status: 'active', details: 'Scanning academic & news indices...' } : n));
          setAgents(agts => agts.map((a, i) => i < activeAgentCount ? { ...a, progress: 40, resultsFound: 8 + i * 3 } : a));
        } else if (step === 2) {
          logs.push(`[${timestamp}] [Agent Alpha] Found 14 matching entries via Web Search Client...`);
          logs.push(`[${timestamp}] [Agent Beta] Launching Jina AI Extraction on top 4 high-relevance URLs...`);
          setToolChain(tc => tc.map(n => n.type === 'search' ? { ...n, status: 'complete' } : n.type === 'scrape' ? { ...n, status: 'active', details: 'Visiting r.jina.ai for citations...' } : n));
          setAgents(agts => agts.map((a, i) => i === 1 ? { ...a, status: 'reading', currentTask: 'Scraping Jina reader...', progress: 65 } : a));
        } else if (step === 3) {
          logs.push(`[${timestamp}] [Agent Beta] Jina AI extraction complete: 16,500 characters of raw context matched.`);
          logs.push(`[${timestamp}] [Agent Gamma] Triggering comparative claim alignment...`);
          setToolChain(tc => tc.map(n => n.type === 'scrape' ? { ...n, status: 'complete' } : n.type === 'correlate' ? { ...n, status: 'active', details: 'Cross-referencing claims...' } : n));
          setAgents(agts => agts.map((a, i) => i === 2 ? { ...a, status: 'analyzing', currentTask: 'Cross-referencing parameters...', progress: 80 } : a));
        } else if (step === 4) {
          logs.push(`[${timestamp}] [Agent Delta] Compiling comprehensive cited answer with [Google Scholar] footprints.`);
          setToolChain(tc => tc.map(n => n.type === 'correlate' ? { ...n, status: 'complete' } : n.type === 'synthesize' ? { ...n, status: 'active', details: 'Rendering Markdown Report...' } : n));
          setAgents(agts => agts.map((a, i) => i < activeAgentCount ? { ...a, status: 'done', progress: 100 } : a));
        } else if (step === 5) {
          logs.push(`[${timestamp}] [Orchestrator] Deep Research loop successfully complete.`);
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
