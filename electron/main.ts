import { app, BrowserWindow, Menu, ipcMain, shell } from 'electron';
import path from 'path';
import fs from 'fs';
import { spawn, type ChildProcessWithoutNullStreams } from 'child_process';
import http from 'http';

let mainWindow: BrowserWindow | null = null;
let serverProcess: ChildProcessWithoutNullStreams | null = null;

const isDev = !app.isPackaged;
const SERVER_PORT = parseInt(process.env.PORT || '3000', 10);

function getLoadingHTML(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="color-scheme" content="dark">
<title>Lumina AI Chat</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
  
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    background: #09090b;
    color: #f0f0f0;
    height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    user-select: none;
    -webkit-app-region: drag;
  }
  
  .container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 32px;
  }
  
  .logo-ring {
    position: relative;
    width: 72px;
    height: 72px;
  }
  .logo-ring svg {
    position: absolute;
    top: 0; left: 0;
    animation: rotate-ring 2s linear infinite;
  }
  @keyframes rotate-ring { to { transform: rotate(360deg); } }
  
  .logo-icon {
    width: 72px;
    height: 72px;
    border-radius: 18px;
    background: linear-gradient(135deg, #a855f7 0%, #6366f1 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 30px;
    font-weight: 700;
    color: #fff;
    position: relative;
    z-index: 1;
    box-shadow: 0 0 60px rgba(168, 85, 247, 0.2);
  }
  
  .title {
    font-size: 22px;
    font-weight: 600;
    letter-spacing: -0.02em;
    background: linear-gradient(135deg, #f0f0f0, #a0a0a0);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  
  .subtitle {
    font-size: 13px;
    font-weight: 400;
    color: rgba(255,255,255,0.35);
    letter-spacing: 0.03em;
    text-transform: uppercase;
  }
  
  .loading-bar-track {
    width: 200px;
    height: 2px;
    background: rgba(255,255,255,0.06);
    border-radius: 2px;
    overflow: hidden;
  }
  .loading-bar-fill {
    height: 100%;
    width: 0%;
    background: linear-gradient(90deg, #a855f7, #6366f1);
    border-radius: 2px;
    transition: width 0.3s ease;
  }
  
  .status-row {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 12px;
    color: rgba(255,255,255,0.4);
    -webkit-app-region: no-drag;
  }
  .status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #6366f1;
    animation: pulse-dot 1.4s ease-in-out infinite;
  }
  @keyframes pulse-dot { 0%,100%{opacity:.3;transform:scale(.8)} 50%{opacity:1;transform:scale(1.1)} }
  .status-dot.ready { background:#23d18b; animation:none; opacity:1; transform:scale(1); }
  .status-dot.error { background:#f14c4c; animation:none; opacity:1; transform:scale(1); }
  
  .status-label { transition: color 0.3s; }
  .status-label.ready { color: rgba(35,209,139,0.7); }
  .status-label.error { color: rgba(241,76,76,0.7); }
  
  .version {
    position: fixed;
    bottom: 24px;
    font-size: 10px;
    color: rgba(255,255,255,0.08);
    letter-spacing: 0.08em;
  }
</style>
</head>
<body>
<div class="container">
  <div class="logo-ring">
    <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
      <circle cx="36" cy="36" r="33" stroke="url(#grad)" stroke-width="1.5" stroke-linecap="round" stroke-dasharray="90 170" />
      <defs>
        <linearGradient id="grad" x1="0" y1="0" x2="72" y2="72">
          <stop offset="0%" stop-color="#a855f7" />
          <stop offset="100%" stop-color="#6366f1" />
        </linearGradient>
      </defs>
    </svg>
    <div class="logo-icon">L</div>
  </div>
  
  <div class="title">Lumina AI Chat</div>
  <div class="subtitle">Modern intelligence, refined interface.</div>
  
  <div class="loading-bar-track">
    <div class="loading-bar-fill" id="loadingBar"></div>
  </div>
  
  <div class="status-row">
    <span class="status-dot" id="statusDot"></span>
    <span class="status-label" id="statusLabel">Initializing...</span>
  </div>
</div>
<div class="version">v1.0.0</div>

<script>
  var statusLabel = document.getElementById('statusLabel');
  var statusDot = document.getElementById('statusDot');
  var loadingBar = document.getElementById('loadingBar');
  var progress = 0;
  
  function updateProgress(target) {
    if (target > progress) {
      progress = target;
      loadingBar.style.width = Math.min(progress, 95) + '%';
    }
  }
  
  var progressInterval = setInterval(function() {
    updateProgress(progress + (95 - progress) * 0.04);
  }, 300);
  
  function setReady() {
    clearInterval(progressInterval);
    loadingBar.style.width = '100%';
    statusDot.className = 'status-dot ready';
    statusLabel.textContent = 'Ready';
    statusLabel.className = 'status-label ready';
  }
  
  function setError(msg) {
    statusDot.className = 'status-dot error';
    statusLabel.textContent = msg || 'Connection failed';
    statusLabel.className = 'status-label error';
  }
  
  function pollServer() {
    fetch('http://localhost:${SERVER_PORT}/api/health')
      .then(function(r) { return r.json(); })
      .then(function(d) {
        if (d && d.status === 'ok') {
          statusLabel.textContent = 'Connecting...';
          updateProgress(85);
          setReady();
        }
      })
      .catch(function() {});
  }
  
  var api = window.__electronAPI;
  if (api) {
    if (api.onServerReady) api.onServerReady(function(url) {
      statusLabel.textContent = 'Connecting...';
      updateProgress(80);
      setTimeout(setReady, 400);
    });
    if (api.onServerError) api.onServerError(function(err) {
      setError('Connection failed');
    });
  } else {
    setInterval(pollServer, 800);
  }
</script>
</body>
</html>`;
}

function writeLoadingFile(): string {
  const dir = isDev
    ? path.join(__dirname, '..', 'dist-electron')
    : path.join(process.resourcesPath, 'dist-electron');
  
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  const filePath = path.join(dir, 'loading.html');
  fs.writeFileSync(filePath, getLoadingHTML(), 'utf-8');
  return filePath;
}

function sendToLoadingScreen(event: string, data: string) {
  try {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(event, data);
    }
  } catch {}
}

function waitForServer(url: string, timeout = 30000): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      http.get(url, (res) => {
        resolve();
      }).on('error', () => {
        if (Date.now() - start > timeout) {
          reject(new Error(`Server did not start within ${timeout}ms`));
        } else {
          setTimeout(check, 500);
        }
      });
    };
    check();
  });
}

function startServerProcess(): Promise<string> {
  const url = `http://localhost:${SERVER_PORT}`;

  // In dev mode, the server is already started by concurrently.
  // Just wait for it to be ready instead of spawning a duplicate.
  if (isDev) {
    sendToLoadingScreen('server:log', 'Waiting for development server...');
    return waitForServer(url, 30000).then(() => {
      sendToLoadingScreen('server:ready', url);
      return url;
    });
  }

  return new Promise((resolve, reject) => {
    const serverPath = path.join(process.resourcesPath, 'dist', 'server.cjs');

    console.log('Starting server from:', serverPath);
    sendToLoadingScreen('server:log', `Loading server: ${path.basename(serverPath)}`);

    if (!fs.existsSync(serverPath)) {
      const altPath = path.join(__dirname, 'dist', 'server.cjs');
      console.log('Primary path not found, trying:', altPath);
      sendToLoadingScreen('server:log', `Trying alternate path...`);
      
      if (!fs.existsSync(altPath)) {
        const err = `Server file not found`;
        console.error(err);
        sendToLoadingScreen('server:error', err);
        reject(new Error(err));
        return;
      }
    }

    const actualServerPath = fs.existsSync(serverPath) ? serverPath : path.join(__dirname, 'dist', 'server.cjs');

    const env = {
      ...process.env,
      PORT: String(SERVER_PORT),
      NODE_ENV: 'production',
      LUMINA_DATA_DIR: path.join(app.getPath('userData'), '.lumina'),
    };

    const serverCommand = process.platform === 'win32' ? 'node.exe' : 'node';
    const serverArgs = [actualServerPath];

    sendToLoadingScreen('server:log', `Starting server (${path.basename(serverCommand)})...`);

    serverProcess = spawn(serverCommand, serverArgs, {
      env,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let output = '';
    let resolved = false;

    const onData = (text: string) => {
      output += text;
      
      const lines = text.split(/\r?\n/).filter(Boolean);
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed) {
          sendToLoadingScreen('server:log', trimmed);
        }
      }

      if (!resolved && (
        text.toLowerCase().includes('listening') ||
        text.toLowerCase().includes('server running') ||
        text.toLowerCase().includes(`localhost:${SERVER_PORT}`)
      )) {
        resolved = true;
        sendToLoadingScreen('server:ready', url);
        resolve(url);
      }
    };

    serverProcess.stdout?.on('data', (data: Buffer) => {
      const text = data.toString();
      console.log('[server]', text);
      onData(text);
    });

    serverProcess.stderr?.on('data', (data: Buffer) => {
      const text = data.toString();
      console.log('[server-err]', text);
      onData(text);
    });

    serverProcess.on('error', (err) => {
      console.error('Failed to start server:', err);
      sendToLoadingScreen('server:error', err.message);
      if (!resolved) { resolved = true; reject(err); }
    });

    serverProcess.on('exit', (code) => {
      if (code !== 0 && code !== null && !resolved) {
        const errMsg = `Server exited with code ${code}`;
        console.error(errMsg);
        sendToLoadingScreen('server:error', errMsg);
        if (!resolved) { resolved = true; reject(new Error(errMsg)); }
      }
    });

    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        sendToLoadingScreen('server:log', 'Server may be ready, loading application...');
        sendToLoadingScreen('server:ready', url);
        resolve(url);
      }
    }, 6000);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    title: 'Lumina AI Chat',
    backgroundColor: '#09090b',
    frame: false,
    icon: isDev
      ? path.join(__dirname, '..', 'assets', 'sparkles.png')
      : path.join(process.resourcesPath, 'assets', 'sparkles.png'),
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  Menu.setApplicationMenu(null);

  ipcMain.on('window:minimize', () => mainWindow?.minimize());
  ipcMain.on('window:maximize', () => {
    if (mainWindow?.isMaximized()) { mainWindow.unmaximize(); }
    else { mainWindow?.maximize(); }
  });
  ipcMain.on('window:close', () => mainWindow?.close());
  ipcMain.handle('window:isMaximized', () => mainWindow?.isMaximized());

  ipcMain.on('toggle:devtools', () => {
    if (mainWindow) mainWindow.webContents.toggleDevTools();
  });

  let promptWindow: BrowserWindow | null = null;

  ipcMain.handle('dialog:prompt', async (_event, message: string, defaultValue: string) => {
    return new Promise((resolve) => {
      promptWindow = new BrowserWindow({
        width: 480,
        height: 200,
        resizable: false,
        frame: false,
        transparent: true,
        skipTaskbar: true,
        parent: mainWindow!,
        modal: true,
        show: false,
        webPreferences: {
          preload: path.join(__dirname, 'preload.cjs'),
        },
      });

      const promptHTML = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#1a1a1a;color:#f0f0f0;padding:20px;border-radius:12px;border:1px solid #333;overflow:hidden;height:100vh;display:flex;flex-direction:column}
h3{font-size:13px;font-weight:600;margin-bottom:4px;color:#ccc}
p{font-size:11px;color:#666;margin-bottom:14px;word-break:break-word}
input{width:100%;padding:8px 10px;background:#0d0d0d;border:1px solid #333;border-radius:6px;color:#fff;font-size:13px;outline:none;margin-bottom:12px}
input:focus{border-color:#6366f1}
.buttons{display:flex;gap:8px;justify-content:flex-end}
button{padding:6px 14px;border-radius:6px;font-size:12px;cursor:pointer;border:none}
.btn-ok{background:#6366f1;color:#fff}
.btn-ok:hover{background:#7c7cf7}
.btn-cancel{background:#2a2a2a;color:#aaa}
.btn-cancel:hover{background:#333;color:#fff}
</style></head>
<body>
<h3>${message}</h3>
<p>Enter the value below:</p>
<input type="text" id="input" value="${defaultValue.replace(/"/g,'"')}" placeholder="Enter value..." />
<div class="buttons">
<button class="btn-cancel" onclick="cancel()">Cancel</button>
<button class="btn-ok" onclick="submit()">OK</button>
</div>
<script>
const input = document.getElementById('input');
input.focus();
input.select();
function submit() {
  if (window.__electronAPI && window.__electronAPI.closePrompt) {
    window.__electronAPI.closePrompt(input.value);
  }
}
function cancel() {
  if (window.__electronAPI && window.__electronAPI.closePrompt) {
    window.__electronAPI.closePrompt(null);
  }
}
input.addEventListener('keydown', function(e) {
  if (e.key === 'Enter') submit();
  if (e.key === 'Escape') cancel();
});
</script>
</body>
</html>`;

      const promptPreloadPath = path.join(__dirname, 'preload.cjs');
      
      const promptDir = isDev ? path.join(__dirname, '..', 'dist-electron') : path.join(process.resourcesPath, 'dist-electron');
      if (!fs.existsSync(promptDir)) fs.mkdirSync(promptDir, { recursive: true });
      const promptFile = path.join(promptDir, 'prompt.html');
      fs.writeFileSync(promptFile, promptHTML, 'utf-8');

      const promptHandler = (_e: any, value: string | null) => {
        ipcMain.removeHandler('prompt:response');
        if (promptWindow && !promptWindow.isDestroyed()) promptWindow.close();
        promptWindow = null;
        resolve(value);
      };
      ipcMain.handle('prompt:response', promptHandler);

      promptWindow.once('ready-to-show', () => promptWindow?.show());
      promptWindow.on('closed', () => {
        if (promptWindow) {
          ipcMain.removeHandler('prompt:response');
          promptWindow = null;
          resolve(null);
        }
      });
      
      promptWindow.loadFile(promptFile);
    });
  });

  ipcMain.handle('dialog:alert', async (_event, message: string) => {
    const { dialog } = require('electron');
    await dialog.showMessageBox(mainWindow!, {
      type: 'info',
      buttons: ['OK'],
      title: 'Lumina AI Chat',
      message: message,
    });
  });

  ipcMain.handle('dialog:openFolder', async () => {
    const { dialog } = require('electron');
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openDirectory'],
      title: 'Open Folder',
    });
    if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
      return null;
    }
    return result.filePaths[0];
  });

  ipcMain.handle('zoom:get', () => {
    if (mainWindow) {
      return mainWindow.webContents.getZoomFactor();
    }
    return 1.0;
  });
  ipcMain.handle('zoom:set', (_event, factor: number) => {
    if (mainWindow) {
      mainWindow.webContents.setZoomFactor(Math.max(0.3, Math.min(3.0, factor)));
    }
  });
  ipcMain.handle('zoom:in', () => {
    if (mainWindow) {
      const current = mainWindow.webContents.getZoomFactor();
      mainWindow.webContents.setZoomFactor(Math.min(3.0, current + 0.1));
    }
  });
  ipcMain.handle('zoom:out', () => {
    if (mainWindow) {
      const current = mainWindow.webContents.getZoomFactor();
      mainWindow.webContents.setZoomFactor(Math.max(0.3, current - 0.1));
    }
  });
  ipcMain.handle('zoom:reset', () => {
    if (mainWindow) {
      mainWindow.webContents.setZoomFactor(1.0);
    }
  });

  ipcMain.on('show-context-menu', () => {
    if (!mainWindow) return;
    const template: Electron.MenuItemConstructorOptions[] = [
      {
        label: 'Zoom In',
        accelerator: 'CmdOrCtrl+=',
        click: () => {
          const current = mainWindow!.webContents.getZoomFactor();
          mainWindow!.webContents.setZoomFactor(Math.min(3.0, current + 0.1));
        },
      },
      {
        label: 'Zoom Out',
        accelerator: 'CmdOrCtrl+-',
        click: () => {
          const current = mainWindow!.webContents.getZoomFactor();
          mainWindow!.webContents.setZoomFactor(Math.max(0.3, current - 0.1));
        },
      },
      { type: 'separator' },
      { role: 'copy' },
      { role: 'paste' },
      { type: 'separator' },
      {
        label: 'Inspect',
        accelerator: 'F12',
        click: () => mainWindow?.webContents.toggleDevTools(),
      },
    ];
    const menu = Menu.buildFromTemplate(template);
    menu.popup({ window: mainWindow });
  });

  mainWindow.on('maximize', () => mainWindow?.webContents.send('window:maximized', true));
  mainWindow.on('unmaximize', () => mainWindow?.webContents.send('window:maximized', false));
  mainWindow.on('enter-full-screen', () => mainWindow?.webContents.send('window:fullscreen', true));
  mainWindow.on('leave-full-screen', () => mainWindow?.webContents.send('window:fullscreen', false));
  mainWindow.on('closed', () => { mainWindow = null; });

  const loadingPath = writeLoadingFile();
  mainWindow.loadFile(loadingPath);

  sendToLoadingScreen('server:log', 'Window ready. Starting server...');
  
  const startedAt = Date.now();
  const MIN_SPLASH_DURATION = 2000;
  
  startServerProcess()
    .then(async (url) => {
      console.log('Server started at:', url);
      sendToLoadingScreen('server:log', 'Verifying server...');
      
      try {
        await waitForServer(url, 12000);
        sendToLoadingScreen('server:log', 'Server verified. Loading app...');
      } catch {
        sendToLoadingScreen('server:log', 'Server check timed out, loading anyway...');
      }
      
      const elapsed = Date.now() - startedAt;
      const remaining = Math.max(0, MIN_SPLASH_DURATION - elapsed);
      sendToLoadingScreen('server:log', `Waiting ${remaining}ms for splash...`);
      await new Promise(r => setTimeout(r, remaining));
      
      mainWindow?.loadURL(url);
    })
    .catch((err) => {
      console.error('Failed to start server:', err);
      sendToLoadingScreen('server:error', err.message || 'Failed to start server');
      setTimeout(() => { mainWindow?.loadURL(`http://localhost:${SERVER_PORT}`); }, 3000);
    });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') { cleanupServer(); app.quit(); }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on('before-quit', cleanupServer);

function cleanupServer() {
  if (serverProcess) {
    if (process.platform === 'win32') {
      try { spawn('taskkill', ['/pid', serverProcess.pid?.toString() || '', '/f', '/t']); } catch {}
    } else {
      serverProcess.kill('SIGTERM');
    }
    serverProcess = null;
  }
}
