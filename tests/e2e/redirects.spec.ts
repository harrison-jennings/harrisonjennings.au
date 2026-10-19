import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

// Every rule in public/_redirects: one explicit old URL, a 301, and a target that exists.
const rules = readFileSync(new URL('../../public/_redirects', import.meta.url), 'utf8')
  .split('\n')
  .map((line) => line.trim())
  .filter((line) => line && !line.startsWith('#'))
  .map((line) => {
    const [from = '', to = '', status = ''] = line.split(/\s+/);
    return { from, to, status };
  });

test('there are redirects, and none uses a wildcard or placeholder', () => {
  expect(rules.length).toBeGreaterThan(0);
  for (const { from, to, status } of rules) {
    expect(`${from} ${to}`).not.toMatch(/[*:]|\/:\w/);
    expect(status).toBe('301');
  }
});

for (const { from, to } of rules) {
  test(`${from} moves permanently to ${to}, which exists`, async ({ request }) => {
    const response = await request.get(from, { maxRedirects: 0 });
    expect(response.status()).toBe(301);
    expect(new URL(response.headers()['location']!, 'http://x').pathname).toBe(to);
    // One hop: the target answers directly, not with another redirect.
    expect((await request.get(to, { maxRedirects: 0 })).status()).toBe(200);
  });
}
