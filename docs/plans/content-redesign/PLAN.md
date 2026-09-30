# Kế hoạch cải tổ Content và Lesson Editor

Ngày: 2026-09-30. Trạng thái: cập nhật kế hoạch giao diện theo ảnh Account & Security; đợt chỉnh nền và bố cục này chưa triển khai.

Frontend đã có các thay đổi Content/editor từ đợt trước. Trạng thái database đang chạy cần được đối chiếu riêng; lượt cập nhật kế hoạch này chỉ kiểm tra mã nguồn và ảnh tham chiếu.

Tài liệu backend đi kèm: [README bàn giao](README.md).

## 1. Kết quả cần đạt

- Content và editor dùng cùng nền tối với Account & Security, nội dung nằm trên nền liền, phân chia bằng khoảng cách và đường kẻ mảnh.
- Quản trị viên tìm và sửa đúng bài đang xuất hiện trong course.
- Editor dùng form theo từng mục; preview cùng cấu trúc và cách hiển thị với màn học trong ảnh 3 người dùng cung cấp.
- Nội dung đã lưu và xuất bản được màn học đọc từ cùng nguồn dữ liệu.

Ảnh 3 là màn học có hướng dẫn bên trái, terminal bên phải. Phần hướng dẫn gồm tiêu đề, Track, Mission Scenario, Objective Tasks, Command Syntax & Usage, Example Walkthrough; có gợi ý và lời giải. Mô tả này giúp người nhận kế hoạch hiểu yêu cầu dù không có ảnh trong repository.

## 2. Hiện trạng làm cơ sở cho kế hoạch ban đầu

Bảng dưới ghi lại điểm xuất phát trước đợt sửa frontend. Tiến độ mã nguồn nằm ở mục 6; hướng chỉnh giao diện mới nhất nằm ở mục 3 và giai đoạn B.

| Phần | Hiện trạng | Việc cần sửa |
| --- | --- | --- |
| ContentManager | Đọc courses → chapters → lessons từ Supabase | Đưa giáo trình lên vị trí chính, bổ sung thông tin để đối chiếu bài |
| LessonEditor | Sửa content_md, objectives và test_template | Thêm form có cấu trúc và preview đầy đủ |
| LabWorkspace | Đọc initialLabs/getLabById từ labsData.js | Đọc nội dung bài đã xuất bản từ Supabase |
| LessonWorkspace | Đọc bài từ Supabase, render Markdown; có tích hợp sandbox | Dùng chung phần hiển thị bài; giữ luồng sandbox/tiến độ khi hợp nhất |
| Shell 101 | Route course đang chuyển tới /courses/shell-101/labs/1 | Giữ liên kết cũ hoạt động khi chuyển sang định danh bài trong database |
| Theme admin | Panel, viền, hover và chữ phụ có sắc xanh | Dùng màu trung tính, xanh làm điểm nhấn |

Các bài ngắn như “Where am I?” và bài “Terminal Fundamentals & Navigation” không phải mặc nhiên cùng một bản ghi. Cần đối chiếu nội dung trước khi gộp hoặc chuyển đổi.

## 3. Thiết kế giao diện

### Bảng màu và chữ

Lấy Account & Security làm chuẩn về nền, chữ, đường phân cách và mức độ nổi của nút. Trong mã nguồn, trang Account kế thừa `--color-bg: #0A0D14`; phần nội dung và sidebar không có nền bao riêng. Content hiện kế thừa nền này nhưng đặt thêm các panel `#131313`, khiến các khối xám nổi rõ trong ảnh mới.

Thay bảng màu đề xuất cũ bằng bảng sau. Nền trang, sidebar và giáo trình phải tạo thành một mặt nền liên tục.

| Vai trò | Giá trị / cách áp dụng |
| --- | --- |
| Nền trang | Kế thừa `var(--color-bg)`, hiện là `#0A0D14`, giống Account |
| Sidebar / vùng Curriculum / vùng Course settings | `transparent`, bỏ viền bao và bo góc của khối lớn |
| Ô nhập | `#0E1319`, viền `#3A434C`, bo góc 5–6px |
| Hover hàng | `#151A20`, chỉ hiện khi tương tác |
| Khóa học đang chọn | `#1B2422`, chữ `#C4DCCB`, cùng cách nhấn nhẹ của Settings |
| Đường phân cách | `#262C33`, dày 1px |
| Chữ chính / phụ | `#EDEEF0` / `#A0A6AE` |
| Tab đang chọn / focus | Sage dịu `#A8C8B2` |
| Nút chính | Nền `#C0D5C6`, chữ `#18251D` |
| Nút phụ | Nền `#171C23`, viền `#394049`, chữ `#E1E4E8` |

Giữ Inter cho nội dung, Space Grotesk cho tiêu đề, JetBrains Mono cho lệnh/code. Tiêu đề trang 32–40px, weight 500; tên khóa khoảng 20–22px; tên chương 15–16px; tên bài và form 14px. Nội dung bài học 15–16px, line-height 1.6. Chữ phụ vẫn đủ rõ trên nền tối.

Published dùng chữ xanh dịu và viền mảnh; Draft dùng chữ vàng dịu; Upcoming dùng chữ xám. Nền badge trong suốt hoặc nhuộm rất nhẹ; trạng thái luôn có nhãn chữ. Chỉ giữ màu xanh tại các điểm nhấn nhỏ, tránh mảng xanh lớn hoặc viền sáng liên tục.

Áp dụng qua wrapper/CSS riêng cho Content và editor. `Admin.module.css` được Users/Activity dùng chung: bỏ class panel ở đúng container của Content hoặc thêm class riêng, không đổi toàn bộ `.panel` để xử lý một trang. Kế thừa nền sẵn có, không cần sửa `globals.css` hay giao diện Account.

### Trang Content

- Header có tiêu đề, mô tả, New course và đường phân cách dưới như Settings; khoảng cách xuống nội dung 32–40px.
- Giữ khung Content tối đa khoảng 1240px để danh sách dài dễ đọc. Cột trái 240–260px, cách vùng chính 32–40px; trên màn hẹp chuyển sang một cột.
- Cột trái gồm tìm khóa học, tên, trạng thái, số bài; bỏ khung xám bao ngoài. Chỉ khóa học đang chọn có nền nhấn nhẹ, ô tìm kiếm có viền riêng.
- Vùng chính: tiêu đề khóa và hai tab Curriculum / Course settings.
- Tab dùng chữ và gạch chân mảnh. Giữ vòng focus khi dùng bàn phím; màu focus dịu đồng bộ với Settings.
- Curriculum là tab mặc định: cây chương/bài, thu gọn chương, thêm bài và đổi thứ tự.
- Bỏ panel bao quanh Chapters & lessons. Tiêu đề, nút Add chapter và danh sách nằm trực tiếp trên nền trang; mỗi chương phân cách bằng đường kẻ mảnh và khoảng trống 20–24px.
- Hàng bài cao tối thiểu 44px, thụt vào 24–32px so với tên chương. Căn trạng thái và thao tác thành cột ổn định; tên dài được xuống dòng, nút không đè lên chữ.
- Mỗi hàng bài có tên, số thứ tự, trạng thái xuất bản, lệnh trọng tâm, Edit và View.
- Course settings chứa tên, slug, mô tả, cấp độ, nhóm, thời lượng và trạng thái; form trên nền liền, chỉ ô nhập có nền và viền riêng.
- New course dùng màu sage dịu như nút chính Settings; Add chapter và các thao tác phụ dùng nút tối hoặc nút chữ.
- Lưu metadata và trạng thái course cùng một lần bấm Save.
- Tạo/đổi tên qua dialog có validation thay cho window.prompt.
- Quay lại từ editor giữ khóa học đang chọn và chương đang mở.

### Lesson Editor

Header có breadcrumb Course / Chapter / Lesson, trạng thái lưu, Cancel, Save và xem trước toàn màn hình. Lưu bằng nút; không bổ sung autosave ở đợt đầu.

Tab Nội dung gồm form trái và preview phải, hai vùng đủ rộng để đọc. Tab Cài đặt chứa chapter, slug, thứ tự, Draft/Published và mẫu kiểm tra. Trên màn hẹp, dùng tab Soạn thảo / Xem trước thay cho hai cột.

Editor dùng cùng nền trang với Content/Settings. Các mục form tách bằng tiêu đề, khoảng trống và đường kẻ; bỏ các card lớn lồng nhau. Ô nhập, code và terminal vẫn có nền riêng để nhận biết vùng tương tác. Preview tiếp tục giữ bố cục hướng dẫn trái / terminal phải của ảnh 3.

| Mục form | Trường và thao tác |
| --- | --- |
| Thông tin đầu bài | Title, mô tả ngắn, Track, độ khó, tag, lệnh trọng tâm |
| Mission Scenario | Bối cảnh và mục tiêu thực hành |
| Objective Tasks | Thêm/xóa/đổi thứ tự bước; nhập nội dung có inline code |
| Command Syntax & Usage | Thêm/xóa/đổi thứ tự hàng cú pháp và giải thích |
| Example Walkthrough | Tên ví dụ, code, giải thích; thêm/xóa/đổi thứ tự |
| Hints & Solution | Gợi ý và diễn giải lời giải |

Đợt đầu hỗ trợ kiểm tra ở cấp bài bằng template hiện có. Không hiển thị bộ tạo rule kiểm tra cho từng bước khi backend chưa hỗ trợ. Có thể dùng Markdown gọn trong trường văn bản; không cần xây rich-text editor hoặc block builder tổng quát.

### Preview

- Tách phần hướng dẫn thành component dự kiến LessonInstructions dùng chung với màn học.
- Preview nhận dữ liệu đang soạn, không cần lưu trước và không ghi progress.
- Giữ thứ tự, typography, checklist, bảng cú pháp, ví dụ và nút Copy như màn học.
- Chế độ toàn màn hình cho xem bố cục hướng dẫn trái / terminal phải. Khung terminal trong preview chỉ là mô phỏng trình bày; thử sandbox thật là hành động riêng.
- Không mặc định tick hoàn thành; không dùng trạng thái solved hoặc acceptance mẫu.
- Acceptance chỉ xuất hiện khi có nguồn thống kê thật; chưa có thì ẩn cả dấu phân cách liên quan.

## 4. Trình tự triển khai

### Giai đoạn A — Chốt dữ liệu và danh sách bài

- [ ] Đối chiếu 12 lab trong labsData.js với courses/chapters/lessons trong database thực tế.
- [ ] Lập bảng ánh xạ lab ID cũ, course, lesson UUID, slug, chapter và thứ tự đích.
- [ ] Đánh dấu bài tương đương, bài mới, bài cần gộp; quyết định riêng tiến độ khi gộp.
- [ ] Backend duyệt contract trong README, thêm migration và validation.

### Giai đoạn B — Content và theme

**Ưu tiên hiện tại: chỉnh hình thức theo ảnh Account & Security.** Phần này có thể triển khai ngay, độc lập với migration và việc ánh xạ dữ liệu ở giai đoạn A/D. Các tab, tìm kiếm và dialog đã có trong mã nguồn cần được giữ khi chỉnh bố cục.

1. [ ] Đặt token cục bộ theo bảng màu mới; kế thừa nền trang Account.
2. [ ] Bỏ class panel khỏi sidebar, Curriculum và Course settings; dùng container riêng với nền trong suốt.
3. [ ] Chỉnh header, khoảng cách hai cột, đường phân cách chương và kích thước hàng bài.
4. [ ] Đồng bộ New course, nút phụ, tab, badge, hover và focus với Settings.
5. [ ] Áp dụng nền liền và cách chia mục tương tự cho editor, giữ form từng mục và preview theo ảnh 3.
6. [ ] Kiểm tra Content cạnh Account ở cùng kích thước màn hình: nền liên tục, không còn khung xám lớn; thứ bậc tên khóa/chương/bài rõ.
7. [ ] Kiểm tra 1440px, 1920px, 768px và 390px; nội dung dài không tràn trang, thao tác không chồng lên tên bài.
8. [ ] Kiểm tra tìm/chọn khóa, đổi tab, mở editor, thu gọn chương và focus bàn phím sau khi thay container/CSS.

Nghiệm thu đợt này khi nền Content khớp Settings, sidebar và giáo trình không còn viền bao/bo góc của card, màu xanh chỉ còn điểm nhấn nhỏ. Các chức năng đọc/ghi nội dung và contract backend giữ nguyên trong đợt chỉnh hình thức này.

### Giai đoạn C — Editor và renderer

- [ ] Bổ sung đọc/ghi lesson_content, giữ editor Markdown cho bài chưa chuyển đổi.
- [ ] Tạo form từng mục và component LessonInstructions.
- [ ] Thêm preview trực tiếp, preview toàn màn hình, validation theo trường.
- [ ] Lưu lỗi giữ nguyên dữ liệu; khóa gửi lặp khi đang lưu; cảnh báo rời trang khi còn thay đổi.
- [ ] Bài có cấu trúc không được vô tình mở bằng editor cũ rồi ghi đè dữ liệu.

### Giai đoạn D — Kết nối màn học

- [ ] Màn học và curriculum đọc cùng nguồn Supabase theo course/chapter/lesson.
- [ ] Dùng renderer chung, thứ tự và bộ lọc published chung.
- [ ] Nối với sandbox thật qua luồng đã có; không coi terminal mô phỏng là thực thi Bash.
- [ ] Ánh xạ URL /labs/[labId] cũ sang đúng UUID/slug; ID sai trả not found.
- [ ] Chuyển dữ liệu đã đối chiếu, bỏ initialLabs khỏi đường đọc nội dung sản phẩm sau nghiệm thu.

### Giai đoạn E — Kiểm tra bàn giao

- [ ] Desktop 1440px, 1920px, tablet 768px và mobile 390px: không tràn ngang toàn trang; code có thể cuộn riêng.
- [ ] Kiểm tra bàn phím, focus, nhãn nút icon và độ tương phản chữ trên nền đen.
- [ ] Chỉnh từng mục → Save → tải lại → mở bài học: nội dung/thứ tự giống preview.
- [ ] Draft không bị lộ qua URL trực tiếp; Published nằm trong course hidden/upcoming không lộ nội dung.
- [ ] Bài Markdown cũ vẫn đọc được; slug/UUID và tiến độ không mất sau chuyển đổi.
- [ ] Lỗi tải/lưu, bài không tồn tại, danh sách rỗng, nội dung dài đều có giao diện phù hợp.
- [ ] Check Solution giữ contract và hành vi hiện có; chưa có verifier thì hiển thị hoàn thành thủ công.

## 5. File dự kiến tác động khi triển khai

### Đợt chỉnh nền và bố cục theo Settings

- `frontend/components/admin/ContentManager.jsx`: gỡ wrapper/class panel tại sidebar, Curriculum và Course settings; giữ các handler nghiệp vụ.
- `frontend/components/admin/ContentManager.module.css`: token cục bộ, nền liền, header, cột, hàng và trạng thái tương tác.
- `frontend/components/admin/LessonEditor.jsx` và `LessonEditor.module.css`: chỉnh wrapper nếu cần và cách chia mục form/preview.
- `frontend/components/admin/Admin.module.css`: chỉ thêm biến thể cục bộ nếu component dùng chung cần hỗ trợ; kiểm tra Users/Activity khi có thay đổi.
- Tham chiếu màu/bố cục từ `frontend/app/(site)/account/Account.module.css`; không cần sửa trang Account.
- Backend không có file cần thay đổi cho đợt chỉnh nền này.

### Toàn bộ kế hoạch hợp nhất nội dung

- frontend/components/admin/ContentManager.jsx và ContentManager.module.css.
- frontend/components/admin/LessonEditor.jsx và LessonEditor.module.css.
- frontend/components/admin/Admin.module.css; AdminGate hoặc wrapper nếu cần mở rộng editor.
- Component LessonInstructions mới và CSS dùng chung.
- frontend/components/workspace/LabWorkspace.jsx và LabWorkspace.module.css.
- frontend/components/learning/LessonWorkspace.jsx; frontend/lib/learning.js.
- Các route course, /labs/[labId], /learn/[course]/[lesson] và nơi tạo liên kết trong catalog/My Learning.
- frontend/data/labsData.js: nguồn đối chiếu/chuyển dữ liệu trong giai đoạn chuyển tiếp.
- backend/db/migrations: migration mới, không sửa migration đã áp dụng.

## 6. Phạm vi bàn giao hiện tại

Đã cập nhật theme Admin, trang Content, Lesson Editor, component preview theo ảnh 3 và renderer bài học đọc được `lesson_content` khi backend cung cấp. Bài Markdown cũ tiếp tục dùng editor/renderer hiện tại.

Trình soạn bài có cấu trúc và renderer học dùng cùng contract trong README backend. Trước khi backend thêm cột `lesson_content`, nút mở editor có cấu trúc sẽ bị vô hiệu hóa và editor Markdown vẫn lưu như trước. Route lab Shell 101 hiện vẫn đọc `labsData.js`; cần hoàn tất bước đối chiếu/mapping riêng trước khi chuyển route đó sang curriculum Supabase.

Đợt sửa frontend trước chưa được kiểm chứng giao diện trong trình duyệt. Các mục trong giai đoạn A, D và E vẫn cần đối chiếu dữ liệu thật và kiểm tra tích hợp.

Lần cập nhật theo ảnh Account & Security chỉ sửa kế hoạch và README bàn giao. Giai đoạn B mô tả công việc giao diện cần làm tiếp; chưa áp dụng các thay đổi nền liền vào code trong lượt này.
