# SheetOps

Website quản lý đơn hàng, báo cáo doanh thu và đồng bộ Google Sheets. Giao diện tiếng Việt; PostgreSQL là nguồn dữ liệu chính, Supabase Auth quản lý đăng nhập và quyền Admin/Editor/Viewer.

**Không lấy main mặc định của repository gốc làm bản handover:** dùng ZIP/full SHA đã PASS CI trong biên bản bàn giao, theo [chương 2](docs/setup/02-github.md). Repository mới khởi tạo main/dev trực tiếp từ ZIP, không cần nhánh handover.

**Bắt đầu bàn giao:** [Cài mới độc lập — 13 chương](docs/setup/README.md). Dùng tài khoản, repository, database, Spreadsheet và secrets của người nhận.

1. Cài Node.js 24/Git; tạo repository riêng.
2. Tạo Supabase trống, chạy đủ migrations; cấu hình Google Sheets/SMTP.
3. Chép [.env.example](.env.example) thành `.env.local`, điền theo [bảng biến môi trường](docs/setup/ENVIRONMENT.md).
4. `npm ci`, khởi tạo First Admin, rồi `npm run dev`.
5. Deploy lên Vercel mới và làm [checklist nghiệm thu](docs/setup/10-verification.md).

Không demo login/seed tự động. `npm run seed:preview` chỉ in dữ liệu giả, không ghi database. Cloud tests chỉ dành cho staging độc lập không có dữ liệu thật.

| Lệnh                                              | Mục đích                                             |
| ------------------------------------------------- | ---------------------------------------------------- |
| `npm run dev`                                     | Local http://localhost:3000                          |
| `npm run admin:bootstrap`                         | Cấp First Admin cho Auth UUID đã tạo                 |
| `npm run lint` / `npm run typecheck` / `npm test` | Kiểm tra code                                        |
| `npm run build` / `npm start`                     | Build/chạy production local                          |
| `npm run test:install-db`                         | Migrations trên Docker PostgreSQL cô lập, cần opt-in |
| `npm run build:staging` / `npm run start:staging` | Local cấu hình staging riêng                         |

Source: `src/app` (trang/API), `src/lib` (nghiệp vụ/validation), `src/lib/server` (dịch vụ tin cậy), `supabase/migrations` (schema/RLS/audit), `scripts`/`tests` (vận hành/kiểm thử).

[Rà soát cuối](docs/HANDOVER_FINAL_REVIEW.md) · [Audit và phân loại file](docs/HANDOVER_AUDIT.md) · [Fresh installation verification](docs/HANDOVER_VERIFICATION.md) · [PRD](docs/PRD.md) · [Kiến trúc](docs/ARCHITECTURE.md) · [API](docs/API.md) · [Lịch sử](docs/archive/README.md).

Nhánh handover không tự phát hành vào hệ thống hiện tại. Release Production cần chủ sở hữu phê duyệt riêng. Giữ lịch sử Phase 1, migrations, tests, security guards và backup tooling.
