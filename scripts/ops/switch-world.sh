#!/usr/bin/env bash
# Open a fresh world on the live server: the open beta, or later the real launch.
# Run from this repo folder (it is linked to the Railway project):
#   scripts/ops/switch-world.sh beta   0xYourAdminWallet
#   scripts/ops/switch-world.sh launch 0xYourAdminWallet
# It shows every change and asks before touching anything. Nothing is deleted: the old world's
# database file stays on the disk (/data), the server just opens a new file.
set -euo pipefail
cd "$(dirname "$0")/../.."
rw() { npx --yes @railway/cli "$@"; }

usage() {
  echo "Usage: scripts/ops/switch-world.sh beta|launch 0xYourAdminWallet"
  echo "  beta    free test world in /data/beta.db, named 'onchainTRAVIAN Beta', entry fee off"
  echo "  launch  the real world in /data/world1.db, named 'onchainTRAVIAN', entry fee on if ENTRY_ADDRESS is set"
  exit 1
}

mode="${1:-}"
admin="${2:-}"
[[ "$mode" == "beta" || "$mode" == "launch" ]] || usage
[[ "$admin" =~ ^0x[0-9a-fA-F]{40}$ ]] || { echo "The admin wallet must look like 0x followed by 40 letters/digits (got '$admin')."; usage; }

if ! rw whoami >/dev/null 2>&1; then
  echo "Not logged in to Railway. Run this first, then start this script again:"
  echo "  npx @railway/cli login --browserless"
  exit 1
fi

if [[ "$mode" == "beta" ]]; then
  vars=("DATABASE_PATH=/data/beta.db" "WORLD_NAME=onchainTRAVIAN Beta" "ENTRY_FEE_USD=0")
else
  vars=("DATABASE_PATH=/data/world1.db" "WORLD_NAME=onchainTRAVIAN" "ENTRY_FEE_USD=1")
fi
vars+=("WORLD_SPEED=100" "TROOP_SPEED=100" "MERCHANT_MULTIPLIER=10" "PROTECTION_HOURS=24"
       "ARTIFACT_DAY=0" "WONDER_DAY=0" "ADMIN_WALLETS=$(echo "$admin" | tr 'A-F' 'a-f')")

echo "Current world: $(rw variable list --service game --kv 2>/dev/null | grep -E '^(DATABASE_PATH|WORLD_NAME)=' | tr '\n' ' ')"
echo "These settings will be set on the live server ($mode):"
printf '  %s\n' "${vars[@]}"
echo "Then the server restarts (about a minute offline) and opens the new world."
read -r -p "Type yes to go ahead: " ok
[[ "$ok" == "yes" ]] || { echo "Nothing changed."; exit 1; }

rw variable set "${vars[@]}" --service game --skip-deploys >/dev/null
rw redeploy --service game --yes >/dev/null
echo "Done. In a minute or two:"
echo "  1. Open the game and connect your admin wallet ($admin): you get the Admin menu."
if [[ "$mode" == "beta" ]]; then
  echo "  2. Admin page > Announcement: 'Open beta - the world resets for the real launch. Please report bugs.'"
else
  echo "  2. Check the entry fee: a new wallet should see 'Step 1 of 2: entry fee' (only if ENTRY_ADDRESS is set)."
fi
echo "  3. Watch the Railway log for the 'running on' line and any errors."
