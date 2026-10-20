import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { lastModified } from '../../src/lib/sitemap';
import {
  blogPosting,
  breadcrumbs,
  business,
  graph,
  ids,
  type Thing,
} from '../../src/lib/structured-data';

const post = {
  path: '/blog/a-post/',
  title: 'a post',
  description: 'What the post is about.',
  published: new Date('2026-08-13'),
  image: '/og/blog/a-post.png',
  topics: ['cloud'],
};

describe('structured data', () => {
  it('always carries the WebSite and the Person, whatever the page adds', () => {
    const things = JSON.parse(graph([]))['@graph'] as Thing[];
    expect(things.map((t) => t['@type'])).toEqual(['WebSite', 'Person']);
    expect(things[1]).toMatchObject({
      '@id': ids.person,
      name: 'Harrison Jennings',
      sameAs: expect.arrayContaining([expect.stringContaining('linkedin.com')]),
    });
  });

  it('describes a post with absolute addresses, Melbourne dates and its author', () => {
    expect(blogPosting(post)).toMatchObject({
      '@type': 'BlogPosting',
      url: 'https://www.harrisonjennings.au/blog/a-post/',
      image: ['https://www.harrisonjennings.au/og/blog/a-post.png'],
      datePublished: '2026-08-13T00:00:00+10:00',
      dateModified: '2026-08-13T00:00:00+10:00',
      author: { '@id': ids.person, name: 'Harrison Jennings' },
      keywords: ['cloud'],
    });
    expect(blogPosting({ ...post, updated: new Date('2026-10-16') })['dateModified']).toBe(
      '2026-10-16T00:00:00+11:00',
    );
  });

  it('keeps a headline within the 110 characters Google shows', () => {
    const headline = blogPosting({ ...post, title: 'x'.repeat(150) })['headline'] as string;
    expect(headline).toHaveLength(110);
  });

  it('starts breadcrumbs at home and numbers them from 1', () => {
    const list = breadcrumbs([{ name: 'blog', path: '/blog/' }])['itemListElement'] as Thing[];
    expect(list).toEqual([
      { '@type': 'ListItem', position: 1, name: 'home', item: 'https://www.harrisonjennings.au/' },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'blog',
        item: 'https://www.harrisonjennings.au/blog/',
      },
    ]);
  });

  it('lists each service the business offers', () => {
    const offers = business([{ name: 'marketing automation', description: 'Journeys.' }])[
      'makesOffer'
    ];
    expect(offers).toEqual([
      {
        '@type': 'Offer',
        itemOffered: { '@type': 'Service', name: 'marketing automation', description: 'Journeys.' },
      },
    ]);
  });

  it("escapes < so text can't close the script element", () => {
    const text = graph([breadcrumbs([{ name: '</script><b>', path: '/x/' }])]);
    expect(text).not.toContain('<');
    expect(JSON.stringify(JSON.parse(text))).toContain('</script><b>');
  });
});

describe('sitemap dates', () => {
  const site = () => {
    const dir = mkdtempSync(join(tmpdir(), 'content-'));
    const write = (path: string, front: string) => {
      mkdirSync(join(dir, path, '..'), { recursive: true });
      writeFileSync(join(dir, path), `---\n${front}\n---\n\nText.\n`);
    };
    write('posts/old/index.md', 'published: 2026-01-10\ntopics: [cloud]');
    write(
      'posts/new/index.mdx',
      'published: 2026-03-01\nupdated: 2026-05-20\ntopics: [cloud, web]',
    );
    write('posts/draft/index.md', 'published: 2026-09-01\ndraft: true\ntopics: [cloud]');
    write('pages/privacy-policy.md', 'updated: 2026-10-20');
    return dir;
  };

  it('dates posts by their update, else their publication', () => {
    const dates = lastModified(site());
    expect(dates.get('/blog/old/')).toBe('2026-01-10');
    expect(dates.get('/blog/new/')).toBe('2026-05-20');
  });

  it('dates the blog and each topic by their newest published post (never a draft), and legal pages by their update', () => {
    const dates = lastModified(site());
    expect(dates.get('/blog/')).toBe('2026-05-20');
    expect(dates.get('/blog/topic/cloud/')).toBe('2026-05-20');
    expect(dates.get('/blog/topic/web/')).toBe('2026-05-20');
    expect(dates.get('/privacy-policy/')).toBe('2026-10-20');
    expect(dates.has('/projects/')).toBe(false);
  });
});
