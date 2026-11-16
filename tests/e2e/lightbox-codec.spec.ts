import { test, expect, type Page } from '@playwright/test';

/**
 * #52: desktop Chrome cannot decode HEVC (H.265). Depending on the build it
 * either parses the container, plays the audio track and advances
 * `currentTime` while dropping every video frame (`videoWidth === 0`, no
 * `error`), or rejects the pipeline with MEDIA_ERR_SRC_NOT_SUPPORTED (code 4).
 * Both used to leave the user with a frozen poster and no explanation.
 *
 * A real HEVC fixture is not committed (size, codec licensing), and the demo
 * set has no video at all (#102). The tests reproduce the states the bug
 * report measured with `ffprobe` and headed Chrome. The video request is left
 * pending so the element never switches to its network-error branch on its
 * own, and the media events are dispatched by hand after the element mounts.
 */

async function openVideoLightbox(
  page: Page,
  options: { videoWidth: number; decodedFrames: number; dispatchPlaying?: boolean },
) {
  await page.route('**/api/photos**', async (route) => {
    const response = await route.fetch();
    const json = await response.json();
    // Give the first real demo photo a companion video; name, path and mtime
    // stay real, so the image and the meta line still render normally.
    json.photos = [{ ...json.photos[0], videoPath: '/demo-photos/missing.mp4' }];
    await route.fulfill({ response, json });
  });

  // Keep the request pending: a fulfilled empty body or a 404 would fire the
  // element's own error event before the check under test can run.
  await page.route('**/api/video-stream**', () => {});

  await page.goto('/');

  // The fallback is gated on the browser reporting no HEVC support; Chromium
  // without platform codecs answers "". If Playwright ever bundles HEVC, this
  // must be replaced by a property override instead of relying on the host.
  const hevcSupport = await page.evaluate(() => {
    const probe = document.createElement('video');
    return (
      probe.canPlayType('video/mp4; codecs="hvc1.1.6.L120.B0"') ||
      probe.canPlayType('video/mp4; codecs="hvc1.2.4.L153.B0"')
    );
  });
  expect(hevcSupport).toBe('');

  await page.locator('.obs-photo-card').first().click();

  const dialog = page.getByRole('dialog');
  const video = dialog.locator('video');
  await video.waitFor({ state: 'attached' });

  await video.evaluate((el, opts) => {
    // The values #52 measured on the problem machine: metadata and duration
    // are known, the video track decoded zero frames.
    Object.defineProperty(el, 'videoWidth', { configurable: true, get: () => opts.videoWidth });
    Object.defineProperty(el, 'videoHeight', {
      configurable: true,
      get: () => (opts.videoWidth === 0 ? 0 : 1080),
    });
    Object.defineProperty(el, 'duration', { configurable: true, get: () => 17.76 });
    Object.defineProperty(el, 'getVideoPlaybackQuality', {
      configurable: true,
      value: () => ({
        totalVideoFrames: opts.decodedFrames,
        droppedVideoFrames: 0,
        corruptedVideoFrames: 0,
        creationTime: 0,
      }),
    });
    if (opts.dispatchPlaying !== false) el.dispatchEvent(new Event('playing'));
  }, options);

  return dialog;
}

test.describe('lightbox codec fallback (#52)', () => {
  test('explains a silent HEVC playback failure', async ({ page }) => {
    const dialog = await openVideoLightbox(page, { videoWidth: 0, decodedFrames: 0 });

    await expect(dialog.getByText('Видео не воспроизводится в этом браузере')).toBeVisible();
    await expect(dialog.getByText(/HEVC \(H\.265\)/)).toBeVisible();
    await expect(dialog.getByRole('link', { name: 'Скачать видео' })).toBeVisible();
  });

  test('stays quiet when frames decode within the grace period', async ({ page }) => {
    const dialog = await openVideoLightbox(page, { videoWidth: 1920, decodedFrames: 42 });

    // Longer than the 2 s grace period, otherwise toBeHidden passes before the
    // check would have run.
    await page.waitForTimeout(2_600);
    await expect(dialog.getByText('Видео не воспроизводится в этом браузере')).toBeHidden();
  });

  // The headed Chrome in #52 stayed silent, but Playwright's Chromium rejects
  // the same class of file with code 4 — verified against a real 1 MB HEVC
  // sample. No `playing` event is dispatched here: a rejecting browser never
  // starts playback, so this must prove the error branch alone produces the
  // message, not the delayed zero-frames check.
  test('surfaces a decode rejection instead of hiding the video', async ({ page }) => {
    const dialog = await openVideoLightbox(page, {
      videoWidth: 1920,
      decodedFrames: 42,
      dispatchPlaying: false,
    });
    const video = dialog.locator('video');

    await video.evaluate((el) => {
      Object.defineProperty(el, 'error', {
        configurable: true,
        value: { code: 4, message: 'DEMUXER_ERROR_NO_SUPPORTED_STREAMS' },
      });
      el.dispatchEvent(new Event('error'));
    });

    await expect(dialog.getByText('Видео не воспроизводится в этом браузере')).toBeVisible();
    await expect(dialog.getByRole('link', { name: 'Скачать видео' })).toBeVisible();
  });
});
