# SheetOps conventions

- Consult `docs/PRD.md` and `docs/IMPLEMENTATION_PLAN.md` before changing behavior.
- Phase 3 is authorized. main is production and dev is development/Preview. Commit/push Phase 3 to dev; never merge/release main without owner approval. Only the explicitly authorized cron restoration may change main during this task.
- Production Supabase is ubaxgkqkfcrqbyshkidz (Singapore). Preview and cloud tests require an explicitly declared independent staging ref and Sheet ID; never use the retired project or production cleanup tests. Never provision paid resources or change billing. Preserve Phase 1 history.
- Use Next.js App Router, strict TypeScript, Tailwind, shadcn/ui, TanStack Table, Recharts, Zod, and npm.
- Vietnamese UI; English code, types, contracts, and technical documentation.
- Keep domain rules in `src/lib`, trusted services in server-only modules, and presentation in feature components. Production business data must use PostgreSQL, never localStorage.
- Revenue includes only completed, non-deleted orders. Validate integer VND, actual ISO dates, and unique codes including deleted records.
- Every mutation must enforce trusted server/database roles and create a transactional database audit event. Never authorize with user-editable metadata. Keep BIGINT values exact as decimal strings.
- Do not automatically seed production or overwrite Source_Orders. Verify existing data before cloud writes; preserve prior exports if staging or verification fails.
- Never commit secrets, node_modules, build outputs, or browser runtime artifacts.
- Before delivery run `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, and representative browser checks.
- Preserve Git history; use Conventional Commits and never force-push.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
