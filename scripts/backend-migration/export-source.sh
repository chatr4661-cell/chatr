#!/usr/bin/env bash
source "$(dirname "$0")/common.sh"

for cmd in psql pg_dump gzip sha256sum; do require_command "$cmd"; done
assert_distinct_backends

OUT="$WORK_DIR/export"
mkdir -p "$OUT"

note "Exporting source rows from public and auth schemas"
pg_dump "$SOURCE_DATABASE_URL" \
  --format=plain \
  --data-only \
  --inserts \
  --rows-per-insert=500 \
  --on-conflict-do-nothing \
  --no-owner \
  --no-privileges \
  --schema=public \
  --schema=auth \
  --exclude-table-data=storage.objects \
  --file="$OUT/source-data.sql"
gzip -f "$OUT/source-data.sql"

psql "$SOURCE_DATABASE_URL" -X -v ON_ERROR_STOP=1 -AtF $'\t' <<'SQL' > "$OUT/source-row-counts.tsv"
select schemaname, relname, n_live_tup
from pg_stat_user_tables
where schemaname in ('public','auth')
order by schemaname, relname;
SQL

sha256sum "$OUT/source-data.sql.gz" "$OUT/source-row-counts.tsv" > "$OUT/checksums.sha256"
note "Encrypted storage is recommended for $OUT; the archive contains production data"
