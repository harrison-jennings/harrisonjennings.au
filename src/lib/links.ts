// Which links go to another site, for the components and the Markdown pipeline alike: those open in
// a new tab, with rel="noopener" and a hidden note for screen readers. The site's own host, with or
// without www, is this site; its other subdomains (leadlens., status.) are separate sites.
import { SITE } from '../consts';

const OWN_HOST = new URL(SITE.url).hostname;
const OWN_HOSTS = new Set([OWN_HOST, OWN_HOST.replace(/^www\./, '')]);

/** Read by screen readers inside every link that opens a new tab. */
export const NEW_TAB_NOTE = ' (opens in a new tab)';

/** Whether an href points at another site over http(s). */
export function isExternal(href: unknown): boolean {
  if (typeof href !== 'string' || !/^https?:\/\//i.test(href)) return false;
  try {
    return !OWN_HOSTS.has(new URL(href).hostname);
  } catch {
    return false;
  }
}
