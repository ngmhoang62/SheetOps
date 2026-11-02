# SheetOps

An internal order operations and analytics workspace. **Phase 1 is complete as an interactive prototype**: Vietnamese UI, deterministic fictional data, browser-local persistence, and simulated Admin/Editor/Viewer roles. The full product specification is preserved in [docs/PRD.md](PRD.md).

## Run locally

Prerequisites: Node.js 22.12+ (Node 24 LTS recommended), npm 10+, and a modern browser. No cloud account, credentials, database, or `.env.local` is needed.

```powershell
npm ci
npm run dev
```

Open [localhost:3000](http://localhost:3000). Choose **Quản trị viên**, **Biên tập viên**, or **Người xem** on the demo login screen. The top-right user menu switches between active demo profiles. Sign out there to return to login.

For a production-mode local preview:

```powershell
npm run build
npm start
```

## Implemented

- Responsive sidebar/topbar, mobile navigation, demo login/logout, role menu, loading/error/empty/forbidden states.
- Dashboard with total/completed orders, completed-only revenue, completion rate, monthly revenue, status distribution, ten recent orders, and inclusive date/status filters.
- TanStack Table v9 order table with search, sorting, date/status filters, pagination (20/30/50 rows), create/edit/detail dialogs, field-level Zod validation, duplicate-code rejection, soft-delete confirmation, and Vietnamese toasts.
- Reports use the same data and calculation functions, with monthly/status totals and filtered, quoted, UTF-8 BOM CSV download. CSV text that could become a spreadsheet formula is escaped.
- Mock user creation, role changes, enable/disable, self-change and last-admin safeguards. No invitations are delivered.
- Sync Center explicitly shows **Chưa cấu hình** (Not Configured), no runs, and disabled real integration controls.
- Demo organization setting, confirmed seed reset, and a browser-local activity log of up to 100 mutation events.
- Exactly 300 deterministic orders across 12 months of 2026 (25 per month), stable UUIDs and unique codes; fictional names only. The full-year default intentionally includes future sample dates.

## Commands and checks

| Command                | Purpose                                                |
| ---------------------- | ------------------------------------------------------ |
| `npm run dev`          | Next.js development server                             |
| `npm run lint`         | ESLint with zero warnings allowed                      |
| `npm run typecheck`    | Strict TypeScript check                                |
| `npm test`             | Vitest business-rule suite                             |
| `npm run build`        | Optimized production build                             |
| `npm start`            | Serve the production build                             |
| `npm run format:check` | Prettier check                                         |
| `npm run format`       | Format source and documentation                        |
| `npm run seed:preview` | Print deterministic seed JSON; never writes a database |

Dependencies are pinned with a committed npm lockfile. TypeScript 6.0.3 fits the current `typescript-eslint` peer range; ESLint 9.39.5 fits Next.js's current React/import/accessibility plugin peer ranges. This ESLint major is upstream end-of-life; update the lint stack together when those plugins support ESLint 10. See [verification](VERIFICATION.md) for the checked versions, results, and dependency-audit limitations.

## Structure

```text
src/
  app/                    App Router routes, layout, recovery states, theme
  components/
    ui/                   shadcn/ui-style Button and Radix Dialog primitives
    demo-provider.tsx     shared client state, mock session, persistence, mutations
    shell.tsx             navigation, permission guard, login, user menu
    analytics-view.tsx    dashboard/report charts, summaries, CSV download
    orders-view.tsx       TanStack table and order editor
    admin-view.tsx        users, unconfigured sync, settings/activity log
    shared.tsx            filters, headings, status badges, confirmations
  lib/
    domain.ts             schemas, permissions, order/user mutation rules
    seed.ts               reusable deterministic order/user fixtures
    analytics.ts          filters, aggregates, formatting, CSV serialization
    utils.ts              class name utility
scripts/seed.ts           JSON seed preview
tests/domain.test.ts      domain and report correctness tests
docs/                    PRD, plan, integration roadmap, verification and UAT
```

## Prototype boundaries

This is **not the functional MVP described by Phase 2**. No real authentication, server authorization, API routes, database, RLS, SQL migrations, mail delivery, sync, cron, audit service, or deployment has been implemented. Admin-route restrictions are client-side UI demonstrations and do not return server HTTP 403. Never put real business or personal data into this prototype.

Orders, users, settings, and a limited activity history live in `localStorage` under `sheetops-demo-v1`; the demo profile selection uses `sheetops-session-v1`. Changes are local to one browser origin, can be altered/cleared by its user, and are not shared across users, devices, tabs in real time, or ports. Storage failures display a warning and allow in-memory use; invalid snapshots are not silently overwritten. An Admin can use **Cài đặt → Đặt lại bản demo** to recover the seed and sign out.

Pagination/filtering/calculation run on the client. Soft-deleted codes remain reserved. Demo data is capped at 5,000 orders, 100 profiles, and 100 activity events. Amounts use safe integer JavaScript numbers, capped at 1,000,000,000,000 VND per order; that bound keeps aggregates exact within the demo limit. Phase 2 must preserve PostgreSQL BIGINT precision across JSON, preferably with string serialization.

Settings do not change credentials, sync configuration, or production behavior. The activity log is not tamper-proof. Reset permanently removes only demo changes on this browser. No automated browser test runner is included; Vitest tests are repeatable, and the browser scenario is documented in [docs/UAT.md](UAT.md).

## Phase 2 prerequisites

Read [docs/PHASE_2.md](PHASE_2.md) before beginning. It covers authentication, migrations/RLS, server endpoints, safe Google Sheets staging export, scheduling, credentials, and deployment gates. Configure placeholder names from [.env.example](../.env.example) in an ignored `.env.local` for local development and the host's encrypted environment configuration for deployments. Only the Supabase public URL and publishable key may reach the browser. Never prefix server credentials with `NEXT_PUBLIC_` or commit them.

No external infrastructure was provisioned. Phase 2 requires a separate authorized task.
