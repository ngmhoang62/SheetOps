# Release process

2026-11-04: the owner explicitly approved PR #2, reviewed production migrations and final production release. See RELEASE_2026_11_04.md and PR #2 for current evidence. Earlier dev-only restrictions below describe the period before this approval; they do not authorize future releases or imply these migrations should be reapplied.

main is production; dev is development/Preview. Default work remains on dev. Conventional Commits, no history rewriting and no force push. Owner approval is required before merging dev into main or promoting a deployment.

2026-11-03 exception: the owner explicitly authorized creating, reviewing and merging the current Phase 3 PR, then verifying production. This is release-specific approval, not permanent authorization for future releases. PR #1 was created through the existing authenticated Git credential after the connected GitHub app rejected PR creation with 403. Review must be recorded honestly (the owner cannot approve their own PR as an independent reviewer), CI must pass on the final head, and merge must use the reviewed head SHA. No production migrations/seeds are part of this release.

1. Fetch origin; check clean status and current refs. Bring approved main maintenance fixes into dev with a reviewed merge (especially the cron restoration); resolve locally without overwriting other work.
2. Develop on dev. Run npm ci, lint, typecheck, unit tests, format check and build. Review migrations, secrets, security findings and dependency changes.
3. Push dev, verify Actions and Preview SHA/READY. Independently confirm Preview points to staging. QA anonymous/Viewer/Editor/Admin, disabled sessions, import/export and failure cases on synthetic fixtures only.
4. Open PR dev → main with problem/result, evidence, migration/backward compatibility, remaining risks and rollback candidate. Wait for owner review/approval. Do not enable auto-merge.
5. Only with explicit release authorization: merge PR, verify production SHA/READY, official cron schedule and read-only smoke tests. No seeds/migrations run automatically. Compare counts/audit, inspect errors and preserve rollback candidate.
6. If release fails, owner approves promotion of previous compatible deployment; never drop tables or reverse data to match old application code.

CI job `verify` (workflow Application checks) is the recommended required check. For a solo owner, avoid requiring an impossible second-person review or enforcing an owner lockout. Recommended protection: PRs, passing verify, no force-push/deletion, owner bypass for emergency maintenance. Branch protection/ruleset entitlement and write permission must be verified in repo Settings; no policies are claimed active until confirmed. GitHub CLI/connector support for protection was unavailable in this session. Do not change billing for private-repository protection.

The subsequent performance/Hide-Restore work remains dev-only. Its migration was applied on staging, not production; use HIDE_RESTORE.md for the required approved rollout. A READY deployment and green CI do not replace the outstanding online workflow/latency gates recorded in PERFORMANCE_ENGINEERING.md. The earlier release authorization does not cover this work.

The later UI/audit change also requires `20261103174506_audit_pagination.sql` before its application deployment; it is applied only on staging. See UI_AUDIT_VERIFICATION.md for the paginated API contract, trusted actor snapshots, retained-history fallback and rollout order. RETRY_BEHAVIOR.md distinguishes bounded request retries from durable jobs and documents reconciliation of uncertain writes.
