#!/usr/bin/env bash
# Whether Workers Builds built a Worker for a commit: prints true or false. The design system's Worker
# builds only when a push touches its watch paths (docs/design-system.md), while the site's builds on
# every push, and both post their check when the push arrives. So once the site's build has finished,
# the Worker either has a check on the commit or wasn't built. Used by the CD Orchestrator to record a
# deployment only for commits Cloudflare actually built.
#
#   GH_TOKEN=… REPO=owner/name WORKER=name bash scripts/cloudflare-built.sh <commit SHA>
set -euo pipefail

sha="${1:?usage: cloudflare-built.sh <commit SHA>}"
: "${REPO:?set REPO to owner/name}"
: "${WORKER:?set WORKER to a Worker name}"

# The site's own build, which every push gets (its progress goes to stderr; stdout is the answer).
WORKER=harrisonjennings-au bash "$(dirname "$0")/wait-for-cloudflare.sh" "$sha" >&2

count=$(gh api "repos/$REPO/commits/$sha/check-runs" \
  --jq "[.check_runs[] | select(.name == \"Workers Builds: $WORKER\")] | length")
if [ "$count" -gt 0 ]; then echo true; else echo false; fi
