#!/usr/bin/env bash
source "$(dirname "$0")/common.sh"

for cmd in psql pg_dump pg_restore curl jq sha256sum; do require_command "$cmd"; done
assert_distinct_backends

note "Checking source connectivity"
psql "$SOURCE_DATABASE_URL" -X -v ON_ERROR_STOP=1 -Atqc 'select current_database(), current_user' >/dev/null
note "Checking destination connectivity"
psql "$TARGET_DATABASE_URL" -X -v ON_ERROR_STOP=1 -Atqc 'select current_database(), current_user' >/dev/null

SOURCE_VERSION="$(psql "$SOURCE_DATABASE_URL" -X -Atqc "show server_version_num")"
TARGET_VERSION="$(psql "$TARGET_DATABASE_URL" -X -Atqc "show server_version_num")"
[[ "${SOURCE_VERSION:0:2}" == "${TARGET_VERSION:0:2}" ]] || die "PostgreSQL major versions differ: source=$SOURCE_VERSION target=$TARGET_VERSION"

TARGET_NONEMPTY="$(psql "$TARGET_DATABASE_URL" -X -Atqc "select count(*) from pg_stat_user_tables where schemaname = 'public' and n_live_tup > 0")"
[[ "$TARGET_NONEMPTY" == "0" ]] || die "Destination has $TARGET_NONEMPTY non-empty public tables. Reconcile it manually; this package will not overwrite them."

TARGET_COLLISIONS="$(psql "$TARGET_DATABASE_URL" -X -Atqc "select count(*) from information_schema.tables where table_schema='public' and table_name in ('profiles','messages','conversations','calls','user_roles')")"
[[ "$TARGET_COLLISIONS" == "0" ]] || die "Destination already contains core CHATR tables. Use schema reconciliation instead of replaying history."

note "Preflight passed. No changes were made."
