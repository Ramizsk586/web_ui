import { useState, useCallback } from 'react';
import { Chat, Message, AskAiQuestion } from '../types';

export interface UseAskAiProps {
  input: string;
  messages: Message[];
  callLlamaBridge: (messagesPrompt: any[], tools: any[], signal?: AbortSignal) => Promise<any>;
  createNewChat: (projId?: string | null, isCoder?: boolean) => string;
  currentChatId: string | null;
  isCoderMode: boolean;
  handleStartBuilding: (chatId: string, messageId: string, todos: any[]) => void;
  showToast: (msg: string) => void;
  setChats: React.Dispatch<React.SetStateAction<Chat[]>>;
  setInput: React.Dispatch<React.SetStateAction<string>>;
}

export function useAskAi({
  input,
  messages,
  callLlamaBridge,
  createNewChat,
  currentChatId,
  isCoderMode,
  handleStartBuilding,
  showToast,
  setChats,
  setInput
}: UseAskAiProps) {
  const [askAiQuestions, setAskAiQuestions] = useState<AskAiQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [askAiAnswers, setAskAiAnswers] = useState<Record<string, any>>({});
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const [showAskAiPanel, setShowAskAiPanel] = useState(false);
  const [textInputAnswer, setTextInputAnswer] = useState('');
  const [isTransitioningQuestion, setIsTransitioningQuestion] = useState(false);
  const [isAnalyzingAnswers, setIsAnalyzingAnswers] = useState(false);

  const handleTriggerAskAi = async () => {
    setIsGeneratingQuestions(true);
    setShowAskAiPanel(true);
    setCurrentQuestionIndex(0);
    setAskAiAnswers({});
    setTextInputAnswer('');

    const contextQuery = input.trim() || (messages.length > 0 ? messages[messages.length - 1].content : '');

    try {
      const messagesPrompt = [
        {
          role: 'system',
          content: `You are an expert software architect. Analyze the user's task or context and generate 2 to 6 targeted clarifying questions to ask before writing any code. Order them from most impactful to narrowest.
          Respond with a JSON object in this format (no other text, no markdown styling, no nested values):
          {
            "questions": [
              {
                "id": "theme_choice",
                "question": "Which visual style matches your branding goals?",
                "type": "single_choice",
                "options": ["Cosmic Midnight", "Clean Minimalist Light", "Warm Editorial", "Cybernetic Terminal"],
                "purpose": "Define color theme."
              }
            ]
          }
          Types permitted: 'single_choice' | 'multi_choice' | 'scale' | 'text_input' | 'confirm'.
          For 'single_choice' and 'multi_choice', provide 2 to 4 'options'. For 'scale', 'text_input', and 'confirm', leave 'options' empty.
          Each question MUST have a clear purpose.`
        },
        {
          role: 'user',
          content: `Task context: "${contextQuery || 'Build a web dashboard applet or custom feature component'}"`
        }
      ];

      const res = await callLlamaBridge(messagesPrompt, []);
      const text = res?.choices?.[0]?.message?.content || '';
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        if (Array.isArray(parsed.questions) && parsed.questions.length > 0) {
          const validated: AskAiQuestion[] = parsed.questions.map((q: any) => ({
            id: q.id || Math.random().toString(),
            question: q.question || 'Please specify your requirement:',
            type: ['single_choice', 'multi_choice', 'scale', 'text_input', 'confirm'].includes(q.type) ? q.type : 'single_choice',
            options: Array.isArray(q.options) ? q.options.slice(0, 4) : undefined,
            purpose: q.purpose || ''
          })).filter((q: any) => q.question);
          
          if (validated.length > 0) {
            setAskAiQuestions(validated);
            setIsGeneratingQuestions(false);
            return;
          }
        }
      }
      throw new Error("Invalid json format");
    } catch (e) {
      console.warn("Llama bridge error, using default fallback questions", e);
      const fallbackQuestions = [
        {
          id: 'design_style',
          question: contextQuery 
            ? `Which visual aesthetic should we apply for "${contextQuery.slice(0, 30)}..."?`
            : "Which visual design concept do you prefer?",
          type: 'single_choice' as const,
          options: ["Swiss Minimalist", "Cosmic Slate Dark", "Sunset Warm & Playful", "Matrix Cyber Mono"],
          purpose: "Establishes a cohesive UI visual signature."
        },
        {
          id: 'target_features',
          question: "Which capabilities will enrich this feature most?",
          type: 'multi_choice' as const,
          options: ["Interactive Data Board", "Local Storage Search", "Export to PDF/CSV", "Advanced Options Drawer"],
          purpose: "Scopes primary interactive components."
        },
        {
          id: 'complexity_rating',
          question: "How interactive should the micro-animations & layout motion be?",
          type: 'scale' as const,
          purpose: "Aesthetic scale rating for framer-motion intensity."
        },
        {
          id: 'custom_wording',
          question: "Any specific layout file, logo name or branding header to use?",
          type: 'text_input' as const,
          purpose: "Applies customized text branding identifiers."
        },
        {
          id: 'confirm_bootstrap',
          question: "Should we inject a clean mock state to showcase initial features?",
          type: 'confirm' as const,
          purpose: "Specifies mock state populates on workspace build."
        }
      ];
      setAskAiQuestions(fallbackQuestions);
      setIsGeneratingQuestions(false);
    }
  };

  const handleNextQuestion = () => {
    setIsTransitioningQuestion(true);
    setTimeout(() => {
      setIsTransitioningQuestion(false);
      if (currentQuestionIndex < askAiQuestions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
      } else {
        handleFinishQuestions();
      }
    }, 200);
  };

  const handleSelectAnswer = (questionId: string, value: any, autoAdvance: boolean) => {
    setAskAiAnswers(prev => ({ ...prev, [questionId]: value }));
    if (autoAdvance) {
      handleNextQuestion();
    }
  };

  const handleDotClick = (index: number) => {
    if (index < currentQuestionIndex || askAiAnswers[askAiQuestions[index].id] !== undefined) {
      setCurrentQuestionIndex(index);
    }
  };

  const handleFinishQuestions = async (isSkipped = false) => {
    setIsAnalyzingAnswers(true);
    
    const contextQuery = input.trim() || (messages.length > 0 ? messages[messages.length - 1].content : 'Custom app refinement');
    const answersStr = isSkipped 
      ? "Skipped (Use sensible defaults)" 
      : Object.entries(askAiAnswers).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join('; ');
    
    let planTitle = `Interactive Feature Integration`;
    let planTodos = [
      { id: '1', text: "Scaffold visual view elements and structure", status: 'pending' as const },
      { id: '2', text: "Bind layout controls and state context handlers", status: 'pending' as const },
      { id: '3', text: "Integrate custom responsive configurations", status: 'pending' as const },
      { id: '4', text: "Apply high-contrast Tailwind styling and animations", status: 'pending' as const },
      { id: '5', text: "Run local unit audits and verify build output", status: 'pending' as const }
    ];
    let assumptionsMsg = "";

    try {
      const prompt = [
        {
          role: 'system',
          content: `You are an expert Software Architect. Create a structured implementation plan and list of 4-7 tasks to build the user's request, considering their answers to clarifying questions.
          Respond ONLY with a JSON object in this format:
          {
            "title": "Interactive Analytics Board",
            "assumptions": "Using Cosmic Slate Dark aesthetic with Local Storage active.",
            "todos": [
              "Set up responsive container and header with dark theme",
              "Install and import Lucide icon packs and charts",
              "Configure local storage state listeners for persistence",
              "Incorporate animation transition timing and spring motion",
              "Validate all React compiler and build rules"
            ]
          }`
        },
        {
          role: 'user',
          content: `Task: "${contextQuery}"\nAnswers: ${answersStr}`
        }
      ];

      const res = await callLlamaBridge(prompt, []);
      const text = res?.choices?.[0]?.message?.content || '';
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        if (parsed.title) planTitle = parsed.title;
        if (parsed.assumptions) assumptionsMsg = parsed.assumptions;
        if (Array.isArray(parsed.todos)) {
          planTodos = parsed.todos.map((t: string, idx: number) => ({
            id: (idx + 1).toString(),
            text: t,
            status: 'pending' as const
          }));
        }
      }
    } catch (e) {
      console.warn("Planning LLM failed, using fallback", e);
    }

    let targetChatId = currentChatId;
    if (!targetChatId) {
      targetChatId = createNewChat(null, isCoderMode);
    }

    const userMsgText = isSkipped 
      ? `⚡ Clicked **Skip All** in clarifying questions. Proceed with defaults for "${contextQuery || 'the task'}".`
      : `💡 Answered clarifying questions for: **${contextQuery || 'the task'}**.\n${Object.entries(askAiAnswers).map(([k, v]) => `- **${k}**: _${Array.isArray(v) ? v.join(', ') : v}_`).join('\n')}`;

    const userMsgId = Date.now().toString();
    const assistantMsgId = (Date.now() + 10).toString();

    const userMessage: Message = {
      id: userMsgId,
      role: 'user',
      content: userMsgText,
      timestamp: new Date()
    } as any;

    const assistantMessage: Message = {
      id: assistantMsgId,
      role: 'assistant',
      content: `📋 **Plan Created:** ${planTitle}\n\n${assumptionsMsg ? `*Assumptions:* ${assumptionsMsg}\n\n` : ''}Let's align on the sequence of steps to execute. You can edit the steps, add custom notes, or click **Start Building** to begin the automated agent run immediately.`,
      timestamp: new Date(),
      todoPlan: {
        title: planTitle,
        todos: planTodos,
        isConfirmed: false,
        countdown: 10
      }
    } as any;

    setChats(prev => prev.map(chat => {
      if (chat.id === targetChatId) {
        return {
          ...chat,
          messages: [...chat.messages, userMessage, assistantMessage],
          updatedAt: new Date()
        };
      }
      return chat;
    }));

    setInput('');
    setShowAskAiPanel(false);
    setIsAnalyzingAnswers(false);
    setAskAiQuestions([]);
    setAskAiAnswers({});
  };

  return {
    askAiQuestions,
    setAskAiQuestions,
    currentQuestionIndex,
    setCurrentQuestionIndex,
    askAiAnswers,
    setAskAiAnswers,
    isGeneratingQuestions,
    setIsGeneratingQuestions,
    showAskAiPanel,
    setShowAskAiPanel,
    textInputAnswer,
    setTextInputAnswer,
    isTransitioningQuestion,
    setIsTransitioningQuestion,
    isAnalyzingAnswers,
    setIsAnalyzingAnswers,
    handleTriggerAskAi,
    handleNextQuestion,
    handleSelectAnswer,
    handleDotClick,
    handleFinishQuestions
  };
}
