# 3. Supabase PostgreSQL và Auth

1. [Supabase Dashboard](https://supabase.com/dashboard) → **New project**, chọn tổ chức mới. Đặt tên riêng, region phù hợp (Vercel mặc định Singapore), lưu database password trong password manager. Chọn gói không tính phí nếu còn quota; nếu yêu cầu billing/nâng cấp thì dừng để chủ sở hữu quyết định.
2. **Project Settings → General**: lấy project reference 20 chữ cái. **Connect / API Keys** (hoặc **Settings → API Keys**): lấy Project URL, publishable key và secret key. Điền `NEXT_PUBLIC_PRODUCTION_SUPABASE_PROJECT_REF`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`. URL là `https://<ref>.supabase.co`, không path/query. Đây là Production của người nhận, không điền ID cũ.
3. **Table Editor**: xác nhận chưa có bảng nghiệp vụ. **SQL Editor → New query**: mở từng file trong `supabase/migrations`, dán toàn bộ và Run đúng thứ tự sau, từng file một. Không chạy lại migration đã thành công; lưu tên file/thời điểm/kết quả riêng. SQL Editor không tự ghi lịch sử CLI; không trộn với `db push` khi chưa đồng bộ migration history.

| Thứ tự | File                                          |
| ------ | --------------------------------------------- |
| 1      | 20261102083706_phase2_foundation.sql          |
| 2      | 20261102083948_phase2_transactions.sql        |
| 3      | 20261102085245_phase2_hardening.sql           |
| 4      | 20261102085436_phase2_numeric_sort.sql        |
| 5      | 20261102090827_phase2_rate_and_completion.sql |
| 6      | 20261103135713_order_visibility.sql           |
| 7      | 20261103174506_audit_pagination.sql           |

Chỉ áp dụng lên Supabase mới trống. PostgreSQL thuần thiếu auth.users/auth.uid() và roles Supabase, không tương đương hosted Supabase. Không seed tự động. Nếu lỗi, kiểm tra trạng thái schema trước khi chạy lại; không reset database có dữ liệu.

4. SQL Editor chạy kiểm tra chỉ đọc:

```sql
select tablename, rowsecurity from pg_tables
where schemaname='public' order by tablename;
select count(*) from public.orders;
select count(*) from public.profiles;
```

Năm bảng profiles/orders/sync_runs/audit_logs/workspace_settings phải có RLS; orders/profiles ban đầu =0. Có schema private và RPC bootstrap_admin, analytics_summary, audit_page. Không tắt RLS để chữa lỗi.

5. **Authentication → Sign In / Providers → Email**: bật Email, tắt public signup (User Signups có thể nằm trong Authentication Settings). **Authentication → URL Configuration**: Site URL lúc local = `http://localhost:3000`; Redirect URLs thêm `http://localhost:3000/auth/accept` và `http://localhost:3000/auth/callback`. Khi có Vercel đổi Site URL và thêm hai URL HTTPS tương ứng; không wildcard rộng. [Tài liệu migrations](https://supabase.com/docs/guides/deployment/database-migrations).

**Xác minh:** SQL không lỗi, đủ bảng/RLS, chưa có dữ liệu thật; signup tắt. Chưa đăng nhập ứng dụng được đến chương 8. **SCREENSHOT NEEDED:** `screenshots/03-supabase.png`: ref, bảng/RLS và URL config; che keys/password.

Sau khi cài bằng SQL Editor: lưu tên/version và SHA-256 từng file cùng full source SHA, môi trường, thời điểm/người chạy và kết quả. Trước khi dùng CLI cho lần nâng cấp sau, bắt buộc làm [quy trình đối chiếu history tại chương 13.5](13-development-workflow.md#135-migration-history-sau-cài-đầu-bằng-sql-editor). Không đánh dấu applied hàng loạt hoặc chạy db push khi history chưa đồng bộ.
