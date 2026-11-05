# 4. Google Cloud Service Account và Sheets API

1. [Google Cloud Console](https://console.cloud.google.com/) → project selector → **New Project**, tên theo tổ chức mới. Không bật billing/dịch vụ tính phí khi chưa được chủ sở hữu chấp thuận.
2. **APIs & Services → Library**: tìm **Google Sheets API → Enable**. **Enabled APIs & services** phải có Sheets API.
3. **IAM & Admin → Service Accounts → Create service account**: đặt tên riêng. Không cần gán Project Owner/Editor IAM cho thao tác Sheets; quyền file cấp ở chương 5.
4. Chọn service account → **Keys → Add key → Create new key → JSON**. File tải về có `client_email` và `private_key`. Lưu ngoài repository, giới hạn quyền đọc. Điền vào `GOOGLE_SERVICE_ACCOUNT_EMAIL` và `GOOGLE_PRIVATE_KEY`. Không đưa toàn bộ JSON hoặc đường dẫn file vào private key. Giữ newline/escaped `\n` theo chương 6. Nếu tổ chức cấm key, cần quản trị viên cấp phương thức được duyệt; source hiện chưa có Workload Identity adapter.
5. **Xác minh:** account tồn tại, email khớp JSON, API enabled. Không cần OAuth consent screen hay Google OAuth login; ứng dụng dùng service account. Kiểm tra API thực sau khi Share file ở chương 5/10.

[Tạo service account](https://cloud.google.com/iam/docs/creating-managing-service-accounts) · [Tạo key](https://cloud.google.com/iam/docs/creating-managing-service-account-keys).

**SCREENSHOT NEEDED:** `screenshots/04-service-account.png`: API enabled, email service account, vị trí Add key; không chụp private key/JSON.
