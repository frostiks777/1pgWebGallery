# ai/tasks/

Tracked task records for the `.agents/skills/` dev cycle (see `AGENTS.md`). Each task is a
directory:

```
ai/tasks/YYYY-MM-DD/<slug>/
  task.md      # title, description, ## Acceptance criteria, and (once worked) ## Result
  state.yaml   # status: todo | in-progress | blocked | approved, created, depends_on
```

Created by `.agents/skills/process-inbox/SKILL.md` from `ai/inbox.md`, implemented by
`.agents/skills/perform-task/SKILL.md`, and driven end-to-end by
`.agents/skills/continue/SKILL.md`. Everything here is committed — it's the durable record
of what the AI dev cycle did and why, alongside the code changes each task made.
