import { test, expect } from '@playwright/test';

/**
 * #166: /api/health is a public liveness probe. In demo mode there is no
 * WebDAV to check, and the response must stay small: the endpoint is reachable
 * without a token, so it must not leak the WebDAV URL or credentials.
 */

test.describe('/api/health (#166)', () => {
  test('demo mode reports ok without WebDAV', async ({ request }) => {
    const response = await request.get('/api/health');

    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual({
      status: 'ok',
      webdav: 'not_configured',
    });
  });

  test('is never cached and exposes no connection details', async ({ request }) => {
    const response = await request.get('/api/health');
    const body = (await response.text()).toLowerCase();

    expect(response.headers()['cache-control']).toContain('no-store');
    expect(body).not.toContain('http');
    for (const field of ['url', 'username', 'password', 'logon']) {
      expect(body).not.toContain(field);
    }
  });
});
