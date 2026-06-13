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

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? '';
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

/** Optional allowlist of chat IDs (numbers). Empty = allow all. */
const ALLOWLIST: Set<number> = new Set(
  (process.env.TELEGRAM_ALLOWLIST ?? '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .map(Number)
);

let _polling = false;
let _offset = 0;

function isAllowed(chatId: number): boolean {
  return ALLOWLIST.size === 0 || ALLOWLIST.has(chatId);
}

async function fetchUpdates(offset: number): Promise<any[]> {
  const res = await fetch(`${TELEGRAM_API}/getUpdates?offset=${offset}&timeout=25`, {
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.result ?? [];
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

  // Handle /start command
  if (text === '/start') {
    await deliverToTelegram(chatId, `👋 Hi! I'm **Boop**, your Lumina AI assistant.\n\nSend me a message and I'll help you out.`);
    return;
  }

  // Show typing indicator
  await sendTypingAction(chatId);

  try {
    const response = await handleUserMessage({
      content: text,
      userId: username,
      telegramChatId: chatId,
      source: 'telegram',
    });

    let reply = response.reply || 'Done.';
    if (response.spawned && response.agentId) {
      reply += `\n\n_🤖 A background agent (${response.agentId}) was spawned to handle this. I'll update you when it completes._`;
    }

    await deliverToTelegram(chatId, reply);
  } catch (err: any) {
    console.error('[Telegram] Error handling message:', err);
    await deliverToTelegram(chatId, `❌ An error occurred: ${err.message ?? 'Unknown error'}`);
  }
}

/**
 * Start the Telegram long-polling loop.
 * Safe to call multiple times — only starts one loop.
 */
export function startTelegram(): void {
  if (!BOT_TOKEN) {
    console.warn('[Telegram] TELEGRAM_BOT_TOKEN not set — Telegram bot disabled.');
    return;
  }
  if (_polling) return;
  _polling = true;

  console.log('[Telegram] Starting polling loop…');

  (async () => {
    while (_polling) {
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
