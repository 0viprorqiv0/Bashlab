# TÀI LIỆU TOÀN DIỆN DỰ ÁN BASHLAB (MASTER PROJECT HANDBOOK)
### Hệ Thống Học Shell Tương Tác Trực Tuyến — Kiến Trúc Sandbox, Đánh Giá Chịu Tải & Kế Hoạch Bảo Vệ Đồ Án

---

| Thông tin | Chi tiết |
| :--- | :--- |
| **Tên đồ án** | **BashLab** (Interactive Bash Learning Platform) |
| **Phân loại** | Category: **Others** (Đề tài tự chọn có tiềm năng nâng cấp Đồ án nhóm lớn / Thực tập) |
| **Quy mô nhóm** | Tối đa 7 thành viên |
| **Thời lượng thuyết trình** | **5 – 7 phút** (Hội đồng bốc thăm ngẫu nhiên 1–2 thành viên trình bày & Q&A) |
| **Mục tiêu điểm số** | **Advanced Requirements (Khóa điểm 9–10: 5 tính năng chính + Chức năng nâng cao)** |
| **Nhánh Git thực hiện** | `SuperBQA` |

---

## MỤC LỤC
1. [Phần 1: Giới thiệu Dự án & Bài toán Thực tế](#phần-1-giới-thiệu-dự-án--bài-toán-thực-tế)
2. [Phần 2: Khóa Tiêu chí Chấm điểm (Rubric Alignment)](#phần-2-khóa-tiêu-chí-chấm-điểm-rubric-alignment)
3. [Phần 3: Thiết kế Kiến trúc Kỹ thuật & Hạ tầng Sandbox](#phần-3-thiết-kế-kiến-trúc-kỹ-thuật--hạ-tầng-sandbox)
4. [Phần 4: Đánh giá Khả năng Chịu tải & Kịch bản 1.000 Users](#phần-4-đánh-giá-khả-năng-chịu-tải--kịch-bản-1000-users)
5. [Phần 5: Kịch bản Thuyết trình 5–7 Phút (Bấm Giờ Từng Giây)](#phần-5-kịch-bản-thuyết-trình-57-phút-bấm-giờ-từng-giây)
6. [Phần 6: Cẩm nang Câu hỏi Phản biện Hội đồng (Q&A Defense Guide)](#phần-6-cẩm-nang-câu-hỏi-phản-biện-hội-đồng-qa-defense-guide)

---

## PHẦN 1: GIỚI THIỆU DỰ ÁN & BÀI TOÁN THỰC TẾ

### 1.1. Bối cảnh đề tài
Học sử dụng dòng lệnh Linux (Bash Shell) là kỹ năng nền tảng bắt buộc của mọi sinh viên Công nghệ Thông tin, Kỹ thuật Phần mềm, DevOps và An toàn Thông tin. Tuy nhiên, việc cài đặt máy ảo cá nhân (VMware, VirtualBox) hay dual-boot Linux thường gặp khó khăn về cấu hình máy, tốn dung lượng và dễ gây nản lòng cho người mới bắt đầu.

**BashLab** được xây dựng như một nền tảng thực hành Bash trực tuyến qua trình duyệt web:
* Học viên đọc bài học, xem cú pháp, gõ lệnh trực tiếp trên web terminal.
* Lệnh được chuyển về server thực thi an toàn trong môi trường Linux thật.
* Hệ thống tự động chấm điểm (`Check Solution`) và trả phản hồi tức thì.

### 1.2. Hai vấn đề cốt tử của các hệ thống thực hành Shell
1. **Hiểm họa an ninh khi chạy trực tiếp trên host:** Nếu cho người dùng chạy lệnh tùy ý trên server thật, chỉ một lệnh `rm -rf /` hay script độc hại có thể phá hủy toàn bộ hệ điều hành của trường hoặc biến server thành công cụ đào coin/tấn công DDoS.
2. **Nghẽn tài nguyên nếu dùng Docker truyền thống:** Cách tiếp cận thông thường là tạo 1 container Docker riêng cho mỗi học viên (Container-per-session). Khi có 50–100 sinh viên cùng thực hành trong giờ học, server phải duy trì 50–100 container ngốn từ 3GB – 8GB RAM, gây quá tải CPU và sập máy chủ vật lý.

👉 **Lời giải của BashLab:** Áp dụng kiến trúc **"1 Docker Ubuntu Runner dùng chung + Bubblewrap (`bwrap`) cho từng lệnh + Phân vùng lưu trữ trên SSD"** để đạt được cả 3 mục tiêu: **Cách ly an toàn**, **Tối ưu tài nguyên cực đại** và **Tốc độ phản hồi tức thì (< 3ms)**.

---

## PHẦN 2: KHÓA TIÊU CHÍ CHẤM ĐIỂM (RUBRIC ALIGNMENT)

Tiêu chí của môn học yêu cầu:
* **Standard:** Giao diện hoàn chỉnh + 2–3 tính năng cốt lõi.
* **Advanced (Điểm tối đa 9–10):** 4–5 tính năng chính + Chức năng nâng cao (*Optimize performance, Benchmarking, Stress testing...*).

```text
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                           MA TRẬN TÍNH NĂNG ĐẠT CHUẨN XUẤT SẮC (ADVANCED)                   │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│ 5 TÍNH NĂNG CHÍNH (MAIN FEATURES)                                                          │
│  [1] Interactive Shell Workspace: Terminal thực thi lệnh Linux thật trong sandbox bwrap,    │
│      cơ chế Persistent CWD (nhớ đường dẫn khi cd sang thư mục khác).                        │
│  [2] Automated Task Verifier: Nút 'Check Solution' tự động chấm bài tập qua kịch bản        │
│      kiểm tra file/nội dung/quyền hạn, hiện tích xanh ✅ trực quan cho từng tiêu chí.        │
│  [3] Curriculum & Progress Tracking: Danh mục khóa học, cây chương/bài (Shell 101) và lưu   │
│      tiến độ học tập của người dùng.                                                        │
│  [4] Session & Storage Lifecycle: Cấp phát workspace riêng theo UUID trên NVMe SSD,         │
│      tiến trình Reaper Daemon tự động dọn dẹp sau 30 phút không hoạt động.                  │
│  [5] Operations Activity Dashboard: Giao diện quản trị theo dõi danh sách phiên đang chạy,  │
│      thời gian thực thi và cơ chế dừng khẩn cấp (Emergency Kill/Reset Session).             │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│ CÁC CHỨC NĂNG NÂNG CAO (ADVANCED FUNCTIONALITIES - ĐIỂM THƯỞNG ĐẶC BIỆT)                    │
│  ★ Performance Optimization: 1 Docker Runner dùng chung (~40MB RAM nền) + bwrap (< 3ms/cmd) │
│    + Phân vùng SSD /var/tmp/ giải phóng hoàn toàn áp lực RAM.                               │
│  ★ Benchmarking & Stress Testing: Kịch bản test tải tự động (10, 20, 30, 50 requests        │
│    đồng thời), đo độ trễ p50/p95 latency và vẽ biểu đồ RAM/CPU ổn định.                     │
│  ★ Application Quota & Circuit Breaker: Khóa file 10MB (ulimit -f), quota workspace 30MB /  │
│    100 files, timeout 3s, output cap 64KB và Rate Limiter chống spam.                       │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## PHẦN 3: THIẾT KẾ KIẾN TRÚC KỸ THUẬT & HẠ TẦNG SANDBOX

### 3.1. Sơ đồ kiến trúc tổng thể

```text
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                 TRÌNH DUYỆT WEB (FRONTEND)                              │
│         Next.js 14 App Router • Terminal Demo • Interactive Lesson Workspace            │
└────────────────────────────────────────────┬────────────────────────────────────────────┘
                                             │ HTTP REST (JSON Payload)
                                             ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                  NODE.JS BACKEND API                                    │
│   • Rate Limiter (Max 30 req/phút/IP)                                                   │
│   • Admission Control: Concurrency Queue (4 active, 32 pending, 5s timeout)             │
│   • Session Manager (Map memory: sessionId, cwd, lastActiveAt, commandCount)            │
│   • Application Quota Guard (Dung lượng < 30MB, Số files < 100)                         │
│   • Reaper Worker (Scan mỗi 5 phút, xóa session inactive > 30 phút)                     │
│   • Task Verifier Engine (Out-of-band assertion cho nút 'Check Solution')               │
└────────────────────────────────────────────┬────────────────────────────────────────────┘
                                             │ docker exec -i bashlab-box ...
                                             ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                          1 DOCKER UBUNTU RUNNER DÙNG CHUNG                              │
│                    (Image: ubuntu:24.04 • --memory=512m --cpus=2 --pids=128)            │
│                                                                                         │
│   ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│   │                      BUBBLEWRAP SANDBOX (CHO TỪNG LỆNH)                         │   │
│   │  • Khởi tạo siêu tốc (< 3 mili-giây), tiêu tốn 0 MB RAM nền                     │   │
│   │  • Thư mục hệ thống /bin, /usr, /lib ở chế độ READ-ONLY                         │   │
│   │  • Tắt 100% mạng (--unshare-all, không có Internet/LAN)                         │   │
│   │  • Cô lập Process (/proc riêng, chỉ thấy PID 1 và lệnh của mình)                │   │
│   │  • Execution Timeout: 3.0 giây (bảo vệ bằng --die-with-parent)                  │   │
│   │  • Output Truncation: 64 KB tối đa                                              │   │
│   └─────────────────────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────┬────────────────────────────────────────────┘
                                             │ Mount thư mục session
                                             ▼
                    /var/tmp/bashlab/workspaces/<session-uuid>/
                         ├── home/  ──> Mount vào /home/student
                         └── tmp/   ──> Mount vào /tmp (SSD-backed)
```

---

### 3.2. Giải pháp phân vùng SSD chống tràn RAM
* **Vấn đề thực tế:** Thư mục `/tmp` mặc định trên Linux là `tmpfs` (lưu trên RAM, chiếm tới 50% RAM máy). Nếu để workspace học viên tại `/tmp`, khi họ tạo file lớn (ví dụ `dd if=/dev/zero ...`), RAM máy chủ sẽ bị cạn kiệt, kích hoạt Linux OOM Killer làm sập server.
* **Giải pháp của BashLab:** Đặt toàn bộ workspace trên phân vùng **NVMe SSD vật lý** tại `/var/tmp/bashlab/workspaces/<uuid>/`. Cả `home/` và `tmp/` của session đều được bind mount từ SSD.
* **Lợi ích:** Tiêu tốn **0% RAM vật lý** cho việc lưu trữ file; tốc độ NVMe SSD cực cao (hàng GB/s) đảm bảo thao tác tức thì.

---

### 3.3. Cơ chế CWD Tracker an toàn (Bọc lệnh qua `wrap.sh`)
Để học viên gõ `cd demo` thì lệnh tiếp theo `pwd` vẫn nhớ đúng thư mục, backend sử dụng script bọc lệnh mẫu:

```bash
#!/usr/bin/env bash
# /opt/bashlab/wrap.sh

__bl_finish() {
  local rc="$?" raw cwd
  builtin trap - EXIT
  set +e +u

  # Xuất CWD vật lý qua File Descriptor 3 (phân tách bằng NUL)
  if raw=$(builtin pwd -P 2>/dev/null && builtin printf '\001'); then
    cwd=${raw%$'\n\001'}
    builtin printf '%s\0' "$cwd" >&3
  fi
  builtin exit "$rc"
}

builtin trap __bl_finish EXIT

# Lệnh học viên được nạp qua file command.sh (Read-only), không ghép chuỗi
builtin source -- "$1"
builtin exit "$?"
```
* **Bảo toàn 100%:** Kể cả lệnh có `exit 1` hay lỗi cú pháp giữa chừng, trap `EXIT` vẫn luôn kích hoạt để cập nhật CWD.
* **Không lẫn dữ liệu:** FD 1 (stdout), FD 2 (stderr), FD 3 (CWD metadata) hoàn toàn tách biệt.

---

### 3.4. Quản lý dung lượng & Vòng đời tự động (Reaper)
1. **Kiểm soát file (`ulimit -f 10240`):** Mỗi file tạo ra bị khóa cứng ở mức tối đa **10 MB**. Vượt quá ngưỡng này, kernel gửi tín hiệu `SIGXFSZ` ngắt tiến trình ngay lập tức.
2. **Kiểm soát Workspace (Application Quota):** Trước và sau khi chạy lệnh, Node.js kiểm tra dung lượng (`< 30MB`) và số lượng file (`< 100`). Nếu vượt, từ chối chạy và yêu cầu dọn dẹp hoặc bấm Reset.
3. **Reaper Service:** Tiến trình nền quét mỗi **5 phút**:
   - Nếu `Date.now() - session.lastActiveAt > 30 phút` (bỏ máy, đóng tab) -> Tự động xóa sạch thư mục workspace (`rm -rf`) và giải phóng bộ nhớ.

---

## PHẦN 4: ĐÁNH GIÁ KHẢ NĂNG CHỊU TẢI & KỊCH BẢN 1.000 USERS

### 4.1. Bóc tách 2 khái niệm tải
Khi thảo luận về "1.000 người dùng đồng thời", cần phân biệt rõ:
1. **1.000 Connected / Browsing Users:** 1.000 người đang mở trang web đọc đề bài, xem lý thuyết. Tải này chỉ tốn vài MB RAM để phục vụ HTTP tĩnh, 1 server Node.js thông thường xử lý dễ dàng.
2. **1.000 Burst Executing Commands:** 1.000 người cùng bấm `Enter` tại đúng 1 giây.
   * Trên cấu hình máy chủ đơn hiện tại (`concurrency=4, queue=32`):
     Hệ thống nhận 4 lệnh xử lý ngay + 32 lệnh chờ trong hàng đợi = **36 lệnh**.
     **964 lệnh vượt ngưỡng sẽ bị từ chối an toàn bằng HTTP `429 Too Many Requests`**.
   * **Ý nghĩa:** Cơ chế Admission Control bảo vệ máy chủ **không bao giờ bị quá tải, không bị crash, không bị cạn RAM**.

### 4.2. Mô hình toán học thực tế (Định luật Little's Law)
Trong thực tế lớp học, học viên không bấm lệnh liên tục mỗi giây mà cần thời gian đọc và suy nghĩ (trung bình 1 lệnh / 10–15 giây):
$$\text{Throughput yêu cầu} = \frac{1.000 \text{ users}}{12 \text{ giây}} \approx 83 \text{ requests/giây}$$
* Với mỗi lệnh `bwrap` tốn khoảng **50ms – 100ms** CPU time: Một máy chủ tầm trung (8–16 vCPU) có thể đạt thông lượng từ 80 – 120 req/s, hoàn toàn đủ sức phục vụ 1.000 học viên active.

### 4.3. Lộ trình mở rộng hệ thống phân tán (Horizontal Scaling)
Để phục vụ quy mô production hàng chục ngàn sinh viên, hệ thống sẽ mở rộng theo kiến trúc:

```text
       [Clients Web Browser]
                 │
                 ▼
       [Load Balancer (Nginx / Cloudflare)]
                 │
      ┌──────────┴──────────┐
      ▼                     ▼
[API Replica 1]       [API Replica 2]
      │                     │
      └──────────┬──────────┘
                 ▼
    [Distributed Queue (Redis + BullMQ)]
                 │
   ┌─────────────┼─────────────┐
   ▼             ▼             ▼
[Runner 1]   [Runner 2]   [Runner 3]   (Cụm Worker Nodes)
```
* **Session Affinity (Sticky Session):** Điều hướng học viên tới đúng worker node đang chứa thư mục workspace trên SSD cục bộ của họ.

---

## PHẦN 5: KỊCH BẢN THUYẾT TRÌNH 5–7 PHÚT (BẤM GIỜ TỪNG GIÂY)

> **Mục tiêu:** Thể hiện trọn vẹn giá trị cốt lõi, không chạy lòng vòng 17 trang, kết thúc ở 5 phút 45 giây để dành thời gian cho câu hỏi hội đồng.

```text
[0:00 ── Giới thiệu bài toán ── 1:00]
[1:00 ── Live Demo 3 bước (CWD + Check Solution) ── 3:00]
[3:00 ── Điểm sáng Kiến trúc 1 Docker + Bwrap ── 4:30]
[4:30 ── Trình bày Stress Testing & Benchmarking ── 5:45]
[5:45 ── Kết luận & Q&A ── 7:00]
```

### Chi tiết kịch bản:
* **[0:00 – 1:00] Giới thiệu bài toán & Đề tài:**
  *"Kính thưa quý thầy cô, việc học thực hành dòng lệnh Linux thường gặp trở ngại về cài đặt máy ảo nặng nề. Nhóm em phát triển BashLab — nền tảng học Bash tương tác trực tuyến qua web. Thách thức lớn nhất của đề tài này là làm sao cho sinh viên chạy lệnh thật mà không làm nguy hại tới server trường, đồng thời không gây nghẽn RAM khi nhiều người cùng học. Nhóm em đã giải quyết trọn vẹn bài toán này bằng kiến trúc 1 Docker Runner dùng chung kết hợp Bubblewrap."*
* **[1:00 – 3:00] Live Demo Tính năng cốt lõi (Trọng tâm ghi điểm):**
  1. *Demo CWD thật:* Mở Workspace, gõ `mkdir mylab && cd mylab && pwd`. Màn hình hiện `/home/student/mylab`. Giải thích hệ thống duy trì Persistent CWD giữa các request REST.
  2. *Demo Làm bài & Chấm tự động:* Gõ `echo "Hello BashLab" > README.md`, bấm **`Check Solution`** -> 2 tích xanh ✅ hiện lên tức thì (`README.md` tồn tại và đúng nội dung).
* **[3:00 – 4:30] Điểm sáng Kiến trúc (Advanced Tier):**
  Chiếu sơ đồ kiến trúc:
  - Máy host chỉ chạy Node.js; môi trường thực thi được bọc trong **1 container Ubuntu 24.04 duy nhất**.
  - Mỗi lệnh sinh tiến trình `bwrap` siêu nhẹ (< 3ms, 0 MB RAM nền).
  - Thư mục workspace nằm trên **NVMe SSD `/var/tmp/`**, giải phóng hoàn toàn áp lực RAM.
* **[4:30 – 5:45] Báo cáo Stress Testing & Benchmarking:**
  Chiếu slide biểu đồ đo tải:
  - Tải thử nghiệm: 10, 20, 30, 50 concurrent commands.
  - Độ trễ p50 = 120ms, p95 = 260ms; RAM của Runner giữ ổn định ở mức ~50MB – 150MB.
  - Luận điểm cốt lõi: *"Hệ thống chỉ tăng process ngắn hạn qua hàng đợi thay vì tăng container Docker."*
* **[5:45 – 7:00] Kết luận & Bước vào Q&A.**

---

## PHẦN 6: CẨM NANG CÂU HỎI PHẢN BIỆN HỘI ĐỒNG (Q&A CHEAT SHEET)

Bất kỳ thành viên nào trong nhóm bị giáo viên bốc thăm ngẫu nhiên đều có thể trả lời tự tin với 4 câu hỏi mẫu sau:

#### Câu 1: "Tại sao không dùng Docker container riêng cho mỗi học viên?"
* **Trả lời:** *"Dạ thưa thầy/cô, nếu mỗi học viên cấp 1 container, 50 sinh viên cùng học sẽ ngốn từ 2.5GB – 5GB RAM và mất 1–2 giây khởi động mỗi container. Bằng cách dùng 1 Docker Runner nền và bọc từng lệnh bằng Bubblewrap, hệ thống chỉ tốn ~40MB RAM cố định cho toàn trường, mỗi lệnh khởi tạo chỉ mất 2 mili-giây, giúp server cấu hình nhỏ vẫn phục vụ rất mượt mà ạ."*

#### Câu 2: "Học viên có thể đọc trộm file bài tập hoặc can thiệp của nhau không?"
* **Trả lời:** *"Dạ không ạ. Mặc dù dùng chung 1 container runner, nhưng Bubblewrap sử dụng Mount Namespace riêng biệt cho từng lệnh. Thư mục `/tmp` bên trong sandbox là thư mục ảo độc lập, còn `/home/student` được bind riêng vào UUID của học viên đó trên SSD. Học viên gõ `ls /tmp` hay `cd ..` hoàn toàn không nhìn thấy bất kỳ thư mục hay UUID nào của người khác ạ."*

#### Câu 3: "Hệ thống này có chịu được 1.000 người dùng cùng một lúc không?"
* **Trả lời:** *"Dạ thưa thầy/cô, cần phân biệt 2 trạng thái:  
  - Nếu là **1.000 người truy cập web đọc đề bài và gõ lệnh rải rác** (khoảng 80 lệnh/giây): Một server 8–16 core hoàn toàn có thể đáp ứng tốt nhờ cơ chế hàng đợi concurrency và dữ liệu nằm trên SSD.  
  - Nếu là **1.000 người cùng bấm Enter tại đúng 1 giây**: Hệ thống hiện có cơ chế Admission Control tiếp nhận 36 lệnh và từ chối phần còn lại với mã 429 để bảo vệ server không bị crash.  
  - Về mặt mở rộng, nhóm em đã thiết kế sẵn kiến trúc phân tán (Horizontal Scaling): tách API và đẩy lệnh qua hàng đợi Redis/BullMQ tới cụm Worker Nodes để scale không giới hạn ạ."*

#### Câu 4: "Nếu học viên gõ lệnh treo (while true) hoặc tạo file rác 10GB thì sao?"
* **Trả lời:** *"Dạ hệ thống được bảo vệ 3 lớp:  
  1. Mỗi lệnh có `timeout 3s` tự động kill tiến trình.  
  2. Kích thước file bị chặn cứng ở mức 10MB bằng `ulimit -f`.  
  3. Tổng dung lượng thư mục bị giới hạn ở 30MB và tối đa 100 files bằng bộ kiểm tra Application Quota trước khi chạy ạ."*

---

> [!TIP]
> Toàn bộ tài liệu gốc và báo cáo chi tiết từng phần được lưu trữ tại:  
> - Báo cáo bảo vệ đồ án: [`docs/presentation/rubric_and_presentation_plan.md`](presentation/rubric_and_presentation_plan.md)  
> - Thiết kế kỹ thuật chi tiết: [`backend/sandbox_architecture_design.md`](../backend/sandbox_architecture_design.md)  
> - Nghiên cứu sâu Bwrap-in-Docker: [`docs/research/astra_sandbox_hardening.md`](research/astra_sandbox_hardening.md)  
> - Báo cáo mô hình chịu tải 1000 users: [`docs/research/astra_1000_users_stress.md`](research/astra_1000_users_stress.md)
