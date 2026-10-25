import { defineConfig, devices } from '@playwright/test';
import { CONSENTED } from './tests/e2e/consented';

// End-to-end tests run against the built site in dist/, served by `wrangler dev` exactly as Workers serves it,
// so _headers, html_handling and the 404 page behave as they do in production. Build first (`npm run test:e2e` does).
const PORT = 8790;
// The design system (design-system/), built to design-system/dist and served the same way.
const DESIGN_PORT = 8791;
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
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] }, testIgnore: '**/design-system/**' },
    // Safari's engine on an iPhone, for the specs that drive the page. Request-level specs (headers,
    // redirects, feeds, the crawl, structured data) don't depend on the browser, so only Chromium runs them.
    // @keyboard tests press Tab, which WebKit gives only to form fields unless Safari's "Press Tab to
    // highlight each item" is on (and a phone has no Tab key); @desktop tests use the desktop nav.
    {
      name: 'webkit-iphone',
      use: { ...devices['iPhone 15'] },
      grepInvert: /@keyboard|@desktop/,
      testMatch: [
        'a11y',
        'blog',
        'consent',
        'csp',
        'home',
        'legal',
        'menu',
        'motion',
        'nav',
        'not-found',
        'pages',
        'projects',
        'share',
        'theme',
      ].map((name) => `${name}.spec.ts`),
    },
    {
      name: 'design-system',
      testDir: 'tests/e2e/design-system',
      use: { ...devices['Desktop Chrome'], baseURL: `http://127.0.0.1:${DESIGN_PORT}` },
    },
  ],
  webServer: [
    {
      // A local D1 for the consent log (migrations applied by `npm run test:e2e`) and a test HMAC key.
      command: `npx wrangler dev --port ${PORT} --ip 127.0.0.1 --show-interactive-dev-session=false --var CONSENT_IP_KEY:local-test-key`,
      url: `http://127.0.0.1:${PORT}/`,
      reuseExistingServer: !CI,
      timeout: 60_000,
      env: { WRANGLER_SEND_METRICS: 'false' },
    },
    {
      command: `npx wrangler dev -c design-system/wrangler.jsonc --port ${DESIGN_PORT} --ip 127.0.0.1 --show-interactive-dev-session=false`,
      url: `http://127.0.0.1:${DESIGN_PORT}/`,
      reuseExistingServer: !CI,
      timeout: 60_000,
      env: { WRANGLER_SEND_METRICS: 'false' },
    },
  ],
});
