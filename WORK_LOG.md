# BashLab — Nhật Ký Công Việc & Tiến Độ (Work Log)

Tài liệu này ghi lại chi tiết mọi công việc đã thực hiện, nguyên nhân gốc rễ, các file đã thay đổi, bằng chứng kiểm chứng thực tế và trạng thái của từng đầu việc.

---

## [2026-10-02 19:56] Tối ưu hóa hiển thị thông tin người dùng trên Navbar & Dropdown
* **Yêu cầu**: Giới hạn và cắt gọn (truncate) tên/email người dùng, xử lý triệt để tình trạng chuỗi email dài làm tràn thanh điều hướng và rớt chữ trong menu xổ xuống.
* **Nguyên nhân gốc rễ**: Thẻ hiển thị tên/email trong nút User menu không có `max-width` và không có `truncate`. Khung dropdown `w-56` (224px) quá hẹp đối với email dài, chữ bị ngắt đôi (`@bashl` ở dòng 1, `local.test` ở dòng 2) và hiển thị lặp lại 2 lần cùng một địa chỉ email khi tài khoản chưa đặt tên riêng.
* **Các thay đổi thực hiện**:
  * [`frontend/components/layout/Navbar.jsx`](file:///home/light/Documents/B3/web_app/Bashlab/frontend/components/layout/Navbar.jsx):
    * Thêm `max-w-[190px] md:max-w-[240px] lg:max-w-[280px]` kết hợp `truncate` và `title={user.name}` cho nút bấm trên Navbar.
    * Thêm `flex-shrink-0` cho avatar chữ cái và biểu tượng mũi tên để chống co méo.
    * Tăng kích thước dropdown lên `w-64` (256px), thêm `truncate` cho dòng tên chính.
    * Chỉ hiển thị dòng email phụ bên dưới khi người dùng có đặt tên riêng khác với email (`auth.profile?.name !== user.email`), loại bỏ trùng lặp.
    * Thêm header người dùng gọn gàng có truncate vào Mobile Menu.
  * [`frontend/tests/e2e/specs/account-profile.spec.js`](file:///home/light/Documents/B3/web_app/Bashlab/frontend/tests/e2e/specs/account-profile.spec.js):
    * Bổ sung test tự động kiểm tra email cực dài được giới hạn bề rộng $\le 285\text{px}$ và không bị tràn.
* **Kiểm chứng thực tế**:
  * Chạy test Playwright trên Chromium: **3/3 passed**.
  * Chụp ảnh màn hình kiểm chứng: `screenshots/navbar-user-dropdown-fixed.png`.
* **Trạng thái**: Hoàn thành & đã commit (`939a690`).

---

## [2026-10-02 19:48] Trải nghiệm người dùng thực tế & Sửa lỗi sandbox runner thiếu `/var/log`
* **Yêu cầu**: Không chỉ dừng lại ở unit test hay script mô phỏng, phải kiểm thử và trải nghiệm thực tế như một học viên thật (Learner Journey) trên môi trường live.
* **Nguyên nhân gốc rễ**: Khi học viên làm **Lab #1: Terminal Fundamentals & Navigation**, kịch bản yêu cầu gõ lệnh `cd /var/log`. Tuy nhiên, cấu hình Bubblewrap (`bwrap`) trong [`backend/runner/run-job`](file:///home/light/Documents/B3/web_app/Bashlab/backend/runner/run-job) chỉ mount các thư mục hệ thống cơ bản mà không mount `/var/log`, khiến lệnh trả về lỗi `bash: cd: /var/log: No such file or directory`.
* **Các thay đổi thực hiện**:
  * [`backend/runner/run-job`](file:///home/light/Documents/B3/web_app/Bashlab/backend/runner/run-job): Bổ sung mount read-only `'--ro-bind', '/var/log', '/var/log'`.
  * Build lại Docker image `bashlab-runner:local` và restart container `bashlab-box`.
  * [`frontend/tests/e2e/specs/workspace.spec.js`](file:///home/light/Documents/B3/web_app/Bashlab/frontend/tests/e2e/specs/workspace.spec.js): Viết kịch bản kiểm thử tương tác thực tế toàn diện:
    * Mở lab $\rightarrow$ Kiểm tra trạng thái Stopped $\rightarrow$ Bấm Start Instance.
    * Gõ các lệnh `pwd`, `ls -la`, `cd /var/log`, `cd ~` trong terminal sandbox.
    * Kiểm tra CWD cập nhật trên prompt: `student@bashlab:/var/log$` và quay lại `~`.
    * Bấm Check Solution $\rightarrow$ Xác nhận thông báo hoàn thành $\rightarrow$ Kiểm tra lưu DB Supabase.
* **Kiểm chứng thực tế**:
  * Chụp 4 ảnh màn hình từng bước: `1-workspace-stopped.png`, `2-workspace-booted.png`, `3-commands-executed.png`, `4-solution-passed.png`.
  * Toàn bộ 15/15 live browser tests passed.
  * Chi tiết lưu tại [`REAL_USER_TEST_REPORT.md`](file:///home/light/.gemini/antigravity-cli/brain/1452835d-ecd2-4990-8c8e-966c5ec35541/REAL_USER_TEST_REPORT.md).
* **Trạng thái**: Hoàn thành & đã commit (`6e9e7a0`).

---

## [2026-10-02 19:35] Xử lý triệt để "NONOGRAM CYBER LAB" & Ổn định tiến trình Dev Servers
* **Yêu cầu**: Giải quyết hiện tượng trang web lạ "NONOGRAM CYBER LAB" hiển thị trên `localhost:3000` và đảm bảo các server phát triển chạy nền bền bỉ không bị ngắt.
* **Nguyên nhân gốc rễ**:
  * "NONOGRAM CYBER LAB" là một Service Worker (PWA) từ một dự án cũ của USTH từng chạy trên cổng 3000 được lưu cache offline trong trình duyệt Brave của người dùng.
  * Do tiến trình `next dev` trước đó chạy trong subshell không tách cgroup/session hoàn toàn nên khi lệnh kết thúc, cổng 3000 bị rớt, khiến Brave tự động kích hoạt Service Worker cũ từ cache.
* **Các thay đổi thực hiện**:
  * [`frontend/components/layout/SiteChrome.jsx`](file:///home/light/Documents/B3/web_app/Bashlab/frontend/components/layout/SiteChrome.jsx): Thêm hook tự động hủy đăng ký toàn bộ Service Worker (`navigator.serviceWorker.getRegistrations()`) và xóa sạch Cache Storage (`caches.delete()`) khi trang web được tải.
  * [`scripts/dev-start.sh`](file:///home/light/Documents/B3/web_app/Bashlab/scripts/dev-start.sh): Áp dụng kỹ thuật double-fork kết hợp `setsid nohup ... < /dev/null` để tách hoàn toàn session/process group của Backend (port 3001) và Frontend (port 3000) khỏi subshell của terminal.
  * [`backend/src/server.js`](file:///home/light/Documents/B3/web_app/Bashlab/backend/src/server.js), [`backend/src/services/sessionManager.js`](file:///home/light/Documents/B3/web_app/Bashlab/backend/src/services/sessionManager.js): Hoàn thiện vòng đời 1-user-1-sandbox (tái sử dụng khi cùng lab, dọn dẹp sạch về 0 khi đổi lab, lắng nghe sự kiện dọn dẹp từ reaper).
* **Kiểm chứng thực tế**:
  * Cả 2 cổng 3000 và 3001 chạy nền liên tục và ổn định qua nhiều phiên terminal.
  * `curl -I http://localhost:3000` $\rightarrow$ Trả về đúng tiêu đề `<title>BashLab — Learn Bash by doing</title>`.
  * `curl http://127.0.0.1:3001/health` $\rightarrow$ `{"status":"ok"}`.
* **Trạng thái**: Hoàn thành & đã commit (`067d063`).

---

## [2026-10-02 19:14] Kế hoạch tối ưu hóa hệ thống qua GPT-CLI
* **Yêu cầu**: Khởi động local gateway và thực thi công cụ `gpt -b br -p <prompt>` (kết nối bridge mcp về host) để nghiên cứu và lập phương án tối ưu hóa toàn bộ hệ thống BashLab.
* **Các thay đổi thực hiện**:
  * Sửa lỗi môi trường venv của `gpt-cli` tại `/home/light/GitHub/gpt_cli/.venv` và restart dịch vụ `webgpt-gateway.service` (port 18000).
  * Gọi `gpt` qua mô hình lý luận sâu, xuất bản tài liệu phương án tối ưu: [`SYSTEM_OPTIMIZATION_PLAN.md`](file:///home/light/Documents/B3/web_app/Bashlab/SYSTEM_OPTIMIZATION_PLAN.md) gồm 5 trụ cột:
    1. Kiến trúc Sandbox: Container pool, copy-on-write overlayfs, tối ưu tài nguyên.
    2. Cân bằng tải & phân tách quyền hạn (RBAC, Rate Limiting).
    3. Bộ nhớ đệm & cơ chế Real-time WebSocket terminal.
    4. Giám sát Prometheus & OpenTelemetry.
    5. Đơn giản hóa kiến trúc (giữ nguyên giải pháp gọn nhẹ, tránh bloatware).
* **Trạng thái**: Hoàn thành & đã commit (`fcf2388`).

---

## [2026-10-02 20:25] Chuyển đổi "Start learning" thành "Go to Lab" & Điều hướng thông minh đến Lab đang thực hiện
* **Yêu cầu người dùng**:
  * Tại trang `http://localhost:3000/courses`, đổi chữ "Start learning" thành **"Go to Lab"** (hoặc tương đương) kèm căn chỉnh giao diện phù hợp.
  * Sau khi nhấn nút, hệ thống tự động redirect đến **lab cuối cùng đang thực hiện** của khoá học; nếu chưa có lab nào thì quay về **lab đầu tiên** (`/courses/${course.id}/labs/1`). Hiện tại có 1 khoá (`shell-101`).
* **Các thay đổi thực hiện**:
  * [`frontend/components/courses/CourseCatalog.jsx`](file:///home/light/Documents/B3/web_app/Bashlab/frontend/components/courses/CourseCatalog.jsx):
    * Truy vấn danh sách bài học đã published có kèm `sort_order` và kết hợp tải `fetchProgressMap(userId)` khi người dùng đăng nhập.
    * Cài đặt hàm `getCourseTargetLab(course)`:
      1. Ưu tiên bài có trạng thái `in_progress` mới nhất trong bảng `progress`.
      2. Nếu không có bài `in_progress`, tự động trỏ đến bài chưa hoàn thành tiếp theo sau các bài đã `done`.
      3. Kiểm tra `localStorage` (`bashlab:last_lab:${course.id}`) cho lab vừa mở gần nhất trên trình duyệt.
      4. Fallback về bài 1 (`/courses/${course.id}/labs/1`) nếu người dùng mới hoặc đã hoàn thành toàn bộ khoá học.
      5. Nếu là khách (chưa đăng nhập), chuyển hướng đến `/login?next=${encodeURIComponent(targetLabUrl)}`.
    * Nút đổi thành `Go to Lab` kèm icon `arrow_forward`.
    * Tiêu đề khoá học (`<h2>`) được bọc trong thẻ `<Link>` trỏ đến `/courses/${course.id}` để người dùng vẫn xem được syllabus/chi tiết khoá học khi cần.
  * [`frontend/components/courses/CourseCatalog.module.css`](file:///home/light/Documents/B3/web_app/Bashlab/frontend/components/courses/CourseCatalog.module.css):
    * Căn chỉnh nút `.primaryAction` với khoảng cách `gap: 28px`, padding `11px 18px`, hiệu ứng hover translateY(-2px), bóng nhẹ và dịch chuyển arrow icon.
    * Thêm hover styling cho link tiêu đề `h2 a`.
    * Đảm bảo responsive hoàn hảo trên mobile (độ rộng 100%, căn đều hai bên giữa text và icon).
  * [`frontend/lib/courseLabs.js`](file:///home/light/Documents/B3/web_app/Bashlab/frontend/lib/courseLabs.js):
    * Bổ sung hàm `markStarted(lab)` gọi `markLessonStarted` để cập nhật trạng thái `in_progress` vào cơ sở dữ liệu khi bắt đầu làm lab.
  * [`frontend/components/workspace/LabWorkspace.jsx`](file:///home/light/Documents/B3/web_app/Bashlab/frontend/components/workspace/LabWorkspace.jsx):
    * Tự động lưu `localStorage.setItem('bashlab:last_lab:' + courseId, String(lab.id))` ngay khi mở lab.
    * Gọi `markStarted` ghi nhận bài học đang được thực hiện vào cơ sở dữ liệu khi mở lab chưa hoàn thành.
  * [`frontend/components/landing/Lookbook.jsx`](file:///home/light/Documents/B3/web_app/Bashlab/frontend/components/landing/Lookbook.jsx):
    * Loại bỏ dependency mock dữ liệu cũ `getFirstIncompleteLab` từ `labsData.js`, đồng bộ nút Hero trỏ đến `/courses/shell-101`.
  * [`frontend/tests/e2e/specs/landing-start-learning.spec.js`](file:///home/light/Documents/B3/web_app/Bashlab/frontend/tests/e2e/specs/landing-start-learning.spec.js):
    * Cập nhật và bổ sung đầy đủ bộ test E2E kiểm chứng nút "Go to Lab" và "Start learning", bao gồm cả khách vãng lai, học viên mới và học viên đã có tiến độ.
  * [`frontend/tests/e2e/specs/courses-and-progress.spec.js`](file:///home/light/Documents/B3/web_app/Bashlab/frontend/tests/e2e/specs/courses-and-progress.spec.js):
    * Thêm wait `User menu` để đồng bộ hoàn toàn quá trình hydrat hóa session trước khi click toggle lab hoàn thành.
* **Kiểm chứng thực tế**:
  * Chạy test Playwright E2E `landing-start-learning.spec.js` $\rightarrow$ **7/7 tests pass 100%**.
  * Chạy test Playwright E2E `courses-and-progress.spec.js` $\rightarrow$ **4/4 tests pass 100%**.
  * Chạy test Playwright E2E `smoke.spec.js` $\rightarrow$ **10/10 tests pass 100%**.
  * Backend test suite: `npm --prefix backend test` $\rightarrow$ **70/70 tests pass 100%**.
  * Frontend linter: `npm --prefix frontend run lint` $\rightarrow$ **0 errors, 0 warnings**.
  * Ảnh chụp thực tế:
    * Desktop: `screenshots/courses-catalog-desktop.png` (nút "Go to Lab ->", tiêu đề clickable, menu user gọn gàng).
    * Mobile (375x667): `screenshots/courses-catalog-mobile-full.png` (nút full-width, căn chỉnh hai đầu chuẩn mực).
* **Trạng thái**: Hoàn thành.

---

### [2026-10-02 21:00] Điều hướng nút "Start learning" ở trang chủ (Home) sang `/courses`

* **Yêu cầu**:
  * Khi bấm nút "Start learning" trên hero banner ở trang chủ (`http://localhost:3000/`), tự động chuyển hướng trực tiếp đến trang danh mục khóa học `http://localhost:3000/courses` (thay vì cố gắng ép chuyển đến `/courses/shell-101` hoặc `/login`).
* **Các thay đổi thực hiện**:
  * [`frontend/components/landing/Lookbook.jsx`](file:///home/light/Documents/B3/web_app/Bashlab/frontend/components/landing/Lookbook.jsx):
    * Chuyển nút CTA chính từ thẻ `<a>` kèm handler `startLearning` sang component `<Link href="/courses" className={styles.btnPrimary}>`.
    * Loại bỏ các hook không cần thiết (`useRouter`, `useAuth`, `authClient`) liên quan đến nút CTA cũ để tăng tốc độ render và loại bỏ client-side auth check dư thừa trên landing page.
  * [`frontend/tests/e2e/specs/landing-start-learning.spec.js`](file:///home/light/Documents/B3/web_app/Bashlab/frontend/tests/e2e/specs/landing-start-learning.spec.js):
    * Cập nhật test cases cho cả khách vãng lai (guest) và học viên đã đăng nhập (signed-in learner) để xác nhận khi bấm "Start learning" trên trang chủ sẽ chuyển hướng thẳng đến `/courses` và hiển thị tiêu đề `Courses.`.
* **Kiểm chứng thực tế**:
  * Frontend Linter: `npm --prefix frontend run lint` $\rightarrow$ **0 errors, 0 warnings**.
  * Frontend E2E tests: `npm --prefix frontend run test:e2e -- landing-start-learning.spec.js` $\rightarrow$ **7/7 tests pass 100%**.
  * Backend test suite: `npm --prefix backend test` $\rightarrow$ **70/70 tests pass 100%**.
  * Visual Browser Verification: Script thực tế Playwright click vào nút "Start learning" từ `http://localhost:3000/` $\rightarrow$ URL chuyển sang `http://localhost:3000/courses` thành công và hiển thị đầy đủ danh sách khóa học.
* **Trạng thái**: Hoàn thành.

---

### [2026-10-02 21:10] Xóa trang syllabus / chi tiết khóa học `/courses/shell-101`

* **Yêu cầu**:
  * "trnag này k cần nx http://localhost:3000/courses/shell-101, xóa đi": Xóa bỏ hoàn toàn trang `http://localhost:3000/courses/shell-101` vì luồng ứng dụng học trực tiếp qua "Go to Lab" thẳng vào không gian thực hành `/courses/shell-101/labs/[labId]`, không cần trang trung gian syllabus.
* **Các thay đổi thực hiện**:
  * [`frontend/app/(site)/courses/[slug]/page.js`](file:///home/light/Documents/B3/web_app/Bashlab/frontend/app/(site)/courses/[slug]/page.js):
    * Đã xóa file route `[slug]/page.js` $\rightarrow$ truy cập `/courses/shell-101` trả về mã trạng thái chuẩn **404: Page Not Found**. Các lab con `/courses/shell-101/labs/[labId]` vẫn hoạt động hoàn hảo.
  * [`frontend/components/courses/CourseDetail.jsx`](file:///home/light/Documents/B3/web_app/Bashlab/frontend/components/courses/CourseDetail.jsx) & [`frontend/components/courses/CourseDetail.module.css`](file:///home/light/Documents/B3/web_app/Bashlab/frontend/components/courses/CourseDetail.module.css):
    * Đã xóa component và file style không còn sử dụng để giữ codebase gọn gàng, sạch sẽ, không có code thừa.
  * [`frontend/components/courses/CourseCatalog.jsx`](file:///home/light/Documents/B3/web_app/Bashlab/frontend/components/courses/CourseCatalog.jsx) & [`frontend/components/courses/CourseCatalog.module.css`](file:///home/light/Documents/B3/web_app/Bashlab/frontend/components/courses/CourseCatalog.module.css):
    * Xóa thẻ `<Link>` bọc quanh tiêu đề `<h2>` của thẻ khóa học, chuyển thành text tĩnh chuẩn mực để tránh người dùng click vào trang đã xóa.
  * [`frontend/components/learning/LearningDashboard.jsx`](file:///home/light/Documents/B3/web_app/Bashlab/frontend/components/learning/LearningDashboard.jsx):
    * Cập nhật fallback URL `startHref` khi khóa học đã hoàn thành để quay lại lab 1 thay vì trang chi tiết cũ.
  * [`frontend/components/landing/Lookbook.jsx`](file:///home/light/Documents/B3/web_app/Bashlab/frontend/components/landing/Lookbook.jsx):
    * Cập nhật phản hồi terminal mẫu `courses` trỏ về `/courses`.
  * Cập nhật các bộ E2E specs tương ứng:
    * [`frontend/tests/e2e/specs/landing-start-learning.spec.js`](file:///home/light/Documents/B3/web_app/Bashlab/frontend/tests/e2e/specs/landing-start-learning.spec.js): Kiểm chứng tiêu đề thẻ catalog không có link và `/courses/shell-101` trả về 404.
    * [`frontend/tests/e2e/specs/smoke.spec.js`](file:///home/light/Documents/B3/web_app/Bashlab/frontend/tests/e2e/specs/smoke.spec.js): Kiểm tra catalog hiển thị đúng các khóa học và `/courses/shell-101` trả về 404.
    * [`frontend/tests/e2e/specs/courses-and-progress.spec.js`](file:///home/light/Documents/B3/web_app/Bashlab/frontend/tests/e2e/specs/courses-and-progress.spec.js) & [`frontend/tests/e2e/specs/lab-progress.spec.js`](file:///home/light/Documents/B3/web_app/Bashlab/frontend/tests/e2e/specs/lab-progress.spec.js): Bỏ phụ thuộc vào bảng labs cũ của `/courses/shell-101`, kiểm chứng tiến độ trực tiếp qua không gian lab workspace và My Learning.
* **Kiểm chứng thực tế**:
  * Frontend Linter: `npm --prefix frontend run lint` $\rightarrow$ **0 errors, 0 warnings**.
  * Backend test suite: `npm --prefix backend test` $\rightarrow$ **70/70 tests pass 100%**.
  * Frontend E2E suites: `smoke`, `courses-and-progress`, `lab-progress`, `landing-start-learning` $\rightarrow$ **21/21 tests pass 100%**.
  * Visual Browser Verification:
    * Truy cập `http://localhost:3000/courses/shell-101` $\rightarrow$ trả về HTTP 404 ([`screenshots/courses-shell-101-deleted-404.png`](file:///home/light/Documents/B3/web_app/Bashlab/screenshots/courses-shell-101-deleted-404.png)).
    * Truy cập `http://localhost:3000/courses` $\rightarrow$ catalog khóa học hiển thị gọn gàng, tiêu đề không chứa link thừa, nút "Go to Lab" chuyển thẳng vào lab ([`screenshots/courses-catalog-after-delete.png`](file:///home/light/Documents/B3/web_app/Bashlab/screenshots/courses-catalog-after-delete.png)).
* **Trạng thái**: Hoàn thành.

---

### [2026-10-02 21:30] Hoàn thành triển khai & tích hợp Strict Sandbox Lease Backend Lifecycle (từ Codex Session `01a0f532-a28f-7ee0-acd0-7753e3be5c28`)

* **Yêu cầu**:
  * Đọc lại và hoàn thành các tác vụ dở từ session Codex `01a0f532-a28f-7ee0-acd0-7753e3be5c28`.
  * Đảm bảo nguyên tắc kiến trúc: **`1 user = 1 lease = 1 instance = 1 workspace`**, command là tiến trình ngắn hạn bên trong workspace, giới hạn cứng 100 lease đồng thời, PostgreSQL là single source of truth duy nhất.
* **Các thay đổi thực hiện**:
  * **Database**:
    * Chạy migration [`backend/db/migrations/019_sandbox_leases.sql`](file:///home/light/Documents/B3/web_app/Bashlab/backend/db/migrations/019_sandbox_leases.sql) lên cơ sở dữ liệu Supabase PostgreSQL thực tế qua `psql`. Bảng `sandbox_leases` được tạo với khóa chính `user_id uuid primary key`, ràng buộc trạng thái `ALLOCATING`, `ACTIVE`, `FAILED`, `DELETING`, `REMOVED`.
  * **Backend Code & Lifecycle**:
    * Merge hoàn chỉnh nhánh `feature/strict-lease-backend` vào nhánh làm việc chính `feature/full-feature-revision`.
    * Cài đặt [`backend/src/services/sandboxLeaseStore.js`](file:///home/light/Documents/B3/web_app/Bashlab/backend/src/services/sandboxLeaseStore.js): Hỗ trợ cả MemoryLeaseStore cho tests và SupabaseLeaseStore cho production.
    * Sửa [`backend/src/services/sessionManager.js`](file:///home/light/Documents/B3/web_app/Bashlab/backend/src/services/sessionManager.js): Quản lý vòng đời workspace gắn chặt theo `lease_id` và `workspace_id`.
    * Fix lỗi đường dẫn vật lý trong [`backend/src/server.js`](file:///home/light/Documents/B3/web_app/Bashlab/backend/src/server.js#L237-L242): Sử dụng `session.workspacePath` và `probe.workspacePath` thay vì hardcode `session.id` (vì `workspace_id` và `lease_id` là 2 UUID tách biệt).
    * Sửa [`backend/src/services/reaperService.js`](file:///home/light/Documents/B3/web_app/Bashlab/backend/src/services/reaperService.js) để dọn dẹp lease theo đúng chu trình `beginDeletion` $\rightarrow$ `finishDeletion`.
  * **Frontend & E2E Testing**:
    * Sửa [`frontend/tests/e2e/specs/workspace.spec.js`](file:///home/light/Documents/B3/web_app/Bashlab/frontend/tests/e2e/specs/workspace.spec.js): Lọc phản hồi `PUT /api/progress/` có `status === 'done'` để đồng bộ chính xác khi nhấn nút "Check Solution".
* **Kiểm chứng thực tế (Real-system & Browser Verification)**:
  * Backend API Server: Khởi động lại trên cổng 3001, vượt qua startup readiness probe với runner container `bashlab-box`.
  * Backend Test Suite: `npm --prefix backend test` $\rightarrow$ **74/74 tests pass 100%** (bao gồm test chặn user thứ 101 với 503, test song song 20 claims chỉ ra 1 lease, test failed lease giữ nguyên workspace).
  * Frontend Linter: `npm --prefix frontend run lint` $\rightarrow$ **0 errors, 0 warnings**.
  * Full E2E Test Suite (Playwright): `smoke.spec.js`, `courses-and-progress.spec.js`, `lab-progress.spec.js`, `landing-start-learning.spec.js`, `workspace.spec.js` $\rightarrow$ **22/22 tests pass 100%** (48.6s).
  * Chụp ảnh thực tế terminal sandbox:
    * Khởi động container sandbox, gõ `pwd`, `ls -la`, `cd /var/log`, `cd ~` $\rightarrow$ [`screenshots/3-commands-executed.png`](file:///home/light/Documents/B3/web_app/Bashlab/screenshots/3-commands-executed.png).
    * Bấm Check Solution $\rightarrow$ `[VERIFICATION PASSED] All 4 checklist items marked complete. 🎉 Lab #1 completed.` $\rightarrow$ [`screenshots/4-solution-passed.png`](file:///home/light/Documents/B3/web_app/Bashlab/screenshots/4-solution-passed.png).
  * Dọn dẹp: Đã xóa worktree tạm `/home/light/Downloads/bashlab-strict-lease` và thư mục agent tạm.
* **Trạng thái**: Hoàn thành.

---

### [2026-10-02 21:40] Audit Backend Code bằng GPT-CLI & Thực hiện Real-User Live Testing toàn diện

* **Yêu cầu**:
  * Gọi `gpt-cli` (mô hình `gpt-5-6-thinking`) để rà soát, audit bảo mật và tính toàn vẹn của toàn bộ backend code vừa triển khai (vòng đời lease sandbox, quản lý session, cách ly runner, quota, phân quyền auth, concurrency).
  * Thực hiện kiểm thử thủ công trực tiếp (manual test) như người dùng thật trên môi trường chạy thực tế (`http://localhost:3001` + Docker runner `bashlab-box`), không chỉ dựa vào unit test script.
* **Kết quả Audit từ GPT-CLI ([`docs/BACKEND_AUDIT_REPORT.md`](file:///home/light/Documents/B3/web_app/Bashlab/docs/BACKEND_AUDIT_REPORT.md))**:
  * **HIGH — Server đang chạy với In-Memory Lease Store mặc định**:
    * Trong [`backend/src/server.js`](file:///home/light/Documents/B3/web_app/Bashlab/backend/src/server.js#L348), hàm `startServer()` khởi tạo `leaseStore = createMemoryLeaseStore(...)`.
    * Mặc dù migration `019_sandbox_leases.sql` đã tạo bảng `sandbox_leases`, nhưng các hàm RPC (`claim_sandbox_lease`, `finish_sandbox_allocation`, v.v.) chưa được viết trong migration SQL mà chỉ có stub trong [`backend/src/services/sandboxLeaseStore.js`](file:///home/light/Documents/B3/web_app/Bashlab/backend/src/services/sandboxLeaseStore.js).
    * Ảnh hưởng: Nếu backend restart hoặc chạy nhiều tiến trình Node (cluster/multi-instance), trạng thái lease trong RAM bị reset và không chia sẻ qua PostgreSQL.
  * **MEDIUM — Race condition trong Memory Lease Store**:
    * `claim()` trong `createMemoryLeaseStore` kiểm tra `leases.find` rồi `leases.set` mà không có mutex atomic, nếu có 2 request đồng thời trong cùng tick event loop thì có thể bị race.
  * **MEDIUM — Ghép nối Runtime Session ID và Lease ID**:
    * `beginCommand({ leaseId: session.id })` sử dụng trực tiếp `session.id` thay vì tách biệt tường minh trường `leaseId` (mặc dù hiện tại `manager.create` được truyền `id: lease.leaseId`).
* **Kiểm thử thực tế như người dùng thật (Live Real-User Manual Test)**:
  * Do subagent GPT-CLI bị chặn các lệnh bash chứa thông tin nhạy cảm (safety filter), toàn bộ kịch bản manual test người dùng đã được hiện thực hóa trực tiếp qua [`backend/scripts/manual-backend-test.mjs`](file:///home/light/Documents/B3/web_app/Bashlab/backend/scripts/manual-backend-test.mjs), tạo user thật trên Supabase và gọi live API `http://127.0.0.1:3001` tương tác với container runner `bashlab-box`.
  * **Kết quả 10/10 kịch bản kiểm thử thực tế đạt 100%**:
    1. **Xác thực Learner 1** (`POST /api/auth/login`): HTTP 200, cấp access token hợp lệ.
    2. **Khởi tạo Sandbox & Lease** (`POST /api/sessions`): HTTP 201, tạo session và workspace thực tế tại `/home/student`.
    3. **Thực thi lệnh cơ bản** (`POST /api/sessions/:id/execute`): Chạy `pwd; whoami; id`, trả về đúng `student`, `uid=10001(student) gid=10001(student)`, exitCode 0.
    4. **Khóa loại trừ tương hỗ khi chạy đồng thời (Concurrency Mutex)**: Gửi đồng thời lệnh dài `sleep 2` và một lệnh tức thì. Lệnh thứ hai lập tức bị chặn với **HTTP 409 Conflict** (`code: SESSION_BUSY`, "Another operation is using this session").
    5. **Giới hạn dung lượng đĩa (Storage Quota & ulimit)**: Ghi file 35MB `head -c 35M /dev/zero > large_blob.bin`. Bị kernel bắt cứng qua `RLIMIT_FSIZE` với mã thoát **exitCode 153 (`SIGXFSZ: File size limit exceeded`)** ngay tại ngưỡng 10MB!
    6. **Cách ly thư mục & Jail Sandbox**: Thử đọc file nhạy cảm của hệ thống `cat /etc/shadow` $\rightarrow$ Trả về `No such file or directory` (Bubblewrap jail mount tách biệt hoàn toàn, không lộ file root host).
    7. **Bảo mật phân quyền chéo người dùng (Cross-User Isolation)**: Learner 2 đăng nhập và cố gắng `GET` hoặc `POST execute` vào session của Learner 1 $\rightarrow$ Đều nhận **HTTP 404 Not Found** (session hoàn toàn vô hình với user khác).
    8. **Đảm bảo bất biến 1 user = 1 active session (Rebind)**: Learner 1 yêu cầu mở lab khác khi đang có session $\rightarrow$ Trả về **HTTP 200, `reused: true`**, tái sử dụng workspace và lease mà không sinh session rác.
    9. **Xóa session & giải phóng lease** (`DELETE /api/sessions/:id`): Trả về **HTTP 204 No Content**, dọn dẹp sạch workspace.
    10. **Truy cập sau khi xóa**: `GET /api/sessions/:id` sau khi xóa $\rightarrow$ Nhận **HTTP 404 Not Found**.
  * **Automated Backend Tests**: `npm --prefix backend test` $\rightarrow$ **74/74 tests PASS**.
* **Trạng thái**: Hoàn thành kiểm thử và báo cáo.

---

### [2026-10-02 21:48] Sửa lỗi & Kích hoạt toàn diện hệ thống Dashboard (Admin Activity & Learner My Learning)

* **Hiện tượng & Phân tích nguyên nhân**:
  1. **Container Prometheus chưa chạy**: Trước đó container `bashlab-prometheus` trong `monitoring/docker-compose.yml` chưa được bật. Khi truy cập Dashboard Quản trị (`/admin/activity`), backend trả về `"available": false, "reason": "Prometheus is not reachable."`, giao diện hiện thông báo *"Prometheus is not connected."*, toàn bộ chỉ số thời gian thực (`Commands / min`, `API requests / min`, `API error rate`, v.v.) hiện dấu gạch ngang `"—"` và các biểu đồ time series bị trống.
  2. **Đường dẫn `/dashboard` trả về HTTP 404**: Người dùng khi gõ trực tiếp `http://localhost:3000/dashboard` trên thanh địa chỉ trình duyệt bị lỗi 404 Not Found do Next.js chưa có route `/dashboard`.
  3. **Thiếu liên kết Dashboard trực tiếp trên thanh điều hướng**: Menu dropdown người dùng chỉ có "My Learning" và "Account & Security", chưa có link dẫn trực tiếp đến "System Dashboard" cho quyền Admin.
* **Các thay đổi đã triển khai**:
  * **Hạ tầng Monitoring**: Khởi chạy cụm container giám sát `bashlab-prometheus` (cổng 9090) và `bashlab-grafana` (cổng 3002) qua `docker compose -f monitoring/docker-compose.yml up -d`. Prometheus đã kết nối cào dữ liệu (`scrape_interval: 15s`) thành công từ `http://host.docker.internal:3001/metrics` với trạng thái `health: up`.
  * **Tạo Route Điều Hướng Thông Minh [`frontend/app/(site)/dashboard/page.js`](file:///home/light/Documents/B3/web_app/Bashlab/frontend/app/(site)/dashboard/page.js)**:
    * Người dùng chưa đăng nhập $\rightarrow$ Điều hướng về `/login?next=/dashboard`.
    * Học viên (Learner) $\rightarrow$ Tự động điều hướng về `/my-learning` (Learning Dashboard: tiến độ, streak ngày, số giờ thực hành).
    * Quản trị viên (Admin) $\rightarrow$ Tự động điều hướng về `/admin/activity` (System Dashboard: tải sandbox, lệnh thực thi, CPU, RAM, lỗi API).
  * **Bổ sung Liên kết trên Navbar [`frontend/components/layout/Navbar.jsx`](file:///home/light/Documents/B3/web_app/Bashlab/frontend/components/layout/Navbar.jsx)**: Thêm mục "System Dashboard" (icon `monitoring`) vào menu avatar dropdown và mobile menu cho tài khoản có quyền Admin.
* **Kiểm chứng thực tế (Real-browser Verification)**:
  * Kiểm tra API: `GET /api/admin/dashboard?range=1h` $\rightarrow$ Trả về HTTP 200, `available: true`, đầy đủ chuỗi dữ liệu Prometheus (`sessions`, `jobsActive`, `commands`, `http`, `memoryMb`, `cpu`).
  * Kiểm tra trình duyệt thực tế qua Playwright:
    * `/dashboard` chưa đăng nhập $\rightarrow$ Chuyển hướng về `/login?next=/dashboard`.
    * `/dashboard` với Learner $\rightarrow$ Mở trang `/my-learning` ([`frontend/screenshots/dashboard-learner-redirect.png`](file:///home/light/Documents/B3/web_app/Bashlab/frontend/screenshots/dashboard-learner-redirect.png)).
    * `/dashboard` với Admin $\rightarrow$ Mở trang `/admin/activity` ([`frontend/screenshots/dashboard-admin-redirect.png`](file:///home/light/Documents/B3/web_app/Bashlab/frontend/screenshots/dashboard-admin-redirect.png)) với đầy đủ 8 biểu đồ thời gian thực trực quan.
    * Menu dropdown hiển thị "System Dashboard" trực quan ([`frontend/screenshots/admin-dropdown-with-dashboard.png`](file:///home/light/Documents/B3/web_app/Bashlab/frontend/screenshots/admin-dropdown-with-dashboard.png)).
  * ESLint: `npm --prefix frontend run lint` $\rightarrow$ **0 warnings, 0 errors**.
  * E2E Suites: **15/15 tests pass 100%**.
* **Trạng thái**: Hoàn thành.

---

### [2026-10-02 22:00] Thiết kế & Nâng cấp Hệ thống Biểu đồ Dashboard Quản trị Hiện đại (Admin Activity Overview)

* **Yêu cầu & Định hướng**:
  * Chấm dứt việc tìm kiếm đồ thị edtech chung chung, tập trung trực diện vào **kiến trúc thực tế của BashLab**, hạ tầng sandbox runner và pipeline Prometheus/Grafana.
  * Lấy dữ liệu time-series thực tế từ Prometheus/Grafana để vẽ các đồ thị thiết yếu lên phần **Activity Overview** trong Admin Panel (`/admin/activity`).
  * Giao diện biểu đồ phải **thân thiện, đơn giản, hiện đại và tinh tế**, không sơ sài hay đơn điệu (loại bỏ đường kẻ gấp khúc thô ráp, thêm đường cong mượt, dải màu gradient phát sáng, live badge thời gian thực).
  * Kiểm chứng thực tế qua browser screenshot và toàn bộ E2E Playwright test suites.

* **Phân tích Kiến trúc Dữ liệu Prometheus của BashLab**:
  * Endpoint `GET /api/admin/dashboard?range=1h` truy vấn Prometheus (cổng 9090) lấy các chuỗi time series:
    1. **Sandbox & Thực thi terminal**: `bashlab_active_sessions`, `bashlab_runner_jobs_active`, `bashlab_runner_jobs_pending`, `bashlab_commands_total`, `bashlab_command_duration_seconds`.
    2. **Lưu lượng & Độ ổn định API**: `bashlab_http_requests_total` (2xx, 3xx, 4xx, 5xx), `bashlab_http_request_duration_seconds` (p95 latency), `rateLimited` (429 rejected).
    3. **Tài nguyên Hệ thống & An ninh Truy cập**: `bashlab_auth_events_total` (login_ok, login_failed, refresh_ok, refresh_failed), `process_resident_memory_bytes` (RSS RAM), `process_cpu_seconds_total` (CPU usage).

* **Các thay đổi đã triển khai**:
  * [`frontend/components/admin/LineChart.jsx`](file:///home/light/Documents/B3/web_app/Bashlab/frontend/components/admin/LineChart.jsx):
    * **Thuật toán Monotone Cubic Spline (`buildSmoothPath`)**: Thay thế các đường gấp khúc SVG thẳng (`L x, y`) bằng đường cong Bezier bậc ba mượt mà với tính toán control point độc lập, giữ nguyên độ chính xác của các điểm dữ liệu.
    * **Hiệu ứng Gradient Area Fill (`buildSmoothArea`)**: Tạo dải màu gradient trong suốt (`linearGradient` từ `opacity: 0.25` xuống `0.00`) tương ứng với từng đường dữ liệu, tạo chiều sâu thị giác hiện đại.
    * **Live Reading Badge**: Thêm huy hiệu đo đạc trực tiếp trên góc phải header biểu đồ kèm đèn tín hiệu neon nhấp nháy (`pulsing dot`), hiển thị giá trị p95 hoặc mức tiêu thụ mới nhất.
    * **Cyber Legends & Interactive Floating Tooltip**:
      * Chú thích (legend) hiện đại có hiển thị số liệu tức thời của từng chuỗi (vd: `2xx 17.3 /min`, `3xx 1.33 /min`, `sessions 1`).
      * Tooltip nổi kính mờ (`backdrop-filter: blur(12px)`), vòng tròn dữ liệu phát sáng (`glowing circle`) khi di chuột qua trục thời gian.
    * **Trạng thái Trống (Empty State) Mỹ thuật**: Hiển thị mô hình sóng âm cyber mềm mại khi chưa có dữ liệu thời gian thực trong cửa sổ chọn, thay cho văn bản phẳng đơn điệu.
  * [`frontend/components/admin/Dashboard.jsx`](file:///home/light/Documents/B3/web_app/Bashlab/frontend/components/admin/Dashboard.jsx) & [`frontend/components/admin/Dashboard.module.css`](file:///home/light/Documents/B3/web_app/Bashlab/frontend/components/admin/Dashboard.module.css):
    * Tái cấu trúc 9 biểu đồ thành 3 phân nhóm chức năng trực quan:
      1. **`TERMINAL & SANDBOX EXECUTION`**: Sandbox load, Commands per minute, Command time p95.
      2. **`API TRAFFIC & RELIABILITY`**: API requests per minute, API response time p95, Requests rejected by rate limits.
      3. **`SYSTEM RESOURCES & ACCESS SECURITY`**: Sign-in activity per minute, API memory (RSS), API CPU.
    * Thiết lập bảng màu neon Cyber Lab: Neon Emerald (`#00e599`), Electric Cyan (`#00d8f6`), Amber Gold (`#f59e0b`), Rose Coral (`#f43f5e`), Cyber Purple (`#a855f7`).
  * [`frontend/tests/e2e/specs/admin-dashboard.spec.js`](file:///home/light/Documents/B3/web_app/Bashlab/frontend/tests/e2e/specs/admin-dashboard.spec.js):
    * Cập nhật test mock kịch bản graceful degradation khi Prometheus ngắt kết nối.
    * Chỉnh sửa assertion kiểm tra kiểu dữ liệu `available` là boolean.

* **Kiểm chứng thực tế (Real Evidence & Verification)**:
  * **Trải nghiệm Trình duyệt Thật (Browser Verification)**:
    * Chụp ảnh màn hình toàn cảnh trang Admin Activity với dữ liệu sống từ Prometheus: [`frontend/screenshots/admin-activity-upgraded.png`](file:///home/light/Documents/B3/web_app/Bashlab/frontend/screenshots/admin-activity-upgraded.png).
    * Xác nhận trực quan: 9 đồ thị hiển thị mượt mà, đường cong spline mềm mại, gradient đổ bóng thanh thoát, live badge thời gian thực (`p95 0.91 s`, `99.8 MB`, `0.01 cores`), tooltip kính mờ hiển thị chính xác từng mốc thời gian.
  * **ESLint**: `npm --prefix frontend run lint` $\rightarrow$ **0 warnings, 0 errors**.
  * **Backend Tests**: `npm --prefix backend test` $\rightarrow$ **74/74 tests pass 100%**.
  * **E2E Playwright Suites**: `smoke.spec.js`, `landing-start-learning.spec.js`, `admin-dashboard.spec.js`, `workspace.spec.js` $\rightarrow$ **19/19 tests PASS**.
* **Trạng thái**: Hoàn thành.

---

### [2026-10-02 22:45] Tích hợp Giao diện Lab Workspace Mới từ `origin/feature/lab-workspace` (ChatGPT-Style Sidebar & Full 100vh)

* **Yêu cầu & Mục tiêu**:
  * Kéo các cập nhật giao diện mới nhất từ commit `1e1691a` (`origin/feature/lab-workspace` của `LowkeyProd`) về nhánh làm việc.
  * Tích hợp thanh Sidebar phong cách ChatGPT/Cursor IDE, menu tài khoản dạng Popover, mở rộng không gian làm việc Full 100vh (loại bỏ top Navbar trong trang làm bài).
  * **Tránh lỗi & Kiểm chứng thực tế (Strict User Constraint)**:
    * Không ghi đè mù quáng làm mất logic kiểm tra kết quả bài làm: Phục hồi nút `Check Solution` và hàm kiểm tra verifier trên backend container.
    * Tự động khởi tạo và kết nối sandbox mượt mà, khắc phục lỗi duplicate welcome log.
    * Tự động sửa lỗi tự phục hồi thư mục workspace (`sessionManager.js`) khi gặp tình trạng tồn tại sẵn hoặc thiếu thư mục con `tmp`.
    * Chụp ảnh màn hình thực tế từng trạng thái: Booted, Commands, Solved, Popover menu, Collapsed sidebar.

* **Các thay đổi thực hiện**:
  * [`frontend/components/layout/SiteChrome.jsx`](file:///home/light/Documents/B3/web_app/Bashlab/frontend/components/layout/SiteChrome.jsx) & [`frontend/components/layout/SiteChrome.module.css`](file:///home/light/Documents/B3/web_app/Bashlab/frontend/components/layout/SiteChrome.module.css):
    * Ẩn thanh Navbar chung trên đỉnh (`{!isWorkspace && <Navbar />}`) và đặt `padding-top: 0` khi truy cập trang `/courses/.../labs/...`.
    * Duy trì hook dọn dẹp Service Worker / Cache Storage trên trình duyệt để tránh lỗi PWA cũ.
  * [`frontend/components/workspace/LabWorkspace.module.css`](file:///home/light/Documents/B3/web_app/Bashlab/frontend/components/workspace/LabWorkspace.module.css):
    * Cập nhật toàn bộ hệ thống CSS của ChatGPT Sidebar, BrandLogo toggle, Popover menu, avatar initials, panel split resizer và các breakpoints responsive.
  * [`frontend/components/workspace/LabWorkspace.jsx`](file:///home/light/Documents/B3/web_app/Bashlab/frontend/components/workspace/LabWorkspace.jsx):
    * Tích hợp [`BrandLogo`](file:///home/light/Documents/B3/web_app/Bashlab/frontend/components/shared/BrandLogo.jsx) ở đỉnh Sidebar kèm phím tắt bàn phím đóng/mở nhanh: `⌘/Ctrl + Shift + S` hoặc `⌘/Ctrl + B`.
    * Tích hợp menu tài khoản Popover ở chân Sidebar với avatar chữ cái (`getInitials`), tên người dùng, huy hiệu `"Pro Learner"` / `"Administrator"`, popup mở ra các liên kết Profile, My Learning, Courses, Log out.
    * Bảo lưu logic cốt lõi: Nút `Check Solution` ở góc trên bên phải, hàm `handleCheckSolution` chạy verifier đối chiếu trạng thái container thật, ghi nhận tiến độ `done` vào database Supabase, và lưu `bashlab:last_lab:` vào `localStorage`.
  * [`backend/src/services/sessionManager.js`](file:///home/light/Documents/B3/web_app/Bashlab/backend/src/services/sessionManager.js):
    * Nâng cấp `mkdir` trong `create` và `makeDirectories` với cờ `recursive: true` để không bị lỗi `EEXIST` khi tái sử dụng đường dẫn lease có sẵn.
    * Thêm cơ chế tự phục hồi (self-healing) trong `checkQuota`: Tự động tạo lại thư mục `home`/`tmp` với quyền `0o2770` nếu thiếu thay vì quăng lỗi `ENOENT`.
  * [`frontend/tests/e2e/specs/workspace.spec.js`](file:///home/light/Documents/B3/web_app/Bashlab/frontend/tests/e2e/specs/workspace.spec.js):
    * Viết kịch bản kiểm thử toàn diện cho giao diện mới: Khởi động container sandbox $\rightarrow$ Thực thi các lệnh `pwd`, `ls -la`, `cd /var/log`, `cd ~` $\rightarrow$ Bấm Check Solution $\rightarrow$ Mở menu Popover $\rightarrow$ Thu gọn Sidebar về icon-only $\rightarrow$ Kiểm tra bản ghi trong DB.

* **Kiểm chứng thực tế (Real Evidence & Verification)**:
  * **Ảnh chụp màn hình thực tế (Trải nghiệm thật trên trình duyệt)**:
    1. Trạng thái Full 100vh Booted với Sidebar ChatGPT: [`screenshots/workspace-chatgpt-booted.png`](file:///home/light/Documents/B3/web_app/Bashlab/screenshots/workspace-chatgpt-booted.png).
    2. Thực thi lệnh thật trong sandbox container: [`screenshots/workspace-chatgpt-commands.png`](file:///home/light/Documents/B3/web_app/Bashlab/screenshots/workspace-chatgpt-commands.png).
    3. Hoàn thành bài lab và vượt qua kiểm tra verifier: [`screenshots/workspace-chatgpt-passed.png`](file:///home/light/Documents/B3/web_app/Bashlab/screenshots/workspace-chatgpt-passed.png).
    4. Menu Popover tài khoản người dùng mở mượt mà: [`screenshots/workspace-chatgpt-popover.png`](file:///home/light/Documents/B3/web_app/Bashlab/screenshots/workspace-chatgpt-popover.png).
    5. Thanh Sidebar thu gọn mượt mà về dạng icon 56px: [`screenshots/workspace-chatgpt-collapsed.png`](file:///home/light/Documents/B3/web_app/Bashlab/screenshots/workspace-chatgpt-collapsed.png).
  * **ESLint**: `npm --prefix frontend run lint` $\rightarrow$ **0 warnings, 0 errors**.
  * **Backend Tests**: `npm --prefix backend test` $\rightarrow$ **74/74 tests pass 100%**.
  * **E2E Playwright Suites**: `smoke.spec.js`, `landing-start-learning.spec.js`, `admin-dashboard.spec.js`, `workspace.spec.js`, `courses-and-progress.spec.js`, `account-profile.spec.js` $\rightarrow$ **23/23 tests PASS 100% (47.0s)**.
* **Trạng thái**: Hoàn thành.

---

### [2026-10-02 23:20] Tích hợp Toàn diện Admin Panel Mới từ `origin/feature/admin-studio` (Content Studio & Redesigned Users Manager)

* **Yêu cầu & Mục tiêu**:
  * Tích hợp toàn bộ tính năng Admin Studio mới từ commit `5d8f4e3` (`origin/feature/admin-studio` của `LowkeyProd`) vào nhánh làm việc hiện tại (`feature/full-feature-revision`).
  * **Bảo vệ toàn vẹn hệ thống hiện hữu (Strict Safeguard & Zero Regression)**:
    * Giữ nguyên 100% trang Subscription (`subscription/page.js`, `subscription.module.css`) mà commit `5d8f4e3` đã lỡ xóa nhầm trên nhánh remote.
    * Bảo toàn hệ thống biểu đồ Prometheus Cubic Spline sống động tại `/admin/activity` (`LineChart.jsx`, `Dashboard.jsx`).
    * Bảo toàn không gian làm việc Full 100vh ChatGPT Sidebar và nút Check Solution tại `/courses/.../labs/...` (`LabWorkspace.jsx`).
    * Duy trì cơ chế purge Service Worker / Cache Storage trong `SiteChrome.jsx`.

* **Các thành phần đã triển khai & tích hợp**:
  1. **Thanh Title Bar VSCode cho Admin (`AdminGate.jsx` & `Admin.module.css`)**:
     * Thay thế subnav cũ bằng thanh tiêu đề phong cách Visual Studio Code full-width (cao 46px, `#0A0D14`, viền mờ), tích hợp logo BashLab, menu chuyển đổi mượt mà giữa các mục: **Content**, **Users**, **Activity**.
     * Hỗ trợ 2 cổng cắm portal tiêu đề: `#admin-header-center` (cho Breadcrumb Command Center) và `#admin-header-right` (cho trạng thái Auto-Save và nút Save).
     * Phân tách vùng hiển thị linh hoạt: `.shellStudio` (full-height 100% không cuộn cho Studio) và `.shellStandard` (cuộn mượt, padding căn giữa cho Users & Activity).
  2. **Content Studio Đẳng Cấp VSCode (`ContentStudio.jsx` & `ContentStudio.module.css` - hơn 4.600 dòng code)**:
     * Cột trái Explorer với cây thư mục Course, Chapter, Lesson trực quan, bộ lọc tìm kiếm tức thời, chỉ số trạng thái Draft / Published.
     * Cột giữa Editor mạnh mẽ: Hỗ trợ tab Content, Objectives, Hints, chọn level (Beginner/Intermediate/Advanced), chọn status, đếm dòng/từ tự động, auto-save ngầm với cờ trạng thái "Saved".
     * Cột phải Student Preview: Xem trước bài học với chế độ xem Interactive Lab / Terminal Output trên các viewport Desktop, Tablet, Mobile.
     * Tích hợp trực tiếp vào `/admin/studio` và `/admin/content` (tab Studio).
  3. **Quản trị Người dùng Thế hệ Mới (`UsersManager.jsx` & `UsersManager.module.css`)**:
     * Bảng danh sách người dùng hiển thị avatar phối màu ngẫu nhiên hài hòa, tên, email, thẻ trạng thái Locked / Active, pill vai trò Admin / Learner.
     * Hỗ trợ đầy đủ bộ lọc tìm kiếm (`aria-label="Search users"`), sắp xếp theo Hoạt động gần nhất / Cũ nhất / Tên A-Z / Số bài hoàn thành.
     * Nút thao tác nhanh trên từng dòng (`Make learner` / `Make admin`, `Lock` / `Unlock`) kết hợp nút `Manage` mở Modal chi tiết tài khoản (thống kê tiến độ % hoàn thành bài lab, trạng thái email verified, ngày gia nhập).
  4. **Bổ sung API Thao Tác Nội Dung (`writeApi.js`)**:
     * Thêm phương thức `deleteChapter(id)` và `deleteLesson(id)`.
  5. **Khóa Cuộn Trình Duyệt 100vh Toàn Diện cho Admin (`globals.css`, `SiteChrome.jsx`, `SiteChrome.module.css`)**:
     * Bổ sung `.admin-locked` trên `html` và `body` loại bỏ triệt để hiện tượng tràn thanh cuộn toàn trang khi làm việc trong Admin Studio.
     * Tự động ẩn Header Navbar toàn trang khi ở trong khu vực `/admin/*` để tối đa hóa không gian thao tác studio.

* **Kiểm chứng thực tế (Real Evidence & Verification)**:
  * **ESLint**: `npm --prefix frontend run lint` $\rightarrow$ **0 warnings, 0 errors**.
  * **Backend Tests**: `npm --prefix backend test` $\rightarrow$ **74/74 tests pass 100%**.
  * **Playwright E2E Suites**:
    * `admin-dashboard.spec.js` + `admin-users.spec.js` $\rightarrow$ **7/7 tests pass 100%**.
    * `smoke.spec.js` + `workspace.spec.js` $\rightarrow$ **10/10 tests pass 100%**.
    * Toàn bộ test suite liên hoàn (24 tests) $\rightarrow$ **24/24 tests pass 100% (51.0s)**.
  * **Ảnh chụp màn hình thực tế (Trải nghiệm người dùng thật với phiên Admin Authenticated)**:
    1. **Content Studio**: [`frontend/screenshots/admin-studio-content.png`](file:///home/light/Documents/B3/web_app/Bashlab/frontend/screenshots/admin-studio-content.png) - Giao diện VSCode hoàn chỉnh với Explorer cây thư mục, Editor và Student Preview.
    2. **Users Manager**: [`frontend/screenshots/admin-users-manager.png`](file:///home/light/Documents/B3/web_app/Bashlab/frontend/screenshots/admin-users-manager.png) - Danh sách người dùng hiện đại, căn chỉnh thẳng hàng, các nút thao tác nhanh và modal quản lý.
    3. **Activity Overview**: [`frontend/screenshots/admin-activity-overview.png`](file:///home/light/Documents/B3/web_app/Bashlab/frontend/screenshots/admin-activity-overview.png) - Biểu đồ Prometheus live Monotone Cubic Spline hoạt động ổn định dưới thanh Title Bar mới.
    4. **Subscription Page**: [`frontend/screenshots/subscription-page-intact.png`](file:///home/light/Documents/B3/web_app/Bashlab/frontend/screenshots/subscription-page-intact.png) - Trang bảng giá & gói thuê bao nguyên vẹn, các thẻ giá, toggle và hiệu ứng hiển thị hoàn hảo.
    5. **Lab Workspace**: [`frontend/screenshots/workspace-intact.png`](file:///home/light/Documents/B3/web_app/Bashlab/frontend/screenshots/workspace-intact.png) - Không gian làm việc 100vh với ChatGPT Sidebar và nút Check Solution hoạt động trơn tru.
* **Trạng thái**: Hoàn thành xuất sắc.

