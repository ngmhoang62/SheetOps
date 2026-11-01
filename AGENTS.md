# SheetOps conventions

- Consult `docs/PRD.md` and `docs/IMPLEMENTATION_PLAN.md` before changing behavior.
- Implement Phase 1 only until explicitly authorized otherwise. No live cloud integrations or real credentials.
- Use Next.js App Router, strict TypeScript, Tailwind, shadcn/ui, TanStack Table, Recharts, Zod, and npm.
- Vietnamese UI; English code, types, contracts, and technical documentation.
- Keep domain rules in `src/lib`, demo persistence in `src/components/demo-provider.tsx`, and presentation in feature components.
- Revenue includes only completed, non-deleted orders. Validate integer VND, actual ISO dates, and unique codes including deleted records.
- Every demo mutation must honor the role matrix, update shared state, and record a local audit event. Mock roles are not a security boundary.
- Never commit secrets, node_modules, build outputs, or browser runtime artifacts.
- Before delivery run `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, and representative browser checks.
- Preserve Git history; use Conventional Commits and never force-push.
