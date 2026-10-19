// Callouts, written as :::note, :::tip and :::warning (shown as "heads up") around a paragraph or
// more. Unknown names are left alone.
import type { Root } from 'mdast';
import type {} from 'mdast-util-directive';
import type {} from 'mdast-util-to-hast';
import { visit } from 'unist-util-visit';

export const CALLOUTS = { note: 'note', tip: 'tip', warning: 'heads up' } as const;

export function remarkCallouts() {
  return (tree: Root) => {
    visit(tree, 'containerDirective', (node) => {
      if (!(node.name in CALLOUTS)) return;
      const kind = node.name as keyof typeof CALLOUTS;
      node.data = {
        hName: 'aside',
        hProperties: { className: ['callout', `callout--${kind}`] },
      };
      node.children.unshift({
        type: 'paragraph',
        data: { hName: 'span', hProperties: { className: ['callout__label'] } },
        children: [{ type: 'text', value: CALLOUTS[kind] }],
      });
    });
  };
}
