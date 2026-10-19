// The RSS feeds: /rss.xml (every post) and /blog/topic/<id>/rss.xml (each topic page). Raw XML for
// feed readers, with no stylesheet; people reading in a browser get the /rss/ page instead.
import type { RSSFeedItem, RSSOptions } from '@astrojs/rss';
import type { CollectionEntry } from 'astro:content';
import { SITE } from '../consts';
import { postPath } from './posts';

/** The address of every feed: the whole blog, or one topic. */
export const feedPath = (topicId?: string): string =>
  topicId ? `/blog/topic/${topicId}/rss.xml` : '/rss.xml';

/** The same address in full, for people to copy into a reader. */
export const feedUrl = (topicId?: string): string => new URL(feedPath(topicId), SITE.url).href;

/**
 * One post as a feed item. A migrated post keeps the guid WordPress gave it
 * (https://www.harrisonjennings.au/?p=<wpId>), so readers don't show it again as new.
 */
export function feedItem(
  post: CollectionEntry<'posts'>,
  topicNames: ReadonlyMap<string, string>,
): RSSFeedItem {
  const { title, description, published, topics, wpId } = post.data;
  return {
    title,
    description,
    pubDate: published,
    link: postPath(post),
    categories: topics.flatMap((t) => topicNames.get(t.id) ?? []),
    ...(wpId === undefined
      ? {}
      : { customData: `<guid isPermaLink="false">${SITE.url}/?p=${wpId}</guid>` }),
  };
}

/** The feed itself: newest first, every published post given (drafts never are). */
export function feedOptions({
  title,
  description,
  site,
  posts,
  topicNames,
  self,
}: {
  title: string;
  description: string;
  site: URL | string;
  posts: Array<CollectionEntry<'posts'>>;
  topicNames: ReadonlyMap<string, string>;
  /** The feed's own path, for the atom:link readers use to check where it lives. */
  self: string;
}): RSSOptions {
  return {
    title,
    description,
    site,
    items: posts.map((post) => feedItem(post, topicNames)),
    xmlns: { atom: 'http://www.w3.org/2005/Atom' },
    customData: `<language>en-au</language><atom:link href="${new URL(self, site).href}" rel="self" type="application/rss+xml"/>`,
    trailingSlash: true,
  };
}
