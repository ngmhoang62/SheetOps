# Cài mới SheetOps bằng tài khoản riêng

Dành cho người nhận mới, không cần quyền vào hệ thống chủ cũ. Làm theo thứ tự; dừng khi bước xác minh không đạt. Có thể dùng domain Vercel được cấp để chạy thử. Không tự nâng gói trả phí; kiểm tra giới hạn nhà cung cấp trước khi tạo tài nguyên.

1. [Chuẩn bị phần mềm và tài khoản](01-prerequisites.md)
2. [GitHub repository](02-github.md)
3. [Supabase PostgreSQL/Auth](03-supabase.md)
4. [Google Cloud Service Account và Sheets API](04-google-cloud.md)
5. [Spreadsheet và import/export](05-spreadsheet.md)
6. [Local environment và .env.local](06-local.md)
7. [Vercel deployment](07-vercel.md)
8. [Khởi tạo Admin đầu tiên](08-first-admin.md)
9. [SMTP và invitation](09-smtp.md)
10. [Kiểm thử toàn bộ website](10-verification.md)
11. [Staging/Preview](11-staging.md)
12. [Troubleshooting và vận hành](12-operations.md)
13. [Phát triển lâu dài, migrations và release](13-development-workflow.md)

[Bảng biến môi trường](ENVIRONMENT.md) · [Ảnh cần bổ sung](screenshots/README.md) · [Kết quả đã kiểm tra](../HANDOVER_VERIFICATION.md).

Mỗi hệ thống có bộ tài nguyên riêng: GitHub repository → Vercel project → Supabase project + Auth → Google service account → Spreadsheet. SMTP cấu hình trong Supabase. Production và staging phải có database, Sheet và secrets riêng. Đây là vai trò môi trường mới, không phải ID của chủ cũ.

Ảnh Dashboard chưa được chụp trực tiếp ghi **SCREENSHOT NEEDED**, không dùng ảnh giả. Menu có thể đổi tên; tham khảo liên kết chính thức ở từng chương. Đối chiếu tài liệu ngày 05/11/2026; chưa chứng nhận tài khoản cloud mới vận hành nếu chưa làm hết chương 10.
