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
  type: 'time' | 'query' | 'search' | 'wiki' | 'scrape' | 'correlate' | 'synthesize';
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
    { id: '1', type: 'time', title: 'Time Anchor', description: 'Reads the live date and time before starting research', status: 'idle' },
    { id: '2', type: 'query', title: 'Objective Planning', description: 'Decomposes the question into complementary query angles', status: 'idle' },
    { id: '3', type: 'search', title: 'Web Discovery', description: 'Runs normal web and scholar searches to map the source landscape', status: 'idle' },
    { id: '4', type: 'wiki', title: 'Wikipedia Grounding', description: 'Builds background context, timelines, and related entity grounding', status: 'idle' },
    { id: '5', type: 'scrape', title: 'Deep Extraction', description: 'Visits and scrapes high-value sources for fuller evidence', status: 'idle' },
    { id: '6', type: 'correlate', title: 'Evidence Validation', description: 'Cross-checks claims, dates, conflicts, and source agreement', status: 'idle' },
    { id: '7', type: 'synthesize', title: 'Final Answer', description: 'Writes the cited Markdown synthesis once evidence is sufficient', status: 'idle' },
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
          logs.push(`[${timestamp}] [Orchestrator] Starting ${depthPreset === 'extreme' ? 'advanced' : 'normal'} deep research loop for objective: "${customQueries}"`);
          setToolChain(tc => tc.map(n => n.type === 'time' ? { ...n, status: 'active', details: 'Reading live date, time, and timezone.' } : n));
          setAgents(agts => agts.map((a, i) => i < activeAgentCount ? { ...a, status: 'searching', currentTask: 'Anchoring current time and preparing research plan...', progress: 12 } : a));
        } else if (step === 1) {
          logs.push(`[${timestamp}] [Planner] Time anchored. Creating ${depthPreset === 'extreme' ? 'multi-phase' : 'concise'} research plan.`);
          setToolChain(tc => tc.map(n => n.type === 'time' ? { ...n, status: 'complete' } : n.type === 'query' ? { ...n, status: 'active', details: depthPreset === 'extreme' ? 'Building discovery, grounding, extraction, and verification stages.' : 'Building complementary query branches.' } : n));
          setAgents(agts => agts.map((a, i) => i < activeAgentCount ? { ...a, progress: 24, currentTask: 'Planning search angles and evidence stages...' } : a));
        } else if (step === 2) {
          logs.push(`[${timestamp}] [Searcher] ${depthPreset === 'extreme' ? 'Running wider discovery across multiple search angles.' : 'Running core discovery queries.'}`);
          setToolChain(tc => tc.map(n => n.type === 'query' ? { ...n, status: 'complete' } : n.type === 'search' ? { ...n, status: 'active', details: depthPreset === 'extreme' ? 'Expanding search coverage, ranking URLs, and comparing query branches.' : 'Calling search tools and ranking URLs.' } : n));
          setAgents(agts => agts.map((a, i) => i < activeAgentCount ? { ...a, progress: 42, resultsFound: depthPreset === 'extreme' ? 14 + i * 4 : 8 + i * 3 } : a));
        } else if (step === 3) {
          logs.push(`[${timestamp}] [Grounder] Using Wikipedia for definitions, timelines, and related entities.`);
          setToolChain(tc => tc.map(n => n.type === 'search' ? { ...n, status: 'complete' } : n.type === 'wiki' ? { ...n, status: 'active', details: depthPreset === 'extreme' ? 'Running repeated wiki passes for timeline, entity, and related-topic grounding.' : 'Gathering background context and entity grounding.' } : n));
          setAgents(agts => agts.map((a, i) => i === 1 ? { ...a, status: 'reading', currentTask: 'Grounding findings with Wikipedia context...', progress: 58 } : a));
        } else if (step === 4) {
          logs.push(`[${timestamp}] [Reader] Visiting and scraping high-value sources for fuller evidence extraction.`);
          setToolChain(tc => tc.map(n => n.type === 'wiki' ? { ...n, status: 'complete' } : n.type === 'scrape' ? { ...n, status: 'active', details: depthPreset === 'extreme' ? 'Scraping multiple source types and expanding extraction depth.' : 'Extracting evidence and page summaries.' } : n));
          setAgents(agts => agts.map((a, i) => i === 2 ? { ...a, status: 'reading', currentTask: 'Reading selected sources and scraping key pages...', progress: 74 } : a));
        } else if (step === 5) {
          logs.push(`[${timestamp}] [Verifier] ${depthPreset === 'extreme' ? 'Running stronger cross-source validation and conflict checks.' : 'Cross-checking key claims and dates.'}`);
          setToolChain(tc => tc.map(n => n.type === 'scrape' ? { ...n, status: 'complete' } : n.type === 'correlate' ? { ...n, status: 'active', details: depthPreset === 'extreme' ? 'Comparing source agreement, recency, contradictions, and evidence quality.' : 'Cross-referencing claims and conflicts.' } : n));
          setAgents(agts => agts.map((a, i) => i === 3 ? { ...a, status: 'analyzing', currentTask: 'Cross-checking evidence...', progress: 88 } : a));
        } else if (step === 6) {
          logs.push(`[${timestamp}] [Synthesizer] Evidence is sufficient; compiling ${depthPreset === 'extreme' ? 'expanded' : 'final'} cited Markdown answer.`);
          setToolChain(tc => tc.map(n => n.type === 'correlate' ? { ...n, status: 'complete' } : n.type === 'synthesize' ? { ...n, status: 'active', details: depthPreset === 'extreme' ? 'Rendering expanded Markdown report with denser sourcing...' : 'Rendering Markdown Report...' } : n));
          setAgents(agts => agts.map((a, i) => i < activeAgentCount ? { ...a, status: 'done', progress: 100 } : a));
        } else if (step === 7) {
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
