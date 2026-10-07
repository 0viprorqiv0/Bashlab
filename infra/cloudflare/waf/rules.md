# WAF rules cơ bản cho BashLab

Tạo các rule này trên Cloudflare Dashboard cho zone chứa `app` và `api`.
Chúng không thay thế các kiểm soát trong backend; mục tiêu là chặn request
không hợp lệ trước khi chúng tiêu tốn tài nguyên API hoặc sandbox.

Trước khi tạo rule, xác nhận DNS record của hostname là **Proxied**. Nếu plan
Cloudflare hiện tại không có một loại rule/rate limiting bên dưới, giữ rate
limiter trong backend và ghi lại phần đó là chưa áp dụng ở edge.

## Rule 1 — Block HTTP method không được dùng

**Tên:** `bashlab-block-unexpected-methods`

**Biểu thức mẫu:**

```text
(http.host in {"app.example.com" "api.example.com"}
 and not http.request.method in {"GET" "HEAD" "POST" "PUT" "PATCH" "DELETE" "OPTIONS"})
```

**Action:** Block.

Thay hostname bằng domain thực tế. `OPTIONS` phải được giữ cho CORS; `PUT`,
`PATCH` và `DELETE` được giữ vì API nội dung/admin của BashLab sử dụng chúng.

## Rule 2 — Rate-limit đăng nhập

**Tên:** `bashlab-login-rate-limit`

**Match:**

```text
http.host eq "api.example.com"
and http.request.uri.path eq "/api/auth/login"
and http.request.method eq "POST"
```

**Đếm theo:** IP source.
**Giá trị khởi đầu:** 20 request / 1 phút / IP.
**Action:** Managed Challenge hoặc Block trong 1 phút.

Mức này chỉ là điểm bắt đầu. Hạ xuống nếu có brute force; tăng lên nếu nhiều
người hợp lệ dùng cùng NAT. Backend vẫn áp giới hạn theo `IP + email`, nên
không bỏ limiter trong repo.

## Rule 3 — Rate-limit endpoint thực thi lệnh

**Tên:** `bashlab-sandbox-execute-rate-limit`

**Match:**

```text
http.host eq "api.example.com"
and starts_with(http.request.uri.path, "/api/sessions/")
and ends_with(http.request.uri.path, "/execute")
and http.request.method eq "POST"
```

**Đếm theo:** IP source.
**Giá trị khởi đầu:** 90 request / 1 phút / IP.
**Action:** Block trong 1 phút.

Đây là giới hạn chống flood ở edge, không phải quota học viên. Một lớp học có
thể đi qua cùng NAT, vì vậy không đặt ngưỡng thấp hơn khi chưa quan sát traffic
thật. Admission queue, timeout và quota trong BashLab vẫn là lớp bảo vệ chính
cho việc chạy lệnh.

## Không bật mặc định

Không bật Bot Fight Mode, country block hay challenge cho toàn bộ `/api/*` mà
chưa kiểm tra login, refresh cookie và terminal. Các cơ chế đó dễ chặn nhầm
request hợp lệ của frontend. Nếu cần thêm chúng sau này, hãy thử trên staging
domain trước và lưu rule mới vào tài liệu này.

## Xác nhận sau khi tạo rule

1. Vào `https://app.example.com`, đăng nhập và chạy một lệnh đơn giản.
2. Xác nhận `https://api.example.com/health` trả JSON qua HTTPS.
3. Gửi một method không dùng, ví dụ `TRACE`, và xác nhận Cloudflare block.
4. Theo dõi Security Events để biết rate-limit/challenge có chặn nhầm người
   dùng hay không; điều chỉnh ngưỡng trước khi áp trên production.
