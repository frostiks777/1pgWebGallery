# Checks perform-task must run before committing

Shared by `.agents/skills/perform-task/SKILL.md`. Read `AGENTS.md`'s "Known baseline
issues" section first — lint and types are expected to be clean, so anything red is a
regression; `npx next build` is the one check with an environment-dependent baseline.

## Package manager

`bun.lock` is the committed lockfile and CI uses `bun install --frozen-lockfile`; running
`npm install` locally is fine, it just regenerates an ignored `package-lock.json` alongside it.

The `package.json` scripts (`dev`/`build`/`start`/`lint`) all shell out to **`bunx`**, and
`build`'s `NODE_OPTIONS='…' bunx next build` prefix is POSIX-shell syntax. Without `bun` on
PATH they fail with `'bunx' is not recognized` — they do **not** fall back to npm. So the
commands below call the tools directly through `npx`, which works with or without bun.
(`npm run test:e2e` is plain `playwright test` and does work as-is.) CI is unaffected: there
bun is installed.

## 1. Install (only if needed)

```bash
npm install
```

Skip if `node_modules` already matches `package.json`/`bun.lock`.

## 2. Lint + type-check

```bash
npx eslint .
npx tsc --noEmit
```

`npx eslint .` and `npx tsc --noEmit` must both be clean — the 9
`react-hooks/set-state-in-effect` errors and the 2 TS2345 in
`src/app/api/video-stream/route.ts` that used to be the baseline are gone (`8a922af` #12,
`4370e29` #11). A red run is your diff, not a known exception.

## 3. Build

```bash
npx next build
```

Needs outbound HTTPS to `fonts.googleapis.com`/`fonts.gstatic.com` (`next/font` fetches
Google Fonts at build time) - see the baseline note in `AGENTS.md`. If that's blocked in
your sandbox, run `npx next dev -p 3000` instead, load the affected route(s) yourself, and
say plainly in the task's `## Result` that a full production build could not be verified
here so a human (or a later run with normal network access) should confirm it once.

## 4. Smoke test

```bash
npm run test:e2e
```

**This works locally** (verified 2026-10-15: `3 passed`, ~28 s). The long-standing "don't
run it on Andrew's laptop" note was wrong twice over:

- `baseURL` was `http://127.0.0.1:3100`, and Next 16 refuses to serve dev resources
  (client chunks, HMR socket) to origins missing from `allowedDevOrigins`. The server
  answered HTML fine — so a screenshot looked healthy — but the page never hydrated and
  every card selector timed out. Fixed in `fb9a0f2` (#13): `localhost`.
- The remaining flake was Playwright's `expect.timeout` default of 5 s, which the config's
  `timeout` does *not* touch. Now `expect: { timeout: 15_000 }`.

Two operational notes:

- **Never pass `PLAYWRIGHT_BASE_URL=http://127.0.0.1:...`** — it overrides `baseURL` and
  reinstates the bug above. Any other host is fine; omit the variable to get the default.
- **Don't start `next dev` by hand for this.** `playwright.config.ts`'s `webServer` boots
  `npx next dev -p 3100` itself, and `reuseExistingServer` is on outside CI so it won't
  fight your dev server on 3000. Next 16 fails with `Another next dev server is already
  running` if the folder already has a live dev server, which kills the run before it
  starts. Cold start costs ~1 min of compile time, which is why `webServer.timeout` is
  120 s.

First run on a machine: `npx playwright install chromium`. When a task changes
gallery, lightbox, or navigation behavior, extend `tests/e2e/gallery.smoke.spec.ts` (or add
a new spec under `tests/e2e/`) to cover it, rather than writing a one-off manual check that
leaves no regression coverage behind.

## 5. Visual check (UI-visible changes only)

For any change a user would actually see, take a screenshot and look at it —
`page.screenshot()` in a throwaway Playwright script, saved under `.agents-runs/<task-id>/`
(gitignored), is fine for this. "The build succeeded" and "the smoke test passed" are not
evidence the UI looks right; look at the pixels before calling the task done.

## Done means

Steps 2–3 pass (3 may fall back per above, with that fallback stated in the result); step 4
passes — and only a UI change additionally needs step 5 — or the task file records a
specific, honest blocker instead of a task marked done on a failing check.
