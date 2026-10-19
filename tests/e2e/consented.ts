import { mkdirSync, writeFileSync } from 'node:fs';
import type { FullConfig } from '@playwright/test';

/** Where the "already chose" browser state is written; most tests start from it. */
export const CONSENTED = 'test-results/.consented.json';

/**
 * Writes a browser state with a cookie choice already made (essential only), so the banner doesn't
 * cover what the tests click. The consent tests start without it.
 */
export default function globalSetup(config: FullConfig): void {
  const base = new URL(config.projects[0]?.use.baseURL ?? 'http://127.0.0.1');
  const now = new Date().toISOString();
  const value = {
    categories: ['necessary'],
    revision: 1,
    data: null,
    consentTimestamp: now,
    consentId: '00000000-0000-4000-8000-000000000000',
    services: { necessary: [], analytics: [], advertising: [] },
    languageCode: 'en',
    lastConsentTimestamp: now,
    expirationTime: Date.now() + 182 * 864e5,
  };
  mkdirSync('test-results', { recursive: true });
  writeFileSync(
    CONSENTED,
    JSON.stringify({
      cookies: [
        {
          name: 'cc_cookie',
          value: encodeURIComponent(JSON.stringify(value)),
          domain: base.hostname,
          path: '/',
          expires: Math.floor(value.expirationTime / 1000),
          httpOnly: false,
          secure: base.protocol === 'https:',
          sameSite: 'Lax',
        },
      ],
      origins: [],
    }),
  );
}
