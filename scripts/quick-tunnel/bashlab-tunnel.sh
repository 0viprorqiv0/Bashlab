#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
RUN_DIR="$ROOT_DIR/.run/quick-tunnel"

# shellcheck source=process-helpers.sh
source "$(dirname "$0")/process-helpers.sh"

usage() {
  printf 'Usage: %s {start|stop|status|url|logs|diagnose}\n' "$0" >&2
}

status_for() {
  local name="$1" file="$2" pattern="$3" pid=""
  pid="$(read_pid_file "$file" 2>/dev/null || true)"
  if [[ -n "$pid" ]] && pid_matches "$pid" "$pattern"; then
    printf '%s: running (%s)\n' "$name" "$pid"
  else
    printf '%s: stopped\n' "$name"
  fi
}

command="${1:-}"
case "$command" in
  start)
    exec "$ROOT_DIR/scripts/quick-tunnel/start-supervisor.sh"
    ;;
  stop)
    exec "$ROOT_DIR/scripts/quick-tunnel/stop-supervisor.sh"
    ;;
  status)
    status_for 'Frontend' "$RUN_DIR/frontend.pid" 'npm run start -H 127.0.0.1 -p 3000'
    status_for 'Backend' "$RUN_DIR/backend.pid" 'npm run start:api'
    status_for 'Caddy' "$RUN_DIR/caddy.pid" 'caddy run --config'
    status_for 'Tunnel' "$RUN_DIR/tunnel.pid" 'cloudflared tunnel --url'
    if [[ -s "$RUN_DIR/tunnel-url.txt" ]]; then
      printf 'URL: %s\n' "$(cat "$RUN_DIR/tunnel-url.txt")"
    else
      printf 'URL: unavailable\n'
    fi
    ;;
  url)
    tunnel_pid="$(read_pid_file "$RUN_DIR/tunnel.pid" 2>/dev/null || true)"
    if [[ -n "$tunnel_pid" ]] && pid_matches "$tunnel_pid" 'cloudflared tunnel --url' && [[ -s "$RUN_DIR/tunnel-url.txt" ]]; then
      cat "$RUN_DIR/tunnel-url.txt"
    else
      printf 'Quick Tunnel URL is unavailable.\n' >&2
      exit 1
    fi
    ;;
  logs)
    tail -n 100 "$RUN_DIR"/*.log 2>/dev/null || true
    ;;
  diagnose)
    exec "$ROOT_DIR/scripts/quick-tunnel/diagnose.sh"
    ;;
  *)
    usage
    exit 64
    ;;
esac
