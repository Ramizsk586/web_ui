import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Bot,
  Code,
  Settings,
  Activity,
  Trash2,
  Wrench,
  Terminal,
  HardDrive,
  SquareTerminal,
  Sliders
} from 'lucide-react';
import { DevPerfCanvas } from './ui/DevPerfCanvas';

interface DevToolsPanelProps {
  isDevToolsOpen: boolean;
  setIsDevToolsOpen: (open: boolean) => void;
  activeDevTab: 'status' | 'console' | 'perf' | 'storage' | 'flags';
  setActiveDevTab: (tab: 'status' | 'console' | 'perf' | 'storage' | 'flags') => void;
  simLatency: number;
  setSimLatency: (latency: number) => void;
  devLogs: any[];
  setDevLogs: React.Dispatch<React.SetStateAction<any[]>>;
  chats: any[];
  selectedProvider: string;
  serverUrl: string;
  isCoderMode: boolean;
  isCoderLeftPanelOpen: boolean;
  isCoderRightPanelOpen: boolean;
  isMcpConnected: boolean;
  workspaceRefreshKey: number;
  handleExecMockCommand: (input: string) => void;
  addDevLog: (message: string, type?: 'info' | 'warn' | 'error' | 'success') => void;
  showToast: (msg: string) => void;
  retroFilter: boolean;
  setRetroFilter: (val: boolean) => void;
  verboseDebug: boolean;
  setVerboseDebug: (val: boolean) => void;
  setIsCompactSidebar: (val: boolean) => void;
  isCompactSidebar: boolean;
  setUseBubbles: (val: boolean) => void;
  useBubbles: boolean;
  setAutoHideTopBar: (val: boolean) => void;
  autoHideTopBar: boolean;
}

export function DevToolsPanel({
  isDevToolsOpen,
  setIsDevToolsOpen,
  activeDevTab,
  setActiveDevTab,
  simLatency,
  setSimLatency,
  devLogs,
  setDevLogs,
  chats,
  selectedProvider,
  serverUrl,
  isCoderMode,
  isCoderLeftPanelOpen,
  isCoderRightPanelOpen,
  isMcpConnected,
  workspaceRefreshKey,
  handleExecMockCommand,
  addDevLog,
  showToast,
  retroFilter,
  setRetroFilter,
  verboseDebug,
  setVerboseDebug,
  setIsCompactSidebar,
  isCompactSidebar,
  setUseBubbles,
  useBubbles,
  setAutoHideTopBar,
  autoHideTopBar
}: DevToolsPanelProps) {
  return (
    <AnimatePresence>
      {isDevToolsOpen && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsDevToolsOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className="relative w-full max-w-4xl h-[600px] bg-zinc-950 text-white rounded-3xl border border-zinc-900 shadow-2xl overflow-hidden flex font-mono"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Left sidebar nav panel */}
            <div className="w-60 border-r border-zinc-900 bg-zinc-950 p-5 flex flex-col justify-between select-none">
              <div>
                <div className="flex items-center gap-2 px-1 mb-6">
                  <Terminal size={18} className="text-blue-500 animate-pulse" />
                  <div>
                    <h3 className="font-mono text-xs font-bold tracking-widest uppercase text-zinc-100">LUMINA DEBUG</h3>
                    <p className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest mt-0.5">DEV PANEL CORE V1.0</p>
                  </div>
                </div>
                
                <nav className="space-y-1">
                  {[
                    { id: 'status', label: 'System Nodes', icon: <HardDrive size={13} /> },
                    { id: 'console', label: 'Diagnostic Terminal', icon: <SquareTerminal size={13} /> },
                    { id: 'perf', label: 'Telemetry/Perf', icon: <Activity size={13} /> },
                    { id: 'storage', label: 'State & Storage', icon: <Sliders size={13} /> },
                    { id: 'flags', label: 'Feature Toggles', icon: <Wrench size={13} /> },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveDevTab(tab.id as any)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-mono font-medium transition-all cursor-pointer ${
                        activeDevTab === tab.id 
                          ? 'bg-blue-600/15 text-blue-400 border border-blue-500/20 shadow-md' 
                          : 'text-zinc-400 hover:text-zinc-250 hover:bg-zinc-900/40 border border-transparent'
                      }`}
                    >
                      {tab.icon}
                      <span>{tab.label}</span>
                    </button>
                  ))}
                </nav>
              </div>
              
              {/* dev stats summary footer */}
              <div className="pt-4 border-t border-zinc-900/60">
                <div className="flex items-center justify-between font-mono text-[10px] text-zinc-500 px-1">
                  <span>Websocket Port</span>
                  <span className="text-emerald-400 font-bold">3000 (IN CLOUD)</span>
                </div>
                <div className="flex items-center justify-between font-mono text-[10px] text-zinc-500 px-1 mt-1.5">
                  <span>Active Chats</span>
                  <span className="text-zinc-300 font-bold">{chats.length}</span>
                </div>
                <div className="flex items-center justify-between font-mono text-[10px] text-zinc-500 px-1 mt-1.5">
                  <span>Latency Simulation</span>
                  <span className={`${simLatency > 120 ? 'text-orange-400' : 'text-zinc-500'} font-bold`}>
                    {simLatency > 120 ? '+500ms' : '0ms'}
                  </span>
                </div>
              </div>
            </div>

            {/* Main Tab Contents Panel Area */}
            <div className="flex-1 flex flex-col min-w-0">
              {/* Header title */}
              <div className="flex items-center justify-between p-5 border-b border-zinc-900 bg-zinc-950/40 z-10 select-none">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-300">
                    {activeDevTab === 'status' && 'System Node Status Map'}
                    {activeDevTab === 'console' && 'Diagnostic Terminal Emulator'}
                    {activeDevTab === 'perf' && 'Real-time Telemetry Graph'}
                    {activeDevTab === 'storage' && 'Runtime Key-Value Storage Inspector'}
                    {activeDevTab === 'flags' && 'Experimental Dev Toggles'}
                  </h2>
                </div>
                <button 
                  onClick={() => setIsDevToolsOpen(false)}
                  className="p-1.5 hover:bg-zinc-900 bg-zinc-950 border border-zinc-800 rounded-full transition-all text-zinc-400 hover:text-white cursor-pointer"
                  title="Close Panel"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Content Body */}
              <div className="flex-1 overflow-y-auto p-6 bg-zinc-950/20 custom-scrollbar font-mono">
                
                {/* TAB 1: STATUS MAP */}
                {activeDevTab === 'status' && (
                  <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
                    <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                      Dynamic routing diagram linking AI models, interface nodes, server processes, and databases live in your current preview sandbox.
                    </p>
                    
                    {/* Interactive Diagram UI */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="border border-zinc-900 bg-zinc-900/25 p-4 rounded-2xl">
                        <div className="flex items-center gap-2.5 mb-2">
                          <Bot className="text-blue-400" size={16} />
                          <h4 className="text-xs font-bold text-zinc-200 font-mono">Antigravity Core Model</h4>
                        </div>
                        <div className="text-[10px] space-y-1 text-zinc-400">
                          <div>Provider: <span className="text-zinc-300 font-semibold">{selectedProvider === 'custom' ? 'Custom HTTP proxy' : selectedProvider}</span></div>
                          <div>Endpoint: <span className="text-zinc-300 truncate font-mono block max-w-xs">{serverUrl || 'N/A'}</span></div>
                          <div>State: <span className="text-emerald-400 font-semibold">Ready</span></div>
                        </div>
                      </div>

                      <div className="border border-zinc-900 bg-zinc-900/25 p-4 rounded-2xl">
                        <div className="flex items-center gap-2.5 mb-2">
                          <Code className="text-teal-400" size={16} />
                          <h4 className="text-xs font-bold text-zinc-200 font-mono">Coder Mode Module</h4>
                        </div>
                        <div className="text-[10px] space-y-1 text-zinc-400">
                          <div>State: <span className={isCoderMode ? 'text-teal-400 font-bold' : 'text-zinc-500'}>{isCoderMode ? 'ACTIVE & LOADED' : 'INACTIVE'}</span></div>
                          <div>Left Explorer Panel: <span className={isCoderLeftPanelOpen ? 'text-teal-400' : 'text-zinc-500'}>{isCoderLeftPanelOpen ? 'OPENED' : 'CLOSED'}</span></div>
                          <div>Preview Frame State: <span className={isCoderRightPanelOpen ? 'text-orange-400' : 'text-zinc-500'}>{isCoderRightPanelOpen ? 'RUNNING' : 'COLLAPSED'}</span></div>
                        </div>
                      </div>

                      <div className="border border-zinc-900 bg-zinc-900/25 p-4 rounded-2xl">
                        <div className="flex items-center gap-2.5 mb-2">
                          <Settings className="text-zinc-400 animate-[spin_4s_linear_infinite]" size={16} />
                          <h4 className="text-xs font-bold text-zinc-200 font-mono">Llama Bridge Integrator</h4>
                        </div>
                        <div className="text-[10px] space-y-1 text-zinc-400">
                          <div>Bridge Client Url: <span className="text-zinc-300 truncate block max-w-xs font-mono">http://localhost:11434</span></div>
                          <div>Bridge Connection: <span className={isMcpConnected ? 'text-emerald-400 font-bold' : 'text-orange-400'}>{isMcpConnected ? 'CONNECTED' : 'STANDBY'}</span></div>
                        </div>
                      </div>
                    </div>

                    {/* Diagnostic Status Box */}
                    <div className="border border-zinc-900 bg-zinc-900/30 p-4 rounded-2xl select-text">
                      <h4 className="text-xs font-bold text-zinc-200 mb-3 uppercase tracking-wider">Diagnostic Connections Logs</h4>
                      <div className="space-y-1 text-[10px] text-zinc-500 font-mono">
                        <div>[03:21:15] Checking Port 3000 ingress server... <span className="text-emerald-400">OK</span></div>
                        <div>[03:21:16] Scanning active workspace files... found {workspaceRefreshKey > 0 ? 'modified files cache' : 'fresh directories'}</div>
                        <div>[03:21:17] Loading available theme configurations ... standard Dark/White contrast active.</div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* TAB 2: DIAGNOSTIC TERMINAL / CONSOLE */}
                {activeDevTab === 'console' && (
                  <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col h-full space-y-4">
                    <div className="flex items-center justify-between text-[11px] text-zinc-400 pb-1.5 border-b border-zinc-905 select-none">
                      <span>Lumina Debug Logger Console stdout Logs</span>
                      <button 
                        onClick={() => setDevLogs([{ timestamp: new Date().toLocaleTimeString(), level: 'system', text: 'Logs cleared.' }])}
                        className="px-2 py-1 text-[10px] bg-zinc-900 border border-zinc-800 rounded hover:bg-zinc-800 text-zinc-300 cursor-pointer"
                      >
                        Clear
                      </button>
                    </div>
                    
                    {/* Virtual terminal screen */}
                    <div className="bg-black/80 border border-zinc-900 rounded-xl p-4 h-60 overflow-y-auto custom-scrollbar font-mono text-xs text-zinc-300 space-y-2 select-text">
                      {devLogs.map((log, index) => (
                        <div key={index} className="flex gap-2 items-start leading-relaxed bg-transparent">
                          <span className="text-zinc-600 shrink-0 select-none">[{log.time || log.timestamp}]</span>
                          <span className={`shrink-0 select-none font-bold uppercase text-[9px] px-1.5 py-0.5 rounded ${
                            log.type === 'system' || log.level === 'system' ? 'bg-purple-900/35 text-purple-400' :
                            log.type === 'success' || log.level === 'success' ? 'bg-emerald-900/35 text-emerald-400' :
                            log.type === 'warn' || log.level === 'warn' ? 'bg-orange-900/35 text-orange-400' : 'bg-blue-900/35 text-blue-400'
                          }`}>
                            {log.type || log.level || 'info'}
                          </span>
                          <span className="break-all font-mono select-text">{log.text}</span>
                        </div>
                      ))}
                    </div>

                    {/* Terminal prompt input for executing mock command line! */}
                    <div className="border border-zinc-900 bg-zinc-900/25 p-3 rounded-2xl">
                      <p className="text-[10px] text-zinc-400 mb-2 font-mono">Execute diagnostic actions in workspace container:</p>
                      <div className="flex gap-2">
                        <input 
                          type="text"
                          placeholder="Type a debugging instruction (e.g. 'help', 'ping', 'stats', 'trigger-scans', 'logs-test')..."
                          className="flex-1 h-10 px-3 bg-black text-xs border border-zinc-900 rounded-xl text-blue-400 font-mono outline-none focus:border-blue-500"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const val = (e.target as HTMLInputElement).value.trim();
                              if (!val) return;
                              (e.target as HTMLInputElement).value = '';
                              handleExecMockCommand(val);
                            }
                          }}
                        />
                        <button 
                          onClick={() => {
                            const inputEl = document.querySelector('input[placeholder*="Type a debugging instruction"]') as HTMLInputElement;
                            if (inputEl && inputEl.value.trim()) {
                              handleExecMockCommand(inputEl.value.trim());
                              inputEl.value = '';
                            }
                          }}
                          className="px-4.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold cursor-pointer font-sans"
                        >
                          RUN
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* TAB 3: TELEMETRY & PERF GRAPH */}
                {activeDevTab === 'perf' && (
                  <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                    <div className="flex items-center justify-between select-none">
                      <p className="text-xs text-zinc-400 font-sans">
                        Real-time canvas-based performance monitor drawing core metrics, render delay, and thread frames.
                      </p>
                      <div className="flex gap-3 text-[10px] bg-zinc-900 border border-zinc-800 rounded-full px-3 py-1 font-semibold text-zinc-400 font-mono">
                        <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>FPS: {simLatency > 120 ? '58 stable' : '60 constant'}</span>
                        <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>CPU: ~1.2%</span>
                      </div>
                    </div>

                    {/* Performance Visualizer (Canvas) */}
                    <div className="border border-zinc-900 bg-zinc-900/25 p-4.5 rounded-2xl relative select-none">
                      <h4 className="text-xs font-bold text-zinc-200 mb-3 flex items-center gap-1.5 font-mono">
                        <Activity size={12} className="text-emerald-500 animate-pulse" />
                        <span>Interactive Telemetry Waveform</span>
                      </h4>
                      
                      <div className="h-44 bg-black/60 border border-zinc-900 rounded-xl overflow-hidden flex items-end p-1 relative">
                        <DevPerfCanvas />
                        <div className="absolute top-3 left-3 flex flex-col gap-1 text-[9px] font-mono text-zinc-500">
                          <div>Memory Limit: 512.0 MB</div>
                          <div>Active Usage: ~41.6 MB (Stable Peak)</div>
                        </div>
                      </div>
                    </div>

                    {/* Resource Heap Info boxes */}
                    <div className="grid grid-cols-2 gap-4 select-none">
                      <div className="border border-zinc-900 bg-zinc-950 p-4 rounded-xl">
                        <span className="text-[10px] text-zinc-500 uppercase block mb-1">Heap Details</span>
                        <span className="text-sm font-bold text-zinc-200">41,617 KB / 524,288 KB</span>
                        <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden mt-3">
                          <div className="bg-emerald-500 h-full rounded-full" style={{ width: '8%' }}></div>
                        </div>
                      </div>

                      <div className="border border-zinc-900 bg-zinc-950 p-4 rounded-xl">
                        <span className="text-[10px] text-zinc-500 uppercase block mb-1">Render Latency delay</span>
                        <span className="text-sm font-bold text-zinc-200">~1.42 ms <span className="text-zinc-500 text-xs font-normal font-sans">avg</span></span>
                        <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden mt-3">
                          <div className="bg-blue-500 h-full rounded-full" style={{ width: '4%' }}></div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* TAB 4: STORAGE / KEY-VALUE INSPECTOR */}
                {activeDevTab === 'storage' && (
                  <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                    <p className="text-xs text-zinc-400 font-sans leading-relaxed">
                      Read, edit, delete, or inject debugging parameters directly into your sandbox's standard `localStorage` cache storage.
                    </p>

                    <div className="border border-zinc-900 bg-zinc-900/25 rounded-2xl overflow-hidden">
                      <div className="bg-zinc-900/40 px-4.5 py-2.5 border-b border-zinc-900 flex items-center justify-between text-xs text-zinc-300 select-none">
                        <span className="font-bold">LocalStorage Workspace Tree</span>
                        <button 
                          onClick={() => {
                            localStorage.clear();
                            addDevLog('localStorage wiped by developer', 'warn');
                            showToast('System LocalStorage key-value storage wiped completely.');
                          }}
                          className="flex items-center gap-1.5 px-2 py-1 text-[10px] border border-red-500/20 text-red-400 hover:bg-red-500/10 rounded transition-all cursor-pointer font-bold uppercase font-sans"
                        >
                          <Trash2 size={11} />
                          <span>Wipe Storage</span>
                        </button>
                      </div>

                      {/* actual reading from storage */}
                      <div className="p-2 divide-y divide-zinc-900 text-xs text-left">
                        {(() => {
                          const keys = Object.keys(localStorage).filter(k => k.startsWith('lumina_') || k.includes('chat') || k === 'user_profile' || k.includes('settings'));
                          if (keys.length === 0) {
                            return (
                              <p className="text-[11px] text-zinc-500 p-4 italic text-center w-full">
                                No active local-storage tracking entries detected. Type values or select tabs to initialize keys.
                              </p>
                            );
                          }
                          return keys.map(k => {
                            const val = localStorage.getItem(k) || '';
                            return (
                              <div key={k} className="p-3 select-text flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between group">
                                <div className="min-w-0 flex-1">
                                  <span className="block font-bold text-blue-400 truncate text-[11px] mb-0.5">{k}</span>
                                  <span className="block font-mono text-zinc-400 text-[10px] break-all max-h-12 overflow-y-auto select-text bg-[#0A0908] px-2 py-1 rounded border border-zinc-900">
                                    {val}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center opacity-80 group-hover:opacity-100 transition-opacity">
                                  <button 
                                    onClick={() => {
                                      const newVal = prompt(`Value for ${k}:`, val);
                                      if (newVal !== null) {
                                        localStorage.setItem(k, newVal);
                                        addDevLog(`Storage updated: ${k}`, 'success');
                                        showToast(`Storage updated: ${k}`);
                                        if (k === 'lumina_compact_sidebar') {
                                          setIsCompactSidebar(newVal === 'true');
                                        } else if (k === 'lumina_use_bubbles') {
                                          setUseBubbles(newVal !== 'false');
                                        } else if (k === 'lumina_auto_hide_top_bar') {
                                          setAutoHideTopBar(newVal === 'true');
                                        }
                                      }
                                    }}
                                    className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded transition-all cursor-pointer border border-zinc-850 bg-zinc-900"
                                    title="Edit Value"
                                  >
                                    <Wrench size={11} />
                                  </button>
                                  <button 
                                    onClick={() => {
                                      if (confirm(`Delete key ${k}?`)) {
                                        localStorage.removeItem(k);
                                        addDevLog(`Storage key deleted: ${k}`, 'warn');
                                        showToast(`Deleted storage key: ${k}`);
                                      }
                                    }}
                                    className="p-1.5 hover:bg-red-950/20 text-red-400 rounded transition-all cursor-pointer border border-zinc-850 bg-zinc-900"
                                    title="Delete Key"
                                  >
                                    <Trash2 size={11} />
                                  </button>
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>

                    {/* Custom Storage Injector */}
                    <div className="border border-zinc-900 bg-zinc-900/25 p-4 rounded-2xl space-y-3">
                      <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-wide">Inject Custom Key-Value</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input 
                          id="storage-key-input"
                          type="text"
                          placeholder="Key (e.g., lumina_custom_debug)"
                          className="bg-black text-xs border border-zinc-900 rounded-xl h-9.5 px-3 font-mono text-zinc-300 outline-none"
                        />
                        <input 
                          id="storage-val-input"
                          type="text"
                          placeholder="Value (e.g., true)"
                          className="bg-black text-xs border border-zinc-900 rounded-xl h-9.5 px-3 font-mono text-zinc-300 outline-none"
                        />
                      </div>
                      <button 
                        onClick={() => {
                          const keyEl = document.getElementById('storage-key-input') as HTMLInputElement;
                          const valEl = document.getElementById('storage-val-input') as HTMLInputElement;
                          if (keyEl && valEl && keyEl.value.trim() && valEl.value.trim()) {
                            localStorage.setItem(keyEl.value.trim(), valEl.value.trim());
                            addDevLog(`Injected storage key: ${keyEl.value}`, 'success');
                            showToast(`Injected key: ${keyEl.value}`);
                            keyEl.value = '';
                            valEl.value = '';
                          } else {
                            showToast('Please provide both unique key and value.');
                          }
                        }}
                        className="w-full h-9.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-bold text-white transition-all cursor-pointer font-sans"
                      >
                        INJECT INTO STORAGE DB
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* TAB 5: EXPERIMENTAL FLAGS */}
                {activeDevTab === 'flags' && (
                  <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="space-y-5 text-left">
                    <p className="text-xs text-zinc-400 font-sans leading-relaxed">
                      Control micro-interactions, simulate slow sandbox models, and experiment with styling overlays in real-time.
                    </p>

                    <div className="space-y-4 select-none">
                      {/* Simulation Latency Toggle */}
                      <div className="flex items-center justify-between p-4 bg-zinc-900/30 border border-zinc-900 rounded-2xl">
                        <div>
                          <div className="font-bold text-xs text-zinc-250 uppercase tracking-wide mb-1 select-none font-mono">Simulate Endpoint Latency</div>
                          <div className="text-[10px] text-zinc-400 font-sans leading-relaxed">Apply +500ms delay to mock network API calls</div>
                        </div>
                        <button 
                          onClick={() => {
                            const next = simLatency <= 120;
                            setSimLatency(next ? 500 : 120);
                            addDevLog(`Latency Simulation changed: ${next ? 'ENABLED' : 'DISABLED'}`, 'warn');
                            showToast(next ? 'Active simulation latency +500ms enabled.' : 'Simulation latency delay disabled.');
                          }}
                          className={`w-11 h-5.5 rounded-full transition-all relative cursor-pointer ${simLatency > 120 ? 'bg-blue-600' : 'bg-zinc-805'}`}
                        >
                          <motion.div 
                            animate={{ x: simLatency > 120 ? 22 : 2 }}
                            className="absolute top-0.5 w-4.5 h-4.5 rounded-full bg-white shadow-sm"
                          />
                        </button>
                      </div>

                      {/* Retro Cyberpunk Scanlines */}
                      <div className="flex items-center justify-between p-4 bg-zinc-900/30 border border-zinc-900 rounded-2xl">
                        <div>
                          <div className="font-bold text-xs text-zinc-250 uppercase tracking-wide mb-1 select-none font-mono">Retro Scanlines CRT overlay</div>
                          <div className="text-[10px] text-zinc-400 font-sans leading-relaxed">Toggle visual phosphor phosphor grid filters</div>
                        </div>
                        <button 
                          onClick={() => {
                            const next = !retroFilter;
                            setRetroFilter(next);
                            addDevLog(`Retro Monitor Overlay switched: ${next ? 'ON' : 'OFF'}`, 'success');
                            showToast(next ? 'Retro CRT grid styling active.' : 'Retro CRT overlay disabled.');
                          }}
                          className={`w-11 h-5.5 rounded-full transition-all relative cursor-pointer ${retroFilter ? 'bg-blue-600' : 'bg-zinc-805'}`}
                        >
                          <motion.div 
                            animate={{ x: retroFilter ? 22 : 2 }}
                            className="absolute top-0.5 w-4.5 h-4.5 rounded-full bg-white shadow-sm"
                          />
                        </button>
                      </div>

                      {/* Interactive Sparkles Animation Toggle */}
                      <div className="flex items-center justify-between p-4 bg-zinc-900/30 border border-zinc-900 rounded-2xl">
                        <div>
                          <div className="font-bold text-xs text-zinc-250 uppercase tracking-wide mb-1 select-none font-mono">Verbose Debug Log level</div>
                          <div className="text-[10px] text-zinc-400 font-sans leading-relaxed">Logs more events from header selections, folder trees, and layout clicks</div>
                        </div>
                        <button 
                          onClick={() => {
                            const next = !verboseDebug;
                            setVerboseDebug(next);
                            addDevLog(`Verbose Debug switch: ${next ? 'LOG ALL' : 'STANDARD'}`, 'info');
                            showToast(next ? 'Verbose session logging active.' : 'Verbose logging level normalized.');
                          }}
                          className={`w-11 h-5.5 rounded-full transition-all relative cursor-pointer ${verboseDebug ? 'bg-blue-600' : 'bg-zinc-805'}`}
                        >
                          <motion.div 
                            animate={{ x: verboseDebug ? 22 : 2 }}
                            className="absolute top-0.5 w-4.5 h-4.5 rounded-full bg-white shadow-sm"
                          />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}

              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
