> Hồ sơ lịch sử của hệ thống gốc, giữ để tra cứu; các ID/domain và trạng thái release tại thời điểm ghi không phải cấu hình cài mới. Người nhận bắt đầu tại [docs/setup](setup/README.md).

# Performance results and release decision — 2026-11-03

Latest follow-up: [2026-11-04 verification](PERFORMANCE_FOLLOWUP.md) confirms the historical DDoS Mitigation cause, fresh local regression and a successful bounded online Preview smoke. The distributions and earlier BLOCKED checkpoint below remain historical; full online mutation/mobile regression is not part of the new read-only smoke.

Status: **PARTIALLY VERIFIED — ONLINE REGRESSION BLOCKED**. Code is on dev, production main remains 0506323f068833bc55e6718350b7f2798797255e. See PERFORMANCE_ENGINEERING.md for the investigation, trust model and limitations; HIDE_RESTORE.md for business/API/migration contracts.

## Navigation before and after

Milliseconds, P50 / P95. Each route has 20 samples including the first visit. After-results are predominantly warm authenticated memory-cache navigation; before-results paid a fresh request every visit. This is intentional cache behavior, not a SQL-speed claim. All successful slow samples are retained.

| Operation   | Local before | Local after | Observed P95 reduction | Preview before | Preview after |
| ----------- | -----------: | ----------: | ---------------------: | -------------: | ------------: |
| Dashboard   |   561 / 4143 |   137 / 162 |                  96.1% |     420 / 2531 |     100 / 117 |
| Orders      |    565 / 854 |   111 / 139 |                  83.7% |     437 / 2332 |      72 / 105 |
| Reports     |   570 / 1755 |   111 / 153 |                  91.3% |      389 / 927 |      95 / 104 |
| Users       |   679 / 1287 |    96 / 121 |                  90.6% |     445 / 1612 |       69 / 82 |
| Sync Center |   659 / 2782 |     81 / 93 |                  96.7% |      377 / 583 |       67 / 79 |
| Settings    |   432 / 1577 |    86 / 142 |                  91.0% |      437 / 985 |       68 / 85 |

UI heading response after: local P95 90–159 ms; Preview P95 73–112 ms. These are not separate hydration/CPU traces.

## Login

| Series                                                 |      N | P50 / P95 ms | Worst successful sample ms |
| ------------------------------------------------------ | -----: | -----------: | -------------------------: |
| Original local repeated baseline (successful attempts) | 4 of 5 |   1360 / N/A |                       2900 |
| Cache-only local checkpoint                            |     20 |  1942 / 4020 |                       6077 |
| Final local, same verified-login analytics reused      |     20 |   911 / 2575 |                       4642 |
| Original Preview baseline                              |      1 |   3436 / N/A |                       3436 |
| Final Preview                                          |     20 |  1333 / 3428 |                       6281 |

The original fifth baseline attempt failed with HTTP 500 and an observer timeout; it is not a successful 30-second login. The new local series is 20/20 data-success, but login P95 still exceeds the 2-second goal. Against the cache-only checkpoint, local median improves 53.1% and P95 35.9%; this is an observed comparison across time, not proof network conditions were identical. True serverless cold starts were not identified.

## First visits and long tails

| Page        | Local first data / max ms | Preview first data / max ms |
| ----------- | ------------------------: | --------------------------: |
| Dashboard   |                 162 / 178 |                    58 / 117 |
| Orders      |               1628 / 1628 |                 1192 / 1192 |
| Reports     |                 129 / 164 |                   102 / 108 |
| Users       |               2941 / 2941 |                   380 / 380 |
| Sync Center |                 883 / 883 |                   343 / 343 |
| Settings    |                 884 / 884 |                   877 / 877 |

A 20-sample nearest-rank P95 can exclude the single slowest initial visit. First visits still pay remote authorization/data latency. Reports shares the already-loaded default Dashboard summary. No claim is made that every first click is instant.

## Authenticated API reads

Local 300 orders, N=20 per endpoint. Request duration includes network/auth/profile/RLS/data transport and serialization, not just SQL. Earlier checkpoint and final series use the same direct HTTP probe; later 2,000-row checks use browser fetch. No public/CDN data cache.

| Endpoint               | Earlier checkpoint P50/P95 ms | Final P50/P95 ms |
| ---------------------- | ----------------------------: | ---------------: |
| /api/session           |                    505 / 2250 |       758 / 1997 |
| /api/orders            |                    544 / 1634 |       529 / 1484 |
| /api/dashboard/summary |                    570 / 1430 |       511 / 1088 |
| /api/users             |                    611 / 1527 |       324 / 1339 |
| /api/sync/runs         |                    855 / 1512 |       495 / 1436 |
| /api/audit             |                    612 / 1558 |       752 / 1666 |

Users and Sync median decrease after overlap; audit is slower in this series. Network variance remains material. API P95 <800 ms is **not achieved**. Preview direct API probes returned platform HTML Security Checkpoint 403 and have no successful API percentile; they are BLOCKED, not application-RBAC failures. Browser warm-navigation samples predate the later full-suite block and remain separately reported.

## Scale and invitation-dialog responsiveness

Local 2,000 synthetic orders, 20 navigation/dialog samples; 1,700 owned fixtures were removed afterward.

| Operation                                         | P50 / P95 ms |
| ------------------------------------------------- | -----------: |
| Dashboard data                                    |     94 / 108 |
| Orders data                                       |      70 / 87 |
| Reports data                                      |     94 / 106 |
| Users data                                        |      68 / 80 |
| Sync Center data                                  |      64 / 69 |
| Settings data                                     |      69 / 79 |
| Invitation dialog, visible button click to dialog |      30 / 38 |

Search + exact amount sort + pages 1/2, status/code sort, date/status filtering were exercised with real server pagination. Five successful request samples per query give medians 512–674 ms (no P95 claim). No full orders table was sent to the browser for pagination. Authenticated SQL at 2,000 rows: list 2.471 ms, monthly aggregation 3.032 ms, no spill; no index change justified. Preview 2,000-order acceptance remains BLOCKED by platform access.

## Mutation and external-provider measurements

No controlled before-distribution was collected for these operations. N/A is deliberate; no invented improvement percentage. Request completion is distinct from immediate UI acknowledgement.

| Operation           |      Before P50/P95 |                                                     After observed completion ms |           UI pending acknowledgement ms |
| ------------------- | ------------------: | -------------------------------------------------------------------------------: | --------------------------------------: |
| Create order        |                 N/A |                                                                       1495 (N=1) |                                86 (N=1) |
| Edit order          |                 N/A |                                                                        446 (N=1) |                                28 (N=1) |
| Hide order          |                 N/A |                                                                        775 (N=1) |                                30 (N=1) |
| Restore order       | N/A (new operation) |                                                                        431 (N=1) | Pending row state; not separately timed |
| Invitation provider |                 N/A | Original invite has no isolated request timing; recovery accepted in 11498 (N=1) |                   Dialog 30 / 38 (N=20) |
| Export Now          |                 N/A |                                                                 6878, 3942 (N=2) |   Persisted sync state; no queued claim |

The single original invitation's Auth-to-profile timestamp gap is not an SMTP duration. Recovery acceptance is not delivery; the owner separately confirmed inbox/password setup → /login → Viewer login. The earlier local one-off dialog timer included waiting for a newly reloaded page's button (1365 ms); the controlled 20-sample visible-button measurement above isolates click acknowledgement. Failed synthetic Hide HTTP 500 is recorded and excluded from successful completion timing.

## E2E matrix

| Workflow                           | Local staging                                   | Online Preview                                                    | Evidence / limit                                                                    |
| ---------------------------------- | ----------------------------------------------- | ----------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Login/session reload/logout        | PASS                                            | PASS login series; full suite BLOCKED                             | 20 measured logins each; local cross-tab logout                                     |
| Navigation / warm data             | PASS                                            | PASS                                                              | 20 samples per route, real KPI/content checked                                      |
| Create/edit / BIGINT               | PASS                                            | BLOCKED                                                           | Browser CRUD, 9007199254740993 exact                                                |
| Hide/Restore                       | PASS                                            | BLOCKED                                                           | Same ID, hidden badge/style, revenue/CSV exclusion, audit, no-op repeats            |
| Server pagination/sort             | PASS                                            | BLOCKED at 2,000                                                  | Hidden group crosses 20-row page boundary; scale filters/sort                       |
| Dashboard/Reports                  | PASS                                            | PASS warm reads; mutation regression BLOCKED                      | Exact completed-active revenue delta                                                |
| CSV                                | PASS                                            | BLOCKED                                                           | Actual download, UTF-8 BOM, Vietnamese, exact integer, escaped formula              |
| Users / invitation                 | PASS role checks; owner-verified email recovery | PASS owner password setup/login; automated Admin workflow BLOCKED | No duplicate invitation or account deletion                                         |
| Sheets connection/Preview          | PASS                                            | BLOCKED                                                           | Real staging Google API                                                             |
| Initial Confirm Import success     | BLOCKED                                         | BLOCKED                                                           | Retained 300 QA orders; no wipe to force empty DB                                   |
| Export/read-back/history           | PASS                                            | BLOCKED                                                           | Two browser exports, exact hashes, duplicate/hidden checks, Source unchanged        |
| Google failure safety              | PASS                                            | Shared service verified locally                                   | Actual provider 403, failed run persisted, all tabs unchanged                       |
| RBAC/RLS/CSRF                      | PASS                                            | BLOCKED full suite                                                | Anonymous/Viewer/Editor/foreign-Origin denied; direct Viewer RPC denied             |
| Disable / private-cache revocation | PASS                                            | BLOCKED automated                                                 | Fresh backend denial + browser redirect/cache clear                                 |
| Missing session / wrong password   | PASS                                            | BLOCKED automated                                                 | Auth cookie removal is an expiry-equivalent loss, not a real timed JWT-expiry drill |
| Responsive laptop/mobile           | PASS all six populated pages                    | BLOCKED full suite                                                | 1366/390 width, loaded-content screenshots; physical phones untested                |
| Performance targets                | PARTIAL                                         | PARTIAL                                                           | Warm target met; login and fresh API P95 targets unmet                              |

Local product regression: 15 verification groups, PASS; unit tests are counted separately. Staging post-test read-back: 300 orders, 0 hidden, 2 retained profiles/Auth users, 0 disposable users, 2 retained sync runs, 0 running. Output snapshots restored exactly; only scoped fixture rows/identities/audits cleaned. A separate cleanup removed 11 orphan profile-audit entries belonging exclusively to deleted benchmark fixtures; the harness now checks this path. No production cleanup or business writes.

## Quality, deployment and outstanding gates

Implementation commits: 21946ec (private query cache), 4d3e903 (Hide/Restore migration), 1c96f62 and 34faaff (password/login recovery), b074152 (atomic staging), 5492edb (login initial read/admin query overlap). Current application build 5492edb CI PASS: https://github.com/ngmhoang62/SheetOps/actions/runs/41666409435. Preview READY: https://sheetops-git-dev-nguyen-minh-hoang-s-team.vercel.app (sin1). Later test/documentation commits do not release production.

Required gates after clean npm ci are recorded at final delivery: lint, typecheck, 93 unit tests, format check, optimized staging build and GitHub CI. npm audit: 16 moderate development-tool advisories; runtime-only audit zero. No dependency force upgrade, paid plan change, production migration or main merge.

Final local gates after npm ci: lint PASS, typecheck PASS, 93/93 tests PASS (11 files), format:check PASS, optimized build:staging PASS, git diff whitespace check PASS. All 21 built browser JavaScript files were checked against the actual staging server secret, Google private key and cron secret: no matches. The staging server is left running on port 3001. The ordinary build command also passes in the linked CI workflow; no production credentials were used for a local benchmark.

Next release requires owner approval, migration-history review and approved production application of order_visibility before deploying code, verified backup/rollback, full online staging mutation/responsive regression, and acceptance of remaining latency limits. Keep main unchanged until then. Vercel/DB are already Singapore-aligned; no paid infrastructure upgrade is justified by the 2–3 ms SQL plans. Resolve the Preview challenge through operator evidence rather than disabling Auth/RLS/protection.
