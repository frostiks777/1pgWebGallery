import { test, expect } from '@playwright/test';
import sharp from 'sharp';

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

  test('serves the 450px thumbnail preset from the v3 cache key', async ({ request }) => {
    // The preset is a server-side behaviour, so fetch it directly instead of
    // measuring the rendered card: the grid's CSS size says nothing about the
    // bytes sharp produced. Before the preset/cache-key change this returns an
    // 800x800 WebP from the old cache entry.
    const photosResponse = await request.get('/api/photos');
    expect(photosResponse.ok()).toBeTruthy();
    const { photos } = await photosResponse.json();
    const photo = photos.find(
      (candidate: { name: string }) => candidate.name === '01_mountain_sunset.jpg',
    );
    expect(photo).toBeTruthy();

    const imageResponse = await request.get(
      `/api/images?path=${encodeURIComponent(photo.path)}&size=thumbnail`,
    );
    expect(imageResponse.ok()).toBeTruthy();
    expect(imageResponse.headers()['content-type']).toContain('image/webp');

    const metadata = await sharp(await imageResponse.body()).metadata();
    // Demo photos are not all square; the preset caps the long side at 450.
    expect(Math.max(metadata.width ?? 0, metadata.height ?? 0)).toBe(450);
  });

  test('image URLs carry the preset and mtime version', async ({ page }) => {
    // The response is cached as immutable for a year, so the URL must change
    // when the preset or the source file changes. `v=4` is the preset version;
    // the numeric suffix is the photo's mtime.
    await page.goto('/');

    const firstCard = page.locator('.obs-photo-card').first();
    await expect(firstCard).toBeVisible();
    const cardSrc = await firstCard.locator('img').getAttribute('src');
    expect(cardSrc).toMatch(/[?&]v=4-\d+/);

    await firstCard.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    const mediumImage = dialog.locator('img[src*="size=medium"]').first();
    await expect(mediumImage).toBeVisible();
    const mediumSrc = await mediumImage.getAttribute('src');
    expect(mediumSrc).toMatch(/[?&]v=4-\d+/);
  });
});
