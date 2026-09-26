# CHIẾN LƯỢC TRIỂN KHAI & KẾ HOẠCH THUYẾT TRÌNH ĐỒ ÁN BASHLAB
*(Bám sát Rubric Đánh Giá & Giới Hạn Thuyết Trình 5–7 Phút)*

> **Đồ án:** BashLab — Nền tảng học Bash Shell tương tác trực tuyến  
> **Phân loại đề tài:** "Others" (Đề tài tự chọn có khả năng nâng cấp thành Đồ án nhóm lớn / Đồ án thực tập)  
> **Quy mô nhóm:** Tối đa 7 thành viên  
> **Thời lượng thuyết trình:** **5–7 phút** (Hội đồng chỉ định ngẫu nhiên 1–2 thành viên trình bày và Q&A)  
> **Mục tiêu:** Đạt điểm tối đa ở nhóm **Advanced Requirements (4–5 tính năng chính + Chức năng nâng cao)**.

---

## 1. MAPPING TÍNH NĂNG VÀO TIÊU CHÍ ĐÁNH GIÁ (RUBRIC)

Hội đồng chia tiêu chí thành 2 cấp độ:
1. **Standard Requirements (Chuẩn):** Giao diện hoàn chỉnh + 2–3 tính năng cốt lõi.
2. **Advanced Requirements (Nâng cao - Điểm 9–10):** 4–5 tính năng chính + Chức năng nâng cao (*Performance Optimization, Benchmarking, Stress Testing...*).

### 1.1. Danh mục 5 Tính năng chính (Main Features)
Để hội đồng nhìn thấy ngay hệ thống hoàn chỉnh:

| STT | Tính năng | Màn hình đối chiếu | Mô tả chi tiết khi demo |
| :---: | :--- | :---: | :--- |
| **1** | **Interactive Shell Workspace** | [Screen 10](file:///home/light/Documents/B3/web_app/Bashlab/bashlab-pages.md#L170) | Terminal web thực thi lệnh Linux thật trong Sandbox cách ly (Bubblewrap). Có **CWD Tracker** giữ nguyên trạng thái thư mục giữa các lệnh (`mkdir demo && cd demo -> pwd`). |
| **2** | **Automated Task Verifier** | [Screen 10](file:///home/light/Documents/B3/web_app/Bashlab/bashlab-pages.md#L170) | Nút **`Check Solution`** (hoặc `Ctrl+Enter`) tự động chấm bài tập qua kiểm tra file/nội dung/quyền thực tế ngoài sandbox. Hiện tích xanh ✅ trực quan cho từng tiêu chí. |
| **3** | **Curriculum & Lesson Workflow** | [Screen 07, 08](file:///home/light/Documents/B3/web_app/Bashlab/bashlab-pages.md#L124) | Danh mục khóa học, mục lục các chương/bài (Shell 101), xem trước nội dung và lưu tiến độ hoàn thành bài học. |
| **4** | **Session & Storage Lifecycle** | [Screen 02, 10](file:///home/light/Documents/B3/web_app/Bashlab/bashlab-pages.md#L64) | Khởi tạo workspace riêng biệt theo UUID trên SSD (`/var/tmp`), cơ chế **Reaper Daemon** tự động quét mỗi 5 phút và xóa workspace bỏ rơi sau 30 phút không hoạt động. |
| **5** | **Operations Activity Monitor** | [Screen 15](file:///home/light/Documents/B3/web_app/Bashlab/bashlab-pages.md#L242) | Dashboard quản trị viên hiển thị danh sách phiên đang hoạt động (Active Sessions), thời gian chạy, và nút dừng phiên khẩn cấp (**Emergency Kill/Reset**). |

---

### 1.2. Các Chức năng nâng cao (Advanced Functionalities - "Ăn trọn điểm giỏi")
Đây là phần quyết định đồ án được xếp loại xuất sắc hoặc đề xuất nâng cấp thành Đồ án thực tập:

* 🚀 **Performance Optimization (Tối ưu hóa hiệu năng & Tài nguyên):**
  - Áp dụng kiến trúc **"1 Docker Ubuntu Runner + Bubblewrap per-command"**: Toàn bộ server chỉ duy trì **1 container chạy nền (~40MB RAM)**, mỗi lệnh chỉ fork tiến trình ngắn hạn (< 3ms) thay vì spawn hàng chục container nặng nề.
  - Phân vùng lưu trữ workspace đặt trên **NVMe SSD `/var/tmp/`** (tiêu tốn **0% RAM**), giải quyết dứt điểm rủi ro tràn RAM của `tmpfs`.
* 📊 **Benchmarking & Stress Testing (Đo tải & Kiểm thử chịu tải):**
  - Xây dựng kịch bản đo tải tự động (Script benchmark) giả lập **10, 20, 30, 50 requests đồng thời**.
  - Báo cáo số liệu thực tế đo trên máy: Latency trung bình (p50, p95), biểu đồ RAM/CPU ổn định, tỷ lệ thành công 100%. Chứng minh luận điểm: *"Tải tăng chỉ làm tăng process ngắn hạn qua hàng đợi, không làm tăng container"*.
* 🛡️ **Application Quota & Circuit Breaker (Kiểm soát an toàn):**
  - Giới hạn file tối đa 10MB bằng `ulimit -f`, quota workspace tối đa 30MB / 100 files bằng Node.js guard.
  - Giới hạn thời gian chạy mỗi lệnh (Hard Timeout 3s) và giới hạn output 64KB chống treo web.

---

## 2. KỊCH BẢN THUYẾT TRÌNH 5–7 PHÚT (BẤM GIỜ CHI TIẾT)

> [!IMPORTANT]
> **Quy tắc vàng:** Giáo viên chọn ngẫu nhiên 1–2 người và chỉ cho 5–7 phút.  
> Tuyệt đối không bấm dạo quanh 17 trang. Đi thẳng vào một "Happy Path" duy nhất: **Vấn đề → Live Demo tính năng → Điểm sáng kiến trúc → Số liệu Benchmark.**

```
[0:00] ── Giới thiệu bài toán ── [1:00]
[1:00] ── Live Demo 3 bước (CWD + Check Solution) ── [3:00]
[3:00] ── Điểm sáng Kiến trúc 1 Docker + Bwrap ── [4:30]
[4:30] ── Trình bày Stress Testing & Benchmarking ── [5:45]
[5:45] ── Kết luận & Q&A ── [7:00]
```

### Phút 0:00 – 1:00: Mở đầu & Nêu bài toán thực tế
* **Người nói:** *"Kính thưa thầy cô, các website học lập trình Shell hiện nay gặp 2 vấn đề lớn: Một là chạy trực tiếp trên host thì cực kỳ nguy hiểm, hai là mỗi user cấp 1 container Docker thì server rất nhanh hết RAM. Nhóm em xây dựng **BashLab** — nền tảng học Bash tương tác với kiến trúc 1 Docker Runner dùng chung kết hợp Bubblewrap để vừa an toàn, vừa siêu tiết kiệm tài nguyên."*
* **Màn hình:** Slide tiêu đề & Trang chủ BashLab.

### Phút 1:00 – 3:00: Live Demo Tính năng cốt lõi (Trọng tâm)
* **Thao tác 1 (Chứng minh CWD thật):**
  Vào Workspace (Screen 10), gõ lệnh:
  ```bash
  mkdir myproject && cd myproject
  pwd
  # Output hiện rõ: /home/student/myproject
  ```
  *Nói:* *"Hệ thống không chỉ in text giả lập, mà thực sự giữ trạng thái thư mục làm việc (Persistent CWD) giữa các lần gọi API."*
* **Thao tác 2 (Làm bài tập & Chấm điểm tự động):**
  Gõ lệnh tạo file theo yêu cầu đề bài:
  ```bash
  echo "Hello BashLab" > README.md
  ```
  Bấm nút **`Check Solution`** (hoặc `Ctrl+Enter`).
  *Màn hình:* Hệ thống hiển thị 2 tích xanh ✅:
  - `[PASS]` Thư mục `myproject` tồn tại.
  - `[PASS]` File `README.md` chứa nội dung "Hello BashLab".

### Phút 3:00 – 4:30: Trình bày Điểm sáng Kiến trúc (Advanced Tier)
* **Chiếu sơ đồ kiến trúc:**
  - Giải thích mô hình 2 lớp: Máy host chỉ chạy Node.js; bên trong là **1 container Ubuntu Runner duy nhất**; mỗi lệnh sinh 1 sandbox `bwrap` siêu nhẹ (< 3ms).
  - Giải thích điểm thông minh: Thư mục `/home` và `/tmp` của phiên được mount từ **NVMe SSD `/var/tmp/`**, giúp giải phóng 100% RAM vật lý của server.

### Phút 4:30 – 5:45: Show kết quả Stress Testing & Benchmarking (Ghi điểm tuyệt đối)
* **Chiếu slide biểu đồ đo tải thực tế (Vector SVG & HTML Dashboard):**
  - File đồ họa sắc nét: [`docs/presentation/benchmark_charts.svg`](benchmark_charts.svg) (dán thẳng vào slide PowerPoint/Canva).
  - Báo cáo tương tác: [`docs/presentation/benchmark_report.html`](benchmark_report.html).
  - *"Để chứng minh tính ổn định, nhóm em đã thực hiện đo tải thực tế trên máy host Intel Core i5-12450HX với các mức 10, 20, 30, 50 requests đồng thời."*
  - **Show 3 điểm đắt giá trên biểu đồ:**
    1. **RAM Flatline bất chấp tải:** Runner RAM chỉ tốn **10.2 MiB – 15.7 MiB** (so với 500MB – 2,500MB nếu dùng 1 Docker container cho mỗi user).
    2. **Độ trễ p50/p95:** Tải 10–20 requests đồng thời đạt tỷ lệ thành công **100%**, p50 từ 1.0s – 1.9s.
    3. **Cơ chế Circuit Breaker tự vệ:** Khi tải tăng vọt lên 50 requests đồng thời, hàng đợi kích hoạt bảo vệ máy chủ (Queue 32 slots, 5s timeout) từ chối an toàn bằng HTTP 429, CPU và RAM máy chủ **không bao giờ bị sập hay tràn bộ nhớ**.

### Phút 5:45 – 7:00: Kết luận & Sẵn sàng Q&A
* Dừng thuyết trình ở mốc **5 phút 45 giây** (đúng chuẩn thời gian, không bị ngắt lời).

---

## 3. CẨM NANG TRẢ LỜI CÂU HỎI PHẢN BIỆN (Q&A CHEAT SHEET)

Bất kỳ thành viên nào trong nhóm bị bốc thăm cũng có thể trả lời trôi chảy các câu hỏi kinh điển của giáo viên nhờ cẩm nang này:

#### Câu 1: "Tại sao không dùng Docker cho từng học viên mà phải dùng Bubblewrap?"
* **Trả lời:** *"Dạ thưa thầy/cô, Docker tạo ra một container hoàn chỉnh với namespace, cgroups, network veth và process daemon. Nếu có 50 sinh viên cùng học, server phải duy trì 50 container ngốn từ 2.5GB – 5GB RAM. Bằng cách dùng 1 Docker Runner nền và bọc từng lệnh bằng Bubblewrap, hệ thống chỉ tốn ~40MB RAM cố định và mỗi lệnh khởi tạo chỉ mất 2 mili-giây, giúp server trường học hoặc VPS nhỏ vẫn chạy rất mượt mà ạ."*

#### Câu 2: "Học viên có thể đọc trộm bài hoặc phá hoại file của nhau không?"
* **Trả lời:** *"Dạ không ạ. Mặc dù dùng chung 1 container runner, nhưng Bubblewrap sử dụng Mount Namespace riêng biệt cho từng lệnh. Thư mục `/tmp` bên trong sandbox là thư mục ảo độc lập, còn `/home/student` được bind riêng vào UUID của học viên đó trên SSD. Học viên gõ `ls /tmp` hay `cd ..` hoàn toàn không thể nhìn thấy bất kỳ thư mục hay UUID nào của người khác."*

#### Câu 3: "Hệ thống này có chịu được 1.000 người dùng cùng một lúc không?"
* **Trả lời:** *"Dạ thưa thầy/cô, cần phân biệt 2 trạng thái tải:
  - Nếu là **1.000 người truy cập web, đọc đề bài và gõ lệnh rải rác** (khoảng 30–50 lệnh/giây): Hệ thống hoàn toàn đáp ứng tốt nhờ cơ chế hàng đợi concurrency và tài nguyên workspace nằm trên SSD.
  - Nếu là **1.000 người cùng bấm Enter chạy lệnh tại cùng 1 giây**: Trên một máy chủ đơn lẻ, kernel process table và Docker socket sẽ bị quá tải. Trong tài liệu đồ án, nhóm em đã thiết kế sẵn lộ trình mở rộng ngang (Horizontal Scaling) bằng cách tách Node.js API và đẩy lệnh qua hàng đợi phân tán (Redis/BullMQ) tới một cụm Runner Nodes để scale không giới hạn ạ."*

#### Câu 4: "Nếu học viên gõ lệnh chạy vô tận (while true) hoặc tạo file 10GB làm đầy ổ đĩa thì sao?"
* **Trả lời:** *"Dạ hệ thống được bảo vệ 3 lớp:
  1. Mỗi lệnh có `timeout 3s` tự động kill tiến trình.
  2. Kích thước file bị chặn cứng ở mức 10MB bằng `ulimit -f`.
  3. Tổng dung lượng thư mục bị giới hạn ở 30MB và tối đa 100 files bằng bộ kiểm tra Application Quota trước khi chạy ạ."*

---

## 4. TỔNG KẾT
Kế hoạch này đảm bảo:
1. Nhóm đạt trọn vẹn điểm chuẩn lẫn điểm nâng cao (Advanced).
2. Thời lượng bài nói gọn gàng trong 5–7 phút, tạo ấn tượng mạnh về tư duy tối ưu và số liệu benchmark thực tế.
3. Mọi thành viên đều nắm vững luận điểm để tự tin trả lời bất kỳ câu hỏi phản biện nào từ hội đồng.
