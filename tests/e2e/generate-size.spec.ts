import { test, expect } from '@playwright/test';

/**
 * `POST /api/images/generate` used to ignore the requested size and always
 * produce thumbnail + medium + full. The A0.6 migration only needs thumbnails,
 * so the endpoint accepts an optional `size` and reports the matching total.
 */
test('batch generation can be limited to one size', async ({ request }) => {
  const photosResponse = await request.get('/api/photos');
  const { photos } = await photosResponse.json();

  const post = await request.post('/api/images/generate', { data: { size: 'thumbnail' } });
  expect(post.ok()).toBeTruthy();

  await expect
    .poll(
      async () => {
        const status = await (await request.get('/api/images/generate')).json();
        return status.total;
      },
      { timeout: 30_000 },
    )
    .toBe(photos.length);

  // The job is fire-and-forget; let it drain so the next test sees a quiet server.
  await expect
    .poll(
      async () => {
        const status = await (await request.get('/api/images/generate')).json();
        return status.running;
      },
      { timeout: 60_000 },
    )
    .toBe(false);
});
