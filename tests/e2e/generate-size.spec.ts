import { test, expect, type APIRequestContext } from '@playwright/test';
import fs from 'fs';
import path from 'path';

/**
 * `POST /api/images/generate` used to ignore the requested size and always
 * produce thumbnail + medium + full. The A0.6 migration only needs thumbnails,
 * so the endpoint accepts an optional `size` and reports the matching total.
 *
 * The fixture is a one-photo subdirectory: `getLocalDemoPhotos()` only scans
 * top-level files, so the gallery never sees it and the test does not race the
 * grid. The assertions include `done`, not just `total`: a loop that ignored
 * `sizes` would still report the requested total but finish 3x the work.
 */

const FIXTURE_DIR = '.e2e-generate';
const FIXTURE_PATH = path.join(process.cwd(), 'public/demo-photos', FIXTURE_DIR);
const SOURCE = path.join(process.cwd(), 'public/demo-photos', '01_mountain_sunset.jpg');

test.describe.configure({ mode: 'serial' });

test.beforeAll(() => {
  fs.rmSync(FIXTURE_PATH, { recursive: true, force: true });
  fs.mkdirSync(FIXTURE_PATH, { recursive: true });
  fs.copyFileSync(SOURCE, path.join(FIXTURE_PATH, '01_mountain_sunset.jpg'));
});

test.afterAll(() => {
  fs.rmSync(FIXTURE_PATH, { recursive: true, force: true });
});

async function waitForIdle(request: APIRequestContext) {
  await expect
    .poll(
      async () => {
        const status = await (await request.get('/api/images/generate')).json();
        return status.running;
      },
      { timeout: 60_000 },
    )
    .toBe(false);
}

async function statusSnapshot(request: APIRequestContext) {
  const status = await (await request.get('/api/images/generate')).json();
  return { total: status.total, done: status.done, running: status.running };
}

test('batch generation can be limited to one size', async ({ request }) => {
  await waitForIdle(request);
  const post = await request.post('/api/images/generate', {
    data: { path: FIXTURE_DIR, size: 'thumbnail' },
  });
  expect(post.ok()).toBeTruthy();

  await expect
    .poll(() => statusSnapshot(request), { timeout: 30_000 })
    .toEqual({ total: 1, done: 1, running: false });
});

test('batch generation defaults to all sizes', async ({ request }) => {
  await waitForIdle(request);
  const post = await request.post('/api/images/generate', {
    data: { path: FIXTURE_DIR },
  });
  expect(post.ok()).toBeTruthy();

  await expect
    .poll(() => statusSnapshot(request), { timeout: 60_000 })
    .toEqual({ total: 3, done: 3, running: false });
});

test('batch generation rejects an invalid size', async ({ request }) => {
  const response = await request.post('/api/images/generate', { data: { size: 'bogus' } });
  expect(response.status()).toBe(400);
});
