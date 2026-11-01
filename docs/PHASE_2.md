# Phase 2 integration roadmap (not implemented)

## Prerequisites and credentials

The owner supplies Supabase, Google Cloud/Sheets, and hosting projects, with ownership/access and billing limits reviewed. Use a staging environment before production. No credentials are required for Phase 1 and adding values to `.env.local` will not activate an integration.

| Variable                               | Future use                                                              | Exposure             |
| -------------------------------------- | ----------------------------------------------------------------------- | -------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | Supabase project API URL                                                | Browser-safe         |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable client key; all exposed tables must use RLS                 | Browser-safe         |
| `SUPABASE_SECRET_KEY`                  | Restricted privileged server operations                                 | Server only          |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL`         | Service account identity                                                | Server configuration |
| `GOOGLE_PRIVATE_KEY`                   | Service account signing key; handle escaped newlines at server boundary | Secret, server only  |
| `GOOGLE_SPREADSHEET_ID`                | Owner-provided spreadsheet identifier                                   | Server configuration |
| `CRON_SECRET`                          | Authenticate scheduled export requests                                  | Secret, server only  |
| `BUSINESS_TIMEZONE`                    | Business-date calculation, `Asia/Ho_Chi_Minh`                           | Server configuration |

Copy `.env.example` to an ignored `.env.local` only when implementing Phase 2. Configure deployment secrets in the hosting provider's environment settings, with distinct staging/production values. Do not upload a service account JSON key to Git or enter secrets into the prototype Settings screen. Rotate any accidentally exposed key.

## Integration sequence

1. **Data and identity:** version-controlled migrations for `profiles`, `orders`, `sync_runs`, `audit_logs`; indexes; server transactions; real Supabase Auth using cookie-based `@supabase/ssr`; protected routes; disable public signup; controlled first Admin bootstrap and invitations. Preserve VND integer precision (PostgreSQL BIGINT serialized as decimal strings where necessary).
2. **Authorization:** enforce role checks at every server read/mutation. Enable RLS and test anonymous denial, Viewer read-only behavior, Editor order mutations, Admin-only users/sync/audit, self-role protection, and last-active-Admin protection. Never trust client role values. Replace simulated session state; exclude demo switching from real deployments.
3. **Repository boundary:** replace provider-local mutations with route handlers from PRD section 8. Keep Zod validation shared while adding database constraints, server pagination/search/filter/sort, structured errors, 401/403/404/409/422 responses, request origin protection and bounded rate limits. Refetch/revalidate all dependent summaries after changes. Write transactional server audit records with actor and before/after metadata.
4. **Import:** owner enables Sheets API and shares a spreadsheet with the service account. Provision `Source_Orders`, `Export_Orders`, `Export_Staging`. Read-only preview validates exact headers and every ISO date/status/integer; import only into an empty Orders table; reject the whole batch on any error; transaction and sync log. Never overwrite `Source_Orders`.
5. **Export:** take a consistent non-deleted database snapshot ordered by `order_code`; authenticated Admin or cron trigger; per-run idempotency key and lock; bounded retries; `RAW` writes to staging; verify headers/rows/content before publishing. Preserve the previous successful output on errors. Record real run IDs, hashes, counts, timestamps, and errors. Use a worker if snapshot size exceeds request execution limits.
6. **Scheduling and operations:** planned 23:00 Asia/Ho_Chi_Minh equals 16:00 UTC (`0 16 * * *` where the host uses UTC). Verify host cron support/limits at implementation time. Authenticate cron requests and prevent duplicate/concurrent runs. Deploy staging, run PRD section 15 against real services, then production after backups/restore, monitoring, and ownership gates are satisfied.

## Acceptance before production

- Database persists CRUD and all dashboards/reports read real database aggregates.
- Unauthorized API calls return actual 401/403, including forged client roles.
- Disable/revocation and concurrent requests obey updated permissions.
- Import preview and commit are all-or-nothing and duplicate-safe.
- Manual and scheduled exports produce matching verified snapshots; soft-deleted rows are absent.
- Failed API calls preserve business data and prior successful sheet output; retry is bounded and idempotent.
- Integration/RLS/E2E tests, secret review, deployment verification, backup/restore drill, and operating guide pass.

This roadmap documents future work only. No services, SQL migrations, API endpoints, or deployment resources were created in Phase 1.
