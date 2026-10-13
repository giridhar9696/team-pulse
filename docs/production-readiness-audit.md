# Production readiness audit

Baseline: 2026-10-13, branch `main`, HEAD `e84aa3b`. Working tree was clean. No AGENTS.md found in the repository or its immediate parent.

| Severity | Verified finding / evidence | Remediation |
| --- | --- | --- |
| Critical | `authService.ts` uses hardcoded credentials; `AuthProvider.tsx` trusts a localStorage role | Supabase identity plus database membership authorization |
| Critical | `ProjectProvider.tsx` and `employeeDirectory.ts` store all authoritative data and plaintext employee passwords in localStorage | Relational backend, no stored application passwords, explicit persistence failures |
| High | No database, RLS, authorization tests, migrations or CI exist | Implement and test policies and transactional workflows |
| High | TypeScript baseline fails because `@types/react` and `@types/react-dom` are missing | Add declarations and enforce typecheck in build/CI |
| Medium | Deadline logic uses fixed October 2026 dates in task utilities, calendar and notifications | Use actual calendar dates and test boundaries |
| Medium | CSV export does not neutralize spreadsheet formulas | Escape formula prefixes |
| Medium | Admin task submission URL is rendered directly without scheme validation | Validate HTTP(S) at frontend and database boundary |

## Baseline commands

- `npm ls --depth=0`: failed initially; dependencies were absent.
- Initial sandbox `npm ci`: failed with npm exit-handler error. Retried outside sandbox: installed 175 packages, audited 176, zero reported vulnerabilities.
- Lint/build initially could not run without dependencies. After installation, sandbox build failed with Windows EPERM on realpath. Outside sandbox: `npm run lint` passed; `npm run build` passed (1723 modules, 452.54 kB JS / 133.03 kB gzip).
- `tsc --noEmit`: failed with missing React declarations and cascading JSX/implicit-any errors.
- No test script or automated tests existed.

## Existing workflows

Admin: project creation with initial tasks; project list/workspace; task creation/edit/reassignment/cancellation; submissions and delays; approval/request changes; employee add/edit/freeze/deactivate/resume/password reset; reports and CSV export. Employee: assigned projects/tasks, submission/resubmission and delay histories. Both: login/logout, calendar, search, derived notifications/read states, activity history, preferences and profile/password settings. No actual binary file-upload workflow exists: submissions are URLs and notes.

## External integration

Supabase connector authenticated but returns only dealatecorp's Org/project. User explicitly excluded that account/project and designated account bylapudigiridhar005@gmail.com, organization healthy food website. No remote mutation performed. Reconnect the connector to the designated account before discovery/migrations. Production release requires explicit user approval.

Update: the new Team-pulse connection sees healthy food website (`kotybqzfckqdepiqscmv`) with no projects. The excluded project has not been changed. Isolated PostgreSQL foundation tests: `npm run test:db`, 7/7 passed. After adding React types, TypeScript revealed additional pre-existing provider inference, report generic, task narrowing and login literal-state errors; these are recorded as baseline defects to fix during migration.

Existing browser records must be exported and reviewed before any optional import. They are untrusted prototype records and cannot confer authenticated identities or privileges. Do not delete or silently migrate them.
