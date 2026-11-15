import { test, expect } from '@playwright/test';
import type { NextRequest } from 'next/server';
import { createHash } from 'crypto';

/**
 * #151: when WEBDAV_LOGON_PASSWORD is set, the dir-meta routes and the batch
 * status endpoint must not be reachable without the gallery cookie. Anonymous
 * writes would let a visitor hide photos, change covers or clear panorama marks
 * in .data/dir-meta/ — user state, not cache.
 *
 * Direct route imports, like generate-auth.spec.ts: a real `NextRequest` would
 * drag `next/server` into Playwright's ESM loader. The mocks below provide only
 * the fields the auth check touches.
 */

const PASSWORD = 'secret';

function anonymous(url: string): NextRequest {
  return {
    nextUrl: new URL(url),
    cookies: { get: () => undefined },
  } as unknown as NextRequest;
}

function authorized(url: string): NextRequest {
  const salt = process.env.WEBDAV_URL ?? 'gallery-salt';
  const token = createHash('sha256').update(`${salt}:${PASSWORD}`).digest('hex');
  return {
    nextUrl: new URL(url),
    cookies: {
      get: (name: string) => (name === 'gallery-auth' ? { value: token } : undefined),
    },
  } as unknown as NextRequest;
}

let previousPassword: string | undefined;

test.beforeEach(() => {
  previousPassword = process.env.WEBDAV_LOGON_PASSWORD;
  process.env.WEBDAV_LOGON_PASSWORD = PASSWORD;
});

test.afterEach(() => {
  if (previousPassword === undefined) delete process.env.WEBDAV_LOGON_PASSWORD;
  else process.env.WEBDAV_LOGON_PASSWORD = previousPassword;
});

test.describe('dir-meta auth (#151)', () => {
  test('anonymous GETs degrade to an empty list', async () => {
    const { GET: covers } = await import('../../src/app/api/covers/route');
    const { GET: hidden } = await import('../../src/app/api/hidden/route');
    const { GET: panoramas } = await import('../../src/app/api/panoramas/route');

    for (const [name, handler] of [
      ['covers', covers],
      ['hidden', hidden],
      ['panoramas', panoramas],
    ] as const) {
      const response = await handler(anonymous(`http://localhost/api/${name}?dir=`));
      expect(response.status, name).toBe(200);
      expect(await response.json(), name).toEqual({ paths: [] });
    }
  });

  test('anonymous mutations are 401', async () => {
    const covers = await import('../../src/app/api/covers/route');
    const hidden = await import('../../src/app/api/hidden/route');
    const panoramas = await import('../../src/app/api/panoramas/route');

    const cases = [
      ['POST /api/covers', covers.POST],
      ['DELETE /api/covers', covers.DELETE],
      ['PATCH /api/covers', covers.PATCH],
      ['POST /api/hidden', hidden.POST],
      ['PATCH /api/hidden', hidden.PATCH],
      ['DELETE /api/hidden', hidden.DELETE],
      ['POST /api/panoramas', panoramas.POST],
      ['DELETE /api/panoramas', panoramas.DELETE],
    ] as const;

    for (const [name, handler] of cases) {
      const response = await handler(anonymous('http://localhost/api/x?dir='));
      expect(response.status, name).toBe(401);
    }
  });

  test('anonymous batch status is 401', async () => {
    const { GET } = await import('../../src/app/api/images/generate/route');
    const response = await GET(anonymous('http://localhost/api/images/generate'));
    expect(response.status).toBe(401);
    expect(response.headers.get('www-authenticate')).toBe('Bearer');
  });

  test('a valid cookie passes the guard', async () => {
    const { GET: covers } = await import('../../src/app/api/covers/route');
    const { GET: generate } = await import('../../src/app/api/images/generate/route');

    const coversResponse = await covers(authorized('http://localhost/api/covers?dir='));
    expect(coversResponse.status).toBe(200);
    const coversBody = await coversResponse.json();
    expect(Array.isArray(coversBody.paths)).toBe(true);

    const statusResponse = await generate(authorized('http://localhost/api/images/generate'));
    expect(statusResponse.status).toBe(200);
    const statusBody = await statusResponse.json();
    expect(typeof statusBody.running).toBe('boolean');
  });
});
