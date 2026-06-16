/**
 * telegram.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Telegram bot polling loop — receives incoming messages, routes them through
 * the Boop interaction agent, and delivers the reply back to the Telegram chat.
 *
 * Requires:
 *   TELEGRAM_BOT_TOKEN  — Telegram bot token from @BotFather
 *   TELEGRAM_ALLOWLIST  — Optional comma-separated list of allowed chat IDs
 *                         (leave empty to allow all users)
 */

import { handleUserMessage } from './interaction-agent.js';
import { deliverToTelegram, sendTypingAction } from './telegram-delivery.js';
import { getConvexClient } from './convex-client.js';
import { api } from '../convex/_generated/api.js';

function getBotToken(): string {
  return process.env.TELEGRAM_BOT_TOKEN ?? '';
}

function getTelegramApi(): string {
  return `https://api.telegram.org/bot${getBotToken()}`;
}

/** Optional allowlist of chat IDs (numbers). Empty = allow all. */
function getAllowlist(): Set<number> {
  return new Set(
    (process.env.TELEGRAM_ALLOWLIST ?? '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
      .map(Number)
  );
}

let _polling = false;
let _offset = 0;
let _currentBotToken = '';

function isAllowed(chatId: number): boolean {
  const allowlist = getAllowlist();
  return allowlist.size === 0 || allowlist.has(chatId);
}

async function fetchUpdates(offset: number): Promise<any[]> {
  const api = getTelegramApi();
  if (!api || !getBotToken()) return [];
  const res = await fetch(`${api}/getUpdates?offset=${offset}&timeout=25`, {
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.result ?? [];
}

function hardcodedReply(content: string): string | null {
  const normalized = content.trim().toLowerCase().replace(/[!.?]+$/g, "");
  if (normalized === "/start") {
    return "Hi, I am Boop. Send me a task, question, reminder, or anything you want me to help with.";
  }
  if (normalized === "hi" || normalized === "hello") {
    return "Hey, I am here. What should we work on?";
  }
  return null;
}

function startTyping(chatId: number | string): { stop: () => void } {
  let stopped = false;
  const send = () => {
    if (stopped) return;
    sendTypingAction(chatId).catch(() => {
      /* ignore transient Telegram typing failures */
    });
  };

  send();
  const interval = setInterval(send, 4000);
  return {
    stop: () => {
      stopped = true;
      clearInterval(interval);
    },
  };
}

async function processUpdate(update: any): Promise<void> {
  const message = update.message ?? update.edited_message;
  if (!message?.text) return;

  const chatId: number = message.chat.id;
  const text: string = message.text.trim();
  const username: string = message.from?.username ?? String(chatId);

  if (!isAllowed(chatId)) {
    console.log(`[Telegram] Ignoring message from non-allowlisted chat ${chatId}`);
    return;
  }

  console.log(`[Telegram] Message from @${username} (${chatId}): ${text.slice(0, 80)}`);

  if ((global as any).logServerTraffic) {
    (global as any).logServerTraffic({
      method: 'POST',
      endpoint: `telegram/update/${username}`,
      status: 200,
      statusText: 'OK',
      latency: 0,
      type: 'telegram',
      request: update,
      response: `Received message: ${text}`
    });
  }

  const conversationId = `telegram:${chatId}`;
  const convex = getConvexClient();

  const directReply = hardcodedReply(text);
  if (directReply) {
    await convex.mutation(api.messages.send, {
      conversationId,
      role: "user",
      content: text,
    });
    await deliverToTelegram(chatId, directReply);
    await convex.mutation(api.messages.send, {
      conversationId,
      role: "assistant",
      content: directReply,
    });
    console.log(`[Telegram] -> telegram hardcoded reply (${directReply.length} chars)`);
    return;
  }

  const typing = startTyping(chatId);
  try {
    const response = await handleUserMessage({
      content: text,
      userId: username,
      conversationId,
      telegramChatId: chatId,
      source: 'telegram',
    });

    let reply = response.reply || 'Done.';
    typing.stop();
    await deliverToTelegram(chatId, reply);
  } catch (err: any) {
    console.error('[Telegram] Error handling message:', err);
    typing.stop();
    await deliverToTelegram(chatId, `❌ An error occurred: ${err.message ?? 'Unknown error'}`);
  } finally {
    typing.stop();
  }
}

/**
 * Start the Telegram long-polling loop.
 * Safe to call multiple times — only starts one loop.
 */
export function startTelegram(): void {
  const token = getBotToken();
  if (!token) {
    console.warn('[Telegram] TELEGRAM_BOT_TOKEN not set — Telegram bot disabled.');
    if (_polling) {
      console.log('[Telegram] Stopping polling loop because token was cleared…');
      _polling = false;
    }
    return;
  }
  
  if (_polling && _currentBotToken === token) {
    return; // Already polling with this token
  }
  
  if (_polling) {
    console.log('[Telegram] Token changed, stopping old loop first…');
    _polling = false;
  }
  
  _polling = true;
  _currentBotToken = token;
  console.log('[Telegram] Starting polling loop…');

  (async () => {
    const loopToken = token;
    while (_polling && _currentBotToken === loopToken) {
      try {
        const updates = await fetchUpdates(_offset);
        for (const update of updates) {
          _offset = Math.max(_offset, update.update_id + 1);
          processUpdate(update).catch(err =>
            console.error('[Telegram] Update processing error:', err)
          );
        }
      } catch (err) {
        // Network blip — pause and retry
        await new Promise(r => setTimeout(r, 5_000));
      }
    }
  })();
}

export function stopTelegram(): void {
  _polling = false;
}
