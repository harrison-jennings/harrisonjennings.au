#!/usr/bin/env bash
# The design system's live domain, checked from GitHub. Bot Fight Mode challenges data-centre addresses
# and can't be exempted on the free plan, so a challenge is noted rather than failed; the full smoke
# test runs against the deployed version instead (scripts/design-smoke-test.sh). Otherwise: the domain
# serves the design system, never indexed.
set -uo pipefail

response=$(curl -s -D - -o /dev/null --max-time 20 https://design.harrisonjennings.au/ | tr -d '\r' | tr '[:upper:]' '[:lower:]')
code=$(head -1 <<<"$response" | awk '{print $2}')

if grep -q '^cf-mitigated:' <<<"$response"; then
  echo "– design.harrisonjennings.au couldn't be checked: Bot Fight Mode challenged the request"
  echo "::notice::The design system's live domain couldn't be checked from GitHub (Bot Fight Mode challenge)"
  exit 0
fi
if [ "$code" = 200 ] && grep -q '^x-robots-tag: noindex, nofollow' <<<"$response"; then
  echo "✓ design.harrisonjennings.au serves the design system, never indexed"
  exit 0
fi
echo "✗ design.harrisonjennings.au answered $code without its noindex, nofollow header"
exit 1
