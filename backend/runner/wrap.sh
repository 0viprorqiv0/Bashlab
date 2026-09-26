#!/bin/bash
# FD 3 belongs to the helper; stdout/stderr remain student output.
__bl_finish() {
  local rc="$?" raw cwd
  builtin trap - EXIT
  set +e +u
  if raw=$(builtin pwd -P 2>/dev/null && builtin printf '\001'); then
    cwd=${raw%$'\n\001'}
    builtin printf '%s\0' "$cwd" >&3
  fi
  builtin exit "$rc"
}
umask 0007
builtin trap __bl_finish EXIT
builtin source -- "$1"
builtin exit "$?"
