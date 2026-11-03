# Google Sheets operations

The service account client exists only in `src/lib/server/sheets.ts` (`server-only`). Configure `GOOGLE_SERVICE_ACCOUNT_EMAIL`, the **private_key field contents** in `GOOGLE_PRIVATE_KEY` (not a file path), and `GOOGLE_SPREADSHEET_ID`. Escaped `\n` is normalized to real newlines. Enable Sheets API and share the development spreadsheet with the service account as Editor. Never put private keys in browser settings or source control.

Required input: `Source_Orders`, with exact header:

```text
order_code,customer_name,order_date,status,total_amount,note
```

Use ISO dates, valid lowercase statuses, and nonnegative integer VND. Prefer plain text for BIGINT amounts: numeric spreadsheet cells beyond JavaScript's safe integer range are rejected because precision may already be lost. Do not enter formulas for imported values. Duplicate codes, malformed dates, extra nonempty columns or any invalid row reject the whole batch. Maximum 5,000 data rows. Source is never written by the application or by the verification scripts.

`Export_Orders` and `Export_Staging` are application-managed. Missing managed tabs may be created; Source is not created or overwritten. Existing output must be empty or have canonical seven-column headers before publishing. Do not use managed tabs for manual input or formulas.

Output appends `updated_at` to the input headers. Export takes a consistent PostgreSQL snapshot and writes all cells as strings using RAW; it does not append records. Staging is fully read back and hashed, then output is replaced in one atomic `spreadsheets.batchUpdate`. A final readback must match before a run is marked successful. A staging/preparation failure leaves the previous successful output intact. If Google accepted publish but its response/readback was lost, the run may be failed while output is already updated; inspect and retry a fresh verified snapshot, never assume the previous output is unchanged after an ambiguous publish.

The initial Phase 2 source inspection found all three tabs reachable and canonical Source headers, but **zero source data rows**. The separately authorized development seed below prepares synthetic input; it does not perform an application import. Parser and database-transaction tests are separate evidence, not a substitute for a real source import.

## Explicit development source seed

`scripts/seed-source-orders.ts` reuses Phase 1 `generateOrders()` and validates all 300 synthetic orders with `parseSheet()`. It loads the existing local environment and uses service-account Sheets write scope. No credentials are printed. This is an explicitly authorized development utility, separate from application exports and verification cleanup scripts.

```powershell
npm run seed:sheets -- --check
npm run seed:sheets -- --confirm-development-source
```

Without a flag the command fails before connecting. `--check` only reads. The write flag permits one RAW write to `Source_Orders!A2:F301` only when the full tab has the exact six-column header and no data. An exact existing sample is a verified no-op; any other content stops the operation. At least 301 existing grid rows are required. Full-tab formula-mode read-back must match every string cell, including Unicode, and pass import validation; extra rows/columns are rejected. There is no clear, append, database import or automatic write retry. A second source check runs immediately before writing, but the API has no compare-and-swap: keep this development tab free of concurrent edits during the command. After an ambiguous API failure, run `--check` before retrying. Never run cloud cleanup suites against this seeded source.

To accept the business workflow, sign in as an active Admin, open `/sync` (Đồng bộ dữ liệu), check the connection and choose Preview Import. Confirm 300 valid rows and zero errors. Only the user should choose Confirm Import after reviewing the preview; it requires an empty Orders table, including soft-deleted records. Then verify Orders, dashboard/report totals and sync history. This utility never confirms import for you.

Verified execution on 2026-11-03: the configured development `Source_Orders` was header-only. The explicit write completed and full-tab read-back matched all 300 generated orders exactly. A second write-mode invocation returned a verified no-op. PostgreSQL had 0 total orders both before and after (read-only count); no import was performed. Neither managed export tab was written. Lint, typecheck, 57 unit tests and production build passed; a read-only browser check confirmed unauthenticated `/sync` redirects to `/login`. Authenticated Preview/Confirm Import remains user acceptance work.

## Failure recovery

Check service-account sharing and API enablement, then use connection check and preview again. Failed runs retain sanitized error information. An abandoned run becomes failed after a ten-minute lease; avoid simultaneous manual retries. Failed cron keys are retained per business date; use a new manual export for recovery. No Sheets failure rolls back committed business orders. Oversized snapshots need an external worker rather than larger HTTP timeouts.

## Controlled test workflow

`RUN_CLOUD_TESTS=1 npm run test:e2e` is deliberately opt-in and local-server-only. It requires an empty database and blank/header-only managed tabs, backs those tabs up in memory, creates identifiable temporary Auth/database fixtures, and restores both managed tabs with readback before cleaning exact fixture IDs. If unrelated content appears, cleanup stops and reports inspection required. It never clears arbitrary database tables or Source_Orders. Never run it on real business data.
