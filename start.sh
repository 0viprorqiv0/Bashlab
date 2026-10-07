#!/usr/bin/env bash
# Entrypoint tiện lợi ở root thư mục dự án
exec "$(dirname "$0")/scripts/start-all.sh" "$@"
