import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

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
  }),
});

export const collections = { docs };
