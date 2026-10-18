export const SITE = {
  name: 'harrison jennings',
  url: 'https://www.harrisonjennings.au',
  locale: 'en-AU',
  tagline: 'marketing technology consultant, melbourne',
  description:
    'Tech-led marketing consultant in Melbourne: marketing automation, analytics and measurement, creative and media strategy.',
} as const;

export const NAV = [
  { label: 'home', href: '/' },
  { label: 'blog', href: '/blog/' },
  { label: 'projects', href: '/projects/' },
] as const;

export const BOOKING_URL = 'https://cal.com/harrison-jennings-jodnbf/30min';

export const SOCIAL = {
  github: { label: 'GitHub profile', href: 'https://github.com/harrison-jennings' },
  linkedin: { label: 'LinkedIn profile', href: 'https://www.linkedin.com/in/harrison-jennings/' },
} as const;

export const LEGAL = [
  { label: 'privacy', href: '/privacy-policy/' },
  { label: 'terms', href: '/terms-of-use/' },
] as const;

/** A topic gets its own page once this many published posts use it; below that it's a label only. */
export const TOPIC_PAGE_MIN_POSTS = 2;
