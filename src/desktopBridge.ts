type TauriWindowApi = {
  minimize?: () => Promise<void>;
  maximize?: () => Promise<void>;
  unmaximize?: () => Promise<void>;
  toggleMaximize?: () => Promise<void>;
  close?: () => Promise<void>;
  isMaximized?: () => Promise<boolean>;
};

type TauriWebviewApi = {
  setZoom?: (scaleFactor: number) => Promise<void>;
  openDevTools?: () => Promise<void>;
  closeDevTools?: () => Promise<void>;
};

type TauriDialogApi = {
  open?: (options: { directory?: boolean; multiple?: boolean; title?: string }) => Promise<string | string[] | null>;
  message?: (message: string, options?: { title?: string; kind?: 'info' | 'warning' | 'error' }) => Promise<void>;
};

type TauriGlobal = {
  window?: {
    getCurrentWindow?: () => TauriWindowApi;
  };
  webview?: {
    getCurrentWebview?: () => TauriWebviewApi;
  };
  webviewWindow?: {
    getCurrentWebviewWindow?: () => TauriWindowApi & TauriWebviewApi;
  };
  dialog?: TauriDialogApi;
};

let currentZoom = 1;

declare global {
  interface Window {
    __TAURI__?: TauriGlobal;
  }
}

function getTauriGlobal(): TauriGlobal | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }

  return window.__TAURI__;
}

function getWindowApi(): TauriWindowApi | null {
  const tauri = getTauriGlobal();
  return (
    tauri?.window?.getCurrentWindow?.() ??
    tauri?.webviewWindow?.getCurrentWebviewWindow?.() ??
    null
  );
}

function getWebviewApi(): TauriWebviewApi | null {
  const tauri = getTauriGlobal();
  return (
    tauri?.webview?.getCurrentWebview?.() ??
    tauri?.webviewWindow?.getCurrentWebviewWindow?.() ??
    null
  );
}

export function isDesktopShell(): boolean {
  return typeof window !== 'undefined' && !!getTauriGlobal();
}

export async function minimizeWindow(): Promise<void> {
  await getWindowApi()?.minimize?.();
}

export async function toggleMaximizeWindow(): Promise<void> {
  const windowApi = getWindowApi();

  if (windowApi?.toggleMaximize) {
    await windowApi.toggleMaximize();
    return;
  }

  if (windowApi?.maximize) {
    await windowApi.maximize();
  }
}

export async function closeWindow(): Promise<void> {
  await getWindowApi()?.close?.();
}

export async function isWindowMaximized(): Promise<boolean> {
  return (await getWindowApi()?.isMaximized?.()) ?? false;
}

export async function toggleDevTools(): Promise<void> {
  const webviewApi = getWebviewApi();

  if (webviewApi?.openDevTools) {
    await webviewApi.openDevTools();
    return;
  }

  if (webviewApi?.closeDevTools) {
    await webviewApi.closeDevTools();
  }
}

export async function setWindowZoom(scaleFactor: number): Promise<void> {
  const zoom = Math.max(0.3, Math.min(3, scaleFactor));
  currentZoom = zoom;
  await getWebviewApi()?.setZoom?.(zoom);
}

export async function zoomInWindow(): Promise<void> {
  await setWindowZoom(currentZoom + 0.1);
}

export async function zoomOutWindow(): Promise<void> {
  await setWindowZoom(currentZoom - 0.1);
}

export async function resetWindowZoom(): Promise<void> {
  await setWindowZoom(1);
}

export async function openFolderDialog(): Promise<string | null> {
  const dialogApi = getTauriGlobal()?.dialog;

  if (!dialogApi?.open) {
    return null;
  }

  const result = await dialogApi.open({
    directory: true,
    multiple: false,
    title: 'Open Folder',
  });

  if (typeof result === 'string') {
    return result;
  }

  if (Array.isArray(result)) {
    return result[0] ?? null;
  }

  return null;
}

export async function showNativeAlert(message: string, title = 'Lumina Coder'): Promise<void> {
  const dialogApi = getTauriGlobal()?.dialog;

  if (dialogApi?.message) {
    await dialogApi.message(message, { title, kind: 'info' });
    return;
  }

  window.alert(message);
}

export async function promptText(message: string, defaultValue = ''): Promise<string | null> {
  return window.prompt(message, defaultValue);
}
