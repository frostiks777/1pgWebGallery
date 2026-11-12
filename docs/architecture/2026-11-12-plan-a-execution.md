# План A: ремонт рантайма — исполнение

**Дата старта:** 2026-11-12
**Ветка:** `feat/plan-a-runtime-repair`
**Worktree:** `C:\My_projects_GIT\1pg_gall-plan-a`
**База:** `main` @ `4d59e56`
**Исходный разбор:** [`docs/architecture/2026-11-12-rewrite-vs-fix.md`](./2026-11-12-rewrite-vs-fix.md) (далее — «разбор»)
**Статус:** A0: код готов (A0.1–A0.5, A0.6a); A0.6 — ops; A1/A2 запланированы.

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
| A0.1 + A0.2a | Пресет `450/q60/effort4` + ключ кэша `-v3` во всех местах | [#5](https://github.com/frostiks777/1pgWebGallery/issues/5) | ✅ |
| A0.2b | Co-located кэш `.thumbs` → `.thumbs-v2` | [#123](https://github.com/frostiks777/1pgWebGallery/issues/123) | ✅ |
| A0.2c + A1.9 | `v=4-<mtime>` во всех URL `/api/images` | [#121](https://github.com/frostiks777/1pgWebGallery/issues/121) | ✅ |
| A0.3 | Ширина постера видео — отдельная константа 1280 | [#122](https://github.com/frostiks777/1pgWebGallery/issues/122) | ✅ |
| A0.4 | `next/font/google` → `next/font/local` | [#124](https://github.com/frostiks777/1pgWebGallery/issues/124) | ✅ |
| A0.5 | Убрать `testWebDAVConnection` из горячего пути, `503` при сбое | [#125](https://github.com/frostiks777/1pgWebGallery/issues/125) | ✅ |
| A0.6a | `size` в `POST /api/images/generate` (только thumbnail) | [#127](https://github.com/frostiks777/1pgWebGallery/issues/127) | ✅ |
| A0.6 | Перегенерация `thumbnail` на проде | [#126](https://github.com/frostiks777/1pgWebGallery/issues/126) | ⏸️ |
| A1.7 | JSON-кэш листинга, TTL 30 с, SWR | issue не создан (A1) | ⬜ |
| A1.8 | Семафор sharp: 2 пайплайна, очередь > 20 → `503` | связан с [#74](https://github.com/frostiks777/1pgWebGallery/issues/74), нужен отдельный issue | ⬜ |
| A1.9 | Проверка версии URL во всех точках | [#121](https://github.com/frostiks777/1pgWebGallery/issues/121) | ✅ |
| A1.10 | Мониторинг: nginx access_log + внешний uptime | issue не создан (A1, ops) | ⏸️ |
| A2.11 | Чистка зависимостей и мёртвых `ui/*.tsx` | [#10](https://github.com/frostiks777/1pgWebGallery/issues/10) | ⬜ |
| A2.12 | Деплой-гейт: `continue-on-error` + `push: main` в `ci.yml` | частично [#8](https://github.com/frostiks777/1pgWebGallery/issues/8), нужен отдельный issue | ⬜ |
| A2.13 | `/api/health` + проверка WebDAV + алерт в Telegram | issue не создан (A2) | ⬜ |

**Связанные, но не входящие в A:** #13 (флак e2e), #52 (HEVC), #55 (nginx-прокси видео),
#59/#60 (стабильность бокса), #92/#116 (auth в `generate`, предпосылка A0.6),
#76 (актуализация документации), #86/#87/#117–#120 (Lighthouse).

## Чек-лист

### A0 — пресет, кэши, шрифты, лишний PROPFIND (1–2 дня)

- [x] **A0.1 + A0.2a. Пресет `thumbnail` 450/q60/effort4 и ключ `-v3`.** ✅
  - Файлы: `src/app/api/images/route.ts` (пресеты `:80-84`, хеш `:209`),
    `src/app/api/images/generate/route.ts` (пресеты `:84-88`, хеш `:108,116,289,377`),
    `src/app/api/photos/delete/route.ts` (`:37`).
  - Проверка: `rg -n '\-v2' src/` пусто; `bun run lint`, `bunx tsc --noEmit`,
    `bun run build`, `bun run test:e2e`; замер размера/времени одной миниатюры до/после.
  - Issue: #5.

- [x] **A0.2b. Co-located кэш → `.thumbs-v2`.** ✅
  - Файлы: `.env.example`, `README.md`, `src/app/api/images/route.ts`,
    `src/app/api/images/generate/route.ts`, `src/lib/webdav.ts`,
    `src/app/api/photos/delete/route.ts`.
  - Проверка: `rg -n 'COLOCATED_THUMBS_DIR'` показывает `.thumbs-v2`; в демо-режиме
    после запроса появляется `public/demo-photos/.thumbs-v2/`; lint/tsc/build/e2e.
  - Issue: #123.

- [x] **A0.2c + A1.9. Версия `v=4-<mtime>` во всех URL `/api/images`.** ✅
  - Файлы: новый `src/lib/imageUrl.ts`; `PhotoCard.tsx`, `Lightbox.tsx`,
    `HoneycombLayout.tsx`, `MinimalismLayout.tsx`, `AlbumLayout.tsx`, `page.tsx`.
  - Проверка: `rg -n '/api/images\?path=' src/` не находит сырых URL; lint/tsc/build/e2e;
    в браузере URL карточки содержит `v=4-<mtime>`; замена файла меняет URL.
  - Issue: #121.

- [x] **A0.3. Ширина постера видео — 1280, не из пресета.** ✅
  - Файлы: `src/app/api/images/route.ts` (`:485`).
  - Проверка: `rg -n 'posterWidth|VIDEO_POSTER_WIDTH'`; lint/tsc/build/e2e; постер
    видео в демо/WebDAV не 450 px.
  - Issue: #122.

- [x] **A0.4. Локальные шрифты вместо Google Fonts.** ✅
  - Файлы: `src/app/layout.tsx`, `src/app/fonts/*.woff2`, при необходимости
    `next.config.ts`.
  - Проверка: `rg -n 'next/font/google'` пусто; `bun run build` не обращается к
    `fonts.googleapis.com`/`fonts.gstatic.com`; lint/tsc/build/e2e; визуальный чек.
  - Issue: #124.

- [x] **A0.5. Один PROPFIND на листинг, `503` при сбое WebDAV.** ✅
  - Файлы: `src/app/api/photos/route.ts` (`:118`), при необходимости `src/lib/webdav.ts`.
  - Проверка: лог/счётчик — один PROPFIND; при заведомо недоступном WebDAV
    `curl /api/photos` → `503` + `Retry-After`; lint/tsc/build/e2e.
  - Issue: #125.

- [x] **A0.6a. Параметр `size` для batch-генерации.** ✅
  - Файлы: `src/app/api/images/generate/route.ts`,
    `tests/e2e/generate-size.spec.ts`.
  - Проверка: `POST { "size": "thumbnail" }` → `total = фото × 1`;
    без `size` — три размера; невалидный — `400`; e2e зелёный.
  - Issue: #127.

- [ ] **A0.6. Перегенерация `thumbnail` на проде.** ⏸️
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

- [x] **A1.9. Проверка версии URL во всех точках.** ✅
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
| Размер thumbnail (`01_mountain_sunset`) | 135,3 КБ | 14,0 КБ | e2e-лог, sharp 0.33.5 |
| Максимальная сторона thumbnail | 800 px | 450 px | e2e-тест |
| Время thumbnail (демо 1024², план) | 403 мс | — | локально, среднее из 5 |
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

### 2026-11-12 — A0.1 + A0.2a + A0.2b (коммит `2401d5b`)

**Что сделано**

- Пресет `thumbnail`: `450/q60/effort4` в `images/route.ts` и
  `images/generate/route.ts` (пресет дублируется в двух файлах).
- Ключ кэша `-v2` → `-v3` во всех шести местах: `images/route.ts:209`,
  `generate/route.ts:108,116,289,377`, `photos/delete/route.ts:37`.
- Co-located каталог `.thumbs` → `.thumbs-v2` в пяти местах в четырёх файлах
  (`images/route.ts`, `generate/route.ts` ×2, `webdav.ts`, `photos/delete/route.ts`),
  а также в `.env.example`, README, DEPLOYMENT и `.gitignore`
  (`**/.thumbs-v*/`).
- Добавлены два e2e-теста в `tests/e2e/gallery.smoke.spec.ts`:
  максимальная сторона thumbnail = 450 px и появление `.thumbs-v2/`.

**Проверки и наблюдения**

- RED: тест на 450 px падал на 800×800 — старый пресет.
- После смены пресета и `-v3` тест **всё ещё** видел 800 px: старый
  `public/demo-photos/.thumbs/` отдавался раньше нового локального ключа.
  Это и есть третий кэш из разбора §7 A0.2; без #123 смена пресета невидима.
- GREEN: 450×257 для неквадратного демо-фото (450 — длинная сторона),
  `.thumbs-v2/` создаётся.
- `bun run lint` — 0 ошибок; `bunx tsc --noEmit` — 0 ошибок;
  `bunx playwright test` — **7 passed** (1,1 мин).
- `bun run build` — таймаут 420 с на «Creating an optimized production build»,
  процесс убит. Это не ошибка диффа: сборка висит на `next/font/google`/холодном
  кэше. Перепроверить после A0.4 (локальные шрифты).
- Артефакт тестового прогона: в `.data/` был v3-файл 800 px, записанный из
  старого `.thumbs`. Удалены только сгенерированные `.webp`; `dir-meta` не тронут.

**Замеры**

| Фото | До | После | Выигрыш |
|---|---:|---:|---:|
| `01_mountain_sunset` | 135,3 КБ | 14,0 КБ | −89,7 % |
| `02_tropical_beach` | 136,2 КБ | 14,1 КБ | −89,6 % |

Старый пресет на `01_mountain_sunset` давал 48,9 КБ (−63,9 %) и 800×800 —
новый пресет экономит ещё в 3,5 раза больше байтов.

**Ruling**

- #5 и #123 закоммичены вместе: e2e показал, что смена пресета невидима без
  миграции `.thumbs`, то есть это одна атомарная правка кэшей.
  Цена, если неверно: один коммит ссылается на два issue; оба issue остаются
  отдельными для трекинга.

### 2026-11-12 — A0.2c + A1.9 (коммит `3ee8842`)

**Что сделано**

- Новый `src/lib/imageUrl.ts`: `imageUrl(path, size, lastModified?)` строит
  `/api/images?...&v=4-<mtime>`. Версия пресета — константа
  `IMAGE_PRESET_VERSION = 4`; при следующей смене пресета её нужно поднять.
- Все 13 точек переведены на helper: `PhotoCard`, `Lightbox` (medium/full,
  prefetch, миниатюры), `HoneycombLayout`, `MinimalismLayout`, `AlbumLayout`,
  обложки папок в `page.tsx`.
- Для демо-фото в `Minimalism`/`Album` сохранён прямой статический путь
  (они не ходят через `/api/images`).
- Для обложек папок mtime недоступен: `folders` API отдаёт только пути,
  поэтому там `v=4` без mtime (ограничение D3, принято).

**Проверки**

- RED: e2e-тест «image URLs carry the preset and mtime version» падал:
  в `src` не было `v=4-`.
- GREEN: карточка и medium-картинка лайтбокса содержат `v=4-<mtime>`;
  `rg '/api/images\?path=' src/` не находит сырых URL.
- `bun run lint` — 0; `bunx tsc --noEmit` — 0;
  `bunx playwright test` — **8 passed** (1,5 мин), включая старый retry-тест
  (`v=4-...&retry=1`).
- `bun run build` — всё ещё не перепроверен; ждёт A0.4.

**Обоснование helper'а (ponytail)**

- 13 точек в 7 файлах, версия должна быть единой; inline-дублирование
  гарантированно разъедется при следующем бампе пресета.
  Это одно предложение — требование скилла выполнено.

### 2026-11-12 — A0.3 (коммит `27d23d2`)

**Что сделано**

- `VIDEO_POSTER_WIDTH = 1280` рядом с `IMAGE_PRESETS`; `posterWidth` больше
  не зависит от `size`.
- Обновлён комментарий: раньше он говорил про 800px, теперь про 1280px.

**Проверки**

- `rg 'VIDEO_POSTER_WIDTH|posterWidth|IMAGE_PRESETS\[size\]'` — `posterWidth`
  берётся только из константы.
- `bun run lint` — 0; `bunx tsc --noEmit` — 0;
  `bunx playwright test` — **8 passed** (1,1 мин).

**Ruling**

- Отдельного e2e на ширину постера нет: в `public/demo-photos/` ноль видео,
  а добавление фикстуры — это #102/#74 п.8, отдельный issue. Изменение
  проверено код-инспекцией и существующим e2e; цена, если неверно: регрессия
  ширины постера не ловится CI до #102.

### 2026-11-12 — A0.4 (коммит `887e388`)

**Что сделано**

- Четыре woff2 в `src/app/fonts/` (latin, OFL-1.1): Inter Variable
  (48 КБ), JetBrains Mono Variable (40 КБ), Instrument Serif Regular/Italic
  (21 + 22 КБ). Источники и лицензии — `src/app/fonts/README.md`.
- `layout.tsx` переведён на `next/font/local`; CSS-переменные
  `--font-inter`, `--font-jetbrains-mono`, `--font-instrument-serif`
  не изменились.

**Проверки**

- `rg 'next/font/google' src/` — пусто.
- `bun run build` — **успех, компиляция 18,7 с** (до этого таймаут 420 с:
  сборка висела на `next/font/google`). В `.next/static` и `.next/server`
  нет ссылок на `fonts.googleapis.com`/`fonts.gstatic.com`.
- `bun run lint` — 0; `bunx tsc --noEmit` — 0;
  `bunx playwright test` — **8 passed** (1,2 мин).
- Визуальный чек не делался отдельным скриншотом; e2e подтверждает, что
  страница и карточки рендерятся, а `@font-face` теперь локальный.

**Ruling**

- Шрифты — конфигурация сборки, поэтому отдельного RED-теста нет:
  поведение доказывается самой сборкой (раньше висела, теперь 18,7 с)
  и отсутствием Google-URL в бандле. Цена, если неверно: визуальная
  разница начертаний не поймана автоматикой.

### 2026-11-12 — A0.5 (коммит `1df175a`)

**Что сделано**

- Из `src/app/api/photos/route.ts` убран `testWebDAVConnection`: он делал
  `getDirectoryContents('/')` + `getDirectoryContents(photosDir)`, после чего
  `getPhotosFromDirectory` делал третий запрос к той же папке.
- Остался один вызов `getPhotosFromDirectory` → один PROPFIND.
- Сбой листинга теперь `503` + `Retry-After: 5` вместо `200` с `photos: []`.

**Проверки**

- RED: временный Bun-скрипт с `WEBDAV_URL=http://127.0.0.1:1` вызвал route
  handler напрямую — старый код вернул `200` и пустой список.
- GREEN: тот же скрипт после правки — `status: 503`, `retry-after: 5`,
  в логе только `[WebDAV] Fetching photos from: /Photos`, без root/preflight.
- `bun run lint` — 0; `bunx tsc --noEmit` — 0;
  `bunx playwright test` — **8 passed** (54,2 с).

**Ruling**

- Постоянного e2e на WebDAV-сбой нет: демо-режим не поднимает WebDAV,
  а фикстура-сервер — отдельная инфраструктура. Проверка выполнена
  временным скриптом; цена, если неверно: регрессия 503/Retry-After
  не ловится CI, пока не появится WebDAV-тест.

### 2026-11-12 — A0.6a (коммит `4d84911`)

**Находка**

- `POST /api/images/generate` всегда генерировал `thumbnail + medium + full`
  (`ALL_SIZES`), а A0.6 требует только `thumbnail`. Запуск «как есть» был бы
  втрое дольше и записал бы втрое больше данных. Это дефект плана, а не кода:
  параметра `size` просто не было.

**Что сделано**

- `runGeneration(scopePath, sizes = ALL_SIZES)`; `status.total` и цикл
  считают только выбранные размеры.
- POST принимает `size` из тела или query; невалидный → `400`; без `size`
  поведение прежнее.
- В ответ POST добавлено `sizes`, чтобы ops-прогон было видно в логе.
- Новый e2e `tests/e2e/generate-size.spec.ts`.

**Проверки**

- RED: `POST { size: "thumbnail" }` давал `total = 24` (8 фото × 3).
- GREEN: `8 photos × 1 sizes = 8 tasks`, `total = 8`, `running = false`.
- `bun run lint` — 0; `bunx tsc --noEmit` — 0;
  `bun run test:e2e` — **9 passed** (1,3 мин);
  `bun run build` — успех, 16,1 с.

**Ruling**

- Код-шаг выделен в отдельный issue #127, а не расширен в #126: #126 остаётся
  ops-прогоном на проде, #127 — поведением endpoint'а. Цена, если неверно:
  два issue вместо одного, зато «one issue, one change» соблюдён.

## A0: итог и передача владельцу

**Готово в ветке `feat/plan-a-runtime-repair`:**

- A0.1/A0.2a — пресет 450/q60/effort4 и `-v3` во всех местах.
- A0.2b — `.thumbs-v2`.
- A0.2c/A1.9 — `v=4-<mtime>` во всех URL `/api/images`.
- A0.3 — постер видео 1280px.
- A0.4 — локальные шрифты, сборка без Google Fonts.
- A0.5 — один PROPFIND, `503 + Retry-After` при сбое WebDAV.
- A0.6a — `size` для batch-генерации.

**Коммиты:** `2401d5b`, `3ee8842`, `27d23d2`, `887e388`, `1df175a`,
`4d84911` (+ docs-коммиты журнала).

**Проверки на 2026-11-12:** lint 0, tsc 0, build 16,1 с, e2e 9/9.

**Что осталось сделать владельцу (A0.6, #126):**

1. Открыть PR из `feat/plan-a-runtime-repair` в `main`, дождаться ревью и
   смержить. Пуш в `main` деплоит прод.
2. На проде проверить `.env.local`: если `COLOCATED_THUMBS_DIR` задан явно как
   `.thumbs`, заменить на `.thumbs-v2` (иначе код и окружение разъедутся).
3. Очистить nginx-кэш `/api/images` (старые записи живут до 7 дней; новые URL
   с `v=` их обойдут, но старый кэш занимает место).
4. С сервера, только с localhost:
   `curl -X POST http://127.0.0.1:3000/api/images/generate -H 'Content-Type: application/json' -d '{"size":"thumbnail"}'`
   затем опрашивать `GET /api/images/generate` до `running: false`.
   До #116 endpoint без пароля — снаружи не запускать.
5. Проверить: прогресс 100 %, выборочный размер ~14 КБ вместо ~135 КБ,
   нет 5xx, RSS не выше baseline.
6. Старый `.thumbs` в WebDAV не удалять сразу: сначала убедиться, что
   `.thumbs-v2` наполняется и галерея его читает; очистку делать отдельно,
   вручную.
