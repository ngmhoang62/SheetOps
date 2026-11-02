# Google Sheets operations

The service account client exists only in `src/lib/server/sheets.ts` (`server-only`). Configure `GOOGLE_SERVICE_ACCOUNT_EMAIL`, the **private_key field contents** in `GOOGLE_PRIVATE_KEY` (not a file path), and `GOOGLE_SPREADSHEET_ID`. Escaped `\n` is normalized to real newlines. Enable Sheets API and share the development spreadsheet with the service account as Editor. Never put private keys in browser settings or source control.

Required input: `Source_Orders`, with exact header:

```text
order_code,customer_name,order_date,status,total_amount,note
```

Use ISO dates, valid lowercase statuses, and nonnegative integer VND. Prefer plain text for BIGINT amounts: numeric spreadsheet cells beyond JavaScript's safe integer range are rejected because precision may already be lost. Do not enter formulas for imported values. Duplicate codes, malformed dates, extra nonempty columns or any invalid row reject the whole batch. Maximum 5,000 data rows. Source is never written by the application or by the verification scripts.

`Export_Orders` and `Export_Staging` are application-managed. Missing managed tabs may be created; Source is not created or overwritten. Existing output must be empty or have canonical seven-column headers before publishing. Do not use managed tabs for manual input or formulas.

Output appends `updated_at` to the input headers. Export takes a consistent PostgreSQL snapshot and writes all cells as strings using RAW; it does not append records. Staging is fully read back and hashed, then output is replaced in one atomic `spreadsheets.batchUpdate`. A final readback must match before a run is marked successful. A staging/preparation failure leaves the previous successful output intact. If Google accepted publish but its response/readback was lost, the run may be failed while output is already updated; inspect and retry a fresh verified snapshot, never assume the previous output is unchanged after an ambiguous publish.

The initial source inspection found all three tabs reachable and canonical Source headers, but **zero source data rows**. Live import cannot pass until the owner supplies development data and an Admin account. Parser and database-transaction tests are separate evidence, not a substitute for a real source import.

## Failure recovery

Check service-account sharing and API enablement, then use connection check and preview again. Failed runs retain sanitized error information. An abandoned run becomes failed after a ten-minute lease; avoid simultaneous manual retries. Failed cron keys are retained per business date; use a new manual export for recovery. No Sheets failure rolls back committed business orders. Oversized snapshots need an external worker rather than larger HTTP timeouts.

## Controlled test workflow

`RUN_CLOUD_TESTS=1 npm run test:e2e` is deliberately opt-in and local-server-only. It requires an empty database and blank/header-only managed tabs, backs those tabs up in memory, creates identifiable temporary Auth/database fixtures, and restores both managed tabs with readback before cleaning exact fixture IDs. If unrelated content appears, cleanup stops and reports inspection required. It never clears arbitrary database tables or Source_Orders. Never run it on real business data.
