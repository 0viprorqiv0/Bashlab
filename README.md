# BashLab — Cybersecurity Lab & Learning Platform

> [!WARNING]
> ### ⚠ QUAN TRỌNG: GIỚI HẠN MÔI TRƯỜNG CỤC BỘ (LOCALHOST) / IMPORTANT NOTICE
>
> **Tiếng Việt:**
> Hiện tại, bạn **sẽ không chạy được đầy đủ tính năng và toàn bộ quyền (full permissions)** trực tiếp trên máy cá nhân nếu máy chưa cài đặt Grafana và chưa có cấu hình Supabase (PostgreSQL RLS, Authentication, Storage secrets)...
> 👉 **Nếu bạn cần trải nghiệm đầy đủ nhất** toàn bộ tính năng quản trị, phòng lab sandbox thực tế và bài tập thực hành, vui lòng liên hệ email: **[hieuhlz9000@gmail.com](mailto:hieuhlz9000@gmail.com)** để yêu cầu mở server **Cloudflare Tunnel** trực tiếp!
>
> **English (ASD-STE100):**
> You cannot execute all features and full permissions locally without an active Grafana service and configured Supabase credentials.
> 👉 **To access the complete live demonstration with full permissions**, contact: **[hieuhlz9000@gmail.com](mailto:hieuhlz9000@gmail.com)** to request activation of the live **Cloudflare Tunnel** server.
>
> ---
>
> ### 🔑 TÀI KHOẢN TRẢI NGHIỆM HỆ THỐNG / DEMO & TEST CREDENTIALS
>
> Hệ thống cung cấp sẵn **02 tài khoản thử nghiệm** đã phân quyền đầy đủ trong cơ sở dữ liệu:
>
> | Vai trò / Role | Email đăng nhập | Mật khẩu / Password | Phạm vi quyền hạn / Permissions |
> |---|---|---|---|
> | 🛡️ **Quản trị viên (Administrator)** | `admin@bashlab.local` | `BashLab2026!` | **Toàn quyền Quản trị:** Truy cập `/admin`, Studio soạn thảo bài học (`/admin/studio`), Quản lý tài khoản & phân quyền (`/admin/users`), Giám sát hoạt động & Audit Trail (`/admin/activity`), Dashboard số liệu (`/dashboard`). |
> | 🎓 **Học viên (Learner)** | `learner@bashlab.local` | `BashLab2026!` | **Quyền Học tập & Phòng Lab:** Danh mục khoá học (`/courses`), Sandbox Linux Terminal tương tác độc lập, Thực hành lệnh bảo mật, Nộp cờ xác thực CTF Flag, Xem tiến độ cá nhân. |

This document describes the technical architecture, security model, and verification metrics for BashLab.
The documentation complies with the ASD-STE100 (Simplified Technical English) specification.

---

## 1. System Overview & Security Threat Model

BashLab is an interactive Computer Science training platform for Linux system engineering and security operations.
The primary engineering challenge is safe multi-tenant Remote Code Execution (RCE).
The platform executes untrusted student commands while protecting the host system, network, and database.

```text
Untrusted Web Client (Browser)
      │
      ▼ (HTTPS / TLS 1.3)
Cloudflare Edge / Reverse Proxy (Caddy Loopback Bridge)
      │
      ▼
Express 5 API Gateway (Rate Limiter, RBAC, JWT Auth Cache)
      │
      ▼
Admission Queue & Concurrency Limiter (4 Worker Slots, Backpressure)
      │
      ▼
Docker Runner Container (`bashlab-box`)
      │
      ▼
Bubblewrap Linux Sandbox (`bwrap` Namespace & Capability Isolation)
      │
      ├── Read-Only Root Filesystem (`/`, `/etc`, `/usr`)
      ├── Masked Sensitive Files (`/etc/shadow`, `/proc`)
      ├── Network Isolation (`--unshare-net`)
      ├── Dropped Linux Capabilities (`--cap-drop ALL`)
      └── Execution Constraints (3.0s Timeout, 10 MiB File Cap, 64 KB Output Cap)
```

The system defends against five primary attack classes:
1. **Container Breakout and Sandbox Escape:** Unauthorized access to host kernel, host files, or peer containers.
2. **Privilege Escalation:** Vertical escalation to Administrator role and horizontal access to peer student sessions.
3. **Resource Exhaustion (Denial of Service):** Fork bombs, CPU starvation loops, memory leaks, and disk saturation.
4. **Network Reconnaissance:** Outbound lateral movement, port scanning, and command-and-control communication.
5. **Data Tampering & Injection:** SQL injection, Cross-Site Scripting (XSS), and forged authorization tokens.

---

## 2. Five Core Features

### 2.1 Multi-Layered Terminal Sandbox and Auto-Grading Engine
- **Kernel-Level Process Isolation:**
  The engine launches commands inside Bubblewrap (`bwrap`) containers.
  The sandbox unshares PID, mount, IPC, UTS, and network namespaces.
- **Filesystem Immutability:**
  The root directory, system binaries, and configuration folders remain strictly read-only.
  The engine creates isolated `tmpfs` mounts for temporary execution files.
  The system hides `/etc/shadow` and kernel parameters from the executing user.
- **Zero-Network Policy:**
  The sandbox uses `--unshare-net` to eliminate network interfaces.
  Commands cannot open sockets, resolve external DNS, or connect to internal networks.
- **Deterministic Auto-Grading:**
  The grading engine inspects file contents, exit codes, and environment changes directly.
  The engine operates without simulated browser terminals to guarantee genuine Linux execution semantics.

### 2.2 Content Studio with Secure Curriculum Management
- **Visual Studio Code Interface:**
  The editor displays a file tree of courses, chapters, and lab exercises.
  The interface includes tabbed panels for theory, task objectives, hints, and validation rules.
- **Content Sanitization:**
  The editor sanitizes Markdown content before rendering live previews to prevent Cross-Site Scripting (XSS).
- **Access Boundary:**
  Only authenticated users with the Administrator role can create, modify, or publish lab content.
  Learner requests to Content Studio endpoints return HTTP 403 Forbidden.

### 2.3 Identity and Role-Based Access Control (RBAC)
- **Token-Based Authentication:**
  The API validates signed JSON Web Tokens (JWT) for all sensitive operations.
  Secure, HTTP-only, SameSite cookies store refresh tokens to prevent token theft via script injection.
- **Strict Role Separation:**
  The platform defines two discrete roles: Learner and Administrator.
  The database layer enforces Supabase Row Level Security (RLS) on all user tables.
- **Session Isolation:**
  Horizontal access checks prevent learners from accessing sessions owned by other accounts.
  Unauthorized session queries return HTTP 404 to eliminate user enumeration oracles.
- **Account Revocation:**
  Administrators can lock or ban compromised accounts instantly.
  The API terminates active sessions and rejects banned credentials with HTTP 403 Forbidden.

### 2.4 Security Observability and Activity Audit Trail
- **Real-Time Session Monitoring:**
  The admin console displays active sandboxes, executing commands, and memory utilization.
  Administrators can terminate runaway or suspicious student sessions with one click.
- **Immutable Security Audit Log:**
  The system logs all administrative operations, role modifications, and login events.
  Audit logs record client IP, timestamp, user ID, target entity, and outcome.
- **Telemetry Infrastructure:**
  A Prometheus endpoint exposes operational metrics, error rates, and queue latency.
  Pre-configured Grafana dashboards display execution volume, runner RAM, and HTTP status codes.

### 2.5 Denial-of-Service (DoS) Mitigation and Admission Control
- **Per-Client Rate Limiting:**
  A sliding-window rate limiter blocks brute-force authentication and request flooding.
- **Single-Command Session Mutex:**
  The engine enforces a concurrency lock per student session.
  Concurrent command submissions on the same session return HTTP 409 Conflict.
- **Worker Admission Queue:**
  The system restricts execution to four parallel worker slots.
  The queue buffers up to 32 pending execution requests with a 5.0-second timeout.
- **Active Backpressure:**
  When the queue exceeds capacity, the server returns HTTP 503 Service Unavailable immediately.
  This defense preserves system stability and protects host resources during heavy traffic bursts.

---

## 3. Advanced Security Functions & Engineering

### 3.1 Defense-in-Depth Sandbox Architecture

| Security Layer | Technology | Defensive Mechanism | Threat Mitigated |
|---|---|---|---|
| **L1: Process Boundary** | Linux Bubblewrap (`bwrap`) | Kernel namespaces (PID, mount, IPC, UTS, net) | Process snooping, peer container interference |
| **L2: Privilege Boundary** | Linux Capabilities | Drop all capabilities (`--cap-drop ALL`), set `PR_SET_NO_NEW_PRIVS` | Privilege escalation, `setuid` binary abuse |
| **L3: Filesystem Boundary** | Read-Only Bind Mounts | Read-only `/`, `/usr`, `/etc`; masked `/etc/shadow`; private `tmpfs` | Rootkit installation, system file modification |
| **L4: Network Boundary** | Network Namespace Unshare | `--unshare-net` (loopback only, no external routes) | Data exfiltration, lateral scanning, botnet C2 |
| **L5: Resource Boundary** | POSIX RLIMITs & Timers | 3.0s execution timeout (SIGKILL), 10 MiB `RLIMIT_FSIZE`, 64 KB output buffer | CPU starvation, infinite loops, disk exhaustion |
| **L6: Container Boundary** | Docker (`bashlab-box`) | Unprivileged container user (`nobody`), memory limit (512 MiB) | Host breakout, kernel memory exhaustion |

### 3.2 Performance Optimization under Security Constraints
- **In-Memory JWT Verification Cache:**
  The backend caches validated token public claims for 60 seconds.
  This cache reduces authentication latency from 350 ms to less than 0.5 ms.
  The cache removes 99.8 percent of remote database authentication requests.
- **Warm Container Execution Architecture:**
  The host maintains one active, pre-warmed runner container (`bashlab-box`).
  The API spawns ephemeral Bubblewrap sandboxes inside this container.
  This design reduces command initialization latency from 2.0 seconds to under 15 ms.

### 3.3 Concurrency Stress Testing and Empirical Benchmarks
The engineering team conducted stress testing using the automated benchmark harness (`tests/benchmark.js`).
The benchmark evaluated four concurrency tiers (C = 10, 20, 30, and 50):

| Concurrency Tier | Total Requests | Success Rate | Throughput (req/s) | Median Latency (p50) | 95th Percentile (p95) | Peak Runner RAM | Defense & Stability Behavior |
|:---:|:---:|:---:|:---:|:---:|:---:|:---:|---|
| **C = 10** | 30 | **100.0%** | **9.57 req/s** | **679 ms** | 1,162 ms | 4.94 MiB | Normal operation; zero queue latency |
| **C = 20** | 60 | **100.0%** | **11.81 req/s** | **1,017 ms** | 1,674 ms | 19.06 MiB | Full worker saturation across 4 execution slots |
| **C = 30** | 90 | **100.0%** | **10.28 req/s** | **1,618 ms** | 2,932 ms | 11.45 MiB | Queue absorption; all requests served within 5.0s |
| **C = 50** | 150 | **72.0%** | **13.54 req/s** | **1,367 ms** | 3,521 ms | 15.42 MiB | **Active backpressure:** 42 excess requests rejected with HTTP 503 |

- **Resource Confinement Evidence:**
  The runner container memory peaked at 19.06 MiB out of 512 MiB total allocated capacity.
  The container memory remained below 20 MiB across all concurrency tiers.
  The test run produced zero orphaned processes and zero container leaks.

### 3.4 Penetration Testing and Security Audit
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

## 4. Test Verification Evidence

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

## 6. Zero-Trust Remote Demo (Cloudflare Quick Tunnel)

BashLab includes a zero-trust remote demo orchestrator.
The controller exposes the application through an outbound-only encrypted tunnel without opening inbound firewall ports.

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
