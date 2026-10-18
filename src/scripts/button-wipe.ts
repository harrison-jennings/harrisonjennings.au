// Direction-aware wipe for buttons: in from the side the pointer enters, out the side it leaves.
// Touch plays it once; keyboard focus wipes in from the left.
const CLOSED_LEFT = 'inset(0 100% 0 0)';
const CLOSED_RIGHT = 'inset(0 0 0 100%)';
const OPEN = 'inset(0 0 0 0)';
const bound = new WeakSet<HTMLElement>();

export function bindWipe(button: HTMLElement): void {
  const layer = button.querySelector<HTMLElement>('.btn__wipe');
  if (!layer || bound.has(button)) return;
  bound.add(button);

  const side = (e: PointerEvent) => {
    const r = button.getBoundingClientRect();
    return e.clientX < r.left + r.width / 2 ? 'left' : 'right';
  };
  const jump = (value: string) => {
    layer.style.transition = 'none';
    layer.style.clipPath = value;
    layer.getBoundingClientRect(); // flush the jump before re-enabling the transition
    layer.style.transition = '';
  };
  const open = (from: 'left' | 'right') => {
    jump(from === 'left' ? CLOSED_LEFT : CLOSED_RIGHT);
    layer.style.clipPath = OPEN;
  };

  button.addEventListener('pointerenter', (e) => {
    if (e.pointerType !== 'touch') open(side(e));
  });
  button.addEventListener('pointerleave', (e) => {
    if (e.pointerType !== 'touch')
      layer.style.clipPath = side(e) === 'left' ? CLOSED_LEFT : CLOSED_RIGHT;
  });
  button.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'touch') return;
    open('left');
    window.setTimeout(() => (layer.style.clipPath = CLOSED_RIGHT), 520);
  });
  button.addEventListener('focus', () => {
    if (button.matches(':focus-visible')) open('left');
  });
  button.addEventListener('blur', () => (layer.style.clipPath = CLOSED_RIGHT));
}
