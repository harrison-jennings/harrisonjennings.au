// POST /api/consent: records a cookie choice in the consent log (D1). The banner sends one on a first
// choice and on every change (src/scripts/consent.ts).
import { parseConsentRecord } from '../lib/consent';
import { readBody } from './body';

/** The slice of Cloudflare's D1 binding this uses. */
export interface ConsentDb {
  prepare(query: string): { bind(...values: unknown[]): { run(): Promise<unknown> } };
}

export interface ConsentEnv {
  /** Missing only if a deployment isn't bound to a database (Previews need their own binding). */
  CONSENT_DB?: ConsentDb;
  /** The HMAC key for IP addresses (a Worker secret). Without it the IP isn't stored at all. */
  CONSENT_IP_KEY?: string;
}

export const PRODUCTION_HOST = 'www.harrisonjennings.au';
const MAX_BYTES = 2048;

/** HMAC-SHA256 of the IP with the secret key, as hex. */
export async function hashIp(ip: string, key: string): Promise<string> {
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(ip));
  return [...new Uint8Array(signature)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

const text = (body: string, status: number, headers: Record<string, string> = {}) =>
  new Response(body, { status, headers: { 'Content-Type': 'text/plain', ...headers } });

export async function handleConsent(
  request: Request & { cf?: { country?: string; region?: string } },
  env: ConsentEnv,
): Promise<Response> {
  if (request.method !== 'POST') return text('Method not allowed', 405, { Allow: 'POST' });
  if (!env.CONSENT_DB) return text('Consent log unavailable', 503);
  const url = new URL(request.url);
  // Only the site's own pages may write to the log. A script can fake this header, so it only stops
  // other sites' pages; the WAF rate limit on /api/* and the checks in parseConsentRecord do the rest.
  if (request.headers.get('Origin') !== url.origin) return text('Forbidden', 403);
  if (!request.headers.get('Content-Type')?.startsWith('application/json'))
    return text('Unsupported media type', 415);
  const body = await readBody(request, MAX_BYTES);
  if (body === null) return text('Too large', 413);

  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return text('Bad request', 400);
  }
  const record = parseConsentRecord(parsed);
  if (!record) return text('Bad request', 400);

  const ip = request.headers.get('CF-Connecting-IP');
  const ipHash = ip && env.CONSENT_IP_KEY ? await hashIp(ip, env.CONSENT_IP_KEY) : null;
  const has = (category: string) => (record.categories.includes(category as never) ? 1 : 0);

  const db = env.CONSENT_DB;
  await db
    .prepare(
      `INSERT INTO consent_log (consent_id, consent_date, url, country, region, ip_hash, user_agent,
      necessary_consent, analytics_consent, advertising_consent, action, revision, environment)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      record.consentId,
      record.consentDate,
      record.path,
      request.cf?.country ?? null,
      request.cf?.region ?? null,
      ipHash,
      request.headers.get('User-Agent')?.slice(0, 512) ?? null,
      has('necessary'),
      has('analytics'),
      has('advertising'),
      record.action,
      record.revision,
      url.hostname === PRODUCTION_HOST ? 'production' : 'preview',
    )
    .run();

  return new Response(null, { status: 204 });
}
