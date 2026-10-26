import { test, expect } from '@playwright/test';

/**
 * Retry behaviour for thumbnails (issue #98).
 *
 * The server answers `503 + Retry-After: 5` while the single ffmpeg slot is
 * busy, and the client used to treat that like a permanent failure — the card
 * stayed on «Failed to load» until a page reload. A `503` cannot be produced
 * from the demo photos on purpose, so the response is intercepted here.
 *
 * The automatic retry waits 5 s (the server's own Retry-After), which is why
 * these assertions allow longer than the default 5 s expect timeout.
 */

const FIRST_DEMO_PHOTO = '01_mountain_sunset.jpg';

test.describe('image retry', () => {
  test('card re-requests a 503 thumbnail and shows the photo', async ({ page }) => {
    const hits: string[] = [];
    let failedOnce = false;

    await page.route('**/api/images**', async (route) => {
      const url = new URL(route.request().url());
      const isTarget = url.searchParams.get('path')?.endsWith(FIRST_DEMO_PHOTO) ?? false;
      if (!isTarget) {
        await route.continue();
        return;
      }

      hits.push(url.href);
      if (!failedOnce) {
        failedOnce = true;
        await route.fulfill({
          status: 503,
          headers: { 'Retry-After': '5' },
          contentType: 'text/plain',
          body: 'poster busy',
        });
        return;
      }
      await route.continue();
    });

    await page.goto('/');

    const image = page.locator(`img[alt="${FIRST_DEMO_PHOTO}"]`);
    await expect(image).toBeVisible();
    // opacity-100 means `isLoading` was cleared by a successful load.
    await expect(image).toHaveClass(/opacity-100/, { timeout: 20_000 });

    expect(hits.some((href) => href.includes('retry=1'))).toBe(true);
    await expect(page.getByText('Failed to load')).toHaveCount(0);
  });

  test('lightbox "Retry" really re-requests the image', async ({ page }) => {
    const target = '05_hot_air_balloons.jpg';
    const mediumHits: string[] = [];
    let targetFailures = 0;

    await page.route('**/api/images**', async (route) => {
      const url = new URL(route.request().url());
      // Only this photo's medium image is failed: the grid may request other
      // photos (and the lightbox may preload neighbours), and spending the
      // failure budget on those would let the target load on its own.
      const isTarget =
        url.searchParams.get('size') === 'medium' &&
        (url.searchParams.get('path') ?? '').endsWith(target);
      if (!isTarget) {
        await route.continue();
        return;
      }

      mediumHits.push(url.href);
      // Three failures = initial request + both automatic retries, so the error
      // UI with the manual button is what the user ends up looking at.
      if (targetFailures < 3) {
        targetFailures += 1;
        await route.fulfill({
          status: 503,
          headers: { 'Retry-After': '5' },
          contentType: 'text/plain',
          body: 'poster busy',
        });
        return;
      }
      await route.continue();
    });

    await page.goto('/');
    await page
      .locator('.obs-photo-card')
      .filter({ has: page.locator(`img[alt="${target}"]`) })
      .first()
      .click();

    const retryButton = page.getByRole('button', { name: 'Retry' });
    await expect(retryButton).toBeVisible({ timeout: 30_000 });

    await retryButton.click();

    await expect(page.getByText('Failed to load image')).toHaveCount(0, { timeout: 20_000 });
    // The click must change the URL: setting the same `src` back would not
    // trigger a request at all, which is what made the old button a no-op.
    expect(mediumHits.some((href) => href.includes('retry=3'))).toBe(true);
  });
});
