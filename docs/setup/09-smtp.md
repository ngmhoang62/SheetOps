# 9. SMTP và invitation

1. Đăng ký SMTP của người nhận, xác minh email/domain gửi. Dashboard SMTP → **SMTP credentials/settings**: lấy hostname, port, username, password/API credential, sender email/name. Nếu dùng domain riêng, thêm SPF/DKIM theo nhà cung cấp tại DNS và chờ verified. Không đoán DNS records hoặc dùng sender chủ cũ.
2. Supabase → **Authentication → Email → SMTP Settings** (có thể nằm trong Project Settings → Authentication): bật Custom SMTP, điền rồi Save. Lưu tại Supabase; ứng dụng không có biến `SMTP_*` trong .env.local hoặc Vercel. Default SMTP bị giới hạn; không dùng làm bằng chứng gửi mail ổn định. [Tài liệu chính thức](https://supabase.com/docs/guides/auth/auth-smtp).
3. Kiểm tra URL Configuration và APP_ORIGIN là domain mới. Template **Invite user** phải giữ liên kết xác nhận Supabase hợp lệ; không tùy biến trước khi lời mời mặc định hoạt động.
4. Web → **Người dùng → Mời người dùng**: nhập mailbox bạn kiểm soát, tên/role Viewer. Kiểm tra inbox/spam, mở link ở cửa sổ riêng tư, đặt password tại /auth/accept, đăng nhập. Provider logs phải có delivery; API accepted chưa chứng minh thư tới inbox.
5. Link đã dùng/hết hạn: thử /login bằng password đã đặt; Admin kiểm tra invitation và gửi lại theo UI khi phù hợp. Không xóa user có lịch sử để chữa link. Tránh click lặp; mail scanner có thể tiêu thụ link.

**Xác minh:** nhận thư thật, domain đúng, đặt password được; Viewer không sửa đơn. Disable Viewer rồi phiên cũ phải mất quyền. **SCREENSHOT NEEDED:** `screenshots/09-invitation.png`: field labels SMTP che values, thư đã che token, trang đặt mật khẩu.
