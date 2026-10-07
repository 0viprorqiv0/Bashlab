#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
RUN_DIR="$ROOT_DIR/.run/quick-tunnel"

# shellcheck source=process-helpers.sh
source "$(dirname "$0")/process-helpers.sh"

keep_tunnel=false
for arg in "$@"; do
  if [[ "$arg" == "--keep-tunnel" ]]; then
    keep_tunnel=true
  fi
done

# Always stop localhost web application services
stop_owned_pid_file "$RUN_DIR/backend.pid" 'start:api' 'BashLab backend'
stop_owned_pid_file "$RUN_DIR/frontend.pid" 'npm run start' 'BashLab frontend'

if [[ "$keep_tunnel" == true ]]; then
  tunnel_url="$(cat "$RUN_DIR/tunnel-url.txt" 2>/dev/null || echo 'none')"
  printf 'Localhost services stopped. Tunnel kept persistent at: %s\n' "$tunnel_url"
else
  stop_owned_pid_file "$RUN_DIR/caddy.pid" 'caddy run --config' 'Caddy bridge'
  stop_owned_pid_file "$RUN_DIR/tunnel.pid" 'cloudflared tunnel --url' 'Quick Tunnel'
  docker stop bashlab-prometheus bashlab-grafana >/dev/null 2>&1 || true
  rm -f "$RUN_DIR/tunnel-url.txt"
  printf 'Quick Tunnel controller stopped.\n'
fi
