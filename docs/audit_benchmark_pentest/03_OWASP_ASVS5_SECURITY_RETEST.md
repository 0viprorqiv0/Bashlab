# BashLab Backend — OWASP ASVS 5.0 / Top 10 / API Security Retest

**Ngày kiểm thử:** 2026-10-03 (Asia/Bangkok)  
**Repository:** `Documents/B3/web_app/Bashlab`  
**Backend commit:** `13daee42080e39e415aafba92be5a8e9bec469c2`  
**Phạm vi:** Express backend API, Supabase auth/data integration, sandbox session lifecycle, runner/container boundary, metrics, rate limiting, input validation, dependency/configuration review.  
**Chuẩn tham chiếu:** OWASP ASVS 5.0.0, OWASP Top 10:2025, OWASP API Security Top 10:2023.

> Đây là một đợt **OWASP-aligned scoped verification**, không phải chứng nhận chính thức của OWASP và không phải full attestation 345 requirements của ASVS. Các yêu cầu phụ thuộc production edge/TLS/Supabase project policy mà không thể xác minh từ repo được ghi **NOT VERIFIED**, không tự suy diễn thành PASS.

## 1. Executive summary

Backend có nhiều security control hoạt động đúng và dynamic pentest trực tiếp đạt kết quả tốt:

- **74/74** unit/API tests pass.
- **8/8** real runner integration tests pass.
- **6/6** adversarial stress gates pass.
- **24/24** authenticated penetration-test checks pass.
- **npm audit --audit-level=low: 0 vulnerabilities**.
- Cross-user session access, vertical privilege escalation, forged JWT, SQLi-shaped UUID input, oversized body, CPU/memory/output abuse, filesystem tampering và rate-limit flooding đều bị chặn trong các bài test đã chạy.

Tuy nhiên, trạng thái **không đạt để tuyên bố OWASP compliant / production-ready** vì có các failure tái hiện được ở lifecycle, deployment boundary và ASVS requirements:

1. Lease lifecycle leak: 100 create+delete khác user làm đầy 100 lease; user 101 nhận HTTP 503.
2. Default bind là `0.0.0.0`; khi không có `METRICS_TOKEN`, `/metrics` trả HTTP 200 qua LAN.
3. Hai file secret thực tế `.env` và `backend/.env` có mode `0664`.
4. Workspace quota 30 MiB là post-check mềm; command tạo ~46 MiB trước khi bị đánh dấu quotaExceeded.
5. Runner vẫn `seccomp=unconfined` và `apparmor=unconfined`.
6. Lesson switch thay lesson trên API nhưng practice-session bookkeeping vẫn giữ record lesson cũ.
7. Reaper xóa sandbox session nhưng lease vẫn `ACTIVE`.
8. Command Prometheus histogram vẫn không hợp lệ: bucket có thể lớn hơn tổng count.
9. Auth verification cache cho phép cửa sổ revoke/lock trễ tối đa 60 giây trên các endpoint chỉ dùng `requireAuth`.
10. Last-active-admin invariant có TOCTOU/race risk vì count-check và update không được serialize/lock.
11. Runner image `FROM ubuntu:24.04` chưa pin digest; image/package CVE scanning chưa có bằng chứng trong vòng này.
12. Refresh cookie không đáp ứng chính xác ASVS 5.0 V3.3.1 về cookie prefix; cookie là `bashlab_rt`, không dùng `__Secure-` hoặc `__Host-`.
13. Không có authenticated “change password” flow yêu cầu current + new password theo ASVS V6.2.2/V6.2.3; hiện chỉ có recovery reset.
14. Common-password/top-3000 rejection theo ASVS V6.2.4 chưa được xác minh từ Supabase project policy.

## 2. Test evidence

### 2.1 Unit/API tests

Command:

```bash
cd backend
npm test
```

Result: **74 pass / 0 fail**.

Coverage gồm:

- explicit fail-closed auth composition;
- authentication required;
- cross-user session ownership isolation;
- admin-only endpoints;
- session reuse/switch;
- IP/account rate limiting;
- locked-user/admin checks;
- login enumeration resistance;
- password recovery/reset;
- CSRF Origin validation;
- profile mass-assignment whitelist;
- malformed/oversized body rejection;
- CORS allowlist;
- content/admin authorization;
- progress ownership;
- security headers;
- metrics cardinality/escaping;
- queue admission;
- quota/reset;
- symlink-resistant verifier;
- reaper/orphan cleanup.

### 2.2 Runner integration

```bash
npm run test:integration
```

Result: **8 pass / 0 fail**.

Verified on real runner:

- cwd/exit status;
- stdin isolation;
- read-only system mounts;
- hard execution deadline;
- background-child cleanup;
- combined output cap;
- invalid UTF-8 handling;
- trusted diagnostic channel;
- loopback-only network namespace;
- RLIMIT_FSIZE 10 MiB.

### 2.3 Adversarial stress suite

Temporary loopback-only unauth benchmark instance, then:

```bash
TARGET_URL=http://127.0.0.1:39031 node tests/stress_attack_sim.js
```

Result: **6/6 defensive gates pass**:

- infinite CPU loop → timeout/exit 124;
- 25 MiB single-file disk bomb → RLIMIT_FSIZE blocked;
- 600 MiB allocation → memory boundary blocked;
- 10 parallel commands in one session → 9 rejected with 409 SESSION_BUSY;
- `touch /bin/evil` → read-only root filesystem blocked;
- 35-request flood → HTTP 429 + Retry-After.

The script's printed phrase “ZERO LEAKS” is **not** treated as evidence; independent lifecycle tests below contradict it.

### 2.4 Authenticated pentest

Controlled test created four unique temporary Supabase audit users and removed them in teardown.

Result: **24/24 pass**.

Verified:

- unauthenticated admin endpoint → 401;
- learner → admin routes → 403;
- real admin dashboard → 200;
- forged JWT → 401;
- horizontal session read/execute/delete → 404;
- peer active-session isolation;
- root filesystem writes blocked;
- `/etc/shadow` unavailable;
- traversal does not expose host workspaces;
- sudo/su escalation blocked;
- outbound network attempt blocked in runner environment;
- CPU timeout;
- single-file storage boundary;
- output truncation;
- session mutex;
- oversized JSON → 413;
- SQLi-shaped lessonId → 400 INVALID_INPUT;
- malformed command type → 400;
- locked user → 403 ACCOUNT_LOCKED;
- loopback metrics access behaves as configured.

### 2.5 Dependency review

```bash
npm audit --audit-level=low
```

Result: **0 known npm advisory vulnerabilities**.

This does **not** cover Ubuntu base image, kernel, Podman/Docker engine or OS package CVEs.

## 3. Independent failure reproductions

### F-01 — HIGH — Lease lifecycle exhaustion

Controlled in-memory/API reproduction:

- create session for 100 distinct users;
- delete each session successfully;
- inspect lease store;
- create user 101 session.

Observed:

```text
leases_after_100_deletes=100
user_101_create_status=503
user_101_body={"error":{"code":"LEASE_CAPACITY","message":"capacity"}}
```

Root cause: `cleanupStaleSession()` removes process-local indexes but does not transition the lease via `beginDeletion/finishDeletion`.

OWASP mapping: Top 10 A06 Insecure Design, A10 Mishandling of Exceptional Conditions; API4 Unrestricted Resource Consumption; ASVS V2/V15 architecture/business-logic concerns.

### F-02 — HIGH in exposed benchmark/unauth mode; MEDIUM otherwise — Default bind and LAN metrics exposure

Started server without `HOST` and without `METRICS_TOKEN`.

Observed:

```text
LISTEN 0 511 0.0.0.0:39033 0.0.0.0:*
GET http://<LAN-IP>:39033/metrics -> HTTP 200
```

`.env` currently does not define `HOST` or `METRICS_TOKEN`.

OWASP mapping: A02 Security Misconfiguration; API8 Security Misconfiguration; ASVS V13 Configuration.

### F-03 — HIGH on a multi-user/untrusted host — Secret-file permissions

Files containing the real service-role variable:

```text
664 ./.env
664 ./backend/.env
```

Both are ignored by Git, which is good, but group/other readability is inappropriate for a service-role credential on a multi-user host.

Recommended: `chmod 600`, use a secret manager for production, rotate if the host has been accessible by untrusted local users.

### F-04 — MEDIUM — Workspace quota is not a hard quota

Controlled command created five 9 MiB files.

Observed:

```text
du -sm . -> 46
quotaExceeded=true
quotaError="Workspace exceeds 30 MiB or 100 entries; reset the session"
```

The command completes before the post-run quota check. The 10 MiB per-file RLIMIT works, but aggregate 30 MiB quota can be transiently exceeded.

OWASP mapping: API4 Unrestricted Resource Consumption; A06/A10; ASVS V5/V15.

### F-05 — MEDIUM/HIGH depending threat model — Runner seccomp/AppArmor unconfined

Live container inspection:

```text
SecurityOpt=["no-new-privileges","seccomp=unconfined","apparmor=unconfined"]
Memory=536870912
NanoCpus=2000000000
PidsLimit=128
NetworkMode="none"
ReadonlyRootfs=true
```

Rootless engine, no-new-privileges, read-only root, network none and cgroup limits are strong controls. Public arbitrary-code execution still benefits materially from a restrictive seccomp/AppArmor profile.

### F-06 — MEDIUM — Lesson switch leaves stale practice-session bookkeeping

Observed:

```text
same_session=true
returned_lesson_after_switch=<lesson-2>
practice_record_calls=[["open","alice","<lesson-1>","<session>"]]
```

The API/session binding changes but the practice record remains tied to the old lesson.

### F-07 — MEDIUM — Reaper removes session but not lease

Observed:

```text
session_exists_after_reaper=false
lease_state_after_reaper=ACTIVE
```

This is another path feeding F-01.

### F-08 — MEDIUM — Command histogram is internally inconsistent

Four command samples were recorded. Result:

```text
...bucket{le="0.05"} 1
...bucket{le="0.25"} 4
...bucket{le="1"} 9
...bucket{le="5"} 19
...bucket{le="+Inf"} 4
..._count 4
```

A bucket count greater than `+Inf`/count is invalid. Current unit test named “histogram buckets are cumulative…” only exercises the HTTP histogram, not the command histogram.

Impact: command p95/dashboard observability is unreliable.

### F-09 — MEDIUM — Revocation/lock lag from auth cache

`requireAuth` caches a verified access token for 60 seconds. A token already in cache is accepted until TTL expires without re-checking Supabase ban/revocation state.

Admin role/lock checks re-query profile on admin routes, but learner endpoints that only depend on `requireAuth` retain this window.

OWASP mapping: A07 Authentication Failures; API2 Broken Authentication; ASVS V7 Session Management.

### F-10 — MEDIUM — Last-active-admin invariant is not atomic

The SQL RPC:

1. counts other active admins;
2. then updates the target.

There is no explicit locking/serialization around the invariant. Two concurrent actions against the last two active admins can both observe another admin before both writes commit.

OWASP mapping: A01/A06; ASVS V15.4 safe concurrency / TOCTOU.

### F-11 — MEDIUM — Supply-chain reproducibility gap

`Dockerfile.runner` begins with:

```dockerfile
FROM ubuntu:24.04
```

Node dependencies have a package-lock and npm audit is clean, but runner base image is not pinned by digest and no image CVE scan was verified.

OWASP mapping: A03 Software Supply Chain Failures; A08 Software or Data Integrity Failures; ASVS V15.2.

## 4. ASVS 5.0 scoped matrix

Status meanings:

- **PASS**: direct test and/or strong code evidence.
- **FAIL**: a relevant requirement/control is demonstrably not met.
- **PARTIAL**: meaningful controls exist but coverage or requirement satisfaction is incomplete.
- **NOT VERIFIED**: requires production/provider configuration not available from this repo.
- **N/A**: feature is not implemented.

| ASVS chapter | Status | Evidence / gap |
|---|---|---|
| V1 Encoding and Sanitization | PASS (scoped) | SQLi-shaped UUID rejected; no `eval()`; fixed argv for Docker transport; PromQL/range is allowlisted; JSON body validation exists. |
| V2 Validation and Business Logic | **FAIL** | Lease leak, lesson-switch state mismatch, non-atomic last-admin invariant. |
| V3 Web Frontend Security | **FAIL / PARTIAL** | CORS allowlist, CSP/Helmet, CSRF Origin and HttpOnly/SameSite are strong. **V3.3.1 is not met**: refresh cookie is named `bashlab_rt`, not `__Secure-...`/`__Host-...`; Secure is conditional on production/config. |
| V4 API and Web Service | PASS/PARTIAL | JSON API content types and input/body controls verified; GraphQL/WebSocket are N/A. HTTP edge/request-smuggling behavior is primarily Node/reverse-proxy responsibility and was not exhaustively assessed. |
| V5 File Handling | **FAIL / PARTIAL** | Symlink/path verifier and per-file RLIMIT pass; aggregate workspace quota can overshoot 30 MiB before detection. |
| V6 Authentication | **FAIL / PARTIAL** | Rate limiting, anti-enumeration, reset recovery token, locked-user handling pass. Password length >=8 satisfies V6.2.1. **V6.2.2/V6.2.3 gap:** no current+new authenticated password-change flow. **V6.2.4 NOT VERIFIED:** common-password/top-3000 policy depends on Supabase project configuration. |
| V7 Session Management | **FAIL / PARTIAL** | Refresh token HttpOnly + scoped cookie and logout exist; 60s access-token verification cache creates revocation/lock lag. |
| V8 Authorization | PASS (scoped) | BOLA/BFLA dynamic checks pass; admin routes, ownership, profile field whitelist and RLS/write centralization verified. |
| V9 Self-contained Tokens | PASS/PARTIAL | Forged JWT rejected through Supabase `getUser`; refresh token not returned in response body. Token/provider crypto config itself is external. |
| V10 OAuth/OIDC | N/A | No application OAuth/OIDC flow was in assessed backend surface. |
| V11 Cryptography | NOT VERIFIED / provider-managed | Password hashing, JWT signing and core auth crypto are delegated to Supabase; provider/project crypto policy was not independently attested. |
| V12 Secure Communication | NOT VERIFIED | Local API test is HTTP; production TLS termination/certificates/proxy config are outside this repo snapshot. |
| V13 Configuration | **FAIL** | Default `0.0.0.0`, metrics LAN fallback, secret mode 0664, unconfined seccomp/AppArmor. |
| V14 Data Protection | PARTIAL | Tokens are not put in URLs by backend; refresh token is HttpOnly; actual service-role secret file permissions need remediation. |
| V15 Secure Coding and Architecture | **FAIL / PARTIAL** | Good sandbox/resource boundaries and package lock; lease/state design, TOCTOU and unpinned runner image remain. |
| V16 Security Logging and Error Handling | PARTIAL | Generic 500 response and no stack leak pass; admin actions have DB audit rows and auth outcomes are counted in metrics. Detailed durable security-event logging/forensics and separate protected log pipeline were not verified. |
| V17 WebRTC | N/A | No WebRTC feature. |

### Explicit ASVS requirement observations

- **V3.3.1 (L1): FAIL** — ASVS requires Secure cookies and a `__Secure-` prefix unless `__Host-` is used. Current refresh cookie is `bashlab_rt`.
- **V3.4.2 (L1): PASS** — CORS origin is fixed/allowlisted.
- **V4.1.1 (L1): PASS scoped** — API responses use appropriate JSON/text content types in tested routes.
- **V6.1.1 (L1): PASS/PARTIAL** — rate-limiting behavior is implemented and documented in backend docs/tests.
- **V6.2.1 (L1): PASS** — password minimum is 8 characters.
- **V6.2.2 (L1): FAIL** — no normal authenticated password-change feature.
- **V6.2.3 (L1): FAIL** — no change-password flow requiring current + new password.
- **V6.2.4 (L1): NOT VERIFIED** — app code does not implement a common-password/top-3000 check; Supabase project policy was not available for attestation.
- **V6.2.5 (L1): PASS** — app does not impose composition-class requirements; it uses length constraints.

## 5. OWASP Top 10:2025 mapping

| Category | Status | Notes |
|---|---|---|
| A01 Broken Access Control | PASS/PARTIAL | Dynamic BOLA/BFLA checks are strong; last-admin concurrency invariant remains. |
| A02 Security Misconfiguration | **FAIL** | Default public bind, LAN metrics fallback, secret permissions, unconfined seccomp/AppArmor. |
| A03 Software Supply Chain Failures | **PARTIAL/FAIL** | npm lock/audit good; runner base image not digest-pinned and no image CVE evidence. |
| A04 Cryptographic Failures | NOT VERIFIED/PARTIAL | Crypto is largely Supabase/TLS-edge managed; provider and production transport policy not independently verified. |
| A05 Injection | PASS (assessed contexts) | SQLi-shaped input rejected; no eval; fixed host process argv; PromQL allowlist. Intentional Bash execution is sandboxed. |
| A06 Insecure Design | **FAIL** | Lease lifecycle, quota semantics, stale bookkeeping and last-admin race. |
| A07 Authentication Failures | **PARTIAL/FAIL** | Strong auth tests, brute-force controls and recovery flow; revocation cache window + ASVS password-change gaps. |
| A08 Software or Data Integrity Failures | PARTIAL | Git/package lock hygiene good; runner image reproducibility/verification incomplete. |
| A09 Security Logging and Alerting Failures | PARTIAL | Metrics/admin logs exist; durable structured security logs and operational alert pipeline not verified; command histogram is incorrect. |
| A10 Mishandling of Exceptional Conditions | **FAIL** | Lease cleanup/reaper state and soft quota show incorrect exceptional/lifecycle outcomes. |

## 6. OWASP API Security Top 10:2023 mapping

| API risk | Status | Evidence |
|---|---|---|
| API1 Broken Object Level Authorization | **PASS** | Peer session read/execute/delete all return 404; own-resource progress tests pass. |
| API2 Broken Authentication | PARTIAL | Forged JWT and locked users rejected; 60s auth cache window and password-change compliance gaps remain. |
| API3 Broken Object Property Level Authorization | **PASS scoped** | Strict profile/content whitelists; role/is_locked not profile-writable. |
| API4 Unrestricted Resource Consumption | **FAIL** | CPU/memory/file/output/queue controls pass, but aggregate quota overshoots and lease churn can exhaust capacity. |
| API5 Broken Function Level Authorization | **PASS** | Learner cannot access admin courses/users/dashboard; genuine admin succeeds. |
| API6 Unrestricted Access to Sensitive Business Flows | PARTIAL/N/A | Relevant admin/auth flows are rate-limited and authorized; no commerce-style flow. State invariants still need atomicity. |
| API7 SSRF | **PASS scoped** | No user-controlled backend URL fetch found; Prometheus base URL is configuration-controlled and query/range are server allowlists. |
| API8 Security Misconfiguration | **FAIL** | Same deployment/config failures as A02. |
| API9 Improper Inventory Management | PARTIAL | API contract and route tests exist; production host/version inventory and deprecated endpoint inventory not independently verified. |
| API10 Unsafe Consumption of APIs | PARTIAL | Supabase errors are normalized; Prometheus has timeout/fallback; comprehensive upstream schema/trust policy was not attested. |

## 7. Priority remediation

### P0 — before public Internet exposure

1. Wire lease deletion into **all** lifecycle paths: user DELETE, reaper, admin stop, startup/orphan cleanup; add create/delete churn regression.
2. Default `HOST=127.0.0.1`; fail startup for unauth sandbox on non-loopback.
3. Require `METRICS_TOKEN` for production/non-loopback; do not treat RFC1918/private IP as authentication.
4. `chmod 600 .env backend/.env`; prefer a production secret manager.
5. Implement a **hard** aggregate workspace disk/inode boundary.
6. Add restrictive seccomp/AppArmor profile for runner.

### P1 — ASVS / acceptance gate

1. Fix lesson-switch practice record/lease lesson binding.
2. Fix command Prometheus histogram and add command-histogram regression test.
3. Serialize last-active-admin invariant in DB transaction/lock/advisory lock.
4. Reduce/invalidate auth cache on revoke/lock or use a revocation-aware cache strategy.
5. Rename refresh cookie to `__Secure-bashlab_rt` (or adopt `__Host-` with compatible Path requirements) and enforce Secure in deployed HTTPS environment.
6. Add authenticated password-change flow requiring current + new password, while keeping recovery reset separate.
7. Verify/enable Supabase common/leaked-password policy meeting ASVS V6.2.4.
8. Pin runner image digest and add image/SBOM CVE scan in CI.

### P2 — logging and deployment assurance

1. Define security-log inventory and durable structured auth/authorization/security-control events.
2. Verify production HTTPS/TLS/HSTS/proxy settings separately from local app tests.
3. Verify production rate limiting when deployed behind a trusted reverse proxy.
4. Add periodic OWASP ASVS scoped regression checklist to CI/release process.

## 8. Recommended release gate

Do **not** use a single “pentest pass rate” as the release criterion.

Recommended gate:

- all P0 closed;
- `npm test` and runner integration green;
- adversarial suite green;
- authenticated pentest green;
- lifecycle/quota negative reproductions converted into regression tests and green;
- OWASP Top 10 / API Top 10 table has no unresolved **FAIL** for applicable production controls;
- selected ASVS L1 backend/API requirements each have evidence, with provider/deployment controls separately attested.

## 9. Final status

**Direct attack defenses:** strong in the tested paths.  
**OWASP Top 10 / API Top 10 readiness:** partial; multiple applicable failures remain.  
**OWASP ASVS 5.0:** **not compliant as currently evidenced**, with explicit L1 gaps (notably V3.3.1, V6.2.2, V6.2.3 and V6.2.4 not verified) plus architecture/configuration failures.

The backend should be considered suitable for controlled development/testing, but **not yet ready for an “OWASP compliant” production claim** until P0/P1 items are remediated and retested.

## 10. References

- OWASP ASVS 5.0.0: https://github.com/OWASP/ASVS/releases/tag/v5.0.0_release
- OWASP ASVS project: https://owasp.org/www-project-application-security-verification-standard/
- OWASP Top 10:2025: https://top10.owasp.org/2025/
- OWASP API Security Top 10:2023: https://api-security.owasp.org/editions/2023/en/0x11-t10/
