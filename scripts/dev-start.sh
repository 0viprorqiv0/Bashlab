#!/usr/bin/env bash
set -euo pipefail

repo_root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
scratch_dir=${CLAUDE_SCRATCH_DIR:-${HOME}/Downloads/claude-scratch}
state_dir="$scratch_dir/bashlab"
backend_pid_file="$state_dir/bashlab-backend.pid"
frontend_pid_file="$state_dir/bashlab-frontend.pid"
backend_log="$state_dir/backend.log"
frontend_log="$state_dir/frontend.log"

mkdir -p -- "$state_dir"

# Ensure .env files exist so npm run start:api does not crash
if [[ ! -f "$repo_root/backend/.env" && -f "$repo_root/backend/.env.example" ]]; then
  cp "$repo_root/backend/.env.example" "$repo_root/backend/.env"
fi
if [[ ! -f "$repo_root/frontend/.env.local" && -f "$repo_root/frontend/.env.local.example" ]]; then
  cp "$repo_root/frontend/.env.local.example" "$repo_root/frontend/.env.local"
fi

printf '\033[1;33m[!] LƯU Ý KHI CHẠY LOCALHOST:\033[0m\n'
printf '    Bạn sẽ không chạy được full quyền trên máy nếu chưa cài Grafana và thiếu Supabase.\n'
printf '    Để trải nghiệm tốt nhất (full quyền & sandbox), liên hệ \033[1;36mhieuhlz9000@gmail.com\033[0m để mở Cloudflare Tunnel!\n\n'

port_is_open() {
  local port=$1
  ss -ltn "sport = :$port" 2>/dev/null | grep -q ":$port"
}

wait_for_url() {
  local url=$1
  local label=$2
  local attempts=30
  until curl --fail --silent --show-error "$url" >/dev/null 2>&1; do
    attempts=$((attempts - 1))
    if (( attempts == 0 )); then
      printf '%s did not become ready. Check %s.\n' "$label" "$3" >&2
      return 1
    fi
    sleep 1
  done
}

runner_container=${RUNNER_CONTAINER:-bashlab-box}
if docker inspect "$runner_container" >/dev/null 2>&1; then
  if ! docker ps --format '{{.Names}}' | grep -qx "$runner_container"; then
    docker start "$runner_container" >/dev/null
  fi
else
  bash "$repo_root/backend/scripts/start-runner.sh"
fi

if port_is_open 3001; then
  wait_for_url http://127.0.0.1:3001/health backend "$backend_log"
  printf 'Backend already running at http://127.0.0.1:3001\n'
else
  (
    cd "$repo_root/backend"
    ( ( setsid nohup npm run start:api < /dev/null >"$backend_log" 2>&1 & echo $! >"$backend_pid_file" ) & )
  )
  sleep 0.2
  backend_pid=$(<"$backend_pid_file")
  wait_for_url http://127.0.0.1:3001/health backend "$backend_log"
  printf 'Backend started at http://127.0.0.1:3001 (PID %s)\n' "$backend_pid"
fi

if port_is_open 3000; then
  wait_for_url http://127.0.0.1:3000/login frontend "$frontend_log"
  printf 'Frontend already running at http://localhost:3000\n'
else
  (
    cd "$repo_root/frontend"
    ( ( setsid nohup npm run dev < /dev/null >"$frontend_log" 2>&1 & echo $! >"$frontend_pid_file" ) & )
  )
  sleep 0.2
  frontend_pid=$(<"$frontend_pid_file")
  wait_for_url http://127.0.0.1:3000/login frontend "$frontend_log"
  printf 'Frontend started at http://localhost:3000 (PID %s)\n' "$frontend_pid"
fi

printf 'Logs: %s and %s\n' "$backend_log" "$frontend_log"
printf 'Stop owned processes with: %s/scripts/dev-stop.sh\n' "$repo_root"
