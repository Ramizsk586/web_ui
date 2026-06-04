import React, { useState, useEffect } from 'react';
import { DevToolsPanel } from './DevToolsPanel';

export function InspectStandalone() {
  const [activeDevTab, setActiveDevTab] = useState<'status' | 'console' | 'perf' | 'storage' | 'flags'>('status');
  const [devLogs, setDevLogs] = useState<any[]>([]);
  const [simLatency, setSimLatency] = useState(() => {
    try { return parseInt(localStorage.getItem('lumina_sim_latency') || '120', 10); } catch { return 120; }
  });
  const [isCoderMode] = useState(() => localStorage.getItem('lumina_is_coder_mode') === 'true');
  const [retroFilter, setRetroFilter] = useState(() => localStorage.getItem('lumina_retro_filter') === 'true');
  const [verboseDebug, setVerboseDebug] = useState(() => localStorage.getItem('lumina_verbose_debug') === 'true');

  const addDevLog = (message: string, type: 'info' | 'warn' | 'error' | 'success' = 'info') => {
    setDevLogs(prev => [...prev, { timestamp: Date.now(), level: type, text: message }]);
  };

  const showToast = (msg: string) => {
    console.log('[Inspect Panel]', msg);
  };

  const handleExecMockCommand = (input: string) => {
    const cmd = input.trim().toLowerCase();
    if (cmd === 'help') {
      addDevLog('Available commands: help, ping, stats, info', 'info');
    } else if (cmd === 'ping') {
      addDevLog('pong', 'success');
    } else if (cmd === 'stats') {
      addDevLog(`Memory: ${(performance as any).memory?.usedJSHeapSize ? Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024) + 'MB' : 'N/A'}`, 'info');
    } else if (cmd === 'info') {
      addDevLog(`User Agent: ${navigator.userAgent}`, 'info');
    } else {
      addDevLog(`Unknown command: ${input}`, 'warn');
    }
  };

  return (
    <div className="w-full h-screen bg-zinc-950 overflow-hidden">
      <DevToolsPanel
        isDevToolsOpen={true}
        setIsDevToolsOpen={() => {}}
        activeDevTab={activeDevTab}
        setActiveDevTab={setActiveDevTab}
        simLatency={simLatency}
        setSimLatency={setSimLatency}
        devLogs={devLogs}
        setDevLogs={setDevLogs}
        chats={[]}
        selectedProvider={localStorage.getItem('lumina_provider') || ''}
        serverUrl={localStorage.getItem('lumina_server_url') || ''}
        isCoderMode={isCoderMode}
        isCoderLeftPanelOpen={false}
        isCoderRightPanelOpen={false}
        isMcpConnected={false}
        workspaceRefreshKey={0}
        handleExecMockCommand={handleExecMockCommand}
        addDevLog={addDevLog}
        showToast={showToast}
        retroFilter={retroFilter}
        setRetroFilter={setRetroFilter}
        verboseDebug={verboseDebug}
        setVerboseDebug={setVerboseDebug}
        setIsCompactSidebar={() => {}}
        isCompactSidebar={false}
        setUseBubbles={() => {}}
        useBubbles={true}
        setAutoHideTopBar={() => {}}
        autoHideTopBar={false}
      />
    </div>
  );
}
