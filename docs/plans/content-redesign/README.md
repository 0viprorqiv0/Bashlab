# README bàn giao backend — Content và Lesson Editor

Ngày: 2026-09-30.

**Trạng thái: frontend đã có form/editor và renderer theo contract; cần đối chiếu migration trên database đang chạy.** Backend cần đáp ứng mục 3 và quyền đọc ở mục 5 trước khi mở editor bài có cấu trúc.

Kế hoạch UX/UI và danh sách việc frontend: [PLAN.md](PLAN.md).

**Cập nhật giao diện theo Account & Security:** Content/editor sẽ kế thừa nền trang hiện có, bỏ các khung xám lớn và dùng đường kẻ mảnh để chia nội dung. Đợt này chỉ chỉnh bố cục/CSS, không thêm trường dữ liệu, migration hay API. Contract `lesson_content` và công việc hợp nhất nội dung bên dưới vẫn giữ nguyên; backend không cần thay đổi theo màu nền.

## 1. Bạn phụ trách backend cần làm gì?

1. Đọc contract lesson_content bên dưới và bổ sung một cột JSONB nullable vào lessons.
2. Thêm kiểm tra cấu trúc, nội dung bắt buộc khi publish và quyền đọc theo course cha.
3. Phối hợp lập bảng ánh xạ 12 lab tĩnh sang bài trong database; không tự ghép chỉ theo tên hoặc số thứ tự.
4. Chuyển dữ liệu có kiểm soát, giữ UUID/tiến độ và liên kết cũ.
5. Xác nhận các mẫu verifier được hỗ trợ; đợt này giữ nguyên API sandbox đang có.

Frontend dự kiến chuyển sang nền đen, form theo từng mục và preview dùng chung renderer với màn học. Thay màu không cần backend; thống nhất nội dung editor và màn học cần các thay đổi dưới đây.

## 2. Hiện trạng từ mã nguồn

| Nguồn | Vai trò hiện tại |
| --- | --- |
| courses → chapters → lessons trong Supabase | Nội dung quản trị; lessons có title, slug, status, sort_order, content_md, objectives, test_template |
| frontend/data/labsData.js | 12 lab có scenario, steps, commandSyntax, examples, hint, solutionExplanation và metadata |
| frontend/components/admin/LessonEditor.jsx | Đọc/ghi Supabase trực tiếp bằng user session |
| frontend/components/workspace/LabWorkspace.jsx | Đọc lab tĩnh; chưa dùng nội dung được sửa qua admin |
| frontend/components/learning/LessonWorkspace.jsx | Đọc bài Supabase, sử dụng sandbox API và progress |
| backend/src/services/taskVerifier.js | Hai mã kiểm tra: hello-bashlab và files-03; rule thuộc server |
| progress.lesson_id | Khóa ngoại tới lessons.id; xóa bài có thể xóa tiến độ theo cascade |

Đây là kết quả đọc repository, chưa kiểm tra schema hay dữ liệu trên môi trường đang deploy. Trước migration phải kiểm tra trạng thái thực tế của môi trường đích.

## 3. Contract dữ liệu đề xuất — phiên bản 1

### Thay đổi schema tối thiểu

Thêm lessons.lesson_content kiểu jsonb, nullable, mặc định NULL. Giữ courses, chapters, progress và các cột cũ trong giai đoạn chuyển tiếp. Không cần tạo một bảng cho mỗi loại block.

- lesson_content IS NULL: bài Markdown cũ; đọc content_md và objectives như hiện tại.
- lesson_content.version = 1: bài có cấu trúc; nội dung hiển thị lấy từ lesson_content.
- Version chưa hỗ trợ hoặc JSON không hợp lệ: báo lỗi có thể xử lý, không âm thầm biến thành bài trống.
- title, slug, chapter_id, sort_order, status vẫn thuộc cột hiện có; không sao chép vào JSON.
- test_template tiếp tục chứa cấu hình kiểm tra ở cấp bài. Hint của bài có cấu trúc lấy từ lesson_content.hint.

Ví dụ lesson_content; đây chỉ là dữ liệu minh họa, không phải bản ghi đã được lưu:

```json
{
  "version": 1,
  "short_objective": "Explore the current directory and navigate using relative and absolute paths.",
  "track": "Core Commands",
  "difficulty": "easy",
  "tag": "Navigation",
  "commands": ["pwd", "cd", "ls"],
  "scenario": "You are deployed as a DevOps Junior Engineer on a newly provisioned Linux server.",
  "steps": [
    { "id": "s1", "text": "Print your current working directory using `pwd`." },
    { "id": "s2", "text": "List files and hidden entries using `ls -la`." }
  ],
  "command_syntax": [
    { "command": "pwd", "description": "Print working directory path." },
    { "command": "ls [options] [path]", "description": "List directory contents." }
  ],
  "examples": [
    {
      "title": "Listing details including hidden files",
      "code": "ls -lah",
      "explanation": "Show permissions, ownership, sizes and hidden files."
    }
  ],
  "hint": "Use the -a flag to show hidden entries.",
  "solution_explanation": "Absolute paths start with /. Relative paths start from the current directory."
}
```

### Quy tắc trường

| Trường | Kiểu / quy tắc |
| --- | --- |
| version | Số nguyên, hiện chỉ nhận 1 |
| short_objective, track, tag, scenario | String; tag có thể rỗng |
| difficulty | easy, medium hoặc hard; rỗng được phép cho draft |
| commands | Mảng string, lệnh trọng tâm; không phải rule xác minh |
| steps | Mảng {id, text}; id không trùng trong bài và không đổi khi sắp xếp |
| command_syntax | Mảng {command, description}; giữ thứ tự mảng |
| examples | Mảng {title, code, explanation}; code giữ nguyên xuống dòng và khoảng trắng |
| hint, solution_explanation | String, có thể rỗng |

Các key của version 1 luôn có trong payload; string rỗng và mảng rỗng dùng cho phần chưa viết. Nội dung text có thể chứa Markdown gọn để biểu diễn inline code; renderer không thực thi HTML/script hoặc lệnh trong nội dung.

Draft được phép chưa hoàn chỉnh nhưng phải đúng kiểu. Khi publish bài có cấu trúc, yêu cầu title/slug hợp lệ, short_objective, track, difficulty, scenario, ít nhất một command và một step có text; mỗi hàng syntax/example đã thêm phải đầy đủ. Cho phép không có syntax/example và ẩn section rỗng. Trim văn bản khi kiểm tra, không trim nội dung code tùy tiện.

Đặt validation ở database qua constraint/trigger phù hợp vì frontend hiện ghi Supabase trực tiếp. Chỉ thêm validation trong Express sẽ không bảo vệ đường ghi này. Không áp điều kiện lesson_content cho các bài legacy vẫn có NULL.

Không lưu completed, solved, acceptance hoặc kết quả terminal vào lesson_content. Các giá trị này thuộc dữ liệu hoạt động của người học/thống kê. Đợt đầu chưa thêm lưu tiến độ từng step vào database; checklist không tự chứng minh bài đã qua verifier.

## 4. Ánh xạ từ dữ liệu lab hiện tại

| labsData.js | Đích |
| --- | --- |
| title, slug | lessons.title, lessons.slug |
| shortObjective | lesson_content.short_objective |
| category | lesson_content.track; khác courses.category |
| difficulty | Easy/Medium/Hard → easy/medium/hard |
| tag, commands, scenario | Trường cùng tên trong lesson_content |
| steps[].id/text | steps[].id/text; giữ ID khi sửa/đổi thứ tự |
| commandSyntax[].cmd/desc | command_syntax[].command/description |
| examples | examples |
| hint | lesson_content.hint |
| solutionExplanation | lesson_content.solution_explanation |
| id số | Bảng ánh xạ URL cũ; không dùng làm lessons.id UUID |
| status: solved/unsolved | Không chuyển thành lessons.status hoặc progress |
| acceptance | Không import thành thống kê thật |
| targetCmd, expectedCommands | Chỉ là gợi ý để backend đối chiếu yêu cầu bài; không biến thành rule chấm tự động |

Các trường content_md/objectives cũ được giữ để đọc legacy và phục hồi. Với bài đã có lesson_content, không duy trì hai bộ nội dung cùng cho sửa. Nếu cần quay về client cũ, phải chuyển/export dữ liệu về định dạng cũ trước; chỉ rollback frontend có thể hiện bản nội dung cũ.

## 5. Đọc, ghi và xuất bản

### Đường nội dung

Giữ Supabase client hiện có, bổ sung lesson_content vào select/update và truy vấn tóm tắt khi cần hiển thị lệnh trọng tâm. Không bắt buộc tạo một REST CRUD mới trong Express.

- Ghi một lần toàn bộ metadata bài, lesson_content và test_template để tránh lưu nửa bài.
- Sau Save thành công, frontend dùng bản ghi trả về hoặc đọc lại để cập nhật trạng thái đã lưu.
- Khi lỗi, giữ bản đang soạn và hiển thị lỗi đúng trường nếu có thể.
- Course settings lưu status cùng metadata, không đổi status ngay trên onChange.
- lessons.slug hiện unique theo chapter, trong khi URL học định danh bằng course + slug. Backend cần kiểm tra trùng slug trong cùng course khi tạo/sửa/chuyển chapter; kiểm tra lại dữ liệu hiện có trước khi thêm ràng buộc. Có thể dùng trigger với khóa phù hợp để tránh race; không chỉ dựa vào kiểm tra ở client.

### Quyền truy cập

Giữ quyền ghi cho admin. Learner/guest chỉ đọc nội dung bài khi bài published VÀ course cha published. Kiểm tra cả truy vấn trực tiếp lessons, không chỉ truy vấn lồng từ courses.

Migration 006 hiện cho đọc lessons dựa vào status của chính bài hoặc is_admin(), chưa ràng buộc course cha trong policy đó. Cần migration mới thay policy phù hợp; policy chỉ thêm mới theo kiểu OR có thể vẫn để quyền cũ mở. Course upcoming vẫn được hiện teaser theo migration 013, không mở nội dung bài.

Preview admin đọc được draft và không ghi progress. Trạng thái loading, không tìm thấy và không đủ quyền cần có phản hồi phân biệt ở frontend.

### Ngữ nghĩa xuất bản đợt đầu

Giữ mô hình một bản ghi/bài: Save bài published làm nội dung mới có hiệu lực ngay. Chọn draft rồi Save ẩn bài khỏi learner. Preview phản ánh bản chưa lưu. Chưa có bản nháp riêng song song với bản published hoặc lịch sử phiên bản; UI không được hứa các hành vi này.

## 6. API kiểm tra bài: giữ tương thích

API hiện tại:

```text
POST /api/sessions/:id/check
Body: { "lessonId": "files-03" }
Response: { "passed": true, "checks": [{ "name": "...", "passed": true }] }
```

**lessonId trong body này hiện là mã verifier (files-03/hello-bashlab), không phải UUID của lessons.** Frontend đang truyền lesson.test_template.verifier vào tham số này. Đợt cải tổ content giữ contract đó để không làm hỏng sandbox client.

- test_template = null: hoàn thành thủ công, label “Mark as complete”.
- Có verifier hợp lệ: dùng “Check Solution”, chỉ gọi khi có session thật.
- Verifier không hỗ trợ phải báo lỗi; không tự fallback sang passed.
- Rule kiểm tra và đường dẫn file cần kiểm tra tiếp tục do server sở hữu; không thực thi code người soạn nhập trong JSON như verifier.
- Editor hiện chỉ biết hai template cố định. Nếu thêm template, backend/frontend cập nhật danh mục cùng nhau; tránh editor cũ ghi mất cấu hình lạ.
- Chưa hỗ trợ chấm từng step: không hứa rằng mỗi dòng checklist đã được server xác nhận.

Hiện LessonWorkspace ghi progress từ client sau kết quả passed; API check chưa tự gắn UUID bài và ghi tiến độ. Nếu cần tiến độ được server xác thực hoàn toàn, phải thiết kế thêm liên kết user/session/lesson và quyền ghi progress trong một hạng mục riêng. Tài liệu này không coi việc đó là đã có sẵn.

## 7. Migration và triển khai

1. Kiểm tra schema thực tế, sao lưu nội dung và progress liên quan. Mã nguồn đang có migrations 001–013; dùng số kế tiếp còn trống khi triển khai.
2. Thêm migration mở rộng: lesson_content nullable, validation và policy. Không sửa lại migration đã áp dụng; không drop cột legacy.
3. Deploy reader hiểu cả legacy và version 1, editor mới và preview trước khi bật ghi dữ liệu có cấu trúc.
4. Lập bảng mapping: course_slug, legacy_lab_id, target_lesson_uuid, target_slug, chapter_id, action (reuse/create/merge), quyết định progress và URL cũ. Đối chiếu với database thực, không sinh UUID giả trong tài liệu.
5. Import bằng script/seed có thể chạy lại mà không nhân đôi bản ghi. Chọn đúng UUID hoặc khóa mapping đã duyệt, không chỉ insert theo thứ tự. Import bài mới ở draft trước để rà soát.
6. Giữ UUID cho bài thực sự tương đương. Bài khác nội dung cần UUID riêng. Trường hợp gộp bài phải thống nhất quy tắc tiến độ trước; không tự đánh dấu done chỉ vì một bài nguồn đã done. Giữ bài nguồn trong giai đoạn đối chiếu.
7. Lưu mapping URL cũ ở nơi bền vững do migration/seed tạo, ví dụ bảng ánh xạ nhỏ theo (course_slug, legacy_lab_id) → lesson_id. Thứ tự bài mới không được làm URL cũ trỏ sang bài khác.
8. Chuyển màn học, sidebar, danh sách và previous/next sang nguồn Supabase; kiểm tra published và thứ tự nhất quán. Sau nghiệm thu mới ngừng đọc labsData.js trong sản phẩm.

Phục hồi: giữ bản sao trước import và mapping, phục hồi nội dung theo UUID. Không xóa/recreate lessons để rollback vì progress tham chiếu bằng UUID. Không drop cột JSON khi frontend mới còn đang đọc.

## 8. Checklist backend để bàn giao frontend

- [ ] Migration chạy được trên database mới và môi trường có dữ liệu legacy; ghi rõ migration đã áp dụng ở môi trường nào.
- [ ] Một fixture bài version 1 có đầy đủ scenario, steps, syntax, examples, hint, solution; một bài legacy NULL vẫn đọc được.
- [ ] Payload sai kiểu/version, step ID trùng hoặc publish thiếu nội dung bị từ chối; draft chưa hoàn chỉnh vẫn lưu được.
- [ ] Admin đọc/ghi được; non-admin không ghi được, không đọc draft hoặc bài thuộc course hidden/upcoming bằng URL/truy vấn trực tiếp.
- [ ] Slug trùng trong cùng course được chặn cả khi đổi chapter; course khác có thể dùng cùng slug.
- [ ] Import chạy lại không nhân đôi; UUID và progress giữ đúng; mapping 12 URL cũ đã được đối chiếu.
- [ ] Verifier hello-bashlab/files-03, unknown verifier và lỗi sandbox được kiểm tra theo contract hiện có.
- [ ] Không import solved/acceptance mẫu thành kết quả thực tế.
- [ ] Bàn giao danh sách verifier hỗ trợ, fixture payload, lỗi validation và quy tắc mapping/gộp đã thống nhất.

## 9. Điểm hai bên cần chốt khi bắt đầu triển khai

- Bản đồ 12 lab sang curriculum thật; trường hợp gộp bài và xử lý tiến độ.
- Môi trường database sẽ nhận migration, số migration tiếp theo và thứ tự deploy.
- Bài nào cần verifier mới; nếu chưa có thì hiển thị rõ hoàn thành thủ công.

Không cần chờ các quyết định này để làm theme, bố cục hoặc renderer với fixture. Chỉ thực hiện import và chuyển đường đọc thật sau khi mapping và migration đã sẵn sàng.
