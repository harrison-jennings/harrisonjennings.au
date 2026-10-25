// The navigation, built from the pages that exist: sections (in SECTIONS order) holding their groups,
// holding their pages by `order`. Sections and groups without pages are left out.
import { getCollection, type CollectionEntry } from 'astro:content';
import { SECTIONS, type Group, type Section } from './sections';

export type Doc = CollectionEntry<'docs'>;

export interface NavPage {
  id: string;
  title: string;
  href: string;
}
export interface NavGroup extends Group {
  pages: NavPage[];
}
export interface NavSection extends Section {
  href: string;
  groups: NavGroup[];
}

/** The section a page belongs to: the first part of its path. */
export const sectionOf = (doc: Doc): string => doc.id.split('/')[0] ?? '';

export const hrefOf = (doc: Doc): string => `/${doc.id}/`;

export async function getNav(): Promise<NavSection[]> {
  const docs = await getCollection('docs');
  for (const doc of docs) {
    const section = SECTIONS.find((s) => s.id === sectionOf(doc));
    if (!section)
      throw new Error(`docs/${doc.id}: no section "${sectionOf(doc)}" (src/lib/sections.ts)`);
    if (!section.groups.some((g) => g.name === doc.data.group))
      throw new Error(`docs/${doc.id}: no group "${doc.data.group}" in ${section.id}`);
  }
  return SECTIONS.map((section) => {
    const groups = section.groups
      .map((group) => ({
        ...group,
        pages: docs
          .filter((d) => sectionOf(d) === section.id && d.data.group === group.name)
          .sort((a, b) => a.data.order - b.data.order || a.data.title.localeCompare(b.data.title))
          .map((d) => ({ id: d.id, title: d.data.title, href: hrefOf(d) })),
      }))
      .filter((g) => g.pages.length > 0);
    // The overview's front door is the landing page at /.
    const href = section.id === 'overview' ? '/' : (groups[0]?.pages[0]?.href ?? '/');
    return { ...section, href, groups };
  }).filter((s) => s.id === 'overview' || s.groups.length > 0);
}
