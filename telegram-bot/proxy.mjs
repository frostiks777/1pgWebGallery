// Прямой маршрут до api.telegram.org из России не работает: TCP-соединение
// устанавливается, а TLS/HTTP — нет (curl возвращает 000), при этом тот же запрос
// через локальный xray на 127.0.0.1:10809 отвечает 200. Поэтому скрипты моста
// ходят через прокси, если он задан в TELEGRAM_PROXY.
//
// Подвох: fetch в Node игнорирует HTTP(S)_PROXY, пока не выставлен
// NODE_USE_ENV_PROXY=1, а этот флаг читается только при старте процесса — изнутри
// скрипта его уже не выставить. Отсюда повторный запуск себя же с готовым
// окружением: один раз, дальше MARK не даёт зациклиться.
import { spawn, spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const MARK = 'TELEGRAM_PROXY_REEXEC';

export function applyTelegramProxy() {
  const proxy = String(process.env.TELEGRAM_PROXY ?? '').trim();
  if (!proxy) return;

  if (process.env[MARK] === '1') {
    // Node 20/22 флага не знает и молча пойдёт напрямую. Предупреждаем один раз:
    // иначе отправка снова превратится в «ушло и пропало», как до этой правки.
    if (process.env.NODE_USE_ENV_PROXY !== '1') {
      console.warn('[proxy] эта версия Node не умеет NODE_USE_ENV_PROXY — прокси не применится');
    }
    return;
  }

  const env = {
    ...process.env,
    [MARK]: '1',
    HTTP_PROXY: proxy,
    HTTPS_PROXY: proxy,
    http_proxy: proxy,
    https_proxy: proxy,
    NODE_USE_ENV_PROXY: '1',
  };
  // Локальные адреса в туннель не отправляем: bot.mjs дёргает git в проекте.
  if (!env.NO_PROXY && !env.no_proxy) {
    env.NO_PROXY = 'localhost,127.0.0.1,::1';
    env.no_proxy = env.NO_PROXY;
  }

  const res = spawnSync(process.execPath, process.argv.slice(1), { env, stdio: 'inherit' });
  process.exit(res.status ?? 1);
}

// Для долгоживущего бота повторный запуск с ожиданием не годится: родитель висел бы
// обёрткой, а taskkill по pid из .bot.pid убивал бы обёртку, оставляя настоящий
// poller жить. Поэтому отдаём процесс в фон и пишем в pid-файл pid ребёнка —
// иначе плагин автозапуска увидит мёртвый родительский pid и поднимет второй
// poller на том же токене (Telegram отвечает 409 и делит поток обновлений).
export function handOffToProxy(pidPath) {
  const proxy = String(process.env.TELEGRAM_PROXY ?? '').trim();
  if (!proxy) return;

  if (process.env[MARK] === '1') {
    if (process.env.NODE_USE_ENV_PROXY !== '1') {
      console.warn('[proxy] эта версия Node не умеет NODE_USE_ENV_PROXY — прокси не применится');
    }
    return;
  }

  const env = {
    ...process.env,
    [MARK]: '1',
    HTTP_PROXY: proxy,
    HTTPS_PROXY: proxy,
    http_proxy: proxy,
    https_proxy: proxy,
    NODE_USE_ENV_PROXY: '1',
  };
  if (!env.NO_PROXY && !env.no_proxy) {
    env.NO_PROXY = 'localhost,127.0.0.1,::1';
    env.no_proxy = env.NO_PROXY;
  }

  const child = spawn(process.execPath, process.argv.slice(1), {
    env,
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
  });
  if (pidPath && child.pid) {
    try {
      writeFileSync(pidPath, String(child.pid));
    } catch {
      // pid-файл не записался — плагин увидит старый pid и поднимет второй poller;
      // молчать нельзя, это и есть 409.
      console.warn('[proxy] не удалось записать pid-файл:', pidPath);
    }
  }
  child.unref();
  process.exit(0);
}
