#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
RUN_DIR="$ROOT_DIR/.run/quick-tunnel"

# shellcheck source=process-helpers.sh
source "$(dirname "$0")/process-helpers.sh"

stop_owned_pid_file "$RUN_DIR/tunnel.pid" 'cloudflared tunnel --url' 'Quick Tunnel'
stop_owned_pid_file "$RUN_DIR/caddy.pid" 'caddy run --config' 'Caddy bridge'
stop_owned_pid_file "$RUN_DIR/backend.pid" 'src/server.js' 'BashLab backend'
stop_owned_pid_file "$RUN_DIR/frontend.pid" 'next start -H 127.0.0.1' 'BashLab frontend'
rm -f "$RUN_DIR/tunnel-url.txt"
printf 'Quick Tunnel controller stopped.\n'
