# 7. Vercel deployment

1. [Vercel Dashboard](https://vercel.com/dashboard) → **Add New → Project → Import Git Repository**. Kết nối GitHub của người nhận, chọn repository mới. Không chọn project chủ cũ. Framework Next.js, root directory repository root, build `npm run build`; không thêm migration/seed vào build.
2. **Settings → Git → Production Branch** = main của repository mới. **Settings → Environment Variables**: nhập biến runtime theo bảng ENVIRONMENT, scope **Production**. APP_ENV=production; ref/URL/key/Sheet là tài nguyên mới. Không chọn chung scope Preview cho credentials Production. Không đưa BOOTSTRAP_ADMIN_ID/NAME lên Vercel.
3. **Settings → Domains**: lấy origin HTTPS mặc định, không dấu / cuối, điền APP_ORIGIN. Lần đầu có thể phải deploy để lấy domain rồi cập nhật biến và **Deployments → Redeploy**. Supabase → Authentication → URL Configuration: Site URL=origin mới; thêm origin/auth/accept và origin/auth/callback. Local callback là URL chính xác riêng.
4. **Deployments → Build Logs** không lỗi; Visit → /login. Thay NEXT_PUBLIC_* phải redeploy; không promote bundle Preview đang nhúng backend staging sang Production.
5. Cron vercel.json: `0 16 * * *` UTC =23:00 UTC+7. CRON_SECRET chỉ trên server; Vercel gửi Bearer tới route. **Settings → Cron Jobs** kiểm tra /api/cron/daily-export. Chỉ Production tự chạy, Preview không chạy. Giới hạn/độ chính xác phụ thuộc gói: [tài liệu Vercel](https://vercel.com/docs/cron-jobs). Không tự mua gói để đáp ứng cron; ghi giới hạn trước vận hành.
6. Region sin1 mặc định phù hợp Singapore. Người nhận có thể chọn region khác sau khi xem giới hạn gói; không đổi hệ thống hiện tại.

**Xác minh:** Ready, domain thuộc tài khoản mới, login và invite redirect đúng. Cron thật cần chờ lịch, xem sync_runs thành công; chạy thủ công chưa chứng minh scheduler. **SCREENSHOT NEEDED:** `screenshots/07-vercel.png`: repo, tên biến/scope đã che values, Ready/domain và Cron Jobs.
