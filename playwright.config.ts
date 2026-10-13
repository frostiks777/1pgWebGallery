import { defineConfig, devices } from '@playwright/test';

/**
 * Smoke-test config for the AI dev cycle (.agents/skills/perform-task).
 * Boots `next dev` on its own and points tests at it — nothing to start by hand.
 * Run: `npx playwright test` (first time: `npx playwright install chromium`).
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // Retries everywhere, not just in CI: `next dev` has to compile the route and
  // every /api/* handler on first hit, and on a slow laptop that can eat the
  // whole timeout on a cold `.next`. A retry re-uses the warm server.
  retries: 2,
  workers: process.env.CI ? 2 : undefined,
  reporter: [['list']],
  timeout: 60_000,
  use: {
    // `localhost`, deliberately NOT 127.0.0.1: Next 16 blocks dev resources
    // (client chunks, HMR socket) from origins that aren't in
    // `allowedDevOrigins`, and `127.0.0.1` isn't one. The server still answers
    // the HTML, so the page looks fine in a screenshot while the client never
    // hydrates and every card selector times out.
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3100',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npx next dev -p 3100',
    url: 'http://localhost:3100',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
