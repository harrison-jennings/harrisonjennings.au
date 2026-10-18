import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { firstFileIn } from './site';

// Every rule in public/_headers is checked against a real response from that path.
type Rule = { pattern: string; headers: Array<[name: string, value: string]> };

function parseHeaders(text: string): Rule[] {
  const rules: Rule[] = [];
  for (const line of text.split('\n')) {
    if (!line.trim() || line.trimStart().startsWith('#')) continue;
    if (/^\s/.test(line)) {
      const at = line.indexOf(':');
      rules.at(-1)?.headers.push([line.slice(0, at).trim(), line.slice(at + 1).trim()]);
    } else {
      rules.push({ pattern: line.trim(), headers: [] });
    }
  }
  return rules;
}

const rules = parseHeaders(readFileSync(new URL('../../public/_headers', import.meta.url), 'utf8'));

test('_headers sets the core security headers on every path', () => {
  const all = rules.find((r) => r.pattern === '/*');
  const names = all?.headers.map(([name]) => name.toLowerCase());
  expect(names).toEqual(
    expect.arrayContaining([
      'strict-transport-security',
      'x-content-type-options',
      'x-frame-options',
    ]),
  );
});

for (const { pattern, headers } of rules) {
  const folder = pattern.match(/^\/([^/*]+)\/\*$/)?.[1];
  const path = pattern === '/*' ? '/' : folder ? firstFileIn(folder) : pattern;

  test(`${pattern} headers are served (checked on ${path})`, async ({ request }) => {
    expect(path, `no file in dist/ matches ${pattern}`).toBeDefined();
    const response = await request.get(path!);
    expect(response.status()).toBe(200);
    const served = response.headers();
    for (const [name, value] of headers) {
      expect(served[name.toLowerCase()], name).toBe(value);
    }
  });
}
