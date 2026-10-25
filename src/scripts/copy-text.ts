// A button with data-copy-text="…" copies that text and reads "copied" for 1.6s.
const bound = new WeakSet<HTMLButtonElement>();

/** Safe to call twice on one button (two components' scripts may both find it): it binds once. */
export function bindCopyText(button: HTMLButtonElement): void {
  if (bound.has(button)) return;
  bound.add(button);
  const label = button.querySelector<HTMLElement>('[data-copy-label]') ?? button;
  const original = label.textContent;
  let timer: number | undefined;
  button.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(button.dataset['copyText'] ?? '');
    } catch {
      return; // Clipboard blocked: the address is still on the page to select.
    }
    label.textContent = 'copied';
    button.setAttribute('data-copied', '');
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      label.textContent = original;
      button.removeAttribute('data-copied');
    }, 1600);
  });
}
