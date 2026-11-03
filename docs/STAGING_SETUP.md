# Independent staging setup

BLOCKED: connector listed only production on 2026-11-03. Owner must create/authorize an independent Singapore project, confirm Free quota before creation, and provide its nonsecret ref. Prefer a separate Free project for persistent small-team QA; Branching is an alternative only after owner confirms entitlement and metered costs. Never use the retired project.

1. Create staging Auth/PostgreSQL with no production data/users. Inspect blank schema and apply all committed migrations in order. Bootstrap a synthetic Admin through trusted terminal (with APP_ENV=staging and the approved staging ref; bootstrap serializes and refuses an existing Admin). Keep public signup off.
2. Create a new spreadsheet with Source_Orders, Export_Orders and Export_Staging; exact six input and seven output headers. Use a separate service account scoped/shared only to staging as Editor. Never share production keys into Preview.
3. In existing Vercel sheetops project, set all following variables for Preview/dev only. Keep main as production branch. Redeploy dev after changes. No new Vercel project/domain is required.

| Variable                                              | Preview value                                            |
| ----------------------------------------------------- | -------------------------------------------------------- |
| APP_ENV                                               | staging                                                  |
| NEXT_PUBLIC_STAGING_SUPABASE_PROJECT_REF              | owner-approved independent staging ref                   |
| NEXT_PUBLIC_SUPABASE_URL                              | staging HTTPS URL                                        |
| NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY                  | staging public key                                       |
| SUPABASE_SECRET_KEY                                   | staging server key (Secret)                              |
| GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_PRIVATE_KEY     | independent staging identity/key; private key Secret     |
| GOOGLE_SPREADSHEET_ID / STAGING_GOOGLE_SPREADSHEET_ID | same independent staging sheet ID, neither production ID |
| CRON_SECRET                                           | separate random staging Secret                           |
| BUSINESS_TIMEZONE                                     | Asia/Ho_Chi_Minh                                         |
| APP_ORIGIN                                            | exact stable dev Preview alias after deployment          |

4. Staging Supabase Site URL must match that exact alias; allow only its /auth/accept and /auth/callback plus explicit localhost development addresses. No broad wildcard. Invitation sends only to approved test addresses; use synthetic Auth users for role tests.
5. Confirm Preview anonymous requests cannot access data. Run cloud suites only with APP_ENV=staging, RUN_CLOUD_TESTS=1 and empty staging database. E2E also checks independent Sheets IDs and blank managed tabs. Seed synthetic Source only after empty-fixture suites; import via Admin workflow. Preview has no automatic scheduled Vercel cron; use authorized staging manual invocation for route/service checks, not a scheduled PASS.
6. Test persistence, roles, disable, expired session, concurrent operations, invalid import rollback, duplicate cron key and provider failure; then perform synthetic isolated backup/restore drill. Record evidence before release.

Until credentials are present Preview intentionally returns 503. A READY build with a 503 setup response is a deployed isolation gate, not the final online staging acceptance. Local .env.local still points to production; do not run destructive tests with it. Set staging secrets privately in an isolated local environment and confirm target before use.
