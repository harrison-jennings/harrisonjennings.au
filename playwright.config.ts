import { defineConfig, devices } from '@playwright/test';
import { CONSENTED } from './tests/e2e/consented';

// End-to-end tests run against the built site in dist/, served by `wrangler dev` exactly as Workers serves it,
// so _headers, html_handling and the 404 page behave as they do in production. Build first (`npm run test:e2e` does).
const PORT = 8790;
const CI = Boolean(process.env['CI']);

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: CI,
  reporter: CI ? [['github'], ['list']] : 'list',
  // Tests start as a visitor who has already made a cookie choice; consent.spec starts without one.
  globalSetup: './tests/e2e/consented.ts',
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'retain-on-failure',
    storageState: CONSENTED,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // A local D1 for the consent log (migrations applied by `npm run test:e2e`) and a test HMAC key.
    command: `npx wrangler dev --port ${PORT} --ip 127.0.0.1 --show-interactive-dev-session=false --var CONSENT_IP_KEY:local-test-key`,
    url: `http://127.0.0.1:${PORT}/`,
    reuseExistingServer: !CI,
    timeout: 60_000,
    env: { WRANGLER_SEND_METRICS: 'false' },
  },
});
