> Hồ sơ lịch sử của hệ thống trước bàn giao. Các tài khoản, backup/automation, trạng thái cloud và quyền release trong tài liệu này không được chuyển sang hệ thống mới. Dùng [setup](setup/README.md), [vận hành](setup/12-operations.md) và [quy trình phát triển](setup/13-development-workflow.md) cho người nhận.

# Operator runbook

## Preview traffic challenges during QA

Distinguish Vercel HTML Security Checkpoint with x-vercel-mitigated=challenge from SheetOps JSON 401/403. Inspect Firewall Traffic with the exact UTC+7 window and Rule/Reason; an empty attack-status summary alone does not disprove individual mitigation events. The owner identified the 2026-11-03 22:46–22:47 spike as DDoS Mitigation. Keep Firewall and Deployment Protection enabled.

Run full mutation/Sheets regression locally against isolated staging. Preview uses the bounded smoke in PREVIEW_TESTING.md: one process, paced starts, separate API/asset lanes, hard budgets and no automatic Challenge retry. Calibrate locally first. A challenge is infrastructure BLOCKED; a test-budget stop is a harness limit; an unexplained assertion is FAIL pending investigation. Do not label all three as application RBAC failure or generate bypass grants to make tests pass. Record passed checks and unexecuted checks separately. PERFORMANCE_FOLLOWUP.md contains the later successful controlled smoke and retained-data evidence.

Use existing Vercel runtime logs, Supabase Auth/Postgres logs and persistent sync_runs/audit_logs. Record run ID, UTC time, trigger, row count, snapshot hash and sanitized error, never bearer tokens/keys. Monitor failed syncs, missing daily success, >10-minute running leases, latency, 429/5xx and backup age. UI shows only recent records; history is in PostgreSQL.

| Incident             | Action                                                                                                                                                                                                                       |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Import invalid       | Review preview row errors and exact headers/ISO dates/integer strings. Fix source with owner authorization, preview again; never force partial import or reset populated Orders.                                             |
| Export failure       | Inspect run and staging/output hash. Before publish failure preserves previous output; after ambiguous publish independently read output before retry. Manual retry uses fresh key; do not delete failed runs.               |
| Missing cron         | Confirm production deployment, official 0 16 * * *, CRON_SECRET presence, Vercel cron enablement/runtime logs and business timezone. Hobby may run within the hour. A manual request proves invocation only, not scheduling. |
| Abandoned run        | Wait for 10-minute lease expiry and inspect runtime; next authorized run marks stale lease failed. Never delete locks/runs to bypass an active worker.                                                                       |
| Invitation error     | Distinguish timeout, provider rejection, redirect and profile failure. Brevo host uses 587, not 586. Check provider events and recipient confirmation. Never assume HTTP 201 proves delivery.                                |
| Lost access          | Admin reviews trusted profile and is_active, audit and last-admin rules. Do not promote via user metadata or bypass RLS. Revoked sessions return to login.                                                                   |
| Application rollback | Select prior verified Vercel production deployment, check schema compatibility and owner approval, promote it, perform nondestructive smoke checks. No destructive migration rollback.                                       |
| Database recovery    | Follow BACKUP_RESTORE.md; restore to isolated target, verify, get owner approval for cutover.                                                                                                                                |

Staging reliability matrix: use dedicated empty staging and fake fixtures for failed Google writes (read-only-scope client), retry/transient errors, concurrent export locks, duplicate cron keys, expired/disabled sessions, invalid atomic import and abandoned lease. Existing scripts are opt-in and now reject production. Record each run and cleanup outcome; blocked infrastructure means BLOCKED, not PASS. No real outages are injected into production.
