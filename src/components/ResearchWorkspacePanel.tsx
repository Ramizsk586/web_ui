import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bot, 
  Search, 
  Layers, 
  Cpu, 
  Activity, 
  Play, 
  Square, 
  RotateCcw, 
  Plus, 
  Minus, 
  Copy, 
  Globe, 
  BookOpen, 
  Terminal, 
  Settings, 
  X, 
  ExternalLink,
  Sliders,
  Workflow,
  Shield,
  Radio,
  Database,
  Sparkles,
  Brain,
  Compass,
  Clock,
  Thermometer,
  CheckCircle
} from 'lucide-react';
import { useResearchMode, ResearchAgent, ToolChainNode } from '../hooks/useResearchMode';

interface ResearchWorkspacePanelProps {
  researchState: ReturnType<typeof useResearchMode>;
  onClose?: () => void;
  showToast: (msg: string) => void;
}

export default function ResearchWorkspacePanel({
  researchState,
  onClose,
  showToast
}: ResearchWorkspacePanelProps) {
  const {
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
    setIsResearchWorkspaceOpen
  } = researchState;

  const [activePanel, setActivePanel] = useState<'overview' | 'agents' | 'chain' | 'logs'>('overview');
  const [editingQueries, setEditingQueries] = useState(false);
  const [queriesInput, setQueriesInput] = useState(customQueries);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>('1');
  const [logFilter, setLogFilter] = useState<'all' | 'system' | 'agents'>('all');
  const [logSearchQuery, setLogSearchQuery] = useState('');
  
  const logsEndRef = useRef<HTMLDivElement | null>(null);

  // Custom Agent Creation Form States
  const [showSpawnForm, setShowSpawnForm] = useState(false);
  const [newAgentName, setNewAgentName] = useState('');
  const [newAgentRole, setNewAgentRole] = useState('');
  const [newAgentTask, setNewAgentTask] = useState('');

  // Custom Pipeline Stage Creation Form States
  const [showAddStageForm, setShowAddStageForm] = useState(false);
  const [newStageTitle, setNewStageTitle] = useState('');
  const [newStageDesc, setNewStageDesc] = useState('');
  const [newStageType, setNewStageType] = useState<'query' | 'search' | 'scrape' | 'correlate' | 'synthesize'>('search');
  const activeNodes = toolChain.filter(node => node.status === 'active');
  const completedNodes = toolChain.filter(node => node.status === 'complete');
  const liveAgentCount = agents.filter(agent => agent.status !== 'idle' && agent.status !== 'failed').length;
  const totalResultsFound = agents.reduce((sum, agent) => sum + agent.resultsFound, 0);
  const latestSystemLog = [...researchLogs].reverse().find(log => log.includes('[SYSTEM]') || log.includes('[Orchestrator]')) || researchLogs[researchLogs.length - 1] || 'No system activity recorded yet.';
  const latestAgentLog = [...researchLogs].reverse().find(log => log.includes('[Planner]') || log.includes('[Searcher]') || log.includes('[Grounder]') || log.includes('[Reader]') || log.includes('[Verifier]') || log.includes('[Synthesizer]')) || 'No agent activity recorded yet.';
  const activeNode = activeNodes[0] || null;
  const selectedNode = selectedNodeId ? toolChain.find(n => n.id === selectedNodeId) || null : null;

  // Agent Operations
  const handleSpawnAgent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAgentName.trim() || !newAgentRole.trim()) {
      showToast('Agent name and role are required!');
      return;
    }
    const newId = (agents.length + 1).toString();
    const newAgent: ResearchAgent = {
      id: newId,
      name: newAgentName.trim(),
      role: newAgentRole.trim(),
      status: 'idle',
      currentTask: newAgentTask.trim() || 'Standing by for instructions',
      progress: 0,
      resultsFound: 0
    };
    setAgents(prev => [...prev, newAgent]);
    // Increase active counter if it is below current count to ensure new agent is immediately active
    if (activeAgentCount < agents.length + 1 && activeAgentCount < 5) {
      setActiveAgentCount(prev => Math.min(5, prev + 1));
    }
    setResearchLogs(prev => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] [SYSTEM] New custom research agent "${newAgent.name}" spawned inside mesh (Role: ${newAgent.role}).`
    ]);
    showToast(`Agent "${newAgent.name}" spawned successfully!`);
    setNewAgentName('');
    setNewAgentRole('');
    setNewAgentTask('');
    setShowSpawnForm(false);
  };

  const handleDeleteAgent = (id: string, name: string) => {
    if (agents.length <= 1) {
      showToast('You must have at least one active agent in the mesh.');
      return;
    }
    setAgents(prev => prev.filter(a => a.id !== id));
    setResearchLogs(prev => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] [SYSTEM] Custom research agent "${name}" deleted from mesh cluster.`
    ]);
    showToast(`Agent "${name}" deleted.`);
  };

  // Pipeline Stage Operations
  const handleCreateStage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStageTitle.trim() || !newStageDesc.trim()) {
      showToast('Stage title and description are required!');
      return;
    }
    const newId = (toolChain.length + 1).toString();
    const newStage: ToolChainNode = {
      id: newId,
      type: newStageType,
      title: newStageTitle.trim(),
      description: newStageDesc.trim(),
      status: 'idle'
    };
    setToolChain(prev => [...prev, newStage]);
    setResearchLogs(prev => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] [SYSTEM] Dynamic pipeline node "${newStage.title}" created (Type: ${newStage.type.toUpperCase()}).`
    ]);
    showToast(`Stage "${newStage.title}" appended to pipeline!`);
    setNewStageTitle('');
    setNewStageDesc('');
    setNewStageType('search');
    setShowAddStageForm(false);
  };

  const handleDeleteStage = (id: string, title: string) => {
    if (toolChain.length <= 1) {
      showToast('You must have at least one execution node in the pipeline.');
      return;
    }
    setToolChain(prev => prev.filter(n => n.id !== id));
    setResearchLogs(prev => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] [SYSTEM] Pipeline stage node "${title}" removed from logic graph.`
    ]);
    showToast(`Stage "${title}" removed.`);
  };

  // Agent/pipeline templating
  const handleAiSynthesis = () => {
    if (isResearchActive) {
      showToast('Stop the active research run before applying a new agent template.');
      return;
    }
    const timestamp = new Date().toLocaleTimeString();
    const rawQueries = customQueries.split(',').map(q => q.trim()).filter(Boolean);
    const coreTopic = rawQueries[0] || 'Target Domain';
    const topicName = coreTopic.replace(/\b\w/g, c => c.toUpperCase());

    const customAgents: ResearchAgent[] = [
      {
        id: '1',
        name: `${topicName} Planner`,
        role: 'Objective Planner & Angle Mapper',
        status: 'idle',
        currentTask: `Preparing research outline for "${coreTopic}"`,
        progress: 0,
        resultsFound: 0
      },
      {
        id: '2',
        name: `${topicName.split(' ')[0] || 'Domain'} Search Lead`,
        role: 'Web Search & Source Discovery',
        status: 'idle',
        currentTask: 'Waiting for search assignments',
        progress: 0,
        resultsFound: 0
      },
      {
        id: '3',
        name: 'Evidence Verifier',
        role: 'Scrape Review & Claim Validation',
        status: 'idle',
        currentTask: 'Waiting for evidence packets',
        progress: 0,
        resultsFound: 0
      },
    ];

    const customPipeline: ToolChainNode[] = [
      {
        id: '1',
        type: 'query',
        title: `Outline ${topicName.split(' ')[0] || 'Target'} Angles`,
        description: `Breaks "${coreTopic}" into actionable research directions.`,
        status: 'idle'
      },
      {
        id: '2',
        type: 'search',
        title: 'Source Discovery Pass',
        description: `Collects candidate sources for ${customQueries}.`,
        status: 'idle'
      },
      {
        id: '3',
        type: 'scrape',
        title: 'Evidence Extraction Pass',
        description: 'Reads the highest-value pages and captures evidence.',
        status: 'idle'
      },
      {
        id: '4',
        type: 'correlate',
        title: 'Cross-Check Findings',
        description: 'Compares evidence, dates, and source agreement.',
        status: 'idle'
      },
      {
        id: '5',
        type: 'synthesize',
        title: 'Assemble Final Brief',
        description: 'Produces the cited report from validated findings.',
        status: 'idle'
      }
    ];

    setAgents(customAgents);
    setToolChain(customPipeline);
    setActiveAgentCount(3);
    setResearchLogs(prev => [
      ...prev,
      `[${timestamp}] [SYSTEM] Applied research template for "${coreTopic}" with ${customAgents.length} agents and ${customPipeline.length} execution stages.`
    ]);
    showToast('Research template applied.');
  };

  // Scroll logs to bottom
  useEffect(() => {
    if (logsEndRef.current && activePanel === 'logs') {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [researchLogs, activePanel]);

  const handleStartResearch = () => {
    if (isResearchActive) {
      setIsResearchActive(false);
      setResearchLogs(prev => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] [SYSTEM] Research paused by operator.`
      ]);
      showToast('Research paused.');
    } else {
      setIsResearchActive(true);
      setResearchLogs(prev => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] [SYSTEM] Starting concurrent parallel agent tasks...`
      ]);
      showToast('Deep Research activated!');
    }
  };

  const handleResetResearch = () => {
    setIsResearchActive(false);
    setQueriesInput(customQueries);
    setResearchLogs([
      `[${new Date().toLocaleTimeString()}] [SYSTEM] Research resetting. Core system status healthy.`
    ]);
    showToast('Research system cleared.');
  };

  const handleSaveQueries = () => {
    setCustomQueries(queriesInput);
    setEditingQueries(false);
    setResearchLogs(prev => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] [SYSTEM] Updated sub-research queries target: "${queriesInput}"`
    ]);
    showToast('Target queries updated!');
  };

  const handleCopyLogs = () => {
    navigator.clipboard.writeText(researchLogs.join('\n'));
    showToast('Telemetry logs copied to clipboard.');
  };

  const handleAddQueryTag = (tag: string) => {
    const cleanTag = tag.trim();
    if (!cleanTag) return;
    const currentTags = customQueries.split(',').map(t => t.trim()).filter(Boolean);
    if (currentTags.includes(cleanTag)) {
      showToast('Query tag already exists.');
      return;
    }
    const newQueries = [...currentTags, cleanTag].join(', ');
    setCustomQueries(newQueries);
    setQueriesInput(newQueries);
    showToast(`Added query: ${cleanTag}`);
  };

  const handleRemoveQueryTag = (index: number) => {
    const currentTags = customQueries.split(',').map(t => t.trim()).filter(Boolean);
    currentTags.splice(index, 1);
    const newQueries = currentTags.join(', ');
    setCustomQueries(newQueries);
    setQueriesInput(newQueries);
    showToast('Query tag removed.');
  };

  // Filtered logs
  const filteredLogs = researchLogs.filter(log => {
    // Apply type filter
    if (logFilter === 'system' && !log.includes('[SYSTEM]') && !log.includes('[Orchestrator]')) return false;
    if (logFilter === 'agents' && !log.includes('[Agent')) return false;
    
    // Apply search query
    if (logSearchQuery.trim() !== '') {
      return log.toLowerCase().includes(logSearchQuery.toLowerCase());
    }
    return true;
  });

  return (
    <div className="flex h-full bg-[var(--theme-surface-alt)] overflow-hidden font-sans select-none">
      
      {/* LEFT SIDEBAR PANEL (Solid panel, same as settings) */}
      <div className="w-[240px] flex flex-col h-full bg-[var(--theme-surface)] border-r border-[var(--theme-border)] relative shrink-0 z-10">
        {/* Sidebar Header */}
        <div className="p-4 h-15 border-b border-[var(--theme-border)] bg-[var(--theme-surface)]/60 flex items-center justify-between overflow-hidden">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[var(--theme-accent)]/10 flex items-center justify-center text-[var(--theme-accent)] border border-[var(--theme-accent)]/20 shadow-xs">
              <Brain size={14} className={isResearchActive ? 'animate-pulse text-[var(--theme-accent)]' : ''} />
            </div>
            <div>
              <h3 className="text-[10px] font-bold tracking-wider uppercase text-[var(--theme-primary)] font-mono">
                Deep Intellect
              </h3>
              <p className="text-[8px] text-[var(--theme-accent)] font-mono font-semibold tracking-tight uppercase">
                AGENT CORE LABS
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Sidebar Choices */}
        <div className="flex-1 py-4 px-2 space-y-1 overflow-y-auto custom-scrollbar">
          {[
            { id: 'overview', label: 'Control Deck', description: 'Tuning & Objectives', icon: <Sliders size={15} /> },
            { id: 'agents', label: 'Agents Monitor', description: 'Parallel Mesh Stream', icon: <Bot size={15} /> },
            { id: 'chain', label: 'Pipeline Graph', description: 'Tool Pipeline Steps', icon: <Workflow size={15} /> },
            { id: 'logs', label: 'Telemetry Stream', description: 'Real-time Standard Logs', icon: <Terminal size={15} /> },
          ].map(panel => {
            const isActive = activePanel === panel.id;
            return (
              <button
                key={panel.id}
                onClick={() => setActivePanel(panel.id as any)}
                className={`w-full group rounded-lg p-2.5 flex items-center gap-3 transition-all cursor-pointer relative ${
                  isActive 
                    ? 'bg-[var(--theme-accent)]/15 border border-[var(--theme-accent)]/30 text-[var(--theme-accent)] font-semibold' 
                    : 'text-[var(--theme-secondary)] hover:text-[var(--theme-primary)] border border-transparent hover:bg-[var(--theme-hover-bg)]'
                }`}
                title={panel.label}
              >
                {/* Visual Active Aura */}
                {isActive && (
                  <div className="absolute left-0 top-1/4 bottom-1/4 w-[3px] bg-[var(--theme-accent)] rounded-r-md" />
                )}

                <div className={`p-1.5 rounded-md transition-all ${
                  isActive ? 'bg-[var(--theme-accent)]/20 text-[var(--theme-accent)]' : 'text-[var(--theme-secondary)] group-hover:text-[var(--theme-primary)]'
                }`}>
                  {panel.icon}
                </div>

                <div className="text-left overflow-hidden">
                  <p className="text-[11px] font-bold leading-none tracking-tight">
                    {panel.label}
                  </p>
                  <p className="text-[8px] text-[var(--theme-secondary)]/50 font-mono mt-0.5 truncate uppercase">
                    {panel.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* SIDEBAR METRICS FOOTER */}
        <div className="p-3 border-t border-[var(--theme-border)] bg-[var(--theme-surface)]/30 space-y-2">
          <div className="flex items-center justify-between text-[8px] font-mono text-[var(--theme-secondary)]/60">
            <span className="flex items-center gap-1"><Shield size={8} /> INTEGRITY SECURE</span>
            <span className="text-[var(--theme-success)] font-bold">99.8%</span>
          </div>
          <div className="flex items-center justify-between text-[8px] font-mono text-[var(--theme-secondary)]/60">
            <span className="flex items-center gap-1"><Thermometer size={10} /> ENGINE TEMP</span>
            <span className={`font-bold transition-colors ${isResearchActive ? 'text-amber-400 animate-pulse' : 'text-[var(--theme-secondary)]/70'}`}>
              {isResearchActive ? '48 °C' : '31 °C'}
            </span>
          </div>
          <div className="flex items-center justify-between text-[8px] font-mono text-[var(--theme-secondary)]/60">
            <span className="flex items-center gap-1"><Radio size={8} /> LIVE BANDWIDTH</span>
            <span className="text-[var(--theme-success)] font-bold">4.2 MB/s</span>
          </div>
          <div className="h-1 bg-[var(--theme-border)] rounded-full overflow-hidden relative">
            <div 
              className={`h-full bg-gradient-to-r from-[var(--theme-accent)] to-[var(--theme-success)] ${isResearchActive ? 'animate-pulse' : ''}`} 
              style={{ width: isResearchActive ? '80%' : '30%' }}
            />
          </div>
        </div>
      </div>

      {/* RIGHT CONTENT WORKSPACE */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative overflow-hidden bg-[var(--theme-bg)]">
        
        {/* Workspace Panel Header */}
        <div className="flex items-center justify-between px-6 h-15 border-b border-[var(--theme-border)] bg-[var(--theme-surface)]/45 backdrop-blur-md shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-mono tracking-widest text-[var(--theme-accent)] font-bold">
                MESA-7 ORCHESTRATION
              </span>
              <div className="flex items-center gap-1 px-1.5 py-0.2 rounded bg-[var(--theme-accent)]/10 border border-[var(--theme-accent)]/20 text-[7px] text-[var(--theme-accent)] font-mono uppercase font-bold animate-pulse font-semibold">
                {isResearchActive ? 'RUNNING DEEP SCANNER' : 'STANDBY MODE'}
              </div>
            </div>
            <h1 className="text-base font-bold text-[var(--theme-primary)] leading-tight tracking-tight uppercase flex items-center gap-2">
              {activePanel === 'overview' && 'Control Deck / Operational Tuning'}
              {activePanel === 'agents' && 'Parallel Agents Monitor / Concurrency Mesh'}
              {activePanel === 'chain' && 'Pipeline Toolchain Logic Graph'}
              {activePanel === 'logs' && 'Telemetry Console stream'}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {/* Global Quick Action Scanner Launcher */}
            <div className="flex items-center gap-1 border border-[var(--theme-border)] bg-[var(--theme-surface)]/60 rounded-lg p-1">
              <button
                onClick={handleStartResearch}
                className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 text-[10px] font-bold uppercase cursor-pointer transition-all active:scale-95 border ${
                  isResearchActive
                    ? 'bg-amber-500/15 text-amber-500 border-amber-500/30 hover:bg-amber-500/25'
                    : 'bg-[var(--theme-accent)]/15 text-[var(--theme-accent)] border border-[var(--theme-accent)]/30 hover:bg-[var(--theme-accent)]/25'
                }`}
              >
                {isResearchActive ? <Square size={10} className="text-amber-500 animate-pulse" /> : <Play size={10} className="text-[var(--theme-accent)]" />}
                <span>{isResearchActive ? 'Stop Stream' : 'Deploy Scanner'}</span>
              </button>

              <button
                onClick={handleResetResearch}
                className="p-1.5 rounded-md border border-none bg-transparent hover:bg-[var(--theme-hover-bg)] text-[var(--theme-secondary)] hover:text-[var(--theme-primary)] flex items-center justify-center transition-all cursor-pointer"
                title="Reset telemetry metrics"
              >
                <RotateCcw size={12} />
              </button>
            </div>

            {onClose && (
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg border border-[var(--theme-border)] flex items-center justify-center text-[var(--theme-secondary)] hover:text-[var(--theme-primary)] hover:bg-[var(--theme-hover-bg)] transition-all cursor-pointer"
                title="Close Deep Research Panel"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Content Body Pane wrapper */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">

          <AnimatePresence mode="wait">
            
            {/* SCREEN 1: CONTROL DECK (Tuning & Sub-queries & Report Build) */}
            {activePanel === 'overview' && (
              <motion.div
                key="panel_overview"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  
                  {/* Left Column Tuning Parameters (Box 1) */}
                  <div className="lg:col-span-4 space-y-4">
                    <div className="border border-[var(--theme-border)] bg-[var(--theme-surface)]/40 p-4 rounded-xl space-y-4 shadow-sm relative overflow-hidden backdrop-blur-md">
                      <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-[var(--theme-accent)] to-transparent" />
                      <h2 className="text-xs font-bold font-mono tracking-wider text-[var(--theme-primary)] uppercase flex items-center gap-1.5 border-b border-[var(--theme-border)] pb-2.5">
                        <Settings size={12} className="text-[var(--theme-accent)]" /> Scanner Parameters
                      </h2>

                      {/* Multithread Scale Agents */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="text-[11px] font-bold text-[var(--theme-primary)]">Parallel Agents Scale</span>
                            <p className="text-[8.5px] text-[var(--theme-secondary)]/50 font-mono">CONCURRENT SUBTHREADS</p>
                          </div>
                          <span className="font-mono text-xs font-bold text-[var(--theme-accent)] px-2 py-0.5 rounded bg-[var(--theme-accent)]/10 border border-[var(--theme-accent)]/20">
                            {activeAgentCount}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            disabled={activeAgentCount <= 1 || isResearchActive}
                            onClick={() => {
                              setActiveAgentCount(prev => Math.max(1, prev - 1));
                              showToast('Agent scaled down.');
                            }}
                            className="w-7 h-7 rounded-lg bg-[var(--theme-surface)] border border-[var(--theme-border)] hover:bg-[var(--theme-hover-bg)] flex items-center justify-center text-[var(--theme-secondary)] hover:text-[var(--theme-primary)] disabled:opacity-40 transition-all cursor-pointer"
                          >
                            <Minus size={11} />
                          </button>
                          
                          {/* Rich slider line */}
                          <div className="flex-1 relative py-1">
                            <input
                              type="range"
                              min="1"
                              max="5"
                              value={activeAgentCount}
                              disabled={isResearchActive}
                              onChange={(e) => {
                                const val = parseInt(e.target.value);
                                setActiveAgentCount(val);
                                showToast(`Agent scale changed to ${val}.`);
                              }}
                              className="w-full h-1 bg-[var(--theme-surface-alt)] rounded-lg appearance-none cursor-pointer accent-[var(--theme-accent)] outline-none"
                            />
                            <div className="flex justify-between text-[7px] font-mono text-[var(--theme-secondary)]/40 px-0.5 mt-1">
                              <span>1 MIN</span>
                              <span>3 AVG</span>
                              <span>5 MAX</span>
                            </div>
                          </div>

                          <button
                            disabled={activeAgentCount >= 5 || isResearchActive}
                            onClick={() => {
                              setActiveAgentCount(prev => Math.min(5, prev + 1));
                              showToast('Agent scaled up.');
                            }}
                            className="w-7 h-7 rounded-lg bg-[var(--theme-surface)] border border-[var(--theme-border)] hover:bg-[var(--theme-hover-bg)] flex items-center justify-center text-[var(--theme-secondary)] hover:text-[var(--theme-primary)] disabled:opacity-40 transition-all cursor-pointer"
                          >
                            <Plus size={11} />
                          </button>
                        </div>
                      </div>

                      {/* Recursive Search Depth */}
                      <div className="space-y-2 pt-2">
                        <div>
                          <span className="text-[11px] font-bold text-[var(--theme-primary)]">Analytic Depth Index</span>
                          <p className="text-[8.5px] text-[var(--theme-secondary)]/50 font-mono">RECURSION SCAN LIMITS</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2 bg-[var(--theme-surface-alt)]/60 border border-[var(--theme-border)] p-1 rounded-lg">
                          {(['standard', 'extreme'] as const).map(preset => {
                            const isSel = depthPreset === preset;
                            return (
                              <button
                                key={preset}
                                disabled={isResearchActive}
                                onClick={() => {
                                  setDepthPreset(preset);
                                  showToast(`Scan Depth configured to ${preset}.`);
                                }}
                                className={`py-2 text-[9px] font-bold uppercase rounded-md transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                                  isSel
                                    ? 'bg-[var(--theme-accent)]/15 border border-[var(--theme-accent)]/30 text-[var(--theme-accent)]'
                                    : 'text-[var(--theme-secondary)] hover:text-[var(--theme-primary)] hover:bg-[var(--theme-hover-bg)] border border-transparent'
                                }`}
                              >
                                <span className="font-sans text-[9px]">{preset === 'standard' ? 'Normal' : 'Advanced'}</span>
                                <span className="text-[7px] font-mono text-[var(--theme-secondary)]/40 font-normal">
                                  {preset === 'standard' ? '2.5s loops' : '4.5s extreme'}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                    </div>

                    {/* Operational Details Card */}
                    <div className="border border-[var(--theme-border)] bg-[var(--theme-surface)]/20 p-4 rounded-xl space-y-3">
                      <h3 className="text-[10px] font-bold font-mono text-[var(--theme-secondary)] uppercase">SYSTEM DISPATCH SUMMARY</h3>
                      <div className="space-y-2 text-[10px] font-mono text-[var(--theme-secondary)]">
                        <div className="flex justify-between">
                          <span>Target Client:</span>
                          <span className="text-[var(--theme-primary)] font-semibold">DuckDuckGo + SerpAPI</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Distill Reader:</span>
                          <span className="text-[var(--theme-success)] font-semibold flex items-center gap-0.5">Jina Reader API</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Format Structure:</span>
                          <span className="text-[var(--theme-primary)]">Markdown Document + Citations</span>
                        </div>
                      </div>
                    </div>

                    {/* AI Pipeline & Agent Auto-Synthesizer */}
                    <div className="border border-[var(--theme-accent)]/20 bg-[var(--theme-accent)]/[0.02] p-4 rounded-xl space-y-3 relative overflow-hidden backdrop-blur-md">
                      <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-[var(--theme-accent)] to-[var(--theme-success)]" />
                      <h3 className="text-[10px] font-bold font-mono text-[var(--theme-accent)] uppercase flex items-center gap-1.5">
                        <Sparkles size={11} /> Research Template
                      </h3>
                      <p className="text-[9.5px] text-[var(--theme-secondary)]/75 font-sans leading-relaxed">
                        Apply a structured agent and pipeline template that matches the current research target.
                      </p>
                      <div className="bg-black/30 border border-[var(--theme-border)] rounded-lg p-3 text-[8.5px] font-mono text-[var(--theme-secondary)] space-y-1.5">
                        <div className="flex justify-between gap-3">
                          <span>Latest system activity</span>
                          <span className="text-[var(--theme-success)]">{isResearchActive ? 'ACTIVE' : 'READY'}</span>
                        </div>
                        <div className="text-[9px] leading-relaxed text-[var(--theme-primary)] break-words">
                          {latestSystemLog}
                        </div>
                      </div>
                      <button
                        disabled={isResearchActive}
                        onClick={handleAiSynthesis}
                        className="w-full py-2 bg-gradient-to-r from-[var(--theme-accent)]/20 to-[var(--theme-success)]/10 hover:from-[var(--theme-accent)]/30 hover:to-[var(--theme-success)]/20 border border-[var(--theme-accent)]/30 hover:border-[var(--theme-accent)]/50 text-[var(--theme-accent)] hover:text-[var(--theme-primary)] rounded-lg text-[9.5px] font-bold uppercase transition-all duration-300 active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Sparkles size={12} className="text-[var(--theme-success)]" />
                        <span>Apply Team & Pipeline Template</span>
                      </button>
                    </div>

                  </div>

                  {/* Right Column Custom Sub-queries Chips (Box 2) */}
                  <div className="lg:col-span-8 space-y-4">
                    <div className="border border-[var(--theme-border)] bg-[var(--theme-surface)]/40 p-4 rounded-xl space-y-4 shadow-sm relative overflow-hidden backdrop-blur-md h-full flex flex-col justify-between">
                      <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-[var(--theme-accent)] to-transparent" />
                      
                      <div className="space-y-3">
                        <div className="flex items-center justify-between border-b border-[var(--theme-border)] pb-2.5">
                          <h2 className="text-xs font-bold font-mono tracking-wider text-[var(--theme-primary)] uppercase flex items-center gap-1.5">
                            <Search size={12} className="text-[var(--theme-accent)]" /> Sub-Queries Domain Targets
                          </h2>
                          {!editingQueries ? (
                            <button
                              onClick={() => {
                                setEditingQueries(true);
                                setQueriesInput(customQueries);
                              }}
                              className="text-[9px] text-[var(--theme-accent)] font-bold uppercase hover:underline cursor-pointer flex items-center gap-1 bg-[var(--theme-accent)]/10 border border-[var(--theme-accent)]/20 px-2.5 py-1 rounded"
                            >
                              Edit Raw Text
                            </button>
                          ) : (
                            <div className="flex gap-2">
                              <button
                                onClick={handleSaveQueries}
                                className="text-[9px] text-[var(--theme-success)] font-bold uppercase hover:underline cursor-pointer bg-[var(--theme-success)]/10 border border-[var(--theme-success)]/20 px-2.5 py-1 rounded"
                              >
                                Save Changes
                              </button>
                              <button
                                onClick={() => setEditingQueries(false)}
                                className="text-[9px] text-[var(--theme-secondary)] font-bold uppercase hover:underline cursor-pointer bg-[var(--theme-hover-bg)] px-2.5 py-1 rounded"
                              >
                                Cancel
                              </button>
                            </div>
                          )}
                        </div>

                        {editingQueries ? (
                          <div className="space-y-2">
                            <p className="text-[9px] text-[var(--theme-secondary)]/70">
                              Write comma-separated research targets. Agents will automatically trigger parallel search threads for these terms recursively.
                            </p>
                            <textarea
                              value={queriesInput}
                              onChange={(e) => setQueriesInput(e.target.value)}
                              className="w-full text-xs font-mono bg-black/40 text-[var(--theme-primary)] outline-none border border-[var(--theme-border)] rounded-lg p-3 resize-none h-28 focus:border-[var(--theme-accent)]/60 focus:ring-1 focus:ring-[var(--theme-accent)]/30"
                              placeholder="Enter comma-separated search terms for agents"
                            />
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <p className="text-[9px] text-[var(--theme-secondary)]/70">
                              Click tags to delete them, or use the input box below to formulate specific query constraints.
                            </p>
                            <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto custom-scrollbar p-1">
                              {customQueries.split(',').map((q, i) => {
                                const queryVal = q.trim();
                                return queryVal ? (
                                  <motion.span 
                                    whileHover={{ scale: 1.02 }}
                                    key={i} 
                                    className="px-2.5 py-1.5 bg-black/35 border border-[var(--theme-border)] hover:border-rose-500/30 text-[var(--theme-primary)] font-mono text-[10px] rounded-lg flex items-center gap-1.5 group select-none cursor-pointer"
                                    onClick={() => handleRemoveQueryTag(i)}
                                    title="Click to delete query target"
                                  >
                                    <span className="text-[var(--theme-accent)] font-bold">#</span>
                                    <span>{queryVal}</span>
                                    <X size={9} className="text-[var(--theme-secondary)]/40 group-hover:text-rose-400 ml-1 transition-colors" />
                                  </motion.span>
                                ) : null;
                              })}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Add Instant Tag Form */}
                      {!editingQueries && (
                        <div className="pt-4 mt-4 border-t border-[var(--theme-border)]/40 flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="Formulate specific query tag (e.g. quantum fusion state)"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleAddQueryTag(e.currentTarget.value);
                                e.currentTarget.value = '';
                              }
                            }}
                            className="bg-black/30 border border-[var(--theme-border)] text-xs text-[var(--theme-primary)] outline-none rounded-lg p-2.5 flex-1 placeholder-[var(--theme-secondary)]/40 focus:border-[var(--theme-accent)]/50"
                          />
                          <button
                            onClick={(e) => {
                              const inputNode = e.currentTarget.previousSibling as HTMLInputElement;
                              if (inputNode) {
                                handleAddQueryTag(inputNode.value);
                                inputNode.value = '';
                              }
                            }}
                            className="p-2.5 rounded-lg bg-[var(--theme-accent)]/10 border border-[var(--theme-accent)]/20 text-[var(--theme-accent)] hover:bg-[var(--theme-accent)]/20 text-xs font-bold font-sans cursor-pointer flex items-center gap-1"
                          >
                            <Plus size={14} /> Add Target
                          </button>
                        </div>
                      )}

                    </div>
                  </div>

                </div>

                {/* Bottom Unified Citations Box */}
                <div className="border border-[var(--theme-border)] bg-[var(--theme-surface)]/25 p-5 rounded-xl space-y-4">
                  <div className="flex items-center justify-between border-b border-[var(--theme-border)] pb-3">
                    <h4 className="text-xs font-bold text-[var(--theme-primary)] uppercase flex items-center gap-1.5 font-mono">
                      <BookOpen size={13} className="text-[var(--theme-accent)]" /> 
                      Verified Draft Report Citations
                    </h4>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(`Verified Draft Citations Summary Generated on fusion milestone 2026. Ready to review.`);
                          showToast('Summary report draft copied.');
                        }}
                        className="text-[9px] text-[var(--theme-secondary)] font-bold uppercase transition-all flex items-center gap-1 bg-[var(--theme-surface)] hover:bg-[var(--theme-hover-bg)] border border-[var(--theme-border)] px-2.5 py-1 rounded"
                      >
                        <Copy size={9} /> Copy Draft
                      </button>
                    </div>
                  </div>
                  
                  <div className="text-[11px] font-mono leading-relaxed text-[var(--theme-secondary)] bg-black/40 p-4 rounded-lg border border-[var(--theme-border)]/50 min-h-24">
                    {isResearchActive ? (
                      <div className="space-y-3 py-1">
                        <div className="flex items-center gap-2 text-[var(--theme-accent)] font-bold text-[10px]">
                          <Activity size={10} />
                          <span>{activeNode ? `ACTIVE STAGE: ${activeNode.title.toUpperCase()}` : 'RESEARCH RUN ACTIVE'}</span>
                        </div>
                        <p className="text-[9px] text-[var(--theme-secondary)]/70">
                          {activeNode?.details || latestAgentLog}
                        </p>
                      </div>
                    ) : researchLogs.length > 3 ? (
                      <div className="space-y-2">
                        <span className="text-[var(--theme-success)] font-bold text-[10px] flex items-center gap-1 mb-1">
                          <CheckCircle size={10} /> CORE FEED READY FOR COMPILATION
                        </span>
                        <p className="text-[11px] leading-relaxed">
                          The latest research cycle completed. Review the report in the main workspace and use the telemetry panel for source and stage history.
                        </p>
                      </div>
                    ) : (
                      <span className="text-[var(--theme-secondary)]/40 italic flex items-center justify-center p-3 h-full">
                        Standing by for deep scanner launch to formulate verified findings.
                      </span>
                    )}
                  </div>
                </div>

              </motion.div>
            )}

            {/* SCREEN 2: PARALLEL AGENTS MONITOR (Live communication & detailed cards) */}
            {activePanel === 'agents' && (
              <motion.div
                key="panel_agents"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-5"
              >
                {/* Mesh Grid Communication Loop layout */}
                <div className="relative h-28 bg-black/40 border border-[var(--theme-border)] rounded-xl overflow-hidden flex flex-col justify-center px-6 relative">
                  <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f2937_1px,transparent_1px),linear-gradient(to_bottom,#1f2937_1px,transparent_1px)] bg-[size:16px_16px] opacity-20" />
                  
                  <div className="relative z-10 flex items-center justify-between w-full max-w-2xl mx-auto">
                    {/* Block A: Core */}
                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 rounded-xl bg-[var(--theme-accent)]/10 border border-[var(--theme-accent)]/20 flex items-center justify-center text-[var(--theme-accent)] shadow-[0_0_15px_rgba(217,119,86,0.15)] relative">
                        <Cpu size={18} />
                        {isResearchActive && (
                          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[var(--theme-accent)] border-2 border-black" />
                        )}
                      </div>
                      <span className="text-[8.5px] font-bold font-mono tracking-wider mt-1.5 text-[var(--theme-accent)] hover:brightness-110">CORE ORCHESTRATOR</span>
                    </div>

                    {/* Central Flow Tubes */}
                    <div className="flex-1 flex items-center justify-center gap-3 px-6 text-zinc-400 relative">
                      <div className="h-[1.5px] flex-1 bg-gradient-to-r from-[var(--theme-accent)]/60 to-[var(--theme-success)]/60 flex items-center justify-around relative">
                        {isResearchActive && activeNodes.length > 0 && (
                          <>
                            <div className="w-1.5 h-1.5 rounded-full bg-[var(--theme-accent)] absolute left-[15%]" />
                            <div className="w-1.5 h-1.5 rounded-full bg-[var(--theme-success)] absolute right-[25%]" />
                          </>
                        )}
                      </div>
                      <div className="flex flex-col items-center select-none shrink-0 border border-[var(--theme-accent)]/20 px-3 py-1 rounded bg-black/60 font-mono text-[7px] text-[var(--theme-accent)] font-bold gap-0.5 shadow-md">
                        <Radio size={9} />
                        <span>{isResearchActive ? `${activeNodes.length} ACTIVE STAGES` : 'READY TO PROBE'}</span>
                      </div>
                      <div className="h-[1.5px] flex-1 bg-gradient-to-r from-[var(--theme-success)]/60 to-[var(--theme-accent)]/60 flex items-center justify-around relative">
                        {isResearchActive && activeNodes.length > 0 && (
                          <>
                            <div className="w-1.5 h-1.5 rounded-full bg-[var(--theme-success)] absolute left-[35%]" />
                            <div className="w-1.5 h-1.5 rounded-full bg-[var(--theme-accent)] absolute right-[15%]" />
                          </>
                        )}
                      </div>
                    </div>

                    {/* Block B: Web Mesh */}
                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 rounded-xl bg-[var(--theme-success)]/10 border border-[var(--theme-success)]/20 flex items-center justify-center text-[var(--theme-success)] shadow-[0_0_15px_rgba(73,160,120,0.15)] relative">
                        <Globe size={18} />
                        {isResearchActive && (
                          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[var(--theme-success)] border-2 border-black" />
                        )}
                      </div>
                      <span className="text-[8.5px] font-bold font-mono tracking-wider mt-1.5 text-[var(--theme-success)] hover:brightness-110">WEB METASYNTHESIS</span>
                    </div>

                  </div>

                  <div className="absolute bottom-2 right-3 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--theme-success)]" />
                    <span className="text-[7.5px] font-mono text-[var(--theme-success)] uppercase tracking-widest">{isResearchActive ? `${liveAgentCount} AGENTS ENGAGED` : 'GRID ALIGNED'}</span>
                  </div>
                </div>

                {/* Subtitle text */}
                <div className="flex justify-between items-center px-1">
                  <p className="text-[11px] text-[var(--theme-secondary)] italic leading-tight">
                    Showing active agents configured for research. Current live workload: {liveAgentCount} agents, {activeNodes.length} active stages, {totalResultsFound} results tracked.
                  </p>
                  <button
                    onClick={() => setShowSpawnForm(prev => !prev)}
                    className="text-[9.5px] text-[var(--theme-accent)] font-bold uppercase hover:underline cursor-pointer bg-[var(--theme-accent)]/10 border border-[var(--theme-accent)]/20 px-2.5 py-1 rounded-lg flex items-center gap-1 active:scale-95 transition-all"
                  >
                    <Plus size={11} /> {showSpawnForm ? 'Cancel Spawning' : 'Spawn Custom Agent'}
                  </button>
                </div>

                {showSpawnForm && (
                  <motion.form
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="border border-[var(--theme-accent)]/40 bg-[var(--theme-accent)]/[0.02] p-5 rounded-xl space-y-4 shadow-md relative overflow-hidden backdrop-blur-md"
                    onSubmit={handleSpawnAgent}
                  >
                    <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-[var(--theme-accent)] to-transparent" />
                    <div className="flex items-center justify-between border-b border-[var(--theme-border)] pb-2 flex-wrap">
                      <h3 className="text-xs font-bold font-mono text-[var(--theme-accent)] uppercase flex items-center gap-1.5">
                        <Bot size={13} /> Spawn Custom Expert Agent
                      </h3>
                      <button 
                        type="button" 
                        onClick={() => setShowSpawnForm(false)} 
                        className="text-[var(--theme-secondary)] hover:text-rose-400 cursor-pointer"
                      >
                        <X size={12} />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[9.5px] font-mono uppercase text-[var(--theme-secondary)]">Agent Name</label>
                        <input
                          type="text"
                          required
                          value={newAgentName}
                          onChange={(e) => setNewAgentName(e.target.value)}
                          placeholder="e.g. Agent Sigma"
                          className="w-full text-xs font-sans bg-black/40 text-[var(--theme-primary)] outline-none border border-[var(--theme-border)] rounded-lg p-2.5 focus:border-[var(--theme-accent)]/60"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9.5px] font-mono uppercase text-[var(--theme-secondary)]">Agent Role / Specialty</label>
                        <input
                          type="text"
                          required
                          value={newAgentRole}
                          onChange={(e) => setNewAgentRole(e.target.value)}
                          placeholder="e.g. Deep Nuclear Evaluator"
                          className="w-full text-xs font-sans bg-black/40 text-[var(--theme-primary)] outline-none border border-[var(--theme-border)] rounded-lg p-2.5 focus:border-[var(--theme-accent)]/60"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[9.5px] font-mono uppercase text-[var(--theme-secondary)]">Starting Task Directive</label>
                      <input
                        type="text"
                        value={newAgentTask}
                        onChange={(e) => setNewAgentTask(e.target.value)}
                        placeholder="e.g. Scanning cross-magnetic field profiles..."
                        className="w-full text-xs font-sans bg-black/40 text-[var(--theme-primary)] outline-none border border-[var(--theme-border)] rounded-lg p-2.5 focus:border-[var(--theme-accent)]/60 text-left select-text"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowSpawnForm(false)}
                        className="px-3 py-2 border border-[var(--theme-border)] bg-[var(--theme-surface)] hover:bg-[var(--theme-hover-bg)] text-xs text-[var(--theme-secondary)] font-bold rounded-lg cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-[var(--theme-accent)]/25 border border-[var(--theme-accent)]/40 hover:bg-[var(--theme-accent)]/35 text-[var(--theme-accent)] hover:text-white text-xs font-bold rounded-lg cursor-pointer"
                      >
                        Spawn Agent
                      </button>
                    </div>
                  </motion.form>
                )}

                {/* Grid Lists of Agents */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {agents.slice(0, activeAgentCount).map((agent) => {
                    const isModelActive = isResearchActive && agent.status !== 'idle';
                    return (
                      <div
                        key={agent.id}
                        onClick={() => setSelectedAgentId(agent.id === selectedAgentId ? null : agent.id)}
                        className={`border p-4 rounded-xl relative overflow-hidden transition-all duration-300 group cursor-pointer ${
                          isModelActive
                            ? 'border-[var(--theme-accent)]/40 bg-[var(--theme-accent)]/[0.02] shadow-[0_0_12px_rgba(217,119,86,0.05)] scale-[1.01]'
                            : 'border-[var(--theme-border)] bg-[var(--theme-surface)]/40 hover:border-[var(--theme-border)]/80 hover:bg-[var(--theme-surface)]/60'
                        }`}
                      >
                        {/* Glow corner element */}
                        {isModelActive && (
                          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-[var(--theme-accent)]/10 to-transparent pointer-events-none" />
                        )}

                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${
                              isModelActive ? 'bg-[var(--theme-accent)]' : 'bg-zinc-500'
                            }`} />
                            <div>
                              <span className="text-xs font-bold text-[var(--theme-primary)]">{agent.name}</span>
                              <p className="text-[8px] text-[var(--theme-secondary)]/50 font-mono tracking-tight">{agent.role.toUpperCase()}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-1.5">
                            <span className={`text-[8.5px] font-mono px-2 py-0.5 rounded border ${
                              isModelActive
                                ? 'bg-[var(--theme-accent)]/10 text-[var(--theme-accent)] border border-[var(--theme-accent)]/20'
                                : 'bg-[var(--theme-surface-alt)] border-[var(--theme-border)] text-[var(--theme-secondary)]'
                            } uppercase`}>
                              {isResearchActive ? agent.status : 'idle'}
                            </span>
                            
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteAgent(agent.id, agent.name);
                              }}
                              className="p-1 hover:bg-rose-500/15 border border-transparent hover:border-rose-500/30 text-[var(--theme-secondary)] hover:text-rose-400 rounded transition-all cursor-pointer flex items-center justify-center h-5 w-5"
                              title="Delete agent from mesh"
                            >
                              <X size={10} />
                            </button>
                          </div>
                        </div>

                        {/* Task box */}
                        <div className="text-[10px] font-mono leading-relaxed text-[var(--theme-secondary)] bg-black/40 px-3 py-2 rounded-lg border border-[var(--theme-border)]/30 min-h-12 flex flex-col justify-center">
                          <div>
                            <span className="text-[var(--theme-accent)] font-bold select-none">[TASK]</span> {isResearchActive ? agent.currentTask : 'Standing by for execution...'}
                          </div>
                        </div>

                        {/* Progress and validated count split */}
                        <div className="grid grid-cols-2 gap-3 pt-3 mt-3 border-t border-[var(--theme-border)]/20 items-center">
                          <div className="space-y-1">
                            <div className="flex justify-between text-[8px] font-mono text-[var(--theme-secondary)]/80">
                              <span>PROGRESS</span>
                              <span>{isResearchActive ? agent.progress : 0}%</span>
                            </div>
                            <div className="w-full h-1 bg-[var(--theme-surface-alt)] rounded-full overflow-hidden relative">
                              <div 
                                className="h-full bg-gradient-to-r from-[var(--theme-accent)] to-[var(--theme-success)] transition-all duration-500 rounded-full" 
                                style={{ width: `${isResearchActive ? agent.progress : 0}%` }}
                              />
                            </div>
                          </div>

                          <div className="flex items-center justify-end gap-1 text-[8.5px] font-mono text-[var(--theme-secondary)]/85 text-right font-semibold">
                            <Globe size={11} className="text-[var(--theme-success)]" />
                            <span>Validated Feeds: </span>
                            <span className="text-[var(--theme-primary)] font-bold">
                              {isResearchActive ? agent.resultsFound : 0}
                            </span>
                          </div>
                        </div>

                        {/* Expandable Activity View */}
                        <AnimatePresence>
                          {selectedAgentId === agent.id && (
                            <motion.div 
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="mt-3 pt-3 border-t border-[var(--theme-border)]/30 space-y-2 overflow-hidden"
                            >
                              <div className="flex items-center justify-between text-[8px] font-mono text-[var(--theme-accent)]/80">
                                <span>Current Agent Activity</span>
                                <span className="text-[7px] text-[var(--theme-secondary)]/40">Live state</span>
                              </div>
                              <pre className="bg-black/70 p-2.5 rounded-lg border border-[var(--theme-border)] text-[8.5px] font-mono text-[var(--theme-success)]/90 leading-normal overflow-x-auto select-all">
{`{
  "agentId": "${agent.id}",
  "status": "${isResearchActive ? agent.status : 'idle'}",
  "currentTask": "${(isResearchActive ? agent.currentTask : 'Standing by for execution...').replace(/"/g, '\\"')}",
  "progress": ${isResearchActive ? agent.progress : 0},
  "resultsFound": ${isResearchActive ? agent.resultsFound : 0}
}`}
                              </pre>
                            </motion.div>
                          )}
                        </AnimatePresence>

                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* SCREEN 3: PIPELINE LOGIC GRAPH (Toolchain dependency graph & detail drawers) */}
            {activePanel === 'chain' && (
              <motion.div
                key="panel_chain"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                
                <div className="flex justify-between items-center px-1">
                  <p className="text-[11px] text-[var(--theme-secondary)] italic leading-tight">
                    Click on the active pipeline nodes to inspect current stage diagnostics and execution details.
                  </p>
                  <button
                    onClick={() => setShowAddStageForm(prev => !prev)}
                    className="text-[9.5px] text-[var(--theme-accent)] font-bold uppercase hover:underline cursor-pointer bg-[var(--theme-accent)]/10 border border-[var(--theme-accent)]/20 px-2.5 py-1 rounded-lg flex items-center gap-1 active:scale-95 transition-all"
                  >
                    <Plus size={11} /> {showAddStageForm ? 'Cancel Stage' : 'Add Pipeline Stage'}
                  </button>
                </div>

                {showAddStageForm && (
                  <motion.form
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="border border-[var(--theme-accent)]/40 bg-[var(--theme-accent)]/[0.02] p-5 rounded-xl space-y-4 shadow-md relative overflow-hidden backdrop-blur-md"
                    onSubmit={handleCreateStage}
                  >
                    <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-[var(--theme-accent)] to-transparent" />
                    <div className="flex items-center justify-between border-b border-[var(--theme-border)] pb-2">
                       <h3 className="text-xs font-bold font-mono text-[var(--theme-accent)] uppercase flex items-center gap-1.5">
                        <Workflow size={13} /> Add Pipeline Execution Stage
                      </h3>
                      <button 
                        type="button" 
                        onClick={() => setShowAddStageForm(false)} 
                        className="text-[var(--theme-secondary)] hover:text-rose-400 cursor-pointer"
                      >
                        <X size={12} />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1.5 md:col-span-2">
                        <label className="text-[9.5px] font-mono uppercase text-[var(--theme-secondary)]">Stage Title</label>
                        <input
                          type="text"
                          required
                          value={newStageTitle}
                          onChange={(e) => setNewStageTitle(e.target.value)}
                          placeholder="e.g. Quantum Particle Ingest"
                          className="w-full text-xs font-sans bg-black/40 text-[var(--theme-primary)] outline-none border border-[var(--theme-border)] rounded-lg p-2.5 focus:border-[var(--theme-accent)]/60"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9.5px] font-mono uppercase text-[var(--theme-secondary)]">Execution Node Type</label>
                        <select
                          value={newStageType}
                          onChange={(e: any) => setNewStageType(e.target.value)}
                          className="w-full text-xs font-sans bg-black/40 text-[var(--theme-primary)] outline-none border border-[var(--theme-border)] rounded-lg p-2.5 focus:border-[var(--theme-accent)]/60"
                        >
                          <option value="query">Query Stage (query)</option>
                          <option value="search">Search Stage (search)</option>
                          <option value="scrape">Extraction Stage (scrape)</option>
                          <option value="correlate">Validation Stage (correlate)</option>
                          <option value="synthesize">Synthesis Stage (synthesize)</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[9.5px] font-mono uppercase text-[var(--theme-secondary)]">Functional Operations Description</label>
                      <input
                        type="text"
                        required
                        value={newStageDesc}
                        onChange={(e) => setNewStageDesc(e.target.value)}
                        placeholder="e.g. Normalizes and validates incoming multidimensional parameters..."
                        className="w-full text-xs font-sans bg-black/40 text-[var(--theme-primary)] outline-none border border-[var(--theme-border)] rounded-lg p-2.5 focus:border-[var(--theme-accent)]/60 text-left cursor-text"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                       <button
                        type="button"
                        onClick={() => setShowAddStageForm(false)}
                        className="px-3 py-2 border border-[var(--theme-border)] bg-[var(--theme-surface)] hover:bg-[var(--theme-hover-bg)] text-xs text-[var(--theme-secondary)] font-bold rounded-lg cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-[var(--theme-accent)]/25 border border-[var(--theme-accent)]/40 hover:bg-[var(--theme-accent)]/35 text-[var(--theme-accent)] hover:text-white text-xs font-bold rounded-lg cursor-pointer"
                      >
                        Add Stage
                      </button>
                    </div>
                  </motion.form>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                   
                  {/* Left Column Interactive Timeline (Box 1) */}
                  <div className="lg:col-span-7">
                    <div className="relative pl-6 border-l border-dashed border-[var(--theme-accent)]/30 ml-4 py-1 space-y-4">
                      {toolChain.map((node, i) => {
                        const nodeActive = isResearchActive && node.status === 'active';
                        const nodeComplete = isResearchActive && node.status === 'complete';
                        const isSelected = selectedNodeId === node.id;

                        return (
                          <div key={node.id} className="relative">
                            
                            {/* Line connecting nodes - CHANGED AT -left-[33px] to fix symmetry of note/node on the straight border line */}
                            <div className={`absolute -left-[33px] top-1 w-4.5 h-4.5 rounded-full border-2 transition-all flex items-center justify-center cursor-pointer ${
                              nodeComplete 
                                ? 'bg-[var(--theme-success)] border-[var(--theme-success)] shadow-[0_0_8px_rgba(73,160,120,0.3)]' 
                                : nodeActive 
                                  ? 'bg-[var(--theme-accent)] border-[var(--theme-accent)]' 
                                  : isSelected 
                                    ? 'bg-[var(--theme-surface-alt)] border-[var(--theme-accent)]/70'
                                    : 'bg-[var(--theme-surface-alt)] border-[var(--theme-border)]'
                            }`}
                            onClick={() => setSelectedNodeId(node.id)}
                            >
                              {nodeActive && (
                                <span className="absolute w-6.5 h-6.5 rounded-full border border-[var(--theme-accent)] opacity-60" />
                              )}
                            </div>

                            <div 
                              onClick={() => setSelectedNodeId(node.id)}
                              className={`border rounded-xl p-4 bg-[var(--theme-surface)]/40 transition-all cursor-pointer relative ${
                                isSelected
                                  ? 'border-[var(--theme-accent)] ring-2 ring-[var(--theme-accent)]/15 shadow-md bg-[var(--theme-accent)]/[0.01]'
                                  : 'border-[var(--theme-border)] hover:border-[var(--theme-border)]/80 hover:bg-[var(--theme-surface)]/60'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-xs font-bold text-[var(--theme-primary)] flex items-center gap-1.5">
                                  <span className="text-[9px] font-mono font-bold text-[var(--theme-accent)]">0{i+1}.</span>
                                  {node.title}
                                </span>
                                
                                <div className="flex items-center gap-1.5">
                                  <span className={`text-[7.5px] font-mono px-2 py-0.5 rounded border font-semibold ${
                                    nodeComplete 
                                      ? 'bg-[var(--theme-success)]/10 text-[var(--theme-success)] border border-[var(--theme-success)]/20' 
                                      : nodeActive 
                                        ? 'bg-[var(--theme-accent)]/10 text-[var(--theme-accent)] border border-[var(--theme-accent)]/20' 
                                        : 'bg-[var(--theme-surface-alt)] text-[var(--theme-secondary)] border-transparent'
                                  }`}>
                                    {nodeActive ? 'PROCESSING' : nodeComplete ? 'STABLE' : 'STANDBY'}
                                  </span>
                                  
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteStage(node.id, node.title);
                                    }}
                                    className="p-1 hover:bg-rose-500/15 border border-transparent hover:border-rose-500/30 text-[var(--theme-secondary)] hover:text-rose-400 rounded transition-colors cursor-pointer flex items-center justify-center h-5 w-5"
                                    title="Delete pipeline stage"
                                  >
                                    <X size={10} />
                                  </button>
                                </div>
                              </div>

                              <p className="text-[11px] text-[var(--theme-secondary)]/90 leading-relaxed font-sans">
                                {node.description}
                              </p>

                              {nodeActive && node.details && (
                                <div className="mt-2 text-[8px] font-mono text-[var(--theme-accent)] bg-black/40 p-2 rounded border border-[var(--theme-accent)]/20">
                                  Live Trace: {node.details}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Right Column Node Diagnostics (Box 2) */}
                  <div className="lg:col-span-5 border border-[var(--theme-border)] bg-[var(--theme-surface)]/50 p-4 rounded-xl space-y-4 backdrop-blur-md relative overflow-hidden sticky top-4">
                    <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-[var(--theme-accent)] to-transparent" />
                    
                    <h3 className="text-xs font-bold font-mono tracking-wider text-[var(--theme-primary)] uppercase flex items-center gap-1.5 border-b border-[var(--theme-border)] pb-2.5">
                      <Cpu size={12} className="text-[var(--theme-accent)]" /> Pipeline Node Diagnostics
                    </h3>

                    {selectedNodeId ? (() => {
                      const selectedNode = toolChain.find(n => n.id === selectedNodeId);
                      if (!selectedNode) return <p className="text-[10px] text-[var(--theme-secondary)]/50 italic">Select a pipeline stage.</p>;
                      
                      return (
                        <div className="space-y-4">
                          <div>
                            <span className="text-[7.5px] font-mono text-[var(--theme-accent)] font-bold uppercase tracking-widest bg-[var(--theme-accent)]/10 px-2 py-0.5 border border-[var(--theme-accent)]/20 rounded">
                              NODE INTEGRITY IDENTIFIER: {selectedNode.type.toUpperCase()}-0{selectedNode.id}
                            </span>
                            <h4 className="text-xs font-bold text-[var(--theme-primary)] mt-2">{selectedNode.title}</h4>
                            <p className="text-[10.5px] text-[var(--theme-secondary)] font-normal leading-relaxed mt-1">
                              {selectedNode.description}
                            </p>
                          </div>

                          <div className="space-y-2 pt-2 border-t border-[var(--theme-border)]/40 text-[10px] font-mono text-[var(--theme-secondary)]">
                            <div className="flex justify-between">
                              <span>Operational Status:</span>
                              <span className={isResearchActive && selectedNode.status === 'active' ? 'text-[var(--theme-accent)] font-bold' : selectedNode.status === 'complete' && isResearchActive ? 'text-[var(--theme-success)] font-bold' : 'text-[var(--theme-secondary)]'}>
                                {isResearchActive ? selectedNode.status.toUpperCase() : 'STANDBY'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Execution Dependency:</span>
                              <span>{selectedNodeId === '1' ? 'None (Root Node)' : `Node 0${parseInt(selectedNodeId) - 1}`}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Output Format Type:</span>
                              <span className="text-[var(--theme-success)]">{selectedNode.type === 'query' ? 'STRING[]' : selectedNode.type === 'search' ? 'URL_OBJECT[]' : selectedNode.type === 'scrape' ? 'MARKDOWN_TEXT' : 'CITATIONS_MD'}</span>
                            </div>
                          </div>

                          <div className="space-y-2 pt-2 border-t border-[var(--theme-border)]/40">
                            <span className="text-[8.5px] font-mono text-[var(--theme-secondary)]/60">Current Stage Snapshot</span>
                            <pre className="bg-black/50 p-2.5 rounded-lg border border-[var(--theme-border)] text-[9px] font-mono text-[var(--theme-secondary)] leading-normal overflow-x-auto select-all">
{`{
  "stageId": "${selectedNode.id}",
  "type": "${selectedNode.type}",
  "status": "${isResearchActive ? selectedNode.status : 'idle'}",
  "details": "${(selectedNode.details || selectedNode.description).replace(/"/g, '\\"')}",
  "activeQueryTarget": "${customQueries.replace(/"/g, '\\"')}",
  "completedStages": ${completedNodes.length},
  "activeStages": ${activeNodes.length}
}`}
                            </pre>
                          </div>
                        </div>
                      );
                    })() : (
                      <p className="text-[11px] text-[var(--theme-secondary)]/55 italic text-center py-4">
                        Click on any timeline step node on the left to display its full technical pipeline specifications.
                      </p>
                    )}
                  </div>

                </div>

              </motion.div>
            )}

            {/* SCREEN 4: TELEMETRY CONSOLE STREAM (Logs console & raw copy filter tabs) */}
            {activePanel === 'logs' && (
              <motion.div
                key="panel_logs"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col h-full space-y-4"
              >
                
                {/* Visual telemetry filter controls */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                           {/* Category Selection Tab */}
                  <div className="md:col-span-5 flex bg-[var(--theme-surface)]/60 p-1 border border-[var(--theme-border)] rounded-lg">
                    {[
                      { id: 'all', label: 'All Traces' },
                      { id: 'system', label: 'System' },
                      { id: 'agents', label: 'Agent Loops' },
                    ].map(btn => (
                      <button
                        key={btn.id}
                        onClick={() => setLogFilter(btn.id as any)}
                        className={`flex-1 py-1.5 text-[9px] font-bold uppercase rounded-md transition-all cursor-pointer ${
                          logFilter === btn.id
                            ? 'bg-[var(--theme-accent)]/15 text-[var(--theme-accent)] border border-[var(--theme-accent)]/20'
                            : 'text-[var(--theme-secondary)] hover:text-[var(--theme-primary)] hover:bg-[var(--theme-hover-bg)]'
                        }`}
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>

                  {/* Live Search bar */}
                  <div className="md:col-span-5 relative">
                    <Search className="absolute left-3 top-2.5 text-[var(--theme-secondary)]/50" size={12} />
                    <input
                      type="text"
                      placeholder="Search console traces... (e.g. jina, complete)"
                      value={logSearchQuery}
                      onChange={(e) => setLogSearchQuery(e.target.value)}
                      className="w-full bg-[var(--theme-surface)]/40 border border-[var(--theme-border)] rounded-lg py-2 pl-8 pr-3 text-[10px] font-mono outline-none text-[var(--theme-primary)] placeholder-[var(--theme-secondary)]/40 focus:border-[var(--theme-accent)]/50"
                    />
                    {logSearchQuery && (
                      <button 
                        onClick={() => setLogSearchQuery('')}
                        className="absolute right-2.5 top-2 hover:text-[var(--theme-accent)] text-[9px] font-mono text-[var(--theme-secondary)] cursor-pointer"
                      >
                        CLEAR
                      </button>
                    )}
                  </div>

                  {/* Copy button */}
                  <div className="md:col-span-2 justify-self-end">
                    <button
                      onClick={handleCopyLogs}
                      className="p-2 w-full hover:bg-[var(--theme-hover-bg)] rounded-lg border border-[var(--theme-border)] text-[9px] font-bold uppercase transition-all flex items-center justify-center gap-1.5 text-[var(--theme-secondary)] hover:text-[var(--theme-primary)] cursor-pointer bg-[var(--theme-surface)]/40"
                    >
                      <Copy size={11} /> Copy Stream ({filteredLogs.length})
                    </button>
                  </div>

                </div>

                {/* Main Console stdout display */}
                <div className="flex-1 bg-black/90 border border-zinc-805/40 rounded-xl p-4 font-mono text-xs leading-normal text-zinc-300 overflow-y-auto custom-scrollbar select-text shadow-inner min-h-[350px] max-h-[500px]">
                  <div className="space-y-1">
                    {filteredLogs.length > 0 ? (
                      filteredLogs.map((log, idx) => {
                        let color = 'text-zinc-300';
                        if (log.includes('[SYSTEM]')) color = 'text-[var(--theme-success)]';
                        else if (log.includes('[Agent Alpha]')) color = 'text-[var(--theme-success)]/90';
                        else if (log.includes('[Agent Beta]')) color = 'text-[var(--theme-success)]/80';
                        else if (log.includes('[Agent Gamma]')) color = 'text-amber-500/90';
                        else if (log.includes('[Agent Delta]')) color = 'text-amber-400';
                        else if (log.includes('[Orchestrator]')) color = 'text-[var(--theme-accent)]';

                        return (
                          <div key={idx} className={`${color} border-l border-zinc-800/40 pl-2 text-[10px] break-all`}>
                            <span className="text-zinc-640 select-none mr-2">{(idx+1).toString().padStart(3, '0')}</span>
                            {log}
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-[10px] text-zinc-500 py-6 text-center select-none italic">
                        No console traces matching active filter metrics.
                      </div>
                    )}
                    <div ref={logsEndRef} />
                  </div>
                </div>

                {/* Trace speed metrics bar */}
                <div className="flex items-center justify-between text-[8px] font-mono text-[var(--theme-secondary)]/50 pt-1">
                  <span>CORE ACTIVE THREAD REGISTER LISTINGS</span>
                  <span>CPU METASPIN LOOP STABILITY: SECURE (100% STEADY)</span>
                </div>

              </motion.div>
            )}

          </AnimatePresence>

        </div>

      </div>

    </div>
  );
}
