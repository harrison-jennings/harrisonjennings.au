import { describe, expect, it } from 'vitest';
import { handleInternalTraffic } from '../../src/worker/internal-traffic';

const url = 'https://www.harrisonjennings.au/api/internal-traffic';

describe('the internal traffic marker', () => {
  it('sets a cookie Tag Manager can read, then goes to the home page', () => {
    const response = handleInternalTraffic(new Request(url));
    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('/');
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    const cookie = response.headers.get('Set-Cookie');
    expect(cookie).toBe('traffic_type=internal; Path=/; Max-Age=34560000; Secure; SameSite=Lax');
    expect(cookie).not.toContain('HttpOnly');
  });

  it('only answers GET, and sets nothing otherwise', () => {
    const response = handleInternalTraffic(new Request(url, { method: 'POST' }));
    expect(response.status).toBe(405);
    expect(response.headers.get('Allow')).toBe('GET');
    expect(response.headers.get('Set-Cookie')).toBeNull();
  });
});
