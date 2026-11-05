# Danh sách ảnh hướng dẫn cần bổ sung

Các mục Dashboard dịch vụ dưới là **SCREENSHOT NEEDED**. Ảnh local login desktop/mobile đã chụp thật ngày 05/11/2026 bằng cấu hình tổng hợp, chưa đăng nhập cloud. Chưa có ảnh Dashboard xác thực của tài khoản người nhận; không dùng ảnh mô phỏng. Chủ sở hữu mới hoặc người được cấp quyền chụp sau khi setup, đặt PNG tại đúng đường dẫn và thêm caption ngày chụp/tài khoản môi trường đã che thông tin riêng. Không chụp secrets, passwords, tokens, private key, invite URL đầy đủ, recovery codes hoặc dữ liệu khách hàng thật.

| File cần cung cấp                              | Caption/nội dung                                                   |
| ---------------------------------------------- | ------------------------------------------------------------------ |
| 01-accounts.png                                | Đăng nhập Dashboard bằng tài khoản người nhận                      |
| 02-repository.png                              | Owner/repository mới và Actions                                    |
| 03-supabase.png                                | Ref, năm bảng/RLS, Auth URL config; che keys                       |
| 04-service-account.png                         | Sheets API enabled và service account email/Keys menu              |
| 05-spreadsheet.png                             | Ba tabs, Source headers, quyền Editor service account              |
| 06-local-login.png + 06-local-login-mobile.png | ĐÃ CÓ: login local desktop/mobile, không phải bằng chứng Auth thật |
| 07-vercel.png                                  | Repository import, scope biến đã che values, domain/Ready/cron     |
| 08-admin.png                                   | Vị trí Copy UID và Admin đăng nhập                                 |
| 09-invitation.png                              | SMTP labels đã che values, inbox/acceptance đã che token           |
| 10-uat.png                                     | Dashboard/audit/sync/Sheet dữ liệu giả khớp                        |
| 11-staging.png                                 | Preview/Production scopes và tài nguyên độc lập                    |
| 12-operations.png                              | Vị trí logs và sync history                                        |

Có thể chia một mục thành nhiều ảnh khi không đọc được ở kích thước hợp lý. Caption phải nêu rõ môi trường. docs/screenshots cũ là bằng chứng UI lịch sử, không phải ảnh Dashboard của hệ thống mới.

**SCREENSHOT NEEDED:** `13-development-workflow.png` — PR dev→main, CI đúng full SHA, migration history/dry run của tài khoản mới; che secrets và dữ liệu thật.
