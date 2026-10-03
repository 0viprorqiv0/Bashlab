#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
RUN_DIR="$ROOT_DIR/.run/quick-tunnel"
FRONTEND_PID_FILE="$RUN_DIR/frontend.pid"
BACKEND_PID_FILE="$RUN_DIR/backend.pid"
CADDY_PID_FILE="$RUN_DIR/caddy.pid"
TUNNEL_PID_FILE="$RUN_DIR/tunnel.pid"
TUNNEL_URL_FILE="$RUN_DIR/tunnel-url.txt"
FRONTEND_LOG="$RUN_DIR/frontend.log"
BACKEND_LOG="$RUN_DIR/backend.log"
CADDY_LOG="$RUN_DIR/caddy.log"
TUNNEL_LOG="$RUN_DIR/cloudflared.log"

# shellcheck source=process-helpers.sh
source "$(dirname "$0")/process-helpers.sh"

fail() {
  printf 'ERROR: %s\n' "$*" >&2
  exit 1
}

wait_for() {
  local description="$1" timeout="$2" check="$3" attempt=0
  while (( attempt < timeout )); do
    if eval "$check"; then return 0; fi
    attempt=$((attempt + 1))
    sleep 1
  done
  fail "$description was not ready after ${timeout}s; inspect $RUN_DIR"
}

start_process() {
  local pid_file="$1" pattern="$2" log_file="$3"
  shift 3
  local old_pid=""
  old_pid="$(read_pid_file "$pid_file" 2>/dev/null || true)"
  if [[ -n "$old_pid" ]] && pid_matches "$old_pid" "$pattern"; then
    return 0
  fi
  rm -f "$pid_file"
  nohup "$@" >> "$log_file" 2>&1 < /dev/null &
  atomic_write_file "$pid_file" "$!"
}

assert_port_available() {
  local port="$1" listener_pids=""
  if command -v lsof >/dev/null 2>&1; then
    listener_pids="$(lsof -t -iTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)"
    [[ -z "$listener_pids" ]] || fail "Port $port is already in use; stop the other service before starting Quick Tunnel"
    return 0
  fi
  if command -v ss >/dev/null 2>&1 && ss -ltn "sport = :$port" 2>/dev/null | tail -n +2 | grep -q .; then
    fail "Port $port is already in use; stop the other service before starting Quick Tunnel"
  fi
}

for dependency in npm caddy cloudflared curl docker; do
  command -v "$dependency" >/dev/null 2>&1 || fail "$dependency is required"
done
[[ -f "$ROOT_DIR/backend/.env" ]] || fail "backend/.env is required"
[[ -f "$ROOT_DIR/frontend/package.json" ]] || fail "frontend/package.json is required"
mkdir -p "$RUN_DIR"

runner_name="${RUNNER_CONTAINER:-bashlab-box}"
if docker inspect "$runner_name" >/dev/null 2>&1; then
  runner_running="$(docker inspect -f '{{.State.Running}}' "$runner_name")"
  [[ "$runner_running" == true ]] || docker start "$runner_name" >/dev/null
else
  "$ROOT_DIR/backend/scripts/start-runner.sh"
fi

existing_tunnel="$(read_pid_file "$TUNNEL_PID_FILE" 2>/dev/null || true)"
if [[ -n "$existing_tunnel" ]] && pid_matches "$existing_tunnel" 'cloudflared tunnel --url' && [[ -s "$TUNNEL_URL_FILE" ]]; then
  cat "$TUNNEL_URL_FILE"
  exit 0
fi

for local_port in 3000 3001 8080; do
  assert_port_available "$local_port"
done

if [[ ! -f "$ROOT_DIR/frontend/.next/BUILD_ID" ]]; then
  (
    cd "$ROOT_DIR/frontend"
    env NEXT_PUBLIC_API_URL= npm run build
  ) >> "$FRONTEND_LOG" 2>&1 || fail "frontend production build failed; inspect $FRONTEND_LOG"
fi

start_process "$FRONTEND_PID_FILE" 'next start -H 127.0.0.1' "$FRONTEND_LOG" \
  bash -c "cd '$ROOT_DIR/frontend' && exec env NEXT_PUBLIC_API_URL= npm run start -- -H 127.0.0.1 -p 3000"
wait_for 'frontend' 30 "curl --fail --silent --max-time 1 http://127.0.0.1:3000/login >/dev/null 2>&1"

start_process "$CADDY_PID_FILE" 'caddy run --config' "$CADDY_LOG" \
  caddy run --config "$ROOT_DIR/scripts/quick-tunnel/Caddyfile"

touch "$TUNNEL_LOG"
tunnel_offset="$(wc -c < "$TUNNEL_LOG")"
start_process "$TUNNEL_PID_FILE" 'cloudflared tunnel --url' "$TUNNEL_LOG" \
  cloudflared tunnel --url http://127.0.0.1:8080

wait_for 'Quick Tunnel URL' 30 "quick_tunnel_url_since '$TUNNEL_LOG' '$tunnel_offset' >/dev/null"
wait_for 'Cloudflare connector registration' 30 "cloudflared_registered_since '$TUNNEL_LOG' '$tunnel_offset'"
tunnel_url="$(quick_tunnel_url_since "$TUNNEL_LOG" "$tunnel_offset")"

start_process "$BACKEND_PID_FILE" 'src/server.js' "$BACKEND_LOG" \
  bash -c "cd '$ROOT_DIR/backend' && exec env HOST=127.0.0.1 NODE_ENV=production COOKIE_SECURE=true CORS_ORIGINS='http://localhost:3000,$tunnel_url' npm run start:api"
wait_for 'backend API' 30 "curl --fail --silent --max-time 1 http://127.0.0.1:3001/health >/dev/null 2>&1"
wait_for 'public Tunnel health' 30 "curl --fail --silent --max-time 2 '$tunnel_url/health' >/dev/null 2>&1"

atomic_write_file "$TUNNEL_URL_FILE" "$tunnel_url"
printf '%s\n' "$tunnel_url"
