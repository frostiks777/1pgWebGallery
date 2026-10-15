import { defineConfig, devices } from '@playwright/test';

/**
 * Smoke-test config for the AI dev cycle (.agents/skills/perform-task).
 * Boots `next dev` on its own and points tests at it — nothing to start by hand.
 * Run: `bun run test:e2e` or `bunx playwright test` (first time in a fresh worktree:
 * `bunx playwright install chromium`). Not `npx` — npm is refused here, see #36.
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
  // `timeout` above bounds the *test*; `expect.timeout` is a separate knob and
  // defaults to 5s. On a cold dev server the first `toBeVisible()` on a card
  // needs longer than that, so the assertion failed while the test budget was
  // nearly untouched — the retry then passed on the warm server.
  expect: {
    timeout: 15_000,
  },
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
    // bunx, not npx: `devEngines.packageManager` requires bun and npm's runner
    // (npx included) aborts with EBADDEVENGINES. See issue #36.
    command: 'bunx next dev -p 3100',
    url: 'http://localhost:3100',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
