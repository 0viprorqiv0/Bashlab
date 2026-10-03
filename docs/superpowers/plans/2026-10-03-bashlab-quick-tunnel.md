# BashLab Quick Tunnel Controller Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Start a complete temporary BashLab demo behind one `trycloudflare.com` URL with `start`, `stop`, `status`, `url`, `logs`, and `diagnose` commands.

**Architecture:** Caddy binds `127.0.0.1:8080`, proxies `/api/*` and `/health` to Express, and sends all other paths to Next.js. The controller discovers a fresh Quick Tunnel URL before launching Express with a process-local CORS allow-list containing that URL.

**Tech Stack:** Bash, Caddy, cloudflared, Node.js/Next.js, Express.

**Spec:** `docs/superpowers/specs/2026-10-03-bashlab-quick-tunnel-design.md`

## Global Constraints

- No custom domain, WAF, Cloudflare account, email gate, or permanent service.
- No source changes to BashLab authentication, sandbox, or API behavior.
- Bind frontend, API, and Caddy only to loopback.
- Stop only controller-owned PIDs whose command lines match expected processes.
- A dead Quick Tunnel is reported, never replaced automatically.

---

### Task 1: Lifecycle regression harness and process helpers

**Files:**
- Create: `scripts/quick-tunnel/process-helpers.sh`
- Create: `scripts/quick-tunnel/test/quick-tunnel-lifecycle.sh`

- [x] Write a disposable integration harness with fake `npm`, Docker, Caddy,
  cloudflared, curl, and lsof commands.
- [x] Assert observed behavior: fresh URL only, bridge target is port 8080,
  backend CORS contains the fresh URL, frontend uses a relative API base,
  repeated start preserves tunnel PID, stale/dead tunnel is not recreated,
  and occupied ports are rejected.
- [x] Run `bash scripts/quick-tunnel/test/quick-tunnel-lifecycle.sh` red before
  the controller exists, then green after each implementation increment.

### Task 2: Controller and local bridge

**Files:**
- Create: `scripts/quick-tunnel/Caddyfile`
- Create: `scripts/quick-tunnel/start-supervisor.sh`
- Create: `scripts/quick-tunnel/stop-supervisor.sh`
- Create: `scripts/quick-tunnel/bashlab-tunnel.sh`

- [x] Start or create `bashlab-box`, reject unmanaged listeners on ports 3000,
  3001, and 8080, and build frontend when `.next/BUILD_ID` is absent.
- [x] Launch Next.js with `NEXT_PUBLIC_API_URL=` and `-H 127.0.0.1`.
- [x] Launch Caddy and `cloudflared tunnel --url http://127.0.0.1:8080`.
- [x] Parse only URL lines after the current cloudflared log offset and require
  a registration marker before starting Express.
- [x] Start Express with loopback host, secure production cookies, and CORS
  containing `http://localhost:3000` plus the fresh Quick URL.
- [x] Write URL only after local and public health probes pass.
- [x] Implement idempotent start and verified shutdown.

### Task 3: Diagnostics and operator documentation

**Files:**
- Create: `scripts/quick-tunnel/diagnose.sh`
- Create: `scripts/quick-tunnel/README.md`
- Modify: `infra/cloudflare/README.md`
- Modify: `docs/superpowers/specs/2026-10-03-bashlab-quick-tunnel-design.md`

- [x] Report `LOCAL_FRONTEND`, `LOCAL_API`, `PUBLIC_HEALTH`, and one explicit
  `RESULT` value.
- [x] Document prerequisites, public-access warning, start/stop workflow,
  URL rotation, diagnostics, and Named Tunnel alternative.
- [x] Verify with:

  ```bash
  bash scripts/quick-tunnel/test/quick-tunnel-lifecycle.sh
  bash -n scripts/quick-tunnel/*.sh scripts/quick-tunnel/test/quick-tunnel-lifecycle.sh
  bash scripts/tests/dev-scripts.test.sh
  git diff --check
  ```
