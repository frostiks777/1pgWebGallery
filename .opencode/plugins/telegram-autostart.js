// .opencode/plugins/telegram-autostart.js
//
// Project-level opencode plugin for the personal Telegram bridge in `telegram-bot/`.
// Two jobs, both entirely optional and both failing silently:
//
//   1. Make sure `node telegram-bot/bot.mjs` (long-polling getUpdates) is running,
//      so questions asked from the phone get answered. Started detached, guarded
//      by a pid file so N parallel opencode sessions don't start N bots.
//   2. Notify on `session.idle` ("Агент закончил") and `session.error` ("Ошибка
//      сессии"), rate-limited to one message per event type per minute.
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
    // so the directory has to be learned from `session.created`, whose payload
    // does carry `location` (session-event.ts, `Created`). Sessions we have
    // never seen are let through on purpose: this plugin can finish loading
    // after its own session was created, and going silent about finished agents
    // is a worse failure than an occasionally mislabelled message.
    const normalizeDir = (value) => {
      if (typeof value !== "string" || !value) return null
      return resolve(value).replace(/\\/g, "/").toLowerCase()
    }
    const ownDirectory = normalizeDir(directory)
    const peerSessions = new Set()
    const isPeer = (event) => {
      if (!ownDirectory) return false
      const id = event.data?.sessionID
      return typeof id === "string" && peerSessions.has(id)
    }

    const controller = new AbortController()
    void (async () => {
      try {
        for await (const event of ctx.event.subscribe({ signal: controller.signal })) {
          if (event.type === "session.created") {
            const where = normalizeDir(event.data?.location?.directory ?? event.location?.directory)
            if (where && where !== ownDirectory) peerSessions.add(event.data?.sessionID)
            continue
          }
          if (isPeer(event)) continue
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
        // The Execution.* events this plugin acts on are durable, so a dropped
        // stream is not expected; keep this off console.error to avoid noise in
        // the TUI and just note it once.
        if (!controller.signal.aborted) log("debug", `event stream ended: ${err?.message}`)
      }
    })()

    return () => controller.abort()
  },
}

export default TelegramAutostartPlugin