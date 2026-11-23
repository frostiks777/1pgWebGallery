import { test, expect } from '@playwright/test';

/**
 * #184: a video above VIDEO_PREVIEW_MAX_MB is never rasterised on request. The
 * route answers with a small Play placeholder (200) instead of 413, because an
 * <img> cannot read a status: the old 413 made the card burn its retries and
 * end on the "failed" cross, which reads as a broken photo.
 *
 * The fixture replaces the server: the demo set has no video that large (#102).
 */

const PLACEHOLDER_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=',
  'base64',
);

const LARGE_VIDEO = {
  name: 'C1122.MP4',
  path: '/demo-photos/C1122.MP4',
  size: 100 * 1024 * 1024,
  lastModified: '2026-11-01T00:00:00.000Z',
  mimeType: 'video/mp4',
  videoPath: '/demo-photos/C1122.MP4',
};

test.describe('video poster placeholder (#184)', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/folders**', (route) =>
      route.fulfill({ json: { success: true, folders: [] } }),
    );
    await page.route('**/api/photos**', (route) =>
      route.fulfill({ json: { success: true, mode: 'demo', photos: [LARGE_VIDEO] } }),
    );
    // Stand-in for the server placeholder: any size, always an image.
    await page.route('**/api/images**', (route) =>
      route.fulfill({ status: 200, contentType: 'image/png', body: PLACEHOLDER_PNG }),
    );
  });

  test('a placeholder keeps the card alive instead of a failed load', async ({ page }) => {
    const posterRequests: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('/api/images')) posterRequests.push(request.url());
    });

    await page.goto('/');

    const card = page.locator('.obs-photo-card').filter({ hasText: 'C1122.MP4' }).first();
    await expect(card).toBeVisible();
    await expect(card.locator('img')).toHaveCount(1);
    await expect(page.getByText('Failed to load')).toHaveCount(0);
    // The card does ask for a poster: that request is what lets a batch-generated
    // poster appear later without any client change.
    expect(posterRequests.some((url) => url.includes('C1122.MP4'))).toBe(true);
  });

  test('clicking the card still opens the video', async ({ page }) => {
    await page.goto('/');

    const card = page.locator('.obs-photo-card').filter({ hasText: 'C1122.MP4' }).first();
    await expect(card).toBeVisible();
    await card.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('video')).toHaveCount(1);
  });
});
