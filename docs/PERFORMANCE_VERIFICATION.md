> Hồ sơ lịch sử của hệ thống gốc, giữ để tra cứu; các ID/domain và trạng thái release tại thời điểm ghi không phải cấu hình cài mới. Người nhận bắt đầu tại [docs/setup](setup/README.md).

# Local staging performance review — 2026-11-03

Historical first optimization pass. Current cache/visibility work and final measured acceptance are in PERFORMANCE_BASELINE.md, PERFORMANCE_ENGINEERING.md and PERFORMANCE_RESULTS.md. The earlier no-cache statements and empty-fixture counts below describe that earlier checkpoint, not the current retained staging environment.

## Scope and method

Work stays on dev; no production release or business writes. The initially running port 3000 used production configuration, so it was inspected read-only. Mutating checks use the independent msrmoffrfjhqijdfzzwm staging project and declared staging Sheet, on port 3001. Owner QA account is retained. Source_Orders is never modified. Disposable fixtures and managed output snapshots are restored by the existing guarded E2E script.

Measure click-to-data completion, not shell paint. E2E login waits for the summary response and the loading indicator to disappear. Sidebar samples wait for the target API response/body and loading completion. No stale business-data cache, cross-user cache or artificial loading removal was introduced. Use a built staging bundle to exclude Next development compilation from benchmark samples. These local results are not a production SLA.

## Findings and changes

- API requests previously performed getUser in proxy and again in their authenticated handler. Proxy now leaves API authentication to the cookie-aware handler (or the cron bearer check), while retaining environment isolation and private/no-store. This removes an entire redundant Auth trip from reads and writes. Handler role, active-profile, RLS, mutation quota and transactional audit checks remain.
- Password login previously performed another getUser after successful signInWithPassword, then a separate workspace/session request and router refresh. The verified login response now includes the fresh active profile and organization, obtained concurrently, and initializes workspace state directly. No session request is required after successful submission.
- Page proxy uses signature-verified getClaims, as described in [Supabase SSR guidance](https://supabase.com/docs/guides/auth/server-side/creating-a-client?queryGroups=framework&framework=nextjs). Fresh database profile checks still enforce role and disable state on every page request. API handlers retain getUser; no user-editable metadata authorizes actions. Asymmetric signing keys allow cached public-key verification; symmetric projects still contact Auth. Invalid-claims rejection is covered by a regression test.
- Orders, dashboard and workspace reads overlap their RLS-protected data query with the fresh profile check after trusted Auth verification. Nothing is returned unless authorization succeeds. Mutations remain sequentially authorized before writing; no privileged client is used for business reads.
- Removed the sidebar informational card, its unused icon import and card-specific CSS. Shared login styles remain in use.
- Auth transport/5xx failures now return 503 AUTH_UNAVAILABLE; rate limits return 429. They previously appeared as incorrect credentials. No credentials or provider error objects are logged.
- E2E response waiting now handles its rejection immediately, allowing finally cleanup when login fails. A prior unhandled waiter left three synthetic Auth fixtures; a guarded recovery removed only those task-created fixtures, preserving the owner QA account.

## Observations

First optimization checkpoint: 19 E2E checks PASS, including actual Sheets exports/read-back, duplicate invocation, roles, disabled session, source preservation, output restoration and laptop/mobile dashboard. Login-to-loaded-dashboard samples: Admin 5602 ms, Viewer 4376 ms, Editor 7418 ms. Post-submit session requests: zero.

Second checkpoint (verified-claims page proxy and parallel read queries): successful browser Preview/Confirm import of exactly 300 deterministic orders; Sync Center fits 1366 px and 390 px. Admin login-to-data: 3970 ms. With 300 orders, three sidebar samples per page:

| Page      | Samples (ms)   | Median (ms) |
| --------- | -------------- | ----------- |
| Orders    | 668, 1451, 915 | 915         |
| Reports   | 562, 799, 575  | 575         |
| Dashboard | 577, 555, 790  | 577         |

These checkpoints use different fixtures and network conditions; they do not establish a controlled percentage improvement against the original application. No authenticated timing baseline was collected before the first edits. Structural request-count reduction is established; instantaneous navigation is not achieved. A subsequent Reports assertion timed out, and another attempt observed Auth transport failure and a 10.6-second failed login response. Treat these as real reliability/latency limits, not successful samples. Final rerun evidence follows when available.

Owner-browser check on 127.0.0.1:3001: successful staging login and Sheets connection with Source_Orders, Export_Orders and Export_Staging. Original in-app tab became stale after port 3000 stopped; a fresh staging tab worked. No browser security protection was weakened.

## Final verification

- Final diagnostic staging run: **20/20 E2E PASS**, including browser import of 300 orders, repeated real Sheets exports/read-back, roles, disabled sessions, laptop/mobile dashboard and Sync Center, source preservation and managed output restoration.
- Final sidebar samples on 300 orders: Orders 360/603/1139 ms (median 603); Reports 1195/341/601 ms (median 601); Dashboard 340/930/552 ms (median 552). Login-to-loaded-data: Admin 4557 ms, Viewer 4187 ms, Editor 1599 ms; zero post-submit session requests for all roles. Network variance is material; these are samples, not percentile guarantees.
- Opt-in upstream diagnostics observed successful Auth waits up to 4922 ms, database header waits over 2500 ms, and a failed database transport after 10361 ms. This supports upstream/network latency as a contributor; it does not prove the sole cause of the earlier Reports stalls. Timing logs contain only service category, status and elapsed time, never URLs/query strings/identities/credentials.
- Server-side Auth/database fetches now have a 12-second per-attempt deadline and preserve caller cancellation. This bounds a transport attempt, not an entire SDK operation or end-to-end request. No new automatic write retries were added. A timeout does not prove a remote mutation failed; reconcile the authoritative row/run before retrying.
- Database/profile transport errors no longer masquerade as a disabled account. Existing workspace state survives transient refresh failures; an initially unverified workspace shows an explicit retry state without rendering business data. Invalid/expired claims and actual disabled accounts still fail closed. API handlers continue to perform trusted authorization.
- Independent post-test database read-back: Orders=0, Auth users=1, profiles=1, sync_runs=0; retained owner QA account preserved. A failed pre-final cleanup had silently left one E2E order and three test users; guarded recovery removed only those actors and their fixture order. Cleanup now checks API errors and discovers rows by exact run-owned actor IDs, including ambiguous import outcomes.
- Final local unit suite **86 PASS**, lint/typecheck and optimized staging build PASS. Initial sandbox build failed with filesystem EPERM; the same build outside the sandbox passed. No production migration, export/import, cleanup, release or credential change occurred. Output artifacts and local recovery tooling remain Git-ignored.

## Reproduction and remaining limits

Run npm run dev:staging for isolated development on port 3001, or npm run build:staging followed by npm run start:staging for measurements. Both load only the guarded staging configuration. With a clean synthetic staging database, RUN_CLOUD_TESTS=1 npm run test:e2e performs the scoped test and emits sanitized timings. Do not run against production, a populated staging database or concurrent manual QA mutations.

Google publication remains staged, read-back verified and lease-checked; those safety steps are deliberately retained. No unsupported index changes, write batching, quotas removal or caching of permissions were introduced. Remote Auth/Google latency and network interruptions remain external dependencies. Further tuning should begin with per-service timing and a controlled same-data baseline, rather than broad caching or a claim of instant loading.
