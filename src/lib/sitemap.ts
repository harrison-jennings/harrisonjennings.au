// `lastmod` for the sitemap: when each page last changed, so search engines know what to recrawl.
// Read straight from the front matter (astro.config.mjs runs before content collections exist).
// Only pages with a real date get one: posts (updated, else published), the blog and each topic page
// (their newest published post), and the legal pages (updated). A guessed date is worse than none.
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import { isoDate } from './dates';

interface FrontMatter {
  published?: string | Date;
  updated?: string | Date;
  topics?: string[];
  draft?: boolean;
}

function frontMatter(file: string): FrontMatter {
  const match = readFileSync(file, 'utf8').match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return match ? ((parse(match[1] ?? '') as FrontMatter | null) ?? {}) : {};
}

const day = (value: string | Date | undefined): string | undefined =>
  value === undefined ? undefined : isoDate(new Date(value));

const newest = (days: string[]): string | undefined => [...days].sort().at(-1);

/** Each dated page's path (such as /blog/<slug>/) and its last-modified day. */
export function lastModified(contentDir = 'src/content'): Map<string, string> {
  const dates = new Map<string, string>();
  const byTopic = new Map<string, string[]>();
  const postsDir = join(contentDir, 'posts');
  const postDays: string[] = [];

  for (const slug of readdirSync(postsDir)) {
    const file = ['index.md', 'index.mdx'].map((f) => join(postsDir, slug, f)).find(existsSync);
    if (!file) continue;
    const data = frontMatter(file);
    const changed = day(data.updated ?? data.published);
    if (!changed) continue;
    // A draft is only built for the tests; it never dates the blog or its topics.
    dates.set(`/blog/${slug}/`, changed);
    if (data.draft) continue;
    postDays.push(changed);
    for (const topic of data.topics ?? [])
      byTopic.set(topic, [...(byTopic.get(topic) ?? []), changed]);
  }

  const blog = newest(postDays);
  if (blog) dates.set('/blog/', blog);
  for (const [topic, days] of byTopic) {
    const latest = newest(days);
    if (latest) dates.set(`/blog/topic/${topic}/`, latest);
  }

  const pagesDir = join(contentDir, 'pages');
  for (const name of readdirSync(pagesDir).filter((f) => f.endsWith('.md'))) {
    const updated = day(frontMatter(join(pagesDir, name)).updated);
    if (updated) dates.set(`/${name.replace(/\.md$/, '')}/`, updated);
  }
  return dates;
}
