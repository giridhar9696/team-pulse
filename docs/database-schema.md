# Database schema and migration strategy

The foundation migration creates organizations, memberships, projects, project memberships, tasks, submissions, reviews, delays, activity events, notifications and user preferences. UUIDs identify projects/tasks/events; employee codes are unique within each organization. Foreign keys include organization IDs to prevent cross-organization associations. Identity linkage and email are unique, reflecting the existing single-account organizational interface.

All tables enable RLS. Client roles have SELECT access only. Writes run through narrow authenticated functions; private SECURITY DEFINER implementations use an empty search_path, current auth.uid(), active membership and scoped checks. Public wrappers are SECURITY INVOKER. No private schema is exposed through the Data API.

Project creation includes initial task creation, membership and event/notification creation in one transaction. Task mutation locks the record and checks the caller's expected version. Submission/review/delay history and task state are atomic. Employee updates also check a version. Related project/member/task references use organization-scoped foreign keys. Deadline ranges, nonempty text, roles/statuses, URLs and performance ranges have constraints.

Transitions: new tasks pending/in_progress/overdue; admin can switch between these work states. Submission moves an open work task or changes_requested task to submitted. Review requires submitted/review plus an existing submission and moves to approved or changes_requested. Delay cannot overwrite a pending review. Approved/cancelled tasks are immutable. Administrative cancellation closes any nonterminal task. Reassignment does not discard historical submissions or reviews.

The migration is additive for a dedicated empty Team Pulse project. Inspect live schemas and migration history before applying. Never apply it to the excluded dealatecorp project. Do not reset a remote database. Browser data must be exported, validated and mapped by an administrator; prototype roles/passwords cannot be imported as authentication credentials. Existing browser records are left in place, unused by the new production data path.

Recovery: restore a verified backup into a separate project and validate before switching traffic. Do not drop these tables to roll back a frontend deployment; use backward-compatible forward migrations. The initial schema must be exercised on isolated PostgreSQL and then the selected Supabase staging environment.
