#!/usr/bin/env bash
source "$(dirname "$0")/common.sh"

for cmd in psql pg_restore sha256sum; do require_command "$cmd"; done
assert_distinct_backends

ARCHIVE="$WORK_DIR/export/source-data.dump"
CHECKSUMS="$WORK_DIR/export/checksums.sha256"
[[ -f "$ARCHIVE" && -f "$CHECKSUMS" ]] || die "Source export or checksum file is missing"
(cd "$(dirname "$CHECKSUMS")" && sha256sum -c "$(basename "$CHECKSUMS")")

TARGET_NONEMPTY="$(psql "$TARGET_DATABASE_URL" -X -Atqc "select count(*) from pg_stat_user_tables where schemaname='public' and n_live_tup > 0")"
[[ "$TARGET_NONEMPTY" == "0" ]] || die "Destination public schema contains data. Import stopped to prevent overwrites or duplicates."

note "Importing rows in one transaction"
pg_restore \
  --dbname="$TARGET_DATABASE_URL" \
  --data-only \
  --no-owner \
  --no-privileges \
  --single-transaction \
  --exit-on-error \
  "$ARCHIVE"

note "Import completed; run verification before enabling traffic"
