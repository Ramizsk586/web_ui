import { Request, Response } from 'express';
import axios from 'axios';
import { 
  wait, 
  isRetryableError, 
  getRetryDelayMs, 
  parseStreamError, 
  getUpstreamErrorDetail, 
  getUpstreamErrorStatus,
  parseXmlToolCalls,
  normalizeLlmResponse
} from './utils.js';

export async function handleOpenAI(
  req: Request,
  res: Response,
  options: {
    model: string;
    apiKey: string;
    baseUrl: string;
    apiMessages: any[];
    tools: any[];
    stream: boolean;
  }
) {
  const { model, apiKey, baseUrl, apiMessages, tools, stream } = options;
  const MAX_RETRIES = 3;

  const hasTools = tools && Array.isArray(tools) && tools.length > 0;
  const requestBody: any = {
    model: model || 'gpt-4o-mini',
    messages: apiMessages,
    stream: stream !== false,
    max_tokens: hasTools ? 2048 : 4096,
    temperature: 0.7
  };

  if (hasTools) {
    requestBody.tools = tools;
    requestBody.tool_choice = 'auto';
  }

  if (stream === false) {
    let response;
    let lastError: any;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        response = await axios.post(
          `${baseUrl}/chat/completions`,
          requestBody,
          {
            headers: {
              'Content-Type': 'application/json',
              ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {})
            },
            timeout: 60000
          }
        );
        break;
      } catch (toolChoiceError: any) {
        lastError = toolChoiceError;

        if (isRetryableError(toolChoiceError) && attempt < MAX_RETRIES) {
          const delay = getRetryDelayMs(toolChoiceError, Math.pow(2, attempt) * 1000);
          console.warn(`Retryable error (${toolChoiceError.code || toolChoiceError.response?.status}), retry ${attempt + 1}/${MAX_RETRIES} in ${delay}ms...`);
          await wait(delay);
          continue;
        }

        const upstreamDetail = JSON.stringify(toolChoiceError.response?.data || '').toLowerCase();
        const canRetryWithoutToolChoice = requestBody.tool_choice && (
          upstreamDetail.includes('tool_choice') ||
          upstreamDetail.includes('unsupported') ||
          upstreamDetail.includes('extra_forbidden') ||
          upstreamDetail.includes('unrecognized')
        );
        if (!canRetryWithoutToolChoice) throw toolChoiceError;

        const retryBody = { ...requestBody };
        delete retryBody.tool_choice;
        try {
          response = await axios.post(
            `${baseUrl}/chat/completions`,
            retryBody,
            {
              headers: {
                'Content-Type': 'application/json',
                ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {})
              },
              timeout: 60000
            }
          );
          break;
        } catch (retryError: any) {
          lastError = retryError;
          if (isRetryableError(retryError) && attempt < MAX_RETRIES) {
            const delay = getRetryDelayMs(retryError, Math.pow(2, attempt) * 1000);
            console.warn(`Retryable error (${retryError.code || retryError.response?.status}) on tool_choice fallback, retry ${attempt + 1}/${MAX_RETRIES} in ${delay}ms...`);
            await wait(delay);
            continue;
          }
          throw retryError;
        }
      }
    }

    if (!response) throw lastError || new Error('Chat completion failed after retries');
    return res.json(normalizeLlmResponse(response.data));
  }

  let response;
  let lastError: any;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      response = await axios.post(
        `${baseUrl}/chat/completions`,
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json',
            ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {})
          },
          responseType: 'stream',
          timeout: 60000
        }
      );
      break;
    } catch (error: any) {
      lastError = error;
      if (isRetryableError(error) && attempt < MAX_RETRIES) {
        const delay = getRetryDelayMs(error, Math.pow(2, attempt) * 1000);
        console.warn(`Retryable error (${error.code || error.response?.status}) on stream, retry ${attempt + 1}/${MAX_RETRIES} in ${delay}ms...`);
        await wait(delay);
        continue;
      }
      throw error;
    }
  }

  if (!response) throw lastError || new Error('Chat completion failed after retries');

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const decoder = new TextDecoder();
  let streamToolCalls: any[] = [];
  response.data.on('data', (chunk: Buffer) => {
    const text = decoder.decode(chunk, { stream: true });
    const lines = text.split('\n').filter((l: string) => l.trim());
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const dataStr = line.slice(6);
        if (dataStr === '[DONE]') {
          if (streamToolCalls.length > 0) {
            res.write(JSON.stringify({ type: 'tool_calls', tool_calls: streamToolCalls }) + '\n');
          }
          res.write('data: [DONE]\n\n');
          res.end();
          return;
        }
        try {
          const data = JSON.parse(dataStr);
          const delta = data.choices?.[0]?.delta;
          const content = delta?.content || '';
          if (content) {
            res.write(content);
            if (content.includes('<invoke')) {
              const parsed = parseXmlToolCalls(content);
              if (parsed && parsed.toolCalls.length > 0) {
                streamToolCalls.push(...parsed.toolCalls);
              }
            }
          }
          if (delta?.tool_calls) {
            for (const tc of delta.tool_calls) {
              const idx = tc.index ?? streamToolCalls.length;
              if (!streamToolCalls[idx]) {
                streamToolCalls[idx] = {
                  id: tc.id || '',
                  type: 'function',
                  function: { name: '', arguments: '' }
                };
              }
              if (tc.id) streamToolCalls[idx].id = tc.id;
              if (tc.function?.name) streamToolCalls[idx].function.name += tc.function.name;
              if (tc.function?.arguments) streamToolCalls[idx].function.arguments += tc.function.arguments;
            }
          }
        } catch {}
      }
    }
  });
  response.data.on('end', () => res.end());
  response.data.on('error', (err: any) => {
    console.error('Stream error:', err);
    res.end();
  });
}
