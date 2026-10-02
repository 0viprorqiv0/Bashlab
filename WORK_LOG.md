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
