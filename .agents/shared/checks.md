# Checks perform-task must run before committing

Shared by `.agents/skills/perform-task/SKILL.md`. Read `AGENTS.md`'s "Known baseline
issues" section first — checks below are scoped against that baseline, not a demand for a
perfectly clean repo on day one.

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

`npx eslint .` must not report a *new* error. `AGENTS.md`'s "Known baseline issues" lists
what's already broken and out of scope — 9 `react-hooks/set-state-in-effect` errors, plus 2
TS2345 in `src/app/api/video-stream/route.ts`. A task touching `page.tsx`/`Lightbox.tsx`
may still trip one of those 9 pre-existing lines merely by being in the same file; don't
fail the task over a line your diff didn't touch, but do fail it over anything your diff
*did* introduce or change.

## 3. Build

```bash
npx next build
```

Needs outbound HTTPS to `fonts.googleapis.com`/`fonts.gstatic.com` (`next/font` fetches
Google Fonts at build time) - see the baseline note in `AGENTS.md`. If that's blocked in
your sandbox, run `npx next dev -p 3000` instead, load the affected route(s) yourself, and
say plainly in the task's `## Result` that a full production build could not be verified
here so a human (or a later run with normal network access) should confirm it once.

## 4. Smoke test — **на этой машине не гонять**

```bash
npm run test:e2e
```

**Локально на ноутбуке Andrew это не запускается** (проверено 2026-09-29): тесты падают
по `Test timeout of 30000ms exceeded` в ожидании `.obs-photo-card`, хотя приложение живое —
на прогретом `next dev` те же 8 демо-карточек рендерятся за ~3 с, а API отвечает 200 за
~200 мс. Тянет не железо, а цепочка «холодный старт + 30-секундный таймаут теста», и
`next build`/`next dev` на этом ноутбуке вообще не тянет.

Что делать вместо этого:

- Для изменений в документации, конфигурации, CI, воркфлоу и скиллах — **шаги 2 и 3
  (`npx eslint .`, `npx tsc --noEmit`) достаточны**. Сборку подтверждает GitHub Actions.
- Для изменений в UI: собрать не локально, а отдать их Andrew'у либо дождаться CI — и
  записать в `## Result` задачи честный блокер («локально e2e не гоняем, сетевой доступ
  к шрифтам отсутствует»), а не «всё зелёное».
- `npx next dev` вручную не поднимать без нужды: Next 16 падает с
  `Another next dev server is already running`, если в папке уже есть живой dev-сервер
  (даже на другом порту) — из-за этого `test:e2e` может не стартовать вовсе.

Если Andrew всё же попросит прогнать e2e: сначала `npx next dev -p 3100` вручную,
дождаться «Ready», один раз открыть `/` чтобы прогреть компиляцию, и только потом
`PLAYWRIGHT_BASE_URL=http://127.0.0.1:3100 npx playwright test`.

First run on a machine: `npx playwright install chromium`. This starts `next dev` itself
(see `playwright.config.ts`'s `webServer`) — nothing to start by hand. When a task changes
gallery, lightbox, or navigation behavior, extend `tests/e2e/gallery.smoke.spec.ts` (or add
a new spec under `tests/e2e/`) to cover it, rather than writing a one-off manual check that
leaves no regression coverage behind.

## 5. Visual check (UI-visible changes only)

For any change a user would actually see, take a screenshot and look at it —
`page.screenshot()` in a throwaway Playwright script, saved under `.agents-runs/<task-id>/`
(gitignored), is fine for this. "The build succeeded" and "the smoke test passed" are not
evidence the UI looks right; look at the pixels before calling the task done. Локально на
этом ноутбуке — см. блокер в шаге 4.

## Done means

Steps 2–3 pass (2 may skip only pre-existing baseline lines; 3 may fall back per above, with
that fallback stated in the result); step 4 is skipped on Andrew's laptop per its own block
note, and only a UI change additionally needs step 5 — or the task file records a specific,
honest blocker instead of a task marked done on a failing check.
