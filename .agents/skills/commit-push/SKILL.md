---
name: commit-push
description: Use when the user asks to commit and push changes — «сделай коммит и пуш», «коммит + пуш», «закоммить», «запушь», «залей изменения», «commit», «push». Runs project checks, stages only intended files, writes a Conventional Commits message, commits and pushes.
---

# Commit & Push

Workflow для коммита и пуша в этом репозитории (Next.js/TypeScript, Conventional Commits).

## 1. Проверки перед коммитом

```bash
git status --short
git diff
git log --oneline -10
```

Затем прогнать чек-чейн из `.agents/shared/checks.md` и починить проблемы до коммита:

```bash
npx eslint .        # ровно 9 baseline-ошибок, новых нет
npx tsc --noEmit
npm run test:e2e    # для gallery/lightbox/navigation изменений
```

Пропускать проверки можно только по явной просьбе пользователя.

## 2. Стейджинг

- Стейджить только конкретные файлы: `git add <paths>`; `git add -A` — только если все изменения относятся к одной задаче.
- Никогда не коммитить: секреты, `.env*` (кроме `.env.example`), `node_modules/`, `.next/`, `.data/`, `package-lock.json` (gitignored — коммитится `bun.lock`), state `telegram-bot/` (`*.jsonl`, `.env`, `.bot.pid`/`.bot.lock`).
- `next-env.d.ts` перезаписывается `next dev` (другие пути типов) — этот churn не часть изменения, не коммитить.
- Если изменений несколько логических — делать отдельные коммиты, по одному на изменение.

## 3. Сообщение коммита

Conventional Commits, тип на английском, описание краткое и в повелительном наклонении:

- `feat(gallery): add bento layout cover editing`
- `fix(api): handle WebDAV 404 for missing thumbnails`
- `chore(skills): add verify skill`
- `docs:`, `refactor:`, `test:` — по смыслу

Задача, пришедшая из GitHub Issue (гибридный трекинг, см. `AGENTS.md`), указывает номер в сообщении: `fix: ... (#42)`. После пуша Issue закрывается (`gh issue close <n> --comment "<хеш>"`).

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

- `git push` в `main` запускает CI (`ci.yml`: lint+build) и деплой (`deploy.yml` — сборка на раннере + rsync на VPS). Пуш = релиз, не делай его вслепую.
- Историю ведём по Conventional Commits — от этого зависит release-please.
- `git add -A` в этом репо особенно опасен: `telegram-bot/` держит состояние с чужими приватными данными (см. `AGENTS.md`).
