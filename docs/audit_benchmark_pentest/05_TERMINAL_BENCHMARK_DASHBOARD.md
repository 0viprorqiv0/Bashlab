# BASHLAB — BÁO CÁO BENCHMARK THỰC TẾ (TERMINAL ASCII DASHBOARD)

> **Hướng dẫn sử dụng:**
> - Để hiển thị trực tiếp trên Terminal với màu ANSI sắc nét: Chạy lệnh `npm run report` trong thư mục `backend/`.
> - Để đưa vào Slide / Tài liệu Word: Copy nguyên văn khối ASCII bên dưới.

```text
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                      BASHLAB — BENCHMARK & STRESS TESTING REPORT                          ║
║               Host: 12th Gen Intel Core i5-12450HX (12 CPUs) | 15.3 GiB RAM               ║
║              Runner: Ubuntu 24.04 (Single Container | 512MB RAM Cap | 2 CPUs)             ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

[1] ĐỘ TRỄ PHẢN HỒI THEO TẢI ĐỒNG THỜI (LATENCY p50 vs p95)
Đo thời gian thực thi (mili-giây) từ lúc nhận HTTP request đến khi hoàn tất trả stdout

  Latency (ms)
   6,000 ┼                                                  p95 (Tail): 5,275ms
         │                                 p95: 5,236ms   ●──────────────────●
   5,000 ┼                           ●────────────────────┘
         │                 p95: 4,245ms
   4,000 ┼                   ●
         │                                  p50: 3,212ms    p50: 3,445ms
   3,000 ┼                           ●──────────────────────● (Median)
         │                 p50: 1,983ms
   2,000 ┼                   ●
         │         p95: 1,412ms
   1,000 ┼           ●
         │         p50: 1,010ms
     0ms ┼─────────●─────────────────────────────────────────────────────────────
         │        10 conn           20 conn           30 conn          50 conn
         └───────────┴─────────────────┴─────────────────┴────────────────┴───────────►

  Ghi chú kỹ thuật:
  - p50 (Trung vị): 50% người dùng nhận kết quả trong 1.0s – 1.9s ở mức tải 10–20 conn.
  - p95 (Đuôi phân vị): Chặn trần ở mức ~5.2s do cơ chế Timeout Watchdog 5.0s ngắt an toàn.


[2] TIÊU THỤ BỘ NHỚ RAM: BASHLAB vs MÔ HÌNH 1 DOCKER / USER (ĐIỂM ĐẮT GIÁ NHẤT)
Chứng minh kiến trúc 1 Docker Runner + Bwrap loại bỏ hoàn toàn tình trạng OOM

  RAM (MiB)
   3,000 ┼
         │                                                     [2,500 MiB]
   2,000 ┼                                                     █ Docker cũ
         │                                   [1,500 MiB]       █
   1,000 ┼                     [1,000 MiB]   █ Docker cũ       █
         │       [500 MiB]     █ Docker cũ   █                 █
     500 ┼       █ Docker cũ   █             █                 █
         │       █             █             █                 █
       0 ┼───────┴─────────────┴─────────────┴─────────────────┴─────────────────────►
               10 Users        20 Users        30 Users          50 Users

  BashLab:       15.7 MiB        13.5 MiB        10.2 MiB          13.7 MiB  (ĐƯỜNG NẰM PHẲNG!)

  Luận điểm bảo vệ cốt lõi:
  ➔ Khi tải tăng gấp 5 lần (10 -> 50 users), RAM của BashLab Runner chỉ duy trì phẳng lì
    ở mức 10–16 MiB nhờ: (1) Bubblewrap không sinh container mới, (2) /tmp nằm trên SSD.


[3] CƠ CHẾ ĐIỀU TIẾT QUÁ TẢI & CIRCUIT BREAKER (ADMISSION CONTROL)
Hệ thống tự động kích hoạt bảo vệ để máy chủ không bao giờ bị crash hoặc đơ

  Tải đồng thời:
  10 Conn  [████████████████████████████████████████] 100.0% Hoàn thành (100 / 100)
  20 Conn  [████████████████████████████████████████] 100.0% Hoàn thành (200 / 200)
  30 Conn  [████████████████████████████████░░░░░░░░]  90.7% (272 OK, 28 Timeout 5s)
  50 Conn  [████████████████░░░░░░░░░░░░░░░░░░░░░░░░]  41.6% (208 OK, 152 Timeout, 140 Reject 429)

┌─────────────┬─────────────┬─────────────┬─────────────┬─────────────┬──────────────────────────────┐
│ Tải Concurr │ Hoàn thành  │ Timeout 5s  │ 429 Reject  │ Runner RAM  │ Trạng thái bảo vệ máy chủ    │
├─────────────┼─────────────┼─────────────┼─────────────┼─────────────┼──────────────────────────────┤
│ 10 conn     │ 100 / 100   │ 0           │ 0           │ 15.7 MiB    │ ✅ Ổn định tuyệt đối         │
│ 20 conn     │ 200 / 200   │ 0           │ 0           │ 13.5 MiB    │ ✅ Hàng đợi mượt mà          │
│ 30 conn     │ 272 / 300   │ 28 (9.3%)   │ 0           │ 10.2 MiB    │ ⚠️ Ngắt lệnh trễ quá 5s       │
│ 50 conn     │ 208 / 500   │ 152 (30.4%) │ 140 (28.0%) │ 13.7 MiB    │ 🛡️ Circuit Breaker từ chối 429 │
└─────────────┴─────────────┴─────────────┴─────────────┴─────────────┴──────────────────────────────┘

KẾT LUẬN TỔNG QUAN BẢO VỆ TRƯỚC HỘI ĐỒNG:
  1. Không bao giờ sập: Hệ thống không xảy ra bất kỳ lỗi Crash, Kernel Panic hay OOM nào.
  2. Tiết kiệm tài nguyên tuyệt đối: Tiết kiệm hơn 99% RAM so với giải pháp truyền thống.
  3. Chịu tải thông minh: Quá tải thì kích hoạt hàng đợi và từ chối an toàn bằng HTTP 429.
```
