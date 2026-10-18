import type { CollectionEntry } from 'astro:content';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TOPIC_PAGE_MIN_POSTS } from '../../src/consts';
import {
  getPosts,
  getTopicPages,
  isPublished,
  postPath,
  postSlug,
  topicPath,
} from '../../src/lib/posts';

const collections: Record<string, unknown[]> = { posts: [], topics: [] };

vi.mock('astro:content', () => ({
  getCollection: vi.fn(async (name: string, filter?: (entry: unknown) => boolean) =>
    (collections[name] ?? []).filter(filter ?? (() => true)),
  ),
}));

const post = (
  id: string,
  published: string,
  { draft = false, topics = [] as string[] } = {},
): CollectionEntry<'posts'> =>
  ({
    id,
    collection: 'posts',
    data: {
      title: id,
      description: '',
      published: new Date(published),
      draft,
      topics: topics.map((t) => ({ collection: 'topics', id: t })),
    },
  }) as unknown as CollectionEntry<'posts'>;

const topic = (id: string): CollectionEntry<'topics'> =>
  ({ id, collection: 'topics', data: { name: id, description: '' } }) as CollectionEntry<'topics'>;

describe('postSlug and postPath', () => {
  it('uses the folder name as the slug', () => {
    expect(postSlug(post('hello-world/index', '2026-01-01'))).toBe('hello-world');
    expect(postSlug(post('hello-world', '2026-01-01'))).toBe('hello-world');
  });

  it('strips only a trailing /index', () => {
    expect(postSlug(post('indexing/index', '2026-01-01'))).toBe('indexing');
    expect(postSlug(post('a/index-of-things', '2026-01-01'))).toBe('a/index-of-things');
  });

  it('publishes posts at /blog/<slug>/ with a trailing slash', () => {
    expect(postPath(post('hello-world/index', '2026-01-01'))).toBe('/blog/hello-world/');
  });
});

describe('topicPath', () => {
  it('publishes topics at /blog/topic/<id>/', () => {
    expect(topicPath(topic('analytics'))).toBe('/blog/topic/analytics/');
  });
});

describe('isPublished', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('shows drafts in dev', () => {
    vi.stubEnv('DEV', true);
    expect(isPublished(post('a', '2026-01-01', { draft: true }))).toBe(true);
  });

  it('hides drafts from a build', () => {
    vi.stubEnv('DEV', false);
    expect(isPublished(post('a', '2026-01-01', { draft: true }))).toBe(false);
    expect(isPublished(post('b', '2026-01-01'))).toBe(true);
  });
});

describe('getPosts', () => {
  beforeEach(() => {
    vi.stubEnv('DEV', false);
    collections['posts'] = [
      post('older/index', '2025-03-01'),
      post('draft/index', '2026-09-01', { draft: true }),
      post('newest/index', '2026-06-01'),
      post('middle/index', '2025-11-15'),
    ];
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns published posts, newest first', async () => {
    expect((await getPosts()).map(postSlug)).toEqual(['newest', 'middle', 'older']);
  });

  it('includes drafts in dev', async () => {
    vi.stubEnv('DEV', true);
    expect((await getPosts()).map(postSlug)).toEqual(['draft', 'newest', 'middle', 'older']);
  });
});

describe('getTopicPages', () => {
  beforeEach(() => {
    vi.stubEnv('DEV', false);
    collections['topics'] = [topic('analytics'), topic('automation'), topic('media')];
    collections['posts'] = [
      post('a/index', '2026-01-01', { topics: ['analytics', 'automation'] }),
      post('b/index', '2026-03-01', { topics: ['analytics'] }),
      post('c/index', '2026-02-01', { topics: ['automation'] }),
      post('d/index', '2026-04-01', { topics: ['media'], draft: true }),
      post('e/index', '2026-05-01', { topics: ['media'] }),
    ];
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it(`gives a topic a page once it has ${TOPIC_PAGE_MIN_POSTS} published posts`, async () => {
    const pages = await getTopicPages();
    expect(pages.map((p) => p.topic.id)).toEqual(['analytics', 'automation']);
  });

  it('lists each topic page’s posts newest first', async () => {
    const pages = await getTopicPages();
    expect(pages.map((p) => p.posts.map(postSlug))).toEqual([
      ['b', 'a'],
      ['c', 'a'],
    ]);
  });

  it('doesn’t count drafts towards a topic page', async () => {
    const pages = await getTopicPages();
    expect(pages.find((p) => p.topic.id === 'media')).toBeUndefined();
  });
});
