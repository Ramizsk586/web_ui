import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('__electronAPI', {
  showContextMenu: () => ipcRenderer.send('show-context-menu'),
  toggleDevtools: () => ipcRenderer.send('toggle:devtools'),
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  close: () => ipcRenderer.send('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
  onMaximized: (callback: (maximized: boolean) => void) => {
    ipcRenderer.on('window:maximized', (_event, maximized) => callback(maximized));
  },
  onFullScreen: (callback: (fullscreen: boolean) => void) => {
    ipcRenderer.on('window:fullscreen', (_event, fullscreen) => callback(fullscreen));
  },

  onServerLog: (callback: (log: string) => void) => {
    ipcRenderer.on('server:log', (_event, log) => callback(log));
  },
  onServerReady: (callback: (url: string) => void) => {
    ipcRenderer.on('server:ready', (_event, url) => callback(url));
  },
  onServerError: (callback: (error: string) => void) => {
    ipcRenderer.on('server:error', (_event, error) => callback(error));
  },
  openDevTools: () => ipcRenderer.send('toggle:devtools'),

  showPrompt: (message: string, defaultValue: string = '') => {
    return ipcRenderer.invoke('dialog:prompt', message, defaultValue);
  },
  showAlert: (message: string) => {
    return ipcRenderer.invoke('dialog:alert', message);
  },
  closePrompt: (value: string | null) => {
    ipcRenderer.invoke('prompt:response', value);
  },
  openFolderDialog: () => {
    return ipcRenderer.invoke('dialog:openFolder');
  },
  getStoredState: () => {
    return ipcRenderer.invoke('storage:getState');
  },
  setStoredState: (state: Record<string, any>) => {
    return ipcRenderer.invoke('storage:setState', state);
  },
  zoomIn: () => ipcRenderer.invoke('zoom:in'),
  zoomOut: () => ipcRenderer.invoke('zoom:out'),
  zoomReset: () => ipcRenderer.invoke('zoom:reset'),
});
