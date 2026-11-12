import { test, expect } from '@playwright/test';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

/**
 * The local hash bump cannot invalidate the co-located WebP written next to
 * the source, so the preset migration needs a new directory name. The fixture
 * lives in a subdirectory: `getLocalDemoPhotos()` only scans top-level files,
 * so the gallery never requests it and this test does not race the grid.
 */

const FIXTURE_DIR = 'public/demo-photos/.e2e-cache';
const FIXTURE_NAME = '02_tropical_beach.jpg';
const PHOTO_PATH = `/demo-photos/.e2e-cache/${FIXTURE_NAME}`;
const SOURCE = path.join(process.cwd(), 'public/demo-photos', FIXTURE_NAME);
const FIXTURE = path.join(process.cwd(), FIXTURE_DIR, FIXTURE_NAME);
const CO_LOCATED = path.join(
  process.cwd(),
  FIXTURE_DIR,
  '.thumbs-v2',
  'thumbnail',
  '02_tropical_beach.webp',
);

test.beforeAll(() => {
  fs.mkdirSync(path.dirname(FIXTURE), { recursive: true });
  fs.copyFileSync(SOURCE, FIXTURE);
});

test.afterAll(() => {
  fs.rmSync(path.join(process.cwd(), FIXTURE_DIR), { recursive: true, force: true });
});

test('writes demo thumbnails to the .thumbs-v2 co-located cache', async ({ request }) => {
  // A local-cache HIT returns before the co-located write, so clear both
  // entries and force the MISS path this test is about.
  const hash = crypto.createHash('md5').update(`${PHOTO_PATH}-thumbnail-v3`).digest('hex');
  for (const ext of ['.webp', '.jpg']) {
    fs.rmSync(path.join(process.cwd(), '.data', `${hash}${ext}`), { force: true });
  }
  fs.rmSync(CO_LOCATED, { force: true });

  const response = await request.get(
    `/api/images?path=${encodeURIComponent(PHOTO_PATH)}&size=thumbnail`,
  );
  expect(response.ok()).toBeTruthy();

  // Demo-mode co-located write is synchronous (`writeLocalThumb`), so the
  // file exists by the time the response is read.
  expect(fs.existsSync(CO_LOCATED)).toBe(true);
});
