> Hồ sơ lịch sử của hệ thống gốc, giữ để tra cứu; các ID/domain và trạng thái release tại thời điểm ghi không phải cấu hình cài mới. Người nhận bắt đầu tại [docs/setup](setup/README.md).

# Phase 2 implementation plan

Authorized by the user's Phase 2 request on 2026-11-02. Preserve PRD v1.0 and historical Phase 1 results. Only target the existing Singapore Supabase project `ubaxgkqkfcrqbyshkidz` and existing Vercel `sheetops` project.

1. Inspect existing cloud schema and environment presence without exposing values. No automatic seed. Install pinned Supabase SSR/client and Google SDKs.
2. Add reproducible schema migration: profiles, orders, sync_runs, audit_logs; RLS, active-user role checks, mutation auditing, profile role safeguards, exact BIGINT serialization and SQL aggregates. Apply to the empty target and verify grants/policies.
3. Replace role selection/localStorage with Supabase password login and cookies. Refresh validated sessions in Next proxy; enforce current profile access at server routes and APIs. Provide private first-admin bootstrap and invitation acceptance.
4. Connect existing readable UI to real paginated CRUD, database aggregates/reports, Admin users/settings/audit endpoints. Keep domain tests from Phase 1 as historical pure fixture tests, add production schemas and exact-integer tests.
5. Add server-only Sheets client, strict preview/confirm into an empty database, snapshot export to staging with readback and atomic publish. Use database run locking, bounded retries and idempotency for both Admin and authenticated cron.
6. Configure existing Vercel schedule at 16:00 UTC. Inspect production environment metadata separately; report missing configuration without reading or copying secrets through chat.
7. Verify unit/security/integration/browser paths and record each acceptance scenario as PASS/FAIL/BLOCKED. Keep real-cloud evidence distinct from mocks. Run npm ci, lint/typecheck/test/build/format and secret review.
8. Commit tested milestones locally, push a safe checkpoint directly to main, verify remote/deployment. No intermediate unprotected privileged endpoints.

Architecture: server-scoped Supabase clients use user JWTs/RLS for normal requests; privileged credentials are restricted to Auth administration and sync/cron boundaries. Database triggers transact auditing with writes. Monetary values travel as decimal strings and aggregate in PostgreSQL. Client charts may approximate for geometry only; displayed/exported financial values remain exact.

External checks: initial Admin credentials may not be available; invitation delivery and first scheduled cron cannot be claimed without evidence. Continue implementing independent functionality if those checks are blocked.
