# Authorization

| Resource/action | Anonymous | Active employee | Active organization admin |
| --- | --- | --- | --- |
| Organization | Denied | Own organization | Own organization |
| Directory | Denied | Own record only | Organization records |
| Projects | Denied | Explicit project membership | Organization projects |
| Tasks and histories | Denied | Own assignment AND project membership | Organization tasks |
| Create/edit/reassign/cancel tasks | Denied | Denied | Scoped RPC |
| Submit/report delay | Denied | Assigned task RPC | Scoped task RPC, preserving existing admin integration |
| Approve/request changes | Denied | Denied | Submitted task RPC |
| Employee add/edit/deactivate | Denied | Denied | Employee-only records, scoped RPC |
| Grant admin / link auth identity | Denied | Denied | Owner-controlled provisioning only |
| Preferences/name | Denied | Own | Own |
| Notifications/read status | Denied | Own, currently authorized task | Own |
| Audit/history write | Denied | Server-generated only | Server-generated only |

Frozen/inactive membership denies database reads and writes immediately, including requests made with still-valid access tokens. The browser must also clear cached data and end the local session once inactive membership is detected. Refresh-token revocation is part of owner-controlled account administration; JWT deletion alone is not a security boundary.

Role selection at login is navigation only. user_metadata and browser-supplied organization IDs never confer authority. No service-role/secret key belongs in VITE variables. SQL functions independently reject cross-organization resources, stale versions, invalid transitions and unauthorized callers. Direct table mutations are not granted. Histories and notifications are generated with auth.uid() and server timestamps.

Authorization must be tested with direct SQL under authenticated/anon roles plus distinct JWT subject settings, then with real staging accounts over the Data API. Embedded PostgreSQL tests do not verify Supabase email, API configuration or hosted session settings.
