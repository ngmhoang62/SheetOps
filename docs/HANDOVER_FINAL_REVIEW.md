# Rà soát bản bàn giao cuối — 05/11/2026

## Nguồn được kiểm tra

Điểm bắt đầu là commit **68b040871ba0acca9c182173e128e8e5321873cb** đã push lên nhánh codex/handover-clean-install. Đã lấy cây file qua GitHub API và đối chiếu từng Git blob với commit local: **186/186 file khớp**, không khác biệt. Rà soát chỉ dùng file của commit đó; các .env riêng tư, .vercel, dependencies, backup, output và browser artifacts trên máy không phải bằng chứng cấu hình/source. Mã commit cuối và CI cuối được ghi trong biên bản/manifest đi kèm ZIP, không dùng HEAD ngầm định để chọn source.

## Thay đổi sau rà soát

- AGENTS.md viết lại cho chủ mới, không project ID, domain, email hay quyền release kế thừa. dev/main là mặc định; chuẩn bị/push code không cho phép merge, deploy Production, ghi SQL cloud, repair history hay sửa dữ liệu thật. Giữ RLS, audit, exact BIGINT, migrations, backup, checks và khối hướng dẫn Next.js.
- Chương 13 giải thích thuật ngữ, cách giao việc Codex, Git/PR/Preview, migration mới, nâng cấp trên dữ liệu giả có sẵn, backup, owner approval và khôi phục không phá dữ liệu. CLI cố định 3.0.0 theo help thực tế; không dùng cờ --linked từ ví dụ cũ. Chưa login/link/apply/repair cloud trong phiên này.
- Chương 2 chọn full SHA đã PASS CI, kiểm tra exit code trước export, tránh nhầm main gốc hoặc nhánh đang mở. Repository mới có thể khởi tạo main/dev từ ZIP và không cần nhánh handover. Danh tính Git của người nhận phải do họ thiết lập, không kế thừa danh tính máy chủ cũ.
- ARCHITECTURE/RELEASE_PROCESS hiện hành trung lập tài khoản. Bản trước được lưu trong archive; các hồ sơ security/backup/runbook/limitations/Phase 1 được gắn cảnh báo lịch sử, không chứng nhận cấu hình cloud/backup automation của chủ mới.
- README/setup index có 13 chương; chapter 3 dẫn đến quy trình đối chiếu history sau SQL Editor. Screenshot Dashboard thiếu vẫn SCREENSHOT NEEDED.
- Không thay đổi src/, scripts/, tests/, migrations, dependencies hoặc logic nghiệp vụ trong đợt hoàn thiện cuối này.

## Các giả định còn cần người nhận cung cấp

1. Tài khoản, quota, SMTP sender/domain có quyền DNS khi nhà cung cấp yêu cầu; credentials và identity từng môi trường do người nhận nhập. Ví dụ và guards không cấp quyền sở hữu cloud.
2. Node/npm theo package.json, Git và Docker Server hoạt động. Image PostgreSQL cần được tải; container SQL test dùng network=none, không kết nối Supabase. Các suite browser/cloud khác có prerequisites riêng, không bắt buộc cho CI code.
3. Source mặc định runtime dùng Supabase hosted URL chuẩn; không tự hỗ trợ custom Supabase domain/local URL. Múi giờ nghiệp vụ UTC+7 và region triển khai mặc định là lựa chọn thiết kế, không phải ràng buộc tài khoản cũ.
4. Tài liệu lịch sử/archive vẫn có ID/domain/đường dẫn cũ để bảo toàn bằng chứng. Chúng không được runtime, env examples hoặc chính sách agent hiện hành dùng. Không thực hiện chỉ dẫn vận hành lịch sử trên tài nguyên đó.
5. Không chuyển theo backup, lịch tự động trên máy, quyền branch protection, tài khoản cloud hoặc secrets của chủ cũ. Chưa có kiểm toán toàn bộ Git history về secrets; ZIP không bao gồm .git. Các bên tự thống nhất quyền sử dụng source trước khi công khai.

## Phạm vi kiểm chứng

CI chạy source đã commit trên runner sạch: npm ci, formatting, lint, typecheck, 109 unit tests, build và migration harness PostgreSQL. Harness kiểm tra chuỗi bảy migrations, RLS, SQL First Admin/audit, chặn bootstrap trùng, exact BIGINT và helper có/vắng. Không chạy migrations lên Supabase thật. Chỉ khi run của **đúng SHA cuối** thành công mới xuất ZIP giao chính thức.

Kiểm tra tài liệu gồm link nội bộ, cú pháp các block PowerShell, help CLI và thao tác Git trong repository tạm độc lập. Việc main/dev của bản sao mới được tạo/đối chiếu không tác động các nhánh cùng tên của repository gốc. Kết quả và checksum nằm trong manifest bàn giao cuối; không phải cam kết rằng tài khoản mới đã deploy thành công.

Cloud vẫn cần người nhận tự nghiệm thu: hosted Auth/PostgREST, invitations và inbox SMTP, CRUD/dashboard với các roles thực, Sheets import/export, Preview/Production environment settings, lịch cron thật và full Supabase/Auth restore. Ảnh login local và kết quả CI không thay thế các bước đó. Cảnh báo dependencies và giới hạn restore ở [verification](HANDOVER_VERIFICATION.md) vẫn áp dụng.
