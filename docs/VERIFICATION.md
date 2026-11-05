> Hồ sơ lịch sử của hệ thống gốc, giữ để tra cứu; các ID/domain và trạng thái release tại thời điểm ghi không phải cấu hình cài mới. Người nhận bắt đầu tại [docs/setup](setup/README.md).

# Phase 1 verification record

## Scheduled production cron acceptance — 2026-11-03

PASS: actual scheduled export run e64f6171-36e3-46c1-a803-3fcd966db0cd, trigger_type=cron, key daily:2026-11-03, started 08:37:27 UTC (15:37:27 UTC+7), finished 08:37:33 UTC, success, 300 rows. Transactional export audit exists. Independent read-only Google API checks found canonical seven-column headers, 300 rows each in Export_Orders and Export_Staging, both matching database hash 7a7d74e4ed42c94789cec9fec765892d2f7500d300bf92a84598caf408c959fd. No endpoint was invoked manually for this production gate and Source_Orders was not written.

The temporary 15:00 test is complete. This maintenance checkpoint restores vercel.json to 0 16 * * * (23:00 UTC+7) on main only, with no Phase 3 merge. Old PENDING schedule notes below are historical and superseded by this observed result. Production remains 300 Orders and 2 Auth users; the audit count increased only by the legitimate scheduled export event (306 to 307).

Current acceptance summary: [PHASE_2_ACCEPTANCE.md](PHASE_2_ACCEPTANCE.md). Historical results below retain their original context; the summary records later successful source import, invitation and owner disable acceptance without claiming scheduled production cron has run.

## Production export and scheduled test — 2026-11-03

The owner ran Export Now and observed matching Source business columns, staging and output. Read-only database verification found manual export run `1544dacc-78a3-43fb-882c-c0805cb84b9f`, status success, 300 rows, started 07:22:27 UTC and completed 07:22:32 UTC. The stored seven-column snapshot hash is `7a7d74e4ed42c94789cec9fec765892d2f7500d300bf92a84598caf408c959fd`. An independent readonly-scope Google Sheets API check confirmed both Export_Orders and Export_Staging have the exact canonical seven-column header, 300 rows and that exact stored hash; their six business columns also match Source_Orders, whose hash remains `2e1403702a4d74eac8ec9d78a9ea1dd0a2e4abcb3fd6342459bb9c0b81346fe2`. No Sheets writes or repeat exports were performed. Manual production export is PASS. Matching staging/output is expected; Source has six input columns while exports add updated_at.

At inspection there were 2 persistent sync runs and 306 persistent audit events in PostgreSQL. The Admin endpoints read `sync_runs` (latest 50) and `audit_logs` (latest 100); these limits do not delete older rows. Browser cache clearing, another tab or another browser does not remove database records. No application retention cleanup is configured.

The owner authorized a temporary 15:00 UTC+7 cron test today. The configured UTC schedule is temporarily `0 8 * * *`; Hobby can invoke anywhere in the scheduled hour. Scheduled execution remains PENDING until an actual cron-triggered database run and output read-back are observed. Restore the normal 23:00 schedule after success/failure or after the 16:10 observation deadline. Do not invoke the cron endpoint manually to satisfy this gate.

## Disabled-account UX follow-up — 2026-11-03

The owner confirmed Admin disable denies the invited Viewer access (production UAT PASS), but the old proxy returned a bare 403 text page. The new flow separates revoked accounts from active users lacking an admin role. Revoked page requests clear the current browser's project session cookies, attempt local-scope sign-out and redirect to `/login?reason=account_disabled` (or `account_unavailable` for a missing profile). Login displays a static Vietnamese explanation. Session refresh/focus detection uses the same flow; APIs still enforce current roles/RLS and return structured 401/403 responses. Existing 60-second polling is retained, not realtime push revocation.

Verification: lint, typecheck, format, 71 unit tests and production build PASS. Six new proxy tests verify session-cookie chunks, local logout, logout-service failure fallback, redirect-loop avoidance, active Viewer restrictions and message allowlisting. A local production browser displayed the complete login page with the disabled notice, matching server-rendered HTML. A read-only inspection found the test Viewer currently active again; this work did not change its state. Fresh production redirect behavior after deployment has not yet been exercised by the owner.

Read-only business evidence: Orders = 300 total / 300 active. `sync_runs` contains successful manual import of 300 rows at 04:53:51 UTC on 2026-11-03. No export run for this current dataset was found; scheduled production cron remains pending. Earlier disposable-fixture export and cron-invocation evidence is preserved below.

## Invitation follow-up — 2026-11-03

| Check                                                      | Status           | Actual evidence                                                                                                                                                                                                                                                                      |
| ---------------------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Reproduce invitation failure                               | PASS             | Direct `inviteUserByEmail` to the owner-approved test address returned HTTP 504 `Gateway Timeout`; Supabase Auth logs showed `request_timeout` / `context deadline exceeded` (06:47–06:55 UTC). No successful invitation/account existed before retry.                               |
| Root cause and configuration correction                    | PASS             | Owner reported `smtp-relay.brevo.com:586`, then changed only the port to 587. Brevo officially documents 587/465 for Supabase. The same API operation succeeded immediately after this change.                                                                                       |
| SMTP to inbox                                              | PASS             | Real invitation accepted at 06:58 UTC; owner explicitly confirmed receiving the email. No token or SMTP password logged.                                                                                                                                                             |
| Production APP_ORIGIN                                      | PASS             | Read the nonsecret production variable from the existing Vercel project: `https://sheetops.vercel.app`. Local origin is separately `http://localhost:3000`.                                                                                                                          |
| Invitation fragment handling                               | PASS (code/unit) | Installed SSR client forces PKCE; installed Auth client rejects an implicit fragment under PKCE. Updated accept page explicitly establishes the invitation session, scrubs URL credentials, validates `getUser` and checks the current application profile. No Magic Link switch.    |
| Error classification                                       | PASS (code/unit) | Timeout, email rate limit, existing account and profile provisioning errors now have distinct sanitized codes/messages. Server diagnostics include only stage, safe code and provider HTTP status.                                                                                   |
| Site URL / allowed redirects / live email template         | BLOCKED          | Not independently read from the Supabase dashboard; production APP_ORIGIN alone does not prove all three are correct.                                                                                                                                                                |
| Admin UI invitation, Viewer role, password setup and login | PASS             | Owner confirmed completing invitation/password setup and a fresh login on production. Read-only verification found email_confirmed_at 07:06:06 UTC, password present (boolean only), last_sign_in_at 07:09:29 UTC, role viewer and is_active true. No password/hash/token retrieved. |
| Disable/revoke the invited account                         | PASS (owner UAT) | Owner confirmed Admin disable prevented Viewer access. Bare denial-page UX was corrected in the later follow-up above; the new production redirect awaits an owner retest.                                                                                                           |

No Orders, Source_Orders or managed export tabs were modified. A read-only database count found 300 existing Orders (imported since the prior seed task); all remain intact. No cloud cleanup suites were run. The owner-approved test account is retained as an active Viewer provisioned through the Admin UI; no fabricated Admin session or audit attribution was used.

Local follow-up quality gates: lint, strict typecheck, formatting and production build passed; 65 unit tests passed (8 new invitation cases). The first sandbox build hit Windows `EPERM` creating a prerender output directory; rerunning the same build with approved filesystem access passed. Browser navigation to `/auth/accept#error=access_denied` removed the fragment and displayed the invalid/expired/unprovisioned message with password input and submit button disabled. This proves the invalid-link branch, not successful inbox-to-password acceptance.

Application commit `7c79c6e97020778d07035c28be4b8870e73df60f` was pushed to main and production deployment `dpl_GNqBg9gRoTCYFfYYDQkacrf5dNT2` reached READY. The canonical `https://sheetops.vercel.app/auth/accept` returned HTTP 200 and the updated password form markup. Local HTTP checks also confirmed anonymous invitation POST = 401, foreign-origin invitation POST = 403, and invalid callback = 307 to the fixed login error URL with private/no-store and no-referrer headers. Supabase Auth logs recorded `user_invited`, HTTP 200 at 06:58:20 UTC after the port correction. The owner subsequently confirmed successful password setup and a fresh login. Read-only Auth/profile evidence corroborates that confirmation as recorded above. Full dashboard configuration inspection remains pending; the owner subsequently confirmed disable/revocation denial, with redirect UX corrected in the follow-up above.

Verified locally on **2026-11-02 (Asia/Bangkok, UTC+7)** in the selected project root, using Node.js 24.19.0 and npm 11.17.0 on Windows. No Supabase, Google Cloud, Google Sheets, or Vercel resources were accessed or modified.

## Automated checks

| Check                       | Result                                                                                                                                     |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Dependency installation     | Completed; exact versions and npm lockfile committed                                                                                       |
| ESLint                      | Passed, zero warnings                                                                                                                      |
| Strict TypeScript           | Passed                                                                                                                                     |
| Vitest                      | 33 tests passed in one file                                                                                                                |
| Production build            | Passed; all app routes prerendered successfully                                                                                            |
| Prettier                    | Passed                                                                                                                                     |
| Production dependency audit | `npm audit --omit=dev --audit-level=moderate`: zero vulnerabilities                                                                        |
| Full dependency audit       | 16 moderate development-tool findings stemming from `minimatch` glob amplification advisory GHSA-g3hv-75wg-m249; no high/critical findings |

The lint stack is pinned to ESLint 9.39.5 to satisfy the currently installed Next.js React/import/accessibility plugin peer ranges. ESLint 9 is upstream end-of-life. TypeScript 6.0.3 satisfies the installed parser's `<6.1.0` requirement; TypeScript 7 was not retained. Upgrade these tools together once their peer ranges allow it. The audit's suggested force fix would downgrade incompatible core tooling; no force fix or unsupported major dependency override was applied. These development-only findings remain a documented maintenance limitation.

Initial restricted Windows runs hit `EPERM` while installing packages and writing generated Next.js route files. Retrying those operations with the required local Windows access succeeded. The successful build ran with Turbopack and checked TypeScript. No project configuration was weakened to bypass checks.

## Browser checks actually observed

Tested the **production build** with Playwright CLI in Chromium, at 1440×1100 desktop and 390×844 mobile viewport sizes.

- `/` without a session redirected to `/login`; Admin entered the workspace.
- Initial KPIs: 300 total, 199 completed, 1,014,200,000 VND revenue, 66.3% completion. Distribution: 69 pending, 199 completed, 32 cancelled. Dashboard rendered ten recent orders and twelve revenue months.
- Blank customer/amount submission displayed field-level errors. A completed order `SO-UAT-001` for 1,234,567 VND increased KPIs to 301/200/1,015,434,567 VND/66.4%. Values survived a browser reload.
- Editing its amount to 2,000,000 VND updated dashboard and report revenue to **1,016,200,000 VND**.
- Pagination advanced to rows 21–40. Amount sorting produced descending amounts. Searching for the test order from another page reset to page 1 and returned one record.
- CSV download produced 301 rows. Reading the downloaded file with `Import-Csv` confirmed the test amount was 2,000,000 VND and completed-order totals were exactly **1,016,200,000 VND**, matching the UI.
- A 2027 date range produced zero KPIs, three empty report sections, and disabled CSV export.
- Delete opened a confirmation dialog. Confirming soft deletion restored initial KPIs (300/199/1,014,200,000 VND/66.3%). Domain tests also verified deleted-order exclusion from CSV and code reservation.
- Viewer navigation contained only Dashboard, Orders, Reports; no order mutation controls; direct `/users` showed simulated forbidden. Editor had 20 visible edit controls on the first orders page and direct `/sync` was forbidden. Domain tests cover all three admin paths and mutation role guards.
- Admin Sync Center showed unconfigured state, both real actions disabled, and no run history.
- Users showed three seeded profiles and disabled role/disable controls for the active Admin. Adding `Thành viên mẫu / uat@example.com` created a fourth local profile with explicit no-email messaging.
- Settings activity log contained the create, edit, delete, and user-create events. Confirmed reset restored exactly 300 orders, three profiles, and a null demo session; login was shown.
- Final mobile login/dashboard had no document horizontal overflow. Mobile menu opened and selecting Orders closed it. The 705px table remained in its scroll container. A 358px order dialog fit the 390px viewport, focused the order code, accepted Tab navigation, and closed with Escape.
- The first build's only console error was missing `favicon.ico`. An app icon was added; the final build exposes `/icon.svg` and the final browser session had zero console errors or warnings.

## Evidence and repeatability

- [Desktop dashboard](screenshots/dashboard-desktop.png)
- [Mobile dashboard](screenshots/dashboard-mobile.png)
- [Orders table](screenshots/orders-desktop.png)
- [Repeatable demo walkthrough](UAT.md)
- Unit suite: `tests/domain.test.ts` (deterministic seed, schema/storage validation, dates/amounts/codes, mutations, filters, aggregate consistency, roles/user safeguards, CSV quoting and formula escaping).

Playwright runtime snapshots, console logs, and downloaded CSV are ignored under `.playwright-cli/` and `output/playwright/`. Only selected review screenshots are tracked. This delivery does not include a Playwright test-runner suite; the observed browser run and repeatable manual UAT are documented separately from the automated unit suite. Storage-denial and corrupt-storage recovery, every user-change dialog, and all browsers were not manually exercised. Their applicable pure domain invariants are unit-tested.

GitHub Actions is configured for the same checks on pushes to `main` and pull requests. Local verification does not imply that a remote Actions run has passed; its status must be checked in GitHub after pushing. No application deployment is part of Phase 1.

## Readability refinement — 2026-11-02

Increased the shared typography scale across login and all six workspace pages: navigation/body/table data 15–16px, KPI labels 18px, section headings 20px, chart ticks 14px. Removed page subtitle descriptions and redundant order/chart/KPI captions while retaining revenue semantics and demo warnings. Resized cards, controls, rows, sidebar, dialogs and responsive grids; phone KPIs stack in one column to preserve legibility.

Validated ESLint, strict TypeScript, all 33 unit tests and production build. Build needed the same Windows filesystem access documented above. Browser review covered all six workspace routes at 1440px desktop and 390px mobile; no whole-document horizontal overflow on any mobile route. Desktop dashboard measured 15px navigation, 18px KPI labels and 20px section titles. The linked screenshots reflect the updated layout.

## Phase 2 verification — 2026-11-02

Status: **IMPLEMENTED — CLOUD VERIFICATION PENDING**. This section supersedes Phase 1 behavior descriptions for the current application; earlier sections are retained as historical evidence.

### Automated and real-service results

| Item                           | Status  | Evidence                                                                                                                                                                                                                                                                                                     |
| ------------------------------ | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Clean dependency install       | PASS    | `npm ci` installed 517 packages from lockfile. Windows native DLL locking required temporarily stopping only the verified SheetOps dev processes, then restarting the dev server.                                                                                                                            |
| ESLint / strict TypeScript     | PASS    | Zero lint warnings; `next typegen && tsc --noEmit`.                                                                                                                                                                                                                                                          |
| Unit tests                     | PASS    | 48 tests in two files, including all 33 retained Phase 1 tests and exact BIGINT/import/export/cron cases.                                                                                                                                                                                                    |
| Production build               | PASS    | Next.js 16.4.3 built all pages, proxy and protected API handlers.                                                                                                                                                                                                                                            |
| Formatting                     | PASS    | Prettier check; SQL and environment examples retain their native formats.                                                                                                                                                                                                                                    |
| Supabase migrations            | PASS    | Five applied migrations on `ubaxgkqkfcrqbyshkidz`, versions aligned with local filenames; public business tables have RLS and guarded grants. No automatic seed.                                                                                                                                             |
| Supabase Auth / RLS / CRUD     | PASS    | `test:cloud` passed 22 real checks with temporary Admin/Editor/Viewer accounts. Includes password auth, anonymous denial, Viewer write denial, Editor Admin-RPC denial, self-elevation/self-demotion denial, disable revocation with an existing JWT, exact money, soft deletion and transactional auditing. |
| Database import transaction    | PASS    | Invalid two-row batch rolled back entirely; valid fixture batch imported atomically; populated-table initial-import check rejected. Source_Orders was not modified.                                                                                                                                          |
| Browser/API E2E                | PASS    | `test:e2e` passed 16 checks against the production build on localhost:3001, using actual Supabase and Google services. Login, create, refresh, SQL KPI/report update, edit, role/API/HTTP-403 protection, deletion, CSV/audit exclusion, logout and external-tab restoration all passed.                     |
| Google Sheets connection       | PASS    | Service account read all three existing tabs; canonical Source header confirmed.                                                                                                                                                                                                                             |
| Real Sheets import from source | BLOCKED | Source_Orders initially has zero data rows. Owner must supply development rows and a permanent Admin. Parser/database import passes are separate evidence.                                                                                                                                                   |
| Google Sheets export           | PASS    | Two real manual exports staged, read back, atomically published and verified one exact snapshot row without duplicates. Next cron-triggered snapshot excluded the soft-deleted row.                                                                                                                          |
| Google API failure             | PASS    | `test:sync-failure` invoked the actual export service with a real read-only Google token: Google returned 403, persisted run was failed, Orders count and all three sheet tabs were unchanged. The isolated failure run was cleaned up by its unique key.                                                    |
| Cron manual invocation         | PASS    | Missing/wrong bearer headers returned 401. A correct environment secret invoked the real shared service and produced a verified zero-row snapshot; duplicate same-date invocation reused the run. Secrets never appeared in URLs/logs.                                                                       |
| Scheduled production execution | BLOCKED | Not yet observed; requires production Google/cron configuration, registration verification and the scheduled time.                                                                                                                                                                                           |
| Permanent owner Admin          | BLOCKED | None existed. Disposable test accounts were removed; trusted bootstrap instructions are in DATABASE.md.                                                                                                                                                                                                      |
| Invitation delivery            | BLOCKED | Server invitation/acceptance implementation exists; no authorized real recipient/SMTP inbox-delivery test was performed.                                                                                                                                                                                     |
| Vercel production runtime      | BLOCKED | Existing project and Singapore URL verified. Initial environment metadata lacked Google variables, spreadsheet ID, CRON_SECRET, BUSINESS_TIMEZONE and APP_ORIGIN. Owner must configure privately and redeploy. Build/deployment status alone does not close this gate.                                       |

The successful cloud test had 22 PASS results. The successful E2E had 16 PASS results, including restoration of both managed sheet tabs with readback. Every fixture cleanup was scoped to generated IDs/codes/run keys; Source_Orders stayed untouched. Final database inspection is recorded again before delivery. No permanent credentials were created or printed.

Earlier attempts surfaced and corrected decimal validation exceptions, local proxy Origin reconstruction and login/logout navigation synchronization. Some fixture setup attempts failed with AuthRetryableFetchError/status 0; successful real-service runs are reported separately. Automatic approval initially rejected an E2E script lacking Sheets restoration; the corrected script restores and verifies both managed tabs before cloud fixture cleanup and was approved and exercised successfully.

Supabase security advisor after hardening reported no WARN/ERROR findings; one INFO is intentional RLS-with-no-policy on the private, ungranted mutation quota table (only the guarded owner-executed function writes it). Performance advisor reported unused-index INFO on a nearly empty project; operational indexes were retained. See [security advisor explanation](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy) and [index guidance](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index).

### PRD end-to-end acceptance checklist

| Step                                    | Status  | Observed evidence / remaining gate                                             |
| --------------------------------------- | ------- | ------------------------------------------------------------------------------ |
| 1 Admin login                           | PASS    | Temporary real Auth account through browser                                    |
| 2 Sheets connection                     | PASS    | Actual API metadata read                                                       |
| 3 Preview source import                 | PASS    | Empty source read, header validation and row errors                            |
| 4 Import actual source rows             | BLOCKED | Owner source has no rows; database transaction independently passed            |
| 5 Imported source Orders in UI          | BLOCKED | Depends on step 4                                                              |
| 6 KPIs from real records                | PASS    | Database fixture and exact SQL aggregates                                      |
| 7 Editor login                          | PASS    | Temporary real Auth account                                                    |
| 8–10 Create/edit/persist                | PASS    | Browser/API/database fixture                                                   |
| 11 Dashboard/Reports refresh            | PASS    | Exact value above JS safe range, then 2,000,000 VND edit                       |
| 12 Audit                                | PASS    | Three persisted order events                                                   |
| 13–15 Viewer and direct mutation denial | PASS    | Read-only UI, 403 APIs/pages and RLS                                           |
| 16–17 Manual export / verified Sheets   | PASS    | Actual staging and output readbacks                                            |
| 18–20 Delete / repeat / no duplicates   | PASS    | Real snapshot checks                                                           |
| 21 Sync Center data                     | PASS    | Real run records/API, no fake success                                          |
| 22–23 Google failure / no data loss     | PASS    | Real provider 403; Orders and tabs unchanged                                   |
| 24 Retry with valid authorization       | PASS    | Valid-scope exports and repeat snapshots independently verified                |
| 25 Cron invocation                      | PASS    | Real local invocation of shared service, idempotency                           |
| 26 Production business runtime          | BLOCKED | Missing host environment configuration and permanent account/source-data gates |

This is not COMPLETE — VERIFIED END-TO-END. Owner setup, inbox delivery, populated real-source import and scheduled production execution remain explicitly unverified.

Final fixture inspection after successful tests: Auth users = 0, profiles = 0, orders = 0, sync runs = 0 and private mutation-quota fixtures = 0. Both managed tabs matched their pre-test content after E2E cleanup; Source_Orders was unchanged. [Phase 2 browser screenshot](screenshots/phase2-dashboard.png) shows an authenticated temporary test Admin after deleting its fixture order; the account was then removed.

Secret review compared actual local server-secret values against all version-controlled/unignored candidate files and built client chunks: zero matches. `.env.local` remained ignored. Runtime browser artifacts and Supabase CLI cache are ignored. Production-only environment values were inspected as metadata; no private credentials were copied into documentation, messages or commit content.

### Post-push deployment evidence

Later evidence is tracked separately: PHASE_2_ACCEPTANCE.md records subsequent production acceptance; PERFORMANCE_RESULTS.md records the current dev-only performance/visibility work, 300 retained staging orders, 93 unit tests and current online verification blockers. Historical empty-fixture counts and initial owner-setup blockers below/above are not the present environment state.

Vercel deployment `dpl_BLEr21ud2Aw1bvUvpKKjKffv6LsV` reached **READY** for production branch main at application checkpoint `edbfcc16b937c6c012d0f50f4b08a6d3fdddf4c3`. [Deployment inspection](https://vercel.com/nguyen-minh-hoang-s-team/sheetops/BLEr21ud2Aw1bvUvpKKjKffv6LsV). This closes the cloud build/deploy check for that checkpoint, not the owner-configuration, populated-source import, inbox-delivery or scheduled-runtime gates above. Subsequent documentation-only commits do not change application behavior.
