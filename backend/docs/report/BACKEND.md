# BashLab — Backend

> Mã nguồn: `backend/`. **Node.js ≥ 22**, **Express 5**, `@supabase/supabase-js`, `helmet`, `cors`, `p-limit`; `run-job` (Python 3) chạy trong container. Khoảng 2.280 dòng JS trong `backend/src` (19 file) và 207 dòng Python (`runner/run-job`).

## 1. Cấu trúc mã nguồn
```
backend/
  src/
    server.js                 dựng app, route sandbox, /metrics, khởi động
    routes/auth.js            đăng ký, đăng nhập, phiên, hồ sơ
    routes/content.js         tiến độ, nộp flag, toàn bộ API quản trị
    middleware/auth.js        xác minh token (cache 60 giây), kiểm admin
    middleware/rateLimit.js   giới hạn tốc độ (cửa sổ cố định)
    services/                 authService, contentService, dashboardService, metrics,
                              sessionManager, sandboxRunner, sandboxLeaseStore,
                              reaperService, taskVerifier
    labs/catalog.js, seed.js  flag cố định mỗi lab + file mẫu ghi vào workspace
  runner/run-job, wrap.sh     chạy trong container: dựng Bubblewrap cho từng lệnh
  Dockerfile.runner           image runner (Ubuntu 24.04, user 10001)
  scripts/start-runner.sh     dựng container với giới hạn tài nguyên
  db/migrations/              001 → 018 (bảng, RLS, RPC, trigger, thu quyền)
  tests/                      test đơn vị/tích hợp, benchmark, tấn công mô phỏng
```

## 2. API (tổng hợp từ mã nguồn)
**Xác thực (`/api/auth`)** — mọi lỗi dịch sang mã rõ ràng, phản hồi trung lập để không lộ email nào tồn tại.
| Method | Đường dẫn | Ghi chú |
|---|---|---|
| POST | `/register`, `/login`, `/forgot-password`, `/resend-verification` | giới hạn theo IP; đăng nhập thêm giới hạn theo (IP, email) |
| POST | `/refresh`, `/session`, `/logout` | dùng cookie HttpOnly; **bắt buộc `Origin` hợp lệ** (chống CSRF) |
| POST | `/reset-password` | chỉ nhận token sinh từ link email (`amr = otp`), còn trong 60 phút, thu hồi mọi phiên sau khi đổi |
| GET/PATCH | `/me`, `/profile` | chỉ sửa được các cột cho phép (`name, bio, age, location, occupation, avatar_url`) |

**Học viên**
| Method | Đường dẫn | Ghi chú |
|---|---|---|
| PUT/DELETE | `/api/progress/:lessonId` | lab có flag thì **chặn đặt `done`** (403 `FLAG_REQUIRED`) |
| POST | `/api/labs/:lessonId/flag` | nộp flag; giới hạn 10 lần/phút/người; đúng thì **server** ghi `done` |
| POST | `/api/sessions` | mở sandbox (1 học viên = 1 session, xếp hàng theo người) |
| GET | `/api/sessions/active`, `/api/sessions/:id` | trạng thái phiên (chỉ chủ phiên) |
| POST | `/api/sessions/:id/execute`, `/reset` | chạy lệnh; xoá workspace và đặt lại file mẫu |
| DELETE | `/api/sessions/:id` | đóng phiên |

**Quản trị (`/api/admin`, kiểm vai trò ở mọi route)**: `GET /dashboard`; `POST/PATCH` khoá học, chương, bài; `POST /:kind/swap` (đổi thứ tự); `POST /users/:id/role`, `/users/:id/lock` (bắt buộc ghi lý do); `POST /sessions/:id/stop`.
**Vận hành**: `GET /health`, `GET /metrics` (mạng nội bộ, hoặc bắt buộc `METRICS_TOKEN` ở production).

## 3. Lớp bảo vệ trong request
Thứ tự: `helmet` → `cors` (chỉ origin trong danh sách) → ghi số liệu → giới hạn tốc độ → xác thực JWT → kiểm quyền → xử lý.
| Lớp | Giá trị mặc định |
|---|---|
| Body JSON | 16 KB (sandbox/auth); 512 KB cho nội dung admin; hồ sơ có avatar lớn hơn |
| Rate limit nhóm sandbox | `RATE_LIMIT_MAX` = 30/phút/IP |
| Rate limit auth | 300/phút/IP chung; 60/phút/IP nhóm nhạy cảm; **8/phút theo (IP, email)** khi đăng nhập |
| Rate limit nội dung/admin | 600/phút/IP và 300/phút/người dùng |
| Nộp flag | 10/phút/người dùng |
| Token | cache kết quả xác minh 60 giây (giảm tải Supabase) |
| Lỗi 500 | không lộ chi tiết, không lộ stack |

## 4. Sandbox — giới hạn tài nguyên
| Hạng mục | Giá trị | Nơi cài |
|---|---|---|
| Thời gian một lệnh | 3 giây (hết giờ thì giết cả cây tiến trình) | `run-job` |
| Output một lệnh | 64 KB | `run-job` |
| Kích thước một file | 10 MB (`RLIMIT_FSIZE`) | `run-job` |
| Workspace | 30 MB hoặc 100 mục (kiểm trước và sau mỗi lệnh) | `sessionManager.checkQuota` |
| Hàng đợi lệnh | 4 chạy · 32 chờ · chờ tối đa 5 giây (HTTP 429 khi đầy) | `sandboxRunner` |
| Lệnh song song trong 1 session | 1 (HTTP 409 `SESSION_BUSY`) | `sessionManager.acquire` |
| Session | 1 / học viên; tối đa 100 lease; 1000 session | `sandboxLeaseStore`, `sessionManager` |
| Dọn session bỏ quên | 30 phút không dùng; quét mỗi 5 phút | `reaperService` |
| Container | 512 MiB · 2 CPU · 128 PID · không mạng · root chỉ đọc | `start-runner.sh` |

Tính an toàn khi lỗi: nếu runner không xác nhận được lệnh đã kết thúc, session bị **cách ly** (`quarantined`, HTTP 503) thay vì đoán; có thể reset hoặc dọn.

## 5. Cơ chế flag (hoàn thành lab)
- `labs/catalog.js` chứa **một flag cố định cho mỗi lab** (13 lab đã công bố) và danh sách file mẫu. Flag **không bao giờ gửi xuống trình duyệt**.
- Khi mở lab, `labs/seed.js` ghi file mẫu vào `home/` của học viên với đúng quyền (ví dụ `check.sh` chạy được, `deploy.sh` ban đầu không chạy được); sau **Reset** thì ghi lại.
- Hai kiểu lab: **tìm flag** (ví dụ `ls -la` thấy file ẩn) và **làm rồi mới ra flag** (`./check.sh` chỉ in flag khi trạng thái đúng).
- Kiểm tra bằng `timingSafeEqual` trên hash SHA-256, giới hạn 10 lần/phút; đúng thì server ghi `progress = done`.

## 6. Cơ sở dữ liệu (Supabase / PostgreSQL)
- **7 bảng**, **18 migration**, 9 hàm (gồm 2 hàm của trigger; ví dụ `is_admin`, `admin_set_user_role`, `admin_set_user_lock`, `admin_list_users`, `admin_stop_session`, `get_course_progress`, `validate_lesson_content`, …) và 2 trigger (`on_auth_user_created` tạo hồ sơ; `lessons_before_write` kiểm tra nội dung bài và slug không trùng).
- **RLS + GRANT**: khách chỉ đọc khoá đã công bố; học viên chỉ đọc dữ liệu của chính mình; trình duyệt **không có quyền ghi** (migration 016, 017, 018).
- **Khoá tài khoản chặn thật**: đặt `auth.users.banned_until`, nên đăng nhập và refresh bị từ chối.
- Các hàm admin tự kiểm `is_admin()`, **không cho khoá hay hạ quyền admin cuối cùng**, và ghi `admin_logs`.

## 7. Quan sát và vận hành (`/metrics`)
Số liệu chuẩn Prometheus: số session, lệnh theo kết quả, độ trễ lệnh, request theo nhóm route và mã trạng thái, số lần bị rate limit, tải hàng đợi, RAM/CPU của API. Giá trị nhãn được **escape** (có test chống chèn nhãn); các route không khớp gom về nhóm `other` để URL xấu không làm phình số liệu.

## 8. Kiểm thử backend
| Loại | Số lượng | Kết quả |
|---|---|---|
| Test tự động (`npm test`, `node --test`) | 105 | **99 pass**, 2 fail (chỉ trên Windows: symlink và quyền thư mục kiểu POSIX), 4 skip (lab cần symlink/chmod trên Windows) |
| Test lab + flag | 26 (trong số trên) | Mỗi lab chạy bằng bash thật: làm đúng thì ra đúng flag, chưa làm thì flag không lộ |
| Test vòng đời session/lease | 4 | một người = một session; mở song song; trả lease; chuyển lab song song không lỗi |
| Probe bảo mật API | 49 | 49/49 (xem [PENTEST.md](PENTEST.md)) |
| Probe thoát sandbox (Bubblewrap thật) | 31 | 31/31 |
| Benchmark / stress | `tests/benchmark.js`, `tests/stress_attack_sim.js` | xem [BENCHMARK.md](BENCHMARK.md) |

Hai test fail trên Windows đều là khác biệt hệ điều hành (symlink và chmod kiểu POSIX); trên Linux/WSL kỳ vọng pass (đã thử riêng các lab liên quan trong WSL).

## 9. Giới hạn đã biết
- Kho lease nằm trong RAM; khởi động lại API thì mất.
- `trust proxy` đang tắt: nếu đặt API sau một reverse proxy, mọi người dùng sẽ chung một bucket rate limit theo IP (cần cấu hình đúng khi triển khai).
- Chưa kiểm chứng trên Docker thật (Docker không bật trên máy phát triển): đã kiểm chứng `run-job` + Bubblewrap thật trên Linux/WSL, và toàn bộ luồng với runner thay thế.
- Lệnh `awk` không dùng được trong sandbox (`/usr/bin/awk` là lối tắt tới `/etc/alternatives` mà sandbox không gắn); `gawk` chạy được. Cần thêm `--ro-bind /etc/alternatives /etc/alternatives` vào `run-job` (đã thử trên bản sao; chưa áp dụng).
