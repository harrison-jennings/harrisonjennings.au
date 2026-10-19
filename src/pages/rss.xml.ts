import rss from '@astrojs/rss';
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { SITE } from '../consts';
import { feedOptions, feedPath } from '../lib/feed';
import { getPosts } from '../lib/posts';

// Every published post, newest first. WordPress's /feed/ redirects here (public/_redirects).
export const GET: APIRoute = async ({ site }) => {
  const topics = await getCollection('topics');
  return rss(
    feedOptions({
      title: SITE.name,
      description: SITE.description,
      site: site ?? SITE.url,
      posts: await getPosts(),
      topicNames: new Map(topics.map((t) => [t.id, t.data.name])),
      self: feedPath(),
    }),
  );
};
