import { defineCollection } from 'astro:content';
import { file, glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { parse } from 'yaml';
import { collections as site } from '../../src/content.config';

// The design system's pages: src/content/docs/<section>/<page>.mdx, published at /<section>/<page>/.
// MDX, so the wording can be edited without touching code and a page can still show components.
const docs = defineCollection({
  loader: glob({ base: './src/content/docs', pattern: '**/*.mdx' }),
  schema: z.object({
    /** The page's name: lowercase, the site's own words. */
    title: z.string(),
    /** One or two sentences under the title. */
    lead: z.string(),
    /** Its group within the section (src/lib/sections.ts), as named there. */
    group: z.string(),
    /** Its place in the group. */
    order: z.number(),
    /** The facts line under the lead: label, value, and an optional link. */
    facts: z
      .array(z.object({ label: z.string(), value: z.string(), href: z.string().optional() }))
      .default([]),
    /**
     * The file the page documents, from the repository's root (src/components/Button.astro). The page
     * head links to it and, for a component, says where it's used, worked out from the site's imports.
     */
    component: z.string().optional(),
    /** The VS Code snippets that insert a content element, by name (frontmatter.json). */
    snippets: z.array(z.string()).default([]),
    /** Related pages, by id (components/text-link), each with a line on why. */
    related: z.array(z.object({ page: z.string(), line: z.string() })).default([]),
  }),
});

// The overview's wording (the landing page at /): everything but its counts, which are worked out.
const overview = defineCollection({
  loader: file('src/content/overview.yaml'),
  schema: z.object({
    eyebrow: z.string(),
    lead: z.string(),
    /** "start here": one line per section, by its id (src/lib/sections.ts), and the tokens card. */
    cards: z.record(z.string(), z.string()),
    /** "how to use it": exactly three steps. */
    steps: z.array(z.object({ title: z.string(), text: z.string() })).length(3),
    /** The line under "what changed". */
    history: z.string(),
  }),
});

// "what changed" on the overview: a row per change worth knowing about, newest first. Written by hand,
// not taken from git, so it says what changed for someone using the design system.
const changes = defineCollection({
  loader: file('src/content/changes.yaml', {
    parser: (text) =>
      (parse(text) as Record<string, unknown>[]).map((row, i) => ({ id: String(i), ...row })),
  }),
  schema: z.object({
    date: z.coerce.date(),
    line: z.string(),
    /** The pull request's number. */
    pr: z.number().int(),
  }),
});

// The templates gallery: every kind of page on the site, with the page that's shot for its thumbnails.
const templates = defineCollection({
  loader: file('src/content/templates.yaml'),
  schema: z.object({
    name: z.string(),
    /** How the gallery names its address: /blog/<slug>/, any missing page. */
    route: z.string(),
    /** The page shot for the thumbnails (npm run design:shots) and opened by "open live". */
    path: z.string().startsWith('/'),
    note: z.string(),
  }),
});

// The site's own collections too (posts, projects, the home page's wording, consent…), so the site's
// components render here with exactly what they show on harrisonjennings.au.
export const collections = { ...site, docs, overview, changes, templates };
