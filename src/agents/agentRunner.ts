import { Agent, AgentMessage, AgentRunEvent } from './types';

interface RunAgentParams {
  agent: Agent;
  userMessage: string;
  history: AgentMessage[];
  onToken: (token: string) => void;
  onDone: (fullText: string, events?: AgentRunEvent[], runId?: string) => void;
  onError: (err: string) => void;
  onEvent?: (event: AgentRunEvent) => void;
  imageUrls?: string[];
  bridgeTools?: Array<{ id: string; name: string; description: string; enabled: boolean; parameters?: any }>;
}

function buildMessages(history: AgentMessage[], userMessage: string, imageUrls?: string[]) {
  let userContent: any = userMessage;
  if (imageUrls && imageUrls.length > 0) {
    userContent = [
      { type: 'text', text: userMessage },
      ...imageUrls.map(url => ({ type: 'image_url', image_url: { url } }))
    ];
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
  bridgeTools = []
}: RunAgentParams): Promise<void> {
  const messages = buildMessages(history, userMessage, imageUrls);

  try {
    const response = await fetch('/api/agents/run', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        agent,
        messages,
        bridgeTools
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
    let fullText = '';
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
              fullText += token;
              onToken(token);
            } else if (payload.type === 'event' && payload.event) {
              events.push(payload.event);
              onEvent?.(payload.event);
            } else if (payload.type === 'done') {
              onDone(fullText, events, runId || payload.runId);
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

    onDone(fullText, events, runId);
  } catch (err: any) {
    onError(err.message || 'Unknown error occurred while running the agent');
  }
}
