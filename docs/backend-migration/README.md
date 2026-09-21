# CHATR backend migration runbook

This package migrates CHATR from the current managed backend to a Supabase-owned project without dropping, truncating, or replacing destination data.

## What is included

- 284 ordered database migrations in `supabase/migrations/`
- 120 Edge Function entrypoints in `supabase/functions/`
- preflight, inventory, export, import, function-deployment, and verification scripts
- explicit handling for authentication, Storage objects, Realtime, scheduled jobs, secrets, mobile apps, connectors, and MCP

## Hard stop: source database credentials

The current Lovable Cloud database password and service-role key are not available to project code or users. A complete row-for-row migration of existing users, private data, and private Storage objects therefore cannot run directly from Lovable Cloud.

The scripts are complete for a source backend for which the owner has a direct Postgres URL and service-role key. For the current Lovable Cloud source, use one of these supported cutovers:

1. Obtain an official backend export from Lovable support, then use this package.
2. Recreate the schema and functions in the owned project, require users to sign in again, and migrate only data that can be exported through authorized application APIs.
3. Keep the current backend as the system of record until an official export is available. Do not attempt to scrape private tables through the browser.

## Safety rules

1. Take source and destination backups before starting.
2. Run against a separate staging project first.
3. Never replay the migration history into a destination containing overlapping CHATR tables without a schema reconciliation.
4. Do not use `DROP`, `TRUNCATE`, `db reset`, or `--clean` against production.
5. Freeze writes during the final export, or perform and verify a final delta sync before cutover.
6. Keep all URLs, database passwords, service-role keys, provider credentials, and signing secrets outside Git.

## Required tools

- Bash 4+
- Node.js 20+
- PostgreSQL client tools matching the destination major version (`psql`, `pg_dump`, `pg_restore`)
- Supabase CLI, authenticated to the Supabase-owned destination
- `curl`, `jq`, `sha256sum`, and `rsync`

## Required environment values

Copy `scripts/backend-migration/migration.env.example` to a file outside the repository, fill it in, then source it in your terminal.

```bash
set -a
source /secure/location/chatr-migration.env
set +a
```

Never commit that file.

## Ordered execution

### 1. Create a clean destination project

Use the existing Supabase-owned project. Do not create another project. Record its project reference, API URL, publishable key, database URL, and service-role key in the private environment file.

Configure these dashboard settings before migration:

- Auth site URL: `https://chatr.chat`
- Redirect allow-list: `https://chatr.chat/**`, `https://www.chatr.chat/**`, `https://chatrchat.in/**`, `https://www.chatrchat.in/**`
- Phone/email provider settings matching production
- Realtime enabled
- Point-in-time recovery or a manual backup enabled before cutover

### 2. Run preflight and inventory

```bash
npm run backend:migration:inventory
npm run backend:migration:preflight
```

Preflight refuses to continue when source and destination are the same, required tools are absent, credentials are missing, or destination CHATR tables already contain rows.

Review the generated inventory in `.migration-work/inventory/`. It contains names and counts only, never secrets or row contents.

### 3. Reconcile the destination

The existing 284 migrations are historical state, not a safe blind replay onto a non-empty database. Compare the source and destination inventories first.

Two historical migrations contain `DROP TABLE IF EXISTS ... CASCADE`:

- `20251118014440_98ce3bc7...sql`
- `20260515104801_716c472b...sql`

They are acceptable only on an empty staging destination. Do not run them against tables containing destination-owned data.

Five migrations also contain project-specific HTTP/function references. Keep history unchanged and add a new forward-only migration after the destination project URL is known.

For a clean destination, link the CLI and apply migrations in timestamp order:

```bash
supabase link --project-ref "$TARGET_PROJECT_REF"
supabase db push --include-all
```

If the destination is not clean, stop. Generate and review an additive reconciliation migration; do not force migration-history repair.

### 4. Export source rows

This requires the source direct database URL:

```bash
npm run backend:migration:export
```

The export produces a custom-format data archive, source row-count manifest, and checksums under `.migration-work/export/`. It does not export database passwords or Edge Function secrets.

### 5. Import rows

Only run after schema deployment and preflight show the destination is safe:

```bash
npm run backend:migration:import
```

Authentication identities are included only when the source export has access to the `auth` schema. If they are unavailable, users must reauthenticate and the Firebase phone bridge must lazily recreate identities.

### 6. Copy Storage objects

```bash
npm run backend:migration:storage
```

The copier preserves object paths, content types, and cache controls. Bucket declarations and policies come from migrations; binary objects do not.

Expected buckets include `chat-media`, `screenshots`, and `voice-notes`, plus buckets declared by later migrations. Private objects require both source and destination service-role keys.

### 7. Recreate secrets and deploy functions

Run the secret inventory, obtain each value from its original provider, and add it to the destination with the Supabase CLI or dashboard. Secret values cannot be read back from Lovable Cloud.

Important groups include Firebase, FCM, TURN/LiveKit, Google/Microsoft/Slack/GitHub connectors, WhatsApp, Twilio, Resend, maps, payments, and direct AI providers. `LOVABLE_API_KEY` is not portable; affected functions must use a direct provider before cutover.

Then deploy:

```bash
npm run backend:migration:functions
```

Keep each function's `verify_jwt` behavior from `supabase/config.toml`. Public webhooks still require their own signature or challenge verification.

### 8. Restore project-local services

- Recreate `pg_cron` schedules and verify `pg_net` requests use the destination function URL.
- Re-add Realtime publication tables and confirm `REPLICA IDENTITY FULL` on signaling tables where required.
- Re-register WhatsApp, connector, payment, email, and other webhooks with destination callback URLs.
- Reconfigure OAuth redirect URLs and consent details.
- Reconfigure MCP OAuth issuer and manifest URLs.
- Upload provider certificates and other private Storage assets.

### 9. Verify before cutover

```bash
npm run backend:migration:verify
```

Also test on two real accounts and two devices:

- phone sign-in and sign-out
- profile and role isolation
- direct/group messages and media
- voice/video calls, signaling, TURN, and call termination through database status
- push notifications while foregrounded, backgrounded, and terminated
- connector OAuth, sync, token refresh, and webhooks
- MCP authorization, consent, and each exposed tool
- business, healthcare, wallet, referral, and admin access boundaries

Do not cut over if any row-count mismatch, missing policy/grant, failed private-object copy, or cross-user access issue remains.

### 10. Cut over clients

Update the web environment, native Android config, native iOS config, Vercel middleware, MCP issuer/manifest, and any hardcoded auth-storage key to the destination project. Build and release all clients together.

Known binding points to inspect:

- `.env` deployment values
- `middleware.ts`
- `src/utils/instantAppShell.ts`
- `src/utils/hybridAppOptimizations.ts`
- `supabase/functions/mcp/index.ts`
- `.lovable/mcp/manifest.json`
- `android-native/app/src/main/java/com/chatr/app/config/SupabaseConfig.kt`
- native build/service configuration files

Do not edit the generated web client file under `src/integrations/supabase/`; it reads deployment environment values.

### 11. Final delta and switch

1. Announce a maintenance window.
2. Stop writes on the source.
3. Take the final source backup/export and copy the final delta.
4. Re-run row counts and critical flow tests.
5. switch deployment values and release clients.
6. Monitor auth, function errors, Realtime, calls, push delivery, and connector sync.
7. Keep the source read-only during the rollback window.

## Rollback

Rollback changes client configuration and domains back to the source; it does not delete destination data.

1. Stop destination writes.
2. Restore previous web deployment and native remote configuration.
3. Restore webhook callback URLs to the source.
4. Re-enable source writes.
5. Preserve destination logs and data for reconciliation.

Any writes accepted by the destination after cutover must be reconciled before returning to the source. Never solve rollback by dropping either database.

## Completion criteria

- source and destination object inventories reconcile
- table row counts reconcile or every accepted difference is documented
- all public tables have intentional grants and RLS status
- all functions, triggers, policies, extensions, publications, and schedules are present
- all Storage object counts and checksums reconcile
- auth sessions and reauthentication strategy are proven
- all Edge Functions pass smoke tests
- all webhooks and OAuth callbacks target the destination
- web, Android, iOS, and MCP use the destination
- rollback rehearsal succeeds in staging
