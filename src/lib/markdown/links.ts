// Links in posts and pages that go to another site open in a new tab, so a reader keeps their place
// in the post. Each gets rel="noopener" (the opened page can't reach back into this one) and a hidden
// "(opens in a new tab)" for screen readers, with no visual change. Links within the site, anchors,
// mailto: and the like stay as they are. Other subdomains (leadlens., status.) are separate sites.
import type { Element, Root } from 'hast';
import { visit } from 'unist-util-visit';
import { isExternal, NEW_TAB_NOTE } from '../links';

export { isExternal };

const relValues = (el: Element): string[] => {
  const rel = el.properties['rel'];
  return Array.isArray(rel) ? rel.map(String) : rel ? String(rel).split(' ') : [];
};

export function rehypeExternalLinks() {
  return (tree: Root) => {
    visit(tree, 'element', (el) => {
      if (el.tagName !== 'a' || !isExternal(el.properties['href'])) return;
      el.properties['target'] = '_blank';
      el.properties['rel'] = [...new Set([...relValues(el), 'noopener'])];
      el.children.push({
        type: 'element',
        tagName: 'span',
        properties: { className: ['visually-hidden'] },
        children: [{ type: 'text', value: NEW_TAB_NOTE }],
      });
    });
  };
}
