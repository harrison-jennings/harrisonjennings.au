#!/usr/bin/env bash
# Waits for Cloudflare Workers Builds to finish building and deploying a commit, by watching the
# "Workers Builds" check it posts on that commit. Used by the CD Orchestrator's workflows.
#
#   GH_TOKEN=… REPO=owner/name bash scripts/wait-for-cloudflare.sh <commit SHA>
set -euo pipefail

sha="${1:?usage: wait-for-cloudflare.sh <commit SHA>}"
: "${REPO:?set REPO to owner/name}"

for _ in $(seq 1 60); do
  result=$(gh api "repos/$REPO/commits/$sha/check-runs" \
    --jq '[.check_runs[] | select(.name | startswith("Workers Builds"))][0] | "\(.status) \(.conclusion)"')
  echo "Workers Builds: ${result:-not started}"
  case "$result" in
    'completed success') exit 0 ;;
    completed*)
      echo "::error::Cloudflare's build or deploy didn't succeed: $result"
      exit 1
      ;;
  esac
  sleep 15
done
echo "::error::Timed out waiting for Cloudflare's deploy"
exit 1
