// `::cookie-table{category="analytics"}` on a line of its own: that category's cookies as a table
// (cookie and domain, kept for, what it does), from src/content/consent.yaml, the same list the
// cookie preferences dialog shows. Used in the privacy policy, so the two can't drift apart. A category
// with no cookies gets the "none at the moment" line instead; an unknown one fails the build.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { PhrasingContent, Root, RootContent, TableRow } from 'mdast';
import type {} from 'mdast-util-directive';
import type {} from 'mdast-util-to-hast';
import { visit } from 'unist-util-visit';
import { parse } from 'yaml';

interface Cookie {
  name: string;
  domain: string;
  purpose: string;
  kept: string;
}
interface ConsentCopy {
  dialog: { noCookies: string };
  categories: Array<{ id: string; cookies: Cookie[] }>;
}

/** The consent wording, read from src/content/consent.yaml (from the project root, as the build runs). */
export const readConsent = (): ConsentCopy =>
  (parse(readFileSync(resolve('src/content/consent.yaml'), 'utf8')) as { consent: ConsentCopy })
    .consent;

const text = (value: string): PhrasingContent => ({ type: 'text', value });
const row = (cells: PhrasingContent[][]): TableRow => ({
  type: 'tableRow',
  children: cells.map((children) => ({ type: 'tableCell', children })),
});

/** The table (or the "none" line) for one category. */
export function cookieTable(copy: ConsentCopy, category: string): RootContent {
  const found = copy.categories.find((c) => c.id === category);
  if (!found) throw new Error(`::cookie-table: no category "${category}" in consent.yaml`);
  if (found.cookies.length === 0)
    return {
      type: 'paragraph',
      data: { hProperties: { className: ['cookie-none'] } },
      children: [text(copy.dialog.noCookies)],
    };
  return {
    type: 'table',
    align: [null, null, null],
    data: { hProperties: { className: ['cookie-table'] } },
    children: [
      row([[text('cookie and domain')], [text('kept for')], [text('what it does')]]),
      ...found.cookies.map((cookie) =>
        row([
          [
            { type: 'inlineCode', value: cookie.name },
            { type: 'break' },
            { type: 'inlineCode', value: cookie.domain },
          ],
          [text(cookie.kept)],
          [text(cookie.purpose)],
        ]),
      ),
    ],
  };
}

export function remarkCookieTable(options: { read?: () => ConsentCopy } = {}) {
  const read = options.read ?? readConsent;
  return (tree: Root) => {
    let copy: ConsentCopy | undefined;
    visit(tree, 'leafDirective', (node, index, parent) => {
      if (node.name !== 'cookie-table' || !parent || index === undefined) return;
      copy ??= read();
      parent.children[index] = cookieTable(copy, node.attributes?.['category'] ?? '');
    });
  };
}
