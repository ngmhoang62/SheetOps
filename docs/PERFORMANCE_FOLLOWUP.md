# Performance verification follow-up — 2026-11-04

Outcome: **LOCAL REGRESSION VERIFIED / BOUNDED PREVIEW SMOKE VERIFIED**. Overall performance/release acceptance remains partial; this does not authorize a production release.

## Infrastructure diagnosis and scope

The owner supplied Vercel Firewall Traffic evidence for 2026-11-03: 211 challenged requests, all DDoS Mitigation; a spike around 22:46–22:47 UTC+7, System Mitigations active, Custom Rules 0, Bot Protection inactive. This closes the earlier unknown cause of the pre-application Security Checkpoint. It was not a SheetOps RBAC/Auth rejection. No Firewall/Deployment Protection setting or bypass rule/grant was changed in this follow-up. Only existing authorized tool authentication was used.

Full mutation regression now refuses Preview and remains on local staging port 3001. The bounded read-only Preview smoke is separate; it does not export Sheets, Confirm Import, mutate orders, send email, or benchmark sustained load. See PREVIEW_TESTING.md for the exact limits and reproduction.

## Results and retained data

- Full local browser regression rerun: **15 verification groups PASS**. Actual CRUD, exact BIGINT aggregation, Hide/Restore and audit, cross-page hidden-last ordering, rollback on a synthetic failed Hide, Viewer/Editor/anonymous/CSRF checks, disable, cross-tab logout, wrong password/missing session, actual CSV and populated laptop/mobile layouts.
- Local real Google failure regression: **PASS**, actual read-only-scope 403, failed run persisted during verification, all three tabs and business rows unchanged; only its own failure fixture removed.
- Local calibration of the revised paced smoke: **8 checks PASS**, completed 2026-11-04 00:08:25 UTC+7. 44 requests, 22 application requests, 15 irrelevant speculative prefetches skipped. Retained orders/profiles/sync snapshots unchanged.
- Online Preview smoke: **8 checks PASS**, completed 2026-11-04 00:11:06 UTC+7 (raw timestamp 2026-11-03T17:11:06.996Z). 44 total requests including assets, 22 application requests, 15 speculative prefetches skipped. Peak controlled-operation concurrency 2: application/API 1, asset 1. Streamed route bodies are released at headers and excluded from that controlled-operation count. No Challenge or rate-limit response occurred in this successful run.
- Independent staging inspection afterward: **300 orders, 0 hidden, 2 retained profiles/Auth users, 0 disposable users, 2 sync runs, 0 running**. The smoke separately verifies retained order/profile/sync digests; local export tests restore both managed output snapshots exactly. Source_Orders is unchanged.

## Current verification matrix

| Workflow                         | Local staging                                                                         | Fresh online Preview verification                                                             |
| -------------------------------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Authentication                   | PASS: login, wrong password, logout, disable, missing session, cross-tab clearing     | PASS: one password login and logout; disable/expiry regression not rerun online               |
| Loaded navigation                | PASS: all six pages, laptop/mobile                                                    | PASS: Dashboard, Orders, Reports, Sync; Users/Settings not part of this smoke                 |
| CRUD, Hide/Restore and audit     | PASS: same IDs/codes, exact money, audit/idempotency, rollback, server ordering       | NOT RUN: full mutation suite is local-only                                                    |
| Dashboard and Reports            | PASS: exact completed-active revenue delta and hidden exclusion                       | PASS: loaded 300-order KPI; mutation/revenue-delta regression not rerun online                |
| CSV                              | PASS: actual download, Vietnamese/UTF-8 BOM, BIGINT and formula escaping              | PASS smoke: HTTP 200, UTF-8 BOM and header only; detailed content cases remain local evidence |
| Sheets connection/Preview Import | PASS: actual Google reads and populated-table guard                                   | PASS: actual connection/Preview reads and populated-table guard                               |
| Initial Confirm Import success   | BLOCKED: retained QA database is populated; no wipe                                   | NOT RUN: intentionally excluded                                                               |
| Sheets export/history/read-back  | PASS: two actual exports, hashes, no duplicate, hidden exclusion, Source preservation | NOT RUN: intentionally excluded from smoke                                                    |
| Google failure safety            | PASS: actual provider 403 with all tabs unchanged                                     | NOT RUN: shared service covered locally                                                       |
| RBAC/RLS/CSRF                    | PASS: negative API and direct visibility RPC cases                                    | Authenticated Admin reads only; full negative matrix not rerun online                         |
| Responsive                       | PASS: 1366/390 widths with loaded data for all six pages                              | Desktop smoke only; mobile not rerun online                                                   |
| Invitation/password setup        | Owner-verified earlier; account preserved, no repeat mail                             | Earlier owner-confirmed password setup → /login → Viewer login; no fresh invitation sent      |

The previous blanket online BLOCKED statements in PERFORMANCE_RESULTS.md describe the earlier checkpoint. Platform access has recovered for this bounded smoke. Unexecuted online mutations/mobile tests are **NOT RUN by scope**, not a current DDoS or application failure.

## Before/after remains unchanged

No application runtime or SQL behavior changed in this follow-up; only test controls and reporting changed. Keep the original 20-sample distributions in PERFORMANCE_RESULTS.md. Do not substitute intentionally paced smoke durations for user latency.

| Loaded navigation | Original local P50/P95 ms | Optimized local P50/P95 ms | Optimized Preview P50/P95 ms |
| ----------------- | ------------------------: | -------------------------: | ---------------------------: |
| Dashboard         |                561 / 4143 |                  137 / 162 |                    100 / 117 |
| Orders            |                 565 / 854 |                  111 / 139 |                     72 / 105 |
| Reports           |                570 / 1755 |                  111 / 153 |                     95 / 104 |
| Users             |                679 / 1287 |                   96 / 121 |                      69 / 82 |
| Sync              |                659 / 2782 |                    81 / 93 |                      67 / 79 |
| Settings          |                432 / 1577 |                   86 / 142 |                      68 / 85 |

These after-series are predominantly warm cache, include the first visit, and are observational comparisons. The original report preserves slow first visits/maxima and failures. Login checkpoint improves 1942/4020 → 911/2575 ms locally (20 samples each), but the 2-second login P95 goal remains unmet. Preview login is 1333/3428 ms, N=20. Fresh read API P95 remains above 800 ms. At 2,000 local synthetic orders, warm data P95 is 69–108 ms; SQL plans remain approximately 2–3 ms. No new 2,000-order online load loop was run.

The new full local E2E provides only isolated mutation observations, not a new percentile distribution: Create 870 ms, Edit 486 ms, Hide 1036 ms, Restore 453 ms; each N=1. UI pending acknowledgements were 184/34/43 ms for Create/Edit/Hide, and invitation dialog 50 ms (each N=1). Create acknowledgement exceeded the 150 ms aspiration in this observation. Exports were 3955 and 3734 ms, N=2. These values are retained rather than replacing them with the faster earlier samples.

## Harness failures retained and resolved

The first bounded attempt reached login/Dashboard but its expectation configuration was ineffective: Playwright expect.configure returns a new instance. The next attempt reached Orders/Reports but stopped at the deliberate 24-application-request budget; this was a test-control limit, not a Vercel challenge. An overly strict full-response gate then stalled a Flight stream before its dependent API/module request could run. This reproduced on local staging; the revised streaming-aware gate and its dependency tests resolved it before the final online retry.

Historical failed/budget-limited attempts remain in timestamped ignored JSON. Current controls serialize application/API work and assets separately, pace starts, skip unrelated speculative prefetches in the test browser, prevent overlapping runs, and close the browser immediately on Challenge/rate-limit/budget exhaustion. Application prefetch and security remain unchanged. Eight transport regression tests cover defaults, excessive-loop rejection, serialization, pacing, budget, prefetch suppression, immediate stopping and stream dependencies.

## Quality and release limits

101 unit tests PASS (12 files), lint/typecheck/format PASS and optimized staging build PASS. Local server is running on port 3001. Final GitHub CI/deployment SHA is reported at delivery. No production credentials/data/schema/deployment, SMTP, billing, Firewall or protection policy was modified; main is unchanged.

Remaining: initial import success needs an actually empty isolated database; physical-device/mobile online and full online mutation/security matrix are not covered by the smoke; actual timed JWT expiry and provider cold starts remain unmeasured. Existing moderate development-tool advisories and leaked-password-protection plan limits remain documented. Release still needs owner approval, migration-history review and approved application of order_visibility before deploying runtime changes. Do not merge dev into main under the earlier PR #1 authorization.
