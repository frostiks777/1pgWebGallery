# Inbox

Write down what needs doing, one item per bullet (or a short paragraph — an item ends at
the next top-level bullet or heading). No format required, just enough for
`.agents/skills/process-inbox/SKILL.md` to turn it into a task. Run `/process-inbox` (or
ask an agent to use that skill) when you want these turned into tracked tasks under
`ai/tasks/`; processed items get removed from this file.

- Fix the 9 pre-existing `react-hooks/set-state-in-effect` errors that `npm run lint`
  reports in `src/app/page.tsx` and `src/components/gallery/Lightbox.tsx`, so `npm run
  lint` passes clean. These predate the AI dev cycle (found while setting it up on
  2026-09-04) — restructure each effect properly instead of just suppressing the rule.
  After that, drop `continue-on-error` from the Lint step in `.github/workflows/ci.yml`
  (ADR-0003 says so) as a separate commit.

- Fix the 2 pre-existing `tsc --noEmit` errors in `src/app/api/video-stream/route.ts`
  (lines 145 and 159, TS2345): the `webdav` client's `createReadStream` returns its own
  `ReadableLike`, which `Readable.toWeb()` does not accept. The `as unknown as
  ReadableStream` cast is on the result, not on the argument, so it doesn't help. `next
  build` passes today, but a real type check is red — fix it properly (cast the input,
  or convert via `stream.Readable.from`/`pipeline`) without touching the byte-range
  behaviour. Found 2026-09-29 while running the phase 5–7 verify; unrelated to the
  harness port.
