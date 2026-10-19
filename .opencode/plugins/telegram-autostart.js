// .opencode/plugins/telegram-autostart.js
//
// Project-level opencode plugin for the personal Telegram bridge in `telegram-bot/`.
// Two jobs, both entirely optional and both failing silently:
//
//   1. Make sure `node telegram-bot/bot.mjs` (long-polling getUpdates) is running,
//      so questions asked from the phone get answered. Started detached, guarded
//      by a pid file so N parallel opencode sessions don't start N bots.
//   2. Notify on a finished / failed session, rate-limited to one message per
//      session per event type per minute. The message is meant to be read on a
//      phone: it carries the task, the worktree and branch, the last commit,
//      the changed files, a quote of the agent's last answer, how long it ran
//      and what it cost — not just "the agent finished".
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

// ── notification formatting ──────────────────────────────────────────────────
// A phone screen is small and the user reads these in a hurry: every line
// carries a fact, emoji stand in for the label, and nothing is truncated
// silently — a cut-off line ends with "…".

const truncate = (text, max) => {
  const flat = String(text ?? "").replace(/\s+/g, " ").trim()
  if (!flat) return undefined
  return flat.length > max ? `${flat.slice(0, max - 1).trimEnd()}…` : flat
}

const formatDuration = (ms) => {
  if (!Number.isFinite(ms) || ms <= 0) return undefined
  const minutes = Math.round(ms / 60_000)
  if (minutes < 1) return `${Math.max(1, Math.round(ms / 1000))} с`
  if (minutes < 60) return `${minutes} мин`
  return `${Math.floor(minutes / 60)} ч ${String(minutes % 60).padStart(2, "0")} мин`
}

const formatTokens = (n) => {
  if (!Number.isFinite(n) || n <= 0) return undefined
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(Math.round(n))
}

const formatCost = (usd) => {
  if (!Number.isFinite(usd) || usd <= 0) return undefined
  return usd < 1 ? `$${usd.toFixed(3)}` : `$${usd.toFixed(2)}`
}

// Русские числительные: 1 вызов / 2 вызова / 5 вызовов.
const plural = (n, one, few, many) => {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few
  return many
}

// ── git snapshot of a worktree ───────────────────────────────────────────────

function execIn(file, args, cwd) {
  return new Promise((res) => {
    execFile(file, args, { cwd, windowsHide: true, timeout: 10_000 }, (err, stdout) =>
      res(err ? undefined : String(stdout)),
    )
  })
}

async function gitSummary(cwd) {
  const [branch, commit, status] = await Promise.all([
    execIn("git", ["rev-parse", "--abbrev-ref", "HEAD"], cwd),
    execIn("git", ["log", "-1", "--pretty=format:%h %s"], cwd),
    execIn("git", ["status", "--porcelain"], cwd),
  ])
  const files = String(status ?? "")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => line.slice(3).trim())
    .filter(Boolean)
  return { branch: branch?.trim(), commit: commit?.trim(), files }
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

    // The rate-limit key is the event type plus the session, NOT the message
    // title: titles now carry the task name, so keying on them would defeat
    // the anti-spam window. Per session, so two agents finishing side by side
    // both get reported, while one chatty session still cannot spam.
    const lastSent = new Map()

    const notify = (key, title, text) => {
      const now = Date.now()
      if (now - (lastSent.get(key) ?? 0) < SPAM_WINDOW_MS) return
      lastSent.set(key, now)
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

    // Everything below is best-effort: a session may belong to a worktree this
    // plugin instance cannot read, and a missing piece must never cost the user
    // the whole notification. Each part is collected on its own and skipped
    // when it is unavailable.
    const assistantDigest = async (sessionID) => {
      let messages
      try {
        messages = await ctx.session.context({ sessionID })
      } catch {
        return undefined
      }
      if (!Array.isArray(messages)) return undefined
      let tools = 0
      let snippet
      for (const message of messages) {
        if (message?.type !== "assistant") continue
        const parts = Array.isArray(message.content) ? message.content : []
        for (const part of parts) {
          if (part?.type === "tool") tools += 1
        }
        const text = parts
          .filter((part) => part?.type === "text" && typeof part.text === "string")
          .map((part) => part.text)
          .join(" ")
          .trim()
        if (text) snippet = text
      }
      return { snippet, tools }
    }

    // The body of the notification: what was being done, where, what changed
    // and what it cost. One line per fact, emoji instead of a label word.
    //
    // Several agents can be in flight at once, so every message has to say which
    // one it came from — "Агент закончил" alone is useless when four of them land.
    // The label is the session's own worktree folder; v2 dropped the project
    // name (`ctx.location.project` only carries { id, directory, canonical }).
    const describe = async (sessionID) => {
      let session
      try {
        session = await ctx.session.get({ sessionID })
      } catch {
        session = undefined
      }
      const dir = session?.location?.directory ?? directory
      const lines = []

      const task = truncate(session?.title, 150)
      if (task) lines.push(`🏷 **${task}**`)

      const git = await gitSummary(dir)
      const place = [`📂 ${basename(resolve(dir))}`]
      if (git.branch) place.push(`🌿 ${git.branch}`)
      if (git.commit) place.push(`🔀 ${git.commit}`)
      lines.push(place.join(" · "))

      if (git.files.length) {
        const shown = git.files.slice(0, 6).join(", ")
        const more = git.files.length > 6 ? ` и ещё ${git.files.length - 6}` : ""
        lines.push(`🧩 Изменено: ${git.files.length} ${plural(git.files.length, "файл", "файла", "файлов")} — ${shown}${more}`)
      }

      const digest = await assistantDigest(sessionID)
      const quote = truncate(digest?.snippet, 400)
      if (quote) lines.push(`📝 ${quote}`)

      const footer = []
      const created = session?.time?.created
      const updated = session?.time?.updated
      const duration = formatDuration(created && updated ? updated - created : undefined)
      if (duration) footer.push(`⏱ ${duration}`)
      if (session?.model?.providerID) footer.push(`🤖 ${session.model.providerID}/${session.model.id}`)
      const tokens = session?.tokens
      const total = tokens ? (tokens.input ?? 0) + (tokens.output ?? 0) + (tokens.reasoning ?? 0) : 0
      const tokenText = formatTokens(total)
      if (tokenText) footer.push(`🧠 ${tokenText} токенов`)
      const cost = formatCost(session?.cost)
      if (cost) footer.push(`💰 ${cost}`)
      if (digest?.tools) footer.push(`🛠 ${digest.tools} ${plural(digest.tools, "вызов", "вызова", "вызовов")}`)
      if (footer.length) lines.push(footer.join(" · "))

      return lines
    }

    const stamp = () => new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })

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
          const sessionID = event.data?.sessionID
          if (event.type === "session.execution.succeeded") {
            const lines = await describe(sessionID)
            notify(`done:${sessionID}`, "✅ Агент закончил", `${lines.join("\n")}\n🕒 ${stamp()}`)
            continue
          }
          if (event.type === "session.execution.interrupted") {
            // "user" means they pressed Esc and are already looking at the
            // keyboard; the rest (shutdown, superseded, inactivity) still
            // mean the agent stopped without finishing.
            if (event.data?.reason === "user") continue
            const lines = await describe(sessionID)
            notify(`done:${sessionID}`, "⏸ Агент остановлен", `${lines.join("\n")}\n🕒 ${stamp()}`)
            continue
          }
          if (event.type === "session.execution.failed") {
            const lines = await describe(sessionID)
            const body = [`🚨 ${describeError(event.data)}`, ...lines, `🕒 ${stamp()}`].join("\n")
            notify(`error:${sessionID}`, "❌ Ошибка сессии", body)
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