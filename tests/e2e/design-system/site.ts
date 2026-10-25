import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = fileURLToPath(new URL('../../../design-system/dist/', import.meta.url));

function htmlFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory()
      ? htmlFiles(join(dir, e.name))
      : e.name === 'index.html'
        ? [join(dir, e.name)]
        : [],
  );
}

/** Every specimen page (the examples shown inside previews), as a path. */
export function specimenPages(): string[] {
  return htmlFiles(join(dist, 'specimens'))
    .map((file) => `/${relative(dist, file).split(sep).slice(0, -1).join('/')}/`)
    .sort();
}

/**
 * Every page of the built design system, as a path: the overview and the docs pages, not the
 * specimens (shown inside previews) or the section addresses that only redirect. Read from the build,
 * so new pages are covered without editing the tests.
 */
export function designPages(): string[] {
  return htmlFiles(dist)
    .filter((file) => !readFileSync(file, 'utf8').includes('http-equiv="refresh"'))
    .map((file) => `/${relative(dist, file).split(sep).slice(0, -1).join('/')}/`.replace('//', '/'))
    .filter((path) => !path.startsWith('/specimens/'))
    .sort();
}
