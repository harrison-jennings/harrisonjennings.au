#!/usr/bin/env bash
# A branch's Cloudflare Preview URL, as Workers Builds names it: the branch lowercased, anything else
# a hyphen. Prints nothing when the name is too long to predict (Cloudflare shortens it and adds a
# hash). Used by the CD Orchestrator's preview link and Preview deployment.
#
#   bash scripts/preview-url.sh feat/github-deployments
#   → https://feat-github-deployments-harrisonjennings-au.harrisonjennings-au.workers.dev/
set -euo pipefail

branch="${1:?usage: preview-url.sh <branch>}"
slug=$(printf '%s' "$branch" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9]+/-/g; s/^-+//; s/-+$//')
host="$slug-harrisonjennings-au"
if [ "${#host}" -le 63 ]; then
  echo "https://$host.harrisonjennings-au.workers.dev/"
fi
