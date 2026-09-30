# BashLab — API & Data Contract (backend side)

Tài liệu này mô tả những gì backend đã chuẩn bị và cách frontend sẽ tiêu thụ.
Không có phần nào trong đây đã được nối vào `frontend/` — đây là bàn giao, chưa
phải đã tích hợp.

## 1. Auth — qua backend API (`/api/auth/*`), frontend KHÔNG gọi Supabase Auth

Từ 2026-09-30 mọi thao tác đăng nhập/tài khoản đi qua Express
(`backend/src/routes/auth.js` → `services/authService.js`); trình duyệt không
còn gọi `supabase.auth.*` (client Supabase ở frontend được cấu hình
`accessToken` nên gọi auth sẽ throw). Frontend chỉ giữ token do API trả về
(`lib/authClient.js`, localStorage `bashlab.session`) và dùng nó cho các truy
vấn dữ liệu qua Supabase + RLS.

Lỗi luôn có dạng `{ "error": { "code": "...", "message": "..." } }`.

| Endpoint | Auth | Body → kết quả |
|---|---|---|
| `POST /api/auth/register` | – | `{email, password}` → 202 `{status:'verification_sent'}`. Giống hệt nhau cho email mới và email đã có (chống dò tài khoản), không bao giờ trả session |
| `POST /api/auth/login` | – | `{email, password}` → `{session:{access_token,refresh_token,expires_at,expires_in}, user, profile:{name,role}}`. Lỗi: 401 `INVALID_CREDENTIALS` (không phân biệt sai mật khẩu/không có user), 403 `EMAIL_NOT_CONFIRMED`, 403 `ACCOUNT_LOCKED`, 429 |
| `POST /api/auth/refresh` | – | `{refresh_token}` → `{session}`; 401 nếu token bị thu hồi |
| `POST /api/auth/logout` | Bearer | thu hồi session hiện tại |
| `POST /api/auth/forgot-password` | – | `{email}` → luôn 200 `{status:'sent'}` |
| `POST /api/auth/resend-verification` | – | `{email}` → luôn 200 |
| `POST /api/auth/reset-password` | Bearer = **token trong link mail** | `{password}`. Token đăng nhập thường bị từ chối (403 `RECOVERY_REQUIRED`); link quá 1 giờ → 401 `RECOVERY_EXPIRED`; thành công thì thu hồi mọi session |
| `GET /api/auth/me` | Bearer | `{user, profile:{name,role}}`; 403 nếu tài khoản bị khoá |
| `GET /api/auth/profile` | Bearer | hồ sơ đầy đủ (bio, avatar_url, age, location, occupation) |
| `PATCH /api/auth/profile` | Bearer | chỉ nhận `name, bio, age, location, occupation, avatar_url` (validate ở server; `role`, `is_locked`, `email`, `id` bị từ chối 400). Avatar: data URL png/jpeg/webp ≤ 300k ký tự |

Giới hạn: theo IP (300/phút chung, 60/phút cho login/register/forgot/resend/reset)
và **8 lần login/phút cho mỗi cặp (IP, email)**; chỉnh bằng
`AUTH_RATE_LIMIT_GENERAL|SENSITIVE|LOGIN`. Link trong email luôn trỏ về origin
nằm trong `CORS_ORIGINS` (Origin lạ bị thay bằng origin đầu tiên).

Luồng link email: Supabase xác minh link rồi chuyển về
`/verify-email#access_token=…` hoặc `/reset-password#access_token=…&type=recovery`.
Frontend đọc token từ fragment, xoá nó khỏi thanh địa chỉ ngay, rồi gọi
`/api/auth/me` (verify → đăng nhập luôn) hoặc `/api/auth/reset-password`.

Cột `profiles` **không còn UPDATE được từ trình duyệt** (migration 016); ghi hồ
sơ chỉ qua `PATCH /api/auth/profile` (service role, whitelist cột). Đổi
role/khoá tài khoản vẫn chỉ qua RPC admin (009/012).

Row `profiles` được **tự động tạo** khi `signUp` thành công (trigger DB).

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

`profiles` có thêm `name`, `bio`, `avatar_url`, `age`, `location`, `occupation`
(migration 007, 011) — **learner tự sửa được các cột này của chính mình**. Cố gửi
kèm `role`/`is_locked`/`email` sẽ bị Postgres từ chối (permission denied for
column) — cố ý chặn tự nâng quyền.

Avatar: FE đọc file ảnh thành base64 và lưu thẳng vào `avatar_url` (text).
Thống kê học tập (bài xong, giờ học, streak) nằm ở My Learning, không ở Account.

## 3. Sandbox API (Express — CHƯA đổi, giữ nguyên như hiện tại)

`POST /api/sessions`, `POST /api/sessions/:id/execute`, `POST /api/sessions/:id/check`,
`POST /api/sessions/:id/reset`, `DELETE /api/sessions/:id` — **không yêu cầu auth
hiện tại**, hoạt động y như trước.

**Đã nối vào Workspace** (`/learn/[course]/[lesson]`, [`frontend/lib/sandbox.js`](../../frontend/lib/sandbox.js)),
bật bằng `NEXT_PUBLIC_SANDBOX_API_URL`. Không set → terminal báo "Sandbox not
configured", bài có chấm tự động cho "Mark complete anyway". `check` nhận
`lessonId` = `lessons.test_template.verifier` (key trong `taskVerifier.js`).
Terminal ở Landing **cố ý là mô phỏng** (đúng `bashlab-pages.md`), không gọi API.

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
- ~~`admin_stop_session`~~ — **đã xong** (migration 012): dừng phiên có lý do bắt buộc + ghi log.
- `admin_set_user_lock` giờ **chặn đăng nhập thật** (đặt `auth.users.banned_until`
  = +100 năm; không dùng `'infinity'` vì Supabase Auth không parse được).
- `admin_list_users(p_search, p_limit, p_offset)` — danh sách user kèm trạng thái
  xác minh email / lần đăng nhập cuối (nằm ở `auth.users`, client không đọc trực tiếp được).
- `practice_sessions` được Workspace tự ghi (tạo khi mở sandbox, cập nhật mỗi lệnh,
  `stopped` khi rời trang) → nguồn dữ liệu cho My Learning (giờ học, streak) và Activity.
- Có gắn `requireAuth` vào sandbox API hay không — vẫn để ngỏ, không bắt buộc cho đồ án.
- Avatar lưu base64 trong `avatar_url` (text) — không cần Storage bucket.

## 5. Course Overview / Workspace — đã đổi hẳn sang UI "Lab" mới

FE làm lại toàn bộ 2 trang này (`CourseDetail.jsx`, `LabWorkspace.jsx`, style
LeetCode: danh sách lab có category/tag/difficulty/chấm điểm, terminal 50/50).
Bản mới lúc merge vào chỉ là mock (đọc `frontend/data/labsData.js`, terminal giả
lập). Đã nối lại toàn bộ:
- `lessons` có thêm cột `category, tag, difficulty, commands text[], lab jsonb`
  (migration 014) — `lab` chứa `{scenario, steps, commandSyntax, examples, hint,
  solutionExplanation}`. Chỉ lesson có `category` mới hiện trong bảng lab.
- 12 lab gốc từ `labsData.js` đã nạp vào DB thật qua `backend/scripts/seed-labs.mjs`
  (chạy lại được, đọc thẳng file JS của FE — không hard-code JSON trong SQL).
- 2 lesson có sẵn (`hello-bashlab`, `files-03`) được nâng cấp thêm field lab để
  vẫn hiện trong danh sách, **và vẫn chấm tự động thật** qua `test_template.verifier`
  — cột "Grading" trên bảng lab phân biệt `Auto-checked` (gọi sandbox thật)
  với `Manual` (learner tự tick từng bước, `Check Solution` ghi `progress` thật).
- 7 lesson tutorial cũ không có field lab đã set `status='draft'` (không hiện ở
  đâu nữa) — nội dung vẫn còn trong DB, không mất, chỉ ẩn khỏi UI mới.
- Route đổi: `/learn/[course]/[lesson]` (cũ) → `/courses/[slug]/labs/[labSlug]`
  (mới, `labId` param thực chất nhận **slug**, không phải số). File cũ
  `CourseOverview.jsx`/`LessonWorkspace.jsx`/route `/learn` đã xoá hẳn — không
  còn nơi nào trỏ tới, không phải dead code sót lại.
- Admin Lesson Editor (`/admin/lessons/[id]`) đã thêm ô sửa category/tag/
  difficulty/commands + 1 ô JSON thô cho `lab` (chưa làm form tách trường —
  đủ dùng, không phải ưu tiên UX cho đồ án).

## 6. Trang đã nối (tổng hợp)

| Trang | Route | Nguồn dữ liệu |
|---|---|---|
| Login/Register/Verify/Forgot/Reset | `/login` ... `/reset-password` | Supabase Auth |
| Course Catalog / Detail | `/courses`, `/courses/[slug]` | `courses/chapters/lessons` (chỉ lesson có `category`) + `progress` |
| My Learning | `/my-learning` | `progress`, `practice_sessions` |
| Lab Workspace | `/courses/[slug]/labs/[labSlug]` | `lessons` (field `lab`) + sandbox API + ghi `progress`/`practice_sessions` |
| Account | `/account` | `profiles` |
| Content / Lesson Editor | `/admin/content`, `/admin/lessons/[id]` | CRUD thẳng, RLS `is_admin()` |
| Users | `/admin/users` | RPC `admin_list_users`, `admin_set_user_role`, `admin_set_user_lock` |
| Activity | `/admin/activity` | `practice_sessions`, `admin_logs`, RPC `admin_stop_session` |
| 403 | mọi trang `/admin/*` khi không phải admin | `AdminGate` |

Admin đầu tiên phải tạo bằng SQL (chưa có admin nào để cấp quyền qua UI):
`update profiles set role = 'admin' where email = '<email>';`

## 6. Biến môi trường frontend

```
NEXT_PUBLIC_SUPABASE_URL=<Project URL>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>          # chỉ để đọc dữ liệu dưới RLS
NEXT_PUBLIC_API_URL=http://127.0.0.1:3001         # BẮT BUỘC: backend API (auth, profile, sandbox)
```

Backend cần chạy cùng lúc: `cd backend && npm run start:api` (Windows/không
Docker: đặt `SANDBOX_ENABLED=false` trong `backend/.env` — chỉ phục vụ
`/api/auth/*`, các endpoint sandbox trả 503 và bài lab chuyển sang hoàn thành thủ
công). Backend cần `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`.
