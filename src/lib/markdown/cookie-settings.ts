// `::cookie-settings` on a line of its own: the "cookie settings" button that reopens the consent
// choices, as in the footer. Used in the privacy policy's cookies section.
import type { Root } from 'mdast';
import type {} from 'mdast-util-directive';
import type {} from 'mdast-util-to-hast';
import { visit } from 'unist-util-visit';

export function remarkCookieSettings() {
  return (tree: Root) => {
    visit(tree, 'leafDirective', (node) => {
      if (node.name !== 'cookie-settings') return;
      node.data = { hName: 'p', hProperties: { className: ['cookie-settings'] } };
      node.children = [
        {
          type: 'text',
          value: 'cookie settings',
          data: {
            hName: 'button',
            hProperties: { type: 'button', className: ['copy'], dataCc: 'show-preferencesModal' },
            hChildren: [{ type: 'text', value: 'cookie settings' }],
          },
        },
      ];
    });
  };
}
