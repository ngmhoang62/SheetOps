# 6. Local environment và .env.local

Trong thư mục source mới, mở PowerShell:

```powershell
npm ci
Copy-Item .env.example .env.local
```

Mở .env.local, điền theo [bảng biến](ENVIRONMENT.md). APP_ENV=production nếu nối database Production MỚI của bạn. Để trống NEXT_PUBLIC_STAGING_SUPABASE_PROJECT_REF. Điền production ref/Sheet ID để guards đối chiếu; không trộn keys giữa projects.

Google key đặt trong dấu nháy kép, giữ header/footer và `\n` của trường private_key. Cấu trúc minh họa, không phải key dùng được:

```dotenv
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nREPLACE_WITH_YOUR_KEY\n-----END PRIVATE KEY-----\n"
```

Sinh CRON_SECRET bằng `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`; lưu riêng. APP_ORIGIN=http://localhost:3000. Secrets có dấu $ trong file Next env cần escape theo [Next.js](https://nextjs.org/docs/app/guides/environment-variables); không đưa password vào command line/log.

```powershell
npm run lint
npm run typecheck
npm test
npm run build
npm run dev
```

Mở http://localhost:3000. Chưa có Admin thì login chưa thành công; hoàn tất chương 8. Không có demo bypass. Build thành công không chứng minh cloud đúng; kiểm tra runtime/chương 10. Thay NEXT_PUBLIC_* phải build lại vì Next nhúng vào browser bundle.

**Xác minh:** `git status --short` không liệt kê .env.local; `git check-ignore .env.local` có kết quả. Login không báo 503 cấu hình. Không chạy cloud suite bằng .env.local. Ảnh chụp thật local ngày 05/11/2026 với cấu hình tổng hợp, chưa đăng nhập cloud:

![Trang login desktop](screenshots/06-local-login.png)

[Bản mobile 390px](screenshots/06-local-login-mobile.png). Không dùng ảnh này làm bằng chứng Auth thật hoặc cấu hình Dashboard.
