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
  setsid nohup "$@" >> "$log_file" 2>&1 < /dev/null &
  atomic_write_file "$pid_file" "$!"
}

assert_port_available() {
  local port="$1"
  if ! is_port_available "$port"; then
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

if docker inspect bashlab-prometheus >/dev/null 2>&1; then
  prom_running="$(docker inspect -f '{{.State.Running}}' bashlab-prometheus)"
  [[ "$prom_running" == true ]] || docker start bashlab-prometheus >/dev/null
  if docker inspect bashlab-grafana >/dev/null 2>&1; then
    grafana_running="$(docker inspect -f '{{.State.Running}}' bashlab-grafana)"
    [[ "$grafana_running" == true ]] || docker start bashlab-grafana >/dev/null
  fi
fi

# Stop any running frontend/backend to ensure fresh restart of localhost
stop_owned_pid_file "$FRONTEND_PID_FILE" 'npm run start' 'BashLab frontend'
stop_owned_pid_file "$BACKEND_PID_FILE" 'start:api' 'BashLab backend'

# Ensure localhost ports 3000 and 3001 are available
for local_port in 3000 3001; do
  assert_port_available "$local_port"
done

# Determine Caddy bridge port: default to 8080, or auto-fallback to 8085 / 18080 if 8080 is in use
caddy_port="${CADDY_PORT:-}"
if [[ -z "$caddy_port" ]]; then
  if is_port_available 8080; then
    caddy_port=8080
  elif is_port_available 8085; then
    caddy_port=8085
    printf 'Notice: Port 8080 is in use. Routing Caddy bridge through port %s.\n' "$caddy_port" >&2
  else
    caddy_port=18080
    printf 'Notice: Port 8080 is in use. Routing Caddy bridge through port %s.\n' "$caddy_port" >&2
  fi
fi
export CADDY_PORT="$caddy_port"

# Ensure Caddy is running on port $caddy_port and responding locally
existing_caddy="$(read_pid_file "$CADDY_PID_FILE" 2>/dev/null || true)"
if [[ -z "$existing_caddy" ]] || ! pid_matches "$existing_caddy" 'caddy run --config'; then
  assert_port_available "$caddy_port"
  start_process "$CADDY_PID_FILE" 'caddy run --config' "$CADDY_LOG" \
    env CADDY_PORT="$caddy_port" caddy run --config "$ROOT_DIR/scripts/quick-tunnel/Caddyfile"
fi
wait_for 'Caddy local listener' 10 "curl --fail --silent --max-time 1 http://127.0.0.1:$caddy_port/quick-tunnel-ping >/dev/null 2>&1"

# Validate Quick Tunnel liveness before binding or restarting
reusing_tunnel=false
tunnel_url=""

existing_tunnel="$(read_pid_file "$TUNNEL_PID_FILE" 2>/dev/null || true)"
candidate_url="$(cat "$TUNNEL_URL_FILE" 2>/dev/null || true)"
if [[ -z "$candidate_url" && -n "$existing_tunnel" ]] && pid_matches "$existing_tunnel" 'cloudflared tunnel --url'; then
  candidate_url="$(grep -oE 'https://[[:alnum:]-]+\.trycloudflare\.com' "$TUNNEL_LOG" 2>/dev/null | tail -n 1 || true)"
fi

if [[ -n "$existing_tunnel" ]] && pid_matches "$existing_tunnel" 'cloudflared tunnel --url' && [[ -n "$candidate_url" ]]; then
  if verify_tunnel_liveness "$candidate_url" 3; then
    reusing_tunnel=true
    tunnel_url="$candidate_url"
    atomic_write_file "$TUNNEL_URL_FILE" "$tunnel_url"
  else
    # Try latest URL from log if candidate was stale or out-of-sync
    latest_log_url="$(grep -oE 'https://[[:alnum:]-]+\.trycloudflare\.com' "$TUNNEL_LOG" 2>/dev/null | tail -n 1 || true)"
    if [[ -n "$latest_log_url" && "$latest_log_url" != "$candidate_url" ]] && verify_tunnel_liveness "$latest_log_url" 3; then
      reusing_tunnel=true
      tunnel_url="$latest_log_url"
      atomic_write_file "$TUNNEL_URL_FILE" "$tunnel_url"
    else
      stop_owned_pid_file "$TUNNEL_PID_FILE" 'cloudflared tunnel --url' 'stale Quick Tunnel'
      rm -f "$TUNNEL_URL_FILE"
    fi
  fi
else
  if [[ -n "$existing_tunnel" ]]; then
    stop_owned_pid_file "$TUNNEL_PID_FILE" 'cloudflared tunnel --url' 'stale Quick Tunnel'
  fi
  rm -f "$TUNNEL_URL_FILE"
fi

# Tunnel management: reuse if verified alive, start fresh if dead
if [[ "$reusing_tunnel" == false ]]; then
  touch "$TUNNEL_LOG"
  tunnel_offset="$(wc -c < "$TUNNEL_LOG")"
  start_process "$TUNNEL_PID_FILE" 'cloudflared tunnel --url' "$TUNNEL_LOG" \
    cloudflared tunnel --url "http://127.0.0.1:$caddy_port"

  wait_for 'Quick Tunnel URL' 35 "quick_tunnel_url_since '$TUNNEL_LOG' '$tunnel_offset' >/dev/null"
  wait_for 'Cloudflare connector registration' 35 "cloudflared_registered_since '$TUNNEL_LOG' '$tunnel_offset'"
  tunnel_url="$(quick_tunnel_url_since "$TUNNEL_LOG" "$tunnel_offset")"

  if [[ -z "${QUICK_TUNNEL_TEST_STATE:-}" ]]; then
    # Allow Cloudflare authoritative nameservers a brief window before initial query
    # to prevent DNS resolvers from negative-caching NXDOMAIN (RFC 2308 SOA 60s TTL)
    sleep 3
    # Actively verify edge connectivity and DNS propagation before starting backend
    wait_for 'Quick Tunnel edge connectivity' 60 "verify_tunnel_liveness '$tunnel_url' 2"
  fi
  atomic_write_file "$TUNNEL_URL_FILE" "$tunnel_url"
fi

dist_id_file="$ROOT_DIR/frontend/.next-wsl/BUILD_ID"
[[ -f "$ROOT_DIR/frontend/.next/BUILD_ID" ]] && dist_id_file="$ROOT_DIR/frontend/.next/BUILD_ID"

if [[ ! -f "$dist_id_file" ]]; then
  (
    cd "$ROOT_DIR/frontend"
    env NODE_ENV=production npm run build
  ) >> "$FRONTEND_LOG" 2>&1 || fail "frontend production build failed; inspect $FRONTEND_LOG"
fi

start_process "$FRONTEND_PID_FILE" 'npm run start' "$FRONTEND_LOG" \
  bash -c "cd '$ROOT_DIR/frontend' && exec env NEXT_PUBLIC_API_URL= NODE_ENV=production npm run start -- -H 127.0.0.1 -p 3000"
wait_for 'frontend' 30 "curl --fail --silent --max-time 1 http://127.0.0.1:3000/login >/dev/null 2>&1"

start_process "$BACKEND_PID_FILE" 'start:api' "$BACKEND_LOG" \
  bash -c "cd '$ROOT_DIR/backend' && exec env HOST=0.0.0.0 NODE_ENV=production COOKIE_SECURE=true CORS_ORIGINS='http://localhost:3000,http://127.0.0.1:3000,$tunnel_url' npm run start:api"
wait_for 'backend API' 30 "curl --fail --silent --max-time 1 http://127.0.0.1:3001/health >/dev/null 2>&1"

# Warm up / Preload core routes in production to prime memory cache and eliminate initial lag
if [[ -z "${QUICK_TUNNEL_TEST_STATE:-}" ]]; then
  warmup_routes=(
    "http://127.0.0.1:$caddy_port/"
    "http://127.0.0.1:$caddy_port/login"
    "http://127.0.0.1:$caddy_port/courses"
    "http://127.0.0.1:$caddy_port/subscription"
    "http://127.0.0.1:$caddy_port/blog"
    "http://127.0.0.1:$caddy_port/courses/shell-101/labs/1"
    "http://127.0.0.1:$caddy_port/health"
    "$tunnel_url/health"
    "$tunnel_url/login"
  )
  for route in "${warmup_routes[@]}"; do
    curl --silent --max-time 4 "$route" >/dev/null 2>&1 || true
  done
fi

atomic_write_file "$TUNNEL_URL_FILE" "$tunnel_url"
printf '%s\n' "$tunnel_url"
