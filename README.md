# BashLab

Tiếng Việt | [English](README.en.md)

BashLab là nền tảng học Bash qua bài học ngắn và thực hành. Frontend dùng Supabase Auth và database; backend Node.js cung cấp API sandbox Bash chạy trong Docker.

## Trạng thái triển khai

| Thành phần | Trạng thái trong mã nguồn |
| --- | --- |
| Trang chủ `/` | `app/(site)/page.js` render `components/landing/Lookbook.jsx`: giới thiệu, thử lệnh, phương pháp học, Shell 101 và FAQ; có thể bật/tắt Lookbook snap |
| Terminal trên trang chủ | Demo mô phỏng với câu trả lời có sẵn; không thực thi lệnh hệ điều hành |
| Hiệu ứng giao diện | Có Lookbook navigation, terminal thu/phóng và các thành phần hiệu ứng; có script kiểm tra curiosity/backdrop |
| Đăng nhập `/login` và đăng ký `/register` | Supabase Auth; sau đăng nhập learner về `/`, admin về `/admin/content` |
| Xác minh email và khôi phục mật khẩu | Supabase Auth gửi email xác minh/đặt lại mật khẩu và xử lý liên kết |
| Danh mục khóa học `/courses` | Đọc khóa học từ Supabase; `published` hiện là khóa đang mở, `upcoming` hiện trong Coming next cho guest và learner sau khi áp dụng migration 013 |
| My Learning `/my-learning` | Đọc tiến độ và hoạt động từ Supabase cho tài khoản hiện tại |
| Account & Security `/account` | Đọc/cập nhật hồ sơ và ảnh đại diện trong Supabase; hỗ trợ đặt lại mật khẩu và đăng xuất |
| Trang 404 | Có `app/not-found.js` |
| Giao diện 403 | Có `app/forbidden.js`; chưa có luồng phân quyền backend hay route riêng được triển khai để sử dụng giao diện này |
| Khóa học, bài học và trang quản trị | Có trang chi tiết khóa học, workspace bài học, quản lý nội dung, người dùng và hoạt động admin |
| Backend sandbox | Express API và Docker runner có hướng dẫn chạy trong [backend/RUNNING.md](backend/RUNNING.md); workspace hiện chưa gắn với tài khoản BashLab |

Trang landing có terminal mô phỏng; lệnh trên landing không chạy trên hệ điều hành. Trang thực hành dùng backend sandbox.

## Phân nhóm chức năng

| Nhóm | Mục đích | STT trang | Screen Stitch |
| --- | --- | --- | --- |
| A — Giới thiệu sản phẩm | Giới thiệu BashLab và dẫn vào khóa học | 01 | 01 |
| B — Xác thực tài khoản | Đăng nhập, đăng ký, xác minh email và khôi phục mật khẩu | 02–06 | 02–06 |
| C — Khám phá khóa học | Duyệt khóa học, xem giáo trình và tiến độ trong từng khóa | 07–08 | 07–08 |
| D — Học tập và thực hành | Theo dõi học tập cá nhân, tiếp tục bài và thực hành Bash | 09–10 | 09–10 |
| E — Tài khoản cá nhân | Xem thông tin tài khoản, yêu cầu đổi mật khẩu và đăng xuất | 11 | 12 |
| F — Quản trị nội dung | Quản lý khóa học, chương và soạn bài học | 12–13 | 14, 16 |
| G — Quản trị vận hành | Quản lý người dùng, phiên thực hành và nhật ký quản trị | 14–15 | 17–18 |
| H — Trang hệ thống | Thông báo truy cập không đủ quyền hoặc trang không tồn tại | 16–17 | 20–21 |

Các nhóm dùng để tổ chức tài liệu và công việc, không tạo thêm trang hay chức năng. F và G dành cho quản trị viên; H dùng chung theo tình huống truy cập. STT trang khác với mã Screen Stitch từ trang 11 trở đi.

## Danh mục 17 trang và chức năng theo thiết kế

Bảng dưới mô tả phạm vi yêu cầu, không phải danh sách tính năng đã hoàn thành.

| STT | Nhóm | Screen | Trang | Chức năng |
| --- | --- | --- | --- | --- |
| 01 | A | 01 | Landing | Giới thiệu sản phẩm; thử lệnh mô phỏng; giới thiệu Shell 101; FAQ; dẫn vào khóa học |
| 02 | B | 02 | Login | `/login` xác thực qua Supabase Auth; learner về landing page `/`, admin về `/admin/content` |
| 03 | B | 03 | Register | `/register` tạo tài khoản qua Supabase Auth và kiểm tra dữ liệu biểu mẫu |
| 04 | B | 04 | Verify Email | `/verify-email` xử lý xác minh và gửi lại email qua Supabase Auth |
| 05 | B | 05 | Forgot Password | `/forgot-password` gửi yêu cầu đặt lại mật khẩu qua Supabase Auth |
| 06 | B | 06 | Reset Password | `/reset-password` cập nhật mật khẩu qua Supabase Auth sau khi mở liên kết hợp lệ |
| 07 | C | 07 | Course Catalog | `/courses` đọc khóa từ Supabase; lọc All/Core Tracks/Security; khóa upcoming được hiển thị dạng Coming next |
| 08 | C | 08 | Course Overview | Giới thiệu khóa; kết quả học tập; giáo trình theo chương; tiến độ và trạng thái bài; tiếp tục học |
| 09 | D | 09 | My Learning | `/my-learning` hiển thị tiến độ và hoạt động tài khoản từ Supabase cùng liên kết danh mục khóa học |
| 10 | D | 10 | Interactive Lesson Workspace | Đọc bài; chuyển bài; mục tiêu và gợi ý; terminal sandbox; trạng thái phiên; Check Solution và phản hồi |
| 11 | E | 12 | Account | `/account` đọc và cập nhật hồ sơ Supabase, ảnh đại diện, cài đặt mật khẩu và đăng xuất |
| 12 | F | 14 | Content | Trang admin quản lý khóa/chương/bài, thứ tự và trạng thái xuất bản |
| 13 | F | 16 | Lesson Editor | Metadata bài; Markdown và xem trước; mục tiêu bài; mẫu kiểm tra; nháp/xuất bản; lưu/hủy |
| 14 | G | 17 | Users | Trang admin tìm kiếm người dùng, đổi vai trò và khóa/mở khóa tài khoản |
| 15 | G | 18 | Activity | Trang admin xem/dừng phiên và lọc nhật ký quản trị |
| 16 | H | 20 | Access Denied | Thông báo người dùng không đủ quyền truy cập |
| 17 | H | 21 | Page Not Found | Thông báo đường dẫn hoặc trang không tồn tại |

My Learning vẫn là một trang riêng. Hai tab Sessions và Admin log thuộc cùng trang Activity. Terminal thực hành thật chỉ nằm trong phạm vi Workspace; demo Landing là mô phỏng.

Xem diễn giải đầy đủ tại [bashlab-pages.md](bashlab-pages.md). Các liên kết ảnh `exports/stitch-2026-09-12/` trong tài liệu đó chưa có thư mục đính kèm trong repository này.

## Cấu trúc repository

```text
Bash_lab/
├── frontend/
│   ├── app/                 # App Router, layouts và giao diện lỗi
│   ├── components/
│   │   ├── courses/         # Danh mục khóa học
│   │   ├── landing/         # Lookbook và các phần landing page
│   │   ├── layout/          # Navbar, footer và khung trang dùng chung
│   │   └── shared/          # Thành phần giao diện dùng chung
│   ├── scripts/             # Kiểm tra curiosity và backdrop
│   ├── package.json
│   └── package-lock.json
├── backend/README.md        # Kế hoạch backend, chưa có implementation
├── bashlab-pages.md         # Đặc tả 17 trang theo Stitch
├── rule.md                  # Quy tắc làm việc và Git
├── README.md
└── .gitignore
```

## Công nghệ hiện có

Phiên bản khai báo trong [frontend/package.json](frontend/package.json):

- Next.js `14.2.5`, App Router.
- React và React DOM `18.3.1`.
- JavaScript/JSX, CSS Modules và global CSS.
- Three.js `^0.170.0`; Tailwind CSS `^3.4.13`, PostCSS, Autoprefixer.
- ESLint `8.57.0` và cấu hình Next.js.

Frontend dùng Supabase Auth/Postgres; backend dùng Node.js/Express và Docker sandbox. Xem [backend/RUNNING.md](backend/RUNNING.md) để chạy API và runner.

## Chạy frontend trên máy

Cần Git, Node.js/npm tương thích với phiên bản Next.js đã khóa và mạng để cài dependencies. Repository chưa khóa phiên bản Node bằng `.nvmrc` hoặc `engines`; khi cộng tác cần thống nhất phiên bản dùng trong môi trường kiểm thử.

```bash
git clone https://github.com/0viprorqiv0/Bashlab.git
cd Bashlab/frontend
npm ci
npm run dev
```

Tạo `frontend/.env.local` với project URL và anon key lấy từ Supabase **Project Settings → API**:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<publishable-anon-key>
```

Mở [localhost:3000](http://localhost:3000). Chạy các lệnh npm trong thư mục `frontend`; thư mục gốc không có `package.json`. Không đặt service-role key hoặc mật khẩu database trong frontend.

### Cập nhật schema Supabase

Các migration nằm trong `backend/db/migrations/` và cần được áp dụng theo thứ tự số trên database mới. Để bật danh sách Coming next cho guest và learner trên database đã có migrations 001–012, mở đúng project trong **Supabase Dashboard → SQL Editor**, chạy `backend/db/migrations/013_public_upcoming_courses.sql`, rồi xác nhận `shell-201` và `linux-security` có trạng thái `upcoming`. Migration chỉ công khai metadata của khóa; chapter và lesson vẫn theo policy hiện tại.

| Lệnh | Mục đích |
| --- | --- |
| `npm run dev` | Chạy development server |
| `npm run lint` | Kiểm tra ESLint |
| `npm run test:curiosity` | Chạy script kiểm tra curiosity |
| `npm run test:backdrop` | Chạy script kiểm tra backdrop |
| `npm run build` | Tạo production build |
| `npm run start` | Chạy production server sau build thành công |

Hai script kiểm tra hiện có không thay thế kiểm thử toàn bộ ứng dụng hoặc kiểm thử end-to-end. Để chạy bản production cục bộ:

```bash
npm run build
npm run start
```

## Làm việc theo nhánh

`main` là nhánh tích hợp. Tám nhánh `feature/a-...` đến `feature/h-...` tổ chức công việc theo bảng trong [rule.md](rule.md). Mỗi nhánh chứa toàn bộ cây dự án; phân nhóm không có nghĩa là chia tách hoặc xóa các thư mục của nhóm khác.

Luồng thông thường: nhánh tác vụ → nhánh nhóm → `main`, qua pull request và kiểm tra phù hợp. Đọc [rule.md](rule.md) trước khi sửa, commit hoặc merge.

## Dữ liệu và file không đưa lên Git

`.gitignore` loại dependencies, build/cache (kể cả `.next-*`), các file môi trường đã liệt kê, log, coverage và file IDE. Giữ `package-lock.json` trong Git để cài đặt tái lập.

Không commit mật khẩu, token, khóa riêng, dữ liệu người dùng hoặc bản dump chứa dữ liệu thật. Khi thêm tên file môi trường mới, kiểm tra `git check-ignore -v <file>`; không giả định mọi tên `.env.*` đều đã được bỏ qua.

## Quyền sử dụng

Proprietary — All rights reserved. Repository hiện chưa có file LICENSE cấp phép riêng.
