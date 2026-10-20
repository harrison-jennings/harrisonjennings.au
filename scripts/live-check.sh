#!/usr/bin/env bash
# The live domain, checked from GitHub. Bot Fight Mode challenges data-centre addresses and can't be
# exempted on the free plan, so only what it lets through is checked: that www serves this site (its
# robots.txt names sitemap-index.xml; WordPress's named sitemap_index.xml), and, if it isn't challenged,
# that the bare domain redirects to www. The full smoke test runs against the deployed version instead.
set -uo pipefail
failures=0

robots=$(curl -s --max-time 20 https://www.harrisonjennings.au/robots.txt)
if grep -q 'sitemap-index.xml' <<<"$robots"; then
  echo "✓ www serves this site (its robots.txt names sitemap-index.xml)"
else
  echo "✗ www isn't serving this site: its robots.txt doesn't name sitemap-index.xml"
  failures=$((failures + 1))
fi

response=$(curl -s -o /dev/null -D - --max-time 20 https://harrisonjennings.au/ | tr -d '\r')
code=$(head -1 <<<"$response" | awk '{print $2}')
location=$(grep -i '^location:' <<<"$response" | awk '{print $2}')
if [ "$code" = 301 ] && [ "$location" = 'https://www.harrisonjennings.au/' ]; then
  echo "✓ the bare domain 301s to www"
elif grep -qi '^cf-mitigated:' <<<"$response"; then
  echo "– the bare domain couldn't be checked: Bot Fight Mode challenged the request"
  echo "::notice::The bare-domain redirect couldn't be checked from GitHub (Bot Fight Mode challenge)"
else
  echo "✗ the bare domain answered $code ${location:-} instead of a 301 to www"
  failures=$((failures + 1))
fi

if [ "$failures" -gt 0 ]; then
  echo "$failures check(s) failed on the live domain"
  exit 1
fi
echo "The live domain checks passed"
