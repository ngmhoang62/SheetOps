# 8. Admin đầu tiên

Thực hiện trên máy tin cậy bằng secrets Supabase MỚI, sau đủ bảy migrations. Không dùng metadata gán role.

1. Supabase → **Authentication → Users → Add user → Create new user**. Nhập email chủ sở hữu, password mạnh; xác nhận email bằng trusted dashboard nếu hỗ trợ. Copy **User UID**, không phải email. Auth user chưa đủ cấp quyền ứng dụng.
2. Điền .env.local: BOOTSTRAP_ADMIN_ID=UUID đó, BOOTSTRAP_ADMIN_NAME=tên hiển thị. Kiểm tra APP_ENV=production, production ref và URL khớp project mới:

```powershell
npm run admin:bootstrap
```

Lệnh đọc .env.local, xác minh user qua Auth Admin API rồi gọi bootstrap_admin bằng server secret. Không truyền password vào lệnh. RPC khóa giao dịch, chỉ cho First Admin khi chưa có Admin active, ghi audit trong giao dịch. Chạy lại bị từ chối là bảo vệ; không xóa Admin để chạy lại.

3. Web /login bằng email/password mới. Trang Người dùng/Cài đặt/Đồng bộ xuất hiện. SQL chỉ đọc: `select id, role, is_active from public.profiles;` phải đúng UUID admin active; audit_logs có sự kiện profiles. Xóa BOOTSTRAP_ADMIN_ID/NAME khỏi file khi xong; không triển khai lên Vercel.
4. Staging: đặt `$env:APP_ENV='staging'` để chọn .env.staging.local. BOOTSTRAP_ADMIN_ID/NAME đặt trong process hoặc file staging; UUID phải thuộc staging. Xong chạy `Remove-Item Env:APP_ENV`.

**Xác minh:** Admin login được, profile active và audit tồn tại. User sau mời qua UI. **SCREENSHOT NEEDED:** `screenshots/08-admin.png`: Copy UID và trang Người dùng, che password/email riêng.
