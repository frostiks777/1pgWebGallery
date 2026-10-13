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

  test('navigates between photos in the lightbox', async ({ page }) => {
    // Covers the index-navigation path (goToIndex / handlePrev / handleNext),
    // which the set-state-in-effect rework rewrote: the per-image state reset
    // moved out of an effect into these handlers, so nothing else exercises it.
    //
    // Asserted against the frame counter the lightbox renders ("«frame 2/8»")
    // rather than against the gallery's own <img alt> elements — those stay in
    // the DOM behind the overlay and would match a bare `img[alt]` selector.
    await page.goto('/');

    const firstCard = page.locator('.obs-photo-card').first();
    await firstCard.waitFor({ state: 'visible' });
    await firstCard.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    const frameCounter = dialog.getByText(/«frame \d+\/\d+»/).first();
    await expect(frameCounter).toContainText(/«frame 1\/\d+»/);

    // Forward, then back — the back step must land back on the first photo.
    await page.getByLabel('Следующее фото').click();
    await expect(frameCounter).toContainText(/«frame 2\/\d+»/);

    await page.getByLabel('Предыдущее фото').click();
    await expect(frameCounter).toContainText(/«frame 1\/\d+»/);

    await page.getByLabel('Закрыть').click();
    await expect(page.getByLabel('Закрыть')).toBeHidden();
  });
});
