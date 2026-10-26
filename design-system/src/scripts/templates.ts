// The templates gallery's thumbnail theme (components/TemplateGallery.astro): the page's own theme
// until dark or light is picked here.

const viewedTheme = (): string =>
  document.documentElement.dataset['theme'] === 'light' ? 'light' : 'dark';

for (const group of document.querySelectorAll<HTMLElement>('[data-thumb-themes]')) {
  const grid = group.closest('.tp-bar')?.nextElementSibling as HTMLElement | null;
  if (!grid) continue;
  let chosen = false;
  const show = (theme: string) => {
    grid.dataset['thumbs'] = theme;
    for (const b of group.querySelectorAll<HTMLButtonElement>('[data-thumb-theme]'))
      b.setAttribute('aria-pressed', String(b.dataset['thumbTheme'] === theme));
  };
  for (const b of group.querySelectorAll<HTMLButtonElement>('[data-thumb-theme]'))
    b.addEventListener('click', () => {
      chosen = true;
      show(b.dataset['thumbTheme'] ?? 'dark');
    });
  show(viewedTheme());
  new MutationObserver(() => chosen || show(viewedTheme())).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });
}
