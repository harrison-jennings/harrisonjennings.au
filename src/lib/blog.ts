// The blog's rules, as plain functions so they're unit-tested.
import type { CollectionEntry } from 'astro:content';
import type { MarkdownHeading } from 'astro';

type Post = CollectionEntry<'posts'>;

const topicIds = (post: Post) => new Set(post.data.topics.map((t) => t.id));
const newestFirst = (a: Post, b: Post) => b.data.published.valueOf() - a.data.published.valueOf();

/**
 * "keep reading": three posts. A post's own `related` list wins. Otherwise the posts sharing the
 * most topics with it, newest first on a tie, topped up with the latest posts.
 */
export function keepReading(post: Post, posts: readonly Post[], count = 3): Post[] {
  const others = posts.filter((p) => p.id !== post.id);
  if (post.data.related?.length) {
    const picked = post.data.related
      .map((ref) => others.find((p) => p.id === ref.id))
      .filter((p): p is Post => Boolean(p));
    if (picked.length) return picked.slice(0, count);
  }
  const mine = topicIds(post);
  const shared = (p: Post) => [...topicIds(p)].filter((id) => mine.has(id)).length;
  const scored = others
    .map((p) => ({ p, n: shared(p) }))
    .filter(({ n }) => n > 0)
    .sort((a, b) => b.n - a.n || newestFirst(a.p, b.p))
    .map(({ p }) => p);
  const latest = [...others].sort(newestFirst).filter((p) => !scored.includes(p));
  return [...scored, ...latest].slice(0, count);
}

export const TOC_MIN_SECTIONS = 3;

/** "on this page": the h2s and h3s, shown with three or more h2s unless the post sets `toc: false`. */
export function tocHeadings(
  headings: readonly MarkdownHeading[],
  enabled: boolean,
): MarkdownHeading[] {
  // Footnotes add their own (visually hidden) h2.
  const sections = headings.filter(
    (h) => (h.depth === 2 || h.depth === 3) && h.slug !== 'footnote-label',
  );
  if (!enabled || sections.filter((h) => h.depth === 2).length < TOC_MIN_SECTIONS) return [];
  return sections;
}

/** Posts grouped by the year they were published, newest year first (posts keep their order). */
export function byYear(posts: readonly Post[]): Array<{ year: number; posts: Post[] }> {
  const groups = new Map<number, Post[]>();
  for (const post of posts) {
    const year = post.data.published.getUTCFullYear();
    groups.set(year, [...(groups.get(year) ?? []), post]);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => b - a)
    .map(([year, list]) => ({ year, posts: list }));
}
