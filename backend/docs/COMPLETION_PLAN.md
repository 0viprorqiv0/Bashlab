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
