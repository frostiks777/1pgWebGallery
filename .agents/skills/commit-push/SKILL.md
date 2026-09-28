---
name: commit-push
description: Use when the user asks to commit and push changes — «сделай коммит и пуш», «коммит + пуш», «закоммить», «запушь», «залей изменения», «commit», «push». Runs project checks, stages only intended files, writes a Conventional Commits message, commits and pushes.
---

# Commit & Push

Workflow для коммита и пуша в этом репозитории (Node.js/TypeScript, Conventional Commits).

## 1. Проверки перед коммитом

```bash
git status --short
git diff
git log --oneline -10
```

Затем прогнать проверки и починить проблемы до коммита:

```bash
npm run lint
npm run typecheck
npm test
```

Пропускать проверки можно только по явной просьбе пользователя.

## 2. Стейджинг

- Стейджить только конкретные файлы: `git add <paths>`; `git add -A` — только если все изменения относятся к одной задаче.
- Не коммитить секреты, `.env`, `node_modules`, `dist`, `server/data/*.db`, логи.
- Если изменений несколько логических — делать отдельные коммиты, по одному на изменение.

## 3. Сообщение коммита

Conventional Commits, тип на английском, описание краткое и в повелительном наклонении:

- `feat: add slot booking dialog with toasts`
- `fix: bind vite dev server to ipv4`
- `chore: add commit-push skill`
- `docs:`, `refactor:`, `test:` — по смыслу

## 4. Коммит и пуш

```bash
git commit -m "<type>: <описание>"
git push
```

- Не амендить, не пропускать хуки, не делать force-push без явной просьбы.
- Если у ветки нет upstream: `git push -u origin <branch>`.

## 5. Отчёт

Сообщить: хеш и текст каждого коммита, ветку, результат пуша. Если пуш не удался — показать ошибку и не повторять force-варианты.

## Важное для этого репозитория

- Не трогать `.github/workflows/hexlet-check.yml` и имя репозитория.
- Историю коммитов ведём по Conventional Commits — от этого зависит release-please.
