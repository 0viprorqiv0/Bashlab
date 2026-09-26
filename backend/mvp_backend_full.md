Backend Website MVP

1. Access Layer
→ Auth Service: đăng ký, đăng nhập, logout, xác thực user.
→ Auth Middleware: kiểm tra user đã login.
→ UID Mapping Service: map user_id với sandbox_uid riêng.

2. Terminal Communication Layer
→ Shell REST API: tạo session, gửi command, reset, lấy history.
→ Request Validator: kiểm tra request, session_id, command, payload.

3. Shell Session Layer
→ Shell Session Manager: tạo, đóng, resume phiên shell.
→ Session State Manager: lưu cwd, workspace_path, sandbox_uid, trạng thái session.
→ Session Ownership Checker: chặn user truy cập session người khác.

4. Sandbox Layer
→ Sandbox Manager: quản lý sandbox tổng thể.
→ Sandbox Root Manager: tạo root ảo với /bin, /etc, /usr read-only.
→ Workspace Manager: tạo workspace riêng /tmp/u-{user_id}.
→ Filesystem Permission Manager: quản lý quyền đọc/ghi và owner UID.

5. Command Layer
→ Command Intake: nhận command từ API.
→ Command Parser: tách command name và arguments.
→ Command Policy: kiểm tra accept/reject command.
→ Command Executor: chạy command hợp lệ trong sandbox.
→ Command Result Builder: tạo stdout, stderr, exitCode, cwd.

6. Resource Control Layer
→ Process Guard: kiểm soát process sinh ra từ command.
→ Timeout Manager: dừng command chạy quá lâu.
→ Output Limiter: giới hạn kích thước output.
→ Process Isolation Guard: chặn can thiệp process user khác.

7. Output Layer
→ Output Handler: nhận kết quả command.
→ REST Response Formatter: trả output dạng JSON.
→ Output Sanitizer: escape output trước khi render.

8. Learning Layer
→ Lesson Service: quản lý bài học Shell 101 cơ bản.
→ Progress Service: lưu tiến độ học cơ bản.

9. Data Layer
→ Database Layer: lưu users, sessions, UID mapping, history, lessons, progress.

10. Operation Layer
→ Cleanup Worker: dọn workspace/session inactive và process còn sót.
→ Cron Job Manager: chạy cleanup định kỳ.
→ Config / Policy Settings: lưu sandbox path, UID range, whitelist, timeout, resource limit.
