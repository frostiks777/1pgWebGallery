# Telegram-мост (личное, вне основного проекта)

Живёт в `telegram-bot/`. Скрипты и этот README — в git; состояние (`.env`, `inbox.jsonl`,
`outbox.jsonl`, `decisions.jsonl`, `.bot.pid`, `.bot.lock`) — в `.gitignore`, в репозиторий не попадает.
Основной проект не тронут: ноль новых зависимостей, `hexlet-check` не задет.

## 1. Создай бота (2 мин)

1. В Telegram открой `@BotFather` → `/newbot` → получи `TELEGRAM_BOT_TOKEN`.
2. Напиши боту любое сообщение, затем узнай свой `chat_id`:
   `https://api.telegram.org/bot<TOKEN>/getUpdates` → `message.chat.id`.
3. Скопируй `.env.example` в `.env`, вставь оба значения:
   ```
   copy .env.example .env
   ```

## 2. Запуск

```powershell
cd telegram-bot
node bot.mjs        # мост для согласований (long-polling)
node setup-menu.mjs # один раз: зарегистрировать кнопку «Меню» в клиенте
node notify.mjs "Заголовок" "Текст"              # простая отправка
node notify.mjs "Вопрос?" "Делаем X?" --id q123  # с кнопками ✅/⛔
node reply.mjs "Текст ответа"                    # ответ пользователю
node unread.mjs                                  # что осталось без ответа
```

Для запуска моста без консоли: двойной клик по `telegram-bot\start-bot.bat`.
Без заполненного `.env` отправка молча пропускается (exit 0).

## 3. Автозапуск и автоуведомления с opencode

`.opencode/plugins/telegram-autostart.js` работает сам при старте opencode — и в GUI, и в CLI:

- поднимает `telegram-bot/bot.mjs` отдельным процессом;
- шлёт уведомления в Telegram по событиям сессии: `session.idle` («Агент закончил») и `session.error` («Ошибка сессии»);
- антиспам: не чаще одного уведомления в минуту на тип события.

| Переменная в `.env` | Что делает |
|---|---|
| `TELEGRAM_NOTIFY=on` | автоуведомления включены |
| `TELEGRAM_NOTIFY=off` (по умолчанию) | только ручные `notify.mjs` / `reply.mjs` |

- Только в этом репозитории (project-level plugin, opencode грузит `.opencode/plugins/` сам).
- Если `telegram-bot/bot.mjs` или `.env` нет — плагин молча ничего не делает.
- Защита от дублей: pid в `telegram-bot/.bot.pid` + проверка живости процесса.
- Остановить: `taskkill /PID <число из .bot.pid> /F`.

## 4. Как агент согласует без компа

1. Агент: `node telegram-bot/notify.mjs "Нужно решение" "Делаем X?" --id q123`
2. Ты в Telegram: жмёшь ✅/⛔ или пишешь `/approve q123` / `/deny q123`.
3. Агент читает `telegram-bot/decisions.jsonl` (последняя строка) и действует.
4. Команды с телефона: `/ping`, `/status` (ветка + коммит + грязные файлы), `/help`.

## 5. Свободные вопросы (не команды)

1. Ты пишешь боту обычный текст → он попадает в `inbox.jsonl`.
2. Агент сам не просыпается: при следующем контакте запускает `node telegram-bot/unread.mjs`.
3. Ответ дублируется через `node telegram-bot/reply.mjs "текст"` (пишется в `outbox.jsonl`).

## 6. Файлы-мост

- `inbox.jsonl` — всё входящее (сообщения и нажатия кнопок).
- `decisions.jsonl` — только решения `{at, by, qid, decision}`.
- `outbox.jsonl` — что агент уже отправил в ответ.
- `.bot.pid` — pid запущенного бота (для защиты от дублей).
- Всё это создаётся автоматически и в git не идёт.

## 7. Безопасность

- Whitelist: отвечает только `TELEGRAM_ALLOWED_CHAT_ID`, чужие чаты молча игнорятся.
- Токен только в `telegram-bot/.env` (не в коде, не в git).
- Секреты (пароли, `ADMIN_PASSWORD`) в чат не слать.
