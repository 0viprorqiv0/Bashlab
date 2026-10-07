# Cloudflare Tunnel + WAF cơ bản

Thư mục này chứa mẫu cấu hình và hướng dẫn vận hành. Nó không chứa secret và không tự thay đổi backend BashLab. Dùng cùng tài liệu này cho từng máy demo, staging hoặc production để public BashLab mà không mở HTTP/HTTPS vào Internet.

Nếu chỉ cần một link demo tạm thời không domain, dùng [Quick Tunnel controller](../../scripts/quick-tunnel/README.md). Quick Tunnel không dùng cấu hình Named Tunnel hoặc WAF trong thư mục này.

```text
Internet
  -> Cloudflare: DNS proxy, DDoS protection, WAF/rate-limit rules
  -> cloudflared trên chính máy chạy BashLab
  -> 127.0.0.1:3000 (frontend) / 127.0.0.1:3001 (API)
```

## File commit và file cục bộ

| Nơi đặt | Mục đích | Commit? |
| --- | --- | --- |
| `infra/cloudflare/tunnel/config.yml.example` | Mẫu ingress Tunnel | Có |
| `infra/cloudflare/tunnel/cloudflared.service` | Mẫu systemd unit | Có |
| `infra/cloudflare/waf/rules.md` | Rule tạo trên Cloudflare Dashboard | Có |
| `/etc/cloudflared/config.yml` | Cấu hình thật của một máy | Không |
| `/etc/cloudflared/<tunnel-id>.json` | Credential Tunnel | Không |
| `backend/.env`, `frontend/.env.local` | Secret và domain riêng từng máy | Không |

Không đưa Tunnel token, JSON credential hoặc `.env` vào Git. Root `.gitignore` đã chặn credential Tunnel nếu bị copy nhầm vào thư mục này.

## Phạm vi

Phạm vi này chỉ có Tunnel + WAF cơ bản. Nó không thay thế JWT/RBAC, rate limiter Express, Docker, Bubblewrap, quota, timeout hay giới hạn process của BashLab. Không public Prometheus (`9090`) hay Grafana (`3002`) trong cấu hình này.

Để không sửa source backend, backend được cấu hình bằng biến môi trường để chỉ nghe loopback. Điều này bắt buộc vì backend mặc định dùng `HOST=0.0.0.0` nếu biến `HOST` không tồn tại.

## Chuẩn bị một máy mới

Làm tuần tự trên mỗi máy. Ví dụ bên dưới dùng `app.example.com` cho frontend và `api.example.com` cho API. Máy staging nên có domain khác, chẳng hạn `app-staging.example.com` và `api-staging.example.com`.

1. Cài và chạy BashLab theo hướng dẫn của repo. Trước khi cài Tunnel, xác nhận service local hoạt động:

   ```bash
   curl --fail http://127.0.0.1:3001/health
   curl --fail http://127.0.0.1:3000/login
   ```

2. Trong `backend/.env` trên máy đó, đặt:

   ```env
   HOST=127.0.0.1
   NODE_ENV=production
   COOKIE_SECURE=true
   CORS_ORIGINS=https://app.example.com
   ```

   Trong `frontend/.env.local`, đặt:

   ```env
   NEXT_PUBLIC_API_URL=https://api.example.com
   ```

   Khởi động lại BashLab sau khi đổi môi trường. Domain phải khớp tuyệt đối, không có dấu `/` cuối URL.

3. Kiểm tra port thực sự không public trước khi tiếp tục:

   ```bash
   ss -ltnp | grep -E ':(3000|3001|3002|9090)'
   ```

   Backend phải hiện `127.0.0.1:3001` hoặc `[::1]:3001`. Nếu frontend không bind loopback trên máy đó, chặn port `3000` tại firewall host.

## Cài Tunnel cho một máy

Cấu trúc trong repo dùng **locally-managed Named Tunnel**: ingress nằm trong file YAML trên máy chạy BashLab. Cài `cloudflared` từ repository/package chính thức của Cloudflare, sau đó chạy `cloudflared --version`.

Trên máy đó, tạo Named Tunnel riêng, ví dụ `bashlab-prod-01` hoặc `bashlab-staging-01`. Cách này giúp thu hồi quyền của một máy bị mất mà không làm ngắt máy khác:

```bash
cloudflared tunnel login
cloudflared tunnel create bashlab-prod-01
cloudflared tunnel list
```

`tunnel login` mở URL xác thực Cloudflare; trên server không có GUI, mở URL đó ở browser của quản trị viên rồi quay lại terminal. Lệnh `tunnel create` in ra UUID và đường dẫn JSON credential. Chỉ credential JSON của Tunnel được copy sang `/etc/cloudflared`; không copy `cert.pem` account-wide vào máy vận hành.

Sao chép `tunnel/config.yml.example` thành `/etc/cloudflared/config.yml`, thay `<TUNNEL-UUID>`, `app.example.com` và `api.example.com`. Thay `<SOURCE-CREDENTIAL-PATH>` bằng đường dẫn JSON vừa được lệnh `create` in ra:

```bash
sudo install -d -m 700 /etc/cloudflared
sudo install -m 600 <SOURCE-CREDENTIAL-PATH> /etc/cloudflared/<TUNNEL-UUID>.json
sudo chown root:root /etc/cloudflared/config.yml /etc/cloudflared/<TUNNEL-UUID>.json
sudo chmod 600 /etc/cloudflared/config.yml /etc/cloudflared/<TUNNEL-UUID>.json
```

Tạo DNS route cho hai hostname. Lệnh này tạo CNAME tới `<TUNNEL-UUID>.cfargotunnel.com`:

```bash
cloudflared tunnel route dns bashlab-prod-01 app.example.com
cloudflared tunnel route dns bashlab-prod-01 api.example.com
```

Cloudflare quản lý route CNAME của Tunnel; không thay record đó bằng A record trỏ thẳng về IP server. Traffic sẽ đi qua Cloudflare nên WAF và các rule edge nằm trên đường request.

Copy `tunnel/cloudflared.service` vào `/etc/systemd/system/cloudflared.service`. Nếu `command -v cloudflared` trả đường dẫn khác `/usr/bin/cloudflared`, sửa `ExecStart` trước khi bật service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now cloudflared
sudo systemctl status cloudflared --no-pager
```

Khi Tunnel không kết nối được: `sudo journalctl -u cloudflared -n 100 --no-pager`.

## Firewall host tối thiểu

Tunnel không cần mở inbound TCP 80 hoặc 443. Firewall máy chủ nên deny port app/monitoring từ Internet, chỉ giữ đường quản trị cần thiết như SSH qua VPN hoặc allow-list IP quản trị.

Không đưa lệnh firewall cố định vào tài liệu vì UFW, firewalld, nftables và cloud security group khác cú pháp. Sau khi áp policy, kiểm tra từ mạng ngoài: `http://<public-ip>:3000` và `:3001` không truy cập được, nhưng hai hostname HTTPS qua Tunnel vẫn hoạt động.

## WAF và checklist bàn giao

Tạo rule theo [waf/rules.md](waf/rules.md). Rule nằm trên Cloudflare Dashboard; tài liệu trong repo là danh sách chuẩn để áp lại cho zone/máy khác.

- [ ] Mỗi máy có Tunnel và credential riêng.
- [ ] `app` và `api` hostname có DNS record Proxied.
- [ ] `backend/.env` có `HOST=127.0.0.1`, `COOKIE_SECURE=true`, CORS đúng.
- [ ] `frontend/.env.local` có `NEXT_PUBLIC_API_URL` đúng rồi đã restart/build.
- [ ] Port `3000`, `3001`, `3002`, `9090` không public ra Internet.
- [ ] `cloudflared` tự chạy sau reboot: `systemctl is-enabled cloudflared`.
- [ ] Rule WAF cơ bản đã được tạo và kiểm tra Security Events.
- [ ] Login, tạo session và chạy một lệnh Bash hợp lệ qua domain HTTPS thành công.

## Rollback

Nếu Tunnel/WAF gây lỗi, tắt hoặc chỉnh rule gây chặn trước. Nếu cần dừng hoàn toàn public ingress: `sudo systemctl disable --now cloudflared`. Thao tác này không đổi source hay dữ liệu BashLab; service local vẫn còn để chẩn đoán.
