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
- `npm run test:e2e` — first run on a machine needs `npx playwright install chromium`. `playwright.config.ts`
  boots its own `npx next dev -p 3100` (`reuseExistingServer` outside CI, so it won't fight your dev
  server on 3000); point it elsewhere with `PLAYWRIGHT_BASE_URL`. **Extend `tests/e2e/` rather than
  hand-rolling a check** for anything gallery/lightbox/navigation shaped.
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

- Note what needs doing in `ai/inbox.md`, in your own words.
- `.agents/skills/process-inbox/SKILL.md` → task dirs under `ai/tasks/<date>/<slug>/`
  (`task.md` + `state.yaml`).
- `.agents/skills/perform-task/SKILL.md` → implements exactly one task: change, self-review the full
  diff against `## Acceptance`, run `.agents/shared/checks.md`, commit, mark done or honestly blocked.
- `.agents/skills/continue/SKILL.md` → drains the queue (in-progress → oldest `todo` → process inbox).
- `git log`/`blame` over `ai/tasks/` is the record of what the AI did and why.

## Known baseline issues (verified 2026-09-28 — not caused by your change)

- `npx eslint .` reports **9** errors, all `react-hooks/set-state-in-effect`:
  `src/app/page.tsx` lines 118, 178, 224, 242, 296, 354, 394 and
  `src/components/gallery/Lightbox.tsx` lines 89, 107. Tracked as its own task in `ai/inbox.md` —
  fix it as a separate reviewed change, restructure the effects rather than suppressing the rule,
  and never let it block or silently ride along in an unrelated diff. (Older notes said 14; the
  count is 9.)
- `npx next build` needs outbound HTTPS to Google Fonts, as above — the only expected failure in a
  network-restricted sandbox.
