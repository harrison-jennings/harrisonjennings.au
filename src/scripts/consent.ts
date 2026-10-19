// Cookie consent behaviour. CookieConsent v3 keeps the choice: its cookie (cc_cookie), the revision, a
// consent ID, and clearing analytics and advertising cookies when they're refused. Its own interface is
// never shown; the banner and dialog are the design's markup (src/components/Consent.astro).
//
// On a choice: Google Consent Mode is updated, Tag Manager gets a `cookieConsentInteraction` event, and
// the choice is recorded through /api/consent (the consent log). Nothing optional runs before that:
// the page head sets every optional signal to denied.
import {
  acceptCategory,
  acceptedCategory,
  getCookie,
  run,
  validConsent,
} from 'vanilla-cookieconsent';
import {
  CATEGORIES,
  CONSENT_COOKIE,
  CONSENT_DAYS,
  consentSignals,
  type ConsentAction,
  type ConsentRecord,
} from '../lib/consent';

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

// gtag() comes from the page head (Base.astro), defined exactly as Google's snippet defines it: Google's
// tag reads Consent Mode commands only as `arguments` objects.
const gtag = (...args: unknown[]): void => window.gtag?.(...args);

const accepted = (): string[] => CATEGORIES.filter((c) => acceptedCategory(c));

function record(action: ConsentAction): void {
  const cookie = getCookie();
  const body: ConsentRecord = {
    consentId: cookie.consentId,
    consentDate: cookie.lastConsentTimestamp || cookie.consentTimestamp,
    revision: cookie.revision,
    categories: accepted() as ConsentRecord['categories'],
    action,
    path: location.pathname,
  };
  window.dataLayer?.push({
    event: 'cookieConsentInteraction',
    consent_action: action,
    consent_categories: body.categories.join(','),
  });
  // Best effort: the choice already applies whether or not the log is reachable.
  fetch('/api/consent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    keepalive: true,
  }).catch(() => undefined);
}

export function bindConsent(): void {
  const banner = document.querySelector<HTMLElement>('[data-consent-banner]');
  const dialog = document.querySelector<HTMLDialogElement>('[data-consent-dialog]');
  if (!banner || !dialog) return;
  const revision = Number(banner.dataset['consentRevision'] ?? 1);
  const switches = [...dialog.querySelectorAll<HTMLButtonElement>('[data-consent-switch]')];
  let action: ConsentAction = 'custom';
  let opener: HTMLElement | null = null;

  // The banner's height, so the page can scroll clear of it and keyboard focus stops above it.
  const space = new ResizeObserver(() => {
    const height = banner.hidden ? 0 : banner.offsetHeight + 24;
    document.documentElement.style.setProperty('--consent-space', `${height}px`);
  });
  const showBanner = (show: boolean) => {
    banner.hidden = !show;
    if (show) space.observe(banner);
    else {
      space.disconnect();
      document.documentElement.style.removeProperty('--consent-space');
    }
  };

  const choose = (categories: string[], how: ConsentAction) => {
    action = how;
    acceptCategory(categories);
    showBanner(false);
    if (dialog.open) dialog.close();
  };

  const setSwitch = (button: HTMLButtonElement, on: boolean) =>
    button.setAttribute('aria-checked', String(on));

  const openDialog = (from: HTMLElement) => {
    opener = from;
    const current = validConsent() ? accepted() : [];
    switches.forEach((s) => setSwitch(s, current.includes(s.dataset['consentSwitch'] ?? '')));
    showBanner(false);
    dialog.showModal();
    dialog.querySelector<HTMLButtonElement>('[data-consent-close]')?.focus();
  };

  // Closed without saving (close button or Esc): back to the banner if nothing's been chosen yet.
  dialog.addEventListener('close', () => {
    const undecided = !validConsent();
    if (undecided) showBanner(true);
    const back =
      opener && opener.isConnected && opener.offsetParent !== null
        ? opener
        : undecided
          ? banner.querySelector<HTMLElement>('[data-consent-preferences]')
          : null;
    back?.focus();
  });
  dialog.querySelector('[data-consent-close]')?.addEventListener('click', () => dialog.close());

  document.querySelectorAll<HTMLElement>('[data-consent-preferences]').forEach((button) => {
    button.addEventListener('click', () => openDialog(button));
  });
  document.querySelectorAll('[data-consent-accept]').forEach((button) => {
    button.addEventListener('click', () => choose([...CATEGORIES], 'accept_all'));
  });
  document.querySelectorAll('[data-consent-reject]').forEach((button) => {
    button.addEventListener('click', () => choose([], 'reject_all'));
  });
  dialog.querySelector('[data-consent-save]')?.addEventListener('click', () => {
    const on = switches
      .filter((s) => s.getAttribute('aria-checked') === 'true')
      .map((s) => s.dataset['consentSwitch'] ?? '');
    choose(on, 'custom');
  });
  switches.forEach((s) =>
    s.addEventListener('click', () => setSwitch(s, s.getAttribute('aria-checked') !== 'true')),
  );
  dialog.querySelectorAll<HTMLButtonElement>('[data-consent-expand]').forEach((toggle) => {
    toggle.addEventListener('click', () => {
      const open = toggle.getAttribute('aria-expanded') !== 'true';
      toggle.setAttribute('aria-expanded', String(open));
      const panel = document.getElementById(toggle.getAttribute('aria-controls') ?? '');
      if (panel) panel.hidden = !open;
    });
  });

  void run({
    autoShow: false,
    // Headless browsers (and the test suite) still get the banner; there's no interface to hide.
    hideFromBots: false,
    manageScriptTags: false,
    revision,
    cookie: { name: CONSENT_COOKIE, expiresAfterDays: CONSENT_DAYS, sameSite: 'Lax' },
    categories: {
      necessary: { enabled: true, readOnly: true },
      analytics: { autoClear: { cookies: [{ name: /^_ga/ }, { name: 'FPLC' }] } },
      advertising: {
        autoClear: { cookies: [{ name: /^_gcl/ }, { name: /^_gac/ }, { name: 'FPAU' }] },
      },
    },
    // CookieConsent needs a translation to start, though its own text is never shown.
    language: {
      default: 'en',
      translations: { en: { consentModal: {}, preferencesModal: { sections: [] } } },
    },
    // Consent Mode is updated before the interaction event is pushed (CookieConsent calls onFirstConsent
    // before onConsent), so Tag Manager handles the event with the new choice already in force.
    onConsent: () => gtag('consent', 'update', consentSignals(accepted())),
    onFirstConsent: () => {
      gtag('consent', 'update', consentSignals(accepted()));
      record(action);
    },
    onChange: () => {
      gtag('consent', 'update', consentSignals(accepted()));
      record(action);
    },
  }).then(() => {
    if (!validConsent()) showBanner(true);
  });
}
