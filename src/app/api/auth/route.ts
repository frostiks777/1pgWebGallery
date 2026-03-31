import { NextRequest, NextResponse } from 'next/server';
import { isAuthRequired, validateAuthCookie, checkPassword, buildAuthCookie } from '@/lib/auth';

function getClientInfo(req: NextRequest): { ip: string; ua: string } {
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() ?? req.headers.get('x-real-ip') ?? 'unknown';
  const ua = req.headers.get('user-agent') ?? 'unknown';
  return { ip, ua };
}

export async function GET(req: NextRequest) {
  if (!isAuthRequired()) {
    return NextResponse.json({ authenticated: true, required: false });
  }
  const authenticated = validateAuthCookie(req);
  return NextResponse.json({ authenticated, required: true });
}

export async function POST(req: NextRequest) {
  const { ip, ua } = getClientInfo(req);
  const timestamp = new Date().toISOString();

  if (!isAuthRequired()) {
    return NextResponse.json({ success: true });
  }

  let body: { password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 });
  }

  const password = body.password ?? '';
  const ok = checkPassword(password);

  if (ok) {
    console.info(`[AUTH SUCCESS] IP: ${ip} | UA: ${ua} | ${timestamp}`);
    const cookie = buildAuthCookie();
    const res = NextResponse.json({ success: true });
    res.cookies.set(cookie.name, cookie.value, cookie.options as Parameters<typeof res.cookies.set>[2]);
    return res;
  } else {
    console.warn(`[AUTH FAILURE] IP: ${ip} | UA: ${ua} | ${timestamp}`);
    return NextResponse.json({ success: false, error: 'Invalid password' }, { status: 401 });
  }
}
