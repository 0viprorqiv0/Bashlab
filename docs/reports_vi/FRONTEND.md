# BashLab — Frontend

> Mã nguồn: `frontend/`. Công nghệ: **Next.js 14.2** (App Router), **React 18.3**, CSS Modules (có Tailwind ở một vài component), **Three.js** (nền hạt), **Lenis** (cuộn mượt, chỉ trang chủ), **react-markdown**, **Playwright** (test E2E), ESLint.
> Quy mô: khoảng 15.700 dòng JS/JSX (83 file) và 29 file CSS Module.

## 1. Các trang (22 route, kết quả `npm run build`)
| Nhóm | Route | Chức năng | Ai vào được |
|---|---|---|---|
| Công khai | `/` | Landing: giới thiệu, terminal mô phỏng (tab-completion, lịch sử, root/guest), bảng giá, đánh giá | Mọi người |
| | `/courses` | Danh mục khoá: khoá đang mở + khoá "sắp ra" | Mọi người |
| | `/blog`, `/blog/[slug]` | Blog (đọc bài Markdown) | Mọi người |
| | `/about`, `/terms`, `/checkout` | Giới thiệu, điều khoản, thanh toán (giao diện) | Mọi người |
| Xác thực | `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email` | Đăng nhập, đăng ký, khôi phục mật khẩu, xác minh email | Khách |
| Học viên | `/courses/[slug]` | Chuyển hướng: khách → đăng nhập; đã đăng nhập → vào bài lab chưa xong đầu tiên | Cần đăng nhập |
| | `/courses/[slug]/labs/[labId]` | **Lab Workspace**: đề bài, terminal thật, ô nộp flag | Cần đăng nhập |
| | `/my-learning`, `/account` | Tiến độ, biểu đồ hoạt động; hồ sơ cá nhân | Cần đăng nhập |
| Quản trị | `/admin/content`, `/admin/studio` | **Content Studio** (soạn khoá/chương/bài kiểu VSCode, xem trước, tự lưu) | Admin |
| | `/admin/lessons/[id]` | Trình soạn bài có cấu trúc | Admin |
| | `/admin/users` | Quản lý người dùng: vai trò, khoá tài khoản (bắt buộc nhập lý do) | Admin |
| | `/admin/activity` | Dashboard (9 biểu đồ), phiên đang chạy, nhật ký quản trị | Admin |

## 2. Cách frontend nói chuyện với backend và Supabase
```
Đọc dữ liệu (khoá học, bài, tiến độ):  trình duyệt ── anon key + token ──▶ Supabase  (RLS lọc từng dòng)
Ghi dữ liệu / sandbox / admin:          trình duyệt ── Bearer token ──▶ Backend API ──▶ Supabase (service_role)
Đăng nhập, đăng ký, hồ sơ:              trình duyệt ──▶ /api/auth/* của backend (không gọi thẳng Supabase Auth)
```
- `lib/supabaseClient.js`: client **chỉ để đọc** (tắt `supabase.auth`, lấy token từ `authClient`).
- `lib/writeApi.js`: mọi thao tác ghi (`progressApi`, `adminApi`, `labApi.submitFlag`).
- `lib/sandbox.js`: `createSession`, `runCommand`, `resetSession`, `endSession` (gửi `DELETE` kèm `keepalive` khi đóng tab).
- `lib/authClient.js`: quản lý phiên (xem mục 3).

## 3. Quản lý phiên đăng nhập (an toàn trước XSS)
- **Access token (≈ 1 giờ) chỉ nằm trong RAM** của trang; **không ghi `localStorage`** (chỉ lưu `bashlab.uid`, một gợi ý không bí mật).
- **Refresh token** là **cookie HttpOnly** (`SameSite=Lax`, đường dẫn `/api/auth`, 30 ngày, `Secure` khi chạy production): JavaScript của trang không đọc được, nên tin tặc chèn script cũng không lấy được.
- `getAccessToken()` tự làm mới khi còn dưới 60 giây; đăng xuất ở một tab lan sang các tab khác (sự kiện `storage`).
- Admin khoá tài khoản thì người dùng bị đăng xuất ở yêu cầu kế tiếp.

## 4. Lab Workspace — trang quan trọng nhất
`components/workspace/LabWorkspace.jsx`:
- Bố cục hai cột (đề bài | terminal), có thanh kéo chia, thanh bên kiểu ChatGPT (Lessons / Instructions / Solution), chế độ phóng to terminal.
- **Terminal thật**: gõ lệnh → `POST /api/sessions/:id/execute`; lịch sử lệnh (↑/↓), `Ctrl+L` xoá màn hình, giữ thư mục hiện tại giữa các lệnh; các nút **Stop / Restart / Maximize**.
- **Vòng đời instance** được xử lý cẩn thận: tự mở khi vào lab; chống rò khi React StrictMode mount hai lần (số "thế hệ" bỏ qua lần mở đã lỗi thời); đóng tab thì dọn (`pagehide`); khôi phục khi bấm Back (`pageshow`); báo và cho khởi động lại khi session hết hạn.
- **Ô "Submit flag"** dưới terminal: nộp flag, báo đúng/sai, khoá ô khi lab đã solved; không bị nhảy focus về terminal khi bấm vào.
- Checklist các bước **chỉ là gợi ý tiến độ**: tick đủ hay gõ đủ lệnh không hoàn thành lab, chỉ flag mới hoàn thành.
- Nếu API chưa bật sandbox, trang báo rõ thay vì giả vờ chạy.

## 5. Bảo vệ trang
- Trang cần đăng nhập: khách bị chuyển tới `/login?next=<trang đang vào>` (có test E2E); trang admin kiểm vai trò ở `AdminGate`, người không đủ quyền thấy trang 403.
- Nút **Start learning** (landing và danh mục): khách → đăng nhập kèm đường quay lại, người đã đăng nhập → vào thẳng lab theo **tiến độ thật** (không dựa trên dữ liệu mẫu).

## 6. Bảo mật phía trình duyệt (`frontend/next.config.mjs`)
Header trên mọi trang: **Content-Security-Policy** (`default-src 'self'`, chỉ cho phép kết nối tới chính mình, API và Supabase; `frame-ancestors 'none'`; `object-src 'none'`), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, `Cross-Origin-Opener-Policy`, và HSTS ở bản production. Tắt `X-Powered-By`.

## 7. Hiệu năng (số đo bản build thật)
Kết quả `npm run build`, **JS tải lần đầu** (First Load JS) — phần dùng chung cho mọi trang chỉ **87,9 kB**:

| Trang | Riêng trang | First Load JS |
|---|---|---|
| `/` (landing) | 29,5 kB | 126 kB |
| `/login` | 2,87 kB | 104 kB |
| `/courses` | 2,89 kB | 169 kB |
| `/courses/[slug]/labs/[labId]` (lab) | 12,3 kB | 213 kB |
| `/my-learning` | 3,89 kB | 169 kB |
| `/admin/activity` | 11 kB | 164 kB |
| `/admin/content` (Studio) | 6,15 kB | 222 kB |

Các tối ưu đã làm (xem thêm [BENCHMARK.md](BENCHMARK.md)):
- **Lenis chỉ chạy ở trang chủ** (các trang khác dùng cuộn gốc của trình duyệt).
- Nền hạt WebGL: **chỉ dựng khi nhìn thấy, tự dừng khi không thấy**, giới hạn pixel ratio 1,5, bật GPU tiết kiệm điện, **tắt hẳn khi hệ điều hành bật "giảm chuyển động"**.
- Font qua `next/font` (không chặn hiển thị); biểu tượng giảm từ khoảng 1,1 MB xuống khoảng 320 KB.
- `AuthProvider` dùng chung một lần xác thực thay vì mỗi trang tự gọi; dữ liệu trang tải **song song** với bước xác minh danh tính.
- Tách mã theo trang (các trang admin và Three.js không nằm trong gói của trang học viên).

## 8. Kiểm thử và chất lượng
- **Playwright E2E: 112 test pass** (+5 test luồng sandbox thật chạy riêng bằng `E2E_SANDBOX=1`, đã chạy 6/6 pass với runner thay thế). Chạy trên Supabase và backend thật, tự tạo rồi dọn tài khoản test; không dùng mock.
- Phủ: đăng nhập/đăng ký/khôi phục, phiên trình duyệt (không có token trong web storage, cookie HttpOnly, đăng xuất đồng bộ tab), phân quyền (RLS, RPC admin bị từ chối), tiến độ, nộp flag, luồng admin (soạn nội dung, người dùng, dashboard), khách bị chuyển hướng, nút Start learning.
- `npm run lint` sạch; `npm run build` thành công.

## 9. Còn thiếu / giới hạn
- Trang `/checkout` mới là giao diện (chưa nối Stripe).
- Bản `npm audit` của frontend còn lỗ hổng của chính **Next.js 14** (8 mục: 7 mức cao, 1 nghiêm trọng); sửa triệt để cần nâng lên Next 16 (thay đổi lớn, chưa làm).
- Content Studio: ở màn hình 1280 px, tab "Hints" bị ô chọn độ khó che một phần.
