# BashLab backend — chạy và kiểm thử

Backend demo chạy **một Node process trên Linux** và **một runner `bashlab-box`**.
Đã triển khai từ `sandbox_architecture_design.md` và `../docs/master_project_handbook.md`.
Frontend chưa được đấu nối trong thay đổi này; có thể gọi API ngay bằng fetch/curl.

## 1. Khởi động

Cần Node.js >=22, npm, Docker CLI + Buildx, Python 3 trên host, `findmnt`,
`realpath`, kernel hỗ trợ unprivileged user namespaces. Với Podman cần cả
Podman CLI và Docker-compatible socket đang hoạt động.

```bash
cd backend
npm ci
npm run runner:start
npm start
```

API mặc định: `http://127.0.0.1:3001`. `npm start` chạy probe Bubblewrap thật trước
khi mở cổng. Khi `bashlab-box` đã chạy, chỉ cần `npm start`; script tạo runner
không tự xóa container có sẵn.

**Quyền filesystem phải đúng ngay từ đầu:** file do student tạo phải có cùng
UID trên host với tiến trình Node. Startup kiểm tra điều này bằng file thật.

- **Podman rootless:** script tự dùng `keep-id:uid=10001,gid=10001` qua Podman
  client kết nối cùng socket với Docker CLI. UID trong container vẫn là 10001;
  UID trên host là user hiện tại. Node chạy bằng user hiện tại.
- **Docker rootful không userns-remap:** chạy cả startup và Node bằng một tài khoản
  host riêng có UID 10001, quyền ghi workspace và quyền dùng Docker. Ví dụ quản
  trị viên tạo tài khoản `bashlab` UID 10001, thêm vào nhóm `docker`, đặt checkout
  ở thư mục tài khoản này truy cập được, rồi đăng nhập tài khoản đó để chạy các
  lệnh trên. Nếu UID 10001 đã tồn tại, sử dụng tài khoản phù hợp; không tạo trùng.
- **Docker rootless hoặc userns-remap khác:** cấu hình mapping để UID host của
  runner và backend trùng nhau. Script sẽ dừng nếu probe cho thấy không khớp.
  Shared group đơn thuần không đủ cho bài tập có `chmod` hoặc `umask` chặt.

Workspace mặc định `/var/tmp/bashlab/workspaces` phải nằm trên filesystem có
backing store trên đĩa. Script từ chối tmpfs; nó không xác định phần cứng có phải
SSD hay không. Có thể đặt `WORKSPACE_ROOT` sang phân vùng SSD khác, nhưng phải
đặt cùng giá trị khi chạy script và Node. Bên trong runner luôn là đường dẫn
`/var/tmp/bashlab/workspaces`.

Cấu hình container: read-only root, network none, cap-drop ALL,
no-new-privileges, 512 MiB RAM, swap thêm bằng 0, 2 CPUs, pids-limit 128.
Bản demo dùng `seccomp=unconfined`, `apparmor=unconfined` để cho phép setup
nested namespaces; không cấp `--privileged` hay `SYS_ADMIN`. Có thể thay bằng
profile đã kiểm thử qua `BASHLAB_SECCOMP_PROFILE` và `BASHLAB_APPARMOR_PROFILE`.
Docker cần bỏ mask system paths; Podman bỏ mask `/proc/*` để mount procfs của
PID namespace con. Đây là cấu hình phục vụ demo local, chưa phải profile triển
khai public. Tham khảo [Docker seccomp](https://docs.docker.com/engine/security/seccomp/),
[BuildKit rootless: proc masking](https://github.com/moby/buildkit/blob/master/docs/rootless.md)
và [Podman run](https://docs.podman.io/en/stable/markdown/podman-run.1.html).

## 2. API

Session UUID là bearer capability của bản demo: giữ kín ID. Bản này chưa có
đăng nhập/ownership theo tài khoản. Bind loopback mặc định; CORS không thay thế
authentication. Chỉ chạy một API process trên một workspace root.

| Method | Endpoint | Body / kết quả |
|---|---|---|
| GET | `/health` | Liveness API |
| GET | `/metrics` | CPU/RSS API, số session/job; chỉ loopback |
| POST | `/api/sessions` | `{}` → `sessionId`, `cwd`, `lastActiveAt`, `commandCount` |
| GET | `/api/sessions/:id` | Trạng thái phiên |
| POST | `/api/sessions/:id/execute` | `{ "command": "mkdir demo; cd demo; pwd" }` |
| POST | `/api/sessions/:id/check` | `{ "lessonId": "files-03" }` |
| POST | `/api/sessions/:id/reset` | `{}`; dọn dữ liệu và đặt CWD về home |
| DELETE | `/api/sessions/:id` | Xóa phiên; HTTP 204 |

Ví dụ end-to-end (Node 22, không cần jq):

```bash
node --input-type=module <<'JS'
const base = 'http://127.0.0.1:3001/api/sessions';
const post = async (url, body = {}) => {
  const response = await fetch(url, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)});
  const result = await response.json();
  if (!response.ok) throw new Error(JSON.stringify(result));
  return result;
};
const {sessionId} = await post(base);
try {
  console.log(await post(`${base}/${sessionId}/execute`, {command: 'mkdir demo; cd demo; printf "Hello BashLab\\n" > README.md; pwd'}));
  console.log(await post(`${base}/${sessionId}/execute`, {command: 'pwd'}));
  console.log(await post(`${base}/${sessionId}/check`, {lessonId: 'files-03'}));
} finally { await fetch(`${base}/${sessionId}`, {method: 'DELETE'}); }
JS
```

Hai bộ rule phía server: `files-03` kiểm tra `demo/` và nội dung
`demo/README.md`; `hello-bashlab` kiểm tra `README.md` ngay tại home.
Verifier mở từng thành phần qua directory FD với `O_NOFOLLOW`, không follow
symlink, không đọc FIFO, không chạy shell, không nhận path/regex từ client.

Response execute có `stdout`, `stderr`, `exitCode`, `cwd`, `cwdUpdated`,
`outputTruncated`, `termination`, `queueWaitMs`, `executionMs`, `quota`.
`executionMs` bao gồm Docker transport/helper/cleanup; không phải chỉ CPU time
của Bash. `termination`: `completed`, `timeout` (exit 124), `output_limit`
(exit 137). `completed` vẫn có thể có exitCode khác 0 do lệnh học viên.
Helper nội bộ còn có `runner_error`; API chuyển lỗi chưa xác nhận cleanup
thành HTTP 503 và khóa phiên để không chạy/check/reset trên trạng thái bất định.

- HTTP 400: payload/lesson không hợp lệ; command tối đa 8192 byte UTF-8.
- HTTP 404: session không tồn tại/hết hạn.
- HTTP 409: phiên đang có execute/check/reset/delete; client đợi rồi gửi lại.
- HTTP 413: quota/permissions workspace hoặc body quá lớn.
- HTTP 429: quá 30 requests/phút/IP hoặc hàng đợi đầy.
- HTTP 503: chờ queue quá 5s, lỗi runner, hoặc phiên bị quarantine.

Rate limit áp dụng toàn bộ `/api`, không tin `X-Forwarded-For`. Quá quota sau
lệnh vẫn trả output với `quotaExceeded: true`; các lệnh kế tiếp bị chặn đến khi
Reset. Reset khôi phục quyền traverse thư mục bằng UID sở hữu trước khi xóa.

## 3. Helper và vòng đời

`runner/run-job` được COPY thành `/opt/bashlab/run-job`; `wrap.sh` là wrapper
Bash. Helper nhận JSON stdin, dựng pipe FD 3 cho CWD, một pipe riêng cho trạng
thái tin cậy của bwrap, và memfd read-only chứa command. Stdin Bash là `/dev/null`.
Timeout 3.0s dùng monotonic clock trong container, gửi SIGKILL tới process group;
`--die-with-parent` và Bash PID 1 trong namespace giúp thu hồi cả hậu duệ.
Helper làm subreaper, đợi descendant exit và drain pipe trước khi trả JSON.
Thời gian HTTP có thể dài hơn 3s do queue, Docker và cleanup.

Giới hạn stdout + stderr gộp 65536 byte, dừng job khi vượt và tiếp tục drain/discard.
Byte UTF-8 không hợp lệ bị bỏ khi chuyển sang JSON text, tránh phình output do
ký tự thay thế. FD CWD/status có buffer riêng giới hạn nhỏ. Mã lệnh được nạp qua
file; không nội suy vào lệnh shell của host.

CWD lấy bằng `pwd -P` qua EXIT trap, kể cả `exit 7`. `exec`, thay trap hoặc đóng
FD 3 có thể không gửi CWD: khi đó `cwdUpdated=false` và giữ giá trị trước. Nếu
CWD cũ không còn tồn tại, lệnh sau bắt đầu lại ở `/home/student`.

System read-only; chỉ `home/` và `tmp/` của phiên được bind writable từ đĩa.
Network/user/PID namespaces riêng, cấm tạo thêm user namespace. Đây là shell
chạy theo request, không có PTY: `nano` được cài nhưng không có phiên editor
interactive trên API này. Biến shell/functions không tồn tại qua request.

Quota 30 MiB / 100 **entries** tính cả home và tmp, directory và symlink;
không follow symlink, dùng giá trị lớn hơn giữa logical file size và allocated
blocks. Đây là quota ứng dụng trước/sau lệnh; giới hạn một file 10 MiB bằng
RLIMIT_FSIZE không phải hard quota tổng đĩa. SSD vẫn dùng RAM cho page cache.

Reaper quét mỗi 5 phút, xóa phiên idle quá 30 phút; bỏ qua phiên busy/quarantined.
Sau API restart, session memory mất: thư mục UUID cũ được ghi nhận thành orphan,
không nhận request bằng ID cũ, và dọn sau 30 phút kể từ lúc phát hiện.
Với `RUNNER_UNCERTAIN`, dừng runner rồi restart runner và API để xác nhận không
còn tiến trình cũ; không cố reset khi helper chưa xác nhận kết thúc.

## 4. Kiểm thử và benchmark

```bash
npm test
npm run test:integration   # cần bashlab-box đang chạy
```

Benchmark chạy trong terminal khác, API được khởi động với rate limit đủ cao:

```bash
RATE_LIMIT_MAX=10000 npm start
# terminal khác, cũng ở backend/
npm run benchmark
```

Không chạy integration test đồng thời với benchmark. Script tạo 50 session,
warm-up runner, gửi lần lượt các burst 10/20/30/50 requests, mỗi mức 3 rounds,
rồi xóa session. Thay rounds bằng `BENCH_ROUNDS=5` (1–20). `BENCH_URL` mặc định
loopback:3001; script chỉ cho benchmark local. `BENCH_OUTPUT` mặc định
`benchmarks/latest.json`. CPU/RAM runner lấy từ Docker stats stream; API lấy từ
`/metrics`. Không dùng CPU/RAM của load generator để thay thế server.

Bảng Markdown in trực tiếp để copy vào slide: average, p50, p95, tổng throughput,
throughput thành công, runner CPU/RAM peak đã lấy mẫu, API CPU trung bình/RAM peak,
success rate. JSON lưu từng request, status, outcome và timestamp.

- p50/p95 dùng nearest-rank; latency bao gồm thời gian queue và request lỗi.
- req/s = tất cả response / thời gian; OK req/s chỉ tính exitCode 0/completed.
- Tải 50 có thể bị từ chối bởi giới hạn 4 active + 32 pending; báo đúng 429.
- CPU 100% tương ứng một core; thống kê runtime có thể dao động do cửa sổ lấy mẫu.
- Peak là cao nhất trong các mẫu, không khẳng định bắt được đỉnh tức thời.
- Không có mẫu hợp lệ thì in `N/A`, không điền số 0 giả.
- Đặt limit 10000 chỉ cho lần đo; khởi động lại API mặc định 30/min sau benchmark.

Các số “<3ms”, “0 RAM”, “p95=260ms” trong handbook là mục tiêu/minh họa trước
triển khai, không phải kết quả đo của code này. Dùng artifact benchmark thực tế
và ghi rõ máy/runtime/workload khi thuyết trình.

## 5. Cấu trúc và biến môi trường

| File | Vai trò |
|---|---|
| `Dockerfile.runner` | Ubuntu 24.04 + student UID 10001 + công cụ |
| `scripts/start-runner.sh` | Build/load image, cấu hình container, probe và ownership |
| `runner/run-job`, `runner/wrap.sh` | Namespace, timeout/output, FD metadata, cleanup |
| `src/server.js` | Express, validation, rate limit, API, startup probe |
| `src/services/sessionManager.js` | Map, khóa phiên, CWD, quota, reset/orphan |
| `src/services/sandboxRunner.js` | p-limit(4), bounded admission, Docker transport |
| `src/services/reaperService.js` | TTL và quét không chồng nhau |
| `src/services/taskVerifier.js` | Rule server-owned, directory FD + O_NOFOLLOW |
| `tests/benchmark.js` | Burst workload, telemetry, Markdown và JSON |

`PORT=3001`, `HOST=127.0.0.1`, `RATE_LIMIT_MAX=30`,
`WORKSPACE_ROOT=/var/tmp/bashlab/workspaces`, `RUNNER_CONTAINER=bashlab-box`,
`RUNNER_IMAGE=bashlab-runner:local`,
`CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000`.
Biến được đọc từ environment; không tự nạp `.env`.

Để rebuild runner sau thay đổi helper, dừng API, rồi:

```bash
docker stop bashlab-box
docker rm bashlab-box
npm run runner:start
npm start
```

Script không thay đổi sysctl/LSM toàn host. Nếu probe thất bại, nó dừng runner
và báo lỗi. Sửa namespace policy hoặc mapping trên máy đích, không bỏ qua probe.

Kết quả đã đo trong workspace này: [bảng để copy vào slide](benchmarks/RESULTS.md)
và [raw JSON](benchmarks/latest.json). 10 unit/API tests và 8 integration tests
với runner thật đã được chạy; npm audit báo 0 vulnerabilities tại thời điểm kiểm tra.
