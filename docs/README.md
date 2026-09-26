# TRUNG TÂM TÀI LIỆU DỰ ÁN BASHLAB (DOCUMENTATION HUB)

> Hệ thống tài liệu kỹ thuật, kiến trúc phân hệ, chiến lược bảo vệ đồ án và báo cáo nghiên cứu chuyên sâu cho dự án **BashLab**.

---

## 🗂️ CẤU TRÚC PHÂN LOẠI TÀI LIỆU

```text
docs/
├── 🌟 master_project_handbook.md           # [BẢN TOÀN DIỆN] Tích hợp toàn bộ kiến trúc, rubric, stress test & kịch bản 5-7m
├── 📄 README.md                            # Trang chủ điều hướng tài liệu (file này)
│
├── 📁 presentation/                         # Kế hoạch bảo vệ đồ án & Chiến lược điểm số
│   └── 📄 rubric_and_presentation_plan.md  # Khóa điểm Advanced (9-10), Kịch bản 5-7 phút, Q&A Cheat Sheet
│
├── 📁 architecture/                         # Thiết kế Kiến trúc Kỹ thuật & Hạ tầng Sandbox
│   ├── 📄 sandbox_design.md                # Thiết kế lõi: 1 Docker Runner + Bwrap + SSD /var/tmp + CWD Tracker
│   ├── 📄 backend_layers_full.md           # Đặc tả phân lớp 10 layers bản đầy đủ (REST + WebSocket Gateway)
│   └── 📄 backend_layers_mvp.md            # Đặc tả phân lớp 10 layers bản MVP
│
├── 📁 specifications/                       # Đặc tả Sản phẩm & Yêu cầu Giao diện
│   └── 📄 pages_catalog_17_screens.md      # Đặc tả chi tiết 17 màn hình theo thiết kế Stitch UI
│
└── 📁 research/                             # Báo cáo Nghiên cứu Kỹ thuật Chuyên sâu (Astra High)
    ├── 📄 astra_sandbox_hardening.md       # Nghiên cứu Bwrap-in-Docker, CWD trap EXIT, Triệt tiêu Zombie Process
    └── 📄 astra_1000_users_stress.md       # Đánh giá khả thi & Điểm gãy khi 1.000 users đồng thời truy cập
```

---

## 📌 HƯỚNG DẪN TRA CỨU THEO NHU CẦU

### 1. Chuẩn bị Thuyết trình & Bảo vệ trước Hội đồng
👉 Mở: **[`docs/presentation/rubric_and_presentation_plan.md`](presentation/rubric_and_presentation_plan.md)**
* **Mục tiêu:** Nắm chắc kịch bản 5–7 phút (bấm giờ từng giây), cách live demo 3 bước (CWD + Check Solution), và 4 câu trả lời phản biện kinh điển khi được bốc thăm ngẫu nhiên.

### 2. Triển khai Code Backend & Cấu hình Sandbox
👉 Mở: **[`docs/architecture/sandbox_design.md`](architecture/sandbox_design.md)**
* **Mục tiêu:** Hướng dẫn chi tiết cách dựng 1 Docker Runner dùng chung, cấu hình Bubblewrap (`bwrap`), cơ chế CWD Tracker, giới hạn file 10MB (`ulimit -f`), quota 30MB và Reaper dọn dẹp mỗi 30 phút.

### 3. Nghiên cứu Kỹ thuật Sâu & Đối phó Câu hỏi Hóc búa
👉 Mở: **[`docs/research/`](research/)**
* **[`astra_sandbox_hardening.md`](research/astra_sandbox_hardening.md):** 8 ca test thực nghiệm với script bọc lệnh `wrap.sh`, cấu hình seccomp/apparmor cho Bwrap-in-Docker.
* **[`astra_1000_users_stress.md`](research/astra_1000_users_stress.md):** Phân tích mô hình toán học, Little's Law, nút thắt cổ chai phần cứng và lộ trình nâng cấp phân tán (Redis/BullMQ + Worker Pool) khi scale 1.000 users.

### 4. Đối chiếu Giao diện & Luồng màn hình
👉 Mở: **[`docs/specifications/pages_catalog_17_screens.md`](specifications/pages_catalog_17_screens.md)**
* **Mục tiêu:** Rà soát danh mục 17 màn hình (từ Screen 01 Landing đến Screen 10 Workspace và Screen 15 Activity) để đấu nối API chính xác.
