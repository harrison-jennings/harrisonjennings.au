// Booking, on Cal.com. Nothing from Cal.com loads until someone asks for the calendar.
// - The booking band (home page): "view availability" opens the calendar inside the band.
// - Every "book a call" ([data-book-call], href "/#book"): on the home page it scrolls to the band and
//   opens its calendar; on any other page it opens the same calendar in a modal, so readers keep
//   their place. Without script the link still goes to the band.
import { BOOKING_URL } from '../consts';

/** "user/event" from the booking URL. */
const CAL_LINK = new URL(BOOKING_URL).pathname.replace(/^\//, '');

type CalApi = ((...args: unknown[]) => void) & {
  q?: unknown[];
  loaded?: boolean;
  ns?: Record<string, unknown>;
};
declare global {
  interface Window {
    Cal?: CalApi;
  }
}

const EMBED = 'https://app.cal.com/embed/embed.js';
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const theme = () =>
  document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';

/** Cal.com's documented loader: queues calls until embed.js arrives, and loads it on first use. */
function cal(...args: unknown[]): void {
  if (!window.Cal) {
    const api: CalApi = (...a: unknown[]) => {
      if (!api.loaded) {
        api.ns = {};
        api.q = api.q ?? [];
        const script = document.createElement('script');
        script.src = EMBED;
        script.async = true;
        document.head.append(script);
        api.loaded = true;
      }
      (api.q ??= []).push(a);
    };
    window.Cal = api;
    api('init', { origin: 'https://cal.com' });
  }
  window.Cal(...args);
}

export function bindBooking(band: HTMLElement): void {
  const button = band.querySelector<HTMLButtonElement>('[data-book-toggle]');
  const panel = band.querySelector<HTMLElement>('[data-book-cal]');
  const target = band.querySelector<HTMLElement>('[data-book-embed]');
  if (!button || !panel || !target) return;
  let loaded = false;

  const setOpen = (open: boolean) => {
    panel.toggleAttribute('hidden', !open);
    button.setAttribute('aria-expanded', String(open));
    // The label and its wipe copy both change.
    button.querySelectorAll('span').forEach((s) => {
      s.textContent = open ? 'hide availability' : 'view availability';
    });
    if (!open || loaded) return;
    loaded = true;
    cal('inline', {
      elementOrSelector: target,
      calLink: CAL_LINK,
      config: { layout: 'month_view', theme: theme() },
    });
    cal('ui', { theme: theme(), hideEventTypeDetails: false, layout: 'month_view' });
    cal('on', { action: 'linkReady', callback: () => panel.setAttribute('data-ready', '') });
  };

  const closed = () => panel.hasAttribute('hidden');
  button.addEventListener('click', () => setOpen(closed()));
  // A "book a call" elsewhere on the page asks for the calendar.
  band.addEventListener('book:request', () => {
    if (closed()) setOpen(true);
  });
}

/**
 * Opens the calendar in Cal.com's modal. Cal.com closes it on Escape or its close button but leaves
 * focus behind it. So focus moves to the modal's close button once it shows (not into the calendar's
 * frame: Escape pressed inside the frame never reaches Cal.com's handler), the next Tab goes into the
 * calendar, and on close focus returns to the link.
 */
function openModal(link: HTMLAnchorElement): void {
  const before = new Set(document.querySelectorAll('cal-modal-box'));
  cal('modal', { calLink: CAL_LINK, config: { layout: 'month_view', theme: theme() } });

  const started = performance.now();
  const watch = () => {
    const box =
      [...document.querySelectorAll<HTMLElement>('cal-modal-box')].find((b) => !before.has(b)) ??
      document.querySelector<HTMLElement>('cal-modal-box');
    if (!box) {
      if (performance.now() - started < 15000) requestAnimationFrame(watch);
      return;
    }
    const closed = () =>
      box.getAttribute('state') === 'closed' || getComputedStyle(box).visibility === 'hidden';
    const closeButton = () => box.shadowRoot?.querySelector<HTMLButtonElement>('button.close');
    // Onto the close button once the modal shows (Cal.com keeps it hidden while it loads).
    const focusIn = () => {
      const button = closeButton();
      if (button && !closed()) button.focus();
      if (box.shadowRoot?.activeElement !== button && performance.now() - started < 15000)
        requestAnimationFrame(focusIn);
    };
    focusIn();
    // Back to the link when it closes.
    const observer = new MutationObserver(() => {
      if (!closed()) return;
      observer.disconnect();
      link.focus();
    });
    observer.observe(box, { attributes: true, attributeFilter: ['state', 'style', 'class'] });
  };
  requestAnimationFrame(watch);
}

export function bindBookCall(link: HTMLAnchorElement): void {
  link.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
      return;
    e.preventDefault();
    const band = document.querySelector<HTMLElement>('[data-book]');
    if (!band) {
      openModal(link);
      return;
    }
    band.dispatchEvent(new CustomEvent('book:request'));
    // After the phone menu (if that's where the click came from) has closed and returned focus.
    requestAnimationFrame(() => {
      band.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' });
      band.querySelector<HTMLElement>('[data-book-toggle]')?.focus({ preventScroll: true });
      history.replaceState(null, '', '#book');
    });
  });
}
