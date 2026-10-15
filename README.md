# 📸 Photo Gallery — WebDAV Cloud Photos

[![CI](https://github.com/frostiks777/1pgWebGallery/actions/workflows/ci.yml/badge.svg)](https://github.com/frostiks777/1pgWebGallery/actions/workflows/ci.yml)
[![Build & Deploy](https://github.com/frostiks777/1pgWebGallery/actions/workflows/deploy.yml/badge.svg)](https://github.com/frostiks777/1pgWebGallery/actions/workflows/deploy.yml)
![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38B2AC?style=flat-square&logo=tailwind-css)
![Node](https://img.shields.io/badge/node-%3E%3D20.9-339933?style=flat-square&logo=node.js)
![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)

A self-hosted, single-page photo gallery that reads straight from your WebDAV storage —
Nextcloud, ownCloud, Yandex.Disk, Box, or anything else that speaks WebDAV. Six collage
layouts, a lightbox with zoom and keyboard navigation, video playback, and management for
hidden photos, deletions, folder covers and panoramas.

Run it on one small box. There is no database and no image re-upload: your photos stay where
they are, and the gallery only stores thumbnails and your own per-folder settings.

---

## Demo

With no `WEBDAV_*` variables set, the app serves the bundled demo photos from
`public/demo-photos/` — nothing to configure, nothing to leak. This is also the mode the
e2e smoke tests run in.

The maintainer's own instance runs at **https://ap-p-g.duckdns.org/** (Ubuntu, ~800 MB RAM,
1 CPU core; it may be password-protected).

---

## ✨ Features

**Six gallery layouts**

| Layout | Look |
|---|---|
| **Masonry** | Pinterest-style staggered grid |
| **Bento** | Asymmetric card grid, four-column rhythm on wide screens |
| **Honeycomb** | Hexagonal pattern |
| **Wave** | Wavy arrangement with varying rotations |
| **Minimalism** (Минимализм) | Clean list, thumbnail beside filename, monospace metadata |
| **Album** | Print-inspired: warm paper, white mat frames, lowercase captions |

**Lightbox** — zoom in/out, keyboard navigation (`←` `→`), thumbnail strip, download,
and hide / delete / cover / panorama controls without leaving the viewer.

**Video** — see [Videos](#-videos) below.

**Folder navigation** — breadcrumb with a Home button, folder preview covers
(up to 3 per folder, auto-populated on first visit).

**Photo management**

- **Hide** a photo, then bring the whole set back with one click
- **Delete** in two stages: pending with restore first, permanent removal after
- **Covers** — pick up to 3 photos as a folder's cover
- **Panoramas** — mark wide photos for special display

**Sorting** — by name (`A-Z`, `Z-A`) or by date (oldest / newest first), for both photos
and folders.

**UI** — dark and light themes, WebDAV connection indicator in the header (green when the
server responds, red on load errors, gray in demo mode, pulsing while loading), film-grain
overlay for a tactile paper feel, smooth scroll-to-top, batch thumbnail generation with a
progress bar, Framer Motion animations, responsive from phone to desktop.

---

## 🚀 Quick Start

**Requires Node.js `>=20.9.0`** (set in `package.json` `engines`) and either
[Bun](https://bun.sh) or Node.

```bash
git clone https://github.com/frostiks777/1pgWebGallery.git
cd 1pgWebGallery

bun install --frozen-lockfile
cp .env.example .env.local
```

Edit `.env.local` and put in your WebDAV credentials:

```env
WEBDAV_URL=https://cloud.example.com/remote.php/dav/files/username/
WEBDAV_USERNAME=your-username
WEBDAV_PASSWORD=your-app-password
PHOTOS_DIR=/Photos
```

Start the dev server:

```bash
bun run dev        # http://localhost:3000
```

Skip the `.env.local` step entirely to explore the bundled demo photos.

---

## ⚙️ Configuration

### WebDAV endpoints

| Provider | `WEBDAV_URL` |
|---|---|
| Nextcloud | `https://cloud.example.com/remote.php/dav/files/USERNAME/` |
| ownCloud | `https://cloud.example.com/remote.php/dav/files/USERNAME/` |
| Yandex.Disk | `https://webdav.yandex.com/` |
| Box | `https://dav.box.com/dav/` |

> 💡 Use an **app password**, not your account password — Nextcloud: Settings → Security →
> Create new App Password.

### Environment variables

All twelve variables the app reads, with the defaults baked into the code.
[`.env.example`](./.env.example) lists the same set with inline comments.

| Variable | Default | Purpose |
|---|---|---|
| `WEBDAV_URL` | — | WebDAV endpoint, trailing slash. Empty → demo mode |
| `WEBDAV_USERNAME` | — | WebDAV username |
| `WEBDAV_PASSWORD` | — | WebDAV password or app token |
| `PHOTOS_DIR` | `/Photos` | Folder inside the WebDAV account holding the photos |
| `WEBDAV_LOGON_PASSWORD` | — | Gallery password gate. Empty → gallery is open |
| `WEBDAV_COLOCATED_CACHE` | `true` | Write thumbnails to a `.thumbs/` folder next to the photos on WebDAV. Set `false` to keep them local only |
| `COLOCATED_THUMBS_DIR` | `.thumbs` | Name of that co-located folder |
| `CACHE_DIR` | `<cwd>/.data` | Local thumbnails **and** per-folder settings — see the warning below |
| `VIDEO_PREVIEW_MAX_MB` | `300` | Skip poster extraction above this size |
| `API_SECRET_TOKEN` | — | Require `Authorization: Bearer <token>` on API routes. Empty → auth off |
| `API_RATE_LIMIT` | `3000` | Requests per IP per window |
| `API_RATE_WINDOW` | `60000` | Rate-limit window in ms |

> ⚠️ **`CACHE_DIR` is state, not scratch space.** Besides thumbnails it holds
> `.data/dir-meta/<folder>.json` — your hidden photos, panorama marks and folder covers.
> Deleting the directory resets the gallery to its defaults. On a server it must live
> **outside** the deploy directory so `rsync --delete` cannot wipe it.

### Image optimization

Photos are converted to WebP by [sharp](https://sharp.pixelplumbing.com/) in three sizes,
tuned for 3000–6000 px originals:

| Preset | Dimensions | Quality | Used for |
|---|---|---|---|
| `thumbnail` | 800×800 | 80 | Gallery grids |
| `medium` | 1400×1400 | 72 | Lightbox viewing |
| `full` | 2400×2400 | 82 | Download and zoom |

Two-level caching: a local disk cache plus co-located `.thumbs/` folders on WebDAV, so
thumbnails travel with your backup or a second client. Adjacent images are prefetched in the
lightbox for instant navigation, and the gallery loads lazily with async decoding.
A batch-generation button pre-renders every thumbnail with a progress bar.

---

## 🎬 Videos

Playback is **native `<video>` streaming** through `/api/video-stream` — a true byte-range
proxy to WebDAV, so seeking works and the file is never fully downloaded. In demo mode the
route redirects to the static file instead. No transcoding is involved in playback.

A photo gains a video when a **companion video with the same stem** sits next to it:

```
IMG_0042.jpg  +  IMG_0042.mp4   →  one gallery card that plays the clip
```

Recognised extensions: `.mp4`, `.mov`, `.webm`, `.mkv`, `.m4v`, `.avi`.

A video **without** a companion photo is still listed, using an extracted poster frame as its
"photo". That poster is the only thing ffmpeg is used for — **ffmpeg and ffprobe are
optional**. If they are missing, video posters silently degrade and the app logs a loud
warning; everything else keeps working.

`VIDEO_PREVIEW_MAX_MB` (default 300) caps **poster extraction only**, so one huge file cannot
stall a single-core server. It does not limit playback. Videos over the cap return `413` for a
poster and `501` when ffmpeg is unavailable.

---

## 🔒 Security

**Gallery access** — `WEBDAV_LOGON_PASSWORD` puts a password gate in front of everything.
Successful login sets an httpOnly `gallery-auth` cookie with a 30-day lifetime, shared across
all tabs of the browser and surviving a restart. To revoke access, clear the cookie or change
the password.

**API access** — every `/api/*` route passes through [`src/proxy.ts`](./src/proxy.ts):

- **Rate limit** — in-memory, per IP, `API_RATE_LIMIT` requests per `API_RATE_WINDOW`
  milliseconds; over the limit you get `429` and a `Retry-After: 60`. It resets on server
  restart, and a multi-instance deployment would need a shared store instead.
- **Bearer token** — set `API_SECRET_TOKEN` and every API request must carry
  `Authorization: Bearer <token>`; without it you get `401`. Comparison is constant-time.
  Leave it empty on a trusted network to keep the API open.
- **`/api/images` is exempt from the rate limit**, because a single gallery view issues many
  thumbnail requests.

Good practice: never commit `.env.local` (already gitignored), use app passwords, give the
gallery its own folder, and use HTTPS endpoints.

---

## 📁 Project structure

```
├── .github/workflows/    # CI, deploy, release-please, opencode agent workflows
├── .agents/              # agent skills, checks.md
├── ai/                   # inbox.md + task queue for the agent loop
├── docs/                 # adr/ (decisions), agents/ (issue workflow, glossary)
├── public/demo-photos/   # bundled demo set used without WebDAV
├── scripts/              # notify.ps1 (toast), lighthouse-summary.mjs
├── telegram-bot/         # personal bot bridge: approvals and notifications
├── tests/e2e/            # Playwright smoke specs
├── .data/                # local thumbnails + dir-meta (gitignored, do not delete)
├── src/
│   ├── proxy.ts          # Next.js 16 proxy: rate limit + bearer auth for /api/*
│   ├── app/
│   │   ├── page.tsx      # the whole gallery page (client)
│   │   ├── layout.tsx
│   │   ├── globals.css
│   │   └── api/          # auth, covers, folders, hidden, images(+generate),
│   │                     # panoramas, photos(+delete), video-stream, webdav/test
│   ├── components/
│   │   ├── gallery/      # six layouts, PhotoCard, Lightbox, GalleryChrome,
│   │   │                 # types.ts, obsidian-icons, masonry-patterns
│   │   └── ui/           # shadcn/ui + Radix
│   ├── hooks/
│   └── lib/              # webdav, auth, dir-meta, ffmpeg, videoExt, photo-meta, utils
├── LICENSE
└── package.json
```

---

## 📝 Scripts

| Command | What it does |
|---|---|
| `bun run dev` | Dev server on port 3000 |
| `bun run build` | Production build |
| `bun run start` | Serve the production build |
| `bun run lint` | ESLint |
| `bun run test:e2e` | Playwright smoke specs |

> ⚠️ The first four scripts shell out to **`bunx`**, and `build` prefixes a POSIX-only
> `NODE_OPTIONS='…'`, which bun's own shell handles. If `bun` is not on `PATH` they fail
> with `'bunx' is not recognized'` — they do **not** fall back to npm.
>
> `bun.lock` is the committed lockfile and CI installs with `bun install --frozen-lockfile`, so
> install the same way. **All of npm is refused** — `npm install`, `npm run` and `npx` — with
> `EBADDEVENGINES`; see [#36](https://github.com/frostiks777/1pgWebGallery/issues/36). If you have
> no bun yet: `npm install -g bun` (a global install is not blocked). With caret ranges and no
> committed `package-lock.json`, npm would silently resolve a different tree than CI and
> production build from.
>
> The guard relies on `devEngines`, which npm has understood since **10.9.0**. On an older npm the
> field is ignored silently and the drift returns — check `bunx next --version` against `bun.lock`
> if you are unsure.

`next build` fetches Google Fonts at build time, so it needs outbound HTTPS to
`fonts.googleapis.com` and `fonts.gstatic.com`. In a network-restricted sandbox it fails for
that reason alone, not because of a defect.

---

## 🧪 Tests

There is no unit-test framework; the suite is Playwright smoke specs in `tests/e2e/`.

```bash
bunx playwright install chromium   # first time only
bun run test:e2e
```

The specs boot their own dev server on port 3100 and run in demo mode, so no WebDAV
credentials are needed. They select on Russian UI strings and the `obs-` prefixed CSS classes,
so renaming those breaks the suite.

On a laptop the specs can time out on a cold start even though the app itself is healthy —
`reuseExistingServer` picks up a warm dev server instead. Point them elsewhere with
`PLAYWRIGHT_BASE_URL`.

---

## 🚀 Deployment

**Production is a single Ubuntu box, deployed by GitHub Actions.** Pushing to `main` runs
[`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml):

1. GitHub's runners build the standalone Next.js bundle
2. `rsync --delete` the release directory onto the server
3. `systemctl restart photo-gallery`

> ⚠️ **Never run `next build` on the server.** It was the cause of repeated OOM kills on a
> ~800 MB box. Build happens on the runner, the server only receives the result.

`DEPLOY_PATH` must be a dedicated release directory that owns nothing durable:
`.env.local` (a symlink back to the real file) and `.data` must stay outside it, or
`rsync --delete` will destroy your gallery settings on the next deploy.

Step-by-step setup — server prerequisites, Nginx, SSL, systemd and one-time CI configuration —
is in **[DEPLOYMENT.md](./DEPLOYMENT.md)**. Installation walkthrough: **[INSTALL.md](./INSTALL.md)**.
Post-deploy verification: **[CHECKLIST.md](./CHECKLIST.md)**.

---

## 🤖 Agent in GitHub

An OpenCode agent runs in this repository through GitHub Actions, via the GitHub App
`opencode-agent`. Rationale and setup: **[ADR-0004](./docs/adr/0004-agent-workflows-in-github-actions.md)**.

| Workflow | Triggered by | Permissions | Does |
|---|---|---|---|
| [`opencode.yml`](./.github/workflows/opencode.yml) | `/oc` or `/opencode` comment in an issue or PR | `contents`, `pull-requests`, `issues`, `id-token`: write | carries out a request: investigate, fix, open a PR |
| [`opencode-triage.yml`](./.github/workflows/opencode-triage.yml) | an issue opened by a human | `contents`: read; `issues`, `id-token`: write | comments with a breakdown of the task |
| [`opencode-review.yml`](./.github/workflows/opencode-review.yml) | a PR opened or updated by a human | `contents`: read; `pull-requests`, `id-token`: write | leaves review comments |
| [`opencode-audit.yml`](./.github/workflows/opencode-audit.yml) | schedule `17 6 * * *` or manual dispatch | `contents`: read; `issues`, `id-token`: write | runs `eslint`/`tsc` and Lighthouse, opens issues for findings |

`id-token: write` is required in all four: the action exchanges an OIDC token for a token of
the `opencode-agent` GitHub App, and without it the agent's permissions resolve to `none`.
`opencode-audit.yml` deliberately does not request `pull-requests` — it writes issues only.

Runs are visible in the **Actions** tab. Audit reports are kept as artifacts
(`code-audit-report`, `lighthouse-report`) for 30 days.

Repository setup it expects: the `OPENCODE_API_KEY` secret (provider key for the `opencode/*`
model), an `APP_URL` variable (the Lighthouse target — the Lighthouse job is skipped without it),
and "Allow GitHub Actions to create and approve pull requests" enabled.

Worth knowing:

- `share: false` in every workflow — agent sessions are never published by link, even though
  the opencode default for a public repository is `share: true`.
- Only the owner, collaborators and contributors can invoke the agent, and bot comments are
  filtered out, so the agent can never answer itself in a loop.
- PRs opened by bots (including release-please) skip auto-review, which saves Actions minutes.
- The agent is forbidden from pushing to `main` and from merging PRs — because a push to `main`
  deploys to production. Humans merge.
- Auto-triage produces a draft task breakdown; the final decision is always yours.

---

## 🛠️ Tech stack

- **Framework:** [Next.js 16](https://nextjs.org/) (App Router, Turbopack)
- **Runtime:** Node.js `>=20.9.0`, Bun for scripts
- **Language:** [TypeScript 5](https://www.typescriptlang.org/)
- **Styling:** [Tailwind CSS 4](https://tailwindcss.com/)
- **Components:** [shadcn/ui](https://ui.shadcn.com/) + [Radix UI](https://www.radix-ui.com/)
- **Animation:** [Framer Motion](https://www.framer.com/motion/)
- **Icons:** [Lucide React](https://lucide.dev/)
- **WebDAV:** [webdav](https://github.com/perry-mitchell/webdav-client)
- **Images:** [sharp](https://sharp.pixelplumbing.com/)
- **Validation:** [Zod](https://zod.dev/), [Sonner](https://sonner.emilkowal.dev/) toasts
- **Tests:** [Playwright](https://playwright.dev/)

---

## 📚 Documentation

| Document | What's in it |
|---|---|
| [INSTALL.md](./INSTALL.md) | Step-by-step installation on Ubuntu 22 |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Nginx, SSL, systemd, CI/CD setup |
| [PERFORMANCE.md](./PERFORMANCE.md) | What was optimised, and what is still worth doing |
| [MIGRATION.md](./MIGRATION.md) | Old → unified image endpoint guide |
| [CHECKLIST.md](./CHECKLIST.md) | Post-deployment verification |
| [AGENTS.md](./AGENTS.md) | Guide for AI agents working in this repository |
| [MEMORY.md](./MEMORY.md) | Project state between sessions |
| [CONTEXT.md](./CONTEXT.md) | Domain glossary |
| [CHANGELOG.md](./CHANGELOG.md) | Release history (maintained by release-please) |
| [docs/adr/](./docs/adr/README.md) | Architecture decision records |

> On the performance claims: `PERFORMANCE.md` describes applied optimisations and its own
> *expected* gains. The percentage figures that used to sit in this README were projections,
> not measurements — no benchmark for them is recorded in the repository, so they are gone.
> The audit workflow produces real Lighthouse reports as artifacts if you want current numbers.

---

## 🤝 Contributing

Contributions are welcome — open a Pull Request. If you are an AI agent, please read
**[AGENTS.md](./AGENTS.md)** first: it documents the worktree layout, the check chain, and
the conventions an agent would otherwise break.

---

## 📄 License

MIT — see [LICENSE](./LICENSE).

---

## 🇷🇺 Краткое описание

**Photo Gallery** — самостоятельная одностраничная галерея, которая читает фотографии прямо
из вашего WebDAV-хранилища. Базы данных нет, фотографии никуда не копируются — галерея
хранит только миниатюры и ваши собственные настройки по папкам.

- **6 макетов**: Masonry, Bento, Honeycomb, Wave, Minimalism, Album
- **Лайтбокс** с зумом, навигацией по клавиатуре, полоской миниатюр и скачиванием
- **Видео**: файлы с тем же именем, что и фото, воспроизводятся в карточке; ролик без парного
  фото показывается как отдельный элемент. ffmpeg нужен только для постера и не обязателен
- **Управление фото**: скрытие, удаление в два шага (сначала с восстановлением), выбор
  обложек папки, пометка панорам
- **Навигация по папкам** с хлебными крошками и превью-обложками
- **Сортировка** по имени и дате, для фото и для папок
- **Защита**: пароль на галерею (`WEBDAV_LOGON_PASSWORD`), bearer-токен и лимит запросов для
  API (`API_SECRET_TOKEN`, `API_RATE_LIMIT`, `API_RATE_WINDOW`)
- **Демо-режим**: без переменных `WEBDAV_*` показываются встроенные примеры фото
- **Тёмная и светлая тема**
- **Оптимизация**: WebP через sharp в трёх размерах, двухуровневый кеш, ленивая загрузка,
  предзагрузка соседних кадров в лайтбоксе

> ⚠️ Каталог `CACHE_DIR` (по умолчанию `.data`) — это **состояние**, а не временный кеш:
> кроме миниатюр там лежат скрытые фото, панорамы и обложки. Его удаление сбрасывает
> настройки галереи.

Деплой: сборка standalone-бандла на раннерах GitHub Actions, затем `rsync --delete` и
перезапуск systemd-юнита. **`next build` на сервере запускать нельзя** — это вызывало
повторяющиеся OOM-киллы на машине с ~800 МБ RAM.

Подробнее: [DEPLOYMENT.md](./DEPLOYMENT.md) (развёртывание), [INSTALL.md](./INSTALL.md)
(установка), [PERFORMANCE.md](./PERFORMANCE.md) (оптимизация), [AGENTS.md](./AGENTS.md)
(правила работы для агентов).

---

Made with ❤️ using Next.js and Tailwind CSS