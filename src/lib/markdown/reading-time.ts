// Reading time, worked out at build: prose words ÷ 230, rounded up, at least 1 minute. Code blocks
// don't count (inline code does: it's part of a sentence).
import type { Root } from 'mdast';
import type { VFile } from 'vfile';
import { visit, SKIP } from 'unist-util-visit';

export const WORDS_PER_MINUTE = 230;

export function countWords(tree: Root): number {
  let words = 0;
  visit(tree, (node) => {
    if (node.type === 'code' || node.type === 'html') return SKIP;
    if (node.type === 'text' || node.type === 'inlineCode') {
      words += node.value.split(/\s+/).filter(Boolean).length;
    }
    return undefined;
  });
  return words;
}

export const readingMinutes = (words: number): number =>
  Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));

/** Adds `readingTime` (minutes) to the post's frontmatter, read back from render(). */
export function remarkReadingTime() {
  return (tree: Root, file: VFile) => {
    const astro = ((file.data as { astro?: { frontmatter?: Record<string, unknown> } }).astro ??=
      {});
    (astro.frontmatter ??= {})['readingTime'] = readingMinutes(countWords(tree));
  };
}
