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

# The Railway project + environment this folder is linked to. The clean copy below lives in a temp folder
# that is NOT linked, and an unlinked `railway up` quietly creates a brand-new empty project (2026-11-05),
# so the target is always passed explicitly.
SERVICE=game
HEALTH=https://ancient-realms.up.railway.app/healthz
target="$(npx --yes @railway/cli status --json 2>/dev/null | node -e '
  let s = ""; process.stdin.on("data", (d) => (s += d)).on("end", () => {
    try {
      const j = JSON.parse(s);
      const env = j.environments.edges.find((e) => e.node.name === "production");
      const svc = j.services.edges.some((e) => e.node.name === process.argv[1]);
      if (j.id && env && svc) process.stdout.write(`${j.id} ${env.node.id}`);
    } catch {}
  });' "$SERVICE")"
if [ -z "$target" ]; then
  echo "This folder is not linked to the game's Railway project (with a \"production\" environment and a \"$SERVICE\" service)."
  echo "Run: npx @railway/cli link   (pick ancient-realms, production, $SERVICE), then npm run deploy again."
  exit 1
fi
read -r project environment <<<"$target"

echo "Checking $(git log --oneline -1)"
npm run typecheck
npx vitest run --no-file-parallelism

# Upload a clean copy of the commit (no local files, data or build output).
dir="$(mktemp -d)"
trap 'git worktree remove --force "$dir" >/dev/null 2>&1 || true' EXIT
git worktree add --detach "$dir" HEAD >/dev/null
(cd "$dir" && npx --yes @railway/cli up --project "$project" --environment "$environment" --service "$SERVICE" --ci)

# Wait until the live server answers (start + migrations take a little while).
for _ in $(seq 1 30); do
  if [ "$(curl -s -m 10 -o /dev/null -w '%{http_code}' "$HEALTH")" = 200 ]; then
    echo "Deployed $(git log --oneline -1). The live server answers: $HEALTH"
    exit 0
  fi
  sleep 10
done
echo "Uploaded $(git log --oneline -1), but $HEALTH did not answer within 5 minutes."
echo "See why: npx @railway/cli logs --service $SERVICE"
exit 1
