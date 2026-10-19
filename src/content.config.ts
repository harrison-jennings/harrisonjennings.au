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

// "what I do" on the home page: each service has a short paragraph and exactly three tools.
const services = defineCollection({
  loader: file('src/content/services.yaml'),
  schema: z.object({
    name: z.string(),
    description: z.string().max(200),
    tools: z.array(z.string()).length(3),
    order: z.number().default(100),
  }),
});

// "what people are saying". The home page shows them as a moving row once there are five or more;
// with fewer they sit still, side by side.
const testimonials = defineCollection({
  loader: file('src/content/testimonials.yaml'),
  schema: z.object({
    quote: z.string().max(280),
    name: z.string(),
    role: z.string(),
    order: z.number().default(100),
  }),
});

// The home page's own wording: the hero and the booking band.
const home = defineCollection({
  loader: file('src/content/home.yaml'),
  schema: z.object({
    headline: z.array(z.string()).min(1),
    lead: z.string(),
    intro: z.string(),
    booking: z.object({ title: z.string(), note: z.string() }),
  }),
});

export const collections = { posts, pages, topics, projects, services, testimonials, home };
