# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

## Before exploring, read these

- **`MEMORY.md`** at the repo root — состояние проекта между сессиями: стек, baseline проверок, что уже сделано, открытые вопросы.
- **`CONTEXT.md`** at the repo root — глоссарий; в нём термины вроде «фото», «панорама», «обложка», «скрытая», «папка».
- **`docs/adr/`** — ADR-ы, затрагивающие ту область, в которой собираешься работать.

If any of these files don't exist, **proceed silently**. Don't flag their absence; don't suggest creating them upfront. The `/domain-modeling` skill creates them lazily, когда термины или решения действительно проясняются.

## File structure

Репозиторий одноконтекстный:

```
/
├── AGENTS.md          ← правила агента: команды, конвенции, baseline
├── MEMORY.md          ← состояние между сессиями
├── CONTEXT.md         ← глоссарий
├── ai/                ← inbox.md + tasks/<date>/<slug>/
├── docs/
│   ├── adr/           ← 0001-… + README.md (индекс) + template.md
│   └── agents/        ← issue-tracker.md, triage-labels.md, domain.md
└── src/
```

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a commit, a test name, a comment), use the term as defined in `CONTEXT.md`. Не подставляй синонимы, которых глоссарий явно избегает.

If the concept you need isn't in the glossary yet, that's a signal: либо ты вводишь язык, которого проект не использует (подумай ещё), либо это реальный пробел — запиши его для `/domain-modeling`.

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding:

> _Contradicts ADR-0003 (CI: lint non-blocking + build), but worth reopening because…_

## Не забудь про состояние, а не кэш

`.data/` — это пользовательские настройки (скрытые фото, панорамы, обложки) вместе с кэшем превью, а не воспроизводимый кэш. Никогда не предлагай «просто удалить `.data`» как способ починить что-либо.
