// Links that leave the design system, harrisonjennings.au included, open in a new tab with
// rel="noopener" and the site's hidden note for screen readers (src/lib/links.ts), as the site's own do.
import { NEW_TAB_NOTE } from '../../../src/lib/links';

export { NEW_TAB_NOTE };

const OWN_HOST = 'design.harrisonjennings.au';

export function leavesSite(href: string): boolean {
  if (!/^https?:\/\//i.test(href)) return false;
  try {
    return new URL(href).hostname !== OWN_HOST;
  } catch {
    return false;
  }
}

/** The attributes for a link that leaves the design system. */
export const newTab = (href: string) =>
  leavesSite(href) ? { target: '_blank', rel: 'noopener' } : {};
