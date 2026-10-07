# BashLab — Benchmark và stress test

> Mục tiêu: chứng minh bằng số liệu rằng kiến trúc **một container dùng chung + Bubblewrap cho từng lệnh** vừa nhanh, vừa tiết kiệm tài nguyên, vừa **tự bảo vệ khi quá tải**.
> Nguồn: `backend/benchmarks/RESULTS.md` và `latest.json` (số đo thật của nhóm), `backend/tests/benchmark.js` và `stress_attack_sim.js` (công cụ đo). Phần nào mình **không tự đo lại**, tài liệu ghi rõ.

## 1. Môi trường đo (Linux thật)
- CPU Intel i5-12450HX (12 luồng), RAM 15,3 GiB, Linux kernel 7.1.5, Node v22.23.2.
- Docker CLI 28.5.2 → Podman rootless 5.8.6, Ubuntu 24.04, **Bubblewrap 0.9.0**.
- Runner giới hạn **2 CPU / 512 MiB / 128 PID**. Rate limit của API đặt 10.000 cho lần đo (cấu hình mặc định là 30/phút/IP, để bảo vệ).
- Mỗi mức tải chạy **10 đợt** (burst). Máy host dùng chung, không phải máy benchmark chuyên dụng.

## 2. Kết quả: lệnh chạy đồng thời trong sandbox
| Đồng thời | Số yêu cầu | Trung bình | p50 | p95 | Thành công | RAM runner đỉnh | RAM API đỉnh |
|---|---|---|---|---|---|---|---|
| 10 | 100 | 934 ms | 1,01 s | 1,41 s | **100 %** | 15,7 MiB | 89,5 MiB |
| 20 | 200 | 2,13 s | 1,98 s | 4,25 s | **100 %** | 13,5 MiB | 92,4 MiB |
| 30 | 300 | 3,18 s | 3,21 s | 5,24 s | **90,7 %** (28 hết hạn hàng đợi) | 10,2 MiB | 98,9 MiB |
| 50 | 500 | 2,93 s | 3,45 s | 5,28 s | **41,6 %** (152 hết hạn + 140 bị từ chối 429) | 13,7 MiB | 101,9 MiB |

Phân loại kết quả ở mức 50: 208 hoàn thành, 152 `QUEUE_TIMEOUT`, 140 `QUEUE_FULL` (HTTP 429).

## 3. Cách đọc đúng (rất quan trọng)
1. **Chạy trọn vẹn tới 20 lệnh đồng thời** (100 % thành công), bắt đầu suy giảm ở 30, và ở 50 thì **cơ chế bảo vệ quá tải kích hoạt**: từ chối bớt có kiểm soát (429), **không sập, không treo**.
2. **RAM runner luôn khoảng 10–16 MiB** và RAM API khoảng 90–100 MiB dù tải tăng 5 lần: **không rò bộ nhớ**. Tải tăng chỉ làm dài hàng đợi, **không làm tăng số container**.
3. Hàng đợi `p-limit` (4 chạy đồng thời · 32 chờ · chờ tối đa 5 giây) chính là lý do thời gian tăng mà hệ thống vẫn ổn định.
4. Đây là **số đo của một lần chạy trên một máy dùng chung**, không phải cam kết hiệu năng (SLA). Không nói "chịu được 50 người dùng"; nói "chịu tốt tới khoảng 20 lệnh đồng thời, quá tải thì tự bảo vệ".

## 4. So sánh với mô hình "mỗi người một container"
| | 1 container / học viên | BashLab (1 container dùng chung + Bubblewrap) |
|---|---|---|
| RAM khi 10–50 người | ước tính 500 MB – 2,5 GB (mỗi container vài chục tới vài trăm MB) | **khoảng 10–16 MiB** (đã đo) |
| Thời gian bắt đầu | chậm (tạo container) | chỉ tạo thư mục workspace |
| Cô lập giữa người với người | tốt | tốt, nhờ namespace riêng cho từng lệnh |

(Con số của mô hình 1 container/người là **ước tính để so sánh**, không phải đo trực tiếp.)

## 5. Stress / tấn công mô phỏng (`tests/stress_attack_sim.js`)
Bộ kịch bản 6 lớp bảo vệ của sandbox, chạy được trên máy có Docker:
1. CPU burner: timeout cứng 3 giây và giết cả cây tiến trình.
2. Disk quota: `RLIMIT_FSIZE` 10 MB và hạn mức workspace 30 MB.
3. Memory bomb: giới hạn 512 MiB của container, host không bị OOM.
4. Session lock: HTTP 409 `SESSION_BUSY` chống hỏng workspace do hai lệnh song song.
5. Admission queue: 4 chạy · 32 chờ, tràn thì 429.
6. IP rate limiter: HTTP 429 kèm `Retry-After`.

> **Chưa tự chạy lại trong đợt này** (máy phát triển không bật Docker). Các cơ chế 1, 2, 5, 6 đã được kiểm chứng bằng test tự động và bằng probe trên Bubblewrap thật (xem [PENTEST.md](PENTEST.md)); cơ chế 3 (memory bomb) và fork bomb phụ thuộc giới hạn cgroup của container nên **chỉ kiểm chứng được dưới Docker**.

## 6. Hiệu năng frontend
**Đo trong đợt này** (`npm run build`, JS tải lần đầu):
| Trang | First Load JS |
|---|---|
| Phần dùng chung mọi trang | 87,9 kB |
| `/login` | 104 kB |
| `/` (landing, có WebGL) | 126 kB |
| `/admin/activity` | 164 kB |
| `/courses`, `/my-learning` | 169 kB |
| Lab Workspace | 213 kB |
| Content Studio | 222 kB |

**Ghi trong kế hoạch của nhóm, đo trên bản production trước → sau tối ưu** (không đo lại trong đợt này; phần còn lại chủ yếu là độ trễ mạng tới Supabase):
| Trang | Trước | Sau |
|---|---|---|
| `/courses` | ~930 ms | ~390 ms |
| `/courses/shell-101` (trang này nay là trang chuyển hướng) | ~990 ms | ~330 ms |
| `/account` | ~920 ms | ~360 ms |
| `/admin/users` | ~400 ms | ~150 ms |
| Landing | ~700 ms | ~280 ms |

Các tối ưu đã làm: Lenis chỉ ở trang chủ; font icon 1,1 MB → ~320 KB; `next/font`; `AuthProvider` dùng chung thay cho 3–5 lượt gọi xác thực tuần tự; tải dữ liệu song song với xác minh danh tính; nền WebGL chỉ chạy khi nhìn thấy, giới hạn pixel ratio 1,5, tắt khi bật "giảm chuyển động".

## 7. Giám sát thời gian thực
Prometheus đọc `/metrics` mỗi 15 giây; trang Admin → Activity vẽ **9 biểu đồ** (tải sandbox, lệnh/phút, độ trễ lệnh p95, request API/phút, độ trễ API p95, hoạt động đăng nhập, RAM, CPU, số lần bị rate limit) và **6 số liệu** đầu trang, theo khoảng 15 phút / 1 giờ / 6 giờ / 24 giờ.

## 8. Tốc độ kiểm thử (đo trong đợt này, máy Windows)
| Bộ test | Số lượng | Thời gian |
|---|---|---|
| Backend (`npm test`) | 105 test | khoảng 2,4 giây |
| E2E Playwright | 112 test | khoảng 3,4 phút |
| Probe bảo mật API | 49 kiểm tra | dưới 1 phút |
| Probe thoát sandbox | 31 kiểm tra | vài giây (ước lượng) |

## 9. Cách chạy lại
```bash
cd backend
RATE_LIMIT_MAX=10000 npm start      # terminal 1 (API với rate limit cao)
BENCH_ROUNDS=10 npm run benchmark   # terminal 2: chạy đo (kết quả ở benchmarks/)
npm run report                      # bảng ASCII trên terminal
node tests/stress_attack_sim.js     # 6 kịch bản tấn công/stress
```
