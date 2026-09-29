# Triage Labels

The skills speak in terms of five canonical triage roles. This file maps those roles to the actual label strings used in this repo's issue tracker.

| Label in mattpocock/skills | Label in our tracker | Meaning                                  |
| -------------------------- | -------------------- | ---------------------------------------- |
| `needs-triage`             | `needs-triage`       | Maintainer needs to evaluate this issue  |
| `needs-info`               | `needs-info`         | Waiting on reporter for more information |
| `ready-for-agent`          | `ready-for-agent`    | Fully specified, ready for an AFK agent  |
| `ready-for-human`          | `ready-for-human`    | Requires human implementation            |
| `wontfix`                  | `wontfix`            | Will not be actioned                     |

When a skill mentions a role (e.g. "apply the AFK-ready triage label"), use the corresponding label string from this table.

Edit the right-hand column to match whatever vocabulary you actually use.

## Additional labels used in this repo (2026-09-28)

Besides the five triage roles above, issues carry GitHub's default type labels:

| Label         | Meaning                                                      |
| ------------- | ------------------------------------------------------------ |
| `bug`         | Дефект поведения                                              |
| `enhancement` | Новое поведение/улучшение                                     |
| `documentation` | Правки доков и `AGENTS.md`/`MEMORY.md`                       |

Правило из `AGENTS.md`: дефекты — с меткой `bug`; в коммит-сообщении указывается номер issue (`(#NN)`), после пуша issue закрывается. Метки `chore` в репозитории нет, поэтому `gh issue create --label chore` падает — создавай без метки и описывай суть в теле. Действующий набор меток всегда можно посмотреть так:

```bash
gh label list
```
