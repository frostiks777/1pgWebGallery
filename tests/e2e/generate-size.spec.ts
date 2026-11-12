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

  // The status endpoint reports which sizes the last run touched, so ops can
  // tell a thumbnail-only migration from a full pass without reading logs.
  const status = await (await request.get('/api/images/generate')).json();
  expect(status.sizes).toEqual(['thumbnail']);
});

test('a second POST reports the sizes of the running job', async ({ request }) => {
  await waitForIdle(request);
  // Unique directory: a reused path would hit the `.data` cache from previous
  // runs and finish before the second POST arrives, making the test flaky.
  const busyDir = `.e2e-generate-busy-${Date.now()}`;
  const busyPath = path.join(process.cwd(), 'public/demo-photos', busyDir);
  fs.mkdirSync(busyPath, { recursive: true });
  try {
    for (let i = 1; i <= 8; i++) {
      fs.copyFileSync(SOURCE, path.join(busyPath, `photo-${i}.jpg`));
    }
    const first = await request.post('/api/images/generate', {
      data: { path: busyDir, size: 'full' },
    });
    expect(first.ok()).toBeTruthy();
    expect((await first.json()).sizes).toEqual(['full']);

    const second = await request.post('/api/images/generate', { data: {} });
    const body = await second.json();
    expect(body.message).toBe('Generation already in progress');
    expect(body.sizes).toEqual(['full']);
  } finally {
    // The run walks this directory; deleting it first makes the job log
    // ENOENT per photo and finish in an error state.
    await waitForIdle(request);
    fs.rmSync(busyPath, { recursive: true, force: true });
  }
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
