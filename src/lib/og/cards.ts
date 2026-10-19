// Which pages get which share card. Every page with its own card is listed here; any other page
// (the legal pages, the 404) shares the home card. Rendered to /og/<path>.png at build
// (src/pages/og/[...path].png.ts).
import { getCollection, getEntry } from 'astro:content';
import { SITE } from '../../consts';
import { formatDate } from '../dates';
import { getPosts, getTopicPages, mainTopic, postPath, topicPath } from '../posts';
import type { Card } from './card';

export interface ShareCard {
  /** Where the image is published: /og/<path>.png. */
  image: string;
  /** The page it belongs to, if any (project cards have no page of their own yet). */
  page?: string;
  card: Card;
}

/** /blog/some-post/ → /og/blog/some-post.png; the home page → /og/index.png. */
export const cardImagePath = (page: string): string =>
  page === '/' ? '/og/index.png' : `/og${page.replace(/\/$/, '')}.png`;

/** A page's address as the card shows it: harrisonjennings.au/blog. */
const address = (page: string): string =>
  `${new URL(SITE.url).hostname.replace(/^www\./, '')}${page.replace(/\/$/, '')}`;

const entry = async <T>(
  value: PromiseLike<T | undefined> | undefined,
  where: string,
): Promise<T> => {
  const found = await value;
  if (!found) throw new Error(`${where}: missing entry`);
  return found;
};

let cards: Promise<ShareCard[]> | undefined;

export function shareCards(): Promise<ShareCard[]> {
  return (cards ??= build());
}

async function build(): Promise<ShareCard[]> {
  const [home, blog, projectsPage, rss, topics, projects, posts, topicPages] = await Promise.all([
    entry(getEntry('home', 'home'), 'src/content/home.yaml'),
    entry(getEntry('blog', 'blog'), 'src/content/blog.yaml'),
    entry(getEntry('projectsPage', 'projects'), 'src/content/projects-page.yaml'),
    entry(getEntry('rss', 'rss'), 'src/content/rss.yaml'),
    getCollection('topics'),
    getCollection('projects'),
    getPosts(),
    getTopicPages(),
  ]);
  const topicName = new Map(topics.map((t) => [t.id, t.data.name]));
  const page = (path: string, card: Card): ShareCard => ({
    image: cardImagePath(path),
    page: path,
    card,
  });

  return [
    page('/', {
      kind: 'home',
      headline: home.data.headline,
      lead: home.data.lead,
      line: home.data.shareLine,
    }),
    page('/blog/', {
      kind: 'page',
      title: 'blog',
      intro: blog.data.intro,
      address: address('/blog/'),
    }),
    ...topicPages.map(({ topic }) =>
      page(topicPath(topic), {
        kind: 'page',
        title: topic.data.name,
        intro: topic.data.description,
        address: address(topicPath(topic)),
      }),
    ),
    // A post with its own `socialImage` uses that instead (see src/pages/blog/[slug]/index.astro).
    ...posts
      .filter((post) => !post.data.socialImage)
      .map((post) => {
        const topic = mainTopic(post);
        return page(postPath(post), {
          kind: 'post',
          topic: topic && topicName.get(topic.id),
          title: post.data.title,
          date: formatDate(post.data.published),
        });
      }),
    page('/projects/', {
      kind: 'page',
      title: 'projects',
      intro: projectsPage.data.intro,
      address: address('/projects/'),
    }),
    ...projects
      .filter((project) => project.data.status === 'live')
      .map((project) => ({
        image: `/og/projects/${project.id}.png`,
        card: {
          kind: 'project' as const,
          name: project.data.name,
          summary: project.data.summary,
          host: project.data.host,
        },
      })),
    page('/rss/', {
      kind: 'page',
      title: 'rss feed',
      intro: rss.data.intro,
      address: address('/rss/'),
    }),
  ];
}

/** The card a page shares: its own, or the home card. */
export async function shareImageFor(page: string): Promise<string> {
  const own = (await shareCards()).find((c) => c.page === page);
  return own ? own.image : cardImagePath('/');
}
