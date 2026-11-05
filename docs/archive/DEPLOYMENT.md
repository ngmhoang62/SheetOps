# Existing Vercel deployment

Use the existing `sheetops` project linked to `ngmhoang62/SheetOps`, production branch `main`. Do not create another project. Develop and push Phase 3 only on dev; main remains production and requires owner-approved release. Only the separate authorized cron restoration is production maintenance. The existing production Supabase public URL was verified to target Singapore. Environment **names/targets** were inspected without logging secret values.

## Required production configuration

In the existing project's **Settings → Environment Variables**, configure Production values directly:

- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (existing).
- `SUPABASE_SECRET_KEY` (existing, server-only).
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY`, `GOOGLE_SPREADSHEET_ID` (not present at initial metadata inspection).
- `CRON_SECRET` (not present at initial inspection; use a strong random secret).
- `BUSINESS_TIMEZONE=Asia/Ho_Chi_Minh`.
- `APP_ORIGIN=https://sheetops.vercel.app` (or the chosen canonical custom domain; required for invitation redirect construction).

Use secret variable types for server credentials. Do not paste values into chat. Local `.env.local` is not uploaded or automatically copied. Set separate values for Preview if preview testing is required. Redeploy after configuration changes. Existing integration variables with different names are not read as substitutes by the application.

In [Supabase Auth URL configuration](https://supabase.com/dashboard/project/ubaxgkqkfcrqbyshkidz/auth/url-configuration), set the canonical Site URL and allow the production `/auth/accept`, `/auth/callback`, and explicit development callback URLs used by the team. Keep public signup disabled. Configure custom SMTP and test a real invitation end-to-end; an accepted invite API response does not prove inbox delivery.

### Invitation troubleshooting

For Brevo, use `smtp-relay.brevo.com` with port **587 (STARTTLS)** or **465 (SSL/TLS)**, as documented in [Brevo's Supabase integration](https://developers.brevo.com/docs/supabase-smtp-integration). Port 586 is incorrect. On 2026-11-03, invitations timed out with Auth HTTP 504 / `request_timeout`; after the owner changed 586 to 587, the same allowed test address was invited successfully and the owner confirmed inbox receipt. No credentials or provider settings were changed by the agent.

The default invitation template can use `{{ .ConfirmationURL }}`. Admin invitations do not support PKCE; they return an implicit session fragment to `/auth/accept`. The page explicitly calls `setSession`, scrubs the fragment, validates with `getUser`, and checks the fresh active application profile before enabling password setup. It does not use Magic Link sign-in. `/auth/callback` retains code exchange and also accepts a fixed `type=invite` token-hash template if explicitly configured; callback responses are private/no-store with no-referrer. Do not publish invitation URLs, tokens, or full request/provider error objects in logs.

`INVITE_TIMEOUT` means delivery is unknown, not rejected. Inspect Auth logs, the provider's transactional logs and the recipient's inbox before retrying. `INVITE_AUTH_FAILED` requires checking provider/server errors; `INVITE_PROFILE_FAILED` means Auth accepted the request but application permissions were not provisioned. A missing profile must be repaired through an authorized Admin operation; never grant permission from user metadata. A successful API response alone is never an inbox or password-login PASS.

## Cron

The temporary 15:00 test on 2026-11-03 completed successfully at 15:37 UTC+7: 300 rows, actual cron trigger, matching output/staging/database snapshot and audit. The official schedule is restored to 0 16 * * * (23:00 UTC+7); see the latest VERIFICATION.md evidence. Later, the owner-approved Phase 3 PR #1 was merged as 0506323 and production deployment dpl_7S3jw2x9va7pXU6tZWACfkQkYGWS became READY in sin1. The official schedule is retained.

The normal schedule for `/api/cron/daily-export` is `0 16 * * *`, equivalent to 23:00 Asia/Ho_Chi_Minh. The host sends `Authorization: Bearer <CRON_SECRET>`; query-string credentials are not supported. Cookie-authenticated users cannot call this endpoint without the cron secret. Manual and scheduled exports share the same service and database lock.

After a successful production deployment, inspect **Cron Jobs** in the existing project and verify registration. Trigger a run through the dashboard or a trusted server-side client that reads the secret from its environment; never place the secret in a command argument or URL. Check real `sync_runs`, output hash/rows, and runtime logs. Distinguish **manual invocation verified** from **scheduled execution verified**; the first observed scheduled run is a separate gate.

Hobby timing is approximate within the scheduled hour; it does not guarantee the exact minute. See [Vercel cron limits](https://vercel.com/docs/cron-jobs/usage-and-pricing) and [cron security](https://vercel.com/docs/cron-jobs/manage-cron-jobs).

## Release checks

Run npm ci, lint, typecheck (including Next type generation), tests, format check, build, then explicit cloud/E2E suites with disposable fixtures only. Confirm target project, current Git SHA, environment, migrations, public-signup setting and least-privilege grants. Inspect deployment status for the pushed SHA and verify runtime separately from build success. Vercel deployment protection may require authenticated access; do not weaken protection simply to automate testing.

Set up backups, restore verification and a rollback plan before real data. Rolling back app code does not automatically reverse database migrations or sheet publication. Prefer additive schema changes and forward fixes.

## Phase 3 Preview

See STAGING_SETUP.md for all Preview variables and exact redirect configuration. Existing production secrets are not copied. Missing independent staging settings intentionally return 503. Vercel dev pushes should create Preview deployments in the existing project; automatic Cron runs only in Production. Both staging Preview and the approved production release now run in sin1, aligned with Singapore PostgreSQL. See PHASE_3_VERIFICATION.md for actual deployment evidence.

## Later performance/visibility release gate

Update 2026-11-04: owner approved final release through PR #2. Both visibility/audit migrations are now applied once to production with preserved data; see RELEASE_2026_11_04.md for actual recorded versions, checks and remaining browser-verification limit. The staging-only status in the following historical gate is superseded by that record.

The dev performance work requires the reviewed order_visibility migration before a production rollout. It has only been applied on independent staging. See HIDE_RESTORE.md for grants, compatibility and migration-history checks, and PERFORMANCE_ENGINEERING.md for measured acceptance/remaining blockers. Do not merge this work or migrate production under the earlier PR #1 approval.

Already-confirmed invited accounts use an explicitly requested password-recovery email to finish setup when the original one-use invite was consumed; they are not deleted/recreated. The password page accepts verified invite/recovery sessions, checks the active profile, saves the password, logs out, and goes to /login. Never change the authentication mode to Magic Link or log the session fragment. Preview SSO and platform Security Checkpoint are separate layers; keep protection enabled and do not interpret a challenge HTML response as an application's JSON 403.
