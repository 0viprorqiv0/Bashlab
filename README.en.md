# BashLab — Technical System Documentation

This document answers the specification requirement:
> **Advanced requirements: Includes 4–5 main features, and advanced functionalities (e.g., optimize performance, benchmarking, stress testing, ...).**

---

## 1. System Overview

BashLab is an educational software system for Linux commands.
The system executes student commands in isolated Linux containers.
The frontend uses Next.js and Supabase.
The backend API uses Node.js, Express, and Docker.

---

## 2. Five Main Features

### 2.1 Feature 1: Interactive Terminal Sandbox and Auto-Grading Engine
- The system executes user commands in an authentic Linux environment.
- The system does not use a browser simulation.
- A Bubblewrap sandbox isolates the filesystem and system resources.
- The root filesystem and system binaries are read-only.
- The sandbox blocks network access and isolates process trees.
- A watchdog timer stops commands that exceed 3.0 seconds.
- The task verifier inspects files directly through file descriptors to prevent command injection.

### 2.2 Feature 2: Content Studio for Course Management
- The user interface uses a layout similar to Visual Studio Code.
- A navigation tree shows courses, chapters, and lessons.
- The editor contains four tabs: lesson theory, learning objectives, hints, and verification rules.
- The system provides a live preview of Markdown content.
- Administrators can set the status of a lesson to draft or published.

### 2.3 Feature 3: Access Control and User Management
- The system uses token-based authentication with JSON Web Tokens.
- Secure cookies protect authentication tokens against cross-site scripting.
- The system separates user permissions into Learner and Administrator roles.
- Role-based access control operates at the database, API, and user interface layers.
- Administrators can promote, demote, or lock user accounts.
- The system rejects locked accounts immediately with HTTP 403.

### 2.4 Feature 4: System Observability and Activity Dashboard
- The activity dashboard shows system health, active sessions, and completion rates.
- The layout fills the screen and prevents unnecessary page scrolling.
- Administrators can stop suspicious student sessions immediately.
- The system records all administrative actions in an immutable audit log.
- A Prometheus endpoint collects performance metrics.
- A Grafana dashboard visualizes system activity.

### 2.5 Feature 5: Concurrency Control and Admission Queue
- A rate limiter blocks excessive requests from single IP addresses and accounts.
- A session mutex allows only one active command per student session.
- An admission queue limits execution to four concurrent jobs.
- The queue holds a maximum of 32 pending requests.
- The system cancels requests that wait longer than 5.0 seconds.
- When the queue is full, the system returns HTTP 503 to protect system resources.

---

## 3. Advanced Functionalities

### 3.1 Performance Optimization
- **Token Cache in Memory:**
  The backend caches verified tokens for 60 seconds.
  This cache reduces authentication latency from 350 ms to less than 0.5 ms.
  This mechanism eliminates 99.8 percent of external network requests.
- **Warm Container Reuse:**
  The system keeps a hardened runner container active.
  The system creates Bubblewrap sandboxes inside the active container.
  This method reduces startup latency from 2.0 seconds to less than 15 ms.
- **Responsive Layout Design:**
  The layout uses CSS Grid and Flexbox.
  The interface adjusts to mobile, tablet, and desktop screens without broken elements.
  The cumulative layout shift score is less than 0.05.

### 3.2 Stress Testing and Benchmarking
The project team tested the system under concurrent burst loads.
The benchmark evaluated four concurrency levels:

| Concurrency Level | Total Requests | Success Rate | Throughput | Median Latency (p50) | 95th Percentile (p95) | System Behavior |
|:---:|:---:|:---:|:---:|:---:|:---:|---|
| **C = 10** | 10 | **100%** | **7.5 req/s** | **988 ms** | 1,421 ms | Normal operation with immediate admission |
| **C = 20** | 20 | **100%** | **7.4 req/s** | **1,649 ms** | 2,710 ms | Stable distribution across four workers |
| **C = 30** | 30 | Active Protection | 5.8 req/s | 2,120 ms | 4,890 ms | Rejection of requests waiting over 5.0 s |
| **C = 50** | 50 | Backpressure | 5.1 req/s | 2,450 ms | 5,000 ms | Return of HTTP 503 when queue exceeds 32 |

- **Resource Consumption During Peak Load:**
  The runner CPU reached 117.8 percent of 200 percent maximum capacity.
  The runner memory peaked at 24.6 MiB of 512 MiB maximum capacity.
  The system showed zero memory leaks during all test runs.

### 3.3 Penetration Testing and Security Verification
The security suite tested 24 attack vectors.
The system passed all 24 tests (100 percent pass rate):

1. **Horizontal Session Isolation:**
   Unauthorized session access returns HTTP 404.
   This response prevents attackers from identifying valid session IDs.
2. **Vertical Privilege Control:**
   Learner requests to administrator endpoints return HTTP 403.
3. **Locked Account Enforcement:**
   Locked accounts cannot execute commands even with a valid token.
4. **Sandbox Escape Prevention:**
   The root directory and `/usr` are read-only.
   The `/etc/shadow` file is masked and cannot be read.
   The sandbox isolates network namespaces and allows only loopback traffic.
5. **Denial of Service Prevention:**
   The container limits process counts to 128 to block fork bombs.
   The file size limit is 10 MiB to prevent disk-filling attacks.
   The system locks workspaces that exceed 30 MiB or 100 files.

### 3.4 Service Orchestration and Request Logging
- **Single-Command Startup:**
  The `start.sh` script starts all services in the correct sequence.
  The sequence starts the runner container, monitoring tools, API, and frontend.
- **Standard Request Logs:**
  The logger displays HTTP requests in plain text without complex formatting.
  Each line shows the timestamp, source, method, path, status, and duration.
  Error responses display the error code to help debugging.

---

## 4. Test Verification Evidence

All detailed reports and test logs are in `docs/audit_benchmark_pentest/`:

| Test Category | Test Tool | Test Count | Result | Reference Document |
|---|---|:---:|:---:|---|
| **Backend Tests** | Node.js Test Runner | 74 tests | **74 Passed** | `tests/*.test.js` |
| **Penetration Tests** | Custom Security Harness | 24 tests | **24 Passed** | `01_MASTER_BENCHMARK_AND_PENTEST_REPORT.md` |
| **OWASP ASVS 5.0** | Security Checklist | Full suite | **Compliant** | `03_OWASP_ASVS5_SECURITY_RETEST.md` |
| **Stress Benchmark** | Custom Benchmark Script | C = 10 to 50 | **7.5 req/s** | `02_BACKEND_API_BENCHMARK_PENTEST_REPORT.md` |
| **E2E Browser Tests** | Playwright Chromium | 26 tests | **26 Passed** | `frontend/tests/e2e/specs/` |

---

## 5. Quick Start Instructions

### 5.1 Start the System
Run the start script from the repository root:
```bash
./start.sh
```

To run all services in the background:
```bash
./start.sh -d
```

To check service status:
```bash
./start.sh status
```

To stop all services:
```bash
./start.sh stop
```

### 5.2 Test Accounts

| Role | Email | Password | Access Level |
|---|---|---|---|
| **Administrator** | `admin@bashlab.local` | `BashLab2026!` | Management: `/admin`, Content Studio, Users, Activity |
| **Learner** | `learner@bashlab.local` | `BashLab2026!` | Student: `/courses`, Terminal Sandbox, My Learning |

Web Application URL: `http://localhost:3000`
