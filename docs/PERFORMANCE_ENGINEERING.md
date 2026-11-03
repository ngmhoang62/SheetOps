# Performance engineering verification — 2026-11-03

For the later confirmed DDoS diagnosis, bounded test policy, fresh local regression and successful online smoke, see PERFORMANCE_FOLLOWUP.md and PREVIEW_TESTING.md. Historical sample values and earlier failed attempts below are preserved.

This review supersedes the earlier no-client-cache conclusions in PERFORMANCE_VERIFICATION.md. Historical measurements remain unchanged. Work is restricted to dev, local optimized staging on 127.0.0.1:3001 and the protected dev Preview. No production deployment or migration is authorized by this task.

## Method and evidence

PERFORMANCE_BASELINE.md records the pre-refactor baseline at 328e4b8. Chromium/Chrome desktop 1366x900; responsive checks also use 390x844. Navigation UI and loaded data are distinct metrics. Nearest-rank P50/P95 is reported only with sufficient samples (P95 requires at least 20). Login is submit-to-real dashboard KPI, not redirect-to-shell. Failed attempts are recorded separately, never relabeled as successful latency. Raw sanitized JSON and screenshots stay under ignored output/performance; private snapshot backups, credentials and access links are not committed.

The guarded perf:benchmark command requires RUN_PERFORMANCE_TESTS=1. Only the exact local or stable Preview origin and independent staging environment are accepted. Existing 300 QA orders are retained. The 2,000-order run adds only 1,700 run-owned synthetic rows and removes exact IDs afterward; it never exports these fixtures. Browser test:product requires RUN_PRODUCT_TESTS=1, snapshots managed output tabs, performs scoped mutations and restores those snapshots before cleaning only its own identities/rows. Never run the older empty-database cloud suites on retained QA data.

## Root causes and remediation

1. Every warm page visit remounted a resource that cleared its data. Authenticated reads paid another network round trip and showed initial loading. A session-owned TanStack Query client now reuses fresh data for 30 seconds, retains previous filter/page results and deduplicates requests. Background refresh does not replace visible content with a spinner.
2. One global revision invalidated unrelated resources after writes. Domain invalidation now refreshes only affected projections (orders, analytics, reports, audit; user writes do not refetch orders). No cross-user or public cache is used.
3. Login retained a sequential dashboard Auth/query after verified password authentication. The same authenticated client now reads default analytics alongside profile/settings. Its result primes only the newly established user's cache; a failed optional read falls back to the normal authorized endpoint. Login never trusts editable user metadata.
4. Admin reads waited sequentially for profile and data. Users, sync history and audit now use the existing parallel RLS-protected read helper after getUser; no response is returned before the fresh Admin check passes. Sync history selects only displayed fields, capped at 50; audit remains capped at 100.
5. Auth/database transport is variable. Server-Timing separates Auth, profile, data and total; data timing includes remote transport and is not SQL execution. Existing 12-second transport deadlines and structured transient errors remain. Per-request getUser and RLS are retained. No claimed serverless cold-start or browser hydration profile exists without a trace.
6. Database execution was small relative to request latency. Authenticated EXPLAIN ANALYZE at 300 rows: list 2.087 ms, count 0.920 ms, monthly aggregate 0.445 ms. At 2,000 rows: list 2.471 ms, completed monthly aggregate 3.032 ms; top-N/aggregate seq scans, no disk spill, role lookup is an InitPlan. No speculative index or RLS removal was made.
7. Export used separate stage resize/clear/write requests. An observed provider failure left the working tab empty while preserving the published output. Stage replacement now uses one atomic structural batch with literal stringValue cells; read-back, lease, atomic publication and final hash checks remain. Existing-tab metadata avoids a redundant second fetch. A real Google 403 regression preserved all three tabs.
8. Session broadcasts originally reached the sending tab and reset it during login/logout. Broadcasts identify the sender; other tabs still clear private data. An older in-flight session result cannot overwrite a newly established session. Password setup now logs out and redirects to /login with a success notice.

## Cache trust and consistency

Each query client is owned by environment/user ID/role/login epoch. Login establishes a fresh client. Logout, confirmed session failure, role changes and cross-tab session changes cancel and clear old work; late responses cannot repopulate it. Authorization errors do not turn stale values into official results. Focus and 30-second session revalidation remain; backend authorization denies disabled users immediately when checked. A dormant browser may display previously authorized content until revalidation; it cannot mutate or fetch fresh data after revocation. Browser cache is memory-only and API responses remain private/no-store.

This is not a durable background job system. Pending indicates an in-flight request, never queued or successful. Create/edit dialogs retain saving/error states; Hide/Restore has immediate row acknowledgement and authoritative reconciliation. Sync runs remain persisted in PostgreSQL; navigating away does not invent a guarantee of request completion.

## Invitation acceptance evidence

The allowed staging Viewer was invited once. Vercel protection intercepted its redirect after Supabase had already verified the one-use invitation. The owner explicitly authorized an alias-scoped 23-hour Preview share link; project-wide protection was not disabled. A single password-recovery mail for the same confirmed account was accepted in 11,498 ms (delivery initially unverified), then the owner confirmed receiving it, setting a password, returning to /login and signing in as Viewer. No account was deleted/recreated and no Magic Link sign-in was introduced. Reopening the consumed invitation is not evidence of provider expiry failure. There is no controlled before/after SMTP delivery benchmark.

## Known acceptance limits

Initial Confirm Import success cannot safely be rerun on retained staging with 300 QA rows. Connection/Preview and the populated-table guard are tested; do not wipe orders/Auth users to manufacture PASS. Earlier isolated import evidence remains historical, not a new current empty-database run. True platform cold starts, hydration CPU, ten simultaneous users, physical-device mobile and multi-day outage behavior remain unmeasured. Login/API P95 targets must be assessed from the measured results, not inferred from warm cache speed.

Later full Preview E2E stopped at login because the platform returned HTML Security Checkpoint 403 with x-vercel-mitigated=challenge, even through the documented authenticated CLI/temporary automation access. Attack-status returned no anomalies and active custom config lookup returned 404: the exact managed rule is NOT established. No firewall rule or protection mode was changed. The CLI-created automation secret was revoked and verified absent. The earlier successful Preview navigation/login measurements remain valid, but later blocked API probes and the full-suite preflight are not application/API success samples. Preview 2,000-row/full mutation/responsive acceptance remains BLOCKED pending platform access.

The clean dependency install reports 16 moderate development-tool advisories (ESLint/minimatch chain), zero high/critical; npm audit --omit=dev reports zero runtime advisories. No force dependency upgrade was mixed into this work. esbuild's unapproved install-script notice remains; the locked install/build is verified independently rather than blindly approving scripts.
