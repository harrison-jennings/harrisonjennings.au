// The preview frame (components/Preview.astro). Each view is the specimen page in an iframe kept at its
// true width (390, 1280, or the column's own for "fit"), so the site's own layout applies inside it,
// and scaled down to fit when the column is narrower; its height follows what the specimen reports
// (specimen.ts), capped at 360px until "show full height". Both themes sit side by side, or stack at
// desktop width; phones don't offer both. The theme follows the page's until the reader picks one here.

const CAP = 360;
const GAP = 22; // space-22, between the views
const phone = window.matchMedia('(max-width: 760px)');
const still = window.matchMedia('(prefers-reduced-motion: reduce)');
const pageTheme = (): 'dark' | 'light' =>
  document.documentElement.dataset['theme'] === 'light' ? 'light' : 'dark';

type Width = 'fit' | '390' | '1280';
type Theme = 'dark' | 'light' | 'both';

interface Frame {
  root: HTMLElement;
  stage: HTMLElement;
  views: Record<'dark' | 'light', HTMLElement>;
  width: Width;
  theme: Theme;
  /** The reader chose a theme here, so the page's no longer leads. */
  chosen: boolean;
  tall: boolean;
}

const heights = new Map<HTMLIFrameElement, number>();
const previews: Frame[] = [];

const press = (group: Element | null, attr: string, value: string) =>
  group?.querySelectorAll<HTMLButtonElement>(`[${attr}]`).forEach((b) => {
    b.setAttribute('aria-pressed', String(b.getAttribute(attr) === value));
  });

/** Which themes show, and how: both side by side, or stacked at desktop width. Phones show one. */
function layout(f: Frame) {
  const both = f.theme === 'both' && !phone.matches;
  const one = f.theme === 'both' ? pageTheme() : f.theme;
  const shown: ('dark' | 'light')[] = both ? ['dark', 'light'] : [one];
  const stacked = both && f.width === '1280';
  const styles = getComputedStyle(f.stage);
  const avail =
    f.stage.clientWidth -
    Number.parseFloat(styles.paddingLeft) -
    Number.parseFloat(styles.paddingRight);
  const slot = both && !stacked ? (avail - GAP) / 2 : avail;
  return { shown, stacked, slot };
}

function sizeLabel(f: Frame, theme: string, two: boolean, trueWidth: number): string {
  if (f.width === 'fit') return `<b>${two ? theme : 'own size'}</b> as it renders`;
  let name = theme;
  if (!two) name = f.width === '390' ? 'phone' : 'desktop';
  return `<b>${name} ${trueWidth}</b> wide`;
}

/** Sizes one view: its true width, its scale, its height (capped), its size line. Says if it's tall. */
function sizeView(f: Frame, theme: 'dark' | 'light', slot: number, two: boolean): boolean {
  const view = f.views[theme];
  const frame = view.querySelector<HTMLIFrameElement>('iframe');
  const vp = view.querySelector<HTMLElement>('.pf-vp');
  if (!frame || !vp) return false;
  // Loaded when first shown, still for readers who prefer reduced motion (the dark view's address is in
  // the page, so something shows without JavaScript, and is corrected here).
  const src = `${frame.dataset['src']}${still.matches ? '&still=1' : ''}`;
  if (frame.getAttribute('src') !== src) frame.setAttribute('src', src);

  const boxWidth = f.width === '390' ? Math.min(390 + 2, slot) : slot;
  view.style.width = `${boxWidth}px`;
  const inner = boxWidth - 2; // the viewport's 1px borders
  const trueWidth = f.width === 'fit' ? inner : Number(f.width);
  const scale = Math.min(1, inner / trueWidth);
  frame.style.width = `${trueWidth}px`;
  frame.style.transform = scale < 1 ? `scale(${scale})` : '';

  const label = view.querySelector<HTMLElement>('[data-size-label]');
  if (label) label.innerHTML = sizeLabel(f, theme, two, trueWidth);
  const pct = view.querySelector<HTMLElement>('[data-size-pct]');
  if (pct) pct.textContent = scale < 1 ? `shown at ${Math.round(scale * 100)}%` : '100%';

  const reported = heights.get(frame);
  if (reported === undefined) return false;
  frame.style.height = `${reported}px`;
  const full = Math.ceil(reported * scale);
  const cut = full > CAP && !f.tall;
  vp.style.height = `${cut ? CAP : full}px`;
  const fade = view.querySelector<HTMLElement>('.pf-fade');
  if (fade) fade.hidden = !cut;
  return full > CAP;
}

function render(f: Frame): void {
  const { shown, stacked, slot } = layout(f);
  f.stage.classList.toggle('pf-stage--stack', stacked);
  let tall = false;
  for (const theme of ['dark', 'light'] as const) {
    f.views[theme].hidden = !shown.includes(theme);
    if (!f.views[theme].hidden) tall = sizeView(f, theme, slot, shown.length === 2) || tall;
  }

  const more = f.root.querySelector<HTMLButtonElement>('[data-tall]');
  if (more) {
    more.hidden = !tall;
    more.setAttribute('aria-expanded', String(f.tall));
    more.textContent = f.tall ? 'show less' : 'show full height';
  }
  const open = f.root.querySelector<HTMLAnchorElement>('[data-open]');
  if (open) open.href = `${f.root.dataset['specimen']}?theme=${shown[0]}`;
  press(f.root.querySelector('[aria-label="Preview width"]'), 'data-width', f.width);
  press(
    f.root.querySelector('[aria-label="Preview theme"]'),
    'data-theme-choice',
    shown.length === 2 ? 'both' : (shown[0] ?? 'dark'),
  );
}

function bindCode(root: HTMLElement): void {
  const toggle = root.querySelector<HTMLButtonElement>('[data-code-toggle]');
  const code = root.querySelector<HTMLElement>('.pf-code');
  const barCopy = root.querySelector<HTMLButtonElement>('[data-bar-copy]');
  const panelCopy = root.querySelector<HTMLButtonElement>('.pf-copy');
  const file = root.querySelector<HTMLElement>('[data-file-label]');
  const tabs = [...root.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
  const panels = [...root.querySelectorAll<HTMLElement>('[role="tabpanel"]')];

  toggle?.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    toggle.setAttribute('aria-expanded', String(open));
    const label = toggle.querySelector('[data-code-label]');
    if (label) label.textContent = open ? 'hide code' : 'show code';
    if (code) code.hidden = !open;
    if (barCopy) barCopy.hidden = open;
  });

  const select = (i: number) => {
    tabs.forEach((t, n) => {
      t.setAttribute('aria-selected', String(n === i));
      t.tabIndex = n === i ? 0 : -1;
    });
    panels.forEach((p, n) => {
      p.hidden = n !== i;
      // Switching tabs collapses long code again.
      p.querySelector('.pf-pre-box')?.removeAttribute('data-expanded');
      const more = p.querySelector<HTMLButtonElement>('[data-more]');
      if (more) {
        more.setAttribute('aria-expanded', 'false');
        more.textContent = `show all ${more.dataset['more']} lines`;
      }
    });
    const text = panels[i]?.dataset['code'] ?? '';
    for (const copy of [barCopy, panelCopy]) copy?.setAttribute('data-copy-text', text);
    if (file) file.textContent = tabs[i]?.dataset['file'] ?? '';
  };
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => select(i));
    tab.addEventListener('keydown', (e) => {
      const steps: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1 };
      const step = steps[e.key];
      if (!step) return;
      e.preventDefault();
      const next = (i + step + tabs.length) % tabs.length;
      select(next);
      tabs[next]?.focus();
    });
  });

  root.querySelectorAll<HTMLButtonElement>('[data-more]').forEach((more) => {
    more.addEventListener('click', () => {
      const box = more.closest('.pf-panel')?.querySelector('.pf-pre-box');
      const open = more.getAttribute('aria-expanded') !== 'true';
      more.setAttribute('aria-expanded', String(open));
      more.textContent = open ? 'show less' : `show all ${more.dataset['more']} lines`;
      box?.toggleAttribute('data-expanded', open);
    });
  });
}

for (const root of document.querySelectorAll<HTMLElement>('[data-preview]')) {
  const stage = root.querySelector<HTMLElement>('.pf-stage');
  const dark = root.querySelector<HTMLElement>('[data-view="dark"]');
  const light = root.querySelector<HTMLElement>('[data-view="light"]');
  // Code on its own (no specimen): just its tabs, copy and "show all".
  if (!stage || !dark || !light) {
    bindCode(root);
    continue;
  }
  const f: Frame = {
    root,
    stage,
    views: { dark, light },
    width: (root.dataset['start'] as Width | undefined) ?? 'fit',
    theme: pageTheme(),
    chosen: false,
    tall: false,
  };
  previews.push(f);

  root.querySelectorAll<HTMLButtonElement>('[data-width]').forEach((b) =>
    b.addEventListener('click', () => {
      f.width = b.dataset['width'] as Width;
      render(f);
    }),
  );
  root.querySelectorAll<HTMLButtonElement>('[data-theme-choice]').forEach((b) =>
    b.addEventListener('click', () => {
      f.theme = b.dataset['themeChoice'] as Theme;
      f.chosen = true;
      render(f);
    }),
  );
  root.querySelector('[data-tall]')?.addEventListener('click', () => {
    f.tall = !f.tall;
    render(f);
  });

  // A specimen that never reports its height didn't load: say so, with the link to open it.
  for (const frame of root.querySelectorAll<HTMLIFrameElement>('iframe')) {
    frame.addEventListener('load', () => {
      window.setTimeout(() => {
        if (heights.has(frame)) return;
        const view = frame.closest('.pf-view');
        view?.querySelector<HTMLElement>('.pf-error')?.removeAttribute('hidden');
        view?.querySelector<HTMLElement>('.pf-vp')?.setAttribute('hidden', '');
      }, 6000);
    });
  }

  bindCode(root);
  render(f);
}

window.addEventListener('message', (event: MessageEvent) => {
  if (event.origin !== window.location.origin || event.data?.type !== 'specimen-height') return;
  if (typeof event.data.height !== 'number') return;
  for (const f of previews) {
    const frame = [...f.root.querySelectorAll('iframe')].find(
      (i) => i.contentWindow === event.source,
    );
    if (!frame) continue;
    heights.set(frame, event.data.height);
    render(f);
  }
});

// The page's theme leads until the reader picks one in the frame.
new MutationObserver(() => {
  for (const f of previews) {
    if (!f.chosen) f.theme = pageTheme();
    render(f);
  }
}).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

new ResizeObserver(() => previews.forEach(render)).observe(document.body);
phone.addEventListener('change', () => previews.forEach(render));
