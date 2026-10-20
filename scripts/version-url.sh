#!/usr/bin/env bash
# The preview address of the Worker version Cloudflare deployed for a commit, from the Version ID in
# its "Workers Builds" check: https://<first 8 characters>-harrisonjennings-au.harrisonjennings-au.workers.dev
# It's on Cloudflare's domain, so the zone's Bot Fight Mode doesn't apply; Access protects it.
#
#   GH_TOKEN=… REPO=owner/name bash scripts/version-url.sh <commit SHA>
set -euo pipefail

sha="${1:?usage: version-url.sh <commit SHA>}"
: "${REPO:?set REPO to owner/name}"

summary=$(gh api "repos/$REPO/commits/$sha/check-runs" \
  --jq '[.check_runs[] | select(.name | startswith("Workers Builds"))][0].output.summary // ""')
version=$(printf '%s' "$summary" | grep -oE 'Version ID: [0-9a-f-]+' | head -1 | cut -d' ' -f3)
if [ -z "$version" ]; then
  echo "::error::No Version ID in Cloudflare's check for $sha" >&2
  exit 1
fi
echo "https://${version:0:8}-harrisonjennings-au.harrisonjennings-au.workers.dev"
