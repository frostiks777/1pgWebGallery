// unread.mjs — показать вопросы из Telegram без ответов.
// Неотвеченное = записи inbox.jsonl (обычный текст, не команды) новее последней записи outbox.jsonl.
// Использование: node unread.mjs
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = dirname(fileURLToPath(import.meta.url));

const lines = (f) => {
  try {
    return readFileSync(join(dir, f), 'utf8')
      .split('\n')
      .filter(Boolean)
      .map((l) => JSON.parse(l));
  } catch {
    return [];
  }
};

const inbox = lines('inbox.jsonl').filter(
  (e) => e.kind === 'message' && e.text && !e.text.startsWith('/'),
);
const outbox = lines('outbox.jsonl');
const lastReply = outbox.length ? outbox[outbox.length - 1].at : '';
const pending = inbox.filter((e) => !lastReply || e.at > lastReply);

if (!pending.length) {
  console.log('[unread] пусто — все вопросы отвечены');
  process.exit(0);
}
for (const e of pending) console.log(`[${e.at}] ${e.text}`);
