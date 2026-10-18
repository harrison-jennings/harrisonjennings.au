import { defineConfig, devices } from '@playwright/test';

// End-to-end tests run against the built site in dist/, served by `wrangler dev` exactly as Workers serves it,
// so _headers, html_handling and the 404 page behave as they do in production. Build first (`npm run test:e2e` does).
const PORT = 8790;
const CI = Boolean(process.env['CI']);

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: CI,
  reporter: CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npx wrangler dev --port ${PORT} --ip 127.0.0.1 --show-interactive-dev-session=false`,
    url: `http://127.0.0.1:${PORT}/`,
    reuseExistingServer: !CI,
    timeout: 60_000,
    env: { WRANGLER_SEND_METRICS: 'false' },
  },
});
