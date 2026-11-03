# Release process

main is production; dev is development/Preview. Default work remains on dev. Conventional Commits, no history rewriting and no force push. Owner approval is required before merging dev into main or promoting a deployment.

1. Fetch origin; check clean status and current refs. Bring approved main maintenance fixes into dev with a reviewed merge (especially the cron restoration); resolve locally without overwriting other work.
2. Develop on dev. Run npm ci, lint, typecheck, unit tests, format check and build. Review migrations, secrets, security findings and dependency changes.
3. Push dev, verify Actions and Preview SHA/READY. Independently confirm Preview points to staging. QA anonymous/Viewer/Editor/Admin, disabled sessions, import/export and failure cases on synthetic fixtures only.
4. Open PR dev → main with problem/result, evidence, migration/backward compatibility, remaining risks and rollback candidate. Wait for owner review/approval. Do not enable auto-merge.
5. Only with explicit release authorization: merge PR, verify production SHA/READY, official cron schedule and read-only smoke tests. No seeds/migrations run automatically. Compare counts/audit, inspect errors and preserve rollback candidate.
6. If release fails, owner approves promotion of previous compatible deployment; never drop tables or reverse data to match old application code.

CI job `verify` (workflow Application checks) is the recommended required check. For a solo owner, avoid requiring an impossible second-person review or enforcing an owner lockout. Recommended protection: PRs, passing verify, no force-push/deletion, owner bypass for emergency maintenance. Branch protection/ruleset entitlement and write permission must be verified in repo Settings; no policies are claimed active until confirmed. GitHub CLI/connector support for protection was unavailable in this session. Do not change billing for private-repository protection.
