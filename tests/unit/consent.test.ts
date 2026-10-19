import { describe, expect, it } from 'vitest';
import { consentSignals, parseConsentRecord } from '../../src/lib/consent';
import { tagManagerEnvironment, tagManagerSrc } from '../../src/lib/tag-manager';
import { handleConsent, hashIp, type ConsentDb } from '../../src/worker/consent';

describe('Consent Mode signals', () => {
  it('denies everything optional until a category is accepted', () => {
    expect(consentSignals(['necessary'])).toEqual({
      analytics_storage: 'denied',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
    });
  });

  it('maps analytics to analytics_storage and advertising to the three ad signals', () => {
    expect(consentSignals(['necessary', 'analytics'])).toMatchObject({
      analytics_storage: 'granted',
      ad_storage: 'denied',
    });
    expect(consentSignals(['necessary', 'advertising'])).toEqual({
      analytics_storage: 'denied',
      ad_storage: 'granted',
      ad_user_data: 'granted',
      ad_personalization: 'granted',
    });
  });
});

const valid = {
  consentId: '6F1C2D3E-4A5B-4C6D-8E7F-0123456789AB',
  consentDate: '2026-10-20T01:02:03.000Z',
  revision: 1,
  categories: ['analytics', 'necessary'],
  action: 'custom',
  path: '/blog/?utm_source=x#top',
};

describe('consent records', () => {
  it('accepts a good record, tidying the ID, the category order and the path', () => {
    expect(parseConsentRecord(valid)).toEqual({
      consentId: '6f1c2d3e-4a5b-4c6d-8e7f-0123456789ab',
      consentDate: '2026-10-20T01:02:03.000Z',
      revision: 1,
      categories: ['necessary', 'analytics'],
      action: 'custom',
      path: '/blog/',
    });
  });

  it.each([
    ['a bad consent ID', { consentId: 'nope' }],
    ['an unknown category', { categories: ['marketing'] }],
    ['an unknown action', { action: 'shrug' }],
    ['a revision of 0', { revision: 0 }],
    ['a full URL instead of a path', { path: 'https://elsewhere.example/' }],
    ['a date that is not one', { consentDate: 'yesterday' }],
  ])('rejects %s', (_, change) => {
    expect(parseConsentRecord({ ...valid, ...change })).toBeNull();
  });
});

describe('Tag Manager environment', () => {
  it('is Live on production builds, Testing on previews and absent everywhere else', () => {
    expect(tagManagerEnvironment({ WORKERS_CI: '1', WORKERS_CI_BRANCH: 'main' })).toBe('live');
    expect(tagManagerEnvironment({ WORKERS_CI: '1', WORKERS_CI_BRANCH: 'feat/consent' })).toBe(
      'testing',
    );
    expect(tagManagerEnvironment({ CI: 'true' })).toBeNull();
    expect(tagManagerEnvironment({})).toBeNull();
    expect(tagManagerEnvironment({ TAG_MANAGER_ENV: 'testing' })).toBe('testing');
    expect(tagManagerEnvironment({ WORKERS_CI: '1', TAG_MANAGER_ENV: 'off' })).toBeNull();
  });

  it('loads first-party, with the Testing environment chosen on previews', () => {
    expect(tagManagerSrc('live')).toBe('https://measure.harrisonjennings.au/OzAbOvUs9mw4IY9Ch0V/');
    expect(tagManagerSrc('testing')).toBe(
      'https://measure.harrisonjennings.au/OzAbOvUs9mw4IY9Ch0V/?gtm_auth=3fXV4MpcQrr8VZzc2dL5Kg&gtm_preview=env-66&gtm_cookies_win=x',
    );
  });
});

describe('the consent log', () => {
  it('hashes an IP with the key: the same IP and key match, without the key it cannot be redone', async () => {
    const a = await hashIp('203.0.113.7', 'key-one');
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(await hashIp('203.0.113.7', 'key-one')).toBe(a);
    expect(await hashIp('203.0.113.7', 'key-two')).not.toBe(a);
    expect(await hashIp('203.0.113.8', 'key-one')).not.toBe(a);
  });

  const db = () => {
    const calls: unknown[][] = [];
    const fake: ConsentDb = {
      prepare: () => ({
        bind: (...values: unknown[]) => ({
          run: async () => {
            calls.push(values);
            return {};
          },
        }),
      }),
    };
    return { calls, fake };
  };

  const post = (
    body: unknown,
    headers: Record<string, string> = {},
    host = 'www.harrisonjennings.au',
  ) =>
    Object.assign(
      new Request(`https://${host}/api/consent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: `https://${host}`,
          'CF-Connecting-IP': '203.0.113.7',
          'User-Agent': 'Test browser',
          ...headers,
        },
        body: JSON.stringify(body),
      }),
      { cf: { country: 'AU', region: 'Victoria' } },
    );

  it('writes one row: the choice, where from, and the IP only as a hash', async () => {
    const { calls, fake } = db();
    const response = await handleConsent(post(valid), { CONSENT_DB: fake, CONSENT_IP_KEY: 'k' });
    expect(response.status).toBe(204);
    expect(calls).toHaveLength(1);
    expect(calls[0]).toEqual([
      '6f1c2d3e-4a5b-4c6d-8e7f-0123456789ab',
      '2026-10-20T01:02:03.000Z',
      '/blog/',
      'AU',
      'Victoria',
      await hashIp('203.0.113.7', 'k'),
      'Test browser',
      1,
      1,
      0,
      'custom',
      1,
      'production',
    ]);
    expect(JSON.stringify(calls)).not.toContain('203.0.113.7');
  });

  it('marks rows from previews, and stores no IP at all without the key', async () => {
    const { calls, fake } = db();
    await handleConsent(post(valid, {}, 'feat-consent-harrisonjennings-au.example.dev'), {
      CONSENT_DB: fake,
    });
    expect(calls[0]?.[5]).toBeNull();
    expect(calls[0]?.at(-1)).toBe('preview');
  });

  it('says the log is unavailable, rather than failing, when no database is bound', async () => {
    expect((await handleConsent(post(valid), {})).status).toBe(503);
  });

  it('refuses other methods, other sites, other content types and bad records', async () => {
    const { calls, fake } = db();
    const env = { CONSENT_DB: fake, CONSENT_IP_KEY: 'k' };
    expect(
      (await handleConsent(new Request('https://www.harrisonjennings.au/api/consent'), env)).status,
    ).toBe(405);
    expect((await handleConsent(post(valid, { Origin: 'https://evil.example' }), env)).status).toBe(
      403,
    );
    expect((await handleConsent(post(valid, { 'Content-Type': 'text/plain' }), env)).status).toBe(
      415,
    );
    expect((await handleConsent(post({ ...valid, action: 'shrug' }), env)).status).toBe(400);
    expect((await handleConsent(post('x'.repeat(3000)), env)).status).toBe(413);
    expect(calls).toHaveLength(0);
  });
});
