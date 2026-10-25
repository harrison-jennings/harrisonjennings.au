#!/usr/bin/env bash
# The preview address of the Worker version Cloudflare deployed for a commit, from the Version ID in
# its "Workers Builds: <Worker>" check: https://<first 8 characters>-<Worker>.harrisonjennings-au.workers.dev
# Each Worker connected to the repository posts its own check, so it's picked by name: WORKER, or the
# site's (harrisonjennings-au). It's on Cloudflare's domain, so the zone's Bot Fight Mode doesn't apply;
# Access protects it. Only production builds (main) report a Version ID; for others this prints nothing
# and exits 1.
#
#   GH_TOKEN=… REPO=owner/name [WORKER=name] bash scripts/version-url.sh <commit SHA>
set -euo pipefail

sha="${1:?usage: version-url.sh <commit SHA>}"
: "${REPO:?set REPO to owner/name}"
worker="${WORKER:-harrisonjennings-au}"

summary=$(gh api "repos/$REPO/commits/$sha/check-runs" \
  --jq "[.check_runs[] | select(.name == \"Workers Builds: $worker\")][0].output.summary // \"\"")
version=$(printf '%s' "$summary" | grep -oE 'Version ID: [0-9a-f-]+' | head -1 | cut -d' ' -f3)
if [ -z "$version" ]; then
  echo "No Version ID in Cloudflare's check for $sha (only production builds report one)" >&2
  exit 1
fi
echo "https://${version:0:8}-$worker.harrisonjennings-au.workers.dev"
