import { test, expect } from '@playwright/test';

/**
 * #142: thumbnails are cropped by the browser (`object-fit: cover`), and the
 * default center position cut heads off in wide masonry tiles. The fix is one
 * CSS knob (`--thumb-focus`) plus one class, so the offset can be tuned
 * without touching components; these tests pin both.
 */

test('masonry thumbnails crop above center', async ({ page }) => {
  await page.goto('/');

  const img = page.locator('.obs-photo-card img').first();
  await expect(img).toBeVisible();

  await expect
    .poll(async () => img.evaluate((el) => getComputedStyle(el).objectPosition))
    .toBe('50% 25%');
});

test('--thumb-focus is the only source of the offset', async ({ page }) => {
  await page.goto('/');

  const img = page.locator('.obs-photo-card img').first();
  await expect(img).toBeVisible();

  await page.evaluate(() => document.documentElement.style.setProperty('--thumb-focus', '0%'));

  await expect
    .poll(async () => img.evaluate((el) => getComputedStyle(el).objectPosition))
    .toBe('50% 0%');
});

test('every layout uses the same crop class', async ({ page }) => {
  await page.goto('/');

  // All six layouts render their tiles through `.obs-thumb-crop`; a layout that
  // forgets the class would keep the old centered crop without any test noise.
  for (const layout of ['Masonry', 'Bento', 'Honeycomb', 'Wave', 'Minimal', 'Album']) {
    await page.getByRole('button', { name: layout }).first().click();

    const cropped = page.locator('main img.obs-thumb-crop').first();
    await expect(cropped).toBeVisible();

    await expect
      .poll(async () => cropped.evaluate((el) => getComputedStyle(el).objectPosition))
      .toBe('50% 25%');
  }
});
