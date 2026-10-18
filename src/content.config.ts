import { defineCollection, reference } from 'astro:content';
import { file, glob } from 'astro/loaders';
import { z } from 'astro/zod';

// Posts live at src/content/posts/<slug>/index.md with their images beside them.
// They publish at /blog/<slug>/ (see src/lib/posts.ts).
const posts = defineCollection({
  loader: glob({ base: './src/content/posts', pattern: '**/index.{md,mdx}' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string().max(180),
      published: z.coerce.date(),
      updated: z.coerce.date().optional(),
      topics: z.array(reference('topics')).default([]),
      draft: z.boolean().default(false),
      cover: image().optional(),
      coverAlt: z.string().optional(),
      socialImage: image().optional(),
      /** The WordPress post ID, kept so feed readers don't show migrated posts as new. */
      wpId: z.number().int().optional(),
    }),
});

// Standalone pages such as the privacy policy and terms of use.
const pages = defineCollection({
  loader: glob({ base: './src/content/pages', pattern: '*.{md,mdx}' }),
  schema: z.object({
    title: z.string(),
    description: z.string().max(180),
    updated: z.coerce.date(),
  }),
});

// One fixed list of topics; a post can have several. A topic gets its own page at
// /blog/topic/<id>/ once it has enough posts (TOPIC_PAGE_MIN_POSTS in src/consts.ts).
const topics = defineCollection({
  loader: file('src/content/topics.yaml'),
  schema: z.object({
    name: z.string(),
    description: z.string().max(180),
  }),
});

const projects = defineCollection({
  loader: file('src/content/projects.yaml'),
  schema: ({ image }) =>
    z.object({
      name: z.string(),
      summary: z.string().max(240),
      host: z.string().optional(),
      url: z.url().optional(),
      repo: z.url().optional(),
      story: reference('posts').optional(),
      image: image().optional(),
      featured: z.boolean().default(false),
      order: z.number().default(100),
      status: z.enum(['live', 'archived']).default('live'),
    }),
});

export const collections = { posts, pages, topics, projects };
