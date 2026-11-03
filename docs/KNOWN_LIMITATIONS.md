# Phase 2 limitations and owner actions

## Current Phase 3 gates

Production has a permanent Admin, 300 Orders, configured Sheets/SMTP and verified invitation/password/Viewer/disable UAT. Manual 300-row export hashes match staging/output/database. Earlier Phase 2 setup blockers are historical, not current instructions.

Independent staging project/Auth users/Sheet/credentials are unavailable. Preview intentionally denies access with 503 until configured; staging CRUD/RLS/reliability/2000-order/load/restore acceptance is BLOCKED. See STAGING_SETUP.md and PHASE_3_VERIFICATION.md. No billing changes or production data copies were made.

Scheduled production cron remains PENDING until actual cron-triggered evidence. The temporary 15:00 test on 2026-11-03 must finish its observation window before main is restored to 23:00 by the authorized monitor. dev already carries the official schedule. Production change is maintenance only, not a Phase 3 release.

Leaked password protection is a current Advisor WARN; the verified Free plan cannot enable this Pro+ feature. Managed daily backups/PITR are not claimed available. Owner-controlled encrypted backups and isolated restore drill remain required. GitHub connector shows admin permission/public repository; protection settings could not be read/written by the exposed connector, and unauthenticated REST requires authentication. Owner must confirm protection in Settings; no lockout-inducing policy was applied.

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
