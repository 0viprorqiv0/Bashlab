#!/usr/bin/env bash
set -euo pipefail

repo_root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)
start_script="$repo_root/scripts/dev-start.sh"
stop_script="$repo_root/scripts/dev-stop.sh"

for script in "$start_script" "$stop_script"; do
  if [[ ! -x "$script" ]]; then
    printf 'expected executable script: %s\n' "$script" >&2
    exit 1
  fi
  bash -n "$script"
done

for pattern in \
  'Downloads/claude-scratch' \
  'bashlab-backend.pid' \
  'bashlab-frontend.pid' \
  'bashlab-box' \
  '127.0.0.1:3001' \
  'http://localhost:3000'; do
  if ! grep -q -- "$pattern" "$start_script"; then
    printf 'missing start-script contract: %s\n' "$pattern" >&2
    exit 1
  fi
done

for pattern in 'bashlab-backend.pid' 'bashlab-frontend.pid'; do
  if ! grep -q -- "$pattern" "$stop_script"; then
    printf 'missing stop-script contract: %s\n' "$pattern" >&2
    exit 1
  fi
done

printf 'dev script contract checks passed\n'
