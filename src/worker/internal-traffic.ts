// GET /api/internal-traffic: marks this browser as the site owner's, then goes to the home page. Tag
// Manager reads the cookie and sends it with each event as traffic_type, so the analytics models can
// leave these visits out of reporting. Nothing links here. Anyone else who opens it only drops their own
// visits from the reports, and it changes no consent choice, so it needs no secret.

/** The longest browsers keep a cookie, and set by the server so Safari's 7-day limit doesn't apply. */
const MAX_AGE_SECONDS = 400 * 24 * 60 * 60;

export function handleInternalTraffic(request: Request): Response {
  if (request.method !== 'GET') {
    return new Response('Method not allowed', {
      status: 405,
      headers: { 'Content-Type': 'text/plain', Allow: 'GET' },
    });
  }
  return new Response(null, {
    status: 302,
    headers: {
      Location: '/',
      // Not HttpOnly: Tag Manager's cookie variable reads it in the browser.
      'Set-Cookie': `traffic_type=internal; Path=/; Max-Age=${MAX_AGE_SECONDS}; Secure; SameSite=Lax`,
      'Cache-Control': 'no-store',
    },
  });
}
