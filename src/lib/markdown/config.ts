// The Markdown pipeline for posts and pages, shared by the site (astro.config.mjs) and the design
// system (design-system/astro.config.mjs), so a content example there renders exactly as a post does.
// See docs/content.md for what each plugin adds.
import type { AstroUserConfig } from 'astro';
import remarkDirective from 'remark-directive';
import { remarkCallouts } from './callouts.ts';
import { remarkCookieSettings } from './cookie-settings.ts';
import { remarkCookieTable } from './cookie-table.ts';
import { remarkTextDirectivesAsText } from './directives.ts';
import { rehypeExternalLinks } from './links.ts';
import { codeLangs, codeTheme, codeTransformer, rehypeCodeBlocks } from './code.ts';
import { rehypeFigures, remarkNoZoom } from './images.ts';
import { remarkReadingTime } from './reading-time.ts';
import { rehypeHeadingCeiling, rehypeTables } from './structure.ts';

export const markdown: NonNullable<AstroUserConfig['markdown']> = {
  remarkPlugins: [
    remarkDirective,
    remarkCallouts,
    remarkCookieSettings,
    remarkCookieTable,
    remarkTextDirectivesAsText,
    remarkNoZoom,
    remarkReadingTime,
  ],
  rehypePlugins: [
    rehypeHeadingCeiling,
    rehypeTables,
    rehypeFigures,
    rehypeCodeBlocks,
    rehypeExternalLinks,
  ],
  remarkRehype: {
    footnoteLabel: 'Footnotes',
    footnoteLabelProperties: { className: ['visually-hidden'] },
    footnoteBackLabel: 'Back to the text',
  },
  shikiConfig: {
    theme: codeTheme,
    langs: codeLangs,
    transformers: [codeTransformer()],
    wrap: false,
  },
};
