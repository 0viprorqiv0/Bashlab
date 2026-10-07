#!/usr/bin/env bash
# ==============================================================================
# BashLab — Unified Full Stack Server Orchestrator
# Quản lý khởi động, dừng, kiểm tra trạng thái và xem log toàn bộ dịch vụ BashLab
# ==============================================================================
set -euo pipefail

# Màu sắc hiển thị
readonly C_RESET='\033[0m'
readonly C_BOLD='\033[1m'
readonly C_RED='\033[31m'
readonly C_GREEN='\033[32m'
readonly C_YELLOW='\033[33m'
readonly C_BLUE='\033[34m'
readonly C_MAGENTA='\033[35m'
readonly C_CYAN='\033[36m'
readonly C_GRAY='\033[90m'

# Thư mục gốc & đường dẫn trạng thái
REPO_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
STATE_DIR="${REPO_ROOT}/.run"
LOG_DIR="${STATE_DIR}/logs"
PID_DIR="${STATE_DIR}/pids"

# Đồng bộ tương thích với CLAUDE_SCRATCH_DIR nếu được chỉ định
SCRATCH_DIR="${CLAUDE_SCRATCH_DIR:-${HOME}/Downloads/claude-scratch}"
LEGACY_STATE_DIR="${SCRATCH_DIR}/bashlab"

mkdir -p -- "${LOG_DIR}" "${PID_DIR}" "${LEGACY_STATE_DIR}"

BACKEND_PID_FILE="${PID_DIR}/backend.pid"
FRONTEND_PID_FILE="${PID_DIR}/frontend.pid"
BACKEND_LOG="${LOG_DIR}/backend.log"
FRONTEND_LOG="${LOG_DIR}/frontend.log"

RUNNER_CONTAINER="${RUNNER_CONTAINER:-bashlab-box}"
MONITORING_COMPOSE="${REPO_ROOT}/monitoring/docker-compose.yml"

print_banner() {
  printf "${C_CYAN}${C_BOLD}"
  cat <<'EOF'
 ____            _     _           _     
| __ )  __ _ ___| |__ | |    __ _ | |__  
|  _ \ / _` / __| '_ \| |   / _` || '_ \ 
| |_) | (_| \__ \ | | | |__| (_| || |_) |
|____/ \__,_|___/_| |_|_____\__,_||_.__/ 
EOF
  printf "${C_RESET}"
  printf "${C_GRAY}======================================================${C_RESET}\n"
  printf "${C_BOLD}🚀 BashLab Full Stack Server Orchestrator${C_RESET}\n"
  printf "${C_GRAY}======================================================${C_RESET}\n\n"
}

log_info() {
  printf "${C_BLUE}ℹ %b${C_RESET}\n" "$1"
}

log_ok() {
  printf "${C_GREEN}✔ %b${C_RESET}\n" "$1"
}

log_warn() {
  printf "${C_YELLOW}⚠ %b${C_RESET}\n" "$1"
}

log_err() {
  printf "${C_RED}✖ %b${C_RESET}\n" "$1" >&2
}

port_is_open() {
  local port=$1
  if command -v ss >/dev/null 2>&1; then
    local out
    out=$(ss -ltn "sport = :$port" 2>/dev/null || true)
    [[ "$out" =~ :$port ]] && return 0
    return 1
  elif command -v lsof >/dev/null 2>&1; then
    lsof -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1 && return 0
    return 1
  fi
  return 1
}

get_port_pid() {
  local port=$1
  local pid=""
  if command -v lsof >/dev/null 2>&1; then
    pid=$(lsof -ti :"$port" 2>/dev/null || true)
    pid=$(head -n 1 <<< "$pid")
  fi
  if [[ -z "$pid" ]] && command -v ss >/dev/null 2>&1; then
    pid=$( (ss -ltnp "sport = :$port" 2>/dev/null || true) | (grep -o 'pid=[0-9]*' || true) | cut -d'=' -f2 | head -n 1 || true )
  fi
  echo "$pid"
}

wait_for_url() {
  local url=$1
  local label=$2
  local log_file=$3
  local timeout=${4:-30}
  local attempts=$timeout

  printf "  Đang chờ %s khởi động (%s)..." "$label" "$url"
  until curl --fail --silent --show-error "$url" >/dev/null 2>&1; do
    attempts=$((attempts - 1))
    if (( attempts <= 0 )); then
      printf " ${C_RED}TIMEOUT!${C_RESET}\n"
      log_err "${label} không sẵn sàng sau ${timeout}s. Xem log tại: ${log_file}"
      if [[ -f "$log_file" ]]; then
        printf "${C_GRAY}--- 10 dòng log cuối của %s ---${C_RESET}\n" "$label"
        tail -n 10 "$log_file" >&2 || true
        printf "${C_GRAY}----------------------------------------${C_RESET}\n"
      fi
      return 1
    fi
    printf "."
    sleep 1
  done
  printf " ${C_GREEN}SẴN SÀNG!${C_RESET}\n"
}

preflight_checks() {
  log_info "Thực hiện kiểm tra điều kiện tiên quyết (Preflight Checks)..."

  # Kiểm tra Docker
  if ! command -v docker >/dev/null 2>&1; then
    log_err "Docker chưa được cài đặt hoặc không nằm trong PATH!"
    exit 1
  fi

  if ! docker info >/dev/null 2>&1; then
    log_err "Docker daemon chưa chạy! Vui lòng khởi động Docker (sudo systemctl start docker)."
    exit 1
  fi

  # Kiểm tra Node.js
  if ! command -v node >/dev/null 2>&1; then
    log_err "Node.js chưa được cài đặt!"
    exit 1
  fi
  local node_major
  node_major=$(node -v | sed 's/v//' | cut -d'.' -f1)
  if (( node_major < 20 )); then
    log_warn "Phiên bản Node.js hiện tại là $(node -v). Khuyến nghị >= v20 (khuyên dùng Node 22+)."
  fi

  # Kiểm tra thư mục workspace
  local ws_dir="/var/tmp/bashlab/workspaces"
  if [[ ! -d "$ws_dir" ]]; then
    log_info "Tạo thư mục workspace cho sandbox: ${ws_dir}"
    mkdir -p "$ws_dir" 2>/dev/null || {
      log_warn "Không thể tạo ${ws_dir} bằng tài khoản hiện tại, kiểm tra lại quyền."
    }
  fi

  # Kiểm tra .env
  if [[ ! -f "${REPO_ROOT}/backend/.env" ]]; then
    if [[ -f "${REPO_ROOT}/backend/.env.example" ]]; then
      log_warn "backend/.env chưa tồn tại! Đang tự động sao chép từ backend/.env.example..."
      cp "${REPO_ROOT}/backend/.env.example" "${REPO_ROOT}/backend/.env"
    else
      touch "${REPO_ROOT}/backend/.env"
    fi
  fi
  if [[ ! -f "${REPO_ROOT}/frontend/.env.local" ]]; then
    if [[ -f "${REPO_ROOT}/frontend/.env.local.example" ]]; then
      log_warn "frontend/.env.local chưa tồn tại! Đang tự động sao chép từ frontend/.env.local.example..."
      cp "${REPO_ROOT}/frontend/.env.local.example" "${REPO_ROOT}/frontend/.env.local"
    fi
  fi

  # Hiển thị cảnh báo giới hạn trên môi trường Localhost
  printf "\n${C_YELLOW}${C_BOLD}"
  cat <<'EOF'
  ┌─────────────────────────────────────────────────────────────────────────────┐
  │ ⚠ LƯU Ý QUAN TRỌNG KHI CHẠY LOCALHOST:                                      │
  │ • Hiện tại bạn sẽ không chạy được FULL QUYỀN trên máy cá nhân khi:          │
  │   - Chưa cài đặt/khởi động Grafana (Port 3002)                              │
  │   - Chưa có cấu hình cơ sở dữ liệu Supabase (PostgreSQL RLS, Auth, Keys)    │
  │ • Để có trải nghiệm tốt nhất với đầy đủ quyền Administrator và bài lab thật:│
  │   👉 Vui lòng liên hệ: hieuhlz9000@gmail.com để mở server Cloudflare Tunnel!│
  └─────────────────────────────────────────────────────────────────────────────┘
EOF
  printf "${C_RESET}\n"

  log_ok "Preflight checks hoàn tất!"
}

start_runner() {
  log_info "1. Khởi động Sandbox Runner Container (${RUNNER_CONTAINER})..."
  if docker inspect "$RUNNER_CONTAINER" >/dev/null 2>&1; then
    if ( docker ps --format '{{.Names}}' 2>/dev/null || true ) | grep -qx "$RUNNER_CONTAINER"; then
      log_ok "Runner container '${RUNNER_CONTAINER}' đang chạy."
    else
      docker start "$RUNNER_CONTAINER" >/dev/null
      log_ok "Đã start runner container '${RUNNER_CONTAINER}'."
    fi
  else
    log_info "Container '${RUNNER_CONTAINER}' chưa tồn tại. Đang tạo mới qua start-runner.sh..."
    bash "${REPO_ROOT}/backend/scripts/start-runner.sh"
    log_ok "Container '${RUNNER_CONTAINER}' đã được khởi tạo thành công."
  fi

  # Kiểm tra tính khả dụng của bubblewrap trong runner
  if docker exec "$RUNNER_CONTAINER" bwrap --version >/dev/null 2>&1; then
    local bwrap_ver
    bwrap_ver=$(docker exec "$RUNNER_CONTAINER" bwrap --version 2>&1 || true)
    log_ok "Bubblewrap sẵn sàng trong runner: ${bwrap_ver}"
  else
    log_warn "Không thể thực thi bwrap trong container ${RUNNER_CONTAINER}."
  fi
}

start_monitoring() {
  log_info "2. Khởi động Stack Giám sát (Prometheus & Grafana)..."
  if [[ ! -f "$MONITORING_COMPOSE" ]]; then
    log_warn "Không tìm thấy file ${MONITORING_COMPOSE}. Bỏ qua monitoring."
    return 0
  fi

  local compose_started=false
  if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
    if docker compose -f "$MONITORING_COMPOSE" up -d 2>/dev/null; then
      compose_started=true
    fi
  elif command -v docker-compose >/dev/null 2>&1; then
    if docker-compose -f "$MONITORING_COMPOSE" up -d 2>/dev/null; then
      compose_started=true
    fi
  fi

  if [[ "$compose_started" == "true" ]]; then
    # Chờ Prometheus sẵn sàng (không bắt buộc)
    wait_for_url "http://127.0.0.1:9090/-/ready" "Prometheus (Port 9090)" "/dev/null" 10 || log_warn "Prometheus chưa phản hồi (có thể tiếp tục mà không có Grafana)."
    log_ok "Stack Monitoring đang chạy (Prometheus: 9090, Grafana: 3002)."
  else
    log_warn "Không thể khởi động Prometheus/Grafana (Docker Compose không sẵn sàng hoặc thiếu quyền)."
    log_info "Hệ thống vẫn tiếp tục khởi động Web App & API bình thường."
  fi
}

start_backend() {
  log_info "3. Khởi động Backend API Service (Port 3001)..."
  if port_is_open 3001; then
    if curl --fail --silent "http://127.0.0.1:3001/health" >/dev/null 2>&1; then
      local exist_pid
      exist_pid=$(get_port_pid 3001)
      log_ok "Backend đã đang chạy tại http://127.0.0.1:3001 (PID ${exist_pid:-unknown})."
      return 0
    else
      log_warn "Cổng 3001 đang bị chiếm bởi tiến trình khác nhưng không trả lời /health!"
    fi
  fi

  (
    cd "${REPO_ROOT}/backend"
    ( ( setsid nohup npm run start:api < /dev/null >>"${BACKEND_LOG}" 2>&1 & echo $! >"${BACKEND_PID_FILE}" ) & )
  )
  sleep 0.5
  if [[ -f "${BACKEND_PID_FILE}" ]]; then
    local b_pid
    b_pid=$(<"${BACKEND_PID_FILE}")
    cp -f "${BACKEND_PID_FILE}" "${LEGACY_STATE_DIR}/bashlab-backend.pid" 2>/dev/null || true
    wait_for_url "http://127.0.0.1:3001/health" "Backend API" "${BACKEND_LOG}" 25
    log_ok "Backend đã khởi động tại http://127.0.0.1:3001 (PID ${b_pid})."
  else
    log_err "Không thể tạo file PID cho Backend."
    return 1
  fi
}

start_frontend() {
  log_info "4. Khởi động Frontend Web App (Port 3000)..."
  if port_is_open 3000; then
    if curl --fail --silent "http://localhost:3000" >/dev/null 2>&1 || curl --fail --silent "http://localhost:3000/login" >/dev/null 2>&1; then
      local exist_pid
      exist_pid=$(get_port_pid 3000)
      log_ok "Frontend đã đang chạy tại http://localhost:3000 (PID ${exist_pid:-unknown})."
      return 0
    else
      log_warn "Cổng 3000 đang được mở nhưng Next.js chưa sẵn sàng."
    fi
  fi

  (
    cd "${REPO_ROOT}/frontend"
    ( ( setsid nohup npm run dev < /dev/null >>"${FRONTEND_LOG}" 2>&1 & echo $! >"${FRONTEND_PID_FILE}" ) & )
  )
  sleep 0.5
  if [[ -f "${FRONTEND_PID_FILE}" ]]; then
    local f_pid
    f_pid=$(<"${FRONTEND_PID_FILE}")
    cp -f "${FRONTEND_PID_FILE}" "${LEGACY_STATE_DIR}/bashlab-frontend.pid" 2>/dev/null || true
    wait_for_url "http://localhost:3000/login" "Frontend Next.js" "${FRONTEND_LOG}" 45
    log_ok "Frontend đã khởi động tại http://localhost:3000 (PID ${f_pid})."
  else
    log_err "Không thể tạo file PID cho Frontend."
    return 1
  fi
}

stop_process_tree() {
  local pid=$1
  local child
  while read -r child; do
    [[ -n "$child" ]] && stop_process_tree "$child"
  done < <(pgrep -P "$pid" 2>/dev/null || true)
  kill -TERM "$pid" 2>/dev/null || true
}

stop_pid_file() {
  local pid_file=$1
  local label=$2
  local legacy_file=$3

  local pid=""
  if [[ -s "$pid_file" ]]; then
    pid=$(<"$pid_file")
  elif [[ -s "$legacy_file" ]]; then
    pid=$(<"$legacy_file")
  fi

  if [[ -n "$pid" ]]; then
    if kill -0 "$pid" 2>/dev/null; then
      printf "  Đang dừng %s (PID %s)..." "$label" "$pid"
      stop_process_tree "$pid"
      for _ in {1..10}; do
        kill -0 "$pid" 2>/dev/null || break
        sleep 0.5
      done
      if kill -0 "$pid" 2>/dev/null; then
        kill -9 "$pid" 2>/dev/null || true
      fi
      printf " ${C_GREEN}ĐÃ DỪNG!${C_RESET}\n"
    else
      log_warn "${label} không còn chạy (PID ${pid})."
    fi
    rm -f -- "$pid_file" "$legacy_file" 2>/dev/null || true
  else
    log_info "Không tìm thấy PID file cho ${label}."
  fi
}

do_stop() {
  local stop_all_containers="${1:-false}"
  printf "${C_BOLD}🛑 Dừng toàn bộ các dịch vụ server BashLab...${C_RESET}\n\n"

  # Dừng Frontend
  stop_pid_file "${FRONTEND_PID_FILE}" "Frontend Next.js" "${LEGACY_STATE_DIR}/bashlab-frontend.pid"

  # Dừng Backend
  stop_pid_file "${BACKEND_PID_FILE}" "Backend API" "${LEGACY_STATE_DIR}/bashlab-backend.pid"

  # Dừng các port nếu còn sót lại process mồ côi
  for p in 3000 3001; do
    local orphan_pid
    orphan_pid=$(get_port_pid "$p")
    if [[ -n "$orphan_pid" ]]; then
      log_warn "Phát hiện tiến trình mồ côi chiếm cổng $p (PID $orphan_pid). Đang dừng..."
      kill -TERM "$orphan_pid" 2>/dev/null || kill -9 "$orphan_pid" 2>/dev/null || true
    fi
  done

  # Dừng Stack Giám sát
  if [[ -f "$MONITORING_COMPOSE" ]]; then
    printf "  Đang dừng Monitoring stack (Prometheus & Grafana)..."
    docker compose -f "$MONITORING_COMPOSE" stop >/dev/null 2>&1 || true
    printf " ${C_GREEN}ĐÃ DỪNG!${C_RESET}\n"
  fi

  if [[ "$stop_all_containers" == "true" ]]; then
    if ( docker ps --format '{{.Names}}' 2>/dev/null || true ) | grep -qx "$RUNNER_CONTAINER"; then
      printf "  Đang dừng Runner container '%s'..." "$RUNNER_CONTAINER"
      docker stop "$RUNNER_CONTAINER" >/dev/null 2>&1 || true
      printf " ${C_GREEN}ĐÃ DỪNG!${C_RESET}\n"
    fi
  else
    log_info "Runner container '${RUNNER_CONTAINER}' được giữ nguyên trạng thái (chạy chế độ nền)."
  fi

  log_ok "Hoàn tất dừng các dịch vụ."
}

do_status() {
  print_banner
  printf "${C_BOLD}📊 BẢNG TRẠNG THÁI DỊCH VỤ BASHLAB:${C_RESET}\n\n"

  printf "+-----------------------+----------+----------------------------+------------+\n"
  printf "| %-21s | %-8s | %-26s | %-10s |\n" "Dịch vụ" "Trạng thái" "Địa chỉ / Endpoint" "PID / ID"
  printf "+-----------------------+----------+----------------------------+------------+\n"

  # 1. Frontend
  local fe_status="${C_RED}OFFLINE${C_RESET}"
  local fe_pid
  fe_pid=$(get_port_pid 3000)
  if port_is_open 3000; then
    fe_status="${C_GREEN}ONLINE${C_RESET} "
  fi
  printf "| %-21s | %b | %-26s | %-10s |\n" "Frontend (Next.js)" "$fe_status" "http://localhost:3000" "${fe_pid:--}"

  # 2. Backend
  local be_status="${C_RED}OFFLINE${C_RESET}"
  local be_pid
  be_pid=$(get_port_pid 3001)
  if port_is_open 3001; then
    if curl --fail --silent "http://127.0.0.1:3001/health" >/dev/null 2>&1; then
      be_status="${C_GREEN}ONLINE${C_RESET} "
    else
      be_status="${C_YELLOW}BUSY${C_RESET}   "
    fi
  fi
  printf "| %-21s | %b | %-26s | %-10s |\n" "Backend API" "$be_status" "http://127.0.0.1:3001" "${be_pid:--}"

  # 3. Runner Container
  local runner_status="${C_RED}OFFLINE${C_RESET}"
  local runner_id="-"
  if ( docker ps --format '{{.Names}}' 2>/dev/null || true ) | grep -qx "$RUNNER_CONTAINER"; then
    runner_status="${C_GREEN}ONLINE${C_RESET} "
    runner_id=$(docker inspect --format '{{slice .Id 0 10}}' "$RUNNER_CONTAINER" 2>/dev/null || echo "running")
  elif docker inspect "$RUNNER_CONTAINER" >/dev/null 2>&1; then
    runner_status="${C_YELLOW}STOPPED${C_RESET}"
  fi
  printf "| %-21s | %b | %-26s | %-10s |\n" "Runner (${RUNNER_CONTAINER})" "$runner_status" "Bubblewrap Jail" "$runner_id"

  # 4. Prometheus
  local prom_status="${C_RED}OFFLINE${C_RESET}"
  local prom_id="-"
  if ( docker ps --format '{{.Names}}' 2>/dev/null || true ) | grep -qx "bashlab-prometheus"; then
    prom_status="${C_GREEN}ONLINE${C_RESET} "
    prom_id=$(docker inspect --format '{{slice .Id 0 10}}' "bashlab-prometheus" 2>/dev/null || echo "running")
  fi
  printf "| %-21s | %b | %-26s | %-10s |\n" "Prometheus Metrics" "$prom_status" "http://127.0.0.1:9090" "$prom_id"

  # 5. Grafana
  local graf_status="${C_RED}OFFLINE${C_RESET}"
  local graf_id="-"
  if ( docker ps --format '{{.Names}}' 2>/dev/null || true ) | grep -qx "bashlab-grafana"; then
    graf_status="${C_GREEN}ONLINE${C_RESET} "
    graf_id=$(docker inspect --format '{{slice .Id 0 10}}' "bashlab-grafana" 2>/dev/null || echo "running")
  fi
  printf "| %-21s | %b | %-26s | %-10s |\n" "Grafana Dashboards" "$graf_status" "http://127.0.0.1:3002" "$graf_id"

  printf "+-----------------------+----------+----------------------------+------------+\n\n"

  printf "${C_BOLD}🔗 Các đường dẫn truy cập nhanh:${C_RESET}\n"
  printf "  • Giao diện Web:          ${C_CYAN}http://localhost:3000${C_RESET}\n"
  printf "  • Đăng nhập quản trị:     ${C_CYAN}http://localhost:3000/login${C_RESET}\n"
  printf "  • Quản trị hệ thống:      ${C_CYAN}http://localhost:3000/admin${C_RESET}\n"
  printf "  • Backend API Health:     ${C_CYAN}http://127.0.0.1:3001/health${C_RESET}\n"
  printf "  • Prometheus Explorer:    ${C_CYAN}http://127.0.0.1:9090${C_RESET}\n"
  printf "  • Grafana Metrics:        ${C_CYAN}http://127.0.0.1:3002${C_RESET} (User: admin / Pass: admin)\n\n"

  printf "  ${C_YELLOW}${C_BOLD}⚠ LƯU Ý KHI CHẠY LOCALHOST:${C_RESET}\n"
  printf "    • Bạn sẽ ${C_RED}không có full quyền${C_RESET} nếu máy chưa cài Grafana và chưa cấu hình Supabase.\n"
  printf "    • Để trải nghiệm tốt nhất (đầy đủ quyền & sandbox cloud): liên hệ ${C_CYAN}${C_BOLD}hieuhlz9000@gmail.com${C_RESET} để mở server Cloudflare Tunnel!\n\n"
}

stream_live_logs() {
  local stop_runner="${1:-false}"
  printf "${C_GRAY}======================================================================${C_RESET}\n"
  printf "${C_BOLD}📡 ĐANG TRUYỀN TRỰC TIẾP LOG MÁY CHỦ (LIVE SERVER LOGS)...${C_RESET}\n"
  printf "   • ${C_CYAN}[BACKEND]${C_RESET}  API Express tại ${C_CYAN}http://127.0.0.1:3001${C_RESET}\n"
  printf "   • ${C_MAGENTA}[FRONTEND]${C_RESET} App Next.js tại ${C_MAGENTA}http://localhost:3000${C_RESET}\n"
  printf "   • Nhấn ${C_BOLD}Ctrl+C${C_RESET} để dừng toàn bộ server và thoát an toàn.\n"
  printf "${C_GRAY}======================================================================${C_RESET}\n\n"

  cleanup_on_interrupt() {
    printf "\n\n${C_BOLD}${C_YELLOW}🛑 Nhận tín hiệu dừng (Ctrl+C). Đang tắt toàn bộ server BashLab...${C_RESET}\n\n"
    do_stop "$stop_runner"
    printf "${C_GREEN}✔ Đã tắt toàn bộ dịch vụ server an toàn. Hẹn gặp lại!${C_RESET}\n"
    exit 0
  }
  trap cleanup_on_interrupt INT TERM

  node "${REPO_ROOT}/scripts/stream-logs.mjs" \
    --backend="${BACKEND_LOG}" \
    --frontend="${FRONTEND_LOG}" \
    --tail=10 || true

  cleanup_on_interrupt
}

do_logs() {
  local target="${1:-all}"
  case "$target" in
    backend|api)
      log_info "Theo dõi log Backend API (${BACKEND_LOG}):"
      tail -n 100 -f "${BACKEND_LOG}"
      ;;
    frontend|fe)
      log_info "Theo dõi log Frontend Next.js (${FRONTEND_LOG}):"
      tail -n 100 -f "${FRONTEND_LOG}"
      ;;
    monitoring|prom|grafana)
      log_info "Theo dõi log Monitoring Compose:"
      docker compose -f "$MONITORING_COMPOSE" logs -f
      ;;
    runner|box)
      log_info "Theo dõi log Runner Container:"
      docker logs -f "$RUNNER_CONTAINER"
      ;;
    all|*)
      log_info "Theo dõi toàn bộ log máy chủ (Backend & Frontend):"
      node "${REPO_ROOT}/scripts/stream-logs.mjs" \
        --backend="${BACKEND_LOG}" \
        --frontend="${FRONTEND_LOG}" \
        --tail=25
      ;;
  esac
}

show_help() {
  print_banner
  printf "${C_BOLD}SỬ DỤNG:${C_RESET}\n"
  printf "  ./start.sh [LỆNH] [TÙY CHỌN]\n\n"
  printf "${C_BOLD}CÁC LỆNH CHÍNH:${C_RESET}\n"
  printf "  ${C_GREEN}start${C_RESET}         Khởi chạy toàn bộ hệ thống và hiển thị trực tiếp log [Mặc định]\n"
  printf "  ${C_RED}stop${C_RESET}          Dừng toàn bộ các dịch vụ đang chạy\n"
  printf "  ${C_YELLOW}restart${C_RESET}       Khởi động lại toàn bộ các dịch vụ và tiếp tục truyền log\n"
  printf "  ${C_CYAN}status${C_RESET}        Kiểm tra trạng thái thời gian thực của các dịch vụ\n"
  printf "  ${C_BLUE}logs${C_RESET} [tên]    Xem log dịch vụ: backend, frontend, monitoring, runner, all\n"
  printf "  ${C_GRAY}help${C_RESET}          Hiển thị hướng dẫn này\n\n"
  printf "${C_BOLD}TÙY CHỌN KÈM THEO:${C_RESET}\n"
  printf "  -d, --detach    Chạy ngầm toàn bộ dịch vụ (không stream log ra terminal)\n"
  printf "  --with-runner   Khi 'stop', dừng luôn cả container runner ${RUNNER_CONTAINER}\n"
  printf "  --no-monitoring Bỏ qua không khởi động Prometheus & Grafana\n\n"
  printf "${C_BOLD}VÍ DỤ:${C_RESET}\n"
  printf "  ./start.sh              # Bật toàn bộ dịch vụ & hiện log 200, 404... trực tiếp\n"
  printf "  ./start.sh -d           # Chạy ngầm server không gắn log\n"
  printf "  ./start.sh status       # Xem bảng trạng thái các dịch vụ\n"
  printf "  ./start.sh logs         # Xem log ghép nối Backend + Frontend trực tiếp\n"
  printf "  ./start.sh stop         # Tắt toàn bộ dịch vụ\n\n"
}

main() {
  local cmd="start"
  local with_runner=false
  local with_monitoring=true
  local detach=false

  # Xử lý tham số đầu tiên
  if [[ $# -gt 0 ]]; then
    case "$1" in
      start|stop|restart|status|logs|help|--help|-h)
        cmd="$1"
        shift
        ;;
      -d|--detach|--background)
        cmd="start"
        detach=true
        shift
        ;;
    esac
  fi

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --with-runner)
        with_runner=true
        shift
        ;;
      --no-monitoring)
        with_monitoring=false
        shift
        ;;
      -d|--detach|--background)
        detach=true
        shift
        ;;
      *)
        shift
        ;;
    esac
  done

  case "$cmd" in
    start)
      print_banner
      preflight_checks
      start_runner
      if [[ "$with_monitoring" == "true" ]]; then
        start_monitoring
      fi
      start_backend
      start_frontend
      printf "\n"
      do_status
      log_ok "Toàn bộ hệ thống BashLab đã sẵn sàng phục vụ!"
      if [[ "$detach" == "true" ]]; then
        log_info "Hệ thống đang chạy ngầm (chế độ detach). Để xem log thời gian thực: ${C_CYAN}./start.sh logs${C_RESET}"
        log_info "Để dừng hệ thống: ${C_RED}./start.sh stop${C_RESET}"
        exit 0
      fi
      stream_live_logs "$with_runner"
      ;;
    stop)
      do_stop "$with_runner"
      ;;
    restart)
      print_banner
      do_stop "$with_runner"
      sleep 1
      preflight_checks
      start_runner
      if [[ "$with_monitoring" == "true" ]]; then
        start_monitoring
      fi
      start_backend
      start_frontend
      printf "\n"
      do_status
      log_ok "Toàn bộ hệ thống BashLab đã được khởi động lại thành công!"
      if [[ "$detach" == "true" ]]; then
        log_info "Hệ thống đang chạy ngầm. Để xem log: ./start.sh logs"
        exit 0
      fi
      stream_live_logs "$with_runner"
      ;;
    status)
      do_status
      ;;
    logs)
      do_logs "${1:-all}"
      ;;
    help|--help|-h)
      show_help
      ;;
    *)
      log_err "Lệnh không hợp lệ: '$cmd'"
      printf "Sử dụng './start.sh help' để xem hướng dẫn.\n"
      exit 1
      ;;
  esac
}

main "$@"
