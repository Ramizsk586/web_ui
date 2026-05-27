import { app, BrowserWindow, Menu, ipcMain, shell } from 'electron';
import path from 'path';
import fs from 'fs';
import { spawn, type ChildProcessWithoutNullStreams } from 'child_process';
import http from 'http';

let mainWindow: BrowserWindow | null = null;
let serverProcess: ChildProcessWithoutNullStreams | null = null;

const isDev = !app.isPackaged;
const SERVER_PORT = parseInt(process.env.PORT || '3000', 10);
const APP_STATE_FILE = 'lumina-state.json';

function getStateFilePath() {
  return path.join(app.getPath('userData'), APP_STATE_FILE);
}

function readAppState() {
  try {
    const filePath = getStateFilePath();
    if (!fs.existsSync(filePath)) return {};
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (error) {
    console.error('Failed to read app state:', error);
    return {};
  }
}

function writeAppState(nextState: Record<string, any>) {
  try {
    const filePath = getStateFilePath();
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(nextState, null, 2), 'utf-8');
  } catch (error) {
    console.error('Failed to write app state:', error);
  }
}

function waitForServer(url: string, timeout = 60000): Promise<void> {
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

  if (isDev) {
    return waitForServer(url, 60000).then(() => url);
  }

  return new Promise((resolve, reject) => {
    const serverPath = path.join(process.resourcesPath, 'dist', 'server.cjs');
    console.log('Starting server from:', serverPath);

    if (!fs.existsSync(serverPath)) {
      const altPath = path.join(__dirname, 'dist', 'server.cjs');
      console.log('Primary path not found, trying:', altPath);
      if (!fs.existsSync(altPath)) {
        const err = `Server file not found`;
        console.error(err);
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
    serverProcess = spawn(serverCommand, [actualServerPath], { env, stdio: ['pipe', 'pipe', 'pipe'] });

    let resolved = false;
    const onData = (text: string) => {
      if (!resolved && (
        text.toLowerCase().includes('listening') ||
        text.toLowerCase().includes('server running') ||
        text.toLowerCase().includes(`localhost:${SERVER_PORT}`)
      )) {
        resolved = true;
        resolve(url);
      }
    };

    serverProcess.stdout?.on('data', (data: Buffer) => onData(data.toString()));
    serverProcess.stderr?.on('data', (data: Buffer) => onData(data.toString()));
    serverProcess.on('error', (err) => { if (!resolved) { resolved = true; reject(err); } });
    serverProcess.on('exit', (code) => {
      if (code !== 0 && code !== null && !resolved) {
        resolved = true;
        reject(new Error(`Server exited with code ${code}`));
      }
    });

    setTimeout(() => {
      if (!resolved) { resolved = true; resolve(url); }
    }, 15000);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 750,
    height: 500,
    minWidth: 500,
    minHeight: 375,
    title: 'Lumina AI Chat',
    backgroundColor: '#09090b',
    frame: false,
    show: false,
    icon: isDev
      ? path.join(__dirname, '..', 'assets', 'sparkles.png')
      : path.join(process.resourcesPath, 'assets', 'sparkles.png'),
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
    if (mainWindow?.isMaximized()) mainWindow.unmaximize();
    else mainWindow?.maximize();
  });
  ipcMain.on('window:close', () => mainWindow?.close());
  ipcMain.handle('window:isMaximized', () => mainWindow?.isMaximized());
  ipcMain.on('toggle:devtools', () => mainWindow?.webContents.toggleDevTools());

  let promptWindow: BrowserWindow | null = null;

  ipcMain.handle('dialog:prompt', async (_event, message: string, defaultValue: string) => {
    return new Promise((resolve) => {
      promptWindow = new BrowserWindow({
        width: 480, height: 200,
        resizable: false, frame: false, transparent: true,
        skipTaskbar: true, parent: mainWindow!, modal: true, show: false,
        webPreferences: { preload: path.join(__dirname, 'preload.cjs') },
      });

      const promptHTML = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta http-equiv="Content-Security-Policy" content="default-src 'self'; style-src 'unsafe-inline'; script-src 'self' 'unsafe-inline'; img-src 'self' data:; object-src 'none'; base-uri 'none'; form-action 'none';"><style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#1a1a1a;color:#f0f0f0;padding:20px;border-radius:12px;border:1px solid #333;overflow:hidden;height:100vh;display:flex;flex-direction:column}
h3{font-size:13px;font-weight:600;margin-bottom:4px;color:#ccc}
p{font-size:11px;color:#666;margin-bottom:14px;word-break:break-word}
input{width:100%;padding:8px 10px;background:#0d0d0d;border:1px solid #333;border-radius:6px;color:#fff;font-size:13px;outline:none;margin-bottom:12px}
input:focus{border-color:#6366f1}
.buttons{display:flex;gap:8px;justify-content:flex-end}
button{padding:6px 14px;border-radius:6px;font-size:12px;cursor:pointer;border:none}
.btn-ok{background:#6366f1;color:#fff}.btn-ok:hover{background:#7c7cf7}
.btn-cancel{background:#2a2a2a;color:#aaa}.btn-cancel:hover{background:#333;color:#fff}
</style></head><body>
<h3>${message}</h3><p>Enter the value below:</p>
<input type="text" id="input" value="${defaultValue.replace(/"/g,'"')}" placeholder="Enter value..." />
<div class="buttons">
<button class="btn-cancel" onclick="cancel()">Cancel</button>
<button class="btn-ok" onclick="submit()">OK</button></div>
<script>
const input=document.getElementById('input');input.focus();input.select();
function submit(){if(window.__electronAPI&&window.__electronAPI.closePrompt)window.__electronAPI.closePrompt(input.value);}
function cancel(){if(window.__electronAPI&&window.__electronAPI.closePrompt)window.__electronAPI.closePrompt(null);}
input.addEventListener('keydown',function(e){if(e.key==='Enter')submit();if(e.key==='Escape')cancel();});
</script></body></html>`;

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
        if (promptWindow) { ipcMain.removeHandler('prompt:response'); promptWindow = null; resolve(null); }
      });
      promptWindow.loadFile(promptFile);
    });
  });

  ipcMain.handle('dialog:alert', async (_event, message: string) => {
    const { dialog } = require('electron');
    await dialog.showMessageBox(mainWindow!, {
      type: 'info', buttons: ['OK'], title: 'Lumina AI Chat', message,
    });
  });

  ipcMain.handle('dialog:openFolder', async () => {
    const { dialog } = require('electron');
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openDirectory'], title: 'Open Folder',
    });
    if (result.canceled || !result.filePaths || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });

  ipcMain.handle('zoom:get', () => mainWindow ? mainWindow.webContents.getZoomFactor() : 1.0);
  ipcMain.handle('zoom:set', (_event, factor: number) => {
    mainWindow?.webContents.setZoomFactor(Math.max(0.3, Math.min(3.0, factor)));
  });
  ipcMain.handle('zoom:in', () => {
    if (mainWindow) mainWindow.webContents.setZoomFactor(Math.min(3.0, mainWindow.webContents.getZoomFactor() + 0.1));
  });
  ipcMain.handle('zoom:out', () => {
    if (mainWindow) mainWindow.webContents.setZoomFactor(Math.max(0.3, mainWindow.webContents.getZoomFactor() - 0.1));
  });
  ipcMain.handle('zoom:reset', () => mainWindow?.webContents.setZoomFactor(1.0));
  ipcMain.handle('storage:getState', () => readAppState());
  ipcMain.handle('storage:setState', (_event, nextState: Record<string, any>) => {
    writeAppState(nextState);
    return true;
  });

  ipcMain.on('show-context-menu', () => {
    if (!mainWindow) return;
    const template: Electron.MenuItemConstructorOptions[] = [
      { label: 'Zoom In', accelerator: 'CmdOrCtrl+=', click: () => mainWindow!.webContents.setZoomFactor(Math.min(3.0, mainWindow!.webContents.getZoomFactor() + 0.1)) },
      { label: 'Zoom Out', accelerator: 'CmdOrCtrl+-', click: () => mainWindow!.webContents.setZoomFactor(Math.max(0.3, mainWindow!.webContents.getZoomFactor() - 0.1)) },
      { type: 'separator' }, { role: 'copy' }, { role: 'paste' }, { type: 'separator' },
      { label: 'Inspect', accelerator: 'F12', click: () => mainWindow?.webContents.toggleDevTools() },
    ];
    Menu.buildFromTemplate(template).popup({ window: mainWindow });
  });

  mainWindow.on('maximize', () => mainWindow?.webContents.send('window:maximized', true));
  mainWindow.on('unmaximize', () => mainWindow?.webContents.send('window:maximized', false));
  mainWindow.on('enter-full-screen', () => mainWindow?.webContents.send('window:fullscreen', true));
  mainWindow.on('leave-full-screen', () => mainWindow?.webContents.send('window:fullscreen', false));
  mainWindow.on('closed', () => { mainWindow = null; });

  // Show a simple dark background while waiting for the server
  const loadingHTML = `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta http-equiv="Content-Security-Policy" content="default-src 'self'; style-src 'unsafe-inline'; script-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none';"><style>body{background:#09090b;margin:0;overflow:hidden;display:flex;align-items:center;justify-content:center;height:100vh;color:rgba(255,255,255,0.3);font-family:sans-serif;font-size:14px;}</style></head><body><div>Loading Lumina AI Chat...</div></body></html>`;
  const loadingDir = isDev ? path.join(__dirname, '..', 'dist-electron') : path.join(process.resourcesPath, 'dist-electron');
  if (!fs.existsSync(loadingDir)) fs.mkdirSync(loadingDir, { recursive: true });
  const loadingFile = path.join(loadingDir, 'loading-wait.html');
  fs.writeFileSync(loadingFile, loadingHTML, 'utf-8');
  mainWindow.loadFile(loadingFile);

  const url = `http://localhost:${SERVER_PORT}`;
  
  startServerProcess()
    .then(async () => {
      mainWindow?.loadURL(url);
      // Auto-open DevTools window separately after loading completes
      if (isDev) {
        mainWindow?.webContents.on('did-finish-load', () => {
          mainWindow?.webContents.openDevTools({ mode: 'detach' });
        });
      }
    })
    .catch((err) => {
      console.error('Failed to start server:', err);
      setTimeout(() => { mainWindow?.loadURL(url); }, 2000);
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
