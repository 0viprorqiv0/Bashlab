# Kế hoạch hoàn thiện BashLab (nhánh feature/dat-be)

> **Trạng thái: đã hoàn thành Phase 1–4** (2026-09-28). Đủ 17 trang thiết kế; lint,
> build, test hiệu ứng pass; BE 15/17 (2 test chỉ fail trên Windows). Đã chạy thử
> trên trình duyệt: đăng nhập → My Learning → Course Overview → Workspace (hoàn
> thành bài, mở khoá bài sau, bài khoá bị chặn) → admin Content/Lesson Editor/
> Users (khoá = chặn đăng nhập thật, mở khoá)/Activity (dừng phiên, admin log);
> learner vào /admin thấy 403, gọi thẳng RPC admin bị từ chối.
>
> Còn lại ngoài tầm máy Windows này: chạy sandbox thật (backend cần Linux/WSL)
> để test Check Solution đầu-cuối.
>
> **Cập nhật 2026-09-29**: FE đã đổi giao diện 5 trang auth (component
> `AuthShell`/`AuthField` mới, bảng màu mới) trên `main` — đã merge vào
> `dat-be` và nối lại Supabase lên trên giao diện mới, test qua trình duyệt
> bằng tài khoản admin thật. Xem quy trình chuẩn cho việc này trong
> [`CONTEXT.md`](CONTEXT.md).
>
> **Cập nhật 2026-09-30**: Hai việc lớn.
>
> 1. **Bộ test E2E Playwright** (`frontend/tests/e2e/`, xem README trong
>    thư mục đó) — chạy thật trên Supabase project, không mock. 44 test:
>    auth/register/login, forgot/reset password, RLS + RPC admin_* (learner
>    bị chặn, admin qua được, mọi hành động ghi `admin_logs`), admin
>    Content/Users/Activity qua UI thật, và luồng học/tiến độ. 1 test
>    Workspace để sẵn dạng skip (cần backend Linux/WSL). `npm run test:e2e`
>    trong `frontend/`.
> 2. **Merge nhánh FE mới nhất** (course labs kiểu LeetCode) — đã đổi hẳn
>    trang khoá học: `CourseOverview.jsx`/`/learn/[course]/[lesson]` (chương
>    → bài học tuần tự, khoá bài sau) bị thay bằng `CourseDetail.jsx`/
>    `/courses/[slug]/labs/[labId]` (bảng lab phẳng, không khoá thứ tự, lọc
>    theo category/tag/difficulty). Migration `013_public_upcoming_courses.sql`
>    (courses có thêm status `upcoming` — công khai làm teaser "Coming next",
>    khác `draft`/`hidden` vẫn admin-only) và `014_lab_content_fields.sql`
>    (`lessons.category/tag/difficulty/commands/lab`) đã áp dụng lên DB thật;
>    seed 14 lab bằng `backend/scripts/seed-labs.mjs`. Đã cập nhật toàn bộ
>    test E2E theo giao diện mới, lint + build sạch (16 route), BE 14/17
>    (3 fail permission/symlink chỉ trên Windows, không liên quan).
>
> Fix thêm: Navbar không tự cập nhật tên sau khi sửa profile ở `/account`
> (phải F5 mới thấy) — Account page giờ bắn `window.dispatchEvent(new
> Event('bashlab:profile-updated'))`, Navbar lắng nghe và refetch.
>
> Dọn sau: `frontend/data/labsData.js` vẫn còn 1 chỗ dùng thật
> (`LearningDashboard.jsx` gọi `getFirstIncompleteLab()`) — đọc từ mảng tĩnh
> hard-code, không phải tiến độ thật của user, nên nút "Continue learning"
> trên My Learning có thể trỏ sai bài. Chưa sửa, cần bàn với người viết.
>
> **Cập nhật 2026-09-30 (2)**: Merge tiếp 1 commit mới trên `main`
> (`aeee524 feat: improve lesson authoring and learning flow`) vào `dat-be`.
> Merge sạch, không conflict. 3 điều cần lưu ý từ commit này:
> - **Bug đã tự sửa ngay**: `app/(site)/courses/[slug]/page.js` có dòng
>   `if (params?.slug === 'shell-101') redirect('/courses/shell-101/labs/1')`
>   — rõ ràng là code debug quên xoá, khiến `/courses/shell-101` (trang
>   khoá học công khai chính) luôn nhảy sang `/courses/shell-101/labs/1`
>   (labId "1" không tồn tại), và vì `LabWorkspace.jsx` bắt buộc đăng nhập
>   nên **khách chưa đăng nhập bị đá thẳng về `/login`** — chặn hẳn việc
>   xem khoá học công khai, kể cả người đã đăng nhập cũng không vào được
>   trang danh sách lab bình thường của shell-101. Đã xoá dòng redirect đó.
> - **Chưa áp dụng lên DB**: `ContentManager.jsx` đọc thêm cột
>   `lessons.lesson_content` (có fallback nếu thiếu cột — không crash), nhưng
>   cột này **chưa có migration nào trong `backend/db/migrations/`** và
>   chưa tồn tại trên Supabase thật (đã kiểm tra). Tính năng "lesson
>   authoring" mới của commit này vì vậy chưa hoạt động đầy đủ.
> - `lib/learning.js` và `CourseCatalog.jsx` cùng thêm 1 exception hard-code
>   loại bài `hello-bashlab` ra khỏi đếm số bài của course `shell-101` (chỉ
>   ảnh hưởng thống kê My Learning/Catalog — 13 thay vì 14; trang lab list
>   của CourseDetail không bị ảnh hưởng, vẫn 14). Không rõ lý do, cần hỏi
>   lại người viết trước khi coi là chuẩn.
>
> Test E2E cập nhật lại theo (dialog thay `window.prompt` ở admin Content,
> số liệu 13/14 tuỳ trang) — **44/44 pass** sau khi sửa.

Audit ngày 2026-09-28. Mức độ: đồ án môn học — đủ chạy, đủ demo 17 trang, không nhắm chuẩn production.

## Hiện trạng sau audit

| Kiểm tra | Kết quả |
|---|---|
| `npm run lint` (FE) | Sạch |
| `npm run build` (FE) | Sạch, 10 route |
| `test:curiosity`, `test:backdrop` | Pass |
| `npm test` (BE) | 15/17 — 2 test permission/symlink chỉ fail trên Windows, không liên quan |
| Nhánh khác có commit mới chưa merge | Không — dat-be đã chứa tất cả |

### Lỗi trên các trang đã có
1. Footer: 3 link chết (`/about`, `/cheatsheet`, `/terms`), 2 anchor sai (`/#how-it-works`, `/#faq` — section thật là `#learn`, `#questions`), link khoá "Linux Fundamentals" trỏ tới khoá draft đang bị ẩn.
2. Verify Email: còn thanh "preview state" (công cụ demo UI) hiện cho người dùng; `signUp` không truyền `emailRedirectTo` nên link xác minh không về `/verify-email`.
3. Login/Register: đã đăng nhập vẫn thấy form; login xong về `/account` thay vì trang học.
4. Courses: nút "Start learning" luôn trỏ `/register` kể cả khi đã đăng nhập; chưa có trang chi tiết khoá.
5. My Learning: 100% dữ liệu giả (4/12 bài, 2/5 khoá, lịch hoạt động random), không chặn khi chưa đăng nhập, nút Continue trỏ `/login`.
6. Terminal landing: mất kết nối sandbox thật sau merge nhánh E (xem 1.6 — không khôi phục, đúng đặc tả).

### Trang còn thiếu hoàn toàn
Course Overview (08), Workspace (10), Content (12), Lesson Editor (13), Users (14), Activity (15); trang 403 (16) có nhưng chưa được dùng.

### DB
Chỉ có 1 bài học published → không đủ để demo Course Overview/Workspace.

## Kế hoạch

### Phase 1 — Sửa lỗi trang đã có
- 1.1 Footer: bỏ link chết, sửa anchor, sửa link khoá.
- 1.2 Verify Email: bỏ thanh preview, `signUp` truyền `emailRedirectTo`.
- 1.3 Login/Register: đã đăng nhập → chuyển thẳng `/my-learning`; login xong → `/my-learning`.
- 1.4 Courses: CTA → `/courses/[slug]`.
- 1.5 My Learning: dữ liệu thật từ `progress`/`courses`, chặn khi chưa đăng nhập.
- 1.6 ~~Terminal landing: khôi phục gọi sandbox API~~ — **huỷ**. Terminal landing mới của nhóm FE là mô phỏng có chủ đích (easter egg sudo/flag/thư mục ẩn), và `bashlab-pages.md` ghi rõ Landing không phải phiên Bash thật, thực hành thật ở Screen 10. Sandbox API được dùng ở Workspace (2.3), bật bằng `NEXT_PUBLIC_SANDBOX_API_URL`.

### Phase 2 — Trang học viên còn thiếu
- 2.1 Seed nội dung Shell 101 (3 chương, nhiều bài, gồm `hello-bashlab`, `files-03` mà verifier đã hỗ trợ).
- 2.2 Course Overview `/courses/[slug]`: giới thiệu, giáo trình theo chương, trạng thái từng bài, % tiến độ, Continue.
- 2.3 Workspace `/learn/[course]/[lesson]`: nội dung Markdown, mục tiêu, bài trước/sau, terminal sandbox, Check Solution → ghi `progress`; bài không có bộ chấm → "Mark as complete".

### Phase 3 — Trang quản trị + 403
- 3.1 Guard admin: không phải admin → `/forbidden` (403).
- 3.2 `/admin/content`: cây khoá → chương → bài; tạo/sửa/sắp xếp/đổi trạng thái.
- 3.3 `/admin/lessons/[id]`: soạn bài (metadata, Markdown + preview, mục tiêu, nháp/xuất bản).
- 3.4 `/admin/users`: tìm/phân trang, đổi role, khoá/mở khoá qua RPC có lý do (RPC đã bảo vệ admin cuối).
- 3.5 `/admin/activity`: tab Sessions + tab Admin log (lọc, xem chi tiết).
- 3.6 Navbar hiện link Admin cho admin.
- 3.7 Migration: RPC `admin_stop_session` (dừng phiên có lý do + ghi log).

### Phase 4 — Kiểm tra & bàn giao
Lint, build, test BE, chạy thử từng trang bằng trình duyệt, cập nhật `API_CONTRACT.md`, commit + push.

## Ngoài phạm vi (chủ động không làm)
Deploy, CI, Storage bucket, chống gian lận progress, gắn auth vào sandbox API, trang About/Terms/Cheatsheet (không có trong 17 trang thiết kế).
