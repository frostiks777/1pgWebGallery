import { NextRequest, NextResponse } from 'next/server';

// ─────────────────────────────────────────────────────────────────────────────
// In-memory rate limiter (resets on server restart).
// For multi-instance deployments, replace with Redis/Upstash.
// ─────────────────────────────────────────────────────────────────────────────

const rateMap = new Map<string, { count: number; ts: number }>();
const RATE_LIMIT  = parseInt(process.env.API_RATE_LIMIT  || '3000',  10); // requests per window
const RATE_WINDOW = parseInt(process.env.API_RATE_WINDOW || '60000', 10); // ms (default: 1 min)

// How many IPs we keep before sweeping the entries whose window has rolled
// over. Without it the map grows by one entry per new IP for as long as the
// process lives — a slow leak on a ~800 MB box that is never restarted.
const RATE_MAP_MAX = parseInt(process.env.API_RATE_MAP_MAX || '10000', 10);

/**
 * Drop only entries that are already past their window.
 *
 * Deliberately NOT a blanket "clear everything" on a timer: resetting live
 * counters hands an abuser a fresh quota every sweep. Entries inside their
 * window are the whole point of the limiter and must survive.
 */
function sweepExpired(now: number): void {
  if (rateMap.size <= RATE_MAP_MAX) return;
  const cutoff = now - RATE_WINDOW;
  for (const [ip, entry] of rateMap) {
    if (entry.ts < cutoff) rateMap.delete(ip);
  }
}

function checkRateLimit(ip: string): boolean {
  const now   = Date.now();
  const entry = rateMap.get(ip) ?? { count: 0, ts: now };
  if (now - entry.ts > RATE_WINDOW) {
    entry.count = 0;
    entry.ts    = now;
  }
  entry.count++;
  rateMap.set(ip, entry);
  // Sweep after the write: the current IP's entry was just refreshed, so it is
  // never the one deleted.
  sweepExpired(now);
  return entry.count <= RATE_LIMIT;
}

// ─────────────────────────────────────────────────────────────────────────────
// Optional Bearer-token authentication.
// Set API_SECRET_TOKEN in .env to enable. Leave unset to keep the API open
// (suitable for fully private / intranet deployments protected at network level).
// ─────────────────────────────────────────────────────────────────────────────

function checkApiAuth(req: NextRequest): boolean {
  const apiToken = process.env.API_SECRET_TOKEN;
  if (!apiToken) return true; // auth disabled when no token is configured

  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return false;

  const provided = authHeader.slice(7);
  // Constant-time comparison to prevent timing-based token enumeration
  if (provided.length !== apiToken.length) return false;
  let diff = 0;
  for (let i = 0; i < provided.length; i++) {
    diff |= provided.charCodeAt(i) ^ apiToken.charCodeAt(i);
  }
  return diff === 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// Proxy entry point (Next.js 16 — replaces middleware.ts)
// ─────────────────────────────────────────────────────────────────────────────

export function proxy(req: NextRequest) {
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() ?? 'unknown';

  // Exempt on purpose: one gallery page pulls dozens of thumbnails through this
  // route, so a per-IP budget trips on ordinary browsing — the "Too Many
  // Requests" failure 24be971 fixed (same commit raised the default 300 -> 3000).
  // Note the prefix match also covers `POST /api/images/generate`; the auth check
  // below still runs for every path. Whether that coverage is wanted is an open
  // question — evidence in `MEMORY.md`, «Открытые вопросы».
  const isImageRequest = req.nextUrl.pathname.startsWith('/api/images');

  if (!isImageRequest && !checkRateLimit(ip)) {
    return NextResponse.json(
      { error: 'Too Many Requests' },
      { status: 429, headers: { 'Retry-After': '60' } },
    );
  }

  if (!checkApiAuth(req)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401, headers: { 'WWW-Authenticate': 'Bearer' } },
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
