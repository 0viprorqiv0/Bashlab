# BashLab — API & Data Contract (backend side)

Tài liệu này mô tả những gì backend đã chuẩn bị và cách frontend sẽ tiêu thụ.
Không có phần nào trong đây đã được nối vào `frontend/` — đây là bàn giao, chưa
phải đã tích hợp.

## 1. Auth (Supabase, gọi thẳng từ frontend, không qua Express)

Frontend dùng `@supabase/supabase-js` với `NEXT_PUBLIC_SUPABASE_URL` +
`NEXT_PUBLIC_SUPABASE_ANON_KEY` (lấy từ Project Settings > API, key `anon`).

| Hành động | Hàm | Ghi chú |
|---|---|---|
| Đăng ký (Screen 03) | `supabase.auth.signUp({ email, password })` | Supabase tự gửi mail xác minh |
| Đăng nhập (Screen 02) | `supabase.auth.signInWithPassword({ email, password })` | |
| Quên mật khẩu (Screen 05) | `supabase.auth.resetPasswordForEmail(email)` | Luôn trả thành công dù email có tồn tại hay không — đúng yêu cầu "thông báo trung lập" |
| Đặt lại mật khẩu (Screen 06) | `supabase.auth.updateUser({ password })` | Gọi sau khi user bấm link trong mail, Supabase tự set session tạm |
| Xác minh email (Screen 04) | không cần gọi gì thêm | Supabase xử lý qua link redirect, chỉ cần trang đích hiển thị trạng thái |
| Lấy user hiện tại / role | `supabase.auth.getUser()` + `select role from profiles` | `profiles.role` là `'learner'` hoặc `'admin'` |

Row `profiles` được **tự động tạo** khi `signUp` thành công (trigger DB), không cần frontend tự insert.

## 2. Đọc dữ liệu khoá học (Screen 07, 08, 09)

Đọc thẳng qua `supabase-js`, cần user đã đăng nhập (có access token):
```js
supabase.from('courses').select('*, chapters(*, lessons(*))').eq('status', 'published')
```
**RLS đã bật cho việc đọc course/chapter/lesson đã publish** (xem
[`db/migrations/006_rls_policies.sql`](../db/migrations/006_rls_policies.sql), đã
test bằng user giả — learner chỉ thấy `published`, không thấy `draft`; admin
thấy tất cả). Nếu FE thấy trả về rỗng dù dữ liệu có tồn tại, khả năng cao là
gọi bằng client chưa gắn access token, không phải bug ở DB.

Đã chạy `db/seed/001_dev_seed.sql` — có sẵn 3 course khớp đúng dữ liệu FE đang
mock trong `CourseCatalog.jsx`: `shell-101` (published), `shell-201` và
`linux-security` (draft, chỉ admin thấy). Cột mới: `courses.category`
(`'Core Track'` / `'Security'`), `courses.duration_minutes`. Content UI
(Screen 12) chưa có route ghi nào ngoài `service_role`/SQL trực tiếp — admin
CRUD thẳng qua `supabase-js` được luôn nhờ RLS `for all` đã có.

**Tính % tiến độ 1 course cho user hiện tại** — dùng RPC thay vì tự đếm ở FE:
```js
const { data } = await supabase.rpc('get_course_progress', { p_course_id: courseId });
// data[0] = { total_lessons, completed_lessons }
```

## 2b. Account page (Screen 11) — đã thêm field ngoài đặc tả gốc theo yêu cầu

`profiles` có thêm `name`, `bio`, `avatar_url` — **learner tự sửa được 3 cột
này của chính mình** qua `supabase.from('profiles').update({...}).eq('id', user.id)`.
Cố gửi kèm `role`/`is_locked`/`email` trong cùng update sẽ bị Postgres từ chối
(permission denied for column) — không phải bug, là cố ý chặn tự nâng quyền.

`avatarUrl` hiện **chỉ là 1 cột text lưu URL**, chưa có chỗ upload ảnh thật
(chưa tạo Supabase Storage bucket) — nếu Account page cần upload file thật
(không chỉ dán URL), cần báo trước để tôi tạo bucket + policy riêng.

`stats` (completedCourses, totalCourses, completedLessons, practiceHours,
streakDays) trên Account mock **chưa có nguồn dữ liệu nào ở DB** — `completedLessons`
suy ra được từ `progress`, còn `practiceHours`/`streakDays` cần dữ liệu từ
sandbox (thời gian phiên thực hành) mà hiện `practice_sessions` chưa được ghi
tự động — để sau khi quyết việc nối sandbox.

## 3. Sandbox API (Express — CHƯA đổi, giữ nguyên như hiện tại)

`POST /api/sessions`, `POST /api/sessions/:id/execute`, `POST /api/sessions/:id/check`,
`POST /api/sessions/:id/reset`, `DELETE /api/sessions/:id` — **không yêu cầu auth
hiện tại**, hoạt động y như trước (demo Landing vẫn dùng ẩn danh được).

Middleware xác thực đã viết sẵn ở [`src/middleware/auth.js`](../src/middleware/auth.js)
(`requireAuth`, `requireAdmin`) nhưng **chưa được gắn vào `server.js`** — quyết
định gắn vào đâu (route nào bắt buộc login, route nào giữ ẩn danh cho demo
Landing) cần bàn trước vì có thể ảnh hưởng tới Screen 10 (Workspace) đang chạy
sandbox thật.

## 4. Việc còn để ngỏ (không tự quyết, cần thống nhất trước khi code tiếp)

- ~~RLS policies đọc cơ bản~~ — **đã xong**, xem mục 2.
- ~~RLS vs RPC cho hành động admin~~ — **đã xong, chọn RPC**. Users/Activity (14–15)
  dùng `supabase.rpc('admin_set_user_role', { target, new_role, reason })` và
  `admin_set_user_lock({ target, locked, reason })`. Cả 2 tự chặn không cho
  khoá/hạ quyền admin hoạt động cuối cùng, và tự ghi `admin_logs`. Đã test bằng
  user giả: learner gọi RPC bị từ chối, admin gọi được và có log, không ai hạ/khoá
  được admin cuối cùng.
- `admin_stop_session` (dừng phiên thực hành ở Activity) — **chưa làm**, chờ
  quyết định có nối `practice_sessions` với sandbox thật hay không.
- Có gắn `requireAuth` vào sandbox API hay không, và nếu có thì áp dụng cho route
  nào (chỉ Workspace thật, hay cả demo Landing).
- Supabase Storage bucket cho avatar upload thật (nếu Account cần, xem mục 2b).

## 5. Biến môi trường frontend cần (không phải việc của backend dev, chỉ ghi chú)

```
NEXT_PUBLIC_SUPABASE_URL=<Project URL>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
```
