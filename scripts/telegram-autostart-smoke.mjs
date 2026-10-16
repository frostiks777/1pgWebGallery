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

// The plugin reads these once at import time. Shortening them is the only way
// to exercise the TTL retry and the lookup timeout inside a run that lives
// ~3 seconds.
const TTL_MS = Number(process.env.PEER_VERDICT_TTL_MS ?? 300)
const LOOKUP_TIMEOUT_MS = Number(process.env.LOOKUP_TIMEOUT_MS ?? 300)
// Zero, so every notification is counted: with the production window the second
// message per title is swallowed, and "did the user-interrupt guard fire?" becomes
// unanswerable from the log.
const SPAM_WINDOW_MS = 0
process.env.PEER_VERDICT_TTL_MS = String(TTL_MS)
process.env.LOOKUP_TIMEOUT_MS = String(LOOKUP_TIMEOUT_MS)
process.env.SPAM_WINDOW_MS = String(SPAM_WINDOW_MS)

// ── a fake bridge that records what the plugin did ───────────────────────────

const root = mkdtempSync(join(tmpdir(), "telegram-autostart-smoke-"))
const bridge = join(root, "telegram-bot")
const log = join(root, "calls.log")
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
// The fake bot stays alive until the run tears the temp directory down. It must
// outlive the plugin's liveness probe (`tasklist` on Windows, `process.kill` on
// POSIX, which the second setup() call awaits), otherwise the probe sees a dead
// pid, the plugin spawns a second bot, and the "exactly once" assert turns into
// a race on how fast the probe finishes.
writeFileSync(
  join(bridge, "bot.mjs"),
  [
    'import { appendFileSync, existsSync } from "node:fs"',
    `appendFileSync(${JSON.stringify(log)}, "bot-started\\n")`,
    `const alive = setInterval(() => { if (!existsSync(${JSON.stringify(log)})) process.exit(0) }, 50)`,
    "alive.unref()",
    "setInterval(() => {}, 1 << 30)",
  ].join("\n"),
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
// `ses_hanging` never settles, which is the only way to reach the lookup
// timeout: a wedged request must not hold the stream forever.
const HANGING = Symbol("never settles")
const knownSessions = new Map([
  ["ses_own", { location: { directory: root } }],
  ["ses_peer_known", { location: { directory: OTHER_DIR } }],
  ["ses_peer_old", { location: { directory: OTHER_DIR } }],
  ["ses_hanging", HANGING],
])

// Counts every lookup the plugin performs, in total and per session. Bulk
// traffic below asserts the total does not grow: the guard must sit *below* the
// event-type dispatch, so an event the plugin does not act on can never block
// the sequential read of the stream. Without that ordering this counter jumps on
// every foreign event, and the stream can overflow on a real machine (docs:
// "volatile by contract: a slow consumer overflows and fails the stream").
let lookups = 0
const lookupsBySession = new Map()

const ctx = {
  location: { directory: root, project: { id: "p1", directory: root, canonical: root } },
  session: {
    get: async ({ sessionID }) => {
      lookups += 1
      lookupsBySession.set(sessionID, (lookupsBySession.get(sessionID) ?? 0) + 1)
      const found = knownSessions.get(sessionID)
      if (found === HANGING) return new Promise(() => {})
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
// A second setup() in the same process must not start a second bot. It gets its
// own empty event stream on purpose: two instances consuming one shared queue
// would split the scenario between them nondeterministically, and every count
// below would measure whichever instance happened to wake first.
const cleanupSecond = await plugin.setup({
  ...ctx,
  event: { subscribe: () => (async function* () {})() },
})

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

// What the run is waiting for before it may assert anything: one bot spawn and
// the two expected notifications.
const READY = /bot-started[\s\S]*notify:Ошибка сессии\|late join/
// The effects under test are detached `node notify.mjs` processes with no upper
// bound, and a cold Windows runner starts them far slower than a warm laptop —
// a fixed sleep passed locally and failed in review with 3 of 6 asserts down.
// Wait for the condition instead, the same reasoning as `expect.timeout: 15_000`
// in .agents/shared/checks.md.
const deadline = Date.now() + Number(process.env.SMOKE_TIMEOUT_MS ?? 30_000)
let out = ""
while (Date.now() < deadline) {
  out = readFileSync(log, "utf8")
  if (READY.test(out)) break
  await sleep(100)
}

// Three of the asserts below are about *absence* (no "peer known", no "peer old",
// exactly two notifications), so a single fixed tick would let a late extra
// notification slip past the assertion that claims to catch it. Wait for the log
// to stop changing instead: a real quiet window, bounded by the same deadline.
const QUIET_MS = 1_500
let quietSince = Date.now()
let seen = ""
while (Date.now() < deadline) {
  await sleep(100)
  const now = readFileSync(log, "utf8")
  if (now !== seen) {
    seen = now
    quietSince = Date.now()
  } else if (Date.now() - quietSince >= QUIET_MS) {
    break
  }
}

// Now the bulk traffic: events the plugin must drop without ever resolving a
// session. The counter is read before and after, so the assert fails if a lookup
// is reached from an event the plugin does not act on.
const lookupsBeforeBulk = lookups
for (let i = 0; i < 10; i++) {
  push({ type: "session.message.updated", data: { sessionID: `ses_never_seen_${i}` } })
  push({ type: "session.tool.progress", data: { sessionID: `ses_never_seen_${i}` } })
}
await sleep(600)
const lookupsAfterBulk = lookups

// A negative verdict (an unresolvable session) must be retried once the TTL has
// passed, otherwise one transient failed lookup mislabels that session for the
// rest of the plugin's life. The quiet window above already outlived the
// shortened TTL, so a single extra execution event has to cost exactly one more
// lookup. `ses_peer_old` is the control: a positive verdict never expires, so it
// must not be looked up again.
//
// The hanging session comes first on purpose: if the lookup bound were removed,
// the stream would stall on it forever, and nothing pushed after it would be
// processed — which is what `ses_after_hang` measures. Counting the lookup call
// itself would prove nothing, because the call happens either way.
push({ type: "session.execution.succeeded", data: { sessionID: "ses_hanging" } })
push({ type: "session.execution.succeeded", data: { sessionID: "ses_after_hang" } })
push({ type: "session.execution.succeeded", data: { sessionID: "ses_unknown" } })
push({ type: "session.execution.succeeded", data: { sessionID: "ses_peer_old" } })
await sleep(1_200)

const lookupsOf = (id) => lookupsBySession.get(id) ?? 0

if (typeof cleanup === "function") cleanup()
if (typeof cleanupSecond === "function") cleanupSecond()

out = readFileSync(log, "utf8")
const count = (re) => (out.match(re) || []).length

const results = [
  ["bot.mjs started exactly once", count(/bot-started/g) === 1],
  // Exact counts, not "at least one": with a zero spam window every notification
  // is recorded, so the label in the log is the only thing that cannot tell them
  // apart — and the counts can. Four "Агент закончил" are expected: our own
  // session, the hanging one, the one after it, and the TTL-retried unknown one.
  // Dropping the `reason !== "user"` guard makes five; muting our own session
  // makes three.
  ["own session completion notified", count(/notify:Агент закончил\|/g) === 4],
  ["fail-open on unresolvable session", out.includes("notify:Ошибка сессии|late join")],
  ["peer that announced itself blocked", !out.includes("peer known")],
  ["peer that predates this plugin blocked", !out.includes("peer old")],
  ["interrupted:user stays silent", count(/notify:Ошибка сессии\|/g) === 1],
  [
    "bulk traffic from unseen sessions never reaches a lookup",
    lookupsAfterBulk === lookupsBeforeBulk,
  ],
  [
    "a hanging lookup times out and the stream keeps flowing",
    lookupsOf("ses_hanging") === 1 && lookupsOf("ses_after_hang") === 1,
  ],
  [
    "negative verdict is re-resolved after the TTL",
    lookupsOf("ses_unknown") === 2,
  ],
  [
    "positive verdict (peer) is never re-resolved",
    lookupsOf("ses_peer_old") === 1,
  ],
]

console.log(`telegram-autostart smoke → ${root.replace(/.*\\/, "")}`)
console.log(
  `ctx.session.get: ${lookupsBeforeBulk} before bulk, ${lookupsAfterBulk} after | per session: ` +
    [...lookupsBySession].map(([id, n]) => `${id}=${n}`).join(", ") +
    ` (TTL ${TTL_MS}ms, lookup bound ${LOOKUP_TIMEOUT_MS}ms)`,
)
for (const [name, ok] of results) console.log(`${ok ? "PASS" : "FAIL"}  ${name}`)

const failed = results.filter(([, ok]) => !ok)
if (failed.length) {
  console.log("\n--- recorded calls ---\n" + out.trim())
  process.exit(1)
}
process.exit(0)