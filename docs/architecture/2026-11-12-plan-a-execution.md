# План A: ремонт рантайма — исполнение

**Дата старта:** 2026-11-12
**Ветка:** `feat/plan-a-runtime-repair`
**Worktree:** `C:\My_projects_GIT\1pg_gall-plan-a`
**База:** `main` @ `4d59e56`
**Исходный разбор:** [`docs/architecture/2026-11-12-rewrite-vs-fix.md`](./2026-11-12-rewrite-vs-fix.md) (далее — «разбор»)
**Статус:** A0 в работе; A1/A2 запланированы.

## Как читать этот файл

- **Чек-лист** — общий список шагов и их готовность. Обновляется по мере работы.
- **Журнал** — по каждому шагу: что сделано, коммит, проверки, замеры, принятые решения.
- **Карта issue** — соответствие «пункт плана → GitHub issue».
- Статусы: `⬜ todo` · `🔄 in progress` · `✅ done` · `⛔ blocked` · `⏸️ owner/ops`.
- Каждый шаг — атомарный issue (правило «One issue, one change» из `AGENTS.md`).
- Один шаг = один коммит (или серия связанных коммитов), проверки — по `.agents/shared/checks.md`.

## Рамки

- A0 не меняет UI и продуктовое поведение, кроме: ошибка WebDAV отдаётся как `503`
  вместо пустой галереи, URL картинок получает версию.
- Прод из AI-сессии недоступен. Шаги, которым нужен сервер, помечены `⏸️` и выполняются
  владельцем; в журнале фиксируется, что именно осталось сделать.
- `.data/` — состояние владельца, не кэш. Не удалять и не переносить между worktree.
- `.env.local` в worktree не копируется.
- Смена пресета необратима для кэшей: `git revert` откатывает код, но не `.data`,
  `.thumbs-v2` и nginx-кэш. Это осознанно (разбор §10).

## Карта issue

| Шаг | Что меняется | Issue | Статус |
|---|---|---|---|
| A0.1 + A0.2a | Пресет `450/q60/effort4` + ключ кэша `-v3` во всех местах | [#5](https://github.com/frostiks777/1pgWebGallery/issues/5) | ⬜ |
| A0.2b | Co-located кэш `.thumbs` → `.thumbs-v2` | [#123](https://github.com/frostiks777/1pgWebGallery/issues/123) | ⬜ |
| A0.2c + A1.9 | `v=4-<mtime>` во всех URL `/api/images` | [#121](https://github.com/frostiks777/1pgWebGallery/issues/121) | ⬜ |
| A0.3 | Ширина постера видео — отдельная константа 1280 | [#122](https://github.com/frostiks777/1pgWebGallery/issues/122) | ⬜ |
| A0.4 | `next/font/google` → `next/font/local` | [#124](https://github.com/frostiks777/1pgWebGallery/issues/124) | ⬜ |
| A0.5 | Убрать `testWebDAVConnection` из горячего пути, `503` при сбое | [#125](https://github.com/frostiks777/1pgWebGallery/issues/125) | ⬜ |
| A0.6 | Перегенерация `thumbnail` на проде | [#126](https://github.com/frostiks777/1pgWebGallery/issues/126) | ⏸️ |
| A1.7 | JSON-кэш листинга, TTL 30 с, SWR | issue не создан (A1) | ⬜ |
| A1.8 | Семафор sharp: 2 пайплайна, очередь > 20 → `503` | связан с [#74](https://github.com/frostiks777/1pgWebGallery/issues/74), нужен отдельный issue | ⬜ |
| A1.9 | Проверка версии URL во всех точках | [#121](https://github.com/frostiks777/1pgWebGallery/issues/121) | ⬜ |
| A1.10 | Мониторинг: nginx access_log + внешний uptime | issue не создан (A1, ops) | ⏸️ |
| A2.11 | Чистка зависимостей и мёртвых `ui/*.tsx` | [#10](https://github.com/frostiks777/1pgWebGallery/issues/10) | ⬜ |
| A2.12 | Деплой-гейт: `continue-on-error` + `push: main` в `ci.yml` | частично [#8](https://github.com/frostiks777/1pgWebGallery/issues/8), нужен отдельный issue | ⬜ |
| A2.13 | `/api/health` + проверка WebDAV + алерт в Telegram | issue не создан (A2) | ⬜ |

**Связанные, но не входящие в A:** #13 (флак e2e), #52 (HEVC), #55 (nginx-прокси видео),
#59/#60 (стабильность бокса), #92/#116 (auth в `generate`, предпосылка A0.6),
#76 (актуализация документации), #86/#87/#117–#120 (Lighthouse).

## Чек-лист

### A0 — пресет, кэши, шрифты, лишний PROPFIND (1–2 дня)

- [ ] **A0.1 + A0.2a. Пресет `thumbnail` 450/q60/effort4 и ключ `-v3`.**
  - Файлы: `src/app/api/images/route.ts` (пресеты `:80-84`, хеш `:209`),
    `src/app/api/images/generate/route.ts` (пресеты `:84-88`, хеш `:108,116,289,377`),
    `src/app/api/photos/delete/route.ts` (`:37`).
  - Проверка: `rg -n '\-v2' src/` пусто; `bun run lint`, `bunx tsc --noEmit`,
    `bun run build`, `bun run test:e2e`; замер размера/времени одной миниатюры до/после.
  - Issue: #5.

- [ ] **A0.2b. Co-located кэш → `.thumbs-v2`.**
  - Файлы: `.env.example`, `README.md`, `src/app/api/images/route.ts`,
    `src/app/api/images/generate/route.ts`, `src/lib/webdav.ts`,
    `src/app/api/photos/delete/route.ts`.
  - Проверка: `rg -n 'COLOCATED_THUMBS_DIR'` показывает `.thumbs-v2`; в демо-режиме
    после запроса появляется `public/demo-photos/.thumbs-v2/`; lint/tsc/build/e2e.
  - Issue: #123.

- [ ] **A0.2c + A1.9. Версия `v=4-<mtime>` во всех URL `/api/images`.**
  - Файлы: новый `src/lib/imageUrl.ts`; `PhotoCard.tsx`, `Lightbox.tsx`,
    `HoneycombLayout.tsx`, `MinimalismLayout.tsx`, `AlbumLayout.tsx`, `page.tsx`.
  - Проверка: `rg -n '/api/images\?path=' src/` не находит сырых URL; lint/tsc/build/e2e;
    в браузере URL карточки содержит `v=4-<mtime>`; замена файла меняет URL.
  - Issue: #121.

- [ ] **A0.3. Ширина постера видео — 1280, не из пресета.**
  - Файлы: `src/app/api/images/route.ts` (`:485`).
  - Проверка: `rg -n 'posterWidth|VIDEO_POSTER_WIDTH'`; lint/tsc/build/e2e; постер
    видео в демо/WebDAV не 450 px.
  - Issue: #122.

- [ ] **A0.4. Локальные шрифты вместо Google Fonts.**
  - Файлы: `src/app/layout.tsx`, `src/app/fonts/*.woff2`, при необходимости
    `next.config.ts`.
  - Проверка: `rg -n 'next/font/google'` пусто; `bun run build` не обращается к
    `fonts.googleapis.com`/`fonts.gstatic.com`; lint/tsc/build/e2e; визуальный чек.
  - Issue: #124.

- [ ] **A0.5. Один PROPFIND на листинг, `503` при сбое WebDAV.**
  - Файлы: `src/app/api/photos/route.ts` (`:118`), при необходимости `src/lib/webdav.ts`.
  - Проверка: лог/счётчик — один PROPFIND; при заведомо недоступном WebDAV
    `curl /api/photos` → `503` + `Retry-After`; lint/tsc/build/e2e.
  - Issue: #125.

- [ ] **A0.6. Перегенерация `thumbnail` на проде.**
  - Файлы: нет (ops).
  - Проверка: прогресс 100%, выборочный размер ~21 КБ вместо ~89 КБ, нет 5xx,
    RSS не выше baseline.
  - Issue: #126. Выполняет владелец после деплоя A0.

### A1 — листинг, очередь sharp, мониторинг (3–5 дней)

- [ ] **A1.7. JSON-кэш листинга с TTL 30 с и stale-while-revalidate.**
  - Файлы: `src/app/api/photos/route.ts`, новый `src/lib/listing-cache.ts`,
    `.data/listing/`.
  - Проверка: повторный запрос отдаёт кэш; через 30 с — фоновое обновление;
    после `delete` запись инвалидируется; lint/tsc/build/e2e.
  - Issue: создать перед A1.

- [ ] **A1.8. Ограниченная очередь sharp.**
  - Файлы: `src/app/api/images/route.ts`, `src/app/api/images/generate/route.ts`,
    новый `src/lib/sharp-queue.ts`.
  - Проверка: не более 2 одновременных пайплайнов; очередь > 20 → `503` +
    `Retry-After: 3`; `useRetryingImage` повторяет; lint/tsc/build/e2e.
  - Issue: создать перед A1 (связан с #74, но это не очередь постеров ffmpeg).

- [ ] **A1.9. Проверка версии URL во всех точках.**
  - Файлы: те же, что A0.2c.
  - Проверка: карточки, лайтбокс, обложки папок, превью — все с `v=`;
    `rg` не находит сырых URL.
  - Issue: #121.

- [ ] **A1.10. Мониторинг.**
  - Файлы: nginx-конфиг на сервере, внешний uptime-сервис.
  - Проверка: отдельный `access_log` для `/api/images` и `/api/photos` с
    `$upstream_response_time` и `$upstream_cache_status`; внешний пробник
    настроен и шлёт алерт.
  - Issue: создать перед A1; выполняет владелец.

### A2 — чистка, деплой-гейт, healthcheck (1–2 дня)

- [ ] **A2.11. Чистка зависимостей и мёртвых `ui/*.tsx`.**
  - Файлы: `package.json`, `bun.lock`, `src/components/ui/*`, `src/app/globals.css`.
  - Проверка: `bunx tsc --noEmit`, `bun run lint`, `bun run build`,
    `bun run test:e2e`; размер `node_modules` и CSS до/после.
  - Issue: #10.

- [ ] **A2.12. Деплой-гейт.**
  - Файлы: `.github/workflows/deploy.yml` (`:41`), `.github/workflows/ci.yml` (`:12-15`).
  - Проверка: пуш в `main` даёт один workflow со сборкой; PR не запускает деплой;
    lint в деплое блокирующий.
  - Issue: #8 (часть), отдельный issue на гейт. **Нужно явное разрешение владельца
    на правку `.github/workflows/*`.**

- [ ] **A2.13. `/api/health` + WebDAV + алерт.**
  - Файлы: новый `src/app/api/health/route.ts`, `telegram-bot/`/`scripts/`.
  - Проверка: `/api/health` возвращает статус WebDAV; при сбое — алерт в Telegram;
    lint/tsc/build/e2e.
  - Issue: создать перед A2.

## Метрики до/после

| Метрика | До | После | Где мерили |
|---|---:|---:|---|
| Размер thumbnail (демо 1024²) | 89 КБ | — | локально, sharp 0.33.5 |
| Время thumbnail (демо 1024²) | 403 мс | — | локально, среднее из 5 |
| PROPFIND на листинг | 3 | — | лог/счётчик |
| p95 `/api/photos` | нет данных | — | nginx, после A1.10 |
| Первое фото в холодной папке | нет данных | — | Lighthouse/секундомер |
| RSS после батча | 80,9 МБ baseline | — | `ps` на проде |

## Принятые решения (до начала кода)

- **D1. Значения пресета — из разбора, не из #5.** `450/q60/effort4` (замер:
  21 КБ / 76 мс против 89 КБ / 403 мс). #5 обновлён комментарием; значения
  `800/q76/effort3` считаются устаревшими.
- **D2. Ключ `-v3` — во всех местах, а не в двух.** Кроме `images/route.ts:209`
  и `generate/route.ts:108,116`, есть `generate/route.ts:289,377` и
  `photos/delete/route.ts:37`. Иначе batch-генерация и удаление смотрят в старый ключ.
- **D3. Один helper для URL картинок.** 13 точек в 7 файлах; без helper'а версия
  разъедется. Для обложек папок (`page.tsx`) mtime недоступен — там только `v=4`;
  это принятое ограничение A0 (mtime обложки можно добавить позже в `dir-meta`).
- **D4. `.thumbs-v2` — новый default в коде и в env.** Старый `.thumbs` остаётся
  на диске/в облаке; его очистка — отдельная ручная ops-задача, не в этом плане.
- **D5. Ops-шаги не делает AI.** A0.6, A1.10 и правка nginx — владелец; сессия
  готовит код и инструкцию, но не трогает прод.
- **D6. Worktree создан вручную от `main`.** Нативный `worktree_create` не даёт
  выбрать базу, а текущий checkout стоит на `docs/gemini-key-reserve`.

## Журнал

### 2026-11-12 — подготовка (setup)

- Создан worktree `C:\My_projects_GIT\1pg_gall-plan-a`, ветка
  `feat/plan-a-runtime-repair` от `main` (`4d59e56`).
- Разбор `2026-11-12-rewrite-vs-fix.md` перенесён в ветку (в основном checkout
  он был untracked).
- `bun install --frozen-lockfile`: 466 пакетов, 6,04 с.
- Созданы issue: #121 (URL-версия), #122 (постер 1280), #123 (`.thumbs-v2`),
  #124 (локальные шрифты), #125 (PROPFIND), #126 (перегенерация, ops).
- #5 обновлён комментарием: новые значения пресета и полный список мест с `-v3`.
- Проверено: #98/#99 закрыты, PR #106/#107 смержены — предпосылка «сначала ретрай
  и очередь постеров, потом `-v3`» выполнена.
- Решения D1–D6 записаны выше.
