// The contributions graph ("still shipping", src/components/home/Contributions.astro). The grid is drawn
// filled at build time; this adds what needs a script:
// - the tooltip, on hover, on keyboard focus and on a tap, kept inside the column;
// - the arrow keys, Home and End (Ctrl or ⌘ with them for the first day and today), the grid being one
//   tab stop; Esc hides the tooltip until the next move;
// - opening at the newest weeks when the year doesn't fit;
// - the entrance: once, as 35% of the section comes into view, never under reduced motion or when the
//   section is already in view on load.
// The ‹ › arrows are the shared swipe row's (src/scripts/swipe.ts).

type Mode = 'hover' | 'focus' | 'tap';

interface Day {
  cell: HTMLElement;
  week: number;
  weekday: number;
}

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
/** The tooltip's distance from the day it points at, and its caret's from the box's corners. */
const GAP = 14;

/** A duration token in milliseconds. Registered tokens compute to seconds (".96s"), others to "960ms". */
const ms = (el: Element, name: string) => {
  const value = getComputedStyle(el).getPropertyValue(name).trim();
  const n = Number.parseFloat(value) || 0;
  return value.endsWith('ms') ? n : n * 1000;
};

export function bindContributions(root: HTMLElement): void {
  const scroller = root.querySelector<HTMLElement>('.act__scroll');
  const grid = root.querySelector<HTMLTableElement>('.act__grid');
  const tip = root.querySelector<HTMLElement>('.act__tip');
  if (!scroller || !grid || !tip || !grid.querySelector('.act__day')) return;
  const tipCount = tip.querySelector('b')!;
  const tipDate = tip.querySelector('span')!;

  // Every day by its week (column) and weekday (row, Sunday first).
  const days: Day[] = [...grid.querySelectorAll<HTMLTableCellElement>('.act__day')].map((cell) => ({
    cell,
    week: cell.cellIndex - 1,
    weekday: (cell.parentElement as HTMLTableRowElement).sectionRowIndex,
  }));
  const byCell = new Map(days.map((d) => [d.cell, d]));
  const at = new Map(days.map((d) => [d.week * 7 + d.weekday, d]));
  // Days come in row order (all the Sundays, then the Mondays…), so the first is found by position.
  const order = (d: Day) => d.week * 7 + d.weekday;
  const first = days.reduce((a, b) => (order(b) < order(a) ? b : a), days[0]!);
  const today = days.find((d) => d.cell.tabIndex === 0) ?? days.at(-1)!;

  // Opened at the newest weeks (a phone, or any screen too narrow for the year). The weeks snap to whole
  // columns beside the day labels. The view is trimmed to a whole number of weeks, and the row's end is
  // padded to a whole week, so no dot in view is ever cut, at either edge, wherever it comes to rest.
  const fit = () => {
    const atEnd = scroller.scrollLeft >= scroller.scrollWidth - scroller.clientWidth - 4;
    scroller.style.removeProperty('padding-right');
    scroller.style.removeProperty('margin-right');
    const week = today.cell.getBoundingClientRect().width + 6;
    if (scroller.scrollWidth - scroller.clientWidth > 4) {
      const first = grid.querySelector('.act__corner')!.getBoundingClientRect().right + 6;
      const view = scroller.getBoundingClientRect().right - first;
      const trim = view % week;
      if (trim > 0.5) {
        const margin = Number.parseFloat(getComputedStyle(scroller).marginRight) || 0;
        scroller.style.marginRight = `${margin + trim}px`;
      }
    }
    const max = scroller.scrollWidth - scroller.clientWidth;
    const extra = max > 4 ? (week - (max % week)) % week : 0;
    if (extra > 0.5) {
      const padding = Number.parseFloat(getComputedStyle(scroller).paddingRight) || 0;
      scroller.style.paddingRight = `${padding + extra}px`;
    }
    if (atEnd) scroller.scrollLeft = scroller.scrollWidth;
  };
  scroller.scrollLeft = scroller.scrollWidth;
  fit();
  let width = window.innerWidth;
  window.addEventListener('resize', () => {
    if (window.innerWidth === width) return; // a phone's toolbar showing or hiding
    width = window.innerWidth;
    fit();
  });

  // ---------- the tooltip ----------

  let shown: { day: Day; mode: Mode } | null = null;

  const place = () => {
    if (!shown) return;
    const box = root.getBoundingClientRect();
    const cell = shown.day.cell.getBoundingClientRect();
    const width = tip.offsetWidth;
    const centre = cell.left - box.left + cell.width / 2;
    const x = Math.min(Math.max(centre - width / 2, 0), Math.max(0, box.width - width));
    const caret = Math.min(Math.max(centre - x, GAP), width - GAP);
    const y = cell.top - box.top - tip.offsetHeight - GAP;
    tip.style.transform = `translate(${x}px, ${y}px)`;
    tip.style.setProperty('--caret', `${caret}px`);
  };

  const show = (day: Day, mode: Mode) => {
    if (shown) delete shown.day.cell.dataset['state'];
    shown = { day, mode };
    const label = day.cell.getAttribute('aria-label') ?? '';
    const split = label.indexOf(' on ');
    tipCount.textContent = label.slice(0, split);
    tipDate.textContent = label.slice(split + 4);
    if (mode !== 'focus') day.cell.dataset['state'] = mode;
    tip.hidden = false;
    place();
  };

  const hide = () => {
    if (shown) delete shown.day.cell.dataset['state'];
    shown = null;
    tip.hidden = true;
  };

  /** The day with keyboard focus, if any. */
  const focused = () => {
    const el = document.activeElement;
    const day = el instanceof HTMLElement ? byCell.get(el) : undefined;
    return day?.cell.matches(':focus-visible') ? day : undefined;
  };

  /** When the pointer leaves: back to the keyboard's day, or nothing. */
  const settle = () => {
    const day = focused();
    if (day) show(day, 'focus');
    else hide();
  };

  // ---------- the keyboard ----------

  /** Keeps a day clear of the sticky day labels and the scroller's edges. */
  const keepInView = (cell: HTMLElement) => {
    const view = scroller.getBoundingClientRect();
    const labels = grid.querySelector('.act__wd')?.getBoundingClientRect().width ?? 0;
    const c = cell.getBoundingClientRect();
    const left = view.left + labels + 6;
    const right = view.right - 6;
    if (c.left < left) scroller.scrollLeft -= left - c.left;
    else if (c.right > right) scroller.scrollLeft += c.right - right;
  };

  const move = (day: Day) => {
    for (const d of days) d.cell.tabIndex = d === day ? 0 : -1;
    day.cell.focus({ preventScroll: true });
    keepInView(day.cell);
    show(day, 'focus');
  };

  grid.addEventListener('keydown', (e) => {
    const day = e.target instanceof HTMLElement ? byCell.get(e.target) : undefined;
    if (!day) return;
    const key = day.week * 7 + day.weekday;
    const row = days.filter((d) => d.weekday === day.weekday);
    const mod = e.ctrlKey || e.metaKey;
    let to: Day | undefined;
    switch (e.key) {
      case 'Escape':
        if (!shown) return;
        hide();
        e.preventDefault();
        return;
      case 'ArrowLeft':
        to = at.get(key - 7);
        break;
      case 'ArrowRight':
        to = at.get(key + 7);
        break;
      case 'ArrowUp':
        to = day.weekday > 0 ? at.get(key - 1) : undefined;
        break;
      case 'ArrowDown':
        to = day.weekday < 6 ? at.get(key + 1) : undefined;
        break;
      case 'Home':
        to = mod ? first : row[0];
        break;
      case 'End':
        to = mod ? today : row.at(-1);
        break;
      default:
        return;
    }
    e.preventDefault();
    if (to) move(to);
  });

  // Tab into the grid lands on the roving day; its tooltip shows with the focus ring.
  grid.addEventListener('focusin', (e) => {
    const day = e.target instanceof HTMLElement ? byCell.get(e.target) : undefined;
    if (!day) return;
    for (const d of days) d.cell.tabIndex = d === day ? 0 : -1;
    if (day.cell.matches(':focus-visible')) show(day, 'focus');
  });
  grid.addEventListener('focusout', (e) => {
    if (e.relatedTarget instanceof Node && grid.contains(e.relatedTarget)) return;
    if (shown?.mode === 'focus') hide();
  });
  // Esc also dismisses a tooltip opened by the pointer (WCAG 1.4.13).
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && shown && shown.mode !== 'focus') hide();
  });

  // ---------- the pointer ----------

  let pointer = 'mouse';
  grid.addEventListener('pointerdown', (e) => (pointer = e.pointerType));

  grid.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    const cell = e.target instanceof Element ? e.target.closest<HTMLElement>('.act__day') : null;
    const day = cell ? byCell.get(cell) : undefined;
    if (day) {
      if (shown?.day !== day || shown.mode !== 'hover') show(day, 'hover');
    } else if (shown?.mode === 'hover') settle();
  });
  grid.addEventListener('pointerleave', (e) => {
    if (e.pointerType !== 'touch' && shown?.mode === 'hover') settle();
  });

  /** The day nearest a tap, gaps included, so each day is a 20 × 20px target. */
  const nearest = (x: number, y: number): Day | undefined => {
    const hit = document.elementFromPoint(x, y)?.closest<HTMLElement>('.act__day');
    if (hit) return byCell.get(hit);
    return days.find(({ cell }) => {
      const r = cell.getBoundingClientRect();
      const reach = 4; // half the 6px gap, and a little
      return (
        x >= r.left - reach && x <= r.right + reach && y >= r.top - reach && y <= r.bottom + reach
      );
    });
  };

  // A tap shows the day's tooltip; the same day again, or anywhere else, hides it.
  grid.addEventListener('click', (e) => {
    if (pointer !== 'touch') return;
    const day = nearest(e.clientX, e.clientY);
    if (!day || (shown?.day === day && shown.mode === 'tap')) hide();
    else show(day, 'tap');
  });
  document.addEventListener('pointerdown', (e) => {
    if (shown?.mode === 'tap' && !(e.target instanceof Node && grid.contains(e.target))) hide();
  });

  // A month label partly scrolled under the day labels is hidden, rather than cut to a letter.
  const labels = [...grid.querySelectorAll<HTMLElement>('.act__month > [aria-hidden]')];
  const edge = grid.querySelector('.act__corner');
  const clearLabels = () => {
    const limit = (edge?.getBoundingClientRect().right ?? 0) + 6;
    for (const label of labels)
      label.style.visibility = label.getBoundingClientRect().left < limit - 0.5 ? 'hidden' : '';
  };
  clearLabels();

  // Scrolling hides a hover or tap tooltip; a keyboard one follows its day.
  let queued = false;
  const follow = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      clearLabels();
      place();
    });
  };
  scroller.addEventListener(
    'scroll',
    () => {
      if (shown && shown.mode !== 'focus') hide();
      follow();
    },
    { passive: true },
  );
  window.addEventListener('resize', follow);

  // ---------- the entrance ----------

  const section = root.closest('section') ?? root;
  if (reducedMotion() || section.getBoundingClientRect().top < window.innerHeight) return;

  root.dataset['reveal'] = 'armed';
  const play = () => {
    // The wave crosses the weeks in view, ending on today; weeks scrolled off to the left start at once.
    const step = today.cell.getBoundingClientRect().width + 6; // a day and its gap: one week
    const overflows = scroller.scrollWidth - scroller.clientWidth > 4;
    const w0 = overflows ? Math.max(0, Math.floor(scroller.scrollLeft / step)) : 0;
    const span = overflows
      ? Math.max(1, Math.ceil(scroller.clientWidth / step))
      : Math.max(...days.map((d) => d.week)) + 1;
    const sweep = ms(root, '--duration-sweep');
    for (const { cell, week, weekday } of days) {
      const delay = (Math.max(0, week - w0 + weekday * 0.5) / (span + 3)) * sweep;
      cell.style.animationDelay = `${Math.round(delay)}ms`;
    }
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        root.dataset['reveal'] = 'play';
        // Back to the plain grid once it's done, so a theme change later repaints it.
        window.setTimeout(
          () => {
            delete root.dataset['reveal'];
            for (const { cell } of days) cell.style.removeProperty('animation-delay');
          },
          sweep + ms(root, '--duration-light') + 100,
        );
      }),
    );
  };
  const observer = new IntersectionObserver(
    (entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      observer.disconnect();
      play();
    },
    { threshold: 0.35 },
  );
  observer.observe(section);
}
