// setup-menu.mjs — регистрирует базовое меню команд бота (кнопка «Меню» в клиенте).
// Запуск: node setup-menu.mjs
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
    // нет .env — ок
  }
}

loadEnvFile(join(dir, '.env'));

const token = process.env.TELEGRAM_BOT_TOKEN ?? '';
if (!token) {
  console.error('[menu] нет TELEGRAM_BOT_TOKEN (.env не заполнен)');
  process.exit(1);
}

const commands = [
  { command: 'start', description: 'Запуск и помощь' },
  { command: 'help', description: 'Список команд' },
  { command: 'ping', description: 'Проверка связи' },
  { command: 'status', description: 'Статус проекта (ветка, коммит)' },
  { command: 'approve', description: 'Согласовать: /approve <id>' },
  { command: 'deny', description: 'Отклонить: /deny <id>' },
];

const res = await fetch(`https://api.telegram.org/bot${token}/setMyCommands`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ commands }),
});
const j = await res.json().catch(() => ({}));
if (!j.ok) {
  console.error('[menu] fail:', JSON.stringify(j).slice(0, 300));
  process.exit(1);
}
console.log('[menu] ok:', commands.map((c) => `/${c.command}`).join(' '));
