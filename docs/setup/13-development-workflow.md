# 13. Phát triển và vận hành lâu dài với Codex

Chương này áp dụng cho repository và tài nguyên của **người nhận mới**. Không thực hiện các lệnh ghi cloud chỉ để đọc hướng dẫn. Mọi merge/release Production, áp SQL hoặc sửa dữ liệu thật cần chủ sở hữu mới duyệt đúng commit, môi trường và danh sách thay đổi. Có thể nhờ Codex chuẩn bị và giải thích trước, chỉ thực thi sau khi duyệt.

## 13.1. Những từ cần hiểu

| Từ                | Ý nghĩa và ví dụ                                                                                   |
| ----------------- | -------------------------------------------------------------------------------------------------- |
| Repository        | Thư mục source có lịch sử trên GitHub, như một hồ sơ dự án                                         |
| Commit / SHA      | Một bản ghi thay đổi / mã nhận diện chính xác của nó; SHA đầy đủ có 40 ký tự                       |
| Branch            | Một dòng phát triển; dev để sửa thử, main phục vụ website thật                                     |
| PR (Pull Request) | Đề nghị đưa thay đổi từ dev vào main để chủ sở hữu đọc và duyệt                                    |
| Merge             | Kết hợp thay đổi hai nhánh; nếu Vercel nối main, merge có thể tự deploy Production                 |
| Preview / staging | Website thử / database và Sheet thử riêng; tên Preview không tự bảo đảm dữ liệu được cô lập        |
| Schema            | Cấu trúc dữ liệu: bảng giống danh sách đơn; cột giống ô “ghi chú” của mỗi đơn                      |
| Migration         | File SQL đánh số theo thời gian, như phiếu hướng dẫn đổi cấu trúc có lịch sử                       |
| Migration history | Sổ ghi database đã áp dụng migration nào; khác với các file migration trong Git                    |
| Drift             | Database thực khác cấu trúc đã ghi trong source, ví dụ thêm cột bằng Dashboard nhưng không lưu SQL |
| Backup / restore  | Bản sao dữ liệu / đưa bản sao vào môi trường phục hồi; không đồng nghĩa nút Undo                   |
| Rollback code     | Quay về bản code tương thích trước đó; không tự xóa cột, đảo migration hoặc khôi phục dữ liệu      |

## 13.2. Yêu cầu Codex sửa tính năng

Mở đúng thư mục repository mới trong Codex. Đọc README; kiểm tra `git remote -v` thuộc người nhận. Không gửi password, file JSON key hoặc toàn bộ .env vào chat.

Ví dụ yêu cầu tốt:

> Đọc AGENTS.md và tài liệu setup. Trên dev, bổ sung bộ lọc theo khách hàng ở danh sách đơn hàng. Giữ nguyên cách tính doanh thu và quyền Admin/Editor/Viewer. Nêu file cần sửa, có cần migration không và cách kiểm thử. Chỉ sửa/commit/push dev; không merge main, deploy Production, áp SQL cloud hoặc sửa dữ liệu thật. Khi xong đưa SHA, kết quả CI và kế hoạch release để tôi duyệt.

Với schema, bổ sung: “Chuẩn bị SQL migration và kế hoạch backup/khôi phục; chỉ chạy test Docker cục bộ. Tôi sẽ duyệt riêng trước khi áp staging/Production.” Nếu Codex đề nghị thao tác chưa rõ, yêu cầu giải thích thay đổi nào có thể ảnh hưởng dữ liệu, thay vì trả lời chung chung “cứ làm hết”.

Trước khi bắt đầu, PowerShell tại repository mới:

```powershell
git status --short --branch
git remote -v
git fetch origin
git switch dev
git pull --ff-only origin dev
```

Nếu có file đang sửa, dừng và nhờ Codex giải thích/giữ lại chúng. Không `reset --hard`, không ghi đè khi pull lỗi. `--ff-only` từ chối cập nhật khi lịch sử đã tách nhánh để bạn xử lý có kiểm soát. Các lệnh trong chương phải chạy từng bước; thấy lỗi thì dừng, không dán chạy tất cả.

## 13.3. Vòng sửa code trên dev

1. Mô tả hiện trạng, điều muốn đổi, ví dụ đầu vào/kết quả và điều cần giữ. Codex phân biệt đổi giao diện, nghiệp vụ hay schema.
2. Sửa trên dev hoặc nhánh tính năng được chủ sở hữu yêu cầu. Kiểm tra `git diff` và `git status`; không stage secrets/artifacts.
3. Chạy kiểm tra, đọc kết quả. Lệnh migration test chỉ tạo PostgreSQL Docker cục bộ, không áp cloud:

```powershell
npm ci
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
$env:RUN_INSTALL_DB_TEST = '1'
npm run test:install-db
Remove-Item Env:RUN_INSTALL_DB_TEST
```

`npm ci` cài đúng lockfile; không tự nâng framework để sửa một tính năng nhỏ. Docker Server cần hoạt động và tải image PostgreSQL khi cần. Harness chạy tất cả migrations và SQL fixtures; không thay thế test hosted Supabase. Với schema mới, bổ sung kiểm tra quyền/audit/giá trị của thay đổi mới; test tạo schema từ trống chưa chứng minh nâng cấp database đã có dữ liệu. 4. Codex stage đúng file, commit mô tả rõ rồi push dev khi được yêu cầu. GitHub → **Actions → Application checks**: xem đúng SHA, không chỉ dấu xanh của commit cũ. 5. Preview phải dùng `.env.staging.example` và tài nguyên riêng theo [chương 11](11-staging.md). Vercel tự deploy sau push nếu integration bật; không thêm credentials Production vào scope Preview.

## 13.4. Thêm cột/bảng và tạo SQL migration

Không sửa cấu trúc Production trực tiếp bằng Table Editor. Ví dụ muốn thêm “mã tham chiếu ngoài” vào đơn: thêm cột nullable trước để code cũ vẫn chạy được; sau đó code mới có thể dùng. Chỉ đặt NOT NULL sau khi đã có kế hoạch kiểm tra và điền dữ liệu cũ được duyệt. Không đổi kiểu BIGINT sang số thực để tiện hiển thị.

Ví dụ minh họa sau **không phải migration có sẵn và không được áp nếu chưa có yêu cầu tính năng**:

```sql
alter table public.orders add column external_reference text;
```

File SQL thật phải do Codex chuẩn bị với giải thích lock/thời gian chạy, tương thích code cũ, rollback, quyền, audit và kiểm tra dữ liệu. Thêm bảng mới cần RLS, grants tối thiểu, policies đúng roles, transactional audit cho mutations, validation và API server; không sao chép policy `using (true)` để hết lỗi quyền. Thêm bảng không tự có màn hình sử dụng.

Các lệnh CLI dưới cố định **Supabase CLI 3.0.0**, đã đối chiếu `--help` khi bàn giao. Không trộn cờ CLI 2.x (`--linked`) với 3.x (`--remote`). Khi đổi phiên bản cần đọc lại help; tài liệu trực tuyến có thể chưa đồng bộ phiên bản. Không dùng `--yes`, `--include-all`, `--include-seed` để vượt cảnh báo.

```powershell
npx --yes supabase@3.0.0 --version
npx --yes supabase@3.0.0 migration new --help
npx --yes supabase@3.0.0 migration new add_order_external_reference
```

`--yes` ở đây là cờ **npx** cho phép tải đúng CLI package, không phải cờ đồng ý ghi database của Supabase. `migration new` chỉ tạo file local dạng timestamp_name.sql. Nếu CLI cần config.toml và source chưa có, chạy `npx --yes supabase@3.0.0 init` sau khi xác nhận chưa có config; không dùng `--force`. Review config phát sinh: không secrets/ref tài khoản và không cấu hình seed/vault ngoài phạm vi. Commit cấu hình cần cho nhóm phát triển theo review, giữ `.temp` ngoài Git.

Viết SQL vào file mới, giữ migrations cũ nguyên vẹn sau khi đã áp; kiểm tra thứ tự timestamp, không trùng version. Lưu file với UTF-8, kiểm tra diff, commit cùng code/test/docs. Migrations đã áp ở một môi trường được sửa bằng migration **mới**, không lặng lẽ sửa file cũ. Không gom/xóa bảy migrations cài đầu để “dọn lịch sử”.

## 13.5. Migration history sau cài đầu bằng SQL Editor

SQL Editor chạy câu SQL, nhưng không tự ghi tương ứng vào sổ migration của CLI. Vì vậy database đã có bảng vẫn có thể bị CLI coi là chưa chạy file nào. Chạy `db push` ngay lúc này có thể cố tạo lại bảng và lỗi. **Sổ trống không có nghĩa database trống.**

Sau lần cài đầu, lưu nhật ký riêng cho từng môi trường: tên môi trường, full source SHA, tên/version từng file, SHA-256 file, thời điểm, người chạy, kết quả SQL, backup và phê duyệt. Không dùng “có 5 bảng” làm bằng chứng toàn bộ functions/indexes/RLS/grants đúng. Lấy hash bằng:

```powershell
Get-ChildItem -LiteralPath supabase/migrations -Filter *.sql |
    Sort-Object Name |
    Get-FileHash -Algorithm SHA256
```

Không commit bản ghi chứa dữ liệu thật/secrets. Bảng theo dõi có thể đặt trong kho vận hành riêng. Chọn một trong hai cách quản lý từ đó:

**Cách A — tiếp tục SQL Editor có kiểm soát:** chỉ chạy file mới chưa ghi trong nhật ký môi trường, giữ nguyên SQL đã review và lưu kết quả ngay. Không chạy `db push` song song. Có người kỹ thuật kiểm tra drift định kỳ; thiếu bằng chứng thì dừng, không đoán version. Đây là cách thủ công cần kỷ luật, không có tự động chống chạy trùng như CLI.

**Cách B — chuyển sang CLI quản lý history (nên có người kỹ thuật hỗ trợ):** thực hiện từng môi trường riêng, staging trước, Production chỉ sau phê duyệt riêng:

1. Backup; lưu nhật ký SQL Editor và schema hiện tại. Người kỹ thuật đối chiếu đủ SQL đã chạy với migrations của SHA đang dùng: bảng/cột/kiểu/constraints, functions, views, triggers, grants và RLS. Nếu file đã đổi so với lần cài hoặc có thao tác Dashboard ngoài nhật ký, xác định drift trước; không sửa history để che lỗi.
2. CLI không đọc `.env.local` của website để tự chọn project. Đăng nhập tài khoản mới (`npx --yes supabase@3.0.0 login`), chọn đúng môi trường bằng ref từ Dashboard. Lệnh sau chỉ chuẩn bị liên kết local, không áp schema; không copy ref từ hồ sơ cũ:

```powershell
$targetRef = Read-Host 'Nhap ref Supabase cua moi truong da duoc duyet'
if ($targetRef -notmatch '^[a-z]{20}$') { throw 'Ref khong hop le' }
npx --yes supabase@3.0.0 link --project-ref $targetRef
npx --yes supabase@3.0.0 migration list --remote=$targetRef
```

Sau mỗi lệnh kiểm tra exit code/kết quả và target hiển thị. Không đưa database password vào command line; dùng cơ chế prompt/secret riêng phù hợp CLI. `.temp` lưu liên kết local, không commit. Việc website đang ở staging không chứng minh CLI đang trỏ staging.

3. Chỉ sau khi chủ sở hữu duyệt **sửa history**, đánh dấu đúng các version đã kiểm chứng là thực sự áp dụng. Ví dụ placeholder, không phải lệnh chạy ngay:

```powershell
$appliedVersion = Read-Host 'Nhap 14 chu so version DA DUOC DOI CHIEU SQL VA DUYET'
if ($appliedVersion -notmatch '^\d{14}$') { throw 'Version khong hop le' }
npx --yes supabase@3.0.0 migration repair $appliedVersion --status applied --remote=$targetRef
npx --yes supabase@3.0.0 migration list --remote=$targetRef
```

`repair --status applied` **chỉ ghi history, không chạy SQL và không sửa schema**. Làm từng version được xác nhận, không quét tất cả file rồi đánh dấu hàng loạt. Nếu mới cài đúng bảy file chương 3 thì đối chiếu đúng bảy version đó; không đánh dấu migration phát triển sau này chưa chạy. Không tự INSERT/DELETE bảng `supabase_migrations.schema_migrations` hoặc dùng `--status reverted` để ép chạy lại SQL.

4. Chạy dry run và xem chính xác các file còn chờ:

```powershell
npx --yes supabase@3.0.0 db push --remote=$targetRef --skip-vault --dry-run
```

Khi chỉ có các migration mới dự định, review danh sách cùng chủ sở hữu. Nếu bảy file cài đầu vẫn xuất hiện hoặc có version lạ thì dừng; không dùng include-all để vượt qua. Giữ một cơ chế áp SQL chính từ đây; không vừa chạy SQL Editor vừa để CLI áp lại cùng file. [Tài liệu history repair](https://supabase.com/docs/reference/cli/supabase-migration-repair).

## 13.6. Backup và áp migration được duyệt

Trước thay đổi cloud schema, xác định target, backup và kế hoạch nâng cấp. Copy `.env.backup.example` thành file backup riêng tư theo [chương 12](12-operations.md); ref trong file phải khớp database thật. Chỉ đọc backup chưa thay đổi dữ liệu, nhưng dữ liệu xuất ra vẫn nhạy cảm và phải được chủ sở hữu cho phép truy cập.

```powershell
$env:RUN_DATABASE_BACKUP = '1'
npm run backup:database
Remove-Item Env:RUN_DATABASE_BACKUP
```

Kiểm tra lệnh exit 0, archive/manifest có đủ schemas và digest; chuyển archive/key sang hai vị trí riêng được bảo vệ. Không xóa backup cũ. Script xác minh archive listing/encryption, chưa chứng minh full Auth restore. Kiểm tra phục hồi trên target riêng và mức mất dữ liệu chấp nhận được trước vận hành thật. Nếu không tạo/đọc được backup, dừng release; không coi Google Sheets là database backup.

Đối với staging, chỉ áp sau khi chủ sở hữu duyệt target staging/danh sách migrations. Đối với Production, cần phê duyệt Production riêng cho đúng commit và backup; chuẩn bị thời điểm tránh ghi đồng thời khi migration yêu cầu. Nếu đã chuyển history sang CLI:

```powershell
# Chi chay SAU phe duyet cho dung $targetRef va danh sach dry-run.
npx --yes supabase@3.0.0 db push --remote=$targetRef --skip-vault
npx --yes supabase@3.0.0 migration list --remote=$targetRef
```

`--skip-vault` giới hạn thao tác này vào migrations, không tự cập nhật Vault từ config. Không thêm seed/roles tùy tiện. Nếu còn dùng cách A thì SQL Editor chỉ chạy nguyên file mới đã review, lưu nhật ký ngay; không repair history khi chưa quyết định chuyển cách B. Kiểm tra dữ liệu, RLS, audit, số dòng và chức năng liên quan sau khi áp.

## 13.7. Preview → PR → Production

1. Push dev, xem đúng SHA ở GitHub Actions và Vercel Preview; xác nhận biến backend/Sheet thuộc staging. Test bằng dữ liệu giả, đủ roles, validation/audit, import/export nếu thay đổi liên quan; không chạy fixture cleanup trên staging có dữ liệu giữ lại.
2. GitHub repository mới → **Pull requests → New pull request**, base=main, compare=dev. Nội dung: vấn đề/kết quả, SHA, CI, test thủ công, migrations, backup, thứ tự deploy, giới hạn và rollback candidate. Không bật auto-merge.
3. Chủ sở hữu đọc diff và duyệt đúng SHA. Nếu dev thêm commit, kiểm tra và duyệt lại. Dấu CI xanh không phải quyền merge hoặc áp migration. Khi Vercel nối main, bấm merge đồng thời cho phép kích hoạt deploy Production; phê duyệt phải tính cả việc này.
4. Nếu migration cộng thêm tương thích code cũ: backup → migration Production được duyệt → xác minh schema → merge code/redeploy được duyệt. Nếu không tương thích: cần kế hoạch bảo trì/chuyển tiếp riêng; không đoán thứ tự. Không để Vercel tự chạy migrations trong Build Command.
5. Sau merge: Vercel deployment phải đúng Git commit mới, Ready và scope Production đúng tài nguyên. Chủ sở hữu kiểm thử cloud theo [chương 10](10-verification.md), theo dõi errors/sync/cron thật. Dữ liệu test trên Production cũng là ghi dữ liệu thật, cần duyệt riêng; ưu tiên smoke chỉ đọc.
6. Sau release, đồng bộ merge commit về dev để tránh lịch sử lệch. Chỉ chạy khi ở repository mới và các nhánh sạch:

```powershell
git fetch origin
git switch dev
git pull --ff-only origin dev
git merge origin/main
# Dung neu co conflict; review ket qua va chay checks truoc khi push.
git push origin dev
```

Không force-push để làm hai nhánh “giống nhau”. Nếu không có thay đổi cần merge, Git báo đã cập nhật là bình thường. [Quy trình release tóm tắt](../RELEASE_PROCESS.md).

## 13.8. Rollback và migration thất bại

**Code lỗi:** dừng thay đổi tiếp, ghi nhận deployment/commit lỗi, giữ logs đã che secrets. Chủ sở hữu chọn bản code trước **còn tương thích schema hiện tại**; duyệt việc rollback. Có thể redeploy/promote deployment cũ qua Vercel sau duyệt hoặc tạo PR revert trên dev rồi review/merge. Không force-reset main. Rollback deployment không sửa Git history; cần PR hoàn tác sau đó để lần push tiếp không deploy lại lỗi. Không copy bundle Preview staging lên Production.

**Migration báo lỗi:** không chạy lại liên tục. Lưu file/version/SQL error/target và kiểm tra migration history cùng schema thực. SQL Editor hoặc SQL có thao tác ngoài transaction có thể áp một phần; timeout chưa chứng minh câu SQL chưa chạy. SQL trong một transaction chỉ rollback khi transaction đó thực sự thất bại; không suy ra mọi file/mọi công cụ đều tự có transaction.

- Nếu chưa có hiệu ứng nào và nguyên nhân đã rõ, người kỹ thuật chuẩn bị cách chạy lại, staging kiểm tra rồi chủ sở hữu duyệt. Không xóa history tùy tiện.
- Nếu áp một phần hoặc mất kết nối không biết kết quả, dừng writers khi được duyệt, kiểm tra columns/indexes/constraints/functions/grants/dữ liệu. Chuẩn bị migration sửa tiến lên và đồng bộ history theo bằng chứng. Nếu migration chưa áp ở bất kỳ môi trường nào, có thể sửa file chưa áp sau review; nếu đã áp nơi khác thì giữ file đó và chuẩn bị cách phục hồi riêng/migration mới. Không giả vờ đã áp để CI xanh.
- Nếu schema đã đổi thành công nhưng code lỗi, giữ schema cộng thêm nếu code cũ vẫn chạy; ưu tiên revert code. DROP cột để “undo” sẽ mất dữ liệu, không phải rollback an toàn.
- Nếu cần phục hồi dữ liệu: restore backup vào **target riêng**, kiểm tra Auth/RLS/audit/số tiền và đối soát mọi giao dịch sau thời điểm backup. Chủ sở hữu duyệt trước cutover. Không ghi đè database đang chạy bằng snapshot cũ hoặc khôi phục riêng Orders mà bỏ users/audit/sync.

**SCREENSHOT NEEDED:** `screenshots/13-development-workflow.png`: PR dev→main, CI đúng SHA, migration list/dry run đã che thông tin nhạy cảm. Chưa chụp Dashboard tài khoản mới; ví dụ SQL và CLI help không phải bằng chứng cloud đã chạy.
