# SheetOps — Product Requirements Document & MVP Specification

**Version:** 1.0  
**Ngày:** 01/11/2026  
**Trạng thái:** Approved Assumptions for Prototype Development  
**Loại dự án:** Internal Web Application  
**Đối tượng:** Một tổ chức, nhiều người dùng  
**Người triển khai:** Developer phối hợp với AI coding agent

---

# 1. Product Overview

## 1.1. Product Vision

SheetOps là một ứng dụng web nội bộ giúp doanh nghiệp quản lý dữ liệu có cấu trúc, theo dõi hoạt động kinh doanh thông qua dashboard và báo cáo, đồng thời tự động đồng bộ dữ liệu lên Google Sheets vào cuối ngày.

Ứng dụng cung cấp giao diện quản lý dữ liệu thuận tiện hơn việc thao tác trực tiếp trên Google Sheets, kèm hệ thống đăng nhập và phân quyền theo vai trò.

## 1.2. Problem Statement

Doanh nghiệp thường sử dụng Google Sheets để lưu trữ thông tin và tổng hợp báo cáo. Cách làm này có những hạn chế:

- Khó theo dõi KPI tổng quan khi dữ liệu tăng.
- Trải nghiệm nhập, sửa và tìm kiếm dữ liệu không được thiết kế riêng cho nghiệp vụ.
- Khó quản lý quyền truy cập theo từng chức năng.
- Thiếu dashboard tập trung.
- Thiếu nhật ký thay đổi ở cấp ứng dụng.
- Dữ liệu có thể thiếu nhất quán khi nhiều người thao tác.

SheetOps giải quyết những vấn đề này bằng cách sử dụng PostgreSQL làm nguồn dữ liệu chính, cung cấp UI quản lý nghiệp vụ và đồng bộ dữ liệu ra Google Sheets.

## 1.3. Product Goals

1. Có một website hoạt động thực tế, deploy lên internet.
2. Người dùng đăng nhập bằng tài khoản được cấp.
3. Người dùng được phân quyền Admin, Editor hoặc Viewer.
4. Admin và Editor có thể quản lý dữ liệu đơn hàng theo quyền.
5. Dashboard và báo cáo truy vấn dữ liệu thật từ PostgreSQL.
6. Admin có thể import dữ liệu đơn hàng từ Google Sheets theo template.
7. Dữ liệu PostgreSQL được export tự động sang Google Sheets mỗi ngày.
8. Admin theo dõi được lịch sử đồng bộ và các lỗi phát sinh.
9. Ứng dụng có thể mở rộng sang datasets nghiệp vụ khác trong tương lai.

## 1.4. Product Non-Goals

Những chức năng sau không thuộc MVP:

- Phân quyền tới từng ô, dòng hoặc cột.
- Cơ chế đồng bộ hai chiều liên tục.
- Google Sheets realtime collaboration.
- Hỗ trợ tùy ý mọi cấu trúc Google Sheets.
- Spreadsheet editor có công thức tương tự Excel.
- Custom report builder hoặc drag-and-drop dashboard builder.
- Multi-tenant SaaS hỗ trợ nhiều công ty.
- Workflow phê duyệt nhiều cấp.
- Mobile app native.
- Hệ thống notification qua email hoặc Slack.
- Tích hợp thanh toán.
- AI-generated analytics.

Các mục này chỉ được bổ sung sau khi có yêu cầu nghiệp vụ cụ thể.

---

# 2. MVP Business Domain

## 2.1. Demo Domain: Order Management

MVP sử dụng dữ liệu quản lý đơn hàng và doanh thu.

Đây là demo domain giả định. Nó có thể được thay thế bằng dữ liệu nghiệp vụ thật sau khi khách hàng cung cấp yêu cầu.

## 2.2. Data Entity: Order

Một đơn hàng bao gồm:

| Field | Type | Quy tắc |
|---|---|---|
| id | UUID | Primary key, tự tạo |
| order_code | String | Unique, bắt buộc |
| customer_name | String | Bắt buộc, tối đa 200 ký tự |
| order_date | Date | Bắt buộc |
| status | Enum | Pending, Completed, Cancelled |
| total_amount | BigInt | Số nguyên VND, không âm |
| note | Text | Không bắt buộc |
| created_at | Timestamp | Tự động |
| updated_at | Timestamp | Tự động |
| updated_by | UUID | Tham chiếu user |
| deleted_at | Timestamp | Null khi chưa xóa |

**Business Rules:**

- `order_code` phải duy nhất.
- `total_amount` được lưu bằng số nguyên VND để tránh sai số floating point.
- Doanh thu chỉ tính đơn hàng `Completed`.
- `Cancelled` không đóng góp vào doanh thu.
- Xóa đơn hàng sử dụng soft delete.
- Các bản ghi soft-deleted không xuất hiện trong dashboard hoặc export mặc định.
- Tất cả phép tính báo cáo thực hiện từ PostgreSQL, không lấy tổng từ Google Sheets.
- Nếu import một ngày không hợp lệ hoặc số tiền không hợp lệ, phải báo lỗi thay vì âm thầm chuyển đổi.

## 2.3. Synthetic Data

Phase 1 tạo 300 đơn hàng giả lập phân bổ trong 12 tháng, sử dụng:

- Tên khách hàng giả.
- Mã đơn hàng giả.
- Ngày đặt hàng hợp lệ.
- Ba trạng thái đơn hàng.
- Tổng tiền khác nhau.
- Notes giả lập.

Seed phải deterministic để chạy lại cho kết quả nhất quán và không tạo bản ghi trùng. Có thể dùng random seed cố định.

---

# 3. User Personas & Authorization

## 3.1. User Roles

**Admin**

Quản lý toàn bộ ứng dụng, người dùng, đơn hàng và Google Sheets synchronization.

**Editor**

Xem dashboard, reports và có quyền tạo, chỉnh sửa, xóa mềm đơn hàng.

**Viewer**

Chỉ được xem dashboard, reports và đơn hàng.

Không cho phép tự đăng ký tài khoản công khai.

## 3.2. Permission Matrix

| Page / Action | Admin | Editor | Viewer |
|---|---|---|---|
| Dashboard: View | Yes | Yes | Yes |
| Orders: View | Yes | Yes | Yes |
| Orders: Create | Yes | Yes | No |
| Orders: Update | Yes | Yes | No |
| Orders: Soft Delete | Yes | Yes | No |
| Reports: View | Yes | Yes | Yes |
| Users: View / Manage | Yes | No | No |
| Sync Center: View | Yes | No | No |
| Google Sheets: Import | Yes | No | No |
| Google Sheets: Export Now | Yes | No | No |
| Settings: View | Yes | No | No |

## 3.3. Authorization Rules

- UI chỉ hiển thị những navigation items phù hợp với role.
- Nếu user truy cập URL không có quyền, server trả về trạng thái Forbidden.
- Backend phải xác thực và kiểm tra quyền cho mọi thao tác.
- Không dựa vào việc ẩn nút hoặc ẩn trang để bảo vệ dữ liệu.
- Việc cập nhật role chỉ được phép qua admin API có kiểm tra quyền.
- Không tin role do client tự gửi lên.
- Không cho user thay đổi role của chính mình qua profile editor.
- Bảo vệ thao tác xóa hoặc hạ quyền Admin cuối cùng.
- Các endpoint của sync và audit chỉ dành cho Admin.
- Mọi thay đổi quan trọng phải có audit log.

---

# 4. Functional Requirements

## FR-01 — Authentication

Ứng dụng phải hỗ trợ:

- Login bằng email/password thông qua Supabase Auth.
- Logout.
- Session persistence và refresh an toàn.
- Protected routes.
- Redirect unauthenticated users về Login.
- Admin mời người dùng mới thông qua Supabase Auth.
- Thiết lập role cho user.

**Acceptance Criteria**

- Tài khoản hợp lệ đăng nhập được.
- Tài khoản chưa đăng nhập không truy cập được trang nội bộ.
- Viewer không thể gọi mutation API để chỉnh sửa đơn hàng.
- User bị vô hiệu hóa hoặc thu hồi quyền không thể tiếp tục thao tác trái phép sau khi hệ thống xác thực lại.

## FR-02 — Dashboard

Trang dashboard gồm:

**KPI Cards**

- Total Orders.
- Completed Orders.
- Total Revenue.
- Completion Rate.

**Charts**

- Monthly Revenue: biểu đồ cột hoặc đường cho doanh thu theo tháng.
- Order Status Distribution: biểu đồ tròn theo trạng thái.
- Recent Orders: 10 đơn hàng mới nhất.

**Filters**

- Khoảng ngày.
- Trạng thái đơn hàng (đối với các thành phần phù hợp).

**Acceptance Criteria**

- KPI tính từ dữ liệu PostgreSQL.
- Bộ lọc ảnh hưởng chính xác đến dữ liệu hiển thị.
- Sau CRUD, dữ liệu được revalidate hoặc refetch phù hợp.
- Có loading, empty và error states.
- Không hardcode số liệu sau khi kết nối database thật.

## FR-03 — Orders Management

Trang Orders cần có:

- Data table.
- Server-side pagination.
- Search theo order code/customer name.
- Filter theo status và khoảng ngày.
- Sort theo ngày hoặc số tiền.
- Create Order.
- Edit Order.
- Soft Delete Order.
- Confirmation dialog trước khi xóa.
- Toast notifications.
- Field-level validation trên form.
- Trạng thái loading và lỗi.

**Acceptance Criteria**

- Editor tạo đơn hàng thành công và đọc lại thấy dữ liệu mới.
- Viewer có thể xem nhưng không thể thay đổi dữ liệu.
- Order Code trùng bị từ chối.
- Input không hợp lệ bị từ chối ở cả frontend và backend.
- Delete làm bản ghi biến mất khỏi danh sách thông thường và báo cáo.
- Thao tác thay đổi dữ liệu tạo audit log.

## FR-04 — Reports

Có một trang Reports gồm:

- Báo cáo doanh thu theo tháng.
- Bảng tổng hợp số lượng đơn theo trạng thái.
- Bộ lọc khoảng ngày.
- Total/summary row.
- CSV export (ưu tiên sau khi dashboard cơ bản hoàn chỉnh).

Các báo cáo chỉ sử dụng dữ liệu PostgreSQL và phải tuân thủ quyền của user.

## FR-05 — User Management

Admin có thể:

- Xem danh sách users.
- Gửi lời mời tạo tài khoản.
- Gán role Admin, Editor hoặc Viewer.
- Đổi role của user.
- Vô hiệu hóa quyền sử dụng ứng dụng.

**Acceptance Criteria**

- Editor/Viewer không mở được Users page.
- API quản lý user trả 403 cho user không được phép.
- User được đổi role phải nhận quyền mới ở lần kiểm tra authorization kế tiếp.
- Không có public signup.

## FR-06 — Google Sheets Import

Admin có thể import dữ liệu từ một spreadsheet đã cấu hình.

**Input Sheet:** `Source_Orders`

Header yêu cầu:

`order_code, customer_name, order_date, status, total_amount, note`

Quy trình:

1. Admin mở Sync Center.
2. Admin chọn Preview Import.
3. Server gọi Google Sheets API đọc dữ liệu.
4. Server validate toàn bộ rows.
5. Hiển thị số bản ghi hợp lệ và lỗi.
6. Admin xác nhận Import.
7. Server ghi dữ liệu vào PostgreSQL.
8. Ghi lịch sử import.

**MVP Import Policy**

- Import là thao tác khởi tạo ban đầu.
- Chỉ cho import khi bảng Orders đang trống.
- Nếu dữ liệu không hợp lệ, không import một phần.
- Không tự động import ngược những thay đổi được chỉnh trên Google Sheets.
- Nếu chưa cấu hình Sheets, giao diện hiển thị `Not Configured`, không giả lập kết quả thành công.

**Acceptance Criteria**

- Đọc được một Google Sheet thật.
- Preview cho kết quả chính xác.
- Import thành công có thể quan sát qua Orders page.
- Import lỗi không làm database rơi vào trạng thái nhập dở.
- Không xuất hiện dữ liệu trùng.

## FR-07 — Daily Google Sheets Export

**Output Sheet:** `Export_Orders`

**Source:** PostgreSQL Orders  
**Direction:** PostgreSQL → Google Sheets  
**Schedule:** 23:00 Asia/Ho_Chi_Minh mỗi ngày  
**Trigger:** Vercel Cron và Manual Export Now

Export bao gồm:

`order_code, customer_name, order_date, status, total_amount, note, updated_at`

**Export Policy**

- PostgreSQL là nguồn dữ liệu chính.
- Output sheet do ứng dụng quản lý; không sử dụng để nhập liệu ngược.
- Xuất toàn bộ danh sách orders chưa bị soft-delete.
- Dữ liệu được sắp xếp ổn định theo `order_code`.
- Sử dụng snapshot export thay vì append dữ liệu lặp lại.
- Có staging sheet để chuẩn bị dữ liệu trước khi thay thế bản export hiện tại.
- Kiểm tra số dòng, header và nội dung staging trước khi publish.
- Không đánh dấu thành công nếu chưa xác nhận ghi Google Sheets.
- Không được xóa bản export thành công trước đó chỉ vì một lần sync mới thất bại.
- Lưu trạng thái và lỗi vào `sync_runs`.
- Ngăn hai lần export chạy đồng thời.
- Có idempotency để tránh trùng execution.
- Retry các lỗi API tạm thời với giới hạn rõ ràng.

Nếu snapshot lớn hơn giới hạn thực thi của serverless function, cần chuyển sang worker phù hợp, không cố xử lý bằng một HTTP request kéo dài vô hạn.

**Acceptance Criteria**

- CRUD từ web được ghi vào PostgreSQL.
- Sau khi export, dữ liệu trong Google Sheets khớp snapshot đã chọn.
- Các đơn hàng bị xóa mềm không còn trong snapshot mới.
- Chạy export lại với cùng dữ liệu không tạo duplicate.
- Lỗi Google API được lưu và hiển thị trong Sync Center.
- Cron chạy trên deployment production theo lịch cấu hình.
- Các request không được xác thực không kích hoạt được export.

## FR-08 — Sync Center

Admin nhìn thấy:

- Google Sheets connection status.
- Spreadsheet ID (ẩn bớt nếu cần).
- Last Successful Import.
- Last Successful Export.
- Last Sync Status.
- Number of exported rows.
- Manual Import Preview.
- Import confirmation.
- Export Now.
- Lịch sử sync gần nhất.
- Chi tiết lỗi sync.

Trạng thái chuẩn:

`Not Configured`, `Idle`, `Running`, `Success`, `Failed`.

## FR-09 — Audit Logs

Lưu tối thiểu những sự kiện:

- Order Created.
- Order Updated.
- Order Deleted.
- User Role Changed.
- User Disabled.
- Google Sheets Import.
- Google Sheets Export.

Audit record cần có actor, action, resource, resource ID, timestamp và metadata thích hợp. Không lưu password, secret hoặc access token vào audit logs.

---

# 5. Information Architecture & UI

## 5.1. Navigation Structure

**Public**

- `/login`

**Authenticated**

- `/dashboard`
- `/orders`
- `/reports`

**Admin Only**

- `/users`
- `/sync`
- `/settings`

Trang `/` tự chuyển sang `/dashboard` nếu đã đăng nhập hoặc `/login` nếu chưa đăng nhập.

## 5.2. Design Direction

- Desktop-first, responsive trên tablet và mobile.
- Sidebar navigation bên trái.
- Topbar có page title, user menu và logout.
- Dashboard dùng KPI cards và charts.
- Orders dùng data table và modal/drawer editing.
- Reports dùng chart và summary table.
- Sync Center hiển thị connection status và execution history.
- User Management dùng table và role selector.

## 5.3. Visual Style

- Phong cách SaaS admin dashboard.
- Giao diện hiện đại, tối giản, dễ đọc.
- Tailwind CSS + shadcn/ui.
- Light mode mặc định.
- Có trạng thái hover, focus, disabled, loading.
- Đảm bảo responsive và khả năng thao tác bằng bàn phím cơ bản.
- UI tiếng Việt; code, database fields và API sử dụng tiếng Anh.
- Không sử dụng biểu đồ chỉ để làm đẹp nếu dữ liệu không có ý nghĩa.

---

# 6. Technical Architecture

## 6.1. Technology Stack

- Next.js App Router + TypeScript.
- React.
- Tailwind CSS.
- shadcn/ui.
- TanStack Table.
- Recharts.
- Supabase PostgreSQL.
- Supabase Auth.
- `@supabase/ssr` cho cookie-based authentication.
- Zod cho schema validation.
- `googleapis` cho Google Sheets API.
- Vercel cho deployment và scheduled cron.
- Vitest cho unit tests.
- Playwright cho end-to-end tests.

Có thể dùng Supabase migrations trực tiếp thay cho ORM trong MVP để giảm số lớp công nghệ. Nếu chọn ORM, phải sử dụng thống nhất và không để hai hệ thống migrations cạnh tranh quản lý schema.

## 6.2. Architecture Principles

1. PostgreSQL là single source of truth.
2. Browser không có quyền truy cập Google credentials.
3. Secrets chỉ tồn tại trong server environment.
4. Authorization kiểm tra ở server.
5. Database RLS được bật và kiểm thử.
6. Supabase Auth là hệ thống quản lý identity.
7. Google Sheets chỉ là import source ban đầu và synchronized export target.
8. Dữ liệu dashboard được tính từ database.
9. Đồng bộ là operation có trạng thái rõ ràng và có khả năng retry.
10. Các integrations được tách thành modules để dễ thay thế.

## 6.3. Logical Data Flow

**Read**

Browser → Next.js → Authorization → PostgreSQL → UI

**Write**

Browser → Next.js API → Authentication → Authorization → Zod Validation → PostgreSQL Transaction → Audit Log → UI Refresh

**Import**

Admin → Next.js → Google Sheets API → Validation → PostgreSQL Transaction → Sync History

**Export**

Vercel Cron / Admin → Server Authorization → Sync Lock → PostgreSQL Snapshot → Google Sheets Staging → Verify → Publish → Sync History

---

# 7. Database Design

## 7.1. Required Tables

### `profiles`

- id UUID, references `auth.users(id)`.
- full_name TEXT.
- role ENUM (`admin`, `editor`, `viewer`).
- is_active BOOLEAN.
- created_at TIMESTAMPTZ.
- updated_at TIMESTAMPTZ.

### `orders`

- id UUID PRIMARY KEY.
- order_code TEXT UNIQUE NOT NULL.
- customer_name TEXT NOT NULL.
- order_date DATE NOT NULL.
- status ENUM (`pending`, `completed`, `cancelled`).
- total_amount BIGINT NOT NULL CHECK (`total_amount >= 0`).
- note TEXT.
- created_at TIMESTAMPTZ.
- updated_at TIMESTAMPTZ.
- updated_by UUID references `profiles(id)`.
- deleted_at TIMESTAMPTZ NULL.

### `sync_runs`

- id UUID PRIMARY KEY.
- job_type ENUM (`import`, `export`).
- trigger_type ENUM (`manual`, `cron`).
- status ENUM (`running`, `success`, `failed`).
- business_date DATE.
- idempotency_key TEXT UNIQUE.
- snapshot_hash TEXT.
- row_count INTEGER.
- error_message TEXT.
- started_at TIMESTAMPTZ.
- finished_at TIMESTAMPTZ.
- initiated_by UUID NULL.

### `audit_logs`

- id UUID PRIMARY KEY.
- actor_id UUID NULL.
- action TEXT NOT NULL.
- resource_type TEXT.
- resource_id TEXT.
- before_data JSONB NULL.
- after_data JSONB NULL.
- created_at TIMESTAMPTZ.

## 7.2. Database Requirements

- SQL migration files được version control trong Git.
- Index cho các trường được tìm kiếm hoặc sắp xếp thường xuyên.
- RLS policies cho các bảng trong exposed schema.
- `anon` không được truy cập business data.
- `viewer` chỉ đọc Orders.
- `editor` đọc/ghi Orders.
- `admin` quản trị theo permission matrix.
- `sync_runs` và `audit_logs` chỉ đọc được bởi Admin.
- Không cho client trực tiếp cập nhật profile role.
- System operations sử dụng trusted server credentials.
- Chỉ những thao tác thật sự cần đặc quyền cao mới được sử dụng Supabase secret key.
- Các database mutations liên quan phải transactional khi có thể.
- Timestamps được lưu theo UTC và hiển thị theo Asia/Ho_Chi_Minh.

---

# 8. API Contract

Sử dụng Next.js Route Handlers. Đường dẫn có thể điều chỉnh nếu giữ nguyên trách nhiệm và contract.

| Endpoint | Method | Access |
|---|---|---|
| `/api/orders` | GET | Authenticated |
| `/api/orders` | POST | Admin, Editor |
| `/api/orders/:id` | GET | Authenticated |
| `/api/orders/:id` | PATCH | Admin, Editor |
| `/api/orders/:id` | DELETE | Admin, Editor |
| `/api/dashboard/summary` | GET | Authenticated |
| `/api/reports/monthly-revenue` | GET | Authenticated |
| `/api/users` | GET | Admin |
| `/api/users/invite` | POST | Admin |
| `/api/users/:id/role` | PATCH | Admin |
| `/api/users/:id/disable` | POST | Admin |
| `/api/sync/import/preview` | POST | Admin |
| `/api/sync/import/confirm` | POST | Admin |
| `/api/sync/export` | POST | Admin |
| `/api/sync/runs` | GET | Admin |
| `/api/cron/daily-export` | GET | Cron Secret |

**API Requirements**

- API trả dữ liệu JSON có cấu trúc nhất quán.
- Validate request bằng Zod.
- Trả 401 khi chưa đăng nhập.
- Trả 403 khi không có quyền.
- Trả 400 hoặc 422 khi input không hợp lệ.
- Trả 404 khi resource không tồn tại.
- Trả 409 khi có conflict phù hợp.
- Không trả stack trace, token hoặc credentials về client.
- Các mutation phải tạo audit log thích hợp.
- Pagination có giới hạn page size.
- Không để client tự chọn database role hoặc bypass authorization.

---

# 9. Google Sheets Integration Specification

## 9.1. Authentication Model

Sử dụng Google Cloud Service Account.

Google Sheets file phải được chủ sở hữu chia sẻ cho service account email với quyền Editor.

Không dùng Google OAuth per-user trong MVP.

## 9.2. Spreadsheet Structure

Một Google Spreadsheet được cấu hình bằng environment variable.

Các tab:

- `Source_Orders`: dữ liệu đầu vào cho import ban đầu.
- `Export_Orders`: dữ liệu export thành công gần nhất.
- `Export_Staging`: vùng tạm cho quá trình xuất.

Ứng dụng không được tự ý ghi đè `Source_Orders`.

Các tab export là application-managed và không được chỉnh sửa trực tiếp trong quy trình sử dụng thông thường.

## 9.3. Import Format

Header:

`order_code | customer_name | order_date | status | total_amount | note`

- Ngày sử dụng ISO `YYYY-MM-DD`.
- Status: `pending`, `completed`, `cancelled`.
- Số tiền là số nguyên VND.
- Dòng đầu tiên chứa tên cột.
- Mọi row phải được validate.
- Có preview trước khi commit.

## 9.4. Export Format

Header:

`order_code | customer_name | order_date | status | total_amount | note | updated_at`

- Data source: PostgreSQL.
- Export snapshot không chứa soft-deleted rows.
- Giá trị ngày/giờ xuất thành format ổn định.
- Sử dụng Google Sheets API với `RAW` input option để tránh diễn giải dữ liệu text như công thức.
- Kiểm tra dữ liệu đầu ra và không để nội dung người dùng biến thành công thức thực thi.

## 9.5. Synchronization Consistency

- Database commit luôn độc lập với trạng thái Google Sheets.
- Nếu export lỗi, không rollback dữ liệu đơn hàng trong PostgreSQL.
- Sync Center hiển thị lần export gần nhất thành công.
- Khi thực hiện export, dùng snapshot nhất quán.
- Snapshot hash và run ID giúp đối chiếu các lần đồng bộ.
- Retry không được append duplicate rows.
- Nếu worker bị timeout, lần thực thi sau có thể nhận diện và xử lý run cũ bị gián đoạn.
- Google Sheets không được coi là backup thay thế cho database.

---

# 10. Non-Functional Requirements

## Security

- HTTPS.
- Secure session handling.
- Environment secrets không đưa vào repository.
- Không expose Supabase secret key hay Google private key.
- RLS được bật và có tests.
- Backend kiểm tra permission cho mọi request.
- CSRF/origin protections thích hợp cho cookie-authenticated mutations.
- Audit logs không chứa secrets.
- Không có public signup.
- Giới hạn các endpoint có nguy cơ bị lạm dụng.

## Performance

Mục tiêu thử nghiệm:

- Quy mô giả định: tối đa 10 users thường xuyên.
- Khoảng 300–2.000 orders.
- Pagination 20–50 rows/trang.
- Dashboard và bảng dữ liệu phản hồi nhanh trong điều kiện sử dụng thông thường.
- Sử dụng database indexes và aggregation server-side.

Những con số này là phạm vi thiết kế ban đầu, không phải giới hạn kỹ thuật cuối cùng hay SLA cam kết.

## Reliability

- Lỗi Sheets không làm mất dữ liệu PostgreSQL.
- Có sync error history.
- Có retry với giới hạn.
- Có thể thực hiện manual export sau khi sửa lỗi.
- Có backup và quy trình khôi phục trước khi dùng dữ liệu thật.

## Maintainability

- TypeScript strict.
- Module boundaries rõ ràng.
- Database schema được version control.
- Có README, setup guide và deployment guide.
- Không hardcode credentials.
- Có automated tests.
- Có `.env.example` không chứa secrets.

---

# 11. Implementation Roadmap

## Phase 1 — Interactive Prototype

**Goal:** Có giao diện đủ hoàn chỉnh để trình diễn và nhận feedback.

**Tasks**

- Bootstrap Next.js project.
- Cấu hình TypeScript, Tailwind, shadcn/ui.
- Thiết kế app shell, sidebar, topbar.
- Tạo các routes và navigation.
- Mock Admin/Editor/Viewer để trình diễn UI.
- Tạo synthetic orders.
- Thiết kế Dashboard với KPI/charts.
- Xây Orders table và các form CRUD mô phỏng.
- Xây Reports.
- Xây Users page.
- Xây Sync Center có trạng thái demo được ghi rõ.
- Hoàn thiện empty, loading, error states.
- Responsive design.

**Exit Criteria**

- Chạy local bằng lệnh được hướng dẫn trong README.
- Không có lỗi build hoặc TypeScript.
- Có thể trình diễn tất cả pages.
- Phân biệt rõ mock data và real integrations.
- Có ảnh chụp hoặc demo flow để review.

## Phase 2 — Functional MVP

**Goal:** Hoàn thành end-to-end integration thật.

**Tasks**

- Tạo Supabase project.
- Thiết lập migrations PostgreSQL.
- Seed demo orders khi cần.
- Tích hợp Supabase Auth.
- Tạo first Admin bootstrap an toàn.
- Admin invite users.
- Triển khai RBAC và RLS.
- Triển khai API CRUD thật.
- Dashboard sử dụng database.
- Reports sử dụng database.
- Tích hợp Google Cloud Service Account.
- Thiết lập một spreadsheet mẫu.
- Implement import preview/confirm.
- Implement daily export với staging.
- Implement Sync Center thật.
- Implement manual export.
- Implement Vercel Cron.
- Implement audit logs.
- Viết unit/integration/E2E tests.
- Deploy staging và production.
- Kiểm tra end-to-end trên cloud.

**Exit Criteria**

- Người dùng đăng nhập bằng Supabase Auth thật.
- CRUD lưu vào PostgreSQL thật.
- Tài khoản Viewer không thể mutation qua API.
- Import từ Google Sheet thật hoạt động.
- Export sang Google Sheet thật hoạt động.
- Daily cron có thể tự kích hoạt export.
- Logs thể hiện trạng thái thực tế.
- Build, lint, typecheck, tests thành công.
- Có deployment URL và hướng dẫn vận hành.

## Phase 3 — Production Hardening

**Goal:** Chuẩn bị dùng thường xuyên trong công việc.

**Tasks**

- Đánh giá các data models thực tế.
- Đánh giá backup và restore.
- Kiểm thử concurrency và sync failures.
- Security review.
- Performance tests.
- Monitoring và alerting.
- Log retention policy.
- Chính sách lưu trữ và xóa dữ liệu.
- Domain và ownership setup.
- Vận hành, support và handover.
- Chuẩn bị mở rộng permissions/datasets.

Phase 3 không tự động bao gồm việc xây tất cả tính năng nâng cao. Mọi yêu cầu mới cần được phân tích và xác nhận phạm vi.

---

# 12. Definition of Done

Một feature được coi là hoàn thành khi:

- Implementation đúng acceptance criteria.
- Có validation và xử lý lỗi.
- Có server-side authorization nếu yêu cầu.
- Có tests phù hợp.
- Không có TypeScript/lint/build errors.
- Không chứa dữ liệu nhạy cảm hoặc secrets trong repository.
- Có thể chứng minh chức năng hoạt động.
- Documentation được cập nhật.

**MVP hoàn thành khi toàn bộ Phase 2 đạt Exit Criteria, không chỉ khi website có giao diện đẹp.**

---

# 13. Project Deliverables

Coding agent phải bàn giao:

1. Source code hoàn chỉnh trong Git repository.
2. Database migrations.
3. Synthetic data seed script.
4. `.env.example`.
5. Setup và local development guide.
6. Supabase configuration guide.
7. Google Cloud/Sheets configuration guide.
8. Vercel deployment guide.
9. API documentation.
10. Automated test suite.
11. Manual UAT checklist.
12. Known limitations và future improvements.
13. Thông tin deployment và quy trình handover.

---

# 14. Project Risks & Constraints

| Risk | Mitigation |
|---|---|
| Chưa có business data thật | Dùng Order Management làm demo domain |
| Yêu cầu có thể thay đổi | Thiết kế modules tách biệt |
| Sai quyền truy cập | Server-side authorization và RLS tests |
| Google Sheets API lỗi | Retry, logs, staging export |
| Cron thực thi trùng | Lock và idempotency |
| Google credentials hết quyền | Connection test và trạng thái lỗi |
| Dữ liệu xóa nhầm | Soft delete và audit |
| Database mất dữ liệu | Backup ngoài Google Sheets |
| Free-tier hạn chế | Theo dõi hạn mức, có kế hoạch nâng cấp |
| AI agent sinh code chưa đúng | Review, tests và acceptance gates |

---

# 15. Final MVP Acceptance Scenario

Hệ thống phải vượt qua kịch bản kiểm thử sau:

**Scenario: Complete Business Workflow**

1. Admin đăng nhập.
2. Admin kiểm tra kết nối Google Sheets.
3. Admin import bảng Orders từ `Source_Orders` vào một database Orders đang trống.
4. Orders xuất hiện trên website.
5. Dashboard hiển thị KPI đúng.
6. Admin tạo tài khoản Editor.
7. Editor đăng nhập.
8. Editor tạo một đơn hàng mới.
9. Editor cập nhật trạng thái thành Completed.
10. PostgreSQL lưu thay đổi.
11. Dashboard phản ánh thay đổi.
12. Audit log lưu thao tác của Editor.
13. Viewer đăng nhập, xem dữ liệu nhưng không sửa được.
14. Admin thực hiện Export Now.
15. Google Sheets `Export_Orders` chứa dữ liệu chính xác.
16. Admin chỉnh sửa thêm một đơn hàng.
17. Cron kích hoạt lần export tiếp theo.
18. Google Sheets nhận snapshot mới.
19. Không có duplicate hoặc các dòng đã soft-delete.
20. Sync Center hiển thị thời điểm và trạng thái đồng bộ thành công.
21. Khi giả lập lỗi Google Sheets API, database không bị mất dữ liệu và hệ thống hiển thị lỗi.
22. Sau khi khắc phục, manual retry hoàn thành thành công.

**Kết quả mong muốn:** Toàn bộ workflow hoạt động trên các dịch vụ thật, có thể kiểm chứng bằng PostgreSQL, Google Sheets và audit/sync logs.

---

**End of PRD v1.0**