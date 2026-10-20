// Consent: the rules shared by the page head, the banner script and the consent-logging Worker. Plain
// functions, so they're unit-tested. The wording lives in src/content/consent.yaml.

/** The categories, as CookieConsent and the consent log name them. */
export const CATEGORIES = ['necessary', 'analytics', 'advertising'] as const;
export type Category = (typeof CATEGORIES)[number];

/**
 * The consent revision: raise it with `revision` in src/content/consent.yaml, which the banner reads (a
 * unit test keeps the two equal). The consent log accepts records of this revision only.
 */
export const CONSENT_REVISION = 1;

/** CookieConsent's cookie: the choices, the revision and the consent ID. Kept six months. */
export const CONSENT_COOKIE = 'cc_cookie';
export const CONSENT_DAYS = 182;

type Signal = 'granted' | 'denied';
export interface ConsentSignals {
  analytics_storage: Signal;
  ad_storage: Signal;
  ad_user_data: Signal;
  ad_personalization: Signal;
}

/** Google Consent Mode signals for the accepted categories: analytics, and the three advertising ones. */
export function consentSignals(accepted: readonly string[]): ConsentSignals {
  const analytics: Signal = accepted.includes('analytics') ? 'granted' : 'denied';
  const ads: Signal = accepted.includes('advertising') ? 'granted' : 'denied';
  return {
    analytics_storage: analytics,
    ad_storage: ads,
    ad_user_data: ads,
    ad_personalization: ads,
  };
}

/** How the choice was made, for the consent log. */
export type ConsentAction = 'accept_all' | 'reject_all' | 'custom';

/** What the banner sends to /api/consent on a first choice and on every change. */
export interface ConsentRecord {
  consentId: string;
  /** When the visitor chose, from CookieConsent (ISO 8601). */
  consentDate: string;
  revision: number;
  categories: Category[];
  action: ConsentAction;
  /** The page it was made on: path only, never the query string. */
  path: string;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ACTIONS: readonly string[] = ['accept_all', 'reject_all', 'custom'];
/** A path as browsers send it: RFC 3986 path characters, with anything else percent-encoded. */
const PATH = /^\/[A-Za-z0-9\-._~%!$&'()*+,;=:@/]*$/;

/**
 * Checks a posted record; returns it cleaned, or null if anything is off. Beyond each field's shape, the
 * record has to hang together: the current revision, the necessary category always (it can't be turned
 * off), every category for accept_all and only the necessary one for reject_all. consentDate isn't held
 * to the time of receipt: on a change, it can be a returning visitor's earlier choice. The log's
 * created_at is the server's own time.
 */
export function parseConsentRecord(input: unknown): ConsentRecord | null {
  if (!input || typeof input !== 'object') return null;
  const r = input as Record<string, unknown>;
  const { consentId, consentDate, revision, categories, action, path } = r;
  if (typeof consentId !== 'string' || !UUID.test(consentId)) return null;
  if (typeof consentDate !== 'string' || Number.isNaN(Date.parse(consentDate))) return null;
  if (revision !== CONSENT_REVISION) return null;
  if (!Array.isArray(categories) || categories.some((c) => !CATEGORIES.includes(c))) return null;
  if (typeof action !== 'string' || !ACTIONS.includes(action)) return null;
  if (typeof path !== 'string' || path.length > 512) return null;
  const accepted = CATEGORIES.filter((c) => categories.includes(c));
  if (!accepted.includes('necessary')) return null;
  if (action === 'accept_all' && accepted.length !== CATEGORIES.length) return null;
  if (action === 'reject_all' && accepted.length !== 1) return null;
  const pagePath = path.split(/[?#]/)[0] ?? '';
  if (!PATH.test(pagePath)) return null;
  return {
    consentId: consentId.toLowerCase(),
    consentDate: new Date(consentDate).toISOString(),
    revision,
    categories: accepted,
    action: action as ConsentAction,
    path: pagePath,
  };
}
