import { app, BrowserWindow, nativeTheme, shell, net } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;
let loadingWindow;
let serverReady = false;

function createLoadingWindow() {
  loadingWindow = new BrowserWindow({
    width: 400,
    height: 500,
    center: true,
    frame: false,
    transparent: true,
    backgroundColor: '#0f0f0f',
    resizable: false,
    alwaysOnTop: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  loadingWindow.loadFile(path.join(__dirname, 'loading.html'));
}

function updateLoadingStatus(text, progress, status = '') {
  if (loadingWindow && loadingWindow.webContents) {
    loadingWindow.webContents.send('status', { type: 'status', text, progress, status });
  }
}

async function checkServerReady(retries = 30) {
  const isDev = process.env.NODE_ENV === 'development';
  const url = isDev ? 'http://localhost:5173' : 'http://localhost:5173';

  for (let i = 0; i < retries; i++) {
    try {
      const response = await net.fetch(url, { method: 'GET' });
      if (response.ok) {
        serverReady = true;
        return true;
      }
    } catch (error) {
      updateLoadingStatus(`Waiting for server... (${i + 1}/${retries})`, Math.min(90, (i / retries) * 90));
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  return false;
}

async function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    center: true,
    frame: true,
    titleBarStyle: 'default',
    backgroundColor: '#0f0f0f',
    icon: path.join(__dirname, 'assets/icon.png'),
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableWebSQL: false,
      spellcheck: false,
    },
  });

  const isDev = process.env.NODE_ENV === 'development';

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    if (loadingWindow) {
      loadingWindow.close();
      loadingWindow = null;
    }
    mainWindow.show();
    mainWindow.focus();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.send('theme-changed', nativeTheme.shouldUseDarkColors);
  });
}

app.whenReady().then(async () => {
  if (process.platform === 'win32') {
    app.setAppUserModelId('com.lumina.app');
  }

  createLoadingWindow();
  updateLoadingStatus('Starting server...', 10);

  const lock = app.requestSingleInstanceLock();
  if (!lock) {
    app.quit();
    return;
  }

  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  await checkServerReady();

  if (serverReady) {
    updateLoadingStatus('Server connected!', 95, 'success');
    await createMainWindow();
  } else {
    updateLoadingStatus('Failed to connect to server', 100, 'error');
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  if (loadingWindow) loadingWindow.close();
  if (mainWindow) mainWindow.close();
});