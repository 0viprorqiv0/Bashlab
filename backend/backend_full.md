Backend Website

1. Access Layer
→ Auth Service: đăng ký, đăng nhập, logout, xác thực user.
→ User / Role Manager: quản lý user và role student.
→ UID Mapping Service: map user_id với sandbox_uid riêng.

2. Terminal Communication Layer
→ Shell REST API: nhận command ngắn, tạo session, reset, lấy history.
→ WebSocket Gateway: kết nối realtime frontend terminal với backend.
→ Request Validator: kiểm tra request, session_id, command và payload.

3. Shell Session Layer
→ Shell Session Manager: tạo, đóng, resume phiên shell.
→ Session State Manager: lưu cwd, workspace_path, sandbox_uid, trạng thái session.
→ Session Ownership Checker: chặn user truy cập session của người khác.

4. Sandbox Layer
→ Sandbox Manager: quản lý môi trường sandbox tổng thể.
→ Sandbox Root Manager: tạo root ảo với /bin, /etc, /usr read-only.
→ Workspace Manager: tạo workspace riêng /tmp/u-{user_id}.
→ Filesystem Permission Manager: quản lý quyền đọc/ghi và owner UID.
→ Sandbox Lifecycle Manager: create, reset, recreate, destroy sandbox/workspace.

5. Command Layer
→ Command Intake: nhận command từ API/WebSocket.
→ Command Parser: tách command name và arguments.
→ Command Normalizer: chuẩn hóa command và path.
→ Command Policy: kiểm tra accept/reject command.
→ Command Dispatcher: chuyển command đến handler phù hợp.
→ Command Executor: chạy command hợp lệ trong sandbox.
→ Command Result Builder: tạo stdout, stderr, exitCode, cwd.
→ Command History Hook: gửi dữ liệu command sang history service.

6. Resource Control Layer
→ Process Guard: kiểm soát process sinh ra từ command.
→ Timeout Manager: dừng command chạy quá lâu.
→ Memory / CPU Limiter: giới hạn RAM và CPU.
→ Output Limiter: giới hạn kích thước output.
→ Network Guard: tắt hoặc giới hạn network.
→ Process Isolation Guard: chặn can thiệp process user khác.

7. Output Layer
→ Output Handler: nhận kết quả command.
→ REST Response Formatter: trả output dạng JSON.
→ WebSocket Output Streamer: stream output realtime.
→ HTML Escape / Sanitizer: escape output trước khi render.

8. Learning Layer
→ Lesson Service: quản lý bài học Shell 101.
→ Task Checker: kiểm tra task học tập đã hoàn thành chưa.
→ Hint Service: trả gợi ý khi user sai.
→ Progress Service: lưu tiến độ và unlock bài tiếp theo.

9. Data Layer
→ Database Layer: lưu users, sessions, UID mapping, history, lessons, progress.
→ Cache / Runtime State: lưu active sessions, websocket connections, rate limit counters.

10. Operation Layer
→ Cleanup Worker: dọn workspace/session inactive và process còn sót.
→ Cron Job Manager: chạy cleanup định kỳ.
→ Admin / Monitoring: theo dõi user, session, process, disk usage, lỗi.
→ Config / Policy Settings: lưu sandbox path, UID range, whitelist, timeout, resource limit.
