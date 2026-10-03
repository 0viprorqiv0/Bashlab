# BashLab — Bộ tài liệu báo cáo

Nền tảng **học Bash tương tác**: học viên làm lab trong terminal thật ngay trên trình duyệt, chạy lệnh trong một sandbox cô lập, và hoàn thành lab bằng cách tìm và nộp flag. Quản trị viên soạn nội dung, quản lý người dùng và theo dõi hệ thống.

## Mục lục
| Tài liệu | Nội dung |
|---|---|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Kiến trúc tổng thể, sơ đồ, luồng chính, mô hình sandbox và session |
| [FRONTEND.md](FRONTEND.md) | 22 trang, cách nối với backend/Supabase, phiên đăng nhập, Lab Workspace, bảo mật trình duyệt, hiệu năng |
| [BACKEND.md](BACKEND.md) | API, lớp bảo vệ, giới hạn tài nguyên sandbox, cơ chế flag, cơ sở dữ liệu, giám sát, kiểm thử |
| [BENCHMARK.md](BENCHMARK.md) | Số đo tải thật (10–50 lệnh đồng thời), cách đọc đúng, so sánh, hiệu năng frontend |
| [PENTEST.md](PENTEST.md) | Kiểm thử xâm nhập: 49 kiểm tra API + 31 kiểm tra thoát sandbox, lỗ hổng đã tìm và sửa, rủi ro còn lại |

## Đối chiếu tiêu chí đánh giá
Yêu cầu *Standard*: giao diện hoàn chỉnh và các tính năng chính thiết yếu (2–3). Yêu cầu *Advanced*: **4–5 tính năng chính** và **chức năng nâng cao** (tối ưu hiệu năng, benchmarking, stress testing…).

### Năm tính năng chính
| # | Tính năng | Ở đâu trong code | Tài liệu |
|---|---|---|---|
| 1 | **Xác thực và phân quyền** (đăng ký, đăng nhập, quên mật khẩu, email xác minh, vai trò learner/admin, khoá tài khoản chặn đăng nhập thật) | `backend/src/routes/auth.js`, `services/authService.js`, `frontend/lib/authClient.js`, migration 001–018 | ARCHITECTURE §3, BACKEND §2 và §6 |
| 2 | **Khoá học, lab và tiến độ** (danh mục, lab, tiến độ đồng bộ giữa trang) | `frontend/app/(site)/courses`, `frontend/lib/learning.js`, `routes/content.js` | FRONTEND §1 |
| 3 | **Terminal Bash thật trong sandbox cô lập, hoàn thành lab bằng flag** | `LabWorkspace.jsx`, `services/sessionManager.js`, `runner/run-job`, `labs/catalog.js` | ARCHITECTURE §4.4–§6, BACKEND §4–§5 |
| 4 | **Quản trị nội dung** (Content Studio: soạn khoá, chương, bài có cấu trúc, xem trước, xuất bản) | `frontend/components/admin/ContentStudio.jsx`, `LessonEditor.jsx`, trigger `lessons_before_write` | FRONTEND §1 |
| 5 | **Quản trị vận hành** (người dùng kèm nhật ký lý do, phiên đang chạy, dashboard giám sát) | `UsersManager.jsx`, `ActivityPanel.jsx`, `Dashboard.jsx`, `services/metrics.js`, `monitoring/` | BACKEND §7, BENCHMARK §7 |

### Chức năng nâng cao
| Chức năng | Bằng chứng |
|---|---|
| **Tối ưu tài nguyên:** một container dùng chung + Bubblewrap cho từng lệnh (RAM runner khoảng 10–16 MiB bất kể tải) | BENCHMARK §2–§4 |
| **Benchmark thật** ở 10, 20, 30, 50 lệnh đồng thời (độ trễ p50/p95, tỉ lệ thành công, RAM/CPU) | `backend/benchmarks/RESULTS.md`, BENCHMARK |
| **Stress test và tấn công mô phỏng** (6 lớp bảo vệ: timeout, quota, bộ nhớ, khoá session, hàng đợi, rate limit) | `backend/tests/stress_attack_sim.js`, BENCHMARK §5 |
| **Kiểm thử xâm nhập (pentest)** có thể chạy lại, 80 kiểm tra | `tests/pentest_api.mjs`, `tests/pentest_sandbox.py`, PENTEST |
| **Bảo vệ quá tải nhiều lớp:** hàng đợi 4/32/5 giây, hạn mức workspace, timeout, 1 sandbox/người, rate limit theo IP/người/tài khoản | BACKEND §3–§4 |
| **Giám sát thời gian thực:** Prometheus + Grafana + dashboard 9 biểu đồ trong trang Admin | ARCHITECTURE §4.5 |
| **Bộ test tự động lớn:** 105 test backend, 112 test E2E trên hệ thống thật | BACKEND §8, FRONTEND §8 |
| **Bảo mật dữ liệu nhiều lớp:** RLS + GRANT + kiểm tra ở backend + RPC có nhật ký | ARCHITECTURE §3, BACKEND §6 |

## Chạy thử nhanh
```bash
# Backend (Linux/WSL có Docker để có terminal thật):
cd backend && npm ci && npm run runner:start && npm start        # cổng 3001
# Máy không có Docker:  SANDBOX_ENABLED=false npm start

# Frontend:
cd frontend && npm ci && npm run dev                              # cổng 3000

# Kiểm thử:
cd backend  && npm test                                           # 105 test
cd frontend && npx playwright test --project=chromium             # 112 test E2E
E2E_SANDBOX=1 npx playwright test specs/workspace.spec.js         # luồng lab thật (cần sandbox)
```
Cần hai file bí mật không nằm trong git: `backend/.env` và `frontend/.env.local` (mẫu: `.env.example`, `.env.local.example`).

## Kịch bản demo gợi ý (7 phút)
1. Bài toán và ý tưởng kiến trúc (ARCHITECTURE §1–§2).
2. Khách bấm **Start learning** → bị đưa tới đăng nhập; đăng nhập → vào thẳng lab.
3. Trong lab: `cat MISSION.txt`, `ls -la`, tìm flag, dán vào **Submit flag**, lab chuyển *Solved*.
4. Admin: **Activity** (dashboard), **Users** (khoá tài khoản kèm lý do), **Content Studio**.
5. Số liệu: bảng benchmark và cách đọc đúng (BENCHMARK §2–§3).
6. Bảo mật: bảng pentest 80/80 và các rủi ro còn lại nói thẳng (PENTEST §1, §6).

## Giới hạn đã biết (tóm tắt)
- Sandbox thật cần Linux/WSL + Docker; chưa kiểm chứng đầu-cuối trên Docker trong đợt này (đã kiểm chứng `run-job` + Bubblewrap thật và toàn bộ luồng với runner thay thế).
- Lệnh `awk` chưa dùng được trong sandbox (đã có cách sửa một dòng, chưa áp dụng).
- Frontend còn cảnh báo `npm audit` của Next.js 14; container chạy `seccomp`/`apparmor` unconfined mặc định.
- Trang thanh toán mới là giao diện; flag cố định mỗi lab.
