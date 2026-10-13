# Production readiness phase checklist

Verdict: NOT READY FOR PRODUCTION. Local implementation is complete through the independent portions of Phase 08. Hosted verification cannot be marked complete without the selected staging project and service configuration.

| Phase | Local implementation / verification | Remaining environment gate |
| --- | --- | --- |
| 00 | Complete: clean baseline, workflow inventory, actual checks and audit | None |
| 01 | Complete: normalized schema, access matrix, transactions, migration/recovery strategy | Inspect target schema before applying |
| 02 | Auth, session restoration/expiry handling, local sign-out on inactive membership, recovery and controlled provisioning implemented/tested | Real Auth accounts, redirects and delivered invitation/recovery/email-change mail |
| 03 | Seven migrations pass isolated PostgreSQL tests; every application table enables RLS; direct role/organization/task/privilege tests pass | Actual Supabase grants, policies, functions, advisors and direct hosted API tests |
| 04 | Projects, employees, tasks, submissions/delays/reviews, notifications, activity, preferences and metrics use backend operations; UI tests pass | Hosted multi-user/device persistence and concurrency verification |
| 05 | Persisted/scoped/read-state notifications, deadline notices and restricted account-email function implemented/tested | Deploy function, configure APP_ORIGIN/SMTP and test real delivery. No binary upload workflow exists |
| 06 | Unit, component, embedded PostgreSQL, account-function boundary and Chromium smoke suites pass; coverage measured | Dedicated staging browser suite, hosted cross-organization and genuine simultaneous connections |
| 07 | Trust-boundary validation, safe errors, secret/dependency checks, no-store requests, scoped cache cleanup, stale edit protection, calendar/CSV fixes, keyboard controls, privacy-configured monitoring | Supabase advisors, exact-origin CSP, actual monitoring receipt and representative load measurement |
| 08 | CI/dependency updates, guarded Vercel config, placeholder environment example, provisioning and operations/recovery docs present | Push and observe CI; enforce branch protection; configure backup retention and execute restore/rollback drills |
| 09 | Staging test harness prepared and refuses missing configuration | Dedicated staging project and frontend deployment, at least two real accounts and all critical checks |
| 10 | Explicit release gates documented | Production project/configuration approval, verified recovery/monitoring and explicit release approval |

## Current external dependencies

The user designated account bylapudigiridhar005@gmail.com. Using the new Team-pulse connection, organization discovery verified access to healthy food website (`kotybqzfckqdepiqscmv`), with no projects. The connector's cost endpoint was unavailable. The user chose to create Team Pulse Staging later. No Team Pulse project was selected, configured, migrated or deployed remotely. The excluded dealatecorp account/project was not modified.

Docker CLI exists but its daemon was unavailable. SQL tests use isolated PGlite with auth-role fixtures; they do not replace hosted Auth/JWT/SMTP/API verification. Staging credentials belong in an ignored environment or CI secrets, never chat. The first administrator must be owner-provisioned after migrations and Auth confirmation.

## Last verified evidence

See `docs/implementation-report.md` for commands/results, coverage, file changes, baseline resolutions and ranked release blockers. Test configuration contains no skipped critical hosted assertions: the separate staging command fails closed when required configuration is absent. Public production release remains unauthorized.
