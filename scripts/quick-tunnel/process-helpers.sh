#!/usr/bin/env bash

read_pid_file() {
  local file="$1" value=""
  [[ -r "$file" ]] || return 1
  IFS= read -r value < "$file" || return 1
  [[ "$value" =~ ^[1-9][0-9]*$ ]] || return 1
  printf '%s\n' "$value"
}

atomic_write_file() {
  local file="$1" value="$2" directory temp
  directory="$(dirname "$file")"
  mkdir -p "$directory"
  temp="$(mktemp "$directory/.tmp.XXXXXX")"
  printf '%s\n' "$value" > "$temp"
  mv -f "$temp" "$file"
}

pid_is_alive() {
  local pid="$1"
  [[ "$pid" =~ ^[1-9][0-9]*$ ]] && kill -0 "$pid" 2>/dev/null
}

pid_matches() {
  local pid="$1" pattern="$2" command_line
  pid_is_alive "$pid" || return 1
  command_line="$(ps -p "$pid" -o args= 2>/dev/null || true)"
  [[ "$command_line" == *"$pattern"* ]]
}

stop_owned_pid_file() {
  local file="$1" pattern="$2" label="$3" pid=""
  pid="$(read_pid_file "$file" 2>/dev/null || true)"
  if [[ -z "$pid" ]]; then
    rm -f "$file"
    return 0
  fi
  if ! pid_is_alive "$pid"; then
    rm -f "$file"
    return 0
  fi
  if ! pid_matches "$pid" "$pattern"; then
    printf 'Refusing to stop unmanaged %s (PID %s).\n' "$label" "$pid" >&2
    return 1
  fi
  kill -TERM -- "-$pid" 2>/dev/null || true
  local _
  for _ in 1 2 3 4 5 6 7 8 9 10; do
    kill -0 -- "-$pid" 2>/dev/null || break
    sleep 0.1
  done
  if kill -0 -- "-$pid" 2>/dev/null; then
    kill -KILL -- "-$pid" 2>/dev/null || true
  fi
  rm -f "$file"
}

quick_tunnel_url_since() {
  local log_file="$1" offset="$2" fresh
  [[ "$offset" =~ ^[0-9]+$ && -r "$log_file" ]] || return 1
  fresh="$(tail -c +$((offset + 1)) "$log_file" 2>/dev/null || true)"
  printf '%s\n' "$fresh" | grep -oE 'https://[[:alnum:]-]+\.trycloudflare\.com' | tail -n 1
}

cloudflared_registered_since() {
  local log_file="$1" offset="$2"
  [[ "$offset" =~ ^[0-9]+$ && -r "$log_file" ]] || return 1
  tail -c +$((offset + 1)) "$log_file" 2>/dev/null | grep -q 'Registered tunnel connection'
}
