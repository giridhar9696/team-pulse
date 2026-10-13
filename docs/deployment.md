# Deployment and first employee access

Status: NOT READY FOR PRODUCTION. No Team Pulse remote database or hosted application has been configured or deployed. The user chose to create the staging project later. Never use the excluded dealatecorp account/project.

## Selected account and environments

Supabase connection: Team-pulse. User-designated account: bylapudigiridhar005@gmail.com. Organization: healthy food website (`kotybqzfckqdepiqscmv`). Discovery returned no projects. The connector's project cost API was unavailable; the user will create a dedicated Team Pulse Staging project through the dashboard and review pricing there. Re-discover its actual project reference after creation; do not invent it.

Use different Supabase projects and frontend configuration for local/development, staging and production. `.env.local` is ignored; `.env.example` contains placeholders only. Browser variables:

- `VITE_SUPABASE_URL`: selected environment's actual project URL.
- `VITE_SUPABASE_PUBLISHABLE_KEY`: actual publishable key, or compatible legacy anon key. No privileged credentials.
- `VITE_SENTRY_DSN`: optional public monitoring DSN until configured; required and delivery-tested before release.
- `VITE_APP_ENV`: development, staging or production.

Supabase Edge Function `manage-account` requires server-only `APP_ORIGIN`, equal to the exact frontend origin. Supabase normally provides `SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` in its function runtime. Verify that those reserved variables are available; never copy the service key into frontend configuration. APP_ORIGIN is server-owned; supplied redirectOrigin values do not select invitation destinations.

## Database and account setup

1. Inspect the designated project's tables, triggers, functions, grants, RLS, storage buckets and migration history through the authenticated connector before applying changes.
2. Review all seven SQL migrations in `supabase/migrations`. They create a dedicated application schema, Auth identity-linking trigger, notifications, integrity/query indexes, scoped project totals, server-side submission URL validation and access revocation after final assignment handoff. Do not apply them to unrelated live tables with the same names. Apply in filename order through the supported migration API or the installed Supabase CLI, after checking the command's `--help`.
3. Run Supabase security/performance advisors. Verify every exposed application table enables RLS, client table privileges are SELECT-only and private functions/schema are not exposed through the Data API. Confirm schema matches the repository. Set API row limit at least 500; the frontend reads in pages of 500 to avoid the standard 1000-row cap.
4. In Auth settings, disable public signup and anonymous sign-in, require email confirmation, enable refresh-token rotation, enforce a minimum 12-character password and set appropriate sign-in/mail rate limits. Local config does not automatically configure hosted settings.
5. Configure Auth Site URL to the actual environment origin. Allow only exact `/auth/invitation`, `/auth/recovery` and `/login` redirect URLs on that origin. No broad production wildcard redirects. Email-change confirmation should require both addresses.
6. Configure a verified SMTP sender/provider in Supabase Auth and test invitation, recovery and email-change delivery. Keep SMTP credentials in Supabase's secure settings. A successful API request is not evidence of email delivery.
7. Invite and confirm the first administrator Auth account using the owner's dashboard. Review and run `supabase/provision-first-admin.sql` after replacing its email placeholder. The script creates the organization and ADMIN001 membership atomically and refuses accounts already assigned membership. Additional administrators require owner-reviewed provisioning; employee editing cannot elevate roles.
8. Deploy `supabase/functions/manage-account/index.ts` to staging and configure APP_ORIGIN. Keep JWT verification enabled where the gateway supports the project's signing keys; the function also explicitly verifies the bearer token with Auth getUser before authorizing a scoped RPC. If the modern gateway requires custom verification, use the documented Supabase setting only after confirming explicit body verification; test unauthenticated/employee/cross-organization requests before release.
9. Sign in as admin, save an employee record with their real email, and use its key button to request an invitation. Confirm delivery and acceptance; identity linking occurs only for a confirmed matching Auth email. For a confirmed Auth user that existed before the employee record, use owner-reviewed `supabase/link-existing-employee.sql` with the exact organization/employee/email values. The script refuses existing links and mismatched emails. Never assign shared/default passwords.

## Frontend hosting

Use Vercel's Vite deployment with Node 24, install `npm ci`, the guarded build command in `vercel.json` and output `dist`. The guard rejects missing/privileged public credentials and requires an explicit staging/production environment; production also requires a monitoring DSN. Configure environment variables per environment before building. `vercel.json` supplies SPA rewrites, nosniff, a restrictive referrer policy, frame restrictions and permission limits. Add a CSP limited to the actual Supabase/monitoring origins after they are known. Validate CSP against real login/recovery/navigation before enforcing it; do not allow arbitrary external origins to avoid a CSP error.

No deployment was performed and no Vercel account/project was selected. A preview/staging deployment must be verified before production. Publishing production requires the user's explicit approval of project, configuration and release.

## Verification and release gates

Local: `npm ci`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run security:check`, `npm audit --audit-level=moderate`, `npm run build`, `npm run test:e2e`.

The staging suite fails immediately when required environment variables are missing. Configure them in a local ignored environment or CI staging secrets, never chat:

`TEAM_PULSE_STAGING_URL`, `TEAM_PULSE_TEST_PROJECT_REF`, `TEAM_PULSE_TEST_SUPABASE_URL`, `TEAM_PULSE_TEST_PUBLISHABLE_KEY`, `TEAM_PULSE_TEST_ADMIN_EMAIL`, `TEAM_PULSE_TEST_ADMIN_PASSWORD`, `TEAM_PULSE_TEST_EMPLOYEE_EMAIL`, `TEAM_PULSE_TEST_EMPLOYEE_PASSWORD`, `TEAM_PULSE_ALLOW_STAGING_TESTS=yes`.

Run `npm run test:e2e:staging` only on a dedicated test/staging database with confirmed admin and employee accounts in the same organization. It creates a uniquely named project, submits/resubmits/reviews work, verifies persistence in another browser and tests unauthorized direct API mutations and independent task access. It records only created fixture IDs in ignored `.staging-fixtures.json`; no destructive client endpoint is introduced. Owner cleanup must validate the recorded E2E project name and IDs, then remove only its notifications/reviews/submissions/delays/activity/project-members/tasks/project in foreign-key order. Do not clean up unrelated users or records. This suite has not run against a hosted service.

Also test a separate organization's user over the hosted Data API, direct anonymous access, freezing/deactivation with existing tokens, email delivery/expired recovery links, mail-function failures, monitoring receipt, backup restoration and app/database recovery. Configure branch protection to require CI `verify` and `secrets`; the YAML alone does not enforce branch protection. GitHub CI has not run remotely because these commits have not been pushed. Required staging release checks must pass on the exact release commit.

### Fixture cleanup

The test reserves its fixture record before creating data and refuses another run while that file exists. It records the dedicated project reference, organization, unique project name and each known task ID as work proceeds. Connect only to that recorded staging reference, substitute the recorded values into owner-only `supabase/cleanup-staging-fixture.sql` (include all recorded task IDs in its UUID array), review it, then execute through the authenticated owner connection. The transaction locks and verifies the exact organization/project/name and complete task inventory before deleting dependent fixture records. It preserves memberships, Auth users, preferences and unrelated projects. Verify the project is absent before removing the local fixture record. If a run failed before recording a project or task ID, inspect the unique recorded project name and recover its authoritative IDs first; never guess IDs or discard unresolved evidence.
