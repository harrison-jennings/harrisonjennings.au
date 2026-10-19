// Topics with their own pages (two or more published posts), most posts first.
import { getTopicPages } from './posts';

export async function topicChips() {
  const pages = await getTopicPages();
  return pages
    .map(({ topic, posts }) => ({ topic, count: posts.length }))
    .sort((a, b) => b.count - a.count || a.topic.data.name.localeCompare(b.topic.data.name));
}

export async function topicPageIds(): Promise<Set<string>> {
  return new Set((await getTopicPages()).map(({ topic }) => topic.id));
}
