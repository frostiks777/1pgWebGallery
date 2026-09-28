// bot.mjs — двусторонний мост: long-polling getUpdates, whitelist по chat_id.
// Команды: /start /help /ping /status /approve <id> /deny <id>
// Кнопки ✅/⛔ под вопросами агента пишут в decisions.jsonl, всё входящее — в inbox.jsonl.
// Агент читает эти файлы, чтобы узнать решение пользователя вне компа.
// Ноль зависимостей, только встроенные модули Node 22+.
import { appendFileSync, readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = dirname(fileURLToPath(import.meta.url));
// Мост лежит в telegram-bot/ внутри репозитория, проект — родителем.
const projectDir = resolve(dir, '..');

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

const token = process.env.TELEGRAM_BOT_TOKEN ?? '';
const allowed = String(process.env.TELEGRAM_ALLOWED_CHAT_ID ?? '');

if (!token || !allowed) {
  console.error('[bot] заполни telegram-bot/.env по .env.example (TOKEN + ALLOWED_CHAT_ID)');
  process.exit(1);
}

const api = (m, payload) =>
  fetch(`https://api.telegram.org/bot${token}/${m}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  }).then(async (r) => {
    const j = await r.json().catch(() => ({}));
    if (!j.ok) console.error(`[bot] ${m} fail:`, JSON.stringify(j).slice(0, 300));
    return j;
  });

const logLine = (file, obj) =>
  appendFileSync(join(dir, file), JSON.stringify({ at: new Date().toISOString(), ...obj }) + '\n');

const sh = (cmd) => {
  try {
    return execSync(cmd, { cwd: projectDir, encoding: 'utf8', timeout: 15000 }).trim().slice(0, 1500);
  } catch (e) {
    return `ошибка: ${String(e.message).slice(0, 300)}`;
  }
};

const HELP = [
  '/ping — жив ли бот',
  '/status — ветка, последний коммит, грязные файлы',
  '/approve <id> — согласовать вопрос id',
  '/deny <id> — отклонить вопрос id',
].join('\n');

async function recordDecision(by, qid, decision, source) {
  logLine('decisions.jsonl', { by, qid, decision, source });
  await api('sendMessage', {
    chat_id: allowed,
    text: `${decision === 'approve' ? '✅ Согласовано' : '⛔ Отклонено'}: ${qid}`,
  });
}

async function onMessage(msg) {
  const chatId = String(msg.chat?.id ?? '');
  if (chatId !== allowed) return; // чужие чаты игнорируем молча
  const text = String(msg.text ?? '').trim();
  logLine('inbox.jsonl', { by: chatId, kind: 'message', text: text.slice(0, 500) });
  if (!text.startsWith('/')) {
    // Свободный вопрос: подтверждаем приём реакцией, чтобы было видно «в очереди».
    await api('setMessageReaction', {
      chat_id: allowed,
      message_id: msg.message_id,
      reaction: [{ type: 'emoji', emoji: '👀' }],
    });
    return;
  }

  const [cmd, arg] = text.split(/\s+/, 2);
  if (cmd === '/start' || cmd === '/help') {
    await api('sendMessage', { chat_id: allowed, text: HELP });
  } else if (cmd === '/ping') {
    await api('sendMessage', { chat_id: allowed, text: 'pong ✅' });
  } else if (cmd === '/status') {
    const branch = sh('git branch --show-current');
    const log = sh('git log -1 --oneline');
    const dirty = sh('git status --porcelain') || '(чисто)';
    await api('sendMessage', { chat_id: allowed, text: `🌿 ${branch}\n${log}\n${dirty}` });
  } else if ((cmd === '/approve' || cmd === '/deny') && arg) {
    await recordDecision(chatId, arg, cmd === '/approve' ? 'approve' : 'deny', 'command');
  } else {
    await api('sendMessage', { chat_id: allowed, text: HELP });
  }
}

async function onCallback(q) {
  const chatId = String(q.message?.chat?.id ?? q.from?.id ?? '');
  if (chatId !== allowed) {
    await api('answerCallbackQuery', { callback_query_id: q.id, text: 'Чужой чат' });
    return;
  }
  const m = String(q.data ?? '').match(/^(approve|deny):(.+)$/);
  if (!m) return;
  await api('answerCallbackQuery', { callback_query_id: q.id, text: 'Принято' });
  logLine('inbox.jsonl', { by: chatId, kind: 'callback', data: q.data });
  await recordDecision(chatId, m[2], m[1], 'button');
}

let offset = 0;
console.log('[bot] polling… Ctrl+C для остановки');
process.on('SIGINT', () => {
  console.log('\n[bot] стоп');
  process.exit(0);
});

while (true) {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 35000);
    const r = await fetch(
      `https://api.telegram.org/bot${token}/getUpdates?timeout=25&offset=${offset}`,
      { signal: ctrl.signal },
    );
    clearTimeout(t);
    const j = await r.json();
    for (const u of j.result ?? []) {
      offset = u.update_id + 1;
      if (u.message) await onMessage(u.message);
      if (u.callback_query) await onCallback(u.callback_query);
    }
  } catch (e) {
    if (e.name !== 'AbortError') {
      console.error('[bot] poll error:', String(e.message).slice(0, 200));
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
}
