// The VS Code snippets (Front Matter's, in frontmatter.json under frontMatter.content.snippets), read at
// build time: a content page names the ones that insert its element, and the page head says where to
// find each. A name that isn't a snippet fails the build, so a renamed snippet can't leave a page wrong.
import settings from '../../../frontmatter.json';

interface Snippet {
  title?: string;
  description?: string;
  /** Inserted from the media dashboard, around a chosen image, rather than from Insert snippet. */
  isMediaSnippet?: boolean;
}

export const SNIPPETS = settings['frontMatter.content.snippets'] as Record<string, Snippet>;

/** Where to find a snippet in VS Code: "Insert snippet › callout", or "Media › image" for an image. */
export function snippetPath(name: string, page: string): string {
  const snippet = SNIPPETS[name];
  if (!snippet) throw new Error(`docs/${page}: no snippet "${name}" in frontmatter.json`);
  return `${snippet.isMediaSnippet ? 'Media' : 'Insert snippet'} › ${name}`;
}
