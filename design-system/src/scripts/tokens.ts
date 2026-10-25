// The token table's filters (components/TokenTable.astro): one kind at a time, or all. The choice is
// kept in the address (?kind=type), so a link can point at it, and read back on load.

for (const group of document.querySelectorAll<HTMLElement>('[data-token-filters]')) {
  const table = group.parentElement?.querySelector<HTMLTableElement>('[data-token-table]');
  const buttons = [...group.querySelectorAll<HTMLButtonElement>('button[data-kind]')];
  if (!table) continue;

  const show = (kind: string) => {
    for (const b of buttons) b.setAttribute('aria-pressed', String(b.dataset['kind'] === kind));
    for (const row of table.querySelectorAll<HTMLTableRowElement>('tbody tr'))
      row.hidden = kind !== 'all' && row.dataset['kind'] !== kind;
  };

  const asked = new URLSearchParams(location.search).get('kind');
  if (asked && buttons.some((b) => b.dataset['kind'] === asked)) show(asked);

  for (const b of buttons) {
    b.addEventListener('click', () => {
      const kind = b.dataset['kind'] ?? 'all';
      show(kind);
      const url = new URL(location.href);
      url.searchParams.set('kind', kind);
      history.replaceState(null, '', url);
    });
  }
}
