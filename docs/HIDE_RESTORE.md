> Hồ sơ lịch sử của hệ thống gốc, giữ để tra cứu; các ID/domain và trạng thái release tại thời điểm ghi không phải cấu hình cài mới. Người nhận bắt đầu tại [docs/setup](setup/README.md).

# Order visibility and release contract

Implemented on dev; production schema is unchanged. The authoritative field remains orders.deleted_at. No order is physically deleted by the application.

## API and database behavior

- GET /api/orders defaults to visibility=all; active and hidden are explicit alternatives. Sorting is deleted_at ASC NULLS FIRST, selected sort, then unique ID, before the server-side range. Hidden rows cannot precede active rows on a later page. Within the hidden group, deletion timestamp is the first sort key.
- DELETE /api/orders/:id hides the existing row. POST /api/orders/:id/restore restores it. Repeating the same state returns a successful no-op; restore also exposes changed. A missing UUID returns 404 and malformed UUID returns validation failure.
- The authenticated set_order_visibility RPC checks the current trusted profile, locks the row, changes only deleted_at and lets existing timestamp/actor/audit triggers run. Admin and Editor are allowed; Viewer, anonymous and disabled profiles are denied. No role comes from editable Auth metadata.
- Audit transitions are hidden/restored. Legacy deleted events remain readable; existing soft_delete_order remains callable and delegates to hiding. Order ID, code, uniqueness and historical audit remain intact.

## UI and derived data

All / active / hidden filters use server pagination. Hidden rows have readable subdued cells and a badge; controls retain contrast. The confirmation closes immediately into a pending row state. Success is announced only after backend confirmation. A failed request clears the pending state and shows an error; mutation invalidation reconciles current data without clearing the whole table.

Dashboard, revenue, Reports, CSV and Sheets export remain active-only. Restoring a completed order makes it eligible again. Hidden rows retain their unique order_code and cannot be reimported as new records. Initial Sheets import still requires a completely empty orders table, including hidden records.

## Migration and release

Migration: supabase/migrations/20261103135713_order_visibility.sql. Applied and independently verified on staging msrmoffrfjhqijdfzzwm only. It changes a SELECT policy and functions, without removing rows or rewriting amounts. No new index was justified by measured 300/2,000-row plans.

Owner release approval is still required. Before deploying this code to production, review/stage the migration through the normal migration workflow and verify its history mapping: the connected migration service may use its own recorded version, so do not blindly reapply an already-present function. Take/verify a protected backup, apply once with an approved operator, then deploy the reviewed dev commit. Check retained row counts, roles, audit and active-only aggregates. Rolling back code must preserve the database and audit; the old delete RPC is retained for compatibility. The new SELECT policy intentionally permits authorized users to view hidden orders; document that behavior when reviewing an older app rollback.
