import { useState, useCallback } from 'react';
import { Message, Chat } from '../types';

export interface UseDevToolsProps {
  messages: Message[];
  chats: Chat[];
  showToast: (msg: string) => void;
}

export function useDevTools({ messages, chats, showToast }: UseDevToolsProps) {
  const [isDevToolsOpen, setIsDevToolsOpen] = useState(false);
  const [activeDevTab, setActiveDevTab] = useState<'status' | 'console' | 'perf' | 'storage' | 'flags'>('status');
  const [simLatency, setSimLatency] = useState(false);
  const [retroFilter, setRetroFilter] = useState(false);
  const [verboseDebug, setVerboseDebug] = useState(false);
  const [devLogs, setDevLogs] = useState<Array<{ timestamp: string; level: 'info' | 'warn' | 'success' | 'system'; text: string }>>([
    { timestamp: new Date().toLocaleTimeString(), level: 'system', text: 'Lumina Debug Core v1.0.0 initialized' },
    { timestamp: new Date().toLocaleTimeString(), level: 'info', text: 'Establishing secure websocket proxy to Port 3000...' },
    { timestamp: new Date().toLocaleTimeString(), level: 'success', text: 'Bridge Service status: ONLINE' },
    { timestamp: new Date().toLocaleTimeString(), level: 'info', text: 'Persistent state loaded successfully from localStorage.' }
  ]);

  const addDevLog = useCallback((text: string, level: 'info' | 'warn' | 'success' | 'system' = 'info') => {
    setDevLogs(prev => [
      ...prev,
      { timestamp: new Date().toLocaleTimeString(), level, text }
    ].slice(-50));
  }, []);

  const handleExecMockCommand = (cmd: string) => {
    const raw = cmd.toLowerCase().trim();
    addDevLog(`$ user-exec: ${cmd}`, 'system');
    
    if (raw === 'help') {
      addDevLog('Available commands: help, ping, stats, trigger-scans, logs-test, info', 'info');
    } else if (raw === 'ping') {
      addDevLog('Pinging Cloud ingress nodes... pong in 4ms (Port 3000 mapping secure).', 'success');
    } else if (raw === 'stats') {
      addDevLog(`Active nodes: AI Provider Preset, Coder Panels, Sci Labs. Total active messages: ${messages.length}`, 'info');
    } else if (raw === 'trigger-scans') {
      addDevLog('Triggering fresh layout elements container cache scan...', 'info');
      setTimeout(() => {
        addDevLog('Cached 4 layout targets successfully.', 'success');
        showToast('DevTools layout cache updated.');
      }, 700);
    } else if (raw === 'logs-test') {
      addDevLog('WARNING: System resources state threshold limit checks... OK', 'warn');
      addDevLog('SUCCESSFUL debug test sequence finalized.', 'success');
    } else if (raw === 'info') {
      addDevLog('Lumina Intelligence Control Room - Release v2.0.18-dev', 'system');
    } else {
      addDevLog(`Command '${cmd}' unrecognized. Type 'help' to see active queries.`, 'warn');
    }
  };

  return {
    isDevToolsOpen,
    setIsDevToolsOpen,
    activeDevTab,
    setActiveDevTab,
    simLatency,
    setSimLatency,
    retroFilter,
    setRetroFilter,
    verboseDebug,
    setVerboseDebug,
    devLogs,
    setDevLogs,
    addDevLog,
    handleExecMockCommand
  };
}
