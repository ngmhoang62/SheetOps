# Fresh installation verification — 05/11/2026

Kiểm tra local hoàn tất với kết quả dưới đây. Không dùng dữ liệu Production, không tạo dịch vụ cloud hoặc nâng billing.

## Phạm vi nghiệm thu

- Source-only copy trong output/handover-fresh-20261105: lấy file Git và các file handover mới, không .git, .env.local/.env.staging.local/.env.backup.local, node_modules cũ, .vercel hoặc browser artifacts. Chạy npm ci để tái tạo dependencies từ lockfile; không dùng credentials cũ.
- PostgreSQL 17 Docker dùng container tạm network=none, không host mounts/ports, schema ban đầu trống. Fixture chỉ tạo ba roles Supabase và auth.users/auth.uid() tối thiểu cần cho SQL. Không thay thế full Supabase/Auth/PostgREST.
- Chuỗi cả bảy migrations, RLS năm bảng, orders trống trước seed, bootstrap First Admin/audit, bootstrap lần hai bị chặn, BIGINT 9007199254740993 đọc nguyên chuỗi và audit đơn hàng. Nhánh hardening helper có/vắng được kiểm tra riêng.
- Local browser checks dùng cấu hình Supabase tổng hợp và server loopback, không gửi request Supabase/Google thật. Không gọi endpoint Production.

## Cloud cần người nhận xác minh

| Hạng mục                                         | Mức xác minh                                                                         |
| ------------------------------------------------ | ------------------------------------------------------------------------------------ |
| Hosted Supabase project mới / apply schema       | SQL migrations chạy local; chưa áp lên cloud mới                                     |
| Hosted Auth/session và First Admin qua Admin API | SQL bootstrap/guards kiểm thử; chưa chạy Auth thật với credentials mới               |
| CRUD/Dashboard/RBAC qua cloud                    | Unit/SQL và contracts; full cloud/browser flow chưa chạy                             |
| Sheets import/export, failure recovery           | Parser/snapshot/transaction tests và code guards; Google API tài khoản mới chưa chạy |
| SMTP invitation/inbox/password acceptance        | Code/tests và hướng dẫn; chưa xác minh delivery thật                                 |
| Vercel deployment/domain/cron scheduler mới      | Build và cron authentication tests; chưa deploy tài khoản mới/chờ lịch thật          |
| Full Supabase/Auth restore                       | Chưa chứng minh; synthetic drill/encryption không thay thế restore hoàn chỉnh        |

Không tái sử dụng credentials đang có chỉ để làm báo cáo PASS. Người nhận bắt buộc tạo tài nguyên/tài khoản riêng, điền secrets, chạy setup và checklist chương 10, chụp ảnh Dashboard thật, xác minh backup/restore trước vận hành dữ liệu thật.

## Rủi ro đã thấy

`npm ci` báo 8 vulnerabilities mức moderate và dependency deprecated. Giữ lockfile để tái lập, chưa chạy npm audit fix --force vì có thể đổi framework/nghiệp vụ ngoài phạm vi. `npm audit --omit=dev` báo 0 vulnerabilities; 8 moderate thuộc dependency graph công cụ phát triển. Guard dựa trên khai báo của người vận hành; khai báo sai identity đối chiếu không thể thay thế kiểm tra quyền sở hữu dịch vụ. Không hỗ trợ Supabase custom domains/local URL qua runtime guard hiện tại; dùng hosted URL chuẩn hoặc sửa validation có review riêng.

## Kết quả thực thi local

| Check                                             | Kết quả                                                                                                            |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| npm ci trong source-only copy                     | PASS, 519 packages; không mang credentials hoặc dependencies cũ                                                    |
| npm run lint                                      | PASS cả checkout và source-only copy                                                                               |
| npm run typecheck                                 | PASS cả checkout và source-only copy                                                                               |
| npm test                                          | PASS 14 files / 109 tests trong source-only copy                                                                   |
| npm run build                                     | PASS, đủ 30 static pages/routes; build root trỏ đúng source mới                                                    |
| npm run format:check                              | PASS                                                                                                               |
| npm run test:install-db                           | PASS cả 7 migrations, RLS, bootstrap/audit, duplicate guard, exact BIGINT; helper absent/present                   |
| Browser Chrome desktop 1440x1000 / mobile 390x844 | PASS login hiển thị đúng; /orders redirect /login khi chưa có phiên                                                |
| Browser network                                   | Chỉ local app/static; /api/session=401 khi chưa login là expected, không JS exception; không submit login tổng hợp |
| Cron không Bearer                                 | HTTP 401, không export                                                                                             |
| Production dependencies audit                     | 0 vulnerabilities; full dependency graph 8 moderate ở tooling dev                                                  |

Ảnh local được giữ tại docs/setup/screenshots/06-local-login*.png. Không dùng ảnh local để tuyên bố cloud Auth/SMTP/Sheets PASS. Docker và Chrome cần chạy ngoài Windows sandbox do quyền truy cập engine/crashpad; đây vẫn là container local network=none/browser loopback, không có kết nối dữ liệu Production. CI GitHub sẽ chạy lại các checks và database harness trên Ubuntu khi push nhánh handover; trạng thái run ghi nhận trong báo cáo bàn giao cuối.

## Đợt hoàn thiện bàn giao cuối

[Rà soát cuối](HANDOVER_FINAL_REVIEW.md) đối chiếu source commit GitHub, AGENTS trung lập, chương 13, Git/PowerShell và migration history. Các kết quả browser/audit dependencies phía trên là kết quả đợt kiểm tra trước, không được gắn nhãn kiểm tra cloud mới. Lần này chỉ thay tài liệu/policy; chạy lại checks code/build/migration từ snapshot Git sạch. Full SHA cuối, run CI và SHA-256 ZIP được ghi trong manifest/biên bản kèm bản giao để tránh tự tham chiếu SHA bên trong chính commit đó.
