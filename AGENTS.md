# SheetOps — instructions for the receiving owner's Codex

## Read first

- Start with [README](README.md), [setup and environment configuration](docs/setup/README.md), [environment variable contract](docs/setup/ENVIRONMENT.md), [architecture](docs/ARCHITECTURE.md), [PRD](docs/PRD.md), [development workflow](docs/setup/13-development-workflow.md), and [release process](docs/RELEASE_PROCESS.md).
- Consult docs/IMPLEMENTATION_PLAN.md for preserved Phase 1 history, not current infrastructure state or release permission. Historical release/verification/archive records are evidence only; their approvals, accounts, backups and automations do not transfer to this installation.
- Derive service identities from explicit configuration supplied by the receiving owner. Never infer them from historical documents, existing login sessions, default branches or ignored local files.

## Ownership, branches and approval

- Default development branch: dev. Production branch: main. Use a separate delivery/feature branch when explicitly requested; never modify main or dev during such a handover task.
- Commit and push within the branch/scope authorized by the current owner. Use Conventional Commits, preserve Git history, and never force-push or delete remote branches without explicit authorization.
- Do not merge to main, enable auto-merge, deploy/promote Production, apply cloud SQL/migrations (including migration-history repair), restore, seed, or modify real business data without explicit approval from the receiving owner for that concrete target and reviewed change. Approval to edit code, push dev or prepare a handover is not approval to release or write cloud data.
- Prepare the exact commit, migration list, validation, backup status and rollback plan for review before requesting release approval. Never treat a prior owner's approval as authorization.
- Preview must use explicitly declared independent staging backend, Spreadsheet and credentials. Fail closed on missing/mismatched environment declarations. Never run cleanup/fixture suites against Production or retained business data, even if the database appears empty.
- Never provision paid resources, upgrade plans or change billing without explicit approval.

## Architecture and data security

- Use Next.js App Router, strict TypeScript, Tailwind, shadcn/ui, TanStack Table, Recharts, Zod and npm with the committed lockfile.
- Vietnamese UI and receiving-owner guides; English code, types and contracts. Keep domain logic in src/lib, trusted services in server-only modules and presentation in feature components.
- PostgreSQL is the business source of truth; never store production business data in localStorage. Preserve exact BIGINT values as decimal strings through APIs, validation and reporting.
- Revenue includes only completed, non-deleted orders. Validate integer VND, actual ISO dates and unique order codes including deleted records. Avoid unrelated business refactors.
- Enforce trusted server/database roles on every mutation. Never authorize with user-editable metadata or UI visibility. Keep RLS enabled with least-privilege grants; preserve last-Admin/self-change protections and transactional database audit events.
- Keep every schema change in a reviewed, versioned SQL migration. Do not silently edit an already applied migration, delete migration history, reset a populated remote database or mark versions applied without verifying schema and owner approval. Reconcile SQL Editor installations before using CLI db push; follow chapter 13.
- Verify backups and a separate restore target before approved schema/data changes. Code rollback does not undo migrations or restore lost data. Preserve existing orders, users, audit history and prior exports.
- Do not auto-seed Production or overwrite Source_Orders. Keep synthetic demo data explicit. Verify target and existing data before any authorized cloud write; staging/preparation failures must preserve the prior successful export.
- Never commit secrets, private env files, credentials JSON, node_modules, build output, backups or browser runtime artifacts. Use the committed env examples; secrets remain server-only and must not enter NEXT_PUBLIC_* or logs.

## Verification and delivery

- Run npm run format:check, npm run lint, npm run typecheck, npm test and npm run build before delivery. Run the existing opt-in npm run test:install-db on disposable local Docker PostgreSQL for migration/install verification; no real cloud credentials or data are needed.
- Perform representative browser checks when runtime/UI behavior changes. For documentation-only work, verify links, PowerShell/Git commands and source export instead of claiming new authenticated browser coverage.
- CI proves only its explicit checks. Local SQL Auth fixtures do not prove hosted Auth/PostgREST, SMTP delivery, Google Sheets API, Vercel deployment, scheduled cron or full Supabase/Auth restore. Report unverified cloud steps honestly; keep missing Dashboard images marked SCREENSHOT NEEDED.
- Audit/reproduce from committed source at an explicit full SHA. Export with git archive using that SHA after its final CI passes, not an unverified HEAD or the source repository's default main. A new owner's repository can initialize main and dev directly from the ZIP; it does not require this delivery branch.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
