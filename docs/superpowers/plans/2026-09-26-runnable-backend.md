# Runnable BashLab backend implementation plan

Goal: implement the approved sandbox architecture and a measurable local demo.
Spec: backend/sandbox_architecture_design.md and docs/master_project_handbook.md.
Architecture: one Ubuntu runner; isolated Bubblewrap per command; Node session locks,
bounded admission, filesystem verifier, reaper and HTTP benchmark.

- [x] Add behavioral tests for session exclusion, quotas, verifier, queue and API.
- [x] Implement runner image, startup probe, FD metadata, bounded output and process cleanup.
- [x] Implement session lifecycle, queue, verifier and Express endpoints.
- [x] Implement benchmark with actual runner CPU/RAM samples and HTTP failure counts.
- [x] Run unit tests, build runner, execute integration tests and benchmark.
- [x] Document startup commands, API, measured results and remaining platform constraints.

Limits: 512 MiB / 2 CPUs / 128 PIDs runner; execution 3 s; combined output
64 KiB; file size 10 MiB; workspace 30 MiB / 100 entries; 4 running + 32
pending; queue deadline 5 s; IP limit 30/min; idle TTL 30 min, scan 5 min.
Tests exercise real temporary workspaces and a real local runner. Transport
injection is restricted to queue/API tests; integration has no shell fallback.
