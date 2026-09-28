# ADR 0003: CI: lint (non-blocking) + build, без e2e

## Status

Accepted — 2026-09-28.

## Context

До переноса харнеса в репозитории был только `deploy.yml`: сборка standalone-бандла на
раннере GitHub и rsync на VPS. Локальные проверки (`npx eslint .`, `npx tsc --noEmit`,
`npm run test:e2e`) в CI не гонялись, поэтому сломанный lint или не собирающийся код
обнаруживались только на этапе деплоя.

В проекте-доноре есть полный `ci.yml` (lint + typecheck + test + build и отдельный job e2e).
Здесь unit-тестов нет, а e2e требует Chromium и поднимает `next dev` — заметно дороже.

## Decision

Добавляем `.github/workflows/ci.yml`:

- on: push в `main` + pull_request в `main`;
- bun (`bun install --frozen-lockfile`), как в `deploy.yml`;
- `bun run lint` с `continue-on-error: true` — пока в baseline 9 ошибок
  `react-hooks/set-state-in-effect` (задача на фикс в `ai/inbox.md`);
- `bun run build` — блокирующий.

E2e в CI **не** добавляем: он остаётся локальным гейтом (`npm run test:e2e` в
`.agents/shared/checks.md`). `deploy.yml` не трогаем.

## Consequences

(+) PR и push получают быструю обратную связь по сборке; поломка сборки не доживает до деплоя.
(+) Линт виден в CI, но не блокирует из-за известного baseline — деплой не завязан на чужие ошибки.
(−) Пока baseline не починен, lint в CI — «зелёный» при 9 ошибках; сигнал ослаблен.
  После фикса задачи из `ai/inbox.md` `continue-on-error` нужно убрать (отдельный коммит).
(−) e2e-регрессии по-прежнему ловятся только при локальном прогоне.

## Alternatives considered

- **Полный CI с e2e** (как в 386) — дороже по времени, требует `playwright install` и
  стабильности dev-сервера в CI; для single-maintainer пока избыточно.
- **Блокирующий lint сразу** — CI красный с первого дня из-за baseline, что приучает
  игнорировать красный CI.
- **Без CI** — статус-кво: ошибки сборки ловятся только на деплое.
