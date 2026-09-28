# MEMORY.md — Состояние проекта «Photo Gallery»

> Дата последнего обновления: 2026-09-28 (перенос AI-харнеса из проекта
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

## Проверки (baseline на 2026-09-28)

- `npx eslint .` — **9** baseline-ошибок `react-hooks/set-state-in-effect`
  (`src/app/page.tsx` 118/178/224/242/296/354/394, `Lightbox.tsx` 89/107). Задача на фикс
  лежит в `ai/inbox.md`; правило — не смешивать фикс с другими изменениями.
- `npx tsc --noEmit` — чисто.
- `npx next build` — требует исходящий HTTPS к `fonts.googleapis.com`/`fonts.gstatic.com`;
  даёт 11 baseline-предупреждений Turbopack о tracing (computed-path `fs.*Sync`).
- `npm run test:e2e` — `tests/e2e/gallery.smoke.spec.ts` против `next dev` на :3100.
- Скрипты `package.json` (`dev`/`build`/`start`/`lint`) вызывают `bunx` и падают без `bun` —
  запускать инструменты напрямую через `npx` (см. `AGENTS.md` → «Commands»).

## Что сделано (последние изменения)

- 2026-09-28: перенос AI-харнеса из 386 — 83 скилла + `skills-lock.json`; адаптация
  `interview/plan/ponytail/verify/commit-push/telegram-bridge`; `CONTEXT.md`, `MEMORY.md`,
  `docs/adr/`; гибридный трекинг; `ci.yml` (lint+build); `release-please.yml`;
  `scripts/notify.ps1`; `opencode.jsonc` (permissions + shadcn MCP).
- 2026-09-27: Telegram-мост — скрипты `telegram-bot/` в git, state в `.gitignore`;
  `.opencode/plugins/telegram-autostart.js` (lock + pid + антиспам).
- Ранее: фиксы nginx (`/_next/static/` приоритетнее image-локации), merge static в
  release-бандле, исключение `Obsidian_Theme/` из eslint.

## Открытые вопросы

- Починить 9 lint-ошибок (задача в `ai/inbox.md`) — отдельным reviewed-изменением.
- Unit-тестов нет: скилл `tdd` работает через e2e-спеки; решение о Vitest — отдельная задача.
- release-please: в настройках репозитория нужно включить «Allow GitHub Actions to create
  and approve pull requests» (ручной шаг Andrew).
- `apply-design` / `apply-design-v2` — унаследованы из 386, к этому проекту не применимы;
  кандидаты на удаление.

## Ключевые решения

| ADR | Решение |
|---|---|
| [0001](docs/adr/0001-record-architecture-decisions.md) | Ведём ADR (`docs/adr/`) |
| [0002](docs/adr/0002-hybrid-task-tracking.md) | Гибридный трекинг: `ai/tasks` + GitHub Issues |
| [0003](docs/adr/0003-ci-lint-and-build.md) | CI: lint (non-blocking) + build, без e2e |
