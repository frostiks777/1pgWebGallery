# ADR (Architecture Decision Records)

Индекс архитектурных решений проекта «Photo Gallery».

## Когда писать ADR

- Выбор между ≥ 2 серьёзными альтернативами (библиотека, паттерн, формат хранения, провайдер).
- Решение, которое нельзя легко отменить без миграции (`schema`/формат `.data`, `breaking API`, деплой).
- Любое отклонение от `AGENTS.md`/`CONTEXT.md`, даже временное.

## Когда НЕ писать ADR

- Однострочный конфиг.
- Баг-фикс без архитектурного значения.
- Косметические правки (renaming, formatting).

## Процесс

1. Скопировать [`template.md`](template.md) → `NNNN-<slug>.md`, где `NNNN` — следующий номер по индексу.
2. Заполнить секции шаблона. Особое внимание:
   - **Status** — `Proposed` / `Accepted` / `Deprecated` / `Superseded`.
   - **Consequences** — положительные и отрицательные последствия (без приукрашивания).
3. Обновить индекс ниже: добавить строку с номером, заголовком и статусом.
4. Закоммитить отдельным коммитом: `docs: add ADR-NNNN <slug>`.

## Связанные артефакты

- `AGENTS.md` → раздел `## Long-term memory` описывает роль ADR в работе агента.
- `MEMORY.md` → раздел «Ключевые решения» ссылается на принятые ADR.
- `CONTEXT.md` → глоссарий; ADR не должен вводить термины мимо него.

## Индекс

| # | Заголовок | Статус | Дата |
|---|---|---|---|
| [0001](0001-record-architecture-decisions.md) | Record architecture decisions | Accepted | 2026-09-28 |
| [0002](0002-hybrid-task-tracking.md) | Гибридный трекинг задач: `ai/tasks` + GitHub Issues | Accepted | 2026-09-28 |
| [0003](0003-ci-lint-and-build.md) | CI: lint (non-blocking) + build, без e2e | Accepted | 2026-09-28 |
