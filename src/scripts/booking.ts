// The booking band. "view availability" opens the calendar inside the band; only the first time it
// opens does the Cal.com embed load, so nothing from Cal.com runs until someone asks for it. The
// bouncing-dot mark shows until the calendar is ready.
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

/** Cal.com's documented loader, queueing calls until embed.js arrives. */
function loadCal(): CalApi {
  if (window.Cal) return window.Cal;
  const cal: CalApi = (...args: unknown[]) => {
    if (!cal.loaded) {
      cal.ns = {};
      cal.q = cal.q ?? [];
      const script = document.createElement('script');
      script.src = EMBED;
      script.async = true;
      document.head.append(script);
      cal.loaded = true;
    }
    (cal.q ??= []).push(args);
  };
  window.Cal = cal;
  return cal;
}

export function bindBooking(band: HTMLElement, calLink: string): void {
  const button = band.querySelector<HTMLButtonElement>('[data-book-toggle]');
  const panel = band.querySelector<HTMLElement>('[data-book-cal]');
  const target = band.querySelector<HTMLElement>('[data-book-embed]');
  if (!button || !panel || !target) return;
  let loaded = false;

  button.addEventListener('click', () => {
    const open = panel.hidden;
    panel.hidden = !open;
    button.setAttribute('aria-expanded', String(open));
    // The label and its wipe copy both change.
    button.querySelectorAll('span').forEach((s) => {
      s.textContent = open ? 'hide availability' : 'view availability';
    });
    if (!open || loaded) return;
    loaded = true;
    band.dispatchEvent(new CustomEvent('book-open', { bubbles: true }));

    const theme =
      document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    const cal = loadCal();
    cal('init', { origin: 'https://cal.com' });
    cal('inline', { elementOrSelector: target, calLink, config: { layout: 'month_view', theme } });
    cal('ui', { theme, hideEventTypeDetails: false, layout: 'month_view' });
    cal('on', {
      action: 'linkReady',
      callback: () => panel.setAttribute('data-ready', ''),
    });
  });
}
