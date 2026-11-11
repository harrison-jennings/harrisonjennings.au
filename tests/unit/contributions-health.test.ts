import { describe, expect, it } from 'vitest';
import { handleContributionsHealth, STALE_AFTER_MS } from '../../src/worker/contributions-health';

const url = 'https://www.harrisonjennings.au/api/contributions-health';
const now = Date.parse('2026-11-11T12:00:00Z');

/** The Worker's static assets, serving one calendar (or none). */
const assets = (body: unknown, status = 200) => {
  const asked: string[] = [];
  return {
    asked,
    env: {
      ASSETS: {
        fetch: async (request: Request) => {
          asked.push(new URL(request.url).pathname);
          return new Response(JSON.stringify(body), { status });
        },
      },
    },
  };
};

describe('the contributions health check', () => {
  it('answers 200 while the published calendar is fresh, read from the site, not GitHub', async () => {
    const { env, asked } = assets({ fetchedAt: '2026-11-11T01:17:30.000Z' });
    const response = await handleContributionsHealth(new Request(url), env, now);
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(await response.json()).toEqual({
      status: 'fresh',
      fetchedAt: '2026-11-11T01:17:30.000Z',
      ageHours: 11,
    });
    expect(asked).toEqual(['/github-contributions.json']);
  });

  it('answers 503 once it is more than three days old', async () => {
    const old = new Date(now - STALE_AFTER_MS - 60_000).toISOString();
    const response = await handleContributionsHealth(
      new Request(url),
      assets({ fetchedAt: old }).env,
      now,
    );
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ status: 'stale', ageHours: 72 });
  });

  it('answers 503 when the build published no calendar', async () => {
    for (const env of [assets(null).env, assets({}, 404).env]) {
      const response = await handleContributionsHealth(new Request(url), env, now);
      expect(response.status).toBe(503);
      expect(await response.json()).toMatchObject({ status: 'missing' });
    }
  });

  it('answers GET and HEAD only', async () => {
    const response = await handleContributionsHealth(
      new Request(url, { method: 'POST' }),
      assets({}).env,
      now,
    );
    expect(response.status).toBe(405);
    expect(response.headers.get('Allow')).toBe('GET, HEAD');
  });
});
