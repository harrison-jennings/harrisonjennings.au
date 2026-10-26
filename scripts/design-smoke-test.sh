#!/usr/bin/env bash
# A quick check that a deployed copy of the design system works: its pages and specimens, the shared
# fonts, the 404, and the headers that keep it out of search and framed only by itself. The CD
# Orchestrator runs it after each deploy against that exact version's preview address
# (.github/workflows/production-version.yml), with the Access service token in
# CF_ACCESS_CLIENT_ID and CF_ACCESS_CLIENT_SECRET. Also handy by hand:
#
#   bash scripts/design-smoke-test.sh https://design.harrisonjennings.au   # from a home network
#   bash scripts/design-smoke-test.sh http://127.0.0.1:8791                # npm run design:preview
set -uo pipefail

base="${1:?usage: design-smoke-test.sh <base URL>}"
base="${base%/}"
failures=0

# The Access service token, for preview addresses, when it's set.
auth=()
if [ -n "${CF_ACCESS_CLIENT_ID:-}" ] && [ -n "${CF_ACCESS_CLIENT_SECRET:-}" ]; then
  auth=(-H "CF-Access-Client-Id: $CF_ACCESS_CLIENT_ID" -H "CF-Access-Client-Secret: $CF_ACCESS_CLIENT_SECRET")
fi
get() { curl -s --max-time 20 ${auth[@]+"${auth[@]}"} "$@"; }

check() {
  local name=$1
  shift
  if "$@"; then
    echo "✓ $name"
  else
    echo "✗ $name"
    failures=$((failures + 1))
  fi
}
status() { get -o /dev/null -w '%{http_code}' "$base$1"; }
headers() { get -D - -o /dev/null "$base$1" | tr -d '\r' | tr '[:upper:]' '[:lower:]'; }
body() { get "$base$1"; }
has() { grep -q -- "$1" <<<"$2"; }

home=$(body /)
home_headers=$(headers /)

check 'overview answers 200' [ "$(status /)" = 200 ]
check 'overview has the shell' has 'class="ds-head"' "$home"
check 'overview names the commit it was built from' has 'class="ds-stamp"' "$home"
check 'a specimen answers 200' [ "$(status /specimens/button/)" = 200 ]
check 'the shared fonts answer 200' [ "$(status /fonts/SchibstedGrotesk-Variable.woff2)" = 200 ]
check 'an unknown page answers 404' [ "$(status /this-page-does-not-exist/)" = 404 ]
# Cloudflare sends a plain noindex on preview addresses; the custom domain sends "noindex, nofollow".
check 'noindex header' has 'x-robots-tag: noindex' "$home_headers"
check 'frame header' has 'x-frame-options: sameorigin' "$home_headers"
check "Content-Security-Policy lets only the design system frame it" has "frame-ancestors 'self'" "$home_headers"
check 'nosniff header' has 'x-content-type-options: nosniff' "$home_headers"

if [ "$failures" -gt 0 ]; then
  echo "$failures check(s) failed against $base"
  exit 1
fi
echo "All checks passed against $base"
