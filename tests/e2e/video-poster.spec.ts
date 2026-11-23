import { test, expect } from '@playwright/test';

/**
 * #180: a video larger than VIDEO_PREVIEW_MAX_MB has no poster, and the server
 * answers /api/images with 413. The client used to request one anyway, burn its
 * retry budget and leave the card on the generic "failed" cross — so a folder
 * of phone videos looked like a folder of broken photos.
 *
 * The listing now carries `posterUnavailable`, and the card must not request a
 * poster at all. The fixture is a synthetic listing: the demo set has no video
 * large enough to trip the limit (#102 tracks adding one).
 */

const LARGE_VIDEO = {
  name: 'C1122.MP4',
  path: '/demo-photos/C1122.MP4',
  size: 100 * 1024 * 1024,
  lastModified: '2026-11-01T00:00:00.000Z',
  mimeType: 'video/mp4',
  videoPath: '/demo-photos/C1122.MP4',
  posterUnavailable: true,
};

const NORMAL_PHOTO = {
  name: '01_mountain_sunset.jpg',
  path: '/demo-photos/01_mountain_sunset.jpg',
  size: 138561,
  lastModified: '2026-11-01T00:00:00.000Z',
  mimeType: 'image/jpeg',
};

test.describe('video poster overflow (#180)', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/folders**', (route) =>
      route.fulfill({ json: { success: true, folders: [] } }),
    );
    await page.route('**/api/photos**', (route) =>
      route.fulfill({ json: { success: true, mode: 'demo', photos: [LARGE_VIDEO, NORMAL_PHOTO] } }),
    );
  });

  test('a too-large video shows a placeholder instead of requesting a poster', async ({ page }) => {
    const imageRequests: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('/api/images')) imageRequests.push(request.url());
    });

    await page.goto('/');

    const videoCard = page.locator('.obs-photo-card').filter({ hasText: 'C1122.MP4' }).first();
    await expect(videoCard).toBeVisible();
    // No <img>: the request could only end in 413.
    await expect(videoCard.locator('img')).toHaveCount(0);
    await expect(page.getByText('Failed to load')).toHaveCount(0);
    expect(imageRequests.filter((url) => url.includes('C1122.MP4'))).toEqual([]);

    // The ordinary photo still loads its thumbnail.
    const photoCard = page.locator('.obs-photo-card').filter({ hasText: '01_mountain_sunset.jpg' }).first();
    await expect(photoCard.locator('img')).toHaveCount(1);
  });

  test('opening the placeholder plays the video, not a poster', async ({ page }) => {
    await page.goto('/');

    const card = page.locator('.obs-photo-card').filter({ hasText: 'C1122.MP4' }).first();
    await expect(card).toBeVisible();
    await card.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('video')).toHaveCount(1);
    await expect(dialog.locator('img[src*="size=medium"]')).toHaveCount(0);
  });
});
