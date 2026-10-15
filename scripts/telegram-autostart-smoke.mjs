// Smoke test for .opencode/plugins/telegram-autostart.js.
//
// The plugin itself only does anything on a real machine with a real
// telegram-bot/.env, so this builds a throwaway fake bridge in a temp dir and
// drives the plugin with a fake v2 plugin context. It checks the three things
// that broke when the plugin was ported to the opencode 2 plugin API:
//
//   - setup() starts bot.mjs exactly once even when called twice (a second
//     poller on the same Telegram token makes the bot answer 409);
//   - v2 event names and the v2 payload shape are read correctly: completion
//     arrives as session.execution.succeeded, failures as
//     session.execution.failed with the message inside `data.error`;
//   - events belonging to another worktree are dropped, while our own session
//     and a session we cannot resolve are let through (fail-open).
//
// Run with plain node — no dependencies, no network:
//
//   node scripts/telegram-autostart-smoke.mjs

import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, dirname, resolve } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

const PLUGIN = resolve(dirname(fileURLToPath(import.meta.url)), "..", ".opencode", "plugins", "telegram-autostart.js")
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// ── a fake bridge that records what the plugin did ───────────────────────────

const root = mkdtempSync(join(tmpdir(), "telegram-autostart-smoke-"))
const bridge = join(root, "telegram-bot")
const log = join(root, "calls.log")
const record = (line) => writeFileSync(log, line, { flag: "a" })
process.on("exit", () => {
  try {
    rmSync(root, { recursive: true, force: true })
  } catch {}
})

mkdirSync(bridge, { recursive: true })
writeFileSync(log, "")
writeFileSync(
  join(bridge, ".env"),
  "TELEGRAM_BOT_TOKEN=smoke-token\nTELEGRAM_ALLOWED_CHAT_ID=1\nTELEGRAM_NOTIFY=on\n",
)
writeFileSync(
  join(bridge, "bot.mjs"),
  `import { appendFileSync } from "node:fs"\nappendFileSync(${JSON.stringify(log)}, "bot-started\\n")\nsetTimeout(() => process.exit(0), 250)\n`,
)
writeFileSync(
  join(bridge, "notify.mjs"),
  `import { appendFileSync } from "node:fs"\nappendFileSync(${JSON.stringify(log)}, "notify:" + process.argv[2] + "|" + process.argv[3] + "\\n")\n`,
)

// ── the fake plugin context ──────────────────────────────────────────────────

const queue = []
const OTHER_DIR = join(root, "other-worktree")

// Sessions the server knows about; anything missing from this map makes
// ctx.session.get() throw, which is how the fail-open path gets exercised.
const knownSessions = new Map([
  ["ses_own", { location: { directory: root } }],
  ["ses_peer_known", { location: { directory: OTHER_DIR } }],
  ["ses_peer_old", { location: { directory: OTHER_DIR } }],
])

const ctx = {
  location: { directory: root, project: { id: "p1", directory: root, canonical: root } },
  session: {
    get: async ({ sessionID }) => {
      const found = knownSessions.get(sessionID)
      if (!found) throw new Error(`session not found: ${sessionID}`)
      return found
    },
  },
  event: {
    subscribe: ({ signal } = {}) =>
      (async function* () {
        while (!signal?.aborted) {
          await sleep(30)
          while (queue.length) yield queue.shift()
        }
      })(),
  },
}

const push = (event) => queue.push({ id: `evt_${queue.length}`, created: 0, data: {}, ...event })

// ── scenario ─────────────────────────────────────────────────────────────────

const { default: plugin } = await import(pathToFileURL(PLUGIN).href)
const cleanup = await plugin.setup(ctx)
// A second setup() in the same process must not start a second bot.
await plugin.setup(ctx)

push({ type: "session.created", data: { sessionID: "ses_peer_known", location: { directory: OTHER_DIR } } })
push({ type: "session.created", data: { sessionID: "ses_own", location: { directory: root } } })
// Peer that announced itself: must stay silent.
push({ type: "session.execution.failed", data: { sessionID: "ses_peer_known", error: { type: "E", message: "peer known" } } })
// Peer that started before this plugin loaded: found only via ctx.session.get.
push({ type: "session.execution.failed", data: { sessionID: "ses_peer_old", error: { type: "E", message: "peer old" } } })
// Our own session finishes.
push({ type: "session.execution.succeeded", data: { sessionID: "ses_own" } })
// Esc pressed: silent.
push({ type: "session.execution.interrupted", data: { sessionID: "ses_own", reason: "user" } })
// Unknown session (lookup throws): fail open, and the text must come from data.error.
push({ type: "session.execution.failed", data: { sessionID: "ses_unknown", error: { type: "Late", message: "late join" } } })
// Unrelated traffic: silent.
push({ type: "session.message.updated", data: { sessionID: "ses_own" } })

await sleep(1500)
if (typeof cleanup === "function") cleanup()

// ── assertions ───────────────────────────────────────────────────────────────

const out = readFileSync(log, "utf8")
const count = (re) => (out.match(re) || []).length

const results = [
  ["bot.mjs started exactly once", count(/bot-started/g) === 1],
  ["own session completion notified", count(/notify:Агент закончил\|/g) === 1],
  ["fail-open on unresolvable session", out.includes("notify:Ошибка сессии|late join")],
  ["peer that announced itself blocked", !out.includes("peer known")],
  ["peer that predates this plugin blocked", !out.includes("peer old")],
  ["interrupted:user stays silent", count(/notify:/g) === 2 && count(/notify:Ошибка сессии\|/g) === 1],
]

console.log(`telegram-autostart smoke → ${root.replace(/.*\\/, "")}`)
for (const [name, ok] of results) console.log(`${ok ? "PASS" : "FAIL"}  ${name}`)

const failed = results.filter(([, ok]) => !ok)
if (failed.length) {
  console.log("\n--- recorded calls ---\n" + out.trim())
  process.exit(1)
}
process.exit(0)