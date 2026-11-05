> Hồ sơ lịch sử của hệ thống trước bàn giao. Các tài khoản, backup/automation, trạng thái cloud và quyền release trong tài liệu này không được chuyển sang hệ thống mới. Dùng [setup](setup/README.md), [vận hành](setup/12-operations.md) và [quy trình phát triển](setup/13-development-workflow.md) cho người nhận.

# Phase 1 implementation plan

## Authority and scope

`PRD.md` preserves the complete v1.0 specification. This delivery implements only its Phase 1 interactive prototype. PostgreSQL, Supabase Auth/RLS, server authorization, invitation delivery, Google APIs, cron, deployment, and durable audit logs are Phase 2 or later. Phase 1 uses browser state, client pagination, localStorage and explicitly simulated roles.

## Architecture

- Next.js App Router provides `/login`, `/dashboard`, `/orders`, `/reports`, `/users`, `/sync`, and `/settings`.
- A shared client provider owns validated orders, demo session, users, settings, local audit events, and versioned browser persistence.
- `src/lib` contains Zod schemas, deterministic seed, permission rules, aggregation and CSV functions, independent of React.
- Feature components consume the same orders. Recharts presents derived aggregates; TanStack Table manages order pagination/sorting.
- shadcn/ui primitives provide accessible dialogs and buttons; Tailwind and CSS provide a responsive light interface.
- Future server repositories replace the provider mutation boundary; domain validation and seed remain reusable.

## Milestones and acceptance gates

1. Foundation: save PRD, establish conventions, configure strict TypeScript, npm lockfile, ESLint and Vitest; verify empty Git remote.
2. Domain: exactly 300 deterministic fictional orders across all 12 months, UUIDs and unique codes; completed-only revenue, soft delete, safe integer VND, strict dates; unit tests.
3. Shell: Vietnamese navigation, mobile menu, role switch, mock login/logout, forbidden and recovery states; explicit demo labeling.
4. Business features: filtered KPIs/charts, ten recent orders; searchable/sortable/filterable/paginated CRUD with field validation, confirmations and toasts; reports and formula-safe CSV.
5. Administration: mock user invite/roles/disable, self-role and last-admin safeguards; unconfigured Sheets interface with no fake success; demo settings/reset and local audit history.
6. Verification: lint, typecheck, unit tests, production build, desktop/mobile browser scenarios; document actual outcomes and limitations.
7. Delivery: inspect staging for secrets, create meaningful commits, push main without rewriting history, compare local and remote HEAD.

## Demo acceptance scenarios

- Seed starts at 300; create a completed order and verify dashboard/report revenue; edit it, then soft-delete and verify exclusion.
- Reject duplicate codes, impossible dates, negative/fractional/unsafe amounts and empty required fields.
- Viewer has read-only actions; Editor cannot access admin routes, including direct URLs; switches immediately revoke actions.
- Date/status filters produce consistent chart, summary, table and CSV values; empty ranges display helpful empty states.
- Refresh preserves browser changes; logout returns to demo login; reset is confirmed and restores the deterministic seed.
- Users cannot demote/disable the active demo user; simulated invitations never claim email delivery.
- Sync is visibly unconfigured, with no successful import/export history or network integration.

## Delivery status

Implementation and check outcomes are recorded in `VERIFICATION.md` at completion. No Phase 2 infrastructure will be provisioned.

## Phase 2 continuation

The user explicitly authorized Phase 2 on 2026-11-02. The sections above preserve the Phase 1 implementation history; the former Phase 1-only restriction no longer governs current work. See `PHASE_2_IMPLEMENTATION_PLAN.md` for the active plan and `VERIFICATION.md` for actual integration results.
