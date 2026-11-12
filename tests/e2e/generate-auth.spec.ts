import { test, expect } from '@playwright/test';
import type { NextRequest } from 'next/server';

/**
 * #116 / #92: the batch generation endpoint is heavy work and must not be
 * reachable anonymously, and the rate-limit exemption must cover only the
 * thumbnail GETs the gallery actually needs in bulk.
 *
 * These tests call the route/proxy functions directly; a real `NextRequest`
 * would drag `next/server` into Playwright's ESM loader, which wants the
 * `.js` path. The minimal objects below provide exactly the fields the code
 * touches before the checks under test.
 */

test('POST /api/images/generate requires the gallery cookie when a password is set', async () => {
  const previous = process.env.WEBDAV_LOGON_PASSWORD;
  process.env.WEBDAV_LOGON_PASSWORD = 'secret';
  try {
    const { POST } = await import('../../src/app/api/images/generate/route');
    const request = {
      cookies: { get: () => undefined },
      json: async () => ({}),
      nextUrl: new URL('http://localhost/api/images/generate'),
    } as unknown as NextRequest;

    const response = await POST(request);

    expect(response.status).toBe(401);
    expect(response.headers.get('www-authenticate')).toBe('Bearer');
  } finally {
    if (previous === undefined) delete process.env.WEBDAV_LOGON_PASSWORD;
    else process.env.WEBDAV_LOGON_PASSWORD = previous;
  }
});

test('rate limit exempts GET /api/images but not POST /api/images/generate', async () => {
  const previousLimit = process.env.API_RATE_LIMIT;
  const previousWindow = process.env.API_RATE_WINDOW;
  process.env.API_RATE_LIMIT = '1';
  process.env.API_RATE_WINDOW = '60000';
  try {
    const { proxy } = await import('../../src/proxy');
    const ip = `e2e-${Date.now()}`;

    const getRequest = () =>
      ({
        nextUrl: new URL('http://localhost/api/images?path=x&size=thumbnail'),
        method: 'GET',
        headers: new Headers({ 'x-forwarded-for': ip }),
      }) as unknown as NextRequest;
    const postRequest = () =>
      ({
        nextUrl: new URL('http://localhost/api/images/generate'),
        method: 'POST',
        headers: new Headers({ 'x-forwarded-for': ip }),
      }) as unknown as NextRequest;

    // GET stays exempt even beyond the budget.
    expect(proxy(getRequest()).status).toBe(200);
    expect(proxy(getRequest()).status).toBe(200);

    // POST is not exempt: the first passes, the second exceeds the limit.
    expect(proxy(postRequest()).status).toBe(200);
    expect(proxy(postRequest()).status).toBe(429);
  } finally {
    if (previousLimit === undefined) delete process.env.API_RATE_LIMIT;
    else process.env.API_RATE_LIMIT = previousLimit;
    if (previousWindow === undefined) delete process.env.API_RATE_WINDOW;
    else process.env.API_RATE_WINDOW = previousWindow;
  }
});
