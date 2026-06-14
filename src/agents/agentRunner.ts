import { Agent, AgentMessage, AgentRunEvent } from './types';

interface RunAgentParams {
  agent: Agent;
  userMessage: string;
  history: AgentMessage[];
  onToken: (token: string) => void;
  onDone: (fullText: string, events?: AgentRunEvent[], runId?: string, thinkText?: string) => void;
  onError: (err: string) => void;
  onEvent?: (event: AgentRunEvent) => void;
  imageUrls?: string[];
  bridgeTools?: Array<{ id: string; name: string; description: string; enabled: boolean; parameters?: any }>;
  attachedAgents?: Agent[];
}

type ThinkParseState = {
  visibleText: string;
  thinkText: string;
  pendingTagBuffer: string;
  inThinkBlock: boolean;
};

function consumeThinkTaggedChunk(state: ThinkParseState, chunk: string): ThinkParseState {
  const OPEN_TAG = '<think>';
  const CLOSE_TAG = '</think>';
  let remaining = `${state.pendingTagBuffer || ''}${chunk || ''}`;
  let visibleText = state.visibleText;
  let thinkText = state.thinkText;
  let inThinkBlock = state.inThinkBlock;

  while (remaining.length > 0) {
    if (inThinkBlock) {
      const closeIndex = remaining.indexOf(CLOSE_TAG);
      if (closeIndex === -1) {
        const safeLength = Math.max(0, remaining.length - (CLOSE_TAG.length - 1));
        thinkText += remaining.slice(0, safeLength);
        remaining = remaining.slice(safeLength);
        break;
      }

      thinkText += remaining.slice(0, closeIndex);
      remaining = remaining.slice(closeIndex + CLOSE_TAG.length);
      inThinkBlock = false;
      continue;
    }

    const openIndex = remaining.indexOf(OPEN_TAG);
    if (openIndex === -1) {
      const safeLength = Math.max(0, remaining.length - (OPEN_TAG.length - 1));
      visibleText += remaining.slice(0, safeLength);
      remaining = remaining.slice(safeLength);
      break;
    }

    visibleText += remaining.slice(0, openIndex);
    remaining = remaining.slice(openIndex + OPEN_TAG.length);
    inThinkBlock = true;
  }

  return {
    visibleText,
    thinkText,
    pendingTagBuffer: remaining,
    inThinkBlock
  };
}

function buildMessages(history: AgentMessage[], userMessage: string, imageUrls?: string[], attachedAgents: Agent[] = []) {
  let userContent: any = userMessage;
  const attachedAgentBlock = attachedAgents.length > 0
    ? `\n\n[ATTACHED AGENTS]\n${attachedAgents.map((item) => {
        const mode = item.mode || 'all';
        const desc = item.description || 'No description';
        return `- ${item.name} (id: ${item.id}, mode: ${mode})\n  Description: ${desc}\n  System Prompt: ${item.systemPrompt}`;
      }).join('\n')}`
    : '';
  if (imageUrls && imageUrls.length > 0) {
    userContent = [
      { type: 'text', text: `${userMessage}${attachedAgentBlock}` },
      ...imageUrls.map(url => ({ type: 'image_url', image_url: { url } }))
    ];
  } else if (attachedAgentBlock) {
    userContent = `${userMessage}${attachedAgentBlock}`;
  }

  return [
    ...history.map(message => ({
      role: message.role === 'tool' ? 'assistant' : message.role,
      content: message.content
    })),
    { role: 'user' as const, content: userContent }
  ];
}

export async function runAgent({
  agent,
  userMessage,
  history,
  onToken,
  onDone,
  onError,
  onEvent,
  imageUrls,
  bridgeTools = [],
  attachedAgents = []
}: RunAgentParams): Promise<void> {
  const messages = buildMessages(history, userMessage, imageUrls, attachedAgents);

  try {
    const response = await fetch('/api/agents/run', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        agent,
        messages,
        bridgeTools,
        attachedAgents
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      onError(`Agent runtime error: ${response.status} - ${errText || 'Unknown server error'}`);
      return;
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let thinkState: ThinkParseState = {
      visibleText: '',
      thinkText: '',
      pendingTagBuffer: '',
      inThinkBlock: false
    };
    const events: AgentRunEvent[] = [];
    let runId: string | undefined;

    while (reader) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let splitIndex = buffer.indexOf('\n');
      while (splitIndex !== -1) {
        const line = buffer.slice(0, splitIndex).trim();
        buffer = buffer.slice(splitIndex + 1);

        if (line) {
          try {
            const payload = JSON.parse(line);

            if (payload.type === 'run_started') {
              runId = payload.runId;
            } else if (payload.type === 'token') {
              const token = String(payload.text || '');
              const nextState = consumeThinkTaggedChunk(thinkState, token);
              const visibleDelta = nextState.visibleText.slice(thinkState.visibleText.length);
              thinkState = nextState;
              if (visibleDelta) {
                onToken(visibleDelta);
              }
            } else if (payload.type === 'event' && payload.event) {
              events.push(payload.event);
              onEvent?.(payload.event);
            } else if (payload.type === 'done') {
              const flushedState = consumeThinkTaggedChunk(thinkState, '');
              thinkState = flushedState;
              onDone(thinkState.visibleText, events, runId || payload.runId, thinkState.thinkText);
              return;
            } else if (payload.type === 'error') {
              onError(String(payload.error || 'Unknown agent runtime error'));
              return;
            }
          } catch (error) {
            console.warn('Failed to parse agent stream payload:', error);
          }
        }

        splitIndex = buffer.indexOf('\n');
      }
    }

    const flushedState = consumeThinkTaggedChunk(thinkState, '');
    onDone(flushedState.visibleText, events, runId, flushedState.thinkText);
  } catch (err: any) {
    onError(err.message || 'Unknown error occurred while running the agent');
  }
}
