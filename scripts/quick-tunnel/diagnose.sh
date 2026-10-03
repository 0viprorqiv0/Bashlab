#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
RUN_DIR="$ROOT_DIR/.run/quick-tunnel"

# shellcheck source=process-helpers.sh
source "$(dirname "$0")/process-helpers.sh"

http_code() {
  curl --silent --output /dev/null --write-out '%{http_code}' --max-time 3 "$1" 2>/dev/null || printf '000'
}

tunnel_pid="$(read_pid_file "$RUN_DIR/tunnel.pid" 2>/dev/null || true)"
if [[ -z "$tunnel_pid" ]] || ! pid_matches "$tunnel_pid" 'cloudflared tunnel --url'; then
  printf 'RESULT=QUICK_TUNNEL_LOST\n'
  exit 3
fi

if [[ ! -s "$RUN_DIR/tunnel-url.txt" ]]; then
  printf 'RESULT=NO_URL\n'
  exit 4
fi

tunnel_url="$(cat "$RUN_DIR/tunnel-url.txt")"
if [[ ! "$tunnel_url" =~ ^https://[[:alnum:]-]+\.trycloudflare\.com$ ]]; then
  printf 'RESULT=INVALID_URL\n'
  exit 5
fi

frontend_code="$(http_code http://127.0.0.1:3000/login)"
api_code="$(http_code http://127.0.0.1:3001/health)"
public_code="$(http_code "$tunnel_url/health")"
printf 'LOCAL_FRONTEND=%s\n' "$frontend_code"
printf 'LOCAL_API=%s\n' "$api_code"
printf 'PUBLIC_HEALTH=%s\n' "$public_code"

if [[ "$frontend_code" == 200 && "$api_code" == 200 && "$public_code" == 200 ]]; then
  printf 'RESULT=CONNECTOR_READY\n'
  exit 0
fi

printf 'RESULT=HEALTH_CHECK_FAILED\n'
exit 6
