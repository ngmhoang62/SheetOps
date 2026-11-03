# Performance baseline — 2026-11-03

Application baseline: dev 328e4b8. Before application refactoring; only the repeatable harness and dependency preparation were added. Chromium desktop 1366x900; local staging optimized build and protected Vercel Preview sin1, independent Singapore Supabase. Existing 300 QA orders retained, only temporary benchmark identities removed. Source/exports untouched. Each navigation has 20 samples; P95 uses nearest rank, includes slow successful samples. Login N<20 has no P95 claim. UI means target heading visible; data means response complete and initial-loading indicator absent. This distinction avoids equating shell paint with loaded data.

## baseline-local

| Metric               |   N | P50 ms | P95 ms |
| -------------------- | --: | -----: | -----: |
| login_data           |   1 |   6697 |    N/A |
| login_form_to_data   |   1 |   6721 |    N/A |
| Đơn hàng_ui          |  20 |     82 |    102 |
| Đơn hàng_data        |  20 |    565 |    854 |
| Báo cáo_ui           |  20 |     78 |     94 |
| Báo cáo_data         |  20 |    570 |   1755 |
| Người dùng_ui        |  20 |     82 |    124 |
| Người dùng_data      |  20 |    679 |   1287 |
| Đồng bộ dữ liệu_ui   |  20 |     63 |     73 |
| Đồng bộ dữ liệu_data |  20 |    659 |   2782 |
| Cài đặt_ui           |  20 |     63 |     78 |
| Cài đặt_data         |  20 |    432 |   1577 |
| Tổng quan_ui         |  20 |     55 |     96 |
| Tổng quan_data       |  20 |    561 |   4143 |

Requests captured: 124. Raw sanitized samples remain under ignored output/performance/baseline-local.json. No credential/cookie/header values stored.

## baseline-preview

| Metric               |   N | P50 ms | P95 ms |
| -------------------- | --: | -----: | -----: |
| login_data           |   1 |   3436 |    N/A |
| login_form_to_data   |   1 |   3464 |    N/A |
| Đơn hàng_ui          |  20 |    109 |    139 |
| Đơn hàng_data        |  20 |    437 |   2332 |
| Báo cáo_ui           |  20 |     99 |    114 |
| Báo cáo_data         |  20 |    389 |    927 |
| Người dùng_ui        |  20 |     91 |    122 |
| Người dùng_data      |  20 |    445 |   1612 |
| Đồng bộ dữ liệu_ui   |  20 |     60 |     80 |
| Đồng bộ dữ liệu_data |  20 |    377 |    583 |
| Cài đặt_ui           |  20 |     67 |     90 |
| Cài đặt_data         |  20 |    437 |    985 |
| Tổng quan_ui         |  20 |     78 |    125 |
| Tổng quan_data       |  20 |    420 |   2531 |

Requests captured: 124. Raw sanitized samples remain under ignored output/performance/baseline-preview.json. No credential/cookie/header values stored.

## baseline-login-local

| Metric               |   N | P50 ms | P95 ms |
| -------------------- | --: | -----: | -----: |
| login_data (success) |   4 |   1360 |    N/A |
| Đơn hàng_ui          |   1 |    281 |    N/A |
| Đơn hàng_data        |   1 |   1256 |    N/A |
| Báo cáo_ui           |   1 |     83 |    N/A |
| Báo cáo_data         |   1 |    314 |    N/A |
| Người dùng_ui        |   1 |     96 |    N/A |
| Người dùng_data      |   1 |    696 |    N/A |
| Đồng bộ dữ liệu_ui   |   1 |     54 |    N/A |
| Đồng bộ dữ liệu_data |   1 |    618 |    N/A |
| Cài đặt_ui           |   1 |     61 |    N/A |
| Cài đặt_data         |   1 |   4293 |    N/A |
| Tổng quan_ui         |   1 |     89 |    N/A |
| Tổng quan_data       |   1 |   1091 |    N/A |

Requests captured: 21. Raw sanitized samples remain under ignored output/performance/baseline-login-local.json. No credential/cookie/header values stored.

## Prioritized bottlenecks

1. useResource resets data to null on every mount/refetch; no reuse on warm navigation. Each warm visit pays a fresh authenticated network round trip.
2. Loading is conflated with background refreshing; orders replaces its entire table, losing usable previous content.
3. Mutations bump one global revision, refetching unrelated resources; no selective cache invalidation or deduplication.
4. Auth and upstream network are variable. Four successful login samples have median 1360 ms; a fifth attempt failed and its observer timeout is not a latency success. An earlier first sample was 6697 ms; no P95 login target claimed. Existing read APIs retain trusted verification.
5. Profile polling/focus and global workspace values can rerender consumers; do not infer this dominates network without a render trace.
6. PostgreSQL plans under authenticated RLS: list 2.087 ms, exact count 0.920 ms, completed monthly aggregation 0.445 ms at 300 rows. Seq scans on this scale are reasonable; role evaluation appears as a single InitPlan, not per-row network calls. No index justified yet.
7. Initial loading fallback and absent explicit full route prefetch can surface during navigation; preserve route authorization while testing prefetch effect.

## Measurement limits and next gates

No claim of measured cold serverless start, hydration CPU, ten-user load or invitation latency yet. HTTP response samples include network/server time, not isolated SQL execution. Content-Length can be absent and zero is not proof of an empty payload. Further benchmark iteration must measure transferred body size and distinguish cache hits from background responses. Retained staging has 300 orders: initial Confirm Import cannot be rerun by wiping it. Use scoped fixtures for mutation/security tests.

CLI incident: env run unexpectedly dispatched a check-oidc deployment. Independently verified and removed only that newly created project (204, then 404); SheetOps project/production branch and local project link remained unchanged. Native env-run path is not used further. Protected Preview measurements use origin-scoped short-lived OIDC via the official project token endpoint; no protection setting or billing change.

## Login sample correction

The five-attempt local login series includes one data failure: dashboard summary returned HTTP 500 at 10300 ms; the observer stopped waiting at 29986 ms. That value is an observer timeout, not a successful loaded-dashboard latency. The raw failed attempt is retained and must not be silently excluded. Four successful attempts were 2900/1360/1627/1329 ms (nearest-rank success P50 1360 ms); data-success rate was 4/5. There are insufficient samples for a P95 claim. The separate initial navigation run had one successful login sample of 6697 ms.
