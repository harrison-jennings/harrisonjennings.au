// A button with data-copy-text="…" copies that text and reads "copied" for 1.6s.
export function bindCopyText(button: HTMLButtonElement): void {
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
