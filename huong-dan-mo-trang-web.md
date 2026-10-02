# Hướng dẫn mở trang web BashLab

Hướng dẫn chạy trang web trên máy Windows với dự án nằm tại `C:\Bash_lab`.

## 1. Chuẩn bị

- Cài Node.js và npm nếu máy chưa có.
- Mở PowerShell hoặc Terminal trong VS Code.
- Kiểm tra bằng hai lệnh:

```powershell
node --version
npm --version
```

Nếu không nhận diện được lệnh, cài Node.js rồi mở lại terminal.

## 2. Cài thư viện frontend

```powershell
cd C:\Bash_lab\frontend
npm ci
```

Chạy `npm ci` ở lần đầu hoặc khi file `package-lock.json` thay đổi. Các lệnh npm của frontend phải chạy trong thư mục `frontend`.

## 3. Cấu hình môi trường

Nếu đã có `frontend/.env.local`, giữ cấu hình hiện tại. Nếu chưa có, chạy trong thư mục `frontend`:

```powershell
Copy-Item .env.local.example .env.local
notepad .env.local
```

Điền thông tin Supabase của dự án vào hai biến sau; giữ các biến khác trong file mẫu theo môi trường đang dùng:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key-cua-du-an>
API_PROXY_TARGET=http://127.0.0.1:3001
```

Thay các giá trị trong dấu `<...>` bằng thông tin thật. Không dùng service-role key trong frontend. Khởi động lại frontend sau khi sửa file môi trường.

## 4. Chạy và mở trang web

Trong terminal đang ở `C:\Bash_lab\frontend`, chạy:

```powershell
npm run dev
```

Giữ terminal này mở. Đợi server báo sẵn sàng, rồi mở Chrome, Edge hoặc Firefox và truy cập:

**[http://localhost:3000](http://localhost:3000)**

Có thể mở bằng một cửa sổ PowerShell khác:

```powershell
Start-Process "http://localhost:3000"
```

Nếu terminal hiển thị cổng khác, ví dụ `3001`, hãy mở đúng địa chỉ ở dòng `Local` mà server in ra.

## 5. Backend và dữ liệu

Frontend chạy được không có nghĩa toàn bộ chức năng đã sẵn sàng. Các chức năng dùng API cần backend hoạt động; phần đọc dữ liệu Supabase cần cấu hình và database tương ứng.

Backend mặc định dùng cổng `3001`. Xem [hướng dẫn chạy backend](backend/RUNNING.md) để chuẩn bị Linux/WSL, Docker và runner. Backend sandbox có yêu cầu riêng; không chạy trực tiếp các lệnh Linux đó trong PowerShell.

Nếu backend chạy trong WSL, đặt `API_PROXY_TARGET` thành địa chỉ backend mà tiến trình Next.js truy cập được. Tránh để frontend và backend dùng cùng cổng.

## 6. Mở lại và dừng trang web

Những lần sau, nếu thư viện và cấu hình đã có, chỉ cần:

```powershell
cd C:\Bash_lab\frontend
npm run dev
```

Sau đó mở địa chỉ server trong trình duyệt. Để dừng, nhấn **Ctrl + C** trong terminal đang chạy frontend.

## 7. Lỗi thường gặp

| Hiện tượng | Cách xử lý |
| --- | --- |
| `npm` hoặc `node` không được nhận diện | Cài Node.js và mở lại terminal. |
| Báo không tìm thấy `package.json` | Chuyển vào `C:\Bash_lab\frontend` trước khi chạy npm. |
| Trình duyệt báo không thể kết nối | Kiểm tra `npm run dev` còn chạy, đợi server sẵn sàng và mở đúng cổng ở dòng `Local`. |
| Cổng `3000` đang được sử dụng | Dùng địa chỉ server thông báo, hoặc chạy `npm run dev -- --port 3005` rồi mở `http://localhost:3005`. |
| Lỗi Supabase hoặc không có dữ liệu khóa học | Kiểm tra `.env.local` và database của dự án; xem phần cấu hình trong [README](README.md). |
| API báo lỗi kết nối | Kiểm tra backend đã chạy và `API_PROXY_TARGET` trỏ đúng địa chỉ; khởi động lại frontend sau khi sửa biến. |
