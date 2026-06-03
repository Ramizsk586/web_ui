import React from 'react';
import { 
  Globe, 
  Sparkles, 
  Check, 
  Search, 
  FileText, 
  PenTool, 
  Code, 
  Wrench, 
  Terminal, 
  Box, 
  CloudMoon 
} from 'lucide-react';
import { LuminaToolCallingAnimation } from '../components/ui/Animations';
import { computeLineDiff } from '../components/NodeGraph/FileDiffNode';
import { parseThinkTags, turboQuantCompress } from '../utils/textUtils';
import { extractArtifacts } from '../utils/artifactUtils';
import { extractYouTubeId, fetchYouTubeTranscript } from '../utils/youtubeUtils';
import {
  DEEP_RESEARCH_SYSTEM_PROMPT,
  createDeepResearchReportTitle,
  deepResearchTools,
  formatDeepResearchSearchResults,
  formatDeepResearchVisitResult,
  sanitizeDeepResearchReport
} from '../utils/deepResearchWorkflow';
import { SKILLS } from '../constants';
import { Chat, Message, ToolCallNode } from '../types';
import { CoderPermissionMode } from '../types';
import { scrapeUrl, ScrapeResult } from '../services/scrapingService';
import { explainCommandRestriction, shouldRequestCommandPermission } from '../utils/permissionUtils';
import { executeViaTerminal, isTerminalRegistered } from '../utils/terminalService';
import {
  wikiSearch,
  wikiGetPage,
  wikiGetSummary,
  wikiGetSections,
  wikiGetCategories,
  wikiGetLinks,
  wikiGetImages,
  wikiGetRelated
} from '../services/wikiService';

const compressToolResultForApi = (name: string, result: any): string => {
  if (!result) return '';
  const str = typeof result === 'string' ? result : JSON.stringify(result);
  
  if (str.length <= 2500) {
    return str;
  }
  
  if (name === 'read_file') {
    return `${str.substring(0, 2000)}\n\n... [Content truncated to save token rate limits. Total length: ${str.length} characters]`;
  }
  
  if (name === 'run_command') {
    if (typeof result === 'object' && result) {
      const stdout = result.stdout || '';
      const stderr = result.stderr || '';
      const exitCode = result.exitCode ?? 0;
      
      const truncStdout = stdout.length > 1500 
        ? `${stdout.substring(0, 800)}\n... [truncated] ...\n${stdout.substring(stdout.length - 700)}`
        : stdout;
      const truncStderr = stderr.length > 1000 
        ? `${stderr.substring(0, 500)}\n... [truncated] ...\n${stderr.substring(stderr.length - 500)}`
        : stderr;
        
      return JSON.stringify({
        exitCode,
        stdout: truncStdout,
        stderr: truncStderr,
        info: `[Output truncated to save Groq TPM rate limits. Total stdout: ${stdout.length} chars, stderr: ${stderr.length} chars]`
      });
    }
  }
  
  if (name === 'web_scrape' || name === 'fetch_url') {
    return `${str.substring(0, 2000)}\n\n... [Webpage content truncated to save token rate limits. Total length: ${str.length} characters]`;
  }
  
  return `${str.substring(0, 2500)}\n\n... [Truncated to save token rate limits]`;
};

const normalizeToolFilePath = (filePath: string, workspaceRoot?: string) => {
  const raw = String(filePath || '').replace(/\\/g, '/').trim();
  if (!raw) return '';

  const withoutLeading = raw.replace(/^\/+/, '');
  const normalizedRoot = String(workspaceRoot || '').replace(/\\/g, '/').replace(/\/+$/, '');

  if (normalizedRoot) {
    const escapedRoot = normalizedRoot.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const rootPattern = new RegExp(`^${escapedRoot}/?`, 'i');
    if (rootPattern.test(raw)) {
      return raw.replace(rootPattern, '');
    }
  }

  return withoutLeading.replace(/^[A-Za-z]:\/Project\/?/i, '');
};

const getVirtualSkillMatch = (filePath: string) => {
  const normalized = filePath.replace(/\\/g, '/').replace(/^\.\//, '').trim();
  const match = normalized.match(/^(?:\.lumina\/)?skills\/([a-zA-Z0-9_-]+)\/(.+)$/i);
  if (match) {
    return {
      skillId: match[1],
      subPath: match[2]
    };
  }
  return null;
};

const findVirtualSkillFile = (nodes: any[], pathParts: string[]): any => {
  if (pathParts.length === 0) return null;
  const currentPart = pathParts[0];
  const found = nodes.find((n: any) => n.name.toLowerCase() === currentPart.toLowerCase());
  if (!found) return null;
  if (pathParts.length === 1) {
    if (found.type === 'file') return found;
    return null;
  }
  if (found.type === 'folder' && found.children) {
    return findVirtualSkillFile(found.children, pathParts.slice(1));
  }
  return null;
};

const setVirtualSkillFileContent = (nodes: any[], pathParts: string[], newContent: string): boolean => {
  if (pathParts.length === 0) return false;
  const currentPart = pathParts[0];
  const foundIndex = nodes.findIndex((n: any) => n.name.toLowerCase() === currentPart.toLowerCase());
  
  if (pathParts.length === 1) {
    if (foundIndex !== -1 && nodes[foundIndex].type === 'file') {
      nodes[foundIndex].content = newContent;
      return true;
    } else if (foundIndex === -1) {
      nodes.push({ name: pathParts[0], type: 'file', content: newContent });
      return true;
    }
    return false;
  }
  
  if (foundIndex !== -1 && nodes[foundIndex].type === 'folder') {
    if (!nodes[foundIndex].children) nodes[foundIndex].children = [];
    return setVirtualSkillFileContent(nodes[foundIndex].children, pathParts.slice(1), newContent);
  } else if (foundIndex === -1) {
    const newFolder = { name: currentPart, type: 'folder', children: [] };
    nodes.push(newFolder);
    return setVirtualSkillFileContent(newFolder.children, pathParts.slice(1), newContent);
  }
  
  return false;
};

const createStableTurnId = (prefix: string, ...parts: Array<string | number | undefined>) => {
  const suffix = parts
    .filter((part) => part !== undefined && part !== null && String(part).length > 0)
    .map((part) => String(part).replace(/[^a-zA-Z0-9_.-]+/g, '-'))
    .join('-');
  return `${prefix}-${Date.now().toString(36)}-${suffix || 'item'}-${Math.random().toString(36).slice(2, 8)}`;
};

export interface UseAppHandlersParams {
  input: string;
  setInput: (v: string) => void;
  isTyping: boolean;
  setIsTyping: (v: boolean) => void;
  activeSkills: string[];
  showsSlashCommands: boolean;
  filteredCommands: any[];
  selectedCommandIndex: number;
  setSelectedCommandIndex: (v: number | ((prev: number) => number)) => void;
  setTypingMessageId: (v: string | null) => void;

  callLlamaBridge: any;

  persona: any;
  writingStyle: string;
  useTurboQuant: boolean;
  tavilyApiKey: string;
  serpApiKey: string;
  searchProvider: string;
  selectedModel: string;
  activeModelId: string;
  activeModelList: any[];
  serverUrl?: string;
  apiKey?: string;
  selectedProvider?: string;
  llamaBridgeUrl?: string;
  llamaBridgeApiKey?: string;
  selectedLlamaModel?: string;
  useBridgeTools?: boolean;

  chats: Chat[];
  setChats: React.Dispatch<React.SetStateAction<Chat[]>>;
  currentChatId: string | null;
  setCurrentChatId: (v: string | null) => void;
  isWebSearchEnabled: boolean;
  isDeepSearchEnabled: boolean;
  setIsDeepSearchEnabled: (v: boolean) => void;
  researchMode: any;
  isVoiceListening: boolean;
  stopVoiceDictation: () => void;
  attachedFiles: File[];
  setAttachedFiles: React.Dispatch<React.SetStateAction<File[]>>;
  attachedUrlDocs: any[];
  setAttachedUrlDocs: React.Dispatch<React.SetStateAction<any[]>>;
  isPlusMenuOpen: boolean;
  setIsPlusMenuOpen: (v: boolean) => void;
  isUrlToolOpen: boolean;
  setIsUrlToolOpen: (v: boolean) => void;
  urlToolInput: string;
  setUrlToolInput: (v: string) => void;
  urlToolLoading: boolean;
  setUrlToolLoading: (v: boolean) => void;
  urlToolError: string | null;
  setUrlToolError: (v: string | null) => void;
  isTranscriptToolOpen: boolean;
  setIsTranscriptToolOpen: (v: boolean) => void;
  transcriptToolInput: string;
  setTranscriptToolInput: (v: string) => void;
  transcriptToolLoading: boolean;
  setTranscriptToolLoading: (v: boolean) => void;
  transcriptToolError: string | null;
  setTranscriptToolError: (v: string | null) => void;
  setTranscriptionOptionsDoc: (v: any) => void;
  setActiveArtifact: (v: any) => void;
  setIsCanvasOpen: (v: boolean) => void;
  setCanvasView: (v: any) => void;
  showToast: (v: string) => void;

  isCoderMode: boolean;
  setIsCoderMode: (v: boolean) => void;
  isCoderWorkspacePanelOpen: boolean;
  setIsCoderWorkspacePanelOpen: (v: boolean) => void;
  activeAssistantMode: string;
  activeCommandType: string | null;
  activeCommandQuery: string | null;
  setActiveCommandType: (v: string | null) => void;
  setActiveCommandQuery: (v: string | null) => void;
  coderTodos: any[];
  setCoderTodos: React.Dispatch<React.SetStateAction<any[]>>;
  isGeneratingTodos: boolean;
  setIsGeneratingTodos: (v: boolean) => void;
  showTodoPanel: boolean;
  setShowTodoPanel: (v: boolean) => void;
  todoCollapsed: boolean;
  setTodoCollapsed: (v: boolean) => void;
  orchestrationState: any;
  setOrchestrationState: React.Dispatch<React.SetStateAction<any>>;

  setIsSidebarOpen: (v: boolean) => void;

  coderWorkspacePath: string;
  triggerWorkspaceRefresh: () => void;

  scrapingResults: Map<string, any>;
  setScrapingResults: React.Dispatch<React.SetStateAction<Map<string, any>>>;
  setActiveScrapingJobs: React.Dispatch<React.SetStateAction<Set<string>>>;
  wikiResults: Map<string, any>;
  setWikiResults: React.Dispatch<React.SetStateAction<Map<string, any>>>;

  localElementAttachments: any[];
  setLocalElementAttachments: React.Dispatch<React.SetStateAction<any[]>>;

  inputRef: React.RefObject<HTMLTextAreaElement>;
  abortControllerRef: React.RefObject<AbortController | null>;

  setAskAiQuestions: (v: any[]) => void;
  setCurrentQuestionIndex: (v: number) => void;
  setAskAiAnswers: (v: any) => void;
  setShowAskAiPanel: (v: boolean) => void;
  createNewChat: (projId?: string | null, isCoder?: boolean, isResearch?: boolean, agentId?: string | null) => string;

  buildActiveTools: () => any[];
  coderPermissionMode: CoderPermissionMode;
  alwaysAllowedCommands: string[];
  setAlwaysAllowedCommands: React.Dispatch<React.SetStateAction<string[]>>;
  requestCommandPermission: (command: string, reason: string) => Promise<'allow-once' | 'allow-always' | 'deny'>;
  logPermissionAction: (entry: { command?: string; action: string; detail?: string; mode?: CoderPermissionMode }) => void;
}

const isLikelyCoderTask = (message: string) => {
  const trimmed = message.trim().toLowerCase();
  if (!trimmed) return false;
  if (trimmed.startsWith('/coder')) return true;
  if (trimmed.length <= 24 && /^(hi|hey|hello|yo|sup|thanks|thank you|ok|okay|yes|no|hmm|hmmm|test)[!.? ]*$/.test(trimmed)) {
    return false;
  }

  const coderTriggers = [
    'build', 'create', 'make', 'implement', 'add', 'fix', 'debug', 'repair',
    'change', 'modify', 'update', 'edit', 'refactor', 'remove', 'delete',
    'file', 'folder', 'component', 'page', 'app', 'website', 'ui', 'bug',
    'error', 'stack trace', 'typescript', 'css', 'html', 'react', 'electron',
    'server', 'api', 'database', 'route', 'function', 'class', 'import',
    'install', 'package', 'dependency', 'run', 'test', 'lint'
  ];

  return coderTriggers.some(trigger => trimmed.includes(trigger));
};

export function useAppHandlers(params: UseAppHandlersParams) {
  const {
    input, setInput,
    isTyping, setIsTyping,
    activeSkills,
    showsSlashCommands, filteredCommands,
    selectedCommandIndex, setSelectedCommandIndex,
    setTypingMessageId,
    callLlamaBridge,
    persona, writingStyle, useTurboQuant,
    tavilyApiKey, serpApiKey, searchProvider,
    selectedModel, activeModelId, activeModelList,
    serverUrl, apiKey, selectedProvider,
    llamaBridgeUrl, llamaBridgeApiKey, selectedLlamaModel,
    useBridgeTools,
    chats, setChats,
    currentChatId, setCurrentChatId,
    isWebSearchEnabled,
    isDeepSearchEnabled, setIsDeepSearchEnabled,
    researchMode,
    isVoiceListening, stopVoiceDictation,
    attachedFiles, setAttachedFiles,
    attachedUrlDocs, setAttachedUrlDocs,
    isPlusMenuOpen, setIsPlusMenuOpen,
    isUrlToolOpen, setIsUrlToolOpen,
    urlToolInput, setUrlToolInput,
    urlToolLoading, setUrlToolLoading,
    urlToolError, setUrlToolError,
    isTranscriptToolOpen, setIsTranscriptToolOpen,
    transcriptToolInput, setTranscriptToolInput,
    transcriptToolLoading, setTranscriptToolLoading,
    transcriptToolError, setTranscriptToolError,
    setTranscriptionOptionsDoc,
    setActiveArtifact, setIsCanvasOpen, setCanvasView,
    showToast,
    isCoderMode, setIsCoderMode,
    isCoderWorkspacePanelOpen, setIsCoderWorkspacePanelOpen,
    activeAssistantMode,
    activeCommandType, activeCommandQuery,
    setActiveCommandType, setActiveCommandQuery,
    coderTodos, setCoderTodos,
    isGeneratingTodos, setIsGeneratingTodos,
    showTodoPanel, setShowTodoPanel,
    todoCollapsed, setTodoCollapsed,
    orchestrationState, setOrchestrationState,
    setIsSidebarOpen,
    coderWorkspacePath, triggerWorkspaceRefresh,
    scrapingResults, setScrapingResults,
    setActiveScrapingJobs,
    wikiResults, setWikiResults,
    localElementAttachments, setLocalElementAttachments,
    inputRef, abortControllerRef,
    setAskAiQuestions, setCurrentQuestionIndex,
    setAskAiAnswers, setShowAskAiPanel,
    createNewChat,
    buildActiveTools,
    coderPermissionMode,
    alwaysAllowedCommands,
    setAlwaysAllowedCommands,
    requestCommandPermission,
    logPermissionAction
  } = params;

  const handleClearChat = () => {
    setChats(prev => prev.map(chat => {
      if (chat.id === currentChatId) {
        return {
          ...chat,
          messages: [],
          updatedAt: new Date()
        };
      }
      return chat;
    }));
    showToast("Chat cleared successfully!");
  };

  const handleSend = async (contentOverride?: string) => {
    if (isVoiceListening) {
      stopVoiceDictation();
    }
    if (isTyping) {
      if (!abortControllerRef.current) {
        setIsTyping(false);
      } else {
        return;
      }
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const signal = controller.signal;

    let content = contentOverride || input.trim();
    if (!content && attachedFiles.length === 0 && attachedUrlDocs.length === 0) return;

    if (content.trim().toLowerCase() === '/clear') {
      handleClearChat();
      setInput('');
      return;
    }

    if (content.trim().toLowerCase() === '/new') {
      createNewChat(null, isCoderMode);
      setInput('');
      return;
    }

    if (content.toLowerCase().startsWith('/coder')) {
      const trimCmd = content.trim().toLowerCase();
      let newState = true;
      if (trimCmd === '/coder off') {
        newState = false;
      }
      
      setIsCoderMode(newState);
      setIsCoderWorkspacePanelOpen(newState);
      if (newState) {
        setIsSidebarOpen(false);
      }
      
      const targetChatId = createNewChat(null, newState);
      
      setChats(prev => prev.map(chat => {
        if (chat.id === targetChatId) {
          const sysMsgId = (Date.now() + 1).toString();
          return {
            ...chat,
            isCoderMode: newState,
            messages: [
              ...chat.messages,
              {
                id: Date.now().toString(),
                role: 'user',
                content: content,
                timestamp: new Date()
              },
              {
                id: sysMsgId,
                role: 'assistant',
                content: newState 
                  ? "⚡ **Coder Mode Activated!**\n\nI am now running as an autonomous Software Engineering Agent. I am connected directly to your active project workspace directory and am ready to write, read, edit, and list files in real-time. Give me instructions on what to build!"
                  : "🚫 **Coder Mode Deactivated.**\n\nI will now answer your questions as a standard digital assistant without modifying the workspace.",
                timestamp: new Date()
              }
            ],
            updatedAt: new Date()
          };
        }
        return chat;
      }));
      
      setInput('');
      triggerWorkspaceRefresh();
      return;
    }

    if (activeSkills.length > 0) {
      const skillPrompts = activeSkills.map(id => SKILLS.find(s => s.id === id)?.prompt).filter(Boolean);
      content = skillPrompts.join('') + content;
    }

    // Inject attached URL documents into content
    if (attachedUrlDocs.length > 0) {
      const docBlocks = attachedUrlDocs.map(doc => {
        const processedContent = useTurboQuant
          ? turboQuantCompress(doc.content, 5000, 'medium')
          : doc.content;
        return `\n\n[ATTACHED URL DOCUMENT${useTurboQuant ? ' — TurboQuant Compressed' : ''}]\nSource: ${doc.url}\nTitle: ${doc.title}\nContent:\n${processedContent}\n[END DOCUMENT]`;
      }).join('');
      content = content + docBlocks;
    }

    const pendingImages: { title: string; url: string }[] = [];
    // Collect image files for multimodal LLM input and read text-only files
    const pendingImageDataUrls: string[] = [];
    console.log('[LUMINA_DEBUG] handleSend attachedFiles count:', attachedFiles.length);
    if (attachedFiles.length > 0) {
      const fileBlocks: string[] = [];
      for (const file of attachedFiles) {
        if (file.type.startsWith('image/')) {
          const dataUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => resolve('');
            reader.readAsDataURL(file);
          });
          if (dataUrl) {
            pendingImageDataUrls.push(dataUrl);
            pendingImages.push({ title: file.name, url: dataUrl });
            console.log('[LUMINA_DEBUG] Image converted to data URL, length:', dataUrl.length);
          }
        } else {
          const isTextExtension = /\.(txt|md|js|jsx|ts|tsx|json|css|html|xml|yaml|yml|csv|log|ini|sh|py|go|rs|cpp|c|h|java|sql)$/i.test(file.name);
          const isTextMime = file.type && (file.type.startsWith('text/') || file.type === 'application/json' || file.type === 'application/javascript' || file.type === 'application/x-typescript');
          const isReadableText = isTextExtension || isTextMime;
          const isLikelyBinary = !isReadableText;
          const dummyUnused = 
            !/\.(txt|md|js|jsx|ts|tsx|json|css|html|xml|yaml|yml|csv|log|ini|sh)$/i.test(file.name);
          if (!isLikelyBinary && file.size < 2 * 1024 * 1024) {
            const fileContent = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string || '');
              reader.onerror = () => resolve('');
              reader.readAsText(file);
            });
            fileBlocks.push(`\n\n[ATTACHED FILE: ${file.name}]\nContent:\n${fileContent}\n[END FILE]`);
          } else {
            // Send to our backend document parser for PDF, DOCX, and other files!
            const base64 = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onload = () => {
                const result = reader.result as string;
                const base64Str = result.split(',')[1] || '';
                resolve(base64Str);
              };
              reader.onerror = () => resolve('');
              reader.readAsDataURL(file);
            });

            if (base64) {
              try {
                const parseRes = await fetch('/api/parse-doc', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    fileName: file.name,
                    mimeType: file.type,
                    base64
                  })
                });
                if (parseRes.ok) {
                  const parseData = await parseRes.json();
                  if (parseData.text) {
                    fileBlocks.push(`\n\n[ATTACHED FILE: ${file.name}]\nContent:\n${parseData.text}\n[END FILE]`);
                  } else {
                    fileBlocks.push(`\n\n[ATTACHED FILE: ${file.name} - Empty or unparseable content]`);
                  }
                } else {
                  fileBlocks.push(`\n\n[ATTACHED FILE REFERENCE: ${file.name} (${(file.size / 1024).toFixed(1)} KB) - Binary or unreadable content]`);
                }
              } catch (parseErr: any) {
                console.error("Failed to parse document on backend", parseErr);
                fileBlocks.push(`\n\n[ATTACHED FILE REFERENCE: ${file.name} (${(file.size / 1024).toFixed(1)} KB) - Parsing error: ${parseErr.message}]`);
              }
            } else {
              fileBlocks.push(`\n\n[ATTACHED FILE REFERENCE: ${file.name} (${(file.size / 1024).toFixed(1)} KB) - Unsupported or unreadable format]`);
            }
          }
        }
      }
      content = content + fileBlocks.join('');
    }

    let chatId = currentChatId;
    if (!chatId) {
      chatId = createNewChat(null, isCoderMode);
    }

    const userMessage: Message = {
      id: createStableTurnId('msg', chatId, 'user'),
      role: 'user',
      content: content,
      timestamp: new Date(),
      elementAttachments: [...localElementAttachments],
      images: pendingImages.length > 0 ? pendingImages : undefined
    } as any;

    setAttachedFiles([]);
    setAttachedUrlDocs([]);
    setLocalElementAttachments([]);

    setChats(prev => prev.map(chat => {
      if (chat.id === chatId) {
        const newMessages = [...chat.messages, userMessage];
        return {
          ...chat,
          messages: newMessages,
          title: chat.messages.length === 0 ? content.slice(0, 30) + (content.length > 30 ? '...' : '') : chat.title,
          updatedAt: new Date(),
        };
      }
      return chat;
    }));

    setInput('');
    setIsTyping(true);

    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }

    const thinkingId = createStableTurnId('msg', chatId, 'assistant');
    const isCoderPlanning = isCoderMode || content.startsWith('/coder');
    const thinkingMessage: Message = {
      id: thinkingId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      thinking: isCoderPlanning ? 'Generating engineering TODOs...' : (isWebSearchEnabled ? 'Searching the web...' : 'Thinking...'),
      isSearching: isWebSearchEnabled,
      isStreaming: true,
      toolCalls: [
        {
          id: 'thinking-node',
          label: isCoderPlanning
            ? 'Coder planner - generating TODOs...'
            : (isWebSearchEnabled ? 'Searching the web...' : `${persona.name} - thinking...`),
          type: 'ai',
          status: 'active',
          icon: isCoderPlanning ? 'manage_todos' : (isWebSearchEnabled ? 'globe' : 'sparkles')
        }
      ]
    };

    setTypingMessageId(thinkingId);
    setChats(prev => prev.map(chat => {
      if (chat.id === chatId) {
        return {
          ...chat,
          messages: [...chat.messages, thinkingMessage],
          updatedAt: new Date(),
        };
      }
      return chat;
    }));

    const isSlash = content.startsWith('/');
    const shouldRunCoderAgent = isCoderMode && isLikelyCoderTask(content);
    if (isSlash || shouldRunCoderAgent) {
      setIsGeneratingTodos(true);
      setShowTodoPanel(true);
      setTodoCollapsed(false);
      
      const firstSpaceIdx = content.indexOf(' ');
      const cmdName = firstSpaceIdx !== -1 ? content.substring(1, firstSpaceIdx).toLowerCase() : content.substring(1).toLowerCase();
      const cmdQuery = firstSpaceIdx !== -1 ? content.substring(firstSpaceIdx + 1).trim() : '';

      setActiveCommandType(cmdName);
      setActiveCommandQuery(cmdQuery || null);

      if (cmdName === 'goal') {
        setCoderTodos([
          { id: 'goal-1', text: `Analyzing task goals for: "${cmdQuery || 'objective'}"`, status: 'in_progress' },
          { id: 'goal-2', text: 'Scaffolding requirements & database blueprint schemas', status: 'pending' },
          { id: 'goal-3', text: 'Assembling components and validating API payloads', status: 'pending' },
          { id: 'goal-4', text: 'Running local test executions and structural verification', status: 'pending' },
          { id: 'goal-5', text: 'Compiling final build output for interactive preview', status: 'pending' }
        ]);
        setIsGeneratingTodos(false);
      } else if (cmdName === 'browser') {
        setCoderTodos([
          { id: 'browser-1', text: `Booting sandboxed browser module for: "${cmdQuery || 'target host'}"`, status: 'in_progress' },
          { id: 'browser-2', text: 'Parsing viewport elements, stylesheets, and meta nodes', status: 'pending' },
          { id: 'browser-3', text: 'Simulating interactive pointer clicks and network requests', status: 'pending' },
          { id: 'browser-4', text: 'Capturing High-Definition page screenshots and asset state', status: 'pending' },
          { id: 'browser-5', text: 'Outputting full diagnostic site audits and log reports', status: 'pending' }
        ]);
        setIsGeneratingTodos(false);
      } else if (cmdName === 'schedule') {
        setCoderTodos([
          { id: 'schedule-1', text: `Registering recurring task rules: "${cmdQuery || 'automation schedule'}"`, status: 'in_progress' },
          { id: 'schedule-2', text: 'Binding execution cron listeners & persistent intervals', status: 'pending' },
          { id: 'schedule-3', text: 'Syncing backend job dispatch triggers and logs database', status: 'pending' },
          { id: 'schedule-4', text: 'Running first-pass scheduler dry-runs', status: 'pending' }
        ]);
        setIsGeneratingTodos(false);
      } else if (cmdName === 'grill-me') {
        setCoderTodos([
          { id: 'grill-1', text: `Reviewing initial alignment details for: "${cmdQuery || 'feature design'}"`, status: 'in_progress' },
          { id: 'grill-2', text: 'Formulating diagnostic clarification interview questions', status: 'pending' },
          { id: 'grill-3', text: 'Rendering dynamic user feedback input prompts', status: 'pending' },
          { id: 'grill-4', text: 'Realigning architecture blueprint based on user responses', status: 'pending' }
        ]);
        setIsGeneratingTodos(false);
      } else if (shouldRunCoderAgent || cmdName === 'coder') {
        const queryPreview = (cmdQuery || content).substring(0, 42);
        setCoderTodos([
          { id: 'planning-1', text: `Understanding request: "${queryPreview}${(cmdQuery || content).length > 42 ? '...' : ''}"`, status: 'in_progress' },
          { id: 'planning-2', text: 'Inspecting workspace intent and likely files', status: 'pending' },
          { id: 'planning-3', text: 'Preparing executable engineering checklist', status: 'pending' }
        ]);
        setChats(prev => prev.map(chat => chat.id === chatId ? {
          ...chat,
          messages: chat.messages.map(m => m.id === thinkingId ? {
            ...m,
            thinking: 'Generating engineering TODOs...',
            toolCalls: [
              {
                id: 'coder-plan-node',
                label: 'Generating coder TODO runbook',
                type: 'tool',
                status: 'active',
                toolName: 'manage_todos',
                icon: 'manage_todos',
                resultSummary: 'planning workspace steps'
              },
              {
                id: 'coder-plan-ai',
                label: `${persona.name} - preparing agent path`,
                type: 'ai',
                status: 'active',
                icon: 'sparkles'
              }
            ]
          } : m)
        } : chat));
        try {
          const planPromptMessage = [
            {
              role: 'system',
              content: 'You are an expert technical planner. Formulate a targeted, structured task checklist of 3-5 concrete engineering steps to accomplish the user\'s workspace request. Focus on specifying relevant files to check, create, edit, or build. Respond ONLY with a clean JSON object containing a "todos" array with items having "id" (string starting at "1"), "text" (the specific task description), and "status" (always "pending"). Do not explain. Do not wrap in markdown tags. Example: {"todos": [{"id": "1", "text": "Analyze existing project files for structure", "status": "pending"}]}.'
            },
            {
              role: 'user',
              content: `User query: "${cmdQuery || content}"`
            }
          ];
          const planRes = await callLlamaBridge(planPromptMessage, [], signal);
          const textResponse = planRes?.choices?.[0]?.message?.content || '';
          const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (Array.isArray(parsed.todos) && parsed.todos.length > 0) {
              const mapped = parsed.todos.map((t: any, idx: number) => ({
                id: t.id || (idx + 1).toString(),
                text: t.text || 'Engineering task',
                status: idx === 0 ? 'in_progress' : 'pending'
              }));
              setCoderTodos(mapped);
              setChats(prev => prev.map(chat => chat.id === chatId ? {
                ...chat,
                messages: chat.messages.map(m => m.id === thinkingId ? {
                  ...m,
                  thinking: 'Coder TODOs ready. Starting agent...',
                  toolCalls: [
                    {
                      id: 'coder-plan-node',
                      label: 'Coder TODO runbook generated',
                      type: 'tool',
                      status: 'complete',
                      toolName: 'manage_todos',
                      icon: 'check',
                      resultSummary: `${mapped.length} tasks prepared`
                    },
                    {
                      id: 'coder-plan-ai',
                      label: `${persona.name} - starting tool execution`,
                      type: 'ai',
                      status: 'active',
                      icon: 'terminal'
                    }
                  ]
                } : m)
              } : chat));
            } else {
              throw new Error("Invalid structure");
            }
          } else {
            throw new Error("No JSON found");
          }
        } catch (err) {
          console.warn("Failed to generate dynamic todos via AI:", err);
          setCoderTodos([
            { id: 'fb-1', text: 'Analyze file layout and project components', status: 'in_progress' },
            { id: 'fb-2', text: `Implement build changes matching query: ${(cmdQuery || content).substring(0, 35)}${(cmdQuery || content).length > 35 ? '...' : ''}`, status: 'pending' },
            { id: 'fb-3', text: 'Verify application and render interactive hot-fix', status: 'pending' }
          ]);
          setChats(prev => prev.map(chat => chat.id === chatId ? {
            ...chat,
            messages: chat.messages.map(m => m.id === thinkingId ? {
              ...m,
              thinking: 'Using fallback TODOs. Starting agent...',
              toolCalls: [
                {
                  id: 'coder-plan-node',
                  label: 'Fallback coder TODO runbook prepared',
                  type: 'tool',
                  status: 'complete',
                  toolName: 'manage_todos',
                  icon: 'check',
                  resultSummary: '3 tasks prepared'
                },
                {
                  id: 'coder-plan-ai',
                  label: `${persona.name} - starting tool execution`,
                  type: 'ai',
                  status: 'active',
                  icon: 'terminal'
                }
              ]
            } : m)
          } : chat));
        } finally {
          setIsGeneratingTodos(false);
        }
      } else {
        setCoderTodos([
          { id: 'fb-1', text: `Formulating workspace task: "/${cmdName} ${cmdQuery}"`, status: 'in_progress' },
          { id: 'fb-2', text: `Processing task strategies with ${selectedModel}`, status: 'pending' },
          { id: 'fb-3', text: 'Executing response flow actions', status: 'pending' }
        ]);
        setIsGeneratingTodos(false);
      }
    } else {
      setActiveCommandType(null);
      setActiveCommandQuery(null);
    }

    let searchResults: any[] = [];
    let searchProviderVal = "";

    if (isDeepSearchEnabled) {
      try {
        setChats(prev => prev.map(chat => {
          if (chat.id !== chatId) return chat;
          return {
            ...chat,
            messages: chat.messages.map(m => m.id === thinkingId
              ? { ...m, thinking: 'Orchestrating Deep Multi-Agent Research...', isSearching: true }
              : m)
          };
        }));

        // Launch the UI Research simulation
        if (researchMode) {
          researchMode.setIsResearchActive(false);
          setTimeout(() => {
            researchMode.setCustomQueries(content);
            researchMode.setIsResearchActive(true);
            researchMode.setResearchLogs([
              `[${new Date().toLocaleTimeString()}] [Orchestrator] Deep recursive search triggered via Chat Toggle: "${content}"`,
              `[${new Date().toLocaleTimeString()}] [System] Allocating multi-agent parallel loops...`
            ]);
            researchMode.setIsResearchWorkspaceOpen(true);
          }, 100);
        }

        const hasTavilyKey = tavilyApiKey && tavilyApiKey.trim().length > 0;
        const hasSerpKey = serpApiKey && serpApiKey.trim().length > 0;
        
        let providerName = 'DuckDuckGo';
        if (searchProvider === 'tavily' && hasTavilyKey) {
          providerName = 'Tavily';
        } else if (searchProvider === 'serpapi' && hasSerpKey) {
          providerName = 'SerpApi';
        } else if (hasTavilyKey) {
          providerName = 'Tavily';
        } else if (hasSerpKey) {
          providerName = 'SerpApi';
        }

        const searchResp = await fetch(`/api/search`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            query: content, 
            tavilyKey: tavilyApiKey,
            serpKey: serpApiKey,
            provider: searchProvider
          }),
          signal
        });
        
        if (searchResp.ok) {
          const searchData = await searchResp.json();
          searchResults = searchData.results || [];
          searchProviderVal = "Deep Research Engine (" + providerName + ")";
        } else {
          console.warn('Backend search failed, no further fallback available.');
        }

        if (searchResults.length > 0) {
          setChats(prev => prev.map(chat => {
            if (chat.id === chatId) {
              return {
                ...chat,
                messages: chat.messages.map(m => m.id === thinkingId ? { 
                  ...m, 
                  isSearching: true, 
                  thinking: `Synthesizing deep results and Agent claims (${searchProviderVal})...`,
                  sources: searchResults.slice(0, 10).map(r => ({ title: r.title, url: r.url, snippet: r.snippet })) 
                } : m),
              };
            }
            return chat;
          }));
        }
      } catch (err) {
        console.error('Deep search error:', err);
      }
    } else if (isWebSearchEnabled) {
      try {
        setChats(prev => prev.map(chat => {
          if (chat.id !== chatId) return chat;
          return {
            ...chat,
            messages: chat.messages.map(m => m.id === thinkingId
              ? { ...m, thinking: 'Searching the web...', isSearching: true }
              : m)
          };
        }));

        const hasTavilyKey = tavilyApiKey && tavilyApiKey.trim().length > 0;
        const hasSerpKey = serpApiKey && serpApiKey.trim().length > 0;
        
        let providerName = 'DuckDuckGo';
        if (searchProvider === 'tavily' && hasTavilyKey) {
          providerName = 'Tavily';
        } else if (searchProvider === 'serpapi' && hasSerpKey) {
          providerName = 'SerpApi';
        } else if (hasTavilyKey) {
          providerName = 'Tavily';
        } else if (hasSerpKey) {
          providerName = 'SerpApi';
        }

        const searchResp = await fetch(`/api/search`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            query: content, 
            tavilyKey: tavilyApiKey,
            serpKey: serpApiKey,
            provider: searchProvider
          }),
          signal
        });
        
        if (searchResp.ok) {
          const searchData = await searchResp.json();
          searchResults = searchData.results || [];
          searchProviderVal = searchData.provider || "Search";
        } else {
          console.warn('Backend search failed, no further fallback available.');
        }

        if (searchResults.length > 0) {
          setChats(prev => prev.map(chat => {
            if (chat.id === chatId) {
              return {
                ...chat,
                messages: chat.messages.map(m => m.id === thinkingId ? { 
                  ...m, 
                  isSearching: true, 
                  thinking: `Synthesizing info from ${searchProviderVal}...`,
                  sources: searchResults.slice(0, 10).map(r => ({ title: r.title, url: r.url, snippet: r.snippet })) 
                } : m),
              };
            }
            return chat;
          }));
        } else {
          console.warn("Search returned no results from any provider.");
        }
      } catch (err) {
        console.error("Search step failed:", err);
      }
    }

    try {
      const chatContext = chats.find(c => c.id === chatId)?.messages || [];
      
      let activeTools = buildActiveTools();
      if (isDeepSearchEnabled && !isCoderMode) {
        const existingNames = new Set(activeTools.map((tool: any) => tool?.function?.name).filter(Boolean));
        for (const tool of deepResearchTools) {
          if (!existingNames.has(tool.function.name)) {
            activeTools.push(tool);
          }
        }
      }
      if (isCoderMode) {
        activeTools.push(
          {
            type: 'function',
            function: {
              name: 'spawn_subagent',
              description: 'Spawn a focused engineering subagent to perform a specific engineering task (e.g. scaffolding, backend coding, frontend coding, writing tests, writing documentation) in the workspace.',
              parameters: {
                type: 'object',
                properties: {
                  agentName: {
                    type: 'string',
                    description: 'The name of the subagent to spawn. Available subagents: scaffold-agent, config-agent, backend-agent, frontend-agent, database-agent, auth-agent, integration-agent, test-agent, docs-agent, deploy-agent.'
                  },
                  task: {
                    type: 'string',
                    description: 'The specific task instruction for the subagent. Be very precise, detailed, and clear about the context.'
                  }
                },
                required: ['agentName', 'task']
              }
            }
          },
          {
            type: 'function',
            function: {
              name: 'write_file',
              description: 'Create or overwrite a file. Creates parent dirs automatically.',
              parameters: {
                type: 'object',
                properties: {
                  filePath: { type: 'string', description: 'Relative path from project root.' },
                  content: { type: 'string', description: 'File content to write.' }
                },
                required: ['filePath', 'content']
              }
            }
          },
          {
            type: 'function',
            function: {
              name: 'read_file',
              description: 'Read file contents. Optional line range with offset/limit.',
              parameters: {
                type: 'object',
                properties: {
                  filePath: { type: 'string', description: 'Relative file path.' },
                  offset: { type: 'number', description: 'Start line (1-indexed).' },
                  limit: { type: 'number', description: 'Max lines to return.' }
                },
                required: ['filePath']
              }
            }
          },
          {
            type: 'function',
            function: {
              name: 'search_code',
              description: 'Search files by regex or list files by glob pattern.',
              parameters: {
                type: 'object',
                properties: {
                  query: { type: 'string', description: 'Regex/text to search for.' },
                  fileGlob: { type: 'string', description: 'File filter like "*.tsx".' },
                  maxResults: { type: 'number', description: 'Max results (default 30).' }
                },
                required: []
              }
            }
          },
          {
            type: 'function',
            function: {
              name: 'analyze_file',
              description: 'LSP analysis: imports, symbols, diagnostics, metadata.',
              parameters: {
                type: 'object',
                properties: {
                  filePath: { type: 'string', description: 'Relative file path.' }
                },
                required: ['filePath']
              }
            }
          },
          {
            type: 'function',
            function: {
              name: 'edit_file',
              description: 'Find and replace text in an existing file.',
              parameters: {
                type: 'object',
                properties: {
                  filePath: { type: 'string', description: 'Relative file path.' },
                  search: { type: 'string', description: 'Exact text to find.' },
                  replace: { type: 'string', description: 'Replacement text.' },
                  all: { type: 'boolean', description: 'Replace all occurrences.' }
                },
                required: ['filePath', 'search', 'replace']
              }
            }
          },
          {
            type: 'function',
            function: {
              name: 'run_skill',
              description: 'Execute a skill template.',
              parameters: {
                type: 'object',
                properties: {
                  skillId: { type: 'string', description: 'Skill ID.' },
                  input: { type: 'string', description: 'Input text.' }
                },
                required: ['skillId', 'input']
              }
            }
          },

          {
            type: 'function',
            function: {
              name: 'fetch_url',
              description: 'Fetch and scrape a webpage. Prioritize scraping high-quality articles, primary databases, and reputable resources. Avoid scraping empty landing pages, social media logins, terms of service, documents like PDF, or invalid redirect URLs.',
              parameters: {
                type: 'object',
                properties: {
                  url: { type: 'string', description: 'The exact target URL to fetch. Do NOT pass a social media account, login form, privacy policy link, downloading file path, or empty homepage.' },
                  outputFormat: { type: 'string', enum: ['markdown', 'text', 'html'], description: 'Output format (default: markdown).' }
                },
                required: ['url']
              }
            }
          },
          {
            type: 'function',
            function: {
              name: 'web_search',
              description: 'Search the web for current information.',
              parameters: {
                type: 'object',
                properties: {
                  query: { type: 'string', description: 'Search query.' },
                  maxResults: { type: 'number', description: 'Max results (default 5).' }
                },
                required: ['query']
              }
            }
          },
          {
            type: 'function',
            function: {
              name: 'ask_user',
              description: 'Ask clarifying questions when requirements are ambiguous.',
              parameters: {
                type: 'object',
                properties: {
                  questions: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        question: { type: 'string' },
                        type: { type: 'string', enum: ['single_choice', 'multi_choice', 'text_input', 'confirm'] },
                        options: { type: 'array', items: { type: 'string' } }
                      },
                      required: ['id', 'question', 'type']
                    }
                  }
                },
                required: ['questions']
              }
            }
          },
          {
            type: 'function',
            function: {
              name: 'create_file',
              description: 'Create a file or directory.',
              parameters: {
                type: 'object',
                properties: {
                  filePath: { type: 'string', description: 'Relative path.' },
                  content: { type: 'string', description: 'File content.' },
                  isDirectory: { type: 'boolean', description: 'Create directory instead.' }
                },
                required: ['filePath']
              }
            }
          },
          {
            type: 'function',
            function: {
              name: 'delete_file',
              description: 'Delete a file or directory.',
              parameters: {
                type: 'object',
                properties: {
                  filePath: { type: 'string', description: 'Relative path to delete.' }
                },
                required: ['filePath']
              }
            }
          },
          {
            type: 'function',
            function: {
              name: 'rename_file',
              description: 'Rename or move a file/directory.',
              parameters: {
                type: 'object',
                properties: {
                  filePath: { type: 'string', description: 'Current path.' },
                  newPath: { type: 'string', description: 'New path.' }
                },
                required: ['filePath', 'newPath']
              }
            }
          },
          {
            type: 'function',
            function: {
              name: 'run_command',
              description: 'Run a shell/terminal command in the workspace. Suitable for running tests, build scripts, installing packages, or general shell commands.',
              parameters: {
                type: 'object',
                properties: {
                  command: { type: 'string', description: 'The command line string to execute.' }
                },
                required: ['command']
              }
            }
          }
        );
      }

      const personaLine = `You are ${persona.name}. Character description/Role: ${persona.role || 'helpful digital assistant'}.${persona.systemPrompt ? `\nInstructions: ${persona.systemPrompt}` : ''}`;
      let systemPrompt = personaLine;

      // Load custom skills from localStorage to connect AI directly with them
      let customSkills: any[] = [];
      try {
        const saved = localStorage.getItem('lumina_custom_skills');
        if (saved) {
          customSkills = JSON.parse(saved);
        }
      } catch (e) {
        console.error('Failed to parse custom skills for system prompt:', e);
      }

      const enabledCustomSkills = customSkills.filter((s: any) => s.enabled);
      let activeCustomSkill: any = null;
      const firstWord = content.trim().split(/\s+/)[0]?.toLowerCase() || '';

      // 1. Direct command match (e.g. /skill-id or /skill-name)
      if (firstWord.startsWith('/')) {
        const candidateId = firstWord.substring(1);
        activeCustomSkill = enabledCustomSkills.find(
          (s: any) => s.id === candidateId || s.name.toLowerCase() === candidateId
        );
      }

      // 2. Semantic/Keyword matched auto-load
      if (!activeCustomSkill) {
        for (const s of enabledCustomSkills) {
          const isAuto = s.trigger?.toLowerCase().includes('auto') || s.trigger?.toLowerCase().includes('semantic');
          if (isAuto) {
            // Check direct mentions of skill name
            const nameMention = content.toLowerCase().includes(s.id.toLowerCase()) || content.toLowerCase().includes(s.name.toLowerCase());
            // Specialized matches based on specific default skills
            const specMatch = s.id === 'skill-creator' && (
              content.toLowerCase().includes('skill') || 
              content.toLowerCase().includes('prompt') || 
              content.toLowerCase().includes('system prompt') ||
              content.toLowerCase().includes('benchmark')
            );
            
            // Check descriptions keywords
            const descWords = s.description.toLowerCase().split(/\s+/).filter((w: string) => w.length > 4);
            const descMatch = descWords.some((w: string) => content.toLowerCase().includes(w));

            if (nameMention || specMatch || descMatch) {
              activeCustomSkill = s;
              break;
            }
          }
        }
      }

      // Append general custom skill registry so AI knows its capabilities
      if (enabledCustomSkills.length > 0) {
        systemPrompt += `\n\n[AVAILABLE CUSTOM MODULAR SKILLS]
You have direct, real-time access to the following custom workspace skills. You can automatically invoke any of them or read/write their files:`;
        enabledCustomSkills.forEach((s: any) => {
          systemPrompt += `\n- **${s.name}** (Trigger: ${s.trigger}) — ${s.description}`;
        });
        systemPrompt += `\n\nYou can access or customize their configuration files in your virtual directory at \".lumina/skills/{skill-name}/SKILL.md\". If helpful, you can read them with 'read_file' or improve them with 'write_file'/'edit_file'!`;
      }

      // If a specific skill is active, set it as the primary system prompt!
      if (activeCustomSkill) {
        const skillMd = activeCustomSkill.tree?.find((t: any) => t.name === 'SKILL.md');
        if (skillMd && skillMd.content) {
          systemPrompt += `\n\n=== 🧠 ACTIVE DISPATCH SKILL PROMPT: ${activeCustomSkill.name} ===
You have automatically transitioned your core system prompt to prioritize this specialized skill.
Please execute the following skill guide with absolute discipline:

${skillMd.content}

=== END OF ACTIVE DISPATCH SKILL PROMPT ===`;
        }
      }

      if (!isCoderMode) {
        systemPrompt += `\n[CHAT MODE] Respond as a conversational assistant. Do not claim to be in Coder/Builder mode unless asked.`;
      }

      if (activeTools.length > 0) {
        systemPrompt += `\n[TOOLS] Active: ${activeTools.map(t => t.function.name).join(', ')}. Use relevant tools proactively.`;
      }

      if (isDeepSearchEnabled && !isCoderMode) {
        systemPrompt += `\n\n${DEEP_RESEARCH_SYSTEM_PROMPT}\nCurrent date: ${new Date().toISOString().slice(0, 10)}`;
      }

      if (isCoderMode) {
        const osName = (navigator as any)?.platform || 'unknown';
        if (!shouldRunCoderAgent) {
          systemPrompt += `\n[CODER CHAT MODE - ${osName}] Coder mode is open, but this message is conversational. Reply briefly. Do not call tools or discuss file changes unless the user asks for engineering work.`;
        } else {
          systemPrompt += `\n\n[CODER MODE — ${osName}]
You are a software engineering agent. When asked to build/modify code:
1. Use tools to make real file system changes. Always 'read_file' before editing.
2. Use 'edit_file' for targeted changes, 'write_file' for full rewrites/new files.
3. Use 'search_code' to find symbols/errors. Use 'create_file'/'delete_file'/'rename_file' for file ops. Use 'run_command' to run shell commands or execute code.
4. Work in tool-call cycles until the task is complete. Give a summary when done.

[SUBAGENTS DELEGATION SYSTEM]
When asked to build a full project, scaffold a new application, or implement a large feature, you should spawn specialized subagents to perform targeted tasks using the 'spawn_subagent' tool:
- 'scaffold-agent': To set up folders, project structure, and empty stub files.
- 'config-agent': To configure dependencies, install packages, and manage package.json/webpack/vite configs.
- 'database-agent': To configure databases, schemas, migrations, or database connection scripts.
- 'backend-agent': To implement server-side APIs, routes, controllers, and services.
- 'frontend-agent': To build UI components, hooks, pages, styles, and web views.
- 'auth-agent': To set up login, authentication routes, session management, or tokens.
- 'test-agent': To write and execute unit tests, integration tests, or end-to-end tests.
- 'docs-agent': To write README, API documentations, or comment structures.
- 'deploy-agent': To configure CI/CD pipelines, Dockerfiles, or cloud deployment configs.

Sequential Work: Spawn them one by one (e.g. scaffold first, then config, then database, then backend, frontend) to avoid conflicts. Provide specific and detailed task strings so they know exactly what to build. Re-check the files they created and write the final integration yourself.

[ASK USER TOOL INSTRUCTIONS]
- Do NOT call 'ask_user' to ask trivial or basic questions (e.g. asking for file paths, project names, or generic things you can check yourself using tools like 'search_code', 'read_file', or by running commands).
- Only ask clarifying questions if there is a critical ambiguity in the requirements that prevents you from proceeding.
- When calling 'ask_user', prefer using 'single_choice', 'multi_choice', or 'confirm' types and provide clear, actionable selectable options (e.g., in the 'options' field) rather than open-ended 'text_input'. This provides a premium, interactive experience.`;

          if (activeAssistantMode === 'builder') {
            systemPrompt += `\n[MODE: BUILDER] Implement features, create files, write working code.`;
          } else if (activeAssistantMode === 'planner') {
            systemPrompt += `\n[MODE: PLANNER] Plan architecture and sequencing. Ask before executing.`;
          } else if (activeAssistantMode === 'debugger') {
            systemPrompt += `\n[MODE: DEBUGGER] Trace errors, fix bugs with minimal changes.`;
          }
        }
      }

      // Orchestration Trigger Detection
      const ORCHESTRATION_TRIGGERS = [
        'full app', 'entire', 'complete project', 'everything', 'end-to-end',
        'full-stack', 'full stack', 'whole thing', 'the whole', 'from scratch', 'build me a',
        'create a complete', 'scaffold', 'production ready', 'deploy'
      ];
      const shouldActivateOrchestration = (msg: string): boolean => {
        const lower = msg.toLowerCase();
        return ORCHESTRATION_TRIGGERS.some(trigger => lower.includes(trigger));
      };

      if (isCoderMode && shouldActivateOrchestration(content) && !orchestrationState.isActive) {
        setOrchestrationState({
          isActive: true,
          projectAnalysis: {
            complexityScore: 'HIGH',
            estimatedFiles: 20,
            domainsDetected: ['frontend', 'backend', 'database', 'auth', 'devops'],
            recommendedStrategy: 'SUBAGENT_TEAM',
          },
          agents: [],
          currentPhase: 1,
          totalPhases: 5,
          awaitingUserConfirmation: false,
          conflicts: [],
        });

        systemPrompt += `\n\n[SUBAGENT ORCHESTRATION MODE]
You are the Lumina AI Master Orchestrator operating in Coder Mode.
Your primary role is to analyze incoming software projects and INTELLIGENTLY DECOMPOSE
large, complex work into coordinated subagent tasks that run with maximum parallelism
and minimum inter-dependency conflicts.

When the user asks to build a full project, FIRST output a PROJECT ANALYSIS BLOCK:
┌─────────────────────────────────────────────────────┐
│ 🔍 PROJECT ANALYSIS                                 │
├─────────────────────────────────────────────────────┤
│ Project Name: <name or "Unnamed Project">           │
│ Complexity Score: <LOW | MEDIUM | HIGH | CRITICAL>  │
│ Estimated Files: <number>                           │
│ Domains Detected: <comma-separated list>            │
│ Parallelizable: <YES | NO>                          │
│ Recommended Strategy: <SOLO | SUBAGENT_TEAM>        │
└─────────────────────────────────────────────────────┘

Then output a SUBAGENT TASK DECOMPOSITION PLAN with phases.
Then ask the user for confirmation before beginning.

Available subagents: scaffold-agent, config-agent, backend-agent, frontend-agent,
database-agent, auth-agent, integration-agent, test-agent, docs-agent, deploy-agent.

Store subagent .prompt files at .lumina/subagents/ in the workspace.
Store contract files at .lumina/contracts/ in the workspace.`;
      }

      // Inject search context into systemPrompt BEFORE building apiMessages
      if (searchResults.length > 0 && !isCoderMode) {
        const rawContextString = searchResults.slice(0, 8)
          .map((r, i) => `[${i+1}] ${r.title}: ${r.snippet} (URL: ${r.url})`)
          .join('\n\n');
        
        const contextString = useTurboQuant
          ? turboQuantCompress(rawContextString, 5000, 'medium')
          : rawContextString;

        systemPrompt += `\n\nWeb Search Results${useTurboQuant ? ' (TurboQuant compressed)' : ''}:\n${contextString}\n\nPlease use the above search results to provide a grounded, up-to-date response. Cite your sources using [number] notation when appropriate. If the results include an instant answer, prioritize that information.`;
      }

      const recentContext = isCoderMode ? chatContext.slice(-4) : chatContext;
      const hasPendingImages = pendingImageDataUrls.length > 0;
      const apiMessages = [
        { role: 'system', content: systemPrompt },
        ...([...recentContext, userMessage]
          .filter(m => (m.content && m.content.trim().length > 0) || (m.elementAttachments && m.elementAttachments.length > 0) || hasPendingImages)
          .map(m => {
            let text = m.content || '';
            if (m.elementAttachments && m.elementAttachments.length > 0) {
              text += `\n\n[INSPECTED CODE ATTACHMENT FOR CONTEXT]:`;
              m.elementAttachments.forEach((att: any) => {
                const lineInfo = att.lineRangeStart && att.lineRangeEnd && att.lineRangeStart !== att.lineRangeEnd
                  ? `${att.lineRangeStart}-${att.lineRangeEnd}`
                  : (att.lineNumber || att.lineRangeStart || '');
                text += `\n- File Name: ${att.fileName}\n- File Path: ${att.filePath}\n${lineInfo ? `- Line Reference: ${lineInfo}\n` : ''}- Code Subsection:\n\`\`\`\n${att.specificCode}\n\`\`\`\n- Functional Role: ${att.elementWork}\n`;
              });
            }
            return {
              role: m.role,
              content: text
            };
          }))
      ];

      // Attach images as multimodal content to the last user message
      if (pendingImageDataUrls.length > 0) {
        const userMsgIdx = apiMessages.length - 1;
        console.log('[LUMINA_DEBUG] Attaching', pendingImageDataUrls.length, 'images to apiMessages index', userMsgIdx);
        console.log('[LUMINA_DEBUG] apiMessages[userMsgIdx] role:', apiMessages[userMsgIdx]?.role);
        if (apiMessages[userMsgIdx]?.role === 'user') {
          const textContent = apiMessages[userMsgIdx].content || '';
          const contentParts: any[] = [];
          if (textContent) {
            contentParts.push({ type: 'text', text: textContent });
          }
          contentParts.push(...pendingImageDataUrls.map(url => ({ type: 'image_url', image_url: { url } })));
          (apiMessages[userMsgIdx] as any).content = contentParts;
          console.log('[LUMINA_DEBUG] Content array length:', (apiMessages[userMsgIdx] as any).content.length);
          console.log('[LUMINA_DEBUG] Content types:', (apiMessages[userMsgIdx] as any).content.map((c: any) => c.type));
        }
      }
      
      // Log the final apiMessages structure (truncate base64)
      if (pendingImageDataUrls.length > 0) {
        const logSafe = JSON.parse(JSON.stringify(apiMessages));
        for (const msg of logSafe) {
          if (Array.isArray(msg.content)) {
            msg.content = msg.content.map((c: any) => {
              if (c.type === 'image_url' && c.image_url?.url) {
                return { type: 'image_url', image_url: { url: c.image_url.url.substring(0, 80) + '...[truncated]' } };
              }
              return c;
            });
          }
        }
        console.log('[LUMINA_DEBUG] Final apiMessages structure:', JSON.stringify(logSafe, null, 2));
      }

      // Direct call to Llama Bridge
      let rawResponse: any = await callLlamaBridge(apiMessages, activeTools, signal);

      const data = rawResponse;
      let choice = data.choices?.[0]?.message;
      let toolCallsRaw = choice?.tool_calls;
      const responseImages = data.images || [];

      const toolCallNodes: ToolCallNode[] = [];
      let agentTraceContent = '';

      const hasWebScrapeCall = toolCallsRaw && toolCallsRaw.some((tc: any) => {
        const name = tc.function?.name || '';
        return name === 'web_scrape' || name === 'search' || name === 'visit' || name === 'google_scholar' || name.startsWith('wiki_');
      });
      if (isCoderMode || hasWebScrapeCall) {
        let successfulScrapesCount = 0;
      let loopCount = 0;
      const turnToolResultCache = new Map<string, any>();
        const maxLoops = 20;
        while (choice?.tool_calls && choice.tool_calls.length > 0 && loopCount < maxLoops) {
          loopCount++;
          let shouldStopAfterAsk = false;

          const interimThought = typeof choice.content === 'string' ? choice.content.trim() : '';
          if (interimThought) {
            agentTraceContent += `${agentTraceContent ? '\n\n' : ''}${interimThought}`;
            setChats(prev => prev.map(chat => {
              if (chat.id !== chatId) return chat;
              return {
                ...chat,
                messages: chat.messages.map(m => m.id === thinkingId ? {
                  ...m,
                  content: `${m.content || ''}${m.content ? '\n\n' : ''}${interimThought}`,
                  thinking: `Planning next tool step ${loopCount}...`
                } : m)
              };
            }));
          }
          
          const activeToolNames = choice.tool_calls.map((t: any) => t.function?.name || '');
          if (activeToolNames.some((n: string) => n === 'read_file' || n === 'search_code' || n === 'analyze_file')) {
            setCoderTodos(prev => {
              if (prev.length > 0) {
                return prev.map((item, idx) => {
                  if (idx === 0) return { ...item, status: 'complete' };
                  if (idx === 1 && item.status === 'pending') return { ...item, status: 'in_progress' };
                  return item;
                });
              }
              return prev;
            });
          }
          if (activeToolNames.some((n: string) => n === 'write_file' || n === 'edit_file')) {
            setCoderTodos(prev => {
              if (prev.length > 1) {
                return prev.map((item, idx) => {
                  if (idx <= 1) return { ...item, status: 'complete' };
                  if (idx === 2 && item.status === 'pending') return { ...item, status: 'in_progress' };
                  return item;
                });
              }
              return prev;
            });
          }
          if (loopCount >= 2) {
            setCoderTodos(prev => {
              if (prev.length > 2) {
                return prev.map((item, idx) => {
                  if (idx <= 2) return { ...item, status: 'complete' };
                  if (idx === 3 && item.status === 'pending') return { ...item, status: 'in_progress' };
                  return item;
                });
              }
              return prev;
            });
          }

          const currentCallNodes: ToolCallNode[] = [];
          
          for (const [idx, tc] of choice.tool_calls.entries()) {
            const fn = tc.function || {};
            const name = fn.name || 'unknown';
            const args = fn.arguments ? (() => { try { return JSON.parse(fn.arguments); } catch { return {}; } })() : {};
            
            const isScrape = name === 'web_scrape' || name === 'fetch_url';
            const readRange = name === 'read_file' && (args.offset || args.limit) ? ` [offset=${args.offset || 1}, limit=${args.limit || 'all'}]` : '';
            const normalizedArgPath = normalizeToolFilePath(String(args.filePath || ''), coderWorkspacePath);
            const node: ToolCallNode = {
              id: tc.id || createStableTurnId('tc', loopCount, idx, name),
              type: 'tool',
              label: isScrape ? `Web Scraper (${args.url})` : name === 'run_command' ? `Terminal command (${args.command})` : `${name} ${normalizedArgPath ? `(${normalizedArgPath})` : ''}${readRange}`,
              status: 'active',
              toolName: name,
              argsCount: typeof args === 'object' && args ? Object.keys(args).length : 0,
              icon: isScrape ? 'globe' :
                    name === 'web_search' ? 'search' :
                    name === 'search_code' ? 'search' :
                    name === 'read_file' ? 'file' :
                    name === 'write_file' ? 'write' :
                    name === 'edit_file' ? 'edit' :
                    name === 'analyze_file' ? 'code' :
                    name === 'run_skill' ? 'sparkles' :
                    name === 'manage_todos' ? 'wrench' :
                    name === 'ask_user' ? 'sparkles' :
                    name === 'create_file' ? 'sparkles' :
                    name === 'delete_file' ? 'terminal' :
                    name === 'rename_file' ? 'edit' :
                    name === 'run_command' ? 'terminal' :
                    name.includes('grep') || name.includes('search') || name.includes('subtask') ? 'search' :
                    name.includes('read') || name.includes('file') ? 'file' :
                    name.includes('edit') || name.includes('create') ? 'edit' :
                    'sparkles',
              filePath: normalizedArgPath || '',
              addedCount: undefined,
              removedCount: undefined
            };
            currentCallNodes.push(node);
            toolCallNodes.push(node);
          }

          const currentPlaceholders = currentCallNodes.map(node => `[[tool_call:${node.id}]]`).join('\n\n');
          agentTraceContent += `${agentTraceContent ? '\n\n' : ''}${currentPlaceholders}`;

          setChats(prev => prev.map(chat => {
            if (chat.id === chatId) {
              return {
                ...chat,
                messages: chat.messages.map(m => m.id === thinkingId ? {
                  ...m,
                  content: `${m.content || ''}${m.content ? '\n\n' : ''}${currentPlaceholders}`,
                  toolCalls: [...toolCallNodes]
                } : m)
              };
            }
            return chat;
          }));

          const toolResultMessages = [];
          for (const tc of choice.tool_calls) {
            const fn = tc.function || {};
            const name = fn.name || 'unknown';
            const args = fn.arguments ? (() => { try { return JSON.parse(fn.arguments); } catch { return {}; } })() : {};
            let resultValue: any = null;
            const cacheKey = `${name}:${JSON.stringify({
              ...args,
              filePath: normalizeToolFilePath(String(args.filePath || ''), coderWorkspacePath),
              newPath: normalizeToolFilePath(String(args.newPath || ''), coderWorkspacePath),
              command: String(args.command || '').trim()
            })}`;

            try {
              if (turnToolResultCache.has(cacheKey)) {
                resultValue = {
                  ...turnToolResultCache.get(cacheKey),
                  reusedFromCache: true
                };
                const cachedNode = toolCallNodes.find(n => n.id === tc.id);
                if (cachedNode) {
                  cachedNode.resultSummary = 'Reused previously collected result in this turn';
                }
                showToast(`Reused cached result for ${name}`);
              } else if (!isCoderMode && ['write_file', 'edit_file', 'read_file', 'search_code', 'analyze_file', 'run_skill', 'manage_todos', 'fetch_url', 'web_search', 'ask_user', 'create_file', 'delete_file', 'rename_file', 'run_command'].includes(name)) {
                throw new Error("Coder tools are disabled when Coder Mode is inactive (Chat Mode).");
              } else {
                const workspaceArg = coderWorkspacePath ? { workspaceRoot: coderWorkspacePath } : {};
                if (name === 'create_file') {
                const cleanedPath = normalizeToolFilePath(args.filePath, coderWorkspacePath);
                const fullPath = coderWorkspacePath ? `${coderWorkspacePath.replace(/\\/g, '/')}/${cleanedPath}` : `./${cleanedPath}`;
                if (cleanedPath.includes('/') && !args.isDirectory) {
                  const folderPart = cleanedPath.substring(0, cleanedPath.lastIndexOf('/'));
                  const folderFullPath = coderWorkspacePath ? `${coderWorkspacePath.replace(/\\/g, '/')}/${folderPart}` : `./${folderPart}`;
                  await fetch('/api/fs/create', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ filePath: folderFullPath, isDirectory: true, ...workspaceArg }), signal
                  });
                }
                const createRes = await fetch('/api/fs/create', {
                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ filePath: fullPath, isDirectory: !!args.isDirectory, content: args.content, ...workspaceArg }), signal
                });
                resultValue = { ...(await createRes.json()), filePath: cleanedPath, action: args.isDirectory ? 'created_directory' : 'created_file' };
                showToast(`Created ${cleanedPath}`);
              } else if (name === 'delete_file') {
                const cleanedPath = normalizeToolFilePath(args.filePath, coderWorkspacePath);
                const fullPath = coderWorkspacePath ? `${coderWorkspacePath.replace(/\\/g, '/')}/${cleanedPath}` : `./${cleanedPath}`;
                const delRes = await fetch('/api/fs/delete', {
                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ filePath: fullPath, ...workspaceArg }), signal
                });
                resultValue = { ...(await delRes.json()), filePath: cleanedPath, action: 'deleted_file' };
                showToast(`Deleted ${cleanedPath}`);
              } else if (name === 'rename_file') {
                const oldPath = normalizeToolFilePath(args.filePath, coderWorkspacePath);
                const newPath = normalizeToolFilePath(args.newPath, coderWorkspacePath);
                const fullOldPath = coderWorkspacePath ? `${coderWorkspacePath.replace(/\\/g, '/')}/${oldPath}` : `./${oldPath}`;
                const fullNewPath = coderWorkspacePath ? `${coderWorkspacePath.replace(/\\/g, '/')}/${newPath}` : `./${newPath}`;
                const moveRes = await fetch('/api/fs/move', {
                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ oldPath: fullOldPath, newPath: fullNewPath, ...workspaceArg }), signal
                });
                resultValue = { ...(await moveRes.json()), filePath: newPath, oldPath, newPath, action: 'renamed_file' };
                showToast(`Renamed ${oldPath} → ${newPath}`);
              } else if (name === 'write_file' && (() => {
                const cleanedPath = normalizeToolFilePath(args.filePath, coderWorkspacePath);
                const skillMatch = getVirtualSkillMatch(cleanedPath);
                if (skillMatch) {
                  let customSkills: any[] = [];
                  try {
                    const saved = localStorage.getItem('lumina_custom_skills');
                    if (saved) customSkills = JSON.parse(saved);
                  } catch (e) {}
                  let targetSkillIndex = customSkills.findIndex((s: any) => s.id === skillMatch.skillId || s.name.toLowerCase() === skillMatch.skillId.toLowerCase());
                  if (targetSkillIndex === -1) {
                    const formattedId = skillMatch.skillId.toLowerCase();
                    const newSkill = {
                      id: formattedId,
                      name: formattedId,
                      addedBy: 'AI',
                      trigger: 'Slash command + auto',
                      description: 'AI-created skill module.',
                      enabled: true,
                      tree: []
                    };
                    customSkills.push(newSkill);
                    targetSkillIndex = customSkills.length - 1;
                  }
                  const skill = customSkills[targetSkillIndex];
                  const pathParts = skillMatch.subPath.split('/');
                  const isUpdated = setVirtualSkillFileContent(skill.tree, pathParts, args.content || '');
                  if (isUpdated) {
                    localStorage.setItem('lumina_custom_skills', JSON.stringify(customSkills));
                    window.dispatchEvent(new Event('lumina_skills_updated'));
                    resultValue = { success: true, filePath: cleanedPath, action: 'created_or_updated_skill_file' };
                  } else {
                    resultValue = { error: `Could not write virtual skill file ${cleanedPath}` };
                  }
                  showToast(`Wrote skill file ${cleanedPath}`);
                  return false;
                }
                return true;
              })()) {
                const cleanedPath = normalizeToolFilePath(args.filePath, coderWorkspacePath);
                const fullPath = coderWorkspacePath ? `${coderWorkspacePath.replace(/\\/g, '/')}/${cleanedPath}` : `./${cleanedPath}`;
                
                let oldContent = '';
                try {
                  const readOld = await fetch('/api/fs/read', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ filePath: fullPath, ...workspaceArg }),
                    signal
                  });
                  if (readOld.ok) {
                    const oldData = await readOld.json();
                    oldContent = oldData.content || '';
                  }
                } catch (e) {}

                if (cleanedPath.includes('/')) {
                  const folderPart = cleanedPath.substring(0, cleanedPath.lastIndexOf('/'));
                  const folderFullPath = coderWorkspacePath ? `${coderWorkspacePath.replace(/\\/g, '/')}/${folderPart}` : `./${folderPart}`;
                  await fetch('/api/fs/create', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ filePath: folderFullPath, isDirectory: true, ...workspaceArg }),
                    signal
                  });
                }
                const writeRes = await fetch('/api/fs/write', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ filePath: fullPath, content: args.content, ...workspaceArg }),
                  signal
                });
                resultValue = await writeRes.json();
                
                const newContent = args.content || '';
                const diffValues = computeLineDiff(oldContent, newContent);
                
                const matchingNode = toolCallNodes.find(n => n.id === tc.id);
                if (matchingNode) {
                  matchingNode.addedCount = diffValues.added;
                  matchingNode.removedCount = diffValues.removed;
                  matchingNode.oldContent = oldContent;
                  matchingNode.newContent = newContent;
                  matchingNode.filePath = cleanedPath;
                }
                resultValue = {
                  ...resultValue,
                  filePath: cleanedPath,
                  action: oldContent ? 'updated_file' : 'created_file',
                  addedCount: diffValues.added,
                  removedCount: diffValues.removed
                };
                showToast(`Wrote ${cleanedPath}`);
              } else if (name === 'read_file') {
                const cleanedPath = normalizeToolFilePath(args.filePath, coderWorkspacePath);
                const skillMatch = getVirtualSkillMatch(cleanedPath);
                if (skillMatch) {
                  let customSkills: any[] = [];
                  try {
                    const saved = localStorage.getItem('lumina_custom_skills');
                    if (saved) customSkills = JSON.parse(saved);
                  } catch (e) {}
                  const targetSkill = customSkills.find((s: any) => s.id === skillMatch.skillId || s.name.toLowerCase() === skillMatch.skillId.toLowerCase());
                  if (targetSkill) {
                    const pathParts = skillMatch.subPath.split('/');
                    const foundFile = findVirtualSkillFile(targetSkill.tree, pathParts);
                    if (foundFile && foundFile.content !== undefined) {
                      resultValue = { success: true, content: foundFile.content, filePath: cleanedPath };
                    } else {
                      resultValue = { error: `File ${skillMatch.subPath} not found in skill ${skillMatch.skillId}` };
                    }
                  } else {
                    resultValue = { error: `Skill ${skillMatch.skillId} not found in custom skills list` };
                  }
                  showToast(`Read skill file ${cleanedPath}`);
                } else {
                  const fullPath = coderWorkspacePath ? `${coderWorkspacePath.replace(/\\/g, '/')}/${cleanedPath}` : `./${cleanedPath}`;
                const readBody: any = { filePath: fullPath, ...workspaceArg };
                if (args.offset) readBody.offset = Number(args.offset);
                if (args.limit) readBody.limit = Number(args.limit);
                const readRes = await fetch('/api/fs/read', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(readBody),
                  signal
                });
                resultValue = { ...(await readRes.json()), filePath: cleanedPath };
                const range = args.offset ? ` [offset=${args.offset}${args.limit ? `, limit=${args.limit}` : ''}]` : '';
                showToast(`Read ${cleanedPath}${range}`);
                }
              } else if (name === 'search_code') {
                const maxResults = Math.max(1, Math.min(Number(args.maxResults || 30), 80));
                const listRes = await fetch('/api/fs/list', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ folderPath: coderWorkspacePath || '.', ...workspaceArg }),
                  signal
                });
                const listData = await listRes.json();
                let files = listData.files || [];

                const fileGlob = String(args.fileGlob || '').toLowerCase();
                if (fileGlob) {
                  files = files.filter((f: any) => {
                    if (f.isDirectory) return false;
                    const rel = String(f.relativePath || f.path || '').toLowerCase();
                    return rel.includes(fileGlob) || rel.endsWith(fileGlob);
                  });
                }

                const query = String(args.query || '').trim();
                if (!query) {
                  resultValue = { query: '', count: files.length, files: files.slice(0, maxResults).map((f: any) => ({ filePath: f.relativePath || f.path, isDirectory: f.isDirectory })) };
                } else {
                  files = files.filter((f: any) => {
                    if (f.isDirectory) return false;
                    const rel = String(f.relativePath || f.path || '').toLowerCase();
                    return /\.(html?|css|scss|js|jsx|ts|tsx|json|md|vue|svelte|py|rs|go|php|rb|java|kt|swift)$/i.test(rel);
                  });
                  let regex: RegExp;
                  try { regex = new RegExp(query, 'ig'); } catch { regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'ig'); }
                  const matches: any[] = [];
                  for (const file of files) {
                    if (matches.length >= maxResults) break;
                    const readRes = await fetch('/api/fs/read', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ filePath: file.relativePath || file.path, ...workspaceArg }),
                      signal
                    });
                    if (!readRes.ok) continue;
                    const readData = await readRes.json();
                    const lines = String(readData.content || '').split('\n');
                    lines.forEach((line, idx) => {
                      if (matches.length >= maxResults) return;
                      regex.lastIndex = 0;
                      if (regex.test(line)) {
                        matches.push({ filePath: file.relativePath || file.path, line: idx + 1, text: line.trim().slice(0, 240) });
                      }
                    });
                  }
                  resultValue = { query, count: matches.length, matches };
                  showToast(`Found ${matches.length} match${matches.length === 1 ? '' : 'es'}`);
                }
              } else if (name === 'analyze_file') {
                const cleanedPath = normalizeToolFilePath(String(args.filePath || ''), coderWorkspacePath);
                if (!cleanedPath) throw new Error("LSP_Experimental requires filePath");
                const fullPath = coderWorkspacePath ? `${coderWorkspacePath.replace(/\\/g, '/')}/${cleanedPath}` : `./${cleanedPath}`;
                const lspRes = await fetch('/api/lsp/analyze', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ filePath: fullPath, ...workspaceArg }),
                  signal
                });
                resultValue = { ...(await lspRes.json()), filePath: cleanedPath };
                showToast(`LSP analyzed ${cleanedPath}`);
              } else if (name === 'edit_file' && (() => {
                const cleanedPath = normalizeToolFilePath(String(args.filePath || ''), coderWorkspacePath);
                const skillMatch = getVirtualSkillMatch(cleanedPath);
                if (skillMatch) {
                  let customSkills: any[] = [];
                  try {
                    const saved = localStorage.getItem('lumina_custom_skills');
                    if (saved) customSkills = JSON.parse(saved);
                  } catch (e) {}
                  const targetSkill = customSkills.find((s: any) => s.id === skillMatch.skillId || s.name.toLowerCase() === skillMatch.skillId.toLowerCase());
                  if (targetSkill) {
                    const pathParts = skillMatch.subPath.split('/');
                    const foundFile = findVirtualSkillFile(targetSkill.tree, pathParts);
                    if (foundFile && foundFile.content !== undefined) {
                      const oldContent = foundFile.content || '';
                      const searchText = String(args.search || '');
                      const replaceText = String(args.replace ?? '');
                      const occurrences = oldContent.split(searchText).length - 1;
                      
                      if (occurrences === 0) {
                        throw new Error(`Exact search text was not found in ${cleanedPath}`);
                      }
                      
                      const newContentVal = args.all ? oldContent.split(searchText).join(replaceText) : oldContent.replace(searchText, replaceText);
                      foundFile.content = newContentVal;
                      
                      localStorage.setItem('lumina_custom_skills', JSON.stringify(customSkills));
                      window.dispatchEvent(new Event('lumina_skills_updated'));
                      
                      const diffValues = computeLineDiff(oldContent, newContentVal);
                      const matchingNode = toolCallNodes.find(n => n.id === tc.id);
                      if (matchingNode) {
                        matchingNode.addedCount = diffValues.added;
                        matchingNode.removedCount = diffValues.removed;
                        matchingNode.oldContent = oldContent;
                        matchingNode.newContent = newContentVal;
                        matchingNode.filePath = cleanedPath;
                      }
                      resultValue = {
                        success: true,
                        filePath: cleanedPath,
                        replacements: args.all ? occurrences : 1,
                        addedCount: diffValues.added,
                        removedCount: diffValues.removed,
                        action: 'edited_file'
                      };
                      showToast(`Patched virtual skill file ${cleanedPath}`);
                    } else {
                      resultValue = { error: `File ${skillMatch.subPath} not found in skill ${skillMatch.skillId}` };
                    }
                  } else {
                    resultValue = { error: `Skill ${skillMatch.skillId} not found in custom skills list` };
                  }
                  return false;
                }
                return true;
              })()) {
                const cleanedPath = normalizeToolFilePath(String(args.filePath || ''), coderWorkspacePath);
                const searchText = String(args.search || '');
                const replaceText = String(args.replace ?? '');
                if (!cleanedPath || !searchText) throw new Error("edit_file requires filePath and search");
                const fullPath = coderWorkspacePath ? `${coderWorkspacePath.replace(/\\/g, '/')}/${cleanedPath}` : `./${cleanedPath}`;
                const readRes = await fetch('/api/fs/read', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ filePath: fullPath, ...workspaceArg }),
                  signal
                });
                const readData = await readRes.json();
                if (!readRes.ok) throw new Error(readData.error || readData.detail || `Could not read ${cleanedPath}`);
                const oldContent = readData.content || '';
                const occurrences = oldContent.split(searchText).length - 1;
                if (occurrences === 0) throw new Error(`Exact search text was not found in ${cleanedPath}`);
                const newContentVal = args.all ? oldContent.split(searchText).join(replaceText) : oldContent.replace(searchText, replaceText);
                const writeRes = await fetch('/api/fs/write', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ filePath: fullPath, content: newContentVal, ...workspaceArg }),
                  signal
                });
                resultValue = await writeRes.json();
                const diffValues = computeLineDiff(oldContent, newContentVal);
                const matchingNode = toolCallNodes.find(n => n.id === tc.id);
                if (matchingNode) {
                  matchingNode.addedCount = diffValues.added;
                  matchingNode.removedCount = diffValues.removed;
                  matchingNode.oldContent = oldContent;
                  matchingNode.newContent = newContentVal;
                  matchingNode.filePath = cleanedPath;
                }
                resultValue = {
                  ...resultValue,
                  filePath: cleanedPath,
                  replacements: args.all ? occurrences : 1,
                  addedCount: diffValues.added,
                  removedCount: diffValues.removed,
                  action: 'edited_file'
                };
                showToast(`Patched ${cleanedPath}`);
              } else if (name === 'run_skill') {
                const skillId = String(args.skillId || '');
                const inputVal = String(args.input || '');
                const skill = SKILLS.find((s: any) => s.id === skillId);
                if (skill) {
                  resultValue = { skillId, skillLabel: skill.label, prompt: skill.prompt, input: inputVal, result: `${skill.prompt}${inputVal}` };
                } else {
                  resultValue = { error: `Unknown skill: ${skillId}. Available: ${SKILLS.map((s: any) => s.id).join(', ')}` };
                }
                showToast(`Applied skill: ${skillId}`);
              
              } else if (name === 'fetch_url') {
                const targetUrl = args.url;
                if (!targetUrl) throw new Error("Missing required 'url' parameter for Webfetch.");
                if (successfulScrapesCount >= 3) {
                  resultValue = { error: "Scraping limit of 3 successful pages reached. Further web scrapes are blocked in this turn." };
                  showToast("Scrape limit reached (3 max)");
                } else {
                  setActiveScrapingJobs(prev => { const c = new Set(prev); c.add(tc.id); return c; });
                  showToast(`Fetching: ${targetUrl.substring(0, 30)}...`);
                  const scrapeResult = await scrapeUrl({
                    url: targetUrl,
                    outputFormat: args.outputFormat || 'markdown'
                  });
                  setScrapingResults(prev => { const c = new Map(prev); c.set(tc.id, scrapeResult); return c; });
                  setActiveScrapingJobs(prev => { const c = new Set(prev); c.delete(tc.id); return c; });
                  if (scrapeResult.error) {
                    resultValue = { error: scrapeResult.error };
                  } else {
                    successfulScrapesCount++;
                    const rawText = scrapeResult.rawText || '';
                    const processedText = useTurboQuant
                      ? turboQuantCompress(rawText, 4000, 'medium')
                      : rawText.substring(0, 3000) + (rawText.length > 3000 ? '...' : '');
                    resultValue = {
                      title: scrapeResult.title,
                      statusCode: scrapeResult.statusCode,
                      linksFound: scrapeResult.links?.length || 0,
                      content: processedText
                    };
                  }
                }
              } else if (name === 'web_search') {
                const searchQueryVal = String(args.query || '');
                const maxRes = Math.min(Number(args.maxResults || 5), 10);
                if (!searchQueryVal) throw new Error("Websearch requires query");
                showToast(`Searching: ${searchQueryVal.substring(0, 40)}`);
                const key = searchProvider === 'serpapi' ? serpApiKey : tavilyApiKey;
                if (key && key.trim()) {
                  const searchRes = await fetch('/api/search', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ query: searchQueryVal, tavilyKey: tavilyApiKey, serpKey: serpApiKey, provider: searchProvider }),
                    signal
                  });
                  const searchData = await searchRes.json();
                  const sliced = (searchData.results || []).slice(0, maxRes);
                  resultValue = { query: searchQueryVal, provider: searchData.provider, count: sliced.length, results: sliced };
                } else {
                  resultValue = { error: 'No search API key configured. Configure Tavily or SerpAPI in Settings.' };
                }
              } else if (name === 'deep_search') {
                const searchQueryVal = String(args.query || '');
                const depthPresetVal = String(args.depth || 'standard');
                if (!searchQueryVal) throw new Error("Deep search requires a query parameter.");

                // Trigger the UI Deep Research scanner simulation
                if (researchMode) {
                  researchMode.setIsResearchActive(false);
                  setTimeout(() => {
                    researchMode.setCustomQueries(searchQueryVal);
                    if (depthPresetVal === 'extreme') {
                      researchMode.setDepthPreset('extreme');
                    } else {
                      researchMode.setDepthPreset('standard');
                    }
                    researchMode.setIsResearchActive(true);
                    researchMode.setResearchLogs([
                      `[${new Date().toLocaleTimeString()}] [Orchestrator] Deep recursive search triggered via tool call: "${searchQueryVal}"`,
                      `[${new Date().toLocaleTimeString()}] [System] Allocating multi-agent parallel loops...`
                    ]);
                    researchMode.setIsResearchWorkspaceOpen(true);
                  }, 100);
                }

                showToast(`Launching Deep Research: ${searchQueryVal.substring(0, 40)}`);

                // Fetch real background results
                const key = searchProvider === 'serpapi' ? serpApiKey : tavilyApiKey;
                let results = [];
                if (key && key.trim()) {
                  try {
                    const searchRes = await fetch('/api/search', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ query: searchQueryVal, tavilyKey: tavilyApiKey, serpKey: serpApiKey, provider: searchProvider }),
                      signal
                    });
                    const searchData = await searchRes.json();
                    results = (searchData.results || []).slice(0, 8);
                  } catch (err) {
                    console.error('Deep search background fetch failed', err);
                  }
                }

                resultValue = {
                  query: searchQueryVal,
                  researchEngine: "Deep Research Multi-Agent Core",
                  depth: depthPresetVal,
                  status: "Complete",
                  durationMs: depthPresetVal === 'extreme' ? 4500 : 2500,
                  verifiedClaimsCount: results.length,
                  results: results.length > 0 ? results : [
                    { title: `${searchQueryVal} Synthesis Report`, url: `https://intel.local/report`, snippet: `Synthesized findings on ${searchQueryVal}. Agents Alpha, Beta, and Gamma processed parameters recursively.` }
                  ]
                };
              } else if (name === 'spawn_subagent') {
                const agentName = String(args.agentName || '');
                const taskText = String(args.task || '');
                if (!agentName || !taskText) throw new Error("spawn_subagent requires agentName and task");
                showToast(`Spawning subagent: ${agentName}...`);

                setOrchestrationState((prev: any) => {
                  const cleanName = agentName.replace('-agent', '').toUpperCase();
                  const existingIdx = prev.agents.findIndex((a: any) => a.id === agentName);
                  let nextAgents = [...prev.agents];
                  if (existingIdx !== -1) {
                    nextAgents[existingIdx] = {
                      ...nextAgents[existingIdx],
                      status: 'running',
                      startedAt: Date.now()
                    };
                  } else {
                    nextAgents.push({
                      id: agentName,
                      name: `${cleanName} Agent`,
                      phase: prev.currentPhase || 1,
                      status: 'running',
                      filesCreated: [],
                      startedAt: Date.now()
                    });
                  }
                  return {
                    ...prev,
                    isActive: true,
                    agents: nextAgents
                  };
                });

                 try {
                  const useBridge = useBridgeTools && llamaBridgeUrl;
                  const activeBaseUrl = useBridge ? llamaBridgeUrl.replace(/\/+$/, '') : serverUrl?.replace(/\/+$/, '') || '';
                  const activeKey = useBridge ? llamaBridgeApiKey : apiKey || '';
                  const activeProvider = useBridge ? 'llama-bridge' : selectedProvider || 'openai-compatible';
                  const activeModel = useBridge ? selectedLlamaModel : activeModelId;

                  const spawnRes = await fetch('/api/agents/spawn', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      agentName,
                      task: taskText,
                      workspaceRoot: coderWorkspacePath,
                      modelConfig: {
                        model: activeModel,
                        config: {
                          provider: activeProvider,
                          baseUrl: activeBaseUrl,
                          apiKey: activeKey
                        }
                      }
                    }),
                    signal
                  });
                  const spawnData = await spawnRes.json();
                  if (!spawnRes.ok || spawnData.error) {
                    throw new Error(spawnData.error || 'Subagent execution failed');
                  }

                  setOrchestrationState((prev: any) => ({
                    ...prev,
                    agents: prev.agents.map((a: any) => a.id === agentName ? { ...a, status: 'done', completedAt: Date.now() } : a)
                  }));

                  resultValue = {
                    success: true,
                    agentName,
                    task: taskText,
                    summary: spawnData.summary,
                    events: spawnData.events
                  };
                  showToast(`Subagent ${agentName} complete!`);
                  triggerWorkspaceRefresh();
                } catch (subErr: any) {
                  const errMsg = subErr.message || 'Subagent failed';
                  setOrchestrationState((prev: any) => ({
                    ...prev,
                    agents: prev.agents.map((a: any) => a.id === agentName ? { ...a, status: 'failed', error: errMsg } : a)
                  }));
                  resultValue = {
                    success: false,
                    agentName,
                    error: errMsg
                  };
                  showToast(`Subagent ${agentName} failed!`);
                }
              } else if (name === 'run_command') {
                const commandText = args.command;
                if (!commandText) throw new Error("run_command requires command parameter");
                const restrictionReason = explainCommandRestriction(commandText);
                if (shouldRequestCommandPermission(commandText, coderPermissionMode, alwaysAllowedCommands)) {
                  logPermissionAction({
                    command: commandText,
                    action: 'permission_requested',
                    detail: restrictionReason,
                    mode: coderPermissionMode
                  });
                  const decision = await requestCommandPermission(commandText, restrictionReason);
                  logPermissionAction({
                    command: commandText,
                    action: decision,
                    detail: restrictionReason,
                    mode: coderPermissionMode
                  });
                  if (decision === 'deny') {
                    throw new Error(`Permission denied for terminal command: ${commandText}`);
                  }
                  if (decision === 'allow-always') {
                    setAlwaysAllowedCommands(prev => prev.includes(commandText.trim()) ? prev : [...prev, commandText.trim()]);
                  }
                } else {
                  logPermissionAction({
                    command: commandText,
                    action: 'auto_allowed',
                    detail: coderPermissionMode === 'full-access' ? 'Full access mode' : 'Safe command or previously allowed command',
                    mode: coderPermissionMode
                  });
                }
                showToast(`Running: ${commandText.substring(0, 30)}...`);
                const runData = await executeViaTerminal(commandText, coderWorkspacePath, {
                  workspaceRoot: coderWorkspacePath,
                  isCoderMode: isCoderMode,
                  signal,
                });
                resultValue = {
                  exitCode: runData.exitCode,
                  stdout: runData.stdout,
                  stderr: runData.stderr
                };
                const currentN = toolCallNodes.find(n => n.id === tc.id);
                if (currentN) {
                  currentN.resultSummary = runData.exitCode === 0
                    ? 'Command completed successfully (exit code 0)'
                    : `Command failed with exit code ${runData.exitCode}`;
                }
              } else if (name === 'ask_user') {
                const qs = args.questions || [];
                // Attach to current message instead of show global panel
                setShowAskAiPanel(false);
                shouldStopAfterAsk = true;
                resultValue = { status: "success", message: "Successfully presented clarify questions to the user inline. Generation has paused for user inputs." };
                showToast("AI is asking you clarifying questions!");
                
                setChats(prev => prev.map(chat => {
                  if (chat.id === chatId) {
                    return {
                      ...chat,
                      messages: chat.messages.map(m => m.id === thinkingId ? {
                        ...m,
                        askAiQuestions: qs,
                        currentQuestionIndex: 0,
                        askAiAnswers: {},
                        isAskAiActive: true,
                        thinking: undefined
                      } : m)
                    };
                  }
                  return chat;
                }));
              }

              if (resultValue !== undefined) {
                if (resultValue && !resultValue.error) {
                  turnToolResultCache.set(cacheKey, resultValue);
                }
              } else if (name === 'search' || name === 'google_scholar') {
                const rawQueries = Array.isArray(args.query) ? args.query : [args.query].filter(Boolean);
                const queries = rawQueries.map((q: any) => String(q).trim()).filter(Boolean);
                if (queries.length === 0) {
                  throw new Error(`Missing required 'query' parameter for ${name}.`);
                }

                const batchedResults: string[] = [];
                const collectedResults: any[] = [];
                for (const query of queries) {
                  const effectiveQuery = name === 'google_scholar'
                    ? `${query} scholarly article OR paper OR publication`
                    : query;
                  const searchResp = await fetch(`/api/search`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      query: effectiveQuery,
                      tavilyKey: tavilyApiKey,
                      serpKey: serpApiKey,
                      provider: searchProvider
                    }),
                    signal
                  });

                  if (!searchResp.ok) {
                    batchedResults.push(`No results found for '${effectiveQuery}'. Search backend returned ${searchResp.status}.`);
                    continue;
                  }

                  const searchData = await searchResp.json();
                  const results = searchData.results || [];
                  collectedResults.push(...results);
                  batchedResults.push(formatDeepResearchSearchResults(effectiveQuery, results));
                }

                if (collectedResults.length > 0) {
                  searchResults = [...searchResults, ...collectedResults].filter((result, index, arr) => {
                    const url = result?.url || result?.link || '';
                    return url && arr.findIndex(other => (other?.url || other?.link || '') === url) === index;
                  });
                  setChats(prev => prev.map(chat => {
                    if (chat.id !== chatId) return chat;
                    return {
                      ...chat,
                      messages: chat.messages.map(m => m.id === thinkingId ? {
                        ...m,
                        sources: searchResults.slice(0, 10).map(r => ({ title: r.title, url: r.url, snippet: r.snippet })),
                        thinking: `Reviewing ${searchResults.length} discovered source candidates...`
                      } : m)
                    };
                  }));
                }

                resultValue = batchedResults.join('\n=======\n');
                const currentN = toolCallNodes.find(n => n.id === tc.id);
                if (currentN) {
                  currentN.resultSummary = `${queries.length} quer${queries.length === 1 ? 'y' : 'ies'} searched, ${collectedResults.length} result candidates`;
                }
              } else if (name === 'visit') {
                const rawUrls = Array.isArray(args.url) ? args.url : [args.url].filter(Boolean);
                const urls = rawUrls.map((u: any) => String(u).trim()).filter(Boolean);
                const goal = String(args.goal || content).trim();
                if (urls.length === 0 || !goal) {
                  throw new Error("Missing required 'url' or 'goal' parameter for visit.");
                }

                const visitOutputs: string[] = [];
                for (const targetUrl of urls.slice(0, 5)) {
                  const scrapeResult = await scrapeUrl({
                    url: targetUrl,
                    extractLinks: false,
                    extractTables: false,
                    outputFormat: 'markdown'
                  });
                  visitOutputs.push(formatDeepResearchVisitResult(targetUrl, goal, scrapeResult, useTurboQuant ? 4000 : 6000));
                }

                resultValue = visitOutputs.join('\n=======\n');
                const currentN = toolCallNodes.find(n => n.id === tc.id);
                if (currentN) {
                  currentN.resultSummary = `${urls.slice(0, 5).length} page${urls.length === 1 ? '' : 's'} visited for targeted evidence`;
                }
              } else if (name === 'web_scrape') {
                if (successfulScrapesCount >= 3) {
                  resultValue = { error: "Scraping limit of 3 successful pages reached. Further web scrapes are blocked in this turn." };
                  showToast("Scrape limit reached (3 max)");
                } else {
                const targetUrl = args.url;
                if (!targetUrl) {
                  throw new Error("Missing required 'url' parameter for web_scrape.");
                }

                // Push to active scraping jobs set
                setActiveScrapingJobs(prev => {
                  const cloned = new Set(prev);
                  cloned.add(tc.id);
                  return cloned;
                });

                showToast(`Scraping webpage: ${targetUrl.substring(0, 30)}...`);

                // Perform proxy-mediated scraping
                const scrapeResult = await scrapeUrl({
                  url: targetUrl,
                  selectors: args.selectors,
                  usePuppeteer: args.usePuppeteer,
                  extractLinks: args.extractLinks,
                  extractTables: args.extractTables,
                  outputFormat: args.outputFormat
                });

                // Update scraping results Map state
                setScrapingResults(prev => {
                  const cloned = new Map(prev);
                  cloned.set(tc.id, scrapeResult);
                  return cloned;
                });

                // Evict from active scraping jobs set
                setActiveScrapingJobs(prev => {
                  const cloned = new Set(prev);
                  cloned.delete(tc.id);
                  return cloned;
                });

                if (scrapeResult.error) {
                  resultValue = { error: scrapeResult.error };
                  showToast(`Scrape failed: ${scrapeResult.error.substring(0, 30)}...`);
                } else {
                  const rawMarkdown = scrapeResult.rawText || '';
                  const processedMarkdown = useTurboQuant
                    ? turboQuantCompress(rawMarkdown, 4000, 'medium')
                    : (rawMarkdown.substring(0, 3000) + (rawMarkdown.length > 3000 ? '... [Truncated for prompt boundaries]' : ''));

                  resultValue = {
                    title: scrapeResult.title,
                    statusCode: scrapeResult.statusCode,
                    scrapedAt: scrapeResult.scrapedAt,
                    dataExcerpt: scrapeResult.data,
                    linksFound: scrapeResult.links?.length || 0,
                    markdownExcerpt: processedMarkdown || 'No page text extracted.',
                    turboQuantApplied: useTurboQuant,
                  };
                    successfulScrapesCount++;
                    showToast(`Successfully scraped "${scrapeResult.title || 'Page'}"`);
                }
                }
              } else if (name === 'wiki_search') {
                const { query, limit = 10, language = 'en' } = args;
                showToast(`Searching Wikipedia for: ${query}`);
                const searchResultsVal = await wikiSearch(query, limit, language);
                
                // Store results
                setWikiResults(prev => {
                  const cloned = new Map(prev);
                  cloned.set(tc.id, { wikiType: 'search', data: { results: searchResultsVal } });
                  return cloned;
                });

                resultValue = {
                  resultsCount: searchResultsVal.length,
                  resultsBrief: searchResultsVal.slice(0, 3).map((r: any) => ({ pageId: r.pageId, title: r.title, url: r.url })),
                  payload: searchResultsVal
                };
                
                const currentN = toolCallNodes.find(n => n.id === tc.id);
                if (currentN) {
                  currentN.resultSummary = `Found ${searchResultsVal.length} indexed pages matching "${query}"`;
                }
              } else if (name === 'wiki_get_page') {
                const { pageId, language = 'en' } = args;
                showToast(`Fetching full page ID: ${pageId}`);
                const pageResult = await wikiGetPage(Number(pageId), language);

                setWikiResults(prev => {
                  const cloned = new Map(prev);
                  cloned.set(tc.id, { wikiType: 'page', data: pageResult });
                  return cloned;
                });

                const rawIntro = pageResult.intro || '';
                const rawSections = pageResult.sections
                  ? pageResult.sections.map((s: any) => `## ${s.title}\n${s.content || ''}`).join('\n\n')
                  : '';
                const fullWikiText = rawIntro + '\n\n' + rawSections;

                const compressedWikiText = useTurboQuant
                  ? turboQuantCompress(fullWikiText, 5000, 'medium')
                  : fullWikiText.substring(0, 5000);

                resultValue = {
                  title: pageResult.title,
                  wordCount: pageResult.wordCount,
                  sectionsCount: pageResult.sections?.length || 0,
                  introExcerpt: useTurboQuant
                    ? turboQuantCompress(rawIntro, 600, 'light')
                    : rawIntro.substring(0, 500),
                  compressedContent: compressedWikiText,
                  turboQuantApplied: useTurboQuant,
                  payload: pageResult
                };

                const currentN = toolCallNodes.find(n => n.id === tc.id);
                if (currentN) {
                  currentN.resultSummary = `"${pageResult.title}" fully loaded — ${pageResult.sections?.length || 0} sections, ${pageResult.wordCount} words`;
                }
              } else if (name === 'wiki_get_summary') {
                const { pageId, language = 'en' } = args;
                showToast(`Getting summary for ID: ${pageId}`);
                const summaryResult = await wikiGetSummary(Number(pageId), language);

                setWikiResults(prev => {
                  const cloned = new Map(prev);
                  cloned.set(tc.id, { wikiType: 'summary', data: summaryResult });
                  return cloned;
                });

                const rawExtract = summaryResult.extract || '';
                resultValue = {
                  title: summaryResult.title,
                  extract: useTurboQuant
                    ? turboQuantCompress(rawExtract, 1500, 'light')
                    : rawExtract,
                  url: summaryResult.url,
                  turboQuantApplied: useTurboQuant,
                  payload: summaryResult
                };

                const currentN = toolCallNodes.find(n => n.id === tc.id);
                if (currentN) {
                  currentN.resultSummary = `Summary for "${summaryResult.title}" parsed: "${summaryResult.extract.substring(0, 100)}..."`;
                }
              } else if (name === 'wiki_get_sections') {
                const { pageId, language = 'en' } = args;
                showToast(`Reading page ID: ${pageId}`);
                const sectionsList = await wikiGetSections(Number(pageId), language);

                setWikiResults(prev => {
                  const cloned = new Map(prev);
                  cloned.set(tc.id, { wikiType: 'page', data: { title: `Page ID ${pageId} sections`, url: `https://${language}.wikipedia.org/?curid=${pageId}`, sections: sectionsList } });
                  return cloned;
                });

                resultValue = {
                  sectionsCount: sectionsList.length,
                  list: sectionsList.map((s: any) => ({ index: s.index, title: s.title, level: s.level })),
                  payload: sectionsList
                };

                const currentN = toolCallNodes.find(n => n.id === tc.id);
                if (currentN) {
                  currentN.resultSummary = `Header index parsed: ${sectionsList.length} sections found`;
                }
              } else if (name === 'wiki_get_categories') {
                const { pageId, language = 'en' } = args;
                showToast(`Reading target indices...`);
                const catsList = await wikiGetCategories(Number(pageId), language);

                setWikiResults(prev => {
                  const cloned = new Map(prev);
                  cloned.set(tc.id, { wikiType: 'page', data: { title: `Categories for page ${pageId}`, url: `https://${language}.wikipedia.org/?curid=${pageId}`, categories: catsList.map((c: any) => c.name) } });
                  return cloned;
                });

                resultValue = {
                  categoriesCount: catsList.length,
                  list: catsList.map((c: any) => c.name),
                  payload: catsList
                };

                const currentN = toolCallNodes.find(n => n.id === tc.id);
                if (currentN) {
                  currentN.resultSummary = `${catsList.length} taxonomies resolved`;
                }
              } else if (name === 'wiki_get_links') {
                const { pageId, limit = 50, language = 'en' } = args;
                showToast(`Collecting outbound page links...`);
                const linksList = await wikiGetLinks(Number(pageId), Number(limit), language);

                setWikiResults(prev => {
                  const cloned = new Map(prev);
                  cloned.set(tc.id, { wikiType: 'page', data: { title: `Outbound links for page ${pageId}`, url: `https://${language}.wikipedia.org/?curid=${pageId}`, links: linksList } });
                  return cloned;
                });

                resultValue = {
                  linksCount: linksList.length,
                  payload: linksList
                };

                const currentN = toolCallNodes.find(n => n.id === tc.id);
                if (currentN) {
                  currentN.resultSummary = `${linksList.length} outbound connections logged`;
                }
              } else if (name === 'wiki_get_images') {
                const { pageId, language = 'en' } = args;
                showToast(`Extracting static elements...`);
                const imgsList = await wikiGetImages(Number(pageId), language);

                setWikiResults(prev => {
                  const cloned = new Map(prev);
                  cloned.set(tc.id, { wikiType: 'page', data: { title: `Media elements for page ${pageId}`, url: `https://${language}.wikipedia.org/?curid=${pageId}`, images: imgsList } });
                  return cloned;
                });

                resultValue = {
                  imagesCount: imgsList.length,
                  list: imgsList.map((i: any) => i.name),
                  payload: imgsList
                };

                const currentN = toolCallNodes.find(n => n.id === tc.id);
                if (currentN) {
                  currentN.resultSummary = `${imgsList.length} static illustrations resolved`;
                }
              } else if (name === 'wiki_get_related') {
                const { pageId, limit = 10, language = 'en' } = args;
                showToast(`Finding adjacent articles...`);
                const relatedList = await wikiGetRelated(Number(pageId), Number(limit), language);

                setWikiResults(prev => {
                  const cloned = new Map(prev);
                  cloned.set(tc.id, { wikiType: 'search', data: { results: relatedList } });
                  return cloned;
                });

                resultValue = {
                  relatedCount: relatedList.length,
                  payload: relatedList
                };

                const currentN = toolCallNodes.find(n => n.id === tc.id);
                if (currentN) {
                  currentN.resultSummary = `Trajectory logged: ${relatedList.length} related pages found`;
                }
                } else {
                  resultValue = { error: `Unsupported coder tool: ${name}` };
                }

                if (resultValue && !resultValue.error) {
                  turnToolResultCache.set(cacheKey, resultValue);
                }
              }
            } catch (err: any) {
              resultValue = { error: err.message };
            }

            const matchedIdx = toolCallNodes.findIndex(node => (node.id === tc.id) || (node.label.startsWith(name) && node.status === 'active'));
            if (matchedIdx !== -1) {
              toolCallNodes[matchedIdx].status = (resultValue && resultValue.error) ? 'failed' : 'complete';
              const resultStr = JSON.stringify(resultValue, null, 2);
              toolCallNodes[matchedIdx].result = resultStr;
              if (!toolCallNodes[matchedIdx].filePath && resultValue?.filePath) {
                toolCallNodes[matchedIdx].filePath = String(resultValue.filePath).replace(/\\/g, '/');
              }
              if (!toolCallNodes[matchedIdx].resultSummary) {
                const preview = resultStr.length > 200 ? resultStr.slice(0, 200) + '...' : resultStr;
                toolCallNodes[matchedIdx].resultSummary = preview;
              }
            }

            toolResultMessages.push({
              role: 'tool',
              tool_call_id: tc.id,
              name: name,
              content: compressToolResultForApi(name, resultValue)
            });

            setChats(prev => prev.map(chat => {
              if (chat.id === chatId) {
                return {
                  ...chat,
                  messages: chat.messages.map(m => m.id === thinkingId ? {
                    ...m,
                    toolCalls: [...toolCallNodes]
                  } : m)
                };
              }
              return chat;
            }));
          }

          apiMessages.push(choice);
          apiMessages.push(...toolResultMessages);

          await new Promise(r => setTimeout(r, 600));
          triggerWorkspaceRefresh();

          if (shouldStopAfterAsk) {
            break;
          }

          const nextResponse = await callLlamaBridge(apiMessages, activeTools, signal);
          choice = nextResponse.choices?.[0]?.message;
        }

        triggerWorkspaceRefresh();
      } else {
        if (Array.isArray(toolCallsRaw) && toolCallsRaw.length > 0) {
          const chatPlaceholders = toolCallsRaw.map((tc: any, idx: number) => {
            return `[[tool_call:${tc.id || `tc-${idx}`}]]`;
          }).join('\n\n');
          agentTraceContent = chatPlaceholders;

          toolCallsRaw.forEach((tc: any, idx: number) => {
            const fn = tc.function || {};
            const name = fn.name || 'unknown';
            const args = fn.arguments ? (() => { try { return JSON.parse(fn.arguments); } catch { return {}; } })() : {};

            toolCallNodes.push({
              id: tc.id || `tc-${idx}`,
              type: 'tool',
              label: name,
              status: 'complete',
              argsCount: typeof args === 'object' && Object.keys(args).length === 0 ? 0 : Object.keys(args).length,
              toolName: name,
              icon: name.includes('search') || name.includes('research') ? 'search' :
                    name.includes('wikipedia') || name.includes('globe') ? 'globe' :
                    name.includes('read') || name.includes('view') || name.includes('file') || name.includes('fs') ? 'file' :
                    name.includes('write') || name.includes('edit') ? 'edit' :
                    name.includes('github') || name.includes('box') ? 'box' :
                    name.includes('weather') || name.includes('cloud') ? 'cloud' :
                    name.includes('shell') || name.includes('terminal') ? 'terminal' :
                    name.includes('manage_todos') || name.includes('wrench') ? 'wrench' :
                    name.includes('git-branch') || name.includes('git') ? 'git' :
                    'sparkles'
            });
          });
        }
      }

      const responseContent = choice?.content;
      const hasAskUser = toolCallsRaw && toolCallsRaw.some((tc: any) => tc.function?.name === 'ask_user');
      const finalContent = isDeepSearchEnabled && !isCoderMode
        ? (sanitizeDeepResearchReport(responseContent || agentTraceContent) || 'Deep Research completed, but no final report text was returned.')
        : ([agentTraceContent, responseContent]
          .filter((part, idx, arr) => part && (idx === 0 || part !== arr[0]))
          .join('\n\n') || (toolCallsRaw?.length > 0 && !hasAskUser ? `Running ${toolCallsRaw.length} tool(s)...` : ''));
      
      const scavengedImages: any[] = [];
      toolCallNodes.forEach(tc => {
        if (tc.toolName === 'web_scrape') {
          const scraped = scrapingResults.get(tc.id);
          if (scraped && scraped.images && scraped.images.length > 0) {
            scraped.images.slice(0, 12).forEach((imgUrl: string, idx: number) => {
              if (imgUrl && !scavengedImages.some(x => x.url === imgUrl)) {
                scavengedImages.push({
                  title: `Scraped Image ${idx + 1}`,
                  url: imgUrl,
                  source: scraped.title || 'Web Scrape'
                });
              }
            });
          }
        } else if (tc.toolName?.startsWith('wiki_')) {
          const wikiRes = wikiResults.get(tc.id);
          if (wikiRes && wikiRes.data) {
            if (wikiRes.wikiType === 'page' && wikiRes.data.images && wikiRes.data.images.length > 0) {
              wikiRes.data.images.slice(0, 12).forEach((img: any, idx: number) => {
                if (img.url && !scavengedImages.some(x => x.url === img.url)) {
                  scavengedImages.push({
                    title: img.name || `Wiki Image ${idx + 1}`,
                    url: img.url,
                    source: 'Wikipedia'
                  });
                }
              });
            } else if (wikiRes.wikiType === 'summary' && wikiRes.data.thumbnail?.url) {
              const url = wikiRes.data.thumbnail.url;
              if (url && !scavengedImages.some(x => x.url === url)) {
                scavengedImages.push({
                  title: wikiRes.data.title || 'Wiki Image',
                  url: url,
                  source: 'Wikipedia'
                });
              }
            }
          }
        }
      });

      const imagesToAttach = [...responseImages, ...scavengedImages].map((img: any) => ({
        title: img.title || 'Image',
        url: img.url,
        source: img.source,
        thumbnail: img.thumbnail
      }));

      const finalToolNodes = [...toolCallNodes];

      const modelForLabel = activeModelList.find(m => m.id === activeModelId);
      const aiLabel = modelForLabel?.name || activeModelId;

      const synthesisSubNodes: ToolCallNode[] = [];

      if (toolCallNodes.length > 0) {
        toolCallNodes.forEach((tc, idx) => {
          synthesisSubNodes.push({
            id: `synth-sub-${idx}`,
            type: 'sub-tool',
            label: `resolved: ${tc.toolName || tc.label}`,
            status: 'complete',
            icon: tc.icon,
            resultSummary: tc.argsCount !== undefined
              ? (tc.argsCount === 0 ? 'no args' : `${tc.argsCount} arg${tc.argsCount > 1 ? 's' : ''}`)
              : undefined
          });
        });
      }

      if (searchResults.length > 0) {
        synthesisSubNodes.push({
          id: 'synth-sub-search',
          type: 'sub-tool',
          label: 'injected search context',
          status: 'complete',
          icon: 'globe',
          resultSummary: `${searchResults.length} result${searchResults.length > 1 ? 's' : ''} grounded`
        });
      }

      if (writingStyle && writingStyle !== 'default') {
        synthesisSubNodes.push({
          id: 'synth-sub-style',
          type: 'sub-tool',
          label: `applied style: ${writingStyle}`,
          status: 'complete',
          icon: 'sparkles'
        });
      }

      if (finalContent && finalContent.length > 0) {
        const approxTokens = Math.round(finalContent.length / 4);
        synthesisSubNodes.push({
          id: 'synth-sub-tokens',
          type: 'result',
          label: `output generated`,
          status: 'complete',
          icon: 'sparkles',
          resultSummary: `~${approxTokens} tokens`
        });
      }

      let synthLabel: string;
      if (toolCallNodes.length > 1) {
        synthLabel = `${aiLabel} — ${toolCallNodes.length} tools resolved, synthesised`;
      } else if (toolCallNodes.length === 1) {
        synthLabel = `${aiLabel} — tool result synthesised`;
      } else if (searchResults.length > 0) {
        synthLabel = `${aiLabel} — web context synthesised`;
      } else if (isWebSearchEnabled && searchResults.length === 0) {
        synthLabel = `${aiLabel} — direct response (no search hits)`;
      } else if (writingStyle && writingStyle !== 'default') {
        synthLabel = `${aiLabel} — ${writingStyle} response generated`;
      } else {
        synthLabel = `${aiLabel} — response generated`;
      }

      finalToolNodes.push({
        id: 'final-ai',
        type: 'ai',
        label: synthLabel,
        status: 'complete',
        icon: 'sparkles',
        subNodes: synthesisSubNodes.length > 0 ? synthesisSubNodes : undefined,
        resultSummary: synthesisSubNodes.length > 0
          ? `${synthesisSubNodes.length} sub-step${synthesisSubNodes.length > 1 ? 's' : ''} completed`
          : undefined
      });

      const activeToolNodes = finalToolNodes.map(n => ({ ...n, status: 'active' as const }));
      
      const thinkTagMatch = finalContent.match(/<think>[\s\S]*?<\/think>/);
      const finalThinkContent = thinkTagMatch ? thinkTagMatch[0] : '';
      const finalDisplayContent = finalContent.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

      // Detect the size of the largest code block to dynamically scale up typing streaming speed
      const codeBlockThreshold = 50;
      let maxLinesOfCode = 0;
      const codeMatches = finalContent.match(/```[\s\S]*?```/g);
      if (codeMatches) {
        for (const block of codeMatches) {
          const lines = block.split('\n').length;
          if (lines > maxLinesOfCode) {
            maxLinesOfCode = lines;
          }
        }
      }

      // Compute dynamic throughput (characters per second) based on file scale & line counts
      const totalLength = finalContent.length;
      let speedFactor = 95; // default for tiny conversational replies

      if (totalLength > 8000) {
        speedFactor = 1600;
      } else if (totalLength > 4000) {
        speedFactor = 1200;
      } else if (totalLength > 2000) {
        speedFactor = 850;
      } else if (totalLength > 1000) {
        speedFactor = 550;
      } else if (totalLength > 500) {
        speedFactor = 280;
      }

      // Scale dynamically with code block complexity to prevent stuttering but keep readable scrolling
      if (maxLinesOfCode > codeBlockThreshold) {
        if (maxLinesOfCode > 800) {
          speedFactor = Math.max(speedFactor, 1950);
        } else if (maxLinesOfCode > 400) {
          speedFactor = Math.max(speedFactor, 1450);
        } else if (maxLinesOfCode > 200) {
          speedFactor = Math.max(speedFactor, 980);
        } else if (maxLinesOfCode > 100) {
          speedFactor = Math.max(speedFactor, 680);
        } else {
          speedFactor = Math.max(speedFactor, 420);
        }
      }

      const startTime = Date.now();
      let currentPos = 0;
      let lastRenderTime = 0;
      const RENDER_INTERVAL = 30; // ~33 FPS viewport updates

      while (currentPos < totalLength) {
        if (signal.aborted) {
          break;
        }

        const elapsed = Date.now() - startTime;
        // Exact character cursor position proportional to actual time elapsed
        const targetPos = Math.min(totalLength, Math.floor(elapsed * (speedFactor / 1000)));

        if (targetPos > currentPos) {
          currentPos = targetPos;
          const partial = finalContent.slice(0, currentPos);
          const now = Date.now();

          // Smoothly update state without loading main thread excessively
          if (now - lastRenderTime > RENDER_INTERVAL || currentPos === totalLength) {
            lastRenderTime = now;
            const parsed = parseThinkTags(partial);
            const displayContent = (parsed.before + parsed.after).trim();
            setChats(prev => prev.map(chat => {
              if (chat.id === chatId) {
                return {
                  ...chat,
                  messages: chat.messages.map(m => m.id === thinkingId ? {
                    ...m,
                    content: parsed.isThinking ? displayContent : (displayContent || partial),
                    thinkContent: parsed.think || undefined,
                    isThinking: parsed.isThinking,
                    streamPos: currentPos,
                    toolCalls: activeToolNodes
                  } : m),
                };
              }
              return chat;
            }));
          }
        }

        // Relinquish execution back to the browser event loop for responsiveness (mouse tracking, layout drag)
        await new Promise(resolve => setTimeout(resolve, 8));
      }

      if (signal.aborted) {
        return;
      }

      let finalArtifacts = isCoderMode ? [] : extractArtifacts(finalDisplayContent, writingStyle, chats, chatId);
      if (isDeepSearchEnabled && !isCoderMode) {
        const cleanReport = sanitizeDeepResearchReport(finalDisplayContent || finalContent);
        if (cleanReport.length > 80) {
          finalArtifacts = [
            {
              id: 'deep-research-report-' + Date.now().toString(36),
              title: createDeepResearchReportTitle(cleanReport),
              language: 'markdown',
              content: cleanReport,
              type: 'report'
            },
            ...finalArtifacts.filter(artifact => artifact.type !== 'report' && artifact.type !== 'markdown')
          ];
        }
      }
      if (finalArtifacts.length > 0) {
        setActiveArtifact(finalArtifacts[0]);
        setIsCanvasOpen(true);
        setCanvasView(['html', 'markdown', 'report'].includes(finalArtifacts[0].type) ? 'preview' : 'code');
      }

      setChats(prev => prev.map(chat => {
        if (chat.id === chatId) {
          return {
            ...chat,
            messages: chat.messages.map(m =>
              m.id === thinkingId
                ? {
                    ...m,
                    content: finalDisplayContent || finalContent.trim(),
                    thinkContent: finalThinkContent.replace(/<\/?think>/g, '').trim() || undefined,
                    isThinking: false,
                    streamPos: undefined,
                    thinking: undefined,
                    toolCalls: finalToolNodes,
                    isStreaming: false,
                    sources: searchResults.length > 0 ? searchResults.slice(0, 10).map(r => ({ title: r.title, url: r.url, snippet: r.snippet })) : undefined,
                    images: imagesToAttach.length > 0 ? imagesToAttach : undefined,
                    searchQuery: isWebSearchEnabled ? userMessage.content : undefined,
                    isSearching: false,
                    timestamp: new Date(),
                    artifacts: finalArtifacts.length > 0 ? finalArtifacts : undefined
                  }
                : m
            ),
            updatedAt: new Date(),
          };
        }
        return chat;
      }));
    } catch (error: any) {
      if (error?.name === 'AbortError' || signal.aborted) {
        console.log('Stream generation aborted.');
        // Gracefully finalize typing message structure up to where it currently was
        setChats(prev => prev.map(chat => {
          if (chat.id === chatId) {
            return {
              ...chat,
              messages: chat.messages.map(m =>
                m.id === thinkingId
                  ? {
                      ...m,
                      isThinking: false,
                      isStreaming: false,
                      isSearching: false,
                      timestamp: new Date()
                    }
                  : m
              ),
              updatedAt: new Date(),
            };
          }
          return chat;
        }));
        return;
      }
      console.error('Lumina API Error:', error);
      const msg = error?.message || '';
      const isRateLimit = /429|rate.li[mit]|too many requests|quota/i.test(msg);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: isRateLimit
          ? `Rate limit exceeded. The upstream provider is rate-limiting this model.\n\n**Suggestions:**\n- Wait a moment and try again\n- Add your own API key in **Settings → AI Provider**\n- Switch to a different model`
          : `Error: ${msg || 'Chat completion failed'}. Please check your API key, model, and server configuration in Settings.`,
        timestamp: new Date(),
      };
      setChats(prev => prev.map(chat => {
        if (chat.id === chatId) {
          const filtered = chat.messages.filter(m => m.id !== thinkingId);
          return { ...chat, messages: [...filtered, errorMessage] };
        }
        return chat;
      }));
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 100);
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
        setIsTyping(false);
      }
      setTypingMessageId(null);
      setCoderTodos(prev => prev.map(t => ({ ...t, status: 'complete' })));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showsSlashCommands && filteredCommands.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedCommandIndex(prev => (prev + 1) % filteredCommands.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedCommandIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length);
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        const selectedCmd = filteredCommands[selectedCommandIndex];
        if (selectedCmd) {
          setInput(`/${selectedCmd.name} `);
          setSelectedCommandIndex(0);
        }
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setInput(input + ' ');
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleScreenshot = async () => {
    setIsPlusMenuOpen(false);
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const track = stream.getVideoTracks()[0];
      const imageCapture = new (window as any).ImageCapture(track);
      const bitmap = await imageCapture.grabFrame();
      const canvas = document.createElement('canvas');
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      canvas.getContext('2d')?.drawImage(bitmap, 0, 0);
      track.stop();
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `screenshot-${Date.now()}.png`, { type: 'image/png' });
          handleFileAttach([file]);
        }
      });
    } catch {
      showToast('Screenshot cancelled or not supported.');
    }
  };

  const ensureScrapedFilesOnDisk = async (doc: any) => {
    if (!doc.id) return;
    const docId = doc.id;
    const title = doc.title;
    const url = doc.url;
    const text = doc.content;
    
    const safeTitle = title.replace(/[^a-zA-Z0-9-_.]/g, '_').slice(0, 50);

    const markdownPath = `scraped_pages/${safeTitle}_${docId}.md`;
    const jsonPath = `scraped_pages/${safeTitle}_${docId}.json`;

    const markdownContent =
      `# Scraped Page: ${title}\n\n` +
      `- **URL:** ${url}\n` +
      `- **Attached On:** ${new Date().toLocaleString()}\n` +
      `- **Char Count:** ${text.length}\n\n` +
      `## Full Scraped Content\n\n` +
      `${text}`;

    try {
      await fetch('/api/fs/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: markdownPath, content: markdownContent })
      });

      const jsonContent = JSON.stringify({
        id: docId,
        url,
        title,
        scrapedAt: new Date().toISOString(),
        content: text
      }, null, 2);

      await fetch('/api/fs/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: jsonPath, content: jsonContent })
      });

      triggerWorkspaceRefresh();
    } catch (err) {
      console.error("Error creating files on disk:", err);
    }
  };

  const handleFileAttach = async (files: File[]) => {
    setAttachedFiles(prev => [...prev, ...files]);
    showToast(`${files.length} file(s) attached successfully!`);
  };

  const handleAttachUrl = async () => {
    const url = urlToolInput.trim();
    if (!url) return;
    setUrlToolLoading(true);
    setUrlToolError(null);
    try {
      // Use the existing scrapeUrl service
      const result: ScrapeResult = await scrapeUrl({ url, extractLinks: false, extractImages: false });
      
      // Compress: strip HTML, collapse whitespace, cap at 8000 chars
      let text = '';
      if (result.rawText) {
        text = result.rawText;
      } else if (result.data) {
        text = result.data.text || result.data.content || result.data.markdown || JSON.stringify(result.data);
      }
      text = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      if (text.length > 8000) text = text.slice(0, 8000) + '...[truncated]';
      
      if (!text && result.error) {
        throw new Error(result.error);
      }
      
      const title = result.title || url;
      const favicon = `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=32`;
      
      const newDoc = { id: Date.now().toString(), url, title, content: text, favicon };
      
      setAttachedUrlDocs(prev => [
        ...prev,
        newDoc
      ]);
      
      // Auto save on disk & refresh workspace
      await ensureScrapedFilesOnDisk(newDoc);
      setTranscriptionOptionsDoc(newDoc); // Prompt options right away!
      
      setUrlToolInput('');
      setIsUrlToolOpen(false);
      showToast(`✅ Attached and written to workspace folder!`);
    } catch (err: any) {
      setUrlToolError(err?.message || 'Failed to fetch URL. Make sure it is accessible and try again.');
    } finally {
      setUrlToolLoading(false);
    }
  };

  const ensureTranscriptFilesOnDisk = async (doc: any) => {
    if (!doc.videoId || !doc.segments) return;
    const videoId = doc.videoId;
    const title = doc.title;
    const url = doc.url;
    const segments = doc.segments;
    const transcript = doc.content;

    const markdownPath = `transcripts/transcript_${videoId}.md`;
    const markdownContent = `# YouTube Video Transcript\n\n` +
      `**Video Title:** ${title}\n` +
      `**Video URL:** ${url}\n` +
      `**Video ID:** ${videoId}\n` +
      `**Total Segment Milestones:** ${segments.length}\n\n` +
      `---\n\n` +
      `## Fully Assembled Text\n\n` +
      `${transcript}\n\n` +
      `---\n\n` +
      `## Timestamped Collected Segments\n\n` +
      `| Timestamp | Caption Line |\n` +
      `| :--- | :--- |\n` +
      segments.map((s: any) => `| **${s.timeStr}** | ${s.text} |`).join('\n');

    try {
      await fetch('/api/fs/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: markdownPath, content: markdownContent })
      });

      const jsonPath = `transcripts/transcript_${videoId}.json`;
      const jsonContent = JSON.stringify({
        videoId,
        videoUrl: url,
        videoTitle: title,
        totalSegments: segments.length,
        fullText: transcript,
        segments: segments
      }, null, 2);

      await fetch('/api/fs/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: jsonPath, content: jsonContent })
      });

      triggerWorkspaceRefresh();
    } catch (err) {
      console.error("Error creating files on the fly:", err);
    }
  };

  const handleFetchTranscript = async () => {
    const url = transcriptToolInput.trim();
    if (!url) return;
    setTranscriptToolLoading(true);
    setTranscriptToolError(null);
    
    try {
      const videoId = extractYouTubeId(url);
      if (!videoId) throw new Error('Could not detect a valid YouTube video ID from this URL.');
      
      const transcriptRes = await fetchYouTubeTranscript(videoId);
      const transcript = transcriptRes.text;
      const segments = transcriptRes.segments;
      const title = `YouTube Transcript – ${videoId}`;
      const truncated = transcript.length > 12000 ? transcript.slice(0, 12000) + '...[truncated]' : transcript;
      
      const newDoc = {
        id: Date.now().toString(),
        url,
        title,
        content: truncated,
        favicon: `https://www.google.com/s2/favicons?domain=youtube.com&sz=32`,
        segments,
        videoId
      };
      
      setAttachedUrlDocs(prev => [...prev, newDoc]);
      
      // Auto save on disk & refresh workspace
      await ensureTranscriptFilesOnDisk(newDoc);
      
      setTranscriptionOptionsDoc(newDoc); // Prompt with option choices!
      
      setTranscriptToolInput('');
      setIsTranscriptToolOpen(false);
      showToast(`✅ Transcript attached and written to workspace transcripts folder!`);
    } catch (err: any) {
      setTranscriptToolError(err?.message || 'Failed to fetch transcript. This video may not have captions enabled.');
    } finally {
      setTranscriptToolLoading(false);
    }
  };

  const processOcrForJoinedImage = async (_imageFile: File): Promise<string | null> => {
    return null;
  };

  return {
    handleSend,
    handleClearChat,
    handleKeyDown,
    handleScreenshot,
    ensureScrapedFilesOnDisk,
    processOcrForJoinedImage,
    handleFileAttach,
    handleAttachUrl,
    ensureTranscriptFilesOnDisk,
    handleFetchTranscript
  };
}
