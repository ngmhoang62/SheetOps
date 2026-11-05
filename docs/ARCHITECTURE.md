# SheetOps architecture

This is the account-neutral architecture of the handover source. Start with [setup](setup/README.md), the [environment contract](setup/ENVIRONMENT.md) and [development workflow](setup/13-development-workflow.md). Historical infrastructure/approval evidence is not configuration or release permission for a new installation. The prior architecture record is preserved in [archive](archive/ARCHITECTURE-before-final.md).

## Boundaries

- Next.js App Router serves pages and API route handlers. `src/proxy.ts` refreshes sessions and enforces page access; API handlers independently authenticate and authorize requests. Responses carrying session/business data are private/no-store.
- `src/lib/environment.ts` validates explicit deployment identities. Production and staging refs/Sheets come from environment configuration, not source constants. The browser receives only public Supabase configuration. `src/lib/supabase/server.ts` and `src/lib/server/*` contain trusted operations and keep privileged credentials server-only.
- PostgreSQL is the business source of truth. Active `profiles` determine Admin/Editor/Viewer access; user-editable metadata is never authorization. RLS, narrow grants, guarded RPCs, locks and transactional audit triggers enforce changes at the database boundary. First Admin bootstrap is a trusted terminal operation, not a public endpoint.
- Feature components consume server APIs; `src/lib` owns validation, permissions, analytics and formatting contracts. A session-partitioned memory query cache is presentation support, never an authorization source or durable business store. Logout/revocation invalidates private state.

## Domain and persistence

Orders use unique codes including hidden/deleted records, actual ISO dates, allowed statuses and nonnegative integer VND. PostgreSQL BIGINT values and exact aggregates cross JSON as decimal strings. Only completed, non-deleted orders contribute revenue. Chart geometry may be approximate; displayed financial values remain exact. Hide/restore preserves history and audit; visibility does not change revenue/export rules.

Every public business table uses RLS. Role/disable mutations preserve self-change and last-active-Admin safeguards. New tables, columns, grants, policies, functions, indexes and audit behavior belong in reviewed SQL migrations. Preserve applied files and reconcile remote migration history before CLI deployment. CI never applies cloud migrations.

## Sheets and invitations

Admin import previews `Source_Orders`, validates rows and hashes content, then rereads at confirmation. The transactional import requires Orders empty, including hidden rows. Google Sheets is not a second database or a backup.

Manual and authenticated cron exports share one server-only snapshot service. A persistent running-run guard/lease prevents normal overlap. RAW staging writes are verified by readback/hash before atomic managed-output replacement. Failure before publication preserves prior output; an uncertain publish requires reconciliation. There is no transaction spanning PostgreSQL and Google APIs or exactly-once guarantee. Source is never overwritten by runtime exports.

Invitations cross Supabase Auth, PostgreSQL profiles and SMTP. Those systems are not one transaction. A provider-accepted invitation does not prove inbox delivery; incomplete provisioning requires Admin inspection. SMTP lives in Supabase settings, not browser environment variables.

## Deployment and verification

`dev` maps to development/Preview and independent staging resources; `main` maps to Production. The new owner must separately approve schema writes, merge and Production deployment. Next build has no migration/seed hook. The checked-in region is a deploy preference, not an account identity. Business time is fixed UTC+7; cron schedule is UTC in `vercel.json`.

Import is bounded at 5,000 rows; export/CSV at 8,000 rows. Oversized work needs reviewed worker architecture. Timeouts, retry bounds and lease checks are implementation safeguards, not an external job queue or SLA.

CI runs formatting, lint, strict typecheck, unit tests, build and a disposable PostgreSQL migration harness. Minimal SQL Auth fixtures validate schema/RLS/bootstrap/audit contracts, not hosted Auth/PostgREST/SMTP/Sheets/Vercel. Cloud ownership, configuration and end-to-end behavior require [recipient verification](setup/10-verification.md). Full Supabase/Auth disaster recovery remains a separate restore exercise.
