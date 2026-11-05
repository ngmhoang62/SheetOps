# 5. Spreadsheet và import/export

1. [Google Sheets](https://sheets.google.com/) → **Blank spreadsheet**, đặt tên riêng. Tạo ba tab: `Source_Orders`, `Export_Orders`, `Export_Staging`. **Share** → dán email service account → **Editor → Share**. Không mở quyền “Anyone with link can edit”.
2. URL `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit`: lấy đoạn /d/ đến /edit vào `GOOGLE_SPREADSHEET_ID` và `PRODUCTION_GOOGLE_SPREADSHEET_ID`. Hai biến giống nhau khi APP_ENV=production. Đây là ID file, không phải gid tab.
3. Source_Orders: chọn cột → **Format → Number → Plain text**. Dán TSV vào A1:

```text
order_code	customer_name	order_date	status	total_amount	note
```

Một dòng giả tùy chọn để nghiệm thu trên hệ thống mới chưa có dữ liệu thật:

```text
DEMO-001	Khách hàng minh họa	2026-01-15	completed	100000	Dữ liệu giả, không phải giao dịch thật
```

Ngày YYYY-MM-DD có thật; status pending/completed/cancelled; tiền VND nguyên không âm, không phân cách. Mã không trùng cả bản ghi ẩn. Không công thức; tối đa 5.000 dòng. Dùng text để giữ BIGINT chính xác.

4. Export_Orders/Export_Staging để trống hoặc dùng bảy cột như Source cộng `updated_at`. Ứng dụng quản lý hai tab này; không nhập tay. Source chỉ để import ban đầu, không đồng bộ hai chiều.
5. Có Admin: web → **Đồng bộ dữ liệu** → kiểm tra kết nối → Preview Import. Đối chiếu dòng/lỗi, chỉ Confirm khi đúng và Orders hoàn toàn trống, kể cả bản ghi ẩn. Không seed demo trước khi muốn import dữ liệu thật. Export Now xuất snapshot PostgreSQL; đối chiếu mã/tiền/updated_at. Lỗi chuẩn bị staging giữ export trước; lỗi publish mơ hồ cần đọc run và nội dung trước retry.

**Xác minh:** connection thành công, preview đúng, Source không bị ghi đè. Không dùng seed:sheets trên Production; chỉ staging header-only độc lập. **SCREENSHOT NEEDED:** `screenshots/05-spreadsheet.png`: ba tabs, headers và Share đã che thông tin riêng.
