// Dark on every first visit; the toggle switches theme and remembers the choice.
// The inline script in Base.astro applies the saved theme before first paint, so there is no flash.
export type Theme = 'dark' | 'light';

export const THEME_KEY = 'hj-theme';

export const currentTheme = (): Theme =>
  document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';

const labelFor = (theme: Theme) =>
  theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode';

export function setTheme(theme: Theme): void {
  document.documentElement.setAttribute('data-theme', theme);
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Storage can be blocked (private windows); the theme still applies for this page.
  }
  // The browser bar takes the new theme's ground colour (design/tokens.json, through tokens.css).
  const ground = getComputedStyle(document.documentElement).getPropertyValue('--ground').trim();
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', ground);
  document
    .querySelectorAll('[data-theme-toggle]')
    .forEach((b) => b.setAttribute('aria-label', labelFor(theme)));
}

export function bindThemeToggle(button: HTMLElement): void {
  button.setAttribute('aria-label', labelFor(currentTheme()));
  button.addEventListener('click', () => setTheme(currentTheme() === 'light' ? 'dark' : 'light'));
}
