# BashLab

BashLab hướng tới việc học Bash qua bài học ngắn, thực hành và phản hồi theo mục tiêu. Repository hiện chứa bản frontend giới thiệu sản phẩm và tài liệu cho 17 trang thiết kế; chưa có backend hoặc sandbox Bash thật.

## Trạng thái triển khai

| Thành phần | Trạng thái trong mã nguồn |
| --- | --- |
| Trang chủ `/` | `app/(site)/page.js` render `components/lookbook/Lookbook.jsx`: giới thiệu, thử lệnh, phương pháp học, Shell 101 và FAQ |
| Terminal trên trang chủ | Demo mô phỏng với câu trả lời có sẵn; không thực thi lệnh hệ điều hành |
| Hiệu ứng giao diện | Có Lookbook navigation, terminal thu/phóng và các thành phần hiệu ứng; có script kiểm tra curiosity/backdrop |
| Trang 404 | Có `app/not-found.js` |
| Giao diện 403 | Có `app/forbidden.js`; chưa có luồng phân quyền backend hay route riêng được triển khai để sử dụng giao diện này |
| Xác thực, khóa học, học tập, tài khoản, quản trị | Có mô tả thiết kế; chưa có các route chức năng tương ứng trong cây `app/` |
| Backend, dữ liệu, email, sandbox | Mới có kế hoạch trong [backend/README.md](backend/README.md) |

Một số nội dung quảng bá trên giao diện nói về sandbox và lưu tiến độ theo định hướng sản phẩm. Chúng chưa chứng minh các dịch vụ này hoạt động. Các liên kết như `/login`, `/courses`, `/courses/shell-101` chưa có trang đích tương ứng.

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
| 02 | B | 02 | Login | Nhập email/mật khẩu; hiện/ẩn mật khẩu; ghi nhớ thiết bị; trạng thái xử lý và lỗi; liên kết đăng ký/quên mật khẩu |
| 03 | B | 03 | Register | Nhập email, mật khẩu và xác nhận; kiểm tra dữ liệu; gửi yêu cầu tạo tài khoản; lỗi từng trường |
| 04 | B | 04 | Verify Email | Hướng dẫn kiểm tra email; gửi lại có thời gian chờ; xử lý xác minh thành công hoặc liên kết hết hạn/không hợp lệ |
| 05 | B | 05 | Forgot Password | Yêu cầu email đặt lại mật khẩu; thông báo trung lập về tài khoản; gửi lại/thử lại khi lỗi |
| 06 | B | 06 | Reset Password | Nhập và xác nhận mật khẩu mới; kiểm tra liên kết; xử lý lỗi/thành công; quay lại đăng nhập |
| 07 | C | 07 | Course Catalog | Danh sách khóa học; lọc All/Core Tracks/Security; cấp độ, thời lượng, tiến độ và trạng thái sắp ra mắt |
| 08 | C | 08 | Course Overview | Giới thiệu khóa; kết quả học tập; giáo trình theo chương; tiến độ và trạng thái bài; tiếp tục học |
| 09 | D | 09 | My Learning | Tổng quan học tập; tiếp tục bài; thời gian học, hoạt động, số lệnh và tiến độ kỹ năng |
| 10 | D | 10 | Interactive Lesson Workspace | Đọc bài; chuyển bài; mục tiêu và gợi ý; terminal sandbox; trạng thái phiên; Check Solution và phản hồi |
| 11 | E | 12 | Account | Thông tin tài khoản, email, xác minh và vai trò chỉ đọc; yêu cầu đổi mật khẩu qua email; đăng xuất |
| 12 | F | 14 | Content | Cây khóa/chương/bài; tạo và sửa nội dung; sắp xếp thứ tự; trạng thái xuất bản; mở trình soạn bài |
| 13 | F | 16 | Lesson Editor | Metadata bài; Markdown và xem trước; mục tiêu bài; mẫu kiểm tra; nháp/xuất bản; lưu/hủy |
| 14 | G | 17 | Users | Tìm kiếm/phân trang; đổi vai trò; khóa/mở khóa; xác nhận và lý do; bảo vệ quản trị viên hoạt động cuối cùng |
| 15 | G | 18 | Activity | Tab Sessions quản lý và dừng phiên có lý do; tab Admin log lọc/xem chi tiết nhật ký |
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
│   │   ├── lookbook/        # Giao diện trang chủ đang được sử dụng
│   │   └── landing/         # Các component landing có sẵn
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

Backend dự kiến dùng Node.js/Express, PostgreSQL, REST/WebSocket và Docker sandbox. Đây là định hướng, chưa có dịch vụ chạy trong repository.

## Chạy frontend trên máy

Cần Git, Node.js/npm tương thích với phiên bản Next.js đã khóa và mạng để cài dependencies. Repository chưa khóa phiên bản Node bằng `.nvmrc` hoặc `engines`; khi cộng tác cần thống nhất phiên bản dùng trong môi trường kiểm thử.

```bash
git clone https://github.com/0viprorqiv0/Bashlab.git
cd Bashlab/frontend
npm ci
npm run dev
```

Mở [localhost:3000](http://localhost:3000). Chạy các lệnh npm trong thư mục `frontend`; thư mục gốc không có `package.json`. Frontend hiện chưa yêu cầu cấu hình database hoặc email để chạy demo.

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
