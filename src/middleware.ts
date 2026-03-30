import { NextRequest, NextResponse } from 'next/server';

// ─────────────────────────────────────────────────────────────────────────────
// In-memory rate limiter (resets on server restart).
// For multi-instance deployments, replace with Redis/Upstash.
// ─────────────────────────────────────────────────────────────────────────────

const rateMap = new Map<string, { count: number; ts: number }>();
const RATE_LIMIT  = parseInt(process.env.API_RATE_LIMIT  || '60',    10); // requests per window
const RATE_WINDOW = parseInt(process.env.API_RATE_WINDOW || '60000', 10); // ms (default: 1 min)

function checkRateLimit(ip: string): boolean {
  const now   = Date.now();
  const entry = rateMap.get(ip) ?? { count: 0, ts: now };
  if (now - entry.ts > RATE_WINDOW) {
    entry.count = 0;
    entry.ts    = now;
  }
  entry.count++;
  rateMap.set(ip, entry);
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
// Middleware entry point
// ─────────────────────────────────────────────────────────────────────────────

export function middleware(req: NextRequest) {
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() ?? 'unknown';

  if (!checkRateLimit(ip)) {
    return new NextResponse('Too Many Requests', {
      status: 429,
      headers: { 'Retry-After': '60' },
    });
  }

  if (!checkApiAuth(req)) {
    return new NextResponse('Unauthorized', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Bearer' },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
