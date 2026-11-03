# Independent staging setup

Owner supplied independent Singapore staging `msrmoffrfjhqijdfzzwm` and spreadsheet `12JvBaJxXIaZxJr-Ck2qEBzpDPn16XwGCxv6v81G--SU`. Both were verified reachable; initial staging schema/Auth were empty and all five existing SQL migrations were applied successfully. No production data or Auth users were copied. The owner prepared synthetic Sheets rows. Public signup was verified disabled after the owner changed Auth settings. Branching was not provisioned or charged.

Copy `.env.staging.example` to ignored `.env.staging.local`, then fill independent credentials privately. `npm run build:staging` and `npm run start:staging` explicitly load this file; browser public variables must be compiled for staging, not reused from a production build. Cloud/E2E/failure suites use the same loader and reject copied production server/Google/cron secrets when a production local file exists. Initial copied production URL/Sheet/key values were detected and blocked before cloud testing; owner corrected credentials and nonsecret targets were corrected separately. Never commit either local env file.

Preview APP_ORIGIN and Supabase Site URL: `https://sheetops-git-dev-nguyen-minh-hoang-s-team.vercel.app`. Allow exactly its `/auth/accept` and `/auth/callback`; owner confirmed configuration, but full live template/allowlist inspection remains separate. Generate a separate CRON_SECRET locally with .NET RandomNumberGenerator (32 random bytes encoded Base64); do not paste it into chat. Existing scheduler frequency is owner-controlled at 20 minutes and was not changed.

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

Until credentials are present Preview intentionally returns 503. Local .env.local still points to production; do not run destructive tests with it. Local staging tests passed against real isolated services; protected online Preview acceptance still requires access through Vercel protection and a retained synthetic QA Admin. Cloud/E2E suite fixtures are temporary and deleted after tests; do not treat them as owner login accounts.

Online follow-up: owner confirmed successful login with the retained synthetic QA Admin and Sheets connection on Preview c87fc89. Fixture cloud/E2E checks were completed before retaining that account. The expanded E2E guard accepts canonical header-only managed tabs or exact known deterministic 300-row synthetic snapshots, preserves backups in memory and restores/read-backs both managed tabs; it still refuses arbitrary content and verifies Source unchanged. Owner account is not a disposable fixture.
