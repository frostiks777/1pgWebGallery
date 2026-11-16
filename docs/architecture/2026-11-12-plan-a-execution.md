# План A: ремонт рантайма — исполнение

**Дата старта:** 2026-11-12
**Ветка:** `feat/plan-a-runtime-repair`
**Worktree:** `C:\My_projects_GIT\1pg_gall-plan-a`
**База:** `main` @ `4d59e56`
**Исходный разбор:** [`docs/architecture/2026-11-12-rewrite-vs-fix.md`](./2026-11-12-rewrite-vs-fix.md) (далее — «разбор»)
**Статус:** A0: код готов (A0.1–A0.5, A0.6a), финальное ревью пройдено;
PR [#129](https://github.com/frostiks777/1pgWebGallery/pull/129) смержен и
задеплоен; follow-up #131 — PR [#132](https://github.com/frostiks777/1pgWebGallery/pull/132);
A0.7 (deferred minors) — 6 атомарных issue закрыты, PR
[#141](https://github.com/frostiks777/1pgWebGallery/pull/141);
A0.6 — ops; A1.7 (кэш листинга) и A1.8 (очередь sharp) закрыты;
A1.10 — ops; A2 сдвинут: перед ним внеплановый трек
[#151](https://github.com/frostiks777/1pgWebGallery/issues/151)–[#155](https://github.com/frostiks777/1pgWebGallery/issues/155)
(2026-11-15), #151 смержен (PR
[#156](https://github.com/frostiks777/1pgWebGallery/pull/156)), #152 смержен (PR
[#159](https://github.com/frostiks777/1pgWebGallery/pull/159)), #154 смержен (PR
[#160](https://github.com/frostiks777/1pgWebGallery/pull/160)), #155 смержен (PR
[#162](https://github.com/frostiks777/1pgWebGallery/pull/162)), #153 смержен (PR
[#163](https://github.com/frostiks777/1pgWebGallery/pull/163)) — внеплановый трек
закрыт 2026-11-16.

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
| A0.7.1 | Документация после A0: Google Fonts больше не нужен сборке | [#135](https://github.com/frostiks777/1pgWebGallery/issues/135) | ✅ |
| A0.7.2 | Документация после A0: `.thumbs-v2`, `v=4-<mtime>`, размер thumbnail | [#136](https://github.com/frostiks777/1pgWebGallery/issues/136) | ✅ |
| A0.7.3 | OFL-1.1 рядом со шрифтами | [#140](https://github.com/frostiks777/1pgWebGallery/issues/140) | ✅ |
| A0.7.4 | Единый источник версий кэша | [#137](https://github.com/frostiks777/1pgWebGallery/issues/137) | ✅ |
| A0.7.5 | `sizes` в статусе и ответе «already in progress» | [#138](https://github.com/frostiks777/1pgWebGallery/issues/138) | ✅ |
| A0.7.6 | 404/403 WebDAV не отдаются как retryable 503 | [#139](https://github.com/frostiks777/1pgWebGallery/issues/139) | ✅ |
| A0.6 | Перегенерация `thumbnail` на проде | [#126](https://github.com/frostiks777/1pgWebGallery/issues/126) | ⏸️ |
| A1.7 | JSON-кэш листинга, TTL 30 с, SWR | [#145](https://github.com/frostiks777/1pgWebGallery/issues/145) | ✅ |
| A1.8 | Семафор sharp: 2 пайплайна, очередь > 20 → `503` | [#144](https://github.com/frostiks777/1pgWebGallery/issues/144) | ✅ |
| A1.9 | Проверка версии URL во всех точках | [#121](https://github.com/frostiks777/1pgWebGallery/issues/121) | ✅ |
| A1.10 | Мониторинг: nginx access_log + внешний uptime | issue не создан (A1, ops) | ⏸️ |
| A2.11 | Чистка зависимостей и мёртвых `ui/*.tsx` | [#10](https://github.com/frostiks777/1pgWebGallery/issues/10) | ✅ |
| A2.12 | Деплой-гейт: `push: main` в `ci.yml` (линт-гейт в `deploy.yml` закрыт [#154](https://github.com/frostiks777/1pgWebGallery/issues/154)) | [#8](https://github.com/frostiks777/1pgWebGallery/issues/8) | 🟡 PR [#165](https://github.com/frostiks777/1pgWebGallery/pull/165) |
| A2.13 | `/api/health` + проверка WebDAV + алерт в Telegram | issue не создан (A2) | ⬜ |

**Связанные, но не входящие в A:** #13 (флак e2e), #52 (HEVC), #55 (nginx-прокси видео),
#59/#60 (стабильность бокса), #92/#116 (auth в `generate`, предпосылка A0.6),
#76 (актуализация документации), #86/#87/#117–#120 (Lighthouse).

## Внеплановый трек 2026-11-15: #151–#155

Ревью 2026-11-15 нашло пять дефектов вне плана A. Владелец поставил их **перед A2**;
#151 — первым, потому что это дыра авторизации, а не гигиена.

| Порядок | Issue | Что | Почему здесь |
|---:|---|---|---|
| 1 | [#151](https://github.com/frostiks777/1pgWebGallery/issues/151) | auth на `covers`, `hidden`, `panoramas`, `GET /api/images/generate` | при включённом пароле аноним читает и **меняет** скрытые/обложки/панорамы в `.data/dir-meta` |
| 2 | [#152](https://github.com/frostiks777/1pgWebGallery/issues/152) | коллизия `sanitizeDir` для кириллицы | две русские папки одинаковой длины пишут в один `.data/dir-meta/*.json` и затирают настройки друг друга |
| 3 | [#154](https://github.com/frostiks777/1pgWebGallery/issues/154) | `deploy.yml`: блокирующий линт | деплой может выкатить прод с линтерными дефектами; правка `.github/workflows/*` — с разрешения владельца |
| 4 | [#155](https://github.com/frostiks777/1pgWebGallery/issues/155) | безопасное извлечение расширений в `webdav.ts`, удалить `/api`-заглушку | файл без точки в имени ложно считается картинкой; мёртвый код |
| 5 | [#153](https://github.com/frostiks777/1pgWebGallery/issues/153) | `type: module` в `.opencode`, чистка `package.json` | предупреждение Node, мёртвые `zod`/`tailwindcss-animate`, рассинхрон sharp |

A2 (#10, #8, `/api/health`) идёт после этого трека. #151 не меняет формат `.data`;
#152 меняет и требует обратной совместимости со старыми файлами (см. issue).

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

- [ ] **A0.6. Перегенерация `thumbnail` на проде.** 🔄
  - Файлы: нет (ops).
  - Проверка: прогресс 100%, выборочный размер ~14 КБ вместо ~135 КБ, нет 5xx,
    RSS не выше baseline.
  - Issue: #126. 2026-11-12: старые `.thumbs` на WebDAV удалены (−3,97 ГБ),
    nginx-кэш очищен, прогон `{"size":"thumbnail"}` запущен; осталось дождаться
    `running: false` и почистить `.data` под root (инструкция — в разделе
    «A0: итог и передача владельцу»).

### A0.7 — deferred minors из ревью A0

- [x] **A0.7.1. Документация: build без Google Fonts.** (#135) ✅
- [x] **A0.7.2. Документация: `.thumbs-v2`, `v=4-<mtime>`, размер thumbnail.** (#136) ✅
- [x] **A0.7.3. Текст OFL-1.1 рядом со шрифтами.** (#140) ✅
- [x] **A0.7.4. Единый источник версий кэша.** (#137) ✅
- [x] **A0.7.5. `sizes` в статусе generate.** (#138) ✅
- [x] **A0.7.6. 404/403 WebDAV ≠ retryable 503.** (#139) ✅

### A1 — листинг, очередь sharp, мониторинг (3–5 дней)

- [x] **A1.7. JSON-кэш листинга с TTL 30 с и stale-while-revalidate.** ✅
  - Файлы: `src/app/api/photos/route.ts`, новый `src/lib/listingCache.ts`,
    `.data/listing/`.
  - Проверка: повторный запрос отдаёт кэш; через 30 с — фоновое обновление;
    после `delete` запись инвалидируется; lint/tsc/build/e2e.
  - Issue: [#145](https://github.com/frostiks777/1pgWebGallery/issues/145).

- [x] **A1.8. Ограниченная очередь sharp.** ✅
  - Файлы: `src/app/api/images/route.ts`, `src/app/api/images/generate/route.ts`,
    новые `src/lib/sharpQueue.ts` и `src/lib/imageOptimize.ts`.
  - Проверка: 25 параллельных запросов → 22×200, 3×503 + `Retry-After: 3`,
    одновременно не больше 2 пайплайнов; lint/tsc/build/e2e.
  - Issue: [#144](https://github.com/frostiks777/1pgWebGallery/issues/144).

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

**Находка финального ревью (2026-11-12)**

- `v=4-<mtime>` чинит браузерный и nginx-кэш, но **не серверный**: локальный
  ключ `.data` (`md5(path-size-v3)`) и имя co-located файла по-прежнему без
  mtime. Заменённое фото с тем же именем получит новый URL, но сервер отдаст
  старые байты из кэша и закэширует их под новым URL на год.
  Это plan-scope дефект A0.2c, а не регрессия диффа; вынесен в #128.
  В A0 не чинится.

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

**A0.6 (#126) — как выполнять после #134 (auth)**: инструкция обновлена 2026-11-12.

После #134 `POST /api/images/generate` проверяет cookie галереи, если задан
`WEBDAV_LOGON_PASSWORD`. Без cookie — `401 Unauthorized`. Cookie считается как
`sha256("<WEBDAV_URL>:<WEBDAV_LOGON_PASSWORD>")` (см. `src/lib/auth.ts`), имя —
`gallery-auth`. Запуск только с localhost сервера:

```bash
ENVFILE=/var/www/apps/photo-gallery/.env.local
envval() { grep -E "^[[:space:]]*$1[[:space:]]*=" "$ENVFILE" | head -1 \
  | sed -E "s/^[^=]*=[[:space:]]*//; s/[[:space:]]*$//"; }
URL=$(envval WEBDAV_URL); PW=$(envval WEBDAV_LOGON_PASSWORD)
TOKEN=$(node -e 'const c=require("crypto");console.log(c.createHash("sha256")
  .update(process.argv[1]+":"+process.argv[2]).digest("hex"))' "$URL" "$PW")

curl -s -X POST http://127.0.0.1:3000/api/images/generate \
  -H 'Content-Type: application/json' -H "Cookie: gallery-auth=$TOKEN" \
  -d '{"size":"thumbnail"}'
curl -s http://127.0.0.1:3000/api/images/generate   # sizes, total, done, running
```

Ответ POST содержит `sizes: ["thumbnail"]`; `GET` во время прогона — те же `sizes`,
`total = фото × 1`, затем `done`. Если гейта по паролю нет (переменная пустая),
cookie не нужен.

**Что уже сделано на проде 2026-11-12 (агент, с разрешения владельца):**

1. Старые `.thumbs` (800px) на WebDAV удалены во всех 33 альбомах — освобождено
   **3,97 ГБ**; `.thumbs-v2` (450px) на месте во всех альбомах.
2. nginx-кэш `/api/images` очищен через `sudo /usr/local/sbin/pg-nginx-cache-fix`
   (до 4 КБ).
3. Перегенерация запущена: `POST {"size":"thumbnail"}`, `running: true`,
   `sizes: ["thumbnail"]`. Ждать не нужно — процесс идёт в фоне сервиса.

**Что осталось владельцу:**

- Старые миниатюры в `.data/` (локальный кэш, ~3,4 ГБ) — файлы принадлежат
  `www-data`, у `pgagent` нет прав на запись. Удалить под root, сохранив `dir-meta/`:

  ```bash
  sudo find /var/www/apps/photo-gallery/.data -maxdepth 1 -type f \
    \( -name '*.webp' -o -name '*.jpg' \) -delete
  ```

  Кэш холодный — миниатюры пересоздадутся на запросе; `dir-meta/` (скрытые,
  панорамы, обложки) не трогать.
- После завершения прогона (#126): прогресс 100 %, выборочный размер ~14 КБ вместо
  ~135 КБ, нет 5xx, RSS не выше baseline.

## Финальное ревью ветки (2026-11-12)

**Ревьюер:** отдельный субагент, свежий контекст, read-only.
**Диапазон ревью:** `4d59e56..f229d13` (до фиксов). Фиксы тестов — `f276cf9`,
обновление этого файла — `f5941f6`.
**Вердикт:** Ready to merge with fixes. Critical — нет.

**Important (все закрыты):**

1. **Серверный кэш не инвалидируется по mtime.** `v=4-<mtime>` чинит
   браузер/nginx, но `.data`-ключ и `.thumbs-v2`-имя остаются по пути.
   Вынесено в #128 как plan-scope follow-up; в A0 не чинится.
2. **`.thumbs-v2` e2e зависел от прошлых прогонов** (локальный HIT не пишет
   co-located файл). Исправлено в `f276cf9`: изолированная фикстура
   в подкаталоге, локальный и co-located кэш удаляются перед запросом.
3. **`generate-size` e2e не проверял `done`** и не покрывал default/400.
   Исправлено в `f276cf9`: serial, одна фото-фикстура, `done === total`,
   default = 3 размера, invalid = 400.

**Проверки после исправлений:** lint 0, tsc 0, build 20,1 с, e2e **11/11**.

**Deferred minors (закрыты в A0.7):**

- ~~Три версии кэша не связаны~~ → #137: `src/lib/cacheVersions.ts`.
- ~~`README.md`/`AGENTS.md` говорят, что build требует Google Fonts~~ → #135.
- ~~`CHECKLIST.md` ожидает 50–150 КБ~~ → #136: ~14 КБ.
- ~~`MEMORY.md`, `CONTEXT.md`, `MIGRATION.md` описывают старый `.thumbs` и URL без версии~~ → #136.
- ~~OFL: рядом со шрифтами нет текста лицензии~~ → #140.
- ~~`503` для постоянной ошибки `PHOTOS_DIR`~~ → #139: 404/403 → 404/502.
- ~~Ответ «already in progress» не возвращает `sizes`~~ → #138.
- ~~Комментарии `.thumbs/` в коде~~ → #137.
- ~~У нового `size` в `generate` нет why-комментария~~ → #138.

**Rulings по «Declined to judge» ревьюера** (все — оставить как есть):

- Обложки без mtime (`v=4`) — принято D3.
- Старые `.thumbs`/`.data` v2 — ops/D4, чистка вручную.
- `generate` без auth/rate-limit — #92/#116, вне A0.
- Кнопка UI генерирует все размеры — `size` сделан для ops, UI не трогаем.
- Latin-only шрифты — поведение не изменилось.
- Batch-постер 2400 vs on-demand 1280 — A0.3 менял только on-demand путь.
- Двойной `decodeURIComponent` — pre-existing.
- Клиентский `v` в ключе кэша — pre-existing, #98/#91.
- `/api/folders` отдаёт 500 — pre-existing, клиент деградирует.
- `/api/webdav/test` — намеренный маршрут.
- Неатомарные записи кэша — pre-existing, оба писателя дают одинаковые байты.
- Нет unit-теста `imageUrl` — в репозитории нет unit-фреймворка.
- Старые числа в `MIGRATION.md`/`PERFORMANCE.md` — #76.
- TTL `.data` 30 дней / nginx 7 дней — принятый дизайн.

### 2026-11-12 — PR #129

- Ветка `feat/plan-a-runtime-repair` запушена в `origin`.
- PR [#129](https://github.com/frostiks777/1pgWebGallery/pull/129) открыт
  в `main`: A0 целиком, замеры, проверки, финальное ревью, список issue.
- CI запущен. Мерж и деплой — вручную владельцем; после деплоя — A0.6 (#126).

### 2026-11-12 — PR #129 смержен, деплой зелёный

- PR #129 смержен (`2abe825`), `Build & Deploy` завершился за 53 с,
  сервис перезапущен; прод отвечает `HTTP 200` за 0,84 с.
- Авторевью PR #129: 5 замечаний, блокеров нет. Actionable часть
  (постер 1280 в `generate` + why-комментарии к demo/cover URL) —
  [#131](https://github.com/frostiks777/1pgWebGallery/issues/131),
  PR [#132](https://github.com/frostiks777/1pgWebGallery/pull/132).
- A0.6 (#126) остаётся: перегенерация thumbnail на проде после деплоя.

### 2026-11-12 — A1.7: JSON-кэш листинга (#145)

**Что сделано**

- `src/lib/listingCache.ts`: ключ → `.data/listing/<sha1>.json`; TTL 30 с;
  просроченная запись отдаётся сразу (`STALE`) и обновляется в фоне;
  single-flight на ключ; запись через tmp + rename.
- `/api/photos` (WebDAV-ветка) ходит через кэш; ответ несёт
  `X-Listing-Cache: HIT|STALE|MISS`.
- `/api/photos/delete` инвалидирует листинг родительской папки.
- Демо-режим не кэшируется: локальный скан дешёвый, а кэш сделал бы e2e
  зависимым от времени.

**Проверки**

- Временный Bun-скрипт с фейковым WebDAV: 7 сценариев — MISS (1 PROPFIND),
  HIT (0 запросов), STALE + фоновое обновление, HIT после обновления,
  ошибка WebDAV при наличном stale → `200 STALE`, инвалидация после delete → MISS.
- `bun run lint` — 0; `bunx tsc --noEmit` — 0; `bun run build` — успех;
  `bun run test:e2e` — **13 passed**.

**Ruling**

- 30 с + SWR, а не «кэш до изменения»: внешние загрузки в облако появляются в
  пределах окна, а удаление через API инвалидирует сразу. Цена, если неверно:
  загрузка мимо галереи видна с задержкой до 30 с; это осознанно.

**PR:** [#146](https://github.com/frostiks777/1pgWebGallery/pull/146).
### 2026-11-12 — A0.7: deferred minors (ветка `fix/a0-deferred-minors`)

**Что сделано** — 6 атомарных issue, 6 коммитов:

| Issue | Коммит | Что |
|---|---|---|
| [#135](https://github.com/frostiks777/1pgWebGallery/issues/135) | `c9e4c02` | README/AGENTS/checks.md/MEMORY: build без Google Fonts |
| [#136](https://github.com/frostiks777/1pgWebGallery/issues/136) | `0038c1f` | `.thumbs-v2`, `v=4-<mtime>`, ~14 КБ в CHECKLIST/CONTEXT/MIGRATION/MEMORY |
| [#140](https://github.com/frostiks777/1pgWebGallery/issues/140) | `64b6354` | `src/app/fonts/OFL-1.1.txt` + copyright-строки |
| [#137](https://github.com/frostiks777/1pgWebGallery/issues/137) | `9b04722` | `src/lib/cacheVersions.ts`; 11 литералов убраны; комментарии `.thumbs/` |
| [#138](https://github.com/frostiks777/1pgWebGallery/issues/138) | `cc177d2` | `status.sizes` + why-комментарий к `size` + e2e |
| [#139](https://github.com/frostiks777/1pgWebGallery/issues/139) | `1fcf818` | 404/403 WebDAV → 404/502, транзиентное → 503 + `Retry-After` |

**Проверки:** `bun run lint` — 0; `bunx tsc --noEmit` — 0; `bun run build` — успех
(без сети); `bun run test:e2e` — **14 passed**; `generate-size` отдельно — 4 passed.
`/api/photos` проверен временным Bun-скриптом с фейковым WebDAV-сервером:
404→404, 403→502, 401→502, 500→503 + `Retry-After: 5`, недоступный хост→503,
демо-режим→200.

**Ruling — один PR на весь A0.7.** Это единый список хвостов одного ревью, как A0 в
PR #129; каждый issue закрывается своим `Closes` в теле PR. Цена, если неверно:
ревью видит 6 тем в одном диффе; выигрыш — один деплой вместо шести.

**Ruling — `IMAGE_PRESET_VERSION` переехал в `cacheVersions.ts`.** Отдельный модуль,
а не комментарий: 11 call-sites и два уже случившихся промаха (D2/D3) — цена
дублирования выше цены файла на 12 строк.

**Ограничение.** Постоянного e2e на 404/403 нет — как у A0.5, для этого нужна
фикстура WebDAV-сервера; регрессия ловится только ручным скриптом.

**PR:** [#141](https://github.com/frostiks777/1pgWebGallery/pull/141) открыт в `main`;
мерж и деплой — вручную владельцем.

### 2026-11-15 — A1.8: ограниченная очередь sharp (#144)

**Что сделано**

- `src/lib/sharpQueue.ts`: не больше 2 одновременных пайплайнов и 20 ожидающих;
  21-й ожидающий получает `SharpQueueFullError` до того, как начнёт работу.
- `src/lib/imageOptimize.ts`: единственная точка инициализации sharp
  (`concurrency(1)`, `cache({ memory: 0 })`), пресеты и `optimizeImage`; батч
  больше не создаёт второй экземпляр sharp без этих настроек.
- `/api/images`: слот занимается после проверки кэшей; для фото он покрывает и
  fetch оригинала (в памяти не больше 2 оригиналов), для видео — только encode,
  потому что ждать ffmpeg под sharp-слотом значило бы держать одну из двух
  полос занятой до 90 с. Переполнение — `503` + `Retry-After: 3`.
- `/api/images/generate`: тот же слот вокруг `optimizeImage`; переполнение —
  `console.warn`, `errors++`, `done++`, `continue` (фоновый прогон не падает).
- `sharpAvailable` в статусе батча теперь из общего модуля.

**Проверки**

- Временный Bun-скрипт: 25 задач → `maxActive=2`, `rejected=3`, `completed=22`.
- HTTP-скрипт против dev-сервера, 25 параллельных запросов к холодному
  4000×3000 JPEG: **22×200, 3×503**, у всех 503 `Retry-After: 3`; в логе
  видно по 2 пайплайна.
- `bun run lint` — 0; `bunx tsc --noEmit` — 0; `bun run build` — успех;
  `bun run test:e2e` — **14 passed**.

**Ruling**

- 2 активных + 20 ожидающих, а не 20 всего: формулировка issue «очередь не длиннее
  20» точнее, чем арифметика приёмки (25 → 5×503); фактически 25 → 3×503.
- Общий модуль sharp, а не только очередь: `concurrency(1)`/`cache(0)` — глобальные
  настройки libvips, и второй экземпляр в `generate` мог загрузиться первым и
  работать с дефолтным пулом потоков. Очередь теперь единственный вход в sharp.
- Слот для фото покрывает fetch: иначе 22 принятых запроса успевают вытащить
  22 оригинала в heap до первого `optimizeImage` — это memory-половина #144.

**PR:** [#149](https://github.com/frostiks777/1pgWebGallery/pull/149); мерж и деплой — вручную владельцем.

### 2026-11-16 - #152: коллизия `sanitizeDir` для кириллицы

**Что сделано**

- `src/lib/dir-meta.ts`: `sanitizeDir` — читаемый префикс (до 32 символов) + `_` +
  12 hex SHA-256 исходного пути. `legacyFileName` сохраняет прежнее имя без хеша
  для чтения.
- `readMeta` сначала ищет файл с хешем, затем старый без хеша; `writeMeta` пишет
  только новый. Старый файл после записи не удаляется.
- `tests/e2e/dir-meta-collision.spec.ts`: шесть не-ASCII имён (кириллица,
  пробелы, умляуты) получают шесть разных файлов; файл без хеша читается до
  первой записи и уступает новому после неё.

**Проверка**

- `bun run lint` — 0; `bunx tsc --noEmit` — 0; `bun run build` — успешно;
  `bun run test:e2e` — **20 passed** (было 18, +2 новые).

**Ruling**

- Тест — e2e, не unit: в проекте нет unit-фреймворка, а добавление Vitest —
  отдельная нерешённая задача (`AGENTS.md`).
- Старый файл не удаляется после миграции: имя без хеша неинъективно, удаление
  могло бы стереть единственную копию настроек соседней папки. Мусор безвреден —
  новый файл всегда приоритетнее.
- ADR не нужен: структура JSON не меняется, меняется только внутреннее имя файла.

**PR:** [#159](https://github.com/frostiks777/1pgWebGallery/pull/159).

### 2026-11-16 - #154: блокирующий линт в `deploy.yml`

**Что сделано**

- `.github/workflows/deploy.yml`: у шага Lint убран `continue-on-error`, шаг
  переименован в `Lint`, комментарий ссылается на ADR-0003 и `8a922af` (#12).
- `AGENTS.md`: «Lint there is blocking, same as `ci.yml` (ADR-0003)».
- `MEMORY.md`: пункт про гейт линта на `main` больше не требует парной правки.

**Проверка**

- YAML разобран `js-yaml`: шаг `Lint` без `continue-on-error`.
- `bun run lint` — 0; `bunx tsc --noEmit` — 0; `bun run build` — успешно;
  `bun run test:e2e` — **18 passed** (ветка от `main` до мержа #152).

**Ruling**

- Правка `MEMORY.md` — часть той же фактической ошибки: пункт прямо описывал
  `deploy.yml:39-41` как текущее состояние.
- Журнал добавлен после мержа: и #152, и #154 дописывали конец файла, и
  одновременные PR дали бы конфликт.

**PR:** [#160](https://github.com/frostiks777/1pgWebGallery/pull/160).

### 2026-11-16 - #155: безопасное расширение и мёртвый `/api`

**Что сделано**

- Новый `src/lib/imageExt.ts`: `IMAGE_EXTENSIONS`, `imageExtOf`, `isImageFile`.
  `imageExtOf` повторяет семантику `videoExtOf` из `videoExt.ts`.
- `src/lib/webdav.ts`: обе функции листинга используют `isImageFile`; превью
  папок получило `.svg`, как и полный листинг. Удалена неиспользуемая
  `getPhotoBuffer`.
- `src/app/api/images/generate/route.ts`: три места с локальным `imageExts`
  переведены на общий helper.
- Удалён `src/app/api/route.ts` — заглушка `Hello, world!`.
- `tests/e2e/image-ext.spec.ts`: имена без точки, регистр, `.svg`, точка в
  середине имени и 404 на `/api`.

**Проверка**

- До правки спека падала только на `/api` (`200` вместо `404`), после — 5 passed.
- `bun run lint` — 0; `bunx tsc --noEmit` — 0; `bun run build` — успешно;
  `bun run test:e2e` — **25 passed**.

**Ruling**

- Общий модуль, а не правка одной строки: три копии списка уже разъехались
  (`.svg` был только в одной), и следующая правка расширений снова задела бы
  не все. Форма модуля повторяет `videoExt.ts`.
- `photos/route.ts` (demo-листинг, 5 расширений) не трогали: это отдельный
  набор для демо-файлов, в задачу #155 не входит.

**PR:** [#162](https://github.com/frostiks777/1pgWebGallery/pull/162).

### 2026-11-16 - #153: `type: module` и чистка `package.json`

**Что сделано**

- `.opencode/package.json`: `"type": "module"` — Node больше не выводит
  `MODULE_TYPELESS_PACKAGE_JSON` при импорте `telegram-autostart.js`. Файл был
  скрыт локальным `.opencode/.gitignore`, поэтому добавлен принудительно:
  иначе фикс не доехал бы до чистого клона.
- `package.json`: убраны `engines.npm` (противоречил `devEngines` с bun),
  `zod` и `tailwindcss-animate`; `@img/sharp-linux-x64` выровнен до `~0.33.5`.
- Удалён `tailwind.config.ts`: его единственным потребителем был
  `tailwindcss-animate`, а Tailwind v4 читает `globals.css` и
  `postcss.config.mjs`, `@config` нигде не указан.
- `bun.lock` обновлён (`bun install`, не frozen): минус два пакета.

**Проверка**

- `bun run test:plugin-smoke` — **12/12 PASS**, 0 предупреждений
  `MODULE_TYPELESS` (три прогона подряд).
- `bun run lint` — 0; `bunx tsc --noEmit` — 0; `bun run build` — успешно;
  `bun run test:e2e` — **25 passed**.

**Ruling**

- `tailwind.config.ts` удалён, а не оставлен мёртвым: после удаления пакета его
  импорт сломал бы `tsc`, а v4 его не читает — сборка подтвердила.
- `zod` остаётся в `bun.lock` транзитивно через `eslint-plugin-react-hooks`;
  прямой зависимости в `package.json` больше нет.

**PR:** [#163](https://github.com/frostiks777/1pgWebGallery/pull/163).

### 2026-11-16 - #10: мёртвые зависимости и `ui/*.tsx`

**Что сделано**

- Удалены 30 мёртвых файлов `src/components/ui/`: из 38 остались `button`,
  `card`, `dialog`, `dropdown-menu`, `sheet`, `toast`, `toaster`, `tooltip`.
- Удалены 24 прямые зависимости: 22 Radix-пакета, `sonner`, `next-themes`.
- Из `globals.css` убраны 13 `--color-sidebar-*`/`--color-chart-*` из
  `@theme inline` и их определения в `:root` и `html[data-theme="light"]`.
- `bun.lock` обновлён (`bun install`).

**Проверка**

- `bun run lint` — 0; `bunx tsc --noEmit` — 0; `bun run build` — успешно;
  `bun run test:e2e` — **25 passed**.
- `node_modules`: 471,6 → 469,3 МБ; CSS-бандл: 98,3 → 80,7 КБ (−18 %).

**Ruling**

- `zod` в списке issue уже был удалён в #153, а `@radix-ui/react-navigation-menu`
  в issue пропущен — он мёртв так же, как остальные, и удалён. Поэтому счёт
  снова 24.
- Цепочка `toast`/`use-toast` оставлена: по импортам она живая, но `toast()`
  никто не вызывает. Issue просил подтверждение владельца — кандидат на
  отдельный issue.
- Замер «после» сделан на `node_modules`, пересозданном с нуля: `bun install`
  обновил lock, но не удалил с диска старые каталоги.

**PR:** [#164](https://github.com/frostiks777/1pgWebGallery/pull/164).

### 2026-11-16 - #8: один workflow на `main` и кеш `.next/cache`

**Что сделано**

- `ci.yml` больше не триггерится на `push: main` — только `pull_request`.
  Гейт на `main` остаётся в `deploy.yml`, где lint и build блокирующие с #154.
- `actions/cache@v4` для `.next/cache` добавлен в `ci.yml` и `deploy.yml`
  с общим ключом по `bun.lock` и `restore-keys` fallback.
- Комментарии в обоих workflow объясняют, почему кеш общий и почему `main`
  собирает только деплой.

**Проверка**

- PR: единственный workflow — `CI`, success. `Build & Deploy` на PR не пошёл.
- Три прогона одного коммита: Build 15 с (cold) → 10 с / 13 с (cache hit),
  `Compiled successfully in 5.9s`; job total 28 → 40 → 28 с.
- Кеш в CI: 157 КБ распакованного, 41 КБ архива — не 69 МБ.

**Ruling**

- Кеш оставлен, хотя общий job не ускорился: он корректен, стоит ~1 с на
  restore и ускоряет именно компиляцию. Acceptance «второй прогон заметно
  быстрее» по общему времени **не подтверждён** — записано как есть, а не
  подогнано.
- Цифра 69 МБ из issue не воспроизводится на `next build`: это локальный
  dev-кеш. Реальный выигрыш #8 — снятая вторая сборка `main` (~один полный
  прогон на каждый пуш).

**PR:** [#165](https://github.com/frostiks777/1pgWebGallery/pull/165).
