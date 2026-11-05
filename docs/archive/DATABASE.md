# Database and first Admin setup

Target: existing Singapore project `ubaxgkqkfcrqbyshkidz`, PostgreSQL 17. Never apply these migrations to the retired project. SQL is versioned under `supabase/migrations/`; migration files are created with the Supabase CLI. The project started with an empty public schema. No synthetic seed is automatically applied.

## Tables

| Table                | Purpose and constraints                                                                                                                                             |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `profiles`           | Auth UUID FK, bounded name, unique email, enum-like role check, active flag, UTC timestamps                                                                         |
| `orders`             | UUID, globally reserved uppercase code (including deleted orders), bounded customer/note, valid date/status, nonnegative BIGINT, actor and soft-deletion timestamps |
| `sync_runs`          | UUID, job/trigger/status checks, business date, unique idempotency key, partial unique active-run index, hash/count/errors/timestamps/actor                         |
| `audit_logs`         | actor/resource/action, before/after JSON, UTC timestamp; money encoded as strings                                                                                   |
| `workspace_settings` | singleton organization name                                                                                                                                         |

RLS applies to all tables. `orders_api` is a security-invoker view, not an RLS bypass. SQL aggregates respect caller RLS. Supporting indexes cover date/status/amount and audit/sync ordering and FK lookups. Deleted records remain reserved and cannot be hard-deleted by application users.

## Migration operations

Use the project dashboard SQL migration flow or authenticated Supabase CLI to apply committed migrations in order; inspect schema and migration history first. Do not use `db reset` on a populated cloud project. This delivery applied migrations to the confirmed empty target through the connected Supabase migration API. CLI-created migration filenames were aligned to the actual applied remote versions so migration history matches the committed files.

## First Admin (owner action)

The application cannot assign the first Admin through a public URL. Public signup is disabled in the project's Auth settings (verified through `/auth/v1/settings`).

1. In [Supabase Auth Users](https://supabase.com/dashboard/project/ubaxgkqkfcrqbyshkidz/auth/users), create the intended owner's account, set a strong password and confirm its email through the dashboard's trusted Admin flow. Do not post its password in chat.
2. Copy its user UUID. In a trusted local PowerShell terminal, set the nonsecret bootstrap inputs:

```powershell
$env:BOOTSTRAP_ADMIN_ID = '<existing-auth-user-uuid>'
$env:BOOTSTRAP_ADMIN_NAME = '<owner display name>'
npm run admin:bootstrap
```

The script loads server credentials from ignored `.env.local`, confirms the target project, looks up the Auth email server-side, and calls a service-role-only bootstrap function. It does not accept or print a password. The database serializes bootstrap attempts and refuses once an active Admin exists. Clear temporary bootstrap inputs afterward if desired.

3. Sign in through SheetOps using the account password. No role selector exists. Only active profiles have business access; creating an Auth account alone grants no application role.
4. Subsequent users are invited through Admin UI. Configure SMTP/redirect URLs first. Invited users choose a password through `/auth/accept`.

Role/active changes use `manage_profile`, with an advisory lock and self-change/last-active-Admin protection. Disabled profiles lose access with their existing JWT because all policies consult current database state. Normal users cannot assign their role through metadata or direct profile updates.

## Backup and restore

Development audit contract (staging only): `20261103174506_audit_pagination.sql` adds trusted actor name/role snapshots for new audit inserts and an Admin-only, SECURITY INVOKER `audit_page` RPC. Historical events are preserved and explicitly use current-profile fallback when snapshots are absent. Filters precede count and stable server pagination (default 50, maximum 100); responses contain allowlisted change summaries rather than full before/after snapshots. See UI_AUDIT_VERIFICATION.md for release order and evidence.

Later dev visibility contract: deleted_at is reused for Hide/Restore. The staging-only order_visibility migration permits all active trusted application roles to SELECT hidden rows, while Admin/Editor alone can change visibility through a locked, idempotent RPC. Existing update/uniqueness/audit guards remain. Active-only analytics/report/export predicates are retained. See HIDE_RESTORE.md before a separately approved production rollout.

Before importing real data, configure and verify Supabase backups appropriate to the project plan; retain encrypted exports outside Google Sheets. Test restoration in an isolated project before production use. Soft delete and audit are operational safeguards, not backups. Do not restore a stale Orders snapshot into production without reconciling users, audit, sync keys and the application-managed Sheets output.
