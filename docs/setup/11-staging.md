# 11. Staging/Preview

Cần Supabase, Spreadsheet, service account/secrets riêng; không dùng Production dù trống. Không mua branching/nâng gói tự động; hết quota free thì dùng offline chờ quyết định chủ sở hữu.

1. Lặp chương 3–5 cho tài nguyên staging, không copy dữ liệu thật. Copy `.env.staging.example` thành `.env.staging.local`.
2. APP_ENV=staging, NEXT_PUBLIC_STAGING_SUPABASE_PROJECT_REF=ref staging, URL/key/secret=staging; GOOGLE_SPREADSHEET_ID và STAGING_GOOGLE_SPREADSHEET_ID đều là Sheet staging. NEXT_PUBLIC_PRODUCTION_SUPABASE_PROJECT_REF và PRODUCTION_GOOGLE_SPREADSHEET_ID là Production MỚI để chống trùng. CRON_SECRET/Google private key khác Production. Local APP_ORIGIN=http://127.0.0.1:3001.
3. `npm run build:staging` rồi `npm run start:staging`. Đọc file riêng, không fallback .env.local. Local port 3001 cho E2E; phát triển dùng dev:staging. Thêm callback đúng port trong Supabase staging. Bootstrap Admin staging theo chương 8 nếu dùng QA thủ công, không bootstrap trước suite yêu cầu empty state.
4. Vercel → **Settings → Environment Variables → Preview**: APP_ENV=staging, toàn bộ cấu hình staging. Production scope vẫn riêng. Supabase staging thêm origin Preview/auth/accept và /auth/callback; APP_ORIGIN=origin Preview. Preview không có scheduled cron.
5. Online smoke cần PREVIEW_ORIGIN=origin HTTPS Preview, PRODUCTION_APP_ORIGIN=origin HTTPS Production trong .env.staging.local; phải khác nhau. VERCEL_OIDC_TOKEN nếu cần chỉ là biến tạm riêng tư. Smoke có giới hạn tốc độ/ngân sách và dừng challenge/429.
6. Fixture suites chỉ staging dùng một lần. `$env:RUN_CLOUD_TESTS='1'` rồi `npm run test:cloud`; E2E dùng `npm run test:e2e` khi server local 3001 đang chạy và Chrome đã cài. Suite yêu cầu database trống/managed tabs trống hoặc header-only, tạo/xóa user/order/sync/audit theo IDs fixture. Không dùng QA Admin giữ lại. Source không bị suite ghi. Sau các suite yêu cầu trống, có thể `npm run seed:sheets -- --confirm-development-source` để ghi 300 dòng giả vào Source header-only staging đã đối chiếu, rồi import qua UI. Không chạy cleanup suite trên staging đã import/giữ lại.

**Xác minh:** Preview ref/Sheet khác Production; cấu hình trùng phải bị chặn. Trước suite kiểm tra trạng thái dữ liệu, không chỉ tên project. **SCREENSHOT NEEDED:** `screenshots/11-staging.png`: scope Preview/Production riêng và tên tài nguyên, che secrets.
