import type { APIRoute, GetStaticPaths } from 'astro';
import type { Card } from '../../lib/og/card';
import { shareCards } from '../../lib/og/cards';
import { renderCard } from '../../lib/og/render';

// Every share card, rendered once at build to /og/<path>.png.
export const getStaticPaths = (async () =>
  (await shareCards()).map(({ image, card }) => ({
    params: { path: image.replace(/^\/og\//, '').replace(/\.png$/, '') },
    props: { card },
  }))) satisfies GetStaticPaths;

export const GET: APIRoute<{ card: Card }> = async ({ props }) =>
  new Response(new Uint8Array(await renderCard(props.card)), {
    headers: { 'Content-Type': 'image/png' },
  });
