#!/usr/bin/env bash
# A quick check that a deployed copy of the site works: a few pages, an old WordPress redirect, the
# 404, the security headers, the feeds and the Worker. The CD Orchestrator runs it after each deploy of
# main against that exact version's preview address (.github/workflows/production-version.yml), with
# the Access service token in CF_ACCESS_CLIENT_ID and CF_ACCESS_CLIENT_SECRET. Also handy by hand:
#
#   bash scripts/smoke-test.sh https://www.harrisonjennings.au   # from a home network: Bot Fight Mode
#                                                                 # challenges data-centre addresses
#   bash scripts/smoke-test.sh http://127.0.0.1:8790             # npm run preview, or the e2e server
set -uo pipefail

base="${1:?usage: smoke-test.sh <base URL>}"
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
location() { get -o /dev/null -w '%{redirect_url}' "$base$1"; }
headers() { get -D - -o /dev/null "$base$1" | tr -d '\r' | tr '[:upper:]' '[:lower:]'; }
body() { get "$base$1"; }
has() { grep -q -- "$1" <<<"$2"; }

home=$(body /)
home_headers=$(headers /)

check 'home page answers 200' [ "$(status /)" = 200 ]
check 'home page has the cookie banner' has 'data-consent-banner' "$home"
check 'home page has its structured data' has 'application/ld+json' "$home"
check 'the blog answers 200' [ "$(status /blog/)" = 200 ]
check 'a post answers 200' [ "$(status /blog/whats-this-all-about/)" = 200 ]
check 'projects answers 200' [ "$(status /projects/)" = 200 ]
old=/2025/11/whats-this-all-about/
check 'an old WordPress post URL 301s to its new home' [ "$(status "$old")" = 301 ]
check 'and the redirect lands on the post' [ "$(location "$old")" = "$base/blog/whats-this-all-about/" ]
check 'an unknown page answers 404' [ "$(status /this-page-does-not-exist/)" = 404 ]
check 'HSTS header' has 'strict-transport-security:' "$home_headers"
check 'nosniff header' has 'x-content-type-options: nosniff' "$home_headers"
check 'frame header' has 'x-frame-options: deny' "$home_headers"
check 'Content-Security-Policy header' has 'content-security-policy' "$home_headers"
check 'the sitemap answers 200' [ "$(status /sitemap-index.xml)" = 200 ]
check 'the feed answers 200' [ "$(status /rss.xml)" = 200 ]
check 'robots.txt answers 200' [ "$(status /robots.txt)" = 200 ]
check 'the Worker answers (consent log refuses a GET)' [ "$(status /api/consent)" = 405 ]

# The bare domain redirect is a Cloudflare rule, so it's only there in production.
if [ "$base" = 'https://www.harrisonjennings.au' ]; then
  bare=$(curl -s -o /dev/null -w '%{http_code} %{redirect_url}' --max-time 20 https://harrisonjennings.au/)
  check 'the bare domain 301s to www' [ "$bare" = '301 https://www.harrisonjennings.au/' ]
fi

if [ "$failures" -gt 0 ]; then
  echo "$failures check(s) failed against $base"
  exit 1
fi
echo "All checks passed against $base"
