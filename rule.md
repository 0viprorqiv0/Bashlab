# Quy tắc làm việc BashLab

## 1. Phạm vi và nguồn đối chiếu

Quy tắc này áp dụng cho người đóng góp và công cụ hỗ trợ trong repository. Các từ **phải**, **không được** là yêu cầu bắt buộc; ngoại lệ phải được người phụ trách repository chấp thuận và ghi rõ trong pull request hoặc yêu cầu công việc.

- [README.md](README.md) mô tả cách chạy và trạng thái thực tế.
- [bashlab-pages.md](bashlab-pages.md) mô tả 17 trang thiết kế, giữ nguyên STT và mã Screen Stitch.
- Mã nguồn xác định phần đã triển khai. Không ghi một chức năng là hoàn thành chỉ vì có thiết kế, giao diện mẫu hoặc tài liệu backend.
- Nếu tài liệu và mã nguồn mâu thuẫn, phải nêu rõ điểm lệch và cập nhật tài liệu liên quan khi sửa.
- Không tự thêm, xóa hoặc gộp trang ngoài phạm vi yêu cầu được duyệt. My Learning là trang riêng; Sessions và Admin log là hai tab của Activity.

## 2. Nhánh và phạm vi trách nhiệm

| Nhóm | Nhánh tích hợp nhóm | Trang | Phạm vi |
| --- | --- | --- | --- |
| A | `feature/a-product-introduction` | 01 | Giới thiệu sản phẩm, Landing |
| B | `feature/b-account-authentication` | 02–06 | Xác thực và khôi phục tài khoản |
| C | `feature/c-course-discovery` | 07–08 | Danh sách và tổng quan khóa học |
| D | `feature/d-learning-practice` | 09–10 | My Learning và Workspace |
| E | `feature/e-personal-account` | 11 | Tài khoản cá nhân |
| F | `feature/f-content-administration` | 12–13 | Quản trị nội dung |
| G | `feature/g-operations-administration` | 14–15 | Quản trị vận hành |
| H | `feature/h-system-pages` | 16–17 | Trang hệ thống |

- `main` là nhánh tích hợp để bàn giao, không phải nhánh phát triển tác vụ thường ngày.
- Nhánh nhóm chứa toàn bộ dự án. Không xóa mã ngoài nhóm để làm nhánh “chỉ chứa chức năng của nhóm”.
- Tạo nhánh tác vụ từ nhánh nhóm tương ứng: `<type>/<group>-<description>`, dùng chữ thường ASCII và dấu gạch nối.
- Type nhánh: `feature`, `fix`, `docs`, `chore`; group: `a` đến `h`. Ví dụ: `feature/b-login-form`, `fix/h-not-found-layout`.
- Thay đổi dùng chung hoặc tài liệu toàn dự án dùng `docs/project-<description>` hoặc `chore/shared-<description>`, tạo từ `main`, gửi PR vào `main`.
- Thay đổi liên quan nhiều nhóm phải mô tả các nhóm chịu ảnh hưởng trong PR. Tách PR nếu các phần có thể kiểm tra và tích hợp độc lập.
- Không force-push, rebase hoặc viết lại lịch sử đã chia sẻ trên `main` và tám nhánh nhóm. Không tự xóa nhánh nhóm.

## 3. Quy trình thực hiện một tác vụ

1. Kiểm tra `git status`, nhánh hiện tại và remote trước khi thao tác. Giữ nguyên thay đổi chưa commit của người khác; không dùng reset/clean để dọn khi chưa được phép.
2. Fetch remote, cập nhật nhánh cơ sở bằng fast-forward. Nếu bị diverge, kiểm tra lịch sử trước khi merge; không force để vượt lỗi.
3. Tạo nhánh tác vụ, sửa đúng phạm vi và kiểm tra tác động tới thành phần dùng chung.
4. Chạy kiểm tra phù hợp, xem diff và stage từng file chủ đích.
5. Commit, push nhánh tác vụ, tạo PR vào đúng nhánh cơ sở.
6. Sau review và kiểm tra, tích hợp vào nhánh nhóm; khi đủ điều kiện bàn giao, tạo PR từ nhánh nhóm vào `main`.

Ví dụ bắt đầu tác vụ nhóm B:

```bash
git status
git fetch origin
git switch feature/b-account-authentication
git pull --ff-only origin feature/b-account-authentication
git switch -c feature/b-login-form
```

Ví dụ kiểm tra trước commit:

```bash
git diff
git add frontend/path/to/changed-file.jsx
git diff --cached
git diff --cached --check
git commit -m "feat(b): add login form validation"
git push -u origin feature/b-login-form
```

Đường dẫn trong ví dụ phải được thay bằng file thực tế. Sau khi `main` có thay đổi dùng chung, cập nhật nhánh nhóm bằng merge qua PR. Không rebase nhánh nhóm đã chia sẻ.

## 4. Quy ước commit

Định dạng: `<type>(<scope>): <mô tả>`.

- Type: `feat` (chức năng), `fix` (sửa lỗi), `docs` (tài liệu), `style` (định dạng, không đổi hành vi), `refactor` (tái cấu trúc), `test` (kiểm thử), `chore` (cấu hình/công cụ).
- Scope: `a`–`h`, `shared` hoặc `project`.
- Mô tả phải nói rõ thay đổi; không dùng các thông điệp như “update”, “fix bug”, “done”.
- Mỗi commit phải có một mục đích thống nhất. Không trộn sửa chức năng với định dạng hàng loạt hoặc đổi dependency không liên quan.
- Không commit build/cache, token, dữ liệu thật hoặc file máy cá nhân. Phải kiểm tra nội dung staged, không chỉ danh sách tên file.
- Thay dependency phải cập nhật lockfile bằng npm và nêu lý do trong PR. Không sửa lockfile thủ công.

Ví dụ: `docs(project): clarify page catalog and contribution rules`.

## 5. Điều kiện review và merge

PR phải ghi: mục đích, nhóm/trang liên quan, thay đổi hành vi, kiểm tra đã chạy và kết quả, phần chưa hoàn thành, ảnh trước/sau khi sửa UI, và cách xử lý nếu thay đổi gây lỗi.

Điều kiện merge:

- Đúng nhánh đích, diff chỉ gồm phạm vi đã mô tả, không còn conflict hoặc nhận xét bắt buộc chưa xử lý.
- Có ít nhất một người khác review nếu dự án có nhiều người đóng góp. Khi làm một mình, phải tự kiểm tra toàn bộ diff và ghi kết quả trong PR trước merge.
- Code, tài liệu và cấu hình nhất quán. Không tuyên bố “đã kiểm thử” nếu chưa chạy; nêu rõ kiểm tra bị chặn và nguyên nhân.
- Thay đổi frontend phải chạy lint và build. Chạy script curiosity/backdrop khi ảnh hưởng hiệu ứng tương ứng; lỗi có sẵn phải được phân biệt với lỗi mới.
- Sửa UI phải kiểm tra trang bị ảnh hưởng trên desktop/mobile, thao tác bàn phím, focus và trạng thái lỗi. Thay đổi logic phải có kiểm tra tái hiện hành vi hoặc lỗi đã sửa.
- Thay đổi chỉ tài liệu phải kiểm tra đường dẫn, lệnh, danh mục trang và whitespace; không bắt buộc build lại ứng dụng.
- Chức năng phụ thuộc backend chưa có phải ghi rõ là mock/demo hoặc chưa kết nối; không coi là hoàn thành đầu-cuối.
- Khi giải conflict, đọc cả hai phía, giữ yêu cầu của các nhóm liên quan và chạy lại kiểm tra bị ảnh hưởng.
- Dùng merge commit khi tích hợp giữa các nhánh nhóm lâu dài và `main` để giữ quan hệ lịch sử. PR tác vụ có thể squash nếu lịch sử chỉ phục vụ một tác vụ.
- Sửa lỗi sau khi đã merge bằng commit mới hoặc PR revert; không rewrite lịch sử nhánh chung.

Ngoại lệ khởi tạo: lần đưa repository và tài liệu nền tảng lên GitHub đầu tiên có thể commit trực tiếp trên `main` khi chủ repository yêu cầu. Quy trình PR áp dụng cho các tác vụ thông thường tiếp theo.

## 6. Quy tắc mã nguồn và bảo mật

- Tái sử dụng component và cấu hình hiện có; chỉ thêm dependency khi cần cho yêu cầu cụ thể.
- Giữ nội dung, route và trạng thái UI khớp chức năng được duyệt; phải có xử lý loading, dữ liệu rỗng và lỗi khi luồng có các trạng thái đó.
- Không thực thi dữ liệu nhập vào terminal demo bằng shell của server hoặc máy chủ ứng dụng.
- Khi triển khai sandbox thật, phải cô lập phiên và kiểm soát tài nguyên/quyền truy cập theo thiết kế được duyệt trước khi mở cho người dùng.
- F/G chỉ dành cho quản trị viên. Backend phải kiểm tra quyền trên từng thao tác; ẩn nút ở frontend không thay thế kiểm tra quyền.
- Người dùng chỉ được truy cập tài khoản, tiến độ và phiên được phép. H phải phản ánh đúng lỗi truy cập/không tìm thấy.
- Luồng quên mật khẩu phải dùng thông báo trung lập; thao tác nhạy cảm và nhật ký phải xử lý theo đặc tả, tránh ghi mật khẩu/token.
- Không đưa secret vào code, commit, log, ảnh hoặc mô tả PR. File mẫu môi trường chỉ dùng giá trị giả.
- `.gitignore` không gỡ file đã được Git theo dõi. Nếu phát hiện secret đã commit, dừng phát hành, thông báo người phụ trách và thu hồi/đổi secret; không chỉ xóa file rồi coi là đã xử lý.
- Không đổi quyền, môi trường triển khai hoặc dữ liệu thật ngoài yêu cầu được giao.

## 7. Tài liệu và bàn giao

Khi thêm hoặc đổi chức năng, cập nhật README, đặc tả trang hoặc backend README tương ứng. Bàn giao phải ghi nhánh/commit, phạm vi hoàn thành, kiểm tra đã thực hiện và hạn chế còn lại.

File này là quy ước làm việc; không tự bật branch protection, CI hoặc required reviews trên GitHub. Muốn cưỡng chế tự động cần cấu hình repository và workflow riêng.
