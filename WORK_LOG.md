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

