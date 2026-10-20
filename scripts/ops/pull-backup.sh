#!/usr/bin/env bash
# Download the newest database snapshot (or the one named) from the live server's /data/backups into data/backups/.
# Run from a checkout linked to the Railway project (`railway link`). Usage: scripts/ops/pull-backup.sh [name.db.gz]
set -euo pipefail
cd "$(dirname "$0")/../.."
remote() { npx --yes @railway/cli ssh --service game "$1" 2>/dev/null | tr -d '\r'; }

name="${1:-$(remote 'ls -1 /data/backups | grep -E "\.db\.gz$" | sort | tail -n 1' | tr -d '\n')}"
[ -n "$name" ] || { echo "No snapshots in /data/backups yet (the server writes one a minute after it starts)"; exit 1; }
mkdir -p data/backups
want="$(remote "sha256sum /data/backups/$name" | cut -d' ' -f1)"
remote "base64 -w0 /data/backups/$name" | grep -o '[A-Za-z0-9+/=]*' | tr -d '\n' | base64 -d > "data/backups/$name"
got="$(sha256sum "data/backups/$name" | cut -d' ' -f1)"
if [ "$want" != "$got" ]; then rm -f "data/backups/$name"; echo "Checksum mismatch, try again"; exit 1; fi
echo "Saved data/backups/$name ($(du -h "data/backups/$name" | cut -f1)), checksum ok"
echo "Restore: gunzip it, stop the service, put it at DATABASE_PATH (remove the old -wal/-shm files), start again"
