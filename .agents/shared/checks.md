# Checks perform-task must run before committing

Shared by `.agents/skills/perform-task/SKILL.md`. Read `AGENTS.md`'s "Known baseline
issues" section first — lint and types are expected to be clean, so anything red is a
regression; `bun run build` is the one check with an environment-dependent baseline.

## Package manager

`bun.lock` is the committed lockfile and it is the **only** source of truth for versions.
CI uses `bun install --frozen-lockfile`, so local installs must be bun too — issue #36.

**Everything npm is refused by design — including `npx` and `npm run`, not just
`npm install`.** `package.json` carries
`devEngines.packageManager = { name: "bun", onFail: "error" }`, and npm evaluates it before
`install`, `ci`, `run` *and* its own runner, so `npm install`, `npm ci`, `npm run <script>`
and `npx <anything>` all abort with `EBADDEVENGINES`. This is deliberate, not an obstacle to
work around: with caret ranges and no committed `package-lock.json`, npm re-resolves to the
newest matching versions and your `node_modules` silently stops matching what CI and
production build from. Do not "fix" that with `--no-save` pins — the next npm command reverts
them. `npx --force` does downgrade the error to a warning and will run; that is the exact
door #36 came in through, so don't.

Install bun with `npm install -g bun` (an officially documented method). A global install is
not blocked by the guard, so the bootstrap works. Once installed, the
`package.json` scripts work as written — `dev`/`build`/`start`/`lint` all shell out to
**`bunx`**, and `build`'s `NODE_OPTIONS='…' bunx next build` prefix is POSIX-shell syntax;
bun's own shell handles it on Windows. CI is unaffected either way: there bun is already
installed and no workflow calls npm.

**The guard needs npm ≥ 10.9.0**, where `devEngines` was introduced (npm/cli 4d57928,
#7766). An older npm ignores the field silently and the drift comes back with no warning —
that is why `engines.npm` is pinned in `package.json`. On such a machine, fall back to
checking the version by hand: `bunx next --version` must equal the `next` entry in
`bun.lock`.

## 1. Install (only if needed)

```bash
bun install --frozen-lockfile
```

Skip if `node_modules` already matches `package.json`/`bun.lock`. Before making any claim
about build behaviour, confirm you are on the locked version — `bunx next --version` must
equal the `next` version in `bun.lock`.

In a fresh worktree the browser for the locked Playwright is usually missing too:

```bash
bunx playwright install chromium   # first run only; e2e fails with "Executable doesn't exist at..."
```

## 2. Lint + type-check

```bash
bun run lint
bunx tsc --noEmit
```

Both must be clean — the 9
`react-hooks/set-state-in-effect` errors and the 2 TS2345 in
`src/app/api/video-stream/route.ts` that used to be the baseline are gone (`8a922af` #12,
`4370e29` #11). A red run is your diff, not a known exception. The current baseline for both
is **0 errors**.

## 3. Build

```bash
bun run build
```

Needs outbound HTTPS to `fonts.googleapis.com`/`fonts.gstatic.com` (`next/font` fetches
Google Fonts at build time) - see the baseline note in `AGENTS.md`. If that's blocked in
your sandbox, run `bun run dev` instead, load the affected route(s) yourself, and
say plainly in the task's `## Result` that a full production build could not be verified
here so a human (or a later run with normal network access) should confirm it once.

## 4. Smoke test

```bash
bun run test:e2e        # or: bunx playwright test — NOT `npm run test:e2e`
```

**This works locally** (verified 2026-10-15: `3 passed`, ~28 s). The long-standing "don't
run it on Andrew's laptop" note was wrong twice over:

- `baseURL` was `http://127.0.0.1:3100`, and Next 16 refuses to serve dev resources
  (client chunks, HMR socket) to origins missing from `allowedDevOrigins`. The server
  answered HTML fine — so a screenshot looked healthy — but the page never hydrated and
  every card selector timed out. Fixed in `fb9a0f2` (#13): `localhost`.
- The first assertion failure came from Playwright's `expect.timeout` default of 5 s,
  which the config's `timeout` does *not* touch. Raised to 15 s.

**The flake is not fully gone.** On a cold machine the first run still fails now and then:
15 s is much better than 5 s but not always enough, and the underlying slowness of that
first run is undiagnosed (#13). Treat a step-4 flake as an open question to investigate,
not as a number to raise again.

Two operational notes:

- **Never pass `PLAYWRIGHT_BASE_URL=http://127.0.0.1:...`** — it overrides `baseURL` and
  reinstates the bug above. Any other host is fine; omit the variable to get the default.
- **Don't start `next dev` by hand for this.** `playwright.config.ts`'s `webServer` boots
  `bunx next dev -p 3100` itself, and `reuseExistingServer` is on outside CI so it won't
  fight your dev server on 3000. Next 16 fails with `Another next dev server is already
  running` if the folder already has a live dev server, which kills the run before it
  starts. Cold start costs ~1 min of compile time, which is why `webServer.timeout` is
  120 s.

First run on a machine: `bunx playwright install chromium`. When a task changes
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
