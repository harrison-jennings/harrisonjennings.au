// The logo marks as PNGs, drawn at build time from public/brand/*.svg (the SVGs are the source), so
// the downloads always match them. 1024px square, transparent around the mark.
import { readFile } from 'node:fs/promises';
import type { APIRoute, GetStaticPaths } from 'astro';
import sharp from 'sharp';

const SIZE = 1024;

export const getStaticPaths: GetStaticPaths = () =>
  ['mark-on-dark', 'mark-on-light'].map((mark) => ({ params: { mark } }));

export const GET: APIRoute = async ({ params }) => {
  const svg = await readFile(
    new URL(`../../../../public/brand/${params['mark']}.svg`, import.meta.url),
  );
  const png = await sharp(svg, { density: (72 * SIZE) / 100 })
    .resize(SIZE, SIZE)
    .png()
    .toBuffer();
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png' } });
};
