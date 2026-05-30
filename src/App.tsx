import React, { useState, useCallback, useEffect } from 'react';
import { useTheme } from './themes';
import AppContent from './AppContent';
import {
  useAppSettings,
  useLlamaBridge,
  useAgents,
  useSidebar,
  useLuminaTools,
  useInputState,
  useWorkspace,
  useUIState,
  useCoderMode,
  useAskAi,
  useRightPanel
} from './hooks';

function StartupGate({ onReady }: { onReady: () => void }) {
  const [status, setStatus] = useState<'checking' | 'retrying' | 'error'>('checking');
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;

    const checkHealth = async (attemptNo = 0) => {
      try {
        const response = await fetch('/api/health', { cache: 'no-store' });
        if (!response.ok) {
          throw new Error(`Health check failed: ${response.status}`);
        }
        if (!cancelled) {
          onReady();
        }
      } catch {
        if (cancelled) {
          return;
        }

        const nextAttempt = attemptNo + 1;
        setAttempts(nextAttempt);
        setStatus(prev => (prev === 'checking' ? 'retrying' : prev));
        timer = window.setTimeout(() => {
          void checkHealth(nextAttempt);
        }, nextAttempt > 15 ? 3000 : 1000);

        if (nextAttempt > 20) {
          setStatus('error');
        }
      }
    };

    void checkHealth();

    return () => {
      cancelled = true;
      if (timer) {
        window.clearTimeout(timer);
      }
    };
  }, [onReady]);

  return (
    <div className="min-h-screen w-full bg-[#09090b] text-[#E7E0D4] flex items-center justify-center px-6">
      <div className="relative w-full max-w-lg rounded-[28px] border border-white/10 bg-white/5 shadow-2xl overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(217,118,86,0.16),transparent_55%),radial-gradient(circle_at_bottom_right,rgba(96,165,250,0.10),transparent_40%)]" />
        <div className="relative p-8 md:p-10">
          <div className="mb-6">
            <div className="text-[11px] uppercase tracking-[0.45em] text-[#BCA996]">Lumina AI Chat</div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">Starting local services</h1>
            <p className="mt-3 text-sm leading-6 text-[#B9AFA1]">
              {status === 'error'
                ? 'The desktop shell is open, but the local backend has not responded yet.'
                : 'Waiting for the Express backend to finish booting before the app renders.'}
            </p>
          </div>

          <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
            <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-[#D97756] via-[#F2B880] to-[#60A5FA] animate-pulse" />
          </div>

          <div className="mt-6 flex items-center justify-between text-xs uppercase tracking-[0.32em] text-[#91867A]">
            <span>{status === 'error' ? 'Retrying backend connection' : 'Health check running'}</span>
            <span>{attempts > 0 ? `Attempt ${attempts}` : 'Booting'}</span>
          </div>

          {status === 'error' && (
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-8 inline-flex items-center rounded-full bg-[#D97756] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#c96644]"
            >
              Retry now
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function AppReady() {
  const { isDark: isDarkMode, theme, setTheme } = useTheme();

  // Shared declarations referenced across hooks
  const [availableModels, setAvailableModels] = useState<any[]>([]);
  const [selectedModel, setSelectedModel] = useState('openprovider/auto-free');
  const [toasts, setToasts] = useState<{ id: string; message: string }[]>([]);

  const showToast = useCallback((message: string) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  // 1. App Settings Hook
  const appSettings = useAppSettings({
    setAvailableModels,
    setSelectedModel,
    showToast
  });

  const { serverUrl, apiKey, selectedProvider } = appSettings;
  const activeModelId = selectedProvider === 'openprovider' ? 'openprovider/auto-free' : selectedModel;

  // 2. Llama Bridge Hook
  const llamaBridge = useLlamaBridge({
    serverUrl,
    apiKey,
    selectedProvider,
    activeModelId,
    showToast
  });

  // 3. Input State Hook
  const inputState = useInputState();
  const { setInput } = inputState;

  // 4. UI State Hook
  const uiState = useUIState({
    setInput,
  });

  const { chats, setChats, currentChatId, setCurrentChatId } = uiState;

  // 5. Agents Hook
  const agents = useAgents({
    setCurrentChatId
  });

  // 6. Sidebar Hook
  const sidebar = useSidebar();

  // 7. Lumina Tools Hook
  const luminaTools = useLuminaTools();

  // 8. Workspace Hook
  const workspace = useWorkspace({
    isCoderMode: false,
    showToast
  });

  // 9. Coder Mode Hook
  const coderMode = useCoderMode({
    currentChatId,
    chats,
    setChats,
    isSidebarOpen: sidebar.isSidebarOpen,
    setIsSidebarOpen: sidebar.setIsSidebarOpen,
    handleStartBuilding: (chatId, messageId, todos) => {
      if ((window as any).triggerStartBuilding) {
        (window as any).triggerStartBuilding(chatId, messageId, todos);
      }
    },
    isTyping: inputState.isTyping
  });

  // 10. Ask AI Hook
  const askAi = useAskAi({
    input: inputState.input,
    messages: currentChatId ? (chats.find(c => c.id === currentChatId)?.messages || []) : [],
    callLlamaBridge: llamaBridge.callLlamaBridge,
    createNewChat: (projId, isCoder) => {
      const id = Date.now().toString();
      const newChat = {
        id,
        title: 'New Chat',
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        projectId: projId || undefined,
        isCoderMode: isCoder || undefined,
      };
      setChats(prev => [newChat, ...prev]);
      setCurrentChatId(id);
      return id;
    },
    currentChatId,
    isCoderMode: coderMode.isCoderMode,
    handleStartBuilding: (chatId, messageId, todos) => {
      if ((window as any).triggerStartBuilding) {
        (window as any).triggerStartBuilding(chatId, messageId, todos);
      }
    },
    showToast,
    setChats,
    setInput
  });

  // 11. Right Panel Hook
  const rightPanel = useRightPanel({
    rightIframeRef: workspace.rightIframeRef,
    iframeKey: workspace.iframeKey,
    rightPreviewSubpath: workspace.rightPreviewSubpath,
    showToast,
    setFloatingEditFile: workspace.setFloatingEditFile
  });

  const smartPopup = null;
  const devTools = null;

  return (
    <AppContent
      isDarkMode={isDarkMode}
      theme={theme}
      setTheme={setTheme}
      appSettings={appSettings}
      llamaBridge={llamaBridge}
      agents={agents}
      sidebar={sidebar}
      luminaTools={luminaTools}
      inputState={inputState}
      workspace={workspace}
      uiState={{
        ...uiState,
        toasts,
        showToast,
        setToasts
      }}
      coderMode={coderMode}
      askAi={askAi}
      rightPanel={rightPanel}
      smartPopup={smartPopup}
      devTools={devTools}
      availableModels={availableModels}
      setAvailableModels={setAvailableModels}
      selectedModel={selectedModel}
      setSelectedModel={setSelectedModel}
      activeModelId={activeModelId}
    />
  );
}

export default function App() {
  const [isBackendReady, setIsBackendReady] = useState(false);

  if (!isBackendReady) {
    return <StartupGate onReady={() => setIsBackendReady(true)} />;
  }

  return <AppReady />;
}
