// reply.mjs — ответ агента пользователю в Telegram + учёт в outbox.jsonl.
// Использование: node reply.mjs "Текст ответа"
// Пара к unread.mjs: всё, что отправлено через reply.mjs, считается отвеченным.
import { appendFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = dirname(fileURLToPath(import.meta.url));

function loadEnvFile(path) {
  try {
    const raw = readFileSync(path, 'utf8');
    for (const line of raw.split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const i = t.indexOf('=');
      if (i === -1) continue;
      const k = t.slice(0, i).trim();
      const v = t.slice(i + 1).trim();
      if (!(k in process.env)) process.env[k] = v;
    }
  } catch {
    // нет .env — ок
  }
}

loadEnvFile(join(dir, '.env'));

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const text = process.argv.slice(2).join(' ');
if (!text) {
  console.error('[reply] usage: node reply.mjs "Текст ответа"');
  process.exit(1);
}

const token = process.env.TELEGRAM_BOT_TOKEN ?? '';
const chatId = process.env.TELEGRAM_ALLOWED_CHAT_ID ?? '';
if (!token || !chatId) {
  console.warn('[reply] пропуск: .env не заполнен');
  process.exit(0);
}

const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ chat_id: chatId, text: esc(text) }),
});
if (!res.ok) {
  console.error(`[reply] Telegram ${res.status}: ${await res.text().catch(() => '')}`);
  process.exit(1);
}
appendFileSync(
  join(dir, 'outbox.jsonl'),
  JSON.stringify({ at: new Date().toISOString(), text: text.slice(0, 500) }) + '\n',
);
console.log('[reply] ok');
