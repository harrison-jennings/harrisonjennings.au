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
      /** Search results and share previews only, in place of "<title> · harrison jennings". */
      searchTitle: z.string().max(65).optional(),
      /** Search results and share previews only, in place of `description` (which stays the dek). */
      searchDescription: z.string().max(155).optional(),
      published: z.coerce.date(),
      updated: z.coerce.date().optional(),
      topics: z.array(reference('topics')).default([]),
      draft: z.boolean().default(false),
      cover: image().optional(),
      coverAlt: z.string().optional(),
      socialImage: image().optional(),
      /** The WordPress post ID, kept so feed readers don't show migrated posts as new. */
      wpId: z.number().int().optional(),
      /** Hand-picks "keep reading" (up to three); otherwise posts sharing the most topics. */
      related: z.array(reference('posts')).max(3).optional(),
      /** "on this page" beside the text; also hidden when there are fewer than three h2s. */
      toc: z.boolean().default(true),
    }),
});

// The privacy policy and terms of use, at /<file name>/. The description is the intro under the title.
const pages = defineCollection({
  loader: glob({ base: './src/content/pages', pattern: '*.{md,mdx}' }),
  schema: z.object({
    title: z.string(),
    description: z.string().max(180),
    updated: z.coerce.date(),
    /** The words before the date: "Last updated" (privacy) or "Effective" (terms). */
    updatedLabel: z.string().default('Last updated'),
    /** "the short version": four or five plain-language points above the policy. */
    summary: z.array(z.string()).optional(),
    /** The closing line, followed by the contact email. */
    contact: z.object({ text: z.string(), email: z.email().optional() }),
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
      /** What it is, in a few words: "VS Code extension", "interactive API reference". */
      kind: z.string().optional(),
      /** The year it was built. */
      built: z.number().int().optional(),
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

// The blog's own wording: the index intro and the author panel under each post.
const blog = defineCollection({
  loader: file('src/content/blog.yaml'),
  schema: z.object({
    intro: z.string(),
    empty: z.string(),
    author: z.object({ bio: z.string() }),
  }),
});

// The home page's own wording: the hero and the booking band.
const home = defineCollection({
  loader: file('src/content/home.yaml'),
  schema: z.object({
    headline: z.array(z.string()).min(1),
    lead: z.string(),
    intro: z.string(),
    /** The line under the lead on the share card (the home card is every page's default). */
    shareLine: z.string(),
    booking: z.object({ title: z.string(), note: z.string() }),
  }),
});

// The projects page's own wording.
const projectsPage = defineCollection({
  loader: file('src/content/projects-page.yaml'),
  schema: z.object({ intro: z.string() }),
});

// The RSS page (/rss/): what a feed is and how to follow one.
const rss = defineCollection({
  loader: file('src/content/rss.yaml'),
  schema: z.object({
    intro: z.string(),
    note: z.string(),
    steps: z.array(z.object({ title: z.string(), text: z.string() })).length(3),
    topics: z.string(),
  }),
});

// The 404 page's wording. The title ends in the brick stop, so leave off its full stop.
const notFound = defineCollection({
  loader: file('src/content/not-found.yaml'),
  schema: z.object({ title: z.array(z.string()).min(1), text: z.string() }),
});

// The cookie banner and preferences dialog (see src/components/Consent.astro). The category ids are the
// ones CookieConsent and the consent log use; their order is the order in the dialog.
const consent = defineCollection({
  loader: file('src/content/consent.yaml'),
  schema: z.object({
    revision: z.number().int().positive(),
    banner: z.object({ title: z.string(), text: z.string() }),
    dialog: z.object({
      title: z.string(),
      intro: z.string(),
      end: z.string(),
      noCookies: z.string(),
    }),
    buttons: z.object({
      acceptAll: z.string(),
      rejectAll: z.string(),
      manage: z.string(),
      save: z.string(),
      close: z.string(),
      alwaysOn: z.string(),
    }),
    categories: z
      .array(
        z.object({
          id: z.enum(['necessary', 'analytics', 'advertising']),
          name: z.string(),
          description: z.string(),
          cookies: z.array(
            z.object({
              name: z.string(),
              domain: z.string(),
              purpose: z.string(),
              kept: z.string(),
            }),
          ),
        }),
      )
      .length(3),
  }),
});

export const collections = {
  posts,
  pages,
  topics,
  projects,
  services,
  testimonials,
  home,
  blog,
  projectsPage,
  rss,
  notFound,
  consent,
};
