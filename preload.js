// preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  platform: process.platform,
  onThemeChange: (callback) => ipcRenderer.on('theme-changed', callback),
});