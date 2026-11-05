# 10. Nghiệm thu hệ thống mới

Dùng dữ liệu giả trên tài nguyên mới trước khi nhập dữ liệu thật. Lưu ngày, commit, môi trường và kết quả riêng; không tokens/password. Handover không thay thế nghiệm thu cloud này.

| Kiểm tra          | Thao tác                                          | Kết quả                                                      |
| ----------------- | ------------------------------------------------- | ------------------------------------------------------------ |
| Auth              | /orders khi chưa login; login/logout/refresh      | Redirect đúng; phiên bền; logout mất quyền                   |
| First Admin       | Bootstrap rồi thử lần hai                         | Active Admin, audit; lần hai bị từ chối                      |
| Import            | Source DEMO-001; Preview/Confirm khi Orders trống | 1 dòng, 0 lỗi, đơn xuất hiện; Source giữ nguyên              |
| CRUD              | Editor tạo DEMO-002 pending 200000, sửa completed | Refresh vẫn còn; audit tạo/sửa                               |
| Validation        | Mã trùng, 2026-02-30, tiền -1/1.5                 | Bị từ chối, không ghi dữ liệu sai                            |
| Dashboard/Reports | DEMO-001=100000 và DEMO-002=200000 completed      | Doanh thu 300000 cùng bộ lọc; pending/cancelled không tính   |
| Ẩn/restore        | Ẩn DEMO-002 rồi restore                           | Doanh thu 100000 rồi 300000; mã unique; audit                |
| Quyền             | Viewer gọi mutation, mở /users                    | Không ghi; API 403; không chỉ ẩn nút                         |
| Invitation        | Chương 9 với mailbox thật                         | Nhận thư/đặt password/login                                  |
| Disable           | Admin disable Viewer có phiên                     | Lần kiểm tra tiếp mất quyền                                  |
| Sheets            | Export Now, đọc Export_Orders                     | Đúng mã/ngày/tiền, không duplicate/bản ghi ẩn                |
| Cron              | Gọi không Bearer; quan sát lịch thật              | Unauthorized không export; cron run success đúng ngày        |
| Lỗi Sheets        | Chỉ staging: thu hồi Share, export                | Lỗi được ghi, DB/output trước không mất; khôi phục rồi retry |
| Responsive        | Laptop và viewport 390px                          | Login/orders/dashboard/sync, dialog dùng được                |

Cron có secret có thể GHI Sheet: chỉ thử môi trường mới đã xác nhận. Không gọi endpoint chủ cũ. Chờ lịch Production mới ngày tiếp và xem job_type/trigger_type/status/row_count. Endpoint local không chứng minh Vercel scheduler.

Kiểm tra code: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`. Migrations offline: Docker Server hoạt động, `$env:RUN_INSTALL_DB_TEST='1'` rồi `npm run test:install-db`. Bài này container network=none, giả lập phần tối thiểu Auth SQL; không chứng minh hosted Auth/PostgREST/SMTP.

Suite cloud/E2E tạo/xóa fixtures chỉ dùng staging dùng một lần, Sheet riêng và opt-in chương 11. Không chạy trên Production/staging giữ dữ liệu. Đọc script trước bật cờ. Không dùng kết quả cũ cho tài khoản mới.

**SCREENSHOT NEEDED:** `screenshots/10-uat.png`: dashboard giả, audit, sync và Sheet khớp. [Kết quả phiên bàn giao](../HANDOVER_VERIFICATION.md).
