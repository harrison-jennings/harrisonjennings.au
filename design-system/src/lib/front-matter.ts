// A post's front matter fields, for the front matter reference, put together at build time so none of
// it is retyped:
// - the fields, their order and which are required (alone, or with another field): the posts schema
//   in src/content.config.ts;
// - what each does: Front Matter's own description of it (frontmatter.json), as its panel shows it;
// - an example: the value in the newest post that has the field.
// A schema field without a description fails the build, and so does a description that doesn't state
// the field's limit, so a new field or a changed limit can't leave the page wrong.
import { z } from 'astro/zod';
import { parse } from 'yaml';
import settings from '../../../frontmatter.json';
import { collections, REQUIRED_WITH } from '../../../src/content.config';

export interface Field {
  name: string;
  required: boolean;
  /** Required once a post has this other field: coverAlt with a cover. */
  requiredWith?: string;
  /** A string's or list's maximum length, if it has one. */
  max?: number;
  doc: string;
  example?: string;
}

type Schema = z.ZodObject<Record<string, z.ZodType>>;
type SchemaFn = (context: { image: () => z.ZodType }) => Schema;

// The posts schema takes Astro's image() helper; a string stands in for it, as only the shape is read.
const schema = (collections.posts.schema as unknown as SchemaFn)({ image: () => z.string() });

const postType = settings['frontMatter.taxonomy.contentTypes'].find((t) => t.name === 'post');
const docs = new Map(
  (postType?.fields ?? []).map((f) => [f.name, (f as { description?: string }).description ?? '']),
);

/** The schema under optional() and default(), where a string's or list's checks live. */
function inner(type: z.ZodType): z.ZodType {
  let t = type;
  while (['optional', 'default', 'nullable'].includes(t.def.type))
    t = (t.def as unknown as { innerType: z.ZodType }).innerType;
  return t;
}

function maxOf(type: z.ZodType): number | undefined {
  const t = inner(type) as z.ZodType & { maxLength?: number | null };
  if (typeof t.maxLength === 'number') return t.maxLength;
  const checks = (t.def as { checks?: { _zod: { def: { check: string; maximum?: number } } }[] })
    .checks;
  return checks?.find((c) => c._zod.def.check === 'max_length')?._zod.def.maximum;
}

const WORDS = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
];

// Every post's front matter as written, newest first (published posts before drafts).
const sources = import.meta.glob<string>('../../../src/content/posts/*/index.{md,mdx}', {
  query: '?raw',
  import: 'default',
  eager: true,
});
const written = Object.entries(sources)
  .map(([file, text]) => ({
    file: file.replace(/^(\.\.\/)+/, ''),
    text,
    data: (parse(text.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? '') ?? {}) as Record<string, unknown>,
  }))
  .sort(
    (a, b) =>
      Number(Boolean(a.data['draft'])) - Number(Boolean(b.data['draft'])) ||
      String(b.data['published']).localeCompare(String(a.data['published'])),
  );

/** As written, shortened past 60 characters so the table stays easy to scan. */
function show(value: unknown): string {
  const text = Array.isArray(value) ? `[${value.join(', ')}]` : String(value);
  if (text.length <= 60) return text;
  const cut = text.slice(0, 58).replace(/[\s,]+\S*$/, '');
  return `${cut}…${text.endsWith(']') ? ']' : ''}`;
}

export const FIELDS: Field[] = Object.entries(schema.shape).map(([name, type]) => {
  const doc = docs.get(name) ?? '';
  if (!doc)
    throw new Error(
      `front matter: "${name}" has no description in frontmatter.json (its post fields)`,
    );
  const max = maxOf(type);
  if (max !== undefined && !doc.includes(String(max)) && !doc.includes(WORDS[max] ?? '\0'))
    throw new Error(
      `front matter: "${name}" is limited to ${max}, but frontmatter.json doesn't say so`,
    );
  const found = written.find((p) => p.data[name] !== undefined && p.data[name] !== null);
  const requiredWith = (REQUIRED_WITH as Record<string, string>)[name];
  return {
    name,
    required: !type.safeParse(undefined).success,
    ...(requiredWith ? { requiredWith } : {}),
    ...(max !== undefined ? { max } : {}),
    doc,
    ...(found ? { example: show(found.data[name]) } : {}),
  };
});

/** The newest published post's front matter and first paragraph, as written, for "a full example". */
export function fullExample(): { file: string; code: string } {
  const post = written.find((p) => !p.data['draft']);
  if (!post) throw new Error('front matter: no published post');
  const front = post.text.match(/^---\n[\s\S]*?\n---/)?.[0] ?? '';
  const first =
    post.text
      .slice(front.length)
      .split(/\n\s*\n/)
      .map((block) => block.trim())
      .find((block) => block && !block.startsWith('import ') && !block.startsWith('<')) ?? '';
  return { file: post.file, code: `${front}\n\n${first}` };
}
