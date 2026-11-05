> Hồ sơ lịch sử của hệ thống gốc, giữ để tra cứu; các ID/domain và trạng thái release tại thời điểm ghi không phải cấu hình cài mới. Người nhận bắt đầu tại [docs/setup](../setup/README.md).

# Phase 2 architecture

The approved PRD remains `PRD.md`. `PHASE_1.md`, earlier verification records and Git history preserve the prototype. The current application uses PostgreSQL; synthetic fixtures and Phase 1 domain functions are retained for tests/seed preview only and are never loaded by the application provider.

## Request boundaries

- `src/proxy.ts`: Supabase SSR session refresh and actual page-route denial (401 redirect or HTTP 403 for inactive/admin-only access). API handlers perform their own checks, including cron's distinct bearer authentication. Responses are private/no-store.
- `src/lib/supabase/{browser,server}.ts`: public cookie client, user-scoped server client, and explicitly privileged server client. Production is pinned to Singapore ubaxgkqkfcrqbyshkidz. Preview/staging requires an explicit independent ref and rejects the production/retired projects; see environment.ts. Missing Preview configuration fails closed before data access.
- `src/lib/server/http.ts`: verified Auth user, fresh database profile, active flag, role requirements, origin checks, structured errors. User metadata never supplies role.
- `src/app/api`: authenticated order CRUD, server pagination/search/sort, SQL summaries, filtered CSV, Admin users/settings/audit, Sheets sync, and authenticated cron.
- `src/components/workspace-provider.tsx`: current session/profile and organization fetched from server; no browser business persistence or role switching. Focus and periodic refresh update visible permissions. Every request rechecks access regardless of cached UI.
- Existing feature components preserve the Phase 1 readable layout while consuming APIs. Mutations invalidate shared query revisions. Session changes redirect through Next routing.

## Exact money

`contracts.ts` validates unsigned decimal strings in PostgreSQL BIGINT range. The database stores BIGINT, aggregates with PostgreSQL numeric arithmetic, and emits text before JSON serialization. `orders_api.amount_sort` retains a numeric sort key; application selects explicitly omit that helper from responses. SQL reporting and CSV are exact. Recharts receives approximate numeric coordinates only for geometry; tooltips, KPI values and tables use the original exact strings.

## Database authorization

RLS is enabled on all public tables. Active profiles determine access on every query. Anonymous users have no business grants. Authenticated roles cannot directly mutate profiles, runs or audit logs. User management and soft deletion use narrowly granted public invoker wrappers over private definer functions with explicit identity/role checks, empty search paths and appropriate locking. Order/profile/settings triggers record changes transactionally. No public Admin bootstrap endpoint exists.

## Sync flow

Admin preview reads `Source_Orders`, checks headers and every row, and returns a content hash. Confirm rereads source and rejects changed/invalid input. The database import locks Orders, checks that even soft-deleted rows are absent, and transacts all inserts, audit and success state.

Admin/manual and bearer-protected cron exports share one server-only service. A database advisory transaction lock plus unique active-run index prevents overlap; stale running leases expire after ten minutes. A consistent SQL snapshot is sorted and written as RAW strings to staging, then read back and hashed. Within the 90-second publish budget the run lease is rechecked. An atomic Sheets structural batch resizes, clears only managed output values and copies verified staging values. A second readback precedes success. Failures do not mutate business orders.

## Current execution limits

Import: at most 5,000 source rows. CSV/export: at most 8,000 orders; oversized snapshots fail explicitly and require a worker. Individual Google calls time out after ten seconds; transient staging calls use at most three attempts. Function maximum duration is 120 seconds. The advisory lease is longer than normal function lifetime; this does not provide a cross-system transaction or exactly-once external side effect. Manual retries use a new key; cron uses a business-date key. A failed daily key is retained and requires manual retry rather than replaying the same cron key.

References used: [Supabase SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [Next.js proxy](https://nextjs.org/docs/app/api-reference/file-conventions/proxy), [Sheets batch updates](https://developers.google.com/workspace/sheets/api/guides/batchupdate).

Phase 3: main → production; dev → isolated Preview, owner-approved PR release only. Preview Sheets IDs are checked independently. Baseline security headers are applied by Next config. The owner-approved release 0506323 uses a single sin1 function region alongside Singapore PostgreSQL in both Preview and production. No queues/Redis/workers were introduced. See RELEASE_PROCESS.md and BACKUP_RESTORE.md.

Later dev performance work: one memory-only QueryClient per environment/user/role/login epoch provides deduplication, 30-second freshness, previous-data retention and domain invalidation. Fresh authorization remains in APIs/RLS; logout/revocation/role changes clear private state. Verified password login can supply the default analytics snapshot concurrently with profile/settings, avoiding the initial Dashboard request. Admin reads overlap profile and RLS data queries without returning anything before authorization. No public data cache or durable client job queue exists.

Sheets stage resize/clear/string-cell replacement now occurs in one atomic structural batch; publication still follows independent read-back/hash and lease validation. Hidden orders are visible through server-paginated list visibility filters but remain excluded from analytics, CSV and Sheets snapshots. See PERFORMANCE_ENGINEERING.md and HIDE_RESTORE.md; the latter migration is staging-only until separately approved for production.
