# BashLab — Prometheus & Grafana Monitoring Stack

Hệ thống giám sát hiệu năng thời gian thực (Real-time Observability & SRE Dashboard) dành cho đồ án BashLab.

---

## 1. Kiến trúc luồng dữ liệu giám sát

```text
[Học viên gõ lệnh / Benchmark tải]
              │
              ▼
   [Node.js Backend :3001]
   └── GET /metrics (Prometheus Format: text/plain)
              ▲
              │ (Scrape định kỳ 1 giây/lần)
   [Prometheus Container :9090]
              │
              ▼ (Lưu Time-series Database)
   [Grafana Dashboard :3002] ──> Giảng viên / Ban Giám Khảo xem Live
```

---

## 2. Hướng dẫn khởi động nhanh (1 Lệnh duy nhất)

### Bước 1: Khởi động Prometheus & Grafana
Trong thư mục gốc của dự án, chạy:
```bash
docker compose -f monitoring/docker-compose.yml up -d
```

### Bước 2: Khởi động Backend API
```bash
cd backend
npm start
```
*(Backend sẽ tự động chạy tại `http://127.0.0.1:3001` và mở cổng `/metrics` cho Prometheus)*

### Bước 3: Mở Dashboard trên Trình Duyệt
Truy cập: **[http://localhost:3002](http://localhost:3002)**
- **Đăng nhập:** khách ẩn danh chỉ xem được (Viewer); muốn sửa dashboard đăng nhập `admin` với mật khẩu `GRAFANA_ADMIN_PASSWORD` (mặc định `admin` — đổi khi không phải máy dev). Prometheus/Grafana chỉ mở trên `127.0.0.1`.
- **Trang Activity trong web admin** cũng vẽ biểu đồ từ Prometheus này (API đọc server-side qua `PROMETHEUS_URL`), không cần mở Grafana; đặt `NEXT_PUBLIC_GRAFANA_URL` để thêm nút "Open Grafana". Ngoài môi trường dev, đặt `METRICS_TOKEN` cho API và bật `authorization.credentials_file` trong `prometheus.yml`.
- **Dashboard:** Tự động mở sẵn giao diện **`BashLab — Operations & Sandbox Monitor`**.

---

## 3. Các Panel chỉ số hiển thị trên Grafana

| Panel | Chỉ số kỹ thuật | Ý nghĩa trình diễn đồ án |
| :--- | :--- | :--- |
| **Active Sessions** | `bashlab_active_sessions` | Số học viên đang có workspace thực hành trên SSD. |
| **Throughput (req/s)** | `rate(bashlab_commands_total)` | Tốc độ xử lý lệnh thời gian thực của máy chủ. |
| **Running Jobs (Cap: 4)** | `bashlab_runner_active_jobs` | Số lệnh đang chạy song song (luôn được giữ tối đa 4 để bảo vệ CPU). |
| **Queue Pending (Cap: 32)** | `bashlab_runner_pending_jobs` | Hàng đợi admission control khi bị dồn tải. |
| **API RSS Memory** | `bashlab_api_memory_bytes` | Mức tiêu thụ RAM của Node.js backend. |
| **Latency Percentiles** | `p50, p95, p99` | Đường cong độ trễ thời gian thực (mili-giây). |
| **Execution by Outcome** | `completed, timeout, error` | Biểu đồ phân loại kết quả lệnh (Thành công ✅, Hết giờ ⏱️, Lỗi ❌). |
| **Circuit Breaker (429)** | `rate(bashlab_rate_limited_total)` | Cảnh báo từ chối an toàn khi học viên spam hoặc quá tải. |

---

## 4. Kịch bản Demo Live trước Giảng Viên (Hiệu ứng cực mạnh)

1. **Chuẩn bị màn hình:**
   - Nửa màn hình bên trái: Trình duyệt mở Grafana Dashboard `http://localhost:3002`.
   - Nửa màn hình bên phải: Cửa sổ Terminal.
2. **Kích hoạt bắn tải ngầm:**
   Trong cửa sổ terminal, chạy:
   ```bash
   cd backend
   npm run benchmark
   ```
3. **Thuyết trình:**
   - *"Kính thưa thầy cô, khi hệ thống nhận tải đồng thời từ 10 đến 50 requests:"*
   - Chỉ vào Grafana:
     - Kim **Throughput** nhảy vọt lên cao.
     - Biểu đồ **Latency** uốn lượn thời gian thực.
     - Đồng hồ **Running Jobs** không bao giờ vượt quá 4 con (chứng minh Admission Control hoạt động chuẩn xác).
     - Mức tiêu thụ **RAM** phẳng lì, không hề có hiện tượng rò rỉ bộ nhớ.
     - Khi tải lên mức 50, panel **Circuit Breaker** kích hoạt từ chối an toàn bằng HTTP 429, bảo vệ server không bị crash.

---

## 5. Dừng hệ thống giám sát khi demo xong
```bash
docker compose -f monitoring/docker-compose.yml down
```
