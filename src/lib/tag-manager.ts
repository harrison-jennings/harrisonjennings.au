// Which Tag Manager environment a build loads. Production (the `main` branch on Workers Builds) loads
// Live; every branch preview loads Testing, which sends only to the testing GA4 property; local builds
// and the test suite load nothing. TAG_MANAGER_ENV (live, testing or off) overrides it.

export const TAG_MANAGER = {
  /** The web container, served first-party by the server container's web-container client. */
  loader: 'https://measure.harrisonjennings.au/OzAbOvUs9mw4IY9Ch0V/',
  /** The Testing environment's snippet values (Admin → Environments → Testing). Not secret: they
   *  only select which published version of the container loads. */
  testing: { gtm_auth: '3fXV4MpcQrr8VZzc2dL5Kg', gtm_preview: 'env-66', gtm_cookies_win: 'x' },
} as const;

export type TagManagerEnvironment = 'live' | 'testing' | null;

export function tagManagerEnvironment(
  env: Record<string, string | undefined> = process.env,
): TagManagerEnvironment {
  const override = env['TAG_MANAGER_ENV'];
  if (override === 'live' || override === 'testing') return override;
  if (override === 'off') return null;
  if (env['WORKERS_CI'] !== '1') return null;
  return env['WORKERS_CI_BRANCH'] === 'main' ? 'live' : 'testing';
}

/** The loader's address for an environment. */
export function tagManagerSrc(environment: Exclude<TagManagerEnvironment, null>): string {
  if (environment === 'live') return TAG_MANAGER.loader;
  return `${TAG_MANAGER.loader}?${new URLSearchParams(TAG_MANAGER.testing).toString()}`;
}
