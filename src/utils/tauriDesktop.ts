type TauriEventUnlisten = () => void;

type TauriWindowApi = {
  minimize?: () => Promise<void>;
  maximize?: () => Promise<void>;
  unmaximize?: () => Promise<void>;
  close?: () => Promise<void>;
  isMaximized?: () => Promise<boolean>;
};

declare global {
  interface Window {
    __TAURI__?: {
      core?: {
        invoke?: <T = unknown>(cmd: string, args?: Record<string, unknown>) => Promise<T>;
      };
      event?: {
        listen?: <T = unknown>(
          event: string,
          handler: (payload: { payload: T }) => void
        ) => Promise<TauriEventUnlisten>;
      };
      window?: {
        getCurrentWindow?: () => TauriWindowApi;
      };
    };
    __TAURI_INTERNALS__?: {
      invoke?: <T = unknown>(cmd: string, args?: Record<string, unknown>) => Promise<T>;
    };
  }
}

const getInvoke = () =>
  window.__TAURI__?.core?.invoke || window.__TAURI_INTERNALS__?.invoke || null;

export const isTauriDesktop = () =>
  typeof window !== 'undefined' && Boolean(getInvoke());

export const invokeTauri = async <T = unknown>(
  command: string,
  args?: Record<string, unknown>
): Promise<T> => {
  const invoke = getInvoke();
  if (!invoke) {
    throw new Error('Tauri desktop bridge is unavailable.');
  }
  return invoke<T>(command, args);
};

export const listenTauriEvent = async <T = unknown>(
  eventName: string,
  handler: (payload: T) => void
): Promise<TauriEventUnlisten> => {
  const listen = window.__TAURI__?.event?.listen;
  if (!listen) {
    return () => {};
  }
  return listen<T>(eventName, (event) => handler(event.payload));
};

export const getCurrentTauriWindow = (): TauriWindowApi | null => {
  return window.__TAURI__?.window?.getCurrentWindow?.() || null;
};

export const safeConfirm = (message: string): boolean => {
  if (typeof window !== 'undefined' && window.confirm) {
    return window.confirm(message);
  }
  return true;
};
