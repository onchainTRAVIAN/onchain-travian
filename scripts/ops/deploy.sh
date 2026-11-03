#!/usr/bin/env bash
# Deploy exactly the committed code to the live server, only after the type check and every test pass.
# Usage (from this repo folder, logged in to Railway): npm run deploy
# Uncommitted changes stop it: commit (and push) first, so what goes live is what GitHub and CI saw.
set -euo pipefail
cd "$(dirname "$0")/../.."

if [ -n "$(git status --porcelain)" ]; then
  echo "You have uncommitted changes. Commit them first (git add -A && git commit), then run npm run deploy again."
  git status --short
  exit 1
fi
if ! npx --yes @railway/cli whoami >/dev/null 2>&1; then
  echo "Not logged in to Railway. Run: npx @railway/cli login --browserless"
  exit 1
fi

echo "Checking $(git log --oneline -1)"
npm run typecheck
npx vitest run --no-file-parallelism

# Upload a clean copy of the commit (no local files, data or build output).
dir="$(mktemp -d)"
trap 'git worktree remove --force "$dir" >/dev/null 2>&1 || true' EXIT
git worktree add --detach "$dir" HEAD >/dev/null
(cd "$dir" && npx --yes @railway/cli up --service game --ci)
echo "Deployed $(git log --oneline -1). Check https://ancient-realms.up.railway.app/healthz in a minute."
