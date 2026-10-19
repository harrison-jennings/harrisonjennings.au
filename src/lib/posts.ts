import { getCollection, type CollectionEntry } from 'astro:content';
import { TOPIC_PAGE_MIN_POSTS } from '../consts';

/** A post's slug is its folder name: src/content/posts/<slug>/index.md. */
export const postSlug = (post: CollectionEntry<'posts'>): string => post.id.replace(/\/index$/, '');

/** The URL for a post: /blog/<slug>/. */
export const postPath = (post: CollectionEntry<'posts'>): string => `/blog/${postSlug(post)}/`;

/** The URL for a topic's page: /blog/topic/<id>/. */
export const topicPath = (topic: CollectionEntry<'topics'>): string => `/blog/topic/${topic.id}/`;

/** Drafts show in `npm run dev` only, never in a build. */
export const isPublished = (post: CollectionEntry<'posts'>): boolean =>
  import.meta.env.DEV || !post.data.draft;

/** Published posts, newest first. */
export async function getPosts(): Promise<CollectionEntry<'posts'>[]> {
  const posts = await getCollection('posts', isPublished);
  return posts.sort((a, b) => b.data.published.valueOf() - a.data.published.valueOf());
}

/** Topics with enough published posts to earn their own page, each with its posts. */
export async function getTopicPages(): Promise<
  Array<{ topic: CollectionEntry<'topics'>; posts: CollectionEntry<'posts'>[] }>
> {
  const [topics, posts] = await Promise.all([getCollection('topics'), getPosts()]);
  return topics
    .map((topic) => ({
      topic,
      posts: posts.filter((post) => post.data.topics.some((ref) => ref.id === topic.id)),
    }))
    .filter((entry) => entry.posts.length >= TOPIC_PAGE_MIN_POSTS);
}

/** A post's main topic: the first in its `topics` list (shown above the title and on its cards). */
export const mainTopic = (post: CollectionEntry<'posts'>) => post.data.topics[0];
