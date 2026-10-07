# BashLab — Cybersecurity Lab & Learning Platform

> [!WARNING]
> ### LOCAL ENVIRONMENT LIMITATIONS AND TEST CREDENTIALS
>
> **Vietnamese:**
> Môi trường cục bộ (localhost) không hỗ trợ đầy đủ tính năng và toàn bộ quyền hạn nếu hệ thống chưa cài đặt dịch vụ Grafana và chưa cấu hình thông tin xác thực Supabase. Để trải nghiệm hệ thống với đầy đủ quyền quản trị và môi trường sandbox, liên hệ qua email [hieuhlz9000@gmail.com](mailto:hieuhlz9000@gmail.com) để yêu cầu kích hoạt máy chủ Cloudflare Tunnel.
>
> **English (ASD-STE100):**
> You cannot operate all system features and administrative permissions in a local environment without an active Grafana service and configured Supabase credentials. To access the complete demonstration with full permissions, contact [hieuhlz9000@gmail.com](mailto:hieuhlz9000@gmail.com) to request activation of the live Cloudflare Tunnel server.
>
> ---
>
> ### PRE-CONFIGURED TEST CREDENTIALS
>
> The database provides two verified test accounts:
>
> | Role | Email Address | Password | Permitted Operations |
> |---|---|---|---|
> | **Administrator** | `admin@bashlab.local` | `BashLab2026!` | Administrative control: `/admin`, Content Studio (`/admin/studio`), User Management (`/admin/users`), Security Audit Trail (`/admin/activity`), Metrics Dashboard (`/dashboard`). |
> | **Learner** | `learner@bashlab.local` | `BashLab2026!` | Learner operations: Course Catalog (`/courses`), Isolated Terminal Sandbox, Course Exercises, CTF Flag Submissions, Personal Progress Tracking. |

This document describes the technical architecture, security model, and verification metrics for BashLab.
The documentation complies with the ASD-STE100 (Simplified Technical English) specification.

---

## 1. System Overview & Cybersecurity Threat Model

BashLab is an interactive Computer Science cyber range and defensive learning platform.
The system trains students in Linux system internals, defensive hardening, vulnerability analysis, and security operations.
The primary engineering challenge is safe multi-tenant Remote Code Execution (RCE) in an untrusted educational environment.
The architecture executes untrusted student commands while it protects the host operating system, network interfaces, and database records.

```text
Untrusted Web Client (Browser)
      │
      ▼ (HTTPS / TLS 1.3)
Cloudflare Edge / Zero-Trust Tunnel (Outbound-Only Encrypted Tunnel)
      │
      ▼
Loopback Reverse Proxy Bridge (Caddy Header Sanitization & Strict Origin Binding)
      │
      ▼
Express 5 API Gateway (Sliding-Window Rate Limiter, RBAC, JWT Claims Cache)
      │
      ▼
Admission Queue & Concurrency Limiter (4 Execution Slots, Backpressure)
      │
      ▼
Docker Runner Container (`bashlab-box`, Non-Root User, 512 MiB RAM Cap)
      │
      ▼
Bubblewrap Linux Sandbox (`bwrap` Namespace & Linux Capability Isolation)
      │
      ├── Read-Only System Mounts (`/`, `/etc`, `/usr`, `/bin`, `/lib`)
      ├── Masked Sensitive Files (`/etc/shadow`, `/etc/gshadow`, `/proc`)
      ├── Complete Network Isolation (`--unshare-net`, Loopback Only)
      ├── Dropped Linux Capabilities (`--cap-drop ALL`, `PR_SET_NO_NEW_PRIVS`)
      └── Execution Constraints (3.0s Timeout, 10 MiB File Cap, 64 KB Output Cap)
```

### 1.1 Threat Matrix and Defensive Posture

The platform defends against five primary threat categories:

| Threat Category | Attack Vector | Potential Impact | BashLab Defensive Mechanism |
|---|---|---|---|
| **Sandbox Breakout** | Linux kernel exploit, container breakout, filesystem writes to host | Host compromise, rootkit installation | Bubblewrap namespaces, read-only system mounts, dropped Linux capabilities, unprivileged Docker container user |
| **Privilege Escalation** | Vertical escalation to Administrator role, horizontal access to peer sessions | Data exfiltration, grading tampering, unauthorized course edits | Postgres Row Level Security (RLS), signed JWT verification, session ownership validation returning HTTP 404 |
| **Denial of Service** | Fork bombs, CPU exhaustion loops, disk fill attacks | Host freeze, resource starvation for other students | 3.0s execution timeout (SIGKILL), 10 MiB `RLIMIT_FSIZE`, single-command session mutex, 4-worker admission queue with HTTP 503 backpressure |
| **Network Reconnaissance** | Outbound port scanning, lateral network traversal, botnet C2 traffic | Internal network breach, scanning internal cloud services | Complete network namespace isolation (`--unshare-net`), elimination of all external routing and network interfaces |
| **Payload Injection** | SQL injection, cross-site scripting (XSS), command parameter tampering | Database leakage, session hijack, shell injection | Parameterized database queries, sanitized Markdown parsing, memfd-based task verification eliminating shell concatenation |

---

## 2. Five Core Features

### 2.1 Multi-Layer Linux Sandbox and Deterministic CTF Auto-Grading Engine
- **Kernel-Level Isolation:**
  The runner spawns commands inside Linux Bubblewrap (`bwrap`) sandboxes.
  The sandbox separates PID, mount, IPC, UTS, and network namespaces.
- **Filesystem Immutability and Data Masking:**
  System binaries, libraries, and core configuration directories remain strictly read-only.
  The engine allocates ephemeral `tmpfs` mounts for temporary student workspaces.
  The sandbox masks `/etc/shadow`, `/etc/gshadow`, and sensitive `/proc` paths.
- **Strict Zero-Network Policy:**
  The sandbox uses `--unshare-net` to eliminate all network interfaces.
  Student commands cannot resolve DNS, establish outbound sockets, or scan internal networks.
- **Tamper-Resistant CTF Flag Verification:**
  The auto-grading engine validates student task completion and Capture-The-Flag (CTF) token submissions.
  The verifier inspects file status directly through file descriptors (`memfd_create`) to prevent shell injection during grading.
  The engine does not use a simulated browser terminal; it executes authentic Linux system calls.

### 2.2 Content Studio with Secure Curriculum and Challenge Authoring
- **Integrated Development Environment:**
  The Content Studio uses a Visual Studio Code layout with a course and lesson navigation tree.
  The editor contains four dedicated panels: theory, learning objectives, hints, and automated verification rules.
- **Stored XSS Defense:**
  The editor sanitizes Markdown content before rendering live previews to prevent Stored Cross-Site Scripting (XSS).
- **Strict Role-Based Authoring Boundary:**
  Only authenticated accounts with the Administrator role can create, modify, or publish lab challenges.
  Learner requests to administrative authoring endpoints return HTTP 403 Forbidden.

### 2.3 Identity, Role-Based Access Control (RBAC), and Session Shield
- **Cryptographic Token Authentication:**
  The API validates signed JSON Web Tokens (JWT) for all protected operations.
  Secure, HTTP-only, SameSite cookies protect session tokens against client-side script theft.
- **Dual-Role Boundary Enforcement:**
  The platform separates permissions into Learner and Administrator roles.
  The database layer enforces PostgreSQL Row Level Security (RLS) on all user data.
- **Horizontal Access Defense (Session Shield):**
  The API validates session ownership before executing commands or reading output.
  Cross-user query attempts return HTTP 404 Not Found to prevent user enumeration oracles.
- **Instantaneous Account Revocation:**
  Administrators can lock or terminate compromised student accounts immediately.
  The authentication middleware revokes active sessions and rejects banned credentials with HTTP 403 Forbidden.

### 2.4 Security Operations Center (SOC) Observability and Audit Trail
- **Real-Time Session Telemetry:**
  The administrative console monitors active sandboxes, executing commands, and memory utilization.
  Administrators can terminate runaway or suspicious student sessions with an emergency killswitch.
- **Immutable Security Audit Log:**
  The system logs all administrative operations, role modifications, and login events.
  Audit records store client IP address, timestamp, user ID, target entity, and outcome.
- **Prometheus and Grafana Security Monitoring:**
  The Prometheus exporter collects execution rates, error classifications, and queue latency.
  Pre-configured Grafana dashboards display command execution volume, runner RAM, and HTTP status distributions.

### 2.5 Denial-of-Service (DoS) Defense and Worker Admission Control
- **Sliding-Window Rate Limiting:**
  A tiered rate limiter blocks brute-force authentication attacks and API flooding.
- **Single-Command Session Mutex:**
  The engine enforces a concurrency lock per student session.
  Concurrent command submissions on the same session return HTTP 409 Conflict.
- **Worker Admission Queue:**
  The system limits execution to four parallel worker slots.
  The admission queue buffers up to 32 pending execution requests with a 5.0-second timeout.
- **Active Backpressure Defense:**
  When the admission queue reaches capacity (32 pending jobs), the API rejects requests immediately with HTTP 429 Too Many Requests (`QUEUE_FULL`).
  If a queued request waits longer than the 5.0-second queue timeout deadline, the API terminates the wait with HTTP 503 Service Unavailable (`QUEUE_TIMEOUT`).
  This defense preserves system stability and protects host resources during heavy traffic bursts.

---

## 3. Advanced Cybersecurity Engineering & Verification

### 3.1 Defense-in-Depth Sandbox Architecture

| Security Layer | Technology | Defensive Mechanism | Threat Mitigated |
|---|---|---|---|
| **L1: Process Boundary** | Linux Bubblewrap (`bwrap`) | Kernel namespaces (PID, mount, IPC, UTS, net) | Process snooping, peer container interference |
| **L2: Privilege Boundary** | Linux Capabilities | Drop all capabilities (`--cap-drop ALL`), set `PR_SET_NO_NEW_PRIVS` | Privilege escalation, `setuid` binary abuse |
| **L3: Filesystem Boundary** | Read-Only Bind Mounts | Read-only `/`, `/usr`, `/etc`; masked `/etc/shadow`; private `tmpfs` | Rootkit installation, system file modification |
| **L4: Network Boundary** | Network Namespace Unshare | `--unshare-net` (loopback only, no external routes) | Data exfiltration, lateral scanning, botnet C2 |
| **L5: Resource Boundary** | POSIX RLIMITs & Timers | 3.0s execution timeout (SIGKILL), 10 MiB `RLIMIT_FSIZE`, 64 KB output buffer | CPU starvation, infinite loops, disk exhaustion |
| **L6: Container Boundary** | Docker (`bashlab-box`) | Unprivileged container user (`student`, UID/GID 10001), memory limit (512 MiB), read-only root, no network | Host breakout, kernel memory exhaustion |

### 3.2 Capture-The-Flag (CTF) Challenge & Flag Verification Subsystem
- **Deterministic Challenge Verification:**
  Each cybersecurity lab contains a deterministic flag token format (`FLAG{...}`).
  Students submit flags to the dedicated endpoint (`POST /api/labs/:lessonId/flag`).
- **Timing-Attack Resistance:**
  The backend verifies flag strings using constant-time comparison to prevent side-channel timing attacks.
- **Injection-Free Task Inspection:**
  The grading engine inspects file contents, directory permissions, and process exit codes without passing unsanitized student input to shell interpreters.
  Grading scripts execute via in-memory file descriptors (`memfd_create`), preventing tampering with grading binaries.

### 3.3 Cryptographic Performance Optimization
- **In-Memory JWT Verification Cache:**
  The backend caches validated token public claims for 60 seconds.
  This cache reduces authentication latency from 350 ms to less than 0.5 ms.
  The cache removes 99.8 percent of remote database authentication requests.
- **Warm Container Execution Architecture:**
  The host maintains one active, pre-warmed runner container (`bashlab-box`).
  The API spawns ephemeral Bubblewrap sandboxes inside this container.
  This design reduces command initialization latency from 2.0 seconds to under 15 ms.

### 3.4 Concurrency Stress Testing and Empirical Benchmarks
The engineering team conducted stress testing using the automated benchmark harness (`tests/benchmark.js`).
The benchmark evaluated four concurrency tiers (C = 10, 20, 30, and 50):

| Concurrency Tier | Total Requests | Success Rate | Throughput (req/s) | Median Latency (p50) | 95th Percentile (p95) | Peak Runner RAM | Defense & Stability Behavior |
|:---:|:---:|:---:|:---:|:---:|:---:|:---:|---|
| **C = 10** | 30 | **100.0%** | **9.57 req/s** | **679 ms** | 1,162 ms | 4.94 MiB | Normal operation; zero queue latency |
| **C = 20** | 60 | **100.0%** | **11.81 req/s** | **1,017 ms** | 1,674 ms | 19.06 MiB | Full worker saturation across 4 execution slots |
| **C = 30** | 90 | **100.0%** | **10.28 req/s** | **1,618 ms** | 2,932 ms | 11.45 MiB | Queue absorption; all requests served within 5.0s |
| **C = 50** | 150 | **72.0%** | **13.54 req/s** | **1,367 ms** | 3,521 ms | 15.42 MiB | **Active backpressure:** 42 excess requests rejected with HTTP 429 (`QUEUE_FULL`) |

- **Resource Confinement Evidence:**
  The runner container memory peaked at 19.06 MiB out of 512 MiB total allocated capacity.
  The container memory remained below 20 MiB across all concurrency tiers.
  The test run produced zero orphaned processes and zero container leaks.

### 3.5 Penetration Testing and Security Audit
The automated security suite (`backend/scripts/run-pentest-audit.mjs`) evaluated 24 attack vectors.
The system achieved a **100.0 percent pass rate (24/24 passed)**:

1. **Vertical Privilege Escalation (6 tests):**
   - Unauthenticated requests to protected endpoints return HTTP 401 Unauthorized.
   - Learner requests to admin endpoints return HTTP 403 Forbidden.
   - Forged, tampered, and expired JWT tokens are rejected.
2. **Horizontal Privilege Escalation (4 tests):**
   - Access attempts to foreign sessions return HTTP 404 Not Found (hiding resource existence).
   - Learners cannot execute commands or terminate sessions owned by other users.
3. **Sandbox Escape & Jailbreak Resistance (5 tests):**
   - Root filesystem and system binary modifications are blocked (Read-Only filesystem).
   - Access to `/etc/shadow` is denied (masked file).
   - Outbound internet connections (`curl`, `ping`, raw sockets) are blocked.
   - `sudo` commands and setuid execution are blocked.
4. **Denial of Service & Resource Abuse (5 tests):**
   - CPU loops (`yes`, `while true`) are killed at 3.0 seconds with exit code 124.
   - File generation exceeding 10 MiB is halted by `RLIMIT_FSIZE`.
   - Output buffer exceeding 64 KB is safely truncated.
   - Concurrent command spam on the same session returns HTTP 409 Conflict.
   - Oversized JSON request payloads return HTTP 413 Payload Too Large.
5. **Input Sanitization & Access Enforcement (4 tests):**
   - SQL injection vectors in parameters are neutralized by parameterized queries.
   - Non-string command payloads return HTTP 400 Bad Request.
   - Banned accounts are blocked immediately with HTTP 403 Forbidden.
   - Internal metrics endpoints permit queries only from loopback addresses.

---

## 4. Security Assurance and Verification Evidence

The directory `docs/audit_benchmark_pentest/` contains complete audit logs and execution traces:

| Audit Category | Tool / Test Runner | Test Scope | Results | Compliance Status | Reference File |
|---|---|:---:|:---:|:---:|---|
| **Backend Unit & Integration** | Node.js Test Runner | 105 tests | 105 / 105 passed | **100.0% PASS** | `backend/tests/*.test.js` |
| **Penetration Security Suite** | Automated Pentest Harness | 24 attack vectors | 24 / 24 blocked | **100.0% SECURE** | `backend/scripts/run-pentest-audit.mjs` |
| **OWASP ASVS 5.0 Audit** | Security Checklist Verification | 62 requirements | 62 verified | **100.0% COMPLIANT** | `docs/audit_benchmark_pentest/03_OWASP_ASVS5_SECURITY_RETEST.md` |
| **Concurrency Benchmark** | Stress Test Suite (`benchmark.js`) | 4 concurrency tiers | 330 requests | **PASSED (C=10..50)** | `backend/benchmarks/latest.json` |
| **E2E Browser Verification** | Playwright Chromium | 42 test specs | 41 passed, 1 skipped | **97.6% PASS** | `frontend/tests/e2e/specs/` |
| **Quick Tunnel Lifecycle** | Controller Regression Suite | 11 state assertions | 11 passed | **100.0% PASS** | `scripts/quick-tunnel/test/quick-tunnel-lifecycle.sh` |

---

## 5. Quick Start Instructions

### 5.1 Start Local Stack
Run the startup orchestrator from the project root:
```bash
./start.sh
```

To run all services in the background:
```bash
./start.sh -d
```

To inspect service health:
```bash
./start.sh status
```

To stop all services:
```bash
./start.sh stop
```

> [!NOTE]
> Local execution without configured Supabase credentials and Grafana service restricts full role permissions and persistence. Contact **`hieuhlz9000@gmail.com`** to request activating the live Cloudflare demo tunnel.

### 5.2 System Endpoints
- Web Application: `http://localhost:3000`
- Backend API Health Check: `http://127.0.0.1:3001/health`
- Prometheus Metrics Explorer: `http://127.0.0.1:9090`
- Grafana Security Dashboards: `http://127.0.0.1:3002` (Credentials: `admin` / `admin`)

### 5.3 Test Credentials

The database contains two pre-configured accounts for testing and verification:

| Role | Email Address | Password | Permitted Operations |
|---|---|---|---|
| **Administrator** | `admin@bashlab.local` | `BashLab2026!` | Full Admin: `/admin`, Content Studio (`/admin/studio`), User Management (`/admin/users`), Security Audit Trail (`/admin/activity`), Live Metrics (`/dashboard`) |
| **Learner** | `learner@bashlab.local` | `BashLab2026!` | Student: Course catalog (`/courses`), Isolated Sandbox Terminal, Practice Exercises, CTF Flag Submissions, Learning Progress |

> [!TIP]
> Use `admin@bashlab.local` to inspect administrative workflows and security management. Use `learner@bashlab.local` to experience standard learner workflows and sandboxed command execution.

---

## 6. Zero-Trust Remote Architecture (Cloudflare Quick Tunnel)

BashLab includes a zero-trust remote access orchestrator.
The controller exposes the application through an outbound-only encrypted tunnel without opening inbound firewall ports or exposing host IP addresses.
This design eliminates external network attack surfaces, prevents port scanning of host infrastructure, and enforces end-to-end TLS 1.3 encryption.
The local Caddy reverse proxy bridge sanitizes HTTP request headers and enforces strict origin validation before forwarding requests to local loopback sockets.

### 6.1 Start Public Tunnel
```bash
./scripts/quick-tunnel/bashlab-tunnel.sh start -d
```

The supervisor verifies local loopback listeners, starts Caddy as an internal bridge, establishes the encrypted tunnel, and injects the dynamic public URL into backend CORS origins:
```text
Public URL: https://<subdomain>.trycloudflare.com
```

### 6.2 Inspect Tunnel Health & Diagnostics
```bash
./scripts/quick-tunnel/bashlab-tunnel.sh status
./scripts/quick-tunnel/bashlab-tunnel.sh diagnose
```

When healthy, the diagnostic output reports:
```text
LOCAL_FRONTEND=200
LOCAL_API=200
PUBLIC_HEALTH=200
RESULT=CONNECTOR_READY
```

### 6.3 Restart Local App Without Losing Public URL
To reload code or restart frontend/backend without resetting the public URL:
```bash
./scripts/quick-tunnel/bashlab-tunnel.sh restart -d
```

### 6.4 Stop Tunnel Controller
To terminate all tunnel and bridge processes:
```bash
./scripts/quick-tunnel/bashlab-tunnel.sh stop
```
