// Search's behaviour (components/Search.astro; design hand-off: Search). Opening and closing, the
// keyboard (focus stays in the field, the arrows move through results with aria-activedescendant),
// Pagefind's results eight pages at a time with up to three sections each (only pages holding every
// word of the query), a token's card, and the loading, no-results and failed states. The index is loaded the first time search opens; it's only
// in a build (npm run design:preview), so under astro dev search says it couldn't load.
import { bindCopyText } from '../../../src/scripts/copy-text';

interface SubResult {
  title: string;
  url: string;
  excerpt: string;
  anchor?: { id: string; location: number };
  weighted_locations?: { balanced_score: number }[];
}
interface ResultData {
  url: string;
  content: string;
  excerpt: string;
  meta: Record<string, string | undefined>;
  sub_results: SubResult[];
}
interface Result {
  data: () => Promise<ResultData>;
}
interface Pagefind {
  options: (options: Record<string, unknown>) => Promise<void>;
  init: () => Promise<void>;
  search: (query: string) => Promise<{ results: Result[] } | null>;
}

const BUNDLE = '/pagefind/';
/** The query in a result's address, for the page it opens to mark (scripts/arrive.ts). */
const PARAM = 'q';
const TOKEN_CARDS = '/search/tokens/';
const MIN_LENGTH = 2;
const WAIT = 120;
const SLOW = 300;
const PAGE = 8;
const SECTIONS = 3;

const dialog = document.querySelector<HTMLDialogElement>('[data-search]');
const menu = document.querySelector<HTMLDialogElement>('[data-menu]');

if (dialog) {
  const $ = <T extends HTMLElement>(selector: string) => dialog.querySelector<T>(selector)!;
  const input = $<HTMLInputElement>('[data-search-input]');
  const clear = $<HTMLButtonElement>('[data-search-clear]');
  const status = $('[data-search-status]');
  const views = [...dialog.querySelectorAll<HTMLElement>('[data-view]')];
  const startList = $('#sr-start');
  const list = $('[data-search-list]');
  const count = $('[data-search-count]');
  const tokenSlot = $('[data-search-token]');
  const more = $('[data-search-more]');
  const none = $('[data-search-none]');
  const escHint = $('[data-search-esc]');
  const tokens = new Set((dialog.dataset['tokens'] ?? '').split(' '));
  $('[data-search-key]').textContent = /mac|iphone|ipad/i.test(navigator.userAgent)
    ? '⌘ K'
    : 'Ctrl K';

  let pagefind: Promise<Pagefind> | undefined;
  let ready = false;
  let attempt = 0;
  let cards: Promise<Document | undefined> | undefined;
  let results: ResultData[] = [];
  let shown = 0;
  let card = false;
  let seq = 0;
  let timer: number | undefined;
  let optionId = 0;
  let openedBy: HTMLElement | null = null;
  let fromMenu = false;
  /** The query the results showing are for. */
  let current = '';

  /** Loads Pagefind once. A failure is forgotten, so "try again" loads it afresh. */
  const load = (): Promise<Pagefind> => {
    pagefind ??= (async () => {
      // A query string on a retry, so the browser doesn't hand back the failed load.
      const url = `${BUNDLE}pagefind.js${attempt ? `?try=${attempt}` : ''}`;
      const pf = (await import(/* @vite-ignore */ url)) as Pagefind;
      await pf.options({ basePath: BUNDLE });
      await pf.init();
      return pf;
    })();
    pagefind.catch(() => {
      pagefind = undefined;
      attempt += 1;
    });
    return pagefind;
  };

  const show = (name: string) => {
    for (const v of views) v.hidden = v.dataset['view'] !== name;
    const active = name === 'start' ? startList : name === 'results' ? list : null;
    input.setAttribute('aria-controls', active?.id ?? list.id);
    input.setAttribute('aria-expanded', String(!!active?.querySelector('[role="option"]')));
    if (active) select(options()[0]);
    else input.removeAttribute('aria-activedescendant');
  };

  /** The live region: said once typing pauses, and again if the same words come round. */
  const announce = (words: string) => {
    status.textContent = '';
    requestAnimationFrame(() => (status.textContent = words));
  };

  const options = (): HTMLElement[] => {
    const active = views.find((v) => !v.hidden);
    return [...(active?.querySelectorAll<HTMLElement>('[role="option"]') ?? [])];
  };

  function select(option: HTMLElement | undefined) {
    for (const o of dialog!.querySelectorAll('[aria-selected="true"]'))
      o.setAttribute('aria-selected', 'false');
    if (!option) {
      input.removeAttribute('aria-activedescendant');
      return;
    }
    option.setAttribute('aria-selected', 'true');
    input.setAttribute('aria-activedescendant', option.id);
    option.scrollIntoView({ block: 'nearest' });
  }

  const move = (by: number) => {
    const all = options();
    const at = all.findIndex((o) => o.getAttribute('aria-selected') === 'true');
    // Neither end wraps.
    select(all[Math.min(Math.max(at + by, 0), all.length - 1)]);
  };

  /** Closes search before the page changes, so the back button comes back to the page without it. */
  const go = (href: string) => {
    fromMenu = false;
    dialog.close();
    location.assign(href);
  };

  const el = (tag: string, className: string, text?: string) => {
    const node = document.createElement(tag);
    node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  /** A result's address with the query in it, as typed, for the page to mark (scripts/arrive.ts). */
  const withQuery = (href: string) => {
    const url = new URL(href, location.href);
    url.searchParams.set(PARAM, current);
    return `${url.pathname}${url.search}${url.hash}`;
  };

  const option = (className: string, href: string) => {
    const a = el('a', className) as HTMLAnchorElement;
    a.href = withQuery(href);
    a.id = `sr-opt-${(optionId += 1)}`;
    a.tabIndex = -1;
    a.setAttribute('role', 'option');
    a.setAttribute('aria-selected', 'false');
    return a;
  };

  const enter = () => {
    const mark = el('span', 'sr-enter', '↵');
    mark.setAttribute('aria-hidden', 'true');
    return mark;
  };

  /** Up to three of a page's sections, the most relevant, in the page's order. */
  const sections = (data: ResultData): SubResult[] =>
    data.sub_results
      .filter((s) => s.anchor)
      .map((s) => ({
        s,
        score: (s.weighted_locations ?? []).reduce((n, w) => n + w.balanced_score, 0),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, SECTIONS)
      .map(({ s }) => s)
      .sort((a, b) => (a.anchor?.location ?? 0) - (b.anchor?.location ?? 0));

  // Pagefind's excerpts are escaped before it marks the matches, so they're safe as HTML; its
  // metadata isn't, so titles go in as text.
  const group = (data: ResultData) => {
    const title = data.meta['title'] ?? '';
    const where = data.meta['where'] ?? '';
    const li = el('li', 'sr-group');
    li.setAttribute('role', 'none');
    // An option is named by what it shows, title first ("callouts content / text", then the excerpt),
    // so what's spoken matches what's on screen; the grid puts where it lives above the title.
    const page = option('sr-res', data.url);
    const excerpt = el('span', 'sr-res__ex');
    excerpt.innerHTML = data.excerpt;
    page.append(el('span', 'sr-res__title', title), el('span', 'sr-res__where', where), excerpt);
    page.append(enter());
    li.append(page);
    const subs = sections(data);
    if (subs.length) {
      const ul = el('ul', 'sr-subs');
      ul.setAttribute('role', 'group');
      ul.setAttribute('aria-label', title);
      for (const s of subs) {
        const item = el('li', 'sr-sub');
        item.setAttribute('role', 'none');
        const link = option('sr-sub__link', s.url);
        const subTitle = el('span', 'sr-sub__title');
        const hash = el('i', 'sr-hash', '#');
        hash.setAttribute('aria-hidden', 'true');
        subTitle.append(hash, s.title);
        const ex = el('span', 'sr-sub__ex');
        ex.innerHTML = s.excerpt;
        link.append(subTitle, ex, enter());
        item.append(link);
        ul.append(item);
      }
      li.append(ul);
    }
    return li;
  };

  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

  /**
   * Whether a page holds every word of the query. Pagefind answers a word it doesn't know with the
   * longest start of it that it does ("asdflksjad" finds every "as", "sdf" every "s"), so gibberish
   * would always find something. A word counts where a word on the page starts with it, or where it
   * starts with a word on the page that's at most two letters shorter (colours finds colour).
   */
  const holds = (data: ResultData, words: string[]): boolean => {
    const onPage = new Set(data.content.toLowerCase().match(/[\p{L}\p{N}]+/gu));
    return words.every((q) => {
      for (const w of onPage)
        if (w.startsWith(q) || (q.startsWith(w) && w.length >= Math.max(3, q.length - 2)))
          return true;
      return false;
    });
  };

  /** The next eight pages' results. */
  const showMore = () => {
    const next = results.slice(shown, shown + PAGE);
    const before = options().length;
    list.append(...next.map(group));
    shown += next.length;
    const left = results.length - shown;
    more.hidden = left === 0;
    $('[data-search-more-label]').textContent = `show ${Math.min(PAGE, left)} more`;
    $('[data-search-left]').textContent = `${left} left`;
    return before;
  };

  /** The token a query names exactly: accent, --accent or var(--accent). */
  const tokenOf = (query: string): string | undefined => {
    const name = query
      .toLowerCase()
      .replace(/^var\((.*)\)$/, '$1')
      .replace(/^(--|\.)/, '');
    return tokens.has(name) ? name : undefined;
  };

  const tokenCard = async (query: string): Promise<HTMLElement | undefined> => {
    const name = tokenOf(query);
    if (!name) return undefined;
    cards ??= fetch(TOKEN_CARDS)
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error(String(r.status)))))
      .then((html) => new DOMParser().parseFromString(html, 'text/html'))
      .catch(() => {
        cards = undefined; // Search still works without the card; the next token query tries again.
        return undefined;
      });
    const found = (await cards)?.querySelector(`[data-token-card="${name}"]`);
    if (!found) return undefined;
    const node = document.importNode(found, true) as HTMLElement;
    node.querySelectorAll<HTMLButtonElement>('[data-copy-text]').forEach(bindCopyText);
    return node;
  };

  const run = async (asked: string) => {
    const mine = (seq += 1);
    // Only the first search waits on the index; the loading state shows only if it's slow.
    const slow = window.setTimeout(() => {
      if (mine !== seq || ready) return;
      show('loading');
      announce('Loading search');
    }, SLOW);
    try {
      const pf = await load();
      const [found, token] = await Promise.all([pf.search(asked), tokenCard(asked)]);
      ready = true;
      if (mine !== seq || !found) return;
      // Every match's data, to check it really holds the query: at most a few dozen small files.
      const data = await Promise.all(found.results.map((r) => r.data()));
      if (mine !== seq) return;
      const words = asked.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
      current = asked;
      results = data.filter((d) => holds(d, words));
      card = !!token;
      shown = 0;
      list.replaceChildren();
      tokenSlot.replaceChildren(...(token ? [token] : []));
      if (!results.length && !token) {
        none.textContent = `nothing matches “${asked}”.`;
        show('none');
        announce('No results');
        return;
      }
      showMore();
      const n = results.length;
      count.textContent = card
        ? `1 token${n ? `, and ${plural(n, 'page', 'pages')} that mention it` : ''}`
        : `${plural(n, 'result', 'results')} for “${asked}”`;
      show('results');
      announce(
        card
          ? `1 token and ${plural(n, 'result', 'results')}`
          : `${plural(n, 'result', 'results')}${n > shown ? `, showing ${shown}` : ''}`,
      );
    } catch {
      if (mine !== seq) return;
      show('failed');
      announce("Search couldn't load");
    } finally {
      window.clearTimeout(slow);
    }
  };

  const update = () => {
    const query = input.value.trim();
    clear.hidden = !input.value;
    escHint.textContent = input.value ? 'clear' : 'close';
    window.clearTimeout(timer);
    if (!query) {
      seq += 1; // Drops a search still on its way.
      show('start');
      return;
    }
    // One character keeps what's showing.
    if (query.length >= MIN_LENGTH) timer = window.setTimeout(() => run(query), WAIT);
  };

  const empty = () => {
    input.value = '';
    update();
    input.focus();
  };

  /** Phones: the dialog is as tall as what the on-screen keyboard leaves, so every result can be reached. */
  const fit = () => {
    const vv = window.visualViewport;
    if (!vv) return;
    dialog.style.setProperty('--sr-height', `${vv.height}px`);
    dialog.style.setProperty('--sr-top', `${vv.offsetTop}px`);
  };

  const open = (from: HTMLElement | null) => {
    if (dialog.open) {
      input.focus();
      return;
    }
    openedBy = from;
    fromMenu = !!from?.closest('[data-menu]');
    if (fromMenu) menu?.close();
    fit();
    dialog.showModal();
    input.focus();
    load().catch(() => undefined); // Warms the index up while the first word is typed.
  };

  document.querySelectorAll<HTMLElement>('[data-search-open]').forEach((button) => {
    button.addEventListener('click', () => open(button));
  });
  dialog.querySelectorAll('[data-search-close]').forEach((button) => {
    button.addEventListener('click', () => dialog.close());
  });
  clear.addEventListener('click', empty);
  $('[data-search-retry]').addEventListener('click', () => {
    const query = input.value.trim();
    input.focus();
    if (query.length >= MIN_LENGTH) run(query);
  });
  more.querySelector('button')?.addEventListener('click', () => {
    const first = showMore();
    input.focus();
    select(options()[first]);
    announce(`${plural(results.length, 'result', 'results')}, showing ${shown}`);
  });

  input.addEventListener('input', update);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      move(e.key === 'ArrowDown' ? 1 : -1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selected = dialog.querySelector<HTMLAnchorElement>('[aria-selected="true"]');
      if (selected) go(selected.href);
    }
  });

  // Esc clears the field first, then closes. The dialog's own cancel follows the keydown, by when
  // the field is already empty, so it's told the Esc was spent.
  let cleared = false;
  dialog.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !input.value) return;
    e.preventDefault();
    empty();
    cleared = true;
    window.setTimeout(() => (cleared = false));
  });
  dialog.addEventListener('cancel', (e) => {
    if (input.value || cleared) e.preventDefault();
  });

  // A result or chip opened with a click closes search first; one opened in a new tab leaves it open.
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) {
      dialog.close(); // The backdrop.
      return;
    }
    const link = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[href]');
    if (!link || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    go(link.href);
  });

  dialog.addEventListener('close', () => {
    // From the phone menu, "cancel" goes back to it, with its search field focused.
    if (fromMenu && menu) {
      menu.showModal();
      menu.querySelector<HTMLElement>('[data-search-open]')?.focus();
    } else openedBy?.focus();
  });

  window.visualViewport?.addEventListener('resize', fit);

  // `/` from anywhere but a field; ⌘K on a Mac, Ctrl K elsewhere. Not while another dialog is open.
  document.addEventListener('keydown', (e) => {
    const target = e.target as HTMLElement;
    const typing =
      target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
    const slash = e.key === '/' && !typing && !e.metaKey && !e.ctrlKey && !e.altKey;
    const k = e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey) && !e.altKey;
    if (!slash && !k) return;
    if (document.querySelector('dialog[open]') && !dialog.open) return;
    if (dialog.open && slash) return; // Types a slash.
    e.preventDefault();
    open(null);
  });

  show('start');
}
