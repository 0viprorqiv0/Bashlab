# BashLab Quick Tunnel — Biên bản triển khai live

Ngày triển khai: 2026-10-03

## 1. Cấu trúc Cloudflare trong repo

Đã tạo/tài liệu hóa phần hạ tầng tại:

- `infra/cloudflare/README.md`
- `infra/cloudflare/tunnel/config.yml.example`
- `infra/cloudflare/tunnel/cloudflared.service`
- `infra/cloudflare/waf/rules.md`

Phần này phục vụ Named Tunnel + WAF khi sau này có domain. Repository không chứa secrets hoặc token thật.

## 2. Phương án được chọn: Quick Tunnel không domain

Yêu cầu đã chốt:

- Không cần mua domain.
- Không có email gate hoặc OTP.
- Ai có URL đều có thể truy cập.
- URL public phải hoạt động tương tự localhost.
- Không thay đổi mã backend để chỉ phục vụ tunnel.

BashLab có frontend ở cổng `3000` và API ở cổng `3001`, vì vậy Caddy được dùng làm bridge nội bộ tại `127.0.0.1:8080`:

```text
Internet
  → trycloudflare.com URL
  → cloudflared
  → Caddy :8080
  ├─ /api/*, /health → Backend :3001
  └─ các route khác   → Frontend :3000
```

Nhờ đó frontend gọi API qua `/api/...`; người truy cập từ máy khác không bị trỏ nhầm về `localhost` của chính họ.

## 3. Quick Tunnel controller trong repo

Đã thêm các file sau:

- `scripts/quick-tunnel/bashlab-tunnel.sh`
- `scripts/quick-tunnel/start-supervisor.sh`
- `scripts/quick-tunnel/stop-supervisor.sh`
- `scripts/quick-tunnel/process-helpers.sh`
- `scripts/quick-tunnel/Caddyfile`
- `scripts/quick-tunnel/diagnose.sh`
- `scripts/quick-tunnel/README.md`
- `scripts/quick-tunnel/test/quick-tunnel-lifecycle.sh`

Lệnh quản lý:

```bash
./scripts/quick-tunnel/bashlab-tunnel.sh start
./scripts/quick-tunnel/bashlab-tunnel.sh status
./scripts/quick-tunnel/bashlab-tunnel.sh diagnose
./scripts/quick-tunnel/bashlab-tunnel.sh stop
```

## 4. Công cụ cài trên máy

- `cloudflared` đã có sẵn tại `~/.local/bin/cloudflared`.
- Caddy chưa có, nên binary chạy theo user được tải về `~/.local/bin/caddy`.
- Không dùng `sudo`, không dùng mật khẩu người dùng, và không cài Caddy ở cấp hệ thống.

## 5. Chuyển đổi từ stack cũ

Đã chạy:

```bash
./start.sh stop
```

Lệnh này dừng frontend/backend cũ và monitoring để nhả cổng `3000` và `3001`. Runner container `bashlab-box` được giữ chạy. Quick Tunnel controller tự chạy frontend production, backend production, Caddy bridge và Cloudflare Tunnel.

## 6. Lỗi phát hiện và cách sửa

### Process nền bị dừng khi lệnh cha kết thúc

Nguyên nhân: `nohup` một mình chưa tách process khỏi session gọi lệnh trong môi trường triển khai. Controller đã đổi sang `setsid nohup` để mỗi service có session riêng.

### Status và stop nhận diện sai process

PID thực tế là process `npm run start...`, không phải command con `next` hoặc `node`. Các matcher đã được cập nhật cho frontend và backend.

### Stop để lại child process giữ cổng

Dừng riêng npm cha có thể để lại Next.js hoặc Node child process. Controller hiện dừng toàn bộ process group do chính nó tạo.

### Public DNS chậm hơn connector registration

Có lúc resolver DNS cục bộ trả NXDOMAIN ngay sau khi Cloudflare tạo hostname, dù connector đã đăng ký. Lệnh `start` hiện lưu/trả URL khi connector đăng ký và local services sẵn sàng; `diagnose` chịu trách nhiệm kiểm tra public health.

## 7. Xung đột với Playwright E2E

Một Playwright test khác (`evidence-instance-switch.spec.js`) đã tự bật Next dev/API ở `3000` và `3001`, gây xung đột khi build và khởi động tunnel. Process đó không bị dừng; đã chờ test kết thúc, xác nhận ports trống, rồi tiếp tục triển khai.

## 8. Build và chạy live

Frontend đã được build production với API relative path:

```bash
cd frontend
env NEXT_PUBLIC_API_URL= npm run build
```

Sau đó chạy:

```bash
./scripts/quick-tunnel/bashlab-tunnel.sh start
```

## 9. Trạng thái live đã xác minh

URL được cấp tại thời điểm triển khai:

```text
https://boots-added-chem-manga.trycloudflare.com
```

Đã xác minh thành công:

```text
Frontend: running
Backend: running
Caddy: running
Tunnel: running

LOCAL_FRONTEND=200
LOCAL_API=200
PUBLIC_HEALTH=200
RESULT=CONNECTOR_READY
```

## 10. Các commit liên quan

- `dfd7df1` — thiết kế Quick Tunnel.
- `dae0c0a` — thêm Quick Tunnel controller.
- `eac17e2` — sửa lifecycle, PID management, stop process group và hành vi start khi DNS public chậm.

Các thay đổi UI/E2E không liên quan trong worktree không được stage, sửa hoặc commit trong quá trình triển khai.

## 11. Lưu ý vận hành

Quick Tunnel là tạm thời. Khi chạy `stop`, khi máy tắt, hoặc khi Cloudflare connector mất kết nối, URL sẽ mất hiệu lực. Chạy lại `start` sẽ tạo URL `trycloudflare.com` mới.

