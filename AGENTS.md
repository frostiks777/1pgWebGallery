<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Photo Gallery — project guide for AI agents

Single-maintainer project (Andrew). Read this completely before touching code.

## What this is

Self-hosted single-page photo gallery. Photos come from WebDAV (Nextcloud/ownCloud/Yandex.Disk/Box);
with no `WEBDAV_*` env set it serves the bundled demo photos in `public/demo-photos/`. That demo mode
is the default for this checkout and the mode the smoke tests run in. Six collage layouts, a
lightbox, hide/delete/cover/panorama management, optional password gate. Production is a single
Ubuntu box at https://ap-p-g.duckdns.org/ — no staging.

Next.js 16 (App Router, Turbopack) + React 19 + Tailwind 4, `webdav` client, `sharp`, Radix/shadcn
in `src/components/ui/`, framer-motion, lucide. There is **no unit-test framework** — only
Playwright e2e smoke tests.

## Commands (verified on this checkout, 2026-09-28)

`package.json` scripts `dev`/`build`/`start`/`lint` all shell out to **`bunx`**, and `build`'s
`NODE_OPTIONS='…' bunx next build` prefix is POSIX-shell syntax. Without `bun` on PATH, all four
fail with `'bunx' is not recognized` — they do **not** transparently fall back to npm. Run the
tools directly instead:

```bash
npx next dev -p 3000        # not: npm run dev
npx next build               # not: npm run build
npx eslint .                 # not: npm run lint
npm run test:e2e             # this one is plain `playwright test`, works as-is
```

`bun.lock` is the committed lockfile and CI uses `bun install --frozen-lockfile`. `npm install`
works for local dev and only writes a gitignored `package-lock.json` beside it — don't commit it.

### Checks every change goes through

Ordered gate: **lint → build → e2e**, details in `.agents/shared/checks.md`.

- `npx eslint .` — must not report a *new* error (baseline below).
- `npx next build` — **fails without outbound HTTPS to `fonts.googleapis.com`/`fonts.gstatic.com`**
  (`next/font` fetches at build time). Network-restricted sandbox? Not a code defect: fall back to
  `npx next dev` + loading the route, and say so explicitly. Build emits 11 pre-existing Turbopack
  "Dynamic filesystem access causes tracing of the whole project" warnings from the `fs.*Sync` calls
  on computed paths in `src/app/api/images/route.ts` and `api/video-stream/route.ts` — the codebase
  already opts some of these out with `/*turbopackIgnore: true*/`; do the same for new ones instead
  of letting tracing balloon the standalone bundle.
- `npm run test:e2e` — **на ноутбуке Andrew локально не гоняем** (2026-09-29: оба smoke-теста
  падают по таймауту 30 с на холодном старте, при этом приложение живое — на прогретом
  `next dev` карточки есть за ~3 с). `playwright.config.ts` boots its own `npx next dev -p 3100`
  (`reuseExistingServer` outside CI, so it won't fight your dev server on 3000); point it
  elsewhere with `PLAYWRIGHT_BASE_URL`. НЕ поднимай `next dev` ради проверки: Next 16
  падает с `Another next dev server is already running`, если в папке уже есть живой
  dev-сервер, и `test:e2e` не стартует. Подробности и обходной путь — `.agents/shared/checks.md`
  шаг 4. **Extend `tests/e2e/` rather than hand-rolling a check** for anything
  gallery/lightbox/navigation shaped.
- `eslint.config.mjs` turns off a very large set of rules (`exhaustive-deps`, `no-img-element`,
  all the `@typescript-eslint/*` strictness ones, `no-console`…). A clean lint run is a weak signal
  here — don't treat it as proof the change is correct.
- `next dev` **rewrites `next-env.d.ts`** (swaps `.next/types/routes.d.ts` for `.next/dev/types/…`
  and adds a `root-params` import). That churn is not part of your change; don't commit it.

## Layout & data flow

- `src/app/page.tsx` — the entire gallery page: folder/photo state, every fetch, layout switching.
- `src/components/gallery/` — six layouts + `PhotoCard.tsx`, `Lightbox.tsx`, `GalleryChrome.tsx`,
  `types.ts` (`Photo` carries an optional `videoPath`), barrel `index.ts`.
- `src/app/api/*/route.ts` — `photos`, `folders`, `images` (+ `images/generate` for the batch
  thumbnail job), `photos/delete`, `hidden`, `panoramas`, `covers`, `auth`, `webdav/test`,
  `video-stream`.
- `src/lib/` — `webdav.ts` (client + listing), `videoExt.ts`, `ffmpeg.ts`, `auth.ts`, `dir-meta.ts`.
- `src/proxy.ts` — **not** `middleware.ts`; Next.js 16 renamed the file and the export. It rate-limits
  `/api/:path*` (in-memory, env `API_RATE_LIMIT`/`API_RATE_WINDOW`, and **`/api/images` is exempt**)
  and enforces the optional `API_SECRET_TOKEN` bearer token. Adding a new API route automatically
  inherits both.
- `Obsidian_Theme/` — standalone design-mockup HTML/JSX, never imported or compiled, excluded from
  eslint. A visual reference only; don't wire it into the app.

### `.data/` is state, not cache

`CACHE_DIR` defaults to `<cwd>/.data` (README's claim of `/tmp/photo-gallery-cache` is stale). It
holds generated thumbnails **and** `.data/dir-meta/<sanitized-dir>.json` — hidden photos, panorama
marks and up to 3 covers per folder, i.e. the user's own settings. Wiping `.data` silently resets
the gallery. It's gitignored, and on the server it lives *outside* `release/` precisely so
`rsync --delete` can't destroy it.

### Videos

- Playback/preview is **native `<video>` streaming** through `src/app/api/video-stream/route.ts`
  (true byte-range proxy in WebDAV mode, 307 to the static file in demo mode). ffmpeg is not
  involved in playback. An earlier ffmpeg-generated WebP "trailer" approach was deliberately deleted
  — don't reintroduce it.
- ffmpeg is used only to extract a poster frame for videos (`src/lib/ffmpeg.ts`). ffmpeg/ffprobe are
  optional: if missing, video posters silently degrade and the app logs a loud warning.
- `withFfmpegSlot` is a single **server-wide serialization queue** because the prod box has 1 CPU
  core. Any new ffmpeg work must go through it, or that guarantee breaks.
- A photo gains `videoPath` when a same-stem video sits next to it (e.g. `IMG_1.jpg` + `IMG_1.mp4`).
  A video with no companion photo is listed as a photo whose "image" is the extracted poster,
  capped by `VIDEO_PREVIEW_MAX_MB` (default 300).

## Conventions an agent would otherwise miss

- **All user-facing strings are Russian** — `aria-label`s, tooltips, sort options, `window.confirm`
  prompts. Keep new UI text in Russian; the e2e specs select on it (`getByLabel('Закрыть')`).
- Card/element classes and CSS variables are `obs-`-prefixed (`.obs-photo-card`, `--obs-muted`) —
  the Playwright specs depend on that class name.
- `.env.example` lists only 4 of the ~12 vars the code reads. Also live: `WEBDAV_LOGON_PASSWORD`,
  `API_SECRET_TOKEN`, `API_RATE_LIMIT`, `API_RATE_WINDOW`, `WEBDAV_COLOCATED_CACHE`,
  `COLOCATED_THUMBS_DIR`, `CACHE_DIR`, `VIDEO_PREVIEW_MAX_MB`.
- `telegram-bot/` is a **personal, mostly-local** helper (bot bridge for approvals/notifications, zero
  deps, own `package.json`). Its scripts and `README.md` are tracked; **its state is gitignored** —
  `.env` (real bot token), `inbox.jsonl`/`outbox.jsonl`/`decisions.jsonl` (the maintainer's chat id,
  his messages, and git status of unrelated private projects) and the `.bot.pid`/`.bot.lock` runtime
  artifacts. Never `git add -A` here and never let the token reach a commit. The plugin at
  `.opencode/plugins/telegram-autostart.js` (also tracked) autostarts `bot.mjs` as a singleton —
  it must stay one process, since a second poller on the same token makes Telegram answer 409 and
  splits the update stream between them — and reports `session.idle`/`session.error`.
- `.claude/rules/security.md` and `.cursor/rules/00-security.mdc` are generic corporate-DLP
  boilerplate copied from a template, not project policy. `.devcontainer/` likewise references a
  `pre-commit` install that has no config in this repo — there are no git hooks to satisfy.

## Deployment

`git push` to `main` → `.github/workflows/deploy.yml` builds the standalone bundle on GitHub's
runners and rsyncs it (`--delete`) to the `DEPLOY_PATH` secret, then restarts the `photo-gallery`
systemd unit. Lint there is `continue-on-error`. The **server never runs `next build`** — that was
the cause of repeated OOM kills on its ~800MB RAM. `DEPLOY_PATH` must be a dedicated release dir
that owns nothing durable: `.env.local` (a symlink back to the real file) and `.data` must stay
outside it. One-time server setup: `DEPLOYMENT.md` §10.

An AI session cannot reach that server; the loop below ends at "committed to git", and CI or Andrew
gets it live from there.

## AI-assisted development cycle

Task queue under `.agents/skills/`, all state in this repo's own git history (no worktrees, no
claim/lease machinery — single maintainer, single checkout).

- Route first: a large feature or bug (public API/UX, `.data` format, > ~2 files) goes to a
  GitHub Issue instead — see `## Agent behavior`. The inbox/task queue is for small, mechanical work.
- Note what needs doing in `ai/inbox.md`, in your own words.
- `.agents/skills/process-inbox/SKILL.md` → task dirs under `ai/tasks/<date>/<slug>/`
  (`task.md` + `state.yaml`).
- `.agents/skills/perform-task/SKILL.md` → implements exactly one task: change, self-review the full
  diff against `## Acceptance`, run `.agents/shared/checks.md`, commit, mark done or honestly blocked.
  Inside a task, run the process skills in order: `interview` → `plan` → (`ponytail`) → (`tdd`) →
  `verify` → `commit-push` (see `## Agent skills`).
- `.agents/skills/continue/SKILL.md` → drains the queue (in-progress → oldest `todo` → process inbox).
- `git log`/`blame` over `ai/tasks/` is the record of what the AI did and why.

## Agent skills

83 skills live in `.agents/skills/` (manifest: `skills-lock.json`) — project process skills
plus upstream sets (mattpocock/skills, tech-leads-club, single-repo skills). They are loaded
by the `skill` tool through their `description` frontmatter. Only `.agents/skills/` is used —
not `.opencode/skills/` or `.claude/skills/`.

Project process skills, in the order they run:

`interview` → `plan` → (`ponytail` before new deps/abstractions) → (`tdd` when applicable) →
`verify` → `commit-push`.

- `interview` — 3–7 clarifying questions before non-trivial work; don't guess requirements.
- `plan` — numbered, individually verifiable steps before code.
- `ponytail` — prove a new dependency/abstraction is needed before adding it.
- `tdd` — upstream skill; **there is no unit-test framework in this repo**, so today this means
  an e2e spec first (`tests/e2e/`). Adding Vitest is a separate, undecided task.
- `verify` — runs the chain from `.agents/shared/checks.md` and reports exact results.
- `commit-push` — staging rules, Conventional Commits, push.
- `telegram-bridge` — personal Telegram approvals (see `## Notifications`).

To add a skill: create `.agents/skills/<name>/SKILL.md` with YAML frontmatter (`name` must
equal the directory name, `description` is the trigger). `apply-design` and
`apply-design-v2` are inherited from the course project and do not apply here — delete them
if they get in the way.

## Hygiene of context window

- **Two-iteration rule:** if the same check (`npx eslint .` / `npx tsc --noEmit` /
  `npm run test:e2e` / `npx next build`) is still red after two consecutive fix attempts:
  (1) state in one sentence why the current approach is wrong, (2) state an alternative in one
  sentence, (3) ask the user via `question(...)` which way to go.
- If the dialog has grown and progress is zero, propose `/compact` or a fresh session with
  pointers to `AGENTS.md`, `MEMORY.md`, `CONTEXT.md`, `docs/adr/`.
- Files are the only durable context between sessions: `AGENTS.md`, `MEMORY.md`, `CONTEXT.md`,
  `docs/`. Anything not written there is lost on the next `/compact`.

## Long-term memory

- `MEMORY.md` (root) — project state between sessions; update it when the stack changes, a
  critical fix lands, an ADR is accepted, or check results change.
- `CONTEXT.md` (root) — domain glossary; use its vocabulary in issues, commits, code and UI text.
- `docs/adr/` — one ADR per hard-to-reverse decision. `docs/adr/README.md` holds the index and
  the "when not to write one" rules; template is `docs/adr/template.md`.
- Before a large task: read `MEMORY.md`, then the relevant ADR. After: update `MEMORY.md` and
  add an ADR if the decision is architectural.

## Safety gates

- **Read-only in production:** if the environment is production/staging (`NODE_ENV=production`,
  explicit deploy target), only reads are allowed — `git log`, file reads, `curl` against the
  running service. No writes to remote repos, no migrations, no deletions outside the release dir.
- **Human-in-the-loop:** force-push, `git reset --hard`, rewriting `MEMORY.md`, deleting ADRs,
  changing `.github/workflows/*`, or anything touching the production server require an explicit
  user request — show the command and consequences first.
- **Destructive operations** (`rm -rf`, `rsync --delete`, wiping `.data/`) — show a dry-run or
  diff and wait for confirmation. `.data/` is user state, not cache.
- **Secrets:** never write tokens/passwords into code or commits; `.env.local` stays gitignored;
  the Telegram bot token lives only in `telegram-bot/.env`.

## Notifications (toast + Telegram)

Notify the user only in two cases (never "just because"):
1. **A decision is needed** — the agent hit a question/choice/blocker and is waiting
   (`question(...)`, ambiguity, a check still red after two iterations).
2. **A successful release** — push done, CI/deploy went green, task finished and pushed.

Channels (either or both, same two cases):

- Windows toast:
  `powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/notify.ps1 "Title" "Text"`
  The script must stay UTF-8 **with BOM** (PowerShell 5.1 breaks Cyrillic otherwise) and uses
  the WinRT `Windows.UI.Notifications` type, which only `powershell.exe` 5.1 can project —
  `pwsh` 7 fails on it.
- Telegram: `.agents/skills/telegram-bridge/SKILL.md` (`node telegram-bot/notify.mjs ...`).

Keep messages short, in Russian, no secrets.

## Agent behavior

- **Task routing (hybrid):** small, mechanical work → `ai/inbox.md` → `ai/tasks/` (see
  `## AI-assisted development cycle`). Large features and bugs, or anything touching the public
  API, top-level UI behavior, or the `.data` format → GitHub Issue first (`gh issue create`,
  labels from `docs/agents/triage-labels.md`); put `(#NN)` in the commit message and close the
  issue after pushing. Single-line mechanical fixes may skip both.
- Run the checks from `.agents/shared/checks.md` before committing; a red check caused by your
  diff means the task is not done.
- Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`); never commit `package-lock.json`,
  `next-env.d.ts` churn, `.data/`, or `telegram-bot/` state.
- All user-facing strings stay Russian; the e2e specs select on them.
- `git push` to `main` deploys to production — don't push without a green local verify.

## Known baseline issues (verified 2026-09-28 — not caused by your change)

- `npx eslint .` reports **9** errors, all `react-hooks/set-state-in-effect`:
  `src/app/page.tsx` lines 118, 178, 224, 242, 296, 354, 394 and
  `src/components/gallery/Lightbox.tsx` lines 89, 107. Tracked as its own task in `ai/inbox.md` —
  fix it as a separate reviewed change, restructure the effects rather than suppressing the rule,
  and never let it block or silently ride along in an unrelated diff. (Older notes said 14; the
  count is 9.)
- `npx next build` needs outbound HTTPS to Google Fonts, as above — the only expected failure in a
  network-restricted sandbox.
- `npx tsc --noEmit` reports **2** errors, both TS2345 in `src/app/api/video-stream/route.ts`
  (lines 145, 159): the `webdav` client's `createReadStream` returns its own `ReadableLike`,
  which `Readable.toWeb()` won't take — the existing `as unknown as ReadableStream` cast is on
  the result, not the argument. `next build` doesn't catch it (that file isn't in the
  type-checked set). Tracked in `ai/inbox.md`; not caused by your change.
