# TÀI LIỆU THIẾT KẾ KIẾN TRÚC BACKEND & HẠ TẦNG SANDBOX (BASHLAB)
*(Bản Tinh Gọn Phục Vụ Bảo Vệ Đồ Án / Demo Thực Tế)*

> **Dự án:** BashLab — Nền tảng học Bash Shell tương tác trực tuyến  
> **Nhánh thực hiện:** `SuperBQA`  
> **Định hướng:** Tập trung vào logic kiến trúc, chạy ổn định, tiết kiệm tài nguyên và giá trị demo trực quan; tránh over-engineering cấp quân sự.

---

## 1. MỤC TIÊU & PHẠM VI (SCOPE ĐÃ TINH GỌN)

### 1.1. Luận điểm kiến trúc cốt lõi để bảo vệ đồ án:
Thay vì tạo một Docker container cho mỗi học viên (gây nghẽn CPU/RAM server), hệ thống áp dụng kiến trúc:
> **1 Docker Ubuntu Runner dùng chung + Bubblewrap (`bwrap`) cho từng lệnh + Workspace riêng biệt trên SSD theo session.**

Khi tăng số lượng người dùng đồng thời, hệ thống chỉ tăng số process ngắn hạn thay vì tăng số lượng Docker container.

### 1.2. Danh mục chức năng triển khai thực tế (Scope Checklist)

| Chức năng | Trạng thái | Giải pháp kỹ thuật thực hiện |
| :--- | :---: | :--- |
| **1 Docker Runner dùng chung** | ✅ Có | Dùng 1 container `ubuntu:24.04` chạy nền (`bashlab-box`), tài nguyên giới hạn tổng (`512MB RAM`, `2 CPUs`, `pids-limit=128`). |
| **Bubblewrap isolation** | ✅ Có | Mỗi lệnh bọc qua `bwrap` unprivileged, hệ thống `/usr`, `/bin` ở chế độ read-only. |
| **Workspace riêng theo UUID** | ✅ Có | Mỗi session có một thư mục riêng đặt trên SSD (`/var/tmp/bashlab/workspaces/<uuid>/`). |
| **Bảo vệ RAM bằng SSD `/var/tmp`** | ✅ Có | Thư mục của session gồm `home/` và `tmp/` đều mount từ SSD, không dùng `tmpfs` để tránh áp lực RAM. |
| **Lưu CWD giữa các lệnh** | ✅ Có | Lưu `cwd` trong session memory; bọc lệnh lấy `pwd` cuối cùng cập nhật lại session. |
| **Timeout 3s** | ✅ Có | Dùng `timeout 3s` cho từng lệnh bwrap, chống treo vòng lặp vô tận. |
| **Output Cap 64KB** | ✅ Có | Cắt ngắn output ở 64KB, chống spam terminal làm đơ web. |
| **Dọn dẹp tự động (Reaper)** | ✅ Có | Scan mỗi 5 phút; xóa thư mục session nếu không hoạt động quá 30 phút. |
| **Application Quota** | ✅ Có | Kiểm tra `du` (< 30MB) và số file (< 100) ở tầng Node.js trước/sau khi chạy. |
| **Tắt mạng (Network disable)** | ✅ Có | Cờ `--unshare-all` trong `bwrap`, không cho ra Internet. |
| **Task Verifier (`Check Solution`)** | ✅ Có | Engine kiểm tra trạng thái file (`test -f`, `grep`) để chấm xanh/đỏ bài tập trên Web. |
| **Rate Limit** | ✅ Có | Giới hạn số request/phút theo IP ở tầng Express. |
| *cgroups riêng cho từng session* | ❌ Bỏ | Không cần thiết cho đồ án (đã có giới hạn tổng ở Docker + timeout). |
| *Kernel-enforced hard quota (ext4)* | ❌ Bỏ | Thay bằng Application-level guard ở Node.js. |
| *UID riêng biệt từng học viên* | ❌ Bỏ | Không cần thiết khi đã có bwrap mount namespace riêng. |
| *Seccomp custom / Rootless Docker* | ❌ Bỏ | Đưa vào mục "Hướng phát triển tương lai trong môi trường Production". |

---

## 2. KIẾN TRÚC HỆ THỐNG (SYSTEM ARCHITECTURE)

```text
┌────────────────────────────────────────┐
│            Frontend Web                │
│    Terminal Demo / Check Solution      │
└───────────────────┬────────────────────┘
                    │ HTTP REST (JSON)
                    ▼
┌────────────────────────────────────────┐
│          Node.js Backend API           │
│                                        │
│  • Session Manager (Map in-memory)     │
│    - sessionId, cwd, lastActiveAt      │
│  • Application Quota Guard (30MB/100f) │
│  • Reaper Worker (Scan 5m, TTL 30m)    │
│  • Task Verifier Engine (Assert bài)   │
└───────────────────┬────────────────────┘
                    │ docker exec
                    ▼
┌────────────────────────────────────────┐
│     1 Docker Ubuntu Runner Duy Nhất    │
│  (--memory=512m --cpus=2 --pids=128)   │
│                                        │
│   ┌────────────────────────────────┐   │
│   │ Bubblewrap Process (Mỗi lệnh)  │   │
│   │ • Read-only system (/bin,/usr) │   │
│   │ • Network disabled             │   │
│   │ • Execution timeout: 3s        │   │
│   └────────────────────────────────┘   │
└───────────────────┬────────────────────┘
                    │ Mount thư mục
                    ▼
     /var/tmp/bashlab/workspaces/<uuid>/
          ├── home/  --> mount vào /home/student
          └── tmp/   --> mount vào /tmp
```

---

## 3. CHI TIẾT CÁC THÀNH PHẦN KỸ THUẬT

### 3.1. Cấu trúc thư mục Workspace & Giải pháp `/tmp` trên SSD
* Thư mục trên Host:
  ```text
  /var/tmp/bashlab/workspaces/<session-uuid>/
  ├── home/
  └── tmp/
  ```
* Lệnh mount qua `bwrap`:
  ```bash
  bwrap \
    --ro-bind /usr /usr \
    --ro-bind /bin /bin \
    --ro-bind /lib /lib \
    --ro-bind /lib64 /lib64 \
    --proc /proc \
    --dev /dev \
    --bind /var/tmp/bashlab/workspaces/<uuid>/tmp /tmp \
    --bind /var/tmp/bashlab/workspaces/<uuid>/home /home/student \
    --chdir <current_cwd> \
    --unshare-all \
    bash -c "<command>; __ret=$?; pwd > /tmp/__new_cwd; exit $__ret"
  ```
* **Giải thích báo cáo:** Cả `/home/student` và `/tmp` của phiên học đều được đặt trên phân vùng NVMe SSD `/var/tmp/`, giúp triệt tiêu hoàn toàn áp lực RAM khi có nhiều phiên mở đồng thời.

---

### 3.2. CWD Tracker (Stateless Execution with Persistent CWD)
* Backend Node.js lưu giữ trạng thái nhẹ trong `Map`:
  ```javascript
  const sessions = new Map();
  // Key: sessionId (UUID)
  // Value: { cwd: '/home/student', lastActiveAt: Date.now(), commandCount: 0 }
  ```
* Sau khi lệnh thực thi xong, đọc `/tmp/__new_cwd` để cập nhật `cwd` cho session tiếp theo.

---

### 3.3. Application-Level Quota Guard
Trước và sau khi chạy lệnh, Node.js kiểm tra dung lượng thư mục:
```javascript
async function checkWorkspaceQuota(workspacePath) {
  // 1. Kiểm tra dung lượng
  const sizeBytes = await getFolderSize(workspacePath);
  if (sizeBytes > 30 * 1024 * 1024) {
    throw new Error('Workspace quota exceeded. Maximum storage: 30 MB');
  }
  // 2. Kiểm tra số lượng file
  const fileCount = await countFiles(workspacePath);
  if (fileCount > 100) {
    throw new Error('Workspace quota exceeded. Maximum files: 100');
  }
}
```

---

### 3.4. Reaper Service (Quét mỗi 5 phút, TTL 30 phút)
```javascript
// Chạy mỗi 5 phút
setInterval(async () => {
  const now = Date.now();
  const TTL = 30 * 60 * 1000; // 30 phút
  for (const [sessionId, session] of sessions.entries()) {
    if (now - session.lastActiveAt > TTL) {
      await fs.promises.rm(session.workspacePath, { recursive: true, force: true });
      sessions.delete(sessionId);
      console.log(`[Reaper] Cleaned inactive session: ${sessionId}`);
    }
  }
}, 5 * 60 * 1000);
```

---

### 3.5. Task Verifier Engine (Chấm điểm bài tập `Check Solution`)
Khi học viên bấm **Check Solution** ở Screen 10:
* Backend nhận `lessonId` và `sessionId`.
* Chạy kịch bản kiểm tra an toàn từ bên ngoài:
  ```bash
  docker exec bashlab-box bash -c "test -d /var/tmp/bashlab/workspaces/<uuid>/home/demo && test -f /var/tmp/bashlab/workspaces/<uuid>/home/demo/README.md"
  ```
* Trả kết quả JSON trực quan cho Web:
  ```json
  {
    "passed": true,
    "checks": [
      { "name": "Thư mục demo/ đã được tạo", "passed": true },
      { "name": "File README.md tồn tại trong demo/", "passed": true }
    ]
  }
  ```

---

## 4. BẢNG THUẬT NGỮ CHUẨN HÓA DÙNG CHO BÁO CÁO & BẢO VỆ

| Tránh dùng (Dễ bị bắt bẻ) | Dùng cụm từ này (Kỹ thuật & Chính xác) |
| :--- | :--- |
| *"Hệ thống an toàn tuyệt đối / Sandbox cấp quân sự"* | **"Cách ly môi trường thực thi qua Docker kết hợp Bubblewrap"** |
| *"Hạ tầng siêu tối ưu tài nguyên"* | **"Tối ưu tài nguyên: 1 Docker Runner dùng chung, mỗi lệnh chỉ tạo process ngắn hạn"** |
| *"Khóa dung lượng bằng Hard Quota"* | **"Kiểm soát dung lượng tầng ứng dụng (Application-level workspace quota)"** |
| *"Học viên tuyệt đối không thể đọc file nhau"* | **"Cô lập workspace theo từng phiên làm việc (Session-bound workspace)"** |
| *"Hệ thống Shell đầy đủ state"* | **"Thực thi lệnh stateless với cơ chế duy trì trạng thái thư mục làm việc (Persistent CWD)"** |

---

## 5. KẾ HOẠCH TRIỂN KHAI THEO THỨ TỰ ƯU TIÊN

1. **Giai đoạn 1:** Dựng Dockerfile cho Ubuntu Runner + Viết module thực thi lệnh cơ bản (`bwrap + timeout 3s + output cap 64KB`).
2. **Giai đoạn 2:** Thêm CWD Tracker + Tạo thư mục workspace riêng `/var/tmp/bashlab/workspaces/<uuid>`.
3. **Giai đoạn 3:** Đấu nối API vào Terminal Demo trên Landing Page (`Lookbook.jsx`).
4. **Giai đoạn 4:** Viết Reaper dọn dẹp (5 phút quét / 30 phút TTL) + Application Quota (30MB/100 files).
5. **Giai đoạn 5:** Xây dựng `TaskVerifier` cho tính năng `Check Solution`.
6. **Giai đoạn 6:** Chạy benchmark đo concurrency (10, 20, 30 users) để lấy số liệu thực tế đưa vào slide/báo cáo.
