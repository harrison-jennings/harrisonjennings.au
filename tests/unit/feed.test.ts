import rss from '@astrojs/rss';
import type { CollectionEntry } from 'astro:content';
import { describe, expect, it } from 'vitest';
import { feedItem, feedOptions, feedPath, feedUrl } from '../../src/lib/feed';

const post = (
  id: string,
  published: string,
  extra: { wpId?: number; topics?: string[] } = {},
): CollectionEntry<'posts'> =>
  ({
    id: `${id}/index`,
    collection: 'posts',
    data: {
      title: `title of ${id}`,
      description: `description of ${id}`,
      published: new Date(published),
      topics: (extra.topics ?? []).map((t) => ({ collection: 'topics', id: t })),
      wpId: extra.wpId,
    },
  }) as unknown as CollectionEntry<'posts'>;

const names = new Map([['ma', 'marketing automation']]);

describe('feed addresses', () => {
  it('has one feed for the blog and one per topic', () => {
    expect(feedPath()).toBe('/rss.xml');
    expect(feedPath('cloud')).toBe('/blog/topic/cloud/rss.xml');
    expect(feedUrl()).toBe('https://www.harrisonjennings.au/rss.xml');
  });
});

describe('feed items', () => {
  it('links to the post and names its topics', () => {
    const item = feedItem(post('new-post', '2026-10-16', { topics: ['ma', 'gone'] }), names);
    expect(item).toMatchObject({
      title: 'title of new-post',
      description: 'description of new-post',
      link: '/blog/new-post/',
      categories: ['marketing automation'],
    });
    expect(item.customData).toBeUndefined();
  });

  it("keeps a migrated post's WordPress guid, so readers don't show it again", async () => {
    const response = await rss(
      feedOptions({
        title: 't',
        description: 'd',
        site: 'https://www.harrisonjennings.au',
        posts: [post('old-post', '2026-08-13', { wpId: 482 }), post('new-post', '2026-10-16')],
        topicNames: names,
        self: feedPath(),
      }),
    );
    const xml = await response.text();
    expect(xml).toContain(
      '<guid isPermaLink="false">https://www.harrisonjennings.au/?p=482</guid>',
    );
    expect(xml).toContain(
      '<guid isPermaLink="true">https://www.harrisonjennings.au/blog/new-post/</guid>',
    );
    expect(xml.match(/<guid/g)).toHaveLength(2);
    expect(xml).toContain('<atom:link href="https://www.harrisonjennings.au/rss.xml" rel="self"');
    expect(xml).not.toContain('xml-stylesheet');
  });
});
