# Complete CHATR backend migration plan

## Goal
Prepare a non-destructive migration package that moves CHATR from its current managed backend to an existing Supabase-owned project, while preserving production data and providing a controlled cutover and rollback path.

## Work
1. Inventory database objects, migrations, Edge Functions, storage buckets, authentication settings, secrets, scheduled jobs, webhooks, realtime dependencies, and every client binding.
2. Reconcile the source schema against the destination instead of replaying migrations blindly; generate additive SQL for missing or incompatible objects, including grants and row-level security.
3. Package schema deployment, data-copy sequencing, storage transfer, auth-user handling, function deployment, required-secret checklist, and web/mobile configuration changes.
4. Add preflight and post-migration checks for row counts, policies, grants, functions, buckets, authentication, realtime, calls, messaging, notifications, connectors, and MCP.
5. Document staged cutover, rollback, DNS/domain changes, and the manual credentials or dashboard actions only the project owner can complete.

## Safety
- No dropping, truncating, resetting, or replacing existing destination data.
- Credentials remain outside source control.
- Run against staging first, then production after validation.
- Freeze writes or use a final delta sync before switching clients.

## Deliverables
- Ordered migration/operator guide.
- Additive SQL reconciliation scripts.
- Function, storage, auth, secrets, and scheduler checklist.
- Preflight, verification, and rollback scripts.
- Explicit blocker list for any source data or destination access that cannot be automated.

## Technical details
The destination must be inspected before SQL is applied. Existing migration files will be treated as history, not assumed to be safely replayable. Public tables must retain explicit grants and row-level security, user roles remain in a separate table, and authentication users require a supported export/import or account re-verification strategy.
