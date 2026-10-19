import type { MarkdownHeading } from 'astro';
import type { CollectionEntry } from 'astro:content';
import { describe, expect, it } from 'vitest';
import { byYear, keepReading, tocHeadings } from '../../src/lib/blog';

const post = (
  id: string,
  published: string,
  topics: string[] = [],
  related?: string[],
): CollectionEntry<'posts'> =>
  ({
    id,
    collection: 'posts',
    data: {
      title: id,
      published: new Date(published),
      topics: topics.map((t) => ({ collection: 'topics', id: t })),
      related: related?.map((r) => ({ collection: 'posts', id: r })),
      toc: true,
    },
  }) as unknown as CollectionEntry<'posts'>;

const ids = (posts: CollectionEntry<'posts'>[]) => posts.map((p) => p.id);

describe('keepReading', () => {
  const posts = [
    post('me', '2026-08-13', ['ma', 'ame', 'cloud']),
    post('three-shared', '2025-11-17', ['ma', 'ame', 'cloud']),
    post('two-shared-new', '2026-10-16', ['ma', 'ame']),
    post('two-shared-old', '2026-01-01', ['ma', 'ame']),
    post('one-shared', '2026-09-23', ['cloud']),
    post('none-newest', '2026-10-18', ['other']),
    post('none-old', '2024-01-01', ['other']),
  ];
  const me = posts[0]!;

  it('picks the posts sharing the most topics, newest first on a tie', () => {
    expect(ids(keepReading(me, posts))).toEqual([
      'three-shared',
      'two-shared-new',
      'two-shared-old',
    ]);
  });

  it('tops up with the latest posts when too few share a topic', () => {
    const lonely = post('lonely', '2026-01-02', ['cloud']);
    expect(ids(keepReading(lonely, [lonely, ...posts.slice(4)]))).toEqual([
      'one-shared',
      'none-newest',
      'none-old',
    ]);
  });

  it('never includes the post itself', () => {
    expect(ids(keepReading(me, posts))).not.toContain('me');
  });

  it('uses the post’s own related list when it has one', () => {
    const picky = post('picky', '2026-01-03', ['ma'], ['none-old', 'one-shared']);
    expect(ids(keepReading(picky, [picky, ...posts]))).toEqual(['none-old', 'one-shared']);
  });

  it('returns fewer than three when there aren’t enough posts', () => {
    expect(ids(keepReading(me, [me]))).toEqual([]);
  });
});

describe('tocHeadings', () => {
  const h = (depth: number, slug: string): MarkdownHeading => ({ depth, slug, text: slug });
  const three = [h(2, 'a'), h(3, 'a1'), h(4, 'a1x'), h(2, 'b'), h(2, 'c'), h(2, 'footnote-label')];

  it('lists h2s and h3s (not h4s or the footnotes heading) from three h2s', () => {
    expect(tocHeadings(three, true).map((x) => x.slug)).toEqual(['a', 'a1', 'b', 'c']);
  });

  it('is empty with fewer than three h2s, or with toc: false', () => {
    expect(tocHeadings([h(2, 'a'), h(2, 'b'), h(2, 'footnote-label')], true)).toEqual([]);
    expect(tocHeadings(three, false)).toEqual([]);
  });
});

describe('byYear', () => {
  it('groups posts by year, newest year first, keeping their order', () => {
    const groups = byYear([
      post('c', '2026-10-01'),
      post('b', '2026-01-01'),
      post('a', '2025-11-17'),
    ]);
    expect(groups.map((g) => [g.year, ids(g.posts)])).toEqual([
      [2026, ['c', 'b']],
      [2025, ['a']],
    ]);
  });
});
