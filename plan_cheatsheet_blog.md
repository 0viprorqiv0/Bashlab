# Kế hoạch Linux Cheatsheet và Blog cho BashLab

Ngày lập: 2026-09-30.

Trạng thái: đề xuất triển khai; chưa viết chức năng. Tài liệu được lập từ mã nguồn hiện tại và nguồn tham khảo trực tuyến. Các mục checklist chưa đánh dấu là công việc tương lai.

## 1. Mục tiêu và hướng triển khai

Làm Linux Cheatsheet trước, bổ sung Blog sau khi có nội dung đủ tốt để xuất bản.

- Cheatsheet giúp người học tìm lệnh, hiểu ví dụ, copy và mở bài thực hành liên quan.
- Blog giải thích chủ đề sâu hơn, hướng dẫn theo tình huống và dẫn người đọc tới khóa học.
- Hai phần dùng chung nhận diện BashLab và liên kết qua lại theo nội dung.

| Tiêu chí | Linux Cheatsheet | Blog |
| --- | --- | --- |
| Nhu cầu chính | Tra cứu nhanh khi làm việc hoặc học | Hiểu khái niệm và quy trình |
| Nội dung | Mục ngắn, cú pháp và ví dụ | Bài viết có trình tự |
| Hành động chính | Tìm → đọc → copy → thực hành | Đọc → thử ví dụ → học tiếp |
| Công việc duy trì | Kiểm chứng lệnh, cập nhật tùy chọn | Viết, biên tập và cập nhật bài |
| Thứ tự | Giai đoạn 1 | Giai đoạn 2 |

### Giả định cần xác nhận trước khi triển khai

- Người dùng chính là người mới học Linux/Bash và học viên đang làm lab.
- Nội dung công khai, đọc và copy không cần đăng nhập.
- Giao diện và nội dung xuất bản dùng tiếng Anh để đồng bộ website hiện tại; tài liệu kế hoạch dùng tiếng Việt. Nếu chọn tiếng Việt, cần điều chỉnh ngôn ngữ trang tương ứng.
- Nội dung được quản lý trong repository ở bản đầu; chưa cần CMS hoặc màn hình quản trị mới.
- Môi trường kiểm chứng sẽ được chốt theo image Linux của sandbox thực tế. Chưa mặc định mọi ví dụ Ubuntu đều chạy trong sandbox BashLab.

## 2. Hiện trạng dự án

| Thành phần | Hiện trạng đã kiểm tra | Hướng sử dụng |
| --- | --- | --- |
| [Navbar](frontend/components/layout/Navbar.jsx) | `navLinks` hiện có Courses; desktop/mobile dùng cùng danh sách | Thêm mục mới và trạng thái đang chọn |
| [Footer](frontend/components/layout/Footer.jsx) | Có nhóm Resources | Bổ sung liên kết khi trang sẵn sàng |
| [SiteChrome](frontend/components/layout/SiteChrome.jsx) | Khung trang chung, navbar cố định và footer | Kiểm tra phân loại route và khoảng cách nội dung |
| [Site layout](frontend/app/(site)/layout.js) | Bọc các trang bằng SiteChrome | Đặt route mới trong nhóm `(site)` |
| [Markdown](frontend/components/shared/Markdown.jsx) | Dùng react-markdown, có nút Copy | Tái sử dụng khi phù hợp; bổ sung phản hồi lỗi clipboard |
| [Package](frontend/package.json) | Next.js 14.2.5, React 18.3.1, react-markdown đã có | Dùng stack hiện tại, chưa cần thêm dependency |

Đây là mở rộng phạm vi trang theo yêu cầu mới. Khi triển khai, cập nhật README và đặc tả trang tương ứng; giữ nguyên số thứ tự và mã tham chiếu của 17 trang hiện có.

## 3. Điều hướng và route

### Navbar

Giai đoạn 1:

```text
BashLab     Courses     Linux Cheatsheet         [Tài khoản]
```

Giai đoạn 2:

```text
BashLab     Courses     Linux Cheatsheet     Blog     [Tài khoản]
```

- Hiển thị trực tiếp các mục; số lượng hiện tại chưa cần dropdown Resources.
- Trạng thái active áp dụng cả trang chính và trang con, có `aria-current` phù hợp.
- Menu mobile đóng khi chọn liên kết, dùng được bằng bàn phím và không làm lệch navbar.
- Chỉ hiển thị Blog trên navbar khi có tối thiểu 3 bài hoàn chỉnh.
- Bổ sung mục tương ứng trong Resources ở footer.

| Route | Nội dung | Giai đoạn |
| --- | --- | --- |
| `/cheatsheet` | Toàn bộ mục tra cứu, tìm kiếm và bộ lọc | 1 |
| `/cheatsheet#grep` | Liên kết tới mục có ID ổn định | 1 |
| `/cheatsheet?q=grep&category=search-text` | Trạng thái tra cứu có thể chia sẻ | 1 |
| `/blog` | Danh sách bài viết | 2 |
| `/blog/[slug]` | Bài viết chi tiết | 2 |

## 4. Giao diện Cheatsheet

### Desktop

- Bố cục hai cột: danh mục khoảng 220–240px bên trái, nội dung bên phải.
- Danh mục giữ trong tầm nhìn khi cuộn, nằm dưới navbar cao 64px.
- Phần đầu có tiêu đề, mô tả một câu và ô tìm kiếm; đưa khả năng tra cứu lên màn hình đầu tiên.
- Danh sách lệnh chia theo nhóm, phân cách bằng khoảng trống và đường kẻ mảnh.
- Giữ nền tối và hệ chữ hiện có; monospace cho lệnh, cú pháp và kết quả.
- Các mục có anchor dùng khoảng bù khi cuộn để tiêu đề không bị navbar che.

```text
Linux Cheatsheet
Quick commands for everyday Linux tasks.
[ Search commands, descriptions, examples… ]

Categories             Files & directories
All commands           ─────────────────────────────────────
Files & directories    ls — List directory contents
Search & text          [Ví dụ lệnh]                  [Copy]
Permissions            Giải thích tùy chọn
Processes & system     [Related lesson] [Reference]
Networking
Archives               cd — Change directory
Shell basics           …
```

### Mobile

- Chuyển sang một cột; danh mục dùng bộ chọn có nhãn ở phía trên kết quả.
- Code dài cuộn ngang trong khối riêng, không làm tràn toàn trang.
- Nút Copy đủ diện tích chạm, không chồng lên câu lệnh.
- Tiêu đề dài được xuống dòng; không dùng chiều cao cố định cho mục nội dung.
- Trở về từ bài học giữ lại từ khóa và bộ lọc qua URL.

## 5. Phạm vi nội dung Cheatsheet

Mục tiêu bản đầu: khoảng 40–50 mục, tính cả lệnh và khái niệm shell. Danh sách dưới là nhóm biên tập dự kiến, chưa phải nội dung đã được kiểm chứng.

| Nhóm | Các mục ưu tiên |
| --- | --- |
| Files & directories | pwd, ls, cd, mkdir, touch, cp, mv, rm, ln |
| Search & text | cat, less, head, tail, grep, find, sort, uniq, wc, cut |
| Permissions | chmod, chown, id, whoami |
| Processes & system | ps, top, kill, df, du, free, uname |
| Networking | ip, ping, curl, ss, ssh, scp |
| Archives | tar, gzip, gunzip, zip, unzip |
| Shell basics | pipe, redirect, quoting, variables, export, history, man |

### Cấu trúc mỗi mục

1. Tên, ID ổn định, nhóm và mô tả một câu.
2. Cú pháp cơ bản.
3. Một đến ba ví dụ thực tế, mỗi ví dụ có nút Copy riêng.
4. Giải thích các tùy chọn xuất hiện trong ví dụ.
5. Kết quả mong đợi khi cần để người mới hiểu tác dụng.
6. Ghi chú quyền, tác động lên dữ liệu, package cần có hoặc khác biệt môi trường.
7. Bài học liên quan nếu có route thực tế phù hợp.
8. Nguồn tham khảo, môi trường thử nghiệm và ngày kiểm chứng.

Phân biệt builtins của Bash, chương trình độc lập và cú pháp shell. Không coi alias do người dùng cấu hình là lệnh có sẵn trên mọi máy. Các mục xóa, ghi đè hoặc đổi quyền phải giải thích tác động ngay cạnh ví dụ.

## 6. Chức năng Cheatsheet

### Bắt buộc ở bản đầu

- Tìm theo tên, mô tả, từ khóa và ví dụ; không phân biệt hoa thường, bỏ khoảng trắng thừa đầu/cuối.
- Lọc một nhóm hoặc All commands; bộ lọc kết hợp được với từ khóa.
- Hiển thị số kết quả và trạng thái không tìm thấy cùng nút xóa bộ lọc.
- Copy chỉ lấy câu lệnh, không lấy prompt hoặc output; báo thành công sau khi clipboard ghi thành công.
- Nếu copy bị chặn, báo lỗi ngắn và cho phép chọn nội dung thủ công.
- Mỗi mục có anchor và liên kết trực tiếp ổn định.
- Đồng bộ `q` và `category` với URL; refresh và Back/Forward phục hồi đúng trạng thái.
- Khi gõ tìm kiếm, cập nhật URL bằng replace để tránh tạo một lịch sử cho mỗi ký tự.
- Category không hợp lệ quay về All commands; không làm trang lỗi.
- Khi mở anchor trỏ tới mục bị bộ lọc ẩn, ưu tiên hiển thị mục đó và đồng bộ lại bộ lọc/URL.
- Anchor không tồn tại giữ trang tra cứu hoạt động, không gây lỗi toàn trang.
- Liên kết Related lesson chỉ xuất hiện khi có nội dung đã xuất bản phù hợp.

### Để sau

Yêu thích, lịch sử tra cứu, tải PDF, chế độ in chuyên biệt, CMS và terminal nhúng. Chạy lệnh trực tiếp cần kế hoạch riêng cho sandbox và phiên làm việc.

## 7. Kiến trúc và dữ liệu

### Cheatsheet

Lưu dữ liệu có cấu trúc trong repository. Với quy mô khoảng 50 mục, tìm kiếm phía client đủ cho bản đầu; chưa cần dịch vụ tìm kiếm hoặc API riêng.

```text
frontend/
├── app/(site)/cheatsheet/page.js
├── components/cheatsheet/
│   ├── CheatsheetExplorer.jsx
│   └── Cheatsheet.module.css
└── data/cheatsheet.js
```

Các trường dự kiến:

| Trường | Ý nghĩa |
| --- | --- |
| id, command, category | Định danh, tên hiển thị và phân nhóm |
| description, keywords, syntax | Mô tả, từ khóa tìm kiếm và cú pháp |
| examples | Danh sách command, explanation và expectedOutput tùy chọn |
| notes | Quyền, tác động, điều kiện hoặc khác biệt môi trường |
| relatedLesson | Route bài học tùy chọn |
| sources | Danh sách title và URL nguồn gốc |
| testedOn, verifiedAt | Môi trường đã thử và ngày kiểm chứng thực tế |

- Page cung cấp metadata và nội dung render từ server; phần tương tác đặt ở component client.
- Nội dung chính phải có trong HTML ban đầu, không phụ thuộc thao tác tìm kiếm mới xuất hiện.
- Khi dùng hook đọc query của App Router, xử lý ranh giới Suspense/render phù hợp và xác nhận bằng production build.
- Không thay đổi luồng Auth, tiến độ học hoặc backend sandbox cho giai đoạn này.
- Nếu dùng lại Markdown chung, kiểm tra tác động tới màn hình bài học sau khi sửa copy.

### Blog

Tận dụng react-markdown; nội dung Markdown và metadata lưu trong repository. Chưa cần MDX khi bài viết chỉ gồm văn bản, ảnh, bảng được hỗ trợ và code.

```text
frontend/
├── app/(site)/blog/page.js
├── app/(site)/blog/[slug]/page.js
├── components/blog/
├── content/blog/*.md
├── data/blog.js
└── lib/blog.js
```

- `data/blog.js` chứa slug, title, excerpt, author, category, tags, publishedAt, updatedAt, status và đường dẫn nội dung.
- `lib/blog.js` đọc Markdown ở phía server; không đưa mã đọc filesystem vào client bundle.
- Dùng manifest metadata riêng để tránh thêm parser front matter khi chưa cần.
- Slug duy nhất; bài nháp không xuất hiện ở danh sách, trang công khai hoặc sitemap.
- Slug không tồn tại dùng trang 404 hiện có.
- Raw HTML trong bài không được thực thi; kiểm soát protocol liên kết và nguồn ảnh theo nhu cầu thực tế.

## 8. Thiết kế và nội dung Blog

### Trang danh sách

- Tiêu đề và mô tả ngắn, bộ lọc chủ đề.
- Mỗi bài có tiêu đề, tóm tắt, ngày cập nhật và thời lượng đọc ước tính từ nội dung.
- Sắp xếp theo ngày xuất bản; không dùng số lượt xem hoặc tác giả giả.
- Với 3–5 bài đầu, chưa cần tìm kiếm riêng hoặc phân trang.

### Trang chi tiết

- Breadcrumb, tiêu đề, tác giả, ngày xuất bản/cập nhật.
- Cột đọc vừa phải; mục lục cho bài dài, heading có anchor ổn định.
- Code có Copy; ví dụ và output được phân biệt rõ.
- Liên kết sang mục Cheatsheet và bài thực hành phù hợp.
- Mục nguồn tham khảo cuối bài, có liên kết tại chỗ cho nội dung cần đối chiếu.
- Bài liên quan dựa trên chủ đề; không hiển thị liên kết rỗng.

### Năm bài mở đầu

| Bài | Kết quả người đọc đạt được | Nguồn chính |
| --- | --- | --- |
| Bắt đầu với Linux terminal | Điều hướng và thao tác file cơ bản | Ubuntu Welcome to the terminal, GNU Coreutils |
| Đường dẫn tuyệt đối và tương đối | Hiểu vị trí hiện tại và cách tham chiếu file | Ubuntu, GNU Bash |
| Pipe và redirect qua ví dụ | Ghép lệnh và phân biệt luồng dữ liệu | GNU Bash |
| Hiểu quyền truy cập file | Đọc quyền và dùng chmod trong ví dụ có kiểm soát | GNU Coreutils, Ubuntu |
| grep và find giải quyết việc gì? | Phân biệt tìm nội dung với tìm file | GNU Grep, GNU Findutils |

Chỉ mở Blog trên navbar khi có tối thiểu 3 bài được biên tập, thử ví dụ và rà liên kết.

## 9. Nguồn tham khảo uy tín trên mạng

Ngày tra cứu: 2026-09-30. Đây là nguồn để nghiên cứu và kiểm chứng; không phải bộ nội dung sao chép vào BashLab. Liên kết tới manual đang phát hành có thể thay đổi phiên bản theo thời gian.

### Nguồn ưu tiên

| Nguồn | Vì sao chọn | Cách dùng trong BashLab |
| --- | --- | --- |
| [GNU Bash Reference Manual](https://www.gnu.org/software/bash/manual/bash.html) | Tài liệu chính thức của GNU Bash | Builtins, quoting, biến, expansion, pipe, redirect và job control |
| [GNU Coreutils Manual](https://www.gnu.org/software/coreutils/manual/coreutils.html) | Tài liệu của dự án cung cấp nhiều tiện ích dòng lệnh cơ bản | Đối chiếu ls, cp, mv, rm, chmod, chown, sort, wc, df, du và các tùy chọn GNU |
| [GNU Grep Manual](https://www.gnu.org/s/grep/manual/grep.html) | Tài liệu chính thức GNU Grep | Mẫu tìm kiếm, tùy chọn, regex và hành vi grep |
| [GNU Findutils Manual — PDF](https://www.gnu.org/software/findutils/manual/find.pdf) | Manual chính thức GNU Findutils, tìm thấy qua kết quả tìm kiếm | Tra cứu find và xargs khi biên tập; cần mở đúng phần và kiểm tra lại khi viết ví dụ |
| [Ubuntu Server: Command-line cheat sheet](https://ubuntu.com/server/docs/reference/cli-cheatsheet/) | Trang tham chiếu của tài liệu Ubuntu Server | Tham khảo phân nhóm, cách trình bày ngắn và liên kết tới manual |
| [Ubuntu Server: Welcome to the terminal](https://ubuntu.com/server/docs/tutorial/welcome-to-the-terminal/) | Bài hướng dẫn chính thức, có trình tự cho người mới | Tham khảo cách dạy điều hướng, file, quyền và tìm trợ giúp cho Blog |
| [curl manual](https://curl.se/docs/manpage.html) | Manual trên website dự án curl | Ví dụ HTTP, header, tải file và các tùy chọn curl |
| [OpenSSH Manual Pages](https://www.openssh.org/manual.html) | Danh mục manual chính thức OpenSSH | Tra đúng trang ssh/scp, xác nhận tùy chọn theo bản OpenSSH mục tiêu |
| [ShellCheck: SC2086](https://www.shellcheck.net/wiki/SC2086) | Giải thích từ dự án kiểm tra shell script | Bài về quoting, word splitting và globbing; bổ trợ bước review script |
| [Linux man-pages project](https://www.kernel.org/doc/man-pages/) | Dự án tài liệu giao diện kernel và thư viện C trên Linux | Nguồn cho bài nâng cao về hệ thống; không coi đây là manual bao phủ mọi lệnh người dùng |

### Cách áp dụng nguồn

1. Dùng tài liệu của chính công cụ để xác nhận cú pháp và hành vi.
2. Dùng Ubuntu để tham khảo trình tự hướng dẫn và cách tổ chức tra cứu.
3. Khi tài liệu web khác với máy thử nghiệm, kiểm tra phiên bản, `man`, `help` hoặc `--help` của công cụ trong môi trường mục tiêu.
4. Tự viết ví dụ ngắn trong thư mục dữ liệu mẫu, tự diễn giải nội dung và dẫn nguồn tới phần liên quan.
5. Không đánh dấu `verifiedAt` chỉ vì đã đọc tài liệu; chỉ điền khi đã kiểm chứng ví dụ.
6. Với ps/top/free, ip/ss/ping, less, zip/unzip và các công cụ ngoài bộ GNU đã liệt kê, bổ sung manual đúng package trước khi xuất bản mục đó.
7. Không suy ra khả năng tương thích macOS/BSD/BusyBox từ manual GNU. Chỉ ghi hỗ trợ môi trường đã kiểm tra.

## 10. Quy trình biên tập và kiểm chứng

1. Chọn mục lệnh hoặc chủ đề bài, xác định tình huống người học cần giải quyết.
2. Chọn nguồn gốc phù hợp ở mục 9 và lưu liên kết cụ thể.
3. Viết mô tả và ví dụ riêng; giải thích các cờ thực sự xuất hiện.
4. Chạy ví dụ trong thư mục tạm hoặc môi trường Linux cô lập với dữ liệu mẫu.
5. Ghi distro/image, phiên bản shell/công cụ có liên quan, ngày thử và kết quả.
6. Kiểm tra lệnh copy không chứa prompt, output hoặc placeholder chưa được giải thích.
7. Rà quyền cần thiết và tác động xóa/ghi đè; ví dụ quản trị không được ngầm giả định người đọc có root.
8. Với shell script, chạy ShellCheck nếu phù hợp; vẫn cần chạy ví dụ để kiểm chứng hành vi.
9. Kiểm tra bài học liên quan tồn tại và có thể truy cập theo quyền người đọc.
10. Review nội dung và giao diện trước khi chuyển sang published.

Ưu tiên cập nhật khi người dùng báo lỗi, khi sandbox đổi image hoặc khi công cụ thay đổi hành vi. Rà liên kết và nội dung định kỳ theo khả năng duy trì của nhóm.

## 11. Metadata, khả năng truy cập và hiệu năng

- Mỗi trang có title và description riêng; Blog có metadata theo bài.
- Khi đã biết domain triển khai, cấu hình canonical và sitemap phù hợp. Trang lọc Cheatsheet dùng canonical về trang chính để hạn chế trùng nội dung.
- Có một H1, heading theo cấp, label cho tìm kiếm/bộ lọc và tên nút Copy rõ nghĩa.
- Thông báo copy và số kết quả dùng vùng thông báo phù hợp, tránh đọc lại quá nhiều khi gõ.
- Focus bàn phím nhìn rõ; active state không chỉ phân biệt bằng màu.
- Ảnh bài viết có alt phù hợp, khai báo kích thước và không tải nặng khi chưa cần.
- Kiểm tra anchor với SmoothScroll hiện có, navbar cố định và tùy chọn giảm chuyển động.
- Không thêm thư viện animation, search hoặc syntax highlighting cho bản đầu nếu yêu cầu chưa cần.

## 12. Lộ trình và ước lượng

Ước lượng cho một người thực hiện; phụ thuộc chất lượng nội dung đầu vào và môi trường kiểm chứng.

| Giai đoạn | Đầu việc | Đầu ra | Thời gian |
| --- | --- | --- | --- |
| 1A | Chốt ngôn ngữ, môi trường Linux, nhóm lệnh và mẫu nội dung | Danh sách và cấu trúc dữ liệu | 0,5 ngày |
| 1B | Navbar, route, footer, bố cục desktop/mobile | Khung Cheatsheet | 0,5–1 ngày |
| 1C | Search, filter, URL, anchor và Copy | Tra cứu hoạt động đầy đủ | 1 ngày |
| 1D | Viết và kiểm chứng khoảng 40–50 mục | Nội dung có nguồn và kết quả thử | 1–2 ngày |
| 1E | Rà UI, bàn phím, liên kết, lint/build và tài liệu | Cheatsheet đủ điều kiện review | 0,5–1 ngày |
| 2A | Danh sách Blog, trang bài, metadata và Markdown | Hệ thống xuất bản từ repository | 2–3 ngày |
| 2B | Viết 3–5 bài, kiểm chứng và biên tập | Nội dung Blog đủ mở navbar | Ước lượng riêng sau khi chốt độ dài |

Tổng Cheatsheet dự kiến: 3,5–5,5 ngày. Blog cần thêm 2–3 ngày kỹ thuật và thời gian biên tập riêng.

## 13. Checklist nghiệm thu

### Cheatsheet

- [ ] Navbar/footer hoạt động cho guest và người đã đăng nhập, trên desktop/mobile.
- [ ] Active state đúng khi truy cập trực tiếp hoặc chuyển trang.
- [ ] Search theo tên, mô tả và ví dụ đúng; kết hợp được category.
- [ ] Không có kết quả, từ khóa rỗng và category không hợp lệ đều được xử lý.
- [ ] Refresh, Back/Forward và URL chia sẻ giữ trạng thái mong đợi.
- [ ] Anchor hiển thị đúng mục, không bị navbar che hoặc filter ẩn.
- [ ] Copy lấy đúng câu lệnh, báo thành công/thất bại đúng thực tế.
- [ ] Không tràn ngang toàn trang; bàn phím và focus sử dụng được.
- [ ] Mỗi mục có nguồn; ví dụ đã thử có môi trường và ngày kiểm chứng.
- [ ] Liên kết bài học hợp lệ; guest được đưa qua luồng đăng nhập hiện có nếu bài yêu cầu.
- [ ] Nội dung chính có trong HTML ban đầu và metadata đúng.

### Blog

- [ ] Có ít nhất 3 bài hoàn chỉnh trước khi mở liên kết navbar.
- [ ] Bài nháp bị loại khỏi danh sách, route công khai và sitemap.
- [ ] Slug sai trả về trang 404.
- [ ] Mục lục, code, Copy, ảnh và liên kết hoạt động trên desktop/mobile.
- [ ] Tác giả, ngày, thời lượng đọc và nguồn phản ánh nội dung thực tế.

### Kiểm tra kỹ thuật khi triển khai

- [ ] Chạy `npm run lint` và `npm run build` trong `frontend`.
- [ ] Kiểm tra hồi quy Navbar, Footer, Courses và Markdown nếu sửa component chung.
- [ ] Kiểm tra hành vi tìm kiếm/URL/copy; chỉ thêm test tự động cho logic có ý nghĩa.
- [ ] Chạy các script hiệu ứng hiện có nếu thay đổi ảnh hưởng hiệu ứng tương ứng.
- [ ] Cập nhật README, đặc tả trang và ghi rõ phần chưa triển khai.

Lượt tạo tài liệu này không triển khai frontend và không xác nhận các checklist trên đã đạt.

## 14. Phạm vi bàn giao đề xuất

Đợt đầu bàn giao một trang Linux Cheatsheet công khai, khoảng 40–50 mục, có tìm kiếm, lọc, copy, liên kết trực tiếp, nguồn tham khảo và bài học liên quan. Blog triển khai ở đợt tiếp theo với nội dung Markdown trong repository.

Các điểm còn mở trước khi bắt đầu code: ngôn ngữ xuất bản, môi trường Linux kiểm chứng, người chịu trách nhiệm biên tập và danh sách bài học liên kết. Không cần chốt CMS, yêu thích hoặc terminal nhúng để triển khai phạm vi đầu tiên.
