# Inbox

Write down what needs doing, one item per bullet (or a short paragraph — an item ends at
the next top-level bullet or heading). No format required, just enough for
`.agents/skills/process-inbox/SKILL.md` to turn it into a task. Run `/process-inbox` (or
ask an agent to use that skill) when you want these turned into tracked tasks under
`ai/tasks/`; processed items get removed from this file.

- Fix the 14 pre-existing `react-hooks/set-state-in-effect` errors that `npm run lint`
  reports in `src/app/page.tsx` and `src/components/gallery/Lightbox.tsx`, so `npm run
  lint` passes clean. These predate the AI dev cycle (found while setting it up on
  2026-09-04) — restructure each effect properly instead of just suppressing the rule.
