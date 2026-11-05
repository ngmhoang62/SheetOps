# 2. Tạo GitHub repository độc lập

## Chọn đúng bản handover

Không clone mặc định main của repository gốc rồi coi đó là handover. Main gốc có thể là bản Production khác. Dùng ZIP người bàn giao cung cấp cùng **full SHA đã PASS CI** và SHA-256 của ZIP, hoặc checkout chính xác full SHA ấy. Nhánh handover chỉ ở repository nguồn để review; repository mới không cần nhánh đó.

Người bàn giao xuất ZIP bằng PowerShell sau khi CI của SHA được chốt đã PASS:

```powershell
$handoverSha = Read-Host 'Dan FULL SHA 40 ky tu tu bien ban ban giao da PASS CI'
if ($handoverSha -notmatch '^[0-9a-f]{40}$') { throw 'Can full commit SHA' }
git cat-file -e ($handoverSha + '^{commit}')
if ($LASTEXITCODE -ne 0) { throw 'Commit khong co trong repository nay' }
New-Item -ItemType Directory -Path output -Force | Out-Null
$zipPath = Join-Path 'output' ('sheetops-handover-' + $handoverSha + '.zip')
git archive --format=zip --output=$zipPath $handoverSha
if ($LASTEXITCODE -ne 0) { throw 'Xuat ZIP that bai' }
Get-FileHash -LiteralPath $zipPath -Algorithm SHA256
```

Thay giá trị nhập bằng **40 ký tự trong biên bản bàn giao**, không dùng HEAD và không suy ra từ nhánh đang mở. Đối chiếu với commit của run GitHub Actions thành công. Git archive chỉ lấy file đã commit ở SHA đó; vẫn kiểm tra danh sách ZIP vì file đã commit nhầm không được .gitignore loại bỏ. Source không cần .git, env riêng tư, node_modules, .vercel, backup hoặc output artifacts. Hồ sơ lịch sử có thể giữ ID công khai, không phải cấu hình cần dùng.

Nếu cần tải source Git để kiểm tra trước khi xuất, dùng thư mục mới và chọn nhánh rõ ràng:

```powershell
git clone --single-branch --branch codex/handover-clean-install https://github.com/SOURCE_OWNER/SOURCE_REPOSITORY.git sheetops-reviewed-source
Set-Location -LiteralPath sheetops-reviewed-source
$handoverSha = Read-Host 'Dan FULL SHA da PASS CI tu bien ban ban giao'
if ($handoverSha -notmatch '^[0-9a-f]{40}$') { throw 'Can full commit SHA' }
git switch --detach $handoverSha
if ($LASTEXITCODE -ne 0) { throw 'Khong checkout duoc SHA da chot' }
git rev-parse HEAD
```

SOURCE_OWNER/SOURCE_REPOSITORY là repository nguồn do bên bàn giao cung cấp, không phải tài khoản mặc định hoặc repository mới của người nhận. HEAD trong lệnh cuối chỉ để **đọc/xác nhận** SHA đã checkout, không dùng để chọn source xuất ZIP. Không đổi remote trong checkout chủ cũ.

## Tạo repository mới từ ZIP

1. Trên [GitHub](https://github.com/new): **+ → New repository**, Owner=người nhận, tên tùy chọn, chọn **Private**. Để trống README/.gitignore/license khi sẽ đẩy source có sẵn. Không cần env ứng dụng ở bước này.
2. So sánh SHA-256 ZIP với biên bản bằng Get-FileHash. Giải nén vào thư mục mới chưa có .git, mở PowerShell **tại thư mục có package.json/README**. Không giải nén đè vào checkout đang chứa credentials.
3. Chạy từng lệnh; nếu lỗi thì dừng. Trước commit phải cấu hình danh tính Git của người nhận (git config user.name / user.email nếu Git yêu cầu), không dùng danh tính chủ cũ. Thay YOUR_OWNER/YOUR_REPOSITORY bằng repository mới:

```powershell
git init -b main
git add .
git status --short
git commit -m "chore: initialize independent SheetOps installation"
git remote add origin https://github.com/YOUR_OWNER/YOUR_REPOSITORY.git
git remote -v
git push -u origin main
git switch -c dev
git push -u origin dev
git rev-parse main
git rev-parse dev
```

Main/dev lúc khởi tạo phải có cùng SHA; SHA commit mới khác SHA nguồn do lịch sử mới, nội dung vẫn là source ZIP. Không cần tạo nhánh codex/handover-clean-install ở repository mới. Đây là Git history **mới**, không rewrite lịch sử repository gốc. Nếu muốn giữ lịch sử cũ, nhờ người kỹ thuật clone đúng nhánh/SHA bàn giao trong thư mục riêng rồi push đúng SHA thành main của repository MỚI; không push main cũ theo thói quen. Fork vẫn giữ liên kết nguồn; ZIP + repository mới phù hợp khi muốn độc lập quản trị.

4. **Settings → Collaborators**: chỉ mời người tin cậy. **Actions**: bật workflow nếu cần; Application checks chạy trên main/dev. Branch rules main: yêu cầu PR và CI nếu gói cho phép. Không cần mua thêm gói tự động.

AGENTS.md đã trung lập tài khoản, mặc định dev/main và yêu cầu chủ mới duyệt cloud writes/release. Đọc [chương 13](13-development-workflow.md) trước khi giao Codex sửa tiếp. Chưa cần kết nối Vercel hoặc Supabase để CI code/migration Docker chạy.

**Xác minh:** origin/Owner thuộc người nhận, main/dev cùng nội dung, không secrets/artifacts, Actions không cần tài khoản cũ. **SCREENSHOT NEEDED:** screenshots/02-repository.png, repository mới và Actions.
