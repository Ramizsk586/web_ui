/**
 * telegram-delivery.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Low-level helpers for delivering messages from the server to Telegram users.
 * Used by execution-agent.ts and automations.ts to push async results.
 *
 * Requires TELEGRAM_BOT_TOKEN in the environment.
 */

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? '';
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

/**
 * Send a plain or Markdown-formatted message to a specific Telegram chat.
 * Silently no-ops when TELEGRAM_BOT_TOKEN is not configured.
 */
export async function deliverToTelegram(
  chatId: number | string,
  text: string,
  parseMode: 'Markdown' | 'HTML' | 'MarkdownV2' | '' = 'Markdown'
): Promise<void> {
  if (!BOT_TOKEN) return; // Telegram not configured — silently skip

  // Telegram max message length is 4096 chars
  const chunks = splitIntoChunks(text, 4000);
  for (const chunk of chunks) {
    try {
      await fetch(`${TELEGRAM_API}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: chunk,
          ...(parseMode && { parse_mode: parseMode }),
        }),
        signal: AbortSignal.timeout(10_000),
      });
    } catch (err) {
      console.error('[TelegramDelivery] Failed to send message:', err);
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
  if (!BOT_TOKEN) return;
  try {
    await fetch(`${TELEGRAM_API}/sendChatAction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, action: 'typing' }),
      signal: AbortSignal.timeout(5_000),
    });
  } catch {}
}
