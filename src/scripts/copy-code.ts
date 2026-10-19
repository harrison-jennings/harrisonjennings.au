// The copy button on a code block: copies the code, minus terminal prompts, and says "copied"
// for 1.6s.
export function bindCopyCode(button: HTMLButtonElement): void {
  button.addEventListener('click', async () => {
    const code = button.closest('.codeblock')?.querySelector('code');
    if (!code) return;
    const lines = [...code.querySelectorAll('.line')].map((line) => {
      const clone = line.cloneNode(true) as HTMLElement;
      clone.querySelectorAll('.tk-prompt').forEach((p) => p.remove());
      return clone.textContent ?? '';
    });
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      button.textContent = 'copied';
      window.setTimeout(() => (button.textContent = 'copy'), 1600);
    } catch {
      // Clipboard blocked: nothing to say; the code can still be selected.
    }
  });
}
