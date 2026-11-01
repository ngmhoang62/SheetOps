# Phase 1 verification record

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
- [Repeatable demo walkthrough](UAT.md)
- Unit suite: `tests/domain.test.ts` (deterministic seed, schema/storage validation, dates/amounts/codes, mutations, filters, aggregate consistency, roles/user safeguards, CSV quoting and formula escaping).

Playwright runtime snapshots, console logs, and downloaded CSV are ignored under `.playwright-cli/` and `output/playwright/`. Only the two selected screenshots are tracked. This delivery does not include a Playwright test-runner suite; the observed browser run and repeatable manual UAT are documented separately from the automated unit suite. Storage-denial and corrupt-storage recovery, every user-change dialog, and all browsers were not manually exercised. Their applicable pure domain invariants are unit-tested.

GitHub Actions is configured for the same checks on pushes to `main` and pull requests. Local verification does not imply that a remote Actions run has passed; its status must be checked in GitHub after pushing. No application deployment is part of Phase 1.
