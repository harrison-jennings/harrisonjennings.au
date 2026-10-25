/** The part of an example file worth copying: its markup, without the frontmatter that imports things. */
export const usage = (source: string): string => source.replace(/^---[\s\S]*?---\s*/, '').trim();
