// The "built and shipped" tabs. Click, or arrow keys, Home and End, move between projects; only the
// chosen tab is in the tab order. Panes crossfade in CSS.
export function bindSwitcher(root: HTMLElement): void {
  const tabs = [...root.querySelectorAll<HTMLElement>('[role="tab"]')];
  const pick = (i: number, focus = false) => {
    tabs.forEach((tab, j) => {
      const on = i === j;
      tab.setAttribute('aria-selected', String(on));
      tab.tabIndex = on ? 0 : -1;
      const pane = document.getElementById(tab.getAttribute('aria-controls') ?? '');
      pane?.toggleAttribute('hidden', !on);
    });
    if (focus) tabs[i]?.focus();
  };
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => pick(i));
    tab.addEventListener('keydown', (e) => {
      const n = tabs.length;
      const to =
        e.key === 'ArrowDown' || e.key === 'ArrowRight'
          ? (i + 1) % n
          : e.key === 'ArrowUp' || e.key === 'ArrowLeft'
            ? (i - 1 + n) % n
            : e.key === 'Home'
              ? 0
              : e.key === 'End'
                ? n - 1
                : -1;
      if (to < 0) return;
      e.preventDefault();
      pick(to, true);
    });
  });
  const start = tabs.findIndex((t) => t.getAttribute('aria-selected') === 'true');
  pick(start < 0 ? 0 : start);
}
