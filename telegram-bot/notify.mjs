// notify.mjs — односторонняя отправка в Telegram. Ноль зависимостей.
// Использование:
//   node notify.mjs "Заголовок" "Текст" [--id q123] [--chat 123456]
// Без TELEGRAM_BOT_TOKEN — молча skip (exit 0), чтобы не ронять хуки/CI.
import { readFileSync } from 'node:fs';
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
    // нет .env — ок, берём из окружения
  }
}

loadEnvFile(join(dir, '.env'));

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Telegram работает в HTML-режиме, но разметка markdown-ом читается в
// сообщениях агента естественнее: `**жирный**` → <b>жирный</b>.
const md = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');

// Лимит Telegram — 4096 символов на сообщение; режем тело, а не готовый HTML,
// чтобы не разорвать открытый тег.
const MAX_LENGTH = 3800;

const clip = (text) => {
  const raw = String(text ?? '');
  if (raw.length <= MAX_LENGTH) return raw;
  let cut = raw.slice(0, MAX_LENGTH - 1) + '…';
  // Нечётное число `**` после обрезки оставило бы парный тег незакрытым.
  if ((cut.match(/\*\*/g) ?? []).length % 2 === 1) cut = cut.replace(/\*\*$/, '');
  return cut;
};

const args = process.argv.slice(2);
const getFlag = (name) => {
  const i = args.indexOf(name);
  return i !== -1 ? args[i + 1] : undefined;
};

const title = args[0] ?? 'Календарь звонков';
const message = args[1] ?? '';
const qid = getFlag('--id');
const chatOverride = getFlag('--chat');
// --dry-run печатает сообщение в консоль вместо отправки: так проверяется
// разметка, не тревожа владельца чата.
const dryRun = args.includes('--dry-run');

const token = process.env.TELEGRAM_BOT_TOKEN ?? '';
const chatId = chatOverride ?? process.env.TELEGRAM_ALLOWED_CHAT_ID ?? '';

const titleHtml = md(title);
const head = titleHtml.includes('<b>') ? titleHtml : `<b>${titleHtml}</b>`;
const bodyHtml = md(clip(message));
const foot = qid ? `\n\n<code>id: ${esc(qid)}</code>` : '';
const text = `${head}\n${bodyHtml}${foot}`;

if (dryRun) {
  console.log(text);
  process.exit(0);
}

if (!token || !chatId) {
  console.warn('[notify] пропуск: нет TELEGRAM_BOT_TOKEN или CHAT_ID (.env не заполнен)');
  process.exit(0);
}

const body = { chat_id: chatId, text, parse_mode: 'HTML' };
if (qid) {
  body.reply_markup = {
    inline_keyboard: [
      [
        { text: '✅ Да', callback_data: `approve:${qid}` },
        { text: '⛔ Нет', callback_data: `deny:${qid}` },
      ],
    ],
  };
}

const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
});
if (!res.ok) {
  const t = await res.text().catch(() => '');
  console.error(`[notify] Telegram ${res.status}: ${t}`);
  process.exit(1);
}
console.log('[notify] ok');
