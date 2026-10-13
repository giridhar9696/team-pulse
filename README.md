# Team Pulse

React/TypeScript/Vite team and task management with Supabase Auth and PostgreSQL authorization. Production readiness is tracked in [the phase checklist](docs/production-readiness-plan.md). Current verdict: NOT READY FOR PRODUCTION until hosted staging, recovery and release checks pass.

Use Node 24, run `npm ci`, copy `.env.example` to ignored `.env.local`, configure the selected development project's public URL/key, and run `npm run dev`. Missing configuration fails closed. Never use a secret/service-role key in a VITE variable.

Checks: `npm run lint`, `npm run typecheck`, `npm test`, `npm run security:check`, `npm audit --audit-level=moderate`, `npm run build`. For browser tests, install Chromium using the installed Playwright CLI and run `npm run test:e2e`. Real hosted tests use `npm run test:e2e:staging` with the explicit dedicated-project configuration described in [deployment](docs/deployment.md).

Database migrations and owner provisioning are in `supabase/`. See [architecture](docs/architecture.md), [schema](docs/database-schema.md), [authorization](docs/security-and-authorization.md), [baseline audit](docs/production-readiness-audit.md), and [operations and recovery](docs/operations-and-recovery.md). Prototype fixtures in `src/data/demoData.ts` are retained for historical reference and are not imported by production code. Existing browser records are not erased or automatically trusted/imported.
