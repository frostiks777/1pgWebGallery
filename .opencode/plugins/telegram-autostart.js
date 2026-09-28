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
// two levels up. `directory` (the project opencode was opened in) is the better
// signal when it agrees, and keeps this working if the plugin file is ever moved
// to the global plugin dir.
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

export const TelegramAutostartPlugin = async ({ client, directory, project }) => {
  const log = async (level, message) => {
    try {
      await client?.app?.log({ body: { service: "telegram-autostart", level, message } })
    } catch {
      // logging must never be the reason a session breaks
    }
  }

  const bridgeDir = findBridgeDir(directory)
  if (!bridgeDir) {
    await log("debug", "telegram-bot/ not found — plugin inactive")
    return {}
  }

  const envPath = join(bridgeDir, ".env")
  if (!existsSync(envPath)) {
    await log("debug", "telegram-bot/.env not found — plugin inactive")
    return {}
  }

  const bridgeEnv = parseEnvFile(envPath)
  const notificationsOn = (bridgeEnv.TELEGRAM_NOTIFY ?? "").toLowerCase() === "on"

  // Several agents can be in flight at once, so every message has to say which
  // one it came from — "Агент закончил" alone is useless when four of them land.
  const projectLabel = typeof project?.name === "string" ? project.name : undefined
  const dirLabel = directory ? basename(resolve(directory)) : undefined
  const agentLabel =
    dirLabel && dirLabel !== projectLabel
      ? [projectLabel, dirLabel].filter(Boolean).join(" · ")
      : (projectLabel ?? dirLabel)

  // ── 1. autostart the long-polling bridge ────────────────────────────────────
  if (bridgeEnv.TELEGRAM_BOT_TOKEN && bridgeEnv.TELEGRAM_ALLOWED_CHAT_ID) {
    const pidPath = join(bridgeDir, ".bot.pid")
    const lockPath = join(bridgeDir, ".bot.lock")

    const existing = readPid(pidPath)
    if (existing && (await isBotAlive(existing))) {
      await log("info", `bot already running (pid ${existing})`)
    } else if (!acquireLock(lockPath)) {
      // A peer session is starting the bot right now — leave it to them.
      await log("info", "another opencode session is starting the bot")
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
        await log("info", `started bot.mjs (pid ${child.pid})`)
      } catch (err) {
        await log("warn", `failed to start bot.mjs: ${err?.message}`)
      } finally {
        try {
          rmdirSync(lockPath)
        } catch {
          /* already gone, or a peer stole it as stale */
        }
      }
    }
  } else {
    await log("debug", "TELEGRAM_BOT_TOKEN / TELEGRAM_ALLOWED_CHAT_ID missing — bot not started")
  }

  // ── 2. session notifications ───────────────────────────────────────────────
  if (!notificationsOn) {
    await log("debug", "TELEGRAM_NOTIFY != on — session notifications off")
    return {}
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

  const describeError = (properties) => {
    const err = properties?.error
    const message = err?.data?.message ?? err?.message ?? err?.name
    if (typeof message !== "string") return "подробности не пришли"
    return message.length > 300 ? `${message.slice(0, 300)}…` : message
  }

  const context = () => {
    const stamp = new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })
    return agentLabel ? `${agentLabel} · ${stamp}` : stamp
  }

  return {
    event: async ({ event }) => {
      if (event.type === "session.idle") {
        notify("Агент закончил", context())
        return
      }
      if (event.type === "session.error") {
        notify("Ошибка сессии", `${describeError(event.properties)}\n\n${context()}`)
      }
    },
  }
}
