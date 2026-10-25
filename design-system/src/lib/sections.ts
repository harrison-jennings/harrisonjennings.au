// The design system's sections and their groups, in order: the one fixed part of its navigation.
// Pages (src/content/docs/<section>/<page>.mdx) name their group in frontmatter; the header, sidebar,
// phone menu and breadcrumbs are built from the pages that exist (nav.ts), and a section or group
// shows once it has a page. Names are the site's own words, lowercase.

export interface Group {
  id: string;
  name: string;
}

export interface Section {
  id: string;
  name: string;
  groups: Group[];
}

const groups = (...names: string[]): Group[] =>
  names.map((name) => ({ id: name.replace(/\s+/g, '-'), name }));

export const SECTIONS: Section[] = [
  { id: 'overview', name: 'overview', groups: groups('start') },
  { id: 'brand', name: 'brand', groups: groups('identity', 'guidance') },
  { id: 'foundations', name: 'foundations', groups: groups('layout', 'rules') },
  {
    id: 'components',
    name: 'components',
    groups: groups('actions', 'navigation', 'brand', 'content', 'home', 'blog', 'site'),
  },
  { id: 'content', name: 'content', groups: groups('text', 'code and data', 'media', 'reference') },
  { id: 'templates', name: 'templates', groups: groups('pages', 'home', 'blog', 'site') },
];
