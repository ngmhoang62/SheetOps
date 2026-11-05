> Hồ sơ lịch sử của hệ thống gốc, giữ để tra cứu; các ID/domain và trạng thái release tại thời điểm ghi không phải cấu hình cài mới. Người nhận bắt đầu tại [docs/setup](setup/README.md).

# UI annotations and paginated audit verification

Date: 2026-11-04. Development branch only. Local staging production build: `http://127.0.0.1:3001`; staging Supabase `msrmoffrfjhqijdfzzwm`. No production migration, release, business mutation, firewall or Deployment Protection changes.

## Changes

1. The sidebar chip identifies the current organization's Settings name. This single-organization application has no workspace switcher. Removed the misleading chevron and clarified the subtitle to `Tổ chức nội bộ`.
2. Removed the separate unpadded, full-width Orders visibility selector. The existing padded status filter includes `Đang hoạt động` and `Đã ẩn` in a display group, with a compact desktop width. Hidden remains a `deleted_at` visibility condition, never a new business status. Analytics filters retain their original business statuses.
3. Reports summary cards align to their own content height instead of stretching to the twelve-month table. The CSV note clarifies active-only export.
4. Audit history is accessible through server-filtered pagination, default 50 rows, options 20/50/100. Filters: actor role, action, resource type, UTC+7 date range, actor name or order code. Filtering precedes counting, stable sorting (`created_at DESC, id DESC`) and pagination; page is clamped server-side. Only matched rows fill a page. A total of 36 matches means 36 rows, never fourteen unrelated events.
5. Columns show time, actor name, actor role, action, human resource label and safe change summary. Removed the UUID display column. BIGINT money remains exact decimal strings. No raw before/after JSON is exposed by the paginated API.
6. New audit records capture actor name and role from trusted profiles inside the inserting database transaction. Existing history is not rewritten. Old events use the current profile with an explicit `Hiện tại` badge; this does not claim to reconstruct historical roles. System/unknown actors are explicit.

## Local evidence

`RUN_AUDIT_TESTS=1 npm run test:audit-ui` uses two temporary synthetic staging identities and ninety owned fixture orders. It deletes only recorded fixture IDs and verifies retained Orders and audit hashes after cleanup. It does not reset tables or users, change Source, run import/export writes or touch production.

| Check                                                                                                 | Result |
| ----------------------------------------------------------------------------------------------------- | ------ |
| 70 matching Admin events, filtered before pagination: 50 + 20, unique IDs, page 999 clamped to page 2 | PASS   |
| Snapshot actor role/name survives a fixture role/name change                                          | PASS   |
| Viewer cannot execute audit RPC; historical events explicitly use current-profile fallback            | PASS   |
| Browser page 2 → role filter resets to page 1 and fills 50 matching rows                              | PASS   |
| Browser Editor filter returns exactly 20 matching historical events                                   | PASS   |
| Human names/roles/targets replace UUID display; no object-ID header                                   | PASS   |
| Unified Hidden filter returns only the owned hidden fixture, compact width ≤240 px                    | PASS   |
| Reports status card is shorter than the monthly table; no stretched blank card                        | PASS   |
| Loaded Settings/audit at 1366 px and 390 px: no document overflow; table scrolls inside its region    | PASS   |
| Retained orders, owner-hidden state and full audit history match their pre-test hashes exactly        | PASS   |

Local ignored evidence: `output/annotations/verification.json`, loaded desktop/mobile screenshots. Existing retained state: 300 orders (299 active, one owner-hidden), two profiles, 312 audit records before this task's fixtures. Synthetic fixture screenshots temporarily include fixture counts, not a permanent seed.

Security Advisor after the additive staging migration has no new finding: existing private mutation-limit table has deliberate RLS/no public policy (INFO); leaked-password protection remains WARN under the previously documented plan limitation. No policy was relaxed.

## Release gate

Applied to staging only: `20261103174506_audit_pagination.sql`. It adds nullable actor snapshot columns, a private capture trigger, and an authenticated Admin-only, SECURITY INVOKER paginated RPC. Existing RLS remains in force. Old API consumers must adopt `{events,total,page,pageSize}` instead of an array; the application Settings consumer is updated together.

The connected migration service records this staging migration as version `20261103174946`, name `audit_pagination`. Verify name/content and the local-to-remote history mapping before future CLI deployment; do not blindly reapply it or repair production history. No history repair was performed here.

Before an independently approved production release, review/apply the pending `order_visibility` migration from the prior work and then `audit_pagination` in order. Apply this additive migration before deploying the new audit consumer. Rolling the application back can leave these additive columns/functions in place; do not delete audit history. Current owner authorization does not allow a dev → main merge.

See `RETRY_BEHAVIOR.md` for the exact existing retry and uncertain-commit behavior. Automated quality, CI and bounded Preview results are recorded below.

## Quality and query evidence

- Local lint, typecheck, 108 tests across fourteen files, full format check and staging production build: PASS.
- Read-only staging `EXPLAIN (ANALYZE, BUFFERS)` under the retained Admin's authenticated role: `audit_page(1,50,...)` execution 12.003 ms, planning 0.046 ms, shared buffers hit 993. This is one query observation, not a P50/P95 or browser/network benchmark; no speculative index was added.
- Local calibration of the bounded annotation smoke: PASS at `2026-11-03T18:09:11Z` (2026-11-04 01:09 UTC+7). Ten checks: login, current active-count Dashboard, compact hidden filter, Orders, report height, Reports, live paginated audit, Settings, CSV BOM/header and logout. Forty-five total requests, twenty-two application requests, one maximum controlled request per lane; fifteen speculative prefetches skipped. Retained data read-back unchanged.
- The focused synthetic audit/browser suite and paced smoke are complementary: detailed role/pagination tests run locally; Preview is limited to one paced smoke without business writes. Pacing timings are deliberately excluded from product performance comparisons.

## Verified Preview

- Tested application head: `9b1f4591d4b1196878cbfe027f4a9b36dbb6350d` (`b1a7852` contains implementation; `9b1f459` adds verification and retry documentation).
- [GitHub Actions](https://github.com/ngmhoang62/SheetOps/actions/runs/41691363676): completed/success for this dev head.
- Vercel deployment `dpl_7Nw5jhqcaSN1vEPFQSzNgGcij9xr`: READY, dev, Preview target, region sin1. [Stable Preview](https://sheetops-git-dev-nguyen-minh-hoang-s-team.vercel.app), immutable deployment `sheetops-bxrlyv40z-nguyen-minh-hoang-s-team.vercel.app`.
- One bounded online annotation smoke: **PASS**, completed `2026-11-03T18:14:05.540Z` (2026-11-04 01:14 UTC+7). Same ten functional checks as local, including the actual hidden-order filter, independent report card height, live paginated audit (50 rows, names, roles, human targets), CSV and logout.
- Forty-four total requests, twenty-one application requests, application concurrency one, asset concurrency one, peak controlled concurrency two; fifteen unrelated speculative prefetches skipped. No Challenge/429 observed in this run. No protection policy or rule changed; existing authorized CLI OIDC was kept in memory and scoped to the Preview origin.
- Retained Orders, profiles and sync-run hashes unchanged after scoped fixture cleanup. No Orders/Sheets mutation, invitation or initial import was performed by this Preview smoke. Detailed pagination/role-history mutations were verified on Local Staging with owned synthetic fixtures, not on Preview or production.
- Existing initial-import acceptance, broad performance results and external provider workflow evidence remain in their prior reports; this narrow UI follow-up does not claim to rerun every workflow.
