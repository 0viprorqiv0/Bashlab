# BashLab — kết quả benchmark thực tế

Thời điểm: 2026-09-26T13:16:14.128Z. Mỗi mức chạy 10 burst.

Máy: 12th Gen Intel(R) Core(TM) i5-12450HX; 12 logical CPUs; 15.3 GiB RAM; kernel 7.1.5+kali-amd64; Node v22.23.2.

Runtime: Docker CLI 28.5.2 → Podman rootless 5.8.6; Ubuntu 24.04, Bubblewrap 0.9.0. Runner giới hạn 2 CPU / 512 MiB / 128 PID. API rate limit 10000 cho lần đo.

| Đồng thời | Requests | Avg ms | p50 ms | p95 ms | req/s | OK req/s | Runner CPU peak % | Runner RAM peak MiB | API CPU avg % | API RAM peak MiB | Thành công % |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 10 | 100 | 933.98 | 1010.68 | 1412.76 | 7.08 | 7.08 | 159.17 | 15.70 | 7.20 | 89.50 | 100.00 |
| 20 | 200 | 2125.90 | 1983.24 | 4245.34 | 5.56 | 5.56 | 153.23 | 13.53 | 5.30 | 92.42 | 100.00 |
| 30 | 300 | 3182.50 | 3212.67 | 5236.27 | 5.59 | 5.06 | 134.15 | 10.20 | 4.67 | 98.86 | 90.67 |
| 50 | 500 | 2932.99 | 3445.95 | 5275.57 | 8.83 | 3.67 | 98.04 | 13.73 | 4.65 | 101.89 | 41.60 |

Phân loại kết quả:

- 10 đồng thời: {"completed":100}; 22 mẫu runner.
- 20 đồng thời: {"completed":200}; 56 mẫu runner.
- 30 đồng thời: {"completed":272,"QUEUE_TIMEOUT":28}; 86 mẫu runner.
- 50 đồng thời: {"QUEUE_FULL":140,"completed":208,"QUEUE_TIMEOUT":152}; 84 mẫu runner.

Latency tính cả queue và lỗi; req/s tính mọi response, OK req/s chỉ tính lệnh thành công. CPU/RAM peak là đỉnh quan sát qua lấy mẫu, không phải đỉnh tuyệt đối. CPU 100% = một core. Burst dài cho thấy queue deadline 5s bắt đầu từ chối ở mức 30; không suy rộng thành cam kết SLA cho máy khác.

Lần đo có hai request smoke API bổ sung ở giai đoạn đầu mức 10; máy host dùng chung, không phải môi trường benchmark chuyên dụng. Số liệu là quan sát của lần chạy này.

Raw request latencies và telemetry: [latest.json](latest.json). Chạy lại: `BENCH_ROUNDS=10 npm run benchmark` khi API được khởi động với `RATE_LIMIT_MAX=10000`.
