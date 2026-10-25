// One real share card of each kind (home, post, project, page), rendered by the site's own code
// (src/lib/og) from the site's own content, so the share card page shows exactly what's published.
import type { APIRoute, GetStaticPaths } from 'astro';
import type { Card } from '../../../../src/lib/og/card';
import { shareCards } from '../../../../src/lib/og/cards';
import { renderCard } from '../../../../src/lib/og/render';

const KINDS: Card['kind'][] = ['home', 'post', 'project', 'page'];

export const getStaticPaths = (async () => {
  const cards = await shareCards();
  return KINDS.map((kind) => {
    const found = cards.find((c) => c.card.kind === kind);
    if (!found) throw new Error(`no ${kind} share card`);
    return { params: { kind }, props: { card: found.card } };
  });
}) satisfies GetStaticPaths;

export const GET: APIRoute<{ card: Card }> = async ({ props }) =>
  new Response(new Uint8Array(await renderCard(props.card)), {
    headers: { 'Content-Type': 'image/png' },
  });
