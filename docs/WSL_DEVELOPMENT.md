# Chạy BashLab trong WSL

Frontend, backend và Docker CLI chạy trong Ubuntu/WSL bằng tài khoản `bashlab` (UID 10001), Node.js 22 và Docker Desktop. Frontend dùng cổng **3000**; API sandbox dùng cổng **3001**.

## Cấu hình một lần

1. Mở Docker Desktop trên Windows, chờ **Engine running**, rồi vào **Settings → Resources → WSL Integration** và bật Ubuntu.
2. Mở Ubuntu/WSL, chuyển sang user dự án và kích hoạt Node 22:

   ```bash
   sudo -iu bashlab
   source ~/.nvm/nvm.sh
   nvm install 22
   nvm use 22
   node -p 'process.platform + " uid=" + process.getuid()'
   docker version
   ```

   Node cần in `linux uid=10001`; `docker version` cần có cả Client và Server.

3. Nếu repo ở `/mnt/c/Bash_lab`, WSL cần mount ổ C với tùy chọn `metadata` để tạo executable Linux trong `node_modules`. Nếu chưa có, thêm vào `/etc/wsl.conf`:

   ```ini
   [automount]
   options = "metadata"
   ```

   Sau đó chạy `wsl --terminate Ubuntu` trong PowerShell và mở Ubuntu lại. Không cài dependencies bằng Node Windows rồi dùng chúng trong WSL. Nếu gặp `EIO` khi npm thao tác trên `/mnt/c`, dùng checkout trong filesystem Linux (ví dụ `~/Bash_lab`) và cài lại bằng npm trong WSL.

## Cấu hình Supabase và migration 013

Trong WSL:

```bash
cd /mnt/c/Bash_lab/frontend
test -f .env.local || cp .env.local.example .env.local
nano .env.local
```

Điền `NEXT_PUBLIC_SUPABASE_URL` và `NEXT_PUBLIC_SUPABASE_ANON_KEY` từ đúng project Supabase. Khi frontend và backend cùng chạy trong WSL, đặt `NEXT_PUBLIC_API_URL=http://127.0.0.1:3001` và `NEXT_PUBLIC_SANDBOX_API_URL=http://127.0.0.1:3001` để proxy đăng nhập và terminal trong bài học gọi API local. Trong `backend/.env`, cần có `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` và `SUPABASE_ANON_KEY` của cùng project; đặt `HOST=127.0.0.1` và `SANDBOX_ENABLED=true`. Chỉ dùng anon/publishable key ở frontend; không đặt service-role key hoặc mật khẩu database trong `.env.local`.

Để hiện hai khóa `Shell 201` và `Linux Permissions & Security` trong **Coming next** cho guest và learner, chủ project cần mở **Supabase Dashboard → SQL Editor**, chọn đúng project, rồi chạy nội dung file [`backend/db/migrations/013_public_upcoming_courses.sql`](../backend/db/migrations/013_public_upcoming_courses.sql). Migration yêu cầu migrations 001–012 đã được áp dụng. Có thể kiểm tra trạng thái bằng:

```sql
select slug, status
from public.courses
where slug in ('shell-201', 'linux-security');
```

Cả hai khóa cần có `status = 'upcoming'`. Migration chỉ mở quyền đọc metadata khóa học; chapter và lesson vẫn theo policy hiện tại.

## Khởi động lại để đăng nhập

Đảm bảo Docker Desktop đang mở và Ubuntu được bật trong **Settings → Resources → WSL Integration**. Backend và frontend đều chạy trong WSL bằng user `bashlab`; chỉ runner là Docker container. Grafana và Prometheus không cần chạy để đăng nhập.

### Cửa sổ 1: backend

Trong Ubuntu, chuyển sang `bashlab` (bỏ qua nếu prompt đã là `bashlab@...`), rồi chạy:

```bash
sudo -iu bashlab
source ~/.nvm/nvm.sh
nvm use 22
cd /mnt/c/Bash_lab/backend
# Chỉ cần nếu container đang dừng:
docker start bashlab-box
npm run dev
```

`docker start` chỉ cần khi `bashlab-box` đã tồn tại nhưng đang dừng. Nếu container chưa từng được tạo, chạy `npm run runner:start` một lần thay cho `docker start`. Không chạy lại `npm ci` trừ khi dependencies chưa được cài hoặc lockfile đã đổi.

Chờ tới khi thấy `BashLab API listening`. Kiểm tra API trong cửa sổ Ubuntu thứ hai:

```bash
curl -i http://127.0.0.1:3001/health
```

Kết quả phải là HTTP `200` với `{"status":"ok"}`. Giữ cửa sổ backend mở.

### Cửa sổ 2: frontend

Mở Ubuntu mới, chuyển sang `bashlab`, kích hoạt Node 22 rồi chạy:

```bash
sudo -iu bashlab
source ~/.nvm/nvm.sh
nvm use 22
cd /mnt/c/Bash_lab/frontend
npm run dev -- --hostname 0.0.0.0 --port 3000
```

Chờ Next.js báo `Ready`, mở [http://localhost:3000](http://localhost:3000), rồi đăng nhập bằng tài khoản Supabase của project đã cấu hình. Trong `frontend/.env.local`, đặt `NEXT_PUBLIC_API_URL=http://127.0.0.1:3001`. Không dùng IP WSL vì địa chỉ đó có thể đổi khi WSL khởi động lại. Sau khi sửa `.env.local`, khởi động lại frontend.

Chỉ chạy frontend bằng lệnh WSL ở trên. Nếu trước đó đã chạy frontend từ PowerShell/Windows, dừng tiến trình Windows cũ bằng `Ctrl+C` trong cửa sổ của nó; nếu không, trình duyệt có thể vào nhầm Next.js Windows trên `localhost:3000` và nhận lỗi proxy cũ.

### Dừng tất cả

Nhấn `Ctrl+C` ở cả hai cửa sổ Node. Để tắt cả runner và monitoring containers, chạy:

```bash
docker stop bashlab-box bashlab-grafana bashlab-prometheus
```

Nếu cổng 3000 đã được dùng, tìm PID bằng `ss -ltnp 'sport = :3000'` rồi dừng đúng tiến trình cũ bằng `kill <PID>`. Chạy `npm` trong WSL; không dùng `node_modules` cài bằng Windows.

Chi tiết yêu cầu UID, Docker runner và giới hạn sandbox nằm trong [`backend/RUNNING.md`](../backend/RUNNING.md).
