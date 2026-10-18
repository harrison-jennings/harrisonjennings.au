import { readFileSync, readdirSync } from 'node:fs';

const dist = new URL('../../dist/', import.meta.url);

/** Every page path in the built sitemap, so new pages are covered without editing the tests. */
export function sitemapPaths(): string[] {
  const files = readdirSync(dist).filter((f) => /^sitemap-\d+\.xml$/.test(f));
  const locs = files.flatMap((f) =>
    [...readFileSync(new URL(f, dist), 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]!),
  );
  return [...new Set(locs.map((loc) => new URL(loc).pathname))].sort();
}

/** The first file in a dist/ subfolder, as a URL path, or undefined if the folder is empty. */
export function firstFileIn(folder: string): string | undefined {
  const file = readdirSync(new URL(`${folder}/`, dist)).sort()[0];
  return file ? `/${folder}/${file}` : undefined;
}

/** A path that no page, asset or redirect uses. */
export const UNKNOWN_PATH = '/this-page-does-not-exist/';
