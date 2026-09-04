<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Photo Gallery — project guide for AI agents

Single-maintainer project (Andrew). Read this file completely before touching code.

## Overview

A self-hosted, single-page photo gallery: WebDAV (Nextcloud/ownCloud/Yandex.Disk/Box) as the
photo source, six collage layouts, a full lightbox, hide/delete/cover/panorama photo
management, optional password gate. Falls back to bundled demo photos
(`public/demo-photos/`) when no `WEBDAV_*` env vars are set — that's the mode this repo
runs in by default and the mode the smoke tests use.

Live at https://ap-p-g.duckdns.org/, deployed on a single Ubuntu server the maintainer
controls directly. There is no staging environment.

## Tech stack

- Next.js 16 (App Router, Turbopack), React 19, TypeScript, Tailwind CSS 4
- Radix UI primitives, Framer Motion, lucide-react icons
- `webdav` npm package for the cloud source, `sharp` for thumbnails
- ESLint (`eslint-config-next`) for static analysis; Playwright for e2e smoke tests
  (added for the AI dev cycle below — there is no unit-test framework)
- Package manager: `package.json`'s own scripts call `bunx`, but nothing in `src/` uses a
  Bun-only API. `npm`/`npx` work identically and are what `DEPLOYMENT.md` and this repo's
  AI skills use — don't assume `bun` is installed. Prefer `bun` only when `bun -v` succeeds.

## Development commands

```bash
npm install          # or: bun install
npm run dev           # next dev -p 3000 (demo mode without a .env.local)
npm run lint           # eslint .
npm run build           # next build — needs outbound access to fonts.googleapis.com /
                          # fonts.gstatic.com (next/font fetches Google Fonts at build time);
                          # fails on that alone in a network-restricted sandbox, see below
npm run test:e2e         # playwright test — first time, also: npx playwright install chromium
```

## Project structure

- `src/app/page.tsx` — the whole gallery page: folder/photo state, all the fetch calls,
  layout switching.
- `src/components/gallery/` — layout components (Masonry/Bento/Honeycomb/Wave/Minimalism/
  Album), `PhotoCard.tsx`, `Lightbox.tsx`, `GalleryChrome.tsx` (header/toolbar), types.
- `src/app/api/*/route.ts` — photos, folders, images (thumbnail/full proxy + on-demand
  generation), hidden/panoramas/covers metadata, auth.
- `src/lib/webdav.ts`, `src/lib/auth.ts`, `src/lib/photo-meta.ts`, `src/lib/dir-meta.ts`.
- `public/demo-photos/` — the 8 demo images used whenever `WEBDAV_URL` isn't set.
- `tests/e2e/` — Playwright smoke specs.

## Deployment

`git push` to `main` triggers `.github/workflows/deploy.yml`: it builds the standalone
Next.js output on GitHub's runners (plenty of RAM, unlike the VPS) and rsyncs the result
over SSH to `/var/www/apps/photo-gallery`, then restarts the `photo-gallery` systemd unit.
See `DEPLOYMENT.md` §10 for the one-time server setup (deploy user, SSH key, GitHub
secrets) this depends on. The server no longer runs `next build` at all — that was the
source of repeated OOM kills on its ~800MB RAM.

Manual fallback (e.g. CI is down, or a change needs to go out without going through git):

```bash
cd /var/www/apps/photo-gallery
git pull && npm install && npm run build
sudo systemctl restart photo-gallery
```

An AI session cannot reach the production server directly (it isn't on any network this
session can route to) — the dev cycle below stops at "committed to git", and either the
GitHub Actions workflow or Andrew himself gets it onto the server from there.

## AI-assisted development cycle

This repo uses a lightweight task-queue workflow under `.agents/skills/`, loosely modeled
on telegramdesktop/tdesktop's `.agents/skills` but stripped down for a single maintainer
working in one repo: no git worktrees, no separate state repo, no multi-machine claim/lease,
no split-required/consolidation machinery. Everything lives in this repo's own history.

- **Write down what needs doing** in `ai/inbox.md`, in your own words — a bullet or a
  paragraph, doesn't matter.
- **`.agents/skills/process-inbox/SKILL.md`** turns inbox notes into tracked task files
  under `ai/tasks/<date>/<slug>/` (`task.md` + `state.yaml`).
- **`.agents/skills/perform-task/SKILL.md`** implements exactly one task: reads it, makes
  the change, self-reviews the diff, runs the checks in `.agents/shared/checks.md`,
  commits, marks it done (or honestly blocked).
- **`.agents/skills/continue/SKILL.md`** works through the queue — resumes anything
  in-progress, else starts the next `todo` task, else processes the inbox if it has notes —
  until the queue is empty or something needs a human decision.

Task state lives in git (`ai/tasks/`), so `git log`/`git blame` over that folder is the
project's history of what the AI did and why.

## Known baseline issues (as of 2026-09-04 — not caused by your change)

- `npm run lint` reports 14 pre-existing `react-hooks/set-state-in-effect` errors in
  `src/app/page.tsx` and `src/components/gallery/Lightbox.tsx`. Present before any
  AI-assisted work started here; there's a task for it in `ai/inbox.md` — fix it as its own
  reviewed task, don't let it block an unrelated task's lint check, and don't silently
  "fix" it as a drive-by inside another task's diff.
- `npm run build` needs outbound HTTPS to `fonts.googleapis.com` / `fonts.gstatic.com`
  (`next/font` fetches Google Fonts at build time). It fails on that alone in a
  network-restricted sandbox — not a code defect. `npm run dev` still works there, since
  Turbopack dev only warns and falls back to a system font instead of hard-failing.
