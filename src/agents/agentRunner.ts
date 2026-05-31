import { Agent, AgentMessage } from './types';

interface RunAgentParams {
  agent: Agent;
  userMessage: string;
  history: AgentMessage[];
  onToken: (token: string) => void;      // streaming callback
  onDone: (fullText: string) => void;
  onError: (err: string) => void;
}

export async function runAgent({
  agent, userMessage, history, onToken, onDone, onError
}: RunAgentParams): Promise<void> {
  // Build messages array from history + new user message
  const messages = [
    ...history.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    { role: 'user' as const, content: userMessage },
  ];

  // Assemble compound systemPrompt by appending content of each custom markdown skill file
  let systemInstructionCombined = agent.systemPrompt || '';
  if (agent.skillFiles && agent.skillFiles.length > 0) {
    const skillFilesMarkdown = agent.skillFiles
      .map(file => `### FILE: ${file.name}\nDescription: ${file.description || 'No description'}\n\n${file.content}`)
      .join('\n\n---\n\n');
    
    systemInstructionCombined = `${systemInstructionCombined}\n\n## Active Custom Skill Files System\nRead and follow the guidelines and rules structured below precisely:\n\n${skillFilesMarkdown}`;
  }

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: agent.model,
        messages,
        systemPrompt: systemInstructionCombined,
        config: agent.provider ? {
          provider: agent.provider,
          apiKey: agent.apiKey,
          baseUrl: agent.baseUrl || undefined,
        } : undefined
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      onError(`API error: ${response.status} - ${errText || 'Unknown server error'}`);
      return;
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let fullText = '';

    while (reader) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      if (chunk) {
        fullText += chunk;
        onToken(chunk);
      }
    }

    onDone(fullText);
  } catch (err: any) {
    onError(err.message || 'Unknown error occurred while calling the agent');
  }
}
