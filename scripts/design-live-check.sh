#!/usr/bin/env bash
# The design system's live domain, checked from GitHub, the way scripts/live-check.sh checks the site's:
# Bot Fight Mode challenges data-centre addresses and can't be exempted on the free plan, but it lets
# robots.txt through, so that's what's checked. Its own words show the domain serves the design system,
# and its headers that it's never indexed. A challenge anyway is noted rather than failed; the full
# smoke test runs against the deployed version (scripts/design-smoke-test.sh).
#
#   bash scripts/design-live-check.sh [base URL]   # the live domain unless given (npm run design:preview)
set -uo pipefail

base="${1:-https://design.harrisonjennings.au}"
url="${base%/}/robots.txt"
headers=$(mktemp)
body=$(curl -s -D "$headers" --max-time 20 "$url")
response=$(tr -d '\r' <"$headers" | tr '[:upper:]' '[:lower:]')
rm -f "$headers"
code=$(head -1 <<<"$response" | awk '{print $2}')

if grep -q '^cf-mitigated:' <<<"$response"; then
  echo "– design.harrisonjennings.au couldn't be checked: Bot Fight Mode challenged the request"
  echo "::notice::The design system's live domain couldn't be checked from GitHub (Bot Fight Mode challenge)"
  exit 0
fi
failures=0
if [ "$code" = 200 ] && grep -q 'the design system for harrisonjennings.au' <<<"$body"; then
  echo "✓ design.harrisonjennings.au serves the design system (its robots.txt says so)"
else
  echo "✗ design.harrisonjennings.au answered $code for robots.txt, without the design system's own"
  failures=$((failures + 1))
fi
if grep -q '^x-robots-tag: noindex, nofollow' <<<"$response"; then
  echo "✓ never indexed (X-Robots-Tag: noindex, nofollow)"
else
  echo "✗ no X-Robots-Tag: noindex, nofollow header"
  failures=$((failures + 1))
fi
[ "$failures" -eq 0 ] || exit 1
