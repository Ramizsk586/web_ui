import { Response } from 'express';

export const wait = (ms: number) => new Promise(r => setTimeout(r, ms));

export const isRetryableError = (err: any) => {
  if (!err) return false;
  if (err.response?.status === 429) return true;
  if (err.response?.status && [502, 503, 504].includes(err.response.status)) return true;
  const code = err.code;
  if (code && ['ECONNRESET', 'ETIMEDOUT', 'EPIPE', 'ENOTFOUND', 'ECONNREFUSED', 'EAI_AGAIN', 'ERR_BAD_RESPONSE'].includes(code)) return true;
  if (!err.response) return true;
  const msg = (err.message || '').toLowerCase();
  if (msg.includes('connreset') || msg.includes('timeout') || msg.includes('network error') || msg.includes('socket hang up')) return true;
  return false;
};

export const parseStreamError = async (err: any): Promise<any> => {
  if (err && err.response && err.response.data && typeof err.response.data.on === 'function') {
    try {
      const chunks: any[] = [];
      const stream = err.response.data;
      const text = await new Promise<string>((resolve, reject) => {
        let resolved = false;
        stream.on('data', (chunk: any) => chunks.push(chunk));
        stream.on('end', () => {
          resolved = true;
          resolve(Buffer.concat(chunks).toString('utf8'));
        });
        stream.on('error', (e: any) => {
          if (!resolved) reject(e);
        });
        setTimeout(() => {
          if (!resolved) resolve(Buffer.concat(chunks).toString('utf8'));
        }, 3000);
      });
      err.response.data = text;
      try {
        const parsed = JSON.parse(text);
        if (parsed) {
          err.response.data = parsed;
        }
      } catch {}
    } catch {}
  }
  return err;
};

export const getUpstreamErrorDetail = (e: any) => {
  let raw = e?.response?.data ?? e?.message ?? String(e);
  if (raw && typeof raw === 'object' && typeof raw.on === 'function') {
    try {
      const bufferState = (raw as any)._readableState;
      if (bufferState && Array.isArray(bufferState.buffer)) {
        const chunks = bufferState.buffer.map((item: any) => {
          if (Buffer.isBuffer(item)) return item;
          if (item && Buffer.isBuffer(item.data)) return item.data;
          if (item && item.type === 'Buffer' && Array.isArray(item.data)) return Buffer.from(item.data);
          return null;
        }).filter(Boolean);
        if (chunks.length > 0) {
          const text = Buffer.concat(chunks).toString('utf8');
          try {
            raw = JSON.parse(text);
          } catch {
            raw = text;
          }
        }
      }
    } catch {}
  }
  if (typeof raw === 'string') return raw;
  try {
    const seen = new WeakSet();
    return JSON.stringify(raw, (_key, value) => {
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) return '[Circular]';
        seen.add(value);
      }
      return value;
    });
  } catch {
    return e?.message || String(raw);
  }
};

export const getUpstreamErrorStatus = (e: any) => {
  const status = Number(e?.response?.status);
  if (status === 429) return 429;
  if (status >= 400 && status < 500) return status;
  const detail = getUpstreamErrorDetail(e).toLowerCase();
  if (
    detail.includes('rate_limit') ||
    detail.includes('rate limit') ||
    detail.includes('rate-limited') ||
    detail.includes('too many requests') ||
    detail.includes('quota exceeded')
  ) {
    return 429;
  }
  return 502;
};

export const getRetryDelayMs = (e: any, fallbackMs: number) => {
  const retryAfter = Number(e?.response?.headers?.['retry-after']);
  if (Number.isFinite(retryAfter) && retryAfter > 0) {
    return Math.min(30000, Math.ceil(retryAfter * 1000) + 500);
  }
  const detail = getUpstreamErrorDetail(e);
  const match = detail.match(/try again in\s+([0-9.]+)\s*s/i) ||
    detail.match(/retry(?:-after| after)?\s*:?\s*([0-9.]+)\s*s?/i);
  if (match) {
    const seconds = Number(match[1]);
    if (Number.isFinite(seconds) && seconds > 0) {
      return Math.min(30000, Math.ceil(seconds * 1000) + 500);
    }
  }
  return fallbackMs;
};

export const parseXmlToolCalls = (content: string): { cleanedContent: string; toolCalls: any[] } | null => {
  if (!content || typeof content !== 'string') return null;
  const invokeRegex = /<invoke\s+name=["']([^"']+)["']>\s*[\s\S]*?<\/invoke>/gi;
  const matches = [...content.matchAll(invokeRegex)];
  if (matches.length === 0) return null;
  const toolCalls: any[] = [];
  let cleanedContent = content;
  for (const match of matches) {
    const fullMatch = match[0];
    const toolName = match[1];
    const paramsBlock = fullMatch.slice(fullMatch.indexOf('>') + 1, fullMatch.lastIndexOf('<'));
    const params: Record<string, any> = {};
    const paramRegex = /<parameter\s+name=["']([^"']+)["']>\s*([\s\S]*?)\s*<\/parameter>/gi;
    let paramMatch;
    while ((paramMatch = paramRegex.exec(paramsBlock)) !== null) {
      const key = paramMatch[1];
      let value: any = paramMatch[2].trim();
      if (value.startsWith('{') || value.startsWith('[')) {
        try { value = JSON.parse(value); } catch {}
      } else if (value === 'true') { value = true; }
      else if (value === 'false') { value = false; }
      else if (/^\d+$/.test(value)) { value = parseInt(value, 10); }
      else if (/^\d+\.\d+$/.test(value)) { value = parseFloat(value); }
      params[key] = value;
    }
    toolCalls.push({
      id: `tool_call_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type: 'function',
      function: {
        name: toolName,
        arguments: JSON.stringify(params)
      }
    });
    cleanedContent = cleanedContent.replace(fullMatch, '');
  }
  cleanedContent = cleanedContent
    .replace(/minimax:tool_call\s*/gi, '')
    .replace(/^\s*text\s*$/gm, '')
    .replace(/^\s*Copy\s*$/gm, '')
    .trim();
  if (toolCalls.length === 0) return null;
  return { cleanedContent, toolCalls };
};

export const normalizeLlmResponse = (responseData: any): any => {
  if (!responseData?.choices?.[0]?.message) return responseData;
  const message = responseData.choices[0].message;
  if (message.tool_calls && Array.isArray(message.tool_calls) && message.tool_calls.length > 0) {
    return responseData;
  }
  if (message.content && typeof message.content === 'string') {
    const parsed = parseXmlToolCalls(message.content);
    if (parsed && parsed.toolCalls.length > 0) {
      console.log(`[LUMINA_DEBUG] Parsed ${parsed.toolCalls.length} XML tool call(s) from model content`);
      message.tool_calls = parsed.toolCalls;
      if (parsed.cleanedContent) {
        message.content = parsed.cleanedContent;
      }
    }
  }
  return responseData;
};
