> Hồ sơ lịch sử của hệ thống trước bàn giao. Các tài khoản, backup/automation, trạng thái cloud và quyền release trong tài liệu này không được chuyển sang hệ thống mới. Dùng [setup](setup/README.md), [vận hành](setup/12-operations.md) và [quy trình phát triển](setup/13-development-workflow.md) cho người nhận.

# Phase 2 limitations and owner actions

## Current Phase 3 gates

Production has a permanent Admin, 300 Orders, configured Sheets/SMTP and verified invitation/password/Viewer/disable UAT. Manual 300-row export hashes match staging/output/database. Earlier Phase 2 setup blockers are historical, not current instructions.

Independent Singapore staging and a separate Sheet are configured. Owner confirmed online Preview login/Sheets connection; 22 cloud tests, 18 browser E2E cases and four real Sheets failure assertions passed. Synthetic 2,000-row restore passed. This is not a ten-user load benchmark or full Supabase/Auth recovery proof. Preview rejects missing/production backend configuration. No production data was copied into staging. See PHASE_3_VERIFICATION.md.

Actual scheduled production export succeeded on 2026-11-03 at 15:37 UTC+7 with 300 rows and matching hashes. Cron was restored to 0 16 * * * (23:00 UTC+7), retained in the owner-approved Phase 3 release 0506323. Future scheduled executions still require monitoring.

Leaked password protection is a current Advisor WARN; the verified Free plan cannot enable this Pro+ feature. Managed daily backups/PITR are not claimed available. First production encrypted backup and private Drive upload passed; weekly local Sunday 23:00 job is configured. Full Supabase/Auth recovery and its first weekly execution remain unverified. Authenticated GitHub API confirmed main is not protected (404 Branch not protected); enable required verify without owner lockout. No policy was changed.

## MVP operational limits

- Import is initial-only, including an empty check against soft-deleted records. No bulk overwrite, incremental import, automatic reverse sync or restore UI exists.
- 5,000 import rows and 8,000 CSV/export rows per request. Larger workloads need a worker. Recharts geometry can be approximate; financial strings, SQL sums and CSV remain exact.
- Mutation quotas are fixed database-backed per-user minute buckets: 120 order mutations, 30 administrative mutations, 6 sync operations. Auth provider limits also apply to login; distributed IP-specific perimeter rate limiting is deferred.
- Sync uses a single persistent running-run lock, ten-minute abandonment detection, a 90-second publish budget and a 120-second function limit. This bounds normal overlap but is not an atomic transaction spanning PostgreSQL and Google Sheets. A paused local worker that outlives the platform assumptions requires operator inspection.
- Staging failures preserve the last successful output. A network failure after an accepted publish can leave newer output with a failed/unknown run; inspect readback and retry. There is no claim of exactly-once external side effects.
- Cron's per-business-date key is retained even after failure; manual retry uses a fresh key. Vercel Hobby scheduling is approximate within the hour.
- Audit history is persistent and database-triggered. Encrypted weekly backups are local Codex automation and need the computer/Docker online; they are not an always-on cloud SLA. Keys share the private Drive folder by explicit demo-owner choice. Full Auth restore, automated retention and offsite log archival remain incomplete.
- The UI refetches on navigation/mutations; it does not implement real-time cross-user subscriptions. Every API/RLS operation still checks the current profile independently of visible UI.
- User invitation and profile creation cross Auth and PostgreSQL boundaries. A profile-provisioning failure grants no application access but can leave an invited Auth user requiring Admin recovery; there is no cross-service transaction or invitation resend workflow.

## Tooling

ESLint 9.39.5 remains pinned for current Next.js plugin compatibility and is upstream end-of-life. The earlier 16 moderate development-tool audit findings involving minimatch remain a maintenance item; no incompatible force downgrade was applied. Retained Phase 1 tests exercise historical fixtures; production paths use the separate decimal-string contracts.

Cloud tests occasionally encountered `AuthRetryableFetchError`/status 0 before successful runs. Do not classify that network error as a role/authentication logic failure. Any failed test run must inspect cleanup before retrying. Test scripts intentionally refuse existing business data and preserve unrelated external content.
