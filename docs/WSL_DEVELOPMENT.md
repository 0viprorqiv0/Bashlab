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
cp .env.local.example .env.local
nano .env.local
```

Điền `NEXT_PUBLIC_SUPABASE_URL` và `NEXT_PUBLIC_SUPABASE_ANON_KEY` từ đúng project Supabase. Giữ `NEXT_PUBLIC_SANDBOX_API_URL=http://127.0.0.1:3001` để terminal trong bài học gọi API local. Chỉ dùng anon/publishable key ở frontend; không đặt service-role key hay mật khẩu database trong `.env.local`.

Để hiện hai khóa `Shell 201` và `Linux Permissions & Security` trong **Coming next** cho guest và learner, chủ project cần mở **Supabase Dashboard → SQL Editor**, chọn đúng project, rồi chạy nội dung file [`backend/db/migrations/013_public_upcoming_courses.sql`](../backend/db/migrations/013_public_upcoming_courses.sql). Migration yêu cầu migrations 001–012 đã được áp dụng. Có thể kiểm tra trạng thái bằng:

```sql
select slug, status
from public.courses
where slug in ('shell-201', 'linux-security');
```

Cả hai khóa cần có `status = 'upcoming'`. Migration chỉ mở quyền đọc metadata khóa học; chapter và lesson vẫn theo policy hiện tại.

## Chạy backend và runner

Mở cửa sổ Ubuntu riêng. Mỗi cửa sổ mới cần kích hoạt Node:

```bash
sudo -iu bashlab
source ~/.nvm/nvm.sh
nvm use 22
cd /mnt/c/Bash_lab/backend
```

Chỉ chạy lệnh cài dependencies lần đầu hoặc sau khi `package-lock.json` thay đổi:

```bash
npm ci
```

Tạo container lần đầu khi `bashlab-box` chưa có:

```bash
npm run runner:start
```

Nếu container đã tồn tại nhưng đang dừng:

```bash
docker start bashlab-box
```

Sau đó khởi động API:

```bash
npm run dev
```

Kiểm tra API bằng `curl http://localhost:3001/health`; kết quả mong đợi có `"status":"ok"`. Giữ cửa sổ này mở trong lúc dùng terminal thực hành.

## Chạy frontend

Mở cửa sổ Ubuntu thứ hai và chạy:

```bash
sudo -iu bashlab
source ~/.nvm/nvm.sh
nvm use 22
cd /mnt/c/Bash_lab/frontend
npm run dev -- --hostname 0.0.0.0 --port 3000
```

Chỉ chạy `npm ci` lần đầu hoặc sau khi lockfile thay đổi. Mở [http://localhost:3000](http://localhost:3000) trên Windows. Sau khi sửa `.env.local`, khởi động lại frontend để Next.js nạp cấu hình.

Nếu gặp `EADDRINUSE` trên cổng 3000, tìm tiến trình đang nghe:

```bash
ss -ltnp 'sport = :3000'
```

Kiểm tra PID trong kết quả rồi dừng đúng tiến trình cũ bằng `kill <PID>`, sau đó chạy lại frontend.

## Dừng và khởi động lại

- Nhấn `Ctrl+C` trong cửa sổ backend và frontend để dừng hai tiến trình Node.
- Có thể để `bashlab-box` chạy. Nếu đã dừng container thì chạy `docker start bashlab-box` trước `npm run dev` ở backend.
- Chạy `npm` trong WSL cho cả hai dự án; không trộn `node_modules` cài bằng Windows với WSL.

Chi tiết yêu cầu UID, Docker runner và giới hạn sandbox nằm trong [`backend/RUNNING.md`](../backend/RUNNING.md).
