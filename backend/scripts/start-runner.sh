#!/usr/bin/env bash
set -euo pipefail
backend_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
workspace_root=${WORKSPACE_ROOT:-/var/tmp/bashlab/workspaces}
container=${RUNNER_CONTAINER:-bashlab-box}
image=${RUNNER_IMAGE:-bashlab-runner:local}
mkdir -p -- "$workspace_root"
workspace_root=$(realpath -- "$workspace_root")
# The backend owns this directory; descendants inherit the shared host group.
chmod 2770 -- "$workspace_root"
if [[ $(findmnt -n -o FSTYPE -T "$workspace_root") == tmpfs ]]; then
  echo 'Workspace must be on a disk-backed filesystem, not tmpfs.' >&2
  exit 1
fi
if docker inspect "$container" >/dev/null 2>&1; then
  echo "Container $container already exists. Stop/remove it explicitly before rebuilding." >&2
  exit 1
fi
docker build --load -t "$image" -f "$backend_dir/Dockerfile.runner" "$backend_dir"
engine_args=()
run_engine=(docker)
# Podman rootless can map the current host user directly to student (10001).
if docker version --format '{{json .Server.Components}}' 2>/dev/null | grep -qi podman; then
  engine_args+=(--userns=keep-id:uid=10001,gid=10001 --security-opt 'unmask=/proc/*')
  # Docker CLI rejects keep-id before sending the request. Use Podman's client
  # against the SAME API endpoint for container creation only.
  engine_url=${DOCKER_HOST:-$(docker context inspect --format '{{.Endpoints.docker.Host}}')}
  run_engine=(podman --remote --url "$engine_url")
else
  engine_args+=(--group-add "$(id -g)" --security-opt systempaths=unconfined)
fi
# This demo needs namespace/mount syscalls blocked by Docker's default profile.
# Override these with tested site profiles through the two environment variables.
"${run_engine[@]}" run -d --name "$container" --init --restart unless-stopped \
  --user 10001:10001 "${engine_args[@]}" --read-only --network none \
  --cap-drop ALL --security-opt no-new-privileges=true \
  --security-opt "seccomp=${BASHLAB_SECCOMP_PROFILE:-unconfined}" \
  --security-opt "apparmor=${BASHLAB_APPARMOR_PROFILE:-unconfined}" \
  --memory 512m --memory-swap 512m --cpus 2 --pids-limit 128 \
  --ulimit nofile=256:256 --ulimit core=0:0 \
  --mount "type=bind,src=$workspace_root,dst=/var/tmp/bashlab/workspaces" \
  "$image"
# Exercise real bwrap, write permissions, CWD metadata and JSON before reporting ready.
probe_id=$(python3 -c 'import uuid; print(uuid.uuid4())')
probe="$workspace_root/$probe_id"
mkdir -m 2770 -- "$probe" "$probe/home" "$probe/tmp"
cleanup() {
  local status=$?
  if (( status != 0 )); then docker stop "$container" >/dev/null 2>&1 || true; fi
  rm -rf -- "$probe"
}
trap cleanup EXIT
payload=$(python3 - "$probe_id" <<'PY'
import json, sys
print(json.dumps(dict(command='printf ready > health.txt; cat health.txt', cwd='/home/student',
                     workspacePath='/var/tmp/bashlab/workspaces/' + sys.argv[1])))
PY
)
result=$(printf '%s' "$payload" | docker exec -i "$container" /opt/bashlab/run-job)
if ! printf '%s' "$result" | python3 -c 'import json,sys; r=json.load(sys.stdin); assert r["stdout"] == "ready" and r["exitCode"] == 0 and r["cwdUpdated"], r'; then
  docker stop "$container" >/dev/null
  echo 'Runner probe failed; container stopped. Check user namespaces, LSM policy and workspace ownership.' >&2
  exit 1
fi
if [[ $(stat -c %u "$probe/home/health.txt") != "$(id -u)" && $(id -u) != 0 ]]; then
  echo 'Backend and runner files must have the same host UID for chmod/reset recovery.' >&2
  echo 'For rootful Docker, run startup and Node as a dedicated host user with UID 10001. See backend/RUNNING.md.' >&2
  exit 1
fi
printf 'Runner %s ready. WORKSPACE_ROOT=%s\n' "$container" "$workspace_root"
