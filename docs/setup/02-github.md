# 2. Tạo GitHub repository độc lập

1. Trên [GitHub](https://github.com/new): **+ → New repository**, Owner = người nhận, tên tùy chọn, chọn **Private**. Để trống README/.gitignore/license khi sẽ đẩy source có sẵn. Không dùng env ứng dụng ở bước này.
2. Người bàn giao xuất ZIP từ commit handover bằng `git archive --format=zip --output=sheetops-handover.zip HEAD`. Chỉ lấy file đã commit, không gồm .env.local, node_modules, .vercel, output hoặc .git. Kiểm tra ZIP trước chia sẻ. ZIP vẫn có tài liệu lịch sử và ID không bí mật như báo cáo audit. Không chép cả thư mục đang chứa secrets.
3. Giải nén vào thư mục mới. Mở PowerShell tại đó, thay placeholder bằng repository mới:

```powershell
git init -b main
git add .
git commit -m "chore: initialize independent SheetOps installation"
git remote add origin https://github.com/YOUR_OWNER/YOUR_REPOSITORY.git
git push -u origin main
git switch -c dev
git push -u origin dev
```

Đây là repository mới với lịch sử mới; không rewrite lịch sử repository gốc. Muốn giữ toàn bộ lịch sử: clone trong thư mục riêng, đổi origin sang repository mới, push nhánh bàn giao thành main của repository MỚI. Không đổi remote trong checkout chủ cũ. Fork giữ liên kết nguồn; ZIP + repository mới phù hợp khi muốn độc lập quản trị.

4. Repository mới → **Settings → Collaborators**: chỉ mời người tin cậy. **Actions**: bật workflow nếu cần; lần push đầu phải có Application checks. Branch rules main: yêu cầu PR và CI nếu gói tài khoản cho phép.

Trong bản sao độc lập, cập nhật AGENTS.md theo tài nguyên và chính sách phê duyệt của chủ mới trước khi nhờ agent phát triển tiếp. ID và approval trong AGENTS.md hiện bảo vệ hệ thống gốc; không phải quyền truy cập, cấu hình hay chấp thuận release cho hệ thống mới. Không sửa quy định này trong repository gốc để triển khai cho người nhận.

**Xác minh:** URL/Owner thuộc người nhận; file không có secrets; Actions không dùng secrets cũ. **SCREENSHOT NEEDED:** `screenshots/02-repository.png`, URL repo mới và tab Actions.
