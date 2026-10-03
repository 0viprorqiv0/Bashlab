#!/usr/bin/env bash
set -euo pipefail

# Regression harness for the public controller contract. It runs the real
# controller in a disposable project layout and replaces only external tools
# (npm, caddy, cloudflared, curl) with deterministic process doubles.

SOURCE_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
TEST_ROOT="$(mktemp -d)"

cleanup() {
  set +e
  if [[ -d "$TEST_ROOT" ]]; then
    "$TEST_ROOT/scripts/quick-tunnel/bashlab-tunnel.sh" stop >/dev/null 2>&1 || true
    rm -rf "$TEST_ROOT"
  fi
}
trap cleanup EXIT

fail() {
  printf 'FAIL: %s\n' "$*" >&2
  exit 1
}

assert_contains() {
  [[ "$1" == *"$2"* ]] || fail "$3 (missing: $2)"
}

assert_file() {
  [[ -s "$1" ]] || fail "expected non-empty file: $1"
}

[[ -x "$SOURCE_ROOT/scripts/quick-tunnel/bashlab-tunnel.sh" ]] || fail "quick tunnel CLI is missing"

mkdir -p "$TEST_ROOT/scripts" "$TEST_ROOT/backend" "$TEST_ROOT/frontend" "$TEST_ROOT/bin"
cp -R "$SOURCE_ROOT/scripts/quick-tunnel" "$TEST_ROOT/scripts/"
chmod +x "$TEST_ROOT/scripts/quick-tunnel"/*.sh "$TEST_ROOT/scripts/quick-tunnel/test"/*.sh
printf 'placeholder\n' > "$TEST_ROOT/backend/.env"
printf 'placeholder\n' > "$TEST_ROOT/frontend/package.json"
printf 'NEXT_PUBLIC_API_URL=http://localhost:3001\n' > "$TEST_ROOT/frontend/.env.local"
mkdir -p "$TEST_ROOT/frontend/.next"

cat > "$TEST_ROOT/bin/npm" <<'SH'
#!/usr/bin/env bash
set -euo pipefail
state_dir="${QUICK_TUNNEL_TEST_STATE:?}"
if [[ "$PWD" == */frontend ]]; then
  if [[ "${NEXT_PUBLIC_API_URL+set}" == set && -z "$NEXT_PUBLIC_API_URL" ]]; then
    printf 'relative\n' > "$state_dir/frontend-api-mode.txt"
  else
    printf 'configured-or-unset\n' > "$state_dir/frontend-api-mode.txt"
  fi
  if [[ "${2:-}" == "build" ]]; then
    mkdir -p .next
    printf 'fake-production-build\n' > .next/BUILD_ID
    exit 0
  fi
  printf '%s\n' "${CORS_ORIGINS:-}" > "$state_dir/frontend-cors.txt"
  exec -a 'next start -H 127.0.0.1' sleep 300
fi
printf '%s\n' "$CORS_ORIGINS" > "$state_dir/backend-cors.txt"
exec -a 'node --env-file=.env src/server.js' sleep 300
SH
chmod +x "$TEST_ROOT/bin/npm"

cat > "$TEST_ROOT/bin/caddy" <<'SH'
#!/usr/bin/env bash
set -euo pipefail
printf '%s\n' "$*" > "${QUICK_TUNNEL_TEST_STATE:?}/caddy-args.txt"
exec -a 'caddy run --config Caddyfile' sleep 300
SH
chmod +x "$TEST_ROOT/bin/caddy"

cat > "$TEST_ROOT/bin/cloudflared" <<'SH'
#!/usr/bin/env bash
set -euo pipefail
printf '%s\n' "$*" > "${QUICK_TUNNEL_TEST_STATE:?}/cloudflared-args.txt"
printf '%s\n' 'INF Your quick Tunnel has been created! Visit it at https://fresh-quick.trycloudflare.com'
printf '%s\n' 'INF Registered tunnel connection connIndex=0'
exec -a 'cloudflared tunnel --url http://127.0.0.1:8080' sleep 300
SH
chmod +x "$TEST_ROOT/bin/cloudflared"

cat > "$TEST_ROOT/bin/curl" <<'SH'
#!/usr/bin/env bash
if [[ "$*" == *'%{http_code}'* ]]; then
  printf '200'
fi
exit 0
SH
chmod +x "$TEST_ROOT/bin/curl"

cat > "$TEST_ROOT/bin/docker" <<'SH'
#!/usr/bin/env bash
printf '%s\n' "$*" >> "${QUICK_TUNNEL_TEST_STATE:?}/docker-args.txt"
if [[ "${1:-}" == inspect && "${2:-}" == -f ]]; then
  printf 'true\n'
fi
exit 0
SH
chmod +x "$TEST_ROOT/bin/docker"

cat > "$TEST_ROOT/bin/lsof" <<'SH'
#!/usr/bin/env bash
if [[ "${QUICK_TUNNEL_TEST_CONFLICT_PORT:-}" == 3000 && "$*" == *':3000'* ]]; then
  printf '424242\n'
fi
SH
chmod +x "$TEST_ROOT/bin/lsof"

mkdir -p "$TEST_ROOT/.run/quick-tunnel"
printf '%s\n' 'https://stale-quick.trycloudflare.com' > "$TEST_ROOT/.run/quick-tunnel/tunnel-url.txt"

export PATH="$TEST_ROOT/bin:$PATH"
export QUICK_TUNNEL_TEST_STATE="$TEST_ROOT/.run/quick-tunnel"

cd "$TEST_ROOT"
first_start="$(./scripts/quick-tunnel/bashlab-tunnel.sh start)"
assert_contains "$first_start" 'https://fresh-quick.trycloudflare.com' 'start prints fresh tunnel URL'
[[ "$first_start" != *'stale-quick'* ]] || fail 'start printed stale tunnel URL'
assert_file .run/quick-tunnel/tunnel-url.txt
assert_file frontend/.next/BUILD_ID
[[ "$(cat .run/quick-tunnel/tunnel-url.txt)" == 'https://fresh-quick.trycloudflare.com' ]] || fail 'runtime URL is not fresh'
assert_contains "$(cat .run/quick-tunnel/cloudflared-args.txt)" 'tunnel --url http://127.0.0.1:8080' 'cloudflared targets Caddy bridge'
assert_contains "$(cat .run/quick-tunnel/caddy-args.txt)" 'run --config' 'Caddy starts from controller config'
assert_contains "$(cat .run/quick-tunnel/docker-args.txt)" 'inspect -f {{.State.Running}} bashlab-box' 'controller verifies runner state'
assert_contains "$(cat .run/quick-tunnel/backend-cors.txt)" 'https://fresh-quick.trycloudflare.com' 'backend receives fresh URL in CORS origins'
[[ "$(cat .run/quick-tunnel/frontend-api-mode.txt)" == 'relative' ]] || fail 'frontend was not forced to use relative API URLs'

first_tunnel_pid="$(cat .run/quick-tunnel/tunnel.pid)"
second_start="$(./scripts/quick-tunnel/bashlab-tunnel.sh start)"
assert_contains "$second_start" 'https://fresh-quick.trycloudflare.com' 'idempotent start returns current URL'
[[ "$(cat .run/quick-tunnel/tunnel.pid)" == "$first_tunnel_pid" ]] || fail 'second start created another tunnel'

status="$(./scripts/quick-tunnel/bashlab-tunnel.sh status)"
assert_contains "$status" 'Tunnel: running' 'status reports managed tunnel'
assert_contains "$status" 'URL: https://fresh-quick.trycloudflare.com' 'status reports current URL'

diagnose="$(./scripts/quick-tunnel/bashlab-tunnel.sh diagnose)"
assert_contains "$diagnose" 'LOCAL_FRONTEND=200' 'diagnose reports local frontend'
assert_contains "$diagnose" 'LOCAL_API=200' 'diagnose reports local API'
assert_contains "$diagnose" 'PUBLIC_HEALTH=200' 'diagnose reports public health'
assert_contains "$diagnose" 'RESULT=CONNECTOR_READY' 'diagnose reports ready connector'

kill "$first_tunnel_pid"
set +e
lost_diagnose="$(./scripts/quick-tunnel/bashlab-tunnel.sh diagnose 2>&1)"
lost_status=$?
set -e
[[ "$lost_status" -ne 0 ]] || fail 'diagnose accepted a dead tunnel'
assert_contains "$lost_diagnose" 'RESULT=QUICK_TUNNEL_LOST' 'diagnose reports dead tunnel'
[[ "$(cat .run/quick-tunnel/tunnel.pid)" == "$first_tunnel_pid" ]] || fail 'diagnose recreated a dead tunnel'

./scripts/quick-tunnel/bashlab-tunnel.sh stop
[[ ! -e .run/quick-tunnel/tunnel.pid ]] || fail 'stop retained tunnel pid file'
[[ ! -e .run/quick-tunnel/tunnel-url.txt ]] || fail 'stop retained public URL'

set +e
conflict_output="$(QUICK_TUNNEL_TEST_CONFLICT_PORT=3000 ./scripts/quick-tunnel/bashlab-tunnel.sh start 2>&1)"
conflict_status=$?
set -e
[[ "$conflict_status" -ne 0 ]] || fail 'start accepted an unmanaged occupied port'
assert_contains "$conflict_output" 'Port 3000 is already in use' 'start reports occupied port'
[[ ! -e .run/quick-tunnel/tunnel.pid ]] || fail 'occupied-port start created a tunnel'

printf 'PASS: quick tunnel lifecycle\n'
