# Audit bàn giao — 05/11/2026

Phạm vi: toàn bộ file Git quản lý và file bổ sung của nhánh handover; inventory riêng liệt kê từng file. Đã kiểm tra branches, scripts, tests, bảy migrations, cấu hình CI/deploy và các tài liệu. Không coi thư mục ignored chứa dữ liệu cá nhân là source bàn giao. Không truy cập hoặc ghi dữ liệu cloud trong audit này.

## Quyết định và lý do

| Nhóm     | Xử lý                                                                                                                                                                                                                                                  |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| KEEP     | Toàn bộ nghiệp vụ, route/API, UI, Phase 1 fixtures/history, bảy migrations, tests, rate limits, transactional audit/RLS/role guards, backup/restore tools. Không loại bỏ vì file cũ hoặc chỉ dùng khi bảo trì.                                         |
| REFACTOR | environment.ts, server/browser/proxy config, Sheets target guards; bootstrap/backup/staging loader; Preview/performance scripts; env examples; CI; test scope/TypeScript exclusions; README và ba trang setup cũ. Chi tiết bên dưới và trong Git diff. |
| ARCHIVE  | Bản README, DATABASE, DEPLOYMENT, STAGING_SETUP trước bàn giao nằm trong docs/archive. Bằng chứng release/performance/Phase 1–3 giữ tại chỗ, có banner lịch sử để không làm hỏng liên kết.                                                             |
| REMOVE   | Không xóa file Git quản lý. Artifacts ignored output/, .next/, node_modules/, .vercel/, .env*.local, browser profiles không nằm trong source export. Không dọn/xóa dữ liệu cá nhân trong các thư mục đó.                                               |

[Inventory từng file](HANDOVER_INVENTORY.md). Các file cấu hình/tests sửa nhằm giữ khả năng tái triển khai và chặn thao tác sai môi trường; không đổi quy tắc doanh thu, date validation, mã unique, permissions hoặc exact BIGINT.

## Hardcoded values và phụ thuộc đã xử lý

- environment.ts: bỏ fixed production Supabase ref, retired ref và Spreadsheet ID của chủ cũ; Production identity phải khai báo qua NEXT_PUBLIC_PRODUCTION_SUPABASE_PROJECT_REF/PRODUCTION_GOOGLE_SPREADSHEET_ID. Staging bắt buộc khác, URL/ref phải khớp HTTPS strict; Vercel scope phải khớp APP_ENV. Không còn fallback tới tài nguyên cũ.
- Browser client dùng public production ref được nhúng lúc build thay vì URL account cũ. Proxy/server/Sheets áp dụng guards tương ứng. Production không chấp nhận staging ref; Sheet Production phải khớp khai báo, staging không thể bằng Sheet Production.
- Backup target/manifest dùng ref khai báo trong .env.backup.local; vẫn kiểm tra direct/session pooler, user, password, port 5432, không nhận host tùy ý. Giữ encryption/verify và không tự restore.
- .env.backup.example bổ sung template backup không secret; BUSINESS_TIMEZONE cũ không được runtime sử dụng được bỏ khỏi examples/required config; UTC+7 là quy tắc hiện có, không đổi bằng biến env.
- .env.staging.example: xóa ref/Sheet/domain staging thật của chủ cũ, dùng placeholders rỗng. Không credentials trong examples.
- Preview/performance/product scripts: xóa domain cá nhân; online origin khai báo rõ, khác origin Production, giữ request budgets, local-only mutation và opt-in.
- Tests dùng định danh tổng hợp thay ID thật; mock email/domain không phải cấu hình tài khoản. AGENTS.md đã được chuẩn hóa trung lập tài khoản trong đợt rà soát cuối; định danh thật chỉ còn trong hồ sơ lịch sử/archive, không được source runtime/tooling dùng. Không xóa chứng cứ release hoặc thay đổi approval cũ.
- next.config.ts dùng process.cwd() cho build root, tránh nhận nhầm lockfile/dependencies của thư mục cha khi cài mới trong thư mục con. Không thêm đường dẫn máy cá nhân.
- tsconfig và Vitest giới hạn phạm vi source/test, tránh artifacts ignored và bản sao kiểm thử trong output tác động build/test.

## Lỗi migrations cài mới được phát hiện và sửa

Migration 20261102085245_phase2_hardening.sql thu hồi quyền public.rls_auto_enable() vô điều kiện. Hàm platform này không được migrations tạo và không hiện diện trên PostgreSQL thử nghiệm trống; chuỗi cài mới dừng ở file thứ ba. Đổi **riêng lệnh REVOKE** sang DO/to_regprocedure có điều kiện. Nếu hàm có thì vẫn thu hồi EXECUTE của PUBLIC/anon/authenticated; nếu không thì bỏ qua. Không tạo helper giả trong schema production, không bỏ security guard và không đổi version/tên migration.

Đây là chỉnh sửa tương thích cài mới trong migration lịch sử, không phải chỉ dẫn chạy lại migration đã áp dụng. Database đã ghi nhận version đó không cần chạy lại; lưu ý checksum của file thay đổi khi so sánh với bản cũ. Test offline xác nhận cả hai trường hợp helper vắng/có. Không đẩy thay đổi nào vào schema Production hiện tại.

## Branch và delivery

Nhánh riêng codex/handover-clean-install từ dev; khi bắt đầu main và dev cùng commit 2a8aaae, không có thay đổi local. Giữ origin và lịch sử, không force-push, không xóa remote branches, không merge/release. CI mở thêm push nhánh handover và PR vào dev, giữ main/dev checks. Push nhánh handover có thể kích hoạt Vercel Preview theo integration hiện có; không thay đổi Production branch, settings, secrets hoặc data. Môi trường Preview thiếu cấu hình mới sẽ fail closed, không fallback Production.

## Tài liệu và giới hạn

README tiếng Việt dẫn đến docs/setup với 13 chương, bảng env public/secret/local/Vercel, placeholders screenshot, mẫu Source_Orders, quy trình First Admin/SMTP/cron/backup/staging, checklist UAT và tạo repository mới. Không dựng ảnh Dashboard. [Kết quả xác minh](HANDOVER_VERIFICATION.md) phân biệt local SQL/code với dịch vụ cloud thật.

Source export vẫn có lịch sử triển khai và ID công khai, không đồng nghĩa đã kiểm toán/xóa secrets khỏi toàn bộ Git history. Bàn giao độc lập nên dùng git archive của commit đã kiểm tra; không copy .git hoặc ignored files. Chưa có license chuyển giao quyền sở hữu trí tuệ riêng; người bàn giao/người nhận cần thống nhất quyền sử dụng và quyền chia sẻ trước khi công khai repository.

Rà soát cuối của source GitHub, chính sách agent và vòng phát triển/migration dài hạn: [HANDOVER_FINAL_REVIEW](HANDOVER_FINAL_REVIEW.md).
