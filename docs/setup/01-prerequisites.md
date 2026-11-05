# 1. Chuẩn bị phần mềm và tài khoản

1. Mở [Node.js](https://nodejs.org/en/download), cài bản 24; mở [Git](https://git-scm.com/downloads), cài mặc định. Mở PowerShell mới:

```powershell
node --version
npm --version
git --version
```

Node phải >=22.12 và npm >=10; CI dùng Node 24. Chưa có biến môi trường ở bước này.

2. Tạo tài khoản riêng trên [GitHub](https://github.com/signup), [Supabase](https://supabase.com/dashboard), [Google Cloud](https://console.cloud.google.com/), [Google Sheets](https://sheets.google.com/) và [Vercel](https://vercel.com/signup). Chọn nhà cung cấp SMTP có quyền gửi từ địa chỉ/domain của bạn; cấu hình ở chương 9. Bật xác thực hai bước và lưu recovery codes trong kho riêng.
3. Xác minh email, đăng xuất/đăng nhập thử từng dịch vụ, xác nhận tài khoản thuộc người nhận. Không cần password chủ cũ. Ghi chủ sở hữu và người phục hồi tài khoản vào hồ sơ nội bộ, không commit.
4. Để chạy kiểm tra database offline, cài [Docker Desktop](https://www.docker.com/products/docker-desktop/), mở Linux containers và chạy `docker version`. Cần Server hoạt động; chỉ cài CLI chưa đủ. Đọc điều khoản phù hợp tổ chức. Không cần Docker để vận hành website trên Vercel.

**Xác minh:** các lệnh phiên bản chạy được; đăng nhập Dashboard bằng tài khoản mới. **SCREENSHOT NEEDED:** `screenshots/01-accounts.png`, chỉ chụp trạng thái đăng nhập đã che thông tin riêng, không chụp recovery codes.
