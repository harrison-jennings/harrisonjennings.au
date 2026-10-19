// Small fixes to the rendered HTML of a post:
// - three heading levels under the title is the ceiling, so h5 and h6 render as h4;
// - tables get a framed wrapper that scrolls sideways, and right-aligned columns (---:) are set as
//   numbers, in Martian Mono.
import type { Element, Root } from 'hast';
import { SKIP, visit } from 'unist-util-visit';

const classes = (el: Element): string[] => {
  const c = el.properties['className'];
  return Array.isArray(c) ? c.map(String) : c ? String(c).split(' ') : [];
};
export const addClass = (el: Element, name: string) => {
  el.properties['className'] = [...classes(el), name];
};

export function rehypeHeadingCeiling() {
  return (tree: Root) => {
    visit(tree, 'element', (el) => {
      if (el.tagName === 'h5' || el.tagName === 'h6') el.tagName = 'h4';
    });
  };
}

export function rehypeTables() {
  return (tree: Root) => {
    visit(tree, 'element', (el, index, parent) => {
      if (el.tagName !== 'table' || !parent || index === undefined) return;
      addClass(el, 'table');
      visit(el, 'element', (cell) => {
        if (
          (cell.tagName === 'td' || cell.tagName === 'th') &&
          cell.properties['align'] === 'right'
        )
          addClass(cell, 'num');
      });
      parent.children[index] = {
        type: 'element',
        tagName: 'div',
        properties: { className: ['table-wrap'], tabIndex: 0, role: 'region', ariaLabel: 'Table' },
        children: [el],
      };
      return [SKIP, index + 1];
    });
  };
}
