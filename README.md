# SheetOps

Owner-approved production release (2026-11-04): [release evidence and trial instructions](docs/RELEASE_2026_11_04.md), [PR #2](https://github.com/ngmhoang62/SheetOps/pull/2). Earlier staging-only release gates below are historical; consult this release record and PR status before reapplying migrations.

Development UI follow-up: [paginated audit verification](docs/UI_AUDIT_VERIFICATION.md) and [retry/reconciliation behavior](docs/RETRY_BEHAVIOR.md). The new audit migration is staging-only until a separately approved production release.

Internal order operations and analytics workspace with Vietnamese UI, Next.js App Router, Supabase PostgreSQL/Auth, server-enforced roles, and Google Sheets snapshot synchronization.

Phase 2 implementation replaces Phase 1 role switching and localStorage business data. Historical prototype documentation is preserved in [docs/PHASE_1.md](docs/PHASE_1.md), Git history and earlier verification sections. The authoritative [PRD](docs/PRD.md) is unchanged. Current verification and external setup gates are in [docs/VERIFICATION.md](docs/VERIFICATION.md).

## Local setup

Requirements: Node.js 22.12+ (24 LTS recommended), npm 10+, and the authorized Singapore Supabase project `ubaxgkqkfcrqbyshkidz`.

1. Install dependencies with `npm ci`.
2. Copy `.env.example` to ignored `.env.local` and configure values privately. Never paste secrets into chat or commit them.
3. Apply committed SQL migrations in order to the intended project after inspecting its existing schema. Do not reset a populated database.
4. Create and bootstrap the first Admin using [docs/DATABASE.md](docs/DATABASE.md). No public signup or automatic Admin role exists.
5. Run `npm run dev` and open [localhost:3000](http://localhost:3000). Sign in with the provisioned account.

There is no credential-free demo login in the current production flow. Existing Phase 1 localStorage records are neither imported nor trusted. Seed preview remains an explicit offline fixture command and never writes cloud data.

## Commands

| Command                                   | Purpose                                                              |
| ----------------------------------------- | -------------------------------------------------------------------- |
| `npm ci`                                  | Reproduce pinned dependencies                                        |
| `npm run dev`                             | Local development server                                             |
| `npm run lint`                            | ESLint, zero warnings                                                |
| `npm run typecheck`                       | Generate Next route types and run strict TypeScript                  |
| `npm test`                                | Unit tests including retained Phase 1 fixtures and Phase 2 contracts |
| `npm run build` / `npm start`             | Production build / local production server                           |
| `npm run format:check` / `npm run format` | Check / apply formatting                                             |
| `npm run admin:bootstrap`                 | Trusted terminal first-Admin bootstrap; requires existing Auth UUID  |
| `npm run seed:preview`                    | Print deterministic 300-order JSON; no database writes               |
| `npm run test:cloud`                      | Opt-in disposable Auth/PostgreSQL/RLS checks                         |
| `npm run test:e2e`                        | Opt-in browser/API/real Sheets checks against a local server         |

Cloud/E2E commands require RUN_CLOUD_TESTS=1, APP_ENV=staging, an explicit independent staging ref and credentials, and an empty staging database. Production is always rejected. E2E also requires blank/header-only application-managed sheet tabs and an installed Chrome browser. It defaults to an already running production server at `http://127.0.0.1:3001`; set `E2E_BASE_URL` only to another localhost URL. Test credentials are generated in memory and never printed. Both managed tabs are restored and read back before exact-ID cloud fixture cleanup; Source_Orders is untouched. Do not run these scripts on real business data.

## Implementation

- Real Supabase password authentication, cookie sessions and refresh, active profile checks, protected page routes and APIs. Admin/Editor/Viewer permissions come from PostgreSQL and RLS.
- Existing responsive readable UI, server-paginated/searchable/sortable order table, validated create/edit/soft delete, confirmation dialogs and toast feedback.
- PostgreSQL dashboard/report aggregates, exact BIGINT decimal-string amounts, completed-only revenue, active-row exclusion, filtered formula-safe UTF-8 CSV.
- Admin invitations, controlled role/active-state changes, persistent settings and transactional audit logs. Email delivery requires SMTP verification.
- Google Sheets connection check, strict preview/confirmed initial import, verified RAW staging export, atomic publish, real run history, database lock and idempotency.
- Shared manual/cron export, exact bearer-protected endpoint, daily `0 16 * * *` Vercel schedule (23:00 Asia/Ho_Chi_Minh).

## Source structure

```text
src/app/                 pages, API route handlers, Auth callback/acceptance
src/proxy.ts             cookie refresh and server page access checks
src/components/          existing feature views and workspace session context
src/lib/contracts.ts     production schemas and exact-integer/CSV helpers
src/lib/supabase/        browser, user-scoped server and privileged clients
src/lib/server/          authorization, query and Sheets service boundaries
src/lib/sheets-format.ts strict source parsing and stable snapshot hashing
supabase/migrations/     versioned schema, RLS, guarded RPCs and transactions
scripts/                 offline seed, trusted bootstrap, opt-in cloud/E2E tests
tests/                   pure domain, money, import/export and security helper tests
docs/                    architecture, database/API/setup/deployment and evidence
```

## Configuration and remaining gates

[.env.example](.env.example) lists public Supabase URL/key and server-only Supabase secret, service-account identity/private key, spreadsheet ID, cron secret, business timezone and canonical `APP_ORIGIN`. Do not prefix privileged credentials with `NEXT_PUBLIC_`. Local values are not automatically copied to Vercel.

Production has an Admin, 300 imported synthetic orders, working Sheets manual export, and verified invitation/password/Viewer/disable UAT. Actual scheduled 300-row cron export passed on 2026-11-03; the official schedule is 23:00 UTC+7. See docs/PHASE_2_ACCEPTANCE.md.

Phase 3 PR #1 was owner-approved, reviewed and merged as 0506323; production is READY in sin1. The first encrypted production backup is in the private SheetOps Drive folder; weekly Sunday 23:00 local scheduling requires Codex/Docker/computer availability. Full Supabase/Auth restore and main branch protection remain open. Development continues on dev. Push dev → isolated Vercel Preview → staging QA → PR to main → owner approval → production. See [Phase 3 verification](docs/PHASE_3_VERIFICATION.md), [release process](docs/RELEASE_PROCESS.md), [security](docs/SECURITY.md) and [backup/restore](docs/BACKUP_RESTORE.md). No automatic migration or seed occurs on deploy. Never reuse production credentials for staging; cloud cleanup suites now refuse the production ref even when it is empty.

Staging local setup: copy `.env.staging.example` to ignored `.env.staging.local`, fill independent credentials, then run `npm run build:staging` and `npm run start:staging`. Opt-in integration scripts explicitly load this file and never fall back to `.env.local`. After fixture cleanup, a retained owner QA Admin may exist: review that state before rerunning destructive fixture suites. `RUN_RESTORE_DRILL=1 npm run test:restore` exercises synthetic PostgreSQL backup/encryption/restore in a disposable network-isolated Docker container; it never accesses cloud data.

Later dev work adds session-private query reuse, verified-login analytics reuse, auditable Hide/Restore and atomic Sheets staging replacement. See [measured results and blockers](docs/PERFORMANCE_RESULTS.md), [investigation](docs/PERFORMANCE_ENGINEERING.md) and [visibility/migration contract](docs/HIDE_RESTORE.md). Warm navigation targets are met in the measured series; fresh login/API P95 and full online regression are not fully accepted. This work has not been released to main. Production requires a separately approved migration/release. Retained staging now has 300 orders and two QA accounts; never run an empty-database cleanup suite there.

[Latest verification follow-up](docs/PERFORMANCE_FOLLOWUP.md): local regression and bounded Preview smoke passed after identifying the earlier DDoS Mitigation challenge. Use [the bounded testing policy](docs/PREVIEW_TESTING.md); full mutation E2E stays on port 3001 and Preview uses a separate paced read-only smoke.
