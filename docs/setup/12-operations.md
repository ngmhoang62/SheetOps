# 12. Troubleshooting và vận hành

| Triệu chứng                   | Kiểm tra/xử lý                                                                                                        |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| 503 backend/môi trường        | APP_ENV đúng scope; production ref khai báo; URL/ref tương ứng; Production không có staging ref; build lại public env |
| Login không quyền             | Auth user đúng project, password/email confirmed, profile active; không gán user_metadata role                        |
| SQL missing relation/function | Đủ bảy migrations/thứ tự; không reset dữ liệu thật                                                                    |
| Sheets 403/404                | API enabled, email service account, Share Editor, file ID không phải gid                                              |
| PEM/private key lỗi           | private_key với header/footer/newline, không JSON hoặc file path                                                      |
| Import bị chặn                | Orders trống cả bản ghi ẩn; sửa preview lỗi; không xóa dữ liệu để ép import                                           |
| Invitation không tới          | SMTP logs, verified sender/SPF/DKIM, spam/rate limits; accepted khác delivered                                        |
| Redirect sai                  | APP_ORIGIN, Site URL/Redirect URLs, redeploy                                                                          |
| Cron không chạy               | Production Ready, job/limits, UTC, secret/sync_runs; Preview không tự cron                                            |
| Sync lỗi/running lâu          | Xem lịch sử/error; lease khoảng 10 phút; tránh retry đồng thời; đọc Sheet trước retry publish mơ hồ                   |
| Preview 429/challenge         | Dừng suite; không tăng concurrency hoặc lặp né bảo vệ                                                                 |
| Docker unavailable            | Mở Linux engine; docker version phải có Server; chưa có thì chưa xác minh DB/restore offline                          |

Hằng ngày kiểm tra sync/số dòng/lỗi Vercel và Supabase. Hằng tuần kiểm tra quota/dung lượng/backup ngoài Sheets. Nâng cấp: dev → staging dữ liệu giả → CI/UAT → owner review → main. Không tự áp migrations khi deploy hoặc seed Production.

Backup: [BACKUP_RESTORE](../BACKUP_RESTORE.md) ghi encryption/giới hạn. Copy `.env.backup.example` thành file riêng tư `.env.backup.local`: DATABASE_URL (Supabase **Connect → direct/session pooler**, port 5432) và NEXT_PUBLIC_PRODUCTION_SUPABASE_PROJECT_REF=ref mới. Percent-encode ký tự đặc biệt password; không transaction pooler 6543. `$env:RUN_DATABASE_BACKUP='1'` rồi `npm run backup:database`. Chỉ đọc DB/dump/encrypt; không restore cloud. Cần Docker/mạng. Lưu archive và key ở hai nơi riêng có kiểm soát quyền; output/backups bị ignore nhưng rất nhạy cảm. Encryption round trip/synthetic drill chưa chứng minh full Supabase/Auth restore; thử project phục hồi riêng trước nhận dữ liệu thật.

Rotation: tạo key mới → đổi cấu hình → redeploy → nghiệm thu → thu hồi cũ. Nghi lộ secret: thu hồi và kiểm tra audit. Không gửi logs có token lên issue công khai. Người nhận phải sở hữu và có recovery cho cả sáu dịch vụ.

**SCREENSHOT NEEDED:** `screenshots/12-operations.png`: vị trí logs/sync, không connection string hoặc backup key.
