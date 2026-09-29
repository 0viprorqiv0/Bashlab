-- Bật RLS ngay bây giờ, CHƯA thêm policy nào ở bước này.
-- Mặc định Postgres/Supabase: bảng bật RLS mà không có policy nào thì
-- anon/authenticated không đọc/ghi được gì cả; chỉ service_role (bypass RLS)
-- mới truy cập được. Đây là trạng thái an toàn tạm thời trong lúc quyết định
-- RLS vs RPC cho các thao tác admin (xem ghi chú trong kế hoạch backend).
alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.chapters enable row level security;
alter table public.lessons enable row level security;
alter table public.progress enable row level security;
alter table public.practice_sessions enable row level security;
alter table public.admin_logs enable row level security;
