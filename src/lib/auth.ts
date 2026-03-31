import { createHash } from 'crypto';
import { NextRequest } from 'next/server';

const COOKIE_NAME = 'gallery-auth';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export function isAuthRequired(): boolean {
  return Boolean(process.env.WEBDAV_LOGON_PASSWORD);
}

function computeExpectedToken(): string {
  const password = process.env.WEBDAV_LOGON_PASSWORD ?? '';
  const salt = process.env.WEBDAV_URL ?? 'gallery-salt';
  return createHash('sha256').update(`${salt}:${password}`).digest('hex');
}

export function validateAuthCookie(req: NextRequest): boolean {
  if (!isAuthRequired()) return true;
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return false;
  const expected = computeExpectedToken();
  if (token.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < token.length; i++) {
    diff |= token.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}

export function checkPassword(password: string): boolean {
  const expected = process.env.WEBDAV_LOGON_PASSWORD;
  if (!expected) return true;
  if (password.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < password.length; i++) {
    diff |= password.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}

export function buildAuthCookie(): { name: string; value: string; options: Record<string, unknown> } {
  return {
    name: COOKIE_NAME,
    value: computeExpectedToken(),
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: COOKIE_MAX_AGE,
    },
  };
}
