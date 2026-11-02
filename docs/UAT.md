# Phase 1 demo walkthrough and UAT

Use fictional data only. Start with `npm ci`, `npm run dev`, and open `http://localhost:3000`. The role menu is a demonstration, not authentication security. The initial seed deliberately covers all of 2026.

## Repeatable review flow

1. Open `/` without a demo session. It should redirect through `/dashboard` to `/login`. Select **Quản trị viên** and enter the workspace.
2. Verify initial dashboard values: **300 orders**, **199 completed**, **1,014,200,000 VND revenue**, **66.3% completion**. Status distribution: 69 pending, 199 completed, 32 cancelled. Ten recent orders are ordered by order date, then creation timestamp/code.
3. Navigate to **Đơn hàng**. Advance to page 2; sort by amount; change page size. Search for an exact code or customer name and verify the result and page reset. Date and status filters should combine with search.
4. Click **Tạo đơn hàng**. Submit blank customer/amount fields and verify field errors. Try a duplicate code, impossible date, negative/fractional amount, or overlong customer name; invalid data must not be saved.
5. Create `SO-UAT-001`, customer `Khách hàng kiểm thử (giả lập)`, date `2026-11-02`, status **Hoàn thành**, amount `1234567`. Find it by code. The dashboard should show **301**, **200**, **1,015,434,567 VND**, **66.4%**. Refresh to verify browser persistence.
6. Edit the amount to `2000000`. Dashboard and Reports should show **1,016,200,000 VND**. Monthly totals must sum to that revenue; the status-value total also includes non-completed order values and is clearly labeled separately.
7. Download CSV from Reports. It should have 301 data rows, the canonical seven headers, and `SO-UAT-001` with amount `2000000`. Summing only completed CSV rows should equal the report. CSV should preserve Vietnamese, quotes, commas, and line breaks, and neutralize formula-leading text.
8. Set the report range to 2027. All KPIs should be zero, charts/tables should show empty states, and CSV export should be disabled. Try a reversed range and verify its explanatory message. Reset the range.
9. Search for the test order, click delete, and cancel the dialog first. Then confirm deletion. The record should disappear from normal views and exports. Dashboard totals return to the initial values; its code remains reserved.
10. Switch to **Người xem** in the account menu. Only Dashboard, Orders, Reports navigation should remain. Orders should have no create/edit/delete controls; details are read-only. Direct `/users`, `/sync`, `/settings` visits should show the simulated forbidden view.
11. Switch to **Biên tập viên**. Create/edit/delete controls should be present, but all three admin routes remain blocked. Switch back to Admin.
12. Open **Người dùng**. The active Admin's role and disable controls are disabled. Add fictional `Thành viên mẫu / uat@example.com`; verify the message explicitly says no email was sent. Change another user's role and active status through confirmation, then verify the resulting values. Self-change and last-admin safeguards must remain.
13. Open **Đồng bộ dữ liệu**. Verify **Chưa cấu hình**, no successful import/export, zero exported rows, disabled import/export actions, and no sync history. Setup information is explanatory only.
14. Open **Cài đặt**. Save a demo workspace name; it should update the sidebar. Check local activity entries for create/edit/delete/user changes. Confirm **Đặt lại bản demo**: restore 300 orders, three profiles, empty local activity, default workspace, and sign out.
15. At phone/tablet widths, open/close navigation, visit Dashboard/Orders, scroll the table inside its panel, and open an editor. No whole-page horizontal overflow or inaccessible dialog fields. Verify Tab focus and Escape closing a dialog.

## Recovery checks

- Corrupt the saved demo snapshot using browser developer tools, then reload. The application should show the storage error notice and seed in memory without silently overwriting the invalid snapshot. Admin reset restores normal storage.
- Block browser storage or exhaust its quota. Changes may remain in memory and the UI must warn that persistence is unavailable.
- Visit an unknown path to verify the 404 view. Error/loading components are available through the App Router; no fake network loading or errors are invented for local synchronous operations.

Browser results actually observed for this delivery are recorded in `VERIFICATION.md`. This walkthrough also covers repeatable checks beyond the observed sample; it is not a claim that every recovery path was manually exercised.

## Phase 2 real-service UAT

The earlier sections are historical Phase 1 demo steps; role switching, local persistence and reset no longer exist in the application. For Phase 2 use separate real Auth accounts provisioned by Admin, with SMTP/redirect URLs configured and an initially empty development Orders table.

1. Bootstrap the intended Admin using `DATABASE.md`, then sign in with email/password.
2. Verify anonymous APIs return 401 and admin pages return actual 403 for Editor/Viewer.
3. Check Sheets connection; populate Source_Orders privately with controlled development rows and canonical headers. Preview all rows, fix every error, and confirm only into an empty database. Test a changed-source hash and a malformed batch; neither may partially import.
4. Verify imported Orders and SQL KPI/report totals. Use exact decimal-string values including BIGINT boundaries in controlled tests. Search, sort amounts numerically, paginate and combine date/status filters.
5. Sign in as Editor, create a fictional order, edit it to completed, reload and verify dashboard/report/CSV. Soft-delete through confirmation and verify all normal outputs exclude it. The code remains reserved.
6. Sign in as Viewer, verify read-only UI and directly call mutation/admin APIs to confirm 403. Attempt self-profile elevation and metadata forgery; database RLS must reject access.
7. Admin changes another user's role/active flag. An existing session must lose revoked access on its next request. Self-change/last-active-Admin safeguards remain.
8. Send an invitation only to an authorized recipient. Verify actual inbox receipt, callback and password setup before claiming delivery success.
9. Export a snapshot, read back its full contents and compare exact values. Repeat export: no appended duplicates. Change/delete an order and export again; previous deleted rows disappear. Inspect persisted run and audit history.
10. In a controlled development environment, exercise a Google failure before publish, verify business data and previous output remain, then retry. Treat an ambiguous post-publish timeout separately from a preparation failure.
11. Invoke cron with missing/invalid authorization (401), then through a trusted client with the environment secret. Repeat the same business-date invocation; verify run reuse. Independently observe and record the first scheduled production execution.
12. Verify existing Vercel project deployed the intended main SHA, required environment variables exist, production login/redirects work and cron is registered. Do not disable deployment protection for tests.

Record every final acceptance step as PASS/FAIL/BLOCKED in `VERIFICATION.md`. The disposable cloud/E2E scripts must not be run on real data and are not a substitute for owner SMTP, source-data and scheduled-production acceptance.
