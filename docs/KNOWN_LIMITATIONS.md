# Phase 2 limitations and owner actions

## External acceptance gates

- No permanent Auth user/Admin existed at inspection. Disposable verification accounts are removed after testing; they do not become an owner account. Create an intended Auth account and use the trusted bootstrap script as documented in `DATABASE.md`.
- `Source_Orders` is reachable with canonical headers but initially contains no data rows. The application and verification scripts never write this tab. A complete real-source preview → import → UI acceptance requires owner-provided development rows. Database import transactions are independently tested with disposable fixtures; that is not evidence that a real source import occurred.
- Vercel production has the required Supabase URL/public/secret variable names and its public URL targets Singapore. Initial metadata inspection found no Google service-account variables, spreadsheet ID, cron secret, business timezone or APP_ORIGIN. The owner must configure missing values privately in the existing project and redeploy; local secrets are not automatically uploaded.
- Invitation handling is implemented, but custom SMTP, actual inbox delivery, redirect allowlisting and invited-user password setup require owner verification. The UI reports provider acceptance without claiming delivery.
- A local authenticated cron invocation is separate from a scheduled production run. Registration and first scheduled execution require production configuration and observation after deployment.
- Deployment protection remains enabled. A build marked READY is not proof of successful protected runtime business workflows.

## MVP operational limits

- Import is initial-only, including an empty check against soft-deleted records. No bulk overwrite, incremental import, automatic reverse sync or restore UI exists.
- 5,000 import rows and 8,000 CSV/export rows per request. Larger workloads need a worker. Recharts geometry can be approximate; financial strings, SQL sums and CSV remain exact.
- Mutation quotas are fixed database-backed per-user minute buckets: 120 order mutations, 30 administrative mutations, 6 sync operations. Auth provider limits also apply to login; distributed IP-specific perimeter rate limiting is deferred.
- Sync uses a single persistent running-run lock, ten-minute abandonment detection, a 90-second publish budget and a 120-second function limit. This bounds normal overlap but is not an atomic transaction spanning PostgreSQL and Google Sheets. A paused local worker that outlives the platform assumptions requires operator inspection.
- Staging failures preserve the last successful output. A network failure after an accepted publish can leave newer output with a failed/unknown run; inspect readback and retry. There is no claim of exactly-once external side effects.
- Cron's per-business-date key is retained even after failure; manual retry uses a fresh key. Vercel Hobby scheduling is approximate within the hour.
- Audit history is persistent and database-triggered, but retention, offsite log archival, full disaster-recovery automation and restore drills are Phase 3 work. No backups were configured or claimed by this task.
- The UI refetches on navigation/mutations; it does not implement real-time cross-user subscriptions. Every API/RLS operation still checks the current profile independently of visible UI.
- User invitation and profile creation cross Auth and PostgreSQL boundaries. A profile-provisioning failure grants no application access but can leave an invited Auth user requiring Admin recovery; there is no cross-service transaction or invitation resend workflow.

## Tooling

ESLint 9.39.5 remains pinned for current Next.js plugin compatibility and is upstream end-of-life. The earlier 16 moderate development-tool audit findings involving minimatch remain a maintenance item; no incompatible force downgrade was applied. Retained Phase 1 tests exercise historical fixtures; production paths use the separate decimal-string contracts.

Cloud tests occasionally encountered `AuthRetryableFetchError`/status 0 before successful runs. Do not classify that network error as a role/authentication logic failure. Any failed test run must inspect cleanup before retrying. Test scripts intentionally refuse existing business data and preserve unrelated external content.
