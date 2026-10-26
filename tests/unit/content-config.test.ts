import { z } from 'astro/zod';
import { describe, expect, it } from 'vitest';
import { collections } from '../../src/content.config';

// The posts schema: the build fails on a post it rejects.
type SchemaFn = (context: { image: () => z.ZodType }) => z.ZodType;
const posts = (collections.posts.schema as unknown as SchemaFn)({ image: () => z.string() });
const post = { title: 'a post', description: 'What it says.', published: '2026-10-26' };

describe('the posts schema', () => {
  it('needs coverAlt with a cover, so a cover is never shown without words for it', () => {
    const result = posts.safeParse({ ...post, cover: './cover.png' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]).toMatchObject({
      path: ['coverAlt'],
      message: 'coverAlt is required with a cover',
    });
    expect(
      posts.safeParse({ ...post, cover: './cover.png', coverAlt: 'The home page' }).success,
    ).toBe(true);
  });

  it("doesn't need coverAlt without a cover", () => {
    expect(posts.safeParse(post).success).toBe(true);
  });
});
