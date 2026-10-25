// Post images. Every Markdown image becomes a figure: `![alt](file.png "caption")` puts the caption
// underneath, and the image opens the image viewer (a button around it) unless `{nozoom}` follows
// it: `![alt](file.png){nozoom}`. Images keep their own shape; CSS caps portrait ones.
import { dirname, resolve } from 'node:path';
import type { Element, ElementContent, Root as HastRoot } from 'hast';
import type { Root as MdastRoot } from 'mdast';
import type {} from 'mdast-util-to-hast';
import sharp from 'sharp';
import { visit } from 'unist-util-visit';
import type { VFile } from 'vfile';

const NOZOOM = '{nozoom}';

/** Marks an image followed by `{nozoom}` and removes the marker from the text. */
export function remarkNoZoom() {
  return (tree: MdastRoot) => {
    visit(tree, 'image', (node, index, parent) => {
      if (!parent || index === undefined) return;
      const next = parent.children[index + 1];
      if (next?.type !== 'text' || !next.value.startsWith(NOZOOM)) return;
      next.value = next.value.slice(NOZOOM.length);
      if (!next.value) parent.children.splice(index + 1, 1);
      node.data = { ...node.data, hProperties: { ...node.data?.hProperties, dataNozoom: '' } };
    });
  };
}

const EXPAND_ICON: Element = {
  type: 'element',
  tagName: 'span',
  // Dark over any image, in both themes: data-theme re-points the tokens (prose.css .zoomable__icon).
  properties: { className: ['zoomable__icon'], dataTheme: 'dark', ariaHidden: 'true' },
  children: [
    {
      type: 'element',
      tagName: 'svg',
      properties: { width: 16, height: 16, viewBox: '0 0 24 24', ariaHidden: 'true' },
      children: [
        {
          type: 'element',
          tagName: 'path',
          properties: {
            d: 'M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7',
            fill: 'none',
            stroke: 'currentColor',
            strokeWidth: '2',
            strokeLinecap: 'round',
            strokeLinejoin: 'round',
          },
          children: [],
        },
      ],
    },
  ],
};

/** Post images are at most the text column wide (680px), or the screen on phones. */
export const IMAGE_SIZES = '(max-width: 760px) 100vw, 680px';

/**
 * Wraps an image in its figure (and its viewer button). `ratio` (width ÷ height) is given for a
 * portrait image, so CSS can cap it at 560px tall (480 on phones) before it loads.
 */
export function figureFor(img: Element, ratio?: number): Element {
  img.properties['sizes'] = IMAGE_SIZES;
  const caption = typeof img.properties['title'] === 'string' ? img.properties['title'] : '';
  const nozoom = 'dataNozoom' in img.properties;
  delete img.properties['dataNozoom'];
  delete img.properties['title'];
  const alt = typeof img.properties['alt'] === 'string' ? img.properties['alt'] : '';
  const media: ElementContent = nozoom
    ? img
    : {
        type: 'element',
        tagName: 'button',
        properties: {
          type: 'button',
          className: ['zoomable'],
          ariaLabel: `View larger${alt ? `: ${alt}` : ''}`,
          dataZoomable: '',
        },
        children: [img, EXPAND_ICON],
      };
  const children: ElementContent[] = [media];
  if (caption)
    children.push({
      type: 'element',
      tagName: 'figcaption',
      properties: {},
      children: [{ type: 'text', value: caption }],
    });
  const properties: Element['properties'] = { className: ['fig'] };
  if (ratio && ratio < 1) properties['style'] = `--ratio: ${ratio.toFixed(4)}`;
  return { type: 'element', tagName: 'figure', properties, children };
}

/** Width ÷ height of a local image beside the post, or undefined if it can't be read. */
async function aspectRatio(src: unknown, file: VFile): Promise<number | undefined> {
  if (typeof src !== 'string' || /^([a-z]+:)?\/\//i.test(src) || !file.path) return undefined;
  try {
    const { width, height } = await sharp(resolve(dirname(file.path), decodeURI(src))).metadata();
    return width && height ? width / height : undefined;
  } catch {
    return undefined;
  }
}

const isBlank = (n: ElementContent) => n.type === 'text' && !n.value.trim();

export function rehypeFigures() {
  return async (tree: HastRoot, file: VFile) => {
    const found: Array<{ parent: HastRoot | Element; index: number; images: Element[] }> = [];
    visit(tree, 'element', (el, index, parent) => {
      if (el.tagName !== 'p' || !parent || index === undefined) return;
      const content = el.children.filter((c) => !isBlank(c));
      // A paragraph holding only images (one, or several in a row) becomes their figures.
      if (!content.length || !content.every((c) => c.type === 'element' && c.tagName === 'img'))
        return;
      found.push({ parent, index, images: content as Element[] });
    });
    // Replace from the end, so earlier indexes stay valid.
    for (const { parent, index, images } of found.reverse()) {
      const ratios = await Promise.all(
        images.map((img) => aspectRatio(img.properties['src'], file)),
      );
      parent.children.splice(index, 1, ...images.map((img, i) => figureFor(img, ratios[i])));
    }
  };
}
