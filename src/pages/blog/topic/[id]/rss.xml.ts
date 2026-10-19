import rss from '@astrojs/rss';
import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection, type CollectionEntry } from 'astro:content';
import { SITE } from '../../../../consts';
import { feedOptions, feedPath } from '../../../../lib/feed';
import { getTopicPages } from '../../../../lib/posts';

// One feed per topic page, for readers who only want that topic.
export const getStaticPaths = (async () =>
  (await getTopicPages()).map(({ topic, posts }) => ({
    params: { id: topic.id },
    props: { topic, posts },
  }))) satisfies GetStaticPaths;

interface Props {
  topic: CollectionEntry<'topics'>;
  posts: Array<CollectionEntry<'posts'>>;
}

export const GET: APIRoute<Props> = async ({ props, site }) => {
  const topics = await getCollection('topics');
  return rss(
    feedOptions({
      title: `${props.topic.data.name} · ${SITE.name}`,
      description: props.topic.data.description,
      site: site ?? SITE.url,
      posts: props.posts,
      topicNames: new Map(topics.map((t) => [t.id, t.data.name])),
      self: feedPath(props.topic.id),
    }),
  );
};
