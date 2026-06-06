import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useTheme } from './themes';
import AppContent from './AppContent';
import {
  useAppSettings,
  useLlamaBridge,
  useAgents,
  useSidebar,
  useLuminaTools,
  useComposioTools,
  useInputState,
  useWorkspace,
  useUIState,
  useCoderMode,
  useResearchMode,
  useAskAi,
  useRightPanel,
  useLuminaConvex
} from './hooks';

function StartupSplash({ isVisible }: { isVisible: boolean }) {
  return (
    <div
      aria-hidden={!isVisible}
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background:
          'radial-gradient(circle at top, rgba(125, 211, 252, 0.18), transparent 36%), linear-gradient(180deg, #050816 0%, #09090b 48%, #05070f 100%)',
        opacity: isVisible ? 1 : 0,
        visibility: isVisible ? 'visible' : 'hidden',
        pointerEvents: 'none',
        transition: 'opacity 320ms ease, visibility 320ms ease',
        zIndex: 9999,
      }}
    >
      <div
        style={{
          width: 'min(88vw, 420px)',
          padding: '32px 28px',
          borderRadius: 24,
          border: '1px solid rgba(255,255,255,0.08)',
          background: 'rgba(8, 11, 21, 0.78)',
          boxShadow: '0 24px 80px rgba(0, 0, 0, 0.45)',
          backdropFilter: 'blur(22px)',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: 72,
            height: 72,
            margin: '0 auto 18px',
            borderRadius: 22,
            background:
              'linear-gradient(135deg, rgba(56, 189, 248, 0.95), rgba(14, 165, 233, 0.2))',
            display: 'grid',
            placeItems: 'center',
            boxShadow: '0 10px 30px rgba(14, 165, 233, 0.28)',
          }}
        >
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 14,
              border: '2px solid rgba(255,255,255,0.95)',
              borderTopColor: 'transparent',
              animation: 'lumina-spin 1s linear infinite',
            }}
          />
        </div>

        <div
          style={{
            fontSize: 30,
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: '#f8fafc',
          }}
        >
          Lumina
        </div>

        <div
          style={{
            marginTop: 10,
            fontSize: 14,
            lineHeight: 1.6,
            color: 'rgba(226, 232, 240, 0.76)',
          }}
        >
          Loading your workspace and preparing the app...
        </div>

        <div
          style={{
            marginTop: 24,
            height: 6,
            width: '100%',
            borderRadius: 999,
            background: 'rgba(148, 163, 184, 0.14)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: '42%',
              borderRadius: 'inherit',
              background:
                'linear-gradient(90deg, rgba(56,189,248,0.4), rgba(125,211,252,1), rgba(56,189,248,0.4))',
              animation: 'lumina-loading-bar 1.5s ease-in-out infinite',
            }}
          />
        </div>

        <div
          style={{
            marginTop: 14,
            display: 'flex',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          {[0, 1, 2].map(index => (
            <span
              key={index}
              style={{
                width: 8,
                height: 8,
                borderRadius: 999,
                background: 'rgba(125, 211, 252, 0.95)',
                animation: `lumina-pulse 1.2s ease-in-out ${index * 0.15}s infinite`,
              }}
            />
          ))}
        </div>
      </div>

      <style>{`
        @keyframes lumina-spin {
          to { transform: rotate(360deg); }
        }

        @keyframes lumina-loading-bar {
          0% { transform: translateX(-140%); }
          100% { transform: translateX(320%); }
        }

        @keyframes lumina-pulse {
          0%, 100% { opacity: 0.28; transform: translateY(0); }
          50% { opacity: 1; transform: translateY(-3px); }
        }
      `}</style>
    </div>
  );
}

export default function App() {
  const { isDark: isDarkMode, theme, setTheme } = useTheme();
  const [isBooting, setIsBooting] = useState(true);
  const [showSplash, setShowSplash] = useState(true);

  // Shared declarations referenced across hooks
  const [availableModels, setAvailableModels] = useState<any[]>([]);
  const [selectedModel, setSelectedModel] = useState(() => {
    try {
      return localStorage.getItem('lumina_selected_model') || 'openprovider/auto-free';
    } catch {
      return 'openprovider/auto-free';
    }
  });
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

  const { serverUrl, apiKey, selectedProvider, useLocalModelsOnly } = appSettings;
  const activeModelId = React.useMemo(() => {
    if (useLocalModelsOnly) {
      if (selectedModel && selectedModel.toLowerCase().includes('gguf')) {
        return selectedModel;
      }
      try {
        const downloaded = JSON.parse(localStorage.getItem('lumina_downloaded_models') || '[]');
        if (downloaded.length > 0) return downloaded[0].id;
      } catch {}
      return selectedModel || '';
    }
    return selectedModel || 'openprovider/auto-free';
  }, [selectedModel, useLocalModelsOnly]);

  React.useEffect(() => {
    try {
      localStorage.setItem('lumina_selected_model', selectedModel);
    } catch {}
  }, [selectedModel]);

  // 2. Llama Bridge Hook
  const llamaBridge = useLlamaBridge({
    serverUrl,
    apiKey,
    selectedProvider,
    activeModelId,
    showToast,
    useLocalModelsOnly
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

  // 7b. Composio Tools Hook
  const composioToolsData = useComposioTools();

  // 7c. Lumina Convex Hook (agents, memory, automations, events)
  const luminaConvex = useLuminaConvex();

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

  // 10. Research Mode Hook
  const researchMode = useResearchMode({
    currentChatId,
    chats,
    setChats,
    isSidebarOpen: sidebar.isSidebarOpen,
    setIsSidebarOpen: sidebar.setIsSidebarOpen,
  });

  // 11. Right Panel Hook
  const rightPanel = useRightPanel({
    rightIframeRef: workspace.rightIframeRef,
    iframeKey: workspace.iframeKey,
    rightPreviewSubpath: workspace.rightPreviewSubpath,
    showToast
  });

  const smartPopup = null;
  const devTools = null;

  const sendMessageRef = useRef<((content: string) => void) | undefined>(undefined);

  useEffect(() => {
    const bootTimer = window.setTimeout(() => {
      setIsBooting(false);
    }, 1350);

    return () => window.clearTimeout(bootTimer);
  }, []);

  useEffect(() => {
    if (isBooting) {
      return;
    }

    const fadeTimer = window.setTimeout(() => {
      setShowSplash(false);
    }, 360);

    return () => window.clearTimeout(fadeTimer);
  }, [isBooting]);

  const askAi = useAskAi({
    input: inputState.input,
    messages: currentChatId ? (chats.find(c => c.id === currentChatId)?.messages || []) : [],
    callLlamaBridge: llamaBridge.callLlamaBridge,
    createNewChat: (projId, isCoder, isResearch, agentId) => {
      const id = Date.now().toString();
      const newChat = {
        id,
        title: agentId ? 'New Assistant Chat' : (isResearch ? 'New Deep Research' : (isCoder ? 'New Coder Workspace' : 'New Chat')),
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        projectId: projId || undefined,
        agentId: agentId || undefined,
        isCoderMode: isCoder || undefined,
        isResearchMode: isResearch || undefined,
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
    setInput,
    onSendMessage: (content) => sendMessageRef.current?.(content),
  });

  const sidebarWithModifiedToggle = {
    ...sidebar,
    setIsSidebarOpen: (val: boolean | ((prev: boolean) => boolean)) => {
      if (workspace.isCoderLeftPanelOpen) {
        workspace.setIsCoderLeftPanelOpen(false);
        sidebar.setIsSidebarOpen(true);
        return;
      }
      sidebar.setIsSidebarOpen(val);
    }
  };

  return (
    <>
      <div
        style={{
          opacity: isBooting ? 0 : 1,
          transition: 'opacity 280ms ease',
          minHeight: '100vh',
        }}
      >
        <AppContent
          isDarkMode={isDarkMode}
          theme={theme}
          setTheme={setTheme}
          appSettings={appSettings}
          llamaBridge={llamaBridge}
          agents={agents}
          sidebar={sidebarWithModifiedToggle}
          luminaTools={luminaTools}
          composioTools={composioToolsData}
          inputState={inputState}
          workspace={workspace}
          uiState={{
            ...uiState,
            toasts,
            showToast,
            setToasts
          }}
          coderMode={coderMode}
          researchMode={researchMode}
          askAi={askAi}
          rightPanel={rightPanel}
          smartPopup={smartPopup}
          devTools={devTools}
          availableModels={availableModels}
          setAvailableModels={setAvailableModels}
          selectedModel={selectedModel}
          setSelectedModel={setSelectedModel}
          activeModelId={activeModelId}
          sendMessageRef={sendMessageRef}
          luminaConvex={luminaConvex}
        />
      </div>
      <StartupSplash isVisible={showSplash} />
    </>
  );
}
