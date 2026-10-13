# Architecture

Retain React 19, TypeScript, Vite and React Router. Supabase provides identity and PostgreSQL persistence. TanStack Query manages server snapshots and invalidation. Zod validates browser input; SQL independently validates every write. No custom API server or extra production infrastructure.

Existing UI models remain nested for rendering, assembled from normalized database rows. Backend failures never fall back to prototype data. Only Supabase session tokens use its browser session storage; application data lives in the database.

Memberships associate verified auth user IDs with organizational roles and employee codes. This application currently has one organization per authenticated identity (unique user_id); there is no organization-switching UI. Multiple organizations remain isolated in the same database. Admin accounts are owner-provisioned; ordinary account editing cannot grant admin roles. Employee codes may be renamed by administrators with cascading references.

No binary uploads are currently implemented or needed: work submissions contain HTTP(S) URLs and completion notes. Email invitations and recovery depend on Supabase SMTP and allowed redirects. These require real delivery verification before release.
