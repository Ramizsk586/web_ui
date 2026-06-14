/**
 * telegram-delivery.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Low-level helpers for delivering messages from the server to Telegram users.
 * Used by execution-agent.ts and automations.ts to push async results.
 *
 * Requires TELEGRAM_BOT_TOKEN in the environment.
 */

function getBotToken(): string {
  return process.env.TELEGRAM_BOT_TOKEN ?? '';
}

function getTelegramApi(): string {
  return `https://api.telegram.org/bot${getBotToken()}`;
}

/**
 * Send a plain or Markdown-formatted message to a specific Telegram chat.
 * Silently no-ops when TELEGRAM_BOT_TOKEN is not configured.
 */
export async function deliverToTelegram(
  chatId: number | string,
  text: string,
  parseMode: 'Markdown' | 'HTML' | 'MarkdownV2' | '' = 'Markdown'
): Promise<void> {
  const token = getBotToken();
  if (!token) return; // Telegram not configured — silently skip

  const api = getTelegramApi();

  // Telegram max message length is 4096 chars
  const chunks = splitIntoChunks(text, 4000);
  for (const chunk of chunks) {
    const startTime = performance.now();
    try {
      const response = await fetch(`${api}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: chunk,
          ...(parseMode && { parse_mode: parseMode }),
        }),
        signal: AbortSignal.timeout(10_000),
      });
      const latency = Math.round(performance.now() - startTime);
      if ((global as any).logServerTraffic) {
        let respBody = '';
        try {
          respBody = await response.clone().text();
        } catch {}
        (global as any).logServerTraffic({
          method: 'POST',
          endpoint: 'telegram/sendMessage',
          status: response.status,
          statusText: response.statusText,
          latency,
          type: 'telegram',
          request: { chat_id: chatId, text: chunk },
          response: respBody
        });
      }
    } catch (err: any) {
      console.error('[TelegramDelivery] Failed to send message:', err);
      if ((global as any).logServerTraffic) {
        (global as any).logServerTraffic({
          method: 'POST',
          endpoint: 'telegram/sendMessage',
          status: 500,
          statusText: 'Error',
          latency: Math.round(performance.now() - startTime),
          type: 'telegram',
          request: { chat_id: chatId, text: chunk },
          response: { error: err.message }
        });
      }
    }
  }
}

/**
 * Split a long string into chunks without breaking words mid-way.
 */
function splitIntoChunks(text: string, maxLen: number): string[] {
  if (text.length <= maxLen) return [text];
  const chunks: string[] = [];
  let remaining = text;
  while (remaining.length > 0) {
    if (remaining.length <= maxLen) {
      chunks.push(remaining);
      break;
    }
    let cutAt = remaining.lastIndexOf('\n', maxLen);
    if (cutAt < maxLen / 2) cutAt = remaining.lastIndexOf(' ', maxLen);
    if (cutAt <= 0) cutAt = maxLen;
    chunks.push(remaining.slice(0, cutAt));
    remaining = remaining.slice(cutAt).trimStart();
  }
  return chunks;
}

/**
 * Send a typing indicator to a chat to show the bot is working.
 */
export async function sendTypingAction(chatId: number | string): Promise<void> {
  const token = getBotToken();
  if (!token) return;
  const api = getTelegramApi();
  try {
    await fetch(`${api}/sendChatAction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, action: 'typing' }),
      signal: AbortSignal.timeout(5_000),
    });
  } catch {}
}
