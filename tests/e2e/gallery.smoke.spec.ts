import { test, expect } from '@playwright/test';

/**
 * Baseline smoke coverage for the gallery, run against the built-in demo
 * photos (no WEBDAV_* env vars needed). Extend this file when a task
 * changes gallery/lightbox behavior instead of writing a one-off script —
 * see .agents/shared/checks.md.
 */

test.describe('gallery smoke', () => {
  test('loads the gallery and shows demo photos', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Photo Gallery/);

    const cards = page.locator('.obs-photo-card');
    await expect(cards.first()).toBeVisible();
    expect(await cards.count()).toBeGreaterThan(0);
  });

  test('opens and closes the lightbox from a photo card', async ({ page }) => {
    await page.goto('/');

    const firstCard = page.locator('.obs-photo-card').first();
    await firstCard.waitFor({ state: 'visible' });
    await firstCard.click();

    const closeButton = page.getByLabel('Закрыть');
    await expect(closeButton).toBeVisible();

    await closeButton.click();
    await expect(closeButton).toBeHidden();
  });
});
