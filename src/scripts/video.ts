// A YouTube video in a post: the play button swaps in the player (youtube-nocookie.com), so nothing
// loads from YouTube until someone asks for it.
export function bindVideo(box: HTMLElement): void {
  const button = box.querySelector<HTMLButtonElement>('.video__play');
  const id = box.dataset['video'];
  if (!button || !id) return;
  button.addEventListener('click', () => {
    const frame = document.createElement('iframe');
    frame.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0`;
    frame.title = box.dataset['videoTitle'] ?? 'YouTube video';
    frame.allow =
      'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
    frame.allowFullscreen = true;
    box.replaceChildren(frame);
    frame.focus();
  });
}
