// The shell's behaviour (layouts/Shell.astro): the sidebar's and menu's groups open and close, and
// what's opened is remembered for the visit; the phone menu opens as a modal dialog (focus stays in it,
// Esc closes it, focus goes back to what opened it); its sections open one at a time or together.

const STORE = 'ds-groups';

function remembered(): Record<string, boolean> {
  try {
    return JSON.parse(sessionStorage.getItem(STORE) ?? '{}') as Record<string, boolean>;
  } catch {
    return {};
  }
}

function remember(group: string, open: boolean): void {
  try {
    sessionStorage.setItem(STORE, JSON.stringify({ ...remembered(), [group]: open }));
  } catch {
    // Storage can be blocked; every page then simply opens its own group.
  }
}

/** Opens or closes what a toggle controls. */
function setOpen(toggle: HTMLElement, open: boolean): void {
  toggle.setAttribute('aria-expanded', String(open));
  const target = document.getElementById(toggle.getAttribute('aria-controls') ?? '');
  target?.setAttribute('data-open', String(open));
}

// Groups: the one holding the current page starts open; the others as they were left this visit.
const stored = remembered();
document.querySelectorAll<HTMLButtonElement>('[data-group-toggle]').forEach((toggle) => {
  const group = toggle.closest<HTMLElement>('[data-group]')?.dataset['group'] ?? '';
  const holdsCurrent = toggle.getAttribute('aria-expanded') === 'true';
  if (!holdsCurrent && stored[group] !== undefined) setOpen(toggle, stored[group]);
  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    setOpen(toggle, open);
    remember(group, open);
  });
});

// The phone menu's sections.
document.querySelectorAll<HTMLButtonElement>('[data-section-toggle]').forEach((toggle) => {
  toggle.addEventListener('click', () =>
    setOpen(toggle, toggle.getAttribute('aria-expanded') !== 'true'),
  );
});

// The phone menu itself.
const menu = document.querySelector<HTMLDialogElement>('[data-menu]');
let openedBy: HTMLElement | null = null;
document.querySelectorAll<HTMLButtonElement>('[data-menu-open]').forEach((button) => {
  button.addEventListener('click', (e) => {
    if (!menu) return;
    openedBy = button;
    menu.showModal();
    // From the keyboard (no pointer: detail 0) focus goes to the current section, ring and all; from a
    // tap it goes to the menu itself, so no ring appears that nobody asked for.
    const current = menu.querySelector<HTMLElement>('[data-section-toggle][aria-current]');
    if (e.detail === 0 && current) current.focus();
    else menu.focus();
  });
});
menu?.querySelector('[data-menu-close]')?.addEventListener('click', () => menu.close());
menu?.addEventListener('close', () => openedBy?.focus());
// The menu is only for the compact shell, below 1024px (styles/shell.css).
window.matchMedia('(min-width: 1024px)').addEventListener('change', (e) => {
  if (e.matches && menu?.open) menu.close();
});
