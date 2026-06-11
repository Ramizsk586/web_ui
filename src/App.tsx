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
        background: 'var(--splash-bg, #09090b)',
        opacity: isVisible ? 1 : 0,
        visibility: isVisible ? 'visible' : 'hidden',
        pointerEvents: 'none',
        transition: 'opacity 600ms cubic-bezier(0.16, 1, 0.3, 1), visibility 600ms ease',
        zIndex: 9999,
        userSelect: 'none',
      }}
    >
      <style>{`
        @keyframes splash-ring {
          0%   { transform: scale(0.8); opacity: 0; }
          40%  { opacity: 1; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        @keyframes splash-ring-2 {
          0%   { transform: scale(0.8); opacity: 0; }
          40%  { opacity: 0.6; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        @keyframes splash-glow {
          0%, 100% { opacity: 0.5; }
          50%       { opacity: 1; }
        }
        @keyframes splash-logo-in {
          0%   { opacity: 0; transform: translateY(10px) scale(0.97); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes splash-text-in {
          0%   { opacity: 0; transform: translateY(6px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes splash-fade-out {
          0%   { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>

      {/* Ambient background radial */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse 60% 50% at 50% 50%, var(--splash-glow-color, rgba(99,102,241,0.12)) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      {/* Centered content */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 0,
          animation: isVisible ? 'splash-logo-in 600ms cubic-bezier(0.16, 1, 0.3, 1) both' : 'none',
        }}
      >
        {/* Logo mark + ring effect */}
        <div
          style={{
            position: 'relative',
            width: 72,
            height: 72,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Expanding ring 1 */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              border: '1px solid var(--splash-accent, #6366f1)',
              animation: 'splash-ring 2.4s cubic-bezier(0.16, 1, 0.3, 1) infinite',
            }}
          />
          {/* Expanding ring 2 (offset) */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              border: '1px solid var(--splash-accent, #6366f1)',
              opacity: 0.5,
              animation: 'splash-ring-2 2.4s cubic-bezier(0.16, 1, 0.3, 1) 1.2s infinite',
            }}
          />
          {/* Glow halo */}
          <div
            style={{
              position: 'absolute',
              inset: '20%',
              borderRadius: '50%',
              background: 'var(--splash-accent, #6366f1)',
              filter: 'blur(12px)',
              animation: 'splash-glow 2.4s ease-in-out infinite',
            }}
          />
          {/* Logo SVG */}
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ position: 'relative', zIndex: 1 }}
          >
            <path
              d="M12 2L13.5 8.5H20L14.5 12L16 19L12 15L8 19L9.5 12L4 8.5H10.5L12 2Z"
              fill="white"
              fillOpacity="0.95"
            />
          </svg>
        </div>

        {/* Wordmark */}
        <div
          style={{
            marginTop: 24,
            fontSize: 36,
            fontWeight: 600,
            letterSpacing: '-0.02em',
            color: 'var(--splash-text, #f4f4f5)',
            fontFamily: "'Outfit', 'Inter', system-ui, sans-serif",
            animation: 'splash-text-in 500ms cubic-bezier(0.16, 1, 0.3, 1) 200ms both',
          }}
        >
          Lumina
        </div>

        {/* Subtle divider line */}
        <div
          style={{
            marginTop: 12,
            width: 32,
            height: 1,
            background: 'var(--splash-accent, #6366f1)',
            borderRadius: 1,
            animation: 'splash-text-in 400ms cubic-bezier(0.16, 1, 0.3, 1) 380ms both',
          }}
        />

        {/* Tagline */}
        <div
          style={{
            marginTop: 12,
            fontSize: 13,
            fontWeight: 400,
            color: 'var(--splash-muted, rgba(161,161,170,0.7))',
            letterSpacing: '0.04em',
            fontFamily: "'Inter', system-ui, sans-serif",
            animation: 'splash-text-in 400ms cubic-bezier(0.16, 1, 0.3, 1) 480ms both',
          }}
        >
          Preparing your workspace
        </div>

        {/* Subtle loading dots */}
        <div
          style={{
            marginTop: 32,
            display: 'flex',
            gap: 6,
            animation: 'splash-text-in 400ms cubic-bezier(0.16, 1, 0.3, 1) 600ms both',
          }}
        >
          {[0, 1, 2].map(i => (
            <div
              key={i}
              style={{
                width: 5,
                height: 5,
                borderRadius: '50%',
                background: 'var(--splash-accent, #6366f1)',
                animation: `splash-dot 1.4s ease-in-out ${i * 0.2}s infinite`,
              }}
            />
          ))}
        </div>
      </div>

      <style>{`
        @keyframes splash-dot {
          0%, 80%, 100% { transform: scale(0.7); opacity: 0.4; }
          40%            { transform: scale(1);   opacity: 1;   }
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
