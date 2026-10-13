# Production readiness phase checklist

Work proceeds in the supplied phase order. An implemented local change is not evidence that a remote integration passed.

- [x] 00: discovery, installed baseline checks, workflow map and audit; baseline typecheck failure recorded
- [x] 01: relational schema, integrity, transitions, access matrix and migration strategy; 7 isolated PostgreSQL tests pass
- [ ] 02: Supabase login/logout/session/recovery and controlled provisioning
- [ ] 03: RLS and direct positive/negative authorization tests
- [ ] 04: migrate all authoritative browser persistence and asynchronous UI callers
- [ ] 05: persisted notifications and email setup; uploads only if required
- [ ] 06: unit/component/database and critical browser workflow tests
- [ ] 07: validation, security, accessibility, dependencies and monitoring
- [ ] 08: CI, environment examples, deployment and recovery procedures
- [ ] 09: designated staging deployment and two-account verification
- [ ] 10: final release checks and explicit production approval

## Current blockers

Team-pulse connection sees the user-designated healthy food website organization, currently with no projects. New staging project awaits cost confirmation. Email delivery, hosted authorization, staging, backup restoration and production release remain unverified.

Verdict: NOT READY FOR PRODUCTION.
