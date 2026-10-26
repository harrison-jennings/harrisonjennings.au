// Arriving from a search result (design hand-off: Search, "arriving on a result"). A result's address
// carries the query (?q=coverAlt); Pagefind's highlight script marks the matches in the page's content,
// the page scrolls the first one (after the section the result named, if it named one) to a third of
// the way down the screen, and a pill says how many there are and offers "clear". The marks go on
// "clear", on Esc, or on leaving the page; the query comes out of the address at once, so a reload or
// a copied link doesn't bring them back.

interface Highlighter {
  new (options: Record<string, unknown>): unknown;
}

const PARAM = 'q';
/** Written by the build with the index (lib/search.ts), so it's a path the bundler leaves alone. */
const HIGHLIGHT = '/pagefind/pagefind-highlight.js';
const pill = document.querySelector<HTMLElement>('[data-arrive]');
const url = new URL(location.href);
const query = url.searchParams.get(PARAM)?.trim();

/** A match that can be seen: the token table hides every kind but colour until it's chosen. */
const reveal = (mark: HTMLElement) => {
  const row = mark.closest<HTMLElement>('tr[hidden][data-kind]');
  if (!row) return;
  const table = row.closest('table');
  const filters = table?.closest('.ds-tablebox')?.previousElementSibling;
  filters?.querySelector<HTMLButtonElement>(`button[data-kind="${row.dataset['kind']}"]`)?.click();
};

async function arrive(query: string, pill: HTMLElement) {
  let count = 0;
  const { default: PagefindHighlight } = (await import(/* @vite-ignore */ HIGHLIGHT)) as {
    default: Highlighter;
  };
  new PagefindHighlight({
    highlightParam: PARAM,
    addStyles: false,
    markOptions: {
      className: 'sr-hit',
      // What search leaves out (data-pagefind-ignore, aria-hidden), the marks leave alone.
      exclude: [
        '[data-pagefind-ignore]',
        '[data-pagefind-ignore] *',
        '[aria-hidden="true"]',
        '[aria-hidden="true"] *',
      ],
      done: (n: number) => (count = n),
    },
  });
  url.searchParams.delete(PARAM);
  history.replaceState(history.state, '', url);
  if (!count) return;

  const marks = [...document.querySelectorAll<HTMLElement>('mark.sr-hit')];
  const section = location.hash
    ? document.getElementById(decodeURIComponent(location.hash.slice(1)))
    : null;
  const first =
    (section &&
      marks.find((m) => section.compareDocumentPosition(m) & Node.DOCUMENT_POSITION_FOLLOWING)) ||
    marks[0];
  if (!first) return;
  reveal(first);
  const scroll = () =>
    window.scrollTo({
      top: first.getBoundingClientRect().top + window.scrollY - window.innerHeight / 3,
      behavior: 'instant',
    });
  scroll();
  // Previews above the match settle their height as they load; follow the match unless the reader
  // has already moved.
  if (document.readyState !== 'complete') {
    const moved = new AbortController();
    for (const type of ['wheel', 'touchstart', 'keydown', 'pointerdown'])
      addEventListener(type, () => moved.abort(), { once: true, signal: moved.signal });
    addEventListener(
      'load',
      () => {
        if (!moved.signal.aborted) scroll();
        moved.abort();
      },
      { once: true },
    );
  }

  pill.querySelector('[data-arrive-query]')!.textContent = query;
  pill.querySelector('[data-arrive-count]')!.textContent =
    count === 1 ? 'is marked once' : `is marked ${count} times`;
  pill.hidden = false;

  const clear = () => {
    const button = pill.querySelector('button');
    // Focus would be lost with the button, so it goes to the page.
    if (document.activeElement === button) {
      const main = document.getElementById('main');
      main?.setAttribute('tabindex', '-1');
      main?.focus({ preventScroll: true });
    }
    for (const mark of document.querySelectorAll<HTMLElement>('mark.sr-hit')) {
      const parent = mark.parentNode;
      mark.replaceWith(...mark.childNodes);
      parent?.normalize();
    }
    pill.hidden = true;
    removeEventListener('keydown', onEsc);
  };
  const onEsc = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && !document.querySelector('dialog[open]')) clear();
  };
  pill.querySelector('button')?.addEventListener('click', clear);
  addEventListener('keydown', onEsc);
}

if (query && pill) arrive(query, pill).catch(() => undefined); // No marks is still the right page.
