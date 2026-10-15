// .opencode/plugins/telegram-autostart.js
//
// Project-level opencode plugin for the personal Telegram bridge in `telegram-bot/`.
// Two jobs, both entirely optional and both failing silently:
//
//   1. Make sure `node telegram-bot/bot.mjs` (long-polling getUpdates) is running,
//      so questions asked from the phone get answered. Started detached, guarded
//      by a pid file so N parallel opencode sessions don't start N bots.
//   2. Notify on `session.execution.succeeded` / `session.execution.interrupted`
//      ("Агент закончил") and `session.execution.failed` ("Ошибка сессии"),
//      rate-limited to one message per event type per minute.
//
// Gating:
//   - No `telegram-bot/bot.mjs` or no `telegram-bot/.env`  → plugin does nothing.
//   - Bot autostart additionally needs TELEGRAM_BOT_TOKEN + TELEGRAM_ALLOWED_CHAT_ID
//     (bot.mjs exits 1 without them).
//   - Event notifications need `TELEGRAM_NOTIFY=on` in `telegram-bot/.env`;
//     default is manual `notify.mjs` / `reply.mjs` only.
//
// Sending reuses `node notify.mjs`, which already loads telegram-bot/.env,
// escapes for Telegram's HTML parse mode and exits 0 when unconfigured — so
// this file never touches the bot token itself.
//
// NOTE: children are spawned as bare `node` from PATH on purpose. `process.execPath`
// inside the opencode binary is opencode itself, not a Node runtime, so the
// bridge's .mjs scripts would never run under it.
//
// opencode v2 plugin API (v1 implementations do NOT load in v2):
//   - default-exports `{ id, setup(ctx) }`; v1's `async ({ client }) => ({ hooks })`
//     shape is rejected with "Missing key at [\"default\"]".
//   - `directory` / `project` → `ctx.location.directory` / `ctx.location.project`.
//   - v1's `client.app.log(...)` no longer exists on the context — log to console.
//   - v1's returned `event` hook → `ctx.event.subscribe({ signal })`, torn down by the
//     cleanup function returned from `setup`.
//   Docs: https://opencode.ai/v2/docs/build/plugins and .../plugins/migrate-v1.
//   Only the default export is provided: OpenCode 1 is no longer installed.

import { spawn, execFile } from "node:child_process"
import {
  existsSync,
  readFileSync,
  writeFileSync,
  unlinkSync,
  mkdirSync,
  statSync,
  rmdirSync,
} from "node:fs"
import { basename, dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const SPAM_WINDOW_MS = 60_000
// A lock directory older than this is assumed to belong to an instance that
// died mid-startup, and may be broken.
const STALE_LOCK_MS = 30_000
// How long to wait on a single `ctx.session.get` while deciding whether an
// event belongs to a peer worktree. Only the event types in HANDLED_EVENTS can
// reach this lookup, so it delays the sequential read of ctx.event.subscribe —
// never the Node event loop — and the bound keeps a wedged lookup from holding
// the stream for long enough to overflow it. Overridable only so
// scripts/telegram-autostart-smoke.mjs can shorten it and reach the timeout
// branch; the default is what production runs with.
const LOOKUP_TIMEOUT_MS = Number(process.env.LOOKUP_TIMEOUT_MS ?? 5_000)
// A `peer: true` verdict cannot go stale - a worktree does not move. A
// `peer: false` one can: the lookup may have failed or timed out while the
// server was busy at start-up, so it is retried at most once per this window.
// Overridable only so scripts/telegram-autostart-smoke.mjs can shorten it and
// actually exercise the retry; the default is what production runs with.
const PEER_VERDICT_TTL_MS = Number(process.env.PEER_VERDICT_TTL_MS ?? 60_000)
// The only event types this plugin acts on. Everything else on the stream is
// dropped without an await — see the note at the subscription below. This set
// is a hot-path optimisation, not the source of truth for what an event means:
// the branches below decide that, and an unexpected type added here must fall
// through rather than be reported as a failure.
const HANDLED_EVENTS = new Set([
  "session.execution.succeeded",
  "session.execution.interrupted",
  "session.execution.failed",
])

// ── locating the bridge ──────────────────────────────────────────────────────

function parseEnvFile(path) {
  const vars = {}
  let raw
  try {
    raw = readFileSync(path, "utf8")
  } catch {
    return vars
  }
  for (const line of raw.split("\n")) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const eq = trimmed.indexOf("=")
    if (eq === -1) continue
    vars[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim()
  }
  return vars
}

// The plugin normally sits in <project>/.opencode/plugins/, so the bridge is
// two levels up. `directory` (the location this plugin instance loaded for) is
// the better signal when it agrees, and keeps this working if the plugin file is
// ever moved to the global plugin dir.
function findBridgeDir(directory) {
  const fromContext = directory ? resolve(directory) : null
  const fromFile = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..")
  for (const base of [fromContext, fromFile]) {
    if (!base) continue
    const dir = join(base, "telegram-bot")
    if (existsSync(join(dir, "bot.mjs"))) return dir
  }
  return null
}

// ── process liveness ─────────────────────────────────────────────────────────

function capture(file, args) {
  return new Promise((res) => {
    execFile(file, args, { windowsHide: true, timeout: 10_000 }, (err, stdout) =>
      res(err ? "" : String(stdout)),
    )
  })
}

// A bare `process.kill(pid, 0)` can't tell "our bot" from "some other process
// that inherited this pid after a reboot", and PID reuse on Windows is quick.
// Require the image name to still be node.exe there.
async function isBotAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false
  if (process.platform === "win32") {
    // `tasklist /NH /FO CSV` lines look like: "node.exe","4880","Console","1","544 432 K"
    // — image name FIRST, pid second. A missing pid yields a bare
    // `INFO: No tasks are running…` line, which the regex below never matches.
    const out = await capture("tasklist", ["/FI", `PID eq ${pid}`, "/NH", "/FO", "CSV"])
    for (const line of out.replace(/^﻿/, "").split(/\r?\n/)) {
      const m = line.match(/^"([^"]*)","(\d+)"/)
      if (m && Number(m[2]) === pid && m[1].toLowerCase() === "node.exe") return true
    }
    return false
  }
  try {
    process.kill(pid, 0)
    return true
  } catch (err) {
    // EPERM = exists, just not ours to signal.
    return err?.code === "EPERM"
  }
}

function readPid(pidPath) {
  try {
    const n = parseInt(readFileSync(pidPath, "utf8").trim(), 10)
    return Number.isInteger(n) ? n : null
  } catch {
    return null
  }
}

function runDetached(file, args, cwd) {
  const child = spawn(file, args, { cwd, detached: true, stdio: "ignore", windowsHide: true })
  child.unref()
  return child
}

// The maintainer runs several opencode sessions at once, and every one of them
// loads this plugin. Two of them starting up together must still yield exactly
// ONE bot: a second poller on the same token makes Telegram answer 409 Conflict
// and splits the update stream between the two. `mkdir` is the only atomic
// create-if-absent available on every platform here, so the pid file alone
// (check-then-write) is not enough — it has a window where both instances see
// "no live bot" and both spawn.
function acquireLock(lockPath) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      mkdirSync(lockPath) // throws EEXIST if a peer holds it
      return true
    } catch (err) {
      if (err?.code !== "EEXIST") return false
      let stale = false
      try {
        stale = Date.now() - statSync(lockPath).mtimeMs > STALE_LOCK_MS
      } catch {
        stale = false
      }
      if (!stale) return false
      try {
        rmdirSync(lockPath) // only ever empty — the holder writes its pid to a file
      } catch {
        return false
      }
    }
  }
  return false
}

// ── the plugin ───────────────────────────────────────────────────────────────

const TelegramAutostartPlugin = {
  id: "telegram-autostart",

  async setup(ctx) {
    const log = (level, message) => {
      try {
        const line = `[telegram-autostart] ${message}`
        if (level === "warn" || level === "error") console.error(line)
        else console.log(line)
      } catch {
        // logging must never be the reason a session breaks
      }
    }

    const { directory } = ctx.location ?? {}
    const bridgeDir = findBridgeDir(directory)
    if (!bridgeDir) {
      log("debug", "telegram-bot/ not found — plugin inactive")
      return
    }

    const envPath = join(bridgeDir, ".env")
    if (!existsSync(envPath)) {
      log("debug", "telegram-bot/.env not found — plugin inactive")
      return
    }

    const bridgeEnv = parseEnvFile(envPath)
    const notificationsOn = (bridgeEnv.TELEGRAM_NOTIFY ?? "").toLowerCase() === "on"

    // Several agents can be in flight at once, so every message has to say which
    // one it came from — "Агент закончил" alone is useless when four of them land.
    // v2 dropped the project name: `ctx.location.project` only carries
    // { id, directory, canonical } (Location.Info), so the location's own folder
    // name — the worktree name — is the label.
    const agentLabel = directory ? basename(resolve(directory)) : undefined

    // ── 1. autostart the long-polling bridge ──────────────────────────────────
    if (bridgeEnv.TELEGRAM_BOT_TOKEN && bridgeEnv.TELEGRAM_ALLOWED_CHAT_ID) {
      const pidPath = join(bridgeDir, ".bot.pid")
      const lockPath = join(bridgeDir, ".bot.lock")

      const existing = readPid(pidPath)
      if (existing && (await isBotAlive(existing))) {
        log("info", `bot already running (pid ${existing})`)
      } else if (!acquireLock(lockPath)) {
        // A peer session is starting the bot right now — leave it to them.
        log("info", "another opencode session is starting the bot")
      } else {
        try {
          if (existing) {
            try {
              unlinkSync(pidPath)
            } catch {
              /* stale pid file we couldn't remove — the new pid overwrites it anyway */
            }
          }
          const child = runDetached("node", [join(bridgeDir, "bot.mjs")], bridgeDir)
          child.on("error", (err) => log("warn", `failed to spawn bot.mjs: ${err?.message}`))
          if (child.pid) writeFileSync(pidPath, String(child.pid))
          log("info", `started bot.mjs (pid ${child.pid})`)
        } catch (err) {
          log("warn", `failed to start bot.mjs: ${err?.message}`)
        } finally {
          try {
            rmdirSync(lockPath)
          } catch {
            /* already gone, or a peer stole it as stale */
          }
        }
      }
    } else {
      log("debug", "TELEGRAM_BOT_TOKEN / TELEGRAM_ALLOWED_CHAT_ID missing — bot not started")
    }

    // ── 2. session notifications ──────────────────────────────────────────────
    if (!notificationsOn) {
      log("debug", "TELEGRAM_NOTIFY != on — session notifications off")
      return
    }

    const lastSent = new Map()

    const notify = (title, text) => {
      const now = Date.now()
      if (now - (lastSent.get(title) ?? 0) < SPAM_WINDOW_MS) return
      lastSent.set(title, now)
      try {
        const child = runDetached("node", [join(bridgeDir, "notify.mjs"), title, text], bridgeDir)
        child.on("error", (err) => log("warn", `notify.mjs failed: ${err?.message}`))
      } catch (err) {
        log("warn", `notify.mjs threw: ${err?.message}`)
      }
    }

    //   v2 events carry `{ id, type, created, data, location?, metadata? }` — the
//   payload is `data`, not v1's `properties` (packages/schema/src/event.ts).
//   v1's `session.error` does not exist; failures arrive as
//   `session.execution.failed` with `data.error: SessionError.Error`
//   ({ type, message, status?, response? }). `session.idle` survives but is
//   marked `// deprecated` in session-status-event.ts, so completion is taken
//   from the durable `session.execution.succeeded`.
    const describeError = (data) => {
      const err = data?.error
      const message = err?.message ?? err?.type
      if (typeof message !== "string") return "подробности не пришли"
      return message.length > 300 ? `${message.slice(0, 300)}…` : message
    }

    const context = () => {
      const stamp = new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })
      return agentLabel ? `${agentLabel} · ${stamp}` : stamp
    }

    // The subscription is the whole server stream, not just this location, and
    // several worktrees of this project run side by side. A peer finishing must
    // not arrive labelled with this worktree's name.
    //
    // `session.execution.*` carries only `{ sessionID }` — no location at all —
    // so the directory has to come from somewhere else:
    //   - `session.created` does put `location` in its payload, but only for
    //     sessions born while this plugin is already subscribed. A peer session
    //     that started earlier never announces itself to us, and long-running
    //     sessions are the normal case here, so this alone is not enough.
    //   - `ctx.session.get({ sessionID })` answers for any live session
    //     (Session.Info.location.directory), so an unknown id is looked up once
    //     and the verdict cached.
    // Verified on v2.0.29: a session created here reports the worktree
    // directory, the same value as ctx.location.directory — not the project's
    // canonical root. The first resolve of each session is logged, so a future
    // change of that shape shows up as a log line instead of silent silence.
    //
    // Still unknown after that — session deleted, lookup failed or timed out —
    // and the event is let through, because a failed lookup must never silence
    // notifications about finished agents. That "let through" is not permanent:
    // negative verdicts expire, see PEER_VERDICT_TTL_MS.
    const normalizeDir = (value) => {
      if (typeof value !== "string" || !value) return null
      return resolve(value).replace(/\\/g, "/").toLowerCase()
    }
    // Only this plugin's own location. ctx.location.project.canonical must NOT
    // be added here: it points at the project's main checkout, which is exactly
    // one of the peers we want to filter out.
    const ownDirectory = normalizeDir(directory)
    const peerSessions = new Map() // sessionID -> { peer: boolean, at: number }

    const lookupSessionDir = async (sessionID) => {
      let timer
      try {
        const session = await Promise.race([
          ctx.session.get({ sessionID }),
          new Promise((res) => {
            timer = setTimeout(() => res(null), LOOKUP_TIMEOUT_MS)
          }),
        ])
        return normalizeDir(session?.location?.directory)
      } catch {
        return null
      } finally {
        clearTimeout(timer)
      }
    }

    const remember = (sessionID, peer) => {
      if (typeof sessionID === "string") peerSessions.set(sessionID, { peer, at: Date.now() })
      return peer
    }

    const isPeerSession = async (sessionID) => {
      if (!ownDirectory || typeof sessionID !== "string") return false
      const cached = peerSessions.get(sessionID)
      if (cached && (cached.peer || Date.now() - cached.at < PEER_VERDICT_TTL_MS)) return cached.peer
      const where = await lookupSessionDir(sessionID)
      const peer = where !== null && where !== ownDirectory
      remember(sessionID, peer)
      if (cached === undefined) {
        // Logged once per session: if the location shape ever changes, this is
        // where it becomes visible instead of looking like silent silence. An
        // unresolved lookup must say so — claiming "this worktree" here would
        // repeat the very silence this line exists to expose.
        const verdict =
          where === null ? "treated as this worktree (fail-open)" : peer ? "peer worktree" : "this worktree"
        log("info", `session ${sessionID}: ${where ?? "unresolved"} → ${verdict}`)
      }
      return peer
    }

    const controller = new AbortController()
    void (async () => {
      try {
        for await (const event of ctx.event.subscribe({ signal: controller.signal })) {
          if (event.type === "session.created") {
            const where = normalizeDir(event.data?.location?.directory ?? event.location?.directory)
            if (where) remember(event.data?.sessionID, where !== ownDirectory)
            continue
          }
          // Hot path: the stream is volatile by contract ("a slow consumer
          // overflows and fails the stream"), so every event this plugin does
          // not act on returns without ever awaiting a lookup.
          if (!HANDLED_EVENTS.has(event.type)) continue
          if (await isPeerSession(event.data?.sessionID)) continue
          if (event.type === "session.execution.succeeded") {
            notify("Агент закончил", context())
            continue
          }
          if (event.type === "session.execution.interrupted") {
            // "user" means they pressed Esc and are already looking at the
            // keyboard; the rest (shutdown, superseded, inactivity) still
            // mean the agent stopped without finishing.
            if (event.data?.reason !== "user") notify("Агент закончил", context())
            continue
          }
          if (event.type === "session.execution.failed") {
            notify("Ошибка сессии", `${describeError(event.data)}\n\n${context()}`)
          }
        }
      } catch (err) {
        // Durable events do not keep the subscription alive: if the stream drops,
        // notifications go quiet for good, so say so plainly instead of logging
        // something that reads like "plugin inactive".
        if (!controller.signal.aborted) {
          log("warn", `event stream ended (${err?.message}) — notifications stay off until this plugin reloads`)
        }
      }
    })()

    return () => controller.abort()
  },
}

export default TelegramAutostartPlugin