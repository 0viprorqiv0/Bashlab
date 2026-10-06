#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
RUN_DIR="$ROOT_DIR/.run/quick-tunnel"

# shellcheck source=process-helpers.sh
source "$(dirname "$0")/process-helpers.sh"

usage() {
  printf 'Usage: %s {start [-d]|stop [--all]|restart [-d]|status|url|logs [-f|<service>]|diagnose}\n' "$0" >&2
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
    shift || true
    detached=false
    for arg in "$@"; do
      if [[ "$arg" == "-d" || "$arg" == "--detach" ]]; then
        detached=true
      fi
    done
    "$ROOT_DIR/scripts/quick-tunnel/start-supervisor.sh"
    if [[ "$detached" == false && -t 1 && -z "${QUICK_TUNNEL_TEST_STATE:-}" ]]; then
      tunnel_url="$(cat "$RUN_DIR/tunnel-url.txt" 2>/dev/null || echo 'unavailable')"
      printf '\n\033[1;32m✓ BashLab Server & Quick Tunnel are running!\033[0m\n'
      printf '  \033[1mPublic URL:\033[0m  %s\n' "$tunnel_url"
      printf '  \033[1mLocalhost:\033[0m   http://127.0.0.1:3000\n'
      printf '  \033[1mAPI Health:\033[0m  http://127.0.0.1:3001/health\n\n'
      printf '\033[36m--> Streaming live logs below (Press Ctrl+C to detach anytime without stopping server):\033[0m\n'
      printf '%s\n\n' "======================================================================================"
      exec tail -f "$RUN_DIR"/*.log
    fi
    ;;
  stop)
    shift || true
    exec "$ROOT_DIR/scripts/quick-tunnel/stop-supervisor.sh" "$@"
    ;;
  restart)
    shift || true
    detached=false
    for arg in "$@"; do
      if [[ "$arg" == "-d" || "$arg" == "--detach" ]]; then
        detached=true
      fi
    done
    "$ROOT_DIR/scripts/quick-tunnel/stop-supervisor.sh" --keep-tunnel
    "$ROOT_DIR/scripts/quick-tunnel/start-supervisor.sh"
    if [[ "$detached" == false && -t 1 && -z "${QUICK_TUNNEL_TEST_STATE:-}" ]]; then
      tunnel_url="$(cat "$RUN_DIR/tunnel-url.txt" 2>/dev/null || echo 'unavailable')"
      printf '\n\033[1;32m✓ BashLab restarted successfully!\033[0m\n'
      printf '  \033[1mPublic URL:\033[0m  %s\n\n' "$tunnel_url"
      printf '\033[36m--> Streaming live logs below (Press Ctrl+C to detach anytime without stopping server):\033[0m\n'
      printf '%s\n\n' "======================================================================================"
      exec tail -f "$RUN_DIR"/*.log
    fi
    ;;
  status)
    status_for 'Frontend' "$RUN_DIR/frontend.pid" 'npm run start'
    status_for 'Backend' "$RUN_DIR/backend.pid" 'start:api'
    status_for 'Caddy' "$RUN_DIR/caddy.pid" 'caddy run --config'
    status_for 'Tunnel' "$RUN_DIR/tunnel.pid" 'cloudflared tunnel --url'
    if [[ -s "$RUN_DIR/tunnel-url.txt" ]]; then
      candidate="$(cat "$RUN_DIR/tunnel-url.txt")"
      if verify_tunnel_liveness "$candidate" 2; then
        printf 'URL: %s (healthy)\n' "$candidate"
      else
        printf 'URL: %s (unreachable/degraded)\n' "$candidate"
      fi
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
    shift || true
    target="${1:-}"
    if [[ "$target" == "-f" ]]; then
      exec tail -f "$RUN_DIR"/*.log
    elif [[ -n "$target" && -f "$RUN_DIR/${target}.log" ]]; then
      shift || true
      exec tail -f "$RUN_DIR/${target}.log" "$@"
    elif [[ -n "$target" && -f "$RUN_DIR/${target}" ]]; then
      exec tail -f "$RUN_DIR/${target}"
    else
      tail -n 100 "$RUN_DIR"/*.log 2>/dev/null || true
    fi
    ;;
  diagnose)
    exec "$ROOT_DIR/scripts/quick-tunnel/diagnose.sh"
    ;;
  *)
    usage
    exit 64
    ;;
esac
