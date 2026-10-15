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

- `npx eslint .` — **чисто** (0 ошибок). Прежние 9 ошибок
  `react-hooks/set-state-in-effect` починены коммитом `8a922af` (#12).
- `npx tsc --noEmit` — **чисто** (0 ошибок). Прежние 2 ошибки TS2345 в
  `src/app/api/video-stream/route.ts` починены коммитом `4370e29` (#11).
- `ci.yml` — `continue-on-error` у шага Lint **снят 2026-10-15** (ADR-0003 этого требовал),
  линт в CI теперь блокирующий.
- `npx next build` — требует исходящий HTTPS к `fonts.googleapis.com`/`fonts.gstatic.com`;
  даёт 11 baseline-предупреждений Turbopack о tracing (computed-path `fs.*Sync`), см. #7.
- `bun run test:e2e` — **работает локально** (2026-10-15: `3 passed`, ~28 с). Старый блокер
  «на ноутбуке не гоняем» был неверным: `baseURL` был `127.0.0.1`, а Next 16 не пускает
  dev-ресурсы с origin вне `allowedDevOrigins` — HTML отдавался, JS не грузился (починено
  в `fb9a0f2`, #13). Добавленный `expect: { timeout: 15_000 }` резко уменьшил падения первого
  прогона, но **флак не устранён**: на холодной машине он всё ещё воспроизводится. Первопричина
  медленного первого прогона не разобрана — открытый пункт #13.
- Скрипты `package.json` (`dev`/`build`/`start`/`lint`) вызывают `bunx` и падают без `bun` —
  запускать инструменты напрямую через `npx` (см. `AGENTS.md` → «Commands»).

## Что сделано (последние изменения)

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

## Открытые вопросы

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
