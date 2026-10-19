# MEMORY.md — Состояние проекта «Photo Gallery»

> Дата последнего обновления: 2026-10-15 (baseline перечитан фактическим прогоном: eslint/tsc
> чисты, e2e локально зелёный, `continue-on-error` у шага Lint в `ci.yml` снят).
> 2026-10-15: **bun теперь обязателен.** `package.json` получил
> `devEngines.packageManager = { name: "bun", onFail: "error" }`, поэтому `npm install`,
> `npm ci`, `npm run` и **`npx`** отвергаются с `EBADDEVENGINES` — дрейф между npm и
> `bun.lock` стал невозможен (#36). Чек-чейн переведён на `bun run`/`bunx`;
> `playwright.config.ts` поднимает dev-сервер через `bunx next dev`, не `npx`.
> Собирай и проверяй только после `bun install --frozen-lockfile`.
> 2026-09-29: перенос AI-харнеса из проекта
> [ai-for-developers-project-386](https://github.com/frostiks777/ai-for-developers-project-386):
> 83 скилла, CONTEXT.md, ADR, CI, release-please, тост, opencode.jsonc).
> Долговременная память между сессиями. Архитектурные решения — в `docs/adr/`,
> глоссарий — в `CONTEXT.md`.

## Текущее состояние

- Стек: Next.js 16 (App Router, Turbopack) + React 19 + Tailwind 4, `webdav`, `sharp`,
  Radix/shadcn в `src/components/ui/`, framer-motion. Unit-тестов нет — только Playwright e2e.
- Демо-режим (без `WEBDAV_*`) — дефолт checkout и режим smoke-тестов.
- Прод: https://ap-p-g.duckdns.org/ — Ubuntu, ~800MB RAM, 1 CPU. Сервер **никогда** не
  запускает `next build`; сборка — на раннере GitHub Actions (`deploy.yml`) + rsync.
- AI-цикл: `ai/inbox.md` → `.agents/skills/{process-inbox,perform-task,continue}` →
  `ai/tasks/<date>/<slug>/`. Крупные фичи и баги — GitHub Issues (гибрид, см.
  `docs/agents/issue-tracker.md`). Процессные скиллы: `interview → plan → ponytail →
  tdd → verify → commit-push`.
- Память/доки: `CONTEXT.md` (глоссарий), `docs/adr/` (решения), этот файл (состояние).

## Проверки (baseline перечитан 2026-10-15)

- `bun run lint` — **чисто** (0 ошибок). Прежние 9 ошибок
  `react-hooks/set-state-in-effect` починены коммитом `8a922af` (#12).
- `bunx tsc --noEmit` — **чисто** (0 ошибок). Прежние 2 ошибки TS2345 в
  `src/app/api/video-stream/route.ts` починены коммитом `4370e29` (#11).
- `ci.yml` — `continue-on-error` у шага Lint **снят 2026-10-15** (ADR-0003 этого требовал),
  линт в CI теперь блокирующий.
- `bun run build` — требует исходящий HTTPS к `fonts.googleapis.com`/`fonts.gstatic.com`;
  даёт 11 baseline-предупреждений Turbopack о tracing (computed-path `fs.*Sync`), см. #7.
- `bun run test:e2e` — **работает локально** (2026-10-15: `3 passed`, ~28 с). Старый блокер
  «на ноутбуке не гоняем» был неверным: `baseURL` был `127.0.0.1`, а Next 16 не пускает
  dev-ресурсы с origin вне `allowedDevOrigins` — HTML отдавался, JS не грузился (починено
  в `fb9a0f2`, #13). Добавленный `expect: { timeout: 15_000 }` резко уменьшил падения первого
  прогона, но **флак не устранён**: на холодной машине он всё ещё воспроизводится. Первопричина
  медленного первого прогона не разобрана — открытый пункт #13.
- Скрипты `package.json` (`dev`/`build`/`start`/`lint`) вызывают `bunx` и падают без `bun` —
  запускать инструменты напрямую через `bun run` / `bunx` (см. `AGENTS.md` → «Commands»).

## Что сделано (последние изменения)

- 2026-10-15: **порт плагина Telegram-моста на plugin API opencode 2** (#42 → #47 → #50).
  opencode обновлён до **v2.0.29**, а v1-плагины в v2 **не грузятся вообще** — загрузчик
  отвечал `Plugin must export a default definition with an id and an effect or setup function`.
  В логе `~/.local/share/opencode/log/opencode.log` это выглядело так:
  `failed to load plugin ...telegram-autostart.js (Missing key at ["default"])` и
  `...opencode-notify (Expected object at ["default"])`. То есть мост не поднимался, а
  уведомления `session.idle`/`session.error` не приходили вообще.
  Сделано: `.opencode/plugins/telegram-autostart.js` переписан на `export default { id, setup(ctx) }`;
  `opencode-notify` **убран** из `opencode.jsonc` (0.3.1 от 2026-02-03 — последняя версия, v2-версии
  не существует; тосты ОС с кнопками Accept/Reject под v2 недоступны, остаются `scripts/notify.ps1`
  и сам Telegram-мост). Проверка вынесена в репозиторий: `scripts/telegram-autostart-smoke.mjs`,
  запуск `bun run test:plugin-smoke` (голый `node`, без сети и зависимостей; 10 ассертов —
  единственный бот, имена событий v2 и payload, фильтр чужих worktree, горячий путь, TTL-повтор,
  граница lookup). Шаг в `ci.yml` **не добавляли** — правка `.github/workflows/*` требует явного
  запроса владельца.
- 2026-10-15: **baseline приведён к факту** (#11, #12, #13, #15). Снят `continue-on-error`
  у шага Lint в `ci.yml` — линт блокирующий, как и требовал ADR-0003. В `playwright.config.ts`
  добавлен `expect: { timeout: 15_000 }`: параметр `timeout` ограничивает тест, а ассерты
  жили по дефолту в 5 с. После правки наблюдаем `3 passed` без флака на тёплом сервере, но на
  холодной машине первый прогон всё ещё изредка падает — первопричина не разобрана (#13).
  Переписаны разделы про e2e в `AGENTS.md` и `.agents/shared/checks.md`, поправлены ADR-0004,
  вычищен инбокс.
- 2026-10-14: **диагностика и чистка прода** (#2, #27). Агент получил ssh-доступ
  пользователем `pgagent` на `95.81.124.37:22333` (ключ `~/.ssh/id_rsa`); в sudoers
  разрешена ровно одна команда — `/usr/local/sbin/pg-cleanup` с тремя guard-проверками,
  `sudo -n true` по-прежнему не проходит. Диск был 93% (1.5G из 20G), стало 64% (6.9G).
  Главные находки, которые не видны через `du -sh dir/*` (глобу не берёт dotfiles):
  `.next/` в корне чекаута 3.1G (мёртвая standalone-сборка от 2026-09-04, сервис
  запускает `release/server.js`), journald 2.0G (не задан `SystemMaxUse`, дефолт 10%
  раздела; `--vacuum-size` эти файлы не трогает — они под ACL, помогает только рестарт
  journald), `node_modules` 693M, `.cache/images` 225M. `.data/` (3.0G, 12 834 миниатюры
  + `dir-meta/`) — состояние владельца, не трогали. `CACHE_DIR` задан в systemd unit,
  не в `.env.local`, кэш вне `release/` — ловушка `rsync --delete` не сработала.
  Ротации логов не было: конфиг в `/etc/logrotate.d/nginx` лежал, пакета `logrotate`
  в системе не было. Живой конфиг nginx на сервере старее репозиторного (#25).
- 2026-10-14: **nginx: кэш миниатюр и ротация логов** (#3, #9, #25). `proxy_cache_path`
  с `max_size=1g` (не 10g — при разделе 20G это съедает всё место), отдельная локация
  `/api/images` с `access_log off`, кэшем и полным набором `proxy_set_header` (префикс
  перебивает `/api/`, заголовки не наследуются), HSTS продублирован из-за особенности
  `add_header`. Новый `logrotate-photo-gallery.conf` с reopen по `USR1`.
  `setup-nginx.sh` больше не содержит своего шаблона конфига — копирует `nginx.conf`
  из репозитория. **На сервер эти конфиги ещё не применены.**
- 2026-10-13: **агент в GitHub Actions** (ADR-0004). Четыре воркфлоу из донора 387,
  адаптированные под этот репозиторий: `opencode.yml` (`/oc`, `contents/pull-requests/issues:
  write`), `opencode-triage.yml` (`issues: opened`), `opencode-review.yml` (`pull_request`),
  `opencode-audit.yml` (`schedule 17 6 * * *` + `workflow_dispatch`). Аудит — два источника:
  вывод `eslint`/`tsc` (job `code-audit`: код возврата игнорируется, вывод уходит в отчёт и в
  разбор агента) + Lighthouse по `APP_URL` из Variables (job пропускается, если переменной нет); оба отчёта артефактами,
  разбор — один вызов агента, `if: always()`. Плюс `scripts/lighthouse-summary.mjs`
  (пороги perf 70 / a11y 90 / bp 80 / seo 80), раздел «Агент в GitHub Actions» в `AGENTS.md`,
  таблица воркфлоу в `README.md`. `ci.yml` и `deploy.yml` не тронуты.
- 2026-09-29: **перенос харнеса завершён**, всё запушено в `main` (CI + деплой зелёные).
  Фазы 1–4 (скиллы, CONTEXT/MEMORY/ADR, секции AGENTS.md) — раньше; фазы 5–7:
  `opencode.jsonc` (permissions субагентов, shadcn MCP, плагин `opencode-notify`,
  пины бесплатных моделей), `scripts/notify.ps1` (тост, UTF-8 **с BOM**, AppId
  «Фото-галерея»), `.github/workflows/ci.yml` (ADR-0003: lint non-blocking + build,
  без e2e), `.github/workflows/release-please.yml`, `docs/agents/{issue-tracker,
  triage-labels,domain}.md`, routing-шаг «Route first» в `process-inbox/SKILL.md`,
  triage-метки в GitHub (`needs-triage`, `needs-info`, `ready-for-agent`,
  `ready-for-human`). `deploy.yml` не трогали.
- 2026-09-28: перенос AI-харнеса из 386, фазы 1–4 (4 коммита, запушены 2026-09-29):
  - 83 скилла + `skills-lock.json` импортированы; `.agents/skills/**` исключён из eslint;
  - адаптированы `interview/plan/ponytail/verify/commit-push/telegram-bridge` под этот репо;
  - `CONTEXT.md`, `MEMORY.md`, `docs/adr/` (0001–0003);
  - `AGENTS.md` дополнен разделами Agent skills / Hygiene / Long-term memory / Safety gates /
    Notifications / Agent behavior; baseline-числа приведены к 9 (`checks.md`, inbox, deploy.yml).
- 2026-09-27: Telegram-мост — скрипты `telegram-bot/` в git, state в `.gitignore`;
  `.opencode/plugins/telegram-autostart.js` (lock + pid + антиспам).
- Ранее: фиксы nginx (`/_next/static/` приоритетнее image-локации), merge static в
  release-бандле, исключение `Obsidian_Theme/` из eslint.

## API событий opencode v2 (проверено на v2.0.29 замером, не по памяти)

Дорого переоткрывается, поэтому фиксирую отдельно. Схемы: тег `v2.0.29`,
`packages/schema/src/{event,session-event,session-status-event,session-error,location}.ts`;
живой поток снимался временным пробник-плагином во время настоящего `opencode run`.

- Payload события — **`data`**, а не v1-`properties`: `{ id, created, type, durable, location?, data }`.
  Чтение `event.properties` даёт `undefined` (тихий отказ, а не ошибка).
- `session.error` в v2 **не существует**. Ошибка выполнения — `session.execution.failed`,
  текст в `data.error: SessionError.Error` = `{ type, message, status?, response? }`.
- `session.idle` живой, но помечен `// deprecated` (`session-status-event.ts`). Завершение —
  durable `session.execution.succeeded`; `session.execution.interrupted` несёт
  `data.reason: "user" | "shutdown" | "superseded" | "inactivity"` (на `user` уведомлять не надо —
  человек у клавиатуры).
- У `session.execution.*` **нет поля `location`** — только `{ sessionID }`. Поэтому чужие worktree
  отсекаются через `ctx.session.get({ sessionID })` → `Session.Info.location.directory` (с кэшем
  и TTL для отрицательных вердиктов). `session.created` несёт `location` в `data`, но только для
  сессий, родившихся после подписки плагина — долгоживущие так не поймать.
- Замер на этой машине: сессия сообщает **каталог worktree** (= `ctx.location.directory`), а
  `ctx.location.project.canonical` указывает на **главный checkout** (`C:\My_projects_GIT\1pg_gall`),
  то есть на соседний worktree. Сравнивать надо с `directory`, canonical в «свои» добавлять нельзя.
- Поток `/api/event` **volatile by contract** («a slow consumer overflows and fails the stream»),
  поэтому `await` в цикле `for await` допустим только для тех типов, которые плагин реально
  обрабатывает; остальное обязано отбрасываться без ожидания.
- Плагин грузится лениво и может догрузиться уже после рождения своей сессии — «неизвестная сессия»
  обязана пропускаться (fail-open), иначе уведомления замолчат совсем.

## Грабли, стоившие времени (2026-10-15)

- **PR-воркфлоу не запускаются, пока ветка конфликтует с `main`.** GitHub не создаёт merge ref,
  и на коммите оказывается **0 check-suites** — при этом `gh pr checks` пишет «no checks reported»,
  а не «конфликт». Симптом легко принять за задержку GitHub или поломку Actions (я так и сделал и
  потратил на это несколько проверок). Диагноз — `gh pr view <N> --json mergeable,mergeStateStatus`:
  `CONFLICTING`/`DIRTY`. Лечение — `git merge origin/main` в ветку и пуш.
- **`opencode-review.yml` (авторевью) идёт до 20 минут** и на мелких правках легко уходит в
  несколько раундов «мелочей». По этому плагину вышло 8 раундов: 4 находки были настоящими
  (пустой фильтр, врущий лог, слепой тест, недостижимая ветка таймаута), остальное — формулировки.
  Стоимость цикла стоит учитывать заранее.
- **CI может упасть на `NextFontGoogleFontFileReplacer`** (сетевой fetch Google Fonts на раннере) —
  это environment-dependent baseline из `AGENTS.md`, а не дефект дифа: `gh run rerun <id> --failed`
  обычно зеленит. Сначала проверить, что диф не трогает `.ts(x)`/`next.config.ts`/`bun.lock`.
- **`npx` в этом репозитории не работает** (`EBADDEVENGINES`, #36): проверять только
  `bun run lint`, `bunx tsc --noEmit`, `bun run build`, `bun run test:e2e`,
  `bun run test:plugin-smoke`. Мои первые прогоны по этой задаче шли через `npx` на npm-дереве —
  то есть измеряли не то дерево, что CI и прод; пришлось перепроверять на `bun install --frozen-lockfile`.

## Открытые вопросы

- **Решение по PR #50 (ждёт Andrew).** Ветка `fix/opencode-v2-plugins`, worktree
  `C:\Users\Adm\.local\share\opencode\worktree\1d31e5\opencode-v2`. В `main` уже работает порт из
  #42/#47; #50 доводит фильтр чужих worktree и добавляет смоук. Блокеров не было ни в одном из
  **десяти** раундов ревью; раунды 1–10 закрыты по существу (проверено переигровкой мутациями).
  Мержить или закрыть — решает владелец; агент не мержит.
  Раунд 9 нашёл **реальный баг в страховке**: лог первого вердикта жил только в `isPeerSession`, а
  свои сессии сеются веткой `session.created` — значит смена формы `location` заглушила бы все
  уведомления **без единой строки в логе** (вердикт `peer: true` не истекает). Исправлено: вердикт
  решается в одном месте (`decide`) и логируется оттуда. Там же: `SPAM_WINDOW_MS` стал
  переопределяемым, смоук ставит 0 и считает уведомления точно (иначе антиспам съедал второе
  сообщение и «гард на Esc» был непроверяем).
- **PR #50, раунд 10 (2026-10-15 20:27) — 4 замечания; закрыты 2026-10-19.** Методика ревью:
  «всё, что добавляет PR, должно дискриминироваться мутацией» — иначе механизм есть, а откатится
  бесшромно. Мутации переигрываются локально (плагин+смоук в `%TEMP%\mut50*`, смоук резолвит
  `.opencode/plugins/…` от каталога **скрипта**, так что копировать нужно в `mut50\.opencode\plugins\`
  и `mut50\scripts\`):
  - **1. Ветка `session.created` не покрыта — закрыто.** Добавлен ассерт
    `["a peer that announced itself is resolved without a lookup", lookupsOf("ses_peer_known") === 0]`.
    Переигровка: удалена ветка `session.created` из плагина → ассерт **падает** (остальные 11 зелёные).
    Ценность ветки не в скорости: объявленный вердикт — единственный, кто переживает исчезновение
    сессии с сервера (упала и удалена peer-сессия → `session.get` бросит → `where = null` →
    fail-open → уведомление о **чужом** агенте с меткой нашего worktree).
  - **2. Лог первого вердикта не покрыт — закрыто.** Смоук перехватывает `console.log` **до импорта**
    плагина (`pluginLog`) и ассертит, что строка `session ses_own: … → this worktree` есть **ровно
    одна**. Переигровка: убрана строка `log("info", …)` из `decide` → ассерт **падает**.
  - **3. Висячая ссылка в `.agents/shared/checks.md` — закрыто.** Шаг 2а теперь называет файлы прямо:
    «Run it whenever you touch `.opencode/plugins/telegram-autostart.js` or
    `scripts/telegram-autostart-smoke.mjs`».
  - **4. Описание PR устарело — закрыто:** переписано (фактические файлы, 12 ассертов, Evidence по
    `bun run lint` / `bunx tsc --noEmit` / `bun run test:plugin-smoke`).
  Смоук после правок: **12/12 PASS**, `bun run lint` — 0, `bunx tsc --noEmit` — 0.
- **Чистка v1-плагинов opencode (2026-10-19, машина Andrew).** OpenCode обновлён до **v2.0.32**,
  v1-плагины в нём не грузятся: `opencode plugin list` показывает ID «-», а в логе
  `Plugin must export a default definition with an id and an effect or setup function
  (Missing key at ["default"])`. Убраны:
  - глобально в `~/.config/opencode/`: `opencode-notify.json`, `package.json` (там стояли
    `opencode-notify@^0.3.1` и `@opencode-ai/plugin@1.18.31`), `package-lock.json`, `node_modules/`
    и кэш `~/.cache/opencode/npm/opencode-notify@latest`. `opencode plugin remove opencode-notify`
    **не подходит**: v1-плагин не был записан в конфиг, он подхватывался из установленного пакета;
  - в проекте: `"plugin": ["opencode-notify"]` из `opencode.jsonc` (в `main` уже убран, PR #47);
  - рабочий checkout `C:\My_projects_GIT\1pg_gall` стоял на устаревшей ветке `fix/keep-public-assets`
    с **v1**-плагином → переключён на `main` и fast-forward до `origin/main` (`986b5ea`).
    Теперь `opencode plugin list` в нём показывает `telegram-autostart  local  …` — плагин грузится,
    и `node telegram-bot/notify.mjs` доставляет сообщение (проверено вручную: «[notify] ok»).
  **Вывод для будущих сессий:** v1-хвосты opencode живут не только в репозитории, но и в
  `~/.config/opencode/` и в кэше `~/.cache/opencode/npm/`. Проверка «жив ли плагин» —
  `opencode plugin list` (ID ≠ «-») плюс запись в `~/.local/share/opencode/log/opencode.log`.
- **Ручные шаги Andrew для агента в Actions:** добавить секрет `OPENCODE_API_KEY` и Variable
  `APP_URL` (`https://ap-p-g.duckdns.org/`) в Settings → Secrets and variables → Actions;
  GitHub App `opencode-agent` уже установлен. Разрешение «Allow GitHub Actions to create and
  approve pull requests» нужно и агенту (`/oc исправь`), и `release-please`.
- **Ручной шаг Andrew:** в настройках репо включить «Allow GitHub Actions to create
  and approve pull requests», иначе `release-please.yml` упадёт на создании PR.
- Починить 9 lint-ошибок и 2 tsc-ошибки в `video-stream/route.ts` — **сделано**
  (`8a922af` #12, `4370e29` #11).
- Unit-тестов нет: скилл `tdd` работает через e2e-спеки; решение о Vitest — отдельная задача.
- `apply-design` / `apply-design-v2` — унаследованы из 386, к этому проекту не применимы;
  кандидаты на удаление.

## Ключевые решения

| ADR | Решение |
|---|---|
| [0001](docs/adr/0001-record-architecture-decisions.md) | Ведём ADR (`docs/adr/`) |
| [0002](docs/adr/0002-hybrid-task-tracking.md) | Гибридный трекинг: `ai/tasks` + GitHub Issues |
| [0003](docs/adr/0003-ci-lint-and-build.md) | CI: lint (с 2026-10-15 блокирующий) + build, без e2e |
| [0004](docs/adr/0004-agent-workflows-in-github-actions.md) | Агент в Actions: `/oc`, триаж, ревью, аудит (код + Lighthouse) |
