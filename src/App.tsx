import React, { useState, useCallback, useRef } from 'react';
import { useTheme } from './themes';
import AppContent from './AppContent';
import { InspectStandalone } from './components/InspectStandalone';
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
  useResearchMode,
  useAskAi,
  useRightPanel
} from './hooks';

export default function App() {
  const isInspectMode = typeof window !== 'undefined' && window.location.search.includes('inspect=1');
  if (isInspectMode) {
    return <InspectStandalone />;
  }
  const { isDark: isDarkMode, theme, setTheme } = useTheme();

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
    <AppContent
      isDarkMode={isDarkMode}
      theme={theme}
      setTheme={setTheme}
      appSettings={appSettings}
      llamaBridge={llamaBridge}
      agents={agents}
      sidebar={sidebarWithModifiedToggle}
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
    />
  );
}
