# Checks perform-task must run before committing

Shared by `.agents/skills/perform-task/SKILL.md`. Read `AGENTS.md`'s "Known baseline
issues" section first — checks below are scoped against that baseline, not a demand for a
perfectly clean repo on day one.

## Package manager

Prefer `bun` if `bun -v` succeeds; otherwise use `npm`/`npx` (the commands below use
`npm`/`npx` — swap in `bun`/`bunx` if it's available). `bun.lock` is the committed
lockfile; running `npm install` locally is fine, it just regenerates an ignored
`package-lock.json` alongside it.

## 1. Install (only if needed)

```bash
npm install
```

Skip if `node_modules` already matches `package.json`/`bun.lock`.

## 2. Lint

```bash
npm run lint
```

Must not report a *new* error. `AGENTS.md`'s "Known baseline issues" lists what's already
broken and out of scope — a task touching `page.tsx`/`Lightbox.tsx` may still trip one of
those 14 pre-existing lines merely by being in the same file; don't fail the task over a
line your diff didn't touch, but do fail it over anything your diff *did* introduce or
change.

## 3. Type-check + build

```bash
npm run build
```

Needs outbound HTTPS to `fonts.googleapis.com`/`fonts.gstatic.com` (`next/font` fetches
Google Fonts at build time) — see the baseline note in `AGENTS.md`. If that's blocked in
your sandbox, run `npm run dev` instead, load the affected route(s) yourself, and say
plainly in the task's `## Result` that a full production build could not be verified here
so a human (or a later run with normal network access) should confirm it once.

## 4. Smoke test

```bash
npm run test:e2e
```

First run on a machine: `npx playwright install chromium`. This starts `next dev` itself
(see `playwright.config.ts`'s `webServer`) — nothing to start by hand. When a task changes
gallery, lightbox, or navigation behavior, extend `tests/e2e/gallery.smoke.spec.ts` (or add
a new spec under `tests/e2e/`) to cover it, rather than writing a one-off manual check that
leaves no regression coverage behind.

## 5. Visual check (UI-visible changes only)

For any change a user would actually see, take a screenshot and look at it —
`page.screenshot()` in a throwaway Playwright script, saved under `.agents-runs/<task-id>/`
(gitignored), is fine for this. "The build succeeded" and "the smoke test passed" are not
evidence the UI looks right; look at the pixels before calling the task done.

## Done means

Steps 2–4 pass (2 may skip only pre-existing baseline lines; 3 may fall back to `dev` +
manual load per above, with that fallback stated in the result) and, for a UI change, step
5 was actually done — or the task file records a specific, honest blocker instead of a
task marked done on a failing check.
