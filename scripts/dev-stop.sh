#!/usr/bin/env bash
set -euo pipefail

scratch_dir=${CLAUDE_SCRATCH_DIR:-${HOME}/Downloads/claude-scratch}
state_dir="$scratch_dir/bashlab"

stop_pid_file() {
  local pid_file=$1
  local label=$2
  if [[ ! -s "$pid_file" ]]; then
    return 0
  fi
  local pid
  pid=$(<"$pid_file")
  if kill -0 "$pid" 2>/dev/null; then
    stop_process_tree "$pid"
    for _ in {1..10}; do
      kill -0 "$pid" 2>/dev/null || break
      sleep 1
    done
    if kill -0 "$pid" 2>/dev/null; then
      printf '%s did not stop after 10 seconds (PID %s).\n' "$label" "$pid" >&2
      return 1
    fi
    printf '%s stopped (PID %s)\n' "$label" "$pid"
  else
    printf '%s was not running (PID %s)\n' "$label" "$pid"
  fi
  rm -f -- "$pid_file"
}

stop_process_tree() {
  local pid=$1
  local child
  while read -r child; do
    [[ -n "$child" ]] && stop_process_tree "$child"
  done < <(pgrep -P "$pid" 2>/dev/null || true)
  kill -TERM "$pid" 2>/dev/null || true
}

stop_pid_file "$state_dir/bashlab-frontend.pid" frontend
stop_pid_file "$state_dir/bashlab-backend.pid" backend
printf 'The bashlab-box container was left running.\n'
