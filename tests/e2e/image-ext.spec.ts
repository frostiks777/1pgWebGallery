import { test, expect } from '@playwright/test';
import { IMAGE_EXTENSIONS, imageExtOf, isImageFile } from '../../src/lib/imageExt';

/**
 * #155: the folder-preview listing took an extension with
 * `substring(lastIndexOf('.'))`, which for a name without a dot becomes
 * `substring(0)` — the whole name. The folder-preview list also lacked `.svg`
 * while the full listing had it. Both now come from one helper, tested here
 * without a WebDAV server; the route-level check below covers the removed stub.
 */

test.describe('image extension detection (#155)', () => {
  test('a name without a dot has no image extension', () => {
    expect(imageExtOf('README')).toBe('');
    expect(imageExtOf('LICENSE')).toBe('');
    expect(isImageFile('README')).toBe(false);
    expect(isImageFile('LICENSE')).toBe(false);
  });

  test('extensions are matched case-insensitively', () => {
    expect(imageExtOf('IMG_1.JPG')).toBe('.jpg');
    expect(isImageFile('IMG_1.JPG')).toBe(true);
    expect(isImageFile('cover.WebP')).toBe(true);
  });

  test('folder previews and full listings share one extension list', () => {
    expect(IMAGE_EXTENSIONS).toContain('.svg');
    expect(isImageFile('logo.svg')).toBe(true);
    expect(isImageFile('logo.SVG')).toBe(true);
  });

  test('only the last dot separates the extension', () => {
    expect(imageExtOf('holiday.2024.jpg')).toBe('.jpg');
    expect(isImageFile('holiday.2024.jpg')).toBe(true);
    expect(isImageFile('archive.tar.gz')).toBe(false);
  });

  test('the /api hello placeholder is gone', async ({ request }) => {
    const response = await request.get('/api');
    expect(response.status()).toBe(404);
  });
});
