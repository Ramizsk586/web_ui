import React from 'react';

export const addDevLogHelper = (
  message: string,
  setDevLogs: React.Dispatch<React.SetStateAction<any[]>>,
  type: 'info' | 'warn' | 'error' | 'success' = 'info'
) => {
  setDevLogs(prev => [
    ...prev,
    { id: Date.now().toString(), text: message, type, time: new Date().toLocaleTimeString() }
  ]);
};

export const handleExecMockCommandHelper = (
  cmd: string,
  setDevLogs: React.Dispatch<React.SetStateAction<any[]>>,
  addDevLog: (message: string, type?: 'info' | 'warn' | 'error' | 'success') => void
) => {
  if (!cmd) return;
  addDevLog(`$ ${cmd}`, 'info');
  const lower = cmd.toLowerCase();
  if (lower === 'clear') {
    setDevLogs([]);
  } else if (lower === 'help') {
    addDevLog('Available commands: help, clear, ping, system, perf', 'info');
  } else if (lower === 'ping') {
    addDevLog('pong! 64 bytes from local: icmp_seq=1 ttl=64 time=0.21ms', 'info');
  } else if (lower === 'system') {
    addDevLog('System: Node.js Dev Server | Platform: Cloud Run Sandboxed', 'info');
  } else if (lower === 'perf') {
    addDevLog('Heap size: 42.1MB | Active Nodes: 1243 | FPS: 60', 'info');
  } else {
    addDevLog(`Command not found: ${cmd}`, 'error');
  }
};

export const insertAttachedContentHelper = (
  content: string,
  setInput: React.Dispatch<React.SetStateAction<string>>,
  showToast: (m: string) => void
) => {
  setInput(prev => prev ? prev + '\n' + content : content);
  showToast("Attachment content inserted to compose box!");
};

export const adjustTextareaHeightHelper = (
  e: React.ChangeEvent<HTMLTextAreaElement>,
  setInput: React.Dispatch<React.SetStateAction<string>>
) => {
  const textarea = e.target;
  setInput(textarea.value);

  requestAnimationFrame(() => {
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
  });
};
