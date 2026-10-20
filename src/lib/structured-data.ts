// Structured data (schema.org, as JSON-LD): who the site belongs to, what each page is, and where it
// sits. Every page carries the WebSite and Person; the home page adds the business, posts a
// BlogPosting, and inner pages their breadcrumbs. Base.astro writes the graph into the page head.
import { SITE, SOCIAL } from '../consts';
import { melbourneMidnight } from './dates';

export type Thing = Record<string, unknown>;

/** The person's name as search engines should show it (the site's own name is styled lowercase). */
const NAME = 'Harrison Jennings';

const url = (path: string): string => new URL(path, SITE.url).href;

export const ids = {
  person: url('/#person'),
  website: url('/#website'),
  business: url('/#business'),
  blog: url('/blog/#blog'),
} as const;

const melbourne = {
  '@type': 'PostalAddress',
  addressLocality: 'Melbourne',
  addressRegion: 'VIC',
  addressCountry: 'AU',
};

export function person(): Thing {
  return {
    '@type': 'Person',
    '@id': ids.person,
    name: NAME,
    url: url('/'),
    jobTitle: 'Marketing technology consultant',
    address: melbourne,
    sameAs: [SOCIAL.linkedin.href, SOCIAL.github.href],
  };
}

export function website(): Thing {
  return {
    '@type': 'WebSite',
    '@id': ids.website,
    name: NAME,
    url: url('/'),
    inLanguage: SITE.locale,
    publisher: { '@id': ids.person },
  };
}

/** The consulting business, with what it offers (the home page's "what I do"). */
export function business(services: Array<{ name: string; description: string }>): Thing {
  return {
    '@type': 'ProfessionalService',
    '@id': ids.business,
    name: NAME,
    url: url('/'),
    description: SITE.description,
    address: melbourne,
    areaServed: { '@type': 'Country', name: 'Australia' },
    founder: { '@id': ids.person },
    makesOffer: services.map((service) => ({
      '@type': 'Offer',
      itemOffered: { '@type': 'Service', name: service.name, description: service.description },
    })),
  };
}

export function blog(description: string): Thing {
  return {
    '@type': 'Blog',
    '@id': ids.blog,
    name: `${NAME}'s blog`,
    url: url('/blog/'),
    description,
    inLanguage: SITE.locale,
    author: { '@id': ids.person },
    publisher: { '@id': ids.person },
  };
}

/** A list page inside the blog: a topic. */
export function collectionPage(page: { path: string; name: string; description: string }): Thing {
  return {
    '@type': 'CollectionPage',
    '@id': url(`${page.path}#page`),
    url: url(page.path),
    name: page.name,
    description: page.description,
    inLanguage: SITE.locale,
    isPartOf: { '@id': ids.blog },
  };
}

export interface PostFacts {
  path: string;
  title: string;
  description: string;
  published: Date;
  updated?: Date | undefined;
  /** The share card's address (absolute, or a path on the site). */
  image: string;
  topics: string[];
}

export function blogPosting(post: PostFacts): Thing {
  return {
    '@type': 'BlogPosting',
    '@id': url(`${post.path}#post`),
    mainEntityOfPage: url(post.path),
    url: url(post.path),
    // Google shows at most 110 characters of a headline.
    headline: post.title.slice(0, 110),
    description: post.description,
    image: [url(post.image)],
    datePublished: melbourneMidnight(post.published),
    dateModified: melbourneMidnight(post.updated ?? post.published),
    author: { '@type': 'Person', '@id': ids.person, name: NAME, url: url('/') },
    publisher: { '@id': ids.person },
    isPartOf: { '@id': ids.blog },
    inLanguage: SITE.locale,
    ...(post.topics.length > 0 && { keywords: post.topics }),
  };
}

/** Breadcrumbs from the home page down, the last being the page itself. */
export function breadcrumbs(trail: Array<{ name: string; path: string }>): Thing {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: [{ name: 'home', path: '/' }, ...trail].map((crumb, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: crumb.name,
      item: url(crumb.path),
    })),
  };
}

/** The page's whole graph, as the text of its JSON-LD script (`<` escaped, so it can't end early). */
export function graph(things: Thing[]): string {
  const all = [website(), person(), ...things];
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': all }).replaceAll(
    '<',
    '\\u003c',
  );
}
